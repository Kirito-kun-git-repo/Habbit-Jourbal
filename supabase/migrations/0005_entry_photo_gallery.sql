-- Habit Journal — many photos per day, plus one photo per subtask per day.
-- Safe to re-run.

-- A day's photos ------------------------------------------------------------
-- Replaces the single photo_path. An array rather than a child table: the list
-- is short, it is always read with the entry, and the one-row-per-habit/day
-- shape stays intact.
alter table public.habit_entries
  add column if not exists photo_paths text[] not null default '{}';

-- One photo per subtask, for this day -----------------------------------------
-- Keyed by subtask id: { "<subtask uuid>": "<storage path>" }. Ids left behind
-- by a deleted subtask are ignored when the entry is read, the same way
-- completed_subtasks already handles them.
alter table public.habit_entries
  add column if not exists subtask_photos jsonb not null default '{}'::jsonb;

-- Carry the old single photo over.
update public.habit_entries
   set photo_paths = array[photo_path]
 where photo_path is not null
   and cardinality(photo_paths) = 0;

-- photo_path is left in place, backfilled and unused, so an older deploy
-- against the same database keeps working. Nothing writes it any more.
comment on column public.habit_entries.photo_path is
  'Legacy single photo; superseded by photo_paths. Read-only.';
