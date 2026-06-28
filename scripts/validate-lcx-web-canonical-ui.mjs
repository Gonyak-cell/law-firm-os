#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const requiredFiles = [
  "docs/desktop/matter-web-canonical-ui-plan.md",
  "docs/desktop/matter-web-backend-capability-map.md",
  "docs/lazycodex/evidence/matter-web/index.md",
  "docs/lazycodex/evidence/matter-web/LCX-WEB-00-source-freeze.md",
  "docs/lazycodex/evidence/matter-web/LCX-WEB-01-capability-ledger.md",
  "docs/lazycodex/evidence/matter-web/LCX-WEB-02-desktop-handoff.md",
  "docs/lazycodex/evidence/matter-web/LCX-WEB-03-command-center.md",
  "docs/lazycodex/evidence/matter-web/LCX-WEB-04-core-cmp-vault.md",
  "docs/lazycodex/evidence/matter-web/LCX-WEB-05-operations-coverage.md",
  "docs/lazycodex/evidence/matter-web/LCX-WEB-06-people-admin-ops.md",
  "docs/lazycodex/evidence/matter-web/LCX-WEB-07-verification-closeout.md",
  "apps/web/src/data/capabilityMap.js",
  "apps/web/src/components/HomeSurface.jsx",
  "scripts/prepare-matter-desktop-web-renderer.mjs"
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `${file} is required`);
}

const sourcePlan = read("docs/desktop/matter-web-canonical-ui-plan.md");
assert.match(sourcePlan, /The only product UI source of truth for this lane is `apps\/web`/);
for (const exclusion of [
  "external design-research folders",
  "archived prototype UI folders",
  "static HTML reference screens",
  "third-party product-style parity packs",
  "screenshot-parity reference packs"
]) {
  assert.match(sourcePlan, new RegExp(exclusion), `${exclusion} exclusion must be recorded`);
}
assert.match(sourcePlan, /production go-live: false/);
assert.match(sourcePlan, /public release: false/);
assert.match(sourcePlan, /owner approval: false/);

const appSource = read("apps/web/src/App.jsx");
assert.match(appSource, /const \[liveCtx, setLiveCtx\] = useState\(initialLiveCtx\)/);
assert.match(appSource, /<HomeSurface[\s\S]*liveCtx=\{liveCtx\}/);

const capabilityMap = read("apps/web/src/data/capabilityMap.js");
const requiredCapabilityIds = ["client", "matter", "people", "vault"];
for (const id of requiredCapabilityIds) assert.match(capabilityMap, new RegExp(`id: "${id}"`));
for (const endpoint of [
  "GET /api/matters/:matter_id/command-center",
  "POST /api/vault/documents/upload",
  "POST /api/crm/opportunities/:id/handoff",
  "POST /api/finance/wip",
  "POST /api/ai/outputs",
  "POST /api/portal/secure-links",
  "POST /api/hrx/ai/assistant",
  "POST /api/data-room/projections"
]) {
  assert.match(capabilityMap, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(capabilityMap, /productionGoLive: false/);
assert.match(capabilityMap, /publicRelease: false/);
assert.match(capabilityMap, /ownerApproval: false/);

const homeSource = read("apps/web/src/components/HomeSurface.jsx");
assert.match(homeSource, /data-lcx-web-command-center="true"/);
assert.match(homeSource, /backendCapabilities/);
assert.match(homeSource, /fetchHrxPeopleOverview/);
assert.match(homeSource, /combinePillarResults/);
assert.match(homeSource, /unavailable/);
assert.match(homeSource, /denied/);
assert.match(homeSource, /review/);
assert.match(homeSource, /guarded/);
assert.doesNotMatch(homeSource, /mockData|from "\.\.\/data\/mockData/);

const navSource = read("apps/web/src/data/nav.js");
const shellSource = read("apps/web/src/components/Shell.jsx");
for (const id of requiredCapabilityIds) assert.match(navSource, new RegExp(`id: "${id === "client" ? "clients" : id === "matter" ? "matters" : id}"`));
for (const removedRoute of ["portal", "readiness", "ops", "intake", "finance", "profiles", "analytics", "dashboards", "ask", "experiments", "admin", "dark"]) {
  assert.doesNotMatch(navSource, new RegExp(`id: "${removedRoute}"`));
  assert.doesNotMatch(appSource, new RegExp(`view === "${removedRoute}"`));
}
assert.match(shellSource, /Client/);
assert.match(shellSource, /Matter/);
assert.match(shellSource, /구성원/);
assert.match(shellSource, /Vault/);

const offline = read("apps/desktop/src/renderer/offline.html");
assert.match(offline, /productUiTarget/);
assert.match(offline, /web\/index\.html\?desktop=1&view=home&data=live&ctx=allow/);
assert.match(offline, /handoffToProductUi/);
assert.doesNotMatch(offline, /localStorage|sessionStorage|indexedDB/);

const prepareScript = read("scripts/prepare-matter-desktop-web-renderer.mjs");
assert.match(prepareScript, /npm", \["--workspace", "apps\/web", "run", "build"\]/);
assert.match(prepareScript, /apps\/desktop\/src\/renderer\/web/);
assert.match(read("apps/web/vite.config.js"), /base:\s*"\.\/"/);

const evidenceIndex = read("docs/lazycodex/evidence/matter-web/index.md");
for (let phase = 0; phase <= 7; phase += 1) {
  assert.match(evidenceIndex, new RegExp(`LCX-WEB-0${phase}`), `LCX-WEB-0${phase} must be indexed`);
}

console.log(JSON.stringify({
  verdict: "PASS",
  goal: "LCX-WEB apps/web canonical product UI 38 TUW full implementation",
  tuws: 38,
  source_of_truth: "apps/web",
  production_go_live: false,
  public_release: false,
  owner_approval: false
}, null, 2));
