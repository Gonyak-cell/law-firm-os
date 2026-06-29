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
const desktopPath = "apps/desktop/src/renderer/offline.html";
const uiTestPath = "apps/web/test/ui-regression.test.mjs";
const proofScriptPath = "scripts/run-lcx-vltui-session-principal-proof.mjs";
const validatorPath = "scripts/validate-lcx-vltui-session-principal.mjs";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-session-principal-proof.json";
const receiptPath = "docs/lazycodex/lcx-vltui-04-session-principal-receipt-2026-06-29.json";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";

for (const path of [
  packagePath,
  apiClientPath,
  desktopPath,
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
assert.equal(packageJson.scripts?.["lcx:vltui:session-principal:proof"], "node scripts/run-lcx-vltui-session-principal-proof.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:session-principal:validate"], "node scripts/validate-lcx-vltui-session-principal.mjs");

requireText(apiClientPath, "LAWOS_SESSION_ENVELOPE_STORAGE_KEY = \"lawos.session.envelope\"");
requireText(apiClientPath, "LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION = \"law-firm-os.desktop-web-session-envelope.v0.1\"");
requireText(apiClientPath, "export function readLawosSessionEnvelope");
requireText(apiClientPath, "hasForbiddenSessionKey");
requireText(apiClientPath, "FORBIDDEN_SESSION_TEXT");
requireText(apiClientPath, "session_principal_source: \"desktop_web_session_envelope\"");
requireText(apiClientPath, "permissionContextFor(ctx, PERMISSION_CONTEXTS, \"client\")");
requireText(apiClientPath, "permissionContextFor(ctx, MATTER_PERMISSION_CONTEXTS, \"matter\")");
requireText(apiClientPath, "permissionContextFor(ctx, VAULT_PERMISSION_CONTEXTS, \"vault\")");

requireText(desktopPath, "LAWOS_SESSION_ENVELOPE_STORAGE_KEY = \"lawos.session.envelope\"");
requireText(desktopPath, "function desktopSessionEnvelope");
requireText(desktopPath, "actor_ref: actorRef");
requireText(desktopPath, "client: \"tenant_rp04_synthetic\"");
requireText(desktopPath, "matter: \"tenant_rp05_synthetic\"");
requireText(desktopPath, "vault: \"tenant_amic_matter_vault\"");
requireText(desktopPath, "window.sessionStorage.setItem(LAWOS_SESSION_ENVELOPE_STORAGE_KEY");
requireText(desktopPath, "clearSessionEnvelope");
assert.doesNotMatch(read(desktopPath), /access_token|refresh_token|id_token|raw_cookie|Bearer/);

requireText(uiTestPath, "LAWOS_SESSION_ENVELOPE_STORAGE_KEY = \"lawos\\.session\\.envelope\"");
requireText(uiTestPath, "permissionContextFor\\(ctx, PERMISSION_CONTEXTS, \"client\"\\)");
requireText(proofScriptPath, "client-allow-session-principal");
requireText(proofScriptPath, "matter-envelope-review-fail-closed");
requireText(proofScriptPath, "vault-query-denied-fail-closed");
requireText(proofScriptPath, "forbiddenHeaderText");

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.session_principal_proof.v0.1");
assert.deepEqual(proof.tuw_ids, ["LCX-VLTUI-04.01", "LCX-VLTUI-04.02"]);
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.synthetic_route_interception_only, true);
assert.equal(proof.boundary.session_header_source, "desktop_web_session_envelope");
assert.equal(proof.boundary.customer_data_write_executed, false);
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);
assert.equal(proof.boundary.owner_final_approval, false);
assert.equal(proof.boundary.secret_material_in_envelope, false);
assert.equal(proof.boundary.secret_material_in_permission_header, false);
assert.equal(proof.cases.length, 1);

const proofCase = proof.cases[0];
assert.equal(proofCase.id, "session-principal-headers");
assert.equal(proofCase.passed, true);
assert.equal(proofCase.forbidden_header_text_detected, false);
assert.equal(proofCase.page_errors.length, 0);
assert.equal(proofCase.session_envelope.actor_ref, "user_lcx_vltui_session");
assert.equal(proofCase.session_envelope.tenant_refs.client, "tenant_rp04_synthetic");
assert.equal(proofCase.session_envelope.tenant_refs.matter, "tenant_rp05_synthetic");
assert.equal(proofCase.session_envelope.tenant_refs.vault, "tenant_amic_matter_vault");

const expectedCaseIds = [
  "client-allow-session-principal",
  "matter-allow-session-principal",
  "vault-allow-session-principal",
  "vault-bridge-allow-session-principal",
  "matter-envelope-review-fail-closed",
  "vault-query-denied-fail-closed"
];
assert.deepEqual(proofCase.cases.map((item) => item.id), expectedCaseIds);
for (const item of proofCase.cases) {
  assert.equal(item.passed, true, `${item.id} failed`);
  assert.equal(item.principal.user_id, "user_lcx_vltui_session");
  assert.equal(item.principal.session_principal_source, "desktop_web_session_envelope");
}
assert.equal(proofCase.cases.find((item) => item.id === "client-allow-session-principal").principal.tenant_id, "tenant_rp04_synthetic");
assert.equal(proofCase.cases.find((item) => item.id === "matter-allow-session-principal").principal.tenant_id, "tenant_rp05_synthetic");
assert.equal(proofCase.cases.find((item) => item.id === "vault-allow-session-principal").principal.tenant_id, "tenant_amic_matter_vault");
assert.deepEqual(proofCase.cases.find((item) => item.id === "matter-envelope-review-fail-closed").rule_effects, ["review_required"]);
assert.deepEqual(proofCase.cases.find((item) => item.id === "vault-query-denied-fail-closed").rule_effects, []);

const receipt = readJson(receiptPath);
assert.equal(receipt.status, "session-header-browser-verified");
assert.deepEqual(receipt.implemented_tuws, proof.tuw_ids);
assert.equal(receipt.browser_proof.verdict, "PASS");
assert.equal(receipt.claim_boundary.production_ready, false);
assert.equal(receipt.claim_boundary.public_release, false);
assert.equal(receipt.claim_boundary.production_go_live, false);
assert.equal(receipt.claim_boundary.owner_final_approval, false);
assert.equal(receipt.claim_boundary.customer_data_write_executed, false);
assert.equal(receipt.claim_boundary.secret_material_in_envelope, false);
assert.equal(receipt.claim_boundary.secret_material_in_permission_header, false);

const mainReceipt = readJson(mainReceiptPath);
const closeoutComplete = mainReceipt.goal_status === "complete" &&
  mainReceipt.next_slice.length === 0 &&
  mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-90.01~90.07" && item.status === "closeout-browser-verified");
for (const tuw of proof.tuw_ids) {
  assert.ok(mainReceipt.opened_tuws.includes(tuw), `${tuw} missing from opened_tuws`);
}
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-04.01~04.02" && item.status === "session-header-browser-verified"));
assert.ok(
  JSON.stringify(mainReceipt.next_slice) === JSON.stringify(["LCX-VLTUI-04.03", "LCX-VLTUI-04.04"]) ||
    mainReceipt.next_slice.includes("LCX-VLTUI-05.01") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-06.01") ||
    mainReceipt.next_slice.includes("LCX-VLTUI-90.01") ||
    closeoutComplete,
  "next_slice should point to remaining LCX-VLTUI-04 profile/audit slice or later"
);

for (const tuw of proof.tuw_ids) {
  requireText(planPath, `| ${tuw} | implemented |`);
}
assert.ok(
  read(planPath).includes("| LCX-VLTUI-04 | Session, tenant, actor, and audit principal bridge | in_progress |") ||
    read(planPath).includes("| LCX-VLTUI-04 | Session, tenant, actor, and audit principal bridge | implemented |"),
  "LCX-VLTUI-04 phase row should be in_progress or implemented"
);

console.log(JSON.stringify({
  verdict: "PASS",
  tuw_ids: proof.tuw_ids,
  proof: proofPath,
  receipt: receiptPath
}, null, 2));
