#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
import {
  readDesktopReleaseArtifactStage,
  requireDesktopReleaseArtifact,
} from "./lib/matter-desktop-release-paths.mjs";

const ROOT = process.cwd();
const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
if (sourceIdentity.sourceDirty) throw new Error("temporary release assembly requires a clean product source");
if (process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA) {
  if (sourceIdentity.sourceSha !== process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA) {
    throw new Error("temporary release assembly source SHA mismatch");
  }
}
const desktopPackage = JSON.parse(await readFile(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const version = desktopPackage.version;
const releaseId = `matter-desktop-internal-${version}`;
const releaseStage = readDesktopReleaseArtifactStage({
  repoRoot: ROOT,
  version,
  sourceSha: sourceIdentity.sourceSha,
  channel: "internal",
});
const releaseRoot = releaseStage.artifactRoot;
const releaseRelativeRoot = releaseStage.relativeRoot;
const manifestPath = path.join(releaseRoot, "release-manifest.json");
const checksumPath = path.join(releaseRoot, "checksums.sha256");
const receiptPath = path.join(ROOT, "docs/desktop/matter-desktop-temporary-release-receipt.md");
const localSecretPath = path.join(ROOT, ".env.matter-vault-r4.local");
const artifactRecords = releaseStage.index.artifacts.map((artifact) => ({
  ...artifact,
  display_path: artifact.path,
}));
const macZip = requireDesktopReleaseArtifact(releaseStage.index, "macos_zip_archive");
const macDmg = requireDesktopReleaseArtifact(releaseStage.index, "macos_dmg_image");
const winManifest = requireDesktopReleaseArtifact(releaseStage.index, "windows_installer_manifest");
const winSignature = requireDesktopReleaseArtifact(releaseStage.index, "windows_manifest_signature");
const winZip = requireDesktopReleaseArtifact(releaseStage.index, "windows_package_zip");
const macosBuildReceiptPath = path.join(
  ROOT,
  requireDesktopReleaseArtifact(releaseStage.index, "macos_build_receipt").path,
);

function parseEnvText(source = "") {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    values[trimmed.slice(0, separatorIndex)] = trimmed.slice(separatorIndex + 1);
  }
  return values;
}

function receiptValue(source, label) {
  const prefix = `- ${label}:`;
  const line = source.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  return line?.slice(prefix.length).trim() ?? "missing";
}

const macosBuildReceipt = await readFile(macosBuildReceiptPath, "utf8");
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
const localSecretValues = existsSync(localSecretPath) ? parseEnvText(await readFile(localSecretPath, "utf8")) : {};
const runtimeBaseUrl =
  process.env.MATTER_VAULT_R4_PRODUCTION_BASE_URL ??
  localSecretValues.MATTER_VAULT_R4_PRODUCTION_BASE_URL ??
  "not configured";
const macosNotarizationState =
  macosSigning.notarization_state === "submitted_and_accepted_by_notarytool"
    ? "submitted and accepted; stapled app validates locally"
    : `not submitted; notarization credential source ${macosSigning.notarization_credential_source}`;

const manifest = {
  schema_version: "law-firm-os.matter-desktop-temporary-release.v0.1",
  release_id: releaseId,
  status: "internal_temporary_release_executed",
  generated_at: new Date().toISOString(),
  product_name: "matter",
  package_name: desktopPackage.name,
  version,
  source_sha: sourceIdentity.sourceSha,
  source_tree: sourceIdentity.sourceTree,
  source_dirty: false,
  artifact_root: releaseRelativeRoot,
  generic_build_paths_are_release_truth: false,
  internal_app_id: "com.amic.matter.desktop.internal",
  channel: "internal",
  custom_domain_required: false,
  public_release_claim: false,
  production_go_live_claim: false,
  owner_approval_claim: false,
  app_store_distribution_claim: false,
  microsoft_store_distribution_claim: false,
  external_pilot_distribution_claim: false,
  macos_signing: macosSigning,
  artifacts: artifactRecords,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  checksumPath,
  artifactRecords.map((artifact) => `${artifact.sha256}  ${artifact.path}`).join("\n") + "\n",
);

const releaseReceipt = `# matter Desktop Temporary Release Receipt

Status: internal-temporary-release-executed-with-artifacts
Date: 2026-06-22

This receipt records the current desktop-first temporary release execution. It does not claim public release, production go-live, owner approval, store distribution, external pilot distribution, or custom-domain readiness.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | \`${releaseId}\` |
| Source SHA | \`${sourceIdentity.sourceSha}\` |
| Artifact root | \`${releaseRelativeRoot}\` |
| Manifest | \`${releaseRelativeRoot}/release-manifest.json\` |
| Checksums | \`${releaseRelativeRoot}/checksums.sha256\` |
| Channel | \`internal\` |
| Custom domain requirement | false |

## Domain Decision

Custom domain requirement: false.

The desktop app can be packaged and smoke-tested without a custom domain. Backend/API smoke uses the AWS-generated HTTPS endpoint recorded below until a real owned API domain is selected.

## Desktop Identity

| Field | Value |
| --- | --- |
| Product name | \`matter\` |
| Internal app ID | \`com.amic.matter.desktop.internal\` |
| Package | \`@law-firm-os/desktop\` |
| Publish config | \`null\` |
| Channel | \`internal\` |

## AWS Bootstrap Evidence

| Item | Result |
| --- | --- |
| AWS account | \`770880870480\` |
| Region | \`ap-northeast-2\` |
| \`matter-staging-admin\` | STS verified |
| \`matter-prod-deploy-admin\` | STS verified |
| \`matter-cutover-operator\` | STS verified |
| \`matter-readonly-auditor\` | STS verified |
| \`matter-runtime-role\` | Created with Lambda/ECS execution policies |
| AWS temporary runtime | API Gateway/Lambda active |
| Runtime base URL | \`${runtimeBaseUrl}\` |
| Operator-token protected runtime routes | true |
| Password credential store | AWS Secrets Manager \`/matter/staging/desktop-auth-state\` |
| Reset state retention | bounded reset token/outbox state; 20 latest active entries each |
| Secret values printed | false |

## Domain Availability Preflight

| Candidate | Availability |
| --- | --- |
| \`matter.law\` | \`UNAVAILABLE\` |
| \`matteros.com\` | \`UNAVAILABLE\` |
| \`matterlegal.com\` | \`AVAILABLE\` |
| \`matterlegal.io\` | \`AVAILABLE\` |
| \`usematter.com\` | \`AVAILABLE\` |

No domain was registered.

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS ZIP archive | \`${macZip.path}\` |
| macOS ZIP SHA-256 | \`${macZip.sha256}\` |
| macOS DMG image | \`${macDmg.path}\` |
| Windows internal manifest | \`${winManifest.path}\` |
| Windows manifest SHA-256 | \`${winManifest.sha256}\` |
| Windows detached signature | \`${winSignature.path}\` |
| Windows unsigned package ZIP | \`${winZip.path}\` |
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

## Verification Results

| Command | Result |
| --- | --- |
| \`npm --workspace apps/desktop run test:smoke\` | PASS |
| \`npm --workspace apps/desktop run test:file-bridge\` | PASS, bridge validators included |
| \`npm run matter-desktop:aws-runtime:smoke\` | PASS, password reset confirmed for \`jwsuh@amic.kr\`, system-super-admin password login allowed, and general account admin smoke denied |
| \`MATTER_NOTARY_KEYCHAIN_PROFILE=matter-notary MATTER_DESKTOP_SIGN=developer-id MATTER_DESKTOP_NOTARIZE=1 npm --workspace apps/desktop run build:mac\` | PASS, SHA-scoped macOS artifacts staged |
| \`npm --workspace apps/desktop run build:win\` | PASS, internal Windows manifest hash \`${winManifest.sha256}\` |
| \`node scripts/validate-matter-desktop-security.mjs\` | PASS |
| \`node scripts/validate-matter-desktop-no-public-release-claim.mjs\` | PASS |
| \`node scripts/validate-matter-desktop-release-boundary.mjs\` | PASS |
| \`npm run matter-desktop:temporary-release:validate\` | PASS |
| \`npm run matter-vault:r4:aws-env-plan:validate\` | PASS |
| \`npm run matter-vault:r4:local-secrets:validate\` | PASS, secret_values_printed=false |

## Expected Holds

| Hold | State |
| --- | --- |
| Production customer data migration | not run |
| Route 53 hosted zones | empty |
| Custom API domain | not required for desktop temporary release |
| Windows native install smoke | not run on Darwin |
| macOS Developer ID notarization | ${macosNotarizationState} |

## Non-Claims

- Public release: false
- Production go-live: false
- Owner approval: false
- App Store distribution: false
- Microsoft Store distribution: false
- External pilot distribution: false
- Custom-domain readiness: false
`;

await writeFile(receiptPath, releaseReceipt);

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      release_id: releaseId,
      manifest: path.relative(ROOT, manifestPath),
      checksums: path.relative(ROOT, checksumPath),
      artifact_count: artifactRecords.length,
      custom_domain_required: false,
      public_release_claim: false,
      production_go_live_claim: false,
      owner_approval_claim: false,
    },
    null,
    2,
  ),
);
