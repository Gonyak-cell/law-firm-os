#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const desktopRoot = join(repoRoot, "apps/desktop");
const packageJson = JSON.parse(await readFile(join(desktopRoot, "package.json"), "utf8"));
const releaseChannel = process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal";
if (!["internal", "formal"].includes(releaseChannel)) {
  throw new Error("MATTER_DESKTOP_RELEASE_CHANNEL must be internal or formal.");
}

const formalRelease = releaseChannel === "formal";
const appId = formalRelease ? "com.amic.matter.desktop" : "com.amic.matter.desktop.internal";
const artifactName = formalRelease ? `matter-${packageJson.version}` : `matter-internal-${packageJson.version}`;
const installerPath = join(desktopRoot, "dist", `${artifactName}-win-x64.exe`);
const blockmapPath = `${installerPath}.blockmap`;
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");

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

await execFileAsync(
  "npx",
  [
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
  ],
  {
    cwd: desktopRoot,
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
  },
);

const installer = await fileRecord(installerPath);
const blockmap = await fileRecord(blockmapPath);
const relativeInstallerPath = "apps/desktop/dist/" + `${artifactName}-win-x64.exe`;
const relativeBlockmapPath = `${relativeInstallerPath}.blockmap`;
const priorReceipt = existsSync(receiptPath) ? await readFile(receiptPath, "utf8") : "";
const receiptSection = `\n## Installer Package\n\n- Windows installer: \`${relativeInstallerPath}\`\n- Windows installer sha256: \`${installer.sha256}\`\n- Windows installer bytes: ${installer.bytes}\n- Windows installer blockmap: \`${relativeBlockmapPath}\`\n- Windows installer blockmap sha256: \`${blockmap.sha256}\`\n- Windows installer blockmap bytes: ${blockmap.bytes}\n- Windows installer packaging: nsis-x64\n- Windows native install smoke: not_run_on_darwin\n- Windows Authenticode signing: false\n`;

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
      windows_native_install_smoke: "not_run_on_darwin",
      windows_authenticode_signing: false,
    },
    null,
    2,
  ),
);
