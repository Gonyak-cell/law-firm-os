import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

const BASE_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-step-up-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": "hrx.audit.read",
});

const STEP_UP_HEADER = JSON.stringify({
  tenant_id: "tenant-a",
  actor_id: "hrx-step-up-user",
  mfa: true,
  assurance_level: 2,
  expires_at: "2999-01-01T00:00:00.000Z",
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

test("HRX audit route requires fresh step-up context after authz allows scope", async () => {
  const challenged = await json("/api/hrx/audit?tenant_id=tenant-a", { headers: BASE_HEADERS });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
  assert.equal(challenged.body.step_up_required, true);

  const allowed = await json("/api/hrx/audit?tenant_id=tenant-a", {
    headers: { ...BASE_HEADERS, "x-lawos-hrx-step-up": STEP_UP_HEADER },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.outcome, "ok");
  assert.ok(allowed.body.events.every((event) => event.tenant_id === "tenant-a"));
});

test("HRX audit route rejects stale or mismatched step-up token", async () => {
  const stale = await json("/api/hrx/audit?tenant_id=tenant-a", {
    headers: {
      ...BASE_HEADERS,
      "x-lawos-hrx-step-up": JSON.stringify({
        tenant_id: "tenant-a",
        actor_id: "hrx-step-up-user",
        mfa: true,
        assurance_level: 2,
        expires_at: "2000-01-01T00:00:00.000Z",
      }),
    },
  });
  assert.equal(stale.status, 403);
  assert.equal(stale.body.safe_error_code, "HRX_STEP_UP_REQUIRED");
});
