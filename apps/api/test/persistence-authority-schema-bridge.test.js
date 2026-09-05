import assert from "node:assert/strict";
import test from "node:test";

import {
  preparePersistenceAuthority,
  verifyOperationalPostgresBridgeMigrationState,
  verifyOperationalPostgresMigrationState,
} from "../src/persistence-authority.js";
import {
  createOutlookAuthorityPostgresFixture,
  runOutlookAuthorityPostgresMigrations,
} from "./support/outlook-authority-postgres-fixture.js";

const INTERNAL = "309_client_internal_unsigned_installation_authority";
const HISTORY_ERROR = "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED";
const CHECKSUM_ERROR = "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH";
const DATABASE_SECRET = "synthetic-schema-bridge-database";
const TENANT_SECRET = "synthetic-schema-bridge-tenant-context";
const SIGNER_SECRET = "synthetic-schema-bridge-attestation-signer";

function observePool(pool) {
  const observations = { connects: 0, releases: 0, closes: 0, queries: [], snapshots: [] };
  return {
    observations,
    pool: {
      query: pool.query.bind(pool),
      async connect() {
        observations.connects += 1;
        const client = await pool.connect();
        return {
          async query(sql, values) {
            observations.queries.push(sql);
            const result = await client.query(sql, values);
            if (sql.startsWith("BEGIN")) {
              observations.snapshots.push((await client.query(`SELECT
                current_setting('transaction_isolation') AS isolation,
                current_setting('transaction_read_only') AS read_only`)).rows[0]);
            }
            return result;
          },
          release(error) {
            observations.releases += 1;
            client.release(error);
          },
        };
      },
      async end() { observations.closes += 1; },
    },
  };
}

function assertReadOnlySnapshot(observed, terminal) {
  assert.equal(observed.connects, 1);
  assert.equal(observed.releases, 1);
  assert.deepEqual(observed.snapshots, [{ isolation: "serializable", read_only: "on" }]);
  assert.equal(observed.queries[0], "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY");
  assert.equal(observed.queries.at(-1), terminal);
  assert.equal(observed.queries.filter((sql) => sql.startsWith("BEGIN")).length, 1);
  assert.ok(observed.queries.every((sql) => /^(?:BEGIN|SELECT|COMMIT|ROLLBACK)\b/u.test(sql)));
}

function startupOptions(fixture, observed, secretRequests, attestation = false) {
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
      secretRequests.push(secretId);
      if (secretId === DATABASE_SECRET) return "postgresql://synthetic.invalid/lawos";
      if (secretId === TENANT_SECRET) return fixture.tenantContextSecret;
      throw new Error("unexpected signer secret lookup");
    },
  };
}

async function preservedState(fixture) {
  const [history, pause] = await Promise.all([
    fixture.adminPool.query("SELECT * FROM lawos_meta.schema_migrations ORDER BY migration_id"),
    fixture.bootstrapPool.query("SELECT * FROM lawos_meta.outlook_authority_bootstrap_receipts"),
  ]);
  return { history: history.rows, pause: pause.rows };
}

function restoreHistoryRow(pool, row) {
  return pool.query(`INSERT INTO lawos_meta.schema_migrations
    (migration_id,checksum,applied_at,applied_by) VALUES ($1,$2,$3,$4)`,
  [row.migration_id, row.checksum, row.applied_at, row.applied_by]);
}

test("operational startup bridges exact 79 and 80 ledgers without migration writes", async (t) => {
  const fixture = await createOutlookAuthorityPostgresFixture(t);
  if (!fixture) return;
  await runOutlookAuthorityPostgresMigrations(fixture);
  const complete = await preservedState(fixture);
  assert.equal(complete.history.length, 80);
  const internalRow = complete.history.find(({ migration_id }) => migration_id === INTERNAL);

  for (const count of [80, 79]) {
    await t.test(`${count} rows permit startup with attestation disabled`, async () => {
      if (count === 79) {
        // Only the ledger is reconstructed; 010 objects remain to prove they cannot enable signing.
        await fixture.adminPool.query("DELETE FROM lawos_meta.schema_migrations WHERE migration_id=$1", [INTERNAL]);
      }
      try {
        const before = await preservedState(fixture);
        const bridge = observePool(fixture.appPool);
        const verified = await verifyOperationalPostgresBridgeMigrationState(bridge.pool);
        assert.equal(verified.length, count);
        assertReadOnlySnapshot(bridge.observations, "COMMIT");

        const startup = observePool(fixture.appPool);
        const requests = [];
        const state = await preparePersistenceAuthority(startupOptions(fixture, startup, requests));
        assert.equal(state.initialized, true);
        assert.equal(state.migration_count, count);
        assert.equal(state.fallback_attempted, false);
        assert.equal(state.json_fallback, false);
        assertReadOnlySnapshot(startup.observations, "COMMIT");
        assert.deepEqual(requests, [DATABASE_SECRET, TENANT_SECRET]);

        if (count === 79) {
          await assert.rejects(verifyOperationalPostgresMigrationState(fixture.appPool), { code: HISTORY_ERROR });
          const signing = observePool(fixture.appPool);
          const signingRequests = [];
          await assert.rejects(preparePersistenceAuthority(
            startupOptions(fixture, signing, signingRequests, true),
          ), (error) => {
            assert.equal(error.code, "LAWOS_RUNTIME_PREFLIGHT_FAILED");
            assert.equal(error.persistence_stage, "migration-catalog");
            assert.equal(error.persistence_reason, "INTERNAL_INSTALLATION_SCHEMA_REQUIRED");
            return true;
          });
          assertReadOnlySnapshot(signing.observations, "COMMIT");
          assert.equal(signing.observations.closes, 1);
          assert.deepEqual(signingRequests, [DATABASE_SECRET, TENANT_SECRET]);
          assert.equal(signingRequests.includes(SIGNER_SECRET), false);
        } else {
          assert.equal((await verifyOperationalPostgresMigrationState(fixture.appPool)).length, 80);
        }
        assert.deepEqual(await preservedState(fixture), before);
      } finally {
        if (count === 79) await restoreHistoryRow(fixture.adminPool, internalRow);
      }
    });
  }

  for (const scenario of [
    { name: "unknown 81st row", remove: [], extra: true, code: HISTORY_ERROR },
    { name: "partial 78-row prefix", remove: complete.history.slice(-2), code: HISTORY_ERROR },
    { name: "79 rows with a directory hole and 309 present", remove: [complete.history.find(
      ({ migration_id }) => migration_id === "149_hrx_049_hrx_directory_authority",
    )], code: HISTORY_ERROR },
    { name: "80 rows with checksum drift", remove: [], checksum: true, code: CHECKSUM_ERROR },
  ]) {
    await t.test(scenario.name, async () => {
      for (const row of scenario.remove) {
        await fixture.adminPool.query("DELETE FROM lawos_meta.schema_migrations WHERE migration_id=$1", [row.migration_id]);
      }
      if (scenario.extra) {
        await fixture.adminPool.query(`INSERT INTO lawos_meta.schema_migrations
          (migration_id,checksum,applied_by) VALUES ('999_unknown_bridge',$1,'synthetic-bridge')`,
        ["f".repeat(64)]);
      }
      if (scenario.checksum) {
        await fixture.adminPool.query("UPDATE lawos_meta.schema_migrations SET checksum=$1 WHERE migration_id=$2",
          ["0".repeat(64), INTERNAL]);
      }
      try {
        const before = await preservedState(fixture);
        const bridge = observePool(fixture.appPool);
        await assert.rejects(verifyOperationalPostgresBridgeMigrationState(bridge.pool), { code: scenario.code });
        assertReadOnlySnapshot(bridge.observations, "ROLLBACK");
        const startup = observePool(fixture.appPool);
        await assert.rejects(preparePersistenceAuthority(startupOptions(fixture, startup, [])), (error) => {
          assert.equal(error.persistence_stage, "migration-catalog");
          assert.equal(error.persistence_reason, scenario.checksum
            ? "MIGRATION_CHECKSUM_MISMATCH" : "MIGRATION_HISTORY_DIVERGED");
          return true;
        });
        assertReadOnlySnapshot(startup.observations, "ROLLBACK");
        assert.equal(startup.observations.closes, 1);
        assert.deepEqual(await preservedState(fixture), before);
      } finally {
        for (const row of scenario.remove) await restoreHistoryRow(fixture.adminPool, row);
        if (scenario.extra) await fixture.adminPool.query("DELETE FROM lawos_meta.schema_migrations WHERE migration_id='999_unknown_bridge'");
        if (scenario.checksum) {
          await fixture.adminPool.query("UPDATE lawos_meta.schema_migrations SET checksum=$1 WHERE migration_id=$2",
            [internalRow.checksum, INTERNAL]);
        }
      }
    });
  }
  assert.deepEqual(await preservedState(fixture), complete);
});
