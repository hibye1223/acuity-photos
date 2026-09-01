-- Locked album: an optional PIN-gated view for photos the user marks
-- private. `lock_pin_hash` stores a salted hash only (never the raw PIN);
-- verification happens server-side in src/app/actions/locked-album.ts.
-- `is_locked` photos are excluded from the main gallery, the Album
-- Assistant's retrieval tools, and Memories resurfacing — they only ever
-- appear behind the PIN gate.
alter table public.profiles
  add column if not exists lock_pin_hash text;

alter table public.photos
  add column if not exists is_locked boolean not null default false;

create index if not exists photos_is_locked_idx
  on public.photos (user_id, is_locked);

grant update (is_locked) on public.photos to authenticated;

-- No new RLS policy needed for photos: the existing "individuals can update
-- own photo tags" policy already permits UPDATE on rows where
-- auth.uid() = user_id, regardless of which granted columns are touched.

grant update (lock_pin_hash) on public.profiles to authenticated;

-- Muted people: names the user has asked to be excluded from Memories
-- resurfacing (never from explicit Album Assistant searches, which already
-- only include a named person when the user asks for them by name).
alter table public.profiles
  add column if not exists muted_people text[] not null default '{}';

grant update (muted_people) on public.profiles to authenticated;
