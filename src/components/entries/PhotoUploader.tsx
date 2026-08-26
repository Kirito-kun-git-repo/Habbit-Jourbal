"use client";

import { useRef } from "react";
import { EntryPhoto } from "@/components/entries/EntryPhoto";
import { CloseIcon, ImageIcon } from "@/components/ui/icons";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Returns an error message, or null when the file is acceptable. */
export function validateImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "That file isn't an image. Choose a JPG, PNG, or WebP.";
  if (file.size > MAX_PHOTO_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`;
  }
  return null;
}

/**
 * Every photo attached to one day. Photos are uploaded as they are picked and
 * held by path, so the grid below is the saved order and removing one is a
 * local edit until the entry is saved.
 */
export function PhotoGallery({
  paths,
  uploading,
  onSelect,
  onRemove,
  onZoom,
}: {
  paths: string[];
  /** How many uploads are in flight — each gets a placeholder tile. */
  uploading: number;
  onSelect: (files: File[]) => void;
  onRemove: (path: string) => void;
  onZoom: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const count = paths.length;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">
          Photos
        </h3>
        {count > 0 && (
          <p className="tabular text-[13.5px] text-muted">
            {count} photo{count === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Choose photos"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onSelect(files);
        }}
      />

      {count > 0 || uploading > 0 ? (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {paths.map((path) => (
              <li key={path} className="relative">
                <button
                  type="button"
                  onClick={() => onZoom(path)}
                  title="View full size"
                  aria-label="View this photo full size"
                  className="block w-full cursor-zoom-in overflow-hidden rounded-sm border border-line bg-sunken"
                >
                  <EntryPhoto path={path} alt="Photo attached to this entry" className="h-32 w-full" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(path)}
                  aria-label="Remove this photo"
                  title="Remove photo"
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition-colors duration-150 hover:text-danger"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </li>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <li key={`pending-${i}`} className="skeleton h-32 rounded-sm" aria-hidden="true" />
            ))}
          </ul>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-line-strong bg-sunken/50 px-3 py-2.5 text-[14px] text-ink-soft transition-colors duration-150 hover:border-accent hover:bg-accent-tint hover:text-accent-strong"
          >
            <ImageIcon className="h-[16px] w-[16px]" />
            {uploading > 0 ? "Uploading…" : "Add more photos"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-line-strong bg-sunken/50 px-3 py-6 text-[14px] text-ink-soft transition-colors duration-150 hover:border-accent hover:bg-accent-tint hover:text-accent-strong"
        >
          <ImageIcon className="h-[18px] w-[18px]" />
          Upload photos
        </button>
      )}
    </section>
  );
}
