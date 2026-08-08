import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import {
  checksumPostgresMigration,
  listPostgresFoundationMigrations,
} from "../../../packages/persistence/src/postgres/migration-catalog.js";
import {
  runPostgresMigrations,
  verifyPostgresMigrationState,
} from "../../../packages/persistence/src/postgres/migration-runner.js";
import {
  listHrxPostgresMigrations,
} from "../../../packages/hrx/src/postgres-migrations.js";
import {
  listEmailDmsPostgresMigrations,
} from "../../../packages/email-dms/src/migrations/index.js";

export const CLIENT_OPERATIONS_MIGRATION_ID_MAP = Object.freeze({
  "001_m365_connection": "300_client_m365_connection",
  "002_inquiry_evidence": "301_client_inquiry_evidence",
  "003_email_filing_correction": "302_client_email_filing_correction",
  "004_outlook_conversation_sync": "303_client_outlook_conversation_sync",
});

function clientSchemaMigrations() {
  const source = listEmailDmsPostgresMigrations();
  const expectedIds = Object.keys(
    CLIENT_OPERATIONS_MIGRATION_ID_MAP,
  ).sort();
  const actualIds = source.map(({ id }) => id).sort();
  if (
    actualIds.length !== expectedIds.length
    || actualIds.some((id, index) => id !== expectedIds[index])
  ) {
    throw new Error(
      "Client operations PostgreSQL migration mapping is incomplete",
    );
  }
  return source.map((migration) => Object.freeze({
    ...migration,
    id: CLIENT_OPERATIONS_MIGRATION_ID_MAP[migration.id],
    source_migration_id: migration.id,
  }));
}

const OPERATIONAL_MIGRATIONS = Object.freeze([
  ...listPostgresFoundationMigrations(),
  ...listHrxPostgresMigrations(),
  ...clientSchemaMigrations(),
]);

const SCHEMA_ENTRIES = Object.freeze(
  OPERATIONAL_MIGRATIONS.map(({ id, sql }) => Object.freeze({
    id,
    checksum: checksumPostgresMigration(sql),
  })),
);

export const CLIENT_OPERATIONS_SCHEMA_MANIFEST = Object.freeze({
  schema_migration_count: SCHEMA_ENTRIES.length,
  client_schema_migration_count:
    Object.keys(CLIENT_OPERATIONS_MIGRATION_ID_MAP).length,
  entries: SCHEMA_ENTRIES,
  schema_sha256: hashDomainValue(SCHEMA_ENTRIES),
});

export function listClientOperationsPostgresMigrations() {
  return OPERATIONAL_MIGRATIONS;
}

export function runClientOperationsPostgresMigrations(
  pool,
  { appliedBy = "client-operations-migration" } = {},
) {
  return runPostgresMigrations(pool, {
    migrations: OPERATIONAL_MIGRATIONS,
    appliedBy,
  });
}

export function verifyClientOperationsPostgresMigrations(pool) {
  return verifyPostgresMigrationState(pool, {
    migrations: OPERATIONAL_MIGRATIONS,
  });
}

export async function readClientOperationsPostgresSchemaState(pool) {
  const verified = await verifyClientOperationsPostgresMigrations(pool);
  const entries = verified.map(({ id, checksum }) => ({
    id,
    checksum,
  }));
  return Object.freeze({
    schema_migration_count: entries.length,
    schema_sha256: hashDomainValue(entries),
    entries: Object.freeze(entries.map(Object.freeze)),
    verified: true,
    verification_source: "lawos_meta.schema_migrations",
    production_ready_claim: false,
  });
}
