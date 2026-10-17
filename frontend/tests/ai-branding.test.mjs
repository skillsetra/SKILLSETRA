import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Settings and AI Coach use generic AI branding without displaying the underlying provider", () => {
  const settings = read("components/stitch-source/components/Screens/SettingsAI.tsx");
  const coach = read("components/PersistentAIWidget.tsx");
  assert.doesNotMatch(settings, /Puter AI|Puter connection|Puter provides|Puter AI \u00b7 Browser/i);
  assert.match(settings, /AI SETTINGS/);
  assert.match(settings, /AI \u00b7 Enabled/);
  assert.doesNotMatch(coach, /PUTER AI \u00b7 BROWSER|Puter AI|Puter\.js/i);
  assert.match(coach, /name: "AI"/);
  assert.match(coach, /AI \u00b7 ENABLED/);
});

test("The project UI does not render internal provider IDs as result headings", () => {
  const defense = read("components/stitch-source/components/Screens/SocraticDefense.tsx");
  assert.match(defense, /SKILLSETRA AI evaluation/);
  assert.doesNotMatch(defense, /Evaluation \u00b7 \{result\.provider/);
});

test("Legacy catalog provider-promotion resource is removed and existing catalog data filters it", () => {
  const data = readFileSync(new URL("../../backend/app/data.py", import.meta.url), "utf8");
  const routes = readFileSync(new URL("../../backend/app/routes.py", import.meta.url), "utf8");
  assert.doesNotMatch(data, /Puter\.js AI|r-ai-puter/);
  assert.match(routes, /hidden_ai_promo_titles/);
  assert.match(routes, /docs\.puter\.com/);
});
