import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../packages/audit/src/hrx-event-store.js";
import { createPayrollExportService } from "../src/payroll-export-service.js";

const context = Object.freeze({ tenant_id: "tenant-a", actor_id: "payroll-admin" });

test("payroll export service runs preview approve export artifact with audit", async () => {
  const audit = createHrxAuditEventStore();
  const service = createPayrollExportService({ audit });
  const preview = await service.preview(context, {
    preview_id: "pay-preview-001",
    payroll_period: "2026-06",
    employee_ids: ["emp-001", "emp-002"],
    external_provider: "provider-preview-only",
  });
  assert.equal(preview.state, "preview");
  assert.equal(preview.calculation_runtime, false);

  const approved = await service.approve(context, {
    preview_id: "pay-preview-001",
    approval_ref: "Approval:pay-preview-001",
  });
  assert.equal(approved.state, "approved");
  assert.equal(approved.approved_by, "payroll-admin");

  const artifact = await service.exportArtifact(context, {
    preview_id: "pay-preview-001",
    export_artifact_ref: "DMS:payroll-export-001",
    provider_payload_ref: "ProviderDraft:payroll-export-001",
  });
  assert.equal(artifact.employee_count, 2);
  assert.equal(artifact.disbursement_instruction_included, false);
  assert.deepEqual(
    audit.list({ tenant_id: "tenant-a" }).map((event) => event.action),
    ["hrx.payroll.preview", "hrx.payroll.approve", "hrx.payroll.export"],
  );
});

test("payroll export service blocks export before approval and raw pay fields", async () => {
  const service = createPayrollExportService();
  await assert.rejects(
    () =>
      service.preview(context, {
        preview_id: "pay-preview-raw",
        payroll_period: "2026-06",
        employee_ids: ["emp-001"],
        net_pay: 100,
      }),
    /must not include net_pay/,
  );
  await service.preview(context, {
    preview_id: "pay-preview-002",
    payroll_period: "2026-06",
    employee_ids: ["emp-001"],
  });
  await assert.rejects(
    () =>
      service.exportArtifact(context, {
        preview_id: "pay-preview-002",
        export_artifact_ref: "DMS:payroll-export-002",
      }),
    /must be approved before export/,
  );
});
