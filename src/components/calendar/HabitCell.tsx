"use client";

import { memo } from "react";
import { EntryPhoto } from "@/components/entries/EntryPhoto";
import type { HabitEntry, Subtask } from "@/lib/data";
import { habitColor, type HabitColor } from "@/lib/colors";
import { formatLongDate, type ISODate } from "@/lib/dates";
import { dayProgress } from "@/lib/progress";
import { CheckIcon } from "@/components/ui/icons";

/**
 * "compact" is the month-at-a-glance grid: one mark per day.
 * "detailed" keeps the same rows and columns but opens each cell up to show the
 * photo and note that were attached to it.
 */
export type GridMode = "compact" | "detailed";

type Props = {
  habitId: string;
  habitName: string;
  colorKey: string;
  subtasks: Subtask[];
  date: ISODate;
  entry?: HabitEntry;
  mode: GridMode;
  isToday: boolean;
  isFuture: boolean;
  isWeekend: boolean;
  onOpen: (habitId: string, date: ISODate) => void;
};

/** Partial days fill from the bottom, so a month reads like a set of gauges. */
function fillStyle(fraction: number, color: HabitColor): React.CSSProperties | undefined {
  if (fraction <= 0) return undefined;
  if (fraction >= 1) return { backgroundColor: color.soft };
  const pct = Math.round(fraction * 100);
  return {
    background: `linear-gradient(to top, ${color.soft} ${pct}%, ${color.tint} ${pct}%)`,
  };
}

function HabitCellBase({
  habitId,
  habitName,
  colorKey,
  subtasks,
  date,
  entry,
  mode,
  isToday,
  isFuture,
  isWeekend,
  onOpen,
}: Props) {
  const color = habitColor(colorKey);
  const progress = dayProgress(entry, subtasks);
  const note = entry?.note?.trim() ?? "";
  const hasNote = Boolean(note);
  const hasPhoto = Boolean(entry?.photo_path);
  const detailed = mode === "detailed";

  const state = progress.complete
    ? "Completed"
    : progress.total > 0 && progress.done > 0
      ? `${progress.done} of ${progress.total} subtasks done`
      : entry
        ? "Logged, not completed"
        : "Not completed";
  const extras = [hasPhoto && "has a photo", hasNote && "has a note"].filter(Boolean).join(", ");

  const shell = [
    "group relative flex w-full border-b border-r border-line transition-colors duration-150",
    detailed ? "flex-col items-stretch gap-1.5 p-1.5 text-left" : "h-11 items-center justify-center",
    isWeekend && progress.fraction === 0 ? "bg-[#faf8f4]" : "",
    isToday ? "shadow-[inset_0_0_0_1px_var(--color-accent)]" : "",
    isFuture && !entry ? "opacity-55" : "",
  ].join(" ");

  const mark = progress.complete ? (
    <CheckIcon className="anim-mark h-[18px] w-[18px]" style={{ color: color.base }} />
  ) : progress.total > 0 && progress.done > 0 ? (
    <span className="tabular text-[12px] font-semibold" style={{ color: color.base }}>
      {progress.done}/{progress.total}
    </span>
  ) : entry ? (
    <span className="h-[7px] w-[7px] rounded-full bg-line-strong" aria-hidden="true" />
  ) : (
    <span
      className="h-[7px] w-[7px] rounded-full bg-transparent transition-colors duration-150 group-hover:bg-line-strong"
      aria-hidden="true"
    />
  );

  const dots = (hasPhoto || hasNote) && (
    <span className="flex items-center gap-[3px]" aria-hidden="true">
      {hasPhoto && (
        <span className="h-[4px] w-[4px] rounded-full" style={{ backgroundColor: color.base }} />
      )}
      {hasNote && (
        <span
          className="h-[4px] w-[4px] rounded-full opacity-45"
          style={{ backgroundColor: color.base }}
        />
      )}
    </span>
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(habitId, date)}
      aria-label={`${habitName}, ${formatLongDate(date)}. ${state}${extras ? `, ${extras}` : ""}.`}
      aria-pressed={progress.complete}
      className={shell}
      style={{ ["--cell-hover" as string]: progress.fraction >= 1 ? color.softHover : color.tint }}
    >
      {/* Fill sits behind the content so the button keeps its own hover colour. */}
      <span
        className="pointer-events-none absolute inset-0 transition-colors duration-150 group-hover:bg-[var(--cell-hover)]"
        style={fillStyle(progress.fraction, color)}
        aria-hidden="true"
      />

      {detailed ? (
        <>
          <span className="relative flex min-h-[20px] items-center justify-between">
            {mark}
            {dots}
          </span>

          {entry?.photo_path && (
            <span className="relative block overflow-hidden rounded-xs border border-line/70 bg-sunken">
              <EntryPhoto
                path={entry.photo_path}
                alt={`${habitName} on ${formatLongDate(date)}`}
                className="h-[68px] w-full"
              />
            </span>
          )}

          {progress.total > 0 && entry && (
            <span className="relative flex flex-wrap gap-1" aria-hidden="true">
              {subtasks.map((subtask) => {
                const done = (entry?.completed_subtasks ?? []).includes(subtask.id);
                return (
                  <span
                    key={subtask.id}
                    title={subtask.name}
                    className="h-[3px] flex-1 min-w-[10px] rounded-full"
                    style={{ backgroundColor: done ? color.base : color.soft }}
                  />
                );
              })}
            </span>
          )}

          {hasNote && (
            <span className="relative line-clamp-4 text-[13px] leading-[1.45] text-ink-soft">
              {note}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="relative flex items-center justify-center">{mark}</span>
          {(hasPhoto || hasNote) && (
            <span className="absolute bottom-[5px] right-[5px]">{dots}</span>
          )}
        </>
      )}
    </button>
  );
}

export const HabitCell = memo(HabitCellBase);
