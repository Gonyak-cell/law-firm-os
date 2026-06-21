export function resolveTenantMembership(session = {}, tenant_id) {
  if (typeof tenant_id !== "string" || tenant_id.trim() === "") {
    return Object.freeze({ ok: false, reason: "trusted_tenant_missing" });
  }
  const membership = (session.tenant_memberships ?? []).find((entry) => entry.tenant_id === tenant_id && entry.status !== "disabled");
  if (!membership) return Object.freeze({ ok: false, reason: "tenant_membership_missing", tenant_id });
  return Object.freeze({ ok: true, tenant_id, membership });
}

export function resolveRolesAndGroups(membership = {}) {
  return Object.freeze({
    role_ids: Object.freeze([...(membership.role_ids ?? [])]),
    group_ids: Object.freeze([...(membership.group_ids ?? [])]),
    scopes: Object.freeze([...(membership.scopes ?? [])])
  });
}
