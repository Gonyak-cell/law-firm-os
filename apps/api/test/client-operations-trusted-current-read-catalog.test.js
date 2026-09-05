import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG_SHA256,
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256,
} from "../../../packages/email-dms/src/outlook-desktop-trusted-current-read-authority-catalog.js";
import * as clientSchema from "../src/client-operations-schema.js";

const SOURCE_MIGRATION_ID =
  "008_outlook_desktop_trusted_current_read";
const CLIENT_MIGRATION_ID =
  "307_client_outlook_desktop_trusted_current_read";
const FINAL_MIGRATION_ID =
  "309_client_internal_unsigned_installation_authority";
const FUNCTION_SIGNATURE =
  "lawos_email_dms.read_trusted_current_outlook_desktop_installation(text,text,text)";

test("combined migration 307 binds a separate read-only trusted-current authority without changing 306", () => {
  assert.equal(
    OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG_SHA256,
    "3d3294008606d5fe496b2155c6424ded688af1b60299c86a2ca5f8ef8f602573",
  );
  assert.equal(
    OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256,
    "11dec031686988c703eed7d6bb8058327ca39ab2740d2dfe1b3ab302583d6702",
  );
  assert.equal(
    clientSchema.CLIENT_OPERATIONS_MIGRATION_ID_MAP[SOURCE_MIGRATION_ID],
    CLIENT_MIGRATION_ID,
  );
  assert.equal(
    clientSchema.CLIENT_OPERATIONS_MIGRATION_CATALOG.migration_count,
    81,
  );
  assert.equal(
    clientSchema.CLIENT_OPERATIONS_SCHEMA_MANIFEST
      .client_schema_migration_count,
    10,
  );

  const assignment =
    clientSchema.CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.find(
      ({ id }) => id === "306_client_outlook_desktop_assignment",
    );
  assert.equal(
    assignment.checksum,
    "737ffadf908861b2bda4ea88e650dcef62aaf48011b3d94f8f71fcd9f50f0f2d",
  );
  assert.equal(
    assignment.outlook_assignment_authority.authority_catalog_sha256,
    "da9c3a5fdbf6c33b0c4459983e2e5d922aaf0175c937948671705cda1ec5fc71",
  );

  const trustedCurrent =
    clientSchema.CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.at(-3);
  assert.equal(trustedCurrent.id, CLIENT_MIGRATION_ID);
  assert.equal(trustedCurrent.source_migration_id, SOURCE_MIGRATION_ID);
  assert.equal(
    trustedCurrent.file_name,
    "./008_outlook_desktop_trusted_current_read.sql",
  );
  assert.equal(
    trustedCurrent.outlook_trusted_current_read_authority,
    clientSchema
      .CLIENT_OPERATIONS_OUTLOOK_TRUSTED_CURRENT_READ_AUTHORITY_BINDING,
  );
  assert.deepEqual(
    trustedCurrent.outlook_trusted_current_read_authority,
    {
      source_migration_id: SOURCE_MIGRATION_ID,
      client_migration_id: CLIENT_MIGRATION_ID,
      authority_catalog_sha256:
        OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG_SHA256,
      exposed_security_definer_function_count: 1,
      exposed_security_definer_function_catalog_sha256:
        OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256,
      trusted_current_read: {
        signature: FUNCTION_SIGNATURE,
        transaction_mode: "serializable_read_only",
      },
    },
  );
  assert.deepEqual(
    trustedCurrent.outlook_trusted_current_read_authority
      .trusted_current_read,
    {
      signature: FUNCTION_SIGNATURE,
      transaction_mode: "serializable_read_only",
    },
  );

  const normalized =
    clientSchema.normalizeClientOperationsMigrationCatalog();
  const final =
    clientSchema.CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.at(-1);
  assert.equal(
    clientSchema.CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.at(-2).id,
    "308_client_outlook_desktop_legacy_windows_compatibility",
  );
  assert.equal(normalized.final_migration_id, FINAL_MIGRATION_ID);
  assert.equal(
    normalized.final_migration_checksum,
    final.checksum,
  );
});

test("combined migration catalog rejects moving either additive authority binding to the wrong row", () => {
  for (const mutate of [
    (catalog) => {
      catalog.migrations.at(-1).outlook_assignment_authority =
        catalog.migrations.at(-4).outlook_assignment_authority;
      delete catalog.migrations.at(-4).outlook_assignment_authority;
    },
    (catalog) => {
      catalog.migrations.at(-1).outlook_trusted_current_read_authority =
        catalog.migrations.at(-3)
          .outlook_trusted_current_read_authority;
      delete catalog.migrations.at(-3)
        .outlook_trusted_current_read_authority;
    },
  ]) {
    const catalog = structuredClone(
      clientSchema.CLIENT_OPERATIONS_MIGRATION_CATALOG,
    );
    mutate(catalog);
    assert.throws(
      () => clientSchema.normalizeClientOperationsMigrationCatalog(catalog),
      /catalog/u,
    );
  }
});
