"use client";

import { useMemo } from "react";
import type { Habit, HabitEntry, Subtask } from "@/lib/data";
import { habitColor } from "@/lib/colors";
import { dayOfMonth, formatMonth, today, type ISODate } from "@/lib/dates";
import { dayProgress } from "@/lib/progress";
import { bestStreak, currentStreak } from "@/lib/stats";

export function ConsistencyView({
  habits,
  monthDaysISO,
  entries,
  subtasksByHabit,
  year,
  month,
}: {
  habits: Habit[];
  monthDaysISO: ISODate[];
  entries: HabitEntry[];
  subtasksByHabit: Record<string, Subtask[]>;
  year: number;
  month: number;
}) {
  const todayISO = today();

  // Days that could realistically have been completed — a future date isn't a miss.
  const elapsedDays = useMemo(
    () => monthDaysISO.filter((date) => date <= todayISO),
    [monthDaysISO, todayISO],
  );

  const entriesByHabit = useMemo(() => {
    const map = new Map<string, Map<ISODate, HabitEntry>>();
    for (const entry of entries) {
      const inner = map.get(entry.habit_id) ?? new Map<ISODate, HabitEntry>();
      inner.set(entry.date, entry);
      map.set(entry.habit_id, inner);
    }
    return map;
  }, [entries]);

  const anySubtasks = habits.some((h) => (subtasksByHabit[h.id] ?? []).length > 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <p className="pb-5 text-[14px] leading-relaxed text-muted">
        Completion is measured against days elapsed in {formatMonth(year, month)}. Streaks look at
        your whole history.
        {anySubtasks && " A part-finished day earns its fraction; a streak needs the whole day."}
      </p>

      <ul className="divide-y divide-line border-y border-line">
        {habits.map((habit) => {
          const color = habitColor(habit.color);
          const subtasks = subtasksByHabit[habit.id] ?? [];
          const byDate = entriesByHabit.get(habit.id) ?? new Map<ISODate, HabitEntry>();

          // Fractional credit: a habit half-done all month reads as 50%.
          const earned = elapsedDays.reduce(
            (sum, date) => sum + dayProgress(byDate.get(date), subtasks).fraction,
            0,
          );
          const percent =
            elapsedDays.length === 0 ? 0 : Math.round((earned / elapsedDays.length) * 100);

          // Streaks stay binary — a streak means the day was finished.
          const fullDays = new Set<ISODate>();
          for (const [date, entry] of byDate) {
            if (dayProgress(entry, subtasks).complete) fullDays.add(date);
          }
          const streak = currentStreak(fullDays, todayISO);
          const best = bestStreak(fullDays);

          return (
            <li key={habit.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="flex items-center gap-2 text-[15.5px] font-medium text-ink">
                  <span
                    className="h-[10px] w-[10px] shrink-0 rounded-full"
                    style={{ backgroundColor: color.base }}
                    aria-hidden="true"
                  />
                  {habit.name}
                  {subtasks.length > 0 && (
                    <span className="text-[13px] font-normal text-muted">
                      {subtasks.length} subtasks
                    </span>
                  )}
                </h3>
                <p className="tabular text-[14px] text-muted">
                  <span className="font-semibold text-ink">{percent}%</span>
                  <span className="px-2 text-line-strong">·</span>
                  {streak} day streak
                  <span className="px-2 text-line-strong">·</span>
                  best {best}
                </p>
              </div>

              <div
                className="mt-3 flex gap-[3px]"
                role="img"
                aria-label={`${habit.name}: ${percent}% complete in ${formatMonth(year, month)}`}
              >
                {monthDaysISO.map((date) => {
                  const { fraction } = dayProgress(byDate.get(date), subtasks);
                  const isFuture = date > todayISO;
                  const pct = Math.round(fraction * 100);
                  return (
                    <span
                      key={date}
                      title={`${dayOfMonth(date)} — ${
                        fraction >= 1
                          ? "completed"
                          : fraction > 0
                            ? `${pct}%`
                            : isFuture
                              ? "upcoming"
                              : "missed"
                      }`}
                      className={`h-6 flex-1 rounded-[2px] ${
                        fraction === 0 && isFuture
                          ? "border border-dashed border-line-strong/60"
                          : fraction === 0
                            ? "bg-line"
                            : ""
                      }`}
                      style={
                        fraction >= 1
                          ? { backgroundColor: color.base }
                          : fraction > 0
                            ? {
                                background: `linear-gradient(to top, ${color.base} ${pct}%, var(--color-line) ${pct}%)`,
                              }
                            : undefined
                      }
                    />
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
