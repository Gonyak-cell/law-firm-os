import assert from "node:assert/strict";
import test from "node:test";
import { createJsonPostgresCut012Probe } from "../lib/json-postgres-terminal-closeout.mjs";

const packet = {
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  packet_sha256: "c".repeat(64),
  bindings: {
    w12_terminal_receipt_sha256: "1".repeat(64),
  },
  target: { target_ref: "lawos-production" },
};
const claims = (kind) => ({
  production_write: kind === "cut-009",
  first_production_write_started: ["cut-009", "cut-010", "cut-011"].includes(kind),
  json_authority_disabled: kind === "cut-011",
});
const receipts = [
  "w12-terminal",
  "cut-008",
  "source-freeze",
  "first-write-boundary",
  "cut-009",
  "cut-010",
  "cut-011",
].map((receipt_kind, index) => ({
  valid: true,
  signature_valid: true,
  execution_state: "PASS",
  receipt_kind,
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  canonical_sha256: receipt_kind === "w12-terminal"
    ? packet.bindings.w12_terminal_receipt_sha256
    : String(index + 2).repeat(64).slice(0, 64),
  predecessor_receipt_sha256: receipt_kind === "cut-008" ? ["1".repeat(64)] : ["2".repeat(64)],
  claims: claims(receipt_kind),
}));
const safeClaims = {
  raw_value_returned: false,
  pii_returned: false,
  secret_material_returned: false,
};
const results = {
  migrationResult: {
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    result_sha256: "d".repeat(64),
    first_write_state: "FIRST_PRODUCTION_WRITE_STARTED",
    claims: { production_write: true },
    ...safeClaims,
  },
  drResult: {
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    result_sha256: "e".repeat(64),
    operation: "readback",
    dms_restore_mismatch_count: 0,
    ...safeClaims,
  },
  retirementResult: {
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    result_sha256: "f".repeat(64),
    operation: "probe",
    legacy_authority_counter_total: 0,
    operational_json_path_count: 0,
    ...safeClaims,
  },
};
const criticalFlowResult = {
  schema_version: "law-firm-os.json-postgres-production-critical-flow.v1",
  outcome: "PASS",
  source_sha: packet.source_sha,
  source_tree: packet.source_tree,
  packet_sha256: packet.packet_sha256,
  result_sha256: "9".repeat(64),
  checks: Object.fromEntries([
    "real_data_reconciliation_passed",
    "tenant_rls_passed",
    "tenant_hmac_passed",
    "role_access_control_passed",
    "transaction_atomicity_passed",
    "audit_idempotency_outbox_passed",
    "individual_first_use_setup_passed",
    "disabled_account_denial_passed",
    "dms_controls_passed",
    "critical_flows_passed",
  ].map((key) => [key, true])),
  safe_counts: {
    critical_flow_failure_count: 0,
    tenant_negative_visible_count: 0,
    unexpected_rejection_count: 0,
    unexplained_variance_count: 0,
    bulk_reset_send_count: 0,
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
  },
  claims: {
    ...safeClaims,
    document_bytes_returned: false,
  },
};

test("CUT-012 closes only from signed exact predecessors and terminal runtime evidence", () => {
  const probe = createJsonPostgresCut012Probe({
    packet,
    verifiedReceipts: receipts,
    ...results,
    criticalFlowResult,
    monthlyCostForecastKrw: 269100,
    startedAt: "2026-07-23T00:00:00.000Z",
    finishedAt: "2026-07-23T00:10:00.000Z",
    probeId: "cut012-001",
  });
  assert.equal(probe.outcome, "PASS");
  assert.equal(probe.safe_counts.verified_component_receipt_count, 7);
  assert.equal(probe.safe_counts.json_writer_count, 0);
});

test("CUT-012 rejects unsigned receipts, authority counters, and incomplete flow evidence", () => {
  const unsigned = structuredClone(receipts);
  unsigned[4].signature_valid = false;
  assert.throws(() => createJsonPostgresCut012Probe({
    packet,
    verifiedReceipts: unsigned,
    ...results,
    criticalFlowResult,
    monthlyCostForecastKrw: 269100,
    startedAt: "2026-07-23T00:00:00.000Z",
    finishedAt: "2026-07-23T00:10:00.000Z",
    probeId: "cut012-002",
  }), /unsigned/u);
  const unsafe = structuredClone(criticalFlowResult);
  unsafe.safe_counts.json_writer_count = 1;
  assert.throws(() => createJsonPostgresCut012Probe({
    packet,
    verifiedReceipts: receipts,
    ...results,
    criticalFlowResult: unsafe,
    monthlyCostForecastKrw: 269100,
    startedAt: "2026-07-23T00:00:00.000Z",
    finishedAt: "2026-07-23T00:10:00.000Z",
    probeId: "cut012-003",
  }), /critical production flow/u);
});
