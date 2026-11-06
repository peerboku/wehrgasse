# 0015 — "Überspringen" after late cleaning: a `skipped` flag on the done row, set by `skip_week()`

**Status:** Accepted, 2026-11-01.

## Context
Peer's rule: if last week's chore is only done on **Wednesday or later of the following week**, the person who has that chore **this** week may skip it ("Peer das Drecksschwein hat zu spät geputzt, du kannst diese Woche überspringen"). Example: Peer cleans the 26.10. bathroom on Thu 05.11.; the bathroom is clean, so the person who has it in the week of 02.11. may skip.

Rule in one line: this week's **open** row of chore X may be skipped by its owner if an **older** row of X was marked done **this week, Wednesday 00:00 Europe/Vienna or later**.

**Automatic or a button?**
- **Automatic**: the app treats the chore as free and only shows the message. No tap, but the rule then has to be re-computed in every place that asks "open or done?" (overdue list, wheel, counts, later stats), and "skipped" vs. "forgot" can't be told apart.
- **Button "Überspringen"** (chosen): the owner decides (they can still tap "Erledigt"), and the decision is stored once.

**How to store it?**
- **Separate column `skipped_at`**, `done_at` stays null: most honest, but every `done_at is null` check (overdue query in `loadAssignments`, wheel, counts, `take_over()`) needs a second condition, or a skipped row turns red as overdue next week.
- **Set `done_at`/`done_by` too, plus `skipped boolean`** (chosen): every existing "is it closed?" check keeps working. Only three places look at `skipped`: the label ("Übersprungen 😎" / "übersprungen"), `loadLastDone()` (a skip isn't "Zuletzt erledigt"), and the push text.

**Who may set it?** Same reasoning as ADR 0011: no column grant on `skipped` (the app could then skip anything). Instead a `security definer` function `skip_week(assignment_id, member_id)` whose `where` clause calls `skippable_assignment(chore_id)`, which holds the rule in SQL.

**Push:**
- When the late chore is marked done, this week's owner gets "🐷 {late} das Drecksschwein hat zu spät geputzt – du kannst diese Woche {chore} überspringen!", the others get the normal "✅ … erledigt".
- On skip, the other 3 get "⏭️ {name} überspringt diese Woche {chore} ({late} hat zu spät geputzt)".
- No new trigger: `skip_week()` sets `done_at`, so the existing `notify_done` trigger fires. The Edge Function reads `skipped` and asks `skippable_assignment()` whether a skip offer is due.

## Decision
Migration `20261101120000_skip_after_late.sql`: column `assignments.skipped`, `skippable_assignment()` (execute: `service_role` only), `skip_week()` (execute: `authenticated` only). Edge Function `notify-done` sends the two new texts. The frontend shows the offer from `lastDone` + `lateEnoughToSkip()` in `src/lib/week.ts` (Vitest), calls `rpc('skip_week')` and logs `chore_skipped`.

## Consequences
- ➕ The database refuses a skip that doesn't follow the rule, even if the app has a bug.
- ➕ Overdue, wheel, "x von 4 erledigt" and `take_over()` work unchanged.
- ➖ `done_at` now means "closed at", not always "cleaned at". Stats must use `skipped = false` for "really cleaned" (or count skips separately).
- ➖ The rule exists twice: SQL (`skippable_assignment()`) and TypeScript (`lateEnoughToSkip()`, only for showing the button). Comments point to each other; the TS version has tests.
- ➖ `done_at` is the moment of the tap. Cleaned Tuesday, tapped Wednesday → a skip is offered. Would be fixed by the "Heute oder gestern erledigt?" idea in ROADMAP.
- ➖ Same as ADR 0007/0011: "only your own row" is checked against `p_member_id` from the phone, the DB can't tell who is who.
