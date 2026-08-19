import { hashDomainValue } from "../domain-ledger.js";

export const POSTGRES_MIGRATION_CATALOG_READBACK_SCHEMA_VERSION =
  "law-firm-os.postgres-migration-catalog-readback.v1";
export const POSTGRES_MIGRATION_CATALOG_READBACK_DATABASE_ROLE =
  "lawos_hrx_projection_auditor";
export const POSTGRES_MIGRATION_CATALOG_READBACK_ROLE_SQL =
  "SELECT current_user::text AS database_role, lawos_security.tenant_context_authority_ready() AS tenant_context_authority_ready";
export const POSTGRES_MIGRATION_CATALOG_READBACK_ROWS_SQL =
  "SELECT migration_id, checksum FROM lawos_meta.schema_migrations ORDER BY migration_id";

const TOP_LEVEL_KEYS = Object.freeze([
  "schema_version",
  "migrations",
  "migration_count",
  "catalog_sha256",
  "tenant_context_authority_ready",
]);
const ROW_KEYS = Object.freeze(["id", "checksum"]);
const ROLE_ROW_KEYS = Object.freeze([
  "database_role",
  "tenant_context_authority_ready",
]);
const MIGRATION_ID = /^[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

export const POSTGRES_MIGRATION_CATALOG_READBACK_OUTPUT_CONTRACT_SHA256 =
  hashDomainValue({
    schema_version: POSTGRES_MIGRATION_CATALOG_READBACK_SCHEMA_VERSION,
    top_level_keys: TOP_LEVEL_KEYS,
    migration_row_keys: ROW_KEYS,
    migration_id: "strictly-ascending-unique-lowercase-token",
    checksum: "lowercase-sha256",
    catalog_sha256: "hashDomainValue(migrations)",
    readiness: "boolean-observation",
  });

function fail(code, message) {
  throw Object.assign(new Error(message), {
    code,
    safe_error_code: code.replace(/^LAWOS_/u, ""),
  });
}

function exactKeys(value, keys, code, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail(code, `${label} fields are invalid`);
  }
}

function databaseFailure() {
  return Object.assign(
    new Error("PostgreSQL migration catalog readback failed"),
    {
      code: "LAWOS_CATALOG_READBACK_DATABASE",
      safe_error_code: "CATALOG_READBACK_DATABASE_FAILED",
    },
  );
}

function validateRoleObservation(result) {
  if (!result || !Array.isArray(result.rows) || result.rows.length !== 1) {
    fail(
      "LAWOS_CATALOG_READBACK_DATABASE_ROLE",
      "projection-auditor database role observation is invalid",
    );
  }
  const row = result.rows[0];
  exactKeys(
    row,
    ROLE_ROW_KEYS,
    "LAWOS_CATALOG_READBACK_DATABASE_ROLE",
    "projection-auditor role observation",
  );
  if (row.database_role !== POSTGRES_MIGRATION_CATALOG_READBACK_DATABASE_ROLE
    || typeof row.tenant_context_authority_ready !== "boolean") {
    fail(
      "LAWOS_CATALOG_READBACK_DATABASE_ROLE",
      "projection-auditor database role observation is invalid",
    );
  }
  return row.tenant_context_authority_ready;
}

function freezeReadback(value) {
  return Object.freeze({
    ...value,
    migrations: Object.freeze(
      value.migrations.map((row) => Object.freeze({ ...row })),
    ),
  });
}

export function validatePostgresMigrationCatalogReadback(value) {
  exactKeys(
    value,
    TOP_LEVEL_KEYS,
    "LAWOS_CATALOG_READBACK_SCHEMA",
    "migration catalog readback",
  );
  if (value.schema_version !== POSTGRES_MIGRATION_CATALOG_READBACK_SCHEMA_VERSION
    || !Array.isArray(value.migrations)
    || !Number.isSafeInteger(value.migration_count)
    || value.migration_count < 0
    || value.migration_count !== value.migrations.length
    || typeof value.tenant_context_authority_ready !== "boolean") {
    fail(
      "LAWOS_CATALOG_READBACK_SCHEMA",
      "migration catalog readback is invalid",
    );
  }
  let previous = null;
  for (const migration of value.migrations) {
    exactKeys(
      migration,
      ROW_KEYS,
      "LAWOS_CATALOG_READBACK_SCHEMA",
      "migration catalog row",
    );
    if (!MIGRATION_ID.test(migration.id ?? "")
      || !SHA256.test(migration.checksum ?? "")
      || (previous !== null && previous >= migration.id)) {
      fail(
        "LAWOS_CATALOG_READBACK_SCHEMA",
        "migration catalog rows are invalid",
      );
    }
    previous = migration.id;
  }
  if (!SHA256.test(value.catalog_sha256 ?? "")
    || value.catalog_sha256 !== hashDomainValue(value.migrations)) {
    fail(
      "LAWOS_CATALOG_READBACK_SCHEMA",
      "migration catalog digest is invalid",
    );
  }
  return freezeReadback(value);
}

export async function readPostgresMigrationCatalogReadback(pool) {
  if (arguments.length !== 1
    || !pool
    || typeof pool.query !== "function") {
    fail(
      "LAWOS_CATALOG_READBACK_INPUT",
      "catalog readback accepts one PostgreSQL pool and no query input",
    );
  }
  let roleResult;
  try {
    roleResult = await pool.query(
      POSTGRES_MIGRATION_CATALOG_READBACK_ROLE_SQL,
    );
  } catch {
    throw databaseFailure();
  }
  const readiness = validateRoleObservation(roleResult);
  let ledgerResult;
  try {
    ledgerResult = await pool.query(
      POSTGRES_MIGRATION_CATALOG_READBACK_ROWS_SQL,
    );
  } catch {
    throw databaseFailure();
  }
  if (!ledgerResult || !Array.isArray(ledgerResult.rows)) {
    fail(
      "LAWOS_CATALOG_READBACK_SCHEMA",
      "migration catalog database result is invalid",
    );
  }
  const migrations = ledgerResult.rows.map((row) => ({
    id: row?.migration_id,
    checksum: row?.checksum,
  }));
  return validatePostgresMigrationCatalogReadback({
    schema_version: POSTGRES_MIGRATION_CATALOG_READBACK_SCHEMA_VERSION,
    migrations,
    migration_count: migrations.length,
    catalog_sha256: hashDomainValue(migrations),
    tenant_context_authority_ready: readiness,
  });
}
