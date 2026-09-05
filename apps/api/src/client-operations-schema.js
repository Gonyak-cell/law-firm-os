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
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG,
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
  OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS,
  OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256,
} from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import {
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG,
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG_SHA256,
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS,
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256,
} from "../../../packages/email-dms/src/outlook-desktop-trusted-current-read-authority-catalog.js";
import {
  INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG,
  INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG_SHA256,
  INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS,
  INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS_SHA256,
} from "../../../packages/email-dms/src/internal-unsigned-installation-authority-catalog.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG_VERSION,
  normalizeClientOperationsMigrationCatalogMaterial,
} from "./client-operations-migration-catalog.js";

const OUTLOOK_ASSIGNMENT_SOURCE_MIGRATION_ID =
  "007_outlook_desktop_assignment";
const OUTLOOK_ASSIGNMENT_CLIENT_MIGRATION_ID =
  "306_client_outlook_desktop_assignment";
const OUTLOOK_ASSIGNMENT_STATE_READ_SIGNATURE =
  "lawos_email_dms.read_outlook_desktop_assignment_state(text,text,text)";
const OUTLOOK_ASSIGNMENT_STATE_READ_TRANSACTION_MODE =
  "serializable_write";
const OUTLOOK_TRUSTED_CURRENT_READ_SOURCE_MIGRATION_ID =
  "008_outlook_desktop_trusted_current_read";
const OUTLOOK_TRUSTED_CURRENT_READ_CLIENT_MIGRATION_ID =
  "307_client_outlook_desktop_trusted_current_read";
const OUTLOOK_TRUSTED_CURRENT_READ_SIGNATURE =
  "lawos_email_dms.read_trusted_current_outlook_desktop_installation(text,text,text)";
const OUTLOOK_TRUSTED_CURRENT_READ_TRANSACTION_MODE =
  "serializable_read_only";
const OUTLOOK_LEGACY_WINDOWS_COMPATIBILITY_SOURCE_MIGRATION_ID =
  "009_outlook_desktop_legacy_windows_compatibility";
const OUTLOOK_LEGACY_WINDOWS_COMPATIBILITY_CLIENT_MIGRATION_ID =
  "308_client_outlook_desktop_legacy_windows_compatibility";

const INTERNAL_UNSIGNED_SOURCE_MIGRATION_ID =
  "010_internal_unsigned_installation_authority";
const INTERNAL_UNSIGNED_CLIENT_MIGRATION_ID =
  "309_client_internal_unsigned_installation_authority";
const INTERNAL_UNSIGNED_READ_SIGNATURE =
  "lawos_email_dms.read_current_internal_unsigned_installation(text,text,text)";

export const CLIENT_OPERATIONS_MIGRATION_ID_MAP = Object.freeze({
  "001_m365_connection": "300_client_m365_connection",
  "002_inquiry_evidence": "301_client_inquiry_evidence",
  "003_email_filing_correction": "302_client_email_filing_correction",
  "004_outlook_conversation_sync": "303_client_outlook_conversation_sync",
  "005_outlook_desktop_installation":
    "304_client_outlook_desktop_installation",
  "006_outlook_desktop_release_trust":
    "305_client_outlook_desktop_release_trust",
  [OUTLOOK_ASSIGNMENT_SOURCE_MIGRATION_ID]:
    OUTLOOK_ASSIGNMENT_CLIENT_MIGRATION_ID,
  [OUTLOOK_TRUSTED_CURRENT_READ_SOURCE_MIGRATION_ID]:
    OUTLOOK_TRUSTED_CURRENT_READ_CLIENT_MIGRATION_ID,
  [OUTLOOK_LEGACY_WINDOWS_COMPATIBILITY_SOURCE_MIGRATION_ID]:
    OUTLOOK_LEGACY_WINDOWS_COMPATIBILITY_CLIENT_MIGRATION_ID,
  [INTERNAL_UNSIGNED_SOURCE_MIGRATION_ID]: INTERNAL_UNSIGNED_CLIENT_MIGRATION_ID,
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

function createOutlookAssignmentAuthorityBinding() {
  const roleAttributes =
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.role_attributes;
  const roleCatalog =
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.role_catalog;
  const tables = OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.tables;
  const functions = OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.functions;
  const securityDefinerFunctions =
    OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS;
  if (
    hashDomainValue(OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG)
      !== OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256
    || OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG
      .security_definer_functions
      !== securityDefinerFunctions
    || OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG
      .security_definer_functions_sha256
      !== OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256
    || hashDomainValue(securityDefinerFunctions)
      !== OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256
    || !Array.isArray(tables)
    || tables.length === 0
    || !Array.isArray(functions)
    || functions.length === 0
    || !roleAttributes
    || typeof roleAttributes !== "object"
    || !Array.isArray(roleCatalog)
    || roleCatalog.length === 0
    || roleCatalog.length !== Object.keys(roleAttributes).length
    || new Set(roleCatalog.map(({ name }) => name)).size
      !== roleCatalog.length
    || roleCatalog.some(({ name }) => !Object.hasOwn(roleAttributes, name))
    || !Array.isArray(securityDefinerFunctions)
    || securityDefinerFunctions.length === 0
    || new Set(
      securityDefinerFunctions.map(
        ({ signature }) => signature,
      ),
    ).size !== securityDefinerFunctions.length
  ) {
    throw new Error(
      "Outlook desktop assignment authority catalog is not closed",
    );
  }
  const assignmentStateRead =
    securityDefinerFunctions.find(
      ({ signature }) =>
        signature === OUTLOOK_ASSIGNMENT_STATE_READ_SIGNATURE,
    );
  if (
    assignmentStateRead?.transaction_mode
      !== OUTLOOK_ASSIGNMENT_STATE_READ_TRANSACTION_MODE
  ) {
    throw new Error(
      "Outlook desktop assignment state read must be SERIALIZABLE write-capable",
    );
  }
  return Object.freeze({
    source_migration_id: OUTLOOK_ASSIGNMENT_SOURCE_MIGRATION_ID,
    client_migration_id: OUTLOOK_ASSIGNMENT_CLIENT_MIGRATION_ID,
    authority_catalog_sha256:
      OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
    authority_table_count: tables.length,
    authority_function_count: functions.length,
    role_catalog_count: roleCatalog.length,
    exposed_security_definer_function_count:
      securityDefinerFunctions.length,
    exposed_security_definer_function_catalog_sha256:
      OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256,
    assignment_state_read: Object.freeze({
      signature: OUTLOOK_ASSIGNMENT_STATE_READ_SIGNATURE,
      transaction_mode:
        OUTLOOK_ASSIGNMENT_STATE_READ_TRANSACTION_MODE,
    }),
  });
}

export const CLIENT_OPERATIONS_OUTLOOK_ASSIGNMENT_AUTHORITY_BINDING =
  createOutlookAssignmentAuthorityBinding();

function createOutlookTrustedCurrentReadAuthorityBinding() {
  const catalog =
    OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG;
  const securityDefinerFunctions =
    OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS;
  const trustedCurrentRead = securityDefinerFunctions.find(
    ({ signature }) =>
      signature === OUTLOOK_TRUSTED_CURRENT_READ_SIGNATURE,
  );
  if (
    hashDomainValue(catalog)
      !== OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG_SHA256
    || catalog.source_migration_id
      !== OUTLOOK_TRUSTED_CURRENT_READ_SOURCE_MIGRATION_ID
    || catalog.source_migration_file_name
      !== "./008_outlook_desktop_trusted_current_read.sql"
    || catalog.security_definer_functions
      !== securityDefinerFunctions
    || catalog.security_definer_functions_sha256
      !== OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256
    || hashDomainValue(securityDefinerFunctions)
      !== OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256
    || catalog.exposed_security_definer_function_count !== 1
    || securityDefinerFunctions.length !== 1
    || catalog.raw_release_binding_table_grants.length !== 0
    || catalog.temporary_role_membership_persisted !== false
    || catalog.temporary_schema_create_persisted !== false
    || trustedCurrentRead?.transaction_mode
      !== OUTLOOK_TRUSTED_CURRENT_READ_TRANSACTION_MODE
  ) {
    throw new Error(
      "Outlook desktop trusted-current-read authority catalog is not closed",
    );
  }
  return Object.freeze({
    source_migration_id:
      OUTLOOK_TRUSTED_CURRENT_READ_SOURCE_MIGRATION_ID,
    client_migration_id:
      OUTLOOK_TRUSTED_CURRENT_READ_CLIENT_MIGRATION_ID,
    authority_catalog_sha256:
      OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG_SHA256,
    exposed_security_definer_function_count:
      securityDefinerFunctions.length,
    exposed_security_definer_function_catalog_sha256:
      OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256,
    trusted_current_read: Object.freeze({
      signature: OUTLOOK_TRUSTED_CURRENT_READ_SIGNATURE,
      transaction_mode:
        OUTLOOK_TRUSTED_CURRENT_READ_TRANSACTION_MODE,
    }),
  });
}

export const CLIENT_OPERATIONS_OUTLOOK_TRUSTED_CURRENT_READ_AUTHORITY_BINDING =
  createOutlookTrustedCurrentReadAuthorityBinding();

function createInternalUnsignedInstallationAuthorityBinding() {
  const catalog = INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG;
  const functions = INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS;
  const read = functions.find(({ signature }) => signature === INTERNAL_UNSIGNED_READ_SIGNATURE);
  if (hashDomainValue(catalog) !== INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG_SHA256
    || catalog.source_migration_id !== INTERNAL_UNSIGNED_SOURCE_MIGRATION_ID
    || catalog.source_migration_file_name !== "./010_internal_unsigned_installation_authority.sql"
    || catalog.security_definer_functions !== functions
    || catalog.security_definer_functions_sha256 !== INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS_SHA256
    || hashDomainValue(functions) !== INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS_SHA256
    || catalog.exposed_security_definer_function_count !== 5 || functions.length !== 5
    || new Set(functions.map(({ signature }) => signature)).size !== 5
    || catalog.raw_release_binding_table_grants.length !== 0
    || catalog.temporary_role_membership_persisted !== false
    || catalog.temporary_schema_create_persisted !== false
    || read?.transaction_mode !== "serializable_read_only") {
    throw new Error("Internal unsigned installation authority catalog is not closed");
  }
  return Object.freeze({
    source_migration_id: INTERNAL_UNSIGNED_SOURCE_MIGRATION_ID,
    client_migration_id: INTERNAL_UNSIGNED_CLIENT_MIGRATION_ID,
    authority_catalog_sha256: INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG_SHA256,
    exposed_security_definer_function_count: functions.length,
    exposed_security_definer_function_catalog_sha256: INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS_SHA256,
    trusted_current_read: Object.freeze({ signature: INTERNAL_UNSIGNED_READ_SIGNATURE, transaction_mode: "serializable_read_only" }),
  });
}

export const CLIENT_OPERATIONS_INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_BINDING =
  createInternalUnsignedInstallationAuthorityBinding();

function packetMigrationCatalogMaterial(migrations) {
  return Object.freeze({
    schema_version: CLIENT_OPERATIONS_MIGRATION_CATALOG_VERSION,
    authority: "postgres-v2",
    migration_count: migrations.length,
    migrations: Object.freeze(migrations.map((migration) => Object.freeze({
      id: migration.id,
      source_migration_id: migration.source_migration_id ?? null,
      file_name: migration.file_name ?? `${migration.id}.sql`,
      checksum:
        migration.checksum ?? checksumPostgresMigration(migration.sql),
      ...(migration.id === OUTLOOK_ASSIGNMENT_CLIENT_MIGRATION_ID
        ? {
          outlook_assignment_authority:
            CLIENT_OPERATIONS_OUTLOOK_ASSIGNMENT_AUTHORITY_BINDING,
        }
        : {}),
      ...(migration.id === INTERNAL_UNSIGNED_CLIENT_MIGRATION_ID
        ? { internal_unsigned_installation_authority: CLIENT_OPERATIONS_INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_BINDING }
        : {}),
      ...(migration.id
        === OUTLOOK_TRUSTED_CURRENT_READ_CLIENT_MIGRATION_ID
        ? {
          outlook_trusted_current_read_authority:
            CLIENT_OPERATIONS_OUTLOOK_TRUSTED_CURRENT_READ_AUTHORITY_BINDING,
        }
        : {}),
    }))),
  });
}

export const CLIENT_OPERATIONS_MIGRATION_CATALOG =
  packetMigrationCatalogMaterial(OPERATIONAL_MIGRATIONS);

export const CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256 = hashDomainValue(
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
);

export function normalizeClientOperationsMigrationCatalog(
  catalog = CLIENT_OPERATIONS_MIGRATION_CATALOG,
) {
  return normalizeClientOperationsMigrationCatalogMaterial(catalog, {
    expectedCatalogSha256: catalog?.migration_count === 80
      ? "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79"
      : CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
  });
}

export function selectClientOperationsMigrationTarget(
  migrationCatalogSha256 = CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
) {
  const migrations = migrationCatalogSha256 ===
    "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79"
    ? Object.freeze(OPERATIONAL_MIGRATIONS.filter(({ id }) => id !== "016_dms_corporate_workspace"))
    : OPERATIONAL_MIGRATIONS;
  const catalog = packetMigrationCatalogMaterial(migrations);
  const normalized = normalizeClientOperationsMigrationCatalogMaterial(catalog, {
    expectedCatalogSha256: migrationCatalogSha256,
  });
  return Object.freeze({ migrations, catalog, normalized });
}

export function selectClientOperationsMigrationReadback(migrationCatalogSha256) {
  if (migrationCatalogSha256 !== "43c6a087834d9dd2177be0b63fc94cf723181b93b04f40a65689b6431bd44556") {
    return selectClientOperationsMigrationTarget(migrationCatalogSha256);
  }
  const migrations = Object.freeze(OPERATIONAL_MIGRATIONS.filter(({ id }) =>
    !["016_dms_corporate_workspace", "309_client_internal_unsigned_installation_authority"].includes(id)));
  const catalog = packetMigrationCatalogMaterial(migrations);
  const entries = Object.freeze(migrations.map(({ id, sql }) =>
    Object.freeze({ id, checksum: checksumPostgresMigration(sql) })));
  const ledgerSha256 = hashDomainValue(entries);
  if (entries.length !== 79 || hashDomainValue(catalog) !== migrationCatalogSha256
      || ledgerSha256 !== "fe0b9c53de1617361fd607692beb7e462b28159321e7830d507836948fcfdbc3") {
    throw new TypeError("Historical Client operations readback catalog drifted");
  }
  return Object.freeze({ migrations, catalog, normalized: Object.freeze({
    migration_catalog_count: entries.length,
    migration_catalog_sha256: migrationCatalogSha256,
    ledger_entries: entries,
    ledger_sha256: ledgerSha256,
    final_migration_id: entries.at(-1).id,
    final_migration_checksum: entries.at(-1).checksum,
  }) });
}

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
  {
    appliedBy = "client-operations-migration",
    authorityManifestSha256,
    databaseTargetReceiptSha256,
    historicalOutlookBootstrapSha256,
    migrationCatalogSha256,
    onBeforeMigrations,
    onOutlookAuthorityPaused,
    onOutlookAuthorityPostMigration,
    onInternalUnsignedInstallationAuthorityPostMigration,
  } = {},
) {
  const target = selectClientOperationsMigrationTarget(migrationCatalogSha256);
  return runPostgresMigrations(pool, {
    migrations: target.migrations,
    appliedBy,
    authorityManifestSha256,
    databaseTargetReceiptSha256,
    historicalOutlookBootstrapSha256,
    migrationCatalogSha256,
    onBeforeMigrations,
    onOutlookAuthorityPaused,
    onOutlookAuthorityPostMigration,
    onInternalUnsignedInstallationAuthorityPostMigration,
    allowedHistoricalGapIds: [
      "012_outlook_document_source_identity",
      "013_dms_precedent_search",
      "014_docusign_outbox",
      "015_external_tenant_provisioning",
      ...(target.normalized.migration_catalog_count === 81
        ? ["016_dms_corporate_workspace"] : []),
      "149_hrx_049_hrx_directory_authority",
    ],
  });
}

export function verifyClientOperationsPostgresMigrations(pool) {
  return verifyPostgresMigrationState(pool, {
    migrations: OPERATIONAL_MIGRATIONS,
  });
}

export function verifyClientOperationsMigrationTarget(pool, { migrationCatalogSha256 } = {}) {
  return verifyPostgresMigrationState(pool, {
    migrations: selectClientOperationsMigrationTarget(migrationCatalogSha256).migrations,
  });
}

export function verifyClientOperationsMigrationReadback(pool, { migrationCatalogSha256 } = {}) {
  return verifyPostgresMigrationState(pool, {
    migrations: selectClientOperationsMigrationReadback(migrationCatalogSha256).migrations,
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
