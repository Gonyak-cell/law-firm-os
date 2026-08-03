import { createHash, randomUUID } from "node:crypto";
import { createDurableAuditStore } from "../../../packages/audit/src/durable-audit-store.js";
import { createHrxAuditEventStore } from "../../../packages/audit/src/hrx-event-store.js";
import {
  createInMemoryCompensationRecordStore,
  createSqlCompensationRecordStore,
  encryptCompensationAmount,
  maskCompensationRef,
} from "../../../packages/hrx/src/compensation.js";
import { createInMemoryHrxDocumentStore, createSqlHrxDocumentStore } from "../../../packages/hrx/src/documents.js";
import { createApprovalPolicy, createApprovalRequest, resolveApprovalRequest } from "../../../packages/hrx/src/approval.js";
import { createApplication, transitionApplicationStage } from "../../../packages/hrx/src/recruiting/application.js";
import { createCandidateProfile } from "../../../packages/hrx/src/recruiting/candidate.js";
import { assertCandidateConsentAllowsProcessing, createCandidateConsent } from "../../../packages/hrx/src/recruiting/consent.js";
import { executeCandidateConversion } from "../../../packages/hrx/src/recruiting/conversion-service.js";
import { createInterview } from "../../../packages/hrx/src/recruiting/interview.js";
import { createJobOpening } from "../../../packages/hrx/src/recruiting/job-opening.js";
import { createOffer, transitionOffer } from "../../../packages/hrx/src/recruiting/offer.js";
import {
  createCandidatePrivacyProjection,
  projectInterviewForRecruitingViewer,
} from "../../../packages/hrx/src/recruiting/privacy.js";
import { createHrxAiSourceRegistry, createSqlHrxAiSourceRegistry } from "../../../packages/hrx/src/ai/source-registry.js";
import { createHrxPermissionAwareRetriever } from "../../../packages/hrx/src/ai/rag.js";
import { createHrxModelGatewayFromEnv } from "../../../packages/hrx/src/ai/model-provider-registry.js";
import { createInMemoryHrxAiReviewQueue } from "../../../packages/hrx/src/ai/review-queue.js";
import { createSqlHrxAiReviewQueue } from "../../../packages/hrx/src/ai/review-queue-sql.js";
import {
  createInMemoryHrxAiSourceChunkIndex,
  createSqlHrxAiSourceChunkIndex,
  ingestHrxAiSourceChunks,
} from "../../../packages/hrx/src/ai/source-ingestion.js";
import {
  HRX_ATTENDANCE_STATUSES,
  createInMemoryAttendanceStore,
  createSqlAttendanceStore,
  resolveEffectiveAttendanceRecords,
} from "../../../packages/hrx/src/attendance.js";
import {
  createAttendanceCorrectionWorkflow,
  createAttendanceSourceVersion,
} from "../../../packages/hrx/src/attendance-correction-workflow.js";
import { createHrxPeopleAnalyticsReadModel } from "../../../packages/hrx/src/analytics.js";
import { createPeopleDailyBriefProjection } from "../../../packages/hrx/src/people-daily-brief.js";
import {
  recordPeopleFeatureTelemetry,
  resolvePeopleFeatureFlags,
} from "../../../packages/hrx/src/people-feature-flags.js";
import { readApprovedLeaveIntervals } from "../../../packages/hrx/src/people-leave-intervals.js";
import { projectOutlookCalendarForViewer } from "../../../packages/hrx/src/outlook-calendar-privacy.js";
import { createPeopleSourceEnvelope } from "../../../packages/hrx/src/people-source-envelope.js";
import {
  publicEmployeeDisplayName,
  publicPeopleLabel,
  UNRESOLVED_EMPLOYEE_DISPLAY_NAME,
} from "../../../packages/hrx/src/people-presentation.js";
import {
  createPeopleTeamOperationsProjection,
  PEOPLE_TEAM_OPERATIONS_MEMBER_LIMIT,
} from "../../../packages/hrx/src/people-team-operations.js";
import { createLeavePolicy } from "../../../packages/hrx/src/rules/leave-policy.js";
import { createInMemoryLeaveBalanceLedger, createSqlLeaveBalanceLedger } from "../../../packages/hrx/src/leave/balance.js";
import { createInMemoryLeaveRequestStore, createLeaveRequestService, createSqlLeaveRequestStore } from "../../../packages/hrx/src/leave/request-service.js";
import { createDurableLeaveManagementService } from "../../../packages/hrx/src/leave/management-service.js";
import { createLeavePolicyService } from "../../../packages/hrx/src/leave/policy-service.js";
import { createLeaveApprovalDelegationService } from "../../../packages/hrx/src/leave/approval-delegation.js";
import { createLeaveAccrualService } from "../../../packages/hrx/src/leave/accrual-service.js";
import { createLeaveAccrualBatchService } from "../../../packages/hrx/src/leave/accrual-batch-service.js";
import { createLeaveOccurrenceUploadBatchService } from "../../../packages/hrx/src/leave/occurrence-upload-batch-service.js";
import { createLeaveReportingService } from "../../../packages/hrx/src/leave/reporting-service.js";
import { createLeaveTerminationService } from "../../../packages/hrx/src/leave/termination-service.js";
import { createLeavePromotionService } from "../../../packages/hrx/src/leave/promotion-service.js";
import { createInternalLeaveIntegrationProviders, createLeaveIntegrationService } from "../../../packages/hrx/src/leave/integration-service.js";
import { createLeaveEntitlementCommandService } from "../../../packages/hrx/src/leave/entitlement-command-service.js";
import { createLeaveEntitlementReadService } from "../../../packages/hrx/src/leave/entitlement-read-service.js";
import { createLeaveExpirationService } from "../../../packages/hrx/src/leave/expiration-service.js";
import { createSqlWorkScheduleResolver } from "../../../packages/hrx/src/leave/work-schedule.js";
import { peopleLocalDateKey } from "../../../packages/hrx/src/people-intervals.js";
import { closeOffboardingCase, createOffboardingCase, updateOffboardingTask } from "../../../packages/hrx/src/offboarding.js";
import {
  assertOffboardingEvidenceRecorder,
  assertOperationalOffboardingClose,
  createOffboardingEvidenceReceipt,
  createOffboardingEvidenceSourceVersions,
  createOffboardingSourceVersion,
  evaluateOperationalOffboardingClose,
  offboardingEvidencePointers,
} from "../../../packages/hrx/src/offboarding-evidence.js";
import {
  calculateOvertimeReviewMinutes,
  createInMemoryOvertimeStore,
  createSqlOvertimeStore,
  createWeeklyOvertimeRiskReport,
} from "../../../packages/hrx/src/overtime.js";
import {
  createHrxRiskDailyScan,
  createHrxRiskDashboard,
  createHrxRiskEvent,
  createInMemoryHrxRiskEventStore,
  transitionHrxRiskEvent,
} from "../../../packages/hrx/src/risk-event.js";
import { createOnboardingPlan, updateOnboardingTask } from "../../../packages/hrx/src/onboarding.js";
import { createLifecycleTemplate } from "../../../packages/hrx/src/lifecycle-template.js";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { createSqlHrxRepository } from "../../../packages/hrx/src/repository-sql.js";
import {
  resolveUniqueEmployeeUserLink,
  resolveUniqueUserForEmployee,
} from "../../../packages/hrx/src/identity-link.js";
import {
  employmentProfileAsOf,
  employmentProfileTimeline,
  planEmploymentProfileInsertion,
} from "../../../packages/hrx/src/employment-profile.js";
import {
  createLegalPeopleApiSeed,
  LCX_PPL_API_BOUNDARY,
  createLegalPeoplePermissionContext,
  createLegalPeopleReadModel,
} from "../../../packages/hrx/src/legal-people-api.js";
import {
  createLegalPeopleEthicsReadModel,
  createLegalPeopleEthicsSeed,
} from "../../../packages/hrx/src/legal-people-ethics.js";
import {
  createMatterPeopleDocumentGraphSeed,
  createMatterPeopleDocumentGraphSeedFromRuntime,
  createMatterPeopleDocumentGraphTable,
} from "../../../packages/hrx/src/matter-people-document-graph.js";
import { createHrxMatterWorkloadProjection } from "../../../packages/matter/src/hrx-workload-projection.js";
import { transitionEmployee } from "../../../packages/hrx/src/employee-lifecycle.js";
import { createPeopleProviderIdentityRegistry } from "../../../packages/integrations-core/src/people-provider-identity.js";
import {
  createInMemoryOpaqueTokenVault,
  createOutlookConsentService,
} from "../../../packages/integrations-core/src/outlook-token-vault.js";
import { createOutlookCalendarCache } from "../../../packages/integrations-core/src/outlook-calendar-cache.js";
import { createPeopleOutlookConnectionService } from "../../../packages/integrations-core/src/people-outlook-connection.js";
import {
  createPeopleOutlookCalendarSource,
  createUnavailablePeopleOutlookCalendarSource,
} from "../../../packages/integrations-core/src/people-outlook-calendar-source.js";
import { createHrxAiRoute } from "./routes/hrx/ai.js";
import { createHrxPayrollRoute } from "./routes/hrx/payroll.js";
import { createHrxPayrollRuntimeRoute } from "./routes/hrx/payroll-runtime.js";
import { createHrxPayrollRuntime, seedSyntheticPayrollRuntimeStore } from "./hrx-payroll-runtime.js";
import {
  MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE,
  MATTER_VAULT_REGISTERED_TENANT_ID,
  listRegisteredAccounts,
} from "./matter-vault-account-registry.js";
import {
  HRX_MEMBER_ROSTER_SOURCE_REF,
  findHrxPublicProfessionalProfileByEmployeeId,
  listHrxMemberRosterRows,
} from "./hrx-member-roster-registry.js";
import { resolveLawosUserRoleAssignment } from "./lawos-role-registry.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

const SYNTHETIC_TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
export const HRX_RUNTIME_SEED_TENANT_ID = SYNTHETIC_TENANT;
export const HRX_API_COMPATIBILITY_TENANT_ID = "tenant-a";
const HRX_DEFAULT_SEED_TENANT_IDS = Object.freeze(
  [...new Set([SYNTHETIC_TENANT, HRX_API_COMPATIBILITY_TENANT_ID])],
);
const REGISTERED_ACCOUNTS = listRegisteredAccounts();
const SEED_SOURCE_REF = MATTER_VAULT_ACCOUNT_REGISTRY_SOURCE;
const COMPATIBILITY_SOURCE_REF = "HRX:api-compatibility-fixture";
const MEMBER_ROSTER = listHrxMemberRosterRows();
const MEMBER_ROSTER_BY_USER_ID = new Map(MEMBER_ROSTER.map((member) => [member.user_id, member]));
const MEMBER_ROSTER_BY_EMPLOYEE_ID = new Map(MEMBER_ROSTER.map((member) => [member.employee_id, member]));
const MEMBER_ROSTER_BY_DISPLAY_NAME = new Map(MEMBER_ROSTER.map((member) => [member.display_name, member]));
const KOREAN_DISPLAY_NAME_COLLATOR = new Intl.Collator("ko-KR");
const HRX_ELEVATED_READ_ROLES = new Set(["security_admin", "hr_admin", "people_ops", "hr_manager", "hr_reviewer", "lawos_admin", "lawos_hr"]);
function currentDateKey(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function requestedAsOfDate(value) {
  if (value === undefined || value === null || value === "") return currentDateKey();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw safeHrxRuntimeError(400, "HRX_AS_OF_DATE_INVALID", "as_of must be an ISO date");
  }
  return value;
}
const COMPATIBILITY_PEOPLE = Object.freeze([
  Object.freeze({
    employee_id: "emp-001",
    user_id: "user-hrx-001",
    display_name: "Ari Kim",
    legal_name: "Ari Kim",
    work_email: "ari.kim@example.test",
    title: "People Operations Lead",
    org_unit_id: "group_people_ops",
  }),
  Object.freeze({
    employee_id: "emp-002",
    user_id: "user-hrx-002",
    display_name: "Mina Park",
    legal_name: "Mina Park",
    work_email: "mina.park@example.test",
    title: "Litigation Associate",
    org_unit_id: "group_litigation",
  }),
]);
const HRX_ORG_UNITS = Object.freeze([
  Object.freeze({
    org_unit_id: "org_legal",
    label: "AMIC Law",
    department: "Legal",
    organization_group: "AMIC Law",
    parent_org_unit_id: null,
    display_order: 10,
  }),
  Object.freeze({
    org_unit_id: "org_finance",
    label: "PETRA BRIDGE PARTNERS",
    department: "Finance",
    organization_group: "PETRA BRIDGE PARTNERS",
    parent_org_unit_id: null,
    display_order: 20,
  }),
  Object.freeze({
    org_unit_id: "org_staff",
    label: "Staff",
    department: "Staff",
    organization_group: "Staff",
    parent_org_unit_id: "org_legal",
    display_order: 30,
  }),
  Object.freeze({
    org_unit_id: "group_people_ops",
    label: "People Operations",
    department: "People",
    organization_group: "People Operations",
    parent_org_unit_id: null,
    display_order: 40,
  }),
  Object.freeze({
    org_unit_id: "group_litigation",
    label: "Litigation",
    department: "Legal",
    organization_group: "AMIC Law",
    parent_org_unit_id: "org_legal",
    display_order: 50,
  }),
  Object.freeze({
    org_unit_id: "group_matter_vault_users",
    label: "Matter Vault",
    department: "Operations",
    organization_group: "Matter Vault",
    parent_org_unit_id: null,
    display_order: 60,
  }),
  Object.freeze({
    org_unit_id: "group_firm_leadership",
    label: "Firm Leadership",
    department: "Management",
    organization_group: "AMIC Law",
    parent_org_unit_id: "org_legal",
    display_order: 70,
  }),
  Object.freeze({
    org_unit_id: "group_firm_operations",
    label: "Firm Operations",
    department: "Operations",
    organization_group: "AMIC Law",
    parent_org_unit_id: "org_legal",
    display_order: 80,
  }),
  Object.freeze({
    org_unit_id: "group_system_admins",
    label: "System Admins",
    department: "Admin",
    organization_group: "Matter Vault",
    parent_org_unit_id: "group_matter_vault_users",
    display_order: 90,
  }),
  Object.freeze({
    org_unit_id: "group_matter_vault_admins",
    label: "Matter Vault Admins",
    department: "Admin",
    organization_group: "Matter Vault",
    parent_org_unit_id: "group_matter_vault_users",
    display_order: 100,
  }),
]);
const HRX_ORG_UNIT_BY_ID = new Map(HRX_ORG_UNITS.map((unit) => [unit.org_unit_id, unit]));
const COMPATIBILITY_MANAGER_BY_EMPLOYEE_ID = Object.freeze({
  "emp-002": "emp-001",
});

function accountEmployeeId(account) {
  return `emp_${String(account.user_id).replace(/^user_/, "")}`;
}

function memberRosterForAccount(account) {
  return MEMBER_ROSTER_BY_USER_ID.get(account.user_id) ?? MEMBER_ROSTER_BY_DISPLAY_NAME.get(account.display_name) ?? null;
}

function employeeIdForRegisteredAccount(account) {
  return memberRosterForAccount(account)?.employee_id ?? accountEmployeeId(account);
}

function registeredRosterMembers() {
  return MEMBER_ROSTER.map((member) => {
    return {
      member,
      account: REGISTERED_ACCOUNTS.find((candidate) => candidate.user_id === member.user_id) ?? null,
    };
  });
}

function registeredEmployees(tenantId) {
  return registeredRosterMembers().map(({ member, account }) => {
    return {
      tenant_id: tenantId,
      employee_id: member.employee_id,
      display_name: member.display_name,
      legal_name: member.legal_name || member.display_name,
      work_email: member.work_email ?? account?.email,
      mobile_phone: member.mobile_phone || null,
      status: member.status ?? (account?.status === "active" ? "active" : "inactive"),
      source_ref: member.source_ref,
    };
  });
}

function registeredEmploymentProfiles(tenantId) {
  return registeredRosterMembers().map(({ member, account }) => {
    return {
      tenant_id: tenantId,
      profile_id: `profile_${member.user_id.replace(/^user_/, "")}`,
      employee_id: member.employee_id,
      employment_type: member.employment_type ?? "full_time",
      status: member.profile_status ?? (account?.status === "active" ? "active" : "terminated"),
      title: member.title ?? account?.source_title ?? "구성원",
      org_unit_id: member.org_unit_id || account?.group_ids?.[0] || "group_matter_vault_users",
      manager_employee_id: member.manager_employee_id ?? null,
      effective_from: member.start_date || "2026-06-22",
      source_ref: member.manager_employee_id
        ? `${member.source_ref}:manager:${member.employee_id}:${member.manager_employee_id}`
        : member.source_ref,
    };
  });
}

function registeredEmployeeUserLinks(tenantId) {
  return MEMBER_ROSTER.map((member) => ({
    tenant_id: tenantId,
    link_id: `link_${member.user_id.replace(/^user_/, "")}`,
    employee_id: member.employee_id,
    user_id: member.user_id,
    purpose: "login_mapping",
    source_ref: HRX_MEMBER_ROSTER_SOURCE_REF,
  }));
}

function compatibilityEmployees(tenantId) {
  return COMPATIBILITY_PEOPLE.map((person) => ({
    tenant_id: tenantId,
    employee_id: person.employee_id,
    display_name: person.display_name,
    legal_name: person.legal_name,
    work_email: person.work_email,
    status: "active",
    source_ref: COMPATIBILITY_SOURCE_REF,
  }));
}

function compatibilityEmploymentProfiles(tenantId) {
  return COMPATIBILITY_PEOPLE.map((person) => ({
    tenant_id: tenantId,
    profile_id: `profile-${person.employee_id}`,
    employee_id: person.employee_id,
    employment_type: "full_time",
    status: "active",
    title: person.title,
    org_unit_id: person.org_unit_id,
    manager_employee_id: COMPATIBILITY_MANAGER_BY_EMPLOYEE_ID[person.employee_id] ?? null,
    effective_from: "2026-06-20",
    source_ref: COMPATIBILITY_SOURCE_REF,
  }));
}

function compatibilityEmployeeUserLinks(tenantId) {
  return COMPATIBILITY_PEOPLE.map((person) => ({
    tenant_id: tenantId,
    link_id: `link-${person.employee_id}`,
    employee_id: person.employee_id,
    user_id: person.user_id,
    purpose: "login_mapping",
    source_ref: COMPATIBILITY_SOURCE_REF,
  }));
}

function seedEmployees(tenantId) {
  return tenantId === HRX_API_COMPATIBILITY_TENANT_ID ? compatibilityEmployees(tenantId) : registeredEmployees(tenantId);
}

function seedEmploymentProfiles(tenantId) {
  return tenantId === HRX_API_COMPATIBILITY_TENANT_ID
    ? compatibilityEmploymentProfiles(tenantId)
    : registeredEmploymentProfiles(tenantId);
}

function seedEmployeeUserLinks(tenantId) {
  return tenantId === HRX_API_COMPATIBILITY_TENANT_ID
    ? compatibilityEmployeeUserLinks(tenantId)
    : registeredEmployeeUserLinks(tenantId);
}

function memberRosterForEmployee(employee) {
  return (
    MEMBER_ROSTER_BY_EMPLOYEE_ID.get(employee.employee_id) ??
    MEMBER_ROSTER_BY_DISPLAY_NAME.get(employee.display_name) ??
    null
  );
}

function orgUnitForProfile(profile) {
  return HRX_ORG_UNIT_BY_ID.get(String(profile?.org_unit_id ?? "")) ?? null;
}

function departmentForDirectoryRow(employee, profile, member) {
  if (member?.department) return member.department;
  return orgUnitForProfile(profile)?.department ?? "미등록";
}

function employeeRosterReadFields(employee, profile) {
  const member = memberRosterForEmployee(employee);
  const publicProfile = findHrxPublicProfessionalProfileByEmployeeId(employee.employee_id);
  const orgUnit = orgUnitForProfile(profile);
  const department = departmentForDirectoryRow(employee, profile, member);
  return {
    title: profile?.title,
    employment_type: profile?.employment_type,
    affiliation: member?.affiliation ?? orgUnit?.label ?? "AMIC Law",
    department,
    organization_group: member?.organization_group ?? orgUnit?.organization_group ?? department,
    country: member?.country ?? "대한민국",
    mobile_phone: member?.mobile_phone || null,
    professional_profile: profile?.professional_profile ?? member?.professional_profile ?? publicProfile?.professional_profile ?? null,
    source_ref: profile?.professional_profile ? profile.source_ref : member?.source_ref ?? publicProfile?.source_ref ?? employee.source_ref,
    employment_profile_id: profile?.profile_id ?? null,
    org_unit_id: profile?.org_unit_id ?? member?.org_unit_id ?? null,
    org_unit_label: orgUnit?.label ?? member?.organization_group ?? department,
    manager_employee_id: profile?.manager_employee_id ?? null,
  };
}

function employeeDirectoryRows(repository, tenantId, { asOf = currentDateKey() } = {}) {
  const profilesByEmployeeId = repository
    .listEmploymentProfiles({ tenant_id: tenantId })
    .reduce((groups, profile) => {
      groups.set(profile.employee_id, [...(groups.get(profile.employee_id) ?? []), profile]);
      return groups;
    }, new Map());
  const rows = repository
    .listEmployees({ tenant_id: tenantId })
    .map((employee) => {
      const profile = employmentProfileAsOf(profilesByEmployeeId.get(employee.employee_id) ?? [], asOf);
      return {
        ...employee,
        display_name: publicEmployeeDisplayName(employee),
        ...employeeRosterReadFields(employee, profile),
      };
    });
  const employeeById = new Map(rows.map((employee) => [employee.employee_id, employee]));
  return rows
    .map((employee) => ({
      ...employee,
      manager_display_name: employee.manager_employee_id ? employeeById.get(employee.manager_employee_id)?.display_name ?? null : null,
    }))
    .sort((left, right) => KOREAN_DISPLAY_NAME_COLLATOR.compare(left.display_name, right.display_name));
}

function currentEmploymentProfile(repository, tenantId, employeeId, asOf = currentDateKey()) {
  return employmentProfileAsOf(
    repository.listEmploymentProfiles({ tenant_id: tenantId, employee_id: employeeId }),
    asOf,
  );
}

export function resolveHrxEmployeeProfileByUserId(context, { tenant_id: tenantId, user_id: userId } = {}) {
  const repository = context?.repository;
  if (!repository || !tenantId || !userId) return null;
  const links = repository.listEmployeeUserLinks({ tenant_id: tenantId, user_id: userId });
  if (links.length !== 1) return null;
  const employee = repository.getEmployee({ tenant_id: tenantId, employee_id: links[0].employee_id });
  if (!employee) return null;
  const employmentProfile = currentEmploymentProfile(repository, tenantId, employee.employee_id);
  const rosterFields = employeeRosterReadFields(employee, employmentProfile);
  const rosterMember = memberRosterForEmployee(employee);
  return Object.freeze({
    ...employee,
    display_name: publicEmployeeDisplayName(employee),
    ...rosterFields,
    title: rosterFields.title ?? employmentProfile?.title ?? "",
    start_date: rosterMember?.start_date ?? "",
    employment_profile: employmentProfile,
  });
}

function resolveLeaveApprover(repository, { tenant_id: tenantId, employee }) {
  const profile = currentEmploymentProfile(repository, tenantId, employee.employee_id);
  const managerEmployeeId = profile?.manager_employee_id;
  if (!managerEmployeeId) return null;
  const managerLinks = repository.listEmployeeUserLinks({ tenant_id: tenantId, employee_id: managerEmployeeId });
  if (managerLinks.length !== 1) return null;
  return Object.freeze({
    actor_id: managerLinks[0].user_id,
    organization_scope_id: profile.org_unit_id ?? null,
    source_assignment_version: `${profile.profile_id}:${profile.updated_at ?? profile.source_ref}`,
    valid_from: `${profile.effective_from}T00:00:00.000Z`,
    valid_to: profile.effective_to ? `${profile.effective_to}T23:59:59.999Z` : null,
  });
}

function safeHrxRuntimeError(status, safe_error_code, message) {
  const error = new Error(message);
  error.status = status;
  error.safe_error_code = safe_error_code;
  return error;
}

function normalizeOptionalId(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function orgUnitPayload(unit, memberCount = 0) {
  return {
    org_unit_id: unit.org_unit_id,
    label: unit.label,
    department: unit.department,
    organization_group: unit.organization_group,
    parent_org_unit_id: unit.parent_org_unit_id,
    display_order: unit.display_order,
    member_count: memberCount,
  };
}

function organizationChangeEvents(audit, tenantId) {
  return audit
    .list({ tenant_id: tenantId })
    .filter((event) => event.action === "hrx.organization.update")
    .slice(-12)
    .reverse()
    .map(clone);
}

function buildHrxOrgChart(context, actorContext, { employeeIds = null, asOf = currentDateKey() } = {}) {
  const tenantId = actorContext.tenant_id;
  const allowedEmployeeIds = employeeIds ? new Set(employeeIds) : null;
  const rows = employeeDirectoryRows(context.repository, tenantId, { asOf }).filter((employee) => employee.status === "active");
  const visibleRows = allowedEmployeeIds ? rows.filter((employee) => allowedEmployeeIds.has(employee.employee_id)) : rows;
  const visibleByEmployeeId = new Map(visibleRows.map((employee) => [employee.employee_id, employee]));
  const directReportCounts = new Map();
  for (const employee of visibleRows) {
    if (!employee.manager_employee_id || !visibleByEmployeeId.has(employee.manager_employee_id)) continue;
    directReportCounts.set(employee.manager_employee_id, (directReportCounts.get(employee.manager_employee_id) ?? 0) + 1);
  }
  const memberCountByOrgUnitId = new Map();
  for (const employee of visibleRows) {
    const orgUnitId = employee.org_unit_id ?? "unassigned";
    memberCountByOrgUnitId.set(orgUnitId, (memberCountByOrgUnitId.get(orgUnitId) ?? 0) + 1);
  }
  const employees = visibleRows
    .map((employee) => {
      const manager = employee.manager_employee_id ? visibleByEmployeeId.get(employee.manager_employee_id) : null;
      return {
        employee_id: employee.employee_id,
        display_name: employee.display_name,
        title: employee.title ?? "구성원",
        status: employee.status,
        work_email: employee.work_email ?? null,
        employment_profile_id: employee.employment_profile_id ?? null,
        org_unit_id: employee.org_unit_id ?? null,
        org_unit_label: employee.org_unit_label ?? "미등록",
        department: employee.department ?? "미등록",
        organization_group: employee.organization_group ?? employee.department ?? "미등록",
        manager_employee_id: manager ? employee.manager_employee_id : null,
        manager_display_name: manager?.display_name ?? null,
        direct_report_count: directReportCounts.get(employee.employee_id) ?? 0,
        reporting_line_state: employee.manager_employee_id ? (manager ? "assigned" : "manager_out_of_scope") : "top_level",
        source_ref: employee.source_ref ?? null,
      };
    })
    .sort((left, right) => {
      const leftOrder = HRX_ORG_UNIT_BY_ID.get(left.org_unit_id)?.display_order ?? 999;
      const rightOrder = HRX_ORG_UNIT_BY_ID.get(right.org_unit_id)?.display_order ?? 999;
      return leftOrder - rightOrder || KOREAN_DISPLAY_NAME_COLLATOR.compare(left.display_name, right.display_name);
    });
  const employeeById = new Map(employees.map((employee) => [employee.employee_id, employee]));
  const orgUnits = HRX_ORG_UNITS
    .filter((unit) => memberCountByOrgUnitId.has(unit.org_unit_id))
    .map((unit) => orgUnitPayload(unit, memberCountByOrgUnitId.get(unit.org_unit_id) ?? 0));
  const visibleEmployeeIds = new Set(visibleRows.map((employee) => employee.employee_id));
  const scheduledChanges = context.repository
    .listEmploymentProfiles({ tenant_id: tenantId })
    .filter((profile) => profile.effective_from > asOf)
    .filter((profile) => visibleEmployeeIds.has(profile.employee_id))
    .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
    .map((profile) => ({
      profile_id: profile.profile_id,
      employee_id: profile.employee_id,
      employee_display_name: visibleByEmployeeId.get(profile.employee_id)?.display_name ?? "구성원 이름 확인 필요",
      effective_from: profile.effective_from,
      status: profile.status,
      title: profile.title ?? null,
      org_unit_id: profile.org_unit_id ?? null,
      org_unit_label: HRX_ORG_UNIT_BY_ID.get(profile.org_unit_id)?.label ?? "미등록",
      manager_employee_id: profile.manager_employee_id ?? null,
      manager_display_name: profile.manager_employee_id
        ? (() => {
            const manager = context.repository.getEmployee({
              tenant_id: tenantId,
              employee_id: profile.manager_employee_id,
            });
            return manager ? publicEmployeeDisplayName(manager) : null;
          })()
        : null,
    }));
  return {
    outcome: "ok",
    as_of: asOf,
    org_units: orgUnits,
    employees,
    reporting_lines: employees.map((employee) => ({
      employee_id: employee.employee_id,
      manager_employee_id: employee.manager_employee_id,
      employee_display_name: employee.display_name,
      manager_display_name: employee.manager_employee_id ? employeeById.get(employee.manager_employee_id)?.display_name ?? null : null,
      state: employee.reporting_line_state,
    })),
    change_events: organizationChangeEvents(context.audit, tenantId),
    scheduled_changes: scheduledChanges,
    generated_from: "hrx_employment_profiles",
    claim_boundary: {
      source_of_truth: "EmploymentProfile.org_unit_id + EmploymentProfile.manager_employee_id",
      string_heuristics_used: false,
      self_service_filtered: Boolean(allowedEmployeeIds),
    },
  };
}

function assertReportingLineAcyclic(repository, tenantId, employeeId, managerEmployeeId, asOf = currentDateKey()) {
  if (!managerEmployeeId) return;
  if (managerEmployeeId === employeeId) {
    throw safeHrxRuntimeError(400, "HRX_ORG_MANAGER_SELF_REFERENCE", "manager_employee_id must not equal employee_id");
  }
  const profilesByEmployeeId = repository
    .listEmploymentProfiles({ tenant_id: tenantId })
    .reduce((groups, profile) => {
      groups.set(profile.employee_id, [...(groups.get(profile.employee_id) ?? []), profile]);
      return groups;
    }, new Map());
  const profilesAsOf = new Map(
    [...profilesByEmployeeId.entries()].map(([candidateEmployeeId, profiles]) => [
      candidateEmployeeId,
      employmentProfileAsOf(profiles, asOf),
    ]),
  );
  const currentProfile = profilesAsOf.get(employeeId);
  profilesAsOf.set(employeeId, {
    ...currentProfile,
    employee_id: employeeId,
    manager_employee_id: managerEmployeeId,
  });
  const visited = new Set();
  let nextEmployeeId = managerEmployeeId;
  while (nextEmployeeId) {
    if (nextEmployeeId === employeeId) {
      throw safeHrxRuntimeError(400, "HRX_ORG_REPORTING_LINE_CYCLE", "reporting line must not contain a cycle");
    }
    if (visited.has(nextEmployeeId)) {
      throw safeHrxRuntimeError(400, "HRX_ORG_REPORTING_LINE_CYCLE", "reporting line must not contain a cycle");
    }
    visited.add(nextEmployeeId);
    nextEmployeeId = profilesAsOf.get(nextEmployeeId)?.manager_employee_id ?? null;
  }
}

function persistEmploymentProfilePlan(repository, plan) {
  const persist = (activeRepository) => {
    if (plan.previous_update) {
      activeRepository.updateEmploymentProfile(
        {
          tenant_id: plan.previous_update.tenant_id,
          profile_id: plan.previous_update.profile_id,
        },
        { effective_to: plan.previous_update.effective_to },
      );
    }
    return activeRepository.createEmploymentProfile(plan.profile);
  };
  return typeof repository.transaction === "function"
    ? repository.transaction(persist)
    : persist(repository);
}

function scheduleEmploymentProfileChange(context, actorContext, employeeId, body = {}, auditDetails = {}) {
  const tenantId = actorContext.tenant_id;
  const employee = context.repository.getEmployee({ tenant_id: tenantId, employee_id: employeeId });
  if (!employee) throw safeHrxRuntimeError(404, "HRX_EMPLOYEE_NOT_FOUND", "Employee not found");
  const effectiveFrom =
    typeof body.effective_from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.effective_from)
      ? body.effective_from
      : null;
  if (!effectiveFrom) {
    throw safeHrxRuntimeError(400, "HRX_EMPLOYMENT_EFFECTIVE_DATE_REQUIRED", "effective_from must be an ISO date");
  }
  const profiles = context.repository.listEmploymentProfiles({ tenant_id: tenantId, employee_id: employeeId });
  const baseProfile = employmentProfileAsOf(profiles, effectiveFrom) ?? profiles
    .filter((profile) => profile.effective_from < effectiveFrom)
    .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
    .at(-1) ?? (profiles.length === 0
      ? {
          tenant_id: tenantId,
          employee_id: employeeId,
          profile_id: `hrx_profile_${randomUUID()}`,
          employment_type: body.employment_type ?? "full_time",
          status: body.status ?? "future",
          title: body.title ?? null,
          org_unit_id: body.org_unit_id ?? null,
          manager_employee_id: body.manager_employee_id ?? null,
          effective_from: effectiveFrom,
          effective_to: body.effective_to ?? null,
          source_ref: body.source_ref ?? "HRX:api:initial-employment-profile",
        }
      : null);
  if (!baseProfile) {
    throw safeHrxRuntimeError(404, "HRX_EMPLOYMENT_PROFILE_NOT_FOUND", "EmploymentProfile not found");
  }
  let plan;
  try {
    plan = planEmploymentProfileInsertion(profiles, {
      ...baseProfile,
      ...body,
      tenant_id: tenantId,
      employee_id: employeeId,
      profile_id:
        typeof body.profile_id === "string" && body.profile_id.trim()
          ? body.profile_id.trim()
          : `hrx_profile_${randomUUID()}`,
      status: body.status ?? baseProfile.status,
      employment_type: body.employment_type ?? baseProfile.employment_type,
      effective_from: effectiveFrom,
      effective_to: body.effective_to ?? null,
      source_ref: body.source_ref ?? "HRX:api:employment-profile-change",
    });
  } catch (error) {
    const message = String(error?.message ?? "");
    if (/overlap|effective_from already exists/i.test(message)) {
      throw safeHrxRuntimeError(409, "HRX_EMPLOYMENT_PERIOD_OVERLAP", message);
    }
    if (/terminated to active/i.test(message)) {
      throw safeHrxRuntimeError(409, "HRX_EMPLOYMENT_TERMINATED_REACTIVATION", message);
    }
    throw safeHrxRuntimeError(400, "HRX_EMPLOYMENT_PROFILE_INVALID", message || "EmploymentProfile is invalid");
  }
  const created = persistEmploymentProfilePlan(context.repository, plan);
  appendRuntimeAudit(context.audit, {
    ...actorContext,
    action: auditDetails.action ?? "hrx.employment_profile.create",
    object_type: "EmploymentProfile",
    object_id: created.profile_id,
    reason: auditDetails.reason ?? "employment_profile_change_scheduled",
    metadata: {
      employee_id: employee.employee_id,
      effective_from: created.effective_from,
      previous_profile_id: plan.previous_update?.profile_id ?? null,
      ...auditDetails.metadata,
    },
  });
  return created;
}

function updateHrxOrganizationAssignment(context, actorContext, employeeId, body = {}) {
  const tenantId = actorContext.tenant_id;
  const employee = context.repository.getEmployee({ tenant_id: tenantId, employee_id: employeeId });
  if (!employee) throw safeHrxRuntimeError(404, "HRX_EMPLOYEE_NOT_FOUND", "Employee not found");
  const effectiveFrom =
    typeof body.effective_from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.effective_from)
      ? body.effective_from
      : currentDateKey();
  const currentProfile = currentEmploymentProfile(context.repository, tenantId, employeeId, effectiveFrom);
  if (!currentProfile) throw safeHrxRuntimeError(404, "HRX_EMPLOYMENT_PROFILE_NOT_FOUND", "EmploymentProfile not found");
  const orgUnitId = normalizeOptionalId(body.org_unit_id);
  const managerEmployeeId = normalizeOptionalId(body.manager_employee_id);
  const patch = {};
  if (orgUnitId !== undefined) {
    if (orgUnitId && !HRX_ORG_UNIT_BY_ID.has(orgUnitId)) {
      throw safeHrxRuntimeError(400, "HRX_ORG_UNIT_NOT_FOUND", "org_unit_id must reference a canonical HRX org unit");
    }
    patch.org_unit_id = orgUnitId;
  }
  if (managerEmployeeId !== undefined) {
    if (managerEmployeeId && !context.repository.getEmployee({ tenant_id: tenantId, employee_id: managerEmployeeId })) {
      throw safeHrxRuntimeError(400, "HRX_ORG_MANAGER_NOT_FOUND", "manager_employee_id must reference an existing Employee");
    }
    assertReportingLineAcyclic(context.repository, tenantId, employeeId, managerEmployeeId, effectiveFrom);
    patch.manager_employee_id = managerEmployeeId;
  }
  if (Object.keys(patch).length === 0) {
    throw safeHrxRuntimeError(400, "HRX_ORG_ASSIGNMENT_EMPTY", "org_unit_id or manager_employee_id is required");
  }
  return scheduleEmploymentProfileChange(context, actorContext, employeeId, {
    ...patch,
    effective_from: effectiveFrom,
  }, {
    action: "hrx.organization.update",
    reason: "organization_reporting_line_change_scheduled",
    metadata: {
      employee_id: employee.employee_id,
      from_org_unit_id: currentProfile.org_unit_id ?? null,
      to_org_unit_id: patch.org_unit_id ?? currentProfile.org_unit_id ?? null,
      from_manager_employee_id: currentProfile.manager_employee_id ?? null,
      to_manager_employee_id: patch.manager_employee_id ?? currentProfile.manager_employee_id ?? null,
    },
  });
}

function actorRoleSet(actorContext = {}) {
  return new Set(
    String(actorContext.actor_role ?? "")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean),
  );
}

function actorHasElevatedHrxRead(actorContext = {}) {
  for (const role of actorRoleSet(actorContext)) {
    if (HRX_ELEVATED_READ_ROLES.has(role)) return true;
  }
  return false;
}

function employeeIdsForActor(repository, tenantId, actorId) {
  const links = repository.listEmployeeUserLinks({ tenant_id: tenantId, user_id: actorId });
  const resolution = resolveUniqueEmployeeUserLink({
    tenant_id: tenantId,
    user_id: actorId,
    links,
  });
  return resolution.state === "resolved"
    ? new Set([resolution.employee_id])
    : new Set();
}

function validPeopleEmployeeId(value) {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,160}$/.test(value);
}

function peopleAsOf(context) {
  const value = typeof context?.clock === "function" ? context.clock() : new Date().toISOString();
  const timestamp = value instanceof Date ? value.toISOString() : String(value);
  if (!Number.isFinite(Date.parse(timestamp))) {
    throw safeHrxRuntimeError(500, "PEOPLE_CLOCK_INVALID", "People runtime clock must return an ISO timestamp");
  }
  return timestamp;
}

function peopleMatterSource(matterContext, tenantId, permissionContext) {
  const repository = matterContext?.repository;
  if (!repository || typeof repository.list !== "function") {
    return Object.freeze({
      available: false,
      safe_error_code: "PEOPLE_MATTER_SOURCE_UNAVAILABLE",
      visible_matters: null,
      assignments: null,
      tasks: null,
      events: null,
    });
  }
  try {
    const candidates = repository
      .list({ tenant_id: tenantId, model_type: "Matter" })
      .filter((matter) => !["closed", "archived"].includes(matter.status))
      .map((matter) => ({ ...matter, resource_id: matter.matter_id }));
    const visibleMatters = trimItemsByPermission({
      context: permissionContext,
      items: candidates,
      action: "matter:read",
      resourceType: "Matter",
    }).allowed.map(({ resource_id: _resourceId, ...matter }) => Object.freeze(matter));
    return Object.freeze({
      available: true,
      safe_error_code: null,
      visible_matters: Object.freeze(visibleMatters),
      assignments: Object.freeze(repository.list({ tenant_id: tenantId, model_type: "MatterMember" })),
      tasks: Object.freeze(repository.list({ tenant_id: tenantId, model_type: "MatterTask" })),
      events: Object.freeze(repository.list({ tenant_id: tenantId, model_type: "MatterCalendarEvent" })),
    });
  } catch {
    return Object.freeze({
      available: false,
      safe_error_code: "PEOPLE_MATTER_SOURCE_READ_FAILED",
      visible_matters: null,
      assignments: null,
      tasks: null,
      events: null,
    });
  }
}

function peopleOutlookViewerRoles(actorContext = {}) {
  const roles = actorRoleSet(actorContext);
  const projected = new Set();
  for (const role of roles) {
    if (role === "manager" || role === "hr_manager") projected.add("manager");
    if (role === "people_ops") projected.add("people_ops");
    if (["admin", "lawos_admin", "security_admin", "hr_admin"].includes(role)) projected.add("admin");
  }
  return [...projected];
}

function peopleActorEmployeeId(context, actorContext) {
  return [...employeeIdsForActor(
    context.repository,
    actorContext.tenant_id,
    actorContext.actor_id,
  )].sort()[0] ?? null;
}

function peopleOutlookConnectionState(context, actorContext, employeeId) {
  const canManage = employeeIdsForActor(
    context.repository,
    actorContext.tenant_id,
    actorContext.actor_id,
  ).has(employeeId);
  return context.peopleOutlookConnections?.status({
    tenant_id: actorContext.tenant_id,
    employee_id: employeeId,
    can_manage: canManage,
  }) ?? Object.freeze({
    provider: "microsoft_graph",
    connection_state: "not_connected",
    can_manage: canManage,
    delegated_scope: "Calendars.ReadBasic",
    connected_at: null,
    expires_at: null,
    safe_error_code: null,
  });
}

function blockedPeopleOutlookSource(context, actorContext, employeeIds, safeErrorCode) {
  const emptyEventsByEmployeeId = Object.freeze(
    Object.fromEntries(employeeIds.map((employeeId) => [employeeId, Object.freeze([])])),
  );
  return Object.freeze({
    state: "blocked",
    events_by_employee_id: emptyEventsByEmployeeId,
    dedupe_events_by_employee_id: emptyEventsByEmployeeId,
    connection_state_by_employee_id: Object.freeze(Object.fromEntries(employeeIds.map((employeeId) => [
      employeeId,
      peopleOutlookConnectionState(context, actorContext, employeeId),
    ]))),
    last_success_at: null,
    stale_after: null,
    safe_error_code: safeErrorCode,
  });
}

function peopleOutlookSource(context, actorContext, employeeIds, asOf, timezone) {
  if (!context.peopleFeatureFlags.outlook_calendar) return null;
  if (!context.peopleOutlookCalendarSource || typeof context.peopleOutlookCalendarSource.read !== "function") {
    return blockedPeopleOutlookSource(
      context,
      actorContext,
      employeeIds,
      "OUTLOOK_CALENDAR_SOURCE_UNAVAILABLE",
    );
  }
  const blocked = (error) => blockedPeopleOutlookSource(
    context,
    actorContext,
    employeeIds,
    typeof error?.safe_error_code === "string"
      ? error.safe_error_code
      : "OUTLOOK_CALENDAR_SOURCE_UNAVAILABLE",
  );
  const project = (source) => {
    if (!source || !["ok", "stale", "blocked"].includes(source.state)) {
      return blockedPeopleOutlookSource(
        context,
        actorContext,
        employeeIds,
        "OUTLOOK_CALENDAR_SOURCE_INVALID",
      );
    }
    const viewerEmployeeId = peopleActorEmployeeId(context, actorContext);
    const viewerRoles = peopleOutlookViewerRoles(actorContext);
    const eventsByEmployeeId = {};
    const dedupeEventsByEmployeeId = {};
    for (const employeeId of employeeIds) {
      const rawEvents = Array.isArray(source.events_by_employee_id?.[employeeId])
        ? source.events_by_employee_id[employeeId]
        : [];
      const privacy = projectOutlookCalendarForViewer({
        events: rawEvents,
        viewer_employee_id: viewerEmployeeId,
        subject_employee_id: employeeId,
        viewer_roles: viewerRoles,
      });
      if (privacy.state !== "ok") {
        return blockedPeopleOutlookSource(
          context,
          actorContext,
          employeeIds,
          privacy.safe_error_code ?? "OUTLOOK_CALENDAR_PRIVACY_FAILED",
        );
      }
      eventsByEmployeeId[employeeId] = privacy.events;
      dedupeEventsByEmployeeId[employeeId] = Object.freeze(privacy.events.map((event, index) => Object.freeze({
        ...event,
        provider_event_id: rawEvents[index]?.provider_event_id ?? null,
        provider_series_id: rawEvents[index]?.provider_series_id ?? null,
        ical_uid: rawEvents[index]?.ical_uid ?? null,
      })));
    }
    const connectionStates = {};
    for (const employeeId of employeeIds) {
      connectionStates[employeeId] = source.connection_state_by_employee_id?.[employeeId]
        ?? peopleOutlookConnectionState(context, actorContext, employeeId);
    }
    return Object.freeze({
      state: source.state,
      events_by_employee_id: Object.freeze(eventsByEmployeeId),
      dedupe_events_by_employee_id: Object.freeze(dedupeEventsByEmployeeId),
      connection_state_by_employee_id: Object.freeze(connectionStates),
      last_success_at: typeof source.last_success_at === "string" ? source.last_success_at : null,
      stale_after: typeof source.stale_after === "string" ? source.stale_after : null,
      safe_error_code: typeof source.safe_error_code === "string" ? source.safe_error_code : null,
    });
  };
  try {
    const source = context.peopleOutlookCalendarSource.read({
      tenant_id: actorContext.tenant_id,
      employee_ids: Object.freeze([...employeeIds]),
      as_of: asOf,
      timezone,
    });
    return source && typeof source.then === "function"
      ? source.then(project, blocked)
      : project(source);
  } catch (error) {
    return blocked(error);
  }
}

function peopleOutlookSourceStatus(source) {
  if (!source) return [];
  return [{
    source: "outlook",
    state: source.state,
    last_success_at: source.last_success_at,
    stale_after: source.stale_after,
    safe_error_code: source.safe_error_code,
  }];
}

function emitPeopleFeatureTelemetry(context, actorContext, feature, outcome) {
  if (!context.peopleMetricsSink || typeof context.peopleMetricsSink.emit !== "function") return;
  try {
    const pending = recordPeopleFeatureTelemetry({
      sink: context.peopleMetricsSink,
      tenant_id: actorContext.tenant_id,
      feature,
      outcome,
    });
    if (pending && typeof pending.then === "function") pending.catch(() => {});
  } catch {
    // Telemetry is intentionally fail-open and must not alter the People response.
  }
}

function peopleFeatureEnvelopeOutcome(result) {
  const sourceStatus = Array.isArray(result?.source_status) ? result.source_status : [];
  if (sourceStatus.some(({ state }) => state === "blocked")) return "partial";
  if (sourceStatus.some(({ state }) => state === "stale")) return "stale";
  return result?.state === "partial" || result?.state === "stale" ? result.state : null;
}

function runPeopleFeatureRequest({
  context,
  actorContext,
  feature,
  operation,
}) {
  emitPeopleFeatureTelemetry(context, actorContext, feature, "request");
  const finish = (result) => {
    const outcome = peopleFeatureEnvelopeOutcome(result);
    if (outcome) {
      emitPeopleFeatureTelemetry(context, actorContext, feature, outcome);
    }
    return result;
  };
  const reject = (error) => {
    if (error?.status === 403) {
      emitPeopleFeatureTelemetry(context, actorContext, feature, "denied");
    }
    throw error;
  };
  try {
    const result = operation();
    return result && typeof result.then === "function"
      ? result.then(finish, reject)
      : finish(result);
  } catch (error) {
    return reject(error);
  }
}

function readPeopleDailyBrief({
  context,
  matterContext,
  actorContext,
  permissionContext,
  employeeId,
  resolvedOutlookSource,
}) {
  if (!context.peopleFeatureFlags.people_member_brief) {
    throw safeHrxRuntimeError(404, "PEOPLE_MEMBER_BRIEF_DISABLED", "People member brief is disabled");
  }
  if (!validPeopleEmployeeId(employeeId)) {
    throw safeHrxRuntimeError(400, "PEOPLE_MEMBER_ID_INVALID", "employeeId must be a safe identifier");
  }
  const employee = context.repository.getEmployee({
    tenant_id: actorContext.tenant_id,
    employee_id: employeeId,
  });
  if (!employee) {
    throw safeHrxRuntimeError(404, "PEOPLE_MEMBER_NOT_FOUND", "People member was not found");
  }
  if (
    !actorHasElevatedHrxRead(actorContext)
    && !employeeIdsForActor(context.repository, actorContext.tenant_id, actorContext.actor_id).has(employeeId)
  ) {
    throw safeHrxRuntimeError(403, "PEOPLE_MEMBER_READ_DENIED", "People member access is denied");
  }
  const guarded = employeeGuardResponse({ permissionContext, actorContext });
  if (guarded && guarded.status === 403) {
    throw safeHrxRuntimeError(403, "PEOPLE_MEMBER_READ_DENIED", "People member access is denied");
  }
  const asOf = peopleAsOf(context);
  const timezone = context.peopleTimezone;
  const links = context.repository.listEmployeeUserLinks({
    tenant_id: actorContext.tenant_id,
    employee_id: employeeId,
  });
  const identityResolution = resolveUniqueUserForEmployee({
    tenant_id: actorContext.tenant_id,
    employee_id: employeeId,
    links,
  });
  const identityState = identityResolution.state === "resolved"
    ? "resolved"
    : identityResolution.state === "unresolved_ambiguous"
      ? "ambiguous"
      : "missing";
  const taskUserId = identityResolution.state === "resolved" ? identityResolution.user_id : null;
  const matterSource = peopleMatterSource(matterContext, actorContext.tenant_id, permissionContext);
  const outlookSource = resolvedOutlookSource === undefined
    ? peopleOutlookSource(
      context,
      actorContext,
      [employeeId],
      asOf,
      timezone,
    )
    : resolvedOutlookSource;
  if (outlookSource && typeof outlookSource.then === "function") {
    return outlookSource.then((resolved) => readPeopleDailyBrief({
      context,
      matterContext,
      actorContext,
      permissionContext,
      employeeId,
      resolvedOutlookSource: resolved,
    }));
  }
  const sourceStatus = [
    {
      source: "hrx",
      state: "ok",
      last_success_at: asOf,
      stale_after: null,
      safe_error_code: null,
    },
    matterSource.available
      ? {
          source: "matter",
          state: "ok",
          last_success_at: asOf,
          stale_after: null,
          safe_error_code: null,
        }
      : {
          source: "matter",
          state: "blocked",
          last_success_at: null,
          stale_after: null,
          safe_error_code: matterSource.safe_error_code,
        },
    ...peopleOutlookSourceStatus(outlookSource),
    ...(identityState === "resolved"
      ? []
      : [{
          source: "identity_link",
          state: "blocked",
          last_success_at: null,
          stale_after: null,
          safe_error_code: "PEOPLE_IDENTITY_LINK_REQUIRED",
        }]),
  ];
  const rosterFields = employeeRosterReadFields(
    employee,
    currentEmploymentProfile(context.repository, actorContext.tenant_id, employeeId),
  );
  const member = {
    ...employee,
    display_name: publicEmployeeDisplayName(employee),
    title: rosterFields.title ?? null,
  };
  const outlookOnlyProjection = matterSource.available
    ? null
    : createPeopleDailyBriefProjection({
        tenant_id: actorContext.tenant_id,
        employee: member,
        user_id: taskUserId,
        as_of: asOf,
        timezone,
        visible_matters: [],
        assignments: [],
        tasks: [],
        events: [],
        identity_state: identityState,
        outlook_events: outlookSource?.events_by_employee_id?.[employeeId] ?? [],
        outlook_connection: outlookSource?.connection_state_by_employee_id?.[employeeId] ?? null,
      });
  const data = matterSource.available
    ? createPeopleDailyBriefProjection({
        tenant_id: actorContext.tenant_id,
        employee: member,
        user_id: taskUserId,
        as_of: asOf,
        timezone,
        visible_matters: matterSource.visible_matters,
        assignments: matterSource.assignments,
        tasks: matterSource.tasks,
        events: matterSource.events,
        identity_state: identityState,
        outlook_events: outlookSource?.dedupe_events_by_employee_id?.[employeeId]
          ?? outlookSource?.events_by_employee_id?.[employeeId]
          ?? [],
        outlook_connection: outlookSource?.connection_state_by_employee_id?.[employeeId] ?? null,
      })
    : Object.freeze({
        member: Object.freeze({
          employee_id: employee.employee_id,
          display_name: publicEmployeeDisplayName(employee),
          status: employee.status,
          title: rosterFields.title ?? null,
        }),
        date: null,
        tasks: null,
        hearings: null,
        outlook_intervals: outlookOnlyProjection.outlook_intervals,
        required_meetings: outlookOnlyProjection.required_meetings,
        outlook_connection: outlookOnlyProjection.outlook_connection,
        assigned_matters: null,
        task_source_state: identityState === "resolved" ? "source_unavailable" : "identity_link_required",
        confirmation_items: Object.freeze([
          {
            kind: "source_confirmation_required",
            source: "matter",
            safe_reason: matterSource.safe_error_code,
          },
          ...(identityState === "resolved"
            ? []
            : [{
                kind: "employee_user_link_confirmation_required",
                employee_id: employee.employee_id,
                safe_reason: identityState,
              }]),
        ]),
        permission_filter_applied_before_aggregation: true,
        existence_hidden: true,
        result_hash: null,
      });
  appendRuntimeAudit(context.audit, {
    ...actorContext,
    action: "hrx.people.member_daily_brief.read",
    object_type: "Employee",
    object_id: employeeId,
    reason: "people_member_daily_brief_read",
    metadata: {
      source_state: matterSource.available ? "ok" : "partial",
      outlook_source_state: outlookSource?.state ?? "disabled",
      identity_state: identityState,
      matter_permission_filter_applied: true,
    },
  });
  return createPeopleSourceEnvelope({
    as_of: asOf,
    timezone,
    source_status: sourceStatus,
    data,
  });
}

function readPeopleTeamOperations({
  context,
  matterContext,
  actorContext,
  permissionContext,
  resolvedOutlookSource,
}) {
  if (!context.peopleFeatureFlags.people_overview) {
    throw safeHrxRuntimeError(404, "PEOPLE_OVERVIEW_DISABLED", "People overview is disabled");
  }
  const guarded = employeeGuardResponse({ permissionContext, actorContext });
  if (guarded && guarded.status === 403) {
    throw safeHrxRuntimeError(403, "PEOPLE_TEAM_OPERATIONS_READ_DENIED", "People team operations access is denied");
  }
  const asOf = peopleAsOf(context);
  const timezone = context.peopleTimezone;
  const employees = employeeDirectoryRows(context.repository, actorContext.tenant_id)
    .filter((employee) => !["inactive", "terminated"].includes(employee.status));
  if (employees.length > PEOPLE_TEAM_OPERATIONS_MEMBER_LIMIT) {
    throw safeHrxRuntimeError(
      422,
      "PEOPLE_TEAM_SIZE_LIMIT_EXCEEDED",
      `People team operations supports at most ${PEOPLE_TEAM_OPERATIONS_MEMBER_LIMIT} active members`,
    );
  }
  const userIdByEmployeeId = {};
  const identityStateByEmployeeId = {};
  for (const employee of employees) {
    const links = context.repository.listEmployeeUserLinks({
      tenant_id: actorContext.tenant_id,
      employee_id: employee.employee_id,
    });
    const resolution = resolveUniqueUserForEmployee({
      tenant_id: actorContext.tenant_id,
      employee_id: employee.employee_id,
      links,
    });
    identityStateByEmployeeId[employee.employee_id] = resolution.state === "resolved"
      ? "resolved"
      : resolution.state === "unresolved_ambiguous"
        ? "ambiguous"
        : "missing";
    if (resolution.state === "resolved") {
      userIdByEmployeeId[employee.employee_id] = resolution.user_id;
    }
  }
  const matterSource = peopleMatterSource(matterContext, actorContext.tenant_id, permissionContext);
  const employeeIds = employees.map((employee) => employee.employee_id);
  const outlookSource = resolvedOutlookSource === undefined
    ? peopleOutlookSource(
      context,
      actorContext,
      employeeIds,
      asOf,
      timezone,
    )
    : resolvedOutlookSource;
  if (outlookSource && typeof outlookSource.then === "function") {
    return outlookSource.then((resolved) => readPeopleTeamOperations({
      context,
      matterContext,
      actorContext,
      permissionContext,
      resolvedOutlookSource: resolved,
    }));
  }
  const leaveSource = context.peopleFeatureFlags.leave_projection
    ? (() => {
        if (!context.leaveManagementStore) {
          return Object.freeze({
            state: "blocked",
            intervals: Object.freeze([]),
            safe_error_code: "PEOPLE_LEAVE_PROJECTION_UNAVAILABLE",
          });
        }
        try {
          return Object.freeze({
            state: "ok",
            intervals: readApprovedLeaveIntervals({
              store: context.leaveManagementStore,
              tenant_id: actorContext.tenant_id,
              employee_ids: employeeIds,
              view: "team",
            }),
            safe_error_code: null,
          });
        } catch {
          return Object.freeze({
            state: "blocked",
            intervals: Object.freeze([]),
            safe_error_code: "PEOPLE_LEAVE_PROJECTION_INVALID",
          });
        }
      })()
    : Object.freeze({
        state: "disabled",
        intervals: Object.freeze([]),
        safe_error_code: null,
      });
  const capacityScheduleDaysByEmployeeId = {};
  if (context.peopleFeatureFlags.people_capacity && context.leaveManagementStore) {
    const scheduleResolver = createSqlWorkScheduleResolver({
      store: context.leaveManagementStore,
    });
    const date = peopleLocalDateKey(asOf, timezone);
    for (const employee of employees) {
      try {
        capacityScheduleDaysByEmployeeId[employee.employee_id] = scheduleResolver.readDays({
          tenant_id: actorContext.tenant_id,
          employee_id: employee.employee_id,
          organization_ids: employee.org_unit_id ? [employee.org_unit_id] : [],
          start_date: date,
          end_date: date,
        });
      } catch {
        capacityScheduleDaysByEmployeeId[employee.employee_id] = Object.freeze([]);
      }
    }
  }
  const sourceStatus = [
    {
      source: "hrx",
      state: "ok",
      last_success_at: asOf,
      stale_after: null,
      safe_error_code: null,
    },
    ...(Object.values(identityStateByEmployeeId).every((state) => state === "resolved")
      ? []
      : [{
          source: "identity_link",
          state: "blocked",
          last_success_at: null,
          stale_after: null,
          safe_error_code: "PEOPLE_IDENTITY_LINK_REQUIRED",
        }]),
    matterSource.available
      ? {
          source: "matter",
          state: "ok",
          last_success_at: asOf,
          stale_after: null,
          safe_error_code: null,
        }
      : {
          source: "matter",
          state: "blocked",
          last_success_at: null,
          stale_after: null,
          safe_error_code: matterSource.safe_error_code,
        },
    ...peopleOutlookSourceStatus(outlookSource),
    ...(leaveSource.state === "disabled"
      ? []
      : [{
          source: "leave",
          state: leaveSource.state,
          last_success_at: leaveSource.state === "ok" ? asOf : null,
          stale_after: null,
          safe_error_code: leaveSource.safe_error_code,
        }]),
  ];
  const data = matterSource.available
    ? createPeopleTeamOperationsProjection({
        tenant_id: actorContext.tenant_id,
        employees,
        user_id_by_employee_id: userIdByEmployeeId,
        identity_state_by_employee_id: identityStateByEmployeeId,
        as_of: asOf,
        timezone,
        visible_matters: matterSource.visible_matters,
        assignments: matterSource.assignments,
        tasks: matterSource.tasks,
        events: matterSource.events,
        time_entries: context.matterTimeEntries ?? [],
        approved_leave_intervals: leaveSource.intervals,
        capacity_enabled: context.peopleFeatureFlags.people_capacity,
        capacity_schedule_days_by_employee_id: capacityScheduleDaysByEmployeeId,
        capacity_source_state: leaveSource.state === "ok" ? "ok" : "leave_required",
        outlook_events_by_employee_id: outlookSource?.dedupe_events_by_employee_id
          ?? outlookSource?.events_by_employee_id
          ?? {},
        outlook_connection_state_by_employee_id: outlookSource?.connection_state_by_employee_id ?? {},
      })
    : Object.freeze({
        team_members: Object.freeze(employees.map((employee) => Object.freeze({
          member: Object.freeze({
            employee_id: employee.employee_id,
            display_name: employee.display_name,
            status: employee.status,
            title: employee.title ?? null,
          }),
          today_intervals: null,
          time_unspecified_tasks: null,
          assigned_matter_count: null,
          today_task_count: null,
          today_hearing_count: null,
          outlook_connection: outlookSource?.connection_state_by_employee_id?.[employee.employee_id] ?? null,
          confirmation_items: Object.freeze([{
            kind: "source_confirmation_required",
            source: "matter",
            safe_reason: matterSource.safe_error_code,
          }]),
        }))),
        member_count: employees.length,
        action_queues: null,
        workload_stage1: null,
        attention_window: null,
        deadline_staffing: null,
        response_bounds: Object.freeze({
          member_limit: PEOPLE_TEAM_OPERATIONS_MEMBER_LIMIT,
          truncated: false,
          pagination: false,
        }),
        permission_filter_applied_before_aggregation: true,
        existence_hidden: true,
        result_hash: null,
      });
  appendRuntimeAudit(context.audit, {
    ...actorContext,
    action: "hrx.people.team_operations.read",
    object_type: "PeopleTeamOperations",
    object_id: "team-operations",
    reason: "people_team_operations_read",
    metadata: {
      source_state: matterSource.available ? "ok" : "partial",
      outlook_source_state: outlookSource?.state ?? "disabled",
      leave_source_state: leaveSource.state,
      member_limit: PEOPLE_TEAM_OPERATIONS_MEMBER_LIMIT,
      matter_permission_filter_applied: true,
    },
  });
  return createPeopleSourceEnvelope({
    as_of: asOf,
    timezone,
    source_status: sourceStatus,
    data,
  });
}

function requireSingleEmployeeForActor(context, actorContext) {
  const employeeIds = [...employeeIdsForActor(context.repository, actorContext.tenant_id, actorContext.actor_id)];
  const active = employeeIds.filter((employeeId) => context.repository.getEmployee({
    tenant_id: actorContext.tenant_id,
    employee_id: employeeId,
  })?.status === "active");
  if (active.length === 0) {
    throw safeHrxRuntimeError(403, "HRX_SELF_SERVICE_EMPLOYEE_REQUIRED", "Signed actor has no active EmployeeUserLink");
  }
  if (active.length !== 1) {
    throw safeHrxRuntimeError(409, "HRX_SELF_SERVICE_EMPLOYEE_AMBIGUOUS", "Signed actor has multiple active EmployeeUserLinks");
  }
  return active[0];
}

function applicantActorIds(context, tenantId, employeeId) {
  return [
    employeeId,
    ...context.repository
      .listEmployeeUserLinks({ tenant_id: tenantId, employee_id: employeeId })
      .map((link) => link.user_id),
  ];
}

function leaveRequestProposals(store, tenantId, requestId) {
  return store
    .query("select", { table: "hrx_leave_reschedule_proposals", where: { tenant_id: tenantId, request_id: requestId } })
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function leaveRequestAttachments(context, request) {
  return context.leaveManagementStore
    .query("select", {
      table: "hrx_leave_request_attachments",
      where: { tenant_id: request.tenant_id, request_id: request.request_id },
    })
    .map((attachment) => {
      const document = context.leaveManagementStore.query("selectOne", {
        table: "hrx_documents",
        where: { tenant_id: request.tenant_id, document_id: attachment.document_id },
      });
      return Object.freeze({
        attachment_id: attachment.attachment_id,
        document_id: attachment.document_id,
        document_type: document?.document_type ?? null,
        title: document?.title ?? "증빙 문서",
        access_level: attachment.access_level,
        verification_state: attachment.verification_state,
      });
    });
}

function leaveRequestView(context, request) {
  const type = context.leaveManagementStore.query("selectOne", {
    table: "hrx_leave_types",
    where: { tenant_id: request.tenant_id, leave_type_id: request.leave_type_id },
  });
  const policy = context.leaveManagementStore.query("selectOne", {
    table: "hrx_leave_policy_versions",
    where: { tenant_id: request.tenant_id, policy_version_id: request.policy_version_id },
  });
  const employee = context.repository.getEmployee({ tenant_id: request.tenant_id, employee_id: request.employee_id });
  return Object.freeze({
    ...clone(request),
    employee_display_name: employee ? publicEmployeeDisplayName(employee) : null,
    leave_type_display_name: type?.display_name ?? request.leave_type,
    leave_type_code: type?.code ?? null,
    group_id: type?.group_id ?? policy?.group_id ?? null,
    statutory_annual: type?.code === "ANNUAL",
    reschedule_proposals: leaveRequestProposals(context.leaveManagementStore, request.tenant_id, request.request_id),
    attachments: leaveRequestAttachments(context, request),
  });
}

const HR_LEAVE_REQUEST_READ_SCOPES = Object.freeze([
  "hrx.leave.policy.read",
  "hrx.leave.policy.write",
  "hrx.leave.accrual.execute",
  "hrx.leave.ledger.adjust",
  "hrx.leave.promotion.manage",
  "hrx.leave.report.export",
  "hrx.leave.termination.settle",
]);

function leaveRequestAccessLevel(context, actorContext, request) {
  if (!request) return null;
  if (employeeIdsForActor(context.repository, actorContext.tenant_id, actorContext.actor_id).has(request.employee_id)) return "self";
  if (HR_LEAVE_REQUEST_READ_SCOPES.some((scope) => actorContext.hrx_scopes.includes(scope))) return "hr";
  if (assignedLeaveApprovalQueue(context, actorContext).some((approval) => approval.object_id === request.request_id)) return "assigned_approver";
  return null;
}

function hiddenLeaveResourceResponse() {
  return response(404, {
    outcome: "not_found",
    safe_error_code: "HRX_LEAVE_RESOURCE_NOT_FOUND",
    count_leak_prevented: true,
    fail_closed: true,
  });
}

function leaveAttachmentDownloadAuthorization(context, actorContext, requestId, attachmentId) {
  const request = context.leaveManagementStore.query("selectOne", {
    table: "hrx_leave_requests",
    where: { tenant_id: actorContext.tenant_id, request_id: requestId },
  });
  const accessLevel = leaveRequestAccessLevel(context, actorContext, request);
  if (!accessLevel) return null;
  const attachment = context.leaveManagementStore.query("selectOne", {
    table: "hrx_leave_request_attachments",
    where: { tenant_id: actorContext.tenant_id, request_id: requestId, attachment_id: attachmentId },
  });
  if (!attachment) return null;
  const document = context.documents.get({ tenant_id: actorContext.tenant_id, document_id: attachment.document_id });
  if (!document || document.employee_id !== request.employee_id) return null;
  return Object.freeze({
    request_id: requestId,
    attachment_id: attachment.attachment_id,
    document_id: attachment.document_id,
    document_type: document.document_type,
    title: document.title ?? "증빙 문서",
    verification_state: attachment.verification_state,
    access_level: accessLevel,
    download_authorized: true,
    document_body_included: false,
    source_reference_included: false,
  });
}

function leaveApprovalQueueMetrics(context, request) {
  const store = context.leaveManagementStore;
  const view = leaveRequestView(context, request);
  const profile = currentEmploymentProfile(context.repository, request.tenant_id, request.employee_id);
  const teamEmployeeIds = new Set(
    context.repository
      .listEmploymentProfiles({ tenant_id: request.tenant_id })
      .filter((candidate) => candidate.status !== "terminated" && candidate.org_unit_id === profile?.org_unit_id)
      .map((candidate) => candidate.employee_id),
  );
  const simultaneousAbsenceCount = store
    .query("select", { table: "hrx_leave_requests", where: { tenant_id: request.tenant_id } })
    .filter((candidate) =>
      candidate.request_id !== request.request_id &&
      teamEmployeeIds.has(candidate.employee_id) &&
      ["submitted", "approved", "reschedule_pending"].includes(candidate.state) &&
      candidate.start_date <= request.end_date &&
      candidate.end_date >= request.start_date)
    .length;
  const balance = view.group_id
    ? createSqlLeaveBalanceLedger({ store }).balance({
        tenant_id: request.tenant_id,
        employee_id: request.employee_id,
        group_id: view.group_id,
      })
    : null;
  return Object.freeze({
    ...view,
    current_balance: balance,
    team_simultaneous_absence_count: simultaneousAbsenceCount,
  });
}

function registeredActorSummary(actorId) {
  const account = REGISTERED_ACCOUNTS.find((candidate) => candidate.user_id === actorId);
  return account
    ? Object.freeze({ actor_id: account.user_id, display_name: account.display_name, source_title: account.source_title ?? null })
    : Object.freeze({ actor_id: actorId, display_name: "등록 계정", source_title: null });
}

function leaveDelegationCandidates(actorContext) {
  return Object.freeze(
    REGISTERED_ACCOUNTS
      .filter((account) =>
        account.status === "active" &&
        account.user_id !== actorContext.actor_id &&
        account.tenant_ids.includes(actorContext.tenant_id))
      .map((account) => ({ account, assignment: resolveLawosUserRoleAssignment(account, { tenantId: actorContext.tenant_id }) }))
      .filter(({ assignment }) => assignment?.hrx_scopes?.includes("hrx.leave.approve"))
      .map(({ account }) => registeredActorSummary(account.user_id))
      .sort((left, right) => KOREAN_DISPLAY_NAME_COLLATOR.compare(left.display_name, right.display_name)),
  );
}

function leaveAdjustmentApprovers(actorContext) {
  return Object.freeze(
    REGISTERED_ACCOUNTS
      .filter((account) => account.status === "active" && account.user_id !== actorContext.actor_id && account.tenant_ids.includes(actorContext.tenant_id))
      .map((account) => ({ account, assignment: resolveLawosUserRoleAssignment(account, { tenantId: actorContext.tenant_id }) }))
      .filter(({ assignment }) => assignment?.hrx_scopes?.includes("hrx.leave.ledger.adjust"))
      .map(({ account }) => registeredActorSummary(account.user_id))
      .sort((left, right) => KOREAN_DISPLAY_NAME_COLLATOR.compare(left.display_name, right.display_name)),
  );
}

function leaveTerminationApprovers(actorContext) {
  return Object.freeze(
    REGISTERED_ACCOUNTS
      .filter((account) => account.status === "active" && account.user_id !== actorContext.actor_id && account.tenant_ids.includes(actorContext.tenant_id))
      .map((account) => ({ account, assignment: resolveLawosUserRoleAssignment(account, { tenantId: actorContext.tenant_id }) }))
      .filter(({ assignment }) => assignment?.hrx_scopes?.includes("hrx.leave.termination.settle"))
      .map(({ account }) => registeredActorSummary(account.user_id))
      .sort((left, right) => KOREAN_DISPLAY_NAME_COLLATOR.compare(left.display_name, right.display_name)),
  );
}

function leaveReportAuthorizedEmployeeIds(context, actorContext) {
  const tenantId = actorContext.tenant_id;
  const selfEmployeeIds = employeeIdsForActor(context.repository, tenantId, actorContext.actor_id);
  const profiles = context.repository.listEmploymentProfiles({ tenant_id: tenantId }).filter((profile) => profile.status !== "terminated");
  const authorized = new Set(selfEmployeeIds);
  const account = REGISTERED_ACCOUNTS.find((candidate) => candidate.user_id === actorContext.actor_id);
  const assignment = account ? resolveLawosUserRoleAssignment(account, { tenantId }) : null;
  const roleIds = new Set(assignment?.role_ids ?? []);
  const groupIds = new Set(assignment?.group_ids ?? []);
  const tenantWideApproved = roleIds.has("lawos_admin") || roleIds.has("security_admin") || groupIds.has("group_lawos_admins");
  if (tenantWideApproved) {
    for (const profile of profiles) authorized.add(profile.employee_id);
    return Object.freeze([...authorized]);
  }
  if (actorContext.hrx_scopes.includes("hrx.leave.report.export") || actorContext.hrx_scopes.includes("hrx.leave.termination.settle") || actorContext.hrx_scopes.includes("hrx.leave.promotion.manage")) {
    const approvedOrgUnits = new Set(profiles.filter((profile) => selfEmployeeIds.has(profile.employee_id)).map((profile) => profile.org_unit_id).filter(Boolean));
    for (const profile of profiles) if (approvedOrgUnits.has(profile.org_unit_id)) authorized.add(profile.employee_id);
  }
  if (actorContext.hrx_scopes.includes("hrx.leave.team.read")) {
    for (const profile of profiles) if (selfEmployeeIds.has(profile.manager_employee_id)) authorized.add(profile.employee_id);
  }
  return Object.freeze([...authorized]);
}

function leaveEntitlementAuthorizedEmployeeIds(context, actorContext) {
  const tenantId = actorContext.tenant_id;
  const selfEmployeeIds = employeeIdsForActor(context.repository, tenantId, actorContext.actor_id);
  const authorized = new Set(selfEmployeeIds);
  const adminScopes = [
    "hrx.leave.policy.read",
    "hrx.leave.policy.write",
    "hrx.leave.accrual.execute",
    "hrx.leave.ledger.adjust",
    "hrx.leave.report.export",
  ];
  if (adminScopes.some((scope) => actorContext.hrx_scopes.includes(scope))) {
    for (const entitlement of context.leaveManagementStore.query("select", {
      table: "hrx_leave_entitlements",
      where: { tenant_id: tenantId },
    })) {
      authorized.add(entitlement.employee_id);
    }
    return Object.freeze([...authorized]);
  }
  if (actorContext.hrx_scopes.includes("hrx.leave.team.read")) {
    for (const profile of context.repository.listEmploymentProfiles({ tenant_id: tenantId })) {
      if (profile.status !== "terminated" && selfEmployeeIds.has(profile.manager_employee_id)) authorized.add(profile.employee_id);
    }
  }
  return Object.freeze([...authorized]);
}

function leaveEntitlementApiView(context, tenantId, row) {
  const employee = context.repository.getEmployee({
    tenant_id: tenantId,
    employee_id: row.employee_id,
  });
  return Object.freeze({
    ...row,
    employee_display_name: employee ? publicEmployeeDisplayName(employee) : null,
  });
}

function leaveDelegationView(row) {
  return Object.freeze({
    ...clone(row),
    delegator: registeredActorSummary(row.delegator_actor_id),
    delegate: registeredActorSummary(row.delegate_actor_id),
  });
}

function leaveSelfSnapshot(context, tenantId, employeeId) {
  const store = context.leaveManagementStore;
  const requests = store
    .query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId, employee_id: employeeId } })
    .filter((request) => Number.isInteger(request.requested_minutes))
    .sort((left, right) => right.submitted_at.localeCompare(left.submitted_at))
    .map((request) => leaveRequestView(context, request));
  const groups = store.query("select", { table: "hrx_leave_groups", where: { tenant_id: tenantId, status: "active" } });
  const balances = groups.map((group) => {
    const entitlements = store
      .query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId, employee_id: employeeId, group_id: group.group_id } })
      .filter((entitlement) => !entitlement.expires_on || entitlement.expires_on >= new Date().toISOString().slice(0, 10));
    return {
      group,
      balance: createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: tenantId, employee_id: employeeId, group_id: group.group_id }),
      earliest_expiry: entitlements.map((entitlement) => entitlement.expires_on).filter(Boolean).sort()[0] ?? null,
    };
  });
  return Object.freeze({ employee_id: employeeId, balances: Object.freeze(balances), requests: Object.freeze(requests) });
}

function leaveTeamSnapshot(context, actorContext, { from, to }) {
  const managerEmployeeIds = employeeIdsForActor(context.repository, actorContext.tenant_id, actorContext.actor_id);
  const profiles = context.repository.listEmploymentProfiles({ tenant_id: actorContext.tenant_id });
  const directReportIds = new Set(
    profiles
      .filter((profile) => profile.status !== "terminated" && managerEmployeeIds.has(profile.manager_employee_id))
      .map((profile) => profile.employee_id),
  );
  const groups = context.leaveManagementStore.query("select", {
    table: "hrx_leave_groups",
    where: { tenant_id: actorContext.tenant_id, status: "active" },
  });
  const employees = [...directReportIds]
    .map((employeeId) => context.repository.getEmployee({ tenant_id: actorContext.tenant_id, employee_id: employeeId }))
    .filter(Boolean)
    .map((employee) => ({
      employee_id: employee.employee_id,
      display_name: publicEmployeeDisplayName(employee),
      balances: groups.map((group) => ({
        group_id: group.group_id,
        display_name: group.display_name,
        ...createSqlLeaveBalanceLedger({ store: context.leaveManagementStore }).balance({
          tenant_id: actorContext.tenant_id,
          employee_id: employee.employee_id,
          group_id: group.group_id,
        }),
      })),
    }))
    .sort((left, right) => KOREAN_DISPLAY_NAME_COLLATOR.compare(left.display_name, right.display_name));
  const employeeById = new Map(employees.map((employee) => [employee.employee_id, employee]));
  const absences = context.leaveManagementStore
    .query("select", { table: "hrx_leave_requests", where: { tenant_id: actorContext.tenant_id, state: "approved" } })
    .filter((request) => directReportIds.has(request.employee_id) && request.start_date <= to && request.end_date >= from)
    .map((request) => ({
      employee_id: request.employee_id,
      employee_display_name: employeeById.get(request.employee_id)?.display_name ?? "구성원",
      start_date: request.start_date,
      end_date: request.end_date,
    }))
    .sort((left, right) => left.start_date.localeCompare(right.start_date) || KOREAN_DISPLAY_NAME_COLLATOR.compare(left.employee_display_name, right.employee_display_name));
  return Object.freeze({
    range: Object.freeze({ from, to }),
    employees: Object.freeze(employees),
    absences: Object.freeze(absences),
    today_absence_count: absences.filter((absence) => absence.start_date <= from && absence.end_date >= from).length,
    pending_approval_count: assignedLeaveApprovalQueue(context, actorContext).length,
    privacy_boundary: "team_calendar_excludes_leave_type_reason_and_attachments",
  });
}

function assignedLeaveApprovalQueue(context, actorContext) {
  const store = context.leaveManagementStore;
  const now = new Date().toISOString();
  return store
    .query("select", { table: "hrx_approval_requests", where: { tenant_id: actorContext.tenant_id } })
    .filter((approval) => approval.object_type === "LeaveRequest" && approval.state === "pending")
    .map((approval) => {
      const step = store.query("selectOne", {
        table: "hrx_approval_steps",
        where: { tenant_id: actorContext.tenant_id, approval_id: approval.approval_id, step_order: approval.current_step },
      });
      const assignment = step && store.query("selectOne", {
        table: "hrx_approval_assignments",
        where: { tenant_id: actorContext.tenant_id, approval_step_id: step.approval_step_id },
      });
      const delegated = assignment && store.query("select", {
        table: "hrx_approval_delegations",
        where: {
          tenant_id: actorContext.tenant_id,
          delegator_actor_id: assignment.approver_actor_id,
          delegate_actor_id: actorContext.actor_id,
        },
      }).some((row) =>
        row.object_type === "LeaveRequest" &&
        !row.revoked_at &&
        !row.expired_at &&
        row.valid_from <= now &&
        row.valid_to >= now &&
        (!row.organization_scope_id || row.organization_scope_id === assignment.organization_scope_id));
      const escalation = step && store.query("select", {
        table: "hrx_approval_escalations",
        where: {
          tenant_id: actorContext.tenant_id,
          approval_step_id: step.approval_step_id,
          substitute_actor_id: actorContext.actor_id,
        },
      }).find((row) => row.state === "active" && !row.resolved_at && row.due_at <= now);
      const assignmentActive = assignment && assignment.valid_from <= now && (!assignment.valid_to || assignment.valid_to >= now);
      const assigned = assignmentActive && (assignment.approver_actor_id === actorContext.actor_id || delegated);
      if (!assignment || (!assigned && !escalation)) return null;
      const request = store.query("selectOne", {
        table: "hrx_leave_requests",
        where: { tenant_id: actorContext.tenant_id, request_id: approval.object_id },
      });
      if (!request) return null;
      return Object.freeze({
        ...clone(approval),
        step: clone(step),
        assignment: clone(assignment),
        delegated: Boolean(delegated),
        escalated: Boolean(escalation),
        escalation: escalation ? clone(escalation) : null,
        leave_request: leaveApprovalQueueMetrics(context, request),
      });
    })
    .filter(Boolean)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function selfServiceReadGuard({ repository, actorContext, targetEmployeeId, emptyBody = {} }) {
  if (actorHasElevatedHrxRead(actorContext)) return null;
  const employeeIds = employeeIdsForActor(repository, actorContext.tenant_id, actorContext.actor_id);
  const normalizedTarget = typeof targetEmployeeId === "string" ? targetEmployeeId.trim() : "";
  if (normalizedTarget && employeeIds.has(normalizedTarget)) return null;
  return response(403, {
    outcome: "blocked",
    safe_error_code: normalizedTarget ? "HRX_SELF_SERVICE_SCOPE_DENIED" : "HRX_SELF_SERVICE_EMPLOYEE_REQUIRED",
    reason: normalizedTarget ? "hrx_self_service_target_not_owned" : "hrx_self_service_employee_id_required",
    count_leak_prevented: true,
    fail_closed: true,
    ...emptyBody,
    permission_summary: {
      actor_id: actorContext.actor_id,
      employee_ids: [...employeeIds],
      elevated_hrx_read: false,
    },
  });
}

function selfServiceWriteGuard({ repository, actorContext, targetEmployeeId, emptyBody = {} }) {
  const employeeIds = employeeIdsForActor(repository, actorContext.tenant_id, actorContext.actor_id);
  const actorEmployeeId = employeeIds.size === 1 ? [...employeeIds][0] : null;
  const actorEmployee = actorEmployeeId
    ? repository.getEmployee({
        tenant_id: actorContext.tenant_id,
        employee_id: actorEmployeeId,
      })
    : null;
  const normalizedTarget = typeof targetEmployeeId === "string" ? targetEmployeeId.trim() : "";
  if (actorEmployee && normalizedTarget === actorEmployeeId) return null;
  return response(403, {
    outcome: "blocked",
    safe_error_code: normalizedTarget ? "HRX_SELF_SERVICE_SCOPE_DENIED" : "HRX_SELF_SERVICE_EMPLOYEE_REQUIRED",
    reason: normalizedTarget ? "hrx_self_service_target_not_owned" : "hrx_self_service_employee_id_required",
    count_leak_prevented: true,
    fail_closed: true,
    ...emptyBody,
    permission_summary: {
      actor_id: actorContext.actor_id,
      self_employee_id: actorEmployee ? actorEmployeeId : null,
      elevated_read_does_not_grant_proxy_write: true,
    },
  });
}

function attendanceCorrectionActorOwnsEmployee(repository, actorContext, employeeId) {
  return employeeIdsForActor(
    repository,
    actorContext.tenant_id,
    actorContext.actor_id,
  ).has(employeeId);
}

function attendanceCorrectionReviewerAllowed(context, actorContext, employeeId, asOf) {
  if (actorHasElevatedHrxRead(actorContext)) return true;
  const actorEmployeeIds = employeeIdsForActor(
    context.repository,
    actorContext.tenant_id,
    actorContext.actor_id,
  );
  const profile = employmentProfileAsOf(
    context.repository.listEmploymentProfiles({
      tenant_id: actorContext.tenant_id,
      employee_id: employeeId,
    }),
    asOf.slice(0, 10),
  );
  return Boolean(profile?.manager_employee_id && actorEmployeeIds.has(profile.manager_employee_id));
}

function overtimeReadGuard({ context, actorContext, targetEmployeeId, emptyBody = {} }) {
  if (actorHasElevatedHrxRead(actorContext)) return null;
  const employeeId = typeof targetEmployeeId === "string" ? targetEmployeeId.trim() : "";
  const owned = employeeId
    && attendanceCorrectionActorOwnsEmployee(context.repository, actorContext, employeeId);
  const assignedManager = employeeId
    && attendanceCorrectionReviewerAllowed(context, actorContext, employeeId, peopleAsOf(context));
  if (owned || assignedManager) return null;
  return response(403, {
    outcome: "blocked",
    safe_error_code: employeeId ? "HRX_OVERTIME_SCOPE_DENIED" : "HRX_OVERTIME_EMPLOYEE_REQUIRED",
    reason: employeeId ? "hrx_overtime_target_not_owned_or_managed" : "hrx_overtime_employee_id_required",
    count_leak_prevented: true,
    fail_closed: true,
    ...emptyBody,
  });
}

function projectLifecycleEmployeeName(context, actorContext, item) {
  const employeeDisplayName = actorContext.hrx_scopes.includes("hrx.employee.read")
    ? (() => {
        const employee = context.repository.getEmployee({
          tenant_id: actorContext.tenant_id,
          employee_id: item.employee_id,
        });
        return employee ? publicEmployeeDisplayName(employee) : null;
      })()
    : null;
  return Object.freeze({
    ...clone(item),
    employee_display_name: employeeDisplayName,
  });
}

function latestMaskedCompensationRef(compensation, tenantId, employeeId) {
  const latest = compensation.latest({ tenant_id: tenantId, employee_id: employeeId });
  return latest ? maskCompensationRef(latest.encrypted_amount_ref) : null;
}

function createAttendanceMonthlySummary(records = [], { month = null } = {}) {
  const effectiveRecords = resolveEffectiveAttendanceRecords(records);
  const byStatus = Object.fromEntries(HRX_ATTENDANCE_STATUSES.map((status) => [status, 0]));
  let totalRecordedHours = 0;
  for (const record of effectiveRecords) {
    byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
    if (typeof record.recorded_hours === "number") totalRecordedHours += record.recorded_hours;
  }
  return Object.freeze({
    month,
    record_count: records.length,
    effective_record_count: effectiveRecords.length,
    correction_count: records.filter((record) => record.correction_of_attendance_id).length,
    total_recorded_hours: Number(totalRecordedHours.toFixed(2)),
    by_status: Object.freeze(byStatus),
  });
}

function runHrxDailyRiskScan(context, actorContext, input = {}) {
  const tenantId = actorContext.tenant_id;
  const asOf = input.as_of ?? currentDateKey();
  const month = input.month ?? String(asOf).slice(0, 7);
  const scan = createHrxRiskDailyScan({
    tenant_id: tenantId,
    as_of: asOf,
    employees: context.repository.listEmployees({ tenant_id: tenantId }),
    employment_profiles: context.repository.listEmploymentProfiles({ tenant_id: tenantId }),
    documents: context.documents.list({ tenant_id: tenantId }),
    leave_balance_entries: context.leaveLedger.list({ tenant_id: tenantId, policy_id: input.leave_policy_id ?? "pto-us" }),
    statutory_trainings: context.statutoryTrainings.filter((training) => training.tenant_id === tenantId),
    attendance_records: context.attendance.list({ tenant_id: tenantId, month }),
    overtime_requests: context.overtime.list({ tenant_id: tenantId, month }),
    offboarding_cases: context.offboardingCases.filter((item) => item.tenant_id === tenantId),
    leave_policy_id: input.leave_policy_id ?? "pto-us",
  });
  const riskEvents = context.riskEvents.upsertMany(scan.risk_events);
  const currentEvents = context.riskEvents.list({ tenant_id: tenantId });
  appendRuntimeAudit(context.audit, {
    ...actorContext,
    action: "hrx.risk.scan",
    object_type: "HRXRiskEvent",
    object_id: scan.scan_ref,
    reason: "hrx_daily_legal_risk_scan_completed",
    metadata: {
      as_of: scan.as_of,
      event_count: riskEvents.length,
      legal_type_count: scan.dashboard.legal_type_count,
    },
  });
  return Object.freeze({
    ...scan,
    risk_events: riskEvents,
    dashboard: createHrxRiskDashboard(currentEvents),
  });
}

function seedEmployeeId(tenantId, index) {
  const employees = seedEmployees(tenantId);
  return employees[index]?.employee_id ?? employees[0]?.employee_id ?? `emp-${String(index + 1).padStart(3, "0")}`;
}

function resolveSeedTenantIds({ tenant_id, tenant_ids } = {}) {
  const values = Array.isArray(tenant_ids) && tenant_ids.length > 0
    ? tenant_ids
    : tenant_id
      ? [tenant_id]
      : HRX_DEFAULT_SEED_TENANT_IDS;
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function documentSeed(tenantId) {
  const contractCoverage = seedEmployees(tenantId).slice(2).map((employee, index) => ({
    tenant_id: tenantId,
    document_id: `doc-contract-${String(index + 4).padStart(3, "0")}`,
    employee_id: employee.employee_id,
    document_type: "employment_contract",
    source_ref: `DMS:employment-contract-${employee.employee_id}`,
    source_provider: "dms",
    source_status: "verified",
    source_verified_at: "2026-06-20T00:00:00.000Z",
    source_version_ref: `DMS:employment-contract-${employee.employee_id}:v1`,
    source_metadata: { provider_document_id: `employment-contract-${employee.employee_id}`, etag_present: true },
    title: "근로계약서",
    contract_id: `contract-${employee.employee_id}`,
    profile_id: `profile:${employee.employee_id}`,
    contract_state: "signed",
    document_ref: `DMS:employment-contract-${employee.employee_id}`,
    signature_ref: `DMS:employment-contract-${employee.employee_id}:signed`,
    signed_at: "2026-06-20T00:00:00.000Z",
    expires_on: "2027-06-20",
  }));
  return [
    {
      tenant_id: tenantId,
      document_id: "doc-001",
      employee_id: seedEmployeeId(tenantId, 0),
      document_type: "policy_ack",
      source_ref: "DMS:hr-policy-ack-001",
      source_provider: "dms",
      source_status: "verified",
      source_verified_at: "2026-06-20T00:00:00.000Z",
      source_version_ref: "DMS:hr-policy-ack-001:v1",
      source_metadata: { provider_document_id: "hr-policy-ack-001", etag_present: true },
      title: "Policy acknowledgement",
    },
    {
      tenant_id: tenantId,
      document_id: "doc-002",
      employee_id: seedEmployeeId(tenantId, 1),
      document_type: "leave_notice",
      source_ref: "DMS:leave-notice-002",
      source_provider: "dms",
      source_status: "verified",
      source_verified_at: "2026-06-20T00:00:00.000Z",
      source_version_ref: "DMS:leave-notice-002:v1",
      source_metadata: { provider_document_id: "leave-notice-002", etag_present: true },
      title: "Leave notice",
    },
    {
      tenant_id: tenantId,
      document_id: "doc-003",
      employee_id: seedEmployeeId(tenantId, 0),
      document_type: "employment_contract",
      source_ref: "DMS:employment-contract-003",
      source_provider: "dms",
      source_status: "verified",
      source_verified_at: "2026-06-20T00:00:00.000Z",
      source_version_ref: "DMS:employment-contract-003:v1",
      source_metadata: { provider_document_id: "employment-contract-003", etag_present: true },
      title: "근로계약서",
      contract_id: "contract-doc-003",
      profile_id: `profile:${seedEmployeeId(tenantId, 0)}`,
      contract_state: "signed",
      document_ref: "DMS:employment-contract-003",
      signature_ref: "DMS:employment-contract-003:signed",
      signed_at: "2026-06-20T00:00:00.000Z",
      expires_on: "2026-07-20",
    },
    ...contractCoverage,
  ];
}

function compensationSeed(tenantId) {
  const employeeId = seedEmployeeId(tenantId, 0);
  const compensationId = "comp-001";
  return [
    {
      tenant_id: tenantId,
      compensation_id: compensationId,
      employee_id: employeeId,
      encrypted_amount_ref: encryptCompensationAmount({
        tenant_id: tenantId,
        employee_id: employeeId,
        compensation_id: compensationId,
        amount_minor: 10101010,
        currency_ref: "Currency:KRW",
      }, { allowSyntheticKey: true }),
      currency_ref: "Currency:KRW",
      effective_from: "2026-06-20",
      source_ref: `HRDoc:${employeeId}:compensation-record`,
      employment_contract_id: "contract-doc-003",
      contract_document_ref: "DMS:employment-contract-003",
    },
  ];
}

function leaveLedgerSeed(tenantId) {
  return [
    {
      tenant_id: tenantId,
      entry_id: "pto-earned-001",
      employee_id: seedEmployeeId(tenantId, 0),
      policy_id: "pto-us",
      entry_type: "earned",
      amount: 80,
      occurred_on: "2026-06-01",
      source_ref: "PolicyAccrual:2026-06",
    },
    {
      tenant_id: tenantId,
      entry_id: "pto-used-002",
      employee_id: seedEmployeeId(tenantId, 1),
      policy_id: "pto-us",
      entry_type: "used",
      amount: 16,
      occurred_on: "2026-06-10",
      source_ref: "LeaveRequest:leave-002",
    },
  ];
}

function leaveRequestSeed(tenantId) {
  return [
    {
      tenant_id: tenantId,
      request_id: "leave-002",
      employee_id: seedEmployeeId(tenantId, 1),
      policy_id: "pto-us",
      leave_type: "pto",
      amount: 16,
      start_date: "2026-06-10",
      end_date: "2026-06-11",
      state: "approved",
      approver_id: "manager-001",
      decided_at: "2026-06-10T00:00:00.000Z",
    },
    {
      tenant_id: tenantId,
      request_id: "leave-003",
      employee_id: seedEmployeeId(tenantId, 0),
      policy_id: "pto-us",
      leave_type: "pto",
      amount: 8,
      start_date: "2026-07-08",
      end_date: "2026-07-08",
      state: "submitted",
    },
    {
      tenant_id: tenantId,
      request_id: "leave-004",
      employee_id: seedEmployeeId(tenantId, 0),
      policy_id: "pto-us",
      leave_type: "pto",
      amount: 4,
      start_date: "2026-07-15",
      end_date: "2026-07-15",
      state: "submitted",
    },
  ];
}

function attendanceSeed(tenantId) {
  return [
    {
      tenant_id: tenantId,
      attendance_id: "att-seed-001",
      employee_id: seedEmployeeId(tenantId, 0),
      work_date: "2026-07-01",
      status: "present",
      recorded_hours: 8,
      clock_in_at: "2026-07-01T00:00:00.000Z",
      clock_out_at: "2026-07-01T09:00:00.000Z",
      source_ref: "TimeClock:seed:att-seed-001",
    },
    {
      tenant_id: tenantId,
      attendance_id: "att-seed-002",
      employee_id: seedEmployeeId(tenantId, 1),
      work_date: "2026-07-01",
      status: "remote",
      recorded_hours: 7.5,
      source_ref: "TimeClock:seed:att-seed-002",
    },
    ...["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"].map((workDate, index) => ({
      tenant_id: tenantId,
      attendance_id: `att-d15-overtime-${index + 1}`,
      employee_id: seedEmployeeId(tenantId, 2),
      work_date: workDate,
      status: "present",
      recorded_hours: index === 4 ? 8 : 12,
      source_ref: `TimeClock:seed:d15-overtime:${workDate}`,
    })),
  ];
}

function approvalSeed(tenantId) {
  return [
    createApprovalRequest({
      tenant_id: tenantId,
      approval_id: "approval-leave-002",
      object_type: "LeaveRequest",
      object_id: "leave-002",
      route: "manager",
      approver_role: "manager",
      state: "approved",
      decided_by: "manager-001",
      decision_reason: "seed_approved_leave_request",
    }),
    createApprovalRequest({
      tenant_id: tenantId,
      approval_id: "approval-leave-003",
      object_type: "LeaveRequest",
      object_id: "leave-003",
      route: "manager",
      approver_role: "manager",
    }),
    createApprovalRequest({
      tenant_id: tenantId,
      approval_id: "approval-leave-004",
      object_type: "LeaveRequest",
      object_id: "leave-004",
      route: "manager",
      approver_role: "manager",
    }),
    createApprovalRequest({
      tenant_id: tenantId,
      approval_id: "approval-legal-risk-001",
      object_type: "LegalRisk",
      object_id: "legal-risk-001",
      route: "legal",
      approver_role: "legal_ops",
    }),
  ];
}

function jobOpeningSeed(tenantId) {
  return [
    createJobOpening({
      tenant_id: tenantId,
      job_opening_id: "job-001",
      title: "Senior Litigation Associate",
      department_ref: "PracticeGroup:litigation",
      hiring_manager_employee_id: seedEmployeeId(tenantId, 0),
      position_count: 2,
      state: "open",
      approval_ref: "Approval:job-001",
    }),
  ];
}

function candidateSeed(tenantId) {
  return [
    createCandidateProfile({
      tenant_id: tenantId,
      candidate_id: "cand-001",
      legal_name: "Candidate One",
      email: "candidate@example.com",
      source_ref: "ATS:synthetic:cand-001",
      resume_ref: "DMS:candidate-resume-001",
      retention_policy_id: "candidate-retention-2y",
      retention_expires_at: "2028-06-30T00:00:00.000Z",
      access_role_ids: ["people_ops", "hr_admin", "recruiter"],
    }),
  ];
}

function candidateConsentSeed(tenantId) {
  return [
    createCandidateConsent({
      tenant_id: tenantId,
      consent_id: "consent-cand-001",
      candidate_id: "cand-001",
      purpose: "recruiting_processing",
      granted_at: "2026-06-01T00:00:00.000Z",
      expires_at: "2027-06-01T00:00:00.000Z",
      evidence_ref: "DMS:candidate-consent-001",
    }),
  ];
}

function applicationSeed(tenantId) {
  return [
    createApplication({
      tenant_id: tenantId,
      application_id: "app-001",
      candidate_id: "cand-001",
      job_opening_id: "job-001",
      stage: "interview",
    }),
  ];
}

function interviewSeed(tenantId) {
  return [
    createInterview({
      tenant_id: tenantId,
      interview_id: "int-001",
      application_id: "app-001",
      candidate_id: "cand-001",
      scheduled_for: "2026-07-10T15:00:00.000Z",
      schedule_source_ref: "CalendarEvent:int-001",
      interviewer_employee_ids: [seedEmployeeId(tenantId, 0)],
    }),
  ];
}

function offerSeed(tenantId) {
  return [
    createOffer({
      tenant_id: tenantId,
      offer_id: "offer-001",
      application_id: "app-001",
      candidate_id: "cand-001",
      compensation_ref: "CompPackage:offer-001",
      document_ref: "DMS:offer-letter-001",
      state: "sent",
      approval_ref: "Approval:offer-001",
    }),
  ];
}

function lifecycleTemplateSeed(tenantId) {
  return [
    {
      tenant_id: tenantId,
      template_version_id: "lawyer-onboarding:1",
      ...createLifecycleTemplate({
        template_id: "lawyer-onboarding",
        version: "1",
        lifecycle_kind: "onboarding",
        role_key: "lawyer",
        effective_from: "2026-01-01",
        tasks: [
          { task_id: "policy-ack", title: "입사 서류 확인", owner_role: "people_ops", due_offset_days: -3 },
          { task_id: "default-security-training", title: "보안 교육", owner_role: "people_ops", due_offset_days: -2 },
          { task_id: "default-confidentiality-pledge", title: "비밀유지 서약", owner_role: "people_ops", due_offset_days: -2 },
          {
            task_id: "access-provision",
            title: "기본 접근 권한 설정",
            owner_role: "it_ops",
            due_offset_days: 0,
            depends_on_task_ids: [
              "policy-ack",
              "default-security-training",
              "default-confidentiality-pledge",
            ],
          },
        ],
      }),
    },
    {
      tenant_id: tenantId,
      template_version_id: "lawyer-offboarding:1",
      ...createLifecycleTemplate({
        template_id: "lawyer-offboarding",
        version: "1",
        lifecycle_kind: "offboarding",
        role_key: "lawyer",
        effective_from: "2026-01-01",
        tasks: [
          { task_id: "matter-handover", title: "담당 사건 인수인계", owner_role: "matter_owner", due_offset_days: -5 },
          {
            task_id: "access-revoke",
            title: "업무 계정 회수",
            owner_role: "it_ops",
            due_offset_days: 0,
            depends_on_task_ids: ["matter-handover"],
          },
        ],
      }),
    },
  ].map(Object.freeze);
}

function onboardingSeed(tenantId) {
  const template = lifecycleTemplateSeed(tenantId).find(
    (candidate) => candidate.lifecycle_kind === "onboarding",
  );
  const plan = createOnboardingPlan({
    tenant_id: tenantId,
    onboarding_id: "onb-001",
    employee_id: seedEmployeeId(tenantId, 1),
    start_date: "2026-08-01",
    template,
    document_refs: ["DMS:policy-ack"],
    access_requests: [{ request_id: "access-001", system_ref: "IdP:core", access_level: "employee" }],
  });
  return [
    updateOnboardingTask(plan, "access-provision", { status: "blocked" }),
  ];
}

function offboardingSeed(tenantId) {
  return [
    createOffboardingCase({
      tenant_id: tenantId,
      offboarding_id: "off-001",
      employee_id: seedEmployeeId(tenantId, 0),
      separation_date: "2026-12-31",
      leave_reconciliation_status: "approved_and_synced",
      leave_reconciliation_evidence_ref: "OffboardingEvidence:off-001:leave",
      access_revocations: [{ system_ref: "IdP:core", revoked: true, confirmation_ref: "LX-11:AccessRevocation:off-001:idp-core" }],
      document_returns: [{
        document_ref: "DMS:laptop-001",
        returned: true,
        evidence_ref: "OffboardingEvidence:off-001:document",
      }],
      legal_hold_checks: [{
        hold_ref: "LegalHold:none",
        clear: true,
        evidence_ref: "OffboardingEvidence:off-001:legal-hold",
      }],
      matter_reassignments: [
        {
          matter_id: "matter_rp05_synthetic_opening",
          reassigned_to_employee_id: seedEmployeeId(tenantId, 1),
          reassigned: true,
          handover_ref: "MatterHandover:off-001:matter_rp05_synthetic_opening",
        },
      ],
      handover_items: [
        {
          item_id: "handover-matter-files",
          title: "담당 Matter 인수인계",
          completed: true,
          evidence_ref: "MatterHandover:off-001:matter_rp05_synthetic_opening",
        },
      ],
    }),
    createOffboardingCase({
      tenant_id: tenantId,
      offboarding_id: "off-002",
      employee_id: seedEmployeeId(tenantId, 3),
      separation_date: "2026-07-01",
      access_revocations: [{ system_ref: "IdP:core", revoked: false }],
      document_returns: [{ document_ref: "DMS:laptop-002", returned: true }],
      legal_hold_checks: [{ hold_ref: "LegalHold:none", clear: true }],
      matter_reassignments: [
        {
          matter_id: "matter_d15_access_review",
          reassigned_to_employee_id: seedEmployeeId(tenantId, 1),
          reassigned: true,
          handover_ref: "MatterHandover:off-002:matter_d15_access_review",
        },
      ],
      handover_items: [
        {
          item_id: "handover-access-review",
          title: "권한 회수 확인",
          completed: true,
          evidence_ref: "MatterHandover:off-002:access-review",
        },
      ],
    }),
    createOffboardingCase({
      tenant_id: tenantId,
      offboarding_id: "off-leave-synthetic-001",
      employee_id: seedEmployeeId(tenantId, 9),
      separation_date: "2026-12-31",
      leave_reconciliation_status: "pending",
      access_revocations: [{ system_ref: "IdP:core", revoked: true, confirmation_ref: "LX-11:AccessRevocation:off-leave-synthetic-001:idp-core" }],
      document_returns: [{ document_ref: "DMS:laptop-leave-synthetic-001", returned: true }],
      legal_hold_checks: [{ hold_ref: "LegalHold:none", clear: true }],
      matter_reassignments: [],
      handover_items: [],
    }),
  ];
}

function offboardingEvidenceSeed(tenantId) {
  const offboarding = offboardingSeed(tenantId).find((item) => item.offboarding_id === "off-001");
  const sourceVersions = createOffboardingEvidenceSourceVersions(offboarding, {
    matter_source_version: createOffboardingSourceVersion({ matters: [], members: [] }),
  });
  return offboardingEvidencePointers(offboarding).map((pointer, index) =>
    createOffboardingEvidenceReceipt({
      tenant_id: tenantId,
      receipt_id: `offboarding-evidence:${offboarding.offboarding_id}:${index + 1}`,
      evidence_ref: pointer.evidence_ref,
      offboarding_id: offboarding.offboarding_id,
      category: pointer.category,
      subject_ref: pointer.subject_ref,
      state: "confirmed",
      source_version: sourceVersions[`${pointer.category}:${pointer.subject_ref}`],
      recorded_at: `2026-07-${String(index + 10).padStart(2, "0")}T00:00:00.000Z`,
      valid_until: "2027-01-31T00:00:00.000Z",
      recorded_by_actor_id: "user-people-ops-reviewer",
    }));
}

function statutoryTrainingSeed(tenantId) {
  const missingEmployeeId = seedEmployeeId(tenantId, 1);
  return seedEmployees(tenantId)
    .filter((employee) => employee.employee_id !== missingEmployeeId)
    .map((employee) => Object.freeze({
      tenant_id: tenantId,
      training_id: `training-statutory-${employee.employee_id}`,
      employee_id: employee.employee_id,
      training_type: "statutory_labor",
      status: "completed",
      completed_on: "2026-06-30",
      expires_on: "2026-12-31",
      source_ref: `TrainingRecord:statutory_labor:${employee.employee_id}:2026`,
    }));
}

function policySeed(tenantId) {
  return [
    createLeavePolicy({
      tenant_id: tenantId,
      policy_id: "pto-us",
      policy_version: "2026.1",
      leave_type: "pto",
      accrual_rate_per_month: 8,
      annual_entitlement: 96,
      carryover_limit: 40,
      effective_from: "2026-01-01",
    }),
    createApprovalPolicy({
      tenant_id: tenantId,
      policy_id: "approval-policy-2026.1",
      routes: { manager: "manager", hr: "people_ops", legal: "legal_ops" },
    }),
    Object.freeze({
      tenant_id: tenantId,
      policy_id: "retention-hr-docs",
      policy_type: "retention",
      policy_version: "2026.1",
      retention_period_days: 2555,
      effective_from: "2026-01-01",
    }),
  ];
}

function aiSourceSeed(tenantId) {
  return [
    {
      tenant_id: tenantId,
      source_ref: "Policy:leave:2026",
      source_type: "policy_document",
      title: "연차휴가 사규 2026",
      tags: ["leave", "policy", "pto", "연차", "사규"],
    },
    {
      tenant_id: tenantId,
      source_ref: "Policy:employment-rules:2026",
      source_type: "policy_document",
      title: "취업규칙 2026",
      tags: ["employment", "rules", "취업규칙", "근로시간", "법정교육"],
    },
    {
      tenant_id: tenantId,
      source_ref: `Case:leave:${seedEmployeeId(tenantId, 1)}`,
      source_type: "case_record",
      title: "Leave accommodation case metadata",
      tags: ["leave", "case"],
    },
    {
      tenant_id: tenantId,
      source_ref: `HRDoc:${seedEmployeeId(tenantId, 0)}:compensation-record`,
      source_type: "hr_document",
      title: "Compensation source metadata",
      tags: ["pay", "compensation"],
      sensitivity: "compensation",
    },
  ];
}

function aiSourceChunkSeed(tenantId) {
  return [
    ...ingestHrxAiSourceChunks({
      tenant_id: tenantId,
      source_ref: "Policy:leave:2026",
      source_type: "policy_document",
      chunks: [
        {
          chunk_id: "leave-policy-annual-promotion",
          text: "연차휴가 사규는 사용 가능한 연차와 연차촉진 통지 절차를 인사 담당자가 확인하도록 정한다.",
          metadata: { section_ref: "leave.annual.promotion" },
        },
      ],
    }),
    ...ingestHrxAiSourceChunks({
      tenant_id: tenantId,
      source_ref: "Policy:employment-rules:2026",
      source_type: "policy_document",
      chunks: [
        {
          chunk_id: "employment-rules-working-time",
          text: "취업규칙은 근로시간 초과근로 법정교육 근로계약 관리 기준을 포함한다.",
          metadata: { section_ref: "employment.rules.working-time" },
        },
      ],
    }),
  ];
}

function matterAssignmentSeed(tenantId) {
  return [
    Object.freeze({
      tenant_id: tenantId,
      employee_id: seedEmployeeId(tenantId, 0),
      matter_id: "matter-001",
      hours: 12.5,
      capacity_pct: 35,
    }),
    Object.freeze({
      tenant_id: tenantId,
      employee_id: seedEmployeeId(tenantId, 1),
      matter_id: "matter-002",
      hours: 7,
      capacity_pct: 18,
      billable: false,
    }),
  ];
}

function matterTimeEntrySeed(tenantId) {
  return [
    Object.freeze({
      tenant_id: tenantId,
      time_entry_id: "hrx-time-entry-001",
      employee_id: seedEmployeeId(tenantId, 0),
      actor_id: seedEmployeeId(tenantId, 0),
      matter_id: "matter-001",
      role_id: "attorney",
      work_date: "2026-07-01",
      duration_minutes: 210,
      billable: true,
      narrative: "Opening strategy session",
      model_type: "TimeEntry",
    }),
    Object.freeze({
      tenant_id: tenantId,
      time_entry_id: "hrx-time-entry-002",
      employee_id: seedEmployeeId(tenantId, 0),
      actor_id: seedEmployeeId(tenantId, 0),
      matter_id: "matter-002",
      role_id: "attorney",
      work_date: "2026-07-02",
      duration_minutes: 75,
      billable: false,
      narrative: "Internal staffing review",
      model_type: "TimeEntry",
    }),
    Object.freeze({
      tenant_id: tenantId,
      time_entry_id: "hrx-time-entry-003",
      employee_id: seedEmployeeId(tenantId, 1),
      actor_id: seedEmployeeId(tenantId, 1),
      matter_id: "matter-002",
      role_id: "staff",
      work_date: "2026-07-03",
      duration_minutes: 120,
      billable: true,
      narrative: "Document chronology",
      model_type: "TimeEntry",
    }),
  ];
}

function matterDeadlineSeed(tenantId) {
  return [
    Object.freeze({
      tenant_id: tenantId,
      deadline_id: "deadline-hrx-workload-001",
      employee_id: seedEmployeeId(tenantId, 0),
      matter_id: "matter-001",
      due_date: "2026-07-15",
      deadline_type: "filing",
      source_ref: "MatterDeadline:deadline-hrx-workload-001",
    }),
    Object.freeze({
      tenant_id: tenantId,
      deadline_id: "deadline-hrx-workload-002",
      employee_id: seedEmployeeId(tenantId, 1),
      matter_id: "matter-002",
      due_date: "2026-07-09",
      deadline_type: "client_update",
      source_ref: "MatterDeadline:deadline-hrx-workload-002",
    }),
  ];
}

function legalPeopleRuntimeSeed(tenantIds) {
  const seeds = tenantIds.map((tenantId) => createLegalPeopleApiSeed(tenantId));
  return Object.freeze({
    people: seeds.flatMap((seed) => seed.people),
    organizations: seeds.flatMap((seed) => seed.organizations),
    clients: seeds.flatMap((seed) => seed.clients),
    matters: seeds.flatMap((seed) => seed.matters),
    relationshipSeed: Object.freeze({
      relationships: seeds.flatMap((seed) => seed.relationshipSeed.relationships),
      conflict_references: seeds.flatMap((seed) => seed.relationshipSeed.conflict_references),
      ethical_wall_references: seeds.flatMap((seed) => seed.relationshipSeed.ethical_wall_references),
    }),
  });
}

function matterPeopleDocumentGraphRuntimeSeed({ tenantIds, repository, documents, matterAssignments }) {
  const runtimeSeeds = tenantIds.map((tenantId) => createMatterPeopleDocumentGraphSeedFromRuntime({
    tenant_id: tenantId,
    employees: repository.listEmployees({ tenant_id: tenantId }),
    documents: documents.list({ tenant_id: tenantId }),
    matter_assignments: matterAssignments,
  }));
  return Object.freeze({
    source_kind: "runtime_repository_plus_fixture",
    nodes: [
      ...runtimeSeeds.flatMap((seed) => seed.nodes),
      ...tenantIds.flatMap((tenantId) => createMatterPeopleDocumentGraphSeed(tenantId).nodes),
    ],
    relationships: [
      ...runtimeSeeds.flatMap((seed) => seed.relationships),
      ...tenantIds.flatMap((tenantId) => createMatterPeopleDocumentGraphSeed(tenantId).relationships),
    ],
  });
}

function response(status, body) {
  return { status, body };
}

function responseMaybe(status, body) {
  return body && typeof body.then === "function"
    ? body.then((resolved) => response(status, resolved)).catch(safeError)
    : response(status, body);
}

function legalPeopleGuardResponse({ permissionContext, actorContext, action, resourceId, shape }) {
  if (!permissionContext) return null;
  const decision = evaluateRouteDecision({
    context: permissionContext,
    resource: {
      tenant_id: actorContext.tenant_id,
      resource_type: "LegalPerson",
      resource_id: resourceId ?? "legal_people",
      matter_id: null,
    },
    action,
  });
  if (decision.effect === "allow") return null;

  const isReview = decision.effect === "review_required" || decision.effect === "approval_required";
  const uiState = isReview ? "review_required" : "denied";
  const body = {
    schema_version: "lawos.lcx_ppl.guarded_response.v0.1",
    outcome: uiState,
    ui_state: uiState,
    safe_error_codes: [isReview ? "HRX_LEGAL_PEOPLE_REVIEW_REQUIRED" : "HRX_LEGAL_PEOPLE_ACCESS_DENIED"],
    fail_closed: !isReview,
    review_required: isReview,
    count_leak_prevented: true,
    permission_summary: {
      actor_id: actorContext.actor_id,
      can_view_sensitive_relationship_details: false,
      raw_contact_values_included: false,
      provider_payload_included: false,
      ai_final_decision_allowed: false,
    },
    claim_boundary: LCX_PPL_API_BOUNDARY,
  };

  if (shape === "search") {
    return response(isReview ? 200 : 403, { ...body, people: [], facets: {} });
  }
  if (shape === "relationships") {
    return response(isReview ? 200 : 403, { ...body, pivot: {}, relationships: [], relationships_grouped: {} });
  }
  if (shape === "ethics") {
    return response(isReview ? 200 : 403, {
      ...body,
      review_queue: [],
      ethical_walls: [],
      permission_links: [],
      reviewer_receipts: [],
      state_counts: {},
    });
  }
  return response(isReview ? 200 : 403, {
    ...body,
    person: null,
    affiliations: [],
    clients: [],
    matters: [],
    relationships: [],
    relationships_grouped: {},
    conflict_references: [],
    ethical_wall_references: [],
    audit_summary: null,
  });
}

function employeeGuardResponse({ permissionContext, actorContext }) {
  if (!permissionContext) return null;
  const decision = evaluateRouteDecision({
    context: permissionContext,
    resource: {
      tenant_id: actorContext.tenant_id,
      resource_type: "HrxEmployee",
      resource_id: "employees",
      matter_id: null,
    },
    action: "hrx.employee.read",
  });
  if (decision.effect === "allow") return null;

  const isReview = decision.effect === "review_required" || decision.effect === "approval_required";
  const uiState = isReview ? "review_required" : "denied";
  return response(isReview ? 200 : 403, {
    schema_version: "lawos.hrx.employee.guarded_response.v0.1",
    outcome: uiState,
    ui_state: uiState,
    safe_error_codes: [isReview ? "HRX_EMPLOYEE_REVIEW_REQUIRED" : "HRX_EMPLOYEE_ACCESS_DENIED"],
    fail_closed: !isReview,
    review_required: isReview,
    count_leak_prevented: true,
    employees: [],
    permission_summary: {
      actor_id: actorContext.actor_id,
      employee_records_visible: false,
      raw_contact_values_included: false,
      provider_payload_included: false,
    },
    claim_boundary: "hrx.employee.read_guarded",
  });
}

function hrxReadGuardResponse({
  permissionContext,
  actorContext,
  action,
  resourceType,
  resourceId,
  schemaVersion,
  deniedCode,
  reviewCode,
  claimBoundary,
  emptyBody,
  permissionSummary,
}) {
  if (!permissionContext) return null;
  const decision = evaluateRouteDecision({
    context: permissionContext,
    resource: {
      tenant_id: actorContext.tenant_id,
      resource_type: resourceType,
      resource_id: resourceId,
      matter_id: null,
    },
    action,
  });
  if (decision.effect === "allow") return null;

  const isReview = decision.effect === "review_required" || decision.effect === "approval_required";
  const uiState = isReview ? "review_required" : "denied";
  return response(isReview ? 200 : 403, {
    schema_version: schemaVersion,
    outcome: uiState,
    ui_state: uiState,
    safe_error_codes: [isReview ? reviewCode : deniedCode],
    fail_closed: !isReview,
    review_required: isReview,
    count_leak_prevented: true,
    ...emptyBody,
    permission_summary: {
      actor_id: actorContext.actor_id,
      ...permissionSummary,
    },
    claim_boundary: claimBoundary,
  });
}

function requireTrustedRequestContext(requestContext = {}) {
  const tenantId = typeof requestContext.tenant_id === "string" ? requestContext.tenant_id.trim() : "";
  const actorId = typeof requestContext.actor_id === "string" ? requestContext.actor_id.trim() : "";
  if (!tenantId) {
    const error = new Error("HRX trusted tenant context is required");
    error.safe_error_code = "HRX_TENANT_CONTEXT_REQUIRED";
    throw error;
  }
  if (!actorId) {
    const error = new Error("HRX trusted actor context is required");
    error.safe_error_code = "HRX_ACTOR_CONTEXT_REQUIRED";
    throw error;
  }
  return Object.freeze({
    tenant_id: tenantId,
    actor_id: actorId,
    actor_role: typeof requestContext.actor_role === "string" && requestContext.actor_role.trim() ? requestContext.actor_role.trim() : "unknown",
    hrx_scopes: Object.freeze(Array.isArray(requestContext.hrx_scopes) ? requestContext.hrx_scopes : []),
    session_bound: requestContext.session_bound === true,
    step_up_verified: requestContext.step_up_verified === true,
    step_up_purpose: typeof requestContext.step_up_purpose === "string" ? requestContext.step_up_purpose : null,
    email: typeof requestContext.email === "string"
      ? requestContext.email.trim().toLowerCase()
      : null,
    entra_subject_id: typeof requestContext.entra_subject_id === "string"
      && requestContext.entra_subject_id.trim()
      ? requestContext.entra_subject_id.trim()
      : null,
  });
}

function safeError(error) {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 400;
  return response(status, {
    request_id: "hrx_request_error",
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "HRX_API_VALIDATION_ERROR",
    reason: error.message,
    ...(error.decision ? { decision: clone(error.decision) } : {}),
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDurableRuntimeCollection({ store, table, idField, seed = [], stateVersioned = false }) {
  for (const row of seed) {
    const where = { tenant_id: row.tenant_id, [idField]: row[idField] };
    if (!store.query("selectOne", { table, where })) {
      store.query("insert", {
        table,
        row: clone(stateVersioned ? { ...row, state_version: row.state_version ?? 1 } : row),
      });
    }
  }
  return Object.freeze({
    list() {
      return store
        .query("select", { table, where: {} })
        .sort((left, right) => String(left[idField]).localeCompare(String(right[idField])))
        .map(clone);
    },
    insert(row) {
      return store.query("insert", { table, row: clone(row) });
    },
    update(row) {
      const where = { tenant_id: row.tenant_id, [idField]: row[idField] };
      const current = store.query("selectOne", { table, where });
      if (!current) return undefined;
      const patch = stateVersioned
        ? { ...clone(row), state_version: current.state_version + 1 }
        : clone(row);
      return store.query("updateOne", {
        table,
        where,
        patch,
        ...(stateVersioned ? { expected_version: current.state_version } : {}),
      });
    },
  });
}

function createHrxDurableRuntimeCollections({ store, seedTenantIds }) {
  if (!store) return null;
  return Object.freeze({
    riskEvents: createDurableRuntimeCollection({
      store,
      table: "hrx_risk_events",
      idField: "risk_event_id",
      stateVersioned: true,
    }),
    approvals: createDurableRuntimeCollection({
      store,
      table: "hrx_operational_approvals",
      idField: "approval_id",
      seed: seedTenantIds.flatMap(approvalSeed),
      stateVersioned: true,
    }),
    policies: createDurableRuntimeCollection({
      store,
      table: "hrx_operational_policies",
      idField: "policy_id",
      seed: seedTenantIds.flatMap(policySeed),
      stateVersioned: true,
    }),
    jobOpenings: createDurableRuntimeCollection({
      store,
      table: "hrx_job_openings",
      idField: "job_opening_id",
      seed: seedTenantIds.flatMap(jobOpeningSeed),
    }),
    candidates: createDurableRuntimeCollection({
      store,
      table: "hrx_candidates",
      idField: "candidate_id",
      seed: seedTenantIds.flatMap(candidateSeed),
    }),
    candidateConsents: createDurableRuntimeCollection({
      store,
      table: "hrx_candidate_consents",
      idField: "consent_id",
      seed: seedTenantIds.flatMap(candidateConsentSeed),
    }),
    applications: createDurableRuntimeCollection({
      store,
      table: "hrx_applications",
      idField: "application_id",
      seed: seedTenantIds.flatMap(applicationSeed),
    }),
    interviews: createDurableRuntimeCollection({
      store,
      table: "hrx_interviews",
      idField: "interview_id",
      seed: seedTenantIds.flatMap(interviewSeed),
    }),
    offers: createDurableRuntimeCollection({
      store,
      table: "hrx_offers",
      idField: "offer_id",
      seed: seedTenantIds.flatMap(offerSeed),
    }),
    lifecycleTemplates: createDurableRuntimeCollection({
      store,
      table: "hrx_lifecycle_templates",
      idField: "template_version_id",
      seed: seedTenantIds.flatMap(lifecycleTemplateSeed),
    }),
    onboardingPlans: createDurableRuntimeCollection({
      store,
      table: "hrx_onboarding_plans",
      idField: "onboarding_id",
      seed: seedTenantIds.flatMap(onboardingSeed),
    }),
    offboardingCases: createDurableRuntimeCollection({
      store,
      table: "hrx_offboarding_cases",
      idField: "offboarding_id",
      seed: seedTenantIds.flatMap(offboardingSeed),
    }),
    offboardingEvidence: createDurableRuntimeCollection({
      store,
      table: "hrx_offboarding_evidence_receipts",
      idField: "receipt_id",
      seed: seedTenantIds.flatMap(offboardingEvidenceSeed),
    }),
  });
}

function createDurableHrxRiskEventStore(collection) {
  function normalize(value) {
    return value ? Object.freeze(createHrxRiskEvent(value)) : undefined;
  }
  return Object.freeze({
    upsertMany(eventInputs = []) {
      return Object.freeze(eventInputs.map((input) => {
        const next = createHrxRiskEvent(input);
        const current = collection.list().find((event) =>
          event.tenant_id === next.tenant_id && event.risk_event_id === next.risk_event_id);
        if (!current) return normalize(collection.insert({ ...next, state_version: 1 }));
        return normalize(collection.update({
          ...next,
          status: current.status,
          resolution_ref: current.resolution_ref,
          state_history: current.state_history,
        }));
      }));
    },
    get(ref = {}) {
      return normalize(collection.list().find((event) =>
        event.tenant_id === ref.tenant_id && event.risk_event_id === ref.risk_event_id));
    },
    list(query = {}) {
      return Object.freeze(collection.list()
        .filter((event) => !query.tenant_id || event.tenant_id === query.tenant_id)
        .filter((event) => !query.status || event.status === query.status)
        .filter((event) => !query.risk_type || event.risk_type === query.risk_type)
        .map(normalize)
        .sort((left, right) => left.risk_type.localeCompare(right.risk_type)
          || String(left.employee_id ?? "").localeCompare(String(right.employee_id ?? ""))
          || left.risk_event_id.localeCompare(right.risk_event_id)));
    },
    transition(ref = {}, change = {}) {
      const current = this.get(ref);
      if (!current) return undefined;
      return normalize(collection.update(transitionHrxRiskEvent(current, change)));
    },
  });
}

function runtimeCollectionRows(collections, name, fallback) {
  return collections?.[name]?.list() ?? fallback;
}

function persistRuntimeInsert(context, name, row) {
  context.durableCollections?.[name]?.insert(row);
}

function persistRuntimeUpdate(context, name, row) {
  context.durableCollections?.[name]?.update(row);
}

function appendRuntimeAudit(audit, { tenant_id, actor_id, action, object_type, object_id, reason, metadata = {} }) {
  return audit.append({
    event_id: `hrx_api_evt_${randomUUID()}`,
    tenant_id,
    actor_id,
    action,
    object_type,
    object_id,
    decision: "allow",
    reason,
    source: "hrx-api-runtime",
    metadata,
  });
}

function employmentProfileIdForEmployee(repository, tenantId, employeeId) {
  return repository.listEmploymentProfiles({ tenant_id: tenantId, employee_id: employeeId })[0]?.profile_id ?? `profile:${employeeId}`;
}

function documentAuditMetadata(document) {
  return {
    employee_id: document.employee_id,
    document_type: document.document_type,
    source_ref: document.source_ref,
    contract_state: document.contract_state ?? null,
    signature_ref: document.signature_ref ?? null,
    expires_on: document.expires_on ?? null,
  };
}

function requireRecruitingRecord(collection, tenantId, key, id, safeErrorCode) {
  const row = collection.find((item) => item.tenant_id === tenantId && item[key] === id);
  if (!row) {
    const error = new Error(`${key} not found: ${id}`);
    error.status = 404;
    error.safe_error_code = safeErrorCode;
    throw error;
  }
  return row;
}

function requireActiveRecruitingEmployee(repository, tenantId, employeeId, field) {
  const employee = typeof employeeId === "string" && employeeId.trim()
    ? repository.getEmployee({ tenant_id: tenantId, employee_id: employeeId.trim() })
    : null;
  if (!employee || employee.status !== "active") {
    throw safeHrxRuntimeError(
      409,
      "HRX_RECRUITING_EMPLOYEE_AUTHORITY_INVALID",
      `${field} must reference an active employee in the signed tenant`,
    );
  }
  return employee;
}

function requireRecruitingSourceAuthority(context, actorContext, resource, payload) {
  const authority = context.recruitingSourceAuthority;
  if (!authority || typeof authority.verify !== "function") {
    throw safeHrxRuntimeError(
      409,
      "HRX_RECRUITING_SOURCE_AUTHORITY_REQUIRED",
      "Recruiting document, consent, approval, and compensation sources require an operational authority",
    );
  }
  if (authority.verify({
    tenant_id: actorContext.tenant_id,
    actor_id: actorContext.actor_id,
    resource,
    payload: clone(payload),
  }) !== true) {
    throw safeHrxRuntimeError(
      409,
      "HRX_RECRUITING_SOURCE_AUTHORITY_REJECTED",
      "Recruiting source authority rejected the supplied references",
    );
  }
}

function recruitingSourceAuthorityCapability(context, actorContext) {
  const authority = context.recruitingSourceAuthority;
  if (!authority || typeof authority.status !== "function" || typeof authority.preparePipeline !== "function") {
    return Object.freeze({
      state: "integration_required",
      can_start_pipeline: false,
    });
  }
  try {
    const status = authority.status({
      tenant_id: actorContext.tenant_id,
      actor_id: actorContext.actor_id,
    });
    const ready = status === true || status?.ready === true;
    return Object.freeze({
      state: ready ? "ready" : "integration_required",
      can_start_pipeline: ready,
    });
  } catch {
    return Object.freeze({
      state: "unavailable",
      can_start_pipeline: false,
    });
  }
}

function requireRecruitingPipelineAuthority(context, actorContext, input) {
  const capability = recruitingSourceAuthorityCapability(context, actorContext);
  if (!capability.can_start_pipeline) {
    throw safeHrxRuntimeError(
      409,
      "HRX_RECRUITING_SOURCE_AUTHORITY_REQUIRED",
      "Recruiting document, consent, approval, compensation, and schedule sources are not ready",
    );
  }
  const prepared = context.recruitingSourceAuthority.preparePipeline({
    tenant_id: actorContext.tenant_id,
    actor_id: actorContext.actor_id,
    input: clone(input),
  });
  if (!prepared || typeof prepared !== "object") {
    throw safeHrxRuntimeError(
      409,
      "HRX_RECRUITING_SOURCE_AUTHORITY_REJECTED",
      "Recruiting source authority did not return prepared sources",
    );
  }
  return prepared;
}

const RECRUITING_PIPELINE_INPUT_FIELDS = new Set([
  "idempotency_key",
  "job_title",
  "department_ref",
  "position_count",
  "hiring_manager_employee_id",
  "candidate_name",
  "candidate_email",
  "interviewer_employee_id",
  "interview_date",
  "interview_time",
  "consent_expires_at",
  "retention_expires_at",
]);

function assertRecruitingPipelineInput(input) {
  const unexpected = Object.keys(input ?? {}).filter((field) => !RECRUITING_PIPELINE_INPUT_FIELDS.has(field));
  if (unexpected.length > 0) {
    throw safeHrxRuntimeError(
      400,
      "HRX_RECRUITING_SOURCE_FIELDS_FORBIDDEN",
      "Recruiting source references and record identifiers are provider-owned",
    );
  }
}

function recruitingPipelineIdempotencyKey(input) {
  const key = typeof input?.idempotency_key === "string" ? input.idempotency_key.trim() : "";
  if (!key || key.length > 255) {
    throw safeHrxRuntimeError(
      400,
      "HRX_RECRUITING_PIPELINE_IDEMPOTENCY_KEY_REQUIRED",
      "Recruiting pipeline idempotency_key is required and must not exceed 255 characters",
    );
  }
  return key;
}

function recruitingPipelineDigest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function recruitingPipelineInputHash(input) {
  return recruitingPipelineDigest(
    Object.keys(input)
      .sort()
      .map((field) => [field, input[field] ?? null]),
  );
}

function recruitingPipelineReceipt(context, tenantId, idempotencyKey) {
  return context.leaveManagementStore
    ? context.leaveManagementStore.query("selectOne", {
        table: "hrx_recruiting_pipeline_receipts",
        where: { tenant_id: tenantId, idempotency_key: idempotencyKey },
      })
    : context.recruitingPipelineReceipts.find(
        (receipt) =>
          receipt.tenant_id === tenantId &&
          receipt.idempotency_key === idempotencyKey,
      );
}

function assertRecruitingPipelineReceipt(receipt, actorContext, inputHash) {
  if (
    receipt.input_hash !== inputHash ||
    receipt.created_by_actor_id !== actorContext.actor_id
  ) {
    throw safeHrxRuntimeError(
      409,
      "HRX_RECRUITING_PIPELINE_IDEMPOTENCY_CONFLICT",
      "Recruiting pipeline idempotency_key was already used for another request",
    );
  }
  return receipt;
}

function recruitingPipelineIds(receipt) {
  return Object.freeze({
    job_opening_id: receipt.job_opening_id,
    consent_id: receipt.consent_id,
    candidate_id: receipt.candidate_id,
    application_id: receipt.application_id,
    interview_id: receipt.interview_id,
    offer_id: receipt.offer_id,
  });
}

function recruitingPipelineResponse(receipt, replayed) {
  const ids = recruitingPipelineIds(receipt);
  return response(replayed ? 200 : 201, {
    outcome: replayed ? "idempotent_replay" : "created",
    idempotent_replay: replayed,
    ids,
    receipt: {
      receipt_id: receipt.pipeline_receipt_id,
      tenant_id: receipt.tenant_id,
      idempotency_key: receipt.idempotency_key,
      created_at: receipt.created_at,
      ids,
    },
  });
}

function appendRecruitingPipelineAudit(audit, actorContext, receipt) {
  return audit.append({
    event_id: `hrx_recruiting_pipeline_${recruitingPipelineDigest([
      receipt.tenant_id,
      receipt.idempotency_key,
    ])}`,
    tenant_id: actorContext.tenant_id,
    actor_id: actorContext.actor_id,
    action: "hrx.recruiting.pipeline.create",
    object_type: "Application",
    object_id: receipt.application_id,
    decision: "allow",
    reason: "recruiting_pipeline_created_from_authoritative_sources",
    source: "hrx-api-runtime",
    occurred_at: receipt.created_at,
    metadata: {
      pipeline_receipt_id: receipt.pipeline_receipt_id,
      job_opening_id: receipt.job_opening_id,
      candidate_id: receipt.candidate_id,
      interview_id: receipt.interview_id,
      offer_id: receipt.offer_id,
      raw_content_included: false,
    },
  });
}

function persistRecruitingPipeline(context, actorContext, records, receipt) {
  const inserts = [
    ["jobOpenings", "hrx_job_openings", records.jobOpening],
    ["candidateConsents", "hrx_candidate_consents", records.consent],
    ["candidates", "hrx_candidates", records.candidate],
    ["applications", "hrx_applications", records.application],
    ["interviews", "hrx_interviews", records.interview],
    ["offers", "hrx_offers", records.offer],
  ];
  let result;
  if (context.leaveManagementStore) {
    result = context.leaveManagementStore.transaction((transactionStore) => {
      const existing = transactionStore.query("selectOne", {
        table: "hrx_recruiting_pipeline_receipts",
        where: {
          tenant_id: receipt.tenant_id,
          idempotency_key: receipt.idempotency_key,
        },
      });
      if (existing) {
        return Object.freeze({
          receipt: assertRecruitingPipelineReceipt(
            existing,
            actorContext,
            receipt.input_hash,
          ),
          replayed: true,
        });
      }
      for (const [, table, record] of inserts) {
        transactionStore.query("insert", { table, row: clone(record) });
      }
      transactionStore.query("insert", {
        table: "hrx_recruiting_pipeline_receipts",
        row: clone(receipt),
      });
      appendRecruitingPipelineAudit(
        createDurableAuditStore({ store: transactionStore }),
        actorContext,
        receipt,
      );
      return Object.freeze({ receipt, replayed: false });
    });
  } else {
    const existing = recruitingPipelineReceipt(
      context,
      receipt.tenant_id,
      receipt.idempotency_key,
    );
    if (existing) {
      return Object.freeze({
        receipt: assertRecruitingPipelineReceipt(
          existing,
          actorContext,
          receipt.input_hash,
        ),
        replayed: true,
      });
    }
    appendRecruitingPipelineAudit(context.audit, actorContext, receipt);
    result = Object.freeze({ receipt, replayed: false });
  }
  if (!result.replayed) {
    for (const [collectionName, , record] of inserts) {
      context[collectionName].push(record);
    }
    if (!context.leaveManagementStore) {
      context.recruitingPipelineReceipts.push(receipt);
    }
  }
  return result;
}

function withoutAuthenticatedActor(input) {
  const { actor_id: _authenticatedActorId, ...requestInput } = input ?? {};
  return requestInput;
}

function lifecycleTemplateVersionId(templateId, version) {
  return `${templateId}:${version}`;
}

function lifecycleTemplateRow(tenantId, input = {}) {
  const template = createLifecycleTemplate(input);
  return Object.freeze({
    tenant_id: tenantId,
    template_version_id: lifecycleTemplateVersionId(template.template_id, template.version),
    ...template,
  });
}

function resolveLifecycleTemplate(context, {
  tenant_id: tenantId,
  lifecycle_kind: lifecycleKind,
  template_id: templateId,
  version,
  role_key: roleKey,
  as_of: asOf,
} = {}) {
  const candidates = context.lifecycleTemplates
    .filter((template) => template.tenant_id === tenantId)
    .filter((template) => template.lifecycle_kind === lifecycleKind)
    .filter((template) => !templateId || template.template_id === templateId)
    .filter((template) => !version || template.version === version)
    .filter((template) => !roleKey || template.role_key === roleKey)
    .filter((template) => !asOf || template.effective_from <= asOf)
    .sort((left, right) =>
      right.effective_from.localeCompare(left.effective_from)
      || right.version.localeCompare(left.version, undefined, { numeric: true }));
  const template = candidates[0];
  if (!template) {
    throw safeHrxRuntimeError(
      404,
      "HRX_LIFECYCLE_TEMPLATE_NOT_FOUND",
      "Lifecycle template was not found for the requested role and date",
    );
  }
  return template;
}

function offboardingMatterOperationalState(matterContext, tenantId, employeeId, asOf, offboarding = null) {
  const repository = matterContext?.repository;
  if (!repository || typeof repository.list !== "function") {
    throw safeHrxRuntimeError(
      503,
      "HRX_OFFBOARDING_MATTER_SOURCE_UNAVAILABLE",
      "Matter assignment source is unavailable",
    );
  }
  try {
    const members = repository
      .list({ tenant_id: tenantId, model_type: "MatterMember" })
      .filter((member) => member.employee_id === employeeId)
      .map((member) => ({
        matter_id: member.matter_id,
        member_id: member.member_id,
        employee_id: member.employee_id,
        role: member.role,
        status: member.status,
        valid_from: member.valid_from ?? null,
        valid_to: member.valid_to ?? null,
      }))
      .sort((left, right) =>
        String(left.matter_id).localeCompare(String(right.matter_id))
        || String(left.member_id).localeCompare(String(right.member_id)));
    const relevantMatterIds = new Set([
      ...members.map((member) => member.matter_id),
      ...(offboarding?.matter_reassignments ?? []).map((item) => item.matter_id),
    ]);
    const matters = repository
      .list({ tenant_id: tenantId, model_type: "Matter" })
      .filter((matter) => relevantMatterIds.has(matter.matter_id))
      .map((matter) => ({
        matter_id: matter.matter_id,
        status: matter.status ?? "open",
      }))
      .sort((left, right) => String(left.matter_id).localeCompare(String(right.matter_id)));
    const openMatterIds = new Set(
      matters
        .filter((matter) => !["closed", "archived"].includes(matter.status))
        .map((matter) => matter.matter_id),
    );
    const asOfDate = asOf.slice(0, 10);
    const activeAssignments = members.filter(
      (member) =>
        member.role === "responsible_attorney" &&
        member.status === "active" &&
        openMatterIds.has(member.matter_id) &&
        (!member.valid_from || member.valid_from <= asOfDate) &&
        (!member.valid_to || member.valid_to >= asOfDate),
    );
    return Object.freeze({
      active_assignments: Object.freeze(activeAssignments),
      source_version: createOffboardingSourceVersion({ matters, members }),
    });
  } catch (error) {
    if (error?.safe_error_code) throw error;
    throw safeHrxRuntimeError(
      503,
      "HRX_OFFBOARDING_MATTER_SOURCE_READ_FAILED",
      "Matter assignment source could not be read",
    );
  }
}

function offboardingSubjectActorIds(repository, tenantId, employeeId) {
  return repository
    .listEmployeeUserLinks({ tenant_id: tenantId, employee_id: employeeId })
    .map((link) => link.user_id);
}

function offboardingAccessSourceRecord(context, offboarding, systemRef) {
  const source = context.offboardingAccessSource;
  if (!source || typeof source.read !== "function") {
    throw safeHrxRuntimeError(
      503,
      "HRX_OFFBOARDING_ACCESS_SOURCE_UNAVAILABLE",
      "Access revocation source is unavailable",
    );
  }
  let record;
  try {
    record = source.read({
      tenant_id: offboarding.tenant_id,
      offboarding_id: offboarding.offboarding_id,
      employee_id: offboarding.employee_id,
      system_ref: systemRef,
    });
  } catch (error) {
    if (error?.safe_error_code) throw error;
    throw safeHrxRuntimeError(
      503,
      "HRX_OFFBOARDING_ACCESS_SOURCE_READ_FAILED",
      "Access revocation source could not be read",
    );
  }
  const identityMatches =
    record &&
    typeof record === "object" &&
    typeof record.then !== "function" &&
    record.tenant_id === offboarding.tenant_id &&
    record.offboarding_id === offboarding.offboarding_id &&
    record.employee_id === offboarding.employee_id &&
    record.system_ref === systemRef;
  const evidenceRef =
    typeof record?.evidence_ref === "string" ? record.evidence_ref.trim() : "";
  const sourceVersion =
    typeof record?.access_source_version === "string"
      ? record.access_source_version.trim()
      : "";
  if (!identityMatches || !evidenceRef || !sourceVersion) {
    throw safeHrxRuntimeError(
      503,
      "HRX_OFFBOARDING_ACCESS_SOURCE_INVALID",
      "Access revocation source returned incomplete authority evidence",
    );
  }
  return Object.freeze({
    tenant_id: record.tenant_id,
    offboarding_id: record.offboarding_id,
    employee_id: record.employee_id,
    system_ref: record.system_ref,
    revoked: record.revoked === true,
    evidence_ref: evidenceRef,
    access_source_version: sourceVersion,
  });
}

function offboardingAccessOperationalState(context, offboarding) {
  const linkedAccounts = context.repository.listEmployeeUserLinks({
    tenant_id: offboarding.tenant_id,
    employee_id: offboarding.employee_id,
  });
  if (offboarding.access_revocations.length === 0 && linkedAccounts.length > 0) {
    throw safeHrxRuntimeError(
      409,
      "HRX_OFFBOARDING_ACCESS_SCOPE_REQUIRED",
      "Offboarding must identify an authoritative access revocation source",
    );
  }
  const accessRecords = new Map(
    offboarding.access_revocations.map((item) => [
      item.system_ref,
      offboardingAccessSourceRecord(context, offboarding, item.system_ref),
    ]),
  );
  const authorityBackedOffboarding = createOffboardingCase({
    ...offboarding,
    access_revocations: offboarding.access_revocations.map((item) => {
      const record = accessRecords.get(item.system_ref);
      return {
        system_ref: item.system_ref,
        revoked: record.revoked,
        confirmation_ref: record.evidence_ref,
      };
    }),
  });
  return Object.freeze({
    offboarding: authorityBackedOffboarding,
    records: accessRecords,
    source_versions: Object.freeze(Object.fromEntries(
      [...accessRecords.values()].map((record) => [
        `access_revocation:${record.system_ref}`,
        record.access_source_version,
      ]),
    )),
  });
}

function offboardingEvidenceSourceVersions(offboarding, matterState, accessState) {
  return Object.freeze({
    ...createOffboardingEvidenceSourceVersions(offboarding, {
      ...(matterState?.source_version
        ? { matter_source_version: matterState.source_version }
        : {}),
    }),
    ...(accessState?.source_versions ?? {}),
  });
}

function offboardingEvidenceOperationalReady(offboarding, pointer, matterState, accessRecord = null) {
  let ready = false;
  if (pointer.category === "access_revocation") {
    ready =
      accessRecord?.system_ref === pointer.subject_ref &&
      accessRecord.revoked === true &&
      accessRecord.evidence_ref === pointer.evidence_ref &&
      Boolean(accessRecord.access_source_version);
  } else if (pointer.category === "document_return") {
    ready = offboarding.document_returns.find((candidate) => candidate.document_ref === pointer.subject_ref)?.returned === true;
  } else if (pointer.category === "legal_hold") {
    ready = offboarding.legal_hold_checks.find((candidate) => candidate.hold_ref === pointer.subject_ref)?.clear === true;
  } else if (pointer.category === "matter_reassignment") {
    const item = offboarding.matter_reassignments.find((candidate) => candidate.matter_id === pointer.subject_ref);
    ready =
      item?.reassigned === true &&
      Boolean(item.reassigned_to_employee_id) &&
      !matterState.active_assignments.some((assignment) => assignment.matter_id === pointer.subject_ref);
  } else if (pointer.category === "handover") {
    ready = offboarding.handover_items.find((candidate) => candidate.item_id === pointer.subject_ref)?.completed === true;
  } else if (pointer.category === "leave_reconciliation") {
    ready = offboarding.leave_reconciliation_status === "approved_and_synced";
  }
  if (!ready) {
    throw safeHrxRuntimeError(
      409,
      "HRX_OFFBOARDING_EVIDENCE_SOURCE_NOT_READY",
      "Offboarding evidence cannot be confirmed until its source operation is complete",
    );
  }
  return true;
}

function nextOffboardingEvidenceRecordedAt(receipts, pointer, now) {
  const latest = receipts
    .filter((receipt) =>
      receipt.category === pointer.category &&
      receipt.subject_ref === pointer.subject_ref)
    .map((receipt) => receipt.recorded_at)
    .filter((value) => typeof value === "string" && Number.isFinite(Date.parse(value)))
    .sort()
    .at(-1);
  if (!latest || latest < now) return now;
  return new Date(Date.parse(latest) + 1).toISOString();
}

function projectOperationalOffboarding(context, matterContext, offboarding, asOf) {
  const evidenceRows = (context.durableCollections?.offboardingEvidence?.list() ?? context.offboardingEvidence)
    .filter((receipt) =>
      receipt.tenant_id === offboarding.tenant_id &&
      receipt.offboarding_id === offboarding.offboarding_id);
  if (offboarding.state === "closed") {
    return Object.freeze({
      source_state: "ok",
      ready: true,
      blockers: Object.freeze([]),
      evidence_count: evidenceRows.length,
    });
  }
  try {
    const accessState = offboardingAccessOperationalState(context, offboarding);
    const authorityBackedOffboarding = accessState.offboarding;
    const matterState = offboardingMatterOperationalState(
      matterContext,
      authorityBackedOffboarding.tenant_id,
      authorityBackedOffboarding.employee_id,
      asOf,
      authorityBackedOffboarding,
    );
    const subjectActorIds = offboardingSubjectActorIds(
      context.repository,
      authorityBackedOffboarding.tenant_id,
      authorityBackedOffboarding.employee_id,
    );
    const decision = evaluateOperationalOffboardingClose({
      offboarding: authorityBackedOffboarding,
      evidence_receipts: evidenceRows,
      active_matter_assignments: matterState.active_assignments,
      source_versions: offboardingEvidenceSourceVersions(
        authorityBackedOffboarding,
        matterState,
        accessState,
      ),
      subject_actor_ids: subjectActorIds,
      as_of: asOf,
    });
    return Object.freeze({
      source_state: "ok",
      ready: decision.ready,
      blockers: decision.blockers,
      evidence_count: evidenceRows.length,
    });
  } catch (error) {
    if (
      error?.safe_error_code === "HRX_OFFBOARDING_MATTER_SOURCE_UNAVAILABLE" ||
      error?.safe_error_code === "HRX_OFFBOARDING_MATTER_SOURCE_READ_FAILED" ||
      error?.safe_error_code === "HRX_OFFBOARDING_ACCESS_SOURCE_UNAVAILABLE" ||
      error?.safe_error_code === "HRX_OFFBOARDING_ACCESS_SOURCE_READ_FAILED" ||
      error?.safe_error_code === "HRX_OFFBOARDING_ACCESS_SOURCE_INVALID" ||
      error?.safe_error_code === "HRX_OFFBOARDING_ACCESS_SCOPE_REQUIRED"
    ) {
      const accessSourceBlocked = error.safe_error_code.includes("_ACCESS_");
      return Object.freeze({
        source_state: "blocked",
        ready: false,
        blockers: Object.freeze([Object.freeze({
          code: accessSourceBlocked ? "access_source_unavailable" : "matter_source_unavailable",
          category: accessSourceBlocked ? "access_revocation" : "matter_reassignment",
          subject_ref: offboarding.offboarding_id,
        })]),
        evidence_count: evidenceRows.length,
      });
    }
    throw error;
  }
}

function persistClosedOffboarding(context, next, employeeLinks) {
  const store = context.leaveManagementStore;
  if (store) {
    store.transaction((transactionStore) => {
      transactionStore.query("updateOne", {
        table: "hrx_offboarding_cases",
        where: {
          tenant_id: next.tenant_id,
          offboarding_id: next.offboarding_id,
        },
        patch: next,
      });
      const repository = createSqlHrxRepository({ store: transactionStore });
      for (const link of employeeLinks) {
        repository.revokeEmployeeUserLink({
          tenant_id: next.tenant_id,
          link_id: link.link_id,
        });
      }
    });
  } else {
    context.repository.transaction((repository) => {
      for (const link of employeeLinks) {
        repository.revokeEmployeeUserLink({
          tenant_id: next.tenant_id,
          link_id: link.link_id,
        });
      }
    });
  }
  const index = context.offboardingCases.findIndex(
    (item) =>
      item.tenant_id === next.tenant_id &&
      item.offboarding_id === next.offboarding_id,
  );
  if (index >= 0) context.offboardingCases[index] = next;
  return Object.freeze(employeeLinks.map((link) => link.link_id));
}

function createEmployeeThroughRepository(context, actorContext, body = {}) {
  const employeeId = typeof body.employee_id === "string" ? body.employee_id.trim() : "";
  if (employeeId && context.repository.getEmployee({ tenant_id: actorContext.tenant_id, employee_id: employeeId })) {
    throw safeHrxRuntimeError(409, "HRX_EMPLOYEE_ID_ALREADY_EXISTS", "Employee identifier already exists");
  }
  let employee;
  try {
    employee = context.repository.createEmployee({
      status: "onboarding",
      source_ref: "HRX:api:employee-registration",
      ...body,
      tenant_id: actorContext.tenant_id,
    });
  } catch (error) {
    const message = String(error?.message ?? "");
    if (/already exists/i.test(message)) {
      throw safeHrxRuntimeError(409, "HRX_EMPLOYEE_ID_ALREADY_EXISTS", "Employee identifier already exists");
    }
    throw safeHrxRuntimeError(400, "HRX_EMPLOYEE_INPUT_INVALID", message || "Employee input is invalid");
  }
  appendRuntimeAudit(context.audit, {
    ...actorContext,
    action: "hrx.employee.create",
    object_type: "Employee",
    object_id: employee.employee_id,
    reason: "employee_registered_through_api",
    metadata: { status: employee.status },
  });
  return employee;
}

function updateEmployeeThroughRepository(context, actorContext, employeeId, body = {}) {
  const current = context.repository.getEmployee({ tenant_id: actorContext.tenant_id, employee_id: employeeId });
  if (!current) return null;
  let employee;
  try {
    const next = transitionEmployee(current, body);
    employee = context.repository.updateEmployee(
      { tenant_id: actorContext.tenant_id, employee_id: employeeId },
      next,
    );
  } catch (error) {
    throw safeHrxRuntimeError(
      400,
      "HRX_EMPLOYEE_INPUT_INVALID",
      String(error?.message ?? "Employee input is invalid"),
    );
  }
  appendRuntimeAudit(context.audit, {
    ...actorContext,
    action: "hrx.employee.update",
    object_type: "Employee",
    object_id: employee.employee_id,
    reason: "employee_updated_through_api",
    metadata: {
      from_status: current.status,
      to_status: employee.status,
    },
  });
  return employee;
}

function createScopedAiSourceAuthz() {
  return Object.freeze({
    async evaluate(request = {}) {
      const scopes = new Set(Array.isArray(request.actor_scopes) ? request.actor_scopes : []);
      const sensitivity = request.resource?.sensitivity ?? "document";
      const requiredScope = sensitivity === "compensation"
        ? "hrx.compensation.read"
        : sensitivity === "employee"
          ? "hrx.employee.read"
          : "hrx.document.read";
      if (!scopes.has(requiredScope)) {
        return Object.freeze({ effect: "deny", reason: `${requiredScope}_required_for_ai_source` });
      }
      return Object.freeze({ effect: "allow", reason: "hrx_ai_actor_scope_allow" });
    },
  });
}

function hasRow(store, table, where) {
  return Boolean(store.query("selectOne", { table, where }));
}

function seedPatchFor(current, desired, fields) {
  const patch = {};
  for (const field of fields) {
    if (current?.[field] !== desired?.[field]) patch[field] = desired?.[field];
  }
  return patch;
}

function reconcileSeedEmployee(repository, employee) {
  const ref = { tenant_id: employee.tenant_id, employee_id: employee.employee_id };
  const current = repository.getEmployee(ref);
  if (!current) {
    repository.createEmployee(employee);
    return "created";
  }
  const patch = seedPatchFor(current, employee, ["display_name", "legal_name", "work_email", "status", "source_ref"]);
  if (Object.keys(patch).length === 0) return "unchanged";
  repository.updateEmployee(ref, patch);
  return "reconciled";
}

function reconcileSeedEmploymentProfile(repository, profile) {
  const ref = { tenant_id: profile.tenant_id, profile_id: profile.profile_id };
  const current = repository.getEmploymentProfile(ref);
  if (!current) {
    repository.createEmploymentProfile(profile);
    return "created";
  }
  const patch = seedPatchFor(current, profile, [
    "employment_type",
    "status",
    "title",
    "effective_from",
    "source_ref",
  ]);
  if (current.source_ref !== profile.source_ref) {
    patch.org_unit_id = profile.org_unit_id;
    patch.manager_employee_id = profile.manager_employee_id;
  }
  if (Object.keys(patch).length === 0) return "unchanged";
  repository.updateEmploymentProfile(ref, patch);
  return "reconciled";
}

function reconcileHrxMemberRosterTenant(store, tenantId) {
  const repository = createSqlHrxRepository({ store, clock: () => "2026-06-20T00:00:00.000Z" });
  const employees = seedEmployees(tenantId);
  const employeeResults = { created: 0, reconciled: 0 };
  for (const employee of employees) {
    const result = reconcileSeedEmployee(repository, employee);
    if (result === "created") employeeResults.created += 1;
    if (result === "reconciled") employeeResults.reconciled += 1;
  }

  const profiles = seedEmploymentProfiles(tenantId);
  const profileResults = { created: 0, reconciled: 0 };
  for (const profile of profiles) {
    const result = reconcileSeedEmploymentProfile(repository, profile);
    if (result === "created") profileResults.created += 1;
    if (result === "reconciled") profileResults.reconciled += 1;
  }

  return Object.freeze({
    tenant_id: tenantId,
    employees: employees.length,
    employees_created: employeeResults.created,
    employees_reconciled: employeeResults.reconciled,
    employment_profiles: profiles.length,
    employment_profiles_created: profileResults.created,
    employment_profiles_reconciled: profileResults.reconciled,
  });
}

export function reconcileHrxMemberRosterStore(store, options = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("HRX roster reconciliation requires store.query");
  const summaries = resolveSeedTenantIds(options).map((tenantId) => reconcileHrxMemberRosterTenant(store, tenantId));
  if (summaries.length === 1) return summaries[0];
  return Object.freeze({
    tenant_ids: summaries.map((summary) => summary.tenant_id),
    tenants: summaries,
    employees: summaries.reduce((total, summary) => total + summary.employees, 0),
    employment_profiles: summaries.reduce((total, summary) => total + summary.employment_profiles, 0),
  });
}

function seedHrxDurableRuntimeTenant(store, tenantId) {
  const rosterSummary = reconcileHrxMemberRosterTenant(store, tenantId);
  const repository = createSqlHrxRepository({ store, clock: () => "2026-06-20T00:00:00.000Z" });
  const documents = createSqlHrxDocumentStore({ store });
  const compensation = createSqlCompensationRecordStore({ store });
  const leaveLedger = createSqlLeaveBalanceLedger({ store });
  const leaveStore = createSqlLeaveRequestStore({ store });
  const attendance = createSqlAttendanceStore({ store });

  const links = seedEmployeeUserLinks(tenantId);
  for (const link of links) {
    if (!hasRow(store, "hrx_employee_user_links", { tenant_id: link.tenant_id, link_id: link.link_id })) {
      repository.createEmployeeUserLink(link);
    }
  }

  const documentRows = documentSeed(tenantId);
  for (const document of documentRows) {
    if (!hasRow(store, "hrx_documents", { tenant_id: document.tenant_id, document_id: document.document_id })) {
      documents.create(document);
    }
  }

  const compensationRows = compensationSeed(tenantId);
  for (const record of compensationRows) {
    if (!hasRow(store, "hrx_compensation_records", { tenant_id: record.tenant_id, compensation_id: record.compensation_id })) {
      compensation.create(record);
    }
  }

  const ledgerEntries = leaveLedgerSeed(tenantId);
  for (const entry of ledgerEntries) {
    if (!hasRow(store, "hrx_leave_balance_entries", { tenant_id: entry.tenant_id, entry_id: entry.entry_id })) {
      leaveLedger.append(entry);
    }
  }

  const leaveRequests = leaveRequestSeed(tenantId);
  for (const leaveRequest of leaveRequests) {
    if (!hasRow(store, "hrx_leave_requests", { tenant_id: leaveRequest.tenant_id, request_id: leaveRequest.request_id })) {
      leaveStore.create(leaveRequest);
    }
  }

  const attendanceRows = attendanceSeed(tenantId);
  for (const record of attendanceRows) {
    if (!hasRow(store, "hrx_attendance_records", { tenant_id: record.tenant_id, attendance_id: record.attendance_id })) {
      attendance.write(record);
    }
  }

  return Object.freeze({
    tenant_id: tenantId,
    employees: rosterSummary.employees,
    employees_created: rosterSummary.employees_created,
    employees_reconciled: rosterSummary.employees_reconciled,
    employment_profiles: rosterSummary.employment_profiles,
    employment_profiles_created: rosterSummary.employment_profiles_created,
    employment_profiles_reconciled: rosterSummary.employment_profiles_reconciled,
    employee_user_links: links.length,
    documents: documentRows.length,
    compensation_records: compensationRows.length,
    leave_balance_entries: ledgerEntries.length,
    leave_requests: leaveRequests.length,
    attendance_records: attendanceRows.length,
  });
}

export function seedHrxDurableRuntimeStore(store, options = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("HRX durable runtime seed requires store.query");
  const summaries = resolveSeedTenantIds(options).map((tenantId) => seedHrxDurableRuntimeTenant(store, tenantId));
  if (summaries.length === 1) return summaries[0];
  return Object.freeze({
    tenant_ids: summaries.map((summary) => summary.tenant_id),
    tenants: summaries,
    employees: summaries.reduce((total, summary) => total + summary.employees, 0),
    employment_profiles: summaries.reduce((total, summary) => total + summary.employment_profiles, 0),
    employee_user_links: summaries.reduce((total, summary) => total + summary.employee_user_links, 0),
    documents: summaries.reduce((total, summary) => total + summary.documents, 0),
    compensation_records: summaries.reduce((total, summary) => total + summary.compensation_records, 0),
    leave_balance_entries: summaries.reduce((total, summary) => total + summary.leave_balance_entries, 0),
    leave_requests: summaries.reduce((total, summary) => total + summary.leave_requests, 0),
    attendance_records: summaries.reduce((total, summary) => total + summary.attendance_records, 0),
  });
}

function createUnavailablePeopleOutlookConnectionService() {
  function status({ can_manage = false } = {}) {
    return Object.freeze({
      provider: "microsoft_graph",
      connection_state: "reauthorization_required",
      can_manage,
      delegated_scope: "Calendars.ReadBasic",
      connected_at: null,
      expires_at: null,
      safe_error_code: "OUTLOOK_TOKEN_VAULT_REQUIRED",
    });
  }
  function unavailable() {
    throw safeHrxRuntimeError(
      503,
      "OUTLOOK_TOKEN_VAULT_REQUIRED",
      "An operational opaque Outlook token vault is required",
    );
  }
  return Object.freeze({
    status,
    begin: unavailable,
    complete: unavailable,
    disconnect: unavailable,
  });
}

export function createHrxRuntimeContext({
  repository: providedRepository,
  store,
  matterTimeEntries,
  matterDeadlines,
  modelGateway,
  clock: runtimeClock,
  leaveIntegrationProviders,
  leaveIntegrationProviderEnabled = Object.freeze({}),
  allowSyntheticLeaveIntegrationProviders = true,
  payrollArtifactStorage,
  payrollArtifactSecret,
  compensationKeyMaterial,
  allowSyntheticPayrollArtifactSecret = true,
  allowSyntheticCompensationKey = true,
  allowSyntheticPayrollProviders = true,
  payrollProviders = Object.freeze({}),
  peopleFeatureFlags = Object.freeze({}),
  peopleMetricsSink = null,
  peopleTimezone = "Asia/Seoul",
  peopleProviderIdentities: providedPeopleProviderIdentities,
  peopleProviderIdentityRepository: providedPeopleProviderIdentityRepository,
  outlookTokenVault: providedOutlookTokenVault,
  outlookConsentService: providedOutlookConsentService,
  outlookConsentRepository: providedOutlookConsentRepository,
  outlookCalendarCache: providedOutlookCalendarCache,
  peopleOutlookConnections: providedPeopleOutlookConnections,
  peopleOutlookCalendarSource = null,
  outlookCalendarViewAdapter = null,
  outlookConsentRefresh = null,
  outlookSubjectAddressResolver = null,
  outlookStateAuthority = null,
  allowInMemoryOutlookTokenVault = null,
  offboardingAccessSource = null,
  recruitingSourceAuthority = null,
  outlookOauthPort = null,
  seedPayrollRuntime = false,
  seedRuntimeFixtures = true,
} = {}) {
  const peopleRuntimeClock = runtimeClock ?? (() => new Date().toISOString());
  const resolvedPeopleFeatureFlags = resolvePeopleFeatureFlags(peopleFeatureFlags);
  const seedTenantIds = seedRuntimeFixtures ? HRX_DEFAULT_SEED_TENANT_IDS : [];
  const repository = providedRepository ?? (store ? createSqlHrxRepository({ store }) : createInMemoryHrxRepository({
    employees: seedTenantIds.flatMap(seedEmployees),
    employment_profiles: seedTenantIds.flatMap(seedEmploymentProfiles),
    employee_user_links: seedTenantIds.flatMap(seedEmployeeUserLinks),
  }));
  const documents = store
    ? createSqlHrxDocumentStore({ store })
    : createInMemoryHrxDocumentStore(seedTenantIds.flatMap(documentSeed));
  const compensation = store
    ? createSqlCompensationRecordStore({ store })
    : createInMemoryCompensationRecordStore(seedTenantIds.flatMap(compensationSeed));
  const leaveLedger = store
    ? createSqlLeaveBalanceLedger({ store })
    : createInMemoryLeaveBalanceLedger(seedTenantIds.flatMap(leaveLedgerSeed));
  const leaveStore = store
    ? createSqlLeaveRequestStore({ store })
    : createInMemoryLeaveRequestStore(seedTenantIds.flatMap(leaveRequestSeed));
  const attendance = store
    ? createSqlAttendanceStore({ store, ...(runtimeClock ? { clock: runtimeClock } : {}) })
    : createInMemoryAttendanceStore(seedTenantIds.flatMap(attendanceSeed));
  const attendanceCorrectionWorkflow = createAttendanceCorrectionWorkflow({
    attendance,
    store: store ?? null,
    clock: peopleRuntimeClock,
  });
  const overtime = store ? createSqlOvertimeStore({ store }) : createInMemoryOvertimeStore();
  const durableCollections = createHrxDurableRuntimeCollections({ store, seedTenantIds });
  const riskEvents = durableCollections
    ? createDurableHrxRiskEventStore(durableCollections.riskEvents)
    : createInMemoryHrxRiskEventStore();
  const audit = store ? createDurableAuditStore({ store }) : createHrxAuditEventStore();
  const policies = runtimeCollectionRows(durableCollections, "policies", seedTenantIds.flatMap(policySeed));
  const leavePolicyService = store ? createLeavePolicyService({ store }) : null;
  const leaveService = createLeaveRequestService({
    store: leaveStore,
    balanceLedger: leaveLedger,
    audit,
    transactionStore: store,
    policyResolver: ({ tenant_id, policy_id }) => policies.find((policy) => {
      return policy.tenant_id === tenant_id && policy.policy_id === policy_id;
    }),
  });
  const leaveDelegationService = store ? createLeaveApprovalDelegationService({ store }) : null;
  const leaveAccrualService = store
    ? createLeaveAccrualService({
        store,
        approverAuthorizer: ({ tenant_id, actor_id, required_scope }) => {
          const account = REGISTERED_ACCOUNTS.find((candidate) => candidate.user_id === actor_id);
          if (!account || account.status !== "active" || !account.tenant_ids.includes(tenant_id)) return false;
          return resolveLawosUserRoleAssignment(account, { tenantId: tenant_id })?.hrx_scopes?.includes(required_scope) === true;
        },
      })
    : null;
  const leaveAccrualBatchService = store && leaveAccrualService
    ? createLeaveAccrualBatchService({
        store,
        accrualService: leaveAccrualService,
        ...(runtimeClock ? { clock: runtimeClock } : {}),
      })
    : null;
  const leaveOccurrenceUploadBatchService = store && leaveAccrualService
    ? createLeaveOccurrenceUploadBatchService({
        store,
        manualService: leaveAccrualService,
        ...(runtimeClock ? { clock: runtimeClock } : {}),
      })
    : null;
  const leaveReportingService = store
    ? createLeaveReportingService({
        store,
        employeeDirectory: ({ tenant_id }) => employeeDirectoryRows(repository, tenant_id),
      })
    : null;
  const resolvedLeaveIntegrationProviders = leaveIntegrationProviders
    ?? (allowSyntheticLeaveIntegrationProviders ? createInternalLeaveIntegrationProviders() : Object.freeze({}));
  const leaveTerminationService = store
    ? createLeaveTerminationService({
        store,
        approverAuthorizer: ({ tenant_id, actor_id, required_scope }) => {
          const account = REGISTERED_ACCOUNTS.find((candidate) => candidate.user_id === actor_id);
          if (!account || account.status !== "active" || !account.tenant_ids.includes(tenant_id)) return false;
          return resolveLawosUserRoleAssignment(account, { tenantId: tenant_id })?.hrx_scopes?.includes(required_scope) === true;
        },
        payrollReceiptAuthorizer: ({ provider_id }) => {
          const provider = resolvedLeaveIntegrationProviders.payroll;
          return provider?.operational_authority === true && provider?.provider_id === provider_id;
        },
      })
    : null;
  const leavePromotionService = store
    ? createLeavePromotionService({
        store,
        documents,
        employeeDirectory: ({ tenant_id }) => employeeDirectoryRows(repository, tenant_id),
        clock: runtimeClock,
      })
    : null;
  const leaveIntegrationService = store
    ? createLeaveIntegrationService({
        store,
        providers: resolvedLeaveIntegrationProviders,
        providerEnabled: leaveIntegrationProviderEnabled,
        terminationDeliveryRecorder: (context, input) => leaveTerminationService.recordPayrollDelivery(context, input),
        promotionDeliveryRecorder: (context, input) => {
          const recipient = store.query("selectOne", { table: "hrx_leave_promotion_recipients", where: { tenant_id: context.tenant_id, recipient_id: input.recipient_id } });
          if (!recipient) throw new TypeError("Leave promotion recipient not found");
          return leavePromotionService.recordEvidence({ ...context, authorized_employee_ids: [recipient.employee_id] }, input.recipient_id, input);
        },
        clock: runtimeClock,
      })
    : null;
  const leaveEntitlementReadService = store
    ? createLeaveEntitlementReadService({ store, ...(runtimeClock ? { clock: runtimeClock } : {}) })
    : null;
  const leaveEntitlementCommandService = store
    ? createLeaveEntitlementCommandService({ store, ...(runtimeClock ? { clock: runtimeClock } : {}) })
    : null;
  const leaveExpirationService = store
    ? createLeaveExpirationService({ store, ...(runtimeClock ? { clock: runtimeClock } : {}) })
    : null;
  const leaveManagementService = store
    ? createDurableLeaveManagementService({
        store,
        approverResolver: (input) => resolveLeaveApprover(repository, input),
        outboxDispatcher: (context) => leaveIntegrationService.process(context, { limit: 50, aggregate_types: ["LeaveRequest"] }),
      })
    : null;
  const approvals = runtimeCollectionRows(durableCollections, "approvals", seedTenantIds.flatMap(approvalSeed));
  const jobOpenings = runtimeCollectionRows(durableCollections, "jobOpenings", seedTenantIds.flatMap(jobOpeningSeed));
  const candidates = runtimeCollectionRows(durableCollections, "candidates", seedTenantIds.flatMap(candidateSeed));
  const candidateConsents = runtimeCollectionRows(durableCollections, "candidateConsents", seedTenantIds.flatMap(candidateConsentSeed));
  const applications = runtimeCollectionRows(durableCollections, "applications", seedTenantIds.flatMap(applicationSeed));
  const interviews = runtimeCollectionRows(durableCollections, "interviews", seedTenantIds.flatMap(interviewSeed));
  const offers = runtimeCollectionRows(durableCollections, "offers", seedTenantIds.flatMap(offerSeed));
  const recruitingPipelineReceipts = store
    ? store.query("select", { table: "hrx_recruiting_pipeline_receipts", where: {} })
    : [];
  const lifecycleTemplates = runtimeCollectionRows(
    durableCollections,
    "lifecycleTemplates",
    seedTenantIds.flatMap(lifecycleTemplateSeed),
  );
  const onboardingPlans = runtimeCollectionRows(durableCollections, "onboardingPlans", seedTenantIds.flatMap(onboardingSeed));
  const offboardingCases = runtimeCollectionRows(durableCollections, "offboardingCases", seedTenantIds.flatMap(offboardingSeed));
  const offboardingEvidence = runtimeCollectionRows(
    durableCollections,
    "offboardingEvidence",
    seedTenantIds.flatMap(offboardingEvidenceSeed),
  );
  const statutoryTrainings = seedTenantIds.flatMap(statutoryTrainingSeed);
  const aiSourceRegistry = store ? createSqlHrxAiSourceRegistry({ store }) : createHrxAiSourceRegistry();
  for (const source of seedTenantIds.flatMap(aiSourceSeed)) {
    if (!aiSourceRegistry.get({ tenant_id: source.tenant_id, source_ref: source.source_ref })) aiSourceRegistry.index(source);
  }
  const aiSourceChunks = store ? createSqlHrxAiSourceChunkIndex({ store }) : createInMemoryHrxAiSourceChunkIndex();
  for (const chunk of seedTenantIds.flatMap(aiSourceChunkSeed)) {
    if (!aiSourceChunks.get({ tenant_id: chunk.tenant_id, source_ref: chunk.source_ref, chunk_id: chunk.chunk_id })) {
      aiSourceChunks.index(chunk);
    }
  }
  const aiRetriever = createHrxPermissionAwareRetriever({ registry: aiSourceRegistry, authz: createScopedAiSourceAuthz(), chunkIndex: aiSourceChunks });
  const aiReviewQueue = store ? createSqlHrxAiReviewQueue({ store }) : createInMemoryHrxAiReviewQueue();
  const resolvedModelGateway = modelGateway ?? createHrxModelGatewayFromEnv();
  const aiRoute = createHrxAiRoute({ retriever: aiRetriever, reviewQueue: aiReviewQueue, audit, modelGateway: resolvedModelGateway });
  if (store && seedPayrollRuntime) seedSyntheticPayrollRuntimeStore(store, seedTenantIds, { ...(runtimeClock ? { clock: runtimeClock } : {}) });
  const payrollRuntime = createHrxPayrollRuntime({
    store,
    audit,
    ...(runtimeClock ? { clock: runtimeClock } : {}),
    ...(payrollArtifactStorage ? { artifactStorage: payrollArtifactStorage } : {}),
    ...(payrollArtifactSecret ? { artifactSecret: payrollArtifactSecret } : {}),
    ...(compensationKeyMaterial ? { compensationKeyMaterial } : {}),
    allowSyntheticArtifactSecret: allowSyntheticPayrollArtifactSecret,
    allowSyntheticCompensationKey,
    allowSyntheticProviders: allowSyntheticPayrollProviders,
    payrollHandoffEnabled: resolvedPeopleFeatureFlags.payroll_handoff,
    payrollClosePrecheckEnabled: resolvedPeopleFeatureFlags.payroll_close_precheck,
    payrollRulePublishEnabled: resolvedPeopleFeatureFlags.payroll_rule_publish,
    payrollStatementDeliveryEnabled: resolvedPeopleFeatureFlags.payroll_statement_delivery,
    ...payrollProviders,
  });
  const payrollRoute = createHrxPayrollRoute({ audit });
  const payrollRuntimeRoute = createHrxPayrollRuntimeRoute({ runtime: payrollRuntime, store, audit, ...(runtimeClock ? { clock: runtimeClock } : {}) });
  const matterAssignments = Object.freeze(seedTenantIds.flatMap(matterAssignmentSeed));
  const matterTimeEntryRows = Object.freeze(matterTimeEntries ?? seedTenantIds.flatMap(matterTimeEntrySeed));
  const matterDeadlineRows = Object.freeze(matterDeadlines ?? seedTenantIds.flatMap(matterDeadlineSeed));
  const legalPeopleReadModel = createLegalPeopleReadModel({ seed: legalPeopleRuntimeSeed(seedTenantIds) });
  const matterPeopleDocumentGraph = createMatterPeopleDocumentGraphTable(matterPeopleDocumentGraphRuntimeSeed({
    tenantIds: seedTenantIds,
    repository,
    documents,
    matterAssignments,
  }));
  const legalPeopleEthicsReadModel = createLegalPeopleEthicsReadModel({
    seed: Object.freeze({
      review_queue: seedTenantIds.flatMap((tenantId) => createLegalPeopleEthicsSeed(tenantId).review_queue),
      ethical_walls: seedTenantIds.flatMap((tenantId) => createLegalPeopleEthicsSeed(tenantId).ethical_walls),
      permission_links: seedTenantIds.flatMap((tenantId) => createLegalPeopleEthicsSeed(tenantId).permission_links),
      reviewer_receipts: seedTenantIds.flatMap((tenantId) => createLegalPeopleEthicsSeed(tenantId).reviewer_receipts),
    }),
  });
  const allowTestOutlookVault = allowInMemoryOutlookTokenVault ?? seedRuntimeFixtures;
  const outlookTokenVault = providedOutlookTokenVault
    ?? (allowTestOutlookVault
      ? createInMemoryOpaqueTokenVault()
      : null);
  const operationalOutlookStorage = !allowTestOutlookVault
    && Boolean(providedOutlookTokenVault || providedOutlookConsentService);
  const peopleProviderIdentities = providedPeopleProviderIdentities
    ?? createPeopleProviderIdentityRegistry({
      ...(providedPeopleProviderIdentityRepository
        ? { repository: providedPeopleProviderIdentityRepository }
        : {}),
      clock: peopleRuntimeClock,
      operational: operationalOutlookStorage,
    });
  const outlookConsentService = providedOutlookConsentService
    ?? (outlookTokenVault
      ? createOutlookConsentService({
          vault: outlookTokenVault,
          ...(providedOutlookConsentRepository
            ? { repository: providedOutlookConsentRepository }
            : {}),
          clock: peopleRuntimeClock,
          operational: !allowTestOutlookVault,
        })
      : null);
  const outlookCalendarCache = providedOutlookCalendarCache
    ?? createOutlookCalendarCache({ clock: peopleRuntimeClock });
  const peopleOutlookConnections = providedPeopleOutlookConnections
    ?? (outlookConsentService
      ? createPeopleOutlookConnectionService({
          identityRegistry: peopleProviderIdentities,
          consentService: outlookConsentService,
          calendarCache: outlookCalendarCache,
          oauthPort: outlookOauthPort,
          clock: peopleRuntimeClock,
          ...(outlookStateAuthority ? { stateAuthority: outlookStateAuthority } : {}),
          operational:
            operationalOutlookStorage &&
            resolvedPeopleFeatureFlags.outlook_calendar,
        })
      : createUnavailablePeopleOutlookConnectionService());
  const resolvedPeopleOutlookCalendarSource = peopleOutlookCalendarSource
    ?? (resolvedPeopleFeatureFlags.outlook_calendar
      ? (outlookConsentService
        ? createPeopleOutlookCalendarSource({
            identityRegistry: peopleProviderIdentities,
            consentService: outlookConsentService,
            calendarCache: outlookCalendarCache,
            calendarViewAdapter: outlookCalendarViewAdapter,
            refreshConsent: outlookConsentRefresh
              ?? (typeof outlookOauthPort?.refresh === "function"
                ? (input) => outlookOauthPort.refresh(input)
                : null),
            resolveSubjectAddress: outlookSubjectAddressResolver
              ?? (typeof outlookOauthPort?.resolveSubjectAddress === "function"
                ? (input) => outlookOauthPort.resolveSubjectAddress(input)
                : null),
            clock: peopleRuntimeClock,
          })
        : createUnavailablePeopleOutlookCalendarSource({
            safe_error_code: "OUTLOOK_TOKEN_VAULT_REQUIRED",
          }))
      : null);

  for (const tenantId of seedTenantIds) {
    appendRuntimeAudit(audit, {
      tenant_id: tenantId,
      actor_id: "system-seed",
      action: "hrx.audit.seed",
      object_type: "HRXRuntime",
      object_id: "seed",
      reason: "synthetic_runtime_seeded",
    });
  }

  return Object.freeze({
    clock: peopleRuntimeClock,
    peopleFeatureFlags: resolvedPeopleFeatureFlags,
    peopleMetricsSink,
    peopleTimezone,
    repository,
    documents,
    compensation,
    leaveLedger,
    leaveStore,
    leaveService,
    leaveManagementService,
    leaveDelegationService,
    leaveAccrualService,
    leaveAccrualBatchService,
    leaveOccurrenceUploadBatchService,
    leaveReportingService,
    leaveTerminationService,
    leavePromotionService,
    leaveIntegrationService,
    leaveEntitlementCommandService,
    leaveEntitlementReadService,
    leaveExpirationService,
    leaveManagementStore: store ?? null,
    attendance,
    attendanceCorrectionWorkflow,
    overtime,
    riskEvents,
    audit,
    approvals,
    applications,
    candidates,
    candidateConsents,
    interviews,
    offers,
    recruitingPipelineReceipts,
    lifecycleTemplates,
    onboardingPlans,
    offboardingCases,
    offboardingEvidence,
    durableCollections,
    statutoryTrainings,
    jobOpenings,
    recruitingSourceAuthority,
    policies,
    leavePolicyService,
    aiSourceRegistry,
    aiSourceChunks,
    aiRetriever,
    aiReviewQueue,
    modelGateway: resolvedModelGateway,
    aiRoute,
    payrollRoute,
    payrollRuntime,
    payrollRuntimeRoute,
    matterAssignments,
    matterTimeEntries: matterTimeEntryRows,
    matterDeadlines: matterDeadlineRows,
    peopleProviderIdentities,
    outlookTokenVault,
    outlookConsentService,
    outlookCalendarCache,
    peopleOutlookConnections,
    peopleOutlookCalendarSource: resolvedPeopleOutlookCalendarSource,
    outlookStateAuthority,
    offboardingAccessSource,
    legalPeopleReadModel,
    matterPeopleDocumentGraph,
    legalPeopleEthicsReadModel,
  });
}

function requirePeopleOutlookMember({
  context,
  actorContext,
  permissionContext,
  employeeId,
}) {
  if (!context.peopleFeatureFlags.outlook_calendar) {
    throw safeHrxRuntimeError(404, "OUTLOOK_CALENDAR_DISABLED", "Outlook calendar is disabled");
  }
  if (!validPeopleEmployeeId(employeeId)) {
    throw safeHrxRuntimeError(400, "PEOPLE_MEMBER_ID_INVALID", "employeeId must be a safe identifier");
  }
  const employee = context.repository.getEmployee({
    tenant_id: actorContext.tenant_id,
    employee_id: employeeId,
  });
  if (!employee) throw safeHrxRuntimeError(404, "PEOPLE_MEMBER_NOT_FOUND", "People member was not found");
  const canManage = employeeIdsForActor(
    context.repository,
    actorContext.tenant_id,
    actorContext.actor_id,
  ).has(employeeId);
  if (!actorHasElevatedHrxRead(actorContext) && !canManage) {
    throw safeHrxRuntimeError(403, "PEOPLE_MEMBER_READ_DENIED", "People member access is denied");
  }
  const guarded = employeeGuardResponse({ permissionContext, actorContext });
  if (guarded && guarded.status === 403) {
    throw safeHrxRuntimeError(403, "PEOPLE_MEMBER_READ_DENIED", "People member access is denied");
  }
  return Object.freeze({ employee, can_manage: canManage });
}

function peopleOutlookConnectionResponse({
  context,
  actorContext,
  permissionContext,
  employeeId,
  method,
  body,
}) {
  const member = requirePeopleOutlookMember({
    context,
    actorContext,
    permissionContext,
    employeeId,
  });
  let connection;
  let auditAction = "hrx.people.outlook_connection.read";
  const signedPrincipal = {
    user_id: actorContext.actor_id,
    session_email: actorContext.email,
    entra_subject_id: actorContext.entra_subject_id,
  };
  if (method === "GET") {
    connection = context.peopleOutlookConnections.status({
      tenant_id: actorContext.tenant_id,
      employee_id: employeeId,
      can_manage: member.can_manage,
      ...signedPrincipal,
    });
  } else if (method === "DELETE") {
    auditAction = "hrx.people.outlook_connection.disconnect";
    connection = context.peopleOutlookConnections.disconnect({
      tenant_id: actorContext.tenant_id,
      employee_id: employeeId,
      can_manage: member.can_manage,
      ...signedPrincipal,
    });
  } else if (method === "POST") {
    const action = body?.action;
    if (action === "begin" || action === "retry") {
      auditAction = "hrx.people.outlook_connection.begin";
      connection = context.peopleOutlookConnections.begin({
        tenant_id: actorContext.tenant_id,
        employee_id: employeeId,
        can_manage: member.can_manage,
        ...signedPrincipal,
      });
    } else if (action === "complete") {
      auditAction = "hrx.people.outlook_connection.complete";
      connection = context.peopleOutlookConnections.complete({
        tenant_id: actorContext.tenant_id,
        employee_id: employeeId,
        can_manage: member.can_manage,
        ...signedPrincipal,
        authorization_code: body.authorization_code,
        state_ref: body.state_ref,
        ...(Object.hasOwn(body, "access_token") ? { access_token: body.access_token } : {}),
        ...(Object.hasOwn(body, "refresh_token") ? { refresh_token: body.refresh_token } : {}),
        ...(Object.hasOwn(body, "email") ? { email: body.email } : {}),
      });
    } else {
      throw safeHrxRuntimeError(400, "OUTLOOK_CONNECTION_ACTION_INVALID", "Outlook connection action is invalid");
    }
  } else {
    throw safeHrxRuntimeError(405, "OUTLOOK_CONNECTION_METHOD_NOT_ALLOWED", "Outlook connection method is not allowed");
  }
  const finish = (resolvedConnection) => {
    appendRuntimeAudit(context.audit, {
      ...actorContext,
      action: auditAction,
      object_type: "PeopleOutlookConnection",
      object_id: employeeId,
      reason: resolvedConnection.connection_state,
      metadata: {
        employee_id: employeeId,
        connection_state: resolvedConnection.connection_state,
        delegated_scope: resolvedConnection.delegated_scope,
        secret_material_recorded: false,
      },
    });
    return Object.freeze({
      outcome: "ok",
      connection: resolvedConnection,
    });
  };
  return connection && typeof connection.then === "function"
    ? connection.then(finish)
    : finish(connection);
}

export function handleHrxApiRequest({
  pathname,
  method,
  query = {},
  body = {},
  context,
  matterContext = null,
  requestContext,
  permissionContext = null,
}) {
  try {
    const actorContext = requireTrustedRequestContext(requestContext);
    const tenantId = actorContext.tenant_id;

    const peopleOutlookConnectionMatch = pathname.match(/^\/api\/hrx\/people\/members\/([^/]+)\/outlook-connection$/);
    if (peopleOutlookConnectionMatch && ["GET", "POST", "DELETE"].includes(method)) {
      let employeeId;
      try {
        employeeId = decodeURIComponent(peopleOutlookConnectionMatch[1]);
      } catch {
        throw safeHrxRuntimeError(400, "PEOPLE_MEMBER_ID_INVALID", "employeeId encoding is invalid");
      }
      return responseMaybe(200, runPeopleFeatureRequest({
        context,
        actorContext,
        feature: "outlook_calendar",
        operation: () => peopleOutlookConnectionResponse({
          context,
          actorContext,
          permissionContext,
          employeeId,
          method,
          body,
        }),
      }));
    }

    if (pathname === "/api/hrx/people/team-operations" && method === "GET") {
      return responseMaybe(200, runPeopleFeatureRequest({
        context,
        actorContext,
        feature: "people_overview",
        operation: () => readPeopleTeamOperations({
          context,
          matterContext,
          actorContext,
          permissionContext,
        }),
      }));
    }

    const peopleDailyBriefMatch = pathname.match(/^\/api\/hrx\/people\/members\/([^/]+)\/daily-brief$/);
    if (peopleDailyBriefMatch && method === "GET") {
      let employeeId;
      try {
        employeeId = decodeURIComponent(peopleDailyBriefMatch[1]);
      } catch {
        throw safeHrxRuntimeError(400, "PEOPLE_MEMBER_ID_INVALID", "employeeId encoding is invalid");
      }
      return responseMaybe(200, runPeopleFeatureRequest({
        context,
        actorContext,
        feature: "people_member_brief",
        operation: () => readPeopleDailyBrief({
          context,
          matterContext,
          actorContext,
          permissionContext,
          employeeId,
        }),
      }));
    }

    if (pathname === "/api/hrx/employees" && method === "GET") {
      const guarded = employeeGuardResponse({ permissionContext, actorContext });
      if (guarded) return guarded;
      const asOf = requestedAsOfDate(query.as_of);
      const rows = employeeDirectoryRows(context.repository, tenantId, { asOf });
      if (actorHasElevatedHrxRead(actorContext)) return response(200, { outcome: "ok", employees: rows });
      const employeeIds = employeeIdsForActor(context.repository, tenantId, actorContext.actor_id);
      return response(200, {
        outcome: "ok",
        employees: rows.filter((employee) => employeeIds.has(employee.employee_id)),
        permission_summary: {
          actor_id: actorContext.actor_id,
          self_service_filtered: true,
          count_leak_prevented: true,
        },
      });
    }

    if (pathname === "/api/hrx/org-chart" && method === "GET") {
      const guarded = employeeGuardResponse({ permissionContext, actorContext });
      if (guarded) return guarded;
      const asOf = requestedAsOfDate(query.as_of);
      if (actorHasElevatedHrxRead(actorContext)) return response(200, buildHrxOrgChart(context, actorContext, { asOf }));
      const employeeIds = employeeIdsForActor(context.repository, tenantId, actorContext.actor_id);
      return response(200, buildHrxOrgChart(context, actorContext, { employeeIds, asOf }));
    }

    if (pathname === "/api/hrx/employees" && method === "POST") {
      const employee = createEmployeeThroughRepository(context, actorContext, body);
      return response(201, {
        outcome: "created",
        employee: {
          ...employee,
          display_name: publicEmployeeDisplayName(employee),
        },
      });
    }

    if (pathname === "/api/hrx/employee-user-links" && method === "GET") {
      const links = context.repository.listEmployeeUserLinks({
        tenant_id: tenantId,
        employee_id: query.employee_id,
        user_id: query.user_id,
      });
      const linkedUserIds = new Set(
        context.repository.listEmployeeUserLinks({ tenant_id: tenantId })
          .map((link) => String(link.user_id ?? "").trim())
          .filter(Boolean),
      );
      const canManageLoginAccounts = new Set(actorContext.hrx_scopes ?? [])
        .has("hrx.employee.write");
      const presentationText = (value, userId) => {
        const text = publicPeopleLabel(value, {
          references: [userId],
          fallback: "",
        });
        return text || null;
      };
      const candidates = (canManageLoginAccounts
        ? matterContext?.userDirectory?.listUsers?.({ tenant_id: tenantId }) ?? []
        : [])
        .filter((user) => (
          user?.status === "active"
          && user?.login_allowed === true
          && !linkedUserIds.has(String(user?.user_id ?? "").trim())
        ))
        .map((user) => {
          const userId = String(user?.user_id ?? "").trim();
          const displayName = presentationText(user?.display_name, userId);
          const emailText = typeof user?.email === "string" ? user.email.trim() : "";
          const emailLocalPart = emailText.split("@", 1)[0];
          const normalizedUserId = userId.toLowerCase();
          const email = emailText.includes("@")
            && (!normalizedUserId || !emailLocalPart.toLowerCase().includes(normalizedUserId))
            ? emailText
            : null;
          const title = presentationText(user?.source_title, userId);
          const accountLabel = [displayName, email].filter(Boolean).join(" · ");
          if (!userId || !accountLabel) return null;
          return Object.freeze({
            user_id: userId,
            display_name: displayName,
            email,
            title,
            account_label: accountLabel,
          });
        })
        .filter(Boolean)
        .sort((left, right) => left.account_label.localeCompare(right.account_label, "ko-KR"));
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.employee_user_link.read",
        object_type: "EmployeeUserLink",
        object_id: query.employee_id ?? query.user_id ?? "list",
        reason: "employee_user_links_listed",
        metadata: { result_count: links.length },
      });
      return response(200, {
        outcome: "ok",
        links,
        candidates,
        can_manage: canManageLoginAccounts,
      });
    }

    if (pathname === "/api/hrx/employee-user-links" && method === "POST") {
      const employeeId = typeof body.employee_id === "string" ? body.employee_id.trim() : "";
      const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
      if (!employeeId || !context.repository.getEmployee({ tenant_id: tenantId, employee_id: employeeId })) {
        throw safeHrxRuntimeError(404, "HRX_EMPLOYEE_NOT_FOUND", "Employee not found");
      }
      if (
        userId &&
        context.repository.listEmployeeUserLinks({ tenant_id: tenantId, user_id: userId }).some(
          (current) => current.purpose === (body.purpose ?? "login_mapping"),
        )
      ) {
        throw safeHrxRuntimeError(
          409,
          "HRX_EMPLOYEE_USER_LINK_DUPLICATE",
          "User already has an active Employee login mapping",
        );
      }
      const activeTenantUser = (matterContext?.userDirectory?.listUsers?.({
        tenant_id: tenantId,
        user_id: userId,
      }) ?? []).find((user) => user?.status === "active" && user?.login_allowed === true);
      if (!userId || !activeTenantUser) {
        throw safeHrxRuntimeError(
          400,
          "HRX_EMPLOYEE_USER_LINK_USER_INVALID",
          "Login account must be an active user in the current tenant",
        );
      }
      let link;
      try {
        link = context.repository.createEmployeeUserLink({
          purpose: "login_mapping",
          source_ref: "HRX:api:employee-user-link",
          ...body,
          tenant_id: tenantId,
        });
      } catch (error) {
        const message = String(error?.message ?? "");
        if (/already exists/i.test(message)) {
          throw safeHrxRuntimeError(409, "HRX_EMPLOYEE_USER_LINK_DUPLICATE", "Login mapping already exists");
        }
        throw safeHrxRuntimeError(400, "HRX_EMPLOYEE_USER_LINK_INVALID", message || "Login mapping is invalid");
      }
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.employee_user_link.create",
        object_type: "EmployeeUserLink",
        object_id: link.link_id,
        reason: "employee_user_link_created",
        metadata: { employee_id: link.employee_id, user_id: link.user_id, purpose: link.purpose },
      });
      return response(201, { outcome: "created", link });
    }

    const employeeUserLinkRevokeMatch = pathname.match(/^\/api\/hrx\/employee-user-links\/([^/]+)\/revoke$/);
    if (employeeUserLinkRevokeMatch && method === "POST") {
      const linkId = decodeURIComponent(employeeUserLinkRevokeMatch[1]);
      const revoked = context.repository.revokeEmployeeUserLink({ tenant_id: tenantId, link_id: linkId });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.employee_user_link.revoke",
        object_type: "EmployeeUserLink",
        object_id: linkId,
        reason: revoked ? "employee_user_link_revoked" : "employee_user_link_revoke_missing",
        metadata: { revoked },
      });
      if (!revoked) return response(404, { outcome: "not_found", safe_error_code: "HRX_EMPLOYEE_USER_LINK_NOT_FOUND" });
      return response(200, { outcome: "revoked", revoked });
    }

    if (pathname === "/api/hrx/legal-people/search" && method === "GET") {
      const guarded = legalPeopleGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.legal_people.read",
        resourceId: "search",
        shape: "search",
      });
      if (guarded) return guarded;
      const legalPermissionContext = createLegalPeoplePermissionContext(actorContext);
      const result = context.legalPeopleReadModel.searchPeople({ ...query, tenant_id: tenantId }, legalPermissionContext);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.legal_people.search",
        object_type: "LegalPerson",
        object_id: "search",
        reason: "legal_people_search_listed",
        metadata: {
          result_count: result.people.length,
          sensitive_fields_visible: legalPermissionContext.can_view_sensitive_relationship_details,
        },
      });
      return response(200, result);
    }

    if (pathname === "/api/hrx/legal-people/relationships" && method === "GET") {
      const guarded = legalPeopleGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.legal_people.relationships.read",
        resourceId: query.person_id ?? query.target_id ?? "relationships",
        shape: "relationships",
      });
      if (guarded) return guarded;
      const legalPermissionContext = createLegalPeoplePermissionContext(actorContext);
      const result = context.legalPeopleReadModel.listRelationships({ ...query, tenant_id: tenantId }, legalPermissionContext);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.legal_people.relationships.read",
        object_type: "LegalPeopleRelationship",
        object_id: query.person_id ?? query.target_id ?? "relationships",
        reason: "legal_people_relationships_listed",
        metadata: {
          result_count: result.relationships.length,
          sensitive_fields_visible: legalPermissionContext.can_view_sensitive_relationship_details,
        },
      });
      return response(200, result);
    }

    if (pathname === "/api/hrx/legal-people/matter-graph/traverse" && method === "GET") {
      const guarded = legalPeopleGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.legal_people.graph.read",
        resourceId: query.matter_id ?? query.start_id ?? "matter-graph",
        shape: "relationships",
      });
      if (guarded) return guarded;
      const legalPermissionContext = createLegalPeoplePermissionContext(actorContext);
      const result = context.matterPeopleDocumentGraph.traverse(
        {
          tenant_id: tenantId,
          start_type: query.start_type ?? "matter",
          start_id: query.start_id ?? query.matter_id,
          depth: query.depth ?? 2,
        },
        legalPermissionContext,
      );
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.legal_people.graph.read",
        object_type: "MatterPeopleDocumentGraph",
        object_id: query.matter_id ?? query.start_id ?? "matter-graph",
        reason: "matter_people_document_graph_traversed",
        metadata: {
          node_count: result.nodes.length,
          relationship_count: result.relationships.length,
          path_count: result.traversal_paths.length,
          sensitive_fields_visible: legalPermissionContext.can_view_sensitive_relationship_details,
        },
      });
      return response(result.outcome === "ok" ? 200 : 404, result);
    }

    if (pathname === "/api/hrx/legal-people/ethics" && method === "GET") {
      const guarded = legalPeopleGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.legal_people.ethics.read",
        resourceId: query.person_id ?? query.matter_id ?? "ethics",
        shape: "ethics",
      });
      if (guarded) return guarded;
      const legalPermissionContext = createLegalPeoplePermissionContext(actorContext);
      const result = context.legalPeopleEthicsReadModel.getEthicsOverview({ ...query, tenant_id: tenantId }, legalPermissionContext);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.legal_people.ethics.read",
        object_type: "LegalPeopleEthicsReview",
        object_id: query.person_id ?? query.matter_id ?? "ethics",
        reason: "legal_people_ethics_surface_read",
        metadata: {
          review_item_count: result.review_queue.length,
          ethical_wall_count: result.ethical_walls.length,
          reviewer_details_visible: result.permission_summary.can_view_reviewer_details,
        },
      });
      return response(200, result);
    }

    const legalPeopleDetailMatch = pathname.match(/^\/api\/hrx\/legal-people\/([^/]+)$/);
    if (legalPeopleDetailMatch && method === "GET") {
      const personId = decodeURIComponent(legalPeopleDetailMatch[1]);
      const guarded = legalPeopleGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.legal_people.detail.read",
        resourceId: personId,
        shape: "detail",
      });
      if (guarded) return guarded;
      const legalPermissionContext = createLegalPeoplePermissionContext(actorContext);
      const result = context.legalPeopleReadModel.getPersonDetail({ tenant_id: tenantId, person_id: personId }, legalPermissionContext);
      if (!result) return response(404, { outcome: "not_found", safe_error_code: "HRX_LEGAL_PERSON_NOT_FOUND" });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.legal_people.detail.read",
        object_type: "LegalPerson",
        object_id: personId,
        reason: "legal_people_detail_read",
        metadata: {
          relationship_count: result.relationships.length,
          sensitive_fields_visible: legalPermissionContext.can_view_sensitive_relationship_details,
        },
      });
      return response(200, result);
    }

    const orgChartEmployeeMatch = pathname.match(/^\/api\/hrx\/org-chart\/employees\/([^/]+)$/);
    if (orgChartEmployeeMatch && method === "PATCH") {
      const employeeId = decodeURIComponent(orgChartEmployeeMatch[1]);
      const employmentProfile = updateHrxOrganizationAssignment(context, actorContext, employeeId, body);
      return response(200, {
        outcome: "updated",
        employment_profile: employmentProfile,
        org_chart: buildHrxOrgChart(context, actorContext, { asOf: currentDateKey() }),
      });
    }

    const employmentProfilesMatch = pathname.match(/^\/api\/hrx\/employees\/([^/]+)\/employment-profiles$/);
    if (employmentProfilesMatch && ["GET", "POST"].includes(method)) {
      const employeeId = decodeURIComponent(employmentProfilesMatch[1]);
      const selfGuard = method === "GET"
        ? selfServiceReadGuard({
            repository: context.repository,
            actorContext,
            targetEmployeeId: employeeId,
            emptyBody: { employment_profiles: [], current: null, scheduled: [], past: [] },
          })
        : null;
      if (selfGuard) return selfGuard;
      const employee = context.repository.getEmployee({ tenant_id: tenantId, employee_id: employeeId });
      if (!employee) return response(404, { outcome: "not_found", safe_error_code: "HRX_EMPLOYEE_NOT_FOUND" });
      if (method === "POST") {
        const employmentProfile = scheduleEmploymentProfileChange(
          context,
          actorContext,
          employeeId,
          body,
        );
        const timeline = employmentProfileTimeline(
          context.repository.listEmploymentProfiles({ tenant_id: tenantId, employee_id: employeeId }),
          { as_of: requestedAsOfDate(query.as_of) },
        );
        return response(201, {
          outcome: "created",
          employment_profile: employmentProfile,
          ...timeline,
          employment_profiles: timeline.all,
        });
      }
      const timeline = employmentProfileTimeline(
        context.repository.listEmploymentProfiles({ tenant_id: tenantId, employee_id: employeeId }),
        { as_of: requestedAsOfDate(query.as_of) },
      );
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.employment_profile.read",
        object_type: "EmploymentProfile",
        object_id: employeeId,
        reason: "employment_profile_timeline_read",
        metadata: {
          employee_id: employeeId,
          as_of: timeline.as_of,
          result_count: timeline.all.length,
        },
      });
      return response(200, {
        outcome: "ok",
        ...timeline,
        employment_profiles: timeline.all,
      });
    }

    const employeeMatch = pathname.match(/^\/api\/hrx\/employees\/([^/]+)$/);
    if (employeeMatch && method === "PATCH") {
      const employeeId = decodeURIComponent(employeeMatch[1]);
      const employee = updateEmployeeThroughRepository(context, actorContext, employeeId, body);
      if (!employee) return response(404, { outcome: "not_found", safe_error_code: "HRX_EMPLOYEE_NOT_FOUND" });
      return response(200, {
        outcome: "updated",
        employee: {
          ...employee,
          display_name: publicEmployeeDisplayName(employee),
        },
      });
    }

    if (employeeMatch && method === "GET") {
      const employeeId = decodeURIComponent(employeeMatch[1]);
      const selfGuard = selfServiceReadGuard({
        repository: context.repository,
        actorContext,
        targetEmployeeId: employeeId,
        emptyBody: { employee: null, employment_profile: null, masked_compensation_ref: null },
      });
      if (selfGuard) return selfGuard;
      const employee = context.repository.getEmployee({ tenant_id: tenantId, employee_id: employeeId });
      if (!employee) return response(404, { outcome: "not_found", safe_error_code: "HRX_EMPLOYEE_NOT_FOUND" });
      const employmentProfile = currentEmploymentProfile(
        context.repository,
        tenantId,
        employeeId,
        requestedAsOfDate(query.as_of),
      );
      const rosterReadFields = employeeRosterReadFields(employee, employmentProfile);
      const manager = employmentProfile?.manager_employee_id
        ? context.repository.getEmployee({ tenant_id: tenantId, employee_id: employmentProfile.manager_employee_id })
        : null;
      return response(200, {
        outcome: "ok",
        employee: {
          ...employee,
          display_name: publicEmployeeDisplayName(employee),
          ...rosterReadFields,
          manager_display_name: manager ? publicEmployeeDisplayName(manager) : null,
        },
        employment_profile: employmentProfile ?? null,
        professional_profile: rosterReadFields.professional_profile,
        masked_compensation_ref: latestMaskedCompensationRef(context.compensation, tenantId, employeeId),
      });
    }

    if (pathname === "/api/hrx/compensation" && method === "GET") {
      const employeeId = query.employee_id;
      const guarded = hrxReadGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.compensation.read",
        resourceType: "CompensationRecord",
        resourceId: employeeId ?? "compensation",
        schemaVersion: "lawos.hrx.compensation.guarded_response.v0.1",
        deniedCode: "HRX_COMPENSATION_ACCESS_DENIED",
        reviewCode: "HRX_COMPENSATION_REVIEW_REQUIRED",
        claimBoundary: "hrx.compensation.read_guarded",
        emptyBody: { compensation_records: [], masked_compensation_ref: null },
        permissionSummary: {
          compensation_ref_visible: false,
          raw_amount_included: false,
          payroll_runtime_opened: false,
        },
      });
      if (guarded) return guarded;
      const selfGuard = selfServiceReadGuard({
        repository: context.repository,
        actorContext,
        targetEmployeeId: employeeId,
        emptyBody: { compensation_records: [], masked_compensation_ref: null },
      });
      if (selfGuard) return selfGuard;
      const records = context.compensation.visible({ tenant_id: tenantId, employee_id: employeeId });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.compensation.read",
        object_type: "CompensationRecord",
        object_id: employeeId ?? "compensation",
        reason: "compensation_record_refs_read",
        metadata: {
          employee_id: employeeId ?? null,
          record_count: records.length,
          raw_amount_included: false,
        },
      });
      return response(200, {
        outcome: "ok",
        compensation_records: records,
        masked_compensation_ref: records[0]?.masked_compensation_ref ?? null,
        payroll_runtime_opened: false,
      });
    }

    const compensationDecryptMatch = pathname.match(/^\/api\/hrx\/compensation\/([^/]+)\/decrypt$/);
    if (compensationDecryptMatch && method === "GET") {
      const compensationId = decodeURIComponent(compensationDecryptMatch[1]);
      const record = context.compensation.get({ tenant_id: tenantId, compensation_id: compensationId });
      if (!record) return response(404, { outcome: "not_found", safe_error_code: "HRX_COMPENSATION_RECORD_NOT_FOUND" });
      const guarded = hrxReadGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.compensation.read",
        resourceType: "CompensationRecord",
        resourceId: compensationId,
        schemaVersion: "lawos.hrx.compensation.decrypt_response.v0.1",
        deniedCode: "HRX_COMPENSATION_ACCESS_DENIED",
        reviewCode: "HRX_COMPENSATION_REVIEW_REQUIRED",
        claimBoundary: "hrx.compensation.decrypt_guarded",
        emptyBody: { compensation_amount: null },
        permissionSummary: {
          compensation_amount_visible: false,
          encrypted_amount_ref_included: false,
          payroll_runtime_opened: false,
        },
      });
      if (guarded) return guarded;
      const selfGuard = selfServiceReadGuard({
        repository: context.repository,
        actorContext,
        targetEmployeeId: record.employee_id,
        emptyBody: { compensation_amount: null },
      });
      if (selfGuard) return selfGuard;
      const maskedCompensationRef = maskCompensationRef(record.encrypted_amount_ref);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.compensation.decrypt",
        object_type: "CompensationRecord",
        object_id: record.compensation_id,
        reason: "compensation_ref_confirmed_after_step_up",
        metadata: {
          employee_id: record.employee_id,
          encrypted_amount_ref_included: false,
          amount_minor_included: false,
          payroll_runtime_opened: false,
        },
      });
      return response(200, {
        outcome: "ok",
        compensation_id: record.compensation_id,
        employee_id: record.employee_id,
        masked_compensation_ref: maskedCompensationRef,
        compensation_amount: null,
        currency_ref: record.currency_ref,
        encrypted_amount_ref_included: false,
        raw_amount_included: false,
        payroll_runtime_opened: false,
      });
    }

    if (pathname === "/api/hrx/documents/expiring" && method === "GET") {
      const guarded = hrxReadGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.document.read",
        resourceType: "HrxDocument",
        resourceId: query.employee_id ?? "documents-expiring",
        schemaVersion: "lawos.hrx.document.expiring_response.v0.1",
        deniedCode: "HRX_DOCUMENT_ACCESS_DENIED",
        reviewCode: "HRX_DOCUMENT_REVIEW_REQUIRED",
        claimBoundary: "hrx.document.expiring_read_guarded",
        emptyBody: { documents: [], within_days: Number(query.days ?? 30) },
        permissionSummary: {
          document_metadata_visible: false,
          source_refs_visible: false,
          provider_payload_included: false,
        },
      });
      if (guarded) return guarded;
      const selfGuard = selfServiceReadGuard({
        repository: context.repository,
        actorContext,
        targetEmployeeId: query.employee_id,
        emptyBody: { documents: [], within_days: Number(query.days ?? 30) },
      });
      if (selfGuard) return selfGuard;
      const documents = context.documents.listExpiring({
        tenant_id: tenantId,
        employee_id: query.employee_id,
        as_of: query.as_of ?? currentDateKey(),
        days: query.days ?? 30,
      });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.document.expiring.read",
        object_type: "HRDocument",
        object_id: query.employee_id ?? "documents-expiring",
        reason: "hrx_contract_documents_expiring_listed",
        metadata: { result_count: documents.length, within_days: Number(query.days ?? 30) },
      });
      return response(200, { outcome: "ok", documents, within_days: Number(query.days ?? 30) });
    }

    if (pathname === "/api/hrx/documents" && method === "GET") {
      const guarded = hrxReadGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.document.read",
        resourceType: "HrxDocument",
        resourceId: query.employee_id ?? query.document_id ?? "documents",
        schemaVersion: "lawos.hrx.document.guarded_response.v0.1",
        deniedCode: "HRX_DOCUMENT_ACCESS_DENIED",
        reviewCode: "HRX_DOCUMENT_REVIEW_REQUIRED",
        claimBoundary: "hrx.document.read_guarded",
        emptyBody: { documents: [] },
        permissionSummary: {
          document_metadata_visible: false,
          source_refs_visible: false,
          provider_payload_included: false,
        },
      });
      if (guarded) return guarded;
      const selfGuard = selfServiceReadGuard({
        repository: context.repository,
        actorContext,
        targetEmployeeId: query.employee_id,
        emptyBody: { documents: [] },
      });
      if (selfGuard) return selfGuard;
      return response(200, {
        outcome: "ok",
        documents: context.documents.list({ tenant_id: tenantId, employee_id: query.employee_id }),
      });
    }

    if (pathname === "/api/hrx/documents" && method === "POST") {
      const employeeId = body.employee_id;
      const sourceRef = body.source_ref ?? `DMS:employment-contract:${employeeId}:${Date.now()}`;
      const document = context.documents.create({
        document_id: body.document_id ?? `doc-${randomUUID()}`,
        document_type: "employment_contract",
        source_ref: sourceRef,
        source_provider: body.source_provider ?? "dms",
        source_status: body.source_status ?? "verified",
        source_verified_at: body.source_verified_at ?? new Date().toISOString(),
        source_version_ref: body.source_version_ref ?? null,
        source_metadata: body.source_metadata ?? { generated_by: "hrx_document_lifecycle" },
        title: body.title ?? "근로계약서",
        contract_id: body.contract_id ?? `contract-${randomUUID()}`,
        profile_id: body.profile_id ?? employmentProfileIdForEmployee(context.repository, tenantId, employeeId),
        contract_state: body.contract_state ?? "draft",
        document_ref: body.document_ref ?? sourceRef,
        expires_on: body.expires_on ?? null,
        tenant_id: tenantId,
        employee_id: employeeId,
      });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.document.metadata.create",
        object_type: "HRDocument",
        object_id: document.document_id,
        reason: "hrx_contract_document_created",
        metadata: documentAuditMetadata(document),
      });
      return response(201, { outcome: "created", document });
    }

    const documentLifecycleMatch = pathname.match(/^\/api\/hrx\/documents\/([^/]+)\/(sign|expire|renew|terminate)$/);
    if (documentLifecycleMatch && method === "POST") {
      const documentId = decodeURIComponent(documentLifecycleMatch[1]);
      const action = documentLifecycleMatch[2];
      const change = action === "sign"
        ? { state: "signed", signature_ref: body.signature_ref, signed_at: body.signed_at ?? new Date().toISOString() }
        : action === "expire"
          ? { state: "expired", expired_at: body.expired_at ?? new Date().toISOString() }
          : action === "renew"
            ? { state: "renewed", expires_on: body.expires_on, renewal_of_contract_id: body.renewal_of_contract_id ?? documentId }
            : { state: "terminated" };
      const document = context.documents.transitionContract({ tenant_id: tenantId, document_id: documentId }, change);
      if (!document) return response(404, { outcome: "not_found", safe_error_code: "HRX_DOCUMENT_NOT_FOUND" });
      const outcome = action === "sign" ? "signed" : action === "expire" ? "expired" : action === "renew" ? "renewed" : "terminated";
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: `hrx.document.contract.${action}`,
        object_type: "HRDocument",
        object_id: document.document_id,
        reason: `hrx_contract_document_${outcome}`,
        metadata: documentAuditMetadata(document),
      });
      return response(200, { outcome, document });
    }

    if (pathname === "/api/hrx/attendance" && method === "GET") {
      const guarded = hrxReadGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.attendance.read",
        resourceType: "HrxAttendanceRecord",
        resourceId: query.employee_id ?? query.attendance_id ?? "attendance",
        schemaVersion: "lawos.hrx.attendance.guarded_response.v0.1",
        deniedCode: "HRX_ATTENDANCE_ACCESS_DENIED",
        reviewCode: "HRX_ATTENDANCE_REVIEW_REQUIRED",
        claimBoundary: "hrx.attendance.read_guarded",
        emptyBody: { attendance: [], monthly_summary: createAttendanceMonthlySummary([], { month: query.month ?? null }) },
        permissionSummary: {
          attendance_records_visible: false,
          source_refs_visible: false,
          provider_payload_included: false,
        },
      });
      if (guarded) return guarded;
      const selfGuard = selfServiceReadGuard({
        repository: context.repository,
        actorContext,
        targetEmployeeId: query.employee_id,
        emptyBody: { attendance: [], monthly_summary: createAttendanceMonthlySummary([], { month: query.month ?? null }) },
      });
      if (selfGuard) return selfGuard;
      const attendance = context.attendance.list({
        tenant_id: tenantId,
        employee_id: query.employee_id,
        attendance_id: query.attendance_id,
        status: query.status,
        work_date: query.work_date,
        month: query.month,
      });
      const monthlySummary = createAttendanceMonthlySummary(attendance, { month: query.month ?? null });
      const attendanceWithVersions = attendance.map((record) => ({
        ...clone(record),
        source_version: createAttendanceSourceVersion(record),
      }));
      const actorEmployeeIds = [...employeeIdsForActor(
        context.repository,
        tenantId,
        actorContext.actor_id,
      )].filter((employeeId) => context.repository.getEmployee({
        tenant_id: tenantId,
        employee_id: employeeId,
      })?.status === "active");
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.attendance.read",
        object_type: "AttendanceRecord",
        object_id: query.employee_id ?? query.attendance_id ?? "attendance",
        reason: "attendance_records_listed",
        metadata: { result_count: attendance.length, month: query.month ?? null },
      });
      return response(200, {
        outcome: "ok",
        attendance: attendanceWithVersions,
        monthly_summary: monthlySummary,
        self_employee_id: actorEmployeeIds.length === 1 ? actorEmployeeIds[0] : null,
      });
    }

    if (pathname === "/api/hrx/attendance" && method === "POST") {
      const selfGuard = selfServiceWriteGuard({
        repository: context.repository,
        actorContext,
        targetEmployeeId: body.employee_id,
        emptyBody: { attendance: null },
      });
      if (selfGuard) return selfGuard;
      const attendance = context.attendance.write({ ...body, tenant_id: tenantId });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.attendance.write",
        object_type: "AttendanceRecord",
        object_id: attendance.attendance_id,
        reason: "attendance_record_created",
        metadata: { employee_id: attendance.employee_id, work_date: attendance.work_date, status: attendance.status },
      });
      return response(201, { outcome: "created", attendance });
    }

    if (pathname === "/api/hrx/attendance/correction-requests" && method === "GET") {
      if (!context.peopleFeatureFlags.attendance_correction_workflow) {
        throw safeHrxRuntimeError(
          404,
          "HRX_ATTENDANCE_CORRECTION_WORKFLOW_DISABLED",
          "Attendance correction workflow is disabled",
        );
      }
      const employeeId = typeof query.employee_id === "string" ? query.employee_id.trim() : "";
      if (
        !actorHasElevatedHrxRead(actorContext) &&
        (
          !employeeId ||
          !attendanceCorrectionActorOwnsEmployee(context.repository, actorContext, employeeId) &&
          !attendanceCorrectionReviewerAllowed(context, actorContext, employeeId, peopleAsOf(context))
        )
      ) {
        throw safeHrxRuntimeError(
          403,
          "HRX_ATTENDANCE_CORRECTION_ACCESS_DENIED",
          "Attendance correction requests are limited to the employee and assigned reviewer",
        );
      }
      const correctionRequests = context.attendanceCorrectionWorkflow.list({
        tenant_id: tenantId,
        employee_id: employeeId || undefined,
        state: query.state,
      });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.attendance.correction.list",
        object_type: "AttendanceCorrectionRequest",
        object_id: employeeId || "attendance-correction-requests",
        reason: "attendance_correction_requests_listed",
        metadata: {
          employee_id: employeeId || null,
          state: query.state ?? null,
          result_count: correctionRequests.length,
        },
      });
      return response(200, {
        outcome: "ok",
        correction_requests: correctionRequests,
      });
    }

    const attendanceCorrectionRequestMatch = pathname.match(/^\/api\/hrx\/attendance\/([^/]+)\/correction-requests$/);
    if (attendanceCorrectionRequestMatch && method === "POST") {
      if (!context.peopleFeatureFlags.attendance_correction_workflow) {
        throw safeHrxRuntimeError(
          404,
          "HRX_ATTENDANCE_CORRECTION_WORKFLOW_DISABLED",
          "Attendance correction workflow is disabled",
        );
      }
      const attendanceId = decodeURIComponent(attendanceCorrectionRequestMatch[1]);
      const source = context.attendance.get({
        tenant_id: tenantId,
        attendance_id: attendanceId,
      });
      if (!source) {
        return response(404, {
          outcome: "not_found",
          safe_error_code: "HRX_ATTENDANCE_RECORD_NOT_FOUND",
        });
      }
      if (
        !actorHasElevatedHrxRead(actorContext) &&
        !attendanceCorrectionActorOwnsEmployee(context.repository, actorContext, source.employee_id)
      ) {
        throw safeHrxRuntimeError(
          403,
          "HRX_ATTENDANCE_CORRECTION_ACCESS_DENIED",
          "Attendance correction may only be requested by the employee or People administrator",
        );
      }
      const correctionRequest = context.attendanceCorrectionWorkflow.create(
        actorContext,
        {
          ...body,
          attendance_id: attendanceId,
        },
      );
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.attendance.correction.request",
        object_type: "AttendanceCorrectionRequest",
        object_id: correctionRequest.correction_request_id,
        reason: "attendance_correction_requested",
        metadata: {
          employee_id: correctionRequest.employee_id,
          attendance_id: correctionRequest.attendance_id,
          source_version: correctionRequest.source_version,
          requested_fields: Object.keys(correctionRequest.requested_changes),
          evidence_ref: correctionRequest.evidence_ref,
          state: correctionRequest.state,
          state_version: correctionRequest.state_version,
        },
      });
      return response(201, {
        outcome: "requested",
        correction_request: correctionRequest,
      });
    }

    const attendanceCorrectionDecisionMatch = pathname.match(
      /^\/api\/hrx\/attendance\/correction-requests\/([^/]+)\/(approve|reject)$/,
    );
    if (attendanceCorrectionDecisionMatch && method === "POST") {
      if (!context.peopleFeatureFlags.attendance_correction_workflow) {
        throw safeHrxRuntimeError(
          404,
          "HRX_ATTENDANCE_CORRECTION_WORKFLOW_DISABLED",
          "Attendance correction workflow is disabled",
        );
      }
      const correctionRequestId = decodeURIComponent(attendanceCorrectionDecisionMatch[1]);
      const action = attendanceCorrectionDecisionMatch[2];
      const current = context.attendanceCorrectionWorkflow.get({
        tenant_id: tenantId,
        correction_request_id: correctionRequestId,
      });
      if (!current) {
        return response(404, {
          outcome: "not_found",
          safe_error_code: "HRX_ATTENDANCE_CORRECTION_REQUEST_NOT_FOUND",
        });
      }
      const asOf = peopleAsOf(context);
      const subjectActorIds = context.repository
        .listEmployeeUserLinks({
          tenant_id: tenantId,
          employee_id: current.employee_id,
        })
        .map((link) => link.user_id);
      if (
        current.requested_by_actor_id === actorContext.actor_id ||
        subjectActorIds.includes(actorContext.actor_id)
      ) {
        throw safeHrxRuntimeError(
          409,
          "HRX_ATTENDANCE_CORRECTION_SELF_APPROVAL_BLOCKED",
          "Attendance correction must be reviewed by another person",
        );
      }
      if (!attendanceCorrectionReviewerAllowed(context, actorContext, current.employee_id, asOf)) {
        throw safeHrxRuntimeError(
          403,
          "HRX_ATTENDANCE_CORRECTION_REVIEW_DENIED",
          "Attendance correction must be reviewed by the assigned manager or People administrator",
        );
      }
      const decision = context.attendanceCorrectionWorkflow.decide(
        {
          ...actorContext,
          subject_actor_ids: subjectActorIds,
        },
        { correction_request_id: correctionRequestId },
        {
          ...body,
          action,
        },
      );
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: `hrx.attendance.correction.${action}`,
        object_type: "AttendanceCorrectionRequest",
        object_id: correctionRequestId,
        reason: action === "approve"
          ? "attendance_correction_approved"
          : "attendance_correction_rejected",
        metadata: {
          employee_id: decision.request.employee_id,
          attendance_id: decision.request.attendance_id,
          approved_attendance_id: decision.request.approved_attendance_id,
          state: decision.request.state,
          state_version: decision.request.state_version,
        },
      });
      return response(200, {
        outcome: decision.request.state,
        correction_request: decision.request,
        attendance: decision.correction,
      });
    }

    const attendanceCorrectionMatch = pathname.match(/^\/api\/hrx\/attendance\/([^/]+)\/correct$/);
    if (attendanceCorrectionMatch && method === "POST") {
      if (context.peopleFeatureFlags.attendance_correction_workflow) {
        throw safeHrxRuntimeError(
          409,
          "HRX_ATTENDANCE_CORRECTION_WORKFLOW_REQUIRED",
          "Attendance corrections must use the request and review workflow",
        );
      }
      const attendanceId = decodeURIComponent(attendanceCorrectionMatch[1]);
      const attendance = context.attendance.correct({ tenant_id: tenantId, attendance_id: attendanceId }, body);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.attendance.correct",
        object_type: "AttendanceRecord",
        object_id: attendance.attendance_id,
        reason: "attendance_record_corrected",
        metadata: {
          employee_id: attendance.employee_id,
          work_date: attendance.work_date,
          correction_of_attendance_id: attendance.correction_of_attendance_id,
        },
      });
      return response(200, { outcome: "corrected", attendance });
    }

    if (pathname === "/api/hrx/overtime" && method === "GET") {
      const accessGuard = overtimeReadGuard({
        context,
        actorContext,
        targetEmployeeId: query.employee_id,
        emptyBody: { overtime: [] },
      });
      if (accessGuard) return accessGuard;
      const overtime = context.overtime.list({
        tenant_id: tenantId,
        employee_id: query.employee_id,
        overtime_id: query.overtime_id,
        state: query.state,
        work_date: query.work_date,
        month: query.month,
      });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.overtime.read",
        object_type: "OvertimeRequest",
        object_id: query.employee_id ?? query.overtime_id ?? "overtime",
        reason: "overtime_requests_listed",
        metadata: { result_count: overtime.length, month: query.month ?? null },
      });
      return response(200, { outcome: "ok", overtime });
    }

    if (pathname === "/api/hrx/overtime" && method === "POST") {
      const selfGuard = selfServiceWriteGuard({
        repository: context.repository,
        actorContext,
        targetEmployeeId: body.employee_id,
        emptyBody: { overtime: null },
      });
      if (selfGuard) return selfGuard;
      const attendanceRecords = context.attendance.list({
        tenant_id: tenantId,
        employee_id: body.employee_id,
        work_date: body.work_date,
      });
      if (attendanceRecords.length === 0) {
        throw safeHrxRuntimeError(
          409,
          "HRX_OVERTIME_ATTENDANCE_REQUIRED",
          "출퇴근 기록이 있는 근무일에만 초과근로를 신청할 수 있습니다",
        );
      }
      const review = calculateOvertimeReviewMinutes({
        employee_id: body.employee_id,
        work_date: body.work_date,
        requested_minutes: body.requested_minutes,
        hours: body.hours,
        attendance_records: attendanceRecords,
      });
      const overtime = context.overtime.create({
        ...body,
        ...review,
        tenant_id: tenantId,
      });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.overtime.submit",
        object_type: "OvertimeRequest",
        object_id: overtime.overtime_id,
        reason: "overtime_request_submitted",
        metadata: {
          employee_id: overtime.employee_id,
          work_date: overtime.work_date,
          calculated_minutes: overtime.calculated_minutes,
          requested_minutes: overtime.requested_minutes,
        },
      });
      return response(201, { outcome: "submitted", overtime });
    }

    if (pathname === "/api/hrx/overtime/risks" && method === "GET") {
      const accessGuard = overtimeReadGuard({
        context,
        actorContext,
        targetEmployeeId: query.employee_id,
        emptyBody: { risk_report: null },
      });
      if (accessGuard) return accessGuard;
      const attendance = context.attendance.list({
        tenant_id: tenantId,
        employee_id: query.employee_id,
        month: query.month,
      });
      const overtime = context.overtime.list({
        tenant_id: tenantId,
        employee_id: query.employee_id,
        month: query.month,
      });
      const riskReport = createWeeklyOvertimeRiskReport({
        tenant_id: tenantId,
        employee_id: query.employee_id,
        attendance_records: attendance,
        overtime_requests: overtime,
        weekly_limit_hours: query.weekly_limit_hours ?? 52,
        standard_daily_hours: query.standard_daily_hours ?? 8,
      });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.overtime.risk.read",
        object_type: "OvertimeRiskReport",
        object_id: query.employee_id,
        reason: "overtime_risk_report_generated",
        metadata: { event_count: riskReport.events.length, month: query.month ?? null },
      });
      return response(200, { outcome: "ok", risk_report: riskReport });
    }

    if (pathname === "/api/hrx/risks" && method === "GET") {
      const guarded = hrxReadGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.risk.read",
        resourceType: "HRXRiskEvent",
        resourceId: query.risk_event_id ?? query.risk_type ?? "risks",
        schemaVersion: "lawos.hrx.risk.guarded_response.v0.1",
        deniedCode: "HRX_RISK_ACCESS_DENIED",
        reviewCode: "HRX_RISK_REVIEW_REQUIRED",
        claimBoundary: "hrx.risk.read_guarded",
        emptyBody: { risk_events: [], dashboard: createHrxRiskDashboard([]) },
        permissionSummary: {
          risk_events_visible: false,
          source_refs_visible: false,
          provider_payload_included: false,
        },
      });
      if (guarded) return guarded;
      const riskEvents = context.riskEvents.list({
        tenant_id: tenantId,
        status: query.status,
        risk_type: query.risk_type,
      });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.risk.read",
        object_type: "HRXRiskEvent",
        object_id: query.risk_type ?? "list",
        reason: "hrx_risk_events_listed",
        metadata: { result_count: riskEvents.length, status: query.status ?? null, risk_type: query.risk_type ?? null },
      });
      return response(200, {
        outcome: "ok",
        risk_events: riskEvents,
        dashboard: createHrxRiskDashboard(riskEvents),
      });
    }

    if (pathname === "/api/hrx/risks/scan" && method === "POST") {
      const scan = runHrxDailyRiskScan(context, actorContext, body);
      return response(200, { outcome: "scanned", ...scan });
    }

    const riskTransitionMatch = pathname.match(/^\/api\/hrx\/risks\/([^/]+)\/transition$/);
    if (riskTransitionMatch && method === "POST") {
      const riskEventId = decodeURIComponent(riskTransitionMatch[1]);
      const riskEvent = context.riskEvents.transition(
        { tenant_id: tenantId, risk_event_id: riskEventId },
        {
          status: body.status,
          resolution_ref: body.resolution_ref,
          changed_by: actorContext.actor_id,
          reason: body.reason ?? "risk_event_transition_from_api",
        },
      );
      if (!riskEvent) return response(404, { outcome: "not_found", safe_error_code: "HRX_RISK_EVENT_NOT_FOUND" });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.risk.transition",
        object_type: "HRXRiskEvent",
        object_id: riskEvent.risk_event_id,
        reason: "hrx_risk_event_state_transition_recorded",
        metadata: { status: riskEvent.status, risk_type: riskEvent.risk_type },
      });
      return response(200, {
        outcome: "updated",
        risk_event: riskEvent,
        dashboard: createHrxRiskDashboard(context.riskEvents.list({ tenant_id: tenantId })),
      });
    }

    const overtimeDecisionMatch = pathname.match(/^\/api\/hrx\/overtime\/([^/]+)\/(approve|reject)$/);
    if (overtimeDecisionMatch && method === "POST") {
      const overtimeId = decodeURIComponent(overtimeDecisionMatch[1]);
      const decision = overtimeDecisionMatch[2];
      const current = context.overtime.get({ tenant_id: tenantId, overtime_id: overtimeId });
      if (!current) {
        throw safeHrxRuntimeError(404, "HRX_OVERTIME_NOT_FOUND", "Overtime request not found");
      }
      const subjectActorIds = context.repository
        .listEmployeeUserLinks({ tenant_id: tenantId, employee_id: current.employee_id })
        .map((link) => link.user_id);
      if (current.employee_id === actorContext.actor_id || subjectActorIds.includes(actorContext.actor_id)) {
        throw safeHrxRuntimeError(
          409,
          "HRX_OVERTIME_SELF_APPROVAL",
          "Overtime request must be approved by another person",
        );
      }
      if (!attendanceCorrectionReviewerAllowed(
        context,
        actorContext,
        current.employee_id,
        peopleAsOf(context),
      )) {
        throw safeHrxRuntimeError(
          403,
          "HRX_OVERTIME_REVIEW_DENIED",
          "Overtime request must be reviewed by the assigned manager or People administrator",
        );
      }
      const review = calculateOvertimeReviewMinutes({
        employee_id: current.employee_id,
        work_date: current.work_date,
        requested_minutes: current.requested_minutes,
        attendance_records: context.attendance.list({
          tenant_id: tenantId,
          employee_id: current.employee_id,
          work_date: current.work_date,
        }),
      });
      const overtime = context.overtime.update(
        { tenant_id: tenantId, overtime_id: overtimeId },
        {
          state: decision === "approve" ? "approved" : "rejected",
          ...review,
          approved_minutes: decision === "approve"
            ? body.approved_minutes ?? current.requested_minutes
            : 0,
          approver_id: actorContext.actor_id,
          decided_at: peopleAsOf(context),
          decision_reason: body.decision_reason ?? `${decision}_from_overtime_queue`,
        },
      );
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: `hrx.overtime.${decision}`,
        object_type: "OvertimeRequest",
        object_id: overtime.overtime_id,
        reason: decision === "approve" ? "overtime_request_approved" : "overtime_request_rejected",
        metadata: {
          employee_id: overtime.employee_id,
          work_date: overtime.work_date,
          calculated_minutes: overtime.calculated_minutes,
          requested_minutes: overtime.requested_minutes,
          approved_minutes: overtime.approved_minutes,
        },
      });
      return response(200, { outcome: decision === "approve" ? "approved" : "rejected", overtime });
    }

    if (pathname.startsWith("/api/hrx/leave/") && ["GET", "POST", "PATCH"].includes(method)) {
      const policyService = context.leavePolicyService;
      const settingsPath = pathname.match(/^\/api\/hrx\/leave\/(configuration|groups|types|policies)$/);
      const activeTypesPath = pathname === "/api/hrx/leave/types/active";
      const groupUpdate = pathname.match(/^\/api\/hrx\/leave\/groups\/([^/]+)$/);
      const typeUpdate = pathname.match(/^\/api\/hrx\/leave\/types\/([^/]+)$/);
      const policyUpdate = pathname.match(/^\/api\/hrx\/leave\/policies\/([^/]+)$/);
      const policyPublish = pathname.match(/^\/api\/hrx\/leave\/policies\/([^/]+)\/publish$/);
      const policyVersion = pathname.match(/^\/api\/hrx\/leave\/policies\/([^/]+)\/versions$/);
      const isSettingsRoute = settingsPath || activeTypesPath || groupUpdate || typeUpdate || policyUpdate || policyPublish || policyVersion;
      if (isSettingsRoute) {
        if (!policyService) {
          return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_POLICY_STORE_REQUIRED" });
        }
        if (activeTypesPath && method === "GET") {
          const onDate = query.on_date ?? new Date().toISOString().slice(0, 10);
          const configuration = policyService.listConfiguration(actorContext);
          return response(200, {
            outcome: "ok",
            groups: configuration.groups.filter((group) => group.status === "active"),
            types: policyService.listActiveTypes(actorContext, { on_date: onDate }),
            policies: configuration.policies.filter(
              (policy) => policy.status === "active" && policy.effective_from <= onDate && (!policy.effective_to || policy.effective_to >= onDate),
            ),
          });
        }
        if (settingsPath && method === "GET") {
          const configuration = policyService.listConfiguration(actorContext);
          if (settingsPath[1] === "configuration") return response(200, { outcome: "ok", ...configuration });
          return response(200, { outcome: "ok", [settingsPath[1]]: configuration[settingsPath[1]] });
        }

        let result;
        let action;
        if (pathname === "/api/hrx/leave/groups" && method === "POST") {
          result = { group: policyService.createGroup(actorContext, body) };
          action = "group.create";
        } else if (groupUpdate && method === "PATCH") {
          result = { group: policyService.updateGroup(actorContext, decodeURIComponent(groupUpdate[1]), body) };
          action = "group.update";
        } else if (pathname === "/api/hrx/leave/types" && method === "POST") {
          result = { leave_type: policyService.createType(actorContext, body) };
          action = "type.create";
        } else if (typeUpdate && method === "PATCH") {
          result = { leave_type: policyService.updateType(actorContext, decodeURIComponent(typeUpdate[1]), body) };
          action = "type.update";
        } else if (pathname === "/api/hrx/leave/policies" && method === "POST") {
          result = { policy: policyService.createPolicyVersion(actorContext, body) };
          action = "policy.create_draft";
        } else if (policyUpdate && method === "PATCH") {
          result = { policy: policyService.updatePolicyDraft(actorContext, decodeURIComponent(policyUpdate[1]), body) };
          action = "policy.update_draft";
        } else if (policyPublish && method === "POST") {
          result = { policy: policyService.publishPolicyVersion(actorContext, decodeURIComponent(policyPublish[1])) };
          action = "policy.publish";
        } else if (policyVersion && method === "POST") {
          result = { policy: policyService.createNextPolicyVersion(actorContext, decodeURIComponent(policyVersion[1]), body) };
          action = "policy.create_version";
        } else {
          return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
        }
        const object = result.group ?? result.leave_type ?? result.policy;
        appendRuntimeAudit(context.audit, {
          ...actorContext,
          action: `hrx.leave.${action}`,
          object_type: result.group ? "LeaveGroup" : result.leave_type ? "LeaveType" : "LeavePolicyVersion",
          object_id: object.group_id ?? object.leave_type_id ?? object.policy_version_id,
          reason: `leave_${action.replaceAll(".", "_")}`,
        });
        const published = Boolean(policyPublish && method === "POST");
        return response(published ? 200 : method === "POST" ? 201 : 200, {
          outcome: published ? "published" : method === "POST" ? "created" : "updated",
          ...result,
        });
      }
    }

    if (pathname.startsWith("/api/hrx/leave/entitlements")) {
      const readService = context.leaveEntitlementReadService;
      const commandService = context.leaveEntitlementCommandService;
      const expirationService = context.leaveExpirationService;
      if (!readService || !commandService || !expirationService || !context.leaveManagementStore) {
        return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ENTITLEMENT_STORE_REQUIRED" });
      }
      const readScopes = [
        "hrx.leave.self.read",
        "hrx.leave.team.read",
        "hrx.leave.policy.read",
        "hrx.leave.policy.write",
        "hrx.leave.ledger.adjust",
        "hrx.leave.report.export",
      ];
      const entitlementContext = Object.freeze({
        ...actorContext,
        authorized_employee_ids: leaveEntitlementAuthorizedEmployeeIds(context, actorContext),
      });
      if (pathname === "/api/hrx/leave/entitlements" && method === "GET") {
        if (!readScopes.some((scope) => actorContext.hrx_scopes.includes(scope))) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ENTITLEMENT_READ_DENIED", count_leak_prevented: true, fail_closed: true });
        }
        const result = readService.list(entitlementContext, query);
        appendRuntimeAudit(context.audit, {
          ...actorContext,
          action: "hrx.leave.entitlement.list",
          object_type: "LeaveEntitlement",
          object_id: "entitlements",
          reason: "leave_entitlements_listed",
          metadata: { result_count: result.rows.length, lifecycle_state: query.state ?? null },
        });
        return response(200, {
          outcome: "ok",
          entitlements: result.rows.map((row) => leaveEntitlementApiView(context, tenantId, row)),
          pagination: { total: result.total, limit: result.limit, next_cursor: result.next_cursor },
        });
      }
      const entitlementDetail = pathname.match(/^\/api\/hrx\/leave\/entitlements\/([^/]+)$/);
      if (entitlementDetail && method === "GET") {
        if (!readScopes.some((scope) => actorContext.hrx_scopes.includes(scope))) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ENTITLEMENT_READ_DENIED", count_leak_prevented: true, fail_closed: true });
        }
        const entitlementId = decodeURIComponent(entitlementDetail[1]);
        const row = readService.detail(entitlementContext, entitlementId, query);
        if (!row) return response(404, { outcome: "not_found", safe_error_code: "HRX_LEAVE_ENTITLEMENT_NOT_FOUND", count_leak_prevented: true });
        appendRuntimeAudit(context.audit, {
          ...actorContext,
          action: "hrx.leave.entitlement.read",
          object_type: "LeaveEntitlement",
          object_id: entitlementId,
          reason: "leave_entitlement_read",
        });
        return response(200, { outcome: "ok", entitlement: leaveEntitlementApiView(context, tenantId, row) });
      }
      if (!actorContext.hrx_scopes.includes("hrx.leave.ledger.adjust")) {
        return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ENTITLEMENT_WRITE_DENIED", count_leak_prevented: true, fail_closed: true });
      }
      const scheduledPatch = pathname.match(/^\/api\/hrx\/leave\/entitlements\/([^/]+)$/);
      if (scheduledPatch && method === "PATCH") {
        if (actorContext.step_up_verified !== true) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "leave_ledger_adjustment", fail_closed: true });
        }
        return response(200, { outcome: "updated", entitlement: commandService.patchScheduled(actorContext, { ...body, entitlement_id: decodeURIComponent(scheduledPatch[1]) }) });
      }
      const entitlementCommand = pathname.match(/^\/api\/hrx\/leave\/entitlements\/([^/]+)\/(cancel|adjust)$/);
      if (entitlementCommand && method === "POST") {
        if (actorContext.step_up_verified !== true) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "leave_ledger_adjustment", fail_closed: true });
        }
        const input = { ...body, entitlement_id: decodeURIComponent(entitlementCommand[1]) };
        return response(200, {
          outcome: entitlementCommand[2] === "cancel" ? "cancelled" : "adjusted",
          entitlement: entitlementCommand[2] === "cancel"
            ? commandService.cancelScheduled(actorContext, input)
            : commandService.adjustActive(actorContext, input),
        });
      }
      if (pathname === "/api/hrx/leave/entitlements/expiration-preview" && method === "POST") {
        return response(200, { outcome: "previewed", preview: expirationService.preview(actorContext, body) });
      }
      if (pathname === "/api/hrx/leave/entitlements/expiration-execute" && method === "POST") {
        if (actorContext.step_up_verified !== true) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "leave_ledger_adjustment", fail_closed: true });
        }
        return response(200, { outcome: "executed", execution: expirationService.execute(actorContext, body) });
      }
      return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
    }

    if (pathname.startsWith("/api/hrx/leave/accrual")) {
      const service = context.leaveAccrualService;
      const batchService = context.leaveAccrualBatchService;
      const uploadService = context.leaveOccurrenceUploadBatchService;
      const store = context.leaveManagementStore;
      if (!service || !store) {
        return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ACCRUAL_STORE_REQUIRED" });
      }
      if (pathname.startsWith("/api/hrx/leave/accrual/batches")) {
        if (!batchService) return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ACCRUAL_BATCH_STORE_REQUIRED" });
        const batchExport = pathname.match(/^\/api\/hrx\/leave\/accrual\/batches\/([^/]+)\/export$/);
        const requiredScope = batchExport ? "hrx.leave.report.export" : "hrx.leave.accrual.execute";
        if (!actorContext.hrx_scopes.includes(requiredScope)) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ACCRUAL_BATCH_SCOPE_DENIED", count_leak_prevented: true, fail_closed: true });
        }
        if (batchExport && method === "GET") {
          const batchId = decodeURIComponent(batchExport[1]);
          const exported = batchService.exportReceipt(actorContext, { accrual_batch_id: batchId, format: query.format });
          appendRuntimeAudit(context.audit, {
            ...actorContext,
            action: "hrx.leave.accrual.batch.export",
            object_type: "LeaveAccrualBatch",
            object_id: batchId,
            reason: "leave_accrual_batch_exported",
            metadata: { format: exported.format, row_count: exported.export_totals.row_count, snapshot_hash: exported.snapshot_hash },
          });
          return response(200, { outcome: "exported", export: exported });
        }
        if (pathname === "/api/hrx/leave/accrual/batches/preview" && method === "POST") {
          const batch = batchService.preview(actorContext, body);
          appendRuntimeAudit(context.audit, {
            ...actorContext,
            action: "hrx.leave.accrual.batch.preview",
            object_type: "LeaveAccrualBatch",
            object_id: batch.accrual_batch_id,
            reason: "leave_accrual_batch_previewed",
            metadata: { period_count: batch.period_count, status: batch.status },
          });
          return response(200, { outcome: "previewed", batch });
        }
        const batchCommand = pathname.match(/^\/api\/hrx\/leave\/accrual\/batches\/([^/]+)\/(execute|retry)$/);
        if (batchCommand && method === "POST") {
          if (actorContext.step_up_verified !== true) {
            return response(403, {
              outcome: "blocked",
              safe_error_code: "HRX_STEP_UP_REQUIRED",
              step_up_required: true,
              required_purpose: "leave_accrual_execute",
              fail_closed: true,
            });
          }
          const batchId = decodeURIComponent(batchCommand[1]);
          const command = batchCommand[2];
          const batch = command === "execute"
            ? batchService.execute(actorContext, { ...body, preview_batch_id: batchId })
            : batchService.resume(actorContext, { ...body, accrual_batch_id: batchId });
          appendRuntimeAudit(context.audit, {
            ...actorContext,
            action: `hrx.leave.accrual.batch.${command}`,
            object_type: "LeaveAccrualBatch",
            object_id: batch.accrual_batch_id,
            reason: command === "retry" ? "leave_accrual_batch_retried" : "leave_accrual_batch_executed",
            metadata: { period_count: batch.period_count, status: batch.status, replayed: batch.replayed === true },
          });
          return response(200, { outcome: command === "execute" ? "executed" : "resumed", batch });
        }
        const batchDetail = pathname.match(/^\/api\/hrx\/leave\/accrual\/batches\/([^/]+)$/);
        if (batchDetail && method === "GET") {
          const batchId = decodeURIComponent(batchDetail[1]);
          return response(200, { outcome: "ok", batch: batchService.read(actorContext, { accrual_batch_id: batchId }) });
        }
        return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
      }
      if (pathname === "/api/hrx/leave/accrual/rules" && method === "GET") {
        return response(200, { outcome: "ok", rules: service.listRules(actorContext) });
      }
      if (pathname === "/api/hrx/leave/accrual/rules" && method === "POST") {
        if (actorContext.step_up_verified !== true) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "leave_accrual_execute", fail_closed: true });
        }
        return response(201, { outcome: "created", rule: service.createRule(actorContext, body) });
      }
      const accrualRuleUpdate = pathname.match(/^\/api\/hrx\/leave\/accrual\/rules\/([^/]+)$/);
      const accrualRuleDeactivate = pathname.match(/^\/api\/hrx\/leave\/accrual\/rules\/([^/]+)\/deactivate$/);
      if (accrualRuleUpdate && method === "PATCH") {
        if (actorContext.step_up_verified !== true) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "leave_accrual_execute", fail_closed: true });
        }
        return response(201, { outcome: "version_created", rule: service.updateRule(actorContext, decodeURIComponent(accrualRuleUpdate[1]), body) });
      }
      if (accrualRuleDeactivate && method === "POST") {
        if (actorContext.step_up_verified !== true) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "leave_accrual_execute", fail_closed: true });
        }
        return response(200, { outcome: "deactivated", rule: service.deactivateRule(actorContext, decodeURIComponent(accrualRuleDeactivate[1]), body) });
      }
      if (pathname === "/api/hrx/leave/accrual/preview" && method === "POST") {
        return response(200, { outcome: "previewed", run: service.preview(actorContext, body) });
      }
      if (pathname === "/api/hrx/leave/accrual/execute" && method === "POST") {
        return response(200, { outcome: "executed", run: service.execute(actorContext, body) });
      }
      if (pathname === "/api/hrx/leave/accrual/runs" && method === "GET") {
        const runs = store
          .query("select", { table: "hrx_leave_accrual_runs", where: { tenant_id: tenantId } })
          .sort((left, right) => right.created_at.localeCompare(left.created_at))
          .slice(0, 50)
          .map((run) => ({ ...run, result: JSON.parse(run.result_json ?? "{}"), result_json: undefined }));
        return response(200, { outcome: "ok", runs });
      }
      if (pathname === "/api/hrx/leave/accrual/manual/approvers" && method === "GET") {
        return response(200, { outcome: "ok", approvers: leaveAdjustmentApprovers(actorContext) });
      }
      if (pathname === "/api/hrx/leave/accrual/manual/evidence-documents" && method === "GET") {
        const documents = store
          .query("select", { table: "hrx_documents", where: { tenant_id: tenantId, source_status: "verified" } })
          .map((document) => ({
            document_id: document.document_id,
            employee_id: document.employee_id,
            employee_display_name: (() => {
              const employee = context.repository.getEmployee({
                tenant_id: tenantId,
                employee_id: document.employee_id,
              });
              return employee ? publicEmployeeDisplayName(employee) : UNRESOLVED_EMPLOYEE_DISPLAY_NAME;
            })(),
            document_type: document.document_type,
            title: document.title ?? "조정 근거 문서",
            source_status: document.source_status,
          }));
        return response(200, { outcome: "ok", documents });
      }
      if (pathname === "/api/hrx/leave/accrual/manual/template" && method === "GET") {
        return response(200, { outcome: "ok", template: service.manualTemplate(query.format ?? "csv") });
      }
      if (pathname === "/api/hrx/leave/accrual/manual/uploads/preview" && method === "POST") {
        if (!uploadService) return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_OCCURRENCE_UPLOAD_STORE_REQUIRED" });
        const batch = uploadService.preview(actorContext, body);
        appendRuntimeAudit(context.audit, {
          ...actorContext,
          action: "hrx.leave.occurrence.upload.preview",
          object_type: "LeaveOccurrenceUploadBatch",
          object_id: batch.upload_batch_id,
          reason: "leave_occurrence_upload_previewed",
          metadata: { row_count: batch.row_count, preview_error_count: batch.counts.preview_errors },
        });
        return response(200, { outcome: "previewed", batch });
      }
      const uploadCommand = pathname.match(/^\/api\/hrx\/leave\/accrual\/manual\/uploads\/([^/]+)\/(approve|execute|retry)$/);
      if (uploadCommand && method === "POST") {
        if (!uploadService) return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_OCCURRENCE_UPLOAD_STORE_REQUIRED" });
        if (actorContext.step_up_verified !== true) return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "leave_ledger_adjustment", fail_closed: true });
        const batchId = decodeURIComponent(uploadCommand[1]);
        const command = uploadCommand[2];
        if (command === "approve") {
          const approvalReceipt = uploadService.approve(actorContext, { ...body, upload_batch_id: batchId });
          appendRuntimeAudit(context.audit, {
            ...actorContext,
            action: "hrx.leave.occurrence.upload.approve",
            object_type: "LeaveOccurrenceUploadBatch",
            object_id: batchId,
            reason: "leave_occurrence_upload_independently_approved",
            metadata: { approval_receipt_id: approvalReceipt.approval_receipt_id, snapshot_hash: approvalReceipt.snapshot_hash },
          });
          return response(200, { outcome: "approved", approval_receipt: approvalReceipt });
        }
        const batch = command === "execute"
          ? uploadService.execute(actorContext, { ...body, upload_batch_id: batchId })
          : uploadService.resume(actorContext, { ...body, upload_batch_id: batchId });
        appendRuntimeAudit(context.audit, {
          ...actorContext,
          action: `hrx.leave.occurrence.upload.${command}`,
          object_type: "LeaveOccurrenceUploadBatch",
          object_id: batch.upload_batch_id,
          reason: command === "execute" ? "leave_occurrence_upload_executed" : "leave_occurrence_upload_resumed",
          metadata: { status: batch.status, completed_count: batch.counts.completed, failed_count: batch.counts.failed, new_entries: batch.counts.new_entries },
        });
        return response(200, { outcome: command === "execute" ? "executed" : "resumed", batch });
      }
      const uploadDetail = pathname.match(/^\/api\/hrx\/leave\/accrual\/manual\/uploads\/([^/]+)$/);
      if (uploadDetail && method === "GET") {
        if (!uploadService) return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_OCCURRENCE_UPLOAD_STORE_REQUIRED" });
        return response(200, { outcome: "ok", batch: uploadService.read(actorContext, { upload_batch_id: decodeURIComponent(uploadDetail[1]) }) });
      }
      if (pathname === "/api/hrx/leave/accrual/manual/preview" && method === "POST") {
        return response(200, { outcome: "previewed", preview: service.previewManual(actorContext, body) });
      }
      if (pathname === "/api/hrx/leave/accrual/manual/approve" && method === "POST") {
        if (actorContext.step_up_verified !== true) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "leave_ledger_adjustment", fail_closed: true });
        }
        return response(200, { outcome: "approved", approval_receipt: service.approveManual(actorContext, body) });
      }
      if (pathname === "/api/hrx/leave/accrual/manual/execute" && method === "POST") {
        if (actorContext.step_up_verified !== true) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_STEP_UP_REQUIRED", step_up_required: true, required_purpose: "leave_ledger_adjustment", fail_closed: true });
        }
        return response(200, { outcome: "executed", result: service.executeManual(actorContext, body) });
      }
      return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
    }

    if (pathname.startsWith("/api/hrx/leave/ledger") || pathname.startsWith("/api/hrx/leave/occurrences") || pathname === "/api/hrx/leave/reports/export") {
      const service = context.leaveReportingService;
      if (!service) return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_REPORT_STORE_REQUIRED" });
      if (!["hrx.leave.self.read", "hrx.leave.team.read", "hrx.leave.report.export"].some((scope) => actorContext.hrx_scopes.includes(scope))) {
        return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_REPORT_SCOPE_DENIED", count_leak_prevented: true, fail_closed: true });
      }
      const reportContext = Object.freeze({
        ...actorContext,
        authorized_employee_ids: leaveReportAuthorizedEmployeeIds(context, actorContext),
      });
      if (pathname === "/api/hrx/leave/occurrences" && method === "GET") {
        return response(200, { outcome: "ok", occurrences: service.queryOccurrences(reportContext, query) });
      }
      if (pathname === "/api/hrx/leave/occurrences/projections" && method === "GET") {
        return response(200, { outcome: "ok", projections: service.occurrenceProjections(reportContext, query) });
      }
      if (pathname === "/api/hrx/leave/occurrences/export" && method === "GET") {
        if (!actorContext.hrx_scopes.includes("hrx.leave.report.export")) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_REPORT_EXPORT_SCOPE_DENIED", count_leak_prevented: true, fail_closed: true });
        }
        return response(200, { outcome: "exported", export: service.exportOccurrences(reportContext, query) });
      }
      if (pathname === "/api/hrx/leave/ledger" && method === "GET") {
        return response(200, { outcome: "ok", report: service.query(reportContext, query) });
      }
      if (pathname === "/api/hrx/leave/ledger/validate" && method === "GET") {
        return response(200, { outcome: "ok", validation: service.validateBalances(reportContext, query) });
      }
      if (pathname === "/api/hrx/leave/ledger/snapshots" && method === "POST") {
        if (!actorContext.hrx_scopes.includes("hrx.leave.report.export")) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_REPORT_EXPORT_SCOPE_DENIED", count_leak_prevented: true, fail_closed: true });
        }
        return response(201, { outcome: "captured", snapshot: service.captureSnapshots(reportContext, body) });
      }
      if (pathname === "/api/hrx/leave/reports/export" && method === "GET") {
        if (!actorContext.hrx_scopes.includes("hrx.leave.report.export")) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_REPORT_EXPORT_SCOPE_DENIED", count_leak_prevented: true, fail_closed: true });
        }
        return response(200, { outcome: "exported", export: service.exportReport(reportContext, query) });
      }
      return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
    }

    if (pathname.startsWith("/api/hrx/leave/integrations")) {
      const service = context.leaveIntegrationService;
      if (!service) return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_INTEGRATION_STORE_REQUIRED" });
      if (pathname === "/api/hrx/leave/integrations" && method === "GET") {
        if (!actorContext.hrx_scopes.includes("hrx.leave.report.export")) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_INTEGRATION_READ_DENIED", count_leak_prevented: true, fail_closed: true });
        }
        return response(200, { outcome: "ok", integration: service.list(actorContext, { limit: query.limit }) });
      }
      if (pathname === "/api/hrx/leave/integrations/process" && method === "POST") {
        if (!actorContext.hrx_scopes.includes("hrx.leave.policy.write")) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_INTEGRATION_PROCESS_DENIED", count_leak_prevented: true, fail_closed: true });
        }
        return service.process(actorContext, { limit: body.limit, event_ids: body.event_ids, force: true }).then((result) => response(200, { outcome: "processed", integration: result }));
      }
      const deadLetterRetryMatch = pathname.match(/^\/api\/hrx\/leave\/integrations\/dead-letters\/([^/]+)\/retry$/);
      if (deadLetterRetryMatch && method === "POST") {
        if (!actorContext.hrx_scopes.includes("hrx.leave.policy.write")) {
          return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_INTEGRATION_RETRY_DENIED", count_leak_prevented: true, fail_closed: true });
        }
        try {
          const deadLetter = service.retryDeadLetter(actorContext, decodeURIComponent(deadLetterRetryMatch[1]));
          return response(200, { outcome: "requeued", dead_letter: deadLetter, integration: service.list(actorContext) });
        } catch (error) {
          return safeError(error);
        }
      }
      return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
    }

    if (pathname.startsWith("/api/hrx/leave/termination-reconciliations")) {
      const service = context.leaveTerminationService;
      if (!service) return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_TERMINATION_STORE_REQUIRED" });
      if (!actorContext.hrx_scopes.includes("hrx.leave.termination.settle")) {
        return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_TERMINATION_SCOPE_DENIED", count_leak_prevented: true, fail_closed: true });
      }
      const terminationContext = Object.freeze({
        ...actorContext,
        authorized_employee_ids: leaveReportAuthorizedEmployeeIds(context, actorContext),
      });
      if (pathname === "/api/hrx/leave/termination-reconciliations" && method === "GET") {
        return response(200, { outcome: "ok", reconciliations: service.list(terminationContext) });
      }
      if (pathname === "/api/hrx/leave/termination-reconciliations/candidates" && method === "GET") {
        return response(200, { outcome: "ok", candidates: service.candidates(terminationContext) });
      }
      if (pathname === "/api/hrx/leave/termination-reconciliations/approvers" && method === "GET") {
        return response(200, { outcome: "ok", approvers: leaveTerminationApprovers(actorContext) });
      }
      if (pathname === "/api/hrx/leave/termination-reconciliations/preview" && method === "POST") {
        return response(200, { outcome: "previewed", reconciliation: service.preview(terminationContext, body) });
      }
      if (pathname === "/api/hrx/leave/termination-reconciliations/approve" && method === "POST") {
        return response(200, { outcome: "approved", approval_receipt: service.approve(terminationContext, body) });
      }
      if (pathname === "/api/hrx/leave/termination-reconciliations/execute" && method === "POST") {
        return response(200, { outcome: "executed", reconciliation: service.execute(terminationContext, body) });
      }
      return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
    }

    if (pathname.startsWith("/api/hrx/leave/promotion-campaigns") || pathname.startsWith("/api/hrx/leave/promotion-recipients")) {
      const service = context.leavePromotionService;
      if (!service) return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_PROMOTION_STORE_REQUIRED" });
      if (!actorContext.hrx_scopes.includes("hrx.leave.promotion.manage")) {
        return response(403, { outcome: "blocked", safe_error_code: "HRX_LEAVE_PROMOTION_SCOPE_DENIED", count_leak_prevented: true, fail_closed: true });
      }
      const promotionContext = Object.freeze({
        ...actorContext,
        authorized_employee_ids: leaveReportAuthorizedEmployeeIds(context, actorContext),
      });
      if (pathname === "/api/hrx/leave/promotion-campaigns" && method === "GET") {
        const policies = context.leaveManagementStore
          .query("select", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId, status: "active" } })
          .map((policy) => ({ policy_version_id: policy.policy_version_id, policy_code: policy.policy_code, version: policy.version, effective_from: policy.effective_from }));
        return response(200, { outcome: "ok", campaigns: service.list(promotionContext), schedule_profiles: service.scheduleProfiles(), policies });
      }
      if (pathname === "/api/hrx/leave/promotion-campaigns/preview" && method === "POST") {
        return response(200, { outcome: "previewed", preview: service.preview(promotionContext, body) });
      }
      if (pathname === "/api/hrx/leave/promotion-campaigns" && method === "POST") {
        return response(201, { outcome: "created", campaign: service.create(promotionContext, body) });
      }
      const batchCommand = pathname.match(/^\/api\/hrx\/leave\/promotion-campaigns\/([^/]+)\/issue-batch$/);
      if (batchCommand && method === "POST") {
        const campaignId = decodeURIComponent(batchCommand[1]);
        return response(200, { outcome: "queued", batch: service.issueBatch(promotionContext, { ...body, campaign_id: campaignId }) });
      }
      const evidenceRevocation = pathname.match(/^\/api\/hrx\/leave\/promotion-recipients\/([^/]+)\/evidence\/([^/]+)\/revoke$/);
      if (evidenceRevocation && method === "POST") {
        const recipientId = decodeURIComponent(evidenceRevocation[1]);
        const receiptId = decodeURIComponent(evidenceRevocation[2]);
        return response(200, { outcome: "evidence_revoked", recipient: service.revokeEvidence(promotionContext, recipientId, receiptId, body) });
      }
      const recipientCommand = pathname.match(/^\/api\/hrx\/leave\/promotion-recipients\/([^/]+)\/(first-notice|second-notice|evidence|response)$/);
      if (recipientCommand && method === "POST") {
        const recipientId = decodeURIComponent(recipientCommand[1]);
        const command = recipientCommand[2];
        if (command === "first-notice") return response(200, { outcome: "document_created", recipient: service.issueFirstNotice(promotionContext, recipientId, body) });
        if (command === "second-notice") return response(200, { outcome: "document_created", recipient: service.issueSecondNotice(promotionContext, recipientId, body) });
        if (command === "evidence") return response(200, { outcome: "evidence_recorded", recipient: service.recordEvidence(promotionContext, recipientId, body) });
        return response(200, { outcome: "response_recorded", recipient: service.recordResponse(promotionContext, recipientId, body) });
      }
      return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
    }

    if (pathname.startsWith("/api/hrx/leave/me") || pathname.startsWith("/api/hrx/leave/team") || pathname.startsWith("/api/hrx/leave/requests") || pathname.startsWith("/api/hrx/leave/delegations")) {
      const service = context.leaveManagementService;
      const store = context.leaveManagementStore;
      if (!service || !store) {
        return response(503, { outcome: "blocked", safe_error_code: "HRX_LEAVE_MANAGEMENT_STORE_REQUIRED" });
      }

      if (pathname === "/api/hrx/leave/me" && method === "GET") {
        const employeeId = requireSingleEmployeeForActor(context, actorContext);
        return response(200, { outcome: "ok", ...leaveSelfSnapshot(context, tenantId, employeeId) });
      }

      if (pathname === "/api/hrx/leave/team" && method === "GET") {
        if (!actorContext.hrx_scopes.includes("hrx.leave.team.read")) {
          return response(403, {
            outcome: "blocked",
            safe_error_code: "HRX_LEAVE_TEAM_SCOPE_DENIED",
            count_leak_prevented: true,
            fail_closed: true,
          });
        }
        const from = typeof query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : currentDateKey();
        const defaultTo = new Date(`${from}T00:00:00.000Z`);
        defaultTo.setUTCDate(defaultTo.getUTCDate() + 7);
        const to = typeof query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : defaultTo.toISOString().slice(0, 10);
        if (to < from || (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86400000 > 31) {
          return response(400, { outcome: "blocked", safe_error_code: "HRX_LEAVE_TEAM_RANGE_INVALID" });
        }
        return response(200, { outcome: "ok", ...leaveTeamSnapshot(context, actorContext, { from, to }) });
      }

      if (pathname === "/api/hrx/leave/me/preview" && method === "POST") {
        const employeeId = requireSingleEmployeeForActor(context, actorContext);
        return service.preview(actorContext, { ...body, employee_id: employeeId }).then((preview) => response(200, {
          outcome: "previewed",
          preview: {
            ...preview,
            approval_plan: {
              ...preview.approval_plan,
              approver: registeredActorSummary(preview.approval_plan.approver_actor_id),
            },
          },
        })).catch(safeError);
      }

      if (pathname === "/api/hrx/leave/me/evidence-documents" && method === "GET") {
        const employeeId = requireSingleEmployeeForActor(context, actorContext);
        return response(200, {
          outcome: "ok",
          documents: context.documents.list({ tenant_id: tenantId, employee_id: employeeId }).map((document) => ({
            document_id: document.document_id,
            document_type: document.document_type,
            title: document.title ?? "증빙 문서",
            source_status: document.source_status,
          })),
        });
      }

      if (pathname === "/api/hrx/leave/me/requests" && method === "POST") {
        const employeeId = requireSingleEmployeeForActor(context, actorContext);
        return service.submit(actorContext, { ...body, employee_id: employeeId }).then((result) =>
          response(201, { outcome: "submitted", ...result }),
        ).catch(safeError);
      }

      const selfRequestMatch = pathname.match(/^\/api\/hrx\/leave\/me\/requests\/([^/]+)$/);
      if (selfRequestMatch && method === "PATCH") {
        const employeeId = requireSingleEmployeeForActor(context, actorContext);
        const requestId = decodeURIComponent(selfRequestMatch[1]);
        const request = store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: tenantId, request_id: requestId } });
        if (!request || request.employee_id !== employeeId) return hiddenLeaveResourceResponse();
        return service.amendSubmitted(actorContext, {
          ...body,
          request_id: requestId,
          applicant_actor_ids: applicantActorIds(context, tenantId, employeeId),
        }).then((result) => response(200, { outcome: "amended", ...result })).catch(safeError);
      }

      const selfCommandMatch = pathname.match(/^\/api\/hrx\/leave\/me\/requests\/([^/]+)\/(cancel|reschedule-response|additional-information)$/);
      if (selfCommandMatch && method === "POST") {
        const employeeId = requireSingleEmployeeForActor(context, actorContext);
        const requestId = decodeURIComponent(selfCommandMatch[1]);
        const request = store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: tenantId, request_id: requestId } });
        if (!request || request.employee_id !== employeeId) return hiddenLeaveResourceResponse();
        const command = selfCommandMatch[2];
        const applicantIds = applicantActorIds(context, tenantId, employeeId);
        if (command === "cancel") {
          return service.closeSubmitted(actorContext, {
            ...body,
            request_id: requestId,
            state: "cancelled",
            applicant_actor_ids: applicantIds,
          }).then((result) => response(200, { outcome: "cancelled", ...result })).catch(safeError);
        }
        if (command === "additional-information") {
          return service.provideAdditionalInformation(actorContext, {
            ...body,
            request_id: requestId,
            applicant_actor_ids: applicantIds,
          }).then((result) => response(200, { outcome: "information_provided", ...result })).catch(safeError);
        }
        return service.respondToReschedule(actorContext, {
          ...body,
          request_id: requestId,
          applicant_actor_ids: applicantIds,
        }).then((result) => response(200, { outcome: "responded", ...result })).catch(safeError);
      }

      if (pathname === "/api/hrx/leave/requests" && method === "GET") {
        return response(200, { outcome: "ok", approvals: assignedLeaveApprovalQueue(context, actorContext) });
      }

      const attachmentDownloadMatch = pathname.match(/^\/api\/hrx\/leave\/requests\/([^/]+)\/attachments\/([^/]+)\/download$/);
      if (attachmentDownloadMatch && method === "GET") {
        const requestId = decodeURIComponent(attachmentDownloadMatch[1]);
        const attachmentId = decodeURIComponent(attachmentDownloadMatch[2]);
        const authorization = leaveAttachmentDownloadAuthorization(context, actorContext, requestId, attachmentId);
        if (!authorization) return hiddenLeaveResourceResponse();
        appendRuntimeAudit(context.audit, {
          ...actorContext,
          action: "hrx.leave.attachment.download.authorize",
          object_type: "LeaveRequestAttachment",
          object_id: attachmentId,
          reason: "leave_attachment_download_authorized",
          metadata: { request_id: requestId, access_level: authorization.access_level, document_body_included: false },
        });
        return response(200, { outcome: "authorized", authorization });
      }

      const managerCommandMatch = pathname.match(/^\/api\/hrx\/leave\/requests\/([^/]+)\/(approve|reject|reschedule|request-info)$/);
      if (managerCommandMatch && method === "POST") {
        const requestId = decodeURIComponent(managerCommandMatch[1]);
        if (!assignedLeaveApprovalQueue(context, actorContext).some((approval) => approval.object_id === requestId)) {
          return hiddenLeaveResourceResponse();
        }
        const request = store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: tenantId, request_id: requestId } });
        if (!request) return hiddenLeaveResourceResponse();
        const applicantIds = applicantActorIds(context, tenantId, request.employee_id);
        const command = managerCommandMatch[2];
        if (command === "approve") {
          return service.approve(actorContext, {
            ...body,
            request_id: requestId,
            applicant_actor_ids: applicantIds,
          }).then((result) => response(200, { outcome: "approved", ...result })).catch(safeError);
        }
        if (command === "reject") {
          return service.closeSubmitted(actorContext, {
            ...body,
            request_id: requestId,
            state: "rejected",
            applicant_actor_ids: applicantIds,
          }).then((result) => response(200, { outcome: "rejected", ...result })).catch(safeError);
        }
        if (command === "request-info") {
          return service.requestAdditionalInformation(actorContext, {
            ...body,
            request_id: requestId,
            applicant_actor_ids: applicantIds,
          }).then((result) => response(200, { outcome: "information_requested", ...result })).catch(safeError);
        }
        return service.proposeReschedule(actorContext, {
          ...body,
          request_id: requestId,
          applicant_actor_ids: applicantIds,
        }).then((result) => response(201, { outcome: "reschedule_proposed", ...result })).catch(safeError);
      }

      const escalationMatch = pathname.match(/^\/api\/hrx\/leave\/requests\/([^/]+)\/escalate$/);
      if (escalationMatch && method === "POST") {
        const requestId = decodeURIComponent(escalationMatch[1]);
        const request = store.query("selectOne", {
          table: "hrx_leave_requests",
          where: { tenant_id: tenantId, request_id: requestId },
        });
        if (!request) return response(404, { outcome: "not_found", safe_error_code: "HRX_LEAVE_REQUEST_NOT_FOUND" });
        const candidate = leaveDelegationCandidates(actorContext).find((entry) => entry.actor_id === body.substitute_actor_id);
        if (!candidate) {
          return response(400, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ESCALATION_SUBSTITUTE_NOT_ELIGIBLE", fail_closed: true });
        }
        return service.escalateApproval(actorContext, {
          ...body,
          request_id: requestId,
          applicant_actor_ids: applicantActorIds(context, tenantId, request.employee_id),
        }).then((result) => response(201, { outcome: "escalated", ...result })).catch(safeError);
      }

      if (pathname === "/api/hrx/leave/delegations/candidates" && method === "GET") {
        return response(200, { outcome: "ok", candidates: leaveDelegationCandidates(actorContext) });
      }
      if (pathname === "/api/hrx/leave/delegations" && method === "GET") {
        return response(200, {
          outcome: "ok",
          delegations: context.leaveDelegationService.list(actorContext).map(leaveDelegationView),
        });
      }
      if (pathname === "/api/hrx/leave/delegations" && method === "POST") {
        const candidate = leaveDelegationCandidates(actorContext).find((entry) => entry.actor_id === body.delegate_actor_id);
        if (!candidate) {
          return response(400, {
            outcome: "blocked",
            safe_error_code: "HRX_LEAVE_DELEGATE_NOT_ELIGIBLE",
            fail_closed: true,
          });
        }
        const delegation = context.leaveDelegationService.create(actorContext, body);
        appendRuntimeAudit(context.audit, {
          ...actorContext,
          action: "hrx.leave.delegation.create",
          object_type: "LeaveApprovalDelegation",
          object_id: delegation.delegation_id,
          reason: "leave_approval_delegation_created",
        });
        return response(201, { outcome: "created", delegation: leaveDelegationView(delegation) });
      }
      const delegationCommandMatch = pathname.match(/^\/api\/hrx\/leave\/delegations\/([^/]+)\/(revoke|expire)$/);
      if (delegationCommandMatch && method === "POST") {
        const delegationId = decodeURIComponent(delegationCommandMatch[1]);
        const canAdmin = actorContext.hrx_scopes.includes("hrx.leave.policy.write");
        const delegation = delegationCommandMatch[2] === "revoke"
          ? context.leaveDelegationService.revoke(actorContext, delegationId, { can_admin: canAdmin })
          : context.leaveDelegationService.expire(actorContext, delegationId, { can_admin: canAdmin });
        appendRuntimeAudit(context.audit, {
          ...actorContext,
          action: `hrx.leave.delegation.${delegationCommandMatch[2]}`,
          object_type: "LeaveApprovalDelegation",
          object_id: delegationId,
          reason: `leave_approval_delegation_${delegationCommandMatch[2]}`,
        });
        return response(200, {
          outcome: delegationCommandMatch[2] === "revoke" ? "revoked" : "expired",
          delegation: leaveDelegationView(delegation),
        });
      }
    }

    if (pathname === "/api/hrx/leave" && method === "GET") {
      const guarded = hrxReadGuardResponse({
        permissionContext,
        actorContext,
        action: "hrx.leave.read",
        resourceType: "HrxLeaveState",
        resourceId: query.employee_id ?? "leave",
        schemaVersion: "lawos.hrx.leave.guarded_response.v0.1",
        deniedCode: "HRX_LEAVE_ACCESS_DENIED",
        reviewCode: "HRX_LEAVE_REVIEW_REQUIRED",
        claimBoundary: "hrx.leave.read_guarded",
        emptyBody: { balance: null, requests: [] },
        permissionSummary: {
          leave_balance_visible: false,
          leave_requests_visible: false,
          policy_payload_included: false,
        },
      });
      if (guarded) return guarded;
      const selfGuard = selfServiceReadGuard({
        repository: context.repository,
        actorContext,
        targetEmployeeId: query.employee_id,
        emptyBody: { balance: null, requests: [] },
      });
      if (selfGuard) return selfGuard;
      return response(200, {
        outcome: "ok",
        balance: context.leaveLedger.balance({
          tenant_id: tenantId,
          employee_id: query.employee_id,
          policy_id: query.policy_id ?? "pto-us",
        }),
        requests: context.leaveStore.list({ tenant_id: tenantId, employee_id: query.employee_id }),
      });
    }

    if (pathname === "/api/hrx/leave" && method === "POST") {
      return context.leaveService.submit(actorContext, { ...body, tenant_id: tenantId }).then((leaveRequest) =>
        response(201, { outcome: "submitted", leave_request: leaveRequest }),
      ).catch(safeError);
    }

    const leaveDecisionMatch = pathname.match(/^\/api\/hrx\/leave\/([^/]+)\/(approve|reject)$/);
    if (leaveDecisionMatch && method === "POST") {
      const requestId = decodeURIComponent(leaveDecisionMatch[1]);
      const action = leaveDecisionMatch[2];
      if (action === "approve") {
        const leaveRequest = context.leaveStore.get({ tenant_id: tenantId, request_id: requestId });
        const applicantActorIds = leaveRequest
          ? [
              leaveRequest.employee_id,
              ...context.repository
                .listEmployeeUserLinks({ tenant_id: tenantId, employee_id: leaveRequest.employee_id })
                .map((link) => link.user_id),
            ]
          : [];
        return context.leaveService
          .approve(actorContext, {
            request_id: requestId,
            approver_id: actorContext.actor_id,
            applicant_actor_ids: applicantActorIds,
            decision_reason: body.decision_reason ?? "approved_from_leave_page",
          })
          .then((leave_request) => response(200, { outcome: "approved", leave_request }))
          .catch(safeError);
      }
      return context.leaveService
        .reject(actorContext, {
          request_id: requestId,
          decision_reason: body.decision_reason ?? "rejected_from_leave_page",
        })
        .then((leave_request) => response(200, { outcome: "rejected", leave_request }))
        .catch(safeError);
    }

    if (pathname === "/api/hrx/approvals" && method === "GET") {
      return response(200, {
        outcome: "ok",
        approvals: context.approvals.filter((approval) => approval.tenant_id === tenantId).map(clone),
      });
    }

    const approvalMatch = pathname.match(/^\/api\/hrx\/approvals\/([^/]+)\/(approve|reject)$/);
    if (approvalMatch && method === "POST") {
      const approvalId = decodeURIComponent(approvalMatch[1]);
      const action = approvalMatch[2];
      const index = context.approvals.findIndex((approval) => approval.tenant_id === tenantId && approval.approval_id === approvalId);
      if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_APPROVAL_NOT_FOUND" });
      const approval = context.approvals[index];
      const next = resolveApprovalRequest(context.approvals[index], {
        state: action === "approve" ? "approved" : "rejected",
        decided_by: actorContext.actor_id,
        decision_reason: body.decision_reason ?? `${action}_from_manager_queue`,
      });
      const finalize = (extraBody = {}) => {
        persistRuntimeUpdate(context, "approvals", next);
        context.approvals[index] = next;
        appendRuntimeAudit(context.audit, {
          ...actorContext,
          action: `hrx.approval.${action}`,
          object_type: "ApprovalRequest",
          object_id: next.approval_id,
          reason: `approval_${action}_recorded`,
        });
        return response(200, { outcome: action === "approve" ? "approved" : "rejected", approval: next, ...extraBody });
      };
      if (approval.object_type === "LeaveRequest") {
        if (action === "approve") {
          const leaveRequest = context.leaveStore.get({ tenant_id: tenantId, request_id: approval.object_id });
          const applicantActorIds = leaveRequest
            ? [
                leaveRequest.employee_id,
                ...context.repository
                  .listEmployeeUserLinks({ tenant_id: tenantId, employee_id: leaveRequest.employee_id })
                  .map((link) => link.user_id),
              ]
            : [];
          return context.leaveService
            .approve(actorContext, {
              request_id: approval.object_id,
              approver_id: actorContext.actor_id,
              applicant_actor_ids: applicantActorIds,
              decision_reason: body.decision_reason ?? "approved_from_manager_queue",
            })
            .then((leave_request) => finalize({ leave_request }))
            .catch(safeError);
        }
        return context.leaveService
          .reject(actorContext, {
            request_id: approval.object_id,
            decision_reason: body.decision_reason ?? "rejected_from_manager_queue",
          })
          .then((leave_request) => finalize({ leave_request }))
          .catch(safeError);
      }
      return finalize();
    }

    if (pathname === "/api/hrx/candidate/portal" && method === "GET") {
      const candidateId = query.candidate_id ?? "cand-001";
      const candidate = context.candidates.find((item) => item.tenant_id === tenantId && item.candidate_id === candidateId);
      if (!candidate) return response(404, { outcome: "not_found", safe_error_code: "HRX_CANDIDATE_NOT_FOUND" });
      const privacy = createCandidatePrivacyProjection({
        candidate,
        consents: context.candidateConsents,
        as_of: query.as_of ?? context.clock(),
        viewer_role_ids: [...actorRoleSet(actorContext)],
      });
      const contentVisible = ["active", "retention_hold"].includes(privacy.privacy_state);
      const applications = contentVisible
        ? context.applications.filter((application) => application.tenant_id === tenantId && application.candidate_id === candidateId)
        : [];
      return response(200, {
        outcome: "ok",
        candidate: privacy,
        applications: applications.map(clone),
        documents: contentVisible && privacy.resume_ref
          ? [{
              document_id: "cand-doc-001",
              document_type: "resume",
              source_ref: privacy.resume_ref,
              body_included: false,
            }]
          : [],
      });
    }

    if (pathname === "/api/hrx/recruiting/pipeline" && method === "GET") {
      const asOf = query.as_of ?? context.clock();
      const viewerRoleIds = [...actorRoleSet(actorContext)];
      return response(200, {
        outcome: "ok",
        capabilities: {
          pipeline_creation: recruitingSourceAuthorityCapability(context, actorContext),
        },
        job_openings: context.jobOpenings.filter((opening) => opening.tenant_id === tenantId).map(clone),
        candidates: context.candidates
          .filter((candidate) => candidate.tenant_id === tenantId)
          .map((candidate) => createCandidatePrivacyProjection({
            candidate,
            consents: context.candidateConsents,
            as_of: asOf,
            viewer_role_ids: viewerRoleIds,
          })),
        applications: context.applications.filter((application) => application.tenant_id === tenantId).map(clone),
        interviews: context.interviews
          .filter((interview) => interview.tenant_id === tenantId)
          .map((interview) => projectInterviewForRecruitingViewer(interview, viewerRoleIds)),
        offers: context.offers.filter((offer) => offer.tenant_id === tenantId).map(clone),
      });
    }

    if (pathname === "/api/hrx/recruiting/pipeline" && method === "POST") {
      const requestInput = withoutAuthenticatedActor(body);
      assertRecruitingPipelineInput(requestInput);
      const idempotencyKey = recruitingPipelineIdempotencyKey(requestInput);
      const { idempotency_key: _idempotencyKey, ...pipelineInput } = requestInput;
      const inputHash = recruitingPipelineInputHash(pipelineInput);
      const replay = recruitingPipelineReceipt(context, tenantId, idempotencyKey);
      if (replay) {
        return recruitingPipelineResponse(
          assertRecruitingPipelineReceipt(replay, actorContext, inputHash),
          true,
        );
      }
      requireActiveRecruitingEmployee(
        context.repository,
        tenantId,
        pipelineInput.hiring_manager_employee_id,
        "hiring_manager_employee_id",
      );
      requireActiveRecruitingEmployee(
        context.repository,
        tenantId,
        pipelineInput.interviewer_employee_id,
        "interviewer_employee_id",
      );
      const sources = requireRecruitingPipelineAuthority(context, actorContext, pipelineInput);
      const receiptDigest = recruitingPipelineDigest([
        tenantId,
        actorContext.actor_id,
        idempotencyKey,
      ]);
      const recordSuffix = receiptDigest.slice(0, 32);
      const candidateId = `cand_${recordSuffix}`;
      const jobOpeningId = `job_${recordSuffix}`;
      const applicationId = `app_${recordSuffix}`;
      const jobOpening = createJobOpening({
        tenant_id: tenantId,
        job_opening_id: jobOpeningId,
        title: pipelineInput.job_title,
        department_ref: pipelineInput.department_ref,
        hiring_manager_employee_id: pipelineInput.hiring_manager_employee_id,
        position_count: Number(pipelineInput.position_count),
        state: "open",
        approval_ref: sources.job_opening?.approval_ref,
        opened_at: sources.job_opening?.opened_at ?? context.clock(),
      });
      const consent = createCandidateConsent({
        tenant_id: tenantId,
        consent_id: sources.candidate?.consent?.consent_id,
        candidate_id: candidateId,
        purpose: "recruiting_processing",
        granted_at: sources.candidate?.consent?.granted_at,
        expires_at: sources.candidate?.consent?.expires_at,
        evidence_ref: sources.candidate?.consent?.evidence_ref,
      });
      const candidate = createCandidateProfile({
        tenant_id: tenantId,
        candidate_id: candidateId,
        legal_name: pipelineInput.candidate_name,
        email: pipelineInput.candidate_email,
        source_ref: sources.candidate?.source_ref,
        resume_ref: sources.candidate?.resume_ref,
        retention_policy_id: sources.candidate?.retention_policy_id,
        retention_expires_at: sources.candidate?.retention_expires_at,
      });
      assertCandidateConsentAllowsProcessing([...context.candidateConsents, consent], {
        tenant_id: tenantId,
        candidate_id: candidateId,
        as_of: context.clock(),
      });
      const application = createApplication({
        tenant_id: tenantId,
        application_id: applicationId,
        candidate_id: candidateId,
        job_opening_id: jobOpeningId,
        submitted_at: sources.application?.submitted_at ?? context.clock(),
      });
      const interview = createInterview({
        tenant_id: tenantId,
        interview_id: `int_${recordSuffix}`,
        application_id: applicationId,
        candidate_id: candidateId,
        scheduled_for: sources.interview?.scheduled_for,
        schedule_source_ref: sources.interview?.schedule_source_ref,
        interviewer_employee_ids: [pipelineInput.interviewer_employee_id],
      });
      const offer = createOffer({
        tenant_id: tenantId,
        offer_id: `offer_${recordSuffix}`,
        application_id: applicationId,
        candidate_id: candidateId,
        compensation_ref: sources.offer?.compensation_ref,
        document_ref: sources.offer?.document_ref,
        state: "sent",
        approval_ref: sources.offer?.approval_ref,
      });
      const receipt = Object.freeze({
        tenant_id: tenantId,
        pipeline_receipt_id: `recruiting_pipeline_${receiptDigest}`,
        idempotency_key: idempotencyKey,
        input_hash: inputHash,
        job_opening_id: jobOpening.job_opening_id,
        consent_id: consent.consent_id,
        candidate_id: candidate.candidate_id,
        application_id: application.application_id,
        interview_id: interview.interview_id,
        offer_id: offer.offer_id,
        created_by_actor_id: actorContext.actor_id,
        created_at: context.clock(),
      });
      const persisted = persistRecruitingPipeline(context, actorContext, {
        jobOpening,
        consent,
        candidate,
        application,
        interview,
        offer,
      }, receipt);
      return recruitingPipelineResponse(persisted.receipt, persisted.replayed);
    }

    if (pathname === "/api/hrx/recruiting/job-openings" && method === "POST") {
      requireActiveRecruitingEmployee(
        context.repository,
        tenantId,
        body.hiring_manager_employee_id,
        "hiring_manager_employee_id",
      );
      requireRecruitingSourceAuthority(context, actorContext, "job_opening", body);
      const jobOpening = createJobOpening({ ...body, tenant_id: tenantId });
      persistRuntimeInsert(context, "jobOpenings", jobOpening);
      context.jobOpenings.push(jobOpening);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.job_opening.create",
        object_type: "JobOpening",
        object_id: jobOpening.job_opening_id,
        reason: "job_opening_created_through_api",
        metadata: { state: jobOpening.state },
      });
      return response(201, { outcome: "created", job_opening: jobOpening });
    }

    if (pathname === "/api/hrx/recruiting/candidates" && method === "POST") {
      requireRecruitingSourceAuthority(context, actorContext, "candidate", body);
      const consent = createCandidateConsent({
        ...(body.consent ?? {}),
        tenant_id: tenantId,
        candidate_id: body.candidate_id,
      });
      const candidate = createCandidateProfile({ ...body, tenant_id: tenantId });
      if (context.candidateConsents.some((item) => item.tenant_id === tenantId && item.consent_id === consent.consent_id)) {
        throw new TypeError("candidate consent already exists");
      }
      if (context.candidates.some((item) => item.tenant_id === tenantId && item.candidate_id === candidate.candidate_id)) {
        throw new TypeError("candidate already exists");
      }
      assertCandidateConsentAllowsProcessing([...context.candidateConsents, consent], {
        tenant_id: tenantId,
        candidate_id: body.candidate_id,
      });
      persistRuntimeInsert(context, "candidateConsents", consent);
      persistRuntimeInsert(context, "candidates", candidate);
      context.candidateConsents.push(consent);
      context.candidates.push(candidate);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.candidate.create",
        object_type: "Candidate",
        object_id: candidate.candidate_id,
        reason: "candidate_created_with_consent_through_api",
        metadata: {
          consent_id: consent.consent_id,
          consent_purpose: consent.purpose,
          retention_policy_id: candidate.retention_policy_id,
          retention_expires_at: candidate.retention_expires_at,
          access_role_ids: candidate.access_role_ids,
          raw_content_included: false,
        },
      });
      return response(201, {
        outcome: "created",
        candidate: createCandidatePrivacyProjection({
          candidate,
          consents: [...context.candidateConsents],
          as_of: context.clock(),
          viewer_role_ids: [...actorRoleSet(actorContext)],
        }),
      });
    }

    if (pathname === "/api/hrx/recruiting/applications" && method === "POST") {
      requireRecruitingRecord(context.candidates, tenantId, "candidate_id", body.candidate_id, "HRX_CANDIDATE_NOT_FOUND");
      requireRecruitingRecord(context.jobOpenings, tenantId, "job_opening_id", body.job_opening_id, "HRX_JOB_OPENING_NOT_FOUND");
      const application = createApplication({ ...body, tenant_id: tenantId });
      persistRuntimeInsert(context, "applications", application);
      context.applications.push(application);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.application.create",
        object_type: "Application",
        object_id: application.application_id,
        reason: "application_created_through_api",
        metadata: { stage: application.stage },
      });
      return response(201, { outcome: "created", application });
    }

    if (pathname === "/api/hrx/recruiting/interviews" && method === "POST") {
      requireRecruitingRecord(context.applications, tenantId, "application_id", body.application_id, "HRX_APPLICATION_NOT_FOUND");
      requireRecruitingRecord(context.candidates, tenantId, "candidate_id", body.candidate_id, "HRX_CANDIDATE_NOT_FOUND");
      const interview = createInterview({ ...body, tenant_id: tenantId });
      for (const interviewerEmployeeId of interview.interviewer_employee_ids) {
        requireActiveRecruitingEmployee(
          context.repository,
          tenantId,
          interviewerEmployeeId,
          "interviewer_employee_ids",
        );
      }
      requireRecruitingSourceAuthority(context, actorContext, "interview", body);
      persistRuntimeInsert(context, "interviews", interview);
      context.interviews.push(interview);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.interview.create",
        object_type: "Interview",
        object_id: interview.interview_id,
        reason: "interview_created_through_api",
        metadata: { application_id: interview.application_id, state: interview.state },
      });
      return response(201, { outcome: "created", interview });
    }

    if (pathname === "/api/hrx/recruiting/offers" && method === "POST") {
      requireRecruitingRecord(context.applications, tenantId, "application_id", body.application_id, "HRX_APPLICATION_NOT_FOUND");
      requireRecruitingRecord(context.candidates, tenantId, "candidate_id", body.candidate_id, "HRX_CANDIDATE_NOT_FOUND");
      requireRecruitingSourceAuthority(context, actorContext, "offer", body);
      const offer = createOffer({ ...body, tenant_id: tenantId });
      persistRuntimeInsert(context, "offers", offer);
      context.offers.push(offer);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.offer.create",
        object_type: "Offer",
        object_id: offer.offer_id,
        reason: "offer_created_through_api",
        metadata: { application_id: offer.application_id, state: offer.state },
      });
      return response(201, { outcome: "created", offer });
    }

    const applicationStageMatch = pathname.match(/^\/api\/hrx\/recruiting\/applications\/([^/]+)\/stage$/);
    if (applicationStageMatch && method === "POST") {
      const applicationId = decodeURIComponent(applicationStageMatch[1]);
      const index = context.applications.findIndex((application) => application.tenant_id === tenantId && application.application_id === applicationId);
      if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_APPLICATION_NOT_FOUND" });
      const next = transitionApplicationStage(context.applications[index], {
        stage: body.stage,
        stage_reason: body.stage_reason ?? "updated_from_recruiting_pipeline",
      });
      persistRuntimeUpdate(context, "applications", next);
      context.applications[index] = next;
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.application.stage.update",
        object_type: "Application",
        object_id: next.application_id,
        reason: "application_stage_updated",
        metadata: { stage: next.stage },
      });
      return response(200, { outcome: "updated", application: next });
    }

    const offerStageMatch = pathname.match(/^\/api\/hrx\/recruiting\/offers\/([^/]+)\/stage$/);
    if (offerStageMatch && method === "POST") {
      const offerId = decodeURIComponent(offerStageMatch[1]);
      const index = context.offers.findIndex((offer) => offer.tenant_id === tenantId && offer.offer_id === offerId);
      if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_OFFER_NOT_FOUND" });
      const next = transitionOffer(context.offers[index], {
        state: body.state,
        approval_ref: context.offers[index].approval_ref,
      });
      persistRuntimeUpdate(context, "offers", next);
      context.offers[index] = next;
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.offer.stage.update",
        object_type: "Offer",
        object_id: next.offer_id,
        reason: "offer_stage_updated",
        metadata: { state: next.state },
      });
      return response(200, { outcome: "updated", offer: next });
    }

    const applicationConvertMatch = pathname.match(/^\/api\/hrx\/recruiting\/applications\/([^/]+)\/convert-to-employee$/);
    if (applicationConvertMatch && method === "POST") {
      const applicationId = decodeURIComponent(applicationConvertMatch[1]);
      const application = requireRecruitingRecord(context.applications, tenantId, "application_id", applicationId, "HRX_APPLICATION_NOT_FOUND");
      const candidate = requireRecruitingRecord(context.candidates, tenantId, "candidate_id", application.candidate_id, "HRX_CANDIDATE_NOT_FOUND");
      const offer = context.offers.find((item) => item.tenant_id === tenantId && item.application_id === application.application_id && item.candidate_id === candidate.candidate_id);
      if (!offer) return response(404, { outcome: "not_found", safe_error_code: "HRX_OFFER_NOT_FOUND" });
      const jobOpening = requireRecruitingRecord(
        context.jobOpenings,
        tenantId,
        "job_opening_id",
        application.job_opening_id,
        "HRX_JOB_OPENING_NOT_FOUND",
      );
      const result = executeCandidateConversion({
        repository: context.repository,
        audit: context.audit,
        actor: actorContext,
        input: withoutAuthenticatedActor(body),
        authority: {
          candidate,
          application,
          offer,
          job_opening: jobOpening,
        },
        clock: context.clock,
      });
      return response(result.replayed ? 200 : 201, {
        outcome: result.replayed ? "replayed" : "converted",
        replayed: result.replayed,
        receipt: result.receipt,
        conversion: {
          employee: result.receipt.results.employee.value,
          employment_profile: result.receipt.results.employment_profile.value,
          employee_user_link: result.receipt.results.employee_user_link.value,
          crm_party_linked: result.receipt.crm_party_linked,
        },
      });
    }

    if (pathname === "/api/hrx/lifecycle/templates" && method === "GET") {
      return response(200, {
        outcome: "ok",
        templates: context.lifecycleTemplates
          .filter((template) => template.tenant_id === tenantId)
          .filter((template) => !query.lifecycle_kind || template.lifecycle_kind === query.lifecycle_kind)
          .filter((template) => !query.role_key || template.role_key === query.role_key)
          .map(clone),
      });
    }

    if (pathname === "/api/hrx/lifecycle/templates" && method === "POST") {
      const template = lifecycleTemplateRow(tenantId, body);
      if (
        context.lifecycleTemplates.some(
          (candidate) =>
            candidate.tenant_id === tenantId &&
            candidate.template_version_id === template.template_version_id,
        )
      ) {
        throw safeHrxRuntimeError(
          409,
          "HRX_LIFECYCLE_TEMPLATE_VERSION_EXISTS",
          "Lifecycle template version already exists",
        );
      }
      persistRuntimeInsert(context, "lifecycleTemplates", template);
      context.lifecycleTemplates.push(template);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.lifecycle.template.create",
        object_type: "LifecycleTemplate",
        object_id: template.template_version_id,
        reason: "lifecycle_template_version_created",
        metadata: {
          lifecycle_kind: template.lifecycle_kind,
          role_key: template.role_key,
          version: template.version,
        },
      });
      return response(201, { outcome: "created", template });
    }

    if (pathname === "/api/hrx/lifecycle/onboarding" && method === "POST") {
      const template = resolveLifecycleTemplate(context, {
        tenant_id: tenantId,
        lifecycle_kind: "onboarding",
        template_id: body.template_id,
        version: body.template_version,
        role_key: body.role_key,
        as_of: body.start_date,
      });
      const onboarding = createOnboardingPlan({
        ...body,
        tenant_id: tenantId,
        template,
      });
      if (
        context.onboardingPlans.some(
          (plan) => plan.tenant_id === tenantId && plan.onboarding_id === onboarding.onboarding_id,
        )
      ) {
        throw safeHrxRuntimeError(
          409,
          "HRX_ONBOARDING_PLAN_EXISTS",
          "Onboarding plan already exists",
        );
      }
      persistRuntimeInsert(context, "onboardingPlans", onboarding);
      context.onboardingPlans.push(onboarding);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.onboarding.create",
        object_type: "OnboardingPlan",
        object_id: onboarding.onboarding_id,
        reason: "onboarding_plan_created_from_template",
        metadata: {
          template_id: onboarding.template_ref.template_id,
          template_version: onboarding.template_ref.version,
        },
      });
      return response(201, { outcome: "created", onboarding });
    }

    if (pathname === "/api/hrx/lifecycle/onboarding" && method === "GET") {
      return response(200, {
        outcome: "ok",
        onboarding: context.onboardingPlans
          .filter((plan) => plan.tenant_id === tenantId)
          .map((plan) => projectLifecycleEmployeeName(context, actorContext, plan)),
      });
    }

    const onboardingTaskMatch = pathname.match(/^\/api\/hrx\/lifecycle\/onboarding\/([^/]+)\/tasks\/([^/]+)$/);
    if (onboardingTaskMatch && method === "POST") {
      const onboardingId = decodeURIComponent(onboardingTaskMatch[1]);
      const taskId = decodeURIComponent(onboardingTaskMatch[2]);
      const index = context.onboardingPlans.findIndex((plan) => plan.tenant_id === tenantId && plan.onboarding_id === onboardingId);
      if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_ONBOARDING_PLAN_NOT_FOUND" });
      const next = updateOnboardingTask(context.onboardingPlans[index], taskId, body);
      persistRuntimeUpdate(context, "onboardingPlans", next);
      context.onboardingPlans[index] = next;
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.onboarding.task.update",
        object_type: "OnboardingTask",
        object_id: taskId,
        reason: "onboarding_task_updated",
        metadata: {
          onboarding_id: next.onboarding_id,
          status: next.tasks.find((task) => task.task_id === taskId)?.status,
          template_version: next.template_ref?.version ?? null,
        },
      });
      return response(200, { outcome: "updated", onboarding: next });
    }

    if (pathname === "/api/hrx/lifecycle/offboarding" && method === "POST") {
      const leaveCompletionStatusClaimed =
        body.leave_reconciliation_status !== undefined &&
        body.leave_reconciliation_status !== "pending";
      const leaveCompletionEvidenceClaimed =
        body.leave_reconciliation_evidence_ref !== undefined &&
        body.leave_reconciliation_evidence_ref !== null &&
        body.leave_reconciliation_evidence_ref !== "";
      if (
        leaveCompletionStatusClaimed ||
        leaveCompletionEvidenceClaimed
      ) {
        throw safeHrxRuntimeError(
          400,
          "HRX_OFFBOARDING_LEAVE_EVIDENCE_FORBIDDEN",
          "Leave reconciliation completion can only be recorded by the payroll delivery workflow",
        );
      }
      const template = resolveLifecycleTemplate(context, {
        tenant_id: tenantId,
        lifecycle_kind: "offboarding",
        template_id: body.template_id,
        version: body.template_version,
        role_key: body.role_key,
        as_of: body.separation_date,
      });
      const offboarding = createOffboardingCase({
        ...body,
        tenant_id: tenantId,
        template,
      });
      if (
        context.offboardingCases.some(
          (item) => item.tenant_id === tenantId && item.offboarding_id === offboarding.offboarding_id,
        )
      ) {
        throw safeHrxRuntimeError(
          409,
          "HRX_OFFBOARDING_CASE_EXISTS",
          "Offboarding case already exists",
        );
      }
      persistRuntimeInsert(context, "offboardingCases", offboarding);
      context.offboardingCases.push(offboarding);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.offboarding.create",
        object_type: "OffboardingCase",
        object_id: offboarding.offboarding_id,
        reason: "offboarding_case_created_from_template",
        metadata: {
          template_id: offboarding.template_ref.template_id,
          template_version: offboarding.template_ref.version,
        },
      });
      return response(201, { outcome: "created", offboarding });
    }

    if (pathname === "/api/hrx/lifecycle/offboarding" && method === "GET") {
      const offboarding = context.durableCollections?.offboardingCases?.list() ?? context.offboardingCases;
      const asOf = peopleAsOf(context);
      return response(200, {
        outcome: "ok",
        offboarding: offboarding
          .filter((item) => item.tenant_id === tenantId)
          .map((item) => ({
            ...projectLifecycleEmployeeName(context, actorContext, item),
            operational_close: clone(projectOperationalOffboarding(context, matterContext, item, asOf)),
          })),
      });
    }

    const offboardingTaskMatch = pathname.match(/^\/api\/hrx\/lifecycle\/offboarding\/([^/]+)\/tasks\/([^/]+)$/);
    if (offboardingTaskMatch && method === "POST") {
      const offboardingId = decodeURIComponent(offboardingTaskMatch[1]);
      const taskId = decodeURIComponent(offboardingTaskMatch[2]);
      const index = context.offboardingCases.findIndex(
        (item) => item.tenant_id === tenantId && item.offboarding_id === offboardingId,
      );
      if (index === -1) {
        return response(404, {
          outcome: "not_found",
          safe_error_code: "HRX_OFFBOARDING_CASE_NOT_FOUND",
        });
      }
      const next = updateOffboardingTask(context.offboardingCases[index], taskId, body);
      persistRuntimeUpdate(context, "offboardingCases", next);
      context.offboardingCases[index] = next;
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.offboarding.task.update",
        object_type: "OffboardingTask",
        object_id: taskId,
        reason: "offboarding_task_updated",
        metadata: {
          offboarding_id: next.offboarding_id,
          status: next.tasks.find((task) => task.task_id === taskId)?.status,
          template_version: next.template_ref?.version ?? null,
        },
      });
      return response(200, { outcome: "updated", offboarding: next });
    }

    const offboardingEvidenceMatch = pathname.match(/^\/api\/hrx\/lifecycle\/offboarding\/([^/]+)\/evidence$/);
    if (offboardingEvidenceMatch && method === "POST") {
      const offboardingId = decodeURIComponent(offboardingEvidenceMatch[1]);
      const current = (context.durableCollections?.offboardingCases?.list() ?? context.offboardingCases)
        .find((item) => item.tenant_id === tenantId && item.offboarding_id === offboardingId);
      if (!current) {
        return response(404, {
          outcome: "not_found",
          safe_error_code: "HRX_OFFBOARDING_CASE_NOT_FOUND",
        });
      }
      if (current.state === "closed") {
        throw safeHrxRuntimeError(
          409,
          "HRX_OFFBOARDING_ALREADY_CLOSED",
          "Closed offboarding evidence is immutable",
        );
      }
      const subjectActorIds = offboardingSubjectActorIds(context.repository, tenantId, current.employee_id);
      assertOffboardingEvidenceRecorder({
        offboarding: current,
        actor_id: actorContext.actor_id,
        subject_actor_ids: subjectActorIds,
      });
      let pointer = offboardingEvidencePointers(current).find(
        (candidate) =>
          candidate.category === body.category &&
          candidate.subject_ref === body.subject_ref,
      );
      let accessRecord = null;
      if (pointer?.category === "access_revocation") {
        accessRecord = offboardingAccessSourceRecord(
          context,
          current,
          pointer.subject_ref,
        );
        pointer = Object.freeze({
          ...pointer,
          evidence_ref: accessRecord.evidence_ref,
        });
      }
      if (
        !pointer ||
        !pointer.evidence_ref ||
        body.evidence_ref !== pointer.evidence_ref
      ) {
        throw safeHrxRuntimeError(
          400,
          "HRX_OFFBOARDING_EVIDENCE_POINTER_INVALID",
          "Evidence must match a current offboarding checklist item",
        );
      }
      const asOf = peopleAsOf(context);
      const matterState = pointer.category === "matter_reassignment"
        ? offboardingMatterOperationalState(
            matterContext,
            tenantId,
            current.employee_id,
            asOf,
            current,
          )
        : null;
      offboardingEvidenceOperationalReady(
        current,
        pointer,
        matterState,
        accessRecord,
      );
      const sourceVersions = offboardingEvidenceSourceVersions(
        current,
        matterState,
        accessRecord
          ? {
              source_versions: Object.freeze({
                [`access_revocation:${accessRecord.system_ref}`]:
                  accessRecord.access_source_version,
              }),
            }
          : null,
      );
      const sourceVersion = sourceVersions[`${pointer.category}:${pointer.subject_ref}`];
      if (body.source_version !== undefined && body.source_version !== sourceVersion) {
        throw safeHrxRuntimeError(
          409,
          "HRX_OFFBOARDING_EVIDENCE_SOURCE_STALE",
          "Evidence source changed before confirmation",
        );
      }
      const existingReceipts = (context.durableCollections?.offboardingEvidence?.list() ?? context.offboardingEvidence)
        .filter((receipt) =>
          receipt.tenant_id === tenantId &&
          receipt.offboarding_id === offboardingId);
      const recordedAt = nextOffboardingEvidenceRecordedAt(existingReceipts, pointer, asOf);
      const receipt = createOffboardingEvidenceReceipt({
        tenant_id: tenantId,
        receipt_id: `offboarding-evidence:${offboardingId}:${randomUUID()}`,
        evidence_ref: pointer.evidence_ref,
        offboarding_id: offboardingId,
        category: pointer.category,
        subject_ref: pointer.subject_ref,
        state: "confirmed",
        source_version: sourceVersion,
        recorded_at: recordedAt,
        valid_until: body.valid_until,
        recorded_by_actor_id: actorContext.actor_id,
      });
      persistRuntimeInsert(context, "offboardingEvidence", receipt);
      context.offboardingEvidence.push(receipt);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.offboarding.evidence.record",
        object_type: "OffboardingEvidenceReceipt",
        object_id: receipt.receipt_id,
        reason: "offboarding_source_evidence_confirmed",
        metadata: {
          offboarding_id: current.offboarding_id,
          category: receipt.category,
          subject_ref: receipt.subject_ref,
          evidence_ref: receipt.evidence_ref,
          source_version: receipt.source_version,
          valid_until: receipt.valid_until,
        },
      });
      return response(201, { outcome: "recorded", receipt });
    }

    const offboardingCloseMatch = pathname.match(/^\/api\/hrx\/lifecycle\/offboarding\/([^/]+)\/close$/);
    if (offboardingCloseMatch && method === "POST") {
      const offboardingId = decodeURIComponent(offboardingCloseMatch[1]);
      const current = (context.durableCollections?.offboardingCases?.list() ?? context.offboardingCases)
        .find((item) => item.tenant_id === tenantId && item.offboarding_id === offboardingId);
      if (!current) return response(404, { outcome: "not_found", safe_error_code: "HRX_OFFBOARDING_CASE_NOT_FOUND" });
      if (current.state === "closed") {
        throw safeHrxRuntimeError(
          409,
          "HRX_OFFBOARDING_ALREADY_CLOSED",
          "Offboarding case is already closed",
        );
      }
      const asOf = peopleAsOf(context);
      const employeeLinks = context.repository.listEmployeeUserLinks({
        tenant_id: tenantId,
        employee_id: current.employee_id,
      });
      const subjectActorIds = employeeLinks.map((link) => link.user_id);
      assertOffboardingEvidenceRecorder({
        offboarding: current,
        actor_id: actorContext.actor_id,
        subject_actor_ids: subjectActorIds,
      });
      const matterState = offboardingMatterOperationalState(
        matterContext,
        tenantId,
        current.employee_id,
        asOf,
        current,
      );
      const accessState = offboardingAccessOperationalState(context, current);
      const authorityBackedOffboarding = accessState.offboarding;
      const evidenceRows = (context.durableCollections?.offboardingEvidence?.list() ?? context.offboardingEvidence)
        .filter((receipt) =>
          receipt.tenant_id === tenantId &&
          receipt.offboarding_id === current.offboarding_id);
      const next = closeOffboardingCase(body, {
        current_case: authorityBackedOffboarding,
      });
      const decision = assertOperationalOffboardingClose({
        offboarding: authorityBackedOffboarding,
        evidence_receipts: evidenceRows,
        active_matter_assignments: matterState.active_assignments,
        source_versions: offboardingEvidenceSourceVersions(
          authorityBackedOffboarding,
          matterState,
          accessState,
        ),
        subject_actor_ids: subjectActorIds,
        as_of: asOf,
      });
      const revokedLinkIds = persistClosedOffboarding(context, next, employeeLinks);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.offboarding.close",
        object_type: "OffboardingCase",
        object_id: next.offboarding_id,
        reason: "offboarding_case_closed",
        metadata: {
          state: next.state,
          evidence_count: evidenceRows.length,
          evidence_refs: evidenceRows.map((receipt) => receipt.evidence_ref),
          access_source_versions: accessState.source_versions,
          revoked_employee_user_link_ids: revokedLinkIds,
          revoked_employee_user_link_count: revokedLinkIds.length,
        },
      });
      return response(200, {
        outcome: "closed",
        offboarding: next,
        operational_close: decision,
        account_revocation: {
          state: "completed",
          revoked_link_ids: revokedLinkIds,
          count: revokedLinkIds.length,
        },
      });
    }

    if (pathname === "/api/hrx/policies" && method === "GET") {
      return response(200, { outcome: "ok", policies: context.policies.filter((policy) => policy.tenant_id === tenantId).map(clone) });
    }

    if (pathname === "/api/hrx/policies" && method === "POST") {
      const policy = Object.freeze({
        tenant_id: tenantId,
        policy_id: body.policy_id,
        policy_type: body.policy_type,
        policy_version: body.policy_version,
        effective_from: body.effective_from,
        configured_by: actorContext.actor_id,
      });
      for (const field of ["policy_id", "policy_type", "policy_version", "effective_from"]) {
        if (typeof policy[field] !== "string" || policy[field].trim() === "") throw new TypeError(`${field} is required`);
      }
      persistRuntimeInsert(context, "policies", policy);
      context.policies.push(policy);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.policy.create",
        object_type: "HRXPolicy",
        object_id: policy.policy_id,
        reason: "policy_version_created",
      });
      return response(201, { outcome: "created", policy });
    }

    if (pathname === "/api/hrx/analytics" && method === "GET") {
      const leaveRequests = context.leaveStore.list({ tenant_id: tenantId });
      const workloadProjection = createHrxMatterWorkloadProjection({
        tenant_id: tenantId,
        time_entries: context.matterTimeEntries,
        leave_requests: leaveRequests,
        deadlines: context.matterDeadlines,
        assignments: context.matterAssignments,
      });
      const analytics = createHrxPeopleAnalyticsReadModel({
        tenant_id: tenantId,
        employees: context.repository.listEmployees({ tenant_id: tenantId }),
        leave_requests: leaveRequests,
        applications: context.applications,
        workload_projection: workloadProjection,
      });
      const workloadConflicts = workloadProjection.flatMap((row) => row.leave_deadline_conflicts);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.analytics.read",
        object_type: "HRXAnalyticsReadModel",
        object_id: "tenant-summary",
        reason: "analytics_read_model_generated",
        metadata: {
          row_level_details_included: false,
          workload_source: workloadProjection.every((row) => row.workload_source === "time_entry_aggregation")
            ? "time_entry_aggregation"
            : "mixed",
          workload_conflict_count: workloadConflicts.length,
        },
      });
      return response(200, {
        outcome: "ok",
        analytics,
        workload_projection: workloadProjection,
        workload_conflicts: workloadConflicts,
      });
    }

    if (pathname === "/api/hrx/ai/assistant") {
      return context.aiRoute.handle({
        method,
        context: actorContext,
        params: { action: "assistant" },
        query,
        body,
      });
    }

    if (pathname === "/api/hrx/ai/reviews") {
      return context.aiRoute.handle({
        method,
        context: actorContext,
        params: { action: "reviews" },
        query,
        body,
      });
    }

    const payrollItemMatch = pathname.match(/^\/api\/hrx\/payroll\/items(?:\/([^/]+))?$/);
    if (payrollItemMatch && context.payrollRuntimeRoute && ["GET", "POST", "PATCH"].includes(method)) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "items", item_id: payrollItemMatch[1] ? decodeURIComponent(payrollItemMatch[1]) : null }, query, body });
    }
    if (pathname === "/api/hrx/payroll/me/profile" && method === "GET" && context.payrollRuntimeRoute) {
      const employeeId = requireSingleEmployeeForActor(context, actorContext);
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "profile-self", employee_id: employeeId }, query, body });
    }
    if (pathname === "/api/hrx/payroll/profiles" && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "profile-create" }, query, body });
    }
    const payrollProfileUpdateMatch = pathname.match(/^\/api\/hrx\/payroll\/profiles\/([^/]+)$/);
    if (payrollProfileUpdateMatch && method === "PATCH" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({
        method,
        context: actorContext,
        params: { action: "profile-update", payroll_profile_id: decodeURIComponent(payrollProfileUpdateMatch[1]) },
        query,
        body,
      });
    }
    const payrollProfileAssignmentMatch = pathname.match(/^\/api\/hrx\/payroll\/profiles\/([^/]+)\/assignments$/);
    if (payrollProfileAssignmentMatch && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "assignment-create", payroll_profile_id: decodeURIComponent(payrollProfileAssignmentMatch[1]) }, query, body });
    }
    const payrollProfileAssignmentRetireMatch = pathname.match(/^\/api\/hrx\/payroll\/profiles\/([^/]+)\/assignments\/([^/]+)\/retire$/);
    if (payrollProfileAssignmentRetireMatch && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({
        method,
        context: actorContext,
        params: {
          action: "assignment-retire",
          payroll_profile_id: decodeURIComponent(payrollProfileAssignmentRetireMatch[1]),
          assignment_id: decodeURIComponent(payrollProfileAssignmentRetireMatch[2]),
        },
        query,
        body,
      });
    }
    const payrollProfileMatch = pathname.match(/^\/api\/hrx\/payroll\/profiles\/([^/]+)$/);
    if (payrollProfileMatch && method === "GET" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "profiles", employee_id: decodeURIComponent(payrollProfileMatch[1]) }, query, body });
    }
    if (pathname === "/api/hrx/payroll/attendance-approvals" && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "attendance-approve" }, query, body });
    }
    if (pathname === "/api/hrx/payroll/rules" && method === "GET" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "rules-list" }, query, body });
    }
    if (pathname === "/api/hrx/payroll/rules" && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "rules-create" }, query, body });
    }
    const payrollRuleMatch = pathname.match(/^\/api\/hrx\/payroll\/rules\/([^/]+)\/(review|publish)$/);
    if (payrollRuleMatch && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({
        method,
        context: actorContext,
        params: {
          action: payrollRuleMatch[2] === "review" ? "rules-review" : "rules-publish",
          rule_version_id: decodeURIComponent(payrollRuleMatch[1]),
        },
        query,
        body,
      });
    }
    if (pathname === "/api/hrx/payroll/minimum-wage" && method === "GET" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "minimum-wage-list" }, query, body });
    }
    if (pathname === "/api/hrx/payroll/minimum-wage" && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "minimum-wage-create" }, query, body });
    }
    if (pathname === "/api/hrx/payroll/minimum-wage/preview" && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "minimum-wage-preview" }, query, body });
    }
    const minimumWageRuleMatch = pathname.match(/^\/api\/hrx\/payroll\/minimum-wage\/([^/]+)\/(legal-approve|review|publish)$/);
    if (minimumWageRuleMatch && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({
        method,
        context: actorContext,
        params: {
          action: ({
            "legal-approve": "minimum-wage-legal-approve",
            review: "minimum-wage-review",
            publish: "minimum-wage-publish",
          })[minimumWageRuleMatch[2]],
          rule_version_id: decodeURIComponent(minimumWageRuleMatch[1]),
        },
        query,
        body,
      });
    }
    if (pathname === "/api/hrx/payroll/dashboard-summary" && method === "GET" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "dashboard-summary" }, query, body });
    }
    if (pathname === "/api/hrx/payroll/periods" && method === "GET" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "list" }, query, body });
    }
    if (pathname === "/api/hrx/payroll/periods" && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "period-create" }, query, body });
    }
    if (pathname === "/api/hrx/payroll/runs" && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "run-create" }, query, body });
    }
    if (pathname === "/api/hrx/payroll/statements/self" && method === "GET" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "statements-self" }, query, body });
    }
    const payrollStatementMatch = pathname.match(/^\/api\/hrx\/payroll\/statements\/([^/]+)\/(download|revoke)$/);
    if (payrollStatementMatch && context.payrollRuntimeRoute && ((method === "GET" && payrollStatementMatch[2] === "download") || (method === "POST" && payrollStatementMatch[2] === "revoke"))) {
      return context.payrollRuntimeRoute.handle({
        method,
        context: actorContext,
        params: { action: payrollStatementMatch[2] === "download" ? "statement-read" : "statement-revoke", statement_id: decodeURIComponent(payrollStatementMatch[1]) },
        query,
        body,
      });
    }
    const payrollRunDocumentMatch = pathname.match(/^\/api\/hrx\/payroll\/runs\/([^/]+)\/(statements|export)(?:\/(generate|deliver))?$/);
    if (payrollRunDocumentMatch && context.payrollRuntimeRoute && (method === "GET" || method === "POST")) {
      const [, runId, resource, operation] = payrollRunDocumentMatch;
      const action = resource === "export" ? "statement-export" : operation === "generate" ? "statements-generate" : operation === "deliver" ? "statements-deliver" : "statements-list";
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action, run_id: decodeURIComponent(runId) }, query, body });
    }
    const payrollRunOperationsMatch = pathname.match(/^\/api\/hrx\/payroll\/runs\/([^/]+)\/(payments|filings)(?:\/(prepare))?$/);
    if (payrollRunOperationsMatch && context.payrollRuntimeRoute && (method === "GET" || method === "POST")) {
      const [, runId, resource, operation] = payrollRunOperationsMatch;
      const action = resource === "payments" ? "payment-prepare" : method === "POST" ? "filing-create" : "filing-list";
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action, run_id: decodeURIComponent(runId) }, query, body });
    }
    const payrollYearEndMatch = pathname.match(/^\/api\/hrx\/payroll\/runs\/([^/]+)\/year-end\/(collect|calculate|review)$/);
    if (payrollYearEndMatch && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: `year-end-${payrollYearEndMatch[2]}`, run_id: decodeURIComponent(payrollYearEndMatch[1]) }, query, body });
    }
    const payrollPaymentMatch = pathname.match(/^\/api\/hrx\/payroll\/payment-batches\/([^/]+)(?:\/(approve|export|reconcile|retry-failed))?$/);
    if (payrollPaymentMatch && context.payrollRuntimeRoute && (method === "GET" || method === "POST")) {
      return context.payrollRuntimeRoute.handle({
        method,
        context: actorContext,
        params: { action: payrollPaymentMatch[2] ? `payment-${payrollPaymentMatch[2]}` : "payment-bundle", payment_batch_id: decodeURIComponent(payrollPaymentMatch[1]) },
        query,
        body,
      });
    }
    const payrollFilingMatch = pathname.match(/^\/api\/hrx\/payroll\/filings\/([^/]+)\/(validate|submit|correct)$/);
    if (payrollFilingMatch && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: `filing-${payrollFilingMatch[2]}`, filing_job_id: decodeURIComponent(payrollFilingMatch[1]) }, query, body });
    }
    const payrollRunMatch = pathname.match(/^\/api\/hrx\/payroll\/runs\/([^/]+)(?:\/(snapshot|preview|approve|close|precheck))?$/);
    if (payrollRunMatch && context.payrollRuntimeRoute && (method === "GET" || method === "POST")) {
      return context.payrollRuntimeRoute.handle({
        method,
        context: actorContext,
        params: { action: payrollRunMatch[2] ?? "bundle", run_id: decodeURIComponent(payrollRunMatch[1]) },
        query,
        body,
      });
    }
    const payrollIssueMatch = pathname.match(/^\/api\/hrx\/payroll\/issues\/([^/]+)\/resolve$/);
    if (payrollIssueMatch && method === "POST" && context.payrollRuntimeRoute) {
      return context.payrollRuntimeRoute.handle({ method, context: actorContext, params: { action: "issue-resolve", issue_id: decodeURIComponent(payrollIssueMatch[1]) }, query, body });
    }

    const payrollMatch = pathname.match(/^\/api\/hrx\/payroll(?:\/(preview|approve|export))?$/);
    if (payrollMatch && method === "POST") {
      return context.payrollRoute.handle({
        method,
        context: actorContext,
        params: { action: payrollMatch[1] ?? body.action ?? "preview", preview_id: body.preview_id },
        body,
      });
    }

    if (pathname === "/api/hrx/audit" && method === "GET") {
      return response(200, {
        outcome: "ok",
        events: context.audit.list({ tenant_id: tenantId }).map(clone),
      });
    }

    return response(404, { outcome: "blocked", safe_error_code: "HRX_API_NOT_FOUND", error: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}
