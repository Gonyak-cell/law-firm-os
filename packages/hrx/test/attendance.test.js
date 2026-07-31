import assert from "node:assert/strict";
import test from "node:test";
import {
  createAttendanceCorrection,
  createAttendanceRecord,
  createInMemoryAttendanceStore,
  importAttendanceRecords,
  resolveEffectiveAttendanceRecords,
} from "../src/attendance.js";

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

test("attendance manual correction keeps source traceability and original reference", () => {
  const current = createAttendanceRecord({
    tenant_id: "tenant-a",
    attendance_id: "att-original",
    employee_id: "emp-001",
    work_date: "2026-06-19",
    status: "present",
    recorded_hours: 8,
    source_ref: "TimeClock:manual:original",
  });
  const correction = createAttendanceCorrection(current, {
    attendance_id: "att-correction",
    status: "remote",
    recorded_hours: 7.5,
    source_ref: "TimeClock:manual:correction",
    correction_reason: "manager adjustment",
  });
  assert.equal(correction.source_kind, "manual");
  assert.equal(correction.correction_of_attendance_id, "att-original");
  assert.equal(correction.correction_reason, "manager adjustment");

  const store = createInMemoryAttendanceStore([current]);
  const originalSnapshot = store.get({ tenant_id: "tenant-a", attendance_id: "att-original" });
  const stored = store.correct(
    { tenant_id: "tenant-a", attendance_id: "att-original" },
    {
      attendance_id: "att-correction-store",
      status: "leave",
      source_ref: "TimeClock:manual:correction-store",
      correction_reason: "approved PTO",
    },
  );
  assert.equal(stored.correction_of_attendance_id, "att-original");
  assert.equal(store.list({ tenant_id: "tenant-a", employee_id: "emp-001" }).length, 2);
  assert.deepEqual(
    store.get({ tenant_id: "tenant-a", attendance_id: "att-original" }),
    originalSnapshot,
  );
  assert.deepEqual(
    resolveEffectiveAttendanceRecords(store.list({ tenant_id: "tenant-a" }))
      .map((record) => record.attendance_id),
    ["att-correction-store"],
  );
  assert.throws(
    () =>
      store.correct(
        { tenant_id: "tenant-a", attendance_id: "att-original" },
        {
          attendance_id: "att-correction-duplicate",
          source_ref: "TimeClock:manual:duplicate",
          correction_reason: "duplicate branch",
        },
      ),
    /already corrected/,
  );
  assert.throws(
    () =>
      store.correct(
        { tenant_id: "tenant-b", attendance_id: "att-original" },
        {
          attendance_id: "att-cross-tenant",
          source_ref: "TimeClock:manual:cross-tenant",
          correction_reason: "cross tenant",
        },
      ),
    /not found/,
  );
});

test("attendance timestamps use explicit timezone and the Asia/Seoul work date", () => {
  const record = createAttendanceRecord({
    tenant_id: "tenant-a",
    attendance_id: "att-kst",
    employee_id: "emp-001",
    work_date: "2026-07-14",
    status: "present",
    source_ref: "TimeClock:kst",
    clock_in_at: "2026-07-13T15:05:00Z",
    clock_out_at: "2026-07-14T09:10:00Z",
  });
  assert.equal(record.clock_in_at, "2026-07-13T15:05:00Z");
  assert.throws(
    () => createAttendanceRecord({
      ...record,
      attendance_id: "att-no-zone",
      clock_in_at: "2026-07-14T09:00:00",
      clock_out_at: "2026-07-14T18:00:00",
    }),
    /explicit timezone/,
  );
  assert.throws(
    () => createAttendanceRecord({
      ...record,
      attendance_id: "att-wrong-kst-date",
      clock_in_at: "2026-07-12T15:05:00Z",
      clock_out_at: "2026-07-13T09:10:00Z",
    }),
    /Asia\/Seoul/,
  );
  assert.throws(
    () => createAttendanceRecord({
      ...record,
      attendance_id: "att-invalid-order",
      clock_in_at: "2026-07-14T18:00:00+09:00",
      clock_out_at: "2026-07-14T09:00:00+09:00",
    }),
    /must be after/,
  );
});
