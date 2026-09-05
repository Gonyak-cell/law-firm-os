import assert from "node:assert/strict";
import test from "node:test";

import { OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256 } from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import { listPostgresFoundationMigrations } from "../../../packages/persistence/src/postgres/migration-catalog.js";
import { assertOutlookAuthorityMigrationFailureReceipt, assertOutlookAuthorityMigrationRunReceipt, createOutlookPostgresRoleConfigurationCommitUnknownError, runPostgresMigrations } from "../../../packages/persistence/src/postgres/migration-runner.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import { startDisposablePostgres } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  CLIENT_OPERATIONS_MIGRATION_CATALOG,
  listClientOperationsPostgresMigrations,
  runClientOperationsPostgresMigrations,
  selectClientOperationsMigrationTarget,
} from "../src/client-operations-schema.js";
import { createJsonPostgresOutlookAuthorityMigrationAdapter } from "../src/json-postgres-outlook-authority-migration-adapter.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG as AUTHORITY } from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import { createOutlookAssignmentMigrationPauseExpectation, readOutlookAssignmentMigrationPauseExpectation } from "../../../packages/email-dms/src/outlook-desktop-assignment-bootstrap-authority.js";
import { verifyOutlookAssignmentMigrationPreflight } from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-readback.js";
import { verifyOutlookAssignmentMigrationPostflight } from "../../../packages/email-dms/src/outlook-desktop-assignment-migration-postflight.js";
import { configureLawosOutlookDatabaseRoles, verifyLawosOutlookApplicationRolePrecondition } from "../../../packages/persistence/src/postgres/outlook-authority-roles.js";

const TARGET_SHA = "d".repeat(64);
const CATALOG_SHA = "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79";
const AUTHORITY_TARGET = selectClientOperationsMigrationTarget(CATALOG_SHA);
const HISTORICAL_MIGRATIONS = AUTHORITY_TARGET.migrations.filter(({ id }) =>
  id !== "309_client_internal_unsigned_installation_authority");
const HISTORICAL_CATALOG_SHA = hashDomainValue({
  ...AUTHORITY_TARGET.catalog,
  migration_count: 79,
  migrations: AUTHORITY_TARGET.catalog.migrations.filter(({ id }) =>
    id !== "309_client_internal_unsigned_installation_authority"),
});

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
  let observer;
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
    await runPostgresMigrations(admin, { appliedBy: label,
      migrations: listPostgresFoundationMigrations().filter(({ id }) =>
        id !== "016_dms_corporate_workspace") });
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
    url.username = instance.username;
    observer = createPostgresPool({ connectionString: url.toString(),
      sslMode: "disable", allowInsecureLocal: true,
      applicationName: `${label}-observer`, max: 1 });
  } catch (error) {
    await admin?.end().catch(() => {});
    await observer?.end().catch(() => {});
    await bootstrap?.end().catch(() => {});
    await instance.stop();
    throw error;
  }
  t.after(async () => {
    await admin.end().catch(() => {});
    await observer.end().catch(() => {});
    await bootstrap.end().catch(() => {});
    await instance.stop();
  });
  return { admin, observer };
}

async function runHistoricalCatalog(state, pool = state.admin) {
  const input = options();
  let preflight;
  let applicationRole;
  let pause;
  let replay;
  const raw = await runPostgresMigrations(pool, {
    migrations: HISTORICAL_MIGRATIONS, appliedBy: "historical-79-authority-fixture",
    authorityManifestSha256: input.value.authorityManifestSha256,
    databaseTargetReceiptSha256: TARGET_SHA,
    migrationCatalogSha256: HISTORICAL_CATALOG_SHA,
    async onBeforeMigrations(client) {
      replay = (await client.query(`SELECT EXISTS (
        SELECT 1 FROM lawos_meta.schema_migrations
        WHERE migration_id='306_client_outlook_desktop_assignment') AS applied`
      )).rows[0].applied;
      preflight = await verifyOutlookAssignmentMigrationPreflight(client, {
        authority_catalog: AUTHORITY,
        phase: replay ? "post_migration" : "pre_migration",
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
        approvedTenantIds: input.value.approvedTenantIds,
        controlPassword: input.value.controlPassword,
        assignmentPassword: input.value.assignmentPassword,
        lifecycleVerifierPassword: input.value.lifecycleVerifierPassword,
        tenantContextSecret: input.secret,
        createRoleConfigurationCommitUnknownError: (observed) =>
          createOutlookPostgresRoleConfigurationCommitUnknownError(
            createOutlookAssignmentMigrationPauseExpectation({
              role_bootstrap_sha256: observed.role_bootstrap_sha256,
              authority_manifest_sha256: input.value.authorityManifestSha256,
              database_target_receipt_sha256: TARGET_SHA,
              migration_catalog_sha256: HISTORICAL_CATALOG_SHA,
            }),
          ),
      });
      pause = createOutlookAssignmentMigrationPauseExpectation({
        role_bootstrap_sha256: readiness.role_bootstrap_sha256,
        authority_manifest_sha256: input.value.authorityManifestSha256,
        database_target_receipt_sha256: TARGET_SHA,
        migration_catalog_sha256: HISTORICAL_CATALOG_SHA,
      });
      return pause;
    },
    onOutlookAuthorityPostMigration: (client) =>
      verifyOutlookAssignmentMigrationPostflight(client, {
        authority_catalog: AUTHORITY, pause_expectation: pause,
        migration_preflight: preflight,
        transaction_mode: replay ? "read_only" : "write",
      }),
  }).finally(() => input.secret.fill(0));
  return raw;
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
  const catalog = AUTHORITY_TARGET.migrations;
  const assignmentIndex = catalog.findIndex(
    ({ id }) => id === "306_client_outlook_desktop_assignment",
  );
  assert.equal(catalog.length, 80);
  assert.equal(assignmentIndex, 76);
  await runPostgresMigrations(state.admin, {
    migrations: catalog.slice(0, assignmentIndex), appliedBy: label,
  });
  assert.equal((await state.admin.query(
    "SELECT count(*)::int AS count FROM lawos_meta.schema_migrations",
  )).rows[0].count, 76);
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

test("the complete 80-row and 81-row catalogs cannot bypass authority callbacks", async () => {
  let connected = false;
  await assert.rejects(runClientOperationsPostgresMigrations({ async connect() {
    connected = true;
    throw new Error("must not connect");
  } }), /authority callbacks are required/u);
  assert.equal(connected, false);
  for (const catalog of [AUTHORITY_TARGET.migrations,
    listClientOperationsPostgresMigrations()]) {
    await assert.rejects(runPostgresMigrations({ async connect() {
      connected = true;
      throw new Error("must not connect");
    } }, { migrations: [...catalog.slice(0, -1), {
      ...catalog.at(-1), sql: "SELECT 1",
    }] }), /authority callbacks are required/u);
    assert.equal(connected, false);
    for (const migrations of [catalog, [...catalog.slice(0, -1), {
      ...catalog.at(-1), sql: `${catalog.at(-1).sql}\n-- unreviewed alteration`,
    }]]) {
      await assert.rejects(runPostgresMigrations({ async connect() {
        connected = true;
        throw new Error("must not connect");
      } }, {
        migrations,
        authorityManifestSha256: OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
        databaseTargetReceiptSha256: TARGET_SHA,
        migrationCatalogSha256: catalog.length === 80
          ? CATALOG_SHA : hashDomainValue(CLIENT_OPERATIONS_MIGRATION_CATALOG),
        onBeforeMigrations: async () => {},
        onOutlookAuthorityPaused: async () => {},
        onOutlookAuthorityPostMigration: async () => {},
      }), /exact reviewed catalog/u);
      assert.equal(connected, false);
    }
  }
});

for (const initialCount of [15, 76]) {
  test(`migration adapter rejects ${initialCount}-to-80 without database writes`, async (t) => {
    const state = await fixture(t, `outlook-authority-adapter-${initialCount}-80`);
    if (!state) return;
    if (initialCount === 76) await applyPrefixThrough305(state, "outlook-adapter-prefix");
    const before = (await state.admin.query(
      "SELECT * FROM lawos_meta.schema_migrations ORDER BY migration_id",
    )).rows;
    assert.equal(before.length, initialCount);
    const statements = [];
    const observedPool = { async connect() {
      const client = await state.admin.connect();
      return { async query(sql, values) {
        statements.push(String(sql).replace(/\s+/gu, " ").trim());
        return client.query(sql, values);
      }, release: client.release.bind(client) };
    } };
    const input = options();
    const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter(input.value);
    try {
      await assert.rejects(runClientOperationsPostgresMigrations(observedPool, {
        appliedBy: `outlook-adapter-${initialCount}-80`, ...adapter.runnerOptions,
      }), /exact prior or replay catalog/u);
    } finally { adapter.dispose(); }
    assert.ok(statements.length > 0);
    assert.ok(statements.every((sql) => /^(?:SELECT\b|BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY$|COMMIT$)/u.test(sql)));
    assert.deepEqual((await state.admin.query(
      "SELECT * FROM lawos_meta.schema_migrations ORDER BY migration_id",
    )).rows, before);
    assert.ok(input.secret.every((byte) => byte === 0));
  });
}

test("historical 007 role bootstrap preserves COMMIT unknown without rollback", async (t) => {
  const state = await fixture(t, "outlook-authority-adapter-commit-unknown");
  if (!state) return;
  await applyPrefixThrough305(state, "outlook-adapter-unknown-prefix");
  const lossy = lossyRoleCommitPool(state.admin);
  let failure;
  try {
    await runHistoricalCatalog(state, lossy.pool);
    assert.fail("role COMMIT response loss must fail closed");
  } catch (error) {
    failure = assertOutlookAuthorityMigrationFailureReceipt(
      error.outlook_authority_failure,
    );
  }
  assert.equal(failure.migration_catalog_sha256, HISTORICAL_CATALOG_SHA);
  assert.equal(failure.failure_safe_error_code, "OUTLOOK_POSTGRES_COMMIT_UNKNOWN");
  assert.equal(failure.failure_phase, "outlook_authority_paused");
  assert.equal(failure.migration_applied_count, 0);
  assert.equal(failure.migrations.length, 76);
  assert.deepEqual(failure.migrations.at(-1), {
    id: "305_client_outlook_desktop_release_trust",
    checksum: CLIENT_OPERATIONS_MIGRATION_CATALOG.migrations.find(
      ({ id }) => id === "305_client_outlook_desktop_release_trust",
    ).checksum,
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
});

test("migration adapter preserves the signed 79-row authority while appending only 309", async (t) => {
  const state = await fixture(t, "outlook-authority-adapter-79-80");
  if (!state) return;
  assert.equal(HISTORICAL_CATALOG_SHA,
    "43c6a087834d9dd2177be0b63fc94cf723181b93b04f40a65689b6431bd44556");
  const historical = await runHistoricalCatalog(state);
  assert.equal(historical.outcome, "committed");
  assert.equal(historical.migrations.length, 79);
  assert.equal(historical.migration_applied_count, 64);
  assert.equal(historical.role_configuration_transaction_committed_count, 1);
  assert.equal(historical.postgres_mutation_committed_count, 65);
  assert.equal(historical.database_target_receipt_sha256, TARGET_SHA);
  assert.equal(historical.migration_catalog_sha256, HISTORICAL_CATALOG_SHA);
  assert.equal(historical.authority_manifest_sha256,
    OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256);
  assert.equal(historical.role_bootstrap_sha256,
    historical.postflight_role_bootstrap_sha256);
  const historicalReplay = await runHistoricalCatalog(state);
  assert.equal(historicalReplay.outcome, "verified");
  assert.equal(historicalReplay.migration_applied_count, 0);
  assert.equal(historicalReplay.postgres_mutation_committed_count, 0);
  assert.equal(historicalReplay.role_bootstrap_sha256,
    historical.role_bootstrap_sha256);
  const before = await state.admin.query(
    "SELECT * FROM lawos_meta.schema_migrations ORDER BY migration_id",
  );
  const originalPause = await readOutlookAssignmentMigrationPauseExpectation(state.observer);
  const run = async (overrides = {}, catalog = null) => {
    const input = options();
    const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter({
      ...input.value, ...overrides,
    });
    try {
      const raw = catalog
        ? await runPostgresMigrations(state.admin, {
          migrations: catalog, ...adapter.runnerOptions,
        })
        : await runClientOperationsPostgresMigrations(state.admin,
          adapter.runnerOptions);
      const receipt = adapter.normalizeRunReceipt(raw);
      assert.equal(adapter.getRoleReadiness().role_bootstrap_sha256,
        receipt.role_bootstrap_sha256);
      return receipt;
    } finally {
      adapter.dispose();
      assert.ok(input.secret.every((byte) => byte === 0));
    }
  };
  await assert.rejects(run({ databaseTargetReceiptSha256: "c".repeat(64) }),
    /persisted Outlook migration expectation/u);
  for (const field of ["migration_catalog_sha256", "authority_manifest_sha256",
    "database_target_receipt_sha256", "role_bootstrap_sha256"]) {
    const setHistorical = async (value) => {
      await state.observer.query("SET session_replication_role = replica");
      try {
        await state.observer.query(
          `UPDATE lawos_meta.outlook_authority_bootstrap_receipts SET ${field}=$1`, [value],
        );
      } finally { await state.observer.query("SET session_replication_role = origin"); }
    };
    await setHistorical("b".repeat(64));
    try { await assert.rejects(run()); }
    finally { await setHistorical(originalPause[field]); }
  }
  const catalog = AUTHORITY_TARGET.migrations;
  await assert.rejects(run({}, [
    ...catalog.slice(0, -1), { ...catalog.at(-1), sql: "SELECT 1" },
  ]), /exact reviewed catalog/u);
  await assert.rejects(run({}, [
    ...catalog, { id: "310_unknown_append", sql: "SELECT 1" },
  ]), /exact reviewed catalog/u);
  const gap = before.rows.find(({ migration_id }) =>
    migration_id === "012_outlook_document_source_identity");
  await state.admin.query(
    "DELETE FROM lawos_meta.schema_migrations WHERE migration_id=$1", [gap.migration_id],
  );
  try { await assert.rejects(run(), /exact prior or replay catalog/u); }
  finally {
    await state.admin.query(`INSERT INTO lawos_meta.schema_migrations
      (migration_id,checksum,applied_at,applied_by) VALUES ($1,$2,$3,$4)`,
    [gap.migration_id, gap.checksum, gap.applied_at, gap.applied_by]);
  }
  await state.admin.query(
    "UPDATE lawos_meta.schema_migrations SET checksum=$1 WHERE migration_id=$2",
    ["c".repeat(64), gap.migration_id],
  );
  try { await assert.rejects(run(), /checksum mismatch/u); }
  finally {
    await state.admin.query(
      "UPDATE lawos_meta.schema_migrations SET checksum=$1 WHERE migration_id=$2",
      [gap.checksum, gap.migration_id],
    );
  }
  assert.equal((await state.admin.query(
    "SELECT count(*)::int AS count FROM lawos_meta.schema_migrations",
  )).rows[0].count, 79);
  const appended = await run();
  assert.equal(appended.schema_version, "lawos.outlook-authority-migration-run-receipt.v2");
  assert.equal(appended.outcome, "appended");
  assert.equal(appended.historical_migration_catalog_sha256, HISTORICAL_CATALOG_SHA);
  assert.equal(appended.migration_catalog_sha256, CATALOG_SHA);
  assert.equal(appended.migration_applied_count, 1);
  assert.equal(appended.postgres_mutation_committed_count, 1);
  assert.equal(appended.role_configuration_transaction_committed_count, 0);
  assert.equal(appended.outlook_assignment_transaction_committed, false);
  for (const changes of [
    { role_configuration_transaction_committed_count: 1 },
    { postgres_mutation_committed_count: 0 },
    { outlook_assignment_transaction_committed: true },
    { historical_migration_catalog_sha256: "a".repeat(64) },
  ]) {
    const { migration_run_receipt_sha256: ignored, ...material } = { ...appended, ...changes };
    assert.throws(() => assertOutlookAuthorityMigrationRunReceipt({
      ...material, migration_run_receipt_sha256: hashDomainValue(material),
    }), /invalid/u);
  }
  assert.deepEqual((await state.admin.query(
    "SELECT * FROM lawos_meta.schema_migrations ORDER BY migration_id",
  )).rows.slice(0, -1), before.rows);
  assert.deepEqual(await readOutlookAssignmentMigrationPauseExpectation(state.observer),
    originalPause);
  const replay = await run();
  assert.equal(replay.schema_version, appended.schema_version);
  assert.equal(replay.outcome, "verified");
  assert.equal(replay.migration_applied_count, 0);
  assert.equal(replay.postgres_mutation_committed_count, 0);
  assert.equal(replay.historical_migration_catalog_sha256, HISTORICAL_CATALOG_SHA);
  assert.equal(replay.migration_catalog_sha256, CATALOG_SHA);
  await state.admin.query(
    "DELETE FROM lawos_meta.schema_migrations WHERE migration_id=$1", [gap.migration_id],
  );
  try { await assert.rejects(run(), /exact prior or replay catalog/u); }
  finally {
    await state.admin.query(`INSERT INTO lawos_meta.schema_migrations
      (migration_id,checksum,applied_at,applied_by) VALUES ($1,$2,$3,$4)`,
    [gap.migration_id, gap.checksum, gap.applied_at, gap.applied_by]);
  }
  await state.observer.query(`GRANT EXECUTE ON FUNCTION
    lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) TO PUBLIC`);
  try { await assert.rejects(run(), /authority/u); }
  finally {
    await state.observer.query(`REVOKE EXECUTE ON FUNCTION
      lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) FROM PUBLIC`);
  }
  const wrongPhaseInput = options();
  const wrongPhase = createJsonPostgresOutlookAuthorityMigrationAdapter(wrongPhaseInput.value);
  try {
    await assert.rejects(wrongPhase.runnerOptions
      .onInternalUnsignedInstallationAuthorityPostMigration(state.admin, []),
    /callback boundary/u);
  } finally { wrongPhase.dispose(); }
});

test("internal authority postflight failure retains the committed 79-to-80 append", async (t) => {
  const state = await fixture(t, "internal-postflight-failure-79-80");
  if (!state) return;
  await runHistoricalCatalog(state);
  let appendPending = false;
  const observedPool = { async connect() {
    const client = await state.admin.connect();
    return { async query(sql, values) {
      if (String(sql).startsWith("INSERT INTO lawos_meta.schema_migrations")
          && values[0] === "309_client_internal_unsigned_installation_authority") {
        appendPending = true;
      }
      const result = await client.query(sql, values);
      if (appendPending && sql === "COMMIT") {
        appendPending = false;
        await state.observer.query(`GRANT EXECUTE ON FUNCTION
          lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) TO PUBLIC`);
      }
      return result;
    }, release: client.release.bind(client) };
  } };
  const input = options();
  const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter(input.value);
  try {
    await assert.rejects(runClientOperationsPostgresMigrations(observedPool,
      adapter.runnerOptions), (error) => {
      const receipt = adapter.normalizeFailureReceipt(error);
      assert.equal(receipt.failure_phase, "internal_installation_postflight");
      assert.equal(receipt.migration_catalog_sha256, CATALOG_SHA);
      assert.equal(receipt.outcome, "partial");
      assert.equal(receipt.migration_applied_count, 1);
      assert.equal(receipt.role_configuration_transaction_committed_count, 0);
      assert.equal(receipt.outlook_assignment_transaction_committed, false);
      assert.equal(receipt.postgres_mutation_committed_count, 1);
      assert.equal(receipt.migrations.at(-1).applied, true);
      return true;
    });
  } finally {
    adapter.dispose();
    await state.observer.query(`REVOKE EXECUTE ON FUNCTION
      lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) FROM PUBLIC`);
  }
  assert.equal((await state.admin.query(
    "SELECT count(*)::int AS count FROM lawos_meta.schema_migrations",
  )).rows[0].count, 80);
  const replayInput = options();
  const replay = createJsonPostgresOutlookAuthorityMigrationAdapter(replayInput.value);
  try {
    const receipt = replay.normalizeRunReceipt(await runClientOperationsPostgresMigrations(
      state.admin, replay.runnerOptions,
    ));
    assert.equal(receipt.outcome, "verified");
    assert.equal(receipt.postgres_mutation_committed_count, 0);
  } finally { replay.dispose(); }
});
test("309 COMMIT response loss remains unknown after the exact 79-row catalog", async (t) => {
  const state = await fixture(t, "internal-commit-unknown-79-80");
  if (!state) return;
  await runHistoricalCatalog(state);
  let appendPending = false;
  const lossyPool = { async connect() {
    const client = await state.admin.connect();
    return { async query(sql, values) {
      if (String(sql).startsWith("INSERT INTO lawos_meta.schema_migrations")
          && values[0] === "309_client_internal_unsigned_installation_authority") {
        appendPending = true;
      }
      const result = await client.query(sql, values);
      if (appendPending && sql === "COMMIT") {
        appendPending = false;
        throw new Error("synthetic 309 COMMIT response loss");
      }
      return result;
    }, release: client.release.bind(client) };
  } };
  const input = options();
  const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter(input.value);
  try {
    await assert.rejects(runClientOperationsPostgresMigrations(lossyPool,
      adapter.runnerOptions), (error) => {
      const receipt = adapter.normalizeFailureReceipt(error);
      assert.equal(receipt.failure_safe_error_code, "OUTLOOK_POSTGRES_COMMIT_UNKNOWN");
      assert.equal(receipt.migration_catalog_sha256, CATALOG_SHA);
      assert.equal(receipt.outcome, "partial");
      assert.equal(receipt.migration_applied_count, 0);
      assert.equal(receipt.role_configuration_transaction_committed_count, 0);
      assert.equal(receipt.outlook_assignment_transaction_committed, false);
      assert.equal(receipt.postgres_mutation_committed_count, null);
      return true;
    });
  } finally { adapter.dispose(); }
  assert.equal((await state.admin.query(
    "SELECT count(*)::int AS count FROM lawos_meta.schema_migrations",
  )).rows[0].count, 80);
});
