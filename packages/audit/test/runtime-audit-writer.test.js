import assert from "node:assert/strict";
import test from "node:test";
import { assertRuntimeAuditImmutable, createRuntimeAuditWriter } from "../src/index.js";

const principal = Object.freeze({
  source: "server-derived",
  header_only_trust_allowed: false,
  tenant_id: "tenant-a",
  user_id: "user-a",
  actor_type: "user",
  request_id: "req-a"
});

const matter = Object.freeze({
  resource_id: "matter-a",
  resource_type: "Matter",
  tenant_id: "tenant-a",
  matter_id: "matter-a"
});

test("Runtime audit writer appends immutable hash-chain events idempotently", () => {
  const writer = createRuntimeAuditWriter();
  const first = writer.append({
    principal,
    resource: matter,
    action: "runtime.read",
    decision: { effect: "allow", reason: "allow_rule" },
    permission_context_id: "perm-001",
    request: { request_id: "req-001", trace_id: "trace-a", span_id: "span-a" }
  });
  const replay = writer.append({
    principal,
    resource: matter,
    action: "runtime.read",
    decision: { effect: "allow", reason: "allow_rule" },
    permission_context_id: "perm-001",
    request: { request_id: "req-001", trace_id: "trace-a", span_id: "span-a" }
  });
  const second = writer.append({
    principal,
    resource: matter,
    action: "runtime.write",
    decision: { effect: "allow", reason: "allow_rule" },
    permission_context_id: "perm-002",
    request: { request_id: "req-002", trace_id: "trace-a", span_id: "span-b" }
  });

  assert.equal(first.event_hash, replay.event_hash);
  assert.equal(second.previous_event_hash, first.event_hash);
  assert.deepEqual(writer.verify({ tenant_id: "tenant-a" }), { ok: true, checked: 2 });
  assert.equal(assertRuntimeAuditImmutable(first), true);
});

test("Runtime audit writer refuses non-server-derived principal and missing permission context", () => {
  const writer = createRuntimeAuditWriter();
  assert.throws(
    () =>
      writer.append({
        principal: { tenant_id: "tenant-a", user_id: "caller" },
        resource: matter,
        action: "runtime.read",
        decision: { effect: "allow" },
        permission_context_id: "perm-001"
      }),
    /server-derived principal/,
  );
  assert.throws(
    () =>
      writer.append({
        principal,
        resource: matter,
        action: "runtime.read",
        decision: { effect: "allow" }
      }),
    /permission_context_id/,
  );
});
