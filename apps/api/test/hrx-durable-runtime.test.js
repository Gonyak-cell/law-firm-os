import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  highestPrivilegeRegisteredAccount,
} from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { registeredAccount, signedHeaders } from "./helpers/session.js";
import { signedStepUpHeader } from "./hrx-step-up-test-helper.js";

const SESSION_ACCOUNT = highestPrivilegeRegisteredAccount();
const NO_HRX_SCOPE_ACCOUNT = registeredAccount("matter.desktop.qa@amic.kr");
const SESSION_EMPLOYEE_ID = "emp_amic_jwsuh";
const HRX_AUTH_HEADERS = Object.freeze({
  "x-lawos-tenant-id": MATTER_VAULT_REGISTERED_TENANT_ID,
  "x-lawos-actor-id": SESSION_ACCOUNT.user_id,
  "x-lawos-actor-role": SESSION_ACCOUNT.role_ids.join(","),
  "x-lawos-hrx-step-up": signedStepUpHeader({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    actor_id: SESSION_ACCOUNT.user_id,
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
  const { account = SESSION_ACCOUNT, ...requestOptions } = options;
  const headers = path.startsWith("/api/hrx")
    ? { ...(await signedHeaders(baseUrl, account)), ...HRX_AUTH_HEADERS, ...(options.headers ?? {}) }
    : options.headers;
  const response = await fetch(`${baseUrl}${path}`, { ...requestOptions, headers });
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
        employee_id: SESSION_EMPLOYEE_ID,
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

    const denied = await json(baseUrl, `/api/hrx/documents?employee_id=${SESSION_EMPLOYEE_ID}`, {
      account: NO_HRX_SCOPE_ACCOUNT,
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.safe_error_code, "HRX_AUTHZ_DENIED");
    assert.equal(denied.body.required_scope, "hrx.document.read");
  });

  await withServer(storePath, async (baseUrl) => {
    const leave = await json(baseUrl, `/api/hrx/leave?employee_id=${SESSION_EMPLOYEE_ID}&policy_id=pto-us`);
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
          ["hrx_role_required", "hrx_scope_required"].includes(event.reason) &&
          event.source === "/api/hrx/documents",
      ),
    );
  });
});
