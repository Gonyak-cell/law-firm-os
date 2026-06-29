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
const routesPath = "apps/api/src/routes/crm.js";
const crmContextPath = "apps/api/src/crm-intake-runtime-context.js";
const crmTestPath = "apps/api/test/cmp-r4-g6-crm-intake.test.js";
const apiClientPath = "apps/web/src/data/apiClient.js";
const clientsSurfacePath = "apps/web/src/components/ClientsSurface.jsx";
const uiTestPath = "apps/web/test/ui-regression.test.mjs";
const proofScriptPath = "scripts/run-lcx-vltui-client-sections-proof.mjs";
const validatorPath = "scripts/validate-lcx-vltui-client-sections.mjs";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-client-sections-proof.json";
const receiptPath = "docs/lazycodex/lcx-vltui-05-client-sections-receipt-2026-06-29.json";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const gapLedgerPath = "docs/lazycodex/lcx-vault-app-current-ui-gap-ledger-2026-06-29.json";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";

for (const path of [
  packagePath,
  routesPath,
  crmContextPath,
  crmTestPath,
  apiClientPath,
  clientsSurfacePath,
  uiTestPath,
  proofScriptPath,
  validatorPath,
  proofPath,
  receiptPath,
  planPath,
  gapLedgerPath,
  mainReceiptPath
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson(packagePath);
assert.equal(packageJson.scripts?.["lcx:vltui:client-sections:proof"], "node scripts/run-lcx-vltui-client-sections-proof.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:client-sections:validate"], "node scripts/validate-lcx-vltui-client-sections.mjs");

for (const endpoint of [
  "GET /api/crm/activities",
  "POST /api/crm/activities",
  "PATCH /api/crm/activities/:id",
  "GET /api/crm/proposals",
  "POST /api/crm/proposals",
  "PATCH /api/crm/proposals/:id",
  "GET /api/crm/client-settings",
  "PATCH /api/crm/client-settings/:id"
]) {
  requireText(crmContextPath, endpoint);
}
for (const action of [
  "crm:activity:read",
  "crm:activity:write",
  "crm:activity:patch",
  "crm:proposal:read",
  "crm:proposal:write",
  "crm:proposal:patch",
  "crm:client_settings:read",
  "crm:client_settings:patch"
]) {
  requireText(routesPath, action);
}

for (const marker of [
  "data-client-activities-connected=\"true\"",
  "data-client-contracts-connected=\"true\"",
  "data-client-relationships-connected=\"true\"",
  "data-client-conflict-connected=\"true\"",
  "data-client-billing-connected=\"true\"",
  "data-client-settings-connected=\"true\"",
  "data-client-contract-esign-provider-blocked=\"true\"",
  "data-client-billing-provider-blocked=\"true\""
]) {
  requireText(clientsSurfacePath, marker);
  requireText(uiTestPath, marker);
}

for (const helper of [
  "fetchCrmActivities",
  "createCrmActivity",
  "patchCrmActivity",
  "fetchCrmProposals",
  "createCrmProposal",
  "patchCrmProposal",
  "fetchCrmClientSettings",
  "patchCrmClientSetting",
  "fetchFinanceInvoices",
  "fetchFinanceArAging"
]) {
  requireText(apiClientPath, helper);
  requireText(clientsSurfacePath, helper);
}

assert.doesNotMatch(read(clientsSurfacePath), /PlannedClientSection|data-client-planned-section|메뉴를 준비 중입니다|meta="준비 중"/);
requireText(crmTestPath, "G6 Client planned sections expose activity proposal and settings routes with guarded writes");
requireText(proofScriptPath, "activity-create-session-audit");
requireText(proofScriptPath, "proposal-provider-blocked-session-audit");
requireText(proofScriptPath, "settings-policy-session-admin-audit");

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.client_sections_proof.v0.1");
assert.deepEqual(proof.tuw_ids, [
  "LCX-VLTUI-05.01",
  "LCX-VLTUI-05.02",
  "LCX-VLTUI-05.03",
  "LCX-VLTUI-05.04",
  "LCX-VLTUI-05.05",
  "LCX-VLTUI-05.06",
  "LCX-VLTUI-05.07"
]);
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.planned_client_section_count, 0);
assert.equal(proof.boundary.synthetic_route_interception_only, true);
assert.equal(proof.boundary.provider_send_executed, false);
assert.equal(proof.boundary.payment_or_invoice_send_executed, false);
assert.equal(proof.boundary.automatic_identity_merge_executed, false);
assert.equal(proof.boundary.customer_data_write_executed, false);
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);
assert.equal(proof.boundary.owner_final_approval, false);

const proofCase = proof.cases[0];
assert.equal(proofCase.id, "client-planned-section-implementation");
assert.equal(proofCase.passed, true);
assert.equal(proofCase.page_errors.length, 0);
const expectedChecks = [
  "activity-section-connected",
  "activity-create-session-audit",
  "activity-patch-session-audit",
  "contract-section-connected",
  "proposal-create-session-audit",
  "proposal-provider-blocked-session-audit",
  "relationship-merge-route-backed",
  "conflict-clearance-route-backed",
  "billing-provider-blocked-visible",
  "settings-policy-session-admin-audit",
  "no-forbidden-session-or-secret-text",
  "no-page-errors"
];
assert.deepEqual(proofCase.checks.map((item) => item.id), expectedChecks);
for (const check of proofCase.checks) assert.equal(check.passed, true, `${check.id} failed`);
for (const kind of [
  "activity_create",
  "activity_patch",
  "proposal_create",
  "proposal_provider_blocked",
  "merge_create",
  "conflict_check",
  "clearance_token",
  "client_setting_patch"
]) {
  assert.ok(proofCase.writes.some((write) => write.kind === kind), `${kind} write missing`);
}
for (const write of proofCase.writes) {
  assert.equal(write.principal.user_id, "user_lcx_vltui_session");
  assert.equal(write.principal.tenant_id, "tenant_cmp_g6_synthetic");
  assert.equal(write.principal.session_principal_source, "desktop_web_session_envelope");
}

const receipt = readJson(receiptPath);
assert.equal(receipt.status, "client-sections-browser-verified");
assert.deepEqual(receipt.implemented_tuws, proof.tuw_ids);
assert.equal(receipt.browser_proof.verdict, "PASS");
assert.equal(receipt.claim_boundary.production_ready, false);
assert.equal(receipt.claim_boundary.public_release, false);
assert.equal(receipt.claim_boundary.production_go_live, false);
assert.equal(receipt.claim_boundary.owner_final_approval, false);
assert.equal(receipt.claim_boundary.provider_send_executed, false);
assert.equal(receipt.claim_boundary.payment_or_invoice_send_executed, false);
assert.equal(receipt.claim_boundary.automatic_identity_merge_executed, false);

const mainReceipt = readJson(mainReceiptPath);
for (const tuw of proof.tuw_ids) {
  assert.ok(mainReceipt.opened_tuws.includes(tuw), `${tuw} missing from opened_tuws`);
}
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-05.01~05.07" && item.status === "client-sections-browser-verified"));
assert.ok(Array.isArray(mainReceipt.next_slice), "main receipt next_slice must be an array");
assert.notDeepEqual(mainReceipt.next_slice, proof.tuw_ids);

const gapLedger = readJson(gapLedgerPath);
const clientSectionRows = gapLedger.rows.filter((row) => String(row.section ?? "").startsWith("client-"));
for (const section of ["client-activities", "client-contracts", "client-relationships", "client-conflict", "client-billing", "client-settings"]) {
  const row = clientSectionRows.find((item) => item.section === section);
  assert.ok(row, `${section} gap ledger row missing`);
  assert.notEqual(row.status, "planned", `${section} must not remain planned`);
}

for (const tuw of proof.tuw_ids) {
  requireText(planPath, `| ${tuw} | implemented |`);
}
requireText(planPath, "| LCX-VLTUI-05 | Client planned-section implementation | implemented |");

console.log(JSON.stringify({
  verdict: "PASS",
  tuw_ids: proof.tuw_ids,
  proof: proofPath,
  receipt: receiptPath
}, null, 2));
