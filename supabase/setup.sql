-- Ironward — one-time setup script.
-- Supabase → SQL Editor → New query → paste this whole file → Run.
-- Safe to re-run.

create extension if not exists "pgcrypto";

-- A finished workout. The exercises and their sets are one JSON array:
-- a workout is always read and written whole, and reports are computed in
-- the app, so splitting sets into their own table would buy nothing.
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  program_id text,
  day_key text,
  title text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  note text,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_started_idx on public.workouts (user_id, started_at desc);

create table if not exists public.bodyweights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  kg numeric(5, 1) not null check (kg > 0 and kg < 500),
  created_at timestamptz not null default now()
);

create index if not exists bodyweights_user_day_idx on public.bodyweights (user_id, day desc);

-- A plan the person built or imported from an AI answer. Stored whole:
-- days, exercises, sets and rep ranges live in `data`.
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_user_idx on public.plans (user_id);

-- Protein eaten and body measurements (cm), one row per entry.
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('protein', 'waist', 'chest', 'arm', 'thigh', 'hips')),
  value numeric(6, 1) not null check (value >= 0 and value < 10000),
  created_at timestamptz not null default now()
);

create index if not exists daily_logs_user_day_idx on public.daily_logs (user_id, day desc);

-- Row-level security: each person can only ever see and change their own rows.
alter table public.workouts enable row level security;
alter table public.bodyweights enable row level security;
alter table public.plans enable row level security;
alter table public.daily_logs enable row level security;

drop policy if exists "own daily logs" on public.daily_logs;
create policy "own daily logs" on public.daily_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own workouts" on public.workouts;
create policy "own workouts" on public.workouts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own bodyweights" on public.bodyweights;
create policy "own bodyweights" on public.bodyweights
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own plans" on public.plans;
create policy "own plans" on public.plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- "Delete my account" in Settings. Runs as the table owner so it can remove
-- the auth user; every row above cascades from it.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
