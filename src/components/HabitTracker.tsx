"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import type { GridMode } from "@/components/calendar/HabitCell";
import { ConsistencyView } from "@/components/consistency/ConsistencyView";
import { EntryDialog, type EntryTarget } from "@/components/entries/EntryDialog";
import { EmptyState } from "@/components/habits/EmptyState";
import { HabitManager } from "@/components/habits/HabitManager";
import { JournalView } from "@/components/journal/JournalView";
import { GridSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { ViewKey } from "@/components/ui/ViewSwitcher";
import { WeeklyView } from "@/components/weekly/WeeklyView";
import { isDemoBackend, store, type SessionUser } from "@/lib/data";
import {
  addDays,
  addMonths,
  formatMonth,
  formatWeekRange,
  monthDays,
  monthEnd,
  monthStart,
  today,
  weekStart,
} from "@/lib/dates";
import { useHabitData } from "@/lib/hooks/useHabitData";

const GRID_MODE_KEY = "habit-journal/grid-mode";

export function HabitTracker({ user, onSignedOut }: { user: SessionUser; onSignedOut: () => void }) {
  const { notify } = useToast();
  const onError = useCallback((message: string) => notify(message, "error"), [notify]);
  const data = useHabitData(onError);

  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState<ViewKey>("grid");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [weekStartISO, setWeekStartISO] = useState(() => weekStart(today()));
  const [target, setTarget] = useState<EntryTarget | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [gridMode, setGridMode] = useState<GridMode>("compact");

  // Whichever grid density you last used is the one you get back.
  useEffect(() => {
    const stored = window.localStorage.getItem(GRID_MODE_KEY);
    if (stored === "compact" || stored === "detailed") setGridMode(stored);
  }, []);

  const changeGridMode = useCallback((mode: GridMode) => {
    setGridMode(mode);
    window.localStorage.setItem(GRID_MODE_KEY, mode);
  }, []);

  const days = useMemo(() => monthDays(year, month), [year, month]);

  const { loadRange } = data;
  useEffect(() => {
    void loadRange(monthStart(year, month), monthEnd(year, month));
  }, [loadRange, year, month]);

  const openCell = useCallback(
    (habitId: string, date: string) => {
      const habit = data.habits.find((h) => h.id === habitId);
      if (!habit) {
        notify("That habit no longer exists.", "error");
        return;
      }
      setTarget({ habit, date });
    },
    [data.habits, notify],
  );

  const isWeekly = view === "weekly";
  const periodLabel = view === "journal" ? null : isWeekly ? formatWeekRange(weekStartISO) : formatMonth(year, month);

  const step = (delta: -1 | 1) => {
    if (isWeekly) {
      setWeekStartISO((current) => addDays(current, delta * 7));
      return;
    }
    const next = addMonths(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const goToToday = () => {
    const nowDate = new Date();
    setYear(nowDate.getFullYear());
    setMonth(nowDate.getMonth());
    setWeekStartISO(weekStart(today()));
  };

  const handleSignOut = async () => {
    try {
      await store.signOut();
      onSignedOut();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not sign out.", "error");
    }
  };

  const noHabits = !data.loading && data.habits.length === 0;

  return (
    <div className="flex h-dvh flex-col">
      <CalendarHeader
        view={view}
        onViewChange={setView}
        periodLabel={periodLabel}
        showMonthSelector={view === "grid" || view === "consistency"}
        year={year}
        month={month}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={goToToday}
        prevLabel={isWeekly ? "Previous week" : "Previous month"}
        nextLabel={isWeekly ? "Next week" : "Next month"}
        gridMode={view === "grid" ? gridMode : null}
        onGridModeChange={changeGridMode}
        onManageHabits={() => setManagerOpen(true)}
        email={user.email}
        onSignOut={() => void handleSignOut()}
      />

      {isDemoBackend && (
        <p className="shrink-0 border-b border-line bg-accent-tint px-4 py-1.5 text-center text-[13px] text-accent-strong sm:px-6">
          Demo mode — data is stored in this browser. Set Supabase env vars to persist to a real
          account.
        </p>
      )}

      <main className="flex-1 overflow-auto quiet-scroll">
        {data.loading ? (
          <GridSkeleton />
        ) : noHabits ? (
          <EmptyState onAddHabit={() => setManagerOpen(true)} onSeeded={() => void data.reload()} />
        ) : view === "grid" ? (
          <CalendarGrid
            habits={data.habits}
            days={days}
            entryMap={data.entryMap}
            subtasksByHabit={data.subtasksByHabit}
            mode={gridMode}
            onOpenCell={openCell}
          />
        ) : view === "journal" ? (
          <JournalView habits={data.habits} entries={data.entryList} onOpenEntry={openCell} />
        ) : view === "weekly" ? (
          <WeeklyView
            habits={data.habits}
            weekStartISO={weekStartISO}
            entryMap={data.entryMap}
            subtasksByHabit={data.subtasksByHabit}
            onOpenCell={openCell}
          />
        ) : (
          <ConsistencyView
            habits={data.habits}
            monthDaysISO={days}
            entries={data.entryList}
            subtasksByHabit={data.subtasksByHabit}
            year={year}
            month={month}
          />
        )}
      </main>

      {target && (
        <EntryDialog
          key={`${target.habit.id}|${target.date}`}
          target={target}
          entry={data.getEntry(target.habit.id, target.date)}
          subtasks={data.subtasksByHabit[target.habit.id] ?? []}
          onClose={() => setTarget(null)}
          onSave={data.saveEntry}
          onDelete={data.removeEntry}
        />
      )}

      <HabitManager
        open={managerOpen}
        habits={data.habits}
        subtasksByHabit={data.subtasksByHabit}
        onClose={() => setManagerOpen(false)}
        onAdd={data.addHabit}
        onRename={data.renameHabit}
        onRecolor={data.recolorHabit}
        onDelete={data.deleteHabit}
        onMove={data.moveHabit}
        onAddSubtask={data.addSubtask}
        onRenameSubtask={data.renameSubtask}
        onDeleteSubtask={data.deleteSubtask}
      />
    </div>
  );
}
