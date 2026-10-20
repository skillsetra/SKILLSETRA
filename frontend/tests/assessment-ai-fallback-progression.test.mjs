import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Assessment Studio attempts AI first, uses Puter model fallbacks, and falls back to a fresh built-in set', () => {
  const page = read('app/assessments/page.tsx');
  const aiStart = page.indexOf('/api/v1/assessment/generate');
  const puter = page.indexOf('runPuter(generated.prompt');
  const fallback = page.indexOf('&fresh=1');
  assert.ok(aiStart >= 0 && puter > aiStart && fallback > puter);
  assert.match(page, /browser-ai-practice/);
  assert.match(page, /record-result/);
  assert.match(page, /role_progress:saved\.role_progress/);
  const ai = read('lib/ai.ts');
  assert.match(ai, /openai\/gpt-5\.4-nano/);
  assert.match(ai, /openai\/gpt-oss-20b/);
  assert.match(ai, /openai\/gpt-4o-mini/);
});

test('fresh backend fallback creates randomized server-keyed assessments without returning answer keys', () => {
  const routes = readFileSync(new URL('../../backend/app/routes.py', import.meta.url), 'utf8');
  assert.match(routes, /fresh:bool=Query\(default=False\)/);
  assert.match(routes, /random\.SystemRandom\(\)/);
  assert.match(routes, /"source":"Built-in fallback question bank"/);
  assert.match(routes, /_strip_answer_key\(fresh_questions\)/);
  assert.match(routes, /source=stored\.get\("source"\)/);
});
