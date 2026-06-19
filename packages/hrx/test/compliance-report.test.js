import assert from "node:assert/strict";
import test from "node:test";
import { createHrxComplianceReport } from "../src/compliance-report.js";

test("compliance report generates tenant access change retention and export sections", () => {
  const report = createHrxComplianceReport({
    tenant_id: "tenant-a",
    audit_events: [
      { tenant_id: "tenant-a", event_id: "evt-read", actor_id: "hr-001", action: "hrx.employee.read", object_type: "Employee", object_id: "emp-001", decision: "allow" },
      { tenant_id: "tenant-a", event_id: "evt-update", actor_id: "hr-001", action: "hrx.employee.update", object_type: "Employee", object_id: "emp-001", decision: "allow" },
      { tenant_id: "tenant-a", event_id: "evt-export", actor_id: "hr-001", action: "hrx.payroll.export", object_type: "PayrollPreview", object_id: "payroll-001", decision: "review_required" },
      { tenant_id: "tenant-b", event_id: "evt-other", actor_id: "hr-999", action: "hrx.employee.read", object_type: "Employee", object_id: "emp-other", decision: "allow" },
    ],
    retention_records: [
      { tenant_id: "tenant-a", object_type: "HRDocument", object_id: "doc-001", retention_policy_id: "retention-hr-docs", purge_due: false, legal_hold: false },
    ],
  });

  assert.equal(report.access.event_count, 1);
  assert.equal(report.change.event_count, 1);
  assert.equal(report.retention.record_count, 1);
  assert.equal(report.export.event_count, 1);
  assert.equal(report.sensitive_payload_included, false);
});

test("compliance report omits raw sensitive metadata", () => {
  const report = createHrxComplianceReport({
    tenant_id: "tenant-a",
    audit_events: [
      {
        tenant_id: "tenant-a",
        event_id: "evt-read",
        actor_id: "hr-001",
        action: "hrx.employee.read",
        object_type: "Employee",
        object_id: "emp-001",
        decision: "allow",
        metadata: { salary: 100000, document_body: "secret" },
      },
    ],
  });

  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes("salary"), false);
  assert.equal(serialized.includes("secret"), false);
});
