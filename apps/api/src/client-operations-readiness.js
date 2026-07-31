import {
  hashDomainValue,
} from "../../../packages/persistence/src/domain-ledger.js";
import {
  CLIENT_OPERATIONS_MODEL_REGISTRY,
  validateClientOperationsModelRegistry,
} from "./client-operations-model-registry.js";
import {
  readClientOperationsPostgresSchemaState,
} from "./client-operations-schema.js";

export const CLIENT_OPERATIONS_FEATURE_FLAG = "client_dashboard_v2";
export const CLIENT_OPERATIONS_DOMAIN_ORDER =
  Object.freeze(["crm", "finance", "email-dms"]);
export const CLIENT_OPERATIONS_READINESS_DOMAIN_ID = "analytics";
export const CLIENT_OPERATIONS_READINESS_KEY =
  "client_operations_v2_schema_bound_readiness";

const READINESS_SCHEMA_VERSION =
  "law-firm-os.client-operations-migration-readiness.v2";
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

export async function readClientOperationsMigrationState({
  ledger,
  tenant_id,
} = {}) {
  if (!ledger || typeof ledger.list !== "function") {
    throw new TypeError("PostgreSQL domain ledger is required");
  }
  const tenantId = requiredText(tenant_id, "tenant_id");
  validateClientOperationsModelRegistry();
  const recordsByDomain = new Map(await Promise.all(
    CLIENT_OPERATIONS_DOMAIN_ORDER.map(async (domainId) => [
      domainId,
      await ledger.list({
        tenant_id: tenantId,
        domain_id: domainId,
      }),
    ]),
  ));
  const models = Object.freeze(
    CLIENT_OPERATIONS_MODEL_REGISTRY.entries.map(
      ({ domain_id, model_type }) => {
        const records = recordsByDomain.get(domain_id)
          .filter((record) => record.record_type === model_type)
          .map((record) => ({
            record_id: record.record_id,
            state_version: record.state_version,
            payload_hash: record.payload_hash,
          }));
        return Object.freeze({
          domain_id,
          model_type,
          count: records.length,
          digest: hashDomainValue(records),
        });
      },
    ),
  );
  return Object.freeze({
    verified: false,
    model_count: models.length,
    record_count: models.reduce(
      (total, model) => total + model.count,
      0,
    ),
    registry_sha256:
      CLIENT_OPERATIONS_MODEL_REGISTRY.registry_sha256,
    models,
    state_sha256: hashDomainValue(models),
    production_ready_claim: false,
  });
}

export function createClientOperationsReadinessAttestation({
  tenant_id,
  migration_source_sha256,
  readback,
  schema_state,
} = {}) {
  return Object.freeze({
    schema_version: READINESS_SCHEMA_VERSION,
    feature_flag: CLIENT_OPERATIONS_FEATURE_FLAG,
    tenant_id: requiredText(tenant_id, "tenant_id"),
    model_count: readback.model_count,
    registry_sha256: readback.registry_sha256,
    post_migration_record_count: readback.record_count,
    post_migration_state_sha256: readback.state_sha256,
    migration_source_sha256,
    schema_migration_count:
      schema_state.schema_migration_count,
    schema_sha256: schema_state.schema_sha256,
    production_ready_claim: false,
  });
}

export function validateClientOperationsReadinessEntry(
  entry,
  { tenant_id, schema_state } = {},
) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  const attestation = entry?.response;
  const valid = (
    entry?.key === CLIENT_OPERATIONS_READINESS_KEY
    && attestation?.schema_version === READINESS_SCHEMA_VERSION
    && attestation?.feature_flag === CLIENT_OPERATIONS_FEATURE_FLAG
    && attestation?.tenant_id === tenantId
    && attestation?.model_count
      === CLIENT_OPERATIONS_MODEL_REGISTRY.model_count
    && attestation?.registry_sha256
      === CLIENT_OPERATIONS_MODEL_REGISTRY.registry_sha256
    && Number.isSafeInteger(
      attestation?.post_migration_record_count,
    )
    && attestation.post_migration_record_count >= 0
    && SHA256_PATTERN.test(
      attestation?.post_migration_state_sha256 ?? "",
    )
    && SHA256_PATTERN.test(
      attestation?.migration_source_sha256 ?? "",
    )
    && attestation?.schema_migration_count
      === schema_state?.schema_migration_count
    && attestation?.schema_sha256 === schema_state?.schema_sha256
    && attestation?.production_ready_claim === false
    && entry?.request_hash === hashDomainValue(attestation)
  );
  return Object.freeze({
    valid,
    attestation: valid ? attestation : null,
  });
}

export async function readClientOperationsMigrationReadiness({
  ledger,
  pool,
  tenant_id,
} = {}) {
  if (!ledger || typeof ledger.listIdempotency !== "function") {
    throw new TypeError("PostgreSQL domain ledger is required");
  }
  const tenantId = requiredText(tenant_id, "tenant_id");
  const [observed, schemaState, idempotencyEntries] =
    await Promise.all([
      readClientOperationsMigrationState({
        ledger,
        tenant_id: tenantId,
      }),
      readClientOperationsPostgresSchemaState(pool),
      ledger.listIdempotency({
        tenant_id: tenantId,
        domain_id: CLIENT_OPERATIONS_READINESS_DOMAIN_ID,
      }),
    ]);
  const entry = idempotencyEntries.find(
    ({ key }) => key === CLIENT_OPERATIONS_READINESS_KEY,
  );
  const readiness = validateClientOperationsReadinessEntry(
    entry,
    {
      tenant_id: tenantId,
      schema_state: schemaState,
    },
  );
  const currentMatchesAttestation = (
    readiness.valid
    && observed.record_count
      === readiness.attestation.post_migration_record_count
    && observed.state_sha256
      === readiness.attestation.post_migration_state_sha256
  );
  return Object.freeze({
    ...observed,
    verified: readiness.valid && currentMatchesAttestation,
    verification_source: "server_postgres",
    readiness_reason: currentMatchesAttestation
      ? "postgres_migration_attested"
      : readiness.valid
        ? "postgres_migration_attestation_stale"
        : entry
          ? "postgres_migration_attestation_invalid"
          : "postgres_migration_attestation_missing",
    migration_source_sha256:
      readiness.attestation?.migration_source_sha256 ?? null,
    attested_post_migration_record_count:
      readiness.attestation?.post_migration_record_count ?? null,
    attested_post_migration_state_sha256:
      readiness.attestation?.post_migration_state_sha256 ?? null,
    schema_migration_count:
      schemaState.schema_migration_count,
    schema_sha256: schemaState.schema_sha256,
    caller_verification_accepted: false,
  });
}
