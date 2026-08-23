import type { ISODate } from "@/lib/dates";

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  position: number;
  is_active: boolean;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Subtask = {
  id: string;
  habit_id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type HabitEntry = {
  id: string;
  habit_id: string;
  user_id: string;
  date: ISODate;
  completed: boolean;
  completed_subtasks: string[];
  note: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
};

export type EntryDraft = {
  habit_id: string;
  date: ISODate;
  completed: boolean;
  completed_subtasks: string[];
  note: string | null;
  photo_path: string | null;
};

export type SessionUser = { id: string; email: string | null };

/**
 * Everything the UI needs from a backend. Two implementations exist: Supabase
 * (production) and a browser-local one used when Supabase isn't configured, so
 * the app runs and can be evaluated before credentials exist.
 */
export interface HabitStore {
  readonly kind: "supabase" | "local";

  getUser(): Promise<SessionUser | null>;
  signIn(email: string, password: string): Promise<SessionUser>;
  signUp(email: string, password: string): Promise<SessionUser | null>;
  signOut(): Promise<void>;

  listHabits(): Promise<Habit[]>;
  createHabit(name: string, color: string): Promise<Habit>;
  renameHabit(id: string, name: string): Promise<void>;
  recolorHabit(id: string, color: string): Promise<void>;
  deleteHabit(id: string): Promise<void>;
  reorderHabits(orderedIds: string[]): Promise<void>;

  listSubtasks(): Promise<Subtask[]>;
  createSubtask(habitId: string, name: string): Promise<Subtask>;
  renameSubtask(id: string, name: string): Promise<void>;
  deleteSubtask(id: string): Promise<void>;

  listEntries(from: ISODate, to: ISODate): Promise<HabitEntry[]>;
  listAllEntries(): Promise<HabitEntry[]>;
  upsertEntry(draft: EntryDraft): Promise<HabitEntry>;
  deleteEntry(habitId: string, date: ISODate): Promise<void>;

  uploadPhoto(file: File, habitId: string, date: ISODate): Promise<string>;
  removePhoto(path: string): Promise<void>;
  photoUrl(path: string): Promise<string | null>;
}

export class StoreError extends Error {}
