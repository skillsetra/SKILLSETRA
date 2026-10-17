# SKILLSETRA — Know It. Apply It. Prove It.

SKILLSETRA is an evidence-centered competency-intelligence platform. Choose a target role, practise role-relevant assessments and interviews, upload project artifacts for analysis, and use recorded evidence to identify learning gaps. AI suggestions are advisory and do not independently verify mastery or predict hiring outcomes.

## Project structure

- `frontend/` — Next.js + React application.
- `backend/` — FastAPI API, role progress, workspace data, and automated tests.
- `database/` and `SKILLSETRA_SUPABASE_DEMO_SETUP.sql` — database schemas and setup support.
- `learning-materials/` and `field-guides/` — role-mapped study resources and downloadable guides.
- `scripts/` — Windows startup, readiness checks, and stop/cleanup helpers.
- `DEPLOYMENT_GUIDE.md` — local setup and deployment instructions.
- `docs/` — architecture, database, API, accessibility and AI implementation notes.

## Run on Windows

Requirements: Node.js 20+, Python 3.10+, and internet access for the first dependency install.

1. Extract the ZIP to a normal writable folder (not inside a ZIP preview).
2. Double-click `START_TEST_NO_SIGN.bat` for local demo mode, or `START_FULLSTACK.bat` for full-stack mode.
3. Wait for the API and frontend readiness checks, then visit `http://localhost:3000` if the browser does not open automatically.
4. Use the matching `STOP_TEST_NO_SIGN.bat` or `STOP_FULLSTACK.bat` if you need to stop the services manually.

The first launch creates the backend virtual environment and installs frontend/backend dependencies. npm deprecation warnings are not necessarily fatal; startup is decided using the command exit code and service readiness checks. Never commit `.env`, `.env.local`, real credentials, or local workspace databases.

## AI and voice features

AI-supported features use the configured Puter integration. Provider/model configuration is kept out of ordinary learner-facing controls; the relevant configuration can be reviewed in Settings and AI Coach. Availability depends on browser connectivity, provider/model availability, microphone permission, and browser speech API support. Chrome or Edge on localhost/HTTPS is recommended for voice recognition.

The AI Interviewer offers Live Interview. Its current question is also displayed as text while it is spoken, with repeat-question and typed-answer fallbacks. The abstract speaking/listening animation is a UI cue, not a real-time generated video.

## Project upload safety

Project ZIPs and files are read as bounded text excerpts for analysis. Uploaded code is never executed. Archives, files, and descriptions are treated as untrusted input. Uploads are size-limited, and common dependency/build/cache folders are skipped.

## Run the checks

Frontend regression tests: `cd frontend` then `node --test tests/*.test.mjs`. Backend tests: `cd backend` then `PYTHONPATH=. pytest -q`. The local BAT launchers should be tested on Windows because PowerShell and browser behavior are platform-specific.


## Supabase setup

For complete database, Auth redirect, environment-variable, RLS, and verification instructions, see [`database/SUPABASE_SETUP_GUIDE.md`](database/SUPABASE_SETUP_GUIDE.md).
