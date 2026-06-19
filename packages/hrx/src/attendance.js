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
    importBatch(batch) {
      const imported = importAttendanceRecords(batch);
      for (const record of imported) write(record);
      return imported;
    },
    list(query = {}) {
      return Object.freeze(
        [...records.values()]
          .filter((record) => !query.tenant_id || record.tenant_id === query.tenant_id)
          .filter((record) => !query.employee_id || record.employee_id === query.employee_id)
          .map((record) => Object.freeze(clone(record))),
      );
    },
  });
}
