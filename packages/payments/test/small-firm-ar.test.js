import assert from "node:assert/strict";
import test from "node:test";
import {
  createFinanceRepository,
  FinanceIdempotencyConflictError,
} from "../../billing/src/index.js";
import {
  applyMatterPayment,
  importPayment,
  queryMatterArQueue,
  reconcileMatterArQueue,
  reverseMatterPaymentAllocation,
} from "../src/index.js";

const TENANT = "tenant-small-firm-ar";
const MATTER = "matter-small-firm-ar";
const ACTOR = "collections-operator";

function invoice(repository, { id, amount, dueDate, matterId = MATTER } = {}) {
  return repository.create({
    model_type: "Invoice",
    invoice_id: id,
    invoice_number: id.toUpperCase(),
    tenant_id: TENANT,
    matter_id: matterId,
    billing_client_party_id: "client-small-firm-ar",
    amount_due: amount,
    amount_paid: 0,
    currency: "KRW",
    status: "sent",
    lifecycle_status: "sent",
    lifecycle_contract: "small_firm_v1",
    issued_at: "2026-04-01T00:00:00.000Z",
    sent_at: "2026-04-01T00:00:00.000Z",
    due_date: dueDate,
  });
}

function payment(repository, { id, amount, matterId = MATTER } = {}) {
  return importPayment({
    repository,
    payment: {
      payment_id: id,
      tenant_id: TENANT,
      matter_id: matterId,
      bank_reference: `bank:${id}`,
      amount,
      currency: "KRW",
      received_at: "2026-07-31T10:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: `import:${id}`,
  }).payment;
}

test("[TUW-36] Matter payment apply recomputes AR buckets and replay never duplicates cash", () => {
  const repository = createFinanceRepository();
  invoice(repository, { id: "invoice-current", amount: 100, dueDate: "2026-08-15" });
  invoice(repository, { id: "invoice-1-30", amount: 200, dueDate: "2026-07-20" });
  invoice(repository, { id: "invoice-31-60", amount: 300, dueDate: "2026-06-15" });
  invoice(repository, { id: "invoice-61-90", amount: 400, dueDate: "2026-05-15" });
  invoice(repository, { id: "invoice-90-plus", amount: 500, dueDate: "2026-04-15" });

  const reconciled = reconcileMatterArQueue({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "ar-initial-reconcile",
  });
  const initial = queryMatterArQueue({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    as_of_date: "2026-07-31",
  });
  assert.equal(reconciled.ar_balances.length, 5);
  assert.deepEqual(initial.totals, {
    balance: 1500,
    invoice_count: 5,
    error_count: 0,
    bucket_current: 100,
    bucket_1_30: 200,
    bucket_31_60: 300,
    bucket_61_90: 400,
    bucket_90_plus: 500,
  });

  const firstPayment = payment(repository, { id: "payment-partial", amount: 50 });
  const partialRequest = {
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: firstPayment.payment_id,
    invoice_id: "invoice-1-30",
    amount: 50,
    payment_allocation_id: "allocation-partial",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "matter-payment-partial",
  };
  const partial = applyMatterPayment(partialRequest);
  const partialReplay = applyMatterPayment(partialRequest);
  assert.equal(partial.invoice.status, "partial");
  assert.equal(partial.invoice.lifecycle_status, "partial");
  assert.equal(partial.invoice.amount_paid, 50);
  assert.equal(partial.ar_balance.balance, 150);
  assert.equal(partial.ar_queue.totals.bucket_1_30, 150);
  assert.equal(partialReplay.idempotent_replay, true);
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "PaymentAllocation",
    payment_id: firstPayment.payment_id,
  }).length, 1);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "Payment",
    payment_id: firstPayment.payment_id,
  }).allocated_amount, 50);

  const finalPayment = payment(repository, { id: "payment-final", amount: 150 });
  const paidRequest = {
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: finalPayment.payment_id,
    invoice_id: "invoice-1-30",
    amount: 150,
    payment_allocation_id: "allocation-final",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "matter-payment-final",
  };
  const paid = applyMatterPayment(paidRequest);
  const paidReplay = applyMatterPayment(paidRequest);
  assert.equal(paid.invoice.status, "paid");
  assert.equal(paid.invoice.lifecycle_status, "paid");
  assert.equal(paid.invoice.amount_paid, 200);
  assert.equal(paid.ar_balance.balance, 0);
  assert.equal(paid.ar_balance.status, "closed");
  assert.equal(paid.ar_queue.totals.bucket_1_30, 0);
  assert.equal(paid.ar_queue.rows.some((row) => row.invoice_id === "invoice-1-30"), false);
  assert.equal(paidReplay.idempotent_replay, true);
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "PaymentAllocation",
    invoice_id: "invoice-1-30",
  }).length, 2);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "ARBalance", invoice_id: "invoice-1-30" }).length, 1);
});

test("[TUW-36] Matter payment apply rejects cross-Matter and draft invoice targets atomically", () => {
  const repository = createFinanceRepository();
  invoice(repository, {
    id: "invoice-other-matter",
    amount: 100,
    dueDate: "2026-08-15",
    matterId: "matter-other",
  });
  repository.create({
    model_type: "Invoice",
    invoice_id: "invoice-draft",
    tenant_id: TENANT,
    matter_id: MATTER,
    billing_client_party_id: "client-small-firm-ar",
    amount_due: 100,
    amount_paid: 0,
    currency: "KRW",
    status: "draft",
    lifecycle_status: "draft",
    lifecycle_contract: "small_firm_v1",
  });
  const received = payment(repository, { id: "payment-invalid-targets", amount: 100 });

  assert.throws(
    () => applyMatterPayment({
      repository,
      tenant_id: TENANT,
      matter_id: MATTER,
      payment_id: received.payment_id,
      invoice_id: "invoice-other-matter",
      amount: 100,
      as_of_date: "2026-07-31",
      actor_id: ACTOR,
      idempotency_key: "matter-payment-cross-matter",
    }),
    /Invoice matter mismatch/,
  );
  assert.throws(
    () => applyMatterPayment({
      repository,
      tenant_id: TENANT,
      matter_id: MATTER,
      payment_id: received.payment_id,
      invoice_id: "invoice-draft",
      amount: 100,
      as_of_date: "2026-07-31",
      actor_id: ACTOR,
      idempotency_key: "matter-payment-draft",
    }),
    /outstanding sent invoice/,
  );
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 0);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "Payment",
    payment_id: received.payment_id,
  }).unallocated_amount, 100);
});

test("[H5] Matter payment receipts bind operation, actor, object, and request payload", () => {
  const repository = createFinanceRepository();
  invoice(repository, { id: "invoice-idempotency", amount: 100, dueDate: "2026-08-15" });
  const received = payment(repository, { id: "payment-idempotency", amount: 100 });
  const request = {
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: received.payment_id,
    invoice_id: "invoice-idempotency",
    amount: 50,
    payment_allocation_id: "allocation-idempotency",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "matter-payment-idempotency",
  };
  applyMatterPayment(request);
  assert.equal(applyMatterPayment(request).idempotent_replay, true);
  const receipt = repository.snapshot().idempotency.find((item) => item.idempotency_key === request.idempotency_key);
  assert.deepEqual(
    {
      operation: receipt.operation,
      actor_id: receipt.actor_id,
      object_type: receipt.object_type,
      object_id: receipt.object_id,
    },
    {
      operation: "matter_payment_apply",
      actor_id: ACTOR,
      object_type: "Matter",
      object_id: MATTER,
    },
  );
  assert.match(receipt.request_fingerprint, /^[a-f0-9]{64}$/);
  const isTypedConflict = (error) =>
    error instanceof FinanceIdempotencyConflictError &&
    error.code === "FINANCE_IDEMPOTENCY_CONFLICT" &&
    error.status === 409;
  assert.throws(() => applyMatterPayment({ ...request, amount: 40 }), isTypedConflict);
  assert.throws(() => applyMatterPayment({ ...request, actor_id: "different-collector" }), isTypedConflict);
  assert.throws(
    () => reconcileMatterArQueue({
      repository,
      tenant_id: TENANT,
      matter_id: MATTER,
      as_of_date: "2026-07-31",
      actor_id: ACTOR,
      idempotency_key: request.idempotency_key,
    }),
    isTypedConflict,
  );
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "PaymentAllocation",
    payment_id: received.payment_id,
  }).length, 1);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "Invoice",
    invoice_id: "invoice-idempotency",
  }).amount_paid, 50);
});

test("[RF-10] Matter allocation reversal reopens persisted AR atomically and binds replay to the reason", () => {
  const repository = createFinanceRepository();
  invoice(repository, { id: "invoice-reversal", amount: 100, dueDate: "2026-07-20" });
  const received = payment(repository, { id: "payment-reversal", amount: 100 });
  applyMatterPayment({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: received.payment_id,
    invoice_id: "invoice-reversal",
    amount: 100,
    payment_allocation_id: "allocation-reversal",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "matter-payment-before-reversal",
  });
  const request = {
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: received.payment_id,
    payment_allocation_id: "allocation-reversal",
    reversal_payment_allocation_id: "allocation-reversal-entry",
    reason_code: "duplicate_bank_match",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "matter-payment-reversal",
    amount: 1,
    currency: "USD",
    invoice_id: "invoice-forged",
  };
  const reversed = reverseMatterPaymentAllocation(request);
  assert.deepEqual(
    {
      payment_id: reversed.reversed_allocation.payment_id,
      matter_id: reversed.reversed_allocation.matter_id,
      invoice_id: reversed.reversed_allocation.invoice_id,
      amount: reversed.reversed_allocation.amount,
      currency: reversed.reversed_allocation.currency,
      reason_code: reversed.reversed_allocation.reason_code,
    },
    {
      payment_id: received.payment_id,
      matter_id: MATTER,
      invoice_id: "invoice-reversal",
      amount: 100,
      currency: "KRW",
      reason_code: "duplicate_bank_match",
    },
  );
  assert.equal(reversed.invoice.lifecycle_status, "sent");
  assert.equal(reversed.invoice.amount_paid, 0);
  assert.equal(reversed.payment.allocated_amount, 0);
  assert.equal(reversed.payment.unallocated_amount, 100);
  assert.equal(reversed.ar_balance.balance, 100);
  assert.equal(reversed.ar_balance.status, "open");
  assert.equal(reversed.ar_balance.aging_bucket, "bucket_1_30");
  assert.equal(reversed.ar_queue.totals.bucket_1_30, 100);

  const beforeReplay = repository.snapshot();
  assert.equal(reverseMatterPaymentAllocation(request).idempotent_replay, true);
  assert.deepEqual(repository.snapshot(), beforeReplay);
  assert.throws(
    () => reverseMatterPaymentAllocation({ ...request, reason_code: "wrong_invoice" }),
    FinanceIdempotencyConflictError,
  );
  assert.deepEqual(repository.snapshot(), beforeReplay);
  assert.throws(
    () => reverseMatterPaymentAllocation({
      ...request,
      idempotency_key: "matter-payment-reversal-cross-matter",
      matter_id: "matter-other",
      reversal_payment_allocation_id: "allocation-reversal-cross-matter",
    }),
    (error) => error.status === 404,
  );
  assert.deepEqual(repository.snapshot(), beforeReplay);
});

test("[RF-10] Matter allocation reversal rejects inconsistent canonical Payment and Invoice scope before writing", () => {
  const repository = createFinanceRepository();
  const hiddenMatterId = "matter-hidden-payment-ledger";
  invoice(repository, {
    id: "invoice-hidden-payment-ledger",
    amount: 100,
    dueDate: "2026-07-20",
    matterId: hiddenMatterId,
  });
  const received = payment(repository, {
    id: "payment-hidden-payment-ledger",
    amount: 100,
    matterId: hiddenMatterId,
  });
  applyMatterPayment({
    repository,
    tenant_id: TENANT,
    matter_id: hiddenMatterId,
    payment_id: received.payment_id,
    invoice_id: "invoice-hidden-payment-ledger",
    amount: 100,
    payment_allocation_id: "allocation-inconsistent-payment-ledger",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "matter-payment-inconsistent-ledger-setup",
  });
  repository.update(
    {
      tenant_id: TENANT,
      model_type: "PaymentAllocation",
      payment_allocation_id: "allocation-inconsistent-payment-ledger",
    },
    { matter_id: MATTER },
  );
  const before = repository.snapshot();

  assert.throws(
    () => reverseMatterPaymentAllocation({
      repository,
      tenant_id: TENANT,
      matter_id: MATTER,
      payment_id: received.payment_id,
      payment_allocation_id: "allocation-inconsistent-payment-ledger",
      reversal_payment_allocation_id: "allocation-inconsistent-payment-ledger-reversal",
      reason_code: "cross_matter_visibility_probe",
      as_of_date: "2026-07-31",
      actor_id: ACTOR,
      idempotency_key: "matter-payment-inconsistent-ledger-reversal",
    }),
    (error) => error.status === 404,
  );
  assert.deepEqual(repository.snapshot(), before);
  assert.equal(
    repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" })
      .filter((row) => row.reverses_payment_allocation_id).length,
    0,
  );
});

test("[RF-10] implicit reversal dates replay across midnight while an explicit date change conflicts", () => {
  const repository = createFinanceRepository();
  invoice(repository, {
    id: "invoice-reversal-midnight",
    amount: 100,
    dueDate: "2026-07-20",
  });
  const received = payment(repository, {
    id: "payment-reversal-midnight",
    amount: 100,
  });
  applyMatterPayment({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: received.payment_id,
    invoice_id: "invoice-reversal-midnight",
    amount: 100,
    payment_allocation_id: "allocation-reversal-midnight",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "matter-payment-before-reversal-midnight",
  });
  const request = {
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: received.payment_id,
    payment_allocation_id: "allocation-reversal-midnight",
    reversal_payment_allocation_id: "allocation-reversal-midnight-entry",
    reason_code: "midnight_retry",
    as_of_date: "2026-07-31",
    idempotency_as_of_date: null,
    actor_id: ACTOR,
    idempotency_key: "matter-payment-reversal-midnight",
  };
  const first = reverseMatterPaymentAllocation(request);
  assert.equal(first.idempotent_replay, false);
  const afterFirst = repository.snapshot();

  const replay = reverseMatterPaymentAllocation({
    ...request,
    as_of_date: "2026-08-01",
  });
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(repository.snapshot(), afterFirst);

  assert.throws(
    () => reverseMatterPaymentAllocation({
      ...request,
      as_of_date: "2026-08-01",
      idempotency_as_of_date: "2026-08-01",
    }),
    FinanceIdempotencyConflictError,
  );
  assert.deepEqual(repository.snapshot(), afterFirst);
});

test("[RF-10] Matter allocation reversal rolls Invoice, Payment, ARBalance, audit, and receipts back together", () => {
  const repository = createFinanceRepository();
  invoice(repository, { id: "invoice-reversal-rollback", amount: 100, dueDate: "2026-07-20" });
  const received = payment(repository, { id: "payment-reversal-rollback", amount: 100 });
  applyMatterPayment({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    payment_id: received.payment_id,
    invoice_id: "invoice-reversal-rollback",
    amount: 100,
    payment_allocation_id: "allocation-reversal-rollback",
    as_of_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "matter-payment-before-reversal-rollback",
  });
  const before = repository.snapshot();
  let stateAtFault = null;
  const faultingRepository = Object.freeze({
    ...repository,
    transaction(execute) {
      return repository.transaction((tx) => execute({
        ...tx,
        recordIdempotency(entry) {
          if (entry.idempotency_key !== "matter-payment-reversal-rollback") {
            return tx.recordIdempotency(entry);
          }
          stateAtFault = {
            reversal_count: tx
              .list({ tenant_id: TENANT, model_type: "PaymentAllocation" })
              .filter((row) => row.status === "reversed").length,
            invoice_amount_paid: tx.get({
              tenant_id: TENANT,
              model_type: "Invoice",
              invoice_id: "invoice-reversal-rollback",
            }).amount_paid,
            payment_allocated_amount: tx.get({
              tenant_id: TENANT,
              model_type: "Payment",
              payment_id: received.payment_id,
            }).allocated_amount,
            ar_balance: tx.get({
              tenant_id: TENANT,
              model_type: "ARBalance",
              ar_balance_id: `ar:${TENANT}:invoice-reversal-rollback`,
            }).balance,
          };
          throw new Error("simulated outer reversal receipt failure");
        },
      }));
    },
  });
  assert.throws(
    () => reverseMatterPaymentAllocation({
      repository: faultingRepository,
      tenant_id: TENANT,
      matter_id: MATTER,
      payment_id: received.payment_id,
      payment_allocation_id: "allocation-reversal-rollback",
      reversal_payment_allocation_id: "allocation-reversal-rollback-entry",
      reason_code: "bank_return",
      as_of_date: "2026-07-31",
      actor_id: ACTOR,
      idempotency_key: "matter-payment-reversal-rollback",
    }),
    /simulated outer reversal receipt failure/,
  );
  assert.deepEqual(stateAtFault, {
    reversal_count: 1,
    invoice_amount_paid: 0,
    payment_allocated_amount: 0,
    ar_balance: 100,
  });
  assert.deepEqual(repository.snapshot(), before);
});
