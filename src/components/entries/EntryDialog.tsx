"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { store, type EntryDraft, type Habit, type HabitEntry } from "@/lib/data";
import { formatLongDate, type ISODate } from "@/lib/dates";
import { NotesEditor } from "./NotesEditor";
import { PhotoUploader, validateImage } from "./PhotoUploader";

export type EntryTarget = { habit: Habit; date: ISODate };

/**
 * Mount one dialog per habit/day — the caller keys it on the target, so every
 * open starts from the saved entry rather than whatever the last open left behind.
 */
export function EntryDialog({
  target,
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  target: EntryTarget;
  entry: HabitEntry | undefined;
  onClose: () => void;
  onSave: (draft: EntryDraft) => Promise<boolean>;
  onDelete: (habitId: string, date: ISODate) => Promise<boolean>;
}) {
  const { notify } = useToast();
  const titleId = useId();
  const notesId = useId();

  // A brand-new entry opens pre-marked as completed: that is the common case
  // and makes the primary interaction click → Save.
  const [completed, setCompleted] = useState(entry?.completed ?? true);
  const [note, setNote] = useState(entry?.note ?? "");
  const [photoPath, setPhotoPath] = useState<string | null>(entry?.photo_path ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Objects uploaded during this session that aren't referenced by a saved
  // entry yet — cleaned up on close, or replaced on save.
  const orphans = useRef<string[]>([]);
  const savedPhotoPath = useRef<string | null>(entry?.photo_path ?? null);

  // Resolve the stored photo into a displayable URL.
  useEffect(() => {
    let cancelled = false;
    if (!photoPath) {
      setPreviewUrl(null);
      return;
    }
    void store.photoUrl(photoPath).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  const discardOrphans = useCallback(async () => {
    const paths = orphans.current;
    orphans.current = [];
    await Promise.all(paths.map((path) => store.removePhoto(path).catch(() => {})));
  }, []);

  const close = useCallback(() => {
    void discardOrphans();
    onClose();
  }, [discardOrphans, onClose]);

  const { habit, date } = target;

  const handleSelect = async (file: File) => {
    const problem = validateImage(file);
    if (problem) {
      notify(problem, "error");
      return;
    }
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const path = await store.uploadPhoto(file, habit.id, date);
      orphans.current.push(path);
      setPhotoPath(path);
    } catch (error) {
      setPreviewUrl(photoPath ? previewUrl : null);
      notify(error instanceof Error ? error.message : "Photo upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    if (photoPath && orphans.current.includes(photoPath)) {
      void store.removePhoto(photoPath).catch(() => {});
      orphans.current = orphans.current.filter((p) => p !== photoPath);
    }
    setPhotoPath(null);
    setPreviewUrl(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const trimmed = note.trim();
    const ok = await onSave({
      habit_id: habit.id,
      date,
      completed,
      note: trimmed ? trimmed : null,
      photo_path: photoPath,
    });
    setSaving(false);
    if (!ok) return;

    // The new photo is now referenced; drop whatever it replaced.
    orphans.current = orphans.current.filter((p) => p !== photoPath);
    const replaced = savedPhotoPath.current;
    if (replaced && replaced !== photoPath) orphans.current.push(replaced);
    await discardOrphans();

    notify("Entry saved.", "success");
    onClose();
  };

  const handleDelete = async () => {
    setSaving(true);
    const ok = await onDelete(habit.id, date);
    setSaving(false);
    if (!ok) return;
    await discardOrphans();
    notify("Entry deleted.");
    onClose();
  };

  const busy = saving || uploading;

  return (
    <Modal open onClose={close} labelledBy={titleId}>
      <div
        className="flex min-h-full flex-col"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !busy) {
            event.preventDefault();
            void handleSave();
          }
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
              {habit.name}
            </h2>
            <p className="text-[14px] text-muted">{formatLongDate(date)}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close entry"
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
          >
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-5 py-5">
          <button
            type="button"
            role="switch"
            aria-checked={completed}
            onClick={() => setCompleted((value) => !value)}
            className={`flex w-full items-center gap-3 rounded-sm border px-3.5 py-3 text-left transition-colors duration-150 ${
              completed
                ? "border-accent bg-accent-tint"
                : "border-line-strong bg-surface hover:bg-sunken"
            }`}
          >
            <span
              className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-xs border transition-colors duration-150 ${
                completed ? "border-accent bg-accent text-white" : "border-line-strong bg-surface"
              }`}
            >
              {completed && <CheckIcon className="anim-mark h-[15px] w-[15px]" />}
            </span>
            <span className="text-[15px] font-medium text-ink">
              {completed ? "Completed" : "Not completed"}
            </span>
          </button>

          <PhotoUploader
            previewUrl={previewUrl}
            uploading={uploading}
            onSelect={(file) => void handleSelect(file)}
            onRemove={handleRemovePhoto}
          />

          <NotesEditor id={notesId} value={note} onChange={setNote} />
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface px-5 py-3.5">
          <Button variant="primary" onClick={() => void handleSave()} disabled={busy}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Close
          </Button>
          {entry && (
            <Button
              variant="danger"
              className="ml-auto"
              onClick={() => void handleDelete()}
              disabled={busy}
            >
              Delete entry
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
