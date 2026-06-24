#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const desktopPackage = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const version = desktopPackage.version;
const releaseId = `matter-desktop-v${version}`;
const manifestPath = path.join(ROOT, "apps/desktop/dist/release", releaseId, "release-manifest.json");
const checksumPath = path.join(ROOT, "apps/desktop/dist/release", releaseId, "checksums.sha256");
const receiptPath = path.join(ROOT, "docs/desktop/matter-desktop-formal-release-receipt.md");
const macosReceiptPath = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md");
const windowsReceiptPath = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readRequired(filePath) {
  assert(existsSync(filePath), `missing file: ${path.relative(ROOT, filePath)}`);
  return readFileSync(filePath, "utf8");
}

function receiptValue(source, label) {
  const prefix = `- ${label}:`;
  const line = source.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  assert(line, `missing receipt line: ${label}`);
  return line.slice(prefix.length).trim();
}

const manifest = JSON.parse(readRequired(manifestPath));
const checksums = readRequired(checksumPath);
const receipt = readRequired(receiptPath);
const macosReceipt = readRequired(macosReceiptPath);
const windowsReceipt = readRequired(windowsReceiptPath);

assert.equal(manifest.schema_version, "law-firm-os.matter-desktop-formal-release-candidate.v0.1");
assert.equal(manifest.release_id, releaseId);
assert.equal(manifest.status, "formal_release_candidate_generated");
assert.equal(manifest.product_name, "matter");
assert.equal(manifest.package_name, "@law-firm-os/desktop");
assert.equal(manifest.app_id, "com.amic.matter.desktop");
assert.equal(manifest.channel, "formal-candidate");
assert.equal(manifest.github_release_tag, `matter-desktop-v${version}`);
assert.equal(manifest.custom_domain_required, false);
assert.equal(manifest.public_release_claim, false);
assert.equal(manifest.production_go_live_claim, false);
assert.equal(manifest.owner_approval_claim, false);
assert.equal(manifest.actual_launch_go_live_claim, false);
assert.equal(manifest.app_store_distribution_claim, false);
assert.equal(manifest.microsoft_store_distribution_claim, false);
assert.equal(manifest.windows_authenticode_signing_claim, false);

assert.equal(receiptValue(macosReceipt, "Developer ID signing"), "applied");
assert.equal(receiptValue(macosReceipt, "requested signing mode"), "developer-id");
assert.match(receiptValue(macosReceipt, "resolved signing identity"), /^Developer ID Application:/);
assert.equal(receiptValue(macosReceipt, "codesign verify"), "pass");
assert.equal(receiptValue(macosReceipt, "strict codesign verify"), "pass");
assert.equal(receiptValue(macosReceipt, "gatekeeper assess"), "pass");
assert.equal(receiptValue(macosReceipt, "public distribution approval"), "not claimed");
assert.equal(receiptValue(macosReceipt, "notarization requested"), "true");
assert.equal(receiptValue(macosReceipt, "notarization credential source"), "present");
assert.equal(receiptValue(macosReceipt, "notarization state"), "submitted_and_accepted_by_notarytool");

assert(macosReceipt.includes("App ID: `com.amic.matter.desktop`"), "macOS receipt must use formal app id");
assert(macosReceipt.includes("Channel: `formal`"), "macOS receipt must record formal channel");
assert(windowsReceipt.includes("App ID: `com.amic.matter.desktop`"), "Windows receipt must use formal app id");
assert(windowsReceipt.includes("Channel: `formal`"), "Windows receipt must record formal channel");
assert(windowsReceipt.includes("Windows Authenticode signing: false"), "Windows formal candidate must not claim Authenticode signing");
assert.equal(manifest.artifacts.length, 7);

for (const artifact of manifest.artifacts) {
  const artifactPath = path.join(ROOT, artifact.path);
  assert(existsSync(artifactPath), `missing artifact in formal release manifest: ${artifact.path}`);
  assert.equal(artifact.sha256, sha256(artifactPath), `sha256 mismatch for ${artifact.path}`);
  assert(checksums.includes(`${artifact.sha256}  ${artifact.display_path}`), `checksum entry missing for ${artifact.display_path}`);
}

const requiredReceiptPhrases = [
  "Status: formal-release-candidate-generated",
  `Release ID | \`${releaseId}\``,
  `Manifest | \`apps/desktop/dist/release/${releaseId}/release-manifest.json\``,
  "Channel | `formal-candidate`",
  "App ID | `com.amic.matter.desktop`",
  "GitHub tag candidate | `matter-desktop-v0.1.0`",
  "macOS ZIP archive | `apps/desktop/dist/mac/matter-0.1.0-macos.zip`",
  "macOS DMG image | `apps/desktop/dist/mac/matter-0.1.0-macos.dmg`",
  "Windows formal manifest | `apps/desktop/dist/win/matter-0.1.0-win-installer-manifest.json`",
  "Developer ID signing | applied",
  "notarization requested | true",
  "notarization state | submitted_and_accepted_by_notarytool",
  "Windows Authenticode signing: false",
  "Public release: false",
  "Production go-live: false",
  "Owner approval: false",
  "Actual launch/go-live completed: false",
];

for (const phrase of requiredReceiptPhrases) {
  assert(receipt.includes(phrase), `formal release receipt missing phrase: ${phrase}`);
}

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      release_id: releaseId,
      artifact_count: manifest.artifacts.length,
      checksum_entries_verified: manifest.artifacts.length,
      app_id: manifest.app_id,
      channel: manifest.channel,
      public_release_claim: false,
      production_go_live_claim: false,
      owner_approval_claim: false,
      actual_launch_go_live_claim: false,
      windows_authenticode_signing_claim: false,
    },
    null,
    2,
  ),
);
