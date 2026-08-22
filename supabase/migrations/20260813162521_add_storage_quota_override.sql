-- Lets an admin override a specific user's storage quota. Null means "use
-- the app-wide default" (MAX_STORAGE_BYTES in src/lib/storage-quota.ts).
-- No new RLS policy is needed: admin writes go through the service-role
-- client (see src/app/actions/admin.ts), which bypasses RLS entirely.

alter table public.profiles
  add column if not exists storage_quota_bytes bigint;
