import assert from "node:assert/strict";
import test from "node:test";
import { authorizeHrxApiRequest } from "../../src/middleware/hrx-authz.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

const ALLOW_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-authz-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": "hrx.employee.read,hrx.document.read",
});

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

test("HRX route policy map resolves implemented server routes and denies unknown routes", () => {
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/employees" }).required_scope, "hrx.employee.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/documents" }).required_scope, "hrx.document.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/not-mapped" }), null);
});

test("HRX authz middleware fails closed without trusted tenant actor context", () => {
  const decision = authorizeHrxApiRequest({ method: "GET", pathname: "/api/hrx/employees", query: { tenant_id: "tenant-a" }, headers: {} });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, 400);
  assert.equal(decision.body.safe_error_code, "HRX_TENANT_CONTEXT_REQUIRED");
  assert.equal(decision.body.fail_closed, true);
});

test("HRX API denies route access before runtime when scope is missing", async () => {
  const { status, body } = await json("/api/hrx/documents?tenant_id=tenant-a&employee_id=emp-001", {
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
  });
  assert.equal(status, 403);
  assert.equal(body.outcome, "blocked");
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.document.read");
});

test("HRX API allows scoped trusted context and rejects unmapped HRX routes", async () => {
  const allowed = await json("/api/hrx/employees?tenant_id=tenant-a", { headers: ALLOW_HEADERS });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.outcome, "ok");

  const unmapped = await json("/api/hrx/not-mapped?tenant_id=tenant-a", { headers: ALLOW_HEADERS });
  assert.equal(unmapped.status, 403);
  assert.equal(unmapped.body.safe_error_code, "HRX_ROUTE_POLICY_REQUIRED");
});

test("HRX API rejects query tenant mismatch against trusted tenant header", async () => {
  const { status, body } = await json("/api/hrx/employees?tenant_id=tenant-b", { headers: ALLOW_HEADERS });
  assert.equal(status, 400);
  assert.equal(body.safe_error_code, "HRX_TENANT_CONTEXT_MISMATCH");
});
