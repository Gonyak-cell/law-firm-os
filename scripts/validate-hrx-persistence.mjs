#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSqlHrxAuditEventStore } from "../packages/audit/src/hrx-event-store-sql.js";
import { verifyHrxAuditHashChain } from "../packages/audit/src/hrx-hash-chain.js";
import { createSqlHrxDocumentStore } from "../packages/hrx/src/documents.js";
import { createSqlLeaveBalanceLedger } from "../packages/hrx/src/leave/balance.js";
import { createSqlLeaveRequestStore } from "../packages/hrx/src/leave/request-service.js";
import { createSqlHrxRepository } from "../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";
import { assertHrxStoreReadyForWorkflowRuntime } from "../packages/hrx/src/store/port.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const file of [
  "packages/hrx/src/store/port.js",
  "packages/hrx/src/store/file-store.js",
  "packages/hrx/src/repository-sql.js",
  "packages/hrx/src/migrations/index.js",
  "packages/hrx/src/migrations/001_hrx_core.sql",
  "packages/hrx/src/migrations/002_hrx_documents_leave_audit.sql",
  "packages/hrx/src/migrations/003_hrx_ai_analytics.sql",
  "packages/audit/src/hrx-event-store-sql.js",
  "packages/audit/src/hrx-hash-chain.js",
  "scripts/migrate-hrx.mjs",
  "scripts/seed-hrx-fixtures.mjs",
  "scripts/hrx-backup-restore-smoke.mjs",
  "packages/hrx/test/repository-sql.test.js",
  "packages/hrx/test/documents-sql.test.js",
  "packages/hrx/test/leave-sql.test.js",
  "packages/audit/test/hrx-event-store-sql.test.js",
  "packages/hrx/test/migration.test.js",
  "apps/api/test/hrx/durability.test.js",
]) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
}

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
assert(packageJson.scripts?.["hrx:persistence:validate"] === "node scripts/validate-hrx-persistence.mjs", "package script hrx:persistence:validate missing");
assert(packageJson.scripts?.["db:migrate:test"] === "node --test packages/hrx/test/migration.test.js", "package script db:migrate:test mismatch");

const repositorySource = readFileSync(resolve(root, "packages/hrx/src/repository.js"), "utf8");
assert(repositorySource.includes("HRX_IN_MEMORY_REPOSITORY_SCOPE"), "in-memory repository must declare fixture-only scope");
assert(repositorySource.includes("test_fixture_only"), "in-memory repository must be marked test_fixture_only");

try {
  const dir = mkdtempSync(join(tmpdir(), "hrx-persistence-"));
  const storeFile = join(dir, "hrx-store.json");
  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  assertHrxStoreReadyForWorkflowRuntime(store);
  const repo = createSqlHrxRepository({ store, clock: () => "2026-06-20T00:00:00.000Z" });
  const documents = createSqlHrxDocumentStore({ store });
  const leaveLedger = createSqlLeaveBalanceLedger({ store });
  const leaveRequests = createSqlLeaveRequestStore({ store });
  const audit = createSqlHrxAuditEventStore({ store });
  repo.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" });
  repo.createEmploymentProfile({
    tenant_id: "tenant-a",
    profile_id: "profile-001",
    employee_id: "emp-001",
    employment_type: "full_time",
    status: "active",
    effective_from: "2026-06-20",
  });
  repo.createEmployeeUserLink({
    tenant_id: "tenant-a",
    link_id: "link-001",
    employee_id: "emp-001",
    user_id: "user-001",
    purpose: "login_mapping",
  });
  documents.create({
    tenant_id: "tenant-a",
    document_id: "doc-001",
    employee_id: "emp-001",
    document_type: "policy_ack",
    source_ref: "DMS:doc-001",
  });
  leaveLedger.append({
    tenant_id: "tenant-a",
    entry_id: "pto-earned-001",
    employee_id: "emp-001",
    policy_id: "pto-us",
    entry_type: "earned",
    amount: 8,
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
    reason: "persistence_validator",
    occurred_at: "2026-06-20T00:00:00.000Z",
  });
  try {
    repo.transaction((tx) => {
      tx.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-rollback", display_name: "Rollback", status: "active" });
      throw new Error("force rollback");
    });
  } catch (error) {
    assert(error.message === "force rollback", "rollback test should throw expected error");
  }
  assert(!repo.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-rollback" }), "transaction rollback must discard employee write");
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  const reopenedRepo = createSqlHrxRepository({ store: reopenedStore });
  const reopenedDocuments = createSqlHrxDocumentStore({ store: reopenedStore });
  const reopenedLeaveLedger = createSqlLeaveBalanceLedger({ store: reopenedStore });
  const reopenedLeaveRequests = createSqlLeaveRequestStore({ store: reopenedStore });
  const reopenedAudit = createSqlHrxAuditEventStore({ store: reopenedStore });
  assert(
    reopenedRepo.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" })?.display_name === "Ari Kim",
    "employee must survive store reopen",
  );
  assert(
    reopenedRepo.listEmploymentProfiles({ tenant_id: "tenant-a", employee_id: "emp-001" }).length === 1,
    "employment profile must survive store reopen",
  );
  assert(
    reopenedRepo.listEmployeeUserLinks({ tenant_id: "tenant-a", employee_id: "emp-001" }).length === 1,
    "employee user link must survive store reopen",
  );
  assert(reopenedDocuments.list({ tenant_id: "tenant-a", employee_id: "emp-001" }).length === 1, "document must survive store reopen");
  assert(reopenedLeaveLedger.list({ tenant_id: "tenant-a", employee_id: "emp-001" }).length === 1, "leave ledger must survive store reopen");
  assert(reopenedLeaveRequests.list({ tenant_id: "tenant-a", employee_id: "emp-001" }).length === 1, "leave request must survive store reopen");
  assert(verifyHrxAuditHashChain(reopenedAudit.list({ tenant_id: "tenant-a" })), "audit hash chain must survive store reopen");
  reopenedStore.close();
} catch (error) {
  errors.push(error.stack ?? error.message);
}

if (errors.length > 0) {
  console.error("HRX persistence validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX persistence validation passed.");
console.log("durable_store: file-backed");
console.log("core_tables: hrx_employees, hrx_employment_profiles, hrx_employee_user_links");
console.log("workflow_tables: hrx_documents, hrx_leave_balance_entries, hrx_leave_requests, hrx_audit_events, hrx_ai_review_items, hrx_ai_source_chunks, hrx_analytics_snapshots");
