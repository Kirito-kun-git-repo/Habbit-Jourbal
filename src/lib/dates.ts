/**
 * Calendar-day helpers.
 *
 * A habit entry is a calendar day, never a timestamp, so every date in this app
 * travels as an ISO "YYYY-MM-DD" string. Date objects are only ever constructed
 * with the local-time (y, m, d) constructor — never `new Date("2026-08-23")`,
 * which parses as UTC midnight and shifts a day in negative offsets.
 */

export type ISODate = string;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function daysInMonth(year: number, month: number): number {
  // month is 0-indexed; day 0 of the next month is the last day of this one,
  // so leap years and short months fall out for free.
  return new Date(year, month + 1, 0).getDate();
}

export function monthDays(year: number, month: number): ISODate[] {
  const count = daysInMonth(year, month);
  return Array.from({ length: count }, (_, i) => toISODate(new Date(year, month, i + 1)));
}

export function monthStart(year: number, month: number): ISODate {
  return toISODate(new Date(year, month, 1));
}

export function monthEnd(year: number, month: number): ISODate {
  return toISODate(new Date(year, month, daysInMonth(year, month)));
}

export function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function addDays(iso: ISODate, delta: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

/** Monday-based start of the week containing `iso`. */
export function weekStart(iso: ISODate): ISODate {
  const d = fromISODate(iso);
  const offset = (d.getDay() + 6) % 7; // Sunday(0) -> 6, Monday(1) -> 0
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

export function weekDays(startISO: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startISO, i));
}

/** Whole days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const MS = 24 * 60 * 60 * 1000;
  // Both are local midnights, so the difference is a whole number of days
  // except across a DST boundary — rounding absorbs that.
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / MS);
}

/** Inclusive list of every day from `from` to `to`. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const count = daysBetween(from, to);
  if (count < 0) return [];
  return Array.from({ length: count + 1 }, (_, i) => addDays(from, i));
}

/** "Aug 2026" */
export function formatMonthShort(iso: ISODate): string {
  return fromISODate(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}

/** First day of the month containing `iso`. */
export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

export function dayOfMonth(iso: ISODate): number {
  return Number(iso.slice(8, 10));
}

export function weekdayShort(iso: ISODate): string {
  return WEEKDAY_LABELS[(fromISODate(iso).getDay() + 6) % 7];
}

export function isWeekend(iso: ISODate): boolean {
  const day = fromISODate(iso).getDay();
  return day === 0 || day === 6;
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isSameDay(a: ISODate, b: ISODate): boolean {
  return a === b;
}

/** "Sunday, August 23" */
export function formatLongDate(iso: ISODate): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "Aug 23" */
export function formatShortDate(iso: ISODate): string {
  return fromISODate(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Aug 17 — Aug 23, 2026" */
export function formatWeekRange(startISO: ISODate): string {
  const endISO = addDays(startISO, 6);
  const year = fromISODate(endISO).getFullYear();
  return `${formatShortDate(startISO)} — ${formatShortDate(endISO)}, ${year}`;
}

export function formatMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}
