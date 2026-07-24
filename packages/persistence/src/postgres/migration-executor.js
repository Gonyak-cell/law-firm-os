import { createHash } from "node:crypto";
import { runJsonPostgresMigration } from "./json-postgres-migration.js";
import { reconcileJsonPostgresMigrationCorpus } from "./migration-reconciliation.js";
import { validateJsonPostgresRecordTypeCatalog } from "./record-type-catalog.js";

export const JSON_POSTGRES_EXECUTION_RESULT_VERSION = "law-firm-os.json-postgres-execution-result.v1";

const MODES = new Set(["preflight", "dry-run", "stage", "commit", "resume", "readback", "reconcile"]);
const PHASES = new Set(["w12-real-data-rehearsal", "w13-production-cutover"]);
const REQUIRED_COMMIT_PREDECESSORS = Object.freeze({
  "w12-real-data-rehearsal": Object.freeze([
    "source-inventory-adjudication",
    "record-type-and-reference",
    "w12-infrastructure",
    "w12-sink",
  ]),
  "w13-production-cutover": Object.freeze([
    "w12-terminal",
    "cut-008",
    "source-freeze",
    "first-write-boundary",
  ]),
});

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function validateApproval(approval, packet) {
  if (approval?.valid !== true || approval.decision !== "approved" || approval.packet_sha256 !== packet.packet_sha256) {
    fail("LAWOS_JSON_POSTGRES_EXECUTION_APPROVAL", "verified exact execution approval is required");
  }
  if (approval.phase !== packet.phase) fail("LAWOS_JSON_POSTGRES_EXECUTION_APPROVAL", "execution approval phase drifted");
}

function validateBundle(packet, bundle) {
  if (bundle?.summary?.ready_for_owner_signature !== true) {
    fail("LAWOS_JSON_POSTGRES_AUTHORITY_NOT_READY", "authority bundle is not reconciliation-complete");
  }
  const pairs = [
    ["authority_bundle_sha256", bundle.summary.bundle_sha256],
    ["inventory_content_sha256", bundle.summary.inventory_content_sha256],
    ["record_type_catalog_sha256", bundle.summary.record_type_catalog_sha256],
    ["record_authority_sha256", bundle.summary.record_authority_sha256],
    ["field_crosswalk_sha256", bundle.summary.field_crosswalk_sha256],
    ["authority_manifest_sha256", bundle.summary.authority_manifest_sha256],
    ["migration_manifest_sha256", bundle.summary.migration_manifest_sha256],
  ];
  for (const [key, value] of pairs) {
    if (packet.bindings?.[key] !== value) fail("LAWOS_JSON_POSTGRES_EXECUTION_BINDING", `${key} drifted`);
  }
  validateJsonPostgresRecordTypeCatalog(bundle.record_type_catalog);
}

function validatePredecessors({ phase, mode, packet, sourceSha, sourceTree, predecessors }) {
  if (!["commit", "resume"].includes(mode)) return Object.freeze([]);
  const byKind = new Map();
  for (const predecessor of predecessors ?? []) {
    if (predecessor?.valid !== true || predecessor.execution_state !== "PASS") {
      fail("LAWOS_JSON_POSTGRES_PREDECESSOR", "execution predecessor is not a verified PASS");
    }
    const priorW12 = phase === "w13-production-cutover" && predecessor.receipt_kind === "w12-terminal";
    if ((!priorW12 && (predecessor.source_sha !== sourceSha
      || predecessor.source_tree !== sourceTree
      || predecessor.packet_sha256 !== packet.packet_sha256))
      || (priorW12 && predecessor.canonical_sha256 !== packet.bindings.w12_terminal_receipt_sha256)) {
      fail("LAWOS_JSON_POSTGRES_PREDECESSOR", "execution predecessor binding drifted");
    }
    if (byKind.has(predecessor.receipt_kind)) fail("LAWOS_JSON_POSTGRES_PREDECESSOR", "execution predecessor kind is duplicated");
    byKind.set(predecessor.receipt_kind, predecessor);
  }
  const required = REQUIRED_COMMIT_PREDECESSORS[phase];
  const missing = required.filter((kind) => !byKind.has(kind));
  if (missing.length > 0) fail("LAWOS_JSON_POSTGRES_PREDECESSOR", "required execution predecessors are missing", { missing });
  const firstWrite = byKind.get("first-write-boundary");
  if (phase === "w13-production-cutover" && firstWrite.claims?.first_production_write_started !== false) {
    fail("LAWOS_JSON_POSTGRES_FIRST_WRITE", "first-write boundary must prove production write has not started");
  }
  return Object.freeze(required.map((kind) => byKind.get(kind).canonical_sha256));
}

function safeCountsFromMigration(result = {}) {
  return Object.freeze({
    ...result.safe_counts,
    json_fallback_count: result.json_fallback_count,
    json_writer_count: result.json_writer_count,
    dual_write_count: result.dual_write_count,
    file_current_authority_count: result.file_current_authority_count,
    offline_mutation_count: result.offline_mutation_count,
    memory_fallback_count: result.memory_fallback_count,
    directory_replayed_noop_count: result.directory?.replayed_noop_count ?? 0,
    directory_idempotency_count: result.directory?.idempotency_count ?? 0,
    directory_audit_count: result.directory?.audit_count ?? 0,
    directory_outbox_count: result.directory?.outbox_count ?? 0,
    domain_replayed_noop_count: (result.domains ?? []).reduce((total, domain) => total + Number(domain.replayed_noop_count ?? 0), 0),
    domain_idempotency_count: (result.domains ?? []).reduce((total, domain) => total + Number(domain.idempotency_count ?? 0), 0),
    domain_audit_count: (result.domains ?? []).reduce((total, domain) => total + Number(domain.audit_count ?? 0), 0),
    domain_outbox_count: (result.domains ?? []).reduce((total, domain) => total + Number(domain.outbox_count ?? 0), 0),
  });
}

export async function runJsonPostgresExecutionMode({
  packet,
  approval,
  authorityBundle,
  corpus,
  mode,
  pool = null,
  negativeTenantId = null,
  checkpoint = null,
  onCheckpoint = null,
  predecessors = [],
  dmsRunner = null,
} = {}) {
  if (!PHASES.has(packet?.phase)) fail("LAWOS_JSON_POSTGRES_EXECUTION_PHASE", "execution phase is invalid");
  if (!MODES.has(mode) || !packet.allowed_modes?.includes(mode)) fail("LAWOS_JSON_POSTGRES_EXECUTION_MODE", "execution mode is not approved");
  validateApproval(approval, packet);
  validateBundle(packet, authorityBundle);
  const predecessorDigests = validatePredecessors({
    phase: packet.phase,
    mode,
    packet,
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    predecessors,
  });
  const writes = ["commit", "resume"].includes(mode);
  if (writes && !pool) fail("LAWOS_JSON_POSTGRES_EXECUTION_TARGET", "approved PostgreSQL target pool is required");
  let migration = null;
  let reconciliation = null;
  let dms = null;
  if (mode === "preflight") {
    // Exact bindings are the preflight.
  } else if (mode === "reconcile") {
    reconciliation = reconcileJsonPostgresMigrationCorpus({
      corpus,
      recordTypeCatalog: authorityBundle.record_type_catalog,
    });
    if (reconciliation.outcome !== "PASS") fail("LAWOS_JSON_POSTGRES_RECONCILIATION", "migration corpus reconciliation is blocked");
    migration = await runJsonPostgresMigration({
      pool,
      corpus,
      mode: "readback",
      allowRealData: true,
      recordTypeCatalog: authorityBundle.record_type_catalog,
      negativeTenantId,
      checkpoint,
      onCheckpoint,
    });
    if (migration.source_manifest_sha256
      !== authorityBundle.summary.migration_manifest_sha256) {
      fail(
        "LAWOS_JSON_POSTGRES_EXECUTION_SOURCE",
        "migration corpus digest drifted during reconciliation",
      );
    }
  } else {
    const migrationMode = mode === "stage" ? "dry-run"
      : mode === "commit" ? "import"
        : mode;
    migration = await runJsonPostgresMigration({
      pool,
      corpus,
      mode: migrationMode,
      allowRealData: true,
      recordTypeCatalog: authorityBundle.record_type_catalog,
      negativeTenantId,
      checkpoint,
      onCheckpoint,
    });
    if (migration.source_manifest_sha256 !== authorityBundle.summary.migration_manifest_sha256) {
      fail("LAWOS_JSON_POSTGRES_EXECUTION_SOURCE", "migration corpus digest drifted after approval");
    }
  }
  if (migration && migration.outcome !== "PASS") {
    fail(
      "LAWOS_JSON_POSTGRES_READBACK_VARIANCE",
      "PostgreSQL migration readback did not match the approved source",
    );
  }
  if (mode !== "preflight") {
    if (typeof dmsRunner !== "function") fail("LAWOS_JSON_POSTGRES_DMS_REQUIRED", "the exact DMS object migration is required");
    dms = await dmsRunner({ mode });
    const dmsWritesExpected = writes
      && Number(dms?.safe_counts?.source_object_count ?? 0) > 0;
    if (dms?.outcome !== "PASS"
      || dms.manifest_sha256 !== packet.bindings?.dms_object_manifest_sha256
      || dms.authority_manifest_sha256 !== authorityBundle.summary.authority_manifest_sha256
      || dms.claims?.document_bytes_returned !== false
      || dms.claims?.pii_returned !== false
      || dms.claims?.secret_material_returned !== false
      || dms.claims?.provider_write !== dmsWritesExpected
      || dms.claims?.postgres_metadata_write !== dmsWritesExpected) {
      fail("LAWOS_JSON_POSTGRES_DMS_RESULT", "DMS migration result is missing, unsafe, or binding-drifted");
    }
  }
  const production = packet.phase === "w13-production-cutover";
  const firstWriteState = production && writes ? "FIRST_PRODUCTION_WRITE_STARTED"
    : production ? "FIRST_PRODUCTION_WRITE_NOT_STARTED"
      : "NOT_PRODUCTION";
  const baseSafeCounts = migration ? {
    ...safeCountsFromMigration(migration),
    ...(reconciliation?.safe_counts ?? {}),
  }
    : reconciliation ? reconciliation.safe_counts
      : authorityBundle.summary.safe_counts;
  const safeCounts = Object.freeze({
    ...baseSafeCounts,
    json_fallback_count: baseSafeCounts.json_fallback_count ?? 0,
    json_writer_count: baseSafeCounts.json_writer_count ?? 0,
    dual_write_count: baseSafeCounts.dual_write_count ?? 0,
    file_current_authority_count:
      baseSafeCounts.file_current_authority_count ?? 0,
    offline_mutation_count: baseSafeCounts.offline_mutation_count ?? 0,
    memory_fallback_count: baseSafeCounts.memory_fallback_count ?? 0,
    ...Object.fromEntries(Object.entries(dms?.safe_counts ?? {}).map(([key, value]) => [`dms_${key}`, value])),
  });
  const combinedInvariantHash = migration || dms
    ? sha256({
      ledger_invariant_hash: migration?.invariant_hash ?? null,
      reconciliation_sha256: reconciliation?.reconciliation_sha256 ?? null,
      dms_invariant_hash: dms?.invariant_hash ?? null,
    })
    : null;
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_EXECUTION_RESULT_VERSION,
    phase: packet.phase,
    mode,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    authority_bundle_sha256: authorityBundle.summary.bundle_sha256,
    migration_manifest_sha256: authorityBundle.summary.migration_manifest_sha256,
    first_write_state: firstWriteState,
    predecessor_receipt_sha256: predecessorDigests,
    checkpoint: migration?.checkpoint ?? checkpoint ?? null,
    dms_checkpoint: dms?.checkpoint ?? null,
    invariant_hash: combinedInvariantHash,
    ledger_invariant_hash: migration?.invariant_hash ?? null,
    dms_invariant_hash: dms?.invariant_hash ?? null,
    dms_result_sha256: dms?.result_sha256 ?? null,
    safe_counts: safeCounts,
    performance: migration?.performance ?? null,
    rejected_reason_counts: migration?.rejected_reason_counts ?? {},
    rejected_rows: migration?.rejected_rows ?? [],
    claims: Object.freeze({
      real_data_read: mode !== "preflight",
      real_data_mutated: writes,
      database_write: writes,
      production_contacted: production && mode !== "preflight",
      production_write: production && writes,
      authority_activated: production && writes,
      json_authority_disabled: false,
      dms_bytes_in_evidence: false,
      release: false,
      go_live: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    }),
  });
  return Object.freeze({ ...value, result_sha256: sha256(value) });
}
