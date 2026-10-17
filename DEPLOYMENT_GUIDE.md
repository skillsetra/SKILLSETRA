# SKILLSETRA Deployment Guide

> **Vercel + Supabase split deployment:** For this repository, deploy `frontend/` as a Next.js project on Vercel and deploy `backend/` as a Python web service on Render. See [`VERCEL_SUPABASE_DEPLOYMENT_GUIDE.md`](VERCEL_SUPABASE_DEPLOYMENT_GUIDE.md) for exact environment variables, SQL order, Auth redirects, and verification steps.

## 1. Local demo on Windows

Requirements: Node.js 20+, npm, and Python 3.10+. From the extracted project root, double-click `START_TEST_NO_SIGN.bat` for the local no-sign-in demo or `START_FULLSTACK.bat` for full-stack mode. The launcher checks runtimes, creates a backend virtual environment, creates local environment files from the supplied examples, installs missing dependencies, starts FastAPI and Next.js, and waits for both services to become ready.

Open `http://localhost:3000` if the browser does not launch automatically. The launch terminal stays open while the services run. Use `STOP_TEST_NO_SIGN.bat` or `STOP_FULLSTACK.bat` as the matching manual fallback. Do not use the anonymous demo to handle sensitive information.

If installing manually, open two terminals from the project root:

```powershell
# Terminal 1 — backend
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
# Terminal 2 — frontend
cd frontend
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm install
npm run dev
```

Then visit `http://localhost:3000`. The demo AI integration uses browser-side Puter and requires browser connectivity; it does not require adding an AI API key to source files. Enable microphone permission for voice interview practice where supported; use typed-answer fallback if voice input does not work. Keep demo data fictitious.

## 2. Docker demo

From a Docker-enabled machine in the repository root:

```sh
docker compose up --build
```

The root `Dockerfile` is the single-service demo image; the public UI is on port 3000 and proxies `/api/v1` to the internal FastAPI process. The demo environment is explicitly set to `ENVIRONMENT=demo` and `DEMO_MODE=true`. The demo SQLite workspace is created locally at startup; container filesystem storage is ephemeral unless mounted/configured persistently, so stored history may be lost when the container is replaced.

## 3. Production profile — Supabase accounts plus isolated demo

`Dockerfile.production` and `docker-compose.production.yml` make a separate production profile. Create a private `.env.production` file outside version control and populate the actual Supabase URL, anon key, service-role key, valid allowed origins and other required settings only in the deployment's secret manager. Compose reads this file for runtime values and, when passed with `--env-file`, for build-time feature flags as well. Never include this file in a ZIP, Git repository, client bundle or frontend `NEXT_PUBLIC_*` variable (the Supabase anon key is public by design, but privileged service-role keys are not).

The production profile expects:

- `ENVIRONMENT=production`
- `DEMO_MODE=true` and `ALLOW_PRODUCTION_DEMO=true` enable isolated anonymous demo sessions alongside Supabase accounts by default.
- `NEXT_PUBLIC_DEMO_MODE=true` ensures the public “Try a Demo” button is included in the frontend build.
- To disable anonymous production demos, set all three flags to `false` and rebuild the image.
- Correct Supabase URL/keys and deployed database schema/RLS policies
- `CORS_ORIGINS` set to the exact trusted origin(s)
- HTTPS in front of the service; validate HSTS/CSP and trusted proxy behavior
- Durable persistence and backups appropriate for the deployment

The backend chooses an authenticated Supabase workspace when a valid bearer token is present; only requests that instead present a valid demo-session UUID use the no-sign-in demo store. The production Compose profile defaults `NEXT_PUBLIC_DEMO_MODE`, `DEMO_MODE`, and `ALLOW_PRODUCTION_DEMO` to `true` so no-sign-in demos and real Supabase accounts are available together. You can override all three to `false` in the private `.env.production` file when you need a strict account-only deployment. The frontend flag is a build-time setting, so rebuild the image after changing it. Demo workspaces remain session-scoped and use the configured demo store; validate session isolation, expiry, and Supabase RLS in staging before launch.

Build/run command after environment setup:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
```

## 4. Health and recovery checks

- Web UI: `http://localhost:3000`
- API root (internal in production, exposed only as your architecture allows): `/`
- API health route: `/api/v1/health`
- Development-only docs may appear at `/docs`; production hides FastAPI docs/OpenAPI according to the current source.
- If the UI returns a Next.js error, inspect the frontend terminal/container logs; if API-backed features fail, inspect FastAPI logs and request ID. Do not post credentials in logs or reports.
- If a demo workspace becomes stale locally, follow the intended demo reset procedure; do not delete/overwrite production database files during debugging.

## 5. Install and verify the release before public use

The audit runner could not reach npm, so a clean installation and build have not been verified here. On a connected machine:

```sh
cd frontend
npm install
npm run typecheck
npm run test:interview
npm run build
npm audit
```

Review the dependency changes, regenerate and commit a reviewed `package-lock.json`, then switch CI/production builds to `npm ci`. `npm install` is written here only as the immediate setup action because no lockfile exists in this release; **the release is not considered reproducibly locked until that lockfile is created and build-tested**. For backend clean-environment verification, create a separate venv, install `backend/requirements.txt`, then run `PYTHONPATH=backend pytest -q backend/tests`.

Before production launch, complete the actions in `KNOWN_LIMITATIONS.md`, especially real browser E2E, Supabase/RLS isolation, dependency scanning and persistent storage.
