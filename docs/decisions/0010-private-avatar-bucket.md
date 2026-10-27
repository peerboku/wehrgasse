# 0010 — Profile photos in a private bucket, loaded with `download()`

**Status:** Accepted, 2026-10-27.

## Context
Noa's hallway wish: real photos instead of the animal emojis. Photos of people are personal data, so they must be visible to the 4 of us only. Two facts make that harder than it sounds: the **repo is public**, and the **site on GitHub Pages is public** (anyone can open it and read its JavaScript). Whatever protects the photos has to sit behind the WG login, like our tables do (ADR 0007).

Alternatives considered:
- **Photos in the repo / `public/`**: simplest, but then they're on the internet, and git history keeps them even after deleting. Out.
- **Public Supabase bucket**: easy `<img src>` URLs, but anyone with the URL sees the photo, no login needed. Out.
- **Private bucket + signed URLs**: a signed URL works for *anyone* who has it until it expires. Lets the browser cache photos, but creates links that bypass the login.
- **Private bucket + `download()`** (chosen): the app fetches each file with the WG login and shows it from an object URL (`blob:`), which only works inside the app tab that created it. No link exists that works without the login.
- **`members.photo_path` column**: would need an update grant on `members` (today: "members change only via migrations"). Not needed: the file name `<member_id>.jpg` already says whose photo it is.

## Decision
Bucket `avatars` with `public = false`, 512 KB limit, JPEG only (migration `20261027170000_avatar_photos.sql`). RLS on `storage.objects` for `authenticated` only: read, add/replace only the names `<member_id>.jpg` of existing members, remove. Nothing for `anon`. The phone shrinks the picked photo to 256×256 on a canvas before upload, which also drops the hidden photo data (GPS, camera, date).

## Consequences
- ➕ Same protection as all other data: knowing the WG password is the only way in.
- ➕ No GPS location of anyone's home or phone ends up on the server.
- ➕ No schema change on our own tables.
- ➖ Photos are downloaded again at every app start (4 × ~20 KB, negligible). `cacheNonce` = the file's `updated_at` makes sure a new photo isn't hidden behind an old cached one.
- ➖ Like "mark done": the DB can't tell who is who, so "only change your own photo" is a UI rule. Any flatmate could technically replace another's photo.
- ➖ If the WG password leaks, the photos are as exposed as the chore data. Changing the password fixes both.
