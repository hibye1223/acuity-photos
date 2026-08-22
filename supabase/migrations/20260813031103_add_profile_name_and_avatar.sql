-- Adds display name and avatar to profiles, plus a public "avatars"
-- Storage bucket (one file per user, upserted in place — unlike `photos`,
-- an avatar is meant to be replaced, not accumulated).

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;

-- profiles already has an unrestricted "individuals can update own profile"
-- policy (20260802000000_create_profiles.sql), so no new RLS is needed for
-- these columns.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "individuals can upload own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "individuals can replace own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "individuals can delete own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No select policy: the bucket is public, so files are served directly via
-- the public object URL without going through storage.objects RLS.
