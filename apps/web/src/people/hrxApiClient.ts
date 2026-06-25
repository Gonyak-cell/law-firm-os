const HRX_TENANT_ID = "tenant_amic_matter_vault";
const HRX_ACTOR_ID = "user_amic_jwsuh";
const HRX_ACTOR_ROLE = "security_admin,hr_admin,people_ops";
const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";
const HRX_SCOPES = [
  "hrx.employee.read",
  "hrx.employee.write",
  "hrx.document.read",
  "hrx.leave.read",
  "hrx.leave.write",
  "hrx.approval.read",
  "hrx.approval.write",
  "hrx.candidate.read",
  "hrx.candidate.write",
  "hrx.policy.read",
  "hrx.policy.write",
  "hrx.lifecycle.read",
  "hrx.lifecycle.write",
  "hrx.analytics.read",
  "hrx.ai.assistant",
  "hrx.ai.review.read",
  "hrx.payroll.preview",
  "hrx.payroll.export",
  "hrx.legal_people.read",
  "hrx.audit.read"
].join(",");

const HRX_STEP_UP_CONTEXT = JSON.stringify({
  tenant_id: HRX_TENANT_ID,
  actor_id: HRX_ACTOR_ID,
  mfa: true,
  assurance_level: 2,
  expires_at: "2099-12-31T23:59:59.000Z"
});

const HRX_RUNTIME_HEADERS = {
  "x-lawos-tenant-id": HRX_TENANT_ID,
  "x-lawos-actor-id": HRX_ACTOR_ID,
  "x-lawos-actor-role": HRX_ACTOR_ROLE,
  "x-lawos-hrx-scopes": HRX_SCOPES,
  "x-lawos-hrx-step-up": HRX_STEP_UP_CONTEXT
};

function roleIds() {
  return HRX_ACTOR_ROLE.split(",").map((role) => role.trim()).filter(Boolean);
}

const HRX_ROUTE_PRINCIPAL = {
  user_id: HRX_ACTOR_ID,
  actor_id: HRX_ACTOR_ID,
  tenant_id: HRX_TENANT_ID,
  role_ids: roleIds()
};

const HRX_ROUTE_CONTEXTS = {
  allow: {
    principal: HRX_ROUTE_PRINCIPAL,
    rules: [{ id: "rule_hrx_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  denied: {
    principal: HRX_ROUTE_PRINCIPAL,
    rules: [],
    object_acl: []
  },
  review: {
    principal: HRX_ROUTE_PRINCIPAL,
    rules: [{ id: "rule_hrx_review", effect: "review_required", action: "*" }],
    object_acl: []
  }
};

function routeContext(ctx = "allow") {
  return HRX_ROUTE_CONTEXTS[ctx] ?? HRX_ROUTE_CONTEXTS.allow;
}

function withQuery(path, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function requestJson(path, options = {}) {
  const { ctx = null, headers = {}, ...fetchOptions } = options;
  let response;
  let body;
  const requestHeaders = {
    "content-type": "application/json",
    ...HRX_RUNTIME_HEADERS,
    ...headers
  };
  if (ctx) {
    requestHeaders[PERMISSION_CONTEXT_HEADER] = JSON.stringify(routeContext(ctx));
  }
  try {
    response = await fetch(path, {
      ...fetchOptions,
      credentials: "same-origin",
      headers: requestHeaders
    });
    body = await response.json();
  } catch {
    return { kind: "error", reason: "network_or_parse_error" };
  }
  if (!response.ok || body === null || typeof body !== "object") {
    if (body?.step_up_required === true) {
      return {
        kind: "step_up_required",
        status: response.status,
        reason: body.safe_error_code ?? body.reason ?? "HRX_STEP_UP_REQUIRED",
        action: body.action ?? null
      };
    }
    if (body?.ui_state === "denied" || body?.ui_state === "review_required") {
      return { kind: "guarded", status: response.status, body };
    }
    return { kind: "error", status: response.status, reason: body?.safe_error_code ?? body?.error ?? "unexpected_response" };
  }
  return { kind: "data", body };
}

export async function fetchHrxEmployees() {
  const result = await requestJson("/api/hrx/employees");
  if (result.kind !== "data" || !Array.isArray(result.body.employees)) return { kind: "error" };
  return { kind: "data", employees: result.body.employees };
}

export async function fetchHrxEmployeeProfile(employeeId) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/employees/${encodeURIComponent(employeeId)}`);
  if (result.kind !== "data" || !result.body.employee) return { kind: "error" };
  return {
    kind: "data",
    employee: result.body.employee,
    employment_profile: result.body.employment_profile ?? null,
    masked_compensation_ref: result.body.masked_compensation_ref ?? null
  };
}

function guardedLegalPeopleResult(result, collectionKey) {
  if (result.kind !== "guarded") return null;
  const body = result.body;
  return {
    kind: "data",
    uiState: body.ui_state,
    outcome: body.outcome,
    safeErrorCodes: body.safe_error_codes ?? [],
    [collectionKey]: Array.isArray(body[collectionKey]) ? body[collectionKey] : [],
    permission_summary: body.permission_summary ?? null,
    claim_boundary: body.claim_boundary ?? null
  };
}

export async function fetchLegalPeopleSearch({ ctx = "allow", ...filters } = {}) {
  const result = await requestJson(withQuery("/api/hrx/legal-people/search", filters), { ctx });
  const guarded = guardedLegalPeopleResult(result, "people");
  if (guarded) return { ...guarded, facets: result.body.facets ?? {} };
  if (result.kind !== "data" || !Array.isArray(result.body.people)) return { kind: "error" };
  return {
    kind: "data",
    uiState: result.body.ui_state ?? null,
    outcome: result.body.outcome ?? "ok",
    people: result.body.people,
    facets: result.body.facets ?? {},
    permission_summary: result.body.permission_summary ?? null,
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function fetchLegalPersonDetail(personId, { ctx = "allow" } = {}) {
  if (!personId) return { kind: "empty" };
  const result = await requestJson(`/api/hrx/legal-people/${encodeURIComponent(personId)}`, { ctx });
  if (result.kind === "guarded") {
    return {
      kind: "data",
      uiState: result.body.ui_state,
      outcome: result.body.outcome,
      person: null,
      affiliations: [],
      clients: [],
      matters: [],
      relationships: [],
      relationships_grouped: {},
      conflict_references: [],
      ethical_wall_references: [],
      audit_summary: null,
      permission_summary: result.body.permission_summary ?? null,
      claim_boundary: result.body.claim_boundary ?? null
    };
  }
  if (result.kind !== "data" || !result.body.person) return { kind: "error" };
  return {
    kind: "data",
    uiState: result.body.ui_state ?? null,
    outcome: result.body.outcome ?? "ok",
    person: result.body.person,
    affiliations: Array.isArray(result.body.affiliations) ? result.body.affiliations : [],
    clients: Array.isArray(result.body.clients) ? result.body.clients : [],
    matters: Array.isArray(result.body.matters) ? result.body.matters : [],
    relationships: Array.isArray(result.body.relationships) ? result.body.relationships : [],
    relationships_grouped: result.body.relationships_grouped ?? {},
    conflict_references: Array.isArray(result.body.conflict_references) ? result.body.conflict_references : [],
    ethical_wall_references: Array.isArray(result.body.ethical_wall_references) ? result.body.ethical_wall_references : [],
    audit_summary: result.body.audit_summary ?? null,
    permission_summary: result.body.permission_summary ?? null,
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function fetchLegalPeopleRelationships({ ctx = "allow", ...filters } = {}) {
  const result = await requestJson(withQuery("/api/hrx/legal-people/relationships", filters), { ctx });
  const guarded = guardedLegalPeopleResult(result, "relationships");
  if (guarded) return { ...guarded, pivot: result.body.pivot ?? {}, relationships_grouped: result.body.relationships_grouped ?? {} };
  if (result.kind !== "data" || !Array.isArray(result.body.relationships)) return { kind: "error" };
  return {
    kind: "data",
    uiState: result.body.ui_state ?? null,
    outcome: result.body.outcome ?? "ok",
    pivot: result.body.pivot ?? {},
    relationships: result.body.relationships,
    relationships_grouped: result.body.relationships_grouped ?? {},
    permission_summary: result.body.permission_summary ?? null,
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function fetchLegalPeopleEthics({ ctx = "allow", ...filters } = {}) {
  const result = await requestJson(withQuery("/api/hrx/legal-people/ethics", filters), { ctx });
  if (result.kind === "guarded") {
    return {
      kind: "data",
      uiState: result.body.ui_state,
      outcome: result.body.outcome,
      review_queue: [],
      ethical_walls: [],
      permission_links: [],
      reviewer_receipts: [],
      state_counts: {},
      permission_summary: result.body.permission_summary ?? null,
      claim_boundary: result.body.claim_boundary ?? null
    };
  }
  if (result.kind !== "data" || !Array.isArray(result.body.review_queue)) return { kind: "error" };
  return {
    kind: "data",
    uiState: result.body.ui_state ?? null,
    outcome: result.body.outcome ?? "ok",
    review_queue: result.body.review_queue,
    ethical_walls: Array.isArray(result.body.ethical_walls) ? result.body.ethical_walls : [],
    permission_links: Array.isArray(result.body.permission_links) ? result.body.permission_links : [],
    reviewer_receipts: Array.isArray(result.body.reviewer_receipts) ? result.body.reviewer_receipts : [],
    state_counts: result.body.state_counts ?? {},
    permission_summary: result.body.permission_summary ?? null,
    claim_boundary: result.body.claim_boundary ?? null
  };
}

export async function fetchHrxDocuments(employeeId, options = {}) {
  if (!employeeId && options.scope !== "all") return { kind: "empty" };
  const result = await requestJson(withQuery("/api/hrx/documents", { employee_id: employeeId }));
  if (result.kind !== "data" || !Array.isArray(result.body.documents)) return { kind: "error" };
  return { kind: "data", documents: result.body.documents };
}

export async function fetchHrxLeaveState(employeeId) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson(withQuery("/api/hrx/leave", { employee_id: employeeId, policy_id: "pto-us" }));
  if (result.kind !== "data") return { kind: "error" };
  return {
    kind: "data",
    balance: result.body.balance ?? null,
    requests: Array.isArray(result.body.requests) ? result.body.requests : []
  };
}

export async function submitHrxLeaveRequest(employeeId, form) {
  if (!employeeId) return { kind: "empty" };
  const result = await requestJson("/api/hrx/leave", {
    method: "POST",
    body: JSON.stringify({
      request_id: `leave-${employeeId}-${Date.now()}`,
      employee_id: employeeId,
      policy_id: "pto-us",
      leave_type: "pto",
      amount: Number(form.amount),
      start_date: form.start_date,
      end_date: form.end_date
    })
  });
  if (result.kind !== "data" || !result.body.leave_request) return { kind: "error" };
  return { kind: "data", leave_request: result.body.leave_request };
}

export async function fetchHrxApprovals() {
  const result = await requestJson("/api/hrx/approvals");
  if (result.kind !== "data" || !Array.isArray(result.body.approvals)) return { kind: "error" };
  return { kind: "data", approvals: result.body.approvals };
}

export async function resolveHrxApproval(approvalId, action) {
  const result = await requestJson(`/api/hrx/approvals/${encodeURIComponent(approvalId)}/${action}`, {
    method: "POST",
    body: JSON.stringify({ decision_reason: `${action}_from_people_ui` })
  });
  if (result.kind !== "data" || !result.body.approval) return { kind: "error" };
  return { kind: "data", approval: result.body.approval };
}

export async function fetchCandidatePortal(candidateId) {
  if (!candidateId) return { kind: "error" };
  const result = await requestJson(withQuery("/api/hrx/candidate/portal", { candidate_id: candidateId }));
  if (result.kind !== "data" || !result.body.candidate || !Array.isArray(result.body.applications)) return { kind: "error" };
  return {
    kind: "data",
    candidate: result.body.candidate,
    applications: result.body.applications,
    documents: Array.isArray(result.body.documents) ? result.body.documents : []
  };
}

export async function fetchRecruitingPipeline() {
  const result = await requestJson("/api/hrx/recruiting/pipeline");
  if (result.kind !== "data" || !Array.isArray(result.body.applications)) return { kind: "error" };
  return {
    kind: "data",
    job_openings: result.body.job_openings ?? [],
    candidates: result.body.candidates ?? [],
    applications: result.body.applications,
    interviews: result.body.interviews ?? [],
    offers: result.body.offers ?? []
  };
}

export async function updateHrxApplicationStage(applicationId, stage) {
  const result = await requestJson(`/api/hrx/recruiting/applications/${encodeURIComponent(applicationId)}/stage`, {
    method: "POST",
    body: JSON.stringify({ stage, stage_reason: "people_ui_pipeline_update" })
  });
  if (result.kind !== "data" || !result.body.application) return { kind: "error" };
  return { kind: "data", application: result.body.application };
}

export async function fetchHrxLifecycleBoard() {
  const [onboarding, offboarding] = await Promise.all([
    requestJson("/api/hrx/lifecycle/onboarding"),
    requestJson("/api/hrx/lifecycle/offboarding")
  ]);
  if (
    onboarding.kind !== "data" ||
    offboarding.kind !== "data" ||
    !Array.isArray(onboarding.body.onboarding) ||
    !Array.isArray(offboarding.body.offboarding)
  ) {
    return { kind: "error" };
  }
  return {
    kind: "data",
    onboarding: onboarding.body.onboarding,
    offboarding: offboarding.body.offboarding
  };
}

export async function updateHrxOnboardingTask(onboardingId, taskId, status) {
  const result = await requestJson(
    `/api/hrx/lifecycle/onboarding/${encodeURIComponent(onboardingId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "POST",
      body: JSON.stringify({ status })
    }
  );
  if (result.kind !== "data" || !result.body.onboarding) return { kind: "error" };
  return { kind: "data", onboarding: result.body.onboarding };
}

export async function closeHrxOffboardingCase(offboardingId) {
  const result = await requestJson(`/api/hrx/lifecycle/offboarding/${encodeURIComponent(offboardingId)}/close`, {
    method: "POST",
    body: JSON.stringify({})
  });
  if (result.kind !== "data" || !result.body.offboarding) return { kind: "error" };
  return { kind: "data", offboarding: result.body.offboarding };
}

export async function fetchHrxPolicies() {
  const result = await requestJson("/api/hrx/policies");
  if (result.kind !== "data" || !Array.isArray(result.body.policies)) return { kind: "error" };
  return { kind: "data", policies: result.body.policies };
}

export async function createHrxPolicyVersion(form) {
  const result = await requestJson("/api/hrx/policies", {
    method: "POST",
    body: JSON.stringify(form)
  });
  if (result.kind !== "data" || !result.body.policy) return { kind: "error" };
  return { kind: "data", policy: result.body.policy };
}

export async function fetchHrxAuditEvents() {
  const result = await requestJson("/api/hrx/audit");
  if (result.kind === "step_up_required") return result;
  if (result.kind !== "data" || !Array.isArray(result.body.events)) return { kind: "error" };
  return { kind: "data", events: result.body.events };
}

export async function fetchHrxAnalytics() {
  const result = await requestJson("/api/hrx/analytics");
  if (result.kind !== "data" || !result.body.analytics) return { kind: "error" };
  return {
    kind: "data",
    analytics: result.body.analytics,
    workload_projection: Array.isArray(result.body.workload_projection) ? result.body.workload_projection : []
  };
}

export async function askHrxAiAssistant(question, options = {}) {
  const result = await requestJson("/api/hrx/ai/assistant", {
    method: "POST",
    body: JSON.stringify({
      question,
      decision_mode: options.decision_mode ?? "advisory",
      decision_domain: options.decision_domain ?? null,
      final_decision: options.final_decision === true
    })
  });
  if (result.kind !== "data") return { kind: "error" };
  return {
    kind: "data",
    outcome: result.body.outcome,
    answer: result.body.answer ?? null,
    review_item: result.body.review_item ?? null,
    citations: Array.isArray(result.body.citations) ? result.body.citations : []
  };
}

export async function fetchHrxAiReviews() {
  const result = await requestJson("/api/hrx/ai/reviews");
  if (result.kind !== "data" || !Array.isArray(result.body.reviews)) return { kind: "error" };
  return { kind: "data", reviews: result.body.reviews };
}

export async function createHrxPayrollPreview(form) {
  const employeeIds = String(form.employee_ids ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const result = await requestJson("/api/hrx/payroll/preview", {
    method: "POST",
    body: JSON.stringify({
      preview_id: `payroll-preview-${Date.now()}`,
      payroll_period: form.payroll_period,
      employee_ids: employeeIds,
      external_provider: form.external_provider || "외부 미리보기 전용"
    })
  });
  if (result.kind !== "data" || !result.body.preview) return { kind: "error" };
  return { kind: "data", preview: result.body.preview };
}

export async function approveHrxPayrollPreview(previewId) {
  const result = await requestJson("/api/hrx/payroll/approve", {
    method: "POST",
    body: JSON.stringify({
      preview_id: previewId,
      approval_ref: `Approval:${previewId}`
    })
  });
  if (result.kind !== "data" || !result.body.preview) return { kind: "error" };
  return { kind: "data", preview: result.body.preview };
}

export async function exportHrxPayrollArtifact(previewId, exportArtifactRef) {
  const result = await requestJson("/api/hrx/payroll/export", {
    method: "POST",
    body: JSON.stringify({
      preview_id: previewId,
      export_artifact_ref: exportArtifactRef || `문서:${previewId}:내보내기-파일`,
      provider_payload_ref: `ProviderDraft:${previewId}`
    })
  });
  if (result.kind !== "data" || !result.body.artifact) return { kind: "error" };
  return { kind: "data", artifact: result.body.artifact };
}

export async function fetchHrxPeopleOverview() {
  const employees = await fetchHrxEmployees();
  if (employees.kind !== "data") return { kind: "error" };
  return {
    kind: "data",
    metrics: {
      employee_count: employees.employees.length,
      active_count: employees.employees.filter((employee) => employee.status === "active").length,
      on_leave_count: employees.employees.filter((employee) => employee.status === "on_leave").length
    }
  };
}
