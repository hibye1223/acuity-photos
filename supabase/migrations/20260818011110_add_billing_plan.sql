-- Adds a simple subscription plan to profiles, plus a rolling monthly
-- counter for Album Assistant AI requests. Storage limits and AI-request
-- caps per plan live in src/lib/plans.ts; the existing storage_quota_bytes
-- admin override (20260813162521_add_storage_quota_override.sql) still
-- takes precedence over the plan-based storage limit when set.

alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists ai_requests_used integer not null default 0,
  add column if not exists ai_requests_period_start timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('free', 'pro'));
  end if;
end $$;

-- profiles' existing "individuals can update own profile" policy otherwise
-- lets a signed-in user write any column on their own row (see
-- 20260802000000_create_profiles.sql) — that's fine for things like
-- full_name, but plan/usage columns must only change through server code
-- using the service-role client (upgrade/downgrade actions, AI usage
-- accounting), never directly from the browser. Revoke column-level write
-- access from `authenticated` so RLS can't be bypassed by calling
-- supabase.from("profiles").update({ plan: "pro" }) straight from a client.
revoke update (plan, ai_requests_used, ai_requests_period_start)
  on public.profiles from authenticated;
