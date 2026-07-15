import { calculateYearEndSettlement } from "./filing-service.js";
import { createPayrollDataHash } from "./repository.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function parse(value, fallback) {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function integer(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative integer`);
  return value;
}

function guardedError(message, code, status = 409) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function resultWithReview(inputs, reviewReceiptRef) {
  return calculateYearEndSettlement({
    employee_id: inputs.employee_id,
    tax_year: inputs.tax_year,
    taxable_income_krw: inputs.taxable_income_krw,
    determined_tax_krw: inputs.determined_tax_krw,
    withheld_tax_krw: inputs.withheld_tax_krw,
    collection_complete: inputs.collection_complete,
    ...(reviewReceiptRef ? { tax_review_receipt_ref: reviewReceiptRef } : {}),
  });
}

export function createPayrollYearEndService({ repository } = {}) {
  if (!repository?.getRunBundle || !repository?.listYearEndCases) throw new TypeError("payroll year-end service requires repository");

  function requireClosedBundle(context, runId) {
    const bundle = repository.getRunBundle(context, { run_id: runId });
    if (!bundle) throw guardedError("Payroll run not found", "HRX_PAYROLL_NOT_FOUND", 404);
    if (bundle.run.status !== "closed") throw guardedError("Closed payroll run is required", "HRX_PAYROLL_RUN_NOT_CLOSED");
    return bundle;
  }

  function rows(context, runId) {
    return repository.listYearEndCases(context, { run_id: runId });
  }

  function summary(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const cases = rows(context, runId);
    const counts = { collecting: 0, draft: 0, calculated: 0, reviewed: 0 };
    let settlementKrw = 0;
    for (const item of cases) {
      if (item.collection_state === "collecting") counts.collecting += 1;
      else counts[item.state] += 1;
      settlementKrw += parse(item.result_json, {}).settlement_krw ?? 0;
    }
    const state = cases.length === 0
      ? "missing"
      : counts.reviewed === cases.length
        ? "reviewed"
        : counts.calculated + counts.reviewed === cases.length
          ? "calculated"
          : counts.collecting === 0
            ? "draft"
            : "collecting";
    return Object.freeze({ run_id: runId, case_count: cases.length, state, counts: Object.freeze(counts), settlement_krw: settlementKrw, production_ready_claim: false });
  }

  function collectRun(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const bundle = requireClosedBundle(context, runId);
    const period = repository.getPeriod(context, { period_id: bundle.run.period_id });
    const taxYear = input.tax_year ?? Number(period?.period_end?.slice(0, 4));
    integer(taxYear, "tax_year");
    const records = new Map((input.records ?? []).map((item) => [requiredString(item, "employee_id"), item]));
    const current = new Map(rows(context, runId).map((item) => [item.employee_id, item]));
    for (const result of bundle.results) {
      const supplied = records.get(result.employee_id) ?? {};
      const deductions = bundle.line_items.filter((item) => item.result_id === result.result_id && ["INCOME_TAX", "LOCAL_INCOME_TAX"].includes(item.item_code));
      const withheldTaxKrw = deductions.reduce((sum, item) => sum + item.amount_krw, 0);
      const sourceRefs = supplied.source_refs ?? [{ kind: "payroll_result", ref: `artifact:payroll-result/${result.result_id}`, hash: result.result_hash }];
      const values = {
        employee_id: result.employee_id,
        tax_year: taxYear,
        taxable_income_krw: integer(supplied.taxable_income_krw ?? result.gross_krw, "taxable_income_krw"),
        determined_tax_krw: integer(supplied.determined_tax_krw ?? withheldTaxKrw, "determined_tax_krw"),
        withheld_tax_krw: integer(supplied.withheld_tax_krw ?? withheldTaxKrw, "withheld_tax_krw"),
        deduction_inputs: supplied.deduction_inputs ?? {},
        collection_complete: supplied.collection_complete !== false,
      };
      const payload = { source_refs: sourceRefs, inputs: values };
      const inputHash = createPayrollDataHash(payload);
      const existing = current.get(result.employee_id);
      if (!existing) {
        repository.createYearEndCase(context, { run_id: runId, employee_id: result.employee_id, tax_year: taxYear, collection_state: values.collection_complete ? "complete" : "collecting", source_refs: sourceRefs, inputs: values, input_hash: inputHash });
      } else if (existing.state === "draft") {
        repository.updateYearEndCaseInputs(context, { year_end_case_id: existing.year_end_case_id, expected_version: existing.state_version, collection_state: values.collection_complete ? "complete" : "collecting", source_refs: sourceRefs, inputs: values, input_hash: inputHash });
      }
    }
    return summary(context, { run_id: runId });
  }

  function calculateRun(context, input = {}) {
    const runId = requiredString(input, "run_id");
    requireClosedBundle(context, runId);
    const cases = rows(context, runId);
    if (!cases.length) throw guardedError("Payroll year-end collection is required", "HRX_PAYROLL_YEAR_END_COLLECTION_REQUIRED");
    if (cases.some((item) => item.collection_state !== "complete")) throw guardedError("Payroll year-end collection is incomplete", "HRX_PAYROLL_YEAR_END_COLLECTION_INCOMPLETE");
    for (const item of cases) {
      if (item.state !== "draft") continue;
      const values = parse(item.inputs_json, {});
      const result = resultWithReview(values, null);
      repository.calculateYearEndCase(context, { year_end_case_id: item.year_end_case_id, expected_version: item.state_version, result, result_hash: createPayrollDataHash(result) });
    }
    return summary(context, { run_id: runId });
  }

  function reviewRun(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const reviewReceiptRef = requiredString(input, "review_receipt_ref");
    const cases = rows(context, runId);
    if (!cases.length || cases.some((item) => !["calculated", "reviewed"].includes(item.state))) throw guardedError("Calculated payroll year-end cases are required", "HRX_PAYROLL_YEAR_END_STATE_INVALID");
    for (const item of cases) {
      if (item.state === "reviewed") continue;
      const result = resultWithReview(parse(item.inputs_json, {}), reviewReceiptRef);
      repository.reviewYearEndCase(context, { year_end_case_id: item.year_end_case_id, expected_version: item.state_version, result, result_hash: createPayrollDataHash(result), review_receipt_ref: reviewReceiptRef });
    }
    return summary(context, { run_id: runId });
  }

  function filingRecords(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const cases = rows(context, runId);
    if (!cases.length || cases.some((item) => item.state !== "reviewed")) throw guardedError("Reviewed payroll year-end cases are required", "HRX_PAYROLL_YEAR_END_REVIEW_REQUIRED");
    return Object.freeze(cases.map((item) => {
      const result = parse(item.result_json, {});
      return Object.freeze({ employee_id: item.employee_id, tax_year: item.tax_year, taxable_income_krw: result.taxable_income_krw, determined_tax_krw: result.determined_tax_krw, withheld_tax_krw: result.withheld_tax_krw, settlement_krw: result.settlement_krw, result_hash: item.result_hash });
    }));
  }

  return Object.freeze({ summary, collectRun, calculateRun, reviewRun, filingRecords });
}
