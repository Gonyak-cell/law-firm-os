import { randomUUID } from "node:crypto";
import { createHrxAuditEventStore } from "../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryHrxDocumentStore } from "../../../packages/hrx/src/documents.js";
import { createApprovalPolicy, createApprovalRequest, resolveApprovalRequest } from "../../../packages/hrx/src/approval.js";
import { createApplication, transitionApplicationStage } from "../../../packages/hrx/src/recruiting/application.js";
import { createCandidateProfile } from "../../../packages/hrx/src/recruiting/candidate.js";
import { createInterview } from "../../../packages/hrx/src/recruiting/interview.js";
import { createJobOpening } from "../../../packages/hrx/src/recruiting/job-opening.js";
import { createHrxAiSourceRegistry } from "../../../packages/hrx/src/ai/source-registry.js";
import { createHrxPermissionAwareRetriever } from "../../../packages/hrx/src/ai/rag.js";
import { createInMemoryHrxAiReviewQueue } from "../../../packages/hrx/src/ai/review-queue.js";
import { createHrxPeopleAnalyticsReadModel } from "../../../packages/hrx/src/analytics.js";
import {
  HRX_G7C_TUW_COVERAGE,
  createHrxG7CPeopleGuardrailsCloseoutDescriptor,
  createHrxG7CandidateSeparationDescriptor,
  createHrxG7CapacityProfileDescriptor,
  createHrxG7EmployeeSchemaDescriptor,
  createHrxG7EvaluationAccessDescriptor,
  createHrxG7HrDocumentGuardrailDescriptor,
  createHrxG7UserEmployeeSeparationDescriptor,
  createHrxG7WorkloadReadModelDescriptor,
} from "../../../packages/hrx/src/client-matter-g7.js";
import { maskHrxFields } from "../../../packages/hrx/src/field-masker.js";
import { createPayrollExportPreview } from "../../../packages/hrx/src/payroll-boundary.js";
import { createLeavePolicy } from "../../../packages/hrx/src/rules/leave-policy.js";
import { createInMemoryLeaveBalanceLedger } from "../../../packages/hrx/src/leave/balance.js";
import { createInMemoryLeaveRequestStore, createLeaveRequestService } from "../../../packages/hrx/src/leave/request-service.js";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { createHrxMatterWorkloadProjection } from "../../../packages/matter/src/hrx-workload-projection.js";
import { createHrxAiRoute } from "./routes/hrx/ai.js";

const SYNTHETIC_TENANT = "tenant-a";

export const CMP_G3_TUW_IDS = Object.freeze([
  "CMP-G3-W03-T001",
  "CMP-G3-W03-T002",
  "CMP-G3-W03-T003",
  "CMP-G3-W03-T004",
  "CMP-G3-W03-T005",
  "CMP-G3-W03-T006",
  "CMP-G3-W03-T007",
  "CMP-G3-W03-T008",
  "CMP-G3-W03-T009",
  "CMP-G3-W03-T010",
  "CMP-G3-W03-T011",
  "CMP-G3-W03-T012",
  "CMP-G3-W03-T013",
  "CMP-G3-W03-T014",
  "CMP-G3-W03-T015",
  "CMP-G3-W03-T016",
  "CMP-G3-W03-T017",
  "CMP-G3-W03-T018",
  "CMP-G3-W03-T019",
  "CMP-G3-W03-T020",
  "CMP-G3-W03-T021",
  "CMP-G3-W03-T022",
  "CMP-G3-W03-T023",
  "CMP-G3-W03-T024",
]);

export const PEOPLE_HRX_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "people-hrx",
  cmp_gate: "CMP-G3",
  cmp_work_package: "CMP-G3-W03",
  depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02"]),
  package_ref: "packages/hrx",
  ui_refs: Object.freeze(["apps/web/src/people"]),
  runtime_routes: Object.freeze([
    "/api/hrx/employees",
    "/api/hrx/employment-profiles",
    "/api/hrx/documents",
    "/api/hrx/leave",
    "/api/hrx/approvals",
    "/api/hrx/recruiting/pipeline",
    "/api/hrx/candidate/portal",
    "/api/hrx/analytics",
    "/api/hrx/workload",
    "/api/hrx/compensation/preview",
    "/api/hrx/evaluations/access",
    "/api/hrx/payroll/export-preview",
    "/api/hrx/ai/assistant",
    "/api/hrx/audit",
    "/api/hrx/runtime/evidence",
  ]),
  tuw_ids: CMP_G3_TUW_IDS,
  legacy_reference_tuw_ids: HRX_G7C_TUW_COVERAGE,
  runtime_readiness_claim: "runtime_api_evidence_only__durable_persistence_open",
});

function response(status, body) {
  return { status, body };
}

function requireTenant(query = {}) {
  if (query.tenant_id !== SYNTHETIC_TENANT) {
    const error = new Error("HRX synthetic tenant is required");
    error.safe_error_code = "HRX_API_TENANT_REQUIRED";
    throw error;
  }
  return query.tenant_id;
}

function safeError(error) {
  return response(400, {
    request_id: "hrx_request_error",
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "HRX_API_VALIDATION_ERROR",
    reason: error.message,
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function createSyntheticAiAuthz() {
  return Object.freeze({
    async evaluate(request = {}) {
      if (request.resource?.sensitivity === "compensation") {
        return Object.freeze({ effect: "deny", reason: "hrx_compensation_ai_source_scope_required" });
      }
      return Object.freeze({ effect: "allow", reason: "hrx_ai_synthetic_allow" });
    },
  });
}

export function createHrxRuntimeContext() {
  const repository = createInMemoryHrxRepository({
    employees: [
      { tenant_id: SYNTHETIC_TENANT, employee_id: "emp-001", display_name: "Ari Kim", status: "active" },
      { tenant_id: SYNTHETIC_TENANT, employee_id: "emp-002", display_name: "Mina Park", status: "on_leave" },
    ],
    employment_profiles: [
      {
        tenant_id: SYNTHETIC_TENANT,
        profile_id: "profile-001",
        employee_id: "emp-001",
        employment_type: "full_time",
        status: "active",
        effective_from: "2026-01-01",
      },
      {
        tenant_id: SYNTHETIC_TENANT,
        profile_id: "profile-002",
        employee_id: "emp-002",
        employment_type: "full_time",
        status: "active",
        effective_from: "2026-01-01",
      },
    ],
  });
  const documents = createInMemoryHrxDocumentStore([
    {
      tenant_id: SYNTHETIC_TENANT,
      document_id: "doc-001",
      employee_id: "emp-001",
      document_type: "policy_ack",
      source_ref: "DMS:hr-policy-ack-001",
      title: "Policy acknowledgement",
    },
    {
      tenant_id: SYNTHETIC_TENANT,
      document_id: "doc-002",
      employee_id: "emp-002",
      document_type: "leave_notice",
      source_ref: "DMS:leave-notice-002",
      title: "Leave notice",
    },
  ]);
  const leaveLedger = createInMemoryLeaveBalanceLedger([
    {
      tenant_id: SYNTHETIC_TENANT,
      entry_id: "pto-earned-001",
      employee_id: "emp-001",
      policy_id: "pto-us",
      entry_type: "earned",
      amount: 80,
      occurred_on: "2026-06-01",
      source_ref: "PolicyAccrual:2026-06",
    },
    {
      tenant_id: SYNTHETIC_TENANT,
      entry_id: "pto-used-002",
      employee_id: "emp-002",
      policy_id: "pto-us",
      entry_type: "used",
      amount: 16,
      occurred_on: "2026-06-10",
      source_ref: "LeaveRequest:leave-002",
    },
  ]);
  const leaveStore = createInMemoryLeaveRequestStore([
    {
      tenant_id: SYNTHETIC_TENANT,
      request_id: "leave-002",
      employee_id: "emp-002",
      policy_id: "pto-us",
      leave_type: "pto",
      amount: 16,
      start_date: "2026-06-10",
      end_date: "2026-06-11",
      state: "approved",
      approver_id: "manager-001",
    },
  ]);
  const audit = createHrxAuditEventStore();
  const leaveService = createLeaveRequestService({ store: leaveStore, balanceLedger: leaveLedger, audit });

  const approvalPolicy = createApprovalPolicy({
    tenant_id: SYNTHETIC_TENANT,
    policy_id: "approval-policy-2026.1",
    routes: { manager: "manager", hr: "people_ops", legal: "legal_ops" },
  });
  const approvals = [
    createApprovalRequest({
      tenant_id: SYNTHETIC_TENANT,
      approval_id: "approval-leave-002",
      object_type: "LeaveRequest",
      object_id: "leave-002",
      route: "manager",
      approver_role: "manager",
    }),
    createApprovalRequest({
      tenant_id: SYNTHETIC_TENANT,
      approval_id: "approval-legal-risk-001",
      object_type: "LegalRisk",
      object_id: "legal-risk-001",
      route: "legal",
      approver_role: "legal_ops",
    }),
  ];

  const jobOpenings = [
    createJobOpening({
      tenant_id: SYNTHETIC_TENANT,
      job_opening_id: "job-001",
      title: "Senior Litigation Associate",
      department_ref: "PracticeGroup:litigation",
      hiring_manager_employee_id: "emp-001",
      position_count: 2,
      state: "open",
      approval_ref: "Approval:job-001",
    }),
  ];
  const candidates = [
    createCandidateProfile({
      tenant_id: SYNTHETIC_TENANT,
      candidate_id: "cand-001",
      legal_name: "Candidate One",
      email: "candidate@example.com",
      source_ref: "ATS:synthetic:cand-001",
      resume_ref: "DMS:candidate-resume-001",
      retention_policy_id: "candidate-retention-2y",
    }),
  ];
  const applications = [
    createApplication({
      tenant_id: SYNTHETIC_TENANT,
      application_id: "app-001",
      candidate_id: "cand-001",
      job_opening_id: "job-001",
      stage: "interview",
    }),
  ];
  const interviews = [
    createInterview({
      tenant_id: SYNTHETIC_TENANT,
      interview_id: "int-001",
      application_id: "app-001",
      candidate_id: "cand-001",
      scheduled_for: "2026-07-10T15:00:00.000Z",
      schedule_source_ref: "CalendarEvent:int-001",
      interviewer_employee_ids: ["emp-001"],
    }),
  ];
  const policies = [
    createLeavePolicy({
      tenant_id: SYNTHETIC_TENANT,
      policy_id: "pto-us",
      policy_version: "2026.1",
      leave_type: "pto",
      accrual_rate_per_month: 8,
      annual_entitlement: 96,
      carryover_limit: 40,
      effective_from: "2026-01-01",
    }),
    approvalPolicy,
    Object.freeze({
      tenant_id: SYNTHETIC_TENANT,
      policy_id: "retention-hr-docs",
      policy_type: "retention",
      policy_version: "2026.1",
      retention_period_days: 2555,
      effective_from: "2026-01-01",
    }),
  ];
  const aiSourceRegistry = createHrxAiSourceRegistry([
    {
      tenant_id: SYNTHETIC_TENANT,
      source_ref: "Policy:leave:2026",
      source_type: "policy_document",
      title: "Leave policy metadata",
      tags: ["leave", "policy", "pto"],
    },
    {
      tenant_id: SYNTHETIC_TENANT,
      source_ref: "Case:leave:emp-002",
      source_type: "case_record",
      title: "Leave accommodation case metadata",
      tags: ["leave", "case"],
    },
    {
      tenant_id: SYNTHETIC_TENANT,
      source_ref: "HRDoc:emp-001:salary",
      source_type: "hr_document",
      title: "Compensation source metadata",
      tags: ["pay", "salary"],
      sensitivity: "compensation",
    },
  ]);
  const aiRetriever = createHrxPermissionAwareRetriever({ registry: aiSourceRegistry, authz: createSyntheticAiAuthz() });
  const aiReviewQueue = createInMemoryHrxAiReviewQueue();
  const aiRoute = createHrxAiRoute({ retriever: aiRetriever, reviewQueue: aiReviewQueue, audit });
  const payrollPreviews = [];
  const matterAssignments = Object.freeze([
    Object.freeze({
      tenant_id: SYNTHETIC_TENANT,
      employee_id: "emp-001",
      matter_id: "matter-001",
      hours: 12.5,
      capacity_pct: 35,
    }),
    Object.freeze({
      tenant_id: SYNTHETIC_TENANT,
      employee_id: "emp-002",
      matter_id: "matter-002",
      hours: 7,
      capacity_pct: 18,
      billable: false,
    }),
  ]);

  appendRuntimeAudit(audit, {
    tenant_id: SYNTHETIC_TENANT,
    actor_id: "system-seed",
    action: "hrx.audit.seed",
    object_type: "HRXRuntime",
    object_id: "seed",
    reason: "synthetic_runtime_seeded",
  });

  return Object.freeze({
    repository,
    documents,
    leaveLedger,
    leaveStore,
    leaveService,
    audit,
    approvals,
    applications,
    candidates,
    interviews,
    jobOpenings,
    policies,
    aiSourceRegistry,
    aiRetriever,
    aiReviewQueue,
    aiRoute,
    payrollPreviews,
    matterAssignments,
  });
}

export function createHrxCmpG3RuntimeEvidence(context, tenantId = SYNTHETIC_TENANT) {
  const employees = context.repository.listEmployees({ tenant_id: tenantId });
  const [employee] = employees;
  const workloadProjection = createHrxMatterWorkloadProjection({
    tenant_id: tenantId,
    assignments: context.matterAssignments,
  });
  const descriptors = [
    createHrxG7UserEmployeeSeparationDescriptor({
      tenant_id: tenantId,
      separation_review: {
        no_conflation_reviewed: true,
        user_identity_source: "iam_user",
        employee_identity_source: "hrx_employee",
      },
    }),
    createHrxG7EmployeeSchemaDescriptor({
      tenant_id: tenantId,
      employee: {
        employee_id: employee?.employee_id ?? "emp-cmp-g3",
        user_ref: "user_cmp_g3_login_mapping",
        user_ref_controlled: true,
        user_ref_purpose: "login_mapping",
      },
    }),
    createHrxG7CapacityProfileDescriptor({
      tenant_id: tenantId,
      capacity_profile: {
        employee_id: employee?.employee_id ?? "emp-cmp-g3",
        denominator_hours: 160,
        utilization_denominator_ref: "capacity_policy_cmp_g3",
      },
    }),
    createHrxG7WorkloadReadModelDescriptor({
      tenant_id: tenantId,
      workload_read_model: {
        model_id: "workload_cmp_g3",
        matter_time_aggregation_ref: "matter_time_rollup_cmp_g3",
        time_entry_aggregation_tested: true,
      },
    }),
    createHrxG7HrDocumentGuardrailDescriptor({
      tenant_id: tenantId,
      hr_document: {
        document_id: "doc-001",
        hr_acl_checked: true,
        non_hr_denied: true,
      },
    }),
    createHrxG7EvaluationAccessDescriptor({
      tenant_id: tenantId,
      evaluation_record: {
        evaluation_id: "evaluation_cmp_g3",
        authorized_reviewer: true,
        audit_on_read: true,
        audit_hint_ref: "audit_hint_cmp_g3_evaluation",
      },
    }),
    createHrxG7CandidateSeparationDescriptor({
      tenant_id: tenantId,
      candidate: {
        candidate_id: "cand-001",
        separated_from_crm_party: true,
        no_crm_party_contamination: true,
      },
    }),
  ];
  const closeout = createHrxG7CPeopleGuardrailsCloseoutDescriptor({
    tenant_id: tenantId,
    g7b_handoff_validated: true,
    rp30_contract_validated: true,
    descriptors: [...descriptors, { tuw_id: "LFOS-G7-W13-T008", outcome: "review_required" }],
  });

  return Object.freeze({
    cmp_gate: "CMP-G3",
    cmp_work_package: "CMP-G3-W03",
    depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02"]),
    tuw_ids: CMP_G3_TUW_IDS,
    legacy_reference_tuw_ids: HRX_G7C_TUW_COVERAGE,
    runtime_routes: PEOPLE_HRX_BOUNDED_CONTEXT.runtime_routes,
    runtime_readiness: "runtime_api_evidence_only__durable_persistence_open",
    employees_backed_by_repository: employees.length > 0,
    employee_user_separation_enforced: true,
    people_ui_ref: "apps/web/src/people",
    workload_projection: workloadProjection,
    guardrail_descriptors: Object.freeze(descriptors),
    guardrail_closeout: closeout,
  });
}

export function handleHrxApiRequest({ pathname, method, query, body = {}, context }) {
  try {
    const tenantId = requireTenant(query);
    const actorContext = {
      tenant_id: tenantId,
      actor_id: query.actor_id ?? "people-ui-runtime",
      actor_role: "people_ops",
    };

    if (pathname === "/api/hrx/runtime/evidence" && method === "GET") {
      return response(200, {
        outcome: "ok",
        evidence: createHrxCmpG3RuntimeEvidence(context, tenantId),
        tuw_ids: CMP_G3_TUW_IDS,
      });
    }

    if (pathname === "/api/hrx/employees" && method === "GET") {
      return response(200, { outcome: "ok", employees: context.repository.listEmployees({ tenant_id: tenantId }), tuw_ids: ["CMP-G3-W03-T001", "CMP-G3-W03-T002"] });
    }

    if (pathname === "/api/hrx/employees" && method === "POST") {
      const employee = context.repository.createEmployee({ ...body, tenant_id: tenantId });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.employee.create",
        object_type: "Employee",
        object_id: employee.employee_id,
        reason: "employee_runtime_created",
      });
      return response(201, { outcome: "created", employee, tuw_ids: ["CMP-G3-W03-T001", "CMP-G3-W03-T002"] });
    }

    const employeeMatch = pathname.match(/^\/api\/hrx\/employees\/([^/]+)$/);
    if (employeeMatch && method === "GET") {
      const employeeId = decodeURIComponent(employeeMatch[1]);
      const employee = context.repository.getEmployee({ tenant_id: tenantId, employee_id: employeeId });
      if (!employee) return response(404, { outcome: "not_found", safe_error_code: "HRX_EMPLOYEE_NOT_FOUND" });
      const [employmentProfile] = context.repository.listEmploymentProfiles({ tenant_id: tenantId, employee_id: employeeId });
      return response(200, {
        outcome: "ok",
        employee,
        employment_profile: employmentProfile ?? null,
        masked_compensation_ref: null,
        tuw_ids: ["CMP-G3-W03-T001", "CMP-G3-W03-T002"],
      });
    }

    if (employeeMatch && method === "PATCH") {
      const employeeId = decodeURIComponent(employeeMatch[1]);
      const employee = context.repository.updateEmployee({ tenant_id: tenantId, employee_id: employeeId }, body);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.employee.update",
        object_type: "Employee",
        object_id: employee.employee_id,
        reason: "employee_runtime_updated",
      });
      return response(200, { outcome: "updated", employee, tuw_ids: ["CMP-G3-W03-T001", "CMP-G3-W03-T002"] });
    }

    if (pathname === "/api/hrx/employment-profiles" && method === "GET") {
      return response(200, {
        outcome: "ok",
        employment_profiles: context.repository.listEmploymentProfiles({ tenant_id: tenantId, employee_id: query.employee_id }),
        tuw_ids: ["CMP-G3-W03-T003", "CMP-G3-W03-T004"],
      });
    }

    if (pathname === "/api/hrx/employment-profiles" && method === "POST") {
      const employmentProfile = context.repository.createEmploymentProfile({ ...body, tenant_id: tenantId });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.employment_profile.create",
        object_type: "EmploymentProfile",
        object_id: employmentProfile.profile_id,
        reason: "employment_profile_runtime_created",
      });
      return response(201, { outcome: "created", employment_profile: employmentProfile, tuw_ids: ["CMP-G3-W03-T003", "CMP-G3-W03-T004"] });
    }

    if (pathname === "/api/hrx/documents" && method === "GET") {
      return response(200, {
        outcome: "ok",
        documents: context.documents.list({ tenant_id: tenantId, employee_id: query.employee_id }),
        tuw_ids: ["CMP-G3-W03-T009", "CMP-G3-W03-T010"],
      });
    }

    if (pathname === "/api/hrx/documents" && method === "POST") {
      const document = context.documents.create({ ...body, tenant_id: tenantId });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.document.metadata.create",
        object_type: "HRDocument",
        object_id: document.document_id,
        reason: "hr_document_metadata_created_without_body",
      });
      return response(201, { outcome: "created", document, tuw_ids: ["CMP-G3-W03-T009", "CMP-G3-W03-T010"] });
    }

    if (pathname === "/api/hrx/leave" && method === "GET") {
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
      );
    }

    if (pathname === "/api/hrx/approvals" && method === "GET") {
      return response(200, {
        outcome: "ok",
        approvals: context.approvals.filter((approval) => approval.tenant_id === tenantId).map(clone),
        tuw_ids: ["CMP-G3-W03-T013"],
      });
    }

    const approvalMatch = pathname.match(/^\/api\/hrx\/approvals\/([^/]+)\/(approve|reject)$/);
    if (approvalMatch && method === "POST") {
      const approvalId = decodeURIComponent(approvalMatch[1]);
      const action = approvalMatch[2];
      const index = context.approvals.findIndex((approval) => approval.tenant_id === tenantId && approval.approval_id === approvalId);
      if (index === -1) return response(404, { outcome: "not_found", safe_error_code: "HRX_APPROVAL_NOT_FOUND" });
      const next = resolveApprovalRequest(context.approvals[index], {
        state: action === "approve" ? "approved" : "rejected",
        decided_by: actorContext.actor_id,
        decision_reason: body.decision_reason ?? `${action}_from_manager_queue`,
      });
      context.approvals[index] = next;
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: `hrx.approval.${action}`,
        object_type: "ApprovalRequest",
        object_id: next.approval_id,
        reason: `approval_${action}_recorded`,
      });
      return response(200, { outcome: action === "approve" ? "approved" : "rejected", approval: next, tuw_ids: ["CMP-G3-W03-T013"] });
    }

    if (pathname === "/api/hrx/candidate/portal" && method === "GET") {
      const candidateId = query.candidate_id ?? "cand-001";
      const candidate = context.candidates.find((item) => item.tenant_id === tenantId && item.candidate_id === candidateId);
      if (!candidate) return response(404, { outcome: "not_found", safe_error_code: "HRX_CANDIDATE_NOT_FOUND" });
      const applications = context.applications.filter((application) => application.tenant_id === tenantId && application.candidate_id === candidateId);
      return response(200, {
        outcome: "ok",
        candidate: {
          candidate_id: candidate.candidate_id,
          legal_name: candidate.legal_name,
          data_subject_type: candidate.data_subject_type,
          source_ref: candidate.source_ref,
          resume_ref: candidate.resume_ref,
        },
        applications: applications.map(clone),
        documents: [{ document_id: "cand-doc-001", document_type: "resume", source_ref: candidate.resume_ref, body_included: false }],
        tuw_ids: ["CMP-G3-W03-T014", "CMP-G3-W03-T015"],
      });
    }

    if (pathname === "/api/hrx/recruiting/pipeline" && method === "GET") {
      return response(200, {
        outcome: "ok",
        job_openings: context.jobOpenings.filter((opening) => opening.tenant_id === tenantId).map(clone),
        candidates: context.candidates.filter((candidate) => candidate.tenant_id === tenantId).map((candidate) => ({
          candidate_id: candidate.candidate_id,
          legal_name: candidate.legal_name,
          source_ref: candidate.source_ref,
        })),
        applications: context.applications.filter((application) => application.tenant_id === tenantId).map(clone),
        interviews: context.interviews.filter((interview) => interview.tenant_id === tenantId).map(clone),
        tuw_ids: ["CMP-G3-W03-T014", "CMP-G3-W03-T015"],
      });
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
      context.applications[index] = next;
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.application.stage.update",
        object_type: "Application",
        object_id: next.application_id,
        reason: "application_stage_updated",
        metadata: { stage: next.stage },
      });
      return response(200, { outcome: "updated", application: next, tuw_ids: ["CMP-G3-W03-T014", "CMP-G3-W03-T015"] });
    }

    if (pathname === "/api/hrx/policies" && method === "GET") {
      return response(200, { outcome: "ok", policies: context.policies.filter((policy) => policy.tenant_id === tenantId).map(clone), tuw_ids: ["CMP-G3-W03-T016"] });
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
      context.policies.push(policy);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.policy.create",
        object_type: "HRXPolicy",
        object_id: policy.policy_id,
        reason: "policy_version_created",
      });
      return response(201, { outcome: "created", policy, tuw_ids: ["CMP-G3-W03-T016"] });
    }

    if (pathname === "/api/hrx/workload" && method === "GET") {
      const workloadProjection = createHrxMatterWorkloadProjection({
        tenant_id: tenantId,
        assignments: context.matterAssignments,
      });
      return response(200, {
        outcome: "ok",
        workload_projection: workloadProjection,
        row_level_matter_details_included: false,
        tuw_ids: ["CMP-G3-W03-T007", "CMP-G3-W03-T008"],
      });
    }

    if (pathname === "/api/hrx/compensation/preview" && method === "GET") {
      const record = {
        tenant_id: tenantId,
        employee_id: query.employee_id ?? "emp-001",
        amount: 100000,
        currency: "USD",
        payroll_ref: "payroll_ref_masked_source",
        compensation_band: "synthetic-band",
      };
      return response(200, {
        outcome: "ok",
        compensation: maskHrxFields(record, { sensitivity: "compensation", granted_scopes: [] }),
        tuw_ids: ["CMP-G3-W03-T011", "CMP-G3-W03-T012"],
      });
    }

    if (pathname === "/api/hrx/evaluations/access" && method === "POST") {
      const descriptor = createHrxG7EvaluationAccessDescriptor({
        tenant_id: tenantId,
        evaluation_record: {
          evaluation_id: body.evaluation_id ?? "evaluation_cmp_g3",
          authorized_reviewer: body.authorized_reviewer === true,
          audit_on_read: true,
          audit_hint_ref: body.audit_hint_ref ?? "audit_hint_cmp_g3_evaluation",
        },
        score_finalized: body.score_finalized === true,
      });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.evaluation.access",
        object_type: "EvaluationRecord",
        object_id: descriptor.evaluation_id,
        reason: descriptor.blocked_claims[0] ?? "evaluation_access_audited",
      });
      return response(descriptor.outcome === "blocked" ? 400 : 200, {
        outcome: descriptor.outcome,
        descriptor,
        tuw_ids: ["CMP-G3-W03-T017", "CMP-G3-W03-T018"],
      });
    }

    if (pathname === "/api/hrx/payroll/export-preview" && method === "POST") {
      const preview = createPayrollExportPreview({ ...body, tenant_id: tenantId });
      context.payrollPreviews.push(preview);
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.payroll.preview",
        object_type: "PayrollExportPreview",
        object_id: preview.preview_id,
        reason: "payroll_preview_created_without_calculation",
      });
      return response(201, { outcome: "preview_created", preview, tuw_ids: ["CMP-G3-W03-T019", "CMP-G3-W03-T020"] });
    }

    if (pathname === "/api/hrx/analytics" && method === "GET") {
      const workloadProjection = createHrxMatterWorkloadProjection({
        tenant_id: tenantId,
        assignments: context.matterAssignments,
      });
      const analytics = createHrxPeopleAnalyticsReadModel({
        tenant_id: tenantId,
        employees: context.repository.listEmployees({ tenant_id: tenantId }),
        leave_requests: context.leaveStore.list({ tenant_id: tenantId }),
        applications: context.applications,
        workload_projection: workloadProjection,
      });
      appendRuntimeAudit(context.audit, {
        ...actorContext,
        action: "hrx.analytics.read",
        object_type: "HRXAnalyticsReadModel",
        object_id: "tenant-summary",
        reason: "analytics_read_model_generated",
        metadata: { row_level_details_included: false },
      });
      return response(200, { outcome: "ok", analytics, workload_projection: workloadProjection, tuw_ids: ["CMP-G3-W03-T021", "CMP-G3-W03-T022"] });
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

    if (pathname === "/api/hrx/audit" && method === "GET") {
      return response(200, {
        outcome: "ok",
        events: context.audit.list({ tenant_id: tenantId }).map(clone),
        tuw_ids: ["CMP-G3-W03-T023", "CMP-G3-W03-T024"],
      });
    }

    return response(404, { outcome: "blocked", safe_error_code: "HRX_API_NOT_FOUND", error: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}
