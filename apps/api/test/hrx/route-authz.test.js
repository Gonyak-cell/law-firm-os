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
  "x-lawos-hrx-scopes": "hrx.employee.read,hrx.employee.write,hrx.document.read",
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
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/employee-user-links" }).required_scope, "hrx.employee.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/employee-user-links/link-001/revoke" }).required_scope, "hrx.employee.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/documents" }).required_scope, "hrx.document.read");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/lifecycle/onboarding" }).required_scope, "hrx.lifecycle.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/lifecycle/onboarding/onb-001/tasks/task-001" }).required_scope, "hrx.lifecycle.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/lifecycle/offboarding" }).required_scope, "hrx.lifecycle.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/lifecycle/offboarding/off-001/close" }).required_scope, "hrx.lifecycle.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/not-mapped" }), null);
});

test("HRX authz middleware fails closed without trusted tenant actor context", () => {
  const decision = authorizeHrxApiRequest({ method: "GET", pathname: "/api/hrx/employees", headers: {} });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, 400);
  assert.equal(decision.body.safe_error_code, "HRX_TENANT_CONTEXT_REQUIRED");
  assert.equal(decision.body.fail_closed, true);
});

test("HRX API denies route access before runtime when scope is missing", async () => {
  const { status, body } = await json("/api/hrx/documents?employee_id=emp-001", {
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
  });
  assert.equal(status, 403);
  assert.equal(body.outcome, "blocked");
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.document.read");
});

test("HRX API allows scoped trusted context and rejects unmapped HRX routes", async () => {
  const allowed = await json("/api/hrx/employees", { headers: ALLOW_HEADERS });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.outcome, "ok");

  const unmapped = await json("/api/hrx/not-mapped", { headers: ALLOW_HEADERS });
  assert.equal(unmapped.status, 403);
  assert.equal(unmapped.body.safe_error_code, "HRX_ROUTE_POLICY_REQUIRED");
});

test("HRX API rejects query tenant actor context before runtime", async () => {
  const { status, body } = await json("/api/hrx/employees?tenant_id=tenant-a&actor_id=query-user", { headers: ALLOW_HEADERS });
  assert.equal(status, 400);
  assert.equal(body.safe_error_code, "HRX_QUERY_CONTEXT_FORBIDDEN");
  assert.deepEqual(body.forbidden_query_keys, ["tenant_id", "actor_id"]);
});

test("HRX employee user-link write route requires write scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/employee-user-links", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
    body: JSON.stringify({
      link_id: "link-authz-denied",
      employee_id: "emp-001",
      user_id: "iam-authz-denied",
    }),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.employee.write");
});

test("HRX lifecycle write route requires lifecycle write scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/lifecycle/offboarding/off-001/close", {
    method: "POST",
    headers: { ...ALLOW_HEADERS, "x-lawos-hrx-scopes": "hrx.lifecycle.read" },
    body: JSON.stringify({}),
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.lifecycle.write");
});
