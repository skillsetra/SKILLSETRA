import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '../app');
const polish = fs.readFileSync(path.join(appDir, 'polish.css'), 'utf8');
const globals = fs.readFileSync(path.join(appDir, 'globals.css'), 'utf8');

test('dark-mode Practice rubric cards use dark surfaces and readable copy', () => {
  assert.match(polish, /html\[data-theme="dark"\] \.product-shell \.practice-criteria-item\.good\s*\{[^}]*background:\s*#10281e/i);
  assert.match(polish, /html\[data-theme="dark"\] \.product-shell \.practice-criteria-item\.warn\s*\{[^}]*background:\s*#142238/i);
  assert.match(polish, /html\[data-theme="dark"\] \.product-shell \.practice-criteria-item p\s*\{[^}]*color:\s*#b7c5d8/i);
});

test('Notification popover title and empty state do not inherit light-only colors in dark mode', () => {
  assert.match(globals, /html\[data-theme="light"\] \.notification-item,html\[data-theme="light"\] \.popover-title/);
  assert.match(globals, /html\[data-theme="light"\] \.notification-item span,html\[data-theme="light"\] \.search-empty/);
  assert.match(polish, /html\[data-theme="dark"\] \.notification-popover \.popover-title\s*\{[^}]*color:\s*#e8eef5/i);
  assert.match(polish, /html\[data-theme="dark"\] \.notification-popover \.search-empty\s*\{[^}]*color:\s*#aebdd0/i);
});
