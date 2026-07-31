import assert from "node:assert/strict";
import test from "node:test";
import { projectApprovedLeaveIntervals } from "../src/people-leave-intervals.js";
import { createPeopleTeamOperationsProjection } from "../src/people-team-operations.js";

const TENANT = "tenant-people-leave";

function request(requestId, state, patch = {}) {
  return {
    tenant_id: TENANT,
    request_id: requestId,
    employee_id: "emp-1",
    state,
    leave_type: "ANNUAL",
    leave_type_id: "type-annual",
    policy_id: "ANNUAL-2026",
    policy_version_id: "policy-annual-v1",
    reason_text: `private:${requestId}`,
    decision_reason: "private-decision",
    ...patch,
  };
}

function segment(requestId, date, periods) {
  return {
    tenant_id: TENANT,
    segment_id: `segment:${requestId}`,
    request_id: requestId,
    segment_date: date,
    scheduled_minutes: 480,
    requested_minutes: periods.reduce((total, period) => total + period.minutes, 0),
    timezone: "Asia/Seoul",
    schedule_profile_id: "schedule-standard",
    schedule_snapshot_hash: "private-schedule-snapshot",
    work_periods_json: JSON.stringify([{ start: "09:00", end: "18:00", minutes: 540 }]),
    leave_periods_json: JSON.stringify(periods),
  };
}

const requests = [
  request("leave-hour", "approved"),
  request("leave-half", "approved"),
  request("leave-full", "approved"),
  request("leave-pending", "submitted"),
  request("leave-rejected", "rejected"),
  request("leave-cancelled", "cancelled"),
];

const segments = [
  segment("leave-hour", "2026-07-30", [{ start: "15:00", end: "17:00", minutes: 120 }]),
  segment("leave-half", "2026-07-31", [{ start: "09:00", end: "13:00", minutes: 240 }]),
  segment("leave-full", "2026-08-03", [
    { start: "09:00", end: "12:00", minutes: 180 },
    { start: "13:00", end: "18:00", minutes: 300 },
  ]),
  segment("leave-pending", "2026-07-30", [{ start: "09:00", end: "10:00", minutes: 60 }]),
  segment("leave-rejected", "2026-07-30", [{ start: "10:00", end: "11:00", minutes: 60 }]),
  segment("leave-cancelled", "2026-07-30", [{ start: "11:00", end: "12:00", minutes: 60 }]),
];

test("approved hour, half-day, and full-day segments project exact minute intervals only", () => {
  const intervals = projectApprovedLeaveIntervals({
    tenant_id: TENANT,
    requests,
    segments,
    employee_ids: ["emp-1"],
    view: "team",
  });

  assert.equal(intervals.length, 4);
  assert.deepEqual(intervals.map(({ duration_minutes }) => duration_minutes), [120, 240, 180, 300]);
  assert.equal(intervals[0].starts_at, "2026-07-30T06:00:00.000Z");
  assert.equal(intervals[0].ends_at, "2026-07-30T08:00:00.000Z");
  assert.equal(intervals.every(({ state, title }) => state === "approved" && title === "휴가"), true);
  assert.equal(intervals.some(({ starts_at }) => starts_at.endsWith("01:00:00.000Z")), false);
});

test("team leave intervals hide request details while self projection keeps its own explanation", () => {
  const team = projectApprovedLeaveIntervals({
    tenant_id: TENANT,
    requests,
    segments,
    employee_ids: ["emp-1"],
    view: "team",
  });
  const self = projectApprovedLeaveIntervals({
    tenant_id: TENANT,
    requests,
    segments,
    employee_ids: ["emp-1"],
    view: "self",
    viewer_employee_id: "emp-1",
  });
  const serializedTeam = JSON.stringify(team);

  for (const privateValue of [
    "private:leave-hour",
    "private-decision",
    "type-annual",
    "policy-annual-v1",
    "private-schedule-snapshot",
    "request_id",
    "reason_text",
  ]) {
    assert.equal(serializedTeam.includes(privateValue), false);
  }
  assert.equal(self[0].detail.request_id, "leave-hour");
  assert.equal(self[0].detail.reason_text, "private:leave-hour");
});

test("team operations adds only the public approved-leave block to today's minute timeline", () => {
  const approvedLeave = projectApprovedLeaveIntervals({
    tenant_id: TENANT,
    requests,
    segments,
    employee_ids: ["emp-1"],
    view: "team",
  });
  const projection = createPeopleTeamOperationsProjection({
    tenant_id: TENANT,
    employees: [{
      tenant_id: TENANT,
      employee_id: "emp-1",
      display_name: "김아민",
      status: "active",
    }],
    as_of: "2026-07-30T00:30:00.000Z",
    approved_leave_intervals: approvedLeave,
  });
  const member = projection.team_members[0];

  assert.deepEqual(member.today_intervals, [{
    kind: "approved_leave",
    leave_interval_ref: approvedLeave[0].leave_interval_ref,
    title: "휴가",
    starts_at: "2026-07-30T06:00:00.000Z",
    ends_at: "2026-07-30T08:00:00.000Z",
  }]);
  assert.equal(member.approved_leave_minutes, 120);
  assert.equal(JSON.stringify(member).includes("private:"), false);
});

test("team operations clips overlapping approved leave to the half-open tenant day", () => {
  const projection = createPeopleTeamOperationsProjection({
    tenant_id: TENANT,
    employees: [{
      tenant_id: TENANT,
      employee_id: "emp-1",
      display_name: "김아민",
      status: "active",
    }],
    as_of: "2026-07-30T00:30:00.000Z",
    timezone: "Asia/Seoul",
    approved_leave_intervals: [
      {
        tenant_id: TENANT,
        employee_id: "emp-1",
        leave_interval_ref: "leave:previous-day-overlap",
        state: "approved",
        starts_at: "2026-07-29T12:50:00.000Z",
        ends_at: "2026-07-29T22:20:00.000Z",
        duration_minutes: 570,
      },
      {
        tenant_id: TENANT,
        employee_id: "emp-1",
        leave_interval_ref: "leave:midnight-end",
        state: "approved",
        starts_at: "2026-07-29T12:00:00.000Z",
        ends_at: "2026-07-29T15:00:00.000Z",
        duration_minutes: 180,
      },
      {
        tenant_id: TENANT,
        employee_id: "emp-1",
        leave_interval_ref: "leave:next-day-end",
        state: "approved",
        starts_at: "2026-07-30T14:50:00.000Z",
        ends_at: "2026-07-30T15:20:00.000Z",
        duration_minutes: 30,
      },
    ],
  });
  const member = projection.team_members[0];

  assert.deepEqual(member.today_intervals, [
    {
      kind: "approved_leave",
      leave_interval_ref: "leave:previous-day-overlap",
      title: "휴가",
      starts_at: "2026-07-29T15:00:00.000Z",
      ends_at: "2026-07-29T22:20:00.000Z",
    },
    {
      kind: "approved_leave",
      leave_interval_ref: "leave:next-day-end",
      title: "휴가",
      starts_at: "2026-07-30T14:50:00.000Z",
      ends_at: "2026-07-30T15:00:00.000Z",
    },
  ]);
  assert.equal(member.approved_leave_minutes, 450);
});
