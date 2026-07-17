#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectDomainAdapterSources,
  validateDomainAdapterCompletenessReceipt,
} from "./lib/central-ledger-domain-completeness.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_RECEIPT = "workbook/lawos-runtime-safety-evidence/RS-DOM-030/domain-completeness.json";

function parseArgs(argv) {
  const options = { sourceOnly: false, receipt: DEFAULT_RECEIPT, expectedSourceSha: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-only") options.sourceOnly = true;
    else if (arg === "--receipt") options.receipt = argv[++index];
    else if (arg === "--expected-source-sha") options.expectedSourceSha = argv[++index];
    else throw new TypeError(`unknown argument: ${arg}`);
  }
  return options;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source = await inspectDomainAdapterSources({ root: ROOT });
  if (options.sourceOnly) {
    console.log(JSON.stringify({
      validator: "central-ledger-domain-completeness",
      mode: "source-only",
      ...source,
      production_ready_claim: false,
      go_live_claim: false,
    }, null, 2));
    return;
  }
  const receipt = JSON.parse(readFileSync(resolve(ROOT, options.receipt), "utf8"));
  const result = validateDomainAdapterCompletenessReceipt(receipt, {
    expectedSourceSha: options.expectedSourceSha ?? receipt.source_sha,
  });
  assert.equal(git("rev-parse", `${receipt.source_sha}^{commit}`), receipt.source_sha, "source commit does not exist");
  assert.equal(git("rev-parse", `${receipt.source_sha}^{tree}`), receipt.tree, "source tree does not match receipt");
  assert.equal(git("merge-base", "--is-ancestor", receipt.source_sha, "HEAD"), "", "source commit is not an ancestor of HEAD");
  console.log(JSON.stringify({
    validator: "central-ledger-domain-completeness",
    mode: "receipt",
    ...result,
    source_surface_domain_count: source.domain_count,
    production_ready_claim: false,
    go_live_claim: false,
  }, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
}
