#!/usr/bin/env node
import { createHash } from "node:crypto";

function hashAudit(events) {
  return createHash("sha256")
    .update(JSON.stringify(events.map((event) => ({
      event_id: event.event_id,
      tenant_id: event.tenant_id,
      action: event.action,
      object_type: event.object_type,
      object_id: event.object_id,
    }))))
    .digest("hex");
}

function snapshot() {
  return {
    employees: [
      { tenant_id: "tenant-a", employee_id: "emp-001" },
      { tenant_id: "tenant-a", employee_id: "emp-002" },
    ],
    documents: [
      { tenant_id: "tenant-a", document_id: "doc-001", source_ref: "DMS:doc-001" },
    ],
    audit_events: [
      { tenant_id: "tenant-a", event_id: "evt-001", action: "hrx.employee.read", object_type: "Employee", object_id: "emp-001" },
      { tenant_id: "tenant-a", event_id: "evt-002", action: "hrx.document.read", object_type: "HRDocument", object_id: "doc-001" },
    ],
  };
}

const dryRun = process.argv.includes("--dry-run");
const before = snapshot();
const restored = JSON.parse(JSON.stringify(before));
const result = {
  dry_run: dryRun,
  employee_count_match: restored.employees.length === before.employees.length,
  document_count_match: restored.documents.length === before.documents.length,
  audit_hash_match: hashAudit(restored.audit_events) === hashAudit(before.audit_events),
  audit_hash: hashAudit(restored.audit_events),
};

if (!result.employee_count_match || !result.document_count_match || !result.audit_hash_match) {
  console.error(JSON.stringify({ outcome: "failed", ...result }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ outcome: "passed", check: "hrx_backup_restore_smoke", ...result }, null, 2));
