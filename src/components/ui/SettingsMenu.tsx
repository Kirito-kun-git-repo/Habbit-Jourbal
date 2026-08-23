"use client";

import { useEffect, useRef, useState } from "react";
import {
  FONTS,
  FONT_LABELS,
  THEMES,
  THEME_LABELS,
  useSettings,
  type FontKey,
  type ThemeKey,
} from "@/lib/store/settings";

const THEME_SWATCH: Record<ThemeKey, string[]> = {
  light: ["#f7f8fa", "#3b82f6"],
  warm: ["#faf8f4", "#f97316"],
  dark: ["#1f2126", "#fb923c"],
  midnight: ["#151b23", "#38bdf8"],
};

const FONT_VAR: Record<FontKey, string> = {
  inter: "var(--font-inter)",
  montserrat: "var(--font-montserrat)",
  poppins: "var(--font-poppins)",
  lexend: "var(--font-lexend)",
  courier: "var(--font-courier)",
};

export function SettingsMenu() {
  const { theme, font, setTheme, setFont } = useSettings();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-2 rounded-sm border border-line-strong bg-surface px-2.5 text-[13.5px] font-medium text-ink transition-colors duration-150 hover:bg-sunken"
      >
        <span className="flex gap-[3px]" aria-hidden="true">
          {THEME_SWATCH[theme].map((c) => (
            <span key={c} className="h-3 w-3 rounded-full border border-line" style={{ background: c }} />
          ))}
        </span>
        Look
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Appearance"
          className="anim-rise absolute right-0 z-50 mt-1.5 w-60 rounded-md border border-line bg-surface p-3 shadow-[0_6px_24px_rgba(0,0,0,0.14)]"
        >
          <p className="pb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
            Theme
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {THEMES.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={theme === key}
                onClick={() => setTheme(key)}
                className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 text-[13.5px] transition-colors duration-150 ${
                  theme === key
                    ? "border-accent bg-accent-tint text-ink"
                    : "border-line-strong text-ink-soft hover:bg-sunken"
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-line"
                  style={{
                    background: `linear-gradient(135deg, ${THEME_SWATCH[key][0]} 50%, ${THEME_SWATCH[key][1]} 50%)`,
                  }}
                  aria-hidden="true"
                />
                {THEME_LABELS[key]}
              </button>
            ))}
          </div>

          <p className="pb-2 pt-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
            Typeface
          </p>
          <div className="space-y-1">
            {FONTS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={font === key}
                onClick={() => setFont(key)}
                style={{ fontFamily: FONT_VAR[key] }}
                className={`flex w-full items-center justify-between rounded-sm border px-2.5 py-1.5 text-[14px] transition-colors duration-150 ${
                  font === key
                    ? "border-accent bg-accent-tint text-ink"
                    : "border-transparent text-ink-soft hover:bg-sunken"
                }`}
              >
                {FONT_LABELS[key]}
                <span className="tabular text-[13px] text-muted">31</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
