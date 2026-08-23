import type { HabitEntry, Subtask } from "@/lib/data/types";

export type DayProgress = {
  /** 0–1. A habit with no subtasks is all-or-nothing. */
  fraction: number;
  done: number;
  total: number;
  /** True only at fraction 1 — what streaks and the grid check mark key off. */
  complete: boolean;
};

/**
 * How far a habit got on one day.
 *
 * With subtasks, every subtask is worth the same share of the day. Ids left
 * over from a deleted subtask are ignored, so removing a subtask re-scores past
 * days against the habit as it exists now rather than leaving impossible
 * fractions behind.
 */
export function dayProgress(entry: HabitEntry | undefined, subtasks: Subtask[]): DayProgress {
  const total = subtasks.length;

  if (total === 0) {
    const complete = Boolean(entry?.completed);
    return { fraction: complete ? 1 : 0, done: complete ? 1 : 0, total: 0, complete };
  }

  const live = new Set(subtasks.map((s) => s.id));
  const done = (entry?.completed_subtasks ?? []).filter((id) => live.has(id)).length;
  const fraction = done / total;
  return { fraction, done, total, complete: done === total };
}

/** The stored `completed` flag a save should carry, given the subtask state. */
export function derivedCompleted(
  completedSubtasks: string[],
  subtasks: Subtask[],
  manualToggle: boolean,
): boolean {
  if (subtasks.length === 0) return manualToggle;
  const live = new Set(subtasks.map((s) => s.id));
  return completedSubtasks.filter((id) => live.has(id)).length === subtasks.length;
}
