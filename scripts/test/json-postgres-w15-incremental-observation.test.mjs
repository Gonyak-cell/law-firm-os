import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  HRX_STORE_TABLES,
  HRX_TABLE_PRIMARY_KEYS,
} from "../../packages/hrx/src/store/file-store.js";
import {
  createHrxRelationalMappingManifest,
  createHrxRelationalProductionInventory,
} from "../../packages/hrx/src/relational-projection-contract.js";
import {
  HRX_RELATIONAL_VALIDATION_VERSION,
} from "../../packages/hrx/src/relational-projection-validation.js";
import {
  createJsonPostgresPerformanceAcceptance,
} from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  jsonPostgresRelationalProjectionExecutionSha256,
} from "../lib/json-postgres-relational-projection-closeout.mjs";
import {
  createJsonPostgresW15IncrementalComponentResult,
  createJsonPostgresW15IncrementalObservation,
  validateJsonPostgresW15IncrementalObservation,
} from "../lib/json-postgres-w15-incremental-observation.mjs";

const SOURCE = "1".repeat(40);
const TREE = "2".repeat(40);
const PACKET = "3".repeat(64);

function digest(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value))
    .digest("hex");
}

function contracts() {
  const empty = digest([]);
  const inventory = createHrxRelationalProductionInventory({
    tenantCount: 1,
    inventoryProvenanceSha256: "9".repeat(64),
    outboxEventCount: 5,
    outboxLagMs: 10,
    referenceCount: 0,
    tables: HRX_STORE_TABLES.map((table) => ({
      table_name: table,
      source_count: 1,
      source_hash: digest([table]),
      state_version_min: 1,
      state_version_max: 1,
      payload_bytes_p50: 64,
      payload_bytes_p95: 64,
      payload_bytes_max: 64,
      soft_deleted_count: 0,
      append_only_count: 0,
      reference_count: 0,
      json_path_presence_sha256: empty,
      json_path_null_ratio_sha256: empty,
      unmapped_nonnull_field_count: 0,
      primary_key_conflict_count: 0,
      foreign_key_conflict_count: 0,
      inventory_classification: "populated",
    })),
  });
  const performanceAcceptance = createJsonPostgresPerformanceAcceptance({
    record_count: inventory.source_record_count,
    tenant_count: inventory.tenant_count,
    batch_size: 50,
    pool_max: 2,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_ms: 120_000,
    outbox_lag_p95_ms: 120_000,
    dms_throughput_min_bytes_per_second: 0,
    rpo_target_ms: 300_000,
    rto_target_ms: 3_600_000,
    rehearsal_result_sha256: "4".repeat(64),
  });
  const schema = {
    columns: HRX_STORE_TABLES.flatMap((table) =>
      [...new Set([
        ...HRX_TABLE_PRIMARY_KEYS[table],
        "lawos_projection_deleted_at",
      ])].map((column, index) => ({
        table_name: table,
        column_name: column,
        ordinal_position: index + 1,
        is_nullable:
          column === "lawos_projection_deleted_at" ? "YES" : "NO",
        data_type:
          column === "lawos_projection_deleted_at"
            ? "timestamp with time zone"
            : "text",
        column_default: null,
      }))),
    foreign_keys: [],
  };
  const mappingManifest = createHrxRelationalMappingManifest({
    schema,
    inventory,
    performanceAcceptanceSha256:
      performanceAcceptance.acceptance_sha256,
  });
  const packet = {
    phase: "w15-relational-projection",
    source_sha: SOURCE,
    source_tree: TREE,
    packet_sha256: PACKET,
    bindings: {
      field_crosswalk_sha256: mappingManifest.manifest_sha256,
      inventory_content_sha256: inventory.inventory_sha256,
      performance_acceptance_sha256:
        performanceAcceptance.acceptance_sha256,
    },
    target: {
      target_ref: "lawos-production",
    },
  };
  return {
    inventory,
    performanceAcceptance,
    mappingManifest,
    packet,
  };
}

function execution(contract, waveCounts, { replay = false } = {}) {
  const eventCount = Object.values(waveCounts)
    .reduce((total, count) => total + count, 0);
  const value = {
    schema_version: "law-firm-os.hrx-relational-projection-execution.v2",
    outcome: "PASS",
    action: "lawos-json-postgres-relational-projection",
    phase: "w15-relational-projection",
    mode: "incremental",
    backfill_wave: null,
    source_sha: SOURCE,
    source_tree: TREE,
    packet_sha256: PACKET,
    mapping_manifest_sha256:
      contract.mappingManifest.manifest_sha256,
    production_inventory_sha256: contract.inventory.inventory_sha256,
    performance_acceptance_sha256:
      contract.performanceAcceptance.acceptance_sha256,
    predecessor_receipt_count: 3,
    bootstrap_performed: false,
    migration_count: 0,
    migration_applied_count: 0,
    projection_role_grant_count: 24,
    safe_counts: {
      approved_tenant_count: 1,
      source_record_count: eventCount,
      projected_insert_count: 0,
      projected_update_count: replay ? 0 : eventCount,
      projected_noop_count: 0,
      committed_batch_count: replay ? 0 : 1,
      completed_backfill_wave_count: 5,
      consumed_outbox_event_count: eventCount,
      observed_event_wave_1_count: waveCounts[1],
      observed_event_wave_2_count: waveCounts[2],
      observed_event_wave_3_count: waveCounts[3],
      observed_event_wave_4_count: waveCounts[4],
      observed_event_wave_5_count: waveCounts[5],
      remaining_outbox_event_count: 0,
      tenant_negative_visible_count: 0,
      negative_tenant_context_denied_count: 1,
      unmapped_nonnull_field_count: 0,
      physical_delete_count: 0,
      source_authority_write_count: 0,
      dual_write_count: 0,
      partial_commit_count: 0,
      consumer_write_grant_count: 0,
      auditor_write_grant_count: 0,
      authority_promotion_count: 0,
    },
    claims: {
      one_way_projection: true,
      bounded_checkpoint_resume: true,
      event_scoped_incremental_projection: true,
      physical_delete_prohibited: true,
      recurring_worker_uses_master_credentials: false,
      operational_request_dual_write: false,
      generic_ledger_authority_preserved: true,
      projection_write_authority: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({
    ...value,
    result_sha256:
      jsonPostgresRelationalProjectionExecutionSha256(value),
  });
}

function validation(contract, lagMs) {
  const safeCounts = {
    approved_tenant_count: 1,
    mapped_table_count: HRX_STORE_TABLES.length,
    source_record_count: HRX_STORE_TABLES.length,
    target_record_count: HRX_STORE_TABLES.length,
    mapping_inventory_difference_count: 0,
    projection_state_difference_count: 0,
    shadow_difference_count: 0,
    logical_reference_failure_count: 0,
    unknown_nonnull_field_count: 0,
    tenant_negative_visible_count: 0,
    cursor_backlog_count: 0,
    cursor_regression_count: 0,
    transaction_rollback_failure_count: 0,
    append_only_guard_failure_count: 0,
    physical_delete_guard_failure_count: 0,
    source_authority_write_grant_count: 0,
    consumer_write_grant_count: 0,
    auditor_write_grant_count: 0,
    projection_authority_promotion_count: 0,
    receipt_verification_failure_count: 0,
    forced_rls_table_count: HRX_STORE_TABLES.length,
    validation_elapsed_ms: 10,
    observed_outbox_lag_ms: lagMs,
  };
  const value = {
    schema_version: HRX_RELATIONAL_VALIDATION_VERSION,
    outcome: "PASS",
    source_authority: "postgres-v2-generic-ledger",
    projection_authority: "read-only",
    source_sha: SOURCE,
    source_tree: TREE,
    packet_sha256: PACKET,
    mapping_manifest_sha256:
      contract.mappingManifest.manifest_sha256,
    inventory_sha256: contract.inventory.inventory_sha256,
    performance_acceptance_sha256:
      contract.performanceAcceptance.acceptance_sha256,
    table_observations: HRX_STORE_TABLES.map((table_name) => ({
      table_name,
    })),
    safe_counts: safeCounts,
    claims: {
      observations_collected_by_read_only_auditor: true,
      selected_table_contract_verified: true,
      shadow_count_hash_ordering_passed: true,
      logical_reference_readback_passed: true,
      projection_performance_accepted: true,
      tenant_rls_passed: true,
      transaction_rollback_passed: true,
      append_only_conflict_guard_passed: true,
      physical_delete_guard_passed: true,
      projection_consumers_read_only: true,
      generic_ledger_authority_preserved: true,
      authority_promotion_not_granted: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({
    ...value,
    result_sha256: digest(value),
  });
}

function inputs() {
  const contract = contracts();
  const windows = [
    {
      window_ref: "event-window-1",
      started_at: "2026-07-25T00:00:00.000Z",
      finished_at: "2026-07-25T00:01:00.000Z",
      execution: execution(contract, {
        1: 1, 2: 1, 3: 1, 4: 0, 5: 0,
      }),
      validation: validation(contract, 10),
    },
    {
      window_ref: "event-window-2",
      started_at: "2026-07-25T00:01:00.000Z",
      finished_at: "2026-07-25T00:02:00.000Z",
      execution: execution(contract, {
        1: 0, 2: 0, 3: 0, 4: 1, 5: 1,
      }),
      validation: validation(contract, 20),
    },
  ];
  const replay = {
    observed_at: "2026-07-25T00:02:01.000Z",
    execution: execution(contract, {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    }, { replay: true }),
  };
  return { ...contract, windows, replay };
}

test("W15 incremental evidence derives two event windows and a replay no-op", () => {
  const input = inputs();
  assert.deepEqual(
    [...new Set(input.mappingManifest.tables.map((table) =>
      table.rollout_wave))].sort((left, right) => left - right),
    [1, 2, 3, 4, 5],
  );
  const observation = createJsonPostgresW15IncrementalObservation(input);
  assert.equal(
    validateJsonPostgresW15IncrementalObservation(
      observation,
      input,
    ).valid,
    true,
  );
  assert.equal(observation.event_window_count, 2);
  assert.deepEqual(observation.populated_rollout_waves, [1, 2, 3, 4, 5]);
  assert.equal(observation.observed_event_wave_counts[5], 1);
  const component = createJsonPostgresW15IncrementalComponentResult({
    packet: input.packet,
    observation,
  });
  assert.equal(component.receipt_kind, "w15-incremental-catchup");
  assert.equal(component.checks.two_event_windows_verified, true);
  assert.equal(component.safe_counts.event_replay_write_count, 0);
  assert.equal(component.safe_counts.populated_rollout_wave_count, 5);
});

test("W15 incremental evidence rejects an unobserved populated wave", () => {
  const input = inputs();
  input.windows[1].execution = execution(input, {
    1: 0, 2: 0, 3: 0, 4: 1, 5: 0,
  });
  assert.throws(
    () => createJsonPostgresW15IncrementalObservation(input),
    /did not observe every populated rollout wave/u,
  );
});

test("W15 incremental evidence rejects replay writes and nonconsecutive windows", () => {
  const replayWrite = inputs();
  const replayExecution = execution(replayWrite, {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  }, { replay: true });
  const unsafeReplay = {
    ...replayExecution,
    safe_counts: {
      ...replayExecution.safe_counts,
      projected_update_count: 1,
    },
  };
  unsafeReplay.result_sha256 =
    jsonPostgresRelationalProjectionExecutionSha256(unsafeReplay);
  replayWrite.replay.execution = unsafeReplay;
  assert.throws(
    () => createJsonPostgresW15IncrementalObservation(replayWrite),
    /projection write/u,
  );

  const overlap = inputs();
  overlap.windows[1].started_at = "2026-07-25T00:00:59.000Z";
  assert.throws(
    () => createJsonPostgresW15IncrementalObservation(overlap),
    /not distinct and consecutive/u,
  );
});
