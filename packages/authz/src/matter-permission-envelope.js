export function createMatterPermissionEnvelope({ tenant_id, matter_id, actor_id, permission_decision_id } = {}) {
  if (!tenant_id || !matter_id || !actor_id || !permission_decision_id) {
    throw new TypeError('tenant_id, matter_id, actor_id, and permission_decision_id are required');
  }
  return Object.freeze({
    tenant_id,
    matter_id,
    actor_id,
    permission_decision_id,
    inherited_by_vault: true,
    permission_before_access: true,
  });
}
