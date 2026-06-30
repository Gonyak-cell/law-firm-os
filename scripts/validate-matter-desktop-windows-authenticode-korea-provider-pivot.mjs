#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_JSON_PATH = "docs/desktop/matter-desktop-windows-authenticode-korea-provider-pivot-2026-06-30.json";
const RECEIPT_MD_PATH = "docs/desktop/matter-desktop-windows-authenticode-korea-provider-pivot-2026-06-30.md";
const LAZYCODEX_JSON_PATH = "docs/lazycodex/evidence/matter-desktop/artifacts/windows-authenticode-korea-provider-pivot-2026-06-30.json";
const AZURE_VALIDATION_PATH = "docs/desktop/matter-desktop-windows-authenticode-azure-receipt-validation.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-windows-authenticode-korea-provider-pivot-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-windows-authenticode-korea-provider-pivot-validation.md";

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
    "# matter Desktop Windows Authenticode Korea Provider Pivot Validation",
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
  lines.push("- This validation records the Korea/Seoul provider pivot only.");
  lines.push("- It does not select or procure a certificate provider.");
  lines.push("- It does not allow signing execution.");
  lines.push("- It does not claim Windows Authenticode signing or Windows native install smoke.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [RECEIPT_JSON_PATH, RECEIPT_MD_PATH, LAZYCODEX_JSON_PATH, AZURE_VALIDATION_PATH]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required Korea provider pivot source reference is missing.", { path });
}

const receipt = existsSync(RECEIPT_JSON_PATH) ? readJson(RECEIPT_JSON_PATH) : {};
const receiptMd = existsSync(RECEIPT_MD_PATH) ? readText(RECEIPT_MD_PATH) : "";
const lazycodex = existsSync(LAZYCODEX_JSON_PATH) ? readJson(LAZYCODEX_JSON_PATH) : {};
const azureValidation = existsSync(AZURE_VALIDATION_PATH) ? readJson(AZURE_VALIDATION_PATH) : {};

if (receipt.schema_version !== "law-firm-os.matter-desktop-windows-authenticode-korea-provider-pivot.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected Korea provider pivot schema version.", { actual: receipt.schema_version });
}
if (receipt.status !== "external_provider_required_for_korea_seoul") {
  addFinding(findings, "P1", "STATUS", "Korea provider pivot must require an external provider.", { actual: receipt.status });
}
if (receipt.target_jurisdiction?.country !== "KR" || receipt.target_jurisdiction?.city !== "Seoul") {
  addFinding(findings, "P1", "TARGET_JURISDICTION", "Target jurisdiction must be Korea/Seoul.", {
    target_jurisdiction: receipt.target_jurisdiction
  });
}
if (receipt.azure_trusted_signing_assessment?.azure_public_identity_validation_viable_for_target_jurisdiction !== false) {
  addFinding(findings, "P1", "AZURE_VIABILITY", "Azure Public identity validation must remain non-viable for the Korea/Seoul lane.", {
    azure_trusted_signing_assessment: receipt.azure_trusted_signing_assessment
  });
}
if (!receipt.azure_trusted_signing_assessment?.portal_notice?.includes("USA, Canada, European Union & United Kingdom")) {
  addFinding(findings, "P1", "AZURE_PORTAL_NOTICE", "Receipt must preserve the Azure Portal jurisdiction notice.", {
    portal_notice: receipt.azure_trusted_signing_assessment?.portal_notice
  });
}
if (receipt.provider_strategy?.required_path !== "external_windows_authenticode_provider") {
  addFinding(findings, "P1", "REQUIRED_PATH", "Required path must be an external Windows Authenticode provider.", {
    required_path: receipt.provider_strategy?.required_path
  });
}
if (receipt.provider_strategy?.selection_state !== "not_selected") {
  addFinding(findings, "P1", "PROVIDER_SELECTION", "Provider must remain not selected until procurement evidence exists.", {
    selection_state: receipt.provider_strategy?.selection_state
  });
}
for (const provider of ["DigiCert", "GlobalSign", "Sectigo", "SSL.com"]) {
  if (!receipt.provider_strategy?.provider_candidates_for_procurement_review?.some((candidate) => candidate.name === provider)) {
    addFinding(findings, "P1", "PROVIDER_CANDIDATE_MISSING", "Provider candidate missing from procurement review.", { provider });
  }
}
for (const [key, expected] of Object.entries({
  azure_account_created: true,
  azure_public_identity_validation_viable_for_korea_seoul: false,
  external_provider_required: true,
  external_provider_selected: false,
  certificate_procured: false,
  certificate_fingerprint_recorded: false,
  signing_execution_allowed: false,
  windows_authenticode_signing: false,
  public_release_approved: false,
  microsoft_store_distribution_approved: false,
  external_pilot_distribution_approved: false,
  vault_document_writes_approved: false,
  real_client_data_migration_approved: false
})) {
  if (receipt.boundary?.[key] !== expected) {
    addFinding(findings, "P1", `BOUNDARY_${key}`, "Korea provider pivot boundary field drifted.", {
      expected,
      actual: receipt.boundary?.[key]
    });
  }
}
if (receipt.boundary?.windows_native_install_smoke !== "not_run") {
  addFinding(findings, "P1", "WINDOWS_NATIVE_SMOKE", "Windows native install smoke must remain not_run.", {
    actual: receipt.boundary?.windows_native_install_smoke
  });
}
if (lazycodex.boundary?.external_provider_required !== true || lazycodex.boundary?.external_provider_selected !== false) {
  addFinding(findings, "P1", "LAZYCODEX_BOUNDARY", "LazyCodex Korea provider pivot summary must match receipt boundary.", {
    boundary: lazycodex.boundary
  });
}
if (azureValidation.verdict !== "PASS" || azureValidation.summary?.portal_identity_validation_request_submitted !== false) {
  addFinding(findings, "P1", "AZURE_VALIDATION_BOUNDARY", "Azure validation must show the portal form was not submitted.", {
    verdict: azureValidation.verdict,
    summary: azureValidation.summary
  });
}
for (const phrase of [
  "Azure Public identity validation viable for Korea/Seoul: false",
  "External provider required: true",
  "External provider selected: false",
  "Certificate procured: false",
  "Signing execution allowed: false",
  "Windows Authenticode signing: false"
]) {
  if (!receiptMd.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_BOUNDARY_MISSING", "Korea provider pivot markdown is missing a required boundary phrase.", { phrase });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-windows-authenticode-korea-provider-pivot.validation.v0.1",
  generated_at: "2026-06-30T02:45:00Z",
  source_refs: [RECEIPT_JSON_PATH, RECEIPT_MD_PATH, LAZYCODEX_JSON_PATH, AZURE_VALIDATION_PATH],
  verdict,
  summary: {
    target_jurisdiction: `${receipt.target_jurisdiction?.country ?? "unknown"}/${receipt.target_jurisdiction?.city ?? "unknown"}`,
    azure_public_identity_validation_viable_for_korea_seoul: receipt.boundary?.azure_public_identity_validation_viable_for_korea_seoul === true,
    external_provider_required: receipt.boundary?.external_provider_required === true,
    external_provider_selected: receipt.boundary?.external_provider_selected === true,
    certificate_procured: receipt.boundary?.certificate_procured === true,
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

assert.equal(verdict, "PASS", "matter desktop Windows Authenticode Korea provider pivot validation failed");
console.log(JSON.stringify(report, null, 2));
