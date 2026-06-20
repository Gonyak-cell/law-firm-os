import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

const HRX_AUTH_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-b",
  "x-lawos-actor-id": "hr-tenant-b",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": "hrx.employee.read,hrx.document.read,hrx.candidate.read,hrx.analytics.read,hrx.ai.assistant",
});

async function json(path, options = {}) {
  const headers = path.startsWith("/api/hrx") ? { ...HRX_AUTH_HEADERS, ...(options.headers ?? {}) } : options.headers;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("tenant isolation keeps trusted tenant-b from seeing tenant-a fixture rows", async () => {
  const employees = await json("/api/hrx/employees");
  assert.equal(employees.status, 200);
  assert.deepEqual(employees.body.employees, []);

  const documents = await json("/api/hrx/documents?employee_id=emp-001");
  assert.equal(documents.status, 200);
  assert.deepEqual(documents.body.documents, []);

  const candidate = await json("/api/hrx/candidate/portal?candidate_id=cand-001");
  assert.equal(candidate.status, 404);
  assert.equal(candidate.body.safe_error_code, "HRX_CANDIDATE_NOT_FOUND");

  const analytics = await json("/api/hrx/analytics");
  assert.equal(analytics.status, 200);
  assert.equal(analytics.body.analytics.tenant_id, "tenant-b");
  assert.equal(analytics.body.analytics.headcount.total, 0);
  assert.equal(JSON.stringify(analytics.body).includes("Ari Kim"), false);
});

test("tenant isolation fails closed when tenant actor context is supplied by query", async () => {
  const { status, body } = await json("/api/hrx/employees?tenant_id=tenant-b&actor_id=hr-tenant-b");
  assert.equal(status, 400);
  assert.equal(body.outcome, "blocked");
  assert.equal(body.safe_error_code, "HRX_QUERY_CONTEXT_FORBIDDEN");
});
