-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmubxdzdgjtpnvbxqvey/sql/new

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Users manage their own tokens (register/unregister their own device).
drop policy if exists "own push tokens" on public.push_tokens;
create policy "own push tokens" on public.push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
