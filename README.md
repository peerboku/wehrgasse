# WG-App 🏠

Chore planning for our shared flat (Peer, Carla, Noa, Manu).
Open the app → see your chore this week → tap "Erledigt" → the other three get a push notification.

**Live:** https://peerboku.github.io/wehrgasse/ (best as Home Screen app on iPhone, iOS 16.4+)

## Features
- **Meine Woche:** your chore this week, days left, who did it last, overdue chores from past weeks
- **Erledigt:** confirm → small celebration → push to the others
- **WG:** all 4 chores this week, who and done/open, updates live
- **Übernehmen:** take over someone else's open chore for this week (the rotation stays the same)
- **Einstellungen:** turn on notifications, set your own photo (private, only the WG sees it), log out
- Fixed 4-week rotation, weeks run Monday to Sunday (Europe/Vienna)

## Stack
Vite + React + TypeScript (PWA), Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron), Web Push, hosted on GitHub Pages.

## Run it
```sh
npm install
npm run dev     # local dev server
npm run test    # Vitest (week + rotation logic)
npm run build   # production build
```
Needs a `.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.

## Deploy
The app has two parts, and each one is deployed separately:

| Part | What changed | How it goes live |
|---|---|---|
| Frontend (GitHub Pages) | anything in `src/`, `public/`, `index.html`, `vite.config.ts` | automatic on `git push` to `main` |
| Database (Supabase) | a new file in `supabase/migrations/` | by hand: `supabase db push` |
| Edge Function (Supabase) | `supabase/functions/notify-done/` | by hand: `supabase functions deploy notify-done` |

### 1. Check before you push
```sh
npm run lint
npm run test
npm run build   # must pass, otherwise the GitHub build fails too
```

### 2. Backend first (only if it changed)
If the new frontend calls a new DB function or column, the database has to be ready **before** the frontend goes live.
```sh
supabase db push --dry-run   # shows which migrations would run, changes nothing
supabase db push             # applies them to the cloud DB (ADR 0008: no local stack)
supabase migration list      # local and remote should match
supabase functions deploy notify-done   # only if the function changed
```
A migration that is already applied is never edited. To fix it, write a new migration.

### 3. Frontend
```sh
git push        # push to main starts .github/workflows/deploy.yml
gh run watch    # optional: follow the build in the terminal (or the Actions tab on GitHub)
```
After 1–2 minutes it's live at https://peerboku.github.io/wehrgasse/. The Home Screen app picks up the new version the next time it's opened. If it still shows the old one, close it completely and open it again.

To redeploy without a new commit (e.g. after changing a secret): `gh workflow run deploy.yml`, or the "Run workflow" button in the Actions tab.

### One-time setup (already done, here for a new laptop)
1. `supabase login`, then `supabase link --project-ref <ref>` (chapter 06).
2. GitHub repo secrets for the build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` (check with `gh secret list`).
3. Supabase function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NOTIFY_DONE_SECRET` (check with `supabase secrets list`), plus the Vault entries `notify_done_secret` and `notify_done_url` for the push trigger (chapters 05, 07, 15).
4. GitHub → Settings → Pages → Source: **GitHub Actions** (chapter 04).

## More docs
- [CLAUDE.md](CLAUDE.md): domain rules, data model, conventions
- [ROADMAP.md](ROADMAP.md): what's done and what's next
- [docs/decisions/](docs/decisions/): why things are the way they are (ADRs)
- [docs/learning/](docs/learning/): how it was built, step by step
