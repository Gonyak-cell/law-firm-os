#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  assertDesktopFormalBuildProvenance,
  readDesktopBuildSourceIdentity,
} from "./lib/matter-desktop-provenance.mjs";

const execFileAsync = promisify(execFile);
const npxExecutable = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npx";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const desktopRoot = join(repoRoot, "apps/desktop");
const packageJson = JSON.parse(await readFile(join(desktopRoot, "package.json"), "utf8"));
const sourceIdentity = readDesktopBuildSourceIdentity(repoRoot);
const builderConfigPath = join(desktopRoot, "electron-builder.yml");
const releaseChannel = process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal";
if (!["internal", "formal"].includes(releaseChannel)) {
  throw new Error("MATTER_DESKTOP_RELEASE_CHANNEL must be internal or formal.");
}

const formalRelease = releaseChannel === "formal";
assertDesktopFormalBuildProvenance({
  releaseChannel,
  sourceIdentity,
  expectedSourceSha: process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
});
const appId = formalRelease ? "com.amic.matter.desktop" : "com.amic.matter.desktop.internal";
const artifactName = formalRelease ? `matter-${packageJson.version}` : `matter-internal-${packageJson.version}`;
const installerPath = join(desktopRoot, "dist", `${artifactName}-win-x64.exe`);
const blockmapPath = `${installerPath}.blockmap`;
const unpackedPath = join(desktopRoot, "dist", "win-unpacked");
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");
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
  await cp(join(desktopRoot, "build"), join(stagingProjectRoot, "build"), { recursive: true });
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
  await writeFile(join(stagingProjectRoot, "electron-builder.yml"), await readFile(builderConfigPath, "utf8"));

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
const relativeInstallerPath = "apps/desktop/dist/" + `${artifactName}-win-x64.exe`;
const relativeBlockmapPath = `${relativeInstallerPath}.blockmap`;
const priorReceipt = existsSync(receiptPath) ? await readFile(receiptPath, "utf8") : "";
const receiptSection = `\n## Installer Package\n\n- Windows installer: \`${relativeInstallerPath}\`\n- Windows installer sha256: \`${installer.sha256}\`\n- Windows installer bytes: ${installer.bytes}\n- Windows installer blockmap: \`${relativeBlockmapPath}\`\n- Windows installer blockmap sha256: \`${blockmap.sha256}\`\n- Windows installer blockmap bytes: ${blockmap.bytes}\n- Windows installer packaging: nsis-x64\n- Windows renderer runtime assets: verified (${runtimeAssetPaths.length})\n- Windows native install smoke: not_run_on_darwin\n- Windows Authenticode signing: false\n`;

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
      windows_native_install_smoke: "not_run_on_darwin",
      windows_authenticode_signing: false,
    },
    null,
    2,
  ),
);
