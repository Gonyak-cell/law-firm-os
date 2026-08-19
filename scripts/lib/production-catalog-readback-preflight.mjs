import {
  validateCatalogReadbackAuthorizationPacket,
} from "../../packages/persistence/src/postgres/catalog-readback-authorization.js";
import {
  catalogReadbackCanonicalSnapshot,
} from "../../packages/persistence/src/postgres/catalog-readback-canonical.js";
import {
  catalogReadbackApprovalBinding,
  createCatalogReadbackLineage,
} from "../../packages/persistence/src/postgres/catalog-readback-lineage.js";
import {
  createCatalogReadbackPreflightReceipt,
} from "../../packages/persistence/src/postgres/catalog-readback-receipts.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  normalizeClientOperationsMigrationCatalog,
} from "../../apps/api/src/client-operations-schema.js";
import {
  TASK3_SHA1,
  task3ExactKeys,
  task3Fail,
  task3Sha256,
} from "./production-catalog-readback-common.mjs";
import {
  readAndVerifyCatalogReadbackArtifacts,
} from "./production-catalog-readback-artifacts.mjs";
import {
  readAndValidateTask2CatalogReadbackInventory,
  validateTask2InventoryFresh,
} from "./production-catalog-readback-task2-inventory.mjs";

const PREFLIGHT_INPUT_KEYS = Object.freeze([
  "packet",
  "packetSha256",
  "authorization",
  "artifacts",
  "task2Inventory",
]);
const PREFLIGHT_ARTIFACT_KEYS = Object.freeze([
  "diagnostic",
  "rollback",
]);
const SOURCE_MIGRATION_CATALOG =
  normalizeClientOperationsMigrationCatalog(
    CLIENT_OPERATIONS_MIGRATION_CATALOG,
  );

export async function validateProductionCatalogReadbackPreflight(input = {}, {
  readPrivateArtifact,
  readInventoryEvidence,
  now = Date.now,
  verifyApproval,
  verifySourceEnvelope,
  verifyRollbackManifest,
} = {}) {
  const snapshot = catalogReadbackCanonicalSnapshot(input);
  task3ExactKeys(
    snapshot,
    PREFLIGHT_INPUT_KEYS,
    "TASK3_PREFLIGHT_INPUT_INVALID",
    "catalog readback preflight input",
  );
  task3ExactKeys(
    snapshot.artifacts,
    PREFLIGHT_ARTIFACT_KEYS,
    "TASK3_PREFLIGHT_INPUT_INVALID",
    "catalog readback preflight artifacts",
  );
  if (typeof readPrivateArtifact !== "function") {
    task3Fail(
      "TASK3_SECURE_ARTIFACT_READER_REQUIRED",
      "Task 2 secure private-artifact reader is required",
    );
  }
  if (typeof verifyApproval !== "function"
    || typeof verifySourceEnvelope !== "function"
    || typeof verifyRollbackManifest !== "function") {
    task3Fail(
      "TASK3_VERIFIER_PORT_REQUIRED",
      "source envelope, approval, and rollback manifest verifier ports are required",
    );
  }
  const validatedPacket = validateCatalogReadbackAuthorizationPacket(
    snapshot.packet,
    {
      sourceCatalogCount:
        SOURCE_MIGRATION_CATALOG.migration_catalog_count,
      sourceCatalogSha256:
        SOURCE_MIGRATION_CATALOG.migration_catalog_sha256,
    },
  );
  if (snapshot.packetSha256 !== validatedPacket.packet_sha256) {
    task3Fail("TASK3_PACKET_BINDING_DRIFT", "catalog readback packet SHA-256 drifted");
  }
  const source = catalogReadbackCanonicalSnapshot(await verifySourceEnvelope(
    catalogReadbackCanonicalSnapshot({
      sourceSha: validatedPacket.packet.source_sha,
      sourceTree: validatedPacket.packet.source_tree,
    }),
  ));
  task3ExactKeys(
    source,
    ["source_sha", "source_tree", "source_envelope_sha256"],
    "TASK3_SOURCE_ENVELOPE_DRIFT",
    "verified source envelope",
  );
  if (!source || source.source_sha !== validatedPacket.packet.source_sha
    || source.source_tree !== validatedPacket.packet.source_tree
    || !TASK3_SHA1.test(source.source_sha ?? "")
    || !TASK3_SHA1.test(source.source_tree ?? "")
    || !/^[a-f0-9]{64}$/u.test(source.source_envelope_sha256 ?? "")) {
    task3Fail("TASK3_SOURCE_ENVELOPE_DRIFT", "source envelope drifted");
  }
  const task2Inventory = await readAndValidateTask2CatalogReadbackInventory({
    descriptor: snapshot.task2Inventory,
    packet: validatedPacket.packet,
    artifacts: snapshot.artifacts,
    readInventoryEvidence,
  });
  const approval = await verifyApproval({
    packet: validatedPacket.packet,
    packetSha256: validatedPacket.packet_sha256,
    authorization: snapshot.authorization,
  });
  const approvalBinding = catalogReadbackApprovalBinding({
    approval,
    authorization: snapshot.authorization,
    packetSha256: validatedPacket.packet_sha256,
  });
  validateTask2InventoryFresh(
    task2Inventory.binding,
    approvalBinding,
    now(),
  );
  const revalidatedPacket = validateCatalogReadbackAuthorizationPacket(
    validatedPacket.packet,
    {
      sourceCatalogCount:
        SOURCE_MIGRATION_CATALOG.migration_catalog_count,
      sourceCatalogSha256:
        SOURCE_MIGRATION_CATALOG.migration_catalog_sha256,
    },
  );
  if (revalidatedPacket.packet_sha256 !== validatedPacket.packet_sha256) {
    task3Fail("TASK3_PACKET_BINDING_DRIFT", "catalog readback packet changed during verification");
  }
  const { diagnosticBytes, rollbackBytes } =
    await readAndVerifyCatalogReadbackArtifacts({
      artifacts: snapshot.artifacts,
      packet: validatedPacket.packet,
      readPrivateArtifact,
      verifyRollbackManifest,
    });
  if (task3Sha256(diagnosticBytes)
      !== validatedPacket.packet.diagnostic_artifact.sha256
    || task3Sha256(rollbackBytes)
      !== validatedPacket.packet.rollback_artifact.sha256) {
    task3Fail("TASK3_ARTIFACT_BINDING_DRIFT", "artifact bytes changed after verification");
  }
  return createCatalogReadbackPreflightReceipt({
    lineage: createCatalogReadbackLineage({
      packet: validatedPacket.packet,
      packetSha256: validatedPacket.packet_sha256,
      approval: approvalBinding,
    }),
    sourceEnvelopeSha256: source.source_envelope_sha256,
    validateLocator: task2Inventory.validateLocator,
  });
}
