import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  LAWOS_POSTGRES_API_POOL_MAX,
  LAWOS_PERSISTENCE_AUTHORITIES,
  postgresUrlFromSecret,
  preparePersistenceAuthority,
  resolvePersistenceAuthority,
  verifyOperationalPostgresMigrationState,
} from "../src/persistence-authority.js";
import {
  createApiServer,
  resolvePostgresRequestIdempotencyKey,
  startApiServer,
} from "../src/server.js";
import { STORE_PATH_MANIFEST } from "../src/store-path-manifest.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { lawosDurableStoreEnv } from "../src/local-durable-store-paths.js";
import {
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
} from "../src/client-operations-schema.js";
import {
  createOutlookAuthorityPostgresFixture,
  runOutlookAuthorityPostgresMigrations,
} from "./support/outlook-authority-postgres-fixture.js";
import {
  runHrxPostgresMigrations,
} from "../../../packages/hrx/src/postgres-migrations.js";

const TENANT_CONTEXT_SECRET = "test-only-postgres-tenant-context-secret-material";

test("operational PostgreSQL authority uses one pooled connection per Lambda execution", () => {
  assert.equal(LAWOS_POSTGRES_API_POOL_MAX, 1);
});

test("operational migration verification requires the exact additive Client catalog", async (t) => {
  const fixture = await createOutlookAuthorityPostgresFixture(t);
  if (!fixture) return;
  await assert.rejects(
    verifyOperationalPostgresMigrationState(fixture.adminPool),
    (error) =>
      error?.code
        === "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
  );
  await runHrxPostgresMigrations(fixture.adminPool);
  const mixedHistory = await fixture.adminPool.query(
    `SELECT migration_id, checksum
       FROM lawos_meta.schema_migrations
      ORDER BY migration_id`,
  );
  assert.equal(
    mixedHistory.rows.at(-1).migration_id,
    "204_hrx_projection_consumer_routing",
  );
  await assert.rejects(
    verifyOperationalPostgresMigrationState(fixture.adminPool),
    (error) =>
      error?.code
        === "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
  );
  await runOutlookAuthorityPostgresMigrations(fixture);
  const verified = await verifyOperationalPostgresMigrationState(
    fixture.adminPool,
  );
  assert.equal(
    verified.length,
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_migration_count,
  );
  const connection = await fixture.adminPool.connect();
  try {
    const finalEntry =
      CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.at(-1);
    async function rejectDrift({ sql, values, code }) {
      await connection.query("BEGIN");
      try {
        await connection.query(sql, values);
        await assert.rejects(
          verifyOperationalPostgresMigrationState(connection),
          (error) => error?.code === code,
        );
      } finally {
        await connection.query("ROLLBACK");
      }
    }
    await rejectDrift({
      sql: `DELETE FROM lawos_meta.schema_migrations
             WHERE migration_id = $1`,
      values: [finalEntry.id],
      code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
    });
    await rejectDrift({
      sql: `UPDATE lawos_meta.schema_migrations
               SET checksum = $1
             WHERE migration_id = $2`,
      values: ["0".repeat(64), finalEntry.id],
      code: "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH",
    });
    await rejectDrift({
      sql: `INSERT INTO lawos_meta.schema_migrations
              (migration_id, checksum, applied_by)
            VALUES ($1, $2, $3)`,
      values: [
        "999_unknown_client_history",
        "f".repeat(64),
        "client-operations-test",
      ],
      code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
    });
  } finally {
    connection.release();
  }
});

function storePathsUnder(root) {
  return Object.fromEntries(STORE_PATH_MANIFEST.map((entry) => [entry.key, join(root, entry.fileName)]));
}

test("PostgreSQL audited reads use occurrence-bound idempotency while mutations preserve replay keys", () => {
  const base = {
    request_target_hash: "a".repeat(64),
    request_body_hash: "b".repeat(64),
  };
  const firstRead = resolvePostgresRequestIdempotencyKey({
    ...base,
    method: "GET",
    explicit_key: "caller-reused-read-key",
    request_occurrence_id: "read-occurrence-1",
  });
  const repeatedRead = resolvePostgresRequestIdempotencyKey({
    ...base,
    method: "GET",
    explicit_key: "caller-reused-read-key",
    request_occurrence_id: "read-occurrence-2",
  });
  assert.match(firstRead, /^request-occurrence:[a-f0-9]{64}$/u);
  assert.notEqual(firstRead, repeatedRead);
  assert.equal(resolvePostgresRequestIdempotencyKey({
    ...base,
    method: "POST",
    explicit_key: "explicit-mutation-key",
    body_key: "body-mutation-key",
  }), "explicit-mutation-key");
  assert.equal(resolvePostgresRequestIdempotencyKey({
    ...base,
    method: "PATCH",
    body_key: "body-mutation-key",
  }), "body-mutation-key");
  assert.equal(
    resolvePostgresRequestIdempotencyKey({ ...base, method: "DELETE" }),
    resolvePostgresRequestIdempotencyKey({ ...base, method: "DELETE" }),
  );
});

test("PostgreSQL read retries discard failed-attempt response buffers", async (t) => {
  const principal = {
    user_id: "user_postgres_read_retry",
    tenant_id: "tenant_postgres_read_retry",
    role_ids: ["staff"],
    scopes: [],
  };
  const sessionAuth = {
    capabilities: {},
    async resolvePermissionContextFromHeaders() {
      return {
        ok: true,
        principal,
        context: { principal, rules: [{ id: "allow-read", effect: "allow", action: "*" }], object_acl: [] },
      };
    },
  };
  let attemptCount = 0;
  const requestRuntimeAuthority = {
    capabilities: { authority: "postgres-v2" },
    async run({ command }) {
      attemptCount += 1;
      await command({});
      attemptCount += 1;
      return command({});
    },
  };
  const server = createApiServer({
    sessionAuth,
    stepUpAuthority: Object.freeze({}),
    requestRuntimeAuthority,
    persistenceAuthority: "postgres-v2",
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
    server.closeIdleConnections();
  }));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/profile/me`, {
    headers: { authorization: "Bearer synthetic-read-retry-session", connection: "close" },
  });
  assert.equal(response.status, 200);
  assert.equal(attemptCount, 2);
});

test("persistence authority selection is explicit and file-current does not initialize PostgreSQL", async () => {
  assert.equal(resolvePersistenceAuthority({ env: {} }), LAWOS_PERSISTENCE_AUTHORITIES.fileCurrent);
  assert.equal(
    resolvePersistenceAuthority({ env: { LAWOS_RUNTIME_PROFILE: "operational" } }),
    LAWOS_PERSISTENCE_AUTHORITIES.postgresV2,
  );
  assert.equal(resolvePersistenceAuthority({ value: "postgres-v2", env: {} }), LAWOS_PERSISTENCE_AUTHORITIES.postgresV2);
  assert.throws(() => resolvePersistenceAuthority({ value: "auto", env: {} }), {
    code: "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  });
  assert.throws(() => resolvePersistenceAuthority({
    value: "file-current",
    env: { LAWOS_RUNTIME_PROFILE: "operational" },
  }), (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED"
    && /requires postgres-v2/u.test(error.message));
  let connectorCalled = false;
  const state = await preparePersistenceAuthority({
    value: "file-current",
    env: {},
    connectPostgres: async () => {
      connectorCalled = true;
      throw new Error("must not run");
    },
  });
  assert.equal(state.authority, "file-current");
  assert.equal(state.postgres_connected, false);
  assert.equal(state.fallback_attempted, false);
  assert.equal(connectorCalled, false);
});

test("durable file defaults are local-development only", () => {
  const env = lawosDurableStoreEnv({ root: "/tmp/lawos-local-dev-contract", includeSessionSecret: false });
  assert.equal(env.LAWOS_RUNTIME_PROFILE, "local-dev");
  assert.equal(env.LAWOS_HRX_STORE_PATH, "/tmp/lawos-local-dev-contract/hrx-store.json");
});

test("PostgreSQL authority defaults to verified TLS and requires explicit local-only disable", async () => {
  let connectorOptions;
  const connection = {
    query: async () => ({ rows: [{ authority_ready: 1 }] }),
    end: async () => {},
  };
  const secure = await preparePersistenceAuthority({
    value: "postgres-v2",
    env: {
      LAWOS_POSTGRES_URL: "postgresql://db.example.test/lawos",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET: TENANT_CONTEXT_SECRET,
    },
    connectPostgres: async (options) => {
      connectorOptions = options;
      return connection;
    },
  });
  assert.equal(connectorOptions.sslMode, "verify-full");
  await secure.close();

  const disposable = await preparePersistenceAuthority({
    value: "postgres-v2",
    env: {
      LAWOS_POSTGRES_URL: "postgresql://127.0.0.1:5432/postgres",
      LAWOS_POSTGRES_SSL_MODE: "disable",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET: TENANT_CONTEXT_SECRET,
    },
    connectPostgres: async (options) => {
      connectorOptions = options;
      return connection;
    },
  });
  assert.equal(connectorOptions.sslMode, "disable");
  await disposable.close();

  await assert.rejects(
    preparePersistenceAuthority({
      value: "postgres-v2",
      env: {
        LAWOS_POSTGRES_URL: "postgresql://127.0.0.1:5432/postgres",
        LAWOS_POSTGRES_SSL_MODE: "prefer",
      },
      connectPostgres: async () => connection,
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  await assert.rejects(
    preparePersistenceAuthority({
      value: "postgres-v2",
      env: {
        LAWOS_POSTGRES_URL: "postgresql://db.example.test/lawos",
        LAWOS_POSTGRES_SSL_MODE: "disable",
        LAWOS_POSTGRES_TENANT_CONTEXT_SECRET: TENANT_CONTEXT_SECRET,
      },
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED"
      && /fallback is disabled/u.test(error.message),
  );
});

test("selected PostgreSQL initialization failure is sanitized and never falls back to JSON", async () => {
  await assert.rejects(
    preparePersistenceAuthority({
      value: "postgres-v2",
      env: {
        LAWOS_POSTGRES_URL: "postgresql://user:secret@db.example.test/lawos",
        LAWOS_POSTGRES_TENANT_CONTEXT_SECRET: TENANT_CONTEXT_SECRET,
      },
      connectPostgres: async () => {
        throw new Error("connection failed for postgresql://user:secret@db.example.test/lawos");
      },
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED"
      && error?.exitCode === 78
      && !error.message.includes("secret"),
  );
});

test("PostgreSQL preflight reports only fixed stages and reasons while closing failed pools", async (t) => {
  const sensitive = "synthetic-private-value-must-not-be-logged";
  const cases = [
    ["database-credential"],
    ["tenant-context-credential"],
    ["connection"],
    ["health-query"],
    ["migration-catalog"],
    ["migration-catalog", "missing", "MIGRATION_HISTORY_DIVERGED"],
    ["migration-catalog", "checksum", "MIGRATION_CHECKSUM_MISMATCH"],
    ["migration-catalog", "denied", "ACCESS_DENIED"],
    ["tenant-authority"],
    ["tenant-authority", "inactive"],
  ];
  for (const [failureStage, variant, reason = "INITIALIZATION_FAILED"] of cases) {
    await t.test(`${failureStage}:${variant ?? "failure"}`, async () => {
      let closed = 0;
      const failure = () => {
        throw Object.assign(new Error(sensitive), {
          code: variant === "denied" ? "42501" : sensitive,
          safe_error_code: sensitive,
          detail: sensitive,
        });
      };
      const pool = {
        async connect() {
          return { query: this.query.bind(this), release() {} };
        },
        async query(sql) {
          if (sql.startsWith("BEGIN") || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
          const stage = sql.includes("schema_migrations") ? "migration-catalog"
            : sql.includes("tenant_context_authority_ready") ? "tenant-authority" : "health-query";
          if (stage === failureStage && !["missing", "checksum", "inactive"].includes(variant)) failure();
          if (stage === "migration-catalog") {
            const rows = CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.map((entry) => ({
              migration_id: entry.id, checksum: entry.checksum,
            }));
            if (variant === "missing") rows.splice(0, 1);
            if (variant === "checksum") rows[0].checksum = "0".repeat(64);
            if (sql.startsWith("SELECT count(*)")) return { rows: [{ migration_count: rows.length }] };
            return { rows };
          }
          return { rows: [{ ready: variant !== "inactive", authority_ready: 1 }] };
        },
        async end() {
          closed += 1;
          throw new Error(sensitive);
        },
      };
      await assert.rejects(preparePersistenceAuthority({
        value: "postgres-v2",
        env: {
          LAWOS_RUNTIME_PROFILE: "operational",
          LAWOS_POSTGRES_URL_SECRET_ID: "synthetic-database",
          LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "synthetic-tenant-context",
        },
        resolvePostgresSecret: async ({ secretId }) => {
          const tenant = secretId === "synthetic-tenant-context";
          if (failureStage === (tenant ? "tenant-context-credential" : "database-credential")) failure();
          return tenant ? TENANT_CONTEXT_SECRET : "postgresql://synthetic.invalid/lawos";
        },
        connectPostgres: async () => {
          if (failureStage === "connection") failure();
          return pool;
        },
      }), (error) => {
        assert.equal(error.code, "LAWOS_RUNTIME_PREFLIGHT_FAILED");
        assert.equal(error.exitCode, 78);
        assert.equal(error.persistence_stage, failureStage);
        assert.equal(error.persistence_reason, reason);
        assert.match(error.message, /file fallback is disabled/u);
        assert.equal(`${error.stack}${JSON.stringify(error)}`.includes(sensitive), false);
        assert.equal(error.cause, undefined);
        return true;
      });
      assert.equal(closed, ["database-credential", "tenant-context-credential", "connection"].includes(failureStage) ? 0 : 1);
    });
  }
});

test("operational PostgreSQL authority resolves credentials only through an AWS secret reference", async () => {
  const resolved = [];
  let connectorOptions;
  const connection = {
    query: async () => ({ rows: [{ authority_ready: 1 }] }),
    end: async () => {},
  };
  await assert.rejects(
    preparePersistenceAuthority({
      value: "postgres-v2",
      env: {
        LAWOS_RUNTIME_PROFILE: "operational",
        LAWOS_POSTGRES_URL: "postgresql://user:secret@db.example.test/lawos",
      },
      connectPostgres: async () => connection,
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED"
      && !error.message.includes("user:secret"),
  );
  const state = await preparePersistenceAuthority({
    value: "postgres-v2",
    env: {
      LAWOS_RUNTIME_PROFILE: "operational",
      LAWOS_POSTGRES_URL_SECRET_ID: "lawos/prod/postgres",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/prod/postgres-tenant-context",
      AWS_REGION: "ap-northeast-2",
    },
    resolvePostgresSecret: async (options) => {
      resolved.push(options);
      return options.secretId === "lawos/prod/postgres"
        ? JSON.stringify({ DATABASE_URL: "postgresql://secret-ref.example.test/lawos" })
        : JSON.stringify({ TENANT_CONTEXT_SECRET: TENANT_CONTEXT_SECRET });
    },
    connectPostgres: async (options) => {
      connectorOptions = options;
      return connection;
    },
  });
  assert.deepEqual(resolved.map((item) => item.secretId), [
    "lawos/prod/postgres",
    "lawos/prod/postgres-tenant-context",
  ]);
  assert.equal(resolved.every((item) => item.region === "ap-northeast-2"), true);
  assert.equal(connectorOptions.connectionString, "postgresql://secret-ref.example.test/lawos");
  assert.equal(connectorOptions.tenantContextSecret, TENANT_CONTEXT_SECRET);
  assert.equal(state.json_fallback, false);
  await state.close();
});

test("structured Secrets Manager PostgreSQL credentials are encoded only in process memory", () => {
  const password =
    "synthetic test % password : [] {} / @ value";
  const connectionString = postgresUrlFromSecret(JSON.stringify({
    host: "lawos-private-staging.example.rds.amazonaws.com",
    port: 5432,
    dbname: "lawos",
    username: "lawos_app",
    password,
    configuration_state: "ready",
  }));
  const parsed = new URL(connectionString);
  assert.equal(parsed.hostname, "lawos-private-staging.example.rds.amazonaws.com");
  assert.equal(parsed.port, "5432");
  assert.equal(parsed.pathname, "/lawos");
  assert.equal(decodeURIComponent(parsed.username), "lawos_app");
  assert.equal(decodeURIComponent(parsed.password), password);
  assert.equal(connectionString.includes(password), false);
  assert.throws(
    () => postgresUrlFromSecret(JSON.stringify({ username: "lawos_app", password: "incomplete" })),
    /complete structured credential/u,
  );
});

test("API startup rejects PostgreSQL failure before creating any file authority", async (t) => {
  const parent = mkdtempSync(join(tmpdir(), "lawos-authority-preflight-"));
  const storeRoot = join(parent, "must-remain-absent");
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  await assert.rejects(
    startApiServer({
      port: 0,
      runtimeProfile: "operational",
      persistenceAuthority: "postgres-v2",
      outlookDesktopEntitlementEnabled: false,
      persistenceAuthorityEnv: {
        LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/unavailable",
        LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/unavailable-tenant-context",
      },
      persistenceResolvePostgresSecret: async ({ secretId }) => secretId.endsWith("tenant-context")
        ? TENANT_CONTEXT_SECRET
        : "postgresql://127.0.0.1:1/unavailable",
      persistenceConnectPostgres: async () => {
        throw new Error("synthetic unavailable database");
      },
      ...storePathsUnder(storeRoot),
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED" && /fallback is disabled/u.test(error.message),
  );
  assert.equal(existsSync(storeRoot), false);
});

test("API startup activates the transaction-capable PostgreSQL authority without creating file stores", async (t) => {
  const parent = mkdtempSync(join(tmpdir(), "lawos-authority-domain-gate-"));
  const storeRoot = join(parent, "must-remain-absent");
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const fixture = await createOutlookAuthorityPostgresFixture(t);
  if (!fixture) return;
  await runHrxPostgresMigrations(fixture.adminPool);
  await runOutlookAuthorityPostgresMigrations(fixture);
  let closed = false;
  const pool = {
    query: fixture.appPool.query.bind(fixture.appPool),
    connect: fixture.appPool.connect.bind(fixture.appPool),
    end: async () => { closed = true; },
  };
  let payrollSecretRequest = null;
  const started = await startApiServer({
    port: 0,
    runtimeProfile: "operational",
    sessionSecret: "test-only-session-secret-with-adequate-length",
    stepUpAuthority: Object.freeze({}),
    staffAuthAuthority: "internal-password",
    persistenceAuthority: "postgres-v2",
    outlookDesktopEntitlementEnabled: false,
    persistenceAuthorityEnv: {
      LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/disposable",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/disposable-tenant-context",
      LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID: "lawos/test/payroll-artifact-key",
      LAWOS_IDENTITY_TENANT_ID: "tenant_postgres_authority_test",
      LAWOS_DATA_SCOPE: "synthetic-only",
      AWS_REGION: "ap-northeast-2",
    },
    persistenceResolvePostgresSecret: async ({ secretId }) => secretId.endsWith("tenant-context")
      ? fixture.tenantContextSecret
      : fixture.instance.connection_string,
    persistenceConnectPostgres: async () => pool,
    dmsStorage: createLocalStorageAdapter({ adapter_id: "postgres-authority-test" }),
    payrollResolveArtifactSecret: async (request) => {
      payrollSecretRequest = request;
      return "postgres-authority-test-payroll-artifact-secret";
    },
    ...storePathsUnder(storeRoot),
  });
  assert.equal(started.persistence_authority.authority, "postgres-v2");
  assert.equal(started.persistence_authority.json_fallback, false);
  assert.equal(started.persistence_authority.dual_write, false);
  assert.equal(payrollSecretRequest.secretId, "lawos/test/payroll-artifact-key");
  assert.equal(payrollSecretRequest.region, "ap-northeast-2");
  const health = await fetch(`http://${started.host}:${started.port}/api/health`).then((response) => response.json());
  assert.equal(health.runtime_safety_policy.offline_capability, "rejected");
  assert.equal(health.runtime_safety_policy.authority_loss_mode, "fail_closed");
  assert.equal(
    health.auth_authority.object_acl_authority_source_ref,
    "postgres-v2:lawos_domain.authz/ObjectAcl",
  );
  assert.equal(health.auth_authority.staff_auth_authority, "internal-password");
  assert.equal(health.auth_authority.federated_staff_auth, false);
  assert.equal(health.auth_authority.account_directory, "postgres-v2");
  assert.equal(health.bounded_contexts.every((context) => context.postgres_authority_active === true), true);
  assert.equal(health.bounded_contexts.every((context) => context.json_fallback === false && context.dual_write === false), true);
  assert.equal(health.persistence_authority_capabilities.authority, "postgres-v2");
  assert.match(health.runtime_instance_fingerprint, /^[0-9a-f]{32}$/u);
  await new Promise((resolve) => started.server.close(resolve));
  assert.equal(closed, true);
  assert.equal(existsSync(storeRoot), false);
});

test("file-current API health publishes the resolved authority without claiming v2 domain conversion", async (t) => {
  const inert = Object.freeze({});
  const server = createApiServer({
    hrxRuntime: inert,
    masterDataRuntime: inert,
    matterRuntime: Object.freeze({ clearanceRepository: inert }),
    dmsRuntime: inert,
    crmIntakeRuntime: Object.freeze({ intakeRepository: inert }),
    financeRuntime: inert,
    analyticsRuntime: inert,
    aiRuntime: inert,
    portalRuntime: inert,
    uiReadinessRuntime: inert,
    homeDashboardRuntime: inert,
    enterpriseReadinessRuntime: inert,
    sessionAuth: inert,
    stepUpAuthority: inert,
    persistenceAuthority: "file-current",
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
    server.closeIdleConnections();
  }));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`, {
    headers: { connection: "close" },
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.persistence_authority, "file-current");
});
