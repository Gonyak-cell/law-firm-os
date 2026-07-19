import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  auditLegacyRuntimeSafetyEvidence,
  EXPECTED_LEGACY_AUDIT,
  validateStrictRuntimeSafetyEvidence,
} from "../lib/runtime-safety-evidence-audit.mjs";

const ROOT = process.cwd();
const PLAN = readFileSync(join(ROOT, "workbook/lawos-runtime-safety-central-ledger-detailed-tuw-execution-plan-2026-07-16.md"), "utf8");
const EVIDENCE = join(ROOT, "workbook/lawos-runtime-safety-evidence");

test("legacy audit reproduces the frozen 113-receipt defect counts", () => {
  const result = auditLegacyRuntimeSafetyEvidence({ evidenceRoot: EVIDENCE, planText: PLAN });
  assert.equal(result.verdict, "PASS");
  for (const [key, expected] of Object.entries(EXPECTED_LEGACY_AUDIT)) assert.equal(result[key], expected, key);
});

test("strict evidence validates all 147 v0.2 receipts and reachable evidence lineage", () => {
  const report = validateStrictRuntimeSafetyEvidence({
    repoRoot: ROOT,
    evidenceRoot: EVIDENCE,
    planText: PLAN,
    allowedOutputRoots: ["/Users/jws/.codex/recovery/law-firm-os/runtime-safety-runs-20260717"],
    requireClean: false,
  });
  assert.equal(report.verdict, "PASS");
  assert.equal(report.planned_tuw_count, 147);
  assert.equal(report.valid_v0_2_count, 147);
  assert.equal(report.failure_count, 0);
});
