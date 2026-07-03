export const HRX_ONBOARDING_TASK_STATUSES = Object.freeze(["pending", "completed", "blocked"]);
export const HRX_ACCESS_REQUEST_STATES = Object.freeze(["requested", "approved", "provisioned", "denied"]);
export const HRX_ONBOARDING_MATTER_ASSIGNMENT_TASKS = Object.freeze([
  Object.freeze({
    task_id: "default-security-training",
    title: "Complete security training",
    owner_role: "people_ops",
  }),
  Object.freeze({
    task_id: "default-confidentiality-pledge",
    title: "Sign confidentiality pledge",
    owner_role: "people_ops",
  }),
]);
export const HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS = Object.freeze(
  HRX_ONBOARDING_MATTER_ASSIGNMENT_TASKS.map((task) => task.task_id),
);

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

function normalizeMatterAssignmentGate(input = {}) {
  const gate = input.matter_assignment_gate ?? {};
  const requiredTaskIds = gate.required_task_ids ?? HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS;
  const waiverRef = gate.waiver_ref ?? input.matter_assignment_gate_waiver_ref;
  if (!Array.isArray(requiredTaskIds) || requiredTaskIds.length === 0) {
    throw new TypeError("matter assignment gate requires at least one task id");
  }
  return Object.freeze({
    enabled: true,
    required_task_ids: Object.freeze(
      requiredTaskIds.map((task_id) => requiredString({ task_id }, "task_id")),
    ),
    waiver_ref: waiverRef ? requiredString({ waiver_ref: waiverRef }, "waiver_ref") : null,
  });
}

function withDefaultMatterAssignmentTasks(tasks = [], requiredTaskIds = HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS) {
  const byId = new Map(tasks.map((task) => [task.task_id, task]));
  for (const defaultTask of HRX_ONBOARDING_MATTER_ASSIGNMENT_TASKS) {
    if (requiredTaskIds.includes(defaultTask.task_id) && !byId.has(defaultTask.task_id)) {
      byId.set(defaultTask.task_id, normalizeTask(defaultTask));
    }
  }
  return Object.freeze([...byId.values()]);
}

export function createOnboardingPlan(input = {}) {
  assertNoDocumentBody(input);
  const matterAssignmentGate = normalizeMatterAssignmentGate(input);
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    onboarding_id: requiredString(input, "onboarding_id"),
    employee_id: requiredString(input, "employee_id"),
    start_date: requiredString(input, "start_date"),
    tasks: withDefaultMatterAssignmentTasks((input.tasks ?? []).map(normalizeTask), matterAssignmentGate.required_task_ids),
    document_refs: Object.freeze((input.document_refs ?? []).map((document_ref) => requiredString({ document_ref }, "document_ref"))),
    access_requests: Object.freeze((input.access_requests ?? []).map(normalizeAccessRequest)),
    matter_assignment_gate: matterAssignmentGate,
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

export function evaluateOnboardingMatterAssignmentGate(input = {}) {
  const employeeId = requiredString(input, "employee_id");
  const waiverRef = input.waiver_ref ? requiredString(input, "waiver_ref") : null;
  const plans = (input.onboarding_plans ?? [])
    .map(createOnboardingPlan)
    .filter((plan) => plan.employee_id === employeeId)
    .sort((left, right) => right.start_date.localeCompare(left.start_date));
  const plan = plans[0];
  if (!plan) {
    return Object.freeze({
      effect: "deny",
      safe_error_code: "HRX_ONBOARDING_GATE_PLAN_REQUIRED",
      reason: "onboarding_plan_required",
      employee_id: employeeId,
      onboarding_id: null,
      required_task_ids: Object.freeze([...HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS]),
      completed_task_ids: Object.freeze([]),
      missing_task_ids: Object.freeze([...HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS]),
      waiver_ref: waiverRef,
    });
  }

  const gate = plan.matter_assignment_gate;
  const effectiveWaiverRef = waiverRef ?? gate.waiver_ref;
  const taskById = new Map(plan.tasks.map((task) => [task.task_id, task]));
  const completedTaskIds = gate.required_task_ids.filter((taskId) => taskById.get(taskId)?.status === "completed");
  const missingTaskIds = gate.required_task_ids.filter((taskId) => taskById.get(taskId)?.status !== "completed");
  if (effectiveWaiverRef) {
    return Object.freeze({
      effect: "allow",
      safe_error_code: null,
      reason: "onboarding_gate_waived",
      employee_id: employeeId,
      onboarding_id: plan.onboarding_id,
      required_task_ids: gate.required_task_ids,
      completed_task_ids: Object.freeze(completedTaskIds),
      missing_task_ids: Object.freeze(missingTaskIds),
      waiver_ref: effectiveWaiverRef,
    });
  }
  if (missingTaskIds.length > 0) {
    return Object.freeze({
      effect: "deny",
      safe_error_code: "HRX_ONBOARDING_GATE_INCOMPLETE",
      reason: "onboarding_gate_incomplete",
      employee_id: employeeId,
      onboarding_id: plan.onboarding_id,
      required_task_ids: gate.required_task_ids,
      completed_task_ids: Object.freeze(completedTaskIds),
      missing_task_ids: Object.freeze(missingTaskIds),
      waiver_ref: null,
    });
  }
  return Object.freeze({
    effect: "allow",
    safe_error_code: null,
    reason: "onboarding_gate_complete",
    employee_id: employeeId,
    onboarding_id: plan.onboarding_id,
    required_task_ids: gate.required_task_ids,
    completed_task_ids: Object.freeze(completedTaskIds),
    missing_task_ids: Object.freeze([]),
    waiver_ref: null,
  });
}

export function assertOnboardingMatterAssignmentAllowed(input = {}) {
  const decision = evaluateOnboardingMatterAssignmentGate(input);
  if (decision.effect === "allow") return decision;
  const error = new Error(decision.reason);
  error.safe_error_code = decision.safe_error_code;
  error.status = 409;
  error.decision = decision;
  throw error;
}
