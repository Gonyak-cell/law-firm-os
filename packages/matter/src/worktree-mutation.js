const REQUIRED_FIELDS = Object.freeze([
  "tenant_id",
  "idempotency_key",
  "operation",
  "actor_id",
  "reason",
  "source_ref",
  "object_type",
  "object_id",
  "occurred_at",
  "request_id",
]);

function requireMutationEvidence(command) {
  for (const field of REQUIRED_FIELDS) {
    if (typeof command?.[field] !== "string" || command[field].trim() === "") {
      throw new TypeError(`${field} is required`);
    }
  }
}

export function executeWorktreeMutation(repository, command, mutate) {
  requireMutationEvidence(command);
  if (typeof mutate !== "function") throw new TypeError("mutate is required");
  const existing = repository.getIdempotency(command);
  if (existing) return Object.freeze({ ...existing.response, idempotent_replay: true });

  return repository.transaction((transaction) => {
    const result = mutate(transaction);
    const response = Object.freeze({ ...result, idempotent_replay: false });
    transaction.appendAudit({
      tenant_id: command.tenant_id,
      event_id: `worktree:${command.operation}:${command.idempotency_key}`,
      actor_id: command.actor_id,
      action: command.operation,
      object_type: command.object_type,
      object_id: command.object_id,
      decision: "allow",
      reason: command.reason,
      source_ref: command.source_ref,
      occurred_at: command.occurred_at,
      request_id: command.request_id,
      metadata: { idempotency_key: command.idempotency_key },
    });
    transaction.recordIdempotency({
      tenant_id: command.tenant_id,
      idempotency_key: command.idempotency_key,
      operation: command.operation,
      response,
      created_at: command.occurred_at,
    });
    return response;
  });
}
