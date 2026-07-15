import { createHash } from "node:crypto";
import { applyPayrollBasisPoints } from "./money.js";
import { createPayrollStatutoryRulePackage } from "./statutory-rule-service.js";

const TOKEN_REF = /^[A-Za-z][A-Za-z0-9_-]*:[^\s]+$/;
const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const NOTICE_CODES = new Set(["INCOME_TAX", "LOCAL_INCOME_TAX", "PENSION", "HEALTH_INSURANCE", "LONG_TERM_CARE", "EMPLOYMENT_INSURANCE"]);

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

function integer(value, field, { minimum = Number.MIN_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new TypeError(`${field} must be a safe integer`);
  return value;
}

function boolean(value, field) {
  if (typeof value !== "boolean") throw new TypeError(`${field} must be boolean`);
  return value;
}

function token(value, field) {
  const result = requiredString(value, field);
  if (!TOKEN_REF.test(result)) throw new TypeError(`${field} must be tokenized`);
  return result;
}

function code(value, field) {
  const result = requiredString(value, field);
  if (!CODE.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function line(itemCode, formulaCode, amountKrw, ruleVersionId, metadata = {}) {
  return {
    item_kind: "deduction",
    item_code: itemCode,
    formula_code: formulaCode,
    rule_version_id: ruleVersionId,
    amount_krw: integer(amountKrw, `${itemCode}.amount_krw`, { minimum: 0 }),
    quantity_minutes: null,
    metadata: stable(metadata),
  };
}

function ruleFromVersion(ruleVersion) {
  if (!ruleVersion || ruleVersion.approval_state !== "published" || ruleVersion.rule_kind !== "payroll_statutory") throw new TypeError("published payroll statutory rule version is required");
  const source = typeof ruleVersion.rules_json === "string" ? JSON.parse(ruleVersion.rules_json) : ruleVersion.rules;
  const rules = createPayrollStatutoryRulePackage(source, { production: false });
  if (rules.source_document_hash !== ruleVersion.source_document_hash) throw new TypeError("payroll statutory source hash mismatch");
  return rules;
}

function incomeTax(rules, input, taxableGross) {
  if (input.income_tax_exempt === true) return 0;
  if (input.withholding_category) {
    const category = rules.income_tax.withholding_categories.find((row) => row.code === input.withholding_category);
    if (!category) throw new TypeError("withholding_category has no published rule");
    return applyPayrollBasisPoints(taxableGross, category.rate_bps, rules.rounding_mode);
  }
  const dependentCount = integer(input.dependent_count, "deduction_input.dependent_count", { minimum: 0 });
  const available = [...new Set(rules.income_tax.brackets.map((row) => row.dependent_count))].sort((a, b) => a - b);
  const selectedCount = available.includes(dependentCount) ? dependentCount : available.filter((value) => value <= dependentCount).at(-1) ?? available[0];
  const bracket = rules.income_tax.brackets.find((row) => row.dependent_count === selectedCount && row.minimum_taxable_krw <= taxableGross && (row.maximum_taxable_krw === null || row.maximum_taxable_krw >= taxableGross));
  if (!bracket) throw new TypeError("published income tax table does not cover taxable gross");
  return bracket.tax_krw;
}

function contribution(lines, rules, input, taxableGross, config) {
  if (!boolean(input[config.input_key]?.enrolled, `deduction_input.${config.input_key}.enrolled`)) return;
  const rule = rules[config.rule_key];
  const requestedBase = input[config.input_key].contribution_base_krw ?? taxableGross;
  integer(requestedBase, `deduction_input.${config.input_key}.contribution_base_krw`, { minimum: 0 });
  const base = clamp(requestedBase, rule.minimum_base_krw, rule.maximum_base_krw);
  lines.push(line(config.item_code, config.formula_code, applyPayrollBasisPoints(base, rule.employee_rate_bps, rules.rounding_mode), input.rule_version_id, { contribution_base_krw: base, employee_rate_bps: rule.employee_rate_bps }));
}

function normalizeCustom(input, index) {
  const field = `custom_deductions[${index}]`;
  const scheduleRef = token(input?.schedule_ref, `${field}.schedule_ref`);
  const itemCode = code(input?.code, `${field}.code`);
  const kind = requiredString(input?.amount_kind, `${field}.amount_kind`);
  if (!['fixed', 'rate', 'installment'].includes(kind)) throw new TypeError(`${field}.amount_kind is invalid`);
  const result = { schedule_ref: scheduleRef, code: itemCode, amount_kind: kind };
  if (kind === "fixed") result.amount_krw = integer(input.amount_krw, `${field}.amount_krw`, { minimum: 0 });
  if (kind === "rate") {
    result.rate_bps = integer(input.rate_bps, `${field}.rate_bps`, { minimum: 0 });
    if (result.rate_bps > 10_000) throw new TypeError(`${field}.rate_bps is invalid`);
    result.rate_base = ['gross', 'taxable_gross'].includes(input.rate_base) ? input.rate_base : (() => { throw new TypeError(`${field}.rate_base is invalid`); })();
  }
  if (kind === "installment") {
    result.installment_amount_krw = integer(input.installment_amount_krw, `${field}.installment_amount_krw`, { minimum: 1 });
    result.installment_count = integer(input.installment_count, `${field}.installment_count`, { minimum: 1 });
    result.installments_applied = integer(input.installments_applied, `${field}.installments_applied`, { minimum: 0 });
    result.remaining_amount_krw = integer(input.remaining_amount_krw, `${field}.remaining_amount_krw`, { minimum: 0 });
    if (result.installments_applied > result.installment_count) throw new TypeError(`${field}.installments_applied is invalid`);
  }
  return result;
}

function customAmount(schedule, earnings) {
  if (schedule.amount_kind === "fixed") return schedule.amount_krw;
  if (schedule.amount_kind === "rate") return applyPayrollBasisPoints(schedule.rate_base === "gross" ? earnings.gross_krw : earnings.taxable_gross_krw, schedule.rate_bps, earnings.rounding_mode);
  if (schedule.installments_applied >= schedule.installment_count || schedule.remaining_amount_krw === 0) return 0;
  return Math.min(schedule.installment_amount_krw, schedule.remaining_amount_krw);
}

function reconcileNotices(lines, notices, issues) {
  if (!Array.isArray(notices)) throw new TypeError("notice_assessments must be an array");
  const byCode = new Map(lines.map((item) => [item.item_code, item.amount_krw]));
  const seen = new Set();
  return notices.map((notice, index) => {
    const noticeKind = code(notice?.notice_kind, `notice_assessments[${index}].notice_kind`);
    if (!NOTICE_CODES.has(noticeKind) || seen.has(noticeKind)) throw new TypeError("notice assessment kind is invalid or duplicated");
    seen.add(noticeKind);
    const calculated = byCode.get(noticeKind) ?? 0;
    const assessed = integer(notice?.notice_amount_krw, `notice_assessments[${index}].notice_amount_krw`, { minimum: 0 });
    const variance = assessed - calculated;
    let state = "matched";
    let reasonCode = null;
    let approvalRef = null;
    if (variance !== 0) {
      if (notice.variance_reason_code && notice.approval_ref) {
        reasonCode = code(notice.variance_reason_code, `notice_assessments[${index}].variance_reason_code`);
        approvalRef = token(notice.approval_ref, `notice_assessments[${index}].approval_ref`);
        state = "explained";
      } else {
        state = "unexplained";
        issues.push({ issue_code: "PAYROLL_NOTICE_VARIANCE_UNEXPLAINED", severity: "blocker", details: { notice_kind: noticeKind, variance_krw: variance } });
      }
    }
    return { notice_kind: noticeKind, calculated_amount_krw: calculated, notice_amount_krw: assessed, variance_krw: variance, state, variance_reason_code: reasonCode, approval_ref: approvalRef };
  }).sort((left, right) => left.notice_kind.localeCompare(right.notice_kind));
}

export function calculatePayrollDeductions({ earnings_result: sourceEarnings, deduction_input: sourceInput, statutory_rule_version: ruleVersion, custom_deductions: sourceCustom = [], notice_assessments: notices = [] } = {}) {
  const earnings = clone(sourceEarnings);
  const input = clone(sourceInput);
  if (!earnings || !input) throw new TypeError("earnings_result and deduction_input are required");
  const gross = integer(earnings.gross_krw, "earnings_result.gross_krw");
  const taxableGross = integer(earnings.taxable_gross_krw, "earnings_result.taxable_gross_krw");
  const rules = ruleFromVersion(ruleVersion);
  const ruleVersionId = requiredString(ruleVersion.rule_version_id, "rule_version_id");
  const lines = [];
  const issues = [];
  const income = incomeTax(rules, input, taxableGross);
  if (income > 0) lines.push(line("INCOME_TAX", "INCOME_TAX_TABLE_V1", income, ruleVersionId, { dependent_count: input.dependent_count ?? null, withholding_category: input.withholding_category ?? null }));
  if (income > 0 && rules.income_tax.local_income_tax_rate_bps > 0) lines.push(line("LOCAL_INCOME_TAX", "LOCAL_INCOME_TAX_BPS_V1", applyPayrollBasisPoints(income, rules.income_tax.local_income_tax_rate_bps, rules.rounding_mode), ruleVersionId, { rate_bps: rules.income_tax.local_income_tax_rate_bps }));
  contribution(lines, rules, { ...input, rule_version_id: ruleVersionId }, taxableGross, { input_key: "pension", rule_key: "pension", item_code: "PENSION", formula_code: "PENSION_CAPPED_BASE_V1" });
  contribution(lines, rules, { ...input, rule_version_id: ruleVersionId }, taxableGross, { input_key: "health", rule_key: "health", item_code: "HEALTH_INSURANCE", formula_code: "HEALTH_CAPPED_BASE_V1" });
  const health = lines.find((item) => item.item_code === "HEALTH_INSURANCE");
  if (health && rules.long_term_care.rate_bps_of_health > 0) lines.push(line("LONG_TERM_CARE", "LONG_TERM_CARE_HEALTH_BPS_V1", applyPayrollBasisPoints(health.amount_krw, rules.long_term_care.rate_bps_of_health, rules.rounding_mode), ruleVersionId, { rate_bps_of_health: rules.long_term_care.rate_bps_of_health }));
  if (boolean(input.employment_insurance?.enrolled, "deduction_input.employment_insurance.enrolled")) {
    const base = input.employment_insurance.contribution_base_krw ?? taxableGross;
    integer(base, "deduction_input.employment_insurance.contribution_base_krw", { minimum: 0 });
    lines.push(line("EMPLOYMENT_INSURANCE", "EMPLOYMENT_INSURANCE_BPS_V1", applyPayrollBasisPoints(base, rules.employment_insurance.employee_rate_bps, rules.rounding_mode), ruleVersionId, { contribution_base_krw: base, employee_rate_bps: rules.employment_insurance.employee_rate_bps }));
  }
  if (!Array.isArray(sourceCustom)) throw new TypeError("custom_deductions must be an array");
  const schedules = sourceCustom.map(normalizeCustom).sort((left, right) => left.code.localeCompare(right.code));
  if (new Set(schedules.map((row) => row.code)).size !== schedules.length) throw new TypeError("custom deduction codes must be unique");
  const statutoryTotal = lines.reduce((sum, item) => integer(sum + item.amount_krw, "statutory deduction total", { minimum: 0 }), 0);
  let customTotal = 0;
  for (const schedule of schedules) {
    const proposed = customAmount(schedule, { ...earnings, rounding_mode: rules.rounding_mode });
    const available = Math.max(0, gross - statutoryTotal - customTotal - rules.custom_deduction_net_floor_krw);
    const amount = Math.min(proposed, available);
    if (amount < proposed) issues.push({ issue_code: "PAYROLL_CUSTOM_DEDUCTION_LIMITED", severity: "warning", details: { code: schedule.code, proposed_krw: proposed, applied_krw: amount } });
    if (amount > 0) {
      lines.push(line(`CUSTOM_${schedule.code}`, `CUSTOM_${schedule.amount_kind.toUpperCase()}_V1`, amount, ruleVersionId, { schedule_ref: schedule.schedule_ref, amount_kind: schedule.amount_kind }));
      customTotal = integer(customTotal + amount, "custom deduction total", { minimum: 0 });
    }
  }
  lines.sort((left, right) => left.item_code.localeCompare(right.item_code));
  const deductionTotal = lines.reduce((sum, item) => integer(sum + item.amount_krw, "deduction_krw", { minimum: 0 }), 0);
  const net = integer(gross - deductionTotal, "net_krw");
  if (net < 0) issues.push({ issue_code: "PAYROLL_NET_NEGATIVE", severity: "blocker", details: { net_krw: net } });
  const reconciliations = reconcileNotices(lines, notices, issues);
  const result = {
    schema_version: 1,
    employee_id: requiredString(earnings.employee_id, "earnings_result.employee_id"),
    earnings_result_hash: requiredString(earnings.result_hash, "earnings_result.result_hash"),
    rule_version_id: ruleVersionId,
    gross_krw: gross,
    deduction_krw: deductionTotal,
    net_krw: net,
    issue_count: issues.length,
    issues: issues.sort((left, right) => `${left.issue_code}:${JSON.stringify(left.details)}`.localeCompare(`${right.issue_code}:${JSON.stringify(right.details)}`)),
    line_items: lines,
    notice_reconciliations: reconciliations,
  };
  result.result_hash = digest(result);
  return deepFreeze(result);
}
