import { createHash } from "node:crypto";
import { createPayrollEarningRules, HRX_PAYROLL_EARNING_RULES_SCHEMA_VERSION } from "./calculation-engine.js";

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

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function isoDate(input, field, optional = false) {
  const value = input?.[field];
  if (optional && (value === undefined || value === null || value === "")) return null;
  const result = requiredString(input, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) throw new TypeError(`${field} must be an ISO date`);
  return result;
}

function guardedError(message, code, status = 409) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

export function createPayrollAllowanceRulePackage(input = {}, { production = false } = {}) {
  const versionCode = requiredString(input, "version_code");
  const effectiveFrom = isoDate(input, "effective_from");
  const effectiveTo = isoDate(input, "effective_to", true);
  if (effectiveTo && effectiveTo < effectiveFrom) throw new TypeError("effective_to must not precede effective_from");
  const sourceDocumentHash = requiredString(input, "source_document_hash");
  if (!HASH.test(sourceDocumentHash)) throw new TypeError("source_document_hash must be a SHA-256 digest");
  const rules = clone(input.rules);
  const validated = createPayrollEarningRules({
    rule_version_id: "validation-only",
    rule_kind: "payroll_earnings",
    version_code: versionCode,
    source_document_hash: sourceDocumentHash,
    approval_state: "published",
    rules,
  });
  if (production && validated.fixture_only) throw new TypeError("fixture-only allowance rules cannot be used in production");
  const normalizedRules = {
    schema_version: HRX_PAYROLL_EARNING_RULES_SCHEMA_VERSION,
    fixture_only: validated.fixture_only,
    currency: "KRW",
    rounding_mode: validated.rounding_mode,
    monthly: validated.monthly,
    segment_rates: validated.segment_rates,
    allowances: validated.allowances,
    unused_leave: validated.unused_leave,
  };
  return Object.freeze({
    version_code: versionCode,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    source_document_hash: sourceDocumentHash.replace(/^sha256:/i, "").toLowerCase(),
    rules: Object.freeze(normalizedRules),
    rules_hash: digest(normalizedRules),
  });
}

export function createPayrollAllowanceRuleService({
  payrollRepository,
  production = false,
  publishEnabled = false,
} = {}) {
  if (!payrollRepository || typeof payrollRepository.createRuleVersion !== "function") throw new TypeError("payrollRepository is required");

  function createDraft(context, input = {}) {
    const packageValue = createPayrollAllowanceRulePackage(input, { production });
    return payrollRepository.createRuleVersion(context, {
      rule_version_id: input.rule_version_id,
      rule_kind: "payroll_earnings",
      version_code: packageValue.version_code,
      effective_from: packageValue.effective_from,
      effective_to: packageValue.effective_to,
      source_document_hash: packageValue.source_document_hash,
      rules: packageValue.rules,
    });
  }

  function list(context) {
    return payrollRepository.listRuleVersions(context, { rule_kind: "payroll_earnings" }).map((row) => Object.freeze({
      ...clone(row),
      rules: clone(JSON.parse(row.rules_json)),
    }));
  }

  function review(context, input = {}) {
    const rule = list(context).find((row) => row.rule_version_id === input.rule_version_id);
    if (!rule) throw guardedError("Allowance rule not found", "HRX_PAYROLL_RULE_NOT_FOUND", 404);
    createPayrollAllowanceRulePackage({
      version_code: rule.version_code,
      effective_from: rule.effective_from,
      effective_to: rule.effective_to,
      source_document_hash: rule.source_document_hash,
      rules: rule.rules,
    }, { production });
    return payrollRepository.reviewRuleVersion(context, input);
  }

  function publish(context, input = {}) {
    if (!publishEnabled) throw guardedError("Allowance rule publication is disabled", "HRX_PAYROLL_RULE_PUBLISH_DISABLED", 403);
    const rule = list(context).find((row) => row.rule_version_id === input.rule_version_id);
    if (!rule) throw guardedError("Allowance rule not found", "HRX_PAYROLL_RULE_NOT_FOUND", 404);
    createPayrollAllowanceRulePackage({
      version_code: rule.version_code,
      effective_from: rule.effective_from,
      effective_to: rule.effective_to,
      source_document_hash: rule.source_document_hash,
      rules: rule.rules,
    }, { production });
    return payrollRepository.publishRuleVersion(context, input);
  }

  return Object.freeze({ createDraft, list, review, publish });
}
