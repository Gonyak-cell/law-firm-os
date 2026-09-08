import assert from "node:assert/strict";
import test from "node:test";
import {
  CLIENT_OPERATIONS_INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_BINDING,
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  normalizeClientOperationsMigrationCatalog,
  selectClientOperationsMigrationTarget,
} from "../src/client-operations-schema.js";
import {
  INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG_SHA256,
  INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS_SHA256,
} from "../../../packages/email-dms/src/internal-unsigned-installation-authority-catalog.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";

test("migration 310 preserves the exact 81-row authority catalog and appends only the reviewed version rule", () => {
  const prior = selectClientOperationsMigrationTarget("8de3211a545ebb7c50813990d15f6abc215ffd23a7d09ba2149d9b37fd96e8c7").catalog;
  const current = CLIENT_OPERATIONS_MIGRATION_CATALOG;
  assert.equal(current.migration_count, 82);
  assert.deepEqual(current.migrations.slice(0, -1), prior.migrations);
  assert.equal(hashDomainValue(prior), "8de3211a545ebb7c50813990d15f6abc215ffd23a7d09ba2149d9b37fd96e8c7");
  assert.equal(current.migrations.at(-1).id, "310_client_internal_unsigned_s3_version");
  assert.equal(normalizeClientOperationsMigrationCatalog().final_migration_id, current.migrations.at(-1).id);
  assert.deepEqual(current.migrations.at(-1).internal_unsigned_installation_authority.trusted_current_read,
    prior.migrations.at(-1).internal_unsigned_installation_authority.trusted_current_read);
});

test("migration 309 adds a closed internal authority binding after unchanged legacy migration 308", () => {
  const catalog = selectClientOperationsMigrationTarget("8de3211a545ebb7c50813990d15f6abc215ffd23a7d09ba2149d9b37fd96e8c7").catalog;
  assert.equal(catalog.migration_count, 81);
  assert.equal(catalog.migrations.at(-2).id, "308_client_outlook_desktop_legacy_windows_compatibility");
  const last = catalog.migrations.at(-1);
  assert.equal(last.id, "309_client_internal_unsigned_installation_authority");
  assert.equal(last.source_migration_id, "010_internal_unsigned_installation_authority");
  assert.equal(last.internal_unsigned_installation_authority, CLIENT_OPERATIONS_INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_BINDING);
  assert.deepEqual(last.internal_unsigned_installation_authority, {
    source_migration_id: last.source_migration_id,
    client_migration_id: last.id,
    authority_catalog_sha256: INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG_SHA256,
    exposed_security_definer_function_count: 5,
    exposed_security_definer_function_catalog_sha256: INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS_SHA256,
    trusted_current_read: {
      signature: "lawos_email_dms.read_current_internal_unsigned_installation(text,text,text)",
      transaction_mode: "serializable_read_only",
    },
  });
  assert.equal(normalizeClientOperationsMigrationCatalog(catalog).final_migration_id, last.id);
});

test("catalog rejects omitted, relocated, writable or broadened internal authority material", () => {
  for (const mutate of [
    (catalog) => { catalog.migrations.splice(-2, 1); catalog.migration_count -= 1; },
    (catalog) => { catalog.migrations.at(-2).internal_unsigned_installation_authority = catalog.migrations.at(-1).internal_unsigned_installation_authority; delete catalog.migrations.at(-1).internal_unsigned_installation_authority; },
    (catalog) => { catalog.migrations.at(-1).internal_unsigned_installation_authority.trusted_current_read.transaction_mode = "serializable_write"; },
    (catalog) => { catalog.migrations.at(-1).internal_unsigned_installation_authority.exposed_security_definer_function_count = 6; },
    (catalog) => { catalog.migrations.at(-1).internal_unsigned_installation_authority.raw_table_access = true; },
  ]) {
    const catalog = structuredClone(CLIENT_OPERATIONS_MIGRATION_CATALOG);
    mutate(catalog);
    assert.throws(() => normalizeClientOperationsMigrationCatalog(catalog), /catalog/iu);
  }
});
