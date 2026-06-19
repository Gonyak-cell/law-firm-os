import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore, recordHrxSensitiveAccess } from "../src/hrx-event-store.js";

const event = {
  event_id: "evt-001",
  tenant_id: "tenant-a",
  actor_id: "user-a",
  action: "hrx.compensation.read",
  object_type: "CompensationRecord",
  object_id: "comp-001",
  decision: "deny",
  reason: "hrx_scope_required",
  occurred_at: "2026-06-19T00:00:00.000Z",
};

test("HRX audit event store appends immutable sensitive access event", () => {
  const store = createHrxAuditEventStore();
  const appended = recordHrxSensitiveAccess({ store, event });
  appended.reason = "mutated";
  const [stored] = store.list({ tenant_id: "tenant-a" });
  assert.equal(stored.reason, "hrx_scope_required");
  assert.equal(stored.action, "hrx.compensation.read");
});

test("HRX audit event store rejects duplicate event ids", () => {
  const store = createHrxAuditEventStore();
  store.append(event);
  assert.throws(() => store.append(event), /Duplicate HRX audit event/);
});
