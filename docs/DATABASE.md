# Database setup and migration paths

## Local demo storage

The anonymous demo uses `backend/app/core/workspace.py` to create a SQLite `workspace_snapshots` table in `backend/data/skillsetra_demo.db` on first use. Workspace writes are keyed by the demo session. The generated database is excluded from the release ZIP so test state and prior sessions are not redistributed. Copy the database separately if you intentionally need to preserve an existing local demo's history while upgrading.

## Current workspace adapter / primary Supabase setup

The current FastAPI adapter stores user-scoped JSON snapshots in `workspace_snapshots`. The current schema and non-destructive migration are included at `database/schema.sql` and `database/migrations/20261009_workspace_snapshots.sql`. `database/README.md` and `SKILLSETRA_SUPABASE_DEMO_SETUP.sql` describe the setup steps. Back up the database and test RLS with two separate users in staging before production.

## Extended Supabase schema (optional)

The extended model is in `database/supabase/migrations/003_skillsetra_production.sql` with its catalog seed at `database/supabase/seed/001_catalog.sql`. It depends on the preceding SQL objects described in the migrations. Review all referenced base tables and adapt it to the schema actually deployed before running it; do not blindly apply both schema paths to a live database without a migration plan.

For production, verify authentication, ownership scoping, RLS, backup/restore, retention, deletion, and two-user isolation in staging. Never put the Supabase service-role key in frontend variables.
