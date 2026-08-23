"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { store, type EntryDraft, type Habit, type HabitEntry, type Subtask } from "@/lib/data";
import { nextColorForPosition } from "@/lib/colors";
import type { ISODate } from "@/lib/dates";

export type EntryMap = Record<string, Record<ISODate, HabitEntry>>;

const key = (habitId: string, date: ISODate) => `${habitId}|${date}`;

function toEntryMap(entries: Iterable<HabitEntry>): EntryMap {
  const map: EntryMap = {};
  for (const entry of entries) {
    (map[entry.habit_id] ??= {})[entry.date] = entry;
  }
  return map;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Owns habits and entries for the signed-in user. Entries are held in one flat
 * record and merged as ranges are fetched, so a month change costs one query
 * and the grid renders from an in-memory lookup rather than per-cell requests.
 */
export function useHabitData(onError: (message: string) => void) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [entries, setEntries] = useState<Record<string, HabitEntry>>({});
  const [loading, setLoading] = useState(true);
  const loadedAll = useRef(false);
  const loadedRanges = useRef(new Set<string>());

  const mergeEntries = useCallback((incoming: HabitEntry[], replaceRange?: [ISODate, ISODate]) => {
    setEntries((current) => {
      const next = { ...current };
      if (replaceRange) {
        const [from, to] = replaceRange;
        for (const k of Object.keys(next)) {
          const entry = next[k];
          if (entry.date >= from && entry.date <= to) delete next[k];
        }
      }
      for (const entry of incoming) next[key(entry.habit_id, entry.date)] = entry;
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [nextHabits, nextSubtasks, allEntries] = await Promise.all([
        store.listHabits(),
        store.listSubtasks(),
        store.listAllEntries(),
      ]);
      loadedAll.current = true;
      setHabits(nextHabits);
      setSubtasks(nextSubtasks);
      setEntries(Object.fromEntries(allEntries.map((e) => [key(e.habit_id, e.date), e])));
    } catch (error) {
      onError(errorMessage(error, "Could not load your journal."));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Refresh one date range — used when navigating to a month. */
  const loadRange = useCallback(
    async (from: ISODate, to: ISODate) => {
      const rangeKey = `${from}..${to}`;
      if (loadedRanges.current.has(rangeKey) || !loadedAll.current) return;
      loadedRanges.current.add(rangeKey);
      try {
        mergeEntries(await store.listEntries(from, to), [from, to]);
      } catch {
        loadedRanges.current.delete(rangeKey);
        // A stale range is not worth interrupting the user for; data already in
        // memory stays on screen.
      }
    },
    [mergeEntries],
  );

  const entryMap = useMemo(() => toEntryMap(Object.values(entries)), [entries]);

  const getEntry = useCallback(
    (habitId: string, date: ISODate): HabitEntry | undefined => entryMap[habitId]?.[date],
    [entryMap],
  );

  const saveEntry = useCallback(
    async (draft: EntryDraft): Promise<boolean> => {
      const k = key(draft.habit_id, draft.date);
      const previous = entries[k];
      const optimistic: HabitEntry = {
        id: previous?.id ?? `pending-${k}`,
        user_id: previous?.user_id ?? "",
        created_at: previous?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...draft,
      };
      setEntries((current) => ({ ...current, [k]: optimistic }));
      try {
        const saved = await store.upsertEntry(draft);
        setEntries((current) => ({ ...current, [k]: saved }));
        return true;
      } catch (error) {
        setEntries((current) => {
          const next = { ...current };
          if (previous) next[k] = previous;
          else delete next[k];
          return next;
        });
        onError(errorMessage(error, "Could not save the entry."));
        return false;
      }
    },
    [entries, onError],
  );

  const removeEntry = useCallback(
    async (habitId: string, date: ISODate): Promise<boolean> => {
      const k = key(habitId, date);
      const previous = entries[k];
      setEntries((current) => {
        const next = { ...current };
        delete next[k];
        return next;
      });
      try {
        if (previous?.photo_path) await store.removePhoto(previous.photo_path).catch(() => {});
        await store.deleteEntry(habitId, date);
        return true;
      } catch (error) {
        if (previous) setEntries((current) => ({ ...current, [k]: previous }));
        onError(errorMessage(error, "Could not delete the entry."));
        return false;
      }
    },
    [entries, onError],
  );

  const addHabit = useCallback(
    async (name: string, color?: string) => {
      try {
        const habit = await store.createHabit(
          name.trim(),
          color ?? nextColorForPosition(habits.length),
        );
        setHabits((current) => [...current, habit]);
        return habit;
      } catch (error) {
        onError(errorMessage(error, "Could not add the habit."));
        return null;
      }
    },
    [habits.length, onError],
  );

  const recolorHabit = useCallback(
    async (id: string, color: string) => {
      const previous = habits;
      setHabits((current) => current.map((h) => (h.id === id ? { ...h, color } : h)));
      try {
        await store.recolorHabit(id, color);
      } catch (error) {
        setHabits(previous);
        onError(errorMessage(error, "Could not change the colour."));
      }
    },
    [habits, onError],
  );

  const addSubtask = useCallback(
    async (habitId: string, name: string) => {
      try {
        const subtask = await store.createSubtask(habitId, name.trim());
        setSubtasks((current) => [...current, subtask]);
      } catch (error) {
        onError(errorMessage(error, "Could not add the subtask."));
      }
    },
    [onError],
  );

  const renameSubtask = useCallback(
    async (id: string, name: string) => {
      const previous = subtasks;
      setSubtasks((current) => current.map((s) => (s.id === id ? { ...s, name } : s)));
      try {
        await store.renameSubtask(id, name.trim());
      } catch (error) {
        setSubtasks(previous);
        onError(errorMessage(error, "Could not rename the subtask."));
      }
    },
    [onError, subtasks],
  );

  const deleteSubtask = useCallback(
    async (id: string) => {
      const previous = subtasks;
      setSubtasks((current) => current.filter((s) => s.id !== id));
      try {
        await store.deleteSubtask(id);
      } catch (error) {
        setSubtasks(previous);
        onError(errorMessage(error, "Could not delete the subtask."));
      }
    },
    [onError, subtasks],
  );

  const renameHabit = useCallback(
    async (id: string, name: string) => {
      const previous = habits;
      setHabits((current) => current.map((h) => (h.id === id ? { ...h, name } : h)));
      try {
        await store.renameHabit(id, name.trim());
      } catch (error) {
        setHabits(previous);
        onError(errorMessage(error, "Could not rename the habit."));
      }
    },
    [habits, onError],
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      const previousHabits = habits;
      const previousEntries = entries;
      const previousSubtasks = subtasks;
      setHabits((current) => current.filter((h) => h.id !== id));
      setSubtasks((current) => current.filter((s) => s.habit_id !== id));
      setEntries((current) =>
        Object.fromEntries(Object.entries(current).filter(([, e]) => e.habit_id !== id)),
      );
      try {
        await store.deleteHabit(id);
      } catch (error) {
        setHabits(previousHabits);
        setSubtasks(previousSubtasks);
        setEntries(previousEntries);
        onError(errorMessage(error, "Could not delete the habit."));
      }
    },
    [entries, habits, onError, subtasks],
  );

  const moveHabit = useCallback(
    async (id: string, direction: -1 | 1) => {
      const index = habits.findIndex((h) => h.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= habits.length) return;
      const previous = habits;
      const reordered = [...habits];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      setHabits(reordered.map((h, i) => ({ ...h, position: i })));
      try {
        await store.reorderHabits(reordered.map((h) => h.id));
      } catch (error) {
        setHabits(previous);
        onError(errorMessage(error, "Could not save the new order."));
      }
    },
    [habits, onError],
  );

  const entryList = useMemo(() => Object.values(entries), [entries]);

  /** subtasksByHabit[habitId] — ordered, so the grid and dialog agree. */
  const subtasksByHabit = useMemo(() => {
    const map: Record<string, Subtask[]> = {};
    for (const subtask of [...subtasks].sort((a, b) => a.position - b.position)) {
      (map[subtask.habit_id] ??= []).push(subtask);
    }
    return map;
  }, [subtasks]);

  return {
    habits,
    subtasks,
    subtasksByHabit,
    entryMap,
    entryList,
    loading,
    getEntry,
    loadRange,
    saveEntry,
    removeEntry,
    addHabit,
    renameHabit,
    recolorHabit,
    deleteHabit,
    moveHabit,
    addSubtask,
    renameSubtask,
    deleteSubtask,
    reload,
  };
}
