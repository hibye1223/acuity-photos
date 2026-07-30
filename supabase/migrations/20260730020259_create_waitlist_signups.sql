-- Waitlist signups from the landing page, with an optional one-question
-- feedback response collected while the product is still being built.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  feedback text,
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

create policy "anon can join waitlist"
  on public.waitlist_signups
  for insert
  to anon
  with check (true);

create policy "authenticated can join waitlist"
  on public.waitlist_signups
  for insert
  to authenticated
  with check (true);
