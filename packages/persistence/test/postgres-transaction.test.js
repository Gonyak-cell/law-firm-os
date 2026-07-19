import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresPool, resolvePostgresPoolConfig } from "../src/postgres/pool.js";
import { listPostgresFoundationMigrations } from "../src/postgres/migration-catalog.js";
import { runPostgresMigrations } from "../src/postgres/migration-runner.js";
import {
  commitPostgresRecordWithAuditOutbox,
  createPostgresRepositoryPortV2,
} from "../src/postgres/repository-v2.js";
import { withPostgresTransaction } from "../src/postgres/transaction.js";
import {
  createMigratedPostgresFixture,
  startDisposablePostgres,
} from "./helpers/disposable-postgres.js";

test("PostgreSQL pool requires verified TLS except for explicit loopback disposable use", () => {
  const secure = resolvePostgresPoolConfig({ connectionString: "postgresql://db.example.test/lawos" });
  assert.deepEqual(secure.ssl, { rejectUnauthorized: true });
  assert.equal(secure.connectionTimeoutMillis, 5_000);
  assert.equal(secure.statement_timeout, 15_000);
  assert.throws(
    () => resolvePostgresPoolConfig({ connectionString: "postgresql://db.example.test/lawos", sslMode: "disable", allowInsecureLocal: true }),
    /loopback/u,
  );
  assert.throws(
    () => resolvePostgresPoolConfig({ connectionString: "postgresql://db.example.test/lawos?sslmode=disable" }),
    /query parameters are not allowed/u,
  );
  assert.throws(
    () => resolvePostgresPoolConfig({ connectionString: "postgresql://db.example.test/lawos?host=%2Ftmp" }),
    /query parameters are not allowed/u,
  );
  const local = resolvePostgresPoolConfig({
    connectionString: "postgresql://127.0.0.1:5432/postgres",
    sslMode: "disable",
    allowInsecureLocal: true,
  });
  assert.equal(local.ssl, false);
});

test("SQL migration runner is forward-only, checksum-bound and idempotent", async (t) => {
  const instance = await startDisposablePostgres(t);
  if (!instance) return;
  const pool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-migration-contract-test",
  });
  t.after(async () => {
    await pool.end();
    await instance.stop();
  });
  const first = await runPostgresMigrations(pool, { appliedBy: "first-test-run" });
  const second = await runPostgresMigrations(pool, { appliedBy: "second-test-run" });
  assert.equal(first.length, listPostgresFoundationMigrations().length);
  assert.equal(first.every((migration) => migration.applied), true);
  assert.equal(second.every((migration) => !migration.applied), true);
  const [migration] = listPostgresFoundationMigrations();
  await assert.rejects(
    runPostgresMigrations(pool, {
      migrations: [{ ...migration, sql: `${migration.sql}\nSELECT 1;` }],
      appliedBy: "checksum-negative-test",
    }),
    (error) => error?.code === "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH",
  );
  await assert.rejects(
    runPostgresMigrations(pool, {
      migrations: [{ id: "002_without_applied_prefix", sql: "SELECT 1;" }],
      appliedBy: "history-divergence-negative-test",
    }),
    (error) => error?.code === "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
  );
});

test("transaction tenant setting and RLS block cross-tenant visibility and writes", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repository = createPostgresRepositoryPortV2({ pool: fixture.appPool });
  await repository.write({
    tenant_id: "tenant-rls-a",
    record_type: "RlsRecord",
    record_id: "rls-1",
    expected_version: 0,
    data: { visible: "tenant-a-only" },
  });
  const setting = await withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-rls-a" }, async (client) =>
    client.query("SELECT current_setting('app.current_tenant_id') AS tenant"));
  assert.equal(setting.rows[0].tenant, "tenant-rls-a");
  const retargeted = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-rls-a" },
    async (client) => {
      await client.query("SELECT set_config('app.current_tenant_id', 'tenant-rls-b', true)");
      const authenticated = await client.query("SELECT lawos_security.current_tenant_id() AS tenant");
      const visible = await client.query("SELECT count(*)::int AS count FROM lawos_runtime.records");
      return { tenant: authenticated.rows[0].tenant, count: visible.rows[0].count };
    },
  );
  assert.deepEqual(retargeted, { tenant: null, count: 0 });
  await assert.rejects(
    fixture.appPool.query("SELECT context_secret FROM lawos_security.tenant_context_authorities"),
    (error) => error?.code === "42501",
  );
  assert.equal(await repository.read({ tenant_id: "tenant-rls-b", record_type: "RlsRecord", record_id: "rls-1" }), undefined);
  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-rls-a" }, (client) => client.query(
      `INSERT INTO lawos_runtime.records
         (tenant_id, record_type, record_id, state_version, data)
       VALUES ('tenant-rls-b', 'RlsRecord', 'cross-write', 1, '{}'::jsonb)`,
    )),
    (error) => error?.code === "LAWOS_POSTGRES_ACCESS_DENIED" && error?.status === 403,
  );
});

test("domain row, audit and outbox commit or roll back as one transaction", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repository = createPostgresRepositoryPortV2({
    pool: fixture.appPool,
    clock: () => "2026-07-16T11:03:00.000Z",
  });
  const committed = await commitPostgresRecordWithAuditOutbox(repository, {
    tenant_id: "tenant-atomic",
    record: {
      record_type: "AtomicRecord",
      record_id: "atomic-1",
      expected_version: 0,
      data: { state: "committed" },
    },
    audit_event: {
      event_id: "audit-atomic-1",
      event_type: "atomic.committed",
      object_type: "AtomicRecord",
      object_id: "atomic-1",
    },
    outbox_event: {
      event_id: "outbox-atomic-1",
      topic: "atomic.committed",
      payload: { record_id: "atomic-1" },
    },
  });
  assert.equal(committed.record.state_version, 1);
  assert.equal(committed.outbox.status, "pending");

  await assert.rejects(
    commitPostgresRecordWithAuditOutbox(repository, {
      tenant_id: "tenant-atomic",
      record: {
        record_type: "AtomicRecord",
        record_id: "atomic-rollback",
        expected_version: 0,
        data: { state: "must-rollback" },
      },
      audit_event: {
        event_id: "audit-atomic-rollback",
        event_type: "atomic.must_rollback",
      },
      outbox_event: {
        event_id: "outbox-atomic-rollback",
        topic: "",
      },
    }),
    /outbox topic is required/u,
  );
  assert.equal(await repository.read({ tenant_id: "tenant-atomic", record_type: "AtomicRecord", record_id: "atomic-rollback" }), undefined);
  assert.equal((await repository.listAudit({ tenant_id: "tenant-atomic" })).some((event) => event.event_id === "audit-atomic-rollback"), false);
  const outboxCount = await withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-atomic" }, async (client) =>
    client.query("SELECT count(*)::int AS count FROM lawos_runtime.outbox_events"));
  assert.equal(outboxCount.rows[0].count, 1);
  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: "tenant-atomic" }, (client) => client.query(
      "UPDATE lawos_runtime.audit_events SET event_type = 'tampered' WHERE event_id = 'audit-atomic-1'",
    )),
    (error) => error?.code === "LAWOS_POSTGRES_ACCESS_DENIED",
  );
  await assert.rejects(
    fixture.adminPool.query("UPDATE lawos_runtime.audit_events SET event_type = 'owner-tampered' WHERE event_id = 'audit-atomic-1'"),
    (error) => error?.code === "55000",
  );
});

test("deadlock victim is rolled back and retried without losing either transaction", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await fixture.adminPool.query("ALTER ROLE lawos_app SET deadlock_timeout = '100ms'");
  await fixture.adminPool.query("CREATE TABLE public.deadlock_probe (id integer PRIMARY KEY, value integer NOT NULL)");
  await fixture.adminPool.query("INSERT INTO public.deadlock_probe (id, value) VALUES (1, 0), (2, 0)");
  await fixture.adminPool.query("GRANT SELECT, UPDATE ON public.deadlock_probe TO lawos_app");

  let arrivals = 0;
  let releaseBarrier;
  const barrier = new Promise((resolve) => { releaseBarrier = resolve; });
  const updateBoth = (firstId, secondId) => withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-deadlock", maxAttempts: 3, retryDelayMillis: 1 },
    async (client, { attempt }) => {
      await client.query("UPDATE public.deadlock_probe SET value = value + 1 WHERE id = $1", [firstId]);
      if (attempt === 1) {
        arrivals += 1;
        if (arrivals === 2) releaseBarrier();
        await barrier;
      }
      await client.query("UPDATE public.deadlock_probe SET value = value + 1 WHERE id = $1", [secondId]);
      return attempt;
    },
  );
  const attempts = await Promise.all([updateBoth(1, 2), updateBoth(2, 1)]);
  assert.equal(attempts.some((attempt) => attempt > 1), true);
  const final = await fixture.adminPool.query("SELECT id, value FROM public.deadlock_probe ORDER BY id");
  assert.deepEqual(final.rows, [{ id: 1, value: 2 }, { id: 2, value: 2 }]);
});
