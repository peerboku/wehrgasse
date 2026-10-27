# 19 — Fixing data by hand: a reset, undoing "erledigt", and an append-only log

## 1. The idea

A database holds two kinds of data:

- **Structure and reference data**: tables, functions, triggers, but also the 4 members, 4 chores and the rotation template. These live in **migrations**, so every change is a file in git and can be replayed from zero.
- **Runtime data**: rows the app writes while people use it, e.g. `assignments.done_at` and `events`. These are *not* in migrations. A migration that says "delete Carla's done mark from Tuesday" would make no sense when replayed on a new database.

So fixing runtime data is a **direct SQL statement against the live database**, not a migration. That's powerful and has no undo, so three habits help:

1. **Look before you change.** First a `select` with the same `where` clause, then the `update`/`delete`.
2. **One transaction.** `begin; … commit;`: either every statement happens or none does. If something looks wrong, `rollback;` instead of `commit;`.
3. **`returning`**: `update … returning id, done_at` shows exactly which rows were hit.

The app's role (`authenticated`) can't do most of this on purpose: it has no `delete` on `events` and may only touch `done_at`/`done_by` on `assignments`. The **dashboard SQL editor** and **`supabase db query --linked`** run as a privileged database role. RLS and the revoked grants don't apply there. "`events` is append-only" is a promise the *app* can't break; you, at the SQL prompt, can.

**Watch the triggers.** A trigger fires no matter who runs the statement, the app or you in the SQL editor:

| You change … | Trigger | Push? |
|---|---|---|
| `done_at` from `null` to a time | `notify_done` | ✅ to the other 3 |
| `done_at` from a time back to `null` | `notify_done` has `when (old.done_at is null and new.done_at is not null)` | ❌ |
| `member_id` | `notify_taken_over` | ✅ to everyone except the new owner |
| `delete` or `insert` rows | both only fire on `update` | ❌ |

## 2. In our app

### The reset (Tue 27.10.2026)

Peer asked for a database reset. There is only one database, the cloud one ([ADR 0008](../decisions/0008-migrations-straight-to-cloud.md)); `supabase status` failed because Docker isn't running, which confirms there's no local stack. Three options were possible:

| Option | Keeps |
|---|---|
| **Clear test data** (chosen) | schema, members, chores, template, login, avatars, push subscriptions |
| … plus push subscriptions | same, but every phone has to tap "Benachrichtigungen aktivieren" again |
| `supabase db reset --linked` | nothing: drops everything and replays all migrations. Hand-made dashboard setup (Vault secrets for the webhook) would have to be redone |

No backup was taken (Peer: everything in there was test data).

**Look first:**

```
$ supabase db query --linked "select 'assignments' t, count(*) from assignments union all select 'events', count(*) from events union all select 'push_subscriptions', count(*) from push_subscriptions union all select 'members', count(*) from members;"
assignments 4 · events 40 · push_subscriptions 1 · members 4
```

**Then change, in one transaction:**

```
$ supabase db query --linked "begin; delete from public.assignments; delete from public.events; select public.ensure_current_week(); commit;"
{ "rows": [ { "ensure_current_week": "" } ] }
```

`""` is what a function that returns `void` looks like. `ensure_current_week()` built this week's 4 rows fresh from the template, all open.

**A surprise:** a second command with *two* `select`s (assignments, then the events count) printed only `{ "events": 0 }`. **`supabase db query` shows the result of the last statement only.** So: one `select` per command if you want to see it.

**Check:**

```
week_start  chore                 member  done_at
2026-10-26  Müll rausbringen      Peer    null
2026-10-26  Bad Noa & Manu        Noa     null
2026-10-26  Bad Carla & Peer      Carla   null
2026-10-26  Küche & Staubsaugen   Manu    null
```

That's cycle week 0 from the table in `CLAUDE.md`. `events` is 0.

### Recipe: undo "erledigt" (someone tapped by mistake)

Run in the dashboard (**SQL Editor**) or with `supabase db query --linked "…"`.

**1. Find the row:**

```sql
select a.id, a.week_start, c.name as chore, m.name as member, a.done_at
from assignments a
join chores c on c.id = a.chore_id
join members m on m.id = a.member_id
where a.done_at is not null
order by a.done_at desc
limit 5;
```

**2. Reopen it, and remove the events that belong to that tap**, in one transaction:

```sql
begin;

update assignments
set done_at = null, done_by = null
where id = '<assignment id>'
returning id, done_at;

delete from events
where payload->>'assignment_id' = '<assignment id>'
  and (
    type = 'chore_done'
    or (type in ('push_sent', 'push_failed') and coalesce(payload->>'kind', 'done') = 'done')
  )
returning id, type;

commit;
```

- `payload->>'assignment_id'` reads a field from the `jsonb` column as text. The app logs `chore_done` with `{ assignment_id }` ([`src/App.tsx`](../../src/App.tsx)); `notify-done` logs `push_sent`/`push_failed` with `{ kind, assignment_id, subscription_id }` ([`supabase/functions/notify-done/index.ts`](../../supabase/functions/notify-done/index.ts)).
- `coalesce(…, 'done')`: push events from before the take-over feature have no `kind`. They were all "done" pushes.
- No push goes out (see the trigger table above). The other 3 still have the "✅ … erledigt" notification on their phones; tell them in the flat chat.
- If the owner later taps "erledigt" for real, the others get a second push. That's correct.

**Without SQL:** dashboard → **Table Editor** → `assignments` → double-click `done_at` and `done_by` → set to `NULL`. Same effect, no push. The events stay unless you delete them in `events` by hand.

### Recipe: undo a take-over

Setting `member_id` back **sends a push** ("🔄 Peer übernimmt …", even though it's an undo). To fix it silently, switch that one trigger off inside the transaction:

```sql
begin;
alter table assignments disable trigger notify_taken_over;

update assignments
set member_id = '<old member id>'
where id = '<assignment id>'
returning id, member_id;

alter table assignments enable trigger notify_taken_over;
commit;
```

`alter table` is transactional in Postgres: if anything fails, the trigger is back on after the rollback. Then delete the matching events like above, with `type = 'assignment_swapped'` and `kind = 'taken_over'`.

**Tested 27.10.** The `update`, `delete` and both `alter table` lines ran against the live database with a made-up id (`00000000-…`) inside `begin; … rollback;`. No error, nothing changed, and afterwards both triggers showed `tgenabled = O` (enabled).

### Should we ever delete from `events`?

`CLAUDE.md` says `events` is append-only, and the "push test matrix" idea in `ROADMAP.md` says "nothing gets deleted". Today we deleted 40 rows anyway. That's no contradiction: the rule protects the **statistics** (built from `events` + `assignments`), and test data or a mis-tap would make them wrong. Deleting the events that belong to a mistake keeps them right.

The more careful way (accountants and "event sourcing" do it like this) is to never erase and instead append a **correcting event**, e.g. `chore_reopened`. Then history shows both the mistake and the fix. That needs a new event type, so it's in `ROADMAP.md` → Ideas, not built.

## 3. Predict, then run

In the dashboard **Table Editor**, look at `assignments` and pick your own open chore. Write down first: if you set `done_at` to now **here in the dashboard** (not in the app), does anyone get a push? Does an `events` row appear?

Then do it, check the phones and the `events` table, and undo it with the recipe above.

<details><summary>What happens</summary>

The others get a push: the trigger doesn't care who made the change. But there is **no** `chore_done` event. The app writes that one ([`src/App.tsx`](../../src/App.tsx), `logEvent('chore_done', …)`), and you skipped the app. You'll see `push_sent` events, though, because the Edge Function writes those.

</details>

## 4. What a pro would also do

- **A backup before every hand edit**: `supabase db dump --linked --data-only -f backup.sql`. We skipped it today because everything was test data. Once there is real history, take it every time; it costs 10 seconds.
- **An admin function** `reopen_assignment(id)` in a migration, so the fix is one tested call instead of a recipe you copy. Worth it the third time you need it.
- **Correcting events instead of deleting** (see above).
- **Local stack** to try a statement first ([ADR 0008](../decisions/0008-migrations-straight-to-cloud.md) says "revisit when there is real data").

## 5. Sources

- PostgreSQL: [`BEGIN`](https://www.postgresql.org/docs/current/sql-begin.html), [`ROLLBACK`](https://www.postgresql.org/docs/current/sql-rollback.html)
- PostgreSQL: [`UPDATE … RETURNING`](https://www.postgresql.org/docs/current/sql-update.html), [`DELETE … RETURNING`](https://www.postgresql.org/docs/current/sql-delete.html)
- PostgreSQL: [`ALTER TABLE … DISABLE TRIGGER`](https://www.postgresql.org/docs/current/sql-altertable.html)
- PostgreSQL: [JSON operators (`->>`)](https://www.postgresql.org/docs/current/functions-json.html)
- Supabase CLI: [reference](https://supabase.com/docs/reference/cli/introduction) and `supabase db query --help` (we used CLI v2.121.0)

## 6. How we know it's right

- **The database, after the reset:** 4 open rows for 2026-10-26 that match cycle week 0 in `CLAUDE.md`; `events` count 0 (output above).
- **Postgres parsed the recipes:** the dry run with a fake id inside `begin; … rollback;` raised no error; `pg_trigger` showed both triggers enabled afterwards.
- **The trigger table** comes from the `when` clauses in [`20261027150000_push_webhook.sql`](../../supabase/migrations/20261027150000_push_webhook.sql) and [`20261027180000_take_over.sql`](../../supabase/migrations/20261027180000_take_over.sql).
- ⏳ **A real undo** of a real mis-tap hasn't happened yet. The first time it does, paste the `returning` output here.

## 7. Check yourself

1. Why was the reset a SQL command and not a new migration file?
2. Carla tapped "erledigt" on the wrong chore. You set `done_at` back to `null`. Who gets a push?
3. Why does the app's `logEvent()` fail if it tries to delete an event, while your SQL editor succeeds?

<details><summary>Answers</summary>

1. Migrations describe structure and fixed reference data and get replayed on every new database. Deleting today's test rows is a one-off change to runtime data; replaying it later would make no sense.
2. Nobody. `notify_done` only fires when `done_at` goes from `null` to a value.
3. The app runs as `authenticated`, which has no `delete` grant on `events`. The SQL editor runs as a privileged role that RLS and grants don't restrict.

</details>

## 8. Your notes

> _Explain to Noa, in two sentences, why "append-only" doesn't mean "nobody can ever delete anything":_
>
>
