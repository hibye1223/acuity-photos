-- The locked album now gates on the user's actual account password
-- (verified directly against Supabase Auth) instead of a separate PIN, so
-- the PIN hash column is unused. The whoami diagnostic RPC
-- (20260828020514_add_debug_whoami_rpc.sql) served its purpose during
-- debugging and is no longer needed.
alter table public.profiles
  drop column if exists lock_pin_hash;

drop function if exists public.debug_whoami();
