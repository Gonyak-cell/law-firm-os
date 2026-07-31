import assert from "node:assert/strict";
import test from "node:test";
import { createPeopleActionQueues } from "../src/people-action-queues.js";

const TENANT = "tenant-queues";
const AS_OF = "2026-07-30T00:30:00.000Z";
const employees = [
  { tenant_id: TENANT, employee_id: "emp-1", display_name: "김변호사", status: "active" },
  { tenant_id: TENANT, employee_id: "emp-2", display_name: "이변호사", status: "active" },
];
const matters = ["matter-1", "matter-2", "matter-3"].map((matterId, index) => ({
  tenant_id: TENANT,
  matter_id: matterId,
  matter_code: `L-00${index + 1}`,
  matter_name: `사건 ${index + 1}`,
}));

test("four People action queues use evidence rows and exact badge counts", () => {
  const projection = createPeopleActionQueues({
    tenant_id: TENANT,
    as_of: AS_OF,
    employees,
    user_id_by_employee_id: { "emp-1": "user-1", "emp-2": "user-2" },
    visible_matters: matters,
    assignments: [
      { tenant_id: TENANT, matter_id: "matter-1", member_id: "member-1", employee_id: "emp-1", role: "responsible_attorney", status: "active", valid_from: "2026-07-01T00:00:00.000Z", identity_resolution_state: "resolved" },
      { tenant_id: TENANT, matter_id: "matter-3", member_id: "member-3", employee_id: "emp-2", role: "responsible_attorney", status: "active", valid_from: "2026-07-01T00:00:00.000Z", valid_to: "2026-08-02T00:00:00.000Z", identity_resolution_state: "resolved" },
    ],
    tasks: [
      { tenant_id: TENANT, matter_id: "matter-1", task_id: "task-time", title: "오늘 서면", status: "todo", assigned_to_user_id: "user-1", starts_at: "2026-07-30T01:00:00.000Z", ends_at: "2026-07-30T01:20:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-1", task_id: "task-due", title: "오늘 제출", status: "todo", assigned_to_user_id: "user-1", due_at: "2026-07-30" },
      { tenant_id: TENANT, matter_id: "matter-1", task_id: "task-unscheduled", title: "일정 없는 업무", status: "todo", assigned_to_user_id: "user-1" },
      { tenant_id: TENANT, matter_id: "matter-1", task_id: "task-done", title: "완료 업무", status: "done", assigned_to_user_id: "user-1", due_at: "2026-07-30" },
    ],
    events: [
      { tenant_id: TENANT, matter_id: "matter-1", event_id: "hearing-1", title: "변론기일", event_kind: "court_hearing", status: "scheduled", starts_at: "2026-07-30T05:00:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-2", event_id: "deadline-2", title: "답변기한", event_kind: "deadline", status: "scheduled", starts_at: "2026-08-01T05:00:00.000Z" },
    ],
    time_entries: [
      { tenant_id: TENANT, time_entry_id: "time-1", employee_id: "emp-1", matter_id: "matter-1", work_date: "2026-07-30", confirmation_state: "needs_review" },
    ],
  });

  assert.deepEqual(
    Object.fromEntries(Object.entries(projection).filter(([, value]) => value?.rows).map(([key, value]) => [key, value.count])),
    {
      today_tasks: 3,
      assignee_required: 1,
      handoff_confirmation: 1,
      time_record_confirmation: 1,
    },
  );
  for (const value of Object.values(projection).filter((candidate) => candidate?.rows)) {
    assert.equal(value.count, value.rows.length);
  }
  assert.equal(projection.today_tasks.rows.some(({ queue_id }) => queue_id.includes("task-unscheduled")), false);
  assert.equal(projection.today_tasks.rows.some(({ queue_id }) => queue_id.includes("task-done")), false);
  assert.deepEqual(projection.assignee_required.rows[0].destination, {
    view: "matters",
    section: "matters-list",
    matter_id: "matter-2",
  });
});

test("queues cannot expose Matters removed by the permission intersection", () => {
  const projection = createPeopleActionQueues({
    tenant_id: TENANT,
    as_of: AS_OF,
    employees,
    user_id_by_employee_id: { "emp-1": "user-1" },
    visible_matters: matters.slice(0, 1),
    assignments: [],
    tasks: [
      { tenant_id: TENANT, matter_id: "matter-secret", task_id: "task-secret", title: "숨은 업무", status: "todo", assigned_to_user_id: "user-1", due_at: "2026-07-30" },
    ],
    events: [
      { tenant_id: TENANT, matter_id: "matter-secret", event_id: "event-secret", title: "숨은 기한", event_kind: "deadline", status: "scheduled", starts_at: "2026-07-31T00:00:00.000Z" },
    ],
  });
  assert.equal(JSON.stringify(projection).includes("secret"), false);
  assert.equal(Object.hasOwn(projection, "omitted_count"), false);
});

test("today task count remains unknown while an employee login link is unresolved", () => {
  const projection = createPeopleActionQueues({
    tenant_id: TENANT,
    as_of: AS_OF,
    employees: employees.slice(0, 1),
    user_id_by_employee_id: {},
    identity_state_by_employee_id: { "emp-1": "missing" },
    visible_matters: matters,
  });

  assert.equal(projection.today_tasks.count, null);
  assert.equal(projection.today_tasks.source_state, "identity_link_required");
  assert.deepEqual(projection.today_tasks.rows, []);
  assert.equal(projection.assignee_required.count, 0);
});

test("today and future queues resolve assignment validity at each event timestamp", () => {
  const projection = createPeopleActionQueues({
    tenant_id: TENANT,
    as_of: "2026-07-30T00:30:00.000Z",
    timezone: "Asia/Seoul",
    employees,
    visible_matters: matters,
    assignments: [
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        member_id: "member-current",
        employee_id: "emp-1",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        valid_to: "2026-07-30T04:59:59.999Z",
        identity_resolution_state: "resolved",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        member_id: "member-successor",
        employee_id: "emp-2",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-30T05:00:00.000Z",
        identity_resolution_state: "resolved",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-3",
        member_id: "member-boundary",
        employee_id: "emp-2",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-08-02T01:00:00.000Z",
        valid_to: "2026-08-02T01:00:00.000Z",
        identity_resolution_state: "resolved",
      },
    ],
    events: [
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        event_id: "today-after-handoff",
        title: "오늘 인계 시각 재판",
        event_kind: "court_hearing",
        status: "scheduled",
        starts_at: "2026-07-30T05:00:00.000Z",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-2",
        event_id: "today-gap",
        title: "오늘 담당 공백 재판",
        event_kind: "court_hearing",
        status: "scheduled",
        starts_at: "2026-07-30T06:00:00.000Z",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        event_id: "future-successor",
        title: "후임 지정 기한",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-01T01:00:00.000Z",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-2",
        event_id: "future-gap",
        title: "담당 공백 기한",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-01T10:00:00+09:00",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-3",
        event_id: "future-boundary",
        title: "동일시각 경계 기한",
        event_kind: "deadline",
        status: "scheduled",
        starts_at: "2026-08-02T10:00:00+09:00",
      },
    ],
  });

  assert.deepEqual(
    projection.today_tasks.rows
      .filter(({ kind }) => kind === "court_hearing")
      .map(({ queue_id, employee_id }) => ({ queue_id, employee_id })),
    [{ queue_id: "hearing:today-after-handoff:emp-2", employee_id: "emp-2" }],
  );
  assert.deepEqual(
    projection.assignee_required.rows.map(({ queue_id }) => queue_id),
    ["assignee:today-gap", "assignee:future-gap"],
  );
});

test("today queue uses half-open tenant-day overlap for cross-midnight tasks and schedules", () => {
  const projection = createPeopleActionQueues({
    tenant_id: TENANT,
    as_of: AS_OF,
    timezone: "Asia/Seoul",
    employees: employees.slice(0, 1),
    user_id_by_employee_id: { "emp-1": "user-1" },
    identity_state_by_employee_id: { "emp-1": "resolved" },
    visible_matters: matters.slice(0, 1),
    assignments: [{
      tenant_id: TENANT,
      matter_id: "matter-1",
      member_id: "member-1",
      employee_id: "emp-1",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    }],
    tasks: [
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        task_id: "task-overlap",
        title: "전날부터 이어진 업무",
        status: "todo",
        assigned_to_user_id: "user-1",
        starts_at: "2026-07-29T12:50:00.000Z",
        ends_at: "2026-07-29T22:20:00.000Z",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        task_id: "task-midnight-end",
        title: "자정에 끝난 업무",
        status: "todo",
        assigned_to_user_id: "user-1",
        starts_at: "2026-07-29T12:00:00.000Z",
        ends_at: "2026-07-29T15:00:00.000Z",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        task_id: "task-next-day",
        title: "다음 날 업무",
        status: "todo",
        assigned_to_user_id: "user-1",
        starts_at: "2026-07-30T15:00:00.000Z",
        ends_at: "2026-07-30T15:20:00.000Z",
      },
    ],
    events: [
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        event_id: "hearing-overlap",
        title: "전날부터 이어진 재판 일정",
        event_kind: "court_hearing",
        status: "scheduled",
        starts_at: "2026-07-29T14:50:00.000Z",
        ends_at: "2026-07-29T15:20:00.000Z",
      },
      {
        tenant_id: TENANT,
        matter_id: "matter-1",
        event_id: "hearing-midnight-end",
        title: "자정에 끝난 재판 일정",
        event_kind: "court_hearing",
        status: "scheduled",
        starts_at: "2026-07-29T14:00:00.000Z",
        ends_at: "2026-07-29T15:00:00.000Z",
      },
    ],
    outlook_required_meetings_by_employee_id: {
      "emp-1": [
        {
          calendar_event_ref: "meeting-overlap",
          title: "전날부터 이어진 필수 회의",
          starts_at: "2026-07-29T14:50:00.000Z",
          ends_at: "2026-07-29T16:00:00.000Z",
        },
        {
          calendar_event_ref: "meeting-midnight-end",
          title: "자정에 끝난 필수 회의",
          starts_at: "2026-07-29T14:00:00.000Z",
          ends_at: "2026-07-29T15:00:00.000Z",
        },
      ],
    },
  });

  assert.deepEqual(
    projection.today_tasks.rows.map(({
      queue_id,
      sort_at,
      starts_at,
      ends_at,
    }) => ({
      queue_id,
      sort_at,
      starts_at,
      ends_at,
    })),
    [
      {
        queue_id: "hearing:hearing-overlap:emp-1",
        sort_at: "2026-07-29T15:00:00.000Z",
        starts_at: "2026-07-29T15:00:00.000Z",
        ends_at: "2026-07-29T15:20:00.000Z",
      },
      {
        queue_id: "outlook:meeting-overlap",
        sort_at: "2026-07-29T15:00:00.000Z",
        starts_at: "2026-07-29T15:00:00.000Z",
        ends_at: "2026-07-29T16:00:00.000Z",
      },
      {
        queue_id: "task:task-overlap",
        sort_at: "2026-07-29T15:00:00.000Z",
        starts_at: "2026-07-29T15:00:00.000Z",
        ends_at: "2026-07-29T22:20:00.000Z",
      },
    ],
  );
});
