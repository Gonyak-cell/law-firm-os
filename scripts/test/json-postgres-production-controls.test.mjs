import assert from "node:assert/strict";
import test from "node:test";
import { createJsonPostgresPerformanceAcceptance } from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  createJsonPostgresFirstWriteBoundary,
  createJsonPostgresFirstWriteBoundaryProbe,
  createJsonPostgresSourceFreezeControl,
  createJsonPostgresSourceFreezeProbes,
  validateJsonPostgresFrozenLambdaConfigurations,
} from "../lib/json-postgres-production-controls.mjs";

const acceptance = createJsonPostgresPerformanceAcceptance({
  record_count: 287,
  tenant_count: 1,
  batch_size: 50,
  pool_max: 4,
  statement_timeout_ms: 120000,
  connection_timeout_ms: 10000,
  migration_p95_ms: 5000,
  outbox_lag_p95_ms: 2000,
  dms_throughput_min_bytes_per_second: 1000000,
  rpo_target_ms: 300000,
  rto_target_ms: 3600000,
  rehearsal_result_sha256: "1".repeat(64),
});
const packet = {
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  packet_sha256: "c".repeat(64),
  bindings: {
    inventory_content_sha256: "2".repeat(64),
    transform_sha256: "3".repeat(64),
    migration_manifest_sha256: "4".repeat(64),
    performance_acceptance_sha256: acceptance.acceptance_sha256,
    post_write_runbook_sha256: "5".repeat(64),
  },
  target: { target_ref: "lawos-production" },
};
const immutableBackup = {
  schema_version: "law-firm-os.json-postgres-source-backup-result.v1",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  inventory_content_sha256: packet.bindings.inventory_content_sha256,
  transform_sha256: packet.bindings.transform_sha256,
  result_sha256: "6".repeat(64),
  safe_counts: {
    source_count: 287,
    uploaded_object_count: 287,
    restored_object_count: 287,
    digest_mismatch_count: 0,
    source_mutation_count: 0,
  },
  claims: { source_mutated: false, postgres_mutated: false },
};
const control = {
  schema_version: "law-firm-os.json-postgres-source-freeze-control.v1",
  outcome: "PASS",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  inventory_content_sha256: packet.bindings.inventory_content_sha256,
  transform_sha256: packet.bindings.transform_sha256,
  freeze_state: "FROZEN",
  freeze_marker_sha256: "7".repeat(64),
  safe_counts: {
    operational_json_writer_count: 0,
    competing_import_count: 0,
    unexpected_source_count: 0,
    external_email_send_count: 0,
    raw_pii_evidence_count: 0,
    source_mutation_count: 0,
    active_lambda_count: 2,
  },
  claims: {
    source_content_unchanged: true,
    json_writers_frozen: true,
    competing_imports_frozen: true,
    production_write: false,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  },
};
const dryRun = {
  outcome: "PASS",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  result_sha256: "8".repeat(64),
  mode: "dry-run",
  first_write_state: "FIRST_PRODUCTION_WRITE_NOT_STARTED",
  migration_manifest_sha256: packet.bindings.migration_manifest_sha256,
  safe_counts: {
    accepted_record_count: 277,
    account_count: 10,
    unexpected_rejection_count: 0,
    tenant_negative_visible_count: 0,
  },
  claims: {
    production_write: false,
    real_data_mutated: false,
    authority_activated: false,
  },
};

test("source freeze requires immutable restore, frozen writers, and a W12-matched dry-run", () => {
  const probes = createJsonPostgresSourceFreezeProbes({
    packet,
    immutableBackup,
    control,
    finalDryRun: dryRun,
    performanceAcceptance: acceptance,
    monthlyCostForecastKrw: 269100,
    startedAt: "2026-07-23T00:00:00.000Z",
    finishedAt: "2026-07-23T00:01:00.000Z",
    probeRef: "source-freeze-001",
  });
  assert.equal(probes.length, 3);
  assert.deepEqual(probes.map((item) => item.probe_kind), [
    "immutable-backup",
    "source-freeze-control",
    "final-dry-run",
  ]);
});

test("source-freeze and first-write marker material is derived from exact safe confirmations", () => {
  const freeze = createJsonPostgresSourceFreezeControl({
    packet,
    lambdaConfigurations: [
      { State: "Active", LastUpdateStatus: "Successful", Environment: { Variables: {
        LAWOS_RUNTIME_PROFILE: "operational",
        LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
        LAWOS_STAFF_AUTHORITY: "internal-password",
      } } },
      { State: "Active", LastUpdateStatus: "Successful", Environment: { Variables: {
        LAWOS_RUNTIME_PROFILE: "operational",
        LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
        LAWOS_STAFF_AUTHORITY: "internal-password",
      } } },
    ],
    confirmation: {
      schema_version: "law-firm-os.json-postgres-source-freeze-confirmation.v1",
      inventory_content_sha256: packet.bindings.inventory_content_sha256,
      transform_sha256: packet.bindings.transform_sha256,
      source_content_unchanged: true,
      json_writers_frozen: true,
      competing_imports_frozen: true,
      operational_json_writer_count: 0,
      competing_import_count: 0,
      unexpected_source_count: 0,
      external_email_send_count: 0,
      raw_pii_evidence_count: 0,
      source_mutation_count: 0,
    },
  });
  assert.match(freeze.freeze_marker_sha256, /^[0-9a-f]{64}$/u);
  const receipt = {
    valid: true,
    signature_valid: true,
    execution_state: "PASS",
    receipt_kind: "source-freeze",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    canonical_sha256: "9".repeat(64),
  };
  const boundary = createJsonPostgresFirstWriteBoundary({
    packet,
    sourceFreezeReceipt: receipt,
    confirmation: {
      schema_version: "law-firm-os.json-postgres-first-write-confirmation.v1",
      state: "FIRST_PRODUCTION_WRITE_NOT_STARTED",
      post_write_runbook_sha256: packet.bindings.post_write_runbook_sha256,
      production_write_count: 0,
      pre_write_rollback_available: true,
      json_writers_frozen: true,
    },
  });
  assert.equal(boundary.source_freeze_receipt_sha256, receipt.canonical_sha256);
  assert.match(boundary.boundary_marker_sha256, /^[0-9a-f]{64}$/u);
});

test("first-write boundary is bound to the exact signed source freeze and runbook", () => {
  const receipt = {
    valid: true,
    signature_valid: true,
    execution_state: "PASS",
    receipt_kind: "source-freeze",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    canonical_sha256: "9".repeat(64),
  };
  const probe = createJsonPostgresFirstWriteBoundaryProbe({
    packet,
    sourceFreezeReceipt: receipt,
    boundary: {
      schema_version: "law-firm-os.json-postgres-first-write-boundary.v1",
      state: "FIRST_PRODUCTION_WRITE_NOT_STARTED",
      source_sha: packet.source_sha,
      source_tree: packet.source_tree,
      packet_sha256: packet.packet_sha256,
      source_freeze_receipt_sha256: receipt.canonical_sha256,
      post_write_runbook_sha256: packet.bindings.post_write_runbook_sha256,
      boundary_marker_sha256: "a".repeat(64),
      safe_counts: { production_write_count: 0 },
      claims: {
        pre_write_rollback_available: true,
        json_writers_frozen: true,
        production_write: false,
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
    },
    monthlyCostForecastKrw: 269100,
    startedAt: "2026-07-23T00:01:00.000Z",
    finishedAt: "2026-07-23T00:02:00.000Z",
    probeId: "first-write-001",
  });
  assert.equal(probe.safe_counts.production_write_count, 0);
});

test("source-freeze configuration rejects legacy paths and drifted W12 capacity", () => {
  const configuration = (extra = {}) => ({
    State: "Active",
    LastUpdateStatus: "Successful",
    Environment: { Variables: {
      LAWOS_RUNTIME_PROFILE: "operational",
      LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
      LAWOS_STAFF_AUTHORITY: "internal-password",
      ...extra,
    } },
  });
  assert.equal(validateJsonPostgresFrozenLambdaConfigurations([
    configuration(),
    configuration(),
  ]).active_lambda_count, 2);
  assert.throws(() => validateJsonPostgresFrozenLambdaConfigurations([
    configuration({ LAWOS_RUNTIME_STORE_PATH: "/tmp/runtime.json" }),
    configuration(),
  ]), /JSON authority/u);
  assert.throws(() => createJsonPostgresSourceFreezeProbes({
    packet,
    immutableBackup,
    control,
    finalDryRun: {
      ...dryRun,
      safe_counts: { ...dryRun.safe_counts, accepted_record_count: 276 },
    },
    performanceAcceptance: acceptance,
    monthlyCostForecastKrw: 269100,
    startedAt: "2026-07-23T00:00:00.000Z",
    finishedAt: "2026-07-23T00:01:00.000Z",
    probeRef: "source-freeze-002",
  }), /W12 acceptance/u);
});
