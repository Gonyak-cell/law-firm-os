import assert from "node:assert/strict";
import test from "node:test";

import {
  executeProductionMigrationCatalogReadback,
  validateProductionMigrationCatalogReadbackEvent,
} from "../src/production-migration-catalog-readback.js";
import {
  NOW,
  signedEvent,
} from "./production-migration-catalog-readback-fixtures.mjs";

function validate(fixture) {
  return validateProductionMigrationCatalogReadbackEvent({ ...fixture, now: NOW });
}

function execute(fixture, overrides = {}) {
  return executeProductionMigrationCatalogReadback({
    ...fixture,
    now: NOW,
    ...overrides,
  });
}

test("the current runtime-safety receipt binds the exact catalog packet", () => {
  const fixture = signedEvent();
  const result = validate(fixture);

  assert.equal(result.approval.valid, true);
  assert.equal(result.approval.decision, "approved");
  assert.equal(result.approval.packet_sha256, result.packet_sha256);
  assert.equal(result.approval.registry_sha256, fixture.env.LAWOS_OWNER_TRUST_REGISTRY_SHA256);
  assert.equal(Date.parse(result.approval.expires_at) > NOW, true);
});

test("a different self-signed registry cannot replace the caller-bound registry", async () => {
  const fixture = signedEvent();
  const foreign = signedEvent();
  fixture.event.authorization = foreign.event.authorization;
  let secretReads = 0;
  let poolCreates = 0;

  await assert.rejects(
    execute(fixture, {
      resolveSecret: async () => { secretReads += 1; },
      createPool: () => { poolCreates += 1; },
    }),
    (error) => error?.code === "LAWOS_CATALOG_READBACK_APPROVAL_ROOT",
  );
  assert.equal(secretReads, 0);
  assert.equal(poolCreates, 0);
});

test("a rejected or scope-drifted receipt fails before any secret or database access", async (t) => {
  for (const [name, mutateReceipt] of [
    ["rejected", (receipt) => ({ ...receipt, decision: "rejected" })],
    ["data scope", (receipt) => ({ ...receipt, data_scope: [] })],
  ]) {
    await t.test(name, async () => {
      const fixture = signedEvent({ mutateReceipt });
      let secretReads = 0;
      let poolCreates = 0;
      await assert.rejects(
        execute(fixture, {
          resolveSecret: async () => { secretReads += 1; },
          createPool: () => { poolCreates += 1; },
        }),
        (error) => error?.code === "LAWOS_CATALOG_READBACK_APPROVAL",
      );
      assert.equal(secretReads, 0);
      assert.equal(poolCreates, 0);
    });
  }
});
