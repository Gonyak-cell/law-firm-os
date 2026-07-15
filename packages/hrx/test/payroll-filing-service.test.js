import assert from "node:assert/strict";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import {
  SYNTHETIC_PAYROLL_FILING_SCHEMAS,
  calculateRetirementBenefit,
  calculateRetirementPlanContribution,
  calculateRetirementPlanContributions,
  calculateTerminationSettlement,
  calculateYearEndSettlement,
  createPayrollFilingService,
} from "../src/payroll/filing-service.js";
import { createPayrollDataHash, createPayrollRepository } from "../src/payroll/repository.js";
import { HRX_PROVIDER_RECEIPT_SCHEMA_VERSION } from "../src/provider-receipt-contract.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-payroll-filing";
const NOW = "2026-07-15T06:00:00.000Z";
const PREPARER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-preparer" });
const APPROVER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-approver" });
const HASH = "d".repeat(64);

function runtime(providerPort = null) {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const hr = createSqlHrxRepository({ store, clock: () => NOW });
  for (const [employee_id, display_name] of [["emp-001", "Employee One"], ["emp-002", "Employee Two"]]) {
    hr.createEmployee({ tenant_id: TENANT, employee_id, display_name, status: "active" });
  }
  let sequence = 0;
  const repository = createPayrollRepository({ store, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++sequence}` });
  let period = repository.createPeriod(PREPARER, { period_id: "period-filing", period_code: "2026-07", period_start: "2026-07-01", period_end: "2026-07-31", cutoff_at: NOW, pay_date: "2026-08-05" });
  period = repository.transitionPeriod(PREPARER, { period_id: period.period_id, status: "open", expected_version: period.state_version });
  let run = repository.createRun(PREPARER, { run_id: "run-filing", period_id: period.period_id });
  for (const [index, employeeId] of ["emp-001", "emp-002"].entries()) {
    const snapshot = repository.createInputSnapshot(PREPARER, { snapshot_id: `snapshot-${index}`, run_id: run.run_id, employee_id: employeeId, source_refs: [{ kind: "attendance", ref: `artifact:attendance/${employeeId}`, hash: HASH }] });
    const gross = 4_000_000 + index * 1_000_000;
    const pension = 180_000 + index * 45_000;
    const health = 140_000 + index * 35_000;
    const care = 18_000 + index * 4_500;
    const employment = 36_000 + index * 9_000;
    const deduction = pension + health + care + employment;
    const result = repository.createEmployeeResult(PREPARER, { run_id: run.run_id, employee_id: employeeId, input_snapshot_id: snapshot.snapshot_id, gross_krw: gross, deduction_krw: deduction, net_krw: gross - deduction });
    for (const [item_code, amount_krw] of [["NATIONAL_PENSION", pension], ["HEALTH_INSURANCE", health], ["LONG_TERM_CARE", care], ["EMPLOYMENT_INSURANCE", employment]]) {
      repository.addLineItem(PREPARER, { result_id: result.result_id, item_kind: "deduction", item_code, formula_code: "SYNTHETIC_V1", amount_krw });
    }
  }
  run = repository.transitionRun(PREPARER, { run_id: run.run_id, status: "snapshot_ready", snapshot_hash: createPayrollDataHash(repository.getRunBundle(PREPARER, { run_id: run.run_id }).snapshots), expected_version: run.state_version });
  run = repository.transitionRun(PREPARER, { run_id: run.run_id, status: "previewed", result_hash: createPayrollDataHash(repository.getRunBundle(PREPARER, { run_id: run.run_id }).results), expected_version: run.state_version });
  run = repository.transitionRun(APPROVER, { run_id: run.run_id, status: "approved", expected_version: run.state_version, step_up_receipt_ref: "artifact:step-up/filing", step_up_receipt_hash: HASH });
  run = repository.transitionRun(APPROVER, { run_id: run.run_id, status: "closed", expected_version: run.state_version });
  return { store, repository, run, service: createPayrollFilingService({ repository, providerPort, clock: () => NOW }) };
}

function providerReceipt(request, state) {
  return {
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: `filing-receipt-${request.filing_job_id}-${state}`,
    tenant_id: request.tenant_id,
    provider_kind: "filing",
    provider_id: "synthetic-filing-sandbox",
    operation: `filing.${request.filing_kind}`,
    idempotency_key: request.idempotency_key,
    payload_hash: request.payload_hash,
    state,
    requested_at: NOW,
    completed_at: state === "pending" ? null : NOW,
    provider_receipt_ref: state === "succeeded" ? `provider:sandbox/filing/${request.filing_job_id}` : null,
    error_code: state === "failed" ? "SANDBOX_REJECTED" : null,
  };
}

test("PY-TAX-001/002/006 calculates retirement, plan, termination, and year-end values without a production-ready claim", () => {
  assert.deepEqual(calculateRetirementBenefit({ service_days: 365, average_wage_period_total_krw: 9_000_000, average_wage_period_days: 90, legal_review_receipt_ref: "provider:legal/review" }), {
    service_days: 365,
    excluded_days: 0,
    eligible_service_days: 365,
    minimum_service_days: 365,
    average_daily_wage_krw: 100_000,
    retirement_benefit_krw: 3_000_000,
    manual_review_required: false,
    production_ready_claim: false,
  });
  assert.equal(calculateRetirementBenefit({ service_days: 364, average_wage_period_total_krw: 9_000_000, average_wage_period_days: 90 }).retirement_benefit_krw, 0);
  const dc = calculateRetirementPlanContribution({ plan_type: "dc", annual_compensation_krw: 60_000_000, contribution_rate_bps: 1_000, transfer_ref: "provider:retirement/dc-1", employee_id: "emp-001", period_code: "2026" });
  assert.equal(dc.contribution_krw, 6_000_000);
  assert.equal(dc.duplicate_key, calculateRetirementPlanContribution({ plan_type: "dc", annual_compensation_krw: 60_000_000, contribution_rate_bps: 1_000, transfer_ref: "provider:retirement/dc-1", employee_id: "emp-001", period_code: "2026" }).duplicate_key);
  const plans = calculateRetirementPlanContributions([
    { plan_type: "dc", annual_compensation_krw: 60_000_000, contribution_rate_bps: 1_000, transfer_ref: "provider:retirement/dc-1", employee_id: "emp-001", period_code: "2026" },
    { plan_type: "irp", annual_compensation_krw: 48_000_000, contribution_rate_bps: 500, transfer_ref: "provider:retirement/irp-1", employee_id: "emp-002", period_code: "2026" },
  ]);
  assert.deepEqual(plans.totals, { dc_krw: 6_000_000, irp_krw: 2_400_000, total_krw: 8_400_000, contribution_count: 2 });
  assert.throws(() => calculateRetirementPlanContributions([
    { plan_type: "dc", annual_compensation_krw: 60_000_000, contribution_rate_bps: 1_000, transfer_ref: "provider:retirement/dc-1", employee_id: "emp-001", period_code: "2026" },
    { plan_type: "dc", annual_compensation_krw: 60_000_000, contribution_rate_bps: 1_000, transfer_ref: "provider:retirement/dc-1", employee_id: "emp-001", period_code: "2026" },
  ]), (error) => error.safe_error_code === "HRX_PAYROLL_RETIREMENT_PLAN_DUPLICATE");
  const termination = calculateTerminationSettlement({ termination_date: "2026-07-31", employment_start_date: "2024-01-01", last_payroll_net_krw: 3_000_000, unused_leave_krw: 500_000, tax_adjustment_krw: -100_000, insurance_adjustment_krw: -50_000, retirement_benefit_krw: 3_000_000, last_payroll_result_ref: "artifact:payroll-result/final", unused_leave_source_ref: "artifact:leave-ledger/final", tax_rule_version_ref: "artifact:tax-rule/2026", insurance_rule_version_ref: "artifact:insurance-rule/2026", tax_review_receipt_ref: "provider:tax/review", labor_review_receipt_ref: "provider:labor/review" });
  assert.equal(termination.settlement_total_krw, 6_350_000);
  assert.equal(termination.manual_review_required, false);
  assert.throws(() => calculateTerminationSettlement({ ...termination, employment_start_date: "2026-08-01" }), (error) => error.safe_error_code === "HRX_PAYROLL_TERMINATION_DATE_INVALID");
  assert.equal(calculateYearEndSettlement({ employee_id: "emp-001", tax_year: 2026, taxable_income_krw: 48_000_000, determined_tax_krw: 2_000_000, withheld_tax_krw: 2_200_000, collection_complete: true, tax_review_receipt_ref: "provider:tax/review" }).settlement_krw, 200_000);
});

test("PY-TAX-003/004/005 creates validated fixture-only filing packages and rejects totals or schemas that are not approved", () => {
  const { store, repository, run, service } = runtime();
  const withholding = service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "withholding", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding });
  assert.equal(service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "withholding", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding }).filing_job_id, withholding.filing_job_id);
  assert.equal(service.validate(PREPARER, { filing_job_id: withholding.filing_job_id }).state, "validated");
  const social = service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "social_insurance", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance });
  assert.equal(social.state, "draft");
  assert.throws(() => service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "payment_statement", schema_version: "kr.nts.production.v1" }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_SCHEMA_UNAPPROVED");
  assert.throws(() => service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "payment_statement", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.payment_statement, records: [{ employee_id: "emp-001", gross_krw: 1, deduction_krw: 1, net_krw: 0 }] }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_TOTAL_MISMATCH");
  assert.equal(repository.listFilingJobs(PREPARER).length, 2);
  store.close();
});

test("PY-TAX-003/004/005/007 keeps pending submissions retryable and persists provider accepted/rejected/corrected states with outbox evidence", async () => {
  let state = "pending";
  const port = { async submit(request) { return providerReceipt(request, state); } };
  const { store, repository, run, service } = runtime(port);
  const acceptedJob = service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "withholding", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding });
  service.validate(PREPARER, { filing_job_id: acceptedJob.filing_job_id });
  assert.equal((await service.submit(APPROVER, { filing_job_id: acceptedJob.filing_job_id })).job.state, "submitted");
  state = "succeeded";
  assert.equal((await service.submit(APPROVER, { filing_job_id: acceptedJob.filing_job_id })).job.state, "accepted");

  const rejectedJob = service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "payment_statement", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.payment_statement });
  service.validate(PREPARER, { filing_job_id: rejectedJob.filing_job_id });
  state = "failed";
  assert.equal((await service.submit(APPROVER, { filing_job_id: rejectedJob.filing_job_id })).job.state, "rejected");
  assert.equal(service.correct(PREPARER, { filing_job_id: rejectedJob.filing_job_id }).state, "corrected");
  assert.equal(service.validate(PREPARER, { filing_job_id: rejectedJob.filing_job_id }).state, "validated");
  const eventTypes = repository.listOutboxEvents(PREPARER, { run_id: run.run_id }).filter((row) => row.event_type.startsWith("payroll.filing.")).map((row) => row.event_type);
  assert.deepEqual(eventTypes, ["payroll.filing.submitted", "payroll.filing.accepted", "payroll.filing.submitted", "payroll.filing.rejected"]);
  store.close();
});
