/**
 * Habit colours.
 *
 * A habit stores a plain hex string, so twelve presets are a starting point
 * rather than a ceiling — pick any hue off the wheel once those run out.
 *
 * The lighter tones a cell needs are NOT precomputed here. They're derived in
 * CSS with color-mix() against the current surface colour, so the same habit
 * colour reads correctly in every theme without recomputing anything.
 */

export type HabitColor = string;

export const DEFAULT_HABIT_COLOR = "#3B82F6";

/** Vibrant, high-energy presets that still hold up against text. */
export const COLOR_PRESETS: { hex: string; label: string }[] = [
  { hex: "#F43F5E", label: "Rose" },
  { hex: "#F97316", label: "Orange" },
  { hex: "#F59E0B", label: "Amber" },
  { hex: "#EAB308", label: "Yellow" },
  { hex: "#84CC16", label: "Lime" },
  { hex: "#22C55E", label: "Green" },
  { hex: "#14B8A6", label: "Teal" },
  { hex: "#06B6D4", label: "Cyan" },
  { hex: "#3B82F6", label: "Blue" },
  { hex: "#6366F1", label: "Indigo" },
  { hex: "#A855F7", label: "Purple" },
  { hex: "#EC4899", label: "Pink" },
];

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Always returns something paintable, whatever is in the database. */
export function habitColor(value: string | null | undefined): string {
  return isHexColor(value) ? value.toUpperCase() : DEFAULT_HABIT_COLOR;
}

// --- HSL <-> hex, for the custom picker ------------------------------------

export type HSL = { h: number; s: number; l: number };

export function hexToHsl(hex: string): HSL {
  const clean = habitColor(hex).slice(1);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex({ h, s, l }: HSL): string {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;

  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];

  const to255 = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

/**
 * Keeps a hand-picked colour in the range that still reads as a habit colour:
 * bright enough to carry energy, dark enough for a check mark to be visible.
 */
export const SAT_RANGE = { min: 45, max: 100 } as const;
export const LIGHT_RANGE = { min: 38, max: 66 } as const;

export function clampToUsable({ h, s, l }: HSL): HSL {
  return {
    h: ((Math.round(h) % 360) + 360) % 360,
    s: Math.min(SAT_RANGE.max, Math.max(SAT_RANGE.min, Math.round(s))),
    l: Math.min(LIGHT_RANGE.max, Math.max(LIGHT_RANGE.min, Math.round(l))),
  };
}

/** Give each new habit a different colour instead of a wall of one hue. */
export function nextColorForPosition(position: number): string {
  return COLOR_PRESETS[position % COLOR_PRESETS.length].hex;
}
