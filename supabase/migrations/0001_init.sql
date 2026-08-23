-- Habit Journal — schema, indexes, RLS, storage.

create extension if not exists "pgcrypto";

-- profiles ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- create a profile row automatically for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- shared updated_at trigger --------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- habits ---------------------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_position_idx
  on public.habits (user_id, position);

drop trigger if exists habits_touch_updated_at on public.habits;
create trigger habits_touch_updated_at
  before update on public.habits
  for each row execute function public.touch_updated_at();

alter table public.habits enable row level security;

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits
  for select using (auth.uid() = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits
  for insert with check (auth.uid() = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits
  for delete using (auth.uid() = user_id);

-- habit_entries ---------------------------------------------------------------
create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  completed boolean not null default false,
  note text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_entries_unique_per_day unique (user_id, habit_id, date)
);

create index if not exists habit_entries_user_date_idx
  on public.habit_entries (user_id, date);
create index if not exists habit_entries_habit_date_idx
  on public.habit_entries (habit_id, date);

drop trigger if exists habit_entries_touch_updated_at on public.habit_entries;
create trigger habit_entries_touch_updated_at
  before update on public.habit_entries
  for each row execute function public.touch_updated_at();

alter table public.habit_entries enable row level security;

drop policy if exists "entries_select_own" on public.habit_entries;
create policy "entries_select_own" on public.habit_entries
  for select using (auth.uid() = user_id);

drop policy if exists "entries_insert_own" on public.habit_entries;
create policy "entries_insert_own" on public.habit_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "entries_update_own" on public.habit_entries;
create policy "entries_update_own" on public.habit_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entries_delete_own" on public.habit_entries;
create policy "entries_delete_own" on public.habit_entries
  for delete using (auth.uid() = user_id);

-- storage ---------------------------------------------------------------------
-- Private bucket; photos live under <user_id>/<habit_id>/<date>-<rand>.<ext>
insert into storage.buckets (id, name, public)
values ('habit-photos', 'habit-photos', false)
on conflict (id) do nothing;

drop policy if exists "habit_photos_select_own" on storage.objects;
create policy "habit_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'habit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "habit_photos_insert_own" on storage.objects;
create policy "habit_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'habit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "habit_photos_update_own" on storage.objects;
create policy "habit_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'habit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "habit_photos_delete_own" on storage.objects;
create policy "habit_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'habit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
