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

export function canMutateHrxObjectUnderLegalHold({ tenant_id, object_type, object_id, mutation, legal_holds = [] } = {}) {
  const protectedMutation = ["purge", "delete"].includes(requiredString({ mutation }, "mutation"));
  if (!protectedMutation) return Object.freeze({ allowed: true, reason: "mutation_not_legal_hold_protected" });
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const objectType = requiredString({ object_type }, "object_type");
  const objectId = requiredString({ object_id }, "object_id");
  const activeHold = legal_holds.find(
    (hold) =>
      hold.active !== false &&
      hold.tenant_id === tenantId &&
      hold.object_type === objectType &&
      hold.object_id === objectId,
  );
  if (activeHold) {
    return Object.freeze({
      allowed: false,
      reason: "legal_hold_active",
      hold_id: activeHold.hold_id,
      mutation,
    });
  }
  return Object.freeze({ allowed: true, reason: "no_matching_legal_hold" });
}
