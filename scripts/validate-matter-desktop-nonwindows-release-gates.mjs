#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const READINESS_JSON_PATH = "docs/desktop/matter-desktop-internal-prerelease-distribution-readiness-2026-06-30.json";
const READINESS_MD_PATH = "docs/desktop/matter-desktop-internal-prerelease-distribution-readiness-2026-06-30.md";
const VAULT_WRITES_JSON_PATH = "docs/desktop/matter-desktop-vault-document-writes-decision-intake-2026-06-30.json";
const VAULT_WRITES_MD_PATH = "docs/desktop/matter-desktop-vault-document-writes-decision-intake-2026-06-30.md";
const MIGRATION_JSON_PATH = "docs/desktop/matter-desktop-real-client-data-migration-decision-intake-2026-06-30.json";
const MIGRATION_MD_PATH = "docs/desktop/matter-desktop-real-client-data-migration-decision-intake-2026-06-30.md";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const OWNER_RECEIPT_PATH = "docs/desktop/matter-desktop-owner-approval-receipt-2026-06-30.json";
const GO_LIVE_RECEIPT_PATH = "docs/desktop/matter-desktop-production-go-live-receipt-2026-06-30.json";
const HRX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/hrx-production-smoke-2026-06-30.json";
const LCX_SMOKE_PATH = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-nonwindows-release-gates-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-nonwindows-release-gates-validation.md";

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
const PLACEHOLDER_PATTERN = /<[^>]*>|\bTBD\b|\bTODO\b|placeholder/i;

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

function hasUploadedAsset(releaseReceipt, name) {
  return (releaseReceipt.assets ?? []).some((asset) => asset.name === name && asset.state === "uploaded");
}

function checkExpectedRelease(findings, name, release) {
  for (const [key, expected] of Object.entries(EXPECTED_RELEASE)) {
    if (release?.[key] !== expected) {
      addFinding(findings, "P1", `${name}_RELEASE_${key}`, "Release field does not match the LCX VLTUI desktop release.", {
        expected,
        actual: release?.[key]
      });
    }
  }
  if (release?.is_prerelease !== true) {
    addFinding(findings, "P1", `${name}_RELEASE_PRERELEASE`, "Release must stay on the GitHub prerelease lane.", {
      actual: release?.is_prerelease
    });
  }
}

function checkRuntime(findings, runtime) {
  for (const [key, expected] of Object.entries(EXPECTED_RUNTIME)) {
    if (runtime?.[key] !== expected) {
      addFinding(findings, "P1", `RUNTIME_${key}`, "Runtime target field is missing or unexpected.", {
        expected,
        actual: runtime?.[key]
      });
    }
  }
}

function checkMarkdown(findings, path, text, requiredPhrases) {
  if (PLACEHOLDER_PATTERN.test(text)) {
    addFinding(findings, "P1", "MARKDOWN_PLACEHOLDER", "Markdown contains placeholder text.", { path });
  }
  for (const phrase of requiredPhrases) {
    if (!text.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_BOUNDARY_MISSING", "Markdown is missing a required phrase.", { path, phrase });
  }
}

function checkPendingDecisionIntake(findings, name, intake, options) {
  if (intake.schema_version !== options.schemaVersion) {
    addFinding(findings, "P1", `${name}_SCHEMA_VERSION`, "Unexpected decision intake schema version.", {
      actual: intake.schema_version
    });
  }
  if (intake.status !== "pending_owner_decision" || intake.decision_request?.response_status !== "pending_owner_decision") {
    addFinding(findings, "P1", `${name}_STATUS`, "Decision intake must remain pending until a real owner decision is supplied.", {
      status: intake.status,
      response_status: intake.decision_request?.response_status
    });
  }
  if (intake.decision_gate !== options.decisionGate) {
    addFinding(findings, "P1", `${name}_DECISION_GATE`, "Decision gate drifted.", {
      expected: options.decisionGate,
      actual: intake.decision_gate
    });
  }
  if (intake.tracker?.owner_decision_issue !== options.issueUrl) {
    addFinding(findings, "P1", `${name}_TRACKER`, "Owner decision tracker issue drifted.", {
      expected: options.issueUrl,
      actual: intake.tracker?.owner_decision_issue
    });
  }
  checkExpectedRelease(findings, name, intake.release);
  if (options.checkRuntime) checkRuntime(findings, intake.runtime_target);
  if (!sameSet(intake.decision_request?.required_decision_fields, options.requiredFields)) {
    addFinding(findings, "P1", `${name}_REQUIRED_FIELDS`, "Required decision fields drifted.", {
      expected: options.requiredFields,
      actual: intake.decision_request?.required_decision_fields
    });
  }
  if (!sameSet(intake.decision_request?.allowed_decisions, options.allowedDecisions)) {
    addFinding(findings, "P1", `${name}_ALLOWED_DECISIONS`, "Allowed decisions drifted.", {
      expected: options.allowedDecisions,
      actual: intake.decision_request?.allowed_decisions
    });
  }
  for (const [key, expected] of Object.entries(options.boundary)) {
    if (intake.boundary?.[key] !== expected) {
      addFinding(findings, expected === false ? "P0" : "P1", `${name}_BOUNDARY_${key}`, "Decision intake boundary drifted.", {
        expected,
        actual: intake.boundary?.[key]
      });
    }
  }
}

function renderMarkdown(report) {
  const lines = [
    "# matter Desktop Non-Windows Release Gates Validation",
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
  lines.push("- Internal prerelease distribution readiness is recorded for the named lane only.");
  lines.push("- Vault document writes remain pending owner decision.");
  lines.push("- Real client data migration remains pending owner decision.");
  lines.push("- Public release, external pilot distribution, Windows Authenticode signing, company-wide rollout, Vault write execution, and real client migration execution remain out of scope.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [
  READINESS_JSON_PATH,
  READINESS_MD_PATH,
  VAULT_WRITES_JSON_PATH,
  VAULT_WRITES_MD_PATH,
  MIGRATION_JSON_PATH,
  MIGRATION_MD_PATH,
  RELEASE_RECEIPT_PATH,
  OWNER_RECEIPT_PATH,
  GO_LIVE_RECEIPT_PATH,
  HRX_SMOKE_PATH,
  LCX_SMOKE_PATH
]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required source reference is missing.", { path });
}

const readiness = existsSync(READINESS_JSON_PATH) ? readJson(READINESS_JSON_PATH) : {};
const readinessMd = existsSync(READINESS_MD_PATH) ? readText(READINESS_MD_PATH) : "";
const vaultWrites = existsSync(VAULT_WRITES_JSON_PATH) ? readJson(VAULT_WRITES_JSON_PATH) : {};
const vaultWritesMd = existsSync(VAULT_WRITES_MD_PATH) ? readText(VAULT_WRITES_MD_PATH) : "";
const migration = existsSync(MIGRATION_JSON_PATH) ? readJson(MIGRATION_JSON_PATH) : {};
const migrationMd = existsSync(MIGRATION_MD_PATH) ? readText(MIGRATION_MD_PATH) : "";
const releaseReceipt = existsSync(RELEASE_RECEIPT_PATH) ? readJson(RELEASE_RECEIPT_PATH) : {};
const ownerReceipt = existsSync(OWNER_RECEIPT_PATH) ? readJson(OWNER_RECEIPT_PATH) : {};
const goLiveReceipt = existsSync(GO_LIVE_RECEIPT_PATH) ? readJson(GO_LIVE_RECEIPT_PATH) : {};
const hrxSmoke = existsSync(HRX_SMOKE_PATH) ? readJson(HRX_SMOKE_PATH) : {};
const lcxSmoke = existsSync(LCX_SMOKE_PATH) ? readJson(LCX_SMOKE_PATH) : {};

if (releaseReceipt.status !== "github_prerelease_published" || releaseReceipt.release?.is_prerelease !== true) {
  addFinding(findings, "P1", "RELEASE_RECEIPT_NOT_PRERELEASE", "GitHub release receipt must remain a published prerelease.", {
    status: releaseReceipt.status,
    release: releaseReceipt.release
  });
}
for (const asset of ["matter-0.1.0-macos.dmg", "matter-0.1.0-macos.zip", "release-manifest.json", "checksums.sha256"]) {
  if (!hasUploadedAsset(releaseReceipt, asset)) {
    addFinding(findings, "P1", "RELEASE_ASSET_MISSING", "Required internal prerelease asset is missing from the release receipt.", { asset });
  }
}
for (const [key, expected] of Object.entries({
  public_release: false,
  owner_final_approval: false,
  app_store_distribution: false,
  microsoft_store_distribution: false
})) {
  if (releaseReceipt.non_claims?.[key] !== expected) {
    addFinding(findings, "P0", `RELEASE_NON_CLAIM_${key}`, "Release receipt non-claim drifted.", {
      expected,
      actual: releaseReceipt.non_claims?.[key]
    });
  }
}
if (ownerReceipt.status !== "owner_review_gate_approved") {
  addFinding(findings, "P1", "OWNER_RECEIPT_NOT_APPROVED", "Owner review gate receipt must be approved before internal distribution readiness.", {
    status: ownerReceipt.status
  });
}
if (goLiveReceipt.status !== "production_go_live_receipt_committed") {
  addFinding(findings, "P1", "GO_LIVE_RECEIPT_NOT_COMMITTED", "Named-lane go-live receipt must be committed before internal distribution readiness.", {
    status: goLiveReceipt.status
  });
}
for (const key of ["public_release_approved", "company_wide_production_go_live_approved", "external_pilot_distribution_approved", "vault_document_writes_approved", "real_client_data_migration_approved"]) {
  if (goLiveReceipt.scope?.[key] !== false || goLiveReceipt.boundary?.[key] !== false) {
    addFinding(findings, "P0", `GO_LIVE_BOUNDARY_${key}`, "Go-live receipt must keep adjacent approval lanes false.", {
      scope: goLiveReceipt.scope?.[key],
      boundary: goLiveReceipt.boundary?.[key]
    });
  }
}
if (hrxSmoke.verdict !== "PASS" || hrxSmoke.hrx_source_ref_counts?.["hrx-member-roster-source-of-truth"] !== 9) {
  addFinding(findings, "P1", "HRX_SMOKE_NOT_PASSING", "HRX production smoke must pass with roster source-of-truth rows.", {
    verdict: hrxSmoke.verdict,
    source_ref_counts: hrxSmoke.hrx_source_ref_counts
  });
}
if (lcxSmoke.verdict !== "PASS" || lcxSmoke.boundary?.vault_document_write_enabled !== false || lcxSmoke.boundary?.real_client_data_used !== false) {
  addFinding(findings, "P1", "LCX_SMOKE_BOUNDARY", "LCX production bridge smoke must pass while preserving Vault write and real data boundaries.", {
    verdict: lcxSmoke.verdict,
    boundary: lcxSmoke.boundary
  });
}

if (readiness.schema_version !== "law-firm-os.matter-desktop-internal-prerelease-distribution-readiness.v0.1") {
  addFinding(findings, "P1", "READINESS_SCHEMA_VERSION", "Unexpected readiness schema version.", { actual: readiness.schema_version });
}
if (readiness.status !== "internal_prerelease_distribution_ready") {
  addFinding(findings, "P1", "READINESS_STATUS", "Internal prerelease distribution readiness status drifted.", { actual: readiness.status });
}
checkExpectedRelease(findings, "READINESS", readiness.release);
if (readiness.distribution_scope?.windows_lane !== "excluded_from_this_non_windows_gate") {
  addFinding(findings, "P1", "READINESS_WINDOWS_SCOPE", "Windows lane must stay excluded from this non-Windows gate.", {
    actual: readiness.distribution_scope?.windows_lane
  });
}
for (const asset of ["matter-0.1.0-macos.dmg", "matter-0.1.0-macos.zip", "release-manifest.json", "checksums.sha256"]) {
  if (!(readiness.distribution_scope?.approved_assets ?? []).includes(asset)) {
    addFinding(findings, "P1", "READINESS_APPROVED_ASSET", "Internal readiness is missing an approved asset.", { asset });
  }
}
for (const [key, expected] of Object.entries({
  internal_prerelease_distribution_readiness_recorded: true,
  distribution_execution_recorded_by_this_file: false,
  public_release_approved: false,
  company_wide_production_rollout_approved: false,
  external_pilot_distribution_approved: false,
  windows_authenticode_signing_approved: false,
  vault_document_writes_approved: false,
  real_client_data_migration_approved: false,
  vault_document_write_execution_authorized_by_this_file: false,
  real_client_data_used_by_this_file: false
})) {
  if (readiness.boundary?.[key] !== expected) {
    addFinding(findings, expected === false ? "P0" : "P1", `READINESS_BOUNDARY_${key}`, "Internal readiness boundary drifted.", {
      expected,
      actual: readiness.boundary?.[key]
    });
  }
}
checkMarkdown(findings, READINESS_MD_PATH, readinessMd, [
  "Status: internal-prerelease-distribution-ready",
  "Distribution execution recorded by this file: false",
  "Public release: false",
  "Vault document writes: false",
  "Real client data migration: false"
]);

checkPendingDecisionIntake(findings, "VAULT_WRITES", vaultWrites, {
  schemaVersion: "law-firm-os.matter-desktop-vault-document-writes-decision-intake.v0.1",
  decisionGate: "vault_document_writes",
  issueUrl: "https://github.com/Gonyak-cell/law-firm-os/issues/159",
  checkRuntime: true,
  requiredFields: [
    "decision_maker",
    "decision",
    "write_scope",
    "vault_target",
    "source_system",
    "max_document_count",
    "audit_log_location",
    "rollback_plan_ref",
    "decision_at",
    "approval_signature_ref",
    "recorded_by_human"
  ],
  allowedDecisions: ["approve_vault_document_writes", "reject_vault_document_writes", "request_changes"],
  boundary: {
    vault_document_writes_approved: false,
    vault_document_write_execution_authorized_by_this_file: false,
    vault_document_uploads_executed: false,
    real_client_data_migration_approved: false,
    real_client_data_used: false,
    public_release_approved: false,
    company_wide_production_rollout_approved: false,
    external_pilot_distribution_approved: false,
    windows_authenticode_signing_approved: false
  }
});
checkMarkdown(findings, VAULT_WRITES_MD_PATH, vaultWritesMd, [
  "Status: pending-owner-decision",
  "Vault document writes: false",
  "Vault document write execution authorized by this file: false",
  "Vault document uploads executed: false",
  "Real client data migration: false"
]);

checkPendingDecisionIntake(findings, "MIGRATION", migration, {
  schemaVersion: "law-firm-os.matter-desktop-real-client-data-migration-decision-intake.v0.1",
  decisionGate: "real_client_data_migration",
  issueUrl: "https://github.com/Gonyak-cell/law-firm-os/issues/160",
  checkRuntime: false,
  requiredFields: [
    "decision_maker",
    "decision",
    "migration_scope",
    "client_population",
    "source_inventory_ref",
    "mapping_workbook_ref",
    "dry_run_receipt_ref",
    "vault_write_approval_ref",
    "rollback_plan_ref",
    "communications_owner",
    "decision_at",
    "approval_signature_ref",
    "recorded_by_human"
  ],
  allowedDecisions: ["approve_real_client_data_migration", "reject_real_client_data_migration", "request_changes"],
  boundary: {
    real_client_data_migration_approved: false,
    real_client_data_migration_execution_authorized_by_this_file: false,
    real_client_rows_migrated: 0,
    vault_document_writes_approved_by_this_file: false,
    vault_document_write_execution_authorized_by_this_file: false,
    public_release_approved: false,
    company_wide_production_rollout_approved: false,
    external_pilot_distribution_approved: false,
    windows_authenticode_signing_approved: false
  }
});
checkMarkdown(findings, MIGRATION_MD_PATH, migrationMd, [
  "Status: pending-owner-decision",
  "Real client data migration: false",
  "Real client rows migrated: 0",
  "Vault document writes approved by this file: false",
  "Vault document write execution authorized by this file: false"
]);

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-nonwindows-release-gates.validation.v0.1",
  generated_at: "2026-06-30T03:58:37Z",
  source_refs: [
    READINESS_JSON_PATH,
    READINESS_MD_PATH,
    VAULT_WRITES_JSON_PATH,
    VAULT_WRITES_MD_PATH,
    MIGRATION_JSON_PATH,
    MIGRATION_MD_PATH,
    RELEASE_RECEIPT_PATH,
    OWNER_RECEIPT_PATH,
    GO_LIVE_RECEIPT_PATH,
    HRX_SMOKE_PATH,
    LCX_SMOKE_PATH
  ],
  verdict,
  summary: {
    internal_prerelease_distribution_readiness_recorded: readiness.boundary?.internal_prerelease_distribution_readiness_recorded === true,
    vault_document_writes_pending_owner_decision: vaultWrites.status === "pending_owner_decision",
    real_client_data_migration_pending_owner_decision: migration.status === "pending_owner_decision",
    vault_document_writes_approved: vaultWrites.boundary?.vault_document_writes_approved === true,
    real_client_data_migration_approved: migration.boundary?.real_client_data_migration_approved === true,
    public_release_approved: false,
    external_pilot_distribution_approved: false,
    windows_authenticode_signing_approved: false,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop non-Windows release gates validation failed");
console.log(JSON.stringify(report, null, 2));
