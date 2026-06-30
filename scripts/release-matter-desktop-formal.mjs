#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const desktopPackage = JSON.parse(await readFile(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const version = desktopPackage.version;
const defaultReleaseId = `matter-desktop-v${version}`;
const releaseId = process.env.MATTER_DESKTOP_GITHUB_RELEASE_TAG ?? defaultReleaseId;
const releaseRoot = path.join(ROOT, "apps/desktop/dist/release", releaseId);
const manifestPath = path.join(releaseRoot, "release-manifest.json");
const checksumPath = path.join(releaseRoot, "checksums.sha256");
const receiptPath = path.join(ROOT, "docs/desktop/matter-desktop-formal-release-receipt.md");
const macosBuildReceiptPath = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md");
const windowsBuildReceiptPath = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");

const artifacts = [
  {
    id: "macos_app_bundle",
    path: "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter",
    display_path: "apps/desktop/dist/mac/matter.app",
    platform: "darwin",
    kind: "macos_electron_app_bundle",
  },
  {
    id: "macos_zip_archive",
    path: `apps/desktop/dist/mac/matter-${version}-macos.zip`,
    display_path: `apps/desktop/dist/mac/matter-${version}-macos.zip`,
    platform: "darwin",
    kind: "formal_zip_archive",
  },
  {
    id: "macos_dmg_image",
    path: `apps/desktop/dist/mac/matter-${version}-macos.dmg`,
    display_path: `apps/desktop/dist/mac/matter-${version}-macos.dmg`,
    platform: "darwin",
    kind: "formal_dmg_image",
  },
  {
    id: "windows_manifest",
    path: `apps/desktop/dist/win/matter-${version}-win-installer-manifest.json`,
    display_path: `apps/desktop/dist/win/matter-${version}-win-installer-manifest.json`,
    platform: "win32",
    kind: "formal_manifest",
  },
  {
    id: "windows_manifest_signature",
    path: `apps/desktop/dist/win/matter-${version}-win-installer-manifest.json.sig`,
    display_path: `apps/desktop/dist/win/matter-${version}-win-installer-manifest.json.sig`,
    platform: "win32",
    kind: "formal_detached_signature",
  },
  {
    id: "windows_package_zip",
    path: `apps/desktop/dist/win/matter-${version}-win32-x64-unsigned.zip`,
    display_path: `apps/desktop/dist/win/matter-${version}-win32-x64-unsigned.zip`,
    platform: "win32",
    kind: "unsigned_windows_package_zip",
  },
  {
    id: "macos_build_receipt",
    path: "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md",
    display_path: "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md",
    platform: "darwin",
    kind: "receipt",
  },
  {
    id: "windows_build_receipt",
    path: "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md",
    display_path: "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md",
    platform: "win32",
    kind: "receipt",
  },
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function receiptValue(source, label) {
  const prefix = `- ${label}:`;
  const line = source.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  return line?.slice(prefix.length).trim() ?? "missing";
}

async function artifactRecord(artifact) {
  const absolutePath = path.join(ROOT, artifact.path);
  if (!existsSync(absolutePath)) throw new Error(`missing formal release artifact: ${artifact.path}`);
  const body = await readFile(absolutePath);
  const fileStat = await stat(absolutePath);
  return {
    ...artifact,
    bytes: fileStat.size,
    sha256: sha256(body),
  };
}

const artifactRecords = [];
for (const artifact of artifacts) artifactRecords.push(await artifactRecord(artifact));

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
};

const manifest = {
  schema_version: "law-firm-os.matter-desktop-formal-release-candidate.v0.1",
  release_id: releaseId,
  status: "formal_release_candidate_generated",
  generated_at: new Date().toISOString(),
  product_name: "matter",
  package_name: desktopPackage.name,
  version,
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

await rm(releaseRoot, { recursive: true, force: true });
await mkdir(releaseRoot, { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  checksumPath,
  artifactRecords.map((artifact) => `${artifact.sha256}  ${artifact.display_path}`).join("\n") + "\n",
);

const macZip = artifactRecords.find((artifact) => artifact.id === "macos_zip_archive");
const macDmg = artifactRecords.find((artifact) => artifact.id === "macos_dmg_image");
const winManifest = artifactRecords.find((artifact) => artifact.id === "windows_manifest");
const winZip = artifactRecords.find((artifact) => artifact.id === "windows_package_zip");

const releaseReceipt = `# matter Desktop Formal Release Candidate Receipt

Status: formal-release-candidate-generated

This receipt records a non-internal artifact naming and app identity pass for a formal GitHub Draft Release candidate. It does not claim public release, production go-live, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | \`${releaseId}\` |
| Manifest | \`apps/desktop/dist/release/${releaseId}/release-manifest.json\` |
| Checksums | \`apps/desktop/dist/release/${releaseId}/checksums.sha256\` |
| Channel | \`formal-candidate\` |
| App ID | \`com.amic.matter.desktop\` |
| GitHub tag candidate | \`${releaseId}\` |
| Custom domain requirement | false |

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | \`apps/desktop/dist/mac/matter.app\` |
| macOS ZIP archive | \`apps/desktop/dist/mac/matter-${version}-macos.zip\` |
| macOS ZIP SHA-256 | \`${macZip.sha256}\` |
| macOS DMG image | \`apps/desktop/dist/mac/matter-${version}-macos.dmg\` |
| macOS DMG SHA-256 | \`${macDmg.sha256}\` |
| Windows formal manifest | \`apps/desktop/dist/win/matter-${version}-win-installer-manifest.json\` |
| Windows formal manifest SHA-256 | \`${winManifest.sha256}\` |
| Windows unsigned package ZIP | \`apps/desktop/dist/win/matter-${version}-win32-x64-unsigned.zip\` |
| Windows unsigned package ZIP SHA-256 | \`${winZip.sha256}\` |

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
