import assert from "node:assert/strict";
import test from "node:test";
import { createFinanceRepository } from "../../billing/src/finance-repository.js";
import { buildFinanceReadModels } from "../src/finance-read-model.js";

const TENANT = "tenant-direct-receipt-analytics";

function financeFixture() {
  return createFinanceRepository({
    seedRecords: [
      {
        model_type: "Invoice",
        invoice_id: "invoice-100",
        tenant_id: TENANT,
        matter_id: "matter-a",
        client_group_id: "client-a",
        amount_due: 100,
        amount_paid: 60,
        currency: "KRW",
        issued_at: "2026-07-01",
        status: "partially_paid",
      },
      ...[
        ["payment-direct", 100, "matter-a", "client-a"],
        ["payment-split", 100, "matter-a", "client-a"],
        ["payment-unallocated", 25, "matter-a", "client-a"],
        ["payment-trust", 50, "matter-a", "client-a"],
        ["payment-other", 10, null, null],
      ].map(([payment_id, amount, matter_id, client_group_id]) => ({
        model_type: "Payment",
        payment_id,
        tenant_id: TENANT,
        matter_id,
        client_group_id,
        amount,
        currency: "KRW",
        received_at: "2026-07-05",
        status: "received",
      })),
      {
        model_type: "PaymentAllocation",
        payment_allocation_id: "allocation-direct",
        tenant_id: TENANT,
        payment_id: "payment-direct",
        matter_id: "matter-a",
        client_group_id: "client-a",
        allocation_type: "direct_fee",
        amount: 100,
        currency: "KRW",
        allocated_at: "2026-07-05",
        status: "posted",
      },
      {
        model_type: "PaymentAllocation",
        payment_allocation_id: "allocation-invoice",
        tenant_id: TENANT,
        payment_id: "payment-split",
        invoice_id: "invoice-100",
        matter_id: "matter-a",
        client_group_id: "client-a",
        allocation_type: "invoice_payment",
        amount: 60,
        currency: "KRW",
        allocated_at: "2026-07-05",
        status: "posted",
      },
      {
        model_type: "PaymentAllocation",
        payment_allocation_id: "allocation-advance",
        tenant_id: TENANT,
        payment_id: "payment-split",
        matter_id: "matter-a",
        client_group_id: "client-a",
        allocation_type: "client_advance",
        amount: 40,
        currency: "KRW",
        allocated_at: "2026-07-05",
        status: "posted",
      },
      {
        model_type: "PaymentAllocation",
        payment_allocation_id: "allocation-trust",
        tenant_id: TENANT,
        payment_id: "payment-trust",
        matter_id: "matter-a",
        client_group_id: "client-a",
        allocation_type: "trust_deposit",
        amount: 50,
        currency: "KRW",
        allocated_at: "2026-07-05",
        status: "posted",
      },
      {
        model_type: "PaymentAllocation",
        payment_allocation_id: "allocation-other",
        tenant_id: TENANT,
        payment_id: "payment-other",
        allocation_type: "other_non_revenue",
        amount: 10,
        currency: "KRW",
        allocated_at: "2026-07-05",
        status: "posted",
      },
      {
        model_type: "Expense",
        expense_id: "expense-20",
        tenant_id: TENANT,
        matter_id: "matter-a",
        client_group_id: "client-a",
        amount: 20,
        currency: "KRW",
        expense_date: "2026-07-06",
        status: "approved",
      },
    ],
  });
}

test("allocation types separate billed, collected revenue, advance/trust, other, and unallocated cash", () => {
  const model = buildFinanceReadModels({
    financeRepository: financeFixture(),
    tenant_id: TENANT,
    from: "2026-07-01",
    to: "2026-07-31",
    recognition_basis: "collected",
  });
  const total = model.overview.totals.find((row) => row.currency === "KRW");
  assert.deepEqual(
    {
      billed_amount: total.billed_amount,
      invoice_collected_amount: total.invoice_collected_amount,
      direct_fee_amount: total.direct_fee_amount,
      collected_revenue_amount: total.collected_revenue_amount,
      unallocated_receipt_amount: total.unallocated_receipt_amount,
      advance_trust_amount: total.advance_trust_amount,
      other_non_revenue_amount: total.other_non_revenue_amount,
      revenue_amount: total.revenue_amount,
      contribution_amount: total.contribution_amount,
    },
    {
      billed_amount: 100,
      invoice_collected_amount: 60,
      direct_fee_amount: 100,
      collected_revenue_amount: 160,
      unallocated_receipt_amount: 25,
      advance_trust_amount: 90,
      other_non_revenue_amount: 10,
      revenue_amount: 160,
      contribution_amount: 140,
    },
  );
  const monthly = model.monthly.find((row) => row.month === "2026-07" && row.currency === "KRW");
  assert.equal(monthly.collected_revenue_amount, total.collected_revenue_amount);
  assert.equal(monthly.unallocated_receipt_amount, total.unallocated_receipt_amount);
});

test("recognition basis changes representative revenue and contribution without changing source metrics", () => {
  const repository = financeFixture();
  const billed = buildFinanceReadModels({ financeRepository: repository, tenant_id: TENANT, recognition_basis: "billed" });
  const collected = buildFinanceReadModels({ financeRepository: repository, tenant_id: TENANT, recognition_basis: "collected" });
  const billedTotal = billed.overview.totals.find((row) => row.currency === "KRW");
  const collectedTotal = collected.overview.totals.find((row) => row.currency === "KRW");
  assert.equal(billedTotal.billed_amount, collectedTotal.billed_amount);
  assert.equal(billedTotal.collected_revenue_amount, collectedTotal.collected_revenue_amount);
  assert.equal(billedTotal.revenue_amount, 100);
  assert.equal(billedTotal.contribution_amount, 80);
  assert.equal(collectedTotal.revenue_amount, 160);
  assert.equal(collectedTotal.contribution_amount, 140);
});

test("a raw Payment remains unallocated and does not become revenue", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Payment",
        payment_id: "payment-raw",
        tenant_id: TENANT,
        matter_id: "matter-a",
        client_group_id: "client-a",
        amount: 125,
        currency: "KRW",
        received_at: "2026-07-08",
        status: "received",
      },
    ],
  });
  const model = buildFinanceReadModels({ financeRepository: repository, tenant_id: TENANT, recognition_basis: "collected" });
  const total = model.overview.totals.find((row) => row.currency === "KRW");
  assert.equal(total.collected_revenue_amount, 0);
  assert.equal(total.unallocated_receipt_amount, 125);
  assert.equal(total.revenue_amount, 0);
});

test("a cancelled legacy PaymentMatch does not hide unallocated cash or create revenue", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Invoice",
        invoice_id: "invoice-cancelled-match",
        tenant_id: TENANT,
        matter_id: "matter-a",
        client_group_id: "client-a",
        amount_due: 75,
        amount_paid: 0,
        currency: "KRW",
        issued_at: "2026-07-08",
        status: "issued",
      },
      {
        model_type: "Payment",
        payment_id: "payment-cancelled-match",
        tenant_id: TENANT,
        matter_id: "matter-a",
        client_group_id: "client-a",
        amount: 75,
        currency: "KRW",
        received_at: "2026-07-08",
        status: "imported",
      },
      {
        model_type: "PaymentMatch",
        payment_match_id: "match-cancelled",
        tenant_id: TENANT,
        payment_id: "payment-cancelled-match",
        invoice_id: "invoice-cancelled-match",
        amount: 75,
        currency: "KRW",
        matched_at: "2026-07-08",
        status: "cancelled",
      },
    ],
  });
  const model = buildFinanceReadModels({ financeRepository: repository, tenant_id: TENANT, recognition_basis: "collected" });
  const total = model.overview.totals.find((row) => row.currency === "KRW");
  assert.equal(total.invoice_collected_amount, 0);
  assert.equal(total.collected_revenue_amount, 0);
  assert.equal(total.unallocated_receipt_amount, 75);
});

test("reversed direct fee is excluded when the same cash is reallocated to an Invoice", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      { model_type: "Invoice", invoice_id: "invoice-later", tenant_id: TENANT, matter_id: "matter-a", client_group_id: "client-a", amount_due: 30, amount_paid: 30, currency: "KRW", issued_at: "2026-07-10", status: "paid" },
      { model_type: "Payment", payment_id: "payment-later", tenant_id: TENANT, matter_id: "matter-a", client_group_id: "client-a", amount: 30, currency: "KRW", received_at: "2026-07-09", status: "allocated" },
      { model_type: "PaymentAllocation", payment_allocation_id: "allocation-old-direct", tenant_id: TENANT, payment_id: "payment-later", matter_id: "matter-a", client_group_id: "client-a", allocation_type: "direct_fee", amount: 30, currency: "KRW", allocated_at: "2026-07-09", status: "posted" },
      { model_type: "PaymentAllocation", payment_allocation_id: "allocation-old-direct-reversal", tenant_id: TENANT, payment_id: "payment-later", matter_id: "matter-a", client_group_id: "client-a", allocation_type: "direct_fee", amount: 30, currency: "KRW", allocated_at: "2026-07-10", status: "reversed", reverses_payment_allocation_id: "allocation-old-direct" },
      { model_type: "PaymentAllocation", payment_allocation_id: "allocation-new-invoice", tenant_id: TENANT, payment_id: "payment-later", invoice_id: "invoice-later", matter_id: "matter-a", client_group_id: "client-a", allocation_type: "invoice_payment", amount: 30, currency: "KRW", allocated_at: "2026-07-10", status: "posted" },
    ],
  });
  const model = buildFinanceReadModels({ financeRepository: repository, tenant_id: TENANT, recognition_basis: "collected" });
  const total = model.overview.totals.find((row) => row.currency === "KRW");
  assert.equal(total.direct_fee_amount, 0);
  assert.equal(total.invoice_collected_amount, 30);
  assert.equal(total.collected_revenue_amount, 30);
});
