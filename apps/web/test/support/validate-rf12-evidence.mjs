import assert from "node:assert/strict";
import { resolve } from "node:path";

import { validateRf12Evidence } from "./rf12-evidence-support.mjs";

const evidenceIndex = process.argv.indexOf("--evidence");
assert.ok(evidenceIndex >= 0 && process.argv[evidenceIndex + 1], "usage: validate-rf12-evidence --evidence <dir>");

const sourceNames = [
  "apps/web/test/matter-small-firm-live-http-e2e.test.mjs",
  "apps/web/test/support/rf12-live-http-support.mjs",
  "apps/web/test/support/rf12-fixture-support.mjs",
  "apps/web/test/support/rf12-browser-support.mjs",
  "apps/web/test/support/rf12-evidence-sanitize.mjs",
  "apps/web/test/support/rf12-evidence-support.mjs",
  "apps/web/test/support/validate-rf12-evidence.mjs",
];
const result = await validateRf12Evidence({
  evidenceDir: resolve(process.argv[evidenceIndex + 1]),
  sourceFiles: sourceNames.map((name) => ({ name, path: resolve(name) })),
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
