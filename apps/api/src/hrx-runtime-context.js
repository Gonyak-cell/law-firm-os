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
import { createLeavePolicy } from "../../../packages/hrx/src/rules/leave-policy.js";
import { createInMemoryLeaveBalanceLedger } from "../../../packages/hrx/src/leave/balance.js";
import { createInMemoryLeaveRequestStore, createLeaveRequestService } from "../../../packages/hrx/src/leave/request-service.js";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { createSqlHrxRepository } from "../../../packages/hrx/src/repository-sql.js";
import { createHrxMatterWorkloadProjection } from "../../../packages/matter/src/hrx-workload-projection.js";
import { createHrxAiRoute } from "./routes/hrx/ai.js";

const SYNTHETIC_TENANT = "tenant-a";

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

export function createHrxRuntimeContext({ repository: providedRepository, store } = {}) {
  const repository = providedRepository ?? (store ? createSqlHrxRepository({ store }) : createInMemoryHrxRepository({
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
  }));
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
    matterAssignments,
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

    if (pathname === "/api/hrx/employees" && method === "GET") {
      return response(200, { outcome: "ok", employees: context.repository.listEmployees({ tenant_id: tenantId }) });
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
      });
    }

    if (pathname === "/api/hrx/documents" && method === "GET") {
      return response(200, {
        outcome: "ok",
        documents: context.documents.list({ tenant_id: tenantId, employee_id: query.employee_id }),
      });
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
      return response(200, { outcome: action === "approve" ? "approved" : "rejected", approval: next });
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
      return response(200, { outcome: "updated", application: next });
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
      return response(200, { outcome: "ok", analytics, workload_projection: workloadProjection });
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
      });
    }

    return response(404, { outcome: "blocked", safe_error_code: "HRX_API_NOT_FOUND", error: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}
