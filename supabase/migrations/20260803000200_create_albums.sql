-- Albums created via the AI Album Assistant (or, later, manually).
-- An album is a user-ordered, captioned selection of that user's own photos.
-- The AI never writes here directly: a draft is only persisted once the user
-- reviews and approves it through the album-save Server Action.

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists albums_user_id_idx on public.albums (user_id);

alter table public.albums enable row level security;

create policy "individuals can view own albums"
  on public.albums
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "individuals can insert own albums"
  on public.albums
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "individuals can update own albums"
  on public.albums
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "individuals can delete own albums"
  on public.albums
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Ordered photos within an album, with a per-album caption. `position` is the
-- user-approved display order (from the AI's proposed sequence, then edited).
create table if not exists public.album_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  photo_id uuid not null references public.photos (id) on delete cascade,
  position integer not null,
  caption text,
  unique (album_id, photo_id)
);

create index if not exists album_photos_album_id_idx
  on public.album_photos (album_id);

alter table public.album_photos enable row level security;

-- album_photos has no user_id column, so policies check ownership through
-- the parent album.

create policy "individuals can view own album photos"
  on public.album_photos
  for select
  to authenticated
  using (
    exists (
      select 1 from public.albums
      where albums.id = album_photos.album_id
        and albums.user_id = auth.uid()
    )
  );

create policy "individuals can insert own album photos"
  on public.album_photos
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.albums
      where albums.id = album_photos.album_id
        and albums.user_id = auth.uid()
    )
  );

create policy "individuals can delete own album photos"
  on public.album_photos
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.albums
      where albums.id = album_photos.album_id
        and albums.user_id = auth.uid()
    )
  );

-- No update policy: album photo rows are replaced wholesale on save rather
-- than edited in place.
