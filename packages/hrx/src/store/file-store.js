import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
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
  hrx_leave_sync_outbox: ["tenant_id", "outbox_event_id"],
  hrx_leave_integration_deliveries: ["tenant_id", "delivery_id"],
  hrx_leave_balance_snapshots: ["tenant_id", "snapshot_id"],
});

const TABLES = Object.freeze([...HRX_DURABLE_CORE_TABLES, ...HRX_DURABLE_WORKFLOW_TABLES]);
const MUTATING_OPERATIONS = new Set(["insert", "updateOne", "deleteOne"]);
const CAS_TABLES = new Set([
  "hrx_leave_groups",
  "hrx_work_schedule_profiles",
  "hrx_leave_entitlements",
  "hrx_leave_accrual_rules",
  "hrx_leave_requests",
  "hrx_approval_requests",
]);

const UNIQUE_CONSTRAINTS = Object.freeze({
  hrx_leave_groups: [["tenant_id", "code"]],
  hrx_leave_types: [["tenant_id", "code"]],
  hrx_leave_policy_versions: [["tenant_id", "policy_code", "version"]],
  hrx_leave_accrual_rules: [["tenant_id", "rule_code"]],
  hrx_leave_entitlements: [["tenant_id", "idempotency_key"]],
  hrx_leave_accrual_runs: [["tenant_id", "idempotency_key"]],
  hrx_approval_requests: [["tenant_id", "object_type", "object_id"]],
  hrx_approval_steps: [["tenant_id", "approval_id", "step_order"]],
  hrx_leave_request_segments: [["tenant_id", "request_id", "segment_date"]],
  hrx_leave_request_allocations: [["tenant_id", "request_id", "entitlement_id", "allocation_phase", "allocation_round"]],
  hrx_leave_command_receipts: [["tenant_id", "idempotency_key"]],
  hrx_leave_request_attachments: [["tenant_id", "request_id", "document_id"]],
  hrx_leave_termination_reconciliations: [["tenant_id", "idempotency_key"]],
  hrx_leave_promotion_campaigns: [["tenant_id", "idempotency_key"]],
  hrx_leave_promotion_recipients: [["tenant_id", "campaign_id", "employee_id"]],
  hrx_leave_sync_outbox: [["tenant_id", "idempotency_key"]],
  hrx_leave_integration_deliveries: [
    ["tenant_id", "outbox_event_id", "provider_kind"],
    ["tenant_id", "idempotency_key"],
  ],
  hrx_leave_balance_snapshots: [["tenant_id", "employee_id", "group_id", "as_of"]],
  hrx_leave_balance_entries: [
    ["tenant_id", "idempotency_key"],
    ["tenant_id", "reverses_entry_id"],
  ],
});

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
    hrx_leave_integration_deliveries: [["hrx_leave_sync_outbox", ["tenant_id", "outbox_event_id"]]],
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
  }
  if (table === "hrx_leave_accrual_rules") {
    for (const field of ["rule_code", "display_name", "rule_json", "effective_from"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") {
        throw new TypeError(`leave accrual rule ${field} is required`);
      }
    }
    if (!["active", "inactive"].includes(row.status)) throw new TypeError("leave accrual rule status must be active or inactive");
  }
  if (table === "hrx_leave_accrual_runs") {
    for (const field of ["period_key", "occurred_on", "source_version", "input_hash", "snapshot_hash", "idempotency_key", "result_json"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") {
        throw new TypeError(`leave accrual run ${field} is required`);
      }
    }
    if (!["preview", "execute"].includes(row.mode)) throw new TypeError("leave accrual run mode must be preview or execute");
  }
  if (table === "hrx_leave_balance_snapshots") {
    if (!Number.isInteger(row.available_minutes)) throw new TypeError("leave balance snapshot available_minutes must be an integer");
    for (const field of ["as_of", "source_version"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave balance snapshot ${field} is required`);
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
    for (const field of ["policy_version_id", "reference_date", "entitlement_period_end", "schedule_profile_id", "legal_schedule_json", "legal_basis_code", "legal_basis_version", "source_version", "calculation_snapshot_hash", "idempotency_key"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave promotion campaign ${field} is required`);
    }
    for (const field of ["threshold_minutes", "standard_day_minutes"]) {
      if (!Number.isInteger(row[field]) || row[field] <= 0) throw new TypeError(`leave promotion campaign ${field} must be a positive integer`);
    }
    if (!Number.isInteger(row.target_count) || row.target_count < 0) throw new TypeError("leave promotion campaign target_count must be a non-negative integer");
  }
  if (table === "hrx_leave_promotion_recipients") {
    for (const field of ["first_notice_deadline_at", "second_notice_deadline_at", "source_version", "state", "first_delivery_state", "second_delivery_state", "compliance_state", "late_reasons_json"]) {
      if (typeof row[field] !== "string" || row[field].trim() === "") throw new TypeError(`leave promotion recipient ${field} is required`);
    }
    for (const field of ["unused_minutes", "standard_day_minutes"]) {
      if (!Number.isInteger(row[field]) || row[field] <= 0) throw new TypeError(`leave promotion recipient ${field} must be a positive integer`);
    }
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
  }
  if (table === "hrx_leave_request_segments") {
    if (!Number.isInteger(row.scheduled_minutes) || !Number.isInteger(row.requested_minutes)) {
      throw new TypeError("leave request segment minutes must be integers");
    }
    if (row.requested_minutes <= 0 || row.requested_minutes > row.scheduled_minutes) {
      throw new TypeError("leave request segment minutes exceed the assigned schedule");
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
    const ref = (row) => row.tenant_id === request.tenant_id && row.request_id === request.request_id;
    const segments = state.tables.hrx_leave_request_segments.filter(ref);
    if (segments.reduce((total, segment) => total + segment.requested_minutes, 0) !== request.requested_minutes) {
      throw new TypeError(`leave request segment minutes do not match request: ${request.request_id}`);
    }

    const allocations = state.tables.hrx_leave_request_allocations.filter(ref);
    const byPhase = (phase) => sumMinutes(allocations.filter((allocation) => allocation.allocation_phase === phase));
    const reserved = byPhase("reserved");
    const released = byPhase("released");
    const used = byPhase("used");
    const netReserved = reserved - released;
    if (released > reserved || netReserved < 0) {
      throw new TypeError(`leave request released allocation exceeds reservation: ${request.request_id}`);
    }
    if (["submitted", "reschedule_pending"].includes(request.state) && (netReserved !== request.requested_minutes || used !== 0)) {
      throw new TypeError(`pending leave request reservation does not match request: ${request.request_id}`);
    }
    if (["approved", "cancel_pending"].includes(request.state)) {
      if (netReserved !== 0 || used !== request.requested_minutes) {
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
    if (table === "hrx_leave_balance_entries") throw new TypeError("leave balance ledger is append-only");
    const index = state.tables[table].findIndex((row) => matchesWhere(row, params.where));
    if (index === -1) return undefined;
    const current = state.tables[table][index];
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
    if (table === "hrx_leave_balance_entries") throw new TypeError("leave balance ledger is append-only");
    const index = state.tables[table].findIndex((row) => matchesWhere(row, params.where));
    if (index === -1) return false;
    state.tables[table].splice(index, 1);
    return true;
  }

  throw new TypeError(`unsupported HRX store query operation: ${operation}`);
}

export function createFileHrxStore({ filePath, initialState } = {}) {
  let state = normalizeState(filePath && existsSync(filePath) ? JSON.parse(readFileSync(filePath, "utf8")) : initialState);
  let revision = 0;
  let closed = false;

  function ensureOpen() {
    if (closed) throw new Error("HRX store is closed");
  }

  function flush() {
    if (!filePath) return;
    mkdirSync(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`);
    renameSync(tempPath, filePath);
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
      flush();
      revision += 1;
    } catch (error) {
      state = previous;
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

    close() {
      if (!closed) flush();
      closed = true;
    },
  };

  return store;
}
