import { appendPortalAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createRfiRequest({ repository, rfi_request, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(rfi_request, "tenant_id");
  requiredString(rfi_request, "matter_id");
  requiredString(rfi_request, "external_user_id");
  const replay = repository.getIdempotency({ tenant_id: rfi_request.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...rfi_request, model_type: "RfiRequest", status: rfi_request.status ?? "open" });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "portal.rfi_request.create", object_type: "RfiRequest", object_id: record.rfi_request_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", rfi_request: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "portal_rfi_request_create", response });
    return response;
  });
}

export function createRfiResponse({ repository, rfi_response, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(rfi_response, "tenant_id");
  requiredString(rfi_response, "rfi_request_id");
  if (rfi_response.malware_scan_passed !== true) throw new Error("RFI response upload requires malware scan pass");
  if (rfi_response.dms_acl_inherited !== true) throw new Error("RFI response upload requires inherited DMS ACL");
  const replay = repository.getIdempotency({ tenant_id: rfi_response.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...rfi_response, model_type: "RfiResponse", status: "submitted", upload_metadata_only: true });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "portal.rfi_response.submit", object_type: "RfiResponse", object_id: record.rfi_response_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", rfi_response: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "portal_rfi_response_submit", response });
    return response;
  });
}
