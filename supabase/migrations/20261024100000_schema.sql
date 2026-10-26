-- All tables of the WG-App, with Row Level Security (RLS).
--
-- Login model (see docs/decisions/0007): the whole flat shares ONE auth user.
-- So "authenticated" = someone who knows the WG password. Sign-ups are turned
-- off in the dashboard, otherwise anyone could create a user with the public
-- anon key. Which flatmate you are is picked in the app, not checked here.

-- ---------------------------------------------------------------- tables

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text not null,
  color text not null -- hex, e.g. '#e8833a'
);

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null, -- emoji shown next to the name
  sort_order int not null
);

-- The fixed 4-week cycle. One row = "in cycle week X, member Y does chore Z".
create table public.rotation_template (
  cycle_week int not null check (cycle_week between 0 and 3),
  chore_id uuid not null references public.chores (id),
  member_id uuid not null references public.members (id),
  primary key (cycle_week, chore_id)
);

-- One row per (week, chore), created by ensure_week() (next migration).
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  week_start date not null check (extract(isodow from week_start) = 1), -- always a Monday
  chore_id uuid not null references public.chores (id),
  member_id uuid not null references public.members (id),
  done_at timestamptz,
  done_by uuid references public.members (id),
  unique (week_start, chore_id)
);

-- Filled in Phase 4 (push). One row per device that allowed notifications.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Append-only log for statistics later. Never updated, never deleted.
create table public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  member_id uuid references public.members (id), -- null if nobody picked a name yet
  type text not null,
  payload jsonb not null default '{}'
);

-- ---------------------------------------------------------------- access rules

alter table public.members enable row level security;
alter table public.chores enable row level security;
alter table public.rotation_template enable row level security;
alter table public.assignments enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.events enable row level security;

-- Not logged in (anon) = no access at all. RLS would already block it,
-- revoking the table rights too makes it explicit.
revoke all on public.members, public.chores, public.rotation_template,
  public.assignments, public.push_subscriptions, public.events from anon;

-- Logged in with the WG password = may read everything.
create policy "wg can read" on public.members for select to authenticated using (true);
create policy "wg can read" on public.chores for select to authenticated using (true);
create policy "wg can read" on public.rotation_template for select to authenticated using (true);
create policy "wg can read" on public.assignments for select to authenticated using (true);
create policy "wg can read" on public.push_subscriptions for select to authenticated using (true);
create policy "wg can read" on public.events for select to authenticated using (true);

-- Assignments: the app may only change done_at and done_by, nothing else.
-- done_by must be the assigned member (the app only shows the button to them).
revoke insert, update, delete on public.assignments from authenticated;
grant update (done_at, done_by) on public.assignments to authenticated;
create policy "wg can mark done" on public.assignments for update to authenticated
  using (true)
  with check (done_by is null or done_by = member_id);

-- Events: insert only. No update/delete policy means nobody can do either.
revoke update, delete on public.events from authenticated;
create policy "wg can log" on public.events for insert to authenticated with check (true);

-- Push subscriptions: a device can add and remove its own subscription.
create policy "wg can subscribe" on public.push_subscriptions for insert to authenticated with check (true);
create policy "wg can unsubscribe" on public.push_subscriptions for delete to authenticated using (true);

-- Members, chores and the template are only changed by migrations.
revoke insert, update, delete on public.members, public.chores, public.rotation_template from authenticated;

-- ---------------------------------------------------------------- realtime

-- Send changes on assignments to open apps, so "WG" updates live.
alter publication supabase_realtime add table public.assignments;
