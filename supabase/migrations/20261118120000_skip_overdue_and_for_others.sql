-- "Überspringen", round two (docs/decisions/0017):
--   1. Overdue chores can always be skipped by their owner (no late-cleaning rule).
--   2. Peer may skip anyone's open chore (this week or overdue), e.g. someone is on holiday.
--   3. Skips never send a push.

-- ---------------------------------------------------------------- who may skip for others

-- A flag instead of the name "Peer" in code: members change only via migrations,
-- and the rule stays in one place (skip_week() below). The app reads it to show the buttons.
alter table public.members add column can_skip_for_others boolean not null default false;

update public.members set can_skip_for_others = true where name = 'Peer';

-- ---------------------------------------------------------------- the late-cleaning rule

-- Same as in 20261101120000_skip_after_late.sql, plus "not late.skipped":
-- a skipped overdue row also gets done_at, but nobody cleaned, so it must not
-- unlock a skip for this week's owner.
create or replace function public.skippable_assignment(p_chore_id uuid) returns uuid
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
        and not late.skipped
        -- Monday + 2 days = Wednesday, midnight in Vienna (not UTC)
        and late.done_at >= (a.week_start + 2)::timestamp at time zone 'Europe/Vienna'
    )
$$;

-- ---------------------------------------------------------------- skip_week()

-- Same signature as before, so the grants (authenticated only) stay.
-- done_by = who skipped (for Peer's skips that is not the owner).
create or replace function public.skip_week(p_assignment_id uuid, p_member_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  this_monday date := date_trunc('week', now() at time zone 'Europe/Vienna')::date;
begin
  update assignments a
  set done_at = now(), done_by = p_member_id, skipped = true
  where a.id = p_assignment_id
    and a.done_at is null
    and a.week_start <= this_monday
    and (
      -- your own overdue chore, any time
      (a.member_id = p_member_id and a.week_start < this_monday)
      -- your own chore of this week, after someone cleaned too late (ADR 0015)
      or (a.member_id = p_member_id and a.id = skippable_assignment(a.chore_id))
      -- Peer: anyone's open chore
      or exists (select 1 from members m where m.id = p_member_id and m.can_skip_for_others)
    );

  if not found then
    raise exception 'skip_week: this assignment can not be skipped';
  end if;
end;
$$;

-- ---------------------------------------------------------------- no push on skip

-- Same trigger as in 20261027150000_push_webhook.sql, but skips don't call the
-- Edge Function at all. The 🐷 offer when a late chore is really done stays.
drop trigger notify_done on public.assignments;

create trigger notify_done
after update of done_at on public.assignments
for each row
when (old.done_at is null and new.done_at is not null and not new.skipped)
execute function public.notify_done();
