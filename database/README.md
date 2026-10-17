# Supabase setup

1. Create a Supabase project.
2. Run `schema.sql`.
3. Run `seed.sql`.
4. In Authentication, enable Email/Password.
5. Add the frontend URL to Auth → URL Configuration for local development:
   `http://localhost:3000`
6. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.

For a production deployment, add an email provider, rate limits, audit logging and secret rotation.


## Current workspace adapter migration

The current FastAPI adapter stores a user-scoped JSON snapshot in `workspace_snapshots`. The schema and non-destructive migration are included at `schema.sql` and `migrations/20261009_workspace_snapshots.sql`. Back up the database and test RLS using two separate Supabase users in staging before production. The migration uses `CREATE TABLE IF NOT EXISTS` and replaces only the named policy; it does not delete existing table data.
