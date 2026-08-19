import {
  catalogReadbackConfirmation,
  validateCatalogReadbackAuthorizationPacket,
} from "../../packages/persistence/src/postgres/catalog-readback-authorization.js";
import {
  catalogReadbackApprovalBinding,
  createCatalogReadbackLineage,
} from "../../packages/persistence/src/postgres/catalog-readback-lineage.js";
import {
  validateCatalogReadbackPreflightReceipt,
} from "../../packages/persistence/src/postgres/catalog-readback-receipts.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  normalizeClientOperationsMigrationCatalog,
} from "../../apps/api/src/client-operations-schema.js";
import {
  task3Fail as fail,
  task3RequiredBuffer as requiredBuffer,
  task3ValidateBoundBytes as validateBoundBytes,
} from "./production-catalog-readback-common.mjs";
import {
  validateExecutionInput,
  validateInvokeEvent,
} from "./production-catalog-readback-input.mjs";
import {
  requireAwsPort,
} from "./production-catalog-readback-state.mjs";
import {
  readAndValidateTask2CatalogReadbackInventory,
  validateTask2InventoryFresh,
} from "./production-catalog-readback-task2-inventory.mjs";

const SOURCE_MIGRATION_CATALOG =
  normalizeClientOperationsMigrationCatalog(
    CLIENT_OPERATIONS_MIGRATION_CATALOG,
  );
const EXPECTED_CATALOG = Object.freeze({
  sourceCatalogCount:
    SOURCE_MIGRATION_CATALOG.migration_catalog_count,
  sourceCatalogSha256:
    SOURCE_MIGRATION_CATALOG.migration_catalog_sha256,
});

export async function authorizeProductionCatalogReadbackExecution(
  input,
  {
    requestedAws,
    readInventoryEvidence,
    now = Date.now,
    verifyExecutionAuthorization,
  } = {},
) {
  const execution = validateExecutionInput(input);
  const aws = requireAwsPort(requestedAws);
  const validatedPacket = validateCatalogReadbackAuthorizationPacket(
    execution.authorization.packet,
    EXPECTED_CATALOG,
  );
  const packet = validatedPacket.packet;
  const preflightReceipt = validateCatalogReadbackPreflightReceipt(
    execution.preflightReceipt,
    {
      packetSha256: validatedPacket.packet_sha256,
      sourceSha: packet.source_sha,
      sourceTree: packet.source_tree,
    },
  );
  if (execution.authorization.packet_sha256
      !== validatedPacket.packet_sha256
    || execution.confirmation
      !== catalogReadbackConfirmation(packet, validatedPacket.packet_sha256)) {
    fail("TASK3_EXECUTION_AUTHORIZATION_DRIFT", "catalog readback execution authorization drifted");
  }
  validateBoundBytes(
    requiredBuffer(execution.diagnosticZip, "diagnostic ZIP"),
    packet.diagnostic_artifact,
    "diagnostic ZIP",
  );
  validateBoundBytes(
    requiredBuffer(execution.rollbackZip, "rollback ZIP"),
    packet.rollback_artifact,
    "rollback ZIP",
  );
  const invokeEvent = validateInvokeEvent(
    execution.event,
    packet,
    preflightReceipt.receipt_sha256,
  );
  if (typeof verifyExecutionAuthorization !== "function") {
    fail(
      "TASK3_EXECUTION_AUTHORIZATION_VERIFIER_REQUIRED",
      "execution authorization verifier port is required",
    );
  }
  const verifiedExecution = await verifyExecutionAuthorization({
    authorization: execution.authorization,
    event: invokeEvent,
    preflightReceipt,
  });
  const approvalBinding = catalogReadbackApprovalBinding({
    approval: verifiedExecution,
    authorization: invokeEvent.authorization,
    packetSha256: validatedPacket.packet_sha256,
  });
  const task2Inventory = await readAndValidateTask2CatalogReadbackInventory({
    descriptor: execution.task2Inventory,
    packet,
    readInventoryEvidence,
  });
  validateTask2InventoryFresh(
    task2Inventory.binding,
    approvalBinding,
    now(),
  );
  const revalidatedPacket = validateCatalogReadbackAuthorizationPacket(
    packet,
    EXPECTED_CATALOG,
  );
  const lineage = createCatalogReadbackLineage({
    packet: revalidatedPacket.packet,
    packetSha256: revalidatedPacket.packet_sha256,
    approval: approvalBinding,
  });
  validateCatalogReadbackPreflightReceipt(preflightReceipt, {
    packet: revalidatedPacket.packet,
    packetSha256: revalidatedPacket.packet_sha256,
    approval: approvalBinding,
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
  });
  if (revalidatedPacket.packet_sha256 !== validatedPacket.packet_sha256
    || canonicalizeJson(lineage)
      !== canonicalizeJson(preflightReceipt.lineage)) {
    fail("TASK3_EXECUTION_AUTHORIZATION_DRIFT", "catalog readback lineage changed during verification");
  }
  return Object.freeze({
    execution,
    aws,
    packet,
    validatedPacket,
    preflightReceipt,
    invokeEvent,
    approvalBinding,
    lineage,
  });
}
