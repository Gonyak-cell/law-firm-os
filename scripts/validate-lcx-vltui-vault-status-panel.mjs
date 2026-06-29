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

const vaultSurfacePath = "apps/web/src/components/VaultSurface.jsx";
const uiTestPath = "apps/web/test/ui-regression.test.mjs";
const packagePath = "package.json";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const receiptPath = "docs/lazycodex/lcx-vltui-02-vault-status-panel-receipt-2026-06-29.json";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-vault-status-panel-proof.json";

for (const path of [vaultSurfacePath, uiTestPath, packagePath, planPath, receiptPath, mainReceiptPath, proofPath]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson(packagePath);
assert.equal(packageJson.scripts?.["lcx:vltui:vault-status:proof"], "node scripts/run-lcx-vltui-vault-status-panel-proof.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:vault-status:validate"], "node scripts/validate-lcx-vltui-vault-status-panel.mjs");

const vaultSurface = read(vaultSurfacePath);
requireText(vaultSurfacePath, "fetchVaultBridgeStatus");
requireText(vaultSurfacePath, "data-lcx-vltui-02-vault-bridge-panel=\"true\"");
requireText(vaultSurfacePath, "data-vault-bridge-kind");
requireText(vaultSurfacePath, "data-vault-bridge-ready");
requireText(vaultSurfacePath, "토큰 값은 화면에 표시하지 않습니다.");
requireText(vaultSurfacePath, "productionReadyClaim");
assert.equal(/fetchVaultBridgeStatus\(\{\s*ctx:\s*liveCtx\s*\}\)/.test(vaultSurface), true, "VaultSurface must not pass bridgeToken from UI");
assert.equal(/\bbridgeToken\b/.test(vaultSurface), false, "VaultSurface must not reference bridgeToken");

requireText(uiTestPath, "data-lcx-vltui-02-vault-bridge-panel=\"true\"");
requireText(uiTestPath, "assert.doesNotMatch(vaultSource, /bridgeToken/)");

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.vault_status_panel_proof.v0.1");
assert.equal(proof.tuw_id, "LCX-VLTUI-02.01");
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);
assert.equal(proof.boundary.owner_final_approval, false);
const casesById = new Map(proof.cases.map((item) => [item.id, item]));
for (const [id, expectedReady] of [
  ["unconfigured-missing-token", "false"],
  ["ready-synthetic-matter-app-api", "true"],
  ["projection-only-blocked", "false"],
  ["stale-projection-blocked", "false"],
  ["claim-boundary-blocked", "false"]
]) {
  const row = casesById.get(id);
  assert.ok(row, `missing proof case ${id}`);
  assert.equal(row.ready, expectedReady, `${id} ready mismatch`);
  assert.equal(row.passed, true, `${id} did not pass`);
  assert.equal(existsSync(row.screenshot), true, `${id} screenshot missing`);
}

const receipt = readJson(receiptPath);
assert.equal(receipt.status, "ui_browser_verified");
assert.deepEqual(receipt.implemented_tuws, ["LCX-VLTUI-02.01"]);
assert.equal(receipt.browser_proof.verdict, "PASS");
assert.equal(receipt.lazyweb_report.status, "attempted_blocked_by_lazyweb_input_adapter");
assert.equal(receipt.claim_boundary.production_ready, false);
assert.equal(receipt.claim_boundary.public_release, false);
assert.equal(receipt.claim_boundary.production_go_live, false);
assert.equal(receipt.claim_boundary.owner_final_approval, false);

const mainReceipt = readJson(mainReceiptPath);
assert.ok(mainReceipt.opened_tuws.includes("LCX-VLTUI-02.01"));
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-02.01" && item.status === "ui-browser-verified"));
assert.equal(mainReceipt.next_slice.includes("LCX-VLTUI-02.01"), false);

requireText(planPath, "| LCX-VLTUI-02.01 | implemented |");
requireText(planPath, "LCX-VLTUI-02.01: Vault top-level connected status panel.");

console.log(JSON.stringify({
  verdict: "PASS",
  tuw_id: "LCX-VLTUI-02.01",
  proof_cases: proof.cases.length,
  receipt: receiptPath,
  proof: proofPath
}, null, 2));
