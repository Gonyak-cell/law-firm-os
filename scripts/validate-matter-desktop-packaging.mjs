#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const configPath = "apps/desktop/electron-builder.yml";
const macBuildScriptPath = "scripts/build-matter-desktop-mac.mjs";
const generatorPath = "scripts/generate-matter-desktop-icon.mjs";
const webAssetMarkPath = "apps/web/src/assets/matter-mark.svg";
const webPublicMarkPath = "apps/web/public/matter-mark.svg";
const webAssetLogoPath = "apps/web/src/assets/matter-logo.svg";
const iconPath = "apps/desktop/build/icon.svg";
const sourceMarkPath = "apps/desktop/build/icon-source-mark.png";
const pngIconPath = "apps/desktop/build/icon.png";
const macIconPath = "apps/desktop/build/icon.icns";
const winIconPath = "apps/desktop/build/icon.ico";
const source = readFileSync(configPath, "utf8");
const macBuildSource = readFileSync(macBuildScriptPath, "utf8");

assert.match(source, /^appId:\s*com\.amic\.matter\.desktop\.internal$/m, "packaging config must use internal app ID");
assert.match(source, /^productName:\s*matter$/m, "packaging config must use product name matter");
assert.match(source, /^\s+-\s*"src\/\*\*\/\*"$/m, "packaging config must include desktop src files");
assert.match(source, /^\s+-\s*"package\.json"$/m, "packaging config must include package.json");
assert.match(source, /^\s+-\s*"!test\/\*\*\/\*"$/m, "packaging config must exclude tests");
assert.match(source, /mac:[\s\S]*icon:\s*build\/icon\.icns/, "mac icon must be configured as an icns asset");
assert.match(source, /win:[\s\S]*icon:\s*build\/icon\.ico/, "win icon must be configured as an ico asset");
assert.equal(existsSync(macBuildScriptPath), true, "mac build script must exist");
assert.equal(existsSync(generatorPath), true, "desktop icon generator must exist");
assert.equal(existsSync(webAssetMarkPath), true, "web source mark must exist");
assert.equal(existsSync(webPublicMarkPath), true, "web public mark must exist");
assert.equal(existsSync(webAssetLogoPath), true, "web source logo must exist");
assert.equal(existsSync(iconPath), true, "desktop source icon must exist");
assert.equal(existsSync(sourceMarkPath), true, "desktop source mark crop must exist");
assert.equal(existsSync(pngIconPath), true, "desktop runtime png icon must exist");
assert.equal(existsSync(macIconPath), true, "desktop mac icns icon must exist");
assert.equal(existsSync(winIconPath), true, "desktop win ico icon must exist");
const iconSource = readFileSync(iconPath, "utf8");
const webAssetMarkSource = readFileSync(webAssetMarkPath, "utf8");
const webPublicMarkSource = readFileSync(webPublicMarkPath, "utf8");
const webAssetLogoSource = readFileSync(webAssetLogoPath, "utf8");
assert.match(iconSource, /<svg[^>]*width="128"[^>]*height="128"[^>]*viewBox="0 0 128 128"/, "desktop icon must be a square app icon");
assert.doesNotMatch(iconSource, /<rect[^>]*width="128"[^>]*height="128"[^>]*fill="#FFFFFF"/, "desktop icon canvas must not render as a sharp full-square background");
assert.match(iconSource, /<rect[^>]*width="112"[^>]*height="112"[^>]*rx="26"[^>]*fill="#FFFFFF"/, "desktop icon must include an opaque rounded-square background");
assert.match(iconSource, /docs\/ui-reference\/brand\/matter-by-amic-logo\.png/, "desktop icon must declare the original logo image source");
assert.match(iconSource, /data:image\/png;base64/, "desktop icon must embed the cropped original mark image");
assert.equal(/<text\b/.test(iconSource), false, "desktop icon must use the mark only, not the wordmark");
assert.match(macBuildSource, /packagedIconFile\s*=\s*"matter\.icns"/, "mac build must package a matter-named app icon");
assert.match(macBuildSource, /Set :CFBundleIconFile\s+\$\{packagedIconFile\}/, "mac bundle icon metadata must point at the matter icon file");
assert.match(macBuildSource, /rm\(join\(targetResourcesDir,\s*"electron\.icns"\)/, "mac build must remove inherited Electron icon");
assert.doesNotMatch(macBuildSource, /packagedIconPath\s*=\s*join\(resourcesDir,\s*"electron\.icns"\)/, "mac packaged icon path must not point at inherited Electron icon");
for (const [label, svgSource] of [
  ["web source mark", webAssetMarkSource],
  ["web public mark", webPublicMarkSource],
  ["web source logo", webAssetLogoSource]
]) {
  assert.match(svgSource, /docs\/ui-reference\/brand\/matter-by-amic-logo\.png/, `${label} must declare the original logo image source`);
  assert.match(svgSource, /data:image\/png;base64/, `${label} must embed the cropped original mark image`);
  assert.doesNotMatch(svgSource, /<rect\b[^>]*(FF2D55|FFCC00|00CA72)/i, `${label} must not redraw the mark with manual vector shapes`);
  assert.doesNotMatch(svgSource, /<circle\b/i, `${label} must not redraw the green dot manually`);
}
assert.match(source, /^publish:\s*null$/m, "public publish channel must be disabled");

const publicPublishProviders = /\b(provider|github|s3|spaces|generic|snapStore|keygen)\b/i;
const publishSection = source.split(/^publish:/m)[1] ?? "";
assert.equal(publicPublishProviders.test(publishSection), false, "packaging config must not define a public publish provider");

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      config: configPath,
      app_id: "com.amic.matter.desktop.internal",
      product_name: "matter",
      mac_build_script: macBuildScriptPath,
      generator: generatorPath,
      web_asset_mark: webAssetMarkPath,
      web_public_mark: webPublicMarkPath,
      web_asset_logo: webAssetLogoPath,
      icon: iconPath,
      source_mark: sourceMarkPath,
      runtime_icon: pngIconPath,
      mac_icon: macIconPath,
      mac_bundle_icon: "matter.icns",
      win_icon: winIconPath,
      public_publish_channel: false
    },
    null,
    2
  )
);
