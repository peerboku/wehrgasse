# 0018 — Pick the day in the "erledigt?" sheet: native date field, earlier days stored as 12:00 Vienna

**Status:** Accepted, 2026-11-19

## Context
Someone cleans on Monday but only taps "Erledigt" on Thursday. `done_at` was always "now", so "Erledigt am Do.", "Zuletzt erledigt" and the planned weekday stats were wrong. Peer asked for a date picker in the confirm sheet (19.11.). This pulls the ROADMAP idea "Heute oder gestern erledigt?" forward.

Two questions had real alternatives:

**What does the picker look like?**
- **Two buttons "Heute" / "Gestern"** (the original idea): one tap, but "vorgestern" or "Montag" isn't possible.
- **A row of day chips** (Mo. … Heute): one tap, fits the playful design, but covers at most 7 days, so an overdue chore from weeks ago couldn't go back to its own week.
- **A native `<input type="date">`** (chosen, Peer in plan mode): on the iPhone it opens Apple's calendar popover, works for any range, least code. Default is today, so the normal case is still one tap on "Ja klar!".

**Which timestamp does an earlier day get?**
- **The current time on that day** (e.g. Monday 21:43): looks exact but invents a minute nobody knows.
- **12:00 Europe/Vienna on that day** (chosen): clearly "a day", and never slips into the neighbouring day on DST switch days. Today keeps the exact moment, as before.

## Decision
- The done sheet in "Meine Woche" (this week's card and overdue cards) has a "Wann?" row with a date field, `min` = the assignment's `week_start`, `max` = today (Vienna). iOS doesn't always enforce `min`/`max` and its "Löschen" button empties the field, so `clampDoneDate()` (`src/lib/week.ts`, tested) clamps the value again; empty = today.
- `App.tsx`: today → `done_at = now`, earlier day → `viennaNoon(day)` (`week.ts`, tested on both DST switch days).
- `chore_done` gets `backdated: true, done_on: 'YYYY-MM-DD'` in the payload when the day isn't today.
- No migration: the existing column grant on `done_at` already allowed any value, and `markDone()` already took `doneAt`.
- Push unchanged (Peer in plan mode): goes out right away with the normal "✅ … erledigt" text, no Edge Function change.

## Consequences
- ➕ "Erledigt am …", "Zuletzt erledigt", the colour dot and later weekday stats show the real day.
- ➕ App-only: works as soon as the frontend is deployed.
- ➖ "Before this week's Wednesday" now reads the picked day: a late chore backdated to Monday or Tuesday no longer counts as "cleaned too late", so this week's owner gets no 🐷 skip offer (`skippable_assignment()` and `lateEnoughToSkip()` both read `done_at`). Intended, since it really was cleaned in time, but it relies on honesty.
- ➖ The DB doesn't check the range; any phone with the WG login could set any `done_at`. Same trust level as marking done (ADR 0007).
- ➖ The push doesn't say it was backdated; the others only see the day in the app.
- Revisit if backdating gets abused for skips, or if the WG wants the day in the push.
