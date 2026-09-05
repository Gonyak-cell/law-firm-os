import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";

export const CLIENT_OPERATIONS_MIGRATION_CATALOG_VERSION =
  "law-firm-os.json-postgres-rehearsal-migration-catalog.v1";

export const CLIENT_OPERATIONS_REVIEWED_MIGRATION_TARGETS = Object.freeze({
  "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79": Object.freeze({
    migration_count: 80,
    ledger_sha256: "4d2b71686f05f483fee882b742e363ee4ce24e95879dce267a81083adc47287f",
  }),
  "8de3211a545ebb7c50813990d15f6abc215ffd23a7d09ba2149d9b37fd96e8c7": Object.freeze({
    migration_count: 81,
    ledger_sha256: "29530ec602b720deeb1e26625c85a3dcc1268e2bfc116b6b86bfada761cb38a7",
  }),
});
const ASSIGNMENT_MIGRATION_ID =
  "306_client_outlook_desktop_assignment";
const ASSIGNMENT_SOURCE_MIGRATION_ID =
  "007_outlook_desktop_assignment";
const TRUSTED_CURRENT_MIGRATION_ID =
  "307_client_outlook_desktop_trusted_current_read";
const TRUSTED_CURRENT_SOURCE_MIGRATION_ID =
  "008_outlook_desktop_trusted_current_read";
const LEGACY_MIGRATION_ID =
  "308_client_outlook_desktop_legacy_windows_compatibility";
const LEGACY_SOURCE_MIGRATION_ID =
  "009_outlook_desktop_legacy_windows_compatibility";
const FINAL_MIGRATION_ID = "309_client_internal_unsigned_installation_authority";
const FINAL_SOURCE_MIGRATION_ID = "010_internal_unsigned_installation_authority";
const INTERNAL_UNSIGNED_READ_SIGNATURE =
  "lawos_email_dms.read_current_internal_unsigned_installation(text,text,text)";
const ASSIGNMENT_STATE_READ_SIGNATURE =
  "lawos_email_dms.read_outlook_desktop_assignment_state(text,text,text)";
const TRUSTED_CURRENT_READ_SIGNATURE =
  "lawos_email_dms.read_trusted_current_outlook_desktop_installation(text,text,text)";
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
const ASSIGNMENT_AUTHORITY_BINDING_KEYS = Object.freeze([
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
const TRUSTED_CURRENT_READ_AUTHORITY_BINDING_KEYS = Object.freeze([
  "source_migration_id",
  "client_migration_id",
  "authority_catalog_sha256",
  "exposed_security_definer_function_count",
  "exposed_security_definer_function_catalog_sha256",
  "trusted_current_read",
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
  const target = CLIENT_OPERATIONS_REVIEWED_MIGRATION_TARGETS[expectedCatalogSha256];
  if (!exactKeys(catalog, CATALOG_KEYS)
    || catalog.schema_version
      !== CLIENT_OPERATIONS_MIGRATION_CATALOG_VERSION
    || catalog.authority !== "postgres-v2"
    || !Array.isArray(migrations)
    || catalog.migration_count !== migrations.length
    || !target
    || migrations.length !== target.migration_count) {
    throw new TypeError("Client operations migration catalog is invalid");
  }
  const ledgerEntries = migrations.map((entry) => {
    const expectedKeys = entry?.id === ASSIGNMENT_MIGRATION_ID
      ? [...MIGRATION_ROW_KEYS, "outlook_assignment_authority"]
      : entry?.id === TRUSTED_CURRENT_MIGRATION_ID
        ? [
          ...MIGRATION_ROW_KEYS,
          "outlook_trusted_current_read_authority",
        ]
        : entry?.id === FINAL_MIGRATION_ID
          ? [...MIGRATION_ROW_KEYS, "internal_unsigned_installation_authority"]
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
  const assignmentSource = migrations.at(-4);
  const assignmentBinding =
    assignmentSource.outlook_assignment_authority;
  if (assignmentSource.id !== ASSIGNMENT_MIGRATION_ID
    || assignmentSource.source_migration_id
      !== ASSIGNMENT_SOURCE_MIGRATION_ID
    || assignmentSource.file_name
      !== "./007_outlook_desktop_assignment.sql"
    || !exactKeys(
      assignmentBinding,
      ASSIGNMENT_AUTHORITY_BINDING_KEYS,
    )
    || assignmentBinding.source_migration_id
      !== ASSIGNMENT_SOURCE_MIGRATION_ID
    || assignmentBinding.client_migration_id
      !== ASSIGNMENT_MIGRATION_ID
    || !SHA256.test(assignmentBinding.authority_catalog_sha256)
    || !Number.isSafeInteger(
      assignmentBinding.authority_table_count,
    )
    || assignmentBinding.authority_table_count < 1
    || !Number.isSafeInteger(
      assignmentBinding.authority_function_count,
    )
    || assignmentBinding.authority_function_count < 1
    || !Number.isSafeInteger(
      assignmentBinding.role_catalog_count,
    )
    || assignmentBinding.role_catalog_count < 1
    || !Number.isSafeInteger(
      assignmentBinding.exposed_security_definer_function_count,
    )
    || assignmentBinding.exposed_security_definer_function_count < 1
    || !SHA256.test(
      assignmentBinding
        .exposed_security_definer_function_catalog_sha256,
    )
    || !exactKeys(
      assignmentBinding.assignment_state_read,
      ["signature", "transaction_mode"],
    )
    || assignmentBinding.assignment_state_read.signature
      !== ASSIGNMENT_STATE_READ_SIGNATURE
    || assignmentBinding.assignment_state_read.transaction_mode
      !== "serializable_write") {
    throw new TypeError(
      "Client operations Outlook assignment catalog binding is invalid",
    );
  }

  const trustedCurrentSource = migrations.at(-3);
  const legacySource = migrations.at(-2);
  const finalSource = migrations.at(-1);
  const final = ledgerEntries.at(-1);
  const binding =
    trustedCurrentSource.outlook_trusted_current_read_authority;
  if (trustedCurrentSource.id !== TRUSTED_CURRENT_MIGRATION_ID
    || trustedCurrentSource.source_migration_id
      !== TRUSTED_CURRENT_SOURCE_MIGRATION_ID
    || trustedCurrentSource.file_name
      !== "./008_outlook_desktop_trusted_current_read.sql"
    || !exactKeys(
      binding,
      TRUSTED_CURRENT_READ_AUTHORITY_BINDING_KEYS,
    )
    || binding.source_migration_id
      !== TRUSTED_CURRENT_SOURCE_MIGRATION_ID
    || binding.client_migration_id !== TRUSTED_CURRENT_MIGRATION_ID
    || !SHA256.test(binding.authority_catalog_sha256)
    || !Number.isSafeInteger(
      binding.exposed_security_definer_function_count,
    )
    || binding.exposed_security_definer_function_count < 1
    || !SHA256.test(
      binding.exposed_security_definer_function_catalog_sha256,
    )
    || !exactKeys(
      binding.trusted_current_read,
      ["signature", "transaction_mode"],
    )
    || binding.trusted_current_read.signature
      !== TRUSTED_CURRENT_READ_SIGNATURE
    || binding.trusted_current_read.transaction_mode
      !== "serializable_read_only") {
    throw new TypeError(
      "Client operations Outlook trusted-current-read catalog binding is invalid",
    );
  }
  if (legacySource.id !== LEGACY_MIGRATION_ID
    || legacySource.source_migration_id !== LEGACY_SOURCE_MIGRATION_ID
    || legacySource.file_name
      !== "./009_outlook_desktop_legacy_windows_compatibility.sql") {
    throw new TypeError(
      "Client operations Outlook legacy Windows compatibility migration is invalid",
    );
  }
  const internalBinding = finalSource.internal_unsigned_installation_authority;
  if (final.id !== FINAL_MIGRATION_ID
    || finalSource.source_migration_id !== FINAL_SOURCE_MIGRATION_ID
    || finalSource.file_name !== "./010_internal_unsigned_installation_authority.sql"
    || !exactKeys(internalBinding, TRUSTED_CURRENT_READ_AUTHORITY_BINDING_KEYS)
    || internalBinding.source_migration_id !== FINAL_SOURCE_MIGRATION_ID
    || internalBinding.client_migration_id !== FINAL_MIGRATION_ID
    || !SHA256.test(internalBinding.authority_catalog_sha256)
    || internalBinding.exposed_security_definer_function_count !== 5
    || !SHA256.test(internalBinding.exposed_security_definer_function_catalog_sha256)
    || !exactKeys(internalBinding.trusted_current_read, ["signature", "transaction_mode"])
    || internalBinding.trusted_current_read.signature !== INTERNAL_UNSIGNED_READ_SIGNATURE
    || internalBinding.trusted_current_read.transaction_mode !== "serializable_read_only") {
    throw new TypeError("Client operations internal unsigned installation authority catalog binding is invalid");
  }
  const catalogSha256 = hashDomainValue(catalog);
  if (!SHA256.test(expectedCatalogSha256 ?? "")
    || catalogSha256 !== expectedCatalogSha256
    || hashDomainValue(ledgerEntries) !== target.ledger_sha256) {
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
