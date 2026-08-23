"use client";

import { useEffect, useRef } from "react";
import type { Habit, Subtask } from "@/lib/data";
import { habitColor } from "@/lib/colors";
import type { EntryMap } from "@/lib/hooks/useHabitData";
import { dayOfMonth, isWeekend, today, weekdayShort, type ISODate } from "@/lib/dates";
import { HabitCell, type GridMode } from "./HabitCell";

// Detailed cells need room for a thumbnail and a few lines of note; compact
// cells only need to be comfortably clickable.
const DAY_COL: Record<GridMode, number> = { compact: 38, detailed: 148 };

export function CalendarGrid({
  habits,
  days,
  entryMap,
  subtasksByHabit,
  mode,
  onOpenCell,
}: {
  habits: Habit[];
  days: ISODate[];
  entryMap: EntryMap;
  subtasksByHabit: Record<string, Subtask[]>;
  mode: GridMode;
  onOpenCell: (habitId: string, date: ISODate) => void;
}) {
  const todayISO = today();
  const todayColumn = useRef<HTMLDivElement>(null);
  const month = days[0]?.slice(0, 7);
  const minDayCol = DAY_COL[mode];

  // Land on today rather than the 1st when the month is wide enough to scroll.
  useEffect(() => {
    todayColumn.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [month, mode]);

  return (
    <div
      className="grid min-w-full border-t border-line [--habit-col:132px] sm:[--habit-col:176px]"
      style={{
        gridTemplateColumns: `var(--habit-col) repeat(${days.length}, minmax(${minDayCol}px, 1fr))`,
        minWidth: `calc(var(--habit-col) + ${days.length * minDayCol}px)`,
      }}
      role="grid"
      aria-label="Habit calendar"
    >
      {/* header row */}
      <div className="sticky left-0 top-0 z-30 border-b border-r border-line bg-page px-4 py-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        Habit
      </div>
      {days.map((date) => {
        const isToday = date === todayISO;
        return (
          <div
            key={date}
            ref={isToday ? todayColumn : undefined}
            className={`sticky top-0 z-20 flex flex-col items-center justify-center border-b border-r border-line py-1.5 ${
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
            <span
              className="mr-2 mt-[3px] h-[10px] w-[10px] shrink-0 rounded-full"
              style={{ backgroundColor: habitColor(habit.color).base }}
              aria-hidden="true"
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
    </div>
  );
}
