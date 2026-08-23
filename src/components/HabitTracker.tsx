"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarGrid, type GridApi } from "@/components/calendar/CalendarGrid";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
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
  dateRange,
  daysBetween,
  formatMonth,
  formatWeekRange,
  monthDays,
  monthStart,
  startOfMonth,
  today,
  weekStart,
  type ISODate,
} from "@/lib/dates";
import { useHabitData } from "@/lib/hooks/useHabitData";
import { useSettings } from "@/lib/store/settings";

// The grid is one continuous stream of days. It opens on a window around today
// and grows at whichever edge you scroll toward, capped so a long session of
// panning can't grow the DOM without bound.
const INITIAL_BACK = 60;
const INITIAL_FORWARD = 40;
const CHUNK = 60;
const MAX_DAYS = 900;

export function HabitTracker({ user, onSignedOut }: { user: SessionUser; onSignedOut: () => void }) {
  const { notify } = useToast();
  const onError = useCallback((message: string) => notify(message, "error"), [notify]);
  const data = useHabitData(onError);
  const { gridMode, setGridMode } = useSettings();

  const [view, setView] = useState<ViewKey>("grid");
  const [target, setTarget] = useState<EntryTarget | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  // Continuous range for the grid.
  const [range, setRange] = useState(() => ({
    from: addDays(today(), -INITIAL_BACK),
    to: addDays(today(), INITIAL_FORWARD),
  }));
  // Whichever day sits at the left edge — names the month in the header.
  const [anchor, setAnchor] = useState<ISODate>(() => startOfMonth(today()));
  const gridApi = useRef<GridApi>(null);

  const [weekStartISO, setWeekStartISO] = useState(() => weekStart(today()));

  const days = useMemo(() => dateRange(range.from, range.to), [range]);

  const anchorYear = Number(anchor.slice(0, 4));
  const anchorMonth = Number(anchor.slice(5, 7)) - 1;
  const monthDaysISO = useMemo(
    () => monthDays(anchorYear, anchorMonth),
    [anchorYear, anchorMonth],
  );

  const { loadRange } = data;
  useEffect(() => {
    void loadRange(range.from, range.to);
  }, [loadRange, range]);

  const growRange = useCallback((edge: "start" | "end") => {
    setRange((current) => {
      const span = daysBetween(current.from, current.to);
      if (span >= MAX_DAYS) return current;
      return edge === "start"
        ? { ...current, from: addDays(current.from, -CHUNK) }
        : { ...current, to: addDays(current.to, CHUNK) };
    });
  }, []);

  /** Put `date` at the left edge, widening the window first if it's outside. */
  const goToDate = useCallback((date: ISODate) => {
    setRange((current) => {
      const from = date < current.from ? addDays(date, -CHUNK) : current.from;
      const to = date > current.to ? addDays(date, CHUNK) : current.to;
      return from === current.from && to === current.to ? current : { from, to };
    });
    setAnchor(date);
    // Wait for the widened range to render before scrolling to it.
    requestAnimationFrame(() => gridApi.current?.scrollToDate(date));
  }, []);

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
  const isGridLike = view === "grid" || view === "consistency";
  const periodLabel =
    view === "journal"
      ? null
      : isWeekly
        ? formatWeekRange(weekStartISO)
        : formatMonth(anchorYear, anchorMonth);

  const step = (delta: -1 | 1) => {
    if (isWeekly) {
      setWeekStartISO((current) => addDays(current, delta * 7));
      return;
    }
    const next = addMonths(anchorYear, anchorMonth, delta);
    const first = monthStart(next.year, next.month);
    if (view === "grid") goToDate(first);
    else setAnchor(first);
  };

  /** The "drifted while sliding" escape hatch: back to the 1st of this month. */
  const goToToday = () => {
    const first = startOfMonth(today());
    setWeekStartISO(weekStart(today()));
    if (view === "grid") goToDate(first);
    else setAnchor(first);
  };

  const jumpToMonth = (year: number, month: number) => {
    const first = monthStart(year, month);
    if (view === "grid") goToDate(first);
    else setAnchor(first);
  };

  const handleSignOut = async () => {
    try {
      await store.signOut();
      onSignedOut();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not sign out.", "error");
    }
  };

  // Land on the current month the first time the grid has something to show.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (didInitialScroll.current || data.loading || data.habits.length === 0) return;
    didInitialScroll.current = true;
    requestAnimationFrame(() => gridApi.current?.scrollToDate(startOfMonth(today()), "auto"));
  }, [data.loading, data.habits.length]);

  const noHabits = !data.loading && data.habits.length === 0;

  return (
    <div className="flex h-dvh flex-col">
      <CalendarHeader
        view={view}
        onViewChange={setView}
        periodLabel={periodLabel}
        showMonthSelector={isGridLike}
        year={anchorYear}
        month={anchorMonth}
        onMonthChange={jumpToMonth}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={goToToday}
        todayLabel={view === "grid" ? "This month" : "Today"}
        prevLabel={isWeekly ? "Previous week" : "Previous month"}
        nextLabel={isWeekly ? "Next week" : "Next month"}
        gridMode={view === "grid" ? gridMode : null}
        onGridModeChange={setGridMode}
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

      <main className="flex-1 overflow-hidden">
        {data.loading ? (
          <GridSkeleton />
        ) : noHabits ? (
          <div className="h-full overflow-auto quiet-scroll">
            <EmptyState
              onAddHabit={() => setManagerOpen(true)}
              onSeeded={() => void data.reload()}
            />
          </div>
        ) : view === "grid" ? (
          <CalendarGrid
            ref={gridApi}
            habits={data.habits}
            days={days}
            entryMap={data.entryMap}
            subtasksByHabit={data.subtasksByHabit}
            mode={gridMode}
            onOpenCell={openCell}
            onVisibleDateChange={setAnchor}
            onNeedMore={growRange}
          />
        ) : (
          <div className="h-full overflow-auto quiet-scroll">
            {view === "journal" ? (
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
                monthDaysISO={monthDaysISO}
                entries={data.entryList}
                subtasksByHabit={data.subtasksByHabit}
                year={anchorYear}
                month={anchorMonth}
              />
            )}
          </div>
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
