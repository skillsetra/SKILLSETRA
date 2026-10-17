create extension if not exists pgcrypto;

-- Workspace snapshot store used by the current FastAPI workspace adapter.
-- JSON is scoped to the authenticated Supabase user and protected by RLS below.
create table if not exists workspace_snapshots(
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);

create table if not exists profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null,
 target_role text,
 experience_level text,
 primary_goal text,
 avatar_url text,
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);

create table if not exists user_settings(
 user_id uuid primary key references auth.users(id) on delete cascade,
 ai_provider text default 'puter',
 ai_model text default 'openai/gpt-oss-20b',
 language text default 'English',
 notifications boolean default true,
 appearance text default 'dark',
 retain_evidence boolean default true,
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);

create table if not exists competencies(
 id uuid primary key default gen_random_uuid(),
 name text unique not null,
 description text,
 created_at timestamptz default now()
);

create table if not exists competency_levels(
 id uuid primary key default gen_random_uuid(),
 competency_id uuid references competencies(id) on delete cascade,
 level_name text not null,
 level_order int not null,
 definition text,
 unique(competency_id,level_order)
);

create table if not exists user_competencies(
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete cascade,
 competency_id uuid references competencies(id) on delete cascade,
 status text not null check(status in('strong_evidence','developing','limited','transfer_gap')),
 depth_level text not null default 'Beginner',
 evidence_strength int check(evidence_strength between 0 and 100),
 evidence_count int default 0,
 confidence text check(confidence in('low','medium','high')),
 last_updated timestamptz default now(),
 unique(user_id,competency_id)
);

create table if not exists evidence(
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete cascade,
 competency_id uuid references competencies(id),
 source_type text not null,
 source_id text,
 activity text not null,
 summary text not null,
 result text,
 confidence text,
 metadata jsonb default '{}'::jsonb,
 created_at timestamptz default now()
);

create table if not exists challenges(
 id uuid primary key default gen_random_uuid(),
 slug text unique not null,
 title text not null,
 statement text not null,
 hidden_competency boolean default true,
 constraints_json jsonb default '[]'::jsonb,
 starter_code text,
 difficulty text default 'Intermediate',
 created_at timestamptz default now()
);

create table if not exists challenge_attempts(
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid references challenges(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 answer text not null,
 submitted_at timestamptz default now()
);

create table if not exists challenge_evaluations(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid references challenge_attempts(id) on delete cascade,
 mode text not null,
 observed text,
 evidence text,
 uncertain text,
 next_step text,
 raw_ai jsonb default '{}'::jsonb,
 created_at timestamptz default now()
);

create table if not exists projects(
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete cascade,
 name text not null,
 description text,
 repo_url text,
 stack jsonb default '[]'::jsonb,
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);

create table if not exists project_analysis(
 id uuid primary key default gen_random_uuid(),
 project_id uuid references projects(id) on delete cascade,
 mode text not null,
 strengths jsonb,
 gaps jsonb,
 architecture jsonb,
 testing jsonb,
 security jsonb,
 deployment jsonb,
 maintainability jsonb,
 created_at timestamptz default now()
);

create table if not exists project_upgrades(
 id uuid primary key default gen_random_uuid(),
 project_id uuid references projects(id) on delete cascade,
 title text not null,
 problem text,
 why text,
 competency text,
 difficulty text,
 implementation text,
 evidence_created text,
 status text default 'not_started' check(status in('not_started','in_progress','completed','verified')),
 created_at timestamptz default now()
);

create table if not exists github_connections(
 id uuid primary key default gen_random_uuid(),
 user_id uuid unique references auth.users(id) on delete cascade,
 github_user text,
 access_token_encrypted text,
 created_at timestamptz default now()
);

create table if not exists github_repositories(
 id uuid primary key default gen_random_uuid(),
 connection_id uuid references github_connections(id) on delete cascade,
 external_id bigint,
 name text,
 full_name text,
 html_url text,
 selected boolean default false,
 metadata jsonb default '{}'::jsonb,
 created_at timestamptz default now()
);

create table if not exists career_roles(
 id uuid primary key default gen_random_uuid(),
 name text unique not null,
 description text
);

create table if not exists role_competencies(
 role_id uuid references career_roles(id) on delete cascade,
 competency_id uuid references competencies(id) on delete cascade,
 importance int default 1,
 primary key(role_id,competency_id)
);

create table if not exists job_market_snapshots(
 id uuid primary key default gen_random_uuid(),
 role_id uuid references career_roles(id) on delete cascade,
 market_date date not null,
 location text not null,
 experience_band text not null,
 salary_min_inr bigint,
 salary_max_inr bigint,
 source_url text,
 source_name text,
 notes text,
 created_at timestamptz default now()
);

create table if not exists learning_resources(
 id uuid primary key default gen_random_uuid(),
 competency_id uuid references competencies(id),
 title text not null,
 provider text,
 url text not null,
 kind text,
 level text,
 verified boolean default false,
 created_at timestamptz default now()
);

create table if not exists youtube_resources(
 id uuid primary key default gen_random_uuid(),
 competency_id uuid references competencies(id),
 title text not null,
 channel text,
 url text not null,
 verified boolean default false
);

create table if not exists assessments(
 id uuid primary key default gen_random_uuid(),
 slug text unique not null,
 title text not null,
 role_id uuid references career_roles(id),
 pass_percent int default 70,
 created_at timestamptz default now()
);

create table if not exists assessment_questions(
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid references assessments(id) on delete cascade,
 competency_id uuid references competencies(id),
 question text not null,
 options jsonb not null,
 correct_option text not null,
 explanation text,
 question_order int not null
);

create table if not exists assessment_attempts(
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid references assessments(id),
 user_id uuid references auth.users(id) on delete cascade,
 score_percent int,
 passed boolean,
 started_at timestamptz default now(),
 completed_at timestamptz
);

create table if not exists assessment_answers(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid references assessment_attempts(id) on delete cascade,
 question_id uuid references assessment_questions(id),
 selected_option text,
 is_correct boolean
);

create table if not exists roadmaps(
 id uuid primary key default gen_random_uuid(),
 user_id uuid unique references auth.users(id) on delete cascade,
 target_role text not null,
 title text not null,
 description text,
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);

create table if not exists roadmap_steps(
 id uuid primary key default gen_random_uuid(),
 roadmap_id uuid references roadmaps(id) on delete cascade,
 step_order int not null,
 title text not null,
 objective text,
 why text,
 skills jsonb default '[]'::jsonb,
 resources jsonb default '[]'::jsonb,
 evidence_required text,
 estimate text,
 status text default 'planned'
);

create table if not exists project_recommendations(
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete cascade,
 title text not null,
 why text,
 gap text,
 skills jsonb,
 technologies jsonb,
 difficulty text,
 effort_hours int,
 milestones jsonb,
 evidence jsonb,
 created_at timestamptz default now()
);

create table if not exists project_defense_sessions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete cascade,
 project_id uuid references projects(id),
 questions jsonb,
 answers jsonb,
 evaluation jsonb,
 created_at timestamptz default now()
);

create table if not exists notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete cascade,
 title text not null,
 body text,
 read boolean default false,
 created_at timestamptz default now()
);

create index if not exists evidence_user_created_idx on evidence(user_id,created_at desc);
create index if not exists user_comp_user_idx on user_competencies(user_id);
create index if not exists challenges_attempt_user_idx on challenge_attempts(user_id,submitted_at desc);
create index if not exists projects_user_idx on projects(user_id);
create index if not exists assessment_attempt_user_idx on assessment_attempts(user_id,completed_at desc);
create index if not exists roadmap_steps_roadmap_idx on roadmap_steps(roadmap_id,step_order);
create index if not exists jobs_role_date_idx on job_market_snapshots(role_id,market_date desc);

-- Updated-at helper
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();
drop trigger if exists settings_updated_at on user_settings;
create trigger settings_updated_at before update on user_settings for each row execute function set_updated_at();
drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at before update on projects for each row execute function set_updated_at();
drop trigger if exists roadmaps_updated_at on roadmaps;
create trigger roadmaps_updated_at before update on roadmaps for each row execute function set_updated_at();

create table if not exists subjects(
 id uuid primary key default gen_random_uuid(),
 slug text unique not null,
 name text not null,
 category text not null,
 description text,
 levels jsonb default '[]'::jsonb,
 languages jsonb default '["English"]'::jsonb,
 created_at timestamptz default now()
);

create table if not exists subject_resources(
 id uuid primary key default gen_random_uuid(),
 subject_id uuid references subjects(id) on delete cascade,
 title text not null,
 resource_type text not null,
 url text not null,
 language text default 'English',
 created_at timestamptz default now()
);

create index if not exists subjects_category_idx on subjects(category);
create index if not exists subject_resources_subject_idx on subject_resources(subject_id);

-- RLS
alter table workspace_snapshots enable row level security;
alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table subjects enable row level security;
alter table subject_resources enable row level security;
alter table user_competencies enable row level security;
alter table evidence enable row level security;
alter table challenge_attempts enable row level security;
alter table projects enable row level security;
alter table project_analysis enable row level security;
alter table project_upgrades enable row level security;
alter table github_connections enable row level security;
alter table github_repositories enable row level security;
alter table assessment_attempts enable row level security;
alter table assessment_answers enable row level security;
alter table roadmaps enable row level security;
alter table roadmap_steps enable row level security;
alter table project_recommendations enable row level security;
alter table project_defense_sessions enable row level security;
alter table notifications enable row level security;

drop policy if exists workspace_snapshots_self on workspace_snapshots;
create policy workspace_snapshots_self on workspace_snapshots for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for all using(auth.uid()=id) with check(auth.uid()=id);
drop policy if exists settings_self on user_settings;
create policy settings_self on user_settings for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists subjects_public on subjects;
create policy subjects_public on subjects for select using(true);
drop policy if exists subject_resources_public on subject_resources;
create policy subject_resources_public on subject_resources for select using(true);
drop policy if exists comp_self on user_competencies;
create policy comp_self on user_competencies for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists evidence_self on evidence;
create policy evidence_self on evidence for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists attempts_self on challenge_attempts;
create policy attempts_self on challenge_attempts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists projects_self on projects;
create policy projects_self on projects for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists github_self on github_connections;
create policy github_self on github_connections for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists assessments_self on assessment_attempts;
create policy assessments_self on assessment_attempts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists answers_self on assessment_answers;
create policy answers_self on assessment_answers for all using(exists(select 1 from assessment_attempts a where a.id=assessment_answers.attempt_id and a.user_id=auth.uid())) with check(exists(select 1 from assessment_attempts a where a.id=assessment_answers.attempt_id and a.user_id=auth.uid()));
drop policy if exists roadmap_self on roadmaps;
create policy roadmap_self on roadmaps for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists rec_self on project_recommendations;
create policy rec_self on project_recommendations for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists defense_self on project_defense_sessions;
create policy defense_self on project_defense_sessions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists notifications_self on notifications;
create policy notifications_self on notifications for all using(auth.uid()=user_id) with check(auth.uid()=user_id);

drop policy if exists analysis_owner on project_analysis;
create policy analysis_owner on project_analysis for all using(exists(select 1 from projects p where p.id=project_analysis.project_id and p.user_id=auth.uid())) with check(exists(select 1 from projects p where p.id=project_analysis.project_id and p.user_id=auth.uid()));
drop policy if exists upgrades_owner on project_upgrades;
create policy upgrades_owner on project_upgrades for all using(exists(select 1 from projects p where p.id=project_upgrades.project_id and p.user_id=auth.uid())) with check(exists(select 1 from projects p where p.id=project_upgrades.project_id and p.user_id=auth.uid()));
drop policy if exists repos_owner on github_repositories;
create policy repos_owner on github_repositories for all using(exists(select 1 from github_connections g where g.id=github_repositories.connection_id and g.user_id=auth.uid())) with check(exists(select 1 from github_connections g where g.id=github_repositories.connection_id and g.user_id=auth.uid()));
drop policy if exists roadmap_steps_owner on roadmap_steps;
create policy roadmap_steps_owner on roadmap_steps for all using(exists(select 1 from roadmaps r where r.id=roadmap_steps.roadmap_id and r.user_id=auth.uid())) with check(exists(select 1 from roadmaps r where r.id=roadmap_steps.roadmap_id and r.user_id=auth.uid()));
