-- Non-destructive migration for the JSON workspace adapter used by the current backend.
-- Back up the project and test in staging before applying to production.
create table if not exists public.workspace_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspace_snapshots enable row level security;
drop policy if exists workspace_snapshots_self on public.workspace_snapshots;
create policy workspace_snapshots_self on public.workspace_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
