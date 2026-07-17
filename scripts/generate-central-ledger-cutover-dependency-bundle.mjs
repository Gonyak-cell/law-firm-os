#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCutDependencyBundle } from "./lib/central-ledger-cutover-contract.mjs";

function parse(argv) {
  const result = { artifacts: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[++index];
    if (!flag?.startsWith("--") || value === undefined) throw new TypeError(`invalid argument: ${flag ?? "<missing>"}`);
    if (flag === "--artifact") {
      const separator = value.indexOf("=");
      if (separator < 1) throw new TypeError("--artifact must be KEY=PATH");
      result.artifacts.push({ key: value.slice(0, separator), path: value.slice(separator + 1) });
    } else result[flag.slice(2)] = value;
  }
  return result;
}

try {
  const options = parse(process.argv.slice(2));
  const bundle = createCutDependencyBundle({ sourceSha: options["source-sha"], artifacts: options.artifacts });
  writeFileSync(resolve(options.output), `${JSON.stringify(bundle, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ verdict: "PASS", artifact_count: bundle.artifacts.length, source_sha: bundle.source_sha }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "CUT_BUNDLE", message: error.message, details: error.details ?? {} })}\n`);
  process.exit(1);
}
