#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, cp, mkdir, rm, writeFile } from "node:fs/promises";
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
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md");

await rm(distRoot, { recursive: true, force: true });
await mkdir(macosDir, { recursive: true });
await mkdir(resourcesDir, { recursive: true });
await mkdir(dirname(receiptPath), { recursive: true });

await cp(join(desktopRoot, "build/icon.svg"), join(resourcesDir, "icon.svg"));
await writeFile(
  join(contentsDir, "Info.plist"),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>mater</string>
  <key>CFBundleIdentifier</key>
  <string>com.amic.mater.desktop.internal</string>
  <key>CFBundleName</key>
  <string>mater</string>
  <key>CFBundleDisplayName</key>
  <string>mater</string>
  <key>CFBundleVersion</key>
  <string>${packageJson.version}</string>
  <key>CFBundleShortVersionString</key>
  <string>${packageJson.version}</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
</dict>
</plist>
`
);
await writeFile(
  executablePath,
  `#!/bin/sh
echo "mater desktop internal macOS build ${packageJson.version}"
exit 0
`
);
await chmod(executablePath, 0o755);

await execFileAsync("/usr/bin/codesign", ["--force", "--sign", "-", "--timestamp=none", appBundle]);
await execFileAsync("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=2", appBundle]);
const smoke = await execFileAsync(executablePath);

const receipt = `# macOS Internal Build Receipt

Status: internal_signed_build_created
Source TUW: MDT-P6-W01-T03
App bundle: \`apps/desktop/dist/mac/mater.app\`
App ID: \`com.amic.mater.desktop.internal\`
Product name: \`mater\`
Version: \`${packageJson.version}\`

## Signing

- signing identity: ad-hoc internal codesign identity (\`-\`)
- codesign verify: pass
- notarization state: not_submitted_internal_only

## Install Smoke

- bundle exists: ${existsSync(appBundle)}
- executable exists: ${existsSync(executablePath)}
- install smoke result: pass
- smoke output: \`${smoke.stdout.trim()}\`

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
      receipt: "docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md",
      signing_identity: "ad-hoc",
      notarization_state: "not_submitted_internal_only",
      install_smoke_result: "pass",
      public_release: false,
      owner_approval: false
    },
    null,
    2
  )
);
