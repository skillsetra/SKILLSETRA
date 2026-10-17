# Skillsetra — Supabase + Vercel deployment guide

This repository contains both a Next.js frontend and a FastAPI Python backend. The most straightforward split deployment is:

- **Vercel:** Next.js frontend (`frontend/` directory)
- **Render:** FastAPI backend (`backend/` directory)
- **Supabase:** Auth + Postgres storage for user profiles and workspace snapshots

Vercel's `NEXT_PUBLIC_API_BASE_URL` tells browser API requests where the FastAPI service lives. `BACKEND_INTERNAL_URL` also configures the Next.js external rewrite fallback. Configure both to the Render API origin (no trailing slash). This guide does not deploy the bundled single-container Docker image to Vercel.

## Part 1 — Prepare your repository

1. Download and extract the latest Skillsetra ZIP.
2. Put the extracted project files in the GitHub repository you intend to deploy. Preserve the top-level `frontend/`, `backend/`, `database/`, and other project folders; do not upload the ZIP as a nested folder by accident.
3. Commit and push the source to GitHub. Do not commit `.env.local`, `.env`, `.env.production`, database snapshots, API keys, or admin passwords.
4. Locally, before deploying, run the frontend commands from `frontend/`:

   ```bash
   npm install
   npm run typecheck
   npm test
   npm run build
   ```

   If `npm install` produces a `package-lock.json`, review and commit it so future builds can use reproducible installs. The ZIP's static checks are not a substitute for completing a clean local production build.

## Part 2 — Create and configure Supabase

### 2.1 Create the project

1. Open [Supabase](https://supabase.com/) and create a new project.
2. Choose your organization, a project name such as `skillsetra-prod`, a strong database password, and a region near your expected users/backend.
3. Wait until the database has finished provisioning.

### 2.2 Apply Skillsetra's SQL files

In the Supabase dashboard, open **SQL Editor → New query** and run these files from the project ZIP in this order:

1. `database/schema.sql`
2. `database/supabase/SKILLSETRA_AUTH_SETUP.sql`

Read the script and check the SQL Editor output for errors after each run. In Table Editor, confirm that `profiles` and `workspace_snapshots` exist. These are used by the current authenticated-workspace implementation. Back up an existing production database before running any schema changes against it.

### 2.3 Copy the required API values

In the Supabase project's **Project Settings / API** (or **Connect** panel), copy:

- **Project URL** — looks like `https://YOUR_PROJECT_REF.supabase.co`.
- **Public anon/publishable key** — this is intended for frontend use when Row Level Security is enabled and correctly configured.
- **Server-only service-role key** — this project currently expects it in `SUPABASE_SERVICE_ROLE_KEY` in the backend environment. Never put it in a frontend variable or browser bundle.

Do not confuse the database password with an API key. Keep the database password and the service-role key private.

### 2.4 Configure Supabase Auth URLs

Open **Authentication → URL Configuration**:

- For local development, use `http://localhost:3000` as the Site URL and add `http://localhost:3000/**` to Redirect URLs.
- After Vercel deploys, change Site URL to the production URL, for example `https://YOUR-PROJECT.vercel.app`.
- Add the exact production origin / callback redirect paths used by your deployed app. Add a Vercel preview pattern only if you actually test preview deployments; avoid broad arbitrary domains in production.
- Confirm whether email confirmation is enabled. If enabled, test the confirmation link end-to-end. Configure a custom SMTP provider before relying on Supabase's email delivery for real production traffic.

## Part 3 — Deploy the FastAPI backend to Render

1. Open [Render](https://render.com/) and choose **New → Web Service**.
2. Connect the GitHub repository containing Skillsetra.
3. Select **Docker** as the runtime and leave **Root Directory** blank (repository root). Set **Dockerfile Path** to `./Dockerfile.api` and **Docker Context** to `.`. The supplied API Dockerfile copies the `learning-materials/` folder that the backend reads at runtime; setting the root directory to `backend` would omit that sibling folder from the build context.
4. The Dockerfile installs `backend/requirements.txt` and starts FastAPI on Render's `$PORT` (falling back to port `10000` locally).
5. Create the service. Copy its public HTTPS origin when Render finishes, for example `https://YOUR-API.onrender.com`. Do not add `/api/v1` at the end of the origin.
6. Open the Render service's **Environment** page and add the server environment variables below. Substitute your real values; do not put these secrets in GitHub or in the ZIP.

   ```dotenv
   ENVIRONMENT=production
   DEMO_MODE=true
   ALLOW_PRODUCTION_DEMO=true
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
   CORS_ORIGINS=https://YOUR-PROJECT.vercel.app
   AI_PROVIDER=puter
   PUTER_MODEL=openai/gpt-oss-20b
   RATE_LIMIT_PER_MINUTE=60
   REQUEST_TIMEOUT_SECONDS=20
   DEMO_SESSION_TTL_HOURS=72
   ```

   The `CORS_ORIGINS` value must contain the exact Vercel site origin; after adding a custom domain, include that exact HTTPS origin too, comma-separated. Do not use `*` for production origins when credentials/auth are involved.

   The three demo settings shown above intentionally allow both anonymous demo sessions and Supabase accounts. To deploy **accounts only**, set `DEMO_MODE=false` and `ALLOW_PRODUCTION_DEMO=false`, and set `NEXT_PUBLIC_DEMO_MODE=false` in the frontend in Part 4.

8. In the Render service's **Settings / Health Check Path**, set `/api/v1/health` if the dashboard provides that field.
9. Open `https://YOUR-API.onrender.com/api/v1/health`. Confirm it returns a successful health response before connecting the frontend.

**Persistence note:** the Python service's local SQLite file is not durable storage on an ephemeral/free deployment. Authenticated user workspaces should use the configured Supabase snapshot table. Public demo snapshots may disappear on restart unless you separately configure persistent storage. Free services may sleep during inactivity and the first request after sleep may be slow.

## Part 4 — Deploy the Next.js frontend to Vercel

1. Open [Vercel](https://vercel.com/) and click **Add New → Project**.
2. Import the same GitHub repository.
3. In Project Settings / Import Configuration, set **Root Directory** to `frontend` and allow Vercel to detect **Next.js**. Do not select the repository root; this project is a monorepo with the app inside `frontend/`.
4. Use the default Next.js install/build settings unless the deployment log indicates a specific problem. The app's build command is `npm run build`; do not change the output directory from Vercel's detected Next.js default.
5. Before deploying (or through **Settings → Environment Variables**), add these values for Production and Preview as appropriate:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   NEXT_PUBLIC_SITE_URL=https://YOUR-PROJECT.vercel.app
   NEXT_PUBLIC_DEMO_MODE=true
   NEXT_PUBLIC_API_BASE_URL=https://YOUR-API.onrender.com
   NEXT_PUBLIC_API_TIMEOUT_MS=30000
   BACKEND_INTERNAL_URL=https://YOUR-API.onrender.com
   ```

   Replace `YOUR-PROJECT.vercel.app` and `YOUR-API.onrender.com` with the actual values. `NEXT_PUBLIC_API_BASE_URL` is the public backend API origin used by browser requests. `BACKEND_INTERNAL_URL` configures the Next.js rewrite fallback; setting it prevents any same-origin `/api/v1/...` calls from incorrectly trying to reach `127.0.0.1` in production. Both API URLs should have no trailing slash.

6. Configure the private admin login values in Vercel's server-side Environment Variables. Do **not** prefix them with `NEXT_PUBLIC_`:

   ```dotenv
   ADMIN_USERNAME=YOUR_ADMIN_USERNAME
   ADMIN_PASSWORD=YOUR_UNIQUE_PASSWORD_AT_LEAST_12_CHARS
   ADMIN_SESSION_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARS
   ```

   Generate a random secret locally, for example with Python: `python -c "import secrets; print(secrets.token_hex(32))"`. Keep it in your password manager. Set the same values only in the environment where the admin page should work. Never add actual credentials to the project files.

7. Click **Deploy** and watch the build log. When ready, open the Vercel URL. If you change any `NEXT_PUBLIC_*` value, trigger a new deployment; these values are embedded at build time.
8. Return to Render and make sure `CORS_ORIGINS` exactly matches the deployed Vercel origin (and your custom domain, if using one), then redeploy the API if it changed.

## Part 5 — Configure public demo versus account-only mode

For a public site with both **Let's Get Started** (Supabase account flow) and **Try a Demo**:

- Frontend/Vercel: `NEXT_PUBLIC_DEMO_MODE=true`
- Backend/Render: `DEMO_MODE=true`, `ALLOW_PRODUCTION_DEMO=true`, `ENVIRONMENT=production`

For a deployment requiring every user to sign in:

- Frontend/Vercel: `NEXT_PUBLIC_DEMO_MODE=false`
- Backend/Render: `DEMO_MODE=false`, `ALLOW_PRODUCTION_DEMO=false`, `ENVIRONMENT=production`

After changing frontend flags, redeploy Vercel. After changing backend flags, redeploy Render. Demo mode is anonymous and should not be used to store sensitive or private information.

## Part 6 — Verify everything before sharing the link

1. Visit the Vercel site. Confirm the home page and CSS load correctly in both light and dark themes.
2. Select **Let's Get Started**, create a test account, complete email confirmation if enabled, and sign in.
3. Set a target role. Submit a test assessment, create a claim, save a project record, and save the resume to the workspace.
4. Refresh the browser and sign in again. Confirm the account data is restored in Claim Evidence, Projects, Resume Builder, Dashboard, and Analytics.
5. Create a second test account and confirm it cannot see the first account's records. This is a key isolation check before inviting real users.
6. Click **Try a Demo** if enabled. Confirm it opens its own demo session and does not show another user's account data.
7. Check `/admin/login` only after setting admin environment variables. Test invalid credentials and confirm access is denied. Do not rely on an obscured URL as the security control; credentials/session validation is the control.
8. Watch Vercel deployment/function logs and Render logs for API errors. Never paste secrets into logs, issue reports, or screenshots.

## Troubleshooting

- **UI loads but API requests fail:** verify `NEXT_PUBLIC_API_BASE_URL` and `BACKEND_INTERNAL_URL` contain the correct Render HTTPS origin, then redeploy Vercel. Check the Render health endpoint and server logs.
- **CORS error:** set Render `CORS_ORIGINS` to the exact Vercel and custom-domain origins, then redeploy Render.
- **Signup works but account records do not persist:** confirm that both frontend and backend point to the same Supabase project; run both SQL files; confirm `workspace_snapshots` policies; confirm the browser sends the user's bearer token to the backend.
- **Email confirmation/reset URL fails:** review Supabase Site URL and Redirect URLs and the email template's redirect destination.
- **AI answers are sometimes unavailable:** the current project uses browser-side Puter AI for some AI features. It depends on browser/network availability and the provider's limits; a backend deployment and Supabase database cannot guarantee an external AI provider never fails. Keep fallback messaging visible and do not rely on AI review to save the underlying claim/assessment record.
- **Changes do not appear:** check that the correct Git branch is deployed and trigger a fresh build after code or `NEXT_PUBLIC_*` changes.

## Official references

- Supabase Next.js quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase Auth redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API keys and safe secret handling: https://supabase.com/docs/guides/getting-started/api-keys
- Vercel Next.js deployment: https://vercel.com/docs/frameworks/full-stack/nextjs
- Render web services: https://render.com/docs/web-services
- Render environment variables: https://render.com/docs/configure-environment-variables
