#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  assertDesktopFormalBuildProvenance,
  readDesktopBuildSourceIdentity,
} from "./lib/matter-desktop-provenance.mjs";
import {
  readDesktopReleaseArtifactStage,
  requireDesktopReleaseArtifact,
} from "./lib/matter-desktop-release-paths.mjs";

const ROOT = process.cwd();
const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
assertDesktopFormalBuildProvenance({
  releaseChannel: "formal",
  sourceIdentity,
  expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
});
const desktopPackage = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const version = desktopPackage.version;
const defaultReleaseId = `matter-desktop-v${version}`;
const releaseId = process.env.MATTER_DESKTOP_GITHUB_RELEASE_TAG ?? defaultReleaseId;
const releaseStage = readDesktopReleaseArtifactStage({
  repoRoot: ROOT,
  version,
  sourceSha: sourceIdentity.sourceSha,
  channel: "formal",
});
const manifestPath = path.join(releaseStage.artifactRoot, "release-manifest.json");
const checksumPath = releaseStage.checksumsPath;
const receiptPath = path.join(ROOT, "docs/desktop/matter-desktop-formal-release-receipt.md");
const macZip = requireDesktopReleaseArtifact(releaseStage.index, "macos_zip_archive");
const macDmg = requireDesktopReleaseArtifact(releaseStage.index, "macos_dmg_image");
const winManifest = requireDesktopReleaseArtifact(releaseStage.index, "windows_installer_manifest");
const winZip = requireDesktopReleaseArtifact(releaseStage.index, "windows_package_zip");
const winInstaller = requireDesktopReleaseArtifact(releaseStage.index, "windows_installer");
const winBlockmap = requireDesktopReleaseArtifact(releaseStage.index, "windows_installer_blockmap");
const macosReceiptPath = path.join(
  ROOT,
  requireDesktopReleaseArtifact(releaseStage.index, "macos_build_receipt").path,
);
const windowsReceiptPath = path.join(
  ROOT,
  requireDesktopReleaseArtifact(releaseStage.index, "windows_build_receipt").path,
);

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
assert.equal(manifest.version, version);
assert.equal(manifest.source_sha, sourceIdentity.sourceSha);
assert.equal(manifest.source_tree, sourceIdentity.sourceTree);
assert.equal(manifest.source_dirty, false);
assert.equal(manifest.artifact_root, releaseStage.relativeRoot);
assert.equal(manifest.generic_build_paths_are_release_truth, false);
assert.equal(manifest.app_id, "com.amic.matter.desktop");
assert.equal(manifest.channel, "formal-candidate");
assert.equal(manifest.github_release_tag, releaseId);
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
assert.equal(receiptValue(macosReceipt, "DMG codesign verify"), "pass");
assert.equal(receiptValue(macosReceipt, "DMG notarization state"), "submitted_and_accepted_by_notarytool");
assert.equal(receiptValue(macosReceipt, "DMG stapler validate"), "pass");
assert.equal(receiptValue(macosReceipt, "DMG Gatekeeper assess"), "pass");
assert.equal(receiptValue(macosReceipt, "DMG image verify"), "pass");
assert.equal(manifest.macos_signing.dmg_codesign_verify, "pass");
assert.equal(manifest.macos_signing.dmg_notarization_state, "submitted_and_accepted_by_notarytool");
assert.equal(manifest.macos_signing.dmg_stapler_validate, "pass");
assert.equal(manifest.macos_signing.dmg_gatekeeper_assess, "pass");
assert.equal(manifest.macos_signing.dmg_image_verify, "pass");

assert(macosReceipt.includes("App ID: `com.amic.matter.desktop`"), "macOS receipt must use formal app id");
assert(macosReceipt.includes("Channel: `formal`"), "macOS receipt must record formal channel");
assert(windowsReceipt.includes("App ID: `com.amic.matter.desktop`"), "Windows receipt must use formal app id");
assert(windowsReceipt.includes("Channel: `formal`"), "Windows receipt must record formal channel");
assert(windowsReceipt.includes("Windows Authenticode signing: false"), "Windows formal candidate must not claim Authenticode signing");
assert.equal(manifest.artifacts.length, releaseStage.index.artifacts.length);

for (const stagedArtifact of releaseStage.index.artifacts) {
  const artifact = manifest.artifacts.find((candidate) => candidate.id === stagedArtifact.id);
  assert(artifact, `formal release manifest is missing staged artifact: ${stagedArtifact.id}`);
  assert.equal(artifact.path, stagedArtifact.path);
  assert.equal(artifact.bytes, stagedArtifact.bytes);
  assert.equal(artifact.sha256, stagedArtifact.sha256);
  assert.equal(artifact.display_path, stagedArtifact.path);
  assert(checksums.includes(`${artifact.sha256}  ${artifact.path}`), `checksum entry missing for ${artifact.path}`);
}

const requiredReceiptPhrases = [
  "Status: formal-release-candidate-generated",
  `Release ID | \`${releaseId}\``,
  `Source SHA | \`${sourceIdentity.sourceSha}\``,
  `Artifact root | \`${releaseStage.relativeRoot}\``,
  `Manifest | \`${releaseStage.relativeRoot}/release-manifest.json\``,
  "Channel | `formal-candidate`",
  "App ID | `com.amic.matter.desktop`",
  `GitHub tag candidate | \`${releaseId}\``,
  `macOS ZIP archive | \`${macZip.path}\``,
  `macOS DMG image | \`${macDmg.path}\``,
  `Windows formal manifest | \`${winManifest.path}\``,
  `Windows unsigned package ZIP | \`${winZip.path}\``,
  `Windows formal installer | \`${winInstaller.path}\``,
  `Windows installer blockmap | \`${winBlockmap.path}\``,
  "Developer ID signing | applied",
  "notarization requested | true",
  "notarization state | submitted_and_accepted_by_notarytool",
  "DMG codesign verify | pass",
  "DMG notarization state | submitted_and_accepted_by_notarytool",
  "DMG stapler validate | pass",
  "DMG Gatekeeper assess | pass",
  "DMG image verify | pass",
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
      source_sha: manifest.source_sha,
      artifact_root: manifest.artifact_root,
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
