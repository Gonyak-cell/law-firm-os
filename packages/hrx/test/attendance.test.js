import assert from "node:assert/strict";
import test from "node:test";
import { createAttendanceRecord, createInMemoryAttendanceStore, importAttendanceRecords } from "../src/attendance.js";

test("attendance record requires source traceability", () => {
  const record = createAttendanceRecord({
    tenant_id: "tenant-a",
    attendance_id: "att-001",
    employee_id: "emp-001",
    work_date: "2026-06-19",
    status: "present",
    recorded_hours: 8,
    source_ref: "TimeClock:manual:001",
  });
  assert.equal(record.source_kind, "manual");
  assert.equal(record.source_ref, "TimeClock:manual:001");
  assert.throws(
    () => createAttendanceRecord({ tenant_id: "tenant-a", attendance_id: "att-002", employee_id: "emp-001", work_date: "2026-06-20" }),
    /source_ref is required/,
  );
});

test("attendance import stamps import source and batch id", () => {
  const imported = importAttendanceRecords({
    tenant_id: "tenant-a",
    import_batch_id: "batch-001",
    source_ref: "SFTP:attendance:2026-06-19.csv",
    records: [{ employee_id: "emp-001", work_date: "2026-06-19", status: "remote", recorded_hours: 7.5 }],
  });
  assert.equal(imported[0].source_kind, "import");
  assert.equal(imported[0].import_batch_id, "batch-001");

  const store = createInMemoryAttendanceStore();
  store.importBatch({
    tenant_id: "tenant-a",
    import_batch_id: "batch-002",
    source_ref: "SFTP:attendance:2026-06-20.csv",
    records: [{ employee_id: "emp-001", work_date: "2026-06-20", status: "present" }],
  });
  assert.equal(store.list({ tenant_id: "tenant-a", employee_id: "emp-001" }).length, 1);
});
