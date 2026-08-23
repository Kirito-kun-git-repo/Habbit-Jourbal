"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GridMode } from "@/components/calendar/HabitCell";

export const THEMES = ["light", "warm", "dark", "midnight"] as const;
export type ThemeKey = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeKey, string> = {
  light: "Light",
  warm: "Warm paper",
  dark: "Dark",
  midnight: "Midnight",
};

export const FONTS = ["inter", "montserrat", "poppins", "lexend", "courier"] as const;
export type FontKey = (typeof FONTS)[number];

export const FONT_LABELS: Record<FontKey, string> = {
  inter: "Inter",
  montserrat: "Montserrat",
  poppins: "Poppins",
  lexend: "Lexend",
  courier: "Courier Prime",
};

type SettingsState = {
  theme: ThemeKey;
  font: FontKey;
  gridMode: GridMode;
  /** Height of the day-total chart; dragged by its top edge. */
  chartHeight: number;
  setTheme: (theme: ThemeKey) => void;
  setFont: (font: FontKey) => void;
  setGridMode: (mode: GridMode) => void;
  setChartHeight: (height: number) => void;
};

/**
 * Theme, typeface, and grid density. Persisted so the app comes back looking
 * the way you left it; `data-theme` / `data-font` on <html> do the actual work
 * so a change is one attribute write rather than a re-render of the grid.
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "warm",
      font: "inter",
      gridMode: "compact",
      chartHeight: 172,
      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      setGridMode: (gridMode) => set({ gridMode }),
      setChartHeight: (chartHeight) => set({ chartHeight }),
    }),
    { name: "habit-journal/settings" },
  ),
);
