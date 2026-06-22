#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const configPath = "apps/desktop/electron-builder.yml";
const iconPath = "apps/desktop/build/icon.svg";
const pngIconPath = "apps/desktop/build/icon.png";
const macIconPath = "apps/desktop/build/icon.icns";
const winIconPath = "apps/desktop/build/icon.ico";
const source = readFileSync(configPath, "utf8");

assert.match(source, /^appId:\s*com\.amic\.matter\.desktop\.internal$/m, "packaging config must use internal app ID");
assert.match(source, /^productName:\s*matter$/m, "packaging config must use product name matter");
assert.match(source, /^\s+-\s*"src\/\*\*\/\*"$/m, "packaging config must include desktop src files");
assert.match(source, /^\s+-\s*"package\.json"$/m, "packaging config must include package.json");
assert.match(source, /^\s+-\s*"!test\/\*\*\/\*"$/m, "packaging config must exclude tests");
assert.match(source, /mac:[\s\S]*icon:\s*build\/icon\.icns/, "mac icon must be configured as an icns asset");
assert.match(source, /win:[\s\S]*icon:\s*build\/icon\.ico/, "win icon must be configured as an ico asset");
assert.equal(existsSync(iconPath), true, "desktop source icon must exist");
assert.equal(existsSync(pngIconPath), true, "desktop runtime png icon must exist");
assert.equal(existsSync(macIconPath), true, "desktop mac icns icon must exist");
assert.equal(existsSync(winIconPath), true, "desktop win ico icon must exist");
const iconSource = readFileSync(iconPath, "utf8");
assert.match(iconSource, /<svg[^>]*width="128"[^>]*height="128"[^>]*viewBox="0 0 128 128"/, "desktop icon must be a square app icon");
assert.match(iconSource, /#FF2D55/, "desktop icon must include matter red mark segment");
assert.match(iconSource, /#FFCC00/, "desktop icon must include matter yellow mark segment");
assert.match(iconSource, /#00CA72/, "desktop icon must include matter green mark segment");
assert.equal(/<text\b/.test(iconSource), false, "desktop icon must use the mark only, not the wordmark");
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
      icon: iconPath,
      runtime_icon: pngIconPath,
      mac_icon: macIconPath,
      win_icon: winIconPath,
      public_publish_channel: false
    },
    null,
    2
  )
);
