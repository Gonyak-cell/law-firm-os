import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runHrxMigrations } from "../../hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../hrx/src/store/file-store.js";
import { createDurableAuditStore } from "../src/durable-audit-store.js";
import { verifyHrxAuditHashChain } from "../src/hrx-hash-chain.js";

function createStore() {
  const store = createFileHrxStore({ filePath: join(mkdtempSync(join(tmpdir(), "durable-audit-")), "store.json") });
  runHrxMigrations(store);
  return store;
}

test("durable audit store exports tenant-scoped hash-chain evidence", () => {
  const store = createStore();
  const audit = createDurableAuditStore({ store });
  audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-a-001",
    actor_id: "user-a",
    action: "cmp.write",
    object_type: "Matter",
    object_id: "matter-001",
    decision: "allow",
    reason: "test",
  });
  audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-a-002",
    actor_id: "user-a",
    action: "cmp.write",
    object_type: "Matter",
    object_id: "matter-002",
    decision: "allow",
    reason: "test",
  });
  audit.append({
    tenant_id: "tenant-b",
    event_id: "evt-b-001",
    actor_id: "user-b",
    action: "cmp.write",
    object_type: "Matter",
    object_id: "matter-003",
    decision: "allow",
    reason: "test",
  });

  const exported = audit.exportTenant({ tenant_id: "tenant-a" });
  assert.equal(exported.hash_chain_valid, true);
  assert.deepEqual(exported.events.map((event) => event.event_id), ["evt-a-001", "evt-a-002"]);
  assert.equal(exported.events.every((event) => event.tenant_id === "tenant-a"), true);
  assert.equal(audit.verifyTenant({ tenant_id: "tenant-a" }), true);
  store.close();
});

test("durable audit store hash-chain evidence detects tampered export rows", () => {
  const store = createStore();
  const audit = createDurableAuditStore({ store });
  audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-a-001",
    actor_id: "user-a",
    action: "cmp.write",
    object_type: "Matter",
    object_id: "matter-001",
    decision: "allow",
    reason: "test",
  });
  audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-a-002",
    actor_id: "user-a",
    action: "cmp.write",
    object_type: "Matter",
    object_id: "matter-002",
    decision: "allow",
    reason: "test",
  });

  const tampered = audit.exportTenant({ tenant_id: "tenant-a" }).events.map((event) => ({ ...event }));
  tampered[1].reason = "tampered";
  assert.equal(verifyHrxAuditHashChain(tampered), false);
  store.close();
});
