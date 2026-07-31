import assert from "node:assert/strict";
import test from "node:test";
import { createFinanceRepository } from "../../billing/src/finance-repository.js";
import { confirmBankReceipt, importPayment } from "../src/payment-service.js";
import {
  allocatePayment,
  backfillPaymentMatchesAsAllocations,
  buildPaymentAllocationMigrationPlan,
  reallocateDirectFeeToInvoice,
  reversePaymentAllocation,
} from "../src/payment-allocation-service.js";
import { matchPaymentToInvoice } from "../src/matching-service.js";

const TENANT = "tenant-direct-receipt";
const MATTER = "matter-direct-receipt";
const CLIENT = "client-direct-receipt";
const ACTOR = "finance-operator";

function payment(repository, {
  id = "payment-direct",
  amount = 100,
  currency = "KRW",
  matterId = MATTER,
  clientGroupId = CLIENT,
} = {}) {
  return importPayment({
    repository,
    payment: {
      payment_id: id,
      tenant_id: TENANT,
      matter_id: matterId,
      client_group_id: clientGroupId,
      bank_reference: `bank:${id}`,
      amount,
      currency,
      received_at: "2026-07-30",
    },
    actor_id: ACTOR,
    idempotency_key: `import:${id}`,
  }).payment;
}

function invoice(repository, { id = "invoice-direct", amount = 100, currency = "KRW" } = {}) {
  return repository.create({
    model_type: "Invoice",
    invoice_id: id,
    tenant_id: TENANT,
    matter_id: MATTER,
    client_group_id: CLIENT,
    amount_due: amount,
    amount_paid: 0,
    currency,
    issued_at: "2026-07-30",
    status: "issued",
  });
}

test("direct fee requires client and Matter and never requires an Invoice", () => {
  const repository = createFinanceRepository();
  const imported = payment(repository, { clientGroupId: null });

  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-missing-client",
        tenant_id: TENANT,
        payment_id: imported.payment_id,
        allocation_type: "direct_fee",
        matter_id: MATTER,
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-missing-client",
    }),
    /client_group_id is required/,
  );

  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-direct-with-invoice",
        tenant_id: TENANT,
        payment_id: imported.payment_id,
        allocation_type: "direct_fee",
        client_group_id: CLIENT,
        matter_id: MATTER,
        invoice_id: "invoice-not-allowed",
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-direct-with-invoice",
    }),
    /invoice_id is only allowed for invoice_payment/,
  );
});

test("one Payment can be split between direct fee and advance without exceeding cash", () => {
  const repository = createFinanceRepository();
  const imported = payment(repository);

  const direct = allocatePayment({
    repository,
    allocation: {
      payment_allocation_id: "allocation-direct-70",
      tenant_id: TENANT,
      payment_id: imported.payment_id,
      allocation_type: "direct_fee",
      client_group_id: CLIENT,
      matter_id: MATTER,
      amount: 70,
      currency: "KRW",
      allocated_at: "2026-07-30",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-direct-70",
  });
  assert.equal(direct.payment.allocation_status, "partially_allocated");
  assert.equal(direct.payment.unallocated_amount, 30);

  const advance = allocatePayment({
    repository,
    allocation: {
      payment_allocation_id: "allocation-advance-30",
      tenant_id: TENANT,
      payment_id: imported.payment_id,
      allocation_type: "client_advance",
      client_group_id: CLIENT,
      matter_id: MATTER,
      amount: 30,
      currency: "KRW",
      allocated_at: "2026-07-30",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-advance-30",
  });
  assert.equal(advance.payment.allocation_status, "allocated");
  assert.equal(advance.payment.allocated_amount, 100);
  assert.equal(advance.payment.unallocated_amount, 0);

  assert.throws(
    () => allocatePayment({
      repository,
      allocation: {
        payment_allocation_id: "allocation-over",
        tenant_id: TENANT,
        payment_id: imported.payment_id,
        allocation_type: "other_non_revenue",
        amount: 1,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-over",
    }),
    /exceeds available payment/,
  );
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 2);
});

test("legacy PaymentMatch writes one compatible invoice allocation and remains idempotent", () => {
  const repository = createFinanceRepository();
  const imported = payment(repository);
  const issued = invoice(repository);
  const request = {
    repository,
    match: {
      payment_match_id: "match-compatible",
      tenant_id: TENANT,
      payment_id: imported.payment_id,
      invoice_id: issued.invoice_id,
      amount: 60,
      matched_at: "2026-07-30",
    },
    actor_id: ACTOR,
    idempotency_key: "match-compatible",
  };

  const matched = matchPaymentToInvoice(request);
  const replay = matchPaymentToInvoice(request);
  assert.equal(matched.payment_match.payment_match_id, "match-compatible");
  assert.equal(matched.payment_allocation.allocation_type, "invoice_payment");
  assert.equal(matched.payment_allocation.source_payment_match_id, "match-compatible");
  assert.equal(matched.invoice.amount_paid, 60);
  assert.equal(matched.payment.unapplied_amount, 40);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentMatch" }).length, 1);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 1);
});

test("direct fee can be reallocated to a later Invoice without changing collected cash", () => {
  const repository = createFinanceRepository();
  const imported = payment(repository);
  allocatePayment({
    repository,
    allocation: {
      payment_allocation_id: "allocation-direct-before-invoice",
      tenant_id: TENANT,
      payment_id: imported.payment_id,
      allocation_type: "direct_fee",
      client_group_id: CLIENT,
      matter_id: MATTER,
      amount: 100,
      currency: "KRW",
      allocated_at: "2026-07-30",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-direct-before-invoice",
  });
  const issued = invoice(repository);

  const result = reallocateDirectFeeToInvoice({
    repository,
    tenant_id: TENANT,
    payment_allocation_id: "allocation-direct-before-invoice",
    reversal_payment_allocation_id: "allocation-direct-reversal",
    invoice_payment_allocation_id: "allocation-later-invoice",
    invoice_id: issued.invoice_id,
    reason_code: "invoice_issued_later",
    actor_id: ACTOR,
    idempotency_key: "reallocate-later-invoice",
  });

  assert.equal(result.reversed_allocation.reverses_payment_allocation_id, "allocation-direct-before-invoice");
  assert.equal(result.payment_allocation.allocation_type, "invoice_payment");
  assert.equal(result.invoice.amount_paid, 100);
  assert.equal(result.payment.allocated_amount, 100);
  assert.equal(result.payment.unallocated_amount, 0);
});

test("reversing the last allocation restores an imported, unallocated Payment", () => {
  const repository = createFinanceRepository();
  const imported = payment(repository);
  allocatePayment({
    repository,
    allocation: {
      payment_allocation_id: "allocation-to-reverse",
      tenant_id: TENANT,
      payment_id: imported.payment_id,
      allocation_type: "direct_fee",
      client_group_id: CLIENT,
      matter_id: MATTER,
      amount: 100,
      currency: "KRW",
      allocated_at: "2026-07-30",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-to-reverse",
  });

  const reversed = reversePaymentAllocation({
    repository,
    reversal: {
      payment_allocation_id: "allocation-reversal",
      tenant_id: TENANT,
      reverses_payment_allocation_id: "allocation-to-reverse",
      reason_code: "classification_correction",
    },
    actor_id: ACTOR,
    idempotency_key: "allocation-reversal",
  });

  assert.equal(reversed.payment.allocated_amount, 0);
  assert.equal(reversed.payment.unallocated_amount, 100);
  assert.equal(reversed.payment.allocation_status, "unallocated");
  assert.equal(reversed.payment.status, "imported");
});

test("migration plan is deterministic and never auto-promotes unmatched cash to revenue", () => {
  const repository = createFinanceRepository();
  const imported = payment(repository);
  const issued = invoice(repository);
  repository.create({
    model_type: "PaymentMatch",
    payment_match_id: "legacy-match",
    tenant_id: TENANT,
    payment_id: imported.payment_id,
    invoice_id: issued.invoice_id,
    amount: 40,
    currency: "KRW",
    matched_at: "2026-07-30",
    status: "matched",
  });
  repository.create({
    model_type: "PaymentMatch",
    payment_match_id: "legacy-cancelled-match",
    tenant_id: TENANT,
    payment_id: imported.payment_id,
    invoice_id: issued.invoice_id,
    amount: 10,
    currency: "KRW",
    matched_at: "2026-07-30",
    status: "cancelled",
  });
  payment(repository, { id: "payment-unmatched", amount: 25 });

  const first = buildPaymentAllocationMigrationPlan({ repository, tenant_id: TENANT });
  const second = buildPaymentAllocationMigrationPlan({ repository, tenant_id: TENANT });
  assert.deepEqual(first, second);
  assert.equal(first.invoice_payment_backfill.length, 1);
  assert.equal(first.unallocated_payments.length, 1);
  assert.equal(first.unallocated_payments[0].payment_id, "payment-unmatched");
  assert.equal(first.auto_promoted_revenue_count, 0);
});

test("PaymentMatch backfill is dry-run safe, idempotent, and does not pay the Invoice twice", () => {
  const repository = createFinanceRepository();
  const imported = payment(repository);
  const issued = invoice(repository);
  repository.create({
    model_type: "PaymentMatch",
    payment_match_id: "legacy-backfill-match",
    tenant_id: TENANT,
    payment_id: imported.payment_id,
    invoice_id: issued.invoice_id,
    amount: 40,
    currency: "KRW",
    matched_at: "2026-07-30",
    status: "matched",
  });
  repository.update(
    { tenant_id: TENANT, model_type: "Invoice", invoice_id: issued.invoice_id },
    { amount_paid: 40, status: "partially_paid" },
  );
  repository.update(
    { tenant_id: TENANT, model_type: "Payment", payment_id: imported.payment_id },
    { applied_amount: 40, unapplied_amount: 60, status: "partially_matched" },
  );

  const before = repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" });
  const dryRun = backfillPaymentMatchesAsAllocations({ repository, tenant_id: TENANT });
  assert.equal(dryRun.dry_run, true);
  assert.deepEqual(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }), before);

  const first = backfillPaymentMatchesAsAllocations({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "backfill-payment-matches",
    dry_run: false,
  });
  const second = backfillPaymentMatchesAsAllocations({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "backfill-payment-matches-second-run",
    dry_run: false,
  });
  assert.equal(first.created_count, 1);
  assert.equal(second.created_count, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 1);
  assert.equal(repository.get({ tenant_id: TENANT, model_type: "Invoice", invoice_id: issued.invoice_id }).amount_paid, 40);
  assert.equal(repository.get({ tenant_id: TENANT, model_type: "Payment", payment_id: imported.payment_id }).applied_amount, 40);
  assert.equal(first.auto_promoted_revenue_count, 0);
});

test("confirmed bank receipt creates at most one Payment and flags a matching manual receipt for review", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-transaction-direct",
        tenant_id: TENANT,
        direction: "inflow",
        amount: 100,
        currency: "KRW",
        date: "2026-07-30",
        occurred_at: "2026-07-30T10:00:00+09:00",
      },
      {
        model_type: "BankTransactionClassification",
        bank_transaction_classification_id: "classification-direct",
        tenant_id: TENANT,
        bank_transaction_id: "bank-transaction-direct",
        category: "client_receipt",
        client_group_id: CLIENT,
        status: "confirmed",
      },
    ],
  });
  payment(repository, { id: "payment-manual-same-cash" });
  const request = {
    repository,
    bank_transaction_id: "bank-transaction-direct",
    payment: {
      payment_id: "payment-from-bank",
      tenant_id: TENANT,
      matter_id: MATTER,
    },
    actor_id: ACTOR,
    idempotency_key: "confirm-bank-direct",
  };
  const confirmed = confirmBankReceipt(request);
  const replay = confirmBankReceipt(request);
  assert.equal(confirmed.payment.client_group_id, CLIENT);
  assert.equal(confirmed.payment.status, "duplicate_review");
  assert.equal(confirmed.payment.duplicate_review_required, true);
  assert.deepEqual(confirmed.payment.duplicate_candidate_payment_ids, ["payment-manual-same-cash"]);
  assert.equal(confirmed.payment.revenue_effect, "none_until_allocated");
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Payment" }).length, 2);
  assert.throws(
    () => confirmBankReceipt({ ...request, idempotency_key: "confirm-bank-direct-again" }),
    /already has a Payment/,
  );
});
