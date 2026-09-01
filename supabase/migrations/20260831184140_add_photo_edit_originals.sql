-- Preserves the pristine, pre-edit copy of a photo so edits can be
-- reverted. On a photo's first edit, its current storage object/metadata
-- are snapshotted here and never touched again; "revert" just points
-- storage_path/content_type/size_bytes back at this snapshot.
alter table public.photos
  add column if not exists original_storage_path text,
  add column if not exists original_content_type text,
  add column if not exists original_size_bytes bigint;

grant update (
  original_storage_path,
  original_content_type,
  original_size_bytes
) on public.photos to authenticated;
