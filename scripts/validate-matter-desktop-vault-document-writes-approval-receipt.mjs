#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_JSON_PATH = "docs/desktop/matter-desktop-vault-document-writes-approval-receipt-2026-06-30.json";
const RECEIPT_MD_PATH = "docs/desktop/matter-desktop-vault-document-writes-approval-receipt-2026-06-30.md";
const ROLLBACK_PLAN_PATH = "docs/desktop/matter-desktop-vault-document-writes-rollback-plan-2026-06-30.md";
const DECISION_INTAKE_PATH = "docs/desktop/matter-desktop-vault-document-writes-decision-intake-2026-06-30.json";
const GO_LIVE_RECEIPT_PATH = "docs/desktop/matter-desktop-production-go-live-receipt-2026-06-30.json";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const LCX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-vault-document-writes-approval-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-vault-document-writes-approval-validation.md";

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
const EXPECTED_SIGNATURE_REF = "approval:vault-document-writes-lcx-vltui-2026-06-30-1310-kst";
const PLACEHOLDER_PATTERN = /<[^>]*>|\bTBD\b|\bTODO\b|placeholder|pending owner|pending approval/i;
const AGENT_INFERENCE_PATTERN = /agent-inferred|codex-approved|codex approval|synthetic approval|simulated owner/i;

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

function renderMarkdown(report) {
  const lines = [
    "# matter Desktop Vault Document Writes Approval Validation",
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
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${markdownCell(finding.message)} |`);
    }
  }
  lines.push("", "## Boundary", "");
  lines.push("- This validation records bounded Vault document write approval only.");
  lines.push("- It does not record that any Vault upload has already executed.");
  lines.push("- Real client data migration, public release, external pilot distribution, company-wide rollout, and Windows Authenticode signing remain false.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [
  RECEIPT_JSON_PATH,
  RECEIPT_MD_PATH,
  ROLLBACK_PLAN_PATH,
  DECISION_INTAKE_PATH,
  GO_LIVE_RECEIPT_PATH,
  RELEASE_RECEIPT_PATH,
  LCX_SMOKE_PATH
]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required source reference is missing.", { path });
}

const receipt = existsSync(RECEIPT_JSON_PATH) ? readJson(RECEIPT_JSON_PATH) : {};
const receiptMarkdown = existsSync(RECEIPT_MD_PATH) ? readText(RECEIPT_MD_PATH) : "";
const rollbackPlan = existsSync(ROLLBACK_PLAN_PATH) ? readText(ROLLBACK_PLAN_PATH) : "";
const intake = existsSync(DECISION_INTAKE_PATH) ? readJson(DECISION_INTAKE_PATH) : {};
const goLiveReceipt = existsSync(GO_LIVE_RECEIPT_PATH) ? readJson(GO_LIVE_RECEIPT_PATH) : {};
const releaseReceipt = existsSync(RELEASE_RECEIPT_PATH) ? readJson(RELEASE_RECEIPT_PATH) : {};
const lcxSmoke = existsSync(LCX_SMOKE_PATH) ? readJson(LCX_SMOKE_PATH) : {};
const decision = receipt.decision ?? {};

if (receipt.schema_version !== "law-firm-os.matter-desktop-vault-document-writes-approval-receipt.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected Vault document writes approval receipt schema version.", {
    actual: receipt.schema_version
  });
}
if (receipt.status !== "vault_document_writes_approved") {
  addFinding(findings, "P1", "RECEIPT_STATUS", "Vault document writes receipt must be approved.", { actual: receipt.status });
}
for (const [key, expected] of Object.entries({
  decision_maker: "Jiwon Suh, Product Owner",
  decision: "approve_vault_document_writes",
  source_system: "Law Firm OS Matter app API and LCX VLTUI desktop bridge",
  max_document_count: 10,
  audit_log_location: RECEIPT_JSON_PATH,
  rollback_plan_ref: ROLLBACK_PLAN_PATH,
  decision_at: "2026-06-30T04:10:00Z",
  approval_signature_ref: EXPECTED_SIGNATURE_REF,
  recorded_by_human: true
})) {
  if (decision[key] !== expected) {
    addFinding(findings, "P1", `DECISION_${key}`, "Decision field does not match the owner-supplied approval.", {
      expected,
      actual: decision[key]
    });
  }
}
for (const key of ["write_scope", "vault_target"]) {
  if (PLACEHOLDER_PATTERN.test(String(decision[key] ?? ""))) {
    addFinding(findings, "P1", "DECISION_PLACEHOLDER", "Decision field contains placeholder text.", { key });
  }
  if (AGENT_INFERENCE_PATTERN.test(String(decision[key] ?? ""))) {
    addFinding(findings, "P0", "AGENT_INFERRED_DECISION", "Decision field appears to rely on agent-inferred approval evidence.", { key });
  }
}
if (receipt.source?.source_ref !== EXPECTED_SIGNATURE_REF || receipt.source?.recorded_by_human !== true) {
  addFinding(findings, "P1", "SOURCE_REF", "Receipt must preserve the human owner approval source ref.", { source: receipt.source });
}
for (const [key, expected] of Object.entries(EXPECTED_RELEASE)) {
  if (receipt.release?.[key] !== expected) {
    addFinding(findings, "P1", `RELEASE_${key}`, "Release field does not match the LCX VLTUI desktop release.", {
      expected,
      actual: receipt.release?.[key]
    });
  }
}
if (receipt.release?.is_prerelease !== true || releaseReceipt.release?.is_prerelease !== true) {
  addFinding(findings, "P1", "PRERELEASE_BOUNDARY", "Vault document writes approval must stay tied to the prerelease lane.", {
    receipt_release: receipt.release,
    release_receipt: releaseReceipt.release
  });
}
for (const [key, expected] of Object.entries(EXPECTED_RUNTIME)) {
  if (receipt.runtime_target?.[key] !== expected) {
    addFinding(findings, "P1", `RUNTIME_${key}`, "Runtime target field is missing or unexpected.", {
      expected,
      actual: receipt.runtime_target?.[key]
    });
  }
}
if (intake.status !== "owner_decision_recorded" || intake.approval_receipt !== RECEIPT_JSON_PATH) {
  addFinding(findings, "P1", "INTAKE_NOT_RECORDED", "Decision intake must point at the approval receipt.", {
    status: intake.status,
    approval_receipt: intake.approval_receipt
  });
}
if (goLiveReceipt.scope?.real_client_data_migration_approved !== false || goLiveReceipt.scope?.public_release_approved !== false) {
  addFinding(findings, "P0", "GO_LIVE_SCOPE_DRIFT", "Go-live receipt must keep adjacent scopes false.", { scope: goLiveReceipt.scope });
}
if (lcxSmoke.verdict !== "PASS" || lcxSmoke.boundary?.real_client_data_used !== false) {
  addFinding(findings, "P1", "LCX_SMOKE_BOUNDARY", "LCX production bridge smoke must pass without real client data.", {
    verdict: lcxSmoke.verdict,
    boundary: lcxSmoke.boundary
  });
}
for (const [key, expected] of Object.entries({
  approves_vault_document_writes: true,
  approves_bounded_bridge_write_verification: true,
  vault_document_write_execution_authorized: true,
  max_document_count: 10,
  public_release_approved: false,
  company_wide_production_rollout_approved: false,
  external_pilot_distribution_approved: false,
  windows_authenticode_signing_approved: false,
  real_client_data_migration_approved: false,
  write_outside_named_scope_approved: false
})) {
  if (receipt.scope?.[key] !== expected) {
    addFinding(findings, expected === false ? "P0" : "P1", `SCOPE_${key}`, "Receipt scope field drifted.", {
      expected,
      actual: receipt.scope?.[key]
    });
  }
}
for (const [key, expected] of Object.entries({
  vault_document_writes_approved: true,
  vault_document_write_execution_authorized_by_this_receipt: true,
  vault_document_uploads_executed_by_this_receipt: false,
  max_document_count: 10,
  real_client_data_migration_approved: false,
  real_client_data_used_by_this_receipt: false,
  public_release_approved: false,
  company_wide_production_rollout_approved: false,
  external_pilot_distribution_approved: false,
  windows_authenticode_signing_approved: false,
  write_outside_named_scope_approved: false
})) {
  if (receipt.boundary?.[key] !== expected) {
    addFinding(findings, expected === false ? "P0" : "P1", `BOUNDARY_${key}`, "Receipt boundary field drifted.", {
      expected,
      actual: receipt.boundary?.[key]
    });
  }
}
for (const phrase of [
  "Status: vault-document-writes-approved",
  "Vault document writes approved: true",
  "Vault document uploads executed by this receipt: false",
  "Real client data migration: false",
  "Public release: false"
]) {
  if (!receiptMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "RECEIPT_MARKDOWN_MISSING", "Receipt markdown is missing a boundary phrase.", { phrase });
  }
}
for (const phrase of [
  "Status: rollback-plan-ready",
  "approval:vault-document-writes-lcx-vltui-2026-06-30-1310-kst",
  "approved maximum of 10 documents",
  "does not approve real client data migration"
]) {
  if (!rollbackPlan.includes(phrase)) {
    addFinding(findings, "P1", "ROLLBACK_PLAN_MISSING", "Rollback plan is missing a required phrase.", { phrase });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-vault-document-writes-approval.validation.v0.1",
  generated_at: "2026-06-30T04:10:00Z",
  source_refs: [
    RECEIPT_JSON_PATH,
    RECEIPT_MD_PATH,
    ROLLBACK_PLAN_PATH,
    DECISION_INTAKE_PATH,
    GO_LIVE_RECEIPT_PATH,
    RELEASE_RECEIPT_PATH,
    LCX_SMOKE_PATH
  ],
  verdict,
  summary: {
    vault_document_writes_approved: receipt.boundary?.vault_document_writes_approved === true,
    vault_document_write_execution_authorized: receipt.boundary?.vault_document_write_execution_authorized_by_this_receipt === true,
    vault_document_uploads_executed_by_this_receipt: receipt.boundary?.vault_document_uploads_executed_by_this_receipt === true,
    max_document_count: receipt.boundary?.max_document_count ?? null,
    real_client_data_migration_approved: receipt.boundary?.real_client_data_migration_approved === true,
    public_release_approved: receipt.boundary?.public_release_approved === true,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop Vault document writes approval validation failed");
console.log(JSON.stringify(report, null, 2));
