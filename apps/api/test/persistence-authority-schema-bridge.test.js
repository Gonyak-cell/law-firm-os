import assert from "node:assert/strict";
import test from "node:test";
import { checksumPostgresMigration } from "../../../packages/persistence/src/postgres/migration-catalog.js";

import { listClientOperationsPostgresMigrations } from "../src/client-operations-schema.js";
import {
  preparePersistenceAuthority,
  verifyOperationalPostgresBridgeMigrationState,
  verifyOperationalPostgresMigrationState,
} from "../src/persistence-authority.js";

const INTERNAL = "309_client_internal_unsigned_installation_authority";
const CORPORATE = "016_dms_corporate_workspace";
const HISTORY_ERROR = "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED";
const CHECKSUM_ERROR = "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH";
const DATABASE_SECRET = "synthetic-schema-bridge-database";
const TENANT_SECRET = "synthetic-schema-bridge-tenant-context";
const SIGNER_SECRET = "synthetic-schema-bridge-attestation-signer";
const complete = listClientOperationsPostgresMigrations().map(({ id, sql }) => ({
  migration_id: id, checksum: checksumPostgresMigration(sql),
}));
const authority = complete.filter(({ migration_id }) => migration_id !== CORPORATE);
const historical = authority.filter(({ migration_id }) => migration_id !== INTERNAL);

// These are closed query fixtures. Real DDL and role snapshots are exercised in
// persistence-authority-schema-transition-postgres.test.js.
function snapshotPool(rows, { count = rows.length, countRows } = {}) {
  const observations = { connects: 0, releases: 0, closes: 0, queries: [] };
  const query = async (sql) => {
    observations.queries.push(sql);
    if (/^(?:BEGIN|COMMIT|ROLLBACK)\b/u.test(sql)) return { rows: [] };
    if (sql === "SELECT count(*)::integer AS migration_count FROM lawos_meta.schema_migrations") {
      return { rows: countRows ?? [{ migration_count: count }] };
    }
    if (sql === "SELECT migration_id, checksum FROM lawos_meta.schema_migrations ORDER BY migration_id") {
      return { rows: rows.map((row) => ({ ...row })) };
    }
    throw new Error(`Unexpected schema bridge statement: ${sql}`);
  };
  return {
    observations,
    pool: {
      async query(sql) {
        if (sql === "SELECT 1 AS authority_ready") return { rows: [{ authority_ready: 1 }] };
        if (sql === "SELECT lawos_security.tenant_context_authority_ready() AS ready") return { rows: [{ ready: true }] };
        return query(sql);
      },
      async connect() {
        observations.connects += 1;
        return { query, release() { observations.releases += 1; } };
      },
      async end() { observations.closes += 1; },
    },
  };
}

function assertReadOnlySnapshot(observed, terminal) {
  assert.equal(observed.connects, 1);
  assert.equal(observed.releases, 1);
  assert.equal(observed.queries[0], "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY");
  assert.equal(observed.queries.at(-1), terminal);
  assert.equal(observed.queries.filter((sql) => sql.startsWith("BEGIN")).length, 1);
  assert.ok(observed.queries.every((sql) => /^(?:BEGIN|SELECT|COMMIT|ROLLBACK)\b/u.test(sql)));
}

function startupOptions(observed, requests, attestation = false) {
  return {
    env: {
      LAWOS_RUNTIME_PROFILE: "operational",
      LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
      LAWOS_POSTGRES_URL_SECRET_ID: DATABASE_SECRET,
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: TENANT_SECRET,
      ...(attestation ? { LAWOS_INTERNAL_INSTALLATION_ATTESTATION_SECRET_ID: SIGNER_SECRET } : {}),
    },
    connectPostgres: async () => observed.pool,
    async resolvePostgresSecret({ secretId }) {
      requests.push(secretId);
      if (secretId === DATABASE_SECRET) return "postgresql://synthetic.invalid/lawos";
      if (secretId === TENANT_SECRET) return "synthetic-tenant-context-secret-material-48-bytes-long";
      throw new Error("unexpected signer secret lookup");
    },
  };
}

test("schema bridge selects only exact historical79, authority80, and combined81 snapshots", async (t) => {
  assert.equal(historical.length, 79);
  assert.equal(authority.length, 80);
  assert.equal(complete.length, 81);
  for (const rows of [historical, authority, complete]) {
    await t.test(`${rows.length} exact rows permit config-off startup in one read-only snapshot`, async () => {
      const bridge = snapshotPool(rows);
      assert.equal((await verifyOperationalPostgresBridgeMigrationState(bridge.pool)).length, rows.length);
      assertReadOnlySnapshot(bridge.observations, "COMMIT");
      const startup = snapshotPool(rows);
      const requests = [];
      const state = await preparePersistenceAuthority(startupOptions(startup, requests));
      assert.equal(state.initialized, true);
      assert.equal(state.migration_count, rows.length);
      assert.equal(state.fallback_attempted, false);
      assert.equal(state.json_fallback, false);
      assertReadOnlySnapshot(startup.observations, "COMMIT");
      assert.deepEqual(requests, [DATABASE_SECRET, TENANT_SECRET]);

      const strict = snapshotPool(rows);
      if (rows.length === 81) {
        assert.equal((await verifyOperationalPostgresMigrationState(strict.pool)).length, 81);
      } else {
        await assert.rejects(verifyOperationalPostgresMigrationState(strict.pool), { code: HISTORY_ERROR });
      }
    });
  }
});

test("historical79 rejects signer activation before a signer secret is read", async () => {
  const signing = snapshotPool(historical);
  const requests = [];
  await assert.rejects(preparePersistenceAuthority(startupOptions(signing, requests, true)), (error) => {
    assert.equal(error.code, "LAWOS_RUNTIME_PREFLIGHT_FAILED");
    assert.equal(error.persistence_stage, "migration-catalog");
    assert.equal(error.persistence_reason, "INTERNAL_INSTALLATION_SCHEMA_REQUIRED");
    return true;
  });
  assertReadOnlySnapshot(signing.observations, "COMMIT");
  assert.equal(signing.observations.closes, 1);
  assert.deepEqual(requests, [DATABASE_SECRET, TENANT_SECRET]);
});

test("schema bridge rejects DMS-only80, incomplete, extra, malformed, and checksum-drift snapshots", async (t) => {
  const drift = (rows, id) => rows.map((row) => row.migration_id === id ? { ...row, checksum: "0".repeat(64) } : row);
  for (const scenario of [
    { name: "DMS-only80 has 016 and no 309", rows: complete.filter(({ migration_id }) => migration_id !== INTERNAL) },
    { name: "unknown 82nd row", rows: [...complete, { migration_id: "999_unknown_bridge", checksum: "f".repeat(64) }] },
    { name: "partial 78-row prefix", rows: historical.slice(0, -1) },
    { name: "79 rows with a directory hole and 309", rows: authority.filter(({ migration_id }) => migration_id !== "149_hrx_049_hrx_directory_authority") },
    { name: "authority80 checksum drift", rows: drift(authority, INTERNAL), code: CHECKSUM_ERROR },
    { name: "combined81 corporate checksum drift", rows: drift(complete, CORPORATE), code: CHECKSUM_ERROR },
    { name: "claimed81 with only80 rows", rows: authority, count: 81 },
    { name: "string count", rows: complete, count: "81" },
    { name: "missing count row", rows: complete, countRows: [] },
    { name: "duplicate count rows", rows: complete, countRows: [{ migration_count: 81 }, { migration_count: 81 }] },
  ]) {
    await t.test(scenario.name, async () => {
      const bridge = snapshotPool(scenario.rows, scenario);
      await assert.rejects(verifyOperationalPostgresBridgeMigrationState(bridge.pool), {
        code: scenario.code ?? HISTORY_ERROR,
      });
      assertReadOnlySnapshot(bridge.observations, "ROLLBACK");
      const startup = snapshotPool(scenario.rows, scenario);
      await assert.rejects(preparePersistenceAuthority(startupOptions(startup, [])), (error) => {
        assert.equal(error.persistence_stage, "migration-catalog");
        assert.equal(error.persistence_reason, scenario.code === CHECKSUM_ERROR
          ? "MIGRATION_CHECKSUM_MISMATCH" : "MIGRATION_HISTORY_DIVERGED");
        return true;
      });
      assertReadOnlySnapshot(startup.observations, "ROLLBACK");
      assert.equal(startup.observations.closes, 1);
    });
  }
});
