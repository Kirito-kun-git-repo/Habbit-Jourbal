"use client";

import { useEffect, useState } from "react";
import { store } from "@/lib/data";

// Signed URLs are valid for an hour; resolving each path once per session keeps
// the journal from re-signing the same photo on every render.
const cache = new Map<string, Promise<string | null>>();

function resolve(path: string) {
  if (!cache.has(path)) cache.set(path, store.photoUrl(path));
  return cache.get(path)!;
}

export function EntryPhoto({
  path,
  alt,
  className = "",
  fit = "cover",
}: {
  path: string;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    void resolve(path).then((value) => {
      if (cancelled) return;
      if (value) setUrl(value);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-sunken text-[13px] text-muted ${className}`}
      >
        Photo unavailable
      </div>
    );
  }

  if (!url) return <div className={`skeleton ${className}`} aria-hidden="true" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${fit === "cover" ? "object-cover" : "object-contain"} ${className}`}
    />
  );
}
