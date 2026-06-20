import assert from "node:assert/strict";
import test from "node:test";
import {
  createHrxObservabilitySpan,
  createInMemoryHrxMetricsSink,
  recordHrxOperationMetrics,
} from "../src/observability.js";

test("HRX observability records latency error and security counters", () => {
  const sink = createInMemoryHrxMetricsSink();
  const metrics = recordHrxOperationMetrics({
    sink,
    tenant_id: "tenant-a",
    component: "api-route",
    operation: "/api/hrx/audit",
    duration_ms: 27,
    outcome: "error",
    attributes: {
      status: 403,
      error_code: "HRX_SCOPE_DENY",
      security_event: true,
      employee_id: "emp-secret",
    },
  });

  assert.deepEqual(metrics.map((metric) => metric.metric_name), [
    "hrx.operation.latency_ms",
    "hrx.operation.error_count",
    "hrx.operation.security_count",
  ]);
  assert.equal(sink.list({ tenant_id: "tenant-a" }).length, 3);
  assert.equal(JSON.stringify(metrics).includes("emp-secret"), false);
});

test("HRX observability span strips sensitive attributes", () => {
  const span = createHrxObservabilitySpan({
    span_name: "api GET /api/hrx/employees",
    tenant_id: "tenant-a",
    component: "api-route",
    operation: "/api/hrx/employees",
    duration_ms: 9,
    attributes: {
      method: "GET",
      status: 200,
      salary: 100000,
      document_body: "raw body",
    },
  });

  assert.equal(span.attributes.method, "GET");
  assert.equal(span.attributes.salary, undefined);
  assert.equal(span.attributes.document_body, undefined);
});
