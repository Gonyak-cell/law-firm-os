import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createPersistenceConnection } from "../src/index.js";

test("Runtime Spine synthetic connection persists tenant base rows across reopen", () => {
  const root = mkdtempSync(join(tmpdir(), "lawos-rs1a-"));
  const url = `lawos-synthetic://runtime-spine?root=${encodeURIComponent(root)}`;
  const first = createPersistenceConnection({ url });
  first.insert("runtime_tenants", {
    tenant_id: "tenant-a",
    name: "Tenant A",
    region: "synthetic-us",
    edition: "synthetic-internal"
  });
  first.close();

  const reopened = createPersistenceConnection({ url });
  const tenants = reopened.select("runtime_tenants", { tenant_id: "tenant-a" });
  assert.equal(tenants.length, 1);
  assert.equal(tenants[0].name, "Tenant A");
  assert.equal(existsSync(join(root, "persistence-store.json")), true);
  reopened.close();
});

test("Runtime Spine transaction rolls back partial synthetic writes", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  assert.throws(
    () =>
      connection.transaction((tx) => {
        tx.insert("runtime_tenants", { tenant_id: "tenant-a", name: "Tenant A" });
        throw new Error("boom");
      }),
    /boom/,
  );
  assert.equal(connection.select("runtime_tenants", { tenant_id: "tenant-a" }).length, 0);
  connection.close();
});

test("Runtime Spine tenant schema rejects malformed tenant rows", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  assert.throws(() => connection.insert("runtime_tenants", { tenant_id: "", name: "Tenant A" }), /tenant_id/);
  assert.throws(() => connection.insert("runtime_tenants", { tenant_id: "tenant-a", name: "" }), /tenant name/);
  assert.throws(
    () => connection.insert("runtime_tenants", { tenant_id: "tenant-a", name: "Tenant A", status: "bad" }),
    /invalid tenant status/,
  );
  connection.close();
});
