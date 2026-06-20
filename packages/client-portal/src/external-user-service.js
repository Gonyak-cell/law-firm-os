import { appendPortalAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createExternalUser({ repository, external_user, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(external_user, "tenant_id");
  requiredString(external_user, "external_user_id");
  requiredString(external_user, "email");
  requiredString(external_user, "client_group_id");
  const replay = repository.getIdempotency({ tenant_id: external_user.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...external_user, model_type: "ExternalUser", status: external_user.status ?? "invited" });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "portal.external_user.create", object_type: "ExternalUser", object_id: record.external_user_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", external_user: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "portal_external_user_create", response });
    return response;
  });
}
