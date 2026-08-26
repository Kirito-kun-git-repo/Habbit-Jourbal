import { isSupabaseConfigured } from "@/lib/supabase/client";
import { localStore } from "./localStore";
import { supabaseStore } from "./supabaseStore";
import type { HabitStore } from "./types";

/** Supabase when configured, browser-local otherwise. */
export const store: HabitStore = isSupabaseConfigured ? supabaseStore : localStore;

export const isDemoBackend = store.kind === "local";

export * from "./normalize";
export * from "./types";
