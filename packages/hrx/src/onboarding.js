export const HRX_ONBOARDING_TASK_STATUSES = Object.freeze(["pending", "completed", "blocked"]);
export const HRX_ACCESS_REQUEST_STATES = Object.freeze(["requested", "approved", "provisioned", "denied"]);

const BLOCKED_DOCUMENT_FIELDS = Object.freeze(["body", "content", "document_body"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function assertNoDocumentBody(input = {}) {
  for (const field of BLOCKED_DOCUMENT_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Onboarding document must use document_ref, not ${field}`);
  }
}

function normalizeTask(task = {}) {
  const status = task.status ?? "pending";
  if (!HRX_ONBOARDING_TASK_STATUSES.includes(status)) {
    throw new TypeError(`task status must be one of ${HRX_ONBOARDING_TASK_STATUSES.join(", ")}`);
  }
  return Object.freeze({
    task_id: requiredString(task, "task_id"),
    title: requiredString(task, "title"),
    owner_role: requiredString(task, "owner_role"),
    status,
  });
}

function normalizeAccessRequest(request = {}) {
  const state = request.state ?? "requested";
  if (!HRX_ACCESS_REQUEST_STATES.includes(state)) {
    throw new TypeError(`access request state must be one of ${HRX_ACCESS_REQUEST_STATES.join(", ")}`);
  }
  return Object.freeze({
    request_id: requiredString(request, "request_id"),
    system_ref: requiredString(request, "system_ref"),
    access_level: requiredString(request, "access_level"),
    state,
  });
}

export function createOnboardingPlan(input = {}) {
  assertNoDocumentBody(input);
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    onboarding_id: requiredString(input, "onboarding_id"),
    employee_id: requiredString(input, "employee_id"),
    start_date: requiredString(input, "start_date"),
    tasks: Object.freeze((input.tasks ?? []).map(normalizeTask)),
    document_refs: Object.freeze((input.document_refs ?? []).map((document_ref) => requiredString({ document_ref }, "document_ref"))),
    access_requests: Object.freeze((input.access_requests ?? []).map(normalizeAccessRequest)),
  });
}

export function updateOnboardingTask(plan = {}, taskId, patch = {}) {
  const current = createOnboardingPlan(plan);
  let matched = false;
  const tasks = current.tasks.map((task) => {
    if (task.task_id !== taskId) return task;
    matched = true;
    return normalizeTask({ ...task, ...patch });
  });
  if (!matched) throw new Error(`Onboarding task not found: ${taskId}`);
  return createOnboardingPlan({ ...current, tasks });
}
