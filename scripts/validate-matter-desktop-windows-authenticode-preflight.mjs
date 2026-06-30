#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PREFLIGHT_JSON_PATH = "docs/desktop/matter-desktop-windows-authenticode-preflight-2026-06-30.json";
const PREFLIGHT_MD_PATH = "docs/desktop/matter-desktop-windows-authenticode-preflight-2026-06-30.md";
const LAZYCODEX_JSON_PATH = "docs/lazycodex/evidence/matter-desktop/artifacts/windows-authenticode-preflight-2026-06-30.json";
const WINDOWS_BUILD_RECEIPT_PATH = "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-windows-authenticode-preflight-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-windows-authenticode-preflight-validation.md";
const PACKAGE_DIR = "apps/desktop/dist/win/matter-0.1.0-win32-x64";
const EXE_PATH = "apps/desktop/dist/win/matter-0.1.0-win32-x64/matter.exe";
const ZIP_PATH = "apps/desktop/dist/win/matter-0.1.0-win32-x64-unsigned.zip";
const MANIFEST_PATH = "apps/desktop/dist/win/matter-0.1.0-win-installer-manifest.json";
const EXPECTED = {
  release: "matter-desktop-v0.1.0-lcx-vltui-20260630",
  exe_sha256: "30fd02e82aa5835cb82992fbce5a2738da1861773f1184f4f9d8f9d128db11fc",
  zip_sha256: "cecbf33a8fc2f42e1923339b245a725fd9de17fa5b1f7119d94ca1c0ec78e005",
  manifest_sha256: "843ad93b77937dc3155d4acfbfb27693183a7e3293dc6b54ebe4207d010e3ade",
  exe_bytes: 232313344,
  zip_bytes: 154046664,
  manifest_bytes: 811
};
const PLACEHOLDER_PATTERN = /<[^>]*>|\bTBD\b|\bTODO\b|placeholder|pending owner|pending approval/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function renderMarkdown(report) {
  const lines = [
    "# matter Desktop Windows Authenticode Preflight Validation",
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
  lines.push("- This validates a local unsigned Windows package candidate and the current Authenticode blocker.");
  lines.push("- It does not claim Windows Authenticode signing.");
  lines.push("- It does not claim Windows native install smoke.");
  lines.push("- It does not claim public release, Microsoft Store distribution, or company-wide rollout.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [
  PREFLIGHT_JSON_PATH,
  PREFLIGHT_MD_PATH,
  LAZYCODEX_JSON_PATH,
  WINDOWS_BUILD_RECEIPT_PATH,
  RELEASE_RECEIPT_PATH,
  PACKAGE_DIR,
  EXE_PATH,
  ZIP_PATH,
  MANIFEST_PATH
]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required Windows Authenticode preflight source reference is missing.", { path });
}

const preflight = existsSync(PREFLIGHT_JSON_PATH) ? readJson(PREFLIGHT_JSON_PATH) : {};
const preflightMd = existsSync(PREFLIGHT_MD_PATH) ? readText(PREFLIGHT_MD_PATH) : "";
const lazycodex = existsSync(LAZYCODEX_JSON_PATH) ? readJson(LAZYCODEX_JSON_PATH) : {};
const windowsBuild = existsSync(WINDOWS_BUILD_RECEIPT_PATH) ? readText(WINDOWS_BUILD_RECEIPT_PATH) : "";
const releaseReceipt = existsSync(RELEASE_RECEIPT_PATH) ? readJson(RELEASE_RECEIPT_PATH) : {};

if (preflight.schema_version !== "law-firm-os.matter-desktop-windows-authenticode-preflight.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected Windows Authenticode preflight schema version.", {
    actual: preflight.schema_version
  });
}
if (preflight.status !== "blocked_pending_authenticode_provider_and_windows_host") {
  addFinding(findings, "P1", "STATUS", "Windows Authenticode preflight must remain blocked until provider and Windows host receipts exist.", {
    actual: preflight.status
  });
}

const assetNames = (releaseReceipt.assets ?? []).map((asset) => asset.name);
const hasManifestAsset = assetNames.includes("matter-0.1.0-win-installer-manifest.json");
const hasInstallerAsset = assetNames.some((name) => /\.(exe|msi|msix|appx)$/i.test(name));
const hasWindowsPackageZipAsset = assetNames.some((name) => /win32-x64.*\.zip$/i.test(name));
if (!hasManifestAsset) addFinding(findings, "P1", "RELEASE_MANIFEST_ASSET_MISSING", "GitHub release receipt must still show the Windows manifest asset.", { assetNames });
if (hasInstallerAsset || hasWindowsPackageZipAsset) {
  addFinding(findings, "P1", "RELEASE_PACKAGE_ASSET_DRIFT", "Preflight expects current GitHub release to have no Windows installer/package asset yet.", {
    hasInstallerAsset,
    hasWindowsPackageZipAsset,
    assetNames
  });
}

if (existsSync(PACKAGE_DIR) && !statSync(PACKAGE_DIR).isDirectory()) addFinding(findings, "P1", "PACKAGE_DIR", "Windows package directory is not a directory.", {});
for (const [path, expectedHash, expectedBytes] of [
  [EXE_PATH, EXPECTED.exe_sha256, EXPECTED.exe_bytes],
  [ZIP_PATH, EXPECTED.zip_sha256, EXPECTED.zip_bytes],
  [MANIFEST_PATH, EXPECTED.manifest_sha256, EXPECTED.manifest_bytes]
]) {
  if (!existsSync(path)) continue;
  const fileStat = statSync(path);
  const actualHash = sha256(path);
  if (actualHash !== expectedHash || fileStat.size !== expectedBytes) {
    addFinding(findings, "P1", "PACKAGE_HASH_OR_SIZE", "Windows package candidate hash or size drifted.", {
      path,
      expectedHash,
      actualHash,
      expectedBytes,
      actualBytes: fileStat.size
    });
  }
}

if (!windowsBuild.includes("Windows unsigned package zip: `apps/desktop/dist/win/matter-0.1.0-win32-x64-unsigned.zip`")) {
  addFinding(findings, "P1", "WINDOWS_BUILD_RECEIPT_PACKAGE", "Windows build receipt must record the unsigned package zip.", {});
}
if (!windowsBuild.includes("Windows Authenticode signing: false") || !windowsBuild.includes("Windows native install smoke: not_run_on_darwin")) {
  addFinding(findings, "P1", "WINDOWS_BUILD_BOUNDARY", "Windows build receipt must preserve Authenticode and Windows-host smoke blockers.", {});
}

for (const [key, expected] of Object.entries({
  github_release_has_windows_installer_asset: false,
  github_release_has_windows_manifest_asset: true,
  local_windows_package_candidate_created: true,
  local_windows_package_candidate_uploaded_to_release: false
})) {
  if (preflight.answer_to_current_packaging_question?.[key] !== expected) {
    addFinding(findings, "P1", `PACKAGING_ANSWER_${key}`, "Packaging answer field drifted.", {
      expected,
      actual: preflight.answer_to_current_packaging_question?.[key]
    });
  }
}

for (const [key, expected] of Object.entries({
  authenticode_certificate_or_provider_selected: false,
  sanitized_signing_command_recorded: false,
  certificate_fingerprint_recorded: false,
  authenticode_verification_output_attached: false,
  windows_native_install_smoke_passed: false
})) {
  if (preflight.required_to_close_issue?.[key] !== expected) {
    addFinding(findings, "P1", `REQUIRED_TO_CLOSE_${key}`, "Required-to-close field must remain false until external evidence exists.", {
      expected,
      actual: preflight.required_to_close_issue?.[key]
    });
  }
}

for (const [key, expected] of Object.entries({
  windows_package_candidate_created: true,
  windows_authenticode_signing: false,
  public_release_approved: false,
  company_wide_production_go_live_approved: false,
  microsoft_store_distribution_approved: false,
  external_pilot_distribution_approved: false
})) {
  if (preflight.boundary?.[key] !== expected) {
    addFinding(findings, "P1", `BOUNDARY_${key}`, "Preflight boundary field drifted.", {
      expected,
      actual: preflight.boundary?.[key]
    });
  }
}
if (preflight.boundary?.windows_native_install_smoke !== "not_run_on_darwin") {
  addFinding(findings, "P1", "BOUNDARY_WINDOWS_NATIVE_SMOKE", "Windows native install smoke must remain not_run_on_darwin.", {
    actual: preflight.boundary?.windows_native_install_smoke
  });
}
if (lazycodex.current_packaging_answer?.local_windows_package_candidate_created !== true || lazycodex.boundary?.windows_authenticode_signing !== false) {
  addFinding(findings, "P1", "LAZYCODEX_SUMMARY", "LazyCodex summary must match the preflight boundary.", {
    current_packaging_answer: lazycodex.current_packaging_answer,
    boundary: lazycodex.boundary
  });
}
if (PLACEHOLDER_PATTERN.test(preflightMd)) {
  addFinding(findings, "P1", "MARKDOWN_PLACEHOLDER", "Windows Authenticode preflight markdown contains placeholder text.", {});
}
for (const phrase of [
  "GitHub release Windows installer asset: false",
  "Local Windows package candidate created: true",
  "Windows Authenticode signing: false",
  "Windows native install smoke: not_run_on_darwin"
]) {
  if (!preflightMd.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_BOUNDARY_MISSING", "Preflight markdown is missing a boundary phrase.", { phrase });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-windows-authenticode-preflight.validation.v0.1",
  generated_at: "2026-06-30T01:36:15Z",
  source_refs: [
    PREFLIGHT_JSON_PATH,
    PREFLIGHT_MD_PATH,
    LAZYCODEX_JSON_PATH,
    WINDOWS_BUILD_RECEIPT_PATH,
    RELEASE_RECEIPT_PATH,
    EXE_PATH,
    ZIP_PATH,
    MANIFEST_PATH
  ],
  verdict,
  summary: {
    github_release_has_windows_installer_asset: hasInstallerAsset,
    github_release_has_windows_package_zip_asset: hasWindowsPackageZipAsset,
    github_release_has_windows_manifest_asset: hasManifestAsset,
    local_windows_package_candidate_created: preflight.answer_to_current_packaging_question?.local_windows_package_candidate_created === true,
    windows_authenticode_signing: preflight.boundary?.windows_authenticode_signing === true,
    windows_native_install_smoke: preflight.boundary?.windows_native_install_smoke ?? null,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop Windows Authenticode preflight validation failed");
console.log(JSON.stringify(report, null, 2));
