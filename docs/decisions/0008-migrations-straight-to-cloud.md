# 0008 — Push migrations straight to the cloud database (no local stack)

**Status:** Accepted, 2026-10-24

## Context
Schema changes live as SQL files in `supabase/migrations/` (CLAUDE.md). They can be tried first on a **local** Supabase (`supabase start` runs Postgres, Auth, Realtime in Docker; `supabase db reset` replays all migrations from zero) and only then pushed with `supabase db push`. Or they can be pushed directly to the cloud project. Chapter 06 left this decision for Phase 3.

Alternatives considered:
- **Local Docker stack first**: the professional default. Mistakes never touch the real DB, and resets are free. Costs: Docker Desktop running (~2 GB of images), a second set of URLs/keys, and fake local users.
- **Straight to cloud** (chosen).

## Decision
`supabase db push` directly to the linked cloud project, after a dry run (`supabase db push --dry-run`).

Why it's acceptable *now*: the cloud DB is empty (no real data to lose), each migration file runs in one transaction (a failing file changes nothing), and launch is two days away.

## Consequences
- ➕ One environment, fewer moving parts to learn.
- ➖ A bad migration that *succeeds* is live immediately. The fix is a new migration, never editing an applied one.
- ➖ No `supabase db reset` safety net. Rebuilding from zero would mean deleting the cloud tables by hand.
- **Revisit as soon as there is real data** (after launch): from then on, the local stack is worth the Docker setup, because a mistake could cost the done history.
