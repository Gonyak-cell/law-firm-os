import assert from "node:assert/strict";
import test from "node:test";
import { createHrxObservabilitySpan, recordHrxOperationMetrics } from "../../../packages/hrx/src/observability.js";
import { createInMemoryHrxMetricsSink, recordApiRouteMetrics } from "../src/middleware/metrics.js";

test("HRX observability span removes sensitive payload attributes", () => {
  const span = createHrxObservabilitySpan({
    span_name: "hrx service employee read",
    tenant_id: "tenant-a",
    component: "service",
    operation: "hrx.employee.read",
    duration_ms: 12,
    attributes: {
      employee_id: "emp-001",
      salary: 100000,
      actor_role: "people_ops",
      status: 200,
    },
  });

  assert.equal(span.attributes.actor_role, "people_ops");
  assert.equal(span.attributes.status, 200);
  assert.equal(Object.hasOwn(span.attributes, "employee_id"), false);
  assert.equal(Object.hasOwn(span.attributes, "salary"), false);
});

test("HRX API metrics emit route latency and error counts without sensitive fields", () => {
  const sink = createInMemoryHrxMetricsSink();
  const result = recordApiRouteMetrics({
    sink,
    route: "/api/hrx/employees",
    method: "GET",
    status: 500,
    duration_ms: 21,
    context: { tenant_id: "tenant-a", actor_role: "people_ops" },
    error: { safe_error_code: "HRX_TEST_ERROR", employee_id: "emp-001" },
  });

  assert.equal(result.span.outcome, "error");
  assert.equal(sink.list({ tenant_id: "tenant-a", metric_name: "hrx.operation.latency_ms" }).length, 1);
  assert.equal(sink.list({ tenant_id: "tenant-a", metric_name: "hrx.operation.error_count" }).length, 1);
  assert.equal(JSON.stringify(sink.list({ tenant_id: "tenant-a" })).includes("emp-001"), false);
});

test("HRX operation metrics cover service and audit latency", () => {
  const sink = createInMemoryHrxMetricsSink();
  recordHrxOperationMetrics({
    sink,
    tenant_id: "tenant-a",
    component: "service",
    operation: "hrx.leave.submit",
    duration_ms: 8,
  });
  recordHrxOperationMetrics({
    sink,
    tenant_id: "tenant-a",
    component: "audit",
    operation: "hrx.audit.append",
    duration_ms: 3,
  });

  const metrics = sink.list({ tenant_id: "tenant-a", metric_name: "hrx.operation.latency_ms" });
  assert.deepEqual(metrics.map((metric) => metric.tags.component), ["service", "audit"]);
});
