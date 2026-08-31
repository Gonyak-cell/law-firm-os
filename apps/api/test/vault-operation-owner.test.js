import assert from "node:assert/strict";
import test from "node:test";

import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import {
  VaultOperationOwnerError,
  createVaultOperationOwner,
} from "../src/vault-operation-owner.js";

const TENANT = "tenant_vault_operation_owner";
const OPERATION_ID = `vaultop_${"a".repeat(32)}`;
const FINGERPRINT = "b".repeat(64);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

test("identical concurrent callers share one in-process operation result", async () => {
  const owner = createVaultOperationOwner();
  const gate = deferred();
  let calls = 0;
  const input = {
    tenantId: TENANT,
    operationId: OPERATION_ID,
    requestFingerprint: FINGERPRINT,
    operation: async () => {
      calls += 1;
      await gate.promise;
      return Object.freeze({ outcome: "readback_verified" });
    },
  };

  const first = owner.run(input);
  const second = owner.run(input);
  assert.equal(owner.inFlightCountForTest(), 1);
  gate.resolve();

  assert.strictEqual(await first, await second);
  assert.equal(calls, 1);
  assert.equal(owner.inFlightCountForTest(), 0);
});

test("changed bytes conflict while the canonical operation is in flight", async () => {
  const owner = createVaultOperationOwner();
  const gate = deferred();
  const first = owner.run({
    tenantId: TENANT,
    operationId: OPERATION_ID,
    requestFingerprint: FINGERPRINT,
    operation: () => gate.promise,
  });

  assert.throws(
    () => owner.run({
      tenantId: TENANT,
      operationId: OPERATION_ID,
      requestFingerprint: "c".repeat(64),
      operation: async () => "must-not-run",
    }),
    (error) => error instanceof VaultOperationOwnerError
      && error.safe_error_code === "VAULT_OPERATION_IDEMPOTENCY_CONFLICT",
  );
  gate.resolve("completed");
  assert.equal(await first, "completed");
});

test("a second API process fails closed during the lease and a later lease recovers", async () => {
  const repository = createDmsRepository();
  let timestamp = 1_100;
  const now = () => timestamp;
  const firstOwner = createVaultOperationOwner({ repository, now, leaseMs: 1_000 });
  const secondOwner = createVaultOperationOwner({ repository, now, leaseMs: 1_000 });
  const gate = deferred();
  const first = firstOwner.run({
    tenantId: TENANT,
    operationId: OPERATION_ID,
    requestFingerprint: FINGERPRINT,
    operation: () => gate.promise,
  });
  while (repository.snapshot().idempotency.length === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }

  await assert.rejects(
    secondOwner.run({
      tenantId: TENANT,
      operationId: OPERATION_ID,
      requestFingerprint: FINGERPRINT,
      operation: async () => "must-not-run",
    }),
    (error) => error instanceof VaultOperationOwnerError
      && error.safe_error_code === "VAULT_OPERATION_IN_PROGRESS"
      && error.retryable === true,
  );
  gate.reject(new Error("simulated owner process loss"));
  await assert.rejects(first, /simulated owner process loss/u);

  timestamp = 2_100;
  const recovered = await secondOwner.run({
    tenantId: TENANT,
    operationId: OPERATION_ID,
    requestFingerprint: FINGERPRINT,
    operation: async () => "recovered",
  });
  assert.equal(recovered, "recovered");
  assert.equal(repository.snapshot().idempotency.length, 2);
});

test("persistent owner claims normalize repository hash conflicts", async () => {
  const repository = createDmsRepository();
  const owner = createVaultOperationOwner({ repository, now: () => 1_100, leaseMs: 1_000 });
  await owner.run({
    tenantId: TENANT,
    operationId: OPERATION_ID,
    requestFingerprint: FINGERPRINT,
    operation: async () => "first",
  });

  await assert.rejects(
    owner.run({
      tenantId: TENANT,
      operationId: OPERATION_ID,
      requestFingerprint: "d".repeat(64),
      operation: async () => "must-not-run",
    }),
    (error) => error instanceof VaultOperationOwnerError
      && error.safe_error_code === "VAULT_OPERATION_IDEMPOTENCY_CONFLICT",
  );
});
