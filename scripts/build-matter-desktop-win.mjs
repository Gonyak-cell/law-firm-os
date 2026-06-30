#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { packager } from "@electron/packager";
import { basename, dirname, join, resolve } from "node:path";
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
const packageDir = join(distRoot, `${artifactName}-win32-x64`);
const packageZipPath = join(distRoot, `${artifactName}-win32-x64-unsigned.zip`);
const executablePath = join(packageDir, "matter.exe");
const artifactPath = join(distRoot, `${artifactName}-win-installer-manifest.json`);
const signaturePath = `${artifactPath}.sig`;
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");
const iconPath = join(desktopRoot, "build/icon.ico");
const ignoredPackagePathPatterns = [
  /(^|\/)dist($|\/)/,
  /(^|\/)test($|\/)/,
  /(^|\/)\.env($|\.|\/)/,
  /\.test\.mjs$/
];

function shouldIgnorePackagedPath(filePath) {
  const normalizedPath = String(filePath).replaceAll("\\", "/");
  return ignoredPackagePathPatterns.some((pattern) => pattern.test(normalizedPath));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function zipPackageDirectory(sourceDir, targetZipPath) {
  if (process.platform === "win32") {
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "Compress-Archive -Force -Path $args[0] -DestinationPath $args[1]",
      sourceDir,
      targetZipPath
    ]);
    return;
  }
  if (existsSync("/usr/bin/ditto")) {
    await execFileAsync("/usr/bin/ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", sourceDir, targetZipPath]);
    return;
  }
  await execFileAsync("zip", ["-qry", targetZipPath, basename(sourceDir)], {
    cwd: dirname(sourceDir)
  });
}

await execFileAsync(process.execPath, [join(scriptDir, "prepare-matter-desktop-web-renderer.mjs")], {
  cwd: repoRoot
});
await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });
await mkdir(dirname(receiptPath), { recursive: true });
const packageOutRoot = await mkdtemp(join(tmpdir(), "matter-desktop-win-packager-"));

try {
  const [generatedAppRoot] = await packager({
    dir: desktopRoot,
    out: packageOutRoot,
    overwrite: true,
    platform: "win32",
    arch: "x64",
    name: "matter",
    executableName: "matter",
    appVersion: packageJson.version,
    buildVersion: packageJson.version,
    icon: iconPath,
    asar: false,
    prune: true,
    ignore: shouldIgnorePackagedPath
  });
  await rename(generatedAppRoot, packageDir);
} finally {
  await rm(packageOutRoot, { recursive: true, force: true });
}
await zipPackageDirectory(packageDir, packageZipPath);

const iconHash = sha256(await readFile(iconPath));
const executableHash = sha256(await readFile(executablePath));
const packageZipHash = sha256(await readFile(packageZipPath));
const packageDirStat = await stat(packageDir);
const artifact = {
  productName: "matter",
  appId,
  version: packageJson.version,
  platform: "win32",
  arch: "x64",
  channel: releaseChannel,
  icon: "build/icon.ico",
  iconSha256: iconHash,
  packageDirectory: `apps/desktop/dist/win/${artifactName}-win32-x64`,
  executable: `apps/desktop/dist/win/${artifactName}-win32-x64/matter.exe`,
  executableSha256: executableHash,
  packageZip: `apps/desktop/dist/win/${artifactName}-win32-x64-unsigned.zip`,
  packageZipSha256: packageZipHash,
  files: ["src/**/*", "package.json"],
  publicRelease: false,
  ownerApproval: false,
  windowsAuthenticodeSigning: false
};
const artifactBody = `${JSON.stringify(artifact, null, 2)}\n`;
const installerHash = sha256(Buffer.from(artifactBody));
const signatureKey = formalRelease ? "matter-formal-candidate-nonproduction-signing-key" : "matter-internal-nonproduction-signing-key";
const signature = createHmac("sha256", signatureKey).update(installerHash).digest("hex");

await writeFile(artifactPath, artifactBody);
await writeFile(signaturePath, `${signature}\n`);

const receipt = `# Windows ${formalRelease ? "Formal Release Candidate" : "Internal"} Build Receipt

Status: ${formalRelease ? "formal_release_candidate_windows_manifest_created" : "internal_windows_build_manifest_created"}
Source TUW: MDT-P6-W01-T04
Installer manifest: \`apps/desktop/dist/win/${artifactName}-win-installer-manifest.json\`
Windows package directory: \`apps/desktop/dist/win/${artifactName}-win32-x64\`
Windows executable: \`apps/desktop/dist/win/${artifactName}-win32-x64/matter.exe\`
Windows unsigned package zip: \`apps/desktop/dist/win/${artifactName}-win32-x64-unsigned.zip\`
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
- executable hash: \`${executableHash}\`
- unsigned package zip hash: \`${packageZipHash}\`

## Install Smoke

- package directory exists: ${packageDirStat.isDirectory()}
- executable exists: ${existsSync(executablePath)}
- unsigned package zip exists: ${existsSync(packageZipPath)}
- install smoke result: package_candidate_created
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
      package_directory: `apps/desktop/dist/win/${artifactName}-win32-x64`,
      executable: `apps/desktop/dist/win/${artifactName}-win32-x64/matter.exe`,
      unsigned_package_zip: `apps/desktop/dist/win/${artifactName}-win32-x64-unsigned.zip`,
      receipt: "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md",
      release_channel: releaseChannel,
      app_id: appId,
      signing_identity: signatureKey,
      installer_hash: installerHash,
      executable_hash: executableHash,
      unsigned_package_zip_hash: packageZipHash,
      icon: "apps/desktop/build/icon.ico",
      icon_sha256: iconHash,
      install_smoke_result: "package_candidate_created",
      windows_native_install_smoke: "not_run_on_darwin",
      windows_authenticode_signing: false,
      public_release: false,
      owner_approval: false
    },
    null,
    2
  )
);
