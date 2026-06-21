import test from "node:test";
import assert from "node:assert/strict";
import {
  createRuntimeReadyEvidenceReport,
  runRuntimeIntegrationHarness,
  validateRuntimeIntegrationResponsibilityMap
} from "../src/index.js";

test("RS-6 readiness report separates repo runtime-ready candidate from launch approval", () => {
  const report = createRuntimeReadyEvidenceReport(runRuntimeIntegrationHarness({ fixture: undefined }));
  assert.equal(report.status, "ready_candidate");
  assert.equal(report.runtime_ready_candidate, true);
  assert.equal(report.actual_launch_go_live_claim, false);
  assert.equal(report.production_ready_claim, false);
  assert.equal(report.sandbox_attestation.synthetic_only, true);
});

test("RS-6 RTG-005 responsibility map is complete", () => {
  const result = validateRuntimeIntegrationResponsibilityMap();
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});
