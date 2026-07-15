#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
import {
  readDesktopReleaseArtifactStage,
  requireDesktopReleaseArtifact,
} from "./lib/matter-desktop-release-paths.mjs";

const ROOT = process.cwd();
const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
assert.equal(sourceIdentity.sourceDirty, false, "temporary release validation requires a clean product source");
if (process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA) {
  assert.equal(sourceIdentity.sourceSha, process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA);
}
const desktopPackage = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const releaseId = `matter-desktop-internal-${desktopPackage.version}`;
const releaseStage = readDesktopReleaseArtifactStage({
  repoRoot: ROOT,
  version: desktopPackage.version,
  sourceSha: sourceIdentity.sourceSha,
  channel: "internal",
});
const manifestPath = path.join(releaseStage.artifactRoot, "release-manifest.json");
const checksumPath = releaseStage.checksumsPath;
const receiptPath = path.join(ROOT, "docs/desktop/matter-desktop-temporary-release-receipt.md");
const macZip = requireDesktopReleaseArtifact(releaseStage.index, "macos_zip_archive");
const macDmg = requireDesktopReleaseArtifact(releaseStage.index, "macos_dmg_image");
const winManifest = requireDesktopReleaseArtifact(releaseStage.index, "windows_installer_manifest");
const winZip = requireDesktopReleaseArtifact(releaseStage.index, "windows_package_zip");

assert(existsSync(manifestPath), `missing release manifest: ${path.relative(ROOT, manifestPath)}`);
assert(existsSync(checksumPath), `missing checksums: ${path.relative(ROOT, checksumPath)}`);
assert(existsSync(receiptPath), `missing release receipt: ${path.relative(ROOT, receiptPath)}`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const checksums = readFileSync(checksumPath, "utf8");
const receipt = readFileSync(receiptPath, "utf8");

assert.equal(manifest.schema_version, "law-firm-os.matter-desktop-temporary-release.v0.1");
assert.equal(manifest.release_id, releaseId);
assert.equal(manifest.status, "internal_temporary_release_executed");
assert.equal(manifest.product_name, "matter");
assert.equal(manifest.package_name, "@law-firm-os/desktop");
assert.equal(manifest.source_sha, sourceIdentity.sourceSha);
assert.equal(manifest.source_tree, sourceIdentity.sourceTree);
assert.equal(manifest.source_dirty, false);
assert.equal(manifest.artifact_root, releaseStage.relativeRoot);
assert.equal(manifest.generic_build_paths_are_release_truth, false);
assert.equal(manifest.internal_app_id, "com.amic.matter.desktop.internal");
assert.equal(manifest.channel, "internal");
assert.equal(manifest.custom_domain_required, false);
assert.equal(manifest.public_release_claim, false);
assert.equal(manifest.production_go_live_claim, false);
assert.equal(manifest.owner_approval_claim, false);
assert.equal(manifest.app_store_distribution_claim, false);
assert.equal(manifest.microsoft_store_distribution_claim, false);
assert.equal(manifest.external_pilot_distribution_claim, false);
assert.deepEqual(
  manifest.macos_signing,
  {
    developer_id_signing: "applied",
    requested_signing_mode: "developer-id",
    resolved_signing_identity: manifest.macos_signing?.resolved_signing_identity,
    codesign_verify: "pass",
    strict_codesign_verify: "pass",
    gatekeeper_assess: "pass",
    public_distribution_approval: "not claimed",
    notarization_requested: "true",
    notarization_credential_source: "present",
    notarization_state: "submitted_and_accepted_by_notarytool",
  },
  "manifest must record current Developer ID signed and notarized release boundary",
);
assert.match(manifest.macos_signing.resolved_signing_identity, /^Developer ID Application:/);
assert.equal(manifest.artifacts.length, releaseStage.index.artifacts.length);

for (const stagedArtifact of releaseStage.index.artifacts) {
  const artifact = manifest.artifacts.find((candidate) => candidate.id === stagedArtifact.id);
  assert(artifact, `temporary release manifest is missing staged artifact: ${stagedArtifact.id}`);
  assert.equal(artifact.path, stagedArtifact.path);
  assert.equal(artifact.bytes, stagedArtifact.bytes);
  assert.equal(artifact.sha256, stagedArtifact.sha256);
  assert.equal(artifact.display_path, stagedArtifact.path);
  assert(checksums.includes(`${artifact.sha256}  ${artifact.path}`), `checksum entry missing for ${artifact.path}`);
}

const requiredReceiptPhrases = [
  "Status: internal-temporary-release-executed-with-artifacts",
  `Release ID | \`${releaseId}\``,
  `Source SHA | \`${sourceIdentity.sourceSha}\``,
  `Artifact root | \`${releaseStage.relativeRoot}\``,
  `Manifest | \`${releaseStage.relativeRoot}/release-manifest.json\``,
  "Custom domain requirement | false",
  `macOS ZIP archive | \`${macZip.path}\``,
  `macOS DMG image | \`${macDmg.path}\``,
  "Developer ID signing | applied",
  "notarization requested | true",
  "notarization credential source | present",
  "notarization state | submitted_and_accepted_by_notarytool",
  `Windows internal manifest | \`${winManifest.path}\``,
  `Windows unsigned package ZIP | \`${winZip.path}\``,
  "Public release: false",
  "Production go-live: false",
  "Owner approval: false",
];

for (const phrase of requiredReceiptPhrases) {
  assert(receipt.includes(phrase), `temporary release receipt missing phrase: ${phrase}`);
}

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      release_id: releaseId,
      artifact_count: manifest.artifacts.length,
      checksum_entries_verified: manifest.artifacts.length,
      source_sha: manifest.source_sha,
      artifact_root: manifest.artifact_root,
      custom_domain_required: false,
      public_release_claim: false,
      production_go_live_claim: false,
      owner_approval_claim: false,
    },
    null,
    2,
  ),
);
