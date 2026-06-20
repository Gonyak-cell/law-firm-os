import { appendAnalyticsAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function createDashboard({ repository, dashboard, actor_id, idempotency_key, action } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(dashboard, "tenant_id");
  requiredString(dashboard, "dashboard_id");
  const replay = repository.getIdempotency({ tenant_id: dashboard.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.upsert({
      ...dashboard,
      model_type: "AnalyticsDashboard",
      status: dashboard.status ?? "published",
      matter_detail_omitted: dashboard.matter_detail_omitted ?? true,
      source_object_mutated: false,
    });
    const auditEvent = appendAnalyticsAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action,
        object_type: "AnalyticsDashboard",
        object_id: record.dashboard_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "updated", dashboard: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: action, response });
    return response;
  });
}

export function createArAgingDashboard(args = {}) {
  return createDashboard({ ...args, dashboard: { ...args.dashboard, dashboard_type: "ar_aging" }, action: "analytics.dashboard.ar_aging.refresh" });
}

export function createClientHealthDashboard(args = {}) {
  return createDashboard({ ...args, dashboard: { ...args.dashboard, dashboard_type: "client_health" }, action: "analytics.dashboard.client_health.refresh" });
}

export function createPracticePnlDashboard(args = {}) {
  return createDashboard({ ...args, dashboard: { ...args.dashboard, dashboard_type: "practice_pnl" }, action: "analytics.dashboard.practice_pnl.refresh" });
}
