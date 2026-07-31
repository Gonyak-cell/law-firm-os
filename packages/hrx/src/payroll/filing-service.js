import { createHash } from "node:crypto";
import {
  assertHrxProviderReceiptForOperation,
  createHrxSandboxProviderOperationBoundary,
} from "../provider-receipt-contract.js";
import { createEncryptedPayrollArtifactVault } from "./document-service.js";
import { createPayrollFilingSourceHash } from "./repository.js";

export const SYNTHETIC_PAYROLL_FILING_SCHEMAS = Object.freeze({
  withholding: "kr.nts.withholding.synthetic.v1",
  payment_statement: "kr.nts.payment-statement.synthetic.v1",
  social_insurance: "kr.social-insurance.synthetic.v1",
  year_end: "kr.nts.year-end.synthetic.v1",
});

const CANONICAL_PAYROLL_FILING_RECORD_SCHEMA = "law-firm-os.hrx.payroll-filing-record.v1";

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

function dataHash(value) {
  return hash(Buffer.from(JSON.stringify(stable(value)), "utf8"));
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
  providerBoundary = createHrxSandboxProviderOperationBoundary("filing"),
  clock = () => new Date().toISOString(),
  schemaRegistry = SYNTHETIC_PAYROLL_FILING_SCHEMAS,
  submissionLeaseDurationMs = 15 * 60 * 1000,
} = {}) {
  if (!repository) throw new TypeError("payroll filing service requires repository");

  function requireClosedBundle(context, runId) {
    const bundle = repository.getRunBundle(context, { run_id: runId });
    if (!bundle) throw safeError("Payroll run not found", "HRX_PAYROLL_NOT_FOUND", 404);
    if (bundle.run.status !== "closed") throw safeError("Closed payroll run is required", "HRX_PAYROLL_RUN_NOT_CLOSED", 409);
    if (!Array.isArray(bundle.results) || bundle.results.length === 0) {
      throw safeError("Closed payroll run has no employee results", "HRX_PAYROLL_FILING_RESULTS_REQUIRED", 409);
    }
    if (
      typeof bundle.run.filing_source_hash !== "string"
      || !/^[a-f0-9]{64}$/.test(bundle.run.filing_source_hash)
    ) {
      throw safeError("Payroll filing source requires approved close-time verification", "HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED", 409);
    }
    if (createPayrollFilingSourceHash(bundle) !== bundle.run.filing_source_hash) {
      throw safeError("Payroll filing source does not match the close-time manifest", "HRX_PAYROLL_FILING_SOURCE_HASH_MISMATCH", 409);
    }
    return bundle;
  }

  function canonicalResultHash(row) {
    if (typeof row.result_hash !== "string" || !/^[a-f0-9]{64}$/.test(row.result_hash)) {
      throw safeError("Payroll employee result hash does not match the closed run", "HRX_PAYROLL_FILING_SOURCE_HASH_MISMATCH", 409);
    }
    return row.result_hash;
  }

  function canonicalFilingItems(lines) {
    return [...lines]
      .sort((left, right) => left.line_item_id.localeCompare(right.line_item_id))
      .map((line) => {
        const source = {
          line_item_id: requiredString(line, "line_item_id"),
          item_kind: requiredString(line, "item_kind"),
          item_code: requiredString(line, "item_code"),
          formula_code: requiredString(line, "formula_code"),
          rule_version_id: line.rule_version_id ?? null,
          amount_krw: integer(line, "amount_krw"),
          quantity_minutes: line.quantity_minutes ?? null,
          metadata_json: line.metadata_json ?? "{}",
        };
        return {
          item_kind: source.item_kind,
          item_code: source.item_code,
          amount_krw: source.amount_krw,
          source_line_ref: `artifact:payroll-line/${source.line_item_id}`,
          source_line_hash: dataHash(source),
        };
      });
  }

  function canonicalRecordFingerprint(records) {
    return dataHash(records.map((row) => ({
      employee_id: row.employee_id,
      source_result_hash: row.source_result_hash,
      gross_krw: row.gross_krw,
      deduction_krw: row.deduction_krw,
      net_krw: row.net_krw,
      filing_items: row.filing_items,
    })));
  }

  function canonicalChangeSet(records) {
    return records.flatMap((row) => {
      const filingItems = row.filing_items.filter((item) => item.amount_krw !== 0);
      if (row.gross_krw === 0 && row.deduction_krw === 0 && row.net_krw === 0 && filingItems.length === 0) return [];
      return [{
        employee_id: row.employee_id,
        source_result_hash: row.source_result_hash,
        gross_krw: row.gross_krw,
        deduction_krw: row.deduction_krw,
        net_krw: row.net_krw,
        filing_items: filingItems,
      }];
    });
  }

  function buildRecords(bundle, filingKind) {
    const resultIds = new Set();
    const employeeIds = new Set();
    const records = [...bundle.results]
      .sort((left, right) => left.employee_id.localeCompare(right.employee_id))
      .map((row) => {
        if (resultIds.has(row.result_id) || employeeIds.has(row.employee_id)) {
          throw safeError("Payroll filing contains duplicate employee results", "HRX_PAYROLL_FILING_RESULT_DUPLICATE", 409);
        }
        resultIds.add(row.result_id);
        employeeIds.add(row.employee_id);
        for (const field of ["gross_krw", "deduction_krw", "net_krw"]) integer(row, field);
        if (row.gross_krw - row.deduction_krw !== row.net_krw) {
          throw safeError("Payroll employee result amounts do not reconcile", "HRX_PAYROLL_FILING_TOTAL_MISMATCH", 409);
        }
        const sourceResultHash = canonicalResultHash(row);
        const lines = bundle.line_items.filter((item) => item.result_id === row.result_id);
        const deductions = lines.filter((item) => item.item_kind === "deduction");
        const deductionTotal = deductions.reduce((sum, item) => sum + integer(item, "amount_krw"), 0);
        if (deductionTotal !== row.deduction_krw) {
          throw safeError("Payroll deduction lines do not reconcile to the employee result", "HRX_PAYROLL_FILING_TOTAL_MISMATCH", 409);
        }
        const earnings = lines.filter((item) => ["earning", "adjustment"].includes(item.item_kind));
        if (earnings.length && earnings.reduce((sum, item) => sum + integer(item, "amount_krw"), 0) !== row.gross_krw) {
          throw safeError("Payroll earning lines do not reconcile to the employee result", "HRX_PAYROLL_FILING_TOTAL_MISMATCH", 409);
        }
        const filingItems = canonicalFilingItems(lines);
        const base = {
          employee_id: row.employee_id,
          source_result_ref: `artifact:payroll-result/${row.result_id}`,
          source_result_hash: sourceResultHash,
          gross_krw: row.gross_krw,
          deduction_krw: row.deduction_krw,
          net_krw: row.net_krw,
          filing_items: filingItems,
        };
        if (filingKind !== "social_insurance") return base;
        const amount = (...codes) => deductions
          .filter((item) => codes.includes(item.item_code))
          .reduce((sum, item) => sum + item.amount_krw, 0);
        const nationalPensionKrw = amount("NATIONAL_PENSION", "PENSION");
        const healthInsuranceKrw = amount("HEALTH_INSURANCE", "HEALTH");
        const longTermCareKrw = amount("LONG_TERM_CARE");
        const employmentInsuranceKrw = amount("EMPLOYMENT_INSURANCE");
        return {
          ...base,
          national_pension_krw: nationalPensionKrw,
          health_insurance_krw: healthInsuranceKrw,
          long_term_care_krw: longTermCareKrw,
          employment_insurance_krw: employmentInsuranceKrw,
          total_social_insurance_krw: nationalPensionKrw + healthInsuranceKrw + longTermCareKrw + employmentInsuranceKrw,
        };
      });
    const runHashCandidates = [
      dataHash(bundle.results),
      dataHash([...bundle.results]
        .sort((left, right) => left.employee_id.localeCompare(right.employee_id))
        .map((row) => ({ employee_id: row.employee_id, result_hash: row.result_hash }))),
    ];
    if (!runHashCandidates.includes(bundle.run.result_hash)) {
      throw safeError("Payroll run result hash does not match the closed employee results", "HRX_PAYROLL_FILING_SOURCE_HASH_MISMATCH", 409);
    }
    return records;
  }

  function packageTotals(records, filingKind) {
    const totals = records.reduce((sum, row) => ({
      gross_krw: sum.gross_krw + row.gross_krw,
      deduction_krw: sum.deduction_krw + row.deduction_krw,
      net_krw: sum.net_krw + row.net_krw,
    }), { gross_krw: 0, deduction_krw: 0, net_krw: 0 });
    if (filingKind !== "social_insurance") return totals;
    return records.reduce((sum, row) => ({
      ...sum,
      national_pension_krw: sum.national_pension_krw + row.national_pension_krw,
      health_insurance_krw: sum.health_insurance_krw + row.health_insurance_krw,
      long_term_care_krw: sum.long_term_care_krw + row.long_term_care_krw,
      employment_insurance_krw: sum.employment_insurance_krw + row.employment_insurance_krw,
      total_social_insurance_krw: sum.total_social_insurance_krw + row.total_social_insurance_krw,
    }), {
      ...totals,
      national_pension_krw: 0,
      health_insurance_krw: 0,
      long_term_care_krw: 0,
      employment_insurance_krw: 0,
      total_social_insurance_krw: 0,
    });
  }

  async function persistPackage(context, { bundle, filingKind, schemaVersion, previousJob = null } = {}) {
    const runId = bundle.run.run_id;
    const records = buildRecords(bundle, filingKind);
    const changeSet = canonicalChangeSet(records);
    if (previousJob && changeSet.length === 0) {
      throw safeError("Payroll filing correction has no changed filing items", "HRX_PAYROLL_FILING_CORRECTION_NO_CHANGE", 409);
    }
    const totals = packageTotals(records, filingKind);
    const previousJobRef = previousJob ? `artifact:payroll-filing/${previousJob.filing_job_id}` : null;
    const payload = Object.freeze({
      schema_version: schemaVersion,
      canonical_record_schema_version: CANONICAL_PAYROLL_FILING_RECORD_SCHEMA,
      canonical_source_fingerprint: canonicalRecordFingerprint(records),
      canonical_change_fingerprint: dataHash(changeSet),
      fixture_only: schemaVersion.includes(".synthetic."),
      filing_kind: filingKind,
      run_id: runId,
      previous_job_ref: previousJobRef,
      record_count: records.length,
      totals,
      records,
      created_at: bundle.run.closed_at ?? clock(),
      production_ready_claim: false,
    });
    const bytes = Buffer.from(JSON.stringify(stable(payload)), "utf8");
    const packageHash = hash(bytes);
    if (previousJob?.package_hash === packageHash) {
      throw safeError("Payroll filing correction must change the package", "HRX_PAYROLL_FILING_CORRECTION_NO_CHANGE", 409);
    }
    const artifact = await artifactVault.put({ tenant_id: context.tenant_id, object_id: `payroll/${runId}/filing-${filingKind}-${packageHash}.json`, bytes, content_type: "application/json" });
    return repository.createFilingJob(context, {
      run_id: runId,
      filing_kind: filingKind,
      schema_version: schemaVersion,
      package_ref: artifact.document_ref,
      package_hash: packageHash,
      previous_job_ref: previousJobRef,
    });
  }

  async function createPackage(context, input = {}) {
    if (Object.prototype.hasOwnProperty.call(input, "records")) {
      throw safeError("Payroll filing records are derived from the closed payroll run", "HRX_PAYROLL_FILING_RECORDS_FORBIDDEN", 400);
    }
    const runId = requiredString(input, "run_id");
    const filingKind = requiredString(input, "filing_kind");
    const schemaVersion = requiredString(input, "schema_version");
    if (schemaRegistry[filingKind] !== schemaVersion) throw safeError("Filing schema is not approved", "HRX_PAYROLL_FILING_SCHEMA_UNAPPROVED", 409);
    const bundle = requireClosedBundle(context, runId);
    const existing = repository.listFilingJobs(context, { run_id: runId, filing_kind: filingKind }).find((row) => row.schema_version === schemaVersion);
    if (existing) return existing;
    const previousJob = bundle.run.run_type === "adjustment"
      ? repository.listFilingJobs(context, {
          run_id: bundle.run.previous_run_id,
          filing_kind: filingKind,
        }).find((row) => row.schema_version === schemaVersion && row.state === "rejected") ?? null
      : null;
    return persistPackage(context, { bundle, filingKind, schemaVersion, previousJob });
  }

  function validate(context, input = {}) {
    const job = repository.getFilingJob(context, { filing_job_id: requiredString(input, "filing_job_id") });
    if (!job) throw safeError("Filing job not found", "HRX_PAYROLL_FILING_NOT_FOUND", 404);
    if (schemaRegistry[job.filing_kind] !== job.schema_version) throw safeError("Filing schema is not approved", "HRX_PAYROLL_FILING_SCHEMA_UNAPPROVED", 409);
    requireClosedBundle(context, job.run_id);
    return repository.transitionFilingJob(context, { filing_job_id: job.filing_job_id, state: "validated", expected_version: input.expected_version ?? job.state_version });
  }

  function providerRequest(context, job) {
    return Object.freeze({
      tenant_id: context.tenant_id,
      filing_job_id: job.filing_job_id,
      filing_kind: job.filing_kind,
      schema_version: job.schema_version,
      package_ref: job.package_ref,
      package_hash: job.package_hash,
      previous_job_ref: job.previous_job_ref ?? null,
      idempotency_key: `${job.filing_job_id}:${job.package_hash}`,
      payload_hash: `sha256:${job.package_hash}`,
    });
  }

  function checkedProviderReceipt(context, request, operation, receiptInput) {
    return assertHrxProviderReceiptForOperation(receiptInput, {
      boundary: providerBoundary,
      tenant_id: context.tenant_id,
      operation: `filing.${request.filing_kind}`,
      idempotency_key: request.idempotency_key,
      payload_hash: request.payload_hash,
      attempt_count: operation.attempt_count,
    }).receipt;
  }

  function completeOperation(context, request, operation, receipt) {
    try {
      return repository.completeProviderOperation(context, {
        provider_kind: "filing",
        idempotency_key: request.idempotency_key,
        state: receipt.state,
        provider_receipt_id: receipt.receipt_id,
        provider_receipt_ref: receipt.provider_receipt_ref,
        safe_error_code: receipt.error_code,
        expected_version: operation.state_version,
      }).operation;
    } catch (error) {
      if (error?.safe_error_code === "HRX_PROVIDER_RECEIPT_DUPLICATE") {
        error.safe_error_code = "HRX_PAYROLL_FILING_RECEIPT_DUPLICATE";
      }
      throw error;
    }
  }

  function markOperationUnknown(context, request, operation, error) {
    if (!operation || !["in_progress", "pending"].includes(operation.state)) return;
    try {
      repository.completeProviderOperation(context, {
        provider_kind: "filing",
        idempotency_key: request.idempotency_key,
        state: "unknown",
        safe_error_code: error?.safe_error_code ?? "HRX_PROVIDER_RESULT_UNKNOWN",
        expected_version: operation.state_version,
      });
    } catch {
      // A concurrent completion is authoritative; preserve the original safe error.
    }
  }

  function settleFilingJob(context, job, operation) {
    if (operation.state === "pending" || operation.state === "in_progress") {
      return Object.freeze({
        job,
        provider_state: "pending",
        idempotent_replay: true,
        production_ready_claim: false,
      });
    }
    if (operation.state === "succeeded") {
      if (job.state === "accepted") {
        return Object.freeze({
          job,
          provider_state: "succeeded",
          idempotent_replay: true,
          production_ready_claim: false,
        });
      }
      if (job.state !== "submitted") throw safeError("Submitted filing job is required", "HRX_PAYROLL_FILING_STATE_INVALID", 409);
      const accepted = repository.transitionFilingJob(context, {
        filing_job_id: job.filing_job_id,
        state: "accepted",
        expected_version: job.state_version,
        provider_receipt_ref: operation.provider_receipt_ref,
      });
      return Object.freeze({ job: accepted, provider_state: "succeeded", production_ready_claim: false });
    }
    if (operation.state === "failed") {
      if (job.state === "rejected") {
        return Object.freeze({
          job,
          provider_state: "failed",
          idempotent_replay: true,
          production_ready_claim: false,
        });
      }
      if (job.state !== "submitted") throw safeError("Submitted filing job is required", "HRX_PAYROLL_FILING_STATE_INVALID", 409);
      const rejected = repository.transitionFilingJob(context, {
        filing_job_id: job.filing_job_id,
        state: "rejected",
        expected_version: job.state_version,
        provider_receipt_ref: `provider:error/${operation.provider_receipt_id}`,
        safe_error_code: operation.safe_error_code,
      });
      return Object.freeze({ job: rejected, provider_state: "failed", production_ready_claim: false });
    }
    throw safeError("Filing provider result is not settled", "HRX_PAYROLL_FILING_PROVIDER_PENDING", 409);
  }

  async function submit(context, input = {}) {
    let job = repository.getFilingJob(context, { filing_job_id: requiredString(input, "filing_job_id") });
    if (!job) throw safeError("Filing job not found", "HRX_PAYROLL_FILING_NOT_FOUND", 404);
    requireClosedBundle(context, job.run_id);
    const request = providerRequest(context, job);
    let operation = repository.getProviderOperation(context, {
      provider_kind: "filing",
      idempotency_key: request.idempotency_key,
    });

    if (
      operation?.state === "succeeded"
      || operation?.state === "failed" && ["submitted", "rejected"].includes(job.state)
    ) {
      return settleFilingJob(context, job, operation);
    }
    if (operation?.state === "pending") {
      if (typeof providerPort?.status !== "function") return settleFilingJob(context, job, operation);
      try {
        const receipt = checkedProviderReceipt(
          context,
          request,
          operation,
          await providerPort.status({
            ...request,
            provider_receipt_id: operation.provider_receipt_id,
          }),
        );
        operation = completeOperation(context, request, operation, receipt);
        job = repository.getFilingJob(context, { filing_job_id: job.filing_job_id });
        return settleFilingJob(context, job, operation);
      } catch (error) {
        markOperationUnknown(context, request, operation, error);
        throw error;
      }
    }
    if (!["validated", "submitted"].includes(job.state)) throw safeError("Validated or submitted filing job is required", "HRX_PAYROLL_FILING_STATE_INVALID", 409);
    if (!providerPort?.submit) throw safeError("Authoritative filing provider is required", "HRX_PAYROLL_FILING_PROVIDER_REQUIRED", 503);

    const begun = repository.beginFilingSubmissionAttempt(context, {
      filing_job_id: job.filing_job_id,
      provider_kind: "filing",
      operation: `filing.${job.filing_kind}`,
      idempotency_key: request.idempotency_key,
      request_hash: job.package_hash,
      maximum_attempts: providerBoundary.maximum_attempts,
      lease_duration_ms: submissionLeaseDurationMs,
    });
    operation = begun.operation;
    if (!begun.should_execute) return settleFilingJob(context, job, operation);
    job = begun.job;
    try {
      const receipt = checkedProviderReceipt(
        context,
        request,
        operation,
        await providerPort.submit(request),
      );
      operation = completeOperation(context, request, operation, receipt);
      job = repository.getFilingJob(context, { filing_job_id: job.filing_job_id });
      return settleFilingJob(context, job, operation);
    } catch (error) {
      markOperationUnknown(context, request, operation, error);
      throw error;
    }
  }

  async function correct(context, input = {}) {
    if (Object.prototype.hasOwnProperty.call(input, "records")) {
      throw safeError("Payroll filing records are derived from the closed payroll run", "HRX_PAYROLL_FILING_RECORDS_FORBIDDEN", 400);
    }
    const job = repository.getFilingJob(context, { filing_job_id: requiredString(input, "filing_job_id") });
    if (!job) throw safeError("Filing job not found", "HRX_PAYROLL_FILING_NOT_FOUND", 404);
    requireClosedBundle(context, job.run_id);
    if (job.state !== "rejected") throw safeError("Rejected filing job is required", "HRX_PAYROLL_FILING_STATE_INVALID", 409);
    const replacementRunId = requiredString(input, "replacement_run_id");
    const bundle = requireClosedBundle(context, replacementRunId);
    if (bundle.run.run_type !== "adjustment" || bundle.run.previous_run_id !== job.run_id) {
      throw safeError("A closed adjustment run linked to the rejected filing is required", "HRX_PAYROLL_FILING_CORRECTION_SOURCE_INVALID", 409);
    }
    const existing = repository.listFilingJobs(context, {
      run_id: replacementRunId,
      filing_kind: job.filing_kind,
    }).find((row) => row.schema_version === job.schema_version);
    if (existing) {
      if (existing.previous_job_ref !== `artifact:payroll-filing/${job.filing_job_id}`) {
        throw safeError("Replacement filing is linked to another source", "HRX_PAYROLL_FILING_CORRECTION_SOURCE_INVALID", 409);
      }
      return existing;
    }
    return persistPackage(context, {
      bundle,
      filingKind: job.filing_kind,
      schemaVersion: job.schema_version,
      previousJob: job,
    });
  }

  function list(context, input = {}) {
    return repository.listFilingJobs(context, input);
  }

  return Object.freeze({ createPackage, validate, submit, correct, list });
}
