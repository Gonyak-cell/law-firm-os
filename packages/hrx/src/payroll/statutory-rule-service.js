export const HRX_PAYROLL_STATUTORY_RULES_SCHEMA_VERSION = "law-firm-os.hrx.payroll-statutory-rules.v0.1";

const HASH = /^(?:sha256:)?[a-f0-9]{64}$/i;
const TOKEN_REF = /^[A-Za-z][A-Za-z0-9_-]*:[^\s]+$/;
const CODE = /^[A-Z][A-Z0-9_.-]{0,63}$/;
const ROUNDING = new Set(["truncate", "floor", "ceil", "nearest"]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function requiredString(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function isoDate(value, field) {
  const result = requiredString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) throw new TypeError(`${field} must be an ISO date`);
  return result;
}

function integer(value, field, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new TypeError(`${field} is invalid`);
  return value;
}

function token(value, field) {
  const result = requiredString(value, field);
  if (!TOKEN_REF.test(result)) throw new TypeError(`${field} must be tokenized`);
  return result;
}

function normalizeContribution(input, field) {
  const minimum = integer(input?.minimum_base_krw, `${field}.minimum_base_krw`);
  const maximum = integer(input?.maximum_base_krw, `${field}.maximum_base_krw`);
  if (minimum > maximum) throw new TypeError(`${field} base range is invalid`);
  return {
    employee_rate_bps: integer(input?.employee_rate_bps, `${field}.employee_rate_bps`, { maximum: 10_000 }),
    minimum_base_krw: minimum,
    maximum_base_krw: maximum,
  };
}

function normalizeIncomeTax(input) {
  if (!Array.isArray(input?.brackets) || input.brackets.length === 0) throw new TypeError("income_tax.brackets must be a non-empty array");
  const brackets = input.brackets.map((row, index) => ({
    dependent_count: integer(row?.dependent_count, `income_tax.brackets[${index}].dependent_count`),
    minimum_taxable_krw: integer(row?.minimum_taxable_krw, `income_tax.brackets[${index}].minimum_taxable_krw`),
    maximum_taxable_krw: row?.maximum_taxable_krw == null ? null : integer(row.maximum_taxable_krw, `income_tax.brackets[${index}].maximum_taxable_krw`),
    tax_krw: integer(row?.tax_krw, `income_tax.brackets[${index}].tax_krw`),
  })).sort((left, right) => left.dependent_count - right.dependent_count || left.minimum_taxable_krw - right.minimum_taxable_krw);
  for (const dependentCount of [...new Set(brackets.map((row) => row.dependent_count))]) {
    const rows = brackets.filter((row) => row.dependent_count === dependentCount);
    if (rows[0].minimum_taxable_krw !== 0 || rows.at(-1).maximum_taxable_krw !== null) throw new TypeError(`income tax brackets for dependent_count ${dependentCount} must cover zero through infinity`);
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (row.maximum_taxable_krw !== null && row.maximum_taxable_krw < row.minimum_taxable_krw) throw new TypeError("income tax bracket range is invalid");
      if (index > 0 && rows[index - 1].maximum_taxable_krw + 1 !== row.minimum_taxable_krw) throw new TypeError(`income tax brackets for dependent_count ${dependentCount} must be contiguous`);
    }
  }
  const categories = (input.withholding_categories ?? []).map((row, index) => {
    const categoryCode = requiredString(row?.code, `income_tax.withholding_categories[${index}].code`);
    if (!CODE.test(categoryCode)) throw new TypeError("withholding category code is invalid");
    return { code: categoryCode, rate_bps: integer(row?.rate_bps, `income_tax.withholding_categories[${index}].rate_bps`, { maximum: 10_000 }) };
  }).sort((left, right) => left.code.localeCompare(right.code));
  if (new Set(categories.map((row) => row.code)).size !== categories.length) throw new TypeError("withholding category codes must be unique");
  return {
    local_income_tax_rate_bps: integer(input.local_income_tax_rate_bps, "income_tax.local_income_tax_rate_bps", { maximum: 10_000 }),
    dependent_overflow: input.dependent_overflow === "highest_available" ? input.dependent_overflow : (() => { throw new TypeError("income_tax.dependent_overflow is invalid"); })(),
    brackets,
    withholding_categories: categories,
  };
}

export function createPayrollStatutoryRulePackage(input = {}, { production = false } = {}) {
  if (input.schema_version !== HRX_PAYROLL_STATUTORY_RULES_SCHEMA_VERSION) throw new TypeError("payroll statutory rules schema_version is unsupported");
  if (input.currency !== "KRW") throw new TypeError("payroll statutory rules currency must be KRW");
  const effectiveFrom = isoDate(input.effective_from, "effective_from");
  const effectiveTo = input.effective_to == null ? null : isoDate(input.effective_to, "effective_to");
  if (effectiveTo && effectiveFrom > effectiveTo) throw new TypeError("payroll statutory rule effective range is invalid");
  const sourceDocumentHash = requiredString(input.source_document_hash, "source_document_hash");
  if (!HASH.test(sourceDocumentHash)) throw new TypeError("source_document_hash is invalid");
  if (!ROUNDING.has(input.rounding_mode)) throw new TypeError("rounding_mode is invalid");
  const fixtureOnly = input.fixture_only === true;
  if (production) {
    if (fixtureOnly) throw new TypeError("fixture-only statutory rules cannot be used in production");
    for (const field of ["owner_approval_ref", "labor_review_ref", "tax_review_ref"]) token(input[field], field);
  }
  const result = {
    schema_version: input.schema_version,
    package_id: requiredString(input.package_id, "package_id"),
    version_code: requiredString(input.version_code, "version_code"),
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    currency: "KRW",
    fixture_only: fixtureOnly,
    source_document_ref: token(input.source_document_ref, "source_document_ref"),
    source_document_hash: sourceDocumentHash,
    owner_approval_ref: input.owner_approval_ref ? token(input.owner_approval_ref, "owner_approval_ref") : null,
    labor_review_ref: input.labor_review_ref ? token(input.labor_review_ref, "labor_review_ref") : null,
    tax_review_ref: input.tax_review_ref ? token(input.tax_review_ref, "tax_review_ref") : null,
    rounding_mode: input.rounding_mode,
    income_tax: normalizeIncomeTax(input.income_tax),
    pension: normalizeContribution(input.pension, "pension"),
    health: normalizeContribution(input.health, "health"),
    long_term_care: { rate_bps_of_health: integer(input.long_term_care?.rate_bps_of_health, "long_term_care.rate_bps_of_health", { maximum: 10_000 }) },
    employment_insurance: { employee_rate_bps: integer(input.employment_insurance?.employee_rate_bps, "employment_insurance.employee_rate_bps", { maximum: 10_000 }) },
    custom_deduction_net_floor_krw: integer(input.custom_deduction_net_floor_krw, "custom_deduction_net_floor_krw"),
  };
  return deepFreeze(result);
}

export function createPayrollStatutoryRuleService({ payrollRepository, production = false } = {}) {
  if (!payrollRepository || typeof payrollRepository.createRuleVersion !== "function") throw new TypeError("payrollRepository is required");

  function importDraft(context, input = {}) {
    const packageValue = createPayrollStatutoryRulePackage(input.package, { production });
    return payrollRepository.createRuleVersion(context, {
      rule_version_id: input.rule_version_id,
      rule_kind: "payroll_statutory",
      version_code: packageValue.version_code,
      effective_from: packageValue.effective_from,
      effective_to: packageValue.effective_to,
      source_document_hash: packageValue.source_document_hash,
      rules: packageValue,
    });
  }

  function review(context, input = {}) {
    return payrollRepository.reviewRuleVersion(context, input);
  }

  function publish(context, input = {}) {
    const row = payrollRepository.listRuleVersions(context, { rule_kind: "payroll_statutory" }).find((candidate) => candidate.rule_version_id === input.rule_version_id);
    if (!row) throw new Error("Payroll statutory rule not found");
    createPayrollStatutoryRulePackage(JSON.parse(row.rules_json), { production });
    return payrollRepository.publishRuleVersion(context, input);
  }

  function getPublishedForDate(context, input = {}) {
    const asOf = isoDate(input.as_of, "as_of");
    const matches = payrollRepository.listRuleVersions(context, { rule_kind: "payroll_statutory" })
      .filter((row) => row.approval_state === "published" && row.effective_from <= asOf && (!row.effective_to || row.effective_to >= asOf));
    if (matches.length !== 1) throw new Error("Exactly one published payroll statutory rule is required for as_of");
    return clone(matches[0]);
  }

  return Object.freeze({ importDraft, review, publish, getPublishedForDate });
}
