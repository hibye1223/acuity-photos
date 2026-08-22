-- Lets an owner turn on a public, unauthenticated share link for an album.
-- share_token is only ever set when sharing is (or was) turned on; the
-- public share page looks albums up by token via the service-role client
-- (see src/lib/albums/public-share.ts), so no public RLS policy is needed
-- here — owner-only access via the existing policies is unaffected.

alter table public.albums
  add column if not exists share_token uuid unique,
  add column if not exists share_enabled boolean not null default false;

create index if not exists albums_share_token_idx
  on public.albums (share_token)
  where share_enabled;
