import { createHash } from "node:crypto";
import { createHrxProviderReceipt } from "../provider-receipt-contract.js";
import { createEncryptedPayrollArtifactVault } from "./document-service.js";

export const SYNTHETIC_PAYROLL_FILING_SCHEMAS = Object.freeze({
  withholding: "kr.nts.withholding.synthetic.v1",
  payment_statement: "kr.nts.payment-statement.synthetic.v1",
  social_insurance: "kr.social-insurance.synthetic.v1",
  year_end: "kr.nts.year-end.synthetic.v1",
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalDate(input, field) {
  const value = input?.[field];
  if (value == null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new TypeError(`${field} must be an ISO date`);
  return value;
}

function integer(input, field, { nonNegative = false } = {}) {
  const value = input?.[field];
  if (!Number.isInteger(value) || (nonNegative && value < 0)) throw new TypeError(`${field} must be ${nonNegative ? "a non-negative " : "an "}integer`);
  return value;
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function safeError(message, code, status = 400) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function roundRatio(numerator, denominator) {
  if (denominator <= 0n) throw new TypeError("denominator must be positive");
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return Number(sign * ((absolute + denominator / 2n) / denominator));
}

export function calculateRetirementBenefit(input = {}) {
  const serviceDays = integer(input, "service_days", { nonNegative: true });
  const excludedDays = input.excluded_days == null ? 0 : integer(input, "excluded_days", { nonNegative: true });
  if (excludedDays > serviceDays) throw new TypeError("excluded_days cannot exceed service_days");
  const eligibleDays = serviceDays - excludedDays;
  const minimumServiceDays = input.minimum_service_days == null ? 365 : integer(input, "minimum_service_days", { nonNegative: true });
  const wageTotal = integer(input, "average_wage_period_total_krw", { nonNegative: true });
  const wageDays = integer(input, "average_wage_period_days", { nonNegative: true });
  if (wageDays === 0) throw new TypeError("average_wage_period_days must be positive");
  const amountKrw = eligibleDays < minimumServiceDays ? 0 : roundRatio(BigInt(wageTotal) * 30n * BigInt(eligibleDays), BigInt(wageDays) * 365n);
  return Object.freeze({
    service_days: serviceDays,
    excluded_days: excludedDays,
    eligible_service_days: eligibleDays,
    minimum_service_days: minimumServiceDays,
    average_daily_wage_krw: roundRatio(BigInt(wageTotal), BigInt(wageDays)),
    retirement_benefit_krw: amountKrw,
    manual_review_required: input.legal_review_receipt_ref == null || excludedDays > 0 || eligibleDays < minimumServiceDays,
    production_ready_claim: false,
  });
}

export function calculateRetirementPlanContribution(input = {}) {
  const planType = requiredString(input, "plan_type");
  if (!["dc", "irp"].includes(planType)) throw new TypeError("plan_type must be dc or irp");
  const compensation = integer(input, "annual_compensation_krw", { nonNegative: true });
  const rateBps = input.contribution_rate_bps == null ? 833 : integer(input, "contribution_rate_bps", { nonNegative: true });
  return Object.freeze({
    plan_type: planType,
    contribution_krw: roundRatio(BigInt(compensation) * BigInt(rateBps), 10_000n),
    transfer_ref: requiredString(input, "transfer_ref"),
    duplicate_key: hash(Buffer.from(`${planType}:${requiredString(input, "employee_id")}:${input.period_code ?? "annual"}:${requiredString(input, "transfer_ref")}`)),
    production_ready_claim: false,
  });
}

export function calculateRetirementPlanContributions(inputs = []) {
  if (!Array.isArray(inputs)) throw new TypeError("retirement plan contributions must be an array");
  const seen = new Set();
  const contributions = inputs.map((input) => {
    const contribution = calculateRetirementPlanContribution(input);
    if (seen.has(contribution.duplicate_key)) throw safeError("Duplicate retirement plan contribution", "HRX_PAYROLL_RETIREMENT_PLAN_DUPLICATE", 409);
    seen.add(contribution.duplicate_key);
    return contribution;
  }).sort((left, right) => left.duplicate_key.localeCompare(right.duplicate_key));
  const totals = contributions.reduce((value, item) => ({
    dc_krw: value.dc_krw + (item.plan_type === "dc" ? item.contribution_krw : 0),
    irp_krw: value.irp_krw + (item.plan_type === "irp" ? item.contribution_krw : 0),
    total_krw: value.total_krw + item.contribution_krw,
  }), { dc_krw: 0, irp_krw: 0, total_krw: 0 });
  return Object.freeze({ contributions: Object.freeze(contributions), totals: Object.freeze({ ...totals, contribution_count: contributions.length }), production_ready_claim: false });
}

export function calculateTerminationSettlement(input = {}) {
  const terminationDate = optionalDate(input, "termination_date") ?? requiredString(input, "termination_date");
  const employmentStartDate = optionalDate(input, "employment_start_date");
  if (employmentStartDate && employmentStartDate > terminationDate) throw safeError("Employment start date cannot follow termination date", "HRX_PAYROLL_TERMINATION_DATE_INVALID", 409);
  const lastNet = integer(input, "last_payroll_net_krw");
  const unusedLeave = integer(input, "unused_leave_krw", { nonNegative: true });
  const taxAdjustment = integer(input, "tax_adjustment_krw");
  const insuranceAdjustment = integer(input, "insurance_adjustment_krw");
  const retirementBenefit = integer(input, "retirement_benefit_krw", { nonNegative: true });
  return Object.freeze({
    termination_date: terminationDate,
    employment_start_date: employmentStartDate,
    last_payroll_net_krw: lastNet,
    unused_leave_krw: unusedLeave,
    tax_adjustment_krw: taxAdjustment,
    insurance_adjustment_krw: insuranceAdjustment,
    retirement_benefit_krw: retirementBenefit,
    settlement_total_krw: lastNet + unusedLeave + taxAdjustment + insuranceAdjustment + retirementBenefit,
    manual_review_required: input.tax_review_receipt_ref == null || input.labor_review_receipt_ref == null || input.last_payroll_result_ref == null || input.unused_leave_source_ref == null || input.tax_rule_version_ref == null || input.insurance_rule_version_ref == null,
    production_ready_claim: false,
  });
}

export function calculateYearEndSettlement(input = {}) {
  const taxableIncome = integer(input, "taxable_income_krw", { nonNegative: true });
  const determinedTax = integer(input, "determined_tax_krw", { nonNegative: true });
  const withheldTax = integer(input, "withheld_tax_krw", { nonNegative: true });
  return Object.freeze({
    employee_id: requiredString(input, "employee_id"),
    tax_year: integer(input, "tax_year", { nonNegative: true }),
    taxable_income_krw: taxableIncome,
    determined_tax_krw: determinedTax,
    withheld_tax_krw: withheldTax,
    settlement_krw: withheldTax - determinedTax,
    collection_complete: input.collection_complete === true,
    manual_review_required: input.collection_complete !== true || input.tax_review_receipt_ref == null,
    production_ready_claim: false,
  });
}

export function createPayrollFilingService({
  repository,
  artifactVault = createEncryptedPayrollArtifactVault({ allowSyntheticSecret: true }),
  providerPort = null,
  clock = () => new Date().toISOString(),
  schemaRegistry = SYNTHETIC_PAYROLL_FILING_SCHEMAS,
} = {}) {
  if (!repository) throw new TypeError("payroll filing service requires repository");

  function requireClosedBundle(context, runId) {
    const bundle = repository.getRunBundle(context, { run_id: runId });
    if (!bundle) throw safeError("Payroll run not found", "HRX_PAYROLL_NOT_FOUND", 404);
    if (bundle.run.status !== "closed") throw safeError("Closed payroll run is required", "HRX_PAYROLL_RUN_NOT_CLOSED", 409);
    return bundle;
  }

  function buildRecords(bundle, filingKind, inputRecords) {
    if (Array.isArray(inputRecords) && inputRecords.length) return inputRecords.map(stable);
    if (["withholding", "payment_statement"].includes(filingKind)) {
      return bundle.results.map((row) => ({ employee_id: row.employee_id, gross_krw: row.gross_krw, deduction_krw: row.deduction_krw, net_krw: row.net_krw }));
    }
    if (filingKind === "social_insurance") {
      return bundle.results.map((row) => {
        const deductions = bundle.line_items.filter((item) => item.result_id === row.result_id && item.item_kind === "deduction");
        const amount = (...codes) => deductions
          .filter((item) => codes.includes(item.item_code))
          .reduce((sum, item) => sum + item.amount_krw, 0);
        return {
          employee_id: row.employee_id,
          pension_krw: amount("NATIONAL_PENSION", "PENSION"),
          health_krw: amount("HEALTH_INSURANCE", "HEALTH", "LONG_TERM_CARE"),
          employment_insurance_krw: amount("EMPLOYMENT_INSURANCE"),
          source_result_ref: `artifact:payroll-result/${row.result_id}`,
        };
      });
    }
    throw safeError("Year-end records are required", "HRX_PAYROLL_FILING_RECORDS_REQUIRED", 409);
  }

  async function createPackage(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const filingKind = requiredString(input, "filing_kind");
    const schemaVersion = requiredString(input, "schema_version");
    if (schemaRegistry[filingKind] !== schemaVersion) throw safeError("Filing schema is not approved", "HRX_PAYROLL_FILING_SCHEMA_UNAPPROVED", 409);
    const existing = repository.listFilingJobs(context, { run_id: runId, filing_kind: filingKind }).find((row) => row.schema_version === schemaVersion);
    if (existing) return existing;
    const bundle = requireClosedBundle(context, runId);
    const records = buildRecords(bundle, filingKind, input.records);
    const totals = records.reduce((sum, row) => ({ gross_krw: sum.gross_krw + (Number.isInteger(row.gross_krw) ? row.gross_krw : 0), deduction_krw: sum.deduction_krw + (Number.isInteger(row.deduction_krw) ? row.deduction_krw : 0), net_krw: sum.net_krw + (Number.isInteger(row.net_krw) ? row.net_krw : 0) }), { gross_krw: 0, deduction_krw: 0, net_krw: 0 });
    if (["withholding", "payment_statement"].includes(filingKind)) {
      const runTotals = bundle.results.reduce((sum, row) => ({ gross_krw: sum.gross_krw + row.gross_krw, deduction_krw: sum.deduction_krw + row.deduction_krw, net_krw: sum.net_krw + row.net_krw }), { gross_krw: 0, deduction_krw: 0, net_krw: 0 });
      if (JSON.stringify(totals) !== JSON.stringify(runTotals)) throw safeError("Filing totals do not match payroll run", "HRX_PAYROLL_FILING_TOTAL_MISMATCH", 409);
    }
    const payload = Object.freeze({ schema_version: schemaVersion, fixture_only: schemaVersion.includes(".synthetic."), filing_kind: filingKind, run_id: runId, record_count: records.length, totals, records, created_at: bundle.run.closed_at ?? clock(), production_ready_claim: false });
    const bytes = Buffer.from(JSON.stringify(stable(payload)), "utf8");
    const packageHash = hash(bytes);
    const artifact = await artifactVault.put({ tenant_id: context.tenant_id, object_id: `payroll/${runId}/filing-${filingKind}-${packageHash}.json`, bytes, content_type: "application/json" });
    return repository.createFilingJob(context, { run_id: runId, filing_kind: filingKind, schema_version: schemaVersion, package_ref: artifact.document_ref, package_hash: packageHash });
  }

  function validate(context, input = {}) {
    const job = repository.getFilingJob(context, { filing_job_id: requiredString(input, "filing_job_id") });
    if (!job) throw safeError("Filing job not found", "HRX_PAYROLL_FILING_NOT_FOUND", 404);
    if (schemaRegistry[job.filing_kind] !== job.schema_version) throw safeError("Filing schema is not approved", "HRX_PAYROLL_FILING_SCHEMA_UNAPPROVED", 409);
    return repository.transitionFilingJob(context, { filing_job_id: job.filing_job_id, state: "validated", expected_version: input.expected_version ?? job.state_version });
  }

  async function submit(context, input = {}) {
    let job = repository.getFilingJob(context, { filing_job_id: requiredString(input, "filing_job_id") });
    if (!job) throw safeError("Filing job not found", "HRX_PAYROLL_FILING_NOT_FOUND", 404);
    if (!["validated", "submitted"].includes(job.state)) throw safeError("Validated or submitted filing job is required", "HRX_PAYROLL_FILING_STATE_INVALID", 409);
    if (!providerPort?.submit) throw safeError("Authoritative filing provider is required", "HRX_PAYROLL_FILING_PROVIDER_REQUIRED", 503);
    if (job.state === "validated") {
      job = repository.transitionFilingJob(context, { filing_job_id: job.filing_job_id, state: "submitted", expected_version: job.state_version });
    }
    const receipt = createHrxProviderReceipt(await providerPort.submit({ tenant_id: context.tenant_id, filing_job_id: job.filing_job_id, filing_kind: job.filing_kind, package_hash: job.package_hash, idempotency_key: `${job.filing_job_id}:${job.package_hash}`, payload_hash: `sha256:${job.package_hash}` }));
    if (receipt.state === "pending") return Object.freeze({ job, provider_state: "pending", production_ready_claim: false });
    job = repository.transitionFilingJob(context, {
      filing_job_id: job.filing_job_id,
      state: receipt.state === "succeeded" ? "accepted" : "rejected",
      expected_version: job.state_version,
      provider_receipt_ref: receipt.provider_receipt_ref ?? `provider:error/${receipt.receipt_id}`,
    });
    return Object.freeze({ job, provider_state: receipt.state, production_ready_claim: false });
  }

  function correct(context, input = {}) {
    const job = repository.getFilingJob(context, { filing_job_id: requiredString(input, "filing_job_id") });
    if (!job) throw safeError("Filing job not found", "HRX_PAYROLL_FILING_NOT_FOUND", 404);
    return repository.transitionFilingJob(context, { filing_job_id: job.filing_job_id, state: "corrected", expected_version: input.expected_version ?? job.state_version });
  }

  function list(context, input = {}) {
    return repository.listFilingJobs(context, input);
  }

  return Object.freeze({ createPackage, validate, submit, correct, list });
}
