import { createHash } from "node:crypto";
import {
  createJsonPostgresStageProbe,
} from "../../packages/persistence/src/postgres/program-stage-observation.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";

const SHA256 = /^[0-9a-f]{64}$/u;
const REQUIRED_RECEIPTS = Object.freeze([
  "w12-terminal",
  "cut-008",
  "source-freeze",
  "first-write-boundary",
  "cut-009",
  "cut-010",
  "cut-011",
]);
const ZERO_AUTHORITY_COUNTERS = Object.freeze([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
]);

function fail(message) {
  throw new Error(message);
}

function exactResult(value, packet, label) {
  if (value?.outcome !== "PASS"
    || value.source_sha !== packet.source_sha
    || value.source_tree !== packet.source_tree
    || value.packet_sha256 !== packet.packet_sha256
    || !SHA256.test(value.result_sha256 ?? "")
    || value.raw_value_returned !== false
    || value.pii_returned !== false
    || value.secret_material_returned !== false) {
    fail(`${label} is not an exact safe PASS`);
  }
  return value;
}

function receiptMap(receipts, packet) {
  if (!Array.isArray(receipts) || receipts.length !== REQUIRED_RECEIPTS.length) {
    fail("CUT-012 requires the complete verified predecessor receipt set");
  }
  const byKind = new Map();
  for (const receipt of receipts) {
    if (receipt?.valid !== true
      || receipt.signature_valid !== true
      || receipt.execution_state !== "PASS"
      || !SHA256.test(receipt.canonical_sha256 ?? "")
      || byKind.has(receipt.receipt_kind)) {
      fail("CUT-012 predecessor receipt is invalid, unsigned, failed, or duplicated");
    }
    byKind.set(receipt.receipt_kind, receipt);
  }
  for (const kind of REQUIRED_RECEIPTS) {
    if (!byKind.has(kind)) fail(`CUT-012 predecessor receipt is missing: ${kind}`);
  }
  if (byKind.get("w12-terminal").canonical_sha256
      !== packet.bindings.w12_terminal_receipt_sha256) {
    fail("CUT-012 W12 terminal receipt binding drifted");
  }
  for (const kind of REQUIRED_RECEIPTS.filter((item) => item !== "w12-terminal")) {
    const receipt = byKind.get(kind);
    if (receipt.source_sha !== packet.source_sha
      || receipt.source_tree !== packet.source_tree
      || receipt.packet_sha256 !== packet.packet_sha256) {
      fail(`CUT-012 ${kind} receipt source or packet binding drifted`);
    }
  }
  if (byKind.get("cut-009").claims?.production_write !== true
    || byKind.get("cut-010").claims?.first_production_write_started !== true
    || byKind.get("cut-011").claims?.json_authority_disabled !== true) {
    fail("CUT-012 predecessor claims do not prove migration, DR, and JSON retirement");
  }
  return byKind;
}

function validateCriticalFlow(value, packet) {
  const checks = [
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
  ];
  if (value?.schema_version !== "law-firm-os.json-postgres-production-critical-flow.v1"
    || value.outcome !== "PASS"
    || value.source_sha !== packet.source_sha
    || value.source_tree !== packet.source_tree
    || value.packet_sha256 !== packet.packet_sha256
    || checks.some((key) => value.checks?.[key] !== true)
    || value.safe_counts?.critical_flow_failure_count !== 0
    || value.safe_counts?.tenant_negative_visible_count !== 0
    || value.safe_counts?.unexpected_rejection_count !== 0
    || value.safe_counts?.unexplained_variance_count !== 0
    || value.safe_counts?.bulk_reset_send_count !== 0
    || ZERO_AUTHORITY_COUNTERS.some((key) => value.safe_counts?.[key] !== 0)
    || value.claims?.raw_value_returned !== false
    || value.claims?.pii_returned !== false
    || value.claims?.secret_material_returned !== false
    || value.claims?.document_bytes_returned !== false) {
    fail("CUT-012 critical production flow evidence failed or drifted");
  }
  return value;
}

export function createJsonPostgresCut012Probe({
  packet,
  verifiedReceipts,
  migrationResult,
  drResult,
  retirementResult,
  criticalFlowResult,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  probeId,
} = {}) {
  const byKind = receiptMap(verifiedReceipts, packet);
  exactResult(migrationResult, packet, "CUT-009 migration result");
  exactResult(drResult, packet, "CUT-010 DR result");
  exactResult(retirementResult, packet, "CUT-011 retirement result");
  const critical = validateCriticalFlow(criticalFlowResult, packet);
  if (migrationResult.claims?.production_write !== true
    || migrationResult.first_write_state !== "FIRST_PRODUCTION_WRITE_STARTED"
    || drResult.operation !== "readback"
    || drResult.dms_restore_mismatch_count !== 0
    || retirementResult.operation !== "probe"
    || retirementResult.legacy_authority_counter_total !== 0
    || retirementResult.operational_json_path_count !== 0) {
    fail("CUT-012 execution results do not prove the required terminal state");
  }
  for (const kind of ["cut-009", "cut-010", "cut-011"]) {
    const receipt = byKind.get(kind);
    if (receipt.predecessor_receipt_sha256.length < 1) {
      fail(`CUT-012 ${kind} receipt has no predecessor binding`);
    }
  }
  const evidenceSha256 = createHash("sha256").update(JSON.stringify({
    receipts: REQUIRED_RECEIPTS.map((kind) => byKind.get(kind).canonical_sha256),
    migration: migrationResult.result_sha256,
    dr: drResult.result_sha256,
    retirement: retirementResult.result_sha256,
    critical: critical.result_sha256,
  })).digest("hex");
  return createJsonPostgresStageProbe({
    probeId,
    stage: "cut-012",
    probeKind: "terminal-validation",
    collectorRef: "run-json-postgres-terminal-closeout.mjs",
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256: jsonPostgresProgramBindingsSha256(packet),
    startedAt,
    finishedAt,
    command: "node scripts/run-json-postgres-terminal-closeout.mjs",
    checks: {
      real_data_reconciliation_passed: true,
      tenant_rls_passed: true,
      tenant_hmac_passed: true,
      role_access_control_passed: true,
      transaction_atomicity_passed: true,
      audit_idempotency_outbox_passed: true,
      individual_first_use_setup_passed: true,
      disabled_account_denial_passed: true,
      dms_controls_passed: true,
      isolated_restore_passed: true,
      missing_json_operation_passed: true,
      critical_flows_passed: true,
      all_component_receipts_verified: true,
    },
    safeCounts: {
      ...Object.fromEntries(ZERO_AUTHORITY_COUNTERS.map((key) => [key, 0])),
      unexplained_variance_count: 0,
      unexpected_rejection_count: 0,
      receipt_verification_failure_count: 0,
      verified_component_receipt_count: REQUIRED_RECEIPTS.length,
      critical_flow_failure_count: critical.safe_counts.critical_flow_failure_count,
      monthly_cost_forecast_krw: monthlyCostForecastKrw,
    },
    evidenceSha256,
  });
}
