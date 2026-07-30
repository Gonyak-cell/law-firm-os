import assert from "node:assert/strict";
import test from "node:test";
import {
  autoClassifyBankTransactions,
  previewBankTransactionClassifications,
  reviewBankTransactionClassifications,
} from "../src/bank-classification-service.js";
import { createFinanceRepository } from "../src/finance-repository.js";

const TENANT = "tenant-client-deposit-revenue";
const ACTOR = "user-client-deposit-reviewer";

function bankTransaction(id, counterparty, amount = 1_000_000) {
  return {
    model_type: "BankTransaction",
    bank_transaction_id: id,
    tenant_id: TENANT,
    account_ref: "amic-operating",
    transaction_fingerprint: id.padEnd(64, "0").slice(0, 64),
    date: "2026-07-30",
    occurred_at: "2026-07-30T09:00:00+09:00",
    time_precision: "second",
    direction: "inflow",
    amount,
    balance_after: amount,
    currency: "KRW",
    method: "bank_transfer",
    counterparty,
    memo: null,
    source_category: "미분류",
    classification_scope: "unreviewed",
    source_refs: [],
  };
}

function client(clientGroupId, displayName, aliases = []) {
  return {
    model_type: "ClientGroup",
    client_group_id: clientGroupId,
    display_name: displayName,
    approved_aliases: aliases,
    status: "active",
  };
}

function classification(repository, bankTransactionId) {
  return repository.list({
    tenant_id: TENANT,
    model_type: "BankTransactionClassification",
    bank_transaction_id: bankTransactionId,
  })[0];
}

test("VC-CL-REV-002 저장한 입금자명은 다음 입금도 같은 고객으로 연결한다", () => {
  const first = bankTransaction("bank_saved_alias_first", "새봄 대표 입금");
  const next = bankTransaction("bank_saved_alias_next", "새봄 대표 입금");
  const repository = createFinanceRepository({ seedRecords: [first, next] });

  reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: first.bank_transaction_id,
      category: "client_receipt",
      client_group_id: "client-saebom",
      remember_match: true,
    }],
    actor_id: ACTOR,
    idempotency_key: "save-depositor-alias",
  });

  const rules = repository.list({ tenant_id: TENANT, model_type: "BankClassificationRule" });
  const preview = previewBankTransactionClassifications({ transactions: [next], rules });
  assert.equal(rules.length, 1);
  assert.deepEqual(
    {
      client_group_id: preview.classifications[0].client_group_id,
      category: preview.classifications[0].category,
      source: preview.classifications[0].classification_source,
      rationale: preview.classifications[0].rationale_code,
    },
    {
      client_group_id: "client-saebom",
      category: "client_receipt",
      source: "saved_rule",
      rationale: "client_saved_alias",
    },
  );
  repository.close();
});

test("VC-CL-REV-004 동명이인은 자동 연결하지 않고 직원이 고른 고객을 보호한다", () => {
  const transaction = bankTransaction("bank_same_name", "한빛");
  const clients = [
    client("client-hanbit-construction", "한빛"),
    client("client-hanbit-development", "한빛"),
  ];
  const preview = previewBankTransactionClassifications({
    transactions: [transaction],
    client_records: clients,
  });
  assert.deepEqual(
    {
      client_group_id: preview.classifications[0].client_group_id,
      category: preview.classifications[0].category,
      status: preview.classifications[0].status,
      rationale: preview.classifications[0].rationale_code,
    },
    {
      client_group_id: null,
      category: "other_inflow",
      status: "review_required",
      rationale: "client_name_ambiguous",
    },
  );

  const repository = createFinanceRepository({ seedRecords: [transaction] });
  reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: transaction.bank_transaction_id,
      category: "client_receipt",
      client_group_id: "client-hanbit-development",
    }],
    actor_id: ACTOR,
    idempotency_key: "choose-same-name-client",
  });
  const automatic = autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: clients,
    actor_id: ACTOR,
    idempotency_key: "rerun-after-same-name-choice",
  });
  assert.equal(automatic.protected_manual_count, 1);
  assert.deepEqual(
    {
      client_group_id: classification(repository, transaction.bank_transaction_id).client_group_id,
      manual_lock: classification(repository, transaction.bank_transaction_id).manual_lock,
      source: classification(repository, transaction.bank_transaction_id).classification_source,
    },
    {
      client_group_id: "client-hanbit-development",
      manual_lock: true,
      source: "manual_review",
    },
  );
  repository.close();
});

test("VC-CL-REV-007 수동 재연결과 해제는 원본을 바꾸지 않고 감사와 잠금을 남긴다", () => {
  const transaction = bankTransaction("bank_manual_relink", "알파");
  const clients = [
    client("client-alpha", "알파"),
    client("client-beta", "베타"),
  ];
  const repository = createFinanceRepository({ seedRecords: [transaction] });
  const rawBefore = repository.get({
    tenant_id: TENANT,
    model_type: "BankTransaction",
    id: transaction.bank_transaction_id,
  });

  autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: clients,
    actor_id: ACTOR,
    idempotency_key: "initial-client-match",
  });
  reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: transaction.bank_transaction_id,
      category: "client_receipt",
      client_group_id: "client-beta",
      remember_match: true,
    }],
    actor_id: ACTOR,
    idempotency_key: "manual-client-relink",
  });
  assert.equal(classification(repository, transaction.bank_transaction_id).rationale_code, "manual_client_relinked");

  reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: transaction.bank_transaction_id,
      category: "other_inflow",
      client_group_id: "client-beta",
    }],
    actor_id: ACTOR,
    idempotency_key: "manual-client-unlink",
  });
  const afterUnlink = classification(repository, transaction.bank_transaction_id);
  assert.deepEqual(
    {
      category: afterUnlink.category,
      client_group_id: afterUnlink.client_group_id,
      rationale: afterUnlink.rationale_code,
      manual_lock: afterUnlink.manual_lock,
      state_version: afterUnlink.state_version,
    },
    {
      category: "other_inflow",
      client_group_id: null,
      rationale: "manual_client_unlinked",
      manual_lock: true,
      state_version: 3,
    },
  );

  const automatic = autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: clients,
    actor_id: ACTOR,
    idempotency_key: "automatic-after-unlink",
  });
  assert.equal(automatic.protected_manual_count, 1);
  assert.deepEqual(classification(repository, transaction.bank_transaction_id), afterUnlink);
  assert.deepEqual(
    repository.get({
      tenant_id: TENANT,
      model_type: "BankTransaction",
      id: transaction.bank_transaction_id,
    }),
    rawBefore,
  );
  assert.equal(
    repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.action === "bank.transaction.classification.review").length,
    2,
  );
  repository.close();
});

test("manual review rejects duplicate decisions for one bank transaction", () => {
  const transaction = bankTransaction("bank_duplicate_decision", "중복 결정");
  const repository = createFinanceRepository({ seedRecords: [transaction] });
  assert.throws(() => reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [
      { bank_transaction_id: transaction.bank_transaction_id, category: "other_inflow" },
      { bank_transaction_id: transaction.bank_transaction_id, category: "other_inflow" },
    ],
    actor_id: ACTOR,
    idempotency_key: "duplicate-manual-decisions",
  }), /Duplicate classification decision/);
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "BankTransactionClassification",
  }).length, 0);
  repository.close();
});
