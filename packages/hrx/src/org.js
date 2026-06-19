function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function isoDate(input, field) {
  const value = requiredString(input, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${field} must be an ISO date`);
  return value;
}

export function createHrxOrgUnit(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    org_unit_id: requiredString(input, "org_unit_id"),
    display_name: requiredString(input, "display_name"),
    parent_org_unit_id: input.parent_org_unit_id ?? null,
    effective_from: isoDate(input, "effective_from"),
    effective_to: input.effective_to ?? null,
  });
}

export function createHrxOrgHistoryEntry(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    org_unit_id: requiredString(input, "org_unit_id"),
    change_type: requiredString(input, "change_type"),
    effective_from: isoDate(input, "effective_from"),
    previous_parent_org_unit_id: input.previous_parent_org_unit_id ?? null,
    next_parent_org_unit_id: input.next_parent_org_unit_id ?? null,
  });
}
