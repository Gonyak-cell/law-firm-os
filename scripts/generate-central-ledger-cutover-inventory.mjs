#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCutSourceInventory } from "./lib/central-ledger-cutover-contract.mjs";

function value(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

try {
  const bundlePath = value("--dependency-receipt-bundle");
  if (!bundlePath) throw new TypeError("--dependency-receipt-bundle is required");
  const inventory = createCutSourceInventory({
    sourceSha: value("--source-sha"),
    dependencyBundle: JSON.parse(readFileSync(resolve(bundlePath), "utf8")),
  });
  writeFileSync(resolve(value("--output")), `${JSON.stringify(inventory, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ verdict: "PASS", source_sha: inventory.source_sha, file_count: inventory.files.length, dependency_satisfied: inventory.dependency_satisfied, blockers: inventory.blockers }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "CUT_INVENTORY", message: error.message, details: error.details ?? {} })}\n`);
  process.exit(1);
}
