#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { APPROVED_DESKTOP_ASSET_HASHES, RETIRED_UI_PATHS } from "./lib/matter-desktop-legacy-assets.mjs";

const configPath = "apps/desktop/electron-builder.yml";
const macBuildScriptPath = "scripts/build-matter-desktop-mac.mjs";
const winBuildScriptPath = "scripts/build-matter-desktop-win.mjs";
const winInstallerScriptPath = "scripts/build-matter-desktop-win-installer.mjs";
const desktopRendererPath = "apps/desktop/src/renderer/offline.html";
const forestLoginPath = "apps/desktop/build/forest-login.jpg";
const webBrochureCoverPath = "apps/web/src/assets/brochure-cover.jpg";
const expectedForestHash = APPROVED_DESKTOP_ASSET_HASHES.brochure_cover;
const amicLawLogoPath = "apps/desktop/build/amic-law-logo-accent.svg";
const webAmicLawLogoPath = "apps/web/src/assets/amic-law.svg";
const webIconPath = "apps/web/public/amic-law-icon.png";
const pngIconPath = "apps/desktop/build/icon.png";
const macIconPath = "apps/desktop/build/icon.icns";
const winIconPath = "apps/desktop/build/icon.ico";
const expectedIconHashes = Object.freeze({
  [pngIconPath]: APPROVED_DESKTOP_ASSET_HASHES.icon_png,
  [macIconPath]: APPROVED_DESKTOP_ASSET_HASHES.icon_icns,
  [winIconPath]: APPROVED_DESKTOP_ASSET_HASHES.icon_ico
});
const retiredPaths = RETIRED_UI_PATHS;
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
assert.match(winInstallerSource, /Windows installer must embed the build manifest/, "Windows installer must embed exact-source provenance");
assert.match(winInstallerSource, /Windows installer formal marker must match the release channel/, "Windows installer must enforce the formal local-API boundary");
assert.match(winInstallerSource, /Windows installer renderer must match its build manifest/, "Windows installer must verify renderer provenance");
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
