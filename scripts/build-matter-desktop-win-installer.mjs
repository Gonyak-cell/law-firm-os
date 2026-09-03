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
  assertDesktopInternalUnsignedBuildProvenance,
  assertPathOutsideWorktree,
  createDesktopBuildManifest,
  DESKTOP_INTERNAL_UNSIGNED_DISTRIBUTION_PROFILE,
  DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME,
  desktopReleaseChannelConfig,
  directoryDigest,
  readDesktopBuildSourceIdentity,
} from "./lib/matter-desktop-provenance.mjs";
import {
  assertInternalUnsignedPackage,
  createInternalUnsignedBuilderEnvironment,
} from "./lib/matter-desktop-internal-unsigned.mjs";
import {
  createMatterDesktopAuthenticodePowerShellEnvironment,
  injectMatterDesktopAuthenticodeConfiguration,
  matterDesktopAuthenticodePowerShell,
  resolveMatterDesktopAuthenticodeConfiguration,
  runAfterUnsignedMatterDesktopTechnicalCandidateInspection,
  validateMatterDesktopAuthenticodeSignatures,
} from "./lib/matter-desktop-authenticode.mjs";
import {
  desktopLocalApiSourcePaths,
  stageDesktopMainRuntimeDependencies,
  verifyDesktopMainRuntimeDependencies,
} from "./lib/matter-desktop-runtime.mjs";

const execFileAsync = promisify(execFile);
const npxExecutable = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npx";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const desktopRoot = join(repoRoot, "apps/desktop");
const classicOutlookProjectPath = join(repoRoot, "apps/outlook-classic-native/AMIC.OS.Vault.Outlook.csproj");
const classicOutlookDllName = "AMIC.OS.Vault.Outlook.dll";
const classicOutlookDllPath = join(repoRoot, "apps/outlook-classic-native/bin/Release/net48", classicOutlookDllName);
const packageJson = JSON.parse(await readFile(join(desktopRoot, "package.json"), "utf8"));
const sourceIdentity = readDesktopBuildSourceIdentity(repoRoot);
const builderConfigPath = join(desktopRoot, "electron-builder.yml");
const channelConfig = desktopReleaseChannelConfig(process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal");
const releaseChannel = channelConfig.channel;
const formalRelease = channelConfig.formal;
const distributionProfile = String(
  process.env.MATTER_DESKTOP_DISTRIBUTION_PROFILE ?? "",
).trim();
const internalUnsignedDistribution =
  distributionProfile === DESKTOP_INTERNAL_UNSIGNED_DISTRIBUTION_PROFILE;
if (distributionProfile && !internalUnsignedDistribution) {
  throw new Error("MATTER_DESKTOP_DISTRIBUTION_PROFILE is unsupported");
}
if (internalUnsignedDistribution && process.platform !== "win32") {
  throw new Error(
    "internal-unsigned installer builds require a Windows host for native NotSigned verification",
  );
}
const authenticodeConfiguration = resolveMatterDesktopAuthenticodeConfiguration({
  formalRelease,
});
if (internalUnsignedDistribution && authenticodeConfiguration) {
  throw new Error("internal-unsigned distribution must remain Authenticode NotSigned");
}
const builderEnvironment = internalUnsignedDistribution
  ? createInternalUnsignedBuilderEnvironment(process.env)
  : process.env;
const explicitBuilderExecutable = process.env.MATTER_DESKTOP_ELECTRON_BUILDER_EXECUTABLE?.trim();
const explicitElectronDist = process.env.MATTER_DESKTOP_ELECTRON_DIST?.trim();
const explicitSignTool = process.env.SIGNTOOL_PATH?.trim();
const explicitSignToolSha256 = process.env.MATTER_DESKTOP_SIGNTOOL_SHA256?.trim().toLowerCase();
if (formalRelease && authenticodeConfiguration && !explicitBuilderExecutable) {
  throw new Error("formal Authenticode builds require a preinstalled electron-builder executable");
}
if (formalRelease && authenticodeConfiguration && !explicitElectronDist) {
  throw new Error("formal Authenticode builds require a preverified Electron distribution");
}
if (formalRelease && authenticodeConfiguration && (!explicitSignTool || !explicitSignToolSha256)) {
  throw new Error("formal Authenticode builds require a preverified explicit signtool");
}
if (explicitBuilderExecutable) {
  if (!existsSync(explicitBuilderExecutable)) throw new Error("preinstalled electron-builder executable is missing");
  if (formalRelease) {
    assertPathOutsideWorktree({
      repoRoot,
      candidate: explicitBuilderExecutable,
      label: "formal electron-builder executable",
    });
  }
}
if (explicitElectronDist) {
  if (!existsSync(explicitElectronDist)) throw new Error("preverified Electron distribution is missing");
  if (formalRelease) {
    assertPathOutsideWorktree({ repoRoot, candidate: explicitElectronDist, label: "formal Electron distribution" });
  }
}
if (explicitSignTool) {
  if (!existsSync(explicitSignTool)) throw new Error("preverified signtool is missing");
  if (formalRelease) {
    assertPathOutsideWorktree({ repoRoot, candidate: explicitSignTool, label: "formal signtool executable" });
  }
  assert.match(explicitSignToolSha256 ?? "", /^[0-9a-f]{64}$/u, "preverified signtool SHA-256 is invalid");
  assert.equal(
    createHash("sha256").update(await readFile(explicitSignTool)).digest("hex"),
    explicitSignToolSha256,
    "preverified signtool digest mismatch",
  );
}
assertDesktopFormalBuildProvenance({
  releaseChannel,
  sourceIdentity,
  expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
});
assertDesktopInternalUnsignedBuildProvenance({
  distributionProfile,
  releaseChannel,
  sourceIdentity,
  expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
  expectedSourceTree: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_TREE,
});
const appId = channelConfig.appId;
const artifactName = `${channelConfig.windowsArtifactPrefix}-${packageJson.version}`;
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
if (internalUnsignedDistribution) {
  if (!process.env.MATTER_DESKTOP_WINDOWS_BUILD_RECEIPT_PATH) {
    throw new Error(
      "internal-unsigned builds require an explicit private Windows build receipt path",
    );
  }
  assertPathOutsideWorktree({
    repoRoot,
    candidate: receiptPath,
    label: "internal-unsigned Windows build receipt",
  });
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
      env: createMatterDesktopAuthenticodePowerShellEnvironment({
        env: process.env,
        authenticodePath: filePath,
      }),
      maxBuffer: 1024 * 1024,
    },
  );
  return JSON.parse(stdout);
}

await execFileAsync(
  "dotnet",
  ["build", classicOutlookProjectPath, "--configuration", "Release", "--nologo"],
  {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
  },
);
const classicOutlookSourceDll = await fileRecord(classicOutlookDllPath);

await rm(installerPath, { force: true });
await rm(blockmapPath, { force: true });
await rm(unpackedPath, { recursive: true, force: true });

const stagingRoot = await mkdtemp(join(tmpdir(), "matter-desktop-win-builder-"));
const stagingProjectRoot = join(stagingRoot, "desktop");
const stagingInstallerPath = join(stagingProjectRoot, "dist", `${artifactName}-win-x64.exe`);
const stagingBlockmapPath = `${stagingInstallerPath}.blockmap`;
const stagingUnpackedPath = join(stagingProjectRoot, "dist", "win-unpacked");
let internalUnsignedPrivacyAudit = null;

try {
  await mkdir(stagingProjectRoot, { recursive: true });
  await cp(join(desktopRoot, "src"), join(stagingProjectRoot, "src"), { recursive: true });
  await stageDesktopMainRuntimeDependencies({ targetAppSourceDir: stagingProjectRoot, repoRoot });
  await cp(join(desktopRoot, "build"), join(stagingProjectRoot, "build"), { recursive: true });
  const provenanceRoot = join(stagingProjectRoot, ".release-provenance");
  await mkdir(provenanceRoot, { recursive: true });
  const classicOutlookResourceRoot = join(provenanceRoot, "classic-outlook");
  await mkdir(classicOutlookResourceRoot, { recursive: true });
  await cp(classicOutlookDllPath, join(classicOutlookResourceRoot, classicOutlookDllName));
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
  if (internalUnsignedDistribution) {
    await writeFile(
      join(provenanceRoot, DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME),
      `${JSON.stringify({
        channel: "internal",
        distribution_profile: DESKTOP_INTERNAL_UNSIGNED_DISTRIBUTION_PROFILE,
        local_api_default: "disabled",
        bundled_local_api: false,
      }, null, 2)}\n`,
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
    ...(internalUnsignedDistribution
      ? [
          `  - from: .release-provenance/${DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME}`,
          `    to: ${DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME}`,
        ]
      : []),
    "  - from: .release-provenance/classic-outlook",
    "    to: classic-outlook",
    "    filter:",
    '      - "**/*"',
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

  const builderArgs = [
    "--win",
    "nsis",
    "--x64",
    "--publish",
    "never",
    `-c.appId=${appId}`,
    `-c.productName=${channelConfig.windowsProductName}`,
    `-c.executableName=${channelConfig.windowsExecutableName}`,
    `-c.artifactName=${artifactName}-\${os}-\${arch}.\${ext}`,
    "-c.electronVersion=42.7.0",
    ...(explicitElectronDist ? [`-c.electronDist=${explicitElectronDist}`] : []),
  ];
  await execFileAsync(
    explicitBuilderExecutable ? process.execPath : npxExecutable,
    explicitBuilderExecutable
      ? [explicitBuilderExecutable, ...builderArgs]
      : process.platform === "win32"
        ? ["/d", "/s", "/c", "npx", "-y", "electron-builder@26.15.3", ...builderArgs]
        : ["-y", "electron-builder@26.15.3", ...builderArgs],
    {
      cwd: stagingProjectRoot,
      env: builderEnvironment,
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
  assert.equal(
    existsSync(join(packagedResources, DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME)),
    internalUnsignedDistribution,
    "Windows installer internal-unsigned marker must match the distribution profile",
  );
  if (internalUnsignedDistribution) {
    internalUnsignedPrivacyAudit = await assertInternalUnsignedPackage({
      rootPath: stagingUnpackedPath,
      privateSourcePaths: desktopLocalApiSourcePaths({ repoRoot }),
    });
  }
  const packagedClassicOutlookDll = await fileRecord(
    join(packagedResources, "classic-outlook", classicOutlookDllName),
  );
  assert.equal(
    packagedClassicOutlookDll.sha256,
    classicOutlookSourceDll.sha256,
    "Windows installer Classic Outlook adapter must match the exact built DLL",
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
const classicOutlookNativeDll = await fileRecord(
  join(unpackedPath, "resources", "classic-outlook", classicOutlookDllName),
);
assert.equal(
  classicOutlookNativeDll.sha256,
  classicOutlookSourceDll.sha256,
  "copied Windows package Classic Outlook adapter must match the exact built DLL",
);
const authenticodeResult = authenticodeConfiguration
  ? validateMatterDesktopAuthenticodeSignatures([
      await authenticodeRecord(installerPath),
      await authenticodeRecord(join(unpackedPath, `${channelConfig.windowsExecutableName}.exe`)),
    ], { expectedCertificateSha1: authenticodeConfiguration.certificate_sha1 })
  : null;
const internalUnsignedAuthenticodeInspection = internalUnsignedDistribution
  ? await runAfterUnsignedMatterDesktopTechnicalCandidateInspection({
      records: [
        await authenticodeRecord(installerPath),
        await authenticodeRecord(join(unpackedPath, `${channelConfig.windowsExecutableName}.exe`)),
      ],
      action: async () => "NotSigned",
    })
  : null;
const packagedBuildManifestPath = join(unpackedPath, "resources", buildManifestName);
const packagedFormalMarkerPath = join(unpackedPath, "resources", formalReleaseMarkerName);
const packagedInternalUnsignedMarkerPath = join(
  unpackedPath,
  "resources",
  DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME,
);
const nativeInstallSmoke = `not_run_on_${process.platform}`;
const relativeInstallerPath = "apps/desktop/dist/" + `${artifactName}-win-x64.exe`;
const relativeBlockmapPath = `${relativeInstallerPath}.blockmap`;
const priorReceipt = existsSync(receiptPath) ? await readFile(receiptPath, "utf8") : "";
const receiptSection = `\n## Installer Package\n\n- Windows product name: \`${channelConfig.windowsProductName}\`\n- Windows artifact prefix: \`${channelConfig.windowsArtifactPrefix}\`\n- Windows executable name: \`${channelConfig.windowsExecutableName}.exe\`\n- Windows installer: \`${relativeInstallerPath}\`\n- Windows installer sha256: \`${installer.sha256}\`\n- Windows installer bytes: ${installer.bytes}\n- Windows installer blockmap: \`${relativeBlockmapPath}\`\n- Windows installer blockmap sha256: \`${blockmap.sha256}\`\n- Windows installer blockmap bytes: ${blockmap.bytes}\n- Windows installer packaging: nsis-x64\n- Windows renderer runtime assets: verified (${runtimeAssetPaths.length})\n- Windows installer build manifest: verified (${installerBuildManifest.source_sha})\n- Windows installer renderer sha256: \`${installerBuildManifest.renderer.sha256}\`\n- Windows Classic Outlook adapter: bundled\n- Windows Classic Outlook adapter sha256: \`${classicOutlookNativeDll.sha256}\`\n- Windows Classic Outlook registration: COM via HKLM RegAsm; activation via HKCU, 32-bit and 64-bit views\n- Windows installer formal marker: ${formalRelease ? "verified" : "not_applicable"}\n- Windows native install smoke: ${nativeInstallSmoke}\n- Windows Authenticode signing: ${Boolean(authenticodeResult)}\n- Windows Authenticode timestamp verified: ${authenticodeResult?.timestamp_verified === true}\n- Windows Authenticode signer certificate SHA-1: \`${authenticodeResult?.signer_certificate_sha1 ?? "not_applicable"}\`\n- Windows Authenticode signer subject: \`${authenticodeResult?.signer.subject ?? "not_applicable"}\`\n- Windows Authenticode signer code-signing EKU verified: ${authenticodeResult?.signer_code_signing_eku_verified === true}\n- Windows Authenticode timestamp EKU verified: ${authenticodeResult?.timestamp_eku_verified === true}\n`;
const internalUnsignedReceiptSection = internalUnsignedDistribution
  ? `- Windows installer internal-unsigned marker: verified\n- Windows installer internal-unsigned privacy gate: ${internalUnsignedPrivacyAudit?.valid === true ? "verified" : "failed"}\n- Windows installer and executable Authenticode status: ${internalUnsignedAuthenticodeInspection?.value ?? "not_verified"}\n`
  : "";

await mkdir(dirname(receiptPath), { recursive: true });
await writeFile(receiptPath, `${priorReceipt.trimEnd()}${receiptSection}${internalUnsignedReceiptSection}`);

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
      product_name: channelConfig.windowsProductName,
      artifact_prefix: channelConfig.windowsArtifactPrefix,
      executable_name: `${channelConfig.windowsExecutableName}.exe`,
      runtime_asset_sha256: runtimeAssetSha256,
      classic_outlook_adapter_bundled: true,
      classic_outlook_adapter_sha256: classicOutlookNativeDll.sha256,
      classic_outlook_user_registration: "nsis_hklm_regasm_com_hkcu_activation_views_32_and_64",
      installer_build_manifest: relative(repoRoot, packagedBuildManifestPath),
      installer_source_sha: installerBuildManifest.source_sha,
      installer_source_tree: installerBuildManifest.source_tree,
      installer_source_dirty: installerBuildManifest.source_dirty,
      installer_renderer_sha256: installerBuildManifest.renderer.sha256,
      installer_formal_marker: formalRelease && existsSync(packagedFormalMarkerPath),
      installer_internal_unsigned_marker:
        internalUnsignedDistribution && existsSync(packagedInternalUnsignedMarkerPath),
      distribution_profile: internalUnsignedDistribution
        ? DESKTOP_INTERNAL_UNSIGNED_DISTRIBUTION_PROFILE
        : formalRelease
          ? "formal"
          : "package-only",
      internal_unsigned_privacy_audit: internalUnsignedPrivacyAudit,
      windows_native_install_smoke: nativeInstallSmoke,
      windows_authenticode_signing: Boolean(authenticodeResult),
      windows_authenticode_not_signed_verified:
        internalUnsignedAuthenticodeInspection?.value === "NotSigned",
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
