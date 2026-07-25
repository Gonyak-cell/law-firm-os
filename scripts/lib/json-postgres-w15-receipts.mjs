import { createHash } from "node:crypto";
import {
  JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
  JSON_POSTGRES_W15_COMPONENT_RECEIPTS,
  jsonPostgresProgramReceiptMetadata,
  validateJsonPostgresProgramReceipt,
} from "../../packages/persistence/src/postgres/program-receipt.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";

export const JSON_POSTGRES_W15_COMPONENT_RESULT_VERSION =
  "law-firm-os.json-postgres-w15-component-result.v1";

const COMMON_ZERO_COUNTS = Object.freeze([
  "source_authority_write_count",
  "dual_write_count",
  "partial_commit_count",
  "tenant_negative_visible_count",
  "raw_value_count",
]);
const RULES = {
  "w15-predecessor-verification": Object.freeze({
    checks: [
      "w12_terminal_verified",
      "cut012_verified",
      "go_live_verified",
      "exact_target_verified",
    ],
    zeroCounts: ["predecessor_verification_failure_count"],
  }),
  "w15-production-inventory": Object.freeze({
    checks: [
      "approved_tenants_only",
      "safe_aggregate_inventory",
      "inventory_digest_verified",
    ],
    zeroCounts: ["unapproved_tenant_count", "source_drift_count"],
  }),
  "w15-mapping-contract": Object.freeze({
    checks: [
      "all_77_tables_mapped",
      "dependency_order_verified",
      "schema_only_tables_classified",
      "mapping_digest_verified",
    ],
    zeroCounts: [
      "unmapped_nonnull_field_count",
      "primary_key_conflict_count",
      "foreign_key_conflict_count",
    ],
  }),
  "w15-schema-migration": Object.freeze({
    checks: [
      "migration_catalog_verified",
      "forced_rls_verified",
      "delete_guards_verified",
      "append_only_guards_verified",
    ],
    zeroCounts: ["migration_checksum_drift_count", "migration_failure_count"],
  }),
  "w15-database-role": Object.freeze({
    checks: [
      "writer_least_privilege_verified",
      "auditor_read_only_verified",
      "consumer_read_only_verified",
      "tenant_context_authority_verified",
    ],
    zeroCounts: [
      "writer_source_write_grant_count",
      "auditor_write_grant_count",
      "consumer_write_grant_count",
      "bypass_rls_role_count",
    ],
  }),
  "w15-incremental-catchup": Object.freeze({
    checks: [
      "outbox_ordering_verified",
      "event_scoped_projection_verified",
      "cursor_readback_verified",
      "two_event_windows_verified",
    ],
    zeroCounts: [
      "remaining_outbox_event_count",
      "cursor_regression_count",
      "event_replay_write_count",
      "shadow_difference_count",
    ],
  }),
  "w15-shadow-reconciliation": Object.freeze({
    checks: [
      "count_hash_ordering_verified",
      "logical_references_verified",
      "projection_state_verified",
      "archive_lineage_verified",
    ],
    zeroCounts: [
      "shadow_difference_count",
      "logical_reference_failure_count",
      "projection_state_difference_count",
      "unknown_nonnull_field_count",
    ],
  }),
  "w15-tenant-rls": Object.freeze({
    checks: [
      "forced_rls_verified",
      "negative_tenant_probe_verified",
      "exact_tenant_authorities_verified",
    ],
    zeroCounts: [
      "tenant_negative_visible_count",
      "wildcard_tenant_authority_count",
    ],
  }),
  "w15-performance-acceptance": Object.freeze({
    checks: [
      "signed_budget_verified",
      "migration_latency_accepted",
      "outbox_lag_accepted",
      "resource_impact_accepted",
    ],
    zeroCounts: ["performance_budget_failure_count", "cost_ceiling_failure_count"],
  }),
  "w15-rollback-drill": Object.freeze({
    checks: [
      "worker_disabled",
      "projection_reader_disabled",
      "postgres_ledger_fallback_verified",
      "projection_evidence_preserved",
    ],
    zeroCounts: [
      "json_fallback_count",
      "projection_row_delete_count",
      "rollback_failure_count",
    ],
  }),
  "w15-consumer-rollout": Object.freeze({
    checks: [
      "query_family_order_verified",
      "projection_reads_only",
      "stale_projection_fallback_verified",
      "postgres_ledger_fallback_verified",
    ],
    zeroCounts: [
      "consumer_projection_write_count",
      "json_fallback_count",
      "authority_promotion_count",
    ],
  }),
};

for (let wave = 1; wave <= 5; wave += 1) {
  RULES[`w15-backfill-wave-${wave}`] = Object.freeze({
    checks: [
      "approved_source_count_verified",
      "mapped_row_hash_verified",
      "logical_references_verified",
      "replay_noop_verified",
      "checkpoint_verified",
    ],
    zeroCounts: [
      "unresolved_reference_count",
      "partial_commit_count",
      "replay_write_count",
      "shadow_difference_count",
    ],
  });
}
Object.freeze(RULES);

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

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

function componentIndex(kind) {
  const index = JSON_POSTGRES_W15_COMPONENT_RECEIPTS.indexOf(kind);
  if (index === -1) fail("W15 component receipt kind is invalid");
  return index;
}

export function jsonPostgresW15ComponentRule(kind) {
  componentIndex(kind);
  return RULES[kind];
}

export function createJsonPostgresW15ComponentResult({
  kind,
  packet,
  checks,
  safeCounts,
  evidenceSha256,
  startedAt,
  finishedAt,
} = {}) {
  const rule = jsonPostgresW15ComponentRule(kind);
  if (packet?.phase !== "w15-relational-projection"
    || !/^[a-f0-9]{40}$/u.test(packet.source_sha ?? "")
    || !/^[a-f0-9]{40}$/u.test(packet.source_tree ?? "")
    || !/^[a-f0-9]{64}$/u.test(packet.packet_sha256 ?? "")
    || !/^[a-f0-9]{64}$/u.test(evidenceSha256 ?? "")
    || !checks || !safeCounts) {
    fail("W15 component result binding is invalid");
  }
  if (JSON.stringify(Object.keys(checks).sort())
      !== JSON.stringify([...rule.checks].sort())
    || rule.checks.some((key) => checks[key] !== true)) {
    fail("W15 component result checks are incomplete");
  }
  const requiredZeroCounts = [...new Set([
    ...COMMON_ZERO_COUNTS,
    ...rule.zeroCounts,
  ])];
  if (requiredZeroCounts.some((key) => safeCounts[key] !== 0)
    || Object.entries(safeCounts).some(([key, value]) =>
      !/^[a-z][a-z0-9_]{1,95}$/u.test(key)
      || !Number.isSafeInteger(value)
      || value < 0)) {
    fail("W15 component result contains a failed or unsafe counter");
  }
  if (!Number.isFinite(Date.parse(startedAt))
    || !Number.isFinite(Date.parse(finishedAt))
    || Date.parse(finishedAt) < Date.parse(startedAt)) {
    fail("W15 component result interval is invalid");
  }
  const material = {
    schema_version: JSON_POSTGRES_W15_COMPONENT_RESULT_VERSION,
    receipt_kind: kind,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    bindings_sha256: jsonPostgresProgramBindingsSha256(packet),
    evidence_sha256: evidenceSha256,
    started_at: startedAt,
    finished_at: finishedAt,
    checks: { ...checks },
    safe_counts: { ...safeCounts },
    claims: {
      generic_ledger_authority_preserved: true,
      projection_authority: "read-only",
      authority_promotion_not_granted: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function validateJsonPostgresW15ComponentResult(value, {
  packet,
  kind = value?.receipt_kind,
} = {}) {
  const recreated = createJsonPostgresW15ComponentResult({
    kind,
    packet,
    checks: value?.checks,
    safeCounts: value?.safe_counts,
    evidenceSha256: value?.evidence_sha256,
    startedAt: value?.started_at,
    finishedAt: value?.finished_at,
  });
  if (value?.schema_version !== recreated.schema_version
    || value?.outcome !== "PASS"
    || value?.result_sha256 !== recreated.result_sha256
    || stableJson(value) !== stableJson(recreated)) {
    fail("W15 component result is invalid");
  }
  return Object.freeze({
    valid: true,
    receipt_kind: kind,
    result_sha256: value.result_sha256,
  });
}

function componentPredecessorDigests(kind, predecessors) {
  const index = componentIndex(kind);
  const byKind = new Map(predecessors.map((receipt) => [
    receipt.receipt_kind,
    receipt,
  ]));
  const requiredKinds = index === 0
    ? ["w12-terminal", "cut-012", "go-live"]
    : [JSON_POSTGRES_W15_COMPONENT_RECEIPTS[index - 1]];
  const digests = requiredKinds.map((requiredKind) =>
    byKind.get(requiredKind)?.canonical_sha256);
  if (digests.some((digest) => !/^[a-f0-9]{64}$/u.test(digest ?? ""))) {
    fail("W15 component predecessor receipt is missing");
  }
  return digests;
}

export function createJsonPostgresW15ComponentReceipt({
  packet,
  result,
  predecessors,
  receiptId,
  signerKeyId,
  command,
} = {}) {
  validateJsonPostgresW15ComponentResult(result, {
    packet,
    kind: result?.receipt_kind,
  });
  if (!Array.isArray(predecessors)) fail("W15 component predecessors are required");
  const metadata = jsonPostgresProgramReceiptMetadata(result.receipt_kind);
  const receipt = {
    schema_version: JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
    receipt_id: requiredText(receiptId, "receiptId"),
    receipt_kind: result.receipt_kind,
    phase: metadata.phase,
    environment: metadata.environment,
    profile: metadata.profile,
    signer_key_id: requiredText(signerKeyId, "signerKeyId"),
    execution_state: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    bindings_sha256: jsonPostgresProgramBindingsSha256(packet),
    started_at: result.started_at,
    finished_at: result.finished_at,
    command: requiredText(command, "command"),
    exit_code: 0,
    predecessor_receipt_sha256: componentPredecessorDigests(
      result.receipt_kind,
      predecessors,
    ),
    result_sha256: result.result_sha256,
    safe_counts: { ...result.safe_counts },
    claims: {
      real_data_read: true,
      real_data_mutated:
        ![
          "w15-predecessor-verification",
          "w15-production-inventory",
          "w15-mapping-contract",
          "w15-shadow-reconciliation",
          "w15-tenant-rls",
          "w15-performance-acceptance",
        ].includes(result.receipt_kind),
      production_contacted: true,
      production_write: false,
      first_production_write_started: true,
      json_authority_disabled: true,
      external_email_sent: false,
      dms_bytes_in_evidence: false,
      release: false,
      go_live: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  validateJsonPostgresProgramReceipt(receipt, {
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256: receipt.bindings_sha256,
  });
  return Object.freeze(receipt);
}
