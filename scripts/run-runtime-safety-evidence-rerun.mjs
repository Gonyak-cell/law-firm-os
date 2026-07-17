#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { runRuntimeSafetyTuw } from "./lib/runtime-safety-isolated-runner.mjs";

function value(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

try {
  const manifest = JSON.parse(readFileSync(value("--manifest"), "utf8"));
  const tuwId = value("--tuw");
  const row = manifest.rows.find((entry) => entry.tuw_id === tuwId);
  if (!row) throw new Error("--tuw must select one manifest row");
  const dependencyReceipt = JSON.parse(readFileSync(value("--dependency-receipt"), "utf8"));
  const variables = value("--variables") ? JSON.parse(readFileSync(value("--variables"), "utf8")) : {};
  const receipt = await runRuntimeSafetyTuw({
    row,
    checkout: value("--checkout"),
    targetSourceSha: value("--target-source-sha"),
    targetTree: value("--target-tree"),
    toolchainSha: value("--toolchain-sha"),
    dependencyReceipt,
    outputDir: value("--output-dir"),
    variables,
    variant: value("--variant"),
    profile: value("--profile") ?? "source-local",
    requiredPostgres: process.argv.includes("--require-postgres"),
    allowGitFetch: process.argv.includes("--allow-standalone-git-fetch"),
  });
  const output = value("--receipt-output");
  if (output) writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ verdict: "PASS", tuw_id: receipt.tuw_id, target_source_sha: receipt.target_source_sha, output_sha256: receipt.output_sha256 }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "RUNNER", message: error.message, details: error.details ?? {} })}\n`);
  process.exit(1);
}
