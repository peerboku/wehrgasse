# 0012 — New look: Design 3 "Knautsch × Drehscheibe"

**Status:** Accepted, 2026-10-27.

## Context
After the hallway test the app worked, but looked like a default iOS list. Peer made 3 design proposals in claude.ai design (input: screenshots of every screen, `index.css`, `strings.ts`, the screens and their CSS modules). The WG picked **Design 3**: chunky "Knautsch" buttons with a hard 3D edge, and the WG tab as a chore wheel ("Drehscheibe") instead of a list. The handoff package is in [`docs/wg-app-design3-handoff/`](../wg-app-design3-handoff/HANDOFF.md).

Choices made while implementing it:

**Where does the "Ab Montag" preview come from?**
- Next week's `assignments` rows: don't exist yet, `ensure_week()` only creates the current week. Creating them early would need a migration and a change to the cron job.
- **`rotation_template`** (chosen): already readable by the WG login, loaded once with the other data. `take_over()` only changes this week's row, so for next week the template *is* the truth.

**What happens to "fällig bis Sonntag, 1. Nov." (hallway test fix #2)?**
- Keep it as a line under the week range.
- **Drop it** (chosen, Peer): the deadline is always Sunday, and the "noch 4 Tage" chip on Meine Woche already says how much time is left.

**What happens to "zuletzt gestern" on open rows of the old WG list?** The wheel has no room for it. Peer's idea: a **"Zuletzt erledigt" card** under the wheel, one row per chore ("gestern von Carla", "noch nie"). Not on the canvas, drawn in the same card style.

**Two chores in one week (after a take-over):** one hero card per chore, the fixed Erledigt button acts on the first open one and then says which ("Erledigt: Müll rausbringen").

## Decision
Copy the drop-in CSS from the handoff (tokens, buttons, tab bar, sheet, confetti, login), rewrite the markup of Meine Woche, WG and Einstellungen. Still plain CSS modules (ADR 0006), all colours via tokens, dark mode via `prefers-color-scheme`.

## Consequences
- ➕ The core flow is even shorter to find: the Erledigt button is fixed above the tab bar, never scrolled away.
- ➕ The wheel shows the whole week at a glance, and "my" slice is always on top.
- ➖ Overdue cards on Meine Woche stay **below** this week's card (hallway test fix #3), although the handoff put them above.
- ➖ Uses `color-mix()` (iOS 16.2+). Push already needs iOS 16.4, so no phone is lost.
- ➖ The wheel's labels get tight above 6 chores; we have 4.
