import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  HOME_DASHBOARD_API_ERROR_CODES,
  createDefaultHomeDashboardRuntime,
  createHomeDashboardSourceCollectors,
} from "../src/home-dashboard-runtime-context.js";
import { highestPrivilegeRegisteredAccount } from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { authedJson } from "./helpers/session.js";

const TENANT = "tenant_amic_matter_vault";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_home_dashboard&audit_hint_ref=audit_hint_home_dashboard`;
const FIXED_NOW = new Date("2026-07-07T09:00:00.000Z");

function xmlResponse(xml) {
  return { ok: true, status: 200, text: async () => xml };
}

function createSeedRuntime(overrides = {}) {
  return createDefaultHomeDashboardRuntime({
    now: () => new Date(FIXED_NOW),
    ...overrides,
    seed: {
      actionItems: [
        {
          id: "approval_leave_001",
          resource_id: "approval_leave_001",
          tenant_id: TENANT,
          type: "approval",
          subtype: "leave",
          title: "휴가 승인 요청",
          requester: "서지원",
          due_at: "2026-07-07T15:00:00.000Z",
          risk_tier: "low",
          raw_payload: { hidden: true },
        },
        {
          id: "approval_cost_001",
          resource_id: "approval_cost_001",
          tenant_id: TENANT,
          type: "approval",
          subtype: "cost",
          title: "비용 집행 결재",
          requester: "재무팀",
          due_at: "2026-07-08T02:00:00.000Z",
          risk_tier: "high",
        },
        {
          id: "task_late_001",
          resource_id: "task_late_001",
          tenant_id: TENANT,
          type: "task",
          subtype: "deadline",
          title: "기한 초과 문서 확인",
          due_at: "2026-07-06T23:00:00.000Z",
          risk_tier: "medium",
        },
        {
          id: "task_today_001",
          resource_id: "task_today_001",
          tenant_id: TENANT,
          type: "task",
          subtype: "todo",
          title: "오늘 처리할 검토",
          due_at: "2026-07-07T08:00:00.000Z",
          risk_tier: "normal",
        },
      ],
      agendaEvents: [
        {
          id: "agenda_001",
          resource_id: "agenda_001",
          tenant_id: TENANT,
          kind: "hearing",
          title: "변론기일",
          starts_at: "2026-07-07T02:00:00.000Z",
          ends_at: "2026-07-07T03:00:00.000Z",
          location: "서울중앙지방법원",
          matter_ref: "matter_001",
          raw_payload: { hidden: true },
        },
        {
          id: "agenda_out_of_range",
          resource_id: "agenda_out_of_range",
          tenant_id: TENANT,
          kind: "meeting",
          title: "범위 밖 회의",
          starts_at: "2026-08-01T02:00:00.000Z",
        },
      ],
      feedEntries: [
        {
          id: "notice_001",
          resource_id: "notice_001",
          tenant_id: TENANT,
          tab: "notice",
          source: "Matter",
          title: "공지",
          body_preview: "<strong>운영 공지</strong>",
          published_at: "2026-07-07T01:00:00.000Z",
          audience: "all",
        },
        {
          id: "newsletter_001",
          resource_id: "newsletter_001",
          tenant_id: TENANT,
          tab: "newsletter",
          source: "Vault tag collection",
          title: "Newsletter",
          body_preview: "Vault tagged digest",
          published_at: "2026-07-06T01:00:00.000Z",
          audience: "legal",
        },
      ],
    },
  });
}

function listMatching(records, query = {}) {
  return records
    .filter((record) => !query.tenant_id || record.tenant_id === query.tenant_id)
    .filter((record) => !query.model_type || record.model_type === query.model_type)
    .filter((record) => !query.matter_id || record.matter_id === query.matter_id);
}

function repositoryFixture(records, { failModelType = null } = {}) {
  return {
    list(query = {}) {
      if (query.model_type === failModelType) throw new Error(`${query.model_type}_SOURCE_DOWN`);
      return listMatching(records, query);
    },
  };
}

function createSourceRuntime({ failMatterTasks = false } = {}) {
  const account = highestPrivilegeRegisteredAccount();
  const hrxRuntime = {
    approvals: [
      {
        tenant_id: TENANT,
        approval_id: "approval-source-leave-001",
        object_type: "LeaveRequest",
        object_id: "leave-source-001",
        route: "manager",
        approver_role: "manager",
        state: "pending",
      },
    ],
    leaveStore: {
      list: ({ tenant_id } = {}) =>
        listMatching(
          [
            {
              tenant_id: TENANT,
              request_id: "leave-source-absence-001",
              employee_id: "employee-source-001",
              state: "approved",
              start_date: "2026-07-07T04:00:00.000Z",
              end_date: "2026-07-07T08:00:00.000Z",
            },
          ],
          { tenant_id },
        ),
    },
    peopleNotices: [
      {
        tenant_id: TENANT,
        notice_id: "notice-source-001",
        title: "Home source notice",
        body_preview: "Notice source body",
        published_at: "2026-07-07T01:00:00.000Z",
      },
    ],
    externalScheduleEvents: [
      {
        tenant_id: TENANT,
        event_id: "external-source-001",
        title: "External counsel check-in",
        starts_at: "2026-07-07T09:00:00.000Z",
        ends_at: "2026-07-07T09:30:00.000Z",
      },
    ],
  };
  const matterRuntime = {
    repository: repositoryFixture(
      [
        {
          tenant_id: TENANT,
          model_type: "MatterBuilderApprovalRequest",
          approval_request_id: "matter-approval-source-001",
          matter_id: "matter-source-001",
          title: "PreBill 정산 승인",
          status: "pending_owner_approval",
          created_at: "2026-07-07T02:00:00.000Z",
        },
        {
          tenant_id: TENANT,
          model_type: "MatterApprovalRequest",
          approval_request_id: "matter-expense-approval-source-001",
          matter_id: "matter-source-001",
          title: "출장 비용 승인",
          status: "pending_owner_approval",
          created_at: "2026-07-07T03:00:00.000Z",
        },
        {
          tenant_id: TENANT,
          model_type: "MatterTask",
          task_id: "matter-task-source-001",
          matter_id: "matter-source-001",
          title: "Review source task",
          status: "todo",
          assigned_to: account.user_id,
          due_at: "2026-07-07T10:00:00.000Z",
        },
        {
          tenant_id: TENANT,
          model_type: "MatterCalendarEvent",
          event_id: "matter-calendar-source-001",
          matter_id: "matter-source-001",
          title: "Filing deadline",
          status: "scheduled",
          starts_at: "2026-07-07T12:00:00.000Z",
          ends_at: "2026-07-07T12:30:00.000Z",
          source_ref: "matter_deadline:source",
        },
      ],
      { failModelType: failMatterTasks ? "MatterTask" : null },
    ),
  };
  const aiRuntime = {
    repository: repositoryFixture([
      {
        tenant_id: TENANT,
        model_type: "HumanReviewTask",
        review_task_id: "ai-review-source-001",
        matter_id: "matter-source-001",
        status: "open",
        reviewer_role: "manager",
        created_at: "2026-07-07T03:00:00.000Z",
      },
    ]),
  };
  const dmsRuntime = {
    repository: repositoryFixture([
      {
        tenant_id: TENANT,
        model_type: "DmsDocument",
        document_id: "newsletter-source-001",
        title: "Vault newsletter source",
        summary: "Newsletter body",
        tags: ["newsletter"],
        created_at: "2026-07-07T00:30:00.000Z",
      },
    ]),
  };
  return createDefaultHomeDashboardRuntime({
    now: () => new Date(FIXED_NOW),
    sourceCollectors: createHomeDashboardSourceCollectors({ hrxRuntime, matterRuntime, dmsRuntime, aiRuntime }),
  });
}

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  return authedJson(baseUrl, path, options);
}

test("Home dashboard API descriptor exposes Stage 3 contract without production-ready claim", async () => {
  await withServer(async (baseUrl) => {
    const { status, body } = await json(baseUrl, "/api/health");
    assert.equal(status, 200);
    const home = body.bounded_contexts.find((context) => context.bounded_context === "home-dashboard");
    assert.ok(home);
    assert.ok(home.endpoints.includes("GET /home/action-inbox"));
    assert.ok(home.endpoints.includes("GET /home/feed"));
    assert.deepEqual(home.news_connector.sources, ["bloter", "lawtimes", "dealsite", "investchosun"]);
    assert.equal(home.news_connector.full_body_storage_enabled, false);
    assert.equal(home.production_ready_claim, false);
  }, { homeDashboardRuntime: createSeedRuntime() });
});

test("Home action inbox returns safe counts, O-04 inline actions, audit, and usage events", async () => {
  const runtime = createSeedRuntime();
  await withServer(async (baseUrl) => {
    const approvals = await json(baseUrl, `/home/action-inbox?${BASE_QUERY}&type=approval`);
    assert.equal(approvals.status, 200);
    assert.equal(approvals.body.items.length, 2);
    assert.deepEqual(approvals.body.counts, { approval: 2, task_late: 1, task_today: 1 });
    assert.deepEqual(approvals.body.items.find((item) => item.id === "approval_leave_001").allowed_actions, [
      "approve",
      "reject",
      "open",
    ]);
    assert.deepEqual(approvals.body.items.find((item) => item.id === "approval_cost_001").allowed_actions, ["open"]);
    assert.equal(approvals.body.items[0].raw_payload_included, false);
    assert.equal(approvals.body.production_ready_claim, false);

    const audit = await json(baseUrl, `/home/audit?${BASE_QUERY}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.items.some((event) => event.action === "home.action_inbox.read"));
    assert.equal(audit.body.items.every((event) => event.raw_payload_included === false), true);

    const usage = await json(baseUrl, `/home/usage-events?${BASE_QUERY}`);
    assert.equal(usage.status, 200);
    assert.ok(usage.body.items.some((event) => event.event_type === "home.widget.view" && event.widget_id === "approval"));
  }, { homeDashboardRuntime: runtime });
});

test("Home action decisions are permission gated, idempotent, and limited to O-04 inline approvals", async () => {
  const runtime = createSeedRuntime();
  await withServer(async (baseUrl) => {
    const approved = await json(baseUrl, "/home/action-inbox/approval_leave_001/decision", {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "perm_ref_home_dashboard_write",
        audit_hint_ref: "audit_hint_home_dashboard_write",
        idempotency_key: "home-decision-leave-001",
        action: "approve",
      },
    });
    assert.equal(approved.status, 201);
    assert.equal(approved.body.decision.action, "approve");
    assert.equal(approved.body.audit_event.action, "home.action_inbox.decision");
    assert.equal(approved.body.audit_event.metadata.body_stored, false);
    assert.equal(approved.body.undo_expires_at, "2026-07-07T09:00:05.000Z");

    const replay = await json(baseUrl, "/api/home/action-inbox/approval_leave_001/decision", {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "perm_ref_home_dashboard_write",
        audit_hint_ref: "audit_hint_home_dashboard_write",
        idempotency_key: "home-decision-leave-001",
        action: "approve",
      },
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");

    const blocked = await json(baseUrl, "/home/action-inbox/approval_cost_001/decision", {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "perm_ref_home_dashboard_write",
        audit_hint_ref: "audit_hint_home_dashboard_write",
        idempotency_key: "home-decision-cost-001",
        action: "approve",
      },
    });
    assert.equal(blocked.status, 400);
    assert.deepEqual(blocked.body.safe_error_codes, ["HOME_ACTION_NOT_ALLOWED"]);
  }, { homeDashboardRuntime: runtime });
});

test("Home operational decisions, audit, and outbox commit atomically across restart while telemetry stays nonblocking", async () => {
  const operationalStorePath = join(mkdtempSync(join(tmpdir(), "lawos-home-operational-")), "home-operational.json");
  const staleRuntime = createSeedRuntime({ operationalStorePath });
  const runtime = createSeedRuntime({
    operationalStorePath,
    telemetrySink() {
      throw new Error("telemetry unavailable");
    },
  });
  await withServer(async (baseUrl) => {
    const response = await json(baseUrl, "/home/action-inbox/approval_leave_001/decision", {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "perm_ref_home_dashboard_write",
        audit_hint_ref: "audit_hint_home_dashboard_write",
        idempotency_key: "home-restart-decision-001",
        action: "approve",
      },
    });
    assert.equal(response.status, 201);
  }, { homeDashboardRuntime: runtime });
  assert.equal(runtime.operationalState.snapshot().state_version, 1);
  assert.equal(runtime.outboxEvents.length, 1);
  assert.equal(runtime.telemetryFailures, 1);

  await withServer(async (baseUrl) => {
    const conflict = await json(baseUrl, "/home/action-inbox/approval_leave_001/decision", {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "perm_ref_home_dashboard_write",
        audit_hint_ref: "audit_hint_home_dashboard_write",
        idempotency_key: "home-stale-writer-001",
        action: "approve",
      },
    });
    assert.equal(conflict.status, 409);
  }, { homeDashboardRuntime: staleRuntime });
  assert.equal(staleRuntime.decisions.size, 1);
  assert.equal([...staleRuntime.decisions.values()].some((decision) => decision.idempotency_key === "home-stale-writer-001"), false);
  assert.equal(staleRuntime.auditEvents.length, 1);
  assert.equal(staleRuntime.outboxEvents.length, 1);

  const reopened = createSeedRuntime({ operationalStorePath });
  assert.equal(reopened.decisions.size, 1);
  assert.equal(reopened.auditEvents.filter((event) => event.action === "home.action_inbox.decision").length, 1);
  assert.equal(reopened.outboxEvents.length, 1);
  await withServer(async (baseUrl) => {
    const replay = await json(baseUrl, "/home/action-inbox/approval_leave_001/decision", {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "perm_ref_home_dashboard_write",
        audit_hint_ref: "audit_hint_home_dashboard_write",
        idempotency_key: "home-restart-decision-001",
        action: "approve",
      },
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");

    const mismatch = await json(baseUrl, "/home/action-inbox/approval_leave_001/decision", {
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "perm_ref_home_dashboard_write",
        audit_hint_ref: "audit_hint_home_dashboard_write",
        idempotency_key: "home-restart-decision-001",
        action: "reject",
      },
    });
    assert.equal(mismatch.status, 409);
    assert.deepEqual(mismatch.body.safe_error_codes, [HOME_DASHBOARD_API_ERROR_CODES.idempotency_conflict]);
  }, { homeDashboardRuntime: reopened });
  assert.equal(reopened.outboxEvents.length, 1);
});

test("Home agenda and Vault-tag newsletter feed return sanitized contract shapes", async () => {
  const runtime = createSeedRuntime();
  await withServer(async (baseUrl) => {
    const agenda = await json(baseUrl, `/home/agenda?${BASE_QUERY}&from=2026-07-07T00:00:00.000Z&to=2026-07-07T23:59:59.000Z`);
    assert.equal(agenda.status, 200);
    assert.equal(agenda.body.events.length, 1);
    assert.equal(agenda.body.events[0].kind, "hearing");
    assert.equal(agenda.body.events[0].raw_payload_included, false);

    const newsletter = await json(baseUrl, `/home/feed?${BASE_QUERY}&tab=newsletter`);
    assert.equal(newsletter.status, 200);
    assert.equal(newsletter.body.entries.length, 1);
    assert.equal(newsletter.body.entries[0].source, "Vault tag collection");
    assert.equal(newsletter.body.entries[0].body_preview, "Vault tagged digest");
    assert.equal(newsletter.body.entries[0].full_body_included, false);
  }, { homeDashboardRuntime: runtime });
});

test("Home dashboard aggregates HRX, Matter, AI, agenda, notice, and Vault newsletter sources without seed data", async () => {
  const runtime = createSourceRuntime();
  await withServer(async (baseUrl) => {
    const approvals = await json(baseUrl, `/home/action-inbox?${BASE_QUERY}&type=approval&role=manager`);
    assert.equal(approvals.status, 200);
    assert.equal(approvals.body.outcome, "passed");
    assert.ok(approvals.body.items.some((item) => item.id === "hrx_approval:approval-source-leave-001"));
    assert.ok(approvals.body.items.some((item) => item.id === "matter_approval:matter-approval-source-001"));
    assert.equal(approvals.body.items.find((item) => item.id === "matter_approval:matter-approval-source-001").subtype, "finance");
    assert.equal(approvals.body.items.find((item) => item.id === "matter_approval:matter-expense-approval-source-001").subtype, "expenses");
    assert.ok(approvals.body.items.some((item) => item.id === "ai_review:ai-review-source-001"));
    assert.ok(approvals.body.source_statuses.every((status) => status.status === "ok"));

    const tasks = await json(baseUrl, `/home/action-inbox?${BASE_QUERY}&type=task`);
    assert.equal(tasks.status, 200);
    assert.equal(tasks.body.items.length, 1);
    assert.equal(tasks.body.items[0].id, "matter_task:matter-task-source-001");
    assert.equal(tasks.body.items[0].due_at, "2026-07-07T10:00:00.000Z");

    const agenda = await json(baseUrl, `/home/agenda?${BASE_QUERY}&from=2026-07-07T00:00:00.000Z&to=2026-07-07T23:59:59.000Z`);
    assert.equal(agenda.status, 200);
    assert.ok(agenda.body.events.some((event) => event.kind === "deadline"));
    assert.ok(agenda.body.events.some((event) => event.kind === "external"));
    assert.ok(agenda.body.events.some((event) => event.kind === "absence"));

    const notices = await json(baseUrl, `/home/feed?${BASE_QUERY}&tab=notice`);
    assert.equal(notices.status, 200);
    assert.equal(notices.body.entries[0].source, "People notices");
    assert.equal(notices.body.entries[0].body_preview, "Notice source body");

    const newsletter = await json(baseUrl, `/home/feed?${BASE_QUERY}&tab=newsletter`);
    assert.equal(newsletter.status, 200);
    assert.equal(newsletter.body.entries[0].source, "Vault tag collection");
    assert.equal(newsletter.body.entries[0].body_preview, "Newsletter body");
  }, { homeDashboardRuntime: runtime });
});

test("Home dashboard source aggregation returns partial success when one runtime source fails", async () => {
  const runtime = createSourceRuntime({ failMatterTasks: true });
  await withServer(async (baseUrl) => {
    const approvals = await json(baseUrl, `/home/action-inbox?${BASE_QUERY}&type=approval&role=manager`);
    assert.equal(approvals.status, 200);
    assert.equal(approvals.body.outcome, "partial");
    assert.ok(approvals.body.items.some((item) => item.id === "hrx_approval:approval-source-leave-001"));
    assert.ok(approvals.body.source_statuses.some((status) => status.source === "matter_tasks" && status.status === "failed"));
    assert.deepEqual(approvals.body.safe_error_codes, []);
  }, { homeDashboardRuntime: runtime });
});

test("Home news feed isolates RSS source failures, link-outs only, and caches source results", async () => {
  const fetchUrls = [];
  const runtime = createSeedRuntime({
    newsFetch: async (url) => {
      fetchUrls.push(url);
      if (new URL(url).hostname === "cdn.bloter.net") {
        return xmlResponse(`
          <rss><channel>
            <item>
              <title><![CDATA[블로터 기사]]></title>
              <link>https://www.bloter.net/news/articleView.html?idxno=1</link>
              <pubDate>Tue, 07 Jul 2026 09:00:00 GMT</pubDate>
              <description><![CDATA[<script >비공개 스크립트</script >본문 미리보기 &amp;lt;보존&amp;gt;]]></description>
            </item>
          </channel></rss>
        `);
      }
      throw new Error("source unavailable");
    },
  });

  await withServer(async (baseUrl) => {
    const news = await json(baseUrl, `/home/feed?${BASE_QUERY}&tab=news`);
    assert.equal(news.status, 200);
    assert.equal(news.body.outcome, "partial");
    assert.equal(news.body.entries.length, 1);
    assert.equal(news.body.entries[0].source, "Bloter");
    assert.equal(news.body.entries[0].url, "https://www.bloter.net/news/articleView.html?idxno=1");
    assert.equal(news.body.entries[0].body_preview, "본문 미리보기 &lt;보존&gt;");
    assert.equal(JSON.stringify(news.body.entries[0]).includes("비공개 스크립트"), false);
    assert.equal(news.body.entries[0].full_body_included, false);
    assert.ok(news.body.source_statuses.some((status) => status.source === "lawtimes" && status.status === "failed"));
    assert.deepEqual(news.body.safe_error_codes, ["HOME_NEWS_SOURCE_FAILED"]);
    const fetchCount = fetchUrls.length;

    const cached = await json(baseUrl, `/home/feed?${BASE_QUERY}&tab=news`);
    assert.equal(cached.status, 200);
    assert.equal(fetchUrls.length, fetchCount);
    assert.ok(cached.body.source_statuses.every((status) => status.cached === true));
  }, { homeDashboardRuntime: runtime });
});

test("Home dashboard API rejects unsigned access before permission context is trusted", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, `/home/action-inbox?${BASE_QUERY}`, { noAuth: true });
    assert.equal(denied.status, 401);
    assert.deepEqual(denied.body.safe_error_codes, ["AUTH_SESSION_REQUIRED"]);
  }, { homeDashboardRuntime: createSeedRuntime() });
});
