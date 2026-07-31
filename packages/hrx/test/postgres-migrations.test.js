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
  verifyHrxPostgresMigrationState,
} from "../src/postgres-migrations.js";
import { loadHrxCoreMigrations } from "../src/migrations/index.js";
import { HRX_APPEND_ONLY_TABLES, HRX_STORE_TABLES } from "../src/store/file-store.js";

test("HRX migration inventory classifies every SQLite source and translates every abort trigger", () => {
  const inventory = classifyHrxPostgresMigrationGaps();
  const sourceMigrations = loadHrxCoreMigrations();
  assert.equal(inventory.migration_count, sourceMigrations.length);
  assert.equal(inventory.table_count, HRX_STORE_TABLES.length);
  assert.equal(
    inventory.compatible_count + inventory.translated_trigger_migration_count,
    sourceMigrations.length,
  );
  assert.equal(
    inventory.translated_trigger_count,
    inventory.rows.reduce((count, row) => count + row.sqlite_trigger_count, 0),
  );
  assert.equal(inventory.rows.every((row) => row.translated_sql_ready), true);
  assert.equal(inventory.rows.every((row) => row.destructive_statement_count === 0), true);
  const postgresMigrations = listHrxPostgresMigrations();
  assert.equal(postgresMigrations.length >= sourceMigrations.length, true);
  assert.equal(new Set(postgresMigrations.map((migration) => migration.id)).size, postgresMigrations.length);
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

  const filingCorrectionSchema = await fixture.adminPool.query(
    `SELECT
       EXISTS (
         SELECT 1
           FROM information_schema.columns
          WHERE table_schema = 'lawos_hrx'
            AND table_name = 'hrx_payroll_runs'
            AND column_name = 'filing_source_hash'
       ) AS filing_source_hash_exists,
       EXISTS (
         SELECT 1
           FROM information_schema.columns
          WHERE table_schema = 'lawos_hrx'
            AND table_name = 'hrx_payroll_filing_jobs'
            AND column_name = 'previous_job_ref'
       ) AS previous_job_ref_exists,
       to_regclass('lawos_hrx.uq_hrx_payroll_filing_previous_job')::text AS previous_job_unique_index`,
  );
  assert.deepEqual(filingCorrectionSchema.rows[0], {
    filing_source_hash_exists: true,
    previous_job_ref_exists: true,
    previous_job_unique_index: "lawos_hrx.uq_hrx_payroll_filing_previous_job",
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
  const projectionHardening = await fixture.adminPool.query(
    `SELECT
       (SELECT count(*)::int
          FROM information_schema.columns
         WHERE table_schema = 'lawos_hrx'
           AND column_name = 'lawos_projection_deleted_at') AS soft_delete_column_count,
       (SELECT count(DISTINCT event_object_table)::int
          FROM information_schema.triggers
         WHERE trigger_schema = 'lawos_hrx'
           AND trigger_name = 'lawos_hrx_delete_guard') AS delete_guard_count,
       to_regclass('lawos_projection.hrx_backfill_checkpoint')::text AS checkpoint_table,
       to_regclass('lawos_projection.hrx_projection_lease')::text AS lease_table,
       to_regclass('lawos_projection.hrx_consumer_route')::text AS consumer_route_table`,
  );
  assert.deepEqual(projectionHardening.rows[0], {
    soft_delete_column_count: HRX_STORE_TABLES.length,
    delete_guard_count: HRX_STORE_TABLES.length,
    checkpoint_table: "lawos_projection.hrx_backfill_checkpoint",
    lease_table: "lawos_projection.hrx_projection_lease",
    consumer_route_table: "lawos_projection.hrx_consumer_route",
  });

  const replay = await runHrxPostgresMigrations(fixture.adminPool, { appliedBy: "hrx-disposable-test" });
  assert.equal(replay.every((migration) => migration.applied === false), true);
  const verified = await verifyHrxPostgresMigrationState(fixture.adminPool);
  assert.equal(verified.length, foundationMigrationCount + hrxMigrationCount);
  assert.equal(verified.every((migration) => migration.applied === true), true);

  await fixture.adminPool.query("GRANT USAGE ON SCHEMA lawos_hrx TO lawos_app");
  await fixture.adminPool.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA lawos_hrx TO lawos_app");
  await withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-hrx-a" }, (client) => client.query(
    `INSERT INTO lawos_hrx.hrx_employees (tenant_id, employee_id, display_name, status)
     VALUES ($1, 'employee-rls-001', 'Synthetic employee', 'active')`,
    ["tenant-hrx-a"],
  ));
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-hrx-a" },
    (client) => client.query(
      `INSERT INTO lawos_hrx.hrx_offboarding_cases
         (tenant_id, offboarding_id, employee_id, separation_date, state,
          access_revocations_json, document_returns_json, legal_hold_checks_json,
          matter_reassignments_json, handover_items_json,
          leave_reconciliation_status)
       VALUES ($1, 'offboarding-evidence-001', 'employee-rls-001',
               '2026-07-31', 'open', '[]', '[]', '[]', '[]', '[]', 'pending')`,
      ["tenant-hrx-a"],
    ),
  );
  for (const query of [
    `INSERT INTO lawos_hrx.hrx_offboarding_cases
       (tenant_id, offboarding_id, employee_id, separation_date, state,
        access_revocations_json, document_returns_json, legal_hold_checks_json,
        matter_reassignments_json, handover_items_json,
        leave_reconciliation_status)
     VALUES ($1, 'offboarding-evidence-missing', 'employee-rls-001',
             '2026-07-31', 'open', '[]', '[]', '[]', '[]', '[]',
             'approved_and_synced')`,
    `UPDATE lawos_hrx.hrx_offboarding_cases
        SET leave_reconciliation_status = 'approved_and_synced'
      WHERE tenant_id = $1
        AND offboarding_id = 'offboarding-evidence-001'`,
  ]) {
    await assert.rejects(
      withPostgresTransaction(
        fixture.appPool,
        { tenant_id: "tenant-hrx-a" },
        (client) => client.query(query, ["tenant-hrx-a"]),
      ),
      (error) => error?.postgres_code === "23514",
    );
  }
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-hrx-a" },
    (client) => client.query(
      `UPDATE lawos_hrx.hrx_offboarding_cases
          SET leave_reconciliation_status = 'approved_and_synced',
              leave_reconciliation_evidence_ref = 'PayrollProviderReceipt:postgres-001'
        WHERE tenant_id = $1
          AND offboarding_id = 'offboarding-evidence-001'`,
      ["tenant-hrx-a"],
    ),
  );
  await assert.rejects(
    withPostgresTransaction(
      fixture.appPool,
      { tenant_id: "tenant-hrx-a" },
      (client) => client.query(
        `UPDATE lawos_hrx.hrx_offboarding_cases
            SET leave_reconciliation_status = 'pending'
          WHERE tenant_id = $1
            AND offboarding_id = 'offboarding-evidence-001'`,
        ["tenant-hrx-a"],
      ),
    ),
    (error) => error?.postgres_code === "23514",
  );
  const hidden = await withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-hrx-b" }, (client) => client.query(
    "SELECT employee_id FROM lawos_hrx.hrx_employees WHERE employee_id = 'employee-rls-001'",
  ));
  assert.deepEqual(hidden.rows, []);
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-hrx-a" },
    (client) => client.query(
      `INSERT INTO lawos_hrx.hrx_audit_events
         (tenant_id, event_id, actor_id, action, object_type, object_id,
          decision, reason, source, metadata_json, event_hash, occurred_at)
       VALUES ($1, 'audit-append-only-001', 'actor-synthetic', 'created',
               'SyntheticObject', 'object-001', 'allow', 'test', 'test',
               '{}', $2, '2026-07-25T00:00:00.000Z')`,
      ["tenant-hrx-a", "a".repeat(64)],
    ),
  );
  for (const query of [
    `UPDATE lawos_hrx.hrx_audit_events
        SET reason = 'changed'
      WHERE tenant_id = $1 AND event_id = 'audit-append-only-001'`,
    `DELETE FROM lawos_hrx.hrx_audit_events
      WHERE tenant_id = $1 AND event_id = 'audit-append-only-001'`,
    `DELETE FROM lawos_hrx.hrx_employees
      WHERE tenant_id = $1 AND employee_id = 'employee-rls-001'`,
  ]) {
    await assert.rejects(
      withPostgresTransaction(
        fixture.appPool,
        { tenant_id: "tenant-hrx-a" },
        (client) => client.query(query, ["tenant-hrx-a"]),
      ),
      (error) => error?.postgres_code === "23514",
    );
  }

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
