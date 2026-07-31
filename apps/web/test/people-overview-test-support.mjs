import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
export const webRoot = resolve(testDir, "..");
export const repoRoot = resolve(webRoot, "../..");

const asOf = "2026-07-30T09:00:00+09:00";

function sourceStatus(state = "ok", outlookState = null) {
  return [
    {
      source: "hrx",
      state: "ok",
      last_success_at: asOf,
      stale_after: null,
      safe_error_code: null,
    },
    {
      source: "matter",
      state,
      last_success_at: state === "blocked" ? null : asOf,
      stale_after: state === "stale" ? "2026-07-30T08:30:00+09:00" : null,
      safe_error_code: state === "ok" ? null : `PEOPLE_MATTER_SOURCE_${state.toUpperCase()}`,
    },
    ...(outlookState ? [{
      source: "outlook",
      state: outlookState,
      last_success_at: outlookState === "blocked" ? null : asOf,
      stale_after: outlookState === "stale" ? "2026-07-30T08:55:00+09:00" : null,
      safe_error_code: outlookState === "ok" ? null : `OUTLOOK_CALENDAR_${outlookState.toUpperCase()}`,
    }] : []),
  ];
}

const teamMembers = [
  {
    member: {
      employee_id: "emp-1",
      display_name: "김아민",
      title: "파트너 변호사",
      status: "active",
    },
    today_intervals: [
      {
        kind: "matter_task",
        task_id: "task-early",
        matter_id: "matter-1",
        matter_code: "L-001",
        title: "준비서면 검토",
        starts_at: "2026-07-30T08:10:00+09:00",
        ends_at: "2026-07-30T08:20:00+09:00",
      },
      {
        kind: "matter_task",
        task_id: "task-overlap",
        matter_id: "matter-1",
        matter_code: "L-001",
        title: "증거목록 확인",
        starts_at: "2026-07-30T09:10:00+09:00",
        ends_at: "2026-07-30T09:30:00+09:00",
      },
      {
        kind: "court_hearing",
        event_id: "hearing-1",
        matter_id: "matter-1",
        matter_code: "L-001",
        title: "변론기일",
        starts_at: "2026-07-30T09:20:00+09:00",
        ends_at: "2026-07-30T10:00:00+09:00",
      },
    ],
    time_unspecified_tasks: [],
    assigned_matter_count: 2,
    today_task_count: 2,
    today_hearing_count: 1,
    confirmation_items: [],
  },
  {
    member: {
      employee_id: "emp-2",
      display_name: "이서윤",
      title: "변호사",
      status: "active",
    },
    today_intervals: [
      {
        kind: "matter_task",
        task_id: "task-2",
        matter_id: "matter-2",
        matter_code: "L-002",
        title: "의견서 작성",
        starts_at: "2026-07-30T14:00:00+09:00",
        ends_at: "2026-07-30T15:30:00+09:00",
      },
    ],
    time_unspecified_tasks: [
      {
        task_id: "task-unscheduled",
        matter_id: "matter-2",
        matter_code: "L-002",
        title: "기록 검토",
        estimated_minutes: 60,
        scheduling_state: "unscheduled",
      },
    ],
    assigned_matter_count: 1,
    today_task_count: 2,
    today_hearing_count: 0,
    confirmation_items: [],
  },
];

function teamMembersForSize(size) {
  const boundedSize = Math.max(0, Math.min(10, Number.isInteger(size) ? size : 2));
  if (boundedSize <= teamMembers.length) return teamMembers.slice(0, boundedSize);
  return [
    ...teamMembers,
    ...Array.from({ length: boundedSize - teamMembers.length }, (_, offset) => {
      const memberNumber = offset + teamMembers.length + 1;
      const hour = 9 + (memberNumber % 8);
      return {
        member: {
          employee_id: `emp-${memberNumber}`,
          display_name: `구성원 ${String(memberNumber).padStart(2, "0")}`,
          title: memberNumber % 3 === 0 ? "송무 지원" : "변호사",
          status: "active",
        },
        today_intervals: [{
          kind: "matter_task",
          task_id: `task-${memberNumber}`,
          matter_id: `matter-${memberNumber}`,
          matter_code: `L-${String(memberNumber).padStart(3, "0")}`,
          title: `사건 업무 ${memberNumber}`,
          starts_at: `2026-07-30T${String(hour).padStart(2, "0")}:00:00+09:00`,
          ends_at: `2026-07-30T${String(hour).padStart(2, "0")}:30:00+09:00`,
        }],
        time_unspecified_tasks: [],
        assigned_matter_count: 1,
        today_task_count: 1,
        today_hearing_count: 0,
        confirmation_items: [],
      };
    }),
  ];
}

function workloadRowsForMembers(members) {
  return members.map((item, index) => {
    const member = item.member;
    if (index === 0) {
      return {
        employee_id: member.employee_id,
        display_name: member.display_name,
        workload_source_state: "ok",
        confirmed_minutes: 90,
        time_unspecified_estimated_minutes: 45,
        no_estimate_task_count: 1,
        no_estimate_is_zero_minutes: false,
      };
    }
    if (index === 1) {
      return {
        employee_id: member.employee_id,
        display_name: member.display_name,
        workload_source_state: "ok",
        confirmed_minutes: 0,
        time_unspecified_estimated_minutes: 60,
        no_estimate_task_count: 0,
        no_estimate_is_zero_minutes: false,
      };
    }
    return {
      employee_id: member.employee_id,
      display_name: member.display_name,
      workload_source_state: "ok",
      confirmed_minutes: 30 + (index * 15),
      time_unspecified_estimated_minutes: index % 2 === 0 ? 30 : 0,
      no_estimate_task_count: 0,
      no_estimate_is_zero_minutes: false,
    };
  });
}

const actionQueues = {
  today_tasks: {
    count: 2,
    rows: [
      {
        queue_id: "task:task-overlap",
        kind: "matter_task",
        title: "증거목록 확인",
        starts_at: "2026-07-30T09:10:00+09:00",
        employee_id: "emp-1",
        display_name: "김아민",
        matter_id: "matter-1",
        matter_code: "L-001",
        matter_name: "손해배상 사건",
        destination: { view: "matters", section: "matters-list", matter_id: "matter-1" },
      },
      {
        queue_id: "hearing:hearing-1:emp-1",
        kind: "court_hearing",
        title: "변론기일",
        starts_at: "2026-07-30T09:20:00+09:00",
        employee_id: "emp-1",
        display_name: "김아민",
        matter_id: "matter-1",
        matter_code: "L-001",
        matter_name: "손해배상 사건",
        destination: { view: "matters", section: "matters-list", matter_id: "matter-1" },
      },
    ],
  },
  assignee_required: {
    count: 1,
    rows: [
      {
        queue_id: "assignee:deadline-2",
        kind: "deadline",
        title: "답변서 제출기한",
        starts_at: "2026-08-01T14:00:00+09:00",
        matter_id: "matter-2",
        matter_code: "L-002",
        matter_name: "자문 사건",
        destination: { view: "matters", section: "matters-list", matter_id: "matter-2" },
      },
    ],
  },
  handoff_confirmation: { count: 0, rows: [] },
  time_record_confirmation: {
    count: 1,
    rows: [
      {
        queue_id: "time-entry:time-1",
        kind: "time_record",
        title: "시간기록 확인 필요",
        display_name: "이서윤",
        destination: { view: "people", section: "people-attendance-records", employee_id: "emp-2" },
      },
    ],
  },
};

export function peopleOperationsEnvelope({
  state = "ok",
  sourceState = state === "stale" ? "stale" : "ok",
  empty = false,
  partial = false,
  teamSize = 2,
} = {}) {
  const fixtureMembers = teamMembersForSize(teamSize);
  const members = empty
    ? []
    : partial
      ? fixtureMembers.map((item) => ({
          ...item,
          today_intervals: null,
          time_unspecified_tasks: null,
          assigned_matter_count: null,
        }))
      : fixtureMembers;
  return {
    schema_version: "lawos.people-source-envelope.v1",
    state: partial ? "partial" : state,
    as_of: asOf,
    timezone: "Asia/Seoul",
    source_status: partial ? sourceStatus("blocked") : sourceStatus(sourceState),
    data: {
      member_count: members.length,
      team_members: members,
      action_queues: partial ? null : empty ? {
        today_tasks: { count: 0, rows: [] },
        assignee_required: { count: 0, rows: [] },
        handoff_confirmation: { count: 0, rows: [] },
        time_record_confirmation: { count: 0, rows: [] },
      } : actionQueues,
      workload_stage1: partial ? null : {
        week_start: "2026-07-27",
        week_end_exclusive: "2026-08-03",
        rows: empty ? [] : workloadRowsForMembers(members),
        capacity_percent_included: false,
        automatic_assignment_included: false,
      },
      attention_window: partial ? null : {
        start_date: "2026-07-30",
        end_date_exclusive: "2026-08-13",
        items: empty ? [] : [
          {
            attention_id: "attention:hearing-1",
            event_id: "hearing-1",
            event_kind: "court_hearing",
            title: "변론기일",
            starts_at: "2026-07-30T09:20:00+09:00",
            matter_id: "matter-1",
            matter_code: "L-001",
            matter_name: "손해배상 사건",
            reasons: ["court_hearing", "schedule_conflict:emp-1"],
            destination: { view: "matters", section: "matters-list", matter_id: "matter-1" },
          },
          {
            attention_id: "attention:deadline-2",
            event_id: "deadline-2",
            event_kind: "deadline",
            title: "답변서 제출기한",
            starts_at: "2026-08-01T14:00:00+09:00",
            matter_id: "matter-2",
            matter_code: "L-002",
            matter_name: "자문 사건",
            reasons: ["assignee_required", "deadline"],
            destination: { view: "matters", section: "matters-list", matter_id: "matter-2" },
          },
        ],
      },
      deadline_staffing: partial ? null : {
        start_date: "2026-07-30",
        end_date_exclusive: "2026-08-13",
        items: empty ? [] : [
          {
            staffing_id: "staffing:hearing-1",
            event_id: "hearing-1",
            event_kind: "court_hearing",
            title: "변론기일",
            starts_at: "2026-07-30T09:20:00+09:00",
            matter_id: "matter-1",
            matter_code: "L-001",
            matter_name: "손해배상 사건",
            attorney_count: 1,
            attorneys: [{ employee_id: "emp-1", display_name: "김아민" }],
            staffing_state: "assigned",
            staffing_label: "담당 확인",
            destination: { view: "matters", section: "matters-list", matter_id: "matter-1" },
          },
          {
            staffing_id: "staffing:deadline-2",
            event_id: "deadline-2",
            event_kind: "deadline",
            title: "답변서 제출기한",
            starts_at: "2026-08-01T14:00:00+09:00",
            matter_id: "matter-2",
            matter_code: "L-002",
            matter_name: "자문 사건",
            attorney_count: 0,
            attorneys: [],
            staffing_state: "assignee_required",
            staffing_label: "담당자 지정 필요",
            destination: { view: "matters", section: "matters-list", matter_id: "matter-2" },
          },
        ],
      },
      response_bounds: { member_limit: 25, truncated: false, pagination: false },
      permission_filter_applied_before_aggregation: true,
      existence_hidden: true,
      result_hash: "sha256:test",
    },
  };
}

export function peopleDailyBriefEnvelope({ partial = false } = {}) {
  return {
    schema_version: "lawos.people-source-envelope.v1",
    state: partial ? "partial" : "ok",
    as_of: asOf,
    timezone: "Asia/Seoul",
    source_status: partial ? sourceStatus("blocked") : sourceStatus(),
    data: {
      member: {
        employee_id: "emp-1",
        display_name: "김아민",
        title: "파트너 변호사",
        status: "active",
      },
      date: partial ? null : "2026-07-30",
      tasks: partial ? null : {
        time_bound: [
          {
            task_id: "task-timed",
            matter_id: "matter-1",
            matter_code: "L-001",
            matter_name: "손해배상 사건",
            title: "준비서면 검토",
            status: "todo",
            starts_at: "2026-07-30T08:10:00+09:00",
            ends_at: "2026-07-30T08:20:00+09:00",
          },
        ],
        due_only: [
          {
            task_id: "task-due",
            matter_id: "matter-2",
            matter_code: "L-002",
            matter_name: "자문 사건",
            title: "답변서 제출",
            status: "todo",
            due_at: "2026-07-30",
          },
        ],
        unscheduled: [
          {
            task_id: "task-unscheduled",
            matter_id: "matter-1",
            matter_code: "L-001",
            matter_name: "손해배상 사건",
            title: "기록 검토",
            status: "todo",
          },
        ],
      },
      hearings: partial ? null : [
        {
          event_id: "hearing-assigned",
          matter_id: "matter-1",
          matter_code: "L-001",
          matter_name: "손해배상 사건",
          title: "변론기일",
          event_kind: "court_hearing",
          starts_at: "2026-07-30T09:20:00+09:00",
          ends_at: "2026-07-30T10:00:00+09:00",
        },
      ],
      assigned_matters: partial ? null : [
        {
          matter_id: "matter-1",
          matter_code: "L-001",
          matter_name: "손해배상 사건",
          role: "responsible_attorney",
          handoff_state: "current",
          next_important_event: {
            event_id: "hearing-assigned",
            title: "변론기일",
            event_kind: "court_hearing",
            starts_at: "2026-07-30T09:20:00+09:00",
          },
        },
        {
          matter_id: "matter-3",
          matter_code: "L-003",
          matter_name: "계약 검토",
          role: "responsible_attorney",
          handoff_state: "handoff_scheduled",
          next_important_event: null,
        },
      ],
      confirmation_items: partial ? [
        {
          kind: "source_confirmation_required",
          source: "matter",
          safe_reason: "PEOPLE_MATTER_SOURCE_UNAVAILABLE",
        },
      ] : [
        {
          kind: "task_time_confirmation_required",
          task_id: "task-unscheduled",
          matter_id: "matter-1",
        },
      ],
      permission_filter_applied_before_aggregation: true,
      existence_hidden: true,
      result_hash: partial ? null : "sha256:daily-test",
    },
  };
}

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

export async function startPeopleOverviewHarness() {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true },
  });
  await server.listen();
  const browser = await chromium.launch({
    headless: true,
    args: ["--lang=ko-KR"],
  });
  return {
    server,
    browser,
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      await browser.close();
      await server.close();
    },
  };
}

export async function openPeopleOverviewPage({
  browser,
  baseUrl,
  mode = "ok",
  dailyMode = "ok",
  viewport = { width: 1440, height: 1000 },
  locale = "ko-KR",
  timezoneId = "Asia/Seoul",
  employeeId = null,
  tab = null,
  section = "people-overview",
  memberBriefEnabled = true,
  outlookCalendarEnabled = false,
  outlookMode = "connected",
  outlookAuthorizeUrl = null,
  outlookStateRef = "oauth-state-1",
  peopleCapacityEnabled = false,
  capacityRows = null,
  teamSize = 2,
  workloadIdentityRequired = false,
  teamOperationsResponse = null,
}) {
  const page = await browser.newPage({
    viewport,
    locale,
    timezoneId,
  });
  await page.addInitScript(({ briefEnabled, outlookEnabled, capacityEnabled }) => {
    window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = {
      people_overview: true,
      people_member_brief: briefEnabled,
      outlook_calendar: outlookEnabled,
      people_capacity: capacityEnabled,
      leave_projection: capacityEnabled,
    };
  }, {
    briefEnabled: memberBriefEnabled,
    outlookEnabled: outlookCalendarEnabled,
    capacityEnabled: peopleCapacityEnabled,
  });
  let connectionState = outlookMode;
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/hrx/people/team-operations") {
      if (mode === "loading") return;
      if (mode === "error") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ safe_error_code: "PEOPLE_TEAM_OPERATIONS_FAILED" }),
        });
      }
      if (mode === "denied") {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ ui_state: "denied", safe_error_code: "PEOPLE_TEAM_OPERATIONS_READ_DENIED" }),
        });
      }
      const baseBody = teamOperationsResponse ?? (mode === "empty"
        ? peopleOperationsEnvelope({ empty: true, teamSize })
        : mode === "partial"
          ? peopleOperationsEnvelope({ partial: true, teamSize })
          : mode === "stale"
            ? peopleOperationsEnvelope({ state: "stale", sourceState: "stale", teamSize })
            : peopleOperationsEnvelope({ teamSize }));
      const body = structuredClone(baseBody);
      if (workloadIdentityRequired && body.data.workload_stage1?.rows?.[1]) {
        body.state = "partial";
        body.source_status.splice(1, 0, {
          source: "identity_link",
          state: "blocked",
          last_success_at: null,
          stale_after: null,
          safe_error_code: "PEOPLE_IDENTITY_LINK_REQUIRED",
        });
        Object.assign(body.data.workload_stage1.rows[1], {
          workload_source_state: "identity_link_required",
          confirmed_minutes: null,
          time_unspecified_estimated_minutes: null,
          no_estimate_task_count: null,
        });
        Object.assign(body.data.team_members[1], {
          time_unspecified_tasks: null,
          today_task_count: null,
          confirmation_items: [{
            kind: "employee_user_link_confirmation_required",
            employee_id: body.data.team_members[1].member.employee_id,
            safe_reason: "ambiguous",
          }],
        });
        Object.assign(body.data.action_queues.today_tasks, {
          count: null,
          source_state: "identity_link_required",
        });
      }
      if (peopleCapacityEnabled) {
        body.source_status.push({
          source: "leave",
          state: "ok",
          last_success_at: asOf,
          stale_after: null,
          safe_error_code: null,
        });
        body.data.people_capacity = {
          date: "2026-07-30",
          rows: structuredClone(capacityRows ?? []),
          calculation: "scheduled_minutes_minus_union_of_calendar_and_approved_leave",
          source_state: "ok",
          minute_precision: true,
          ranking_included: false,
          automatic_assignment_included: false,
          performance_evaluation_included: false,
        };
      }
      if (outlookCalendarEnabled) {
        body.source_status = sourceStatus(
          mode === "partial" ? "blocked" : mode === "stale" ? "stale" : "ok",
          outlookMode === "stale" ? "stale" : outlookMode === "blocked" ? "blocked" : "ok",
        );
        if (connectionState === "connected" || connectionState === "stale") {
          body.data.team_members[0].today_intervals.push({
            kind: "outlook_calendar",
            calendar_event_ref: "sha256:outlook-required",
            title: "고객 전략 회의",
            starts_at: "2026-07-30T10:30:00+09:00",
            ends_at: "2026-07-30T11:00:00+09:00",
          });
          body.data.action_queues.today_tasks.rows.push({
            queue_id: "outlook:sha256:outlook-required",
            kind: "outlook_calendar",
            title: "고객 전략 회의",
            starts_at: "2026-07-30T10:30:00+09:00",
            employee_id: "emp-1",
            display_name: "김아민",
            destination: { view: "people", section: "people-overview", employee_id: "emp-1" },
          });
          body.data.action_queues.today_tasks.count += 1;
        }
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    }
    if (/^\/api\/hrx\/people\/members\/[^/]+\/outlook-connection$/.test(pathname)) {
      let authorizationResponse = false;
      if (outlookMode === "error") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ safe_error_code: "OUTLOOK_CONNECTION_READ_FAILED" }),
        });
      }
      if (route.request().method() === "DELETE") connectionState = "not_connected";
      if (route.request().method() === "POST") {
        const requestBody = route.request().postDataJSON();
        if (requestBody.action === "complete") {
          if (
            requestBody.state_ref !== outlookStateRef
            || typeof requestBody.authorization_code !== "string"
            || !requestBody.authorization_code
          ) {
            return route.fulfill({
              status: 400,
              contentType: "application/json",
              body: JSON.stringify({ safe_error_code: "OUTLOOK_OAUTH_STATE_INVALID" }),
            });
          }
          connectionState = "connected";
        } else {
          connectionState = outlookAuthorizeUrl
            ? "consent_pending"
            : requestBody.action === "retry"
              ? "consent_pending"
              : "admin_consent_required";
          authorizationResponse = Boolean(outlookAuthorizeUrl);
        }
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outcome: "ok",
          connection: {
            provider: "microsoft_graph",
            connection_state: connectionState,
            can_manage: true,
            delegated_scope: "Calendars.ReadBasic",
            connected_at: connectionState === "connected" ? "2026-07-29T09:00:00+09:00" : null,
            expires_at: connectionState === "connected" ? "2026-07-30T18:00:00+09:00" : null,
            safe_error_code: connectionState === "reauthorization_required" ? "OUTLOOK_TOKEN_EXPIRED" : null,
            ...(authorizationResponse ? {
              authorize_url: outlookAuthorizeUrl,
              state_ref: outlookStateRef,
            } : {}),
          },
        }),
      });
    }
    if (/^\/api\/hrx\/people\/members\/[^/]+\/daily-brief$/.test(pathname)) {
      if (dailyMode === "denied") {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ ui_state: "denied", safe_error_code: "PEOPLE_MEMBER_READ_DENIED" }),
        });
      }
      if (dailyMode === "error") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ safe_error_code: "PEOPLE_DAILY_BRIEF_FAILED" }),
        });
      }
      const body = structuredClone(peopleDailyBriefEnvelope({ partial: dailyMode === "partial" }));
      if (dailyMode === "identity_required") {
        body.state = "partial";
        body.source_status.push({
          source: "identity_link",
          state: "blocked",
          last_success_at: null,
          stale_after: null,
          safe_error_code: "PEOPLE_IDENTITY_LINK_REQUIRED",
        });
        body.data.tasks = null;
        body.data.task_source_state = "identity_link_required";
        body.data.confirmation_items = [{
          kind: "employee_user_link_confirmation_required",
          employee_id: "emp-1",
          safe_reason: "missing",
        }];
      }
      if (dailyMode === "empty") {
        body.data.tasks = { time_bound: [], due_only: [], unscheduled: [] };
        body.data.hearings = [];
        body.data.task_source_state = "ok";
        body.data.confirmation_items = [];
      }
      if (dailyMode === "start_only") {
        body.data.tasks = {
          time_bound: [],
          due_only: [],
          unscheduled: [{
            task_id: "task-needs-end",
            matter_id: "matter-1",
            matter_code: "L-001",
            matter_name: "손해배상 사건",
            title: "종료 시간 확인 업무",
            status: "todo",
            starts_at: "2026-07-30T11:00:00+09:00",
            ends_at: null,
            due_at: null,
            estimated_minutes: 35,
            scheduling_state: "needs_end_time",
          }],
        };
        body.data.hearings = [];
        body.data.task_source_state = "ok";
        body.data.confirmation_items = [{
          kind: "task_time_confirmation_required",
          task_id: "task-needs-end",
          matter_id: "matter-1",
        }];
      }
      if (outlookCalendarEnabled) {
        body.source_status = sourceStatus(
          dailyMode === "partial" ? "blocked" : "ok",
          outlookMode === "stale" ? "stale" : outlookMode === "blocked" ? "blocked" : "ok",
        );
        body.state = dailyMode === "partial" || ["stale", "blocked"].includes(outlookMode) ? "partial" : "ok";
        const visible = ["connected", "stale"].includes(connectionState);
        body.data.outlook_intervals = visible ? [
          {
            calendar_event_ref: "sha256:outlook-required",
            title: "고객 전략 회의",
            starts_at: "2026-07-30T10:30:00+09:00",
            ends_at: "2026-07-30T11:00:00+09:00",
            is_required: true,
            classification_reason: "required_upcoming",
          },
          {
            calendar_event_ref: "sha256:outlook-optional",
            title: "선택 참석 회의",
            starts_at: "2026-07-30T15:00:00+09:00",
            ends_at: "2026-07-30T15:30:00+09:00",
            is_required: false,
            classification_reason: "optional_or_unknown",
          },
        ] : [];
        body.data.required_meetings = visible ? [body.data.outlook_intervals[0]] : [];
        body.data.outlook_connection = {
          provider: "microsoft_graph",
          connection_state: connectionState,
          can_manage: true,
          delegated_scope: "Calendars.ReadBasic",
        };
      } else {
        body.data.outlook_intervals = [];
        body.data.required_meetings = [];
        body.data.outlook_connection = null;
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    }
    if (/^\/api\/hrx\/employees\/[^/]+$/.test(pathname)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          employee: {
            employee_id: pathname.split("/").at(-1),
            display_name: "김아민",
            status: "active",
            affiliation: "AMIC",
            department: "송무",
            organization_group: "법률",
          },
          employment_profile: {
            title: "파트너 변호사",
            employment_type: "full_time",
          },
          professional_profile: null,
          masked_compensation_ref: null,
        }),
      });
    }
    if (/^\/api\/hrx\/employees\/[^/]+\/employment-profiles$/.test(pathname)) {
      const employeeId = pathname.split("/").at(-2);
      const current = {
        profile_id: "profile-current",
        employee_id: employeeId,
        effective_from: "2025-01-01",
        effective_to: null,
        title: "파트너 변호사",
        employment_type: "full_time",
        status: "active",
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outcome: "ok",
          as_of: "2026-07-30",
          current,
          past: [],
          scheduled: [],
          employment_profiles: [current],
        }),
      });
    }
    if (pathname === "/api/hrx/employee-user-links") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outcome: "ok",
          links: [],
          candidates: [],
          can_manage: false,
        }),
      });
    }
    if (pathname === "/api/hrx/compensation") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          compensation_records: [],
          masked_compensation_ref: null,
          payroll_runtime_opened: false,
        }),
      });
    }
    if (pathname === "/api/hrx/employees") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outcome: "ok",
          employees: [
            {
              employee_id: "emp-1",
              display_name: "김아민",
              status: "active",
              title: "파트너 변호사",
              department: "송무",
              contact: "02-0000-0001",
              email: "member-1@example.test",
            },
            {
              employee_id: "emp-2",
              display_name: "이서윤",
              status: "active",
              title: "변호사",
              department: "자문",
              contact: "02-0000-0002",
              email: "member-2@example.test",
            },
          ],
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
  const params = new URLSearchParams({ view: "people", ctx: "allow" });
  if (employeeId) params.set("employee", employeeId);
  if (tab) params.set("tab", tab);
  await page.goto(`${baseUrl}/?${params.toString()}#${section}`, {
    waitUntil: mode === "loading" ? "domcontentloaded" : "networkidle",
  });
  if (mode !== "loading") {
    await page.locator("[data-people-overview-state]").first().waitFor();
  }
  return page;
}
