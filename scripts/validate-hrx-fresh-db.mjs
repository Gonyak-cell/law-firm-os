import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { loadHrxCoreMigrations } from "../packages/hrx/src/migrations/index.js";

const usage = "usage: node scripts/validate-hrx-fresh-db.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedSql(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function assertEqualSets(label, expected, actual) {
  const missing = expected.filter((value) => !actual.includes(value));
  const unexpected = actual.filter((value) => !expected.includes(value));
  if (missing.length || unexpected.length) {
    throw new Error(`${label} mismatch: missing=${missing.join(",") || "none"} unexpected=${unexpected.join(",") || "none"}`);
  }
  return Object.freeze({ missing_count: 0, unexpected_count: 0 });
}

function objectNames(sql, pattern) {
  return sortedUnique([...sql.matchAll(pattern)].map((match) => match[1]));
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
  return database.prepare(`PRAGMA table_info("${table}")`).all().map((row) => Object.freeze({
    cid: Number(row.cid),
    name: row.name,
    type: row.type,
    notnull: Number(row.notnull),
    default_value: row.dflt_value,
    primary_key_position: Number(row.pk),
  }));
}

function foreignKeys(database, table) {
  return database.prepare(`PRAGMA foreign_key_list("${table}")`).all().map((row) => Object.freeze({
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
  return database.prepare(`PRAGMA index_info("${index}")`).all().map((row) => Object.freeze({
    sequence: Number(row.seqno),
    column: row.name,
  }));
}

function requiredColumn(database, table, column, expected = {}) {
  const actual = tableColumns(database, table).find((candidate) => candidate.name === column);
  if (!actual) throw new Error(`required fresh DB column is missing: ${table}.${column}`);
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) throw new Error(`fresh DB column mismatch: ${table}.${column}.${key}=${actual[key]} expected ${value}`);
  }
  return Object.freeze({ table, column, ...actual });
}

function assertForbiddenColumn(database, table, column) {
  if (tableColumns(database, table).some((candidate) => candidate.name === column)) {
    throw new Error(`forbidden fresh DB column exists: ${table}.${column}`);
  }
  return Object.freeze({ table, column, absent: true });
}

function expectDatabaseError(label, operation, pattern) {
  try {
    operation();
  } catch (error) {
    if (!pattern.test(error.message)) throw new Error(`${label} failed with unexpected error: ${error.message}`);
    return Object.freeze({ label, verdict: "PASS", error_class: pattern.source });
  }
  throw new Error(`${label} unexpectedly succeeded`);
}

function runConstraintProbes(database) {
  const results = [];
  database.exec("SAVEPOINT mg004_constraint_probe");
  try {
    database.exec(`
      INSERT INTO hrx_employees (tenant_id, employee_id, display_name, status)
      VALUES ('tenant-mg004', 'employee-mg004', 'MG004 Employee', 'active');

      INSERT INTO hrx_payroll_profiles (
        tenant_id, payroll_profile_id, employee_id, employment_type, pay_group_code,
        currency, compensation_ref, effective_from, status, state_version,
        created_by_actor_id, compensation_unit, compensation_quantity,
        custom_deductions_json, notice_assessments_json
      ) VALUES (
        'tenant-mg004', 'profile-mg004', 'employee-mg004', 'monthly', 'KR-MONTHLY',
        'KRW', 'compensation:mg004', '2026-01-01', 'active', 1,
        'actor-mg004', 'period', 1, '[]', '[]'
      );

      INSERT INTO hrx_payroll_items (
        tenant_id, item_id, code, display_name, kind, tax_treatment, value_mode,
        calculation_order, effective_from, status, state_version
      ) VALUES (
        'tenant-mg004', 'item-mg004', 'BASE_PAY', 'Base pay', 'earning', 'taxable', 'fixed',
        10, '2026-01-01', 'active', 1
      );

      INSERT INTO hrx_payroll_item_assignments (
        tenant_id, assignment_id, payroll_profile_id, employee_id, item_id, version,
        encrypted_amount_ref, currency_ref, effective_from, status, source_ref, raw_amount_included
      ) VALUES (
        'tenant-mg004', 'assignment-mg004', 'profile-mg004', 'employee-mg004', 'item-mg004', 1,
        'lawos-comp-v1.mg004', 'Currency:KRW', '2026-01-01', 'active', 'HRX:MG004:assignment', 0
      );

      INSERT INTO hrx_attendance_records (
        tenant_id, attendance_id, employee_id, work_date, status, source_ref, source_kind,
        clock_in_at, clock_out_at
      ) VALUES (
        'tenant-mg004', 'attendance-mg004', 'employee-mg004', '2026-07-15', 'present',
        'Attendance:MG004:v1', 'manual', '2026-07-15T09:00:00+09:00', '2026-07-15T18:00:00+09:00'
      );

      INSERT INTO hrx_attendance_approval_receipts (
        tenant_id, approval_receipt_id, attendance_id, employee_id, approved_by_actor_id,
        approved_at, attendance_source_ref, idempotency_key
      ) VALUES (
        'tenant-mg004', 'receipt-mg004', 'attendance-mg004', 'employee-mg004', 'manager-mg004',
        '2026-07-15T18:30:00+09:00', 'Attendance:MG004:v1', 'MG004:approve:attendance'
      );
    `);

    const update = database.prepare(`
      UPDATE hrx_payroll_profiles
      SET pay_group_code = 'KR-MONTHLY-UPDATED', state_version = state_version + 1
      WHERE tenant_id = 'tenant-mg004' AND payroll_profile_id = 'profile-mg004'
    `).run();
    const profile = database.prepare(`
      SELECT pay_group_code, state_version
      FROM hrx_payroll_profiles
      WHERE tenant_id = 'tenant-mg004' AND payroll_profile_id = 'profile-mg004'
    `).get();
    if (Number(update.changes) !== 1 || profile.pay_group_code !== "KR-MONTHLY-UPDATED" || Number(profile.state_version) !== 2) {
      throw new Error("canonical payroll profile optimistic update probe failed");
    }
    results.push(Object.freeze({ label: "canonical_payroll_profile_mutable", verdict: "PASS" }));

    results.push(expectDatabaseError(
      "payroll_assignment_update_blocked",
      () => database.exec("UPDATE hrx_payroll_item_assignments SET status = 'inactive' WHERE assignment_id = 'assignment-mg004'"),
      /append-only/,
    ));
    results.push(expectDatabaseError(
      "payroll_assignment_delete_blocked",
      () => database.exec("DELETE FROM hrx_payroll_item_assignments WHERE assignment_id = 'assignment-mg004'"),
      /append-only/,
    ));
    results.push(expectDatabaseError(
      "attendance_receipt_update_blocked",
      () => database.exec("UPDATE hrx_attendance_approval_receipts SET approved_by_actor_id = 'other' WHERE approval_receipt_id = 'receipt-mg004'"),
      /append-only/,
    ));
    results.push(expectDatabaseError(
      "attendance_receipt_delete_blocked",
      () => database.exec("DELETE FROM hrx_attendance_approval_receipts WHERE approval_receipt_id = 'receipt-mg004'"),
      /append-only/,
    ));
    results.push(expectDatabaseError(
      "payroll_assignment_foreign_key_enforced",
      () => database.exec(`
        INSERT INTO hrx_payroll_item_assignments (
          tenant_id, assignment_id, payroll_profile_id, employee_id, item_id, version,
          encrypted_amount_ref, currency_ref, effective_from, status, source_ref, raw_amount_included
        ) VALUES (
          'tenant-mg004', 'assignment-missing-item', 'profile-mg004', 'employee-mg004', 'missing-item', 2,
          'lawos-comp-v1.mg004', 'Currency:KRW', '2026-01-01', 'active', 'HRX:MG004:missing', 0
        )
      `),
      /FOREIGN KEY constraint failed/,
    ));
    results.push(expectDatabaseError(
      "payroll_assignment_raw_amount_flag_blocked",
      () => database.exec(`
        INSERT INTO hrx_payroll_item_assignments (
          tenant_id, assignment_id, payroll_profile_id, employee_id, item_id, version,
          encrypted_amount_ref, currency_ref, effective_from, status, source_ref, raw_amount_included
        ) VALUES (
          'tenant-mg004', 'assignment-raw-amount', 'profile-mg004', 'employee-mg004', 'item-mg004', 2,
          'lawos-comp-v1.mg004', 'Currency:KRW', '2026-01-01', 'active', 'HRX:MG004:raw', 1
        )
      `),
      /CHECK constraint failed/,
    ));
  } finally {
    database.exec("ROLLBACK TO mg004_constraint_probe");
    database.exec("RELEASE mg004_constraint_probe");
  }
  return Object.freeze(results);
}

export function auditFreshHrxDatabase() {
  const migrations = loadHrxCoreMigrations();
  const expectedOrdinals = Array.from({ length: 29 }, (_, index) => String(index + 1).padStart(3, "0"));
  const actualOrdinals = migrations.map((migration) => migration.filename.slice(0, 3));
  if (JSON.stringify(actualOrdinals) !== JSON.stringify(expectedOrdinals)) {
    throw new Error(`fresh DB migration lineage is not contiguous 001-029: ${actualOrdinals.join(",")}`);
  }
  const combinedSql = migrations.map((migration) => migration.sql).join("\n");
  const expected = Object.freeze({
    tables: objectNames(combinedSql, /CREATE TABLE IF NOT EXISTS\s+(\w+)/g),
    indexes: objectNames(combinedSql, /CREATE\s+(?:UNIQUE\s+)?INDEX IF NOT EXISTS\s+(\w+)/g),
    triggers: objectNames(combinedSql, /CREATE TRIGGER IF NOT EXISTS\s+(\w+)/g),
  });
  const database = new DatabaseSync(":memory:");
  try {
    database.exec("PRAGMA foreign_keys = ON");
    const migrationReceipts = [];
    for (const migration of migrations) {
      const before = database.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").get();
      try {
        database.exec("BEGIN IMMEDIATE");
        database.exec(migration.sql);
        database.exec("COMMIT");
      } catch (error) {
        try { database.exec("ROLLBACK"); } catch {}
        throw new Error(`fresh DB migration failed at ${migration.id}: ${error.message}`);
      }
      const after = database.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").get();
      migrationReceipts.push(Object.freeze({
        id: migration.id,
        filename: migration.filename,
        sql_sha256: sha256(migration.sql),
        schema_object_count_before: Number(before.count),
        schema_object_count_after: Number(after.count),
      }));
    }

    const inventories = Object.freeze({
      tables: objectInventory(database, "table"),
      indexes: objectInventory(database, "index"),
      triggers: objectInventory(database, "trigger"),
    });
    const actual = Object.freeze({
      tables: inventories.tables.map((row) => row.name),
      indexes: inventories.indexes.map((row) => row.name),
      triggers: inventories.triggers.map((row) => row.name),
    });
    const objectSetChecks = Object.freeze({
      tables: assertEqualSets("fresh DB tables", expected.tables, actual.tables),
      indexes: assertEqualSets("fresh DB indexes", expected.indexes, actual.indexes),
      triggers: assertEqualSets("fresh DB triggers", expected.triggers, actual.triggers),
    });

    const requiredColumnChecks = Object.freeze([
      requiredColumn(database, "hrx_payroll_items", "state_version", { type: "INTEGER", notnull: 1, default_value: "1" }),
      requiredColumn(database, "hrx_payroll_item_assignments", "raw_amount_included", { type: "INTEGER", notnull: 1, default_value: "0" }),
      requiredColumn(database, "hrx_attendance_approval_receipts", "attendance_source_ref", { type: "TEXT", notnull: 1 }),
      requiredColumn(database, "hrx_leave_accrual_rules", "logical_rule_code", { type: "TEXT", notnull: 0 }),
      requiredColumn(database, "hrx_leave_accrual_rules", "version", { type: "INTEGER", notnull: 1, default_value: "1" }),
      requiredColumn(database, "hrx_leave_accrual_rules", "supersedes_rule_id", { type: "TEXT", notnull: 0 }),
      requiredColumn(database, "hrx_leave_accrual_runs", "as_of_date", { type: "TEXT", notnull: 0 }),
    ]);
    const forbiddenColumnChecks = Object.freeze([
      assertForbiddenColumn(database, "hrx_payroll_profiles", "pay_frequency"),
      assertForbiddenColumn(database, "hrx_leave_groups", "balance_managed"),
      assertForbiddenColumn(database, "hrx_leave_groups", "balance_unit"),
      assertForbiddenColumn(database, "hrx_leave_types", "allowed_usage_units_json"),
      assertForbiddenColumn(database, "hrx_leave_requests", "applied_deduct_minutes"),
      assertForbiddenColumn(database, "hrx_leave_requests", "applied_paid_minutes"),
      assertForbiddenColumn(database, "hrx_leave_entitlements", "cancellation_entry_id"),
    ]);
    for (const forbiddenTable of ["hrx_payroll_time_snapshots", "hrx_payroll_time_snapshot_sources"]) {
      if (actual.tables.includes(forbiddenTable)) throw new Error(`forbidden fresh DB table exists: ${forbiddenTable}`);
    }

    const constraintProbes = runConstraintProbes(database);
    const rowCounts = Object.fromEntries(actual.tables.map((table) => [
      table,
      Number(database.prepare(`SELECT count(*) AS count FROM "${table}"`).get().count),
    ]));
    const nonemptyTables = Object.entries(rowCounts).filter(([, count]) => count !== 0).map(([table]) => table);
    if (nonemptyTables.length) throw new Error(`fresh DB contains seeded rows: ${nonemptyTables.join(",")}`);

    const integrity = database.prepare("PRAGMA integrity_check").all().map((row) => row.integrity_check);
    if (JSON.stringify(integrity) !== JSON.stringify(["ok"])) throw new Error(`fresh DB integrity check failed: ${integrity.join(",")}`);
    const foreignKeyErrors = database.prepare("PRAGMA foreign_key_check").all();
    if (foreignKeyErrors.length) throw new Error(`fresh DB foreign key check failed: ${foreignKeyErrors.length}`);

    const schemaManifest = Object.freeze({
      objects: inventories,
      columns: Object.fromEntries(actual.tables.map((table) => [table, tableColumns(database, table)])),
      foreign_keys: Object.fromEntries(actual.tables.map((table) => [table, foreignKeys(database, table)])),
      index_columns: Object.fromEntries(actual.indexes.map((index) => [index, indexColumns(database, index)])),
    });
    return Object.freeze({
      verdict: "PASS",
      engine: "SQLite",
      sqlite_version: database.prepare("SELECT sqlite_version() AS version").get().version,
      migration_count: migrations.length,
      migration_first: migrations[0].filename,
      migration_last: migrations.at(-1).filename,
      migration_receipts: Object.freeze(migrationReceipts),
      expected_object_counts: Object.freeze({ tables: expected.tables.length, indexes: expected.indexes.length, triggers: expected.triggers.length }),
      actual_object_counts: Object.freeze({ tables: actual.tables.length, indexes: actual.indexes.length, triggers: actual.triggers.length }),
      object_set_checks: objectSetChecks,
      required_column_checks: requiredColumnChecks,
      forbidden_column_checks: forbiddenColumnChecks,
      forbidden_table_count: 0,
      constraint_probes: constraintProbes,
      empty_table_count: actual.tables.length,
      nonempty_table_count: nonemptyTables.length,
      integrity_check: integrity[0],
      foreign_key_error_count: foreignKeyErrors.length,
      migration_manifest_sha256: sha256(JSON.stringify(migrationReceipts)),
      schema_manifest_sha256: sha256(JSON.stringify(schemaManifest)),
      row_count_manifest_sha256: sha256(JSON.stringify(rowCounts)),
    });
  } finally {
    database.close();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.some((argument) => ["-h", "--help"].includes(argument))) {
    console.log(usage);
  } else if (args.length) {
    throw new Error(usage);
  } else {
    console.log(JSON.stringify(auditFreshHrxDatabase(), null, 2));
  }
}
