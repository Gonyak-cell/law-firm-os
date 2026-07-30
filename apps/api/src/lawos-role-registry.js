import { MATTER_VAULT_REGISTERED_TENANT_ID } from "./matter-vault-account-registry.js";
import { hrxScopesForRoleProfile } from "./hrx-role-scope-matrix.js";

export const LAWOS_ROLE_REGISTRY_SOURCE = "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-03";

const HRX_SELF_SERVICE_SCOPES = hrxScopesForRoleProfile("employee");
const HRX_ATTORNEY_SCOPES = hrxScopesForRoleProfile("manager");
const HRX_HR_SCOPES = hrxScopesForRoleProfile("hr");
const HRX_ADMIN_SCOPES = hrxScopesForRoleProfile("admin");

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

export const LAWOS_CLIENT_SCOPES = Object.freeze([
  "crm.inquiry.read",
  "crm.inquiry.write",
  "crm.inquiry.evidence.read",
  "crm.engagement.decide",
  "outlook.connection.manage",
  "outlook.inquiry.capture",
  "finance.fee.write",
  "analytics.client.read",
  "analytics.client.export",
]);

const LAWOS_CLIENT_BASE_SCOPES = Object.freeze([
  "crm.inquiry.read",
  "crm.inquiry.write",
  "crm.inquiry.evidence.read",
  "outlook.connection.manage",
  "outlook.inquiry.capture",
  "analytics.client.read",
]);

const LAWOS_CLIENT_ATTORNEY_SCOPES = Object.freeze([
  ...LAWOS_CLIENT_BASE_SCOPES,
  "crm.engagement.decide",
]);

const LAWOS_CLIENT_OPERATIONS_SCOPES = Object.freeze([
  ...LAWOS_CLIENT_BASE_SCOPES,
  "finance.fee.write",
  "analytics.client.export",
]);

const LAWOS_CLIENT_PARTNER_SCOPES = Object.freeze([
  ...LAWOS_CLIENT_ATTORNEY_SCOPES,
  "finance.fee.write",
  "analytics.client.export",
]);

const LAWOS_FINANCE_OPERATIONS_SCOPES = Object.freeze(
  LAWOS_FINANCE_SCOPES.filter((scope) => !["finance.approve", "finance.bank.import", "finance.bank.classify"].includes(scope)),
);

const LAWOS_FINANCE_PARTNER_SCOPES = Object.freeze([
  "analytics.finance.read",
  "finance.bank.read",
  "finance.bank.classify",
  "finance.time.write",
  "finance.expense.write",
  "finance.billing.write",
  "finance.approve",
  "finance.audit.read",
]);

function unique(items = []) {
  return Object.freeze([...new Set(items.filter(Boolean))]);
}

function assignment({ user_id, role_profile_id, role_ids, group_ids, scopes, hrx_scopes }) {
  const resolvedHrxScopes = unique(hrx_scopes);
  return Object.freeze({
    user_id,
    role_profile_id,
    role_ids: unique(role_ids),
    group_ids: unique(group_ids),
    scopes: unique([...(scopes ?? []), ...resolvedHrxScopes]),
    hrx_scopes: resolvedHrxScopes,
    source_ref: LAWOS_ROLE_REGISTRY_SOURCE,
  });
}

export const LAWOS_INTERNAL_ROLE_ASSIGNMENTS = Object.freeze([
  assignment({
    user_id: "user_amic_ytkim",
    role_profile_id: "lawos_admin_partner",
    role_ids: ["lawos_admin", "lawos_partner", "lawos_attorney", "managing_partner"],
    group_ids: ["group_firm_leadership", "group_lawos_admins"],
    scopes: ["tenant.admin", "matter.read", "matter.write", "vault.read", "vault.write", "vault.governance", "audit.read", ...LAWOS_FINANCE_SCOPES, ...LAWOS_CLIENT_SCOPES],
    hrx_scopes: HRX_ADMIN_SCOPES,
  }),
  assignment({
    user_id: "user_amic_wsjo",
    role_profile_id: "lawos_admin_operations",
    role_ids: ["lawos_admin", "lawos_staff"],
    group_ids: ["group_firm_operations", "group_lawos_admins"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", "vault.governance", "audit.read", ...LAWOS_FINANCE_OPERATIONS_SCOPES, ...LAWOS_CLIENT_OPERATIONS_SCOPES],
    hrx_scopes: HRX_ADMIN_SCOPES,
  }),
  assignment({
    user_id: "user_amic_sypark",
    role_profile_id: "lawos_staff",
    role_ids: ["lawos_staff"],
    group_ids: ["group_firm_operations", "group_lawos_staff"],
    scopes: ["matter.read", "vault.read", ...LAWOS_CLIENT_BASE_SCOPES],
    hrx_scopes: HRX_SELF_SERVICE_SCOPES,
  }),
  assignment({
    user_id: "user_amic_bj_park",
    role_profile_id: "lawos_partner_attorney",
    role_ids: ["lawos_partner", "lawos_attorney", "managing_partner"],
    group_ids: ["group_firm_leadership", "group_attorneys"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", "audit.read", ...LAWOS_FINANCE_PARTNER_SCOPES, ...LAWOS_CLIENT_PARTNER_SCOPES],
    hrx_scopes: HRX_ATTORNEY_SCOPES,
  }),
  assignment({
    user_id: "user_amic_yhlim",
    role_profile_id: "lawos_partner_attorney",
    role_ids: ["lawos_partner", "lawos_attorney", "managing_partner"],
    group_ids: ["group_firm_leadership", "group_attorneys"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", "audit.read", ...LAWOS_FINANCE_PARTNER_SCOPES, ...LAWOS_CLIENT_PARTNER_SCOPES],
    hrx_scopes: HRX_ATTORNEY_SCOPES,
  }),
  assignment({
    user_id: "user_amic_jwsuh",
    role_profile_id: "lawos_system_admin_partner",
    role_ids: ["system_super_admin", "lawos_admin", "lawos_partner", "lawos_attorney", "security_admin"],
    group_ids: ["group_system_admins", "group_firm_leadership", "group_lawos_admins"],
    scopes: ["tenant.admin", "user.admin", "security.admin", "cutover.execute", "matter.read", "matter.write", "vault.read", "vault.write", "vault.governance", "audit.read", "audit.export", ...LAWOS_FINANCE_SCOPES, ...LAWOS_CLIENT_SCOPES],
    hrx_scopes: HRX_ADMIN_SCOPES,
  }),
  assignment({
    user_id: "user_amic_smcho",
    role_profile_id: "lawos_partner_attorney",
    role_ids: ["lawos_partner", "lawos_attorney", "managing_partner"],
    group_ids: ["group_firm_leadership", "group_attorneys"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", "audit.read", ...LAWOS_FINANCE_PARTNER_SCOPES, ...LAWOS_CLIENT_PARTNER_SCOPES],
    hrx_scopes: HRX_ATTORNEY_SCOPES,
  }),
  assignment({
    user_id: "user_amic_jhhan",
    role_profile_id: "lawos_attorney",
    role_ids: ["lawos_attorney"],
    group_ids: ["group_attorneys"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", "audit.read", ...LAWOS_CLIENT_ATTORNEY_SCOPES],
    hrx_scopes: HRX_ATTORNEY_SCOPES,
  }),
  assignment({
    user_id: "user_amic_tryoon",
    role_profile_id: "lawos_hr_operations",
    role_ids: ["lawos_hr", "lawos_staff"],
    group_ids: ["group_firm_operations", "group_people_operations"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", ...LAWOS_CLIENT_BASE_SCOPES],
    hrx_scopes: HRX_HR_SCOPES,
  }),
  assignment({
    user_id: "user_amic_yjlee",
    role_profile_id: "lawos_staff",
    role_ids: ["lawos_staff"],
    group_ids: ["group_firm_operations", "group_lawos_staff"],
    scopes: ["matter.read", "vault.read", ...LAWOS_CLIENT_BASE_SCOPES],
    hrx_scopes: HRX_SELF_SERVICE_SCOPES,
  }),
]);

const DESKTOP_QA_ASSIGNMENT = assignment({
  user_id: "user_amic_matter_desktop_qa",
  role_profile_id: "lawos_desktop_qa",
  role_ids: ["lawos_desktop_qa"],
  group_ids: ["group_desktop_qa"],
  scopes: ["matter.read", "vault.read"],
  hrx_scopes: [],
});

const TENANT_B_QA_ASSIGNMENT = assignment({
  user_id: "user_qa_tenant_b",
  role_profile_id: "lawos_qa_tenant_b",
  role_ids: ["lawos_hr", "lawos_staff"],
  group_ids: ["group_qa_isolation"],
  scopes: ["matter.read", "vault.read"],
  hrx_scopes: HRX_HR_SCOPES,
});

const ASSIGNMENTS_BY_USER_ID = new Map(
  [...LAWOS_INTERNAL_ROLE_ASSIGNMENTS, DESKTOP_QA_ASSIGNMENT, TENANT_B_QA_ASSIGNMENT].map((entry) => [entry.user_id, entry]),
);

function tenantMembership(assignmentRef, tenantId) {
  return Object.freeze({
    tenant_id: tenantId,
    status: "active",
    role_ids: assignmentRef.role_ids,
    group_ids: assignmentRef.group_ids,
    scopes: assignmentRef.scopes,
    hrx_scopes: assignmentRef.hrx_scopes,
  });
}

function fallbackAssignment(user = {}) {
  return assignment({
    user_id: user.user_id,
    role_profile_id: "lawos_account_fallback",
    role_ids: ["lawos_staff"],
    group_ids: user.group_ids ?? ["group_lawos_staff"],
    scopes: ["matter.read", "vault.read"],
    hrx_scopes: HRX_SELF_SERVICE_SCOPES,
  });
}

export function listLawosInternalRoleAssignments() {
  return LAWOS_INTERNAL_ROLE_ASSIGNMENTS;
}

export function resolveLawosUserRoleAssignment(user, { tenantId = MATTER_VAULT_REGISTERED_TENANT_ID } = {}) {
  if (!user?.user_id) return null;
  const assignmentRef = ASSIGNMENTS_BY_USER_ID.get(user.user_id) ?? fallbackAssignment(user);
  return Object.freeze({
    ...assignmentRef,
    tenant_membership: tenantMembership(assignmentRef, tenantId),
  });
}
