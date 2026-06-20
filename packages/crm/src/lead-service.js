import { appendCrmAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createLead({ repository, lead, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(lead, "tenant_id");
  const replay = repository.getIdempotency({ tenant_id: lead.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...lead,
      model_type: "Lead",
      status: lead.status ?? "active",
      owner_user_id: lead.owner_user_id ?? actor_id,
    });
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "crm.lead.create",
        object_type: "Lead",
        object_id: record.lead_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", lead: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "crm_lead_create", response });
    return response;
  });
}
