# 06 — The backend: a Supabase project and its CLI

## 1. The idea

A backend needs: a **database**, **user accounts / login**, **access rules**, sometimes **server code**, and **scheduled jobs**. Building and running these yourself is a full-time job. A **Backend-as-a-Service (BaaS)** rents them to you as one package.

**Supabase** is a BaaS built around a real **PostgreSQL** database, so everything you learn (SQL, tables, constraints) is standard and transfers to any other Postgres. On top it adds Auth (logins), an auto-generated API, Row Level Security, Edge Functions (small server functions), Realtime (live updates) and pg_cron (scheduled SQL).

Two places your backend exists:

- **The remote project** (in the cloud, where the real data lives), managed in the Supabase dashboard.
- **Your repo**, where the *description* of the backend lives as files: config, SQL migrations, function code. The **Supabase CLI** connects the two.

The rule that keeps them in sync: **schema changes only as migration files** in `supabase/migrations/`, applied with `supabase db push`, never by clicking in the dashboard. Otherwise the repo no longer describes the real database, and you can't rebuild or review it.

## 2. In our app

What Peer did (21.10.2026):

1. Dashboard: new project `wehrgasse`, region Central EU (Frankfurt). EU region because the data is about people living in the EU, and it's closer to Vienna, so it's faster too.
2. `brew install supabase/tap/supabase`
3. `supabase login` (browser)
4. `supabase init` → created `supabase/config.toml` (415 lines) and `supabase/.gitignore`
5. `supabase link --project-ref <ref>` → created `supabase/.temp/` (ignored by git)

**What `config.toml` actually is.** The non-comment lines (raw excerpt):

```toml
project_id = "wehrgasse"
[api]
port = 54321
[db]
port = 54322
major_version = 17
[db.seed]
sql_paths = ["./seed.sql"]
[studio]
port = 54323
```

Those ports belong to `localhost`. This file mostly configures a **local copy** of Supabase that the CLI can run on your laptop (via Docker, `supabase start`). `project_id = "wehrgasse"` is just a local name, *not* the cloud project's ref. Also `major_version = 17`: our database is Postgres 17.

**What `link` stored.** `supabase/.temp/linked-project.json` contains the keys `ref`, `name`, `organization_id`, `organization_slug`. That's how later commands (`db push`, `functions deploy`, `secrets set`) know which cloud project you mean. It's ignored twice: by `supabase/.gitignore` (`.temp`) and our root `.gitignore` (`supabase/.temp`):

```
$ git check-ignore -v supabase/.temp
supabase/.gitignore:3:.temp	supabase/.temp
```

Not done yet, by design: no tables. Those come as migrations in Phase 3, after the hallway test has confirmed the screens.

## 3. Predict, then run

**Predict**: what will `supabase migration list` show right now, with no `supabase/migrations/` folder? An error, an empty table, or something else? Run it.

## 4. What a pro would also do

- **Test migrations locally first**: `supabase start` (needs Docker Desktop) runs the whole stack on your laptop; `supabase db reset` applies all migrations + `seed.sql` from zero. If that works, `db push` to the cloud. We'll decide in Phase 3 whether Docker is worth it for 4 users. It's the safer path.
- **Keep a separate staging project** for experiments. Overkill for us; the free plan limits projects anyway.
- **Know the free plan's limits**: projects pause after inactivity (already in ROADMAP "Risks"), and there are no automatic backups you can download. A pro schedules a `supabase db dump` now and then.

## 5. Sources

- Supabase CLI, getting started: <https://supabase.com/docs/guides/local-development/cli/getting-started>
- Local development and migrations: <https://supabase.com/docs/guides/local-development/overview>
- CLI reference (`init`, `link`, `db push`): <https://supabase.com/docs/reference/cli/introduction>
- PostgreSQL 17 documentation: <https://www.postgresql.org/docs/17/>

## 6. How we know it's right

- **`linked-project.json` exists** with a `ref`: the link step completed.
- **`supabase secrets set` / `secrets list` worked** ([chapter 07](07-web-push-keys.md)). Those commands talk to the cloud project, so they can only succeed if login *and* link are correct.
- **`git check-ignore`** confirms the link data stays out of the public repo.

## 7. Check yourself

1. Is `project_id = "wehrgasse"` in `config.toml` the same as the project ref in the dashboard URL?
2. Why must schema changes go through migration files instead of the dashboard's table editor?
3. Why is `supabase/.temp/` not committed?

<details><summary>Answers</summary>

1. No. It's a local name for the local dev stack. The cloud ref is stored by `link` in `.temp/linked-project.json`.
2. So the repo is the single source of truth: changes are reviewable, repeatable (you can rebuild the DB from zero) and in history.
3. It's machine-specific state (which project *this* laptop is linked to, cached versions), not project description. It also contains identifiers we don't need to publish.

</details>

## 8. Your notes

> _In your words: what's the difference between the remote project and the `supabase/` folder?_
>
>
