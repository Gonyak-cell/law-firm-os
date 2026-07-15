import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollRepository } from "../src/payroll/repository.js";
import { createPayrollRunService, createPayrollStepUpReceipt } from "../src/payroll/run-service.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-payroll-run";
const NOW = "2026-08-01T01:00:00.000Z";
const PREPARER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-preparer" });
const APPROVER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-approver" });
const STATUTORY = JSON.parse(readFileSync(new URL("../fixtures/payroll-statutory-rules.synthetic.json", import.meta.url), "utf8"));

function earningsRules() {
  return {
    schema_version: "law-firm-os.hrx.payroll-earning-rules.v0.1",
    fixture_only: true,
    currency: "KRW",
    rounding_mode: "nearest",
    monthly: { proration_basis: "calendar_days", rate_divisor_minutes: 9_600 },
    segment_rates: {},
    allowances: [],
    unused_leave: null,
  };
}

function publishRule(repository, kind, id, sourceHash, rules) {
  let rule = repository.createRuleVersion(PREPARER, { rule_version_id: id, rule_kind: kind, version_code: `${kind}-2026-H2`, effective_from: "2026-07-01", effective_to: "2026-12-31", source_document_hash: sourceHash, rules });
  rule = repository.reviewRuleVersion(APPROVER, { rule_version_id: rule.rule_version_id, expected_version: 1 });
  return repository.publishRuleVersion(APPROVER, { rule_version_id: rule.rule_version_id, expected_version: 2 });
}

function createPeriodRun(repository, input) {
  let period = repository.createPeriod(PREPARER, { period_id: input.period_id, period_code: input.period_code, period_start: input.period_start, period_end: input.period_end, cutoff_at: `${input.period_end}T23:59:59+09:00`, pay_date: input.pay_date });
  period = repository.transitionPeriod(PREPARER, { period_id: period.period_id, status: "open", expected_version: 1 });
  const run = repository.createRun(PREPARER, { run_id: input.run_id, period_id: period.period_id, run_type: input.run_type, previous_run_id: input.previous_run_id });
  return { period, run };
}

function resolved(snapshot, amountKrw, notices = []) {
  return {
    snapshot,
    compensation: { amount_krw: amountKrw, currency: "KRW" },
    input: {
      payroll_profile: { employment_type: "monthly", pay_group_code: "KR-MONTHLY", currency: "KRW", compensation_ref: "compensation:synthetic", compensation_unit: "period", compensation_quantity: 1, withholding_category: null },
      lifecycle: { lifecycle_status: "active", active_calendar_days: 31, period_calendar_days: 31, starts_in_period: false, ends_in_period: false },
      attendance: { payable_minutes: 9_600 },
      overtime: { overtime_minutes: 0, night_minutes: 0, holiday_minutes: 0 },
      leave: { paid_minutes: 0, unpaid_minutes: 0, unused_balance_minutes: 0 },
      deductions: { input: { dependent_count: 0, income_tax_exempt: false, withholding_category: null, pension: { enrolled: true }, health: { enrolled: true }, employment_insurance: { enrolled: true } }, custom: [], notices },
      policy: { standard_day_minutes: 480 },
    },
  };
}

function runtime() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  createSqlHrxRepository({ store, clock: () => NOW }).createEmployee({ tenant_id: TENANT, employee_id: "emp-001", display_name: "Synthetic Employee", status: "active" });
  let sequence = 0;
  const repository = createPayrollRepository({ store, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++sequence}` });
  publishRule(repository, "payroll_earnings", "earnings-h2", "a".repeat(64), earningsRules());
  publishRule(repository, "payroll_statutory", "statutory-h2", STATUTORY.source_document_hash, STATUTORY);
  const resolvedByRun = new Map();
  const inputSnapshotService = { loadResolved(_context, input) { return resolvedByRun.get(input.run_id) ?? []; } };
  const service = createPayrollRunService({ payrollRepository: repository, inputSnapshotService, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++sequence}`, variancePolicy: { amount_krw: 100_000, basis_points: 500, severity: "blocker" } });
  return { store, repository, service, resolvedByRun };
}

function readyRun(value, input) {
  const created = createPeriodRun(value.repository, input);
  const snapshot = value.repository.createInputSnapshot(PREPARER, { snapshot_id: `snapshot-${input.run_id}`, run_id: created.run.run_id, employee_id: "emp-001", source_refs: [{ kind: "attendance", ref: `artifact:attendance/${input.run_id}`, hash: "b".repeat(64) }], input_data: { fixture_only: true }, source_hash: input.source_hash ?? "c".repeat(64), payable_minutes: 9_600 });
  const run = value.repository.transitionRun(PREPARER, { run_id: created.run.run_id, status: "snapshot_ready", snapshot_hash: snapshot.source_hash, expected_version: 1 });
  value.resolvedByRun.set(run.run_id, [resolved(snapshot, input.amount_krw, input.notices)]);
  return { ...created, run, snapshot };
}

function approvalReceipt(runId, actorId = APPROVER.actor_id, suffix = runId) {
  return createPayrollStepUpReceipt({ receipt_ref: `artifact:step-up/${suffix}`, actor_id: actorId, action: "payroll.approve", object_id: runId, issued_at: "2026-08-01T00:55:00.000Z", expires_at: "2026-08-01T01:05:00.000Z" });
}

test("PY-RUN-001/003/004/006 persists a deterministic preview, four-eye approval, close, audit, and redacted outbox", () => {
  const value = runtime();
  const regular = readyRun(value, { period_id: "period-2026-07", period_code: "2026-07", period_start: "2026-07-01", period_end: "2026-07-31", pay_date: "2026-08-05", run_id: "run-regular", amount_krw: 2_500_000 });
  const preview = value.service.preview(PREPARER, { run_id: regular.run.run_id, expected_version: 2 });
  assert.equal(preview.run.status, "previewed");
  assert.deepEqual([preview.results[0].gross_krw, preview.results[0].deduction_krw, preview.results[0].net_krw], [2_500_000, 425_000, 2_075_000]);
  const repeated = value.service.preview(PREPARER, { run_id: regular.run.run_id });
  assert.equal(repeated.run.result_hash, preview.run.result_hash);
  assert.equal(value.repository.listOutboxEvents(PREPARER, { run_id: regular.run.run_id }).filter((row) => row.event_type === "payroll.preview").length, 1);
  assert.throws(() => value.service.approve(PREPARER, { run_id: regular.run.run_id, step_up_receipt: approvalReceipt(regular.run.run_id, PREPARER.actor_id, "self") }), (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL");
  const approved = value.service.approve(APPROVER, { run_id: regular.run.run_id, step_up_receipt: approvalReceipt(regular.run.run_id) });
  assert.equal(approved.status, "approved");
  const closed = value.service.close(APPROVER, { run_id: regular.run.run_id });
  assert.equal(closed.status, "closed");
  assert.throws(() => value.store.query("updateOne", { table: "hrx_payroll_runs", where: { tenant_id: TENANT, run_id: regular.run.run_id }, patch: { result_hash: "d".repeat(64) } }), /immutable/);
  const outbox = value.repository.listOutboxEvents(PREPARER, { run_id: regular.run.run_id });
  assert.deepEqual(outbox.map((row) => row.event_type), ["payroll.preview", "payroll.approve", "payroll.close"]);
  assert.doesNotMatch(JSON.stringify(outbox), /Synthetic Employee|@|bank_account|display_name/);
  assert.ok(value.repository.listAuditEvents(PREPARER).some((row) => row.action === "hrx.payroll.run.previewed"));
  value.store.close();
});

test("PY-RUN-002 blocks approval on unexplained notices and prior-period threshold variance until explicit resolution", () => {
  const value = runtime();
  const first = readyRun(value, { period_id: "period-2026-07", period_code: "2026-07", period_start: "2026-07-01", period_end: "2026-07-31", pay_date: "2026-08-05", run_id: "run-first", amount_krw: 2_500_000 });
  value.service.preview(PREPARER, { run_id: first.run.run_id });
  value.service.approve(APPROVER, { run_id: first.run.run_id, step_up_receipt: approvalReceipt(first.run.run_id) });
  value.service.close(APPROVER, { run_id: first.run.run_id });

  const second = readyRun(value, { period_id: "period-2026-08", period_code: "2026-08", period_start: "2026-08-01", period_end: "2026-08-31", pay_date: "2026-09-05", run_id: "run-second", amount_krw: 4_000_000, notices: [{ notice_kind: "PENSION", notice_amount_krw: 1 }] });
  const preview = value.service.preview(PREPARER, { run_id: second.run.run_id });
  assert.deepEqual(preview.issues.filter((row) => row.state === "open").map((row) => row.issue_code).sort(), ["PAYROLL_NOTICE_VARIANCE_UNEXPLAINED", "PAYROLL_PRIOR_PERIOD_VARIANCE"]);
  assert.throws(() => value.service.approve(APPROVER, { run_id: second.run.run_id, step_up_receipt: approvalReceipt(second.run.run_id) }), (error) => error.safe_error_code === "HRX_PAYROLL_BLOCKERS_OPEN");
  for (const issue of preview.issues) value.repository.resolveIssue(APPROVER, { issue_id: issue.issue_id, expected_version: issue.state_version, state: "resolved", resolution_code: "REVIEWED_SOURCE_EVIDENCE" });
  assert.equal(value.service.approve(APPROVER, { run_id: second.run.run_id, step_up_receipt: approvalReceipt(second.run.run_id) }).status, "approved");
  value.store.close();
});

test("PY-RUN-005 keeps the closed original immutable and persists only the adjustment delta", () => {
  const value = runtime();
  const original = readyRun(value, { period_id: "period-2026-07", period_code: "2026-07", period_start: "2026-07-01", period_end: "2026-07-31", pay_date: "2026-08-05", run_id: "run-original", amount_krw: 2_500_000, source_hash: "d".repeat(64) });
  const before = value.service.preview(PREPARER, { run_id: original.run.run_id });
  value.service.approve(APPROVER, { run_id: original.run.run_id, step_up_receipt: approvalReceipt(original.run.run_id) });
  value.service.close(APPROVER, { run_id: original.run.run_id });

  const adjustmentRun = value.repository.createRun(PREPARER, { run_id: "run-adjustment", period_id: original.period.period_id, run_type: "adjustment", previous_run_id: original.run.run_id });
  value.repository.createAdjustment(PREPARER, { adjustment_id: "adjustment-retro", run_id: adjustmentRun.run_id, employee_id: "emp-001", previous_run_ref: `artifact:payroll-run/${original.run.run_id}`, adjustment_ref: "artifact:payroll-adjustment/retro-001", reason_code: "RETRO_RATE", amount_krw: 100_000, taxable: true });
  const snapshot = value.repository.createInputSnapshot(PREPARER, { snapshot_id: "snapshot-adjustment", run_id: adjustmentRun.run_id, employee_id: "emp-001", source_refs: [{ kind: "attendance", ref: "artifact:attendance/run-adjustment", hash: "b".repeat(64) }], input_data: { fixture_only: true }, source_hash: original.snapshot.source_hash, payable_minutes: 9_600 });
  const ready = value.repository.transitionRun(PREPARER, { run_id: adjustmentRun.run_id, status: "snapshot_ready", snapshot_hash: snapshot.source_hash, expected_version: 1 });
  value.resolvedByRun.set(ready.run_id, [resolved(snapshot, 2_500_000)]);
  const adjustmentPreview = value.service.preview(PREPARER, { run_id: ready.run_id });
  const delta = adjustmentPreview.results[0];
  assert.equal(before.results[0].gross_krw + delta.gross_krw, 2_600_000);
  assert.equal(before.results[0].net_krw + delta.net_krw, 2_164_600);
  assert.ok(adjustmentPreview.line_items.filter((row) => row.result_id === delta.result_id).every((row) => row.formula_code === "ADJUSTMENT_DELTA_V1"));
  assert.throws(() => value.store.query("updateOne", { table: "hrx_payroll_adjustments", where: { tenant_id: TENANT, adjustment_id: "adjustment-retro" }, patch: { amount_krw: 1 } }), /append-only/);
  value.store.close();
});
