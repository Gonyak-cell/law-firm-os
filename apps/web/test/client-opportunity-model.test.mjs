import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClientOpportunityModel,
  clientOpportunityStatusCode,
  CLIENT_OPPORTUNITY_STATUS_TABS,
  resolveClientOpportunitySelection
} from "../src/components/ClientOpportunityModel.js";

function opportunity(overrides = {}) {
  return {
    opportunity_id: "opp-1",
    display_name: "Alpha 상담",
    stage: "qualified",
    status: "active",
    engagement_decision: "pending",
    engagement_decision_version: 1,
    engagement_workflow_status: null,
    requested_scope_summary: "기업 자문",
    ...overrides
  };
}

function data(items, extra = {}) {
  return {
    kind: "data",
    outcome: "passed",
    uiState: items.length ? null : "empty",
    items,
    ...extra
  };
}

test("수임 현황 탭은 정해진 자연스러운 한국어와 canonical stage/decision 매핑을 사용한다", () => {
  assert.deepEqual(
    CLIENT_OPPORTUNITY_STATUS_TABS.map(({ code, label }) => ({ code, label })),
    [
      { code: "all", label: "전체" },
      { code: "reviewing", label: "검토 중" },
      { code: "intake_requested", label: "상담 연결 대기" },
      { code: "intake_opened", label: "상담 연결됨" },
      { code: "accepted", label: "수임 확정" },
      { code: "declined", label: "수임하지 않음" }
    ]
  );

  const items = [
    opportunity({ opportunity_id: "opp-review", stage: "new", engagement_decision: null }),
    opportunity({ opportunity_id: "opp-waiting", stage: "intake_requested", engagement_decision: null }),
    opportunity({ opportunity_id: "opp-linked", stage: "qualified", engagement_decision: null, intake_request_id: "intake-1" }),
    opportunity({ opportunity_id: "opp-opened", stage: "intake_opened", engagement_decision: null }),
    opportunity({ opportunity_id: "opp-accepted", stage: "qualified", engagement_decision: "accepted" }),
    opportunity({ opportunity_id: "opp-won", stage: "closed_won", engagement_decision: null }),
    opportunity({ opportunity_id: "opp-declined", stage: "qualified", engagement_decision: "declined" }),
    opportunity({ opportunity_id: "opp-lost", stage: "closed_lost", engagement_decision: null })
  ];

  assert.deepEqual(
    items.map(clientOpportunityStatusCode),
    [
      "reviewing",
      "intake_requested",
      "intake_opened",
      "intake_opened",
      "accepted",
      "accepted",
      "declined",
      "declined"
    ]
  );

  const model = buildClientOpportunityModel({
    opportunitiesResult: data(items),
    statusTab: "수임 확정"
  });
  assert.equal(model.activeStatusTab, "accepted");
  assert.deepEqual(
    model.opportunities.map(({ opportunityId }) => opportunityId),
    ["opp-accepted", "opp-won"]
  );
  const linked = buildClientOpportunityModel({
    opportunitiesResult: data(items),
    statusTab: "상담 연결됨"
  });
  assert.equal(linked.opportunities[0].intakeRequestLinked, true);
  assert.equal("intakeRequestId" in linked.opportunities[0], false);
});

test("검색은 고객·Opportunity 표시 문자열만 한국어 안전하게 대소문자 없이 찾고 서버 순서를 유지한다", () => {
  const items = [
    opportunity({ opportunity_id: "opp-first", display_name: "베타 법률", requested_scope_summary: "노동 자문" }),
    opportunity({ opportunity_id: "opp-second", display_name: "Alpha HOLDINGS", requested_scope_summary: "계약 검토" }),
    opportunity({ opportunity_id: "opp-third", display_name: "가온테크", requested_scope_summary: "개인정보 대응" })
  ];
  const result = data(items);

  const korean = buildClientOpportunityModel({
    opportunitiesResult: result,
    searchQuery: "  베타  "
  });
  assert.deepEqual(
    korean.opportunities.map(({ opportunityId }) => opportunityId),
    ["opp-first"]
  );

  const english = buildClientOpportunityModel({
    opportunitiesResult: result,
    searchQuery: "alpha"
  });
  assert.deepEqual(
    english.opportunities.map(({ opportunityId }) => opportunityId),
    ["opp-second"]
  );

  const scope = buildClientOpportunityModel({
    opportunitiesResult: result,
    searchQuery: "개인정보"
  });
  assert.deepEqual(
    scope.opportunities.map(({ opportunityId }) => opportunityId),
    ["opp-third"]
  );

  const internalId = buildClientOpportunityModel({
    opportunitiesResult: result,
    searchQuery: "opp-second"
  });
  assert.deepEqual(internalId.opportunities, []);
});

test("선택은 명시적으로 요청한 허용 ID에만 적용하고 첫 레코드를 자동 선택하지 않는다", () => {
  const items = [
    opportunity({ opportunity_id: "opp-first" }),
    opportunity({ opportunity_id: "opp-second", display_name: "두 번째" })
  ];
  const result = data(items);

  const none = buildClientOpportunityModel({ opportunitiesResult: result });
  assert.equal(none.selectedOpportunityId, null);
  assert.equal(none.selectedOpportunity, null);
  assert.equal(none.requestedOpportunityAvailable, null);
  assert.deepEqual(none.opportunities[0], {
    opportunityId: "opp-first",
    displayName: "Alpha 상담",
    requestedScopeSummary: "기업 자문",
    stage: "qualified",
    recordStatus: "active",
    engagementDecision: "pending",
    engagementDecisionVersion: 1,
    engagementWorkflowStatus: null,
    intakeRequestLinked: false
  });
  assert.equal("partyId" in none.opportunities[0], false);
  assert.equal("ownerUserId" in none.opportunities[0], false);

  const selected = buildClientOpportunityModel({
    opportunitiesResult: result,
    requestedOpportunityId: "opp-second"
  });
  assert.equal(selected.selectedOpportunityId, "opp-second");
  assert.equal(selected.selectedOpportunity.opportunityId, "opp-second");
  assert.equal(selected.requestedOpportunityAvailable, true);

  const denied = buildClientOpportunityModel({
    opportunitiesResult: result,
    requestedOpportunityId: "opp-hidden"
  });
  assert.equal(denied.selectedOpportunityId, null);
  assert.equal(denied.selectedOpportunity, null);
  assert.equal(denied.requestedOpportunityAvailable, false);
  assert.equal(JSON.stringify(denied).includes("opp-hidden"), false);

  assert.equal(resolveClientOpportunitySelection("opp-second", ["opp-first", "opp-second"]), "opp-second");
  assert.equal(resolveClientOpportunitySelection("opp-hidden", ["opp-first", "opp-second"]), null);
  assert.equal(resolveClientOpportunitySelection("", ["opp-first"]), null);
});

test("권한·부분 조회·빈 목록·오류 상태는 원천 상태를 유지한다", () => {
  const cases = [
    [{ kind: "guarded", uiState: "denied", items: [] }, "denied"],
    [data([opportunity()], { uiState: "denied", outcome: "denied" }), "denied"],
    [data([opportunity()], { uiState: "partial", outcome: "partial" }), "partial"],
    [{ kind: "empty", uiState: "empty", items: [] }, "empty"],
    [{ kind: "error", uiState: "error", items: [] }, "error"]
  ];

  for (const [result, expectedState] of cases) {
    const model = buildClientOpportunityModel({
      opportunitiesResult: result,
      requestedOpportunityId: "opp-1"
    });
    assert.equal(model.state, expectedState);
    if (expectedState === "partial") {
      assert.deepEqual(
        model.opportunities.map(({ opportunityId }) => opportunityId),
        ["opp-1"]
      );
      assert.equal(model.selectedOpportunity?.opportunityId, "opp-1");
      assert.deepEqual(model.authorizedOpportunityIds, ["opp-1"]);
    } else {
      assert.deepEqual(model.opportunities, []);
      assert.equal(model.selectedOpportunity, null);
      assert.deepEqual(model.authorizedOpportunityIds, []);
    }
  }
});

test("검색·탭으로 숨겨진 선택 건은 수임 행동 대상으로 남지 않는다", () => {
  const result = data([
    opportunity({ opportunity_id: "opp-visible", display_name: "가온 법률", stage: "qualified" }),
    opportunity({ opportunity_id: "opp-accepted", display_name: "수임 완료 고객", stage: "qualified", engagement_decision: "accepted" })
  ]);
  const model = buildClientOpportunityModel({
    opportunitiesResult: result,
    requestedOpportunityId: "opp-accepted",
    statusTab: "검토 중",
    searchQuery: "가온"
  });
  assert.equal(model.selectedOpportunityId, null);
  assert.equal(model.selectedOpportunity, null);
  assert.equal(model.requestedOpportunityAvailable, false);
  assert.deepEqual(model.opportunities.map(({ opportunityId }) => opportunityId), ["opp-visible"]);
});

test("허용되지 않은 lifecycle·수임 workflow·버전과 중복 opportunity는 fail closed 한다", () => {
  const base = opportunity();
  for (const overrides of [
    { status: "closed" },
    { engagement_workflow_status: "queued" },
    { engagement_decision_version: 0 },
    { engagement_decision_version: Number.MAX_SAFE_INTEGER + 1 }
  ]) {
    const model = buildClientOpportunityModel({ opportunitiesResult: data([{ ...base, ...overrides }]) });
    assert.equal(model.state, "error");
    assert.deepEqual(model.opportunities, []);
  }
  const duplicate = buildClientOpportunityModel({ opportunitiesResult: data([base, { ...base, display_name: "중복" }]) });
  assert.equal(duplicate.state, "error");
  assert.deepEqual(duplicate.opportunities, []);
});
