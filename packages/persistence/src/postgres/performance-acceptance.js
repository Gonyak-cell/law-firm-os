import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../runtime-auth/src/runtime-safety-approval-contract.js";

export const JSON_POSTGRES_PERFORMANCE_ACCEPTANCE_VERSION =
  "law-firm-os.json-postgres-performance-acceptance.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const KEYS = Object.freeze([
  "schema_version",
  "record_count",
  "tenant_count",
  "batch_size",
  "pool_max",
  "statement_timeout_ms",
  "connection_timeout_ms",
  "migration_p95_ms",
  "outbox_lag_p95_ms",
  "dms_throughput_min_bytes_per_second",
  "rpo_target_ms",
  "rto_target_ms",
  "rehearsal_result_sha256",
  "acceptance_sha256",
]);

function fail(message) {
  throw new Error(message);
}

function material(value) {
  return Object.fromEntries(KEYS
    .filter((key) => key !== "acceptance_sha256")
    .map((key) => [key, value[key]]));
}

function digest(value) {
  return createHash("sha256").update(canonicalizeJson(material(value))).digest("hex");
}

export function createJsonPostgresPerformanceAcceptance(input = {}) {
  const value = {
    schema_version: JSON_POSTGRES_PERFORMANCE_ACCEPTANCE_VERSION,
    record_count: input.record_count,
    tenant_count: input.tenant_count,
    batch_size: input.batch_size,
    pool_max: input.pool_max,
    statement_timeout_ms: input.statement_timeout_ms,
    connection_timeout_ms: input.connection_timeout_ms,
    migration_p95_ms: input.migration_p95_ms,
    outbox_lag_p95_ms: input.outbox_lag_p95_ms,
    dms_throughput_min_bytes_per_second: input.dms_throughput_min_bytes_per_second,
    rpo_target_ms: input.rpo_target_ms,
    rto_target_ms: input.rto_target_ms,
    rehearsal_result_sha256: input.rehearsal_result_sha256,
  };
  value.acceptance_sha256 = digest(value);
  validateJsonPostgresPerformanceAcceptance(value);
  return Object.freeze(value);
}

export function validateJsonPostgresPerformanceAcceptance(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...KEYS].sort())
    || value.schema_version !== JSON_POSTGRES_PERFORMANCE_ACCEPTANCE_VERSION) {
    fail("performance acceptance schema is invalid");
  }
  for (const key of [
    "record_count",
    "tenant_count",
    "batch_size",
    "pool_max",
    "statement_timeout_ms",
    "connection_timeout_ms",
    "migration_p95_ms",
    "outbox_lag_p95_ms",
    "dms_throughput_min_bytes_per_second",
    "rpo_target_ms",
    "rto_target_ms",
  ]) {
    if (!Number.isSafeInteger(value[key]) || value[key] < 1) {
      fail(`performance acceptance ${key} is invalid`);
    }
  }
  if (value.tenant_count > value.record_count
    || value.batch_size > value.record_count
    || value.pool_max > 100
    || value.statement_timeout_ms > 15 * 60 * 1000
    || value.connection_timeout_ms > 60 * 1000
    || !SHA256.test(value.rehearsal_result_sha256 ?? "")
    || !SHA256.test(value.acceptance_sha256 ?? "")
    || value.acceptance_sha256 !== digest(value)) {
    fail("performance acceptance values or digest are invalid");
  }
  return Object.freeze({
    valid: true,
    acceptance_sha256: value.acceptance_sha256,
    rpo_target_ms: value.rpo_target_ms,
    rto_target_ms: value.rto_target_ms,
  });
}
