import { createHash } from "node:crypto";
import {
  createJsonPostgresStageProbe,
} from "../../packages/persistence/src/postgres/program-stage-observation.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";
import {
  validateHrxRelationalProjectionValidation,
} from "../../packages/hrx/src/relational-projection-validation.js";
import {
  JSON_POSTGRES_W15_COMPONENT_RECEIPTS,
} from "../../packages/persistence/src/postgres/program-receipt.js";

const SHA256 = /^[0-9a-f]{64}$/u;
export const JSON_POSTGRES_W15_RECEIPT_SET_EVIDENCE_VERSION =
  "law-firm-os.json-postgres-w15-receipt-set-evidence.v1";
const EXECUTION_MATERIAL_KEYS = Object.freeze([
  "schema_version",
  "outcome",
  "action",
  "phase",
  "mode",
  "backfill_wave",
  "source_sha",
  "source_tree",
  "packet_sha256",
  "mapping_manifest_sha256",
  "production_inventory_sha256",
  "performance_acceptance_sha256",
  "predecessor_receipt_count",
  "bootstrap_performed",
  "migration_count",
  "migration_applied_count",
  "projection_role_grant_count",
  "safe_counts",
  "claims",
]);

function fail(message) {
  throw new Error(message);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function selected(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value?.[key]]));
}

function cost(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 300_000) {
    fail("relational projection monthly cost is invalid");
  }
  return value;
}

export function createJsonPostgresRelationalProjectionValidation({
  packet,
  execution,
  validation,
  receiptSet,
} = {}) {
  if (packet?.phase !== "w15-relational-projection"
    || execution?.schema_version !== "law-firm-os.hrx-relational-projection-execution.v2"
    || execution.outcome !== "PASS"
    || execution.source_sha !== packet.source_sha
    || execution.source_tree !== packet.source_tree
    || execution.packet_sha256 !== packet.packet_sha256
    || execution.mapping_manifest_sha256 !== packet.bindings.field_crosswalk_sha256
    || execution.production_inventory_sha256 !== packet.bindings.inventory_content_sha256
    || execution.performance_acceptance_sha256
      !== packet.bindings.performance_acceptance_sha256
    || execution.predecessor_receipt_count !== 3
    || execution.claims?.one_way_projection !== true
    || execution.claims?.bounded_checkpoint_resume !== true
    || execution.claims?.event_scoped_incremental_projection !== true
    || execution.claims?.physical_delete_prohibited !== true
    || execution.claims?.recurring_worker_uses_master_credentials !== false
    || execution.claims?.operational_request_dual_write !== false
    || execution.claims?.generic_ledger_authority_preserved !== true
    || execution.claims?.projection_write_authority !== false
    || execution.safe_counts?.source_authority_write_count !== 0
    || execution.safe_counts?.dual_write_count !== 0
    || execution.safe_counts?.partial_commit_count !== 0
    || execution.safe_counts?.remaining_outbox_event_count !== 0
    || execution.safe_counts?.unmapped_nonnull_field_count !== 0
    || execution.safe_counts?.physical_delete_count !== 0
    || execution.safe_counts?.tenant_negative_visible_count !== 0
    || execution.safe_counts?.consumer_write_grant_count !== 0
    || execution.safe_counts?.auditor_write_grant_count !== 0
    || execution.safe_counts?.authority_promotion_count !== 0
    || !SHA256.test(execution.result_sha256 ?? "")
    || execution.result_sha256 !== jsonPostgresRelationalProjectionExecutionSha256(execution)) {
    fail("W15 projection execution is incomplete or authority drifted");
  }
  validateJsonPostgresRelationalProjectionValidationEvidence(validation, { packet });
  validateJsonPostgresW15ReceiptSetEvidence(receiptSet, { packet });
  const material = {
    schema_version: "law-firm-os.json-postgres-relational-projection-closeout.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    execution_result_sha256: execution.result_sha256,
    validation_result_sha256: validation.result_sha256,
    component_receipt_set_sha256: receiptSet.result_sha256,
    projected_record_count:
      Number(execution.safe_counts.projected_insert_count)
      + Number(execution.safe_counts.projected_update_count)
      + Number(execution.safe_counts.projected_noop_count),
    safe_counts: {
      source_authority_write_count: 0,
      dual_write_count: 0,
      partial_commit_count: 0,
      shadow_difference_count: 0,
      mapping_inventory_difference_count: 0,
      projection_state_difference_count: 0,
      logical_reference_failure_count: 0,
      unknown_nonnull_field_count: 0,
      cursor_backlog_count: 0,
      cursor_regression_count: 0,
      tenant_negative_visible_count: 0,
      physical_delete_guard_failure_count: 0,
      source_authority_write_grant_count: 0,
      consumer_write_grant_count: 0,
      auditor_write_grant_count: 0,
      projection_authority_promotion_count: 0,
      receipt_verification_failure_count: 0,
    },
    claims: {
      generic_ledger_authority_preserved: true,
      projection_consumers_read_only: true,
      authority_promotion_not_granted: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function createJsonPostgresRelationalProjectionProbe({
  packet,
  closeout,
  receiptSet,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  probeId,
} = {}) {
  if (closeout?.schema_version !== "law-firm-os.json-postgres-relational-projection-closeout.v1"
    || closeout.outcome !== "PASS"
    || closeout.source_sha !== packet?.source_sha
    || closeout.source_tree !== packet?.source_tree
    || closeout.packet_sha256 !== packet?.packet_sha256
    || !SHA256.test(closeout.result_sha256 ?? "")
    || closeout.result_sha256 !== sha256((({
      result_sha256: ignored,
      ...material
    }) => material)(closeout))
    || closeout.claims?.generic_ledger_authority_preserved !== true
    || closeout.claims?.projection_consumers_read_only !== true
    || closeout.claims?.authority_promotion_not_granted !== true
    || Object.values(closeout.safe_counts ?? {}).some((value) => value !== 0)) {
    fail("W15 closeout evidence is incomplete");
  }
  validateJsonPostgresW15ReceiptSetEvidence(receiptSet, { packet });
  if (closeout.component_receipt_set_sha256 !== receiptSet.result_sha256) {
    fail("W15 closeout component receipt set drifted");
  }
  return createJsonPostgresStageProbe({
    probeId,
    stage: "w15-relational-projection",
    probeKind: "relational-projection",
    collectorRef: "collect-json-postgres-relational-projection-probe.mjs",
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256: jsonPostgresProgramBindingsSha256(packet),
    startedAt,
    finishedAt,
    command: "node scripts/collect-json-postgres-relational-projection-probe.mjs",
    checks: {
      one_way_outbox_projection_verified: true,
      selected_table_contract_verified: true,
      shadow_count_hash_ordering_passed: true,
      logical_reference_readback_passed: true,
      projection_performance_accepted: true,
      tenant_rls_passed: true,
      transaction_rollback_passed: true,
      append_only_conflict_guard_passed: true,
      generic_ledger_authority_preserved: true,
      projection_consumers_read_only: true,
      authority_promotion_not_granted: true,
      projection_receipt_set_verified: true,
    },
    safeCounts: {
      ...closeout.safe_counts,
      projected_record_count: closeout.projected_record_count,
      monthly_cost_forecast_krw: cost(monthlyCostForecastKrw),
    },
    evidenceSha256: closeout.result_sha256,
  });
}

export function createJsonPostgresW15ReceiptSetEvidence({
  packet,
  verifiedReceipts,
} = {}) {
  if (packet?.phase !== "w15-relational-projection"
    || !Array.isArray(verifiedReceipts)
    || verifiedReceipts.length !== JSON_POSTGRES_W15_COMPONENT_RECEIPTS.length) {
    fail("W15 component receipt set is incomplete");
  }
  const byKind = new Map();
  for (const receipt of verifiedReceipts) {
    if (!JSON_POSTGRES_W15_COMPONENT_RECEIPTS.includes(receipt?.receipt_kind)
      || byKind.has(receipt.receipt_kind)
      || receipt.execution_state !== "PASS"
      || receipt.signature_valid !== true
      || receipt.source_sha !== packet.source_sha
      || receipt.source_tree !== packet.source_tree
      || receipt.packet_sha256 !== packet.packet_sha256
      || receipt.bindings_sha256 !== jsonPostgresProgramBindingsSha256(packet)
      || !SHA256.test(receipt.canonical_sha256 ?? "")
      || !Array.isArray(receipt.predecessor_receipt_sha256)) {
      fail("W15 component receipt binding or signature is invalid");
    }
    byKind.set(receipt.receipt_kind, receipt);
  }
  const entries = JSON_POSTGRES_W15_COMPONENT_RECEIPTS.map((kind, index) => {
    const receipt = byKind.get(kind);
    if (!receipt) fail("W15 component receipt kind is missing");
    const requiredPredecessor = index === 0
      ? [
        packet.bindings.w12_terminal_receipt_sha256,
        packet.bindings.cut012_terminal_receipt_sha256,
        packet.bindings.go_live_receipt_sha256,
      ]
      : [
        byKind.get(JSON_POSTGRES_W15_COMPONENT_RECEIPTS[index - 1])
          .canonical_sha256,
      ];
    if (JSON.stringify(receipt.predecessor_receipt_sha256)
        !== JSON.stringify(requiredPredecessor)) {
      fail("W15 component receipt predecessor chain is invalid");
    }
    return Object.freeze({
      receipt_kind: kind,
      canonical_sha256: receipt.canonical_sha256,
      result_sha256: receipt.result_sha256,
      signature_valid: true,
    });
  });
  const material = {
    schema_version: JSON_POSTGRES_W15_RECEIPT_SET_EVIDENCE_VERSION,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    bindings_sha256: jsonPostgresProgramBindingsSha256(packet),
    component_receipt_count: entries.length,
    signature_valid_count: entries.length,
    receipt_verification_failure_count: 0,
    entries,
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function validateJsonPostgresW15ReceiptSetEvidence(
  value,
  { packet } = {},
) {
  if (value?.schema_version !== JSON_POSTGRES_W15_RECEIPT_SET_EVIDENCE_VERSION
    || value.outcome !== "PASS"
    || value.source_sha !== packet?.source_sha
    || value.source_tree !== packet?.source_tree
    || value.packet_sha256 !== packet?.packet_sha256
    || value.bindings_sha256 !== jsonPostgresProgramBindingsSha256(packet)
    || value.component_receipt_count
      !== JSON_POSTGRES_W15_COMPONENT_RECEIPTS.length
    || value.signature_valid_count !== value.component_receipt_count
    || value.receipt_verification_failure_count !== 0
    || !Array.isArray(value.entries)
    || value.entries.length !== value.component_receipt_count
    || JSON.stringify(value.entries.map((entry) => entry.receipt_kind))
      !== JSON.stringify(JSON_POSTGRES_W15_COMPONENT_RECEIPTS)
    || value.entries.some((entry) =>
      entry.signature_valid !== true
      || !SHA256.test(entry.canonical_sha256 ?? "")
      || !SHA256.test(entry.result_sha256 ?? ""))
    || value.result_sha256 !== sha256((({
      result_sha256: ignored,
      ...material
    }) => material)(value))) {
    fail("W15 component receipt set evidence is invalid");
  }
  return Object.freeze({
    valid: true,
    component_receipt_count: value.component_receipt_count,
    result_sha256: value.result_sha256,
  });
}

export function jsonPostgresRelationalProjectionExecutionSha256(value = {}) {
  return sha256(selected(value, EXECUTION_MATERIAL_KEYS));
}

export function createJsonPostgresRelationalProjectionValidationEvidence({
  packet,
  observation,
} = {}) {
  validateJsonPostgresRelationalProjectionValidationEvidence(observation, { packet });
  return Object.freeze({ ...observation });
}

export function validateJsonPostgresRelationalProjectionValidationEvidence(
  validation,
  { packet } = {},
) {
  validateHrxRelationalProjectionValidation(validation);
  if (validation.outcome !== "PASS"
    || validation.source_sha !== packet?.source_sha
    || validation.source_tree !== packet?.source_tree
    || validation.packet_sha256 !== packet?.packet_sha256
    || validation.mapping_manifest_sha256
      !== packet?.bindings?.field_crosswalk_sha256
    || validation.inventory_sha256
      !== packet?.bindings?.inventory_content_sha256
    || validation.performance_acceptance_sha256
      !== packet?.bindings?.performance_acceptance_sha256) {
    fail("W15 projection validation is incomplete");
  }
  return Object.freeze({
    valid: true,
    result_sha256: validation.result_sha256,
  });
}
