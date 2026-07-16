import assert from "node:assert/strict";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollPaymentService } from "../src/payroll/payment-service.js";
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

function runtime() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const hr = createSqlHrxRepository({ store, clock: () => NOW });
  for (const [employee_id, display_name] of [["emp-001", "Employee One"], ["emp-002", "Employee Two"]]) hr.createEmployee({ tenant_id: TENANT, employee_id, display_name, status: "active" });
  let sequence = 0;
  const repository = createPayrollRepository({ store, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++sequence}` });
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
  return { store, repository, run, accounts, service: createPayrollPaymentService({ repository, accountResolver, clock: () => NOW }) };
}

function stepUp(batchId, actor = PAYMENT_APPROVER.actor_id) {
  return createPayrollStepUpReceipt({ receipt_ref: `artifact:step-up/payment/${batchId}`, actor_id: actor, action: "payroll.payment.approve", object_id: batchId, issued_at: NOW, expires_at: "2026-07-15T05:05:00.000Z" });
}

function bankReceipt(batchId, state = "succeeded") {
  return {
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: `bank-receipt-${batchId}`,
    tenant_id: TENANT,
    provider_kind: "bank",
    provider_id: "synthetic-bank-sandbox",
    operation: "bulk_transfer_reconcile",
    idempotency_key: `${batchId}:reconcile`,
    payload_hash: `sha256:${"c".repeat(64)}`,
    state,
    requested_at: NOW,
    completed_at: state === "pending" ? null : NOW,
    provider_receipt_ref: state === "succeeded" ? `provider:sandbox/bank/${batchId}` : null,
    error_code: state === "failed" ? "BANK_REJECTED" : null,
  };
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

test("PY-BANK-002 enforces payment four-eyes, payroll/payment approver separation, step-up, and checksum integrity", () => {
  const { store, repository, run, accounts, service } = runtime();
  const prepared = service.prepare(PREPARER, { run_id: run.run_id });
  assert.throws(() => service.approve(PREPARER, { payment_batch_id: prepared.batch.payment_batch_id, step_up_receipt: stepUp(prepared.batch.payment_batch_id, PREPARER.actor_id) }), (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL");
  assert.throws(() => service.approve(PAYROLL_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, step_up_receipt: stepUp(prepared.batch.payment_batch_id, PAYROLL_APPROVER.actor_id) }), (error) => error.safe_error_code === "HRX_PAYROLL_PAYMENT_APPROVER_SEPARATION");
  const approved = service.approve(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, step_up_receipt: stepUp(prepared.batch.payment_batch_id) });
  assert.equal(approved.batch.state, "approved");
  accounts.set("emp-001", { ...accounts.get("emp-001"), account_number: "999999999999" });
  assert.throws(() => service.exportBatch(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id }), (error) => error.safe_error_code === "HRX_PAYROLL_PAYMENT_TAMPERED");
  assert.equal(repository.getPaymentBatch(PREPARER, { payment_batch_id: prepared.batch.payment_batch_id }).state, "approved");
  store.close();
});

test("PY-BANK-002/003 exports after separate approval and records paid/failed outcomes only with a successful bank receipt", () => {
  const { store, repository, run, service } = runtime();
  const prepared = service.prepare(PREPARER, { run_id: run.run_id });
  service.approve(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, step_up_receipt: stepUp(prepared.batch.payment_batch_id) });
  const exported = service.exportBatch(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id });
  assert.equal(exported.batch.state, "exported");
  assert.equal(Buffer.from(exported.content_base64, "base64").subarray(0, 3).toString("utf8"), "﻿");
  assert.throws(() => service.reconcile(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, provider_receipt: bankReceipt(prepared.batch.payment_batch_id, "pending"), items: [] }), (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_RECEIPT_REQUIRED");
  assert.throws(() => service.reconcile(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, provider_receipt: bankReceipt(prepared.batch.payment_batch_id), reported_paid_total_krw: 1, items: [
    { employee_id: "emp-001", state: "paid", provider_receipt_ref: "provider:sandbox/bank/item-1" },
    { employee_id: "emp-002", state: "failed" },
  ] }), (error) => error.safe_error_code === "HRX_PAYROLL_PAYMENT_TOTAL_MISMATCH");
  assert.ok(repository.listPaymentItems(PREPARER, { payment_batch_id: prepared.batch.payment_batch_id }).every((row) => row.state === "exported"));
  const reconciled = service.reconcile(PAYMENT_APPROVER, { payment_batch_id: prepared.batch.payment_batch_id, provider_receipt: bankReceipt(prepared.batch.payment_batch_id), reported_paid_total_krw: 3_500_000, items: [
    { employee_id: "emp-001", state: "paid", provider_receipt_ref: "provider:sandbox/bank/item-1" },
    { employee_id: "emp-002", state: "failed" },
  ] });
  assert.deepEqual([reconciled.batch.state, reconciled.paid_total_krw, reconciled.failed_count], ["reconciled", 3_500_000, 1]);
  assert.deepEqual(repository.listOutboxEvents(PREPARER, { run_id: run.run_id }).filter((row) => row.event_type.startsWith("payroll.payment.")).map((row) => row.event_type), ["payroll.payment.exported", "payroll.payment.reconciled"]);
  store.close();
});
