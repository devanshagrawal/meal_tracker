-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmubxdzdgjtpnvbxqvey/sql/new

-- Ensure usernames are unique (safe to re-run)
create unique index if not exists profiles_username_key on public.profiles (username);

-- Lock down the profiles table
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Anonymous visitors can't read the profiles table directly (RLS blocks it),
-- but login/signup need to resolve "username" -> the synthetic email Supabase
-- Auth uses internally, and check whether a username is already taken.
-- This function runs with elevated privileges but only ever returns a single
-- email string for an exact username match, so it doesn't leak anything else.
create or replace function public.get_email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select au.email
  from public.profiles p
  join auth.users au on au.id = p.id
  where p.username = p_username
  limit 1;
$$;

revoke all on function public.get_email_for_username(text) from public;
grant execute on function public.get_email_for_username(text) to anon, authenticated;
