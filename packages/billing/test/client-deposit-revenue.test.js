import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  autoClassifyBankTransactions,
  previewBankTransactionClassifications,
  reviewBankTransactionClassifications,
} from "../src/bank-classification-service.js";
import { buildClientDepositRevenue } from "../src/client-deposit-revenue-service.js";
import { FINANCE_DOMAIN_DESCRIPTOR } from "../src/central-ledger.js";
import { createFinanceRepository } from "../src/finance-repository.js";

const TENANT = "tenant-client-deposit-revenue";
const ACTOR = "user-client-deposit-reviewer";
const FIXTURE_ROOT = new URL("../../../apps/api/test/fixtures/client-operations-v1/", import.meta.url);

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
    tenant_id: TENANT,
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

function revenue(repository, clients, overrides = {}) {
  return buildClientDepositRevenue({
    repository,
    tenant_id: TENANT,
    permitted_client_records: clients,
    from: "2026-07-01T00:00:00+09:00",
    to: "2026-07-31T23:59:59.999+09:00",
    ...overrides,
  });
}

test("순입금 매출 조회는 권한 고객 목록·KRW·유효한 동일 형식 기간을 요구한다", () => {
  const repository = createFinanceRepository();
  assert.throws(
    () => buildClientDepositRevenue({ repository, tenant_id: TENANT }),
    /permitted_client_records is required/,
  );
  assert.throws(
    () => revenue(repository, [], { currency: "USD" }),
    /currency must be KRW/,
  );
  assert.throws(
    () => revenue(repository, [], { from: "2026-02-30", to: "2026-03-01" }),
    /valid calendar date/,
  );
  assert.throws(
    () => revenue(repository, [], {
      from: "2026-07-01",
      to: "2026-07-31T23:59:59.999+09:00",
    }),
    /same date format/,
  );
  repository.close();
});

test("VC-CL-REV-001 정확히 연결한 고객 입금만 순입금 매출이 된다", () => {
  const transaction = bankTransaction("bank_exact_revenue", "새봄테크", 11_000_000, {
    date: "2026-07-15",
    occurred_at: "2026-07-15T10:00:00+09:00",
  });
  const clients = [client("client-saebom", "새봄테크")];
  const repository = createFinanceRepository({ seedRecords: [transaction] });
  autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: clients,
    actor_id: ACTOR,
    idempotency_key: "classify-exact-revenue",
  });

  const result = revenue(repository, clients);
  assert.deepEqual(result.totals, {
    matched_inflow_amount: 11_000_000,
    linked_refund_amount: 0,
    net_deposit_revenue: 11_000_000,
    recognized_transaction_count: 1,
  });
  assert.deepEqual(
    result.ranking.map(({ rank, client_group_id, net_deposit_revenue }) => ({
      rank,
      client_group_id,
      net_deposit_revenue,
    })),
    [{ rank: 1, client_group_id: "client-saebom", net_deposit_revenue: 11_000_000 }],
  );
  assert.equal(result.reconciliation.ranking_total, result.reconciliation.detail_total);
  assert.equal(result.reconciliation.detail_total, result.totals.net_deposit_revenue);
  repository.close();
});

test("VC-CL-REV-003 연결 확인이 필요한 입금은 매출과 순위에서 빠진다", () => {
  const transaction = bankTransaction("bank_review_required", "한빛", 5_000_000);
  const clients = [
    client("client-hanbit-construction", "한빛건설", ["한빛"]),
    client("client-hanbit-development", "한빛개발", ["한빛"]),
  ];
  const repository = createFinanceRepository({ seedRecords: [transaction] });
  autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: clients,
    actor_id: ACTOR,
    idempotency_key: "classify-ambiguous-revenue",
  });

  const result = revenue(repository, clients);
  assert.equal(classification(repository, transaction.bank_transaction_id).status, "review_required");
  assert.deepEqual(result.totals, {
    matched_inflow_amount: 0,
    linked_refund_amount: 0,
    net_deposit_revenue: 0,
    recognized_transaction_count: 0,
  });
  assert.deepEqual(result.ranking, []);
  assert.deepEqual(result.details, []);
  repository.close();
});

test("VC-CL-REV-005/006 같은 거래 지문은 파일이나 거래 ID가 달라도 한 번만 집계한다", () => {
  const fingerprint = "d".repeat(64);
  const first = bankTransaction("bank_duplicate_a", "한빛건설", 11_000_000, {
    transaction_fingerprint: fingerprint,
    date: "2026-07-15",
    occurred_at: "2026-07-15T10:00:00+09:00",
  });
  const duplicate = bankTransaction("bank_duplicate_b", "한빛건설", 11_000_000, {
    transaction_fingerprint: fingerprint,
    date: "2026-07-15",
    occurred_at: "2026-07-15T10:00:00+09:00",
  });
  const clients = [client("client-hanbit", "한빛건설")];
  const repository = createFinanceRepository({ seedRecords: [first, duplicate] });
  autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: clients,
    actor_id: ACTOR,
    idempotency_key: "classify-duplicate-revenue",
  });

  const result = revenue(repository, clients);
  assert.equal(result.totals.net_deposit_revenue, 11_000_000);
  assert.equal(result.totals.recognized_transaction_count, 1);
  assert.equal(result.details[0].bank_transaction_id, first.bank_transaction_id);
  repository.close();
});

test("고객별 순위는 권한을 먼저 적용하고 최근 입금일·고객명·고객 ID로 안정 정렬한다", () => {
  const rows = [
    bankTransaction("bank_rank_late", "후순", 1_000_000, {
      date: "2026-07-20",
      occurred_at: "2026-07-20T10:00:00+09:00",
    }),
    bankTransaction("bank_rank_alpha", "가람 A", 1_000_000, {
      date: "2026-07-10",
      occurred_at: "2026-07-10T10:00:00+09:00",
    }),
    bankTransaction("bank_rank_beta", "가람 B", 1_000_000, {
      date: "2026-07-10",
      occurred_at: "2026-07-10T10:00:00+09:00",
    }),
    bankTransaction("bank_rank_nara", "나래", 1_000_000, {
      date: "2026-07-10",
      occurred_at: "2026-07-10T10:00:00+09:00",
    }),
    bankTransaction("bank_rank_hidden", "숨김", 9_000_000, {
      date: "2026-07-30",
      occurred_at: "2026-07-30T10:00:00+09:00",
    }),
  ];
  const visibleClients = [
    client("client-late", "후순"),
    client("client-alpha", "가람"),
    client("client-beta", "가람"),
    client("client-nara", "나래"),
  ];
  const hiddenClient = client("client-hidden", "숨김");
  const repository = createFinanceRepository({ seedRecords: rows });
  reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [
      ["bank_rank_late", "client-late"],
      ["bank_rank_alpha", "client-alpha"],
      ["bank_rank_beta", "client-beta"],
      ["bank_rank_nara", "client-nara"],
      ["bank_rank_hidden", "client-hidden"],
    ].map(([bank_transaction_id, client_group_id]) => ({
      bank_transaction_id,
      category: "client_receipt",
      client_group_id,
    })),
    actor_id: ACTOR,
    idempotency_key: "classify-stable-ranking",
  });
  const hiddenClassification = classification(repository, "bank_rank_hidden");
  repository.update({
    tenant_id: TENANT,
    model_type: "BankTransactionClassification",
    id: hiddenClassification.bank_transaction_classification_id,
  }, {
    amount: hiddenClassification.amount + 1,
  });

  const first = revenue(repository, visibleClients);
  const second = revenue(repository, visibleClients);
  assert.deepEqual(
    first.ranking.map((row) => row.client_group_id),
    ["client-late", "client-alpha", "client-beta", "client-nara"],
  );
  assert.deepEqual(second.ranking, first.ranking);
  assert.equal(first.totals.net_deposit_revenue, 4_000_000);
  assert.equal(first.details.some((row) => row.client_group_id === hiddenClient.client_group_id), false);
  assert.equal(first.permission_prefilter_applied, true);
  assert.equal(first.unauthorized_count_included, false);
  assert.throws(
    () => revenue(repository, [...visibleClients, hiddenClient]),
    /Bank classification does not reconcile/,
  );
  repository.close();
});

test("기준 fixture의 3,300만원 순입금 매출·고객 순위·12개월 합계가 상세와 일치한다", () => {
  const input = JSON.parse(readFileSync(new URL("input.json", FIXTURE_ROOT), "utf8"));
  const expected = JSON.parse(readFileSync(new URL("expected-revenue.json", FIXTURE_ROOT), "utf8"));
  const fixtureClients = input.clients.map((row) => ({
    ...client(row.client_group_id, row.display_name, row.approved_aliases),
    names: row.names,
  }));
  const transactions = input.bank_transactions.map((row) => bankTransaction(
    row.bank_transaction_id,
    row.counterparty,
    row.amount,
    {
      transaction_fingerprint: row.fingerprint,
      date: row.occurred_at.slice(0, 10),
      occurred_at: row.occurred_at,
      direction: row.direction,
      source_category: row.refund_of_bank_transaction_id ? "고객 환불" : "미분류",
    },
  ));
  const repository = createFinanceRepository({ seedRecords: transactions });
  autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: fixtureClients,
    actor_id: ACTOR,
    idempotency_key: "classify-baseline-revenue-fixture",
  });
  const refund = input.bank_transactions.find((row) => row.refund_of_bank_transaction_id);
  reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: refund.bank_transaction_id,
      category: "refund_reversal",
      refund_of_bank_transaction_id: refund.refund_of_bank_transaction_id,
    }],
    actor_id: ACTOR,
    idempotency_key: "link-baseline-revenue-refund",
  });

  const period = revenue(repository, fixtureClients, {
    from: expected.period.from,
    to: expected.period.to,
  });
  assert.equal(period.totals.net_deposit_revenue, expected.total_net_deposit_revenue);
  assert.deepEqual(
    period.ranking.map((row) => ({
      rank: row.rank,
      client_group_id: row.client_group_id,
      display_name: row.display_name,
      matched_inflow_amount: row.matched_inflow_amount,
      linked_refund_amount: row.linked_refund_amount,
      net_deposit_revenue: row.net_deposit_revenue,
      latest_deposit_at: row.latest_deposit_at,
    })),
    expected.ranking,
  );

  const twelveMonths = revenue(repository, fixtureClients, {
    from: `${expected.monthly_series[0].month}-01`,
    to: "2026-07-31",
  });
  assert.deepEqual(twelveMonths.monthly, expected.monthly_series);
  assert.equal(
    twelveMonths.monthly.reduce((total, row) => total + row.net_deposit_revenue, 0),
    twelveMonths.reconciliation.detail_total,
  );
  repository.close();
});

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
  assert.deepEqual(
    revenue(repository, clients).ranking.map((row) => row.client_group_id),
    ["client-alpha"],
  );
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
  assert.deepEqual(
    revenue(repository, clients).ranking.map((row) => row.client_group_id),
    ["client-beta"],
  );

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
  assert.equal(revenue(repository, clients).totals.net_deposit_revenue, 0);

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

  assert.throws(() => reviewBankTransactionClassifications({
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
    idempotency_key: "reject-cross-client-refund",
  }), (error) => (
    error.safe_error_code === "FINANCE_REFUND_CLIENT_MISMATCH"
    && error.status === 409
  ));
  const linked = reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: firstRefund.bank_transaction_id,
      category: "refund_reversal",
      refund_of_bank_transaction_id: original.bank_transaction_id,
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
  const periodRevenue = revenue(repository, [client("client-saebom", "새봄테크")], {
    from: "2026-06-01T00:00:00+09:00",
    to: "2026-07-31T23:59:59.999+09:00",
  });
  assert.deepEqual(periodRevenue.monthly, [
    { month: "2026-06", net_deposit_revenue: 3_000_000 },
    { month: "2026-07", net_deposit_revenue: -1_000_000 },
  ]);
  assert.equal(
    periodRevenue.details.reduce((total, row) => total + row.net_deposit_revenue_delta, 0),
    periodRevenue.totals.net_deposit_revenue,
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

test("exact refund retry replays before mutable original-state validation", () => {
  const original = bankTransaction(
    "bank_refund_replay_origin",
    "리플레이 고객",
    500_000,
  );
  const refund = bankTransaction(
    "bank_refund_replay_target",
    "리플레이 고객 환불",
    100_000,
    {
      direction: "outflow",
      source_category: "고객 환불",
    },
  );
  const repository = createFinanceRepository({
    seedRecords: [original, refund],
  });
  autoClassifyBankTransactions({
    repository,
    tenant_id: TENANT,
    client_records: [client("client-replay", "리플레이 고객")],
    actor_id: ACTOR,
    idempotency_key: "refund-replay-auto",
  });
  const decisions = [{
    bank_transaction_id: refund.bank_transaction_id,
    category: "refund_reversal",
    refund_of_bank_transaction_id: original.bank_transaction_id,
    expected_state_version: 1,
  }];
  const first = reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions,
    actor_id: ACTOR,
    idempotency_key: "refund-replay-stable",
  });
  reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: original.bank_transaction_id,
      category: "other_inflow",
      expected_state_version: 1,
    }],
    actor_id: ACTOR,
    idempotency_key: "refund-replay-original-change",
  });
  const replay = reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions,
    actor_id: ACTOR,
    idempotency_key: "refund-replay-stable",
  });
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(replay.classifications, first.classifications);
  assert.throws(() => reviewBankTransactionClassifications({
    repository,
    tenant_id: TENANT,
    decisions: [{
      ...decisions[0],
      client_group_id: "client-replay",
    }],
    actor_id: ACTOR,
    idempotency_key: "refund-replay-stable",
  }), (error) => error?.safe_error_code === "FINANCE_IDEMPOTENCY_CONFLICT");
  repository.close();
});
