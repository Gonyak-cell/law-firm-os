#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditLegacyRuntimeSafetyEvidence,
  validateStrictRuntimeSafetyEvidence,
} from "./lib/runtime-safety-evidence-audit.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_ROOT = join(ROOT, "workbook/lawos-runtime-safety-evidence");
const PLAN_PATH = join(ROOT, "workbook/lawos-runtime-safety-central-ledger-detailed-tuw-execution-plan-2026-07-16.md");
const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex === -1 ? "audit" : process.argv[modeIndex + 1];
const outputRoots = process.argv.flatMap((arg, index) => arg === "--output-root" ? [process.argv[index + 1]] : []);

try {
  const planText = readFileSync(PLAN_PATH, "utf8");
  const result = mode === "audit"
    ? auditLegacyRuntimeSafetyEvidence({ evidenceRoot: EVIDENCE_ROOT, planText })
    : mode === "strict"
      ? validateStrictRuntimeSafetyEvidence({ repoRoot: ROOT, evidenceRoot: EVIDENCE_ROOT, planText, allowedOutputRoots: outputRoots })
      : (() => { throw new Error("--mode must be audit or strict"); })();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.verdict !== "PASS") process.exit(1);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", code: error.code ?? "RUNTIME_SAFETY_EVIDENCE", message: error.message })}\n`);
  process.exit(1);
}
