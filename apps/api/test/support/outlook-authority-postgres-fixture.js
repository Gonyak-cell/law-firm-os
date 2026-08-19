import {
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
} from "../../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import {
  createMigratedPostgresFixture,
} from "../../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  normalizeClientOperationsMigrationCatalog,
  runClientOperationsPostgresMigrations,
} from "../../src/client-operations-schema.js";
import {
  createJsonPostgresOutlookAuthorityMigrationAdapter,
} from "../../src/json-postgres-outlook-authority-migration-adapter.js";

const MIGRATION_CATALOG_SHA256 = normalizeClientOperationsMigrationCatalog(
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
).migration_catalog_sha256;

export function createOutlookAuthorityPostgresFixture(t, options = {}) {
  return createMigratedPostgresFixture(t, {
    ...options,
    outlookAuthorityAdmin: true,
  });
}

export async function runOutlookAuthorityPostgresMigrations(fixture, {
  appliedBy = "outlook-authority-postgres-fixture",
} = {}) {
  const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter({
    approvedTenantIds: ["tenant_amic_matter_vault"],
    assignmentPassword: "fixture-outlook-assignment-password",
    authorityManifestSha256:
      OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
    controlPassword: "fixture-outlook-control-password",
    databaseTargetReceiptSha256: "d".repeat(64),
    lifecycleVerifierPassword: "fixture-outlook-lifecycle-password",
    migrationCatalogSha256: MIGRATION_CATALOG_SHA256,
    tenantContextSecret: Buffer.from(fixture.tenantContextSecret, "utf8"),
  });
  try {
    const result = await runClientOperationsPostgresMigrations(
      fixture.adminPool,
      { appliedBy, ...adapter.runnerOptions },
    );
    return adapter.normalizeRunReceipt(result);
  } finally {
    adapter.dispose();
  }
}
