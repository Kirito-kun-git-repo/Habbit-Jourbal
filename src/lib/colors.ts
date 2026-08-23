/**
 * The habit palette.
 *
 * Habits pick a key, not a hex value. Every swatch is muted enough to sit on
 * the warm page background without shouting, and each carries the three tones
 * the grid needs: `base` for the mark, `soft` for a completed cell, `tint` for
 * hover and partial states.
 */

export type HabitColorKey =
  | "terracotta"
  | "ochre"
  | "moss"
  | "teal"
  | "indigo"
  | "plum"
  | "brick"
  | "graphite";

export type HabitColor = {
  key: HabitColorKey;
  label: string;
  base: string;
  soft: string;
  softHover: string;
  tint: string;
};

export const HABIT_COLORS: Record<HabitColorKey, HabitColor> = {
  terracotta: {
    key: "terracotta",
    label: "Terracotta",
    base: "#a2543a",
    soft: "#f3e3da",
    softHover: "#ecd6c9",
    tint: "#fbf2ec",
  },
  ochre: {
    key: "ochre",
    label: "Ochre",
    base: "#8b7026",
    soft: "#efe8d1",
    softHover: "#e6dbbc",
    tint: "#faf6ea",
  },
  moss: {
    key: "moss",
    label: "Moss",
    base: "#5b7a4d",
    soft: "#e3ecdd",
    softHover: "#d5e2cd",
    tint: "#f2f7ef",
  },
  teal: {
    key: "teal",
    label: "Teal",
    base: "#3d716e",
    soft: "#deebe9",
    softHover: "#cddfdd",
    tint: "#eff6f5",
  },
  indigo: {
    key: "indigo",
    label: "Indigo",
    base: "#4c5f8a",
    soft: "#e1e6f0",
    softHover: "#d0d8e7",
    tint: "#f0f2f7",
  },
  plum: {
    key: "plum",
    label: "Plum",
    base: "#7b4a6a",
    soft: "#eddfe7",
    softHover: "#e2cfda",
    tint: "#f8f0f4",
  },
  brick: {
    key: "brick",
    label: "Brick",
    base: "#93453f",
    soft: "#f0dedc",
    softHover: "#e6cdca",
    tint: "#f9efee",
  },
  graphite: {
    key: "graphite",
    label: "Graphite",
    base: "#57534d",
    soft: "#e6e4e0",
    softHover: "#dad7d1",
    tint: "#f3f2ef",
  },
};

export const HABIT_COLOR_KEYS = Object.keys(HABIT_COLORS) as HabitColorKey[];

export const DEFAULT_HABIT_COLOR: HabitColorKey = "terracotta";

export function habitColor(key: string | null | undefined): HabitColor {
  return HABIT_COLORS[(key ?? "") as HabitColorKey] ?? HABIT_COLORS[DEFAULT_HABIT_COLOR];
}

export function isHabitColorKey(value: unknown): value is HabitColorKey {
  return typeof value === "string" && value in HABIT_COLORS;
}

/** Give each new habit a different colour instead of a wall of terracotta. */
export function nextColorForPosition(position: number): HabitColorKey {
  return HABIT_COLOR_KEYS[position % HABIT_COLOR_KEYS.length];
}
