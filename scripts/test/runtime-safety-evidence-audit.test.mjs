import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { auditLegacyRuntimeSafetyEvidence, EXPECTED_LEGACY_AUDIT } from "../lib/runtime-safety-evidence-audit.mjs";

const ROOT = process.cwd();
const PLAN = readFileSync(join(ROOT, "workbook/lawos-runtime-safety-central-ledger-detailed-tuw-execution-plan-2026-07-16.md"), "utf8");
const EVIDENCE = join(ROOT, "workbook/lawos-runtime-safety-evidence");

test("legacy audit reproduces the frozen 113-receipt defect counts", () => {
  const result = auditLegacyRuntimeSafetyEvidence({ evidenceRoot: EVIDENCE, planText: PLAN });
  assert.equal(result.verdict, "PASS");
  for (const [key, expected] of Object.entries(EXPECTED_LEGACY_AUDIT)) assert.equal(result[key], expected, key);
});

test("strict current-tree mode truthfully fails before 147 v0.2 receipts exist", () => {
  const result = spawnSync(process.execPath, ["scripts/validate-runtime-safety-evidence.mjs", "--mode", "strict"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.planned_tuw_count, 147);
  assert.ok(report.failures.some((failure) => failure.code === "STRICT_V0_2_MISSING"));
});
