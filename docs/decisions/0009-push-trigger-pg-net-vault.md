# 0009 — Push via a database trigger (pg_net + Vault) defined in a migration

**Status:** Accepted, 2026-10-27

## Context
When `assignments.done_at` is set, the Edge Function `notify-done` must run and push to the other 3 members. Something has to call the function, and the function must make sure the call comes from us and not from a stranger who found the URL.

Alternatives considered for **who calls the function**:
- **Database Webhook clicked together in the dashboard** (what CLAUDE.md first had in mind). Under the hood this is also a trigger plus an HTTP call, but it exists only in the cloud DB. It isn't in git and is lost when the DB is rebuilt from migrations. That breaks our rule "no DB change without a migration".
- **The app calls the function** right after `markDone`. Simple, but the push depends on the phone: if the app is closed a second too early or offline, nobody gets notified. Anyone with the WG login could also trigger pushes without marking anything done.
- **Trigger + `pg_net` in a migration** (chosen). The database sends the request itself, only when `done_at` changes from empty to a time. Same mechanism as the dashboard webhook, but written down.

Alternatives for **how the function checks the caller**:
- **JWT check** (Supabase default, `verify_jwt = true`): the trigger would need a service-role key stored somewhere in the DB. That key opens *everything*.
- **Shared secret** (chosen): a random string stored twice, as function secret `NOTIFY_DONE_SECRET` and in Supabase Vault as `notify_done_secret`. The trigger sends it as header `x-webhook-secret`. If it leaks, an attacker can only trigger "X hat Y erledigt" pushes. Replacing it means generating a new value and storing it in both places.

URL and secret live in **Vault** (encrypted inside the DB), not in the migration, because migrations are in git.

## Decision
Migration `20261027150000_push_webhook.sql`: `pg_net` extension, trigger function `notify_done()` reading URL + secret from Vault, trigger `after update of done_at … when (old.done_at is null and new.done_at is not null)`. `verify_jwt = false` for `notify-done` in `supabase/config.toml`; the function returns 401 without the right header.

## Consequences
- ➕ The whole push setup is reproducible from git, except the two Vault values and the function secrets (manual checklist in [chapter 15](../learning/15-push-notifications.md)).
- ➕ Marking done never waits for or fails because of push: pg_net queues the request; with no Vault values the trigger does nothing.
- ➖ Two places hold the same secret; they must match. A mismatch shows up as `401` in `net._http_response`.
- ➖ pg_net only keeps responses for a few hours. Long-term evidence comes from our own `push_sent` / `push_failed` events.
