# 0017 — Skip overdue chores, Peer skips others' chores, skips are silent

**Status:** Accepted, 2026-11-18. Partly supersedes [0015](0015-skip-after-late-cleaning.md) (who may skip, push on skip).

## Context
Peer's new rules (18.11.):
1. An **overdue** chore can always be skipped by its owner, with no late-cleaning condition. If nobody has cleaned the chore since, the app says so before the skip.
2. **Skips never send a push**, the late-cleaning skip of ADR 0015 included.
3. **Only Peer** may skip other people's chores: any open chore, this week's or overdue, for example when someone is on holiday.

The rule of ADR 0015 stays: this week's owner may skip after someone cleaned the chore too late. The 🐷 offer push also stays, because it belongs to a real "done".

**How does the database know who is Peer?**
- **Name "Peer" in code** (SQL and TypeScript): no schema change, but the rule then sits in two places as a magic string, and renaming a member silently breaks it.
- **Column `members.can_skip_for_others`** (chosen): set for Peer in the migration. Like everything about members, it changes only through a migration. `skip_week()` and the app read the same flag.

**How do skips stay silent?**
- **Only in the Edge Function** (return early on `skipped`): the database still calls the function for every skip.
- **Filter in the trigger** (chosen): `notify_done` fires only when `not new.skipped`. The Edge Function keeps a one-line guard, just in case.

**"Cleaned since"** means a later week's row of the same chore was really marked done (not skipped). The app works this out from `loadLastDone()` with `cleanedSince()` in `src/lib/week.ts` (tested). It is only a hint in the confirm sheet, so the database doesn't check it.

**Bug found on the way:** `skippable_assignment()` treated any older row with `done_at` from Wednesday on as "cleaned too late". A skipped overdue row has `done_at` too, so it would have offered a skip to this week's owner. It now also requires `not late.skipped`.

## Decision
Migration `20261118120000_skip_overdue_and_for_others.sql`:
- `members.can_skip_for_others boolean`, true for Peer.
- `skippable_assignment()` ignores skipped rows.
- `skip_week(assignment, member)` allows an open row up to this week if one of these holds:
  - it is your own and overdue, or
  - it is your own and `skippable_assignment()` allows it, or
  - you have `can_skip_for_others`.

  `done_by` = who skipped.
- Trigger `notify_done` leaves out skips.

App:
- "Überspringen" on overdue cards in "Meine Woche".
- For Peer in the WG overview: "Lieber überspringen" in the take-over sheet, and "Überspringen" on overdue rows.
- One `SkipSheet` component holds the texts.
- `chore_skipped` carries `owner_id` and `reason` (`late_cleaning` | `overdue` | `for_other`).

## Consequences
- ➕ Holidays and long-forgotten chores can be cleared without hand-editing the database ([chapter 19](../learning/19-fixing-data-by-hand.md)).
- ➕ No push noise for something that wasn't cleaned.
- ➖ Nobody is told when Peer skips their chore. They see "übersprungen" in the app.
- ➖ `done_by` on a skipped row can now be someone other than `member_id`. Stats use `events.payload.owner_id` / `assignments.member_id` for "whose chore" and `done_by` for "who closed it".
- ➖ Same as ADR 0007: the database can't tell which flatmate is tapping. `p_member_id` comes from the phone, so "only Peer" is as strong as "only your own".
