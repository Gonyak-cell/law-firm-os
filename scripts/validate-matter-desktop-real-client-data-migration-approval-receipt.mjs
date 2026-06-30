#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_JSON_PATH = "docs/desktop/matter-desktop-real-client-data-migration-approval-receipt-2026-06-30.json";
const RECEIPT_MD_PATH = "docs/desktop/matter-desktop-real-client-data-migration-approval-receipt-2026-06-30.md";
const SOURCE_INVENTORY_PATH = "docs/desktop/matter-desktop-real-client-data-migration-source-inventory-2026-06-30.json";
const MAPPING_WORKBOOK_PATH = "docs/desktop/matter-desktop-real-client-data-migration-mapping-workbook-2026-06-30.json";
const DRY_RUN_JSON_PATH = "docs/desktop/matter-desktop-real-client-data-migration-dry-run-receipt-2026-06-30.json";
const DRY_RUN_MD_PATH = "docs/desktop/matter-desktop-real-client-data-migration-dry-run-receipt-2026-06-30.md";
const ROLLBACK_PLAN_PATH = "docs/desktop/matter-desktop-real-client-data-migration-rollback-plan-2026-06-30.md";
const DECISION_INTAKE_PATH = "docs/desktop/matter-desktop-real-client-data-migration-decision-intake-2026-06-30.json";
const VAULT_WRITE_APPROVAL_PATH = "docs/desktop/matter-desktop-vault-document-writes-approval-receipt-2026-06-30.json";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const LCX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-real-client-data-migration-approval-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-real-client-data-migration-approval-validation.md";

const EXPECTED_RELEASE = {
  tag: "matter-desktop-v0.1.0-lcx-vltui-20260630",
  url: "https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.0-lcx-vltui-20260630",
  target_commitish: "ef493451a1d070412d3d24d4474493afbca3f1a4",
  release_channel: "github_prerelease_lcx_vltui_desktop"
};
const EXPECTED_SIGNATURE_REF = "approval:real-client-data-migration-lcx-vltui-2026-06-30-1520-kst";
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

function checkExpectedRelease(findings, release) {
  for (const [key, expected] of Object.entries(EXPECTED_RELEASE)) {
    if (release?.[key] !== expected) {
      addFinding(findings, "P1", `RELEASE_${key}`, "Release field does not match the LCX VLTUI desktop release.", {
        expected,
        actual: release?.[key]
      });
    }
  }
  if (release?.is_prerelease !== true) {
    addFinding(findings, "P1", "RELEASE_PRERELEASE", "Migration approval must stay tied to the prerelease lane.", {
      actual: release?.is_prerelease
    });
  }
}

function renderMarkdown(report) {
  const lines = [
    "# matter Desktop Real Client Data Migration Approval Validation",
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
  lines.push("- This validation records bounded real client data migration approval only.");
  lines.push("- It does not record that migration execution has already occurred.");
  lines.push("- Public release, external pilot distribution, company-wide rollout, Windows Authenticode signing, migration outside the named scope, and unbounded bulk migration remain false.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [
  RECEIPT_JSON_PATH,
  RECEIPT_MD_PATH,
  SOURCE_INVENTORY_PATH,
  MAPPING_WORKBOOK_PATH,
  DRY_RUN_JSON_PATH,
  DRY_RUN_MD_PATH,
  ROLLBACK_PLAN_PATH,
  DECISION_INTAKE_PATH,
  VAULT_WRITE_APPROVAL_PATH,
  RELEASE_RECEIPT_PATH,
  LCX_SMOKE_PATH
]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required source reference is missing.", { path });
}

const receipt = existsSync(RECEIPT_JSON_PATH) ? readJson(RECEIPT_JSON_PATH) : {};
const receiptMarkdown = existsSync(RECEIPT_MD_PATH) ? readText(RECEIPT_MD_PATH) : "";
const sourceInventory = existsSync(SOURCE_INVENTORY_PATH) ? readJson(SOURCE_INVENTORY_PATH) : {};
const mappingWorkbook = existsSync(MAPPING_WORKBOOK_PATH) ? readJson(MAPPING_WORKBOOK_PATH) : {};
const dryRun = existsSync(DRY_RUN_JSON_PATH) ? readJson(DRY_RUN_JSON_PATH) : {};
const dryRunMarkdown = existsSync(DRY_RUN_MD_PATH) ? readText(DRY_RUN_MD_PATH) : "";
const rollbackPlan = existsSync(ROLLBACK_PLAN_PATH) ? readText(ROLLBACK_PLAN_PATH) : "";
const intake = existsSync(DECISION_INTAKE_PATH) ? readJson(DECISION_INTAKE_PATH) : {};
const vaultWriteApproval = existsSync(VAULT_WRITE_APPROVAL_PATH) ? readJson(VAULT_WRITE_APPROVAL_PATH) : {};
const releaseReceipt = existsSync(RELEASE_RECEIPT_PATH) ? readJson(RELEASE_RECEIPT_PATH) : {};
const lcxSmoke = existsSync(LCX_SMOKE_PATH) ? readJson(LCX_SMOKE_PATH) : {};
const decision = receipt.decision ?? {};

if (receipt.schema_version !== "law-firm-os.matter-desktop-real-client-data-migration-approval-receipt.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected real client data migration approval receipt schema version.", {
    actual: receipt.schema_version
  });
}
if (receipt.status !== "real_client_data_migration_approved") {
  addFinding(findings, "P1", "RECEIPT_STATUS", "Real client data migration receipt must be approved.", {
    actual: receipt.status
  });
}
for (const [key, expected] of Object.entries({
  decision_maker: "Jiwon Suh, Product Owner",
  decision: "approve_real_client_data_migration",
  migration_scope: "LCX VLTUI desktop named lane only; bounded Matter/Client/Vault migration verification after Vault document writes approval recorded in PR #162",
  client_population: "LCX VLTUI production bridge smoke population and named-lane records only; no company-wide client population",
  source_inventory_ref: SOURCE_INVENTORY_PATH,
  mapping_workbook_ref: MAPPING_WORKBOOK_PATH,
  dry_run_receipt_ref: DRY_RUN_JSON_PATH,
  vault_write_approval_ref: VAULT_WRITE_APPROVAL_PATH,
  rollback_plan_ref: ROLLBACK_PLAN_PATH,
  communications_owner: "Jiwon Suh, Product Owner",
  decision_at: "2026-06-30T06:20:00Z",
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
for (const key of ["migration_scope", "client_population"]) {
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
checkExpectedRelease(findings, receipt.release);
if (releaseReceipt.release?.is_prerelease !== true) {
  addFinding(findings, "P1", "RELEASE_RECEIPT_PRERELEASE", "GitHub release receipt must remain prerelease.", {
    release: releaseReceipt.release
  });
}
if (intake.status !== "owner_decision_recorded" || intake.approval_receipt !== RECEIPT_JSON_PATH) {
  addFinding(findings, "P1", "INTAKE_NOT_RECORDED", "Decision intake must point at the approval receipt.", {
    status: intake.status,
    approval_receipt: intake.approval_receipt
  });
}
if (vaultWriteApproval.status !== "vault_document_writes_approved" || vaultWriteApproval.boundary?.vault_document_write_execution_authorized_by_this_receipt !== true) {
  addFinding(findings, "P1", "VAULT_WRITE_APPROVAL_NOT_READY", "Vault document writes approval must be recorded before migration approval.", {
    status: vaultWriteApproval.status,
    boundary: vaultWriteApproval.boundary
  });
}
if (lcxSmoke.verdict !== "PASS") {
  addFinding(findings, "P1", "LCX_SMOKE_NOT_PASSING", "LCX production bridge smoke must pass before migration approval.", {
    verdict: lcxSmoke.verdict
  });
}
if (sourceInventory.status !== "source_inventory_ready" || sourceInventory.scope?.source_record_count !== 1 || sourceInventory.scope?.company_wide_client_population !== false) {
  addFinding(findings, "P1", "SOURCE_INVENTORY", "Source inventory must be ready and bounded to one named-lane record.", {
    status: sourceInventory.status,
    scope: sourceInventory.scope
  });
}
if (mappingWorkbook.status !== "mapping_workbook_ready" || mappingWorkbook.source_inventory_ref !== SOURCE_INVENTORY_PATH || mappingWorkbook.target?.company_wide_target !== false) {
  addFinding(findings, "P1", "MAPPING_WORKBOOK", "Mapping workbook must point to the source inventory and avoid company-wide target scope.", {
    status: mappingWorkbook.status,
    source_inventory_ref: mappingWorkbook.source_inventory_ref,
    target: mappingWorkbook.target
  });
}
if (
  dryRun.status !== "dry_run_pass" ||
  dryRun.dry_run?.executed_mutation_count !== 0 ||
  dryRun.dry_run?.unexpected_mutation_count !== 0 ||
  dryRun.dry_run?.destructive_mutation_count !== 0 ||
  dryRun.boundary?.real_client_rows_migrated !== 0
) {
  addFinding(findings, "P1", "DRY_RUN", "Dry run must pass with zero executed, unexpected, destructive, and migrated rows.", {
    status: dryRun.status,
    dry_run: dryRun.dry_run,
    boundary: dryRun.boundary
  });
}
for (const [key, expected] of Object.entries({
  approves_real_client_data_migration: true,
  approves_bounded_named_lane_migration_verification: true,
  real_client_data_migration_execution_authorized: true,
  company_wide_client_population_approved: false,
  public_release_approved: false,
  company_wide_production_rollout_approved: false,
  external_pilot_distribution_approved: false,
  windows_authenticode_signing_approved: false,
  migration_outside_named_scope_approved: false,
  unbounded_bulk_client_data_migration_approved: false
})) {
  if (receipt.scope?.[key] !== expected) {
    addFinding(findings, expected === false ? "P0" : "P1", `SCOPE_${key}`, "Receipt scope field drifted.", {
      expected,
      actual: receipt.scope?.[key]
    });
  }
}
for (const [key, expected] of Object.entries({
  real_client_data_migration_approved: true,
  real_client_data_migration_execution_authorized_by_this_receipt: true,
  real_client_rows_migrated_by_this_receipt: 0,
  migration_execution_receipt_present: false,
  vault_document_writes_approval_recorded: true,
  source_inventory_ready: true,
  mapping_workbook_ready: true,
  dry_run_pass: true,
  public_release_approved: false,
  company_wide_production_rollout_approved: false,
  external_pilot_distribution_approved: false,
  windows_authenticode_signing_approved: false,
  migration_outside_named_scope_approved: false,
  unbounded_bulk_client_data_migration_approved: false
})) {
  if (receipt.boundary?.[key] !== expected) {
    addFinding(findings, expected === false ? "P0" : "P1", `BOUNDARY_${key}`, "Receipt boundary field drifted.", {
      expected,
      actual: receipt.boundary?.[key]
    });
  }
}
for (const phrase of [
  "Status: real-client-data-migration-approved",
  "Real client data migration approved: true",
  "Real client rows migrated by this receipt: 0",
  "Migration execution receipt present: false",
  "Public release: false"
]) {
  if (!receiptMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "RECEIPT_MARKDOWN_MISSING", "Receipt markdown is missing a boundary phrase.", { phrase });
  }
}
for (const phrase of ["Status: dry-run-pass", "Executed mutations: 0", "Unexpected mutations: 0", "Real client rows migrated: 0"]) {
  if (!dryRunMarkdown.includes(phrase)) {
    addFinding(findings, "P1", "DRY_RUN_MARKDOWN_MISSING", "Dry-run markdown is missing a required phrase.", { phrase });
  }
}
for (const phrase of ["Status: rollback-plan-ready", EXPECTED_SIGNATURE_REF, "does not authorize unbounded or bulk client data migration"]) {
  if (!rollbackPlan.includes(phrase)) {
    addFinding(findings, "P1", "ROLLBACK_PLAN_MISSING", "Rollback plan is missing a required phrase.", { phrase });
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-real-client-data-migration-approval.validation.v0.1",
  generated_at: "2026-06-30T06:20:00Z",
  source_refs: [
    RECEIPT_JSON_PATH,
    RECEIPT_MD_PATH,
    SOURCE_INVENTORY_PATH,
    MAPPING_WORKBOOK_PATH,
    DRY_RUN_JSON_PATH,
    DRY_RUN_MD_PATH,
    ROLLBACK_PLAN_PATH,
    DECISION_INTAKE_PATH,
    VAULT_WRITE_APPROVAL_PATH,
    RELEASE_RECEIPT_PATH,
    LCX_SMOKE_PATH
  ],
  verdict,
  summary: {
    real_client_data_migration_approved: receipt.boundary?.real_client_data_migration_approved === true,
    real_client_data_migration_execution_authorized: receipt.boundary?.real_client_data_migration_execution_authorized_by_this_receipt === true,
    real_client_rows_migrated_by_this_receipt: receipt.boundary?.real_client_rows_migrated_by_this_receipt ?? null,
    migration_execution_receipt_present: receipt.boundary?.migration_execution_receipt_present === true,
    source_inventory_ready: sourceInventory.status === "source_inventory_ready",
    mapping_workbook_ready: mappingWorkbook.status === "mapping_workbook_ready",
    dry_run_pass: dryRun.status === "dry_run_pass",
    public_release_approved: receipt.boundary?.public_release_approved === true,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop real client data migration approval validation failed");
console.log(JSON.stringify(report, null, 2));
