import assert from "node:assert/strict";
import test from "node:test";
import { runRuntimeSurfaceSmoke } from "../src/index.js";

test("Runtime surface API/UI smoke flow writes audited synthetic state without launch claim", () => {
  const result = runRuntimeSurfaceSmoke();
  assert.equal(result.ok, true);
  assert.equal(result.audit_event_count, 7);
  assert.equal(result.runtime_ready_candidate, false);
  assert.equal(result.actual_launch_go_live_claim, false);
  assert.equal(result.results.every((entry) => entry.production_ready_claim === false), true);
});
