import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Assessment Studio autoscrolls using a stable current-question ref and index dependency', () => {
  const source = read('app/assessments/page.tsx');
  assert.match(source, /const currentQuestionRef=useRef<HTMLFieldSetElement\|null>\(null\)/);
  assert.match(source, /questions\.map\(\(question,questionPosition\)=>/);
  assert.match(source, /choose\(question,index,questionPosition\)/);
  assert.match(source, /ref=\{questionPosition===questionIndex\?currentQuestionRef:null\} className="claim question-fieldset"/);
  assert.match(source, /scrollToElement\(currentQuestionRef\.current\|\|document\.getElementById/);
  assert.match(source, /\[active\?\.id,questionIndex,currentQuestion\?\.id,result\]/);
});

test('Role Baseline scrolls when questions load, role changes, or the active question changes', () => {
  const source = read('components/stitch-source/components/Screens/DiagnosticAssessment.tsx');
  assert.match(source, /if\(loading\|\|!questions\.length\)return/);
  assert.match(source, /questions\.map\(\(question,questionPosition\)=>/);
  assert.match(source, /chooseAnswer\(question\.id,idx,questionPosition\)/);
  assert.match(source, /scrollToElement\(currentQuestionRef\.current\|\|document\.getElementById\('assessment-current-question'\)/);
  assert.match(source, /\[loading,d\?\.id,i,mode,questions\.length,role\]/);
});

test('shared scroll helper detects nested scroll containers and retries after React layout commits', () => {
  const source = read('lib/scroll.ts');
  assert.match(source, /nearestScrollableAncestor/);
  assert.match(source, /parent\.scrollHeight > parent\.clientHeight \+ 2/);
  assert.match(source, /requestAnimationFrame\(\(\) => window\.requestAnimationFrame/);
  assert.match(source, /scroller\.scrollTo\(\{ top: Math\.max\(0, top\), behavior \}\)/);
});

test('assessment cards explicitly contain long generated text and option labels on small screens', () => {
  const css = read('app/polish.css');
  assert.match(css, /\.product-shell \.assessment-questions>\.question-fieldset/);
  assert.match(css, /diagnostic-question-list/);
  assert.match(css, /diagnostic-question-card/);
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, /assessment-questions \.choice-row input\[type=radio\]/);
  assert.match(css, /@media\(max-width:640px\)/);
});

test('Dashboard has evidence graph for artifact counts distinct from claims', () => {
  const source = read('components/stitch-source/components/Screens/Dashboard.tsx');
  assert.match(source, /EVIDENCE WORKSPACE GRAPH/);
  assert.match(source, /Evidence analytics ·/);
  assert.match(source, /Evidence artifacts vs\. claims by competency/);
  assert.match(source, /dataKey="artifacts" name="Recorded artifacts"/);
  assert.match(source, /dataKey="claims" name="Claims \(unverified\)"/);
  assert.match(source, /href="\/evidence"/);
});


test('Reasoning Lab centers the case and answer area, then scrolls directly to visual analysis', () => {
  const source = read('app/reasoning/page.tsx');
  const css = read('app/polish.css');
  assert.match(source, /className="panel reasoning-question-panel"/);
  assert.match(source, /Write your answer here/);
  assert.match(source, /analysisRef\.current\?\.scrollIntoView/);
  assert.match(source, /<AIInsight text=\{analysis\} visualFlow \/>/);
  assert.match(css, /\.product-shell \.reasoning-question-text[\s\S]*?text-align:\s*center/);
});

test('Practice hides cluttered constraint cards and scrolls to the submitted result', () => {
  const source = read('app/practice/page.tsx');
  const css = read('app/polish.css');
  assert.match(source, /className="panel practice-question-panel"/);
  assert.match(source, /placeholder="Write your answer here…"/);
  assert.doesNotMatch(source, /challenge\.constraints\?\.map/);
  assert.doesNotMatch(source, /task\.constraints\.map/);
  assert.match(source, /resultRef\.current\?\.scrollIntoView/);
  assert.match(source, /<AIInsight text=\{compiledInsightText\(compiledEvaluation\)\} compact visualFlow \/>/);
  assert.match(css, /\.product-shell \.practice-task-flow\s*\{ display: grid; gap: 16px/);
});

test('Sidebar guide rail is removed and AI key phrases use blue highlight blocks instead of underlines', () => {
  const css = read('app/polish.css');
  const ai = read('components/AIInsight.tsx');
  assert.match(css, /\.nav-sub-inner\s*\{[^}]*border-left:0/);
  assert.match(css, /\.ai-insight-emphasis\s*\{[^}]*background:#e8f1ff[^}]*text-decoration:none/);
  assert.doesNotMatch(css, /text-decoration-line:\s*underline/);
  assert.match(ai, /aria-label="Visual analysis map"/);
  assert.match(ai, /ai-insight-flow-step/);
});
