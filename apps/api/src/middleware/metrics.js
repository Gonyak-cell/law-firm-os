import {
  createInMemoryHrxMetricsSink,
  createHrxObservabilitySpan,
  recordHrxOperationMetrics,
} from "../../../../packages/hrx/src/observability.js";

export { createInMemoryHrxMetricsSink };

export function recordApiRouteMetrics({ sink, route, method = "GET", status = 200, context = {}, duration_ms = 0, error = null } = {}) {
  const outcome = error || status >= 400 ? "error" : "ok";
  const span = createHrxObservabilitySpan({
    span_name: `api ${method} ${route}`,
    tenant_id: context.tenant_id,
    component: "api-route",
    operation: route,
    duration_ms,
    outcome,
    attributes: {
      method,
      status,
      actor_role: context.actor_role ?? null,
      error_code: error?.safe_error_code ?? null,
    },
  });
  const metrics = recordHrxOperationMetrics({
    sink,
    tenant_id: context.tenant_id,
    component: "api-route",
    operation: route,
    duration_ms,
    outcome,
    attributes: {
      method,
      status,
      error_code: error?.safe_error_code ?? null,
    },
  });
  return Object.freeze({ span, metrics });
}
