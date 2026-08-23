"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { store, type EntryDraft, type Habit, type HabitEntry, type Subtask } from "@/lib/data";
import { habitColor } from "@/lib/colors";
import { formatLongDate, type ISODate } from "@/lib/dates";
import { derivedCompleted } from "@/lib/progress";
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
  subtasks,
  onClose,
  onSave,
  onDelete,
}: {
  target: EntryTarget;
  entry: HabitEntry | undefined;
  subtasks: Subtask[];
  onClose: () => void;
  onSave: (draft: EntryDraft) => Promise<boolean>;
  onDelete: (habitId: string, date: ISODate) => Promise<boolean>;
}) {
  const { notify } = useToast();
  const titleId = useId();
  const notesId = useId();

  // A brand-new entry opens pre-marked as completed: that is the common case
  // and makes the primary interaction click → Save.
  const [completed, setCompleted] = useState(entry?.completed ?? subtasks.length === 0);
  const [doneSubtasks, setDoneSubtasks] = useState<string[]>(() => {
    const live = new Set(subtasks.map((s) => s.id));
    return (entry?.completed_subtasks ?? []).filter((id) => live.has(id));
  });
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
  const color = habitColor(habit.color);
  const hasSubtasks = subtasks.length > 0;
  const doneCount = doneSubtasks.length;
  const allDone = hasSubtasks && doneCount === subtasks.length;
  const percent = hasSubtasks ? Math.round((doneCount / subtasks.length) * 100) : 0;

  const toggleSubtask = (id: string) =>
    setDoneSubtasks((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    );

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
      completed: derivedCompleted(doneSubtasks, subtasks, completed),
      completed_subtasks: doneSubtasks,
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
            <h2
              id={titleId}
              className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.015em] text-ink"
            >
              <span
                className="h-[10px] w-[10px] shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
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
          {hasSubtasks ? (
            <section className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Subtasks
                </h3>
                <p className="tabular text-[13.5px] text-muted">
                  <span className="font-semibold" style={{ color: color }}>
                    {doneCount}/{subtasks.length}
                  </span>{" "}
                  · {percent}%
                </p>
              </div>

              <div
                className="h-1 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 28%, var(--color-surface))` }}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Subtasks completed"
              >
                <div
                  className="h-full rounded-full transition-[width] duration-200"
                  style={{ width: `${percent}%`, backgroundColor: color }}
                />
              </div>

              <ul className="divide-y divide-line rounded-sm border border-line-strong">
                {subtasks.map((subtask) => {
                  const done = doneSubtasks.includes(subtask.id);
                  return (
                    <li key={subtask.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={done}
                        onClick={() => toggleSubtask(subtask.id)}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150"
                        style={done ? { backgroundColor: `color-mix(in srgb, ${color} 12%, var(--color-surface))` } : undefined}
                      >
                        <span
                          className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-xs border transition-colors duration-150"
                          style={
                            done
                              ? { borderColor: color, backgroundColor: color, color: "#fff" }
                              : { borderColor: "var(--color-line-strong)", backgroundColor: "#fff" }
                          }
                        >
                          {done && <CheckIcon className="anim-mark h-[14px] w-[14px]" />}
                        </span>
                        <span
                          className={`text-[15px] ${done ? "text-ink" : "text-ink-soft"}`}
                        >
                          {subtask.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="text-[13.5px] text-muted">
                {allDone
                  ? "All subtasks done — this day counts as complete."
                  : "Each subtask is worth an equal share of the day."}
              </p>
            </section>
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={completed}
              onClick={() => setCompleted((value) => !value)}
              className="flex w-full items-center gap-3 rounded-sm border px-3.5 py-3 text-left transition-colors duration-150"
              style={
                completed
                  ? { borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 12%, var(--color-surface))` }
                  : { borderColor: "var(--color-line-strong)", backgroundColor: "#fff" }
              }
            >
              <span
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-xs border transition-colors duration-150"
                style={
                  completed
                    ? { borderColor: color, backgroundColor: color, color: "#fff" }
                    : { borderColor: "var(--color-line-strong)", backgroundColor: "#fff" }
                }
              >
                {completed && <CheckIcon className="anim-mark h-[15px] w-[15px]" />}
              </span>
              <span className="text-[15px] font-medium text-ink">
                {completed ? "Completed" : "Not completed"}
              </span>
            </button>
          )}

          <PhotoUploader
            previewUrl={previewUrl}
            uploading={uploading}
            onSelect={(file) => void handleSelect(file)}
            onRemove={handleRemovePhoto}
          />

          <NotesEditor id={notesId} value={note} onChange={setNote} />
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface px-5 py-3.5">
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={busy}
            style={{ backgroundColor: color }}
          >
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
