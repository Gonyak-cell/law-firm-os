import assert from "node:assert/strict";
import test from "node:test";
import { encryptCompensationAmount, createSqlCompensationRecordStore } from "../src/compensation.js";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollInputSnapshotService, createServerCompensationResolver } from "../src/payroll/input-snapshot-service.js";
import { createPayrollRepository } from "../src/payroll/repository.js";
import { createSqlPayrollTimeInputService } from "../src/payroll-time-input-snapshot.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const NOW = "2026-07-15T01:00:00.000Z";
const KEY = "synthetic-payroll-input-test-key";

function policy(tenantId) {
  return {
    schema_version: "law-firm-os.hrx.company-time-payroll-policy.v0.1",
    manifest_id: `policy_${tenantId}`,
    tenant_id: tenantId,
    environment: "synthetic",
    status: "draft",
    effective_from: "2026-01-01",
    source_document_hash: null,
    standard_work: { timezone: "Asia/Seoul", daily_minutes: 480, rounding_minutes: 1, rounding_mode: "none" },
    leave: { default_expiration_months: 12, allocation_order: "earliest_expiry_then_earned_at" },
    payroll: { frequency: "monthly", cutoff_day: null, pay_day: null, non_business_day_rule: null },
    employment_types: ["full_time", "part_time", "contractor", "intern"],
    provider_ids: { document_delivery: null, bank_transfer: null, tax_filing: null, calendar: null },
    decisions: [
      { decision_id: "COMPANY_STANDARD_WORKDAY", status: "pending_owner", source_ref: null },
      { decision_id: "LEAVE_EXPIRATION", status: "pending_owner", source_ref: null },
      { decision_id: "PAYROLL_CALENDAR", status: "pending_owner", source_ref: null },
      { decision_id: "EMPLOYMENT_TYPES", status: "pending_owner", source_ref: null },
      { decision_id: "PROVIDER_IDENTIFIERS", status: "pending_owner", source_ref: null },
    ],
  };
}

function runtime(tenantId, period = {}) {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  let repositorySequence = 0;
  let serviceSequence = 0;
  const repository = createPayrollRepository({ store, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++repositorySequence}` });
  const context = Object.freeze({ tenant_id: tenantId, actor_id: "payroll-preparer" });
  let payrollPeriod = repository.createPeriod(context, {
    period_id: period.period_id ?? "period-2026-07",
    period_code: period.period_code ?? "2026-07",
    period_start: period.period_start ?? "2026-07-01",
    period_end: period.period_end ?? "2026-07-31",
    cutoff_at: period.cutoff_at ?? "2026-07-31T23:59:59+09:00",
    pay_date: period.pay_date ?? "2026-08-05",
  });
  payrollPeriod = repository.transitionPeriod(context, { period_id: payrollPeriod.period_id, status: "open", expected_version: 1 });
  const run = repository.createRun(context, { run_id: period.run_id ?? "run-2026-07", period_id: payrollPeriod.period_id });
  const compensationResolver = createServerCompensationResolver({ store, keyMaterial: KEY });
  const service = createPayrollInputSnapshotService({
    store,
    payrollRepository: repository,
    compensationResolver,
    policyManifest: policy(tenantId),
    clock: () => NOW,
    idFactory: (prefix) => `${prefix}-${++serviceSequence}`,
  });
  return { store, repository, service, context, period: payrollPeriod, run };
}

function seedPerson(runtimeValue, input = {}) {
  const { store, repository, context, period } = runtimeValue;
  const employeeId = input.employee_id;
  const sql = createSqlHrxRepository({ store, clock: () => NOW });
  sql.createEmployee({ tenant_id: context.tenant_id, employee_id: employeeId, display_name: `Synthetic ${employeeId}`, status: input.employee_status ?? "active" });
  if (input.core_profile !== false) {
    sql.createEmploymentProfile({
      tenant_id: context.tenant_id,
      profile_id: `employment-${employeeId}`,
      employee_id: employeeId,
      employment_type: input.core_type ?? "full_time",
      status: input.lifecycle_status ?? "active",
      effective_from: input.effective_from ?? period.period_start,
      effective_to: input.effective_to ?? null,
      source_ref: `synthetic-employment-${employeeId}`,
    });
  }
  if (input.compensation !== false) {
    const compensationId = `comp-${employeeId}`;
    createSqlCompensationRecordStore({ store }).create({
      tenant_id: context.tenant_id,
      compensation_id: compensationId,
      employee_id: employeeId,
      encrypted_amount_ref: encryptCompensationAmount({
        tenant_id: context.tenant_id,
        employee_id: employeeId,
        compensation_id: compensationId,
        amount_minor: input.amount_krw ?? 5_000_000,
        currency_ref: "KRW",
      }, { keyMaterial: KEY, iv: Buffer.alloc(12, (employeeId.length % 250) + 1) }),
      currency_ref: "KRW",
      effective_from: input.effective_from ?? period.period_start,
      effective_to: input.effective_to ?? null,
      source_ref: `synthetic-compensation-${employeeId}`,
      employment_contract_id: `contract-${employeeId}`,
      contract_document_ref: `vault:contract/${employeeId}`,
    });
    if (input.payroll_profile !== false) {
      repository.createProfile(context, {
        payroll_profile_id: `payroll-${employeeId}`,
        employee_id: employeeId,
        employment_type: input.payroll_type ?? "monthly",
        pay_group_code: input.pay_group_code ?? "KR-MONTHLY",
        currency: "KRW",
        compensation_ref: `compensation:${compensationId}`,
        deduction_input: input.deduction_input ?? {
          dependent_count: 0,
          income_tax_exempt: false,
          pension: { enrolled: false },
          health: { enrolled: false },
          employment_insurance: { enrolled: false },
        },
        effective_from: input.effective_from ?? period.period_start,
        effective_to: input.effective_to ?? null,
      });
    }
  }
  return employeeId;
}

function insertAttendance(store, tenantId, input) {
  return store.query("insert", {
    table: "hrx_attendance_records",
    row: {
      tenant_id: tenantId,
      attendance_id: input.attendance_id,
      employee_id: input.employee_id,
      work_date: input.work_date,
      status: input.status ?? "present",
      source_ref: `synthetic-attendance-${input.attendance_id}`,
      source_kind: "manual",
      import_batch_id: null,
      recorded_hours: input.recorded_hours ?? null,
      clock_in_at: input.clock_in_at ?? null,
      clock_out_at: input.clock_out_at ?? null,
      correction_of_attendance_id: input.correction_of_attendance_id ?? null,
      correction_reason: input.correction_reason ?? null,
      created_at: input.created_at ?? NOW,
      updated_at: input.created_at ?? NOW,
    },
  });
}

function insertOvertime(store, tenantId, input) {
  return store.query("insert", {
    table: "hrx_overtime_requests",
    row: {
      tenant_id: tenantId,
      overtime_id: input.overtime_id,
      employee_id: input.employee_id,
      work_date: input.work_date,
      hours: input.hours,
      reason: input.reason ?? "private synthetic reason",
      state: input.state ?? "approved",
      submitted_at: "2026-07-10T01:00:00.000Z",
      approver_id: input.state === "submitted" ? null : "manager-synthetic",
      decided_at: input.state === "submitted" ? null : "2026-07-10T02:00:00.000Z",
      export_ref: input.state === "exported" ? `artifact:overtime/${input.overtime_id}` : null,
      source_ref: `OvertimeRequest:${input.overtime_id}`,
      payroll_segment_kind: input.payroll_segment_kind ?? "overtime",
      created_at: "2026-07-10T01:00:00.000Z",
      updated_at: "2026-07-10T02:00:00.000Z",
    },
  });
}

test("PY-IN-001/002 captures every payroll profile type while keeping decrypted compensation server-only", () => {
  const value = runtime("tenant-input-types");
  for (const [index, payrollType] of ["monthly", "hourly", "daily", "freelancer"].entries()) {
    seedPerson(value, {
      employee_id: `emp-${payrollType}`,
      payroll_type: payrollType,
      core_type: payrollType === "freelancer" ? "contractor" : "full_time",
      amount_krw: (index + 1) * 1_000_000,
    });
  }
  createSqlHrxRepository({ store: value.store, clock: () => NOW }).createEmployee({ tenant_id: "tenant-other", employee_id: "emp-other", display_name: "Other Tenant", status: "active" });

  const captured = value.service.capture(value.context, { run_id: value.run.run_id, expected_version: 1 });
  assert.equal(captured.ready, true);
  assert.equal(captured.run.status, "snapshot_ready");
  assert.deepEqual(captured.resolved_inputs.map((row) => row.input.payroll_profile.employment_type).sort(), ["daily", "freelancer", "hourly", "monthly"]);
  assert.deepEqual(captured.resolved_inputs.map((row) => row.compensation.amount_krw).sort((a, b) => a - b), [1_000_000, 2_000_000, 3_000_000, 4_000_000]);
  const persisted = JSON.stringify(captured.snapshots);
  assert.doesNotMatch(persisted, /amount_krw|lawos-comp-v1|1000000|2000000|3000000|4000000/);
  assert.doesNotMatch(JSON.stringify(value.repository.listAuditEvents(value.context)), /1000000|2000000|3000000|4000000/);
  assert.throws(() => value.store.query("updateOne", { table: "hrx_compensation_records", where: { tenant_id: value.context.tenant_id, compensation_id: "comp-emp-monthly" }, patch: { currency_ref: "USD" } }), /append-only/);
  value.store.close();
});

test("PY-IN-003 freezes the effective attendance correction at capture cutoff", () => {
  const value = runtime("tenant-input-attendance");
  seedPerson(value, { employee_id: "emp-attendance" });
  insertAttendance(value.store, value.context.tenant_id, { attendance_id: "att-original", employee_id: "emp-attendance", work_date: "2026-07-10", recorded_hours: 8, created_at: "2026-07-10T09:00:00.000Z" });
  insertAttendance(value.store, value.context.tenant_id, { attendance_id: "att-correction", employee_id: "emp-attendance", work_date: "2026-07-10", recorded_hours: 7, correction_of_attendance_id: "att-original", correction_reason: "synthetic correction", created_at: "2026-07-20T09:00:00.000Z" });
  createSqlPayrollTimeInputService({ store: value.store, clock: () => NOW }).recordAttendanceApproval(
    value.context,
    { attendance_id: "att-correction", approval_receipt_id: "approval-correction", approved_at: "2026-07-20T10:00:00.000Z", idempotency_key: "approve:att-correction:v1" },
  );
  const first = value.service.capture(value.context, { run_id: value.run.run_id });
  assert.equal(first.snapshots[0].payable_minutes, 420);

  insertAttendance(value.store, value.context.tenant_id, { attendance_id: "att-after-cutoff", employee_id: "emp-attendance", work_date: "2026-07-10", recorded_hours: 9, correction_of_attendance_id: "att-correction", correction_reason: "late change", created_at: "2026-08-01T09:00:00.000Z" });
  const second = value.service.capture(value.context, { run_id: value.run.run_id, expected_version: 2 });
  assert.equal(second.snapshots[0].payable_minutes, 420);
  assert.equal(second.snapshot_hash, first.snapshot_hash);
  assert.equal(JSON.parse(second.snapshots[0].input_json).attendance.source_count, 1);
  value.store.close();
});

test("PY-IN-004/005 captures only approved overtime segments and reconciles paid, unpaid, and unused leave minutes", () => {
  const value = runtime("tenant-input-time-leave");
  seedPerson(value, { employee_id: "emp-time-leave" });
  insertOvertime(value.store, value.context.tenant_id, { overtime_id: "ot-regular", employee_id: "emp-time-leave", work_date: "2026-07-11", hours: 2, payroll_segment_kind: "overtime" });
  insertOvertime(value.store, value.context.tenant_id, { overtime_id: "ot-night", employee_id: "emp-time-leave", work_date: "2026-07-11", hours: 1, payroll_segment_kind: "night" });
  insertOvertime(value.store, value.context.tenant_id, { overtime_id: "ot-holiday", employee_id: "emp-time-leave", work_date: "2026-07-12", hours: 0.5, payroll_segment_kind: "holiday", state: "exported" });
  insertOvertime(value.store, value.context.tenant_id, { overtime_id: "ot-unapproved", employee_id: "emp-time-leave", work_date: "2026-07-13", hours: 8, state: "submitted" });
  value.store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: value.context.tenant_id, group_id: "group-annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  value.store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: value.context.tenant_id, policy_version_id: "policy-annual-v1", group_id: "group-annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  value.store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: value.context.tenant_id, entitlement_id: "entitlement-annual", employee_id: "emp-time-leave", group_id: "group-annual", policy_version_id: "policy-annual-v1", granted_minutes: 960, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: "synthetic-entitlement", idempotency_key: "entitlement-annual", state_version: 1 } });
  const ledger = createSqlLeaveBalanceLedger({ store: value.store });
  ledger.append({ tenant_id: value.context.tenant_id, entry_id: "leave-earned", employee_id: "emp-time-leave", policy_id: "ANNUAL-2026", group_id: "group-annual", policy_version_id: "policy-annual-v1", entitlement_id: "entitlement-annual", idempotency_key: "leave-earned", entry_type: "earned", amount_minutes: 960, occurred_on: "2026-01-01", source_ref: "synthetic-earned" });
  ledger.append({ tenant_id: value.context.tenant_id, entry_id: "leave-used", employee_id: "emp-time-leave", policy_id: "ANNUAL-2026", group_id: "group-annual", policy_version_id: "policy-annual-v1", entitlement_id: "entitlement-annual", idempotency_key: "leave-used", entry_type: "used", amount_minutes: 120, occurred_on: "2026-07-14", source_ref: "synthetic-used" });
  value.store.query("insert", { table: "hrx_leave_requests", row: { tenant_id: value.context.tenant_id, request_id: "leave-approved", employee_id: "emp-time-leave", policy_id: "ANNUAL-2026", policy_version_id: "policy-annual-v1", leave_type: "annual", amount: 10, start_date: "2026-07-14", end_date: "2026-07-14", state: "approved", submitted_at: "2026-07-10T01:00:00.000Z", approver_id: "manager-synthetic", decided_at: "2026-07-10T02:00:00.000Z", source_ref: "synthetic-leave", paid_minutes: 480, unpaid_minutes: 120, created_at: "2026-07-10T01:00:00.000Z", updated_at: "2026-07-10T02:00:00.000Z" } });

  const captured = value.service.capture(value.context, { run_id: value.run.run_id });
  const input = JSON.parse(captured.snapshots[0].input_json);
  assert.deepEqual(input.overtime, { holiday_minutes: 30, night_minutes: 60, overtime_minutes: 120, source_count: 3 });
  assert.deepEqual([input.leave.paid_minutes, input.leave.unpaid_minutes, input.leave.unused_balance_minutes], [480, 120, 840]);
  assert.deepEqual(input.leave.policy_version_refs, ["policy-annual-v1"]);
  assert.doesNotMatch(captured.snapshots[0].source_refs_json, /private synthetic reason|synthetic-leave/);
  value.store.close();
});

test("PY-IN-006 preserves leap-month and mid-period lifecycle boundaries", () => {
  const value = runtime("tenant-input-lifecycle", { period_id: "period-2024-02", period_code: "2024-02", period_start: "2024-02-01", period_end: "2024-02-29", cutoff_at: "2024-02-29T23:59:59+09:00", pay_date: "2024-03-05", run_id: "run-2024-02" });
  seedPerson(value, { employee_id: "emp-full", effective_from: "2024-02-01", effective_to: "2024-02-29" });
  seedPerson(value, { employee_id: "emp-start", effective_from: "2024-02-10", effective_to: "2024-02-29" });
  seedPerson(value, { employee_id: "emp-mid", effective_from: "2024-02-10", effective_to: "2024-02-20", lifecycle_status: "terminated" });
  const captured = value.service.capture(value.context, { run_id: value.run.run_id });
  const lifecycle = Object.fromEntries(captured.snapshots.map((row) => [row.employee_id, JSON.parse(row.input_json).lifecycle]));
  assert.deepEqual([lifecycle["emp-full"].period_calendar_days, lifecycle["emp-full"].active_calendar_days], [29, 29]);
  assert.deepEqual([lifecycle["emp-start"].active_calendar_days, lifecycle["emp-start"].starts_in_period], [20, true]);
  assert.deepEqual([lifecycle["emp-mid"].active_calendar_days, lifecycle["emp-mid"].ends_in_period], [11, true]);
  value.store.close();
});

test("PY-IN-007 records a missing profile without silently excluding valid employees, then deterministically resumes", () => {
  const value = runtime("tenant-input-issues");
  seedPerson(value, { employee_id: "emp-valid" });
  seedPerson(value, { employee_id: "emp-missing", payroll_profile: false });
  const blocked = value.service.capture(value.context, { run_id: value.run.run_id });
  assert.equal(blocked.ready, false);
  assert.equal(blocked.run.status, "draft");
  assert.deepEqual(blocked.snapshots.map((row) => row.employee_id), ["emp-valid"]);
  assert.equal(blocked.issues.find((row) => row.employee_id === "emp-missing").issue_code, "PAYROLL_PROFILE_MISSING");

  value.repository.createProfile(value.context, { payroll_profile_id: "payroll-emp-missing", employee_id: "emp-missing", employment_type: "monthly", pay_group_code: "KR-MONTHLY", currency: "KRW", compensation_ref: "compensation:comp-emp-missing", deduction_input: { dependent_count: 0, income_tax_exempt: false, pension: { enrolled: false }, health: { enrolled: false }, employment_insurance: { enrolled: false } }, effective_from: value.period.period_start });
  const resumed = value.service.capture(value.context, { run_id: value.run.run_id, expected_version: 1 });
  assert.equal(resumed.ready, true);
  assert.equal(resumed.run.status, "snapshot_ready");
  assert.deepEqual(resumed.snapshots.map((row) => row.employee_id), ["emp-missing", "emp-valid"]);
  assert.equal(resumed.issues.find((row) => row.employee_id === "emp-missing").state, "resolved");
  const repeated = value.service.capture(value.context, { run_id: value.run.run_id, expected_version: 2 });
  assert.equal(repeated.snapshot_hash, resumed.snapshot_hash);
  assert.equal(repeated.snapshots.length, 2);
  value.store.close();
});

test("PY-IN-005 blocks a partial-period legacy leave request when segment evidence is missing", () => {
  const value = runtime("tenant-input-partial-leave");
  seedPerson(value, { employee_id: "emp-partial" });
  value.store.query("insert", { table: "hrx_leave_requests", row: { tenant_id: value.context.tenant_id, request_id: "leave-partial", employee_id: "emp-partial", policy_id: "ANNUAL-2026", leave_type: "annual", amount: 2, start_date: "2026-06-30", end_date: "2026-07-01", state: "approved", submitted_at: "2026-06-20T01:00:00.000Z", approver_id: "manager-synthetic", decided_at: "2026-06-20T02:00:00.000Z", source_ref: "synthetic-partial", paid_minutes: 960, unpaid_minutes: 0, created_at: "2026-06-20T01:00:00.000Z", updated_at: "2026-06-20T02:00:00.000Z" } });
  const captured = value.service.capture(value.context, { run_id: value.run.run_id });
  assert.equal(captured.ready, false);
  assert.equal(captured.snapshots.length, 0);
  assert.equal(captured.issues[0].issue_code, "PAYROLL_LEAVE_SEGMENTS_MISSING");
  value.store.close();
});
