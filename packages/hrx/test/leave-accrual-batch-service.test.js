import assert from "node:assert/strict";
import test from "node:test";
import { createLeaveAccrualBatchService } from "../src/leave/accrual-batch-service.js";
import { createLeaveAccrualService } from "../src/leave/accrual-service.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-batch-preview";
const CONTEXT = Object.freeze({ tenant_id: TENANT, actor_id: "hr-operator", step_up_verified: true });
const NOW = "2026-07-14T08:00:00.000Z";

function fixture({ failOn = null, includeInvalid = false } = {}) {
  const store = createFileHrxStore();
  store.query("insert", { table: "hrx_employees", row: { tenant_id: TENANT, employee_id: "emp-001", display_name: "합성 구성원", status: "active" } });
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2025-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  let sourceRevision = "v1";
  let sequence = 0;
  const sourceProvider = {
    snapshot({ occurred_on }) {
      if (occurred_on === failOn) throw new Error("synthetic source failure");
      return {
        source_version: `${sourceRevision}:${occurred_on}`,
        rows: [
          { employee_id: "emp-001", display_name: "합성 구성원", employee_status: "active", profile_status: "active", weekly_work_ratio: 1, source_errors: [], perfect_attendance_periods: [], hire_date: "2020-07-13", service_months: 72, years_of_service: 6, yearly_attendance_rate: 1, full_months_without_absence: 11 },
          ...(includeInvalid ? [{ employee_id: "emp-invalid", display_name: "원천 오류", employee_status: "active", profile_status: "active", weekly_work_ratio: 0, source_errors: ["work_schedule_missing"], perfect_attendance_periods: [], hire_date: "2020-07-13", service_months: 72, years_of_service: 6, yearly_attendance_rate: 1, full_months_without_absence: 11 }] : []),
        ],
      };
    },
  };
  const idFactory = (prefix) => `${prefix}-${++sequence}`;
  const child = createLeaveAccrualService({ store, clock: () => NOW, idFactory, sourceProvider });
  child.createRule(CONTEXT, { accrual_rule_id: "annual-rule", rule_code: "ANNUAL", display_name: "연차", policy_version_id: "annual-v1", effective_from: "2025-01-01", rule: { basis: "fixed_amount", schedule: "fixed_annual_date", annual_date: "07-13", amount_minutes: 480, minutes_per_day: 480, expiration_months: 12 } });
  const service = createLeaveAccrualBatchService({ store, clock: () => NOW, idFactory, sourceProvider });
  return { store, service, setSourceRevision: (value) => { sourceRevision = value; } };
}

test("LV-BATCH-003 composes single-period previews and reconciles child totals", () => {
  const { store, service, setSourceRevision } = fixture();
  const preview = service.preview(CONTEXT, { accrual_batch_id: "preview-two-years", accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2027-07-12", idempotency_key: "preview-two-years" });
  assert.equal(preview.status, "completed");
  assert.equal(preview.period_count, 2);
  assert.deepEqual(preview.totals, { ready: 2, skipped: 0, errors: 0, failed_periods: 0 });
  assert.equal(preview.totals.ready, preview.periods.reduce((total, period) => total + period.result.counts.ready, 0));
  assert.deepEqual(preview.periods.flatMap((period) => period.result.rows.map((row) => [period.period_key, row.employee_id, row.amount_minutes])), [
    ["fixed_annual_date:2025-07-13", "emp-001", 480],
    ["fixed_annual_date:2026-07-13", "emp-001", 480],
  ]);
  assert.equal(store.query("select", { table: "hrx_leave_accrual_runs", where: { tenant_id: TENANT, mode: "preview" } }).length, 2);
  assert.equal(service.preview(CONTEXT, { accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2027-07-12", idempotency_key: "preview-two-years" }).replayed, true);
  assert.equal(service.validatePreview(CONTEXT, { accrual_batch_id: preview.accrual_batch_id }).is_current, true);
  setSourceRevision("v2");
  const stale = service.validatePreview(CONTEXT, { accrual_batch_id: preview.accrual_batch_id });
  assert.equal(stale.is_current, false);
  assert.equal(stale.stale_period_count, 2);
  store.close();
});

test("LV-BATCH-003 preserves a failed child as an explicit period result", () => {
  const { store, service } = fixture({ failOn: "2026-07-13" });
  const preview = service.preview(CONTEXT, { accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2027-07-12", idempotency_key: "preview-partial" });
  assert.equal(preview.status, "completed_with_errors");
  assert.deepEqual(preview.periods.map((period) => period.status), ["completed", "failed"]);
  assert.deepEqual(preview.totals, { ready: 1, skipped: 0, errors: 0, failed_periods: 1 });
  assert.equal(preview.periods[1].error_code, "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_FAILED");
  assert.equal(preview.periods[1].result, null);
  store.close();
});

test("LV-BATCH-003 keeps batch reads tenant scoped", () => {
  const { store, service } = fixture();
  const preview = service.preview(CONTEXT, { accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2026-07-12", idempotency_key: "preview-tenant" });
  assert.throws(
    () => service.read({ ...CONTEXT, tenant_id: "tenant-other" }, { accrual_batch_id: preview.accrual_batch_id }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_BATCH_NOT_FOUND" && error.status === 404,
  );
  store.close();
});

test("LV-BATCH-004 executes every matching child once and turns replayed creates into duplicates", () => {
  const { store, service } = fixture();
  const preview = service.preview(CONTEXT, { accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2027-07-12", idempotency_key: "preview-execute" });
  const executed = service.execute(CONTEXT, { accrual_batch_id: "execute-two-years", preview_batch_id: preview.accrual_batch_id, idempotency_key: "execute-two-years" });
  assert.equal(executed.status, "completed");
  assert.deepEqual(executed.totals, { created: 2, duplicates: 0, new_entries: 2, skipped: 0, errors: 0, failed_periods: 0 });
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, 2);

  const replay = service.execute(CONTEXT, { preview_batch_id: preview.accrual_batch_id, idempotency_key: "different-key-cannot-create-second-parent" });
  assert.equal(replay.accrual_batch_id, executed.accrual_batch_id);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.totals, { created: 0, duplicates: 2, new_entries: 0, skipped: 0, errors: 0, failed_periods: 0 });
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, 2);
  store.close();
});

test("LV-BATCH-004 rejects a stale batch before creating an execute parent or ledger entries", () => {
  const { store, service, setSourceRevision } = fixture();
  const preview = service.preview(CONTEXT, { accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2026-07-12", idempotency_key: "preview-stale-execute" });
  setSourceRevision("v2");
  assert.throws(
    () => service.execute(CONTEXT, { preview_batch_id: preview.accrual_batch_id, idempotency_key: "execute-stale" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_BATCH_PREVIEW_STALE",
  );
  assert.equal(store.query("select", { table: "hrx_leave_accrual_batches", where: { tenant_id: TENANT, mode: "execute" } }).length, 0);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, 0);
  store.close();
});

test("LV-BATCH-004 keeps row errors visible while executing eligible rows", () => {
  const { store, service } = fixture({ includeInvalid: true });
  const preview = service.preview(CONTEXT, { accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2026-07-12", idempotency_key: "preview-row-errors" });
  assert.equal(preview.status, "completed_with_errors");
  const executed = service.execute(CONTEXT, { preview_batch_id: preview.accrual_batch_id, idempotency_key: "execute-row-errors" });
  assert.equal(executed.status, "completed_with_errors");
  assert.deepEqual(executed.totals, { created: 1, duplicates: 0, new_entries: 1, skipped: 0, errors: 1, failed_periods: 0 });
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, 1);
  store.close();
});

test("LV-BATCH-004 requires fresh step-up before any execute state is stored", () => {
  const { store, service } = fixture();
  const preview = service.preview(CONTEXT, { accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2026-07-12", idempotency_key: "preview-step-up" });
  assert.throws(
    () => service.execute({ ...CONTEXT, step_up_verified: false }, { preview_batch_id: preview.accrual_batch_id, idempotency_key: "execute-step-up" }),
    (error) => error.safe_error_code === "HRX_STEP_UP_REQUIRED" && error.status === 403,
  );
  assert.equal(store.query("select", { table: "hrx_leave_accrual_batches", where: { tenant_id: TENANT, mode: "execute" } }).length, 0);
  store.close();
});

test("LV-BATCH-005 retries only a failed preview child after durable reopen", () => {
  const first = fixture({ failOn: "2026-07-13" });
  const failed = first.service.preview(CONTEXT, { accrual_batch_id: "preview-resume", accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2027-07-12", idempotency_key: "preview-resume" });
  const completedRunId = failed.periods[0].accrual_run_id;
  assert.deepEqual(failed.periods.map((period) => [period.status, period.attempt_count]), [["completed", 1], ["failed", 1]]);
  const snapshot = first.store.snapshot();
  first.store.close();

  const store = createFileHrxStore({ initialState: snapshot });
  let sequence = 100;
  const sourceProvider = { snapshot: ({ occurred_on }) => ({ source_version: `v1:${occurred_on}`, rows: [{ employee_id: "emp-001", display_name: "합성 구성원", employee_status: "active", profile_status: "active", weekly_work_ratio: 1, source_errors: [], perfect_attendance_periods: [], hire_date: "2020-07-13", service_months: 72, years_of_service: 6, yearly_attendance_rate: 1, full_months_without_absence: 11 }] }) };
  const service = createLeaveAccrualBatchService({ store, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++sequence}`, sourceProvider });
  const resumed = service.resume(CONTEXT, { accrual_batch_id: failed.accrual_batch_id });
  assert.equal(resumed.status, "completed");
  assert.equal(resumed.periods[0].accrual_run_id, completedRunId);
  assert.deepEqual(resumed.periods.map((period) => period.attempt_count), [1, 2]);
  assert.deepEqual(resumed.totals, { ready: 2, skipped: 0, errors: 0, failed_periods: 0 });
  assert.equal(store.query("select", { table: "hrx_leave_accrual_runs", where: { tenant_id: TENANT, mode: "preview" } }).length, 2);
  store.close();
});

test("LV-BATCH-005 resumes only the failed execute child without duplicating completed ledger entries", () => {
  const { store, service: previewService } = fixture();
  const preview = previewService.preview(CONTEXT, { accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2027-07-12", idempotency_key: "preview-execute-resume" });
  let failSecond = true;
  const base = createLeaveAccrualService({
    store,
    clock: () => NOW,
    sourceProvider: { snapshot: ({ occurred_on }) => ({ source_version: `v1:${occurred_on}`, rows: [{ employee_id: "emp-001", display_name: "합성 구성원", employee_status: "active", profile_status: "active", weekly_work_ratio: 1, source_errors: [], perfect_attendance_periods: [], hire_date: "2020-07-13", service_months: 72, years_of_service: 6, yearly_attendance_rate: 1, full_months_without_absence: 11 }] }) },
  });
  const faulted = {
    ...base,
    execute(context, input) {
      const run = store.query("selectOne", { table: "hrx_leave_accrual_runs", where: { tenant_id: TENANT, accrual_run_id: input.preview_run_id } });
      if (failSecond && run?.period_key === "fixed_annual_date:2026-07-13") throw new Error("synthetic execute interruption");
      return base.execute(context, input);
    },
  };
  const service = createLeaveAccrualBatchService({ store, clock: () => NOW, accrualService: faulted });
  const partial = service.execute(CONTEXT, { accrual_batch_id: "execute-resume", preview_batch_id: preview.accrual_batch_id, idempotency_key: "execute-resume" });
  assert.deepEqual(partial.periods.map((period) => [period.status, period.attempt_count]), [["completed", 1], ["failed", 1]]);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, 1);
  const completedRunId = partial.periods[0].accrual_run_id;

  failSecond = false;
  const resumed = service.resume(CONTEXT, { accrual_batch_id: partial.accrual_batch_id });
  assert.equal(resumed.status, "completed");
  assert.equal(resumed.periods[0].accrual_run_id, completedRunId);
  assert.deepEqual(resumed.periods.map((period) => period.attempt_count), [1, 2]);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, 2);
  assert.equal(service.resume(CONTEXT, { accrual_batch_id: resumed.accrual_batch_id }).replayed, true);
  assert.equal(store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length, 2);
  store.close();
});

test("LV-BATCH-008 exports CSV and XLSX receipts that reconcile with the batch and ledger", () => {
  const { store, service } = fixture();
  const preview = service.preview(CONTEXT, { accrual_rule_id: "annual-rule", start_date: "2025-07-13", end_date: "2027-07-12", idempotency_key: "preview-export" });
  const executed = service.execute(CONTEXT, { accrual_batch_id: "execute-export", preview_batch_id: preview.accrual_batch_id, idempotency_key: "execute-export" });
  const csv = service.exportReceipt(CONTEXT, { accrual_batch_id: executed.accrual_batch_id, format: "csv" });
  const csvText = Buffer.from(csv.content_base64, "base64").toString("utf8");
  assert.equal(csv.export_totals.row_count, 2);
  assert.equal(csv.export_totals.amount_minutes, 960);
  assert.equal(csv.export_totals.new_entries, executed.totals.new_entries);
  assert.equal(csv.export_totals.new_entries, store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_type: "earned" } }).length);
  assert.match(csvText, /fixed_annual_date:2025-07-13/);
  assert.match(csvText, /합성 구성원/);
  assert.doesNotMatch(csvText, /source_version|snapshot_hash/);

  const xlsx = service.exportReceipt(CONTEXT, { accrual_batch_id: executed.accrual_batch_id, format: "xlsx" });
  assert.equal(Buffer.from(xlsx.content_base64, "base64").subarray(0, 2).toString("ascii"), "PK");
  assert.deepEqual(xlsx.export_totals, csv.export_totals);
  assert.equal(xlsx.snapshot_hash, executed.snapshot_hash);
  assert.throws(
    () => service.exportReceipt({ ...CONTEXT, tenant_id: "tenant-other" }, { accrual_batch_id: executed.accrual_batch_id, format: "csv" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ACCRUAL_BATCH_NOT_FOUND" && error.status === 404,
  );
  store.close();
});
