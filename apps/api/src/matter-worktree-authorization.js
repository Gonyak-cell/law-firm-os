import { evaluateRouteDecision } from "./permission-gate.js";

export const WORKTREE_READ_ROLES = Object.freeze(["responsible_attorney", "supervising_partner", "associate", "paralegal", "billing_reviewer", "knowledge_manager"]);
export const WORKTREE_EDIT_ROLES = Object.freeze(["responsible_attorney", "supervising_partner", "associate"]);
export const WORKTREE_TASK_ROLES = Object.freeze(["responsible_attorney", "supervising_partner", "associate", "paralegal"]);

export function authorizeMatterWorktreeAccess({ repository, context, tenantId, matterId, actorId, roles, action, resourceType, resourceId }) {
  const principal = context?.principal;
  if (!principal || principal.tenant_id !== tenantId || (actorId && actorId !== principal.user_id)) return Object.freeze({ allowed: false });
  const decision = evaluateRouteDecision({
    context,
    action,
    resource: { tenant_id: tenantId, resource_type: resourceType, resource_id: resourceId, matter_id: matterId },
  });
  const matter = repository.get({ tenant_id: tenantId, model_type: "Matter", id: matterId });
  const allowedRoles = new Set(roles);
  const member = repository
    .list({ tenant_id: tenantId, model_type: "MatterMember", matter_id: matterId })
    .find(({ user_id, status, role, permission_envelope_id }) =>
      user_id === principal.user_id
      && status === "active"
      && allowedRoles.has(role)
      && permission_envelope_id === matter?.permission_envelope_id,
    );
  return Object.freeze({ allowed: decision.effect === "allow" && Boolean(matter?.permission_envelope_id) && Boolean(member), matter, member });
}
