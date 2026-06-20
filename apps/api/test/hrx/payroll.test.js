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

  const approved = await route.handle({
    method: "POST",
    context: { tenant_id: "tenant-a", actor_id: "user-a" },
    params: { action: "approve", preview_id: "pay-preview-001" },
    body: { approval_ref: "Approval:pay-preview-001" },
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.preview.state, "approved");

  const exported = await route.handle({
    method: "POST",
    context: { tenant_id: "tenant-a", actor_id: "user-a" },
    params: { action: "export", preview_id: "pay-preview-001" },
    body: {
      export_artifact_ref: "DMS:payroll-export-001",
      provider_payload_ref: "ProviderDraft:payroll-export-001",
    },
  });
  assert.equal(exported.status, 200);
  assert.equal(exported.body.artifact.disbursement_instruction_included, false);
  assert.deepEqual(
    audit.list({ tenant_id: "tenant-a" }).map((event) => event.action),
    ["hrx.payroll.preview", "hrx.payroll.approve", "hrx.payroll.export"],
  );
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
