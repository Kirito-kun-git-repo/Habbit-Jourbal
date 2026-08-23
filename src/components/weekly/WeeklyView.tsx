"use client";

import { useMemo } from "react";
import { JournalCard, hasContent, type JournalEntry } from "@/components/journal/JournalView";
import { CheckIcon } from "@/components/ui/icons";
import type { Habit, Subtask } from "@/lib/data";
import { HabitBadge } from "@/components/habits/HabitBadge";
import { habitColor } from "@/lib/colors";
import { dayProgress } from "@/lib/progress";
import type { EntryMap } from "@/lib/hooks/useHabitData";
import { formatLongDate, today, weekDays, weekdayShort, dayOfMonth, type ISODate } from "@/lib/dates";

export function WeeklyView({
  habits,
  weekStartISO,
  entryMap,
  subtasksByHabit,
  onOpenCell,
}: {
  habits: Habit[];
  weekStartISO: ISODate;
  entryMap: EntryMap;
  subtasksByHabit: Record<string, Subtask[]>;
  onOpenCell: (habitId: string, date: ISODate) => void;
}) {
  const days = useMemo(() => weekDays(weekStartISO), [weekStartISO]);
  const todayISO = today();

  const highlights = useMemo(() => {
    const names = new Map(habits.map((h) => [h.id, h.name]));
    const colors = new Map(habits.map((h) => [h.id, h.color as string]));
    const images = new Map(habits.map((h) => [h.id, h.image_path]));
    const rows: { date: ISODate; entries: JournalEntry[] }[] = [];
    for (const date of days) {
      const dayEntries = habits
        .map((habit) => entryMap[habit.id]?.[date])
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .filter((entry) => entry.note?.trim() || entry.photo_path)
        .map((entry) => ({
          ...entry,
          habitName: names.get(entry.habit_id) ?? "",
          habitColor: colors.get(entry.habit_id) ?? "",
          habitImage: images.get(entry.habit_id) ?? null,
        }));
      if (dayEntries.length > 0) rows.push({ date, entries: dayEntries });
    }
    return rows;
  }, [days, entryMap, habits]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="overflow-x-auto quiet-scroll">
        <div
          className="grid min-w-[600px] overflow-hidden rounded-sm border border-line bg-surface"
          style={{ gridTemplateColumns: "minmax(172px, 1.3fr) repeat(7, minmax(54px, 1fr))" }}
        >
          <div className="border-b border-r border-line px-4 py-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            Habit
          </div>
          {days.map((date) => (
            <div
              key={date}
              className={`flex flex-col items-center justify-center border-b border-r border-line py-2 ${
                date === todayISO ? "bg-accent-tint" : ""
              }`}
            >
              <span className="text-[11px] uppercase tracking-[0.06em] text-muted">
                {weekdayShort(date)}
              </span>
              <span
                className={`tabular text-[14px] ${
                  date === todayISO ? "font-semibold text-accent-strong" : "text-ink-soft"
                }`}
              >
                {dayOfMonth(date)}
              </span>
            </div>
          ))}

          {habits.map((habit) => (
            <div key={habit.id} className="contents">
              <div className="flex items-center gap-2 border-b border-r border-line px-4 py-2">
                <HabitBadge imagePath={habit.image_path} color={habit.color} size={20} />
                <span className="truncate text-[14.5px] font-medium text-ink">{habit.name}</span>
              </div>
              {days.map((date) => {
                const entry = entryMap[habit.id]?.[date];
                const color = habitColor(habit.color);
                const progress = dayProgress(entry, subtasksByHabit[habit.id] ?? []);
                const pct = Math.round(progress.fraction * 100);
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onOpenCell(habit.id, date)}
                    aria-label={`${habit.name}, ${formatLongDate(date)}. ${
                      progress.complete
                        ? "Completed"
                        : progress.total > 0 && progress.done > 0
                          ? `${progress.done} of ${progress.total} subtasks done`
                          : "Not completed"
                    }.`}
                    aria-pressed={progress.complete}
                    className="relative flex h-12 items-center justify-center border-b border-r border-line transition-colors duration-150 hover:bg-sunken"
                    style={
                      progress.fraction >= 1
                        ? { backgroundColor: `color-mix(in srgb, ${color} 26%, var(--color-surface))` }
                        : progress.fraction > 0
                          ? {
                              background: `linear-gradient(to top, color-mix(in srgb, ${color} 26%, var(--color-surface)) ${pct}%, color-mix(in srgb, ${color} 9%, var(--color-surface)) ${pct}%)`,
                            }
                          : undefined
                    }
                  >
                    {progress.complete ? (
                      <CheckIcon className="h-[18px] w-[18px]" style={{ color: color }} />
                    ) : progress.done > 0 ? (
                      <span
                        className="tabular text-[12.5px] font-semibold"
                        style={{ color: color }}
                      >
                        {progress.done}/{progress.total}
                      </span>
                    ) : (
                      <span
                        className="h-[7px] w-[7px] rounded-full bg-line-strong/70"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <section className="mt-9">
        <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">
          This week
        </h3>
        {highlights.length === 0 ? (
          <p className="mt-3 rounded-sm border border-dashed border-line-strong px-5 py-8 text-center text-[15px] text-muted">
            No photos or notes this week yet.
          </p>
        ) : (
          <ol className="mt-4 space-y-7">
            {highlights.map(({ date, entries }) => (
              <li key={date}>
                <h4 className="pb-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                  {formatLongDate(date)}
                </h4>
                <ul className="grid gap-3 border-l border-line pl-4 sm:grid-cols-2">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <JournalCard entry={entry} onOpen={onOpenCell} compact />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export { hasContent };
