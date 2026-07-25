import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonicalizeJson } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { HRX_STORE_TABLES } from "../../packages/hrx/src/store/file-store.js";
import {
  createJsonPostgresRelationalProjectionProbe,
  createJsonPostgresRelationalProjectionValidation,
  createJsonPostgresRelationalProjectionValidationEvidence,
  createJsonPostgresW15ReceiptSetEvidence,
  jsonPostgresRelationalProjectionExecutionSha256,
} from "../lib/json-postgres-relational-projection-closeout.mjs";
import {
  JSON_POSTGRES_W15_COMPONENT_RECEIPTS,
} from "../../packages/persistence/src/postgres/program-receipt.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";

const packet = {
  phase: "w15-relational-projection",
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  packet_sha256: "c".repeat(64),
  bindings: {
    cut012_terminal_receipt_sha256: "d".repeat(64),
    field_crosswalk_sha256: "e".repeat(64),
    inventory_content_sha256: "f".repeat(64),
    performance_acceptance_sha256: "1".repeat(64),
  },
  target: { target_ref: "lawos-production-projection" },
};
const executionMaterial = {
  schema_version: "law-firm-os.hrx-relational-projection-execution.v2",
  outcome: "PASS",
  action: "lawos-json-postgres-relational-projection",
  phase: packet.phase,
  mode: "backfill",
  backfill_wave: 5,
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  mapping_manifest_sha256: packet.bindings.field_crosswalk_sha256,
  production_inventory_sha256: packet.bindings.inventory_content_sha256,
  performance_acceptance_sha256:
    packet.bindings.performance_acceptance_sha256,
  predecessor_receipt_count: 3,
  bootstrap_performed: true,
  migration_count: 32,
  migration_applied_count: 0,
  projection_role_grant_count: 7,
  safe_counts: {
    approved_tenant_count: 1,
    source_record_count: 6,
    projected_insert_count: 3,
    projected_update_count: 1,
    projected_noop_count: 2,
    committed_batch_count: 3,
    completed_backfill_wave_count: 1,
    consumed_outbox_event_count: 6,
    remaining_outbox_event_count: 0,
    unmapped_nonnull_field_count: 0,
    physical_delete_count: 0,
    source_authority_write_count: 0,
    dual_write_count: 0,
    partial_commit_count: 0,
    tenant_negative_visible_count: 0,
    negative_tenant_context_denied_count: 1,
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
const execution = {
  ...executionMaterial,
  result_sha256: jsonPostgresRelationalProjectionExecutionSha256(executionMaterial),
};
const validationMaterial = {
  schema_version: "law-firm-os.hrx-relational-projection-validation.v2",
  outcome: "PASS",
  source_authority: "postgres-v2-generic-ledger",
  projection_authority: "read-only",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  mapping_manifest_sha256: packet.bindings.field_crosswalk_sha256,
  inventory_sha256: packet.bindings.inventory_content_sha256,
  performance_acceptance_sha256:
    packet.bindings.performance_acceptance_sha256,
  table_observations: HRX_STORE_TABLES.map((table) => ({
    table_name: table,
    source_count: 0,
    target_count: 0,
    source_hash: "2".repeat(64),
    target_hash: "2".repeat(64),
  })),
  safe_counts: {
    approved_tenant_count: 1,
    mapped_table_count: 77,
    source_record_count: 6,
    target_record_count: 6,
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
    receipt_verification_failure_count: 0,
    projection_authority_promotion_count: 0,
    forced_rls_table_count: 77,
    validation_elapsed_ms: 100,
    observed_outbox_lag_ms: 0,
  },
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
const validationObservation = {
  ...validationMaterial,
  result_sha256: createHash("sha256")
    .update(canonicalizeJson(validationMaterial))
    .digest("hex"),
};
const validation = createJsonPostgresRelationalProjectionValidationEvidence({
  packet,
  observation: validationObservation,
});
const componentReceipts = [];
for (const [index, kind] of JSON_POSTGRES_W15_COMPONENT_RECEIPTS.entries()) {
  const canonicalSha256 = createHash("sha256").update(`receipt:${kind}`).digest("hex");
  componentReceipts.push({
    receipt_kind: kind,
    execution_state: "PASS",
    signature_valid: true,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    bindings_sha256: jsonPostgresProgramBindingsSha256(packet),
    canonical_sha256: canonicalSha256,
    result_sha256: createHash("sha256").update(`result:${kind}`).digest("hex"),
    predecessor_receipt_sha256: index === 0
      ? [
        packet.bindings.w12_terminal_receipt_sha256,
        packet.bindings.cut012_terminal_receipt_sha256,
        packet.bindings.go_live_receipt_sha256,
      ]
      : [componentReceipts[index - 1].canonical_sha256],
  });
}
const receiptSet = createJsonPostgresW15ReceiptSetEvidence({
  packet,
  verifiedReceipts: componentReceipts,
});

test("W15 closeout preserves the generic ledger as sole write authority", () => {
  const closeout = createJsonPostgresRelationalProjectionValidation({
    packet,
    execution,
    validation,
    receiptSet,
  });
  const probe = createJsonPostgresRelationalProjectionProbe({
    packet,
    closeout,
    receiptSet,
    monthlyCostForecastKrw: 269100,
    startedAt: "2026-07-23T00:00:00.000Z",
    finishedAt: "2026-07-23T00:01:00.000Z",
    probeId: "w15-projection-001",
  });
  assert.equal(probe.outcome, "PASS");
  assert.equal(probe.safe_counts.projected_record_count, 6);
  assert.equal(probe.safe_counts.source_authority_write_count, 0);
});

test("W15 closeout rejects projection write authority and shadow drift", () => {
  assert.throws(() => createJsonPostgresRelationalProjectionValidation({
    packet,
    execution: {
      ...execution,
      safe_counts: { ...execution.safe_counts, source_authority_write_count: 1 },
    },
    validation,
    receiptSet,
  }), /authority drifted/u);
  assert.throws(() => createJsonPostgresRelationalProjectionValidation({
    packet,
    execution,
    validation: {
      ...validation,
      safe_counts: { ...validation.safe_counts, shadow_difference_count: 1 },
    },
    receiptSet,
  }), /validation (?:is incomplete|evidence is invalid)/u);
});

test("W15 receipt-set evidence rejects missing, unsigned, and expanded predecessor chains", () => {
  assert.throws(
    () => createJsonPostgresW15ReceiptSetEvidence({
      packet,
      verifiedReceipts: componentReceipts.slice(1),
    }),
    /receipt set is incomplete/u,
  );
  const unsigned = structuredClone(componentReceipts);
  unsigned[3].signature_valid = false;
  assert.throws(
    () => createJsonPostgresW15ReceiptSetEvidence({
      packet,
      verifiedReceipts: unsigned,
    }),
    /binding or signature is invalid/u,
  );
  const expanded = structuredClone(componentReceipts);
  expanded[5].predecessor_receipt_sha256.push("9".repeat(64));
  assert.throws(
    () => createJsonPostgresW15ReceiptSetEvidence({
      packet,
      verifiedReceipts: expanded,
    }),
    /predecessor chain is invalid/u,
  );
});
