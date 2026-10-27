-- Profile photos (ROADMAP "Extras", Noa's hallway wish), see docs/decisions/0010.
--
-- The repo and the GitHub Pages site are public, so photos live only here, in
-- a PRIVATE bucket. Same boundary as our tables: only the logged-in WG user
-- (= knows the WG password) can read or change them, anon gets nothing.
-- The app fetches them with download() and the WG login, so no link exists
-- that works without logging in.
--
-- One file per member: avatars/<member_id>.jpg. No column on members: a
-- member "has a photo" when their file exists.

-- ---------------------------------------------------------------- the bucket

-- public = false: the /object/public/... URLs don't work for this bucket.
-- The app sends 256x256 JPEGs of ~20 KB, so 512 KB and JPEG-only are plenty
-- and stop anything else from being stored here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/jpeg']);

-- ---------------------------------------------------------------- access rules

-- storage.objects holds the files of ALL buckets, so every policy starts with
-- bucket_id = 'avatars'. No policy for anon means anon can't do anything.

-- Read: list() and download(). Upload with upsert and remove need it too.
create policy "wg can read avatars" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

-- Add / replace: only the 4 file names <member_id>.jpg, nothing else.
-- Which member you are is not checked (shared login, ADR 0007): the app only
-- offers to change your own photo.
create policy "wg can add avatars" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name in (select id::text || '.jpg' from public.members));

create policy "wg can replace avatars" on storage.objects for update to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars' and name in (select id::text || '.jpg' from public.members));

-- Remove: back to the emoji
create policy "wg can remove avatars" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars');
