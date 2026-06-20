import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlHrxAuditEventStore } from "../src/hrx-event-store-sql.js";
import { verifyHrxAuditHashChain } from "../src/hrx-hash-chain.js";
import { runHrxMigrations } from "../../hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../hrx/src/store/file-store.js";

test("SQL HRX audit store appends durable hash-chain events", () => {
  const store = createFileHrxStore({ filePath: join(mkdtempSync(join(tmpdir(), "hrx-audit-sql-")), "store.json") });
  runHrxMigrations(store);
  const audit = createSqlHrxAuditEventStore({ store });
  const first = audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-001",
    actor_id: "user-a",
    action: "hrx.employee.read",
    object_type: "Employee",
    object_id: "emp-001",
    decision: "allow",
    reason: "test",
    occurred_at: "2026-06-20T00:00:00.000Z",
  });
  const second = audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-002",
    actor_id: "user-a",
    action: "hrx.document.read",
    object_type: "HRDocument",
    object_id: "doc-001",
    decision: "allow",
    reason: "test",
    occurred_at: "2026-06-20T00:00:01.000Z",
  });
  assert.equal(first.previous_hash, null);
  assert.equal(second.previous_hash, first.event_hash);
  assert.equal(verifyHrxAuditHashChain(audit.list({ tenant_id: "tenant-a" })), true);
  store.close();
});
