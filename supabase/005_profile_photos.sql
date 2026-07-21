-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmubxdzdgjtpnvbxqvey/sql/new

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_version bigint;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- Path convention: {user_id}/avatar.jpg
-- Public reads (anyone with the direct URL can view it), writes
-- restricted to the folder matching the uploader's own user id —
-- same pattern as meal-photos.

drop policy if exists "Anyone can view profile photos" on storage.objects;
create policy "Anyone can view profile photos" on storage.objects
  for select
  to public
  using (bucket_id = 'profile-photos');

drop policy if exists "Users can upload own profile photo" on storage.objects;
create policy "Users can upload own profile photo" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own profile photo" on storage.objects;
create policy "Users can update own profile photo" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own profile photo" on storage.objects;
create policy "Users can delete own profile photo" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
