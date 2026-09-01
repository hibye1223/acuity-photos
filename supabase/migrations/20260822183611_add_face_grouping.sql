-- Opt-in face grouping: lets the tagging model note a short, non-identifying
-- description of the most prominent person in a photo (hair, clothing,
-- glasses — not an identity), so the app can suggest "these look like the
-- same person" groupings for the user to confirm and name themselves.
-- `people` (20260814165649_add_photo_location_and_people.sql) stays a
-- human-confirmed label, never auto-assigned — this only adds a suggestion
-- layer in front of it. Off by default given the sensitivity of face data.

alter table public.profiles
  add column if not exists face_grouping_enabled boolean not null default false;

alter table public.photos
  add column if not exists person_description text;

-- No new RLS policy needed: the existing "individuals can update own photo
-- tags" policy already permits UPDATE on rows where auth.uid() = user_id,
-- regardless of which granted columns the statement touches.
grant update (person_description) on public.photos to authenticated;
