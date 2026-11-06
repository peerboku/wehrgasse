# 21 — "Überspringen": one rule in two languages, and a flag instead of a new state

## 1. The idea

A **business rule** is a sentence the users agreed on, e.g. "if last week's chore is only done on Wednesday or later, this week's person may skip it". Turning it into code means answering three questions:

1. **Where is the rule enforced?** Only the database can really enforce it: the app runs on four phones and can have bugs (or old versions). The app may know the rule too, but only to *show* things (here: whether the button appears).
2. **How is the result stored?** Adding a new state to an existing table touches every place that reads that table. The trick is to pick a shape where most of those places keep working unchanged.
3. **How do "Wednesday" and "this week" stay correct across time zones?** Same as [chapter 09](09-dates-timezones-and-tests.md): compute calendar days in Europe/Vienna, never in UTC.

When a rule exists in two languages (SQL for enforcing, TypeScript for showing), they can drift apart. The cheap protection: one sentence that defines the rule, comments that point from each copy to the other, and tests for the copy that can be tested easily.

## 2. In our app

**The rule, as one sentence** (written into [CLAUDE.md](../../CLAUDE.md) and [ADR 0015](../decisions/0015-skip-after-late-cleaning.md)): this week's **open** row of chore X may be skipped by its owner if an **older** row of X was marked done **this week, Wednesday 00:00 Europe/Vienna or later**.

**Decisions Peer made first** (in plan mode, before any code): a button rather than an automatic skip; a push with the 🐷 text to this week's owner; a push to the other 3 on skip. Why a `skipped` flag on the "done" row instead of a separate `skipped_at` column: [ADR 0015](../decisions/0015-skip-after-late-cleaning.md).

**The database part**, [migration 20261101120000](../../supabase/migrations/20261101120000_skip_after_late.sql):

```sql
alter table public.assignments add column skipped boolean not null default false;
```

`not null default false` fills every existing row with `false`, so no row is ever "unknown". The app has an update grant only on `done_at`/`done_by` ([schema](../../supabase/migrations/20261024100000_schema.sql)), so it can't set `skipped` itself. That goes through two functions:

- `skippable_assignment(chore_id)`: the rule in SQL. Returns the id of this week's open row if an older row was done since Wednesday, else `null`. The key line:
  ```sql
  late.done_at >= (a.week_start + 2)::timestamp at time zone 'Europe/Vienna'
  ```
  `week_start + 2` = Wednesday (a date), `::timestamp` = Wednesday 00:00 without a zone, `at time zone 'Europe/Vienna'` = "that wall-clock time in Vienna", which turns it into a real moment (`timestamptz`).
- `skip_week(assignment_id, member_id)`: a copy of the [take_over()](../../supabase/migrations/20261027180000_take_over.sql) pattern ([chapter 17](17-take-over-rpc-and-second-push.md)). One `update … where`, and `if not found then raise exception`.

A skip sets `done_at`, `done_by` **and** `skipped = true`. Effect: everything that asks "is it closed?" keeps working (overdue list, wheel, "2 von 4 erledigt", `take_over()`), and the existing `notify_done` trigger fires on its own, so no trigger had to change.

**The push**, [notify-done](../../supabase/functions/notify-done/index.ts): `notifyDone()` now also reads `week_start, skipped`.
- `skipped = true` → looks up who cleaned too late, sends "⏭️ Carla überspringt diese Woche Müll rausbringen (Peer hat zu spät geputzt)" to everyone except Carla.
- otherwise it asks the database `rpc('skippable_assignment', …)`. If that row exists, is from a newer week than the one just done, and belongs to someone else, that person gets the 🐷 text and the rest get the normal "✅". `notifyAllExcept` now takes a list of people, and a small `notifyOnly` sends to one person.

**The app part:**
- [week.ts](../../src/lib/week.ts) `lateEnoughToSkip(late, currentWeek)`: the same rule in TypeScript, with 8 new tests in [week.test.ts](../../src/lib/week.test.ts) (Tuesday 23:59 vs. Wednesday 00:00 Vienna, done on time, two weeks late, done last week, the DST week 29.03.2027).
- The app already loads "the newest done row per chore" for "Zuletzt erledigt" (`loadLastDone()`). That is exactly the row the rule needs, so **no new query**. `loadLastDone()` now ignores skipped rows, otherwise a skip would hide the late row (and "Zuletzt erledigt" would name the person who *didn't* clean).
- [MyWeek.tsx](../../src/screens/MyWeek.tsx): message box + "Überspringen" button on the open card, confirm sheet, then "Übersprungen 😎". [Overview.tsx](../../src/screens/Overview.tsx): the wheel slot says "übersprungen". Event `chore_skipped` in [App.tsx](../../src/App.tsx).
- All texts in [strings.ts](../../src/lib/strings.ts) and, for collecting more variants, [docs/texts.md](../texts.md) sections 1.3, 1.4, 2.3, 4.6, 4.7.

**Checks, real output:**

```
$ npx vitest run
      Tests  31 passed (31)          ← 23 before + 8 new
$ npx tsc -b && echo TSC-OK
TSC-OK
$ npm run lint
> oxlint                              ← no findings
$ npm run build
PWA v2.0.0
mode      injectManifest
precache  12 entries (558.14 KiB)
```

**Stumbles:**
- `deno check supabase/functions/notify-done/index.ts` → `deno not found`. Deno isn't installed on the laptop, so the Edge Function only gets type-checked when `supabase functions deploy` bundles it.
- WebKit screenshots (same throwaway preview as [chapter 18](18-design-tokens-and-the-wheel.md), in the session's scratch folder, not in the repo): `npm i playwright@1.58.2` wanted WebKit revision 2248, but the laptop's cache only had `webkit-2370`. Each Playwright version is pinned to one browser build. Looking up `browsers.json` for the newest versions showed `1.64.1 → 2370`, and that one worked without a download.
- The preview showed "Zuletzt erledigt vor **-3** Tagen". Not a bug: the fake data was dated 04.11. while the laptop's clock said 01.11. Negative days only happen with dates from the future.
- In the wheel, "du · übersprungen" wraps onto two lines (it's longer than "erledigt"). Readable, left as is; worth a look in the "bigger text" check on the iPhone.

## 3. Predict, then run

Write down first: what does Postgres print for Wednesday 00:00 in Vienna in the week of 02.11.2026? Which date and hour, in UTC?

Then run it in the Supabase SQL editor (it only reads, it changes nothing):

```sql
select (date '2026-11-02' + 2)::timestamp at time zone 'Europe/Vienna';
```

<details><summary>What happens</summary>

`2026-11-03 23:00:00+00`: **Tuesday** 23:00 in UTC. In November Vienna is UTC+1, so Vienna's midnight is an hour earlier in UTC. If the SQL compared with `'2026-11-04'::timestamptz` (midnight UTC), someone tapping "erledigt" on Wednesday at 00:30 Vienna time wouldn't count yet. The test "done Wednesday 00:00 in Vienna is late enough, although it is still Tuesday in UTC" checks exactly that on the TypeScript side.

</details>

## 4. What a pro would also do

- **One source for the rule:** let the app call `skippable_assignment()` too (via a view or RPC) instead of having a TypeScript copy. We skip it: the app already has the data, and the TS copy has tests.
- **Tests for the SQL** with [pgTAP](https://pgtap.org) against a local database (`supabase test db`). Needs the local Docker stack we decided against ([ADR 0008](../decisions/0008-migrations-straight-to-cloud.md)).
- **An enum/status column** (`open | done | skipped`) instead of `done_at` + flag, if more states come (e.g. "away").

## 5. Sources

- PostgreSQL: [`AT TIME ZONE`](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT), [`date_trunc`](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC)
- PostgreSQL: [`CREATE FUNCTION … SECURITY DEFINER`](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY), [`ALTER TABLE … ADD COLUMN … DEFAULT`](https://www.postgresql.org/docs/current/sql-altertable.html)
- Supabase: [Database functions / RPC](https://supabase.com/docs/guides/database/functions), [`.rpc()` in supabase-js](https://supabase.com/docs/reference/javascript/rpc)
- Playwright: [browser versions per release](https://playwright.dev/docs/release-notes)

## 6. How we know it's right

- **Vitest** (a machine): 8 tests for the edges of the rule, including the hour where UTC and Vienna disagree, and a DST week.
- **TypeScript + oxlint + build**: every place that reads an `Assignment` had to handle the new `skipped` field, or `tsc` would have failed (e.g. `mockData.ts`).
- **WebKit screenshots** (Safari's engine, iPhone 13 size, light + dark): offer box, confirm sheet, "Übersprungen 😎", wheel with "übersprungen". No page errors.
- ⏳ **The database itself:** after `supabase db push`, `select skippable_assignment(id) from chores;` must return 4 × `null` (nothing is late yet).
- ⏳ **The real case:** earliest Wed 04.11. If a week-26.10. chore is still open and gets done then: 🐷 push to this week's owner, button visible, skip → ⏭️ push to the other 3, `events` has `chore_skipped` and `push_sent` rows with `kind` `skip_offer` / `skipped`.

## 7. Check yourself

1. Why does a skip set `done_at` too, instead of only `skipped = true`?
2. Why did `loadLastDone()` have to ignore skipped rows? Name two things that would have gone wrong.
3. Peer cleans the 26.10. bathroom on Tuesday 03.11. evening but only taps "erledigt" on Wednesday morning. What happens, and which idea in ROADMAP would fix it?

<details><summary>Answers</summary>

1. So every existing "closed?" check keeps working: otherwise the skipped row would show as overdue next week, stay takeable in the wheel, and not count in "x von 4 erledigt". And the `notify_done` trigger fires on its own.
2. "Zuletzt erledigt" would name the person who skipped (who didn't clean); and the skip rule in the app reads that same row, so after a skip it would no longer find the late row (the push text "… ({late} hat zu spät geputzt)" needs it too).
3. A skip is offered, because `done_at` is the moment of the tap (Wednesday). The "Heute oder gestern erledigt?" idea would let Peer say "gestern", then `done_at` would be Tuesday and no skip would be offered.

</details>

## 8. Your notes

> _Explain to Noa, in two sentences, when the "Überspringen" button shows up and why it disappears on Monday:_
>
>
