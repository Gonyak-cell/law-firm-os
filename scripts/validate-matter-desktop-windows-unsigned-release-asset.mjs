#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RECEIPT_JSON_PATH = "docs/desktop/matter-desktop-windows-unsigned-release-asset-2026-06-30.json";
const RECEIPT_MD_PATH = "docs/desktop/matter-desktop-windows-unsigned-release-asset-2026-06-30.md";
const LAZYCODEX_JSON_PATH = "docs/lazycodex/evidence/matter-desktop/artifacts/windows-unsigned-release-asset-2026-06-30.json";
const RELEASE_RECEIPT_PATH = "docs/desktop/matter-desktop-lcx-vltui-github-release-receipt-2026-06-30.json";
const PREFLIGHT_VALIDATION_PATH = "docs/desktop/matter-desktop-windows-authenticode-preflight-validation.json";
const ZIP_PATH = "apps/desktop/dist/win/matter-0.1.0-win32-x64-unsigned.zip";
const EXE_PATH = "apps/desktop/dist/win/matter-0.1.0-win32-x64/matter.exe";
const VALIDATION_JSON_PATH = "docs/desktop/matter-desktop-windows-unsigned-release-asset-validation.json";
const VALIDATION_MD_PATH = "docs/desktop/matter-desktop-windows-unsigned-release-asset-validation.md";

const EXPECTED = {
  release: "matter-desktop-v0.1.0-lcx-vltui-20260630",
  asset_name: "matter-0.1.0-win32-x64-unsigned.zip",
  asset_size: 154046664,
  asset_digest: "sha256:cecbf33a8fc2f42e1923339b245a725fd9de17fa5b1f7119d94ca1c0ec78e005",
  zip_sha256: "cecbf33a8fc2f42e1923339b245a725fd9de17fa5b1f7119d94ca1c0ec78e005",
  exe_sha256: "30fd02e82aa5835cb82992fbce5a2738da1861773f1184f4f9d8f9d128db11fc",
  release_manifest_digest: "sha256:2796b504b4cb39502c805f491ebdb85476eca04cd29eda2dd53d29136a9649fc",
  checksums_digest: "sha256:bdc35ada28c03b10a76ab082c09295508bcfba6550e68bb3afe376e557555e3b"
};

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
    "# matter Desktop Windows Unsigned Release Asset Validation",
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
  lines.push("- This validation proves the unsigned Windows package release asset only.");
  lines.push("- It does not claim Windows Authenticode signing.");
  lines.push("- It does not claim Windows native install smoke.");
  lines.push("- It does not approve public release, Microsoft Store distribution, external pilot, Vault writes, or real client data migration.");
  return `${lines.join("\n")}\n`;
}

const findings = [];
for (const path of [RECEIPT_JSON_PATH, RECEIPT_MD_PATH, LAZYCODEX_JSON_PATH, RELEASE_RECEIPT_PATH, PREFLIGHT_VALIDATION_PATH, ZIP_PATH, EXE_PATH]) {
  if (!existsSync(path)) addFinding(findings, "P1", "SOURCE_REF_MISSING", "Required Windows unsigned release asset source reference is missing.", { path });
}

const receipt = existsSync(RECEIPT_JSON_PATH) ? readJson(RECEIPT_JSON_PATH) : {};
const receiptMd = existsSync(RECEIPT_MD_PATH) ? readText(RECEIPT_MD_PATH) : "";
const lazycodex = existsSync(LAZYCODEX_JSON_PATH) ? readJson(LAZYCODEX_JSON_PATH) : {};
const releaseReceipt = existsSync(RELEASE_RECEIPT_PATH) ? readJson(RELEASE_RECEIPT_PATH) : {};
const preflightValidation = existsSync(PREFLIGHT_VALIDATION_PATH) ? readJson(PREFLIGHT_VALIDATION_PATH) : {};

if (receipt.schema_version !== "law-firm-os.matter-desktop-windows-unsigned-release-asset.v0.1") {
  addFinding(findings, "P1", "SCHEMA_VERSION", "Unexpected Windows unsigned release asset schema version.", { actual: receipt.schema_version });
}
if (receipt.status !== "unsigned_windows_package_uploaded_to_prerelease") {
  addFinding(findings, "P1", "STATUS", "Receipt must record the unsigned Windows package asset as uploaded to prerelease.", { actual: receipt.status });
}

const releaseAsset = (releaseReceipt.assets ?? []).find((asset) => asset.name === EXPECTED.asset_name);
for (const [key, expected] of Object.entries({
  name: EXPECTED.asset_name,
  size: EXPECTED.asset_size,
  digest: EXPECTED.asset_digest,
  state: "uploaded"
})) {
  if (releaseAsset?.[key] !== expected) {
    addFinding(findings, "P1", `RELEASE_ASSET_${key}`, "GitHub release receipt unsigned Windows asset field drifted.", {
      expected,
      actual: releaseAsset?.[key]
    });
  }
}
for (const [assetName, expectedDigest] of Object.entries({
  "release-manifest.json": EXPECTED.release_manifest_digest,
  "checksums.sha256": EXPECTED.checksums_digest
})) {
  const asset = (releaseReceipt.assets ?? []).find((candidate) => candidate.name === assetName);
  if (asset?.digest !== expectedDigest) {
    addFinding(findings, "P1", "RELEASE_MANIFEST_ASSET_DIGEST", "Release manifest/checksum asset digest drifted.", {
      assetName,
      expectedDigest,
      actualDigest: asset?.digest
    });
  }
}

if (existsSync(ZIP_PATH)) {
  const fileStat = statSync(ZIP_PATH);
  const actualHash = sha256(ZIP_PATH);
  if (fileStat.size !== EXPECTED.asset_size || actualHash !== EXPECTED.zip_sha256) {
    addFinding(findings, "P1", "LOCAL_ZIP_DRIFT", "Local unsigned Windows package zip differs from the release asset receipt.", {
      expectedSize: EXPECTED.asset_size,
      actualSize: fileStat.size,
      expectedHash: EXPECTED.zip_sha256,
      actualHash
    });
  }
}
if (existsSync(EXE_PATH) && sha256(EXE_PATH) !== EXPECTED.exe_sha256) {
  addFinding(findings, "P1", "LOCAL_EXE_DRIFT", "Local Windows executable hash drifted.", {
    expectedHash: EXPECTED.exe_sha256,
    actualHash: sha256(EXE_PATH)
  });
}

if (preflightValidation.verdict !== "PASS" || preflightValidation.summary?.github_release_has_windows_package_zip_asset !== true) {
  addFinding(findings, "P1", "PREFLIGHT_BOUNDARY", "Preflight validation must pass with the unsigned Windows package asset present.", {
    verdict: preflightValidation.verdict,
    summary: preflightValidation.summary
  });
}
if (lazycodex.boundary?.unsigned_windows_package_uploaded_to_release !== true || lazycodex.boundary?.windows_authenticode_signing !== false) {
  addFinding(findings, "P1", "LAZYCODEX_BOUNDARY", "LazyCodex unsigned release asset summary must preserve signing boundary.", {
    boundary: lazycodex.boundary
  });
}
for (const [key, expected] of Object.entries({
  unsigned_windows_package_uploaded_to_release: true,
  windows_authenticode_signing: false,
  certificate_procured: false,
  certificate_fingerprint_recorded: false,
  public_release_approved: false,
  microsoft_store_distribution_approved: false,
  external_pilot_distribution_approved: false,
  vault_document_writes_approved: false,
  real_client_data_migration_approved: false
})) {
  if (receipt.boundary?.[key] !== expected) {
    addFinding(findings, "P1", `BOUNDARY_${key}`, "Windows unsigned release asset boundary field drifted.", {
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
for (const phrase of [
  "Unsigned Windows package uploaded to release: true",
  "Windows Authenticode signing: false",
  "Windows native install smoke: not_run",
  "Public release: false"
]) {
  if (!receiptMd.includes(phrase)) addFinding(findings, "P1", "MARKDOWN_BOUNDARY_MISSING", "Windows unsigned release asset markdown is missing a required boundary phrase.", { phrase });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.matter-desktop-windows-unsigned-release-asset.validation.v0.1",
  generated_at: "2026-06-30T02:50:54Z",
  source_refs: [RECEIPT_JSON_PATH, RECEIPT_MD_PATH, LAZYCODEX_JSON_PATH, RELEASE_RECEIPT_PATH, PREFLIGHT_VALIDATION_PATH, ZIP_PATH, EXE_PATH],
  verdict,
  summary: {
    release: EXPECTED.release,
    unsigned_windows_package_uploaded_to_release: receipt.boundary?.unsigned_windows_package_uploaded_to_release === true,
    windows_authenticode_signing: receipt.boundary?.windows_authenticode_signing === true,
    windows_native_install_smoke: receipt.boundary?.windows_native_install_smoke ?? null,
    public_release_approved: receipt.boundary?.public_release_approved === true,
    finding_count: findings.length
  },
  findings
};

mkdirSync(dirname(VALIDATION_JSON_PATH), { recursive: true });
writeFileSync(VALIDATION_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(VALIDATION_MD_PATH, renderMarkdown(report));

assert.equal(verdict, "PASS", "matter desktop Windows unsigned release asset validation failed");
console.log(JSON.stringify(report, null, 2));
