import assert from "node:assert/strict";
import test from "node:test";
import { createPeopleCapacityProjection } from "../src/people-capacity.js";

const TENANT = "tenant-capacity";
const AS_OF = "2026-07-30T09:00:00+09:00";

function employee(employeeId, displayName) {
  return {
    tenant_id: TENANT,
    employee_id: employeeId,
    display_name: displayName,
    status: "active",
  };
}

function interval(startsAt, endsAt, patch = {}) {
  return {
    kind: "outlook_calendar",
    title: "필수 참석 회의",
    starts_at: startsAt,
    ends_at: endsAt,
    ...patch,
  };
}

function leave(employeeId, startsAt, endsAt, state = "approved") {
  return {
    tenant_id: TENANT,
    employee_id: employeeId,
    leave_interval_ref: `leave:${employeeId}:${startsAt}`,
    kind: "approved_leave",
    title: "휴가",
    state,
    starts_at: startsAt,
    ends_at: endsAt,
  };
}

test("remaining time uses minute unions and does not double-count overlapping meetings or leave", () => {
  const projection = createPeopleCapacityProjection({
    tenant_id: TENANT,
    as_of: AS_OF,
    employees: [employee("emp-1", "김아민")],
    schedule_days_by_employee_id: {
      "emp-1": [{
        date: "2026-07-30",
        scheduled_minutes: 480,
        timezone: "Asia/Seoul",
        work_periods: [
          { start: "09:00", end: "12:00", minutes: 180 },
          { start: "13:00", end: "18:00", minutes: 300 },
        ],
        schedule_profile_id: "schedule-standard",
        schedule_assignment_id: "assignment-emp-1",
      }],
    },
    busy_intervals_by_employee_id: {
      "emp-1": [
        interval("2026-07-30T09:00:00+09:00", "2026-07-30T10:00:00+09:00"),
        interval("2026-07-30T09:30:00+09:00", "2026-07-30T11:00:00+09:00"),
        interval("2026-07-30T15:30:00+09:00", "2026-07-30T16:30:00+09:00"),
      ],
    },
    approved_leave_intervals: [
      leave("emp-1", "2026-07-30T15:00:00+09:00", "2026-07-30T17:00:00+09:00"),
      leave("emp-1", "2026-07-30T17:00:00+09:00", "2026-07-30T18:00:00+09:00", "submitted"),
    ],
  });
  const row = projection.rows[0];

  assert.equal(row.scheduled_minutes, 480);
  assert.equal(row.calendar_reserved_minutes, 180);
  assert.equal(row.approved_leave_minutes, 120);
  assert.equal(row.calendar_leave_overlap_minutes, 60);
  assert.equal(row.occupied_minutes, 240);
  assert.equal(row.remaining_minutes, 240);
  assert.equal(row.state, "available");
  assert.equal(row.evidence.calendar.length, 3);
  assert.equal(row.evidence.leave.length, 1);
  assert.equal(projection.ranking_included, false);
  assert.equal(projection.performance_evaluation_included, false);
});

test("capacity reports a separate planned-overrun amount instead of clamping it to zero", () => {
  const projection = createPeopleCapacityProjection({
    tenant_id: TENANT,
    as_of: AS_OF,
    employees: [employee("emp-2", "이서윤")],
    schedule_days_by_employee_id: {
      "emp-2": [{
        date: "2026-07-30",
        scheduled_minutes: 120,
        work_periods: [{ start: "09:00", end: "12:00", minutes: 180 }],
      }],
    },
    busy_intervals_by_employee_id: {
      "emp-2": [
        interval("2026-07-30T09:00:00+09:00", "2026-07-30T12:00:00+09:00"),
      ],
    },
  });
  const row = projection.rows[0];

  assert.equal(row.remaining_minutes, -60);
  assert.equal(row.overbooked_minutes, 60);
  assert.equal(row.state, "overbooked");
  assert.equal(row.label, "예정 초과");
});

test("missing or ambiguous effective work schedules stay unknown without inferred minutes", () => {
  const projection = createPeopleCapacityProjection({
    tenant_id: TENANT,
    as_of: AS_OF,
    employees: [
      employee("emp-missing", "근로시간 없음"),
      employee("emp-ambiguous", "근로시간 중복"),
    ],
    schedule_days_by_employee_id: {
      "emp-ambiguous": [
        {
          date: "2026-07-30",
          scheduled_minutes: 480,
          work_periods: [{ start: "09:00", end: "17:00", minutes: 480 }],
        },
        {
          date: "2026-07-30",
          scheduled_minutes: 420,
          work_periods: [{ start: "10:00", end: "17:00", minutes: 420 }],
        },
      ],
    },
    busy_intervals_by_employee_id: {
      "emp-missing": [
        interval("2026-07-30T09:00:00+09:00", "2026-07-30T18:00:00+09:00"),
      ],
    },
  });

  for (const row of projection.rows) {
    assert.equal(row.state, "schedule_required");
    assert.equal(row.label, "근로시간 확인 필요");
    assert.equal(row.scheduled_minutes, null);
    assert.equal(row.remaining_minutes, null);
    assert.equal(row.overbooked_minutes, null);
    assert.equal(row.evidence.schedule, null);
  }
});

test("capacity subtracts only intervals overlapping effective work periods", () => {
  const projection = createPeopleCapacityProjection({
    tenant_id: TENANT,
    as_of: AS_OF,
    employees: [employee("emp-work-period", "근무 구간 확인")],
    schedule_days_by_employee_id: {
      "emp-work-period": [{
        date: "2026-07-30",
        scheduled_minutes: 480,
        timezone: "Asia/Seoul",
        work_periods: [
          { start: "09:00", end: "12:00", minutes: 180 },
          { start: "13:00", end: "18:00", minutes: 300 },
        ],
      }],
    },
    busy_intervals_by_employee_id: {
      "emp-work-period": [
        interval("2026-07-30T07:00:00+09:00", "2026-07-30T08:00:00+09:00"),
        interval("2026-07-30T17:30:00+09:00", "2026-07-30T19:00:00+09:00"),
      ],
    },
    approved_leave_intervals: [
      leave(
        "emp-work-period",
        "2026-07-29T23:00:00+09:00",
        "2026-07-30T10:00:00+09:00",
      ),
    ],
  });
  const row = projection.rows[0];

  assert.equal(row.calendar_reserved_minutes, 30);
  assert.equal(row.approved_leave_minutes, 60);
  assert.equal(row.calendar_leave_overlap_minutes, 0);
  assert.equal(row.occupied_minutes, 90);
  assert.equal(row.remaining_minutes, 390);
  assert.deepEqual(row.evidence.calendar.map(({ starts_at }) => starts_at), [
    "2026-07-30T17:30:00+09:00",
  ]);
  assert.deepEqual(row.evidence.leave.map(({ starts_at }) => starts_at), [
    "2026-07-29T23:00:00+09:00",
  ]);
});

test("a schedule without effective work periods stays unknown instead of inferring a day range", () => {
  const projection = createPeopleCapacityProjection({
    tenant_id: TENANT,
    as_of: AS_OF,
    employees: [employee("emp-no-periods", "근무 구간 없음")],
    schedule_days_by_employee_id: {
      "emp-no-periods": [{ date: "2026-07-30", scheduled_minutes: 480 }],
    },
  });

  assert.equal(projection.rows[0].state, "schedule_required");
  assert.equal(projection.rows[0].remaining_minutes, null);
});
