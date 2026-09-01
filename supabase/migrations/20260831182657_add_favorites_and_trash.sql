-- Adds favorites (starring photos) and a soft-delete trash, matching the
-- "favorite" and "recently deleted" features common across photo-app
-- competitors. Deleting a photo now sets deleted_at instead of removing the
-- row; a separate permanent-delete action (used from the trash page) does
-- the real removal.
alter table public.photos
  add column if not exists is_favorite boolean not null default false,
  add column if not exists deleted_at timestamptz;

create index if not exists photos_user_favorite_idx
  on public.photos (user_id, is_favorite)
  where is_favorite;

create index if not exists photos_user_deleted_idx
  on public.photos (user_id, deleted_at);

grant update (is_favorite, deleted_at) on public.photos to authenticated;

-- Basic editing (rotate/flip/brightness/contrast/saturation/crop) saves the
-- edited image as a new Storage object and repoints the existing row at it,
-- rather than overwriting in place, so no Storage UPDATE policy is needed.
grant update (storage_path, content_type, size_bytes) on public.photos
  to authenticated;
