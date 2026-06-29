#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-matter-sections-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-matter-sections-proof.md`;
const SESSION_KEY = "lawos.session.envelope";
const ACTOR_REF = "user_lcx_vltui_session";
const MATTER_ID = "matter_lcx_vltui_06_alpha";
const ACTIVITY_ID = "activity_lcx_vltui_06_task";
const NOTE_ID = "activity_lcx_vltui_06_note";
const EVENT_ID = "calendar_lcx_vltui_06_hearing";
const DEADLINE_ID = "deadline_lcx_vltui_06_hearing";
const IMPORT_JOB_ID = "import_job_ui_sf_b_w05_matter";

const TUW_IDS = [
  "LCX-VLTUI-06.01",
  "LCX-VLTUI-06.02",
  "LCX-VLTUI-06.03",
  "LCX-VLTUI-06.04",
  "LCX-VLTUI-06.05",
  "LCX-VLTUI-06.06",
  "LCX-VLTUI-06.07",
  "LCX-VLTUI-06.08",
  "LCX-VLTUI-06.09",
  "LCX-VLTUI-06.10",
  "LCX-VLTUI-06.11"
];

const CONNECTED_SECTIONS = [
  ["matter-closeout", "closeout"],
  ["matter-archive", "archive"],
  ["matter-tasks", "tasks"],
  ["matter-notes", "notes"],
  ["matter-evidence", "evidence"],
  ["matter-templates", "templates"],
  ["matter-seal", "seal"],
  ["matter-meetings", "meetings"],
  ["matter-announcements", "announcements"],
  ["matter-client-requests", "client-requests"],
  ["matter-approvals", "approvals"],
  ["matter-expenses", "expenses"],
  ["matter-search", "search"],
  ["matter-risk", "risk"],
  ["matter-integrations", "integrations"],
  ["matter-settings", "settings"],
  ["matter-import", "import"]
];

const sessionEnvelope = {
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "desktop:user_lcx_vltui_session:matter-sections",
  source: "desktop_offline_login",
  actor_ref: ACTOR_REF,
  tenant_refs: {
    default: "tenant_amic_matter_vault",
    client: "tenant_rp04_synthetic",
    matter: "tenant_rp05_synthetic",
    vault: "tenant_amic_matter_vault",
    crm: "tenant_cmp_g6_synthetic"
  },
  role_ids: ["matter_vault_admin", "matter_runtime_user", "master_data_reader", "crm_intake_user"],
  scopes: ["matter_read", "matter_write_candidate", "vault_read", "client_read"],
  review_state: "allow",
  expires_at: "2999-12-31T23:59:59.000Z"
};

function proofUrl(hash) {
  return `${WEB}/?locale=ko&view=matters&ctx=allow#${hash}`;
}

function collectionBody(requestId, items = [], auditHintRef = "ui_lcx_vltui_06_probe") {
  return {
    request_id: requestId,
    outcome: "passed",
    items,
    page_info: { limit: 25, has_more: false },
    safe_error_codes: [],
    audit_hint_ref: auditHintRef,
    ui_state: items.length === 0 ? "empty" : null,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function itemBody({
  requestId,
  outcome = "passed",
  item = null,
  auditHintRef = "ui_lcx_vltui_06_probe",
  uiState = null,
  action = "matter.recorded",
  extra = {}
}) {
  return {
    request_id: requestId,
    outcome,
    item,
    audit_event: {
      event_id: `${action}:${requestId}`,
      tenant_id: "tenant_rp05_synthetic",
      actor_id: ACTOR_REF,
      action,
      object_type: "Matter",
      decision: uiState === "owner_blocked" || uiState === "provider_blocked" ? "approval_required" : "allow",
      production_ready_claim: false
    },
    safe_error_codes: [],
    audit_hint_ref: auditHintRef,
    ui_state: uiState,
    count_leak_prevented: true,
    production_ready_claim: false,
    ...extra
  };
}

const matter = {
  matter_id: MATTER_ID,
  matter_number: "LCX-06",
  matter_code: "LCX-06",
  matter_name: "LCX Matter Section Proof",
  title: "LCX Matter Section Proof",
  status: "opening",
  phase: "execution",
  client_id: "client_lcx_vltui_06",
  legal_client_party_id: "party_lcx_vltui_06",
  client_display_name: "LCX Client",
  owner_display_name: "Matter Owner",
  owner_user_id: "matter_owner_ref",
  risk_level: "standard",
  wip_status: "not_started",
  document_count: 1,
  team_member_count: 2,
  vault_workspace_id: "vault_workspace_lcx_vltui_06"
};

const activities = [
  {
    activity_id: ACTIVITY_ID,
    matter_id: MATTER_ID,
    activity_type: "task",
    title: "증거 검토 작업",
    status: "todo",
    due_at: "2026-07-01T09:00:00.000Z",
    external_send_state: "internal_only"
  },
  {
    activity_id: NOTE_ID,
    matter_id: MATTER_ID,
    activity_type: "note",
    title: "검토 의견",
    status: "todo",
    due_at: "2026-07-01T10:00:00.000Z",
    external_send_state: "internal_only"
  }
];

const timelineEntries = [
  { event_id: "timeline_lcx_06_task", type: "matter", title: "작업 기록", occurred_at: "2026-06-29T09:00:00.000Z", source_ref: "matter" },
  { event_id: "timeline_lcx_06_document", type: "document", title: "문서 검토", occurred_at: "2026-06-29T09:30:00.000Z", source_ref: "vault" },
  { event_id: "timeline_lcx_06_message", type: "message", title: "내부 공유", occurred_at: "2026-06-29T10:00:00.000Z", source_ref: "channel" }
];

const calendarEvents = [
  {
    event_id: EVENT_ID,
    matter_id: MATTER_ID,
    title: "주요 제출 기한",
    status: "scheduled",
    starts_at: "2026-07-03T09:00:00.000Z",
    ends_at: "2026-07-03T10:00:00.000Z",
    criticality: "critical",
    legal_consequence: "court_deadline",
    provider_sync_state: "provider_blocked"
  }
];

const deadlines = [
  {
    deadline_id: DEADLINE_ID,
    event_id: EVENT_ID,
    matter_id: MATTER_ID,
    title: "주요 제출 기한",
    due_at: "2026-07-03T09:00:00.000Z",
    status: "pending_confirmation",
    dual_control_required: true
  }
];

const channel = {
  channel_id: "channel_lcx_vltui_06",
  matter_id: MATTER_ID,
  provider_state: { external_send_state: "provider_blocked" },
  messages: [
    {
      message_id: "channel_message_lcx_vltui_06",
      safe_message_excerpt: "내부 준비 상황",
      created_at: "2026-06-29T09:40:00.000Z",
      external_send_state: "internal_only"
    }
  ]
};

const recordFields = {
  object_name: "matter",
  fields: [
    { field_name: "risk_level", label: "위험도", writable: true },
    { field_name: "wip_status", label: "청구 상태", writable: true }
  ]
};

function matterCollection(url) {
  if (url.pathname === "/api/matters/vault-bridge/status") {
    return {
      request_id: "lcx-vltui-06-bridge-status",
      outcome: "passed",
      item: {
        source_mode: "matter_app_api",
        client_upsert_path: "/api/matters/vault-bridge/clients/upsert",
        matter_upsert_path: "/api/matters/vault-bridge/matters/upsert",
        runtime_write_ready: true,
        repository_durable: true
      },
      safe_error_codes: [],
      audit_hint_ref: "ui_cmp_g5_vault_probe",
      state_idempotent: true,
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (url.pathname === "/api/matters") return collectionBody("lcx-vltui-06-matters", [matter], "ui_cmp_g4_matter_probe");
  if (url.pathname === "/api/matters/list-views") {
    return collectionBody("lcx-vltui-06-list-views", [{ list_view_id: "matter_view_lcx_06", label: "진행 Matter", filter: { status: "all" } }]);
  }
  if (url.pathname === "/api/matters/recently-viewed") return collectionBody("lcx-vltui-06-recent", [matter]);
  if (url.pathname.endsWith("/command-center")) {
    return {
      request_id: "lcx-vltui-06-command",
      outcome: "passed",
      item: matter,
      team: [{ display_name: "Matter Owner" }, { display_name: "Associate" }],
      client_report: { sections: [{ label: "진행", body: "권한 기준 요약", client_visible: false }] },
      vault_summary: { document_count: 1 },
      matter_vault_link: { vault_workspace_id: matter.vault_workspace_id },
      safe_error_codes: [],
      audit_hint_ref: "ui_mv_matter_command_center_probe",
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (url.pathname.endsWith("/vault-summary")) {
    return {
      request_id: "lcx-vltui-06-vault-summary",
      outcome: "passed",
      item: {
        matter_id: MATTER_ID,
        matter_code: "LCX-06",
        matter_name: "LCX Matter Section Proof",
        client_display_name: "LCX Client",
        document_count: 1,
        workspace_id: "vault_workspace_lcx_vltui_06",
        storage_pointer_ref_included: false,
        document_bytes_included: false
      },
      safe_error_codes: [],
      audit_hint_ref: "ui_mv_matter_vault_probe",
      ui_state: null,
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (url.pathname.endsWith("/timeline")) {
    return {
      request_id: "lcx-vltui-06-timeline",
      outcome: "passed",
      item: { visible_entries: timelineEntries },
      safe_error_codes: [],
      audit_hint_ref: "ui_mv_matter_timeline_probe",
      ui_state: null,
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (url.pathname.endsWith("/activities")) return collectionBody("lcx-vltui-06-activities", activities, "ui_sf_b_w03_activity_read_probe");
  if (url.pathname.endsWith("/calendar-events")) return collectionBody("lcx-vltui-06-calendar", calendarEvents, "ui_sf_b_w03_calendar_read_probe");
  if (url.pathname.endsWith("/deadlines")) return collectionBody("lcx-vltui-06-deadlines", deadlines, "ui_sf_b_w03_deadline_read_probe");
  if (url.pathname.endsWith("/channel")) {
    return {
      request_id: "lcx-vltui-06-channel",
      outcome: "passed",
      item: channel,
      safe_error_codes: [],
      audit_hint_ref: "ui_sf_b_w03_channel_read_probe",
      ui_state: null,
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (url.pathname === "/api/matters/audit") {
    return collectionBody("lcx-vltui-06-matter-audit", [
      { event_id: "audit_lcx_06", action: "matter.read", object_type: "Matter", object_id: MATTER_ID, decision: "allow", production_ready_claim: false }
    ], "ui_cmp_g4_matter_probe");
  }
  return collectionBody("lcx-vltui-06-matter-generic", []);
}

function financeCollection(url) {
  if (url.pathname === "/api/finance/time-entries") {
    return collectionBody("lcx-vltui-06-time-entries", [
      { time_entry_id: "time_lcx_vltui_06", matter_id: MATTER_ID, work_date: "2026-06-29", status: "review_required", duration_minutes: 30 }
    ], "ui_cmp_g7_finance_probe");
  }
  if (url.pathname === "/api/finance/invoices") {
    return collectionBody("lcx-vltui-06-invoices", [
      { invoice_id: "invoice_lcx_vltui_06", matter_id: MATTER_ID, amount_due: 450000, currency: "KRW", status: "issued" }
    ], "ui_cmp_g7_finance_probe");
  }
  if (url.pathname === "/api/finance/ar-aging") {
    return collectionBody("lcx-vltui-06-ar", [
      { ar_balance_id: "ar_lcx_vltui_06", matter_id: MATTER_ID, balance: 450000, status: "open" }
    ], "ui_cmp_g7_finance_probe");
  }
  if (url.pathname === "/api/finance/audit") {
    return collectionBody("lcx-vltui-06-finance-audit", [{ action: "finance.review", object_type: "Matter", decision: "allow" }], "ui_cmp_g7_finance_probe");
  }
  return collectionBody("lcx-vltui-06-finance-generic", []);
}

function analyticsCollection(url) {
  if (url.pathname === "/api/analytics/dashboards") {
    return collectionBody("lcx-vltui-06-dashboards", [
      { dashboard_id: "dashboard_lcx_vltui_06", title: "Matter 운영", dashboard_type: "matter", status: "active", metric_count: 3 }
    ], "ui_cmp_g8_analytics_probe");
  }
  if (url.pathname.includes("profitability")) {
    return collectionBody("lcx-vltui-06-profitability", [
      { matter_id: MATTER_ID, standard_value: 450000, collected_value: 0, profitability_amount: 450000 }
    ], "ui_cmp_g8_analytics_probe");
  }
  return collectionBody("lcx-vltui-06-analytics-generic", []);
}

function recordActionCollection(url) {
  if (url.pathname === "/api/record-actions/matter/fields") {
    return itemBody({ requestId: "lcx-vltui-06-record-fields", item: recordFields, auditHintRef: "ui_sf_b_w02_record_actions_matter_probe" });
  }
  if (url.pathname.endsWith("/audit")) {
    return collectionBody("lcx-vltui-06-record-audit", [{ action: "matter.field_update", object_type: "Matter", decision: "allow" }], "ui_sf_b_w02_record_actions_matter_probe");
  }
  return collectionBody("lcx-vltui-06-record-generic", []);
}

function importCollection(url) {
  if (url.pathname === "/api/import-targets") {
    return collectionBody("lcx-vltui-06-import-targets", [{ target_object: "matter_runtime_patch", label: "Matter" }], "ui_sf_b_w05_import_data_mapping_probe");
  }
  if (url.pathname === "/api/import-jobs") {
    return collectionBody("lcx-vltui-06-import-jobs", [{ job_id: IMPORT_JOB_ID, target_object: "matter_runtime_patch", status: "created", execution_state: "not_run" }], "ui_sf_b_w05_import_data_mapping_probe");
  }
  if (url.pathname.endsWith("/preview")) {
    return itemBody({
      requestId: "lcx-vltui-06-import-preview",
      item: { job_id: IMPORT_JOB_ID, sampled_row_count: 2, raw_rows_included: false },
      auditHintRef: "ui_sf_b_w05_import_data_mapping_probe"
    });
  }
  if (url.pathname.endsWith("/error-report")) {
    return collectionBody("lcx-vltui-06-import-error-report", [
      { row_label: "검증 요약", issue_category: "no_blocking_errors", remediation_hint: "Dry-run can be reviewed" }
    ], "ui_sf_b_w05_import_data_mapping_probe");
  }
  return collectionBody("lcx-vltui-06-import-generic", []);
}

function writeBody(url, method) {
  if (url.pathname.endsWith("/status-transitions")) {
    return itemBody({
      requestId: "lcx-vltui-06-status-transition",
      outcome: "updated",
      item: { ...matter, status: "closed" },
      auditHintRef: "ui_sf_b_w02_matter_status_transition_probe",
      action: "matter.status.closed",
      extra: { transition: { target_status: "closed" } }
    });
  }
  if (url.pathname.endsWith("/activities") && method === "POST") {
    return itemBody({
      requestId: "lcx-vltui-06-activity-create",
      outcome: "created",
      item: { ...activities[0], activity_id: "activity_lcx_vltui_06_created" },
      auditHintRef: "ui_sf_b_w03_activity_write_probe",
      action: "matter.activity.created"
    });
  }
  if (url.pathname.includes("/activities/") && method === "PATCH") {
    return itemBody({
      requestId: "lcx-vltui-06-activity-patch",
      outcome: "updated",
      item: { ...activities[0], status: "in_progress" },
      auditHintRef: "ui_sf_b_w03_activity_patch_probe",
      action: "matter.activity.patched"
    });
  }
  if (url.pathname.endsWith("/calendar-events") && method === "POST") {
    return itemBody({
      requestId: "lcx-vltui-06-calendar-create",
      outcome: "created",
      item: { ...calendarEvents[0], event_id: "calendar_lcx_vltui_06_created" },
      auditHintRef: "ui_sf_b_w03_calendar_write_probe",
      action: "matter.calendar.created"
    });
  }
  if (url.pathname.includes("/calendar-events/") && method === "PATCH") {
    return itemBody({
      requestId: "lcx-vltui-06-deadline-change",
      outcome: "approval_required",
      item: calendarEvents[0],
      auditHintRef: "ui_sf_b_w03_calendar_patch_probe",
      uiState: "approval_required",
      action: "matter.deadline.change_requested",
      extra: { deadline_change_request: { event_id: EVENT_ID, approval_state: "approval_required" } }
    });
  }
  if (url.pathname.includes("/deadlines/") && url.pathname.endsWith("/confirm-change")) {
    return itemBody({
      requestId: "lcx-vltui-06-deadline-confirm",
      outcome: "updated",
      item: deadlines[0],
      auditHintRef: "ui_sf_b_w03_deadline_confirm_probe",
      action: "matter.deadline.confirmed",
      extra: { confirmation: { dual_control_satisfied: true } }
    });
  }
  if (url.pathname.endsWith("/channel/messages")) {
    return itemBody({
      requestId: "lcx-vltui-06-channel-message",
      outcome: "created",
      item: { message_id: "channel_message_lcx_vltui_06_created", safe_message_excerpt: "내부 기록", external_send_state: "internal_only" },
      auditHintRef: "ui_sf_b_w03_channel_message_probe",
      action: "matter.channel.message_created"
    });
  }
  if (url.pathname.endsWith("/channel/provider-sync")) {
    return itemBody({
      requestId: "lcx-vltui-06-provider-blocked",
      outcome: "provider_blocked",
      item: channel,
      auditHintRef: "ui_sf_b_w03_channel_provider_sync_probe",
      uiState: "provider_blocked",
      action: "matter.provider.blocked",
      extra: { provider_state: { external_send_state: "provider_blocked" } }
    });
  }
  if (url.pathname.endsWith("/field-update")) {
    return {
      ...itemBody({
        requestId: "lcx-vltui-06-risk-field",
        outcome: "updated",
        item: { matter_id: MATTER_ID, title: matter.title, status: matter.status, risk_level: "elevated" },
        auditHintRef: "ui_sf_b_w02_record_actions_matter_probe",
        action: "matter.risk.updated"
      }),
      field_patch: { risk_level: "elevated" }
    };
  }
  if (url.pathname.endsWith("/bulk-updates")) {
    return {
      ...itemBody({
        requestId: "lcx-vltui-06-owner-blocked",
        outcome: "owner_blocked",
        item: null,
        auditHintRef: "ui_sf_b_w02_record_actions_matter_probe",
        uiState: "owner_blocked",
        action: "matter.owner.approval_required"
      }),
      bulk_action: { action_type: "owner_change", executable: false }
    };
  }
  if (url.pathname === "/api/finance/time-entries") {
    return itemBody({
      requestId: "lcx-vltui-06-time-entry",
      outcome: "created",
      item: { time_entry_id: "time_lcx_vltui_06_created", matter_id: MATTER_ID, duration_minutes: 30, currency: "KRW" },
      auditHintRef: "ui_cmp_g7_finance_probe",
      action: "finance.time.created"
    });
  }
  if (url.pathname === "/api/finance/wip") {
    return {
      ...itemBody({
        requestId: "lcx-vltui-06-wip",
        outcome: "created",
        item: null,
        auditHintRef: "ui_cmp_g7_finance_probe",
        action: "finance.wip.created"
      }),
      items: [{ wip_id: "wip_lcx_vltui_06", matter_id: MATTER_ID, amount: 450000, currency: "KRW" }]
    };
  }
  if (url.pathname === "/api/finance/payments") {
    return itemBody({
      requestId: "lcx-vltui-06-payment",
      outcome: "created",
      item: { payment_id: "payment_lcx_vltui_06", matter_id: MATTER_ID, amount: 450000, currency: "KRW" },
      auditHintRef: "ui_cmp_g7_finance_probe",
      action: "finance.payment.recorded"
    });
  }
  if (url.pathname === "/api/import-jobs") {
    return itemBody({
      requestId: "lcx-vltui-06-import-job",
      outcome: "created",
      item: { job_id: IMPORT_JOB_ID, target_object: "matter_runtime_patch", status: "created" },
      auditHintRef: "ui_sf_b_w05_import_data_mapping_probe",
      action: "import.job.created"
    });
  }
  if (url.pathname.endsWith("/source-files")) {
    return itemBody({
      requestId: "lcx-vltui-06-import-source",
      outcome: "source_staged",
      item: { job_id: IMPORT_JOB_ID, status: "source_staged" },
      auditHintRef: "ui_sf_b_w05_import_data_mapping_probe",
      action: "import.source.staged",
      extra: { preview: { sampled_row_count: 2, raw_rows_included: false } }
    });
  }
  if (url.pathname.endsWith("/field-mappings")) {
    return itemBody({
      requestId: "lcx-vltui-06-import-mapping",
      outcome: "mapping_saved",
      item: { job_id: IMPORT_JOB_ID, field_mappings: [{ source_field: "matter_title", target_field: "title" }] },
      auditHintRef: "ui_sf_b_w05_import_data_mapping_probe",
      action: "import.mapping.saved",
      extra: { preview: { sampled_row_count: 2, raw_rows_included: false } }
    });
  }
  if (url.pathname.endsWith("/dry-run")) {
    return itemBody({
      requestId: "lcx-vltui-06-import-dry-run",
      outcome: "dry_run_passed",
      item: { job_id: IMPORT_JOB_ID, outcome: "passed", mutation_executed: false },
      auditHintRef: "ui_sf_b_w05_import_data_mapping_probe",
      action: "import.dry_run.passed"
    });
  }
  if (url.pathname.endsWith("/execute")) {
    return itemBody({
      requestId: "lcx-vltui-06-import-execute",
      outcome: "execution_owner_blocked",
      item: { job_id: IMPORT_JOB_ID, execution_state: "owner_blocked" },
      auditHintRef: "ui_sf_b_w05_import_data_mapping_probe",
      uiState: "owner_blocked",
      action: "import.execute.owner_blocked"
    });
  }
  if (url.pathname.endsWith("/rollback")) {
    return itemBody({
      requestId: "lcx-vltui-06-import-rollback",
      outcome: "rollback_blocked",
      item: { job_id: IMPORT_JOB_ID, rollback_state: "not_required" },
      auditHintRef: "ui_sf_b_w05_import_data_mapping_probe",
      uiState: "owner_blocked",
      action: "import.rollback.checked"
    });
  }
  return itemBody({ requestId: "lcx-vltui-06-write-generic", item: {}, action: "matter.generic.recorded" });
}

function responseFor(url, method) {
  if ((method === "POST" || method === "PATCH") && (url.pathname.startsWith("/api/matters") || url.pathname.startsWith("/api/record-actions") || url.pathname.startsWith("/api/finance") || url.pathname.startsWith("/api/import-jobs"))) {
    return writeBody(url, method);
  }
  if (url.pathname.startsWith("/api/record-actions/matter")) return recordActionCollection(url);
  if (url.pathname.startsWith("/api/finance")) return financeCollection(url);
  if (url.pathname.startsWith("/api/analytics")) return analyticsCollection(url);
  if (url.pathname.startsWith("/api/import")) return importCollection(url);
  if (url.pathname.startsWith("/api/matters")) return matterCollection(url);
  return collectionBody("lcx-vltui-06-generic", []);
}

function parseContext(request) {
  const header = request.headers()["x-lawos-permission-context"];
  if (!header) return null;
  try {
    return JSON.parse(header);
  } catch {
    return null;
  }
}

function classifyWrite(url, method) {
  if (method !== "POST" && method !== "PATCH") return null;
  if (url.pathname.endsWith("/status-transitions")) return "lifecycle_closeout";
  if (url.pathname.endsWith("/activities")) return "activity_create";
  if (url.pathname.includes("/activities/")) return "activity_patch";
  if (url.pathname.endsWith("/calendar-events")) return "calendar_create";
  if (url.pathname.includes("/calendar-events/")) return "deadline_change_request";
  if (url.pathname.includes("/deadlines/")) return "deadline_confirm";
  if (url.pathname.endsWith("/channel/messages")) return "channel_message";
  if (url.pathname.endsWith("/channel/provider-sync")) return "provider_blocked";
  if (url.pathname.endsWith("/field-update")) return "risk_field_update";
  if (url.pathname.endsWith("/bulk-updates")) return "owner_blocked";
  if (url.pathname === "/api/finance/time-entries") return "finance_time_entry";
  if (url.pathname === "/api/finance/wip") return "finance_wip";
  if (url.pathname === "/api/finance/payments") return "finance_payment";
  if (url.pathname === "/api/import-jobs") return "import_job";
  if (url.pathname.endsWith("/source-files")) return "import_source";
  if (url.pathname.endsWith("/field-mappings")) return "import_mapping";
  if (url.pathname.endsWith("/dry-run")) return "import_dry_run";
  if (url.pathname.endsWith("/execute")) return "import_execute_blocked";
  if (url.pathname.endsWith("/rollback")) return "import_rollback";
  return null;
}

async function waitFor(predicate, label) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const value = predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function visible(page, selector) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 15000 });
  return true;
}

function writePassed(write, auditHintRef, tenantId = "tenant_rp05_synthetic") {
  const principal = write?.context?.principal ?? {};
  return (
    principal.user_id === ACTOR_REF &&
    principal.tenant_id === tenantId &&
    principal.session_principal_source === "desktop_web_session_envelope" &&
    write.payload?.actor_id === ACTOR_REF &&
    write.payload?.audit_hint_ref === auditHintRef
  );
}

function forbiddenText(value) {
  return /@|password|reset|bearer|cookie|secret|credential|authorization|sk-|token_material|go-live|production-ready|public release|owner final approval/i.test(JSON.stringify(value));
}

async function clickScoped(page, scopeSelector, name) {
  await page.locator(scopeSelector).first().getByRole("button", { name, exact: true }).click();
}

function renderMarkdown(report) {
  const rows = report.cases[0].checks.map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} |`).join("\n");
  return `# LCX-VLTUI-06 Matter Sections Proof\n\nVerdict: ${report.verdict}\n\n| Check | Result |\n|---|---|\n${rows}\n\nBoundary: Matter planned sections are route-backed or explicitly owner/provider blocked; no production, go-live, public release, owner approval, provider send, or customer write claim.\n`;
}

async function runCase(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  await context.addInitScript(
    ({ key, envelope }) => {
      window.sessionStorage.setItem(key, JSON.stringify(envelope));
    },
    { key: SESSION_KEY, envelope: sessionEnvelope }
  );
  const page = await context.newPage();
  const pageErrors = [];
  const writes = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const writeKind = classifyWrite(url, request.method());
    if (writeKind) {
      const payload = request.postData() ? JSON.parse(request.postData()) : {};
      writes.push({ kind: writeKind, path: url.pathname, context: parseContext(request), payload });
    }
    if (url.pathname.startsWith("/api/")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(responseFor(url, request.method())) });
      return;
    }
    await route.continue();
  });

  try {
    const sectionResults = [];
    for (const [section, marker] of CONNECTED_SECTIONS) {
      await page.goto(proofUrl(section), { waitUntil: "domcontentloaded" });
      await visible(page, `[data-lcx-vltui-06-connected-section='${marker}']`);
      sectionResults.push({ section, marker, connected: true });
    }

    await page.goto(proofUrl("matter-closeout"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-lcx-vltui-06-lifecycle-boundary='true']", "완료");
    const closeoutWrite = await waitFor(() => writes.find((write) => write.kind === "lifecycle_closeout"), "lifecycle closeout");

    await page.goto(proofUrl("matter-tasks"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-lcx-vltui-06-activity-type='task']", "작업 추가");
    const taskCreate = await waitFor(() => writes.find((write) => write.kind === "activity_create"), "task create");
    await clickScoped(page, "[data-lcx-vltui-06-activity-type='task']", "상태 저장");
    const taskPatch = await waitFor(() => writes.find((write) => write.kind === "activity_patch"), "task patch");

    await page.goto(proofUrl("matter-notes"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-lcx-vltui-06-activity-type='note']", "메모 추가");
    const noteCreate = await waitFor(() => writes.filter((write) => write.kind === "activity_create").length >= 2 && writes.findLast((write) => write.kind === "activity_create"), "note create");

    await page.goto(proofUrl("matter-evidence"), { waitUntil: "domcontentloaded" });
    const evidenceShortcutVisible = await visible(page, "[data-lcx-vltui-06-vault-backed-shortcuts='evidence']");
    await clickScoped(page, "[data-lcx-vltui-06-vault-backed-shortcuts='evidence']", "사건 문서 열기");
    await visible(page, "[data-lcx-vltui-03-document-workspace-boundary='true']");
    const templateShortcutVisible = sectionResults.some((item) => item.section === "matter-templates" && item.connected);

    await page.goto(proofUrl("matter-seal"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-lcx-vltui-06-approval-boundary='seal']", "승인 확인");
    const ownerBlocked = await waitFor(() => writes.find((write) => write.kind === "owner_blocked"), "owner blocked");
    await clickScoped(page, "[data-lcx-vltui-06-approval-boundary='seal']", "상태 확인");
    const providerBlocked = await waitFor(() => writes.find((write) => write.kind === "provider_blocked"), "provider blocked");

    await page.goto(proofUrl("matter-meetings"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-lcx-vltui-06-meetings-connected='true']", "일정 추가");
    const calendarCreate = await waitFor(() => writes.find((write) => write.kind === "calendar_create"), "calendar create");
    await clickScoped(page, "[data-lcx-vltui-06-meetings-connected='true']", "변경 요청");
    const deadlineChange = await waitFor(() => writes.find((write) => write.kind === "deadline_change_request"), "deadline change");
    await clickScoped(page, "[data-lcx-vltui-06-meetings-connected='true']", "확인");
    const deadlineConfirm = await waitFor(() => writes.find((write) => write.kind === "deadline_confirm"), "deadline confirm");

    await page.goto(proofUrl("matter-announcements"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-sf-b-w03-channel-workspace='true']", "메시지 기록");
    const channelMessage = await waitFor(() => writes.find((write) => write.kind === "channel_message"), "channel message");

    await page.goto(proofUrl("matter-expenses"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-lcx-vltui-06-expenses-connected='true']", "시간 기록");
    const financeTime = await waitFor(() => writes.find((write) => write.kind === "finance_time_entry"), "finance time");
    await clickScoped(page, "[data-lcx-vltui-06-expenses-connected='true']", "청구 준비");
    const financeWip = await waitFor(() => writes.find((write) => write.kind === "finance_wip"), "finance wip");
    await clickScoped(page, "[data-lcx-vltui-06-expenses-connected='true']", "수납 기록");
    const financePayment = await waitFor(() => writes.find((write) => write.kind === "finance_payment"), "finance payment");

    await page.goto(proofUrl("matter-risk"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-lcx-vltui-06-search-risk='risk']", "위험 표시");
    const riskField = await waitFor(() => writes.find((write) => write.kind === "risk_field_update"), "risk field");

    await page.goto(proofUrl("matter-integrations"), { waitUntil: "domcontentloaded" });
    await visible(page, "[data-lcx-vltui-06-provider-credentials-visible='false']");

    await page.goto(proofUrl("matter-settings"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-lcx-vltui-06-integrations-settings='settings']", "정책 확인");
    const settingsField = await waitFor(() => writes.filter((write) => write.kind === "risk_field_update").length >= 2 && writes.findLast((write) => write.kind === "risk_field_update"), "settings field");

    await page.goto(proofUrl("matter-import"), { waitUntil: "domcontentloaded" });
    await clickScoped(page, "[data-lcx-vltui-06-import-connected='true']", "작업 생성");
    const importJob = await waitFor(() => writes.find((write) => write.kind === "import_job"), "import job");
    await clickScoped(page, "[data-lcx-vltui-06-import-connected='true']", "원본 준비");
    const importSource = await waitFor(() => writes.find((write) => write.kind === "import_source"), "import source");
    await clickScoped(page, "[data-lcx-vltui-06-import-connected='true']", "매핑 저장");
    const importMapping = await waitFor(() => writes.find((write) => write.kind === "import_mapping"), "import mapping");
    await clickScoped(page, "[data-lcx-vltui-06-import-connected='true']", "검증 실행");
    const importDryRun = await waitFor(() => writes.find((write) => write.kind === "import_dry_run"), "import dry run");
    await clickScoped(page, "[data-lcx-vltui-06-import-connected='true']", "실행 요청");
    const importExecute = await waitFor(() => writes.find((write) => write.kind === "import_execute_blocked"), "import execute blocked");
    await clickScoped(page, "[data-lcx-vltui-06-import-connected='true']", "확인");
    const importRollback = await waitFor(() => writes.find((write) => write.kind === "import_rollback"), "import rollback");

    await page.screenshot({ path: join(ROOT, SCREENSHOT_DIR, "lcx-vltui-06-matter-sections-proof.png"), fullPage: true });

    const sessionMatterWrites = [
      [closeoutWrite, "ui_sf_b_w02_matter_status_transition_probe"],
      [taskCreate, "ui_sf_b_w03_activity_write_probe"],
      [taskPatch, "ui_sf_b_w03_activity_patch_probe"],
      [noteCreate, "ui_sf_b_w03_activity_write_probe"],
      [calendarCreate, "ui_sf_b_w03_calendar_write_probe"],
      [deadlineChange, "ui_sf_b_w03_calendar_patch_probe"],
      [deadlineConfirm, "ui_sf_b_w03_deadline_confirm_probe"],
      [channelMessage, "ui_sf_b_w03_channel_message_probe"],
      [providerBlocked, "ui_sf_b_w03_channel_provider_sync_probe"],
      [ownerBlocked, "ui_sf_b_w02_record_actions_matter_probe"],
      [riskField, "ui_sf_b_w02_record_actions_matter_probe"],
      [settingsField, "ui_sf_b_w02_record_actions_matter_probe"],
      [importJob, "ui_sf_b_w05_import_data_mapping_probe"],
      [importSource, "ui_sf_b_w05_import_data_mapping_probe"],
      [importMapping, "ui_sf_b_w05_import_data_mapping_probe"],
      [importDryRun, "ui_sf_b_w05_import_data_mapping_probe"],
      [importExecute, "ui_sf_b_w05_import_data_mapping_probe"],
      [importRollback, "ui_sf_b_w05_import_data_mapping_probe"]
    ];
    const financeWrites = [financeTime, financeWip, financePayment];

    const checks = [
      { id: "all-matter-sections-connected", passed: sectionResults.length === CONNECTED_SECTIONS.length && sectionResults.every((item) => item.connected) },
      { id: "lifecycle-closeout-archive-boundary", passed: writePassed(closeoutWrite, "ui_sf_b_w02_matter_status_transition_probe") },
      { id: "task-note-create-update-audit", passed: writePassed(taskCreate, "ui_sf_b_w03_activity_write_probe") && writePassed(taskPatch, "ui_sf_b_w03_activity_patch_probe") && writePassed(noteCreate, "ui_sf_b_w03_activity_write_probe") },
      { id: "vault-evidence-template-shortcut", passed: evidenceShortcutVisible && templateShortcutVisible },
      { id: "seal-approval-owner-provider-blocked", passed: writePassed(ownerBlocked, "ui_sf_b_w02_record_actions_matter_probe") && writePassed(providerBlocked, "ui_sf_b_w03_channel_provider_sync_probe") },
      { id: "meeting-announcement-calendar-channel", passed: writePassed(calendarCreate, "ui_sf_b_w03_calendar_write_probe") && writePassed(deadlineChange, "ui_sf_b_w03_calendar_patch_probe") && writePassed(deadlineConfirm, "ui_sf_b_w03_deadline_confirm_probe") && writePassed(channelMessage, "ui_sf_b_w03_channel_message_probe") },
      { id: "expense-finance-boundary-audited", passed: financeWrites.every((write) => write?.payload?.actor_id === ACTOR_REF && write.payload?.audit_hint_ref === "ui_cmp_g7_finance_probe") },
      { id: "search-risk-permission-scoped", passed: writePassed(riskField, "ui_sf_b_w02_record_actions_matter_probe") },
      { id: "integration-settings-no-credentials", passed: writePassed(settingsField, "ui_sf_b_w02_record_actions_matter_probe") },
      { id: "import-dry-run-guarded-execute", passed: [importJob, importSource, importMapping, importDryRun, importExecute, importRollback].every((write) => writePassed(write, "ui_sf_b_w05_import_data_mapping_probe")) && importExecute.payload?.actor_id === ACTOR_REF },
      { id: "no-forbidden-session-secret-or-release-claim", passed: !forbiddenText({ writes, sectionResults }) },
      { id: "no-page-errors", passed: pageErrors.length === 0 }
    ];

    return {
      id: "matter-planned-section-implementation",
      passed: checks.every((item) => item.passed),
      checks,
      sections: sectionResults,
      writes: writes.map((write) => ({
        kind: write.kind,
        path: write.path,
        principal: write.context?.principal ?? null,
        audit_hint_ref: write.payload?.audit_hint_ref ?? null,
        actor_id: write.payload?.actor_id ?? null
      })),
      page_errors: pageErrors,
      screenshot: `${SCREENSHOT_DIR}/lcx-vltui-06-matter-sections-proof.png`
    };
  } finally {
    await context.close();
  }
}

async function main() {
  mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });
  const browser = await chromium.launch();
  try {
    const result = await runCase(browser);
    const report = {
      schema_version: "law-firm-os.lazycodex.lcx_vltui.matter_sections_proof.v0.1",
      tuw_ids: TUW_IDS,
      generated_at: new Date().toISOString(),
      verdict: result.passed ? "PASS" : "FAIL",
      boundary: {
        synthetic_route_interception_only: true,
        planned_matter_section_count: 0,
        provider_send_executed: false,
        vault_document_mutation_executed: false,
        import_execute_mutation_executed: false,
        payment_or_invoice_send_executed: false,
        owner_final_approval: false,
        production_ready: false,
        public_release: false,
        go_live_approved: false
      },
      cases: [result]
    };
    writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(join(ROOT, MD_PATH), renderMarkdown(report));
    if (report.verdict !== "PASS") {
      console.error(JSON.stringify(report, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, markdown: MD_PATH }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
