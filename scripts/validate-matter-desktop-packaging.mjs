#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const configPath = "apps/desktop/electron-builder.yml";
const macBuildScriptPath = "scripts/build-matter-desktop-mac.mjs";
const winBuildScriptPath = "scripts/build-matter-desktop-win.mjs";
const winInstallerScriptPath = "scripts/build-matter-desktop-win-installer.mjs";
const desktopRendererPath = "apps/desktop/src/renderer/offline.html";
const forestLoginPath = "apps/desktop/build/forest-login.jpg";
const webBrochureCoverPath = "apps/web/src/assets/brochure-cover.jpg";
const expectedForestHash = "5ff1776144df2fff44977494ea3eecdcf1f2d5c96dfc30deba3411bf320ee3bf";
const amicLawLogoPath = "apps/desktop/build/amic-law-logo-accent.svg";
const webAmicLawLogoPath = "apps/web/src/assets/amic-law.svg";
const webIconPath = "apps/web/public/amic-law-icon.png";
const pngIconPath = "apps/desktop/build/icon.png";
const macIconPath = "apps/desktop/build/icon.icns";
const winIconPath = "apps/desktop/build/icon.ico";
const expectedIconHashes = Object.freeze({
  [pngIconPath]: "19722c977aa783616b75769a87f4186416d64f2969c4669e9e15303606dd3916",
  [macIconPath]: "8fff8b262560a05b723bbaed39d56f6c277cae9cea312772cdff20b17ea1ef96",
  [winIconPath]: "70f741af2564838b4d7d45789af5b8fa970bfc8f9ff190d987f445295a26f075"
});
const retiredPaths = [
  "docs/ui-reference",
  "apps/web/src/assets/matter-mark.svg",
  "apps/web/public/matter-mark.svg",
  "apps/web/src/assets/matter-logo.svg",
  "apps/web/src/assets/parnas-tower-login.jpg",
  "apps/web/src/assets/logos/AMIC_n_PETRA_Main_Simple.svg",
  "apps/web/src/assets/logos/AMIC_n_PETRA_Main_Simple_White.svg",
  "apps/web/src/context/SkinContext.jsx",
  "apps/desktop/build/icon-source-mark.png",
  "apps/desktop/build/icon.svg",
  "apps/desktop/build/amic-petra-main.svg",
  "apps/desktop/src/renderer/offline.matter.html",
  "scripts/generate-matter-desktop-icon.mjs",
  "scripts/generate-amplitude-ui-reference.mjs",
  "scripts/extract-amplitude-visual-tokens.mjs",
  "scripts/generate-matter-amplitude-screenshot-state-registry.mjs",
  "scripts/verify-matter-amplitude-screenshot-states.mjs",
  "scripts/generate-matter-amplitude-coverage-ledger.mjs",
  "scripts/capture-matter-amplitude-parity.mjs",
  "scripts/audit-matter-amplitude-pixel-parity.mjs",
  "scripts/test/ui-tooling-smoke.test.mjs"
];
const source = readFileSync(configPath, "utf8");
const macBuildSource = readFileSync(macBuildScriptPath, "utf8");
const winBuildSource = readFileSync(winBuildScriptPath, "utf8");
const winInstallerSource = readFileSync(winInstallerScriptPath, "utf8");
const desktopRendererSource = readFileSync(desktopRendererPath, "utf8");
const sha256File = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

assert.match(source, /^appId:\s*com\.amic\.matter\.desktop\.internal$/m, "packaging config must use internal app ID");
assert.match(source, /^productName:\s*matter$/m, "packaging config must use product name matter");
assert.match(source, /^asar:\s*false$/m, "packaging config must keep runtime assets inspectable in the unpacked app");
assert.match(source, /^\s+-\s*"src\/\*\*\/\*"$/m, "packaging config must include desktop src files");
assert.match(source, /^\s+-\s*"build\/\*\*\/\*"$/m, "packaging config must include desktop runtime assets");
assert.match(source, /^\s+-\s*"package\.json"$/m, "packaging config must include package.json");
assert.match(source, /^\s+-\s*"!test\/\*\*\/\*"$/m, "packaging config must exclude tests");
assert.match(source, /mac:[\s\S]*icon:\s*build\/icon\.icns/, "mac icon must be configured as an icns asset");
assert.match(source, /win:[\s\S]*icon:\s*build\/icon\.ico/, "win icon must be configured as an ico asset");
assert.equal(existsSync(macBuildScriptPath), true, "mac build script must exist");
assert.equal(existsSync(forestLoginPath), true, "Forest login image must exist");
assert.equal(readFileSync(forestLoginPath).equals(readFileSync(webBrochureCoverPath)), true, "desktop and web login must reuse the approved Forest brochure cover");
assert.equal(sha256File(forestLoginPath), expectedForestHash, "Forest login image must match the clean approved source");
assert.match(desktopRendererSource, /forest-login\.jpg\?v=5ff17761/, "desktop login must use a cache-busted approved Forest brochure image URL");
assert.equal(existsSync(amicLawLogoPath), true, "desktop AMIC Law logo must exist");
assert.equal(existsSync(webAmicLawLogoPath), true, "web AMIC Law logo must exist");
assert.equal(existsSync(pngIconPath), true, "desktop runtime png icon must exist");
assert.equal(existsSync(webIconPath), true, "web AMIC Law icon must exist");
assert.equal(readFileSync(webIconPath).equals(readFileSync(pngIconPath)), true, "web and desktop must reuse the current AMIC green-A icon");
assert.equal(existsSync(macIconPath), true, "desktop mac icns icon must exist");
assert.equal(existsSync(winIconPath), true, "desktop win ico icon must exist");
for (const [iconPath, expectedHash] of Object.entries(expectedIconHashes)) {
  assert.equal(sha256File(iconPath), expectedHash, `desktop icon must match the current AMIC green-A asset: ${iconPath}`);
}
for (const retiredPath of retiredPaths) {
  assert.equal(existsSync(retiredPath), false, `retired UI asset must stay deleted: ${retiredPath}`);
}
assert.match(macBuildSource, /packagedIconFile\s*=\s*"matter\.icns"/, "mac build must package a matter-named app icon");
assert.match(winBuildSource, /files:\s*\["src\/\*\*\/\*",\s*"build\/\*\*\/\*",\s*"package\.json"\]/, "Windows manifest must include runtime assets");
assert.match(winInstallerSource, /const runtimeAssetPaths = \[/, "Windows installer must verify renderer runtime assets");
assert.match(winInstallerSource, /Windows runtime asset hash mismatch/, "Windows installer must fail on runtime asset drift");
assert.match(macBuildSource, /Set :CFBundleIconFile\s+\$\{packagedIconFile\}/, "mac bundle icon metadata must point at the matter icon file");
assert.match(macBuildSource, /rm\(join\(targetResourcesDir,\s*"electron\.icns"\)/, "mac build must remove inherited Electron icon");
assert.doesNotMatch(macBuildSource, /packagedIconPath\s*=\s*join\(resourcesDir,\s*"electron\.icns"\)/, "mac packaged icon path must not point at inherited Electron icon");
assert.match(source, /^publish:\s*null$/m, "public publish channel must be disabled");

const publicPublishProviders = /\b(provider|github|s3|spaces|generic|snapStore|keygen)\b/i;
const publishSection = source.split(/^publish:/m)[1] ?? "";
assert.equal(publicPublishProviders.test(publishSection), false, "packaging config must not define a public publish provider");

console.log(JSON.stringify({
  verdict: "PASS",
  config: configPath,
  app_id: "com.amic.matter.desktop.internal",
  product_name: "matter",
  mac_build_script: macBuildScriptPath,
  win_build_script: winBuildScriptPath,
  win_installer_script: winInstallerScriptPath,
  desktop_renderer: desktopRendererPath,
  forest_login: forestLoginPath,
  web_forest_brochure_cover: webBrochureCoverPath,
  forest_sha256: expectedForestHash,
  amic_law_logo: amicLawLogoPath,
  web_amic_law_logo: webAmicLawLogoPath,
  web_icon: webIconPath,
  runtime_icon: pngIconPath,
  mac_icon: macIconPath,
  mac_bundle_icon: "matter.icns",
  win_icon: winIconPath,
  icon_sha256: expectedIconHashes,
  retired_ui_paths_absent: retiredPaths,
  public_publish_channel: false
}, null, 2));
