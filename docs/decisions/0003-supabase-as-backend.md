# 0003 — Supabase as backend

**Status:** Accepted, 2026-10-21

## Context
We need: logins for 4 fixed people, a relational database (members, chores, weekly assignments), access rules (only the owner can mark done), a scheduled job (create the week's assignments), a trigger on "done", and server-side code to send push messages with a private key. Budget: zero. Data about EU residents.

Alternatives considered:
- **Firebase**: also free, good push for native apps; but a document database (no SQL, no unique constraints across rows like `unique(week_start, chore_id)`) and Google-only.
- **Own server** (e.g. Python/FastAPI on a VPS): full control, but we'd have to run, secure and back up a server.
- **Google Sheet as database**: tempting, but no real access rules or triggers.

## Decision
Supabase (free plan), region Central EU (Frankfurt): Postgres + Auth (email/password) + Row Level Security + pg_cron + Database Webhooks + Edge Functions. All schema changes as SQL migrations in `supabase/migrations/`.

## Consequences
- ➕ Standard PostgreSQL: SQL and constraints we learn here transfer anywhere.
- ➕ Everything we need in one service, including scheduled jobs and server functions.
- ➕ The rotation lives as data (`rotation_template`) with constraints, not as code.
- ➖ Free projects pause after inactivity (ROADMAP "Risks").
- ➖ Access rules (RLS) are our responsibility: a missing policy can expose data via the public anon key.
- ➖ Vendor-specific parts (Edge Functions, webhooks) would need rewriting if we ever moved.
