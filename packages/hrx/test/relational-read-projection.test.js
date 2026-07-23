import assert from "node:assert/strict";
import test from "node:test";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { runHrxPostgresMigrations } from "../src/postgres-migrations.js";
import { projectHrxRelationalReadModel } from "../src/relational-read-projection.js";

async function prepareProjection(fixture) {
  await runHrxPostgresMigrations(fixture.adminPool, { appliedBy: "hrx-projection-test" });
  await fixture.adminPool.query("GRANT USAGE ON SCHEMA lawos_hrx, lawos_projection TO lawos_app");
  await fixture.adminPool.query("GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA lawos_hrx TO lawos_app");
  await fixture.adminPool.query("GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA lawos_projection TO lawos_app");
}

async function seedEmployee(fixture, {
  tenantId,
  employeeId,
  displayName,
  stateVersion = 1,
  eventId,
} = {}) {
  const payload = {
    tenant_id: tenantId,
    employee_id: employeeId,
    display_name: displayName,
    status: "active",
  };
  await withPostgresTransaction(fixture.appPool, { tenant_id: tenantId }, async (client) => {
    await client.query(
      `INSERT INTO lawos_domain.records
         (tenant_id, domain_id, record_type, record_id, state_version, payload, payload_hash, append_only)
       VALUES ($1, 'hrx', 'hrx_employees', $2, $3, $4::jsonb, $5, false)
       ON CONFLICT (tenant_id, domain_id, record_type, record_id) DO UPDATE
         SET state_version = EXCLUDED.state_version,
             payload = EXCLUDED.payload,
             payload_hash = EXCLUDED.payload_hash,
             updated_at = clock_timestamp()`,
      [tenantId, `employee:${employeeId}`, stateVersion, JSON.stringify(payload), hashDomainValue(payload)],
    );
    await client.query(
      `INSERT INTO lawos_domain.outbox_events
         (tenant_id, domain_id, event_id, topic, aggregate_type, aggregate_id, payload)
       VALUES ($1, 'hrx', $2, 'hrx.audit', 'hrx_employees', $3, '{}'::jsonb)`,
      [tenantId, eventId, employeeId],
    );
  });
}

test("HRX relational projection is one-way, replay-safe, RLS-isolated and incrementally source-driven", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-a";
  const negativeTenantId = "tenant-hrx-projection-b";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-001",
    displayName: "Projection Fixture A",
    eventId: "projection-event-001",
  });
  const backfill = await projectHrxRelationalReadModel({
    pool: fixture.appPool,
    tenant_id: tenantId,
    mode: "backfill",
    negativeTenantId,
  });
  assert.equal(backfill.outcome, "PASS");
  assert.equal(backfill.safe_counts.projected_insert_count, 1);
  assert.equal(backfill.safe_counts.tenant_negative_visible_count, 0);
  assert.equal(backfill.claims.generic_ledger_authority_preserved, true);
  assert.equal(backfill.claims.projection_write_authority, false);

  const replay = await projectHrxRelationalReadModel({
    pool: fixture.appPool,
    tenant_id: tenantId,
    mode: "incremental",
    negativeTenantId,
  });
  assert.equal(replay.safe_counts.consumed_outbox_event_count, 0);
  assert.equal(replay.safe_counts.projected_insert_count, 0);
  assert.equal(replay.safe_counts.projected_update_count, 0);

  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-001",
    displayName: "Projection Fixture A Updated",
    stateVersion: 2,
    eventId: "projection-event-002",
  });
  const updated = await projectHrxRelationalReadModel({
    pool: fixture.appPool,
    tenant_id: tenantId,
    mode: "incremental",
    negativeTenantId,
  });
  assert.equal(updated.safe_counts.projected_update_count, 1);
  const row = await withPostgresTransaction(fixture.appPool, { tenant_id: tenantId, readOnly: true }, (client) =>
    client.query("SELECT display_name FROM lawos_hrx.hrx_employees WHERE tenant_id = $1 AND employee_id = 'employee-001'", [tenantId]));
  assert.equal(row.rows[0].display_name, "Projection Fixture A Updated");
});

test("HRX relational projection rolls the entire tenant batch back on a mid-batch failure", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-rollback";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-001",
    displayName: "Rollback Fixture A",
    eventId: "rollback-event-001",
  });
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-002",
    displayName: "Rollback Fixture B",
    eventId: "rollback-event-002",
  });
  let processed = 0;
  await assert.rejects(projectHrxRelationalReadModel({
    pool: fixture.appPool,
    tenant_id: tenantId,
    mode: "backfill",
    faultInjector(point) {
      if (point === "after_record" && ++processed === 1) throw new Error("synthetic projection interruption");
    },
  }));
  const target = await withPostgresTransaction(fixture.appPool, { tenant_id: tenantId, readOnly: true }, (client) =>
    client.query("SELECT count(*)::integer AS count FROM lawos_hrx.hrx_employees WHERE tenant_id = $1", [tenantId]));
  const state = await withPostgresTransaction(fixture.appPool, { tenant_id: tenantId, readOnly: true }, (client) =>
    client.query("SELECT count(*)::integer AS count FROM lawos_projection.hrx_record_state WHERE tenant_id = $1", [tenantId]));
  assert.equal(target.rows[0].count, 0);
  assert.equal(state.rows[0].count, 0);
});
