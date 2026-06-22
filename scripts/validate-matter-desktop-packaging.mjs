#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const configPath = "apps/desktop/electron-builder.yml";
const iconPath = "apps/desktop/build/icon.svg";
const source = readFileSync(configPath, "utf8");

assert.match(source, /^appId:\s*com\.amic\.matter\.desktop\.internal$/m, "packaging config must use internal app ID");
assert.match(source, /^productName:\s*matter$/m, "packaging config must use product name matter");
assert.match(source, /^\s+-\s*"src\/\*\*\/\*"$/m, "packaging config must include desktop src files");
assert.match(source, /^\s+-\s*"package\.json"$/m, "packaging config must include package.json");
assert.match(source, /^\s+-\s*"!test\/\*\*\/\*"$/m, "packaging config must exclude tests");
assert.match(source, /mac:[\s\S]*icon:\s*build\/icon\.svg/, "mac icon must be configured");
assert.match(source, /win:[\s\S]*icon:\s*build\/icon\.svg/, "win icon must be configured");
assert.equal(existsSync(iconPath), true, "desktop packaging icon must exist");
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
      public_publish_channel: false
    },
    null,
    2
  )
);
