"use client";

import { useMemo } from "react";
import { dayOfMonth, type ISODate } from "@/lib/dates";

export const CHART_HEIGHT = 172;

/** Trailing average window for the trend line, in days. */
const WINDOW = 7;

export type DayTotal = { fraction: number; done: number };

/** 0 → red, 0.5 → amber, 1 → green. */
function barColor(fraction: number, lightness: number): string {
  const hue = 6 + Math.max(0, Math.min(1, fraction)) * 136;
  return `hsl(${hue} 80% ${lightness}%)`;
}

function trailingAverage(values: number[], window: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    out.push(sum / Math.min(i + 1, window));
  }
  return out;
}

/**
 * Direction of travel: this week's average against the week before it.
 * Reported in percentage points, which is what the bars are measured in.
 */
export function consistencyTrend(values: number[]) {
  if (values.length < 2) return { delta: 0, recent: 0 };
  const recentSlice = values.slice(-WINDOW);
  const priorSlice = values.slice(-WINDOW * 2, -WINDOW);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const recent = mean(recentSlice);
  if (priorSlice.length === 0) return { delta: 0, recent };
  return { delta: Math.round((recent - mean(priorSlice)) * 100), recent };
}

/**
 * Bars for each day's overall completion, with a 7-day trailing average drawn
 * over them. The bars are noisy day to day; the line is the thing that answers
 * "am I getting better or worse".
 */
export function DayTotalChart({
  days,
  totals,
  habitCount,
  todayISO,
}: {
  days: ISODate[];
  totals: Record<string, DayTotal>;
  habitCount: number;
  todayISO: ISODate;
}) {
  const { linePoints } = useMemo(() => {
    // The line stops at today — trailing zeros for unlived days would drag it down.
    const elapsed = days.filter((d) => d <= todayISO);
    const averages = trailingAverage(
      elapsed.map((d) => totals[d]?.fraction ?? 0),
      WINDOW,
    );
    const points = averages
      .map((value, i) => `${i + 0.5},${(1 - value) * 100}`)
      .join(" ");
    return { linePoints: points };
  }, [days, totals, todayISO]);

  return (
    <div className="relative" style={{ height: CHART_HEIGHT }}>
      {/* 25 / 50 / 75 / 100% rules */}
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
          const { fraction = 0, done = 0 } = totals[date] ?? {};
          const pct = Math.round(fraction * 100);
          const future = date > todayISO;
          return (
            <div
              key={date}
              className="flex h-full items-end justify-center px-[14%]"
              title={`${dayOfMonth(date)}: ${pct}% — ${done} of ${habitCount} habits complete`}
            >
              {/* Nothing at all for an empty day. A minimum-height stub reads as
                  noise and, being flush with the bottom edge, leaks out from
                  under the sticky label column. */}
              {fraction > 0 && (
                <div
                  className="w-full rounded-t-[3px] transition-[height] duration-200"
                  style={{
                    height: `${Math.max(fraction * 100, 3)}%`,
                    // Red through amber to green, so the colour carries the score.
                    background: `linear-gradient(to bottom, ${barColor(fraction, 56)}, ${barColor(fraction, 46)})`,
                    opacity: future ? 0.35 : 1,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Trailing average. Non-uniform scaling would distort the stroke, so it
          is pinned to a constant width. */}
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
          strokeOpacity="0.75"
          strokeWidth="2.5"
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

  // Direction only. The bars and the trend line already say how much by; a
  // number and a tooltip on top of them is just noise.
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-[18px] w-[18px] shrink-0"
      style={{ color }}
      role="img"
      aria-label={
        flat ? "Consistency is steady" : `Consistency is ${up ? "rising" : "falling"}`
      }
    >
      {flat ? (
        <path d="M3 8h10M11 5.5 13.5 8 11 10.5" fill="none" stroke="currentColor"
          strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path
          d={up ? "M3 12 8 5l5 7" : "M3 4l5 7 5-7"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
