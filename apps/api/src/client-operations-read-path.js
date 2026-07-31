import {
  CLIENT_OPERATIONS_FEATURE_FLAG,
  readClientOperationsMigrationReadiness,
} from "./client-operations-readiness.js";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

export async function selectClientOperationsReadPath({
  enabled = false,
  ledger,
  pool,
  tenant_id,
} = {}) {
  if (enabled !== true) {
    return Object.freeze({
      feature_flag: CLIENT_OPERATIONS_FEATURE_FLAG,
      active: false,
      read_path: "legacy-client-v1",
      reason: "feature_flag_disabled",
      postgres_records_preserved: true,
      destructive_rollback: false,
      production_ready_claim: false,
      verification_source: "not_evaluated",
      caller_verification_accepted: false,
      authoritative_readback: null,
    });
  }
  const tenantId = requiredText(tenant_id, "tenant_id");
  let readback;
  try {
    readback = await readClientOperationsMigrationReadiness({
      ledger,
      pool,
      tenant_id: tenantId,
    });
  } catch (error) {
    const schemaFailure = [
      "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
      "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH",
    ].includes(error?.code);
    return Object.freeze({
      feature_flag: CLIENT_OPERATIONS_FEATURE_FLAG,
      active: false,
      read_path: "legacy-client-v1",
      reason: schemaFailure
        ? "postgres_schema_verification_failed"
        : "postgres_readback_unavailable",
      postgres_records_preserved: true,
      destructive_rollback: false,
      production_ready_claim: false,
      verification_source: "server_postgres",
      caller_verification_accepted: false,
      authoritative_readback: null,
    });
  }
  const active = readback.verified === true;
  return Object.freeze({
    feature_flag: CLIENT_OPERATIONS_FEATURE_FLAG,
    active,
    read_path: active
      ? "client-operations-v2"
      : "legacy-client-v1",
    reason: active
      ? "postgres_readback_verified"
      : readback.readiness_reason,
    postgres_records_preserved: true,
    destructive_rollback: false,
    production_ready_claim: false,
    verification_source: "server_postgres",
    caller_verification_accepted: false,
    authoritative_readback: readback,
  });
}
