import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import {
  createPayrollPaymentReconciliationScope,
  createPayrollPaymentService,
} from "../src/payroll/payment-service.js";
import { createPayrollDataHash, createPayrollRepository } from "../src/payroll/repository.js";
import { createPayrollStepUpReceipt } from "../src/payroll/run-service.js";
import { HRX_PROVIDER_RECEIPT_SCHEMA_VERSION } from "../src/provider-receipt-contract.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-payroll-payment";
const NOW = "2026-07-15T05:00:00.000Z";
const PREPARER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-preparer" });
const PAYROLL_APPROVER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-approver" });
const PAYMENT_APPROVER = Object.freeze({ tenant_id: TENANT, actor_id: "payment-approver" });
const HASH = "b".repeat(64);

function runtime({
  filePath,
  faultInjector,
  clock = () => NOW,
  reconciliationLeaseMs,
} = {}) {
  const store = createFileHrxStore({ ...(filePath ? { filePath } : {}) });
  runHrxMigrations(store);
  const hr = createSqlHrxRepository({ store, clock });
  for (const [employee_id, display_name] of [["emp-001", "Employee One"], ["emp-002", "Employee Two"]]) hr.createEmployee({ tenant_id: TENANT, employee_id, display_name, status: "active" });
  let sequence = 0;
  const repository = createPayrollRepository({
    store,
    clock,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    ...(faultInjector ? { faultInjector } : {}),
  });
  let period = repository.createPeriod(PREPARER, { period_id: "period-payment", period_code: "2026-07", period_start: "2026-07-01", period_end: "2026-07-31", cutoff_at: NOW, pay_date: "2026-08-05" });
  period = repository.transitionPeriod(PREPARER, { period_id: period.period_id, status: "open", expected_version: period.state_version });
  let run = repository.createRun(PREPARER, { run_id: "run-payment", period_id: period.period_id });
  for (const [index, employeeId] of ["emp-001", "emp-002"].entries()) {
    const snapshot = repository.createInputSnapshot(PREPARER, { snapshot_id: `snapshot-${index}`, run_id: run.run_id, employee_id: employeeId, source_refs: [{ kind: "attendance", ref: `artifact:attendance/${employeeId}`, hash: HASH }] });
    const gross = 4_000_000 + index * 1_000_000;
    const deduction = 500_000 + index * 100_000;
    repository.createEmployeeResult(PREPARER, { run_id: run.run_id, employee_id: employeeId, input_snapshot_id: snapshot.snapshot_id, gross_krw: gross, deduction_krw: deduction, net_krw: gross - deduction });
  }
  run = repository.transitionRun(PREPARER, { run_id: run.run_id, status: "snapshot_ready", snapshot_hash: createPayrollDataHash(repository.getRunBundle(PREPARER, { run_id: run.run_id }).snapshots), expected_version: run.state_version });
  run = repository.transitionRun(PREPARER, { run_id: run.run_id, status: "previewed", result_hash: createPayrollDataHash(repository.getRunBundle(PREPARER, { run_id: run.run_id }).results), expected_version: run.state_version });
  run = repository.transitionRun(PAYROLL_APPROVER, { run_id: run.run_id, status: "approved", expected_version: run.state_version, step_up_receipt_ref: "artifact:step-up/payroll-payment-run", step_up_receipt_hash: HASH });
  run = repository.transitionRun(PAYROLL_APPROVER, { run_id: run.run_id, status: "closed", expected_version: run.state_version });
  const accounts = new Map([
    ["emp-001", { tokenized_account_ref: "token:bank/emp-001", bank_code: "001", account_number: "110000000001", account_holder: "Employee One" }],
    ["emp-002", { tokenized_account_ref: "token:bank/emp-002", bank_code: "002", account_number: "110000000002", account_holder: "Employee Two" }],
  ]);
  const accountResolver = { resolve: ({ employee_id }) => accounts.get(employee_id) };
  return {
    store,
    repository,
    run,
    accounts,
    service: createPayrollPaymentService({
      repository,
      accountResolver,
      clock,
      ...(reconciliationLeaseMs ? { reconciliationLeaseMs } : {}),
    }),
  };
}

function reopenedPaymentRuntime(filePath, accounts, {
  clock = () => NOW,
  reconciliationLeaseMs,
} = {}) {
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  const repository = createPayrollRepository({ store, clock });
  const accountResolver = { resolve: ({ employee_id }) => accounts.get(employee_id) };
  return {
    store,
    repository,
    service: createPayrollPaymentService({
      repository,
      accountResolver,
      clock,
      ...(reconciliationLeaseMs ? { reconciliationLeaseMs } : {}),
    }),
  };
}

function stepUp(batchId, actor = PAYMENT_APPROVER.actor_id) {
  return createPayrollStepUpReceipt({ receipt_ref: `artifact:step-up/payment/${batchId}`, actor_id: actor, action: "payroll.payment.approve", object_id: batchId, issued_at: NOW, expires_at: "2026-07-15T05:05:00.000Z" });
}

function bankReceipt(batchId, scope, state = "succeeded") {
  const receiptSuffix = Buffer.from(scope.idempotency_key, "utf8").toString("base64url");
  return {
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: `bank-receipt-${receiptSuffix}`,
    tenant_id: TENANT,
    provider_kind: "bank",
    provider_id: "synthetic-bank-sandbox",
    operation: "bulk_transfer_reconcile",
    idempotency_key: scope.idempotency_key,
    payload_hash: scope.payload_hash,
    state,
    requested_at: NOW,
    completed_at: state === "pending" ? null : NOW,
    provider_receipt_ref: state === "succeeded" ? `provider:sandbox/bank/${receiptSuffix}` : null,
    error_code: state === "failed" ? "BANK_REJECTED" : null,
  };
}

function prepareBoundaryFixture(results) {
  const batches = [];
  const items = [];
  const repository = {
    getRunBundle: () => ({ run: { run_id: "run-boundary", run_type: "adjustment", status: "closed" }, results }),
    listPaymentBatches: () => batches,
    createPaymentBatch: (_context, input) => {
      const batch = {
        payment_batch_id: `payment-${batches.length + 1}`,
        run_id: input.run_id,
        bank_format_code: input.bank_format_code,
        checksum: input.checksum,
        state: "draft",
        state_version: 1,
      };
      batches.push(batch);
      return batch;
    },
    addPaymentItem: (_context, input) => {
      const item = { payment_item_id: `item-${items.length + 1}`, state_version: 1, state: "pending", ...input };
      items.push(item);
      return item;
    },
    getPaymentBatch: (_context, input) => batches.find((batch) => batch.payment_batch_id === input.payment_batch_id),
    listPaymentItems: (_context, input) => items.filter((item) => item.payment_batch_id === input.payment_batch_id),
  };
  const accountResolver = {
    resolve: ({ employee_id }) => ({
      tokenized_account_ref: `token:bank/${employee_id}`,
      bank_code: "001",
      account_number: "110000000001",
      account_holder: "Synthetic Employee",
    }),
  };
  const service = createPayrollPaymentService({ repository, accountResolver, clock: () => NOW });
  return { repository, service, batches, items };
}

test("PY-BANK-001 creates an encrypted deterministic bank batch while persisting only tokenized accounts", () => {
  const { store, repository, run, service } = runtime();
  const prepared = service.prepare(PREPARER, { run_id: run.run_id });
  assert.equal(prepared.items.length, 2);
  assert.equal(service.prepare(PREPARER, { run_id: run.run_id }).batch.payment_batch_id, prepared.batch.payment_batch_id);
  assert.deepEqual(prepared.items.map((row) => row.tokenized_account_ref), ["token:bank/emp-001", "token:bank/emp-002"]);
  const serialized = JSON.stringify({ batches: repository.listPaymentBatches(PREPARER), items: repository.listPaymentItems(PREPARER), audit: repository.listAuditEvents(PREPARER), outbox: repository.listOutboxEvents(PREPARER) });
  assert.doesNotMatch(serialized, /11000000000[12]|Employee One|Employee Two/);
  store.close();
});

test("PEO-FIX-063-C blocks negative payroll payment preparation without a partial batch", () => {
  const negative = prepareBoundaryFixture([{ employee_id: "emp-negative", gross_krw: 0, deduction_krw: 100, net_krw: -100 }]);
  assert.throws(
    () => negative.service.prepare(PREPARER, { run_id: "run-boundary" }),
    (error) => error.safe_error_code === "HRX_PAYROLL_RECOVERY_WORKFLOW_REQUIRED",
  );
  assert.equal(negative.batches.length, 0);
  assert.equal(negative.items.length, 0);

  const zero = prepareBoundaryFixture([{ employee_id: "emp-zero", gross_krw: 0, deduction_krw: 0, net_krw: 0 }]);
  assert.throws(
    () => zero.service.prepare(PREPARER, { run_id: "run-boundary" }),
    (error) => error.safe_error_code === "HRX_PAYROLL_NO_PAYABLE_ITEMS",
  );
  assert.equal(zero.batches.length, 0);
  assert.equal(zero.items.length, 0);
});

test("PEO-FIX-063-C keeps positive adjustment deltas payable and excludes zero payouts", () => {
  const value = prepareBoundaryFixture([
    { employee_id: "emp-positive", gross_krw: 100_000, deduction_krw: 0, net_krw: 100_000 },
    { employee_id: "emp-zero", gross_krw: 0, deduction_krw: 0, net_krw: 0 },
  ]);
  const prepared = value.service.prepare(PREPARER, { run_id: "run-boundary" });
  assert.equal(prepared.items.length, 1);
  assert.equal(prepared.items[0].employee_id, "emp-positive");
  assert.equal(prepared.items[0].amount_krw, 100_000);
  assert.equal(value.batches.length, 1);
  assert.equal(value.items.length, 1);
});

test("PY-BANK-002 enforces payment four-eyes, payroll/payment approver separation, step-up, and checksum integrity", async () => {
  const { store, repository, run, accounts, service } = runtime();
  const prepared = service.prepare(PREPARER, { run_id: run.run_id });
  assert.throws(() => service.approve(PREPARER, { payment_batch_id: prepared.batch.payment_batch_id, step_up_receipt: stepUp(prepared.batch.payment_batch_id, PREPARER.actor_id) }), (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL");
  assert.throws(() => service.approve(PAYROLL_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, step_up_receipt: stepUp(prepared.batch.payment_batch_id, PAYROLL_APPROVER.actor_id) }), (error) => error.safe_error_code === "HRX_PAYROLL_PAYMENT_APPROVER_SEPARATION");
  const approved = service.approve(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, step_up_receipt: stepUp(prepared.batch.payment_batch_id) });
  assert.equal(approved.batch.state, "approved");
  accounts.set("emp-001", { ...accounts.get("emp-001"), account_number: "999999999999" });
  await assert.rejects(service.exportBatch(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id }), (error) => error.safe_error_code === "HRX_PAYROLL_PAYMENT_TAMPERED");
  assert.equal(repository.getPaymentBatch(PREPARER, { payment_batch_id: prepared.batch.payment_batch_id }).state, "approved");
  store.close();
});

test("PY-BANK-002/003 exports after separate approval and records paid/failed outcomes only with a successful bank receipt", async () => {
  const { store, repository, run, service } = runtime();
  const prepared = service.prepare(PREPARER, { run_id: run.run_id });
  service.approve(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, step_up_receipt: stepUp(prepared.batch.payment_batch_id) });
  const exported = await service.exportBatch(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id });
  assert.equal(exported.batch.state, "exported");
  assert.deepEqual(
    [/^(?:artifact|document|vault):/.test(exported.artifact_ref), exported.artifact_hash, exported.byte_size > 0, exported.mime_type],
    [true, exported.batch.checksum, true, "text/csv;charset=utf-8"],
  );
  const exportedJson = JSON.stringify(exported);
  assert.equal("content_base64" in exported, false);
  assert.doesNotMatch(exportedJson, /account_number|bank_code|account_holder|110000000001|110000000002|Employee One|Employee Two/);
  const scope = createPayrollPaymentReconciliationScope({ batch: exported.batch, items: exported.items });
  assert.throws(() => service.reconcile(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, provider_receipt: bankReceipt(prepared.batch.payment_batch_id, scope, "pending"), items: [] }), (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_RECEIPT_REQUIRED");
  assert.throws(() => service.reconcile(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, provider_receipt: bankReceipt(prepared.batch.payment_batch_id, scope), reported_item_count: 2, reported_paid_total_krw: 1, items: [
    { employee_id: "emp-001", state: "paid", provider_receipt_ref: "provider:sandbox/bank/item-1" },
    { employee_id: "emp-002", state: "failed", safe_error_code: "BANK_REJECTED" },
  ] }), (error) => error.safe_error_code === "HRX_PAYROLL_PAYMENT_TOTAL_MISMATCH");
  assert.ok(repository.listPaymentItems(PREPARER, { payment_batch_id: prepared.batch.payment_batch_id }).every((row) => row.state === "exported"));
  const reconciled = service.reconcile(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, provider_receipt: bankReceipt(prepared.batch.payment_batch_id, scope), reported_item_count: 2, reported_paid_total_krw: 3_500_000, items: [
    { employee_id: "emp-001", state: "paid", provider_receipt_ref: "provider:sandbox/bank/item-1" },
    { employee_id: "emp-002", state: "failed", safe_error_code: "BANK_REJECTED" },
  ] });
  assert.deepEqual(
    [reconciled.batch.state, reconciled.reconciliation_state, reconciled.paid_total_krw, reconciled.failed_count, reconciled.unknown_count],
    ["reconciled", "partial_success", 3_500_000, 1, 0],
  );
  assert.deepEqual(repository.listOutboxEvents(PREPARER, { run_id: run.run_id }).filter((row) => row.event_type.startsWith("payroll.payment.")).map((row) => row.event_type), ["payroll.payment.exported", "payroll.payment.reconciled"]);
  store.close();
});

test("PEO-TUW-069 retries failed or unknown payment items only and never pays a successful item twice", async () => {
  const { store, repository, run, service } = runtime();
  const prepared = service.prepare(PREPARER, { run_id: run.run_id });
  service.approve(PAYMENT_APPROVER, {
    payment_batch_id: prepared.batch.payment_batch_id,
    step_up_receipt: stepUp(prepared.batch.payment_batch_id),
  });
  const exported = await service.exportBatch(PAYMENT_APPROVER, {
    payment_batch_id: prepared.batch.payment_batch_id,
  });
  const initialScope = createPayrollPaymentReconciliationScope({
    batch: exported.batch,
    items: exported.items,
  });
  const partial = service.reconcile(PAYMENT_APPROVER, {
    payment_batch_id: exported.batch.payment_batch_id,
    provider_receipt: bankReceipt(exported.batch.payment_batch_id, initialScope),
    reported_item_count: 2,
    reported_paid_total_krw: 3_500_000,
    items: [
      { employee_id: "emp-001", state: "paid", provider_receipt_ref: "provider:sandbox/bank/item-1" },
      { employee_id: "emp-002", state: "unknown" },
    ],
  });
  assert.deepEqual(
    [partial.reconciliation_state, partial.paid_count, partial.failed_count, partial.unknown_count],
    ["partial_success", 1, 0, 1],
  );
  const paidBefore = partial.items.find((item) => item.employee_id === "emp-001");
  const unknownBefore = partial.items.find((item) => item.employee_id === "emp-002");
  const replay = service.reconcile(PAYMENT_APPROVER, {
    payment_batch_id: exported.batch.payment_batch_id,
  });
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(
    replay.items.find((item) => item.employee_id === "emp-001"),
    paidBefore,
  );

  const retryScope = createPayrollPaymentReconciliationScope({
    batch: partial.batch,
    items: [unknownBefore],
    mode: "retry",
  });
  assert.deepEqual(retryScope.item_ids, [unknownBefore.payment_item_id]);
  const completed = service.retryFailed(PAYMENT_APPROVER, {
    payment_batch_id: exported.batch.payment_batch_id,
    provider_receipt: bankReceipt(exported.batch.payment_batch_id, retryScope),
    reported_item_count: 1,
    reported_paid_total_krw: 4_400_000,
    items: [
      { employee_id: "emp-002", state: "paid", provider_receipt_ref: "provider:sandbox/bank/item-2" },
    ],
  });
  assert.deepEqual(
    [completed.reconciliation_state, completed.paid_count, completed.failed_count, completed.unknown_count, completed.retried_count],
    ["succeeded", 2, 0, 0, 1],
  );
  const finalItems = repository.listPaymentItems(PREPARER, {
    payment_batch_id: exported.batch.payment_batch_id,
  });
  assert.equal(finalItems.find((item) => item.employee_id === "emp-001").attempt_count, 1);
  assert.equal(finalItems.find((item) => item.employee_id === "emp-002").attempt_count, 2);
  assert.equal(finalItems.find((item) => item.employee_id === "emp-001").provider_receipt_ref, paidBefore.provider_receipt_ref);
  assert.deepEqual(
    repository.listOutboxEvents(PREPARER, { run_id: run.run_id })
      .filter((row) => row.event_type === "payroll.payment.reconciled")
      .map((row) => row.event_type),
    ["payroll.payment.reconciled"],
  );
  store.close();
});

test("PEO-TUW-069 rejects duplicate, incomplete, and out-of-scope payment outcomes before persistence", async () => {
  const { store, repository, run, service } = runtime();
  const prepared = service.prepare(PREPARER, { run_id: run.run_id });
  service.approve(PAYMENT_APPROVER, {
    payment_batch_id: prepared.batch.payment_batch_id,
    step_up_receipt: stepUp(prepared.batch.payment_batch_id),
  });
  const exported = await service.exportBatch(PAYMENT_APPROVER, {
    payment_batch_id: prepared.batch.payment_batch_id,
  });
  const scope = createPayrollPaymentReconciliationScope({
    batch: exported.batch,
    items: exported.items,
  });
  const receipt = bankReceipt(exported.batch.payment_batch_id, scope);
  const base = {
    payment_batch_id: exported.batch.payment_batch_id,
    provider_receipt: receipt,
    reported_item_count: 2,
    reported_paid_total_krw: 3_500_000,
  };
  assert.throws(() => service.reconcile(PAYMENT_APPROVER, {
    ...base,
    items: [
      { employee_id: "emp-001", state: "paid", provider_receipt_ref: "provider:sandbox/bank/item-1" },
      { employee_id: "emp-001", state: "failed", safe_error_code: "BANK_REJECTED" },
    ],
  }), (error) => error.safe_error_code === "HRX_PAYROLL_PAYMENT_OUTCOME_DUPLICATE");
  assert.throws(() => service.reconcile(PAYMENT_APPROVER, {
    ...base,
    reported_item_count: 1,
    items: [],
  }), (error) => error.safe_error_code === "HRX_PAYROLL_PAYMENT_COUNT_MISMATCH");
  assert.throws(() => service.reconcile(PAYMENT_APPROVER, {
    ...base,
    items: [
      { employee_id: "emp-001", state: "paid", provider_receipt_ref: "provider:sandbox/bank/item-1" },
      { employee_id: "outside", state: "failed", safe_error_code: "BANK_REJECTED" },
    ],
  }), (error) => error.safe_error_code === "HRX_PAYROLL_PAYMENT_RETRY_SCOPE_INVALID");
  assert.ok(repository.listPaymentItems(PREPARER, {
    payment_batch_id: exported.batch.payment_batch_id,
  }).every((item) => item.state === "exported" && item.attempt_count === 0));
  store.close();
});

test("PEO-TUW-068 payment reconciliation replays the same durable request and rejects a changed payload", async () => {
  const { store, repository, run, service } = runtime();
  const prepared = service.prepare(PREPARER, { run_id: run.run_id });
  service.approve(PAYMENT_APPROVER, {
    payment_batch_id: prepared.batch.payment_batch_id,
    step_up_receipt: stepUp(prepared.batch.payment_batch_id),
  });
  const exported = await service.exportBatch(PAYMENT_APPROVER, {
    payment_batch_id: prepared.batch.payment_batch_id,
  });
  const scope = createPayrollPaymentReconciliationScope({
    batch: exported.batch,
    items: exported.items,
  });
  const request = {
    payment_batch_id: exported.batch.payment_batch_id,
    provider_receipt: bankReceipt(exported.batch.payment_batch_id, scope),
    reported_item_count: 2,
    reported_paid_total_krw: 7_900_000,
    items: [
      { employee_id: "emp-001", state: "paid", provider_receipt_ref: "provider:sandbox/bank/replay-item-1" },
      { employee_id: "emp-002", state: "paid", provider_receipt_ref: "provider:sandbox/bank/replay-item-2" },
    ],
  };
  const reconciled = service.reconcile(PAYMENT_APPROVER, request);
  const replay = service.reconcile(PAYMENT_APPROVER, request);
  assert.deepEqual(
    [reconciled.reconciliation_state, replay.reconciliation_state, replay.idempotent_replay],
    ["succeeded", "succeeded", true],
  );
  assert.equal(repository.listProviderOperations(PREPARER, {
    provider_kind: "bank",
  }).length, 1);
  assert.throws(
    () => service.reconcile(PAYMENT_APPROVER, {
      ...request,
      reported_paid_total_krw: request.reported_paid_total_krw - 1,
    }),
    (error) => error.safe_error_code === "HRX_PROVIDER_IDEMPOTENCY_CONFLICT",
  );
  store.close();
});

test("PEO-FIX-068-B file authority expires an unstaged bank return into manual recovery and never recalls the effect", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "lawos-payment-reconciliation-return-gap-"));
  const filePath = join(directory, "hrx-store.json");
  const reconciliationLeaseMs = 1_000;
  let currentTime = NOW;
  let bankCallCount = 0;
  try {
    const first = runtime({
      filePath,
      clock: () => currentTime,
      reconciliationLeaseMs,
    });
    const prepared = first.service.prepare(PREPARER, { run_id: first.run.run_id });
    first.service.approve(PAYMENT_APPROVER, {
      payment_batch_id: prepared.batch.payment_batch_id,
      step_up_receipt: stepUp(prepared.batch.payment_batch_id),
    });
    const exported = await first.service.exportBatch(PAYMENT_APPROVER, {
      payment_batch_id: prepared.batch.payment_batch_id,
    });
    const claim = first.service.claimReconciliation(PAYMENT_APPROVER, {
      payment_batch_id: exported.batch.payment_batch_id,
      mode: "initial",
    });
    assert.equal(claim.should_execute, true);
    bankCallCount += 1;
    const providerResult = {
      provider_receipt: bankReceipt(exported.batch.payment_batch_id, claim.plan.scope),
      reported_item_count: exported.items.length,
      reported_paid_total_krw: exported.items.reduce((sum, item) => sum + item.amount_krw, 0),
      items: exported.items.map((item) => ({
        employee_id: item.employee_id,
        state: "paid",
        provider_receipt_ref: `provider:sandbox/bank/return-gap-${item.payment_item_id}`,
      })),
    };
    // Simulated process loss after the bank result, before any local staging call.
    first.store.close();

    currentTime = new Date(Date.parse(NOW) + reconciliationLeaseMs + 1).toISOString();
    const reopened = reopenedPaymentRuntime(filePath, first.accounts, {
      clock: () => currentTime,
      reconciliationLeaseMs,
    });
    const unknown = reopened.service.claimReconciliation(PAYMENT_APPROVER, {
      payment_batch_id: exported.batch.payment_batch_id,
      mode: "initial",
    });
    assert.equal(unknown.operation.state, "unknown");
    assert.equal(
      unknown.operation.safe_error_code,
      "HRX_PAYROLL_RECONCILIATION_MANUAL_REQUIRED",
    );
    assert.equal(unknown.should_execute, false);
    assert.equal(bankCallCount, 1);

    const recovered = reopened.service.reconcile(PAYMENT_APPROVER, {
      payment_batch_id: exported.batch.payment_batch_id,
      ...providerResult,
    });
    assert.equal(recovered.reconciliation_state, "succeeded");
    assert.equal(bankCallCount, 1);
    assert.deepEqual(
      reopened.repository.listProviderOperations(PAYMENT_APPROVER, { provider_kind: "bank" })
        .map((operation) => operation.state),
      ["succeeded"],
    );
    assert.ok(reopened.repository.listAuditEvents(PAYMENT_APPROVER).some((event) =>
      event.action === "hrx.payroll.provider_operation.unknown_reconciliation_required"));
    t.diagnostic(JSON.stringify({
      scenario: "file_after_bank_return_before_stage_process_loss",
      expired_operation_state: unknown.operation.state,
      manual_safe_error_code: unknown.operation.safe_error_code,
      bank_port_call_count: bankCallCount,
      terminal_reconciliation_state: recovered.reconciliation_state,
    }));
    reopened.store.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("PEO-TUW-068/069 staged reconciliation survives restart and settlement faults roll back every item, batch, audit, and outbox write", async (t) => {
  const receipts = [];
  for (const faultPoint of [
    "payment_reconciliation.after_item",
    "payment_reconciliation.before_complete",
  ]) {
    const directory = mkdtempSync(join(tmpdir(), "lawos-payment-reconciliation-fault-"));
    const filePath = join(directory, "hrx-store.json");
    let injected = false;
    try {
      const first = runtime({
        filePath,
        faultInjector(point, details) {
          if (point !== faultPoint || injected) return;
          if (point === "payment_reconciliation.after_item" && details.item_index !== 0) return;
          injected = true;
          throw Object.assign(new Error(`injected ${point}`), {
            safe_error_code: "TEST_RECONCILIATION_SETTLEMENT_FAULT",
          });
        },
      });
      const prepared = first.service.prepare(PREPARER, { run_id: first.run.run_id });
      first.service.approve(PAYMENT_APPROVER, {
        payment_batch_id: prepared.batch.payment_batch_id,
        step_up_receipt: stepUp(prepared.batch.payment_batch_id),
      });
      const exported = await first.service.exportBatch(PAYMENT_APPROVER, {
        payment_batch_id: prepared.batch.payment_batch_id,
      });
      const scope = createPayrollPaymentReconciliationScope({
        batch: exported.batch,
        items: exported.items,
      });
      const request = {
        payment_batch_id: exported.batch.payment_batch_id,
        provider_receipt: bankReceipt(exported.batch.payment_batch_id, scope),
        reported_item_count: exported.items.length,
        reported_paid_total_krw: exported.items.reduce((total, item) => total + item.amount_krw, 0),
        items: exported.items.map((item) => ({
          employee_id: item.employee_id,
          state: "paid",
          provider_receipt_ref: `provider:sandbox/bank/fault-${item.payment_item_id}`,
        })),
      };
      const settlementAuditCountBefore = first.repository.listAuditEvents(PAYMENT_APPROVER)
        .filter((event) => event.action.startsWith("hrx.payroll.payment_item.")
          || event.action === "hrx.payroll.payment_batch.reconciled").length;
      assert.throws(
        () => first.service.reconcile(PAYMENT_APPROVER, request),
        (error) => error.safe_error_code === "TEST_RECONCILIATION_SETTLEMENT_FAULT",
      );
      assert.equal(injected, true);
      const rolledBack = first.service.bundle(PAYMENT_APPROVER, exported.batch.payment_batch_id);
      assert.equal(rolledBack.batch.state, "exported");
      assert.ok(rolledBack.items.every((item) => item.state === "exported" && item.attempt_count === 0));
      const pending = first.repository.listProviderOperations(PAYMENT_APPROVER, {
        provider_kind: "bank",
      });
      assert.deepEqual(pending.map((operation) => operation.state), ["pending"]);
      assert.doesNotMatch(
        JSON.stringify(pending),
        /account_number|bank_code|account_holder|110000000001|110000000002|Employee One|Employee Two/u,
      );
      assert.equal(
        first.repository.listOutboxEvents(PAYMENT_APPROVER, { run_id: first.run.run_id })
          .filter((event) => event.event_type === "payroll.payment.reconciled").length,
        0,
      );
      assert.equal(
        first.repository.listAuditEvents(PAYMENT_APPROVER)
          .filter((event) => event.action.startsWith("hrx.payroll.payment_item.")
            || event.action === "hrx.payroll.payment_batch.reconciled").length,
        settlementAuditCountBefore,
      );
      first.store.close();

      const reopened = reopenedPaymentRuntime(filePath, first.accounts);
      const resumed = reopened.service.reconcile(PAYMENT_APPROVER, request);
      assert.deepEqual(
        [resumed.reconciliation_state, resumed.paid_count, resumed.idempotent_replay],
        ["succeeded", 2, true],
      );
      assert.ok(resumed.items.every((item) => item.state === "paid" && item.attempt_count === 1));
      assert.deepEqual(
        reopened.repository.listProviderOperations(PAYMENT_APPROVER, { provider_kind: "bank" })
          .map((operation) => operation.state),
        ["succeeded"],
      );
      assert.equal(
        reopened.repository.listOutboxEvents(PAYMENT_APPROVER, { run_id: first.run.run_id })
          .filter((event) => event.event_type === "payroll.payment.reconciled").length,
        1,
      );
      receipts.push({
        fault_point: faultPoint,
        pre_restart_batch_state: rolledBack.batch.state,
        pre_restart_item_states: rolledBack.items.map((item) => item.state),
        pre_restart_provider_operation_state: pending[0].state,
        pre_restart_reconciliation_outbox_count: 0,
        resumed_reconciliation_state: resumed.reconciliation_state,
        resumed_item_states: resumed.items.map((item) => item.state),
        resumed_provider_operation_state: "succeeded",
        resumed_reconciliation_outbox_count: 1,
        account_fields_present: false,
      });
      reopened.store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
  t.diagnostic(JSON.stringify({
    scenario: "file_store_atomic_settlement_faults_and_restart",
    receipts,
  }));
});

test("PEO-TUW-068 payment retries persist item attempts and stop before a fourth provider result", async () => {
  const { store, repository, run, service } = runtime();
  const prepared = service.prepare(PREPARER, { run_id: run.run_id });
  service.approve(PAYMENT_APPROVER, {
    payment_batch_id: prepared.batch.payment_batch_id,
    step_up_receipt: stepUp(prepared.batch.payment_batch_id),
  });
  let current = await service.exportBatch(PAYMENT_APPROVER, {
    payment_batch_id: prepared.batch.payment_batch_id,
  });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const targetItems = attempt === 1
      ? current.items
      : current.items.filter((item) => item.state === "failed");
    const mode = attempt === 1 ? "initial" : "retry";
    const scope = createPayrollPaymentReconciliationScope({
      batch: current.batch,
      items: targetItems,
      mode,
    });
    const input = {
      payment_batch_id: current.batch.payment_batch_id,
      provider_receipt: bankReceipt(current.batch.payment_batch_id, scope),
      reported_item_count: targetItems.length,
      reported_paid_total_krw: 0,
      items: targetItems.map((item) => ({ employee_id: item.employee_id, state: "unknown" })),
    };
    current = attempt === 1
      ? service.reconcile(PAYMENT_APPROVER, input)
      : service.retryFailed(PAYMENT_APPROVER, input);
  }

  const failedItems = current.items.filter((item) => item.state === "failed");
  assert.ok(failedItems.every((item) => item.attempt_count === 3 && item.provider_result_state === "unknown"));
  const exhaustedScope = createPayrollPaymentReconciliationScope({
    batch: current.batch,
    items: failedItems,
    mode: "retry",
  });
  assert.throws(
    () => service.retryFailed(PAYMENT_APPROVER, {
      payment_batch_id: current.batch.payment_batch_id,
      provider_receipt: bankReceipt(current.batch.payment_batch_id, exhaustedScope),
      reported_item_count: failedItems.length,
      reported_paid_total_krw: 0,
      items: failedItems.map((item) => ({ employee_id: item.employee_id, state: "unknown" })),
    }),
    (error) => error.safe_error_code === "HRX_PROVIDER_RETRY_LIMIT_EXCEEDED",
  );
  assert.equal(repository.listProviderOperations(PREPARER, {
    provider_kind: "bank",
  }).length, 3);
  store.close();
});
