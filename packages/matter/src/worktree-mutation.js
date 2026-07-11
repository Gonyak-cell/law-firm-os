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

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value ?? null;
}

function requestFingerprint(command) {
  return JSON.stringify(canonical({
    operation: command.operation,
    actor_id: command.actor_id,
    reason: command.reason,
    source_ref: command.source_ref,
    object_type: command.object_type,
    object_id: command.object_id,
    request: command.request_fingerprint ?? null,
  }));
}

export class MatterWorktreeIdempotencyError extends Error {
  constructor() {
    super("Idempotency key was already used for another Worktree request");
    this.name = "MatterWorktreeIdempotencyError";
    this.code = "WORKTREE_IDEMPOTENCY_CONFLICT";
  }
}

export function executeWorktreeMutation(repository, command, mutate) {
  requireMutationEvidence(command);
  if (typeof mutate !== "function") throw new TypeError("mutate is required");
  const fingerprint = requestFingerprint(command);
  const existing = repository.getIdempotency(command);
  if (existing) {
    if (existing.request_fingerprint !== fingerprint) throw new MatterWorktreeIdempotencyError();
    return Object.freeze({ ...existing.response, idempotent_replay: true });
  }

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
      object_type: command.object_type,
      object_id: command.object_id,
      actor_id: command.actor_id,
      request_fingerprint: fingerprint,
      response,
      created_at: command.occurred_at,
    });
    return response;
  });
}
