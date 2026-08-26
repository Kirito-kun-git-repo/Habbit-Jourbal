"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon, CloseIcon, ImageIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import {
  store,
  type EntryDraft,
  type Habit,
  type HabitEntry,
  type Subtask,
  type SubtaskPhotos,
} from "@/lib/data";
import { HabitBadge } from "@/components/habits/HabitBadge";
import { EntryPhoto } from "@/components/entries/EntryPhoto";
import { Lightbox } from "@/components/ui/Lightbox";
import { habitColor } from "@/lib/colors";
import { formatLongDate, type ISODate } from "@/lib/dates";
import { derivedCompleted } from "@/lib/progress";
import { NotesEditor } from "./NotesEditor";
import { PhotoGallery, validateImage } from "./PhotoUploader";

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
  const [photos, setPhotos] = useState<string[]>(entry?.photo_paths ?? []);
  const [subtaskPhotos, setSubtaskPhotos] = useState<SubtaskPhotos>(() => {
    const live = new Set(subtasks.map((s) => s.id));
    return Object.fromEntries(
      Object.entries(entry?.subtask_photos ?? {}).filter(([id]) => live.has(id)),
    );
  });
  // How many day photos are in flight, and which subtask is mid-upload.
  const [uploading, setUploading] = useState(0);
  const [busySubtask, setBusySubtask] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState<{ path: string; caption: string } | null>(null);

  // Objects uploaded during this session that aren't referenced by a saved
  // entry yet — cleaned up on close, or kept and their predecessors dropped on save.
  const orphans = useRef<string[]>([]);
  const savedPaths = useRef<string[]>([
    ...(entry?.photo_paths ?? []),
    ...Object.values(entry?.subtask_photos ?? {}),
  ]);

  const discardOrphans = useCallback(async () => {
    const paths = orphans.current;
    orphans.current = [];
    await Promise.all(paths.map((path) => store.removePhoto(path).catch(() => {})));
  }, []);

  /** Drop a photo that was uploaded in this sitting and never saved. */
  const releaseIfUnsaved = useCallback((path: string | null | undefined) => {
    if (!path || !orphans.current.includes(path)) return;
    orphans.current = orphans.current.filter((p) => p !== path);
    void store.removePhoto(path).catch(() => {});
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

  /** Uploads happen straight away so the grid fills in as each file lands. */
  const upload = async (file: File): Promise<string | null> => {
    const problem = validateImage(file);
    if (problem) {
      notify(problem, "error");
      return null;
    }
    try {
      const path = await store.uploadPhoto(file, habit.id, date);
      orphans.current.push(path);
      return path;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Photo upload failed.", "error");
      return null;
    }
  };

  const handleSelect = async (files: File[]) => {
    setUploading((n) => n + files.length);
    await Promise.all(
      files.map(async (file) => {
        const path = await upload(file);
        if (path) setPhotos((current) => [...current, path]);
        setUploading((n) => n - 1);
      }),
    );
  };

  const handleRemovePhoto = (path: string) => {
    setPhotos((current) => current.filter((p) => p !== path));
    releaseIfUnsaved(path);
  };

  const handleSubtaskPhoto = async (subtaskId: string, file: File) => {
    setBusySubtask(subtaskId);
    const replaced = subtaskPhotos[subtaskId];
    const path = await upload(file);
    setBusySubtask(null);
    if (!path) return;
    setSubtaskPhotos((current) => ({ ...current, [subtaskId]: path }));
    releaseIfUnsaved(replaced);
  };

  const handleRemoveSubtaskPhoto = (subtaskId: string) => {
    const path = subtaskPhotos[subtaskId];
    setSubtaskPhotos((current) => {
      const next = { ...current };
      delete next[subtaskId];
      return next;
    });
    releaseIfUnsaved(path);
  };

  const handleSave = async () => {
    setSaving(true);
    const trimmed = note.trim();
    const live = new Set(subtasks.map((s) => s.id));
    const keptSubtaskPhotos = Object.fromEntries(
      Object.entries(subtaskPhotos).filter(([id]) => live.has(id)),
    );
    const ok = await onSave({
      habit_id: habit.id,
      date,
      completed: derivedCompleted(doneSubtasks, subtasks, completed),
      completed_subtasks: doneSubtasks,
      note: trimmed ? trimmed : null,
      photo_paths: photos,
      subtask_photos: keptSubtaskPhotos,
    });
    setSaving(false);
    if (!ok) return;

    // Whatever the saved entry now points at is no longer an orphan; whatever
    // it used to point at and no longer does becomes one.
    const referenced = new Set([...photos, ...Object.values(keptSubtaskPhotos)]);
    orphans.current = orphans.current.filter((p) => !referenced.has(p));
    for (const path of savedPaths.current) {
      if (!referenced.has(path)) orphans.current.push(path);
    }
    savedPaths.current = [...referenced];
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

  const busy = saving || uploading > 0 || busySubtask !== null;

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
              <HabitBadge
                imagePath={habit.image_path}
                color={color}
                size={44}
                label={habit.name}
                onClick={
                  habit.image_path
                    ? () => setZoom({ path: habit.image_path!, caption: habit.name })
                    : undefined
                }
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

              <ul className="space-y-2.5">
                {subtasks.map((subtask) => {
                  const done = doneSubtasks.includes(subtask.id);
                  return (
                    <li
                      key={subtask.id}
                      className="overflow-hidden rounded-sm border transition-colors duration-150"
                      style={{
                        borderColor: done ? color : "var(--color-line-strong)",
                        backgroundColor: done
                          ? `color-mix(in srgb, ${color} 10%, var(--color-surface))`
                          : "var(--color-surface)",
                      }}
                    >
                      {subtask.image_path && (
                        <button
                          type="button"
                          onClick={() =>
                            setZoom({ path: subtask.image_path!, caption: subtask.name })
                          }
                          title={`View ${subtask.name} full size`}
                          aria-label={`View the image for ${subtask.name} full size`}
                          className="flex w-full cursor-zoom-in items-center justify-center bg-sunken p-1"
                        >
                          {/* No fixed aspect box: the picture keeps its own shape,
                              so a 9:16 portrait isn't letterboxed into a 4:3 slot.
                              Capped by height so a tall one can't run off. */}
                          <EntryPhoto
                            path={subtask.image_path}
                            alt={subtask.name}
                            fit="contain"
                            className="max-h-[360px] w-auto max-w-full"
                          />
                        </button>
                      )}

                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={done}
                        onClick={() => toggleSubtask(subtask.id)}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                      >
                        <span
                          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-xs border transition-colors duration-150"
                          style={
                            done
                              ? { borderColor: color, backgroundColor: color, color: "#fff" }
                              : {
                                  borderColor: "var(--color-line-strong)",
                                  backgroundColor: "var(--color-surface)",
                                }
                          }
                        >
                          {done && <CheckIcon className="anim-mark h-[15px] w-[15px]" />}
                        </span>
                        <span className={`text-[15px] ${done ? "text-ink" : "text-ink-soft"}`}>
                          {subtask.name}
                        </span>
                      </button>

                      <SubtaskDayPhoto
                        subtask={subtask}
                        date={date}
                        path={subtaskPhotos[subtask.id] ?? null}
                        busy={busySubtask === subtask.id}
                        onSelect={(file) => void handleSubtaskPhoto(subtask.id, file)}
                        onRemove={() => handleRemoveSubtaskPhoto(subtask.id)}
                        onZoom={(path) =>
                          setZoom({ path, caption: `${subtask.name} · ${formatLongDate(date)}` })
                        }
                      />
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

          <PhotoGallery
            paths={photos}
            uploading={uploading}
            onSelect={(files) => void handleSelect(files)}
            onRemove={handleRemovePhoto}
            onZoom={(path) => setZoom({ path, caption: `${habit.name} · ${formatLongDate(date)}` })}
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
      <Lightbox
        path={zoom?.path ?? null}
        caption={zoom?.caption ?? ""}
        onClose={() => setZoom(null)}
      />
    </Modal>
  );
}

/**
 * One photo per subtask, for this day — distinct from the subtask's standing
 * picture above, which is part of its definition and the same every day.
 */
function SubtaskDayPhoto({
  subtask,
  date,
  path,
  busy,
  onSelect,
  onRemove,
  onZoom,
}: {
  subtask: Subtask;
  date: ISODate;
  path: string | null;
  busy: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onZoom: (path: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t border-line px-3.5 py-2.5">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`Photo of ${subtask.name} for ${formatLongDate(date)}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onSelect(file);
        }}
      />

      {busy ? (
        <div className="skeleton h-24 w-full rounded-xs" aria-hidden="true" />
      ) : path ? (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onZoom(path)}
            title="View full size"
            aria-label={`View today's photo of ${subtask.name} full size`}
            className="flex w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xs border border-line bg-sunken p-1"
          >
            <EntryPhoto
              path={path}
              alt={`${subtask.name} on ${formatLongDate(date)}`}
              fit="contain"
              className="max-h-[220px] w-auto max-w-full"
            />
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => input.current?.click()}>
              Replace
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xs border border-dashed border-line-strong px-3 py-2 text-[13.5px] text-muted transition-colors duration-150 hover:border-accent hover:bg-accent-tint hover:text-accent-strong"
        >
          <ImageIcon className="h-[15px] w-[15px]" />
          Add a photo for today
        </button>
      )}
    </div>
  );
}
