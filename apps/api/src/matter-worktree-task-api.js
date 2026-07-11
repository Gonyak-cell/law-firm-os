import { completeMatterTask, reopenMatterTask, unblockMatterTask } from "../../../packages/matter/src/task-service.js";
import { authorizeMatterWorktreeAccess, WORKTREE_TASK_ROLES } from "./matter-worktree-authorization.js";

function apiResponse(status, requestId, input, values) {
  return { status, body: { request_id: requestId, ...values, audit_hint_ref: input?.audit_hint_ref ?? null, count_leak_prevented: true, production_ready_claim: false } };
}

function hidden(requestId, body) {
  return apiResponse(404, requestId, body, { outcome: "blocked", items: [], safe_error_codes: ["MATTER_NOT_FOUND"], ui_state: "empty" });
}

function authorize({ matterId, taskId, body, context, requestId, runtime, action }) {
  if (!body?.tenant_id || !body?.permission_ref || !body?.audit_hint_ref) {
    return { error: apiResponse(400, requestId, body, { outcome: "blocked", items: [], safe_error_codes: ["MATTER_API_VALIDATION_ERROR"] }) };
  }
  const authorization = authorizeMatterWorktreeAccess({ repository: runtime.repository, context, tenantId: body.tenant_id, matterId, actorId: body.actor_id, roles: WORKTREE_TASK_ROLES, action, resourceType: "matter_task", resourceId: taskId });
  const task = runtime.repository.get({ tenant_id: body.tenant_id, model_type: "MatterTask", id: taskId });
  if (!authorization.allowed || task?.matter_id !== matterId) return { error: hidden(requestId, body) };
  return { task };
}

function handleTaskTransition({ matterId, taskId, body, context, requestId, runtime, transition, action }) {
  const authorized = authorize({ matterId, taskId, body, context, requestId, runtime, action });
  if (authorized.error) return authorized.error;
  try {
    const item = transition({ repository: runtime.repository, task: authorized.task, actor_id: body.actor_id, reason: body.reason, idempotency_key: body.idempotency_key, source_ref: body.source_ref, occurred_at: new Date().toISOString(), request_id: requestId });
    return apiResponse(200, requestId, body, { outcome: item.idempotent_replay ? "idempotent_replay" : "updated", item, idempotent_replay: item.idempotent_replay, safe_error_codes: [] });
  } catch {
    return apiResponse(400, requestId, body, { outcome: "blocked", items: [], safe_error_codes: ["MATTER_API_VALIDATION_ERROR"], ui_state: "blocked" });
  }
}

export function handleMatterWorktreeTaskComplete(options = {}) {
  return handleTaskTransition({ ...options, transition: completeMatterTask, action: "matter:worktree:task:complete" });
}

export function handleMatterWorktreeTaskReopen(options = {}) {
  return handleTaskTransition({ ...options, transition: reopenMatterTask, action: "matter:worktree:task:reopen" });
}

export function handleMatterWorktreeTaskUnblock(options = {}) {
  return handleTaskTransition({ ...options, transition: unblockMatterTask, action: "matter:worktree:task:unblock" });
}
