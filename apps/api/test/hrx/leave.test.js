import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryLeaveBalanceLedger } from "../../../../packages/hrx/src/leave/balance.js";
import {
  createInMemoryLeaveRequestStore,
  createLeaveRequestService,
} from "../../../../packages/hrx/src/leave/request-service.js";
import { createHrxLeaveRoute } from "../../src/routes/hrx/leave.js";

function createRouteHarness() {
  const audit = createHrxAuditEventStore();
  const balanceLedger = createInMemoryLeaveBalanceLedger();
  const service = createLeaveRequestService({
    store: createInMemoryLeaveRequestStore(),
    balanceLedger,
    audit,
  });
  const route = createHrxLeaveRoute({ service });
  return { audit, balanceLedger, route };
}

const context = Object.freeze({ tenant_id: "tenant-a", actor_id: "manager-001" });

const leaveBody = Object.freeze({
  request_id: "leave-001",
  employee_id: "emp-001",
  policy_id: "pto-us",
  leave_type: "pto",
  amount: 8,
  start_date: "2026-07-01",
  end_date: "2026-07-01",
});

test("leave route submits and approves a request with audit and balance ledger entries", async () => {
  const { audit, balanceLedger, route } = createRouteHarness();
  const submitResponse = await route.handle({ method: "POST", context, body: leaveBody });
  assert.equal(submitResponse.status, 201);
  assert.equal(submitResponse.body.leave_request.state, "submitted");

  const approveResponse = await route.handle({
    method: "POST",
    context,
    params: { action: "approve", request_id: "leave-001" },
    body: { approver_id: "manager-001" },
  });
  assert.equal(approveResponse.status, 200);
  assert.equal(approveResponse.body.leave_request.state, "approved");
  assert.equal(audit.list({ tenant_id: "tenant-a" }).length, 2);
  assert.equal(
    balanceLedger.balance({ tenant_id: "tenant-a", employee_id: "emp-001", policy_id: "pto-us" }).used_balance,
    8,
  );
});

test("leave route audits rejection and blocks terminal re-approval", async () => {
  const { audit, route } = createRouteHarness();
  await route.handle({ method: "POST", context, body: { ...leaveBody, request_id: "leave-002" } });
  const rejectResponse = await route.handle({
    method: "POST",
    context,
    params: { action: "reject", request_id: "leave-002" },
    body: { decision_reason: "coverage required" },
  });
  assert.equal(rejectResponse.status, 200);
  assert.equal(rejectResponse.body.leave_request.state, "rejected");

  const approveResponse = await route.handle({
    method: "POST",
    context,
    params: { action: "approve", request_id: "leave-002" },
    body: { approver_id: "manager-001" },
  });
  assert.equal(approveResponse.status, 400);
  assert.match(approveResponse.body.reason, /must be submitted/);
  assert.equal(audit.list({ tenant_id: "tenant-a" }).length, 2);
});

test("leave route cancels only submitted requests", async () => {
  const { route } = createRouteHarness();
  await route.handle({ method: "POST", context, body: { ...leaveBody, request_id: "leave-003" } });
  const cancelResponse = await route.handle({
    method: "POST",
    context,
    params: { action: "cancel", request_id: "leave-003" },
    body: { decision_reason: "employee withdrew" },
  });
  assert.equal(cancelResponse.status, 200);
  assert.equal(cancelResponse.body.leave_request.state, "cancelled");
});
