import {
  hashDomainValue,
} from "../../../packages/persistence/src/domain-ledger.js";
import {
  validateClientOperationsModelRegistry,
} from "./client-operations-model-registry.js";
import {
  CLIENT_OPERATIONS_DOMAIN_ORDER,
  CLIENT_OPERATIONS_READINESS_DOMAIN_ID,
  CLIENT_OPERATIONS_READINESS_KEY,
  createClientOperationsReadinessAttestation,
  readClientOperationsMigrationState,
  validateClientOperationsReadinessEntry,
} from "./client-operations-readiness.js";
import {
  readClientOperationsPostgresSchemaState,
} from "./client-operations-schema.js";
import {
  createClientOperationsMigrationPlan,
  indexClientOperationsSnapshots,
} from "./client-operations-migration-plan.js";

export { createClientOperationsMigrationPlan } from "./client-operations-migration-plan.js";

export {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
  CLIENT_OPERATIONS_MIGRATION_ID_MAP,
  CLIENT_OPERATIONS_OUTLOOK_ASSIGNMENT_AUTHORITY_BINDING,
  CLIENT_OPERATIONS_OUTLOOK_TRUSTED_CURRENT_READ_AUTHORITY_BINDING,
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
  listClientOperationsPostgresMigrations,
  normalizeClientOperationsMigrationCatalog,
  readClientOperationsPostgresSchemaState,
  runClientOperationsPostgresMigrations,
  verifyClientOperationsPostgresMigrations,
} from "./client-operations-schema.js";
export {
  CLIENT_OPERATIONS_FEATURE_FLAG,
  readClientOperationsMigrationReadiness,
  readClientOperationsMigrationState,
} from "./client-operations-readiness.js";
export { selectClientOperationsReadPath } from "./client-operations-read-path.js";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function replayResult({
  byDomain,
  observed,
  migrationSourceSha256,
  schemaState,
}) {
  return Object.freeze({
    results: Object.freeze(
      CLIENT_OPERATIONS_DOMAIN_ORDER.map((domainId) => Object.freeze({
        domain_id: domainId,
        replayed: true,
        source_count: byDomain.get(domainId).records.length,
        snapshot_sha256: byDomain.get(domainId).snapshot_hash,
      })),
    ),
    readback: Object.freeze({
      ...observed,
      verified: true,
      migration_source_sha256: migrationSourceSha256,
      schema_migration_count:
        schemaState.schema_migration_count,
      schema_sha256: schemaState.schema_sha256,
      verification_source: "server_postgres",
      readiness_receipt_replayed: true,
      caller_verification_accepted: false,
    }),
    destructive_rollback_available: false,
    rollback_path:
      "disable client_dashboard_v2 and retain PostgreSQL records",
    production_ready_claim: false,
  });
}

export async function runClientOperationsMigration({
  ledger,
  pool,
  snapshots,
  tenant_id,
} = {}) {
  if (
    !ledger
    || typeof ledger.importSnapshot !== "function"
    || typeof ledger.compareSnapshot !== "function"
    || typeof ledger.list !== "function"
    || typeof ledger.claimIdempotency !== "function"
    || typeof ledger.listIdempotency !== "function"
  ) {
    throw new TypeError("PostgreSQL domain ledger is required");
  }
  const tenantId = requiredText(tenant_id, "tenant_id");
  validateClientOperationsModelRegistry();
  const byDomain = indexClientOperationsSnapshots(snapshots, {
    tenantId,
  });
  const schemaState =
    await readClientOperationsPostgresSchemaState(pool);
  const migrationSourceSha256 = hashDomainValue(
    CLIENT_OPERATIONS_DOMAIN_ORDER.map((domainId) => ({
      domain_id: domainId,
      source_hash: byDomain.get(domainId).source_hash,
      snapshot_hash: byDomain.get(domainId).snapshot_hash,
    })),
  );
  const existingReadinessEntry = (
    await ledger.listIdempotency({
      tenant_id: tenantId,
      domain_id: CLIENT_OPERATIONS_READINESS_DOMAIN_ID,
    })
  ).find(({ key }) => key === CLIENT_OPERATIONS_READINESS_KEY);
  if (existingReadinessEntry) {
    const existingReadiness =
      validateClientOperationsReadinessEntry(
        existingReadinessEntry,
        {
          tenant_id: tenantId,
          schema_state: schemaState,
        },
      );
    if (
      !existingReadiness.valid
      || existingReadiness.attestation.migration_source_sha256
        !== migrationSourceSha256
    ) {
      throw Object.assign(
        new Error(
          "Client operations migration readiness receipt conflicts",
        ),
        {
          code:
            "CLIENT_OPERATIONS_MIGRATION_READINESS_CONFLICT",
        },
      );
    }
    const observed = await readClientOperationsMigrationState({
      ledger,
      tenant_id: tenantId,
    });
    if (
      observed.record_count
        !== existingReadiness.attestation
          .post_migration_record_count
      || observed.state_sha256
        !== existingReadiness.attestation
          .post_migration_state_sha256
    ) {
      throw Object.assign(
        new Error(
          "Client operations migration target changed after attestation",
        ),
        {
          code:
            "CLIENT_OPERATIONS_MIGRATION_TARGET_CHANGED",
        },
      );
    }
    return replayResult({
      byDomain,
      observed,
      migrationSourceSha256,
      schemaState,
    });
  }

  const planned = createClientOperationsMigrationPlan({
    snapshots: [...byDomain.values()],
  }).run();
  const results = [];
  for (const id of planned.executed) {
    const domainId = id
      .replace(/^client_operations_/u, "")
      .replace("_", "-");
    const snapshot = byDomain.get(domainId);
    const imported = await ledger.importSnapshot(snapshot);
    const shadow = await ledger.compareSnapshot(snapshot);
    if (!shadow.comparison.equal) {
      throw Object.assign(
        new Error("Client operations migration readback differs"),
        { code: "CLIENT_OPERATIONS_MIGRATION_READBACK_MISMATCH" },
      );
    }
    results.push(Object.freeze({
      domain_id: domainId,
      replayed: imported.replayed,
      source_count: snapshot.records.length,
      snapshot_sha256: snapshot.snapshot_hash,
    }));
  }
  const observed = await readClientOperationsMigrationState({
    ledger,
    tenant_id: tenantId,
  });
  const attestation = createClientOperationsReadinessAttestation({
    tenant_id: tenantId,
    migration_source_sha256: migrationSourceSha256,
    readback: observed,
    schema_state: schemaState,
  });
  const claimedReadiness = await ledger.claimIdempotency({
    tenant_id: tenantId,
    domain_id: CLIENT_OPERATIONS_READINESS_DOMAIN_ID,
    key: CLIENT_OPERATIONS_READINESS_KEY,
    request_hash: hashDomainValue(attestation),
    response: attestation,
    operation: "client_operations_v2_migration_verified",
  });
  if (
    !validateClientOperationsReadinessEntry(
      claimedReadiness.record,
      {
        tenant_id: tenantId,
        schema_state: schemaState,
      },
    ).valid
  ) {
    throw Object.assign(
      new Error(
        "Client operations migration readiness receipt is invalid",
      ),
      {
        code:
          "CLIENT_OPERATIONS_MIGRATION_READINESS_RECEIPT_INVALID",
      },
    );
  }
  return Object.freeze({
    results: Object.freeze(results),
    readback: Object.freeze({
      ...observed,
      verified: true,
      migration_source_sha256: migrationSourceSha256,
      schema_migration_count:
        schemaState.schema_migration_count,
      schema_sha256: schemaState.schema_sha256,
      verification_source: "server_postgres",
      readiness_receipt_replayed: claimedReadiness.replayed,
      caller_verification_accepted: false,
    }),
    destructive_rollback_available: false,
    rollback_path:
      "disable client_dashboard_v2 and retain PostgreSQL records",
    production_ready_claim: false,
  });
}
