import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { closeOffboardingCase } from "../src/offboarding.js";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createLeaveTerminationService } from "../src/leave/termination-service.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-leave-termination-synthetic";
const NOW = "2026-07-13T01:00:00.000Z";

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function payrollReceipt(store, outboxEventId, patch = {}) {
  const outbox = store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, outbox_event_id: outboxEventId } });
  const payloadHash = createHash("sha256").update(stableStringify(JSON.parse(outbox.payload_json))).digest("hex");
  return {
    schema_version: "law-firm-os.hrx.provider-receipt.v0.1",
    receipt_id: "payroll-receipt-001",
    tenant_id: TENANT,
    provider_kind: "payroll",
    provider_id: "payroll-authority",
    operation: "payroll.termination.reconciliation",
    idempotency_key: `${outbox.idempotency_key}:payroll`,
    payload_hash: `sha256:${payloadHash}`,
    state: "succeeded",
    requested_at: NOW,
    completed_at: NOW,
    provider_receipt_ref: "PayrollProviderReceipt:001",
    error_code: null,
    ...patch,
  };
}

function fixture() {
  const store = createFileHrxStore();
  store.query("insert", { table: "hrx_employees", row: { tenant_id: TENANT, employee_id: "emp-001", display_name: "퇴사 예정자", status: "active" } });
  store.query("insert", { table: "hrx_employment_profiles", row: { tenant_id: TENANT, profile_id: "profile-001", employee_id: "emp-001", employment_type: "full_time", title: "Staff", org_unit_id: "org-people", manager_employee_id: null, effective_from: "2024-01-01", effective_to: null, status: "active", source_ref: "synthetic" } });
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: JSON.stringify({ termination_unused_payout: true }) } });
  store.query("insert", { table: "hrx_leave_types", row: { tenant_id: TENANT, leave_type_id: "annual-type", group_id: "annual", code: "ANNUAL", display_name: "연차", request_unit: "minutes", evidence_rule_json: "{}", status: "active" } });
  store.query("insert", { table: "hrx_work_schedule_profiles", row: { tenant_id: TENANT, schedule_profile_id: "schedule-001", display_name: "표준", timezone: "Asia/Seoul", weekly_schedule_json: "{}", holiday_calendar_ref: null, effective_from: "2026-01-01", effective_to: null, state_version: 1 } });
  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: "entitlement-001", employee_id: "emp-001", group_id: "annual", policy_version_id: "annual-v1", granted_minutes: 960, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: "LeaveAccrualRun:synthetic", idempotency_key: "entitlement-001", state_version: 1 } });
  createSqlLeaveBalanceLedger({ store }).append({ tenant_id: TENANT, entry_id: "earned-001", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "entitlement-001", idempotency_key: "earned-001", entry_type: "earned", amount_minutes: 960, occurred_on: "2026-01-01", source_ref: "LeaveAccrualRun:synthetic" });
  store.transaction((tx) => {
    tx.query("insert", { table: "hrx_leave_requests", row: { tenant_id: TENANT, request_id: "future-001", employee_id: "emp-001", policy_id: "ANNUAL-2026", leave_type: "annual", leave_type_id: "annual-type", policy_version_id: "annual-v1", requested_minutes: 240, timezone: "Asia/Seoul", schedule_snapshot_hash: "schedule-hash", state_version: 1, start_date: "2026-08-03", end_date: "2026-08-03", amount: 4, state: "submitted", submitted_at: NOW, source_ref: "LeaveRequest:future-001" } });
    tx.query("insert", { table: "hrx_leave_request_segments", row: { tenant_id: TENANT, segment_id: "segment-future-001", request_id: "future-001", segment_date: "2026-08-03", scheduled_minutes: 480, requested_minutes: 240, timezone: "Asia/Seoul", schedule_profile_id: "schedule-001", schedule_snapshot_hash: "schedule-hash", work_periods_json: "[]", leave_periods_json: "[]" } });
    tx.query("insert", { table: "hrx_leave_request_allocations", row: { tenant_id: TENANT, allocation_id: "allocation-future-001", request_id: "future-001", entitlement_id: "entitlement-001", allocation_phase: "reserved", allocation_round: 1, amount_minutes: 240 } });
    createSqlLeaveBalanceLedger({ store: tx }).append({ tenant_id: TENANT, entry_id: "reserved-future-001", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "entitlement-001", allocation_id: "allocation-future-001", idempotency_key: "reserved-future-001", entry_type: "reserved", amount_minutes: 240, occurred_on: "2026-07-10", source_ref: "LeaveRequest:future-001" });
  });
  store.query("insert", { table: "hrx_offboarding_cases", row: { tenant_id: TENANT, offboarding_id: "off-001", employee_id: "emp-001", separation_date: "2026-07-31", state: "open", leave_reconciliation_status: "pending", access_revocations: [{ system_ref: "IdP", revoked: true, confirmation_ref: "AccessReceipt:001" }], document_returns: [{ document_ref: "Laptop:001", returned: true }], legal_hold_checks: [{ hold_ref: "LegalHold:none", clear: true }], matter_reassignments: [], handover_items: [] } });
  let sequence = 0;
  const service = createLeaveTerminationService({
    store,
    clock: () => NOW,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    approverAuthorizer: ({ actor_id, required_scope }) => actor_id === "hr-approver" && required_scope === "hrx.leave.termination.settle",
    payrollReceiptAuthorizer: ({ provider_id }) => provider_id === "payroll-authority",
  });
  const context = { tenant_id: TENANT, actor_id: "hr-operator", authorized_employee_ids: ["emp-001"], step_up_verified: true, step_up_purpose: "leave_termination_settlement" };
  return { store, service, context };
}

test("termination preview and execute reconcile future reservations, append the ledger, and gate offboarding until payroll sync", () => {
  const { store, service, context } = fixture();
  const preview = service.preview(context, { employee_id: "emp-001", termination_date: "2026-07-31" });
  assert.equal(preview.state, "previewed");
  assert.equal(preview.result.totals.unused_minutes, 960);
  assert.equal(preview.result.totals.future_request_reversal_minutes, 240);

  assert.throws(
    () => service.approve(context, { preview_reconciliation_id: preview.reconciliation_id }),
    (error) => error.safe_error_code === "HRX_LEAVE_TERMINATION_DUAL_CONTROL_REQUIRED",
  );
  const approval = service.approve({ ...context, actor_id: "hr-approver" }, { preview_reconciliation_id: preview.reconciliation_id });
  assert.equal(approval.approved_by_actor_id, "hr-approver");
  assert.equal(service.approve({ ...context, actor_id: "hr-approver" }, { preview_reconciliation_id: preview.reconciliation_id }).approval_receipt_id, approval.approval_receipt_id);

  assert.throws(
    () => service.execute({ ...context, step_up_verified: false }, { preview_reconciliation_id: preview.reconciliation_id, approval_receipt_id: approval.approval_receipt_id, idempotency_key: "termination-execute-001" }),
    (error) => error.safe_error_code === "HRX_STEP_UP_REQUIRED",
  );
  assert.throws(
    () => service.execute({ ...context, actor_id: "hr-approver" }, { preview_reconciliation_id: preview.reconciliation_id, approval_receipt_id: approval.approval_receipt_id, idempotency_key: "termination-execute-001" }),
    (error) => error.safe_error_code === "HRX_LEAVE_TERMINATION_DUAL_CONTROL_REQUIRED",
  );
  assert.throws(
    () => service.execute({ ...context, authorized_employee_ids: [] }, { preview_reconciliation_id: preview.reconciliation_id, approval_receipt_id: approval.approval_receipt_id, idempotency_key: "termination-execute-out-of-scope" }),
    (error) => error.safe_error_code === "HRX_LEAVE_TERMINATION_SCOPE_DENIED",
  );

  const executed = service.execute(context, { preview_reconciliation_id: preview.reconciliation_id, approval_receipt_id: approval.approval_receipt_id, idempotency_key: "termination-execute-001" });
  assert.equal(executed.state, "approved_pending_sync");
  assert.equal(executed.result.reversed_requests.length, 1);
  assert.equal(store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: TENANT, request_id: "future-001" } }).state, "cancelled");
  assert.equal(createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: TENANT, employee_id: "emp-001", group_id: "annual" }).available_minutes, 0);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "expired" } }).length, 1);
  assert.equal(store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, state: "pending" } }).length, 2);
  assert.equal(store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.request.cancelled" } }).length, 1);

  const pendingOffboarding = store.query("selectOne", { table: "hrx_offboarding_cases", where: { tenant_id: TENANT, offboarding_id: "off-001" } });
  assert.throws(() => closeOffboardingCase(pendingOffboarding), (error) => error.safe_error_code === "HRX_OFFBOARDING_CLOSE_BLOCKED");

  assert.throws(
    () => service.recordPayrollDelivery(context, { outbox_event_id: executed.result.payroll_outbox_event_id, provider_receipt: payrollReceipt(store, executed.result.payroll_outbox_event_id, { provider_id: "synthetic-payroll" }) }),
    (error) => error.safe_error_code === "HRX_LEAVE_TERMINATION_RECEIPT_MISMATCH",
  );
  const synced = service.recordPayrollDelivery(context, { outbox_event_id: executed.result.payroll_outbox_event_id, provider_receipt: payrollReceipt(store, executed.result.payroll_outbox_event_id) });
  assert.equal(synced.state, "approved_and_synced");
  const readyOffboarding = store.query("selectOne", { table: "hrx_offboarding_cases", where: { tenant_id: TENANT, offboarding_id: "off-001" } });
  assert.equal(closeOffboardingCase(readyOffboarding).state, "closed");
  assert.equal(store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, outbox_event_id: executed.result.payroll_outbox_event_id } }).provider_receipt_ref, "PayrollProviderReceipt:001");
});

test("termination execute rejects a stale preview and remains idempotent after success", () => {
  const first = fixture();
  const preview = first.service.preview(first.context, { employee_id: "emp-001", termination_date: "2026-07-31" });
  const approval = first.service.approve({ ...first.context, actor_id: "hr-approver" }, { preview_reconciliation_id: preview.reconciliation_id });
  first.store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: "late-entitlement", employee_id: "emp-001", group_id: "annual", policy_version_id: "annual-v1", granted_minutes: 60, valid_from: "2026-07-20", expires_on: "2026-12-31", source_ref: "LeaveAccrualRun:late", idempotency_key: "late-entitlement", state_version: 1 } });
  createSqlLeaveBalanceLedger({ store: first.store }).append({ tenant_id: TENANT, entry_id: "late-earned", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "late-entitlement", idempotency_key: "late-earned", entry_type: "earned", amount_minutes: 60, occurred_on: "2026-07-20", source_ref: "LeaveAccrualRun:late" });
  assert.throws(
    () => first.service.execute(first.context, { preview_reconciliation_id: preview.reconciliation_id, approval_receipt_id: approval.approval_receipt_id, idempotency_key: "stale-execute" }),
    (error) => error.safe_error_code === "HRX_LEAVE_TERMINATION_PREVIEW_STALE",
  );

  const second = fixture();
  const fresh = second.service.preview(second.context, { employee_id: "emp-001", termination_date: "2026-07-31" });
  const freshApproval = second.service.approve({ ...second.context, actor_id: "hr-approver" }, { preview_reconciliation_id: fresh.reconciliation_id });
  const executed = second.service.execute(second.context, { preview_reconciliation_id: fresh.reconciliation_id, approval_receipt_id: freshApproval.approval_receipt_id, idempotency_key: "replay-execute" });
  const replay = second.service.execute(second.context, { preview_reconciliation_id: fresh.reconciliation_id, approval_receipt_id: freshApproval.approval_receipt_id, idempotency_key: "replay-execute" });
  assert.equal(replay.reconciliation_id, executed.reconciliation_id);
  assert.equal(second.store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "expired" } }).length, 1);
});
