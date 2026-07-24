import { createHash } from "node:crypto";
import {
  JSON_POSTGRES_W12_RECEIPTS,
} from "../../packages/persistence/src/postgres/program-receipt.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";

export const JSON_POSTGRES_W12_COMPONENT_RECEIPT_SET_VERSION =
  "law-firm-os.json-postgres-w12-component-receipt-set.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const REQUIRED_KINDS = Object.freeze(
  JSON_POSTGRES_W12_RECEIPTS.filter((kind) => kind !== "w12-terminal"),
);
const ZERO_KEYS = Object.freeze([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
  "receipt_verification_failure_count",
  "unresolved_candidate_count",
  "unexplained_variance_count",
  "unexpected_rejection_count",
  "production_write_count",
  "external_email_send_count",
]);
const CHECK_KEYS = Object.freeze([
  "all_component_receipts_verified",
  "inventory_adjudication_complete",
  "rehearsal_reconciliation_passed",
  "replay_noop_passed",
  "tenant_isolation_passed",
  "failure_injection_passed",
  "capacity_acceptance_passed",
  "dms_controls_passed",
  "isolated_restore_passed",
  "owner_sampling_passed",
  "production_unchanged",
  "external_delivery_absent",
]);
const KEYS = Object.freeze([
  "schema_version",
  "outcome",
  "source_sha",
  "source_tree",
  "packet_sha256",
  "bindings_sha256",
  "component_receipts",
  "checks",
  "safe_counts",
  "claims",
  "result_sha256",
]);
const RECEIPT_KEYS = Object.freeze([
  "receipt_kind",
  "canonical_sha256",
  "result_sha256",
  "signature_valid",
]);
const COUNT_KEYS = Object.freeze([
  ...ZERO_KEYS,
  "component_receipt_count",
  "verified_signature_count",
  "monthly_cost_forecast_krw",
]);
const CLAIM_KEYS = Object.freeze([
  "rehearsal_database_write_observed",
  "production_contacted",
  "production_write",
  "external_email_sent",
  "source_mutated",
  "raw_value_returned",
  "pii_returned",
  "secret_material_returned",
  "document_bytes_returned",
]);

function fail(message) {
  throw new Error(message);
}

function digest(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value))
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

function count(receipts, key) {
  return receipts.reduce(
    (total, receipt) => total + Number(receipt.safe_counts?.[key] ?? 0),
    0,
  );
}

export function createJsonPostgresW12ComponentReceiptSet({
  packet,
  verifiedReceipts,
} = {}) {
  if (!Array.isArray(verifiedReceipts)
    || JSON.stringify(verifiedReceipts.map((receipt) =>
      receipt.receipt_kind)) !== JSON.stringify(REQUIRED_KINDS)) {
    fail("W12 component receipt set is incomplete or out of order");
  }
  const bindingsSha256 = jsonPostgresProgramBindingsSha256(packet);
  for (const receipt of verifiedReceipts) {
    if (receipt.valid !== true
      || receipt.signature_valid !== true
      || receipt.execution_state !== "PASS"
      || receipt.source_sha !== packet?.source_sha
      || receipt.source_tree !== packet?.source_tree
      || receipt.packet_sha256 !== packet?.packet_sha256
      || receipt.bindings_sha256 !== bindingsSha256
      || !SHA256.test(receipt.canonical_sha256 ?? "")
      || !SHA256.test(receipt.result_sha256 ?? "")) {
      fail(`W12 ${receipt.receipt_kind} component receipt failed`);
    }
  }
  const zeroCounts = Object.fromEntries(
    ZERO_KEYS.map((key) => [key, count(verifiedReceipts, key)]),
  );
  if (Object.values(zeroCounts).some((value) => value !== 0)
    || verifiedReceipts.some((receipt) => (
      receipt.claims.production_write
      || receipt.claims.production_contacted
      || receipt.claims.external_email_sent
      || receipt.claims.raw_value_returned
      || receipt.claims.pii_returned
      || receipt.claims.secret_material_returned
      || receipt.claims.dms_bytes_in_evidence
    ))) {
    fail("W12 component receipt set contains a failed safety invariant");
  }
  const monthlyCostForecastKrw = Math.max(
    0,
    ...verifiedReceipts.map((receipt) =>
      Number(receipt.safe_counts?.monthly_cost_forecast_krw ?? 0)),
  );
  if (!Number.isSafeInteger(monthlyCostForecastKrw)
    || monthlyCostForecastKrw > packet.target.monthly_cost_ceiling_krw) {
    fail("W12 component receipt set exceeds the approved cost ceiling");
  }
  const material = Object.freeze({
    schema_version:
      JSON_POSTGRES_W12_COMPONENT_RECEIPT_SET_VERSION,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    bindings_sha256: bindingsSha256,
    component_receipts: Object.freeze(verifiedReceipts.map((receipt) =>
      Object.freeze({
        receipt_kind: receipt.receipt_kind,
        canonical_sha256: receipt.canonical_sha256,
        result_sha256: receipt.result_sha256,
        signature_valid: true,
      }))),
    checks: Object.freeze(Object.fromEntries(
      CHECK_KEYS.map((key) => [key, true]),
    )),
    safe_counts: Object.freeze({
      ...zeroCounts,
      component_receipt_count: verifiedReceipts.length,
      verified_signature_count: verifiedReceipts.length,
      monthly_cost_forecast_krw: monthlyCostForecastKrw,
    }),
    claims: Object.freeze({
      rehearsal_database_write_observed: true,
      production_contacted: false,
      production_write: false,
      external_email_sent: false,
      source_mutated: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      document_bytes_returned: false,
    }),
  });
  const result = Object.freeze({
    ...material,
    result_sha256: digest(material),
  });
  validateJsonPostgresW12ComponentReceiptSet(result, { packet });
  return result;
}

export function validateJsonPostgresW12ComponentReceiptSet(
  value = {},
  { packet } = {},
) {
  closed(value, KEYS, "W12 component receipt set");
  closed(value.checks, CHECK_KEYS, "W12 terminal checks");
  closed(value.safe_counts, COUNT_KEYS, "W12 terminal safe counts");
  closed(value.claims, CLAIM_KEYS, "W12 terminal claims");
  if (value.schema_version
      !== JSON_POSTGRES_W12_COMPONENT_RECEIPT_SET_VERSION
    || value.outcome !== "PASS"
    || !SHA1.test(value.source_sha ?? "")
    || !SHA1.test(value.source_tree ?? "")
    || value.source_sha !== packet?.source_sha
    || value.source_tree !== packet?.source_tree
    || value.packet_sha256 !== packet?.packet_sha256
    || value.bindings_sha256
      !== jsonPostgresProgramBindingsSha256(packet)
    || !Array.isArray(value.component_receipts)
    || JSON.stringify(value.component_receipts.map((receipt) =>
      receipt.receipt_kind)) !== JSON.stringify(REQUIRED_KINDS)
    || value.component_receipts.some((receipt) => {
      try {
        closed(receipt, RECEIPT_KEYS, "W12 component receipt");
      } catch {
        return true;
      }
      return !SHA256.test(receipt.canonical_sha256 ?? "")
        || !SHA256.test(receipt.result_sha256 ?? "")
        || receipt.signature_valid !== true;
    })
    || Object.values(value.checks).some((item) => item !== true)
    || ZERO_KEYS.some((key) => value.safe_counts[key] !== 0)
    || value.safe_counts.component_receipt_count
      !== REQUIRED_KINDS.length
    || value.safe_counts.verified_signature_count
      !== REQUIRED_KINDS.length
    || !Number.isSafeInteger(
      value.safe_counts.monthly_cost_forecast_krw,
    )
    || value.safe_counts.monthly_cost_forecast_krw
      > packet?.target?.monthly_cost_ceiling_krw
    || value.claims.rehearsal_database_write_observed !== true
    || Object.entries(value.claims).some(([key, item]) =>
      key !== "rehearsal_database_write_observed" && item !== false)
    || !SHA256.test(value.result_sha256 ?? "")
    || digest(resultMaterial(value)) !== value.result_sha256) {
    fail("W12 component receipt set failed or drifted");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
    component_receipt_count: value.component_receipts.length,
  });
}
