-- Pool Tracker database schema.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- for a fresh project. Safe to re-run: it uses "if not exists" / "or replace"
-- everywhere it can.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  volume_gallons numeric not null,
  surface_type text not null,
  sanitizer_type text not null,
  has_borates boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pool_id uuid not null references pools(id) on delete cascade,
  "timestamp" timestamptz not null,
  fc numeric,
  cc numeric,
  ph numeric,
  ta numeric,
  ch numeric,
  cya numeric,
  salt numeric,
  tds numeric,
  water_temp_f numeric,
  notes text
);

create table if not exists slam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pool_id uuid not null references pools(id) on delete cascade,
  started_at timestamptz not null default now(),
  cya_at_start numeric not null,
  completed_at timestamptz,
  daily_checks jsonb not null default '[]'::jsonb
);

create index if not exists tests_pool_id_idx on tests(pool_id);
create index if not exists slam_sessions_pool_id_idx on slam_sessions(pool_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — every user can only see/edit their own rows.
-- ---------------------------------------------------------------------------
alter table pools enable row level security;
alter table tests enable row level security;
alter table slam_sessions enable row level security;

drop policy if exists "pools_owner" on pools;
create policy "pools_owner" on pools
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tests_owner" on tests;
create policy "tests_owner" on tests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "slam_sessions_owner" on slam_sessions;
create policy "slam_sessions_owner" on slam_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
