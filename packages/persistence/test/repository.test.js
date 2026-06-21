import assert from "node:assert/strict";
import test from "node:test";
import { createPersistenceConnection, createStableRuntimeId, createTenantScopedRepository } from "../src/index.js";

test("Tenant-scoped repository requires tenant_id and prevents cross-tenant reads", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  const repository = createTenantScopedRepository({ connection, objectType: "Client" });
  const record_id = createStableRuntimeId({ type: "client", tenantId: "tenant-a", seed: "client-001" });

  repository.create({ tenant_id: "tenant-a", record_id, payload: { name: "Client A" } });

  assert.equal(repository.get({ tenant_id: "tenant-a", record_id }).payload.name, "Client A");
  assert.equal(repository.get({ tenant_id: "tenant-b", record_id }), undefined);
  assert.throws(() => repository.list({}), /tenant_id is required/);
  connection.close();
});

test("Tenant-scoped repository updates preserve tenant and lifecycle hides deleted rows", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  const repository = createTenantScopedRepository({ connection, objectType: "Matter" });
  const record_id = createStableRuntimeId({ type: "matter", tenantId: "tenant-a", seed: "matter-001" });

  repository.create({ tenant_id: "tenant-a", record_id, payload: { name: "Matter A" } });
  repository.update({ tenant_id: "tenant-a", record_id, patch: { status_label: "open" } });
  assert.equal(repository.get({ tenant_id: "tenant-a", record_id }).payload.status_label, "open");

  const archived = repository.archive({ tenant_id: "tenant-a", record_id, archived_at: "2026-06-21T00:00:00.000Z" });
  assert.equal(archived.status, "archived");
  assert.equal(repository.list({ tenant_id: "tenant-a", includeArchived: false }).length, 0);

  const deleted = repository.softDelete({ tenant_id: "tenant-a", record_id, deleted_at: "2026-06-21T00:01:00.000Z" });
  assert.equal(deleted.status, "deleted");
  assert.equal(repository.get({ tenant_id: "tenant-a", record_id }), undefined);
  assert.equal(repository.get({ tenant_id: "tenant-a", record_id, includeDeleted: true }).deleted_at, "2026-06-21T00:01:00.000Z");
  connection.close();
});
