# ROADMAP.md — WG-App

Launch target: **Monday 2026-10-26** (first chore week). Rule: ship the core, everything else later.

## Phase 0 — Setup (Wed 21.10.)
- [x] Repo created, Vite + React + TS scaffold, deployed to GitHub Pages via Actions (blank page reachable)
- [x] Supabase project created (region EU), CLI linked
- [ ] Flatastic reference screenshots in `docs/flatastic/` (chore list, done tap, overdue display, notification) — chore list + done tap ✅; overdue (after Sun 25.10.) and lock-screen notification still missing
- [x] VAPID key pair generated, stored as secrets
- [x] Learning log `docs/learning/` + ADRs `docs/decisions/` for Phase 0

## Phase 1 — Clickable prototype on mock data (Thu 22.10.)
Goal: real screens, fake data, so the hallway test happens on the actual UI.
- [ ] `MyWeek`: my chore this week (big), overdue items on top (red, "überfällig seit X Tagen"), "erledigt" button → confirmation sheet → celebration
- [ ] `Overview`: all 4 chores this week, who, status (offen / erledigt + day)
- [ ] `Login`: 4 name tiles + password field
- [ ] `Settings`: notifications toggle, install hint, logout
- [ ] Bottom tab bar: "Meine Woche" / "WG" / "Einstellungen"
- [ ] PWA manifest + icons, installable on iPhone
- [ ] `week.ts` with Vitest tests: week start in Europe/Vienna, cycle_week, DST weeks (29.03.2027, 25.10.2026 edge), matches the table in CLAUDE.md for 8 weeks

## Phase 2 — Hallway test (Fri 23.10.)
- [ ] Run `docs/hallway-test.md` with Carla, Noa, Manu (5 min each, on their own iPhone)
- [ ] Note findings in this file under "Test findings", fix the top 3

## Phase 3 — Real data (Sat 24.10.)
- [ ] Migrations: all tables, RLS policies, `rotation_template` seeded, chores seeded
- [ ] 4 auth users created by Peer (checklist), linked to `members`
- [ ] `ensure_current_week()` + pg_cron hourly; week 2026-10-26 rows exist
- [ ] Frontend switched from mock to Supabase; Realtime on `assignments` so Overview updates live
- [ ] Event logging: `login`, `app_open`, `chore_done`

## Phase 4 — Push + rollout (Sun 25.10.)
- [ ] Service worker push + notificationclick
- [ ] Subscribe flow in Settings, store in `push_subscriptions`
- [ ] Database Webhook → `notify-done` Edge Function; logs `push_sent`/`push_failed`
- [ ] All 4 iPhones: app on Home Screen, logged in, notifications on
- [ ] **Push test matrix:** each member marks a test chore done → the other 3 receive it (12/12 deliveries). Then reset test data.

## Launch — Mon 26.10.
- [ ] Short message in the flat chat: link + "add to Home Screen" steps

## After launch (in order)
1. **Weeks 2–3:** comments on chores (Realtime), note board ("Pinnwand", free text posts). Log `comment_created`, `note_created`.
2. **Week 4:** swaps/absences in the app (reassign a week's assignment, both parties see it). Until then Peer edits `assignments.member_id` in the Supabase dashboard. Log `assignment_swapped`.
3. **Week 4 review:** check success metrics below, decide keep / simplify / switch.
4. **Week 6+:** statistics from `events` + `assignments` (weekday when chores get done, done-rate per person, avg days late).

## Success metrics (review after 4 weeks)
Measured from data, not opinion:
- ≥ 80 % of assignments marked done in the app (any time)
- All 4 `push_subscriptions` still active
- ≥ 1 absence handled through the app/dashboard instead of only in the chat
- Chore-related messages in the flat chat clearly fewer than before (count 4 weeks before vs. after)
- One question to each flatmate: "Würdest du merken, wenn die App weg wäre?"

**Kill rule:** if done-rate < 50 % after 4 weeks → simplify or switch to Flatastic.

## Risks
- Supabase free projects can pause after inactivity — check status if the app suddenly fails.
- A flatmate skips Home-Screen install → no push → loop breaks. Phase 4 matrix catches this.
- Bathroom pairs make absences cascade; swaps feature must handle "who takes the freed chore".

## Test findings
(fill in after hallway test)

## Ideas (not scheduled)
(Claude Code: put suggestions here instead of building them)
- **Baseline for success metrics:** count chore-related messages in the flat chat for the 4 weeks *before* launch now, otherwise the week-4 comparison has no "before".
- **Hallway question:** should others be able to mark a chore done *for* the owner (Flatastic allows "für Carla abhaken")? Case: chore done, owner forgot to tap.
- **MyWeek:** show days left this week ("noch 4 Tage"), borrowed from Flatastic's countdown.
- **CI hardening:** run `npm run lint` + `npm run test` before deploy; `curl` smoke test of the live URL after deploy. (see [01. Scaffolding](docs/learning/01-scaffolding.md#4-what-a-pro-would-also-do))
- **Maintenance:** update GitHub Actions to versions running on Node 24 (deprecation warning in the first run); pin Node version (`.nvmrc`); enable Dependabot + GitHub secret scanning / push protection. (see [01. Scaffolding](docs/learning/01-scaffolding.md#4-what-a-pro-would-also-do))
