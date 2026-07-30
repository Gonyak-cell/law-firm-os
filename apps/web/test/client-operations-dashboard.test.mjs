import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClientOperationsDashboardModel,
  resolveClientOperationsDestination,
} from "../src/components/ClientOperationsDashboardModel.js";
import {
  fetchAnalyticsClientOperationsDashboard,
} from "../src/data/apiClient.js";

function sections() {
  return {
    kpis: {
      status: "available",
      data: {
        values: {
          new_inquiries: 1,
          consultations_today: 1,
          engagement_reviews: 1,
          deposit_revenue_month: 33_000_000,
          receivables_total: 9_000_000,
        },
        metric_statuses: {
          new_inquiries: "available",
          consultations_today: "available",
          engagement_reviews: "available",
          deposit_revenue_month: "available",
          receivables_total: "available",
        },
        currency: "KRW",
      },
    },
    attention_items: {
      status: "available",
      data: {
        items: [
          {
            attention_item_id: "lead_new",
            attention_type: "unassigned_new_inquiry",
            label: "새 문의 담당자 지정",
            title: "새봄테크",
            occurred_at: "2026-07-30T00:10:00.000Z",
            amount: null,
            currency: null,
            assigned_user_id: null,
            destination: {
              section: "new_inquiries",
              record_id: "lead_new",
              filter: "new",
            },
          },
          {
            attention_item_id: "consultation_today",
            attention_type: "consultation_today",
            label: "오늘 상담",
            title: "한빛건설",
            due_at: "2026-07-30T05:00:00.000Z",
            amount: null,
            currency: null,
            assigned_user_id: "principal_partner",
            destination: {
              section: "consultations",
              record_id: "consultation_today",
              inquiry_id: "lead_consultation",
              filter: "today",
            },
          },
        ],
        type_statuses: {
          unassigned_new_inquiry: "available",
          consultation_today: "available",
        },
      },
    },
    monthly_deposit_revenue: { status: "no_data", data: null },
    inquiry_status: { status: "no_data", data: null },
    revenue_ranking: { status: "no_data", data: null },
    receivables_ranking: { status: "no_data", data: null },
  };
}

function dashboardBody(overrides = {}) {
  return {
    request_id: "client-dashboard-test",
    generated_at: "2026-07-30T03:00:05.000Z",
    as_of: "2026-07-30T03:00:00.000Z",
    timezone: "Asia/Seoul",
    outcome: "complete",
    ui_state: null,
    sections: sections(),
    source_statuses: [],
    safe_error_codes: [],
    audit_hint_ref: "client-dashboard-test-audit",
    count_leak_prevented: true,
    permission_prefilter_applied: true,
    raw_bank_source_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    production_ready_claim: false,
    ...overrides,
  };
}

function dashboardResult(body = dashboardBody()) {
  return {
    kind: "data",
    status: 200,
    requestId: body.request_id,
    outcome: body.outcome,
    uiState: body.ui_state,
    generatedAt: body.generated_at,
    asOf: body.as_of,
    timezone: body.timezone,
    sections: body.sections,
    sourceStatuses: body.source_statuses,
    safeErrorCodes: body.safe_error_codes,
  };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function withFetch(response, callback) {
  const previousFetch = globalThis.fetch;
  let request = null;
  globalThis.fetch = async (input, init) => {
    request = { input, init };
    return response;
  };
  try {
    return {
      result: await callback(),
      request,
    };
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test("VC-CL-DASH-001 / CL-P5-W01-T02 KPI와 오늘 확인할 일의 값과 상세 이동을 고정한다", () => {
  const model = buildClientOperationsDashboardModel(
    dashboardResult(),
  );

  assert.equal(model.state, "data");
  assert.deepEqual(
    model.kpis.map(({ id, value, state }) => ({
      id,
      value,
      state,
    })),
    [
      { id: "new_inquiries", value: 1, state: "data" },
      { id: "consultations_today", value: 1, state: "data" },
      { id: "engagement_reviews", value: 1, state: "data" },
      {
        id: "deposit_revenue_month",
        value: 33_000_000,
        state: "data",
      },
      {
        id: "receivables_total",
        value: 9_000_000,
        state: "data",
      },
    ],
  );
  assert.deepEqual(model.kpis[0].route, {
    view: "clients",
    section: "client-leads",
    routeContext: { filter: "new" },
  });
  assert.deepEqual(model.attention.items[1].route, {
    view: "clients",
    section: "client-consultation-proposals",
    routeContext: {
      filter: "today",
      recordId: "consultation_today",
      inquiryId: "lead_consultation",
    },
  });
  assert.equal(model.attention.items[1].assigned, true);
});

test("VC-CL-DASH-002 / CL-P5-W01-T02 일부 원천 실패를 0으로 바꾸지 않는다", () => {
  const body = dashboardBody({
    outcome: "partial",
    ui_state: "partial",
  });
  body.sections.kpis.status = "partial";
  for (const metric of [
    "new_inquiries",
    "consultations_today",
    "engagement_reviews",
  ]) {
    body.sections.kpis.data.values[metric] = null;
    body.sections.kpis.data.metric_statuses[metric] = "error";
  }
  body.sections.attention_items.status = "partial";
  body.sections.attention_items.data.items = [];

  const model = buildClientOperationsDashboardModel(
    dashboardResult(body),
  );

  assert.equal(model.state, "partial");
  assert.deepEqual(
    model.kpis.slice(0, 3).map(({ state, value }) => ({
      state,
      value,
    })),
    [
      { state: "error", value: null },
      { state: "error", value: null },
      { state: "error", value: null },
    ],
  );
  assert.equal(model.kpis[3].value, 33_000_000);
  assert.equal(model.kpis[4].value, 9_000_000);
  assert.equal(model.attention.state, "partial");
});

test("CL-P5-W01-T02 알 수 없는 상세 목적지는 클릭 경로로 만들지 않는다", () => {
  assert.equal(
    resolveClientOperationsDestination({
      section: "hidden_admin",
      record_id: "secret-record",
    }),
    null,
  );
});

test("CL-P5-W01-T02 Client 대시보드 API 어댑터가 성공, 권한 없음, 잘못된 응답을 구분한다", async () => {
  const success = await withFetch(
    jsonResponse(200, dashboardBody()),
    () => fetchAnalyticsClientOperationsDashboard(),
  );
  assert.equal(success.result.kind, "data");
  assert.equal(
    success.result.sections.kpis.data.values
      .deposit_revenue_month,
    33_000_000,
  );
  assert.match(
    String(success.request.input),
    /\/api\/analytics\/clients\/dashboard\?/,
  );
  assert.match(
    String(success.request.input),
    /timezone=Asia%2FSeoul/,
  );
  assert.match(
    success.request.init.headers["x-lawos-permission-context"],
    /analytics_user/,
  );

  const denied = await withFetch(
    jsonResponse(403, {
      request_id: "client-dashboard-denied",
      outcome: "permission_denied",
      ui_state: "permission_denied",
      source_statuses: [],
      safe_error_codes: [
        "CLIENT_OPERATIONS_CLIENT_READ_DENIED",
      ],
      count_leak_prevented: true,
      production_ready_claim: false,
    }),
    () => fetchAnalyticsClientOperationsDashboard(),
  );
  assert.equal(denied.result.kind, "guarded");
  assert.equal(denied.result.uiState, "denied");

  const malformed = await withFetch(
    jsonResponse(200, {
      request_id: "client-dashboard-malformed",
      outcome: "complete",
      sections: {},
      source_statuses: [],
      safe_error_codes: [],
    }),
    () => fetchAnalyticsClientOperationsDashboard(),
  );
  assert.equal(malformed.result.kind, "error");
});
