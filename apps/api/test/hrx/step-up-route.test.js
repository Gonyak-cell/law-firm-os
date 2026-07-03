import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../../src/server.js";
import { createHrxStepUpAuthority } from "../../src/hrx-step-up-token.js";
import { signedStepUpHeader } from "../hrx-step-up-test-helper.js";

let server;
let baseUrl;

const BASE_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-step-up-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": "hrx.audit.read",
});

const stepUpAuthority = createHrxStepUpAuthority({
  secret: "hrx-step-up-route-secret",
  totpSecret: "hrx-step-up-route-totp",
  now: () => Date.parse("2026-07-02T00:00:00.000Z"),
});

const STEP_UP_HEADER = signedStepUpHeader({
  tenant_id: "tenant-a",
  actor_id: "hrx-step-up-user",
  purpose: "security_audit",
  authority: stepUpAuthority,
});

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0, stepUpAuthority });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("HRX audit route requires fresh step-up context after authz allows scope", async () => {
  const challenged = await json("/api/hrx/audit", { headers: BASE_HEADERS });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(challenged.body.step_up_required, true);

  const allowed = await json("/api/hrx/audit", {
    headers: { ...BASE_HEADERS, "x-lawos-hrx-step-up": STEP_UP_HEADER },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.outcome, "ok");
  assert.ok(allowed.body.events.every((event) => event.tenant_id === "tenant-a"));
});

test("HRX audit route rejects unsigned or mismatched step-up tokens", async () => {
  const unsigned = await json("/api/hrx/audit", {
    headers: {
      ...BASE_HEADERS,
      "x-lawos-hrx-step-up": JSON.stringify({
        tenant_id: "tenant-a",
        actor_id: "hrx-step-up-user",
        purpose: "security_audit",
        mfa: true,
        assurance_level: 2,
        expires_at: "2999-01-01T00:00:00.000Z",
      }),
    },
  });
  assert.equal(unsigned.status, 403);
  assert.equal(unsigned.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(unsigned.body.reason, "hrx_step_up_token_invalid");

  const mismatched = await json("/api/hrx/audit", {
    headers: {
      ...BASE_HEADERS,
      "x-lawos-hrx-step-up": signedStepUpHeader({
        tenant_id: "tenant-a",
        actor_id: "other-user",
        purpose: "security_audit",
        authority: stepUpAuthority,
      }),
    },
  });
  assert.equal(mismatched.status, 403);
  assert.equal(mismatched.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(mismatched.body.reason, "hrx_sensitive_action_requires_fresh_mfa");
});
