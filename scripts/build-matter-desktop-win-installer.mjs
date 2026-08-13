#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  assertDesktopFormalBuildProvenance,
  assertPathOutsideWorktree,
  createDesktopBuildManifest,
  desktopReleaseChannelConfig,
  directoryDigest,
  readDesktopBuildSourceIdentity,
} from "./lib/matter-desktop-provenance.mjs";
import {
  injectMatterDesktopAuthenticodeConfiguration,
  matterDesktopAuthenticodePowerShell,
  resolveMatterDesktopAuthenticodeConfiguration,
  validateMatterDesktopAuthenticodeSignatures,
} from "./lib/matter-desktop-authenticode.mjs";
import {
  stageDesktopMainRuntimeDependencies,
  verifyDesktopMainRuntimeDependencies,
} from "./lib/matter-desktop-runtime.mjs";

const execFileAsync = promisify(execFile);
const npxExecutable = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npx";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const desktopRoot = join(repoRoot, "apps/desktop");
const packageJson = JSON.parse(await readFile(join(desktopRoot, "package.json"), "utf8"));
const sourceIdentity = readDesktopBuildSourceIdentity(repoRoot);
const builderConfigPath = join(desktopRoot, "electron-builder.yml");
const channelConfig = desktopReleaseChannelConfig(process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal");
const releaseChannel = channelConfig.channel;
const formalRelease = channelConfig.formal;
const authenticodeConfiguration = resolveMatterDesktopAuthenticodeConfiguration({
  formalRelease,
});
assertDesktopFormalBuildProvenance({
  releaseChannel,
  sourceIdentity,
  expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
});
const appId = channelConfig.appId;
const artifactName = `${channelConfig.artifactPrefix}-${packageJson.version}`;
const installerPath = join(desktopRoot, "dist", `${artifactName}-win-x64.exe`);
const blockmapPath = `${installerPath}.blockmap`;
const unpackedPath = join(desktopRoot, "dist", "win-unpacked");
const receiptPath = process.env.MATTER_DESKTOP_WINDOWS_BUILD_RECEIPT_PATH
  ? resolve(process.env.MATTER_DESKTOP_WINDOWS_BUILD_RECEIPT_PATH)
  : join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");
if (formalRelease) {
  if (!process.env.MATTER_DESKTOP_WINDOWS_BUILD_RECEIPT_PATH) {
    throw new Error("formal builds require MATTER_DESKTOP_WINDOWS_BUILD_RECEIPT_PATH to preserve historical receipts");
  }
  assertPathOutsideWorktree({ repoRoot, candidate: receiptPath, label: "formal Windows build receipt" });
}
const buildManifestName = "matter-build-manifest.json";
const formalReleaseMarkerName = "matter-formal-release.json";
const rendererRoot = join(desktopRoot, "src", "renderer", "web");
const installerBuildManifest = createDesktopBuildManifest({
  version: packageJson.version,
  ...sourceIdentity,
  renderer: directoryDigest(rendererRoot),
  channel: releaseChannel,
  platform: "win32",
  arch: "x64",
  appId,
});
const runtimeAssetPaths = [
  "build/amic-law-a-lockup-accent.svg",
  "build/amic-law-mic-accent.svg",
  "build/amic-law-logo-accent.svg",
  "build/forest-login.jpg",
  "build/icon.png",
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fileRecord(filePath) {
  if (!existsSync(filePath)) throw new Error(`missing Windows installer artifact: ${filePath}`);
  const body = await readFile(filePath);
  const fileStat = await stat(filePath);
  return {
    path: filePath,
    bytes: fileStat.size,
    sha256: sha256(body),
  };
}

async function authenticodeRecord(filePath) {
  if (process.platform !== "win32") {
    throw new Error("Authenticode verification requires a Windows host");
  }
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", matterDesktopAuthenticodePowerShell()],
    {
      env: { ...process.env, MATTER_AUTHENTICODE_PATH: filePath },
      maxBuffer: 1024 * 1024,
    },
  );
  return JSON.parse(stdout);
}

await rm(installerPath, { force: true });
await rm(blockmapPath, { force: true });
await rm(unpackedPath, { recursive: true, force: true });

const stagingRoot = await mkdtemp(join(tmpdir(), "matter-desktop-win-builder-"));
const stagingProjectRoot = join(stagingRoot, "desktop");
const stagingInstallerPath = join(stagingProjectRoot, "dist", `${artifactName}-win-x64.exe`);
const stagingBlockmapPath = `${stagingInstallerPath}.blockmap`;
const stagingUnpackedPath = join(stagingProjectRoot, "dist", "win-unpacked");

try {
  await mkdir(stagingProjectRoot, { recursive: true });
  await cp(join(desktopRoot, "src"), join(stagingProjectRoot, "src"), { recursive: true });
  await stageDesktopMainRuntimeDependencies({ targetAppSourceDir: stagingProjectRoot, repoRoot });
  await cp(join(desktopRoot, "build"), join(stagingProjectRoot, "build"), { recursive: true });
  const provenanceRoot = join(stagingProjectRoot, ".release-provenance");
  await mkdir(provenanceRoot, { recursive: true });
  await writeFile(
    join(provenanceRoot, buildManifestName),
    `${JSON.stringify(installerBuildManifest, null, 2)}\n`,
  );
  if (formalRelease) {
    await writeFile(
      join(provenanceRoot, formalReleaseMarkerName),
      `${JSON.stringify({ channel: "formal", local_api_default: "disabled" }, null, 2)}\n`,
    );
  }
  await writeFile(
    join(stagingProjectRoot, "package.json"),
    `${JSON.stringify(
      {
        name: packageJson.name,
        version: packageJson.version,
        private: true,
        type: packageJson.type,
        main: packageJson.main,
        description: packageJson.description
      },
      null,
      2
    )}\n`,
  );
  const provenanceResources = [
    "",
    "extraResources:",
    `  - from: .release-provenance/${buildManifestName}`,
    `    to: ${buildManifestName}`,
    ...(formalRelease
      ? [
          `  - from: .release-provenance/${formalReleaseMarkerName}`,
          `    to: ${formalReleaseMarkerName}`,
        ]
      : []),
    "",
  ].join("\n");
  const builderConfiguration = injectMatterDesktopAuthenticodeConfiguration(
    (await readFile(builderConfigPath, "utf8")).trimEnd(),
    authenticodeConfiguration,
  );
  await writeFile(
    join(stagingProjectRoot, "electron-builder.yml"),
    `${builderConfiguration}${provenanceResources}`,
  );

  const npxArgs = [
    "-y",
    "electron-builder@26.15.3",
    "--win",
    "nsis",
    "--x64",
    "--publish",
    "never",
    `-c.appId=${appId}`,
    `-c.artifactName=${artifactName}-\${os}-\${arch}.\${ext}`,
    "-c.electronVersion=42.4.1",
  ];
  await execFileAsync(
    npxExecutable,
    process.platform === "win32" ? ["/d", "/s", "/c", "npx", ...npxArgs] : npxArgs,
    {
      cwd: stagingProjectRoot,
      env: process.env,
      maxBuffer: 1024 * 1024 * 20,
    },
  );

  const packagedResources = join(stagingUnpackedPath, "resources");
  const packagedBuildManifestPath = join(packagedResources, buildManifestName);
  assert.equal(existsSync(packagedBuildManifestPath), true, "Windows installer must embed the build manifest");
  assert.deepEqual(
    JSON.parse(await readFile(packagedBuildManifestPath, "utf8")),
    installerBuildManifest,
    "Windows installer build manifest must match the exact source identity",
  );
  assert.deepEqual(
    directoryDigest(join(packagedResources, "app", "src", "renderer", "web")),
    installerBuildManifest.renderer,
    "Windows installer renderer must match its build manifest",
  );
  assert.equal(
    existsSync(join(packagedResources, formalReleaseMarkerName)),
    formalRelease,
    "Windows installer formal marker must match the release channel",
  );
  await verifyDesktopMainRuntimeDependencies({
    targetAppSourceDir: join(packagedResources, "app"),
    repoRoot,
  });

  await mkdir(dirname(installerPath), { recursive: true });
  await cp(stagingInstallerPath, installerPath);
  await cp(stagingBlockmapPath, blockmapPath);
  await cp(stagingUnpackedPath, unpackedPath, { recursive: true });
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}

const runtimeAssetSha256 = {};
for (const assetPath of runtimeAssetPaths) {
  const sourceAsset = await fileRecord(join(desktopRoot, assetPath));
  const packagedAsset = await fileRecord(join(unpackedPath, "resources", "app", assetPath));
  if (sourceAsset.sha256 !== packagedAsset.sha256) {
    throw new Error(`Windows runtime asset hash mismatch: ${assetPath}`);
  }
  runtimeAssetSha256[assetPath] = packagedAsset.sha256;
}

const installer = await fileRecord(installerPath);
const blockmap = await fileRecord(blockmapPath);
const authenticodeResult = authenticodeConfiguration
  ? validateMatterDesktopAuthenticodeSignatures([
      await authenticodeRecord(installerPath),
      await authenticodeRecord(join(unpackedPath, "matter.exe")),
    ], { expectedCertificateSha1: authenticodeConfiguration.certificate_sha1 })
  : null;
const packagedBuildManifestPath = join(unpackedPath, "resources", buildManifestName);
const packagedFormalMarkerPath = join(unpackedPath, "resources", formalReleaseMarkerName);
const nativeInstallSmoke = `not_run_on_${process.platform}`;
const relativeInstallerPath = "apps/desktop/dist/" + `${artifactName}-win-x64.exe`;
const relativeBlockmapPath = `${relativeInstallerPath}.blockmap`;
const priorReceipt = existsSync(receiptPath) ? await readFile(receiptPath, "utf8") : "";
const receiptSection = `\n## Installer Package\n\n- Windows installer: \`${relativeInstallerPath}\`\n- Windows installer sha256: \`${installer.sha256}\`\n- Windows installer bytes: ${installer.bytes}\n- Windows installer blockmap: \`${relativeBlockmapPath}\`\n- Windows installer blockmap sha256: \`${blockmap.sha256}\`\n- Windows installer blockmap bytes: ${blockmap.bytes}\n- Windows installer packaging: nsis-x64\n- Windows renderer runtime assets: verified (${runtimeAssetPaths.length})\n- Windows installer build manifest: verified (${installerBuildManifest.source_sha})\n- Windows installer renderer sha256: \`${installerBuildManifest.renderer.sha256}\`\n- Windows installer formal marker: ${formalRelease ? "verified" : "not_applicable"}\n- Windows native install smoke: ${nativeInstallSmoke}\n- Windows Authenticode signing: ${Boolean(authenticodeResult)}\n- Windows Authenticode timestamp verified: ${authenticodeResult?.timestamp_verified === true}\n- Windows Authenticode signer certificate SHA-1: \`${authenticodeResult?.signer_certificate_sha1 ?? "not_applicable"}\`\n- Windows Authenticode signer subject: \`${authenticodeResult?.signer.subject ?? "not_applicable"}\`\n- Windows Authenticode signer code-signing EKU verified: ${authenticodeResult?.signer_code_signing_eku_verified === true}\n- Windows Authenticode timestamp EKU verified: ${authenticodeResult?.timestamp_eku_verified === true}\n`;

await mkdir(dirname(receiptPath), { recursive: true });
await writeFile(receiptPath, `${priorReceipt.trimEnd()}${receiptSection}`);

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      installer: relativeInstallerPath,
      installer_sha256: installer.sha256,
      installer_bytes: installer.bytes,
      blockmap: relativeBlockmapPath,
      blockmap_sha256: blockmap.sha256,
      blockmap_bytes: blockmap.bytes,
      release_channel: releaseChannel,
      app_id: appId,
      runtime_asset_sha256: runtimeAssetSha256,
      installer_build_manifest: relative(repoRoot, packagedBuildManifestPath),
      installer_source_sha: installerBuildManifest.source_sha,
      installer_source_tree: installerBuildManifest.source_tree,
      installer_source_dirty: installerBuildManifest.source_dirty,
      installer_renderer_sha256: installerBuildManifest.renderer.sha256,
      installer_formal_marker: formalRelease && existsSync(packagedFormalMarkerPath),
      windows_native_install_smoke: nativeInstallSmoke,
      windows_authenticode_signing: Boolean(authenticodeResult),
      windows_authenticode_timestamp_verified: authenticodeResult?.timestamp_verified === true,
      windows_authenticode_signature_verified:
        authenticodeResult?.signature_count === 2,
      windows_authenticode_signer_certificate_sha1:
        authenticodeResult?.signer_certificate_sha1 ?? null,
      windows_authenticode_signer: authenticodeResult?.signer ?? null,
      windows_authenticode_timestamps: authenticodeResult?.timestamps ?? [],
      windows_authenticode_signer_code_signing_eku_verified:
        authenticodeResult?.signer_code_signing_eku_verified === true,
      windows_authenticode_timestamp_eku_verified:
        authenticodeResult?.timestamp_eku_verified === true,
    },
    null,
    2,
  ),
);
