import { createHash } from "node:crypto";
import {
  prepareJsonPostgresDmsObjectManifest,
} from "../../packages/dms/src/json-postgres-dms-migration.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  jsonPostgresRehearsalResultSha256,
} from "./json-postgres-rehearsal-execution.mjs";
import {
  validateJsonPostgresRehearsalExecutionEvidence,
} from "./json-postgres-rehearsal-program.mjs";

export const JSON_POSTGRES_REHEARSAL_DMS_CONTROL_RESULT_VERSION =
  "law-firm-os.json-postgres-rehearsal-dms-control-result.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const KEYS = Object.freeze([
  "schema_version",
  "outcome",
  "source_sha",
  "source_tree",
  "packet_sha256",
  "dms_manifest_sha256",
  "migration_result_sha256",
  "infrastructure_result_sha256",
  "test_command_sha256",
  "test_output_sha256",
  "checks",
  "safe_counts",
  "claims",
  "result_sha256",
]);
const CHECK_KEYS = Object.freeze([
  "tenant_namespace_verified",
  "source_digest_verified",
  "provider_digest_readback_verified",
  "object_lock_verified",
  "retention_verified",
  "legal_hold_verified",
  "canonical_document_guard_verified",
  "delete_guard_verified",
  "provider_failure_atomicity_verified",
]);
const COUNT_KEYS = Object.freeze([
  "dms_digest_mismatch_count",
  "dms_retention_failure_count",
  "dms_legal_hold_failure_count",
  "dms_tenant_leak_count",
  "dms_delete_guard_failure_count",
  "dms_source_object_count",
  "dms_verified_object_count",
  "dms_governance_test_file_count",
]);
const CLAIM_KEYS = Object.freeze([
  "approved_dms_byte_object_present",
  "invented_dms_throughput",
  "provider_write",
  "production_contacted",
  "document_bytes_returned",
  "raw_value_returned",
  "pii_returned",
  "secret_material_returned",
]);

function fail(message) {
  throw new Error(message);
}

function digest(value) {
  return createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : canonicalizeJson(value))
    .digest("hex");
}

function closed(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail(`${label} schema is invalid`);
  }
}

function resultMaterial(value) {
  const { result_sha256: ignored, ...material } = value;
  return material;
}

function validateExecution(execution, packet) {
  validateJsonPostgresRehearsalExecutionEvidence(execution, {
    packet,
    mode: execution?.mode,
    response: { result_sha256: execution?.result_sha256 },
  });
  if (!["commit", "readback", "reconcile"].includes(execution.mode)
    || execution.safe_counts?.dms_source_object_count !== 0
    || execution.safe_counts?.dms_verified_object_count !== 0
    || execution.safe_counts?.dms_tenant_negative_visible_count !== 0
    || execution.safe_counts?.dms_unexpected_rejection_count !== 0
    || !SHA256.test(execution.dms_result_sha256 ?? "")
    || !SHA256.test(execution.dms_invariant_hash ?? "")) {
    fail("W12 zero-object DMS execution evidence failed");
  }
  return execution;
}

function validateInfrastructure(infrastructure, packet) {
  if (infrastructure?.schema_version
      !== "law-firm-os.json-postgres-rehearsal-infrastructure-result.v1"
    || infrastructure.operation !== "deploy"
    || infrastructure.outcome !== "PASS"
    || infrastructure.source_sha !== packet.source_sha
    || infrastructure.source_tree !== packet.source_tree
    || infrastructure.packet_sha256 !== packet.packet_sha256
    || jsonPostgresRehearsalResultSha256(infrastructure)
      !== infrastructure.result_sha256
    || infrastructure.dms_bucket?.versioning_enabled !== true
    || infrastructure.dms_bucket?.public_access_blocked !== true
    || infrastructure.dms_bucket?.object_lock_enabled !== true
    || infrastructure.dms_bucket?.sse_kms_enabled !== true
    || infrastructure.temporary_eni_allow_count !== 0) {
    fail("W12 DMS infrastructure state failed");
  }
  return infrastructure;
}

export function createJsonPostgresRehearsalDmsControlResult({
  packet,
  dmsManifest,
  execution,
  infrastructure,
  testCommand,
  testOutput,
  testExitCode,
} = {}) {
  const manifest = prepareJsonPostgresDmsObjectManifest(dmsManifest);
  const migration = validateExecution(execution, packet);
  const deployed = validateInfrastructure(infrastructure, packet);
  if (manifest.manifest_sha256
      !== packet?.bindings?.dms_object_manifest_sha256
    || manifest.objects.length !== 0
    || testExitCode !== 0
    || !Buffer.isBuffer(testOutput)
    || testOutput.byteLength < 1
    || typeof testCommand !== "string"
    || !testCommand.startsWith("node --test ")
    || !testCommand.includes(
      "packages/dms/test/postgres-security-regressions.test.js",
    )
    || !testCommand.includes(
      "packages/dms/test/json-postgres-dms-migration.test.js",
    )) {
    fail("W12 DMS source, test, or packet binding failed");
  }
  const material = Object.freeze({
    schema_version:
      JSON_POSTGRES_REHEARSAL_DMS_CONTROL_RESULT_VERSION,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    dms_manifest_sha256: manifest.manifest_sha256,
    migration_result_sha256: migration.dms_result_sha256,
    infrastructure_result_sha256: deployed.result_sha256,
    test_command_sha256: digest(testCommand),
    test_output_sha256: digest(testOutput),
    checks: Object.freeze(Object.fromEntries(
      CHECK_KEYS.map((key) => [key, true]),
    )),
    safe_counts: Object.freeze({
      dms_digest_mismatch_count: 0,
      dms_retention_failure_count: 0,
      dms_legal_hold_failure_count: 0,
      dms_tenant_leak_count: 0,
      dms_delete_guard_failure_count: 0,
      dms_source_object_count: 0,
      dms_verified_object_count: 0,
      dms_governance_test_file_count: 2,
    }),
    claims: Object.freeze({
      approved_dms_byte_object_present: false,
      invented_dms_throughput: false,
      provider_write: false,
      production_contacted: false,
      document_bytes_returned: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    }),
  });
  const result = Object.freeze({
    ...material,
    result_sha256: digest(material),
  });
  validateJsonPostgresRehearsalDmsControlResult(result, { packet });
  return result;
}

export function validateJsonPostgresRehearsalDmsControlResult(
  value = {},
  { packet } = {},
) {
  closed(value, KEYS, "W12 DMS control result");
  closed(value.checks, CHECK_KEYS, "W12 DMS control checks");
  closed(value.safe_counts, COUNT_KEYS, "W12 DMS control counts");
  closed(value.claims, CLAIM_KEYS, "W12 DMS control claims");
  if (value.schema_version
      !== JSON_POSTGRES_REHEARSAL_DMS_CONTROL_RESULT_VERSION
    || value.outcome !== "PASS"
    || !SHA1.test(value.source_sha ?? "")
    || !SHA1.test(value.source_tree ?? "")
    || value.source_sha !== packet?.source_sha
    || value.source_tree !== packet?.source_tree
    || value.packet_sha256 !== packet?.packet_sha256
    || value.dms_manifest_sha256
      !== packet?.bindings?.dms_object_manifest_sha256
    || !SHA256.test(value.migration_result_sha256 ?? "")
    || !SHA256.test(value.infrastructure_result_sha256 ?? "")
    || !SHA256.test(value.test_command_sha256 ?? "")
    || !SHA256.test(value.test_output_sha256 ?? "")
    || Object.values(value.checks).some((item) => item !== true)
    || [
      "dms_digest_mismatch_count",
      "dms_retention_failure_count",
      "dms_legal_hold_failure_count",
      "dms_tenant_leak_count",
      "dms_delete_guard_failure_count",
      "dms_source_object_count",
      "dms_verified_object_count",
    ].some((key) => value.safe_counts[key] !== 0)
    || value.safe_counts.dms_governance_test_file_count !== 2
    || value.claims.approved_dms_byte_object_present !== false
    || value.claims.invented_dms_throughput !== false
    || value.claims.provider_write !== false
    || value.claims.production_contacted !== false
    || value.claims.document_bytes_returned !== false
    || value.claims.raw_value_returned !== false
    || value.claims.pii_returned !== false
    || value.claims.secret_material_returned !== false
    || !SHA256.test(value.result_sha256 ?? "")
    || digest(resultMaterial(value)) !== value.result_sha256) {
    fail("W12 DMS control result failed or drifted");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
  });
}
