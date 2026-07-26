import assert from "node:assert/strict";
import test from "node:test";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { createJsonPostgresPerformanceAcceptance } from "../../persistence/src/postgres/performance-acceptance.js";
import { createPostgresPool } from "../../persistence/src/postgres/pool.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  createHrxRelationalMappingManifest,
  inspectHrxRelationalSchema,
} from "../src/relational-projection-contract.js";
import {
  collectHrxRelationalProductionInventory,
  validateHrxRelationalProjectionValidation,
  validateHrxRelationalReadModel,
} from "../src/relational-projection-validation.js";
import { runHrxPostgresMigrations } from "../src/postgres-migrations.js";
import {
  configureHrxProjectionRole,
  HRX_PROJECTION_AUDITOR_ROLE,
  HRX_PROJECTION_WRITER_ROLE,
} from "../src/postgres-projection-role.js";
import { projectHrxRelationalReadModel } from "../src/relational-read-projection.js";
import {
  activateHrxProjectionConsumerRoute,
  createHrxProjectionReadRouter,
  createHrxRelationalProjectionReader,
  disableHrxProjectionConsumerRoutes,
  refreshHrxProjectionConsumerRoutes,
} from "../src/relational-projection-reader.js";

test("W15 independent auditor derives PASS from relational observations rather than caller booleans", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runHrxPostgresMigrations(fixture.adminPool, {
    appliedBy: "hrx-validation-test",
  });
  await fixture.adminPool.query(
    "GRANT USAGE ON SCHEMA lawos_hrx, lawos_projection TO lawos_app",
  );
  await fixture.adminPool.query(
    "GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA lawos_hrx, lawos_projection TO lawos_app",
  );
  const tenantId = "tenant-hrx-validation";
  const recordId = "employee:validation-001";
  const payload = {
    tenant_id: tenantId,
    employee_id: "validation-001",
    display_name: "Validation Fixture",
    status: "active",
  };
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId },
    async (client) => {
      await client.query(
        `INSERT INTO lawos_domain.records
           (tenant_id, domain_id, record_type, record_id, state_version,
            payload, payload_hash, append_only)
         VALUES ($1, 'hrx', 'hrx_employees', $2, 1, $3::jsonb, $4, false)`,
        [tenantId, recordId, JSON.stringify(payload), hashDomainValue(payload)],
      );
      await client.query(
        `INSERT INTO lawos_domain.outbox_events
           (tenant_id, domain_id, event_id, topic, aggregate_type,
            aggregate_id, payload)
         VALUES ($1, 'hrx', 'validation-event-001', 'hrx.audit',
                 'Employee', 'validation-001', $2::jsonb)`,
        [tenantId, JSON.stringify({
          audit_event_id: "validation-audit-001",
          event_type: "hrx.employee.created",
          payload_hash: hashDomainValue({ recordId }),
          projection_records: [{
            record_type: "hrx_employees",
            record_id: recordId,
          }],
        })],
      );
    },
  );
  const inventory = await collectHrxRelationalProductionInventory({
    pool: fixture.appPool,
    approvedTenantIds: [tenantId],
    inventoryProvenanceSha256: "9".repeat(64),
  });
  const performanceAcceptance = createJsonPostgresPerformanceAcceptance({
    record_count: 1,
    tenant_count: 1,
    batch_size: 1,
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
  const mappingManifest = createHrxRelationalMappingManifest({
    schema: await inspectHrxRelationalSchema(fixture.adminPool),
    inventory,
    performanceAcceptanceSha256: performanceAcceptance.acceptance_sha256,
  });
  await projectHrxRelationalReadModel({
    pool: fixture.appPool,
    tenant_id: tenantId,
    mode: "backfill",
    mappingManifest,
    performanceAcceptance,
    workerRef: "validation-backfill-worker",
  });

  const client = await fixture.adminPool.connect();
  try {
    await configureHrxProjectionRole(client, {
      password: "writer-password-value",
      auditorPassword: "auditor-password-value",
      tenantContextSecret: fixture.tenantContextSecret,
      approvedTenantIds: [tenantId],
    });
  } finally {
    client.release();
  }
  const writerUrl = new URL(fixture.instance.connection_string);
  writerUrl.username = HRX_PROJECTION_WRITER_ROLE;
  writerUrl.password = "writer-password-value";
  const writerPool = createPostgresPool({
    connectionString: writerUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    tenantContextSecret: fixture.tenantContextSecret,
    applicationName: "hrx-validation-writer-test",
    max: 1,
  });
  try {
    const writerInventory = await collectHrxRelationalProductionInventory({
      pool: writerPool,
      approvedTenantIds: [tenantId],
      inventoryProvenanceSha256: "9".repeat(64),
    });
    assert.equal(writerInventory.source_record_count, 1);
    await assert.rejects(
      withPostgresTransaction(
        writerPool,
        { tenant_id: tenantId },
        (writerClient) => writerClient.query(
          `INSERT INTO lawos_domain.records
             (tenant_id, domain_id, record_type, record_id, state_version,
              payload, payload_hash, append_only)
           VALUES ($1, 'hrx', 'hrx_employees', 'writer-denied', 1,
                   '{}'::jsonb, $2, false)`,
          [tenantId, hashDomainValue({})],
        ),
      ),
      (error) => error?.code === "42501" || error?.postgres_code === "42501",
    );
  } finally {
    await writerPool.end();
  }
  const auditorUrl = new URL(fixture.instance.connection_string);
  auditorUrl.username = HRX_PROJECTION_AUDITOR_ROLE;
  auditorUrl.password = "auditor-password-value";
  const auditorPool = createPostgresPool({
    connectionString: auditorUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    tenantContextSecret: fixture.tenantContextSecret,
    applicationName: "hrx-validation-auditor-test",
    max: 1,
  });
  let validation;
  try {
    validation = await validateHrxRelationalReadModel({
      pool: auditorPool,
      approvedTenantIds: [tenantId],
      negativeTenantId: "tenant-hrx-validation-negative",
      mappingManifest,
      performanceAcceptance,
      sourceSha: "1".repeat(40),
      sourceTree: "2".repeat(40),
      packetSha256: "3".repeat(64),
    });
  } finally {
    await auditorPool.end();
  }
  assert.equal(validation.outcome, "PASS", JSON.stringify(validation.safe_counts));
  assert.equal(validation.safe_counts.shadow_difference_count, 0);
  assert.equal(validation.safe_counts.logical_reference_failure_count, 0);
  assert.equal(validation.safe_counts.consumer_write_grant_count, 0);
  assert.equal(validation.safe_counts.auditor_write_grant_count, 0);
  assert.equal(
    validation.claims.observations_collected_by_read_only_auditor,
    true,
  );
  assert.equal(
    validateHrxRelationalProjectionValidation(validation).valid,
    true,
  );

  await activateHrxProjectionConsumerRoute(fixture.adminPool, {
    tenantId,
    queryFamily: "core-employee-roster",
    rolloutWave: 1,
    mappingManifest,
    validationEvidence: validation,
    maxStalenessMs: 60_000,
  });
  await assert.rejects(
    activateHrxProjectionConsumerRoute(fixture.adminPool, {
      tenantId,
      queryFamily: "leave-attendance",
      rolloutWave: 3,
      mappingManifest,
      validationEvidence: validation,
      maxStalenessMs: 60_000,
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_READER_SEQUENCE",
  );
  const reader = createHrxRelationalProjectionReader({
    pool: fixture.appPool,
    mappingManifest,
    validationResultSha256: validation.result_sha256,
  });
  const projected = await reader.query("selectOne", {
    tenant_id: tenantId,
    table: "hrx_employees",
    where: { tenant_id: tenantId, employee_id: "validation-001" },
  });
  assert.equal(projected.employee_id, "validation-001");
  const sourceSnapshot = {
    schema_version: "law-firm-os.hrx-file-store.v0.1",
    applied_migrations: [],
    tables: Object.fromEntries(
      mappingManifest.tables.map((mapping) => [
        mapping.table_name,
        mapping.table_name === "hrx_employees"
          ? [{
              tenant_id: tenantId,
              employee_id: "generic-employee",
              display_name: "Generic fallback",
              status: "active",
            }]
          : [],
      ]),
    ),
  };
  const materialized = await reader.materializeSnapshot({
    tenant_id: tenantId,
    source_snapshot: sourceSnapshot,
  });
  assert.equal(
    materialized.snapshot.tables.hrx_employees[0].employee_id,
    "validation-001",
  );
  assert.equal(
    materialized.projected_table_names.includes("hrx_employees"),
    true,
  );
  const refreshed = await refreshHrxProjectionConsumerRoutes(
    fixture.adminPool,
    {
      tenantId,
      mappingManifest,
      validationEvidence: validation,
      clock: () => Date.parse("2026-07-25T00:00:00.000Z"),
    },
  );
  assert.equal(refreshed.refreshed_route_count, 1);
  assert.equal(refreshed.authority_promoted, false);
  const route = await fixture.adminPool.query(
    `SELECT verified_at::text AS verified_at
       FROM lawos_projection.hrx_consumer_route
      WHERE tenant_id = $1
        AND query_family = 'core-employee-roster'`,
    [tenantId],
  );
  assert.equal(
    Date.parse(route.rows[0].verified_at),
    Date.parse("2026-07-25T00:00:00.000Z"),
  );
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId },
    (client) => client.query(
      `INSERT INTO lawos_domain.outbox_events
         (tenant_id, domain_id, event_id, topic, aggregate_type,
          aggregate_id, payload)
       VALUES ($1, 'hrx', 'validation-event-backlog-002', 'hrx.audit',
               'Employee', 'validation-001', $2::jsonb)`,
      [tenantId, JSON.stringify({
        audit_event_id: "validation-audit-backlog-002",
        event_type: "hrx.employee.updated",
        payload_hash: hashDomainValue({ recordId, backlog: true }),
        projection_records: [{
          record_type: "hrx_employees",
          record_id: recordId,
        }],
      })],
    ),
  );
  await assert.rejects(
    refreshHrxProjectionConsumerRoutes(fixture.adminPool, {
      tenantId,
      mappingManifest,
      validationEvidence: validation,
    }),
    (error) =>
      error?.code === "LAWOS_HRX_PROJECTION_READER_BACKLOG",
  );
  await assert.rejects(
    reader.query("updateOne", {
      tenant_id: tenantId,
      table: "hrx_employees",
      where: { tenant_id: tenantId, employee_id: "validation-001" },
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_READER_WRITE",
  );

  await disableHrxProjectionConsumerRoutes(fixture.adminPool, { tenantId });
  const fallbackSnapshot = await reader.materializeSnapshot({
    tenant_id: tenantId,
    source_snapshot: sourceSnapshot,
  });
  assert.equal(
    fallbackSnapshot.snapshot.tables.hrx_employees[0].employee_id,
    "generic-employee",
  );
  assert.equal(fallbackSnapshot.projected_table_names.length, 0);
  assert.equal(
    fallbackSnapshot.fallback_families.some((item) =>
      item.safe_error_code === "LAWOS_HRX_PROJECTION_READER_DISABLED"),
    true,
  );
  let genericFallbackCount = 0;
  const router = createHrxProjectionReadRouter({
    projectionReader: reader,
    genericLedgerRead: async () => {
      genericFallbackCount += 1;
      return [{ tenant_id: tenantId, employee_id: "validation-001" }];
    },
  });
  const fallback = await router.query("select", {
    tenant_id: tenantId,
    table: "hrx_employees",
    where: { tenant_id: tenantId },
  });
  assert.equal(fallback.length, 1);
  assert.equal(genericFallbackCount, 1);
  assert.equal(router.json_fallback, false);
});

test("W15 production inventory blocks duplicate primary keys and orphan foreign keys before mapping", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runHrxPostgresMigrations(fixture.adminPool, {
    appliedBy: "hrx-inventory-conflict-test",
  });
  await fixture.adminPool.query(
    "GRANT USAGE ON SCHEMA lawos_hrx, lawos_projection TO lawos_app",
  );
  await fixture.adminPool.query(
    "GRANT SELECT ON ALL TABLES IN SCHEMA lawos_hrx, lawos_projection TO lawos_app",
  );
  const tenantId = "tenant-hrx-inventory-conflict";
  const records = [
    {
      recordType: "hrx_employees",
      recordId: "employee-source-a",
      payload: {
        tenant_id: tenantId,
        employee_id: "employee-duplicate",
        display_name: "Duplicate A",
        status: "active",
      },
    },
    {
      recordType: "hrx_employees",
      recordId: "employee-source-b",
      payload: {
        tenant_id: tenantId,
        employee_id: "employee-duplicate",
        display_name: "Duplicate B",
        status: "active",
      },
    },
    {
      recordType: "hrx_employment_profiles",
      recordId: "profile-orphan",
      payload: {
        tenant_id: tenantId,
        profile_id: "profile-orphan",
        employee_id: "employee-missing",
        employment_type: "full_time",
        status: "active",
        effective_from: "2026-01-01",
      },
    },
  ];
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenantId },
    async (client) => {
      for (const record of records) {
        await client.query(
          `INSERT INTO lawos_domain.records
             (tenant_id, domain_id, record_type, record_id, state_version,
              payload, payload_hash, append_only)
           VALUES ($1, 'hrx', $2, $3, 1, $4::jsonb, $5, false)`,
          [
            tenantId,
            record.recordType,
            record.recordId,
            JSON.stringify(record.payload),
            hashDomainValue(record.payload),
          ],
        );
      }
    },
  );
  const inventory = await collectHrxRelationalProductionInventory({
    pool: fixture.appPool,
    approvedTenantIds: [tenantId],
    inventoryProvenanceSha256: "9".repeat(64),
  });
  const employees = inventory.tables.find((table) =>
    table.table_name === "hrx_employees");
  const profiles = inventory.tables.find((table) =>
    table.table_name === "hrx_employment_profiles");
  assert.equal(employees.primary_key_conflict_count, 1);
  assert.equal(employees.inventory_classification, "blocked_mapping");
  assert.equal(profiles.foreign_key_conflict_count, 1);
  assert.equal(profiles.inventory_classification, "blocked_mapping");
  assert.throws(
    () => createHrxRelationalMappingManifest({
      schema: { columns: [], foreign_keys: [] },
      inventory,
      performanceAcceptanceSha256: "a".repeat(64),
    }),
    /unresolved mapping gaps/u,
  );
});
