import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('role baseline automatically generates AI questions for the active target role and has no built-in bank fallback', () => {
  const source = read('components/stitch-source/components/Screens/DiagnosticAssessment.tsx');
  assert.doesNotMatch(source, /setProvider\s*\(/);
  assert.match(source, /const \{user\}=useApp\(\)/);
  assert.match(source, /void generateAISet\(\)/);
  assert.match(source, /assessment\/generate/);
  assert.match(source, /setD\(undefined\);setI\(0\);setAnswers\(\{\}\);setResult\(null\)/);
  assert.match(source, /AI-GENERATED QUESTIONS/);
  assert.doesNotMatch(source, /Normal question bank/);
});

test('interviewer reads target role from the AppProvider context instead of an undeclared user', () => {
  const source = read('app/interview/page.tsx');
  assert.match(source, /import \{ useApp \} from "\.\.\/\.\.\/components\/AppProvider"/);
  assert.match(source, /const \{ user \} = useApp\(\)/);
  assert.match(source, /user\?\.targetRole/);
});

test('choosing a target role advances into the matching assessment even if profile persistence fails', () => {
  const source = read('app/onboarding/page.tsx');
  const start = source.indexOf('async function chooseRole');
  const end = source.indexOf('\n }', start) + 3;
  const choose = source.slice(start, end);
  assert.match(choose, /setRole\(next\);setTargetRole\(next\)/);
  assert.match(choose, /setStep\(2\)/);
  assert.match(choose, /assessment is starting/);
  assert.match(source, /step===2&&role&&loadedRole!==role&&attemptedRole!==role&&!loading/);
});

test('MCQ options show a green selection, then advance with Previous navigation available', () => {
  const diagnostic = read('components/stitch-source/components/Screens/DiagnosticAssessment.tsx');
  assert.match(diagnostic, /aria-pressed=\{answers\[question\.id\]===String\(idx\)\}/);
  assert.match(diagnostic, /Option \{String\.fromCharCode\(65\+Number\(answers\[question\.id\]\)\)\} selected/);
  assert.match(diagnostic, /questions\.map\(\(question,questionPosition\)=>/);
  assert.match(diagnostic, /onClick=\{\(\)=>chooseAnswer\(question\.id,idx,questionPosition\)\}/);
  assert.match(diagnostic, /diagnostic-question-card/);
  assert.match(diagnostic, /advanceTimerRef\.current=window\.setTimeout/);
  assert.match(diagnostic, /Previous question/);
  assert.match(diagnostic, /Question \{questionPosition\+1\} of \{questions\.length\}/);
  const css = read('app/polish.css');
  assert.match(css, /\.product-shell \.option\.selected[^}]*background:#eaf7ee!important;color:#173c27!important;border:1px solid #16834a!important/);
  assert.match(css, /\.product-shell \.choice-row\.checked[^}]*border:1px solid #16834a!important/);
});

test('Claim Evidence stays mounted during refresh and scrolls users to saved claims', () => {
  const source = read('app/evidence/page.tsx');
  assert.match(source, /if\(loading&&!data\)return/);
  assert.match(source, /claimRegisterRef/);
  assert.match(source, /claimQuizRef\.current\?\.scrollIntoView/);
  assert.match(source, /Show my claims & records/);
  assert.match(source, /showPortfolio&&<section ref={claimRegisterRef} id="claim-register" className="panel claim-register-panel saved-portfolio-panel"/);
  assert.match(source, /api<any>\("\/api\/v1\/projects"\)/);
  assert.match(source, /api<any>\("\/api\/v1\/resume\/draft"\)/);
  assert.match(source, /Claims remain unverified until supported by inspectable evidence/);
  assert.match(source, /data\?\.claims/);
  const css = read('app/polish.css');
  assert.match(css, /\.evidence-layout \.big-textarea\{min-height:76px!important;height:84px!important/);
});

test('project and GitHub results have explicit completion state and auto-scroll even if optional AI prose fails', () => {
  const project = read('components/stitch-source/components/Screens/ProjectUpgrade.tsx');
  assert.match(project, /scrollToElement\(resultRef\.current/);
  assert.match(project, /Project analysis complete/);
  assert.match(project, /AI explanation unavailable/);
  const github = read('app/github/page.tsx');
  assert.match(github, /scrollToElement\(resultRef\.current/);
  assert.match(github, /Repository analysis complete/);
  assert.match(github, /optional AI explanation failed/);
  assert.match(github, /target_role:user\?\.targetRole\|\|""/);
});

test('API failures get bounded retries for safe GETs and transient AI generation or analysis requests', () => {
  const source = read('lib/api.ts');
  assert.match(source, /DEFAULT_TIMEOUT_MS = Number\(process\.env\.NEXT_PUBLIC_API_TIMEOUT_MS \|\| 30000\)/);
  assert.match(source, /const SAFE_GET_RETRIES = 2/);
  assert.match(source, /const safeToRetry = method === "GET" && !options\.body/);
  assert.match(source, /\[429, 502, 503, 504\]/);
  assert.match(source, /retryAfterMs/);
  assert.match(source, /const retryableAI = method === \"POST\"/);
  assert.match(source, /const AI_ANALYSIS_RETRIES = 1/);
});


test('AI requests announce busy state so analysis has visible progress feedback', () => {
  const ai = read('lib/ai.ts');
  assert.match(ai, /skillsetra:request-start/);
  assert.match(ai, /skillsetra:request-finish/);
  assert.match(ai, /Generating AI analysis/);
});

test('Reasoning, Practice and Challenges prepare fresh AI-generated prompts automatically', () => {
  const reasoning = read('app/reasoning/page.tsx');
  const practice = read('app/practice/page.tsx');
  const challenges = read('components/stitch-source/components/Screens/ChallengeSandbox.tsx');
  assert.match(reasoning, /runPuter\(`Create one fresh, realistic technical reasoning case/);
  assert.match(practice, /if \(compilerMode && roleReady && skill\.trim\(\) && !task/);
  assert.match(practice, /setCompilerMode\(true\)/);
  assert.match(practice, /New AI practice/);
  assert.match(challenges, /runPuter\(`Generate one original, practical technical challenge/);
  assert.match(challenges, /aiGenerated: true/);
});
