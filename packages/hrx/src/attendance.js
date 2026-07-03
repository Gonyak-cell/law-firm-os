export const HRX_ATTENDANCE_STATUSES = Object.freeze(["present", "absent", "remote", "leave", "holiday"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalHours(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${field} must be a finite number greater than or equal to 0`);
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function matchesAttendanceQuery(record, query = {}) {
  if (query.tenant_id && record.tenant_id !== query.tenant_id) return false;
  if (query.employee_id && record.employee_id !== query.employee_id) return false;
  if (query.attendance_id && record.attendance_id !== query.attendance_id) return false;
  if (query.status && record.status !== query.status) return false;
  if (query.work_date && record.work_date !== query.work_date) return false;
  if (query.month && !record.work_date.startsWith(`${query.month}-`)) return false;
  return true;
}

function sortAttendanceRecords(left, right) {
  return left.work_date.localeCompare(right.work_date) || left.attendance_id.localeCompare(right.attendance_id);
}

export function createAttendanceRecord(input = {}) {
  const status = input.status ?? "present";
  if (!HRX_ATTENDANCE_STATUSES.includes(status)) {
    throw new TypeError(`status must be one of ${HRX_ATTENDANCE_STATUSES.join(", ")}`);
  }
  const sourceKind = input.source_kind ?? "manual";
  if (!["manual", "import"].includes(sourceKind)) throw new TypeError("source_kind must be manual or import");
  if (sourceKind === "import" && !input.import_batch_id) throw new TypeError("import_batch_id is required for imported attendance");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    attendance_id: requiredString(input, "attendance_id"),
    employee_id: requiredString(input, "employee_id"),
    work_date: requiredString(input, "work_date"),
    status,
    source_ref: requiredString(input, "source_ref"),
    source_kind: sourceKind,
    import_batch_id: input.import_batch_id ?? null,
    recorded_hours: optionalHours(input, "recorded_hours"),
    clock_in_at: input.clock_in_at ?? null,
    clock_out_at: input.clock_out_at ?? null,
    correction_of_attendance_id: input.correction_of_attendance_id ?? null,
    correction_reason: input.correction_reason ?? null,
  });
}

export function createAttendanceCorrection(current = {}, input = {}) {
  const existing = createAttendanceRecord(current);
  const correctionReason = requiredString(input, "correction_reason");
  return createAttendanceRecord({
    ...existing,
    ...input,
    tenant_id: existing.tenant_id,
    attendance_id: requiredString(input, "attendance_id"),
    employee_id: existing.employee_id,
    work_date: existing.work_date,
    source_kind: "manual",
    correction_of_attendance_id: existing.attendance_id,
    correction_reason: correctionReason,
    source_ref: requiredString(input, "source_ref"),
  });
}

export function importAttendanceRecords({ tenant_id, import_batch_id, source_ref, records = [] } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ import_batch_id }, "import_batch_id");
  requiredString({ source_ref }, "source_ref");
  return Object.freeze(
    records.map((record, index) =>
      createAttendanceRecord({
        ...record,
        tenant_id,
        attendance_id: record.attendance_id ?? `${import_batch_id}:${index + 1}`,
        source_ref,
        source_kind: "import",
        import_batch_id,
      }),
    ),
  );
}

export function createInMemoryAttendanceStore(seed = []) {
  const records = new Map();
  const key = (tenantId, attendanceId) => `${tenantId}:${attendanceId}`;

  function write(input) {
    const record = createAttendanceRecord(input);
    records.set(key(record.tenant_id, record.attendance_id), clone(record));
    return Object.freeze(clone(record));
  }

  for (const record of seed) write(record);

  return Object.freeze({
    write,
    get(ref = {}) {
      const value = records.get(key(ref.tenant_id, ref.attendance_id));
      return value ? Object.freeze(clone(value)) : undefined;
    },
    importBatch(batch) {
      const imported = importAttendanceRecords(batch);
      for (const record of imported) write(record);
      return imported;
    },
    correct(ref = {}, input = {}) {
      const current = records.get(key(ref.tenant_id, ref.attendance_id));
      if (!current) throw new Error(`Attendance record not found: ${ref.attendance_id}`);
      return write(createAttendanceCorrection(current, input));
    },
    list(query = {}) {
      return Object.freeze(
        [...records.values()]
          .filter((record) => matchesAttendanceQuery(record, query))
          .sort(sortAttendanceRecords)
          .map((record) => Object.freeze(clone(record))),
      );
    },
  });
}

export function createSqlAttendanceStore({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL attendance store requires store.query");

  function write(input) {
    const record = createAttendanceRecord(input);
    return Object.freeze(
      store.query("insert", {
        table: "hrx_attendance_records",
        row: { ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      }),
    );
  }

  function get(ref = {}) {
    const value = store.query("selectOne", {
      table: "hrx_attendance_records",
      where: { tenant_id: ref.tenant_id, attendance_id: ref.attendance_id },
    });
    return value ? Object.freeze(clone(value)) : undefined;
  }

  return Object.freeze({
    write,
    get,
    importBatch(batch) {
      const imported = importAttendanceRecords(batch);
      for (const record of imported) write(record);
      return imported;
    },
    correct(ref = {}, input = {}) {
      const current = get(ref);
      if (!current) throw new Error(`Attendance record not found: ${ref.attendance_id}`);
      return write(createAttendanceCorrection(current, input));
    },
    list(query = {}) {
      const where = {};
      if (query.tenant_id) where.tenant_id = query.tenant_id;
      if (query.employee_id) where.employee_id = query.employee_id;
      if (query.attendance_id) where.attendance_id = query.attendance_id;
      if (query.status) where.status = query.status;
      if (query.work_date) where.work_date = query.work_date;
      return Object.freeze(
        store
          .query("select", { table: "hrx_attendance_records", where })
          .filter((record) => matchesAttendanceQuery(record, query))
          .sort(sortAttendanceRecords)
          .map((record) => Object.freeze(clone(record))),
      );
    },
  });
}
