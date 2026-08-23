"use client";

import { memo } from "react";
import { EntryPhoto } from "@/components/entries/EntryPhoto";
import type { HabitEntry } from "@/lib/data";
import { formatLongDate, type ISODate } from "@/lib/dates";
import { CheckIcon } from "@/components/ui/icons";

/**
 * "compact" is the month-at-a-glance grid: one mark per day.
 * "detailed" keeps the same rows and columns but opens each cell up enough to
 * show the photo and note that were attached to it.
 */
export type GridMode = "compact" | "detailed";

type Props = {
  habitId: string;
  habitName: string;
  date: ISODate;
  entry?: HabitEntry;
  mode: GridMode;
  isToday: boolean;
  isFuture: boolean;
  isWeekend: boolean;
  onOpen: (habitId: string, date: ISODate) => void;
};

function HabitCellBase({
  habitId,
  habitName,
  date,
  entry,
  mode,
  isToday,
  isFuture,
  isWeekend,
  onOpen,
}: Props) {
  const completed = Boolean(entry?.completed);
  const note = entry?.note?.trim() ?? "";
  const hasNote = Boolean(note);
  const hasPhoto = Boolean(entry?.photo_path);
  const detailed = mode === "detailed";

  const state = completed ? "Completed" : entry ? "Logged, not completed" : "Not completed";
  const extras = [hasPhoto && "has a photo", hasNote && "has a note"].filter(Boolean).join(", ");

  const shell = [
    "group relative flex w-full border-b border-r border-line transition-colors duration-150",
    detailed ? "flex-col items-stretch gap-1.5 p-1.5 text-left" : "h-11 items-center justify-center",
    isWeekend && !completed ? "bg-[#faf8f4]" : "",
    completed ? "bg-accent-soft hover:bg-[#eed8cd]" : "hover:bg-sunken",
    isToday ? "shadow-[inset_0_0_0_1px_var(--color-accent)]" : "",
    isFuture && !entry ? "opacity-55" : "",
  ].join(" ");

  const mark = completed ? (
    <CheckIcon className="anim-mark h-[18px] w-[18px] text-accent" />
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
      {hasPhoto && <span className="h-[4px] w-[4px] rounded-full bg-accent-strong/75" />}
      {hasNote && <span className="h-[4px] w-[4px] rounded-full bg-accent-strong/35" />}
    </span>
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(habitId, date)}
      aria-label={`${habitName}, ${formatLongDate(date)}. ${state}${extras ? `, ${extras}` : ""}.`}
      aria-pressed={completed}
      className={shell}
    >
      {detailed ? (
        <>
          <span className="flex min-h-[20px] items-center justify-between">
            {mark}
            {dots}
          </span>

          {entry?.photo_path && (
            <span className="block overflow-hidden rounded-xs border border-line/70 bg-sunken">
              <EntryPhoto
                path={entry.photo_path}
                alt={`${habitName} on ${formatLongDate(date)}`}
                className="h-[68px] w-full"
              />
            </span>
          )}

          {hasNote && (
            <span className="line-clamp-4 text-[13px] leading-[1.45] text-ink-soft">{note}</span>
          )}
        </>
      ) : (
        <>
          {mark}
          {(hasPhoto || hasNote) && (
            <span className="absolute bottom-[5px] right-[5px]">{dots}</span>
          )}
        </>
      )}
    </button>
  );
}

export const HabitCell = memo(HabitCellBase);
