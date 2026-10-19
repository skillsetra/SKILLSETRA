import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const onboarding = readFileSync(new URL('../app/onboarding/page.tsx', import.meta.url), 'utf8');
const ai = readFileSync(new URL('../lib/ai.ts', import.meta.url), 'utf8');

test('selecting a role starts AI question generation before any built-in fallback', () => {
  assert.match(onboarding, /api<any>\("\/api\/v1\/assessment\/generate"/);
  assert.match(onboarding, /runPuter\(r\.prompt,r\.model\|\|model\)/);
  assert.ok(onboarding.indexOf('"/api/v1/assessment/generate"') < onboarding.indexOf('`/api/v1/assessment?role=${encodeURIComponent(roleName)}`'));
  assert.match(onboarding, /AI question generation was unavailable, so SKILLSETRA loaded the built-in/);
});

test('AI response parsing tolerates common JSON wrappers and answer labels', () => {
  assert.match(onboarding, /x\.choices\|\|x\.answers/);
  assert.match(onboarding, /correct_index\?\?x\.answer_index\?\?x\.correctAnswer/);
  assert.match(onboarding, /out\.length>=3/);
});

test('Puter question generation has multiple bounded model attempts', () => {
  assert.match(ai, /"openai\/gpt-4o-mini"/);
  assert.match(ai, /"openai\/gpt-5\.4-nano"/);
  assert.match(ai, /"openai\/gpt-oss-20b"/);
  assert.match(ai, /runWithTimeout\(model/);
});
