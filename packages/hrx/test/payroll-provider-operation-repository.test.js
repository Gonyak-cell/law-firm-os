import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollRepository } from "../src/payroll/repository.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const NOW = "2026-07-15T06:30:00.000Z";
const REQUEST_HASH = "a".repeat(64);

function repositoryFor(filePath) {
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  return {
    store,
    repository: createPayrollRepository({ store, clock: () => NOW }),
  };
}

function request(overrides = {}) {
  return {
    provider_kind: "filing",
    operation: "filing.withholding",
    idempotency_key: "filing-job-001:package-001",
    request_hash: REQUEST_HASH,
    maximum_attempts: 3,
    ...overrides,
  };
}

test("PEO-TUW-068 provider operations survive repository reopen and bind a key to one payload", () => {
  const directory = mkdtempSync(join(tmpdir(), "lawos-provider-operation-"));
  const filePath = join(directory, "hrx-store.json");
  try {
    const firstRuntime = repositoryFor(filePath);
    const context = { tenant_id: "tenant-provider-a", actor_id: "payroll-operator" };
    const begun = firstRuntime.repository.beginProviderOperation(context, request());
    assert.deepEqual(
      [begun.should_execute, begun.operation.state, begun.operation.attempt_count],
      [true, "in_progress", 1],
    );
    const completed = firstRuntime.repository.completeProviderOperation(context, {
      provider_kind: "filing",
      idempotency_key: request().idempotency_key,
      state: "succeeded",
      provider_receipt_id: "filing-receipt-001",
      provider_receipt_ref: "provider:filing/receipt-001",
      expected_version: begun.operation.state_version,
    });
    assert.equal(completed.operation.state, "succeeded");
    firstRuntime.store.close();

    const reopenedRuntime = repositoryFor(filePath);
    const replay = reopenedRuntime.repository.beginProviderOperation(context, request());
    assert.deepEqual(
      [replay.should_execute, replay.idempotent_replay, replay.operation.attempt_count],
      [false, true, 1],
    );
    assert.throws(
      () => reopenedRuntime.repository.beginProviderOperation(context, request({
        request_hash: "b".repeat(64),
      })),
      (error) => error.safe_error_code === "HRX_PROVIDER_IDEMPOTENCY_CONFLICT",
    );
    assert.equal(
      reopenedRuntime.repository.listProviderOperations(context).length,
      1,
    );
    reopenedRuntime.store.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("PEO-TUW-068 persists retry attempts, replays pending rows, and reaches the maximum", () => {
  const { store, repository } = repositoryFor();
  const context = { tenant_id: "tenant-provider-retry", actor_id: "payroll-operator" };
  const retryRequest = request({ idempotency_key: "filing-job-retry:package-001" });

  let attempt = repository.beginProviderOperation(context, retryRequest);
  let result = repository.completeProviderOperation(context, {
    provider_kind: retryRequest.provider_kind,
    idempotency_key: retryRequest.idempotency_key,
    state: "failed",
    provider_receipt_id: "filing-failure-001",
    safe_error_code: "FILING_REJECTED",
    expected_version: attempt.operation.state_version,
  });
  assert.deepEqual([result.operation.state, result.operation.attempt_count], ["failed", 1]);

  attempt = repository.beginProviderOperation(context, retryRequest);
  result = repository.completeProviderOperation(context, {
    provider_kind: retryRequest.provider_kind,
    idempotency_key: retryRequest.idempotency_key,
    state: "unknown",
    safe_error_code: "PROVIDER_RESULT_UNKNOWN",
    expected_version: attempt.operation.state_version,
  });
  assert.deepEqual([result.operation.state, result.operation.attempt_count], ["unknown", 2]);

  attempt = repository.beginProviderOperation(context, retryRequest);
  result = repository.completeProviderOperation(context, {
    provider_kind: retryRequest.provider_kind,
    idempotency_key: retryRequest.idempotency_key,
    state: "failed",
    provider_receipt_id: "filing-failure-003",
    safe_error_code: "FILING_REJECTED",
    expected_version: attempt.operation.state_version,
  });
  assert.deepEqual([result.operation.state, result.operation.attempt_count], ["failed", 3]);
  assert.throws(
    () => repository.beginProviderOperation(context, retryRequest),
    (error) => error.safe_error_code === "HRX_PROVIDER_RETRY_LIMIT_EXCEEDED",
  );

  const pendingRequest = request({ idempotency_key: "filing-job-pending:package-001" });
  const pendingAttempt = repository.beginProviderOperation(context, pendingRequest);
  repository.completeProviderOperation(context, {
    provider_kind: pendingRequest.provider_kind,
    idempotency_key: pendingRequest.idempotency_key,
    state: "pending",
    provider_receipt_id: "filing-pending-001",
    expected_version: pendingAttempt.operation.state_version,
  });
  const pendingReplay = repository.beginProviderOperation(context, pendingRequest);
  assert.deepEqual(
    [pendingReplay.should_execute, pendingReplay.operation.state, pendingReplay.operation.attempt_count],
    [false, "pending", 1],
  );
  store.close();
});

test("PEO-TUW-069 provider receipt uniqueness is tenant scoped", () => {
  const { store, repository } = repositoryFor();
  const sharedReceiptId = "provider-receipt-shared";
  const sharedReceiptRef = "provider:filing/shared";
  for (const tenantId of ["tenant-provider-a", "tenant-provider-b"]) {
    const context = { tenant_id: tenantId, actor_id: "payroll-operator" };
    const scopedRequest = request({ idempotency_key: "same-key-across-tenants" });
    const begun = repository.beginProviderOperation(context, scopedRequest);
    repository.completeProviderOperation(context, {
      provider_kind: scopedRequest.provider_kind,
      idempotency_key: scopedRequest.idempotency_key,
      state: "succeeded",
      provider_receipt_id: sharedReceiptId,
      provider_receipt_ref: sharedReceiptRef,
      expected_version: begun.operation.state_version,
    });
    assert.equal(repository.listProviderOperations(context).length, 1);
  }

  const context = { tenant_id: "tenant-provider-a", actor_id: "payroll-operator" };
  const duplicateRequest = request({ idempotency_key: "different-key-same-tenant" });
  const duplicate = repository.beginProviderOperation(context, duplicateRequest);
  assert.throws(
    () => repository.completeProviderOperation(context, {
      provider_kind: duplicateRequest.provider_kind,
      idempotency_key: duplicateRequest.idempotency_key,
      state: "succeeded",
      provider_receipt_id: sharedReceiptId,
      provider_receipt_ref: sharedReceiptRef,
      expected_version: duplicate.operation.state_version,
    }),
    (error) => error.safe_error_code === "HRX_PROVIDER_RECEIPT_DUPLICATE",
  );
  store.close();
});
