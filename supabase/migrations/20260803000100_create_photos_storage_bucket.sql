-- Private `photos` Storage bucket, one folder per user: photos/{user_id}/...
-- RLS on storage.objects restricts every operation to a user's own folder.
-- (storage.objects already has RLS enabled by default on Supabase, so we
-- only add policies here, not `alter table ... enable row level security`.)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "individuals can upload to own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "individuals can view own folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "individuals can delete own folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No update policy: uploads never overwrite existing objects (`x-upsert:
-- false`), so there is nothing for a user to update in place.
