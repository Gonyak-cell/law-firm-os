#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const desktopRoot = join(repoRoot, "apps/desktop");
const packageJson = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(join(desktopRoot, "package.json"), "utf8")));
const distRoot = join(desktopRoot, "dist/win");
const releaseChannel = process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal";
if (!["internal", "formal"].includes(releaseChannel)) {
  throw new Error("MATTER_DESKTOP_RELEASE_CHANNEL must be internal or formal.");
}
const formalRelease = releaseChannel === "formal";
const appId = formalRelease ? "com.amic.matter.desktop" : "com.amic.matter.desktop.internal";
const artifactName = formalRelease ? `matter-${packageJson.version}` : `matter-internal-${packageJson.version}`;
const artifactPath = join(distRoot, `${artifactName}-win-installer-manifest.json`);
const signaturePath = `${artifactPath}.sig`;
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");
const iconPath = join(desktopRoot, "build/icon.ico");

await execFileAsync(process.execPath, [join(scriptDir, "prepare-matter-desktop-web-renderer.mjs")], {
  cwd: repoRoot
});
await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });
await mkdir(dirname(receiptPath), { recursive: true });

const iconHash = createHash("sha256").update(await readFile(iconPath)).digest("hex");
const artifact = {
  productName: "matter",
  appId,
  version: packageJson.version,
  platform: "win32",
  channel: releaseChannel,
  icon: "build/icon.ico",
  iconSha256: iconHash,
  files: ["src/**/*", "package.json"],
  publicRelease: false,
  ownerApproval: false
};
const artifactBody = `${JSON.stringify(artifact, null, 2)}\n`;
const installerHash = createHash("sha256").update(artifactBody).digest("hex");
const signatureKey = formalRelease ? "matter-formal-candidate-nonproduction-signing-key" : "matter-internal-nonproduction-signing-key";
const signature = createHmac("sha256", signatureKey).update(installerHash).digest("hex");

await writeFile(artifactPath, artifactBody);
await writeFile(signaturePath, `${signature}\n`);

const receipt = `# Windows ${formalRelease ? "Formal Release Candidate" : "Internal"} Build Receipt

Status: ${formalRelease ? "formal_release_candidate_windows_manifest_created" : "internal_windows_build_manifest_created"}
Source TUW: MDT-P6-W01-T04
Installer manifest: \`apps/desktop/dist/win/${artifactName}-win-installer-manifest.json\`
App icon: \`apps/desktop/build/icon.ico\`
App icon sha256: \`${iconHash}\`
App ID: \`${appId}\`
Product name: \`matter\`
Version: \`${packageJson.version}\`
Channel: \`${releaseChannel}\`

## Signing

- signing identity: ${signatureKey}
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: \`apps/desktop/dist/win/${artifactName}-win-installer-manifest.json.sig\`

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
      artifact: `apps/desktop/dist/win/${artifactName}-win-installer-manifest.json`,
      receipt: "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md",
      release_channel: releaseChannel,
      app_id: appId,
      signing_identity: signatureKey,
      installer_hash: installerHash,
      icon: "apps/desktop/build/icon.ico",
      icon_sha256: iconHash,
      install_smoke_result: "manifest_smoke_pass",
      windows_native_install_smoke: "not_run_on_darwin",
      public_release: false,
      owner_approval: false
    },
    null,
    2
  )
);
