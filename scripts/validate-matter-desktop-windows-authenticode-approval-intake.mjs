#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const INTAKE_JSON_PATH = "docs/desktop/matter-desktop-windows-authenticode-approval-intake-2026-06-30.json";
const INTAKE_MD_PATH = "docs/desktop/matter-desktop-windows-authenticode-approval-intake-2026-06-30.md";
const LAZYCODEX_JSON_PATH = "docs/lazycodex/evidence/matter-desktop/artifacts/windows-authenticode-approval-intake-2026-06-30.json";
const PREFLIGHT_VALIDATION_PATH = "docs/desktop/matter-desktop-windows-authenticode-preflight-validation.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-windows-authenticode-approval-intake-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-windows-authenticode-approval-intake-validation.md";

const PLACEHOLDER_PATTERN = /^<[^>]+>$/;
const REQUIRED_PLACEHOLDER_FIELDS = ["signing_provider_or_certificate", "certificate_fingerprint", "windows_host"];

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
    "# matter Desktop Windows Authenticode Approval Intake Validation",
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
  lines.push("- This validation confirms the submitted Authenticode approval input is blocked by placeholder fields.");
  lines.push("- It does not allow signing execution.");
  lines.push("- It does not claim Windows Authenticode signing or Windows native install smoke.");
  lines.push("- It does not claim public release, Microsoft Store distribution, external pilot distribution, Vault document writes, or real client data migration.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [INTAKE_JSON_PATH, INTAKE_MD_PATH, LAZYCODEX_JSON_PATH, PREFLIGHT_VALIDATION_PATH]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required Authenticode approval intake source reference is missing.", { path });
}

const intake = existsSync(INTAKE_JSON_PATH) ? readJson(INTAKE_JSON_PATH) : {};
const intakeMd = existsSync(INTAKE_MD_PATH) ? readText(INTAKE_MD_PATH) : "";
const lazycodex = existsSync(LAZYCODEX_JSON_PATH) ? readJson(LAZYCODEX_JSON_PATH) : {};
const preflight = existsSync(PREFLIGHT_VALIDATION_PATH) ? readJson(PREFLIGHT_VALIDATION_PATH) : {};

if (intake.schema_version !== "law-firm-os.matter-desktop-windows-authenticode-approval-intake.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected Authenticode approval intake schema version.", {
    actual: intake.schema_version
  });
}
if (intake.status !== "blocked_placeholder_authenticode_approval_input") {
  addFinding(findings, "P1", "STATUS", "Approval intake must remain blocked while signing inputs are placeholders.", {
    actual: intake.status
  });
}
for (const field of REQUIRED_PLACEHOLDER_FIELDS) {
  const value = intake.submitted_approval_text?.[field];
  if (!PLACEHOLDER_PATTERN.test(String(value ?? ""))) {
    addFinding(findings, "P0", "PLACEHOLDER_FIELD_NOT_BLOCKED", "Required Authenticode input is no longer a placeholder; replace this blocked intake with a real signing receipt flow.", {
      field,
      value
    });
  }
  if (!(intake.placeholder_fields ?? []).includes(field)) {
    addFinding(findings, "P1", "PLACEHOLDER_FIELD_MISSING", "Blocked intake does not list a required placeholder field.", { field });
  }
}
if (intake.environment_discovery?.repo_authenticode_provider_config_found !== false || intake.environment_discovery?.repo_windows_signing_workflow_found !== false) {
  addFinding(findings, "P1", "DISCOVERY_DRIFT", "Environment discovery must reflect that no repo signing provider/workflow was found.", {
    environment_discovery: intake.environment_discovery
  });
}
if (preflight.verdict !== "PASS" || preflight.summary?.local_windows_package_candidate_created !== true || preflight.summary?.windows_authenticode_signing !== false) {
  addFinding(findings, "P1", "PREFLIGHT_NOT_READY", "Windows package preflight must pass while Authenticode remains false.", {
    verdict: preflight.verdict,
    summary: preflight.summary
  });
}
for (const [key, expected] of Object.entries({
  approval_input_recorded: true,
  approval_input_is_actionable: false,
  signing_execution_allowed: false,
  windows_authenticode_signing: false,
  public_release_approved: false,
  microsoft_store_distribution_approved: false,
  external_pilot_distribution_approved: false,
  vault_document_writes_approved: false,
  real_client_data_migration_approved: false
})) {
  if (intake.boundary?.[key] !== expected) {
    addFinding(findings, "P1", `BOUNDARY_${key}`, "Approval intake boundary field drifted.", {
      expected,
      actual: intake.boundary?.[key]
    });
  }
}
if (intake.boundary?.windows_native_install_smoke !== "not_run") {
  addFinding(findings, "P1", "BOUNDARY_WINDOWS_NATIVE_SMOKE", "Windows native install smoke must remain not_run.", {
    actual: intake.boundary?.windows_native_install_smoke
  });
}
if (lazycodex.boundary?.approval_input_is_actionable !== false || lazycodex.boundary?.signing_execution_allowed !== false) {
  addFinding(findings, "P1", "LAZYCODEX_BOUNDARY", "LazyCodex summary must preserve blocked signing boundary.", {
    boundary: lazycodex.boundary
  });
}
for (const phrase of [
  "Status: blocked-placeholder-authenticode-approval-input",
  "Approval input actionable: false",
  "Signing execution allowed: false",
  "Windows Authenticode signing: false"
]) {
  if (!intakeMd.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_BOUNDARY_MISSING", "Approval intake markdown is missing a required boundary phrase.", { phrase });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-windows-authenticode-approval-intake.validation.v0.1",
  generated_at: "2026-06-30T01:51:02Z",
  source_refs: [INTAKE_JSON_PATH, INTAKE_MD_PATH, LAZYCODEX_JSON_PATH, PREFLIGHT_VALIDATION_PATH],
  verdict,
  summary: {
    approval_input_recorded: intake.boundary?.approval_input_recorded === true,
    approval_input_is_actionable: intake.boundary?.approval_input_is_actionable === true,
    signing_execution_allowed: intake.boundary?.signing_execution_allowed === true,
    placeholder_field_count: REQUIRED_PLACEHOLDER_FIELDS.length,
    windows_authenticode_signing: intake.boundary?.windows_authenticode_signing === true,
    windows_native_install_smoke: intake.boundary?.windows_native_install_smoke ?? null,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop Windows Authenticode approval intake validation failed");
console.log(JSON.stringify(report, null, 2));
