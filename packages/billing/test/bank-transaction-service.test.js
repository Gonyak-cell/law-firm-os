import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { importBankTransactionBatch } from "../src/bank-transaction-service.js";
import { createFinanceDomainSnapshot, FINANCE_APPEND_ONLY_RECORD_TYPES } from "../src/central-ledger.js";
import { createFinanceRepository } from "../src/finance-repository.js";

const TENANT = "tenant-bank-test";
const ACTOR = "user-bank-test";
const HASH = "a".repeat(64);

function transaction(overrides = {}) {
  return {
    bank_transaction_id: "bank_tx_001",
    account_ref: "amic-nh-operating",
    transaction_fingerprint: "b".repeat(64),
    date: "2026-07-28",
    occurred_at: "2026-07-28T14:50:03+09:00",
    time_precision: "second",
    direction: "outflow",
    amount: 280000,
    balance_after: 29153222,
    currency: "KRW",
    method: "bank_transfer",
    counterparty: "Synthetic vendor",
    memo: "Synthetic memo",
    source_category: "미분류",
    classification_scope: "unreviewed",
    source_refs: [{ source_type: "pdf", source_hash: HASH, page: 1 }],
    ...overrides,
  };
}

function input() {
  return {
    bank_import_batch: {
      bank_import_batch_id: "bank_import_20260728",
      tenant_id: TENANT,
      source_manifest_hash: HASH,
      account_ref: "amic-nh-operating",
      transaction_count: 2,
      overlap_count: 1,
      source_count: 2,
      production_import_approved: false,
    },
    transactions: [
      transaction(),
      transaction({
        bank_transaction_id: "bank_tx_002",
        transaction_fingerprint: "c".repeat(64),
        occurred_at: "2026-07-28T14:36:59+09:00",
        direction: "inflow",
        amount: 11000000,
        balance_after: 29433222,
        classification_scope: "operating",
      }),
    ],
    actor_id: ACTOR,
    idempotency_key: "bank-import-20260728",
  };
}

test("BankTransaction batch import is atomic, append-only, audited, and idempotent", () => {
  const path = join(mkdtempSync(join(tmpdir(), "bank-transactions-")), "finance.json");
  const repository = createFinanceRepository({ filePath: path });
  const first = importBankTransactionBatch({ repository, ...input() });
  const replay = importBankTransactionBatch({ repository, ...input() });
  assert.equal(first.transaction_count, 2);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BankImportBatch" }).length, 1);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BankTransaction" }).length, 2);
  assert.equal(repository.listAudit({ tenant_id: TENANT })[0].metadata.automatic_revenue_recognition_applied, false);
  repository.close();

  const reopened = createFinanceRepository({ filePath: path });
  assert.equal(reopened.list({ tenant_id: TENANT, model_type: "BankTransaction" }).length, 2);
  reopened.close();
});

test("BankTransaction central-ledger snapshot preserves money and append-only contracts", () => {
  const repository = createFinanceRepository();
  importBankTransactionBatch({ repository, ...input() });
  const domain = createFinanceDomainSnapshot({
    repositories: [{ source_id: "bank-test", repository }],
    tenant_id: TENANT,
  });
  assert.equal(FINANCE_APPEND_ONLY_RECORD_TYPES.includes("BankImportBatch"), true);
  assert.equal(FINANCE_APPEND_ONLY_RECORD_TYPES.includes("BankTransaction"), true);
  assert.equal(domain.inventory.reconciliation.money_field_count, 4);
  assert.equal(domain.inventory.reconciliation.currency_mismatch_count, 0);
  repository.close();
});

test("BankTransaction import rejects duplicate fingerprints and automatic Matter or revenue attribution", () => {
  const repository = createFinanceRepository();
  const duplicate = input();
  duplicate.transactions[1].transaction_fingerprint = duplicate.transactions[0].transaction_fingerprint;
  assert.throws(() => importBankTransactionBatch({ repository, ...duplicate }), /fingerprints must be unique/);
  const attributed = input();
  attributed.transactions[0].matter_id = "matter-auto";
  assert.throws(() => importBankTransactionBatch({ repository, ...attributed }), /separate reviewed classification workflow/);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BankTransaction" }).length, 0);
  repository.close();
});
