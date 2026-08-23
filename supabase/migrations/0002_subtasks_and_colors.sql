-- Habit Journal — per-habit colours and subtasks.
-- Safe to re-run.

-- colour ---------------------------------------------------------------------
-- A key into the curated palette in src/lib/colors.ts, not a free-form hex, so
-- the grid can't be filled with colours that don't work on the page background.
alter table public.habits
  add column if not exists color text not null default 'terracotta';

alter table public.habits drop constraint if exists habits_color_valid;
alter table public.habits add constraint habits_color_valid
  check (color in ('terracotta','ochre','moss','teal','indigo','plum','brick','graphite'));

-- subtasks -------------------------------------------------------------------
create table if not exists public.habit_subtasks (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habit_subtasks_habit_position_idx
  on public.habit_subtasks (habit_id, position);

drop trigger if exists habit_subtasks_touch_updated_at on public.habit_subtasks;
create trigger habit_subtasks_touch_updated_at
  before update on public.habit_subtasks
  for each row execute function public.touch_updated_at();

alter table public.habit_subtasks enable row level security;

drop policy if exists "subtasks_select_own" on public.habit_subtasks;
create policy "subtasks_select_own" on public.habit_subtasks
  for select using (auth.uid() = user_id);

drop policy if exists "subtasks_insert_own" on public.habit_subtasks;
create policy "subtasks_insert_own" on public.habit_subtasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "subtasks_update_own" on public.habit_subtasks;
create policy "subtasks_update_own" on public.habit_subtasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "subtasks_delete_own" on public.habit_subtasks;
create policy "subtasks_delete_own" on public.habit_subtasks
  for delete using (auth.uid() = user_id);

-- which subtasks were done on a given day ------------------------------------
-- Held on the entry rather than in a join table: one row per habit/day already
-- exists, the list is tiny, and a deleted subtask's id is simply ignored when
-- progress is recomputed against the habit's current subtasks.
alter table public.habit_entries
  add column if not exists completed_subtasks uuid[] not null default '{}';
