import { MATTER_VAULT_REGISTERED_TENANT_ID } from "./matter-vault-account-registry.js";

export const LAWOS_ROLE_REGISTRY_SOURCE = "workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md#UPL-A-03";

const HRX_SELF_SERVICE_SCOPES = Object.freeze([
  "hrx.employee.read",
  "hrx.document.read",
  "hrx.leave.read",
  "hrx.leave.write",
]);

const HRX_ATTORNEY_SCOPES = Object.freeze([
  ...HRX_SELF_SERVICE_SCOPES,
  "hrx.approval.read",
  "hrx.approval.write",
  "hrx.legal_people.read",
  "hrx.analytics.read",
  "hrx.ai.assistant",
  "hrx.ai.review.read",
]);

const HRX_HR_SCOPES = Object.freeze([
  ...HRX_ATTORNEY_SCOPES,
  "hrx.employee.write",
  "hrx.document.write",
  "hrx.attendance.read",
  "hrx.attendance.write",
  "hrx.overtime.read",
  "hrx.overtime.write",
  "hrx.risk.read",
  "hrx.risk.write",
  "hrx.candidate.read",
  "hrx.candidate.write",
  "hrx.lifecycle.read",
  "hrx.lifecycle.write",
  "hrx.policy.read",
  "hrx.policy.write",
  "hrx.payroll.preview",
]);

const HRX_ADMIN_SCOPES = Object.freeze([
  ...HRX_HR_SCOPES,
  "hrx.analytics.export",
  "hrx.audit.read",
  "hrx.audit.append",
  "hrx.compensation.read",
  "hrx.compensation.write",
  "hrx.evaluation.read",
  "hrx.evaluation.review",
  "hrx.evaluation.write",
  "hrx.payroll.export",
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
    scopes: ["tenant.admin", "matter.read", "matter.write", "vault.read", "vault.write", "audit.read"],
    hrx_scopes: HRX_ADMIN_SCOPES,
  }),
  assignment({
    user_id: "user_amic_wsjo",
    role_profile_id: "lawos_admin_operations",
    role_ids: ["lawos_admin", "lawos_staff"],
    group_ids: ["group_firm_operations", "group_lawos_admins"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", "audit.read"],
    hrx_scopes: HRX_ADMIN_SCOPES,
  }),
  assignment({
    user_id: "user_amic_sypark",
    role_profile_id: "lawos_staff",
    role_ids: ["lawos_staff"],
    group_ids: ["group_firm_operations", "group_lawos_staff"],
    scopes: ["matter.read", "vault.read"],
    hrx_scopes: HRX_SELF_SERVICE_SCOPES,
  }),
  assignment({
    user_id: "user_amic_bj_park",
    role_profile_id: "lawos_partner_attorney",
    role_ids: ["lawos_partner", "lawos_attorney", "managing_partner"],
    group_ids: ["group_firm_leadership", "group_attorneys"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", "audit.read"],
    hrx_scopes: HRX_ATTORNEY_SCOPES,
  }),
  assignment({
    user_id: "user_amic_yhlim",
    role_profile_id: "lawos_partner_attorney",
    role_ids: ["lawos_partner", "lawos_attorney", "managing_partner"],
    group_ids: ["group_firm_leadership", "group_attorneys"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", "audit.read"],
    hrx_scopes: HRX_ATTORNEY_SCOPES,
  }),
  assignment({
    user_id: "user_amic_jwsuh",
    role_profile_id: "lawos_system_admin_partner",
    role_ids: ["lawos_admin", "lawos_partner", "lawos_attorney", "security_admin"],
    group_ids: ["group_system_admins", "group_firm_leadership", "group_lawos_admins"],
    scopes: ["tenant.admin", "user.admin", "security.admin", "cutover.execute", "matter.read", "matter.write", "vault.read", "vault.write", "audit.read", "audit.export"],
    hrx_scopes: HRX_ADMIN_SCOPES,
  }),
  assignment({
    user_id: "user_amic_smcho",
    role_profile_id: "lawos_partner_attorney",
    role_ids: ["lawos_partner", "lawos_attorney", "managing_partner"],
    group_ids: ["group_firm_leadership", "group_attorneys"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write", "audit.read"],
    hrx_scopes: HRX_ATTORNEY_SCOPES,
  }),
  assignment({
    user_id: "user_amic_tryoon",
    role_profile_id: "lawos_hr_operations",
    role_ids: ["lawos_hr", "lawos_staff"],
    group_ids: ["group_firm_operations", "group_people_operations"],
    scopes: ["matter.read", "matter.write", "vault.read", "vault.write"],
    hrx_scopes: HRX_HR_SCOPES,
  }),
  assignment({
    user_id: "user_amic_yjlee",
    role_profile_id: "lawos_staff",
    role_ids: ["lawos_staff"],
    group_ids: ["group_firm_operations", "group_lawos_staff"],
    scopes: ["matter.read", "vault.read"],
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

const ASSIGNMENTS_BY_USER_ID = new Map(
  [...LAWOS_INTERNAL_ROLE_ASSIGNMENTS, DESKTOP_QA_ASSIGNMENT].map((entry) => [entry.user_id, entry]),
);

function tenantMembership(assignmentRef, tenantId) {
  return Object.freeze({
    tenant_id: tenantId,
    status: "active",
    role_ids: assignmentRef.role_ids,
    group_ids: assignmentRef.group_ids,
    scopes: assignmentRef.scopes,
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
