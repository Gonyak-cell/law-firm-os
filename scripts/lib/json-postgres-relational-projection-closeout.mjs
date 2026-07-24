import { createHash } from "node:crypto";
import {
  createJsonPostgresStageProbe,
} from "../../packages/persistence/src/postgres/program-stage-observation.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";

const SHA256 = /^[0-9a-f]{64}$/u;
const EXECUTION_MATERIAL_KEYS = Object.freeze([
  "schema_version",
  "outcome",
  "action",
  "phase",
  "mode",
  "source_sha",
  "source_tree",
  "packet_sha256",
  "predecessor_receipt_count",
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
} = {}) {
  if (packet?.phase !== "w15-relational-projection"
    || execution?.schema_version !== "law-firm-os.hrx-relational-projection-execution.v1"
    || execution.outcome !== "PASS"
    || execution.source_sha !== packet.source_sha
    || execution.source_tree !== packet.source_tree
    || execution.packet_sha256 !== packet.packet_sha256
    || execution.predecessor_receipt_count !== 3
    || execution.claims?.one_way_projection !== true
    || execution.claims?.operational_request_dual_write !== false
    || execution.claims?.generic_ledger_authority_preserved !== true
    || execution.claims?.projection_write_authority !== false
    || execution.safe_counts?.source_authority_write_count !== 0
    || execution.safe_counts?.dual_write_count !== 0
    || execution.safe_counts?.partial_commit_count !== 0
    || execution.safe_counts?.tenant_negative_visible_count !== 0
    || execution.safe_counts?.consumer_write_grant_count !== 0
    || execution.safe_counts?.authority_promotion_count !== 0
    || !SHA256.test(execution.result_sha256 ?? "")
    || execution.result_sha256 !== jsonPostgresRelationalProjectionExecutionSha256(execution)) {
    fail("W15 projection execution is incomplete or authority drifted");
  }
  validateJsonPostgresRelationalProjectionValidationEvidence(validation, { packet });
  const material = {
    schema_version: "law-firm-os.json-postgres-relational-projection-closeout.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    execution_result_sha256: execution.result_sha256,
    validation_result_sha256: validation.result_sha256,
    projected_record_count:
      Number(execution.safe_counts.projected_insert_count)
      + Number(execution.safe_counts.projected_update_count)
      + Number(execution.safe_counts.projected_noop_count),
    safe_counts: {
      source_authority_write_count: 0,
      dual_write_count: 0,
      partial_commit_count: 0,
      shadow_difference_count: 0,
      tenant_negative_visible_count: 0,
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

export function jsonPostgresRelationalProjectionExecutionSha256(value = {}) {
  return sha256(selected(value, EXECUTION_MATERIAL_KEYS));
}

export function createJsonPostgresRelationalProjectionValidationEvidence({
  packet,
  safeCounts,
} = {}) {
  const value = {
    schema_version: "law-firm-os.json-postgres-relational-projection-validation.v1",
    outcome: "PASS",
    source_sha: packet?.source_sha,
    source_tree: packet?.source_tree,
    packet_sha256: packet?.packet_sha256,
    selected_table_contract_verified: true,
    shadow_count_hash_ordering_passed: true,
    logical_reference_readback_passed: true,
    projection_performance_accepted: true,
    tenant_rls_passed: true,
    transaction_rollback_passed: true,
    append_only_conflict_guard_passed: true,
    projection_consumers_read_only: true,
    projection_receipt_set_verified: true,
    safe_counts: { ...safeCounts },
  };
  const evidence = Object.freeze({ ...value, result_sha256: sha256(value) });
  validateJsonPostgresRelationalProjectionValidationEvidence(evidence, { packet });
  return evidence;
}

export function validateJsonPostgresRelationalProjectionValidationEvidence(
  validation,
  { packet } = {},
) {
  const { result_sha256: ignored, ...material } = validation ?? {};
  if (validation?.schema_version
      !== "law-firm-os.json-postgres-relational-projection-validation.v1"
    || validation.outcome !== "PASS"
    || validation.source_sha !== packet?.source_sha
    || validation.source_tree !== packet?.source_tree
    || validation.packet_sha256 !== packet?.packet_sha256
    || validation.selected_table_contract_verified !== true
    || validation.shadow_count_hash_ordering_passed !== true
    || validation.logical_reference_readback_passed !== true
    || validation.projection_performance_accepted !== true
    || validation.tenant_rls_passed !== true
    || validation.transaction_rollback_passed !== true
    || validation.append_only_conflict_guard_passed !== true
    || validation.projection_consumers_read_only !== true
    || validation.projection_receipt_set_verified !== true
    || validation.safe_counts?.shadow_difference_count !== 0
    || validation.safe_counts?.logical_reference_failure_count !== 0
    || validation.safe_counts?.transaction_rollback_failure_count !== 0
    || validation.safe_counts?.append_only_guard_failure_count !== 0
    || validation.safe_counts?.receipt_verification_failure_count !== 0
    || validation.safe_counts?.projection_authority_promotion_count !== 0
    || !SHA256.test(validation.result_sha256 ?? "")
    || validation.result_sha256 !== sha256(material)) {
    fail("W15 projection validation is incomplete");
  }
  return Object.freeze({
    valid: true,
    result_sha256: validation.result_sha256,
  });
}
