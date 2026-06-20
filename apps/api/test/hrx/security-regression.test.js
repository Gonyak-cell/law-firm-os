import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

const BASE_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-security-user",
  "x-lawos-actor-role": "people_ops",
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

test("HRX security regression fails closed on missing tenant actor context", async () => {
  const { status, body } = await json("/api/hrx/employees");
  assert.equal(status, 400);
  assert.equal(body.safe_error_code, "HRX_TENANT_CONTEXT_REQUIRED");
  assert.equal(body.fail_closed, true);
});

test("HRX security regression denies missing scope before runtime", async () => {
  const { status, body } = await json("/api/hrx/documents?employee_id=emp-001", {
    headers: { ...BASE_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(body.required_scope, "hrx.document.read");
});

test("HRX security regression blocks query-supplied tenant actor context", async () => {
  const { status, body } = await json("/api/hrx/employees?tenant_id=tenant-a&actor_id=query-user", {
    headers: { ...BASE_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
  });
  assert.equal(status, 400);
  assert.equal(body.safe_error_code, "HRX_QUERY_CONTEXT_FORBIDDEN");
  assert.deepEqual(body.forbidden_query_keys, ["tenant_id", "actor_id"]);
});

test("HRX security regression requires step-up for audit route", async () => {
  const { status, body } = await json("/api/hrx/audit", {
    headers: { ...BASE_HEADERS, "x-lawos-hrx-scopes": "hrx.audit.read" },
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(body.step_up_required, true);
});

test("HRX security regression denies unmapped HRX routes", async () => {
  const { status, body } = await json("/api/hrx/not-mapped", {
    headers: { ...BASE_HEADERS, "x-lawos-hrx-scopes": "hrx.employee.read" },
  });
  assert.equal(status, 403);
  assert.equal(body.safe_error_code, "HRX_ROUTE_POLICY_REQUIRED");
  assert.equal(body.fail_closed, true);
});
