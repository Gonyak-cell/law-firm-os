import { assertMatterIsoTimestamp, createMatterTask } from "./model.js";
import { executeWorktreeMutation } from "./worktree-mutation.js";

export const MATTER_TASK_TRANSITIONS = Object.freeze({
  todo: Object.freeze(["in_progress", "blocked", "done", "cancelled"]),
  in_progress: Object.freeze(["blocked", "done", "cancelled"]),
  blocked: Object.freeze(["in_progress", "cancelled"]),
  done: Object.freeze(["in_progress"]),
  cancelled: Object.freeze([]),
});

function typedTransitionError(error, safeErrorCode) {
  return Object.assign(error, {
    status: 422,
    safe_error_code: safeErrorCode,
  });
}

export function assertMatterTaskTransitionReason(reason) {
  if (!reason) {
    throw typedTransitionError(
      new TypeError("reason is required"),
      "MATTER_TASK_TRANSITION_REASON_REQUIRED",
    );
  }
  return reason;
}

function transitionTimestamp(occurredAt) {
  return assertMatterIsoTimestamp(occurredAt ?? new Date().toISOString(), "occurred_at");
}

export function transitionMatterTask({ repository, task, to_status, actor_id, reason, audit, occurred_at } = {}) {
  const fromStatus = task?.status;
  const allowed = MATTER_TASK_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(to_status)) {
    throw typedTransitionError(
      new Error(`MatterTask cannot transition from ${fromStatus} to ${to_status}`),
      "MATTER_TASK_TRANSITION_INVALID",
    );
  }
  if (!actor_id) throw new TypeError("actor_id is required");
  assertMatterTaskTransitionReason(reason);
  const timestamp = transitionTimestamp(occurred_at);
  const next = createMatterTask({
    ...task,
    status: to_status,
    blocked_reason: to_status === "blocked" ? reason : null,
    completed_at: to_status === "done" ? timestamp : null,
    updated_at: timestamp,
  });
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
    metadata: {
      from_status: fromStatus,
      to_status,
      completed_at: persisted.completed_at,
      blocked_reason_recorded: Boolean(persisted.blocked_reason),
    },
  });
  return persisted;
}

function transitionWithEvidence(options, toStatus, operation, defaultReason) {
  const { repository, task, actor_id, audit, idempotency_key, source_ref, occurred_at, request_id } = options;
  const reason = options.reason ?? defaultReason;
  if (!idempotency_key) {
    return transitionMatterTask({ repository, task, to_status: toStatus, actor_id, reason, audit, occurred_at });
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
    occurred_at,
  }));
}

export function completeMatterTask(options = {}) {
  return transitionWithEvidence(options, "done", "matter.task.complete", "worktree_task_completed");
}

export function reopenMatterTask(options = {}) {
  assertMatterTaskTransitionReason(options.reason);
  return transitionWithEvidence(options, "in_progress", "matter.task.reopen");
}

export function unblockMatterTask(options = {}) {
  assertMatterTaskTransitionReason(options.reason);
  return transitionWithEvidence(options, "in_progress", "matter.task.unblock");
}

export function blockMatterTask(options = {}) {
  assertMatterTaskTransitionReason(options.reason);
  return transitionWithEvidence(options, "blocked", "matter.task.block");
}

function archiveMatterTaskRecord({ repository, task, actor_id, reason, audit, occurred_at } = {}) {
  if (!actor_id) throw new TypeError("actor_id is required");
  if (!reason) throw new TypeError("reason is required");
  if (task?.archived_at) throw new Error("MatterTask is already archived");
  const timestamp = transitionTimestamp(occurred_at);
  const next = createMatterTask({ ...task, archived_at: timestamp, updated_at: timestamp });
  const persisted = repository.update(
    { tenant_id: next.tenant_id, model_type: "MatterTask", task_id: next.task_id },
    next,
  );
  audit?.append?.({
    tenant_id: persisted.tenant_id,
    actor_id,
    action: "matter.task.archive",
    object_type: "MatterTask",
    object_id: persisted.task_id,
    decision: "allow",
    reason,
    metadata: { archived_at: persisted.archived_at },
  });
  return persisted;
}

export function archiveMatterTask(options = {}) {
  const { repository, task, actor_id, reason, audit, idempotency_key, source_ref, occurred_at, request_id } = options;
  if (!idempotency_key) {
    return archiveMatterTaskRecord({ repository, task, actor_id, reason, audit, occurred_at });
  }
  return executeWorktreeMutation(repository, {
    tenant_id: task?.tenant_id,
    idempotency_key,
    operation: "matter.task.archive",
    actor_id,
    reason,
    source_ref,
    object_type: "MatterTask",
    object_id: task?.task_id,
    request_fingerprint: { archived: true, reason },
    occurred_at,
    request_id,
  }, (transaction) => archiveMatterTaskRecord({
    repository: transaction,
    task,
    actor_id,
    reason,
    occurred_at,
  }));
}
