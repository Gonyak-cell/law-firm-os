import {
  createCatalogReadbackAuthorizationPacket,
  catalogReadbackConfirmation,
} from "../../packages/persistence/src/postgres/catalog-readback-authorization.js";
import {
  createCatalogReadbackPreflightReceipt,
} from "../../packages/persistence/src/postgres/catalog-readback-receipts.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  normalizeClientOperationsMigrationCatalog,
} from "../../apps/api/src/client-operations-schema.js";
import {
  C0,
  C1,
  DIAGNOSTIC_ZIP,
  F0,
  F1,
  FCFG,
  H,
  HB,
  ROLLBACK_ZIP,
  TASK2_AUDITOR_ROW,
  TASK2_INVENTORY,
  TASK2_INVENTORY_BINDING,
  TASK2_INVENTORY_PATH,
  liveCatalog,
  state,
} from "./production-catalog-readback-state-fixtures.mjs";
import {
  AUTHORIZATION,
  TASK3_FIXTURE_NOW,
  approval,
  lineage,
} from "./production-catalog-readback-authorization-fixtures.mjs";

const SOURCE_MIGRATION_CATALOG =
  normalizeClientOperationsMigrationCatalog(
    CLIENT_OPERATIONS_MIGRATION_CATALOG,
  );

const LIVE_AUTHORITY = Object.freeze({
  schema_version:
    "law-firm-os.production-migration-catalog-readback-live-authority.v1",
  approval_audit_bucket_sha256: H("approval-audit-bucket"),
  aws_cli_toolchain_manifest_sha256: H("aws-cli-toolchain-manifest"),
  database_host_sha256: H("database-host"),
  database_identifier_sha256: H("database-identifier"),
  deployment_artifact_sha256: H("deployment-artifact"),
  deployment_commit: "a".repeat(40),
  deployment_tree: "b".repeat(40),
  execution_packet_sha256: H("execution-packet"),
  program_input_bucket_sha256: H("program-input-bucket"),
  program_input_kms_key_arn_sha256: H("program-input-kms-key"),
  projection_auditor_database_secret_id_sha256: H("projection-auditor-secret"),
  tenant_context_secret_id_sha256: H("tenant-context-secret"),
});

function diagnosticManifestBytes() {
  const manifest = {
    schema_version: "law-firm-os.json-postgres-production-artifact.v1",
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    artifact_sha256: HB(DIAGNOSTIC_ZIP),
    artifact_byte_size: DIAGNOSTIC_ZIP.byteLength,
    data_scope: "approved-immutable-inputs-only",
    operational_authority: "postgres-v2",
    json_fallback: false,
    json_writer: false,
    dual_write: false,
    file_current_authority: false,
    offline_mutation: false,
    memory_fallback: false,
    packaged_real_identity_count: 0,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
    secrets_in_environment: false,
    production_ready_claim: false,
    manifest_canonical_sha256: "",
  };
  manifest.manifest_canonical_sha256 = H(canonicalizeJson(manifest));
  return Buffer.from(JSON.stringify(manifest));
}

const DIAGNOSTIC_MANIFEST = diagnosticManifestBytes();
const ROLLBACK_MANIFEST = Buffer.from(JSON.stringify({
  schema_version: "amic-os.outlook.lambda-rollback-code.test",
}));
const TASK2_INVENTORY_BYTES = Buffer.from(
  `${JSON.stringify(TASK2_INVENTORY, null, 2)}\n`,
  "utf8",
);

function packet({
  task2Inventory = TASK2_INVENTORY_BINDING,
  sourceCatalog = {
    migration_count: SOURCE_MIGRATION_CATALOG.migration_catalog_count,
    catalog_sha256:
      SOURCE_MIGRATION_CATALOG.migration_catalog_sha256,
  },
} = {}) {
  return createCatalogReadbackAuthorizationPacket({
    packetId: "task3a-operator-test",
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    diagnosticArtifact: {
      sha256: HB(DIAGNOSTIC_ZIP), bytes: DIAGNOSTIC_ZIP.byteLength,
      manifest_sha256: HB(DIAGNOSTIC_MANIFEST), code_sha256_base64: C1,
    },
    rollbackArtifact: {
      sha256: HB(ROLLBACK_ZIP), bytes: ROLLBACK_ZIP.byteLength,
      manifest_sha256: HB(ROLLBACK_MANIFEST), code_sha256_base64: C0,
    },
    preState: {
      revision_id: "R0",
      code_sha256_base64: C0,
      configuration_fingerprint_sha256: F0,
      non_code_configuration_fingerprint_sha256: FCFG,
    },
    liveAuthority: LIVE_AUTHORITY,
    task2Inventory,
    sourceCatalog,
  });
}

function preflightInput(created = packet()) {
  return {
    packet: created.packet,
    packetSha256: created.packet_sha256,
    authorization: AUTHORIZATION,
    artifacts: {
      diagnostic: {
        path: "/private/diagnostic.zip",
        bytes: DIAGNOSTIC_ZIP.byteLength,
        sha256: HB(DIAGNOSTIC_ZIP),
        manifest: {
          path: "/private/diagnostic.manifest.json",
          bytes: DIAGNOSTIC_MANIFEST.byteLength,
          sha256: HB(DIAGNOSTIC_MANIFEST),
        },
      },
      rollback: {
        path: TASK2_AUDITOR_ROW.rollback_code.path,
        bytes: ROLLBACK_ZIP.byteLength,
        sha256: HB(ROLLBACK_ZIP),
        manifest: {
          path: TASK2_AUDITOR_ROW.rollback_code.manifest_path,
          bytes: ROLLBACK_MANIFEST.byteLength,
          sha256: HB(ROLLBACK_MANIFEST),
        },
      },
    },
    task2Inventory: { path: TASK2_INVENTORY_PATH },
  };
}

function privateBytes(descriptor) {
  return {
    "diagnostic-artifact": DIAGNOSTIC_ZIP,
    "diagnostic-manifest": DIAGNOSTIC_MANIFEST,
    "rollback-artifact": ROLLBACK_ZIP,
    "rollback-manifest": ROLLBACK_MANIFEST,
  }[descriptor.kind];
}

function sourceEnvelopeVerification(created = packet()) {
  return {
    source_sha: created.packet.source_sha,
    source_tree: created.packet.source_tree,
    source_envelope_sha256: H("task-1-source-envelope"),
  };
}

function readTask2InventoryEvidence() {
  return structuredClone(TASK2_INVENTORY);
}

function sourceEnvelopeReadResult(created = packet()) {
  return {
    outputPath: "task-1-source-envelope.json",
    completionPath: "task-1-source-envelope.json.complete",
    record: {
      status: "PASS",
      output_sha256:
        sourceEnvelopeVerification(created).source_envelope_sha256,
      worktree: {
        head: created.packet.source_sha,
        tree: created.packet.source_tree,
      },
    },
  };
}

function preflightReceipt(created = packet()) {
  return createCatalogReadbackPreflightReceipt({
    lineage: lineage(created),
    sourceEnvelopeSha256:
      sourceEnvelopeVerification(created).source_envelope_sha256,
    validateLocator: {
      path: TASK2_INVENTORY_PATH,
      bytes: TASK2_INVENTORY_BYTES.byteLength,
      sha256: HB(TASK2_INVENTORY_BYTES),
    },
  });
}

function invokeEvent(created = packet(), preflight = preflightReceipt(created)) {
  return {
    schema_version: "law-firm-os.production-migration-catalog-readback-event.v1",
    action: "lawos-production-migration-catalog-readback",
    operation: "catalog.readback",
    packet: structuredClone(created.packet),
    authorization: AUTHORIZATION,
    preflight_receipt_sha256: preflight.receipt_sha256,
  };
}

function executionInput(created = packet()) {
  const preflight = preflightReceipt(created);
  return {
    authorization: {
      packet: created.packet,
      packet_sha256: created.packet_sha256,
    },
    event: invokeEvent(created, preflight),
    diagnosticZip: DIAGNOSTIC_ZIP,
    rollbackZip: ROLLBACK_ZIP,
    confirmation: catalogReadbackConfirmation(
      created.packet,
      created.packet_sha256,
    ),
    preflightReceipt: preflight,
    task2Inventory: { path: TASK2_INVENTORY_PATH },
  };
}

export {
  C0,
  C1,
  DIAGNOSTIC_ZIP,
  F0,
  F1,
  FCFG,
  H,
  HB,
  SOURCE_MIGRATION_CATALOG,
  approval,
  TASK3_FIXTURE_NOW,
  executionInput,
  liveCatalog,
  packet,
  preflightReceipt,
  preflightInput,
  privateBytes,
  readTask2InventoryEvidence,
  state,
  sourceEnvelopeReadResult,
  sourceEnvelopeVerification,
};

export {
  operatorPorts,
  successfulAws,
} from "./production-catalog-readback-aws-fixtures.mjs";

export {
  executeArgv,
  validateArgv,
} from "./production-catalog-readback-cli-fixtures.mjs";
