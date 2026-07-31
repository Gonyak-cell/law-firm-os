import { createHash } from "node:crypto";
import {
  createAttendanceCorrection,
  createAttendanceRecord,
  createSqlAttendanceStore,
} from "./attendance.js";

export const HRX_ATTENDANCE_CORRECTION_STATES = Object.freeze([
  "pending",
  "approved",
  "rejected",
]);

const REQUEST_TABLE = "hrx_attendance_correction_requests";
const CHANGE_FIELDS = Object.freeze([
  "status",
  "recorded_hours",
  "clock_in_at",
  "clock_out_at",
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function expectedVersion(input, field) {
  const value = input?.[field];
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

function workflowError(status, safeErrorCode, message) {
  const error = new Error(message);
  error.status = status;
  error.safe_error_code = safeErrorCode;
  return error;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function createAttendanceSourceVersion(input = {}) {
  const record = createAttendanceRecord(input);
  const material = Object.fromEntries([
    "tenant_id",
    "attendance_id",
    "employee_id",
    "work_date",
    "status",
    "source_ref",
    "source_kind",
    "import_batch_id",
    "recorded_hours",
    "clock_in_at",
    "clock_out_at",
    "correction_of_attendance_id",
    "correction_reason",
  ].map((field) => [field, record[field]]));
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(material)))
    .digest("hex")}`;
}

function normalizeChanges(source, input, requestId, reason) {
  if (!input || Array.isArray(input) || typeof input !== "object") {
    throw new TypeError("requested_changes must be an object");
  }
  const unknown = Object.keys(input).filter((field) => !CHANGE_FIELDS.includes(field));
  if (unknown.length > 0) throw new TypeError(`requested_changes contains unsupported field: ${unknown[0]}`);
  const changes = Object.fromEntries(
    CHANGE_FIELDS
      .filter((field) => Object.hasOwn(input, field))
      .map((field) => [field, input[field]]),
  );
  if (Object.keys(changes).length === 0) throw new TypeError("requested_changes must change at least one attendance field");
  const preview = createAttendanceCorrection(source, {
    ...changes,
    attendance_id: `preview:${requestId}`,
    source_ref: `AttendanceCorrectionRequest:${requestId}`,
    correction_reason: reason,
  });
  if (CHANGE_FIELDS.every((field) => !Object.hasOwn(changes, field) || preview[field] === source[field])) {
    throw new TypeError("requested_changes do not change the attendance record");
  }
  return Object.freeze(changes);
}

function projectRequest(row) {
  if (!row) return undefined;
  return Object.freeze({
    tenant_id: row.tenant_id,
    correction_request_id: row.correction_request_id,
    attendance_id: row.attendance_id,
    employee_id: row.employee_id,
    source_version: row.source_version,
    proposed_attendance_id: row.proposed_attendance_id,
    requested_changes: Object.freeze(JSON.parse(row.requested_changes_json)),
    reason: row.reason,
    evidence_ref: row.evidence_ref ?? null,
    state: row.state,
    state_version: row.state_version,
    requested_by_actor_id: row.requested_by_actor_id,
    requested_at: row.requested_at,
    reviewed_by_actor_id: row.reviewed_by_actor_id ?? null,
    reviewed_at: row.reviewed_at ?? null,
    review_reason: row.review_reason ?? null,
    approved_attendance_id: row.approved_attendance_id ?? null,
  });
}

export function createAttendanceCorrectionWorkflow({
  attendance,
  store = null,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!attendance || typeof attendance.get !== "function" || typeof attendance.list !== "function") {
    throw new TypeError("attendance correction workflow requires an attendance store");
  }
  const rows = new Map();
  const key = (tenantId, requestId) => `${tenantId}:${requestId}`;

  function listRows(query = {}) {
    const source = store
      ? store.query("select", {
          table: REQUEST_TABLE,
          where: {
            ...(query.tenant_id ? { tenant_id: query.tenant_id } : {}),
            ...(query.correction_request_id ? { correction_request_id: query.correction_request_id } : {}),
            ...(query.attendance_id ? { attendance_id: query.attendance_id } : {}),
            ...(query.employee_id ? { employee_id: query.employee_id } : {}),
            ...(query.state ? { state: query.state } : {}),
          },
        })
      : [...rows.values()]
          .filter((row) => !query.tenant_id || row.tenant_id === query.tenant_id)
          .filter((row) => !query.correction_request_id || row.correction_request_id === query.correction_request_id)
          .filter((row) => !query.attendance_id || row.attendance_id === query.attendance_id)
          .filter((row) => !query.employee_id || row.employee_id === query.employee_id)
          .filter((row) => !query.state || row.state === query.state);
    return source
      .sort((left, right) =>
        right.requested_at.localeCompare(left.requested_at)
        || left.correction_request_id.localeCompare(right.correction_request_id))
      .map(clone);
  }

  function getRow(ref = {}) {
    return listRows({
      tenant_id: ref.tenant_id,
      correction_request_id: ref.correction_request_id,
    })[0];
  }

  function sourceHasCorrection(source) {
    return attendance
      .list({ tenant_id: source.tenant_id, employee_id: source.employee_id })
      .some((record) => record.correction_of_attendance_id === source.attendance_id);
  }

  function assertCurrentSource(source, expectedSourceVersion) {
    if (!source || createAttendanceSourceVersion(source) !== expectedSourceVersion || sourceHasCorrection(source)) {
      throw workflowError(
        409,
        "HRX_ATTENDANCE_CORRECTION_SOURCE_STALE",
        "Attendance source changed after the correction request was prepared",
      );
    }
  }

  function create(context = {}, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const correctionRequestId = requiredString(input, "correction_request_id");
    const attendanceId = requiredString(input, "attendance_id");
    if (getRow({ tenant_id: tenantId, correction_request_id: correctionRequestId })) {
      throw workflowError(
        409,
        "HRX_ATTENDANCE_CORRECTION_REQUEST_EXISTS",
        "Attendance correction request already exists",
      );
    }
    const source = attendance.get({ tenant_id: tenantId, attendance_id: attendanceId });
    if (!source) {
      throw workflowError(
        404,
        "HRX_ATTENDANCE_RECORD_NOT_FOUND",
        "Attendance record was not found",
      );
    }
    const sourceVersion = createAttendanceSourceVersion(source);
    if (requiredString(input, "expected_source_version") !== sourceVersion || sourceHasCorrection(source)) {
      throw workflowError(
        409,
        "HRX_ATTENDANCE_CORRECTION_SOURCE_STALE",
        "Attendance source changed before the correction request was submitted",
      );
    }
    if (listRows({ tenant_id: tenantId, attendance_id: attendanceId, state: "pending" }).length > 0) {
      throw workflowError(
        409,
        "HRX_ATTENDANCE_CORRECTION_PENDING_EXISTS",
        "A pending correction request already exists for this attendance record",
      );
    }
    const reason = requiredString(input, "reason");
    const requestedChanges = normalizeChanges(
      source,
      input.requested_changes,
      correctionRequestId,
      reason,
    );
    const timestamp = clock();
    const row = Object.freeze({
      tenant_id: tenantId,
      correction_request_id: correctionRequestId,
      attendance_id: source.attendance_id,
      employee_id: source.employee_id,
      source_version: sourceVersion,
      proposed_attendance_id: `att-correction:${correctionRequestId}`,
      requested_changes_json: JSON.stringify(requestedChanges),
      reason,
      evidence_ref: optionalString(input, "evidence_ref"),
      state: "pending",
      state_version: 1,
      requested_by_actor_id: actorId,
      requested_at: timestamp,
      reviewed_by_actor_id: null,
      reviewed_at: null,
      review_reason: null,
      approved_attendance_id: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    if (store) {
      store.query("insert", { table: REQUEST_TABLE, row: clone(row) });
    } else {
      rows.set(key(tenantId, correctionRequestId), clone(row));
    }
    return projectRequest(row);
  }

  function decide(context = {}, ref = {}, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const correctionRequestId = requiredString(ref, "correction_request_id");
    const current = getRow({ tenant_id: tenantId, correction_request_id: correctionRequestId });
    if (!current) {
      throw workflowError(
        404,
        "HRX_ATTENDANCE_CORRECTION_REQUEST_NOT_FOUND",
        "Attendance correction request was not found",
      );
    }
    if (current.state !== "pending") {
      throw workflowError(
        409,
        "HRX_ATTENDANCE_CORRECTION_ALREADY_DECIDED",
        "Attendance correction request was already decided",
      );
    }
    const expectedStateVersion = expectedVersion(input, "expected_state_version");
    if (expectedStateVersion !== current.state_version) {
      throw workflowError(
        409,
        "HRX_ATTENDANCE_CORRECTION_VERSION_CONFLICT",
        "Attendance correction request version is stale",
      );
    }
    const subjectActorIds = new Set([
      current.employee_id,
      ...(Array.isArray(context.subject_actor_ids) ? context.subject_actor_ids : []),
    ]);
    if (current.requested_by_actor_id === actorId || subjectActorIds.has(actorId)) {
      throw workflowError(
        409,
        "HRX_ATTENDANCE_CORRECTION_SELF_APPROVAL_BLOCKED",
        "Attendance correction must be reviewed by another person",
      );
    }
    const action = requiredString(input, "action");
    if (!["approve", "reject"].includes(action)) throw new TypeError("action must be approve or reject");
    const reviewReason = requiredString(input, "review_reason");
    const timestamp = clock();
    const next = {
      ...current,
      state: action === "approve" ? "approved" : "rejected",
      state_version: current.state_version + 1,
      reviewed_by_actor_id: actorId,
      reviewed_at: timestamp,
      review_reason: reviewReason,
      approved_attendance_id: action === "approve" ? current.proposed_attendance_id : null,
      updated_at: timestamp,
    };
    let correction = null;
    if (action === "approve") {
      const source = attendance.get({
        tenant_id: tenantId,
        attendance_id: current.attendance_id,
      });
      assertCurrentSource(source, current.source_version);
      const correctionInput = {
        ...JSON.parse(current.requested_changes_json),
        attendance_id: current.proposed_attendance_id,
        source_ref: `AttendanceCorrectionRequest:${correctionRequestId}`,
        correction_reason: current.reason,
      };
      if (store) {
        store.transaction((transactionStore) => {
          const transactionAttendance = createSqlAttendanceStore({
            store: transactionStore,
            clock: () => timestamp,
          });
          correction = transactionAttendance.correct(
            { tenant_id: tenantId, attendance_id: current.attendance_id },
            correctionInput,
          );
          transactionStore.query("updateOne", {
            table: REQUEST_TABLE,
            where: { tenant_id: tenantId, correction_request_id: correctionRequestId },
            expected_version: current.state_version,
            patch: next,
          });
        });
      } else {
        const prior = clone(current);
        try {
          attendance.transaction((transactionAttendance) => {
            correction = transactionAttendance.correct(
              { tenant_id: tenantId, attendance_id: current.attendance_id },
              correctionInput,
            );
            rows.set(key(tenantId, correctionRequestId), clone(next));
          });
        } catch (error) {
          rows.set(key(tenantId, correctionRequestId), prior);
          throw error;
        }
      }
    } else if (store) {
      store.query("updateOne", {
        table: REQUEST_TABLE,
        where: { tenant_id: tenantId, correction_request_id: correctionRequestId },
        expected_version: current.state_version,
        patch: next,
      });
    } else {
      rows.set(key(tenantId, correctionRequestId), clone(next));
    }
    return Object.freeze({
      request: projectRequest(next),
      correction: correction ? createAttendanceRecord(correction) : null,
    });
  }

  return Object.freeze({
    create,
    decide,
    get(ref = {}) {
      return projectRequest(getRow(ref));
    },
    list(query = {}) {
      return Object.freeze(listRows(query).map(projectRequest));
    },
  });
}
