"use client";

import { EntryPhoto } from "@/components/entries/EntryPhoto";
import { habitColor } from "@/lib/colors";

/**
 * How a habit or subtask identifies itself in a list: its picture if it has
 * one, otherwise the colour dot. Same footprint either way so rows stay
 * aligned. Sized big enough to actually recognise the photo — a 20px chip
 * reads as a favicon, not a picture.
 */
export function HabitBadge({
  imagePath,
  color,
  size = 28,
  className = "",
  onClick,
  label,
}: {
  imagePath: string | null | undefined;
  color: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  label?: string;
}) {
  const hex = habitColor(color);

  if (!imagePath) {
    return (
      <span
        className={`shrink-0 rounded-full ${className}`}
        style={{ width: size * 0.42, height: size * 0.42, backgroundColor: hex }}
        aria-hidden="true"
      />
    );
  }

  const image = (
    <EntryPhoto path={imagePath} alt={label ?? ""} className="h-full w-full" />
  );
  const style = { width: size, height: size, boxShadow: `0 0 0 1.5px ${hex}` };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        title={label ? `View ${label}` : "View image"}
        aria-label={label ? `View image for ${label}` : "View image"}
        className={`block shrink-0 overflow-hidden rounded-sm transition-transform duration-150 hover:scale-105 ${className}`}
        style={style}
      >
        {image}
      </button>
    );
  }

  return (
    <span
      className={`block shrink-0 overflow-hidden rounded-sm ${className}`}
      style={style}
      aria-hidden="true"
    >
      {image}
    </span>
  );
}
