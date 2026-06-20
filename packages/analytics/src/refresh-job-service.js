import { appendAnalyticsAuditEvent } from "./audit.js";
import { createArAgingDashboard, createClientHealthDashboard, createPracticePnlDashboard } from "./dashboard-service.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function refreshAnalyticsReadModels({ repository, tenant_id, actor_id, idempotency_key } = {}) {
  requiredString({ tenant_id }, "tenant_id");
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  const replay = repository.getIdempotency({ tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const ar = createArAgingDashboard({
      repository: tx,
      dashboard: { dashboard_id: "dashboard-ar-aging", tenant_id, title: "AR Aging", metric_value: 400000 },
      actor_id,
      idempotency_key: `${idempotency_key}:ar`,
    }).dashboard;
    const health = createClientHealthDashboard({
      repository: tx,
      dashboard: { dashboard_id: "dashboard-client-health", tenant_id, title: "Client Health", metric_value: 87 },
      actor_id,
      idempotency_key: `${idempotency_key}:health`,
    }).dashboard;
    const pnl = createPracticePnlDashboard({
      repository: tx,
      dashboard: { dashboard_id: "dashboard-practice-pnl", tenant_id, title: "Practice P&L", metric_value: 32 },
      actor_id,
      idempotency_key: `${idempotency_key}:pnl`,
    }).dashboard;
    const run = tx.create({
      model_type: "ReadModelRefreshRun",
      refresh_run_id: `refresh:${tenant_id}:${Date.now()}`,
      tenant_id,
      status: "succeeded",
      refreshed_dashboard_ids: Object.freeze([ar.dashboard_id, health.dashboard_id, pnl.dashboard_id]),
    });
    const auditEvent = appendAnalyticsAuditEvent({
      repository: tx,
      event: {
        tenant_id,
        actor_id,
        action: "analytics.read_model.refresh",
        object_type: "ReadModelRefreshRun",
        object_id: run.refresh_run_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", refresh_run: run, dashboards: Object.freeze([ar, health, pnl]), audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id, idempotency_key, operation: "analytics_read_model_refresh", response });
    return response;
  });
}
