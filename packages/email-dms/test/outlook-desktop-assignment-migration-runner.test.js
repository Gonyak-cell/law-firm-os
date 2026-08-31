import assert from "node:assert/strict";
import test from "node:test";

import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { listPostgresFoundationMigrations } from "../../persistence/src/postgres/migration-catalog.js";
import {
  assertOutlookAuthorityMigrationFailureReceipt,
  assertOutlookAuthorityMigrationRunReceipt,
  runPostgresMigrations,
} from "../../persistence/src/postgres/migration-runner.js";
import {
  closeOutlookAuthorityMigrationCatalog,
} from "../../persistence/src/postgres/outlook-authority-migration-seam.js";
import {
  createOutlookAssignmentMigrationPauseExpectation,
  readOutlookAssignmentMigrationPauseExpectation,
  readOutlookAssignmentBootstrapAuthority,
} from "../src/outlook-desktop-assignment-bootstrap-authority.js";
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG,
  OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS,
  OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256,
  assertOutlookDesktopAssignmentAuthorityCatalog,
  createOutlookDesktopAssignmentAuthorityCatalogExpectation,
} from "../src/outlook-desktop-assignment-authority-catalog.js";
import {
  verifyOutlookAssignmentMigrationPreflight,
} from "../src/outlook-desktop-assignment-authority-readback.js";
import { verifyOutlookAssignmentMigrationPostflight } from "../src/outlook-desktop-assignment-migration-postflight.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  createEmailDmsMigrationFixture,
  provisionEmailDmsMigrationRoles,
} from "./support/postgres-email-dms-migration-fixture.js";

const TEST_AUTHORITY_CATALOG =
  createOutlookDesktopAssignmentAuthorityCatalogExpectation({
    database_name: "postgres",
  });

const CLIENT_IDS = Object.freeze({
  "001_m365_connection": "300_client_m365_connection",
  "002_inquiry_evidence": "301_client_inquiry_evidence",
  "003_email_filing_correction": "302_client_email_filing_correction",
  "004_outlook_conversation_sync": "303_client_outlook_conversation_sync",
  "005_outlook_desktop_installation": "304_client_outlook_desktop_installation",
  "006_outlook_desktop_release_trust": "305_client_outlook_desktop_release_trust",
  "007_outlook_desktop_assignment": "306_client_outlook_desktop_assignment",
  "008_outlook_desktop_trusted_current_read":
    "307_client_outlook_desktop_trusted_current_read",
  "009_outlook_desktop_legacy_windows_compatibility":
    "308_client_outlook_desktop_legacy_windows_compatibility",
});

function combinedCatalog() {
  return Object.freeze([
    ...listPostgresFoundationMigrations(),
    ...listEmailDmsPostgresMigrations().map((migration) => Object.freeze({
      ...migration,
      id: CLIENT_IDS[migration.id],
      source_migration_id: migration.id,
    })),
  ]);
}

function sameClientPool(client) {
  const proxy = Object.freeze({
    query: client.query.bind(client),
    release() {},
  });
  return Object.freeze({
    query: proxy.query,
    connect: async () => proxy,
  });
}

async function configureAndReadBootstrap(client) {
  const pool = sameClientPool(client);
  await client.query("BEGIN");
  let graph;
  try {
    graph = await provisionEmailDmsMigrationRoles(pool);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
  return readOutlookAssignmentBootstrapAuthority(pool, {
    database_name: "postgres",
    bootstrap_grantor: graph.bootstrap_grantor,
    lawos_app_membership_present: graph.lawos_app_membership_present,
  });
}

async function runSeamA(fixture, { rejectPostflight = false } = {}) {
  const migrations = combinedCatalog();
  const authorityManifestSha256 = hashDomainValue(TEST_AUTHORITY_CATALOG);
  const migrationCatalogSha256 = hashDomainValue(
    closeOutlookAuthorityMigrationCatalog(migrations),
  );
  let pauseExpectation;
  let migrationPreflight;
  let replay = false;
  let callbackCatalog;
  return runPostgresMigrations(fixture.adminPool, {
    migrations,
    appliedBy: "outlook-authority-seam-a-test",
    authorityManifestSha256,
    databaseTargetReceiptSha256: "d".repeat(64),
    migrationCatalogSha256,
    async onBeforeMigrations(client, catalog) {
      callbackCatalog = catalog;
      const row = (await client.query(
        `SELECT session_user,current_user,
                to_regnamespace('lawos_email_dms') IS NULL AS email_schema_absent,
                EXISTS (SELECT 1 FROM lawos_meta.schema_migrations
                         WHERE migration_id=
                           '306_client_outlook_desktop_assignment') AS replay`,
      )).rows[0];
      assert.equal(row.session_user, "lawos_admin");
      assert.equal(row.current_user, "lawos_admin");
      replay = row.replay;
      assert.equal(row.email_schema_absent, !replay);
      migrationPreflight = await verifyOutlookAssignmentMigrationPreflight(
        client,
        {
          authority_catalog: TEST_AUTHORITY_CATALOG,
          phase: replay ? "post_migration" : "pre_migration",
        },
      );
      assert.match(migrationPreflight.tenant_context_authority_facts_sha256,
        /^[a-f0-9]{64}$/u);
      assert.match(migrationPreflight.material.tenant_context.hmac.oid,
        /^[1-9][0-9]*$/u);
      assert.equal(
        migrationPreflight.material.tenant_context.hmac.owner.length > 0,
        true,
      );
      if (replay) {
        pauseExpectation =
          await readOutlookAssignmentMigrationPauseExpectation(client);
        return pauseExpectation;
      }
      return undefined;
    },
    async onOutlookAuthorityPaused(client, catalog) {
      assert.equal(catalog, callbackCatalog);
      const roleBootstrap = await configureAndReadBootstrap(client);
      pauseExpectation = createOutlookAssignmentMigrationPauseExpectation({
        role_bootstrap_sha256: roleBootstrap.role_bootstrap_sha256,
        authority_manifest_sha256: authorityManifestSha256,
        database_target_receipt_sha256: "d".repeat(64),
        migration_catalog_sha256: migrationCatalogSha256,
      });
      return pauseExpectation;
    },
    async onOutlookAuthorityPostMigration(client, catalog) {
      assert.equal(catalog, callbackCatalog);
      const postflight = await verifyOutlookAssignmentMigrationPostflight(
        client,
        {
          authority_catalog: TEST_AUTHORITY_CATALOG,
          migration_preflight: migrationPreflight,
          pause_expectation: pauseExpectation,
          transaction_mode: replay ? "read_only" : "write",
        },
      );
      if (rejectPostflight) throw new Error("injected_outlook_postflight_failure");
      return postflight;
    },
  });
}

test("authority catalog closes the portable tenant-context dependency", () => {
  assert.equal(
    assertOutlookDesktopAssignmentAuthorityCatalog(
      OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG,
    ),
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG,
  );
  assert.equal(
    createOutlookDesktopAssignmentAuthorityCatalogExpectation({
      database_name: "postgres",
    }).database.name,
    "postgres",
  );
  assert.deepEqual(
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.tenant_context_authority
      .search_paths,
    {
      pre_migration: "search_path=pg_catalog, lawos_security, public",
      post_migration: "search_path=pg_catalog, lawos_security",
    },
  );
  assert.equal(
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.tenant_context_authority
      .hmac.oid_binding,
    "live_exact",
  );
  assert.deepEqual(
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG.bootstrap_receipt
      .expected_digest_fields,
    [
      "role_bootstrap_sha256",
      "authority_manifest_sha256",
      "database_target_receipt_sha256",
      "migration_catalog_sha256",
    ],
  );
  assert.equal(
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG
      .security_definer_functions_sha256,
    OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256,
  );
  assert.equal(
    hashDomainValue(OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS),
    OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS_SHA256,
  );
  assert.throws(
    () => assertOutlookDesktopAssignmentAuthorityCatalog({
      ...OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG,
      tenant_context_authority: {},
    }),
    /authority catalog is invalid/u,
  );
});

test("Seam A verifies a zero-mutation exact replay", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  const first = await runSeamA(fixture);
  assert.equal(first.outcome, "committed");
  assert.equal(first.database_target_receipt_sha256, "d".repeat(64));
  const replay = assertOutlookAuthorityMigrationRunReceipt(
    await runSeamA(fixture),
    { session_user: "lawos_admin", migration_catalog: combinedCatalog() },
  );
  assert.equal(replay.outcome, "verified");
  assert.equal(replay.migration_applied_count, 0);
  assert.equal(replay.role_configuration_transaction_committed_count, 0);
  assert.equal(replay.postgres_mutation_attempt_count, 0);
  assert.equal(replay.postgres_mutation_committed_count, 0);
  assert.equal(replay.outlook_assignment_transaction_committed, false);
  assert.equal(replay.migrations.every(({ applied }) => applied === false), true);
  assert.equal(replay.role_bootstrap_sha256, first.role_bootstrap_sha256);
  assert.equal(replay.database_target_receipt_sha256,
    first.database_target_receipt_sha256);
  assert.match(replay.authority_postflight_sha256, /^[a-f0-9]{64}$/u);
  assert.notEqual(replay.authority_postflight_sha256,
    first.authority_postflight_sha256);
});

test("Seam A rejects a divergent persisted target receipt without mutation", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  await runSeamA(fixture);

  const observer = await fixture.bootstrapPool.connect();
  try {
    await observer.query("BEGIN");
    await observer.query(
      "ALTER TABLE lawos_meta.outlook_authority_bootstrap_receipts DISABLE TRIGGER USER",
    );
    await observer.query(
      `UPDATE lawos_meta.outlook_authority_bootstrap_receipts
          SET database_target_receipt_sha256=$1`,
      ["e".repeat(64)],
    );
    await observer.query(
      "ALTER TABLE lawos_meta.outlook_authority_bootstrap_receipts ENABLE TRIGGER USER",
    );
    await observer.query("COMMIT");
  } catch (error) {
    await observer.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    observer.release();
  }

  await assert.rejects(runSeamA(fixture), (error) => {
    assert.match(error.message, /signed digest mismatch/iu);
    const failure = assertOutlookAuthorityMigrationFailureReceipt(
      error.outlook_authority_failure,
      { database_target_receipt_sha256: "d".repeat(64) },
    );
    assert.equal(failure.outcome, "failed");
    assert.equal(failure.migration_applied_count, 0);
    assert.equal(failure.postgres_mutation_attempt_count, 0);
    assert.equal(failure.postgres_mutation_committed_count, 0);
    return true;
  });
  assert.equal((await fixture.bootstrapPool.query(
    "SELECT count(*)::integer AS count FROM lawos_meta.schema_migrations",
  )).rows[0].count, combinedCatalog().length);
});

test("Seam A commits exact 001-006, role bootstrap, and 007-009 on one client", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  const receipt = assertOutlookAuthorityMigrationRunReceipt(
    await runSeamA(fixture),
    { session_user: "lawos_admin", migration_catalog: combinedCatalog() },
  );
  const assignment = receipt.migrations.find(
    ({ id }) => id === "306_client_outlook_desktop_assignment",
  );
  const trustedCurrent = receipt.migrations.find(
    ({ id }) => id === "307_client_outlook_desktop_trusted_current_read",
  );
  const legacyWindowsCompatibility = receipt.migrations.find(
    ({ id }) => id ===
      "308_client_outlook_desktop_legacy_windows_compatibility",
  );
  assert.equal(assignment?.applied, true);
  assert.equal(trustedCurrent?.applied, true);
  assert.equal(legacyWindowsCompatibility?.applied, true);
  assert.equal(receipt.outlook_assignment_transaction_committed, true);
  assert.equal(receipt.role_bootstrap_sha256,
    receipt.postflight_role_bootstrap_sha256);
  assert.equal((await fixture.adminPool.query(
    `SELECT count(*)::integer AS count FROM lawos_meta.schema_migrations
      WHERE migration_id='306_client_outlook_desktop_assignment'`,
  )).rows[0].count, 1);
});

test("Seam A reports committed role setup but rolls back failed 007 atomically", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  await assert.rejects(runSeamA(fixture, { rejectPostflight: true }), (error) => {
    assert.equal(error.message, "injected_outlook_postflight_failure");
    const failure = assertOutlookAuthorityMigrationFailureReceipt(
      error.outlook_authority_failure,
      { session_user: "lawos_admin", migration_catalog: combinedCatalog() },
    );
    assert.equal(failure.outcome, "partial");
    assert.equal(failure.role_configuration_transaction_committed_count, 1);
    assert.equal(failure.outlook_assignment_transaction_committed, false);
    assert.equal(failure.migrations.some(
      ({ id }) => id === "305_client_outlook_desktop_release_trust",
    ), true);
    assert.equal(failure.migrations.some(
      ({ id }) => id === "306_client_outlook_desktop_assignment"
        || id === "307_client_outlook_desktop_trusted_current_read"
        || id ===
          "308_client_outlook_desktop_legacy_windows_compatibility",
    ), false);
    return true;
  });
  const state = (await fixture.adminPool.query(
    `SELECT
       to_regclass('lawos_meta.outlook_authority_bootstrap_receipts') IS NULL
         AS receipt_absent,
       NOT EXISTS (SELECT 1 FROM lawos_meta.schema_migrations
                    WHERE migration_id='306_client_outlook_desktop_assignment')
         AS history_absent,
       NOT EXISTS (
         SELECT 1 FROM pg_auth_members
          WHERE roleid='lawos_outlook_authority_owner'::regrole
            AND member='lawos_admin'::regrole
            AND grantor='lawos_admin'::regrole
       ) AS temporary_set_absent,
       to_regclass('lawos_email_dms.outlook_desktop_release_artifacts')
         IS NOT NULL AS release_table_preserved`,
  )).rows[0];
  assert.deepEqual(state, {
    receipt_absent: true,
    history_absent: true,
    temporary_set_absent: true,
    release_table_preserved: true,
  });
});
