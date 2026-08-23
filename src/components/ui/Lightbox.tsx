"use client";

import { useEffect } from "react";
import { EntryPhoto } from "@/components/entries/EntryPhoto";
import { CloseIcon } from "@/components/ui/icons";

/**
 * Full-screen look at one picture. `contain` on a dim backdrop, so whatever was
 * uploaded is shown whole rather than cropped to fit a box.
 */
export function Lightbox({
  path,
  caption,
  onClose,
}: {
  path: string | null;
  caption: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!path) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [path, onClose]);

  if (!path) return null;

  return (
    <div
      className="anim-fade fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[rgba(12,12,14,0.88)] p-4 sm:p-10"
      role="dialog"
      aria-modal="true"
      aria-label={caption}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] text-white transition-colors duration-150 hover:bg-[rgba(255,255,255,0.22)]"
      >
        <CloseIcon className="h-5 w-5" />
      </button>

      <EntryPhoto
        path={path}
        alt={caption}
        fit="contain"
        className="max-h-[82vh] w-auto max-w-full"
      />
      <p className="pt-3 text-center text-[14.5px] text-white/80">{caption}</p>
    </div>
  );
}
