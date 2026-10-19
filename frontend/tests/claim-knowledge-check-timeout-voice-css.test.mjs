import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('recording a claim starts a four-question server-scored knowledge check', () => {
  const page=read('app/evidence/page.tsx');
  assert.match(page,/startKnowledgeCheck\(savedClaim,shouldAIReview\)/);
  assert.match(page,/\/knowledge-check\/submit/);
  assert.match(page,/Answer all four competency-related questions/);
  assert.match(page,/Pass at 3\/4|pass at 3\/4/);
  assert.match(page,/claim-quiz-result-details/);
  assert.match(page,/buildLocalProgressReport/);
});

test('optional AI review is deferred until after the quiz and fallback progress analysis is preserved on failure', () => {
  const page=read('app/evidence/page.tsx');
  assert.match(page,/ai_consent:false/);
  assert.match(page,/requestClaimAIReview\(claimQuiz.claim_id\)/);
  assert.match(page,/A local report based on your saved records is shown below/);
  const backend=read('../backend/app/routes.py');
  assert.match(backend,/deferred-until-knowledge-check/);
  assert.match(backend,/correct_count\/4/);
  assert.match(backend,/score>=75/);
});

test('AI requests fall back to another supported model on transient errors without repeating the same timed-out call', () => {
  const ai=read('lib/ai.ts');
  assert.match(ai,/openai\/gpt-5\.4-nano/);
  assert.match(ai,/runWithTimeout\(model, i === 0 \? 11500 : 10000\)/);
  assert.match(ai,/const retryable = \/network/);
  assert.match(ai,/unsupported model|model\.\{0,30\}/);
});

test('fullscreen AI Coach keeps End Conversation in the active voice panel, not the header', () => {
  const coach=read('components/PersistentAIWidget.tsx');
  const css=read('app/polish.css');
  assert.match(coach,/ai-voice-bottom-actions/);
  assert.match(coach,/Exit fullscreen/);
  assert.match(coach,/aria-label="Close AI Coach"/);
  assert.match(coach,/className="ai-voice-end-button"[\s\S]{0,220}aria-label="End conversation"/);
  assert.match(coach,/voiceSessionRef\.current \|\| \["listening", "thinking", "speaking", "typing"\]\.includes\(voiceState\)/);
  const header=coach.slice(coach.indexOf('<div className="ai-head-actions">'),coach.indexOf('</div>',coach.indexOf('<div className="ai-head-actions">')));
  assert.doesNotMatch(header,/End conversation/i);
  assert.match(css,/\.ai-voice-end-button/);
  assert.match(css,/\.request-activity-overlay[^}]*pointer-events:none/);
  assert.match(css,/\.ai-voice-bottom-actions/);
});

test('assessment cards and AI visual reports have theme-aware containment rules', () => {
  const css=read('app/polish.css');
  assert.match(css,/\.product-shell #assessment-panel \.question-fieldset/);
  assert.match(css,/html\[data-theme="dark"\] \.product-shell \.ai-insight/);
  assert.match(css,/html\[data-theme="light"\] \.ai-window/);
  assert.match(css,/html\[data-theme="light"\] \.interview-page \.interviewer-signal-wrap/);
});


test('request progress labels distinguish claim saving from quiz scoring', () => {
  const api=read('lib/api.ts');
  assert.match(api,/Scoring your four claim questions/);
  assert.match(api,/Preparing your four claim questions/);
  const css=read('app/polish.css');
  assert.match(css,/\.request-activity-overlay\{z-index:2147483000;pointer-events:none\}/);
});
