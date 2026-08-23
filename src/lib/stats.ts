import { addDays, compareDates, type ISODate } from "./dates";

export type CompletionLookup = (date: ISODate) => boolean;

/** completed entries / possible days, as a 0–100 integer. */
export function completionPercentage(days: ISODate[], isDone: CompletionLookup): number {
  if (days.length === 0) return 0;
  const done = days.filter(isDone).length;
  return Math.round((done / days.length) * 100);
}

/**
 * Consecutive completed days ending today. If today isn't marked yet the streak
 * is measured from yesterday, so an unlogged morning doesn't read as a break.
 */
export function currentStreak(completedDates: Set<ISODate>, todayISO: ISODate): number {
  let cursor = completedDates.has(todayISO) ? todayISO : addDays(todayISO, -1);
  if (!completedDates.has(cursor)) return 0;
  let streak = 0;
  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive completed days anywhere in the data. */
export function bestStreak(completedDates: Set<ISODate>): number {
  const sorted = [...completedDates].sort(compareDates);
  let best = 0;
  let run = 0;
  let prev: ISODate | null = null;
  for (const date of sorted) {
    run = prev !== null && addDays(prev, 1) === date ? run + 1 : 1;
    if (run > best) best = run;
    prev = date;
  }
  return best;
}
