"use client";

import { useMemo } from "react";
import type { Habit, HabitEntry } from "@/lib/data";
import { dayOfMonth, formatMonth, today, type ISODate } from "@/lib/dates";
import { bestStreak, completionPercentage, currentStreak } from "@/lib/stats";

export function ConsistencyView({
  habits,
  monthDaysISO,
  entries,
  year,
  month,
}: {
  habits: Habit[];
  monthDaysISO: ISODate[];
  entries: HabitEntry[];
  year: number;
  month: number;
}) {
  const todayISO = today();

  // Days that could realistically have been completed — a future date isn't a miss.
  const elapsedDays = useMemo(
    () => monthDaysISO.filter((date) => date <= todayISO),
    [monthDaysISO, todayISO],
  );

  const completedByHabit = useMemo(() => {
    const map = new Map<string, Set<ISODate>>();
    for (const entry of entries) {
      if (!entry.completed) continue;
      const set = map.get(entry.habit_id) ?? new Set<ISODate>();
      set.add(entry.date);
      map.set(entry.habit_id, set);
    }
    return map;
  }, [entries]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <p className="pb-5 text-[14px] text-muted">
        Completion is measured against days elapsed in {formatMonth(year, month)}. Streaks look at
        your whole history.
      </p>

      <ul className="divide-y divide-line border-y border-line">
        {habits.map((habit) => {
          const completed = completedByHabit.get(habit.id) ?? new Set<ISODate>();
          const percent = completionPercentage(elapsedDays, (date) => completed.has(date));
          const streak = currentStreak(completed, todayISO);
          const best = bestStreak(completed);

          return (
            <li key={habit.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-[15.5px] font-medium text-ink">{habit.name}</h3>
                <p className="tabular text-[14px] text-muted">
                  <span className="font-semibold text-ink">{percent}%</span>
                  <span className="px-2 text-line-strong">·</span>
                  {streak} day streak
                  <span className="px-2 text-line-strong">·</span>
                  best {best}
                </p>
              </div>

              <div className="mt-3 flex gap-[3px]" role="img" aria-label={`${habit.name}: ${percent}% complete in ${formatMonth(year, month)}`}>
                {monthDaysISO.map((date) => {
                  const isDone = completed.has(date);
                  const isFuture = date > todayISO;
                  return (
                    <span
                      key={date}
                      title={`${dayOfMonth(date)} — ${isDone ? "completed" : isFuture ? "upcoming" : "missed"}`}
                      className={`h-6 flex-1 rounded-[2px] ${
                        isDone
                          ? "bg-accent"
                          : isFuture
                            ? "border border-dashed border-line-strong/60"
                            : "bg-line"
                      }`}
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
