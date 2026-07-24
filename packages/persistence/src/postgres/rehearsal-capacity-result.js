import { createHash } from "node:crypto";
import {
  canonicalizeJson,
} from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import {
  validateJsonPostgresPerformanceAcceptance,
} from "./performance-acceptance.js";

export const JSON_POSTGRES_REHEARSAL_CAPACITY_RESULT_VERSION =
  "law-firm-os.json-postgres-rehearsal-capacity-result.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const KEYS = Object.freeze([
  "schema_version",
  "outcome",
  "source_sha",
  "source_tree",
  "packet_sha256",
  "performance_budget_sha256",
  "execution_result_sha256",
  "acceptance",
  "measured",
  "checks",
  "safe_counts",
  "claims",
  "result_sha256",
]);
const MEASURED_KEYS = Object.freeze([
  "measurement_count",
  "records_per_tenant",
  "largest_domain_batch_size",
  "materialized_payload_bytes",
  "migration_p50_ms",
  "migration_p95_ms",
  "migration_p99_ms",
  "retry_count",
  "conflict_count",
  "pool_total_count",
  "pool_waiting_count",
  "outbox_lag_p95_ms",
  "dms_object_count",
  "dms_throughput_applicable",
]);
const CHECK_KEYS = Object.freeze([
  "records_per_tenant_measured",
  "batch_sizes_measured",
  "latency_percentiles_measured",
  "retry_conflict_rate_measured",
  "connection_pool_saturation_measured",
  "outbox_lag_measured",
  "production_limits_derived",
  "capacity_acceptance_passed",
]);
const COUNT_KEYS = Object.freeze([
  "capacity_acceptance_failure_count",
  "dms_unmeasured_object_count",
]);
const CLAIM_KEYS = Object.freeze([
  "production_limit_derived_from_w12",
  "invented_dms_throughput",
  "raw_value_returned",
  "pii_returned",
  "secret_material_returned",
]);

function fail(message) {
  throw new Error(message);
}

function closed(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail(`${label} schema is invalid`);
  }
}

function digest(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value))
    .digest("hex");
}

export function validateJsonPostgresRehearsalCapacityResult(value = {}, {
  packet,
  performanceAcceptance = value.acceptance,
} = {}) {
  closed(value, KEYS, "W12 capacity result");
  closed(value.measured, MEASURED_KEYS, "W12 measured capacity");
  closed(value.checks, CHECK_KEYS, "W12 capacity checks");
  closed(value.safe_counts, COUNT_KEYS, "W12 capacity safe counts");
  closed(value.claims, CLAIM_KEYS, "W12 capacity claims");
  const acceptance =
    validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  if (value.schema_version
      !== JSON_POSTGRES_REHEARSAL_CAPACITY_RESULT_VERSION
    || value.outcome !== "PASS"
    || !SHA1.test(value.source_sha ?? "")
    || !SHA1.test(value.source_tree ?? "")
    || !SHA256.test(value.packet_sha256 ?? "")
    || !SHA256.test(value.performance_budget_sha256 ?? "")
    || value.source_sha !== packet?.source_sha
    || value.source_tree !== packet?.source_tree
    || value.packet_sha256 !== packet?.packet_sha256
    || value.performance_budget_sha256
      !== packet?.bindings?.performance_acceptance_sha256
    || !Array.isArray(value.execution_result_sha256)
    || value.execution_result_sha256.length < 2
    || value.execution_result_sha256.some((item) => !SHA256.test(item))
    || value.acceptance?.acceptance_sha256
      !== acceptance.acceptance_sha256
    || canonicalizeJson(value.acceptance)
      !== canonicalizeJson(performanceAcceptance)
    || value.acceptance.rehearsal_result_sha256
      !== digest(value.execution_result_sha256)
    || Object.values(value.checks).some((item) => item !== true)
    || Object.values(value.safe_counts).some((item) => item !== 0)
    || value.claims.production_limit_derived_from_w12 !== true
    || value.claims.invented_dms_throughput !== false
    || value.claims.raw_value_returned !== false
    || value.claims.pii_returned !== false
    || value.claims.secret_material_returned !== false) {
    fail("W12 capacity result failed or drifted from its exact packet");
  }
  const integerMeasuredKeys = MEASURED_KEYS.filter(
    (key) => key !== "dms_throughput_applicable",
  );
  if (integerMeasuredKeys.some((key) =>
    !Number.isSafeInteger(value.measured[key])
      || value.measured[key] < 0)
    || value.measured.measurement_count < 2
    || value.measured.records_per_tenant < 1
    || value.measured.largest_domain_batch_size < 1
    || value.measured.migration_p50_ms < 1
    || value.measured.migration_p95_ms
      < value.measured.migration_p50_ms
    || value.measured.migration_p99_ms
      < value.measured.migration_p95_ms
    || value.measured.dms_throughput_applicable
      !== (value.measured.dms_object_count > 0)
    || value.acceptance.batch_size
      !== value.measured.largest_domain_batch_size
    || value.acceptance.pool_max
      !== Math.max(1, value.measured.pool_total_count)
    || value.acceptance.migration_p95_ms
      !== value.measured.migration_p95_ms
    || value.acceptance.outbox_lag_p95_ms
      !== value.measured.outbox_lag_p95_ms
    || (value.measured.dms_object_count === 0
      && value.acceptance.dms_throughput_min_bytes_per_second !== 0)
    || !SHA256.test(value.result_sha256 ?? "")
    || value.result_sha256 !== digest(Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== "result_sha256"),
    ))) {
    fail("W12 measured capacity, acceptance, or digest is invalid");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
    acceptance_sha256: acceptance.acceptance_sha256,
    performance_budget_sha256: value.performance_budget_sha256,
  });
}
