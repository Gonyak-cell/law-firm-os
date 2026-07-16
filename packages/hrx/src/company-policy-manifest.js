const SCHEMA_VERSION = "law-firm-os.hrx.company-time-payroll-policy.v0.1";
const ENVIRONMENTS = Object.freeze(["synthetic", "staging", "production"]);
const STATUSES = Object.freeze(["draft", "approved"]);
const ROUNDING_MODES = Object.freeze(["none", "ceil", "floor", "nearest"]);
const NON_BUSINESS_DAY_RULES = Object.freeze(["previous_business_day", "next_business_day"]);
const EMPLOYMENT_TYPES = Object.freeze(["full_time", "part_time", "contractor", "intern"]);
const PROVIDER_KEYS = Object.freeze(["document_delivery", "bank_transfer", "tax_filing", "calendar"]);
const DECISION_IDS = Object.freeze([
  "COMPANY_STANDARD_WORKDAY",
  "LEAVE_EXPIRATION",
  "PAYROLL_CALENDAR",
  "EMPLOYMENT_TYPES",
  "PROVIDER_IDENTIFIERS",
]);
const DECISION_STATUSES = Object.freeze(["approved", "pending_owner"]);
const PLACEHOLDER_PATTERN = /(?:synthetic|placeholder|pending|example|dummy|test|demo|tbd|todo)/i;

export const HRX_COMPANY_POLICY_MANIFEST_SCHEMA_VERSION = SCHEMA_VERSION;
export const HRX_COMPANY_POLICY_PROVIDER_KEYS = PROVIDER_KEYS;
export const HRX_COMPANY_POLICY_DECISION_IDS = DECISION_IDS;

function plainObject(value, field, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${field} must be a plain object`);
    return {};
  }
  return value;
}

function requiredString(value, field, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be a non-empty string`);
    return "";
  }
  return value.trim();
}

function optionalString(value, field, errors) {
  if (value === null || value === undefined) return null;
  return requiredString(value, field, errors);
}

function enumValue(value, allowed, field, errors) {
  if (!allowed.includes(value)) {
    errors.push(`${field} must be one of: ${allowed.join(", ")}`);
    return allowed[0];
  }
  return value;
}

function integer(value, field, errors, minimum, maximum, { nullable = false } = {}) {
  if (nullable && (value === null || value === undefined)) return null;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    errors.push(`${field} must be an integer between ${minimum} and ${maximum}`);
    return null;
  }
  return value;
}

function isoDate(value, field, errors) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    errors.push(`${field} must be an ISO date (YYYY-MM-DD)`);
    return "";
  }
  return value;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function normalizeEmploymentTypes(value, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("employment_types must be a non-empty array");
    return [];
  }
  const normalized = value.map((item, index) => enumValue(item, EMPLOYMENT_TYPES, `employment_types[${index}]`, errors));
  if (new Set(normalized).size !== normalized.length) errors.push("employment_types must not contain duplicates");
  return normalized;
}

function normalizeProviderIds(value, errors) {
  const input = plainObject(value, "provider_ids", errors);
  for (const key of Object.keys(input)) {
    if (!PROVIDER_KEYS.includes(key)) errors.push(`provider_ids contains unsupported key: ${key}`);
  }
  return Object.fromEntries(PROVIDER_KEYS.map((key) => [key, optionalString(input[key], `provider_ids.${key}`, errors)]));
}

function normalizeDecisions(value, errors) {
  if (!Array.isArray(value)) {
    errors.push("decisions must be an array");
    return [];
  }
  const seen = new Set();
  const decisions = value.map((entry, index) => {
    const item = plainObject(entry, `decisions[${index}]`, errors);
    const decisionId = enumValue(item.decision_id, DECISION_IDS, `decisions[${index}].decision_id`, errors);
    if (seen.has(decisionId)) errors.push(`decisions contains duplicate decision_id: ${decisionId}`);
    seen.add(decisionId);
    return {
      decision_id: decisionId,
      status: enumValue(item.status, DECISION_STATUSES, `decisions[${index}].status`, errors),
      source_ref: optionalString(item.source_ref, `decisions[${index}].source_ref`, errors),
    };
  });
  for (const decisionId of DECISION_IDS) {
    if (!seen.has(decisionId)) errors.push(`decisions is missing decision_id: ${decisionId}`);
  }
  return decisions;
}

function productionErrors(value) {
  const errors = [];
  if (value.environment !== "production") errors.push("production manifest environment must be production");
  if (value.status !== "approved") errors.push("production manifest status must be approved");
  for (const [field, candidate] of [["manifest_id", value.manifest_id], ["tenant_id", value.tenant_id]]) {
    if (!candidate || PLACEHOLDER_PATTERN.test(candidate)) errors.push(`production ${field} must not be synthetic or placeholder`);
  }
  if (!value.source_document_hash || !/^sha256:[a-f0-9]{64}$/.test(value.source_document_hash)) {
    errors.push("production source_document_hash must be a sha256 digest");
  }
  if (!value.payroll.cutoff_day) errors.push("production payroll.cutoff_day is required");
  if (!value.payroll.pay_day) errors.push("production payroll.pay_day is required");
  if (!value.payroll.non_business_day_rule) errors.push("production payroll.non_business_day_rule is required");
  for (const key of PROVIDER_KEYS) {
    const providerId = value.provider_ids[key];
    if (!providerId || PLACEHOLDER_PATTERN.test(providerId)) {
      errors.push(`production provider_ids.${key} must be a real provider identifier`);
    }
  }
  for (const decisionId of DECISION_IDS) {
    const decision = value.decisions.find((item) => item.decision_id === decisionId);
    if (!decision || decision.status !== "approved") errors.push(`production decision ${decisionId} must be approved`);
    if (!decision?.source_ref || PLACEHOLDER_PATTERN.test(decision.source_ref)) {
      errors.push(`production decision ${decisionId} must have a non-placeholder source_ref`);
    }
  }
  return errors;
}

export function validateCompanyTimePayrollPolicyManifest(input, { production = false } = {}) {
  const errors = [];
  const source = plainObject(input, "company policy manifest", errors);
  const standardWork = plainObject(source.standard_work, "standard_work", errors);
  const leave = plainObject(source.leave, "leave", errors);
  const payroll = plainObject(source.payroll, "payroll", errors);
  const dailyMinutes = integer(standardWork.daily_minutes, "standard_work.daily_minutes", errors, 1, 1_440);
  const roundingMinutes = integer(standardWork.rounding_minutes, "standard_work.rounding_minutes", errors, 1, dailyMinutes ?? 1_440);
  const roundingMode = enumValue(standardWork.rounding_mode, ROUNDING_MODES, "standard_work.rounding_mode", errors);
  if (roundingMode === "none" && roundingMinutes !== 1) errors.push("standard_work.rounding_minutes must be 1 when rounding_mode is none");
  const nonBusinessDayRule = payroll.non_business_day_rule === null || payroll.non_business_day_rule === undefined
    ? null
    : enumValue(payroll.non_business_day_rule, NON_BUSINESS_DAY_RULES, "payroll.non_business_day_rule", errors);
  const value = {
    schema_version: requiredString(source.schema_version, "schema_version", errors),
    manifest_id: requiredString(source.manifest_id, "manifest_id", errors),
    tenant_id: requiredString(source.tenant_id, "tenant_id", errors),
    environment: enumValue(source.environment, ENVIRONMENTS, "environment", errors),
    status: enumValue(source.status, STATUSES, "status", errors),
    effective_from: isoDate(source.effective_from, "effective_from", errors),
    source_document_hash: optionalString(source.source_document_hash, "source_document_hash", errors),
    standard_work: {
      timezone: requiredString(standardWork.timezone, "standard_work.timezone", errors),
      daily_minutes: dailyMinutes,
      rounding_minutes: roundingMinutes,
      rounding_mode: roundingMode,
    },
    leave: {
      default_expiration_months: integer(leave.default_expiration_months, "leave.default_expiration_months", errors, 1, 120),
      allocation_order: enumValue(leave.allocation_order, ["earliest_expiry_then_earned_at"], "leave.allocation_order", errors),
    },
    payroll: {
      frequency: enumValue(payroll.frequency, ["monthly"], "payroll.frequency", errors),
      cutoff_day: integer(payroll.cutoff_day, "payroll.cutoff_day", errors, 1, 31, { nullable: true }),
      pay_day: integer(payroll.pay_day, "payroll.pay_day", errors, 1, 31, { nullable: true }),
      non_business_day_rule: nonBusinessDayRule,
    },
    employment_types: normalizeEmploymentTypes(source.employment_types, errors),
    provider_ids: normalizeProviderIds(source.provider_ids, errors),
    decisions: normalizeDecisions(source.decisions, errors),
  };
  if (value.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (production && errors.length === 0) errors.push(...productionErrors(value));
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    value: errors.length === 0 ? deepFreeze(value) : undefined,
  });
}

export function createCompanyTimePayrollPolicyManifest(input, options) {
  const validation = validateCompanyTimePayrollPolicyManifest(input, options);
  if (!validation.ok) throw new TypeError(`Invalid company time/payroll policy manifest: ${validation.errors.join("; ")}`);
  return validation.value;
}

export function assertCompanyTimePayrollPolicyProductionReady(input) {
  return createCompanyTimePayrollPolicyManifest(input, { production: true });
}
