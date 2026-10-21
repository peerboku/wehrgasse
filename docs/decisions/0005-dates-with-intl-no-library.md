# 0005 — Week math with built-in `Intl`, no date library

**Status:** Accepted, 2026-10-21

## Context
Every screen depends on one question: *which Monday–Sunday week in Europe/Vienna is it right now?* The answer must not depend on the phone's time zone and must survive daylight saving time changes (25.10.2026, 28.03.2027). The rotation itself is data (`rotation_template`); the code only needs "Vienna date of now", "Monday of that date", "weeks since anchor", "days overdue".

Alternatives considered:
- **date-fns + date-fns-tz**: popular and well tested, but two extra dependencies and an API to learn for four small functions.
- **Luxon**: excellent time zone support, but ~70 KB for the same four functions.
- **Temporal** (the new built-in date API): the cleanest model (`Temporal.PlainDate`), but browser support is still uneven, so it would need a polyfill on iPhones.
- **Built-in `Intl.DateTimeFormat`** with `timeZone: 'Europe/Vienna'`: in every browser and Node, no download.

## Decision
`src/lib/week.ts` converts a moment to its Vienna calendar date **once** with `Intl.DateTimeFormat(...).formatToParts`, then does all math on plain `'YYYY-MM-DD'` dates via whole day numbers. Plain dates have no time of day, so DST can't move a week boundary. Vitest tests pin the DST weeks and the 8-week rotation.

## Consequences
- ➕ Zero dependencies; the whole logic is ~70 lines a beginner can read.
- ➕ The same `'YYYY-MM-DD'` strings are what Postgres stores in `assignments.week_start`.
- ➖ We own the correctness, which is why the tests are required (CLAUDE.md).
- ➖ If we ever need more date features (formatting durations, recurring rules), revisit: Temporal first, once Safari supports it.
