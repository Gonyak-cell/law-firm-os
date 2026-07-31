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
  matterRepository = repository([]),
  financeRepository = createFinanceRepository(),
} = {}) {
  return {
    runtime: createAnalyticsRuntimeContext({
      repository: createAnalyticsRepository(),
      masterDataRepository,
      crmRepository,
      matterRepository,
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
      assert.ok(analytics.endpoints.includes(
        "GET /api/analytics/clients",
      ));
      assert.ok(analytics.endpoints.includes(
        "GET /api/analytics/clients/:client_group_id/operations",
      ));

      const directory = await get(
        baseUrl,
        `/api/analytics/clients?${query()}`,
      );
      assert.equal(directory.status, 200);
      assert.deepEqual(
        directory.body.items.map(
          ({ client_group_id }) => client_group_id,
        ),
        ["client_api_dashboard"],
      );
      assert.equal(
        directory.body.page_info.omitted_item_count,
        null,
      );

      const detail = await get(
        baseUrl,
        `/api/analytics/clients/client_api_dashboard/operations?${query()}`,
      );
      assert.equal(detail.status, 200);
      assert.equal(
        detail.body.item.client.client_group_id,
        "client_api_dashboard",
      );
      assert.deepEqual(
        detail.body.item.sections.inquiries.data.items.map(
          ({ lead_id }) => lead_id,
        ),
        ["lead_api_dashboard"],
      );

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

function clientDirectoryContext({ matterRead = true } = {}) {
  return {
    principal: {
      user_id: "user_client_directory",
      tenant_id: TENANT,
      role_ids: ["lawos_staff"],
    },
    rules: [
      {
        id: "client-directory-route-read",
        effect: "allow",
        action: "analytics:client:read",
      },
      {
        id: "client-directory-inquiry-read",
        effect: "allow",
        action: "crm:inquiry:read",
      },
      {
        id: "client-directory-consultation-read",
        effect: "allow",
        action: "crm:consultation:read",
      },
      ...(matterRead ? [{
        id: "client-directory-matter-read",
        effect: "allow",
        action: "matter:read",
      }] : []),
    ],
    object_acl: [{
      id: "client-directory-hidden-deny",
      effect: "deny",
      principal_id: "user_client_directory",
      action: "analytics:client:read",
      client_group_id: "client_api_hidden",
    }],
  };
}

function clientDirectoryMasterData() {
  return [
    {
      ...clientRecord(),
      member_entity_ids: ["entity_api_client"],
      primary_entity_id: "entity_api_client",
      legal_form: "주식회사",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client_api_hidden",
      display_name: "API 고객",
      member_party_ids: ["party_api_hidden"],
      member_entity_ids: ["entity_api_hidden"],
      primary_party_id: "party_api_hidden",
      primary_entity_id: "entity_api_hidden",
      status: "active",
    },
    {
      model_type: "Relationship",
      tenant_id: TENANT,
      relationship_id: "relationship_api_contact",
      from_entity_id: "entity_api_contact",
      to_entity_id: "entity_api_client",
      relationship_type: "contact_for",
    },
    {
      model_type: "Relationship",
      tenant_id: TENANT,
      relationship_id: "relationship_api_adverse",
      from_entity_id: "entity_api_adverse",
      to_entity_id: "entity_api_client",
      relationship_type: "adverse",
    },
    {
      model_type: "Person",
      tenant_id: TENANT,
      person_id: "person_api_contact",
      party_id: "party_api_contact",
      entity_id: "entity_api_contact",
      display_name: "API 담당자",
      status: "active",
    },
    {
      model_type: "ContactPoint",
      tenant_id: TENANT,
      contact_point_id: "contact_point_api",
      owner_entity_id: "entity_api_contact",
      contact_type: "email",
      value: "private-api-contact@example.test",
      is_primary: true,
      status: "active",
    },
    {
      model_type: "Person",
      tenant_id: TENANT,
      person_id: "person_api_adverse",
      party_id: "party_api_adverse",
      entity_id: "entity_api_adverse",
      display_name: "API 상대방",
      status: "active",
    },
    {
      model_type: "Person",
      tenant_id: TENANT,
      person_id: "person_api_hidden_same_name",
      party_id: "party_api_hidden_contact",
      entity_id: "entity_api_hidden_contact",
      display_name: "API 담당자",
      status: "active",
    },
  ];
}

function clientDirectoryMatters() {
  return [
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: "matter_api_allowed",
      matter_code: "API-001",
      matter_name: "API 허용 사건",
      client_group_id: "client_api_dashboard",
      status: "open",
      opened_at: "2026-07-30T00:00:00.000Z",
    },
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: "matter_api_hidden",
      matter_code: "API-002",
      matter_name: "API 숨은 사건",
      client_group_id: "client_api_hidden",
      status: "open",
      opened_at: "2026-07-30T01:00:00.000Z",
    },
  ];
}

test("CL-P5-W02-T01 고객 목록·상세 API는 허용 고객만 반환하고 원천 값을 숨긴다", async () => {
  const fixture = analyticsRuntime({
    masterDataRepository: repository(clientDirectoryMasterData()),
    matterRepository: repository(clientDirectoryMatters()),
  });
  const queryObject = Object.fromEntries(new URLSearchParams(query()));
  const context = clientDirectoryContext();
  try {
    const directory = await handleAnalyticsApiRequest({
      pathname: "/api/analytics/clients",
      method: "GET",
      query: queryObject,
      context,
      requestId: "request-client-directory",
      runtime: fixture.runtime,
    });
    assert.equal(directory.status, 200);
    assert.deepEqual(
      directory.body.items.map(({ client_group_id }) => client_group_id),
      ["client_api_dashboard"],
    );
    assert.equal(directory.body.page_info.returned_count, 1);
    assert.equal(directory.body.page_info.omitted_item_count, null);
    assert.equal(directory.body.permission_prefilter_applied, true);
    assert.equal(directory.body.count_leak_prevented, true);
    assert.equal(
      JSON.stringify(directory.body).includes("client_api_hidden"),
      false,
    );

    const detail = await handleAnalyticsApiRequest({
      pathname:
        "/api/analytics/clients/client_api_dashboard/operations",
      method: "GET",
      query: queryObject,
      context,
      requestId: "request-client-detail",
      runtime: fixture.runtime,
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.item.client.client_group_id,
      "client_api_dashboard");
    assert.deepEqual(
      detail.body.item.sections.contacts.data.items.map(
        ({ contact_id }) => contact_id,
      ),
      ["person_api_contact"],
    );
    assert.deepEqual(
      detail.body.item.sections.matters.data.items.map(
        ({ matter_id }) => matter_id,
      ),
      ["matter_api_allowed"],
    );
    assert.deepEqual(
      detail.body.item.sections.inquiries.data.items.map(
        ({ lead_id }) => lead_id,
      ),
      ["lead_api_dashboard"],
    );
    const serialized = JSON.stringify(detail.body);
    for (const hidden of [
      "private-api-contact@example.test",
      "person_api_hidden_same_name",
      "person_api_adverse",
      "API 상대방",
      "matter_api_hidden",
      "client_api_hidden",
    ]) {
      assert.equal(serialized.includes(hidden), false);
    }
    assert.equal(detail.body.item.raw_contact_values_included, false);
    assert.equal(detail.body.raw_source_payload_included, false);
  } finally {
    fixture.financeRepository.close();
  }
});

test("CL-P5-W02-T01 고객별 ACL 허용만 있는 사용자도 허용 고객 목록과 상세를 읽는다", async () => {
  const context = clientDirectoryContext();
  context.rules = context.rules.filter(
    ({ action }) => action !== "analytics:client:read",
  );
  context.object_acl.push({
    id: "client-directory-object-allow",
    effect: "allow",
    principal_id: "user_client_directory",
    action: "analytics:client:read",
    client_group_id: "client_api_dashboard",
  });
  const fixture = analyticsRuntime({
    masterDataRepository: repository(clientDirectoryMasterData()),
    matterRepository: repository(clientDirectoryMatters()),
  });
  const queryObject = Object.fromEntries(new URLSearchParams(query()));
  try {
    const directory = await handleAnalyticsApiRequest({
      pathname: "/api/analytics/clients",
      method: "GET",
      query: queryObject,
      context,
      requestId: "request-client-directory-object-allow",
      runtime: fixture.runtime,
    });
    const detail = await handleAnalyticsApiRequest({
      pathname:
        "/api/analytics/clients/client_api_dashboard/operations",
      method: "GET",
      query: queryObject,
      context,
      requestId: "request-client-detail-object-allow",
      runtime: fixture.runtime,
    });

    assert.equal(directory.status, 200);
    assert.deepEqual(
      directory.body.items.map(({ client_group_id }) => client_group_id),
      ["client_api_dashboard"],
    );
    assert.equal(detail.status, 200);
    assert.equal(
      detail.body.item.client.client_group_id,
      "client_api_dashboard",
    );
    assert.equal(
      JSON.stringify(directory.body).includes("client_api_hidden"),
      false,
    );
  } finally {
    fixture.financeRepository.close();
  }
});

test("CL-P5-W02-T01 고객 상세 API는 Matter 권한 부재를 부분 상태로 격리한다", async () => {
  const fixture = analyticsRuntime({
    masterDataRepository: repository(clientDirectoryMasterData()),
    matterRepository: {
      list() {
        throw new Error("Matter must not be read");
      },
    },
  });
  try {
    const response = await handleAnalyticsApiRequest({
      pathname:
        "/api/analytics/clients/client_api_dashboard/operations",
      method: "GET",
      query: Object.fromEntries(new URLSearchParams(query())),
      context: clientDirectoryContext({ matterRead: false }),
      requestId: "request-client-detail-partial",
      runtime: fixture.runtime,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.outcome, "partial");
    assert.equal(
      response.body.item.sections.matters.status,
      "permission_denied",
    );
    assert.equal(response.body.item.sections.matters.data, null);
    assert.equal(
      response.body.item.source_statuses.find(
        ({ source_id }) => source_id === "matters",
      ).item_count,
      null,
    );
    assert.equal(
      response.body.item.sections.contacts.status,
      "available",
    );
  } finally {
    fixture.financeRepository.close();
  }
});

test("CL-P5-W02-T01 고객 상세 API는 개별 객체 누락 건수를 숨기고 허용 자료만 반환한다", async () => {
  const context = clientDirectoryContext();
  context.object_acl.push({
    id: "client-directory-matter-object-deny",
    effect: "deny",
    principal_id: "user_client_directory",
    action: "matter:read",
    resource_id: "matter_api_object_hidden",
  });
  const fixture = analyticsRuntime({
    masterDataRepository: repository(clientDirectoryMasterData()),
    matterRepository: repository([
      ...clientDirectoryMatters(),
      {
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: "matter_api_object_hidden",
        matter_code: "API-HIDDEN",
        matter_name: "API 권한 밖 사건",
        client_group_id: "client_api_dashboard",
        status: "open",
        opened_at: "2026-07-30T02:00:00.000Z",
      },
    ]),
  });
  try {
    const response = await handleAnalyticsApiRequest({
      pathname:
        "/api/analytics/clients/client_api_dashboard/operations",
      method: "GET",
      query: Object.fromEntries(new URLSearchParams(query())),
      context,
      requestId: "request-client-detail-object-partial",
      runtime: fixture.runtime,
    });
    const matterSource = response.body.item.source_statuses.find(
      ({ source_id }) => source_id === "matters",
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.outcome, "partial");
    assert.equal(
      response.body.item.sections.matters.status,
      "partial",
    );
    assert.deepEqual(
      response.body.item.sections.matters.data.items.map(
        ({ matter_id }) => matter_id,
      ),
      ["matter_api_allowed"],
    );
    assert.equal(matterSource.item_count, null);
    assert.equal(
      matterSource.safe_error_code,
      "CLIENT_OPERATIONS_MATTER_OBJECTS_OMITTED",
    );
    const serialized = JSON.stringify(response.body);
    for (const hidden of [
      "matter_api_object_hidden",
      "API-HIDDEN",
      "API 권한 밖 사건",
    ]) {
      assert.equal(serialized.includes(hidden), false);
    }
  } finally {
    fixture.financeRepository.close();
  }
});

test("CL-P5-W02-T01 고객 상세 API는 권한 밖 ID와 없는 ID를 구분하지 않는다", async () => {
  let downstreamReadCount = 0;
  const noDownstream = {
    list() {
      downstreamReadCount += 1;
      throw new Error("Downstream must not be read");
    },
  };
  const fixture = analyticsRuntime({
    masterDataRepository: repository(clientDirectoryMasterData()),
    crmRepository: noDownstream,
    matterRepository: noDownstream,
  });
  const request = {
    method: "GET",
    query: Object.fromEntries(new URLSearchParams(query())),
    context: clientDirectoryContext(),
    requestId: "request-client-not-found",
    runtime: fixture.runtime,
  };
  try {
    const denied = await handleAnalyticsApiRequest({
      ...request,
      pathname:
        "/api/analytics/clients/client_api_hidden/operations",
    });
    const unknown = await handleAnalyticsApiRequest({
      ...request,
      pathname:
        "/api/analytics/clients/client_api_unknown/operations",
    });

    assert.equal(denied.status, 404);
    assert.deepEqual(denied, unknown);
    assert.equal(downstreamReadCount, 0);
    assert.equal(
      JSON.stringify(denied).includes("client_api_hidden"),
      false,
    );
    assert.deepEqual(
      denied.body.safe_error_codes,
      ["ANALYTICS_NOT_FOUND"],
    );
    assert.equal(denied.body.count_leak_prevented, true);
  } finally {
    fixture.financeRepository.close();
  }
});
