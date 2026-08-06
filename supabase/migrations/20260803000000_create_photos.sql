-- Photos uploaded by users, stored in the `photos` Storage bucket under
-- `{user_id}/...`. Foundation for the upload/gallery feature; AI album and
-- cleanup metadata will be added in later migrations.

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists photos_user_id_idx on public.photos (user_id);

alter table public.photos enable row level security;

create policy "individuals can view own photos"
  on public.photos
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "individuals can insert own photos"
  on public.photos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "individuals can delete own photos"
  on public.photos
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- No update policy: photo rows are immutable after upload for now.
