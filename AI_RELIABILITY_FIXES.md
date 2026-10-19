# SKILLSETRA AI Reliability & UX Fixes

## Changes in this release

- **Role Baseline:** opens by generating an AI question set for the active target role; the built-in question-bank UI and rendering path have been removed. If generation fails, the page presents an explicit AI retry state instead of silently switching to built-in questions.
- **Reasoning Lab:** generates a new technical reasoning case with AI on page entry, tailored to the current target role. AI generation failures show a retry action rather than a hard-coded sample case.
- **Practice:** the page now uses fresh AI-generated practice tasks by default and automatically generates one after the target role and competency are loaded. The built-in challenge loading/submission path is removed from this page.
- **Challenges:** creates a fresh AI-generated challenge on entry and evaluates it with AI. It no longer loads the standard built-in challenge bank for the main flow.
- **AI Coach voice input:** waits for a 2.4-second pause before sending a spoken turn, buffers finalized transcript chunks, and keeps the latest interim hypothesis separate to avoid truncation or duplicate words. This improves turn-taking, but browser speech recognition and microphone quality remain browser/device dependent.
- **AI Coach controls:** removed the duplicate bottom-of-panel End conversation button; the header retains the single End conversation control and the fullscreen/exit fullscreen controls remain available.
- **Voice volume:** defaults browser speech playback to 100% when no saved volume preference exists.
- **AI model fallback:** transient model failures now advance to another supported Puter model, including unsupported-model errors. AI generation/analysis API calls also receive one bounded retry for network/timeouts and transient 429/502/503/504 responses, with a stable request ID.
- **CSS cleanup:** removed obsolete styles for the deleted duplicate End conversation control.
- **Regression tests:** updated and added coverage for AI-only question generation, voice buffering, single End conversation control, and transient AI retries.

## Verification

- Frontend regression tests: **80 passed** (`node --test tests/*.test.mjs`).
- Backend tests: **81 passed** (`PYTHONPATH=backend python -m pytest backend/tests -q`).
- A full Next.js typecheck/build could not be completed in this environment because frontend dependencies were not installed: `npm install` timed out and the supplied project has no `package-lock.json` for `npm ci`. TypeScript parsing showed no syntax diagnostics in the modified files; the global typecheck was otherwise blocked by missing Next.js/React/Node type packages and surfaced two existing `unknown`-type errors in `ProjectUpgrade.tsx`.

## Important runtime notes

AI generation requires network access to the Puter browser AI service. Model fallback can recover from model-level failures when that service is reachable; it cannot guarantee recovery if the browser cannot load the Puter script, the user's network is offline, microphone permission is denied, or the browser does not support speech recognition. In those cases the app retains retry or typed-chat paths where available.
