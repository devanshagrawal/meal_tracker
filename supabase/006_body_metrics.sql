-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmubxdzdgjtpnvbxqvey/sql/new

alter table public.profiles
  add column if not exists target_weight numeric;

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,

  weight numeric,
  fat_percent numeric,
  waist numeric,
  chest numeric,
  hips numeric,
  arms numeric,
  thighs numeric,

  photo_front_path text,
  photo_side_path text,
  photo_back_path text,
  photos_version bigint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),

  unique (user_id, log_date)
);

alter table public.body_metrics enable row level security;

drop policy if exists "own body metrics" on public.body_metrics;
create policy "own body metrics" on public.body_metrics
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reuses the same updated_at/updated_by trigger function created for
-- day_logs in 003_day_logs.sql (it's generic, no day_logs-specific logic).
drop trigger if exists body_metrics_set_updated_meta on public.body_metrics;
create trigger body_metrics_set_updated_meta
  before insert or update on public.body_metrics
  for each row
  execute function public.set_day_logs_updated_meta();

insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', true)
on conflict (id) do nothing;

-- Path convention: {user_id}/{log_date}/{front|side|back}.jpg
drop policy if exists "Anyone can view body photos" on storage.objects;
create policy "Anyone can view body photos" on storage.objects
  for select
  to public
  using (bucket_id = 'body-photos');

drop policy if exists "Users can upload own body photos" on storage.objects;
create policy "Users can upload own body photos" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own body photos" on storage.objects;
create policy "Users can update own body photos" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own body photos" on storage.objects;
create policy "Users can delete own body photos" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
