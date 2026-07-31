import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  writeFile
} from "node:fs/promises";
import {
  dirname,
  resolve
} from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  exportClientFixedReportCsv,
  fetchClientFixedReport,
  getClientFixedReportRouteContext
} from "../src/data/apiClient.js";

const TENANT = "tenant-client-fixed-reports-adapter";
const testDir = dirname(fileURLToPath(import.meta.url));
const evidenceDir = resolve(
  process.env.CLIENT_FIXED_REPORTS_INTEGRATION_EVIDENCE_DIR
    ?? resolve(
      testDir,
      "../../../.omo/evidence/client-fixed-reports-integration"
    )
);
const REPORT_IDS = [
  "monthly_deposit_revenue",
  "inquiry_status",
  "revenue_ranking",
  "receivables_ranking"
];
const COLUMNS = {
  monthly_deposit_revenue: [
    { key: "month", label: "월" },
    { key: "net_deposit_revenue", label: "입금 매출" }
  ],
  inquiry_status: [
    { key: "status", label: "상태" },
    { key: "count", label: "건수" }
  ],
  revenue_ranking: [
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "matched_inflow_amount", label: "연결 입금" },
    { key: "linked_refund_amount", label: "환불" },
    { key: "net_deposit_revenue", label: "입금 매출" },
    { key: "latest_deposit_date", label: "최근 입금일" }
  ],
  receivables_ranking: [
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "agreed_amount", label: "약정 수임료" },
    { key: "active_allocated_amount", label: "반영 입금" },
    { key: "receivable_amount", label: "미수금" },
    { key: "earliest_due_date", label: "가장 이른 지급기한" }
  ]
};
const ROWS = {
  monthly_deposit_revenue: Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 7 + index, 1));
    return {
      month: `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
      ).padStart(2, "0")}`,
      net_deposit_revenue: index === 11 ? 1_200_000 : 0
    };
  }),
  inquiry_status: [
    { status: "새 문의", count: 1 },
    { status: "확인 중", count: 2 },
    { status: "상담 예정", count: 3 },
    { status: "수임 검토 중", count: 4 },
    { status: "수임 확정", count: 5 },
    { status: "수임하지 않음", count: 6 }
  ],
  revenue_ranking: [
    {
      rank: 1,
      client_name: "한빛건설",
      matched_inflow_amount: 8_000_000,
      linked_refund_amount: 1_000_000,
      net_deposit_revenue: 7_000_000,
      latest_deposit_date: "2026-07-30"
    },
    {
      rank: 2,
      client_name: "새봄자문",
      matched_inflow_amount: 4_000_000,
      linked_refund_amount: 0,
      net_deposit_revenue: 4_000_000,
      latest_deposit_date: "2026-07-20"
    }
  ],
  receivables_ranking: [
    {
      rank: 1,
      client_name: "미수 고객",
      agreed_amount: 10_000_000,
      active_allocated_amount: 4_000_000,
      receivable_amount: 6_000_000,
      earliest_due_date: "2026-08-10"
    },
    {
      rank: 2,
      client_name: "정산 고객",
      agreed_amount: 3_000_000,
      active_allocated_amount: 3_000_000,
      receivable_amount: 0,
      earliest_due_date: null
    }
  ]
};

function installSession() {
  const values = new Map([
    ["lawos.api.session", JSON.stringify({
      token_type: "Bearer",
      session_token: "lawos_session_v1.client_fixed_reports_adapter",
      expires_at: "2099-01-01T00:00:00.000Z"
    })]
  ]);
  globalThis.sessionStorage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
  globalThis.__LAWOS_SESSION_CONTEXT__ = {
    schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
    state: "signed_in",
    session_ref: "session-client-fixed-reports-adapter",
    source: "api_signed_session",
    actor_ref: "user-client-fixed-reports-adapter",
    tenant_refs: { default: TENANT, client: TENANT },
    role_ids: ["analytics_user"],
    scopes: ["analytics:client:read", "analytics:client:export"],
    review_state: "allow",
    expires_at: "2099-01-01T00:00:00.000Z"
  };
}

function removeSession() {
  delete globalThis.__LAWOS_SESSION_CONTEXT__;
  delete globalThis.sessionStorage;
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function audit(action, decision = "allow") {
  return {
    event_id: `audit-${action}`,
    action,
    decision,
    tenant_authority: "signed_session",
    actor_id_included: false,
    tenant_id_included: false,
    raw_rows_included: false,
    source_values_included: false,
    production_ready_claim: false
  };
}

function screenBody(reportId, {
  outcome = "passed",
  rows = ROWS[reportId],
  itemExtra = {},
  extra = {}
} = {}) {
  return {
    request_id: `request-screen-${reportId}`,
    outcome,
    ui_state: outcome === "empty"
      ? "no_data"
      : outcome === "partial"
        ? "partial"
        : null,
    safe_error_codes: [],
    audit_hint_ref: "ui_client_fixed_reports_probe",
    production_ready_claim: false,
    raw_sql_included: false,
    raw_query_payload_included: false,
    source_payload_included: false,
    count_leak_prevented: true,
    audit_event: audit("report.client_fixed.screen.read"),
    item: {
      report_id: reportId,
      title: "서버 제목",
      columns: COLUMNS[reportId],
      rows: rows.map((row) => ({
        ...row,
        raw_client_group_id: "must-not-project"
      })),
      row_count: rows.length,
      row_limit: reportId === "monthly_deposit_revenue"
        ? 12
        : reportId === "inquiry_status"
          ? 6
          : 10,
      as_of: "2026-07-31T01:00:00.000Z",
      timezone: "Asia/Seoul",
      source_status: outcome === "empty"
        ? "no_data"
        : outcome === "partial"
          ? "partial"
          : "available",
      snapshot: {
        token: `lawos_client_fixed_report_v1.${reportId}-opaque`,
        version: 1,
        expires_at: "2099-01-01T00:10:00.000Z"
      },
      print_contract: {
        rows_source: "screen_snapshot",
        server_pdf_required: false
      },
      bounded_result: true,
      permission_prefilter_applied: true,
      count_leak_prevented: true,
      raw_bank_source_included: false,
      raw_source_payload_included: false,
      contact_pii_included: false,
      internal_ids_included: false,
      source_digest_included: false,
      production_ready_claim: false,
      source_payload: "must-not-project",
      ...itemExtra
    },
    raw_secret: "must-not-project",
    ...extra
  };
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/u.test(text)
    ? `"${text.replaceAll("\"", "\"\"")}"`
    : text;
}

function csvText(reportId) {
  return [
    COLUMNS[reportId].map(({ label }) => csvCell(label)).join(","),
    ...ROWS[reportId].map((row) => (
      COLUMNS[reportId].map(({ key }) => csvCell(row[key])).join(",")
    ))
  ].join("\n");
}

function exportBody(reportId, {
  outcome = "created",
  status = 201,
  idempotentReplay = outcome === "idempotent_replay",
  sourceStatus = outcome === "partial" ? "partial" : "available"
} = {}) {
  const text = csvText(reportId);
  const replay = idempotentReplay;
  return {
    status,
    body: {
      request_id: `request-export-${reportId}`,
      outcome,
      ui_state: outcome === "partial" ? "partial" : null,
      safe_error_codes: [],
      audit_hint_ref: "ui_client_fixed_reports_probe",
      production_ready_claim: false,
      raw_sql_included: false,
      raw_query_payload_included: false,
      source_payload_included: false,
      count_leak_prevented: true,
      idempotent_replay: replay,
      audit_event: audit(
        replay
          ? "report.client_fixed.csv.replay"
          : "report.client_fixed.csv.export",
        replay ? "replay" : "allow"
      ),
      item: {
        report_id: reportId,
        title: "서버 제목",
        columns: COLUMNS[reportId],
        rows: ROWS[reportId].map((row) => ({
          ...row,
          raw_bank_reference: "must-not-project"
        })),
        row_count: ROWS[reportId].length,
        snapshot_version: 1,
        as_of: "2026-07-31T01:00:00.000Z",
        source_status: sourceStatus,
        csv_text: text,
        csv_sha256: createHash("sha256").update(text).digest("hex"),
        csv_byte_size: Buffer.byteLength(text, "utf8"),
        mime_type: "text/csv; charset=utf-8",
        permission_prefilter_applied: true,
        count_leak_prevented: true,
        formula_injection_escaped: true,
        raw_bank_source_included: false,
        raw_source_payload_included: false,
        contact_pii_included: false,
        internal_ids_included: false,
        production_ready_claim: false,
        bank_account_number: "must-not-project"
      },
      raw_secret: "must-not-project"
    }
  };
}

test("CL-P5-W03-T03 fixed report route context requires one signed Client tenant", async (t) => {
  removeSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return response(screenBody(REPORT_IDS[0]));
  };
  assert.equal(getClientFixedReportRouteContext(), null);
  assert.equal((await fetchClientFixedReport({
    reportId: REPORT_IDS[0]
  })).safeErrorCodes[0], "SIGNED_SESSION_REQUIRED");
  assert.equal(called, false);

  installSession();
  assert.equal(getClientFixedReportRouteContext().tenant_id, TENANT);
  globalThis.__LAWOS_SESSION_CONTEXT__.tenant_refs.client = "tenant-other";
  assert.equal(getClientFixedReportRouteContext(), null);
  assert.equal((await fetchClientFixedReport({
    reportId: REPORT_IDS[0]
  })).safeErrorCodes[0], "SIGNED_SESSION_REQUIRED");
  assert.equal(called, false);
});

test("CL-P5-W03-T03 all four GET adapters use fixed routes and strip non-contract fields", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const calls = [];
  const queue = [...REPORT_IDS];
  globalThis.fetch = async (input, init) => {
    const reportId = queue.shift();
    calls.push({ input: String(input), init });
    return response(screenBody(reportId));
  };

  for (const reportId of REPORT_IDS) {
    const result = await fetchClientFixedReport({ reportId });
    assert.equal(result.kind, "data");
    assert.equal(result.item.report_id, reportId);
    assert.equal(result.item.row_count, ROWS[reportId].length);
    assert.equal(result.exportSnapshot.version, 1);
    assert.equal(JSON.stringify(result).includes("must-not-project"), false);
    assert.equal(
      result.item.rows.every((row) => (
        Object.keys(row).length === COLUMNS[reportId].length
      )),
      true
    );
  }

  assert.equal(calls.length, 4);
  calls.forEach((call, index) => {
    const url = new URL(call.input, "http://lawos.test");
    assert.equal(
      url.pathname,
      `/api/reports/clients/fixed/${REPORT_IDS[index]}`
    );
    assert.equal(url.searchParams.get("tenant_id"), TENANT);
    assert.equal(
      url.searchParams.get("permission_ref"),
      "ui_client_fixed_reports"
    );
    assert.equal(
      url.searchParams.get("audit_hint_ref"),
      "ui_client_fixed_reports_probe"
    );
    assert.equal(url.searchParams.get("timezone"), "Asia/Seoul");
    assert.equal(url.searchParams.get("revenue_ranking_period"), "year");
    assert.equal(call.init.headers.authorization, "Bearer lawos_session_v1.client_fixed_reports_adapter");
    const context = JSON.parse(
      call.init.headers["x-lawos-permission-context"]
    );
    assert.equal(context.principal.tenant_id, TENANT);
    assert.equal(context.principal.user_id, "user-client-fixed-reports-adapter");
    assert.deepEqual(
      context.rules.map(({ action }) => action),
      ["analytics:client:read"]
    );
  });
});

test("CL-P5-W03-T03 GET adapter distinguishes empty, denied, review, malformed and non-JSON status without rows", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const queue = [
    response(screenBody("revenue_ranking", {
      outcome: "empty",
      rows: []
    })),
    response({
      request_id: "request-denied",
      outcome: "denied",
      ui_state: "denied",
      items: [],
      safe_error_codes: ["CLIENT_FIXED_REPORT_READ_DENIED"],
      audit_recorded: true,
      count_leak_prevented: true,
      production_ready_claim: false
    }, 403),
    response({
      request_id: "request-review",
      outcome: "review_required",
      ui_state: "review_required",
      items: [],
      safe_error_codes: ["CLIENT_FIXED_REPORT_REVIEW_REQUIRED"],
      count_leak_prevented: true,
      production_ready_claim: false
    }),
    response(screenBody("revenue_ranking", {
      extra: { raw_sql_included: true }
    })),
    new Response("service unavailable", { status: 503 })
  ];
  globalThis.fetch = async () => queue.shift();
  const empty = await fetchClientFixedReport({ reportId: "revenue_ranking" });
  const denied = await fetchClientFixedReport({ reportId: "revenue_ranking" });
  const review = await fetchClientFixedReport({ reportId: "revenue_ranking" });
  const malformed = await fetchClientFixedReport({ reportId: "revenue_ranking" });
  const nonJson = await fetchClientFixedReport({ reportId: "revenue_ranking" });
  assert.deepEqual(
    [
      empty.uiState,
      denied.uiState,
      review.uiState,
      malformed.kind,
      nonJson.status
    ],
    ["empty", "denied", "review_required", "error", 503]
  );
  for (const result of [denied, review, malformed, nonJson]) {
    assert.equal(Object.hasOwn(result, "item"), false);
    assert.equal(JSON.stringify(result).includes("must-not-project"), false);
  }
});

test("CL-P5-W03-T03 GET adapter accepts audited partial rows but rejects malformed partial state", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const queue = [
    response(screenBody("revenue_ranking", {
      outcome: "partial",
      rows: ROWS.revenue_ranking.slice(0, 1)
    })),
    response({
      ...screenBody("revenue_ranking", {
        outcome: "partial",
        rows: ROWS.revenue_ranking.slice(0, 1)
      }),
      ui_state: null
    }),
    response(screenBody("revenue_ranking", {
      outcome: "partial",
      rows: ROWS.revenue_ranking.slice(0, 1),
      itemExtra: { source_status: "available" }
    })),
    response(screenBody("revenue_ranking", {
      outcome: "partial",
      rows: [{ ...ROWS.revenue_ranking[0], net_deposit_revenue: null }]
    })),
  ];
  globalThis.fetch = async () => queue.shift();

  const partial = await fetchClientFixedReport({ reportId: "revenue_ranking" });
  assert.equal(partial.kind, "data");
  assert.equal(partial.status, 200);
  assert.equal(partial.outcome, "partial");
  assert.equal(partial.uiState, "partial");
  assert.equal(partial.sourceStatus, "partial");
  assert.equal(partial.item.source_status, "partial");
  assert.equal(partial.item.rows.length, 1);
  assert.equal(partial.exportSnapshot.version, 1);

  const mismatchedUiState = await fetchClientFixedReport({ reportId: "revenue_ranking" });
  assert.equal(mismatchedUiState.safeErrorCodes[0], "CLIENT_FIXED_REPORT_RESPONSE_INVALID");
  assert.equal(mismatchedUiState.kind, "error");
  const mismatchedStatus = await fetchClientFixedReport({ reportId: "revenue_ranking" });
  assert.equal(mismatchedStatus.safeErrorCodes[0], "CLIENT_FIXED_REPORT_RESPONSE_INVALID");
  const malformedRow = await fetchClientFixedReport({ reportId: "revenue_ranking" });
  assert.equal(malformedRow.safeErrorCodes[0], "CLIENT_FIXED_REPORT_RESPONSE_INVALID");
  assert.equal(Object.hasOwn(malformedRow, "item"), false);
});

test("CL-P5-W03-T03 CSV adapter sends snapshot-only input, projects safe output, replays, and preserves non-JSON 409", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const calls = [];
  const queue = [
    exportBody("revenue_ranking"),
    exportBody("revenue_ranking", {
      outcome: "idempotent_replay",
      status: 200
    }),
    { status: 409, body: "conflict" }
  ];
  globalThis.fetch = async (input, init) => {
    calls.push({
      input: String(input),
      init,
      body: JSON.parse(init.body)
    });
    const next = queue.shift();
    return typeof next.body === "string"
      ? new Response(next.body, { status: next.status })
      : response(next.body, next.status);
  };
  const request = {
    reportId: "revenue_ranking",
    contractVersion: "client-fixed-reports.v1",
    snapshotToken: "lawos_client_fixed_report_v1.revenue-ranking-opaque",
    snapshotVersion: 1,
    idempotencyKey: "client_fixed_report_export:stable"
  };
  const created = await exportClientFixedReportCsv(request);
  const replay = await exportClientFixedReportCsv(request);
  const conflict = await exportClientFixedReportCsv(request);
  assert.equal(created.kind, "data");
  assert.equal(created.status, 201);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.status, 200);
  assert.equal(conflict.kind, "conflict");
  assert.equal(conflict.status, 409);
  assert.equal(JSON.stringify(created).includes("must-not-project"), false);
  assert.equal(
    created.item.rows.every((row) => (
      Object.keys(row).length === COLUMNS.revenue_ranking.length
    )),
    true
  );
  assert.equal(calls.length, 3);
  for (const call of calls) {
    const url = new URL(call.input, "http://lawos.test");
    assert.equal(
      url.pathname,
      "/api/reports/clients/fixed/revenue_ranking.csv"
    );
    assert.deepEqual(call.body, {
      tenant_id: TENANT,
      permission_ref: "ui_client_fixed_reports",
      audit_hint_ref: "ui_client_fixed_reports_probe",
      snapshot_token: request.snapshotToken,
      snapshot_version: 1,
      idempotency_key: request.idempotencyKey
    });
    assert.equal(Object.hasOwn(call.body, "rows"), false);
    assert.equal(Object.hasOwn(call.body, "columns"), false);
    assert.equal(Object.hasOwn(call.body, "contract_version"), false);
    const context = JSON.parse(
      call.init.headers["x-lawos-permission-context"]
    );
    assert.deepEqual(
      context.rules.map(({ action }) => action),
      ["analytics:client:read", "analytics:client:export"]
    );
  }
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    resolve(evidenceDir, "client-fixed-reports-api-observables.json"),
    `${JSON.stringify({
      scenario: "CL-P5-W03-T03-client-fixed-reports-api-adapter",
      reportIds: REPORT_IDS,
      signedClientTenantRequired: true,
      getRouteTemplate: "/api/reports/clients/fixed/:reportId",
      csvRouteTemplate: "/api/reports/clients/fixed/:reportId.csv",
      readPermissionActions: ["analytics:client:read"],
      exportPermissionActions: [
        "analytics:client:read",
        "analytics:client:export"
      ],
      snapshotOnlyExportFields: Object.keys(calls[0].body).sort(),
      forbiddenServerFieldsProjected: false,
      nonJsonConflictStatusPreserved: conflict.status,
      createdStatus: created.status,
      replayStatus: replay.status
    }, null, 2)}\n`,
    "utf8"
  );
});

test("CL-P5-W03-T03 CSV adapter accepts 201 partial and 200 partial replay, but rejects status mismatches", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const malformedUiState = exportBody("revenue_ranking", {
    outcome: "partial",
    status: 201,
    idempotentReplay: false,
    sourceStatus: "partial"
  });
  malformedUiState.body.ui_state = null;
  const queue = [
    exportBody("revenue_ranking", {
      outcome: "partial",
      status: 201,
      idempotentReplay: false,
      sourceStatus: "partial"
    }),
    exportBody("revenue_ranking", {
      outcome: "partial",
      status: 200,
      idempotentReplay: true,
      sourceStatus: "partial"
    }),
    malformedUiState,
    exportBody("revenue_ranking", {
      outcome: "partial",
      status: 201,
      idempotentReplay: false,
      sourceStatus: "available"
    })
  ];
  globalThis.fetch = async () => {
    const next = queue.shift();
    return response(next.body, next.status);
  };
  const request = {
    reportId: "revenue_ranking",
    contractVersion: "client-fixed-reports.v1",
    snapshotToken: "lawos_client_fixed_report_v1.revenue-ranking-opaque",
    snapshotVersion: 1,
    idempotencyKey: "client_fixed_report_export:partial"
  };
  const created = await exportClientFixedReportCsv(request);
  assert.equal(created.kind, "data");
  assert.equal(created.status, 201);
  assert.equal(created.outcome, "partial");
  assert.equal(created.uiState, "partial");
  assert.equal(created.idempotentReplay, false);
  assert.equal(created.sourceStatus, "partial");
  assert.equal(created.item.source_status, "partial");

  const replay = await exportClientFixedReportCsv(request);
  assert.equal(replay.kind, "data");
  assert.equal(replay.status, 200);
  assert.equal(replay.outcome, "partial");
  assert.equal(replay.uiState, "partial");
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.auditEvent.decision, "replay");

  const malformedUi = await exportClientFixedReportCsv(request);
  assert.equal(malformedUi.safeErrorCodes[0], "CLIENT_FIXED_REPORT_RESPONSE_INVALID");
  assert.equal(malformedUi.kind, "error");
  const malformedSource = await exportClientFixedReportCsv(request);
  assert.equal(malformedSource.safeErrorCodes[0], "CLIENT_FIXED_REPORT_RESPONSE_INVALID");
  assert.equal(Object.hasOwn(malformedSource, "item"), false);
});

test("CL-P5-W03-T03 invalid report, token, version and retry key fail before transport", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  let called = 0;
  globalThis.fetch = async () => {
    called += 1;
    return response(screenBody("monthly_deposit_revenue"));
  };
  assert.equal((await fetchClientFixedReport({
    reportId: "ad_hoc_report"
  })).kind, "error");
  for (const request of [
    {
      reportId: "monthly_deposit_revenue",
      contractVersion: "wrong",
      snapshotToken: "opaque",
      snapshotVersion: 1,
      idempotencyKey: "stable"
    },
    {
      reportId: "monthly_deposit_revenue",
      contractVersion: "client-fixed-reports.v1",
      snapshotToken: "",
      snapshotVersion: 1,
      idempotencyKey: "stable"
    },
    {
      reportId: "monthly_deposit_revenue",
      contractVersion: "client-fixed-reports.v1",
      snapshotToken: "opaque",
      snapshotVersion: 2,
      idempotencyKey: "stable"
    },
    {
      reportId: "monthly_deposit_revenue",
      contractVersion: "client-fixed-reports.v1",
      snapshotToken: "opaque",
      snapshotVersion: 1,
      idempotencyKey: "invalid key"
    }
  ]) {
    assert.equal(
      (await exportClientFixedReportCsv(request)).safeErrorCodes[0],
      "CLIENT_FIXED_REPORT_EXPORT_REQUEST_INVALID"
    );
  }
  assert.equal(called, 0);
});
