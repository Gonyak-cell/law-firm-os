function withQuery(path, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function requestJson(path, options = {}) {
  let response;
  let body;
  try {
    response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...(options.headers ?? {})
      }
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

export async function fetchHrxDocuments(employeeId) {
  if (!employeeId) return { kind: "empty" };
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

export async function fetchCandidatePortal(candidateId = "cand-001") {
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
