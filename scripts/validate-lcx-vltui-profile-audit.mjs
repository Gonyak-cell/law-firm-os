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
const apiClientPath = "apps/web/src/data/apiClient.js";
const profileSurfacePath = "apps/web/src/components/UserProfileSurface.jsx";
const appPath = "apps/web/src/App.jsx";
const serverPath = "apps/api/src/server.js";
const apiTestPath = "apps/api/test/profile-api.test.js";
const uiTestPath = "apps/web/test/ui-regression.test.mjs";
const proofScriptPath = "scripts/run-lcx-vltui-profile-audit-proof.mjs";
const validatorPath = "scripts/validate-lcx-vltui-profile-audit.mjs";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-profile-audit-proof.json";
const receiptPath = "docs/lazycodex/lcx-vltui-04-profile-audit-receipt-2026-06-29.json";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";

for (const path of [
  packagePath,
  apiClientPath,
  profileSurfacePath,
  appPath,
  serverPath,
  apiTestPath,
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
assert.equal(packageJson.scripts?.["lcx:vltui:profile-audit:proof"], "node scripts/run-lcx-vltui-profile-audit-proof.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:profile-audit:validate"], "node scripts/validate-lcx-vltui-profile-audit.mjs");

requireText(serverPath, "PROFILE_BOUNDED_CONTEXT");
requireText(serverPath, "GET /api/profile/me");
requireText(serverPath, "handleProfileApiRequest");
requireText(apiTestPath, "Profile API returns session-derived safe profile read model");
requireText(apiTestPath, "Profile API fails closed for review and denied permission contexts");
requireText(apiClientPath, "export async function fetchUserProfile");
requireText(apiClientPath, "actorRefForDomain(\"matter\", MATTER_PRINCIPAL.user_id)");
requireText(apiClientPath, "actorRefForDomain(\"crm\", CRM_INTAKE_PRINCIPAL.user_id)");
requireText(apiClientPath, "permissionContextFor(ctx, CRM_INTAKE_PERMISSION_CONTEXTS, \"crm\")");
requireText(profileSurfacePath, "data-profile-api-backed=\"true\"");
requireText(profileSurfacePath, "data-profile-api-state={currentState}");
requireText(profileSurfacePath, "data-profile-route-state=\"true\"");
requireText(profileSurfacePath, "data-profile-help-route=\"settings-support\"");
requireText(profileSurfacePath, "data-profile-contract-route=\"matters:matter-opening\"");
requireText(profileSurfacePath, "data-profile-action-route={`${view}:${section}`}");
assert.doesNotMatch(read(profileSurfacePath), /setLocalAction|data-profile-local-state|data-profile-help-feedback|data-profile-contract-create/);
requireText(appPath, "<UserProfileSurface liveCtx={liveCtx} onNavigate={navigateToView} />");
requireText(uiTestPath, "data-profile-api-backed=\"true\"");
requireText(proofScriptPath, "client-write-session-actor-audit");
requireText(proofScriptPath, "matter-write-session-actor-audit");
requireText(proofScriptPath, "vault-write-candidate-session-actor-audit");

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.profile_audit_proof.v0.1");
assert.deepEqual(proof.tuw_ids, ["LCX-VLTUI-04.03", "LCX-VLTUI-04.04"]);
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.synthetic_route_interception_only, true);
assert.equal(proof.boundary.profile_api_route_backed, true);
assert.equal(proof.boundary.customer_data_write_executed, false);
assert.equal(proof.boundary.vault_document_write_enabled, false);
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);
assert.equal(proof.boundary.owner_final_approval, false);
assert.equal(proof.boundary.secret_material_in_profile, false);
assert.equal(proof.boundary.secret_material_in_permission_header, false);
assert.equal(proof.cases.length, 1);

const proofCase = proof.cases[0];
assert.equal(proofCase.id, "profile-route-states-and-audit-actors");
assert.equal(proofCase.passed, true);
assert.equal(proofCase.forbidden_text_detected, false);
assert.equal(proofCase.page_errors.length, 0);
const expectedChecks = [
  "profile-populated-state",
  "profile-empty-state",
  "profile-review-state",
  "profile-denied-state",
  "profile-error-state",
  "profile-help-route-backed",
  "profile-contract-route-backed",
  "profile-finance-route-backed",
  "client-write-session-actor-audit",
  "matter-write-session-actor-audit",
  "vault-write-candidate-session-actor-audit"
];
assert.deepEqual(proofCase.checks.map((item) => item.id), expectedChecks);
for (const check of proofCase.checks) assert.equal(check.passed, true, `${check.id} failed`);
assert.equal(proofCase.writes.client.principal.user_id, "user_lcx_vltui_session");
assert.equal(proofCase.writes.client.principal.tenant_id, "tenant_cmp_g6_synthetic");
assert.equal(proofCase.writes.client.payload.actor_id, "user_lcx_vltui_session");
assert.equal(proofCase.writes.client.payload.audit_hint_ref, "ui_sf_b_w01_account_write_probe");
assert.equal(proofCase.writes.matter.principal.user_id, "user_lcx_vltui_session");
assert.equal(proofCase.writes.matter.principal.tenant_id, "tenant_rp05_synthetic");
assert.equal(proofCase.writes.matter.payload.actor_id, "user_lcx_vltui_session");
assert.equal(proofCase.writes.matter.payload.audit_hint_ref, "ui_sf_b_w04_builder_draft_create_probe");
assert.equal(proofCase.writes.vault.principal.user_id, "user_lcx_vltui_session");
assert.equal(proofCase.writes.vault.principal.tenant_id, "tenant_amic_matter_vault");
assert.equal(proofCase.writes.vault.payload.audit_hint_ref, "ui_cmp_g5_vault_probe");

const receipt = readJson(receiptPath);
assert.equal(receipt.status, "profile-and-audit-browser-verified");
assert.deepEqual(receipt.implemented_tuws, proof.tuw_ids);
assert.equal(receipt.browser_proof.verdict, "PASS");
assert.equal(receipt.claim_boundary.production_ready, false);
assert.equal(receipt.claim_boundary.public_release, false);
assert.equal(receipt.claim_boundary.production_go_live, false);
assert.equal(receipt.claim_boundary.owner_final_approval, false);
assert.equal(receipt.claim_boundary.customer_data_write_executed, false);
assert.equal(receipt.claim_boundary.vault_document_write_enabled, false);

const mainReceipt = readJson(mainReceiptPath);
const closeoutComplete = mainReceipt.goal_status === "complete" &&
  mainReceipt.next_slice.length === 0 &&
  mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-90.01~90.07" && item.status === "closeout-browser-verified");
for (const tuw of proof.tuw_ids) {
  assert.ok(mainReceipt.opened_tuws.includes(tuw), `${tuw} missing from opened_tuws`);
}
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-04.03~04.04" && item.status === "profile-and-audit-browser-verified"));
assert.ok(
  JSON.stringify(mainReceipt.next_slice) === JSON.stringify([
    "LCX-VLTUI-05.01",
    "LCX-VLTUI-05.02",
    "LCX-VLTUI-05.03",
    "LCX-VLTUI-05.04",
    "LCX-VLTUI-05.05",
    "LCX-VLTUI-05.06",
    "LCX-VLTUI-05.07"
  ]) ||
    mainReceipt.next_slice.includes("LCX-VLTUI-06.01") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-90.01") ||
    closeoutComplete,
  "next_slice should point to LCX-VLTUI-05 or later"
);

for (const tuw of proof.tuw_ids) {
  requireText(planPath, `| ${tuw} | implemented |`);
}
requireText(planPath, "| LCX-VLTUI-04 | Session, tenant, actor, and audit principal bridge | implemented |");

console.log(JSON.stringify({
  verdict: "PASS",
  tuw_ids: proof.tuw_ids,
  proof: proofPath,
  receipt: receiptPath
}, null, 2));
