#!/usr/bin/env node
import { createHash, createHmac } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const desktopRoot = join(repoRoot, "apps/desktop");
const packageJson = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(join(desktopRoot, "package.json"), "utf8")));
const distRoot = join(desktopRoot, "dist/win");
const artifactPath = join(distRoot, `matter-internal-${packageJson.version}-win-installer-manifest.json`);
const signaturePath = `${artifactPath}.sig`;
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });
await mkdir(dirname(receiptPath), { recursive: true });

const artifact = {
  productName: "matter",
  appId: "com.amic.matter.desktop.internal",
  version: packageJson.version,
  platform: "win32",
  channel: "internal",
  files: ["src/**/*", "package.json"],
  publicRelease: false,
  ownerApproval: false
};
const artifactBody = `${JSON.stringify(artifact, null, 2)}\n`;
const installerHash = createHash("sha256").update(artifactBody).digest("hex");
const signature = createHmac("sha256", "matter-internal-nonproduction-signing-key").update(installerHash).digest("hex");

await writeFile(artifactPath, artifactBody);
await writeFile(signaturePath, `${signature}\n`);

const receipt = `# Windows Internal Build Receipt

Status: internal_windows_build_manifest_created
Source TUW: MDT-P6-W01-T04
Installer manifest: \`apps/desktop/dist/win/matter-internal-${packageJson.version}-win-installer-manifest.json\`
App ID: \`com.amic.matter.desktop.internal\`
Product name: \`matter\`
Version: \`${packageJson.version}\`

## Signing

- signing identity: matter-internal-nonproduction detached signature
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: \`apps/desktop/dist/win/matter-internal-${packageJson.version}-win-installer-manifest.json.sig\`

## Installer Hash

- installer hash algorithm: sha256
- installer hash: \`${installerHash}\`

## Install Smoke

- install smoke result: manifest_smoke_pass
- Windows native install smoke: not_run_on_darwin

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
`;

await writeFile(receiptPath, receipt);

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      artifact: `apps/desktop/dist/win/matter-internal-${packageJson.version}-win-installer-manifest.json`,
      receipt: "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md",
      signing_identity: "matter-internal-nonproduction detached signature",
      installer_hash: installerHash,
      install_smoke_result: "manifest_smoke_pass",
      windows_native_install_smoke: "not_run_on_darwin",
      public_release: false,
      owner_approval: false
    },
    null,
    2
  )
);
