-- Habit Journal — habit colours become free-form hex instead of palette keys,
-- so a user with more habits than swatches isn't stuck. Safe to re-run.

alter table public.habits drop constraint if exists habits_color_valid;

-- Carry the old palette keys over to their vibrant equivalents.
update public.habits set color = case color
  when 'terracotta' then '#F97316'
  when 'ochre'      then '#F59E0B'
  when 'moss'       then '#84CC16'
  when 'teal'       then '#14B8A6'
  when 'indigo'     then '#6366F1'
  when 'plum'       then '#A855F7'
  when 'brick'      then '#F43F5E'
  when 'graphite'   then '#64748B'
  else color
end
where color !~ '^#[0-9A-Fa-f]{6}$';

-- Anything unrecognised falls back rather than blocking the constraint below.
update public.habits set color = '#3B82F6' where color !~ '^#[0-9A-Fa-f]{6}$';

alter table public.habits alter column color set default '#3B82F6';

alter table public.habits drop constraint if exists habits_color_hex;
alter table public.habits add constraint habits_color_hex
  check (color ~* '^#[0-9a-f]{6}$');
