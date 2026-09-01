-- Tracks each photo's stored size so per-user storage quota can be
-- computed as a simple sum, rather than listing Storage objects (which
-- paginates and doesn't scope cleanly to "this user's usage").
--
-- Existing rows default to 0 since their actual size was never recorded;
-- they under-count usage until re-uploaded. Acceptable for now — there is
-- no bulk-relist-and-backfill step here.

alter table public.photos add column if not exists size_bytes bigint not null default 0;
