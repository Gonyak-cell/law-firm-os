import { appendPortalAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createSecureLink({ repository, secure_link, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(secure_link, "tenant_id");
  requiredString(secure_link, "matter_id");
  requiredString(secure_link, "target_object_id");
  requiredString(secure_link, "expires_at");
  if (secure_link.dms_acl_inherited !== true) throw new Error("secure link requires inherited DMS ACL");
  if (secure_link.watermark_enabled !== true) throw new Error("secure link requires watermark");
  if (secure_link.external_share_boundary_checked !== true) throw new Error("secure link requires external share-boundary check");
  const replay = repository.getIdempotency({ tenant_id: secure_link.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...secure_link, model_type: "SecureLink", status: "active", token_material_included: false, document_bytes_included: false });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "portal.secure_link.create", object_type: "SecureLink", object_id: record.secure_link_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", secure_link: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "portal_secure_link_create", response });
    return response;
  });
}
