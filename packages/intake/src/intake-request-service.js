import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createIntakeRequest({ repository, request, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(request, "tenant_id");
  const replay = repository.getIdempotency({ tenant_id: request.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...request,
      model_type: "IntakeRequest",
      status: request.status ?? "open",
      owner_user_id: request.owner_user_id ?? actor_id,
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "intake.request.create",
        object_type: "IntakeRequest",
        object_id: record.intake_request_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", intake_request: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "intake_request_create", response });
    return response;
  });
}
