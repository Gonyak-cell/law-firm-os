import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  MATTER_VAULT_USER_REGISTRATION_SEED,
} from "./matter-vault-account-registry.js";
import { hrxScopesForRoleProfile } from "./hrx-role-scope-matrix.js";

export const LAWOS_ROLE_REGISTRY_SOURCE = "private-synthetic-identity-manifest";

export const LAWOS_FINANCE_SCOPES = Object.freeze([
  "analytics.finance.read",
  "finance.time.write",
  "finance.expense.write",
  "finance.billing.write",
  "finance.approve",
  "finance.payment.write",
  "finance.export",
  "finance.audit.read",
]);

function unique(values = []) {
  return Object.freeze([...new Set(values.filter(Boolean))]);
}

function assignmentFromUser(user = {}) {
  const membership = user.tenant_memberships?.[0] ?? {};
  const roleIds = unique(membership.role_ids ?? user.role_ids);
  const admin = roleIds.includes("firm_admin") || roleIds.includes("matter_vault_admin");
  const hrxScopes = unique(membership.hrx_scopes ?? user.hrx_scopes ?? hrxScopesForRoleProfile(admin ? "admin" : "manager"));
  return Object.freeze({
    user_id: user.user_id,
    role_profile_id: membership.role_profile_id ?? user.role_profile_id ?? (admin ? "lawos_synthetic_staging_admin" : "lawos_synthetic_staging_attorney"),
    role_ids: roleIds,
    group_ids: unique(membership.group_ids ?? user.group_ids),
    scopes: unique([...(membership.scopes ?? user.scopes ?? []), ...hrxScopes]),
    hrx_scopes: hrxScopes,
    source_ref: LAWOS_ROLE_REGISTRY_SOURCE,
    membership_status: membership.status ?? user.status ?? "disabled",
  });
}

export const LAWOS_INTERNAL_ROLE_ASSIGNMENTS = Object.freeze(
  MATTER_VAULT_USER_REGISTRATION_SEED.users.map(assignmentFromUser),
);

const ASSIGNMENTS_BY_USER_ID = new Map(
  LAWOS_INTERNAL_ROLE_ASSIGNMENTS.map((entry) => [entry.user_id, entry]),
);

function fallbackAssignment(user = {}) {
  return assignmentFromUser({
    ...user,
    role_profile_id: user.role_profile_id ?? "lawos_synthetic_staging_fallback",
    role_ids: user.role_ids ?? ["matter_vault_user"],
    group_ids: user.group_ids ?? ["group_matter_vault_users"],
    scopes: user.scopes ?? ["matter.read", "vault.read"],
    hrx_scopes: user.hrx_scopes ?? hrxScopesForRoleProfile("employee"),
  });
}

export function listLawosInternalRoleAssignments() {
  return LAWOS_INTERNAL_ROLE_ASSIGNMENTS;
}

export function resolveLawosUserRoleAssignment(user, { tenantId = MATTER_VAULT_REGISTERED_TENANT_ID } = {}) {
  if (!user?.user_id) return null;
  const assignment = ASSIGNMENTS_BY_USER_ID.get(user.user_id) ?? fallbackAssignment(user);
  return Object.freeze({
    ...assignment,
    tenant_membership: Object.freeze({
      tenant_id: tenantId,
      status: assignment.membership_status,
      role_ids: assignment.role_ids,
      group_ids: assignment.group_ids,
      scopes: assignment.scopes,
      hrx_scopes: assignment.hrx_scopes,
      source_ref: assignment.source_ref,
    }),
  });
}
