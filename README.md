# Habit Journal

A habit tracker that remembers what actually happened. Rows are habits, columns
are days, and any completion can carry a photo and a note.

## Habits, subtasks, and colour

A habit can hold **subtasks**. Each one is worth an equal share of that day, so
a Workout with `Warm up / Main lift / Stretch` sits at 67% once two are ticked.
A habit with no subtasks stays a single tick.

- The grid shows a part-finished day as `2/3` over a bar that fills from the
  bottom by the same fraction.
- The Consistency percentage gives **fractional credit** — half-done all month
  reads as 50%.
- **Streaks stay binary**: a day counts only when every subtask is done.
- Adding a subtask re-scores history against the habit as it exists now, so a
  previously complete day becomes partial. Deleting one does the reverse; ids
  left behind by a deleted subtask are ignored rather than stored forever.

Each habit also picks a **colour** from a curated palette of eight muted
swatches (`src/lib/colors.ts`). Habits store the palette key, not a hex value,
so the grid can't be filled with colours that fight the page background. The
colour carries through the grid, weekly view, journal cards, consistency bars,
and the entry drawer.

## Views

- **Grid** — the month, one row per habit. Sticky habit names, sticky dates.
  Two densities, toggled in the header and remembered between sessions:
  - **Compact** — one mark per day, the whole month at a glance.
  - **Detailed** — the same rows and columns, but each cell opens up to show the
    photo thumbnail and note attached to that day, so the grid doubles as the
    dashboard. Columns widen, so a month scrolls horizontally.
- **Journal** — chronological entries; written entries get a card, bare
  completions collapse to one line. Filterable by habit.
- **Weekly** — one week plus a visual review of that week's photos and notes.
- **Consistency** — completion percentage, current streak, best streak.

Clicking any cell opens the entry drawer: completion toggle, photo, notes, save,
delete. `Cmd/Ctrl + Enter` saves.

## Running it

```bash
npm install
npm run dev
```

Without Supabase credentials the app runs in **demo mode**: accounts and entries
live in `localStorage`, photos in IndexedDB. Everything works, but the data
never leaves the browser. The empty state offers "Load demo data" (development
builds only) to fill six habits and about five weeks of realistic entries.

## Connecting Supabase

1. Create a project at supabase.com.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor. It creates
   `profiles`, `habits`, and `habit_entries` with indexes, the
   `(user_id, habit_id, date)` unique constraint, row-level security on every
   table, and a private `habit-photos` storage bucket scoped to `auth.uid()`.
3. Add to `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

The app picks the backend at import time from those variables — no code change.

## Deploying

Push to GitHub, import into Vercel, add the two environment variables, deploy.
No secrets are committed; the anon key is public by design and every table is
protected by RLS.

## Layout

```
src/
  app/                     layout, globals, single entry point
  components/
    calendar/              CalendarGrid, CalendarHeader, HabitCell, MonthSelector
    entries/               EntryDialog, PhotoUploader, NotesEditor, EntryPhoto
    habits/                HabitManager, EmptyState
    journal/  weekly/  consistency/
    ui/                    Button, Modal, Toast, Skeleton, ViewSwitcher, icons
  lib/
    dates.ts               calendar-day helpers (ISO strings, never timestamps)
    stats.ts               completion percentage, current streak, best streak
    data/                  HabitStore interface + Supabase and browser-local impls
    hooks/useHabitData.ts  habits + entries, optimistic writes, in-memory lookup
    supabase/client.ts
supabase/migrations/       schema, indexes, RLS, storage policies
```

## Notes on dates

Entries are calendar days, not timestamps. Dates travel as `YYYY-MM-DD` strings
and `Date` objects are only ever built with the local `(y, m, d)` constructor —
`new Date("2026-08-23")` parses as UTC midnight and shifts a day in negative
offsets. Month lengths come from `new Date(year, month + 1, 0)`, so February and
leap years need no special casing.

## Data loading

One query for habits, one for entries, then an in-memory `entryMap[habitId][date]`
the grid renders from — no request per cell. Writes are optimistic and revert
with a toast if the backend rejects them.
