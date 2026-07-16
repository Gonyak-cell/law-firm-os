import { createMatterTask } from "./model.js";
import { executeWorktreeMutation } from "./worktree-mutation.js";

export const MATTER_TASK_TRANSITIONS = Object.freeze({
  todo: Object.freeze(["in_progress", "blocked", "done", "cancelled"]),
  in_progress: Object.freeze(["blocked", "done", "cancelled"]),
  blocked: Object.freeze(["in_progress", "cancelled"]),
  done: Object.freeze(["in_progress"]),
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

function transitionWithEvidence(options, toStatus, operation, defaultReason) {
  const { repository, task, actor_id, audit, idempotency_key, source_ref, occurred_at, request_id } = options;
  const reason = options.reason ?? defaultReason;
  if (!idempotency_key) {
    return transitionMatterTask({ repository, task, to_status: toStatus, actor_id, reason, audit });
  }
  return executeWorktreeMutation(repository, {
    tenant_id: task?.tenant_id,
    idempotency_key,
    operation,
    actor_id,
    reason,
    source_ref,
    object_type: "MatterTask",
    object_id: task?.task_id,
    request_fingerprint: { to_status: toStatus, reason },
    occurred_at,
    request_id,
  }, (transaction) => transitionMatterTask({
    repository: transaction,
    task,
    to_status: toStatus,
    actor_id,
    reason,
  }));
}

export function completeMatterTask(options = {}) {
  return transitionWithEvidence(options, "done", "matter.task.complete", "worktree_task_completed");
}

export function reopenMatterTask(options = {}) {
  if (!options.reason) throw new TypeError("reason is required");
  return transitionWithEvidence(options, "in_progress", "matter.task.reopen");
}

export function unblockMatterTask(options = {}) {
  if (!options.reason) throw new TypeError("reason is required");
  return transitionWithEvidence(options, "in_progress", "matter.task.unblock");
}
