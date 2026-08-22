-- Adds an admin role to profiles and lets admins read across all users'
-- profiles, photos, and albums (needed for the admin dashboard). A single
-- helper function centralizes the "is this user an admin" check so RLS
-- policies avoid re-querying profiles in a way that could recurse.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create policy "admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

create policy "admins can view all photos"
  on public.photos
  for select
  to authenticated
  using (public.is_admin());

create policy "admins can view all albums"
  on public.albums
  for select
  to authenticated
  using (public.is_admin());

-- Bootstrap: grant admin to the initial operator account.
update public.profiles
set is_admin = true
where email = 'acuityphotoshelp@gmail.com';
