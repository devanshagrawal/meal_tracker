-- Run this in the Supabase SQL Editor after 001_profiles_auth.sql:
-- https://supabase.com/dashboard/project/mmubxdzdgjtpnvbxqvey/sql/new

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists city text;

-- Clear out any accounts created before these fields existed, since they'd
-- otherwise violate the NOT NULL constraints being added below.
delete from public.profiles where first_name is null;

alter table public.profiles
  alter column first_name set not null,
  alter column last_name set not null,
  alter column age set not null,
  alter column gender set not null,
  alter column city set not null;

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check
  check (gender in ('Male', 'Female', 'Other', 'Prefer not to say'));

alter table public.profiles drop constraint if exists profiles_city_check;
alter table public.profiles add constraint profiles_city_check
  check (city in ('Delhi-NCR', 'Bangalore'));

alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check
  check (age > 0 and age < 120);
