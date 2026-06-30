#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const VAULT_EXECUTION_PATH = "docs/desktop/matter-desktop-vault-document-writes-execution-receipt-2026-06-30.json";
const VAULT_EXECUTION_MD_PATH = "docs/desktop/matter-desktop-vault-document-writes-execution-receipt-2026-06-30.md";
const MIGRATION_EXECUTION_PATH = "docs/desktop/matter-desktop-real-client-data-migration-execution-receipt-2026-06-30.json";
const MIGRATION_EXECUTION_MD_PATH = "docs/desktop/matter-desktop-real-client-data-migration-execution-receipt-2026-06-30.md";
const POST_EXECUTION_SMOKE_PATH = "docs/desktop/matter-desktop-nonwindows-post-execution-smoke-2026-06-30.json";
const POST_EXECUTION_SMOKE_MD_PATH = "docs/desktop/matter-desktop-nonwindows-post-execution-smoke-2026-06-30.md";
const CLOSEOUT_PATH = "docs/desktop/matter-desktop-nonwindows-execution-closeout-receipt-2026-06-30.json";
const CLOSEOUT_MD_PATH = "docs/desktop/matter-desktop-nonwindows-execution-closeout-receipt-2026-06-30.md";
const VAULT_APPROVAL_PATH = "docs/desktop/matter-desktop-vault-document-writes-approval-receipt-2026-06-30.json";
const MIGRATION_APPROVAL_PATH = "docs/desktop/matter-desktop-real-client-data-migration-approval-receipt-2026-06-30.json";
const VAULT_APPROVAL_VALIDATION_PATH = "docs/desktop/matter-desktop-vault-document-writes-approval-validation.json";
const MIGRATION_APPROVAL_VALIDATION_PATH = "docs/desktop/matter-desktop-real-client-data-migration-approval-validation.json";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-nonwindows-execution-closeout-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-nonwindows-execution-closeout-validation.md";

const EXPECTED = {
  execution_ref: "execution:lcx-vltui-nonwindows-approved-scope-2026-06-30",
  base_url: "https://d2mthcc8vp3cr2.cloudfront.net",
  deployment_commit: "0ff79586d887a950200ab091a5864a20c174bdf9",
  release_tag: "matter-desktop-v0.1.0-lcx-vltui-20260630",
  release_url: "https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.0-lcx-vltui-20260630",
  release_channel: "github_prerelease_lcx_vltui_desktop",
  max_document_count: 10,
  vault_documents_written: 1,
  client_records_migrated: 1,
  matter_records_migrated: 1,
  real_client_rows_migrated: 1,
  document_id: "doc_lcx_vltui_named_lane_execution_20260630"
};

const REQUIRED_SMOKE_CHECKS = [
  "bridge-status",
  "bridge-client-upsert",
  "bridge-matter-upsert",
  "bridge-lookup",
  "vault-document-write",
  "vault-document-visibility",
  "matter-client-vault-linked-state",
  "rollback-target-identification"
];

const FALSE_BOUNDARY_FIELDS = [
  "public_release_approved",
  "company_wide_production_rollout_approved",
  "external_pilot_distribution_approved",
  "windows_authenticode_signing_approved",
  "migration_outside_named_scope_approved",
  "unbounded_bulk_client_data_migration_approved"
];
const VAULT_FALSE_BOUNDARY_FIELDS = [
  "public_release_approved",
  "company_wide_production_rollout_approved",
  "external_pilot_distribution_approved",
  "windows_authenticode_signing_approved",
  "write_outside_named_scope_approved"
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

function checkPath(findings, path) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required source reference is missing.", { path });
}

function checkExpectedRuntime(findings, name, receipt) {
  for (const key of ["base_url", "deployment_commit", "execution_ref"]) {
    if (receipt?.[key] !== EXPECTED[key]) {
      addFinding(findings, "P1", `${name}_${key}`, "Receipt runtime or execution reference drifted.", {
        expected: EXPECTED[key],
        actual: receipt?.[key]
      });
    }
  }
}

function checkExpectedRelease(findings, name, release) {
  for (const [key, expected] of Object.entries({
    tag: EXPECTED.release_tag,
    url: EXPECTED.release_url,
    release_channel: EXPECTED.release_channel
  })) {
    if (release?.[key] !== expected) {
      addFinding(findings, "P1", `${name}_RELEASE_${key}`, "Release field drifted.", { expected, actual: release?.[key] });
    }
  }
}

function checkFalseBoundaries(findings, name, boundary, fields = FALSE_BOUNDARY_FIELDS) {
  if (boundary?.approved_scope_only !== true) {
    addFinding(findings, "P1", `${name}_APPROVED_SCOPE_ONLY`, "Receipt must remain limited to the approved named lane.", {
      actual: boundary?.approved_scope_only
    });
  }
  for (const key of fields) {
    if (boundary?.[key] !== false) {
      addFinding(findings, "P0", `${name}_BOUNDARY_${key}`, "Out-of-scope boundary field must remain false.", {
        expected: false,
        actual: boundary?.[key]
      });
    }
  }
}

function checkMarkdown(findings, path, text, phrases) {
  if (PLACEHOLDER_PATTERN.test(text)) addFinding(findings, "P1", "MARKDOWN_PLACEHOLDER", "Markdown contains placeholder text.", { path });
  for (const phrase of phrases) {
    if (!text.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_PHRASE_MISSING", "Markdown is missing a required phrase.", { path, phrase });
  }
}

function renderMarkdown(report) {
  const lines = [
    "# matter Desktop Non-Windows Execution Closeout Validation",
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
  lines.push("- This validation confirms approved-scope execution and verification for the LCX VLTUI desktop named lane.");
  lines.push("- Vault document writes, real client data migration, bridge status/lookup, document visibility, linked state, and rollback target identification are covered by the source receipts.");
  lines.push("- Public release, external pilot distribution, company-wide rollout, Windows Authenticode signing, writes outside the named scope, migration outside the named scope, and unbounded bulk migration remain out of scope.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [
  VAULT_EXECUTION_PATH,
  VAULT_EXECUTION_MD_PATH,
  MIGRATION_EXECUTION_PATH,
  MIGRATION_EXECUTION_MD_PATH,
  POST_EXECUTION_SMOKE_PATH,
  POST_EXECUTION_SMOKE_MD_PATH,
  CLOSEOUT_PATH,
  CLOSEOUT_MD_PATH,
  VAULT_APPROVAL_PATH,
  MIGRATION_APPROVAL_PATH,
  VAULT_APPROVAL_VALIDATION_PATH,
  MIGRATION_APPROVAL_VALIDATION_PATH,
  RELEASE_RECEIPT_PATH
]) {
  checkPath(findings, path);
}

const vaultExecution = existsSync(VAULT_EXECUTION_PATH) ? readJson(VAULT_EXECUTION_PATH) : {};
const vaultExecutionMd = existsSync(VAULT_EXECUTION_MD_PATH) ? readText(VAULT_EXECUTION_MD_PATH) : "";
const migrationExecution = existsSync(MIGRATION_EXECUTION_PATH) ? readJson(MIGRATION_EXECUTION_PATH) : {};
const migrationExecutionMd = existsSync(MIGRATION_EXECUTION_MD_PATH) ? readText(MIGRATION_EXECUTION_MD_PATH) : "";
const smoke = existsSync(POST_EXECUTION_SMOKE_PATH) ? readJson(POST_EXECUTION_SMOKE_PATH) : {};
const smokeMd = existsSync(POST_EXECUTION_SMOKE_MD_PATH) ? readText(POST_EXECUTION_SMOKE_MD_PATH) : "";
const closeout = existsSync(CLOSEOUT_PATH) ? readJson(CLOSEOUT_PATH) : {};
const closeoutMd = existsSync(CLOSEOUT_MD_PATH) ? readText(CLOSEOUT_MD_PATH) : "";
const vaultApproval = existsSync(VAULT_APPROVAL_PATH) ? readJson(VAULT_APPROVAL_PATH) : {};
const migrationApproval = existsSync(MIGRATION_APPROVAL_PATH) ? readJson(MIGRATION_APPROVAL_PATH) : {};
const vaultApprovalValidation = existsSync(VAULT_APPROVAL_VALIDATION_PATH) ? readJson(VAULT_APPROVAL_VALIDATION_PATH) : {};
const migrationApprovalValidation = existsSync(MIGRATION_APPROVAL_VALIDATION_PATH) ? readJson(MIGRATION_APPROVAL_VALIDATION_PATH) : {};
const releaseReceipt = existsSync(RELEASE_RECEIPT_PATH) ? readJson(RELEASE_RECEIPT_PATH) : {};

if (vaultApproval.status !== "vault_document_writes_approved") {
  addFinding(findings, "P1", "VAULT_APPROVAL_STATUS", "Vault document writes approval must be recorded before execution closeout.", {
    actual: vaultApproval.status
  });
}
if (migrationApproval.status !== "real_client_data_migration_approved") {
  addFinding(findings, "P1", "MIGRATION_APPROVAL_STATUS", "Real client data migration approval must be recorded before execution closeout.", {
    actual: migrationApproval.status
  });
}
if (vaultApprovalValidation.verdict !== "PASS" || migrationApprovalValidation.verdict !== "PASS") {
  addFinding(findings, "P1", "APPROVAL_VALIDATION_NOT_PASS", "Both approval validators must pass before execution closeout.", {
    vault_approval_validation: vaultApprovalValidation.verdict,
    migration_approval_validation: migrationApprovalValidation.verdict
  });
}
if (releaseReceipt.status !== "github_prerelease_published" || releaseReceipt.release?.is_prerelease !== true) {
  addFinding(findings, "P1", "RELEASE_RECEIPT", "Execution closeout must stay tied to the published prerelease lane.", {
    status: releaseReceipt.status,
    release: releaseReceipt.release
  });
}

checkExpectedRuntime(findings, "VAULT_EXECUTION", vaultExecution);
checkExpectedRuntime(findings, "MIGRATION_EXECUTION", migrationExecution);
checkExpectedRuntime(findings, "SMOKE", smoke);
checkExpectedRuntime(findings, "CLOSEOUT", closeout);
checkExpectedRelease(findings, "VAULT_EXECUTION", vaultExecution.release);
checkExpectedRelease(findings, "MIGRATION_EXECUTION", migrationExecution.release);
checkExpectedRelease(findings, "CLOSEOUT", closeout.release);

if (vaultExecution.schema_version !== "law-firm-os.matter-desktop-vault-document-writes-execution-receipt.v0.1" || vaultExecution.status !== "vault_document_writes_executed") {
  addFinding(findings, "P1", "VAULT_EXECUTION_STATUS", "Vault document write execution receipt must record executed status.", {
    schema_version: vaultExecution.schema_version,
    status: vaultExecution.status
  });
}
if (vaultExecution.execution?.route !== "POST /api/vault/documents" || vaultExecution.execution?.http_status !== 201) {
  addFinding(findings, "P1", "VAULT_EXECUTION_ROUTE", "Vault write must be recorded against the upload route with HTTP 201.", {
    execution: vaultExecution.execution
  });
}
if (
  vaultExecution.document?.document_id !== EXPECTED.document_id ||
  vaultExecution.counts?.vault_documents_written !== EXPECTED.vault_documents_written ||
  vaultExecution.counts?.vault_documents_visible_after_write !== EXPECTED.vault_documents_written ||
  vaultExecution.counts?.max_document_count !== EXPECTED.max_document_count ||
  vaultExecution.counts?.vault_documents_written > vaultExecution.counts?.max_document_count
) {
  addFinding(findings, "P1", "VAULT_EXECUTION_COUNTS", "Vault document write counts or document identity are unexpected.", {
    document: vaultExecution.document,
    counts: vaultExecution.counts
  });
}
if (vaultExecution.boundary?.vault_document_writes_executed !== true || vaultExecution.boundary?.write_outside_named_scope_approved !== false) {
  addFinding(findings, "P1", "VAULT_EXECUTION_BOUNDARY", "Vault document write execution boundary drifted.", {
    boundary: vaultExecution.boundary
  });
}
checkFalseBoundaries(findings, "VAULT_EXECUTION", vaultExecution.boundary, VAULT_FALSE_BOUNDARY_FIELDS);

if (migrationExecution.schema_version !== "law-firm-os.matter-desktop-real-client-data-migration-execution-receipt.v0.1" || migrationExecution.status !== "real_client_data_migration_executed") {
  addFinding(findings, "P1", "MIGRATION_EXECUTION_STATUS", "Migration execution receipt must record executed status.", {
    schema_version: migrationExecution.schema_version,
    status: migrationExecution.status
  });
}
for (const [key, expected] of Object.entries({
  source_records: 1,
  client_records_migrated: EXPECTED.client_records_migrated,
  matter_records_migrated: EXPECTED.matter_records_migrated,
  vault_documents_written: EXPECTED.vault_documents_written,
  bridge_lookup_matches: 1,
  real_client_rows_migrated: EXPECTED.real_client_rows_migrated,
  migration_execution_receipt_present: true
})) {
  if (migrationExecution.counts?.[key] !== expected) {
    addFinding(findings, "P1", `MIGRATION_COUNT_${key}`, "Migration execution count drifted.", {
      expected,
      actual: migrationExecution.counts?.[key]
    });
  }
}
for (const [key, expected] of Object.entries({
  client_upsert_status: 201,
  matter_upsert_status: 201,
  bridge_lookup_status: 200,
  vault_document_upload_status: 201
})) {
  if (migrationExecution.execution?.[key] !== expected) {
    addFinding(findings, "P1", `MIGRATION_EXECUTION_${key}`, "Migration execution route status drifted.", {
      expected,
      actual: migrationExecution.execution?.[key]
    });
  }
}
if (migrationExecution.boundary?.named_lane_only !== true || migrationExecution.boundary?.real_client_data_migration_executed !== true) {
  addFinding(findings, "P1", "MIGRATION_EXECUTION_BOUNDARY", "Migration execution boundary drifted.", {
    boundary: migrationExecution.boundary
  });
}
checkFalseBoundaries(findings, "MIGRATION_EXECUTION", migrationExecution.boundary);

if (smoke.schema_version !== "law-firm-os.matter-desktop-nonwindows-post-execution-smoke.v0.1" || smoke.verdict !== "PASS") {
  addFinding(findings, "P1", "SMOKE_VERDICT", "Post-execution smoke must pass.", {
    schema_version: smoke.schema_version,
    verdict: smoke.verdict
  });
}
for (const checkId of REQUIRED_SMOKE_CHECKS) {
  const check = (smoke.checks ?? []).find((item) => item.id === checkId);
  if (check?.passed !== true) {
    addFinding(findings, "P1", `SMOKE_CHECK_${checkId}`, "Required post-execution smoke check did not pass.", { check });
  }
}
if (smoke.rollback?.rollback_possible !== true || smoke.rollback?.rollback_target_count !== 1) {
  addFinding(findings, "P1", "ROLLBACK", "Rollback target identification must remain possible for the approved-scope execution.", {
    rollback: smoke.rollback
  });
}
checkFalseBoundaries(findings, "SMOKE", smoke.boundary);

if (closeout.schema_version !== "law-firm-os.matter-desktop-nonwindows-execution-closeout-receipt.v0.1" || closeout.status !== "approved_scope_execution_verified") {
  addFinding(findings, "P1", "CLOSEOUT_STATUS", "Closeout receipt must record approved-scope execution verified status.", {
    schema_version: closeout.schema_version,
    status: closeout.status
  });
}
for (const [key, expected] of Object.entries({
  vault_document_writes_executed: true,
  real_client_data_migration_executed: true,
  vault_documents_written: EXPECTED.vault_documents_written,
  client_records_migrated: EXPECTED.client_records_migrated,
  matter_records_migrated: EXPECTED.matter_records_migrated,
  real_client_rows_migrated: EXPECTED.real_client_rows_migrated,
  post_execution_smoke_verdict: "PASS",
  rollback_possible: true
})) {
  if (closeout.summary?.[key] !== expected) {
    addFinding(findings, "P1", `CLOSEOUT_SUMMARY_${key}`, "Closeout summary drifted.", {
      expected,
      actual: closeout.summary?.[key]
    });
  }
}
checkFalseBoundaries(findings, "CLOSEOUT", closeout.boundary);

checkMarkdown(findings, VAULT_EXECUTION_MD_PATH, vaultExecutionMd, [
  "Status: vault-document-writes-executed",
  "| Documents written | 1 |",
  "Max document count: 10"
]);
checkMarkdown(findings, MIGRATION_EXECUTION_MD_PATH, migrationExecutionMd, [
  "Status: real-client-data-migration-executed",
  "| Migrated client records | 1 |",
  "| Migrated matter records | 1 |",
  "| Vault documents written | 1 |"
]);
checkMarkdown(findings, POST_EXECUTION_SMOKE_MD_PATH, smokeMd, [
  "Verdict: PASS",
  "Rollback target identification checked: true",
  "matter-client-vault-linked-state"
]);
checkMarkdown(findings, CLOSEOUT_MD_PATH, closeoutMd, [
  "Status: approved-scope-execution-verified",
  "Vault document writes executed",
  "Real client data migration executed",
  "Windows Authenticode signing: false"
]);

const report = {
  schema_version: "law-firm-os.matter-desktop-nonwindows-execution-closeout-validation.v0.1",
  generated_at: new Date().toISOString(),
  verdict: findings.length === 0 ? "PASS" : "FAIL",
  summary: {
    execution_ref: closeout.execution_ref ?? "missing",
    vault_documents_written: vaultExecution.counts?.vault_documents_written ?? 0,
    real_client_rows_migrated: migrationExecution.counts?.real_client_rows_migrated ?? 0,
    post_execution_smoke_verdict: smoke.verdict ?? "missing",
    rollback_possible: smoke.rollback?.rollback_possible === true,
    findings: findings.length
  },
  sources: {
    vault_document_write_execution_receipt: VAULT_EXECUTION_PATH,
    real_client_data_migration_execution_receipt: MIGRATION_EXECUTION_PATH,
    post_execution_smoke: POST_EXECUTION_SMOKE_PATH,
    closeout_receipt: CLOSEOUT_PATH,
    vault_document_writes_approval: VAULT_APPROVAL_PATH,
    real_client_data_migration_approval: MIGRATION_APPROVAL_PATH
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({ verdict: report.verdict, findings: findings.length, validation: VALIDATION_JSON_PATH }, null, 2));
assert.equal(report.verdict, "PASS");
