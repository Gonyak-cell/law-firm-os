import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProductionRepository,
  assertRuntimeSeedAllowed,
  createMemoryRepository,
  createMigrationRunner,
  enqueueOutboxEvent,
  runUnitOfWork,
} from "../src/index.js";

test("Matter-Vault unit of work rolls back repository writes when later work fails", () => {
  const repository = createMemoryRepository({ name: "matter-vault-test" });
  assert.throws(
    () =>
      runUnitOfWork({
        repositories: [repository],
        work: () => {
          repository.create({ resource_id: "matter-vault-link-1", ok: true });
          throw new Error("rollback");
        },
      }),
    /rollback/,
  );
  assert.equal(repository.list().length, 0);
});

test("Matter-Vault migration, outbox, production repository, and seed guards are explicit", () => {
  let migrated = false;
  const runner = createMigrationRunner({
    migrations: [{ id: "001_matter_vault_core", up: () => { migrated = true; }, down: () => {} }],
  });
  assert.deepEqual(runner.run().executed, ["001_matter_vault_core"]);
  assert.equal(migrated, true);

  const outbox = createMemoryRepository({ name: "outbox" });
  const event = enqueueOutboxEvent({
    repository: outbox,
    event: {
      event_id: "outbox-mv-1",
      tenant_id: "tenant-mv",
      event_type: "matter.vault_link.created",
      aggregate_id: "matter-mv",
    },
  });
  assert.equal(event.status, "pending");
  assert.throws(() => assertProductionRepository(new Map()), /durable repository|Map repository/);
  assert.throws(() => assertRuntimeSeedAllowed({ mode: "test", production: true }), /seed mode/);
});
