import assert from "node:assert/strict";
import test from "node:test";

import { OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256 } from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import { listPostgresFoundationMigrations } from "../../../packages/persistence/src/postgres/migration-catalog.js";
import { runPostgresMigrations } from "../../../packages/persistence/src/postgres/migration-runner.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import { startDisposablePostgres } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  listClientOperationsPostgresMigrations,
  normalizeClientOperationsMigrationCatalog,
  runClientOperationsPostgresMigrations,
} from "../src/client-operations-schema.js";
import { createJsonPostgresOutlookAuthorityMigrationAdapter } from "../src/json-postgres-outlook-authority-migration-adapter.js";

const TARGET_SHA = "d".repeat(64);
const NORMALIZED_CATALOG = normalizeClientOperationsMigrationCatalog(
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
);
const CATALOG_SHA = NORMALIZED_CATALOG.migration_catalog_sha256;

function options(secret = Buffer.alloc(48, 7)) {
  return { secret, value: {
    approvedTenantIds: ["tenant_amic_matter_vault"],
    assignmentPassword: "assignment-worker-password",
    authorityManifestSha256:
      OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
    controlPassword: "control-operator-password",
    databaseTargetReceiptSha256: TARGET_SHA,
    lifecycleVerifierPassword: "lifecycle-verifier-password",
    migrationCatalogSha256: CATALOG_SHA,
    tenantContextSecret: secret,
  } };
}

async function fixture(t, label) {
  const instance = await startDisposablePostgres(t, { registerCleanup: false });
  if (!instance) return null;
  let bootstrap;
  let admin;
  try {
    bootstrap = createPostgresPool({ connectionString: instance.connection_string,
      sslMode: "disable", allowInsecureLocal: true,
      applicationName: `${label}-bootstrap`, max: 1 });
    await bootstrap.query(`CREATE ROLE lawos_admin LOGIN NOSUPERUSER CREATEDB
      CREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
    await bootstrap.query("CREATE DATABASE lawos OWNER lawos_admin");
    const url = new URL(instance.connection_string);
    url.username = "lawos_admin";
    url.pathname = "/lawos";
    admin = createPostgresPool({ connectionString: url.toString(),
      sslMode: "disable", allowInsecureLocal: true,
      applicationName: label, max: 1 });
    await runPostgresMigrations(admin, { appliedBy: label });
    await admin.query(`CREATE ROLE lawos_app LOGIN NOSUPERUSER NOCREATEDB
      NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 64
      PASSWORD 'application-password'`);
    await admin.query("ALTER ROLE lawos_app SET statement_timeout = '30s'");
    await admin.query("ALTER ROLE lawos_app SET lock_timeout = '5s'");
    await admin.query(
      "ALTER ROLE lawos_app SET idle_in_transaction_session_timeout = '30s'",
    );
    await bootstrap.query(
      "ALTER DATABASE lawos SET lawos.environment = 'synthetic-test'",
    );
  } catch (error) {
    await admin?.end().catch(() => {});
    await bootstrap?.end().catch(() => {});
    await instance.stop();
    throw error;
  }
  t.after(async () => {
    await admin.end().catch(() => {});
    await bootstrap.end().catch(() => {});
    await instance.stop();
  });
  return { admin };
}

function lossyRoleCommitPool(pool) {
  const statements = [];
  let armed = false;
  return { statements, pool: { async connect() {
    const client = await pool.connect();
    return { async query(sql, values) {
      const statement = String(sql).replace(/\s+/gu, " ").trim();
      statements.push(statement);
      if (statement.startsWith(
        "INSERT INTO lawos_security.tenant_context_authorities",
      )) armed = true;
      const result = await client.query(sql, values);
      if (armed && statement === "COMMIT") {
        armed = false;
        throw new Error("synthetic role COMMIT response loss");
      }
      return result;
    }, release: client.release.bind(client) };
  } } };
}

async function applyPrefixThrough305(state, label) {
  const catalog = listClientOperationsPostgresMigrations();
  assert.equal(catalog.length, 76);
  await runPostgresMigrations(state.admin, {
    migrations: catalog.slice(0, -1), appliedBy: label,
  });
  assert.equal((await state.admin.query(
    "SELECT count(*)::int AS count FROM lawos_meta.schema_migrations",
  )).rows[0].count, 75);
}

test("migration adapter fails closed and clears its caller-owned secret", () => {
  const input = options();
  assert.throws(() => createJsonPostgresOutlookAuthorityMigrationAdapter({
    ...input.value, authorityManifestSha256: "a".repeat(64),
  }), /reviewed catalog/u);
  assert.ok(input.secret.every((byte) => byte === 0));
  const catalogInput = options();
  assert.throws(() => createJsonPostgresOutlookAuthorityMigrationAdapter({
    ...catalogInput.value, migrationCatalogSha256: "e".repeat(64),
  }), /migration manifest/u);
  assert.ok(catalogInput.secret.every((byte) => byte === 0));
});

test("migration adapter runs 001-006, role bootstrap, 007, then exact replay", async (t) => {
  const state = await fixture(t, "outlook-authority-adapter-fresh");
  if (!state) return;
  const firstInput = options();
  const first = createJsonPostgresOutlookAuthorityMigrationAdapter(firstInput.value);
  let raw;
  try {
    raw = await runClientOperationsPostgresMigrations(state.admin, {
      appliedBy: "outlook-adapter-fresh",
      ...first.runnerOptions,
    });
  } finally { first.dispose(); }
  const receipt = first.normalizeRunReceipt(raw);
  const readiness = first.getRoleReadiness();
  assert.equal(receipt.outcome, "committed");
  assert.equal(receipt.migrations.length, 76);
  assert.equal(receipt.migration_applied_count,
    76 - listPostgresFoundationMigrations().length);
  assert.equal(receipt.role_configuration_transaction_committed_count, 1);
  assert.equal(receipt.postgres_mutation_committed_count,
    receipt.migration_applied_count + 1);
  assert.equal(receipt.database_target_receipt_sha256, TARGET_SHA);
  assert.equal(receipt.migration_catalog_sha256, CATALOG_SHA);
  assert.equal(receipt.authority_manifest_sha256,
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256);
  assert.equal(receipt.role_bootstrap_sha256,
    receipt.postflight_role_bootstrap_sha256);
  assert.equal(readiness.role_bootstrap_sha256,
    receipt.role_bootstrap_sha256);
  assert.ok(firstInput.secret.every((byte) => byte === 0));

  const replayInput = options();
  const replay = createJsonPostgresOutlookAuthorityMigrationAdapter(
    replayInput.value,
  );
  try {
    raw = await runClientOperationsPostgresMigrations(state.admin, {
      appliedBy: "outlook-adapter-replay",
      ...replay.runnerOptions,
    });
  } finally { replay.dispose(); }
  const replayReceipt = replay.normalizeRunReceipt(raw);
  assert.equal(replayReceipt.outcome, "verified");
  assert.equal(replayReceipt.migration_applied_count, 0);
  assert.equal(replayReceipt.postgres_mutation_committed_count, 0);
  assert.equal(replayReceipt.role_bootstrap_sha256,
    receipt.role_bootstrap_sha256);
  assert.equal(replayReceipt.database_target_receipt_sha256, TARGET_SHA);
  assert.ok(replayInput.secret.every((byte) => byte === 0));
});

test("migration adapter applies the exact 75-to-76 transition", async (t) => {
  const state = await fixture(t, "outlook-authority-adapter-75-76");
  if (!state) return;
  await applyPrefixThrough305(state, "outlook-adapter-prefix");
  const input = options();
  const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter(input.value);
  let raw;
  try {
    raw = await runClientOperationsPostgresMigrations(state.admin, {
      appliedBy: "outlook-adapter-75-76", ...adapter.runnerOptions,
    });
  } finally { adapter.dispose(); }
  const receipt = adapter.normalizeRunReceipt(raw);
  assert.equal(receipt.migration_applied_count, 1);
  assert.equal(receipt.migrations.at(-1).id,
    "306_client_outlook_desktop_assignment");
  assert.equal(receipt.migrations.at(-1).applied, true);
  assert.equal(receipt.postgres_mutation_committed_count, 2);
  assert.ok(input.secret.every((byte) => byte === 0));
});

test("migration adapter preserves role COMMIT unknown without rollback", async (t) => {
  const state = await fixture(t, "outlook-authority-adapter-commit-unknown");
  if (!state) return;
  await applyPrefixThrough305(state, "outlook-adapter-unknown-prefix");
  const input = options();
  const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter(input.value);
  const lossy = lossyRoleCommitPool(state.admin);
  let failure;
  try {
    await runClientOperationsPostgresMigrations(lossy.pool, {
      appliedBy: "outlook-adapter-commit-unknown",
      ...adapter.runnerOptions,
    });
    assert.fail("role COMMIT response loss must fail closed");
  } catch (error) {
    failure = adapter.normalizeFailureReceipt(error);
  } finally { adapter.dispose(); }
  assert.equal(failure.failure_phase, "outlook_authority_paused");
  assert.equal(failure.migration_applied_count, 0);
  assert.equal(failure.migrations.length, 75);
  assert.deepEqual(failure.migrations.at(-1), {
    id: "305_client_outlook_desktop_release_trust",
    checksum: CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.at(-2).checksum,
    applied: false,
  });
  assert.equal(failure.role_configuration_transaction_committed_count, null);
  assert.equal(failure.postgres_mutation_committed_count, null);
  const commit = lossy.statements.findLastIndex((value) => value === "COMMIT");
  assert.equal(lossy.statements.slice(commit + 1).includes("ROLLBACK"), false);
  const poststate = (await state.admin.query(
    `SELECT NOT EXISTS (
              SELECT 1 FROM lawos_meta.schema_migrations
               WHERE migration_id='306_client_outlook_desktop_assignment'
            ) AS migration_absent,
            to_regclass(
              'lawos_meta.outlook_authority_bootstrap_receipts'
            ) IS NULL AS receipt_absent,
            NOT EXISTS (
              SELECT 1 FROM pg_auth_members AS membership
              JOIN pg_roles AS granted ON granted.oid=membership.roleid
              JOIN pg_roles AS member ON member.oid=membership.member
              JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
               WHERE granted.rolname='lawos_outlook_authority_owner'
                 AND member.rolname='lawos_admin'
                 AND grantor.rolname='lawos_admin'
                 AND membership.set_option
            ) AS self_set_absent`,
  )).rows[0];
  assert.deepEqual(poststate, {
    migration_absent: true, receipt_absent: true, self_set_absent: true,
  });
  assert.ok(input.secret.every((byte) => byte === 0));
});
