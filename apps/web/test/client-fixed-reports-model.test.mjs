import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClientFixedReportsModel,
  selectClientFixedReport,
} from "../src/components/ClientFixedReportsModel.js";

function dashboard(overrides = {}) {
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(Date.UTC(2025, 7 + index, 1));
    return {
      month: `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`,
      net_deposit_revenue: index === 9 ? -100 : index === 11 ? 1_000 : 0,
      destination: { section: "client-sales-history", month: index },
    };
  });
  return {
    kind: "data",
    outcome: "complete",
    uiState: null,
    generatedAt: "2026-07-31T01:00:00.000Z",
    asOf: "2026-07-31T01:00:00.000Z",
    timezone: "Asia/Seoul",
    permissionPrefilterApplied: true,
    countLeakPrevented: true,
    rawBankSourceIncluded: false,
    rawSourcePayloadIncluded: false,
    credentialMaterialIncluded: false,
    sections: {
      monthly_deposit_revenue: {
        status: "available",
        data: {
          period: { month_count: 12 },
          total: 900,
          points: months,
        },
      },
      inquiry_status: {
        status: "available",
        data: {
          total: 5,
          items: [
            { code: "engaged", count: 1 },
            { code: "new", count: 1 },
            { code: "not_engaged", count: 1 },
            { code: "reviewing", count: 0 },
            { code: "consultation_scheduled", count: 1 },
            { code: "engagement_review", count: 1 },
          ],
        },
      },
      revenue_ranking: {
        status: "available",
        data: {
          items: [
            {
              rank: 2,
              client_group_id: "client-b",
              display_name: "한빛건설",
              net_deposit_revenue: 500,
              latest_deposit_at: "2026-07-15T01:00:00.000Z",
            },
            {
              rank: 1,
              client_group_id: "client-a",
              display_name: "새봄테크",
              net_deposit_revenue: 500,
              latest_deposit_at: "2026-07-20T01:00:00.000Z",
            },
            {
              rank: 3,
              client_group_id: "client-c",
              display_name: "가온, \"파트너\"",
              net_deposit_revenue: -50,
              latest_deposit_at: null,
            },
            {
              rank: 4,
              client_group_id: "client-d",
              display_name: "다온 법률",
              net_deposit_revenue: -25,
              latest_deposit_at: null,
            },
          ],
        },
      },
      receivables_ranking: {
        status: "available",
        data: {
          items: [
            {
              client_group_id: "client-z",
              display_name: "미수 고객",
              receivable_amount: 100,
              earliest_due_date: null,
            },
            {
              client_group_id: "client-y",
              display_name: "선순위 고객",
              receivable_amount: 0,
              earliest_due_date: "2026-08-10",
            },
          ],
        },
      },
    },
    ...overrides,
  };
}

const fixedColumns = {
  monthly_deposit_revenue: [
    { key: "month", label: "월" },
    { key: "net_deposit_revenue", label: "입금 매출" },
  ],
  inquiry_status: [
    { key: "status", label: "상태" },
    { key: "count", label: "건수" },
  ],
  revenue_ranking: [
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "matched_inflow_amount", label: "연결 입금" },
    { key: "linked_refund_amount", label: "환불" },
    { key: "net_deposit_revenue", label: "입금 매출" },
    { key: "latest_deposit_date", label: "최근 입금일" },
  ],
  receivables_ranking: [
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "agreed_amount", label: "약정 수임료" },
    { key: "active_allocated_amount", label: "반영 입금" },
    { key: "receivable_amount", label: "미수금" },
    { key: "earliest_due_date", label: "가장 이른 지급기한" },
  ],
};

function fixedScreen(reportId, overrides = {}) {
  const rows = {
    monthly_deposit_revenue: Array.from({ length: 12 }, (_, index) => {
      const date = new Date(Date.UTC(2025, 7 + index, 1));
      return {
        month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
        net_deposit_revenue: index === 11 ? 1_000 : 0,
      };
    }),
    inquiry_status: [
      { status: "새 문의", count: 1 },
      { status: "확인 중", count: 0 },
      { status: "상담 예정", count: 1 },
      { status: "수임 검토 중", count: 1 },
      { status: "수임 확정", count: 1 },
      { status: "수임하지 않음", count: 1 },
    ],
    revenue_ranking: [
      {
        rank: 1,
        client_name: "'=HYPERLINK(\"https://bad.test\",\"열기\")",
        matched_inflow_amount: 700,
        linked_refund_amount: 200,
        net_deposit_revenue: 500,
        latest_deposit_date: "2026-07-20",
      },
      {
        rank: 2,
        client_name: "한빛건설",
        matched_inflow_amount: 500,
        linked_refund_amount: 0,
        net_deposit_revenue: 500,
        latest_deposit_date: "2026-07-15",
      },
      {
        rank: 3,
        client_name: "다온 법률",
        matched_inflow_amount: 0,
        linked_refund_amount: 25,
        net_deposit_revenue: -25,
        latest_deposit_date: null,
      },
    ],
    receivables_ranking: [
      {
        rank: 1,
        client_name: "미수 고객",
        agreed_amount: 300,
        active_allocated_amount: 200,
        receivable_amount: 100,
        earliest_due_date: null,
      },
      {
        rank: 2,
        client_name: "선순위 고객",
        agreed_amount: 100,
        active_allocated_amount: 100,
        receivable_amount: 0,
        earliest_due_date: "2026-08-10",
      },
    ],
  }[reportId];
  const snapshot = {
    token: `lawos_client_fixed_report_v1.${reportId}-opaque`,
    version: 1,
    expires_at: "2026-07-31T01:10:00.000Z",
  };
  const item = {
    report_id: reportId,
    title: "고정 리포트",
    columns: fixedColumns[reportId],
    rows,
    row_count: rows.length,
    source_status: rows.length === 0 ? "no_data" : "available",
    snapshot,
    as_of: "2026-07-31T01:00:00.000Z",
    timezone: "Asia/Seoul",
    permission_prefilter_applied: true,
    count_leak_prevented: true,
    raw_bank_source_included: false,
    raw_source_payload_included: false,
    contact_pii_included: false,
    internal_ids_included: false,
    ...overrides.item,
  };
  return {
    outcome: rows.length === 0 ? "empty" : "passed",
    ui_state: rows.length === 0 ? "no_data" : null,
    item,
    exportSnapshot: snapshot,
    count_leak_prevented: true,
    ...overrides.envelope,
  };
}

test("고정 리포트는 기존 대시보드의 네 섹션을 자연스러운 제목과 안전한 행으로 고정한다", () => {
  const model = buildClientFixedReportsModel(dashboard());

  assert.deepEqual(model.reports.map(({ id, title, state }) => ({ id, title, state })), [
    { id: "monthly_deposit_revenue", title: "월별 입금 매출", state: "data" },
    { id: "inquiry_status", title: "문의 현황", state: "data" },
    { id: "revenue_ranking", title: "입금 매출 상위 고객", state: "data" },
    { id: "receivables_ranking", title: "미수금 상위 고객", state: "data" },
  ]);
  assert.deepEqual(model.reports.map(({ id }) => id), [
    "monthly_deposit_revenue",
    "inquiry_status",
    "revenue_ranking",
    "receivables_ranking",
  ]);

  const monthly = model.reports[0];
  assert.equal(monthly.rows.length, 12);
  assert.deepEqual(monthly.rows.at(9), { month: "2026-05", amount: -100 });
  assert.deepEqual(monthly.rows.at(-1), { month: "2026-07", amount: 1_000 });

  const inquiry = model.reports[1];
  assert.deepEqual(inquiry.rows.map(({ label, count }) => [label, count]), [
    ["새 문의", 1],
    ["확인 중", 0],
    ["상담 예정", 1],
    ["수임 검토 중", 1],
    ["수임 확정", 1],
    ["수임하지 않음", 1],
  ]);

  assert.deepEqual(model.reports[2].rows.map(({ rank, displayName, amount }) => [
    rank,
    displayName,
    amount,
  ]), [
    [1, "새봄테크", 500],
    [2, "한빛건설", 500],
    [3, "다온 법률", -25],
    [4, "가온, \"파트너\"", -50],
  ]);
  assert.deepEqual(model.reports[3].rows.map(({ rank, displayName, amount, earliestDueDate }) => [
    rank,
    displayName,
    amount,
    earliestDueDate,
  ]), [
    [1, "미수 고객", 100, null],
    [2, "선순위 고객", 0, "2026-08-10"],
  ]);
});

test("화면 행은 server-owned export request descriptor와만 연결되고 artifact는 만들지 않는다", () => {
  const fixture = dashboard();
  fixture.sections.revenue_ranking.data.items[3].display_name = "=HYPERLINK(\"https://bad.test\",\"열기\")";
  const model = buildClientFixedReportsModel(fixture, {
    exportAllowed: true,
    exportCapabilityRef: "analytics.client.export",
    exportAuditRef: "caller-authored-audit-ref",
  });

  for (const report of model.reports) {
    assert.strictEqual(report.screenRows, report.rows);
    assert.equal(report.exportRequest, null);
    assert.equal(Object.hasOwn(report, "csv"), false);
    assert.equal(Object.hasOwn(report, "printModel"), false);
    assert.equal(Object.hasOwn(report, "exportAllowed"), false);
  }

  assert.equal(model.reports[2].rows.some(({ displayName }) => displayName.startsWith("=")), true);
  assert.equal(JSON.stringify(model).includes("caller-authored-audit-ref"), false);
  assert.equal(JSON.stringify(model).includes("client-a"), false);
  assert.equal(JSON.stringify(model).includes("client-b"), false);
  assert.equal(JSON.stringify(model).includes("client-c"), false);
  assert.equal(selectClientFixedReport(model, "revenue_ranking"), model.reports[2]);
  assert.equal(selectClientFixedReport(model, "client-c"), null);

  const serverSnapshot = dashboard({
    exportSnapshot: {
      snapshot_token: "server-snapshot-client-20260731",
      snapshot_version: 17,
    },
  });
  const serverModel = buildClientFixedReportsModel(serverSnapshot, {
    exportAllowed: true,
    exportCapabilityRef: "analytics.client.export",
    exportAuditRef: "caller-authored-audit-ref",
  });
  for (const report of serverModel.reports) {
    assert.deepEqual(report.exportRequest, {
      reportId: report.id,
      contractVersion: "client-fixed-reports.v1",
      snapshotToken: "server-snapshot-client-20260731",
      snapshotVersion: 17,
    });
    assert.equal(Object.hasOwn(report.exportRequest, "screenRowsDigest"), false);
    assert.equal(Object.hasOwn(report.exportRequest, "capabilityRef"), false);
    assert.equal(Object.hasOwn(report.exportRequest, "auditRef"), false);
  }

  for (const snapshot of [
    { token: "server-token-only" },
    { version: 18 },
    { token: "", version: 18 },
    { token: "server-token", version: "v18\n" },
  ]) {
    const invalidSnapshot = buildClientFixedReportsModel(dashboard({
      exportSnapshot: snapshot,
    }));
    assert.equal(invalidSnapshot.reports.every((report) => report.exportRequest === null), true);
  }

  const aliasSnapshot = buildClientFixedReportsModel(dashboard({
    exportSnapshot: undefined,
    export_snapshot: { token: "server-alias-token", version: 19 },
  }));
  assert.equal(aliasSnapshot.reports[0].exportRequest.snapshotToken, "server-alias-token");
  assert.equal(aliasSnapshot.reports[0].exportRequest.snapshotVersion, 19);

  const originalToken = "Server.Token~with:opaque/+chars=";
  const originalTokenModel = buildClientFixedReportsModel(dashboard({
    exportSnapshot: { token: originalToken, version: "v20" },
  }));
  assert.equal(originalTokenModel.reports[0].exportRequest.snapshotToken, originalToken);
});

test("read-only model은 어떤 local export flag로도 CSV·인쇄 artifact를 만들지 않는다", () => {
  const flags = [
    undefined,
    { exportAllowed: true },
    {
      exportAllowed: true,
      exportCapabilityRef: "analytics.client.export",
      exportAuditRef: "fabricated-audit",
    },
    { capabilityRef: "analytics.client.export", auditRef: "fabricated-audit" },
  ];
  for (const options of flags) {
    const model = buildClientFixedReportsModel(dashboard(), options);
    assert.equal(Object.hasOwn(model, "exportAllowed"), false);
    for (const report of model.reports) {
      assert.equal(Object.hasOwn(report, "csv"), false);
      assert.equal(Object.hasOwn(report, "printModel"), false);
      assert.equal(report.exportRequest, null);
      assert.equal(Object.hasOwn(report, "capabilityRef"), false);
      assert.equal(Object.hasOwn(report, "auditRef"), false);
    }
  }
});

test("동률과 입력 순서가 달라도 화면 행 순서는 결정적이며 내부 ID는 평탄화하지 않는다", () => {
  const first = dashboard();
  const second = dashboard();
  second.sections.revenue_ranking.data.items.reverse();
  second.sections.inquiry_status.data.items.reverse();
  second.sections.monthly_deposit_revenue.data.points.reverse();

  const firstModel = buildClientFixedReportsModel(first);
  const secondModel = buildClientFixedReportsModel(second);
  assert.deepEqual(firstModel.reports, secondModel.reports);
  for (const report of firstModel.reports) {
    assert.equal(JSON.stringify(report.screenRows).includes("client-"), false);
    assert.equal(JSON.stringify(report.screenRows).includes("destination"), false);
  }
});

test("서로 다른 row collision fixture도 local digest를 export 증거로 승격하지 않는다", () => {
  const first = dashboard({
    exportSnapshot: { token: "server-snapshot-collision", version: 3 },
  });
  const second = dashboard({
    exportSnapshot: { token: "server-snapshot-collision", version: 3 },
  });
  second.sections.monthly_deposit_revenue.data.points[0].net_deposit_revenue = 123_456;
  second.sections.monthly_deposit_revenue.data.total = 124_356;
  second.sections.revenue_ranking.data.items[0].net_deposit_revenue = 654_321;

  const firstRequest = buildClientFixedReportsModel(first).reports[0].exportRequest;
  const secondRequest = buildClientFixedReportsModel(second).reports[0].exportRequest;
  assert.notDeepEqual(first.sections.monthly_deposit_revenue.data.points, second.sections.monthly_deposit_revenue.data.points);
  assert.deepEqual(firstRequest, secondRequest);
  assert.equal(Object.hasOwn(firstRequest, "screenRowsDigest"), false);
});

test("terminal state는 권한 경계보다 먼저 보존하고 partial은 검증된 허용 행만 유지한다", () => {
  for (const { result, state } of [
    { result: null, state: "loading" },
    { result: { kind: "loading" }, state: "loading" },
    { result: { kind: "empty", uiState: "empty" }, state: "empty" },
    { result: { kind: "error", uiState: "error" }, state: "error" },
    { result: { kind: "guarded", uiState: "denied" }, state: "denied" },
    { result: { kind: "guarded", uiState: "review_required" }, state: "review_required" },
  ]) {
    const model = buildClientFixedReportsModel(result);
    assert.equal(model.state, state);
    assert.deepEqual(model.reports.map((report) => report.state), [
      state,
      state,
      state,
      state,
    ]);
    assert.equal(model.reports.every((report) => report.rows.length === 0), true);
    assert.equal(model.reports.every((report) => report.exportRequest === null), true);
    assert.equal(model.reports.every((report) => Object.hasOwn(report, "csv") === false), true);
    assert.equal(model.reports.every((report) => Object.hasOwn(report, "printModel") === false), true);
  }

  const missingPermissionProof = buildClientFixedReportsModel(
    dashboard({ permissionPrefilterApplied: false }),
  );
  assert.equal(missingPermissionProof.state, "data");
  assert.deepEqual(missingPermissionProof.reports.map((report) => report.state), [
    "denied",
    "denied",
    "denied",
    "denied",
  ]);

  const partial = dashboard({ outcome: "partial", uiState: "partial" });
  partial.sections.monthly_deposit_revenue.status = "partial";
  partial.sections.monthly_deposit_revenue.data.points = partial.sections.monthly_deposit_revenue.data.points.slice(0, 2);
  partial.sections.inquiry_status.status = "partial";
  partial.sections.inquiry_status.data.items = partial.sections.inquiry_status.data.items.slice(0, 2);
  const partialModel = buildClientFixedReportsModel(partial);
  assert.equal(partialModel.reports[0].state, "partial");
  assert.equal(partialModel.reports[0].rows.length, 2);
  assert.equal(partialModel.reports[1].state, "partial");
  assert.equal(partialModel.reports[1].rows.length, 2);
  assert.equal(partialModel.reports.every((report) => report.exportRequest === null), true);

  const partialWithSnapshot = dashboard({
    outcome: "partial",
    uiState: "partial",
    exportSnapshot: {
      token: "server-snapshot-partial-20260731",
      version: "v17",
    },
  });
  partialWithSnapshot.sections.monthly_deposit_revenue.status = "partial";
  partialWithSnapshot.sections.monthly_deposit_revenue.data.points = partialWithSnapshot.sections.monthly_deposit_revenue.data.points.slice(0, 2);
  const partialSnapshotModel = buildClientFixedReportsModel(partialWithSnapshot);
  assert.equal(partialSnapshotModel.reports[0].state, "partial");
  assert.deepEqual(partialSnapshotModel.reports[0].exportRequest, {
    reportId: "monthly_deposit_revenue",
    contractVersion: "client-fixed-reports.v1",
    snapshotToken: "server-snapshot-partial-20260731",
    snapshotVersion: "v17",
  });

  const unauthorized = dashboard();
  unauthorized.sections.revenue_ranking.data.items.push({
    authorized: false,
    client_group_id: "secret-client-id",
    display_name: "비공개 고객",
    net_deposit_revenue: 99_999_999,
    latest_deposit_at: "2026-07-31T00:00:00.000Z",
  });
  unauthorized.sections.revenue_ranking.status = "partial";
  const safe = buildClientFixedReportsModel(unauthorized).reports[2];
  assert.equal(safe.state, "partial");
  assert.equal(JSON.stringify(safe).includes("비공개 고객"), false);
  assert.equal(JSON.stringify(safe).includes("secret-client-id"), false);
  assert.equal(JSON.stringify(safe).includes("99999999"), false);
});

test("root partial은 건강한 sibling report를 오염시키지 않고, partial의 손상 허용 행은 fail-closed한다", () => {
  const siblingFailure = dashboard({ outcome: "partial", uiState: "partial" });
  siblingFailure.sections.inquiry_status.status = "error";
  const isolated = buildClientFixedReportsModel(siblingFailure);
  assert.equal(isolated.reports[0].state, "data");
  assert.equal(isolated.reports[1].state, "error");
  assert.equal(isolated.reports[2].state, "data");
  assert.equal(isolated.reports[3].state, "data");

  const malformed = dashboard({ outcome: "partial", uiState: "partial" });
  malformed.sections.revenue_ranking.status = "partial";
  malformed.sections.revenue_ranking.data.items[0].net_deposit_revenue = null;
  const malformedModel = buildClientFixedReportsModel(malformed).reports[2];
  assert.equal(malformedModel.state, "error");
  assert.deepEqual(malformedModel.rows, []);
});

test("null 금액은 해당 리포트를 fail-closed하고 null 날짜·0원·음수는 의미를 보존한다", () => {
  const malformed = dashboard();
  malformed.sections.monthly_deposit_revenue.data.points[0].net_deposit_revenue = null;
  const model = buildClientFixedReportsModel(malformed);
  assert.equal(model.reports[0].state, "error");
  assert.deepEqual(model.reports[0].rows, []);
  assert.equal(model.reports[1].rows[1].count, 0);
  assert.equal(model.reports[2].rows.at(-1).amount, -50);
  assert.equal(model.reports[3].rows[0].amount, 100);
  assert.equal(model.reports[3].rows[0].earliestDueDate, null);
  assert.equal(model.reports[3].rows[1].amount, 0);

  const negativeReceivable = dashboard();
  negativeReceivable.sections.receivables_ranking.data.items[0].receivable_amount = -1;
  const negativeReceivableModel = buildClientFixedReportsModel(negativeReceivable).reports[3];
  assert.equal(negativeReceivableModel.state, "error");
  assert.deepEqual(negativeReceivableModel.rows, []);
});

test("권한 경계를 우회하는 generic amount 필드는 리포트 값으로 승격하지 않는다", () => {
  const malformed = dashboard();
  delete malformed.sections.revenue_ranking.data.items[0].net_deposit_revenue;
  malformed.sections.revenue_ranking.data.items[0].amount = 99_999_999;
  const report = buildClientFixedReportsModel(malformed).reports[2];
  assert.equal(report.state, "error");
  assert.deepEqual(report.rows, []);
  assert.equal(JSON.stringify(report).includes("99999999"), false);
});

test("raw sections 또는 positive permission proof가 없는 data result는 fail-closed한다", () => {
  const rawSections = buildClientFixedReportsModel({ sections: dashboard().sections });
  assert.equal(rawSections.state, "error");
  assert.equal(rawSections.reports.every((report) => report.rows.length === 0), true);

  const missingProof = dashboard();
  delete missingProof.permissionPrefilterApplied;
  delete missingProof.countLeakPrevented;
  const missingProofModel = buildClientFixedReportsModel(missingProof);
  assert.equal(missingProofModel.reports.every((report) => report.rows.length === 0), true);
  assert.equal(missingProofModel.reports.every((report) => report.state === "denied"), true);
});

test("backend fixed-screen 네 스키마는 화면 행·열과 snapshot descriptor를 그대로 보존한다", () => {
  for (const reportId of Object.keys(fixedColumns)) {
    const screen = fixedScreen(reportId);
    const model = buildClientFixedReportsModel(screen);
    const report = selectClientFixedReport(model, reportId);

    assert.equal(model.state, "data");
    assert.equal(report.state, "data");
    assert.deepEqual(report.columns, fixedColumns[reportId]);
    assert.deepEqual(report.screenRows, screen.item.rows);
    assert.strictEqual(report.screenRows, report.rows);
    assert.deepEqual(report.exportRequest, {
      reportId,
      contractVersion: "client-fixed-reports.v1",
      snapshotToken: screen.item.snapshot.token,
      snapshotVersion: screen.item.snapshot.version,
    });
    assert.equal(
      model.reports
        .filter(({ id }) => id !== reportId)
        .every(({ state, rows, exportRequest: request }) => (
          state === "loading" && rows.length === 0 && request === null
        )),
      true,
    );
  }
});

test("backend fixed-screen의 extra/missing key, 열, 순위, 정렬, 날짜, 금액 오류는 해당 리포트를 fail-closed한다", () => {
  const cases = [
    (screen) => { screen.item.rows[0].extra = "leak"; },
    (screen) => { delete screen.item.rows[0].matched_inflow_amount; },
    (screen) => { screen.item.columns[0].label = "번호"; },
    (screen) => { screen.item.rows[0].rank = 2; },
    (screen) => {
      screen.item.rows[0].net_deposit_revenue = 1;
      screen.item.rows[1].net_deposit_revenue = 2;
    },
    (screen) => { screen.item.rows[0].latest_deposit_date = "2026-02-30"; },
    (screen) => { screen.item.rows[0].matched_inflow_amount = "700"; },
    (screen) => { screen.item.rows[0].client_name = "=HYPERLINK(\"https://bad.test\",\"열기\")"; },
    (screen) => { screen.item.row_count += 1; },
  ];
  for (const [caseIndex, mutate] of cases.entries()) {
    const screen = structuredClone(fixedScreen("revenue_ranking"));
    mutate(screen);
    const report = selectClientFixedReport(
      buildClientFixedReportsModel(screen),
      "revenue_ranking",
    );
    assert.equal(report.state, "error", `malformed case ${caseIndex + 1}`);
    assert.deepEqual(report.rows, [], `malformed case ${caseIndex + 1}`);
    assert.equal(report.exportRequest, null, `malformed case ${caseIndex + 1}`);
  }
});

test("fixed-screen snapshot mapping은 exact token/version만 허용하고 16KiB UTF-8 byte cap과 맞춘다", () => {
  const maximumToken = "a".repeat(16 * 1024);
  const maximum = fixedScreen("monthly_deposit_revenue");
  maximum.item.snapshot.token = maximumToken;
  maximum.exportSnapshot.token = maximumToken;
  const maximumReport = selectClientFixedReport(
    buildClientFixedReportsModel(maximum),
    "monthly_deposit_revenue",
  );
  assert.equal(maximumReport.exportRequest.snapshotToken, maximumToken);

  const oversized = fixedScreen("monthly_deposit_revenue");
  oversized.item.snapshot.token = `${maximumToken}a`;
  oversized.exportSnapshot.token = oversized.item.snapshot.token;
  assert.equal(
    selectClientFixedReport(
      buildClientFixedReportsModel(oversized),
      "monthly_deposit_revenue",
    ).exportRequest,
    null,
  );

  const mismatched = fixedScreen("monthly_deposit_revenue");
  mismatched.exportSnapshot = {
    token: `${mismatched.item.snapshot.token}-different`,
    version: 1,
  };
  const mismatchedReport = selectClientFixedReport(
    buildClientFixedReportsModel(mismatched),
    "monthly_deposit_revenue",
  );
  assert.deepEqual(mismatchedReport.screenRows, mismatched.item.rows);
  assert.equal(mismatchedReport.exportRequest, null);

  const versionChanged = fixedScreen("monthly_deposit_revenue");
  versionChanged.item.snapshot.version = 2;
  versionChanged.exportSnapshot.version = 2;
  assert.equal(
    selectClientFixedReport(
      buildClientFixedReportsModel(versionChanged),
      "monthly_deposit_revenue",
    ).exportRequest,
    null,
  );
});

test("opaque snapshot token은 URL 구두점과 Unicode를 그대로 보존하고 UTF-8 byte cap만 적용한다", () => {
  const forwardCompatibleToken =
    "lawos_client_fixed_report_v1 payload?cursor=100%25&고객=한빛";
  const forwardCompatible = fixedScreen("monthly_deposit_revenue");
  forwardCompatible.item.snapshot.token = forwardCompatibleToken;
  forwardCompatible.exportSnapshot.token = forwardCompatibleToken;
  assert.equal(
    selectClientFixedReport(
      buildClientFixedReportsModel(forwardCompatible),
      "monthly_deposit_revenue",
    ).exportRequest.snapshotToken,
    forwardCompatibleToken,
  );

  const maximumUnicodeToken = `${"한".repeat(5_461)}a`;
  assert.equal(new TextEncoder().encode(maximumUnicodeToken).byteLength, 16 * 1024);
  const maximumUnicode = fixedScreen("monthly_deposit_revenue");
  maximumUnicode.item.snapshot.token = maximumUnicodeToken;
  maximumUnicode.exportSnapshot.token = maximumUnicodeToken;
  assert.equal(
    selectClientFixedReport(
      buildClientFixedReportsModel(maximumUnicode),
      "monthly_deposit_revenue",
    ).exportRequest.snapshotToken,
    maximumUnicodeToken,
  );

  const oversizedUnicode = fixedScreen("monthly_deposit_revenue");
  oversizedUnicode.item.snapshot.token = `${maximumUnicodeToken}?`;
  oversizedUnicode.exportSnapshot.token = oversizedUnicode.item.snapshot.token;
  assert.equal(
    selectClientFixedReport(
      buildClientFixedReportsModel(oversizedUnicode),
      "monthly_deposit_revenue",
    ).exportRequest,
    null,
  );
});
