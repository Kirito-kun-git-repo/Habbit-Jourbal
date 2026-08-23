"use client";

import { EntryPhoto } from "@/components/entries/EntryPhoto";
import { habitColor } from "@/lib/colors";

/**
 * How a habit or subtask identifies itself in a list: its picture if it has
 * one, otherwise the colour dot. Same shape either way so rows stay aligned.
 */
export function HabitBadge({
  imagePath,
  color,
  size = 18,
  className = "",
}: {
  imagePath: string | null | undefined;
  color: string;
  size?: number;
  className?: string;
}) {
  const hex = habitColor(color);

  if (!imagePath) {
    return (
      <span
        className={`shrink-0 rounded-full ${className}`}
        style={{ width: size * 0.56, height: size * 0.56, backgroundColor: hex }}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={`block shrink-0 overflow-hidden rounded-sm ${className}`}
      style={{ width: size, height: size, boxShadow: `0 0 0 1.5px ${hex}` }}
      aria-hidden="true"
    >
      <EntryPhoto path={imagePath} alt="" className="h-full w-full" />
    </span>
  );
}
