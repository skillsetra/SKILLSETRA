# SKILLSETRA architecture

## Request and persistence path

Next.js App Router → typed frontend API client → FastAPI `/api/v1/*` → role/evidence/assessment services → workspace store.

- **Local anonymous demo:** a session identifier scopes the workspace; the backend stores serialized workspace snapshots in a runtime SQLite database under `backend/data/`.
- **Configured production mode:** Supabase Auth/user-scoped workspace snapshots and profile/settings are used. Validate RLS, ownership, CORS, durable storage, and secrets before production.
- The checked-in ZIP does not include a generated SQLite database. The backend creates its file and `workspace_snapshots` table at runtime.

## Learning signals and evidence

Completed assessments store canonical-answer scores, answer-level records, competency scores, activity events, and role-specific skill signals. Interviews store technical/focus and transcript-based Communication scores; legacy sessions can backfill missing role signals from explicit saved attempt details. Browser-generated practice/interview scores are marked unverified and down-weighted. Claims and artifact evidence are tracked separately from scores. Analytics shows both progress/coverage and missing-skill counts without claiming independent mastery.

## AI and voice

AI Coach is mounted at the application shell so it survives normal route navigation. All AI model requests run through a browser handoff to Puter AI; FastAPI owns persistence, role context, prompts, and scoring rules. The interview route supports text answers and voice mode with browser speech synthesis, speech recognition, transcript-based evaluation, and separate speaking/listening/thinking animations. Locale and audio support depend on browser and operating-system services.

## Deployment

Use `START_TEST_NO_SIGN.bat` for local Windows demo runs or `START_FULLSTACK.bat` for full-stack mode. The root Docker/Render setup is demo-oriented. For public production, configure real authentication, persistent storage, Supabase RLS/ownership tests, exact CORS, provider access, shared rate limits, monitoring, backups, and staging end-to-end tests.
