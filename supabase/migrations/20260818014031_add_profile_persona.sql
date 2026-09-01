-- What the user told us they're using Acuity Photos for, captured once via
-- a short onboarding survey (src/components/persona-survey.tsx). Used to
-- tailor the Pro upsell copy (same price, different pitch — see
-- src/lib/personas.ts) and to give the Album Assistant context on the
-- user's purpose. Null until the survey is answered or skipped.

alter table public.profiles
  add column if not exists persona text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_persona_check'
  ) then
    alter table public.profiles
      add constraint profiles_persona_check
      check (persona in ('family', 'professional', 'casual'));
  end if;
end $$;

-- profiles' existing "individuals can update own profile" policy already
-- covers this column — unlike plan/ai_requests_used, persona is just a
-- self-reported preference with no security implication, so no column
-- grant changes are needed.
