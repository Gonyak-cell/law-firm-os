#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { materializeRuntimeSafetyDependencies } from "./lib/runtime-safety-dependency-materialization.mjs";

function value(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

try {
  const output = value("--output");
  if (!output) throw new Error("--output is required");
  const receipt = materializeRuntimeSafetyDependencies({
    repo: value("--repo"),
    targetSourceSha: value("--target-source-sha"),
    targetTree: value("--target-tree"),
    lockfile: value("--lockfile") ?? "package-lock.json",
    npmCi: process.argv.includes("--npm-ci"),
  });
  writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ verdict: "PASS", output, target_source_sha: receipt.target_source_sha, target_tree: receipt.target_tree, lockfile_sha256: receipt.lockfile_sha256 }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "DEPENDENCY", message: error.message })}\n`);
  process.exit(1);
}
