import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEvent, HRX_AUDIT_EVENT_SCHEMA_VERSION } from "../src/hrx-events.js";

test("HRX audit event includes actor tenant object decision and reason", () => {
  const event = createHrxAuditEvent({
    event_id: "evt-001",
    tenant_id: "tenant-a",
    actor_id: "user-a",
    action: "hrx.employee.read",
    object_type: "Employee",
    object_id: "emp-001",
    decision: "allow",
    reason: "hrx_policy_allow",
    occurred_at: "2026-06-19T00:00:00.000Z",
  });
  assert.equal(event.schema_version, HRX_AUDIT_EVENT_SCHEMA_VERSION);
  assert.equal(event.actor_id, "user-a");
  assert.equal(event.tenant_id, "tenant-a");
  assert.equal(event.object_id, "emp-001");
  assert.equal(event.decision, "allow");
  assert.equal(event.reason, "hrx_policy_allow");
});

test("HRX audit event rejects invalid decision", () => {
  assert.throws(
    () =>
      createHrxAuditEvent({
        event_id: "evt-002",
        tenant_id: "tenant-a",
        actor_id: "user-a",
        action: "hrx.employee.read",
        object_type: "Employee",
        object_id: "emp-001",
        decision: "maybe",
        reason: "invalid",
      }),
    /decision must be one of/,
  );
});
