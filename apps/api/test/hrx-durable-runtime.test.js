import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startApiServer } from "../src/server.js";
import { signedStepUpHeader } from "./hrx-step-up-test-helper.js";

const HRX_AUTH_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hrx-test-user",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-step-up": signedStepUpHeader({
    tenant_id: "tenant-a",
    actor_id: "hrx-test-user",
  }),
  "x-lawos-hrx-scopes": [
    "hrx.employee.read",
    "hrx.document.read",
    "hrx.leave.read",
    "hrx.leave.write",
    "hrx.audit.read",
  ].join(","),
});

async function json(baseUrl, path, options = {}) {
  const headers = path.startsWith("/api/hrx") ? { ...HRX_AUTH_HEADERS, ...(options.headers ?? {}) } : options.headers;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json() };
}

async function withServer(hrxStorePath, callback) {
  const started = await startApiServer({ port: 0, hrxStorePath });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

test("HRX API write state and audit evidence survive durable runtime restart", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "lawos-hrx-durable-test-")), "hrx-store.json");

  await withServer(storePath, async (baseUrl) => {
    const submitted = await json(baseUrl, "/api/hrx/leave", {
      method: "POST",
      body: JSON.stringify({
        request_id: "leave-durable-001",
        employee_id: "emp-001",
        policy_id: "pto-us",
        leave_type: "pto",
        amount: 4,
        start_date: "2026-08-03",
        end_date: "2026-08-03",
      }),
    });
    assert.equal(submitted.status, 201);
    assert.equal(submitted.body.leave_request.request_id, "leave-durable-001");
    assert.equal(submitted.body.leave_request.state, "submitted");

    const denied = await json(baseUrl, "/api/hrx/documents?employee_id=emp-001", {
      headers: { "x-lawos-hrx-scopes": "hrx.employee.read" },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.reason, "hrx_scope_required");
  });

  await withServer(storePath, async (baseUrl) => {
    const leave = await json(baseUrl, "/api/hrx/leave?employee_id=emp-001&policy_id=pto-us");
    assert.equal(leave.status, 200);
    assert.ok(leave.body.requests.some((request) => request.request_id === "leave-durable-001"));

    const audit = await json(baseUrl, "/api/hrx/audit");
    assert.equal(audit.status, 200);
    assert.ok(
      audit.body.events.some(
        (event) => event.action === "hrx.leave.submit" && event.object_id === "leave-durable-001",
      ),
    );
    assert.ok(
      audit.body.events.some(
        (event) =>
          event.action === "hrx.document.read" &&
          event.decision === "deny" &&
          event.reason === "hrx_scope_required" &&
          event.source === "/api/hrx/documents",
      ),
    );
  });
});
