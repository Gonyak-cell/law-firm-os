import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClientDirectoryModel,
  clientDetailRouteContext,
  normalizeClientDetailTab
} from "../src/components/ClientDirectoryModel.js";
import {
  fetchAnalyticsClientDirectory,
  fetchAnalyticsClientOperationsDetail
} from "../src/data/apiClient.js";

function data(items, extra = {}) {
  return {
    kind: "data",
    outcome: "passed",
    uiState: items.length ? null : "empty",
    items,
    ...extra
  };
}

const clientsResult = data([{
  client_group_id: "client-allowed",
  display_name: "허용 고객",
  status: "active",
  legal_form: "주식회사",
  member_count: 2,
  primary_record_present: true
}]);

function operationsResult(overrides = {}) {
  return {
    kind: "data",
    outcome: "passed",
    uiState: null,
    item: {
      client: {
        client_group_id: "client-allowed",
        display_name: "허용 고객",
        status: "active",
        legal_form: "주식회사",
        member_count: 2,
        primary_record_present: true
      },
      sections: {
        contacts: {
          status: "available",
          data: {
            items: [{
              contact_id: "contact-visible",
              display_name: "김담당",
              primary_contact_type: "email",
              contact_point_value_included: false,
              contact_value_masked: true,
              status: "active"
            }]
          }
        },
        matters: {
          status: "available",
          data: {
            items: [{
              matter_id: "matter-visible",
              matter_code: "2026-001",
              display_name: "허용 사건",
              status: "open",
              opened_at: "2026-07-30T00:00:00.000Z"
            }]
          }
        },
        inquiries: {
          status: "available",
          data: {
            items: [{
              lead_id: "inquiry-visible",
              display_name: "허용 문의",
              visible_status: "new",
              visible_status_label: "새 문의",
              source: "outlook_addin",
              received_at: "2026-07-31T01:00:00.000Z",
              next_action: "문의 확인",
              assigned: false
            }]
          }
        }
      },
      ...overrides
    }
  };
}

test("고객 상세는 서버가 허용한 요약과 세 원천만 탭별로 표시한다", () => {
  const model = buildClientDirectoryModel({
    clientsResult,
    operationsResult: operationsResult(),
    requestedRecordId: "client-allowed",
    requestedTab: "contacts"
  });

  assert.equal(model.selectedClient.client_group_id, "client-allowed");
  assert.equal(model.route.activeTab, "contacts");
  assert.deepEqual(
    model.contacts.items.map(({ contactId }) => contactId),
    ["contact-visible"]
  );
  assert.equal(model.contacts.items[0].contactValue, null);
  assert.equal(model.contacts.items[0].contactValueIncluded, false);
  assert.deepEqual(
    model.matters.items.map(({ matterId }) => matterId),
    ["matter-visible"]
  );
  assert.deepEqual(
    model.inquiries.items.map(({ inquiryId }) => inquiryId),
    ["inquiry-visible"]
  );
  assert.equal(model.countLeakPrevented, true);
});

test("권한 없는 상세 원천은 0건이나 누락 건수 없이 별도 상태로 남긴다", () => {
  const result = operationsResult();
  result.item.sections.matters = {
    status: "permission_denied",
    data: null
  };
  result.item.sections.inquiries = {
    status: "error",
    data: null
  };
  const model = buildClientDirectoryModel({
    clientsResult,
    operationsResult: result,
    requestedRecordId: "client-allowed",
    requestedTab: "matters"
  });

  assert.equal(model.matters.state, "denied");
  assert.equal(model.inquiries.state, "error");
  assert.equal("count" in model.matters, false);
  assert.equal("pageInfo" in model.matters, false);
});

test("일부만 허용된 상세 원천은 허용 항목을 유지하고 일부 조회 상태로 표시한다", () => {
  const result = operationsResult();
  result.item.sections.matters.status = "partial";
  const model = buildClientDirectoryModel({
    clientsResult,
    operationsResult: result,
    requestedRecordId: "client-allowed",
    requestedTab: "matters"
  });

  assert.equal(model.matters.state, "partial");
  assert.deepEqual(
    model.matters.items.map(({ matterId }) => matterId),
    ["matter-visible"]
  );
  assert.equal("count" in model.matters, false);
});

test("주소의 비허용 고객 ID는 고객 존재 여부를 드러내지 않고 상세를 열지 않는다", () => {
  const model = buildClientDirectoryModel({
    clientsResult,
    operationsResult: null,
    requestedRecordId: "client-hidden",
    requestedTab: "inquiries"
  });

  assert.equal(model.selectedClient, null);
  assert.equal(model.requestedRecordAvailable, false);
  assert.equal(JSON.stringify(model).includes("client-hidden"), false);
});

test("서버 상세의 고객 ID가 목록과 다르면 안전하게 상세를 닫는다", () => {
  const result = operationsResult();
  result.item.client.client_group_id = "client-other";
  const model = buildClientDirectoryModel({
    clientsResult,
    operationsResult: result,
    requestedRecordId: "client-allowed"
  });

  assert.equal(model.selectedClient, null);
  assert.equal(model.requestedRecordAvailable, false);
  assert.equal(JSON.stringify(model).includes("client-other"), false);
});

test("대시보드의 금액 순위 탭은 고객 개요를 열고 관련 메뉴 이동 정보를 보존한다", () => {
  assert.equal(normalizeClientDetailTab("deposit_revenue"), "overview");
  assert.deepEqual(clientDetailRouteContext("deposit_revenue"), {
    requestedTab: "deposit_revenue",
    activeTab: "overview",
    relatedRoute: {
      section: "client-sales-history",
      label: "입금 매출 내역"
    }
  });
  assert.deepEqual(clientDetailRouteContext("receivables"), {
    requestedTab: "receivables",
    activeTab: "overview",
    relatedRoute: {
      section: "client-billing",
      label: "수임료·미수금"
    }
  });
});

test("고객 목록 어댑터는 허용된 필드만 남기고 누락 건수를 폐기한다", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = null;
  try {
    globalThis.fetch = async (input) => {
      requestUrl = new URL(String(input), "http://lawos.test");
      return new Response(JSON.stringify({
        request_id: "request-client-directory",
        outcome: "passed",
        ui_state: null,
        items: [{
          client_group_id: "client-allowed",
          display_name: "허용 고객",
          status: "active",
          legal_form: "주식회사",
          member_count: 2,
          primary_record_present: true,
          member_party_ids: ["must-not-reach-ui"]
        }],
        page_info: {
          returned_count: 1,
          omitted_item_count: 73
        },
        source_statuses: [],
        safe_error_codes: [],
        audit_hint_ref: "directory-audit",
        permission_prefilter_applied: true,
        count_leak_prevented: true,
        raw_source_payload_included: false,
        production_ready_claim: false
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    const result = await fetchAnalyticsClientDirectory();
    assert.equal(result.kind, "data");
    assert.deepEqual(result.pageInfo, {
      returnedCount: 1,
      omittedItemCount: null
    });
    assert.equal(
      JSON.stringify(result).includes("must-not-reach-ui"),
      false
    );
    assert.equal(JSON.stringify(result).includes("73"), false);
    assert.equal(requestUrl.pathname, "/api/analytics/clients");
    assert.equal(requestUrl.searchParams.has("permission_ref"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("고객 상세 어댑터는 연락처 원문을 거절하고 안전한 상세만 전달한다", async () => {
  const originalFetch = globalThis.fetch;
  let unsafe = false;
  try {
    globalThis.fetch = async (input) => {
      const requested = new URL(String(input), "http://lawos.test");
      const detail = operationsResult().item;
      if (unsafe) {
        detail.sections.contacts.data.items[0] = {
          ...detail.sections.contacts.data.items[0],
          contact_point_value_included: true,
          contact_point_value: "private@example.test"
        };
      }
      return new Response(JSON.stringify({
        request_id: "request-client-detail",
        outcome: "passed",
        ui_state: null,
        item: {
          ...detail,
          source_statuses: [],
          safe_error_codes: [],
          count_leak_prevented: true,
          raw_contact_values_included: false,
          raw_source_payload_included: false
        },
        source_statuses: [],
        safe_error_codes: [],
        permission_prefilter_applied: true,
        count_leak_prevented: true,
        raw_source_payload_included: false,
        production_ready_claim: false,
        requested_path: requested.pathname
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    const safe = await fetchAnalyticsClientOperationsDetail({
      clientId: "client-allowed"
    });
    assert.equal(safe.kind, "data");
    assert.equal(safe.item.client.client_group_id, "client-allowed");
    assert.equal(
      JSON.stringify(safe).includes("contact_point_value"),
      true
    );
    assert.equal(
      JSON.stringify(safe).includes("private@example.test"),
      false
    );

    unsafe = true;
    const rejected = await fetchAnalyticsClientOperationsDetail({
      clientId: "client-allowed"
    });
    assert.equal(rejected.kind, "error");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("고객 상세 어댑터는 일부 권한 누락 건수를 폐기한다", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const detail = operationsResult().item;
    detail.sections.matters.status = "partial";
    globalThis.fetch = async () => new Response(JSON.stringify({
      request_id: "request-client-detail-partial",
      outcome: "partial",
      ui_state: "partial",
      item: {
        ...detail,
        source_statuses: [{
          source_id: "matters",
          label: "Matter",
          status: "partial",
          item_count: 37,
          safe_error_code:
            "CLIENT_OPERATIONS_MATTER_OBJECTS_OMITTED"
        }],
        safe_error_codes: [
          "CLIENT_OPERATIONS_MATTER_OBJECTS_OMITTED"
        ],
        count_leak_prevented: true,
        raw_contact_values_included: false,
        raw_source_payload_included: false
      },
      source_statuses: [],
      safe_error_codes: [
        "CLIENT_OPERATIONS_MATTER_OBJECTS_OMITTED"
      ],
      permission_prefilter_applied: true,
      count_leak_prevented: true,
      raw_source_payload_included: false,
      production_ready_claim: false
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
    const partial = await fetchAnalyticsClientOperationsDetail({
      clientId: "client-allowed"
    });

    assert.equal(partial.kind, "data");
    assert.equal(partial.item.sections.matters.status, "partial");
    assert.equal(partial.item.sourceStatuses[0].itemCount, null);
    assert.equal(JSON.stringify(partial).includes("37"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("고객 상세 404 어댑터는 요청 ID를 결과에 다시 싣지 않는다", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      request_id: "request-not-found",
      outcome: "blocked",
      items: [],
      safe_error_codes: ["ANALYTICS_NOT_FOUND"],
      ui_state: "empty",
      count_leak_prevented: true,
      production_ready_claim: false
    }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
    const result = await fetchAnalyticsClientOperationsDetail({
      clientId: "client-hidden"
    });
    assert.deepEqual(result, {
      kind: "empty",
      status: 404,
      uiState: "empty",
      countLeakPrevented: true
    });
    assert.equal(JSON.stringify(result).includes("client-hidden"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
