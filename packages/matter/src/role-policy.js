export const MATTER_ROLE_PERMISSIONS = Object.freeze({
  responsible_attorney: Object.freeze(["matter:read", "matter:write", "matter:team:write", "matter:close"]),
  supervising_partner: Object.freeze(["matter:read", "matter:write", "matter:team:review", "matter:close"]),
  associate: Object.freeze(["matter:read", "matter:write"]),
  paralegal: Object.freeze(["matter:read", "matter:task:write"]),
  billing_reviewer: Object.freeze(["matter:read", "matter:billing:review"]),
  knowledge_manager: Object.freeze(["matter:read", "matter:knowledge:write"]),
});

export function permissionsForMatterRole(role) {
  return MATTER_ROLE_PERMISSIONS[role] ?? Object.freeze([]);
}

export function evaluateMatterRolePermission({ role, action } = {}) {
  const permissions = permissionsForMatterRole(role);
  const allowed = permissions.includes(action) || permissions.includes("matter:write");
  return Object.freeze({
    outcome: allowed ? "allow" : "deny",
    role,
    action,
    permissions,
  });
}
