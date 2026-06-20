import { appendAnalyticsAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createAnalyticsExport({ repository, analytics_export, actor_id, idempotency_key, permission_ref } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(analytics_export, "tenant_id");
  requiredString(analytics_export, "dashboard_id");
  if (!permission_ref && !analytics_export.permission_ref) throw new Error("analytics export requires permission_ref");
  const replay = repository.getIdempotency({ tenant_id: analytics_export.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...analytics_export,
      model_type: "AnalyticsExport",
      status: "ready_for_review",
      permission_ref: analytics_export.permission_ref ?? permission_ref,
      matter_detail_omitted: true,
      credential_material_included: false,
    });
    const auditEvent = appendAnalyticsAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "analytics.export.create",
        object_type: "AnalyticsExport",
        object_id: record.analytics_export_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", analytics_export: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "analytics_export_create", response });
    return response;
  });
}
