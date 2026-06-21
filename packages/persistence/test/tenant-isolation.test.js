import assert from "node:assert/strict";
import test from "node:test";
import {
  appendOutboxEvent,
  createIdempotencyService,
  createPersistenceBackup,
  createPersistenceConnection,
  createStableRuntimeId,
  createTenantScopedRepository,
  listPendingOutboxEvents
} from "../src/index.js";

test("Tenant isolation suite blocks repository, idempotency, outbox, and backup leakage", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  const repository = createTenantScopedRepository({ connection, objectType: "Client" });
  const tenantAClient = createStableRuntimeId({ type: "client", tenantId: "tenant-a", seed: "client-a" });
  const tenantBClient = createStableRuntimeId({ type: "client", tenantId: "tenant-b", seed: "client-b" });
  repository.create({ tenant_id: "tenant-a", record_id: tenantAClient, payload: { name: "Tenant A Client" } });
  repository.create({ tenant_id: "tenant-b", record_id: tenantBClient, payload: { name: "Tenant B Client" } });

  assert.equal(repository.get({ tenant_id: "tenant-b", record_id: tenantAClient }), undefined);
  assert.equal(repository.list({ tenant_id: "tenant-a" }).length, 1);
  assert.equal(repository.list({ tenant_id: "tenant-b" }).length, 1);

  const idempotency = createIdempotencyService(connection);
  idempotency.record({ tenant_id: "tenant-a", key: "shared-key", request: { tenant: "a" }, result_ref: tenantAClient });
  idempotency.record({ tenant_id: "tenant-b", key: "shared-key", request: { tenant: "b" }, result_ref: tenantBClient });
  assert.throws(
    () => idempotency.record({ tenant_id: "tenant-a", key: "shared-key", request: { tenant: "changed" }, result_ref: "bad" }),
    /different request hash/,
  );

  appendOutboxEvent(connection, {
    tenant_id: "tenant-a",
    event_id: createStableRuntimeId({ type: "outbox", tenantId: "tenant-a", seed: "outbox-a" }),
    topic: "client.created",
    payload: { record_id: tenantAClient }
  });
  appendOutboxEvent(connection, {
    tenant_id: "tenant-b",
    event_id: createStableRuntimeId({ type: "outbox", tenantId: "tenant-b", seed: "outbox-b" }),
    topic: "client.created",
    payload: { record_id: tenantBClient }
  });
  assert.equal(listPendingOutboxEvents(connection, { tenant_id: "tenant-a" }).length, 1);
  assert.equal(listPendingOutboxEvents(connection, { tenant_id: "tenant-b" }).length, 1);

  const tenantABackup = createPersistenceBackup(connection, { tenant_id: "tenant-a" });
  assert.equal(tenantABackup.tables.runtime_records.some((record) => record.tenant_id === "tenant-b"), false);
  assert.equal(tenantABackup.tables.runtime_outbox_events.some((event) => event.tenant_id === "tenant-b"), false);
  connection.close();
});
