import { appendCrmAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createReferral({ repository, referral, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(referral, "tenant_id");
  const replay = repository.getIdempotency({ tenant_id: referral.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...referral,
      model_type: "Referral",
      status: referral.status ?? "active",
      owner_user_id: referral.owner_user_id ?? actor_id,
    });
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "crm.referral.create",
        object_type: "Referral",
        object_id: record.referral_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", referral: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "crm_referral_create", response });
    return response;
  });
}
