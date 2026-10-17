import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('choosing a target role scrolls into the assessment and loaded question bank', () => {
  const source = read('app/onboarding/page.tsx');
  assert.match(source, /const assessmentSectionRef=useRef<HTMLElement\|null>\(null\)/);
  assert.match(source, /const firstQuestionRef=useRef<HTMLElement\|null>\(null\)/);
  assert.match(source, /if\(step===2\)scrollToElement\(assessmentSectionRef\.current/);
  assert.match(source, /step!==2\|\|loading\|\|!questions\.length\|\|loadedRole!==role/);
  assert.match(source, /scrollToElement\(firstQuestionRef\.current\|\|assessmentSectionRef\.current/);
});

test('onboarding MCQ selection shows confirmation and scrolls to the next question or submit button', () => {
  const source = read('app/onboarding/page.tsx');
  assert.match(source, /function pick\(q:Q,index:number,questionPosition:number\)/);
  assert.match(source, /scrollToElement\(document\.getElementById\(`onb-q-\$\{next\.id\}`\)/);
  assert.match(source, /scrollToElement\(document\.getElementById\("onb-submit-assessment"\)/);
  assert.match(source, /Option \{String\.fromCharCode\(65\+Number\(answers\[q\.id\]\)\)\} selected/);
});

test('Claim Evidence progress controls are compact, and old oversized progress panels are removed', () => {
  const source = read('app/evidence/page.tsx');
  assert.doesNotMatch(source, /className="panel evidence-progress-panel"/);
  assert.doesNotMatch(source, /className="panel progress-ai-panel"/);
  assert.match(source, /className="evidence-inline-tools"/);
  assert.match(source, /className="evidence-inline-actions"/);
  assert.match(source, /className="progress-ai-result evidence-progress-explanation"/);
  const css = read('app/globals.css');
  assert.match(css, /\.product-shell \.evidence-layout>\.panel\{height:auto!important;min-width:0;background:transparent!important;border:0!important/);
  assert.match(css, /\.evidence-inline-tools\{display:flex/);
});

test('interviewer uses an audio studio visualization rather than the spinning orb', () => {
  const source = read('app/interview/page.tsx');
  assert.match(source, /interviewer-signal-wrap state-\$\{faceState\}/);
  assert.match(source, /interviewer-signal-bars/);
  assert.doesNotMatch(source, /interviewer-orb-wrap/);
  const css = read('app/globals.css');
  assert.match(css, /@keyframes interviewer-signal-bars/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.interviewer-signal-wrap/);
});

test('workspace evidence analytics falls back to competencies and carries date, source and confidence', () => {
  const source = read('components/stitch-source/components/Screens/Dashboard.tsx');
  assert.match(source, /evidenceCompetencyNames=Array\.from\(new Set/);
  assert.match(source, /\.\.\.\(d\.competencies\|\|\[\]\)\.map/);
  assert.match(source, /Evidence artifacts vs\. claims by competency/);
  assert.match(source, /Assessment signal by competency/);
  assert.match(source, /e\.evidence_type\|\|e\.source\|\|'Workspace event'\} · \{e\.confidence/);
});
