-- Minimal user profile, auto-created whenever a new Supabase Auth user signs up.
-- Kept intentionally small: just enough to reference a signed-in user from
-- future feature tables.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "individuals can view own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "individuals can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policies: rows are created only by the trigger below
-- (which runs as security definer, bypassing RLS) and removed only via the
-- `on delete cascade` when the underlying auth.users row is deleted.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
