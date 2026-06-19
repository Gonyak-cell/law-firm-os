import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("tenant isolation blocks cross-tenant employee document candidate analytics and AI requests", async () => {
  const requests = [
    () => json("/api/hrx/employees?tenant_id=tenant-b"),
    () => json("/api/hrx/documents?tenant_id=tenant-b&employee_id=emp-001"),
    () => json("/api/hrx/candidate/portal?tenant_id=tenant-b&candidate_id=cand-001"),
    () => json("/api/hrx/analytics?tenant_id=tenant-b"),
    () =>
      json("/api/hrx/ai/assistant?tenant_id=tenant-b&actor_id=hr-001", {
        method: "POST",
        body: JSON.stringify({ question: "Summarize leave policy", decision_mode: "advisory" }),
      }),
  ];

  for (const request of requests) {
    const { status, body } = await request();
    assert.equal(status, 400);
    assert.equal(body.outcome, "blocked");
    assert.equal(body.safe_error_code, "HRX_API_TENANT_REQUIRED");
  }
});
