import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeAuditMiddleware, createRuntimeAuditWriter } from "../src/index.js";

const principal = Object.freeze({
  source: "server-derived",
  header_only_trust_allowed: false,
  tenant_id: "tenant-a",
  user_id: "user-a",
  actor_type: "user",
  request_id: "req-a"
});

const resource = Object.freeze({
  resource_id: "matter-a",
  resource_type: "Matter",
  tenant_id: "tenant-a",
  matter_id: "matter-a"
});

test("Runtime audit middleware records reads, writes, permission evaluations, and exports", () => {
  const writer = createRuntimeAuditWriter();
  const middleware = createRuntimeAuditMiddleware({ writer });
  middleware.recordRead({ principal, resource, decision: { effect: "allow" }, permission_context_id: "perm-read", request: { request_id: "req-read" } });
  middleware.recordWrite({ principal, resource, decision: { effect: "allow" }, permission_context_id: "perm-write", request: { request_id: "req-write" } });
  middleware.recordPermission({ principal, resource, decision: { effect: "deny", reason: "fail_closed" }, permission_context_id: "perm-eval", request: { request_id: "req-eval" } });
  middleware.recordExport({ principal, resource, decision: { effect: "allow" }, permission_context_id: "perm-export", request: { request_id: "req-export" } });

  assert.deepEqual(
    writer.list({ tenant_id: "tenant-a" }).map((event) => event.action),
    ["runtime.read", "runtime.write", "permission.evaluate", "runtime.export"],
  );
});

test("Runtime audit middleware is non-bypassable for route writes without permission context", () => {
  const middleware = createRuntimeAuditMiddleware();
  assert.throws(
    () => middleware.recordWrite({ principal, resource, decision: { effect: "allow" }, request: { request_id: "req-write" } }),
    /permission_context_id/,
  );
});
