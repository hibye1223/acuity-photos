-- Temporary diagnostic: lets application code ask Postgres directly what
-- auth.uid() resolves to for the current request, to compare against the
-- user id returned by supabase.auth.getUser() — narrowing down a bug where
-- profile UPDATE/SELECT calls from Server Actions are matching zero rows
-- even though getUser() reports a valid, correct user. Safe to drop once
-- diagnosed: security invoker, returns only the caller's own uid, no data
-- exposure.
create or replace function public.debug_whoami()
returns uuid
language sql
security invoker
stable
as $$
  select auth.uid();
$$;

grant execute on function public.debug_whoami() to authenticated;
