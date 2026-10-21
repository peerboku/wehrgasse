# 09 — Dates, time zones, and automated tests

## 1. The idea

A computer stores time as **one moment** (milliseconds since 1970, in UTC). Humans ask questions in a **calendar**: "which day is it *in Vienna*?" The same moment can be Sunday in London and Monday in Vienna. Two rules keep date code sane:

1. **Convert at the edge, once.** Turn the moment into the calendar date of *the one time zone that matters* (for us: Europe/Vienna, not the phone's zone).
2. **Then do math on plain dates** (`2026-10-26`, no time of day). Plain dates have no daylight saving time, so "add 7 days" is always exactly one week.

Mistakes in date logic are quiet: the app looks fine until the one night a year when the clocks change. That's why we write **automated tests**: small programs that call our functions with tricky inputs and compare against the answer we *know* is right. A test runner (here **Vitest**) runs them all in under a second, as often as we like.

A test is only useful if it **can fail**. So we also break the code on purpose once and watch the right tests go red (a tiny version of "mutation testing").

## 2. In our app

**Install and script:**

```sh
npm install -D vitest@5
npm pkg set scripts.test="vitest run"
```

**The code:** [src/lib/week.ts](../../src/lib/week.ts) (74 lines). The key trick is `viennaDate()`:

```ts
const viennaFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit',
})
```

`Intl` is built into every browser, so we use no date library ([ADR 0005](../decisions/0005-dates-with-intl-no-library.md)). After that, `weekStart()`, `cycleWeek()` and `daysOverdue()` only count whole days.

One JavaScript trap: `-1 % 4` is `-1`, not `3`. This week (19.10.) is one week *before* the anchor (26.10.), so a plain `%` would give cycle week −1. The fix: `((weeks % 4) + 4) % 4`. There's a test for exactly this.

**The rotation** is *data* in [src/lib/mockData.ts](../../src/lib/mockData.ts) (`rotationTemplate`, one row per future DB row), not a formula. The test compares 8 weeks against the table in CLAUDE.md.

**The tests:** [src/lib/week.test.ts](../../src/lib/week.test.ts), real output:

```
 ✓ weekStart > a normal Wednesday belongs to the Monday before
 ✓ weekStart > Sunday 23:59 on the night DST ends (25.10.2026) is still the old week
 ✓ weekStart > Monday 00:30 in Vienna is a new week, although it is still Sunday in UTC
 ✓ weekStart > Sunday 23:59 on the night DST starts (28.03.2027) is still the old week
 ✓ weekStart > Monday 29.03.2027 00:00 in Vienna starts the new week
 ✓ cycleWeek > anchor week is 0, then 1, 2, 3, and back to 0
 ✓ cycleWeek > the week before the anchor is 3, not -1
 ✓ cycleWeek > the DST week in March 2027 is not shifted
 ✓ daysOverdue > the Monday after the week is 1 day overdue
 ✓ daysOverdue > Wednesday after the week is 3 days overdue
 ✓ rotation > gives the right chore to everyone for 8 weeks from 26.10.2026
 ✓ rotation > every cycle week: each member has exactly 1 chore and each chore exactly 1 member

 Tests  12 passed (12)
```

**Does the phone's time zone matter?** It must not. We ran the same tests pretending the computer is in New Zealand and California:

```
$ TZ=Pacific/Auckland npx vitest run      → Tests  12 passed (12)
$ TZ=America/Los_Angeles npx vitest run   → Tests  12 passed (12)
```

**Can the tests fail?** We temporarily changed `'Europe/Vienna'` to `'UTC'`:

```
× Monday 00:30 in Vienna is a new week, although it is still Sunday in UTC
× Monday 29.03.2027 00:00 in Vienna starts the new week
Tests  2 failed | 10 passed (12)
```

Exactly the two "midnight in Vienna is still yesterday in UTC" cases went red, then green again after undoing the change. Good: the tests guard the thing we care about.

## 3. Predict, then run

`TZ` changes the computer's time zone for one command. **Predict**: what does this print, `0` (Sunday) or `1` (Monday)?

```sh
TZ=Europe/Vienna node -e "console.log(new Date('2026-10-25T23:30:00Z').getDay())"
TZ=UTC node -e "console.log(new Date('2026-10-25T23:30:00Z').getDay())"
```

Then explain why `week.ts` never uses `getDay()` on a real moment, only `getUTCDay()` on a plain date.

## 4. What a pro would also do

- **Run tests in CI before deploy**, so a red test blocks the release. Already in ROADMAP "Ideas" (CI hardening).
- **Inject "now"** instead of reading the clock inside functions. Ours take an optional `now` parameter, which is why the tests can pretend it's 2027.
- **Property-based tests** (e.g. fast-check): generate thousands of random moments and check rules like "weekStart is always a Monday". Overkill for 4 functions.

## 5. Sources

- MDN, `Intl.DateTimeFormat` (incl. `timeZone`, `formatToParts`): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat>
- MDN, `Date` (moments vs. calendar): <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date>
- IANA time zone database (where "Europe/Vienna" and its DST rules come from): <https://www.iana.org/time-zones>
- Vitest docs: <https://vitest.dev/guide/>
- TC39 Temporal proposal (the future of dates in JS): <https://tc39.es/proposal-temporal/docs/>

## 6. How we know it's right

- **The machine checks itself**: 12 tests, green in 3 different computer time zones, and red when we broke the time zone on purpose.
- **An outside source of truth**: the expected values come from the CLAUDE.md table and the official DST dates (last Sunday of October/March, EU rule), not from running our own code.
- **Later, the database**: in Phase 3, `ensure_current_week()` in Postgres computes the same week. If app and DB ever disagree, the Overview would show no chores, so it can't fail silently.

## 7. Check yourself

1. Why does `week.ts` convert to a Vienna date *before* subtracting days, not after?
2. What would the app show this week (19.10.) if we had used plain `%` in `cycleWeek()`?
3. Why is "it passed" not enough proof that a test is good?

<details><summary>Answers</summary>

1. After the conversion we have a plain date without hours, so subtracting days can't cross a DST hour shift or land on the wrong side of midnight.
2. Cycle week −1: no rotation row matches, so nobody would have a chore.
3. A test that can't fail proves nothing. We broke the code on purpose and saw exactly the expected tests fail.

</details>

## 8. Your notes

> _Explain to Carla in two sentences why "Sunday 23:59 in Vienna" can be a different day on a server._
>
>
