const RAW_AMOUNT_FIELDS = Object.freeze(["amount", "salary", "base_pay", "bonus_amount", "equity_value"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createCompensationRecordMetadata(input = {}) {
  for (const field of RAW_AMOUNT_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Compensation metadata must not include raw ${field}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    compensation_id: requiredString(input, "compensation_id"),
    employee_id: requiredString(input, "employee_id"),
    encrypted_amount_ref: requiredString(input, "encrypted_amount_ref"),
    currency_ref: input.currency_ref ?? null,
    effective_from: requiredString(input, "effective_from"),
    source_ref: requiredString(input, "source_ref"),
    raw_amount_included: false,
  });
}
