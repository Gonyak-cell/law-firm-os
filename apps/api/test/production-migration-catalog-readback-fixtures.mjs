import { createHash, generateKeyPairSync, sign } from "node:crypto";

import {
  CATALOG_READBACK_ACTION,
  CATALOG_READBACK_DATA_SCOPE,
  CATALOG_READBACK_ENVIRONMENT,
  CATALOG_READBACK_OPERATION,
  createCatalogReadbackAuthorizationPacket,
} from "../../../packages/persistence/src/postgres/catalog-readback-authorization.js";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
} from "../src/client-operations-schema.js";

const H = (value) => createHash("sha256").update(String(value)).digest("hex");
const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const NOW = Date.parse("2026-08-16T04:00:00.000Z");

const LIVE_AUTHORITY_ENVIRONMENT = Object.freeze({
  LAWOS_APPROVAL_AUDIT_BUCKET: "lawos-production-approval-audit",
  LAWOS_AWS_ACCOUNT_ID: "770880870480",
  LAWOS_DATABASE_HOST: "lawos-private.example.rds.amazonaws.com",
  LAWOS_DATABASE_IDENTIFIER: "lawos-production-postgres",
  LAWOS_DATABASE_NAME: "lawos",
  LAWOS_DATABASE_PORT: "5432",
  LAWOS_DEPLOYMENT_ARTIFACT_SHA256: "d".repeat(64),
  LAWOS_DEPLOYMENT_COMMIT: "e".repeat(40),
  LAWOS_DEPLOYMENT_TREE: "f".repeat(40),
  LAWOS_EXECUTION_PACKET_SHA256: "1".repeat(64),
  LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
  LAWOS_POSTGRES_SSL_MODE: "verify-full",
  LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/tenant-context",
  LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID: "lawos/hrx-projection-auditor",
  LAWOS_PROGRAM_EXECUTION_ROLE: "projection-auditor",
  LAWOS_PROGRAM_INPUT_BUCKET: "lawos-production-program-input",
  LAWOS_PROGRAM_INPUT_KMS_KEY_ARN:
    "arn:aws:kms:ap-northeast-2:770880870480:key/catalog-readback",
  LAWOS_RUNTIME_PROFILE: "operational",
  NODE_EXTRA_CA_CERTS: "/var/task/certs/global-bundle.pem",
});

const LIVE_AUTHORITY = Object.freeze({
  schema_version:
    "law-firm-os.production-migration-catalog-readback-live-authority.v1",
  approval_audit_bucket_sha256: H(
    LIVE_AUTHORITY_ENVIRONMENT.LAWOS_APPROVAL_AUDIT_BUCKET,
  ),
  aws_cli_toolchain_manifest_sha256: H("task3-api-fixture-toolchain-manifest"),
  database_host_sha256: H(LIVE_AUTHORITY_ENVIRONMENT.LAWOS_DATABASE_HOST),
  database_identifier_sha256: H(
    LIVE_AUTHORITY_ENVIRONMENT.LAWOS_DATABASE_IDENTIFIER,
  ),
  deployment_artifact_sha256:
    LIVE_AUTHORITY_ENVIRONMENT.LAWOS_DEPLOYMENT_ARTIFACT_SHA256,
  deployment_commit: LIVE_AUTHORITY_ENVIRONMENT.LAWOS_DEPLOYMENT_COMMIT,
  deployment_tree: LIVE_AUTHORITY_ENVIRONMENT.LAWOS_DEPLOYMENT_TREE,
  execution_packet_sha256:
    LIVE_AUTHORITY_ENVIRONMENT.LAWOS_EXECUTION_PACKET_SHA256,
  program_input_bucket_sha256: H(
    LIVE_AUTHORITY_ENVIRONMENT.LAWOS_PROGRAM_INPUT_BUCKET,
  ),
  program_input_kms_key_arn_sha256: H(
    LIVE_AUTHORITY_ENVIRONMENT.LAWOS_PROGRAM_INPUT_KMS_KEY_ARN,
  ),
  projection_auditor_database_secret_id_sha256: H(
    LIVE_AUTHORITY_ENVIRONMENT.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID,
  ),
  tenant_context_secret_id_sha256: H(
    LIVE_AUTHORITY_ENVIRONMENT.LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID,
  ),
});

function packet() {
  return createCatalogReadbackAuthorizationPacket({
    packetId: "outlook-catalog-readback-test",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    diagnosticArtifact: {
      sha256: H("diagnostic"),
      bytes: 4096,
      manifest_sha256: H("diagnostic-manifest"),
      code_sha256_base64: Buffer.from(H("diagnostic"), "hex").toString("base64"),
    },
    rollbackArtifact: {
      sha256: H("rollback"),
      bytes: 8192,
      manifest_sha256: H("rollback-manifest"),
      code_sha256_base64: Buffer.from(H("rollback"), "hex").toString("base64"),
    },
    preState: {
      revision_id: "revision-r0",
      code_sha256_base64: Buffer.from(H("rollback"), "hex").toString("base64"),
      configuration_fingerprint_sha256: H("f0"),
      non_code_configuration_fingerprint_sha256: H("fcfg"),
    },
    liveAuthority: LIVE_AUTHORITY,
    task2Inventory: {
      schema_version: "amic-os.outlook.production-aws-inventory.v2",
      inventory_sha256: H("task2-inventory"),
      observed_at: "2026-08-16T03:00:00.000Z",
      projection_auditor_row_sha256: H("task2-projection-auditor-row"),
    },
    sourceCatalog: {
      migration_count: CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_migration_count,
      catalog_sha256: CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_sha256,
    },
  });
}

function signedEvent({ mutateReceipt, signature = null } = {}) {
  const created = packet();
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-08-16T03:00:00.000Z",
    keys: [{
      key_id: "owner-key-1",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: [CATALOG_READBACK_ACTION],
      environments: [CATALOG_READBACK_ENVIRONMENT],
      valid_from: "2026-08-16T00:00:00.000Z",
      valid_until: "2026-08-17T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  let receipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: "approval-task3-test",
    key_id: "owner-key-1",
    role: "owner",
    decision: "approved",
    packet_sha256: created.packet_sha256,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    action: CATALOG_READBACK_ACTION,
    environment: CATALOG_READBACK_ENVIRONMENT,
    signed_at: "2026-08-16T03:30:00.000Z",
    expires_at: "2026-08-16T05:00:00.000Z",
    data_scope: [...CATALOG_READBACK_DATA_SCOPE],
    contact_scope: [],
  };
  receipt = mutateReceipt ? mutateReceipt(receipt) : receipt;
  const registryJson = canonicalizeJson(registry);
  const receiptJson = canonicalizeJson(receipt);
  const signed = signature ?? sign(null, Buffer.from(receiptJson), privateKey).toString("base64");
  return {
    event: {
      schema_version: "law-firm-os.production-migration-catalog-readback-event.v1",
      action: CATALOG_READBACK_ACTION,
      operation: CATALOG_READBACK_OPERATION,
      packet: created.packet,
      authorization: {
        trust_registry_json: registryJson,
        approval_receipt_json: receiptJson,
        approval_signature_base64: signed,
      },
      preflight_receipt_sha256: "c".repeat(64),
    },
    env: {
      ...LIVE_AUTHORITY_ENVIRONMENT,
      AWS_REGION: "ap-northeast-2",
      AWS_LAMBDA_FUNCTION_NAME: "lawos-production-projection-auditor",
      LAWOS_OWNER_TRUST_REGISTRY_SHA256: H(registryJson),
    },
    deploymentManifest: {
      schema_version: "law-firm-os.json-postgres-production-artifact.v1",
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      operational_authority: "postgres-v2",
      json_fallback: false,
      json_writer: false,
      dual_write: false,
      file_current_authority: false,
      offline_mutation: false,
      memory_fallback: false,
    },
  };
}

function readback(ready = true, overrides = {}) {
  const migrations = [{ id: "001_fixture", checksum: H("migration") }];
  return {
    schema_version: "law-firm-os.postgres-migration-catalog-readback.v1",
    migrations,
    migration_count: 1,
    catalog_sha256: H(canonicalizeJson(migrations)),
    tenant_context_authority_ready: ready,
    ...overrides,
  };
}

export {
  CATALOG_READBACK_ACTION,
  CATALOG_READBACK_OPERATION,
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
  LIVE_AUTHORITY,
  LIVE_AUTHORITY_ENVIRONMENT,
  NOW,
  SOURCE_SHA,
  SOURCE_TREE,
  packet,
  readback,
  signedEvent,
};
