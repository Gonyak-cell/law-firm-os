import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresRelationalProjectionProbe,
  createJsonPostgresRelationalProjectionValidation,
  createJsonPostgresRelationalProjectionValidationEvidence,
  jsonPostgresRelationalProjectionExecutionSha256,
} from "../lib/json-postgres-relational-projection-closeout.mjs";

const packet = {
  phase: "w15-relational-projection",
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  packet_sha256: "c".repeat(64),
  bindings: { cut012_terminal_receipt_sha256: "d".repeat(64) },
  target: { target_ref: "lawos-production-projection" },
};
const executionMaterial = {
  schema_version: "law-firm-os.hrx-relational-projection-execution.v1",
  outcome: "PASS",
  action: "lawos-json-postgres-relational-projection",
  phase: packet.phase,
  mode: "backfill",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  predecessor_receipt_count: 3,
  migration_count: 32,
  migration_applied_count: 0,
  projection_role_grant_count: 7,
  safe_counts: {
    approved_tenant_count: 1,
    source_record_count: 6,
    projected_insert_count: 3,
    projected_update_count: 1,
    projected_noop_count: 2,
    consumed_outbox_event_count: 6,
    source_authority_write_count: 0,
    dual_write_count: 0,
    partial_commit_count: 0,
    tenant_negative_visible_count: 0,
    negative_tenant_context_denied_count: 1,
    consumer_write_grant_count: 0,
    authority_promotion_count: 0,
  },
  claims: {
    one_way_projection: true,
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
const validation = createJsonPostgresRelationalProjectionValidationEvidence({
  packet,
  safeCounts: {
    shadow_difference_count: 0,
    logical_reference_failure_count: 0,
    transaction_rollback_failure_count: 0,
    append_only_guard_failure_count: 0,
    receipt_verification_failure_count: 0,
    projection_authority_promotion_count: 0,
  },
});

test("W15 closeout preserves the generic ledger as sole write authority", () => {
  const closeout = createJsonPostgresRelationalProjectionValidation({
    packet,
    execution,
    validation,
  });
  const probe = createJsonPostgresRelationalProjectionProbe({
    packet,
    closeout,
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
  }), /authority drifted/u);
  assert.throws(() => createJsonPostgresRelationalProjectionValidation({
    packet,
    execution,
    validation: {
      ...validation,
      safe_counts: { ...validation.safe_counts, shadow_difference_count: 1 },
    },
  }), /validation is incomplete/u);
});
