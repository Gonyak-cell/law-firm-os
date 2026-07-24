import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  createJsonPostgresRehearsalPerformanceBudget,
} from "../lib/json-postgres-rehearsal-contracts.mjs";
import {
  createJsonPostgresRehearsalCapacityResult,
} from "../lib/json-postgres-rehearsal-capacity.mjs";

function digest(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value))
    .digest("hex");
}

const budget = createJsonPostgresRehearsalPerformanceBudget({
  recordCount: 100,
  accountCount: 5,
  tenantCount: 1,
  dmsObjectCount: 0,
});

function packet() {
  return {
    phase: "w12-real-data-rehearsal",
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    packet_sha256: "c".repeat(64),
    bindings: {
      performance_acceptance_sha256: budget.budget_sha256,
    },
  };
}

function execution(mode, p95 = 100) {
  const value = {
    schema_version: "law-firm-os.json-postgres-execution-result.v1",
    phase: "w12-real-data-rehearsal",
    mode,
    outcome: "PASS",
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    packet_sha256: "c".repeat(64),
    safe_counts: {
      accepted_record_count: 100,
      account_count: 5,
      json_fallback_count: 0,
      json_writer_count: 0,
      dual_write_count: 0,
      file_current_authority_count: 0,
      offline_mutation_count: 0,
      memory_fallback_count: 0,
    },
    performance: {
      measurement_count: 4,
      elapsed_ms: 200,
      operation_p50_ms: 50,
      operation_p95_ms: p95,
      operation_p99_ms: p95,
      records_per_tenant: 105,
      largest_domain_batch_size: 80,
      materialized_payload_bytes: 10_000,
      retry_count: 0,
      conflict_count: 0,
      pool_total_count: 2,
      pool_idle_count: 2,
      pool_waiting_count: 0,
      outbox_lag_p95_ms: 0,
    },
  };
  value.result_sha256 = digest(value);
  return value;
}

test("W12 capacity derives limits from measured write and readback without inventing DMS throughput", () => {
  const result = createJsonPostgresRehearsalCapacityResult({
    packet: packet(),
    performanceBudget: budget,
    executionResults: [execution("commit"), execution("readback", 120)],
    dmsObjectCount: 0,
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.acceptance.batch_size, 80);
  assert.equal(result.acceptance.pool_max, 2);
  assert.equal(result.acceptance.migration_p95_ms, 120);
  assert.equal(result.acceptance.dms_throughput_min_bytes_per_second, 0);
  assert.equal(result.measured.dms_throughput_applicable, false);
  assert.equal(result.safe_counts.capacity_acceptance_failure_count, 0);
});

test("W12 capacity rejects threshold, count, wait, and nonzero legacy-authority drift", () => {
  for (const mutate of [
    (values) => { values[0].performance.operation_p95_ms = 5_001; },
    (values) => { values[0].safe_counts.account_count = 4; },
    (values) => { values[0].performance.pool_waiting_count = 1; },
    (values) => { values[0].safe_counts.json_writer_count = 1; },
  ]) {
    const values = [execution("commit"), execution("readback")];
    mutate(values);
    values[0].result_sha256 = digest(Object.fromEntries(
      Object.entries(values[0]).filter(([key]) => key !== "result_sha256"),
    ));
    assert.throws(() => createJsonPostgresRehearsalCapacityResult({
      packet: packet(),
      performanceBudget: budget,
      executionResults: values,
      dmsObjectCount: 0,
    }));
  }
});
