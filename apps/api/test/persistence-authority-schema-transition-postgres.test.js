import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { checksumPostgresMigration, listPostgresFoundationMigrations } from "../../../packages/persistence/src/postgres/migration-catalog.js";
import { runPostgresMigrations } from "../../../packages/persistence/src/postgres/migration-runner.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import { startDisposablePostgres } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { configureLawosOutlookDatabaseRoles, verifyLawosOutlookApplicationRolePrecondition } from "../../../packages/persistence/src/postgres/outlook-authority-roles.js";
import { OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG as AUTHORITY, OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256 } from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-catalog.js";
import { createOutlookAssignmentMigrationPauseExpectation, readOutlookAssignmentMigrationPauseExpectation } from "../../../packages/email-dms/src/outlook-desktop-assignment-bootstrap-authority.js";
import { verifyOutlookAssignmentMigrationPreflight } from "../../../packages/email-dms/src/outlook-desktop-assignment-authority-readback.js";
import { verifyOutlookAssignmentMigrationPostflight } from "../../../packages/email-dms/src/outlook-desktop-assignment-migration-postflight.js";
import { INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS } from "../../../packages/email-dms/src/internal-unsigned-installation-authority-catalog.js";
import { signOutlookDesktopLifecycleRequest } from "../../../packages/email-dms/src/outlook-desktop-installation-proof.js";
import { roleDatabaseNow, roleJsonCall } from "../../../packages/email-dms/test/support/postgres-outlook-desktop-assignment-authority-fixture.js";
import { listClientOperationsPostgresMigrations, runClientOperationsPostgresMigrations } from "../src/client-operations-schema.js";
import { createJsonPostgresOutlookAuthorityMigrationAdapter } from "../src/json-postgres-outlook-authority-migration-adapter.js";
import { createInternalUnsignedInstallationRuntimeFromEnv, composeInternalUnsignedInstallationRuntime } from "../src/internal-unsigned-installation-runtime-context.js";
import { createPostgresOutlookDesktopOperationalRuntime } from "../src/outlook-desktop-operational-runtime.js";
import { parseOutlookDesktopAutoconnectRoster } from "../src/outlook-desktop-entitlement.js";
import { verifyOperationalPostgresBridgeMigrationState } from "../src/persistence-authority.js";
import { readJsonPostgresProductionSchemaLedger } from "../src/json-postgres-program-admin-lambda.js";

const INTERNAL = "309_client_internal_unsigned_installation_authority";
const CORPORATE = "016_dms_corporate_workspace";
const HISTORICAL_SHA = "43c6a087834d9dd2177be0b63fc94cf723181b93b04f40a65689b6431bd44556";
const AUTHORITY_SHA = "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79";
const COMBINED_SHA = "8de3211a545ebb7c50813990d15f6abc215ffd23a7d09ba2149d9b37fd96e8c7";
const TARGET_SHA = "d".repeat(64);
const TENANT = "tenant_amic_matter_vault";
const ACTOR = Object.freeze({ tenant_id: TENANT, user_id: "transition-user", entra_subject_id: "transition-subject" });
const digest = (value) => createHash("sha256").update(value).digest("hex");
const historical = listClientOperationsPostgresMigrations().filter(({ id }) => ![CORPORATE, INTERNAL].includes(id));

function adapterOptions(migrationCatalogSha256) {
  return {
    approvedTenantIds: [TENANT], assignmentPassword: "assignment-worker-password",
    authorityManifestSha256: OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
    controlPassword: "control-operator-password", databaseTargetReceiptSha256: TARGET_SHA,
    lifecycleVerifierPassword: "lifecycle-verifier-password", migrationCatalogSha256,
    tenantContextSecret: Buffer.alloc(48, 7),
  };
}

async function historicalFixture(t) {
  const instance = await startDisposablePostgres(t, { registerCleanup: false });
  if (!instance) return null;
  const pools = [];
  t.after(async () => {
    await Promise.all(pools.map((pool) => pool.end().catch(() => {})));
    await instance.stop();
  });
  const poolFor = (role, database = "lawos", password) => {
    const url = new URL(instance.connection_string);
    url.username = role;
    url.pathname = `/${database}`;
    if (password) url.password = password;
    const pool = createPostgresPool({ connectionString: url.toString(), sslMode: "disable",
      allowInsecureLocal: true, applicationName: "actual-schema-transition", max: 1,
      tenantContextSecret: Buffer.alloc(48, 7) });
    pools.push(pool);
    return pool;
  };
  const bootstrap = poolFor(instance.username, "postgres");
  await bootstrap.query(`CREATE ROLE lawos_admin LOGIN NOSUPERUSER CREATEDB
    CREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  await bootstrap.query("CREATE DATABASE lawos OWNER lawos_admin");
  const admin = poolFor("lawos_admin");
  await runPostgresMigrations(admin, { appliedBy: "transition-foundation-before016",
    migrations: listPostgresFoundationMigrations().filter(({ id }) => id !== CORPORATE) });
  await admin.query(`CREATE ROLE lawos_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
    NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 64 PASSWORD 'application-password'`);
  await admin.query("ALTER ROLE lawos_app SET statement_timeout = '30s'");
  await admin.query("ALTER ROLE lawos_app SET lock_timeout = '5s'");
  await admin.query("ALTER ROLE lawos_app SET idle_in_transaction_session_timeout = '30s'");
  await admin.query(`INSERT INTO lawos_security.tenant_context_authorities
    (database_role,tenant_id,context_secret,synthetic_wildcard,active)
    VALUES ('lawos_app',$1,$2,false,true)`, [TENANT, Buffer.alloc(48, 7)]);
  await bootstrap.query("ALTER DATABASE lawos SET lawos.environment = 'synthetic-test'");
  const input = adapterOptions(HISTORICAL_SHA);
  let preflight;
  let applicationRole;
  let pause;
  try {
    await runPostgresMigrations(admin, {
      migrations: historical, appliedBy: "transition-actual-historical79",
      authorityManifestSha256: input.authorityManifestSha256,
      databaseTargetReceiptSha256: TARGET_SHA, migrationCatalogSha256: HISTORICAL_SHA,
      async onBeforeMigrations(client) {
        preflight = await verifyOutlookAssignmentMigrationPreflight(client, {
          authority_catalog: AUTHORITY, phase: "pre_migration",
        });
        applicationRole = await verifyLawosOutlookApplicationRolePrecondition(client, {
          migrationAdminRole: AUTHORITY.migration_admin,
          expectedApplicationMembershipPresent: preflight.lawos_app_membership_present,
        });
      },
      async onOutlookAuthorityPaused(client) {
        const readiness = await configureLawosOutlookDatabaseRoles(client, {
          migrationAdminRole: AUTHORITY.migration_admin,
          migration: { catalog_id: AUTHORITY.bootstrap_receipt.migration_catalog_id,
            schema_version: AUTHORITY.bootstrap_receipt.migration_schema_version,
            target_schema: AUTHORITY.schema.name },
          applicationRolePrecondition: applicationRole, approvedTenantIds: input.approvedTenantIds,
          controlPassword: input.controlPassword, assignmentPassword: input.assignmentPassword,
          lifecycleVerifierPassword: input.lifecycleVerifierPassword,
          tenantContextSecret: input.tenantContextSecret,
        });
        pause = createOutlookAssignmentMigrationPauseExpectation({
          role_bootstrap_sha256: readiness.role_bootstrap_sha256,
          authority_manifest_sha256: input.authorityManifestSha256,
          database_target_receipt_sha256: TARGET_SHA, migration_catalog_sha256: HISTORICAL_SHA,
        });
        return pause;
      },
      onOutlookAuthorityPostMigration: (client) => verifyOutlookAssignmentMigrationPostflight(client, {
        authority_catalog: AUTHORITY, pause_expectation: pause,
        migration_preflight: preflight, transaction_mode: "write",
      }),
    });
  } finally { input.tenantContextSecret.fill(0); }
  return { admin, observer: poolFor(instance.username),
    app: poolFor("lawos_app", "lawos", "application-password"),
    control: poolFor("lawos_outlook_control_operator", "lawos", "control-operator-password") };
}

async function migrate(state, catalogSha, options = {}) {
  const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter({ ...adapterOptions(catalogSha), ...options });
  try {
    const result = await runClientOperationsPostgresMigrations(state.admin, {
      appliedBy: `transition-target-${catalogSha.slice(0, 8)}`, ...adapter.runnerOptions,
    });
    return adapter.normalizeRunReceipt(result);
  } finally { adapter.dispose(); }
}

async function readProtectedBootstrap(state, catalogSha) {
  let readOnlyObserved = false;
  const receipt = await readJsonPostgresProductionSchemaLedger({
    event: { action: "lawos-json-postgres-production-bootstrap", mode: "readback" },
    env: { AWS_REGION: "ap-northeast-2", LAWOS_MASTER_DATABASE_SECRET_ID: "synthetic/master",
      LAWOS_DATABASE_HOST: "localhost", LAWOS_DATABASE_PORT: "5432", LAWOS_DATABASE_NAME: "lawos" },
    authorize: async () => ({ packet: { phase: "w13-production-cutover", packet_sha256: "f".repeat(64),
      bindings: { migration_catalog_sha256: catalogSha } }, exact: { sourceSha: "a".repeat(40), sourceTree: "b".repeat(40) },
      approval: { receipt_sha256: "e".repeat(64) } }),
    resolveSecret: async () => ({ username: "lawos_admin", password: "synthetic-password" }),
    createPool: () => ({ async connect() {
      const client = await state.admin.connect();
      return { async query(sql, parameters) {
        if (String(sql).includes("FROM lawos_meta.outlook_authority_bootstrap_receipts")) {
          assert.equal((await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only, "on");
          readOnlyObserved = true;
        }
        return client.query(sql, parameters);
      }, release: () => client.release() };
    }, async end() {} }),
  });
  assert.equal(readOnlyObserved, true);
  assert.equal(receipt.server_enforced_read_only, true);
  assert.equal(receipt.production_write_count, 0);
  return receipt;
}

async function schemaSnapshot(state) {
  const ledger = (await state.observer.query(`SELECT to_jsonb(row) AS value
    FROM lawos_meta.schema_migrations AS row ORDER BY migration_id`)).rows.map(({ value }) => value);
  const bootstrap = (await state.observer.query(`SELECT to_jsonb(row) AS value
    FROM lawos_meta.outlook_authority_bootstrap_receipts AS row ORDER BY value`)).rows;
  const functions = (await state.observer.query(`SELECT signature,
    pg_get_functiondef(to_regprocedure(signature)) AS definition
    FROM unnest($1::text[]) AS signature ORDER BY signature`,
  [INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS.map(({ signature }) => signature)])).rows;
  const columns = (await state.observer.query(`SELECT table_name,column_name,is_nullable
    FROM information_schema.columns WHERE table_schema='lawos_dms'
    AND table_name IN ('documents','upload_sessions')
    AND column_name IN ('matter_id','workspace_authority_sha256') ORDER BY table_name,column_name`)).rows;
  const triggers = (await state.observer.query(`SELECT tgname,pg_get_triggerdef(oid) AS definition
    FROM pg_trigger WHERE tgname IN ('dms_corporate_workspace_record_guard',
      'dms_corporate_upload_binding','dms_corporate_document_binding') ORDER BY tgname`)).rows;
  return { ledger, bootstrap, functions, columns, triggers };
}

function assertSchema(snapshot, count) {
  const expected = listClientOperationsPostgresMigrations().filter(({ id }) =>
    (count === 81 || id !== CORPORATE) && (count !== 79 || id !== INTERNAL));
  assert.equal(snapshot.ledger.length, count);
  assert.deepEqual(snapshot.ledger.map(({ migration_id, checksum }) => ({ migration_id, checksum })),
    expected.map(({ id, sql }) => ({ migration_id: id, checksum: checksumPostgresMigration(sql) })));
  assert.equal(snapshot.functions.length, 5);
  assert.ok(snapshot.functions.every(({ definition }) => count === 79 ? definition === null : typeof definition === "string"));
  assert.deepEqual(snapshot.columns.filter(({ column_name }) => column_name === "matter_id")
    .map(({ is_nullable }) => is_nullable), count === 81 ? ["YES", "YES"] : ["NO", "NO"]);
  assert.equal(snapshot.columns.filter(({ column_name }) => column_name === "workspace_authority_sha256").length, count === 81 ? 1 : 0);
  assert.equal(snapshot.triggers.length, count === 81 ? 3 : 0);
}

async function disabledService(state, count, secretRequests) {
  const observations = { connects: 0, releases: 0, statements: [], snapshots: [] };
  const verified = await verifyOperationalPostgresBridgeMigrationState({ async connect() {
    observations.connects += 1;
    const client = await state.admin.connect();
    return { async query(sql, values) {
      observations.statements.push(sql);
      const result = await client.query(sql, values);
      if (sql.startsWith("BEGIN")) {
        observations.snapshots.push((await client.query(`SELECT
          current_setting('transaction_isolation') AS isolation,
          current_setting('transaction_read_only') AS read_only`)).rows[0]);
      }
      return result;
    }, release() { observations.releases += 1; client.release(); } };
  } });
  assert.equal(observations.connects, 1);
  assert.equal(observations.releases, 1);
  assert.equal(observations.statements.filter((sql) => sql.startsWith("BEGIN")).length, 1);
  assert.equal(observations.statements[0], "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY");
  assert.equal(observations.statements.at(-1), "COMMIT");
  assert.ok(observations.statements.every((sql) => /^(?:BEGIN|SELECT|COMMIT)\b/u.test(sql)));
  assert.deepEqual(observations.snapshots, [{ isolation: "serializable", read_only: "on" }]);
  assert.equal(verified.length, count);
  return createInternalUnsignedInstallationRuntimeFromEnv({ env: {}, pool: state.app,
    tenant_id: TENANT, schema_migration_count: verified.length,
    resolveSecret: async (request) => { secretRequests.push(request); throw new Error("signer must remain disabled"); } });
}

function legacyRuntime(state, service) {
  const roster = parseOutlookDesktopAutoconnectRoster({
    schema_version: "lawos.outlook-desktop-autoconnect-roster.v1", roster_version: "actual-transition-roster",
    entries: Array.from({ length: 10 }, (_, index) => ({ tenant_id: TENANT,
      user_id: index === 0 ? ACTOR.user_id : `transition-other-${index}`,
      entra_subject_id: index === 0 ? ACTOR.entra_subject_id : `transition-subject-${index}`, enabled: true })),
  });
  const original = createPostgresOutlookDesktopOperationalRuntime({ pool: state.app,
    tenant_id: TENANT, entitlement_roster: roster });
  const fallback = { register: 0, heartbeat: 0, retire: 0, read: 0 };
  const monitored = { ...original,
    legacy_installation_service: { ...original.legacy_installation_service,
      ...Object.fromEntries(["register", "heartbeat", "retire"].map((operation) => [operation, async (...args) => {
        fallback[operation] += 1;
        return original.legacy_installation_service[operation](...args);
      }])) },
    installation_service: { ...original.installation_service, async readTrustedCurrent(...args) {
      fallback.read += 1;
      return original.installation_service.readTrustedCurrent(...args);
    } },
  };
  return { original, fallback, runtime: composeInternalUnsignedInstallationRuntime(monitored, service) };
}

function oldClient() {
  const keys = generateKeyPairSync("ed25519");
  const publicDer = keys.publicKey.export({ type: "spki", format: "der" });
  let sequence = 0;
  return { publicDer, command(operation, installationId = "NEW") {
    sequence += 1;
    const request = { method: "POST",
      path: operation === "register" ? "/api/desktop/installations"
        : `/api/desktop/installations/${installationId}/${operation}`,
      body: operation === "register" ? { platform: "win32", app_version: "0.1.29",
        source_sha: "4df77e1848b52ea455f20b41b9b1c64961bfa1cf", device_public_key: publicDer.toString("base64") }
        : { expected_state_version: 1, ...(operation === "retire" ? { retire_reason: "windows_uninstall" } : {}) },
      installation_id: installationId, idempotency_key: `transition-idempotency-${sequence}`,
      nonce: digest(`transition-nonce-${sequence}`), issued_at: new Date(Date.now() - 1000).toISOString(),
      expires_at: new Date(Date.now() + 120000).toISOString(),
    };
    return { principal: ACTOR, request, request_id: `transition-request-${sequence}`,
      signature: signOutlookDesktopLifecycleRequest(request, keys.privateKey) };
  } };
}

async function grantLegacy(state, client) {
  const now = Date.parse(await roleDatabaseNow(state.app, TENANT));
  const material = { ...ACTOR, authorization_id: "transition-authorization",
    device_key_fingerprint: digest(client.publicDer), installed_receipt_sha256: digest("transition installed receipt"),
    app_id: "com.amic.matter.desktop.internal", platform: "win32", architecture: "x64", channel: "internal-unsigned",
    release_id: "transition-release", release_sequence: 29, version: "0.1.29",
    source_sha: "4df77e1848b52ea455f20b41b9b1c64961bfa1cf", source_tree: "b".repeat(40),
    installer_sha256: digest("transition installer"), installer_bytes: 109711906,
    installer_version_id: "transition-immutable-version", bootstrap_marker_sha256: digest("transition bootstrap"),
    owner_approval_sha256: digest("transition owner approval"),
    valid_from: new Date(now - 1000).toISOString(), valid_until: new Date(now + 3600000).toISOString(),
  };
  const grant = { ...material, release_authority_sha256: hashDomainValue(material) };
  await roleJsonCall(state.control, TENANT, "authorize_internal_unsigned_release", grant);
  return grant;
}

async function installationRows(state) {
  const tables = ["internal_unsigned_release_authorizations", "internal_unsigned_release_revocations",
    "internal_unsigned_installation_bindings", "outlook_desktop_installations",
    "outlook_desktop_installation_nonces", "outlook_desktop_installation_idempotency", "outlook_desktop_installation_audit_events"];
  return (await state.observer.query(tables.map((name) =>
    `SELECT '${name}' AS kind,to_jsonb(row) AS data FROM lawos_email_dms.${name} AS row WHERE tenant_id=$1`)
    .join(" UNION ALL ") + " ORDER BY kind,data", [TENANT])).rows;
}

async function assertRevokedDisabled(state, service, legacy, client, installationId) {
  assert.equal(service.attestation_configured, false);
  assert.equal(legacy.runtime.internal_unsigned_installation_service, null);
  assert.equal((await legacy.original.installation_service.readTrustedCurrent({ principal: ACTOR })).release_trusted, true,
    "009 still trusts the exact legacy tuple, so an internal denial must never fall through");
  const before = await installationRows(state);
  const revoked = (error) => error?.safe_error_code === "INTERNAL_INSTALLATION_RETIRED_OR_REVOKED";
  await assert.rejects(legacy.runtime.installation_service.readTrustedCurrent({ principal: ACTOR }), revoked);
  await assert.rejects(legacy.runtime.legacy_installation_service.heartbeat(client.command("heartbeat", installationId),
    { authorize: async () => true }), revoked);
  const unavailable = (error) => error?.safe_error_code === "INTERNAL_INSTALLATION_AUTHORITY_UNAVAILABLE" && error.status === 503;
  for (const operation of ["register", "heartbeat", "retire"]) {
    await assert.rejects(service[operation](client.command(operation, operation === "register" ? "NEW" : installationId)), unavailable);
  }
  await assert.rejects(service.attest({ principal: ACTOR, installation_id: installationId,
    adoption_id: "transition-adoption", request_sha256: digest("transition adoption") }), unavailable);
  assert.deepEqual(legacy.fallback, { register: 0, heartbeat: 0, retire: 0, read: 0 });
  assert.deepEqual(await installationRows(state), before);
}

test("fresh target receipts require the signed immutable bootstrap pin for each actual 79 to 80 to 81 transition", async (t) => {
  const state = await historicalFixture(t);
  assert.ok(state, "actual temporary PostgreSQL is required");
  const before = await schemaSnapshot(state);
  const bootstrap = await readOutlookAssignmentMigrationPauseExpectation(state.admin);
  const pin = hashDomainValue(bootstrap);
  const readback = await readProtectedBootstrap(state, HISTORICAL_SHA);
  assert.deepEqual(readback.historical_outlook_bootstrap_receipt, bootstrap);
  assert.equal(readback.historical_outlook_bootstrap_sha256, pin);
  assert.deepEqual(await schemaSnapshot(state), before);
  for (const [catalog, label] of [[AUTHORITY_SHA, "fresh80"], [COMBINED_SHA, "fresh81"]]) {
    const snapshot = await schemaSnapshot(state);
    const options = { databaseTargetReceiptSha256: digest(label) };
    await assert.rejects(migrate(state, catalog, options));
    await assert.rejects(migrate(state, catalog, { ...options,
      historicalOutlookBootstrapSha256: digest("wrong bootstrap") }));
    assert.deepEqual(await schemaSnapshot(state), snapshot);
    const approved = { ...options, historicalOutlookBootstrapSha256: pin };
    const receipt = await migrate(state, catalog, approved);
    assert.equal(receipt.schema_version, "lawos.outlook-authority-migration-run-receipt.v3");
    assert.equal(receipt.database_target_receipt_sha256, options.databaseTargetReceiptSha256);
    assert.equal(receipt.historical_outlook_bootstrap_sha256, pin);
    assert.deepEqual(receipt.historical_outlook_bootstrap_receipt, bootstrap);
    assert.equal(receipt.historical_outlook_bootstrap_receipt.database_target_receipt_sha256, TARGET_SHA);
    assert.equal(receipt.migration_applied_count, 1);
    assert.equal(receipt.role_configuration_transaction_committed_count, 0);
    assert.deepEqual((await schemaSnapshot(state)).bootstrap, before.bootstrap);
    const currentReadback = await readProtectedBootstrap(state, catalog);
    assert.deepEqual(currentReadback.historical_outlook_bootstrap_receipt, bootstrap);
    assert.equal(currentReadback.historical_outlook_bootstrap_sha256, pin);
    const replay = await migrate(state, catalog, { ...approved,
      databaseTargetReceiptSha256: digest(`${label} replay`) });
    assert.equal(replay.postgres_mutation_committed_count, 0);
    assert.equal(replay.database_target_receipt_sha256, digest(`${label} replay`));
    assert.deepEqual((await schemaSnapshot(state)).bootstrap, before.bootstrap);
  }
});

test("actual historical79 applies only 309 then only 016 while config-off revoked legacy authority stays closed", async (t) => {
  const state = await historicalFixture(t);
  assert.ok(state, "actual temporary PostgreSQL is required");
  const secretRequests = [];
  const before = await schemaSnapshot(state);
  assertSchema(before, 79);
  assert.equal(await disabledService(state, 79, secretRequests), null);
  await assert.rejects(migrate(state, COMBINED_SHA), { code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED" });
  assert.deepEqual(await schemaSnapshot(state), before, "direct 79 to 81 must preserve both real DDL and ledger");

  const appended = await migrate(state, AUTHORITY_SHA);
  assert.equal(appended.migration_applied_count, 1);
  assert.equal(appended.postgres_mutation_committed_count, 1);
  assert.deepEqual(appended.migrations.filter(({ applied }) => applied).map(({ id }) => id), [INTERNAL]);
  const authority = await schemaSnapshot(state);
  assertSchema(authority, 80);
  assert.deepEqual(authority.ledger.filter(({ migration_id }) => migration_id !== INTERNAL), before.ledger);
  assert.deepEqual(authority.bootstrap, before.bootstrap);
  const replay80 = await migrate(state, AUTHORITY_SHA);
  assert.equal(replay80.migration_applied_count, 0);
  assert.equal(replay80.postgres_mutation_committed_count, 0);
  assert.deepEqual(await schemaSnapshot(state), authority);

  const service80 = await disabledService(state, 80, secretRequests);
  const legacy80 = legacyRuntime(state, service80);
  const client = oldClient();
  const grant = await grantLegacy(state, client);
  const registrationCommand = client.command("register");
  assert.deepEqual(Object.keys(registrationCommand.request.body).sort(), ["app_version", "device_public_key", "platform", "source_sha"]);
  const registered = await legacy80.runtime.legacy_installation_service.register(registrationCommand, { authorize: async () => true });
  assert.equal(registered.response_status, 201);
  const installationId = registered.body.installation.installation_id;
  assert.equal((await legacy80.runtime.installation_service.readTrustedCurrent({ principal: ACTOR })).release_trusted, true);
  await roleJsonCall(state.control, TENANT, "revoke_internal_unsigned_release", {
    authorization_id: grant.authorization_id, expected_release_authority_sha256: grant.release_authority_sha256,
    revocation_id: "transition-revocation", reason: "release_withdrawn", owner_approval_sha256: digest("transition revoke approval"),
  });
  await assertRevokedDisabled(state, service80, legacy80, client, installationId);
  const preservedInstallation = await installationRows(state);

  const combinedReceipt = await migrate(state, COMBINED_SHA);
  assert.equal(combinedReceipt.migration_applied_count, 1);
  assert.equal(combinedReceipt.postgres_mutation_committed_count, 1);
  assert.deepEqual(combinedReceipt.migrations.filter(({ applied }) => applied).map(({ id }) => id), [CORPORATE]);
  const combined = await schemaSnapshot(state);
  assertSchema(combined, 81);
  assert.deepEqual(combined.ledger.filter(({ migration_id }) => migration_id !== CORPORATE), authority.ledger);
  assert.deepEqual(combined.bootstrap, before.bootstrap);
  assert.deepEqual(combined.functions, authority.functions);
  assert.deepEqual(await installationRows(state), preservedInstallation);
  const service81 = await disabledService(state, 81, secretRequests);
  await assertRevokedDisabled(state, service81, legacyRuntime(state, service81), client, installationId);
  const replay81 = await migrate(state, COMBINED_SHA);
  assert.equal(replay81.migration_applied_count, 0);
  assert.equal(replay81.postgres_mutation_committed_count, 0);
  assert.deepEqual(await schemaSnapshot(state), combined);
  assert.deepEqual(await installationRows(state), preservedInstallation);
  assert.deepEqual(secretRequests, []);
});

function corporateFaultPool(state, mode) {
  const sql016 = listClientOperationsPostgresMigrations().find(({ id }) => id === CORPORATE).sql;
  const observed = { corporate_sql_attempts: 0, corporate_sql_executed: 0, corporate_commits: 0, statements: [] };
  let corporatePending = false;
  return { observed, pool: { async connect() {
    const client = await state.admin.connect();
    return { async query(sql, values) {
      observed.statements.push(sql);
      if (sql === sql016) {
        observed.corporate_sql_attempts += 1;
        if (mode === "sql") throw Object.assign(new Error("synthetic 016 SQL rejection before execution"), { code: "42601" });
      }
      const result = await client.query(sql, values);
      if (sql === sql016) observed.corporate_sql_executed += 1;
      if (sql.startsWith("INSERT INTO lawos_meta.schema_migrations") && values[0] === CORPORATE) {
        corporatePending = true;
      }
      if (corporatePending && sql === "COMMIT") {
        corporatePending = false;
        observed.corporate_commits += 1;
        if (mode === "commit") throw new Error("synthetic 016 COMMIT response loss");
        if (mode === "postflight") await state.observer.query(`GRANT EXECUTE ON FUNCTION
          lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) TO PUBLIC`);
      }
      return result;
    }, release: client.release.bind(client) };
  } } };
}

async function corporateFailure(state, mode) {
  const injected = corporateFaultPool(state, mode);
  const adapter = createJsonPostgresOutlookAuthorityMigrationAdapter(adapterOptions(COMBINED_SHA));
  let receipt;
  try {
    await assert.rejects(runClientOperationsPostgresMigrations(injected.pool, adapter.runnerOptions), (error) => {
      receipt = adapter.normalizeFailureReceipt(error);
      return true;
    });
  } finally { adapter.dispose(); }
  assert.ok(receipt);
  assert.equal(receipt.migration_catalog_sha256, COMBINED_SHA);
  assert.equal(receipt.postgres_mutation_attempt_count, 1);
  assert.equal(receipt.role_configuration_transaction_committed_count, 0);
  assert.equal(receipt.outlook_assignment_transaction_committed, false);
  return { receipt, observed: injected.observed };
}

function assertCorporateFailurePrefix(receipt, committed) {
  assert.equal(receipt.failure_phase, "migration");
  assert.equal(receipt.migration_applied_count, 0);
  assert.equal(receipt.postgres_mutation_committed_count, committed);
  assert.deepEqual(receipt.migrations, listPostgresFoundationMigrations()
    .filter(({ id }) => id !== CORPORATE)
    .map(({ id, sql }) => ({ id, checksum: checksumPostgresMigration(sql), applied: false })));
  assert.equal(receipt.migrations.length, 15);
}

test("actual 016 SQL rollback and COMMIT response loss preserve their distinct failure receipts", async (t) => {
  const state = await historicalFixture(t);
  assert.ok(state, "actual temporary PostgreSQL is required");
  await migrate(state, AUTHORITY_SHA);
  const before = await schemaSnapshot(state);
  assertSchema(before, 80);
  const sqlFailure = await corporateFailure(state, "sql");
  assert.equal(sqlFailure.receipt.outcome, "failed");
  assert.equal(sqlFailure.receipt.failure_safe_error_code, "POSTGRES_OPERATION_FAILED");
  assertCorporateFailurePrefix(sqlFailure.receipt, 0);
  assert.equal(sqlFailure.observed.corporate_sql_attempts, 1);
  assert.equal(sqlFailure.observed.corporate_sql_executed, 0);
  assert.equal(sqlFailure.observed.corporate_commits, 0);
  assert.ok(sqlFailure.observed.statements.includes("ROLLBACK"));
  assert.deepEqual(await schemaSnapshot(state), before);

  const lostCommit = await corporateFailure(state, "commit");
  assert.equal(lostCommit.receipt.outcome, "partial");
  assert.equal(lostCommit.receipt.failure_safe_error_code, "OUTLOOK_POSTGRES_COMMIT_UNKNOWN");
  assertCorporateFailurePrefix(lostCommit.receipt, null);
  assert.equal(lostCommit.observed.corporate_sql_attempts, 1);
  assert.equal(lostCommit.observed.corporate_sql_executed, 1);
  assert.equal(lostCommit.observed.corporate_commits, 1);
  const committed = await schemaSnapshot(state);
  assertSchema(committed, 81);
  assert.deepEqual(committed.ledger.filter(({ migration_id }) => migration_id !== CORPORATE), before.ledger);
  assert.deepEqual(committed.bootstrap, before.bootstrap);
  assert.deepEqual(committed.functions, before.functions);
  const replay = await migrate(state, COMBINED_SHA);
  assert.equal(replay.outcome, "verified");
  assert.equal(replay.migration_applied_count, 0);
  assert.equal(replay.postgres_mutation_committed_count, 0);
  assert.deepEqual(await schemaSnapshot(state), committed);
});

test("actual 016 postflight failure retains committed DDL and reports only the corporate migration applied", async (t) => {
  const state = await historicalFixture(t);
  assert.ok(state, "actual temporary PostgreSQL is required");
  await migrate(state, AUTHORITY_SHA);
  const before = await schemaSnapshot(state);
  let committed;
  try {
    const failure = await corporateFailure(state, "postflight");
    assert.equal(failure.receipt.failure_phase, "internal_installation_postflight");
    assert.equal(failure.receipt.failure_safe_error_code, "INTERNAL_INSTALLATION_AUTHORITY_READBACK_FAILED");
    assert.equal(failure.receipt.outcome, "partial");
    assert.equal(failure.receipt.migration_applied_count, 1);
    assert.equal(failure.receipt.postgres_mutation_committed_count, 1);
    assert.equal(failure.receipt.migrations.length, 81);
    assert.deepEqual(failure.receipt.migrations.filter(({ applied }) => applied).map(({ id }) => id), [CORPORATE]);
    assert.equal(failure.observed.corporate_sql_executed, 1);
    assert.equal(failure.observed.corporate_commits, 1);
    committed = await schemaSnapshot(state);
    assertSchema(committed, 81);
    assert.deepEqual(committed.ledger.filter(({ migration_id }) => migration_id !== CORPORATE), before.ledger);
    assert.deepEqual(committed.bootstrap, before.bootstrap);
    assert.deepEqual(committed.functions, before.functions);
  } finally {
    await state.observer.query(`REVOKE EXECUTE ON FUNCTION
      lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) FROM PUBLIC`);
  }
  const replay = await migrate(state, COMBINED_SHA);
  assert.equal(replay.outcome, "verified");
  assert.equal(replay.migration_applied_count, 0);
  assert.equal(replay.postgres_mutation_committed_count, 0);
  assert.deepEqual(await schemaSnapshot(state), committed);
});
