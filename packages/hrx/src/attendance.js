export const HRX_ATTENDANCE_STATUSES = Object.freeze(["present", "absent", "remote", "leave", "holiday"]);
export const HRX_ATTENDANCE_TIMEZONE = "Asia/Seoul";

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

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function isoDate(input, field) {
  const value = requiredString(input, field);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return value;
}

function optionalTimestamp(input, field) {
  const value = optionalString(input, field);
  if (value === null) return null;
  if (
    !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(`${field} must be an ISO timestamp with an explicit timezone`);
  }
  return value;
}

function dateKeyInTimezone(timestamp, timeZone = HRX_ATTENDANCE_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
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
  const workDate = isoDate(input, "work_date");
  const clockInAt = optionalTimestamp(input, "clock_in_at");
  const clockOutAt = optionalTimestamp(input, "clock_out_at");
  if (Boolean(clockInAt) !== Boolean(clockOutAt)) {
    throw new TypeError("clock_in_at and clock_out_at must be recorded together");
  }
  if (clockInAt && clockOutAt) {
    if (Date.parse(clockOutAt) <= Date.parse(clockInAt)) {
      throw new TypeError("clock_out_at must be after clock_in_at");
    }
    if (dateKeyInTimezone(clockInAt) !== workDate) {
      throw new TypeError(`clock_in_at must fall on work_date in ${HRX_ATTENDANCE_TIMEZONE}`);
    }
  }
  const correctionOfAttendanceId = optionalString(input, "correction_of_attendance_id");
  const correctionReason = optionalString(input, "correction_reason");
  if (correctionOfAttendanceId && !correctionReason) {
    throw new TypeError("correction_reason is required for attendance corrections");
  }
  const attendanceId = requiredString(input, "attendance_id");
  if (correctionOfAttendanceId === attendanceId) {
    throw new TypeError("attendance correction cannot reference itself");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    attendance_id: attendanceId,
    employee_id: requiredString(input, "employee_id"),
    work_date: workDate,
    status,
    source_ref: requiredString(input, "source_ref"),
    source_kind: sourceKind,
    import_batch_id: input.import_batch_id ?? null,
    recorded_hours: optionalHours(input, "recorded_hours"),
    clock_in_at: clockInAt,
    clock_out_at: clockOutAt,
    correction_of_attendance_id: correctionOfAttendanceId,
    correction_reason: correctionReason,
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

export function resolveEffectiveAttendanceRecords(records = []) {
  const normalized = records.map(createAttendanceRecord);
  const correctedIds = new Set(
    normalized
      .map((record) => record.correction_of_attendance_id)
      .filter(Boolean),
  );
  return Object.freeze(
    normalized
      .filter((record) => !correctedIds.has(record.attendance_id))
      .sort(sortAttendanceRecords),
  );
}

export function createInMemoryAttendanceStore(seed = []) {
  const records = new Map();
  const key = (tenantId, attendanceId) => `${tenantId}:${attendanceId}`;

  function write(input) {
    const record = createAttendanceRecord(input);
    const recordKey = key(record.tenant_id, record.attendance_id);
    if (records.has(recordKey)) throw new Error(`Attendance record already exists: ${record.attendance_id}`);
    if (
      record.correction_of_attendance_id &&
      [...records.values()].some((candidate) =>
        candidate.tenant_id === record.tenant_id &&
        candidate.correction_of_attendance_id === record.correction_of_attendance_id)
    ) {
      throw new Error(`Attendance record already corrected: ${record.correction_of_attendance_id}`);
    }
    records.set(recordKey, clone(record));
    return Object.freeze(clone(record));
  }

  for (const record of seed) write(record);

  const api = Object.freeze({
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
    transaction(callback) {
      if (typeof callback !== "function") throw new TypeError("attendance transaction callback is required");
      const snapshot = new Map(
        [...records].map(([recordKey, record]) => [recordKey, clone(record)]),
      );
      try {
        return callback(api);
      } catch (error) {
        records.clear();
        for (const [recordKey, record] of snapshot) records.set(recordKey, clone(record));
        throw error;
      }
    },
  });
  return api;
}

export function createSqlAttendanceStore({ store, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL attendance store requires store.query");

  function write(input) {
    const record = createAttendanceRecord(input);
    const timestamp = clock();
    return Object.freeze(
      store.query("insert", {
        table: "hrx_attendance_records",
        row: { ...record, created_at: timestamp, updated_at: timestamp },
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
      const existingCorrection = store.query("selectOne", {
        table: "hrx_attendance_records",
        where: {
          tenant_id: current.tenant_id,
          correction_of_attendance_id: current.attendance_id,
        },
      });
      if (existingCorrection) throw new Error(`Attendance record already corrected: ${current.attendance_id}`);
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
