import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store-sql.js";
import { verifyHrxAuditHashChain } from "../../../../packages/audit/src/hrx-hash-chain.js";
import { createSqlHrxDocumentStore } from "../../../../packages/hrx/src/documents.js";
import { createSqlLeaveBalanceLedger } from "../../../../packages/hrx/src/leave/balance.js";
import { createSqlLeaveRequestStore } from "../../../../packages/hrx/src/leave/request-service.js";
import { createHrxRuntimeContext } from "../../src/hrx-runtime-context.js";
import { createSqlHrxRepository } from "../../../../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";

test("HRX runtime repository write survives store reopen", () => {
  const storeFile = join(mkdtempSync(join(tmpdir(), "hrx-runtime-durability-")), "hrx-store.json");
  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({ store });
  context.repository.createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-durable",
    display_name: "Durable Employee",
    status: "active",
  });
  context.repository.createEmploymentProfile({
    tenant_id: "tenant-a",
    profile_id: "profile-durable",
    employee_id: "emp-durable",
    employment_type: "full_time",
    status: "active",
    effective_from: "2026-06-20",
  });
  context.documents.create({
    tenant_id: "tenant-a",
    document_id: "doc-durable",
    employee_id: "emp-durable",
    document_type: "policy_ack",
    source_ref: "DMS:doc-durable",
  });
  context.leaveLedger.append({
    tenant_id: "tenant-a",
    entry_id: "pto-earned-durable",
    employee_id: "emp-durable",
    policy_id: "pto-us",
    entry_type: "earned",
    amount: 8,
    occurred_on: "2026-06-20",
    source_ref: "PolicyAccrual:2026-06",
  });
  context.leaveStore.create({
    tenant_id: "tenant-a",
    request_id: "leave-durable",
    employee_id: "emp-durable",
    policy_id: "pto-us",
    leave_type: "pto",
    amount: 8,
    start_date: "2026-06-24",
    end_date: "2026-06-24",
  });
  context.audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-durable",
    actor_id: "user-a",
    action: "hrx.employee.read",
    object_type: "Employee",
    object_id: "emp-durable",
    decision: "allow",
    reason: "durability_test",
    occurred_at: "2026-06-20T00:00:00.000Z",
  });
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  const reopenedRepository = createSqlHrxRepository({ store: reopenedStore });
  const reopenedDocuments = createSqlHrxDocumentStore({ store: reopenedStore });
  const reopenedLeaveLedger = createSqlLeaveBalanceLedger({ store: reopenedStore });
  const reopenedLeaveStore = createSqlLeaveRequestStore({ store: reopenedStore });
  const reopenedAudit = createSqlHrxAuditEventStore({ store: reopenedStore });
  assert.equal(
    reopenedRepository.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-durable" }).display_name,
    "Durable Employee",
  );
  assert.equal(reopenedRepository.listEmploymentProfiles({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(reopenedDocuments.list({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(reopenedLeaveLedger.list({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(reopenedLeaveStore.list({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(verifyHrxAuditHashChain(reopenedAudit.list({ tenant_id: "tenant-a" })), true);
  reopenedStore.close();
});
