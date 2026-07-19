import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest, seedHrxDurableRuntimeStore } from "../../src/hrx-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../../src/matter-vault-account-registry.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { createXlsxBuffer } from "../../../../packages/hrx/src/leave/xlsx-export.js";

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

function actor(stepUp = false, actorId = "user_amic_tryoon") {
  return { tenant_id: TENANT, actor_id: actorId, actor_role: "lawos_hr", hrx_scopes: ["hrx.leave.accrual.read", "hrx.leave.accrual.write", "hrx.leave.accrual.preview", "hrx.leave.accrual.execute", "hrx.leave.ledger.adjust", "hrx.leave.report.export"], session_bound: true, step_up_verified: stepUp };
}

function request(context, pathname, method, body = {}, requestContext = actor(), query = {}) {
  return handleHrxApiRequest({ pathname, method, body, query, context, requestContext });
}

test("LV-04 accrual routes use granular HR scopes and step-up actions", () => {
  const expectations = [
    ["GET", "/api/hrx/leave/accrual/rules", "hrx.leave.accrual.read", "hrx.leave.accrual.read"],
    ["POST", "/api/hrx/leave/accrual/rules", "hrx.leave.accrual.write", "hrx.leave.accrual.rule.write"],
    ["PATCH", "/api/hrx/leave/accrual/rules/rule-001", "hrx.leave.accrual.write", "hrx.leave.accrual.rule.write"],
    ["POST", "/api/hrx/leave/accrual/rules/rule-001/deactivate", "hrx.leave.accrual.write", "hrx.leave.accrual.rule.write"],
    ["POST", "/api/hrx/leave/accrual/preview", "hrx.leave.accrual.preview", "hrx.leave.accrual.preview"],
    ["POST", "/api/hrx/leave/accrual/execute", "hrx.leave.accrual.execute", "hrx.leave.accrual.execute"],
    ["POST", "/api/hrx/leave/accrual/batches/preview", "hrx.leave.accrual.execute", "hrx.leave.accrual.preview.batch"],
    ["GET", "/api/hrx/leave/accrual/batches/batch-001", "hrx.leave.accrual.execute", "hrx.leave.accrual.read.batch"],
    ["GET", "/api/hrx/leave/accrual/batches/batch-001/export", "hrx.leave.report.export", "hrx.leave.accrual.export.batch"],
    ["POST", "/api/hrx/leave/accrual/batches/batch-001/execute", "hrx.leave.accrual.execute", "hrx.leave.accrual.execute.batch"],
    ["POST", "/api/hrx/leave/accrual/batches/batch-001/retry", "hrx.leave.accrual.execute", "hrx.leave.accrual.execute.batch.retry"],
    ["GET", "/api/hrx/leave/accrual/manual/template", "hrx.leave.ledger.adjust", "hrx.leave.ledger.read"],
    ["POST", "/api/hrx/leave/accrual/manual/preview", "hrx.leave.ledger.adjust", "hrx.leave.ledger.preview"],
    ["POST", "/api/hrx/leave/accrual/manual/approve", "hrx.leave.ledger.adjust", "hrx.leave.ledger.adjust"],
    ["POST", "/api/hrx/leave/accrual/manual/execute", "hrx.leave.ledger.adjust", "hrx.leave.ledger.adjust"],
    ["POST", "/api/hrx/leave/accrual/manual/uploads/preview", "hrx.leave.ledger.adjust", "hrx.leave.occurrence.upload.preview"],
    ["GET", "/api/hrx/leave/accrual/manual/uploads/upload-001", "hrx.leave.ledger.adjust", "hrx.leave.occurrence.upload.read"],
    ["POST", "/api/hrx/leave/accrual/manual/uploads/upload-001/approve", "hrx.leave.ledger.adjust", "hrx.leave.ledger.adjust.upload.execute"],
    ["POST", "/api/hrx/leave/accrual/manual/uploads/upload-001/execute", "hrx.leave.ledger.adjust", "hrx.leave.ledger.adjust.upload.execute"],
    ["POST", "/api/hrx/leave/accrual/manual/uploads/upload-001/retry", "hrx.leave.ledger.adjust", "hrx.leave.ledger.adjust.upload.retry"],
  ];
  for (const [method, pathname, scope, action] of expectations) {
    const policy = resolveHrxRoutePolicy({ method, pathname });
    assert.equal(policy?.required_scope, scope);
    assert.equal(policy?.action, action);
  }
});

test("LV-OCC-005 API returns an example-free, versioned leave occurrence CSV template", () => {
  const { store, context } = setup();
  const result = request(context, "/api/hrx/leave/accrual/manual/template", "GET");
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.template.template_version, "hrx-leave-occurrence-v1");
  assert.equal(result.body.template.row_count, 0);
  const csv = Buffer.from(result.body.template.content_base64, "base64").toString("utf8");
  assert.equal(csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/).length, 2);
  assert.match(csv, /^\uFEFFtemplate_version,hrx-leave-occurrence-v1/);
  assert.equal(csv.includes("emp_amic_"), false);
  const xlsxResult = request(context, "/api/hrx/leave/accrual/manual/template", "GET", {}, actor(), { format: "xlsx" });
  assert.equal(xlsxResult.status, 200, JSON.stringify(xlsxResult.body));
  assert.equal(xlsxResult.body.template.format, "xlsx");
  assert.equal(Buffer.from(xlsxResult.body.template.content_base64, "base64").subarray(0, 2).toString("ascii"), "PK");
  store.close();
});

test("RC-005-B API versions and deactivates accrual rules behind step-up", () => {
  const { store, context } = setup();
  const created = request(context, "/api/hrx/leave/accrual/rules", "POST", {
    accrual_rule_id: "versioned-rule-v1",
    rule_code: "VERSIONED_RULE_V1",
    display_name: "근속 연차",
    policy_version_id: "accrual-policy-v1",
    effective_from: "2026-01-01",
    rule: { basis: "tenure_table", schedule: "fixed_annual_date", annual_date: "07-13", tenure_steps: [{ from_month: 0, to_month: 120, amount_minutes: 7_200 }] },
  }, actor(true));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const challenged = request(context, "/api/hrx/leave/accrual/rules/versioned-rule-v1", "PATCH", {
    accrual_rule_id: "versioned-rule-v2",
    effective_from: "2027-01-01",
  });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  const versioned = request(context, "/api/hrx/leave/accrual/rules/versioned-rule-v1", "PATCH", {
    accrual_rule_id: "versioned-rule-v2",
    effective_from: "2027-01-01",
  }, actor(true));
  assert.equal(versioned.status, 201, JSON.stringify(versioned.body));
  assert.equal(versioned.body.outcome, "version_created");
  assert.equal(versioned.body.rule.version, 2);
  assert.equal(versioned.body.rule.supersedes_rule_id, "versioned-rule-v1");
  const deactivated = request(context, "/api/hrx/leave/accrual/rules/versioned-rule-v1/deactivate", "POST", { expected_version: 1 }, actor(true));
  assert.equal(deactivated.status, 200, JSON.stringify(deactivated.body));
  assert.equal(deactivated.body.rule.status, "inactive");
  store.close();
});

test("RC-005-C XLSX uploads use the same durable preview batch", () => {
  const { store, context } = setup();
  const workbook = createXlsxBuffer({
    headers: ["template_version", "hrx-leave-occurrence-v1"],
    rows: [
      ["employee_id", "group_id", "policy_version_id", "direction", "amount_minutes", "valid_from", "expires_on", "memo", "source_document_id"],
      [EMPLOYEE, "accrual-group", "accrual-policy-v1", "credit", 480, "2026-08-01", "2027-07-31", "XLSX 발생", "accrual-manual-proof"],
    ],
  });
  const previewed = request(context, "/api/hrx/leave/accrual/manual/uploads/preview", "POST", {
    upload_batch_id: "xlsx-upload-api-001",
    xlsx_content_base64: workbook.toString("base64"),
    schedule_only: true,
    as_of: "2026-07-14",
    idempotency_key: "xlsx-upload-api-preview-001",
  });
  assert.equal(previewed.status, 200, JSON.stringify(previewed.body));
  assert.equal(previewed.body.batch.status, "previewed");
  assert.deepEqual(previewed.body.batch.counts, { ready: 1, preview_errors: 0, duplicates: 0, completed: 0, failed: 0, pending: 1, new_entries: 0 });
  assert.equal(JSON.stringify(previewed.body).includes("XLSX 발생"), false);
  store.close();
});

test("LV-OCC-006 API previews every upload row without writing a partial batch", () => {
  const { store, context } = setup();
  const template = request(context, "/api/hrx/leave/accrual/manual/template", "GET");
  const csvTemplate = Buffer.from(template.body.template.content_base64, "base64").toString("utf8");
  const csvText = `${csvTemplate}emp_amic_yjlee,accrual-group,accrual-policy-v1,credit,480,2026-08-01,2027-07-31,예약 발생,accrual-manual-proof\r\nemp_amic_yjlee,accrual-group,accrual-policy-v1,credit,480,2026-08-01,2027-07-31,예약 발생,accrual-manual-proof\r\nmissing,accrual-group,accrual-policy-v1,credit,60,2026-08-02,2027-08-01,대상 오류,accrual-manual-proof\r\n`;
  const before = store.snapshot();
  const preview = request(context, "/api/hrx/leave/accrual/manual/preview", "POST", { csv_text: csvText, schedule_only: true, as_of: "2026-07-14" });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.deepEqual(preview.body.preview.counts, { ready: 1, errors: 2, duplicates: 1 });
  assert.match(preview.body.preview.file_hash, /^[a-f0-9]{64}$/);
  assert.equal(preview.body.preview.template_version, "hrx-leave-occurrence-v1");
  assert.equal(preview.body.preview.rows[1].duplicate_of_row_number, 1);
  assert.deepEqual(store.snapshot(), before);
  store.close();
});

test("LV-OCC-007 API executes a matching approved upload once and returns row receipts", () => {
  const { store, context } = setup();
  const template = request(context, "/api/hrx/leave/accrual/manual/template", "GET");
  const csvText = Buffer.from(template.body.template.content_base64, "base64").toString("utf8")
    + "emp_amic_yjlee,accrual-group,accrual-policy-v1,credit,480,2026-08-01,2027-07-31,API 예약 발생,accrual-manual-proof\r\n";
  const previewed = request(context, "/api/hrx/leave/accrual/manual/uploads/preview", "POST", {
    upload_batch_id: "upload-api-001",
    csv_text: csvText,
    schedule_only: true,
    as_of: "2026-07-14",
    idempotency_key: "upload-api-preview-001",
  });
  assert.equal(previewed.status, 200, JSON.stringify(previewed.body));
  assert.equal(previewed.body.batch.status, "previewed");
  assert.equal(JSON.stringify(previewed.body).includes("API 예약 발생"), false);
  const selfApproval = request(context, "/api/hrx/leave/accrual/manual/uploads/upload-api-001/approve", "POST", {
    preview_hash: previewed.body.batch.preview_hash,
  }, actor(true));
  assert.equal(selfApproval.status, 403);
  assert.equal(selfApproval.body.safe_error_code, "HRX_LEAVE_MANUAL_DUAL_CONTROL_REQUIRED");

  const approvalChallenge = request(context, "/api/hrx/leave/accrual/manual/uploads/upload-api-001/approve", "POST", {
    preview_hash: previewed.body.batch.preview_hash,
  }, actor(false, "user_amic_jwsuh"));
  assert.equal(approvalChallenge.status, 403);
  assert.equal(approvalChallenge.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const approved = request(context, "/api/hrx/leave/accrual/manual/uploads/upload-api-001/approve", "POST", {
    preview_hash: previewed.body.batch.preview_hash,
  }, actor(true, "user_amic_jwsuh"));
  assert.equal(approved.status, 200, JSON.stringify(approved.body));

  const challenged = request(context, "/api/hrx/leave/accrual/manual/uploads/upload-api-001/execute", "POST", {
    preview_hash: previewed.body.batch.preview_hash,
    approval_receipt_id: approved.body.approval_receipt.approval_receipt_id,
    idempotency_key: "upload-api-execute-001",
  });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(challenged.body.step_up_required, true);
  assert.equal(challenged.body.required_purpose, "leave_ledger_adjustment");
  assert.equal(challenged.body.fail_closed, true);

  const executed = request(context, "/api/hrx/leave/accrual/manual/uploads/upload-api-001/execute", "POST", {
    preview_hash: previewed.body.batch.preview_hash,
    approval_receipt_id: approved.body.approval_receipt.approval_receipt_id,
    idempotency_key: "upload-api-execute-001",
  }, actor(true));
  assert.equal(executed.status, 200, JSON.stringify(executed.body));
  assert.equal(executed.body.batch.status, "completed");
  assert.equal(executed.body.batch.counts.new_entries, 1);
  assert.deepEqual(executed.body.batch.rows.map((row) => [row.execution_status, row.attempt_count]), [["completed", 1]]);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "adjustment" } }).length, 1);

  const replay = request(context, "/api/hrx/leave/accrual/manual/uploads/upload-api-001/execute", "POST", {
    preview_hash: previewed.body.batch.preview_hash,
    approval_receipt_id: approved.body.approval_receipt.approval_receipt_id,
    idempotency_key: "upload-api-execute-001",
  }, actor(true));
  assert.equal(replay.body.batch.replayed, true);
  assert.equal(replay.body.batch.counts.new_entries, 0);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "adjustment" } }).length, 1);

  const detail = request(context, "/api/hrx/leave/accrual/manual/uploads/upload-api-001", "GET");
  assert.equal(detail.status, 200);
  assert.equal(detail.body.batch.status, "completed");
  assert.equal(JSON.stringify(detail.body).includes("accrual-manual-proof"), false);
  store.close();
});

test("LV-BATCH-006 batch API blocks self service and preserves preview, execute, detail, and retry receipts", () => {
  const { store, context } = setup();
  const earnedBefore = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length;
  const created = request(context, "/api/hrx/leave/accrual/rules", "POST", {
    accrual_rule_id: "batch-rule",
    rule_code: "BATCH_FIXED_2026",
    display_name: "합성 배치 발생",
    policy_version_id: "accrual-policy-v1",
    effective_from: "2026-01-01",
    rule: { basis: "fixed_amount", schedule: "fixed_annual_date", annual_date: "07-13", amount_minutes: 480, minutes_per_day: 480, expiration_months: 12, attendance_source_required: true },
  }, actor(true));
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const selfService = {
    tenant_id: TENANT,
    actor_id: "user_amic_yjlee",
    actor_role: "lawos_staff",
    hrx_scopes: ["hrx.leave.self.read"],
    session_bound: true,
    step_up_verified: false,
  };
  const denied = request(context, "/api/hrx/leave/accrual/batches/preview", "POST", {
    accrual_rule_id: "batch-rule",
    start_date: "2026-07-13",
    end_date: "2027-07-12",
    idempotency_key: "batch-api-denied",
  }, selfService);
  assert.equal(denied.status, 403);
  assert.equal(denied.body.safe_error_code, "HRX_LEAVE_ACCRUAL_BATCH_SCOPE_DENIED");

  const previewed = request(context, "/api/hrx/leave/accrual/batches/preview", "POST", {
    accrual_batch_id: "batch-api-preview",
    accrual_rule_id: "batch-rule",
    start_date: "2026-07-13",
    end_date: "2027-07-12",
    idempotency_key: "batch-api-preview",
  });
  assert.equal(previewed.status, 200, JSON.stringify(previewed.body));
  assert.equal(previewed.body.batch.period_count, 1);
  assert.equal(previewed.body.batch.periods[0].period_key, "fixed_annual_date:2026-07-13");

  const detail = request(context, "/api/hrx/leave/accrual/batches/batch-api-preview", "GET");
  assert.equal(detail.status, 200);
  assert.equal(detail.body.batch.accrual_batch_id, "batch-api-preview");
  const hidden = request(context, "/api/hrx/leave/accrual/batches/batch-api-preview", "GET", {}, selfService);
  assert.equal(hidden.status, 403);
  assert.equal(hidden.body.count_leak_prevented, true);

  const challenged = request(context, "/api/hrx/leave/accrual/batches/batch-api-preview/execute", "POST", { idempotency_key: "batch-api-execute" });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(challenged.body.step_up_required, true);
  assert.equal(challenged.body.required_purpose, "leave_accrual_execute");
  const executed = request(context, "/api/hrx/leave/accrual/batches/batch-api-preview/execute", "POST", {
    accrual_batch_id: "batch-api-execution",
    idempotency_key: "batch-api-execute",
  }, actor(true));
  assert.equal(executed.status, 200, JSON.stringify(executed.body));
  assert.equal(executed.body.batch.totals.new_entries, 1);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, earnedBefore + 1);

  const deniedExport = request(context, "/api/hrx/leave/accrual/batches/batch-api-execution/export", "GET", {}, selfService, { format: "csv" });
  assert.equal(deniedExport.status, 403);
  const csv = request(context, "/api/hrx/leave/accrual/batches/batch-api-execution/export", "GET", {}, actor(), { format: "csv" });
  assert.equal(csv.status, 200, JSON.stringify(csv.body));
  assert.equal(csv.body.export.export_totals.new_entries, executed.body.batch.totals.new_entries);
  assert.match(Buffer.from(csv.body.export.content_base64, "base64").toString("utf8"), /fixed_annual_date:2026-07-13/);
  const xlsx = request(context, "/api/hrx/leave/accrual/batches/batch-api-execution/export", "GET", {}, actor(), { format: "xlsx" });
  assert.equal(Buffer.from(xlsx.body.export.content_base64, "base64").subarray(0, 2).toString("ascii"), "PK");
  assert.deepEqual(xlsx.body.export.export_totals, csv.body.export.export_totals);

  const replay = request(context, "/api/hrx/leave/accrual/batches/batch-api-preview/execute", "POST", { idempotency_key: "batch-api-replay" }, actor(true));
  assert.equal(replay.body.batch.accrual_batch_id, "batch-api-execution");
  assert.equal(replay.body.batch.replayed, true);
  assert.equal(replay.body.batch.totals.new_entries, 0);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, earnedBefore + 1);

  const retryChallenge = request(context, "/api/hrx/leave/accrual/batches/batch-api-execution/retry", "POST");
  assert.equal(retryChallenge.status, 403);
  assert.equal(retryChallenge.body.step_up_required, true);
  const retried = request(context, "/api/hrx/leave/accrual/batches/batch-api-execution/retry", "POST", {}, actor(true));
  assert.equal(retried.status, 200);
  assert.equal(retried.body.batch.replayed, true);
  store.close();
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
  }, actor(true));
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
  assert.deepEqual(preview.body.preview.counts, { ready: 1, errors: 1, duplicates: 0 });

  const challenged = request(context, "/api/hrx/leave/accrual/manual/approve", "POST", { rows }, actor(false, "user_amic_jwsuh"));
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.step_up_required, true);
  assert.equal(challenged.body.required_purpose, "leave_ledger_adjustment");
  assert.equal(challenged.body.fail_closed, true);

  const approved = request(context, "/api/hrx/leave/accrual/manual/approve", "POST", { rows }, actor(true, "user_amic_jwsuh"));
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  const selfExecuted = request(context, "/api/hrx/leave/accrual/manual/execute", "POST", { rows, approval_receipt_id: approved.body.approval_receipt.approval_receipt_id, idempotency_key: "manual-api-self" }, actor(true, "user_amic_jwsuh"));
  assert.equal(selfExecuted.status, 403);
  assert.equal(selfExecuted.body.safe_error_code, "HRX_LEAVE_MANUAL_DUAL_CONTROL_REQUIRED");
  const executed = request(context, "/api/hrx/leave/accrual/manual/execute", "POST", { rows, approval_receipt_id: approved.body.approval_receipt.approval_receipt_id, idempotency_key: "manual-api-approved" }, actor(true));
  assert.equal(executed.status, 200, JSON.stringify(executed.body));
  assert.deepEqual(executed.body.result.counts, { created: 1, errors: 1 });
});

test("LV-OCC-003 API creates only future scheduled occurrences and keeps them out of active balance", () => {
  const { context } = setup();
  const rows = [
    { employee_id: EMPLOYEE, group_id: "accrual-group", policy_version_id: "accrual-policy-v1", direction: "credit", amount_minutes: 480, valid_from: "2026-08-01", expires_on: "2027-07-31", memo: "승인된 예정 발생", source_document_id: "accrual-manual-proof" },
    { employee_id: EMPLOYEE, group_id: "accrual-group", policy_version_id: "accrual-policy-v1", direction: "credit", amount_minutes: 60, valid_from: "2026-07-14", memo: "오늘 발생", source_document_id: "accrual-manual-proof" },
  ];
  const preview = request(context, "/api/hrx/leave/accrual/manual/preview", "POST", { rows, schedule_only: true, as_of: "2026-07-14" });
  assert.deepEqual(preview.body.preview.counts, { ready: 1, errors: 1, duplicates: 0 });
  const approved = request(context, "/api/hrx/leave/accrual/manual/approve", "POST", { rows, schedule_only: true, as_of: "2026-07-14" }, actor(true, "user_amic_jwsuh"));
  const executed = request(context, "/api/hrx/leave/accrual/manual/execute", "POST", { rows, schedule_only: true, as_of: "2026-07-14", approval_receipt_id: approved.body.approval_receipt.approval_receipt_id, idempotency_key: "manual-scheduled-api" }, actor(true));
  assert.equal(executed.status, 200, JSON.stringify(executed.body));
  assert.equal(executed.body.result.rows[0].lifecycle_state, "scheduled");
  const occurrences = request(context, "/api/hrx/leave/occurrences", "GET", {}, actor(), { state: "scheduled", as_of: "2026-07-14" });
  assert.equal(occurrences.status, 200, JSON.stringify(occurrences.body));
  assert.equal(occurrences.body.occurrences.totals.row_count, 1);
  assert.equal(occurrences.body.occurrences.totals.total_minutes, 480);
  assert.equal(occurrences.body.occurrences.totals.remaining_minutes, 0);
  assert.equal(JSON.stringify(occurrences.body).includes("승인된 예정 발생"), false);
});
