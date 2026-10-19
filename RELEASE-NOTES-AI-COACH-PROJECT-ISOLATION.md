# SKILLSETRA release notes — AI Coach and project-analysis isolation

## Changes

- Removed the redundant **End conversation** action from the AI Coach header. The same header layout is shared by normal and fullscreen modes; fullscreen toggle, settings, export/clear (text mode), and close controls remain.
- Project analysis is now read-only with respect to learner progress. An uploaded ZIP, folder, source files, or description is analyzed as project material only; analysis does not persist a project record, create evidence, or update role/goal/competency progression.
- Removed the project page's **Record evidence** action so project suggestions cannot accidentally be recorded as proof.
- Project Defense requests an AI-generated set of technical defense questions through Puter, with server-provided questions retained as a fallback. Submitted answers continue to receive AI evaluation through the Puter model fallback path.
- Expanded transient API/server error detection for model fallback and retry.

## Verification

- Frontend source regression tests: 82 passed.
- Backend API tests: 81 passed (`PYTHONPATH=. pytest -q` from `backend/`).
- Production frontend build/typecheck was not verified because this environment does not have the frontend dependencies installed; run `npm install` and `npm run build` before deploying.

## Important boundary

AI fallback depends on Puter being reachable and on the selected/fallback models being available to the current browser session. No application can guarantee a response during a complete network/provider outage. Project analysis does not execute uploaded code.
