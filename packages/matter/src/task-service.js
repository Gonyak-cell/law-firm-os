import { createMatterTask } from "./model.js";

export const MATTER_TASK_TRANSITIONS = Object.freeze({
  todo: Object.freeze(["in_progress", "blocked", "cancelled"]),
  in_progress: Object.freeze(["blocked", "done", "cancelled"]),
  blocked: Object.freeze(["in_progress", "cancelled"]),
  done: Object.freeze([]),
  cancelled: Object.freeze([]),
});

export function transitionMatterTask({ repository, task, to_status, actor_id, reason, audit } = {}) {
  const fromStatus = task?.status;
  const allowed = MATTER_TASK_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(to_status)) throw new Error(`MatterTask cannot transition from ${fromStatus} to ${to_status}`);
  if (!actor_id) throw new TypeError("actor_id is required");
  if (!reason) throw new TypeError("reason is required");
  const next = createMatterTask({ ...task, status: to_status });
  const persisted = repository.update(
    { tenant_id: next.tenant_id, model_type: "MatterTask", task_id: next.task_id },
    next,
  );
  audit?.append?.({
    tenant_id: persisted.tenant_id,
    actor_id,
    action: "matter.task.transition",
    object_type: "MatterTask",
    object_id: persisted.task_id,
    decision: "allow",
    reason,
    metadata: { from_status: fromStatus, to_status },
  });
  return persisted;
}
