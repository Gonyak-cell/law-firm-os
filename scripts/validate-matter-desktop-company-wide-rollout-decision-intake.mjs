#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const INTAKE_JSON_PATH = "docs/desktop/matter-desktop-company-wide-rollout-decision-intake-2026-06-30.json";
const INTAKE_MD_PATH = "docs/desktop/matter-desktop-company-wide-rollout-decision-intake-2026-06-30.md";
const GO_LIVE_RECEIPT_PATH = "docs/desktop/matter-desktop-production-go-live-receipt-2026-06-30.json";
const GO_LIVE_VALIDATION_PATH = "docs/desktop/matter-desktop-production-go-live-receipt-validation.json";
const NONWINDOWS_CLOSEOUT_PATH = "docs/desktop/matter-desktop-nonwindows-execution-closeout-receipt-2026-06-30.json";
const NONWINDOWS_CLOSEOUT_VALIDATION_PATH = "docs/desktop/matter-desktop-nonwindows-execution-closeout-validation.json";
const VAULT_EXECUTION_PATH = "docs/desktop/matter-desktop-vault-document-writes-execution-receipt-2026-06-30.json";
const MIGRATION_EXECUTION_PATH = "docs/desktop/matter-desktop-real-client-data-migration-execution-receipt-2026-06-30.json";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const HRX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/hrx-production-smoke-2026-06-30.json";
const LCX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-company-wide-rollout-decision-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-company-wide-rollout-decision-validation.md";

const EXPECTED_RELEASE = {
  tag: "matter-desktop-v0.1.0-lcx-vltui-20260630",
  url: "https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.0-lcx-vltui-20260630",
  target_commitish: "ef493451a1d070412d3d24d4474493afbca3f1a4",
  release_channel: "github_prerelease_lcx_vltui_desktop"
};
const EXPECTED_RUNTIME = {
  production_web_base_url: "https://d2mthcc8vp3cr2.cloudfront.net",
  production_api_lambda: "matter-lawos-api-prod",
  deployment_commit: "0ff79586d887a950200ab091a5864a20c174bdf9"
};
const REQUIRED_DECISION_FIELDS = [
  "decision_maker",
  "decision",
  "rollout_scope",
  "user_population",
  "operational_workflows",
  "support_owner",
  "communications_owner",
  "rollback_plan_ref",
  "start_window",
  "decision_at",
  "approval_signature_ref",
  "recorded_by_human"
];
const ALLOWED_DECISIONS = ["approve_company_wide_rollout", "reject_company_wide_rollout", "request_changes"];
const FALSE_BOUNDARY_FIELDS = [
  "company_wide_rollout_decision_recorded",
  "company_wide_rollout_approved",
  "company_wide_rollout_executed",
  "public_release_approved",
  "external_pilot_distribution_approved",
  "windows_authenticode_signing_approved",
  "vault_document_writes_outside_named_scope_approved",
  "real_client_data_migration_outside_named_scope_approved",
  "unbounded_bulk_client_data_migration_approved"
];
const PLACEHOLDER_PATTERN = /<[^>]*>|\bTBD\b|\bTODO\b|placeholder|pending owner|pending approval/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function sameSet(left, right) {
  return JSON.stringify([...(new Set(left ?? []))].sort()) === JSON.stringify([...(new Set(right ?? []))].sort());
}

function renderMarkdown(report) {
  const lines = [
    "# matter Desktop Company-Wide Rollout Decision Validation",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    "## Summary",
    ""
  ];
  for (const [key, value] of Object.entries(report.summary)) lines.push(`- ${key}: ${value}`);
  lines.push("", "## Findings", "");
  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    lines.push("| Severity | Code | Message |");
    lines.push("| --- | --- | --- |");
    for (const finding of report.findings) lines.push(`| ${finding.severity} | ${finding.code} | ${markdownCell(finding.message)} |`);
  }
  lines.push("", "## Boundary", "");
  lines.push("- This validation opens the company-wide internal rollout decision gate only.");
  lines.push("- It does not approve or execute company-wide rollout.");
  lines.push("- Public release, external pilot distribution, Windows Authenticode signing, writes outside the named scope, migration outside the named scope, and unbounded bulk migration remain false.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [
  INTAKE_JSON_PATH,
  INTAKE_MD_PATH,
  GO_LIVE_RECEIPT_PATH,
  GO_LIVE_VALIDATION_PATH,
  NONWINDOWS_CLOSEOUT_PATH,
  NONWINDOWS_CLOSEOUT_VALIDATION_PATH,
  VAULT_EXECUTION_PATH,
  MIGRATION_EXECUTION_PATH,
  RELEASE_RECEIPT_PATH,
  HRX_SMOKE_PATH,
  LCX_SMOKE_PATH
]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required source reference is missing.", { path });
}

const intake = existsSync(INTAKE_JSON_PATH) ? readJson(INTAKE_JSON_PATH) : {};
const intakeMarkdown = existsSync(INTAKE_MD_PATH) ? readText(INTAKE_MD_PATH) : "";
const goLiveReceipt = existsSync(GO_LIVE_RECEIPT_PATH) ? readJson(GO_LIVE_RECEIPT_PATH) : {};
const goLiveValidation = existsSync(GO_LIVE_VALIDATION_PATH) ? readJson(GO_LIVE_VALIDATION_PATH) : {};
const nonWindowsCloseout = existsSync(NONWINDOWS_CLOSEOUT_PATH) ? readJson(NONWINDOWS_CLOSEOUT_PATH) : {};
const nonWindowsValidation = existsSync(NONWINDOWS_CLOSEOUT_VALIDATION_PATH) ? readJson(NONWINDOWS_CLOSEOUT_VALIDATION_PATH) : {};
const vaultExecution = existsSync(VAULT_EXECUTION_PATH) ? readJson(VAULT_EXECUTION_PATH) : {};
const migrationExecution = existsSync(MIGRATION_EXECUTION_PATH) ? readJson(MIGRATION_EXECUTION_PATH) : {};
const releaseReceipt = existsSync(RELEASE_RECEIPT_PATH) ? readJson(RELEASE_RECEIPT_PATH) : {};
const hrxSmoke = existsSync(HRX_SMOKE_PATH) ? readJson(HRX_SMOKE_PATH) : {};
const lcxSmoke = existsSync(LCX_SMOKE_PATH) ? readJson(LCX_SMOKE_PATH) : {};

if (intake.schema_version !== "law-firm-os.matter-desktop-company-wide-rollout-decision-intake.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected company-wide rollout decision intake schema version.", {
    actual: intake.schema_version
  });
}
if (intake.status !== "pending_company_wide_rollout_decision" || intake.decision_gate !== "company_wide_rollout") {
  addFinding(findings, "P1", "INTAKE_STATUS", "Company-wide rollout gate must remain a pending decision intake.", {
    status: intake.status,
    decision_gate: intake.decision_gate
  });
}
if (intake.tracker?.owner_decision_issue !== "https://github.com/Gonyak-cell/law-firm-os/issues/165") {
  addFinding(findings, "P1", "TRACKER_ISSUE", "Company-wide rollout intake must point to the owner decision tracker issue.", {
    actual: intake.tracker?.owner_decision_issue
  });
}
for (const [key, expected] of Object.entries(EXPECTED_RELEASE)) {
  if (intake.release?.[key] !== expected) addFinding(findings, "P1", `RELEASE_${key}`, "Release field drifted.", { expected, actual: intake.release?.[key] });
}
if (intake.release?.is_prerelease !== true) {
  addFinding(findings, "P1", "RELEASE_PRERELEASE", "Company-wide rollout intake must stay tied to the prerelease lane until a separate public release decision exists.", {
    actual: intake.release?.is_prerelease
  });
}
for (const [key, expected] of Object.entries(EXPECTED_RUNTIME)) {
  if (intake.runtime_target?.[key] !== expected) addFinding(findings, "P1", `RUNTIME_${key}`, "Runtime target drifted.", { expected, actual: intake.runtime_target?.[key] });
}

if (goLiveValidation.verdict !== "PASS" || goLiveValidation.summary?.named_lane_runtime_go_live !== true) {
  addFinding(findings, "P1", "GO_LIVE_VALIDATION", "Named-lane production go-live validation must pass before company-wide rollout intake.", {
    verdict: goLiveValidation.verdict,
    summary: goLiveValidation.summary
  });
}
if (
  goLiveReceipt.status !== "production_go_live_receipt_committed" ||
  goLiveReceipt.boundary?.actual_launch_go_live_completed_for_lcx_vltui_desktop_prerelease_lane !== true ||
  goLiveReceipt.boundary?.actual_launch_go_live_completed_for_company_wide_rollout !== false ||
  goLiveReceipt.boundary?.company_wide_production_go_live_approved !== false
) {
  addFinding(findings, "P1", "GO_LIVE_RECEIPT_BOUNDARY", "Production go-live receipt must be named-lane only and keep company-wide rollout false.", {
    status: goLiveReceipt.status,
    boundary: goLiveReceipt.boundary
  });
}
if (nonWindowsValidation.verdict !== "PASS" || nonWindowsValidation.summary?.vault_documents_written !== 1 || nonWindowsValidation.summary?.real_client_rows_migrated !== 1) {
  addFinding(findings, "P1", "NONWINDOWS_CLOSEOUT_VALIDATION", "Non-Windows execution closeout validation must pass with bounded execution counts.", {
    verdict: nonWindowsValidation.verdict,
    summary: nonWindowsValidation.summary
  });
}
if (nonWindowsCloseout.status !== "approved_scope_execution_verified" || nonWindowsCloseout.summary?.rollback_possible !== true) {
  addFinding(findings, "P1", "NONWINDOWS_CLOSEOUT_RECEIPT", "Non-Windows closeout receipt must verify approved-scope execution and rollback target identification.", {
    status: nonWindowsCloseout.status,
    summary: nonWindowsCloseout.summary
  });
}
if (vaultExecution.status !== "vault_document_writes_executed" || vaultExecution.counts?.vault_documents_written !== 1 || vaultExecution.counts?.max_document_count !== 10) {
  addFinding(findings, "P1", "VAULT_EXECUTION", "Vault document write execution must stay bounded to one document within the approved limit.", {
    status: vaultExecution.status,
    counts: vaultExecution.counts
  });
}
if (migrationExecution.status !== "real_client_data_migration_executed" || migrationExecution.counts?.real_client_rows_migrated !== 1 || migrationExecution.counts?.migration_execution_receipt_present !== true) {
  addFinding(findings, "P1", "MIGRATION_EXECUTION", "Real client data migration execution must stay bounded to one named-lane row.", {
    status: migrationExecution.status,
    counts: migrationExecution.counts
  });
}
if (releaseReceipt.status !== "github_prerelease_published" || releaseReceipt.release?.is_prerelease !== true || releaseReceipt.non_claims?.public_release !== false) {
  addFinding(findings, "P1", "RELEASE_RECEIPT", "Release receipt must remain a GitHub prerelease without public release claim.", {
    status: releaseReceipt.status,
    release: releaseReceipt.release,
    non_claims: releaseReceipt.non_claims
  });
}
if (hrxSmoke.verdict !== "PASS" || lcxSmoke.verdict !== "PASS") {
  addFinding(findings, "P1", "PRODUCTION_SMOKE", "HRX and LCX VLTUI production smoke receipts must pass.", {
    hrx_verdict: hrxSmoke.verdict,
    lcx_verdict: lcxSmoke.verdict
  });
}
if (lcxSmoke.boundary?.company_wide_go_live_claim !== false || lcxSmoke.boundary?.real_client_data_used !== false) {
  addFinding(findings, "P1", "LCX_SMOKE_BOUNDARY", "LCX smoke must preserve company-wide and real-client non-claims.", {
    boundary: lcxSmoke.boundary
  });
}

const decisionRequest = intake.decision_request ?? {};
if (decisionRequest.response_status !== "pending_company_wide_rollout_decision" || decisionRequest.current_blocker !== "company_wide_rollout_decision_not_recorded") {
  addFinding(findings, "P1", "DECISION_REQUEST_STATUS", "Decision request must remain blocked on a human company-wide rollout decision.", {
    decision_request: decisionRequest
  });
}
if (!sameSet(decisionRequest.required_decision_fields, REQUIRED_DECISION_FIELDS)) {
  addFinding(findings, "P1", "REQUIRED_DECISION_FIELDS", "Required decision fields drifted.", {
    expected: REQUIRED_DECISION_FIELDS,
    actual: decisionRequest.required_decision_fields
  });
}
if (!sameSet(decisionRequest.allowed_decisions, ALLOWED_DECISIONS)) {
  addFinding(findings, "P1", "ALLOWED_DECISIONS", "Allowed decisions drifted.", {
    expected: ALLOWED_DECISIONS,
    actual: decisionRequest.allowed_decisions
  });
}
if (intake.boundary?.named_lane_runtime_go_live_recorded !== true || intake.boundary?.named_lane_execution_closeout_verified !== true || intake.boundary?.ready_for_company_wide_rollout_decision_input !== true) {
  addFinding(findings, "P1", "BOUNDARY_READY_STATE", "Company-wide rollout intake must record readiness without approval.", {
    boundary: intake.boundary
  });
}
for (const key of FALSE_BOUNDARY_FIELDS) {
  if (intake.boundary?.[key] !== false) {
    addFinding(findings, "P0", `BOUNDARY_${key}`, "Company-wide rollout intake must not approve or execute out-of-scope actions.", {
      expected: false,
      actual: intake.boundary?.[key]
    });
  }
}
if (PLACEHOLDER_PATTERN.test(intakeMarkdown)) {
  addFinding(findings, "P1", "MARKDOWN_PLACEHOLDER", "Company-wide rollout intake markdown contains placeholder text.", {});
}
for (const phrase of [
  "Status: company-wide-rollout-decision-pending",
  "Company-wide rollout approved: false",
  "Company-wide rollout executed: false",
  "Public release: false",
  "Windows Authenticode signing: false"
]) {
  if (!intakeMarkdown.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_BOUNDARY_MISSING", "Company-wide rollout intake markdown is missing a required boundary phrase.", { phrase });
}

const report = {
  schema_version: "law-firm-os.matter-desktop-company-wide-rollout-decision.validation.v0.1",
  generated_at: "2026-06-30T07:16:32Z",
  source_refs: [
    INTAKE_JSON_PATH,
    INTAKE_MD_PATH,
    GO_LIVE_RECEIPT_PATH,
    GO_LIVE_VALIDATION_PATH,
    NONWINDOWS_CLOSEOUT_PATH,
    NONWINDOWS_CLOSEOUT_VALIDATION_PATH,
    VAULT_EXECUTION_PATH,
    MIGRATION_EXECUTION_PATH,
    RELEASE_RECEIPT_PATH,
    HRX_SMOKE_PATH,
    LCX_SMOKE_PATH
  ],
  verdict: findings.length === 0 ? "PASS" : "FAIL",
  summary: {
    decision_gate: intake.decision_gate ?? null,
    tracker_issue: intake.tracker?.owner_decision_issue ?? null,
    named_lane_runtime_go_live_recorded: intake.boundary?.named_lane_runtime_go_live_recorded === true,
    named_lane_execution_closeout_verified: intake.boundary?.named_lane_execution_closeout_verified === true,
    ready_for_company_wide_rollout_decision_input: intake.boundary?.ready_for_company_wide_rollout_decision_input === true,
    company_wide_rollout_decision_recorded: intake.boundary?.company_wide_rollout_decision_recorded === true,
    company_wide_rollout_approved: intake.boundary?.company_wide_rollout_approved === true,
    company_wide_rollout_executed: intake.boundary?.company_wide_rollout_executed === true,
    public_release_approved: intake.boundary?.public_release_approved === true,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(report.verdict, "PASS", "matter desktop company-wide rollout decision validation failed");
console.log(JSON.stringify(report, null, 2));
