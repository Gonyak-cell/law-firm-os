import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MATTER_SMALL_FIRM_RF_IDS,
  MATTER_SMALL_FIRM_TUW_IDS,
  validateMatterSmallFirmGoal,
} from "../validate-matter-small-firm-os-goal.mjs";

const GOAL_PATH = new URL(
  "../../workbook/matter-small-firm-os-implementation-goal-2026-07-30.md",
  import.meta.url,
);

test("Matter small-firm OS goal tracks every TUW exactly once", async () => {
  const markdown = await readFile(GOAL_PATH, "utf8");
  const result = validateMatterSmallFirmGoal(markdown);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.total, MATTER_SMALL_FIRM_TUW_IDS.length);
  assert.equal(Object.values(result.counts).reduce((sum, count) => sum + count, 0), 42);
  assert.equal(result.remediationTotal, MATTER_SMALL_FIRM_RF_IDS.length);
  assert.equal(
    Object.values(result.remediationCounts).reduce((sum, count) => sum + count, 0),
    MATTER_SMALL_FIRM_RF_IDS.length,
  );
});

test("completion mode accepts only the sealed TUW and remediation ledgers", async () => {
  const markdown = await readFile(GOAL_PATH, "utf8");
  const result = validateMatterSmallFirmGoal(markdown, { requireComplete: true });

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.counts.COMPLETE, MATTER_SMALL_FIRM_TUW_IDS.length);
  assert.equal(result.remediationCounts.COMPLETE, MATTER_SMALL_FIRM_RF_IDS.length);
  assert.equal(result.executionEvidenceTotal >= MATTER_SMALL_FIRM_TUW_IDS.length, true);
  assert.equal(result.remediationEvidenceTotal >= MATTER_SMALL_FIRM_RF_IDS.length, true);
  assert.deepEqual(result.finalGates, {
    G0: "PASS",
    G1: "PASS",
    G2: "PASS",
    G3: "PASS",
    G4: "PASS",
    G5: "PASS",
  });
});
