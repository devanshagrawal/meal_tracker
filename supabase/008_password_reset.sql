-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmubxdzdgjtpnvbxqvey/sql/new

alter table public.profiles
  add column if not exists recovery_email text;

-- Reset tokens are only ever touched by Edge Functions (service role),
-- which bypasses RLS — no policies means anon/authenticated clients get
-- zero access, which is exactly what we want for this table.
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_id_idx on public.password_reset_tokens (user_id);

alter table public.password_reset_tokens enable row level security;
