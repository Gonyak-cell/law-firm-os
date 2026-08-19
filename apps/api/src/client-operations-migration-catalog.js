import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";

export const CLIENT_OPERATIONS_MIGRATION_CATALOG_VERSION =
  "law-firm-os.json-postgres-rehearsal-migration-catalog.v1";

const MIGRATION_COUNT = 76;
const FINAL_MIGRATION_ID = "306_client_outlook_desktop_assignment";
const FINAL_SOURCE_MIGRATION_ID = "007_outlook_desktop_assignment";
const ASSIGNMENT_STATE_READ_SIGNATURE =
  "lawos_email_dms.read_outlook_desktop_assignment_state(text,text,text)";
const SHA256 = /^[0-9a-f]{64}$/u;
const CATALOG_KEYS = Object.freeze([
  "schema_version",
  "authority",
  "migration_count",
  "migrations",
]);
const MIGRATION_ROW_KEYS = Object.freeze([
  "id",
  "source_migration_id",
  "file_name",
  "checksum",
]);
const AUTHORITY_BINDING_KEYS = Object.freeze([
  "source_migration_id",
  "client_migration_id",
  "authority_catalog_sha256",
  "authority_table_count",
  "authority_function_count",
  "role_catalog_count",
  "exposed_security_definer_function_count",
  "exposed_security_definer_function_catalog_sha256",
  "assignment_state_read",
]);

function exactKeys(value, keys) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort())
      === JSON.stringify([...keys].sort());
}

export function normalizeClientOperationsMigrationCatalogMaterial(
  catalog,
  { expectedCatalogSha256 } = {},
) {
  const migrations = catalog?.migrations;
  if (!exactKeys(catalog, CATALOG_KEYS)
    || catalog.schema_version
      !== CLIENT_OPERATIONS_MIGRATION_CATALOG_VERSION
    || catalog.authority !== "postgres-v2"
    || !Array.isArray(migrations)
    || catalog.migration_count !== migrations.length
    || migrations.length !== MIGRATION_COUNT) {
    throw new TypeError("Client operations migration catalog is invalid");
  }
  const ledgerEntries = migrations.map((entry, index) => {
    const expectedKeys = index === migrations.length - 1
      ? [...MIGRATION_ROW_KEYS, "outlook_assignment_authority"]
      : MIGRATION_ROW_KEYS;
    if (!exactKeys(entry, expectedKeys)
      || typeof entry.id !== "string"
      || (entry.source_migration_id !== null
        && typeof entry.source_migration_id !== "string")
      || typeof entry.file_name !== "string"
      || !SHA256.test(entry.checksum)) {
      throw new TypeError("Client operations migration catalog row is invalid");
    }
    return Object.freeze({ id: entry.id, checksum: entry.checksum });
  });
  if (new Set(ledgerEntries.map(({ id }) => id)).size
    !== ledgerEntries.length) {
    throw new TypeError("Client operations migration catalog IDs are invalid");
  }
  const finalSource = migrations.at(-1);
  const final = ledgerEntries.at(-1);
  const binding = finalSource.outlook_assignment_authority;
  if (final.id !== FINAL_MIGRATION_ID
    || finalSource.source_migration_id !== FINAL_SOURCE_MIGRATION_ID
    || finalSource.file_name !== "./007_outlook_desktop_assignment.sql"
    || !exactKeys(binding, AUTHORITY_BINDING_KEYS)
    || binding.source_migration_id !== FINAL_SOURCE_MIGRATION_ID
    || binding.client_migration_id !== FINAL_MIGRATION_ID
    || !SHA256.test(binding.authority_catalog_sha256)
    || !Number.isSafeInteger(binding.authority_table_count)
    || binding.authority_table_count < 1
    || !Number.isSafeInteger(binding.authority_function_count)
    || binding.authority_function_count < 1
    || !Number.isSafeInteger(binding.role_catalog_count)
    || binding.role_catalog_count < 1
    || !Number.isSafeInteger(
      binding.exposed_security_definer_function_count,
    )
    || binding.exposed_security_definer_function_count < 1
    || !SHA256.test(
      binding.exposed_security_definer_function_catalog_sha256,
    )
    || !exactKeys(
      binding.assignment_state_read,
      ["signature", "transaction_mode"],
    )
    || binding.assignment_state_read.signature
      !== ASSIGNMENT_STATE_READ_SIGNATURE
    || binding.assignment_state_read.transaction_mode
      !== "serializable_write") {
    throw new TypeError(
      "Client operations Outlook assignment catalog binding is invalid",
    );
  }
  const catalogSha256 = hashDomainValue(catalog);
  if (!SHA256.test(expectedCatalogSha256 ?? "")
    || catalogSha256 !== expectedCatalogSha256) {
    throw new TypeError("Client operations migration catalog digest is invalid");
  }
  return Object.freeze({
    migration_catalog_count: migrations.length,
    migration_catalog_sha256: catalogSha256,
    ledger_entries: Object.freeze(ledgerEntries),
    ledger_sha256: hashDomainValue(ledgerEntries),
    final_migration_id: final.id,
    final_migration_checksum: final.checksum,
  });
}
