import { appendPortalAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createClientApproval({ repository, client_approval, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(client_approval, "tenant_id");
  requiredString(client_approval, "matter_id");
  requiredString(client_approval, "external_user_id");
  if (!["approved", "rejected", "changes_requested"].includes(client_approval.decision)) throw new Error("invalid client approval decision");
  const replay = repository.getIdempotency({ tenant_id: client_approval.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...client_approval, model_type: "ClientApproval", status: "recorded" });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "portal.client_approval.record", object_type: "ClientApproval", object_id: record.client_approval_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", client_approval: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "portal_client_approval_record", response });
    return response;
  });
}
