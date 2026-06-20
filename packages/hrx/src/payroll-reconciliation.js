const BLOCKED_PROVIDER_RESULT_FIELDS = Object.freeze([
  "net_pay",
  "gross_pay",
  "tax_withholding",
  "disbursement_instruction",
  "raw_provider_payload",
  "provider_payload",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalNonNegativeInteger(input, field) {
  const value = input?.[field] ?? 0;
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return value;
}

function assertMetadataOnly(input = {}) {
  for (const field of BLOCKED_PROVIDER_RESULT_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Payroll reconciliation must not include ${field}`);
  }
  for (const [key, value] of Object.entries(input.provider_result_metadata ?? {})) {
    if (BLOCKED_PROVIDER_RESULT_FIELDS.includes(key) || typeof value === "object") {
      throw new TypeError(`Payroll reconciliation provider_result_metadata must not include sensitive field: ${key}`);
    }
  }
}

export function createPayrollReconciliationSummary(input = {}) {
  assertMetadataOnly(input);
  const mismatchCount = optionalNonNegativeInteger(input, "mismatch_count");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    reconciliation_id: requiredString(input, "reconciliation_id"),
    preview_id: requiredString(input, "preview_id"),
    provider_result_ref: requiredString(input, "provider_result_ref"),
    provider_result_metadata: Object.freeze({ ...(input.provider_result_metadata ?? {}) }),
    mismatch_count: mismatchCount,
    reviewed_by: input.reviewed_by ?? null,
    human_review_required: mismatchCount > 0 || input.human_review_required !== false,
    raw_provider_payload_included: false,
    disbursement_instruction_included: false,
  });
}
