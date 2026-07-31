import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createSqlAttendanceStore } from "../src/attendance.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

test("SQL attendance store persists manual records and correction chain", () => {
  const storeFile = join(mkdtempSync(join(tmpdir(), "hrx-attendance-sql-")), "store.json");
  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store });
  repository.createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-attendance-sql",
    display_name: "Attendance SQL",
    status: "active",
  });
  const attendance = createSqlAttendanceStore({ store });
  attendance.write({
    tenant_id: "tenant-a",
    attendance_id: "att-sql-001",
    employee_id: "emp-attendance-sql",
    work_date: "2026-07-02",
    status: "present",
    recorded_hours: 8,
    source_ref: "TimeClock:sql:001",
  });
  const correction = attendance.correct(
    { tenant_id: "tenant-a", attendance_id: "att-sql-001" },
    {
      attendance_id: "att-sql-001-correction",
      status: "remote",
      recorded_hours: 7.5,
      source_ref: "TimeClock:sql:001-correction",
      correction_reason: "manager correction",
    },
  );
  assert.equal(correction.correction_of_attendance_id, "att-sql-001");
  assert.throws(
    () =>
      attendance.correct(
        { tenant_id: "tenant-a", attendance_id: "att-sql-001" },
        {
          attendance_id: "att-sql-001-duplicate",
          source_ref: "TimeClock:sql:duplicate",
          correction_reason: "duplicate branch",
        },
      ),
    /already corrected/,
  );
  assert.throws(
    () =>
      store.query("updateOne", {
        table: "hrx_attendance_records",
        where: { tenant_id: "tenant-a", attendance_id: "att-sql-001" },
        patch: { recorded_hours: 1 },
      }),
    /append-only/,
  );
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  const reopenedAttendance = createSqlAttendanceStore({ store: reopenedStore });
  const records = reopenedAttendance.list({
    tenant_id: "tenant-a",
    employee_id: "emp-attendance-sql",
    month: "2026-07",
  });
  assert.equal(records.length, 2);
  assert.equal(records[1].attendance_id, "att-sql-001-correction");
  assert.equal(records[1].recorded_hours, 7.5);
  reopenedStore.close();
});

test("SQL attendance store enforces employee reference", () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const attendance = createSqlAttendanceStore({ store });
  assert.throws(
    () =>
      attendance.write({
        tenant_id: "tenant-a",
        attendance_id: "att-missing-employee",
        employee_id: "emp-missing",
        work_date: "2026-07-02",
        status: "present",
        source_ref: "TimeClock:sql:missing-employee",
      }),
    /employee not found/,
  );
  store.close();
});
