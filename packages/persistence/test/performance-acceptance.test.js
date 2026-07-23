import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresPerformanceAcceptance,
  validateJsonPostgresPerformanceAcceptance,
} from "../src/postgres/performance-acceptance.js";

function accepted() {
  return createJsonPostgresPerformanceAcceptance({
    record_count: 287,
    tenant_count: 1,
    batch_size: 50,
    pool_max: 4,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_ms: 5_000,
    outbox_lag_p95_ms: 2_000,
    dms_throughput_min_bytes_per_second: 1_000_000,
    rpo_target_ms: 300_000,
    rto_target_ms: 3_600_000,
    rehearsal_result_sha256: "a".repeat(64),
  });
}

test("performance acceptance binds measured W12 limits and DR objectives", () => {
  const value = accepted();
  assert.equal(validateJsonPostgresPerformanceAcceptance(value).valid, true);
  assert.equal(value.record_count, 287);
  assert.equal(value.rpo_target_ms, 300_000);
});

test("performance acceptance rejects forged limits and digest drift", () => {
  const value = accepted();
  assert.throws(() => validateJsonPostgresPerformanceAcceptance({
    ...value,
    rto_target_ms: value.rto_target_ms + 1,
  }), /digest/u);
  assert.throws(() => createJsonPostgresPerformanceAcceptance({
    ...value,
    pool_max: 101,
  }), /invalid/u);
});
