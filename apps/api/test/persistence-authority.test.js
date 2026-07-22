import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  LAWOS_PERSISTENCE_AUTHORITIES,
  postgresUrlFromSecret,
  preparePersistenceAuthority,
  resolvePersistenceAuthority,
} from "../src/persistence-authority.js";
import {
  createApiServer,
  resolvePostgresRequestIdempotencyKey,
  startApiServer,
} from "../src/server.js";
import { STORE_PATH_MANIFEST } from "../src/store-path-manifest.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { lawosDurableStoreEnv } from "../src/local-durable-store-paths.js";

const TENANT_CONTEXT_SECRET = "test-only-postgres-tenant-context-secret-material";

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
  const connectionString = postgresUrlFromSecret(JSON.stringify({
    host: "lawos-private-staging.example.rds.amazonaws.com",
    port: 5432,
    dbname: "lawos",
    username: "lawos_app",
    password: "synthetic test / password @ value",
    configuration_state: "ready",
  }));
  const parsed = new URL(connectionString);
  assert.equal(parsed.hostname, "lawos-private-staging.example.rds.amazonaws.com");
  assert.equal(parsed.port, "5432");
  assert.equal(parsed.pathname, "/lawos");
  assert.equal(decodeURIComponent(parsed.username), "lawos_app");
  assert.equal(decodeURIComponent(parsed.password), "synthetic test / password @ value");
  assert.equal(connectionString.includes("synthetic test / password @ value"), false);
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
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
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
    persistenceAuthorityEnv: {
      LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/disposable",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/disposable-tenant-context",
      LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID: "lawos/test/payroll-artifact-key",
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
