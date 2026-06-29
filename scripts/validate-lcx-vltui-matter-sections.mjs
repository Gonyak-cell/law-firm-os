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
const mattersSurfacePath = "apps/web/src/components/MattersSurface.jsx";
const importPanelPath = "apps/web/src/components/ImportDataMappingPanel.jsx";
const uiTestPath = "apps/web/test/ui-regression.test.mjs";
const proofScriptPath = "scripts/run-lcx-vltui-matter-sections-proof.mjs";
const validatorPath = "scripts/validate-lcx-vltui-matter-sections.mjs";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-matter-sections-proof.json";
const receiptPath = "docs/lazycodex/lcx-vltui-06-matter-sections-receipt-2026-06-29.json";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const gapLedgerPath = "docs/lazycodex/lcx-vault-app-current-ui-gap-ledger-2026-06-29.json";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";

for (const path of [
  packagePath,
  apiClientPath,
  mattersSurfacePath,
  importPanelPath,
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
assert.equal(packageJson.scripts?.["lcx:vltui:matter-sections:proof"], "node scripts/run-lcx-vltui-matter-sections-proof.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:matter-sections:validate"], "node scripts/validate-lcx-vltui-matter-sections.mjs");

for (const marker of [
  "data-lcx-vltui-06-connected-section={config.marker}",
  "data-lcx-vltui-06-route-backed=\"true\"",
  "data-lcx-vltui-06-lifecycle-boundary=\"true\"",
  "data-lcx-vltui-06-vault-mutation-blocked=\"true\"",
  "data-lcx-vltui-06-activity-type={activityType}",
  "data-lcx-vltui-06-vault-backed-shortcuts={config.marker}",
  "data-lcx-vltui-06-approval-boundary={marker}",
  "data-lcx-vltui-06-client-requests-connected=\"true\"",
  "data-lcx-vltui-06-meetings-connected=\"true\"",
  "data-lcx-vltui-06-expenses-connected=\"true\"",
  "data-lcx-vltui-06-search-risk={marker}",
  "data-lcx-vltui-06-provider-credentials-visible=\"false\"",
  "data-lcx-vltui-06-integrations-settings={marker}",
  "data-lcx-vltui-06-import-lifecycle=\"dry-run-guarded-execute\"",
  "data-lcx-vltui-06-import-execute-blocked=\"true\""
]) {
  requireText(mattersSurfacePath, marker);
}
requireText(importPanelPath, "data-lcx-vltui-06-import-connected={surface === \"matter\" ? \"true\" : undefined}");
for (const marker of [
  "data-lcx-vltui-06-connected-section",
  "data-lcx-vltui-06-lifecycle-boundary",
  "data-lcx-vltui-06-vault-mutation-blocked",
  "data-lcx-vltui-06-activity-type",
  "data-lcx-vltui-06-vault-backed-shortcuts",
  "data-lcx-vltui-06-approval-boundary",
  "data-lcx-vltui-06-client-requests-connected",
  "data-lcx-vltui-06-meetings-connected",
  "data-lcx-vltui-06-expenses-connected",
  "data-lcx-vltui-06-search-risk",
  "data-lcx-vltui-06-integrations-settings",
  "data-lcx-vltui-06-import-lifecycle",
  "data-lcx-vltui-06-import-connected"
]) {
  requireText(uiTestPath, marker);
}

assert.doesNotMatch(read(mattersSurfacePath), /MATTER_PLANNED_SECTIONS|PlannedMatterSection|data-matter-planned-section|메뉴를 준비 중입니다|meta="준비 중"/);

for (const helper of [
  "recordActionActorDomain",
  "actorRefForDomain(recordActionActorDomain(objectName)",
  "actorRefForDomain(\"matter\", FINANCE_PRINCIPAL.user_id)",
  "createMatterActivity",
  "patchMatterActivity",
  "createMatterCalendarEvent",
  "patchMatterCalendarEvent",
  "createMatterChannelMessage",
  "syncMatterChannelProvider",
  "createFinanceTimeEntry",
  "generateFinanceWip",
  "importFinancePayment"
]) {
  requireText(apiClientPath, helper);
}

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.matter_sections_proof.v0.1");
assert.deepEqual(proof.tuw_ids, [
  "LCX-VLTUI-06.01",
  "LCX-VLTUI-06.02",
  "LCX-VLTUI-06.03",
  "LCX-VLTUI-06.04",
  "LCX-VLTUI-06.05",
  "LCX-VLTUI-06.06",
  "LCX-VLTUI-06.07",
  "LCX-VLTUI-06.08",
  "LCX-VLTUI-06.09",
  "LCX-VLTUI-06.10",
  "LCX-VLTUI-06.11"
]);
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.synthetic_route_interception_only, true);
assert.equal(proof.boundary.planned_matter_section_count, 0);
assert.equal(proof.boundary.provider_send_executed, false);
assert.equal(proof.boundary.vault_document_mutation_executed, false);
assert.equal(proof.boundary.import_execute_mutation_executed, false);
assert.equal(proof.boundary.payment_or_invoice_send_executed, false);
assert.equal(proof.boundary.owner_final_approval, false);
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);

const proofCase = proof.cases[0];
assert.equal(proofCase.id, "matter-planned-section-implementation");
assert.equal(proofCase.passed, true);
assert.equal(proofCase.page_errors.length, 0);
const expectedChecks = [
  "all-matter-sections-connected",
  "lifecycle-closeout-archive-boundary",
  "task-note-create-update-audit",
  "vault-evidence-template-shortcut",
  "seal-approval-owner-provider-blocked",
  "meeting-announcement-calendar-channel",
  "expense-finance-boundary-audited",
  "search-risk-permission-scoped",
  "integration-settings-no-credentials",
  "import-dry-run-guarded-execute",
  "no-forbidden-session-secret-or-release-claim",
  "no-page-errors"
];
assert.deepEqual(proofCase.checks.map((item) => item.id), expectedChecks);
for (const check of proofCase.checks) assert.equal(check.passed, true, `${check.id} failed`);
assert.equal(proofCase.sections.length, 17);
for (const section of [
  "matter-closeout",
  "matter-archive",
  "matter-tasks",
  "matter-notes",
  "matter-evidence",
  "matter-templates",
  "matter-seal",
  "matter-meetings",
  "matter-announcements",
  "matter-client-requests",
  "matter-approvals",
  "matter-expenses",
  "matter-search",
  "matter-risk",
  "matter-integrations",
  "matter-settings",
  "matter-import"
]) {
  assert.ok(proofCase.sections.some((item) => item.section === section && item.connected === true), `${section} missing from browser proof`);
}
for (const kind of [
  "lifecycle_closeout",
  "activity_create",
  "activity_patch",
  "calendar_create",
  "deadline_change_request",
  "deadline_confirm",
  "channel_message",
  "provider_blocked",
  "owner_blocked",
  "risk_field_update",
  "finance_time_entry",
  "finance_wip",
  "finance_payment",
  "import_job",
  "import_source",
  "import_mapping",
  "import_dry_run",
  "import_execute_blocked",
  "import_rollback"
]) {
  assert.ok(proofCase.writes.some((write) => write.kind === kind), `${kind} write missing`);
}
for (const write of proofCase.writes.filter((write) => !write.kind.startsWith("finance_"))) {
  assert.equal(write.principal.user_id, "user_lcx_vltui_session");
  assert.equal(write.principal.tenant_id, "tenant_rp05_synthetic");
  assert.equal(write.principal.session_principal_source, "desktop_web_session_envelope");
  assert.equal(write.actor_id, "user_lcx_vltui_session");
}
for (const write of proofCase.writes.filter((write) => write.kind.startsWith("finance_"))) {
  assert.equal(write.actor_id, "user_lcx_vltui_session");
  assert.equal(write.audit_hint_ref, "ui_cmp_g7_finance_probe");
}

const receipt = readJson(receiptPath);
assert.equal(receipt.status, "matter-sections-browser-verified");
assert.deepEqual(receipt.implemented_tuws, proof.tuw_ids);
assert.equal(receipt.browser_proof.verdict, "PASS");
assert.equal(receipt.claim_boundary.synthetic_route_interception_only, true);
assert.equal(receipt.claim_boundary.provider_send_executed, false);
assert.equal(receipt.claim_boundary.vault_document_mutation_executed, false);
assert.equal(receipt.claim_boundary.import_execute_mutation_executed, false);
assert.equal(receipt.claim_boundary.payment_or_invoice_send_executed, false);
assert.equal(receipt.claim_boundary.production_ready, false);
assert.equal(receipt.claim_boundary.public_release, false);
assert.equal(receipt.claim_boundary.production_go_live, false);
assert.equal(receipt.claim_boundary.owner_final_approval, false);

const mainReceipt = readJson(mainReceiptPath);
for (const tuw of proof.tuw_ids) {
  assert.ok(mainReceipt.opened_tuws.includes(tuw), `${tuw} missing from opened_tuws`);
}
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-06.01~06.11" && item.status === "matter-sections-browser-verified"));
const closeoutComplete = mainReceipt.goal_status === "complete" &&
  mainReceipt.next_slice.length === 0 &&
  mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-90.01~90.07" && item.status === "closeout-browser-verified");
assert.ok(
  JSON.stringify(mainReceipt.next_slice) === JSON.stringify([
    "LCX-VLTUI-90.01",
    "LCX-VLTUI-90.02",
    "LCX-VLTUI-90.03",
    "LCX-VLTUI-90.04",
    "LCX-VLTUI-90.05",
    "LCX-VLTUI-90.06",
    "LCX-VLTUI-90.07"
  ]) ||
  closeoutComplete,
  "main receipt should point to LCX-VLTUI-90 or be closed out"
);

const gapLedger = readJson(gapLedgerPath);
const matterSectionRows = gapLedger.rows.filter((row) => String(row.target_tuw ?? "").startsWith("LCX-VLTUI-06"));
assert.equal(matterSectionRows.length, 17);
for (const row of matterSectionRows) {
  assert.equal(row.status, "implemented", `${row.section} status must be implemented`);
  assert.notEqual(row.current_state, "planned-placeholder", `${row.section} must not remain planned-placeholder`);
  assert.equal(row.evidence, proofPath, `${row.section} evidence must point to proof`);
}

for (const tuw of proof.tuw_ids) requireText(planPath, `| ${tuw} | implemented |`);
requireText(planPath, "| LCX-VLTUI-06 | Matter planned-section implementation | implemented |");
requireText(planPath, "LCX-VLTUI-06.01 through LCX-VLTUI-06.11: Matter planned-section implementation. Completed locally by `docs/lazycodex/lcx-vltui-06-matter-sections-receipt-2026-06-29.json`.");

console.log(JSON.stringify({
  verdict: "PASS",
  tuw_ids: proof.tuw_ids,
  proof: proofPath,
  receipt: receiptPath
}, null, 2));
