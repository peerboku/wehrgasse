-- Push on "done": when an assignment gets marked done, the database calls the
-- Edge Function notify-done, which sends the push to the other members.
-- See docs/decisions/0009 for why this is a trigger in a migration and not a
-- webhook clicked together in the dashboard.

-- ---------------------------------------------------------------- rights for the Edge Function

-- The function logs in as service_role. Like `authenticated` in
-- 20261027120000_explicit_grants.sql, it got no SELECT by default here.
-- service_role skips RLS, so these grants are its only limit: exactly what
-- notify-done needs, nothing more.
grant select on public.members, public.chores, public.assignments, public.push_subscriptions to service_role;
grant delete on public.push_subscriptions to service_role; -- dead subscriptions (404/410)
grant insert on public.events to service_role; -- push_sent / push_failed

-- ---------------------------------------------------------------- the trigger

-- pg_net lets the database send HTTP requests. It queues them and sends them
-- in the background, so marking done never waits for the push.
create extension if not exists pg_net with schema extensions;

-- URL and secret live in Supabase Vault (encrypted), not in this file, because
-- this file is in git. Peer stores them once (checklist in docs/learning/15).
create function public.notify_done() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  function_url text;
  webhook_secret text;
begin
  select decrypted_secret into function_url from vault.decrypted_secrets where name = 'notify_done_url';
  select decrypted_secret into webhook_secret from vault.decrypted_secrets where name = 'notify_done_secret';

  -- Not set up yet: skip the push. Marking done must never fail because of push.
  if function_url is null or webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := function_url,
    body := jsonb_build_object('assignment_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', webhook_secret)
  );
  return new;
end;
$$;

-- Only the trigger runs this, not the app.
revoke execute on function public.notify_done() from public, anon, authenticated;

-- Only "open -> done", not every change of done_at.
create trigger notify_done
after update of done_at on public.assignments
for each row
when (old.done_at is null and new.done_at is not null)
execute function public.notify_done();
