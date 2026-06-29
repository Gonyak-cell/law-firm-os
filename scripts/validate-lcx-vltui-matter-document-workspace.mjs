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
const matterPanelPath = "apps/web/src/components/MatterVaultPanel.jsx";
const apiClientPath = "apps/web/src/data/apiClient.js";
const uiTestPath = "apps/web/test/ui-regression.test.mjs";
const proofScriptPath = "scripts/run-lcx-vltui-matter-document-workspace-proof.mjs";
const validatorPath = "scripts/validate-lcx-vltui-matter-document-workspace.mjs";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-matter-document-workspace-proof.json";
const receiptPath = "docs/lazycodex/lcx-vltui-03-document-workspace-receipt-2026-06-29.json";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";

for (const path of [
  packagePath,
  matterPanelPath,
  apiClientPath,
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
assert.equal(packageJson.scripts?.["lcx:vltui:matter-document-workspace:proof"], "node scripts/run-lcx-vltui-matter-document-workspace-proof.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:matter-document-workspace:validate"], "node scripts/validate-lcx-vltui-matter-document-workspace.mjs");

requireText(matterPanelPath, "fetchVaultBridgeStatus");
requireText(matterPanelPath, "fetchVaultUploadPreflight");
requireText(matterPanelPath, "workspaceMatterSelection");
requireText(matterPanelPath, "data-lcx-vltui-03-document-workspace-boundary=\"true\"");
requireText(matterPanelPath, "data-lcx-vltui-03-vault-source-state");
requireText(matterPanelPath, "data-lcx-vltui-03-preflight-state");
requireText(matterPanelPath, "data-lcx-vltui-03-preflight-action=\"true\"");
requireText(matterPanelPath, "data-lcx-vltui-03-publish-action-state");
requireText(matterPanelPath, "data-lcx-vltui-03-publish-write-enabled=\"false\"");
requireText(matterPanelPath, "data-lcx-vltui-03-import-boundary=\"true\"");
requireText(matterPanelPath, "data-lcx-vltui-03-import-execute-state");
requireText(matterPanelPath, "data-lcx-vltui-03-email-send-boundary=\"true\"");
requireText(matterPanelPath, "data-lcx-vltui-03-email-send-state");
requireText(matterPanelPath, "!workspacePreflightPassed");
requireText(matterPanelPath, "owner-provider-blocked");
requireText(matterPanelPath, "provider-blocked");
requireText(matterPanelPath, "Vault 문서 쓰기는 승인과 실행 증거 전까지 차단됩니다.");
requireText(apiClientPath, "fetchVaultUploadPreflight");
requireText(uiTestPath, "data-lcx-vltui-03-document-workspace-boundary=\"true\"");
requireText(uiTestPath, "data-lcx-vltui-03-publish-write-enabled=\"false\"");
requireText(proofScriptPath, "publish_before_preflight");
requireText(proofScriptPath, "owner-provider-blocked");
requireText(proofScriptPath, "provider_send_executed");

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.matter_document_workspace_proof.v0.1");
assert.deepEqual(proof.tuw_ids, ["LCX-VLTUI-03.01", "LCX-VLTUI-03.02", "LCX-VLTUI-03.03", "LCX-VLTUI-03.04", "LCX-VLTUI-03.05"]);
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.synthetic_route_interception_only, true);
assert.equal(proof.boundary.customer_document_import_executed, false);
assert.equal(proof.boundary.vault_document_write_enabled, false);
assert.equal(proof.boundary.vault_document_created, false);
assert.equal(proof.boundary.document_bytes_included, false);
assert.equal(proof.boundary.storage_pointer_ref_included, false);
assert.equal(proof.boundary.provider_send_executed, false);
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);
assert.equal(proof.boundary.owner_final_approval, false);
assert.equal(proof.cases.length, 1);

const proofCase = proof.cases[0];
assert.equal(proofCase.id, "document-workspace-boundary");
assert.equal(proofCase.passed, true);
assert.equal(proofCase.initial_boundary.source_state, "source-ready");
assert.equal(proofCase.initial_boundary.preflight_state, "not-run");
assert.equal(proofCase.initial_boundary.publish_write_enabled, "false");
assert.equal(proofCase.publish_before_preflight.state, "preflight-required");
assert.equal(proofCase.publish_before_preflight.disabled, true);
assert.equal(proofCase.publish_after_preflight.state, "owner-blocked");
assert.equal(proofCase.publish_after_preflight.disabled, false);
assert.equal(proofCase.final_boundary.preflight_state, "passed");
assert.equal(proofCase.final_boundary.publish_state, "owner-blocked");
assert.equal(proofCase.final_boundary.import_dry_run_state, "dry-run-ready");
assert.equal(proofCase.final_boundary.import_execute_state, "owner-provider-blocked");
assert.equal(proofCase.final_boundary.email_send_state, "provider-blocked");
assert.equal(proofCase.calls.preflight, 1);
assert.equal(proofCase.calls.builder_create, 1);
assert.equal(proofCase.calls.builder_patch, 1);
assert.ok(proofCase.calls.builder_preview >= 2);
assert.equal(proofCase.calls.approval, 1);
assert.equal(proofCase.calls.publish, 1);
assert.equal(proofCase.calls.email_create, 1);
assert.equal(proofCase.calls.email_patch, 1);
assert.equal(proofCase.calls.email_send, 1);
assert.equal(proofCase.calls.unexpected_writes.length, 0);
assert.equal(proofCase.forbidden_text_detected, false);
assert.equal(existsSync(proofCase.screenshot), true, "proof screenshot missing");

const receipt = readJson(receiptPath);
assert.equal(receipt.status, "ui-browser-verified");
assert.deepEqual(receipt.implemented_tuws, proof.tuw_ids);
assert.equal(receipt.browser_proof.verdict, "PASS");
assert.equal(receipt.claim_boundary.production_ready, false);
assert.equal(receipt.claim_boundary.public_release, false);
assert.equal(receipt.claim_boundary.production_go_live, false);
assert.equal(receipt.claim_boundary.owner_final_approval, false);
assert.equal(receipt.claim_boundary.customer_document_import_executed, false);
assert.equal(receipt.claim_boundary.vault_document_write_enabled, false);
assert.equal(receipt.claim_boundary.vault_document_created, false);
assert.equal(receipt.claim_boundary.document_bytes_included, false);
assert.equal(receipt.claim_boundary.storage_pointer_ref_included, false);
assert.equal(receipt.claim_boundary.provider_send_executed, false);

const mainReceipt = readJson(mainReceiptPath);
const closeoutComplete = mainReceipt.goal_status === "complete" &&
  mainReceipt.next_slice.length === 0 &&
  mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-90.01~90.07" && item.status === "closeout-browser-verified");
for (const tuw of proof.tuw_ids) {
  assert.ok(mainReceipt.opened_tuws.includes(tuw), `${tuw} missing from opened_tuws`);
}
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-03.01~03.05" && item.status === "ui-browser-verified"));
assert.ok(
    JSON.stringify(mainReceipt.next_slice) === JSON.stringify(["LCX-VLTUI-04.01", "LCX-VLTUI-04.02", "LCX-VLTUI-04.03", "LCX-VLTUI-04.04"]) ||
    JSON.stringify(mainReceipt.next_slice) === JSON.stringify(["LCX-VLTUI-04.03", "LCX-VLTUI-04.04"]) ||
    mainReceipt.next_slice.includes("LCX-VLTUI-05.01") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-06.01") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-90.01") ||
    closeoutComplete,
  "next_slice should point to LCX-VLTUI-04 start, remaining LCX-VLTUI-04 profile/audit slice, or later"
);

for (const tuw of proof.tuw_ids) {
  requireText(planPath, `| ${tuw} | implemented |`);
}
requireText(planPath, "| LCX-VLTUI-03 | Matter document workspace and Vault publication | implemented |");

console.log(JSON.stringify({
  verdict: "PASS",
  tuw_ids: proof.tuw_ids,
  proof: proofPath,
  receipt: receiptPath
}, null, 2));
