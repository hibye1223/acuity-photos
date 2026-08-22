-- AI-generated content tags for photos (e.g. "dog", "beach", "person"),
-- populated asynchronously after upload by a vision model call. This lets
-- the Album Assistant search by subject/content, not just by date.
--
-- Existing photo rows are otherwise immutable after upload (see
-- 20260803000000_create_photos.sql), so update access is scoped to just
-- the `tags` column via a column-level grant alongside the row-level policy.

alter table public.photos add column if not exists tags text[];

create index if not exists photos_tags_idx on public.photos using gin (tags);

grant update (tags) on public.photos to authenticated;

create policy "individuals can update own photo tags"
  on public.photos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
