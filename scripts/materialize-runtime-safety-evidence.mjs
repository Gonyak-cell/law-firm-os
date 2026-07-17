#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { materializeRuntimeSafetyEvidence } from "./lib/runtime-safety-evidence-materializer.mjs";

function value(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

try {
  const manifestPath = value("--manifest");
  const sourceRoot = value("--source-root");
  const destinationRoot = value("--destination-root") ?? process.cwd();
  if (!manifestPath || !sourceRoot) throw new Error("--manifest and --source-root are required");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const result = materializeRuntimeSafetyEvidence({ sourceRoot, destinationRoot, entries: manifest.entries });
  process.stdout.write(`${JSON.stringify({ verdict: "PASS", ...result }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "EVIDENCE_MATERIALIZER", message: error.message })}\n`);
  process.exit(1);
}
