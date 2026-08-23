"use client";

import { useEffect, useState } from "react";
import {
  COLOR_PRESETS,
  LIGHT_RANGE,
  SAT_RANGE,
  clampToUsable,
  habitColor,
  hexToHsl,
  hslToHex,
} from "@/lib/colors";

/**
 * Twelve presets for speed, plus a hue/saturation/lightness wheel for anything
 * else — twelve habits shouldn't be a ceiling. Saturation and lightness are
 * clamped to the band where a colour still reads as a habit colour: bright
 * enough to carry, dark enough for a white check mark to survive on it.
 */
export function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  const current = habitColor(value);
  const [custom, setCustom] = useState(
    () => !COLOR_PRESETS.some((p) => p.hex.toUpperCase() === current),
  );
  const [hsl, setHsl] = useState(() => clampToUsable(hexToHsl(current)));

  // Follow along when the colour changes from outside (e.g. a preset click).
  useEffect(() => {
    setHsl(clampToUsable(hexToHsl(current)));
  }, [current]);

  const update = (next: Partial<{ h: number; s: number; l: number }>) => {
    const merged = clampToUsable({ ...hsl, ...next });
    setHsl(merged);
    onChange(hslToHex(merged));
  };

  const hueTrack =
    "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, " +
    "#0000ff 67%, #ff00ff 83%, #ff0000 100%)";
  const satTrack = `linear-gradient(to right, ${hslToHex({ ...hsl, s: SAT_RANGE.min })}, ${hslToHex({ ...hsl, s: SAT_RANGE.max })})`;
  const lightTrack = `linear-gradient(to right, ${hslToHex({ ...hsl, l: LIGHT_RANGE.min })}, ${hslToHex({ ...hsl, l: LIGHT_RANGE.max })})`;

  return (
    <div className="space-y-2.5">
      <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
        {COLOR_PRESETS.map((preset) => {
          const active = preset.hex.toUpperCase() === current;
          return (
            <button
              key={preset.hex}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={preset.label}
              title={preset.label}
              onClick={() => {
                setCustom(false);
                onChange(preset.hex);
              }}
              className="h-6 w-6 rounded-full transition-transform duration-150 hover:scale-115"
              style={{
                backgroundColor: preset.hex,
                boxShadow: active
                  ? `0 0 0 2px var(--color-surface), 0 0 0 3.5px ${preset.hex}`
                  : "none",
              }}
            />
          );
        })}

        <button
          type="button"
          aria-pressed={custom}
          onClick={() => setCustom((v) => !v)}
          title="Custom colour"
          aria-label="Custom colour"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-line-strong text-[13px] font-semibold text-ink-soft transition-transform duration-150 hover:scale-115"
          style={{
            background:
              "conic-gradient(#f43f5e,#f59e0b,#84cc16,#14b8a6,#3b82f6,#a855f7,#f43f5e)",
          }}
        >
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface text-[10px]">
            +
          </span>
        </button>
      </div>

      {custom && (
        <div className="anim-fade space-y-2 rounded-sm border border-line bg-sunken/50 p-3">
          <div className="flex items-center gap-2.5">
            <span
              className="h-9 w-9 shrink-0 rounded-sm border border-line"
              style={{ backgroundColor: current }}
              aria-hidden="true"
            />
            <div className="flex-1">
              <label
                htmlFor={`${label}-hex`}
                className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-muted"
              >
                Hex
              </label>
              <input
                id={`${label}-hex`}
                value={current}
                spellCheck={false}
                onChange={(event) => {
                  const next = event.target.value.trim();
                  if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next.toUpperCase());
                }}
                className="tabular w-full rounded-xs border border-line-strong bg-surface px-2 py-1 text-[14px] text-ink"
              />
            </div>
          </div>

          <Slider
            label="Hue"
            value={hsl.h}
            min={0}
            max={359}
            track={hueTrack}
            suffix="°"
            onChange={(h) => update({ h })}
          />
          <Slider
            label="Saturation"
            value={hsl.s}
            min={SAT_RANGE.min}
            max={SAT_RANGE.max}
            track={satTrack}
            suffix="%"
            onChange={(s) => update({ s })}
          />
          <Slider
            label="Lightness"
            value={hsl.l}
            min={LIGHT_RANGE.min}
            max={LIGHT_RANGE.max}
            track={lightTrack}
            suffix="%"
            onChange={(l) => update({ l })}
          />
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  track,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  track: string;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[12.5px] text-muted">
        {label}
        <span className="tabular">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-2.5 w-full cursor-pointer appearance-none rounded-full border border-line
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent
          [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.35)]
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
          [&::-moz-range-thumb]:bg-transparent"
        style={{ background: track }}
      />
    </label>
  );
}
