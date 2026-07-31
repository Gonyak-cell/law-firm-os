import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollDataHash, createPayrollRepository } from "../src/payroll/repository.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-payroll";
const NOW = "2026-07-15T01:00:00.000Z";
const HR = Object.freeze({ tenant_id: TENANT, actor_id: "hr-preparer" });
const APPROVER = Object.freeze({ tenant_id: TENANT, actor_id: "hr-approver" });
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function seedEmployee(store, tenantId = TENANT, employeeId = "emp-001") {
  createSqlHrxRepository({ store, clock: () => NOW }).createEmployee({
    tenant_id: tenantId,
    employee_id: employeeId,
    display_name: "Synthetic Employee",
    status: "active",
  });
}

function createDurableStore() {
  const filePath = join(mkdtempSync(join(tmpdir(), "hrx-payroll-")), "hrx-store.json");
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  return { filePath, store };
}

function payroll(store, idFactory) {
  let sequence = 0;
  return createPayrollRepository({
    store,
    clock: () => NOW,
    idFactory: idFactory ?? ((prefix) => `${prefix}-${++sequence}`),
  });
}

function createClosedRun(repository) {
  let period = repository.createPeriod(HR, {
    period_id: "period-2026-07",
    period_code: "2026-07",
    period_start: "2026-07-01",
    period_end: "2026-07-31",
    cutoff_at: "2026-07-31T23:59:59+09:00",
    pay_date: "2026-08-05",
  });
  period = repository.transitionPeriod(HR, { period_id: period.period_id, status: "open", expected_version: 1 });
  let run = repository.createRun(HR, { run_id: "run-2026-07", period_id: period.period_id });
  const snapshot = repository.createInputSnapshot(HR, {
    snapshot_id: "snapshot-001",
    run_id: run.run_id,
    employee_id: "emp-001",
    source_refs: [{ kind: "attendance", ref: "artifact:attendance/2026-07/emp-001", hash: HASH_A }],
    payable_minutes: 9_600,
    paid_leave_minutes: 480,
    unpaid_leave_minutes: 0,
  });
  run = repository.transitionRun(HR, { run_id: run.run_id, status: "snapshot_ready", snapshot_hash: snapshot.source_hash, expected_version: 1 });
  const result = repository.createEmployeeResult(HR, {
    result_id: "result-001",
    run_id: run.run_id,
    employee_id: "emp-001",
    input_snapshot_id: snapshot.snapshot_id,
    gross_krw: 5_000_000,
    deduction_krw: 500_000,
    net_krw: 4_500_000,
  });
  repository.addLineItem(HR, { result_id: result.result_id, item_kind: "earning", item_code: "BASE", formula_code: "MONTHLY_BASE_V1", amount_krw: 5_000_000, quantity_minutes: 9_600 });
  repository.addLineItem(HR, { result_id: result.result_id, item_kind: "deduction", item_code: "SYNTHETIC_DED", formula_code: "SYNTHETIC_DED_V1", amount_krw: 500_000 });
  const resultHash = createPayrollDataHash(repository.getRunBundle(HR, { run_id: run.run_id }).results);
  run = repository.transitionRun(HR, { run_id: run.run_id, status: "previewed", result_hash: resultHash, expected_version: 2 });
  run = repository.transitionRun(APPROVER, { run_id: run.run_id, status: "approved", expected_version: 3, step_up_receipt_ref: "artifact:step-up/payroll-repository-test", step_up_receipt_hash: HASH_A });
  run = repository.transitionRun(APPROVER, { run_id: run.run_id, status: "closed", expected_version: 4 });
  period = repository.transitionPeriod(APPROVER, { period_id: period.period_id, status: "closed", expected_version: 2 });
  return { period, run, snapshot, result };
}

test("PY-DATA-001/002/006 persists a tenant-scoped payroll run, immutable inputs, results, line items, and audit chain", () => {
  const { filePath, store } = createDurableStore();
  seedEmployee(store);
  const repository = payroll(store);
  repository.createProfile(HR, {
    payroll_profile_id: "profile-001",
    employee_id: "emp-001",
    employment_type: "monthly",
    pay_group_code: "KR-MONTHLY",
    compensation_ref: "compensation:encrypted/emp-001/v1",
    effective_from: "2026-01-01",
  });
  const { run, snapshot, result } = createClosedRun(repository);
  assert.equal(run.status, "closed");
  assert.equal(repository.getRunBundle(HR, { run_id: run.run_id }).line_items.length, 2);
  assert.equal(repository.getRun({ tenant_id: "tenant-other", actor_id: "hr" }, { run_id: run.run_id }), undefined);
  assert.throws(() => store.query("updateOne", { table: "hrx_payroll_input_snapshots", where: { tenant_id: TENANT, snapshot_id: snapshot.snapshot_id }, patch: { payable_minutes: 1 } }), /append-only/);
  assert.throws(() => store.query("deleteOne", { table: "hrx_payroll_employee_results", where: { tenant_id: TENANT, result_id: result.result_id } }), /append-only/);
  const audit = repository.listAuditEvents(HR);
  assert.ok(audit.length >= 12);
  assert.equal(audit[0].previous_hash, null);
  for (let index = 1; index < audit.length; index += 1) assert.equal(audit[index].previous_hash, audit[index - 1].event_hash);
  store.close();

  const reopened = createFileHrxStore({ filePath });
  const durable = payroll(reopened).getRunBundle(HR, { run_id: run.run_id });
  assert.deepEqual([durable.snapshots.length, durable.results.length, durable.line_items.length], [1, 1, 2]);
  assert.equal(durable.results[0].net_krw, 4_500_000);
  reopened.close();
});

test("MG-002 keeps payroll profiles mutable through audited optimistic CAS", () => {
  const store = createFileHrxStore();
  seedEmployee(store);
  const repository = payroll(store);
  const profile = repository.createProfile(HR, {
    payroll_profile_id: "profile-mutable",
    employee_id: "emp-001",
    employment_type: "monthly",
    pay_group_code: "KR-MONTHLY",
    compensation_ref: "compensation:encrypted/emp-001/v1",
    effective_from: "2026-01-01",
  });

  const updated = repository.updateProfile(HR, {
    payroll_profile_id: profile.payroll_profile_id,
    pay_group_code: "KR-MONTHLY-UPDATED",
    expected_version: 1,
  });
  assert.equal(updated.pay_group_code, "KR-MONTHLY-UPDATED");
  assert.equal(updated.state_version, 2);
  assert.throws(
    () => repository.updateProfile(HR, {
      payroll_profile_id: profile.payroll_profile_id,
      pay_group_code: "STALE-WRITE",
      expected_version: 1,
    }),
    (error) => error.safe_error_code === "HRX_STATE_VERSION_CONFLICT",
  );
  assert.equal(repository.listAuditEvents(HR, { object_id: profile.payroll_profile_id }).at(-1).action, "hrx.payroll.profile.update");
  store.close();
});

test("PY-DATA-003 publishes contiguous four-eye rule versions and makes published history immutable", () => {
  const store = createFileHrxStore();
  const repository = payroll(store);
  let first = repository.createRuleVersion(HR, { rule_version_id: "rule-tax-h1", rule_kind: "synthetic_income_tax", version_code: "2026-H1", effective_from: "2026-01-01", effective_to: "2026-06-30", source_document_hash: HASH_A, rules: { fixture_only: true, rate_basis_points: 1000 } });
  assert.throws(() => repository.reviewRuleVersion(HR, { rule_version_id: first.rule_version_id, expected_version: 1 }), (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL");
  first = repository.reviewRuleVersion(APPROVER, { rule_version_id: first.rule_version_id, expected_version: 1 });
  first = repository.publishRuleVersion(APPROVER, { rule_version_id: first.rule_version_id, expected_version: 2 });
  assert.equal(first.approval_state, "published");
  assert.throws(() => store.query("updateOne", { table: "hrx_payroll_rule_versions", where: { tenant_id: TENANT, rule_version_id: first.rule_version_id }, expected_version: 3, patch: { effective_to: "2026-07-01", state_version: 4 } }), /immutable/);

  let gap = repository.createRuleVersion(HR, { rule_version_id: "rule-tax-gap", rule_kind: "synthetic_income_tax", version_code: "2026-H2-GAP", effective_from: "2026-07-02", effective_to: "2026-12-31", source_document_hash: HASH_B, rules: { fixture_only: true } });
  gap = repository.reviewRuleVersion(APPROVER, { rule_version_id: gap.rule_version_id, expected_version: 1 });
  assert.throws(() => repository.publishRuleVersion(APPROVER, { rule_version_id: gap.rule_version_id, expected_version: 2 }), (error) => error.safe_error_code === "HRX_PAYROLL_RULE_COVERAGE_INVALID");

  let second = repository.createRuleVersion(HR, { rule_version_id: "rule-tax-h2", rule_kind: "synthetic_income_tax", version_code: "2026-H2", effective_from: "2026-07-01", effective_to: "2026-12-31", source_document_hash: HASH_B, rules: { fixture_only: true, rate_basis_points: 1100 } });
  second = repository.reviewRuleVersion(APPROVER, { rule_version_id: second.rule_version_id, expected_version: 1 });
  second = repository.publishRuleVersion(APPROVER, { rule_version_id: second.rule_version_id, expected_version: 2 });
  assert.deepEqual(repository.listRuleVersions(HR, { rule_kind: "synthetic_income_tax" }).filter((row) => row.approval_state === "published").map((row) => row.version_code), ["2026-H1", "2026-H2"]);
  store.close();
});

test("PY-DATA-004/005 stores tokenized statement, delivery, payment, and filing receipts without provider success inflation", () => {
  const store = createFileHrxStore();
  seedEmployee(store);
  const repository = payroll(store);
  const { run } = createClosedRun(repository);
  let template = repository.createStatementTemplate(HR, { template_id: "template-v1", version_code: "v1", schema: { fields: ["gross", "deductions", "net"] } });
  template = repository.publishStatementTemplate(APPROVER, { template_id: template.template_id, expected_version: 1 });
  let statement = repository.createStatement(HR, { statement_id: "statement-001", run_id: run.run_id, employee_id: "emp-001", template_id: template.template_id, document_ref: "vault:payroll/2026-07/emp-001.pdf", document_hash: HASH_A });
  let delivery = repository.createDeliveryReceipt(HR, { delivery_receipt_id: "delivery-001", statement_id: statement.statement_id, channel: "self_service" });
  assert.equal(delivery.state, "queued");
  assert.throws(() => repository.transitionDeliveryReceipt(HR, { delivery_receipt_id: delivery.delivery_receipt_id, state: "delivered", expected_version: 1 }), /provider_receipt_ref/);
  delivery = repository.transitionDeliveryReceipt(HR, { delivery_receipt_id: delivery.delivery_receipt_id, state: "delivered", expected_version: 1, provider_id: "sandbox-payroll-delivery", provider_receipt_ref: "provider:sandbox/delivery-001", receipt_hash: HASH_B });
  const duplicateProviderReceipt = repository.createDeliveryReceipt(HR, {
    delivery_receipt_id: "delivery-duplicate-provider-ref",
    statement_id: statement.statement_id,
    channel: "email",
  });
  assert.throws(
    () => repository.transitionDeliveryReceipt(HR, {
      delivery_receipt_id: duplicateProviderReceipt.delivery_receipt_id,
      state: "delivered",
      expected_version: 1,
      provider_id: "sandbox-payroll-delivery",
      provider_receipt_ref: delivery.provider_receipt_ref,
      receipt_hash: HASH_B,
    }),
    /unique constraint failed: tenant_id, provider_receipt_ref/,
  );
  statement = repository.transitionStatement(HR, { statement_id: statement.statement_id, state: "delivered", expected_version: 1 });
  assert.equal(statement.state, "delivered");

  let batch = repository.createPaymentBatch(HR, { payment_batch_id: "payment-batch-001", run_id: run.run_id, bank_format_code: "SYNTHETIC", checksum: HASH_A });
  let item = repository.addPaymentItem(HR, { payment_item_id: "payment-item-001", payment_batch_id: batch.payment_batch_id, employee_id: "emp-001", tokenized_account_ref: "token:bank/emp-001", amount_krw: 4_500_000 });
  assert.throws(() => repository.transitionPaymentBatch(HR, { payment_batch_id: batch.payment_batch_id, state: "approved", expected_version: 1 }), (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL");
  batch = repository.transitionPaymentBatch(APPROVER, { payment_batch_id: batch.payment_batch_id, state: "approved", expected_version: 1 });
  batch = repository.transitionPaymentBatch(APPROVER, { payment_batch_id: batch.payment_batch_id, state: "exported", expected_version: 2, artifact_ref: "artifact:bank/payment-batch-001" });
  item = repository.transitionPaymentItem(APPROVER, { payment_item_id: item.payment_item_id, state: "exported", expected_version: 1 });
  assert.throws(() => repository.transitionPaymentItem(APPROVER, { payment_item_id: item.payment_item_id, state: "paid", expected_version: 2 }), /provider_receipt_ref/);
  item = repository.transitionPaymentItem(APPROVER, { payment_item_id: item.payment_item_id, state: "paid", expected_version: 2, provider_receipt_ref: "provider:sandbox/payment-item-001" });
  batch = repository.transitionPaymentBatch(APPROVER, { payment_batch_id: batch.payment_batch_id, state: "reconciled", expected_version: 3, provider_receipt_ref: "provider:sandbox/payment-batch-001" });
  assert.equal(item.state, "paid");
  assert.equal(batch.state, "reconciled");

  let filing = repository.createFilingJob(HR, { filing_job_id: "filing-001", run_id: run.run_id, filing_kind: "withholding", schema_version: "synthetic-v1", package_ref: "artifact:filing/001", package_hash: HASH_A });
  filing = repository.transitionFilingJob(HR, { filing_job_id: filing.filing_job_id, state: "validated", expected_version: 1 });
  filing = repository.transitionFilingJob(HR, { filing_job_id: filing.filing_job_id, state: "submitted", expected_version: 2 });
  assert.equal(filing.provider_receipt_ref, null);
  filing = repository.transitionFilingJob(HR, { filing_job_id: filing.filing_job_id, state: "accepted", expected_version: 3, provider_receipt_ref: "provider:sandbox/filing-001" });
  assert.equal(filing.state, "accepted");
  store.close();
});

test("PY-DATA-002/005 rejects raw PII, raw bank references, inconsistent money, and stale CAS", () => {
  const store = createFileHrxStore();
  seedEmployee(store);
  const repository = payroll(store);
  const period = repository.createPeriod(HR, { period_id: "period-security", period_code: "2026-08", period_start: "2026-08-01", period_end: "2026-08-31", cutoff_at: NOW, pay_date: "2026-09-05" });
  assert.throws(() => repository.transitionPeriod(HR, { period_id: period.period_id, status: "open", expected_version: 2 }), (error) => error.safe_error_code === "HRX_STATE_VERSION_CONFLICT");
  assert.throws(() => repository.createProfile(HR, { employee_id: "emp-001", employment_type: "monthly", pay_group_code: "KR", compensation_ref: "5000000", effective_from: "2026-01-01" }), /tokenized reference/);
  const run = repository.createRun(HR, { run_id: "run-security", period_id: period.period_id });
  assert.throws(() => repository.createInputSnapshot(HR, { run_id: run.run_id, employee_id: "emp-001", source_refs: [{ kind: "attendance", ref: "artifact:attendance/001", hash: HASH_A, email: "private@example.com" }] }), /private field: email/);
  const snapshot = repository.createInputSnapshot(HR, { snapshot_id: "snapshot-security", run_id: run.run_id, employee_id: "emp-001", source_refs: [{ kind: "attendance", ref: "artifact:attendance/001", hash: HASH_A }] });
  assert.throws(() => repository.createEmployeeResult(HR, { run_id: run.run_id, employee_id: "emp-001", input_snapshot_id: snapshot.snapshot_id, gross_krw: 1000, deduction_krw: 100, net_krw: 950 }), /totals are inconsistent/);
  const batch = repository.createPaymentBatch(HR, { payment_batch_id: "batch-security", run_id: run.run_id, bank_format_code: "SYNTHETIC", checksum: HASH_A });
  assert.throws(() => repository.addPaymentItem(HR, { payment_batch_id: batch.payment_batch_id, employee_id: "emp-001", tokenized_account_ref: "110-123-456789", amount_krw: 1 }), /tokenized reference/);
  store.close();
});

test("PY-DATA-006 rolls back the business row when audit append fails", () => {
  const store = createFileHrxStore();
  const repository = payroll(store, () => "fixed-audit-id");
  repository.createPeriod(HR, { period_id: "period-atomic-1", period_code: "atomic-1", period_start: "2026-01-01", period_end: "2026-01-31", cutoff_at: NOW, pay_date: "2026-02-05" });
  assert.throws(() => repository.createPeriod(HR, { period_id: "period-atomic-2", period_code: "atomic-2", period_start: "2026-02-01", period_end: "2026-02-28", cutoff_at: NOW, pay_date: "2026-03-05" }), /already exists/);
  assert.equal(repository.getPeriod(HR, { period_id: "period-atomic-2" }), undefined);
  assert.equal(repository.listPeriods(HR).length, 1);
  store.close();
});

test("PEO-FIX createRun never accepts adjustment input or persists an empty adjustment", () => {
  const store = createFileHrxStore();
  seedEmployee(store);
  const repository = payroll(store);
  const period = repository.createPeriod(HR, {
    period_id: "period-adjustment-guard",
    period_code: "2026-09",
    period_start: "2026-09-01",
    period_end: "2026-09-30",
    cutoff_at: NOW,
    pay_date: "2026-10-05",
  });

  assert.throws(
    () => repository.createRun(HR, {
      run_id: "run-adjustment-fallback",
      period_id: period.period_id,
      run_type: "adjustment",
      previous_run_id: "run-closed-source",
      correction_key: "CORR-REPOSITORY-FALLBACK",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_ADJUSTMENT_EMPTY" && error.status === 409,
  );
  assert.equal(repository.listRuns(HR, { period_id: period.period_id }).length, 0);
  assert.throws(
    () => repository.createAdjustmentRun(HR, {
      period_id: period.period_id,
      previous_run_id: "run-closed-source",
      correction_key: "CORR-REPOSITORY-EMPTY",
      adjustments: [],
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_ADJUSTMENT_EMPTY" && error.status === 409,
  );
  assert.equal(repository.listRuns(HR, { period_id: period.period_id }).length, 0);
  store.close();
});
