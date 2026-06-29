#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function requireText(path, text) {
  assert.ok(read(path).includes(text), `${path} missing ${text}`);
}

const runtimePath = "apps/api/src/matter-runtime-context.js";
const routePath = "apps/api/src/routes/matters.js";
const apiTestPath = "apps/api/test/matter-vault-bridge-api.test.js";
const apiClientPath = "apps/web/src/data/apiClient.js";
const vaultSurfacePath = "apps/web/src/components/VaultSurface.jsx";
const uiTestPath = "apps/web/test/ui-regression.test.mjs";
const packagePath = "package.json";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const receiptPath = "docs/lazycodex/lcx-vltui-02-matter-picker-receipt-2026-06-29.json";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-matter-picker-proof.json";

for (const path of [
  runtimePath,
  routePath,
  apiTestPath,
  apiClientPath,
  vaultSurfacePath,
  uiTestPath,
  packagePath,
  planPath,
  receiptPath,
  mainReceiptPath,
  proofPath
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson(packagePath);
assert.equal(packageJson.scripts?.["lcx:vltui:matter-picker:proof"], "node scripts/run-lcx-vltui-matter-picker-proof.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:matter-picker:validate"], "node scripts/validate-lcx-vltui-matter-picker.mjs");

requireText(runtimePath, "\"GET /api/matters/vault-bridge/matter-lookup\"");
requireText(runtimePath, "handleVaultBridgeMatterLookup");
requireText(runtimePath, "UUID_INPUT_PATTERN");
requireText(runtimePath, "serializeVaultBridgeMatterLookupItem");
requireText(routePath, "GET /api/matters/vault-bridge/matter-lookup");
requireText(apiTestPath, "Vault bridge matter lookup is permission-scoped and rejects UUID-shaped normal input");
requireText(apiTestPath, "MATTER_API_VALIDATION_ERROR");
requireText(apiTestPath, "count_leak_prevented");

requireText(apiClientPath, "fetchVaultMatterLookup");
requireText(apiClientPath, "/api/matters/vault-bridge/matter-lookup");
requireText(vaultSurfacePath, "data-lcx-vltui-02-matter-picker=\"true\"");
requireText(vaultSurfacePath, "data-vault-matter-lookup-kind");
requireText(vaultSurfacePath, "data-vault-matter-selected-ref");
requireText(vaultSurfacePath, "UUID 직접 입력은 허용하지 않습니다");
assert.equal(/fetchVaultMatterLookup\(\{\s*ctx:\s*liveCtx,\s*query\s*\}\)/.test(read(vaultSurfacePath)), true, "VaultSurface must call lookup without bridgeToken");
assert.equal(/\bbridgeToken\b/.test(read(vaultSurfacePath)), false, "VaultSurface must not reference bridgeToken");

requireText(uiTestPath, "fetchVaultMatterLookup");
requireText(uiTestPath, "data-lcx-vltui-02-matter-picker=\"true\"");

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.matter_picker_proof.v0.1");
assert.equal(proof.tuw_id, "LCX-VLTUI-02.02");
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);
assert.equal(proof.boundary.owner_final_approval, false);
const cases = new Map(proof.cases.map((item) => [item.id, item]));
for (const id of ["positive-selection", "guarded-lookup", "uuid-local-block"]) {
  const row = cases.get(id);
  assert.ok(row, `missing proof case ${id}`);
  assert.equal(row.passed, true, `${id} did not pass`);
  assert.equal(existsSync(row.screenshot), true, `${id} screenshot missing`);
}
assert.equal(cases.get("positive-selection").selected_ref, "matter:matter_lcx_vltui_alpha");
assert.equal(cases.get("uuid-local-block").lookup_calls_after_uuid, cases.get("uuid-local-block").lookup_calls_before_uuid);

const receipt = readJson(receiptPath);
assert.equal(receipt.status, "api_ui_browser_verified");
assert.deepEqual(receipt.implemented_tuws, ["LCX-VLTUI-02.02"]);
assert.equal(receipt.browser_proof.verdict, "PASS");
assert.equal(receipt.claim_boundary.production_ready, false);
assert.equal(receipt.claim_boundary.public_release, false);
assert.equal(receipt.claim_boundary.production_go_live, false);
assert.equal(receipt.claim_boundary.owner_final_approval, false);

const mainReceipt = readJson(mainReceiptPath);
assert.ok(mainReceipt.opened_tuws.includes("LCX-VLTUI-02.02"));
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-02.02" && item.status === "api-ui-browser-verified"));
assert.equal(mainReceipt.next_slice.includes("LCX-VLTUI-02.02"), false);

requireText(planPath, "| LCX-VLTUI-02.02 | implemented |");
requireText(planPath, "LCX-VLTUI-02.03");

console.log(JSON.stringify({
  verdict: "PASS",
  tuw_id: "LCX-VLTUI-02.02",
  proof_cases: proof.cases.length,
  receipt: receiptPath,
  proof: proofPath
}, null, 2));
