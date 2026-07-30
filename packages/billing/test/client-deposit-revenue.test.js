import assert from "node:assert/strict";
import test from "node:test";
import {
  autoClassifyBankTransactions,
  previewBankTransactionClassifications,
  reviewBankTransactionClassifications,
} from "../src/bank-classification-service.js";
import { FINANCE_DOMAIN_DESCRIPTOR } from "../src/central-ledger.js";
import { createFinanceRepository } from "../src/finance-repository.js";

const TENANT = "tenant-client-deposit-revenue";
const ACTOR = "user-client-deposit-reviewer";

function bankTransaction(id, counterparty, amount = 1_000_000, overrides = {}) {
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
    ...overrides,
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

test("VC-CL-REV-008 고객 환불은 원입금과 고객을 잇고 누적 원입금액을 넘지 않는다", () => {
  const original = bankTransaction("bank_refund_origin", "새봄테크", 3_000_000, {
    date: "2026-06-25",
    occurred_at: "2026-06-25T09:00:00+09:00",
  });
  const firstRefund = bankTransaction("bank_refund_first", "새봄테크 고객 환불", 1_000_000, {
    date: "2026-07-25",
    occurred_at: "2026-07-25T09:00:00+09:00",
    direction: "outflow",
    source_category: "고객 환불",
  });
  const secondRefund = bankTransaction("bank_refund_second", "새봄테크 고객 환불", 1_500_000, {
    date: "2026-07-26",
    occurred_at: "2026-07-26T09:00:00+09:00",
    direction: "outflow",
    source_category: "고객 환불",
  });
  const excessiveRefund = bankTransaction("bank_refund_excess", "새봄테크 고객 환불", 600_000, {
    date: "2026-07-27",
    occurred_at: "2026-07-27T09:00:00+09:00",
    direction: "outflow",
    source_category: "고객 환불",
  });
  const repository = createFinanceRepository({
    seedRecords: [original, firstRefund, secondRefund, excessiveRefund],
  });
  const rawBefore = repository.list({ tenant_id: TENANT, model_type: "BankTransaction" });
  autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: [client("client-saebom", "새봄테크")],
    actor_id: ACTOR,
    idempotency_key: "classify-refund-fixture",
  });
  assert.equal(classification(repository, original.bank_transaction_id).category, "client_receipt");
  assert.deepEqual(
    {
      category: classification(repository, firstRefund.bank_transaction_id).category,
      status: classification(repository, firstRefund.bank_transaction_id).status,
      rationale: classification(repository, firstRefund.bank_transaction_id).rationale_code,
      refund_of: classification(repository, firstRefund.bank_transaction_id).refund_of_bank_transaction_id,
    },
    {
      category: "refund_reversal",
      status: "review_required",
      rationale: "refund_link_required",
      refund_of: null,
    },
  );

  const linked = reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: firstRefund.bank_transaction_id,
      category: "refund_reversal",
      refund_of_bank_transaction_id: original.bank_transaction_id,
      client_group_id: "client-attacker-supplied",
      remember_match: true,
    }],
    actor_id: ACTOR,
    idempotency_key: "link-first-refund",
  });
  assert.equal(linked.rule_count, 0);
  const firstLinkedRefund = classification(repository, firstRefund.bank_transaction_id);
  assert.deepEqual(
    {
      client_group_id: firstLinkedRefund.client_group_id,
      refund_of: firstLinkedRefund.refund_of_bank_transaction_id,
      category: firstLinkedRefund.category,
      status: firstLinkedRefund.status,
      rationale: firstLinkedRefund.rationale_code,
      manual_lock: firstLinkedRefund.manual_lock,
    },
    {
      client_group_id: "client-saebom",
      refund_of: original.bank_transaction_id,
      category: "refund_reversal",
      status: "confirmed",
      rationale: "manual_refund_linked",
      manual_lock: true,
    },
  );
  const refundOriginReference = FINANCE_DOMAIN_DESCRIPTOR.references(firstLinkedRefund)
    .find((reference) => reference.reference_name === "refund_origin_bank_transaction");
  assert.deepEqual(
    {
      target_record_type: refundOriginReference.target_record_type,
      target_record_id: refundOriginReference.target_record_id,
      required: refundOriginReference.required,
    },
    {
      target_record_type: "BankTransaction",
      target_record_id: original.bank_transaction_id,
      required: true,
    },
  );

  assert.throws(() => reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [
      {
        bank_transaction_id: secondRefund.bank_transaction_id,
        category: "refund_reversal",
        refund_of_bank_transaction_id: original.bank_transaction_id,
      },
      {
        bank_transaction_id: excessiveRefund.bank_transaction_id,
        category: "refund_reversal",
        refund_of_bank_transaction_id: original.bank_transaction_id,
      },
    ],
    actor_id: ACTOR,
    idempotency_key: "reject-cumulative-over-refund",
  }), (error) => error?.safe_error_code === "FINANCE_REFUND_AMOUNT_EXCEEDED");
  assert.equal(classification(repository, secondRefund.bank_transaction_id).status, "review_required");
  assert.equal(classification(repository, excessiveRefund.bank_transaction_id).status, "review_required");

  reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: secondRefund.bank_transaction_id,
      category: "refund_reversal",
      refund_of_bank_transaction_id: original.bank_transaction_id,
    }],
    actor_id: ACTOR,
    idempotency_key: "link-second-refund",
  });
  assert.throws(() => reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: excessiveRefund.bank_transaction_id,
      category: "refund_reversal",
      refund_of_bank_transaction_id: original.bank_transaction_id,
    }],
    actor_id: ACTOR,
    idempotency_key: "reject-single-over-refund",
  }), (error) => error?.safe_error_code === "FINANCE_REFUND_AMOUNT_EXCEEDED");
  assert.deepEqual(repository.list({ tenant_id: TENANT, model_type: "BankTransaction" }), rawBefore);
  assert.equal(
    repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.action === "bank.transaction.classification.review").length,
    2,
  );
  assert.equal(
    repository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.action === "bank.transaction.classification.review")
      .every((event) => event.metadata.linked_refund_count === 1),
    true,
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
