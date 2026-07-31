import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryHrxMetricsSink } from "../../../../packages/hrx/src/observability.js";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import {
  createHrxRuntimeContext,
  handleHrxApiRequest,
} from "../../src/hrx-runtime-context.js";

const TENANT = "tenant-people-telemetry";
const ACTOR = "user-primary";
const AS_OF = "2026-07-30T00:30:00.000Z";

function repository() {
  return createInMemoryHrxRepository({
    employees: [
      {
        tenant_id: TENANT,
        employee_id: "emp-primary",
        display_name: "비공개 이름",
        status: "active",
      },
      {
        tenant_id: TENANT,
        employee_id: "emp-other",
        display_name: "다른 비공개 이름",
        status: "active",
      },
    ],
    employee_user_links: [
      {
        tenant_id: TENANT,
        link_id: "link-primary",
        employee_id: "emp-primary",
        user_id: ACTOR,
        purpose: "login_mapping",
        source_ref: "test:people-feature-telemetry",
      },
      {
        tenant_id: TENANT,
        link_id: "link-other",
        employee_id: "emp-other",
        user_id: "user-other",
        purpose: "login_mapping",
        source_ref: "test:people-feature-telemetry",
      },
    ],
  });
}

function runtime({
  sink,
  flags = {},
  outlookSource = null,
} = {}) {
  return createHrxRuntimeContext({
    repository: repository(),
    seedRuntimeFixtures: false,
    clock: () => AS_OF,
    peopleMetricsSink: sink,
    peopleFeatureFlags: {
      people_overview: true,
      people_member_brief: true,
      outlook_calendar: true,
      people_capacity: false,
      ...flags,
    },
    peopleOutlookCalendarSource: outlookSource,
  });
}

function permissionContext() {
  return {
    principal: {
      user_id: ACTOR,
      tenant_id: TENANT,
      role_ids: ["staff"],
    },
    rules: [
      { id: "employee-read", effect: "allow", action: "hrx.employee.read" },
      { id: "matter-read", effect: "allow", action: "matter:read" },
    ],
    object_acl: [],
  };
}

function matterContext() {
  return {
    repository: {
      list() {
        return [];
      },
    },
  };
}

function request({
  context,
  pathname,
  matter = matterContext(),
  actorRole = "staff",
} = {}) {
  return handleHrxApiRequest({
    pathname,
    method: "GET",
    context,
    matterContext: matter,
    requestContext: {
      tenant_id: TENANT,
      actor_id: ACTOR,
      actor_role: actorRole,
      hrx_scopes: ["hrx.employee.read"],
      session_bound: true,
    },
    permissionContext: permissionContext(),
  });
}

test("People routes emit only non-identifying request, partial, stale, and denied metrics", () => {
  const sink = createInMemoryHrxMetricsSink();

  const partial = request({
    context: runtime({ sink, flags: { outlook_calendar: false } }),
    pathname: "/api/hrx/people/team-operations",
    matter: null,
    actorRole: "people_ops",
  });
  assert.equal(partial.status, 200);
  assert.equal(partial.body.state, "partial");

  const stale = request({
    context: runtime({
      sink,
      outlookSource: {
        read() {
          return {
            state: "stale",
            events_by_employee_id: {},
            connection_state_by_employee_id: {},
            last_success_at: "2026-07-29T23:30:00.000Z",
            stale_after: "2026-07-30T00:00:00.000Z",
            safe_error_code: "OUTLOOK_CALENDAR_CACHE_STALE",
          };
        },
      },
    }),
    pathname: "/api/hrx/people/members/emp-primary/daily-brief",
  });
  assert.equal(stale.status, 200);
  assert.equal(stale.body.state, "partial");
  assert.equal(stale.body.source_status.find(({ source }) => source === "outlook").state, "stale");

  const denied = request({
    context: runtime({ sink }),
    pathname: "/api/hrx/people/members/emp-other/outlook-connection",
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.safe_error_code, "PEOPLE_MEMBER_READ_DENIED");

  const metrics = sink.list({
    tenant_id: TENANT,
    metric_name: "people.feature.request_count",
  });
  assert.deepEqual(metrics.map(({ tags }) => tags), [
    { feature: "people_overview", outcome: "request" },
    { feature: "people_overview", outcome: "partial" },
    { feature: "people_member_brief", outcome: "request" },
    { feature: "people_member_brief", outcome: "stale" },
    { feature: "outlook_calendar", outcome: "request" },
    { feature: "outlook_calendar", outcome: "denied" },
  ]);

  const serialized = JSON.stringify(metrics);
  for (const privateValue of [
    "emp-primary",
    "emp-other",
    "비공개 이름",
    "다른 비공개 이름",
    "회의 제목",
    "provider-token",
  ]) {
    assert.equal(serialized.includes(privateValue), false);
  }
});

test("People telemetry is optional and fail-open without changing disabled route behavior", () => {
  const throwingSink = {
    emit() {
      throw new Error("metrics unavailable");
    },
  };
  const partial = request({
    context: runtime({
      sink: throwingSink,
      flags: { outlook_calendar: false },
    }),
    pathname: "/api/hrx/people/team-operations",
    matter: null,
    actorRole: "people_ops",
  });
  assert.equal(partial.status, 200);
  assert.equal(partial.body.state, "partial");

  const disabled = request({
    context: runtime({
      flags: {
        people_overview: false,
        outlook_calendar: false,
      },
    }),
    pathname: "/api/hrx/people/team-operations",
    actorRole: "people_ops",
  });
  assert.equal(disabled.status, 404);
  assert.equal(disabled.body.safe_error_code, "PEOPLE_OVERVIEW_DISABLED");
});
