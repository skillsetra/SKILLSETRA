import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../components/LocalSessionHeartbeat.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/local-session/heartbeat/route.ts", import.meta.url), "utf8");
const launcher = readFileSync(new URL("../../scripts/Start-Skillsetra.ps1", import.meta.url), "utf8");

test("browser heartbeat is local-development-only and uses per-tab session IDs", () => {
  assert.match(component, /process\.env\.NODE_ENV !== "development"/);
  assert.match(component, /crypto\.randomUUID/);
  assert.match(component, /action: "heartbeat"/);
  assert.match(route, /browser-\$\{id\}\.txt/);
  assert.match(route, /action !== "heartbeat" && action !== "close"/);
});

test("closing the site sends a beacon to remove its session marker", () => {
  assert.match(component, /window\.addEventListener\("pagehide", closeSession\)/);
  assert.match(component, /navigator\.sendBeacon/);
  assert.match(route, /if \(action === "close"\)/);
  assert.match(route, /await unlink\(marker\)/);
});

test("launcher stops API and frontend after the last local tab closes", () => {
  assert.match(launcher, /browser-sessions/);
  assert.match(launcher, /All SKILLSETRA browser tabs are closed/);
  assert.match(launcher, /Stop-StartedProcess \$webProcess/);
  assert.match(launcher, /Stop-StartedProcess \$apiProcess/);
  assert.match(launcher, /TotalSeconds -ge 20/);
});
