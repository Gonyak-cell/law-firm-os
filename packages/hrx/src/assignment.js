function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createHrxAssignment(input = {}) {
  const capacityPct = Number(input.capacity_pct);
  if (!Number.isFinite(capacityPct) || capacityPct < 0 || capacityPct > 100) {
    throw new TypeError("capacity_pct must be between 0 and 100");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    assignment_id: requiredString(input, "assignment_id"),
    employee_id: requiredString(input, "employee_id"),
    role_id: requiredString(input, "role_id"),
    position_id: requiredString(input, "position_id"),
    practice_group_id: requiredString(input, "practice_group_id"),
    capacity_pct: capacityPct,
    effective_from: requiredString(input, "effective_from"),
    effective_to: input.effective_to ?? null,
  });
}
