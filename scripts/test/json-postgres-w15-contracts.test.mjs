import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_STORE_TABLES,
  HRX_TABLE_PRIMARY_KEYS,
} from "../../packages/hrx/src/store/file-store.js";
import {
  createHrxRelationalProductionInventory,
} from "../../packages/hrx/src/relational-projection-contract.js";
import {
  createJsonPostgresPerformanceAcceptance,
} from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS,
  createJsonPostgresExecutionPacket,
} from "../../packages/persistence/src/postgres/execution-contract.js";
import {
  createJsonPostgresW15InventoryBootstrapPacket,
  createJsonPostgresW15InventoryProvenance,
  validateJsonPostgresW15InventoryBootstrapPacket,
} from "../../packages/persistence/src/postgres/w15-inventory-bootstrap-contract.js";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "../../packages/persistence/src/postgres/source-authority-manifest.js";
import {
  JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
  JSON_POSTGRES_W12_RECEIPTS,
  JSON_POSTGRES_W13_RECEIPTS,
  JSON_POSTGRES_W14_RECEIPTS,
  jsonPostgresProgramReceiptMetadata,
  sha256JsonPostgresProgramReceipt,
  validateJsonPostgresProgramReceipt,
} from "../../packages/persistence/src/postgres/program-receipt.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  createJsonPostgresW15ContractBundle,
} from "../lib/json-postgres-w15-contracts.mjs";
import {
  createJsonPostgresW15BaselineManifest,
  createJsonPostgresW15PredecessorVerification,
  createJsonPostgresW15ReceiptLocator,
  JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS,
} from "../lib/json-postgres-w15-preflight.mjs";
import {
  buildJsonPostgresProductionArtifactStoreTemplate,
  buildJsonPostgresProductionTemplate,
} from "../lib/json-postgres-production-infrastructure.mjs";
import {
  createJsonPostgresW15PacketInput,
  createJsonPostgresW15PacketReadiness,
} from "../lib/json-postgres-w15-packet.mjs";
import {
  createJsonPostgresW15ProjectionEvent,
  validateJsonPostgresW15ProjectionEvent,
} from "../lib/json-postgres-w15-execution.mjs";
import {
  assertJsonPostgresW15SourcePublished,
  createJsonPostgresW15BootstrapEvent,
  validateJsonPostgresW15BootstrapEvent,
} from "../lib/json-postgres-w15-bootstrap-event.mjs";
import { readFileSync } from "node:fs";

const SOURCE = "1".repeat(40);
const TREE = "2".repeat(40);
const PACKET = "3".repeat(64);
const BINDINGS = "4".repeat(64);

function digest(value) {
  return createHash("sha256").update(canonicalizeJson(value)).digest("hex");
}

function inventory({ blocked = false } = {}) {
  const empty = digest([]);
  return createHrxRelationalProductionInventory({
    tenantCount: 1,
    inventoryProvenanceSha256: "9".repeat(64),
    outboxEventCount: 0,
    outboxLagMs: 0,
    referenceCount: 0,
    tables: HRX_STORE_TABLES.map((table, index) => ({
      table_name: table,
      source_count: index === 0 ? 1 : 0,
      source_hash: index === 0 ? "7".repeat(64) : empty,
      state_version_min: index === 0 ? 1 : 0,
      state_version_max: index === 0 ? 1 : 0,
      payload_bytes_p50: index === 0 ? 128 : 0,
      payload_bytes_p95: index === 0 ? 128 : 0,
      payload_bytes_max: index === 0 ? 128 : 0,
      soft_deleted_count: 0,
      append_only_count: 0,
      reference_count: 0,
      json_path_presence_sha256: empty,
      json_path_null_ratio_sha256: empty,
      unmapped_nonnull_field_count: blocked && index === 0 ? 1 : 0,
      primary_key_conflict_count: 0,
      foreign_key_conflict_count: 0,
      inventory_classification:
        index === 0
          ? (blocked ? "blocked_mapping" : "populated")
          : "schema_only",
    })),
  });
}

function performance(value) {
  return createJsonPostgresPerformanceAcceptance({
    record_count: value.source_record_count,
    tenant_count: value.tenant_count,
    batch_size: 1,
    pool_max: 2,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_ms: 120_000,
    outbox_lag_p95_ms: 120_000,
    dms_throughput_min_bytes_per_second: 0,
    rpo_target_ms: 300_000,
    rto_target_ms: 3_600_000,
    rehearsal_result_sha256: "5".repeat(64),
  });
}

function schema() {
  return {
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
}

function claims(kind) {
  return {
    real_data_read: false,
    real_data_mutated: false,
    production_contacted: false,
    production_write: false,
    first_production_write_started: false,
    json_authority_disabled: ["cut-011", "cut-012", "go-live"].includes(kind),
    external_email_sent: false,
    dms_bytes_in_evidence: false,
    release: ["formal-release", "go-live"].includes(kind),
    go_live: kind === "go-live",
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  };
}

function receipt(kind, predecessors = []) {
  const metadata = jsonPostgresProgramReceiptMetadata(kind);
  const value = {
    schema_version: JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
    receipt_id: `w15-preflight-${kind}`,
    receipt_kind: kind,
    phase: metadata.phase,
    environment: metadata.environment,
    profile: metadata.profile,
    signer_key_id: "owner-key",
    execution_state: "PASS",
    source_sha: SOURCE,
    source_tree: TREE,
    packet_sha256: PACKET,
    bindings_sha256: BINDINGS,
    started_at: "2026-07-25T00:00:00.000Z",
    finished_at: "2026-07-25T00:01:00.000Z",
    command: `node run-${kind}.mjs`,
    exit_code: 0,
    predecessor_receipt_sha256: predecessors,
    result_sha256: "6".repeat(64),
    safe_counts: { verified_item_count: 1 },
    claims: claims(kind),
  };
  validateJsonPostgresProgramReceipt(value);
  return value;
}

function completePredecessors() {
  const values = [];
  const byKind = new Map();
  for (const kind of JSON_POSTGRES_W12_RECEIPTS) {
    const predecessors = kind === "w12-terminal"
      ? JSON_POSTGRES_W12_RECEIPTS
        .filter((item) => item !== "w12-terminal")
        .map((item) => sha256JsonPostgresProgramReceipt(byKind.get(item)))
      : [];
    const value = receipt(kind, predecessors);
    values.push(value);
    byKind.set(kind, value);
  }
  for (const kind of JSON_POSTGRES_W13_RECEIPTS) {
    const required = {
      "cut-009": ["w12-terminal", "cut-008", "source-freeze", "first-write-boundary"],
      "cut-010": ["cut-009"],
      "cut-011": ["cut-010"],
      "cut-012": ["cut-008", "cut-009", "cut-010", "cut-011"],
    }[kind] ?? [];
    const value = receipt(kind, required.map((item) =>
      sha256JsonPostgresProgramReceipt(byKind.get(item))));
    values.push(value);
    byKind.set(kind, value);
  }
  for (const kind of JSON_POSTGRES_W14_RECEIPTS) {
    const required = {
      "formal-release": ["cut-012", "macos-signing", "windows-signing"],
      "go-live": ["cut-012", "formal-release"],
    }[kind] ?? [];
    const value = receipt(kind, required.map((item) =>
      sha256JsonPostgresProgramReceipt(byKind.get(item))));
    values.push(value);
    byKind.set(kind, value);
  }
  return values;
}

function terminalPredecessors() {
  return completePredecessors().filter((value) =>
    JSON_POSTGRES_W15_REQUIRED_EXTERNAL_RECEIPTS.includes(
      value.receipt_kind,
    ));
}

function target() {
  return {
    target_ref: "lawos-production",
    aws_account: "770880870480",
    aws_region: "ap-northeast-2",
    database_identifier: "lawos-production-postgres",
    database_host: "lawos-production-postgres.example.rds.amazonaws.com",
    database_name: "lawos",
    projection_writer_secret_ref:
      "/lawos/production/postgres/hrx-projection-writer",
    projection_auditor_secret_ref:
      "/lawos/production/postgres/hrx-projection-auditor",
    tenant_context_secret_ref: "/lawos/production/postgres/tenant-context",
    approved_tenant_ids: ["tenant_amic"],
    monthly_cost_ceiling_krw: 300_000,
    tls_mode: "verify-full",
    public_access: false,
    generic_ledger_authority: "postgres-v2",
    json_fallback: false,
    dual_write: false,
    authority_promotion: false,
  };
}

function productionTarget() {
  return {
    target_ref: "lawos-production",
    aws_account: "770880870480",
    aws_region: "ap-northeast-2",
    artifact_bucket_ref: "bucket:lawos-prod-artifacts",
    artifact_bucket_name: "lawos-prod-artifacts-770880870480",
    artifact_expected_bucket_owner: "770880870480",
    artifact_kms_key_ref: "alias/lawos-prod-artifacts",
    artifact_object_lock_enabled: true,
    artifact_versioning_enabled: true,
    artifact_public_access_blocked: true,
    database_secret_ref: "/lawos/production/postgres/master",
    tenant_context_secret_ref: "/lawos/production/postgres/tenant-context",
    dms_bucket_ref: "bucket:lawos-prod-dms",
    dms_bucket_name: "lawos-prod-dms-770880870480",
    dms_prefix: "approved-real-migration",
    dms_kms_key_ref: "alias/lawos-production",
    dms_expected_bucket_owner: "770880870480",
    dms_default_retention_days: 365,
    dms_object_lock_enabled: true,
    dms_versioning_enabled: true,
    dms_public_access_blocked: true,
    program_input_bucket_ref: "bucket:lawos-prod-program-input",
    program_input_bucket_name: "lawos-prod-program-input-770880870480",
    program_input_expected_bucket_owner: "770880870480",
    program_input_kms_key_ref: "alias/lawos-production",
    program_input_object_lock_enabled: true,
    program_input_versioning_enabled: true,
    program_input_public_access_blocked: true,
    approved_tenant_ids: ["tenant_amic"],
    backup_target_ref: "aws-backup:lawos-production",
    isolated: false,
    production: true,
    public_access: false,
    tls_mode: "verify-full",
    monthly_cost_ceiling_krw: 300_000,
  };
}

function priorProductionPacket() {
  const bindings = Object.fromEntries(
    JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS.map((key, index) => [
      key,
      key === "inventory_delta_policy_sha256"
        ? JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256
        : key === "w12_terminal_receipt_sha256"
          ? "d".repeat(64)
          : ["cut012_terminal_receipt_sha256", "go_live_receipt_sha256"]
              .includes(key)
            ? "0".repeat(64)
            : (index % 9 + 1).toString().repeat(64),
    ]),
  );
  return createJsonPostgresExecutionPacket({
    packetId: "LAWOS-W13-COMPLETED-PACKET",
    sourceSha: SOURCE,
    sourceTree: TREE,
    phase: "w13-production-cutover",
    bindings,
    target: productionTarget(),
  }).packet;
}

function w15Packet() {
  const bindings = Object.fromEntries(
    JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS.map((key, index) => [
      key,
      key === "inventory_delta_policy_sha256"
        ? JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256
        : (index % 9 + 1).toString().repeat(64),
    ]),
  );
  return createJsonPostgresExecutionPacket({
    packetId: "LAWOS-W15-EXECUTION-EVENT-TEST",
    sourceSha: SOURCE,
    sourceTree: TREE,
    phase: "w15-relational-projection",
    bindings,
    target: productionTarget(),
  }).packet;
}

test("W15 contract bundle emits all 77 mappings or an exact blocked gap", () => {
  const cleanInventory = inventory();
  const accepted = createJsonPostgresW15ContractBundle({
    schema: schema(),
    inventory: cleanInventory,
    performanceAcceptance: performance(cleanInventory),
  });
  assert.equal(accepted.summary.outcome, "PASS");
  assert.equal(accepted.mappingManifest.table_count, 77);
  assert.equal(accepted.dependencyOrder.dependency_order.length, 77);
  assert.equal(accepted.gapReport.blocked_table_count, 0);

  const blockedInventory = inventory({ blocked: true });
  const blocked = createJsonPostgresW15ContractBundle({
    schema: schema(),
    inventory: blockedInventory,
    performanceAcceptance: performance(blockedInventory),
  });
  assert.equal(blocked.summary.outcome, "BLOCKED");
  assert.equal(blocked.mappingManifest, null);
  assert.equal(blocked.gapReport.blocked_table_count, 1);
});

test("W15 preflight binds the complete predecessor chain and exact target", () => {
  const receipts = terminalPredecessors();
  const verifiedReceipts = receipts.map((value) => ({
    receipt: value,
    verified: {
      ...validateJsonPostgresProgramReceipt(value),
      signature_valid: true,
    },
  }));
  const locators = verifiedReceipts.map(({ receipt: value, verified }) =>
    createJsonPostgresW15ReceiptLocator({
      kind: value.receipt_kind,
      receiptBytes: Buffer.from(JSON.stringify(value)),
      signatureBytes: Buffer.alloc(64, 1),
      canonicalSha256: verified.canonical_sha256,
    }));
  const predecessor = createJsonPostgresW15PredecessorVerification({
    verifiedReceipts,
    receiptLocators: locators,
  });
  assert.equal(predecessor.outcome, "PASS");
  assert.equal(predecessor.required_receipt_count, 3);
  const brokenGoLive = structuredClone(verifiedReceipts);
  brokenGoLive.find(({ verified }) =>
    verified.receipt_kind === "go-live")
    .verified.predecessor_receipt_sha256 = ["f".repeat(64)];
  assert.throws(
    () => createJsonPostgresW15PredecessorVerification({
      verifiedReceipts: brokenGoLive,
      receiptLocators: locators,
    }),
    /predecessor receipt claims are incomplete/u,
  );
  const baseline = createJsonPostgresW15BaselineManifest({
    input: {
      schema_version: "law-firm-os.json-postgres-w15-baseline-input.v1",
      expected_origin_main_sha: SOURCE,
      expected_origin_main_tree: TREE,
      target: target(),
    },
    exactMainSha: SOURCE,
    exactMainTree: TREE,
    predecessorVerification: predecessor,
  });
  assert.equal(baseline.production_write, false);
  assert.equal(baseline.target.generic_ledger_authority, "postgres-v2");
});

test("W15 packet input inherits completed authority bindings and replaces only projection contracts", () => {
  const receipts = terminalPredecessors();
  const verifiedReceipts = receipts.map((value) => ({
    receipt: value,
    verified: {
      ...validateJsonPostgresProgramReceipt(value),
      signature_valid: true,
    },
  }));
  const locators = verifiedReceipts.map(({ receipt: value, verified }) =>
    createJsonPostgresW15ReceiptLocator({
      kind: value.receipt_kind,
      receiptBytes: Buffer.from(JSON.stringify(value)),
      signatureBytes: Buffer.alloc(64, 1),
      canonicalSha256: verified.canonical_sha256,
    }));
  const predecessor = createJsonPostgresW15PredecessorVerification({
    verifiedReceipts,
    receiptLocators: locators,
  });
  const baseline = createJsonPostgresW15BaselineManifest({
    input: {
      schema_version: "law-firm-os.json-postgres-w15-baseline-input.v1",
      expected_origin_main_sha: SOURCE,
      expected_origin_main_tree: TREE,
      target: target(),
    },
    exactMainSha: SOURCE,
    exactMainTree: TREE,
    predecessorVerification: predecessor,
  });
  const observed = inventory();
  const acceptedPerformance = performance(observed);
  const contracts = createJsonPostgresW15ContractBundle({
    schema: schema(),
    inventory: observed,
    performanceAcceptance: acceptedPerformance,
  });
  const prior = priorProductionPacket();
  const stagingReference = JSON.parse(readFileSync(
    "infra/lawos-private-staging/template.json",
    "utf8",
  ));
  const packetInput = createJsonPostgresW15PacketInput({
    packetId: "LAWOS-W15-PACKET-INPUT-TEST",
    sourceSha: "8".repeat(40),
    sourceTree: "9".repeat(40),
    baseline,
    predecessorVerification: predecessor,
    priorProductionPacket: prior,
    mappingManifest: contracts.mappingManifest,
    productionInventory: observed,
    performanceAcceptance: acceptedPerformance,
    artifactStoreTemplate:
      buildJsonPostgresProductionArtifactStoreTemplate(),
    infrastructureTemplate:
      buildJsonPostgresProductionTemplate(stagingReference),
  });
  assert.equal(packetInput.phase, "w15-relational-projection");
  assert.equal(
    packetInput.binding_sha256.record_authority_sha256,
    prior.bindings.record_authority_sha256,
  );
  assert.equal(
    packetInput.binding_sha256.field_crosswalk_sha256,
    contracts.mappingManifest.manifest_sha256,
  );
  assert.equal(
    packetInput.binding_sha256.inventory_content_sha256,
    observed.inventory_sha256,
  );
  assert.equal(
    packetInput.binding_sha256.go_live_receipt_sha256,
    baseline.go_live_receipt_sha256,
  );
  assert.equal(
    Object.keys(packetInput.binding_sha256).length,
    JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS.length - 3,
  );
  const readiness = createJsonPostgresW15PacketReadiness({
    sourceSha: "8".repeat(40),
    sourceTree: "9".repeat(40),
    packetInput,
    baseline,
    predecessorVerification: predecessor,
    mappingManifest: contracts.mappingManifest,
    productionInventory: observed,
    performanceAcceptance: acceptedPerformance,
    packetInputFileSha256: "a".repeat(64),
  });
  assert.equal(
    readiness.outcome,
    "READY_FOR_ARTIFACT_BUILD_AND_OWNER_SIGNATURE",
  );
  assert.equal(readiness.authority_promotion, false);

  const driftedBaseline = structuredClone(baseline);
  driftedBaseline.result_sha256 = "f".repeat(64);
  assert.throws(
    () => createJsonPostgresW15PacketInput({
      packetId: "LAWOS-W15-PACKET-INPUT-TEST",
      sourceSha: "8".repeat(40),
      sourceTree: "9".repeat(40),
      baseline: driftedBaseline,
      predecessorVerification: predecessor,
      priorProductionPacket: prior,
      mappingManifest: contracts.mappingManifest,
      productionInventory: observed,
      performanceAcceptance: acceptedPerformance,
      artifactStoreTemplate:
        buildJsonPostgresProductionArtifactStoreTemplate(),
      infrastructureTemplate:
        buildJsonPostgresProductionTemplate(stagingReference),
    }),
    /baseline manifest is invalid/u,
  );
});

test("W15 bootstrap packet breaks the pre-inventory cycle without projection write authority", () => {
  const created = createJsonPostgresW15InventoryBootstrapPacket({
    packetId: "LAWOS-W15-INVENTORY-BOOTSTRAP-TEST",
    sourceSha: SOURCE,
    sourceTree: TREE,
    bindings: {
      artifact_sha256: "1".repeat(64),
      artifact_manifest_sha256: "2".repeat(64),
      lockfile_sha256: "3".repeat(64),
      migration_catalog_sha256: "4".repeat(64),
      infrastructure_template_sha256: "5".repeat(64),
      baseline_sha256: "6".repeat(64),
      predecessor_verification_sha256: "7".repeat(64),
      w12_terminal_receipt_sha256: "8".repeat(64),
      cut012_terminal_receipt_sha256: "9".repeat(64),
      go_live_receipt_sha256: "a".repeat(64),
    },
    target: productionTarget(),
  });
  assert.equal(
    validateJsonPostgresW15InventoryBootstrapPacket(created.packet).valid,
    true,
  );
  assert.deepEqual(created.packet.allowed_modes, [
    "schema-bootstrap",
    "inventory-read",
  ]);
  assert.equal(created.packet.claims.projection_data_write, false);
  assert.equal(created.packet.claims.consumer_rollout, false);
  assert.equal(created.packet.claims.authority_promotion, false);
  const authorization = {
    packet: { key: "packet" },
    trust_registry: { key: "registry" },
    approval_receipt: { key: "approval" },
    approval_signature: { key: "signature" },
  };
  const inputs = {
    predecessors: [
      { receipt: { key: "w12" }, signature: { key: "w12-signature" } },
      { receipt: { key: "cut012" }, signature: { key: "cut012-signature" } },
      { receipt: { key: "go-live" }, signature: { key: "go-live-signature" } },
    ],
  };
  const schemaEvent = createJsonPostgresW15BootstrapEvent({
    packet: created.packet,
    artifactSha256: created.packet.bindings.artifact_sha256,
    mode: "schema-bootstrap",
    attemptRef: "w15-bootstrap-schema",
    authorization,
    inputs,
  });
  assert.equal(
    validateJsonPostgresW15BootstrapEvent(schemaEvent, {
      packet: created.packet,
      artifactSha256: created.packet.bindings.artifact_sha256,
    }).valid,
    true,
  );
  const inventoryInputs = {
    ...inputs,
    schema_bootstrap_result: { key: "schema-bootstrap-result" },
  };
  const inventoryEvent = createJsonPostgresW15BootstrapEvent({
    packet: created.packet,
    artifactSha256: created.packet.bindings.artifact_sha256,
    mode: "inventory-read",
    attemptRef: "w15-bootstrap-inventory",
    authorization,
    inputs: inventoryInputs,
    schemaBootstrapResultSha256: "b".repeat(64),
  });
  assert.equal(inventoryEvent.schema_bootstrap_result_sha256, "b".repeat(64));
  const provenance = createJsonPostgresW15InventoryProvenance({
    sourceSha: SOURCE,
    sourceTree: TREE,
    bootstrapPacketSha256: created.packet_sha256,
    schemaBootstrapResultSha256: "b".repeat(64),
  });
  assert.match(provenance.provenance_sha256, /^[0-9a-f]{64}$/u);

  const drifted = structuredClone(created.packet);
  drifted.allowed_modes.push("commit");
  assert.throws(
    () => validateJsonPostgresW15InventoryBootstrapPacket(drifted),
    /closed authority boundary/u,
  );
  assert.throws(
    () => createJsonPostgresW15BootstrapEvent({
      packet: created.packet,
      artifactSha256: created.packet.bindings.artifact_sha256,
      mode: "inventory-read",
      attemptRef: "w15-bootstrap-unbound",
      authorization,
      inputs: inventoryInputs,
    }),
    /predecessor result binding is invalid/u,
  );
});

test("W15 source publication accepts exact main or a same-tree merge commit only", () => {
  const sourceSha = "1".repeat(40);
  const sourceTree = "2".repeat(40);
  assert.equal(
    assertJsonPostgresW15SourcePublished({
      sourceSha,
      sourceTree,
      originMainSha: sourceSha,
      originMainTree: sourceTree,
      sourceIsAncestor: true,
    }).publication_mode,
    "exact-main",
  );
  assert.equal(
    assertJsonPostgresW15SourcePublished({
      sourceSha,
      sourceTree,
      originMainSha: "3".repeat(40),
      originMainTree: sourceTree,
      sourceIsAncestor: true,
    }).publication_mode,
    "merge-commit-same-tree",
  );
  assert.throws(
    () => assertJsonPostgresW15SourcePublished({
      sourceSha,
      sourceTree,
      originMainSha: "3".repeat(40),
      originMainTree: "4".repeat(40),
      sourceIsAncestor: true,
    }),
    /exact approved tree/u,
  );
  assert.throws(
    () => assertJsonPostgresW15SourcePublished({
      sourceSha,
      sourceTree,
      originMainSha: "3".repeat(40),
      originMainTree: sourceTree,
      sourceIsAncestor: false,
    }),
    /published at origin\/main/u,
  );
});

test("W15 execution events close ordered backfill, incremental, validation, and consumer rollout modes", () => {
  const packet = w15Packet();
  const artifactSha256 = packet.bindings.artifact_sha256;
  const authorization = {
    packet: { key: "packet" },
    trust_registry: { key: "registry" },
    approval_receipt: { key: "approval" },
    approval_signature: { key: "approval-signature" },
  };
  const inputs = {
    predecessors: [{ receipt: {}, signature: {} }],
    mapping_manifest: { key: "mapping" },
    production_inventory: { key: "inventory" },
    performance_acceptance: { key: "performance" },
  };
  const waveOne = createJsonPostgresW15ProjectionEvent({
    packet,
    artifactSha256,
    mode: "commit",
    attemptRef: "w15-wave-1",
    authorization,
    inputs,
    backfillWave: 1,
  });
  assert.equal(waveOne.backfill_wave, 1);
  assert.equal(
    validateJsonPostgresW15ProjectionEvent(waveOne, {
      packet,
      artifactSha256,
    }).valid,
    true,
  );
  const incremental = createJsonPostgresW15ProjectionEvent({
    packet,
    artifactSha256,
    mode: "resume",
    attemptRef: "w15-incremental",
    authorization,
    inputs,
  });
  assert.equal(Object.hasOwn(incremental, "backfill_wave"), false);
  const rollout = createJsonPostgresW15ProjectionEvent({
    packet,
    artifactSha256,
    mode: "rollout",
    attemptRef: "w15-rollout-wave-1",
    authorization,
    inputs: {
      ...inputs,
      validation_evidence: { key: "validation" },
    },
    backfillWave: 1,
    rolloutAction: "enable",
    queryFamily: "core-employee-roster",
    maxStalenessMs: 60_000,
  });
  assert.equal(rollout.rollout_wave, 1);
  assert.equal(rollout.query_family, "core-employee-roster");
  assert.throws(
    () => createJsonPostgresW15ProjectionEvent({
      packet,
      artifactSha256,
      mode: "commit",
      attemptRef: "w15-wave-2-invalid",
      authorization,
      inputs,
      backfillWave: 2,
    }),
    /backfill wave is invalid/u,
  );
  assert.throws(
    () => createJsonPostgresW15ProjectionEvent({
      packet,
      artifactSha256,
      mode: "rollout",
      attemptRef: "w15-rollout-invalid",
      authorization,
      inputs,
      backfillWave: 2,
      rolloutAction: "enable",
      queryFamily: "recruiting-lifecycle",
      maxStalenessMs: 60_000,
    }),
    /activation binding is invalid/u,
  );
});
