export function confirmCriticalDeadlineChange({ tenant_id, matter_id, event_id, requester_user_id, confirmer_user_id, audit_ref } = {}) {
  for (const [field, value] of Object.entries({ tenant_id, matter_id, event_id, requester_user_id, confirmer_user_id, audit_ref })) {
    if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  }
  if (requester_user_id === confirmer_user_id) {
    throw new Error("Critical deadline confirmation requires a different confirmer");
  }
  return Object.freeze({
    tenant_id,
    matter_id,
    event_id,
    requester_user_id,
    confirmer_user_id,
    audit_ref,
    outcome: "confirmed",
    dual_control_satisfied: true,
  });
}
