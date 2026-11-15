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

### Recipe: a chore from a week before launch, done late (Sun 1.11.2026)

Carla did her "Küche & Staubsaugen" and Peer his "Bad Carla & Peer" from the week of **19.10.**, late, on Tue 27.10. and Fri 30.10. Nobody could tap: the app starts at the anchor week 26.10., so 19.10. has no rows at all (`ensure_current_week()` does nothing before the anchor).

**First try was wrong.** "Done on 27.10." made me (Claude) look in the week that contains 27.10., which is 26.10. There, Küche belongs to Manu and Bad Carla & Peer to Carla, so it looked like a take-over. I moved both rows to the doer, marked them done and wrote `assignment_swapped` + `chore_done` events. Peer: "these are the chores from last week". The clue I should have checked first: **19.10. is cycle week 3, and there Carla has Küche and Peer has Bad Carla & Peer**, exactly who did them. The done date says *when* someone finished it. It doesn't tell you *which week* the chore belongs to (overdue rule "B").

**The fix, in one transaction**:

```sql
begin;
alter table public.assignments disable trigger notify_done;
alter table public.assignments disable trigger notify_taken_over;  -- undoing the member_id change would push

-- undo the wrong first try: this week's 2 rows back to their owner, open again
update public.assignments set member_id = '<old owner>', done_at = null, done_by = null
where id = '<this week's row>' and member_id = '<doer>';
delete from public.events where payload->>'source' = 'manual';

-- week 19.10.: insert only the 2 chores that were done (open ones would show as red "überfällig")
insert into public.assignments (week_start, chore_id, member_id, done_at, done_by)
values ('2026-10-19', '<chore>', '<member>', timestamptz '2026-10-27 12:00 Europe/Vienna', '<member>'), (…);

-- the event the app writes on "erledigt", plus "source": "manual" to find hand-entered rows
insert into public.events (created_at, member_id, type, payload)
select done_at, member_id, 'chore_done', jsonb_build_object('assignment_id', id, 'source', 'manual')
from public.assignments where week_start = '2026-10-19';

alter table public.assignments enable trigger notify_done;
alter table public.assignments enable trigger notify_taken_over;
commit;
```

- `insert` fires no trigger (table at the top), so no push. Times are 12:00 Vienna because only the dates were known.
- Each run first ended in `rollback;` (dry run), then again in `commit;`.

**Surprise:** `supabase db dump --linked --data-only` (the "backup first" habit) needs Docker: `DockerRunError … Cannot connect to the Docker daemon`. With Docker off, the backup was a `select` of the rows before the change.

**Result:**

```
week_start  chore                 member  done (Vienna)        manual events
2026-10-19  Bad Carla & Peer      Peer    2026-10-30 12:00     1
2026-10-19  Küche & Staubsaugen   Carla   2026-10-27 12:00     1
2026-10-26  Müll rausbringen      Peer    –                    0
2026-10-26  Bad Noa & Manu        Manu    2026-11-01 15:58     0
2026-10-26  Bad Carla & Peer      Carla   –                    0
2026-10-26  Küche & Staubsaugen   Manu    –                    0
pg_trigger: notify_done O, notify_taken_over O · push_* events in the last 30 min: 0
```

### Recipe: remove a done row completely (Sat 7.11.2026)

Peer asked to remove Carla's "Bad Carla & Peer" from the week of **26.10.** (marked done Sun 1.11. 20:19), so that "Zuletzt erledigt" shows **Peer, 30.10.** again and Carla sees nothing overdue.

**Why not the "undo erledigt" recipe?** That sets `done_at` back to `null`, and a past week's open row is rule "B": Carla would get a red "überfällig seit 13 Tagen". "Zuletzt erledigt" comes from `assignments` (`loadLastDone()` in [`src/lib/data.ts`](../../src/lib/data.ts)), not from `events`, so deleting only the event would change nothing on screen. So: **delete the whole row** plus its events. The week then simply has no entry for that chore. The hourly cron won't bring it back: `ensure_current_week()` only creates rows for the current week.

**Look first:** the row (`837d69ed-…`) and its events: #125 `chore_done`, #126–128 `push_sent`. That printed output was the backup (Docker off, so no `db dump`).

**Dry run, then for real:**

```
$ supabase db query --linked "begin; delete from public.assignments where id = '837d69ed-…'; delete from public.events where id in (125,126,127,128) and payload->>'assignment_id' = '837d69ed-…' returning id, type; rollback;"
→ 125 chore_done · 126 push_sent · 127 push_sent · 128 push_sent

$ supabase db query --linked "begin; delete from public.events where id in (125,126,127,128) and payload->>'assignment_id' = '837d69ed-…'; delete from public.assignments where id = '837d69ed-…' returning id, week_start; commit;"
→ 837d69ed-… 2026-10-26
```

The two `where` conditions on the event delete are a seatbelt: a mistyped id can't delete some other assignment's event. The order of the statements was switched for the real run so that the last `select`-like output (the only one `db query` prints) is the assignment.

**Check:**

```
week_start  member  done (Vienna)         done_by  leftover events
2026-10-19  Peer    2026-10-30 12:00      Peer     0
2026-11-02  Peer    –                     –        0
```

`delete` fires no trigger, so no push went out. The old "✅ Carla hat … erledigt" stays on the other phones.

### Recipe: someone else's overdue chore done by you + a mis-tap reopened (Wed 11.11.2026)

Peer: "Peer did Küche & Staubsaugen from Noa on Monday 9th November. Carla didn't do Bad Carla & Peer two days ago, it is still open."

**Reading it right first** (lesson from 1.11.). The week of 9.11. is cycle week 2, and there Küche is already **Peer's**. So "from Noa" can only be **last week's (2.11.) Küche**, which was Noa's, open and overdue. Carla's row was this week's, tapped "erledigt" on Mon 18:44 (event #154, plus 3 pushes). Four minutes later she also marked last week's Müll done. That one is real, so it stayed. Claude wrote this reading back to Peer and only started after the "yes".

**Owner or doer?** Noa was the owner, Peer did it. The policy `with check (done_by is null or done_by = member_id)` doesn't allow "owned by Noa, done by Peer", so the row moves to Peer the way a take-over would. Noa stays on record as `from_member_id` in the `assignment_swapped` event.

**Reopening without deleting.** Since the undo feature (chapter 22) there's an event type for this, `chore_reopened`. It cancels the newest earlier `chore_done` of the same assignment. So, unlike on 7.11., nothing was deleted from `events`. Carla could have done this part herself with "Doch nicht erledigt?" in "Meine Woche".

**The transaction** (in a file, `supabase db query --linked -f fix.sql`), short version:

```sql
begin;
alter table public.assignments disable trigger notify_done;        -- done_at null → value would push
alter table public.assignments disable trigger notify_taken_over;  -- member_id change would push

-- 2.11. Küche: Noa → Peer, done Mon 9.11. (time unknown → 12:00 Vienna)
update public.assignments
set member_id = '<Peer>', done_by = '<Peer>', done_at = timestamptz '2026-11-09 12:00 Europe/Vienna'
where id = '<row>' and member_id = '<Noa>' and done_at is null;   -- seatbelt: still Noa's and open
insert into public.events (created_at, member_id, type, payload) values
  ('2026-11-09 12:00 Europe/Vienna', '<Peer>', 'assignment_swapped',
   '{"assignment_id": …, "chore_id": …, "week_start": "2026-11-02", "from_member_id": "<Noa>", "source": "manual"}'),
  ('2026-11-09 12:00 Europe/Vienna', '<Peer>', 'chore_done', '{"assignment_id": …, "source": "manual"}');

-- 9.11. Bad Carla & Peer: log chore_reopened with the old done_at FIRST, then clear it
insert into public.events (member_id, type, payload)
select member_id, 'chore_reopened', jsonb_build_object('assignment_id', id, 'chore_id', chore_id,
       'week_start', week_start, 'done_at', done_at, 'source', 'manual')
from public.assignments where id = '<row>' and done_at is not null;
update public.assignments set done_at = null, done_by = null
where id = '<row>' and member_id = '<Carla>' and done_at is not null;

alter table public.assignments enable trigger notify_done;
alter table public.assignments enable trigger notify_taken_over;
select …;   -- the only output db query prints
commit;     -- dry run: rollback;
```

- **Order matters** in the Carla part: the event reads `done_at` from the row, so it has to come before the `update` that clears it.
- **Monday, not today.** The done date is the real one (9.11.), not "now". Had it been Wednesday or later, the skip rule would have offered this week's Küche owner (Peer) "Überspringen".
- **A mistake on the way:** a check query with `tgname || '=' || tgenabled` failed with `operator is not unique: text || "char"`. `tgenabled` has the odd Postgres type `"char"`; `tgenabled::text` fixed it.

**Dry run (`rollback;`), then a check that it left nothing behind:**

```
week_start  chore                member  done_vienna       done_by  manual_events
2026-11-02  Küche & Staubsaugen  Peer    2026-11-09 12:00  Peer     assignment_swapped,chore_done
2026-11-09  Bad Carla & Peer     Carla   NULL              NULL     chore_reopened
→ after rollback: Küche still Noa / open, Carla still done 18:44, 0 manual events, both triggers O
```

**Real run (`commit;`)** printed the same two lines. **Check:**

```
2026-11-02  Müll rausbringen     Carla  2026-11-09 18:48  Carla
2026-11-02  Bad Noa & Manu       Manu   –                 –      (overdue)
2026-11-02  Bad Carla & Peer     Peer   –                 –      (overdue)
2026-11-02  Küche & Staubsaugen  Peer   2026-11-09 12:00  Peer
2026-11-09  Müll rausbringen     Manu   –
2026-11-09  Bad Noa & Manu       Noa    –
2026-11-09  Bad Carla & Peer     Carla  –
2026-11-09  Küche & Staubsaugen  Peer   –
triggers: notify_taken_over=O notify_done=O · push_* events in the last 10 min: 0
manual events: 171 assignment_swapped · 172 chore_done · 173 chore_reopened
```

No push went out. The others still have Carla's "✅ … erledigt" from Monday on their phones, so tell them in the flat chat.

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
- ✅ **A real undo** of a real mis-tap: Carla's "Bad Carla & Peer", 11.11. (output in the recipe above), done with a `chore_reopened` event instead of the delete recipe.

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
