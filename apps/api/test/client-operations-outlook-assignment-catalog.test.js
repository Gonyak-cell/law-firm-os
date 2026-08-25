import assert from "node:assert/strict";
import test from "node:test";

import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import {
  checksumPostgresMigration,
} from "../../../packages/persistence/src/postgres/migration-catalog.js";
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG,
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
  OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS,
  OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256,
} from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
  CLIENT_OPERATIONS_OUTLOOK_ASSIGNMENT_AUTHORITY_BINDING,
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
  listClientOperationsPostgresMigrations,
  normalizeClientOperationsMigrationCatalog,
  runClientOperationsPostgresMigrations,
} from "../src/client-operations-schema.js";

test("combined migration 306 binds the exact Outlook assignment authority catalogs", () => {
  assert.equal(
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
    "da9c3a5fdbf6c33b0c4459983e2e5d922aaf0175c937948671705cda1ec5fc71",
  );
  assert.equal(OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.tables.length, 25);
  assert.equal(
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.functions.length,
    52,
  );
  assert.equal(
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.role_catalog.length,
    5,
  );
  assert.equal(OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS.length, 30);
  assert.equal(
    OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256,
    "6751c0d1becb8ada825f91cbab313846ec11e1e876b01b4c32f46b2af0ac20f3",
  );
  assert.equal(
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG
      .security_definer_functions,
    OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS,
  );
  assert.equal(
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
    hashDomainValue(OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG),
  );

  assert.equal(CLIENT_OPERATIONS_MIGRATION_CATALOG.migration_count, 77);
  assert.equal(Object.isFrozen(CLIENT_OPERATIONS_MIGRATION_CATALOG), true);
  assert.equal(
    Object.isFrozen(CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations),
    true,
  );
  assert.equal(
    CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
    hashDomainValue(CLIENT_OPERATIONS_MIGRATION_CATALOG),
  );
  assert.equal(
    CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
    "d0ff45b1d9d53529b317901db60801a7865e8e1c042941204baadbfeb46b4250",
  );
  const normalizedCatalog = normalizeClientOperationsMigrationCatalog();
  assert.equal(
    normalizedCatalog.migration_catalog_sha256,
    CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
  );
  assert.deepEqual(
    normalizedCatalog.ledger_entries,
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries,
  );
  assert.equal(
    normalizedCatalog.ledger_sha256,
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_sha256,
  );
  assert.equal(
    normalizedCatalog.ledger_sha256,
    "d5b085b8fdd66c095e02eb92502ef0820463d9fa969d615ef6846cc53cf62921",
  );
  const assignmentCatalogRow =
    CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.at(-2);
  const assignmentSchemaRow =
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.at(-2);
  assert.equal(
    hashDomainValue(CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.slice(0, -2)),
    "955acda6770f6adb1c7a14b117b6eb36ac3310da45dfaa9ff0595d22b95ac995",
  );
  assert.equal(
    hashDomainValue(CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.slice(0, -1)),
    "8d8da4ab27a6de8db5e612b2d55945ffeb70fd61a7b43fb2b10c39d72cbaad6a",
  );
  assert.deepEqual(CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.at(-3), {
    id: "305_client_outlook_desktop_release_trust",
    checksum:
      "86921d4c43544858ae67a95c2c6cc8fb5deeef2731693285fcb4ffa22fd115c7",
  });
  assert.equal(
    assignmentCatalogRow.id,
    "306_client_outlook_desktop_assignment",
  );
  assert.equal(
    assignmentCatalogRow.file_name,
    "./007_outlook_desktop_assignment.sql",
  );
  assert.equal(
    assignmentCatalogRow.source_migration_id,
    "007_outlook_desktop_assignment",
  );
  assert.deepEqual(
    CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.map((entry) => ({
      id: entry.id,
      source_migration_id: entry.source_migration_id,
      file_name: entry.file_name,
      checksum: entry.checksum,
    })),
    listClientOperationsPostgresMigrations().map((migration) => ({
      id: migration.id,
      source_migration_id: migration.source_migration_id ?? null,
      file_name: migration.file_name ?? `${migration.id}.sql`,
      checksum:
        migration.checksum ?? checksumPostgresMigration(migration.sql),
    })),
  );
  assert.equal(assignmentCatalogRow.checksum, assignmentSchemaRow.checksum);
  assert.equal(
    assignmentCatalogRow.checksum,
    "737ffadf908861b2bda4ea88e650dcef62aaf48011b3d94f8f71fcd9f50f0f2d",
  );
  assert.equal(Object.isFrozen(assignmentCatalogRow), true);
  assert.equal(
    CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations
      .slice(0, -2)
      .some(({ outlook_assignment_authority: authority }) => authority),
    false,
  );
  assert.equal(
    assignmentCatalogRow.outlook_assignment_authority,
    CLIENT_OPERATIONS_OUTLOOK_ASSIGNMENT_AUTHORITY_BINDING,
  );
  assert.equal(
    Object.isFrozen(CLIENT_OPERATIONS_OUTLOOK_ASSIGNMENT_AUTHORITY_BINDING),
    true,
  );
  assert.deepEqual(CLIENT_OPERATIONS_OUTLOOK_ASSIGNMENT_AUTHORITY_BINDING, {
    source_migration_id: "007_outlook_desktop_assignment",
    client_migration_id: "306_client_outlook_desktop_assignment",
    authority_catalog_sha256:
      OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
    authority_table_count:
      OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.tables.length,
    authority_function_count:
      OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.functions.length,
    role_catalog_count:
      OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.role_catalog.length,
    exposed_security_definer_function_count:
      OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS.length,
    exposed_security_definer_function_catalog_sha256:
      OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256,
    assignment_state_read: {
      signature:
        "lawos_email_dms.read_outlook_desktop_assignment_state(text,text,text)",
      transaction_mode: "serializable_write",
    },
  });
  assert.equal(
    JSON.stringify(assignmentCatalogRow).includes("authority_manifest_sha256"),
    false,
  );
  assert.equal(
    JSON.stringify(assignmentCatalogRow).includes(
      "protected_object_facts_sha256",
    ),
    false,
  );
});

test("combined migration 306 rejects dynamic authority facts and a read-only assignment state", () => {
  for (const mutate of [
    (binding) => {
      binding.authority_manifest_sha256 = "a".repeat(64);
    },
    (binding) => {
      binding.protected_object_facts_sha256 = "b".repeat(64);
    },
    (binding) => {
      binding.assignment_state_read.transaction_mode = "serializable_read";
    },
  ]) {
    const catalog = structuredClone(CLIENT_OPERATIONS_MIGRATION_CATALOG);
    mutate(catalog.migrations.at(-2).outlook_assignment_authority);
    assert.throws(
      () => normalizeClientOperationsMigrationCatalog(catalog),
      /Outlook assignment catalog binding is invalid/u,
    );
  }
});

test("combined migration wrapper forwards the three signed digests with the authority callbacks", async () => {
  const connectFailure = Object.assign(new Error("expected connect boundary"), {
    code: "EXPECTED_CONNECT_BOUNDARY",
  });
  let connectCalls = 0;
  const pool = {
    async connect() {
      connectCalls += 1;
      throw connectFailure;
    },
  };
  const callbacks = {
    onBeforeMigrations: async () => {},
    onOutlookAuthorityPaused: async () => {},
    onOutlookAuthorityPostMigration: async () => {},
  };
  await assert.rejects(
    runClientOperationsPostgresMigrations(pool, callbacks),
    /signed digests are required/u,
  );
  await assert.rejects(
    runClientOperationsPostgresMigrations(pool, {
      ...callbacks,
      authorityManifestSha256:
        OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
      databaseTargetReceiptSha256: "d".repeat(64),
      migrationCatalogSha256:
        CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
    }),
    (error) => error?.code === "LAWOS_POSTGRES_OPERATION_FAILED",
  );
  assert.equal(connectCalls, 1);
});
