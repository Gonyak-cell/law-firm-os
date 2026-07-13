import assert from "node:assert/strict";
import test from "node:test";
import { createFileHrxStore } from "../src/store/file-store.js";
import { createLeaveAccrualService, parseLeaveManualAdjustmentCsv } from "../src/leave/accrual-service.js";

const TENANT = "tenant_leave_accrual_synthetic";
const OCCURRED_ON = "2026-07-13";

function seedStore(employeeIds) {
  const store = createFileHrxStore();
  for (const employeeId of employeeIds) {
    store.query("insert", { table: "hrx_employees", row: { tenant_id: TENANT, employee_id: employeeId, display_name: employeeId, status: employeeId === "leave" ? "on_leave" : "active" } });
  }
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  store.query("insert", { table: "hrx_documents", row: { tenant_id: TENANT, document_id: "manual-proof", employee_id: "under-one-year", document_type: "leave_adjustment_evidence", source_ref: "synthetic://manual-proof", source_status: "verified", document_body_included: false, title: "합성 조정 근거" } });
  return store;
}

function sourceRows() {
  const base = { employee_status: "active", profile_status: "active", weekly_work_ratio: 1, source_errors: [], perfect_attendance_periods: ["2026-06"] };
  return [
    { ...base, employee_id: "under-one-year", display_name: "1년 미만", hire_date: "2025-09-13", service_months: 10, years_of_service: 0, yearly_attendance_rate: 1, full_months_without_absence: 10 },
    { ...base, employee_id: "below-eighty", display_name: "출근율 80% 미만", hire_date: "2024-07-13", service_months: 24, years_of_service: 2, yearly_attendance_rate: 0.79, full_months_without_absence: 11 },
    { ...base, employee_id: "seniority", display_name: "근속 가산", hire_date: "2020-07-13", service_months: 72, years_of_service: 6, yearly_attendance_rate: 1, full_months_without_absence: 11 },
    { ...base, employee_id: "cap", display_name: "상한", hire_date: "1996-07-13", service_months: 360, years_of_service: 30, yearly_attendance_rate: 1, full_months_without_absence: 11 },
    { ...base, employee_id: "leave", display_name: "휴직", employee_status: "on_leave", profile_status: "on_leave", hire_date: "2022-07-13", service_months: 48, years_of_service: 4, yearly_attendance_rate: 1, full_months_without_absence: 11 },
    { ...base, employee_id: "reduced", display_name: "단축근로", hire_date: "2024-07-13", service_months: 24, years_of_service: 2, yearly_attendance_rate: 1, full_months_without_absence: 11, weekly_work_ratio: 0.5 },
    { ...base, employee_id: "invalid-source", display_name: "원천 오류", hire_date: "2024-07-13", service_months: 24, years_of_service: 2, yearly_attendance_rate: 1, full_months_without_absence: 11, weekly_work_ratio: 0, source_errors: ["work_schedule_missing"] },
  ];
}

function createFixture() {
  const employees = sourceRows().map((row) => row.employee_id);
  const store = seedStore(employees);
  let sourceVersion = "source-v1";
  let sequence = 0;
  const service = createLeaveAccrualService({
    store,
    clock: () => "2026-07-13T01:00:00.000Z",
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    sourceProvider: { snapshot: () => ({ source_version: sourceVersion, rows: sourceRows() }) },
    approverAuthorizer: ({ actor_id, required_scope }) => actor_id === "hr-approver" && required_scope === "hrx.leave.ledger.adjust",
  });
  const context = { tenant_id: TENANT, actor_id: "hr-operator", step_up_verified: true };
  const rule = service.createRule(context, {
    accrual_rule_id: "annual-rule",
    rule_code: "ANNUAL_STATUTORY",
    display_name: "법정 연차",
    policy_version_id: "annual-v1",
    effective_from: "2026-01-01",
    rule: { basis: "korean_statutory_annual", schedule: "fixed_annual_date", annual_date: "07-13", minutes_per_day: 480, expiration_months: 12 },
  });
  return { store, service, context, rule, setSourceVersion: (value) => { sourceVersion = value; } };
}

test("automatic accrual previews statutory boundaries and executes once", () => {
  const { store, service, context, rule } = createFixture();
  const preview = service.preview(context, { accrual_rule_id: rule.accrual_rule_id, period_key: "2026-annual", occurred_on: OCCURRED_ON });
  const byEmployee = Object.fromEntries(preview.result.rows.map((row) => [row.employee_id, row]));

  assert.equal(byEmployee["under-one-year"].amount_minutes, 10 * 480);
  assert.equal(byEmployee["below-eighty"].amount_minutes, 11 * 480);
  assert.equal(byEmployee.seniority.amount_minutes, 17 * 480);
  assert.equal(byEmployee.cap.amount_minutes, 25 * 480);
  assert.equal(byEmployee.leave.reason_code, "leave_of_absence");
  assert.equal(byEmployee.reduced.amount_minutes, 15 * 480 * 0.5);
  assert.equal(byEmployee["invalid-source"].status, "error");
  assert.equal(byEmployee["under-one-year"].expires_on, "2027-07-13");

  const first = service.execute(context, { preview_run_id: preview.accrual_run_id });
  assert.equal(first.result.counts.created, 5);
  assert.equal(first.result.counts.new_entries, 5);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, 5);

  const rerun = service.execute(context, { preview_run_id: preview.accrual_run_id });
  assert.equal(rerun.replayed, true);
  assert.equal(rerun.result.counts.created, 0);
  assert.equal(rerun.result.counts.new_entries, 0);
  assert.equal(rerun.result.counts.duplicates, 5);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, 5);
});

test("automatic accrual rejects execution after source version changes", () => {
  const { service, context, rule, setSourceVersion } = createFixture();
  const preview = service.preview(context, { accrual_rule_id: rule.accrual_rule_id, period_key: "2026-stale", occurred_on: OCCURRED_ON });
  setSourceVersion("source-v2");
  assert.throws(
    () => service.execute(context, { preview_run_id: preview.accrual_run_id }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_PREVIEW_STALE",
  );
});

test("automatic accrual execute requires fresh step-up", () => {
  const { service, context, rule } = createFixture();
  const preview = service.preview(context, { accrual_rule_id: rule.accrual_rule_id, period_key: "2026-step-up", occurred_on: OCCURRED_ON });
  assert.throws(
    () => service.execute({ ...context, step_up_verified: false }, { preview_run_id: preview.accrual_run_id }),
    (error) => error.safe_error_code === "HRX_STEP_UP_REQUIRED" && error.status === 403,
  );
});

test("manual adjustment keeps row errors visible and enforces dual control", () => {
  const { store, service, context } = createFixture();
  const rows = [
    { employee_id: "under-one-year", group_id: "annual", policy_version_id: "annual-v1", direction: "credit", amount_minutes: 480, occurred_on: OCCURRED_ON, expires_on: "2027-07-13", reason: "합성 정정", source_document_id: "manual-proof" },
    { employee_id: "missing", group_id: "annual", policy_version_id: "annual-v1", direction: "credit", amount_minutes: 480, occurred_on: OCCURRED_ON, reason: "합성 오류", source_document_id: "manual-proof" },
  ];
  const preview = service.previewManual(context, { rows });
  assert.deepEqual(preview.counts, { ready: 1, errors: 1 });
  assert.equal(Object.hasOwn(preview.rows[0], "reason"), false);
  assert.equal(Object.hasOwn(preview.rows[0], "source_document_id"), false);

  assert.throws(
    () => service.executeManual(context, { rows, approved_by_actor_id: "hr-operator", idempotency_key: "manual-1" }),
    (error) => error.safe_error_code === "HRX_LEAVE_MANUAL_DUAL_CONTROL_REQUIRED",
  );
  const result = service.executeManual(context, { rows, approved_by_actor_id: "hr-approver", idempotency_key: "manual-1" });
  assert.deepEqual(result.counts, { created: 1, errors: 1 });
  const entry = store.query("selectOne", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, idempotency_key: "manual-1:1:credit" } });
  assert.equal(entry.adjustment_direction, "credit");
  assert.equal(entry.amount_minutes, 480);
});

test("manual adjustment CSV parser supports quoted reasons", () => {
  const rows = parseLeaveManualAdjustmentCsv([
    "employee_id,group_id,policy_version_id,direction,amount_minutes,occurred_on,expires_on,reason,source_document_id",
    'under-one-year,annual,annual-v1,credit,480,2026-07-13,2027-07-13,"정정, 확인",manual-proof',
  ].join("\n"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount_minutes, 480);
  assert.equal(rows[0].reason, "정정, 확인");
});
