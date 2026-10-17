import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Claim Evidence uses independent compact cards, not a stretched endless form container', () => {
  const page = read('app/evidence/page.tsx');
  const css = read('app/polish.css');
  assert.match(page, /className="page claim-evidence-page"/);
  assert.match(page, /className="panel claim-editor-panel"/);
  assert.match(page, /className="panel target-evidence-panel"/);
  assert.match(css, /\.claim-editor-panel,\s*\n?\.product-shell \.claim-evidence-page \.evidence-layout>\.target-evidence-panel\{align-self:start!important;height:auto!important;min-height:0!important/);
  assert.match(css, /\.target-evidence-panel \.target-list\{max-height:min\(50vh,440px\);overflow-y:auto/);
  assert.match(css, /\.claim-evidence-page>\.notice.*\.claim-evidence-page>\.evidence-layout/);
});

test('Claim Evidence copy is concise and redundant footer explainer is removed', () => {
  const page = read('app/evidence/page.tsx');
  assert.match(page, /Record a skill claim, link supporting work, and review saved evidence/);
  assert.match(page, /Claims remain unverified until supported by inspectable evidence/);
  assert.doesNotMatch(page, /How SKILLSETRA keeps claims credible|Observed ≠ inferred|Claimed ≠ verified|Target ≠ prediction/);
  assert.doesNotMatch(page, /State what you believe you can do\. You can link an already-observed artifact/);
  assert.match(page, /If enabled, the optional AI review runs after the four-question check/);
  assert.match(page, /Show my claims & records/);
  assert.match(page, /showPortfolio&&<section ref={claimRegisterRef} id="claim-register" className="panel claim-register-panel saved-portfolio-panel"/);
  assert.match(page, /portfolioProjects\.map/);
  assert.match(page, /resumeDraft\?\.form/);
  assert.match(page, /Recorded evidence/);
  assert.match(page, /saved-portfolio-disclaimer/);
});
