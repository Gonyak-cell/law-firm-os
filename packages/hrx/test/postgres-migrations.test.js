import assert from "node:assert/strict";
import test from "node:test";
import { listPostgresFoundationMigrations } from "../../persistence/src/postgres/migration-catalog.js";
import { runPostgresMigrations } from "../../persistence/src/postgres/migration-runner.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  classifyHrxPostgresMigrationGaps,
  listHrxPostgresMigrations,
  runHrxPostgresMigrations,
} from "../src/postgres-migrations.js";
import { HRX_APPEND_ONLY_TABLES, HRX_STORE_TABLES } from "../src/store/file-store.js";

test("HRX migration inventory classifies all 31 SQLite sources and translates every abort trigger", () => {
  const inventory = classifyHrxPostgresMigrationGaps();
  assert.equal(inventory.migration_count, 31);
  assert.equal(inventory.table_count, 77);
  assert.equal(inventory.compatible_count + inventory.translated_trigger_migration_count, 31);
  assert.equal(inventory.translated_trigger_count, 14);
  assert.equal(inventory.rows.every((row) => row.translated_sql_ready), true);
  assert.equal(inventory.rows.every((row) => row.destructive_statement_count === 0), true);
  assert.equal(listHrxPostgresMigrations().length, 34);
  assert.equal(new Set(listHrxPostgresMigrations().map((migration) => migration.id)).size, 34);
});

test("HRX PostgreSQL migrations pass fresh, upgrade, RLS, checksum and recovery contracts", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const foundationMigrationCount = listPostgresFoundationMigrations().length;
  const hrxMigrationCount = listHrxPostgresMigrations().length;
  const first = await runHrxPostgresMigrations(fixture.adminPool, { appliedBy: "hrx-disposable-test" });
  assert.equal(first.length, foundationMigrationCount + hrxMigrationCount);
  assert.equal(first.slice(0, foundationMigrationCount).every((migration) => migration.applied === false), true);
  assert.equal(first.slice(foundationMigrationCount).every((migration) => migration.applied === true), true);

  const objects = await fixture.adminPool.query(
    `SELECT
       (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'lawos_hrx') AS table_count,
       (SELECT count(*)::int
          FROM pg_class AS relation
          JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = 'lawos_hrx'
           AND relation.relkind = 'r'
           AND relation.relrowsecurity
           AND relation.relforcerowsecurity) AS forced_rls_count,
       (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'lawos_hrx' AND policyname = 'tenant_isolation') AS policy_count`,
  );
  assert.deepEqual(objects.rows[0], {
    table_count: HRX_STORE_TABLES.length,
    forced_rls_count: HRX_STORE_TABLES.length,
    policy_count: HRX_STORE_TABLES.length,
  });

  const appendOnlyTriggers = await fixture.adminPool.query(
    `SELECT event_object_table
       FROM information_schema.triggers
      WHERE trigger_schema = 'lawos_hrx'
        AND trigger_name = 'lawos_hrx_append_only_guard'
      ORDER BY event_object_table`,
  );
  assert.deepEqual(
    [...new Set(appendOnlyTriggers.rows.map(({ event_object_table }) => event_object_table))],
    [...HRX_APPEND_ONLY_TABLES],
  );

  const replay = await runHrxPostgresMigrations(fixture.adminPool, { appliedBy: "hrx-disposable-test" });
  assert.equal(replay.every((migration) => migration.applied === false), true);

  await fixture.adminPool.query("GRANT USAGE ON SCHEMA lawos_hrx TO lawos_app");
  await fixture.adminPool.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA lawos_hrx TO lawos_app");
  await withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-hrx-a" }, (client) => client.query(
    `INSERT INTO lawos_hrx.hrx_employees (tenant_id, employee_id, display_name, status)
     VALUES ($1, 'employee-rls-001', 'Synthetic employee', 'active')`,
    ["tenant-hrx-a"],
  ));
  const hidden = await withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-hrx-b" }, (client) => client.query(
    "SELECT employee_id FROM lawos_hrx.hrx_employees WHERE employee_id = 'employee-rls-001'",
  ));
  assert.deepEqual(hidden.rows, []);

  const catalog = [...listPostgresFoundationMigrations(), ...listHrxPostgresMigrations()];
  const drifted = catalog.map((migration) => migration.id === "101_hrx_001_hrx_core"
    ? { ...migration, sql: `${migration.sql}\nSELECT 1;` }
    : migration);
  await assert.rejects(
    runPostgresMigrations(fixture.adminPool, { migrations: drifted, appliedBy: "hrx-drift-test" }),
    (error) => error?.code === "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH",
  );

  const failingMigration = {
    id: "299_hrx_synthetic_failure",
    sql: "CREATE TABLE lawos_hrx.must_rollback (tenant_id text); SELECT missing_hrx_function();",
  };
  await assert.rejects(
    runPostgresMigrations(fixture.adminPool, {
      migrations: [...catalog, failingMigration],
      appliedBy: "hrx-recovery-test",
    }),
  );
  const rollback = await fixture.adminPool.query(
    `SELECT
       to_regclass('lawos_hrx.must_rollback') AS rolled_back_table,
       EXISTS (SELECT 1 FROM lawos_meta.schema_migrations WHERE migration_id = '299_hrx_synthetic_failure') AS receipt_exists`,
  );
  assert.deepEqual(rollback.rows[0], { rolled_back_table: null, receipt_exists: false });
});
