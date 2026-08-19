import { createHash } from "node:crypto";

import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalPayload,
} from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import {
  POSTGRES_MIGRATION_CATALOG_READBACK_OUTPUT_CONTRACT_SHA256,
} from "./migration-catalog-readback.js";
import {
  catalogReadbackBytesSha256,
  catalogReadbackCanonicalSnapshot,
} from "./catalog-readback-canonical.js";
import {
  CATALOG_READBACK_PACKET_KEYS as PACKET_KEYS,
  CATALOG_READBACK_SHA1 as SHA1,
  CATALOG_READBACK_TARGET_KEYS as TARGET_KEYS,
  CATALOG_READBACK_TOKEN as TOKEN,
  exactCatalogReadbackAuthorizationKeys as exactKeys,
  failCatalogReadbackAuthorization as fail,
  validateCatalogReadbackArtifact as validateArtifact,
  validateCatalogReadbackOperationBudget as validateBudget,
  validateCatalogReadbackLiveAuthority as validateLiveAuthority,
  validateCatalogReadbackPreState as validatePreState,
  validateCatalogReadbackSourceCatalog as validateSourceCatalog,
  validateCatalogReadbackTask2Inventory as validateTask2Inventory,
} from "./catalog-readback-authorization-fields.js";

export const CATALOG_READBACK_PACKET_SCHEMA_VERSION =
  "law-firm-os.production-migration-catalog-readback-packet.v3";
export const CATALOG_READBACK_ACTION =
  "lawos-production-migration-catalog-readback";
export const CATALOG_READBACK_OPERATION = "catalog.readback";
export const CATALOG_READBACK_ENVIRONMENT = "lawos-production";
export const CATALOG_READBACK_DATA_SCOPE = Object.freeze([
  "migration-ledger-id-checksum-metadata",
  "projection-auditor-authority-readiness",
]);

function sha256(value) {
  return createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : Buffer.from(String(value)))
    .digest("hex");
}

export function validateCatalogReadbackAuthorizationPacket(packet, expected = {}) {
  const snapshot = catalogReadbackCanonicalSnapshot(packet);
  exactKeys(snapshot, PACKET_KEYS, "catalog readback packet");
  if (snapshot.schema_version !== CATALOG_READBACK_PACKET_SCHEMA_VERSION
    || !TOKEN.test(snapshot.packet_id ?? "")
    || !SHA1.test(snapshot.source_sha ?? "")
    || !SHA1.test(snapshot.source_tree ?? "")
    || (expected.sourceSha && snapshot.source_sha !== expected.sourceSha)
    || (expected.sourceTree && snapshot.source_tree !== expected.sourceTree)
    || snapshot.action !== CATALOG_READBACK_ACTION
    || snapshot.operation !== CATALOG_READBACK_OPERATION
    || snapshot.environment !== CATALOG_READBACK_ENVIRONMENT
    || snapshot.output_contract_sha256
      !== POSTGRES_MIGRATION_CATALOG_READBACK_OUTPUT_CONTRACT_SHA256
    || snapshot.rollback_required !== true
    || JSON.stringify(snapshot.data_scope)
      !== JSON.stringify(CATALOG_READBACK_DATA_SCOPE)
    || JSON.stringify(snapshot.contact_scope) !== "[]") {
    fail("LAWOS_CATALOG_READBACK_AUTHORIZATION_CONTRACT", "catalog readback packet is outside its closed contract");
  }
  exactKeys(snapshot.target, TARGET_KEYS, "catalog readback target");
  if (snapshot.target.aws_account !== "770880870480"
    || snapshot.target.aws_region !== "ap-northeast-2"
    || snapshot.target.function_name !== "lawos-production-projection-auditor"
    || snapshot.target.execution_role !== "projection-auditor") {
    fail("LAWOS_CATALOG_READBACK_AUTHORIZATION_TARGET", "catalog readback target is invalid");
  }
  const diagnosticArtifact = validateArtifact(
    snapshot.diagnostic_artifact,
    "diagnostic artifact",
  );
  const rollbackArtifact = validateArtifact(
    snapshot.rollback_artifact,
    "rollback artifact",
  );
  const preState = validatePreState(snapshot.pre_state);
  validateLiveAuthority(snapshot.live_authority);
  validateTask2Inventory(snapshot.task2_inventory);
  if (preState.code_sha256_base64 !== rollbackArtifact.code_sha256_base64) {
    fail("LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING", "rollback artifact does not match pre-deploy code");
  }
  if (diagnosticArtifact.code_sha256_base64
      === rollbackArtifact.code_sha256_base64) {
    fail("LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING", "diagnostic and rollback code must differ");
  }
  validateSourceCatalog(snapshot.source_catalog, {
    migrationCount: expected.sourceCatalogCount,
    catalogSha256: expected.sourceCatalogSha256,
  });
  validateBudget(snapshot.operation_budget);
  const canonical = canonicalizeJson(snapshot);
  return Object.freeze({
    valid: true,
    packet_sha256: sha256(canonical),
    canonical,
    packet: snapshot,
  });
}

export function createCatalogReadbackAuthorizationPacket({
  packetId,
  sourceSha,
  sourceTree,
  diagnosticArtifact,
  rollbackArtifact,
  preState,
  liveAuthority,
  task2Inventory,
  sourceCatalog,
} = {}) {
  const packet = {
    schema_version: CATALOG_READBACK_PACKET_SCHEMA_VERSION,
    packet_id: packetId,
    source_sha: sourceSha,
    source_tree: sourceTree,
    action: CATALOG_READBACK_ACTION,
    operation: CATALOG_READBACK_OPERATION,
    environment: CATALOG_READBACK_ENVIRONMENT,
    target: {
      aws_account: "770880870480",
      aws_region: "ap-northeast-2",
      function_name: "lawos-production-projection-auditor",
      execution_role: "projection-auditor",
    },
    diagnostic_artifact: { ...diagnosticArtifact },
    rollback_artifact: { ...rollbackArtifact },
    pre_state: { ...preState },
    live_authority: { ...liveAuthority },
    task2_inventory: { ...task2Inventory },
    source_catalog: { ...sourceCatalog },
    output_contract_sha256:
      POSTGRES_MIGRATION_CATALOG_READBACK_OUTPUT_CONTRACT_SHA256,
    operation_budget: {
      update_function_code: 2,
      invoke_function: 1,
      update_function_configuration: 0,
      iam_writes: 0,
      secret_writes: 0,
      vpc_writes: 0,
      concurrency_writes: 0,
      database_writes: 0,
    },
    rollback_required: true,
    data_scope: [...CATALOG_READBACK_DATA_SCOPE],
    contact_scope: [],
  };
  const validated = validateCatalogReadbackAuthorizationPacket(packet, {
    sourceSha,
    sourceTree,
    sourceCatalogCount: sourceCatalog?.migration_count,
    sourceCatalogSha256: sourceCatalog?.catalog_sha256,
  });
  return Object.freeze({
    packet: validated.packet,
    packet_sha256: validated.packet_sha256,
    canonical: validated.canonical,
  });
}

export function verifyCatalogReadbackApprovalPayload({
  packet,
  trustRegistryBytes,
  approvalReceiptBytes,
  approvalSignatureBytes,
  expectedRegistrySha256,
  now = Date.now(),
  expected = {},
} = {}) {
  const validated = validateCatalogReadbackAuthorizationPacket(packet, expected);
  const approval = validateRuntimeSafetyApprovalPayload({
    registryBytes: trustRegistryBytes,
    receiptBytes: approvalReceiptBytes,
    signatureBytes: approvalSignatureBytes,
    expectedRegistrySha256,
    expectedRole: "owner",
    expectedAction: CATALOG_READBACK_ACTION,
    expectedEnvironment: CATALOG_READBACK_ENVIRONMENT,
    expectedPacketSha256: validated.packet_sha256,
    expectedSourceSha: validated.packet.source_sha,
    expectedSourceTree: validated.packet.source_tree,
    allowedDataScope: CATALOG_READBACK_DATA_SCOPE,
    allowedContactScope: [],
    now,
  });
  let receipt;
  try {
    receipt = JSON.parse(Buffer.from(approvalReceiptBytes).toString("utf8"));
  } catch {
    fail("LAWOS_CATALOG_READBACK_APPROVAL", "catalog readback approval receipt is invalid");
  }
  if (approval.decision !== "approved"
    || JSON.stringify(receipt.data_scope)
      !== JSON.stringify(CATALOG_READBACK_DATA_SCOPE)
    || JSON.stringify(receipt.contact_scope) !== "[]") {
    fail("LAWOS_CATALOG_READBACK_APPROVAL", "catalog readback approval is not approved for the exact scope");
  }
  return catalogReadbackCanonicalSnapshot({
    valid: true,
    decision: approval.decision,
    approval_id: approval.approval_id,
    signed_at: approval.signed_at,
    expires_at: approval.expires_at,
    registry_sha256: approval.registry_sha256,
    receipt_sha256: approval.receipt_sha256,
    signature_sha256: catalogReadbackBytesSha256(approvalSignatureBytes),
    packet_sha256: validated.packet_sha256,
  });
}

export function catalogReadbackConfirmation(packet, packetSha256) {
  const validated = validateCatalogReadbackAuthorizationPacket(packet);
  if (packetSha256 !== validated.packet_sha256) {
    fail("LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING", "catalog readback packet SHA-256 drifted");
  }
  return `TASK3A-CATALOG-READBACK:${validated.packet.packet_id}:${packetSha256.slice(0, 16)}`;
}
