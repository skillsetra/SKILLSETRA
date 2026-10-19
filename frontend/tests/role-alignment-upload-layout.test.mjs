import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('resume role starts empty and restores the active target rather than a hard-coded full-stack role', () => {
  const source = read('app/resume/page.tsx');
  assert.match(source, /role:\s*""/);
  assert.match(source, /user\?\.targetRole\s*\|\|\s*profile\?\.target_role/);
  assert.match(source, /String\(restored\.role\s*\|\|\s*""\)\.trim\(\)\s*===\s*"Full-Stack Developer"/);
});

test('learning resources and folder materials are filtered against the selected role mapping', () => {
  const source = read('app/learn/page.tsx');
  assert.match(source, /const roleMatches\s*=\s*\(roles:unknown,role:string\)/);
  assert.match(source, /!role\s*\|\|\s*roleMatches\(r\.roles,role\)/);
  assert.match(source, /folderMaterials\.filter\(r=>roleMatches\(r\.roles,role\)\)/);
  assert.match(source, /roleDecks\.filter\(d=>roleMatches\(d\.roles,role\)\)/);
  assert.match(source, /roleGuides\.filter\(g=>roleMatches\(g\.roles,role\)\)/);
});

test('project analysis offers file and folder upload and calls the bounded upload endpoint', () => {
  const source = read('components/stitch-source/components/Screens/ProjectUpgrade.tsx');
  assert.match(source, /Choose ZIP \/ files/);
  assert.match(source, /Choose project folder/);
  assert.match(source, /\/api\/v1\/projects\/analyze-upload/);
  assert.match(source, /MAX_UPLOAD_BYTES=8\*1024\*1024/);
});

test('assessment and evidence cards stay within their containers without default list markers', () => {
  const css = read('app/polish.css');
  assert.match(css, /\.product-shell \.assessment-questions\{[^}]*max-width:100%/);
  assert.match(css, /\.product-shell \.question-fieldset\{[^}]*max-width:100%/);
  assert.match(css, /\.evidence-flow-steps>li::marker\{content:(?:none|""|\x27\x27)!important/);
});

test('project review is analysis-only and cannot record evidence or alter learner progress', () => {
  const source = read('components/stitch-source/components/Screens/ProjectUpgrade.tsx');
  assert.match(source, /no goal, role-progress, or evidence updates/i);
  assert.doesNotMatch(source, /\/api\/v1\/projects\/upgrades/);
  assert.doesNotMatch(source, /Record evidence/);
  const routes = fs.readFileSync(path.resolve(root, '../backend/app/routes.py'), 'utf8');
  const start = routes.indexOf('@router.post("/projects/analyze",dependencies=[Depends(current_user)])');
  const end = routes.indexOf('@router.post("/projects/analyze-upload"', start);
  const analyzeRoute = routes.slice(start, end);
  assert.match(analyzeRoute, /read-only with respect to learner progress/i);
  assert.doesNotMatch(analyzeRoute, /state\["evidence"\]\.insert/);
  assert.doesNotMatch(analyzeRoute, /record_role_skill_signal|record_competency_signal|state\["projects"\]\.insert/);
});

test('project defense requests AI-generated questions and retains server fallback questions', () => {
  const source = read('components/stitch-source/components/Screens/SocraticDefense.tsx');
  assert.match(source, /Create 5 distinct technical project-defense questions/);
  assert.match(source, /runPuter\(.*model\)/s);
  assert.match(source, /Keep the server-provided questions/);
  assert.match(source, /runPuter\(response\.prompt, response\.model \|\| model\)/);
});
