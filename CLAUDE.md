# CLAUDE.md — WG-App (chore planning for our shared flat)

## What this is
Private web app for 4 flatmates (Peer, Carla, Noa, Manu) to see **who does which chore this week**, mark it done, and notify the others. Free, no ads, no business goal. Inspired by Flatastic (reverse-engineered UX, not its look): see `docs/flatastic/` for reference screenshots.

**Core value (never break this):** open the app → instantly see *my* chore this week → tap "erledigt" → the other 3 get a push notification.

## Owner & working style
- Peer is a novice coder (some Python). Keep code simple and readable over clever.
- Before any step that needs manual action (Supabase dashboard, GitHub settings, iPhone setup), give Peer a short numbered checklist.
- Work in small steps. Use plan mode for anything touching >2 files or the database schema. Ask before schema changes.
- Only build what is in the current phase of `ROADMAP.md`. Propose extras as notes in ROADMAP.md "Ideas", don't build them.
- After each finished task: update the checkbox in ROADMAP.md.

## Language rules
- **UI text: German** (du-Form, short, friendly, a bit playful).
- **Code, comments, commit messages, DB names: English.**
- Keep all UI strings in `src/lib/strings.ts` so wording can be changed in one place.

## Stack
- Frontend: Vite + React + TypeScript, mobile-first, no CSS framework required (plain CSS / CSS modules are fine).
- PWA: `vite-plugin-pwa` with **injectManifest** strategy (custom service worker needed for push).
- Routing: no router or `HashRouter` only (GitHub Pages has no SPA fallback).
- Backend: Supabase (Postgres, Auth email+password, Row Level Security, Edge Functions, pg_cron, Database Webhooks).
- Push: Web Push with VAPID keys, sent from a Supabase Edge Function (`web-push` via npm specifier).
- Hosting: GitHub Pages, deployed by GitHub Actions on push to `main`. Set Vite `base` to `/<repo-name>/`; manifest `start_url` and `scope` must match.
- Tests: Vitest, required for week/rotation logic only.

## Repo layout
```
src/
  screens/        Login, MyWeek, Overview, Settings
  components/
  lib/            supabaseClient.ts, week.ts, strings.ts, events.ts, push.ts
  sw.ts           service worker (push + notificationclick)
supabase/
  migrations/     all schema changes as SQL files, never edit the DB by hand without a migration
  functions/notify-done/
docs/
  flatastic/      reference screenshots
  hallway-test.md
```

## Domain rules (source of truth)
**Members:** Peer, Carla, Noa, Manu. 4 fixed accounts, created by Peer in the Supabase dashboard (email confirmation off). Login screen: tap your name tile → enter password. No sign-up, no password reset flow (Peer resets in the dashboard).

**Chores (4, all weekly, equal weight):**
- `Müll rausbringen`
- `Bad Noa & Manu`
- `Bad Carla & Peer`
- `Küche & Staubsaugen`

**Week:** Monday 00:00 – Sunday 23:59, timezone **Europe/Vienna**. Always compute week boundaries in Europe/Vienna, never in UTC or device-local time.

**Rotation = fixed 4-week cycle** stored in table `rotation_template` (not a formula in code). Anchor week: Monday **2026-10-26** = cycle week 0. `cycle_week = floor(days_since_anchor / 7) mod 4`.

| cycle_week | Peer | Carla | Noa | Manu |
|---|---|---|---|---|
| 0 | Müll rausbringen | Bad Carla & Peer | Bad Noa & Manu | Küche & Staubsaugen |
| 1 | Bad Carla & Peer | Müll rausbringen | Küche & Staubsaugen | Bad Noa & Manu |
| 2 | Küche & Staubsaugen | Bad Carla & Peer | Bad Noa & Manu | Müll rausbringen |
| 3 | Bad Carla & Peer | Küche & Staubsaugen | Müll rausbringen | Bad Noa & Manu |

**Assignments are materialized:** one row per (week_start, chore). Created by an idempotent SQL function `ensure_current_week()` run hourly by pg_cron (unique constraint prevents duplicates; hourly avoids DST bugs). Later swaps = editing `member_id` on a row; the template is never changed for one-off swaps.

**Overdue (rule "B"):** an assignment with `done_at IS NULL` and a past week stays open and visible ("überfällig seit X Tagen", red) until its owner marks it done. It does not block or change the new week's assignment of the same chore.

**Marking done:** only the assigned member can mark their own assignment done. Tap → confirmation sheet ("Alle anderen werden benachrichtigt") → done. Small celebration animation afterwards (playful, short).

**Notifications:** only on "done". Sent to the other 3 members. Nothing else sends push in the MVP.

## Data model (initial)
- `members` (id uuid = auth.users.id, name, emoji/color)
- `chores` (id, name, sort_order)
- `rotation_template` (cycle_week 0–3, chore_id, member_id; unique(cycle_week, chore_id))
- `assignments` (id, week_start date, chore_id, member_id, done_at timestamptz null, done_by uuid null; unique(week_start, chore_id))
- `push_subscriptions` (id, member_id, endpoint unique, p256dh, auth, created_at)
- `events` (id, created_at, member_id, type text, payload jsonb) — **append-only**

RLS: all tables readable only by authenticated members. `assignments.done_at` updatable only by the row's `member_id`. `events` insert-only for own member_id, no update/delete.

## Event logging (required from day 1)
Every meaningful action inserts into `events` via `src/lib/events.ts`. Types: `app_open`, `login`, `chore_done`, `push_subscribed`, `push_sent`, `push_failed`. Statistics later are built only from `events` + `assignments`. Never skip logging to "save time".

## Push notifications (iOS specifics)
- Works only for the PWA added to the Home Screen (iOS 16.4+). Show an install hint in Settings when not running standalone (`display-mode: standalone`).
- Request permission **only from a button tap** ("Benachrichtigungen aktivieren"), never on load.
- Flow: `assignments.done_at` set → Database Webhook → Edge Function `notify-done` → sends to other members' subscriptions → logs `push_sent`/`push_failed`. Delete subscriptions that return 404/410.
- Notification text example: "✅ Carla hat Bad Carla & Peer erledigt". Tapping opens the app.

## Secrets
- Frontend (public, via GitHub Actions secrets → env at build): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
- Supabase function secrets only: `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, service role key. Never commit these, never put them in frontend code.

## Commands
- `npm run dev` — local dev
- `npm run test` — Vitest
- `npm run build` — production build
- `supabase db push` / `supabase functions deploy notify-done`

## Definition of done (every feature)
- Works in Safari on iPhone as Home-Screen app (portrait, safe areas, dark mode).
- UI text German, from `strings.ts`.
- Relevant event logged.
- RLS still prevents non-members from reading anything.
