-- Web Push support: stores each device's push subscription, plus a log of
-- what's already been sent so the scheduled sender doesn't spam the same
-- reminder repeatedly.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, -- 'test_due' | 'slam_retest'
  ref_id uuid not null, -- pool id or slam session id
  sent_at timestamptz not null default now()
);

create index if not exists notification_log_ref_idx on notification_log(kind, ref_id, sent_at);

alter table push_subscriptions enable row level security;
alter table notification_log enable row level security;

drop policy if exists "push_subscriptions_owner" on push_subscriptions;
create policy "push_subscriptions_owner" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notification_log_owner" on notification_log;
create policy "notification_log_owner" on notification_log
  for select using (auth.uid() = user_id);
