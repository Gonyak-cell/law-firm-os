function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createHrxRetentionPolicy(input = {}) {
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    policy_id: requiredString(input, "policy_id"),
    object_type: requiredString(input, "object_type"),
    retain_until: requiredString(input, "retain_until"),
  });
}

export function canPurgeHrxRecord({ policy, legal_holds = [], as_of } = {}) {
  const asOf = requiredString({ as_of }, "as_of");
  const activeHold = legal_holds.find(
    (hold) => hold.active !== false && hold.tenant_id === policy.tenant_id && hold.object_type === policy.object_type,
  );
  if (activeHold) {
    return Object.freeze({ allowed: false, reason: "legal_hold_active", hold_id: activeHold.hold_id });
  }
  if (asOf < policy.retain_until) {
    return Object.freeze({ allowed: false, reason: "retention_not_due" });
  }
  return Object.freeze({ allowed: true, reason: "retention_due_no_legal_hold" });
}
