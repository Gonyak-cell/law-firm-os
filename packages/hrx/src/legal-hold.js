function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createHrxLegalHold(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    hold_id: requiredString(input, "hold_id"),
    object_type: requiredString(input, "object_type"),
    object_id: requiredString(input, "object_id"),
    reason: requiredString(input, "reason"),
    active: input.active !== false,
  });
}
