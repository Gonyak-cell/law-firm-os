import assert from "node:assert/strict";
import test from "node:test";
import {
  appendOutboxEvent,
  createIdempotencyService,
  createPersistenceConnection,
  createStableRuntimeId,
  createTenantScopedRepository,
  listPendingOutboxEvents,
  runPersistenceTransaction
} from "../src/index.js";

test("Idempotency service replays duplicate requests and rejects changed payloads", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  const idempotency = createIdempotencyService(connection);

  const first = idempotency.record({
    tenant_id: "tenant-a",
    key: "request-001",
    request: { action: "create-client", name: "Client A" },
    result_ref: "cli_001"
  });
  const replay = idempotency.record({
    tenant_id: "tenant-a",
    key: "request-001",
    request: { action: "create-client", name: "Client A" },
    result_ref: "cli_001"
  });

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.throws(
    () =>
      idempotency.record({
        tenant_id: "tenant-a",
        key: "request-001",
        request: { action: "create-client", name: "Changed" },
        result_ref: "cli_002"
      }),
    /different request hash/,
  );
  connection.close();
});

test("Transaction utility rolls back repository and outbox writes atomically", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  const record_id = createStableRuntimeId({ type: "client", tenantId: "tenant-a", seed: "client-atomic" });
  const event_id = createStableRuntimeId({ type: "outbox", tenantId: "tenant-a", seed: "event-atomic" });

  assert.throws(
    () =>
      runPersistenceTransaction(connection, (tx) => {
        const repository = createTenantScopedRepository({ connection: tx, objectType: "Client" });
        repository.create({ tenant_id: "tenant-a", record_id, payload: { name: "Atomic Client" } });
        appendOutboxEvent(tx, {
          tenant_id: "tenant-a",
          event_id,
          topic: "client.created",
          payload: { record_id }
        });
        throw new Error("rollback");
      }),
    /rollback/,
  );

  assert.equal(createTenantScopedRepository({ connection, objectType: "Client" }).list({ tenant_id: "tenant-a" }).length, 0);
  assert.equal(listPendingOutboxEvents(connection, { tenant_id: "tenant-a" }).length, 0);
  connection.close();
});

test("Outbox appends tenant-scoped pending events", () => {
  const connection = createPersistenceConnection({ url: "lawos-synthetic://runtime-spine?root=" });
  appendOutboxEvent(connection, {
    tenant_id: "tenant-a",
    event_id: createStableRuntimeId({ type: "outbox", tenantId: "tenant-a", seed: "event-001" }),
    topic: "matter.created",
    payload: { matter_id: "mat_001" }
  });
  assert.equal(listPendingOutboxEvents(connection, { tenant_id: "tenant-a" }).length, 1);
  assert.equal(listPendingOutboxEvents(connection, { tenant_id: "tenant-b" }).length, 0);
  assert.throws(() => listPendingOutboxEvents(connection, {}), /tenant_id is required/);
  connection.close();
});
