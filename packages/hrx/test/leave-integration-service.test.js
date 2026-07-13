import assert from "node:assert/strict";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createInternalLeaveIntegrationProviders, createLeaveIntegrationService } from "../src/leave/integration-service.js";
import { createDurableLeaveManagementService } from "../src/leave/management-service.js";
import { createLeaveTerminationService } from "../src/leave/termination-service.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-lv07";
const EMPLOYEE = "employee-lv07";
const APPLICANT = "actor-applicant";
const MANAGER = "actor-manager";
const NOW = "2026-07-13T02:00:00.000Z";

function seedLeaveStore() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  createSqlHrxRepository({ store, clock: () => NOW }).createEmployee({ tenant_id: TENANT, employee_id: EMPLOYEE, display_name: "합성 구성원", status: "active" });
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "group-paid", code: "PAID", display_name: "유급 휴가", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_types", row: { tenant_id: TENANT, leave_type_id: "type-annual", group_id: "group-paid", code: "ANNUAL", display_name: "연차", request_unit: "minutes", evidence_rule_json: "{}", status: "active" } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "policy-paid-v1", group_id: "group-paid", policy_code: "PAID-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  store.query("insert", { table: "hrx_work_schedule_profiles", row: { tenant_id: TENANT, schedule_profile_id: "schedule-seoul", display_name: "서울 표준 근무", timezone: "Asia/Seoul", weekly_schedule_json: JSON.stringify({ 1: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 2: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 3: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 4: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 5: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }] }), holiday_calendar_ref: "KR_PUBLIC_HOLIDAYS", effective_from: "2026-01-01", effective_to: null, state_version: 1 } });
  store.query("insert", { table: "hrx_work_schedule_assignments", row: { tenant_id: TENANT, schedule_assignment_id: "schedule-assignment", schedule_profile_id: "schedule-seoul", employee_id: EMPLOYEE, organization_id: null, priority: 100, effective_from: "2026-01-01", effective_to: null } });
  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: "entitlement-paid", employee_id: EMPLOYEE, group_id: "group-paid", policy_version_id: "policy-paid-v1", granted_minutes: 960, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: "LeaveAccrualRun:LV07", idempotency_key: "entitlement-paid", state_version: 1 } });
  createSqlLeaveBalanceLedger({ store }).append({ tenant_id: TENANT, entry_id: "earned-paid", employee_id: EMPLOYEE, policy_id: "PAID-2026", group_id: "group-paid", policy_version_id: "policy-paid-v1", entitlement_id: "entitlement-paid", idempotency_key: "earned-paid", entry_type: "earned", amount_minutes: 960, occurred_on: "2026-01-01", source_ref: "LeaveAccrualRun:LV07" });
  return store;
}

function sequentialIds() {
  let value = 0;
  return (prefix) => `${prefix}_${++value}`;
}

async function approvedRequest(store, { requestId = "leave-lv07", reason = "비공개 사유", leaveTypeId = "type-annual", requestedMinutes = 240, startDate = "2026-07-14" } = {}) {
  const management = createDurableLeaveManagementService({
    store,
    clock: () => NOW,
    idFactory: sequentialIds(),
    approverResolver: () => ({ actor_id: MANAGER, source_assignment_version: "manager-assignment-v1", valid_from: "2026-01-01T00:00:00.000Z" }),
  });
  await management.submit({ tenant_id: TENANT, actor_id: APPLICANT }, {
    idempotency_key: `${requestId}:submit`,
    request_id: requestId,
    employee_id: EMPLOYEE,
    leave_type_id: leaveTypeId,
    policy_version_id: "policy-paid-v1",
    requested_minutes: requestedMinutes,
    start_date: startDate,
    end_date: startDate,
    reason_text: reason,
  });
  await management.approve({ tenant_id: TENANT, actor_id: MANAGER }, {
    idempotency_key: `${requestId}:approve`,
    request_id: requestId,
    applicant_actor_ids: [APPLICANT],
  });
  return management;
}

test("LV-07 retries use one schedule identity while the approved ledger stays committed", async () => {
  const store = seedLeaveStore();
  const internal = createInternalLeaveIntegrationProviders();
  const scheduleObjects = new Set();
  const scheduleKeys = [];
  let scheduleAttempts = 0;
  const providers = {
    ...internal,
    schedule: {
      mode: "synthetic_schedule",
      async deliver(input) {
        scheduleAttempts += 1;
        scheduleKeys.push(input.idempotency_key);
        scheduleObjects.add(input.payload.schedule_object_ref);
        if (scheduleAttempts === 1) {
          const error = new Error("redacted synthetic provider failure");
          error.safe_error_code = "SCHEDULE_TEMPORARY_FAILURE";
          throw error;
        }
        return { provider_receipt_ref: `SyntheticSchedule:${input.payload.schedule_object_ref}` };
      },
    },
  };
  const integration = createLeaveIntegrationService({ store, providers, clock: () => NOW, retryDelayMs: 0, idFactory: sequentialIds() });
  const management = await approvedRequest(store);
  const context = { tenant_id: TENANT, actor_id: "integration-worker" };

  const first = await integration.process(context, { limit: 20 });
  assert.equal(first.processed_count, 2);
  const approvedOutbox = store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.request.approved" } });
  assert.equal(approvedOutbox.state, "pending_sync");
  assert.equal(approvedOutbox.last_error_code, "SCHEDULE_TEMPORARY_FAILURE");
  assert.equal(store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: TENANT, request_id: "leave-lv07" } }).state, "approved");
  assert.equal(createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: TENANT, employee_id: EMPLOYEE, group_id: "group-paid" }).available_minutes, 720);

  const second = await integration.process(context, { limit: 20 });
  assert.equal(second.processed_count, 1);
  assert.equal(store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.request.approved" } }).state, "delivered");
  assert.equal(scheduleObjects.size, 1);
  assert.equal(scheduleKeys[0], scheduleKeys[1]);

  const approvedDeliveries = store.query("select", { table: "hrx_leave_integration_deliveries", where: { tenant_id: TENANT, outbox_event_id: approvedOutbox.outbox_event_id } });
  assert.equal(approvedDeliveries.length, 4);
  const schedulePayload = JSON.parse(approvedDeliveries.find((row) => row.provider_kind === "schedule").payload_json);
  assert.equal(schedulePayload.public_title, "휴가");
  assert.equal(schedulePayload.coworker_visibility, "title_only");
  assert.equal(schedulePayload.reason_included, false);
  const attendancePayload = JSON.parse(approvedDeliveries.find((row) => row.provider_kind === "attendance").payload_json);
  assert.deepEqual(attendancePayload.days[0], { work_date: "2026-07-14", scheduled_minutes: 480, leave_minutes: 240, remaining_work_minutes: 240, unexcused_absence_minutes: 0, absence_judgment: "approved_leave_excluded" });
  const payrollPayload = JSON.parse(approvedDeliveries.find((row) => row.provider_kind === "payroll").payload_json);
  assert.equal(payrollPayload.paid_minutes, 240);
  assert.equal(payrollPayload.unpaid_minutes, 0);
  const notificationRows = store.query("select", { table: "hrx_leave_integration_deliveries", where: { tenant_id: TENANT, provider_kind: "notification" } });
  assert.doesNotMatch(JSON.stringify(notificationRows), /비공개 사유|합성 구성원|reason_text|employee_id/);
  assert.doesNotMatch(JSON.stringify(store.query("select", { table: "hrx_audit_events", where: { tenant_id: TENANT } })), /비공개 사유|합성 구성원/);

  await management.closeSubmitted({ tenant_id: TENANT, actor_id: APPLICANT }, {
    idempotency_key: "leave-lv07:cancel-approved",
    request_id: "leave-lv07",
    state: "cancelled",
    applicant_actor_ids: [APPLICANT],
  });
  await integration.process(context, { limit: 20 });
  assert.equal(store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: TENANT, request_id: "leave-lv07" } }).state, "cancelled_after_approval");
  assert.equal(createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: TENANT, employee_id: EMPLOYEE, group_id: "group-paid" }).available_minutes, 960);
  const cancelOutbox = store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.request.cancelled_after_approval" } });
  const cancelSchedule = store.query("selectOne", { table: "hrx_leave_integration_deliveries", where: { tenant_id: TENANT, outbox_event_id: cancelOutbox.outbox_event_id, provider_kind: "schedule" } });
  assert.equal(JSON.parse(cancelSchedule.payload_json).operation, "cancel");
  assert.equal(scheduleObjects.size, 1);
  store.close();
});

test("LV-07 keeps an unconfigured provider in pending_sync instead of reporting success", async () => {
  const store = seedLeaveStore();
  const internal = createInternalLeaveIntegrationProviders();
  const integration = createLeaveIntegrationService({
    store,
    providers: { attendance: internal.attendance, payroll: internal.payroll, notification: internal.notification },
    clock: () => NOW,
    retryDelayMs: 0,
    idFactory: sequentialIds(),
  });
  await approvedRequest(store, { requestId: "leave-unconfigured" });
  await integration.process({ tenant_id: TENANT, actor_id: "integration-worker" }, { limit: 20 });
  const outbox = store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.request.approved" } });
  const schedule = store.query("selectOne", { table: "hrx_leave_integration_deliveries", where: { tenant_id: TENANT, outbox_event_id: outbox.outbox_event_id, provider_kind: "schedule" } });
  assert.equal(schedule.state, "not_configured");
  assert.equal(schedule.provider_receipt_ref, null);
  assert.equal(outbox.state, "pending_sync");
  assert.equal(integration.list({ tenant_id: TENANT }).summary.not_configured, 1);
  store.close();
});

test("LV-07 payroll boundary partitions unpaid leave without calculating compensation", async () => {
  const store = seedLeaveStore();
  store.query("insert", { table: "hrx_leave_types", row: { tenant_id: TENANT, leave_type_id: "type-unpaid", group_id: "group-paid", code: "UNPAID", display_name: "무급휴가", request_unit: "minutes", evidence_rule_json: JSON.stringify({ pay_status: "unpaid" }), status: "active" } });
  const integration = createLeaveIntegrationService({ store, providers: createInternalLeaveIntegrationProviders(), clock: () => NOW, retryDelayMs: 0, idFactory: sequentialIds() });
  await approvedRequest(store, { requestId: "leave-unpaid", leaveTypeId: "type-unpaid", requestedMinutes: 60, startDate: "2026-07-15" });
  await integration.process({ tenant_id: TENANT, actor_id: "integration-worker" }, { limit: 20 });
  const approvedOutbox = store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, event_type: "leave.request.approved" } });
  const payroll = store.query("selectOne", { table: "hrx_leave_integration_deliveries", where: { tenant_id: TENANT, outbox_event_id: approvedOutbox.outbox_event_id, provider_kind: "payroll" } });
  const payload = JSON.parse(payroll.payload_json);
  assert.equal(payload.paid_minutes, 0);
  assert.equal(payload.unpaid_minutes, 60);
  assert.equal(payload.raw_compensation_amount_included, false);
  assert.equal(payload.payroll_rate_calculated, false);
  store.close();
});

test("LV-07 termination payroll retry keeps the offboarding gate consistent after partial failure", async () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  createSqlHrxRepository({ store, clock: () => NOW }).createEmployee({ tenant_id: TENANT, employee_id: EMPLOYEE, display_name: "합성 구성원", status: "active" });
  store.query("insert", { table: "hrx_offboarding_cases", row: { tenant_id: TENANT, offboarding_id: "offboarding-lv07", employee_id: EMPLOYEE, separation_date: "2026-07-31", state: "open", leave_reconciliation_status: "approved_pending_sync" } });
  store.query("insert", { table: "hrx_leave_termination_reconciliations", row: { tenant_id: TENANT, reconciliation_id: "reconciliation-lv07", employee_id: EMPLOYEE, termination_date: "2026-07-31", mode: "execute", source_version: "source-lv07", snapshot_hash: "snapshot-lv07", preview_reconciliation_id: "preview-lv07", state: "approved_pending_sync", result_json: JSON.stringify({ offboarding_id: "offboarding-lv07", sync_state: "pending" }), idempotency_key: "reconciliation-lv07", created_at: NOW, approved_at: NOW, approved_by_actor_id: "hr-approver", executed_by_actor_id: "hr-operator", completed_at: null } });
  store.query("insert", { table: "hrx_leave_sync_outbox", row: { tenant_id: TENANT, outbox_event_id: "termination-outbox-lv07", aggregate_type: "LeaveTerminationReconciliation", aggregate_id: "preview-lv07", event_type: "leave.termination.payroll_reconciliation_requested", payload_json: JSON.stringify({ employee_id: EMPLOYEE, termination_date: "2026-07-31", totals: { unused_minutes: 480 }, groups: [], raw_compensation_amount_included: false }), idempotency_key: "termination-outbox-lv07", state: "pending", attempt_count: 0, available_at: NOW, delivered_at: null, provider_receipt_ref: null, created_at: NOW } });
  const termination = createLeaveTerminationService({ store, clock: () => NOW, idFactory: sequentialIds(), approverAuthorizer: () => true });
  const providerObjects = new Set();
  let attempts = 0;
  const integration = createLeaveIntegrationService({
    store,
    providers: { payroll: { mode: "synthetic_payroll", async deliver(input) {
      attempts += 1;
      providerObjects.add(input.idempotency_key);
      if (attempts === 1) {
        const error = new Error("redacted synthetic provider failure");
        error.safe_error_code = "PAYROLL_TEMPORARY_FAILURE";
        throw error;
      }
      return { provider_receipt_ref: "SyntheticPayrollReceipt:LV07" };
    } } },
    terminationDeliveryRecorder: (context, input) => termination.recordPayrollDelivery(context, input),
    clock: () => NOW,
    retryDelayMs: 0,
    idFactory: sequentialIds(),
  });
  const context = { tenant_id: TENANT, actor_id: "integration-worker" };

  await integration.process(context);
  assert.equal(store.query("selectOne", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: TENANT, reconciliation_id: "reconciliation-lv07" } }).state, "approved_pending_sync");
  assert.equal(store.query("selectOne", { table: "hrx_offboarding_cases", where: { tenant_id: TENANT, offboarding_id: "offboarding-lv07" } }).leave_reconciliation_status, "approved_pending_sync");
  assert.equal(store.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, outbox_event_id: "termination-outbox-lv07" } }).state, "pending_sync");

  await integration.process(context);
  assert.equal(store.query("selectOne", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: TENANT, reconciliation_id: "reconciliation-lv07" } }).state, "approved_and_synced");
  assert.equal(store.query("selectOne", { table: "hrx_offboarding_cases", where: { tenant_id: TENANT, offboarding_id: "offboarding-lv07" } }).leave_reconciliation_status, "approved_and_synced");
  assert.equal(providerObjects.size, 1);
  assert.equal((await integration.process(context)).processed_count, 0);
  assert.equal(termination.recordPayrollDelivery(context, { outbox_event_id: "termination-outbox-lv07", provider_receipt_ref: "SyntheticPayrollReceipt:LV07" }).state, "approved_and_synced");
  store.close();
});
