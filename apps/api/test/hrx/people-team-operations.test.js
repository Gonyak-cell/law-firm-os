import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import { handleHrxApiRequest } from "../../src/hrx-runtime-context.js";

const TENANT = "tenant-people-team";
const AS_OF = "2026-07-30T00:30:00.000Z";

function numberedId(prefix, index) {
  return `${prefix}-${String(index).padStart(2, "0")}`;
}

function hrxContext({
  employeeCount = 10,
  featureEnabled = true,
  employees: suppliedEmployees = null,
  employeeUserLinks: suppliedEmployeeUserLinks = null,
} = {}) {
  const employees = suppliedEmployees ?? Array.from({ length: employeeCount }, (_, offset) => {
    const index = offset + 1;
    return {
      tenant_id: TENANT,
      employee_id: numberedId("emp", index),
      display_name: `구성원 ${String(index).padStart(2, "0")}`,
      status: "active",
    };
  });
  const employeeUserLinks = suppliedEmployeeUserLinks ?? employees.map((employee, offset) => ({
      tenant_id: TENANT,
      link_id: numberedId("link", offset + 1),
      employee_id: employee.employee_id,
      user_id: numberedId("user", offset + 1),
      purpose: "login_mapping",
      source_ref: "test:people-team-operations",
    }));
  return {
    repository: createInMemoryHrxRepository({
      employees,
      employee_user_links: employeeUserLinks,
    }),
    audit: createHrxAuditEventStore(),
    clock: () => AS_OF,
    peopleTimezone: "Asia/Seoul",
    peopleFeatureFlags: {
      people_overview: featureEnabled,
      people_member_brief: false,
      outlook_calendar: false,
      people_capacity: false,
    },
  };
}

function matterRecords() {
  const records = [];
  for (let index = 1; index <= 10; index += 1) {
    const employeeId = numberedId("emp", index);
    const userId = numberedId("user", index);
    const matterId = numberedId("matter", index);
    records.push(
      {
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: matterId,
        matter_code: `L-${String(index).padStart(3, "0")}`,
        matter_name: `사건 ${index}`,
        title: `사건 ${index}`,
        status: "open",
      },
      {
        model_type: "MatterMember",
        tenant_id: TENANT,
        matter_id: matterId,
        member_id: numberedId("member", index),
        employee_id: employeeId,
        user_id: userId,
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      },
      {
        model_type: "MatterTask",
        tenant_id: TENANT,
        matter_id: matterId,
        task_id: numberedId("task", index),
        title: `시간 미정 업무 ${index}`,
        status: "todo",
        assigned_to_user_id: userId,
        estimated_minutes: index * 10,
      },
      {
        model_type: "MatterCalendarEvent",
        tenant_id: TENANT,
        matter_id: matterId,
        event_id: numberedId("hearing", index),
        title: `재판 ${index}`,
        event_kind: "court_hearing",
        status: "scheduled",
        starts_at: `2026-07-30T${String(index).padStart(2, "0")}:00:00.000Z`,
        ends_at: `2026-07-30T${String(index).padStart(2, "0")}:30:00.000Z`,
      },
    );
  }
  records.push(
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: "matter-secret",
      matter_code: "L-SECRET",
      matter_name: "숨은 사건",
      title: "숨은 사건",
      status: "open",
    },
    {
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: "matter-secret",
      member_id: "member-secret",
      employee_id: "emp-01",
      user_id: "user-01",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-secret",
      task_id: "task-secret",
      title: "숨은 업무",
      status: "todo",
      assigned_to_user_id: "user-01",
    },
  );
  return records;
}

function matterContext(records = matterRecords()) {
  return {
    repository: {
      list({ tenant_id, model_type }) {
        return records.filter((record) => record.tenant_id === tenant_id && record.model_type === model_type);
      },
    },
  };
}

function permissionContext({ denyMatterId = null, employeeRead = true } = {}) {
  return {
    principal: {
      user_id: "user-01",
      tenant_id: TENANT,
      role_ids: ["people_ops"],
    },
    rules: [
      ...(employeeRead ? [{ id: "allow-employee-read", effect: "allow", action: "hrx.employee.read" }] : []),
      { id: "allow-matter-read", effect: "allow", action: "matter:read" },
    ],
    object_acl: denyMatterId
      ? [{
          id: "deny-secret",
          effect: "deny",
          principal_id: "user-01",
          action: "matter:read",
          resource_id: denyMatterId,
        }]
      : [],
  };
}

function request({
  context = hrxContext(),
  matter = matterContext(),
  permissions = permissionContext(),
} = {}) {
  return handleHrxApiRequest({
    pathname: "/api/hrx/people/team-operations",
    method: "GET",
    context,
    matterContext: matter,
    requestContext: {
      tenant_id: TENANT,
      actor_id: "user-01",
      actor_role: "people_ops",
      hrx_scopes: ["hrx.employee.read"],
      session_bound: true,
    },
    permissionContext: permissions,
  });
}

test("team operations returns a bounded 10-member source envelope without pagination", () => {
  const result = request();
  assert.equal(result.status, 200);
  assert.equal(result.body.schema_version, "lawos.people-source-envelope.v1");
  assert.equal(result.body.state, "ok");
  assert.equal(result.body.as_of, AS_OF);
  assert.equal(result.body.data.member_count, 10);
  assert.equal(result.body.data.team_members.length, 10);
  assert.deepEqual(result.body.data.response_bounds, {
    member_limit: 25,
    truncated: false,
    pagination: false,
  });
  assert.ok(Buffer.byteLength(JSON.stringify(result.body), "utf8") < 64 * 1024);
});

test("team operations presentation never exposes identifier-shaped employee display names", () => {
  const employees = [
    {
      tenant_id: TENANT,
      employee_id: "emp-opaque-01",
      display_name: "담당 EMP-OPAQUE-01",
      status: "active",
    },
    {
      tenant_id: TENANT,
      employee_id: "emp-opaque-02",
      display_name: "담당 550e8400-e29b-41d4-a716-446655440000",
      status: "active",
    },
    {
      tenant_id: TENANT,
      employee_id: "emp-opaque-03",
      display_name: "담당 0123456789abcdef0123456789abcdef",
      status: "active",
    },
    {
      tenant_id: TENANT,
      employee_id: "emp-opaque-04",
      display_name: "담당 account9f8e7d6c5b4a",
      status: "active",
    },
  ];
  const result = request({
    context: hrxContext({
      employees,
      employeeUserLinks: employees.map((employee, index) => ({
        tenant_id: TENANT,
        link_id: `link-opaque-${index + 1}`,
        employee_id: employee.employee_id,
        user_id: `user-opaque-${index + 1}`,
        purpose: "login_mapping",
        source_ref: "test:people-team-operations-presentation",
      })),
    }),
    matter: matterContext([]),
  });

  assert.equal(result.status, 200);
  assert.deepEqual(
    result.body.data.team_members.map((row) => row.member.display_name),
    [
      "구성원 이름 확인 필요",
      "구성원 이름 확인 필요",
      "구성원 이름 확인 필요",
      "구성원 이름 확인 필요",
    ],
  );
  assert.doesNotMatch(
    JSON.stringify(result.body.data.team_members),
    /담당 EMP-OPAQUE-01|550e8400-e29b-41d4-a716-446655440000|0123456789abcdef0123456789abcdef|account9f8e7d6c5b4a/i,
  );
});

test("team member rows summarize today intervals, time-unspecified tasks, and assignments", () => {
  const first = request().body.data.team_members[0];
  assert.equal(first.member.employee_id, "emp-01");
  assert.deepEqual(first.today_intervals.map(({ kind }) => kind), ["court_hearing"]);
  assert.deepEqual(
    first.time_unspecified_tasks.map(({ scheduling_state }) => scheduling_state),
    ["unscheduled", "unscheduled"],
  );
  assert.equal(first.assigned_matter_count, 2);
  assert.equal(first.today_task_count, 2);
  assert.equal(first.today_hearing_count, 1);
});

test("team operations API clips cross-midnight Today rows and excludes exact-midnight endings", () => {
  const records = matterRecords();
  records.push(
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-01",
      task_id: "task-previous-day-overlap",
      title: "전날부터 이어진 업무",
      status: "todo",
      assigned_to_user_id: "user-01",
      starts_at: "2026-07-29T12:50:00.000Z",
      ends_at: "2026-07-29T22:20:00.000Z",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-01",
      task_id: "task-exact-midnight-end",
      title: "자정에 끝난 업무",
      status: "todo",
      assigned_to_user_id: "user-01",
      starts_at: "2026-07-29T12:00:00.000Z",
      ends_at: "2026-07-29T15:00:00.000Z",
    },
    {
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      matter_id: "matter-01",
      event_id: "hearing-previous-day-overlap",
      title: "전날부터 이어진 재판 일정",
      event_kind: "court_hearing",
      status: "scheduled",
      starts_at: "2026-07-29T14:50:00.000Z",
      ends_at: "2026-07-29T15:20:00.000Z",
    },
    {
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      matter_id: "matter-01",
      event_id: "hearing-exact-midnight-end",
      title: "자정에 끝난 재판 일정",
      event_kind: "court_hearing",
      status: "scheduled",
      starts_at: "2026-07-29T14:00:00.000Z",
      ends_at: "2026-07-29T15:00:00.000Z",
    },
  );

  const result = request({ matter: matterContext(records) });
  const rows = result.body.data.action_queues.today_tasks.rows;
  const targetRows = rows.filter(({ queue_id }) => (
    queue_id.includes("previous-day-overlap")
    || queue_id.includes("exact-midnight-end")
  ));

  assert.equal(result.status, 200);
  assert.deepEqual(targetRows, [
    {
      queue_id: "hearing:hearing-previous-day-overlap:emp-01",
      kind: "court_hearing",
      title: "전날부터 이어진 재판 일정",
      sort_at: "2026-07-29T15:00:00.000Z",
      starts_at: "2026-07-29T15:00:00.000Z",
      ends_at: "2026-07-29T15:20:00.000Z",
      due_at: null,
      employee_id: "emp-01",
      display_name: "구성원 01",
      matter_id: "matter-01",
      matter_code: "L-001",
      matter_name: "사건 1",
      destination: { view: "matters", section: "matters-list", matter_id: "matter-01" },
    },
    {
      queue_id: "task:task-previous-day-overlap",
      kind: "matter_task",
      title: "전날부터 이어진 업무",
      sort_at: "2026-07-29T15:00:00.000Z",
      starts_at: "2026-07-29T15:00:00.000Z",
      ends_at: "2026-07-29T22:20:00.000Z",
      due_at: null,
      employee_id: "emp-01",
      display_name: "구성원 01",
      matter_id: "matter-01",
      matter_code: "L-001",
      matter_name: "사건 1",
      destination: { view: "matters", section: "matters-list", matter_id: "matter-01" },
    },
  ]);
});

test("team workload and task counts remain unknown for missing, ambiguous, and revoked login links", () => {
  const context = hrxContext({
    employeeCount: 3,
    employeeUserLinks: [
      {
        tenant_id: TENANT,
        link_id: "link-ambiguous-a",
        employee_id: "emp-02",
        user_id: "user-ambiguous-a",
        purpose: "login_mapping",
      },
      {
        tenant_id: TENANT,
        link_id: "link-ambiguous-b",
        employee_id: "emp-02",
        user_id: "user-ambiguous-b",
        purpose: "login_mapping",
      },
      {
        tenant_id: TENANT,
        link_id: "link-revoked",
        employee_id: "emp-03",
        user_id: "user-revoked",
        purpose: "login_mapping",
      },
    ],
  });
  context.repository.revokeEmployeeUserLink({
    tenant_id: TENANT,
    link_id: "link-revoked",
  });
  const result = request({ context });
  const repeated = request({ context });
  assert.equal(result.status, 200);
  assert.equal(repeated.status, 200);
  assert.equal(repeated.body.data.result_hash, result.body.data.result_hash);
  assert.equal(result.body.state, "partial");
  assert.equal(
    result.body.source_status.find(({ source }) => source === "identity_link")?.safe_error_code,
    "PEOPLE_IDENTITY_LINK_REQUIRED",
  );
  for (const member of result.body.data.team_members) {
    assert.equal(member.today_task_count, null);
    assert.equal(member.time_unspecified_tasks, null);
    assert.equal(
      member.confirmation_items.some(({ kind }) => kind === "employee_user_link_confirmation_required"),
      true,
    );
  }
  for (const row of result.body.data.workload_stage1.rows) {
    assert.equal(row.workload_source_state, "identity_link_required");
    assert.equal(row.confirmed_minutes, null);
    assert.equal(row.time_unspecified_estimated_minutes, null);
    assert.equal(row.no_estimate_task_count, null);
  }
  assert.equal(result.body.data.action_queues.today_tasks.count, null);
  assert.equal(result.body.data.action_queues.today_tasks.source_state, "identity_link_required");
  const serialized = JSON.stringify(result.body);
  assert.equal(serialized.includes("user-ambiguous-a"), false);
  assert.equal(serialized.includes("user-ambiguous-b"), false);
  assert.equal(serialized.includes("user-revoked"), false);
});

test("a start-only task appears once as needs-time and never enters the interval timeline", () => {
  const records = matterRecords().filter((row) => (
    row.model_type !== "MatterTask"
    || row.matter_id !== "matter-01"
  ));
  records.push({
    model_type: "MatterTask",
    tenant_id: TENANT,
    matter_id: "matter-01",
    task_id: "task-needs-end",
    title: "종료 시간 확인 업무",
    status: "todo",
    assigned_to_user_id: "user-01",
    starts_at: "2026-07-30T02:00:00.000Z",
    estimated_minutes: 35,
  });
  const result = request({
    context: hrxContext({ employeeCount: 1 }),
    matter: matterContext(records),
    permissions: permissionContext({ denyMatterId: "matter-secret" }),
  });
  assert.equal(result.status, 200);
  const member = result.body.data.team_members[0];
  assert.equal(member.today_intervals.some(({ task_id }) => task_id === "task-needs-end"), false);
  assert.deepEqual(
    member.time_unspecified_tasks.filter(({ task_id }) => task_id === "task-needs-end"),
    [{
      task_id: "task-needs-end",
      matter_id: "matter-01",
      matter_code: "L-001",
      title: "종료 시간 확인 업무",
      starts_at: "2026-07-30T02:00:00.000Z",
      ends_at: null,
      due_at: null,
      estimated_minutes: 35,
      scheduling_state: "needs_end_time",
    }],
  );
  assert.equal(member.today_task_count, 1);
  assert.equal(result.body.data.workload_stage1.rows[0].confirmed_minutes, 0);
  assert.equal(result.body.data.workload_stage1.rows[0].time_unspecified_estimated_minutes, 35);
});

test("identical as_of and sources produce an identical team projection and hash", () => {
  const first = request().body.data;
  const second = request().body.data;
  assert.deepEqual(first, second);
  assert.match(first.result_hash, /^sha256:/);
});

test("denied Matters do not affect team rows, counts, or serialized output", () => {
  const result = request({
    permissions: permissionContext({ denyMatterId: "matter-secret" }),
  });
  const first = result.body.data.team_members[0];
  const serialized = JSON.stringify(result.body);
  assert.equal(first.assigned_matter_count, 1);
  assert.equal(first.today_task_count, 1);
  assert.equal(serialized.includes("matter-secret"), false);
  assert.equal(serialized.includes("숨은"), false);
  assert.equal(Object.hasOwn(result.body.data, "omitted_count"), false);
});

test("partial Matter source preserves roster but leaves operational values unknown", () => {
  const result = request({ matter: null });
  assert.equal(result.status, 200);
  assert.equal(result.body.state, "partial");
  assert.equal(result.body.data.member_count, 10);
  assert.equal(result.body.data.team_members[0].today_intervals, null);
  assert.equal(result.body.data.team_members[0].time_unspecified_tasks, null);
  assert.equal(result.body.data.team_members[0].assigned_matter_count, null);
  assert.equal(result.body.source_status[1].safe_error_code, "PEOPLE_MATTER_SOURCE_UNAVAILABLE");
});

test("team operations rejects a roster above its documented small-team bound", () => {
  const result = request({ context: hrxContext({ employeeCount: 26 }) });
  assert.equal(result.status, 422);
  assert.equal(result.body.safe_error_code, "PEOPLE_TEAM_SIZE_LIMIT_EXCEEDED");
});

test("team operations denies employee read permission without returning a roster", () => {
  const result = request({
    permissions: permissionContext({ employeeRead: false }),
  });
  assert.equal(result.status, 403);
  assert.equal(result.body.safe_error_code, "PEOPLE_TEAM_OPERATIONS_READ_DENIED");
  assert.equal(JSON.stringify(result.body).includes("구성원 01"), false);
});

test("people_overview flag independently disables the team endpoint", () => {
  const result = request({ context: hrxContext({ featureEnabled: false }) });
  assert.equal(result.status, 404);
  assert.equal(result.body.safe_error_code, "PEOPLE_OVERVIEW_DISABLED");
});

test("leave projection flag adds only approved public intervals to the team envelope", () => {
  const context = hrxContext({ employeeCount: 1 });
  context.peopleFeatureFlags.leave_projection = true;
  context.peopleFeatureFlags.people_capacity = true;
  const rowsByTable = {
    hrx_leave_requests: [
      {
        tenant_id: TENANT,
        request_id: "leave-approved-private",
        employee_id: "emp-01",
        state: "approved",
        leave_type_id: "type-private",
        reason_text: "private family reason",
      },
      {
        tenant_id: TENANT,
        request_id: "leave-pending-private",
        employee_id: "emp-01",
        state: "submitted",
        reason_text: "private pending reason",
      },
    ],
    hrx_leave_request_segments: [
      {
        tenant_id: TENANT,
        segment_id: "segment-approved",
        request_id: "leave-approved-private",
        segment_date: "2026-07-30",
        requested_minutes: 120,
        timezone: "Asia/Seoul",
        leave_periods_json: JSON.stringify([
          { start: "15:00", end: "17:00", minutes: 120 },
        ]),
      },
      {
        tenant_id: TENANT,
        segment_id: "segment-pending",
        request_id: "leave-pending-private",
        segment_date: "2026-07-30",
        requested_minutes: 60,
        timezone: "Asia/Seoul",
        leave_periods_json: JSON.stringify([
          { start: "09:00", end: "10:00", minutes: 60 },
        ]),
      },
    ],
    hrx_work_schedule_profiles: [{
      tenant_id: TENANT,
      schedule_profile_id: "schedule-standard",
      display_name: "표준 근무",
      timezone: "Asia/Seoul",
      weekly_schedule_json: JSON.stringify({
        4: [
          { start: "09:00", end: "12:00" },
          { start: "13:00", end: "18:00" },
        ],
      }),
      effective_from: "2026-01-01",
      effective_to: null,
      state_version: 1,
    }],
    hrx_work_schedule_assignments: [{
      tenant_id: TENANT,
      schedule_assignment_id: "schedule-assignment-emp-01",
      schedule_profile_id: "schedule-standard",
      employee_id: "emp-01",
      organization_id: null,
      priority: 100,
      effective_from: "2026-01-01",
      effective_to: null,
    }],
  };
  context.leaveManagementStore = {
    query(operation, { table, where }) {
      assert.equal(["select", "selectOne"].includes(operation), true);
      const matches = (rowsByTable[table] ?? []).filter((row) =>
        Object.entries(where).every(([key, value]) => row[key] === value)
      );
      return operation === "selectOne" ? matches[0] ?? null : matches;
    },
  };

  const result = request({ context });
  const member = result.body.data.team_members[0];
  const leaveStatus = result.body.source_status.find(({ source }) => source === "leave");
  const serialized = JSON.stringify(result.body);

  assert.equal(result.status, 200);
  assert.equal(leaveStatus.state, "ok");
  assert.deepEqual(member.today_intervals.map(({ kind }) => kind), [
    "court_hearing",
    "approved_leave",
  ]);
  assert.equal(member.approved_leave_minutes, 120);
  assert.equal(result.body.data.people_capacity.rows[0].scheduled_minutes, 480);
  assert.equal(result.body.data.people_capacity.rows[0].calendar_reserved_minutes, 30);
  assert.equal(result.body.data.people_capacity.rows[0].approved_leave_minutes, 120);
  assert.equal(result.body.data.people_capacity.rows[0].remaining_minutes, 330);
  assert.equal(serialized.includes("private family reason"), false);
  assert.equal(serialized.includes("private pending reason"), false);
  assert.equal(serialized.includes("type-private"), false);
  assert.equal(serialized.includes("leave-approved-private"), false);
});
