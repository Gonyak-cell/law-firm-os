import { appendPortalAuditEvent } from "../../client-portal/src/audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredRefs(input, field) {
  const refs = input?.[field];
  if (!Array.isArray(refs) || refs.length === 0) throw new Error(`${field} are required`);
  return refs;
}

export function createDataRoom({ repository, data_room, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(data_room, "tenant_id");
  requiredString(data_room, "matter_id");
  requiredString(data_room, "data_room_id");
  if (data_room.external_acl_required !== true) throw new Error("data room requires external ACL");
  const replay = repository.getIdempotency({ tenant_id: data_room.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...data_room, model_type: "DataRoom", owner_module: "data-room", status: data_room.status ?? "open" });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "data_room.create", object_type: "DataRoom", object_id: record.data_room_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", data_room: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "data_room_create", response });
    return response;
  });
}

export function syncDataRoomProjection({ repository, data_room_projection, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(data_room_projection, "tenant_id");
  requiredString(data_room_projection, "matter_id");
  requiredString(data_room_projection, "data_room_id");
  requiredRefs(data_room_projection, "source_document_refs");
  if (data_room_projection.dms_acl_inherited !== true) throw new Error("data room projection requires inherited DMS ACL");
  if (data_room_projection.external_acl_applied !== true) throw new Error("data room projection requires external ACL application");
  const replay = repository.getIdempotency({ tenant_id: data_room_projection.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.upsert({ ...data_room_projection, model_type: "DataRoomProjection", owner_module: "data-room", status: data_room_projection.status ?? "synced", projection_metadata_only: true });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "data_room.projection.sync", object_type: "DataRoomProjection", object_id: record.data_room_projection_id, idempotency_key } });
    const response = Object.freeze({ outcome: "updated", data_room_projection: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "data_room_projection_sync", response });
    return response;
  });
}
