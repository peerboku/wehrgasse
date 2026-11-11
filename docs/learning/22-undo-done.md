# 22 — "Doch nicht erledigt?": undo without a migration, and correcting an append-only log

## 1. The idea

**Undo** comes in two common shapes:
- **Toast undo** (Gmail's "Rückgängig" for a few seconds): catches mis-taps only, disappears on its own.
- **Reversible state**: the thing just stays undoable for a while (here: until the week ends).

Either way, two questions come up in a database-backed app:

1. **Does the database already allow it?** Before writing a migration, read the rights you already granted. Rights + policies often allow more than you remember, in both directions: sometimes that saves a migration, sometimes it's a hole.
2. **What happens to the log?** An **append-only log** (an event log, a bank statement, git history) is never edited. A mistake gets a *correcting entry*: the bank books a reversal instead of erasing the payment. Whoever reads the log later (our statistics) has to understand the reversal.

## 2. In our app

**Decisions Peer made first** (plan mode, 11.11.): the undo sits on your green done card in "Meine Woche" until Sunday, not as a toast; no push to the others; only "Erledigt", not "Überspringen". After seeing the plan, Peer asked for a **colour cue** on the link, so it became an orange pill with an arrow icon. Why the rest: [ADR 0016](../decisions/0016-undo-done-in-app.md).

**Why no migration was needed.** The first migration ([schema](../../supabase/migrations/20261024100000_schema.sql)) already says:

```sql
grant update (done_at, done_by) on public.assignments to authenticated;
create policy "wg can mark done" on public.assignments for update to authenticated
  using (true)
  with check (done_by is null or done_by = member_id);
```

`done_by is null` passes the check, so the app may set both columns back to `null`. `skipped` is not in the grant, so a skipped row can't be reopened even if the app wanted to. And the push trigger ([push_webhook](../../supabase/migrations/20261027150000_push_webhook.sql)) only fires `when (old.done_at is null and new.done_at is not null)`: undo (done → open) sends nothing, and a later "Erledigt" sends the normal push again.

**The code:**
- [data.ts](../../src/lib/data.ts) `undoDone()`: `update({ done_at: null, done_by: null })` where `id`, `done_by = me`, `skipped = false`, then `.select('id')`. Without `.select()`, an update that matches **no** row is not an error in Supabase, it just changes nothing. With it, we get the changed rows back and throw if there are none (e.g. already reopened on another phone), so the app reloads instead of showing something false.
- [App.tsx](../../src/App.tsx) `handleUndoDone()`: same pattern as `handleMarkDone()` (show it right away, then ask the server), logs `chore_reopened` with the old `done_at`, then reloads so "Zuletzt erledigt" is right again.
- [MyWeek.tsx](../../src/screens/MyWeek.tsx): pill under "Du hast frei bis Montag. 😎", only if `!assignment.skipped`; tap → the existing `ConfirmSheet`; confirm also stops the confetti, so the Erledigt button is back at once.
- [Icons.tsx](../../src/components/Icons.tsx) `UndoIcon` (not `RotateIcon`: that one already means "next week"). [MyWeek.module.css](../../src/screens/MyWeek.module.css) `.undoLink`: `--pastel` background, `--primary-ink` text. Orange = "something to tap" in Design 3, green stays "done". Both tokens have dark values in [index.css](../../src/index.css), so dark mode needed no extra rule.
- Texts in [strings.ts](../../src/lib/strings.ts), variants to collect in [texts.md](../texts.md) 2.4 and 4.8.

**The log.** `events` stays append-only for the app: the `chore_done` row stays, a `chore_reopened` row is added. Statistics count a chore as done only if its newest `chore_done` isn't followed by a `chore_reopened` with the same `assignment_id` (or simpler: they read `assignments.done_at`, which is `null` again). [Chapter 19](19-fixing-data-by-hand.md)'s delete-the-events recipes are still the way for mistakes the app can't undo (overdue rows, skips, take-overs).

**Checks, real output (11.11.):**

```
$ npm run lint      → lint=0 (no findings)
$ npx tsc -b        → tsc=0
$ npm run test
 Test Files  1 passed (1)
      Tests  31 passed (31)
$ npm run build
PWA v2.0.0
mode      injectManifest
precache  12 entries (559.86 KiB)
```

No new tests: CLAUDE.md asks for Vitest only for week/rotation logic, and undo adds none.

**WebKit screenshots** (throwaway preview in the session's scratch folder, like [chapter 18](18-design-tokens-and-the-wheel.md): `MyWeek` with fake data and a small wrapper that really flips `done_at`, Playwright 1.64.1, iPhone 13 size, light + dark):

```
light undo pill 193 x 44
light Erledigt button back: true
light undo on skipped card: 0
light page errors: none
dark  … same
```

**Stumbles:**
- First run: `page.waitForSelector: Timeout 30000ms exceeded`. The page was empty, the console said `VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing`: importing `MyWeek` pulls in `strings.ts` → … → `supabaseClient.ts`, which refuses to start without keys. Chapter 18 already had the answer: a `.env` with fake keys in the preview folder.

## 3. Predict, then run

Write down first: what does Supabase return for an update whose `where` matches **no** row: an error, or something else?

Then, in the browser console of the running app (logged in), with an id that doesn't exist:

```js
const { supabase } = await import('/wehrgasse/src/lib/supabaseClient.ts')
await supabase.from('assignments').update({ done_at: null, done_by: null }).eq('id', '00000000-0000-0000-0000-000000000000')
await supabase.from('assignments').update({ done_at: null, done_by: null }).eq('id', '00000000-0000-0000-0000-000000000000').select('id')
```

(Only works with `npm run dev`, not in the built app.) Compare `error` and `data` of both.

## 4. What a pro would also do

- **Enforce "this week, own row" in the database** with an `undo_done()` function, like `take_over()`. Skipped because the policy is already `using (true)` for marking done (ADR 0007, one shared login): the DB can't tell who is who anyway.
- **An "undo" in the push**: a second notification "↩️ Carla hat … doch nicht erledigt". Peer chose no push; revisit if someone gets confused by a "✅" for a chore that's open again.
- **A stats view** (`create view done_events …`) that already subtracts reopened ones, so nobody forgets it in week 6.

## 5. Sources

- Supabase JS: [`update()`](https://supabase.com/docs/reference/javascript/update) (returns the rows only with `.select()`)
- PostgreSQL: [GRANT, column privileges](https://www.postgresql.org/docs/current/sql-grant.html), [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) (`USING` vs. `WITH CHECK`)
- PostgreSQL: [CREATE TRIGGER, `WHEN` condition](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- Martin Fowler: [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) (reversal events instead of edits)
- Apple HIG: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) (44 pt touch target)

## 6. How we know it's right

- **Machines:** lint, `tsc`, 31/31 tests, build (above). `tsc` would have failed if `MyWeek` got the new prop without `App.tsx` passing it.
- **WebKit** (Safari's engine): pill visible and 44 px high, sheet opens, after "Ja, wieder öffnen" the card is open and the Erledigt button is back, skipped card has no pill, light + dark, no page errors.
- **The database rules themselves** (grant, policy, trigger `when`) are read from the migrations, not tested against the live DB yet.
- ⏳ **Peer on the iPhone, against the live DB:**
  1. Mark your chore done → the others get "✅" as usual.
  2. Tap "Doch nicht erledigt?" → "Ja, wieder öffnen" → card is open, "noch X Tage" is back.
  3. On a second phone (or laptop) the WG tab shows the slice open again, without reloading.
  4. Nobody gets a new push.
  5. `supabase db query --linked "select id, type, payload from public.events order by id desc limit 3;"` → `chore_reopened` on top, `chore_done` below.
  6. Mark done again → normal "✅" push arrives again.

## 7. Check yourself

1. Why could the app reset `done_at` without any new grant, but not `skipped`?
2. Why does `undoDone()` end with `.select('id')`?
3. Why does undo send no push, even though no code says "don't send a push on undo"?

<details><summary>Answers</summary>

1. The column grant covers only `done_at` and `done_by`, and the policy's `with check` allows `done_by is null`. `skipped` isn't in the grant, so Postgres refuses to change it before RLS is even asked.
2. An update that matches no row is not an error in Supabase. `.select()` returns the changed rows, so "0 rows" can be turned into an error, and the app reloads instead of showing a state the server doesn't have.
3. The `notify_done` trigger has `when (old.done_at is null and new.done_at is not null)`. Undo goes the other way (not null → null), so the trigger never fires.

</details>

## 8. Your notes

-
