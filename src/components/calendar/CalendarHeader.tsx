"use client";

import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { ViewSwitcher, type ViewKey } from "@/components/ui/ViewSwitcher";
import { GridModeSwitcher } from "./GridModeSwitcher";
import type { GridMode } from "./HabitCell";
import { MonthSelector } from "./MonthSelector";

export function CalendarHeader({
  view,
  onViewChange,
  periodLabel,
  showMonthSelector,
  year,
  month,
  onMonthChange,
  onPrev,
  onNext,
  onToday,
  prevLabel,
  nextLabel,
  gridMode,
  onGridModeChange,
  onManageHabits,
  email,
  onSignOut,
}: {
  view: ViewKey;
  onViewChange: (view: ViewKey) => void;
  periodLabel: string | null;
  showMonthSelector: boolean;
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  prevLabel: string;
  nextLabel: string;
  gridMode: GridMode | null;
  onGridModeChange: (mode: GridMode) => void;
  onManageHabits: () => void;
  email: string | null;
  onSignOut: () => void;
}) {
  return (
    <header className="shrink-0 border-b border-line bg-page">
      <div className="flex items-center justify-between gap-4 px-4 pt-3 sm:px-6">
        <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          Habit Journal
        </h1>
        <div className="flex items-center gap-1">
          {email && (
            <span className="hidden max-w-[180px] truncate text-[13.5px] text-muted sm:inline">
              {email}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 pb-3 pt-2.5 sm:px-6">
        {periodLabel === null && (
          <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">All entries</h2>
        )}

        {periodLabel !== null && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              aria-label={prevLabel}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              <ChevronLeftIcon className="h-[18px] w-[18px]" />
            </button>
            <h2 className="min-w-[150px] text-center text-[17px] font-semibold tracking-[-0.015em] text-ink sm:min-w-[190px] sm:text-left">
              {periodLabel}
            </h2>
            <button
              type="button"
              onClick={onNext}
              aria-label={nextLabel}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              <ChevronRightIcon className="h-[18px] w-[18px]" />
            </button>
            <Button size="sm" variant="secondary" className="ml-1.5" onClick={onToday}>
              Today
            </Button>
          </div>
        )}

        {showMonthSelector && (
          <MonthSelector year={year} month={month} onChange={onMonthChange} />
        )}

        <div className="ml-auto flex items-center gap-2">
          {gridMode && <GridModeSwitcher value={gridMode} onChange={onGridModeChange} />}
          <ViewSwitcher value={view} onChange={onViewChange} />
          <Button size="sm" variant="secondary" onClick={onManageHabits}>
            Habits
          </Button>
        </div>
      </div>
    </header>
  );
}
