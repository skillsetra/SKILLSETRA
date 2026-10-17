import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');

test('role picker return path clears active loading and question-attempt state', () => {
  const source = read('app/onboarding/page.tsx');
  assert.match(source, /function returnToRolePicker\(\)[\s\S]*?resetAssessment\(\)[\s\S]*?setStep\(1\)/);
  assert.match(source, /attemptedRole!==role/);
  assert.match(source, /setAttemptedRole\(roleName\)/);
  assert.match(source, /onClick=\{returnToRolePicker\}/);
});

test('challenge UI uses a vertical prompt-answer flow without exposing rubric constraint cards', () => {
  const source = read('components/stitch-source/components/Screens/ChallengeSandbox.tsx');
  assert.match(source, /challenge-question-panel/);
  assert.match(source, /Write your answer here/);
  assert.match(source, /resultRef\.current\?\.scrollIntoView/);
  assert.doesNotMatch(source, /challenge.constraints.map/);
});

test('project defense has load retry and direct-to-result behavior instead of a stuck Loading question', () => {
  const source = read('components/stitch-source/components/Screens/SocraticDefense.tsx');
  assert.match(source, /Preparing your defense question/);
  assert.match(source, /Retry questions/);
  assert.match(source, /resultRef\.current\?\.scrollIntoView/);
  assert.doesNotMatch(source, /questions\[index\]\s*\|\|\s*[\"']Loading/);
});

test('Next development indicator is disabled and selected baseline MCQs have theme-specific styling', () => {
  assert.match(read('next.config.ts'), /devIndicators\s*:\s*false/);
  const css = read('app/polish.css');
  assert.match(css, /diagnostic-question-card \.option\[aria-pressed=\"true\"\]/);
  assert.match(css, /html\[data-theme=\"dark\"\][^{}]*diagnostic-question-card/);
});
