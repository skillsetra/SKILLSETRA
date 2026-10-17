import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../components/AppShell.tsx", import.meta.url), "utf8");

test("sidebar renders each section and every page link without a dropdown control", () => {
  assert.match(source, /SECTIONS\.map\(section/);
  assert.match(source, /section\.children\.map\(item/);
  assert.match(source, /className="nav-section-head"/);
  assert.match(source, /className="nav-sub always-open"/);
  assert.doesNotMatch(source, /aria-expanded=\{open\}/);
  assert.doesNotMatch(source, /inert=\{!open\}/);
  assert.doesNotMatch(source, /<ChevronDown/);
  assert.match(source, /sidebar-collapse-toggle/);
  assert.match(source, /PanelLeftClose/);
  assert.match(source, /PanelLeftOpen/);
  assert.match(source, /localStorage\.getItem\('skillsetra_sidebar_collapsed'\)/);
  assert.match(source, /sidebar-brand-mark/);
  assert.doesNotMatch(source, /aria-expanded=\{open\}/);
});


test("desktop sidebar has an accessible collapse control and an S-only collapsed brand", () => {
  const css = readFileSync(new URL("../app/polish.css", import.meta.url), "utf8");
  assert.match(source, /aria-label=\{collapsed\?"Expand sidebar":"Collapse sidebar"\}/);
  assert.match(source, /className=\{`product-shell \$\{demo\?'is-demo':''\} \$\{collapsed\?'sidebar-collapsed':''\}`\}/);
  assert.match(css, /\.sidebar-collapsed \.product-sidebar \.sidebar-brand-name\{display:none!important\}/);
  assert.match(css, /\.sidebar-collapsed \.product-sidebar \.sidebar-brand-mark\{[^}]*display:flex!important/);
});
