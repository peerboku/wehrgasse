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
Every push to `main` deploys to GitHub Pages via GitHub Actions.

Backend: `supabase db push` (migrations in `supabase/migrations/`), `supabase functions deploy notify-done`.

## More docs
- [CLAUDE.md](CLAUDE.md): domain rules, data model, conventions
- [ROADMAP.md](ROADMAP.md): what's done and what's next
- [docs/decisions/](docs/decisions/): why things are the way they are (ADRs)
- [docs/learning/](docs/learning/): how it was built, step by step
