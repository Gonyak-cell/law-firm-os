#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_JSON_PATH = "docs/desktop/matter-desktop-windows-authenticode-azure-receipt-2026-06-30.json";
const RECEIPT_MD_PATH = "docs/desktop/matter-desktop-windows-authenticode-azure-receipt-2026-06-30.md";
const LAZYCODEX_JSON_PATH = "docs/lazycodex/evidence/matter-desktop/artifacts/windows-authenticode-azure-receipt-2026-06-30.json";
const APPROVAL_VALIDATION_PATH = "docs/desktop/matter-desktop-windows-authenticode-approval-intake-validation.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-windows-authenticode-azure-receipt-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-windows-authenticode-azure-receipt-validation.md";

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
    "# matter Desktop Windows Authenticode Azure Receipt Validation",
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
  lines.push("- This validation records Azure Trusted Signing account creation only.");
  lines.push("- It does not claim certificate profile creation or identity validation completion.");
  lines.push("- It does not allow signing execution.");
  lines.push("- It does not claim Windows Authenticode signing or Windows native install smoke.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [RECEIPT_JSON_PATH, RECEIPT_MD_PATH, LAZYCODEX_JSON_PATH, APPROVAL_VALIDATION_PATH]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required Azure Authenticode source reference is missing.", { path });
}

const receipt = existsSync(RECEIPT_JSON_PATH) ? readJson(RECEIPT_JSON_PATH) : {};
const receiptMd = existsSync(RECEIPT_MD_PATH) ? readText(RECEIPT_MD_PATH) : "";
const lazycodex = existsSync(LAZYCODEX_JSON_PATH) ? readJson(LAZYCODEX_JSON_PATH) : {};
const approvalValidation = existsSync(APPROVAL_VALIDATION_PATH) ? readJson(APPROVAL_VALIDATION_PATH) : {};

if (receipt.schema_version !== "law-firm-os.matter-desktop-windows-authenticode-azure-receipt.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected Azure Authenticode receipt schema version.", { actual: receipt.schema_version });
}
if (receipt.status !== "trusted_signing_account_created_pending_identity_validation") {
  addFinding(findings, "P1", "STATUS", "Azure receipt must remain pending identity validation.", { actual: receipt.status });
}
for (const [key, expected] of Object.entries({
  resource_group: "amic-platform-rg",
  location: "Korea Central",
  provider_namespace: "Microsoft.CodeSigning",
  provider_registration_state: "Registered",
  trusted_signing_account_name: "lawosmattersigning",
  trusted_signing_account_uri: "https://krc.codesigning.azure.net/",
  trusted_signing_account_sku: "Basic",
  trusted_signing_account_provisioning_state: "Succeeded"
})) {
  if (receipt.azure?.[key] !== expected) {
    addFinding(findings, "P1", `AZURE_${key}`, "Azure receipt field drifted.", {
      expected,
      actual: receipt.azure?.[key]
    });
  }
}
if (receipt.current_certificate_profiles?.length !== 0) {
  addFinding(findings, "P1", "CERTIFICATE_PROFILE_LIST", "Receipt must record no current certificate profiles yet.", {
    current_certificate_profiles: receipt.current_certificate_profiles
  });
}
if (receipt.certificate_profile_attempt?.result !== "blocked" || receipt.certificate_profile_attempt?.error_code !== "BadResourceOperation") {
  addFinding(findings, "P1", "PROFILE_ATTEMPT", "Certificate profile attempt must record identity-validation blocker.", {
    certificate_profile_attempt: receipt.certificate_profile_attempt
  });
}
for (const [key, expected] of Object.entries({
  azure_cli_installed: true,
  azure_cli_logged_in: true,
  code_signing_provider_registered: true,
  trusted_signing_account_created: true,
  artifact_signing_identity_verifier_role_assigned: true,
  artifact_signing_certificate_profile_signer_role_assigned: true,
  certificate_profile_created: false,
  identity_validation_completed: false,
  signing_execution_allowed: false,
  windows_authenticode_signing: false,
  public_release_approved: false,
  microsoft_store_distribution_approved: false,
  external_pilot_distribution_approved: false,
  vault_document_writes_approved: false,
  real_client_data_migration_approved: false
})) {
  if (receipt.boundary?.[key] !== expected) {
    addFinding(findings, "P1", `BOUNDARY_${key}`, "Azure receipt boundary field drifted.", {
      expected,
      actual: receipt.boundary?.[key]
    });
  }
}
if (receipt.boundary?.windows_native_install_smoke !== "not_run") {
  addFinding(findings, "P1", "BOUNDARY_WINDOWS_NATIVE_SMOKE", "Windows native install smoke must remain not_run.", {
    actual: receipt.boundary?.windows_native_install_smoke
  });
}
if (lazycodex.boundary?.trusted_signing_account_created !== true || lazycodex.boundary?.certificate_profile_created !== false) {
  addFinding(findings, "P1", "LAZYCODEX_BOUNDARY", "LazyCodex Azure summary must match receipt boundary.", {
    boundary: lazycodex.boundary
  });
}
for (const role of ["Artifact Signing Identity Verifier", "Artifact Signing Certificate Profile Signer"]) {
  if (!receipt.role_assignments?.some((assignment) => assignment.role === role)) {
    addFinding(findings, "P1", "ROLE_ASSIGNMENT_MISSING", "Azure receipt is missing a required role assignment.", { role });
  }
}
if (approvalValidation.verdict !== "PASS" || approvalValidation.summary?.signing_execution_allowed !== false) {
  addFinding(findings, "P1", "APPROVAL_INTAKE_BOUNDARY", "Approval intake must still block signing execution.", {
    verdict: approvalValidation.verdict,
    summary: approvalValidation.summary
  });
}
for (const phrase of [
  "Trusted Signing account | `lawosmattersigning`",
  "Artifact Signing Identity Verifier role assigned: true",
  "Artifact Signing Certificate Profile Signer role assigned: true",
  "Certificate profile created: false",
  "Identity validation completed: false",
  "Signing execution allowed: false",
  "Windows Authenticode signing: false"
]) {
  if (!receiptMd.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_BOUNDARY_MISSING", "Azure receipt markdown is missing a required boundary phrase.", { phrase });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-windows-authenticode-azure-receipt.validation.v0.1",
  generated_at: "2026-06-30T02:15:08Z",
  source_refs: [RECEIPT_JSON_PATH, RECEIPT_MD_PATH, LAZYCODEX_JSON_PATH, APPROVAL_VALIDATION_PATH],
  verdict,
  summary: {
    code_signing_provider_registered: receipt.boundary?.code_signing_provider_registered === true,
    trusted_signing_account_created: receipt.boundary?.trusted_signing_account_created === true,
    artifact_signing_identity_verifier_role_assigned: receipt.boundary?.artifact_signing_identity_verifier_role_assigned === true,
    artifact_signing_certificate_profile_signer_role_assigned: receipt.boundary?.artifact_signing_certificate_profile_signer_role_assigned === true,
    certificate_profile_created: receipt.boundary?.certificate_profile_created === true,
    identity_validation_completed: receipt.boundary?.identity_validation_completed === true,
    signing_execution_allowed: receipt.boundary?.signing_execution_allowed === true,
    windows_authenticode_signing: receipt.boundary?.windows_authenticode_signing === true,
    windows_native_install_smoke: receipt.boundary?.windows_native_install_smoke ?? null,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop Windows Authenticode Azure receipt validation failed");
console.log(JSON.stringify(report, null, 2));
