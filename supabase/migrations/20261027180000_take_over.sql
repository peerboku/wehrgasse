-- "Ich übernehm das": someone takes over another member's chore for this week.
-- Only the one row of this week changes; rotation_template stays as it is, so
-- next week ensure_week() hands out the chores as usual.
-- See docs/decisions/0011 for why this is a function and not a column grant.

-- ---------------------------------------------------------------- take_over()

-- The app calls this with supabase.rpc('take_over', ...). security definer =
-- it runs with the rights of its owner, so `authenticated` needs no update
-- right on member_id. The where clause is the whole rule: only this week's
-- open rows, and not to the person who already has it.
create function public.take_over(p_assignment_id uuid, p_member_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  this_monday date := date_trunc('week', now() at time zone 'Europe/Vienna')::date;
begin
  update assignments
  set member_id = p_member_id
  where id = p_assignment_id
    and week_start = this_monday
    and done_at is null
    and member_id <> p_member_id;

  if not found then
    raise exception 'take_over: not an open assignment of this week';
  end if;
end;
$$;

-- New functions can be run by everyone by default; only the WG login may.
revoke execute on function public.take_over(uuid, uuid) from public, anon;
grant execute on function public.take_over(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- push on take-over

-- Same as notify_done() (20261027150000_push_webhook.sql), but tells the
-- Edge Function what happened and who had the chore before.
create function public.notify_taken_over() returns trigger
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

  -- Not set up yet: skip the push. Taking over must never fail because of push.
  if function_url is null or webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := function_url,
    body := jsonb_build_object('kind', 'taken_over', 'assignment_id', new.id, 'from_member_id', old.member_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', webhook_secret)
  );
  return new;
end;
$$;

-- Only the trigger runs this, not the app.
revoke execute on function public.notify_taken_over() from public, anon, authenticated;

-- Fires for every new owner, also when Peer changes member_id in the dashboard.
create trigger notify_taken_over
after update of member_id on public.assignments
for each row
when (old.member_id is distinct from new.member_id)
execute function public.notify_taken_over();
