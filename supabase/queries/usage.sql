-- Usage report: how much the app gets used, and by whom.
--
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste ONE block
-- (or the whole file and select one block) -> Run. Save it as a snippet, e.g. "Nutzung".
-- Read-only: only SELECTs, nothing is changed.
--
-- Not a migration: this folder is ignored by `supabase db push`.
--
-- Good to know:
-- - All times and days are Europe/Vienna, weeks start on Monday.
-- - app_open is logged once per app *start*. On iPhone a Home-Screen app often just
--   wakes up from the background without a new start, so real use is higher.
-- - push_sent/push_failed events carry the member who RECEIVED the push.


-- 1) Per person: overview ---------------------------------------------------------
select
  m.emoji || ' ' || m.name                                                    as member,
  to_char(max(e.created_at) at time zone 'Europe/Vienna', 'YYYY-MM-DD HH24:MI') as last_seen,
  count(*) filter (where e.type = 'app_open'
                     and e.created_at > now() - interval '7 days')            as opens_7d,
  count(*) filter (where e.type = 'app_open'
                     and e.created_at > now() - interval '30 days')           as opens_30d,
  count(*) filter (where e.type = 'app_open')                                 as opens_total,
  count(distinct (e.created_at at time zone 'Europe/Vienna')::date)
    filter (where e.created_at > now() - interval '30 days')                  as active_days_30d,
  (select count(*) from assignments a
    where a.done_by = m.id and not a.skipped)                                 as chores_done,
  (select count(*) from assignments a
    where a.done_by = m.id and a.skipped)                                     as chores_skipped,
  exists (select 1 from push_subscriptions p where p.member_id = m.id)        as push_on
from members m
left join events e
  on e.member_id = m.id
 and e.type not in ('push_sent', 'push_failed')   -- received pushes are not "use"
group by m.id
order by array_position(array['Peer', 'Carla', 'Noa', 'Manu'], m.name);


-- 2) Per week x person: app opens (try the "Chart" tab: bar chart, x = week) ----------
select
  date_trunc('week', e.created_at at time zone 'Europe/Vienna')::date        as week,
  count(*) filter (where m.name = 'Peer')                                     as peer,
  count(*) filter (where m.name = 'Carla')                                    as carla,
  count(*) filter (where m.name = 'Noa')                                      as noa,
  count(*) filter (where m.name = 'Manu')                                     as manu,
  count(*)                                                                    as total
from events e
join members m on m.id = e.member_id
where e.type = 'app_open'
group by 1
order by 1 desc;


-- 3) Daily, last 30 days: who opened the app ----------------------------------------
select
  d::date                                                                     as day,
  to_char(d, 'Dy')                                                            as weekday,
  count(distinct e.member_id)                                                 as people,
  coalesce(string_agg(distinct m.name, ', '), '')                             as who,
  count(e.id)                                                                 as opens
from generate_series(
       (now() at time zone 'Europe/Vienna')::date - 29,
       (now() at time zone 'Europe/Vienna')::date,
       interval '1 day') as d
left join events e
  on e.type = 'app_open'
 and (e.created_at at time zone 'Europe/Vienna')::date = d::date
left join members m on m.id = e.member_id
group by d
order by d desc;


-- 4) Chores per person: on time, late, skipped, still open ---------------------------
-- "On time" = done by Sunday of its week (Vienna). Counts the rows assigned to the person.
select
  m.emoji || ' ' || m.name                                                    as member,
  count(a.id)                                                                 as assigned,
  count(*) filter (where a.done_at is not null and not a.skipped
    and (a.done_at at time zone 'Europe/Vienna')::date < a.week_start + 7)    as on_time,
  count(*) filter (where a.done_at is not null and not a.skipped
    and (a.done_at at time zone 'Europe/Vienna')::date >= a.week_start + 7)   as late,
  count(*) filter (where a.skipped)                                           as skipped,
  count(*) filter (where a.done_at is null
    and a.week_start + 7 <= (now() at time zone 'Europe/Vienna')::date)       as overdue,
  count(*) filter (where a.done_at is null
    and a.week_start + 7 > (now() at time zone 'Europe/Vienna')::date)        as open_this_week
from members m
left join assignments a on a.member_id = m.id
group by m.id
order by array_position(array['Peer', 'Carla', 'Noa', 'Manu'], m.name);


-- 5) Latest 50 actions (without push noise) ------------------------------------------
select
  to_char(e.created_at at time zone 'Europe/Vienna', 'YYYY-MM-DD HH24:MI')     as time,
  m.name                                                                      as member,
  e.type,
  c.name                                                                      as chore
from events e
left join members m on m.id = e.member_id
left join assignments a on a.id = (e.payload ->> 'assignment_id')::uuid
left join chores c on c.id = a.chore_id
where e.type not in ('push_sent', 'push_failed')
order by e.created_at desc
limit 50;
