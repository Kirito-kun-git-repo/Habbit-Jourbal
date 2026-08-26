import type { HabitEntry, SubtaskPhotos } from "./types";

/**
 * Rows written before the photo gallery existed carry a single `photo_path`,
 * and a browser that has been offline since then still holds them in
 * localStorage. Both stores pass every entry through here, so the rest of the
 * app only ever sees the current shape.
 */
export function normalizeEntry(row: HabitEntry & { photo_path?: string | null }): HabitEntry {
  const paths = Array.isArray(row.photo_paths)
    ? row.photo_paths.filter(Boolean)
    : row.photo_path
      ? [row.photo_path]
      : [];
  const subtaskPhotos: SubtaskPhotos =
    row.subtask_photos && typeof row.subtask_photos === "object" ? row.subtask_photos : {};

  const next = { ...row, photo_paths: paths, subtask_photos: subtaskPhotos };
  delete next.photo_path;
  return next;
}

/** Every stored object an entry references — what has to go when it is deleted. */
export function entryPhotoPaths(entry: HabitEntry): string[] {
  return [...entry.photo_paths, ...Object.values(entry.subtask_photos ?? {})];
}
