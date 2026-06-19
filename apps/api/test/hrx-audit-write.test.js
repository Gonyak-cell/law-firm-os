import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../packages/audit/src/hrx-event-store.js";
import { appendHrxRouteAudit } from "../src/middleware/hrx-audit-write.js";

test("HRX API audit helper appends route audit event", async () => {
  const store = createHrxAuditEventStore();
  const event = await appendHrxRouteAudit({
    store,
    context: { tenant_id: "tenant-a", actor_id: "user-a", actor_role: "hr_admin" },
    route: "/hrx/employees",
    action: "hrx.employee.read",
    object: { object_type: "Employee", object_id: "emp-001" },
    decision: { effect: "allow", reason: "hrx_policy_allow" },
  });
  assert.equal(event.tenant_id, "tenant-a");
  assert.equal(event.actor_id, "user-a");
  assert.equal(event.decision, "allow");
  assert.equal(store.list({ tenant_id: "tenant-a" }).length, 1);
});

test("HRX API audit helper fails closed without context", async () => {
  const store = createHrxAuditEventStore();
  await assert.rejects(() => appendHrxRouteAudit({ store, context: {}, action: "hrx.employee.read" }), /tenant_id is required/);
});
