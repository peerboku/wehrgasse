# 13 — The database: schema, Row Level Security, migrations, pg_cron

## 1. The idea

**Schema** = the shape of your data: tables, columns, types, and **constraints**, which are rules the database enforces no matter which code writes to it (`unique`, `references`, `check`). A constraint is better than an `if` in the frontend, because it can't be skipped.

**Row Level Security (RLS)** answers "who may see or change which rows?" *inside* Postgres. Supabase publishes your tables as an HTTP API, and the URL and `anon` key are in the public frontend bundle. So **RLS is the only lock on the door**. Two layers work together:
- **Grants** (`grant select on table to role`) decide which *operations/columns* a role may use at all.
- **Policies** (`create policy … using (…)`) decide which *rows* it may touch.

Supabase has two roles for API calls: `anon` (no login) and `authenticated` (logged in).

**Migrations** are numbered SQL files that move the schema forward, one step each. The database remembers which ones it has applied, so `db push` only sends new ones. Never edit an applied migration; write a new one.

**pg_cron** runs SQL on a schedule inside the database, like a cron job on a server.

## 2. In our app

Three files in [`supabase/migrations/`](../../supabase/migrations/):

| File | What |
|---|---|
| [`…100000_schema.sql`](../../supabase/migrations/20261024100000_schema.sql) | 6 tables, constraints, grants, policies, Realtime |
| [`…100100_seed.sql`](../../supabase/migrations/20261024100100_seed.sql) | 4 members, 4 chores (with icons), 16 rotation rows |
| [`…100200_ensure_week.sql`](../../supabase/migrations/20261024100200_ensure_week.sql) | `ensure_week()`, `ensure_current_week()`, hourly cron job |
| [`20261027120000_explicit_grants.sql`](../../supabase/migrations/20261027120000_explicit_grants.sql) | **Fix:** explicit table rights for `authenticated` (see "Mistakes") |

**Constraints doing real work:**
- `unique (week_start, chore_id)` on `assignments`: running `ensure_week` twice can't create duplicates (`on conflict … do nothing`).
- `check (extract(isodow from week_start) = 1)`: a week always starts on a Monday.
- `ensure_week` itself refuses a non-Monday. Real output for Tuesday 27.10.:
  ```
  ensure_week: 2026-10-27 is not a Monday
  CONTEXT:  PL/pgSQL function ensure_week(date) line 4 at RAISE
  ```

**The access rules** (shared WG login, [ADR 0007](../decisions/0007-shared-wg-login.md)):
- `anon`: `revoke all` on every table. No policy, no access.
- `authenticated`: `select` everything. On `assignments`, only `update (done_at, done_by)` is granted, with policy check `done_by is null or done_by = member_id`. `events`: insert + select, no update/delete.

**Step 1, dry run** (24.10.):
```
$ supabase db push --dry-run
DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 • 20261024100000_schema.sql
 • 20261024100100_seed.sql
 • 20261024100200_ensure_week.sql
```

**Step 2, the push** (27.10.):
```
$ supabase db push
Applying migration 20261024100000_schema.sql...
Applying migration 20261024100100_seed.sql...
Applying migration 20261024100200_ensure_week.sql...
Finished supabase db push.
```

**Step 3, attacking it from outside**, with only the public anon key (what a stranger who opens our bundle has):
```
members      {"code":"42501", "message":"permission denied for table members"}
assignments  {"code":"42501", "message":"permission denied for table assignments"}
events       {"code":"42501", "message":"permission denied for table events"}
insert event: {"code":"42501", "message":"permission denied for table events"}
signup: {"code":422,"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}
```
`42501` is Postgres for *insufficient privilege*: the `revoke` at the grant layer stopped it before RLS even had to.

**Step 4, the rotation for 8 weeks**, inside `begin … rollback`. The test rows vanish afterwards (`count` was 4 before and after):
```
2026-10-26  Carla=Bad Carla & Peer, Manu=Küche & Staubsaugen, Noa=Bad Noa & Manu, Peer=Müll rausbringen
2026-11-02  Carla=Müll rausbringen, Manu=Bad Noa & Manu, Noa=Küche & Staubsaugen, Peer=Bad Carla & Peer
2026-11-09  Carla=Bad Carla & Peer, Manu=Müll rausbringen, Noa=Bad Noa & Manu, Peer=Küche & Staubsaugen
2026-11-16  Carla=Küche & Staubsaugen, Manu=Bad Noa & Manu, Noa=Müll rausbringen, Peer=Bad Carla & Peer
2026-11-23  (= 26.10., cycle starts again) …
```
Each week has 4 rows and matches the CLAUDE.md table line by line.

**Step 5, cron:**
```
jobname: ensure-current-week   schedule: 0 * * * *   active: true
```
Why hourly and not `0 0 * * 1` (Monday midnight)? Cron times are **UTC**. Monday 00:00 in Vienna is Sunday 23:00 UTC in winter and 22:00 in summer, so a fixed time is wrong half the year. Hourly + idempotent = always right within an hour.

**Mistakes and surprises:**
- **The biggest one: "Die Daten konnten nicht geladen werden."** Peer's first login worked, but every read failed. The first migration only *revoked* rights it didn't want, assuming Supabase had already *granted* the normal ones. This project doesn't do that (`auto_expose_new_tables` in `config.toml`). Asking the database what `authenticated` may actually do:
  ```
  $ supabase db query --linked "select table_name, string_agg(privilege_type, ',') from information_schema.role_table_grants where grantee = 'authenticated' …"
  assignments  REFERENCES,TRIGGER,TRUNCATE
  members      REFERENCES,TRIGGER,TRUNCATE
  …
  ```
  No `SELECT` anywhere. The policies existed, but Postgres checks grants *first*, so they never ran. Worse, `TRUNCATE` (empty a whole table) **ignores RLS**, so the WG login could have wiped `events`. Fix: a new migration that revokes everything and grants exactly what the app needs. Applied migrations are never edited. Before pushing it, we tested it as the WG role inside `begin … rollback` (`set local role authenticated`):
  ```
  read + mark done + insert event          → marked_done: 4, events_logged: 1
  truncate events                          → permission denied for table events
  update assignments set member_id = …     → permission denied for table assignments
  delete from events                       → permission denied for table events
  Peer marks Carla's chore done            → violates row-level security policy
  ```
  After the push:
  ```
  assignments SELECT · chores SELECT · events INSERT,SELECT · members SELECT
  push_subscriptions DELETE,INSERT,SELECT · rotation_template SELECT
  ```
  Lesson: **never rely on default privileges.** Start from nothing and grant explicitly. Also, the outside test in step 3 couldn't catch this, because it only proved strangers are blocked, not that members are let in. Always test both sides.
- **`.env.local` had the dashboard URL** (`https://supabase.com/dashboard/project/<ref>`) instead of the API URL (`https://<ref>.supabase.co`). A test request returned the dashboard's HTML page with HTTP 404 instead of JSON. Fixed locally, and the GitHub secret needed the same fix.
- **Sign-ups were on** when we first checked (`disable_signup: False`). With a shared-login model, that would have let anyone create an account and read everything. Peer turned it off before the push.
- **The auth user's email** ended up as `wg@wehrgasse.com`, not the planned `…example.com`. Rather than redo it, the app's `WG_EMAIL` constant was changed to match. A query showed the difference: `select email from auth.users`.
- **The launch-week guard.** We built this on Saturday 24.10. If `ensure_current_week()` had run then, it would have created rows for 19.–25.10. On Monday those would all have appeared as red "überfällig". The function does nothing before 26.10., and the migration created the launch week directly.

## 3. Predict, then run

**Predict:** what happens if you run the seed migration's rotation insert a second time? Error, duplicates, or nothing? (Hint: look at the primary key of `rotation_template`.) Test it safely:
```
supabase db query --linked "begin; insert into rotation_template select * from rotation_template; rollback;"
```

## 4. What a pro would also do

- **Local stack + `supabase db reset`** before every push. Now that there's real data, this is worth doing ([ADR 0008](../decisions/0008-migrations-straight-to-cloud.md)).
- **pgTAP tests** (`supabase test db`): the rotation check above as an automatic test instead of a manual query.
- **`supabase db advisors`**: Supabase's own security/performance linter for the schema.
- **Backups:** an occasional `supabase db dump` so the done-history can be restored.

## 5. Sources

- PostgreSQL 17, constraints: <https://www.postgresql.org/docs/17/ddl-constraints.html>
- PostgreSQL 17, row security policies: <https://www.postgresql.org/docs/17/ddl-rowsecurity.html>
- PostgreSQL 17, `GRANT` (incl. column privileges): <https://www.postgresql.org/docs/17/sql-grant.html>
- Supabase, Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase, Cron: <https://supabase.com/docs/guides/cron>
- Supabase CLI, `db push` / `db query`: <https://supabase.com/docs/reference/cli/introduction>

## 6. How we know it's right

- **Postgres itself refused** the stranger's reads/inserts (error 42501), and **Supabase Auth refused** the sign-up (`signup_disabled`). These are the real servers answering, not our reasoning.
- **The rotation came from the real function** on the real database, compared row by row with the table in CLAUDE.md, and also matches the Vitest test in `week.test.ts`. That's two independent implementations giving the same answer.
- `supabase migration list` shows local and remote in sync (3/3).

## 7. Check yourself

1. The anon key is public. Why can't a stranger read `members`?
4. The policy `wg can read` existed from the start. Why did the logged-in app still get "permission denied"?
2. Why does `assignments` get `grant update (done_at, done_by)` instead of plain `grant update`?
3. Why does the cron job run every hour, not once on Monday?

<details><summary>Answers</summary>

1. `anon` has no table privileges (`revoke all`) and no policy. Postgres answers 42501 before returning a row. Only someone logged in with the WG password is `authenticated`.
2. So the app can't change *who* or *which week*, only mark done. Swaps go through the dashboard until the swap feature exists.
3. Cron uses UTC, Vienna switches between UTC+1 and UTC+2. Hourly + idempotent always gets the week right within an hour, without DST math.
4. Postgres checks grants before policies. `authenticated` had no `SELECT` grant, so it never got as far as the policy.

</details>

## 8. Your notes

> _In your words: what's the difference between a grant and a policy?_
>
>
