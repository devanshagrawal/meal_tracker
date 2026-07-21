-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmubxdzdgjtpnvbxqvey/sql/new

insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;

-- Path convention: {user_id}/{log_date}/{meal}.jpg
-- Bucket is public for reads (anyone with the direct URL can view a photo),
-- but writes are restricted to the folder matching the uploader's own user id.

drop policy if exists "Anyone can view meal photos" on storage.objects;
create policy "Anyone can view meal photos" on storage.objects
  for select
  to public
  using (bucket_id = 'meal-photos');

drop policy if exists "Users can upload own meal photos" on storage.objects;
create policy "Users can upload own meal photos" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own meal photos" on storage.objects;
create policy "Users can update own meal photos" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own meal photos" on storage.objects;
create policy "Users can delete own meal photos" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
