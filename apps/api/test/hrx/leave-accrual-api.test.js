import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest, seedHrxDurableRuntimeStore } from "../../src/hrx-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../../src/matter-vault-account-registry.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const EMPLOYEE = "emp_amic_yjlee";

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "accrual-group", code: "ACCRUAL", display_name: "발생 휴가", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "accrual-policy-v1", group_id: "accrual-group", policy_code: "accrual-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  store.query("insert", { table: "hrx_work_schedule_profiles", row: { tenant_id: TENANT, schedule_profile_id: "accrual-schedule", display_name: "합성 표준 근무", timezone: "Asia/Seoul", weekly_schedule_json: JSON.stringify(Object.fromEntries([1, 2, 3, 4, 5].map((day) => [day, [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }]]))), holiday_calendar_ref: "KR_PUBLIC_HOLIDAYS", effective_from: "2026-01-01", effective_to: null, state_version: 1 } });
  store.query("insert", { table: "hrx_work_schedule_assignments", row: { tenant_id: TENANT, schedule_assignment_id: "accrual-schedule-yjlee", schedule_profile_id: "accrual-schedule", employee_id: EMPLOYEE, organization_id: null, priority: 100, effective_from: "2026-01-01", effective_to: null } });
  store.query("insert", { table: "hrx_attendance_records", row: { tenant_id: TENANT, attendance_id: "accrual-attendance-yjlee", employee_id: EMPLOYEE, work_date: "2026-07-01", status: "present", source_ref: "SyntheticAttendance:LV04", source_kind: "manual", recorded_hours: 8 } });
  store.query("insert", { table: "hrx_documents", row: { tenant_id: TENANT, document_id: "accrual-manual-proof", employee_id: EMPLOYEE, document_type: "leave_adjustment_evidence", source_ref: "SyntheticDocument:LV04", source_status: "verified", source_metadata_json: "{}", title: "합성 수동 조정 근거", document_body_included: false } });
  return { store, context: createHrxRuntimeContext({ store }) };
}

function actor(stepUp = false) {
  return { tenant_id: TENANT, actor_id: "user_amic_tryoon", actor_role: "lawos_hr", hrx_scopes: ["hrx.leave.policy.write", "hrx.leave.accrual.execute", "hrx.leave.ledger.adjust"], session_bound: true, step_up_verified: stepUp };
}

function request(context, pathname, method, body = {}, requestContext = actor()) {
  return handleHrxApiRequest({ pathname, method, body, query: {}, context, requestContext });
}

test("LV-04 accrual routes use granular HR scopes and step-up actions", () => {
  const expectations = [
    ["GET", "/api/hrx/leave/accrual/rules", "hrx.leave.accrual.execute", "hrx.leave.accrual.read"],
    ["POST", "/api/hrx/leave/accrual/preview", "hrx.leave.accrual.execute", "hrx.leave.accrual.preview"],
    ["POST", "/api/hrx/leave/accrual/execute", "hrx.leave.accrual.execute", "hrx.leave.accrual.execute"],
    ["POST", "/api/hrx/leave/accrual/manual/preview", "hrx.leave.ledger.adjust", "hrx.leave.ledger.preview"],
    ["POST", "/api/hrx/leave/accrual/manual/execute", "hrx.leave.ledger.adjust", "hrx.leave.ledger.adjust"],
  ];
  for (const [method, pathname, scope, action] of expectations) {
    const policy = resolveHrxRoutePolicy({ method, pathname });
    assert.equal(policy?.required_scope, scope);
    assert.equal(policy?.action, action);
  }
});

test("LV-04 API previews, executes once, and rejects stale source snapshots", () => {
  const { store, context } = setup();
  const created = request(context, "/api/hrx/leave/accrual/rules", "POST", {
    accrual_rule_id: "accrual-rule",
    rule_code: "FIXED_2026",
    display_name: "합성 고정 발생",
    policy_version_id: "accrual-policy-v1",
    effective_from: "2026-01-01",
    rule: { basis: "fixed_amount", schedule: "fixed_annual_date", annual_date: "07-13", amount_minutes: 480, minutes_per_day: 480, expiration_months: 12, attendance_source_required: true },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const preview = request(context, "/api/hrx/leave/accrual/preview", "POST", { accrual_rule_id: "accrual-rule", period_key: "2026", occurred_on: "2026-07-13" });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.equal(preview.body.run.result.rows.find((row) => row.employee_id === EMPLOYEE)?.status, "ready");

  const challenged = request(context, "/api/hrx/leave/accrual/execute", "POST", { preview_run_id: preview.body.run.accrual_run_id });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const executed = request(context, "/api/hrx/leave/accrual/execute", "POST", { preview_run_id: preview.body.run.accrual_run_id }, actor(true));
  assert.equal(executed.status, 200, JSON.stringify(executed.body));
  assert.equal(executed.body.run.result.counts.new_entries, 1);
  const rerun = request(context, "/api/hrx/leave/accrual/execute", "POST", { preview_run_id: preview.body.run.accrual_run_id }, actor(true));
  assert.equal(rerun.body.run.result.counts.new_entries, 0);

  const stalePreview = request(context, "/api/hrx/leave/accrual/preview", "POST", { accrual_rule_id: "accrual-rule", period_key: "2026-stale", occurred_on: "2026-07-13" });
  store.query("insert", { table: "hrx_attendance_records", row: { tenant_id: TENANT, attendance_id: "accrual-attendance-source-change", employee_id: EMPLOYEE, work_date: "2026-07-02", status: "present", source_ref: "SyntheticAttendance:LV04:changed", source_kind: "manual", recorded_hours: 8 } });
  const stale = request(context, "/api/hrx/leave/accrual/execute", "POST", { preview_run_id: stalePreview.body.run.accrual_run_id }, actor(true));
  assert.equal(stale.status, 409);
  assert.equal(stale.body.safe_error_code, "HRX_LEAVE_ACCRUAL_PREVIEW_STALE");
});

test("LV-04 manual adjustment API preserves row errors and requires another authorized HR", () => {
  const { context } = setup();
  const rows = [
    { employee_id: EMPLOYEE, group_id: "accrual-group", policy_version_id: "accrual-policy-v1", direction: "credit", amount_minutes: 240, occurred_on: "2026-07-13", expires_on: "2027-07-13", reason: "합성 조정", source_document_id: "accrual-manual-proof" },
    { employee_id: "missing", group_id: "accrual-group", policy_version_id: "accrual-policy-v1", direction: "credit", amount_minutes: 240, occurred_on: "2026-07-13", reason: "합성 오류", source_document_id: "accrual-manual-proof" },
  ];
  const preview = request(context, "/api/hrx/leave/accrual/manual/preview", "POST", { rows });
  assert.equal(preview.status, 200);
  assert.deepEqual(preview.body.preview.counts, { ready: 1, errors: 1 });

  const selfApproved = request(context, "/api/hrx/leave/accrual/manual/execute", "POST", { rows, approved_by_actor_id: "user_amic_tryoon", idempotency_key: "manual-api-self" }, actor(true));
  assert.equal(selfApproved.status, 403);
  assert.equal(selfApproved.body.safe_error_code, "HRX_LEAVE_MANUAL_DUAL_CONTROL_REQUIRED");

  const executed = request(context, "/api/hrx/leave/accrual/manual/execute", "POST", { rows, approved_by_actor_id: "user_amic_jwsuh", idempotency_key: "manual-api-approved" }, actor(true));
  assert.equal(executed.status, 200, JSON.stringify(executed.body));
  assert.deepEqual(executed.body.result.counts, { created: 1, errors: 1 });
});
