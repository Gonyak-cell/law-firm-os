import assert from "node:assert/strict";
import test from "node:test";
import { createFileHrxStore } from "../src/store/file-store.js";
import {
  createLeaveAccrualService,
  createLeaveOccurrenceUploadTemplate,
  LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION,
  parseLeaveManualAdjustmentCsv,
} from "../src/leave/accrual-service.js";
import { createLeaveReportingService } from "../src/leave/reporting-service.js";

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

test("accrual rule versions preserve logical lineage and run as-of date", () => {
  const { store, service, context, rule } = createFixture();
  const next = service.createRule(context, {
    accrual_rule_id: "annual-rule-v2",
    rule_code: "ANNUAL_STATUTORY_V2",
    logical_rule_code: rule.logical_rule_code,
    version: 2,
    supersedes_rule_id: rule.accrual_rule_id,
    display_name: "법정 연차 v2",
    policy_version_id: "annual-v1",
    effective_from: "2027-01-01",
    rule: { basis: "korean_statutory_annual", schedule: "fixed_annual_date", annual_date: "07-13", minutes_per_day: 480, expiration_months: 12 },
  });
  assert.deepEqual(
    [rule.logical_rule_code, rule.version, next.logical_rule_code, next.version, next.supersedes_rule_id],
    ["ANNUAL_STATUTORY", 1, "ANNUAL_STATUTORY", 2, "annual-rule"],
  );
  const preview = service.preview(context, {
    accrual_rule_id: rule.accrual_rule_id,
    period_key: "2026-as-of",
    occurred_on: OCCURRED_ON,
    as_of_date: "2026-07-12",
  });
  assert.equal(store.query("selectOne", {
    table: "hrx_leave_accrual_runs",
    where: { tenant_id: TENANT, accrual_run_id: preview.accrual_run_id },
  }).as_of_date, "2026-07-12");
  assert.throws(
    () => service.createRule(context, {
      accrual_rule_id: "annual-rule-v4",
      rule_code: "ANNUAL_STATUTORY_V4",
      logical_rule_code: rule.logical_rule_code,
      version: 4,
      supersedes_rule_id: rule.accrual_rule_id,
      display_name: "잘못된 버전",
      policy_version_id: "annual-v1",
      effective_from: "2028-01-01",
      rule: { basis: "fixed_amount", schedule: "fixed_annual_date", annual_date: "07-13", amount_minutes: 480 },
    }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_RULE_VERSION_INVALID",
  );
  store.close();
});

test("RC-005-B tenure rules cover monthly and annual service bands through ten years", () => {
  const { store, service, context, rule } = createFixture();
  const next = service.updateRule(context, rule.accrual_rule_id, {
    accrual_rule_id: "annual-rule-v2",
    rule_code: "ANNUAL_STATUTORY_V2",
    display_name: "근속 구간 연차",
    effective_from: "2026-01-01",
    rule: {
      basis: "tenure_table",
      schedule: "fixed_annual_date",
      annual_date: "07-13",
      validity_months: 18,
      tenure_steps: [
        { from_month: 0, to_month: 11, amount_minutes: 480 },
        { from_month: 12, to_month: 119, amount_minutes: 7_200 },
        { from_month: 120, to_month: 120, amount_minutes: 7_680 },
      ],
      monthly_schedule: [{ service_month: 10, amount_minutes: 960 }],
      annual_schedule: [{ service_year: 6, amount_minutes: 8_160 }, { service_year: 10, amount_minutes: 8_640 }],
    },
  });
  assert.equal(next.version, 2);
  assert.equal(next.supersedes_rule_id, rule.accrual_rule_id);

  const preview = service.preview(context, {
    accrual_rule_id: next.accrual_rule_id,
    period_key: "2027-tenure",
    occurred_on: OCCURRED_ON,
    as_of_date: "2026-07-13",
  });
  const byEmployee = Object.fromEntries(preview.result.rows.map((row) => [row.employee_id, row]));
  assert.equal(byEmployee["under-one-year"].amount_minutes, 960);
  assert.equal(byEmployee.seniority.amount_minutes, 8_160);
  assert.equal(byEmployee["under-one-year"].expires_on, "2028-01-13");
  assert.equal(service.preview(context, {
    accrual_rule_id: next.accrual_rule_id,
    period_key: "2027-tenure",
    occurred_on: OCCURRED_ON,
    as_of_date: "2026-07-13",
  }).accrual_run_id, preview.accrual_run_id);
  assert.notEqual(service.preview(context, {
    accrual_rule_id: next.accrual_rule_id,
    period_key: "2027-tenure",
    occurred_on: OCCURRED_ON,
    as_of_date: "2026-07-14",
  }).accrual_run_id, preview.accrual_run_id);

  assert.throws(
    () => service.createRule(context, {
      accrual_rule_id: "annual-rule-v2-duplicate",
      rule_code: "ANNUAL_STATUTORY_DUPLICATE",
      logical_rule_code: rule.logical_rule_code,
      version: 2,
      supersedes_rule_id: rule.accrual_rule_id,
      display_name: "중복 버전",
      policy_version_id: "annual-v1",
      effective_from: "2027-01-01",
      rule: { basis: "fixed_amount", schedule: "fixed_annual_date", annual_date: "07-13", amount_minutes: 480 },
    }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_RULE_VERSION_EXISTS",
  );

  const deactivated = service.deactivateRule(context, next.accrual_rule_id, {
    expected_version: next.state_version,
    effective_to: "2027-12-31",
  });
  assert.equal(deactivated.status, "inactive");
  assert.equal(deactivated.state_version, 2);
  assert.equal(store.query("selectOne", { table: "hrx_leave_accrual_rules", where: { tenant_id: TENANT, accrual_rule_id: rule.accrual_rule_id } }).status, "active");
  store.close();
});

test("automatic accrual rejects execution after source version changes", () => {
  const { service, context, rule, setSourceVersion } = createFixture();
  const preview = service.preview(context, { accrual_rule_id: rule.accrual_rule_id, period_key: "2026-stale", occurred_on: OCCURRED_ON });
  assert.equal(service.validatePreview(context, { preview_run_id: preview.accrual_run_id }).is_current, true);
  setSourceVersion("source-v2");
  const validation = service.validatePreview(context, { preview_run_id: preview.accrual_run_id });
  assert.equal(validation.is_current, false);
  assert.notEqual(validation.preview_snapshot_hash, validation.current_snapshot_hash);
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
  assert.deepEqual(preview.counts, { ready: 1, errors: 1, duplicates: 0 });
  assert.equal(Object.hasOwn(preview.rows[0], "reason"), false);
  assert.equal(Object.hasOwn(preview.rows[0], "source_document_id"), false);

  const approval = service.approveManual({ ...context, actor_id: "hr-approver" }, { rows });
  assert.throws(
    () => service.executeManual({ ...context, actor_id: "hr-approver" }, { rows, approval_receipt_id: approval.approval_receipt_id, idempotency_key: "manual-1" }),
    (error) => error.safe_error_code === "HRX_LEAVE_MANUAL_DUAL_CONTROL_REQUIRED",
  );
  const result = service.executeManual(context, { rows, approval_receipt_id: approval.approval_receipt_id, idempotency_key: "manual-1" });
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

test("LV-OCC-005 versioned upload template has no example rows and roundtrips through the parser", () => {
  const template = createLeaveOccurrenceUploadTemplate();
  const csv = Buffer.from(template.content_base64, "base64").toString("utf8");
  assert.equal(template.template_version, LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION);
  assert.equal(template.row_count, 0);
  assert.deepEqual(parseLeaveManualAdjustmentCsv(csv), []);
  assert.equal(csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/).length, 2);
  assert.deepEqual(template.columns.find((column) => column.name === "direction").values, ["credit", "debit"]);
  assert.equal(template.columns.find((column) => column.name === "amount_minutes").unit, "minute");

  const populated = `${csv}under-one-year,annual,annual-v1,credit,480,2026-08-01,2027-07-31,"예정, 발생",manual-proof\r\n`;
  const rows = parseLeaveManualAdjustmentCsv(populated);
  assert.equal(rows[0].amount_minutes, 480);
  assert.equal(rows[0].valid_from, "2026-08-01");
  assert.equal(rows[0].memo, "예정, 발생");
  assert.throws(
    () => parseLeaveManualAdjustmentCsv(csv.replace(LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION, "unsupported-v2")),
    (error) => error.safe_error_code === "HRX_LEAVE_OCCURRENCE_TEMPLATE_VERSION_UNSUPPORTED",
  );
});

test("LV-OCC-006 upload preview hashes the file, rejects duplicate and invalid rows, and writes nothing", () => {
  const { store, service, context } = createFixture();
  const before = store.snapshot();
  const template = Buffer.from(createLeaveOccurrenceUploadTemplate().content_base64, "base64").toString("utf8");
  const csv = `${template}under-one-year,annual,annual-v1,credit,480,2026-08-01,2027-07-31,예약 발생,manual-proof\r\nunder-one-year,annual,annual-v1,credit,480,2026-08-01,2027-07-31,예약 발생,manual-proof\r\nmissing,annual,annual-v1,credit,60,2026-08-02,2027-08-01,대상 오류,manual-proof\r\n`;
  const preview = service.previewManual(context, { csv_text: csv, schedule_only: true, as_of: "2026-07-13" });
  assert.match(preview.file_hash, /^[a-f0-9]{64}$/);
  assert.equal(preview.template_version, LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION);
  assert.deepEqual(preview.counts, { ready: 1, errors: 2, duplicates: 1 });
  assert.equal(preview.rows[1].error_code, "HRX_LEAVE_OCCURRENCE_DUPLICATE_ROW");
  assert.equal(preview.rows[1].duplicate_of_row_number, 1);
  assert.equal(preview.rows[2].error_code, "HRX_LEAVE_MANUAL_ROW_INVALID");
  assert.equal(Object.hasOwn(preview.rows[0], "reason"), false);
  assert.equal(Object.hasOwn(preview.rows[0], "source_document_id"), false);
  assert.deepEqual(store.snapshot(), before);
});

test("LV-OCC-003 creates a dual-approved future occurrence without activating its balance", () => {
  const { store, service, context } = createFixture();
  const rows = [
    { employee_id: "under-one-year", group_id: "annual", policy_version_id: "annual-v1", direction: "credit", amount_minutes: 480, valid_from: "2026-08-01", expires_on: "2027-07-31", memo: "승인된 예정 발생", source_document_id: "manual-proof" },
    { employee_id: "under-one-year", group_id: "annual", policy_version_id: "annual-v1", direction: "credit", amount_minutes: 60, valid_from: "2026-07-13", memo: "과거 발생", source_document_id: "manual-proof" },
    { employee_id: "under-one-year", group_id: "annual", policy_version_id: "annual-v1", direction: "debit", amount_minutes: 60, valid_from: "2026-08-01", memo: "잘못된 방향", source_document_id: "manual-proof" },
  ];
  const preview = service.previewManual(context, { rows, schedule_only: true, as_of: "2026-07-13" });
  assert.deepEqual(preview.counts, { ready: 1, errors: 2, duplicates: 0 });
  const approval = service.approveManual({ ...context, actor_id: "hr-approver" }, { rows, schedule_only: true, as_of: "2026-07-13" });
  const result = service.executeManual(context, { rows, schedule_only: true, as_of: "2026-07-13", approval_receipt_id: approval.approval_receipt_id, idempotency_key: "scheduled-manual-1" });
  assert.deepEqual(result.counts, { created: 1, errors: 2 });
  assert.equal(result.rows[0].lifecycle_state, "scheduled");
  assert.equal(result.rows[0].valid_from, "2026-08-01");

  const entitlement = store.query("selectOne", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT, entitlement_id: result.rows[0].entitlement_id } });
  assert.equal(entitlement.memo, "승인된 예정 발생");
  assert.equal(entitlement.source_document_id, "manual-proof");
  assert.equal(entitlement.approved_by_actor_id, "hr-approver");
  const occurrence = createLeaveReportingService({
    store,
    clock: () => "2026-07-13T01:00:00.000Z",
    employeeDirectory: () => [{ employee_id: "under-one-year", display_name: "1년 미만", org_unit_id: "org-legal" }],
  }).queryOccurrences({ tenant_id: TENANT, actor_id: "hr-operator", authorized_employee_ids: ["under-one-year"] }, { state: "scheduled", as_of: "2026-07-13" });
  assert.equal(occurrence.totals.row_count, 1);
  assert.equal(occurrence.totals.total_minutes, 480);
  assert.equal(occurrence.totals.remaining_minutes, 0);
  assert.equal(JSON.stringify(occurrence).includes("승인된 예정 발생"), false);
  assert.deepEqual(service.executeManual(context, { rows, schedule_only: true, as_of: "2026-07-13", approval_receipt_id: approval.approval_receipt_id, idempotency_key: "scheduled-manual-1" }).counts, { created: 1, errors: 2 });
  assert.equal(store.query("select", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT, idempotency_key: "scheduled-manual-1:1:entitlement" } }).length, 1);
});
