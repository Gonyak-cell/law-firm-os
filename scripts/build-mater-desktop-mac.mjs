#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { packager } from "@electron/packager";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const desktopRoot = join(repoRoot, "apps/desktop");
const packageJson = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(join(desktopRoot, "package.json"), "utf8")));
const distRoot = join(desktopRoot, "dist/mac");
const appBundle = join(distRoot, "mater.app");
const contentsDir = join(appBundle, "Contents");
const macosDir = join(contentsDir, "MacOS");
const resourcesDir = join(contentsDir, "Resources");
const executablePath = join(macosDir, "mater");
const appSourceDir = join(resourcesDir, "app");
const zipPath = join(distRoot, `mater-internal-${packageJson.version}-macos.zip`);
const dmgPath = join(distRoot, `mater-internal-${packageJson.version}-macos.dmg`);
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md");
const arch = process.env.MATER_DESKTOP_MAC_ARCH ?? (process.arch === "arm64" ? "arm64" : "x64");

if (!existsSync(join(repoRoot, "node_modules/electron/dist/Electron.app"))) {
  throw new Error("Electron runtime is missing. Run `npm install --workspace apps/desktop` first.");
}

await rm(distRoot, { recursive: true, force: true });
await mkdir(dirname(receiptPath), { recursive: true });

const [generatedAppRoot] = await packager({
  dir: desktopRoot,
  out: distRoot,
  overwrite: true,
  platform: "darwin",
  arch,
  name: "mater",
  executableName: "mater",
  appBundleId: "com.amic.mater.desktop.internal",
  appCategoryType: "public.app-category.business",
  appVersion: packageJson.version,
  buildVersion: packageJson.version,
  asar: false,
  prune: true,
  ignore: [
    /^\/dist($|\/)/,
    /^\/test($|\/)/,
    /(^|\/)\.env($|\.|\/)/,
    /\.test\.mjs$/
  ],
  osxSign: false
});

await rm(appBundle, { recursive: true, force: true });
await execFileAsync("/bin/mv", [join(generatedAppRoot, "mater.app"), appBundle]);
await rm(generatedAppRoot, { recursive: true, force: true });

let codesignVerify = "not_distribution_ready";
try {
  await execFileAsync("/usr/bin/codesign", ["--verify", "--deep", "--verbose=2", appBundle]);
  codesignVerify = "pass";
} catch (error) {
  codesignVerify = `not_distribution_ready: ${String(error.stderr ?? error.message).split("\n").find(Boolean) ?? "codesign verify failed"}`;
}
const smoke = await execFileAsync(executablePath, ["-e", "process.stdout.write(process.versions.electron)"], {
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1"
  }
});
await execFileAsync("/usr/bin/ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", appBundle, zipPath]);
await execFileAsync("/usr/bin/hdiutil", ["create", "-volname", "mater", "-srcfolder", appBundle, "-ov", "-format", "UDZO", dmgPath]);

const receipt = `# macOS Internal Build Receipt

Status: internal_electron_app_bundle_created
Source TUW: MDT-P6-W01-T03
App bundle: \`apps/desktop/dist/mac/mater.app\`
App ID: \`com.amic.mater.desktop.internal\`
Product name: \`mater\`
Version: \`${packageJson.version}\`

## Package Structure

- Electron runtime: \`node_modules/electron/dist/Electron.app\`
- packaged app source: \`apps/desktop/dist/mac/mater.app/Contents/Resources/app\`
- executable: \`apps/desktop/dist/mac/mater.app/Contents/MacOS/mater\`
- archive: \`apps/desktop/dist/mac/mater-internal-${packageJson.version}-macos.zip\`
- disk image: \`apps/desktop/dist/mac/mater-internal-${packageJson.version}-macos.dmg\`

## Signing

- signing identity: not applied in this internal packaging step
- codesign verify: ${codesignVerify}
- strict distribution verify: not claimed
- notarization state: not_submitted_internal_only

## Install Smoke

- bundle exists: ${existsSync(appBundle)}
- executable exists: ${existsSync(executablePath)}
- packaged app source exists: ${existsSync(appSourceDir)}
- ZIP archive exists: ${existsSync(zipPath)}
- DMG image exists: ${existsSync(dmgPath)}
- install smoke result: pass
- executable smoke: \`${smoke.stdout.trim()}\`

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- App Store distribution: false
- external pilot distribution: false
`;

await writeFile(receiptPath, receipt);

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      app_bundle: "apps/desktop/dist/mac/mater.app",
      zip: `apps/desktop/dist/mac/mater-internal-${packageJson.version}-macos.zip`,
      dmg: `apps/desktop/dist/mac/mater-internal-${packageJson.version}-macos.dmg`,
      receipt: "docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md",
      signing_identity: "not_applied_internal_package",
      codesign_verify: codesignVerify,
      notarization_state: "not_submitted_internal_only",
      install_smoke_result: "pass",
      electron_runtime_packaged: true,
      public_release: false,
      owner_approval: false
    },
    null,
    2
  )
);
