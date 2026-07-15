import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { loadHrxCoreMigrations } from "../packages/hrx/src/migrations/index.js";
import { auditFreshHrxDatabase } from "./validate-hrx-fresh-db.mjs";

const usage = "usage: node scripts/validate-hrx-checkpoint-upgrades.mjs";
const checkpoints = Object.freeze([10, 20, 25]);
const fixedTimestamp = "2026-07-15T09:00:00+09:00";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedSql(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function quoteIdentifier(value) {
  if (!/^[a-z0-9_]+$/i.test(value)) throw new Error(`unsafe SQLite identifier: ${value}`);
  return `"${value}"`;
}

function objectInventory(database, type) {
  return database.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = ? AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all(type).map((row) => Object.freeze({
    name: row.name,
    sql_sha256: sha256(normalizedSql(row.sql)),
  }));
}

function tableColumns(database, table) {
  return database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map((row) => Object.freeze({
    cid: Number(row.cid),
    name: row.name,
    type: row.type,
    notnull: Number(row.notnull),
    default_value: row.dflt_value,
    primary_key_position: Number(row.pk),
  }));
}

function foreignKeys(database, table) {
  return database.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(table)})`).all().map((row) => Object.freeze({
    id: Number(row.id),
    sequence: Number(row.seq),
    referenced_table: row.table,
    from_column: row.from,
    to_column: row.to,
    on_update: row.on_update,
    on_delete: row.on_delete,
  }));
}

function indexColumns(database, index) {
  return database.prepare(`PRAGMA index_info(${quoteIdentifier(index)})`).all().map((row) => Object.freeze({
    sequence: Number(row.seqno),
    column: row.name,
  }));
}

function schemaManifest(database) {
  const inventories = Object.freeze({
    tables: objectInventory(database, "table"),
    indexes: objectInventory(database, "index"),
    triggers: objectInventory(database, "trigger"),
  });
  return Object.freeze({
    objects: inventories,
    columns: Object.fromEntries(inventories.tables.map(({ name }) => [name, tableColumns(database, name)])),
    foreign_keys: Object.fromEntries(inventories.tables.map(({ name }) => [name, foreignKeys(database, name)])),
    index_columns: Object.fromEntries(inventories.indexes.map(({ name }) => [name, indexColumns(database, name)])),
  });
}

function applyMigrations(database, migrations) {
  const receipts = [];
  for (const migration of migrations) {
    try {
      database.exec("BEGIN IMMEDIATE");
      database.exec(migration.sql);
      database.exec("COMMIT");
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      throw new Error(`checkpoint upgrade failed at ${migration.id}: ${error.message}`);
    }
    receipts.push(Object.freeze({
      id: migration.id,
      filename: migration.filename,
      sql_sha256: sha256(migration.sql),
    }));
  }
  return Object.freeze(receipts);
}

function seedCommon(database, checkpoint) {
  const suffix = `cp${checkpoint}`;
  database.exec(`
    INSERT INTO hrx_employees (
      tenant_id, employee_id, display_name, legal_name, status, source_ref, created_at, updated_at
    ) VALUES (
      'tenant-${suffix}', 'employee-${suffix}', 'MG005 Synthetic Employee', 'MG005 Synthetic Legal Name',
      'active', 'Synthetic:MG005:${suffix}:employee', '${fixedTimestamp}', '${fixedTimestamp}'
    );

    INSERT INTO hrx_leave_groups (
      tenant_id, group_id, code, display_name, status, state_version, created_at, updated_at
    ) VALUES (
      'tenant-${suffix}', 'group-${suffix}', 'ANNUAL-${checkpoint}', 'MG005 Annual Leave',
      'active', 3, '${fixedTimestamp}', '${fixedTimestamp}'
    );

    INSERT INTO hrx_leave_policy_versions (
      tenant_id, policy_version_id, group_id, policy_code, version, effective_from,
      effective_to, status, rules_json, created_at, updated_at
    ) VALUES (
      'tenant-${suffix}', 'policy-${suffix}', 'group-${suffix}', 'POLICY-${checkpoint}', 4,
      '2026-01-01', '2026-12-31', 'active', '{"source":"MG005","checkpoint":${checkpoint}}',
      '${fixedTimestamp}', '${fixedTimestamp}'
    );

    INSERT INTO hrx_leave_accrual_rules (
      tenant_id, accrual_rule_id, rule_code, display_name, policy_version_id, rule_json,
      status, effective_from, effective_to, state_version, created_at, updated_at
    ) VALUES (
      'tenant-${suffix}', 'rule-${suffix}', 'RULE-${checkpoint}', 'MG005 Accrual Rule', 'policy-${suffix}',
      '{"kind":"annual","minutes":480}', 'active', '2026-01-01', '2026-12-31', 5,
      '${fixedTimestamp}', '${fixedTimestamp}'
    );

    INSERT INTO hrx_leave_accrual_runs (
      tenant_id, accrual_run_id, accrual_rule_id, mode, period_key, occurred_on,
      source_version, input_hash, snapshot_hash, preview_run_id, idempotency_key,
      status, result_json, executed_by, created_at, completed_at
    ) VALUES (
      'tenant-${suffix}', 'run-${suffix}', 'rule-${suffix}', 'execute', '2026', '2026-07-15',
      'MG005-v${checkpoint}', 'input-hash-${suffix}', 'snapshot-hash-${suffix}', NULL,
      'MG005:${suffix}:accrual', 'completed', '{"granted_minutes":480}', 'actor-${suffix}',
      '${fixedTimestamp}', '${fixedTimestamp}'
    );
  `);
}

function seedCheckpoint010(database) {
  seedCommon(database, 10);
  database.exec(`
    INSERT INTO hrx_work_schedule_profiles (
      tenant_id, schedule_profile_id, display_name, timezone, weekly_schedule_json,
      holiday_calendar_ref, effective_from, effective_to, state_version, created_at, updated_at
    ) VALUES (
      'tenant-cp10', 'schedule-cp10', 'MG005 Fixed Schedule', 'Asia/Seoul',
      '{"monday":[{"start":"09:00","end":"18:00"}]}', 'Calendar:MG005:2026',
      '2026-01-01', '2026-12-31', 2, '${fixedTimestamp}', '${fixedTimestamp}'
    );

    INSERT INTO hrx_leave_entitlements (
      tenant_id, entitlement_id, employee_id, group_id, policy_version_id, granted_minutes,
      valid_from, expires_on, source_ref, idempotency_key, state_version, created_at
    ) VALUES (
      'tenant-cp10', 'entitlement-cp10', 'employee-cp10', 'group-cp10', 'policy-cp10', 960,
      '2026-01-01', '2026-12-31', 'Synthetic:MG005:cp10:entitlement',
      'MG005:cp10:entitlement', 6, '${fixedTimestamp}'
    );

    INSERT INTO hrx_leave_requests (
      tenant_id, request_id, employee_id, policy_id, leave_type, amount, start_date, end_date,
      state, submitted_at, approver_id, decided_at, decision_reason, source_ref, created_at,
      updated_at, leave_type_id, policy_version_id, requested_minutes, timezone,
      schedule_snapshot_hash, state_version
    ) VALUES (
      'tenant-cp10', 'request-cp10', 'employee-cp10', 'POLICY-10', 'annual', 1,
      '2026-07-20', '2026-07-20', 'approved', '${fixedTimestamp}', 'manager-cp10',
      '${fixedTimestamp}', 'MG005 approved synthetic fixture', 'Synthetic:MG005:cp10:request',
      '${fixedTimestamp}', '${fixedTimestamp}', 'annual-cp10', 'policy-cp10', 480,
      'Asia/Seoul', 'schedule-hash-cp10', 8
    );

    INSERT INTO hrx_leave_request_segments (
      tenant_id, segment_id, request_id, segment_date, scheduled_minutes, requested_minutes,
      timezone, schedule_profile_id, schedule_snapshot_hash, work_periods_json,
      leave_periods_json, created_at
    ) VALUES (
      'tenant-cp10', 'segment-cp10', 'request-cp10', '2026-07-20', 480, 480,
      'Asia/Seoul', 'schedule-cp10', 'schedule-hash-cp10',
      '[{"start":"09:00","end":"18:00"}]', '[{"start":"09:00","end":"18:00"}]',
      '${fixedTimestamp}'
    );

    INSERT INTO hrx_leave_promotion_campaigns (
      tenant_id, campaign_id, policy_version_id, reference_date, state, legal_schedule_json,
      created_at, entitlement_period_end, schedule_profile_id, legal_basis_code,
      legal_basis_version, legal_basis_effective_from, legal_review_state, timezone,
      threshold_minutes, standard_day_minutes, source_version, calculation_snapshot_hash,
      target_count, idempotency_key, updated_at
    ) VALUES (
      'tenant-cp10', 'campaign-cp10', 'policy-cp10', '2026-07-15', 'issued',
      '{"first_notice_days":10,"second_notice_days":20}', '${fixedTimestamp}', '2026-12-31',
      'schedule-cp10', 'KRL-LSA-61', '2026.1', '2026-01-01', 'approved', 'Asia/Seoul',
      480, 480, 'MG005-v10', 'campaign-hash-cp10', 1, 'MG005:cp10:campaign', '${fixedTimestamp}'
    );

    INSERT INTO hrx_leave_promotion_recipients (
      tenant_id, recipient_id, campaign_id, employee_id, stage, deadline_at, document_id,
      delivery_evidence_hash, response_json, created_at, updated_at, unused_minutes,
      standard_day_minutes, unused_days, source_version, state, first_notice_deadline_at,
      first_document_version, first_issued_at, first_delivery_state, first_delivered_at,
      first_viewed_at, first_evidence_hash, response_due_at, responded_at,
      second_notice_deadline_at, second_document_id, second_document_version,
      second_issued_at, second_delivery_state, second_delivered_at, second_viewed_at,
      second_evidence_hash, compliance_state, late_reasons_json
    ) VALUES (
      'tenant-cp10', 'recipient-cp10', 'campaign-cp10', 'employee-cp10', 'first_notice',
      '2026-07-25', 'document-cp10', 'delivery-hash-cp10', '{"choice":"scheduled"}',
      '${fixedTimestamp}', '${fixedTimestamp}', 960, 480, 2, 'MG005-v10', 'responded',
      '2026-07-25', 'v1', '${fixedTimestamp}', 'delivered', '${fixedTimestamp}',
      '${fixedTimestamp}', 'first-evidence-cp10', '2026-07-30', '${fixedTimestamp}',
      '2026-08-10', 'second-document-cp10', 'v2', '${fixedTimestamp}', 'delivered',
      '${fixedTimestamp}', '${fixedTimestamp}', 'second-evidence-cp10', 'closed', '[]'
    );
  `);
}

function seedCheckpoint020(database) {
  seedCommon(database, 20);
  database.exec(`
    INSERT INTO hrx_leave_entitlements (
      tenant_id, entitlement_id, employee_id, group_id, policy_version_id, granted_minutes,
      valid_from, expires_on, source_ref, idempotency_key, state_version, created_at,
      memo, source_document_id, approved_by_actor_id, policy_rules_snapshot_hash
    ) VALUES (
      'tenant-cp20', 'entitlement-cp20', 'employee-cp20', 'group-cp20', 'policy-cp20', 1440,
      '2026-01-01', '2026-12-31', 'Synthetic:MG005:cp20:entitlement',
      'MG005:cp20:entitlement', 7, '${fixedTimestamp}', 'MG005 synthetic memo',
      'document-cp20', 'manager-cp20', 'policy-snapshot-cp20'
    );

    INSERT INTO hrx_compensation_records (
      tenant_id, compensation_id, employee_id, encrypted_amount_ref, currency_ref,
      effective_from, effective_to, source_ref, employment_contract_id,
      contract_document_ref, raw_amount_included, created_at, updated_at
    ) VALUES (
      'tenant-cp20', 'compensation-cp20', 'employee-cp20', 'lawos-comp-v1.synthetic-cp20',
      'Currency:KRW', '2026-01-01', '2026-12-31', 'Synthetic:MG005:cp20:compensation',
      'contract-cp20', 'Document:MG005:cp20:contract', 0, '${fixedTimestamp}', '${fixedTimestamp}'
    );

    INSERT INTO hrx_overtime_requests (
      tenant_id, overtime_id, employee_id, work_date, hours, reason, state, submitted_at,
      approver_id, decided_at, export_ref, source_ref, created_at, updated_at
    ) VALUES (
      'tenant-cp20', 'overtime-cp20', 'employee-cp20', '2026-07-10', 2,
      'MG005 synthetic overtime', 'approved', '${fixedTimestamp}', 'manager-cp20',
      '${fixedTimestamp}', NULL, 'Synthetic:MG005:cp20:overtime', '${fixedTimestamp}', '${fixedTimestamp}'
    );
  `);
}

function seedCheckpoint025(database) {
  seedCommon(database, 25);
  database.exec(`
    INSERT INTO hrx_attendance_records (
      tenant_id, attendance_id, employee_id, work_date, status, source_ref, source_kind,
      import_batch_id, recorded_hours, clock_in_at, clock_out_at,
      correction_of_attendance_id, correction_reason, created_at, updated_at
    ) VALUES (
      'tenant-cp25', 'attendance-cp25', 'employee-cp25', '2026-07-15', 'present',
      'Attendance:MG005:cp25:v1', 'manual', NULL, 8, '2026-07-15T09:00:00+09:00',
      '2026-07-15T18:00:00+09:00', NULL, NULL, '${fixedTimestamp}', '${fixedTimestamp}'
    );

    INSERT INTO hrx_payroll_periods (
      tenant_id, period_id, period_code, period_start, period_end, cutoff_at, pay_date,
      status, state_version, created_by_actor_id, created_at, updated_at, closed_at
    ) VALUES (
      'tenant-cp25', 'period-cp25', '2026-07', '2026-07-01', '2026-07-31',
      '2026-07-25T18:00:00+09:00', '2026-07-31', 'open', 2, 'payroll-cp25',
      '${fixedTimestamp}', '${fixedTimestamp}', NULL
    );

    INSERT INTO hrx_payroll_runs (
      tenant_id, run_id, period_id, run_type, previous_run_id, status, snapshot_hash,
      result_hash, prepared_by_actor_id, approved_by_actor_id, approved_at, closed_at,
      state_version, created_at, updated_at
    ) VALUES (
      'tenant-cp25', 'payroll-run-cp25', 'period-cp25', 'regular', NULL, 'previewed',
      'payroll-snapshot-cp25', 'payroll-result-cp25', 'payroll-cp25', NULL, NULL, NULL,
      3, '${fixedTimestamp}', '${fixedTimestamp}'
    );

    INSERT INTO hrx_payroll_profiles (
      tenant_id, payroll_profile_id, employee_id, employment_type, pay_group_code, currency,
      compensation_ref, effective_from, effective_to, status, state_version,
      created_by_actor_id, created_at, updated_at, compensation_unit,
      compensation_quantity, withholding_category, deduction_input_json,
      custom_deductions_json, notice_assessments_json
    ) VALUES (
      'tenant-cp25', 'profile-cp25', 'employee-cp25', 'monthly', 'KR-MONTHLY', 'KRW',
      'lawos-comp-v1.synthetic-cp25', '2026-01-01', '2026-12-31', 'active', 4,
      'payroll-cp25', '${fixedTimestamp}', '${fixedTimestamp}', 'period', 1,
      'resident', '{"dependents":0}', '[{"code":"SYNTHETIC","amount_ref":"token-cp25"}]',
      '[{"code":"NOTICE","state":"reviewed"}]'
    );

    INSERT INTO hrx_payroll_input_snapshots (
      tenant_id, snapshot_id, run_id, employee_id, source_refs_json, source_hash,
      payable_minutes, paid_leave_minutes, unpaid_leave_minutes, captured_at, input_json
    ) VALUES (
      'tenant-cp25', 'input-cp25', 'payroll-run-cp25', 'employee-cp25',
      '["Attendance:MG005:cp25:v1"]', 'input-source-hash-cp25', 9600, 480, 0,
      '${fixedTimestamp}', '{"attendance_minutes":9600,"paid_leave_minutes":480}'
    );

    INSERT INTO hrx_payroll_employee_results (
      tenant_id, result_id, run_id, employee_id, input_snapshot_id, gross_krw,
      deduction_krw, net_krw, issue_count, result_hash, created_at
    ) VALUES (
      'tenant-cp25', 'result-cp25', 'payroll-run-cp25', 'employee-cp25', 'input-cp25',
      1000000, 100000, 900000, 0, 'employee-result-hash-cp25', '${fixedTimestamp}'
    );

    INSERT INTO hrx_payroll_line_items (
      tenant_id, line_item_id, result_id, item_kind, item_code, formula_code,
      rule_version_id, amount_krw, quantity_minutes, metadata_json, created_at
    ) VALUES (
      'tenant-cp25', 'line-cp25', 'result-cp25', 'earning', 'BASE_PAY', 'MONTHLY_FIXED',
      NULL, 1000000, NULL, '{"source":"MG005"}', '${fixedTimestamp}'
    );

    INSERT INTO hrx_payroll_year_end_cases (
      tenant_id, year_end_case_id, run_id, employee_id, tax_year, collection_state,
      source_refs_json, inputs_json, input_hash, result_json, result_hash, state,
      prepared_by_actor_id, reviewed_by_actor_id, review_receipt_ref, state_version,
      created_at, updated_at, calculated_at, reviewed_at
    ) VALUES (
      'tenant-cp25', 'year-end-cp25', 'payroll-run-cp25', 'employee-cp25', 2026,
      'complete', '["Document:MG005:cp25:year-end"]', '{"fixture":"synthetic"}',
      'year-end-input-hash-cp25', '{"refund_krw":0}', 'year-end-result-hash-cp25',
      'reviewed', 'payroll-cp25', 'reviewer-cp25', 'Receipt:MG005:cp25:review', 5,
      '${fixedTimestamp}', '${fixedTimestamp}', '${fixedTimestamp}', '${fixedTimestamp}'
    );
  `);
}

const seeders = Object.freeze({ 10: seedCheckpoint010, 20: seedCheckpoint020, 25: seedCheckpoint025 });

function captureDataSnapshot(database, shape = null) {
  const tables = shape
    ? Object.keys(shape)
    : database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row) => row.name);
  const snapshot = {};
  for (const table of tables) {
    const columns = shape?.[table]?.columns ?? tableColumns(database, table).map((column) => column.name);
    const primaryKey = tableColumns(database, table)
      .filter((column) => column.primary_key_position > 0)
      .sort((left, right) => left.primary_key_position - right.primary_key_position)
      .map((column) => column.name);
    const orderBy = primaryKey.length ? primaryKey : columns;
    const rows = database.prepare(`
      SELECT ${columns.map(quoteIdentifier).join(", ")}
      FROM ${quoteIdentifier(table)}
      ORDER BY ${orderBy.map(quoteIdentifier).join(", ")}
    `).all();
    if (shape || rows.length) snapshot[table] = Object.freeze({ columns: Object.freeze(columns), rows: Object.freeze(rows) });
  }
  return Object.freeze(snapshot);
}

function scalar(database, sql) {
  return database.prepare(sql).get()?.value;
}

function assertBackfills(database, checkpoint) {
  const checks = [
    ["hrx_leave_accrual_rules.version", scalar(database, "SELECT version AS value FROM hrx_leave_accrual_rules"), 1],
    ["hrx_leave_accrual_rules.logical_rule_code", scalar(database, "SELECT logical_rule_code AS value FROM hrx_leave_accrual_rules"), null],
    ["hrx_leave_accrual_rules.supersedes_rule_id", scalar(database, "SELECT supersedes_rule_id AS value FROM hrx_leave_accrual_rules"), null],
    ["hrx_leave_accrual_runs.as_of_date", scalar(database, "SELECT as_of_date AS value FROM hrx_leave_accrual_runs"), null],
  ];
  if (checkpoint === 10) checks.push(
    ["hrx_leave_requests.duration_mode", scalar(database, "SELECT duration_mode AS value FROM hrx_leave_requests"), null],
    ["hrx_leave_requests.rounded_requested_minutes", scalar(database, "SELECT rounded_requested_minutes AS value FROM hrx_leave_requests"), null],
    ["hrx_leave_requests.paid_minutes", scalar(database, "SELECT paid_minutes AS value FROM hrx_leave_requests"), null],
    ["hrx_leave_requests.unpaid_minutes", scalar(database, "SELECT unpaid_minutes AS value FROM hrx_leave_requests"), null],
    ["hrx_leave_requests.deduction_minutes", scalar(database, "SELECT deduction_minutes AS value FROM hrx_leave_requests"), null],
    ["hrx_leave_requests.policy_rules_snapshot_hash", scalar(database, "SELECT policy_rules_snapshot_hash AS value FROM hrx_leave_requests"), null],
    ["hrx_leave_request_segments.paid_minutes", scalar(database, "SELECT paid_minutes AS value FROM hrx_leave_request_segments"), null],
    ["hrx_leave_request_segments.deduction_minutes", scalar(database, "SELECT deduction_minutes AS value FROM hrx_leave_request_segments"), null],
    ["hrx_leave_request_segments.policy_rules_snapshot_hash", scalar(database, "SELECT policy_rules_snapshot_hash AS value FROM hrx_leave_request_segments"), null],
    ["hrx_leave_entitlements.memo", scalar(database, "SELECT memo AS value FROM hrx_leave_entitlements"), null],
    ["hrx_leave_entitlements.source_document_id", scalar(database, "SELECT source_document_id AS value FROM hrx_leave_entitlements"), null],
    ["hrx_leave_entitlements.approved_by_actor_id", scalar(database, "SELECT approved_by_actor_id AS value FROM hrx_leave_entitlements"), null],
    ["hrx_leave_entitlements.policy_rules_snapshot_hash", scalar(database, "SELECT policy_rules_snapshot_hash AS value FROM hrx_leave_entitlements"), null],
    ["hrx_leave_promotion_campaigns.excluded_count", scalar(database, "SELECT excluded_count AS value FROM hrx_leave_promotion_campaigns"), 0],
    ["hrx_leave_promotion_campaigns.exclusions_json", scalar(database, "SELECT exclusions_json AS value FROM hrx_leave_promotion_campaigns"), "[]"],
    ["hrx_leave_promotion_recipients.first_content_hash", scalar(database, "SELECT first_content_hash AS value FROM hrx_leave_promotion_recipients"), null],
    ["hrx_leave_promotion_recipients.second_content_hash", scalar(database, "SELECT second_content_hash AS value FROM hrx_leave_promotion_recipients"), null],
  );
  if (checkpoint === 20) checks.push(
    ["hrx_overtime_requests.payroll_segment_kind", scalar(database, "SELECT payroll_segment_kind AS value FROM hrx_overtime_requests"), null],
  );
  for (const [label, actual, expected] of checks) {
    if (actual !== expected) throw new Error(`checkpoint ${checkpoint} backfill mismatch: ${label}=${actual} expected ${expected}`);
  }
  return Object.freeze(checks.map(([field, actual, expected]) => Object.freeze({ field, actual, expected, verdict: "PASS" })));
}

function totalRows(database) {
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return tables.reduce((sum, { name }) => sum + Number(
    database.prepare(`SELECT count(*) AS count FROM ${quoteIdentifier(name)}`).get().count,
  ), 0);
}

function validateDatabase(database, label) {
  const foreignKeyErrors = database.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyErrors.length) throw new Error(`${label} foreign-key errors: ${foreignKeyErrors.length}`);
  const integrity = database.prepare("PRAGMA integrity_check").all().map((row) => row.integrity_check);
  if (JSON.stringify(integrity) !== JSON.stringify(["ok"])) throw new Error(`${label} integrity failed: ${integrity.join(",")}`);
  return Object.freeze({ integrity_check: integrity[0], foreign_key_error_count: foreignKeyErrors.length });
}

function auditCheckpoint(migrations, checkpoint, finalSchemaSha256) {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), `lawos-mg005-${checkpoint}-`));
  const databasePath = path.join(tempDirectory, "hrx.sqlite");
  let database;
  try {
    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON");
    const checkpointReceipts = applyMigrations(database, migrations.slice(0, checkpoint));
    seeders[checkpoint](database);
    const checkpointValidation = validateDatabase(database, `checkpoint ${checkpoint}`);
    const beforeSnapshot = captureDataSnapshot(database);
    const beforeSnapshotJson = JSON.stringify(beforeSnapshot);
    const checkpointTotalRowCount = totalRows(database);
    const checkpointSchemaSha256 = sha256(JSON.stringify(schemaManifest(database)));
    database.close();
    database = null;

    database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON");
    const upgradeReceipts = applyMigrations(database, migrations.slice(checkpoint));
    const afterSnapshot = captureDataSnapshot(database, beforeSnapshot);
    const afterSnapshotJson = JSON.stringify(afterSnapshot);
    if (afterSnapshotJson !== beforeSnapshotJson) throw new Error(`checkpoint ${checkpoint} data snapshot changed during upgrade`);
    const upgradedTotalRowCount = totalRows(database);
    if (upgradedTotalRowCount !== checkpointTotalRowCount) {
      throw new Error(`checkpoint ${checkpoint} upgrade created or removed rows: ${checkpointTotalRowCount} -> ${upgradedTotalRowCount}`);
    }
    const finalSchemaActualSha256 = sha256(JSON.stringify(schemaManifest(database)));
    if (finalSchemaActualSha256 !== finalSchemaSha256) {
      throw new Error(`checkpoint ${checkpoint} final schema differs from fresh DB: ${finalSchemaActualSha256}`);
    }
    const backfillChecks = assertBackfills(database, checkpoint);
    const upgradedValidation = validateDatabase(database, `upgraded checkpoint ${checkpoint}`);
    database.close();
    database = null;

    database = new DatabaseSync(databasePath, { readOnly: true });
    database.exec("PRAGMA foreign_keys = ON");
    const reopenedSnapshotJson = JSON.stringify(captureDataSnapshot(database, beforeSnapshot));
    if (reopenedSnapshotJson !== beforeSnapshotJson) throw new Error(`checkpoint ${checkpoint} data changed after durable reopen`);
    const reopenedTotalRowCount = totalRows(database);
    if (reopenedTotalRowCount !== checkpointTotalRowCount) {
      throw new Error(`checkpoint ${checkpoint} durable reopen row count changed: ${checkpointTotalRowCount} -> ${reopenedTotalRowCount}`);
    }
    const reopenedSchemaSha256 = sha256(JSON.stringify(schemaManifest(database)));
    if (reopenedSchemaSha256 !== finalSchemaSha256) throw new Error(`checkpoint ${checkpoint} schema changed after durable reopen`);
    const reopenedValidation = validateDatabase(database, `reopened checkpoint ${checkpoint}`);

    const seededTables = Object.entries(beforeSnapshot).map(([table, value]) => Object.freeze({ table, row_count: value.rows.length }));
    const seededRowCount = seededTables.reduce((sum, table) => sum + table.row_count, 0);
    return Object.freeze({
      checkpoint,
      checkpoint_migration_count: checkpointReceipts.length,
      checkpoint_last_migration: checkpointReceipts.at(-1).filename,
      upgrade_migration_count: upgradeReceipts.length,
      upgrade_first_migration: upgradeReceipts[0].filename,
      upgrade_last_migration: upgradeReceipts.at(-1).filename,
      seeded_table_count: seededTables.length,
      seeded_row_count: seededRowCount,
      seeded_tables: Object.freeze(seededTables),
      checkpoint_schema_sha256: checkpointSchemaSha256,
      final_schema_sha256: finalSchemaActualSha256,
      data_snapshot_sha256_before: sha256(beforeSnapshotJson),
      data_snapshot_sha256_after: sha256(afterSnapshotJson),
      data_snapshot_sha256_reopened: sha256(reopenedSnapshotJson),
      changed_existing_row_count: 0,
      lost_existing_row_count: 0,
      unexpected_new_row_count: 0,
      backfill_checks: backfillChecks,
      checkpoint_validation: checkpointValidation,
      upgraded_validation: upgradedValidation,
      reopened_validation: reopenedValidation,
      durable_reopen: true,
      verdict: "PASS",
    });
  } finally {
    try { database?.close(); } catch {}
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

export function auditHrxCheckpointUpgrades() {
  const migrations = loadHrxCoreMigrations();
  const freshAudit = auditFreshHrxDatabase();
  const checkpointReports = checkpoints.map((checkpoint) => auditCheckpoint(
    migrations,
    checkpoint,
    freshAudit.schema_manifest_sha256,
  ));
  return Object.freeze({
    verdict: "PASS",
    engine: "SQLite",
    sqlite_version: freshAudit.sqlite_version,
    final_migration_count: migrations.length,
    final_migration: migrations.at(-1).filename,
    fresh_schema_sha256: freshAudit.schema_manifest_sha256,
    checkpoint_count: checkpointReports.length,
    total_seeded_table_count: checkpointReports.reduce((sum, report) => sum + report.seeded_table_count, 0),
    total_seeded_row_count: checkpointReports.reduce((sum, report) => sum + report.seeded_row_count, 0),
    total_changed_existing_row_count: 0,
    total_lost_existing_row_count: 0,
    total_unexpected_new_row_count: 0,
    total_backfill_check_count: checkpointReports.reduce((sum, report) => sum + report.backfill_checks.length, 0),
    checkpoints: Object.freeze(checkpointReports),
    report_sha256: sha256(JSON.stringify(checkpointReports)),
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.some((argument) => ["-h", "--help"].includes(argument))) {
    console.log(usage);
  } else if (args.length) {
    throw new Error(usage);
  } else {
    console.log(JSON.stringify(auditHrxCheckpointUpgrades(), null, 2));
  }
}
