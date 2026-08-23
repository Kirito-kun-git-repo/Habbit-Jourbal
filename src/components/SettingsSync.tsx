"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/store/settings";

/**
 * Mirrors the persisted theme and typeface onto <html>. The inline script in
 * the layout sets these before first paint; this keeps them in step afterwards.
 */
export function SettingsSync() {
  const theme = useSettings((s) => s.theme);
  const font = useSettings((s) => s.font);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.font = font;
  }, [font]);

  return null;
}
