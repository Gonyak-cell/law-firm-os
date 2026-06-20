import { appendPortalAuditEvent } from "./audit.js";

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

function ensureExternalAcl(record) {
  if (record.dms_acl_inherited !== true) throw new Error("external portal access requires inherited DMS ACL");
  if (record.cross_tenant_access_allowed === true) throw new Error("cross-tenant external portal access is blocked");
}

export function createExternalAcl({ repository, external_acl, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(external_acl, "tenant_id");
  requiredString(external_acl, "external_user_id");
  requiredString(external_acl, "matter_id");
  requiredRefs(external_acl, "allowed_object_refs");
  ensureExternalAcl(external_acl);
  const replay = repository.getIdempotency({ tenant_id: external_acl.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...external_acl, model_type: "ExternalAcl", status: external_acl.status ?? "active" });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "portal.external_acl.create", object_type: "ExternalAcl", object_id: record.external_acl_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", external_acl: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "portal_external_acl_create", response });
    return response;
  });
}

export function createPortalProjection({ repository, portal_projection, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(portal_projection, "tenant_id");
  requiredString(portal_projection, "external_user_id");
  requiredString(portal_projection, "matter_id");
  requiredRefs(portal_projection, "visible_object_refs");
  ensureExternalAcl(portal_projection);
  const replay = repository.getIdempotency({ tenant_id: portal_projection.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.upsert({ ...portal_projection, model_type: "PortalProjection", status: portal_projection.status ?? "synced" });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "portal.projection.sync", object_type: "PortalProjection", object_id: record.portal_projection_id, idempotency_key } });
    const response = Object.freeze({ outcome: "updated", portal_projection: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "portal_projection_sync", response });
    return response;
  });
}

export function createPortalDashboardProjection({ repository, dashboard_projection, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(dashboard_projection, "tenant_id");
  requiredString(dashboard_projection, "client_group_id");
  const replay = repository.getIdempotency({ tenant_id: dashboard_projection.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.upsert({ ...dashboard_projection, model_type: "PortalDashboardProjection", status: dashboard_projection.status ?? "ready", aggregate_only: true });
    const auditEvent = appendPortalAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "portal.dashboard_projection.sync", object_type: "PortalDashboardProjection", object_id: record.dashboard_projection_id, idempotency_key } });
    const response = Object.freeze({ outcome: "updated", dashboard_projection: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "portal_dashboard_projection_sync", response });
    return response;
  });
}
