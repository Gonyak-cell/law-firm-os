export const OUTLOOK_ASSIGNMENT_SOURCE_MIGRATION_ID =
  "007_outlook_desktop_assignment";

const RECEIPT_SCHEMA_VERSION =
  "lawos.outlook-authority-role-bootstrap-receipt.v1";
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

function exactRecord(value, keys, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) {
    throw new TypeError(`${name} has unexpected fields`);
  }
}

export function normalizeOutlookAuthorityMigrationPauseExpectation(value) {
  const keys = [
    "authority_manifest_sha256",
    "database_target_receipt_sha256",
    "migration_catalog_sha256",
    "role_bootstrap_sha256",
    "schema_version",
  ];
  exactRecord(value, keys, "Outlook authority pause expectation");
  if (value.schema_version !== RECEIPT_SCHEMA_VERSION
      || !keys.slice(0, 4).every((key) => SHA256_PATTERN.test(value[key]))) {
    throw new TypeError("Outlook authority pause expectation is invalid");
  }
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, value[key]])));
}

export function normalizeOutlookAuthorityPostflight(value) {
  const keys = ["authority_postflight_sha256", "role_bootstrap_sha256"];
  exactRecord(value, keys, "Outlook authority postflight receipt");
  if (!keys.every((key) => SHA256_PATTERN.test(value[key]))) {
    throw new TypeError("Outlook authority postflight receipt is invalid");
  }
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, value[key]])));
}

export function closeOutlookAuthorityMigrationCatalog(migrations) {
  return Object.freeze(migrations.map((migration) => Object.freeze({
    id: migration.id,
    source_migration_id: migration.source_migration_id ?? null,
    file_name: migration.file_name ?? `${migration.id}.sql`,
    checksum: migration.checksum,
  })));
}

export function isOutlookAuthorityMigration(migration) {
  return migration.id === OUTLOOK_ASSIGNMENT_SOURCE_MIGRATION_ID
    || migration.source_migration_id === OUTLOOK_ASSIGNMENT_SOURCE_MIGRATION_ID;
}

export async function installOutlookAuthorityExpectation(client, expectation) {
  await client.query(`
    CREATE TEMP TABLE outlook_authority_expected_receipt (
      schema_version text NOT NULL,
      role_bootstrap_sha256 text NOT NULL,
      authority_manifest_sha256 text NOT NULL,
      database_target_receipt_sha256 text NOT NULL,
      migration_catalog_sha256 text NOT NULL
    ) ON COMMIT DROP
  `);
  await client.query(
    `INSERT INTO outlook_authority_expected_receipt
       (schema_version,role_bootstrap_sha256,
        authority_manifest_sha256,database_target_receipt_sha256,
        migration_catalog_sha256)
     VALUES ($1,$2,$3,$4,$5)`,
    [expectation.schema_version, expectation.role_bootstrap_sha256,
      expectation.authority_manifest_sha256,
      expectation.database_target_receipt_sha256,
      expectation.migration_catalog_sha256],
  );
}
