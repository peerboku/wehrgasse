# Learning log — building the WG-App

This folder is a course textbook that writes itself while we build the app. Every step we take gets one chapter: first the general idea, then exactly how we did it here, with the real commands and real output, not a cleaned-up story.

Two kinds of records, kept apart on purpose:

| Folder | Answers | Changes when |
|---|---|---|
| `docs/learning/` (this) | *How does X work, and how did we do it?* | We do a new step |
| [`docs/decisions/`](../decisions/) | *Why did we pick X over Y?* | We make a choice that had real alternatives |

The split comes from [Diátaxis](https://diataxis.fr) (explanation vs. how-to) and from [Architecture Decision Records](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions). How-tos go stale; a recorded *reason* keeps its value even after the code changes.

## How to use a chapter

1. Read **The idea** first. It contains nothing specific to this project, so it transfers to your next app.
2. Read **In our app** next to the real files (links are clickable in VS Code).
3. Do the **Predict, then run** exercise: write your prediction down *before* you run the command. Being wrong is the point; that's where learning sticks.
4. Answer **Check yourself** without peeking, then open the answer.
5. Write **Your notes** in your own words, as if explaining it to Carla (Feynman technique). If you can't, that's the part to re-read.

## Chapter template

Every chapter uses the same eight sections:

1. **The idea** — what and why, in general
2. **In our app** — real commands, real output excerpts, links to our files; including mistakes and how we fixed them
3. **Predict, then run** — one small experiment
4. **What a pro would also do** — and why we skip it for now
5. **Sources** — official docs and specs (primary sources, not blog posts)
6. **How we know it's right** — checks by something other than Claude or Peer: a machine, a spec, other people
7. **Check yourself** — 2–3 questions, answers folded
8. **Your notes** — yours

## Chapters

Status: ✅ written from real evidence · ⏳ partly waiting for you

### Phase 0 — Setup (Wed 21.10.2026)

| # | Chapter | Status | Read |
|---|---|---|---|
| 00 | [The big picture: from laptop to iPhone](00-big-picture.md) | ✅ |✅ |
| 01 | [Scaffolding a frontend project](01-scaffolding.md) | ✅ |✅|
| 02 | [Building for production and the base path](02-build-and-base-path.md) | ✅ |✅|
| 03 | [Git and GitHub](03-git-and-github.md) | ✅ (one fix for you inside) | |
| 04 | [CI/CD: GitHub Actions and GitHub Pages](04-ci-cd-github-pages.md) | ✅ | |
| 05 | [Secrets and configuration](05-secrets-and-config.md) | ✅ (one fix for you inside) ||
| 06 | [The backend: a Supabase project and its CLI](06-supabase-project.md) | ✅ ||
| 07 | [Web Push and VAPID keys](07-web-push-keys.md) | ✅ ||
| 08 | [UX research: learning from Flatastic](08-ux-reference.md) | ✅ (lock-screen push → Phase 4) ||

### Phase 1 — Clickable prototype (Wed 21.10.2026)

| # | Chapter | Status | Read |
|---|---|---|---|
| 09 | [Dates, time zones, and automated tests](09-dates-timezones-and-tests.md) | ✅ | |
| 10 | [React screens, state, and a prototype on fake data](10-react-screens-and-state.md) | ✅ | |
| 11 | [Progressive Web App: an app icon on the iPhone](11-pwa-install-on-iphone.md) | ✅ | |

### Phase 2 — Hallway test (Fri 23.10.2026)

| # | Chapter | Status | Read |
|---|---|---|---|
| 12 | [From hallway test to fixes](12-hallway-test-to-fixes.md) | ✅ | |

### Phase 3 — Real data (Sat 24.10. – Tue 27.10.2026)

| # | Chapter | Status | Read |
|---|---|---|---|
| 13 | [The database: schema, RLS, migrations, pg_cron](13-schema-rls-migrations-cron.md) | ✅ | |
| 14 | [Frontend on Supabase: login, queries, Realtime](14-frontend-on-supabase.md) | ✅ (cron's first run: check inside) | |

### Phase 4 — Push + rollout (Tue 27.10.2026)

| # | Chapter | Status | Read |
|---|---|---|---|
| 15 | [Push notifications end to end](15-push-notifications.md) | ⏳ (first push ✅, 4-iPhone matrix open) | |

### Extras pulled from Ideas (Tue 27.10.2026)

| # | Chapter | Status | Read |
|---|---|---|---|
| 16 | [Private photos: Storage buckets, RLS on files, stripping GPS](16-private-photos-storage.md) | ⏳ (remove + iPhone check open) | |

## Final exam for Phase 0: the reproducibility test

The strongest proof that these chapters are correct comes from a run that doesn't involve Claude. In a new empty folder, with a new GitHub repo called e.g. `wg-test`, follow chapters 01–04 **without asking Claude**, and end with a page live at `https://<you>.github.io/wg-test/`. Every place you get stuck is a bug in this documentation. Write it down and we'll fix the chapter. Delete the test repo afterwards.
