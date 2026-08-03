import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import {
  runFinanceAccountingCsvExport,
  runFinanceArAgingRead,
  runFinanceTrustBalanceRead,
} from "../src/finance-read-export-boundary.js";

const TENANT = "tenant_rfd_tuw_033";
const ACTOR = "actor_rfd_tuw_033";

function agingRepository() {
  return createFinanceRepository({
    seedRecords: [
      { model_type: "ARBalance", ar_balance_id: "ar-current", tenant_id: TENANT, invoice_id: "invoice-current", due_date: "2026-08-01", balance: 100 },
      { model_type: "ARBalance", ar_balance_id: "ar-1-30", tenant_id: TENANT, invoice_id: "invoice-1-30", due_date: "2026-07-20", balance: 200 },
      { model_type: "ARBalance", ar_balance_id: "ar-31-60", tenant_id: TENANT, invoice_id: "invoice-31-60", due_date: "2026-06-15", balance: 300 },
      { model_type: "ARBalance", ar_balance_id: "ar-61-90", tenant_id: TENANT, invoice_id: "invoice-61-90", due_date: "2026-05-15", balance: 400 },
      { model_type: "ARBalance", ar_balance_id: "ar-90-plus", tenant_id: TENANT, invoice_id: "invoice-90-plus", due_date: "2026-04-01", balance: 500 },
    ],
  });
}

function exportRepository() {
  return createFinanceRepository({
    seedRecords: [
      {
        model_type: "JournalEntry",
        journal_entry_id: "journal-rfd033-1",
        tenant_id: TENANT,
        matter_id: "matter-rfd033",
        source_ref: "source,one",
        currency: "KRW",
        posted_at: "2026-07-02T00:00:00.000Z",
        lines: [
          { account: "ar", debit: 100.1, credit: 0 },
          { account: "revenue", debit: 0, credit: 100.1 },
        ],
      },
      {
        model_type: "JournalEntry",
        journal_entry_id: "journal-rfd033-2",
        tenant_id: TENANT,
        matter_id: "matter-rfd033",
        source_ref: "source\ntwo",
        currency: "KRW",
        posted_at: "2026-07-03T00:00:00.000Z",
        lines: [
          { account: "ar,quoted\"account", debit: 200, credit: 0 },
          { account: "revenue", debit: 0, credit: 200 },
        ],
      },
      {
        model_type: "JournalEntry",
        journal_entry_id: "journal-rfd033-outside-window",
        tenant_id: TENANT,
        matter_id: "matter-rfd033",
        source_ref: "outside",
        currency: "KRW",
        posted_at: "2026-06-30T00:00:00.000Z",
        lines: [
          { account: "ar", debit: 999, credit: 0 },
          { account: "revenue", debit: 0, credit: 999 },
        ],
      },
    ],
  });
}

test("RFD-TUW-033 trust read composes canonical totals and sanitizes sensitive fields", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "TrustBalance",
        trust_balance_id: "trust-rfd033-a",
        tenant_id: TENANT,
        matter_id: "matter-rfd033-a",
        currency: "KRW",
        available_balance: 750,
        refund_liability_amount: 900,
        deposit_total: 1000,
        drawdown_total: 150,
        refund_total: 100,
        bank_reference: "must-not-render",
      },
      {
        model_type: "TrustBalance",
        trust_balance_id: "trust-rfd033-b",
        tenant_id: TENANT,
        matter_id: "matter-rfd033-b",
        currency: "KRW",
        available_balance: 300,
        refund_liability_amount: 300,
        deposit_total: 300,
        drawdown_total: 0,
        refund_total: 0,
      },
    ],
  });
  const report = runFinanceTrustBalanceRead({ repository, tenant_id: TENANT, currency: "KRW" });
  assert.deepEqual(report.items.map((item) => item.trust_balance_id), ["trust-rfd033-a", "trust-rfd033-b"]);
  assert.deepEqual(report.summary, {
    available_balance: 1050,
    refund_liability_amount: 1200,
    deposit_total: 1300,
    drawdown_total: 150,
    refund_total: 100,
    tenant_id: TENANT,
    matter_id: null,
    currency: "KRW",
    segregated_client_funds: true,
    negative_trust_balance_blocked: true,
    production_ready_claim: false,
  });
  assert.equal(report.items[0].bank_reference, undefined);
  assert.equal(report.items[0].bank_reference_included, false);
  assert.equal(report.items[0].production_ready_claim, false);
});

test("RFD-TUW-033 AR read keeps canonical bucket order/amounts and generated snapshot semantics", () => {
  const repository = agingRepository();
  const report = runFinanceArAgingRead({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    as_of_date: "2026-08-01",
    idempotency_key: "ar-rfd033",
    ar_aging_snapshot_id: "ar-aging-rfd033",
  });
  assert.equal(report.generated_snapshot, true);
  const [snapshot] = report.items;
  assert.deepEqual(
    [snapshot.bucket_current, snapshot.bucket_1_30, snapshot.bucket_31_60, snapshot.bucket_61_90, snapshot.bucket_90_plus],
    [100, 200, 300, 400, 500],
  );
  assert.deepEqual(
    Object.keys(snapshot).filter((key) => [
      "bucket_current",
      "bucket_1_30",
      "bucket_31_60",
      "bucket_61_90",
      "bucket_90_plus",
    ].includes(key)),
    ["bucket_current", "bucket_1_30", "bucket_31_60", "bucket_61_90", "bucket_90_plus"],
  );
  assert.equal(snapshot.balance_count, 5);
  const replay = runFinanceArAgingRead({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    as_of_date: "2026-08-01",
    idempotency_key: "ar-rfd033",
    ar_aging_snapshot_id: "ar-aging-rfd033",
  });
  assert.equal(replay.generated_snapshot, false);
  assert.deepEqual(replay.items, report.items);
});

test("RFD-TUW-033 accounting CSV keeps escaping/order and byte-equivalent SHA on replay", () => {
  const repository = exportRepository();
  const first = runFinanceAccountingCsvExport({
    repository,
    tenant_id: TENANT,
    from_date: "2026-07-01",
    to_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "export-rfd033",
    accounting_export_id: "accounting-export-rfd033",
  });
  const csv = first.accounting_export.csv_text;
  const expectedCsv = [
    "journal_entry_id,posting_date,source_ref,matter_id,account,debit,credit,currency",
    "journal-rfd033-1,2026-07-02,\"source,one\",matter-rfd033,ar,100.1,0,KRW",
    "journal-rfd033-1,2026-07-02,\"source,one\",matter-rfd033,revenue,0,100.1,KRW",
    "journal-rfd033-2,2026-07-03,\"source\ntwo\",matter-rfd033,\"ar,quoted\"\"account\",200,0,KRW",
    "journal-rfd033-2,2026-07-03,\"source\ntwo\",matter-rfd033,revenue,0,200,KRW",
    "",
  ].join("\n");
  assert.equal(csv, expectedCsv);
  assert.equal(first.accounting_export.csv_sha256, createHash("sha256").update(expectedCsv).digest("hex"));
  assert.equal(first.accounting_export.row_count, 4);
  assert.equal(first.accounting_export.debit_total, 300.1);
  assert.equal(first.accounting_export.credit_total, 300.1);
  assert.equal(first.accounting_export.balanced, true);
  assert.equal(first.accounting_export.bank_reference_included, false);
  const afterFirst = repository.snapshot();
  const replay = runFinanceAccountingCsvExport({
    repository,
    tenant_id: TENANT,
    from_date: "2026-07-01",
    to_date: "2026-07-31",
    actor_id: ACTOR,
    idempotency_key: "export-rfd033",
    accounting_export_id: "accounting-export-rfd033",
  });
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(replay.accounting_export, first.accounting_export);
  assert.deepEqual(repository.snapshot(), afterFirst);
});
