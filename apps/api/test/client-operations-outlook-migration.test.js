import assert from "node:assert/strict";
import test from "node:test";

import { listHrxPostgresMigrations } from "../../../packages/hrx/src/postgres-migrations.js";
import {
  checksumPostgresMigration,
  listPostgresFoundationMigrations,
} from "../../../packages/persistence/src/postgres/migration-catalog.js";
import { createPostgresPool } from "../../../packages/persistence/src/postgres/pool.js";
import { runPostgresMigrations } from "../../../packages/persistence/src/postgres/migration-runner.js";
import {
  createMigratedPostgresFixture,
  startDisposablePostgres,
} from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  listClientOperationsPostgresMigrations,
  runClientOperationsPostgresMigrations,
  verifyClientOperationsPostgresMigrations,
} from "../src/client-operations-schema.js";

const CORRECTION = "302_client_email_filing_correction";
const OUTLOOK = "303_client_outlook_conversation_sync";
const DESKTOP = "304_client_outlook_desktop_installation";

function poolWithMigrationHistory(rows) {
  const client = {
    async query(sql) {
      if (String(sql).includes("FROM lawos_meta.schema_migrations")) return { rows };
      return { rows: [] };
    },
    release() {},
  };
  return { connect: async () => client };
}

async function tableExists(pool, name) {
  const result = await pool.query(
    "SELECT to_regclass($1) AS relation",
    [`lawos_email_dms.${name}`],
  );
  return result.rows[0].relation !== null;
}

test("combined client catalog applies filing correction 302, Outlook sync 303, then desktop lifecycle 304", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;

  const result = await runClientOperationsPostgresMigrations(fixture.adminPool, {
    appliedBy: "outlook-combined-fresh-test",
  });

  assert.deepEqual(result.slice(-3).map(({ id, applied }) => ({ id, applied })), [
    { id: CORRECTION, applied: true },
    { id: OUTLOOK, applied: true },
    { id: DESKTOP, applied: true },
  ]);
  assert.equal(await tableExists(fixture.adminPool, "email_filing_placements"), true);
  assert.equal(await tableExists(fixture.adminPool, "conversation_policies"), true);
  assert.equal(await tableExists(fixture.adminPool, "outlook_desktop_installations"), true);
  assert.equal((await verifyClientOperationsPostgresMigrations(fixture.adminPool)).at(-1).id, DESKTOP);
});

test("combined client catalog upgrades a database already at filing correction 302 without replaying it", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const catalog = listClientOperationsPostgresMigrations();
  const correctionIndex = catalog.findIndex(({ id }) => id === CORRECTION);
  assert.ok(correctionIndex > 0);
  await runPostgresMigrations(fixture.adminPool, {
    migrations: catalog.slice(0, correctionIndex + 1),
    appliedBy: "outlook-combined-correction-prefix-test",
  });
  assert.equal(await tableExists(fixture.adminPool, "email_filing_placements"), true);
  assert.equal(await tableExists(fixture.adminPool, "conversation_policies"), false);

  const result = await runClientOperationsPostgresMigrations(fixture.adminPool, {
    appliedBy: "outlook-combined-upgrade-test",
  });

  assert.equal(result.find(({ id }) => id === CORRECTION).applied, false);
  assert.equal(result.find(({ id }) => id === OUTLOOK).applied, true);
  assert.equal(result.find(({ id }) => id === DESKTOP).applied, true);
  assert.equal(await tableExists(fixture.adminPool, "conversation_policies"), true);
  assert.equal(await tableExists(fixture.adminPool, "outlook_desktop_installations"), true);
  assert.equal((await verifyClientOperationsPostgresMigrations(fixture.adminPool)).at(-1).id, DESKTOP);
});

test("combined client catalog reconciles verified foundation 001-011 plus HRX history and replays idempotently", async (t) => {
  const instance = await startDisposablePostgres(t);
  if (!instance) return;
  const pool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "client-operations-subset-reconciliation-test",
  });
  t.after(async () => {
    await pool.end();
    await instance.stop();
  });
  const foundation = listPostgresFoundationMigrations();
  const oldProductionCatalog = [
    ...foundation.slice(0, 11),
    ...listHrxPostgresMigrations(),
  ];
  const catalog = listClientOperationsPostgresMigrations();
  const oldProductionIds = new Set(oldProductionCatalog.map(({ id }) => id));
  const missingIds = catalog
    .filter(({ id }) => !oldProductionIds.has(id))
    .map(({ id }) => id);

  assert.equal(oldProductionCatalog[10].id, "011_identity_session_membership_authority");
  await runPostgresMigrations(pool, {
    migrations: oldProductionCatalog,
    appliedBy: "synthetic-old-production-test",
  });
  await pool.query("CREATE ROLE lawos_app LOGIN");
  await assert.rejects(
    runPostgresMigrations(pool, {
      migrations: catalog,
      appliedBy: "strict-prefix-negative-test",
    }),
    (error) => error?.code === "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED"
      && error?.migration_id === "100_hrx_schema"
      && error?.expected_migration_id === "012_outlook_document_source_identity",
  );

  const reconciled = await runClientOperationsPostgresMigrations(pool, {
    appliedBy: "verified-subset-reconciliation-test",
  });
  assert.deepEqual(
    reconciled.filter(({ applied }) => applied).map(({ id }) => id),
    missingIds,
  );
  assert.deepEqual(
    (await verifyClientOperationsPostgresMigrations(pool)).map(({ id }) => id),
    catalog.map(({ id }) => id),
  );

  const replay = await runClientOperationsPostgresMigrations(pool, {
    appliedBy: "verified-subset-replay-test",
  });
  assert.equal(replay.every(({ applied }) => !applied), true);
});

test("combined client catalog upgrades existing 001-014 plus 100/200/300 history with additive 015 and replays", async (t) => {
  const instance = await startDisposablePostgres(t);
  if (!instance) return;
  const pool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "client-operations-015-reconciliation-test",
  });
  t.after(async () => {
    await pool.end();
    await instance.stop();
  });
  await pool.query("CREATE ROLE lawos_app LOGIN");
  const catalog = listClientOperationsPostgresMigrations();
  const oldProductionCatalog = catalog.filter(({ id }) => id !== "015_external_tenant_provisioning");
  await runPostgresMigrations(pool, {
    migrations: oldProductionCatalog,
    appliedBy: "synthetic-pre-015-production-test",
  });
  assert.equal((await pool.query("SELECT to_regclass('lawos_identity.tenants') AS relation")).rows[0].relation, null);

  const upgraded = await runClientOperationsPostgresMigrations(pool, {
    appliedBy: "verified-015-reconciliation-test",
  });
  assert.deepEqual(
    upgraded.filter(({ applied }) => applied).map(({ id }) => id),
    ["015_external_tenant_provisioning"],
  );
  assert.notEqual((await pool.query("SELECT to_regclass('lawos_identity.tenants') AS relation")).rows[0].relation, null);
  assert.deepEqual(
    (await verifyClientOperationsPostgresMigrations(pool)).map(({ id }) => id),
    catalog.map(({ id }) => id),
  );
  const replay = await runClientOperationsPostgresMigrations(pool, {
    appliedBy: "verified-015-replay-test",
  });
  assert.equal(replay.every(({ applied }) => !applied), true);
});

test("client migration wrapper rejects holes outside exact foundation 012-015 allowlist", async (t) => {
  const catalog = listClientOperationsPostgresMigrations();
  const hrxStart = catalog.findIndex(({ id }) => id.startsWith("100_"));
  const clientStart = catalog.findIndex(({ id }) => id === "300_client_m365_connection");
  const row = ({ id, sql }) => ({
    migration_id: id,
    checksum: checksumPostgresMigration(sql),
  });
  const foundation001To011 = catalog.slice(0, 11);
  const hrx = catalog.slice(hrxStart, clientStart);
  const scenarios = [
    {
      name: "foundation 011 hole",
      rows: [...foundation001To011.slice(0, -1), ...hrx].map(row),
    },
    {
      name: "client 300 hole",
      rows: [...foundation001To011, ...hrx, catalog[clientStart + 1]].map(row),
    },
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      await assert.rejects(
        runClientOperationsPostgresMigrations(poolWithMigrationHistory(scenario.rows)),
        (error) => error?.code === "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
      );
    });
  }
});
