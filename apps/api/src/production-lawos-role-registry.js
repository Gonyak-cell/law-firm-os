import { MATTER_VAULT_REGISTERED_TENANT_ID } from "./matter-vault-account-registry.js";

export const LAWOS_ROLE_REGISTRY_SOURCE = "postgres-v2-account-membership";

export const LAWOS_FINANCE_SCOPES = Object.freeze([
  "analytics.finance.read",
  "finance.bank.read",
  "finance.bank.import",
  "finance.bank.classify",
  "finance.time.write",
  "finance.expense.write",
  "finance.billing.write",
  "finance.approve",
  "finance.payment.write",
  "finance.export",
  "finance.audit.read",
]);

function frozenUnique(values = []) {
  return Object.freeze([...new Set(values.filter(Boolean))]);
}

function membershipFor(user, tenantId) {
  return (user?.tenant_memberships ?? []).find(
    (entry) => entry?.tenant_id === tenantId && entry?.status === "active",
  ) ?? null;
}

export const LAWOS_INTERNAL_ROLE_ASSIGNMENTS = Object.freeze([]);

export function listLawosInternalRoleAssignments() {
  return LAWOS_INTERNAL_ROLE_ASSIGNMENTS;
}

export function resolveLawosUserRoleAssignment(
  user,
  { tenantId = MATTER_VAULT_REGISTERED_TENANT_ID } = {},
) {
  if (!user?.user_id) return null;
  const membership = membershipFor(user, tenantId);
  if (!membership) return null;
  const roleIds = frozenUnique(membership.role_ids);
  const groupIds = frozenUnique(membership.group_ids);
  const highestPrivilege =
    user.highest_privilege === true && roleIds.includes("system_super_admin");
  const scopes = frozenUnique([
    ...(membership.scopes ?? []),
    ...(highestPrivilege ? LAWOS_FINANCE_SCOPES : []),
  ]);
  const hrxScopes = frozenUnique(membership.hrx_scopes);
  return Object.freeze({
    user_id: user.user_id,
    role_profile_id: membership.role_profile_id ?? user.role_profile_id ?? null,
    role_ids: roleIds,
    group_ids: groupIds,
    scopes,
    hrx_scopes: hrxScopes,
    source_ref: membership.source_ref ?? LAWOS_ROLE_REGISTRY_SOURCE,
    tenant_membership: Object.freeze({
      tenant_id: tenantId,
      status: "active",
      role_ids: roleIds,
      group_ids: groupIds,
      scopes,
      hrx_scopes: hrxScopes,
      source_ref: membership.source_ref ?? LAWOS_ROLE_REGISTRY_SOURCE,
    }),
  });
}
