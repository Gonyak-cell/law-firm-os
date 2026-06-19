import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createHrxPayrollRoute } from "../../src/routes/hrx/payroll.js";

test("payroll route creates export preview with human review and no calculation runtime", async () => {
  const audit = createHrxAuditEventStore();
  const route = createHrxPayrollRoute({ audit });
  const response = await route.handle({
    method: "POST",
    context: { tenant_id: "tenant-a", actor_id: "user-a" },
    body: {
      preview_id: "pay-preview-001",
      payroll_period: "2026-06",
      employee_ids: ["emp-001"],
      external_provider: "external-preview-only",
    },
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.preview.human_review_required, true);
  assert.equal(response.body.preview.calculation_runtime, false);
  assert.equal(audit.list({ tenant_id: "tenant-a" }).length, 1);
});

test("payroll route blocks calculation and disbursement fields", async () => {
  const route = createHrxPayrollRoute({ audit: createHrxAuditEventStore() });
  const response = await route.handle({
    method: "POST",
    context: { tenant_id: "tenant-a", actor_id: "user-a" },
    body: {
      preview_id: "pay-preview-001",
      payroll_period: "2026-06",
      employee_ids: ["emp-001"],
      net_pay: 100,
    },
  });
  assert.equal(response.status, 400);
  assert.match(response.body.reason, /must not include net_pay/);
});
