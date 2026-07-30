import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnalyticsRepository,
} from "../../../packages/analytics/src/runtime-repository.js";
import {
  createFinanceRepository,
} from "../../../packages/billing/src/finance-repository.js";
import {
  createAnalyticsRuntimeContext,
  handleAnalyticsApiRequest,
} from "../src/analytics-runtime-context.js";
import {
  findRegisteredAccountByUserId,
  MATTER_VAULT_REGISTERED_TENANT_ID,
} from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const AS_OF = "2026-07-30T03:00:00.000Z";
const GENERATED_AT = "2026-07-30T03:00:05.000Z";
const STAFF_ACCOUNT = findRegisteredAccountByUserId(
  "user_amic_sypark",
);
assert.ok(STAFF_ACCOUNT);

function repository(records = [], failure = null) {
  return {
    list(query = {}) {
      if (failure) throw failure;
      return records.filter((record) => (
        (!query.tenant_id || record.tenant_id === query.tenant_id)
        && (
          !query.model_type
          || record.model_type === query.model_type
        )
      ));
    },
  };
}

function clientRecord() {
  return {
    model_type: "ClientGroup",
    tenant_id: TENANT,
    client_group_id: "client_api_dashboard",
    display_name: "API 고객",
    member_party_ids: ["party_api_dashboard"],
    primary_party_id: "party_api_dashboard",
    status: "active",
  };
}

function leadRecord() {
  return {
    model_type: "Lead",
    tenant_id: TENANT,
    lead_id: "lead_api_dashboard",
    party_id: "party_api_dashboard",
    client_group_id: "client_api_dashboard",
    display_name: "API 새 문의",
    inquiry_status: "new",
    source: "manual",
    received_at: "2026-07-30T01:00:00.000Z",
    next_action: "문의 확인",
    assigned_user_id: null,
    status: "active",
    owner_user_id: "user_amic_jwsuh",
    version: 1,
  };
}

function analyticsRuntime({
  masterDataRepository = repository([clientRecord()]),
  crmRepository = repository([leadRecord()]),
  financeRepository = createFinanceRepository(),
} = {}) {
  return {
    runtime: createAnalyticsRuntimeContext({
      repository: createAnalyticsRepository(),
      masterDataRepository,
      crmRepository,
      financeRepository,
      clock: () => new Date(GENERATED_AT),
    }),
    financeRepository,
  };
}

function query(overrides = {}) {
  return new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: "client-operations-dashboard-read",
    audit_hint_ref: "client-operations-dashboard-audit",
    as_of: AS_OF,
    revenue_ranking_period: "year",
    ...overrides,
  }).toString();
}

async function withServer(options, callback) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function get(baseUrl, path, account = null) {
  const headers = await apiSessionHeaders(
    baseUrl,
    account ?? undefined,
  );
  const response = await fetch(`${baseUrl}${path}`, { headers });
  return {
    status: response.status,
    body: await response.json(),
  };
}

test("VC-CL-DASH-001 / CL-P4-W01-T05 실제 API가 Client 대시보드 묶음과 원천 시각을 반환한다", async () => {
  const fixture = analyticsRuntime();
  try {
    await withServer({
      analyticsRuntime: fixture.runtime,
    }, async (baseUrl) => {
      const health = await get(baseUrl, "/api/health");
      const analytics = health.body.bounded_contexts.find(
        ({ bounded_context }) => (
          bounded_context === "analytics"
        ),
      );
      assert.ok(analytics.endpoints.includes(
        "GET /api/analytics/clients/dashboard",
      ));

      const response = await get(
        baseUrl,
        `/api/analytics/clients/dashboard?${query()}`,
      );
      assert.equal(response.status, 200);
      assert.equal(response.body.outcome, "complete");
      assert.equal(response.body.generated_at, GENERATED_AT);
      assert.deepEqual(
        response.body.sections.kpis.data.values,
        {
          new_inquiries: 1,
          consultations_today: 0,
          engagement_reviews: 0,
          deposit_revenue_month: 0,
          receivables_total: 0,
        },
      );
      assert.deepEqual(
        response.body.sections.attention_items.data
          .attention_item_ids,
        ["lead_api_dashboard"],
      );
      assert.equal(
        response.body.sections.monthly_deposit_revenue
          .data.points.length,
        12,
      );
      assert.equal(
        response.body.source_statuses.find(
          ({ source_id }) => source_id === "crm",
        ).latest_record_at,
        "2026-07-30T01:00:00.000Z",
      );
      assert.equal(
        response.body.raw_bank_source_included,
        false,
      );

      const invalid = await get(
        baseUrl,
        `/api/analytics/clients/dashboard?${query({
          revenue_ranking_period: "rolling",
        })}`,
      );
      assert.equal(invalid.status, 400);
      assert.deepEqual(
        invalid.body.safe_error_codes,
        ["ANALYTICS_API_VALIDATION_ERROR"],
      );
    });
  } finally {
    fixture.financeRepository.close();
  }
});

test("CL-P4-W01-T05 일반 직원은 입금 연결 확인만 권한 없음으로 받고 다른 대시보드 값은 유지한다", async () => {
  const fixture = analyticsRuntime();
  try {
    await withServer({
      analyticsRuntime: fixture.runtime,
    }, async (baseUrl) => {
      const response = await get(
        baseUrl,
        `/api/analytics/clients/dashboard?${query()}`,
        STAFF_ACCOUNT,
      );
      assert.equal(response.status, 200);
      assert.equal(response.body.outcome, "partial");
      assert.equal(
        response.body.sections.kpis.data.values.new_inquiries,
        1,
      );
      const bankSource = response.body.source_statuses.find(
        ({ source_id }) => source_id === "bank_review",
      );
      assert.equal(bankSource.status, "permission_denied");
      assert.equal(bankSource.item_count, null);
      assert.equal(
        response.body.sections.attention_items.data
          .type_statuses.bank_match_review,
        "permission_denied",
      );
    });
  } finally {
    fixture.financeRepository.close();
  }
});

test("VC-CL-DASH-002 / CL-P4-W01-T05 실제 API는 CRM 장애를 부분 응답으로 격리한다", async () => {
  const fixture = analyticsRuntime({
    crmRepository: repository(
      [],
      new Error("private CRM API failure"),
    ),
  });
  try {
    await withServer({
      analyticsRuntime: fixture.runtime,
    }, async (baseUrl) => {
      const response = await get(
        baseUrl,
        `/api/analytics/clients/dashboard?${query()}`,
      );
      assert.equal(response.status, 200);
      assert.equal(response.body.outcome, "partial");
      assert.deepEqual(
        response.body.sections.kpis.data.values,
        {
          new_inquiries: null,
          consultations_today: null,
          engagement_reviews: null,
          deposit_revenue_month: 0,
          receivables_total: 0,
        },
      );
      assert.equal(
        response.body.sections.inquiry_status.data,
        null,
      );
      assert.equal(
        response.body.sections.monthly_deposit_revenue
          .data.total,
        0,
      );
      assert.equal(
        response.body.source_statuses.find(
          ({ source_id }) => source_id === "crm",
        ).status,
        "error",
      );
      assert.equal(
        JSON.stringify(response.body).includes(
          "private CRM API failure",
        ),
        false,
      );
    });
  } finally {
    fixture.financeRepository.close();
  }
});

test("CL-P4-W01-T05 실제 API와 route gate가 고객 없음·고객 권한 없음을 구분한다", async () => {
  const noClientsFixture = analyticsRuntime({
    masterDataRepository: repository([]),
  });
  try {
    await withServer({
      analyticsRuntime: noClientsFixture.runtime,
    }, async (baseUrl) => {
      const response = await get(
        baseUrl,
        `/api/analytics/clients/dashboard?${query()}`,
      );
      assert.equal(response.status, 200);
      assert.equal(response.body.outcome, "empty");
      assert.equal(response.body.ui_state, "no_data");
      assert.equal(response.body.downstream_sources_read, false);
    });
  } finally {
    noClientsFixture.financeRepository.close();
  }

  const fixture = analyticsRuntime();
  try {
    const denied = await handleAnalyticsApiRequest({
      pathname: "/api/analytics/clients/dashboard",
      method: "GET",
      query: Object.fromEntries(
        new URLSearchParams(query()),
      ),
      context: {
        principal: {
          user_id: "user_denied_dashboard",
          tenant_id: TENANT,
          role_ids: ["client_denied"],
        },
        rules: [],
        object_acl: [],
      },
      requestId: "request-client-dashboard-denied",
      runtime: fixture.runtime,
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.ui_state, "denied");
    assert.equal(denied.body.count_leak_prevented, true);
  } finally {
    fixture.financeRepository.close();
  }
});

test("CL-P4-W01-T05 고객 원천 장애는 안전한 503으로 격리한다", async () => {
  const fixture = analyticsRuntime({
    masterDataRepository: repository(
      [],
      new Error("private master data failure"),
    ),
  });
  try {
    await withServer({
      analyticsRuntime: fixture.runtime,
    }, async (baseUrl) => {
      const response = await get(
        baseUrl,
        `/api/analytics/clients/dashboard?${query()}`,
      );
      assert.equal(response.status, 503);
      assert.equal(response.body.outcome, "blocked");
      assert.equal(response.body.ui_state, "error");
      assert.deepEqual(
        response.body.safe_error_codes,
        ["CLIENT_OPERATIONS_CLIENT_SCOPE_UNAVAILABLE"],
      );
      assert.deepEqual(response.body.source_statuses, [{
        source_id: "master_data",
        label: "고객 정보",
        status: "error",
        checked_at: response.body.generated_at,
        latest_record_at: null,
        item_count: null,
        safe_error_code:
          "CLIENT_OPERATIONS_CLIENT_SCOPE_UNAVAILABLE",
      }]);
      assert.equal(response.body.raw_source_payload_included, false);
      assert.equal(response.body.credential_material_included, false);
      assert.equal(
        JSON.stringify(response.body).includes(
          "private master data failure",
        ),
        false,
      );
    });
  } finally {
    fixture.financeRepository.close();
  }
});
