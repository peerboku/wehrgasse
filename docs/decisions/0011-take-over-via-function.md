# 0011 — "Take over a chore" through a database function `take_over()`

**Status:** Accepted, 2026-10-27.

## Context
When a flatmate is away, someone else has to do their chore. Until now only Peer could fix that, by editing `assignments.member_id` in the Supabase dashboard. Two questions:

**What does the app offer?**
- **Absence marker** ("Ich bin diese Woche weg"): tells the others, but leaves the chore without an owner. Someone still has to step up, and with the two shared bathrooms it's unclear who. It needs the take-over step anyway.
- **Take over** (chosen): the person who will do the work taps "übernehmen" on the chore. One action covers who does it, that everyone knows, and that the person agreed. A swap = two take-overs; undo = the old owner takes it back.

**How may the app change `member_id`?**
- **Column grant** `grant update (member_id) on assignments to authenticated`: smallest change, but then the app may move *any* row: done ones, old weeks, future weeks. The RLS check `done_by is null or done_by = member_id` doesn't stop that.
- **Edge Function** with the service role: works, but is a second server program for a single update, and slower (cold start).
- **`security definer` function `take_over(assignment_id, member_id)`** (chosen): the app gets `execute` on exactly this function and no update right on `member_id`. The rule "this week (Europe/Vienna) + still open + not already yours" sits in its `where` clause, inside the database.

**How does the push know?**
- Change the existing `notify_done()` trigger function: one function, but it touches the push that already works.
- **Second trigger `notify_taken_over`** (chosen) on `update of member_id`, same Vault lookup, body `{ kind: 'taken_over', assignment_id, from_member_id }`. The Edge Function `notify-done` reads `kind`. Calls without `kind` are treated as `'done'`, so the old trigger works unchanged.

## Decision
Migration `20261027180000_take_over.sql`: `take_over()` (execute for `authenticated` only) + trigger function `notify_taken_over()` + trigger. The frontend calls `supabase.rpc('take_over', …)` from the WG tab and logs `assignment_swapped`. The push goes to everyone except the new owner: "🔄 Noa übernimmt diese Woche Müll rausbringen (statt Peer)".

## Consequences
- ➕ The rotation never changes: only one row of one week. Next week `ensure_week()` follows `rotation_template`.
- ➕ The database refuses done, old or future rows, even if the app has a bug.
- ➕ Peer's dashboard edits of `member_id` now also send a push.
- ➖ Like "mark done" (ADR 0007): the DB can't tell who is who. "Only take over *for yourself*" is a UI rule; `p_member_id` comes from the phone.
- ➖ The Vault lookup in the two trigger functions is the same code twice. Fine for two; a third would justify a helper function.
- ➖ If the app stays open across Sunday midnight, "this week" on the phone and in the DB differ, so the tap fails with an error message. Reopening the app fixes it.
