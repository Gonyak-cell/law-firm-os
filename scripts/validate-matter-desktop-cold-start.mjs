#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateColdStartReceipt } from "./lib/matter-desktop-cold-start-contract.mjs";

function usage() {
  return "Usage: node scripts/validate-matter-desktop-cold-start.mjs --receipt <receipt.json>";
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--help") return { help: true };
  if (argv.length !== 2 || argv[0] !== "--receipt") throw new Error(usage());
  return { receipt: path.resolve(process.cwd(), argv[1]) };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(usage());
  process.exit(0);
}

try {
  const receipt = JSON.parse(await readFile(args.receipt, "utf8"));
  validateColdStartReceipt(receipt);
  console.log(JSON.stringify({
    verdict: receipt.status,
    status: receipt.status,
    receipt: path.relative(process.cwd(), args.receipt),
    run_count: receipt.run_count,
    required_run_count: receipt.required_run_count,
    percentile_method: receipt.percentile_method,
    median_ms: receipt.median_ms,
    p95_ms: receipt.p95_ms,
    historical_rf13_internal_artifact_used: receipt.claims?.historical_rf13_internal_artifact_used ?? null,
  }, null, 2));
  process.exitCode = receipt.status === "PASS" ? 0 : 2;
} catch (error) {
  console.error(`cold-start receipt invalid: ${error.message}`);
  process.exitCode = 2;
}
