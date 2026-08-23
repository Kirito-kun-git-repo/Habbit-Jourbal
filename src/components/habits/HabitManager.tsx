"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import type { Habit, Subtask } from "@/lib/data";
import { habitColor, nextColorForPosition } from "@/lib/colors";
import { ColorPicker } from "./ColorPicker";
import { ImagePicker } from "./ImagePicker";

const inputClass =
  "w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-muted/70 transition-colors duration-150 focus:border-accent";

export function HabitManager({
  open,
  habits,
  subtasksByHabit,
  onClose,
  onAdd,
  onRename,
  onRecolor,
  onSetHabitImage,
  onDelete,
  onMove,
  onAddSubtask,
  onRenameSubtask,
  onSetSubtaskImage,
  onDeleteSubtask,
}: {
  open: boolean;
  habits: Habit[];
  subtasksByHabit: Record<string, Subtask[]>;
  onClose: () => void;
  onAdd: (name: string, color: string, imagePath: string | null) => void;
  onRename: (id: string, name: string) => void;
  onRecolor: (id: string, color: string) => void;
  onSetHabitImage: (id: string, path: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onAddSubtask: (habitId: string, name: string, imagePath: string | null) => void;
  onRenameSubtask: (id: string, name: string) => void;
  onSetSubtaskImage: (id: string, path: string | null) => void;
  onDeleteSubtask: (id: string) => void;
}) {
  const titleId = useId();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(nextColorForPosition(habits.length));
  const [newImage, setNewImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!open) return null;

  const submitNew = () => {
    const name = newName.trim();
    if (!name) return;
    onAdd(name, newColor, newImage);
    setNewName("");
    setNewImage(null);
    setNewColor(nextColorForPosition(habits.length + 1));
  };

  const commitRename = (id: string) => {
    const name = draftName.trim();
    if (name) onRename(id, name);
    setEditingId(null);
  };

  return (
    <Modal open onClose={onClose} labelledBy={titleId}>
      <div className="flex min-h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
              Manage habits
            </h2>
            <p className="text-[14px] text-muted">Every habit shows on every day.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close habit manager"
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
          >
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex-1 px-5 py-5">
          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              submitNew();
            }}
          >
            <div className="flex gap-2">
              <ImagePicker
                path={newImage}
                kind="habits"
                label="the new habit"
                color={newColor}
                size={38}
                onChange={setNewImage}
              />
              <input
                className={inputClass}
                value={newName}
                maxLength={80}
                placeholder="New habit, e.g. Read 20 pages"
                aria-label="New habit name"
                onChange={(event) => setNewName(event.target.value)}
              />
              <Button variant="primary" type="submit" disabled={!newName.trim()}>
                <PlusIcon className="h-[16px] w-[16px]" />
                Add
              </Button>
            </div>
            <ColorPicker
              value={newColor}
              onChange={setNewColor}
              label="Colour for the new habit"
            />
          </form>

          <ul className="mt-5 divide-y divide-line border-y border-line">
            {habits.map((habit, index) => {
              const color = habitColor(habit.color);
              const subtasks = subtasksByHabit[habit.id] ?? [];
              const expanded = expandedId === habit.id;

              return (
                <li key={habit.id} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <ImagePicker
                      path={habit.image_path}
                      kind="habits"
                      label={habit.name}
                      color={color}
                      size={30}
                      onChange={(path) => onSetHabitImage(habit.id, path)}
                    />

                    {editingId === habit.id ? (
                      <input
                        autoFocus
                        className={inputClass}
                        value={draftName}
                        maxLength={80}
                        aria-label={`Rename ${habit.name}`}
                        onChange={(event) => setDraftName(event.target.value)}
                        onBlur={() => commitRename(habit.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitRename(habit.id);
                          if (event.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex-1 truncate rounded-sm px-1 py-1 text-left text-[15px] text-ink transition-colors duration-150 hover:bg-sunken"
                        onClick={() => {
                          setEditingId(habit.id);
                          setDraftName(habit.name);
                        }}
                        aria-label={`Rename ${habit.name}`}
                      >
                        {habit.name}
                      </button>
                    )}

                    <div className="flex items-center">
                      <IconButton
                        label={`Move ${habit.name} up`}
                        disabled={index === 0}
                        onClick={() => onMove(habit.id, -1)}
                      >
                        <ArrowUpIcon className="h-[16px] w-[16px]" />
                      </IconButton>
                      <IconButton
                        label={`Move ${habit.name} down`}
                        disabled={index === habits.length - 1}
                        onClick={() => onMove(habit.id, 1)}
                      >
                        <ArrowDownIcon className="h-[16px] w-[16px]" />
                      </IconButton>
                      <IconButton
                        label={`Delete ${habit.name}`}
                        danger
                        onClick={() => setConfirmingId(habit.id)}
                      >
                        <TrashIcon className="h-[16px] w-[16px]" />
                      </IconButton>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : habit.id)}
                    className="mt-1 ml-5 text-[13.5px] text-muted underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline"
                  >
                    {subtasks.length === 0
                      ? "Colour and subtasks"
                      : `Colour · ${subtasks.length} subtask${subtasks.length === 1 ? "" : "s"}`}
                  </button>

                  {expanded && (
                    <div className="anim-fade mt-3 ml-5 space-y-4 border-l border-line pl-4">
                      <ColorPicker
                        value={habit.color}
                        onChange={(key) => onRecolor(habit.id, key)}
                        label={`Colour for ${habit.name}`}
                      />
                      <SubtaskEditor
                        habit={habit}
                        subtasks={subtasks}
                        color={color}
                        onAdd={onAddSubtask}
                        onRename={onRenameSubtask}
                        onSetImage={onSetSubtaskImage}
                        onDelete={onDeleteSubtask}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {habits.length === 0 && (
            <p className="mt-5 text-[14.5px] text-muted">
              No habits yet. Add your first one above.
            </p>
          )}

          {confirmingId && (
            <div className="anim-rise mt-5 rounded-sm border border-[#e8cfca] bg-[#fdf3f1] px-4 py-3.5">
              <p className="text-[14.5px] text-ink">
                Delete “{habits.find((h) => h.id === confirmingId)?.name}”? Its subtasks, entries,
                notes, and photos go with it.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-danger hover:bg-[#82302a]"
                  onClick={() => {
                    onDelete(confirmingId);
                    setConfirmingId(null);
                  }}
                >
                  Delete habit
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmingId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-line bg-surface px-5 py-3.5">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SubtaskEditor({
  habit,
  subtasks,
  color,
  onAdd,
  onRename,
  onSetImage,
  onDelete,
}: {
  habit: Habit;
  subtasks: Subtask[];
  color: string;
  onAdd: (habitId: string, name: string, imagePath: string | null) => void;
  onRename: (id: string, name: string) => void;
  onSetImage: (id: string, path: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commit = (id: string) => {
    const next = draft.trim();
    if (next) onRename(id, next);
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        Subtasks
      </p>

      {subtasks.length > 0 && (
        <ul className="space-y-1">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-1.5">
              <ImagePicker
                path={subtask.image_path}
                kind="subtasks"
                label={subtask.name}
                color={color}
                size={26}
                onChange={(path) => onSetImage(subtask.id, path)}
              />
              {editingId === subtask.id ? (
                <input
                  autoFocus
                  className={inputClass}
                  value={draft}
                  maxLength={80}
                  aria-label={`Rename ${subtask.name}`}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => commit(subtask.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commit(subtask.id);
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(subtask.id);
                    setDraft(subtask.name);
                  }}
                  aria-label={`Rename ${subtask.name}`}
                  className="flex-1 truncate rounded-sm px-1 py-1 text-left text-[14.5px] text-ink-soft transition-colors duration-150 hover:bg-sunken hover:text-ink"
                >
                  {subtask.name}
                </button>
              )}
              <IconButton label={`Delete ${subtask.name}`} danger onClick={() => onDelete(subtask.id)}>
                <TrashIcon className="h-[15px] w-[15px]" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          const next = name.trim();
          if (!next) return;
          onAdd(habit.id, next, image);
          setName("");
          setImage(null);
        }}
      >
        <ImagePicker
          path={image}
          kind="subtasks"
          label="the new subtask"
          color={color}
          size={30}
          onChange={setImage}
        />
        <input
          className={inputClass}
          value={name}
          maxLength={80}
          placeholder="Add a subtask"
          aria-label={`New subtask for ${habit.name}`}
          onChange={(event) => setName(event.target.value)}
        />
        <Button variant="secondary" size="sm" type="submit" disabled={!name.trim()}>
          Add
        </Button>
      </form>

      <p className="text-[13px] leading-relaxed text-muted">
        {subtasks.length === 0
          ? "With no subtasks, a day is a single tick."
          : `Each of the ${subtasks.length} counts for ${Math.round(100 / subtasks.length)}% of the day.`}
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors duration-150 disabled:opacity-30 ${
        danger
          ? "text-muted hover:bg-[#f7ebe8] hover:text-danger"
          : "text-muted hover:bg-sunken hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
