import { createHash } from "node:crypto";
import {
  createJsonPostgresPerformanceAcceptance,
  validateJsonPostgresPerformanceAcceptance,
} from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  validateJsonPostgresRehearsalPerformanceBudget,
} from "./json-postgres-rehearsal-contracts.mjs";
import {
  JSON_POSTGRES_REHEARSAL_CAPACITY_RESULT_VERSION,
  validateJsonPostgresRehearsalCapacityResult,
} from "../../packages/persistence/src/postgres/rehearsal-capacity-result.js";

export { JSON_POSTGRES_REHEARSAL_CAPACITY_RESULT_VERSION };

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const ZERO_AUTHORITY_COUNTERS = Object.freeze([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
]);
const PERFORMANCE_KEYS = Object.freeze([
  "measurement_count",
  "elapsed_ms",
  "operation_p50_ms",
  "operation_p95_ms",
  "operation_p99_ms",
  "records_per_tenant",
  "largest_domain_batch_size",
  "materialized_payload_bytes",
  "retry_count",
  "conflict_count",
  "pool_total_count",
  "pool_idle_count",
  "pool_waiting_count",
  "outbox_lag_p95_ms",
]);

function fail(message) {
  throw new Error(message);
}

function digest(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value))
    .digest("hex");
}

function max(results, key) {
  return Math.max(...results.map((result) => result.performance[key]));
}

function sum(results, key) {
  return results.reduce(
    (total, result) => total + result.performance[key],
    0,
  );
}

function validateExecutionResult(result, packet) {
  if (result?.schema_version
      !== "law-firm-os.json-postgres-execution-result.v1"
    || result.phase !== "w12-real-data-rehearsal"
    || result.outcome !== "PASS"
    || result.source_sha !== packet.source_sha
    || result.source_tree !== packet.source_tree
    || result.packet_sha256 !== packet.packet_sha256
    || !SHA256.test(result.result_sha256 ?? "")
    || !["commit", "resume", "readback"].includes(result.mode)
    || !result.safe_counts
    || ZERO_AUTHORITY_COUNTERS.some(
      (key) => result.safe_counts[key] !== 0,
    )
    || !result.performance
    || PERFORMANCE_KEYS.some((key) => (
      !Number.isSafeInteger(result.performance[key])
      || result.performance[key] < 0
    ))
    || result.performance.measurement_count < 1
    || result.performance.elapsed_ms < 1
    || result.performance.operation_p50_ms < 1
    || result.performance.operation_p95_ms
      < result.performance.operation_p50_ms
    || result.performance.operation_p99_ms
      < result.performance.operation_p95_ms) {
    fail("W12 execution result is not a complete capacity measurement");
  }
  const material = Object.fromEntries(
    Object.entries(result).filter(([key]) => key !== "result_sha256"),
  );
  if (digest(material) !== result.result_sha256) {
    fail("W12 capacity execution result digest drifted");
  }
}

export function createJsonPostgresRehearsalCapacityResult({
  packet,
  performanceBudget,
  executionResults,
  dmsObjectCount,
} = {}) {
  const budget = validateJsonPostgresRehearsalPerformanceBudget(
    performanceBudget,
  );
  if (!packet
    || packet.phase !== "w12-real-data-rehearsal"
    || !SHA1.test(packet.source_sha ?? "")
    || !SHA1.test(packet.source_tree ?? "")
    || !SHA256.test(packet.packet_sha256 ?? "")
    || packet.bindings?.performance_acceptance_sha256
      !== budget.budget_sha256) {
    fail("W12 capacity packet or budget binding drifted");
  }
  if (!Array.isArray(executionResults)
    || executionResults.length < 2
    || !executionResults.some((result) =>
      ["commit", "resume"].includes(result?.mode))
    || !executionResults.some((result) => result?.mode === "readback")) {
    fail("W12 capacity requires write and independent readback measurements");
  }
  for (const result of executionResults) {
    validateExecutionResult(result, packet);
  }
  if (!Number.isSafeInteger(dmsObjectCount)
    || dmsObjectCount < 0
    || dmsObjectCount !== performanceBudget.dms_object_count) {
    fail("W12 capacity DMS object count drifted");
  }
  const observedRecordCounts = new Set(
    executionResults.map((result) =>
      result.safe_counts.accepted_record_count),
  );
  const observedAccountCounts = new Set(
    executionResults.map((result) => result.safe_counts.account_count),
  );
  if (observedRecordCounts.size !== 1
    || observedAccountCounts.size !== 1
    || !observedRecordCounts.has(performanceBudget.record_count)
    || !observedAccountCounts.has(performanceBudget.account_count)) {
    fail("W12 capacity measured source counts drifted from the budget");
  }
  const migrationP95Ms = max(executionResults, "operation_p95_ms");
  const outboxLagP95Ms = max(executionResults, "outbox_lag_p95_ms");
  const poolWaitingCount = max(executionResults, "pool_waiting_count");
  const retryCount = sum(executionResults, "retry_count");
  const conflictCount = sum(executionResults, "conflict_count");
  const poolObserved = max(executionResults, "pool_total_count");
  const largestBatch = max(
    executionResults,
    "largest_domain_batch_size",
  );
  if (migrationP95Ms > performanceBudget.migration_p95_limit_ms
    || outboxLagP95Ms > performanceBudget.outbox_lag_p95_limit_ms
    || poolWaitingCount !== 0
    || retryCount !== 0
    || conflictCount !== 0
    || poolObserved > performanceBudget.pool_max
    || largestBatch < 1
    || largestBatch > performanceBudget.batch_size) {
    fail("W12 measured performance exceeds the approved safety budget");
  }
  const rehearsalResultSha256 = digest(
    executionResults.map((result) => result.result_sha256),
  );
  const acceptance = createJsonPostgresPerformanceAcceptance({
    record_count: performanceBudget.record_count,
    tenant_count: performanceBudget.tenant_count,
    batch_size: largestBatch,
    pool_max: Math.max(1, poolObserved),
    statement_timeout_ms: performanceBudget.statement_timeout_ms,
    connection_timeout_ms: performanceBudget.connection_timeout_ms,
    migration_p95_ms: migrationP95Ms,
    outbox_lag_p95_ms: outboxLagP95Ms,
    dms_throughput_min_bytes_per_second:
      dmsObjectCount === 0 ? 0 : null,
    rpo_target_ms: performanceBudget.target_rpo_ms,
    rto_target_ms: performanceBudget.target_rto_ms,
    rehearsal_result_sha256: rehearsalResultSha256,
  });
  validateJsonPostgresPerformanceAcceptance(acceptance);
  const material = Object.freeze({
    schema_version: JSON_POSTGRES_REHEARSAL_CAPACITY_RESULT_VERSION,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    performance_budget_sha256: budget.budget_sha256,
    execution_result_sha256: Object.freeze(
      executionResults.map((result) => result.result_sha256),
    ),
    acceptance,
    measured: Object.freeze({
      measurement_count: executionResults.reduce(
        (total, result) =>
          total + result.performance.measurement_count,
        0,
      ),
      records_per_tenant: max(
        executionResults,
        "records_per_tenant",
      ),
      largest_domain_batch_size: largestBatch,
      materialized_payload_bytes: max(
        executionResults,
        "materialized_payload_bytes",
      ),
      migration_p50_ms: max(
        executionResults,
        "operation_p50_ms",
      ),
      migration_p95_ms: migrationP95Ms,
      migration_p99_ms: max(
        executionResults,
        "operation_p99_ms",
      ),
      retry_count: retryCount,
      conflict_count: conflictCount,
      pool_total_count: poolObserved,
      pool_waiting_count: poolWaitingCount,
      outbox_lag_p95_ms: outboxLagP95Ms,
      dms_object_count: dmsObjectCount,
      dms_throughput_applicable: dmsObjectCount > 0,
    }),
    checks: Object.freeze({
      records_per_tenant_measured: true,
      batch_sizes_measured: true,
      latency_percentiles_measured: true,
      retry_conflict_rate_measured: true,
      connection_pool_saturation_measured: true,
      outbox_lag_measured: true,
      production_limits_derived: true,
      capacity_acceptance_passed: true,
    }),
    safe_counts: Object.freeze({
      capacity_acceptance_failure_count: 0,
      dms_unmeasured_object_count: 0,
    }),
    claims: Object.freeze({
      production_limit_derived_from_w12: true,
      invented_dms_throughput: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    }),
  });
  const result = Object.freeze({
    ...material,
    result_sha256: digest(material),
  });
  validateJsonPostgresRehearsalCapacityResult(result, {
    packet,
    performanceAcceptance: result.acceptance,
  });
  return result;
}
