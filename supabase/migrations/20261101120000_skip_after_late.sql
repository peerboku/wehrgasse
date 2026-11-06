-- "Überspringen": if last week's chore is only done on Wednesday or later of
-- the following week, this week's owner of that chore may skip it.
-- See docs/decisions/0015.
--
-- A skip closes the row like "done" (done_at, done_by) and sets skipped = true.
-- So overdue, the wheel, the counts and take_over() keep working unchanged,
-- and the notify_done trigger sends the push; the Edge Function reads skipped.

-- ---------------------------------------------------------------- column

alter table public.assignments add column skipped boolean not null default false;

-- Not in the column grant (only done_at, done_by, see 20261024100000_schema.sql),
-- so the app can change skipped only through skip_week() below.

-- ---------------------------------------------------------------- the rule

-- This week's open row of a chore, if an older row of the same chore was
-- marked done this week on Wednesday 00:00 (Vienna) or later. Else null.
-- Used by skip_week() and by the Edge Function (who gets the "du kannst
-- überspringen" push). The app has the same rule in src/lib/week.ts.
create function public.skippable_assignment(p_chore_id uuid) returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.id
  from assignments a
  where a.chore_id = p_chore_id
    and a.week_start = date_trunc('week', now() at time zone 'Europe/Vienna')::date
    and a.done_at is null
    and exists (
      select 1
      from assignments late
      where late.chore_id = p_chore_id
        and late.week_start < a.week_start
        -- Monday + 2 days = Wednesday, midnight in Vienna (not UTC)
        and late.done_at >= (a.week_start + 2)::timestamp at time zone 'Europe/Vienna'
    )
$$;

-- Only the Edge Function (service_role) calls it directly.
revoke execute on function public.skippable_assignment(uuid) from public, anon, authenticated;
grant execute on function public.skippable_assignment(uuid) to service_role;

-- ---------------------------------------------------------------- skip_week()

-- The app calls this with supabase.rpc('skip_week', ...). Same idea as
-- take_over(): security definer, the where clause is the whole rule.
-- Only your own row, and only if skippable_assignment() allows it.
create function public.skip_week(p_assignment_id uuid, p_member_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update assignments
  set done_at = now(), done_by = member_id, skipped = true
  where id = p_assignment_id
    and member_id = p_member_id
    and id = skippable_assignment(chore_id);

  if not found then
    raise exception 'skip_week: this assignment can not be skipped';
  end if;
end;
$$;

-- New functions can be run by everyone by default; only the WG login may.
revoke execute on function public.skip_week(uuid, uuid) from public, anon;
grant execute on function public.skip_week(uuid, uuid) to authenticated;
