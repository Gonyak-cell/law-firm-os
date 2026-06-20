import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createHrxLifecycleRoute } from "../../src/routes/hrx/lifecycle.js";

const context = Object.freeze({ tenant_id: "tenant-a", actor_id: "people-ops-001" });

test("lifecycle route manages onboarding plan and task updates with audit", async () => {
  const audit = createHrxAuditEventStore();
  const route = createHrxLifecycleRoute({ audit });
  const created = await route.handle({
    method: "POST",
    context,
    params: { resource: "onboarding" },
    body: {
      onboarding_id: "onb-001",
      employee_id: "emp-001",
      start_date: "2026-08-01",
      tasks: [{ task_id: "task-001", title: "Complete policy acknowledgement", owner_role: "people_ops" }],
      document_refs: ["DocRef:policy-ack-001"],
      access_requests: [{ request_id: "access-001", system_ref: "DMS", access_level: "associate" }],
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.onboarding.tasks[0].status, "pending");

  const updated = await route.handle({
    method: "POST",
    context,
    params: { resource: "onboarding_task", onboarding_id: "onb-001", task_id: "task-001" },
    body: { status: "completed" },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.onboarding.tasks[0].status, "completed");
  assert.deepEqual(
    audit.list({ tenant_id: "tenant-a" }).map((event) => event.action),
    ["hrx.onboarding.create", "hrx.onboarding.task.update"],
  );
});

test("lifecycle route creates and closes offboarding only after checks clear", async () => {
  const audit = createHrxAuditEventStore();
  const route = createHrxLifecycleRoute({ audit });
  const created = await route.handle({
    method: "POST",
    context,
    params: { resource: "offboarding" },
    body: {
      offboarding_id: "off-001",
      employee_id: "emp-001",
      separation_date: "2026-08-31",
      access_revocations: [{ system_ref: "DMS", revoked: true }],
      document_returns: [{ document_ref: "Laptop:asset-001", returned: true }],
      legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: false }],
    },
  });
  assert.equal(created.status, 201);

  const blocked = await route.handle({
    method: "POST",
    context,
    params: { resource: "offboarding_close", offboarding_id: "off-001" },
    body: {},
  });
  assert.equal(blocked.status, 400);

  const closed = await route.handle({
    method: "POST",
    context,
    params: { resource: "offboarding_close", offboarding_id: "off-001" },
    body: { legal_hold_checks: [{ hold_ref: "HoldCheck:001", clear: true }] },
  });
  assert.equal(closed.status, 200);
  assert.equal(closed.body.offboarding.state, "closed");
  assert.equal(audit.list({ tenant_id: "tenant-a" }).at(-1).action, "hrx.offboarding.close");
});
