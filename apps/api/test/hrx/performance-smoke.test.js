import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

const HRX_AUTH_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-performance-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": [
    "hrx.employee.read",
    "hrx.document.read",
    "hrx.leave.read",
    "hrx.approval.read",
    "hrx.candidate.read",
    "hrx.lifecycle.read",
    "hrx.policy.read",
    "hrx.analytics.read",
    "hrx.audit.read",
  ].join(","),
  "x-lawos-hrx-step-up": JSON.stringify({
    tenant_id: "tenant-a",
    actor_id: "hrx-performance-user",
    mfa: true,
    assurance_level: 2,
    expires_at: "2999-01-01T00:00:00.000Z",
  }),
});

async function timedJson(path) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, { headers: HRX_AUTH_HEADERS });
  const body = await response.json();
  return {
    path,
    status: response.status,
    body,
    duration_ms: performance.now() - startedAt,
  };
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("HRX API baseline performance smoke stays under local p95 threshold", async () => {
  const routes = [
    "/api/hrx/employees",
    "/api/hrx/employees/emp-001",
    "/api/hrx/documents?employee_id=emp-001",
    "/api/hrx/leave?employee_id=emp-001&policy_id=pto-us",
    "/api/hrx/approvals",
    "/api/hrx/candidate/portal?candidate_id=cand-001",
    "/api/hrx/recruiting/pipeline",
    "/api/hrx/lifecycle/onboarding",
    "/api/hrx/lifecycle/offboarding",
    "/api/hrx/policies",
    "/api/hrx/analytics",
    "/api/hrx/audit",
  ];
  const results = [];
  for (const route of routes) results.push(await timedJson(route));

  assert.deepEqual(results.map((result) => result.status), routes.map(() => 200));
  const p95 = percentile(results.map((result) => result.duration_ms), 0.95);
  assert.ok(p95 < 500, `expected HRX local p95 under 500ms, got ${p95.toFixed(2)}ms`);
});
