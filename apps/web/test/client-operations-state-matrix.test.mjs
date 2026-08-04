import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = resolve(webRoot, "../../.omo/evidence/client-operations-state-matrix");

const TENANTS = Object.freeze({
  default: "tenant_cmp_g7_synthetic",
  client: "tenant_cmp_g7_synthetic",
  finance: "tenant_cmp_g7_synthetic",
  analytics: "tenant_cmp_g8_synthetic",
  crm: "tenant_cmp_g6_synthetic",
  matter: "tenant_cmp_g7_synthetic",
  vault: "tenant_cmp_g7_synthetic"
});

const ROUTES = Object.freeze([
  { section: "clients-home", label: "대시보드" },
  { section: "clients-list", label: "고객 목록" },
  { section: "client-new", label: "신규 고객", actionOnly: true },
  { section: "client-leads", label: "새 문의" },
  { section: "client-sales-history", label: "입금 매출 내역" },
  { section: "client-opportunities", label: "수임 현황" },
  { section: "client-consultation-proposals", label: "상담·수임 관리" },
  { section: "client-activities", label: "접촉 이력" },
  { section: "client-billing", label: "수임료·미수금" },
  { section: "client-reports", label: "리포트" }
]);

const VIEWPORTS = Object.freeze([
  { name: "1440", width: 1440, height: 1000 },
  { name: "820", width: 820, height: 900 },
  { name: "390", width: 390, height: 844 }
]);

const STATE_PATTERNS = Object.freeze({
  loading: /(?:불러오는 중|확인하는 중|검토 중)/u,
  empty: /(?:데이터가 없습니다|등록된 .*없습니다|표시할 .*없습니다|없습니다\.?)/u,
  denied: /(?:권한이 없습니다|접근이 제한되었습니다|권한이 없어|접근 권한)/u,
  review_required: /(?:검토가 필요합니다|확인이 필요합니다|담당자 확인이 필요합니다|확인.*필요)/u,
  partial: /일부/u,
  error: /(?:불러오지 못했습니다|확인하지 못했습니다|처리하지 못했습니다|결과를 확인하지 못했습니다)/u
});

const MATRIX_STATES = Object.freeze([
  "loading",
  "empty",
  "denied",
  "review_required",
  "partial",
  "error"
]);

const KEYBOARD_NA_REASON = "이 상태 표면에는 경로별 키보드 상호작용이 없어 별도 N/A로 기록하고, 문의 상세 오버레이와 신규 고객 입력 폼에서 실제 키보드 이동을 검증합니다.";

function stateSemanticLocator(page, surface = "#clients-home") {
  return page.locator(`${surface} [role="status"], ${surface} [role="alert"]`);
}

async function semanticStateSnapshot(page, surface, pattern, context) {
  const semanticStates = stateSemanticLocator(page, surface);
  await semanticStates
    .filter({ hasText: pattern })
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });
  const semanticTexts = await semanticStates.allInnerTexts();
  assert.ok(semanticTexts.length > 0, `${context}: state copy must be exposed through role=status/alert`);
  assert.match(
    semanticTexts.join("\n"),
    pattern,
    `${context}: expected Korean state copy inside role=status/alert`
  );
  return semanticTexts;
}

async function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function sessionEnvelope() {
  return {
    schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
    state: "signed_in",
    session_ref: "session_client_operations_state_matrix",
    source: "api_signed_session",
    actor_ref: "user_client_operations_state_matrix",
    tenant_refs: TENANTS,
    role_ids: ["crm_operator"],
    scopes: [
      "analytics.client.read",
      "crm.inquiry.read",
      "crm.activity.read",
      "finance.client_deposit.read"
    ],
    review_state: "allow",
    expires_at: "2099-01-01T00:00:00.000Z"
  };
}

function fulfill(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body)
  });
}

function collection(pathname, state = "empty", items = []) {
  const partial = state === "partial";
  return {
    request_id: `state-matrix-${pathname.replace(/[^a-z0-9]+/giu, "-")}`,
    outcome: "passed",
    ui_state: partial ? "partial" : items.length ? null : "empty",
    items,
    page_info: {
      returned_count: items.length,
      omitted_item_count: null,
      has_more: false,
      next_cursor: null
    },
    safe_error_codes: [],
    audit_hint_ref: "ui_client_operations_state_matrix",
    count_leak_prevented: true,
    permission_prefilter_applied: true,
    unauthorized_count_included: false,
    raw_source_payload_included: false,
    production_ready_claim: false
  };
}

function clientItem() {
  return {
    client_group_id: "client-state-matrix",
    display_name: "상태 매트릭스 고객",
    status: "active",
    legal_form: "organization",
    member_count: 1,
    primary_record_present: true
  };
}

function inquiryItem() {
  return {
    tenant_id: TENANTS.crm,
    lead_id: "lead-state-matrix",
    version: 1,
    display_name: "상태 매트릭스 문의",
    visible_status: "new",
    visible_status_label: "새 문의",
    source: "manual",
    received_at: "2026-07-31T01:00:00.000Z",
    assigned_user_id: null,
    opportunity_id: "opp-state-matrix",
    engagement_decision: "pending",
    engagement_workflow_status: null,
    next_action: "담당 변호사 지정"
  };
}

function activityItem() {
  return {
    tenant_id: TENANTS.crm,
    resource_id: "activity-state-matrix",
    crm_activity_id: "activity-state-matrix",
    activity_kind: null,
    activity_type: "note",
    subject: "상태 매트릭스 메모",
    confidential: false,
    confidential_subject_included: true,
    confidential_details_included: true,
    version: 1,
    lead_id: "lead-state-matrix",
    opportunity_id: null,
    party_display_name: "상태 매트릭스 고객",
    scheduled_start: null,
    scheduled_end: null,
    timezone: null,
    completed_at: null,
    outcome: null,
    next_action: null,
    status: "active",
    occurred_at: null,
    created_at: "2026-07-31T00:00:00.000Z",
    updated_at: "2026-07-31T00:00:00.000Z",
    direct_matter_reference_included: false,
    production_ready_claim: false
  };
}

function opportunityItem() {
  return {
    opportunity_id: "opp-state-matrix",
    display_name: "상태 매트릭스 고객",
    requested_scope_summary: "계약 검토",
    stage: "qualified",
    status: "active",
    engagement_decision: "pending",
    engagement_decision_version: 1,
    engagement_workflow_status: null,
    intake_request_id: null
  };
}

function invoiceItem() {
  return {
    invoice_id: "invoice-state-matrix",
    status: "issued",
    amount_due: 1000000,
    amount_paid: 0,
    currency: "KRW"
  };
}

function arItem() {
  return {
    invoice_id: "invoice-state-matrix",
    status: "outstanding",
    balance: 1000000,
    billing_client_party_id: "client-state-matrix"
  };
}

function depositItem() {
  return {
    model_type: "ClientDeposit",
    resource_id: "bank-state-matrix",
    tenant_id: TENANTS.finance,
    bank_transaction_id: "bank-state-matrix",
    bank_transaction_classification_id: "classification-state-matrix",
    transaction_date: "2026-07-31",
    occurred_at: "2026-07-31T05:00:00.000Z",
    transaction_direction: "inflow",
    amount: 1500000,
    currency: "KRW",
    category: "client_receipt",
    category_label: "고객 매출",
    primary_type: "sales",
    client_group_id: "client-state-matrix",
    client_group_label: "상태 매트릭스 고객",
    status: "confirmed",
    confidence: "high",
    classification_source: "automatic",
    rationale_code: "client_exact",
    manual_lock: false,
    refund_of_bank_transaction_id: null,
    state_version: 1,
    source_type: "xlsx",
    source_file_sha256: "a".repeat(64),
    source_row_number: 1,
    source_page_number: null,
    bank_reference_hash: "b".repeat(64),
    available_commands: ["auto_classify", "manual_client_link"],
    source_metadata_included: false,
    raw_source_payload_included: false,
    raw_account_included: false,
    raw_counterparty_included: false,
    raw_memo_included: false,
    transaction_fingerprint_included: false,
    credential_material_included: false,
    production_ready_claim: false
  };
}

function supportedDepositCommands() {
  return [
    {
      command: "auto_classify",
      method: "POST",
      path: "/api/finance/bank-classifications/auto",
      required_body_fields: ["tenant_id", "bank_transaction_id", "expected_state_version"],
      response_binding_fields: ["bank_transaction_id", "bank_transaction_classification_id", "state_version", "client_group_id", "refund_of_bank_transaction_id", "idempotency_key", "request_fingerprint"]
    },
    {
      command: "manual_client_link",
      method: "POST",
      path: "/api/finance/bank-classifications/review",
      required_body_fields: ["tenant_id", "decisions[].bank_transaction_id"],
      response_binding_fields: ["bank_transaction_id", "bank_transaction_classification_id", "state_version", "client_group_id", "refund_of_bank_transaction_id", "idempotency_key", "request_fingerprint"]
    },
    {
      command: "refund_link",
      method: "POST",
      path: "/api/finance/bank-classifications/review",
      required_body_fields: ["tenant_id", "decisions[].refund_of_bank_transaction_id"],
      response_binding_fields: ["bank_transaction_id", "bank_transaction_classification_id", "state_version", "client_group_id", "refund_of_bank_transaction_id", "idempotency_key", "request_fingerprint"]
    }
  ];
}

function dashboardSection(status, data = {}) {
  return { status, data };
}

function dashboardBody(state = "empty") {
  const partial = state === "partial";
  const status = partial ? "partial" : state === "empty" ? "no_data" : "available";
  const values = partial
    ? {
      new_inquiries: null,
      consultations_today: null,
      engagement_reviews: null,
      deposit_revenue_month: 1500000,
      receivables_total: 1000000
    }
    : {
      new_inquiries: 0,
      consultations_today: 0,
      engagement_reviews: 0,
      deposit_revenue_month: 0,
      receivables_total: 0
    };
  const metricStatuses = partial
    ? {
      new_inquiries: "error",
      consultations_today: "error",
      engagement_reviews: "error",
      deposit_revenue_month: "available",
      receivables_total: "available"
    }
    : {
      new_inquiries: "no_data",
      consultations_today: "no_data",
      engagement_reviews: "no_data",
      deposit_revenue_month: "no_data",
      receivables_total: "no_data"
    };
  return {
    request_id: "dashboard-state-matrix",
    generated_at: "2026-07-31T03:00:00.000Z",
    as_of: "2026-07-31T03:00:00.000Z",
    timezone: "Asia/Seoul",
    outcome: partial ? "partial" : "complete",
    ui_state: partial ? "partial" : "no_data",
    sections: {
      kpis: dashboardSection(status, { values, metric_statuses: metricStatuses, currency: "KRW" }),
      attention_items: dashboardSection(status, { items: [], type_statuses: {} }),
      monthly_deposit_revenue: dashboardSection(status, {
        period: { from: "2025-08-01", to: "2026-07-31", month_count: 12 },
        total: partial ? 1500000 : 0,
        points: Array.from({ length: 12 }, (_, index) => {
          const month = new Date(Date.UTC(2025, 7 + index, 1)).toISOString().slice(0, 7);
          return {
            month,
            net_deposit_revenue: 0,
            destination: { section: "deposit_revenue", filter: "month", month }
          };
        })
      }),
      inquiry_status: dashboardSection(status, {
        total: 0,
        items: ["new", "reviewing", "consultation_scheduled", "engagement_review", "engaged", "not_engaged"].map((code) => ({
          code,
          label: code,
          count: 0,
          destination: { section: "new_inquiries", filter: code }
        }))
      }),
      revenue_ranking: dashboardSection(status, {
        selected_period: { code: "year", label: "올해 누적", from: "2026-01-01", to: "2026-07-31" },
        total: partial ? 1500000 : 0,
        items: []
      }),
      receivables_ranking: dashboardSection(status, {
        as_of: "2026-07-31T03:00:00.000Z",
        total: partial ? 1000000 : 0,
        unknown_amount_count: 0,
        items: []
      })
    },
    source_statuses: [],
    safe_error_codes: [],
    audit_hint_ref: "ui_client_operations_state_matrix",
    count_leak_prevented: true,
    permission_prefilter_applied: true,
    raw_bank_source_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    production_ready_claim: false
  };
}

function clientOperationsDetailBody(state = "empty") {
  const sectionStatus = state === "partial" ? "partial" : state === "empty" ? "no_data" : "available";
  return {
    request_id: "client-detail-state-matrix",
    outcome: state === "partial" ? "partial" : "passed",
    ui_state: state === "partial" ? "partial" : null,
    item: {
      outcome: state === "partial" ? "partial" : "passed",
      ui_state: state === "partial" ? "partial" : null,
      client: clientItem(),
      sections: {
        contacts: { status: sectionStatus, data: { items: [] } },
        matters: { status: sectionStatus, data: { items: [] } },
        inquiries: { status: sectionStatus, data: { items: [] } }
      },
      source_statuses: [],
      safe_error_codes: state === "partial" ? ["CLIENT_STATE_MATRIX_SOURCE_PARTIAL"] : [],
      count_leak_prevented: true,
      raw_contact_values_included: false,
      raw_source_payload_included: false
    },
    source_statuses: [],
    safe_error_codes: state === "partial" ? ["CLIENT_STATE_MATRIX_SOURCE_PARTIAL"] : [],
    permission_prefilter_applied: true,
    count_leak_prevented: true,
    raw_source_payload_included: false,
    production_ready_claim: false
  };
}

function reportBody(state = "empty") {
  return {
    request_id: "report-state-matrix",
    outcome: state === "partial" ? "partial" : state === "empty" ? "empty" : "error",
    ui_state: state === "partial" ? "partial" : state === "empty" ? "no_data" : "error",
    safe_error_codes: state === "partial" ? ["CLIENT_STATE_MATRIX_SOURCE_PARTIAL"] : [],
    audit_hint_ref: "ui_client_fixed_reports_probe",
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

const FIXED_REPORT_COLUMNS = Object.freeze({
  monthly_deposit_revenue: Object.freeze([
    { key: "month", label: "월" },
    { key: "net_deposit_revenue", label: "입금 매출" }
  ]),
  inquiry_status: Object.freeze([
    { key: "status", label: "상태" },
    { key: "count", label: "건수" }
  ]),
  revenue_ranking: Object.freeze([
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "matched_inflow_amount", label: "연결 입금" },
    { key: "linked_refund_amount", label: "환불" },
    { key: "net_deposit_revenue", label: "입금 매출" },
    { key: "latest_deposit_date", label: "최근 입금일" }
  ]),
  receivables_ranking: Object.freeze([
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "agreed_amount", label: "약정 수임료" },
    { key: "active_allocated_amount", label: "반영 입금" },
    { key: "receivable_amount", label: "미수금" },
    { key: "earliest_due_date", label: "가장 이른 지급기한" }
  ])
});

const FIXED_REPORT_ROWS = Object.freeze({
  monthly_deposit_revenue: Object.freeze(Array.from({ length: 12 }, (_, index) => ({
    month: `2025-${String(index + 8).padStart(2, "0")}`,
    net_deposit_revenue: index === 11 ? 1500000 : 0
  }))),
  inquiry_status: Object.freeze([
    { status: "새 문의", count: 0 },
    { status: "확인 중", count: 0 },
    { status: "상담 예정", count: 0 },
    { status: "수임 검토 중", count: 0 },
    { status: "수임 확정", count: 0 },
    { status: "수임하지 않음", count: 0 }
  ]),
  revenue_ranking: Object.freeze([
    {
      rank: 1,
      client_name: "상태 매트릭스 고객",
      matched_inflow_amount: 1500000,
      linked_refund_amount: 0,
      net_deposit_revenue: 1500000,
      latest_deposit_date: "2026-07-31"
    }
  ]),
  receivables_ranking: Object.freeze([
    {
      rank: 1,
      client_name: "상태 매트릭스 고객",
      agreed_amount: 1000000,
      active_allocated_amount: 0,
      receivable_amount: 1000000,
      earliest_due_date: "2026-08-31"
    }
  ])
});

const FIXED_REPORT_LIMITS = Object.freeze({
  monthly_deposit_revenue: 12,
  inquiry_status: 6,
  revenue_ranking: 10,
  receivables_ranking: 10
});

function fixedReportRows(reportId, state) {
  if (state === "empty") return [];
  if (state === "partial") {
    return FIXED_REPORT_ROWS[reportId].slice(
      0,
      reportId === "inquiry_status" ? 6 : 1
    );
  }
  return FIXED_REPORT_ROWS[reportId];
}

function fixedReportBody(pathname, state = "empty") {
  const match = pathname.match(/^\/api\/reports\/clients\/fixed\/([^/]+)$/u);
  const reportId = match?.[1];
  if (!reportId || !Object.hasOwn(FIXED_REPORT_COLUMNS, reportId)) {
    return reportBody(state);
  }
  const rows = fixedReportRows(reportId, state);
  const empty = state === "empty";
  const partial = state === "partial";
  return {
    request_id: `report-state-matrix-${reportId}`,
    outcome: partial ? "partial" : empty ? "empty" : "passed",
    ui_state: partial ? "partial" : empty ? "no_data" : null,
    safe_error_codes: [],
    audit_hint_ref: "ui_client_fixed_reports_probe",
    raw_sql_included: false,
    raw_query_payload_included: false,
    source_payload_included: false,
    count_leak_prevented: true,
    production_ready_claim: false,
    audit_event: {
      event_id: `audit-state-matrix-${reportId}`,
      action: "report.client_fixed.screen.read",
      decision: "allow",
      tenant_authority: "signed_session",
      actor_id_included: false,
      tenant_id_included: false,
      raw_rows_included: false,
      source_values_included: false,
      production_ready_claim: false
    },
    item: {
      report_id: reportId,
      title: reportId,
      columns: FIXED_REPORT_COLUMNS[reportId],
      rows,
      row_count: rows.length,
      row_limit: FIXED_REPORT_LIMITS[reportId],
      as_of: "2026-07-31T03:00:00.000Z",
      timezone: "Asia/Seoul",
      source_status: partial ? "partial" : empty ? "no_data" : "available",
      snapshot: {
        token: `lawos_client_fixed_report_v1.state-matrix-${reportId}`,
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
      production_ready_claim: false
    }
  };
}

function reviewBody(mode) {
  if (mode === "denied") {
    return {
      outcome: "denied",
      ui_state: "denied",
      safe_error_codes: ["CLIENT_STATE_MATRIX_DENIED"],
      audit_hint_ref: "ui_client_operations_state_matrix"
    };
  }
  if (mode === "review_required") {
    return {
      outcome: "review_required",
      ui_state: "review_required",
      safe_error_codes: ["CLIENT_STATE_MATRIX_REVIEW_REQUIRED"],
      audit_hint_ref: "ui_client_operations_state_matrix"
    };
  }
  if (mode === "error") {
    return {
      outcome: "blocked",
      ui_state: "error",
      safe_error_codes: ["CLIENT_STATE_MATRIX_ERROR"],
      audit_hint_ref: "ui_client_operations_state_matrix"
    };
  }
  return {
    outcome: "passed",
    ui_state: null,
    item: {
      review_digest: "state-matrix-review",
      candidates: [],
      has_restricted_candidates: false,
      can_create: true,
      requires_distinct_confirmation: false
    },
    safe_error_codes: [],
    audit_hint_ref: "ui_client_operations_state_matrix"
  };
}

function profileBody() {
  return {
    request_id: "profile-state-matrix",
    outcome: "passed",
    ui_state: null,
    item: { user_id: "user_client_operations_state_matrix", display_name: "상태 매트릭스" },
    safe_error_codes: [],
    audit_hint_ref: "ui_client_operations_state_matrix",
    production_ready_claim: false
  };
}

const CLIENT_RECEIVABLE_BOUNDARY = Object.freeze({
  count_leak_prevented: true,
  permission_prefilter_applied: true,
  unauthorized_count_included: false,
  raw_bank_source_included: false,
  raw_source_payload_included: false,
  source_metadata_included: false,
  raw_account_included: false,
  raw_counterparty_included: false,
  raw_memo_included: false,
  transaction_fingerprint_included: false,
  bank_reference_included: false,
  credential_material_included: false,
  invoice_required: false,
  matter_required: false,
  production_ready_claim: false
});

function clientReceivablesBody(state = "empty") {
  if (state === "partial") {
    return {
      request_id: "client-receivables-state-matrix",
      outcome: "partial",
      ui_state: "partial",
      safe_error_codes: ["CLIENT_STATE_MATRIX_SOURCE_PARTIAL"],
      audit_hint_ref: "ui_client_receivables_probe",
      ...CLIENT_RECEIVABLE_BOUNDARY
    };
  }
  if (state === "denied") {
    return {
      request_id: "client-receivables-state-matrix",
      outcome: "denied",
      ui_state: "denied",
      safe_error_codes: ["CLIENT_STATE_MATRIX_DENIED"],
      audit_hint_ref: "ui_client_receivables_probe",
      ...CLIENT_RECEIVABLE_BOUNDARY
    };
  }
  if (state === "review_required") {
    return {
      request_id: "client-receivables-state-matrix",
      outcome: "review_required",
      ui_state: "review_required",
      safe_error_codes: ["CLIENT_STATE_MATRIX_REVIEW_REQUIRED"],
      audit_hint_ref: "ui_client_receivables_probe",
      ...CLIENT_RECEIVABLE_BOUNDARY
    };
  }
  if (state === "error") {
    return {
      request_id: "client-receivables-state-matrix",
      outcome: "error",
      ui_state: "error",
      safe_error_codes: ["CLIENT_STATE_MATRIX_ERROR"],
      audit_hint_ref: "ui_client_receivables_probe",
      ...CLIENT_RECEIVABLE_BOUNDARY
    };
  }
  return {
    request_id: "client-receivables-state-matrix",
    outcome: "passed",
    ui_state: "empty",
    audit_hint_ref: "ui_client_receivables_probe",
    basis: "fee_commitment_and_bank_deposit",
    currency: "KRW",
    as_of: "2026-07-31T03:00:00.000Z",
    unallocated_amount_basis: "same_as_total_overpayment",
    total_receivables: 0,
    unknown_amount_count: 0,
    total_overpayment: 0,
    unallocated_amount: 0,
    clients: [],
    ranking: [],
    client_summaries: [],
    details: {
      fee_commitments: [],
      deposits: [],
      allocations: []
    },
    reconciliation: {
      status: "passed",
      ranking_total: 0,
      commitment_detail_total: 0,
      client_summary_total: 0,
      overpayment_detail_total: 0
    },
    safe_error_codes: [],
    ...CLIENT_RECEIVABLE_BOUNDARY
  };
}

function fixtureForPath(pathname, state, { data = false } = {}) {
  const items = data || state === "partial"
    ? pathname === "/api/analytics/clients"
      ? [clientItem()]
      : pathname === "/api/crm/inquiries"
        ? [inquiryItem()]
        : pathname === "/api/crm/opportunities"
          ? [opportunityItem()]
          : pathname === "/api/crm/activities"
            ? [activityItem()]
            : pathname === "/api/finance/invoices"
              ? [invoiceItem()]
              : pathname === "/api/finance/ar-aging"
                ? [arItem()]
                : pathname === "/api/finance/client-deposits"
                  ? [depositItem()]
                  : []
    : [];
  if (pathname === "/api/analytics/clients/dashboard") return dashboardBody(state);
  if (pathname === "/api/analytics/clients/client-state-matrix/operations") return clientOperationsDetailBody(state);
  if (pathname === "/api/finance/client-receivables") return clientReceivablesBody(state);
  if (pathname === "/api/finance/client-deposits" || pathname.startsWith("/api/finance/client-deposits/")) {
    const depositItems = pathname === "/api/finance/client-deposits" ? items : (data ? depositItem() : null);
    if (pathname === "/api/finance/client-deposits/") return collection(pathname, state, []);
    const body = pathname === "/api/finance/client-deposits"
      ? collection(pathname, state, depositItems)
      : {
        request_id: "client-deposit-detail-state-matrix",
        outcome: "passed",
        ui_state: null,
        item: depositItems,
        supported_commands: supportedDepositCommands(),
        safe_error_codes: [],
        audit_hint_ref: "ui_client_operations_state_matrix",
        permission_prefilter_applied: true,
        count_leak_prevented: true,
        unauthorized_count_included: false,
        raw_source_payload_included: false,
        production_ready_claim: false
      };
    if (pathname === "/api/finance/client-deposits" && state === "partial") body.outcome = "partial";
    body.supported_commands = supportedDepositCommands();
    body.permission_prefilter_applied = true;
    body.unauthorized_count_included = false;
    return body;
  }
  if (pathname === "/api/crm/inquiries") {
    return {
      ...collection(pathname, state, items),
      outcome: "passed",
      ui_state: state === "partial" ? "partial" : items.length ? null : "empty",
      data_status: state === "partial" ? "partial" : "complete",
      source_status: {
        crm_consultations: state === "partial" ? "partial" : "complete",
        crm_leads: state === "partial" ? "partial" : "complete",
        crm_opportunities: "complete"
      },
      permission_filter_applied: true
    };
  }
  if (pathname === "/api/crm/activities") {
    return {
      ...collection(pathname, state, items),
      outcome: "passed",
      ui_state: state === "partial" ? "partial" : items.length ? null : "empty",
      page_info: { returned_count: items.length, omitted_item_count: null },
      audit_hint_ref: "ui_cmp_g6_crm_activity_read_probe"
    };
  }
  if (pathname.startsWith("/api/reports")) return fixedReportBody(pathname, state);
  return collection(pathname, state, items);
}

function responseMode(url, request, pageState) {
  if (url.pathname === "/api/profile/me") return "profile";
  if (url.pathname.startsWith("/master-data/client-groups")) return pageState;
  if (request.method() !== "GET") return pageState;
  return pageState;
}

function routeUrl(port, route, state, viewportName = "1440", ctx = "allow") {
  return `http://127.0.0.1:${port}/?view=clients&ctx=${ctx}&matrix_state=${state}&matrix_viewport=${viewportName}#${route.section}`;
}

async function settle(page) {
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
}

async function overflow(page) {
  return page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth
  }));
}

async function installApi(page, pageState, { gate = null, gatePath = null, data = false } = {}) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!(url.pathname.startsWith("/api/") || url.pathname.startsWith("/master-data/"))) {
      return route.continue();
    }
    const mode = responseMode(url, request, pageState);
    if (mode === "profile") return fulfill(route, profileBody());
    if (pageState === "loading" && gate && (!gatePath || url.pathname === gatePath)) {
      gate.entered.resolve({ pathname: url.pathname, method: request.method() });
      await gate.release.promise;
    }
    if (url.pathname.startsWith("/master-data/client-groups")) {
      if (pageState === "error") return fulfill(route, reviewBody("error"), 503);
      if (["denied", "review_required"].includes(pageState)) return fulfill(route, reviewBody(pageState), pageState === "denied" ? 403 : 428);
      return fulfill(route, reviewBody("data"));
    }
    if (url.pathname === "/api/finance/client-receivables" && ["denied", "review_required"].includes(pageState)) {
      return fulfill(route, clientReceivablesBody(pageState), pageState === "denied" ? 403 : 428);
    }
    if (["denied", "review_required"].includes(pageState)) {
      const body = reviewBody(pageState);
      return fulfill(route, body, pageState === "denied" ? 403 : 428);
    }
    if (url.pathname === "/api/finance/client-receivables" && pageState === "error") {
      return fulfill(route, clientReceivablesBody("error"), 503);
    }
    if (pageState === "error") {
      return fulfill(route, {
        ...collection(url.pathname, "error", []),
        outcome: "error",
        ui_state: "error",
        safe_error_codes: ["CLIENT_STATE_MATRIX_ERROR"]
      }, 503);
    }
    return fulfill(route, fixtureForPath(url.pathname, pageState, { data }));
  });
}

async function preparePage(browser, viewport, pageState, options = {}) {
  const page = await browser.newPage({ viewport });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ envelope }) => {
    sessionStorage.setItem("lawos.api.session", JSON.stringify({
      token_type: "Bearer",
      session_token: "lawos_session_v1.client_operations_state_matrix",
      expires_at: envelope.expires_at,
      session: {
        user_id: envelope.actor_ref,
        tenant_id: envelope.tenant_refs.default
      }
    }));
    sessionStorage.setItem("lawos.session.envelope", JSON.stringify(envelope));
  }, { envelope: sessionEnvelope() });
  await installApi(page, pageState, options);
  return page;
}

async function assertRouteMounted(page, route) {
  assert.equal(new URL(page.url()).hash, `#${route.section}`, `route hash for ${route.section}`);
  assert.equal(await page.locator("#clients-home").count(), 1, `Client root for ${route.section}`);
}

async function assertState(page, route, state, record) {
  const bodyText = await page.locator("#clients-home").innerText();
  const pattern = route.section === "client-reports" && state === "partial"
    ? /(?:일부|확인된 자료만 표시)/u
    : STATE_PATTERNS[state];
  const semanticTexts = pattern
    ? await semanticStateSnapshot(
      page,
      "#clients-home",
      pattern,
      `${route.section}@${state}@${record.viewport}`
    )
    : [];
  const present = pattern ? pattern.test(semanticTexts.join("\n")) : false;
  record.states.push({
    route: route.section,
    state,
    present,
    semanticTexts,
    bodyText: bodyText.slice(0, 1200)
  });
  if (!present) {
    record.productGaps.push({
      route: route.section,
      state,
      kind: "state_copy_missing",
      viewport: record.viewport,
      expected: String(pattern),
      statusTexts: semanticTexts,
      note: "No matching Korean state copy was visible for this route/state; this is reported without changing shared product sources."
    });
  }
  if (state !== "data") {
    assert.ok(semanticTexts.length > 0, `${route.section}@${state}@${record.viewport}: state semantics`);
  }
}

async function assertRegistrationState(page, state, record, viewport, bodyText, { semanticTexts: providedSemanticTexts = null } = {}) {
  const pattern = STATE_PATTERNS[state];
  const semanticTexts = providedSemanticTexts ?? await semanticStateSnapshot(
    page,
    '[data-client-registration="true"]',
    pattern,
    `client-new@${state}@${viewport}`
  );
  assert.ok(semanticTexts.length > 0, `client-new@${state}@${viewport}: state copy must be exposed through role=status/alert`);
  const present = pattern.test(semanticTexts.join("\n"));
  record.states.push({
    route: "client-new",
    state,
    present,
    semanticTexts,
    bodyText: bodyText.slice(0, 1200)
  });
  if (!present) {
    record.productGaps.push({
      route: "client-new",
      state,
      kind: "state_copy_missing",
      viewport,
      expected: String(pattern),
      statusTexts: semanticTexts
    });
  }
  assert.ok(present, `client-new@${state}@${viewport}: Korean state copy`);
  return semanticTexts;
}

async function assertRegistrationKeyboardTraversal(page, context) {
  const nameInput = page.getByLabel("고객명");
  const reviewButton = page.getByRole("button", { name: "중복 확인", exact: true });
  await nameInput.focus();
  const traversed = [];
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => {
      const element = document.activeElement;
      return element
        ? {
          tag: element.tagName,
          id: element.id || null,
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
          text: element.textContent?.trim().slice(0, 80) ?? ""
        }
        : null;
    });
    traversed.push(active);
    if (await reviewButton.evaluate((element) => document.activeElement === element)) break;
  }
  assert.equal(
    await reviewButton.evaluate((element) => document.activeElement === element),
    true,
    `${context}: Tab traversal must reach 중복 확인`
  );
  return {
    applicability: "tested",
    keyboard: true,
    method: "tab",
    start: "고객명",
    target: "중복 확인",
    tab_steps: traversed.length,
    traversed
  };
}

function keyboardNotApplicable(route, state, viewport, reason = KEYBOARD_NA_REASON) {
  return {
    route,
    state,
    viewport,
    applicability: "n/a",
    keyboard: false,
    reason
  };
}

function coordinateKey({ route, state, viewport }) {
  return `${route}|${state}|${viewport}`;
}

function expectedCoordinateKeys() {
  return ROUTES.flatMap((route) => MATRIX_STATES.flatMap((state) => VIEWPORTS.map((viewport) => (
    coordinateKey({ route: route.section, state, viewport: viewport.name })
  ))));
}

function assertExactCoordinateCoverage(label, records, expectedKeys) {
  const actualKeys = records.map(coordinateKey);
  const expectedSet = new Set(expectedKeys);
  const actualSet = new Set(actualKeys);
  const missing = expectedKeys.filter((key) => !actualSet.has(key));
  const unexpected = [...actualSet].filter((key) => !expectedSet.has(key));
  const duplicates = actualKeys.filter((key, index) => actualKeys.indexOf(key) !== index);
  assert.equal(records.length, expectedKeys.length, `${label}: record count`);
  assert.equal(actualSet.size, expectedSet.size, `${label}: unique coordinate count`);
  assert.deepEqual([...actualSet].sort(), [...expectedSet].sort(), `${label}: exact coordinate set`);
  assert.deepEqual(missing, [], `${label}: missing coordinates`);
  assert.deepEqual(unexpected, [], `${label}: unexpected coordinates`);
  assert.deepEqual([...new Set(duplicates)], [], `${label}: duplicate coordinates`);
}

test("CL-P6-W02-T01 Client 10개 메뉴 상태·한국어·접근성·반응형 매트릭스", async () => {
  await mkdir(evidenceDir, { recursive: true });
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true, hmr: false }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const receipt = {
    schema_version: "law-firm-os.client-operations-state-matrix.v0.1",
    test_id: "CL-P6-W02-T01",
    invocation: "PATH=\"/opt/homebrew/opt/node@22/bin:$PATH\" node --test --test-concurrency=1 apps/web/test/client-operations-state-matrix.test.mjs",
    generated_at: new Date().toISOString(),
    route_count: ROUTES.length,
    routes: ROUTES.map(({ section, label }) => ({ section, label })),
    viewports: VIEWPORTS,
    states: [...MATRIX_STATES],
    states_checked: [],
    screenshots: [],
    focus_checks: [],
    overflow_checks: [],
    product_gaps: [],
    product_gap_observations: [],
    result: "in_progress"
  };
  try {
    // First pass: every visible Client route at the no-data boundary and all
    // required viewports. The strict AR/report envelopes are exercised by the
    // same fixture contract in the state passes below.
    for (const route of ROUTES) {
      for (const viewport of VIEWPORTS) {
        const page = await preparePage(browser, { width: viewport.width, height: viewport.height }, "empty");
        try {
          await page.goto(routeUrl(port, route, "empty", viewport.name), { waitUntil: "domcontentloaded" });
          await settle(page);
          const record = { route: route.section, viewport: viewport.name, state: "empty", states: [], productGaps: [], notes: [] };
          await assertRouteMounted(page, route);
          if (route.actionOnly) {
            record.applicability = "n/a";
            record.reason = "신규 고객은 중복 확인 전 목록 read boundary가 없어 empty 상태가 적용되지 않습니다.";
            record.notes.push("New-customer form has no list read boundary before duplicate review; registration action states are checked separately.");
          } else {
            await assertState(page, route, "empty", record);
          }
          receipt.focus_checks.push(
            keyboardNotApplicable(route.section, "empty", viewport.name, route.actionOnly
              ? "신규 고객 empty는 중복 확인 command 전 목록 read boundary가 없어 N/A입니다."
              : KEYBOARD_NA_REASON)
          );
          const dimensions = await overflow(page);
          assert.deepEqual(dimensions, { document: 0, body: 0 }, `no horizontal overflow for ${route.section}@${viewport.name}`);
          receipt.overflow_checks.push({ route: route.section, viewport: viewport.name, state: "empty", ...dimensions });
          await page.screenshot({ path: resolve(evidenceDir, `empty-${route.section}-${viewport.name}.png`), fullPage: true });
          receipt.screenshots.push(`empty-${route.section}-${viewport.name}.png`);
          receipt.states_checked.push(record);
          receipt.product_gaps.push(...record.productGaps);
        } finally {
          await page.close();
        }
      }
    }

    // Second pass: each state is exercised against every route whose surface
    // has a read boundary. New-customer's loading/denied/review/error states
    // are produced by submitting its duplicate-review action below.
    for (const state of ["loading", "denied", "review_required", "partial", "error"]) {
      for (const route of ROUTES.filter(({ actionOnly }) => !actionOnly)) {
        const gate = state === "loading"
          ? { entered: deferred(), release: deferred() }
          : null;
        const page = await preparePage(browser, { width: 820, height: 900 }, state, { gate, data: state === "partial" });
        try {
          const context = state === "denied" ? "denied" : state === "review_required" ? "review" : "allow";
          const url = routeUrl(port, route, state, "820", context);
          const gotoPromise = page.goto(url, { waitUntil: "domcontentloaded" });
          const record = { route: route.section, viewport: "820", state, states: [], productGaps: [] };
          if (gate) {
            await gate.entered.promise;
            await page.locator("#clients-home").waitFor();
            await settle(page);
            await assertRouteMounted(page, route);
            await assertState(page, route, "loading", record);
            gate.release.resolve();
          }
          await gotoPromise;
          await settle(page);
          if (!gate) {
            await assertRouteMounted(page, route);
            await assertState(page, route, state, record);
          } else {
            await assertRouteMounted(page, route);
          }
          receipt.focus_checks.push(keyboardNotApplicable(route.section, state, "820"));
          receipt.states_checked.push(record);
          receipt.product_gaps.push(...record.productGaps);
          const dimensions = await overflow(page);
          receipt.overflow_checks.push({ route: route.section, viewport: "820", state, ...dimensions });
          if (dimensions.document !== 0 || dimensions.body !== 0) {
            assert.deepEqual(dimensions, { document: 0, body: 0 }, `state overflow for ${route.section}@${state}`);
          }
        } finally {
          await page.close();
        }
      }
    }

    // New-customer action states: this route is intentionally a form until a
    // user submits duplicate review, so its guarded/error/loading boundaries
    // are checked through the existing registration interaction.
    for (const state of ["loading", "denied", "review_required", "error"]) {
      const gate = state === "loading" ? { entered: deferred(), release: deferred() } : null;
      const page = await preparePage(browser, { width: 390, height: 844 }, state, {
        gate,
        gatePath: "/master-data/client-groups/review"
      });
      try {
        await page.goto(routeUrl(port, ROUTES[2], state, "390", state === "denied" ? "denied" : state === "review_required" ? "review" : "allow"), { waitUntil: "domcontentloaded" });
        await page.locator('[data-client-registration="true"]').waitFor();
        const record = {
          route: "client-new",
          viewport: "390",
          state,
          states: [],
          productGaps: []
        };
        await assertRouteMounted(page, ROUTES[2]);
        await page.getByLabel("고객명").fill(`상태 ${state}`);
        const reviewPromise = page.getByRole("button", { name: "중복 확인", exact: true }).click();
        let text;
        let semanticStateTexts;
        if (gate) {
          await gate.entered.promise;
          text = await page.locator("[data-client-registration]").innerText();
          assert.match(text, /중복 여부를 확인하는 중입니다/u);
          semanticStateTexts = await semanticStateSnapshot(
            page,
            '[data-client-registration="true"]',
            STATE_PATTERNS[state],
            `client-new@${state}@390`
          );
          gate.release.resolve();
        } else {
          await reviewPromise;
          await settle(page);
          text = await page.locator("[data-client-registration]").innerText();
          semanticStateTexts = await semanticStateSnapshot(
            page,
            '[data-client-registration="true"]',
            STATE_PATTERNS[state],
            `client-new@${state}@390`
          );
        }
        if (gate) await reviewPromise;
        await assertRegistrationState(page, state, record, "390", text, { semanticTexts: semanticStateTexts });
        receipt.states_checked.push(record);
        receipt.product_gaps.push(...record.productGaps);
        receipt.focus_checks.push({
          route: "client-new",
          state,
          viewport: "390",
          ...(await assertRegistrationKeyboardTraversal(page, `client-new@${state}@390`))
        });
        const dimensions = await overflow(page);
        receipt.overflow_checks.push({ route: "client-new", viewport: "390", state, ...dimensions });
        assert.deepEqual(dimensions, { document: 0, body: 0 }, `new-customer overflow @${state}`);
      } finally {
        await page.close();
      }
    }

    // Complete the matrix at the two viewports not covered by the compact
    // smoke pass above. Every read-backed route is exercised for all six
    // states at 1440/820/390; the explicit action-only cases below record the
    // same coordinates for the registration form's separate command flow.
    for (const viewport of VIEWPORTS.filter(({ name }) => name !== "820")) {
      for (const state of ["loading", "denied", "review_required", "partial", "error"]) {
        for (const route of ROUTES.filter(({ actionOnly }) => !actionOnly)) {
          const gate = state === "loading"
            ? { entered: deferred(), release: deferred() }
            : null;
          const page = await preparePage(
            browser,
            { width: viewport.width, height: viewport.height },
            state,
            { gate, data: state === "partial" }
          );
          try {
            const context = state === "denied"
              ? "denied"
              : state === "review_required"
                ? "review"
                : "allow";
            const gotoPromise = page.goto(
              routeUrl(port, route, state, viewport.name, context),
              { waitUntil: "domcontentloaded" }
            );
            const record = {
              route: route.section,
              viewport: viewport.name,
              state,
              states: [],
              productGaps: [],
              notes: []
            };
            if (gate) {
              await gate.entered.promise;
              await page.locator("#clients-home").waitFor();
              await settle(page);
              await assertRouteMounted(page, route);
              await assertState(page, route, "loading", record);
              gate.release.resolve();
            }
            await gotoPromise;
            await settle(page);
            await assertRouteMounted(page, route);
            if (!gate) await assertState(page, route, state, record);
            receipt.focus_checks.push(keyboardNotApplicable(route.section, state, viewport.name));
            const dimensions = await overflow(page);
            assert.deepEqual(
              dimensions,
              { document: 0, body: 0 },
              `state overflow for ${route.section}@${state}@${viewport.name}`
            );
            receipt.overflow_checks.push({
              route: route.section,
              viewport: viewport.name,
              state,
              ...dimensions
            });
            receipt.states_checked.push(record);
            receipt.product_gaps.push(...record.productGaps);
          } finally {
            await page.close();
          }
        }
      }
    }

    // New-customer is an action-only route: its list read states are not
    // applicable until duplicate review is submitted. Register the N/A
    // coordinates explicitly, and run the command states at the remaining
    // viewports instead of silently dropping them from the matrix.
    for (const viewport of VIEWPORTS.filter(({ name }) => name !== "390")) {
      for (const state of ["loading", "denied", "review_required", "error"]) {
        const gate = state === "loading"
          ? { entered: deferred(), release: deferred() }
          : null;
        const page = await preparePage(
          browser,
          { width: viewport.width, height: viewport.height },
          state,
          { gate, gatePath: "/master-data/client-groups/review" }
        );
        try {
          await page.goto(
            routeUrl(
              port,
              ROUTES[2],
              state,
              viewport.name,
              state === "denied" ? "denied" : state === "review_required" ? "review" : "allow"
            ),
            { waitUntil: "domcontentloaded" }
          );
          await page.locator('[data-client-registration="true"]').waitFor();
          const record = {
            route: "client-new",
            viewport: viewport.name,
            state,
            states: [],
            productGaps: []
          };
          await assertRouteMounted(page, ROUTES[2]);
          await page.getByLabel("고객명").fill(`상태 ${state}`);
          const reviewPromise = page.getByRole("button", { name: "중복 확인", exact: true }).click();
          let text;
          let semanticStateTexts;
          if (gate) {
            await gate.entered.promise;
            text = await page.locator("[data-client-registration]").innerText();
            assert.match(text, /중복 여부를 확인하는 중입니다/u);
            semanticStateTexts = await semanticStateSnapshot(
              page,
              '[data-client-registration="true"]',
              STATE_PATTERNS[state],
              `client-new@${state}@${viewport.name}`
            );
            gate.release.resolve();
          } else {
            await reviewPromise;
            await settle(page);
            text = await page.locator("[data-client-registration]").innerText();
            semanticStateTexts = await semanticStateSnapshot(
              page,
              '[data-client-registration="true"]',
              STATE_PATTERNS[state],
              `client-new@${state}@${viewport.name}`
            );
          }
          if (gate) await reviewPromise;
          await assertRegistrationState(page, state, record, viewport.name, text, { semanticTexts: semanticStateTexts });
          receipt.focus_checks.push({
            route: "client-new",
            state,
            viewport: viewport.name,
            ...(await assertRegistrationKeyboardTraversal(page, `client-new@${state}@${viewport.name}`))
          });
          const dimensions = await overflow(page);
          assert.deepEqual(
            dimensions,
            { document: 0, body: 0 },
            `new-customer overflow @${state}@${viewport.name}`
          );
          receipt.overflow_checks.push({
            route: "client-new",
            viewport: viewport.name,
            state,
            ...dimensions
          });
          receipt.states_checked.push(record);
          receipt.product_gaps.push(...record.productGaps);
        } finally {
          await page.close();
        }
      }
    }

    for (const viewport of VIEWPORTS) {
      const page = await preparePage(
        browser,
        { width: viewport.width, height: viewport.height },
        "partial"
      );
      try {
        await page.goto(
          routeUrl(port, ROUTES[2], "partial", viewport.name),
          { waitUntil: "domcontentloaded" }
        );
        await page.locator('[data-client-registration="true"]').waitFor();
        const record = {
          route: "client-new",
          viewport: viewport.name,
          state: "partial",
          applicability: "n/a",
          reason: "신규 고객은 목록 read boundary가 없고 중복 검토 command flow에서 loading/denied/review/error만 발생합니다.",
          states: [],
          productGaps: [],
          notes: [
            "N/A: 신규 고객은 목록 read boundary가 없고 중복 검토 command flow에서 loading/denied/review/error만 발생합니다."
          ]
        };
        await assertRouteMounted(page, ROUTES[2]);
        receipt.focus_checks.push(keyboardNotApplicable(
          "client-new",
          "partial",
          viewport.name,
          "신규 고객 partial은 목록 read boundary가 없어 중복 검토 command에만 상태가 적용되므로 N/A입니다."
        ));
        const dimensions = await overflow(page);
        assert.deepEqual(
          dimensions,
          { document: 0, body: 0 },
          `new-customer N/A overflow @partial@${viewport.name}`
        );
        receipt.overflow_checks.push({
          route: "client-new",
          viewport: viewport.name,
          state: "partial",
          ...dimensions
        });
        receipt.states_checked.push(record);
      } finally {
        await page.close();
      }
    }

    // Focus semantics: a data-backed inquiry row opens a labelled dialog,
    // Escape returns to the originating row, and a short Tab cycle remains in
    // the dialog. The same keyboard semantics are covered in the dedicated
    // inquiry harness; this assertion keeps the P6 matrix tied to the route.
    const page = await preparePage(browser, { width: 1440, height: 1000 }, "data", { data: true });
    try {
      await page.goto(routeUrl(port, ROUTES.find(({ section }) => section === "client-leads"), "data", "1440"), { waitUntil: "domcontentloaded" });
      await page.locator('[data-client-inquiry-row-button="true"]').first().waitFor();
      const trigger = page.locator('[data-client-inquiry-row-button="true"]').first();
      await trigger.focus();
      assert.equal(await trigger.evaluate((element) => document.activeElement === element), true);
      await page.keyboard.press("Enter");
      await page.locator('[data-record-overlay="inquiry"]').waitFor();
      const dialog = page.getByRole("dialog");
      assert.equal(await dialog.count(), 1);
      assert.match(await dialog.getAttribute("aria-label"), /문의 상세/u);
      const close = dialog.getByRole("button", { name: "문의 상세 닫기", exact: true });
      assert.equal(await close.evaluate((element) => document.activeElement === element), true);
      await page.keyboard.press("Tab");
      assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector('[data-record-overlay="inquiry"]'));
      await page.waitForFunction(() => (
        document.activeElement?.matches('[data-client-inquiry-row-button="true"]')
      ));
      assert.equal(await trigger.evaluate((element) => document.activeElement === element), true);
      receipt.focus_checks.push({
        route: "client-leads",
        state: "data",
        viewport: "1440",
        applicability: "tested",
        keyboard: true,
        method: "enter-tab-escape",
        dialog: true,
        escapeFocusReturned: true,
        tabStayedInDialog: true
      });
    } finally {
      await page.close();
    }
    const expectedKeys = expectedCoordinateKeys();
    assertExactCoordinateCoverage("state matrix", receipt.states_checked, expectedKeys);
    assertExactCoordinateCoverage("overflow matrix", receipt.overflow_checks, expectedKeys);
    const observations = receipt.product_gaps.map((gap) => ({ ...gap }));
    const uniqueGaps = new Map();
    for (const gap of observations) {
      const key = [gap.route, gap.state ?? "", gap.kind].join("|");
      const current = uniqueGaps.get(key);
      if (current) {
        if (gap.viewport && !current.observed_viewports.includes(gap.viewport)) current.observed_viewports.push(gap.viewport);
      } else {
        uniqueGaps.set(key, {
          ...gap,
          observed_viewports: gap.viewport ? [gap.viewport] : []
        });
      }
    }
    receipt.product_gap_observations = observations;
    receipt.product_gaps = [...uniqueGaps.values()]
      .sort((left, right) => [left.route, left.state ?? "", left.kind].join("|").localeCompare([right.route, right.state ?? "", right.kind].join("|")));
    receipt.result = receipt.product_gaps.length > 0 ? "pass_with_product_gaps" : "passed";
    assert.equal(receipt.result, "passed", "Client state matrix must have zero product gaps");
    assert.equal(receipt.product_gaps.length, 0, "Client state matrix product gaps");
  } catch (error) {
    receipt.result = "failed";
    receipt.failure = {
      name: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : String(error)
    };
    throw error;
  } finally {
    await writeFile(resolve(evidenceDir, "state-matrix-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
    await browser.close();
    await server.close();
  }
});

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolveValue) => {
    resolvePromise = resolveValue;
  });
  return { promise, resolve: resolvePromise };
}
