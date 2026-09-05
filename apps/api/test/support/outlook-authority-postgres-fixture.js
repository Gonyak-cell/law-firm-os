import assert from "node:assert/strict";
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG as AUTHORITY,
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
} from "../../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import { createOutlookAssignmentMigrationPauseExpectation, readOutlookAssignmentMigrationPauseExpectation } from "../../../../packages/email-dms/src/outlook-desktop-assignment-bootstrap-authority.js";
import { verifyOutlookAssignmentMigrationPreflight } from "../../../../packages/email-dms/src/outlook-desktop-assignment-authority-readback.js";
import { verifyOutlookAssignmentMigrationPostflight } from "../../../../packages/email-dms/src/outlook-desktop-assignment-migration-postflight.js";
import { configureLawosOutlookDatabaseRoles, verifyLawosOutlookApplicationRolePrecondition } from "../../../../packages/persistence/src/postgres/outlook-authority-roles.js";
import { listHrxPostgresMigrations } from "../../../../packages/hrx/src/postgres-migrations.js";
import { listPostgresFoundationMigrations } from "../../../../packages/persistence/src/postgres/migration-catalog.js";
import { runPostgresMigrations } from "../../../../packages/persistence/src/postgres/migration-runner.js";
import { hashDomainValue } from "../../../../packages/persistence/src/domain-ledger.js";
import {
  createMigratedPostgresFixture,
} from "../../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256,
  listClientOperationsPostgresMigrations,
  runClientOperationsPostgresMigrations,
} from "../../src/client-operations-schema.js";
import {
  createJsonPostgresOutlookAuthorityMigrationAdapter,
} from "../../src/json-postgres-outlook-authority-migration-adapter.js";

const CORPORATE = "016_dms_corporate_workspace";
const INTERNAL = "309_client_internal_unsigned_installation_authority";
const AUTHORITY_CATALOG_SHA256 = "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79";
const HISTORICAL_CATALOG_SHA256 = "43c6a087834d9dd2177be0b63fc94cf723181b93b04f40a65689b6431bd44556";
const beforeAuthority = ({ id }) => ![CORPORATE, INTERNAL].includes(id);
const HISTORICAL_MIGRATIONS = listClientOperationsPostgresMigrations().filter(beforeAuthority);
assert.equal(hashDomainValue({ ...CLIENT_OPERATIONS_MIGRATION_CATALOG,
  migration_count: 79, migrations: CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.filter(beforeAuthority),
}), HISTORICAL_CATALOG_SHA256);

export function createOutlookAuthorityPostgresFixture(t, options = {}) {
  return createMigratedPostgresFixture(t, {
    ...options,
    foundationMigrations: listPostgresFoundationMigrations().filter(({ id }) => id !== CORPORATE),
    outlookAuthorityAdmin: true,
  });
}

export function runHistoricalHrxPostgresMigrations(pool, options = {}) {
  return runPostgresMigrations(pool, {
    ...options,
    migrations: [
      ...listPostgresFoundationMigrations().filter(({ id }) => id !== CORPORATE),
      ...listHrxPostgresMigrations(),
    ],
  });
}

function authorityOptions(fixture, migrationCatalogSha256) {
  return {
    approvedTenantIds: ["tenant_amic_matter_vault"],
    assignmentPassword: "fixture-outlook-assignment-password",
    authorityManifestSha256: OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
    controlPassword: "fixture-outlook-control-password",
    databaseTargetReceiptSha256: "d".repeat(64),
    lifecycleVerifierPassword: "fixture-outlook-lifecycle-password",
    migrationCatalogSha256,
    tenantContextSecret: Buffer.from(fixture.tenantContextSecret, "utf8"),
  };
}

async function runHistoricalMigrations(fixture, appliedBy) {
  const input = authorityOptions(fixture, HISTORICAL_CATALOG_SHA256);
  let preflight;
  let applicationRole;
  let pause;
  let replay;
  try {
    return await runPostgresMigrations(fixture.adminPool, {
      migrations: HISTORICAL_MIGRATIONS, appliedBy,
      authorityManifestSha256: input.authorityManifestSha256,
      databaseTargetReceiptSha256: input.databaseTargetReceiptSha256,
      migrationCatalogSha256: HISTORICAL_CATALOG_SHA256,
      async onBeforeMigrations(client) {
        replay = (await client.query(`SELECT EXISTS (SELECT 1 FROM lawos_meta.schema_migrations
          WHERE migration_id='306_client_outlook_desktop_assignment') AS applied`)).rows[0].applied;
        preflight = await verifyOutlookAssignmentMigrationPreflight(client, {
          authority_catalog: AUTHORITY, phase: replay ? "post_migration" : "pre_migration",
        });
        applicationRole = await verifyLawosOutlookApplicationRolePrecondition(client, {
          migrationAdminRole: AUTHORITY.migration_admin,
          expectedApplicationMembershipPresent: preflight.lawos_app_membership_present,
        });
        if (replay) {
          pause = await readOutlookAssignmentMigrationPauseExpectation(client);
          return pause;
        }
      },
      async onOutlookAuthorityPaused(client) {
        const readiness = await configureLawosOutlookDatabaseRoles(client, {
          migrationAdminRole: AUTHORITY.migration_admin,
          migration: { catalog_id: AUTHORITY.bootstrap_receipt.migration_catalog_id,
            schema_version: AUTHORITY.bootstrap_receipt.migration_schema_version,
            target_schema: AUTHORITY.schema.name },
          applicationRolePrecondition: applicationRole,
          approvedTenantIds: input.approvedTenantIds,
          controlPassword: input.controlPassword,
          assignmentPassword: input.assignmentPassword,
          lifecycleVerifierPassword: input.lifecycleVerifierPassword,
          tenantContextSecret: input.tenantContextSecret,
        });
        pause = createOutlookAssignmentMigrationPauseExpectation({
          role_bootstrap_sha256: readiness.role_bootstrap_sha256,
          authority_manifest_sha256: input.authorityManifestSha256,
          database_target_receipt_sha256: input.databaseTargetReceiptSha256,
          migration_catalog_sha256: HISTORICAL_CATALOG_SHA256,
        });
        return pause;
      },
      onOutlookAuthorityPostMigration: (client) => verifyOutlookAssignmentMigrationPostflight(client, {
        authority_catalog: AUTHORITY, pause_expectation: pause,
        migration_preflight: preflight, transaction_mode: replay ? "read_only" : "write",
      }),
    });
  } finally {
    input.tenantContextSecret.fill(0);
  }
}

export async function runOutlookAuthorityPostgresMigrations(fixture, {
  appliedBy = "outlook-authority-postgres-fixture",
  onStage,
} = {}) {
  const initialCount = (await fixture.adminPool.query(
    "SELECT count(*)::integer AS count FROM lawos_meta.schema_migrations",
  )).rows[0].count;
  if (initialCount < 79) {
    const historical = await runHistoricalMigrations(fixture, `${appliedBy}-historical79`);
    await onStage?.("historical79", historical);
  }
  let result;
  for (const [stage, digest] of [
    ...(initialCount < 80 ? [["authority80", AUTHORITY_CATALOG_SHA256]] : []),
    ["combined81", CLIENT_OPERATIONS_MIGRATION_CATALOG_SHA256],
  ]) {
    const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter(authorityOptions(fixture, digest));
    try {
      result = adapter.normalizeRunReceipt(await runClientOperationsPostgresMigrations(
        fixture.adminPool, { appliedBy: `${appliedBy}-${stage}`, ...adapter.runnerOptions },
      ));
      await onStage?.(stage, result);
    } finally {
      adapter.dispose();
    }
  }
  return result;
}
