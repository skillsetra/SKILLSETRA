import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/polish.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const provider = readFileSync(new URL("../components/AppProvider.tsx", import.meta.url), "utf8");

test("light theme uses white surfaces and accessible green primary styling", () => {
  assert.match(css, /html\[data-theme="light"\][\s\S]*?--p-primary:\s*#16834a/i);
  assert.match(css, /html\[data-theme="light"\] \.product-sidebar[\s\S]*?background:\s*#ffffff/i);
  assert.match(css, /html\[data-theme="light"\] \.product-sidebar \.nav-item\.active[\s\S]*?background:\s*#16834a/i);
});

test("new release defaults to light theme while preserving deliberate future theme changes", () => {
  assert.match(layout, /skillsetra_theme_user_set_v2/);
  assert.match(provider, /skillsetra_theme_user_set_v2/);
  assert.match(provider, /setThemeState\("light"\)/);
});


test("settings theme controls choose their matching appearance", () => {
  const settings = readFileSync(new URL("../components/stitch-source/components/Screens/SettingsAI.tsx", import.meta.url), "utf8");
  assert.ok(settings.includes('appearance:"dark"}))}>Dark theme'));
  assert.ok(settings.includes('appearance:"light"}))}>Light theme'));
});


test("role choice uses an unmistakable green selected state without red key-point underlines", () => {
  const css = readFileSync(new URL("../app/polish.css", import.meta.url), "utf8");
  assert.match(css, /\.product-shell \.role-choice\.selected[^}]*background:#075c38!important/);
  assert.match(css, /background:#e8f1ff!important;text-decoration:none!important/);
  assert.match(css, /background:rgba\(59,130,246,\.24\)!important;text-decoration:none!important/);
  assert.doesNotMatch(css, /text-decoration-line:\s*underline/);
});
