#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { packager } from "@electron/packager";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  assertDesktopFormalBuildProvenance,
  createDesktopBuildManifest,
  desktopReleaseChannelConfig,
  directoryDigest,
  readDesktopBuildSourceIdentity,
  writeDesktopBuildManifest,
} from "./lib/matter-desktop-provenance.mjs";
import { copyDesktopLocalApiRuntime } from "./lib/matter-desktop-runtime.mjs";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const desktopRoot = join(repoRoot, "apps/desktop");
const packageJson = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(join(desktopRoot, "package.json"), "utf8")));
const sourceIdentity = readDesktopBuildSourceIdentity(repoRoot);
const distRoot = join(desktopRoot, "dist/win");
const channelConfig = desktopReleaseChannelConfig(process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal");
const releaseChannel = channelConfig.channel;
const formalRelease = channelConfig.formal;
assertDesktopFormalBuildProvenance({
  releaseChannel,
  sourceIdentity,
  expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
});
const appId = channelConfig.appId;
const artifactName = `${channelConfig.artifactPrefix}-${packageJson.version}`;
const packageDir = join(distRoot, `${artifactName}-win32-x64`);
const packageZipPath = join(distRoot, `${artifactName}-win32-x64-unsigned.zip`);
const executablePath = join(packageDir, "matter.exe");
const artifactPath = join(distRoot, `${artifactName}-win-installer-manifest.json`);
const signaturePath = `${artifactPath}.sig`;
const externalBuildManifestPath = join(distRoot, `${artifactName}-win-build-manifest.json`);
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");
const iconPath = join(desktopRoot, "build/icon.ico");
const formalReleaseMarkerName = "matter-formal-release.json";
const ignoredPackagePathPatterns = [
  /(^|\/)dist($|\/)/,
  /(^|\/)test($|\/)/,
  /(^|\/)\.env($|\.|\/)/,
  /(^|\/)build\/forest-login\.jpg$/,
  /(^|\/)src\/renderer\/offline(?:\.matter)?\.html$/,
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
      "-NonInteractive",
      "-Command",
      "Compress-Archive -Force -LiteralPath $env:MATTER_ZIP_SOURCE -DestinationPath $env:MATTER_ZIP_TARGET",
    ], {
      env: {
        ...process.env,
        MATTER_ZIP_SOURCE: sourceDir,
        MATTER_ZIP_TARGET: targetZipPath,
      },
    });
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
let buildManifest;
let buildManifestHash;

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
  await cp(generatedAppRoot, packageDir, { recursive: true });
  await copyDesktopLocalApiRuntime({
    targetAppSourceDir: join(packageDir, "resources", "app"),
    repoRoot,
    formalRelease
  });
  const markerPath = join(packageDir, "resources", formalReleaseMarkerName);
  if (formalRelease) {
    await writeFile(markerPath, `${JSON.stringify({ channel: "formal", local_api_default: "disabled" }, null, 2)}\n`);
  } else {
    await rm(markerPath, { force: true });
  }
  buildManifest = createDesktopBuildManifest({
    version: packageJson.version,
    ...sourceIdentity,
    renderer: directoryDigest(join(packageDir, "resources", "app", "src", "renderer", "web")),
    channel: releaseChannel,
    platform: "win32",
    arch: "x64",
    appId,
  });
  ({ sha256: buildManifestHash } = await writeDesktopBuildManifest({
    manifest: buildManifest,
    internalPath: join(packageDir, "resources", "matter-build-manifest.json"),
    externalPath: externalBuildManifestPath,
  }));
} finally {
  await rm(packageOutRoot, { recursive: true, force: true });
}
await zipPackageDirectory(packageDir, packageZipPath);

const iconHash = sha256(await readFile(iconPath));
const executableHash = sha256(await readFile(executablePath));
const packageZipHash = sha256(await readFile(packageZipPath));
const packageDirStat = await stat(packageDir);
const nativeInstallSmoke = `not_run_on_${process.platform}`;
const artifact = {
  productName: "matter",
  appId,
  version: packageJson.version,
  platform: "win32",
  arch: "x64",
  channel: releaseChannel,
  buildManifest: `apps/desktop/dist/win/${artifactName}-win-build-manifest.json`,
  buildManifestSha256: buildManifestHash,
  sourceSha: buildManifest.source_sha,
  sourceTree: buildManifest.source_tree,
  sourceDirty: buildManifest.source_dirty,
  rendererSha256: buildManifest.renderer.sha256,
  rendererFiles: buildManifest.renderer.file_count,
  builtAt: buildManifest.built_at,
  icon: "build/icon.ico",
  iconSha256: iconHash,
  packageDirectory: `apps/desktop/dist/win/${artifactName}-win32-x64`,
  executable: `apps/desktop/dist/win/${artifactName}-win32-x64/matter.exe`,
  executableSha256: executableHash,
  packageZip: `apps/desktop/dist/win/${artifactName}-win32-x64-unsigned.zip`,
  packageZipSha256: packageZipHash,
  files: ["src/**/*", "build/**/*", "package.json"],
  publicRelease: false,
  ownerApproval: false,
  windowsAuthenticodeSigning: false
};
const artifactBody = `${JSON.stringify(artifact, null, 2)}\n`;
const manifestHash = sha256(Buffer.from(artifactBody));
const signatureKey = channelConfig.receiptSigningKey;
const signature = createHmac("sha256", signatureKey).update(manifestHash).digest("hex");

await writeFile(artifactPath, artifactBody);
await writeFile(signaturePath, `${signature}\n`);

const receipt = `# Windows ${channelConfig.receiptLabel} Build Receipt

Status: ${channelConfig.receiptStatusPrefix}_windows_build_manifest_created
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
Build manifest: \`apps/desktop/dist/win/${artifactName}-win-build-manifest.json\`
Packaged build manifest: \`apps/desktop/dist/win/${artifactName}-win32-x64/resources/matter-build-manifest.json\`
Build manifest SHA-256: \`${buildManifestHash}\`
Source SHA: \`${buildManifest.source_sha}\`
Source tree: \`${buildManifest.source_tree}\`
Source dirty: \`${buildManifest.source_dirty}\`
Renderer SHA-256: \`${buildManifest.renderer.sha256}\`
Renderer files: \`${buildManifest.renderer.file_count}\`
Built at: \`${buildManifest.built_at}\`

## Signing

- signing identity: ${signatureKey}
- signing type: HMAC receipt signature for internal validation, not Windows Authenticode
- signature file: \`apps/desktop/dist/win/${artifactName}-win-installer-manifest.json.sig\`

## Manifest Hash

- manifest hash algorithm: sha256
- manifest hash: \`${manifestHash}\`
- executable hash: \`${executableHash}\`
- unsigned package zip hash: \`${packageZipHash}\`

## Install Smoke

- package directory exists: ${packageDirStat.isDirectory()}
- executable exists: ${existsSync(executablePath)}
- unsigned package zip exists: ${existsSync(packageZipPath)}
- install smoke result: package_candidate_created
- Windows native install smoke: ${nativeInstallSmoke}
- formal release local API default disabled: ${formalRelease && existsSync(join(packageDir, "resources", formalReleaseMarkerName))}

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
      build_manifest: `apps/desktop/dist/win/${artifactName}-win-build-manifest.json`,
      packaged_build_manifest: `apps/desktop/dist/win/${artifactName}-win32-x64/resources/matter-build-manifest.json`,
      build_manifest_sha256: buildManifestHash,
      source_sha: buildManifest.source_sha,
      source_tree: buildManifest.source_tree,
      source_dirty: buildManifest.source_dirty,
      renderer_sha256: buildManifest.renderer.sha256,
      renderer_files: buildManifest.renderer.file_count,
      built_at: buildManifest.built_at,
      signing_identity: signatureKey,
      manifest_hash: manifestHash,
      executable_hash: executableHash,
      unsigned_package_zip_hash: packageZipHash,
      icon: "apps/desktop/build/icon.ico",
      icon_sha256: iconHash,
      install_smoke_result: "package_candidate_created",
      windows_native_install_smoke: nativeInstallSmoke,
      windows_authenticode_signing: false,
      formal_release_local_api_default_disabled: formalRelease && existsSync(join(packageDir, "resources", formalReleaseMarkerName)),
      public_release: false,
      owner_approval: false
    },
    null,
    2
  )
);
