export const HRX_LIFECYCLE_KINDS = Object.freeze(["onboarding", "offboarding"]);
export const HRX_LIFECYCLE_TASK_STATUSES = Object.freeze([
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "failed",
]);
export const HRX_LIFECYCLE_TASK_DEPENDENCY_INCOMPLETE =
  "HRX_LIFECYCLE_TASK_DEPENDENCY_INCOMPLETE";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function isoDate(input, field, { optional = false } = {}) {
  const value = input?.[field];
  if (optional && (value === undefined || value === null || value === "")) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return value;
}

function integer(input, field, fallback = 0) {
  const value = input?.[field] ?? fallback;
  if (!Number.isInteger(value)) throw new TypeError(`${field} must be an integer`);
  return value;
}

function taskDependencies(input = {}) {
  const values = input.depends_on_task_ids ?? [];
  if (!Array.isArray(values)) throw new TypeError("depends_on_task_ids must be an array");
  return Object.freeze([...new Set(values.map((task_id) => requiredString({ task_id }, "task_id")))]);
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function normalizeLifecycleTemplateTask(input = {}) {
  return Object.freeze({
    task_id: requiredString(input, "task_id"),
    title: requiredString(input, "title"),
    owner_role: requiredString(input, "owner_role"),
    due_offset_days: integer(input, "due_offset_days"),
    required: input.required !== false,
    depends_on_task_ids: taskDependencies(input),
  });
}

export function createLifecycleTemplate(input = {}) {
  const lifecycleKind = requiredString(input, "lifecycle_kind");
  if (!HRX_LIFECYCLE_KINDS.includes(lifecycleKind)) {
    throw new TypeError(`lifecycle_kind must be one of ${HRX_LIFECYCLE_KINDS.join(", ")}`);
  }
  const tasks = Object.freeze((input.tasks ?? []).map(normalizeLifecycleTemplateTask));
  const taskIds = new Set(tasks.map((task) => task.task_id));
  if (taskIds.size !== tasks.length) throw new TypeError("lifecycle template task_id must be unique");
  for (const task of tasks) {
    if (task.depends_on_task_ids.includes(task.task_id)) {
      throw new TypeError(`lifecycle task cannot depend on itself: ${task.task_id}`);
    }
    for (const dependencyId of task.depends_on_task_ids) {
      if (!taskIds.has(dependencyId)) {
        throw new TypeError(`lifecycle task dependency not found: ${dependencyId}`);
      }
    }
  }
  return Object.freeze({
    template_id: requiredString(input, "template_id"),
    version: requiredString(input, "version"),
    lifecycle_kind: lifecycleKind,
    role_key: requiredString(input, "role_key"),
    effective_from: isoDate(input, "effective_from"),
    tasks,
  });
}

export function lifecycleTemplateRef(template = {}) {
  const normalized = createLifecycleTemplate(template);
  return Object.freeze({
    template_id: normalized.template_id,
    version: normalized.version,
    lifecycle_kind: normalized.lifecycle_kind,
    role_key: normalized.role_key,
    effective_from: normalized.effective_from,
  });
}

export function normalizeLifecycleTaskInstance(input = {}) {
  const status = input.status ?? "pending";
  if (!HRX_LIFECYCLE_TASK_STATUSES.includes(status)) {
    throw new TypeError(`task status must be one of ${HRX_LIFECYCLE_TASK_STATUSES.join(", ")}`);
  }
  const attemptCount = integer(input, "attempt_count");
  if (attemptCount < 0) throw new TypeError("attempt_count must not be negative");
  return Object.freeze({
    task_id: requiredString(input, "task_id"),
    title: requiredString(input, "title"),
    owner_role: requiredString(input, "owner_role"),
    due_on: isoDate(input, "due_on", { optional: true }),
    required: input.required !== false,
    depends_on_task_ids: taskDependencies(input),
    status,
    attempt_count: attemptCount,
    last_failure_reason: optionalString(input, "last_failure_reason"),
    completed_at: optionalString(input, "completed_at"),
  });
}

export function instantiateLifecycleTemplate(templateInput = {}, { anchor_date } = {}) {
  const template = createLifecycleTemplate(templateInput);
  const anchorDate = isoDate({ anchor_date }, "anchor_date");
  return Object.freeze({
    template_ref: lifecycleTemplateRef(template),
    template_snapshot: template,
    tasks: Object.freeze(
      template.tasks.map((task) =>
        normalizeLifecycleTaskInstance({
          ...task,
          due_on: addDays(anchorDate, task.due_offset_days),
          status: "pending",
          attempt_count: 0,
        })),
    ),
  });
}

function dependencyError(task, missingDependencyIds) {
  const error = new Error(`lifecycle task dependencies are incomplete: ${missingDependencyIds.join(", ")}`);
  error.status = 409;
  error.safe_error_code = HRX_LIFECYCLE_TASK_DEPENDENCY_INCOMPLETE;
  error.task_id = task.task_id;
  error.missing_dependency_ids = Object.freeze(missingDependencyIds);
  return error;
}

export function updateLifecycleTaskInstances(tasksInput = [], taskId, patch = {}, { clock = () => new Date().toISOString() } = {}) {
  const tasks = tasksInput.map(normalizeLifecycleTaskInstance);
  const index = tasks.findIndex((task) => task.task_id === taskId);
  if (index === -1) throw new Error(`Lifecycle task not found: ${taskId}`);
  const current = tasks[index];
  if (current.status === "completed" && patch.status && patch.status !== "completed") {
    throw new TypeError("completed lifecycle task is immutable");
  }
  if (patch.retry === true) {
    if (current.status !== "failed") throw new TypeError("only a failed lifecycle task can be retried");
    tasks[index] = normalizeLifecycleTaskInstance({
      ...current,
      status: "pending",
      attempt_count: current.attempt_count + 1,
      completed_at: null,
    });
    return Object.freeze(tasks);
  }
  const nextStatus = patch.status ?? current.status;
  if (nextStatus === "completed") {
    const completedIds = new Set(
      tasks.filter((task) => task.status === "completed").map((task) => task.task_id),
    );
    const missingDependencyIds = current.depends_on_task_ids.filter(
      (dependencyId) => !completedIds.has(dependencyId),
    );
    if (missingDependencyIds.length > 0) throw dependencyError(current, missingDependencyIds);
  }
  if (nextStatus === "failed" && !optionalString(patch, "failure_reason")) {
    throw new TypeError("failure_reason is required when lifecycle task fails");
  }
  tasks[index] = normalizeLifecycleTaskInstance({
    ...current,
    status: nextStatus,
    attempt_count: nextStatus === "failed" ? current.attempt_count + 1 : current.attempt_count,
    last_failure_reason:
      nextStatus === "failed"
        ? patch.failure_reason
        : current.last_failure_reason,
    completed_at: nextStatus === "completed" ? clock() : null,
  });
  return Object.freeze(tasks);
}
