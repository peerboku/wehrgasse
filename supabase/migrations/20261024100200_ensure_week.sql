-- Creates the assignment rows for a week from rotation_template.
-- Safe to run any number of times: unique(week_start, chore_id) + "on conflict
-- do nothing" means a second run adds nothing.

-- p_week must be a Monday. cycle_week = floor(days_since_anchor / 7) mod 4,
-- written so that weeks before the anchor give 0..3 too (not negative).
create function public.ensure_week(p_week date) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if extract(isodow from p_week) <> 1 then
    raise exception 'ensure_week: % is not a Monday', p_week;
  end if;

  insert into assignments (week_start, chore_id, member_id)
  select p_week, chore_id, member_id
  from rotation_template
  where cycle_week = (((p_week - date '2026-10-26') / 7) % 4 + 4) % 4
  on conflict (week_start, chore_id) do nothing;
end;
$$;

-- The Monday of "now" in Europe/Vienna (never UTC). Does nothing before the
-- launch week, otherwise the pre-launch week would show up as overdue.
create function public.ensure_current_week() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  this_monday date := date_trunc('week', now() at time zone 'Europe/Vienna')::date;
begin
  if this_monday < date '2026-10-26' then
    return;
  end if;
  perform ensure_week(this_monday);
end;
$$;

-- Only the database itself (pg_cron) runs these, not the app.
revoke execute on function public.ensure_week(date) from public, anon, authenticated;
revoke execute on function public.ensure_current_week() from public, anon, authenticated;

-- Hourly instead of "Monday 00:00": a cron time is in UTC and would drift with
-- daylight saving time. Running every hour simply catches the new week.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('ensure-current-week', '0 * * * *', 'select public.ensure_current_week()');

-- Launch week rows now, so the app can show them before Monday.
select public.ensure_week('2026-10-26');
