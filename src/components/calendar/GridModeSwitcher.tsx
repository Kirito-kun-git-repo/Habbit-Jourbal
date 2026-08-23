"use client";

import type { GridMode } from "./HabitCell";

const OPTIONS: { key: GridMode; label: string; hint: string }[] = [
  { key: "compact", label: "Compact", hint: "One mark per day" },
  { key: "detailed", label: "Detailed", hint: "Show photos and notes in the grid" },
];

export function GridModeSwitcher({
  value,
  onChange,
}: {
  value: GridMode;
  onChange: (mode: GridMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Grid detail"
      className="inline-flex rounded-sm border border-line-strong bg-sunken p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => onChange(option.key)}
            className={`rounded-xs px-2.5 py-1.5 text-[13.5px] font-medium transition-colors duration-150 ${
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(38,35,31,0.08)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
