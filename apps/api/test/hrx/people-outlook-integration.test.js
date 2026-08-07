import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import {
  createHrxRuntimeContext,
  handleHrxApiRequest,
} from "../../src/hrx-runtime-context.js";

const TENANT = "tenant-people-outlook";
const AS_OF = "2026-07-30T00:30:00.000Z";

function repository() {
  return createInMemoryHrxRepository({
    employees: [
      { tenant_id: TENANT, employee_id: "emp-1", display_name: "김변호사", status: "active" },
      { tenant_id: TENANT, employee_id: "emp-2", display_name: "이변호사", status: "active" },
    ],
    employee_user_links: [
      {
        tenant_id: TENANT,
        link_id: "link-1",
        employee_id: "emp-1",
        user_id: "user-1",
        purpose: "login_mapping",
        source_ref: "test:people-outlook",
      },
      {
        tenant_id: TENANT,
        link_id: "link-2",
        employee_id: "emp-2",
        user_id: "user-2",
        purpose: "login_mapping",
        source_ref: "test:people-outlook",
      },
    ],
  });
}

function matterRecords() {
  return [
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: "matter-1",
      matter_code: "L-001",
      matter_name: "민사 본안",
      status: "open",
    },
    {
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: "matter-1",
      member_id: "member-1",
      employee_id: "emp-1",
      user_id: "user-1",
      role: "responsible_attorney",
      status: "active",
      valid_from: "2026-07-01T00:00:00.000Z",
      identity_resolution_state: "resolved",
    },
    {
      model_type: "MatterTask",
      tenant_id: TENANT,
      matter_id: "matter-1",
      task_id: "task-1",
      title: "준비서면 검토",
      status: "todo",
      assigned_to_user_id: "user-1",
      starts_at: "2026-07-30T02:00:00.000Z",
      ends_at: "2026-07-30T02:30:00.000Z",
    },
  ];
}

function matterContext() {
  const records = matterRecords();
  return {
    repository: {
      list({ tenant_id, model_type }) {
        return records.filter((record) => record.tenant_id === tenant_id && record.model_type === model_type);
      },
    },
  };
}

function rawEvents(employeeId) {
  return [
    {
      provider_event_id: `${employeeId}-required`,
      provider_series_id: `${employeeId}-series-sensitive`,
      ical_uid: `${employeeId}-ical-sensitive`,
      title: `${employeeId} 고객 전략 회의`,
      body_preview: `${employeeId} confidential body`,
      organizer_email: `${employeeId}@secret.example.test`,
      starts_at: "2026-07-30T01:00:00.000Z",
      ends_at: "2026-07-30T01:45:00.000Z",
      attendee_type: "required",
      response_status: "accepted",
      is_cancelled: false,
      sensitivity: "normal",
      show_as: "busy",
    },
    {
      provider_event_id: `${employeeId}-optional`,
      title: `${employeeId} 선택 회의`,
      starts_at: "2026-07-30T03:00:00.000Z",
      ends_at: "2026-07-30T03:30:00.000Z",
      attendee_type: "optional",
      response_status: "accepted",
      is_cancelled: false,
      sensitivity: "normal",
      show_as: "busy",
    },
    {
      provider_event_id: `${employeeId}-ended`,
      title: `${employeeId} 종료 회의`,
      starts_at: "2026-07-29T23:30:00.000Z",
      ends_at: "2026-07-30T00:15:00.000Z",
      attendee_type: "required",
      response_status: "accepted",
      is_cancelled: false,
      sensitivity: "normal",
      show_as: "busy",
    },
    {
      provider_event_id: `${employeeId}-cancelled`,
      title: `${employeeId} 취소 회의`,
      starts_at: "2026-07-30T04:00:00.000Z",
      ends_at: "2026-07-30T04:30:00.000Z",
      attendee_type: "required",
      response_status: "accepted",
      is_cancelled: true,
      sensitivity: "normal",
      show_as: "free",
    },
  ];
}

function permissionContext() {
  return {
    principal: { user_id: "user-1", tenant_id: TENANT, role_ids: ["people_ops"] },
    rules: [
      { id: "employee-read", effect: "allow", action: "hrx.employee.read" },
      { id: "matter-read", effect: "allow", action: "matter:read" },
    ],
    object_acl: [],
  };
}

function actor(role = "people_ops") {
  return {
    tenant_id: TENANT,
    actor_id: "user-1",
    actor_role: role,
    hrx_scopes: ["hrx.employee.read"],
    session_bound: true,
  };
}

function context(source) {
  return createHrxRuntimeContext({
    repository: repository(),
    seedRuntimeFixtures: false,
    clock: () => AS_OF,
    peopleTimezone: "Asia/Seoul",
    peopleFeatureFlags: {
      people_overview: true,
      people_member_brief: true,
      outlook_calendar: true,
      people_capacity: false,
    },
    peopleOutlookCalendarSource: source,
  });
}

function request(runtime, pathname, role = "people_ops") {
  return handleHrxApiRequest({
    pathname,
    method: "GET",
    context: runtime,
    matterContext: matterContext(),
    requestContext: actor(role),
    permissionContext: permissionContext(),
  });
}

function healthySource(state = "ok") {
  return {
    read({ employee_ids }) {
      return {
        state,
        events_by_employee_id: Object.fromEntries(employee_ids.map((employeeId) => [employeeId, rawEvents(employeeId)])),
        connection_state_by_employee_id: Object.fromEntries(employee_ids.map((employeeId) => [employeeId, {
          provider: "microsoft_graph",
          connection_state: "connected",
          can_manage: employeeId === "emp-1",
          delegated_scope: "Calendars.ReadBasic",
          connected_at: "2026-07-29T00:00:00.000Z",
          expires_at: "2026-07-30T02:00:00.000Z",
          safe_error_code: null,
          provider_account_email: `${employeeId}@secret.example.test`,
          token_ref: `vault:${employeeId}-sensitive`,
        }])),
        last_success_at: "2026-07-30T00:29:00.000Z",
        stale_after: "2026-07-30T00:34:00.000Z",
        safe_error_code: state === "stale" ? "OUTLOOK_CALENDAR_STALE" : null,
      };
    },
  };
}

function notConnectedSource() {
  return {
    read({ employee_ids }) {
      return {
        state: "ok",
        events_by_employee_id: Object.fromEntries(employee_ids.map((employeeId) => [employeeId, []])),
        connection_state_by_employee_id: Object.fromEntries(employee_ids.map((employeeId) => [employeeId, {
          provider: "microsoft_graph",
          connection_state: "not_connected",
          can_manage: employeeId === "emp-1",
          delegated_scope: "Calendars.ReadBasic",
          connected_at: null,
          expires_at: null,
          safe_error_code: null,
        }])),
        last_success_at: null,
        stale_after: null,
        safe_error_code: null,
      };
    },
  };
}

test("individual brief treats an unconnected Outlook calendar as an unavailable source", () => {
  const result = request(
    context(notConnectedSource()),
    "/api/hrx/people/members/emp-1/daily-brief",
    "staff",
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.state, "partial");
  assert.deepEqual(result.body.source_status.map(({ source, state, safe_error_code }) => [
    source,
    state,
    safe_error_code,
  ]), [
    ["hrx", "ok", null],
    ["matter", "ok", null],
    ["outlook", "blocked", "OUTLOOK_CONSENT_NOT_FOUND"],
  ]);
  assert.equal(result.body.data.outlook_connection.connection_state, "not_connected");
  assert.deepEqual(result.body.data.outlook_intervals, []);
  assert.deepEqual(result.body.data.required_meetings, []);
});

test("individual brief adds only an upcoming required meeting to Today while retaining other schedule rows", () => {
  const result = request(
    context(healthySource()),
    "/api/hrx/people/members/emp-1/daily-brief",
    "staff",
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.state, "ok");
  assert.deepEqual(result.body.source_status.map(({ source, state }) => [source, state]), [
    ["hrx", "ok"],
    ["matter", "ok"],
    ["outlook", "ok"],
  ]);
  assert.deepEqual(result.body.data.required_meetings.map(({ title }) => title), ["emp-1 고객 전략 회의"]);
  assert.deepEqual(
    result.body.data.outlook_intervals.map(({ classification_reason }) => classification_reason),
    ["ended", "required_upcoming", "optional_or_unknown"],
  );
  assert.equal(result.body.data.tasks.time_bound[0].task_id, "task-1");
  const serialized = JSON.stringify(result.body);
  assert.equal(serialized.includes("provider_event_id"), false);
  assert.equal(serialized.includes("emp-1-cancelled"), false);
});

test("team view redacts another member's title and adds required meetings to queue and timeline", () => {
  const result = request(context(healthySource()), "/api/hrx/people/team-operations");
  assert.equal(result.status, 200);
  const own = result.body.data.team_members.find(({ member }) => member.employee_id === "emp-1");
  const other = result.body.data.team_members.find(({ member }) => member.employee_id === "emp-2");
  assert.equal(own.today_intervals.some(({ kind, title }) => kind === "outlook_calendar" && title.includes("고객 전략")), true);
  assert.equal(other.today_intervals.filter(({ kind }) => kind === "outlook_calendar").every(({ title }) => title === "일정 있음"), true);
  const outlookQueue = result.body.data.action_queues.today_tasks.rows.filter(({ kind }) => kind === "outlook_calendar");
  assert.equal(outlookQueue.length, 2);
  assert.equal(outlookQueue.find(({ employee_id }) => employee_id === "emp-2").title, "일정 있음");
  assert.equal(JSON.stringify(result.body).includes("emp-2 고객 전략 회의"), false);
});

test("Outlook down or stale never removes Matter operations", () => {
  const down = request(context({
    read() {
      const error = new Error("provider unavailable");
      error.safe_error_code = "OUTLOOK_CALENDAR_READ_FAILED";
      throw error;
    },
  }), "/api/hrx/people/team-operations");
  assert.equal(down.status, 200);
  assert.equal(down.body.state, "partial");
  assert.equal(down.body.source_status[2].state, "blocked");
  assert.equal(down.body.data.team_members[0].today_intervals.some(({ kind }) => kind === "matter_task"), true);

  const stale = request(context(healthySource("stale")), "/api/hrx/people/team-operations");
  assert.equal(stale.status, 200);
  assert.equal(stale.body.state, "partial");
  assert.equal(stale.body.source_status[2].state, "stale");
  assert.equal(stale.body.data.team_members[0].today_intervals.some(({ kind }) => kind === "matter_task"), true);
});

test("Outlook flag off preserves the original Matter-only response shape", () => {
  const runtime = createHrxRuntimeContext({
    repository: repository(),
    seedRuntimeFixtures: false,
    clock: () => AS_OF,
    peopleFeatureFlags: {
      people_overview: true,
      people_member_brief: true,
      outlook_calendar: false,
      people_capacity: false,
    },
    peopleOutlookCalendarSource: healthySource(),
  });
  const result = request(runtime, "/api/hrx/people/members/emp-1/daily-brief", "staff");
  assert.deepEqual(result.body.source_status.map(({ source }) => source), ["hrx", "matter"]);
  assert.deepEqual(result.body.data.outlook_intervals, []);
  assert.deepEqual(result.body.data.required_meetings, []);
});

test("Matter-unavailable daily brief keeps Outlook partial data behind the privacy projection", () => {
  const result = handleHrxApiRequest({
    pathname: "/api/hrx/people/members/emp-2/daily-brief",
    method: "GET",
    context: context(healthySource()),
    matterContext: null,
    requestContext: actor("people_ops"),
    permissionContext: permissionContext(),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.state, "partial");
  assert.deepEqual(result.body.source_status.map(({ source, state }) => [source, state]), [
    ["hrx", "ok"],
    ["matter", "blocked"],
    ["outlook", "ok"],
  ]);
  assert.equal(result.body.data.outlook_intervals.length, 3);
  assert.equal(result.body.data.outlook_intervals.every(({ title }) => title === "일정 있음"), true);
  assert.equal(result.body.data.required_meetings[0].title, "일정 있음");
  assert.equal(result.body.data.outlook_connection.connection_state, "connected");

  const serialized = JSON.stringify(result.body);
  for (const forbidden of [
    "provider_event_id",
    "provider_series_id",
    "ical_uid",
    "body_preview",
    "organizer_email",
    "provider_account_email",
    "token_ref",
    "emp-2 고객 전략 회의",
    "emp-2-series-sensitive",
    "emp-2-ical-sensitive",
    "emp-2 confidential body",
    "emp-2@secret.example.test",
    "vault:emp-2-sensitive",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `serialized body leaked ${forbidden}`);
  }
});
