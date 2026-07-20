-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmubxdzdgjtpnvbxqvey/sql/new

create table if not exists public.day_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,

  morning_water boolean not null default false,
  morning_water_type text not null default '',
  morning_nuts boolean not null default false,

  -- { breakfast: { selection, otherTitle, otherDescription, time }, lunch: {...}, dinner: {...} }
  -- selection is a dish name, "__other__", "__skipped__", or null
  meals jsonb not null default '{
    "breakfast": {"selection": null, "otherTitle": "", "otherDescription": "", "time": ""},
    "lunch":     {"selection": null, "otherTitle": "", "otherDescription": "", "time": ""},
    "dinner":    {"selection": null, "otherTitle": "", "otherDescription": "", "time": ""}
  }'::jsonb,

  -- [{ text, time }, ...]
  extras jsonb not null default '[]'::jsonb,

  water_glasses int not null default 0 check (water_glasses between 0 and 12),
  submitted boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),

  unique (user_id, log_date)
);

alter table public.day_logs enable row level security;

drop policy if exists "own day logs" on public.day_logs;
create policy "own day logs" on public.day_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-stamp updated_at / updated_by on every insert or update, so the
-- client never has to remember to set them itself.
create or replace function public.set_day_logs_updated_meta()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists day_logs_set_updated_meta on public.day_logs;
create trigger day_logs_set_updated_meta
  before insert or update on public.day_logs
  for each row
  execute function public.set_day_logs_updated_meta();
