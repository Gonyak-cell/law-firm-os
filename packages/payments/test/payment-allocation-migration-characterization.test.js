import assert from "node:assert/strict";
import test from "node:test";
import { canonicalFinanceRequestFingerprint, createFinanceRepository } from "../../billing/src/finance-repository.js";
import { confirmBankReceipt } from "../src/payment-service.js";
import {
  backfillPaymentMatchesAsAllocations,
  buildPaymentAllocationMigrationPlan,
} from "../src/payment-allocation-migration.js";

const TENANT = "tenant-rfd-tuw-019";
const ACTOR = "actor-rfd-tuw-019";
const DATE = "2026-07-30";
const VOLATILE_RECEIPT_FIELDS = new Set(["created_at", "updated_at", "occurred_at"]);
const EXPECTED_BACKFILL_RECEIPT_KEYS = [
  "audit_event",
  "auto_promoted_revenue_count",
  "created_count",
  "dry_run",
  "idempotent_replay",
  "outcome",
  "payment_allocations",
  "unallocated_payments",
];

function migrationFixture({ reverse = false } = {}) {
  const records = [
    {
      model_type: "Payment",
      payment_id: "payment-zeta",
      tenant_id: TENANT,
      amount: 90,
      currency: "KRW",
      matter_id: "matter-zeta",
      client_group_id: "client-zeta",
      status: "matched",
    },
    {
      model_type: "Invoice",
      invoice_id: "invoice-zeta",
      tenant_id: TENANT,
      amount_due: 90,
      amount_paid: 0,
      currency: "KRW",
      status: "issued",
    },
    {
      model_type: "PaymentMatch",
      payment_match_id: "match-zeta",
      tenant_id: TENANT,
      payment_id: "payment-zeta",
      invoice_id: "invoice-zeta",
      amount: 90,
      currency: "KRW",
      matter_id: "matter-zeta",
      matched_at: DATE,
      status: "matched",
    },
    {
      model_type: "Payment",
      payment_id: "payment-alpha",
      tenant_id: TENANT,
      amount: 40,
      currency: "KRW",
      matter_id: "matter-alpha",
      client_group_id: "client-alpha",
      status: "partially_matched",
    },
    {
      model_type: "Invoice",
      invoice_id: "invoice-alpha",
      tenant_id: TENANT,
      amount_due: 40,
      amount_paid: 0,
      currency: "KRW",
      status: "issued",
    },
    {
      model_type: "PaymentMatch",
      payment_match_id: "match-alpha",
      tenant_id: TENANT,
      payment_id: "payment-alpha",
      invoice_id: "invoice-alpha",
      amount: 20,
      currency: "KRW",
      matter_id: "matter-alpha",
      matched_at: DATE,
      status: "matched",
    },
    {
      model_type: "Payment",
      payment_id: "payment-unmatched",
      tenant_id: TENANT,
      amount: 55,
      currency: "KRW",
      matter_id: "matter-unmatched",
      client_group_id: "client-unmatched",
      status: "imported",
    },
    {
      model_type: "PaymentMatch",
      payment_match_id: "match-cancelled",
      tenant_id: TENANT,
      payment_id: "payment-unmatched",
      invoice_id: "invoice-alpha",
      amount: 10,
      currency: "KRW",
      matched_at: DATE,
      status: "cancelled",
    },
    {
      model_type: "Payment",
      payment_id: "payment-represented",
      tenant_id: TENANT,
      amount: 35,
      currency: "KRW",
      matter_id: "matter-represented",
      client_group_id: "client-represented",
      status: "matched",
    },
    {
      model_type: "Invoice",
      invoice_id: "invoice-represented",
      tenant_id: TENANT,
      amount_due: 35,
      amount_paid: 0,
      currency: "KRW",
      status: "issued",
    },
    {
      model_type: "PaymentMatch",
      payment_match_id: "match-represented",
      tenant_id: TENANT,
      payment_id: "payment-represented",
      invoice_id: "invoice-represented",
      amount: 35,
      currency: "KRW",
      matter_id: "matter-represented",
      matched_at: DATE,
      status: "matched",
    },
    {
      model_type: "PaymentAllocation",
      payment_allocation_id: "allocation:match-represented",
      tenant_id: TENANT,
      payment_id: "payment-represented",
      invoice_id: "invoice-represented",
      allocation_type: "invoice_payment",
      amount: 35,
      currency: "KRW",
      matter_id: "matter-represented",
      source_payment_match_id: "match-represented",
      status: "posted",
      allocated_at: DATE,
    },
  ];
  return createFinanceRepository({ seedRecords: reverse ? records.reverse() : records });
}

function failureFixture() {
  return createFinanceRepository({
    seedRecords: [
      {
        model_type: "Payment",
        payment_id: "payment-failure-01-valid",
        tenant_id: TENANT,
        amount: 100,
        currency: "KRW",
        matter_id: "matter-failure",
        client_group_id: "client-failure",
        status: "matched",
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice-failure-01-valid",
        tenant_id: TENANT,
        amount_due: 100,
        amount_paid: 0,
        currency: "KRW",
        status: "issued",
      },
      {
        model_type: "PaymentMatch",
        payment_match_id: "match-failure-01-valid",
        tenant_id: TENANT,
        payment_id: "payment-failure-01-valid",
        invoice_id: "invoice-failure-01-valid",
        amount: 25,
        currency: "KRW",
        matter_id: "matter-failure",
        matched_at: DATE,
        status: "matched",
      },
      {
        model_type: "Payment",
        payment_id: "payment-failure-02-missing-invoice",
        tenant_id: TENANT,
        amount: 100,
        currency: "KRW",
        matter_id: "matter-failure",
        client_group_id: "client-failure",
        status: "matched",
      },
      {
        model_type: "PaymentMatch",
        payment_match_id: "match-failure-02-missing-invoice",
        tenant_id: TENANT,
        payment_id: "payment-failure-02-missing-invoice",
        invoice_id: "invoice-failure-02-missing",
        amount: 25,
        currency: "KRW",
        matter_id: "matter-failure",
        matched_at: DATE,
        status: "matched",
      },
    ],
  });
}

function stableReceipt(value) {
  if (Array.isArray(value)) return value.map(stableReceipt);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !VOLATILE_RECEIPT_FIELDS.has(key))
      .map(([key, entry]) => [key, stableReceipt(entry)]),
  );
}

const EXPECTED_PLAN = {
  tenant_id: TENANT,
  invoice_payment_backfill: [
    {
      payment_allocation_id: "allocation:match-alpha",
      tenant_id: TENANT,
      payment_id: "payment-alpha",
      invoice_id: "invoice-alpha",
      allocation_type: "invoice_payment",
      amount: 20,
      currency: "KRW",
      matter_id: "matter-alpha",
      allocated_at: DATE,
      source_payment_match_id: "match-alpha",
    },
    {
      payment_allocation_id: "allocation:match-zeta",
      tenant_id: TENANT,
      payment_id: "payment-zeta",
      invoice_id: "invoice-zeta",
      allocation_type: "invoice_payment",
      amount: 90,
      currency: "KRW",
      matter_id: "matter-zeta",
      allocated_at: DATE,
      source_payment_match_id: "match-zeta",
    },
  ],
  matched_payments: [
    { payment_id: "payment-alpha", payment_amount: 40, matched_amount: 20 },
    { payment_id: "payment-represented", payment_amount: 35, matched_amount: 35 },
    { payment_id: "payment-zeta", payment_amount: 90, matched_amount: 90 },
  ],
  unallocated_payments: [
    { payment_id: "payment-unmatched", amount: 55, currency: "KRW" },
  ],
  auto_promoted_revenue_count: 0,
  dry_run: true,
};

test("RFD-TUW-019 freezes migration plan ordering and canonical bytes", () => {
  const plan = buildPaymentAllocationMigrationPlan({
    repository: migrationFixture(),
    tenant_id: TENANT,
  });
  const reversedInputPlan = buildPaymentAllocationMigrationPlan({
    repository: migrationFixture({ reverse: true }),
    tenant_id: TENANT,
  });

  assert.deepEqual(plan, EXPECTED_PLAN);
  assert.deepEqual(reversedInputPlan, EXPECTED_PLAN);
  assert.deepEqual(
    plan.invoice_payment_backfill.map((row) => row.payment_allocation_id),
    ["allocation:match-alpha", "allocation:match-zeta"],
  );
  assert.deepEqual(
    plan.matched_payments.map((row) => row.payment_id),
    ["payment-alpha", "payment-represented", "payment-zeta"],
  );
  assert.deepEqual(
    plan.unallocated_payments.map((row) => row.payment_id),
    ["payment-unmatched"],
  );
  assert.equal(canonicalFinanceRequestFingerprint(plan), "c424e29c25cfc2ffa4cbe4c040cc97f3ad46d70f44421ca1cf1482ce2a88776a");
  assert.equal(canonicalFinanceRequestFingerprint(plan), canonicalFinanceRequestFingerprint(reversedInputPlan));
});

test("RFD-TUW-019 freezes a byte-equivalent backfill receipt after volatile timestamps are removed", () => {
  const first = backfillPaymentMatchesAsAllocations({
    repository: migrationFixture(),
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "rfd-tuw-019-receipt",
    dry_run: false,
  });
  const second = backfillPaymentMatchesAsAllocations({
    repository: migrationFixture({ reverse: true }),
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "rfd-tuw-019-receipt",
    dry_run: false,
  });
  const firstStable = stableReceipt(first);
  const secondStable = stableReceipt(second);

  assert.equal(first.created_count, 2);
  assert.equal(first.dry_run, false);
  assert.equal(first.idempotent_replay, false);
  assert.deepEqual(
    first.payment_allocations.map((row) => row.payment_allocation_id),
    ["allocation:match-alpha", "allocation:match-zeta"],
  );
  assert.deepEqual(Object.keys(firstStable).sort(), EXPECTED_BACKFILL_RECEIPT_KEYS);
  assert.deepEqual(Object.keys(secondStable).sort(), EXPECTED_BACKFILL_RECEIPT_KEYS);
  assert.deepEqual(firstStable, secondStable);
  assert.equal(JSON.stringify(firstStable), JSON.stringify(secondStable));
  assert.equal(canonicalFinanceRequestFingerprint(firstStable), "d2d3fcfb836d36327cfa17d8d2cef228c930aa870e9d02aa97a2e98e49af0966");
});

test("RFD-TUW-019 keeps dry-run writes at zero and same-key replay writes at zero", () => {
  const repository = migrationFixture();
  const beforeDryRun = repository.snapshot();
  const dryRun = backfillPaymentMatchesAsAllocations({ repository, tenant_id: TENANT });

  assert.equal(dryRun.dry_run, true);
  assert.equal(dryRun.created_count, undefined);
  assert.deepEqual(repository.snapshot(), beforeDryRun);

  const execute = backfillPaymentMatchesAsAllocations({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "rfd-tuw-019-replay",
    dry_run: false,
  });
  const beforeReplay = repository.snapshot();
  const replay = backfillPaymentMatchesAsAllocations({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "rfd-tuw-019-replay",
    dry_run: false,
  });

  assert.equal(execute.created_count, 2);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.created_count, 2);
  const executeStable = stableReceipt(execute);
  const replayStable = stableReceipt(replay);
  assert.deepEqual(Object.keys(replayStable).sort(), EXPECTED_BACKFILL_RECEIPT_KEYS);
  assert.deepEqual(replayStable, { ...executeStable, idempotent_replay: true });
  assert.equal(JSON.stringify(replayStable), JSON.stringify({ ...executeStable, idempotent_replay: true }));
  assert.equal(canonicalFinanceRequestFingerprint(replayStable), "4f7ebe0d31e32807300ab5ddd185eee3cbe92c85322adcf51e43a151fc55fa34");
  assert.equal(
    canonicalFinanceRequestFingerprint({ ...replayStable, idempotent_replay: false }),
    canonicalFinanceRequestFingerprint(executeStable),
  );
  assert.deepEqual(repository.snapshot(), beforeReplay);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 3);
});

test("RFD-TUW-019 rolls back all writes when a later backfill candidate is invalid", () => {
  const repository = failureFixture();
  const before = repository.snapshot();

  assert.throws(
    () => backfillPaymentMatchesAsAllocations({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "rfd-tuw-019-failure",
      dry_run: false,
    }),
    /PaymentMatch backfill requires Payment and Invoice/,
  );

  assert.deepEqual(repository.snapshot(), before);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 0);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 0);
});

test("RFD-TUW-019 leaves an unmatched bank inflow imported and outside revenue", () => {
  const repository = createFinanceRepository({
    seedRecords: [{
      model_type: "BankTransaction",
      bank_transaction_id: "bank-rfd-tuw-019-unmatched",
      tenant_id: TENANT,
      direction: "inflow",
      amount: 75,
      currency: "KRW",
      date: DATE,
      occurred_at: `${DATE}T10:00:00+09:00`,
    }],
  });
  const imported = confirmBankReceipt({
    repository,
    bank_transaction_id: "bank-rfd-tuw-019-unmatched",
    payment: {
      payment_id: "payment-rfd-tuw-019-unmatched",
      tenant_id: TENANT,
      matter_id: "matter-unmatched",
    },
    actor_id: ACTOR,
    idempotency_key: "rfd-tuw-019-unmatched-bank",
  });

  assert.equal(imported.payment.status, "imported");
  assert.equal(imported.payment.revenue_effect, "none_until_allocated");
  assert.equal(imported.payment.client_group_id, null);
  const plan = buildPaymentAllocationMigrationPlan({ repository, tenant_id: TENANT });
  assert.deepEqual(plan.unallocated_payments, [
    { payment_id: "payment-rfd-tuw-019-unmatched", amount: 75, currency: "KRW" },
  ]);
  assert.equal(plan.auto_promoted_revenue_count, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentAllocation" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BankTransactionClassification" }).length, 0);
});
