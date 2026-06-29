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
const receiptPath = "docs/lazycodex/lcx-vltui-02-upload-preflight-receipt-2026-06-29.json";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-upload-preflight-proof.json";
const contractPath = "docs/lazycodex/lcx-vltui-01-vault-bridge-contract-2026-06-29.json";

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
  proofPath,
  contractPath
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson(packagePath);
assert.equal(packageJson.scripts?.["lcx:vltui:upload-preflight:proof"], "node scripts/run-lcx-vltui-upload-preflight-proof.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:upload-preflight:validate"], "node scripts/validate-lcx-vltui-upload-preflight.mjs");

requireText(runtimePath, "\"POST /api/matters/vault-bridge/upload-preflight\"");
requireText(runtimePath, "handleVaultBridgeUploadPreflight");
requireText(runtimePath, "vaultUploadPreflightGate");
requireText(runtimePath, "vault_document_write_enabled: false");
requireText(runtimePath, "allowed_next_step: \"permission_check_only\"");
requireText(routePath, "POST /api/matters/vault-bridge/upload-preflight");
requireText(apiTestPath, "Vault bridge upload preflight is guarded and returns reference-only permission check refs");
requireText(apiTestPath, "MATTER_VAULT_UPLOAD_PREFLIGHT_SOURCE_BLOCKED");
requireText(apiTestPath, "document_bytes");
requireText(apiTestPath, "storage_pointer");

requireText(apiClientPath, "fetchVaultUploadPreflight");
requireText(apiClientPath, "/api/matters/vault-bridge/upload-preflight");
requireText(apiClientPath, "permission_check_only");
requireText(apiClientPath, "vaultDocumentWriteEnabled");
requireText(vaultSurfacePath, "data-lcx-vltui-02-upload-preflight=\"true\"");
requireText(vaultSurfacePath, "data-vault-upload-preflight-state");
requireText(vaultSurfacePath, "data-vault-upload-write-enabled");
requireText(vaultSurfacePath, "Vault 쓰기는 계속 차단됩니다");
assert.equal(/\bbridgeToken\b/.test(read(vaultSurfacePath)), false, "VaultSurface must not reference bridgeToken");

requireText(uiTestPath, "fetchVaultUploadPreflight");
requireText(uiTestPath, "data-lcx-vltui-02-upload-preflight=\"true\"");
requireText(uiTestPath, "upload-preflight");

const contract = readJson(contractPath);
assert.ok(contract.law_firm_os_bridge.endpoints.includes("POST /api/matters/vault-bridge/upload-preflight"));
assert.equal(contract.claim_boundary.vault_document_write_enabled, false);

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.upload_preflight_proof.v0.1");
assert.equal(proof.tuw_id, "LCX-VLTUI-02.03");
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);
assert.equal(proof.boundary.owner_final_approval, false);
assert.equal(proof.boundary.vault_document_write_enabled, false);
const cases = new Map(proof.cases.map((item) => [item.id, item]));
for (const id of ["passed", "source-blocked", "guarded"]) {
  const row = cases.get(id);
  assert.ok(row, `missing proof case ${id}`);
  assert.equal(row.passed, true, `${id} did not pass`);
  assert.equal(row.vault_document_write_enabled, "false", `${id} must keep Vault write disabled`);
  assert.equal(existsSync(row.screenshot), true, `${id} screenshot missing`);
}
assert.equal(cases.get("passed").preflight_calls, 1);
assert.equal(cases.get("source-blocked").preflight_calls, 0);
assert.equal(cases.get("source-blocked").action_disabled, true);
assert.equal(cases.get("guarded").preflight_calls, 1);

const receipt = readJson(receiptPath);
assert.equal(receipt.status, "api_ui_browser_verified");
assert.deepEqual(receipt.implemented_tuws, ["LCX-VLTUI-02.03"]);
assert.equal(receipt.browser_proof.verdict, "PASS");
assert.equal(receipt.claim_boundary.production_ready, false);
assert.equal(receipt.claim_boundary.public_release, false);
assert.equal(receipt.claim_boundary.production_go_live, false);
assert.equal(receipt.claim_boundary.owner_final_approval, false);
assert.equal(receipt.claim_boundary.vault_document_write_enabled, false);

const mainReceipt = readJson(mainReceiptPath);
const closeoutComplete = mainReceipt.goal_status === "complete" &&
  mainReceipt.next_slice.length === 0 &&
  mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-90.01~90.07" && item.status === "closeout-browser-verified");
assert.ok(mainReceipt.opened_tuws.includes("LCX-VLTUI-02.03"));
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-02.03" && item.status === "api-ui-browser-verified"));
assert.equal(mainReceipt.next_slice.includes("LCX-VLTUI-02.03"), false);
assert.ok(
  mainReceipt.next_slice.includes("LCX-VLTUI-02.04") ||
  mainReceipt.next_slice.includes("LCX-VLTUI-03.01") ||
  mainReceipt.next_slice.includes("LCX-VLTUI-04.01") ||
  mainReceipt.next_slice.includes("LCX-VLTUI-04.03") ||
  mainReceipt.next_slice.includes("LCX-VLTUI-05.01") ||
  mainReceipt.next_slice.includes("LCX-VLTUI-06.01") ||
  mainReceipt.next_slice.includes("LCX-VLTUI-90.01") ||
  closeoutComplete,
  "next_slice should advance beyond LCX-VLTUI-02.03"
);

requireText(planPath, "| LCX-VLTUI-02.03 | implemented |");
requireText(planPath, "LCX-VLTUI-02.04");

console.log(JSON.stringify({
  verdict: "PASS",
  tuw_id: "LCX-VLTUI-02.03",
  proof_cases: proof.cases.length,
  receipt: receiptPath,
  proof: proofPath
}, null, 2));
