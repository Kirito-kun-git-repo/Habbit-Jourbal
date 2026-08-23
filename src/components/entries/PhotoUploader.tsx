"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ImageIcon } from "@/components/ui/icons";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Returns an error message, or null when the file is acceptable. */
export function validateImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "That file isn't an image. Choose a JPG, PNG, or WebP.";
  if (file.size > MAX_PHOTO_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`;
  }
  return null;
}

export function PhotoUploader({
  previewUrl,
  uploading,
  onSelect,
  onRemove,
}: {
  previewUrl: string | null;
  uploading: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">Photo</h3>
        {previewUrl && !uploading && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Choose a photo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onSelect(file);
        }}
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-sm border border-line bg-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Photo attached to this entry"
            className="max-h-64 w-full object-contain"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(250,248,244,0.75)] text-[13.5px] text-ink-soft">
              Uploading…
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-line-strong bg-sunken/50 px-3 py-6 text-[14px] text-ink-soft transition-colors duration-150 hover:border-accent hover:bg-accent-tint hover:text-accent-strong disabled:opacity-50"
        >
          <ImageIcon className="h-[18px] w-[18px]" />
          {uploading ? "Uploading…" : "Upload photo"}
        </button>
      )}
    </section>
  );
}
