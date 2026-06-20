import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function approveWaiver({ repository, waiver, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(waiver, "tenant_id");
  requiredString(waiver, "consent_document_id");
  requiredString(waiver, "approver_id");
  const replay = repository.getIdempotency({ tenant_id: waiver.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...waiver,
      model_type: "Waiver",
      status: "approved",
      approved_at: waiver.approved_at ?? new Date().toISOString(),
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "waiver.approved",
        object_type: "Waiver",
        object_id: record.waiver_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "approved", waiver: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "waiver_approve", response });
    return response;
  });
}
