function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function tenantRows(rows, tenantId) {
  return (Array.isArray(rows) ? rows : []).filter((row) => row.tenant_id === tenantId);
}

function safeEvent(event = {}) {
  return Object.freeze({
    event_id: event.event_id ?? null,
    actor_id: event.actor_id ?? null,
    action: event.action ?? null,
    object_type: event.object_type ?? null,
    object_id: event.object_id ?? null,
    decision: event.decision ?? null,
    reason: event.reason ?? null,
    occurred_at: event.occurred_at ?? null,
  });
}

function actionIncludes(event, terms) {
  const action = String(event.action ?? "").toLowerCase();
  return terms.some((term) => action.includes(term));
}

export function createHrxComplianceReport(input = {}) {
  const tenantId = requiredString(input, "tenant_id");
  const auditEvents = tenantRows(input.audit_events, tenantId);
  const retentionRecords = tenantRows(input.retention_records, tenantId);
  const exportEvents = tenantRows(input.export_events, tenantId);
  const accessEvents = auditEvents.filter((event) => actionIncludes(event, ["read", "retrieve", "view"]));
  const changeEvents = auditEvents.filter((event) => actionIncludes(event, ["create", "update", "delete", "approve", "reject", "submit"]));
  const exports = [...auditEvents.filter((event) => actionIncludes(event, ["export"])), ...exportEvents];

  return Object.freeze({
    tenant_id: tenantId,
    report_type: "hrx_compliance",
    generated_from: "audit_retention_export_metadata",
    sensitive_payload_included: false,
    access: Object.freeze({
      event_count: accessEvents.length,
      events: Object.freeze(accessEvents.map(safeEvent)),
    }),
    change: Object.freeze({
      event_count: changeEvents.length,
      events: Object.freeze(changeEvents.map(safeEvent)),
    }),
    retention: Object.freeze({
      record_count: retentionRecords.length,
      records: Object.freeze(retentionRecords.map((record) => Object.freeze({
        object_type: record.object_type,
        object_id: record.object_id,
        retention_policy_id: record.retention_policy_id,
        purge_due: record.purge_due === true,
        legal_hold: record.legal_hold === true,
      }))),
    }),
    export: Object.freeze({
      event_count: exports.length,
      events: Object.freeze(exports.map(safeEvent)),
    }),
  });
}
