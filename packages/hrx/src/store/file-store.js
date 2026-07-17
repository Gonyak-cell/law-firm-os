import { createHash } from "node:crypto";
import { createDurableJsonStateController, isDurableStoreConflict } from "../../../persistence/src/durable-file.js";
import { HRX_DURABLE_CORE_TABLES, HRX_DURABLE_WORKFLOW_TABLES, HRX_STORE_PORT_VERSION } from "./port.js";

const PRIMARY_KEYS = Object.freeze({
  hrx_employees: ["tenant_id", "employee_id"],
  hrx_employment_profiles: ["tenant_id", "profile_id"],
  hrx_employee_user_links: ["tenant_id", "link_id"],
  hrx_documents: ["tenant_id", "document_id"],
  hrx_compensation_records: ["tenant_id", "compensation_id"],
  hrx_leave_balance_entries: ["tenant_id", "entry_id"],
  hrx_leave_requests: ["tenant_id", "request_id"],
  hrx_attendance_records: ["tenant_id", "attendance_id"],
  hrx_overtime_requests: ["tenant_id", "overtime_id"],
  hrx_job_openings: ["tenant_id", "job_opening_id"],
  hrx_candidates: ["tenant_id", "candidate_id"],
  hrx_candidate_consents: ["tenant_id", "consent_id"],
  hrx_applications: ["tenant_id", "application_id"],
  hrx_interviews: ["tenant_id", "interview_id"],
  hrx_offers: ["tenant_id", "offer_id"],
  hrx_onboarding_plans: ["tenant_id", "onboarding_id"],
  hrx_offboarding_cases: ["tenant_id", "offboarding_id"],
  hrx_audit_events: ["tenant_id", "event_id"],
  hrx_ai_review_items: ["tenant_id", "review_id"],
  hrx_ai_source_chunks: ["tenant_id", "source_ref", "chunk_id"],
  hrx_analytics_snapshots: ["tenant_id", "snapshot_id"],
  hrx_leave_groups: ["tenant_id", "group_id"],
  hrx_leave_types: ["tenant_id", "leave_type_id"],
  hrx_leave_policy_versions: ["tenant_id", "policy_version_id"],
  hrx_leave_policy_assignments: ["tenant_id", "policy_assignment_id"],
  hrx_work_schedule_profiles: ["tenant_id", "schedule_profile_id"],
  hrx_work_schedule_assignments: ["tenant_id", "schedule_assignment_id"],
  hrx_leave_entitlements: ["tenant_id", "entitlement_id"],
  hrx_leave_accrual_rules: ["tenant_id", "accrual_rule_id"],
  hrx_leave_accrual_runs: ["tenant_id", "accrual_run_id"],
  hrx_leave_accrual_batches: ["tenant_id", "accrual_batch_id"],
  hrx_leave_accrual_batch_periods: ["tenant_id", "batch_period_id"],
  hrx_leave_occurrence_upload_batches: ["tenant_id", "upload_batch_id"],
  hrx_leave_occurrence_upload_rows: ["tenant_id", "upload_row_id"],
  hrx_approval_requests: ["tenant_id", "approval_id"],
  hrx_approval_steps: ["tenant_id", "approval_step_id"],
  hrx_approval_assignments: ["tenant_id", "approval_assignment_id"],
  hrx_approval_delegations: ["tenant_id", "delegation_id"],
  hrx_approval_escalations: ["tenant_id", "escalation_id"],
  hrx_leave_request_segments: ["tenant_id", "segment_id"],
  hrx_leave_request_allocations: ["tenant_id", "allocation_id"],
  hrx_leave_reschedule_proposals: ["tenant_id", "proposal_id"],
  hrx_leave_command_receipts: ["tenant_id", "command_receipt_id"],
  hrx_leave_request_attachments: ["tenant_id", "attachment_id"],
  hrx_leave_termination_reconciliations: ["tenant_id", "reconciliation_id"],
  hrx_leave_promotion_campaigns: ["tenant_id", "campaign_id"],
  hrx_leave_promotion_recipients: ["tenant_id", "recipient_id"],
  hrx_leave_promotion_evidence_receipts: ["tenant_id", "receipt_id"],
  hrx_leave_sync_outbox: ["tenant_id", "outbox_event_id"],
  hrx_leave_integration_deliveries: ["tenant_id", "delivery_id"],
  hrx_leave_integration_dead_letters: ["tenant_id", "dead_letter_id"],
  hrx_leave_balance_snapshots: ["tenant_id", "snapshot_id"],
  hrx_leave_job_outbox: ["tenant_id", "job_event_id"],
  hrx_payroll_periods: ["tenant_id", "period_id"],
  hrx_payroll_runs: ["tenant_id", "run_id"],
  hrx_payroll_profiles: ["tenant_id", "payroll_profile_id"],
  hrx_payroll_items: ["tenant_id", "item_id"],
  hrx_payroll_item_assignments: ["tenant_id", "assignment_id"],
  hrx_attendance_approval_receipts: ["tenant_id", "approval_receipt_id"],
  hrx_payroll_input_snapshots: ["tenant_id", "snapshot_id"],
  hrx_payroll_employee_results: ["tenant_id", "result_id"],
  hrx_payroll_line_items: ["tenant_id", "line_item_id"],
  hrx_payroll_rule_versions: ["tenant_id", "rule_version_id"],
  hrx_payroll_statement_templates: ["tenant_id", "template_id"],
  hrx_payroll_statements: ["tenant_id", "statement_id"],
  hrx_payroll_delivery_receipts: ["tenant_id", "delivery_receipt_id"],
  hrx_payroll_payment_batches: ["tenant_id", "payment_batch_id"],
  hrx_payroll_payment_items: ["tenant_id", "payment_item_id"],
  hrx_payroll_filing_jobs: ["tenant_id", "filing_job_id"],
  hrx_payroll_issues: ["tenant_id", "issue_id"],
  hrx_payroll_adjustments: ["tenant_id", "adjustment_id"],
  hrx_payroll_outbox: ["tenant_id", "outbox_event_id"],
  hrx_payroll_year_end_cases: ["tenant_id", "year_end_case_id"],
});

const TABLES = Object.freeze([...HRX_DURABLE_CORE_TABLES, ...HRX_DURABLE_WORKFLOW_TABLES]);
const MUTATING_OPERATIONS = new Set(["insert", "updateOne", "deleteOne"]);
const CAS_TABLES = new Set([
  "hrx_leave_groups",
  "hrx_work_schedule_profiles",
  "hrx_leave_entitlements",
  "hrx_leave_accrual_rules",
  "hrx_leave_accrual_batches",
  "hrx_leave_accrual_batch_periods",
  "hrx_leave_occurrence_upload_batches",
  "hrx_leave_occurrence_upload_rows",
  "hrx_leave_requests",
  "hrx_approval_requests",
  "hrx_payroll_periods",
  "hrx_payroll_runs",
  "hrx_payroll_profiles",
  "hrx_payroll_items",
  "hrx_payroll_rule_versions",
  "hrx_payroll_statement_templates",
  "hrx_payroll_statements",
  "hrx_payroll_delivery_receipts",
  "hrx_payroll_payment_batches",
  "hrx_payroll_payment_items",
  "hrx_payroll_filing_jobs",
  "hrx_payroll_issues",
  "hrx_payroll_year_end_cases",
]);

const APPEND_ONLY_TABLES = new Set([
  "hrx_audit_events",
  "hrx_compensation_records",
  "hrx_leave_balance_entries",
  "hrx_payroll_input_snapshots",
  "hrx_payroll_item_assignments",
  "hrx_attendance_approval_receipts",
  "hrx_payroll_employee_results",
  "hrx_payroll_line_items",
  "hrx_payroll_adjustments",
  "hrx_payroll_outbox",
]);

const UNIQUE_CONSTRAINTS = Object.freeze({
  hrx_leave_groups: [["tenant_id", "code"]],
  hrx_leave_types: [["tenant_id", "code"]],
  hrx_leave_policy_versions: [["tenant_id", "policy_code", "version"]],
  hrx_leave_accrual_rules: [["tenant_id", "rule_code"]],
  hrx_leave_entitlements: [["tenant_id", "idempotency_key"]],
  hrx_leave_accrual_runs: [["tenant_id", "idempotency_key"]],
  hrx_leave_accrual_batches: [
    ["tenant_id", "idempotency_key"],
    ["tenant_id", "preview_batch_id"],
  ],
  hrx_leave_accrual_batch_periods: [
    ["tenant_id", "accrual_batch_id", "period_index"],
    ["tenant_id", "accrual_batch_id", "period_key"],
  ],
  hrx_leave_occurrence_upload_batches: [
    ["tenant_id", "idempotency_key"],
    ["tenant_id", "execute_idempotency_key"],
  ],
  hrx_leave_occurrence_upload_rows: [
    ["tenant_id", "upload_batch_id", "row_number"],
    ["tenant_id", "upload_batch_id", "row_key"],
  ],
  hrx_approval_requests: [["tenant_id", "object_type", "object_id"]],
  hrx_approval_steps: [["tenant_id", "approval_id", "step_order"]],
  hrx_leave_request_segments: [["tenant_id", "request_id", "segment_date"]],
  hrx_leave_request_allocations: [["tenant_id", "request_id", "entitlement_id", "allocation_phase", "allocation_round"]],
  hrx_leave_command_receipts: [["tenant_id", "idempotency_key"]],
  hrx_leave_request_attachments: [["tenant_id", "request_id", "document_id"]],
  hrx_leave_termination_reconciliations: [["tenant_id", "idempotency_key"]],
  hrx_leave_promotion_campaigns: [["tenant_id", "idempotency_key"]],
  hrx_leave_promotion_recipients: [["tenant_id", "campaign_id", "employee_id"]],
  hrx_leave_promotion_evidence_receipts: [["tenant_id", "idempotency_key"]],
  hrx_leave_sync_outbox: [["tenant_id", "idempotency_key"]],
  hrx_leave_integration_deliveries: [
    ["tenant_id", "outbox_event_id", "provider_kind"],
    ["tenant_id", "idempotency_key"],
  ],
  hrx_leave_integration_dead_letters: [
    ["tenant_id", "delivery_id"],
    ["tenant_id", "idempotency_key"],
  ],
  hrx_leave_balance_snapshots: [["tenant_id", "employee_id", "group_id", "as_of"]],
  hrx_leave_job_outbox: [["tenant_id", "idempotency_key"]],
  hrx_leave_balance_entries: [
    ["tenant_id", "idempotency_key"],
    ["tenant_id", "reverses_entry_id"],
  ],
  hrx_payroll_periods: [["tenant_id", "period_code"]],
  hrx_payroll_runs: [["tenant_id", "period_id", "run_type", "previous_run_id"]],
  hrx_payroll_profiles: [["tenant_id", "employee_id", "effective_from"]],
  hrx_payroll_items: [["tenant_id", "code"]],
  hrx_payroll_item_assignments: [["tenant_id", "employee_id", "item_id", "version"]],
  hrx_attendance_approval_receipts: [
    ["tenant_id", "attendance_id"],
    ["tenant_id", "idempotency_key"],
  ],
  hrx_payroll_input_snapshots: [["tenant_id", "run_id", "employee_id"]],
  hrx_payroll_employee_results: [["tenant_id", "run_id", "employee_id"]],
  hrx_payroll_line_items: [["tenant_id", "result_id", "item_code"]],
  hrx_payroll_rule_versions: [["tenant_id", "rule_kind", "version_code"]],
  hrx_payroll_statement_templates: [["tenant_id", "version_code"]],
  hrx_payroll_statements: [["tenant_id", "run_id", "employee_id"]],
  hrx_payroll_delivery_receipts: [["tenant_id", "statement_id", "channel"]],
  hrx_payroll_payment_batches: [["tenant_id", "run_id", "bank_format_code"]],
  hrx_payroll_payment_items: [["tenant_id", "payment_batch_id", "employee_id"]],
  hrx_payroll_filing_jobs: [["tenant_id", "run_id", "filing_kind", "schema_version"]],
  hrx_payroll_issues: [["tenant_id", "run_id", "employee_id", "issue_code"]],
  hrx_payroll_adjustments: [["tenant_id", "run_id", "employee_id", "adjustment_ref"]],
  hrx_payroll_outbox: [["tenant_id", "idempotency_key"]],
  hrx_payroll_year_end_cases: [["tenant_id", "run_id", "employee_id", "tax_year"]],
});

export const HRX_TABLE_PRIMARY_KEYS = PRIMARY_KEYS;
export const HRX_STORE_TABLES = TABLES;
export const HRX_CAS_TABLES = Object.freeze([...CAS_TABLES].sort());
export const HRX_APPEND_ONLY_TABLES = Object.freeze([...APPEND_ONLY_TABLES].sort());
export const HRX_TABLE_UNIQUE_CONSTRAINTS = UNIQUE_CONSTRAINTS;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function emptyState() {
  return {
    schema_version: "law-firm-os.hrx-file-store.v0.1",
    applied_migrations: [],
    tables: Object.fromEntries(TABLES.map((table) => [table, []])),
  };
}

function normalizeState(input) {
  const state = { ...emptyState(), ...(input ?? {}) };
  state.applied_migrations = Array.isArray(state.applied_migrations) ? state.applied_migrations : [];
  state.tables = { ...emptyState().tables, ...(state.tables ?? {}) };
  for (const table of TABLES) {
    if (!Array.isArray(state.tables[table])) state.tables[table] = [];
  }
  return state;
}

function hash(text) {
  return createHash("sha256").update(String(text)).digest("hex");
}

function requireTable(table) {
  if (!TABLES.includes(table)) throw new TypeError(`unknown HRX table: ${table}`);
}

function matchesWhere(row, where = {}) {
  return Object.entries(where).every(([field, value]) => row[field] === value);
}

function samePrimaryKey(table, left, right) {
  return PRIMARY_KEYS[table].every((field) => left[field] === right[field]);
}

function assertPrimaryKey(table, row) {
  for (const field of PRIMARY_KEYS[table]) {
    if (typeof row[field] !== "string" || row[field].trim() === "") {
      throw new TypeError(`${table}.${field} primary key is required`);
    }
  }
}

function isPresent(value) {
  return value !== undefined && value !== null && value !== "";
}

function assertForeignKey(state, table, row, foreignTable, fields, { optional = false } = {}) {
  if (optional && fields.some((field) => !isPresent(row[field]))) return;
  const where = Object.fromEntries(fields.map((field) => [field, row[field]]));
  if (!state.tables[foreignTable].some((candidate) => matchesWhere(candidate, where))) {
    const ref = fields.map((field) => `${field}=${String(row[field])}`).join(", ");
    throw new ReferenceError(`${table} ${foreignTable} reference not found: ${ref}`);
  }
}

function assertUniqueConstraints(state, table, row) {
  for (const fields of UNIQUE_CONSTRAINTS[table] ?? []) {
    if (fields.some((field) => !isPresent(row[field]))) continue;
    const duplicate = state.tables[table].some(
      (candidate) => fields.every((field) => candidate[field] === row[field]) && !samePrimaryKey(table, candidate, row),
    );
    if (duplicate) throw new Error(`${table} unique constraint failed: ${fields.join(", ")}`);
  }
}

function ledgerEffect(row) {
  const minutes = row.amount_minutes;
  if (!Number.isInteger(minutes) || minutes <= 0) return undefined;
  if (["earned", "carryover", "released"].includes(row.entry_type)) return minutes;
  if (["used", "reserved", "expired"].includes(row.entry_type)) return -minutes;
  if (row.entry_type === "adjustment") return row.adjustment_direction === "credit" ? minutes : -minutes;
  return undefined;
}

function assertLedgerConstraints(state, row) {
  if (!isPresent(row.amount_minutes)) return;
  if (!Number.isInteger(row.amount_minutes) || row.amount_minutes <= 0) {
    throw new TypeError("hrx_leave_balance_entries.amount_minutes must be a positive integer");
  }
  if (row.entry_type === "adjustment" && !["credit", "debit"].includes(row.adjustment_direction)) {
    throw new TypeError("leave adjustment_direction must be credit or debit");
  }
  if (row.entry_type !== "adjustment" && isPresent(row.adjustment_direction)) {
    throw new TypeError("adjustment_direction is only valid for adjustment entries");
  }
  if (isPresent(row.reverses_entry_id)) {
    const original = state.tables.hrx_leave_balance_entries.find(
      (entry) => entry.tenant_id === row.tenant_id && entry.entry_id === row.reverses_entry_id,
    );
    if (!original) throw new ReferenceError(`leave ledger reversal source not found: ${row.reverses_entry_id}`);
    for (const field of ["employee_id", "group_id", "source_ref", "amount_minutes"]) {
      if (original[field] !== row[field]) throw new TypeError(`leave ledger reversal ${field} must match source entry`);
    }
    if (ledgerEffect(original) !== -ledgerEffect(row)) {
      throw new TypeError("leave ledger reversal must have the opposite balance effect");
    }
  }
}

function assertLeaveReferences(state, table, row) {
  const refs = {
    hrx_leave_types: [["hrx_leave_groups", ["tenant_id", "group_id"]]],
    hrx_leave_policy_versions: [["hrx_leave_groups", ["tenant_id", "group_id"]]],
    hrx_leave_policy_assignments: [["hrx_leave_policy_versions", ["tenant_id", "policy_version_id"]]],
    hrx_work_schedule_assignments: [["hrx_work_schedule_profiles", ["tenant_id", "schedule_profile_id"]]],
    hrx_leave_entitlements: [
      ["hrx_employees", ["tenant_id", "employee_id"]],
      ["hrx_leave_groups", ["tenant_id", "group_id"]],
      ["hrx_leave_policy_versions", ["tenant_id", "policy_version_id"]],
    ],
    hrx_leave_accrual_rules: [["hrx_leave_policy_versions", ["tenant_id", "policy_version_id"]]],
    hrx_leave_accrual_runs: [["hrx_leave_accrual_rules", ["tenant_id", "accrual_rule_id"]]],
    hrx_leave_accrual_batches: [["hrx_leave_accrual_rules", ["tenant_id", "accrual_rule_id"]]],
    hrx_leave_accrual_batch_periods: [["hrx_leave_accrual_batches", ["tenant_id", "accrual_batch_id"]]],
    hrx_leave_occurrence_upload_rows: [["hrx_leave_occurrence_upload_batches", ["tenant_id", "upload_batch_id"]]],
    hrx_approval_steps: [["hrx_approval_requests", ["tenant_id", "approval_id"]]],
    hrx_approval_assignments: [["hrx_approval_steps", ["tenant_id", "approval_step_id"]]],
    hrx_approval_escalations: [["hrx_approval_steps", ["tenant_id", "approval_step_id"]]],
    hrx_leave_request_segments: [
      ["hrx_leave_requests", ["tenant_id", "request_id"]],
      ["hrx_work_schedule_profiles", ["tenant_id", "schedule_profile_id"]],
    ],
    hrx_leave_request_allocations: [
      ["hrx_leave_requests", ["tenant_id", "request_id"]],
      ["hrx_leave_entitlements", ["tenant_id", "entitlement_id"]],
    ],
    hrx_leave_reschedule_proposals: [["hrx_leave_requests", ["tenant_id", "request_id"]]],
    hrx_leave_request_attachments: [
      ["hrx_leave_requests", ["tenant_id", "request_id"]],
      ["hrx_documents", ["tenant_id", "document_id"]],
    ],
    hrx_leave_promotion_campaigns: [["hrx_leave_policy_versions", ["tenant_id", "policy_version_id"]]],
    hrx_leave_promotion_recipients: [
      ["hrx_leave_promotion_campaigns", ["tenant_id", "campaign_id"]],
      ["hrx_employees", ["tenant_id", "employee_id"]],
    ],
    hrx_leave_promotion_evidence_receipts: [["hrx_leave_promotion_recipients", ["tenant_id", "recipient_id"]]],
    hrx_leave_integration_deliveries: [["hrx_leave_sync_outbox", ["tenant_id", "outbox_event_id"]]],
    hrx_leave_integration_dead_letters: [
      ["hrx_leave_sync_outbox", ["tenant_id", "outbox_event_id"]],
      ["hrx_leave_integration_deliveries", ["tenant_id", "delivery_id"]],
    ],
    hrx_leave_balance_snapshots: [
      ["hrx_employees", ["tenant_id", "employee_id"]],
      ["hrx_leave_groups", ["tenant_id", "group_id"]],
    ],
  };
  for (const [foreignTable, fields] of refs[table] ?? []) {
    assertForeignKey(state, table, row, foreignTable, fields);
  }

  if (["hrx_leave_policy_assignments", "hrx_work_schedule_assignments"].includes(table) && isPresent(row.employee_id)) {
    assertForeignKey(state, table, row, "hrx_employees", ["tenant_id", "employee_id"]);
  }
  if (table === "hrx_leave_termination_reconciliations") {
    assertForeignKey(state, table, row, "hrx_employees", ["tenant_id", "employee_id"]);
  }
  if (table === "hrx_approval_requests") {
    if (row.object_type !== "LeaveRequest") throw new TypeError("durable approval requests currently support LeaveRequest only");
    assertForeignKey(state, table, { ...row, request_id: row.object_id }, "hrx_leave_requests", ["tenant_id", "request_id"]);
    assertForeignKey(
      state,
      table,
      { ...row, employee_id: row.applicant_employee_id },
      "hrx_employees",
      ["tenant_id", "employee_id"],
    );
  }
  if (table === "hrx_approval_delegations") {
    if (row.object_type !== "LeaveRequest") throw new TypeError("durable approval delegations currently support LeaveRequest only");
    if (row.delegator_actor_id === row.delegate_actor_id) throw new TypeError("approval delegation actors must differ");
  }
  if (table === "hrx_leave_balance_entries") {
    if (isPresent(row.group_id)) assertForeignKey(state, table, row, "hrx_leave_groups", ["tenant_id", "group_id"]);
    if (isPresent(row.policy_version_id)) {
      assertForeignKey(state, table, row, "hrx_leave_policy_versions", ["tenant_id", "policy_version_id"]);
    }
    if (isPresent(row.entitlement_id)) {
      assertForeignKey(state, table, row, "hrx_leave_entitlements", ["tenant_id", "entitlement_id"]);
    }
    if (isPresent(row.allocation_id)) {
      assertForeignKey(state, table, row, "hrx_leave_request_allocations", ["tenant_id", "allocation_id"]);
    }
    assertLedgerConstraints(state, row);
  }
}

const SHA256_HEX = /^[a-f0-9]{64}$/;
const TOKENIZED_REF = /^(?:artifact|compensation|document|kms|provider|token|vault):[^\s@]+$/;

function assertIsoDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new TypeError(`${label} must be an ISO date`);
  }
}

function assertSha256(value, label, { optional = false } = {}) {
  if (optional && !isPresent(value)) return;
  if (typeof value !== "string" || !SHA256_HEX.test(value)) throw new TypeError(`${label} must be a SHA-256 hex digest`);
}

function parseJson(value, label, expected = "object") {
  if (typeof value !== "string") throw new TypeError(`${label} must be JSON`);
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new TypeError(`${label} must be valid JSON`);
  }
  if (expected === "array" && !Array.isArray(parsed)) throw new TypeError(`${label} must be a JSON array`);
  if (expected === "object" && (!parsed || Array.isArray(parsed) || typeof parsed !== "object")) {
    throw new TypeError(`${label} must be a JSON object`);
  }
  return parsed;
}

function assertTokenizedRef(value, label, { optional = false } = {}) {
  if (optional && !isPresent(value)) return;
  if (typeof value !== "string" || !TOKENIZED_REF.test(value)) throw new TypeError(`${label} must be a tokenized reference`);
}

function assertNoPrivateJson(value, label) {
  const blockedKey = /^(?:name|display_name|email|phone|address|resident(?:_id)?|bank_account|account_number|password|secret|raw_.+)$/i;
  const visit = (current) => {
    if (Array.isArray(current)) return current.forEach(visit);
    if (!current || typeof current !== "object") return;
    for (const [key, child] of Object.entries(current)) {
      if (blockedKey.test(key)) throw new TypeError(`${label} must not include private field: ${key}`);
      visit(child);
    }
  };
  visit(value);
}

function assertPayrollReferences(state, table, row) {
  const refs = {
    hrx_payroll_runs: [["hrx_payroll_periods", ["tenant_id", "period_id"]]],
    hrx_payroll_profiles: [["hrx_employees", ["tenant_id", "employee_id"]]],
    hrx_payroll_item_assignments: [
      ["hrx_payroll_profiles", ["tenant_id", "payroll_profile_id"]],
      ["hrx_employees", ["tenant_id", "employee_id"]],
      ["hrx_payroll_items", ["tenant_id", "item_id"]],
    ],
    hrx_attendance_approval_receipts: [
      ["hrx_attendance_records", ["tenant_id", "attendance_id"]],
      ["hrx_employees", ["tenant_id", "employee_id"]],
    ],
    hrx_payroll_input_snapshots: [
      ["hrx_payroll_runs", ["tenant_id", "run_id"]],
      ["hrx_employees", ["tenant_id", "employee_id"]],
    ],
    hrx_payroll_employee_results: [
      ["hrx_payroll_runs", ["tenant_id", "run_id"]],
      ["hrx_employees", ["tenant_id", "employee_id"]],
    ],
    hrx_payroll_line_items: [["hrx_payroll_employee_results", ["tenant_id", "result_id"]]],
    hrx_payroll_statements: [
      ["hrx_payroll_runs", ["tenant_id", "run_id"]],
      ["hrx_employees", ["tenant_id", "employee_id"]],
      ["hrx_payroll_statement_templates", ["tenant_id", "template_id"]],
    ],
    hrx_payroll_delivery_receipts: [["hrx_payroll_statements", ["tenant_id", "statement_id"]]],
    hrx_payroll_payment_batches: [["hrx_payroll_runs", ["tenant_id", "run_id"]]],
    hrx_payroll_payment_items: [
      ["hrx_payroll_payment_batches", ["tenant_id", "payment_batch_id"]],
      ["hrx_employees", ["tenant_id", "employee_id"]],
    ],
    hrx_payroll_filing_jobs: [["hrx_payroll_runs", ["tenant_id", "run_id"]]],
    hrx_payroll_issues: [["hrx_payroll_runs", ["tenant_id", "run_id"]]],
    hrx_payroll_adjustments: [
      ["hrx_payroll_runs", ["tenant_id", "run_id"]],
      ["hrx_employees", ["tenant_id", "employee_id"]],
    ],
    hrx_payroll_outbox: [["hrx_payroll_runs", ["tenant_id", "run_id"]]],
    hrx_payroll_year_end_cases: [
      ["hrx_payroll_runs", ["tenant_id", "run_id"]],
      ["hrx_employees", ["tenant_id", "employee_id"]],
    ],
  };
  for (const [foreignTable, fields] of refs[table] ?? []) assertForeignKey(state, table, row, foreignTable, fields);
  if (table === "hrx_payroll_employee_results") {
    assertForeignKey(state, table, { ...row, snapshot_id: row.input_snapshot_id }, "hrx_payroll_input_snapshots", ["tenant_id", "snapshot_id"]);
  }
  if (table === "hrx_payroll_runs" && isPresent(row.previous_run_id)) {
    assertForeignKey(state, table, { ...row, run_id: row.previous_run_id }, "hrx_payroll_runs", ["tenant_id", "run_id"]);
  }
  if (table === "hrx_payroll_line_items" && isPresent(row.rule_version_id)) {
    assertForeignKey(state, table, row, "hrx_payroll_rule_versions", ["tenant_id", "rule_version_id"]);
  }
}

function assertPayrollConstraints(state, table, row) {
  if (table === "hrx_payroll_periods") {
    for (const field of ["period_code", "cutoff_at", "created_by_actor_id"]) {
      if (typeof row[field] !== "string" || !row[field].trim()) throw new TypeError(`payroll period ${field} is required`);
    }
    for (const field of ["period_start", "period_end", "pay_date"]) assertIsoDate(row[field], `payroll period ${field}`);
    if (row.period_start > row.period_end) throw new TypeError("payroll period range is invalid");
    if (!['draft', 'open', 'closed'].includes(row.status)) throw new TypeError("payroll period status is invalid");
    if (row.status === "closed" && !isPresent(row.closed_at)) throw new TypeError("closed payroll period requires closed_at");
  }
  if (table === "hrx_payroll_runs") {
    if (!['regular', 'adjustment'].includes(row.run_type)) throw new TypeError("payroll run_type is invalid");
    if (!['draft', 'snapshot_ready', 'previewed', 'approved', 'closed', 'cancelled'].includes(row.status)) throw new TypeError("payroll run status is invalid");
    if (row.run_type === "adjustment" && !isPresent(row.previous_run_id)) throw new TypeError("adjustment payroll run requires previous_run_id");
    if (row.run_type === "regular" && isPresent(row.previous_run_id)) throw new TypeError("regular payroll run cannot reference previous_run_id");
    assertSha256(row.snapshot_hash, "payroll run snapshot_hash", { optional: true });
    assertSha256(row.result_hash, "payroll run result_hash", { optional: true });
    if (['approved', 'closed'].includes(row.status) && ![row.approved_by_actor_id, row.approved_at].every(isPresent)) throw new TypeError("approved payroll run requires approval fields");
    if (row.status === "closed" && !isPresent(row.closed_at)) throw new TypeError("closed payroll run requires closed_at");
  }
  if (table === "hrx_payroll_profiles") {
    if (!['monthly', 'hourly', 'daily', 'freelancer'].includes(row.employment_type)) throw new TypeError("payroll profile employment_type is invalid");
    if (row.currency !== "KRW") throw new TypeError("payroll profile currency must be KRW");
    if (!['active', 'inactive'].includes(row.status)) throw new TypeError("payroll profile status is invalid");
    assertIsoDate(row.effective_from, "payroll profile effective_from");
    if (isPresent(row.effective_to)) assertIsoDate(row.effective_to, "payroll profile effective_to");
    if (isPresent(row.effective_to) && row.effective_from > row.effective_to) throw new TypeError("payroll profile effective range is invalid");
    assertTokenizedRef(row.compensation_ref, "payroll profile compensation_ref");
    const expectedUnit = { monthly: "period", hourly: "hour", daily: "day" }[row.employment_type];
    if (!['period', 'hour', 'day', 'contract', 'deliverable'].includes(row.compensation_unit)) throw new TypeError("payroll profile compensation_unit is invalid");
    if (expectedUnit && row.compensation_unit !== expectedUnit) throw new TypeError("payroll profile compensation_unit does not match employment_type");
    if (row.employment_type === "freelancer" && !['contract', 'deliverable'].includes(row.compensation_unit)) throw new TypeError("freelancer compensation_unit must be contract or deliverable");
    if (!Number.isInteger(row.compensation_quantity) || row.compensation_quantity < 1) throw new TypeError("payroll profile compensation_quantity must be a positive integer");
    if (isPresent(row.withholding_category) && !/^[A-Za-z0-9_.-]+$/.test(row.withholding_category)) throw new TypeError("payroll profile withholding_category is invalid");
    if (isPresent(row.deduction_input_json)) assertNoPrivateJson(parseJson(row.deduction_input_json, "payroll profile deduction_input_json"), "payroll profile deduction input");
    assertNoPrivateJson(parseJson(row.custom_deductions_json ?? "[]", "payroll profile custom_deductions_json", "array"), "payroll profile custom deductions");
    assertNoPrivateJson(parseJson(row.notice_assessments_json ?? "[]", "payroll profile notice_assessments_json", "array"), "payroll profile notice assessments");
    for (const blocked of ["amount", "salary", "hourly_rate", "daily_rate", "bank_account", "account_number"]) {
      if (Object.hasOwn(row, blocked)) throw new TypeError(`payroll profile must not include raw ${blocked}`);
    }
  }
  if (table === "hrx_payroll_items") {
    for (const field of ["code", "display_name", "kind", "tax_treatment", "value_mode", "effective_from", "status"]) {
      if (typeof row[field] !== "string" || !row[field].trim()) throw new TypeError(`payroll item ${field} is required`);
    }
    if (!["earning", "deduction"].includes(row.kind)) throw new TypeError("payroll item kind is invalid");
    if (!["taxable", "non_taxable"].includes(row.tax_treatment)) throw new TypeError("payroll item tax_treatment is invalid");
    if (!["fixed", "variable"].includes(row.value_mode)) throw new TypeError("payroll item value_mode is invalid");
    if (!["active", "inactive"].includes(row.status)) throw new TypeError("payroll item status is invalid");
    if (!Number.isInteger(row.calculation_order) || row.calculation_order < 0) throw new TypeError("payroll item calculation_order is invalid");
    assertIsoDate(row.effective_from, "payroll item effective_from");
    if (isPresent(row.effective_to)) assertIsoDate(row.effective_to, "payroll item effective_to");
    if (isPresent(row.effective_to) && row.effective_from > row.effective_to) throw new TypeError("payroll item effective range is invalid");
  }
  if (table === "hrx_payroll_item_assignments") {
    if (!Number.isInteger(row.version) || row.version < 1) throw new TypeError("payroll assignment version is invalid");
    if (!["active", "inactive"].includes(row.status)) throw new TypeError("payroll assignment status is invalid");
    if (row.raw_amount_included !== false && row.raw_amount_included !== 0) throw new TypeError("payroll assignment raw amount is forbidden");
    if (typeof row.encrypted_amount_ref !== "string" || !row.encrypted_amount_ref.startsWith("lawos-comp-v1.")) {
      throw new TypeError("payroll assignment encrypted_amount_ref is invalid");
    }
    for (const field of ["currency_ref", "source_ref"]) {
      if (typeof row[field] !== "string" || !row[field].trim()) throw new TypeError(`payroll assignment ${field} is required`);
    }
    assertIsoDate(row.effective_from, "payroll assignment effective_from");
    if (isPresent(row.effective_to)) assertIsoDate(row.effective_to, "payroll assignment effective_to");
    if (isPresent(row.effective_to) && row.effective_from > row.effective_to) throw new TypeError("payroll assignment effective range is invalid");
  }
  if (table === "hrx_attendance_approval_receipts") {
    for (const field of ["approved_by_actor_id", "approved_at", "attendance_source_ref", "idempotency_key"]) {
      if (typeof row[field] !== "string" || !row[field].trim()) throw new TypeError(`attendance approval receipt ${field} is required`);
    }
    if (Number.isNaN(Date.parse(row.approved_at))) throw new TypeError("attendance approval receipt approved_at is invalid");
  }
  if (table === "hrx_payroll_input_snapshots") {
    assertSha256(row.source_hash, "payroll input source_hash");
    const refs = parseJson(row.source_refs_json, "payroll input source_refs_json", "array");
    for (const ref of refs) {
      if (!ref || typeof ref.kind !== "string") throw new TypeError("payroll source ref kind is required");
      assertTokenizedRef(ref.ref, "payroll source ref");
      assertSha256(ref.hash, "payroll source ref hash");
    }
    assertNoPrivateJson(refs, "payroll source refs");
    const input = parseJson(row.input_json, "payroll input input_json");
    assertNoPrivateJson(input, "payroll input data");
    for (const field of ["payable_minutes", "paid_leave_minutes", "unpaid_leave_minutes"]) {
      if (!Number.isInteger(row[field]) || row[field] < 0) throw new TypeError(`payroll input ${field} must be a non-negative integer`);
    }
  }
  if (table === "hrx_payroll_employee_results") {
    for (const field of ["gross_krw", "deduction_krw", "net_krw", "issue_count"]) {
      if (!Number.isInteger(row[field])) throw new TypeError(`payroll result ${field} must be an integer`);
    }
    if (row.issue_count < 0 || row.gross_krw - row.deduction_krw !== row.net_krw) throw new TypeError("payroll result totals are inconsistent");
    assertSha256(row.result_hash, "payroll result result_hash");
    const snapshot = state.tables.hrx_payroll_input_snapshots.find((candidate) => candidate.tenant_id === row.tenant_id && candidate.snapshot_id === row.input_snapshot_id);
    if (snapshot && (snapshot.run_id !== row.run_id || snapshot.employee_id !== row.employee_id)) throw new TypeError("payroll result input snapshot does not match run and employee");
  }
  if (table === "hrx_payroll_line_items") {
    if (!['earning', 'deduction', 'employer_contribution', 'adjustment'].includes(row.item_kind)) throw new TypeError("payroll line item kind is invalid");
    if (!Number.isInteger(row.amount_krw)) throw new TypeError("payroll line item amount_krw must be an integer");
    if (isPresent(row.quantity_minutes) && (!Number.isInteger(row.quantity_minutes) || row.quantity_minutes < 0)) throw new TypeError("payroll line item quantity_minutes must be a non-negative integer");
    const metadata = parseJson(row.metadata_json, "payroll line item metadata_json");
    assertNoPrivateJson(metadata, "payroll line item metadata");
  }
  if (table === "hrx_payroll_rule_versions") {
    for (const field of ["rule_kind", "version_code", "created_by_actor_id"]) if (typeof row[field] !== "string" || !row[field].trim()) throw new TypeError(`payroll rule ${field} is required`);
    assertIsoDate(row.effective_from, "payroll rule effective_from");
    if (isPresent(row.effective_to)) assertIsoDate(row.effective_to, "payroll rule effective_to");
    if (isPresent(row.effective_to) && row.effective_from > row.effective_to) throw new TypeError("payroll rule effective range is invalid");
    assertSha256(row.source_document_hash, "payroll rule source_document_hash");
    assertNoPrivateJson(parseJson(row.rules_json, "payroll rule rules_json"), "payroll rule rules");
    if (!['draft', 'reviewed', 'published', 'retired'].includes(row.approval_state)) throw new TypeError("payroll rule approval_state is invalid");
    if (row.approval_state === "published" && ![row.reviewed_by_actor_id, row.published_by_actor_id, row.published_at].every(isPresent)) throw new TypeError("published payroll rule requires review and publish fields");
  }
  if (table === "hrx_payroll_statement_templates") {
    assertSha256(row.template_hash, "payroll statement template_hash");
    assertNoPrivateJson(parseJson(row.schema_json, "payroll statement schema_json"), "payroll statement schema");
    if (!['draft', 'published', 'retired'].includes(row.status)) throw new TypeError("payroll statement template status is invalid");
    if (row.status === "published" && ![row.published_by_actor_id, row.published_at].every(isPresent)) throw new TypeError("published statement template requires publish fields");
  }
  if (table === "hrx_payroll_statements") {
    assertTokenizedRef(row.document_ref, "payroll statement document_ref");
    assertSha256(row.document_hash, "payroll statement document_hash");
    if (!['generated', 'delivered', 'viewed', 'revoked'].includes(row.state)) throw new TypeError("payroll statement state is invalid");
  }
  if (table === "hrx_payroll_delivery_receipts") {
    if (!['email', 'message', 'self_service'].includes(row.channel)) throw new TypeError("payroll delivery channel is invalid");
    if (!['queued', 'delivered', 'viewed', 'failed', 'revoked'].includes(row.state)) throw new TypeError("payroll delivery state is invalid");
    if (!Number.isInteger(row.attempt_count) || row.attempt_count < 0) throw new TypeError("payroll delivery attempt_count must be a non-negative integer");
    assertTokenizedRef(row.provider_receipt_ref, "payroll delivery provider_receipt_ref", { optional: true });
    assertSha256(row.receipt_hash, "payroll delivery receipt_hash", { optional: true });
    if (['delivered', 'viewed'].includes(row.state) && ![row.provider_receipt_ref, row.receipt_hash, row.delivered_at].every(isPresent)) throw new TypeError("delivered payroll statement requires provider receipt fields");
  }
  if (table === "hrx_payroll_payment_batches") {
    assertSha256(row.checksum, "payroll payment batch checksum");
    assertTokenizedRef(row.artifact_ref, "payroll payment artifact_ref", { optional: true });
    assertTokenizedRef(row.provider_receipt_ref, "payroll payment provider_receipt_ref", { optional: true });
    if (!['draft', 'approved', 'exported', 'reconciled', 'failed'].includes(row.state)) throw new TypeError("payroll payment batch state is invalid");
    if (['approved', 'exported', 'reconciled'].includes(row.state) && !isPresent(row.approved_by_actor_id)) throw new TypeError("approved payment batch requires approved_by_actor_id");
    if (['exported', 'reconciled'].includes(row.state) && !isPresent(row.artifact_ref)) throw new TypeError("exported payment batch requires artifact_ref");
    if (row.state === "reconciled" && !isPresent(row.provider_receipt_ref)) throw new TypeError("reconciled payment batch requires provider_receipt_ref");
  }
  if (table === "hrx_payroll_payment_items") {
    assertTokenizedRef(row.tokenized_account_ref, "payroll payment tokenized_account_ref");
    assertTokenizedRef(row.provider_receipt_ref, "payroll payment item provider_receipt_ref", { optional: true });
    if (!Number.isInteger(row.amount_krw) || row.amount_krw < 0) throw new TypeError("payroll payment amount_krw must be a non-negative integer");
    if (!['pending', 'exported', 'paid', 'failed'].includes(row.state)) throw new TypeError("payroll payment item state is invalid");
    if (row.state === "paid" && ![row.provider_receipt_ref, row.paid_at].every(isPresent)) throw new TypeError("paid payroll item requires receipt and paid_at");
  }
  if (table === "hrx_payroll_filing_jobs") {
    if (!['withholding', 'payment_statement', 'social_insurance', 'year_end'].includes(row.filing_kind)) throw new TypeError("payroll filing kind is invalid");
    if (!['draft', 'validated', 'submitted', 'accepted', 'rejected', 'corrected'].includes(row.state)) throw new TypeError("payroll filing state is invalid");
    assertTokenizedRef(row.package_ref, "payroll filing package_ref");
    assertSha256(row.package_hash, "payroll filing package_hash");
    assertTokenizedRef(row.provider_receipt_ref, "payroll filing provider_receipt_ref", { optional: true });
    if (['submitted', 'accepted', 'rejected'].includes(row.state) && !isPresent(row.submitted_at)) throw new TypeError("submitted payroll filing requires submitted_at");
    if (['accepted', 'rejected'].includes(row.state) && !isPresent(row.provider_receipt_ref)) throw new TypeError("completed payroll filing requires provider_receipt_ref");
  }
  if (table === "hrx_payroll_issues") {
    if (!['warning', 'blocker'].includes(row.severity)) throw new TypeError("payroll issue severity is invalid");
    if (!['open', 'resolved', 'waived'].includes(row.state)) throw new TypeError("payroll issue state is invalid");
    assertTokenizedRef(row.source_ref, "payroll issue source_ref");
    assertNoPrivateJson(parseJson(row.details_json, "payroll issue details_json"), "payroll issue details");
    if (['resolved', 'waived'].includes(row.state) && ![row.resolved_by_actor_id, row.resolved_at, row.resolution_code].every(isPresent)) throw new TypeError("closed payroll issue requires resolution fields");
    if (isPresent(row.employee_id)) assertForeignKey(state, table, row, "hrx_employees", ["tenant_id", "employee_id"]);
  }
  if (table === "hrx_payroll_adjustments") {
    assertTokenizedRef(row.previous_run_ref, "payroll adjustment previous_run_ref");
    assertTokenizedRef(row.adjustment_ref, "payroll adjustment adjustment_ref");
    if (typeof row.reason_code !== "string" || !/^[A-Z][A-Z0-9_]{0,63}$/.test(row.reason_code)) throw new TypeError("payroll adjustment reason_code is invalid");
    if (!Number.isInteger(row.amount_krw) || row.amount_krw === 0) throw new TypeError("payroll adjustment amount_krw must be a non-zero integer");
    if (![0, 1].includes(row.taxable)) throw new TypeError("payroll adjustment taxable must be 0 or 1");
  }
  if (table === "hrx_payroll_outbox") {
    if (typeof row.event_type !== "string" || !/^payroll\.[a-z0-9_.-]+$/.test(row.event_type)) throw new TypeError("payroll outbox event_type is invalid");
    if (typeof row.idempotency_key !== "string" || !row.idempotency_key.trim()) throw new TypeError("payroll outbox idempotency_key is required");
    assertNoPrivateJson(parseJson(row.payload_json, "payroll outbox payload_json"), "payroll outbox payload");
  }
  if (table === "hrx_payroll_year_end_cases") {
    if (!Number.isInteger(row.tax_year) || row.tax_year < 2000 || row.tax_year > 2200) throw new TypeError("payroll year-end tax_year is invalid");
    if (!["collecting", "complete"].includes(row.collection_state)) throw new TypeError("payroll year-end collection_state is invalid");
    if (!["draft", "calculated", "reviewed"].includes(row.state)) throw new TypeError("payroll year-end state is invalid");
    assertSha256(row.input_hash, "payroll year-end input_hash");
    const sourceRefs = parseJson(row.source_refs_json, "payroll year-end source_refs_json", "array");
    for (const source of sourceRefs) {
      if (!source || typeof source.kind !== "string") throw new TypeError("payroll year-end source kind is required");
      assertTokenizedRef(source.ref, "payroll year-end source ref");
      assertSha256(source.hash, "payroll year-end source hash");
    }
    assertNoPrivateJson(sourceRefs, "payroll year-end source refs");
    assertNoPrivateJson(parseJson(row.inputs_json, "payroll year-end inputs_json"), "payroll year-end inputs");
    if (["calculated", "reviewed"].includes(row.state)) {
      assertSha256(row.result_hash, "payroll year-end result_hash");
      assertNoPrivateJson(parseJson(row.result_json, "payroll year-end result_json"), "payroll year-end result");
      if (!isPresent(row.calculated_at)) throw new TypeError("calculated payroll year-end case requires calculated_at");
    }
    if (row.state === "reviewed") {
      assertTokenizedRef(row.review_receipt_ref, "payroll year-end review_receipt_ref");
      if (![row.reviewed_by_actor_id, row.reviewed_at].every(isPresent)) throw new TypeError("reviewed payroll year-end case requires review fields");
      if (row.prepared_by_actor_id === row.reviewed_by_actor_id) throw new TypeError("payroll year-end preparer cannot self-review");
    }
  }
  assertPayrollReferences(state, table, row);
}

function assertCoreConstraints(state, table, row) {
  if (["hrx_documents", "hrx_compensation_records", "hrx_leave_balance_entries", "hrx_leave_requests", "hrx_attendance_records", "hrx_overtime_requests"].includes(table)) {
    const employeeExists = state.tables.hrx_employees.some(
      (employee) => employee.tenant_id === row.tenant_id && employee.employee_id === row.employee_id,
    );
    if (!employeeExists) throw new ReferenceError(`${table} employee not found: ${row.employee_id}`);
  }
  if (table === "hrx_employment_profiles") {
    const employeeExists = state.tables.hrx_employees.some(
      (employee) => employee.tenant_id === row.tenant_id && employee.employee_id === row.employee_id,
    );
    if (!employeeExists) throw new ReferenceError(`EmploymentProfile employee not found: ${row.employee_id}`);
  }
  if (table === "hrx_employee_user_links") {
    if (row.purpose !== "login_mapping") throw new TypeError("Employee/User link purpose must be login_mapping");
    if (row.employee_id === row.user_id) throw new TypeError("Employee and IAM User identifiers must remain separate");
    const employeeExists = state.tables.hrx_employees.some(
      (employee) => employee.tenant_id === row.tenant_id && employee.employee_id === row.employee_id,
    );
    if (!employeeExists) throw new ReferenceError(`EmployeeUserLink employee not found: ${row.employee_id}`);
    const duplicateUserPurpose = state.tables.hrx_employee_user_links.some(
      (link) =>
        link.tenant_id === row.tenant_id &&
        link.user_id === row.user_id &&
        link.purpose === row.purpose &&
        !samePrimaryKey(table, link, row),
    );
    if (duplicateUserPurpose) throw new Error(`EmployeeUserLink already exists for user/purpose: ${row.user_id}`);
  }
  if (table === "hrx_documents") {
    for (const blocked of ["body", "content", "text", "document_body"]) {
      if (Object.hasOwn(row, blocked)) throw new TypeError(`HR document metadata must not include ${blocked}`);
    }
    if (row.document_body_included !== false) throw new TypeError("HR document body must not be stored");
  }
  if (table === "hrx_compensation_records") {
    for (const blocked of ["amount", "salary", "base_pay", "bonus_amount", "equity_value", "gross_pay", "net_pay"]) {
      if (Object.hasOwn(row, blocked)) throw new TypeError(`Compensation metadata must not include raw ${blocked}`);
    }
    if (row.raw_amount_included !== false) throw new TypeError("Compensation raw amount must not be stored");
    if (typeof row.encrypted_amount_ref !== "string" || !row.encrypted_amount_ref.trim()) {
      throw new TypeError("Compensation encrypted_amount_ref is required");
    }
    if (typeof row.employment_contract_id !== "string" || !row.employment_contract_id.trim()) {
      throw new TypeError("Compensation employment_contract_id is required");
    }
    if (typeof row.contract_document_ref !== "string" || !row.contract_document_ref.trim()) {
      throw new TypeError("Compensation contract_document_ref is required");
    }
  }
  if (table === "hrx_attendance_records" && row.correction_of_attendance_id) {
    const originalExists = state.tables.hrx_attendance_records.some(
      (record) => record.tenant_id === row.tenant_id && record.attendance_id === row.correction_of_attendance_id,
    );
    if (!originalExists) throw new ReferenceError(`Attendance correction source not found: ${row.correction_of_attendance_id}`);
  }
  if (table === "hrx_audit_events") {
    if (typeof row.event_hash !== "string" || row.event_hash.trim() === "") {
      throw new TypeError("HRX audit event_hash is required");
    }
  }
  if (table === "hrx_leave_policy_assignments" && ![row.employee_id, row.organization_id, row.employment_type].some(isPresent)) {
    throw new TypeError("leave policy assignment requires employee_id, organization_id, or employment_type");
  }
  if (table === "hrx_work_schedule_assignments" && ![row.employee_id, row.organization_id].some(isPresent)) {
    throw new TypeError("work schedule assignment requires employee_id or organization_id");
  }
  if (table === "hrx_leave_entitlements") {
    if (!Number.isInteger(row.granted_minutes) || row.granted_minutes <= 0) {
      throw new TypeError("leave entitlement granted_minutes must be a positive integer");
    }
    if (!Number.isInteger(row.state_version) || row.state_version < 1) {
      throw new TypeError("leave entitlement state_version must be a positive integer");
    }
    if (isPresent(row.policy_rules_snapshot_hash) && !/^[a-f0-9]{64}$/.test(row.policy_rules_snapshot_hash)) {
      throw new TypeError("leave entitlement policy_rules_snapshot_hash must be a SHA-256 hash");
    }
  }
  if (table === "hrx_leave_accrual_rules") {
    for (const field of ["rule_code", "display_name", "rule_json", "effective_from"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") {
        throw new TypeError(`leave accrual rule ${field} is required`);
      }
    }
    if (!["active", "inactive"].includes(row.status)) throw new TypeError("leave accrual rule status must be active or inactive");
    if (isPresent(row.logical_rule_code) && (typeof row.logical_rule_code !== "string" || !row.logical_rule_code.trim())) {
      throw new TypeError("leave accrual rule logical_rule_code is invalid");
    }
    if (isPresent(row.version) && (!Number.isInteger(row.version) || row.version < 1)) {
      throw new TypeError("leave accrual rule version must be a positive integer");
    }
    if (isPresent(row.supersedes_rule_id)) {
      const previous = state.tables.hrx_leave_accrual_rules.find(
        (candidate) => candidate.tenant_id === row.tenant_id && candidate.accrual_rule_id === row.supersedes_rule_id,
      );
      if (!previous) throw new ReferenceError(`leave accrual superseded rule not found: ${row.supersedes_rule_id}`);
    }
  }
  if (table === "hrx_leave_accrual_runs") {
    for (const field of ["period_key", "occurred_on", "source_version", "input_hash", "snapshot_hash", "idempotency_key", "result_json"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") {
        throw new TypeError(`leave accrual run ${field} is required`);
      }
    }
    if (!["preview", "execute"].includes(row.mode)) throw new TypeError("leave accrual run mode must be preview or execute");
    if (isPresent(row.as_of_date)) assertIsoDate(row.as_of_date, "leave accrual run as_of_date");
  }
  if (table === "hrx_leave_accrual_batches") {
    for (const field of ["period_start", "period_end", "input_hash", "idempotency_key", "executed_by"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave accrual batch ${field} is required`);
    }
    if (!["preview", "execute"].includes(row.mode)) throw new TypeError("leave accrual batch mode must be preview or execute");
    if (!["pending", "running", "completed", "completed_with_errors", "failed"].includes(row.status)) throw new TypeError("leave accrual batch status is invalid");
    if (!Number.isInteger(row.period_count) || row.period_count < 1) throw new TypeError("leave accrual batch period_count must be a positive integer");
    if (row.period_start > row.period_end) throw new TypeError("leave accrual batch period range is invalid");
    if ((row.mode === "preview" && isPresent(row.preview_batch_id)) || (row.mode === "execute" && !isPresent(row.preview_batch_id))) {
      throw new TypeError("leave accrual batch preview_batch_id does not match mode");
    }
    for (const field of ["period_start", "period_end"]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row[field]) || Number.isNaN(Date.parse(`${row[field]}T00:00:00Z`))) throw new TypeError(`leave accrual batch ${field} must be an ISO date`);
    }
    if (isPresent(row.preview_batch_id)) {
      assertForeignKey(state, table, { ...row, accrual_batch_id: row.preview_batch_id }, "hrx_leave_accrual_batches", ["tenant_id", "accrual_batch_id"]);
    }
    if (["completed", "completed_with_errors"].includes(row.status) && (![row.source_version, row.snapshot_hash].every(isPresent) || !isPresent(row.completed_at))) {
      throw new TypeError("completed leave accrual batch requires source_version, snapshot_hash, and completed_at");
    }
    if (row.status === "failed" && !isPresent(row.error_code)) throw new TypeError("failed leave accrual batch requires error_code");
  }
  if (table === "hrx_leave_accrual_batch_periods") {
    for (const field of ["period_key", "period_start", "period_end", "occurred_on"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave accrual batch period ${field} is required`);
    }
    if (!Number.isInteger(row.period_index) || row.period_index < 0) throw new TypeError("leave accrual batch period_index must be a non-negative integer");
    if (!Number.isInteger(row.attempt_count) || row.attempt_count < 0) throw new TypeError("leave accrual batch attempt_count must be a non-negative integer");
    for (const field of ["period_start", "period_end", "occurred_on"]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row[field]) || Number.isNaN(Date.parse(`${row[field]}T00:00:00Z`))) throw new TypeError(`leave accrual batch period ${field} must be an ISO date`);
    }
    if (row.period_start > row.period_end) throw new TypeError("leave accrual batch period range is invalid");
    if (!["pending", "running", "completed", "completed_with_errors", "failed"].includes(row.status)) throw new TypeError("leave accrual batch period status is invalid");
    if (isPresent(row.accrual_run_id)) {
      assertForeignKey(state, table, row, "hrx_leave_accrual_runs", ["tenant_id", "accrual_run_id"]);
    }
    if (["completed", "completed_with_errors"].includes(row.status) && (![row.accrual_run_id, row.source_version, row.snapshot_hash, row.completed_at].every(isPresent))) {
      throw new TypeError("completed leave accrual batch period requires run, source, snapshot, and completed_at");
    }
    if (row.status === "failed" && !isPresent(row.error_code)) throw new TypeError("failed leave accrual batch period requires error_code");
  }
  if (table === "hrx_leave_occurrence_upload_batches") {
    for (const field of ["template_version", "file_hash", "preview_hash", "input_hash", "idempotency_key", "as_of", "created_by_actor_id"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave occurrence upload batch ${field} is required`);
    }
    if (!/^[a-f0-9]{64}$/.test(row.file_hash) || !/^[a-f0-9]{64}$/.test(row.preview_hash) || !/^[a-f0-9]{64}$/.test(row.input_hash)) {
      throw new TypeError("leave occurrence upload batch hashes must be SHA-256 hex values");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.as_of) || Number.isNaN(Date.parse(`${row.as_of}T00:00:00Z`))) throw new TypeError("leave occurrence upload batch as_of must be an ISO date");
    if (typeof row.schedule_only !== "boolean") throw new TypeError("leave occurrence upload batch schedule_only must be boolean");
    if (!["previewed", "running", "completed", "completed_with_errors"].includes(row.status)) throw new TypeError("leave occurrence upload batch status is invalid");
    for (const field of ["row_count", "ready_count", "error_count", "duplicate_count"]) {
      if (!Number.isInteger(row[field]) || row[field] < 0) throw new TypeError(`leave occurrence upload batch ${field} must be a non-negative integer`);
    }
    if (row.row_count !== row.ready_count + row.error_count || row.duplicate_count > row.error_count) throw new TypeError("leave occurrence upload batch counts do not reconcile");
    if (!Number.isInteger(row.state_version) || row.state_version < 1) throw new TypeError("leave occurrence upload batch state_version must be positive");
    if (["running", "completed", "completed_with_errors"].includes(row.status) && ![row.execute_idempotency_key, row.approved_by_actor_id].every(isPresent)) {
      throw new TypeError("executed leave occurrence upload batch requires idempotency and approval");
    }
    if (["completed", "completed_with_errors"].includes(row.status) && !isPresent(row.completed_at)) throw new TypeError("completed leave occurrence upload batch requires completed_at");
  }
  if (table === "hrx_leave_occurrence_upload_rows") {
    if (!Number.isInteger(row.row_number) || row.row_number < 1) throw new TypeError("leave occurrence upload row_number must be positive");
    if (!["ready", "error"].includes(row.preview_status)) throw new TypeError("leave occurrence upload preview_status is invalid");
    if (!["pending", "running", "completed", "failed", "invalid"].includes(row.execution_status)) throw new TypeError("leave occurrence upload execution_status is invalid");
    if (!Number.isInteger(row.attempt_count) || row.attempt_count < 0) throw new TypeError("leave occurrence upload attempt_count must be non-negative");
    if (!Number.isInteger(row.state_version) || row.state_version < 1) throw new TypeError("leave occurrence upload row state_version must be positive");
    for (const field of ["payload_json", "execution_result_json"]) {
      if (typeof row[field] !== "string") throw new TypeError(`leave occurrence upload row ${field} is required`);
      try {
        JSON.parse(row[field]);
      } catch {
        throw new TypeError(`leave occurrence upload row ${field} must be valid JSON`);
      }
    }
    if (row.preview_status === "ready" && (![row.row_key, row.employee_id].every(isPresent) || row.execution_status === "invalid")) {
      throw new TypeError("ready leave occurrence upload row requires key, employee, and executable state");
    }
    if (row.preview_status === "error" && (!isPresent(row.preview_error_code) || row.execution_status !== "invalid")) {
      throw new TypeError("invalid leave occurrence upload row requires preview error and invalid execution state");
    }
    if (row.execution_status === "failed" && !isPresent(row.execution_error_code)) throw new TypeError("failed leave occurrence upload row requires execution_error_code");
    if (["completed", "failed"].includes(row.execution_status) && !isPresent(row.completed_at)) throw new TypeError("terminal leave occurrence upload row requires completed_at");
  }
  if (table === "hrx_leave_balance_snapshots") {
    if (!Number.isInteger(row.available_minutes)) throw new TypeError("leave balance snapshot available_minutes must be an integer");
    for (const field of ["as_of", "source_version"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave balance snapshot ${field} is required`);
    }
  }
  if (table === "hrx_leave_job_outbox") {
    for (const field of ["job_type", "schedule_key", "payload_json", "idempotency_key", "state", "available_at", "result_json"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave job outbox ${field} is required`);
    }
    if (row.job_type !== "leave_entitlement_expiration") throw new TypeError("leave job outbox job_type is invalid");
    if (!["pending", "running", "completed", "failed"].includes(row.state)) throw new TypeError("leave job outbox state is invalid");
    if (!Number.isInteger(row.attempt_count) || row.attempt_count < 0) throw new TypeError("leave job outbox attempt_count must be a non-negative integer");
    for (const field of ["payload_json", "result_json"]) {
      try {
        JSON.parse(row[field]);
      } catch {
        throw new TypeError(`leave job outbox ${field} must be valid JSON`);
      }
    }
  }
  if (table === "hrx_leave_termination_reconciliations") {
    for (const field of ["termination_date", "snapshot_hash", "source_version", "state", "result_json", "idempotency_key"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave termination reconciliation ${field} is required`);
    }
    if (!["preview", "execute"].includes(row.mode)) throw new TypeError("leave termination reconciliation mode must be preview or execute");
    if (row.mode === "execute" && !isPresent(row.preview_reconciliation_id)) throw new TypeError("executed leave termination reconciliation requires preview_reconciliation_id");
  }
  if (table === "hrx_leave_promotion_campaigns") {
    for (const field of ["policy_version_id", "reference_date", "entitlement_period_end", "schedule_profile_id", "legal_schedule_json", "legal_basis_code", "legal_basis_version", "source_version", "calculation_snapshot_hash", "exclusions_json", "idempotency_key"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave promotion campaign ${field} is required`);
    }
    for (const field of ["threshold_minutes", "standard_day_minutes"]) {
      if (!Number.isInteger(row[field]) || row[field] <= 0) throw new TypeError(`leave promotion campaign ${field} must be a positive integer`);
    }
    if (!Number.isInteger(row.target_count) || row.target_count < 0) throw new TypeError("leave promotion campaign target_count must be a non-negative integer");
    if (!Number.isInteger(row.excluded_count) || row.excluded_count < 0) throw new TypeError("leave promotion campaign excluded_count must be a non-negative integer");
    try {
      if (!Array.isArray(JSON.parse(row.exclusions_json))) throw new TypeError();
    } catch {
      throw new TypeError("leave promotion campaign exclusions_json must be a JSON array");
    }
  }
  if (table === "hrx_leave_promotion_recipients") {
    for (const field of ["first_notice_deadline_at", "second_notice_deadline_at", "source_version", "state", "first_delivery_state", "second_delivery_state", "compliance_state", "late_reasons_json"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave promotion recipient ${field} is required`);
    }
    for (const field of ["unused_minutes", "standard_day_minutes"]) {
      if (!Number.isInteger(row[field]) || row[field] <= 0) throw new TypeError(`leave promotion recipient ${field} must be a positive integer`);
    }
    for (const field of ["first_content_hash", "second_content_hash"]) {
      if (isPresent(row[field]) && !/^[a-f0-9]{64}$/.test(row[field])) throw new TypeError(`leave promotion recipient ${field} must be a SHA-256 hex digest`);
    }
  }
  if (table === "hrx_leave_promotion_evidence_receipts") {
    for (const field of ["recipient_id", "stage", "event_type", "evidence_hash", "occurred_at", "state", "idempotency_key"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave promotion evidence receipt ${field} is required`);
    }
    if (!["first", "second"].includes(row.stage)) throw new TypeError("leave promotion evidence receipt stage is invalid");
    if (!["delivered", "viewed", "failed"].includes(row.event_type)) throw new TypeError("leave promotion evidence receipt event_type is invalid");
    if (!["active", "revoked"].includes(row.state)) throw new TypeError("leave promotion evidence receipt state is invalid");
    if (!/^[a-f0-9]{64}$/.test(row.evidence_hash)) throw new TypeError("leave promotion evidence receipt evidence_hash must be a SHA-256 hex digest");
    if (row.event_type === "delivered" && !isPresent(row.provider_receipt_ref)) throw new TypeError("delivered leave promotion evidence requires provider_receipt_ref");
    if (row.event_type !== "delivered" && isPresent(row.provider_receipt_ref)) throw new TypeError("non-delivery leave promotion evidence must not include provider_receipt_ref");
    if (row.state === "active" && [row.revoked_at, row.revoked_by_actor_id, row.revocation_reason_code].some(isPresent)) throw new TypeError("active leave promotion evidence must not include revocation fields");
    if (row.state === "revoked" && ![row.revoked_at, row.revoked_by_actor_id, row.revocation_reason_code].every(isPresent)) throw new TypeError("revoked leave promotion evidence requires complete revocation fields");
  }
  if (table === "hrx_leave_integration_deliveries") {
    for (const field of ["provider_kind", "provider_mode", "event_type", "state", "payload_hash", "payload_json", "idempotency_key"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave integration delivery ${field} is required`);
    }
    if (!["schedule", "attendance", "payroll", "notification"].includes(row.provider_kind)) {
      throw new TypeError("leave integration provider_kind is invalid");
    }
    if (!["pending_sync", "delivered", "failed", "not_configured"].includes(row.state)) {
      throw new TypeError("leave integration delivery state is invalid");
    }
    if (!Number.isInteger(row.attempt_count) || row.attempt_count < 0) {
      throw new TypeError("leave integration delivery attempt_count must be a non-negative integer");
    }
    let payload;
    try {
      payload = JSON.parse(row.payload_json);
    } catch {
      throw new TypeError("leave integration delivery payload_json must be valid JSON");
    }
    if (row.provider_kind === "notification") {
      const serialized = JSON.stringify(payload);
      for (const blocked of ["reason_text", "handover_note", "employee_id", "employee_display_name", "attachment_id", "document_id"]) {
        if (serialized.includes(`\"${blocked}\"`)) throw new TypeError(`leave notification payload must not include ${blocked}`);
      }
      if (payload.private_fields_included !== false) throw new TypeError("leave notification payload must declare private_fields_included=false");
    }
    if (row.provider_kind === "schedule") {
      const serialized = JSON.stringify(payload);
      for (const blocked of ["employee_id", "leave_type", "leave_type_id", "reason", "reason_text", "attachment_id", "attachment_ids", "document_id", "document_ids"]) {
        if (serialized.includes(`\"${blocked}\"`)) throw new TypeError(`leave schedule payload must not include ${blocked}`);
      }
      if (payload.public_title !== "휴가" || payload.coworker_visibility !== "title_only") {
        throw new TypeError("leave schedule payload must use the public leave title only");
      }
    }
  }
  if (table === "hrx_leave_integration_dead_letters") {
    for (const field of ["outbox_event_id", "delivery_id", "provider_kind", "state", "last_error_code", "idempotency_key", "created_at", "updated_at"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave integration dead letter ${field} is required`);
    }
    if (!["schedule", "attendance", "payroll", "notification"].includes(row.provider_kind)) {
      throw new TypeError("leave integration dead letter provider_kind is invalid");
    }
    if (!["open", "requeued", "resolved"].includes(row.state)) {
      throw new TypeError("leave integration dead letter state is invalid");
    }
    if (!Number.isInteger(row.fail_count) || row.fail_count < 1) {
      throw new TypeError("leave integration dead letter fail_count must be a positive integer");
    }
  }
  if (table === "hrx_leave_request_segments") {
    if (!Number.isInteger(row.scheduled_minutes) || !Number.isInteger(row.requested_minutes)) {
      throw new TypeError("leave request segment minutes must be integers");
    }
    if (row.requested_minutes <= 0 || row.requested_minutes > row.scheduled_minutes) {
      throw new TypeError("leave request segment minutes exceed the assigned schedule");
    }
    if (isPresent(row.policy_rules_snapshot_hash)) {
      if (!/^[a-f0-9]{64}$/.test(row.policy_rules_snapshot_hash)) {
        throw new TypeError("leave request segment policy_rules_snapshot_hash must be a SHA-256 hash");
      }
      for (const field of ["paid_minutes", "deduction_minutes"]) {
        if (!Number.isInteger(row[field]) || row[field] < 0) {
          throw new TypeError(`leave request segment ${field} must be a non-negative integer`);
        }
      }
    }
  }
  if (table === "hrx_leave_request_allocations") {
    if (!["reserved", "used", "released"].includes(row.allocation_phase)) {
      throw new TypeError("leave allocation phase must be reserved, used, or released");
    }
    if (!Number.isInteger(row.amount_minutes) || row.amount_minutes <= 0) {
      throw new TypeError("leave allocation amount_minutes must be a positive integer");
    }
    if (row.allocation_round !== undefined && (!Number.isInteger(row.allocation_round) || row.allocation_round < 1)) {
      throw new TypeError("leave allocation allocation_round must be a positive integer");
    }
  }
  if (CAS_TABLES.has(table) && isPresent(row.state_version)) {
    if (!Number.isInteger(row.state_version) || row.state_version < 1) {
      throw new TypeError(`${table}.state_version must be a positive integer`);
    }
  }
  assertPayrollConstraints(state, table, row);
  assertLeaveReferences(state, table, row);
  assertUniqueConstraints(state, table, row);
}

function sumMinutes(rows) {
  return rows.reduce((total, row) => total + row.amount_minutes, 0);
}

function assertLeaveStateInvariants(state) {
  for (const request of state.tables.hrx_leave_requests) {
    if (!Number.isInteger(request.requested_minutes)) continue;
    if (request.requested_minutes <= 0) throw new TypeError("leave request requested_minutes must be a positive integer");
    if (isPresent(request.policy_rules_snapshot_hash)) {
      if (!/^[a-f0-9]{64}$/.test(request.policy_rules_snapshot_hash)) {
        throw new TypeError("leave request policy_rules_snapshot_hash must be a SHA-256 hash");
      }
      if (!["full_day", "half_day", "quarter_day", "hours"].includes(request.duration_mode)) {
        throw new TypeError("leave request duration_mode is invalid");
      }
      for (const field of ["rounded_requested_minutes", "paid_minutes", "unpaid_minutes", "deduction_minutes"]) {
        if (!Number.isInteger(request[field]) || request[field] < 0) {
          throw new TypeError(`leave request ${field} must be a non-negative integer`);
        }
      }
      if (request.rounded_requested_minutes <= 0 || request.paid_minutes + request.unpaid_minutes !== request.rounded_requested_minutes) {
        throw new TypeError(`leave request economics snapshot is inconsistent: ${request.request_id}`);
      }
    }
    const ref = (row) => row.tenant_id === request.tenant_id && row.request_id === request.request_id;
    const segments = state.tables.hrx_leave_request_segments.filter(ref);
    if (segments.reduce((total, segment) => total + segment.requested_minutes, 0) !== request.requested_minutes) {
      throw new TypeError(`leave request segment minutes do not match request: ${request.request_id}`);
    }
    if (isPresent(request.policy_rules_snapshot_hash)) {
      if (segments.some((segment) => segment.policy_rules_snapshot_hash !== request.policy_rules_snapshot_hash)) {
        throw new TypeError(`leave request segment policy snapshot does not match request: ${request.request_id}`);
      }
      if (segments.reduce((total, segment) => total + segment.paid_minutes, 0) !== request.paid_minutes) {
        throw new TypeError(`leave request segment paid minutes do not match request: ${request.request_id}`);
      }
      if (segments.reduce((total, segment) => total + segment.deduction_minutes, 0) !== request.deduction_minutes) {
        throw new TypeError(`leave request segment deduction minutes do not match request: ${request.request_id}`);
      }
    }

    const allocations = state.tables.hrx_leave_request_allocations.filter(ref);
    const byPhase = (phase) => sumMinutes(allocations.filter((allocation) => allocation.allocation_phase === phase));
    const reserved = byPhase("reserved");
    const released = byPhase("released");
    const used = byPhase("used");
    const netReserved = reserved - released;
    const deductionMinutes = Number.isInteger(request.deduction_minutes) ? request.deduction_minutes : request.requested_minutes;
    if (released > reserved || netReserved < 0) {
      throw new TypeError(`leave request released allocation exceeds reservation: ${request.request_id}`);
    }
    if (["submitted", "reschedule_pending"].includes(request.state) && (netReserved !== deductionMinutes || used !== 0)) {
      throw new TypeError(`pending leave request reservation does not match request: ${request.request_id}`);
    }
    if (["approved", "cancel_pending"].includes(request.state)) {
      if (netReserved !== 0 || used !== deductionMinutes) {
        throw new TypeError(`approved leave request allocation totals are incomplete: ${request.request_id}`);
      }
    }
    if (["rejected", "cancelled"].includes(request.state)) {
      if (netReserved !== 0 || used !== 0) {
        throw new TypeError(`closed leave request allocation totals are incomplete: ${request.request_id}`);
      }
    }

    for (const allocation of allocations) {
      const expectedEntryType = allocation.allocation_phase;
      const entries = state.tables.hrx_leave_balance_entries.filter(
        (entry) =>
          entry.tenant_id === allocation.tenant_id &&
          entry.allocation_id === allocation.allocation_id &&
          entry.entry_type === expectedEntryType &&
          entry.amount_minutes === allocation.amount_minutes,
      );
      if (entries.length !== 1) {
        throw new TypeError(`leave allocation must have exactly one matching ledger entry: ${allocation.allocation_id}`);
      }
    }
  }

  for (const entitlement of state.tables.hrx_leave_entitlements) {
    const entries = state.tables.hrx_leave_balance_entries.filter(
      (entry) => entry.tenant_id === entitlement.tenant_id && entry.entitlement_id === entitlement.entitlement_id,
    );
    const consumed = entries.reduce((total, entry) => {
      if (["reserved", "used", "expired"].includes(entry.entry_type)) return total + entry.amount_minutes;
      if (entry.entry_type === "released") return total - entry.amount_minutes;
      if (entry.entry_type === "adjustment") {
        return total + (entry.adjustment_direction === "debit" ? entry.amount_minutes : -entry.amount_minutes);
      }
      if (isPresent(entry.reverses_entry_id) && (ledgerEffect(entry) ?? 0) > 0) return total - entry.amount_minutes;
      return total;
    }, 0);
    if (consumed > entitlement.granted_minutes) {
      throw new TypeError(`leave entitlement over-allocated: ${entitlement.entitlement_id}`);
    }
  }
}

export function validateHrxStoreSnapshot(snapshot) {
  const state = normalizeState(clone(snapshot));
  let rowCount = 0;
  for (const table of TABLES) {
    for (const row of state.tables[table]) {
      assertPrimaryKey(table, row);
      assertCoreConstraints(state, table, row);
      rowCount += 1;
    }
  }
  assertLeaveStateInvariants(state);
  return Object.freeze({
    table_count: TABLES.length,
    row_count: rowCount,
    primary_key_integrity_passed: true,
    unique_integrity_passed: true,
    foreign_key_integrity_passed: true,
    domain_invariants_passed: true,
  });
}

function executeQuery(state, operation, params = {}) {
  if (typeof operation !== "string" || operation.trim() === "") {
    throw new TypeError("HRX store query operation is required");
  }
  const table = params.table;
  if (table) requireTable(table);

  if (operation === "insert") {
    const row = clone(params.row);
    assertPrimaryKey(table, row);
    assertCoreConstraints(state, table, row);
    if (state.tables[table].some((current) => samePrimaryKey(table, current, row))) {
      throw new Error(`${table} already exists`);
    }
    state.tables[table].push(row);
    return clone(row);
  }

  if (operation === "select") {
    return state.tables[table].filter((row) => matchesWhere(row, params.where)).map(clone);
  }

  if (operation === "selectOne") {
    return clone(state.tables[table].find((row) => matchesWhere(row, params.where)));
  }

  if (operation === "updateOne") {
    if (APPEND_ONLY_TABLES.has(table)) throw new TypeError(`${table} is append-only`);
    const index = state.tables[table].findIndex((row) => matchesWhere(row, params.where));
    if (index === -1) return undefined;
    const current = state.tables[table][index];
    if (table === "hrx_payroll_rule_versions" && ["published", "retired"].includes(current.approval_state)) {
      throw new TypeError("published payroll rule history is immutable");
    }
    if (table === "hrx_payroll_statement_templates" && ["published", "retired"].includes(current.status)) {
      throw new TypeError("published payroll statement template is immutable");
    }
    if (table === "hrx_payroll_runs" && ["closed", "cancelled"].includes(current.status)) {
      throw new TypeError("closed payroll run is immutable");
    }
    if (table === "hrx_payroll_year_end_cases" && current.state === "reviewed") {
      throw new TypeError("reviewed payroll year-end case is immutable");
    }
    if (CAS_TABLES.has(table) && Number.isInteger(current.state_version)) {
      if (params.expected_version !== current.state_version) {
        const error = new Error(`${table} state_version conflict`);
        error.safe_error_code = "HRX_STATE_VERSION_CONFLICT";
        error.status = 409;
        throw error;
      }
      if (params.patch?.state_version !== current.state_version + 1) {
        throw new TypeError(`${table}.state_version must increment by exactly one`);
      }
    }
    const next = { ...state.tables[table][index], ...clone(params.patch) };
    assertPrimaryKey(table, next);
    assertCoreConstraints(state, table, next);
    state.tables[table][index] = next;
    return clone(next);
  }

  if (operation === "deleteOne") {
    if (APPEND_ONLY_TABLES.has(table)) throw new TypeError(`${table} is append-only`);
    if (["hrx_payroll_rule_versions", "hrx_payroll_statement_templates", "hrx_payroll_runs", "hrx_payroll_year_end_cases"].includes(table)) {
      throw new TypeError(`${table} history cannot be deleted`);
    }
    const index = state.tables[table].findIndex((row) => matchesWhere(row, params.where));
    if (index === -1) return false;
    state.tables[table].splice(index, 1);
    return true;
  }

  throw new TypeError(`unsupported HRX store query operation: ${operation}`);
}

export function createFileHrxStore({ filePath, initialState } = {}) {
  const stateController = createDurableJsonStateController({
    filePath,
    defaultValue: initialState ?? emptyState(),
    normalizeValue: normalizeState,
  });
  let state = stateController.value;
  let revision = 0;
  let closed = false;

  function ensureOpen() {
    if (closed) throw new Error("HRX store is closed");
  }

  function transactionConflict() {
    const error = new Error("HRX transaction conflict");
    error.safe_error_code = "HRX_TRANSACTION_CONFLICT";
    error.status = 409;
    return error;
  }

  function commitDraft(draft, expectedRevision) {
    if (revision !== expectedRevision) throw transactionConflict();
    const previous = state;
    state = normalizeState(draft);
    try {
      assertLeaveStateInvariants(state);
      stateController.commit(state);
      state = stateController.value;
      revision += 1;
    } catch (error) {
      try {
        state = stateController.reload().value;
        error.durable_store_reloaded = true;
      } catch {
        state = previous;
      }
      if (isDurableStoreConflict(error)) {
        error.safe_error_code = "HRX_TRANSACTION_CONFLICT";
        error.status = 409;
      }
      throw error;
    }
  }

  const store = {
    kind: "hrx-file-sql-store",
    version: HRX_STORE_PORT_VERSION,
    capabilities: Object.freeze({
      durable: Boolean(filePath),
      migrations: true,
      transactions: true,
      backup_restore: true,
      tables: TABLES,
    }),

    query(operation, params = {}) {
      ensureOpen();
      if (!MUTATING_OPERATIONS.has(operation)) return executeQuery(state, operation, params);
      const draft = clone(state);
      const result = executeQuery(draft, operation, params);
      const changed = operation === "insert" || result !== undefined && result !== false;
      if (changed) commitDraft(draft, revision);
      return result;
    },

    transaction(callback) {
      ensureOpen();
      if (typeof callback !== "function") throw new TypeError("transaction callback is required");
      const expectedRevision = revision;
      const draft = clone(state);
      const transactionStore = {
        ...store,
        query(operation, params = {}) {
          return executeQuery(draft, operation, params);
        },
        transaction() {
          throw new Error("nested HRX transactions are not supported");
        },
      };
      try {
        const result = callback(transactionStore);
        if (result && typeof result.then === "function") {
          return Promise.resolve(result).then((value) => {
            commitDraft(draft, expectedRevision);
            return value;
          });
        }
        commitDraft(draft, expectedRevision);
        return result;
      } catch (error) {
        throw error;
      }
    },

    migrate(migration) {
      ensureOpen();
      if (!migration || typeof migration.id !== "string" || typeof migration.sql !== "string") {
        throw new TypeError("migration id and sql are required");
      }
      if (state.applied_migrations.some((applied) => applied.id === migration.id)) {
        return { id: migration.id, applied: false };
      }
      const draft = clone(state);
      for (const table of TABLES) {
        if (!Array.isArray(draft.tables[table])) draft.tables[table] = [];
      }
      const applied = {
        id: migration.id,
        hash: hash(migration.sql),
        applied_at: migration.applied_at ?? new Date(0).toISOString(),
      };
      draft.applied_migrations.push(applied);
      commitDraft(draft, revision);
      return { id: migration.id, applied: true, hash: applied.hash };
    },

    snapshot() {
      ensureOpen();
      return clone(state);
    },

    durableGeneration() {
      ensureOpen();
      return stateController.generation;
    },

    restoreSnapshot(snapshot) {
      ensureOpen();
      if (!snapshot || typeof snapshot !== "object") throw new TypeError("HRX store snapshot is required");
      commitDraft(normalizeState(clone(snapshot)), revision);
      return clone(state);
    },

    close() {
      closed = true;
    },
  };

  return store;
}
