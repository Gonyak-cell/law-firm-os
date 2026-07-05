import assert from "node:assert/strict";
import test from "node:test";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  highestPrivilegeRegisteredAccount,
} from "../../src/matter-vault-account-registry.js";
import { startApiServer } from "../../src/server.js";
import { signedHeaders } from "../helpers/session.js";
import { signedStepUpHeader } from "../hrx-step-up-test-helper.js";

let server;
let baseUrl;

const SESSION_ACCOUNT = highestPrivilegeRegisteredAccount();
const HRX_AUTH_HEADERS = Object.freeze({
  "x-lawos-tenant-id": MATTER_VAULT_REGISTERED_TENANT_ID,
  "x-lawos-actor-id": SESSION_ACCOUNT.user_id,
  "x-lawos-actor-role": SESSION_ACCOUNT.role_ids.join(","),
  "x-lawos-hrx-scopes": [
    "hrx.employee.read",
    "hrx.document.read",
    "hrx.candidate.read",
    "hrx.analytics.read",
    "hrx.audit.read",
    "hrx.legal_people.read",
  ].join(","),
  "x-lawos-hrx-step-up": signedStepUpHeader({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    actor_id: SESSION_ACCOUNT.user_id,
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
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { ...(await signedHeaders(baseUrl, SESSION_ACCOUNT)), ...HRX_AUTH_HEADERS },
  });
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
    "/api/hrx/employees/emp_amic_jwsuh",
    "/api/hrx/documents?employee_id=emp_amic_jwsuh",
    "/api/hrx/candidate/portal?candidate_id=cand-001",
    "/api/hrx/legal-people/search?type_id=client_contact",
    "/api/hrx/legal-people/person_client_contact_001",
    "/api/hrx/analytics",
    "/api/hrx/audit",
  ];

  for (const route of routes) {
    const { status, body } = await json(route);
    assert.equal(status, 200, `${route} should be readable for secret exposure smoke`);
    assertNoSecretPayload(body);
  }
});
