# 14 — Frontend on Supabase: login, queries, Realtime

## 1. The idea

Until now the app lived on fake data in memory: a reload reset everything, and each phone had its own copy. Switching to a real backend means three new jobs for the frontend:

1. **Authentication**: prove to the server who you are. Supabase Auth checks the password and gives back a **session** (a signed token, a JWT). `supabase-js` stores it on the device and sends it with every request, so Postgres knows the request is `authenticated` and RLS applies.
2. **Queries**: ask for exactly the rows you need, and write changes back. `supabase-js` turns `.from('assignments').select(...).eq(...)` into an HTTP call to the auto-generated API (PostgREST).
3. **Live updates (Realtime)**: instead of asking "anything new?" every few seconds, the app opens a WebSocket, and the database pushes "row X changed" to every open app.

Two patterns make this feel fast and stay simple:
- **Optimistic update**: show the change immediately, send it in the background, and roll back (reload) only if it fails.
- **Refetch on change**: when Realtime says "something changed", just load the (4–8) rows again instead of merging changes by hand.

## 2. In our app

New files, each with one job:

| File | Job |
|---|---|
| [`supabaseClient.ts`](../../src/lib/supabaseClient.ts) | the one connection, plus `WG_EMAIL` |
| [`data.ts`](../../src/lib/data.ts) | all reads/writes: `loadMembers`, `loadChores`, `loadAssignments`, `markDone`, `onAssignmentsChange` |
| [`me.ts`](../../src/lib/me.ts) | which flatmate uses this phone (localStorage, wrapped in try/catch) |
| [`events.ts`](../../src/lib/events.ts) | now inserts into `events` instead of `console.info` |

[`App.tsx`](../../src/App.tsx) walks through the screens in order: *checking session → `Login` (WG password) → `PickMember` (tap your name) → tabs.* `supabase.auth.onAuthStateChange` tells the app when the stored session is found or gone. That's why a phone that logged in once never sees the password screen again.

Details worth knowing:
- `loadAssignments` asks for "this week **or** still open" in one query: `.or('week_start.eq.2026-10-26,done_at.is.null')`. That's how overdue chores from older weeks come along.
- `markDone` adds `.is('done_at', null)`, so a second tap (or a second phone) can't overwrite the first "done" time.
- The iPhone pauses WebSockets when the app is in the background. So App also reloads on `visibilitychange` (the app comes back to the front).
- Lint flagged `reloadAll()` inside `useEffect` (`react/set-state-in-effect`). That's a false positive here, because the state is set only *after* the network answer. It's silenced with a one-line comment that says why.

**The real test** (27.10., 00:22–00:24, Peer with two browser windows, "Peer" and "Carla"):
- Wrong password → "Hmm, das Passwort stimmt nicht." ✅
- Peer ticks Müll → Carla's WG tab updates without reload ✅ (Realtime)
- What the database recorded (`events`, times in Vienna):
  ```
  2  27.10. 00:22:33  Peer   login
  3  27.10. 00:22:33  Peer   app_open
  4  27.10. 00:23:13  Peer   app_open
  5  27.10. 00:23:13  Peer   login
  6  27.10. 00:23:23  Peer   chore_done  {"assignment_id": "5811454e-…"}
  7  27.10. 00:24:05  Peer   app_open
  8  27.10. 00:24:33  Carla  login
  9  27.10. 00:24:33  Carla  app_open
  10 27.10. 00:24:40  Carla  chore_done  {"assignment_id": "a03cca89-…"}
  ```
  All three required types arrive, with the right member and payload.

**Mistakes and surprises:**
- **First attempt: "Die Daten konnten nicht geladen werden."** The login worked, but every read was refused: missing table grants, see [chapter 13](13-schema-rls-migrations-cron.md). The error screen with "Nochmal versuchen" did its job. It told us *where* it broke (after login, before data) without a crash.
- **Event id 1 is missing.** That's not a bug. Our rollback test inserted an event and was rolled back, but a sequence (the id counter) is **never** rolled back, so the number 1 was used up. Ids are unique, not gap-free.
- **Test data in the real week.** We tested on 27.10., inside the first real week, so the two test ticks (Müll, Bad Carla & Peer) and the 9 test events were real rows. Reset afterwards as the `postgres` user (which bypasses RLS):
  ```
  update assignments set done_at = null, done_by = null where id in (…);
  delete from events where id between 2 and 10;
  → done: 0, assignments: 4, events: 0
  ```
  Next time, test *before* the week starts, or on a throw-away week.
- **`login` and `app_open` come in pairs** when a name is picked (ids 2+3, 8+9). That's by design: `app_open` = "someone started using the app". For statistics, count `app_open` per day, not per row.

## 3. Predict, then run

Open the app in one window and run this in the terminal:
```
supabase db query --linked "select pg_sleep(0)"
```
Nothing happens in the app. Now **predict** what the app shows when Peer edits `member_id` of a row in the Supabase dashboard (a swap) while the WG tab is open. Try it (then swap back).

## 4. What a pro would also do

- **Generated types**: `supabase gen types typescript` creates TypeScript types from the real schema, so a renamed column is a compile error instead of a runtime surprise. Our hand-written `types.ts` can drift.
- **Offline queue**: if "Erledigt" is tapped without network, store it and send later. We show an alert and reload instead.
- **End-to-end tests** (Playwright) that log in and tick a chore in a real browser, run in CI.

## 5. Sources

- supabase-js reference (auth, select, update, filters, realtime): <https://supabase.com/docs/reference/javascript/introduction>
- Supabase Realtime, Postgres Changes: <https://supabase.com/docs/guides/realtime/postgres-changes>
- PostgREST, horizontal filtering (`or`, `is`, `eq`): <https://docs.postgrest.org/en/stable/references/api/tables_views.html>
- PostgreSQL 17, sequences are not transactional (see the note under `nextval`): <https://www.postgresql.org/docs/17/functions-sequence.html>
- MDN, `visibilitychange`: <https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event>

## 6. How we know it's right

- **Peer, not Claude, ran the browser test**: a wrong password was refused, and the live update arrived in the second window.
- **The database's own records** (`events`, `assignments.done_at/done_by`) show the right member, chore and time for every action.
- **The server refuses what the UI hides**: the rollback test in chapter 13 showed Peer *can't* tick Carla's chore even by calling the API directly.
- Still open: **cron's first run.** Check after 01:00 Vienna time:
  ```
  supabase db query --linked "select status, start_time from cron.job_run_details order by start_time desc limit 3"
  ```
  Expect `succeeded`.
- **Mistake found later (2026-10-27): the deployed site was dead.** Locally everything worked (keys in `.env.local`), but the GitHub secret `VITE_SUPABASE_ANON_KEY` was never added. The build still went green, because a missing secret just becomes an empty string. Found by downloading the live bundle:
  ```
  gh secret list                      # only VITE_SUPABASE_URL and VITE_VAPID_PUBLIC_KEY
  curl -s https://peerboku.github.io/wehrgasse/assets/index-BEMlrRV9.js | tail -c 200
  # ... Error(`VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing, see .env.example`);
  ```
  Our own check in `supabaseClient.ts` threw on start, so the page stayed blank. Lesson: "CI green" only means "it built", so open the live URL after every deploy.

## 7. Check yourself

1. Why does a flatmate see the password screen only once per phone?
2. What would go wrong without `.is('done_at', null)` in `markDone`?
3. Why is event id 1 missing, and is that a problem?

<details><summary>Answers</summary>

1. `supabase-js` stores the session on the phone and refreshes it automatically. `onAuthStateChange` reports it at start, so App skips `Login`.
2. A second tap, or a second phone with an old screen, would overwrite `done_at` with a later time. Statistics ("weekday when chores get done") would be wrong.
3. A rolled-back insert still used up the sequence value. Not a problem: ids only need to be unique.

</details>

## 8. Your notes

> _In your words: what happens between tapping "Ja klar!" and Carla's screen changing?_
>
>
