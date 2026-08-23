/**
 * Browser-local implementation of HabitStore, used when Supabase env vars are
 * absent so the app is fully usable (and reviewable) before a project exists.
 * Records live in localStorage; photos live in IndexedDB as data URLs, which
 * keeps them out of the 5MB localStorage quota.
 *
 * This is a development/demo backend. Configure Supabase for anything real.
 */
import type { ISODate } from "@/lib/dates";
import {
  StoreError,
  type EntryDraft,
  type Habit,
  type HabitEntry,
  type HabitStore,
  type Subtask,
} from "./types";

const KEY = "habit-journal/v1";
const SESSION_KEY = "habit-journal/session";
const DB_NAME = "habit-journal-photos";
const DB_STORE = "photos";

type Account = { id: string; email: string; password: string };
type Db = {
  accounts: Account[];
  habits: Habit[];
  entries: HabitEntry[];
  subtasks: Subtask[];
};

const EMPTY: Db = { accounts: [], habits: [], entries: [], subtasks: [] };

function read(): Db {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Db) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function write(db: Db) {
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

function now() {
  return new Date().toISOString();
}

function currentUserId(): string {
  const id = typeof window === "undefined" ? null : window.localStorage.getItem(SESSION_KEY);
  if (!id) throw new StoreError("You are signed out. Sign in again to continue.");
  return id;
}

// --- photo blob storage -----------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new StoreError("Local photo storage is unavailable."));
  });
}

function photoTx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(DB_STORE, mode).objectStore(DB_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new StoreError("Local photo storage failed."));
      }),
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new StoreError("Could not read that image file."));
    reader.readAsDataURL(file);
  });
}

// --- store ------------------------------------------------------------------

export const localStore: HabitStore = {
  kind: "local",

  async getUser() {
    const id = typeof window === "undefined" ? null : window.localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const account = read().accounts.find((a) => a.id === id);
    return account ? { id: account.id, email: account.email } : null;
  },

  async signIn(email, password) {
    const db = read();
    const account = db.accounts.find((a) => a.email === email.toLowerCase());
    if (!account || account.password !== password) {
      throw new StoreError("That email and password don't match an account.");
    }
    window.localStorage.setItem(SESSION_KEY, account.id);
    return { id: account.id, email: account.email };
  },

  async signUp(email, password) {
    const db = read();
    const normalized = email.toLowerCase();
    if (db.accounts.some((a) => a.email === normalized)) {
      throw new StoreError("An account with that email already exists.");
    }
    const account: Account = { id: crypto.randomUUID(), email: normalized, password };
    db.accounts.push(account);
    write(db);
    window.localStorage.setItem(SESSION_KEY, account.id);
    return { id: account.id, email: account.email };
  },

  async signOut() {
    window.localStorage.removeItem(SESSION_KEY);
  },

  async listHabits() {
    const userId = currentUserId();
    return read()
      .habits.filter((h) => h.user_id === userId && h.is_active)
      .sort((a, b) => a.position - b.position);
  },

  async createHabit(name, color: string, imagePath: string | null = null) {
    const userId = currentUserId();
    const db = read();
    const mine = db.habits.filter((h) => h.user_id === userId);
    const habit: Habit = {
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      color,
      image_path: imagePath,
      position: mine.reduce((max, h) => Math.max(max, h.position), -1) + 1,
      is_active: true,
      created_at: now(),
      updated_at: now(),
    };
    db.habits.push(habit);
    write(db);
    return habit;
  },

  async renameHabit(id, name) {
    const userId = currentUserId();
    const db = read();
    const habit = db.habits.find((h) => h.id === id && h.user_id === userId);
    if (!habit) throw new StoreError("That habit no longer exists.");
    habit.name = name;
    habit.updated_at = now();
    write(db);
  },

  async recolorHabit(id, color: string) {
    const userId = currentUserId();
    const db = read();
    const habit = db.habits.find((h) => h.id === id && h.user_id === userId);
    if (!habit) throw new StoreError("That habit no longer exists.");
    habit.color = color;
    habit.updated_at = now();
    write(db);
  },

  async setHabitImage(id, path) {
    const userId = currentUserId();
    const db = read();
    const habit = db.habits.find((h) => h.id === id && h.user_id === userId);
    if (!habit) throw new StoreError("That habit no longer exists.");
    habit.image_path = path;
    habit.updated_at = now();
    write(db);
  },

  async deleteHabit(id) {
    const userId = currentUserId();
    const db = read();
    db.habits = db.habits.filter((h) => !(h.id === id && h.user_id === userId));
    db.entries = db.entries.filter((e) => e.habit_id !== id);
    db.subtasks = db.subtasks.filter((s) => s.habit_id !== id);
    write(db);
  },

  async listSubtasks() {
    const userId = currentUserId();
    return read()
      .subtasks.filter((s) => s.user_id === userId)
      .sort((a, b) => a.position - b.position);
  },

  async createSubtask(habitId, name, imagePath: string | null = null) {
    const userId = currentUserId();
    const db = read();
    if (!db.habits.some((h) => h.id === habitId && h.user_id === userId)) {
      throw new StoreError("That habit no longer exists.");
    }
    const siblings = db.subtasks.filter((s) => s.habit_id === habitId);
    const subtask: Subtask = {
      id: crypto.randomUUID(),
      habit_id: habitId,
      user_id: userId,
      name,
      image_path: imagePath,
      position: siblings.reduce((max, s) => Math.max(max, s.position), -1) + 1,
      created_at: now(),
      updated_at: now(),
    };
    db.subtasks.push(subtask);
    write(db);
    return subtask;
  },

  async renameSubtask(id, name) {
    const userId = currentUserId();
    const db = read();
    const subtask = db.subtasks.find((s) => s.id === id && s.user_id === userId);
    if (!subtask) throw new StoreError("That subtask no longer exists.");
    subtask.name = name;
    subtask.updated_at = now();
    write(db);
  },

  async setSubtaskImage(id, path) {
    const userId = currentUserId();
    const db = read();
    const subtask = db.subtasks.find((s) => s.id === id && s.user_id === userId);
    if (!subtask) throw new StoreError("That subtask no longer exists.");
    subtask.image_path = path;
    subtask.updated_at = now();
    write(db);
  },

  async deleteSubtask(id) {
    const userId = currentUserId();
    const db = read();
    db.subtasks = db.subtasks.filter((s) => !(s.id === id && s.user_id === userId));
    write(db);
  },

  async reorderHabits(orderedIds) {
    const userId = currentUserId();
    const db = read();
    orderedIds.forEach((id, index) => {
      const habit = db.habits.find((h) => h.id === id && h.user_id === userId);
      if (habit) habit.position = index;
    });
    write(db);
  },

  async listEntries(from: ISODate, to: ISODate) {
    const userId = currentUserId();
    return read()
      .entries.filter((e) => e.user_id === userId && e.date >= from && e.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async listAllEntries() {
    const userId = currentUserId();
    return read()
      .entries.filter((e) => e.user_id === userId)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async upsertEntry(draft: EntryDraft) {
    const userId = currentUserId();
    const db = read();
    if (!db.habits.some((h) => h.id === draft.habit_id && h.user_id === userId)) {
      throw new StoreError("That habit no longer exists.");
    }
    const existing = db.entries.find(
      (e) => e.user_id === userId && e.habit_id === draft.habit_id && e.date === draft.date,
    );
    const entry: HabitEntry = existing
      ? Object.assign(existing, draft, { updated_at: now() })
      : {
          id: crypto.randomUUID(),
          user_id: userId,
          created_at: now(),
          updated_at: now(),
          ...draft,
        };
    if (!existing) db.entries.push(entry);
    write(db);
    return entry;
  },

  async deleteEntry(habitId, date) {
    const userId = currentUserId();
    const db = read();
    db.entries = db.entries.filter(
      (e) => !(e.user_id === userId && e.habit_id === habitId && e.date === date),
    );
    write(db);
  },

  async uploadPhoto(file, habitId, date) {
    const userId = currentUserId();
    const path = `${userId}/${habitId}/${date}-${crypto.randomUUID()}`;
    const dataUrl = await readAsDataUrl(file);
    await photoTx("readwrite", (store) => store.put(dataUrl, path));
    return path;
  },

  async uploadIcon(file, kind) {
    const userId = currentUserId();
    const path = `${userId}/${kind}/${crypto.randomUUID()}`;
    const dataUrl = await readAsDataUrl(file);
    await photoTx("readwrite", (store) => store.put(dataUrl, path));
    return path;
  },

  async removePhoto(path) {
    await photoTx("readwrite", (store) => store.delete(path));
  },

  async photoUrl(path) {
    try {
      const value = await photoTx<string | undefined>("readonly", (store) => store.get(path));
      return value ?? null;
    } catch {
      return null;
    }
  },
};
