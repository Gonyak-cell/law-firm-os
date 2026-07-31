import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonicalizeJson } from "../../runtime-auth/src/runtime-safety-approval-contract.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  assertHrxRelationalMappingMatchesDatabase,
  createHrxRelationalMappingManifest,
  createHrxRelationalMappingResolution,
  createHrxRelationalProductionInventory,
  inspectHrxRelationalSchema,
  projectHrxRelationalPayload,
  restoreHrxRelationalProjectionRow,
  validateHrxRelationalMappingManifest,
} from "../src/relational-projection-contract.js";
import { runHrxPostgresMigrations } from "../src/postgres-migrations.js";
import {
  HRX_STORE_TABLES,
  HRX_TABLE_PRIMARY_KEYS,
} from "../src/store/file-store.js";

function digest(value) {
  return createHash("sha256").update(canonicalizeJson(value)).digest("hex");
}

const TEST_COLUMNS = Object.freeze({
  hrx_attendance_records: [
    "employee_id",
    "correction_of_attendance_id",
  ],
  hrx_audit_events: ["metadata_json"],
  hrx_candidates: ["crm_party_linked"],
  hrx_compensation_records: ["raw_amount_included"],
  hrx_documents: ["document_body_included"],
  hrx_interviews: [
    "interviewer_employee_ids_json",
    "restricted_access",
  ],
  hrx_leave_balance_entries: ["metadata_json"],
  hrx_lifecycle_templates: ["tasks_json"],
  hrx_offboarding_cases: [
    "access_revocations_json",
    "document_returns_json",
    "legal_hold_checks_json",
    "matter_reassignments_json",
    "handover_items_json",
    "template_ref_json",
    "template_snapshot_json",
    "tasks_json",
    "leave_reconciliation_evidence_ref",
  ],
  hrx_onboarding_plans: [
    "employee_id",
    "start_date",
    "tasks_json",
    "document_refs_json",
    "access_requests_json",
    "template_ref_json",
    "template_snapshot_json",
  ],
  hrx_offers: ["compensation_restricted"],
  hrx_payroll_runs: ["period_id", "previous_run_id"],
});

function resolutionSchema() {
  const columns = HRX_STORE_TABLES.flatMap((table) =>
    [...new Set([
      ...HRX_TABLE_PRIMARY_KEYS[table],
      ...(TEST_COLUMNS[table] ?? []),
      "lawos_projection_deleted_at",
    ])].map((column, index) => ({
      table_name: table,
      column_name: column,
      ordinal_position: index + 1,
      is_nullable: [
        "lawos_projection_deleted_at",
        "correction_of_attendance_id",
        "previous_run_id",
      ].includes(column) ? "YES" : "NO",
      data_type:
        column === "lawos_projection_deleted_at"
          ? "timestamp with time zone"
          : "text",
      column_default: null,
    })));
  const foreignKey = (
    table,
    constraint,
    columnsForKey,
    referencedTable,
    referencedColumns,
  ) => columnsForKey.map((column, index) => ({
    table_name: table,
    constraint_name: constraint,
    column_name: column,
    referenced_table_name: referencedTable,
    referenced_column_name: referencedColumns[index],
    ordinal_position: index + 1,
  }));
  return {
    columns,
    foreign_keys: [
      ...foreignKey(
        "hrx_attendance_records",
        "attendance_employee_fk",
        ["tenant_id", "employee_id"],
        "hrx_employees",
        ["tenant_id", "employee_id"],
      ),
      ...foreignKey(
        "hrx_attendance_records",
        "attendance_correction_fk",
        ["tenant_id", "correction_of_attendance_id"],
        "hrx_attendance_records",
        ["tenant_id", "attendance_id"],
      ),
      ...foreignKey(
        "hrx_payroll_runs",
        "payroll_period_fk",
        ["tenant_id", "period_id"],
        "hrx_payroll_periods",
        ["tenant_id", "period_id"],
      ),
      ...foreignKey(
        "hrx_payroll_runs",
        "payroll_previous_run_fk",
        ["tenant_id", "previous_run_id"],
        "hrx_payroll_runs",
        ["tenant_id", "run_id"],
      ),
    ],
  };
}

function sourceRecord(recordType, recordId, payload) {
  return Object.freeze({
    tenant_id: payload.tenant_id,
    record_type: recordType,
    record_id: recordId,
    state_version: 1,
    payload_hash: digest(payload),
    payload: Object.freeze(structuredClone(payload)),
  });
}

function resolutionRecords({ orphanAttendanceEmployee = false } = {}) {
  const tenantId = "tenant-resolution";
  return [
    sourceRecord("hrx_employees", "employee-record", {
      tenant_id: tenantId,
      employee_id: "employee-001",
    }),
    sourceRecord("hrx_attendance_records", "attendance-record", {
      tenant_id: tenantId,
      attendance_id: "attendance-001",
      employee_id:
        orphanAttendanceEmployee ? "employee-missing" : "employee-001",
      correction_of_attendance_id: null,
    }),
    sourceRecord("hrx_payroll_periods", "period-record", {
      tenant_id: tenantId,
      period_id: "period-001",
    }),
    sourceRecord("hrx_payroll_runs", "run-record", {
      tenant_id: tenantId,
      run_id: "run-001",
      period_id: "period-001",
      previous_run_id: null,
    }),
    sourceRecord("hrx_interviews", "interview-record", {
      tenant_id: tenantId,
      interview_id: "interview-001",
      interviewer_employee_ids: ["employee-001"],
      restricted_access: true,
    }),
  ];
}

function resolutionInventory(records, { orphanAttendanceEmployee = false } = {}) {
  const byTable = new Map(HRX_STORE_TABLES.map((table) => [
    table,
    records.filter((record) => record.record_type === table)
      .sort((left, right) =>
        left.tenant_id.localeCompare(right.tenant_id)
          || left.record_id.localeCompare(right.record_id)),
  ]));
  const emptyHash = digest([]);
  return createHrxRelationalProductionInventory({
    tenantCount: 1,
    inventoryProvenanceSha256: "9".repeat(64),
    outboxEventCount: 0,
    outboxLagMs: 0,
    referenceCount: 0,
    tables: HRX_STORE_TABLES.map((table) => {
      const rows = byTable.get(table);
      const unknown = table === "hrx_interviews" ? 1 : 0;
      const foreignKeys = table === "hrx_attendance_records"
        ? (orphanAttendanceEmployee ? 2 : 1)
        : table === "hrx_payroll_runs" ? 1 : 0;
      return {
        table_name: table,
        source_count: rows.length,
        source_hash: digest(rows.map((record) => ({
          tenant_id: record.tenant_id,
          record_id: record.record_id,
          state_version: record.state_version,
          payload_hash: record.payload_hash,
        }))),
        state_version_min: rows.length ? 1 : 0,
        state_version_max: rows.length ? 1 : 0,
        payload_bytes_p50: rows.length ? 64 : 0,
        payload_bytes_p95: rows.length ? 64 : 0,
        payload_bytes_max: rows.length ? 64 : 0,
        soft_deleted_count: 0,
        append_only_count: 0,
        reference_count: 0,
        json_path_presence_sha256: emptyHash,
        json_path_null_ratio_sha256: emptyHash,
        unmapped_nonnull_field_count: unknown,
        primary_key_conflict_count: 0,
        foreign_key_conflict_count: foreignKeys,
        inventory_classification: rows.length === 0
          ? "schema_only"
          : (unknown + foreignKeys > 0 ? "blocked_mapping" : "populated"),
      };
    }),
  });
}

test("W15 mapping resolution preserves transformed fields and applies MATCH SIMPLE", () => {
  const schema = resolutionSchema();
  const records = resolutionRecords();
  const inventory = resolutionInventory(records);
  const resolution = createHrxRelationalMappingResolution({
    schema,
    inventory,
    sourceRecords: records,
    migrationCorpusFileSha256: "a".repeat(64),
    migrationCorpusManifestSha256: "b".repeat(64),
    phaseACloseoutEvidenceSha256: "c".repeat(64),
  });
  assert.equal(resolution.raw_unmapped_nonnull_field_count, 1);
  assert.equal(resolution.resolved_nonnull_field_count, 1);
  assert.equal(resolution.raw_foreign_key_conflict_count, 2);
  assert.equal(resolution.match_simple_null_reference_count, 2);
  assert.equal(resolution.residual_conflict_count, 0);

  const manifest = createHrxRelationalMappingManifest({
    schema,
    inventory,
    performanceAcceptanceSha256: "d".repeat(64),
    mappingResolution: resolution,
  });
  const mapping = (table) =>
    manifest.tables.find((value) => value.table_name === table);
  const interviewPayload = records.find((record) =>
    record.record_type === "hrx_interviews").payload;
  const projectedInterview = projectHrxRelationalPayload(
    interviewPayload,
    mapping("hrx_interviews"),
  ).row;
  assert.deepEqual(
    JSON.parse(projectedInterview.interviewer_employee_ids_json),
    ["employee-001"],
  );
  assert.equal(projectedInterview.restricted_access, 1);
  assert.deepEqual(
    restoreHrxRelationalProjectionRow(
      projectedInterview,
      mapping("hrx_interviews"),
    ),
    interviewPayload,
  );

  for (const [tableName, field] of [
    ["hrx_candidates", "crm_party_linked"],
    ["hrx_compensation_records", "raw_amount_included"],
    ["hrx_documents", "document_body_included"],
    ["hrx_offers", "compensation_restricted"],
  ]) {
    const identity = Object.fromEntries(
      HRX_TABLE_PRIMARY_KEYS[tableName].map((column) => [
        column,
        column === "tenant_id" ? "tenant-resolution" : `${column}-001`,
      ]),
    );
    const tableMapping = mapping(tableName);
    const projectedTrue = projectHrxRelationalPayload(
      { ...identity, [field]: true },
      tableMapping,
    ).row;
    const projectedFalse = projectHrxRelationalPayload(
      { ...identity, [field]: false },
      tableMapping,
    ).row;
    assert.equal(projectedTrue[field], 1);
    assert.equal(projectedFalse[field], 0);
    assert.equal(
      projectHrxRelationalPayload(
        { ...identity, [field]: 1 },
        tableMapping,
      ).row[field],
      1,
    );
    assert.equal(
      projectHrxRelationalPayload(
        { ...identity, [field]: 0 },
        tableMapping,
      ).row[field],
      0,
    );
    assert.equal(
      restoreHrxRelationalProjectionRow(projectedTrue, tableMapping)[field],
      true,
    );
    assert.equal(
      restoreHrxRelationalProjectionRow(projectedFalse, tableMapping)[field],
      false,
    );
    assert.throws(
      () => projectHrxRelationalPayload(
        { ...identity, [field]: "false" },
        tableMapping,
      ),
      (error) => error?.code === "LAWOS_HRX_PROJECTION_FIELD_TRANSFORM",
    );
    assert.throws(
      () => restoreHrxRelationalProjectionRow(
        { ...projectedTrue, [field]: 2 },
        tableMapping,
      ),
      (error) => error?.code === "LAWOS_HRX_PROJECTION_FIELD_TRANSFORM",
    );
  }

  const onboardingPayload = {
    tenant_id: "tenant-resolution",
    onboarding_id: "onboarding-001",
    employee_id: "employee-001",
    start_date: "2026-07-26",
    tasks: [{ task_id: "security", status: "pending" }],
    document_refs: ["document:policy"],
    access_requests: [{ system: "lawos", status: "pending" }],
    matter_assignment_gate: {
      required_task_ids: ["security"],
      waiver_ref: null,
    },
  };
  const projectedOnboarding = projectHrxRelationalPayload(
    onboardingPayload,
    mapping("hrx_onboarding_plans"),
  ).row;
  assert.equal(
    JSON.parse(projectedOnboarding.tasks_json).schema_version,
    "law-firm-os.hrx-onboarding-relational-envelope.v1",
  );
  assert.deepEqual(
    restoreHrxRelationalProjectionRow(
      projectedOnboarding,
      mapping("hrx_onboarding_plans"),
    ),
    onboardingPayload,
  );
  const offboardingEvidencePayload = {
    tenant_id: "tenant-resolution",
    offboarding_id: "offboarding-evidence-001",
    leave_reconciliation_evidence_ref: "PayrollProviderReceipt:001",
  };
  const projectedOffboardingEvidence = projectHrxRelationalPayload(
    offboardingEvidencePayload,
    mapping("hrx_offboarding_cases"),
  ).row;
  assert.equal(
    projectedOffboardingEvidence.leave_reconciliation_evidence_ref,
    "PayrollProviderReceipt:001",
  );
  assert.deepEqual(
    restoreHrxRelationalProjectionRow(
      projectedOffboardingEvidence,
      mapping("hrx_offboarding_cases"),
    ),
    offboardingEvidencePayload,
  );

  assert.throws(
    () => projectHrxRelationalPayload({
      tenant_id: "tenant-resolution",
      event_id: "event-001",
      schema_version: "unapproved",
      metadata: {},
      metadata_json: "{}",
    }, mapping("hrx_audit_events")),
    /constant field drifted/u,
  );
  assert.throws(
    () => projectHrxRelationalPayload({
      tenant_id: "tenant-resolution",
      event_id: "event-001",
      schema_version: "law-firm-os.hrx-audit-event.v0.1",
      metadata: { outcome: "PASS" },
      metadata_json: "{}",
    }, mapping("hrx_audit_events")),
    /JSON alias drifted/u,
  );
  assert.throws(
    () => projectHrxRelationalPayload({
      ...interviewPayload,
      unapproved_live_field: true,
    }, mapping("hrx_interviews")),
    /non-null unmapped field/u,
  );

  const orphanRecords = resolutionRecords({
    orphanAttendanceEmployee: true,
  });
  assert.throws(
    () => createHrxRelationalMappingResolution({
      schema,
      inventory: resolutionInventory(orphanRecords, {
        orphanAttendanceEmployee: true,
      }),
      sourceRecords: orphanRecords,
      migrationCorpusFileSha256: "a".repeat(64),
      migrationCorpusManifestSha256: "b".repeat(64),
      phaseACloseoutEvidenceSha256: "c".repeat(64),
    }),
    /mapping resolution identity/u,
  );
});

test("W15 mapping contract covers every HRX relation in deterministic dependency order", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runHrxPostgresMigrations(fixture.adminPool, {
    appliedBy: "hrx-mapping-contract-test",
  });
  const emptyHash = digest([]);
  const inventory = createHrxRelationalProductionInventory({
    tenantCount: 1,
    inventoryProvenanceSha256: "9".repeat(64),
    outboxEventCount: 0,
    outboxLagMs: 0,
    referenceCount: 0,
    tables: HRX_STORE_TABLES.map((table) => ({
      table_name: table,
      source_count: 0,
      source_hash: emptyHash,
      state_version_min: 0,
      state_version_max: 0,
      payload_bytes_p50: 0,
      payload_bytes_p95: 0,
      payload_bytes_max: 0,
      soft_deleted_count: 0,
      append_only_count: 0,
      reference_count: 0,
      json_path_presence_sha256: emptyHash,
      json_path_null_ratio_sha256: emptyHash,
      unmapped_nonnull_field_count: 0,
      primary_key_conflict_count: 0,
      foreign_key_conflict_count: 0,
      inventory_classification: "schema_only",
    })),
  });
  assert.equal(inventory.inventory_provenance_sha256, "9".repeat(64));
  assert.throws(
    () => createHrxRelationalProductionInventory({
      tenantCount: 1,
      inventoryProvenanceSha256: "not-a-digest",
      outboxEventCount: 0,
      outboxLagMs: 0,
      referenceCount: 0,
      tables: inventory.tables,
    }),
    /inventory provenance SHA-256 is invalid/u,
  );
  const observedSchema = await inspectHrxRelationalSchema(fixture.adminPool);
  const manifest = createHrxRelationalMappingManifest({
    schema: observedSchema,
    inventory,
    performanceAcceptanceSha256: "a".repeat(64),
  });
  const validated = validateHrxRelationalMappingManifest(manifest);
  assert.equal(validated.table_count, HRX_STORE_TABLES.length);
  assert.equal(manifest.schema_only_table_count, HRX_STORE_TABLES.length);
  assert.equal(new Set(manifest.dependency_order).size, HRX_STORE_TABLES.length);
  assert.ok(
    manifest.dependency_order.indexOf("hrx_employees")
      < manifest.dependency_order.indexOf("hrx_employment_profiles"),
  );
  assert.ok(
    manifest.dependency_order.indexOf("hrx_leave_groups")
      < manifest.dependency_order.indexOf("hrx_leave_types"),
  );
  const mappingByTable = new Map(
    manifest.tables.map((table) => [table.table_name, table]),
  );
  for (const mapping of manifest.tables) {
    for (const foreignKey of mapping.foreign_keys) {
      assert.ok(
        mappingByTable.get(foreignKey.referenced_table).rollout_wave
          <= mapping.rollout_wave,
      );
    }
  }
  const database = await assertHrxRelationalMappingMatchesDatabase(
    fixture.adminPool,
    manifest,
  );
  assert.equal(database.valid, true);

  const drifted = structuredClone(manifest);
  drifted.tables[0].payload_columns.push("unapproved_live_field");
  assert.throws(
    () => validateHrxRelationalMappingManifest(drifted),
    /digest is invalid/u,
  );

  const orderDrift = structuredClone(manifest);
  const employeeIndex = orderDrift.dependency_order.indexOf("hrx_employees");
  const profileIndex =
    orderDrift.dependency_order.indexOf("hrx_employment_profiles");
  [
    orderDrift.dependency_order[employeeIndex],
    orderDrift.dependency_order[profileIndex],
  ] = [
    orderDrift.dependency_order[profileIndex],
    orderDrift.dependency_order[employeeIndex],
  ];
  const { manifest_sha256: ignored, ...orderMaterial } = orderDrift;
  orderDrift.manifest_sha256 = digest(orderMaterial);
  assert.throws(
    () => validateHrxRelationalMappingManifest(orderDrift),
    /foreign-key order is invalid/u,
  );

  const missingPrimaryKey = structuredClone(observedSchema);
  missingPrimaryKey.columns = missingPrimaryKey.columns.filter((column) =>
    !(column.table_name === "hrx_employees"
      && column.column_name === "employee_id"));
  assert.throws(
    () => createHrxRelationalMappingManifest({
      schema: missingPrimaryKey,
      inventory,
      performanceAcceptanceSha256: "a".repeat(64),
    }),
    /primary-key column is missing/u,
  );

  const cycle = structuredClone(observedSchema);
  cycle.foreign_keys.push({
    table_name: "hrx_employees",
    constraint_name: "hrx_employees_cycle_fk",
    column_name: "employee_id",
    referenced_table_name: "hrx_employment_profiles",
    referenced_column_name: "profile_id",
    ordinal_position: 1,
  });
  assert.throws(
    () => createHrxRelationalMappingManifest({
      schema: cycle,
      inventory,
      performanceAcceptanceSha256: "a".repeat(64),
    }),
    /dependency cycle requires an explicit contract/u,
  );
});
