"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { Habit, Subtask } from "@/lib/data";
import { HabitBadge } from "@/components/habits/HabitBadge";
import type { EntryMap } from "@/lib/hooks/useHabitData";
import {
  dayOfMonth,
  daysBetween,
  formatMonthShort,
  isWeekend,
  monthKey,
  today,
  weekdayShort,
  type ISODate,
} from "@/lib/dates";
import { dayProgress } from "@/lib/progress";
import { HabitCell, type GridMode } from "./HabitCell";

// Detailed cells need room for a thumbnail and a few lines of note; compact
// cells only need to be comfortably clickable.
const DAY_COL: Record<GridMode, number> = { compact: 38, detailed: 148 };

// The habit thumbnail: big enough to read as the photo you uploaded.
const BADGE: Record<GridMode, number> = { compact: 56, detailed: 72 };

// Height of the daily-total bar row pinned under the habits.
const SUMMARY_H = 64;

/** How close to an edge before we ask for more days. */
const EDGE_PX = 900;

export type GridApi = {
  /** Bring `date` to the left edge, just right of the habit column. */
  scrollToDate: (date: ISODate, behavior?: ScrollBehavior) => void;
};

type Props = {
  habits: Habit[];
  days: ISODate[];
  entryMap: EntryMap;
  subtasksByHabit: Record<string, Subtask[]>;
  mode: GridMode;
  onOpenCell: (habitId: string, date: ISODate) => void;
  /** Leftmost visible day, so the header can name the month you're looking at. */
  onVisibleDateChange: (date: ISODate) => void;
  onNeedMore: (edge: "start" | "end") => void;
};

export const CalendarGrid = forwardRef<GridApi, Props>(function CalendarGrid(
  {
    habits,
    days,
    entryMap,
    subtasksByHabit,
    mode,
    onOpenCell,
    onVisibleDateChange,
    onNeedMore,
  },
  apiRef,
) {
  const todayISO = today();
  const scroller = useRef<HTMLDivElement>(null);
  const minDayCol = DAY_COL[mode];

  // Contiguous runs of days belonging to the same month, for the top label row.
  const monthSpans = useMemo(() => {
    const spans: { key: string; label: string; span: number; first: ISODate }[] = [];
    for (const date of days) {
      const key = monthKey(date);
      const last = spans[spans.length - 1];
      if (last && last.key === key) last.span += 1;
      else spans.push({ key, label: formatMonthShort(date), span: 1, first: date });
    }
    return spans;
  }, [days]);

  // How much of the whole day got done, averaged over every habit. A habit
  // that is half-finished contributes half, same as everywhere else.
  const dayTotals = useMemo(() => {
    const totals: Record<string, { fraction: number; done: number }> = {};
    for (const date of days) {
      let sum = 0;
      let done = 0;
      for (const habit of habits) {
        const progress = dayProgress(entryMap[habit.id]?.[date], subtasksByHabit[habit.id] ?? []);
        sum += progress.fraction;
        if (progress.complete) done += 1;
      }
      totals[date] = { fraction: habits.length ? sum / habits.length : 0, done };
    }
    return totals;
  }, [days, habits, entryMap, subtasksByHabit]);

  const columnWidth = useCallback(() => {
    const el = scroller.current?.querySelector<HTMLElement>("[data-daycol]");
    return el?.getBoundingClientRect().width || minDayCol;
  }, [minDayCol]);

  const scrollToDate = useCallback(
    (date: ISODate, behavior: ScrollBehavior = "smooth") => {
      const el = scroller.current;
      if (!el || days.length === 0) return;
      const index = daysBetween(days[0], date);
      const clamped = Math.max(0, Math.min(days.length - 1, index));
      el.scrollTo({ left: clamped * columnWidth(), behavior });
    },
    [columnWidth, days],
  );

  useImperativeHandle(apiRef, () => ({ scrollToDate }), [scrollToDate]);

  // Prepending days would visually yank the grid sideways; offset the scroll by
  // exactly what was added so the day under your cursor stays put.
  const prevFirst = useRef<ISODate | undefined>(days[0]);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !days[0]) return;
    if (prevFirst.current && days[0] !== prevFirst.current) {
      const added = daysBetween(days[0], prevFirst.current);
      if (added > 0) el.scrollLeft += added * columnWidth();
    }
    prevFirst.current = days[0];
  }, [days, columnWidth]);

  // Report the leftmost day, and ask for more when an edge comes near.
  const reportRef = useRef({ onVisibleDateChange, onNeedMore });
  reportRef.current = { onVisibleDateChange, onNeedMore };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const width = columnWidth();
        const index = Math.round(el.scrollLeft / width);
        const date = days[Math.max(0, Math.min(days.length - 1, index))];
        if (date) reportRef.current.onVisibleDateChange(date);
        if (el.scrollLeft < EDGE_PX) reportRef.current.onNeedMore("start");
        else if (el.scrollLeft > el.scrollWidth - el.clientWidth - EDGE_PX) {
          reportRef.current.onNeedMore("end");
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [columnWidth, days]);

  // --- drag to pan ---------------------------------------------------------
  // Trackpads already scroll horizontally; this is for dragging with a mouse or
  // a finger on the empty parts of the grid.
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const el = scroller.current;
    if (!el) return;
    drag.current = { active: true, startX: event.clientX, startLeft: el.scrollLeft, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const el = scroller.current;
    if (!drag.current.active || !el) return;
    const dx = event.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(dx) > 5) {
      drag.current.moved = true;
      document.body.classList.add("is-panning");
    }
    if (drag.current.moved) el.scrollLeft = drag.current.startLeft - dx;
  };

  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    document.body.classList.remove("is-panning");
    // Leave `moved` set so the click that follows this drag is swallowed.
    if (drag.current.moved) window.setTimeout(() => (drag.current.moved = false), 0);
  };

  // A drag that ends over a cell must not also open that cell.
  const onClickCapture = (event: React.MouseEvent) => {
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  useEffect(() => () => document.body.classList.remove("is-panning"), []);

  return (
    <div
      ref={scroller}
      className="h-full overflow-auto quiet-scroll overscroll-x-contain"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onClickCapture={onClickCapture}
    >
      <div
        className="grid min-w-full border-t border-line [--habit-col:148px] sm:[--habit-col:208px]"
        style={{
          gridTemplateColumns: `var(--habit-col) repeat(${days.length}, minmax(${minDayCol}px, 1fr))`,
          minWidth: `calc(var(--habit-col) + ${days.length * minDayCol}px)`,
        }}
        role="grid"
        aria-label="Habit calendar"
      >
        {/* month label row */}
        <div
          data-habitcol
          className="sticky left-0 top-0 z-40 border-b border-r border-line bg-page px-4 py-1 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted"
        >
          Habit
        </div>
        {monthSpans.map((span) => (
          <div
            key={span.key}
            style={{ gridColumn: `span ${span.span}` }}
            className="sticky top-0 z-30 flex items-center border-b border-r border-line bg-page px-2 py-1"
          >
            <span className="sticky left-2 whitespace-nowrap text-[13px] font-semibold tracking-[-0.01em] text-ink">
              {span.label}
            </span>
          </div>
        ))}

        {/* day header row */}
        <div className="sticky left-0 top-[27px] z-40 border-b border-r border-line bg-page" />
        {days.map((date) => {
          const isToday = date === todayISO;
          return (
            <div
              key={date}
              data-daycol
              data-date={date}
              className={`sticky top-[27px] z-20 flex flex-col items-center justify-center border-b border-r border-line py-1.5 ${
                isToday ? "bg-accent-tint" : "bg-page"
              }`}
            >
              <span
                className={`text-[10.5px] uppercase tracking-[0.06em] ${
                  isToday ? "text-accent-strong" : "text-muted"
                }`}
              >
                {weekdayShort(date)}
              </span>
              <span
                className={`tabular text-[13.5px] ${
                  isToday ? "font-semibold text-accent-strong" : "font-medium text-ink-soft"
                }`}
              >
                {dayOfMonth(date)}
              </span>
            </div>
          );
        })}

        {/* habit rows */}
        {habits.map((habit) => (
          <div key={habit.id} className="contents">
            <div
              className={`sticky left-0 z-10 flex border-b border-r border-line bg-surface px-3 sm:px-4 ${
                mode === "detailed" ? "items-start pt-3" : "items-center"
              }`}
            >
              <HabitBadge
                imagePath={habit.image_path}
                color={habit.color}
                size={BADGE[mode]}
                className="mr-2.5 mt-[2px]"
              />
              <span className="truncate text-[14.5px] font-medium text-ink" title={habit.name}>
                {habit.name}
              </span>
            </div>
            {days.map((date) => (
              <HabitCell
                key={date}
                habitId={habit.id}
                habitName={habit.name}
                colorKey={habit.color}
                subtasks={subtasksByHabit[habit.id] ?? []}
                date={date}
                entry={entryMap[habit.id]?.[date]}
                mode={mode}
                isToday={date === todayISO}
                isFuture={date > todayISO}
                isWeekend={isWeekend(date)}
                onOpen={onOpenCell}
              />
            ))}
          </div>
        ))}

        {/* daily total — pinned to the bottom of the scrollport */}
        <div className="contents">
          <div
            className="sticky bottom-0 left-0 z-40 flex flex-col justify-center border-r border-t border-line bg-surface px-3 sm:px-4"
            style={{ height: SUMMARY_H }}
          >
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">
              Day total
            </span>
            <span className="text-[12px] text-muted">across {habits.length} habits</span>
          </div>

          {days.map((date) => {
            const { fraction, done } = dayTotals[date] ?? { fraction: 0, done: 0 };
            const pct = Math.round(fraction * 100);
            const isToday = date === todayISO;
            return (
              <div
                key={date}
                title={`${dayOfMonth(date)}: ${pct}% — ${done} of ${habits.length} habits complete`}
                className={`sticky bottom-0 z-30 flex items-end justify-center border-r border-t border-line px-[3px] pb-[3px] ${
                  isToday ? "bg-accent-tint" : "bg-surface"
                }`}
                style={{ height: SUMMARY_H }}
              >
                <div
                  className="w-full rounded-t-[2px] transition-[height] duration-200"
                  style={{
                    // Always leave a sliver so an empty day still reads as a column.
                    height: `${Math.max(fraction * (SUMMARY_H - 10), fraction > 0 ? 3 : 2)}px`,
                    backgroundColor:
                      fraction > 0 ? "var(--color-accent)" : "var(--color-line)",
                    opacity: fraction > 0 ? 0.35 + fraction * 0.65 : 1,
                  }}
                  role="img"
                  aria-label={`${pct} percent of habits complete`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
