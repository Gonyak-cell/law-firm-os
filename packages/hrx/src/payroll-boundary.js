const BLOCKED_PAYROLL_FIELDS = Object.freeze(["net_pay", "gross_pay", "tax_withholding", "disbursement_instruction"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createPayrollExportPreview(input = {}) {
  for (const field of BLOCKED_PAYROLL_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Payroll export preview must not include ${field}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    preview_id: requiredString(input, "preview_id"),
    payroll_period: requiredString(input, "payroll_period"),
    employee_ids: Object.freeze([...(input.employee_ids ?? [])]),
    external_provider: input.external_provider ?? null,
    human_review_required: true,
    calculation_runtime: false,
    disbursement_instruction_included: false,
  });
}
