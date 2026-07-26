import assert from "node:assert/strict";
import test from "node:test";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { createJsonPostgresPerformanceAcceptance } from "../../persistence/src/postgres/performance-acceptance.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  createHrxRelationalMappingManifest,
  inspectHrxRelationalSchema,
} from "../src/relational-projection-contract.js";
import {
  collectHrxRelationalProductionInventory,
} from "../src/relational-projection-validation.js";
import { runHrxPostgresMigrations } from "../src/postgres-migrations.js";
import { projectHrxRelationalReadModel } from "../src/relational-read-projection.js";

async function prepareProjection(fixture) {
  await runHrxPostgresMigrations(fixture.adminPool, {
    appliedBy: "hrx-projection-test",
  });
  await fixture.adminPool.query(
    "GRANT USAGE ON SCHEMA lawos_hrx, lawos_projection TO lawos_app",
  );
  await fixture.adminPool.query(
    "GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA lawos_hrx TO lawos_app",
  );
  await fixture.adminPool.query(
    "GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA lawos_projection TO lawos_app",
  );
}

function eventPayload(recordId) {
  return {
    audit_event_id: `audit:${recordId}`,
    event_type: "hrx.employee.changed",
    payload_hash: hashDomainValue({ record_id: recordId }),
    projection_records: [{
      record_type: "hrx_employees",
      record_id: recordId,
    }],
  };
}

async function seedEmployee(fixture, {
  tenantId,
  employeeId,
  displayName,
  stateVersion = 1,
  eventId,
  extraPayload = {},
  eventPayloadOverride,
  eventCreatedAt = null,
} = {}) {
  const recordId = `employee:${employeeId}`;
  const payload = {
    tenant_id: tenantId,
    employee_id: employeeId,
    display_name: displayName,
    status: "active",
    ...extraPayload,
  };
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId },
    async (client) => {
      await client.query(
        `INSERT INTO lawos_domain.records
           (tenant_id, domain_id, record_type, record_id, state_version,
            payload, payload_hash, append_only)
         VALUES ($1, 'hrx', 'hrx_employees', $2, $3, $4::jsonb, $5, false)
         ON CONFLICT (tenant_id, domain_id, record_type, record_id) DO UPDATE
           SET state_version = EXCLUDED.state_version,
               payload = EXCLUDED.payload,
               payload_hash = EXCLUDED.payload_hash,
               updated_at = clock_timestamp()`,
        [
          tenantId,
          recordId,
          stateVersion,
          JSON.stringify(payload),
          hashDomainValue(payload),
        ],
      );
      await client.query(
        `INSERT INTO lawos_domain.outbox_events
           (tenant_id, domain_id, event_id, topic, aggregate_type,
            aggregate_id, payload, created_at)
         VALUES ($1, 'hrx', $2, 'hrx.audit', 'Employee', $3, $4::jsonb,
                 COALESCE($5::timestamptz, clock_timestamp()))`,
        [
          tenantId,
          eventId,
          employeeId,
          JSON.stringify(eventPayloadOverride ?? eventPayload(recordId)),
          eventCreatedAt,
        ],
      );
    },
  );
}

async function seedInternalMigration(fixture, {
  tenantId,
  migrationId,
  eventId,
} = {}) {
  const payload = {
    id: migrationId,
    hash: hashDomainValue({ migration_id: migrationId }),
    applied_at: "2026-07-26T00:00:00.000Z",
  };
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId },
    async (client) => {
      await client.query(
        `INSERT INTO lawos_domain.records
           (tenant_id, domain_id, record_type, record_id, state_version,
            payload, payload_hash, append_only)
         VALUES ($1, 'hrx', '__hrx_schema_migration', $2, 1, $3::jsonb, $4, true)`,
        [
          tenantId,
          migrationId,
          JSON.stringify(payload),
          hashDomainValue(payload),
        ],
      );
      await client.query(
        `INSERT INTO lawos_domain.outbox_events
           (tenant_id, domain_id, event_id, topic, aggregate_type,
            aggregate_id, payload)
         VALUES ($1, 'hrx', $2, 'hrx.audit', 'HrxSchemaMigration', $3, $4::jsonb)`,
        [
          tenantId,
          eventId,
          migrationId,
          JSON.stringify({
            audit_event_id: `audit:${eventId}`,
            event_type: "hrx.schema.migration.applied",
            payload_hash: hashDomainValue({ migration_id: migrationId }),
            projection_records: [{
              record_type: "__hrx_schema_migration",
              record_id: migrationId,
            }],
          }),
        ],
      );
    },
  );
}

async function projectionContract(fixture, tenantIds, { batchSize = 1 } = {}) {
  const inventory = await collectHrxRelationalProductionInventory({
    pool: fixture.appPool,
    approvedTenantIds: tenantIds,
    inventoryProvenanceSha256: "9".repeat(64),
  });
  const performanceAcceptance = createJsonPostgresPerformanceAcceptance({
    record_count: inventory.source_record_count,
    tenant_count: tenantIds.length,
    batch_size: batchSize,
    pool_max: 2,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_ms: 120_000,
    outbox_lag_p95_ms: 120_000,
    dms_throughput_min_bytes_per_second: 0,
    rpo_target_ms: 300_000,
    rto_target_ms: 3_600_000,
    rehearsal_result_sha256: "a".repeat(64),
  });
  const schema = await inspectHrxRelationalSchema(fixture.adminPool);
  const mappingManifest = createHrxRelationalMappingManifest({
    schema,
    inventory,
    performanceAcceptanceSha256: performanceAcceptance.acceptance_sha256,
  });
  return Object.freeze({ inventory, performanceAcceptance, mappingManifest });
}

function project(fixture, contract, input) {
  return projectHrxRelationalReadModel({
    pool: fixture.appPool,
    mappingManifest: contract.mappingManifest,
    performanceAcceptance: contract.performanceAcceptance,
    ...input,
  });
}

test("HRX relational projection is bounded, replay-safe, RLS-isolated and event scoped", async (t) => {
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
  const contract = await projectionContract(fixture, [tenantId]);
  const backfill = await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "backfill",
    workerRef: "worker-backfill-001",
    negativeTenantId,
  });
  assert.equal(backfill.outcome, "PASS");
  assert.equal(backfill.safe_counts.projected_insert_count, 1);
  assert.equal(backfill.safe_counts.committed_batch_count, 1);
  assert.equal(backfill.safe_counts.tenant_negative_visible_count, 0);
  assert.equal(backfill.claims.bounded_checkpoint_resume, true);
  assert.equal(backfill.claims.generic_ledger_authority_preserved, true);
  const backfillCursor = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      `SELECT cursor.last_event_id,
              count(event.event_id)::integer AS pending_count
         FROM lawos_projection.hrx_outbox_cursor AS cursor
         LEFT JOIN lawos_domain.outbox_events AS event
           ON event.tenant_id = cursor.tenant_id
          AND event.domain_id = 'hrx'
          AND (event.created_at, event.event_id)
            > (cursor.last_created_at, cursor.last_event_id)
        WHERE cursor.tenant_id = $1
        GROUP BY cursor.last_event_id, cursor.last_created_at`,
      [tenantId],
    ),
  );
  assert.deepEqual(backfillCursor.rows[0], {
    last_event_id: "projection-event-001",
    pending_count: 0,
  });

  const replay = await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "incremental",
    workerRef: "worker-replay-001",
    negativeTenantId,
  });
  assert.equal(replay.safe_counts.consumed_outbox_event_count, 0);
  assert.equal(replay.safe_counts.projected_insert_count, 0);
  assert.equal(replay.safe_counts.projected_update_count, 0);
  assert.equal(replay.safe_counts.observed_event_wave_1_count, 0);
  assert.equal(replay.safe_counts.observed_event_wave_5_count, 0);

  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-001",
    displayName: "Projection Fixture A Updated",
    stateVersion: 2,
    eventId: "projection-event-002",
  });
  const updated = await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "incremental",
    workerRef: "worker-incremental-001",
    negativeTenantId,
  });
  assert.equal(updated.safe_counts.projected_update_count, 1);
  assert.equal(updated.safe_counts.source_record_count, 1);
  assert.equal(updated.safe_counts.consumed_outbox_event_count, 1);
  assert.equal(updated.safe_counts.observed_event_wave_1_count, 1);
  assert.equal(updated.safe_counts.observed_event_wave_2_count, 0);
  const row = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      `SELECT display_name
         FROM lawos_hrx.hrx_employees
        WHERE tenant_id = $1 AND employee_id = 'employee-001'`,
      [tenantId],
    ),
  );
  assert.equal(row.rows[0].display_name, "Projection Fixture A Updated");
});

test("HRX projection excludes only internal migration records and advances their outbox cursor", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-internal-migration";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-internal-migration",
    displayName: "Internal Migration Fixture",
    eventId: "internal-migration-event-001",
  });
  await seedInternalMigration(fixture, {
    tenantId,
    migrationId: "001_internal_migration",
    eventId: "internal-migration-event-002",
  });
  const contract = await projectionContract(fixture, [tenantId]);
  const backfill = await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "backfill",
    workerRef: "worker-internal-migration-backfill",
  });
  assert.equal(backfill.outcome, "PASS");
  assert.equal(backfill.safe_counts.projected_insert_count, 1);

  await seedInternalMigration(fixture, {
    tenantId,
    migrationId: "002_internal_migration",
    eventId: "internal-migration-event-003",
  });
  const incremental = await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "incremental",
    workerRef: "worker-internal-migration-incremental",
  });
  assert.equal(incremental.outcome, "PASS");
  assert.equal(incremental.safe_counts.consumed_outbox_event_count, 1);
  assert.equal(incremental.safe_counts.projected_insert_count, 0);
  assert.equal(incremental.safe_counts.projected_update_count, 0);
  assert.equal(incremental.safe_counts.remaining_outbox_event_count, 0);

  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId },
    (client) => client.query(
      `INSERT INTO lawos_domain.records
         (tenant_id, domain_id, record_type, record_id, state_version,
          payload, payload_hash, append_only)
       VALUES ($1, 'hrx', 'unapproved_hrx_internal_type', 'unknown-001',
               1, '{}'::jsonb, $2, true)`,
      [tenantId, hashDomainValue({})],
    ),
  );
  await assert.rejects(
    project(fixture, contract, {
      tenant_id: tenantId,
      mode: "backfill",
      backfillWave: 1,
      workerRef: "worker-unapproved-record-type",
    }),
    (error) =>
      error?.code === "LAWOS_HRX_PROJECTION_UNAPPROVED_RECORD_TYPE",
  );
});

test("HRX backfill enforces five ordered resumable waves and advances the outbox cursor only after wave five", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-waves";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-wave-001",
    displayName: "Wave Fixture",
    eventId: "projection-wave-event-001",
  });
  const contract = await projectionContract(fixture, [tenantId]);
  await assert.rejects(
    project(fixture, contract, {
      tenant_id: tenantId,
      mode: "backfill",
      backfillWave: 2,
      workerRef: "worker-wave-out-of-order",
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_WAVE_SEQUENCE",
  );
  for (let wave = 1; wave <= 4; wave += 1) {
    const result = await project(fixture, contract, {
      tenant_id: tenantId,
      mode: wave === 1 ? "backfill" : "resume",
      backfillWave: wave,
      workerRef: `worker-wave-${wave}`,
    });
    assert.equal(result.backfill_wave, wave);
    assert.equal(result.safe_counts.completed_backfill_wave_count, 1);
    const cursor = await withPostgresTransaction(
      fixture.appPool,
      { tenant_id: tenantId, readOnly: true },
      (client) => client.query(
        `SELECT count(*)::integer AS count
           FROM lawos_projection.hrx_outbox_cursor
          WHERE tenant_id = $1`,
        [tenantId],
      ),
    );
    assert.equal(cursor.rows[0].count, 0);
  }
  const finalWave = await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "resume",
    backfillWave: 5,
    workerRef: "worker-wave-5",
  });
  assert.equal(finalWave.backfill_wave, 5);
  const checkpoints = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      `SELECT rollout_wave, status
         FROM lawos_projection.hrx_backfill_checkpoint
        WHERE tenant_id = $1
        ORDER BY rollout_wave`,
      [tenantId],
    ),
  );
  assert.deepEqual(
    checkpoints.rows,
    [1, 2, 3, 4, 5].map((rollout_wave) => ({
      rollout_wave,
      status: "complete",
    })),
  );
  const cursor = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      `SELECT last_event_id
         FROM lawos_projection.hrx_outbox_cursor
        WHERE tenant_id = $1`,
      [tenantId],
    ),
  );
  assert.equal(cursor.rows[0].last_event_id, "projection-wave-event-001");
  const replay = await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "backfill",
    backfillWave: 3,
    workerRef: "worker-wave-3-replay",
  });
  assert.equal(replay.safe_counts.projected_insert_count, 0);
  assert.equal(replay.safe_counts.projected_update_count, 0);
});

test("HRX relational projection rolls one failed batch back and resumes after the last committed checkpoint", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-resume";
  for (const index of [1, 2]) {
    await seedEmployee(fixture, {
      tenantId,
      employeeId: `employee-00${index}`,
      displayName: `Resume Fixture ${index}`,
      eventId: `resume-event-00${index}`,
    });
  }
  const contract = await projectionContract(fixture, [tenantId], { batchSize: 1 });
  await assert.rejects(
    project(fixture, contract, {
      tenant_id: tenantId,
      mode: "backfill",
      workerRef: "worker-interrupted",
      faultInjector(point, context) {
        if (point === "after_batch_commit" && context.batch_index === 0) {
          throw new Error("synthetic post-commit interruption");
        }
      },
    }),
    /synthetic post-commit interruption/u,
  );
  const firstTarget = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      "SELECT count(*)::integer AS count FROM lawos_hrx.hrx_employees WHERE tenant_id = $1",
      [tenantId],
    ),
  );
  assert.equal(firstTarget.rows[0].count, 1);

  const resumed = await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "resume",
    workerRef: "worker-resumed",
  });
  assert.equal(resumed.mode, "backfill");
  assert.equal(resumed.safe_counts.projected_insert_count, 1);
  assert.equal(resumed.safe_counts.projected_update_count, 0);
  const finalTarget = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      "SELECT count(*)::integer AS count FROM lawos_hrx.hrx_employees WHERE tenant_id = $1",
      [tenantId],
    ),
  );
  assert.equal(finalTarget.rows[0].count, 2);
});

test("HRX projection checkpoint never advances when a record in the batch fails", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-rollback";
  for (const index of [1, 2]) {
    await seedEmployee(fixture, {
      tenantId,
      employeeId: `employee-00${index}`,
      displayName: `Rollback Fixture ${index}`,
      eventId: `rollback-event-00${index}`,
    });
  }
  const contract = await projectionContract(fixture, [tenantId], { batchSize: 2 });
  let processed = 0;
  await assert.rejects(project(fixture, contract, {
    tenant_id: tenantId,
    mode: "backfill",
    workerRef: "worker-rollback",
    faultInjector(point) {
      if (point === "after_record" && ++processed === 1) {
        throw new Error("synthetic projection interruption");
      }
    },
  }));
  const target = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      "SELECT count(*)::integer AS count FROM lawos_hrx.hrx_employees WHERE tenant_id = $1",
      [tenantId],
    ),
  );
  const checkpoint = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      "SELECT count(*)::integer AS count FROM lawos_projection.hrx_backfill_checkpoint WHERE tenant_id = $1",
      [tenantId],
    ),
  );
  assert.equal(target.rows[0].count, 0);
  assert.equal(checkpoint.rows[0].count, 0);
});

test("HRX projection rejects non-null unmapped fields before checkpoint advancement", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-unmapped";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-unmapped",
    displayName: "Unmapped Fixture",
    eventId: "unmapped-event-001",
    extraPayload: { unauthorized_live_field: "blocked" },
  });
  await assert.rejects(
    projectionContract(fixture, [tenantId]),
    (error) => error?.code === "LAWOS_HRX_RELATIONAL_MAPPING",
  );
});

test("HRX projection fails closed on an unknown incremental event shape and leaves its cursor replayable", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-event-shape";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-event",
    displayName: "Event Fixture",
    eventId: "event-shape-001",
  });
  const contract = await projectionContract(fixture, [tenantId]);
  await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "backfill",
    workerRef: "worker-event-backfill",
  });
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-event",
    displayName: "Event Fixture Updated",
    stateVersion: 2,
    eventId: "event-shape-002",
    eventPayloadOverride: {},
  });
  await assert.rejects(
    project(fixture, contract, {
      tenant_id: tenantId,
      mode: "incremental",
      workerRef: "worker-event-invalid",
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_EVENT_SHAPE",
  );
  const pending = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      `SELECT count(*)::integer AS count
         FROM lawos_domain.outbox_events AS event
         JOIN lawos_projection.hrx_outbox_cursor AS cursor
           ON cursor.tenant_id = event.tenant_id
        WHERE event.tenant_id = $1
          AND (event.created_at, event.event_id)
            > (cursor.last_created_at, cursor.last_event_id)`,
      [tenantId],
    ),
  );
  assert.equal(pending.rows[0].count, 1);
});

test("HRX mutable projection preserves an explicit tombstone without physical deletion", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-tombstone";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-deleted",
    displayName: "Tombstone Fixture",
    eventId: "tombstone-event-001",
  });
  const contract = await projectionContract(fixture, [tenantId]);
  await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "backfill",
    workerRef: "worker-tombstone-backfill",
  });
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-deleted",
    displayName: "Tombstone Fixture",
    stateVersion: 2,
    eventId: "tombstone-event-002",
    extraPayload: {
      status: "deleted",
      deleted_at: "2026-07-25T00:00:00.000Z",
    },
  });
  const deleted = await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "incremental",
    workerRef: "worker-tombstone-incremental",
  });
  assert.equal(deleted.safe_counts.projected_update_count, 1);
  assert.equal(deleted.safe_counts.physical_delete_count, 0);
  const row = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      `SELECT status, lawos_projection_deleted_at::text AS deleted_at
         FROM lawos_hrx.hrx_employees
        WHERE tenant_id = $1 AND employee_id = 'employee-deleted'`,
      [tenantId],
    ),
  );
  assert.equal(row.rows[0].status, "active");
  assert.equal(
    new Date(row.rows[0].deleted_at).toISOString(),
    "2026-07-25T00:00:00.000Z",
  );
});

test("HRX projection rejects a concurrent tenant lease before writing", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-lease";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-lease",
    displayName: "Lease Fixture",
    eventId: "lease-event-001",
  });
  const contract = await projectionContract(fixture, [tenantId]);
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId },
    (client) => client.query(
      `INSERT INTO lawos_projection.hrx_projection_lease
         (tenant_id, lease_owner_ref, mapping_sha256, lease_expires_at)
       VALUES ($1, 'sha256:other-worker', $2, clock_timestamp() + interval '5 minutes')`,
      [tenantId, contract.mappingManifest.manifest_sha256],
    ),
  );
  await assert.rejects(
    project(fixture, contract, {
      tenant_id: tenantId,
      mode: "backfill",
      workerRef: "worker-contending",
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_LEASE_HELD",
  );
  const target = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      `SELECT count(*)::integer AS count
         FROM lawos_hrx.hrx_employees
        WHERE tenant_id = $1`,
      [tenantId],
    ),
  );
  assert.equal(target.rows[0].count, 0);
});

test("HRX incremental projection blocks physical source disappearance without a tombstone", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-absence";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-absence",
    displayName: "Absence Fixture",
    eventId: "absence-event-001",
  });
  const contract = await projectionContract(fixture, [tenantId]);
  await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "backfill",
    workerRef: "worker-absence-backfill",
  });
  await fixture.adminPool.query(
    `DELETE FROM lawos_domain.records
      WHERE tenant_id = $1
        AND domain_id = 'hrx'
        AND record_type = 'hrx_employees'
        AND record_id = 'employee:employee-absence'`,
    [tenantId],
  );
  await assert.rejects(
    project(fixture, contract, {
      tenant_id: tenantId,
      mode: "incremental",
      workerRef: "worker-absence-incremental",
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_PHYSICAL_ABSENCE",
  );
});

test("HRX incremental cursor is deterministic for equal timestamps and rejects source version regression", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareProjection(fixture);
  const tenantId = "tenant-hrx-projection-ordering";
  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-ordering",
    displayName: "Ordering Fixture",
    eventId: "ordering-event-001",
  });
  const contract = await projectionContract(fixture, [tenantId], {
    batchSize: 1,
  });
  await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "backfill",
    workerRef: "worker-ordering-backfill",
  });
  for (const suffix of ["a", "b"]) {
    await seedEmployee(fixture, {
      tenantId,
      employeeId: `employee-equal-${suffix}`,
      displayName: `Equal Timestamp ${suffix}`,
      eventId: `ordering-event-equal-${suffix}`,
      eventCreatedAt: "2099-01-01T00:00:00.000Z",
    });
  }
  await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "incremental",
    workerRef: "worker-ordering-a",
  });
  const firstCursor = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      `SELECT last_event_id
         FROM lawos_projection.hrx_outbox_cursor
        WHERE tenant_id = $1`,
      [tenantId],
    ),
  );
  assert.equal(firstCursor.rows[0].last_event_id, "ordering-event-equal-a");
  await project(fixture, contract, {
    tenant_id: tenantId,
    mode: "incremental",
    workerRef: "worker-ordering-b",
  });
  const secondCursor = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId, readOnly: true },
    (client) => client.query(
      `SELECT last_event_id
         FROM lawos_projection.hrx_outbox_cursor
        WHERE tenant_id = $1`,
      [tenantId],
    ),
  );
  assert.equal(secondCursor.rows[0].last_event_id, "ordering-event-equal-b");

  await seedEmployee(fixture, {
    tenantId,
    employeeId: "employee-ordering",
    displayName: "Regressed Ordering Fixture",
    stateVersion: 1,
    eventId: "ordering-event-regression",
    eventCreatedAt: "2099-01-01T00:01:00.000Z",
  });
  await assert.rejects(
    project(fixture, contract, {
      tenant_id: tenantId,
      mode: "incremental",
      workerRef: "worker-ordering-regression",
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_SOURCE_REGRESSION",
  );
});
