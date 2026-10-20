import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('GitHub repository analysis cannot create or offer evidence claims', () => {
  const source = read('app/github/page.tsx');
  assert.doesNotMatch(source, /\/api\/v1\/evidence\/claims/);
  assert.doesNotMatch(source, /POTENTIAL CLAIMS|Claims you can review|Add claim to Evidence|analysis\.claims/);
  assert.match(source, /Analysis does not create or claim learner evidence/);
  assert.match(source, /recommendation=analysis\?\.recommended_change/);
  assert.match(source, /ONE PRIORITIZED NEXT CHANGE/);
});

test('GitHub analysis recommends exactly one target path instead of a list of proof suggestions', () => {
  const source = read('app/github/page.tsx');
  assert.match(source, /type RecommendedChange =/);
  assert.match(source, /recommendation\.path/);
  assert.match(source, /recommendation\.change/);
  assert.doesNotMatch(source, /analysis\.suggestions/);
});
