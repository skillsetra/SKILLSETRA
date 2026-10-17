# Skillsetra Supabase setup guide

This project already includes database files. Use this guide with a new Supabase project; do not commit live keys into the ZIP or Git repository.

## 1. Create a Supabase project

1. Sign in to Supabase and create a new project in the desired organization.
2. Choose a strong database password and keep it in a password manager.
3. Wait for the database to finish provisioning.
4. In **Project Settings → API**, copy the Project URL and the public `anon`/publishable key. Keep the `service_role`/secret key for server-only use.

## 2. Create the database schema

Open **SQL Editor → New query** in the Supabase dashboard. Run these supplied files in this order:

1. `database/schema.sql` — core competency, activity, evidence, project, and workspace snapshot tables plus row-level security policies.
2. `database/supabase/SKILLSETRA_AUTH_SETUP.sql` — auth profile creation/backfill trigger and per-user workspace snapshots. The statements are intended to be safe to re-run, but still back up a database before altering a populated production project.

Check the SQL Editor results for errors. In **Table Editor**, confirm `profiles` and `workspace_snapshots` exist. The current backend persists full claim/project/resume/workspace objects in each authenticated user's `workspace_snapshots.data` JSONB document. Claims, projects and resume entries are *not* automatically split into separate normalized rows by the current request handlers.

## 3. Configure the frontend

Copy `frontend/.env.example` to `frontend/.env.local` (do not overwrite a file that already contains local settings) and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_API_BASE_URL=
BACKEND_INTERNAL_URL=http://127.0.0.1:8000
```

Replace placeholders with the values from your Supabase dashboard. Only the public anon/publishable key belongs in `NEXT_PUBLIC_*`. Do **not** put a service-role key in this file or in any variable with `NEXT_PUBLIC_`.

## 4. Configure the backend

Copy `backend/.env.example` to `backend/.env` and configure:

```dotenv
ENVIRONMENT=development
DEMO_MODE=true
ALLOW_PRODUCTION_DEMO=false
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
CORS_ORIGINS=http://localhost:3000
AI_PROVIDER=puter
PUTER_MODEL=openai/gpt-oss-20b
```

Use the same project URL and public key. The service-role key is privileged: only put it in a private backend/host secret setting, never in the frontend, logs, screenshots, source control, or the ZIP sent to users. Confirm the backend implementation and token flow for your chosen deployment before enabling real users. The application normally passes the authenticated user's access token to the workspace adapter for row-level ownership; do not bypass RLS to fix an auth problem.

For production, also set the environment-specific `CORS_ORIGINS` to the exact frontend origin(s), and `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS URL. Keep TLS enabled.

## 5. Configure Supabase Auth URLs

In **Authentication → URL Configuration**:

- Set **Site URL** to `http://localhost:3000` for local development, or your real HTTPS domain for production.
- Add the local sign-in/sign-up redirect URLs used by this project (at minimum the local origin) to **Redirect URLs**.
- Add the production origin and exact callback/redirect paths actually used by your deployed auth pages. Do not allow arbitrary wildcard domains in production.
- Decide whether email confirmation is enabled. If it is enabled, make sure the confirmation link returns to the correct local/production URL and configure SMTP for real user traffic.

## 6. Start the services

For the local Windows workflow, start the full-stack launcher `START_FULLSTACK.bat` from the extracted project root. It runs the frontend and backend locally; it does not create a Supabase project or apply SQL automatically. Restart it after environment changes.

For a container deployment, use the appropriate Docker Compose file and pass secrets through your host's environment/secrets manager. Do not assume local `.env` files are copied into a production image.

## 7. Demo and account paths

`Let's Get Started` uses Supabase account creation/sign-in. `Try a Demo` uses a separate, session-scoped demo workspace. For a public production deployment that intentionally offers both, opt in on the frontend and backend using the relevant `NEXT_PUBLIC_DEMO_MODE=true`, `DEMO_MODE=true`, and `ALLOW_PRODUCTION_DEMO=true` flags. Keep production demo disabled if you do not want anonymous users. Demo data is not a substitute for an authenticated, backed-up account.

## 8. Verify isolation and persistence

1. Register a first test account, save a claim, analyze/save a project, and explicitly click **Save to workspace** in Resume Builder.
2. Refresh or sign out/in; open **Claim evidence → Show my claims & records**. Confirm all three appear.
3. Register a second test account. Verify that the first account's claims, project records, resume, and target role are not visible to the second account.
4. In a private browser window, try the demo if enabled and confirm it has its own temporary workspace.
5. Review RLS policies in Supabase and the backend logs before production launch. Never use the service-role key from client code.

## 9. How progress is calculated

The displayed role pathway completion is a transparent weighted coverage metric: 45% recorded performance signal, 25% inspectable role-mapped evidence coverage, 20% assessment/practice coverage, and 10% claim/resume coverage. Mentioning a required skill in a project record can create a low-confidence mapped artifact entry labelled **review required**; it is not independent verification. Claims and resumes can affect only the small self-reported coverage component. They do not raise the recorded skill-performance signal or count as verified mastery. Duplicate mentions for one skill are deduplicated.

## Troubleshooting

- **Sign-up works but workspace save fails:** verify the backend points to the same Supabase project, the user access token reaches the backend, and the `workspace_snapshots` table/RLS policy exists.
- **Redirect URL error:** use the exact local/deployed origin configured in Supabase Auth URL Configuration.
- **Demo unavailable in production:** check the intentional production demo flags; do not disable the production safety guard without understanding the consequence.
- **AI provider unavailable:** claim/project records should remain saved if the save was successful, but an AI-generated explanation may still be unavailable. The client now retries one transient Puter AI failure; persistent provider outages, quota limits, browser restrictions, and network failures cannot be guaranteed away. Retry from the page after the status message.
- **Existing data:** back up SQL/database snapshots before running schema migrations on a populated project.
