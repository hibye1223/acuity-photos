-- Location (a place name, either reverse-geocoded from EXIF GPS at upload
-- time or typed in manually) and people (names the uploader explicitly
-- typed in — never inferred from face data) for photos. Lets the Album
-- Assistant search by place or by named person, alongside date and content
-- tags. `location` is filled in asynchronously by best-effort geocoding
-- (see src/app/actions/photos.ts), so it needs the same column-level update
-- access as `tags` (20260813012731_add_photo_content_tags.sql).

alter table public.photos add column if not exists location text;
alter table public.photos add column if not exists people text[];

create index if not exists photos_people_idx on public.photos using gin (people);

grant update (location, people) on public.photos to authenticated;

create policy "individuals can update own photo location and people"
  on public.photos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
