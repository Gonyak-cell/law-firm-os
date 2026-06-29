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

const packagePath = "package.json";
const vaultSurfacePath = "apps/web/src/components/VaultSurface.jsx";
const stylesPath = "apps/web/src/styles.css";
const uiTestPath = "apps/web/test/ui-regression.test.mjs";
const proofScriptPath = "scripts/run-lcx-vltui-browser-qa.mjs";
const validatorPath = "scripts/validate-lcx-vltui-action-boundaries.mjs";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-browser-qa-proof.json";
const receiptPath = "docs/lazycodex/lcx-vltui-02-action-boundary-receipt-2026-06-29.json";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";

for (const path of [
  packagePath,
  vaultSurfacePath,
  stylesPath,
  uiTestPath,
  proofScriptPath,
  validatorPath,
  proofPath,
  receiptPath,
  planPath,
  mainReceiptPath
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson(packagePath);
assert.equal(packageJson.scripts?.["lcx:vltui:browser-qa"], "node scripts/run-lcx-vltui-browser-qa.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:action-boundaries:validate"], "node scripts/validate-lcx-vltui-action-boundaries.mjs");

requireText(vaultSurfacePath, "function VaultActionBoundaryPanel");
requireText(vaultSurfacePath, "data-lcx-vltui-02-action-boundaries=\"true\"");
requireText(vaultSurfacePath, "data-vault-version-upload-state");
requireText(vaultSurfacePath, "data-vault-metadata-mutation-state");
requireText(vaultSurfacePath, "data-vault-legal-hold-state");
requireText(vaultSurfacePath, "data-vault-retention-state");
requireText(vaultSurfacePath, "data-vault-document-action-state");
requireText(vaultSurfacePath, "data-vault-boundary-write-enabled=\"false\"");
requireText(vaultSurfacePath, "disabled");
requireText(vaultSurfacePath, "새 버전 등록");
requireText(vaultSurfacePath, "메타데이터 변경");
requireText(vaultSurfacePath, "법적 보존");
requireText(vaultSurfacePath, "보존 정책");
requireText(vaultSurfacePath, "Owner 결정 필요");
requireText(vaultSurfacePath, "Vault Records");
assert.equal(/\bbridgeToken\b/.test(read(vaultSurfacePath)), false, "VaultSurface must not reference bridgeToken");

requireText(stylesPath, ".vault-action-boundary-row");
requireText(stylesPath, ".vault-action-boundary-action:disabled");
requireText(uiTestPath, "data-lcx-vltui-02-action-boundaries=\"true\"");
requireText(uiTestPath, "data-vault-version-upload-state");
requireText(uiTestPath, "Owner 결정 필요");
requireText(proofScriptPath, "unexpectedWrites");
requireText(proofScriptPath, "all_buttons_disabled");
requireText(proofScriptPath, "vault_document_write_enabled: false");

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.browser_qa_proof.v0.1");
assert.deepEqual(proof.tuw_ids, ["LCX-VLTUI-02.04", "LCX-VLTUI-02.05", "LCX-VLTUI-02.06"]);
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.synthetic_route_interception_only, true);
assert.equal(proof.boundary.customer_document_import_executed, false);
assert.equal(proof.boundary.vault_document_write_enabled, false);
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);
assert.equal(proof.boundary.owner_final_approval, false);

const cases = new Map(proof.cases.map((item) => [item.id, item]));
for (const id of ["ready-preflight-passed", "source-blocked", "guarded-preflight"]) {
  const row = cases.get(id);
  assert.ok(row, `missing proof case ${id}`);
  assert.equal(row.passed, true, `${id} did not pass`);
  assert.equal(row.boundary_write_enabled, "false", `${id} must keep boundary write disabled`);
  assert.equal(row.unexpected_write_calls, 0, `${id} must not issue document write calls`);
  assert.equal(row.all_buttons_disabled, true, `${id} action buttons must stay disabled`);
  assert.equal(row.row_count, 5, `${id} must cover five action rows`);
  assert.equal(existsSync(row.screenshot), true, `${id} screenshot missing`);
}
assert.equal(cases.get("ready-preflight-passed").preflight_calls, 1);
assert.equal(cases.get("ready-preflight-passed").states.version_upload, "guarded");
assert.equal(cases.get("ready-preflight-passed").states.metadata_mutation, "guarded");
assert.equal(cases.get("ready-preflight-passed").states.legal_hold, "owner-blocked");
assert.equal(cases.get("ready-preflight-passed").states.retention, "records-blocked");
assert.equal(cases.get("ready-preflight-passed").states.document_action, "guarded");
assert.equal(cases.get("source-blocked").preflight_calls, 0);
assert.equal(cases.get("guarded-preflight").preflight_calls, 1);

const receipt = readJson(receiptPath);
assert.equal(receipt.status, "ui-browser-verified");
assert.deepEqual(receipt.implemented_tuws, ["LCX-VLTUI-02.04", "LCX-VLTUI-02.05", "LCX-VLTUI-02.06"]);
assert.equal(receipt.browser_proof.verdict, "PASS");
assert.equal(receipt.claim_boundary.production_ready, false);
assert.equal(receipt.claim_boundary.public_release, false);
assert.equal(receipt.claim_boundary.production_go_live, false);
assert.equal(receipt.claim_boundary.owner_final_approval, false);
assert.equal(receipt.claim_boundary.vault_document_write_enabled, false);
assert.equal(receipt.claim_boundary.customer_document_import_executed, false);

const mainReceipt = readJson(mainReceiptPath);
const closeoutComplete = mainReceipt.goal_status === "complete" &&
  mainReceipt.next_slice.length === 0 &&
  mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-90.01~90.07" && item.status === "closeout-browser-verified");
for (const tuw of ["LCX-VLTUI-02.04", "LCX-VLTUI-02.05", "LCX-VLTUI-02.06"]) {
  assert.ok(mainReceipt.opened_tuws.includes(tuw), `${tuw} missing from opened_tuws`);
}
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-02.04~02.06" && item.status === "ui-browser-verified"));
assert.ok(
    mainReceipt.next_slice.includes("LCX-VLTUI-03.01") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-04.01") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-04.03") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-05.01") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-06.01") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-90.01") ||
    closeoutComplete,
  "main receipt should advance beyond LCX-VLTUI-02.06"
);

requireText(planPath, "| LCX-VLTUI-02.04 | implemented |");
requireText(planPath, "| LCX-VLTUI-02.05 | implemented |");
requireText(planPath, "| LCX-VLTUI-02.06 | implemented |");

console.log(JSON.stringify({
  verdict: "PASS",
  tuw_ids: proof.tuw_ids,
  proof_cases: proof.cases.length,
  receipt: receiptPath,
  proof: proofPath
}, null, 2));
