import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  LAWOS_PERSISTENCE_AUTHORITIES,
  preparePersistenceAuthority,
  resolvePersistenceAuthority,
} from "../src/persistence-authority.js";
import { createApiServer, startApiServer } from "../src/server.js";
import { STORE_PATH_MANIFEST } from "../src/store-path-manifest.js";

function storePathsUnder(root) {
  return Object.fromEntries(STORE_PATH_MANIFEST.map((entry) => [entry.key, join(root, entry.fileName)]));
}

test("persistence authority selection is explicit and file-current does not initialize PostgreSQL", async () => {
  assert.equal(resolvePersistenceAuthority({ env: {} }), LAWOS_PERSISTENCE_AUTHORITIES.fileCurrent);
  assert.equal(resolvePersistenceAuthority({ value: "postgres-v2", env: {} }), LAWOS_PERSISTENCE_AUTHORITIES.postgresV2);
  assert.throws(() => resolvePersistenceAuthority({ value: "auto", env: {} }), {
    code: "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  });
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

test("PostgreSQL authority defaults to verified TLS and requires explicit local-only disable", async () => {
  let connectorOptions;
  const connection = {
    query: async () => ({ rows: [{ authority_ready: 1 }] }),
    end: async () => {},
  };
  const secure = await preparePersistenceAuthority({
    value: "postgres-v2",
    env: { LAWOS_POSTGRES_URL: "postgresql://db.example.test/lawos" },
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
      env: { LAWOS_POSTGRES_URL: "postgresql://user:secret@db.example.test/lawos" },
      connectPostgres: async () => {
        throw new Error("connection failed for postgresql://user:secret@db.example.test/lawos");
      },
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED"
      && error?.exitCode === 78
      && !error.message.includes("secret"),
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
      persistenceAuthorityEnv: { LAWOS_POSTGRES_URL: "postgresql://127.0.0.1:1/unavailable" },
      persistenceConnectPostgres: async () => {
        throw new Error("synthetic unavailable database");
      },
      ...storePathsUnder(storeRoot),
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED" && /fallback is disabled/u.test(error.message),
  );
  assert.equal(existsSync(storeRoot), false);
});

test("API startup closes a successful foundation connection and blocks incomplete PostgreSQL domain adapters", async (t) => {
  const parent = mkdtempSync(join(tmpdir(), "lawos-authority-domain-gate-"));
  const storeRoot = join(parent, "must-remain-absent");
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  let closed = false;
  await assert.rejects(
    startApiServer({
      port: 0,
      persistenceAuthority: "postgres-v2",
      persistenceAuthorityEnv: { LAWOS_POSTGRES_URL: "postgresql://127.0.0.1:5432/disposable" },
      persistenceConnectPostgres: async () => ({
        query: async () => ({ rows: [{ authority_ready: 1 }] }),
        end: async () => { closed = true; },
      }),
      ...storePathsUnder(storeRoot),
    }),
    (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED" && /domain adapters are incomplete/u.test(error.message),
  );
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
