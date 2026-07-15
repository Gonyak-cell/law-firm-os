#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
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
const desktopPackage = JSON.parse(await readFile(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const version = desktopPackage.version;
const defaultReleaseId = `matter-desktop-v${version}`;
const releaseId = process.env.MATTER_DESKTOP_GITHUB_RELEASE_TAG ?? defaultReleaseId;
const releaseStage = readDesktopReleaseArtifactStage({
  repoRoot: ROOT,
  version,
  sourceSha: sourceIdentity.sourceSha,
  channel: "formal",
});
const releaseRoot = releaseStage.artifactRoot;
const releaseRelativeRoot = releaseStage.relativeRoot;
const manifestPath = path.join(releaseRoot, "release-manifest.json");
const checksumPath = path.join(releaseRoot, "checksums.sha256");
const receiptPath = path.join(ROOT, "docs/desktop/matter-desktop-formal-release-receipt.md");
const artifactRecords = releaseStage.index.artifacts.map((artifact) => ({
  ...artifact,
  display_path: artifact.path,
}));
const macZip = requireDesktopReleaseArtifact(releaseStage.index, "macos_zip_archive");
const macDmg = requireDesktopReleaseArtifact(releaseStage.index, "macos_dmg_image");
const winManifest = requireDesktopReleaseArtifact(releaseStage.index, "windows_installer_manifest");
const winZip = requireDesktopReleaseArtifact(releaseStage.index, "windows_package_zip");
const winInstaller = requireDesktopReleaseArtifact(releaseStage.index, "windows_installer");
const winBlockmap = requireDesktopReleaseArtifact(releaseStage.index, "windows_installer_blockmap");
const macosBuildReceiptPath = path.join(
  ROOT,
  requireDesktopReleaseArtifact(releaseStage.index, "macos_build_receipt").path,
);
const windowsBuildReceiptPath = path.join(
  ROOT,
  requireDesktopReleaseArtifact(releaseStage.index, "windows_build_receipt").path,
);

function receiptValue(source, label) {
  const prefix = `- ${label}:`;
  const line = source.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  return line?.slice(prefix.length).trim() ?? "missing";
}

const macosBuildReceipt = await readFile(macosBuildReceiptPath, "utf8");
const windowsBuildReceipt = await readFile(windowsBuildReceiptPath, "utf8");
const macosSigning = {
  developer_id_signing: receiptValue(macosBuildReceipt, "Developer ID signing"),
  requested_signing_mode: receiptValue(macosBuildReceipt, "requested signing mode"),
  resolved_signing_identity: receiptValue(macosBuildReceipt, "resolved signing identity"),
  codesign_verify: receiptValue(macosBuildReceipt, "codesign verify"),
  strict_codesign_verify: receiptValue(macosBuildReceipt, "strict codesign verify"),
  gatekeeper_assess: receiptValue(macosBuildReceipt, "gatekeeper assess"),
  public_distribution_approval: receiptValue(macosBuildReceipt, "public distribution approval"),
  notarization_requested: receiptValue(macosBuildReceipt, "notarization requested"),
  notarization_credential_source: receiptValue(macosBuildReceipt, "notarization credential source"),
  notarization_state: receiptValue(macosBuildReceipt, "notarization state"),
  dmg_codesign_verify: receiptValue(macosBuildReceipt, "DMG codesign verify"),
  dmg_notarization_state: receiptValue(macosBuildReceipt, "DMG notarization state"),
  dmg_stapler_validate: receiptValue(macosBuildReceipt, "DMG stapler validate"),
  dmg_gatekeeper_assess: receiptValue(macosBuildReceipt, "DMG Gatekeeper assess"),
  dmg_image_verify: receiptValue(macosBuildReceipt, "DMG image verify"),
};

const manifest = {
  schema_version: "law-firm-os.matter-desktop-formal-release-candidate.v0.1",
  release_id: releaseId,
  status: "formal_release_candidate_generated",
  generated_at: new Date().toISOString(),
  product_name: "matter",
  package_name: desktopPackage.name,
  version,
  source_sha: sourceIdentity.sourceSha,
  source_tree: sourceIdentity.sourceTree,
  source_dirty: false,
  artifact_root: releaseRelativeRoot,
  generic_build_paths_are_release_truth: false,
  app_id: "com.amic.matter.desktop",
  channel: "formal-candidate",
  custom_domain_required: false,
  github_release_tag: releaseId,
  public_release_claim: false,
  production_go_live_claim: false,
  owner_approval_claim: false,
  actual_launch_go_live_claim: false,
  app_store_distribution_claim: false,
  microsoft_store_distribution_claim: false,
  windows_authenticode_signing_claim: false,
  macos_signing: macosSigning,
  artifacts: artifactRecords,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  checksumPath,
  artifactRecords.map((artifact) => `${artifact.sha256}  ${artifact.path}`).join("\n") + "\n",
);

const releaseReceipt = `# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub prerelease candidate. Publication as a prerelease does not claim public stable release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | \`${releaseId}\` |
| Source SHA | \`${sourceIdentity.sourceSha}\` |
| Artifact root | \`${releaseRelativeRoot}\` |
| Manifest | \`${releaseRelativeRoot}/release-manifest.json\` |
| Checksums | \`${releaseRelativeRoot}/checksums.sha256\` |
| Channel | \`formal-candidate\` |
| App ID | \`com.amic.matter.desktop\` |
| GitHub tag candidate | \`${releaseId}\` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS ZIP archive | \`${macZip.path}\` |
| macOS ZIP SHA-256 | \`${macZip.sha256}\` |
| macOS DMG image | \`${macDmg.path}\` |
| macOS DMG SHA-256 | \`${macDmg.sha256}\` |
| Windows formal manifest | \`${winManifest.path}\` |
| Windows formal manifest SHA-256 | \`${winManifest.sha256}\` |
| Windows unsigned package ZIP | \`${winZip.path}\` |
| Windows unsigned package ZIP SHA-256 | \`${winZip.sha256}\` |
| Windows formal installer | \`${winInstaller.path}\` |
| Windows formal installer SHA-256 | \`${winInstaller.sha256}\` |
| Windows installer blockmap | \`${winBlockmap.path}\` |
| Windows installer blockmap SHA-256 | \`${winBlockmap.sha256}\` |

## macOS Signing and Notarization

| Field | Value |
| --- | --- |
| Developer ID signing | ${macosSigning.developer_id_signing} |
| Requested signing mode | \`${macosSigning.requested_signing_mode}\` |
| Resolved signing identity | \`${macosSigning.resolved_signing_identity}\` |
| codesign verify | ${macosSigning.codesign_verify} |
| strict codesign verify | ${macosSigning.strict_codesign_verify} |
| gatekeeper assess | ${macosSigning.gatekeeper_assess} |
| public distribution approval | ${macosSigning.public_distribution_approval} |
| notarization requested | ${macosSigning.notarization_requested} |
| notarization credential source | ${macosSigning.notarization_credential_source} |
| notarization state | ${macosSigning.notarization_state} |
| DMG codesign verify | ${macosSigning.dmg_codesign_verify} |
| DMG notarization state | ${macosSigning.dmg_notarization_state} |
| DMG stapler validate | ${macosSigning.dmg_stapler_validate} |
| DMG Gatekeeper assess | ${macosSigning.dmg_gatekeeper_assess} |
| DMG image verify | ${macosSigning.dmg_image_verify} |

## Windows State

${windowsBuildReceipt.includes("Windows Authenticode signing: false") ? "- Windows Authenticode signing: false" : "- Windows Authenticode signing: not recorded"}
- Windows native install smoke: not_run_on_darwin

## Non-Claims

- Public release: false
- Production go-live: false
- Owner approval: false
- Actual launch/go-live completed: false
- App Store distribution: false
- Microsoft Store distribution: false
`;

await writeFile(receiptPath, releaseReceipt);

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      release_id: releaseId,
      manifest: path.relative(ROOT, manifestPath),
      checksums: path.relative(ROOT, checksumPath),
      receipt: path.relative(ROOT, receiptPath),
      artifact_count: artifactRecords.length,
      app_id: "com.amic.matter.desktop",
      channel: "formal-candidate",
      public_release_claim: false,
      production_go_live_claim: false,
      owner_approval_claim: false,
      actual_launch_go_live_claim: false,
    },
    null,
    2,
  ),
);
