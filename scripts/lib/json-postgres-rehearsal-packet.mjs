import {
  createJsonPostgresExecutionPacket,
  JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS,
} from "../../packages/persistence/src/postgres/execution-contract.js";
import {
  prepareJsonPostgresDmsObjectManifest,
} from "../../packages/dms/src/json-postgres-dms-migration.js";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "../../packages/persistence/src/postgres/source-authority-manifest.js";
import {
  validateJsonPostgresRecordTypeCatalog,
} from "../../packages/persistence/src/postgres/record-type-catalog.js";
import {
  validateJsonPostgresRecordAuthorityBinding,
} from "../../packages/persistence/src/postgres/source-adjudication.js";
import {
  validateJsonPostgresSourceTransformResult,
} from "../../apps/api/src/json-postgres-source-transform.js";
import {
  validateJsonPostgresPostWriteRunbookContract,
  validateJsonPostgresRehearsalBackupRetentionContract,
  validateJsonPostgresRehearsalDmsProviderContract,
  validateJsonPostgresRehearsalMigrationCatalog,
  validateJsonPostgresRehearsalPerformanceBudget,
} from "./json-postgres-rehearsal-contracts.mjs";
import {
  jsonPostgresRehearsalCombinedTemplateSha256,
  validateJsonPostgresRehearsalArtifactStoreTemplate,
  validateJsonPostgresRehearsalTemplate,
} from "./json-postgres-rehearsal-infrastructure.mjs";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const ZERO = "0".repeat(64);
const COMPUTED_BINDINGS = new Set([
  "artifact_sha256",
  "artifact_manifest_sha256",
  "lockfile_sha256",
]);

function fail(message) {
  throw new Error(message);
}

function exactDigest(value, label) {
  if (!SHA256.test(value ?? "")) fail(`${label} is not a SHA-256 digest`);
  return value;
}

export function createJsonPostgresRehearsalPacketInput({
  packetId,
  sourceSha,
  sourceTree,
  target,
  inventory,
  recordAuthority,
  recordTypeCatalog,
  fieldCrosswalk,
  authorityManifest,
  authoritySummary,
  corpus,
  sourceTransformResult,
  dmsManifest,
  dmsClassification,
  artifactStoreTemplate,
  infrastructureTemplate,
  migrationCatalog,
  dmsProviderContract,
  backupRetentionContract,
  performanceBudget,
  postWriteRunbook,
} = {}) {
  if (!SHA1.test(sourceSha ?? "") || !SHA1.test(sourceTree ?? "")) {
    fail("W12 packet source SHA/tree is invalid");
  }
  validateJsonPostgresRecordAuthorityBinding(recordAuthority, { inventory });
  validateJsonPostgresRecordTypeCatalog(recordTypeCatalog);
  validateJsonPostgresSourceTransformResult(sourceTransformResult);
  const dms = prepareJsonPostgresDmsObjectManifest(dmsManifest);
  validateJsonPostgresRehearsalArtifactStoreTemplate(artifactStoreTemplate);
  validateJsonPostgresRehearsalTemplate(infrastructureTemplate);
  const combinedInfrastructureSha256 =
    jsonPostgresRehearsalCombinedTemplateSha256({
      artifactStoreTemplate,
      rehearsalTemplate: infrastructureTemplate,
    });
  const migration = validateJsonPostgresRehearsalMigrationCatalog(
    migrationCatalog,
  );
  const provider = validateJsonPostgresRehearsalDmsProviderContract(
    dmsProviderContract,
  );
  const retention = validateJsonPostgresRehearsalBackupRetentionContract(
    backupRetentionContract,
  );
  const performance = validateJsonPostgresRehearsalPerformanceBudget(
    performanceBudget,
  );
  const runbook = validateJsonPostgresPostWriteRunbookContract(
    postWriteRunbook,
  );
  if (authoritySummary?.source_sha !== sourceSha
    || authoritySummary?.source_tree !== sourceTree
    || authoritySummary.outcome !== "READY_FOR_OWNER_SIGNATURE"
    || authoritySummary.ready_for_owner_signature !== true
    || authoritySummary.inventory_content_sha256
      !== inventory.inventory_content_sha256
    || authoritySummary.record_authority_sha256
      !== recordAuthority.authority_sha256
    || authoritySummary.record_type_catalog_sha256
      !== recordTypeCatalog.catalog_sha256
    || authoritySummary.field_crosswalk_sha256
      !== fieldCrosswalk.field_crosswalk_sha256
    || authoritySummary.authority_manifest_sha256
      !== authorityManifest.manifest_sha256
    || authoritySummary.migration_manifest_sha256
      !== corpus.manifest_sha256
    || authoritySummary.transform_sha256
      !== sourceTransformResult.result_sha256
    || sourceTransformResult.migration_manifest_sha256
      !== corpus.manifest_sha256) {
    fail("W12 authority bundle binding drifted");
  }
  if (dms.authority_manifest_sha256 !== authorityManifest.manifest_sha256
    || dms.retention_contract_sha256 !== retention.contract_sha256
    || dmsClassification?.manifest_sha256 !== dms.manifest_sha256
    || dmsClassification?.unclassified_file_object_count !== 0
    || dmsClassification?.document_bytes_in_evidence !== false) {
    fail("W12 DMS manifest or classification drifted");
  }
  const bindings = {
    artifact_sha256: "a".repeat(64),
    artifact_manifest_sha256: "b".repeat(64),
    lockfile_sha256: "c".repeat(64),
    migration_catalog_sha256: migration.catalog_sha256,
    record_type_catalog_sha256: recordTypeCatalog.catalog_sha256,
    record_authority_sha256: recordAuthority.authority_sha256,
    field_crosswalk_sha256: fieldCrosswalk.field_crosswalk_sha256,
    authority_manifest_sha256: authorityManifest.manifest_sha256,
    authority_bundle_sha256: exactDigest(
      authoritySummary.bundle_sha256,
      "authority bundle digest",
    ),
    migration_manifest_sha256: corpus.manifest_sha256,
    dms_object_manifest_sha256: dms.manifest_sha256,
    inventory_content_sha256: inventory.inventory_content_sha256,
    inventory_delta_policy_sha256:
      JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
    transform_sha256: sourceTransformResult.result_sha256,
    infrastructure_template_sha256: combinedInfrastructureSha256,
    dms_provider_contract_sha256: provider.contract_sha256,
    backup_retention_contract_sha256: retention.contract_sha256,
    performance_acceptance_sha256: performance.budget_sha256,
    post_write_runbook_sha256: runbook.contract_sha256,
    w12_terminal_receipt_sha256: ZERO,
    cut012_terminal_receipt_sha256: ZERO,
    go_live_receipt_sha256: ZERO,
  };
  if (JSON.stringify(Object.keys(bindings).sort())
      !== JSON.stringify([...JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS].sort())) {
    fail("W12 execution binding set is incomplete");
  }
  createJsonPostgresExecutionPacket({
    packetId,
    sourceSha,
    sourceTree,
    phase: "w12-real-data-rehearsal",
    bindings,
    target,
  });
  return Object.freeze({
    schema_version: "law-firm-os.json-postgres-execution-packet-input.v1",
    packet_id: packetId,
    phase: "w12-real-data-rehearsal",
    binding_sha256: Object.freeze(Object.fromEntries(
      Object.entries(bindings).filter(([key]) => !COMPUTED_BINDINGS.has(key)),
    )),
    target: Object.freeze(structuredClone(target)),
  });
}
