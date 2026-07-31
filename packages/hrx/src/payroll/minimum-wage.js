import { roundPayrollProduct } from "./money.js";
import { publicEmployeeDisplayName } from "../people-presentation.js";

export const HRX_MINIMUM_WAGE_SCHEMA_VERSION = "law-firm-os.hrx.minimum-wage.v1";

const HASH = /^[a-f0-9]{64}$/i;
const TOKEN_REF = /^[A-Za-z][A-Za-z0-9_-]*:[^\s@]+$/;
const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const ROUNDING_MODES = new Set(["truncate", "floor", "ceil", "nearest"]);
const LEGAL_REVIEW_STATES = new Set(["pending", "approved", "rejected"]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function positiveInteger(input, field) {
  const value = input?.[field];
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

function isoDate(input, field, optional = false) {
  const value = input?.[field];
  if (optional && (value === undefined || value === null || value === "")) return null;
  const result = requiredString(input, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) throw new TypeError(`${field} must be an ISO date`);
  return result;
}

function exactKeys(value, allowed, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new TypeError(`${field} contains unsupported field ${unknown[0]}`);
}

function codeList(value, field) {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  const result = [...new Set(value.map((entry) => requiredString({ entry }, "entry").toUpperCase()))].sort();
  if (result.some((entry) => !CODE.test(entry))) throw new TypeError(`${field} contains an invalid item code`);
  return result;
}

function guardedError(message, code, status = 409) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function packageFromRow(row) {
  const rules = typeof row?.rules_json === "string" ? JSON.parse(row.rules_json) : row?.rules ?? row;
  return createMinimumWageStandard(rules);
}

export function createMinimumWageStandard(input = {}, { production = false } = {}) {
  exactKeys(input, [
    "schema_version",
    "standard_id",
    "version_code",
    "jurisdiction",
    "effective_from",
    "effective_to",
    "hourly_minimum_krw",
    "monthly_conversion_minutes",
    "monthly_minimum_krw",
    "rounding_mode",
    "included_item_codes",
    "excluded_item_codes",
    "source_document_ref",
    "source_document_hash",
    "legal_review_state",
    "legal_review_ref",
    "fixture_only",
  ], "minimum_wage");
  if (input.schema_version !== HRX_MINIMUM_WAGE_SCHEMA_VERSION) throw new TypeError("minimum wage schema_version is unsupported");
  if (input.jurisdiction !== "KR") throw new TypeError("minimum wage jurisdiction must be KR");
  const effectiveFrom = isoDate(input, "effective_from");
  const effectiveTo = isoDate(input, "effective_to", true);
  if (effectiveTo && effectiveTo < effectiveFrom) throw new TypeError("effective_to must not precede effective_from");
  const hourlyMinimum = positiveInteger(input, "hourly_minimum_krw");
  const monthlyMinutes = positiveInteger(input, "monthly_conversion_minutes");
  const monthlyMinimum = positiveInteger(input, "monthly_minimum_krw");
  const roundingMode = requiredString(input, "rounding_mode");
  if (!ROUNDING_MODES.has(roundingMode)) throw new TypeError("rounding_mode is invalid");
  if (roundPayrollProduct([hourlyMinimum, monthlyMinutes], [60], roundingMode) !== monthlyMinimum) {
    throw new TypeError("monthly_minimum_krw does not match the hourly standard and conversion minutes");
  }
  const included = codeList(input.included_item_codes, "included_item_codes");
  const excluded = codeList(input.excluded_item_codes, "excluded_item_codes");
  if (!included.includes("BASE")) throw new TypeError("included_item_codes must include BASE");
  if (included.some((code) => excluded.includes(code))) throw new TypeError("included and excluded item codes must not overlap");
  const sourceRef = requiredString(input, "source_document_ref");
  const sourceHash = requiredString(input, "source_document_hash").toLowerCase();
  if (!TOKEN_REF.test(sourceRef)) throw new TypeError("source_document_ref must be tokenized");
  if (!HASH.test(sourceHash)) throw new TypeError("source_document_hash must be a SHA-256 digest");
  const legalReviewState = requiredString(input, "legal_review_state");
  if (!LEGAL_REVIEW_STATES.has(legalReviewState)) throw new TypeError("legal_review_state is invalid");
  const legalReviewRef = input.legal_review_ref == null ? null : requiredString(input, "legal_review_ref");
  if (legalReviewRef && !TOKEN_REF.test(legalReviewRef)) throw new TypeError("legal_review_ref must be tokenized");
  if (legalReviewState === "approved" && !legalReviewRef) throw new TypeError("approved minimum wage standard requires legal_review_ref");
  if (production && (input.fixture_only === true || legalReviewState !== "approved")) {
    throw guardedError("Minimum wage standard is not approved for production", "HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED", 403);
  }
  return Object.freeze({
    schema_version: HRX_MINIMUM_WAGE_SCHEMA_VERSION,
    standard_id: requiredString(input, "standard_id"),
    version_code: requiredString(input, "version_code"),
    jurisdiction: "KR",
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    hourly_minimum_krw: hourlyMinimum,
    monthly_conversion_minutes: monthlyMinutes,
    monthly_minimum_krw: monthlyMinimum,
    rounding_mode: roundingMode,
    included_item_codes: Object.freeze(included),
    excluded_item_codes: Object.freeze(excluded),
    source_document_ref: sourceRef,
    source_document_hash: sourceHash,
    legal_review_state: legalReviewState,
    legal_review_ref: legalReviewRef,
    fixture_only: input.fixture_only === true,
  });
}

export function calculateMinimumWageImpact({ standard: standardInput, employees = [] } = {}) {
  const standard = createMinimumWageStandard(standardInput);
  if (standard.legal_review_state !== "approved") throw guardedError("Minimum wage impact requires legal review", "HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED", 403);
  if (!Array.isArray(employees)) throw new TypeError("employees must be an array");
  const impacts = employees.map((employee, index) => {
    const employeeId = requiredString(employee, "employee_id");
    const displayName = publicEmployeeDisplayName({ ...employee, employee_id: employeeId });
    const contractualMinutes = positiveInteger(employee, "contractual_minutes");
    const basePay = Number.isSafeInteger(employee.base_pay_krw) && employee.base_pay_krw >= 0
      ? employee.base_pay_krw
      : (() => { throw new TypeError(`employees[${index}].base_pay_krw must be a non-negative integer`); })();
    const items = [{ code: "BASE", amount_krw: basePay }, ...(Array.isArray(employee.allowances) ? employee.allowances : [])].map((item, itemIndex) => {
      const itemCode = requiredString(item, "code").toUpperCase();
      if (!CODE.test(itemCode)) throw new TypeError(`employees[${index}].allowances[${itemIndex}].code is invalid`);
      if (!Number.isSafeInteger(item.amount_krw) || item.amount_krw < 0) throw new TypeError(`employees[${index}].allowances[${itemIndex}].amount_krw must be a non-negative integer`);
      return { code: itemCode, amount_krw: item.amount_krw };
    });
    const unknownCodes = [...new Set(items.map((item) => item.code)
      .filter((code) => !standard.included_item_codes.includes(code) && !standard.excluded_item_codes.includes(code)))].sort();
    const includedWage = items.filter((item) => standard.included_item_codes.includes(item.code)).reduce((sum, item) => sum + item.amount_krw, 0);
    const requiredWage = roundPayrollProduct([standard.hourly_minimum_krw, contractualMinutes], [60], standard.rounding_mode);
    const effectiveHourly = roundPayrollProduct([includedWage, 60], [contractualMinutes], standard.rounding_mode);
    const reviewRequired = unknownCodes.length > 0;
    return Object.freeze({
      employee_id: employeeId,
      display_name: displayName,
      contractual_minutes: contractualMinutes,
      included_wage_krw: includedWage,
      required_wage_krw: requiredWage,
      effective_hourly_krw: effectiveHourly,
      gap_krw: includedWage - requiredWage,
      is_below_candidate: reviewRequired ? null : includedWage < requiredWage,
      result_state: reviewRequired ? "review_required" : includedWage < requiredWage ? "below_candidate" : "meets_or_above",
      unknown_item_codes: Object.freeze(unknownCodes),
      legal_determination: false,
    });
  }).sort((left, right) => left.employee_id.localeCompare(right.employee_id));
  return Object.freeze({
    standard,
    monthly_reference_krw: standard.monthly_minimum_krw,
    impacts: Object.freeze(impacts),
    below_candidate_count: impacts.filter((row) => row.is_below_candidate === true).length,
    review_required_count: impacts.filter((row) => row.result_state === "review_required").length,
    legal_determination: false,
    production_ready_claim: false,
  });
}

export function serializeMinimumWageImpact(report, { can_view_amounts = false } = {}) {
  if (can_view_amounts) {
    const visible = clone(report);
    visible.impacts = Object.freeze(visible.impacts.map((impact, index) => {
      const displayName = publicEmployeeDisplayName(impact, `구성원 ${index + 1}`);
      const { employee_id: _employeeId, user_id: _userId, display_name: _rawDisplayName, ...row } = impact;
      return Object.freeze({ ...row, display_name: displayName });
    }));
    return Object.freeze(visible);
  }
  return Object.freeze({
    standard: Object.freeze({
      standard_id: report.standard.standard_id,
      version_code: report.standard.version_code,
      effective_from: report.standard.effective_from,
      effective_to: report.standard.effective_to,
      source_document_hash: report.standard.source_document_hash,
      legal_review_state: report.standard.legal_review_state,
    }),
    impacts: Object.freeze(report.impacts.map((row, index) => Object.freeze({
      display_name: `구성원 ${index + 1}`,
      result_state: row.result_state,
      is_below_candidate: row.is_below_candidate,
      legal_determination: false,
    }))),
    below_candidate_count: report.below_candidate_count,
    review_required_count: report.review_required_count,
    legal_determination: false,
    production_ready_claim: false,
  });
}

export function createMinimumWageService({
  payrollRepository,
  production = false,
  publishEnabled = false,
} = {}) {
  if (
    !payrollRepository
    || typeof payrollRepository.createRuleVersion !== "function"
    || typeof payrollRepository.legallyApproveMinimumWageRuleVersion !== "function"
  ) {
    throw new TypeError("payrollRepository is required");
  }

  function decorate(row) {
    const standard = packageFromRow(row);
    return Object.freeze({
      ...clone(row),
      workflow_state: row.approval_state === "draft"
        ? standard.legal_review_state === "approved" ? "legal_approved" : "pending"
        : row.approval_state,
      standard,
    });
  }

  function list(context) {
    return payrollRepository.listRuleVersions(context, { rule_kind: "minimum_wage" }).map(decorate);
  }

  function createDraft(context, input = {}) {
    const standard = createMinimumWageStandard(input.standard, { production: false });
    if (standard.legal_review_state !== "pending" || standard.legal_review_ref) {
      throw guardedError(
        "A minimum wage rule must begin in pending legal review",
        "HRX_MINIMUM_WAGE_LEGAL_REVIEW_STATE_INVALID",
      );
    }
    return decorate(payrollRepository.createRuleVersion(context, {
      rule_version_id: input.rule_version_id,
      rule_kind: "minimum_wage",
      version_code: standard.version_code,
      effective_from: standard.effective_from,
      effective_to: standard.effective_to,
      source_document_hash: standard.source_document_hash,
      rules: standard,
    }));
  }

  function legallyApprove(context, input = {}) {
    if (!publishEnabled) {
      throw guardedError("Minimum wage legal approval is disabled", "HRX_PAYROLL_RULE_PUBLISH_DISABLED", 403);
    }
    const row = list(context).find((candidate) => candidate.rule_version_id === input.rule_version_id);
    if (!row) throw guardedError("Minimum wage standard not found", "HRX_MINIMUM_WAGE_NOT_FOUND", 404);
    if (row.approval_state !== "draft" || row.standard.legal_review_state !== "pending") {
      throw guardedError("Minimum wage standard is not pending legal review", "HRX_MINIMUM_WAGE_LEGAL_REVIEW_STATE_INVALID");
    }
    return decorate(payrollRepository.legallyApproveMinimumWageRuleVersion(context, input));
  }

  function review(context, input = {}) {
    const row = list(context).find((candidate) => candidate.rule_version_id === input.rule_version_id);
    if (!row) throw guardedError("Minimum wage standard not found", "HRX_MINIMUM_WAGE_NOT_FOUND", 404);
    if (row.standard.legal_review_state !== "approved") {
      throw guardedError("Minimum wage standard requires legal review", "HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED", 403);
    }
    return decorate(payrollRepository.reviewRuleVersion(context, input));
  }

  function publish(context, input = {}) {
    if (!publishEnabled) throw guardedError("Minimum wage publication is disabled", "HRX_PAYROLL_RULE_PUBLISH_DISABLED", 403);
    const row = list(context).find((candidate) => candidate.rule_version_id === input.rule_version_id);
    if (!row) throw guardedError("Minimum wage standard not found", "HRX_MINIMUM_WAGE_NOT_FOUND", 404);
    if (row.standard.legal_review_state !== "approved") throw guardedError("Minimum wage standard requires legal review", "HRX_MINIMUM_WAGE_LEGAL_REVIEW_REQUIRED", 403);
    createMinimumWageStandard(row.standard, { production });
    return decorate(payrollRepository.publishRuleVersion(context, input));
  }

  function getPublishedForDate(context, input = {}) {
    const asOf = isoDate(input, "as_of");
    const matches = list(context).filter((row) => row.approval_state === "published" && row.effective_from <= asOf && (!row.effective_to || row.effective_to >= asOf));
    if (matches.length !== 1) throw guardedError("Exactly one published minimum wage standard is required", "HRX_MINIMUM_WAGE_COVERAGE_INVALID");
    return matches[0];
  }

  function preview(context, input = {}) {
    const row = getPublishedForDate(context, input);
    return calculateMinimumWageImpact({ standard: row.standard, employees: input.employees });
  }

  return Object.freeze({ list, createDraft, legallyApprove, review, publish, getPublishedForDate, preview });
}
