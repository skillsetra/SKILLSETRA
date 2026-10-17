-- SKILLSETRA — SUPABASE DEMO DATABASE SETUP
-- Purpose: clean Supabase setup for a DEPLOYED DEMO build.
-- Important: DEMO_MODE is controlled by the FastAPI/Next.js environment variables,
-- not by PostgreSQL. This SQL prepares the optional Supabase catalog and compatibility
-- tables; the demo workspace/auth is handled by the application in demo mode.
-- Safe to run in a fresh Supabase project.

create extension if not exists pgcrypto;

-- Runtime metadata (informational; the app reads DEMO_MODE from environment variables).
create table if not exists skillsetra_runtime_config(
  id text primary key,
  demo_mode boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into skillsetra_runtime_config(id, demo_mode)
values ('default', true)
on conflict (id) do update set demo_mode = excluded.demo_mode, updated_at = now();

-- Public catalog used by the application when catalog data is fetched from Supabase.
create table if not exists competencies(
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
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
  primary key(role_id, competency_id)
);

create table if not exists subjects(
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  overview text,
  prerequisites jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists learning_resources(
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  title text not null,
  url text not null,
  kind text,
  level text,
  provider text,
  verified boolean default false,
  metadata jsonb default '{}',
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

-- Seed competency catalog.
insert into competencies(name,description) values
('Python','Python programming, APIs, testing and maintainable application code.'),
('SQL','Relational queries, modeling, joins, indexes and data reasoning.'),
('Pandas','Data preparation, transformation and practical analysis.'),
('Machine Learning','Modeling, evaluation, experimentation and production ML reasoning.'),
('AI Engineering','LLM applications, retrieval, evaluation and AI product engineering.'),
('FastAPI','Typed Python APIs, validation, authentication and service boundaries.'),
('Docker','Containers, reproducible environments and deployment workflows.'),
('Deployment','Shipping, configuration, monitoring and production delivery.'),
('Engineering','Software architecture, implementation quality and maintainability.'),
('Testing','Unit, integration, contract and end-to-end testing.'),
('Reasoning','Explaining decisions, trade-offs, assumptions and verification steps.'),
('Debugging','Diagnosing failures and systematically validating fixes.'),
('Transfer','Applying knowledge to unfamiliar or changed contexts.'),
('React','Component architecture, state, accessibility and performance.'),
('System Design','Scalability, reliability and architecture trade-offs.')
on conflict(name) do update set description = excluded.description;

-- Seed career roles used by the catalog.
insert into career_roles(name,description) values
('AI Engineer','Build and operate AI-enabled applications and services.'),
('ML Engineer','Develop, evaluate and deploy machine-learning systems.'),
('Full-Stack Developer','Build complete web products across frontend and backend.'),
('Backend Engineer','Design and implement reliable backend services and APIs.'),
('Frontend Engineer','Build accessible, performant and maintainable web interfaces.'),
('Data Engineer','Build reliable data pipelines and production data systems.'),
('Cloud Engineer','Design, deploy and operate scalable cloud infrastructure.'),
('DevOps Engineer','Automate delivery, infrastructure and observability.'),
('Cybersecurity','Build and assess secure systems and defensive controls.')
on conflict(name) do nothing;

-- Role-to-competency mappings.
insert into role_competencies(role_id,competency_id,importance)
select r.id,c.id,2 from career_roles r, competencies c
where r.name='AI Engineer' and c.name in ('Python','FastAPI','AI Engineering','Testing','Deployment','Reasoning','Transfer')
on conflict do nothing;

insert into role_competencies(role_id,competency_id,importance)
select r.id,c.id,2 from career_roles r, competencies c
where r.name='ML Engineer' and c.name in ('Python','SQL','Pandas','Machine Learning','Testing','Engineering','Deployment')
on conflict do nothing;

insert into role_competencies(role_id,competency_id,importance)
select r.id,c.id,2 from career_roles r, competencies c
where r.name='Backend Engineer' and c.name in ('Python','SQL','FastAPI','Docker','Testing','Engineering','Deployment')
on conflict do nothing;

insert into role_competencies(role_id,competency_id,importance)
select r.id,c.id,2 from career_roles r, competencies c
where r.name='Frontend Engineer' and c.name in ('React','Testing','Engineering','Debugging','Transfer')
on conflict do nothing;

insert into role_competencies(role_id,competency_id,importance)
select r.id,c.id,2 from career_roles r, competencies c
where r.name='Full-Stack Developer' and c.name in ('React','Python','FastAPI','SQL','Docker','Testing','Engineering','Deployment')
on conflict do nothing;

-- Core learning subjects.
insert into subjects(slug,name,overview) values
('python','Python','Language fluency, testing, packaging and practical application.'),
('sql','SQL','Querying, relational modeling, transactions and data reasoning.'),
('react','React','Component architecture, state, accessibility and performance.'),
('fastapi','FastAPI','Typed Python APIs, validation, authentication and service boundaries.'),
('docker','Docker','Reproducible containers and deployment workflows.'),
('machine-learning','Machine Learning','Modeling, evaluation and practical ML systems.'),
('ai-engineering','AI Engineering','AI-enabled applications, evaluation and reliability.'),
('data-engineering','Data Engineering','Pipelines, data quality and reliable workflows.'),
('system-design','System Design','Scalability, reliability and architecture trade-offs.'),
('cybersecurity','Cybersecurity','Secure engineering, threat modeling and defensive controls.'),
('devops','DevOps','CI/CD, automation and observability.'),
('testing','Testing','Unit, integration, contract and end-to-end testing.'),
('git-github','Git/GitHub','Source control, collaboration and repository evidence.'),
('technical-communication','Technical Communication','Architecture explanation, documentation and project defense.')
on conflict(slug) do nothing;

-- A few verified base resources. The full supplied material library remains in the
-- project package and is served by the FastAPI materials layer in demo mode.
insert into learning_resources(subject_id,title,url,kind,level,provider,verified)
select s.id,x.title,x.url,x.kind,x.level,x.provider,true
from (values
('python','Python Tutorial','https://docs.python.org/3/tutorial/','documentation','all','Python'),
('sql','PostgreSQL Tutorial','https://www.postgresql.org/docs/current/tutorial.html','documentation','beginner','PostgreSQL'),
('react','React Learn','https://react.dev/learn','documentation','all','React'),
('fastapi','FastAPI Documentation','https://fastapi.tiangolo.com/','documentation','all','FastAPI'),
('docker','Docker Get Started','https://docs.docker.com/get-started/','documentation','beginner','Docker'),
('machine-learning','scikit-learn User Guide','https://scikit-learn.org/stable/user_guide.html','documentation','intermediate','scikit-learn'),
('ai-engineering','Puter.js AI','https://docs.puter.com/AI/','documentation','all','Puter'),
('devops','GitHub Actions Documentation','https://docs.github.com/en/actions','documentation','all','GitHub'),
('testing','pytest Documentation','https://docs.pytest.org/en/stable/','documentation','all','pytest'),
('cybersecurity','OWASP Top 10','https://owasp.org/www-project-top-ten/','reference','all','OWASP'),
('git-github','GitHub Skills','https://skills.github.com/','course','beginner','GitHub'),
('technical-communication','Google Technical Writing','https://developers.google.com/tech-writing','course','beginner','Google')
) as x(slug,title,url,kind,level,provider)
join subjects s on s.slug=x.slug
where not exists(select 1 from learning_resources lr where lr.title=x.title);

-- RLS: demo mode reads catalog without authentication.
alter table skillsetra_runtime_config enable row level security;
alter table competencies enable row level security;
alter table career_roles enable row level security;
alter table role_competencies enable row level security;
alter table subjects enable row level security;
alter table learning_resources enable row level security;
alter table youtube_resources enable row level security;

-- Public read is intentional for the public/demo catalog only.
DO $$ BEGIN
  if not exists (select 1 from pg_policies where schemaname=current_schema() and tablename='skillsetra_runtime_config' and policyname='runtime_config_public_read') then
    create policy runtime_config_public_read on skillsetra_runtime_config for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname=current_schema() and tablename='competencies' and policyname='competencies_public_read') then
    create policy competencies_public_read on competencies for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname=current_schema() and tablename='career_roles' and policyname='career_roles_public_read') then
    create policy career_roles_public_read on career_roles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname=current_schema() and tablename='role_competencies' and policyname='role_competencies_public_read') then
    create policy role_competencies_public_read on role_competencies for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname=current_schema() and tablename='subjects' and policyname='subjects_public_read') then
    create policy subjects_public_read on subjects for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname=current_schema() and tablename='learning_resources' and policyname='learning_resources_public_read') then
    create policy learning_resources_public_read on learning_resources for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname=current_schema() and tablename='youtube_resources' and policyname='youtube_resources_public_read') then
    create policy youtube_resources_public_read on youtube_resources for select using (true);
  end if;
END $$;

-- Verification.
select 'DEMO DB READY' as status;
select count(*) as competency_count from competencies;
select count(*) as role_count from career_roles;
select count(*) as subject_count from subjects;
select count(*) as learning_resource_count from learning_resources;
select demo_mode from skillsetra_runtime_config where id='default';
