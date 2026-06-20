import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function approveEngagement({ repository, engagement, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(engagement, "tenant_id");
  requiredString(engagement, "signed_document_id");
  const replay = repository.getIdempotency({ tenant_id: engagement.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...engagement,
      model_type: "Engagement",
      status: "approved",
      approved_at: engagement.approved_at ?? new Date().toISOString(),
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "engagement.approved",
        object_type: "Engagement",
        object_id: record.engagement_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "approved", engagement: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "engagement_approve", response });
    return response;
  });
}
