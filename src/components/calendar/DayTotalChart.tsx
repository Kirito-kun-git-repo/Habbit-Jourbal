"use client";

import { useMemo } from "react";
import { dayOfMonth, type ISODate } from "@/lib/dates";

export const DEFAULT_CHART_HEIGHT = 172;
export const MIN_CHART_HEIGHT = 96;
export const MAX_CHART_HEIGHT = 460;

/** Comparison window for the direction arrow, in days. */
const WINDOW = 7;

/**
 * The plot is divided into four cells by the gridlines. The top one is left
 * empty: bars are drawn into the lower three, so the trend line always rides a
 * full cell clear of them instead of grazing the tallest bar.
 */
const HEADROOM = 0.25;
const BAR_SCALE = 1 - HEADROOM;

/** Height of a day's bar and of the line above it, as fractions of the plot. */
function levels(fraction: number) {
  const bar = fraction * BAR_SCALE;
  return { bar, line: bar + HEADROOM };
}

export type DaySegment = { habitId: string; color: string; share: number };
export type DayTotal = { fraction: number; done: number; segments: DaySegment[] };

/**
 * Direction of travel: this week's average against the week before it.
 * Only the sign is shown — the bars already say how much by.
 */
export function consistencyTrend(values: number[]) {
  if (values.length < 2) return { delta: 0, recent: 0 };
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const recent = mean(values.slice(-WINDOW));
  const prior = values.slice(-WINDOW * 2, -WINDOW);
  if (prior.length === 0) return { delta: 0, recent };
  return { delta: Math.round((recent - mean(prior)) * 100), recent };
}

/**
 * One bar per day, stacked out of the habits that contributed to it, with a
 * line riding along the tops. Each habit's slice is worth 1/habits of the day,
 * scaled by how much of that habit got done, so the stack height is the day's
 * overall completion and each band shows who earned it.
 */
export function DayTotalChart({
  days,
  totals,
  habitCount,
  todayISO,
  height,
}: {
  days: ISODate[];
  totals: Record<string, DayTotal>;
  habitCount: number;
  todayISO: ISODate;
  height: number;
}) {
  // The line sits a whole cell above each bar rather than cutting through it.
  const linePoints = useMemo(
    () =>
      days
        .filter((d) => d <= todayISO)
        .map((date, i) => {
          const { line } = levels(totals[date]?.fraction ?? 0);
          return `${i + 0.5},${(1 - line) * 100}`;
        })
        .join(" "),
    [days, totals, todayISO],
  );

  return (
    <div className="relative" style={{ height }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {[0, 0.25, 0.5, 0.75].map((at) => (
          <div
            key={at}
            className="absolute inset-x-0 border-t border-line/70"
            style={{ top: `${at * 100}%` }}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 grid items-end"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((date) => {
          const { fraction = 0, done = 0, segments = [] } = totals[date] ?? {};
          const pct = Math.round(fraction * 100);
          const { bar, line } = levels(fraction);
          const future = date > todayISO;
          return (
            <div
              key={date}
              className={`relative flex h-full items-end justify-center px-[14%] ${
                date === todayISO
                  ? "bg-accent-tint shadow-[inset_1px_0_0_var(--color-accent),inset_-1px_0_0_var(--color-accent)]"
                  : ""
              }`}
              title={`${dayOfMonth(date)}: ${pct}% — ${done} of ${habitCount} habits complete`}
            >
              {fraction > 0 && (
                <div
                  className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px] transition-[height] duration-200"
                  style={{ height: `${bar * 100}%`, opacity: future ? 0.35 : 1 }}
                >
                  {segments.map((segment) => (
                    <div
                      key={segment.habitId}
                      className="w-full shrink-0"
                      style={{
                        // Share of the whole day, re-expressed as a share of this bar.
                        height: `${(segment.share / fraction) * 100}%`,
                        backgroundColor: segment.color,
                      }}
                    />
                  ))}
                </div>
              )}

              {fraction > 0 && !future && (
                <span
                  className="pointer-events-none absolute left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full border border-surface"
                  style={{
                    bottom: `calc(${line * 100}% - 2.5px)`,
                    backgroundColor: "var(--color-ink)",
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Rides a cell above the bar tops. The viewBox is stretched to the day
          columns, so the stroke is pinned to a constant width. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${days.length} 100`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity="0.8"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export function TrendBadge({ delta }: { delta: number }) {
  const flat = Math.abs(delta) < 2;
  const up = delta > 0;
  const color = flat ? "var(--color-muted)" : up ? "#16A34A" : "#DC2626";

  return (
    <svg
      viewBox="0 0 16 16"
      className="h-[18px] w-[18px] shrink-0"
      style={{ color }}
      role="img"
      aria-label={flat ? "Consistency is steady" : `Consistency is ${up ? "rising" : "falling"}`}
    >
      {flat ? (
        <path d="M3 8h10M11 5.5 13.5 8 11 10.5" fill="none" stroke="currentColor"
          strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={up ? "M3 12 8 5l5 7" : "M3 4l5 7 5-7"} fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
