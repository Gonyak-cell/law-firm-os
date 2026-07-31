import { createHash } from "node:crypto";
import {
  applyPayrollBasisPoints,
  payrollKrwForMinutes,
  payrollKrwForMinutesAtBasisPoints,
  proratePayrollKrw,
} from "./money.js";

export const HRX_PAYROLL_EARNING_RULES_SCHEMA_VERSION = "law-firm-os.hrx.payroll-earning-rules.v0.1";

const EMPLOYMENT_TYPES = new Set(["monthly", "hourly", "daily", "freelancer"]);
const SEGMENTS = Object.freeze({ overtime: "OVERTIME", night: "NIGHT", holiday: "HOLIDAY", weekly_holiday: "WEEKLY_HOLIDAY" });
const TOKEN_REF = /^[A-Za-z][A-Za-z0-9_-]*:[^\s]+$/;
const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const HASH = /^(?:sha256:)?[a-f0-9]{64}$/i;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
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

function safeInteger(value, field, { minimum = Number.MIN_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new TypeError(`${field} must be a safe integer${minimum === 0 ? " at or above zero" : ""}`);
  return value;
}

function optionalPositiveInteger(value, field) {
  if (value === undefined || value === null) return null;
  return safeInteger(value, field, { minimum: 1 });
}

function code(value, field) {
  const result = requiredString(value, field);
  if (!CODE.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function boolean(value, field) {
  if (typeof value !== "boolean") throw new TypeError(`${field} must be boolean`);
  return value;
}

function enumValue(value, values, field) {
  const result = requiredString(value, field);
  if (!values.includes(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function exactKeys(value, allowed, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new TypeError(`${field} contains unsupported field ${unknown[0]}`);
  return value;
}

function stringSet(value, allowed, field) {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${field} must be a non-empty array`);
  const result = [...new Set(value.map((item, index) => requiredString(item, `${field}[${index}]`)))].sort();
  if (allowed && result.some((item) => !allowed.has(item))) throw new TypeError(`${field} contains an unsupported value`);
  return result;
}

function normalizeAllowance(input, index) {
  const field = `allowances[${index}]`;
  exactKeys(input, ["code", "amount_kind", "amount_krw", "rate_bps", "taxable", "non_taxable_limit_krw", "employment_types", "pay_groups"], field);
  const amountKind = enumValue(input?.amount_kind, ["fixed", "base_rate_bps"], `${field}.amount_kind`);
  const result = {
    code: code(input?.code, `${field}.code`),
    amount_kind: amountKind,
    amount_krw: amountKind === "fixed" ? safeInteger(input?.amount_krw, `${field}.amount_krw`, { minimum: 0 }) : null,
    rate_bps: amountKind === "base_rate_bps" ? safeInteger(input?.rate_bps, `${field}.rate_bps`, { minimum: 0 }) : null,
    taxable: boolean(input?.taxable, `${field}.taxable`),
    non_taxable_limit_krw: optionalPositiveInteger(input?.non_taxable_limit_krw, `${field}.non_taxable_limit_krw`),
    employment_types: stringSet(input?.employment_types, EMPLOYMENT_TYPES, `${field}.employment_types`),
    pay_groups: stringSet(input?.pay_groups, null, `${field}.pay_groups`),
  };
  if (result.taxable && result.non_taxable_limit_krw !== null) throw new TypeError(`${field}.non_taxable_limit_krw requires taxable=false`);
  return result;
}

function normalizeSegment(input, segment) {
  if (input === undefined || input === null) return null;
  exactKeys(input, ["rate_bps", "taxable", "employment_types"], `segment_rates.${segment}`);
  return {
    rate_bps: safeInteger(input.rate_bps, `segment_rates.${segment}.rate_bps`, { minimum: 0 }),
    taxable: boolean(input.taxable, `segment_rates.${segment}.taxable`),
    employment_types: stringSet(input.employment_types, EMPLOYMENT_TYPES, `segment_rates.${segment}.employment_types`),
  };
}

function normalizeRules(ruleVersion) {
  if (!ruleVersion || typeof ruleVersion !== "object") throw new TypeError("published payroll earning rule version is required");
  if (ruleVersion.approval_state !== "published") throw new TypeError("payroll earning rules must be published");
  if (ruleVersion.rule_kind !== "payroll_earnings") throw new TypeError("payroll earning rule_kind is invalid");
  const sourceDocumentHash = requiredString(ruleVersion.source_document_hash, "source_document_hash");
  if (!HASH.test(sourceDocumentHash)) throw new TypeError("source_document_hash is invalid");
  let source = ruleVersion.rules ?? ruleVersion.rules_json;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      throw new TypeError("payroll earning rules_json is invalid");
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new TypeError("payroll earning rules are required");
  exactKeys(source, ["schema_version", "fixture_only", "currency", "rounding_mode", "monthly", "segment_rates", "allowances", "unused_leave"], "rules");
  if (source.schema_version !== HRX_PAYROLL_EARNING_RULES_SCHEMA_VERSION) throw new TypeError("payroll earning rules schema_version is unsupported");
  if (source.currency !== "KRW") throw new TypeError("payroll earning rules currency must be KRW");
  const allowances = (source.allowances ?? []).map(normalizeAllowance);
  if (new Set(allowances.map((item) => item.code)).size !== allowances.length) throw new TypeError("allowance codes must be unique");
  exactKeys(source.monthly, ["proration_basis", "rate_divisor_minutes", "unpaid_leave"], "monthly");
  if (source.monthly?.unpaid_leave != null) exactKeys(source.monthly.unpaid_leave, ["rate_bps", "taxable"], "monthly.unpaid_leave");
  exactKeys(source.segment_rates ?? {}, Object.keys(SEGMENTS), "segment_rates");
  const monthly = {
    proration_basis: enumValue(source.monthly?.proration_basis, ["calendar_days"], "monthly.proration_basis"),
    rate_divisor_minutes: optionalPositiveInteger(source.monthly?.rate_divisor_minutes, "monthly.rate_divisor_minutes"),
    unpaid_leave: source.monthly?.unpaid_leave == null ? null : {
      rate_bps: safeInteger(source.monthly.unpaid_leave.rate_bps, "monthly.unpaid_leave.rate_bps", { minimum: 0 }),
      taxable: boolean(source.monthly.unpaid_leave.taxable, "monthly.unpaid_leave.taxable"),
    },
  };
  if (source.unused_leave != null) exactKeys(source.unused_leave, ["rate_bps", "taxable", "eligibility", "max_minutes", "employment_types", "pay_groups"], "unused_leave");
  const unusedLeave = source.unused_leave == null ? null : {
    rate_bps: safeInteger(source.unused_leave.rate_bps, "unused_leave.rate_bps", { minimum: 0 }),
    taxable: boolean(source.unused_leave.taxable, "unused_leave.taxable"),
    eligibility: enumValue(source.unused_leave.eligibility, ["always", "ends_in_period", "terminated"], "unused_leave.eligibility"),
    max_minutes: optionalPositiveInteger(source.unused_leave.max_minutes, "unused_leave.max_minutes"),
    employment_types: stringSet(source.unused_leave.employment_types, EMPLOYMENT_TYPES, "unused_leave.employment_types"),
    pay_groups: stringSet(source.unused_leave.pay_groups, null, "unused_leave.pay_groups"),
  };
  return deepFreeze({
    rule_version_id: requiredString(ruleVersion.rule_version_id, "rule_version_id"),
    version_code: requiredString(ruleVersion.version_code, "version_code"),
    source_document_hash: sourceDocumentHash,
    schema_version: source.schema_version,
    currency: "KRW",
    rounding_mode: enumValue(source.rounding_mode, ["truncate", "floor", "ceil", "nearest"], "rounding_mode"),
    monthly,
    segment_rates: Object.fromEntries(Object.keys(SEGMENTS).map((segment) => [segment, normalizeSegment(source.segment_rates?.[segment], segment)])),
    allowances,
    unused_leave: unusedLeave,
    fixture_only: source.fixture_only === true,
  });
}

export function createPayrollEarningRules(ruleVersion) {
  return normalizeRules(ruleVersion);
}

function taxBuckets(amountKrw, taxable, nonTaxableLimitKrw = null) {
  if (taxable) return { taxable_krw: amountKrw, non_taxable_krw: 0 };
  if (amountKrw <= 0 || nonTaxableLimitKrw === null) return { taxable_krw: 0, non_taxable_krw: amountKrw };
  const nonTaxable = Math.min(amountKrw, nonTaxableLimitKrw);
  return { taxable_krw: amountKrw - nonTaxable, non_taxable_krw: nonTaxable };
}

function applies(rule, profile) {
  return (!rule.employment_types || rule.employment_types.includes(profile.employment_type))
    && (!rule.pay_groups || rule.pay_groups.includes(profile.pay_group_code));
}

function addLine(lines, ruleVersionId, input) {
  const amount = safeInteger(input.amount_krw, `${input.item_code}.amount_krw`);
  const buckets = taxBuckets(amount, input.taxable, input.non_taxable_limit_krw);
  lines.push({
    item_kind: input.item_kind ?? "earning",
    item_code: input.item_code,
    formula_code: input.formula_code,
    rule_version_id: ruleVersionId,
    amount_krw: amount,
    quantity_minutes: input.quantity_minutes ?? null,
    ...buckets,
    metadata: stable(input.metadata ?? {}),
  });
}

function minuteRateAmount(profile, compensation, policy, rules, minutes, basisPoints) {
  if (profile.employment_type === "hourly") return payrollKrwForMinutesAtBasisPoints(compensation.amount_krw, minutes, 60, basisPoints, rules.rounding_mode);
  if (profile.employment_type === "daily") return payrollKrwForMinutesAtBasisPoints(compensation.amount_krw, minutes, policy.standard_day_minutes, basisPoints, rules.rounding_mode);
  if (profile.employment_type === "monthly") {
    if (!rules.monthly.rate_divisor_minutes) return null;
    return payrollKrwForMinutesAtBasisPoints(compensation.amount_krw, minutes, rules.monthly.rate_divisor_minutes, basisPoints, rules.rounding_mode);
  }
  return null;
}

function issue(codeValue, details = {}) {
  return { issue_code: codeValue, severity: "blocker", details: stable(details) };
}

function basePay(resolved, rules) {
  const { input, compensation } = resolved;
  const profile = input.payroll_profile;
  const lifecycle = input.lifecycle;
  const policy = input.policy;
  if (profile.employment_type === "monthly") {
    return {
      amount: proratePayrollKrw(compensation.amount_krw, lifecycle.active_calendar_days, lifecycle.period_calendar_days, rules.rounding_mode),
      quantity: null,
      formula: "BASE_MONTHLY_CALENDAR_DAY_V1",
      metadata: { active_calendar_days: lifecycle.active_calendar_days, period_calendar_days: lifecycle.period_calendar_days },
    };
  }
  if (profile.employment_type === "hourly") {
    const minutes = input.attendance.payable_minutes + input.leave.paid_minutes;
    return { amount: payrollKrwForMinutes(compensation.amount_krw, minutes, 60, rules.rounding_mode), quantity: minutes, formula: "BASE_HOURLY_MINUTE_V1", metadata: { rate_unit: "hour" } };
  }
  if (profile.employment_type === "daily") {
    const minutes = input.attendance.payable_minutes + input.leave.paid_minutes;
    return { amount: payrollKrwForMinutes(compensation.amount_krw, minutes, policy.standard_day_minutes, rules.rounding_mode), quantity: minutes, formula: "BASE_DAILY_MINUTE_V1", metadata: { rate_unit: "day", standard_day_minutes: policy.standard_day_minutes } };
  }
  if (!["contract", "deliverable"].includes(profile.compensation_unit)) throw new TypeError("freelancer compensation_unit is invalid");
  if (!profile.withholding_category) {
    const error = new Error("freelancer withholding_category is required");
    error.safe_error_code = "HRX_PAYROLL_WITHHOLDING_CATEGORY_REQUIRED";
    throw error;
  }
  return {
    amount: safeInteger(compensation.amount_krw * profile.compensation_quantity, "freelancer base amount", { minimum: 0 }),
    quantity: null,
    formula: "BASE_FREELANCER_UNIT_V1",
    metadata: { compensation_unit: profile.compensation_unit, compensation_quantity: profile.compensation_quantity, withholding_category: profile.withholding_category },
  };
}

function eligibleUnusedLeave(rule, input) {
  if (!applies(rule, input.payroll_profile)) return false;
  if (rule.eligibility === "always") return true;
  if (rule.eligibility === "ends_in_period") return input.lifecycle.ends_in_period === true;
  return input.lifecycle.lifecycle_status === "terminated" || input.lifecycle.ends_in_period === true;
}

function adjustmentLine(adjustment, index) {
  const previousRunRef = requiredString(adjustment?.previous_run_ref, `adjustments[${index}].previous_run_ref`);
  const sourceRef = requiredString(adjustment?.adjustment_ref, `adjustments[${index}].adjustment_ref`);
  if (!TOKEN_REF.test(previousRunRef) || !TOKEN_REF.test(sourceRef)) throw new TypeError(`adjustments[${index}] references must be tokenized`);
  const reasonCode = code(adjustment?.reason_code, `adjustments[${index}].reason_code`);
  const amount = safeInteger(adjustment?.amount_krw, `adjustments[${index}].amount_krw`);
  if (amount === 0) throw new TypeError(`adjustments[${index}].amount_krw must not be zero`);
  return {
    item_kind: "adjustment",
    item_code: `ADJUSTMENT_${digest({ previousRunRef, sourceRef, reasonCode }).slice(0, 16).toUpperCase()}`,
    formula_code: "PRIOR_RUN_ADJUSTMENT_V1",
    amount_krw: amount,
    taxable: boolean(adjustment?.taxable, `adjustments[${index}].taxable`),
    metadata: { previous_run_ref: previousRunRef, adjustment_ref: sourceRef, reason_code: reasonCode },
  };
}

export function calculatePayrollEarnings({ resolved_input: source, rule_version: ruleVersion, adjustments = [] } = {}) {
  const resolved = clone(source);
  if (!resolved?.snapshot || !resolved?.input || !resolved?.compensation) throw new TypeError("resolved_input is required");
  const employeeId = requiredString(resolved.snapshot.employee_id, "snapshot.employee_id");
  const sourceHash = requiredString(resolved.snapshot.source_hash, "snapshot.source_hash");
  if (!HASH.test(sourceHash)) throw new TypeError("snapshot.source_hash is invalid");
  const profile = resolved.input.payroll_profile;
  if (!EMPLOYMENT_TYPES.has(profile?.employment_type)) throw new TypeError("payroll_profile.employment_type is invalid");
  if (profile.currency !== "KRW" || resolved.compensation.currency !== "KRW") throw new TypeError("payroll currency must be KRW");
  safeInteger(resolved.compensation.amount_krw, "compensation.amount_krw", { minimum: 0 });
  const rules = normalizeRules(ruleVersion);
  const lines = [];
  const issues = [];
  const base = basePay(resolved, rules);
  addLine(lines, rules.rule_version_id, { item_code: "BASE", formula_code: base.formula, amount_krw: base.amount, quantity_minutes: base.quantity, taxable: true, metadata: base.metadata });

  if (profile.employment_type === "monthly" && resolved.input.leave.unpaid_minutes > 0) {
    if (!rules.monthly.unpaid_leave || !rules.monthly.rate_divisor_minutes) {
      issues.push(issue("PAYROLL_UNPAID_LEAVE_RULE_MISSING", { unpaid_minutes: resolved.input.leave.unpaid_minutes }));
    } else {
      const amount = minuteRateAmount(profile, resolved.compensation, resolved.input.policy, rules, resolved.input.leave.unpaid_minutes, rules.monthly.unpaid_leave.rate_bps);
      addLine(lines, rules.rule_version_id, { item_kind: "adjustment", item_code: "UNPAID_LEAVE", formula_code: "UNPAID_LEAVE_MONTHLY_V1", amount_krw: -amount, quantity_minutes: resolved.input.leave.unpaid_minutes, taxable: rules.monthly.unpaid_leave.taxable, metadata: { rate_bps: rules.monthly.unpaid_leave.rate_bps } });
    }
  }

  for (const [segment, itemCode] of Object.entries(SEGMENTS)) {
    const minutes = safeInteger(resolved.input.overtime?.[`${segment}_minutes`] ?? 0, `${segment}_minutes`, { minimum: 0 });
    if (minutes === 0) continue;
    const segmentRule = rules.segment_rates[segment];
    if (!segmentRule || !applies(segmentRule, profile)) {
      issues.push(issue("PAYROLL_SEGMENT_RULE_MISSING", { segment, minutes }));
      continue;
    }
    const amount = minuteRateAmount(profile, resolved.compensation, resolved.input.policy, rules, minutes, segmentRule.rate_bps);
    if (amount === null) {
      issues.push(issue("PAYROLL_RATE_BASIS_MISSING", { segment, employment_type: profile.employment_type }));
      continue;
    }
    addLine(lines, rules.rule_version_id, { item_code: itemCode, formula_code: "APPROVED_SEGMENT_BPS_V1", amount_krw: amount, quantity_minutes: minutes, taxable: segmentRule.taxable, metadata: { segment, additive_rate_bps: segmentRule.rate_bps } });
  }

  for (const allowance of rules.allowances) {
    if (!applies(allowance, profile)) continue;
    const amount = allowance.amount_kind === "fixed" ? allowance.amount_krw : applyPayrollBasisPoints(base.amount, allowance.rate_bps, rules.rounding_mode);
    addLine(lines, rules.rule_version_id, { item_code: `ALLOWANCE_${allowance.code}`, formula_code: allowance.amount_kind === "fixed" ? "ALLOWANCE_FIXED_V1" : "ALLOWANCE_BASE_RATE_BPS_V1", amount_krw: amount, taxable: allowance.taxable, non_taxable_limit_krw: allowance.non_taxable_limit_krw, metadata: { allowance_code: allowance.code, amount_kind: allowance.amount_kind, rate_bps: allowance.rate_bps } });
  }

  const unusedMinutes = safeInteger(resolved.input.leave.unused_balance_minutes ?? 0, "unused_balance_minutes", { minimum: 0 });
  if (unusedMinutes > 0) {
    if (!rules.unused_leave) {
      issues.push(issue("PAYROLL_UNUSED_LEAVE_RULE_MISSING", { unused_minutes: unusedMinutes }));
    } else if (eligibleUnusedLeave(rules.unused_leave, resolved.input)) {
      const payableMinutes = rules.unused_leave.max_minutes === null ? unusedMinutes : Math.min(unusedMinutes, rules.unused_leave.max_minutes);
      const amount = minuteRateAmount(profile, resolved.compensation, resolved.input.policy, rules, payableMinutes, rules.unused_leave.rate_bps);
      if (amount === null) issues.push(issue("PAYROLL_RATE_BASIS_MISSING", { item: "unused_leave", employment_type: profile.employment_type }));
      else addLine(lines, rules.rule_version_id, { item_code: "UNUSED_LEAVE", formula_code: "UNUSED_LEAVE_MINUTE_V1", amount_krw: amount, quantity_minutes: payableMinutes, taxable: rules.unused_leave.taxable, metadata: { eligibility: rules.unused_leave.eligibility, rate_bps: rules.unused_leave.rate_bps } });
    }
  }

  if (!Array.isArray(adjustments)) throw new TypeError("adjustments must be an array");
  const normalizedAdjustments = adjustments.map(adjustmentLine).sort((left, right) => left.item_code.localeCompare(right.item_code));
  for (const adjustment of normalizedAdjustments) addLine(lines, rules.rule_version_id, adjustment);
  lines.sort((left, right) => left.item_code.localeCompare(right.item_code));
  if (new Set(lines.map((line) => line.item_code)).size !== lines.length) throw new TypeError("payroll line item codes must be unique");
  const gross = lines.reduce((sum, line) => safeInteger(sum + line.amount_krw, "gross_krw"), 0);
  const taxable = lines.reduce((sum, line) => safeInteger(sum + line.taxable_krw, "taxable_gross_krw"), 0);
  const nonTaxable = lines.reduce((sum, line) => safeInteger(sum + line.non_taxable_krw, "non_taxable_gross_krw"), 0);
  if (gross < 0) issues.push(issue("PAYROLL_GROSS_NEGATIVE", { gross_krw: gross }));
  const result = {
    schema_version: 1,
    employee_id: employeeId,
    input_snapshot_id: requiredString(resolved.snapshot.snapshot_id, "snapshot.snapshot_id"),
    input_source_hash: sourceHash,
    rule_version_id: rules.rule_version_id,
    gross_krw: gross,
    taxable_gross_krw: taxable,
    non_taxable_gross_krw: nonTaxable,
    issue_count: issues.length,
    issues: issues.sort((left, right) => `${left.issue_code}:${JSON.stringify(left.details)}`.localeCompare(`${right.issue_code}:${JSON.stringify(right.details)}`)),
    line_items: lines,
  };
  result.result_hash = digest(result);
  return deepFreeze(result);
}
