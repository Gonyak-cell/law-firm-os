import test from "node:test";
import assert from "node:assert/strict";
import { runRuntimeIntegrationHarness } from "../src/index.js";

test("RS-6 runtime integration harness closes all 20 TUWs and RTG gates", () => {
  const result = runRuntimeIntegrationHarness();
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 20);
  assert.equal(result.runtime_ready_candidate, true);
  assert.equal(result.production_ready_claim, false);
  assert.equal(result.actual_launch_go_live_claim, false);
  assert.deepEqual(Object.fromEntries(Object.entries(result.rtg_results).map(([id, rtg]) => [id, rtg.status])), {
    "RTG-001": "passed",
    "RTG-002": "passed",
    "RTG-003": "passed",
    "RTG-004": "passed",
    "RTG-005": "passed"
  });
});

test("RS-6 runtime integration harness proves tenant isolation and durable audit counts", () => {
  const result = runRuntimeIntegrationHarness({ fixture: undefined });
  assert.ok(result.audit_event_count >= 15);
  assert.ok(result.tenant_event_counts["tenant-rs6-a"] > result.tenant_event_counts["tenant-rs6-b"]);
  assert.equal(result.sandbox_attestation.synthetic_only, true);
  assert.equal(result.sandbox_attestation.real_tenant_data_allowed, false);
});
