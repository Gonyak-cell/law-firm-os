import assert from "node:assert/strict";
import test from "node:test";
import {
  createFinanceRepository,
  FinanceIdempotencyConflictError,
} from "../../billing/src/finance-repository.js";
import { transitionInvoiceLifecycle } from "../../billing/src/invoice-service.js";
import {
  allocatePayment,
  listActivePaymentAllocations,
  reversePaymentAllocation,
} from "../src/payment-allocation-service.js";
import { importPayment } from "../src/payment-service.js";

const TENANT = "tenant-payment-lifecycle";
const MATTER = "matter-payment-lifecycle";
const ACTOR = "operator-payment-lifecycle";

test("forged import projections are reset and a partially paid Invoice cannot be voided before reversal", () => {
  const repository = createFinanceRepository();
  repository.create({
    model_type: "Invoice",
    invoice_id: "invoice-payment-lifecycle",
    tenant_id: TENANT,
    matter_id: MATTER,
    client_group_id: "client-payment-lifecycle",
    amount_due: 100,
    amount_paid: 0,
    outstanding_amount: 100,
    currency: "KRW",
    status: "sent",
    lifecycle_status: "sent",
    lifecycle_contract: "small_firm_v1",
    issued_at: "2026-07-31T00:00:00.000Z",
    due_date: "2026-08-30",
  });
  const imported = importPayment({
    repository,
    payment: {
      payment_id: "payment-lifecycle",
      tenant_id: TENANT,
      matter_id: MATTER,
      bank_reference: "bank-payment-lifecycle",
      amount: 100,
      currency: "KRW",
      status: "matched",
      allocation_status: "allocated",
      allocated_amount: 100,
      unallocated_amount: 0,
      applied_amount: 100,
      unapplied_amount: 0,
      duplicate_review_required: true,
      duplicate_candidate_payment_ids: ["forged-duplicate"],
    },
    actor_id: ACTOR,
    idempotency_key: "payment-lifecycle-import",
    initial_status: "matched",
    duplicate_candidate_payment_ids: ["forged-top-level-duplicate"],
  });
  assert.deepEqual(
    {
      status: imported.payment.status,
      allocation_status: imported.payment.allocation_status,
      allocated_amount: imported.payment.allocated_amount,
      unallocated_amount: imported.payment.unallocated_amount,
      applied_amount: imported.payment.applied_amount,
      unapplied_amount: imported.payment.unapplied_amount,
      duplicate_review_required: imported.payment.duplicate_review_required,
      duplicate_candidate_payment_ids: imported.payment.duplicate_candidate_payment_ids,
    },
    {
      status: "imported",
      allocation_status: "unallocated",
      allocated_amount: 0,
      unallocated_amount: 100,
      applied_amount: 0,
      unapplied_amount: 100,
      duplicate_review_required: false,
      duplicate_candidate_payment_ids: [],
    },
  );

  const allocated = allocatePayment({
    repository,
    allocation: {
      payment_allocation_id: "allocation-payment-lifecycle",
      tenant_id: TENANT,
      payment_id: imported.payment.payment_id,
      allocation_type: "invoice_payment",
      invoice_id: "invoice-payment-lifecycle",
      amount: 50,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-payment-lifecycle",
  });
  assert.equal(allocated.invoice.amount_paid, 50);
  assert.equal(allocated.invoice.outstanding_amount, 50);
  assert.equal(allocated.invoice.lifecycle_status, "partial");

  assert.throws(
    () => transitionInvoiceLifecycle({
      repository,
      tenant_id: TENANT,
      invoice_id: "invoice-payment-lifecycle",
      to_status: "void",
      reason_code: "forged_void_after_payment",
      actor_id: ACTOR,
      idempotency_key: "void-payment-lifecycle-blocked",
    }),
    /active payment allocation cannot be voided/,
  );
  const stillPartial = repository.get({
    tenant_id: TENANT,
    model_type: "Invoice",
    invoice_id: "invoice-payment-lifecycle",
  });
  assert.equal(stillPartial.lifecycle_status, "partial");
  assert.equal(stillPartial.amount_paid, 50);
  assert.equal(stillPartial.outstanding_amount, 50);

  const reversed = reversePaymentAllocation({
    repository,
    reversal: {
      payment_allocation_id: "allocation-payment-lifecycle-reversal",
      tenant_id: TENANT,
      reverses_payment_allocation_id: "allocation-payment-lifecycle",
      reason_code: "payment_returned",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-payment-lifecycle-reversal",
  });
  assert.equal(reversed.invoice.amount_paid, 0);
  assert.equal(reversed.invoice.outstanding_amount, 100);
  assert.equal(reversed.invoice.lifecycle_status, "sent");
  assert.equal(reversed.audit_event.action, "payment.allocation.reverse");

  const voided = transitionInvoiceLifecycle({
    repository,
    tenant_id: TENANT,
    invoice_id: "invoice-payment-lifecycle",
    to_status: "void",
    reason_code: "client_engagement_cancelled",
    actor_id: ACTOR,
    idempotency_key: "void-payment-lifecycle-after-reversal",
  });
  assert.equal(voided.invoice.lifecycle_status, "void");
});

test("invoice allocation rejects canonical Payment Matter and client-group conflicts without mutations", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Payment",
        payment_id: "payment-cross-matter",
        tenant_id: TENANT,
        matter_id: "matter-payment-a",
        client_group_id: "client-shared",
        amount: 100,
        currency: "KRW",
        status: "imported",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-cross-matter",
        tenant_id: TENANT,
        matter_id: "matter-payment-b",
        client_group_id: "client-shared",
        amount_due: 100,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "Payment",
        payment_id: "payment-cross-client",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-payment-a",
        amount: 100,
        currency: "KRW",
        status: "imported",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-cross-client",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-payment-b",
        amount_due: 100,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "Payment",
        payment_id: "payment-forged-allocation-provenance",
        tenant_id: TENANT,
        amount: 100,
        currency: "KRW",
        status: "imported",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-forged-allocation-provenance",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-invoice-canonical",
        amount_due: 100,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
    ],
  });

  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-cross-matter",
        tenant_id: TENANT,
        payment_id: "payment-cross-matter",
        invoice_id: "invoice-cross-matter",
        allocation_type: "invoice_payment",
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-cross-matter",
    }),
    /payment Matter must match Invoice Matter/,
  );
  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-cross-client",
        tenant_id: TENANT,
        payment_id: "payment-cross-client",
        invoice_id: "invoice-cross-client",
        allocation_type: "invoice_payment",
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-cross-client",
    }),
    /payment client group must match Invoice client group/,
  );
  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-forged-invoice-matter",
        tenant_id: TENANT,
        payment_id: "payment-forged-allocation-provenance",
        invoice_id: "invoice-forged-allocation-provenance",
        allocation_type: "invoice_payment",
        matter_id: "matter-forged",
        client_group_id: "client-invoice-canonical",
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-forged-invoice-matter",
    }),
    /allocation Matter must match Invoice Matter/,
  );
  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-forged-invoice-client",
        tenant_id: TENANT,
        payment_id: "payment-forged-allocation-provenance",
        invoice_id: "invoice-forged-allocation-provenance",
        allocation_type: "invoice_payment",
        matter_id: MATTER,
        client_group_id: "client-forged",
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-forged-invoice-client",
    }),
    /allocation client group must match Invoice client group/,
  );

  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 0);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "Invoice",
    invoice_id: "invoice-cross-matter",
  }).amount_paid, 0);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "Invoice",
    invoice_id: "invoice-cross-client",
  }).amount_paid, 0);
});

test("non-invoice allocations reject Payment Matter and client-group conflicts before ledger side effects", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Payment",
        payment_id: "payment-direct-provenance",
        tenant_id: TENANT,
        matter_id: "matter-direct-a",
        client_group_id: "client-direct-a",
        amount: 100,
        currency: "KRW",
        status: "imported",
      },
    ],
  });

  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-direct-cross-matter",
        tenant_id: TENANT,
        payment_id: "payment-direct-provenance",
        allocation_type: "direct_fee",
        matter_id: "matter-direct-b",
        client_group_id: "client-direct-a",
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-direct-cross-matter",
    }),
    /payment Matter must match allocation Matter/,
  );
  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-direct-cross-client",
        tenant_id: TENANT,
        payment_id: "payment-direct-provenance",
        allocation_type: "direct_fee",
        matter_id: "matter-direct-a",
        client_group_id: "client-direct-b",
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-direct-cross-client",
    }),
    /payment client group must match allocation client group/,
  );
  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-trust-cross-matter",
        tenant_id: TENANT,
        payment_id: "payment-direct-provenance",
        allocation_type: "trust_deposit",
        matter_id: "matter-direct-b",
        client_group_id: "client-direct-a",
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-trust-cross-matter",
    }),
    /payment Matter must match allocation Matter/,
  );

  const snapshot = repository.snapshot();
  assert.equal(snapshot.records.length, 1);
  assert.equal(snapshot.records[0].status, "imported");
  assert.equal(snapshot.records.some((record) => record.model_type === "PaymentAllocation"), false);
  assert.equal(snapshot.idempotency.length, 0);
  assert.equal(snapshot.audit_events.length, 0);
});

test("reversal derives ledger authority from the original allocation and binds replay payload atomically", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Payment",
        payment_id: "payment-reversal-authority",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-reversal-authority",
        amount: 100,
        currency: "KRW",
        status: "imported",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-reversal-authority",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-reversal-authority",
        amount_due: 100,
        amount_paid: 0,
        outstanding_amount: 100,
        currency: "KRW",
        status: "issued",
      },
    ],
  });
  allocatePayment({
    repository,
    allocation: {
      payment_allocation_id: "allocation-reversal-authority",
      tenant_id: TENANT,
      payment_id: "payment-reversal-authority",
      matter_id: MATTER,
      client_group_id: "client-reversal-authority",
      invoice_id: "invoice-reversal-authority",
      allocation_type: "invoice_payment",
      amount: 60,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-reversal-authority",
  });

  const request = {
    repository,
    reversal: {
      payment_allocation_id: "allocation-reversal-authority-reversed",
      tenant_id: TENANT,
      reverses_payment_allocation_id: "allocation-reversal-authority",
      reason_code: "bank_return",
      payment_id: "payment-forged",
      matter_id: "matter-forged",
      client_group_id: "client-forged",
      invoice_id: "invoice-forged",
      allocation_type: "trust_deposit",
      amount: 1,
      currency: "USD",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-reversal-authority-reversed",
  };
  const reversed = reversePaymentAllocation(request);

  assert.deepEqual(
    {
      payment_id: reversed.reversed_allocation.payment_id,
      matter_id: reversed.reversed_allocation.matter_id,
      client_group_id: reversed.reversed_allocation.client_group_id,
      invoice_id: reversed.reversed_allocation.invoice_id,
      allocation_type: reversed.reversed_allocation.allocation_type,
      amount: reversed.reversed_allocation.amount,
      currency: reversed.reversed_allocation.currency,
    },
    {
      payment_id: "payment-reversal-authority",
      matter_id: MATTER,
      client_group_id: "client-reversal-authority",
      invoice_id: "invoice-reversal-authority",
      allocation_type: "invoice_payment",
      amount: 60,
      currency: "KRW",
    },
  );
  assert.equal(reversed.invoice.amount_paid, 0);
  assert.equal(reversed.invoice.outstanding_amount, 100);
  assert.equal(reversed.payment.allocated_amount, 0);
  assert.equal(reversed.payment.unallocated_amount, 100);

  const beforeReplay = repository.snapshot();
  const replay = reversePaymentAllocation(request);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.reversed_allocation.payment_allocation_id, "allocation-reversal-authority-reversed");
  assert.deepEqual(repository.snapshot(), beforeReplay);

  const beforeConflict = repository.snapshot();
  assert.throws(
    () => reversePaymentAllocation({
      ...request,
      reversal: {
        ...request.reversal,
        amount: 2,
      },
    }),
    (error) =>
      error instanceof FinanceIdempotencyConflictError
      && error.code === "FINANCE_IDEMPOTENCY_CONFLICT"
      && error.status === 409,
  );
  assert.deepEqual(repository.snapshot(), beforeConflict);
});

test("reversal transaction rolls back every tentative write when receipt persistence fails", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Payment",
        payment_id: "payment-reversal-rollback",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-reversal-rollback",
        amount: 100,
        currency: "KRW",
        status: "imported",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-reversal-rollback",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-reversal-rollback",
        amount_due: 100,
        amount_paid: 0,
        outstanding_amount: 100,
        currency: "KRW",
        status: "issued",
      },
    ],
  });
  allocatePayment({
    repository,
    allocation: {
      payment_allocation_id: "allocation-reversal-rollback",
      tenant_id: TENANT,
      payment_id: "payment-reversal-rollback",
      matter_id: MATTER,
      client_group_id: "client-reversal-rollback",
      invoice_id: "invoice-reversal-rollback",
      allocation_type: "invoice_payment",
      amount: 100,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-reversal-rollback",
  });

  const beforeBytes = JSON.stringify(repository.snapshot());
  let stateAtFault = null;
  const faultingRepository = {
    ...repository,
    transaction(fn) {
      return repository.transaction((tx) => fn({
        ...tx,
        recordIdempotency() {
          const invoice = tx.get({
            tenant_id: TENANT,
            model_type: "Invoice",
            invoice_id: "invoice-reversal-rollback",
          });
          const payment = tx.get({
            tenant_id: TENANT,
            model_type: "Payment",
            payment_id: "payment-reversal-rollback",
          });
          stateAtFault = {
            reversal_count: tx
              .list({ tenant_id: TENANT, model_type: "PaymentAllocation" })
              .filter((row) => row.status === "reversed").length,
            invoice_amount_paid: invoice.amount_paid,
            payment_allocated_amount: payment.allocated_amount,
            reversal_audit_count: tx
              .listAudit({ tenant_id: TENANT })
              .filter((event) => event.action === "payment.allocation.reverse").length,
          };
          throw new Error("injected reversal receipt persistence failure");
        },
      }));
    },
  };
  assert.throws(
    () => reversePaymentAllocation({
      repository: faultingRepository,
      reversal: {
        payment_allocation_id: "allocation-reversal-rollback-reversed",
        tenant_id: TENANT,
        reverses_payment_allocation_id: "allocation-reversal-rollback",
        reason_code: "bank_return",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-reversal-rollback-reversed",
    }),
    /injected reversal receipt persistence failure/,
  );

  assert.deepEqual(stateAtFault, {
    reversal_count: 1,
    invoice_amount_paid: 0,
    payment_allocated_amount: 0,
    reversal_audit_count: 1,
  });
  assert.equal(JSON.stringify(repository.snapshot()), beforeBytes);
  assert.deepEqual(
    {
      invoice_amount_paid: repository.get({
        tenant_id: TENANT,
        model_type: "Invoice",
        invoice_id: "invoice-reversal-rollback",
      }).amount_paid,
      payment_allocated_amount: repository.get({
        tenant_id: TENANT,
        model_type: "Payment",
        payment_id: "payment-reversal-rollback",
      }).allocated_amount,
      allocation_count: repository.list({
        tenant_id: TENANT,
        model_type: "PaymentAllocation",
        payment_id: "payment-reversal-rollback",
      }).length,
      reversal_audit_count: repository
        .listAudit({ tenant_id: TENANT })
        .filter((event) => event.action === "payment.allocation.reverse").length,
    },
    {
      invoice_amount_paid: 100,
      payment_allocated_amount: 100,
      allocation_count: 1,
      reversal_audit_count: 0,
    },
  );
});

test("two invoice allocations reconcile paid to partial to zero across sequential reversals", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Payment",
        payment_id: "payment-sequential-reversals",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-sequential-reversals",
        amount: 100,
        currency: "KRW",
        status: "imported",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-sequential-reversals",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: "client-sequential-reversals",
        amount_due: 100,
        amount_paid: 0,
        outstanding_amount: 100,
        currency: "KRW",
        status: "issued",
      },
    ],
  });
  for (const [suffix, amount] of [["first", 40], ["second", 60]]) {
    allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: `allocation-sequential-${suffix}`,
        tenant_id: TENANT,
        payment_id: "payment-sequential-reversals",
        matter_id: MATTER,
        client_group_id: "client-sequential-reversals",
        invoice_id: "invoice-sequential-reversals",
        allocation_type: "invoice_payment",
        amount,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: `allocation-sequential-${suffix}`,
    });
  }

  const paidInvoice = repository.get({
    tenant_id: TENANT,
    model_type: "Invoice",
    invoice_id: "invoice-sequential-reversals",
  });
  const paidPayment = repository.get({
    tenant_id: TENANT,
    model_type: "Payment",
    payment_id: "payment-sequential-reversals",
  });
  assert.deepEqual(
    {
      invoice_status: paidInvoice.status,
      invoice_amount_paid: paidInvoice.amount_paid,
      invoice_outstanding_amount: paidInvoice.outstanding_amount,
      payment_allocated_amount: paidPayment.allocated_amount,
      payment_unallocated_amount: paidPayment.unallocated_amount,
    },
    {
      invoice_status: "paid",
      invoice_amount_paid: 100,
      invoice_outstanding_amount: 0,
      payment_allocated_amount: 100,
      payment_unallocated_amount: 0,
    },
  );

  const firstReversal = reversePaymentAllocation({
    repository,
    reversal: {
      payment_allocation_id: "allocation-sequential-second-reversed",
      tenant_id: TENANT,
      reverses_payment_allocation_id: "allocation-sequential-second",
      reason_code: "bank_return",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-sequential-second-reversed",
  });
  const activeAfterFirst = listActivePaymentAllocations({
    repository,
    tenant_id: TENANT,
    payment_id: "payment-sequential-reversals",
  });
  const rowsAfterFirst = repository.list({
    tenant_id: TENANT,
    model_type: "PaymentAllocation",
    payment_id: "payment-sequential-reversals",
  });
  const postedAfterFirst = rowsAfterFirst
    .filter((row) => row.status === "posted")
    .reduce((total, row) => total + row.amount, 0);
  const reversedAfterFirst = rowsAfterFirst
    .filter((row) => row.status === "reversed")
    .reduce((total, row) => total + row.amount, 0);
  const activeTotalAfterFirst = activeAfterFirst.reduce((total, row) => total + row.amount, 0);
  assert.deepEqual(
    {
      invoice_status: firstReversal.invoice.status,
      invoice_amount_paid: firstReversal.invoice.amount_paid,
      invoice_outstanding_amount: firstReversal.invoice.outstanding_amount,
      payment_allocated_amount: firstReversal.payment.allocated_amount,
      payment_unallocated_amount: firstReversal.payment.unallocated_amount,
      posted_allocation_total: postedAfterFirst,
      reversed_allocation_total: reversedAfterFirst,
      active_allocation_total: activeTotalAfterFirst,
      net_allocation_total: postedAfterFirst - reversedAfterFirst,
    },
    {
      invoice_status: "partially_paid",
      invoice_amount_paid: 40,
      invoice_outstanding_amount: 60,
      payment_allocated_amount: 40,
      payment_unallocated_amount: 60,
      posted_allocation_total: 100,
      reversed_allocation_total: 60,
      active_allocation_total: 40,
      net_allocation_total: 40,
    },
  );

  const secondReversal = reversePaymentAllocation({
    repository,
    reversal: {
      payment_allocation_id: "allocation-sequential-first-reversed",
      tenant_id: TENANT,
      reverses_payment_allocation_id: "allocation-sequential-first",
      reason_code: "bank_return",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-sequential-first-reversed",
  });
  const activeAfterSecond = listActivePaymentAllocations({
    repository,
    tenant_id: TENANT,
    payment_id: "payment-sequential-reversals",
  });
  const rowsAfterSecond = repository.list({
    tenant_id: TENANT,
    model_type: "PaymentAllocation",
    payment_id: "payment-sequential-reversals",
  });
  const postedAfterSecond = rowsAfterSecond
    .filter((row) => row.status === "posted")
    .reduce((total, row) => total + row.amount, 0);
  const reversedAfterSecond = rowsAfterSecond
    .filter((row) => row.status === "reversed")
    .reduce((total, row) => total + row.amount, 0);
  const activeTotalAfterSecond = activeAfterSecond.reduce((total, row) => total + row.amount, 0);
  assert.deepEqual(
    {
      invoice_status: secondReversal.invoice.status,
      invoice_amount_paid: secondReversal.invoice.amount_paid,
      invoice_outstanding_amount: secondReversal.invoice.outstanding_amount,
      payment_status: secondReversal.payment.status,
      payment_allocated_amount: secondReversal.payment.allocated_amount,
      payment_unallocated_amount: secondReversal.payment.unallocated_amount,
      posted_allocation_total: postedAfterSecond,
      reversed_allocation_total: reversedAfterSecond,
      active_allocation_total: activeTotalAfterSecond,
      net_allocation_total: postedAfterSecond - reversedAfterSecond,
    },
    {
      invoice_status: "issued",
      invoice_amount_paid: 0,
      invoice_outstanding_amount: 100,
      payment_status: "imported",
      payment_allocated_amount: 0,
      payment_unallocated_amount: 100,
      posted_allocation_total: 100,
      reversed_allocation_total: 100,
      active_allocation_total: 0,
      net_allocation_total: 0,
    },
  );
});
