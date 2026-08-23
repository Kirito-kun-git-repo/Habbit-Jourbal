-- Habit Journal — an identifying image for each habit and each subtask.
-- These are definition-level pictures set when you create/edit a habit, not the
-- per-day photos on habit_entries. Safe to re-run.

alter table public.habits
  add column if not exists image_path text;

alter table public.habit_subtasks
  add column if not exists image_path text;

-- Both live in the existing private habit-photos bucket, under
--   <user_id>/habits/<uuid>.<ext>   and   <user_id>/subtasks/<uuid>.<ext>
-- so the storage policies already in place (first path segment = auth.uid())
-- cover them without change.
