# ROADMAP.md — WG-App

Launch target: **Monday 2026-10-26** (first chore week). Rule: ship the core, everything else later.

## Phase 0 — Setup (Wed 21.10.)
- [x] Repo created, Vite + React + TS scaffold, deployed to GitHub Pages via Actions (blank page reachable)
- [x] Supabase project created (region EU), CLI linked
- [x] Flatastic reference screenshots in `docs/flatastic/` (chore list, done tap, overdue display, push setup) — lock-screen notification moved to Phase 4 (needs a second person)
- [x] VAPID key pair generated, stored as secrets
- [x] Learning log `docs/learning/` + ADRs `docs/decisions/` for Phase 0

## Phase 1 — Clickable prototype on mock data (Thu 22.10.)
Goal: real screens, fake data, so the hallway test happens on the actual UI.
Screens checked in WebKit (iPhone 15 size, light + dark) and on Peer's iPhone as Home Screen app (21.10.).
- [x] `MyWeek`: my chore this week (big), overdue items on top (red, "überfällig seit X Tagen"), "erledigt" button → confirmation sheet → celebration
- [x] `Overview`: all 4 chores this week, who, status (offen / erledigt + day)
- [x] `Login`: 4 name tiles + password field
- [x] `Settings`: notifications toggle, install hint, logout
- [x] Bottom tab bar: "Meine Woche" / "WG" / "Einstellungen"
- [x] PWA manifest + icons, installable on iPhone — checked on Peer's iPhone after deploy (21.10.)
- [x] `week.ts` with Vitest tests: week start in Europe/Vienna, cycle_week, DST weeks (29.03.2027, 25.10.2026 edge), matches the table in CLAUDE.md for 8 weeks

## Phase 2 — Hallway test (Fri 23.10.)
- [ ] Run `docs/hallway-test.md` with Carla, Noa, Manu (5 min each, on their own iPhone) — Carla, Noa done (23.10.); Manu open
- [x] Note findings in this file under "Test findings", fix the top 3

## Phase 3 — Real data (Sat 24.10.)
- [x] Migrations: all tables, RLS policies, `rotation_template` seeded, chores seeded (pushed 27.10.)
- [x] 1 shared WG auth user created by Peer (checklist), sign-ups off; `members` seeded (ADR 0007)
- [x] `ensure_current_week()` + pg_cron hourly; week 2026-10-26 rows exist
- [x] Frontend switched from mock to Supabase; Realtime on `assignments` so Overview updates live (tested 27.10.)
- [x] Event logging: `login`, `app_open`, `chore_done`

## Phase 4 — Push + rollout (Sun 25.10.)
- [x] Service worker push + notificationclick
- [x] Subscribe flow in Settings, store in `push_subscriptions`
- [x] Database trigger (pg_net, [ADR 0009](docs/decisions/0009-push-trigger-pg-net-vault.md)) → `notify-done` Edge Function; logs `push_sent`/`push_failed` (first real push 27.10., Apple answered 201)
- [ ] All 4 iPhones: app on Home Screen, logged in, notifications on
- [ ] **Push test matrix:** each member marks a test chore done → the other 3 receive it (12/12 deliveries). Then reset test data.
- [ ] Lock-screen screenshot of our own notification → add to [08. UX reference](docs/learning/08-ux-reference.md) (left over from Phase 0)

## Launch — Mon 26.10.
- [ ] Short message in the flat chat: link + "add to Home Screen" steps

## Extras pulled from Ideas
- [x] **MyWeek:** days left this week ("noch 4 Tage", today included; Sunday "Nur noch heute! ⏳"), borrowed from Flatastic's countdown (27.10.)
- [x] **Last done:** MyWeek card "Zuletzt erledigt vor 8 Tagen von Carla" (or "Zum ersten Mal dran …" if never done), Overview open rows "zuletzt gestern" (since Design 3: a "Zuletzt erledigt" card under the wheel). Read from `assignments`, no schema change (27.10.) — not yet checked on the iPhone with real done rows
- [x] **Photos of everyone** (Noa, hallway test): set your own photo in Settings, it replaces the animal emoji in `Avatar`. Private bucket `avatars`, only for the WG login, loaded with `download()`, resized + GPS removed on the phone ([ADR 0010](docs/decisions/0010-private-avatar-bucket.md)) (pulled and done 27.10., checked on the iPhone; test photos removed again, bucket empty)
- [x] **Take over a chore** ("Ich übernehm das", pulled from "After launch #2"): in the WG tab tap someone else's open chore of this week → confirm → it's yours this week, shows in your "Meine Woche", the other 3 get "🔄 Noa übernimmt diese Woche Müll rausbringen (statt Peer)". Rotation unchanged. DB function `take_over()` + trigger `notify_taken_over` ([ADR 0011](docs/decisions/0011-take-over-via-function.md)), logs `assignment_swapped` (done 27.10.: pushed, deployed, checked on the iPhone)
- [ ] **New design** (Peer, 27.10.): Peer makes 3 design proposals in claude.ai design (input: iPhone screenshots of every screen in light + dark, `index.css`, `strings.ts`, screens + components with their CSS modules, `mockData.ts`), the WG picks one, then it gets implemented here in the existing CSS modules. Core flow stays one tap away, still plain CSS, safe areas + dark mode. Record the choice as an ADR.
  - [x] 3 proposals made
  - [x] WG voted: Design 3 "Knautsch × Drehscheibe" ([ADR 0012](docs/decisions/0012-design-3-knautsch-drehscheibe.md), handoff in `docs/wg-app-design3-handoff/`)
  - [x] Chosen design implemented (27.10.): lint, type-check, 23/23 tests, WebKit screenshots light + dark. Not committed yet. Extra: "Zuletzt erledigt" card under the wheel (Peer's idea); "fällig bis Sonntag" dropped
  - [ ] **Peer's review on the iPhone** (`npm run dev -- --host`, open the Network URL in Safari, or after deploy as Home Screen app). Tick each:
    - [ ] Meine Woche: Erledigt button visible without scrolling, one tap opens the sheet, "Ja klar!" is green, confetti + "Stark! 💪" pill in the button's place
    - [ ] Meine Woche: tap your avatar top right → Einstellungen; tap "Die WG diese Woche" → WG tab
    - [ ] Meine Woche: "Ab Montag: …" shows the right chore for next week
    - [ ] WG: your chore is at the top under the orange arrow; done slices are green; "1/4" in the middle is right
    - [ ] WG: tap someone else's open slice → "Ja, mach ich! 💪" sheet (cancel it, or really take over and take it back)
    - [ ] WG: "Zuletzt erledigt" matches what really happened; "Ab Montag" card shows all 4, you first
    - [ ] Einstellungen: photo add/change/remove still works; notifications switch still works; logout works
    - [ ] Home Screen app: nothing hidden behind the Dynamic Island or the home indicator; content scrolls under the tab bar
    - [ ] Dark mode (Control Center): all 3 screens readable, no white boxes
    - [ ] Reduce Motion on (Settings → Accessibility → Motion): no confetti, sheet appears without sliding, still works
    - [ ] Bigger text (Settings → Display → Text Size, a few steps up): nothing cut off or overlapping, esp. the wheel labels
    - [ ] Then: commit, deploy, and tick "Chosen design implemented + checked on the iPhone" below
  - [ ] Chosen design implemented + checked on the iPhone

## After launch (in order)
1. **Weeks 2–3:** comments on chores (Realtime), note board ("Pinnwand", free text posts). Log `comment_created`, `note_created`.
2. **Week 4:** ~~swaps in the app~~ pulled forward as "Take over a chore" (see Extras). Left here: an optional absence marker (see Ideas), only if take-over alone isn't enough.
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
Hallway test 23.10.2026 with Noa and Carla (Manu not yet). Full notes: [docs/hallway-test.md](docs/hallway-test.md).

| Task | Noa | Carla |
|---|---|---|
| 1. Log in | hesitated: "Why put in password?" | hesitated: "What password should I use, why do I need one?" |
| 2. My chore this week | ok, quick, but confused at first because last week's task was still open | ok, quick |
| 3. Mark done | ok, really liked the animation | ok, liked the animation, laughed at the comments |
| 4. Who hasn't cleaned yet? | ok, but week/deadline not clear enough, should be bigger | ok, but wants a colour/icon per chore to see who does what |
| 5. Notifications | ok | ok |
| 6. Confusing/annoying? | "Maybe add pictures of everyone" | all fine |

**Top 3, fixed 24.10.:**
1. **Password confusion (2/2)** → one shared WG password, typed once per phone, then tap your name ([ADR 0007](docs/decisions/0007-shared-wg-login.md)). Peer explains it in person, no text in the UI.
2. **Overview hard to scan (2/2)** → chore icon in every row (`chores.icon`: 🗑️ 🛁 🚿 🍳), bigger week box with "fällig bis Sonntag, 1. Nov.".
3. **Old open chore shown first (Noa)** → MyWeek shows this week's card first, overdue cards below with "aus der Woche 19.–25. Okt.".

Kept as is: the celebration animation and cheer texts (both liked them).

## Ideas (not scheduled)
(Claude Code: put suggestions here instead of building them)
- **Baseline for success metrics:** count chore-related messages in the flat chat for the 4 weeks *before* launch now, otherwise the week-4 comparison has no "before".
- **Hallway question:** should others be able to mark a chore done *for* the owner (Flatastic allows "für Carla abhaken")? Case: chore done, owner forgot to tap.
- **Erinnern-Button** (from Flatastic IMG_2053): others can nudge the owner of an overdue chore. Would be a second push type; decide after the week-4 review.
- **Push status checklist in Settings** (from Flatastic IMG_2050/2051): permission ✓ / subscribed ✓ / saved on server ✓, plus "Test senden". Helps debug the Phase 4 matrix.
- **Mark the push test matrix in the stats:** note the matrix's start/end time here, so later statistics can skip those `chore_done` / `push_*` events (`events` stays append-only, nothing gets deleted).
- **CI hardening:** run `npm run lint` + `npm run test` before deploy; `curl` smoke test of the live URL after deploy. (see [01. Scaffolding](docs/learning/01-scaffolding.md#4-what-a-pro-would-also-do))
- **Maintenance:** update GitHub Actions to versions running on Node 24 (deprecation warning in the first run); pin Node version (`.nvmrc`); enable Dependabot + GitHub secret scanning / push protection. (see [01. Scaffolding](docs/learning/01-scaffolding.md#4-what-a-pro-would-also-do))
- **"Heute oder gestern erledigt?"** (Peer, 27.10.): the confirmation sheet asks when it was done, so `done_at` is right when someone taps late. Makes "zuletzt erledigt" and the week-6 stats (weekday when chores get done) honest. Notes for later:
  - `markDone()` already takes `doneAt`, so it's mostly UI: two buttons "Heute" / "Gestern" instead of "Ja klar!".
  - "Gestern" = yesterday 12:00 Vienna time (a day, not a fake exact minute).
  - On Monday, "gestern" is Sunday of the *previous* week: fine for an overdue card, but for this week's chore it would be before the week started. Only offer "gestern" if it's inside the assignment's week or later.
  - Push stays immediate ("hat … erledigt"); log it in the `chore_done` payload (`backdated: true`) so stats can tell.
  - Maybe later: "vorgestern" or a date picker. Start with 2 buttons.
- Add funny texts for the notifications (collect them in [docs/texts.md](docs/texts.md), then pick one at random)
- **Take over overdue chores too** (Peer, 27.10.): today only this week's open chores can be taken over. Overdue ones from last week stay with their owner. Would mean dropping `week_start = this_monday` in `take_over()` for rows with `done_at is null`.
- **"Ich bin weg" marker**: mark yourself away for a week → push "Peer ist diese Woche weg – wer übernimmt Müll rausbringen?". Builds on take-over, so the others still tap "übernehmen". Only if the chat isn't enough after the week-4 review.