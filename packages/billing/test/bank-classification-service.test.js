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
      counterparty: "(주)베스트이노베이션",
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
    approved_aliases: ["베스트홀딩스"],
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
  {
    employee_id: "emp-ytk",
    display_name: "김양태",
    title: "대표이사",
    payroll_category: "partner",
    aliases: ["YTK"],
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

test("client receipts require one exact normalized name or a saved alias", () => {
  const matchingClients = [
    ...clients,
    {
      model_type: "ClientGroup",
      client_group_id: "client-hanbit-one",
      display_name: "한빛",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      client_group_id: "client-hanbit-two",
      display_name: "한빛",
      status: "active",
    },
  ];
  const preview = previewBankTransactionClassifications({
    transactions: [
      bankTransaction("bank_exact", {
        tenant_id: TENANT,
        direction: "inflow",
        counterparty: "주식회사 베스트이노베이션",
      }),
      bankTransaction("bank_alias", {
        tenant_id: TENANT,
        direction: "inflow",
        counterparty: "베스트홀딩스",
      }),
      bankTransaction("bank_partial", {
        tenant_id: TENANT,
        direction: "inflow",
        counterparty: "베스트이노",
      }),
      bankTransaction("bank_ambiguous", {
        tenant_id: TENANT,
        direction: "inflow",
        counterparty: "한빛",
      }),
      bankTransaction("bank_unknown", {
        tenant_id: TENANT,
        direction: "inflow",
        counterparty: "처음보는입금자",
      }),
    ],
    client_records: matchingClients,
  });
  const byId = new Map(preview.classifications.map((row) => [row.bank_transaction_id, row]));

  assert.deepEqual(
    {
      client_group_id: byId.get("bank_exact").client_group_id,
      category: byId.get("bank_exact").category,
      rationale_code: byId.get("bank_exact").rationale_code,
      status: byId.get("bank_exact").status,
    },
    {
      client_group_id: "client-best",
      category: "client_receipt",
      rationale_code: "client_exact",
      status: "confirmed",
    },
  );
  assert.deepEqual(
    {
      client_group_id: byId.get("bank_alias").client_group_id,
      category: byId.get("bank_alias").category,
      rationale_code: byId.get("bank_alias").rationale_code,
      status: byId.get("bank_alias").status,
    },
    {
      client_group_id: "client-best",
      category: "client_receipt",
      rationale_code: "client_saved_alias",
      status: "confirmed",
    },
  );
  for (const [transactionId, rationaleCode] of [
    ["bank_partial", "client_partial_name"],
    ["bank_ambiguous", "client_name_ambiguous"],
    ["bank_unknown", "no_registered_client_match"],
  ]) {
    assert.deepEqual(
      {
        client_group_id: byId.get(transactionId).client_group_id,
        category: byId.get(transactionId).category,
        rationale_code: byId.get(transactionId).rationale_code,
        status: byId.get(transactionId).status,
        confidence: byId.get(transactionId).confidence,
      },
      {
        client_group_id: null,
        category: "other_inflow",
        rationale_code: rationaleCode,
        status: "review_required",
        confidence: "needs_review",
      },
    );
  }
  assert.equal(preview.summary.confirmed_count, 2);
  assert.equal(preview.summary.review_count, 3);
});

test("only active bank depositor PartyAlias values auto-link client receipts", () => {
  const clientRecords = [
    {
      model_type: "ClientGroup",
      client_group_id: "client-party-alias",
      primary_party_id: "party-party-alias",
      display_name: "Party Alias Client",
      status: "active",
    },
    {
      model_type: "PartyAlias",
      party_alias_id: "party-alias-bank",
      party_id: "party-party-alias",
      alias_value: "Active Depositor",
      alias_type: "bank_depositor_name",
      status: "active",
    },
    {
      model_type: "PartyAlias",
      party_alias_id: "party-alias-legal",
      party_id: "party-party-alias",
      alias_value: "Legal Alias",
      alias_type: "legal_name",
      status: "active",
    },
    {
      model_type: "PartyAlias",
      party_alias_id: "party-alias-localized",
      party_id: "party-party-alias",
      alias_value: "Localized Alias",
      alias_type: "localized_name",
      status: "active",
    },
    {
      model_type: "PartyAlias",
      party_alias_id: "party-alias-former",
      party_id: "party-party-alias",
      alias_value: "Former Alias",
      alias_type: "former_name",
      status: "active",
    },
    {
      model_type: "PartyAlias",
      party_alias_id: "party-alias-search",
      party_id: "party-party-alias",
      alias_value: "Search Alias",
      alias_type: "search_name",
      status: "active",
    },
    {
      model_type: "PartyAlias",
      party_alias_id: "party-alias-archived-bank",
      party_id: "party-party-alias",
      alias_value: "Archived Depositor",
      alias_type: "bank_depositor_name",
      status: "archived",
    },
    ...["draft", "review_required", "blocked"].map((status) => ({
      model_type: "PartyAlias",
      party_alias_id: `party-alias-${status}-bank`,
      party_id: "party-party-alias",
      alias_value: `${status} Depositor`,
      alias_type: "bank_depositor_name",
      status,
    })),
  ];
  const transactions = [
    ["bank_party_alias_exact", "Active Depositor"],
    ["bank_party_alias_legal", "Legal Alias"],
    ["bank_party_alias_localized", "Localized Alias"],
    ["bank_party_alias_former", "Former Alias"],
    ["bank_party_alias_search", "Search Alias"],
    ["bank_party_alias_archived", "Archived Depositor"],
    ...["draft", "review_required", "blocked"].map((status) => [
      `bank_party_alias_${status}`,
      `${status} Depositor`,
    ]),
  ].map(([id, counterparty]) => bankTransaction(id, {
    tenant_id: TENANT,
    direction: "inflow",
    counterparty,
  }));

  const preview = previewBankTransactionClassifications({
    transactions,
    client_records: clientRecords,
  });
  const byId = new Map(preview.classifications.map((row) => [row.bank_transaction_id, row]));
  assert.deepEqual(
    {
      client_group_id: byId.get("bank_party_alias_exact").client_group_id,
      category: byId.get("bank_party_alias_exact").category,
      rationale_code: byId.get("bank_party_alias_exact").rationale_code,
      status: byId.get("bank_party_alias_exact").status,
    },
    {
      client_group_id: "client-party-alias",
      category: "client_receipt",
      rationale_code: "client_saved_alias",
      status: "confirmed",
    },
  );
  for (const transactionId of [
    "bank_party_alias_legal",
    "bank_party_alias_localized",
    "bank_party_alias_former",
    "bank_party_alias_search",
    "bank_party_alias_archived",
    "bank_party_alias_draft",
    "bank_party_alias_review_required",
    "bank_party_alias_blocked",
  ]) {
    assert.deepEqual(
      {
        client_group_id: byId.get(transactionId).client_group_id,
        category: byId.get(transactionId).category,
        rationale_code: byId.get(transactionId).rationale_code,
        status: byId.get(transactionId).status,
        confidence: byId.get(transactionId).confidence,
      },
      {
        client_group_id: null,
        category: "other_inflow",
        rationale_code: "no_registered_client_match",
        status: "review_required",
        confidence: "needs_review",
      },
    );
  }
});

test("duplicate normalized bank depositor PartyAlias values remain review-required", () => {
  const clientRecords = [
    {
      model_type: "ClientGroup",
      client_group_id: "client-party-alias-one",
      primary_party_id: "party-party-alias-one",
      display_name: "First Depositor Client",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      client_group_id: "client-party-alias-two",
      primary_party_id: "party-party-alias-two",
      display_name: "Second Depositor Client",
      status: "active",
    },
    {
      model_type: "PartyAlias",
      party_alias_id: "party-alias-duplicate-one",
      party_id: "party-party-alias-one",
      alias_value: "Shared Depositor",
      alias_type: "bank_depositor_name",
      status: "active",
    },
    {
      model_type: "PartyAlias",
      party_alias_id: "party-alias-duplicate-two",
      party_id: "party-party-alias-two",
      alias_value: "shared-depositor",
      alias_type: "bank_depositor_name",
      status: "active",
    },
  ];
  const preview = previewBankTransactionClassifications({
    transactions: [bankTransaction("bank_party_alias_duplicate", {
      tenant_id: TENANT,
      direction: "inflow",
      counterparty: "SHARED DEPOSITOR",
    })],
    client_records: clientRecords,
  });
  assert.deepEqual(
    {
      client_group_id: preview.classifications[0].client_group_id,
      category: preview.classifications[0].category,
      rationale_code: preview.classifications[0].rationale_code,
      status: preview.classifications[0].status,
      confidence: preview.classifications[0].confidence,
    },
    {
      client_group_id: null,
      category: "other_inflow",
      rationale_code: "client_name_ambiguous",
      status: "review_required",
      confidence: "needs_review",
    },
  );
});

test("an exact client rule saved by manual review remains an approved depositor alias", () => {
  const preview = previewBankTransactionClassifications({
    transactions: [bankTransaction("bank_saved_rule", {
      tenant_id: TENANT,
      direction: "inflow",
      counterparty: "베스트별도입금자",
    })],
    client_records: clients,
    rules: [{
      model_type: "BankClassificationRule",
      bank_classification_rule_id: "bank_rule_saved_alias",
      match_field: "counterparty",
      normalized_match_value: "베스트별도입금자",
      category: "client_receipt",
      client_group_id: "client-best",
      status: "active",
      priority: 100,
    }],
  });
  assert.deepEqual(
    {
      client_group_id: preview.classifications[0].client_group_id,
      category: preview.classifications[0].category,
      classification_source: preview.classifications[0].classification_source,
      rationale_code: preview.classifications[0].rationale_code,
    },
    {
      client_group_id: "client-best",
      category: "client_receipt",
      classification_source: "saved_rule",
      rationale_code: "client_saved_alias",
    },
  );
});

test("explicit AMIC payroll role overrides a non-legal organization title", () => {
  const preview = previewBankTransactionClassifications({
    transactions: [bankTransaction("bank_tx_ytk", {
      tenant_id: TENANT,
      amount: 10_604_540,
      counterparty: "7월 급여 YTK",
    })],
    employees,
  });
  assert.equal(preview.classifications[0].employee_id, "emp-ytk");
  assert.equal(preview.classifications[0].payroll_category, "partner");
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
