-- User-level defaults for the Album Assistant: the caption style pre-selected
-- when the Create page loads, and a "challenge me" mode that nudges the
-- assistant to surprise the user with less obvious photo picks instead of
-- the safest match.
-- profiles already has an unrestricted "individuals can update own profile"
-- policy (20260802000000_create_profiles.sql), so no new RLS is needed.

alter table public.profiles
  add column if not exists default_caption_style text not null default 'minimal',
  add column if not exists challenge_me boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_default_caption_style_check'
  ) then
    alter table public.profiles
      add constraint profiles_default_caption_style_check
      check (default_caption_style in ('minimal', 'warm', 'playful', 'descriptive'));
  end if;
end $$;
