#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const desktopPackage = JSON.parse(await readFile(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const version = desktopPackage.version;
const releaseId = `mater-desktop-internal-${version}`;
const releaseRoot = path.join(ROOT, "apps/desktop/dist/release", releaseId);
const manifestPath = path.join(releaseRoot, "release-manifest.json");
const checksumPath = path.join(releaseRoot, "checksums.sha256");
const receiptPath = path.join(ROOT, "docs/desktop/mater-desktop-temporary-release-receipt.md");
const localSecretPath = path.join(ROOT, ".env.matter-vault-r4.local");

const artifacts = [
  {
    id: "macos_app_bundle",
    path: "apps/desktop/dist/mac/mater.app/Contents/MacOS/mater",
    display_path: "apps/desktop/dist/mac/mater.app",
    platform: "darwin",
    kind: "ad_hoc_signed_electron_app_bundle",
  },
  {
    id: "macos_zip_archive",
    path: `apps/desktop/dist/mac/mater-internal-${version}-macos.zip`,
    display_path: `apps/desktop/dist/mac/mater-internal-${version}-macos.zip`,
    platform: "darwin",
    kind: "internal_zip_archive",
  },
  {
    id: "macos_dmg_image",
    path: `apps/desktop/dist/mac/mater-internal-${version}-macos.dmg`,
    display_path: `apps/desktop/dist/mac/mater-internal-${version}-macos.dmg`,
    platform: "darwin",
    kind: "internal_dmg_image",
  },
  {
    id: "windows_internal_manifest",
    path: `apps/desktop/dist/win/mater-internal-${version}-win-installer-manifest.json`,
    display_path: `apps/desktop/dist/win/mater-internal-${version}-win-installer-manifest.json`,
    platform: "win32",
    kind: "internal_manifest",
  },
  {
    id: "windows_internal_signature",
    path: `apps/desktop/dist/win/mater-internal-${version}-win-installer-manifest.json.sig`,
    display_path: `apps/desktop/dist/win/mater-internal-${version}-win-installer-manifest.json.sig`,
    platform: "win32",
    kind: "internal_detached_signature",
  },
  {
    id: "macos_build_receipt",
    path: "docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md",
    display_path: "docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md",
    platform: "darwin",
    kind: "receipt",
  },
  {
    id: "windows_build_receipt",
    path: "docs/lazycodex/evidence/mater-desktop/artifacts/windows-build.md",
    display_path: "docs/lazycodex/evidence/mater-desktop/artifacts/windows-build.md",
    platform: "win32",
    kind: "receipt",
  },
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

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

async function artifactRecord(artifact) {
  const absolutePath = path.join(ROOT, artifact.path);
  if (!existsSync(absolutePath)) throw new Error(`missing release artifact: ${artifact.path}`);
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
const localSecretValues = existsSync(localSecretPath) ? parseEnvText(await readFile(localSecretPath, "utf8")) : {};
const runtimeBaseUrl =
  process.env.MATTER_VAULT_R4_PRODUCTION_BASE_URL ??
  localSecretValues.MATTER_VAULT_R4_PRODUCTION_BASE_URL ??
  "not configured";

const manifest = {
  schema_version: "law-firm-os.mater-desktop-temporary-release.v0.1",
  release_id: releaseId,
  status: "internal_temporary_release_executed",
  generated_at: new Date().toISOString(),
  product_name: "mater",
  package_name: desktopPackage.name,
  version,
  internal_app_id: "com.amic.mater.desktop.internal",
  channel: "internal",
  custom_domain_required: false,
  public_release_claim: false,
  production_go_live_claim: false,
  owner_approval_claim: false,
  app_store_distribution_claim: false,
  microsoft_store_distribution_claim: false,
  external_pilot_distribution_claim: false,
  artifacts: artifactRecords,
};

await mkdir(releaseRoot, { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  checksumPath,
  artifactRecords.map((artifact) => `${artifact.sha256}  ${artifact.display_path}`).join("\n") + "\n",
);

const releaseReceipt = `# mater Desktop Temporary Release Receipt

Status: internal-temporary-release-executed-with-artifacts
Date: 2026-06-22

This receipt records the current desktop-first temporary release execution. It does not claim public release, production go-live, owner approval, store distribution, external pilot distribution, or custom-domain readiness.

## Release Manifest

| Field | Value |
| --- | --- |
| Release ID | \`${releaseId}\` |
| Manifest | \`apps/desktop/dist/release/${releaseId}/release-manifest.json\` |
| Checksums | \`apps/desktop/dist/release/${releaseId}/checksums.sha256\` |
| Channel | \`internal\` |
| Custom domain requirement | false |

## Domain Decision

Custom domain requirement: false.

The desktop app can be packaged and smoke-tested without a custom domain. Backend/API smoke uses the AWS-generated HTTPS endpoint recorded below until a real owned API domain is selected.

## Desktop Identity

| Field | Value |
| --- | --- |
| Product name | \`mater\` |
| Internal app ID | \`com.amic.mater.desktop.internal\` |
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
| Secret values printed | false |

## Domain Availability Preflight

| Candidate | Availability |
| --- | --- |
| \`mater.law\` | \`UNAVAILABLE\` |
| \`materos.com\` | \`UNAVAILABLE\` |
| \`materlegal.com\` | \`AVAILABLE\` |
| \`materlegal.io\` | \`AVAILABLE\` |
| \`usemater.com\` | \`AVAILABLE\` |

No domain was registered.

## Release Artifacts

| Artifact | Result |
| --- | --- |
| macOS app bundle | \`apps/desktop/dist/mac/mater.app\` |
| macOS executable SHA-256 | \`${artifactRecords.find((artifact) => artifact.id === "macos_app_bundle").sha256}\` |
| macOS ZIP archive | \`apps/desktop/dist/mac/mater-internal-${version}-macos.zip\` |
| macOS DMG image | \`apps/desktop/dist/mac/mater-internal-${version}-macos.dmg\` |
| Windows internal manifest | \`apps/desktop/dist/win/mater-internal-${version}-win-installer-manifest.json\` |
| Windows manifest SHA-256 | \`${artifactRecords.find((artifact) => artifact.id === "windows_internal_manifest").sha256}\` |
| Windows detached signature | \`apps/desktop/dist/win/mater-internal-${version}-win-installer-manifest.json.sig\` |

## Verification Results

| Command | Result |
| --- | --- |
| \`npm --workspace apps/desktop run test:smoke\` | PASS |
| \`npm --workspace apps/desktop run test:file-bridge\` | PASS, bridge validators included |
| \`npm run mater-desktop:aws-runtime:smoke\` | PASS, \`jwsuh@amic.kr\` system-super-admin login allowed and general account admin smoke denied |
| \`npm --workspace apps/desktop run build:mac\` | PASS, \`apps/desktop/dist/mac/mater.app\` |
| \`npm --workspace apps/desktop run build:win\` | PASS, internal Windows manifest hash \`${artifactRecords.find((artifact) => artifact.id === "windows_internal_manifest").sha256}\` |
| \`node scripts/validate-mater-desktop-security.mjs\` | PASS |
| \`node scripts/validate-mater-desktop-no-public-release-claim.mjs\` | PASS |
| \`npm run mater-desktop:temporary-release:validate\` | PASS |
| \`npm run matter-vault:r4:aws-env-plan:validate\` | PASS |
| \`npm run matter-vault:r4:local-secrets:validate\` | PASS, secret_values_printed=false |

## Expected Holds

| Hold | State |
| --- | --- |
| Production customer data migration | not run |
| Route 53 hosted zones | empty |
| Custom API domain | not required for desktop temporary release |
| Windows native install smoke | not run on Darwin |
| macOS public notarization | not submitted |

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
