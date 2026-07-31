import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import { handleHrxApiRequest } from "../../src/hrx-runtime-context.js";

const TENANT = "tenant-people-daily";
const AS_OF = "2026-07-30T00:30:00.000Z";

const DEFAULT_EMPLOYEE_USER_LINKS = Object.freeze([
  Object.freeze({
    tenant_id: TENANT,
    link_id: "link-target",
    employee_id: "emp-target",
    user_id: "user-target",
    purpose: "login_mapping",
    source_ref: "test:people-daily-brief",
  }),
  Object.freeze({
    tenant_id: TENANT,
    link_id: "link-other",
    employee_id: "emp-other",
    user_id: "user-other",
    purpose: "login_mapping",
    source_ref: "test:people-daily-brief",
  }),
]);

function hrxContext({
  featureEnabled = true,
  employeeUserLinks = DEFAULT_EMPLOYEE_USER_LINKS,
  asOf = AS_OF,
  targetDisplayName = "김변호사",
} = {}) {
  const repository = createInMemoryHrxRepository({
    employees: [
      { tenant_id: TENANT, employee_id: "emp-target", display_name: targetDisplayName, status: "active" },
      { tenant_id: TENANT, employee_id: "emp-other", display_name: "이변호사", status: "active" },
    ],
  });
  const links = structuredClone(employeeUserLinks);
  return {
    repository: {
      ...repository,
      listEmployeeUserLinks(query) {
        return links
          .filter((link) => link.tenant_id === query.tenant_id)
          .filter((link) => !query.employee_id || link.employee_id === query.employee_id)
          .filter((link) => !query.user_id || link.user_id === query.user_id)
          .map((link) => structuredClone(link));
      },
    },
    audit: createHrxAuditEventStore(),
    clock: () => asOf,
    peopleTimezone: "Asia/Seoul",
    peopleFeatureFlags: {
      people_overview: false,
      people_member_brief: featureEnabled,
      outlook_calendar: false,
      people_capacity: false,
    },
  };
}

test("member daily brief presentation fails closed when a display name contains its employee ID", () => {
  const result = request({
    context: hrxContext({ targetDisplayName: "담당 EMP-TARGET" }),
    matter: matterContext([]),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.data.member.display_name, "구성원 이름 확인 필요");
  assert.doesNotMatch(JSON.stringify(result.body), /담당 EMP-TARGET/i);
});

function records() {
  return [
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: "matter-a",
      matter_code: "L-001",
      matter_name: "민사 본안",
      title: "민사 본안",
      status: "open",
    },
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: "matter-secret",
      matter_code: "L-SECRET",
      matter_name: "보이지 않아야 하는 사건",
      title: "보이지 않아야 하는 사건",
      status: "open",
    },
    {
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: "matter-a",
      member_id: "member-a",
      employee_id: "emp-target",
      user_id: "user-target",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    },
    {
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: "matter-secret",
      member_id: "member-secret",
      employee_id: "emp-target",
      user_id: "user-target",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-a",
      task_id: "task-timed",
      title: "오늘 준비서면",
      status: "todo",
      assigned_to_user_id: "user-target",
      starts_at: "2026-07-30T01:00:00.000Z",
      ends_at: "2026-07-30T01:20:00.000Z",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-a",
      task_id: "task-due",
      title: "오늘 제출",
      status: "todo",
      assigned_to_user_id: "user-target",
      due_at: "2026-07-30",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-a",
      task_id: "task-unscheduled",
      title: "시간 확인 필요",
      status: "todo",
      assigned_to_user_id: "user-target",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-a",
      task_id: "task-other",
      title: "다른 구성원 업무",
      status: "todo",
      assigned_to_user_id: "user-other",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-a",
      task_id: "task-done",
      title: "완료 업무",
      status: "done",
      assigned_to_user_id: "user-target",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-secret",
      task_id: "task-secret",
      title: "비밀 사건 업무",
      status: "todo",
      assigned_to_user_id: "user-target",
    },
    {
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      matter_id: "matter-a",
      event_id: "hearing-today",
      title: "변론기일",
      event_kind: "court_hearing",
      status: "scheduled",
      starts_at: "2026-07-30T05:00:00.000Z",
      ends_at: "2026-07-30T05:30:00.000Z",
    },
    {
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      matter_id: "matter-a",
      event_id: "deadline-next",
      title: "상고기한",
      event_kind: "deadline",
      status: "scheduled",
      starts_at: "2026-08-01T09:00:00.000Z",
    },
    {
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      matter_id: "matter-a",
      event_id: "unknown-today",
      title: "참고 일정",
      event_kind: "unknown",
      status: "scheduled",
      starts_at: "2026-07-30T06:00:00.000Z",
    },
    {
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      matter_id: "matter-secret",
      event_id: "hearing-secret",
      title: "비밀 재판",
      event_kind: "court_hearing",
      status: "scheduled",
      starts_at: "2026-07-30T07:00:00.000Z",
    },
  ];
}

function matterContext(sourceRecords = records()) {
  return {
    repository: {
      list({ tenant_id, model_type }) {
        return sourceRecords.filter((record) => record.tenant_id === tenant_id && record.model_type === model_type);
      },
    },
  };
}

function permissionContext({ denyMatterId = null } = {}) {
  return {
    principal: {
      user_id: "user-target",
      tenant_id: TENANT,
      role_ids: ["attorney"],
    },
    rules: [
      { id: "allow-employee-read", effect: "allow", action: "hrx.employee.read" },
      { id: "allow-matter-read", effect: "allow", action: "matter:read" },
    ],
    object_acl: denyMatterId
      ? [{
          id: "deny-ethical-wall",
          effect: "deny",
          principal_id: "user-target",
          action: "matter:read",
          resource_id: denyMatterId,
        }]
      : [],
  };
}

function request({
  pathname = "/api/hrx/people/members/emp-target/daily-brief",
  context = hrxContext(),
  matter = matterContext(),
  actorId = "user-target",
  actorRole = "staff",
  permissions = permissionContext(),
} = {}) {
  return handleHrxApiRequest({
    pathname,
    method: "GET",
    context,
    matterContext: matter,
    requestContext: {
      tenant_id: TENANT,
      actor_id: actorId,
      actor_role: actorRole,
      hrx_scopes: ["hrx.employee.read"],
      session_bound: true,
    },
    permissionContext: permissions,
  });
}

test("daily brief returns the versioned source envelope and target member", () => {
  const result = request();
  assert.equal(result.status, 200);
  assert.equal(result.body.schema_version, "lawos.people-source-envelope.v1");
  assert.equal(result.body.state, "ok");
  assert.equal(result.body.as_of, AS_OF);
  assert.equal(result.body.timezone, "Asia/Seoul");
  assert.deepEqual(result.body.source_status.map(({ source, state }) => [source, state]), [
    ["hrx", "ok"],
    ["matter", "ok"],
  ]);
  assert.equal(result.body.data.member.employee_id, "emp-target");
  assert.equal(result.body.data.date, "2026-07-30");
});

test("daily brief includes only explicit open target tasks and current assigned hearings", () => {
  const data = request({
    permissions: permissionContext({ denyMatterId: "matter-secret" }),
  }).body.data;
  assert.deepEqual(data.tasks.time_bound.map(({ task_id }) => task_id), ["task-timed"]);
  assert.deepEqual(data.tasks.due_only.map(({ task_id }) => task_id), ["task-due"]);
  assert.deepEqual(data.tasks.unscheduled.map(({ task_id }) => task_id), ["task-unscheduled"]);
  assert.deepEqual(data.hearings.map(({ event_id }) => event_id), ["hearing-today"]);
  assert.deepEqual(
    data.confirmation_items.map(({ kind }) => kind),
    ["task_time_confirmation_required"],
  );
});

test("daily brief assigns a same-day hearing at the hearing timestamp, not request time", () => {
  const handoffRecords = records().filter((row) => (
    row.model_type !== "MatterMember"
    || row.matter_id !== "matter-a"
  ));
  handoffRecords.push(
    {
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: "matter-a",
      member_id: "member-old",
      employee_id: "emp-target",
      user_id: "user-target",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      valid_to: "2026-07-30T04:59:59.999Z",
      identity_resolution_state: "resolved",
    },
    {
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: "matter-a",
      member_id: "member-successor",
      employee_id: "emp-other",
      user_id: "user-other",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-30T05:00:00.000Z",
      identity_resolution_state: "resolved",
    },
  );
  const old = request({
    matter: matterContext(handoffRecords),
    actorRole: "people_ops",
    permissions: permissionContext({ denyMatterId: "matter-secret" }),
  });
  const successor = request({
    pathname: "/api/hrx/people/members/emp-other/daily-brief",
    matter: matterContext(handoffRecords),
    actorRole: "people_ops",
    permissions: permissionContext({ denyMatterId: "matter-secret" }),
  });
  assert.equal(old.status, 200);
  assert.equal(successor.status, 200);
  assert.deepEqual(old.body.data.hearings, []);
  assert.deepEqual(
    successor.body.data.hearings.map(({ event_id }) => event_id),
    ["hearing-today"],
  );
});

test("half-open day boundaries exclude intervals ending exactly at local midnight", () => {
  const boundaryRecords = records().filter((row) => (
    !["MatterTask", "MatterCalendarEvent"].includes(row.model_type)
    || row.matter_id !== "matter-a"
  ));
  boundaryRecords.push(
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-a",
      task_id: "task-ends-midnight",
      title: "자정 종료 업무",
      status: "todo",
      assigned_to_user_id: "user-target",
      starts_at: "2026-07-30T14:00:00.000Z",
      ends_at: "2026-07-30T15:00:00.000Z",
    },
    {
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      matter_id: "matter-a",
      event_id: "hearing-ends-midnight",
      title: "자정 종료 재판",
      event_kind: "court_hearing",
      status: "scheduled",
      starts_at: "2026-07-30T14:00:00.000Z",
      ends_at: "2026-07-30T15:00:00.000Z",
    },
  );
  const result = request({
    context: hrxContext({ asOf: "2026-07-30T15:30:00.000Z" }),
    matter: matterContext(boundaryRecords),
    permissions: permissionContext({ denyMatterId: "matter-secret" }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.date, "2026-07-31");
  assert.deepEqual(result.body.data.tasks.time_bound, []);
  assert.deepEqual(result.body.data.hearings, []);
  assert.equal(JSON.stringify(result.body).includes("ends-midnight"), false);
});

test("start-only task stays visible once as a needs-time item", () => {
  const startOnlyRecords = records().filter((row) => (
    row.model_type !== "MatterTask"
    || row.matter_id !== "matter-a"
  ));
  startOnlyRecords.push({
    model_type: "MatterTask",
    tenant_id: TENANT,
    matter_id: "matter-a",
    task_id: "task-needs-end",
    title: "종료 시간 확인 업무",
    status: "todo",
    assigned_to_user_id: "user-target",
    starts_at: "2026-07-30T02:00:00.000Z",
    estimated_minutes: 35,
  });
  const result = request({
    matter: matterContext(startOnlyRecords),
    permissions: permissionContext({ denyMatterId: "matter-secret" }),
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data.tasks.time_bound, []);
  assert.deepEqual(result.body.data.tasks.due_only, []);
  assert.deepEqual(
    result.body.data.tasks.unscheduled.map(({ task_id, scheduling_state }) => ({
      task_id,
      scheduling_state,
    })),
    [{ task_id: "task-needs-end", scheduling_state: "needs_end_time" }],
  );
  assert.equal(
    JSON.stringify(result.body.data.tasks).match(/task-needs-end/g)?.length,
    1,
  );
  assert.equal(
    result.body.data.confirmation_items.filter(({ task_id }) => task_id === "task-needs-end").length,
    1,
  );
});

test("daily brief assigned matters include role, next important event, and stable sorting", () => {
  const assigned = request().body.data.assigned_matters;
  assert.deepEqual(assigned.map(({ matter_id }) => matter_id), ["matter-a", "matter-secret"]);
  assert.equal(assigned[0].role, "responsible_attorney");
  assert.equal(assigned[0].next_important_event.event_id, "hearing-today");
  assert.equal(assigned[0].handoff_state, "current");
});

test("Matter permission is applied before rows and does not leak denied existence or counts", () => {
  const result = request({ permissions: permissionContext({ denyMatterId: "matter-secret" }) });
  const serialized = JSON.stringify(result.body);
  assert.deepEqual(result.body.data.assigned_matters.map(({ matter_id }) => matter_id), ["matter-a"]);
  assert.equal(serialized.includes("matter-secret"), false);
  assert.equal(serialized.includes("비밀"), false);
  assert.equal(Object.hasOwn(result.body.data, "omitted_count"), false);
  assert.equal(result.body.data.existence_hidden, true);
});

test("identical as_of and source records produce the same business projection", () => {
  const first = request().body.data;
  const second = request().body.data;
  assert.deepEqual(first, second);
  assert.equal(first.result_hash, second.result_hash);
});

test("Matter source failure remains partial and is not presented as zero work", () => {
  const result = request({ matter: null });
  assert.equal(result.status, 200);
  assert.equal(result.body.state, "partial");
  assert.equal(result.body.data.tasks, null);
  assert.equal(result.body.data.hearings, null);
  assert.equal(result.body.data.assigned_matters, null);
  assert.equal(result.body.source_status[1].safe_error_code, "PEOPLE_MATTER_SOURCE_UNAVAILABLE");
});

test("missing, ambiguous, and inactive Employee/User links block tasks instead of returning an empty list", () => {
  const cases = [
    ["missing", "missing", []],
    ["ambiguous", "ambiguous", [
      {
        tenant_id: TENANT,
        link_id: "link-a",
        employee_id: "emp-target",
        user_id: "user-a",
        purpose: "login_mapping",
      },
      {
        tenant_id: TENANT,
        link_id: "link-b",
        employee_id: "emp-target",
        user_id: "user-b",
        purpose: "login_mapping",
      },
    ]],
    ["inactive", "missing", [{
      tenant_id: TENANT,
      link_id: "link-inactive",
      employee_id: "emp-target",
      user_id: "user-target",
      purpose: "login_mapping",
      status: "inactive",
    }]],
  ];

  for (const [label, expectedReason, employeeUserLinks] of cases) {
    const result = request({
      context: hrxContext({ employeeUserLinks }),
      actorRole: "people_ops",
      permissions: permissionContext({ denyMatterId: "matter-secret" }),
    });
    assert.equal(result.status, 200, label);
    assert.equal(result.body.state, "partial", label);
    assert.deepEqual(
      result.body.source_status.find(({ source }) => source === "identity_link"),
      {
        source: "identity_link",
        state: "blocked",
        last_success_at: null,
        stale_after: null,
        safe_error_code: "PEOPLE_IDENTITY_LINK_REQUIRED",
      },
      label,
    );
    assert.equal(result.body.data.tasks, null, label);
    assert.equal(result.body.data.task_source_state, "identity_link_required", label);
    assert.equal(result.body.data.hearings[0].event_id, "hearing-today", label);
    assert.equal(
      result.body.data.confirmation_items.find(
        ({ kind }) => kind === "employee_user_link_confirmation_required",
      )?.safe_reason,
      expectedReason,
      label,
    );
    const serialized = JSON.stringify(result.body);
    assert.equal(serialized.includes("task-timed"), false, label);
    assert.equal(serialized.includes("task-other"), false, label);
    assert.equal(serialized.includes("user-a"), false, label);
    assert.equal(serialized.includes("user-b"), false, label);
  }
});

test("an inactive Employee/User link cannot authorize self-service access", () => {
  const result = request({
    context: hrxContext({
      employeeUserLinks: [{
        tenant_id: TENANT,
        link_id: "link-inactive",
        employee_id: "emp-target",
        user_id: "user-target",
        purpose: "login_mapping",
        revoked_at: "2026-07-29T00:00:00.000Z",
      }],
    }),
  });
  assert.equal(result.status, 403);
  assert.equal(result.body.safe_error_code, "PEOPLE_MEMBER_READ_DENIED");
});

test("daily brief returns safe 400, 403, and 404 errors", () => {
  const invalid = request({ pathname: "/api/hrx/people/members/%20/daily-brief" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.safe_error_code, "PEOPLE_MEMBER_ID_INVALID");

  const denied = request({
    pathname: "/api/hrx/people/members/emp-other/daily-brief",
    actorId: "user-target",
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.safe_error_code, "PEOPLE_MEMBER_READ_DENIED");
  assert.equal(JSON.stringify(denied.body).includes("이변호사"), false);

  const missing = request({
    pathname: "/api/hrx/people/members/emp-missing/daily-brief",
    actorRole: "people_ops",
  });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.safe_error_code, "PEOPLE_MEMBER_NOT_FOUND");
});

test("people_member_brief flag off keeps the new endpoint unavailable", () => {
  const result = request({ context: hrxContext({ featureEnabled: false }) });
  assert.equal(result.status, 404);
  assert.equal(result.body.safe_error_code, "PEOPLE_MEMBER_BRIEF_DISABLED");
});
