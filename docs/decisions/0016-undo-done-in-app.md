# 0016 — Undo "erledigt" in the app: reset done_at with the existing grant, log `chore_reopened`

**Status:** Accepted, 2026-11-11

## Context
A mis-tapped "Erledigt" could only be fixed by Peer with SQL ([ADR 0013](0013-fix-mistakes-by-deleting-events.md), [chapter 19](../learning/19-fixing-data-by-hand.md)). Peer asked for an undo button. Decisions Peer made in plan mode (11.11.):
- **Where:** a "Doch nicht erledigt?" pill on your own done card of **this** week in "Meine Woche", until Sunday (not a short toast right after tapping).
- **No push** on undo. The others already got "✅ … erledigt"; the WG tab updates live anyway, and CLAUDE.md says nothing else sends push.
- **Only "Erledigt"**, not "Überspringen".

Two questions had real alternatives:

**How does the app reset the row?**
- **A `security definer` function `undo_done()`** (like `take_over()`/`skip_week()`, ADR 0011/0015): could also reset `skipped` and check "this week only" in SQL. Needs a migration.
- **A plain update with the existing column grant** (chosen): the schema already grants `update (done_at, done_by)` and the policy checks `done_by is null or done_by = member_id`. Setting both to `null` passes, so no migration. `skipped` has no grant, so skipped rows stay closed automatically (the app also filters `skipped = false`).

**What happens to the history?**
- **Delete the `chore_done` event** (ADR 0013's way): stats stay simple, but the app has no delete right on `events` (append-only), and it would need one.
- **Append a `chore_reopened` event** (chosen, from ROADMAP → Ideas): payload `assignment_id, chore_id, week_start, done_at` (the old one). Stats subtract it.

## Decision
`undoDone()` in `src/lib/data.ts` updates `done_at`/`done_by` to `null` where `id`, `done_by = me` and `skipped = false`, with `.select('id')` so "nothing changed" (already reopened on another phone) becomes an error instead of a silent no-op. `App.tsx` logs `chore_reopened`. The `notify_done` trigger only fires on open → done, so undo sends nothing; tapping "Erledigt" again sends the normal push again.

## Consequences
- ➕ No migration, no new function, no `supabase db push`: it works as soon as the app is deployed.
- ➕ Full history: a mis-tap stays visible as `chore_done` + `chore_reopened`.
- ➖ Stats must subtract reopened ones (newest earlier `chore_done` with the same `assignment_id`).
- ➖ "This week only" and "only your own" are checked by the app, not the DB. The policy is `using (true)`: any phone with the WG login could reopen any done row. Same trust level as marking done today (ADR 0007).
- ➖ Overdue rows done this week leave "Meine Woche", so they can't be undone in the app; ADR 0013 / chapter 19 still covers those and other hand-fixes.
- ➖ Undo + re-tap = a second "✅" push to the others.
- Revisit if the WG ever wants undo for skips, or if someone reopens rows that aren't theirs: then move it into an `undo_done()` function.
