-- SKILLSETRA Supabase account/profile setup.
-- Run in Supabase SQL Editor after creating your Supabase project.
-- This is additive and safe to re-run; back up existing production data before schema changes.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Learner',
  target_role text,
  experience_level text,
  primary_goal text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill profile rows for accounts that existed before this trigger was installed.
insert into public.profiles (id, name, target_role, experience_level, primary_goal, created_at, updated_at)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Learner'),
  coalesce(u.raw_user_meta_data ->> 'target_role', ''),
  coalesce(u.raw_user_meta_data ->> 'experience_level', 'Intermediate'),
  coalesce(u.raw_user_meta_data ->> 'primary_goal', ''),
  now(), now()
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.skillsetra_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, target_role, experience_level, primary_goal, created_at, updated_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Learner'),
    coalesce(new.raw_user_meta_data ->> 'target_role', ''),
    coalesce(new.raw_user_meta_data ->> 'experience_level', 'Intermediate'),
    coalesce(new.raw_user_meta_data ->> 'primary_goal', ''),
    now(), now()
  )
  on conflict (id) do update set
    name = excluded.name,
    target_role = coalesce(nullif(public.profiles.target_role, ''), excluded.target_role),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists skillsetra_auth_user_created on auth.users;
create trigger skillsetra_auth_user_created
after insert on auth.users
for each row execute procedure public.skillsetra_handle_new_auth_user();

-- Persistent per-account workspace snapshots. The backend attaches the user's access token,
-- so this policy confines each snapshot to the matching authenticated user.
create table if not exists public.workspace_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.workspace_snapshots enable row level security;
drop policy if exists workspace_snapshots_self on public.workspace_snapshots;
create policy workspace_snapshots_self on public.workspace_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
