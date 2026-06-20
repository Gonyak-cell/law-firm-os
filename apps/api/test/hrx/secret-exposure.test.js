import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

const HRX_AUTH_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-secret-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": [
    "hrx.employee.read",
    "hrx.document.read",
    "hrx.candidate.read",
    "hrx.analytics.read",
    "hrx.audit.read",
  ].join(","),
  "x-lawos-hrx-step-up": JSON.stringify({
    tenant_id: "tenant-a",
    actor_id: "hrx-secret-user",
    mfa: true,
    assurance_level: 2,
    expires_at: "2999-01-01T00:00:00.000Z",
  }),
});

const FORBIDDEN_KEYS = new Set([
  "api_key",
  "bank_account_ref",
  "client_secret",
  "document_body",
  "prompt",
  "answer",
  "raw_secret",
  "salary",
  "tax_profile_ref",
]);

const FORBIDDEN_VALUES = Object.freeze([
  "OPENAI_API_KEY",
  "sk-",
  "raw document body",
  "bank account",
  "tax profile",
  "payroll secret",
]);

async function json(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: HRX_AUTH_HEADERS });
  return { status: response.status, body: await response.json() };
}

function collectForbiddenKeys(value, path = "$", found = []) {
  if (!value || typeof value !== "object") return found;
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (FORBIDDEN_KEYS.has(key)) found.push(nextPath);
    collectForbiddenKeys(nested, nextPath, found);
  }
  return found;
}

function assertNoSecretPayload(body) {
  assert.deepEqual(collectForbiddenKeys(body), []);
  const serialized = JSON.stringify(body);
  for (const forbidden of FORBIDDEN_VALUES) {
    assert.equal(serialized.includes(forbidden), false, `response leaked forbidden value ${forbidden}`);
  }
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("HRX API responses omit secret and raw sensitive payload fields", async () => {
  const routes = [
    "/api/hrx/employees/emp-001",
    "/api/hrx/documents?employee_id=emp-001",
    "/api/hrx/candidate/portal?candidate_id=cand-001",
    "/api/hrx/analytics",
    "/api/hrx/audit",
  ];

  for (const route of routes) {
    const { status, body } = await json(route);
    assert.equal(status, 200, `${route} should be readable for secret exposure smoke`);
    assertNoSecretPayload(body);
  }
});
