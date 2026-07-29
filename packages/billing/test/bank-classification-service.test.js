import assert from "node:assert/strict";
import test from "node:test";
import {
  autoClassifyBankTransactions,
  previewBankTransactionClassifications,
  reviewBankTransactionClassifications,
} from "../src/bank-classification-service.js";
import { importBankTransactionBatch } from "../src/bank-transaction-service.js";
import { createFinanceRepository } from "../src/finance-repository.js";

const TENANT = "tenant-bank-classification";
const ACTOR = "user-bank-classification";

function bankTransaction(id, overrides = {}) {
  return {
    bank_transaction_id: id,
    account_ref: "amic-operating",
    transaction_fingerprint: id.slice(-1).repeat(64),
    date: "2026-07-24",
    occurred_at: "2026-07-24T12:00:00+09:00",
    time_precision: "second",
    direction: "outflow",
    amount: 1000,
    balance_after: 10000,
    currency: "KRW",
    method: "bank_transfer",
    counterparty: "일반 거래처",
    memo: null,
    source_category: "미분류",
    classification_scope: "unreviewed",
    source_refs: [],
    ...overrides,
  };
}

function fixtureTransactions() {
  return [
    bankTransaction("bank_tx_a", {
      direction: "inflow",
      amount: 11000000,
      counterparty: "(주)베스트이노",
    }),
    bankTransaction("bank_tx_b", {
      amount: 10652530,
      counterparty: "7월 급여 JWS",
      memo: null,
    }),
    bankTransaction("bank_tx_c", {
      amount: 5740440,
      method: "보험료",
      counterparty: "2606국민건강",
    }),
    bankTransaction("bank_tx_d", {
      amount: 3717302,
      method: "NH카드대금",
      counterparty: "NH카드인터넷",
    }),
    bankTransaction("bank_tx_e", {
      direction: "inflow",
      amount: 50000000,
      counterparty: "주식회사 페트라브릿",
    }),
    bankTransaction("bank_tx_f", {
      direction: "inflow",
      amount: 13400,
      counterparty: "NH매출취소",
    }),
    bankTransaction("bank_tx_0", {
      amount: 0,
      zero_amount_source_record: true,
    }),
  ];
}

const clients = [
  {
    model_type: "ClientGroup",
    client_group_id: "client-best",
    display_name: "베스트이노베이션",
    status: "active",
  },
];

const employees = [
  {
    employee_id: "emp-jws",
    display_name: "서지원",
    title: "대표변호사",
    aliases: ["JWS"],
    status: "active",
  },
];

function importedRepository() {
  const repository = createFinanceRepository();
  const transactions = fixtureTransactions();
  importBankTransactionBatch({
    repository,
    bank_import_batch: {
      bank_import_batch_id: "bank_batch_classification",
      tenant_id: TENANT,
      source_manifest_hash: "a".repeat(64),
      account_ref: "amic-operating",
      transaction_count: transactions.length,
      overlap_count: 0,
      source_count: 1,
    },
    transactions,
    actor_id: ACTOR,
    idempotency_key: "import-classification-fixture",
  });
  return repository;
}

test("bank classification preview links registered-client inflows and exact payroll without Invoice", () => {
  const preview = previewBankTransactionClassifications({
    transactions: fixtureTransactions().map((row) => ({ ...row, tenant_id: TENANT })),
    client_records: clients,
    employees,
  });
  assert.equal(preview.summary.transaction_count, 7);
  assert.equal(preview.summary.review_count, 0);
  const byId = new Map(preview.classifications.map((row) => [row.bank_transaction_id, row]));
  assert.deepEqual(
    {
      primary_type: byId.get("bank_tx_a").primary_type,
      category: byId.get("bank_tx_a").category,
      client_group_id: byId.get("bank_tx_a").client_group_id,
      invoice_required: byId.get("bank_tx_a").invoice_required,
    },
    {
      primary_type: "sales",
      category: "client_receipt",
      client_group_id: "client-best",
      invoice_required: false,
    },
  );
  assert.equal(byId.get("bank_tx_b").primary_type, "payroll");
  assert.equal(byId.get("bank_tx_b").employee_id, "emp-jws");
  assert.equal(byId.get("bank_tx_b").payroll_category, "partner");
  assert.equal(byId.get("bank_tx_c").category, "social_insurance");
  assert.equal(byId.get("bank_tx_d").category, "card_settlement");
  assert.equal(byId.get("bank_tx_e").category, "related_party_transfer");
  assert.equal(byId.get("bank_tx_f").category, "refund_reversal");
  assert.equal(byId.get("bank_tx_0").category, "zero_amount_source");
});

test("automatic classification is audited, idempotent, and leaves raw bank transactions unchanged", () => {
  const repository = importedRepository();
  const before = repository.list({ tenant_id: TENANT, model_type: "BankTransaction" });
  const first = autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: clients,
    employees,
    actor_id: ACTOR,
    idempotency_key: "auto-classify-fixture",
  });
  const replay = autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: clients,
    employees,
    actor_id: ACTOR,
    idempotency_key: "auto-classify-fixture",
  });
  assert.equal(first.summary.transaction_count, 7);
  assert.equal(first.summary.confirmed_count, 7);
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(repository.list({ tenant_id: TENANT, model_type: "BankTransaction" }), before);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).some((event) => event.action === "bank.transaction.classification.auto"), true);
  repository.close();
});

test("manual review overrides one classification and saves an exact reusable rule", () => {
  const repository = importedRepository();
  autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: clients,
    employees,
    actor_id: ACTOR,
    idempotency_key: "auto-before-review",
  });
  const reviewed = reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: "bank_tx_f",
      category: "client_receipt",
      client_group_id: "client-best",
      remember_match: true,
    }],
    actor_id: ACTOR,
    idempotency_key: "manual-review-fixture",
  });
  assert.equal(reviewed.updated_count, 1);
  assert.equal(reviewed.rule_count, 1);
  const classification = repository.list({
    tenant_id: TENANT,
    model_type: "BankTransactionClassification",
    bank_transaction_id: "bank_tx_f",
  })[0];
  assert.equal(classification.primary_type, "sales");
  assert.equal(classification.classification_source, "manual_review");
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BankClassificationRule" }).length, 1);
  repository.close();
});

test("classification rejects sales without a client while allowing bank-confirmed payroll without a resolved employee", () => {
  const repository = importedRepository();
  assert.throws(() => reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{ bank_transaction_id: "bank_tx_f", category: "client_receipt" }],
    actor_id: ACTOR,
    idempotency_key: "invalid-sales-review",
  }), /linked to a client/);
  const payroll = reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{ bank_transaction_id: "bank_tx_d", category: "salary_payment" }],
    actor_id: ACTOR,
    idempotency_key: "invalid-payroll-review",
  });
  assert.equal(payroll.created_count, 1);
  const classification = repository.list({
    tenant_id: TENANT,
    model_type: "BankTransactionClassification",
    bank_transaction_id: "bank_tx_d",
  })[0];
  assert.equal(classification.payroll_category, "unclassified");
  repository.close();
});
