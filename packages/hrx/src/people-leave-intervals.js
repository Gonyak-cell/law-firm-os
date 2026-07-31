import { createHash } from "node:crypto";
import { peopleLocalTimeIso } from "./people-intervals.js";

const APPROVED_STATE = "approved";
const PRIVATE_FIELDS = Object.freeze([
  "reason_text",
  "decision_reason",
  "leave_type",
  "leave_type_id",
  "policy_id",
  "policy_version_id",
  "schedule_snapshot_hash",
  "policy_rules_snapshot_hash",
  "work_periods_json",
  "leave_periods_json",
  "attachment_id",
  "document_id",
]);

function parseArray(value, field) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new TypeError(`${field} must contain valid JSON`);
    }
  }
  if (!Array.isArray(parsed)) throw new TypeError(`${field} must be an array`);
  return parsed;
}

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function intervalRef(tenantId, requestId, segmentId, index) {
  return `sha256:${createHash("sha256")
    .update(`${tenantId}:${requestId}:${segmentId}:${index}`)
    .digest("hex")}`;
}

function selfDetail(request) {
  return Object.freeze({
    request_id: request.request_id,
    leave_type_id: request.leave_type_id ?? null,
    leave_type: request.leave_type ?? null,
    reason_text: request.reason_text ?? null,
    policy_version_id: request.policy_version_id ?? null,
  });
}

function assertTeamPrivacy(intervals) {
  const serialized = JSON.stringify(intervals);
  for (const field of PRIVATE_FIELDS) {
    if (serialized.includes(`"${field}"`)) {
      throw new TypeError(`team leave projection must not include ${field}`);
    }
  }
}

export function projectApprovedLeaveIntervals({
  tenant_id,
  requests = [],
  segments = [],
  employee_ids = [],
  view = "team",
  viewer_employee_id = null,
} = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  if (!["team", "self"].includes(view)) throw new TypeError("view must be team or self");
  if (view === "self" && !viewer_employee_id) {
    throw new TypeError("viewer_employee_id is required for self leave projection");
  }
  const allowedEmployees = new Set(employee_ids);
  const approvedById = new Map(
    (Array.isArray(requests) ? requests : [])
      .filter((request) => request?.tenant_id === tenantId)
      .filter((request) => request.state === APPROVED_STATE)
      .filter((request) => allowedEmployees.size === 0 || allowedEmployees.has(request.employee_id))
      .filter((request) => view !== "self" || request.employee_id === viewer_employee_id)
      .map((request) => [request.request_id, request]),
  );
  const intervals = [];
  for (const segment of (Array.isArray(segments) ? segments : [])
    .filter((row) => row?.tenant_id === tenantId)
    .filter((row) => approvedById.has(row.request_id))
    .sort((left, right) => (
      String(left.segment_date).localeCompare(String(right.segment_date))
      || String(left.segment_id).localeCompare(String(right.segment_id))
    ))) {
    const request = approvedById.get(segment.request_id);
    const periods = parseArray(segment.leave_periods_json, "leave_periods_json");
    for (const [index, period] of periods.entries()) {
      const start = requiredText(period?.start, "leave period start");
      const end = requiredText(period?.end, "leave period end");
      const startsAt = peopleLocalTimeIso(segment.segment_date, start, segment.timezone);
      const endsAt = peopleLocalTimeIso(segment.segment_date, end, segment.timezone);
      const minutes = Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000);
      if (!Number.isInteger(minutes) || minutes <= 0 || minutes !== period.minutes) {
        throw new TypeError("leave period minutes must match its time range");
      }
      intervals.push(Object.freeze({
        tenant_id: tenantId,
        employee_id: request.employee_id,
        leave_interval_ref: intervalRef(tenantId, request.request_id, segment.segment_id, index),
        kind: "approved_leave",
        title: "휴가",
        state: APPROVED_STATE,
        starts_at: startsAt,
        ends_at: endsAt,
        duration_minutes: minutes,
        timezone: segment.timezone,
        source: "hrx_leave",
        ...(view === "self" ? { detail: selfDetail(request) } : {}),
      }));
    }
  }
  if (view === "team") assertTeamPrivacy(intervals);
  return Object.freeze(intervals);
}

export function readApprovedLeaveIntervals({
  store,
  tenant_id,
  employee_ids = [],
  view = "team",
  viewer_employee_id = null,
} = {}) {
  if (!store || typeof store.query !== "function") {
    throw new TypeError("approved leave interval reader requires store.query");
  }
  return projectApprovedLeaveIntervals({
    tenant_id,
    employee_ids,
    view,
    viewer_employee_id,
    requests: store.query("select", {
      table: "hrx_leave_requests",
      where: { tenant_id },
    }),
    segments: store.query("select", {
      table: "hrx_leave_request_segments",
      where: { tenant_id },
    }),
  });
}
