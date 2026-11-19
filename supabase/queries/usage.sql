-- Usage report: how much the app gets used, and by whom.
-- Built as cells for a Supabase notebook (one cell per block below), but every
-- block also runs on its own in the SQL Editor.
-- Read-only: only SELECTs, nothing is changed.
-- Not a migration: this folder is ignored by `supabase db push`.
--
-- Each block starts with:
--   MARKDOWN: text for a markdown cell above the SQL cell
--   CHART:    how to set the cell's chart (none = keep as table)
--
-- Good to know:
-- - All times and days are Europe/Vienna, weeks start on Monday.
-- - app_open is logged once per app *start*. On iPhone a Home-Screen app often just
--   wakes up from the background without a new start, so real use is higher.
-- - push_sent/push_failed events carry the member who RECEIVED the push.


-- =================================================================================
-- MARKDOWN: ## 👥 Wer nutzt die App?
--           Letzter Besuch, App-Starts, aktive Tage, erledigte Aufgaben, Push an/aus.
-- CHART:    none (table)
-- =================================================================================
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


-- =================================================================================
-- MARKDOWN: ## 📅 App-Starts pro Woche
-- CHART:    bar chart, stacked; X axis = week; Y = peer, carla, noa, manu
-- =================================================================================
select
  date_trunc('week', e.created_at at time zone 'Europe/Vienna')::date        as week,
  count(*) filter (where m.name = 'Peer')                                     as peer,
  count(*) filter (where m.name = 'Carla')                                    as carla,
  count(*) filter (where m.name = 'Noa')                                      as noa,
  count(*) filter (where m.name = 'Manu')                                     as manu
from events e
join members m on m.id = e.member_id
where e.type = 'app_open'
group by 1
order by 1;


-- =================================================================================
-- MARKDOWN: ## 📆 App-Starts pro Tag (letzte 30 Tage)
-- CHART:    bar chart, stacked; X axis = day; Y = peer, carla, noa, manu
-- =================================================================================
select
  to_char(d, 'MM-DD Dy')                                                      as day,
  count(e.id) filter (where m.name = 'Peer')                                  as peer,
  count(e.id) filter (where m.name = 'Carla')                                 as carla,
  count(e.id) filter (where m.name = 'Noa')                                   as noa,
  count(e.id) filter (where m.name = 'Manu')                                  as manu
from generate_series(
       (now() at time zone 'Europe/Vienna')::date - 29,
       (now() at time zone 'Europe/Vienna')::date,
       interval '1 day') as d
left join events e
  on e.type = 'app_open'
 and (e.created_at at time zone 'Europe/Vienna')::date = d::date
left join members m on m.id = e.member_id
group by d
order by d;


-- =================================================================================
-- MARKDOWN: ## 🕐 Zu welcher Uhrzeit? (alle App-Starts)
-- CHART:    bar chart, stacked; X axis = hour; Y = peer, carla, noa, manu
-- =================================================================================
select
  lpad(h::text, 2, '0') || ':00'                                              as hour,
  count(e.id) filter (where m.name = 'Peer')                                  as peer,
  count(e.id) filter (where m.name = 'Carla')                                 as carla,
  count(e.id) filter (where m.name = 'Noa')                                   as noa,
  count(e.id) filter (where m.name = 'Manu')                                  as manu
from generate_series(0, 23) as h
left join events e
  on e.type = 'app_open'
 and extract(hour from e.created_at at time zone 'Europe/Vienna') = h
left join members m on m.id = e.member_id
group by h
order by h;


-- =================================================================================
-- MARKDOWN: ## 🧹 Aufgaben pro Person
--           "on_time" = bis Sonntag der eigenen Woche erledigt. Zählt die Zeilen,
--           die der Person zugeteilt sind.
-- CHART:    bar chart, stacked; X axis = member; Y = on_time, late, skipped, overdue
-- =================================================================================
select
  m.emoji || ' ' || m.name                                                    as member,
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


-- =================================================================================
-- MARKDOWN: ## 📝 Letzte 50 Aktionen (ohne Push)
-- CHART:    none (table)
-- =================================================================================
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
