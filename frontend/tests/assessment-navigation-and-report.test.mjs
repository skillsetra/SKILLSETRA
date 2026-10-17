import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Assessment Studio shows stacked questions and automatically advances with previous/next navigation', () => {
  const source = read('app/assessments/page.tsx');
  assert.match(source, /const \[questionIndex,setQuestionIndex\]=useState\(0\)/);
  assert.match(source, /const currentQuestion=questions\[questionIndex\]/);
  assert.match(source, /← Previous question/);
  assert.match(source, /Next question →/);
  assert.match(source, /setQuestionIndex\(questionPosition\+1\)/);
  assert.match(source, /setQuestionIndex\(Math\.max\(0,Math\.min\(next,questions\.length-1\)\)\)/);
  assert.match(source, /questionIndex,updatedAt:new Date\(\)\.toISOString\(\)/);
  assert.match(source, /scrollToElement\(resultRef\.current/);
});

test('ending an interview manually still speaks the generated report summary', () => {
  const source = read('app/interview/page.tsx');
  assert.match(source, /reason === "user-ended"/);
  assert.match(source, /You ended the interview/);
  assert.match(source, /if \(reason !== "question-generation-failed"\)/);
  assert.match(source, /speakChunks\(spoken, activeLanguage\.code\)/);
});

test('sidebar scroll position is saved and restored between app route changes', () => {
  const source = read('components/AppShell.tsx');
  assert.match(source, /setScrollElement=useCallback/);
  assert.match(source, /skillsetra_sidebar_scroll:/);
  assert.match(source, /sessionStorage\.getItem\(key\)/);
  assert.match(source, /setScrollElement\}\s+className="sidebar-scroll"/);
  assert.match(source, /sessionStorage\.setItem\(key,String\(event\.currentTarget\.scrollTop\)\)/);
  assert.match(source, /nav\(false,"mobile"\)/);
});

test('Claim Evidence no longer renders the two large instruction boxes and uses a compact text field', () => {
  const source = read('app/evidence/page.tsx');
  assert.doesNotMatch(source, /className="panel evidence-flow-guide"/);
  assert.doesNotMatch(source, /className="evidence-form-intro"/);
  assert.match(source, /rows=\{3\} className="big-textarea compact-evidence-textarea"/);
  assert.match(source, /claimQuizRef\.current\?\.scrollIntoView/);
  const css = read('app/polish.css');
  assert.match(css, /evidence-layout \.big-textarea\{min-height:76px!important;height:84px!important/);
});

test('generated single AI questions are brought into view', () => {
  const source = read('components/stitch-source/components/Screens/DiagnosticAssessment.tsx');
  assert.match(source, /useEffect\(\(\)=>\{if\(aiQ\)scrollToElement\(aiQuestionRef\.current/);
  assert.match(source, /ref=\{aiQuestionRef\}/);
});
