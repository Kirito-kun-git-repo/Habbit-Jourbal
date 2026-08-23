import type { HabitColorKey } from "@/lib/colors";
import { supabaseClient } from "@/lib/supabase/client";
import type { ISODate } from "@/lib/dates";
import {
  StoreError,
  type EntryDraft,
  type Habit,
  type HabitEntry,
  type HabitStore,
  type Subtask,
} from "./types";

const BUCKET = "habit-photos";

function fail(message: string, error: { message?: string } | null): never {
  throw new StoreError(error?.message ? `${message}: ${error.message}` : message);
}

async function requireUserId(): Promise<string> {
  const { data } = await supabaseClient().auth.getUser();
  if (!data.user) throw new StoreError("You are signed out. Sign in again to continue.");
  return data.user.id;
}

export const supabaseStore: HabitStore = {
  kind: "supabase",

  async getUser() {
    const { data } = await supabaseClient().auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  },

  async signIn(email, password) {
    const { data, error } = await supabaseClient().auth.signInWithPassword({ email, password });
    if (error || !data.user) fail("Could not sign in", error);
    return { id: data.user.id, email: data.user.email ?? null };
  },

  async signUp(email, password) {
    const { data, error } = await supabaseClient().auth.signUp({ email, password });
    if (error) fail("Could not create the account", error);
    // Null when the project requires email confirmation before a session exists.
    return data.user && data.session ? { id: data.user.id, email: data.user.email ?? null } : null;
  },

  async signOut() {
    const { error } = await supabaseClient().auth.signOut();
    if (error) fail("Could not sign out", error);
  },

  async listHabits() {
    const { data, error } = await supabaseClient()
      .from("habits")
      .select("*")
      .eq("is_active", true)
      .order("position", { ascending: true });
    if (error) fail("Could not load habits", error);
    return (data ?? []) as Habit[];
  },

  async createHabit(name, color: HabitColorKey) {
    const userId = await requireUserId();
    const existing = await this.listHabits();
    const position = existing.reduce((max, h) => Math.max(max, h.position), -1) + 1;
    const { data, error } = await supabaseClient()
      .from("habits")
      .insert({ user_id: userId, name, position, color })
      .select()
      .single();
    if (error || !data) fail("Could not add the habit", error);
    return data as Habit;
  },

  async renameHabit(id, name) {
    const { error } = await supabaseClient().from("habits").update({ name }).eq("id", id);
    if (error) fail("Could not rename the habit", error);
  },

  async recolorHabit(id, color: HabitColorKey) {
    const { error } = await supabaseClient().from("habits").update({ color }).eq("id", id);
    if (error) fail("Could not change the colour", error);
  },

  async listSubtasks() {
    const { data, error } = await supabaseClient()
      .from("habit_subtasks")
      .select("*")
      .order("position", { ascending: true });
    if (error) fail("Could not load subtasks", error);
    return (data ?? []) as Subtask[];
  },

  async createSubtask(habitId, name) {
    const userId = await requireUserId();
    const { data: siblings } = await supabaseClient()
      .from("habit_subtasks")
      .select("position")
      .eq("habit_id", habitId);
    const positions = ((siblings ?? []) as { position: number }[]).map((s) => s.position);
    const position = positions.reduce((max, n) => Math.max(max, n), -1) + 1;
    const { data, error } = await supabaseClient()
      .from("habit_subtasks")
      .insert({ habit_id: habitId, user_id: userId, name, position })
      .select()
      .single();
    if (error || !data) fail("Could not add the subtask", error);
    return data as Subtask;
  },

  async renameSubtask(id, name) {
    const { error } = await supabaseClient().from("habit_subtasks").update({ name }).eq("id", id);
    if (error) fail("Could not rename the subtask", error);
  },

  async deleteSubtask(id) {
    const { error } = await supabaseClient().from("habit_subtasks").delete().eq("id", id);
    if (error) fail("Could not delete the subtask", error);
  },

  async deleteHabit(id) {
    const { error } = await supabaseClient().from("habits").delete().eq("id", id);
    if (error) fail("Could not delete the habit", error);
  },

  async reorderHabits(orderedIds) {
    const client = supabaseClient();
    const results = await Promise.all(
      orderedIds.map((id, index) => client.from("habits").update({ position: index }).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) fail("Could not save the new order", failed.error);
  },

  async listEntries(from: ISODate, to: ISODate) {
    const { data, error } = await supabaseClient()
      .from("habit_entries")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });
    if (error) fail("Could not load entries", error);
    return (data ?? []) as HabitEntry[];
  },

  async listAllEntries() {
    const { data, error } = await supabaseClient()
      .from("habit_entries")
      .select("*")
      .order("date", { ascending: true });
    if (error) fail("Could not load entries", error);
    return (data ?? []) as HabitEntry[];
  },

  async upsertEntry(draft: EntryDraft) {
    const userId = await requireUserId();
    const { data, error } = await supabaseClient()
      .from("habit_entries")
      .upsert({ ...draft, user_id: userId }, { onConflict: "user_id,habit_id,date" })
      .select()
      .single();
    if (error || !data) fail("Could not save the entry", error);
    return data as HabitEntry;
  },

  async deleteEntry(habitId, date) {
    const { error } = await supabaseClient()
      .from("habit_entries")
      .delete()
      .eq("habit_id", habitId)
      .eq("date", date);
    if (error) fail("Could not delete the entry", error);
  },

  async uploadPhoto(file, habitId, date) {
    const userId = await requireUserId();
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${habitId}/${date}-${crypto.randomUUID()}.${ext || "jpg"}`;
    const { error } = await supabaseClient()
      .storage.from(BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) fail("Photo upload failed", error);
    return path;
  },

  async removePhoto(path) {
    const { error } = await supabaseClient().storage.from(BUCKET).remove([path]);
    if (error) fail("Could not remove the photo", error);
  },

  async photoUrl(path) {
    const { data, error } = await supabaseClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error || !data) return null;
    return data.signedUrl;
  },
};
