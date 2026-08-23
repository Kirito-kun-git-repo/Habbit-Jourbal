"use client";

import { useRef, useState } from "react";
import { EntryPhoto } from "@/components/entries/EntryPhoto";
import { validateImage } from "@/components/entries/PhotoUploader";
import { CloseIcon, ImageIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { store } from "@/lib/data";

/**
 * The little square that stands in for a habit or subtask. Uploads immediately
 * and hands back the storage path — the caller decides where to save it, which
 * lets the new-habit form pick an image before the habit exists.
 */
export function ImagePicker({
  path,
  kind,
  label,
  color,
  size = 34,
  onChange,
}: {
  path: string | null;
  kind: "habits" | "subtasks";
  label: string;
  color?: string;
  size?: number;
  onChange: (path: string | null) => void;
}) {
  const { notify } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const select = async (file: File) => {
    const problem = validateImage(file);
    if (problem) {
      notify(problem, "error");
      return;
    }
    setBusy(true);
    try {
      const uploaded = await store.uploadIcon(file, kind);
      // Drop whatever it replaced so the bucket doesn't fill with orphans.
      if (path) await store.removePhoto(path).catch(() => {});
      onChange(uploaded);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Image upload failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const clear = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const previous = path;
    onChange(null);
    if (previous) await store.removePhoto(previous).catch(() => {});
  };

  const box = { width: size, height: size };

  return (
    <div className="relative shrink-0" style={box}>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`Image for ${label}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void select(file);
        }}
      />

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        title={path ? `Change image for ${label}` : `Add an image for ${label}`}
        aria-label={path ? `Change image for ${label}` : `Add an image for ${label}`}
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm border transition-colors duration-150 disabled:opacity-50"
        style={{
          ...box,
          borderColor: color ?? "var(--color-line-strong)",
          backgroundColor: path ? "var(--color-sunken)" : "transparent",
        }}
      >
        {busy ? (
          <span className="skeleton h-full w-full" />
        ) : path ? (
          <EntryPhoto path={path} alt="" className="h-full w-full" />
        ) : (
          <ImageIcon className="h-[16px] w-[16px] text-muted" />
        )}
      </button>

      {path && !busy && (
        <button
          type="button"
          onClick={(event) => void clear(event)}
          aria-label={`Remove image for ${label}`}
          title="Remove image"
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors duration-150 hover:text-danger"
        >
          <CloseIcon className="h-[10px] w-[10px]" />
        </button>
      )}
    </div>
  );
}
