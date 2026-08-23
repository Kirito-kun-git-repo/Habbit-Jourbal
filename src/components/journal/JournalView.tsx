"use client";

import { useMemo, useState } from "react";
import { EntryPhoto } from "@/components/entries/EntryPhoto";
import type { Habit, HabitEntry } from "@/lib/data";
import { HabitBadge } from "@/components/habits/HabitBadge";
import { formatLongDate, type ISODate } from "@/lib/dates";

export type JournalEntry = HabitEntry & {
  habitName: string;
  habitColor: string;
  habitImage: string | null;
};

/** An entry worth reading has something to read: a note or a photo. */
export function hasContent(entry: HabitEntry): boolean {
  return Boolean(entry.note?.trim() || entry.photo_path);
}

export function JournalView({
  habits,
  entries,
  onOpenEntry,
}: {
  habits: Habit[];
  entries: HabitEntry[];
  onOpenEntry: (habitId: string, date: ISODate) => void;
}) {
  const [habitFilter, setHabitFilter] = useState<string>("all");

  const grouped = useMemo(() => {
    const names = new Map(habits.map((h) => [h.id, h.name]));
    const colors = new Map(habits.map((h) => [h.id, h.color as string]));
    const images = new Map(habits.map((h) => [h.id, h.image_path]));
    const relevant = entries
      .filter((entry) => hasContent(entry) || entry.completed)
      .filter((entry) => habitFilter === "all" || entry.habit_id === habitFilter)
      .filter((entry) => names.has(entry.habit_id))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Written entries get a card. Bare completions collapse into one line so a
    // productive day doesn't bury the days that were actually written about.
    const byDate = new Map<ISODate, { written: JournalEntry[]; alsoDone: string[] }>();
    for (const entry of relevant) {
      const day = byDate.get(entry.date) ?? { written: [], alsoDone: [] };
      const habitName = names.get(entry.habit_id) ?? "";
      const habitColorKey = colors.get(entry.habit_id) ?? "";
      if (hasContent(entry)) {
        day.written.push({
          ...entry,
          habitName,
          habitColor: habitColorKey,
          habitImage: images.get(entry.habit_id) ?? null,
        });
      }
      else day.alsoDone.push(habitName);
      byDate.set(entry.date, day);
    }
    return [...byDate.entries()];
  }, [entries, habitFilter, habits]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-4 pb-5">
        <p className="text-[14px] text-muted">
          {grouped.length === 0
            ? "Nothing logged yet."
            : `${grouped.length} ${grouped.length === 1 ? "day" : "days"} logged`}
        </p>
        <label className="flex items-center gap-2 text-[14px] text-muted">
          <span className="sr-only sm:not-sr-only">Habit</span>
          <select
            value={habitFilter}
            onChange={(event) => setHabitFilter(event.target.value)}
            aria-label="Filter by habit"
            className="h-8 rounded-sm border border-line-strong bg-surface px-2 text-[14px] text-ink transition-colors duration-150 hover:bg-sunken"
          >
            <option value="all">All habits</option>
            {habits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong px-5 py-10 text-center text-[15px] text-muted">
          Completed days, notes, and photos will collect here.
        </p>
      ) : (
        <ol className="space-y-9">
          {grouped.map(([date, day]) => (
            <li key={date}>
              <h3 className="sticky top-0 z-10 -mx-1 bg-page/95 px-1 pb-2 pt-1 text-[15px] font-semibold tracking-[-0.01em] text-ink backdrop-blur-sm">
                {formatLongDate(date)}
              </h3>
              <div className="space-y-3 border-l border-line pl-4">
                {day.written.length > 0 && (
                  <ul className="space-y-3">
                    {day.written.map((entry) => (
                      <li key={entry.id}>
                        <JournalCard entry={entry} onOpen={onOpenEntry} />
                      </li>
                    ))}
                  </ul>
                )}
                {day.alsoDone.length > 0 && (
                  <p className="text-[14px] leading-relaxed text-muted">
                    {day.written.length > 0 ? "Also completed" : "Completed"}:{" "}
                    <span className="text-ink-soft">{day.alsoDone.join(", ")}</span>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function JournalCard({
  entry,
  onOpen,
  compact = false,
}: {
  entry: JournalEntry;
  onOpen: (habitId: string, date: ISODate) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.habit_id, entry.date)}
      className="w-full rounded-sm border border-line bg-surface p-4 text-left transition-colors duration-150 hover:border-line-strong hover:bg-accent-tint/40"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-[15px] font-medium text-ink">
          <HabitBadge imagePath={entry.habitImage} color={entry.habitColor} size={20} />
          {entry.habitName}
        </span>
        <span className="shrink-0 text-[13px] text-muted">
          {entry.completed ? "Completed" : "Logged"}
        </span>
      </div>

      {entry.photo_path && (
        <div className="mt-3 overflow-hidden rounded-xs border border-line bg-sunken">
          <EntryPhoto
            path={entry.photo_path}
            alt={`${entry.habitName} photo`}
            className={compact ? "h-36 w-full" : "h-56 w-full"}
          />
        </div>
      )}

      {entry.note?.trim() && (
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
          {entry.note}
        </p>
      )}
    </button>
  );
}
