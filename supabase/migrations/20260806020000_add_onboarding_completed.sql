-- Tracks whether a user has completed (or skipped) the first-run
-- onboarding tour, so it only shows once per account.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Existing accounts predate the tour; don't surface it retroactively.
update public.profiles
set onboarding_completed = true
where onboarding_completed = false;
