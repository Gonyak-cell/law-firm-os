import { appendCrmAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createCrmActivity({ repository, activity, actor_id, idempotency_key, permission_ref } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(activity, "tenant_id");
  if (activity.confidential === true && !permission_ref && !activity.permission_ref) {
    throw new Error("Confidential CRMActivity requires permission_ref");
  }
  const replay = repository.getIdempotency({ tenant_id: activity.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...activity,
      model_type: "CRMActivity",
      status: activity.status ?? "active",
      owner_user_id: activity.owner_user_id ?? actor_id,
      permission_ref: activity.permission_ref ?? permission_ref,
    });
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "crm.activity.create",
        object_type: "CRMActivity",
        object_id: record.crm_activity_id,
        idempotency_key,
        metadata: { confidential: record.confidential },
      },
    });
    const response = Object.freeze({ outcome: "created", activity: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "crm_activity_create", response });
    return response;
  });
}
