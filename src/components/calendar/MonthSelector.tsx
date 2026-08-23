"use client";

import { MONTH_NAMES } from "@/lib/dates";

const YEAR_SPAN = 4;

export function MonthSelector({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: YEAR_SPAN * 2 + 1 }, (_, i) => thisYear - YEAR_SPAN + i);
  const selectClass =
    "h-8 rounded-sm border border-line-strong bg-surface px-2 text-[14px] text-ink transition-colors duration-150 hover:bg-sunken";

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label="Month"
        className={selectClass}
        value={month}
        onChange={(e) => onChange(year, Number(e.target.value))}
      >
        {MONTH_NAMES.map((name, index) => (
          <option key={name} value={index}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="Year"
        className={`${selectClass} tabular`}
        value={year}
        onChange={(e) => onChange(Number(e.target.value), month)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
