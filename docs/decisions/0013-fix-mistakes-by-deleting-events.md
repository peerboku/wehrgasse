# 0013 — Fix mistakes in runtime data with direct SQL, deleting the matching events

**Status:** Accepted, 2026-10-27

## Context
`events` is append-only for the app (CLAUDE.md), and statistics are built from `events` + `assignments`. Mistakes happen anyway: test data before launch, someone tapping "erledigt" on the wrong chore, a take-over by accident. On 27.10. Peer asked for a database reset to remove test data. How to fix such rows?

Alternatives considered:
- **`supabase db reset --linked`**: replays all migrations from zero. Drops everything, including push subscriptions and the hand-made Vault secrets the push webhook needs ([ADR 0009](0009-push-trigger-pg-net-vault.md)). Too much for removing a few rows.
- **A migration per fix**: migrations get replayed on every new database, so a "delete this one row" migration makes no sense there.
- **Correcting events** (`chore_reopened`, never delete): full history, but needs a new event type and stats that subtract reversals.
- **Direct SQL in a transaction, deleting the events that belong to the mistake** (chosen).

## Decision
Fix runtime data with direct SQL (dashboard SQL editor or `supabase db query --linked`) in one `begin; … commit;`, and delete the `chore_done` / `assignment_swapped` / `push_*` events that belong to the mistake. Recipes: [chapter 19](../learning/19-fixing-data-by-hand.md).

## Consequences
- ➕ Stats stay right without extra logic; no new event type.
- ➖ The log no longer shows that a mistake happened.
- ➖ No undo: take `supabase db dump --linked --data-only` first once there is real history.
- Revisit if mistakes become frequent: then build `chore_reopened` (ROADMAP → Ideas).
