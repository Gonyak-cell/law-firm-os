import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

function runtime(providerPort = null, {
  filePath,
  initialState,
  clock = () => NOW,
  seed = true,
  artifactVault,
  submissionLeaseDurationMs,
  faultInjector,
} = {}) {
  const store = createFileHrxStore({ filePath, initialState });
  runHrxMigrations(store);
  const hr = createSqlHrxRepository({ store, clock });
  let sequence = seed ? 0 : 1_000;
  const repository = createPayrollRepository({
    store,
    clock,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    ...(faultInjector ? { faultInjector } : {}),
  });
  if (!seed) {
    const run = repository.getRun(PREPARER, { run_id: "run-filing" });
    return {
      store,
      repository,
      run,
      service: createPayrollFilingService({
        repository,
        providerPort,
        clock,
        ...(artifactVault ? { artifactVault } : {}),
        ...(submissionLeaseDurationMs ? { submissionLeaseDurationMs } : {}),
      }),
    };
  }
  for (const [employee_id, display_name] of [["emp-001", "Employee One"], ["emp-002", "Employee Two"]]) {
    hr.createEmployee({ tenant_id: TENANT, employee_id, display_name, status: "active" });
  }
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
  return {
    store,
    repository,
    run,
    service: createPayrollFilingService({
      repository,
      providerPort,
      clock,
      ...(artifactVault ? { artifactVault } : {}),
      ...(submissionLeaseDurationMs ? { submissionLeaseDurationMs } : {}),
    }),
  };
}

function closeAdjustmentRun(repository, sourceRun, {
  runId = `run-adjustment-${sourceRun.run_id}`,
  employeeId = "emp-001",
  grossKrw = 100_000,
  deductionKrw = 10_000,
  deductionLines = [["EMPLOYMENT_INSURANCE", deductionKrw]],
  correctionKey = `correction-${runId}`,
} = {}) {
  let run = repository.createAdjustmentRun(PREPARER, {
    run_id: runId,
    period_id: sourceRun.period_id,
    previous_run_id: sourceRun.run_id,
    correction_key: correctionKey,
    adjustments: [{
      employee_id: employeeId,
      reason_code: "CORRECTION",
      amount_krw: 100_000,
      taxable: true,
    }],
  }).run;
  const snapshot = repository.createInputSnapshot(PREPARER, {
    snapshot_id: `snapshot-${runId}`,
    run_id: run.run_id,
    employee_id: employeeId,
    source_refs: [{ kind: "attendance", ref: `artifact:attendance/${runId}`, hash: HASH }],
  });
  const result = repository.createEmployeeResult(PREPARER, {
    result_id: `result-${runId}`,
    run_id: run.run_id,
    employee_id: employeeId,
    input_snapshot_id: snapshot.snapshot_id,
    gross_krw: grossKrw,
    deduction_krw: deductionKrw,
    net_krw: grossKrw - deductionKrw,
  });
  for (const [itemCode, amountKrw] of deductionLines) {
    repository.addLineItem(PREPARER, {
      result_id: result.result_id,
      item_kind: "deduction",
      item_code: itemCode,
      formula_code: "ADJUSTMENT_DELTA_V1",
      amount_krw: amountKrw,
    });
  }
  run = repository.transitionRun(PREPARER, {
    run_id: run.run_id,
    status: "snapshot_ready",
    snapshot_hash: createPayrollDataHash([snapshot]),
    expected_version: run.state_version,
  });
  run = repository.transitionRun(PREPARER, {
    run_id: run.run_id,
    status: "previewed",
    result_hash: createPayrollDataHash(repository.getRunBundle(PREPARER, { run_id: run.run_id }).results),
    expected_version: run.state_version,
  });
  run = repository.transitionRun(APPROVER, {
    run_id: run.run_id,
    status: "approved",
    expected_version: run.state_version,
    step_up_receipt_ref: `artifact:step-up/${runId}`,
    step_up_receipt_hash: createPayrollDataHash({ run_id: runId, action: "approve" }),
  });
  return repository.transitionRun(APPROVER, {
    run_id: run.run_id,
    status: "closed",
    expected_version: run.state_version,
  });
}

function providerReceipt(request, state, providerReceiptRef = null) {
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
    provider_receipt_ref: state === "succeeded"
      ? providerReceiptRef ?? `provider:sandbox/filing/${request.filing_job_id}`
      : null,
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

test("PY-TAX-003/004/005 creates closed-run filing packages and rejects public record overrides or unapproved schemas", async () => {
  const { store, repository, run, service } = runtime();
  const withholding = await service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "withholding", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding });
  assert.equal((await service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "withholding", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding })).filing_job_id, withholding.filing_job_id);
  assert.equal(service.validate(PREPARER, { filing_job_id: withholding.filing_job_id }).state, "validated");
  const social = await service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "social_insurance", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance });
  assert.equal(social.state, "draft");
  await assert.rejects(service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "payment_statement", schema_version: "kr.nts.production.v1" }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_SCHEMA_UNAPPROVED");
  await assert.rejects(service.createPackage(PREPARER, {
    run_id: run.run_id,
    filing_kind: "payment_statement",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.payment_statement,
    records: [{ employee_id: "emp-002", source_result_ref: "artifact:payroll-result/swapped", gross_krw: 1, deduction_krw: 1, net_krw: 0 }],
  }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_RECORDS_FORBIDDEN");
  assert.equal(repository.listFilingJobs(PREPARER).length, 2);
  store.close();
});

test("PEO-FIX-069 builds employee-linked canonical records and reconciles social-insurance totals without exposing records in the job response", async () => {
  const artifacts = new Map();
  const artifactVault = {
    async put(input) {
      artifacts.set(input.object_id, Buffer.from(input.bytes));
      return { document_ref: `vault:payroll-filing/${input.object_id}` };
    },
  };
  const { store, run, service } = runtime(null, { artifactVault });
  const social = await service.createPackage(PREPARER, {
    run_id: run.run_id,
    filing_kind: "social_insurance",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance,
  });
  const payload = JSON.parse([...artifacts.values()][0].toString("utf8"));
  assert.deepEqual(
    payload.records.map((row) => [
      row.employee_id,
      row.source_result_ref,
      row.source_result_hash.length,
      row.total_social_insurance_krw,
    ]),
    [
      ["emp-001", payload.records[0].source_result_ref, 64, 374_000],
      ["emp-002", payload.records[1].source_result_ref, 64, 467_500],
    ],
  );
  assert.match(payload.records[0].source_result_ref, /^artifact:payroll-result\//);
  assert.match(payload.records[1].source_result_ref, /^artifact:payroll-result\//);
  assert.notEqual(payload.records[0].source_result_ref, payload.records[1].source_result_ref);
  assert.deepEqual(payload.totals, {
    deduction_krw: 841_500,
    employment_insurance_krw: 81_000,
    gross_krw: 9_000_000,
    health_insurance_krw: 315_000,
    long_term_care_krw: 40_500,
    national_pension_krw: 405_000,
    net_krw: 8_158_500,
    total_social_insurance_krw: 841_500,
  });
  assert.equal(payload.canonical_record_schema_version, "law-firm-os.hrx.payroll-filing-record.v1");
  assert.match(payload.canonical_source_fingerprint, /^[a-f0-9]{64}$/);
  assert.match(payload.canonical_change_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(payload.records.every((row) => row.filing_items.every((item) => (
    /^artifact:payroll-line\//.test(item.source_line_ref)
      && /^[a-f0-9]{64}$/.test(item.source_line_hash)
  ))), true);
  const publicJob = JSON.stringify(social);
  for (const forbidden of ["records", "gross_krw", "deduction_krw", "net_krw", "account_number", "tax_identifier"]) {
    assert.equal(publicJob.includes(forbidden), false, `${forbidden} must not be returned in the filing job response`);
  }
  await assert.rejects(service.createPackage(PREPARER, {
    run_id: run.run_id,
    filing_kind: "payment_statement",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.payment_statement,
    records: payload.records.map((row) => ({
      ...row,
      employee_id: row.employee_id === "emp-001" ? "emp-002" : "emp-001",
    })),
  }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_RECORDS_FORBIDDEN");
  store.close();
});

test("PEO-FIX-069 blocks closed-run amount tampering and rejects injected social-insurance lines", async () => {
  const amountTamper = runtime();
  const result = amountTamper.repository.getRunBundle(PREPARER, { run_id: amountTamper.run.run_id }).results[0];
  assert.throws(() => amountTamper.store.query("updateOne", {
      table: "hrx_payroll_employee_results",
      where: { tenant_id: TENANT, result_id: result.result_id },
      patch: {
        gross_krw: result.gross_krw + 1,
        net_krw: result.net_krw + 1,
      },
    }), /append-only/);
  amountTamper.store.close();

  const insuranceInjection = runtime();
  const injectionResult = insuranceInjection.repository.getRunBundle(PREPARER, {
    run_id: insuranceInjection.run.run_id,
  }).results[0];
  assert.throws(() => insuranceInjection.repository.addLineItem(PREPARER, {
      result_id: injectionResult.result_id,
      item_kind: "deduction",
      item_code: "INJECTED_SOCIAL_INSURANCE",
      formula_code: "UNTRUSTED",
      amount_krw: 1,
    }), (error) => error.safe_error_code === "HRX_PAYROLL_RESULT_IMMUTABLE");
  insuranceInjection.store.query("insert", {
    table: "hrx_payroll_line_items",
    row: {
      tenant_id: TENANT,
      line_item_id: "line-direct-injection",
      result_id: injectionResult.result_id,
      item_kind: "deduction",
      item_code: "INJECTED_SOCIAL_INSURANCE",
      formula_code: "UNTRUSTED",
      rule_version_id: null,
      amount_krw: 1,
      quantity_minutes: null,
      metadata_json: "{}",
      created_at: NOW,
    },
  });
  await assert.rejects(insuranceInjection.service.createPackage(PREPARER, {
    run_id: insuranceInjection.run.run_id,
    filing_kind: "social_insurance",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance,
  }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_SOURCE_HASH_MISMATCH");
  insuranceInjection.store.close();
});

test("PEO-FIX-069 rejects post-close line addition, deletion, amount changes, and kind changes against the sealed filing source", async () => {
  const baseline = runtime();
  assert.match(baseline.run.filing_source_hash, /^[a-f0-9]{64}$/);
  const originalState = baseline.store.snapshot();
  const originalLine = originalState.tables.hrx_payroll_line_items[0];
  baseline.store.close();

  const variants = [
    ["addition", (state) => state.tables.hrx_payroll_line_items.push({
      ...originalLine,
      line_item_id: "line-post-close-injection",
      item_kind: "employer_contribution",
      item_code: "INJECTED_EMPLOYER_CONTRIBUTION",
      amount_krw: 999_999,
    })],
    ["deletion", (state) => {
      state.tables.hrx_payroll_line_items = state.tables.hrx_payroll_line_items
        .filter((line) => line.line_item_id !== originalLine.line_item_id);
    }],
    ["amount", (state) => {
      state.tables.hrx_payroll_line_items.find((line) => line.line_item_id === originalLine.line_item_id).amount_krw += 1;
    }],
    ["kind", (state) => {
      state.tables.hrx_payroll_line_items.find((line) => line.line_item_id === originalLine.line_item_id).item_kind = "employer_contribution";
    }],
  ];

  for (const [label, mutate] of variants) {
    const state = structuredClone(originalState);
    mutate(state);
    const tampered = runtime(null, { seed: false, initialState: state });
    await assert.rejects(tampered.service.createPackage(PREPARER, {
      run_id: tampered.run.run_id,
      filing_kind: "social_insurance",
      schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance,
    }), (error) => {
      assert.equal(error.safe_error_code, "HRX_PAYROLL_FILING_SOURCE_HASH_MISMATCH", label);
      return true;
    });
    assert.equal(tampered.repository.listFilingJobs(PREPARER, { run_id: tampered.run.run_id }).length, 0, label);
    tampered.store.close();
  }
});

test("PEO-FIX-069 fails closed with an explicit verification-required 409 for a pre-047 closed run", async () => {
  const baseline = runtime();
  const legacyState = baseline.store.snapshot();
  legacyState.tables.hrx_payroll_runs
    .find((run) => run.run_id === baseline.run.run_id).filing_source_hash = null;
  baseline.store.close();

  const upgraded = runtime(null, { seed: false, initialState: legacyState });
  await assert.rejects(upgraded.service.createPackage(PREPARER, {
    run_id: upgraded.run.run_id,
    filing_kind: "social_insurance",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance,
  }), (error) => {
    assert.equal(error.safe_error_code, "HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED");
    assert.equal(error.status, 409);
    return true;
  });
  assert.equal(upgraded.repository.listFilingJobs(PREPARER, { run_id: upgraded.run.run_id }).length, 0);
  upgraded.store.close();

  const packaged = runtime();
  const oldJob = await packaged.service.createPackage(PREPARER, {
    run_id: packaged.run.run_id,
    filing_kind: "social_insurance",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance,
  });
  const packagedLegacyState = packaged.store.snapshot();
  packagedLegacyState.tables.hrx_payroll_runs
    .find((run) => run.run_id === packaged.run.run_id).filing_source_hash = null;
  packaged.store.close();

  const upgradedDraft = runtime(null, { seed: false, initialState: packagedLegacyState });
  await assert.rejects(upgradedDraft.service.createPackage(PREPARER, {
    run_id: upgradedDraft.run.run_id,
    filing_kind: "social_insurance",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance,
  }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED");
  assert.throws(upgradedDraft.service.validate.bind(null, PREPARER, {
    filing_job_id: oldJob.filing_job_id,
  }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED");
  upgradedDraft.store.close();

  let providerCalls = 0;
  const validatedLegacyState = structuredClone(packagedLegacyState);
  const validatedOldJob = validatedLegacyState.tables.hrx_payroll_filing_jobs
    .find((job) => job.filing_job_id === oldJob.filing_job_id);
  validatedOldJob.state = "validated";
  validatedOldJob.state_version += 1;
  const upgradedValidated = runtime({
    async submit(request) {
      providerCalls += 1;
      return providerReceipt(request, "succeeded");
    },
  }, { seed: false, initialState: validatedLegacyState });
  await assert.rejects(upgradedValidated.service.submit(APPROVER, {
    filing_job_id: oldJob.filing_job_id,
  }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED");
  assert.equal(providerCalls, 0);
  assert.equal(
    upgradedValidated.repository.getFilingJob(PREPARER, { filing_job_id: oldJob.filing_job_id }).state,
    "validated",
  );
  upgradedValidated.store.close();

  let pendingSubmitCalls = 0;
  let pendingStatusCalls = 0;
  const pending = runtime({
    async submit(request) {
      pendingSubmitCalls += 1;
      return providerReceipt(request, "pending");
    },
    async status(request) {
      pendingStatusCalls += 1;
      return providerReceipt(request, "succeeded");
    },
  });
  const pendingJob = await pending.service.createPackage(PREPARER, {
    run_id: pending.run.run_id,
    filing_kind: "social_insurance",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance,
  });
  pending.service.validate(PREPARER, { filing_job_id: pendingJob.filing_job_id });
  assert.equal(
    (await pending.service.submit(APPROVER, { filing_job_id: pendingJob.filing_job_id })).job.state,
    "submitted",
  );
  const pendingLegacyState = pending.store.snapshot();
  pendingLegacyState.tables.hrx_payroll_runs
    .find((run) => run.run_id === pending.run.run_id).filing_source_hash = null;
  pending.store.close();
  const upgradedPending = runtime({
    async submit() {
      pendingSubmitCalls += 1;
      throw new Error("provider submit must not be called");
    },
    async status() {
      pendingStatusCalls += 1;
      throw new Error("provider status must not be called");
    },
  }, { seed: false, initialState: pendingLegacyState });
  await assert.rejects(upgradedPending.service.submit(APPROVER, {
    filing_job_id: pendingJob.filing_job_id,
  }), (error) => {
    assert.equal(error.safe_error_code, "HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED");
    assert.equal(error.status, 409);
    return true;
  });
  assert.deepEqual([pendingSubmitCalls, pendingStatusCalls], [1, 0]);
  assert.equal(
    upgradedPending.repository.getFilingJob(PREPARER, { filing_job_id: pendingJob.filing_job_id }).state,
    "submitted",
  );
  upgradedPending.store.close();

  let terminalProviderCalls = 0;
  const terminal = runtime({
    async submit(request) {
      terminalProviderCalls += 1;
      return providerReceipt(request, "succeeded");
    },
    async status() {
      terminalProviderCalls += 1;
      throw new Error("provider status must not be called");
    },
  });
  const terminalJob = await terminal.service.createPackage(PREPARER, {
    run_id: terminal.run.run_id,
    filing_kind: "social_insurance",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance,
  });
  terminal.service.validate(PREPARER, { filing_job_id: terminalJob.filing_job_id });
  assert.equal(
    (await terminal.service.submit(APPROVER, { filing_job_id: terminalJob.filing_job_id })).job.state,
    "accepted",
  );
  const terminalLegacyState = terminal.store.snapshot();
  terminalLegacyState.tables.hrx_payroll_runs
    .find((run) => run.run_id === terminal.run.run_id).filing_source_hash = null;
  terminal.store.close();
  const upgradedTerminal = runtime({
    async submit() {
      terminalProviderCalls += 1;
      throw new Error("provider submit must not be called");
    },
    async status() {
      terminalProviderCalls += 1;
      throw new Error("provider status must not be called");
    },
  }, { seed: false, initialState: terminalLegacyState });
  await assert.rejects(upgradedTerminal.service.submit(APPROVER, {
    filing_job_id: terminalJob.filing_job_id,
  }), (error) => {
    assert.equal(error.safe_error_code, "HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED");
    assert.equal(error.status, 409);
    return true;
  });
  assert.equal(terminalProviderCalls, 1);
  assert.equal(
    upgradedTerminal.repository.getFilingJob(PREPARER, { filing_job_id: terminalJob.filing_job_id }).state,
    "accepted",
  );
  upgradedTerminal.store.close();

  const correctionLegacy = runtime({
    async submit(request) {
      return providerReceipt(request, "failed");
    },
  });
  const rejectedJob = await correctionLegacy.service.createPackage(PREPARER, {
    run_id: correctionLegacy.run.run_id,
    filing_kind: "payment_statement",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.payment_statement,
  });
  correctionLegacy.service.validate(PREPARER, { filing_job_id: rejectedJob.filing_job_id });
  assert.equal(
    (await correctionLegacy.service.submit(APPROVER, { filing_job_id: rejectedJob.filing_job_id })).job.state,
    "rejected",
  );
  const replacementRun = closeAdjustmentRun(correctionLegacy.repository, correctionLegacy.run, {
    runId: "run-pre-047-correction-replay",
  });
  const replacementJob = await correctionLegacy.service.correct(PREPARER, {
    filing_job_id: rejectedJob.filing_job_id,
    replacement_run_id: replacementRun.run_id,
  });
  const correctionLegacyState = correctionLegacy.store.snapshot();
  correctionLegacyState.tables.hrx_payroll_runs
    .find((run) => run.run_id === correctionLegacy.run.run_id).filing_source_hash = null;
  correctionLegacy.store.close();
  const upgradedCorrection = runtime(null, { seed: false, initialState: correctionLegacyState });
  await assert.rejects(upgradedCorrection.service.correct(PREPARER, {
    filing_job_id: rejectedJob.filing_job_id,
    replacement_run_id: replacementRun.run_id,
  }), (error) => {
    assert.equal(error.safe_error_code, "HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED");
    assert.equal(error.status, 409);
    return true;
  });
  assert.equal(
    upgradedCorrection.repository.listFilingJobs(PREPARER, { run_id: replacementRun.run_id })[0].filing_job_id,
    replacementJob.filing_job_id,
  );
  upgradedCorrection.store.close();
});

test("filing submission does not leave validated state without an authoritative provider", async () => {
  const { store, repository, run, service } = runtime();
  const job = await service.createPackage(PREPARER, {
    run_id: run.run_id,
    filing_kind: "withholding",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding,
  });
  const validated = service.validate(PREPARER, { filing_job_id: job.filing_job_id });
  await assert.rejects(
    service.submit(APPROVER, { filing_job_id: job.filing_job_id }),
    (error) => error.safe_error_code === "HRX_PAYROLL_FILING_PROVIDER_REQUIRED",
  );
  assert.equal(repository.getFilingJob(PREPARER, { filing_job_id: job.filing_job_id }).state, validated.state);
  store.close();
});

test("PY-TAX-003/004/005/007 keeps pending submissions retryable and creates an immutable correction filing from a closed adjustment run", async () => {
  let state = "pending";
  let submitCount = 0;
  let statusCount = 0;
  const port = {
    async submit(request) {
      submitCount += 1;
      return providerReceipt(request, state);
    },
    async status(request) {
      statusCount += 1;
      return providerReceipt(request, state);
    },
  };
  const { store, repository, run, service } = runtime(port);
  const acceptedJob = await service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "withholding", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding });
  service.validate(PREPARER, { filing_job_id: acceptedJob.filing_job_id });
  assert.equal((await service.submit(APPROVER, { filing_job_id: acceptedJob.filing_job_id })).job.state, "submitted");
  state = "succeeded";
  assert.equal((await service.submit(APPROVER, { filing_job_id: acceptedJob.filing_job_id })).job.state, "accepted");
  assert.deepEqual([submitCount, statusCount], [1, 1]);

  const rejectedJob = await service.createPackage(PREPARER, { run_id: run.run_id, filing_kind: "payment_statement", schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.payment_statement });
  service.validate(PREPARER, { filing_job_id: rejectedJob.filing_job_id });
  state = "failed";
  const rejected = (await service.submit(APPROVER, { filing_job_id: rejectedJob.filing_job_id })).job;
  assert.deepEqual(
    [rejected.state, rejected.provider_result_state, rejected.safe_error_code],
    ["rejected", "failed", "SANDBOX_REJECTED"],
  );
  const rejectedBefore = repository.getFilingJob(PREPARER, { filing_job_id: rejectedJob.filing_job_id });
  assert.throws(
    () => repository.transitionFilingJob(PREPARER, {
      filing_job_id: rejectedJob.filing_job_id,
      state: "corrected",
      expected_version: rejectedBefore.state_version,
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_STATE_INVALID",
  );
  const adjustmentRun = closeAdjustmentRun(repository, run, { runId: "run-filing-correction" });
  const correction = await service.correct(PREPARER, {
    filing_job_id: rejectedJob.filing_job_id,
    replacement_run_id: adjustmentRun.run_id,
  });
  const correctionReplay = await service.correct(PREPARER, {
    filing_job_id: rejectedJob.filing_job_id,
    replacement_run_id: adjustmentRun.run_id,
  });
  assert.deepEqual(
    [
      correction.run_id,
      correction.previous_job_ref,
      correction.state,
      correction.package_hash === rejectedBefore.package_hash,
      correction.package_ref === rejectedBefore.package_ref,
      correctionReplay.filing_job_id,
      repository.getFilingJob(PREPARER, { filing_job_id: rejectedJob.filing_job_id }).state,
    ],
    [
      adjustmentRun.run_id,
      `artifact:payroll-filing/${rejectedJob.filing_job_id}`,
      "draft",
      false,
      false,
      correction.filing_job_id,
      "rejected",
    ],
  );
  service.validate(PREPARER, { filing_job_id: correction.filing_job_id });
  state = "succeeded";
  const correctedAccepted = (await service.submit(APPROVER, { filing_job_id: correction.filing_job_id })).job;
  assert.equal(correctedAccepted.state, "accepted");
  assert.notEqual(correctedAccepted.provider_submission_key, rejectedBefore.provider_submission_key);
  const eventTypes = repository.listOutboxEvents(PREPARER, { run_id: run.run_id }).filter((row) => row.event_type.startsWith("payroll.filing.")).map((row) => row.event_type);
  assert.deepEqual(eventTypes, ["payroll.filing.submitted", "payroll.filing.accepted", "payroll.filing.submitted", "payroll.filing.rejected"]);
  store.close();
});

test("PEO-FIX-069 rejects a correction whose closed adjustment run has no changed filing amounts", async () => {
  const port = {
    async submit(request) {
      return providerReceipt(request, "failed");
    },
  };
  const { store, repository, run, service } = runtime(port);
  const original = await service.createPackage(PREPARER, {
    run_id: run.run_id,
    filing_kind: "payment_statement",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.payment_statement,
  });
  service.validate(PREPARER, { filing_job_id: original.filing_job_id });
  assert.equal((await service.submit(APPROVER, { filing_job_id: original.filing_job_id })).job.state, "rejected");
  const unchangedRun = closeAdjustmentRun(repository, run, {
    runId: "run-filing-no-change",
    grossKrw: 0,
    deductionKrw: 0,
  });
  await assert.rejects(service.correct(PREPARER, {
    filing_job_id: original.filing_job_id,
    replacement_run_id: unchangedRun.run_id,
  }), (error) => error.safe_error_code === "HRX_PAYROLL_FILING_CORRECTION_NO_CHANGE");
  const persistedOriginal = repository.getFilingJob(PREPARER, { filing_job_id: original.filing_job_id });
  assert.deepEqual(
    [persistedOriginal.state, persistedOriginal.package_hash, persistedOriginal.package_ref],
    ["rejected", original.package_hash, original.package_ref],
  );
  assert.equal(repository.listFilingJobs(PREPARER, { run_id: unchangedRun.run_id }).length, 0);
  store.close();
});

test("PEO-FIX-069 permits a zero-total social-insurance reclassification and fingerprints every changed filing line", async () => {
  let providerState = "failed";
  const artifacts = new Map();
  const artifactVault = {
    async put(input) {
      artifacts.set(input.object_id, Buffer.from(input.bytes));
      return { document_ref: `vault:payroll-filing/${input.object_id}` };
    },
  };
  const port = {
    async submit(request) {
      return providerReceipt(request, providerState);
    },
  };
  const { store, repository, run, service } = runtime(port, { artifactVault });
  const original = await service.createPackage(PREPARER, {
    run_id: run.run_id,
    filing_kind: "social_insurance",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.social_insurance,
  });
  service.validate(PREPARER, { filing_job_id: original.filing_job_id });
  assert.equal((await service.submit(APPROVER, { filing_job_id: original.filing_job_id })).job.state, "rejected");

  const reclassifiedRun = closeAdjustmentRun(repository, run, {
    runId: "run-filing-social-reclassification",
    grossKrw: 0,
    deductionKrw: 0,
    deductionLines: [
      ["NATIONAL_PENSION", 1_000],
      ["HEALTH_INSURANCE", -1_000],
    ],
  });
  assert.match(reclassifiedRun.filing_source_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(reclassifiedRun.filing_source_hash, run.filing_source_hash);
  const correction = await service.correct(PREPARER, {
    filing_job_id: original.filing_job_id,
    replacement_run_id: reclassifiedRun.run_id,
  });
  const replay = await service.correct(PREPARER, {
    filing_job_id: original.filing_job_id,
    replacement_run_id: reclassifiedRun.run_id,
  });
  const correctionPayload = [...artifacts.values()]
    .map((bytes) => JSON.parse(bytes.toString("utf8")))
    .find((payload) => payload.run_id === reclassifiedRun.run_id);
  assert.ok(correctionPayload);
  assert.deepEqual(
    correctionPayload.records[0].filing_items.map((item) => [
      item.item_code,
      item.amount_krw,
      item.source_line_ref,
      item.source_line_hash.length,
    ]),
    [
      ["NATIONAL_PENSION", 1_000, correctionPayload.records[0].filing_items[0].source_line_ref, 64],
      ["HEALTH_INSURANCE", -1_000, correctionPayload.records[0].filing_items[1].source_line_ref, 64],
    ],
  );
  assert.deepEqual(
    [
      correctionPayload.totals.deduction_krw,
      correctionPayload.totals.total_social_insurance_krw,
      correctionPayload.totals.national_pension_krw,
      correctionPayload.totals.health_insurance_krw,
    ],
    [0, 0, 1_000, -1_000],
  );
  assert.match(correctionPayload.canonical_source_fingerprint, /^[a-f0-9]{64}$/);
  assert.match(correctionPayload.canonical_change_fingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    [
      correction.state,
      correction.previous_job_ref,
      correction.package_hash === original.package_hash,
      correction.package_ref === original.package_ref,
      replay.filing_job_id,
      repository.getFilingJob(PREPARER, { filing_job_id: original.filing_job_id }).state,
    ],
    [
      "draft",
      `artifact:payroll-filing/${original.filing_job_id}`,
      false,
      false,
      correction.filing_job_id,
      "rejected",
    ],
  );
  service.validate(PREPARER, { filing_job_id: correction.filing_job_id });
  providerState = "succeeded";
  const accepted = (await service.submit(APPROVER, { filing_job_id: correction.filing_job_id })).job;
  assert.equal(accepted.state, "accepted");
  assert.notEqual(accepted.provider_submission_key, original.provider_submission_key);
  store.close();
});

test("PEO-TUW-068 filing submission persists attempts, replays success, and stops at the provider retry maximum", async () => {
  let successCalls = 0;
  const successPort = {
    async submit(request) {
      successCalls += 1;
      return providerReceipt(request, "succeeded");
    },
  };
  const successful = runtime(successPort);
  const acceptedJob = await successful.service.createPackage(PREPARER, {
    run_id: successful.run.run_id,
    filing_kind: "withholding",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding,
  });
  successful.service.validate(PREPARER, { filing_job_id: acceptedJob.filing_job_id });
  const accepted = await successful.service.submit(APPROVER, {
    filing_job_id: acceptedJob.filing_job_id,
  });
  const replay = await successful.service.submit(APPROVER, {
    filing_job_id: acceptedJob.filing_job_id,
  });
  const disconnectedReplay = await createPayrollFilingService({
    repository: successful.repository,
    providerPort: null,
    clock: () => NOW,
  }).submit(APPROVER, {
    filing_job_id: acceptedJob.filing_job_id,
  });
  assert.deepEqual(
    [
      accepted.job.state,
      accepted.job.attempt_count,
      replay.job.state,
      replay.idempotent_replay,
      disconnectedReplay.job.state,
      disconnectedReplay.idempotent_replay,
      successCalls,
    ],
    ["accepted", 1, "accepted", true, "accepted", true, 1],
  );
  successful.store.close();

  let failedCalls = 0;
  const unavailablePort = {
    async submit() {
      failedCalls += 1;
      const error = new Error("provider response unavailable");
      error.safe_error_code = "HRX_PROVIDER_RESULT_UNKNOWN";
      throw error;
    },
  };
  const unavailable = runtime(unavailablePort);
  const pendingJob = await unavailable.service.createPackage(PREPARER, {
    run_id: unavailable.run.run_id,
    filing_kind: "withholding",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding,
  });
  unavailable.service.validate(PREPARER, { filing_job_id: pendingJob.filing_job_id });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await assert.rejects(
      unavailable.service.submit(APPROVER, { filing_job_id: pendingJob.filing_job_id }),
      (error) => error.safe_error_code === "HRX_PROVIDER_RESULT_UNKNOWN",
    );
  }
  await assert.rejects(
    unavailable.service.submit(APPROVER, { filing_job_id: pendingJob.filing_job_id }),
    (error) => error.safe_error_code === "HRX_PROVIDER_RETRY_LIMIT_EXCEEDED",
  );
  const persistedJob = unavailable.repository.getFilingJob(PREPARER, {
    filing_job_id: pendingJob.filing_job_id,
  });
  const persistedOperation = unavailable.repository.getProviderOperation(PREPARER, {
    provider_kind: "filing",
    idempotency_key: `${pendingJob.filing_job_id}:${pendingJob.package_hash}`,
  });
  assert.deepEqual(
    [failedCalls, persistedJob.attempt_count, persistedOperation.attempt_count, persistedOperation.state],
    [3, 3, 3, "unknown"],
  );
  unavailable.store.close();
});

test("PEO-FIX-068 atomically records submission begin and safely resumes the same payload after a durable restart", async () => {
  let rollbackProviderCalls = 0;
  const rollbackRuntime = runtime({
    async submit() {
      rollbackProviderCalls += 1;
      throw new Error("provider must not run after a rolled-back begin");
    },
  }, {
    faultInjector(point) {
      if (point === "filing_submission.after_operation_begin") throw new Error("synthetic transaction fault");
    },
  });
  const rollbackJob = await rollbackRuntime.service.createPackage(PREPARER, {
    run_id: rollbackRuntime.run.run_id,
    filing_kind: "withholding",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding,
  });
  const rollbackValidated = rollbackRuntime.service.validate(PREPARER, {
    filing_job_id: rollbackJob.filing_job_id,
  });
  await assert.rejects(
    rollbackRuntime.service.submit(APPROVER, { filing_job_id: rollbackValidated.filing_job_id }),
    /synthetic transaction fault/,
  );
  assert.equal(rollbackProviderCalls, 0);
  assert.equal(rollbackRuntime.repository.getFilingJob(PREPARER, {
    filing_job_id: rollbackValidated.filing_job_id,
  }).state, "validated");
  assert.equal(rollbackRuntime.repository.getProviderOperation(PREPARER, {
    provider_kind: "filing",
    idempotency_key: `${rollbackValidated.filing_job_id}:${rollbackValidated.package_hash}`,
  }) == null, true);
  rollbackRuntime.store.close();

  const directory = mkdtempSync(join(tmpdir(), "lawos-filing-restart-"));
  const filePath = join(directory, "hrx.json");
  let now = NOW;
  let providerCalls = 0;
  const providerPort = {
    async submit(request) {
      providerCalls += 1;
      return providerReceipt(request, "succeeded");
    },
  };
  try {
    const initial = runtime(providerPort, {
      filePath,
      clock: () => now,
      submissionLeaseDurationMs: 15 * 60 * 1000,
    });
    const job = await initial.service.createPackage(PREPARER, {
      run_id: initial.run.run_id,
      filing_kind: "withholding",
      schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding,
    });
    const validated = initial.service.validate(PREPARER, { filing_job_id: job.filing_job_id });
    const key = `${validated.filing_job_id}:${validated.package_hash}`;
    const begun = initial.repository.beginFilingSubmissionAttempt(APPROVER, {
      filing_job_id: validated.filing_job_id,
      provider_kind: "filing",
      operation: "filing.withholding",
      idempotency_key: key,
      request_hash: validated.package_hash,
      maximum_attempts: 3,
      lease_duration_ms: 15 * 60 * 1000,
    });
    assert.deepEqual(
      [begun.should_execute, begun.job.state, begun.job.attempt_count, begun.operation.state, begun.operation.attempt_count],
      [true, "submitted", 1, "in_progress", 1],
    );
    const beforeLeaseExpiry = await initial.service.submit(APPROVER, { filing_job_id: validated.filing_job_id });
    assert.deepEqual([beforeLeaseExpiry.job.state, beforeLeaseExpiry.provider_state, providerCalls], ["submitted", "pending", 0]);
    initial.store.close();

    now = "2026-07-15T06:16:00.000Z";
    const restarted = runtime(providerPort, {
      filePath,
      clock: () => now,
      seed: false,
      submissionLeaseDurationMs: 15 * 60 * 1000,
    });
    const recovered = await restarted.service.submit(APPROVER, { filing_job_id: validated.filing_job_id });
    const operation = restarted.repository.getProviderOperation(PREPARER, {
      provider_kind: "filing",
      idempotency_key: key,
    });
    assert.deepEqual(
      [
        recovered.job.state,
        recovered.job.attempt_count,
        recovered.job.provider_submission_key,
        operation.state,
        operation.attempt_count,
        providerCalls,
      ],
      ["accepted", 1, key, "succeeded", 1, 1],
    );
    const replay = await restarted.service.submit(APPROVER, { filing_job_id: validated.filing_job_id });
    assert.deepEqual([replay.idempotent_replay, replay.job.state, providerCalls], [true, "accepted", 1]);
    restarted.store.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("PEO-TUW-069 rejects a filing receipt number already bound to another filing job", async () => {
  const sharedReceiptRef = "provider:sandbox/filing/shared-receipt";
  const port = {
    async submit(request) {
      return providerReceipt(request, "succeeded", sharedReceiptRef);
    },
  };
  const { store, repository, run, service } = runtime(port);
  const first = await service.createPackage(PREPARER, {
    run_id: run.run_id,
    filing_kind: "withholding",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.withholding,
  });
  service.validate(PREPARER, { filing_job_id: first.filing_job_id });
  const accepted = (await service.submit(APPROVER, {
    filing_job_id: first.filing_job_id,
  })).job;
  assert.deepEqual(
    [accepted.state, accepted.provider_result_state, accepted.provider_receipt_ref],
    ["accepted", "accepted", sharedReceiptRef],
  );

  const second = await service.createPackage(PREPARER, {
    run_id: run.run_id,
    filing_kind: "payment_statement",
    schema_version: SYNTHETIC_PAYROLL_FILING_SCHEMAS.payment_statement,
  });
  service.validate(PREPARER, { filing_job_id: second.filing_job_id });
  await assert.rejects(
    service.submit(APPROVER, { filing_job_id: second.filing_job_id }),
    (error) => error.safe_error_code === "HRX_PAYROLL_FILING_RECEIPT_DUPLICATE",
  );
  const preserved = repository.getFilingJob(PREPARER, {
    filing_job_id: second.filing_job_id,
  });
  assert.deepEqual(
    [preserved.state, preserved.provider_result_state, preserved.provider_receipt_ref],
    ["submitted", "queued", null],
  );
  assert.equal(JSON.stringify(repository.listFilingJobs(PREPARER)).includes("account_number"), false);
  store.close();
});
