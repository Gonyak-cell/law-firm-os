#!/usr/bin/env node
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSqlHrxAuditEventStore } from "../packages/audit/src/hrx-event-store-sql.js";
import { verifyHrxAuditHashChain } from "../packages/audit/src/hrx-hash-chain.js";
import { createSqlHrxDocumentStore } from "../packages/hrx/src/documents.js";
import { createSqlHrxRepository } from "../packages/hrx/src/repository-sql.js";
import { createSqlLeaveBalanceLedger } from "../packages/hrx/src/leave/balance.js";
import { createSqlLeaveRequestStore } from "../packages/hrx/src/leave/request-service.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";

const dryRun = process.argv.includes("--dry-run");

function seedStore(filePath) {
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store, clock: () => "2026-06-20T00:00:00.000Z" });
  const documents = createSqlHrxDocumentStore({ store });
  const leaveLedger = createSqlLeaveBalanceLedger({ store });
  const leaveRequests = createSqlLeaveRequestStore({ store });
  const audit = createSqlHrxAuditEventStore({ store });

  repository.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" });
  repository.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-002", display_name: "Mina Park", status: "active" });
  documents.create({
    tenant_id: "tenant-a",
    document_id: "doc-001",
    employee_id: "emp-001",
    document_type: "policy_ack",
    source_ref: "DMS:doc-001",
    title: "Policy acknowledgement",
  });
  leaveLedger.append({
    tenant_id: "tenant-a",
    entry_id: "pto-earned-001",
    employee_id: "emp-001",
    policy_id: "pto-us",
    entry_type: "earned",
    amount: 40,
    occurred_on: "2026-06-20",
    source_ref: "PolicyAccrual:2026-06",
  });
  leaveRequests.create({
    tenant_id: "tenant-a",
    request_id: "leave-001",
    employee_id: "emp-001",
    policy_id: "pto-us",
    leave_type: "pto",
    amount: 8,
    start_date: "2026-06-24",
    end_date: "2026-06-24",
  });
  audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-001",
    actor_id: "user-a",
    action: "hrx.employee.read",
    object_type: "Employee",
    object_id: "emp-001",
    decision: "allow",
    reason: "backup_restore_seed",
    occurred_at: "2026-06-20T00:00:00.000Z",
  });
  audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-002",
    actor_id: "user-a",
    action: "hrx.document.read",
    object_type: "HRDocument",
    object_id: "doc-001",
    decision: "allow",
    reason: "backup_restore_seed",
    occurred_at: "2026-06-20T00:00:01.000Z",
  });

  const snapshot = {
    employees: repository.listEmployees({ tenant_id: "tenant-a" }),
    documents: documents.list({ tenant_id: "tenant-a" }),
    leave_balance_entries: leaveLedger.list({ tenant_id: "tenant-a" }),
    leave_requests: leaveRequests.list({ tenant_id: "tenant-a" }),
    audit_events: audit.list({ tenant_id: "tenant-a" }),
  };
  store.close();
  return snapshot;
}

function readStore(filePath) {
  const store = createFileHrxStore({ filePath });
  const repository = createSqlHrxRepository({ store });
  const documents = createSqlHrxDocumentStore({ store });
  const leaveLedger = createSqlLeaveBalanceLedger({ store });
  const leaveRequests = createSqlLeaveRequestStore({ store });
  const audit = createSqlHrxAuditEventStore({ store });
  const snapshot = {
    employees: repository.listEmployees({ tenant_id: "tenant-a" }),
    documents: documents.list({ tenant_id: "tenant-a" }),
    leave_balance_entries: leaveLedger.list({ tenant_id: "tenant-a" }),
    leave_requests: leaveRequests.list({ tenant_id: "tenant-a" }),
    audit_events: audit.list({ tenant_id: "tenant-a" }),
  };
  store.close();
  return snapshot;
}

const dir = mkdtempSync(join(tmpdir(), "hrx-backup-restore-"));
const sourceFile = join(dir, "hrx-store.json");
const restoreFile = join(dir, "hrx-store-restored.json");
const before = seedStore(sourceFile);
copyFileSync(sourceFile, restoreFile);
const restored = readStore(restoreFile);
const result = {
  dry_run: dryRun,
  employee_count_match: restored.employees.length === before.employees.length,
  document_count_match: restored.documents.length === before.documents.length,
  leave_request_count_match: restored.leave_requests.length === before.leave_requests.length,
  leave_balance_entry_count_match: restored.leave_balance_entries.length === before.leave_balance_entries.length,
  audit_hash_match: restored.audit_events.at(-1)?.event_hash === before.audit_events.at(-1)?.event_hash,
  audit_hash_chain_valid: verifyHrxAuditHashChain(restored.audit_events),
  audit_hash: restored.audit_events.at(-1)?.event_hash,
};

if (
  !result.employee_count_match ||
  !result.document_count_match ||
  !result.leave_request_count_match ||
  !result.leave_balance_entry_count_match ||
  !result.audit_hash_match ||
  !result.audit_hash_chain_valid
) {
  console.error(JSON.stringify({ outcome: "failed", ...result }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ outcome: "passed", check: "hrx_backup_restore_smoke", ...result }, null, 2));
