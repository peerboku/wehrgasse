-- Fix: table rights for the logged-in WG user, written out explicitly.
--
-- The first migration assumed Supabase gives `authenticated` select/insert/
-- update/delete on new tables by default. This project doesn't (see
-- auto_expose_new_tables in config.toml), so the app got "permission denied"
-- before RLS was even checked. The default it did give included TRUNCATE,
-- which empties a whole table and ignores RLS, so that goes too.
--
-- Rule from now on: start from nothing, grant exactly what the app needs.
-- RLS policies (first migration) then decide which rows.

revoke all on public.members, public.chores, public.rotation_template,
  public.assignments, public.push_subscriptions, public.events from authenticated;

-- Read everything
grant select on public.members, public.chores, public.rotation_template,
  public.assignments, public.push_subscriptions, public.events to authenticated;

-- Mark done: only these two columns
grant update (done_at, done_by) on public.assignments to authenticated;

-- Log events (append-only: no update, no delete)
grant insert on public.events to authenticated;

-- Phase 4: a phone adds or removes its push subscription
grant insert, delete on public.push_subscriptions to authenticated;
