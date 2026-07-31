import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSyntheticClientLegacyReconciliation,
  renderSyntheticClientLegacyReconciliationEvidence,
} from "../src/client-legacy-reconciliation.js";
import { createFinanceRepository } from "../src/finance-repository.js";

const TENANT = "tenant-client-legacy-reconciliation";
const OTHER_TENANT = "tenant-client-legacy-reconciliation-other";
const ACTOR = "user-client-legacy-reconciliation";
const FROM = "2026-07-01T00:00:00+09:00";
const TO = "2026-07-31T23:59:59+09:00";
const AS_OF = "2026-07-31T12:00:00+09:00";

function transaction(id, overrides = {}) {
  return {
    model_type: "BankTransaction",
    bank_transaction_id: id,
    tenant_id: TENANT,
    account_ref: "synthetic-operating-account",
    transaction_fingerprint: `fingerprint-${id}`,
    date: "2026-07-10",
    occurred_at: "2026-07-10T01:00:00.000Z",
    direction: "inflow",
    amount: 1_000_000,
    currency: "KRW",
    status: "posted",
    counterparty: "새봄테크",
    memo: null,
    source_category: "합성 시험",
    classification_scope: "unreviewed",
    ...overrides,
  };
}

function manualClassification(id, transactionId, overrides = {}) {
  const source = syntheticTransactions().find((row) => (
    row.bank_transaction_id === transactionId
  ));
  return {
    model_type: "BankTransactionClassification",
    bank_transaction_classification_id: id,
    tenant_id: TENANT,
    bank_transaction_id: transactionId,
    account_ref: source.account_ref,
    transaction_date: source.date,
    transaction_month: source.date.slice(0, 7),
    transaction_direction: source.direction,
    amount: source.amount,
    currency: "KRW",
    primary_type: source.direction === "inflow" ? "sales" : "non_operating",
    category: source.direction === "inflow"
      ? "client_receipt"
      : "refund_reversal",
    client_group_id: "client-saebom",
    status: "confirmed",
    confidence: "reviewed",
    classification_source: "manual_review",
    rationale_code: source.direction === "inflow"
      ? "manual_client_linked"
      : "manual_refund_linked",
    manual_lock: true,
    refund_of_bank_transaction_id: null,
    ...overrides,
  };
}

function feeCommitment(id, opportunityId, clientGroupId, agreedAmount) {
  return {
    model_type: "FeeCommitment",
    fee_commitment_id: id,
    tenant_id: TENANT,
    client_group_id: clientGroupId,
    opportunity_id: opportunityId,
    matter_id: null,
    currency: "KRW",
    agreed_amount: agreedAmount,
    due_date: null,
    accepted_at: "2026-07-05T10:00:00+09:00",
    status: "active",
    source_fee_arrangement_id: null,
    state_version: 1,
    created_by: ACTOR,
    updated_by: ACTOR,
    reason: "합성 이전 대사 기준",
  };
}

function syntheticTransactions() {
  return [
    transaction("bank-exact", {
      transaction_fingerprint: "fingerprint-exact",
      date: "2026-07-01",
      occurred_at: "2026-07-01T01:00:00.000Z",
      amount: 10_000_000,
      counterparty: "주식회사 새봄테크",
    }),
    transaction("bank-exact-duplicate", {
      transaction_fingerprint: "fingerprint-exact",
      date: "2026-07-01",
      occurred_at: "2026-07-01T01:00:01.000Z",
      amount: 10_000_000,
      counterparty: "주식회사 새봄테크",
    }),
    transaction("bank-alias", {
      date: "2026-07-02",
      occurred_at: "2026-07-02T01:00:00.000Z",
      amount: 5_000_000,
      counterparty: "새봄입금자",
    }),
    transaction("bank-prefix", {
      date: "2026-07-03",
      occurred_at: "2026-07-03T01:00:00.000Z",
      amount: 7_000_000,
      counterparty: "한빛건설",
    }),
    transaction("bank-ambiguous", {
      date: "2026-07-04",
      occurred_at: "2026-07-04T01:00:00.000Z",
      amount: 6_000_000,
      counterparty: "공동입금자",
    }),
    transaction("bank-manual", {
      date: "2026-07-05",
      occurred_at: "2026-07-05T01:00:00.000Z",
      amount: 3_000_000,
      counterparty: "담당자확인입금자",
    }),
    transaction("bank-new-exact", {
      date: "2026-07-06",
      occurred_at: "2026-07-06T01:00:00.000Z",
      amount: 2_000_000,
      counterparty: "새봄테크",
    }),
    transaction("bank-refund", {
      date: "2026-07-07",
      occurred_at: "2026-07-07T01:00:00.000Z",
      direction: "outflow",
      amount: 1_000_000,
      counterparty: "새봄테크 환불",
      memo: "고객 환불",
    }),
  ];
}

function clients() {
  return [
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-saebom",
      display_name: "새봄테크",
      approved_aliases: ["새봄입금자"],
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-hanbit-east",
      display_name: "한빛건설동부",
      approved_aliases: ["공동입금자"],
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-hanbit-west",
      display_name: "한빛건설서부",
      approved_aliases: ["공동입금자"],
      status: "active",
    },
  ];
}

function legacyClassifications() {
  return [
    {
      legacy_classification_id: "legacy-exact",
      tenant_id: TENANT,
      bank_transaction_id: "bank-exact",
      client_group_id: "client-saebom",
      match_kind: "client_exact",
      category: "client_receipt",
      status: "confirmed",
      manual_lock: false,
    },
    {
      legacy_classification_id: "legacy-exact-duplicate",
      tenant_id: TENANT,
      bank_transaction_id: "bank-exact-duplicate",
      client_group_id: "client-saebom",
      match_kind: "client_exact",
      category: "client_receipt",
      status: "confirmed",
      manual_lock: false,
    },
    {
      legacy_classification_id: "legacy-alias",
      tenant_id: TENANT,
      bank_transaction_id: "bank-alias",
      client_group_id: "client-saebom",
      match_kind: "client_saved_alias",
      category: "client_receipt",
      status: "confirmed",
      manual_lock: false,
    },
    {
      legacy_classification_id: "legacy-prefix",
      tenant_id: TENANT,
      bank_transaction_id: "bank-prefix",
      client_group_id: "client-hanbit-east",
      match_kind: "client_unique_prefix",
      category: "client_receipt",
      status: "confirmed",
      manual_lock: false,
    },
    {
      legacy_classification_id: "legacy-ambiguous",
      tenant_id: TENANT,
      bank_transaction_id: "bank-ambiguous",
      client_group_id: "client-hanbit-east",
      match_kind: "client_name_ambiguous",
      category: "client_receipt",
      status: "confirmed",
      manual_lock: false,
    },
    {
      legacy_classification_id: "legacy-manual",
      tenant_id: TENANT,
      bank_transaction_id: "bank-manual",
      client_group_id: "client-saebom",
      match_kind: "manual_review",
      category: "client_receipt",
      status: "confirmed",
      manual_lock: true,
    },
    {
      legacy_classification_id: "legacy-refund",
      tenant_id: TENANT,
      bank_transaction_id: "bank-refund",
      client_group_id: "client-saebom",
      match_kind: "manual_review",
      category: "refund_reversal",
      refund_of_bank_transaction_id: "bank-exact",
      status: "confirmed",
      manual_lock: true,
    },
  ];
}

function legacyFeeAmounts() {
  return [
    {
      legacy_fee_id: "legacy-fee-difference",
      tenant_id: TENANT,
      client_group_id: "client-saebom",
      opportunity_id: "opportunity-fee-difference",
      agreed_amount: 10_000_000,
      manual_confirmed: true,
    },
    {
      legacy_fee_id: "legacy-fee-unconfirmed",
      tenant_id: TENANT,
      client_group_id: "client-hanbit-east",
      opportunity_id: "opportunity-fee-null",
      agreed_amount: 8_000_000,
      manual_confirmed: false,
    },
  ];
}

function fixture({ reverse = false } = {}) {
  const transactions = syntheticTransactions();
  const classifications = [
    manualClassification(
      "classification-manual",
      "bank-manual",
    ),
    manualClassification(
      "classification-refund",
      "bank-refund",
      {
        refund_of_bank_transaction_id: "bank-exact",
      },
    ),
  ];
  const commitments = [
    feeCommitment(
      "fee-difference",
      "opportunity-fee-difference",
      "client-saebom",
      12_000_000,
    ),
    feeCommitment(
      "fee-null",
      "opportunity-fee-null",
      "client-hanbit-east",
      null,
    ),
  ];
  const seedRecords = [
    ...transactions,
    ...classifications,
    ...commitments,
  ];
  const ordered = (values) => reverse ? [...values].reverse() : values;
  const repository = createFinanceRepository({
    seedRecords: ordered(seedRecords),
    preserveSeedRecords: true,
  });
  return {
    repository,
    input: {
      repository,
      tenant_id: TENANT,
      permitted_client_records: ordered(clients()),
      legacy_classifications: ordered(legacyClassifications()),
      legacy_fee_amounts: ordered(legacyFeeAmounts()),
      from: FROM,
      to: TO,
      as_of: AS_OF,
      currency: "KRW",
      synthetic_only: true,
    },
  };
}

function readRepository(records) {
  return Object.freeze({
    list() {
      return Object.freeze(records.map((row) => Object.freeze({ ...row })));
    },
  });
}

test("VC-CL-MIG-001 이전 재실행은 원본 건수와 digest를 바꾸지 않고 같은 JSON·CSV를 반환한다", () => {
  const { repository, input } = fixture();
  const before = repository.list({ tenant_id: TENANT });
  const first = buildSyntheticClientLegacyReconciliation(input);
  const replay = buildSyntheticClientLegacyReconciliation(input);
  const firstEvidence =
    renderSyntheticClientLegacyReconciliationEvidence(first);
  const replayEvidence =
    renderSyntheticClientLegacyReconciliationEvidence(replay);

  assert.deepEqual(replay, first);
  assert.deepEqual(replayEvidence, firstEvidence);
  assert.deepEqual(repository.list({ tenant_id: TENANT }), before);
  assert.equal(first.source.unchanged, true);
  assert.equal(first.source.before_sha256, first.source.after_sha256);
  assert.equal(first.source.writes_product_state, false);
  assert.equal(first.summary.all_deltas_have_korean_reason, true);
  assert.equal(first.revenue.legacy.totals.net_deposit_revenue, 17_000_000);
  assert.equal(first.revenue.current.totals.net_deposit_revenue, 19_000_000);
  assert.equal(first.summary.customer_month_delta_count, 1);
  const byTransaction = new Map(first.revenue.transactions.map((row) => [
    row.bank_transaction_id,
    row,
  ]));
  assert.equal(byTransaction.get("bank-exact").current.match_kind, "client_exact");
  assert.equal(byTransaction.get("bank-alias").current.match_kind, "client_saved_alias");
  assert.match(byTransaction.get("bank-manual").reason, /수동 잠금/u);
  assert.match(first.result_sha256, /^[a-f0-9]{64}$/u);
  assert.match(firstEvidence.json_sha256, /^[a-f0-9]{64}$/u);
  assert.match(firstEvidence.csv_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(JSON.parse(firstEvidence.json_text).result_sha256, first.result_sha256);
  assert.match(firstEvidence.csv_text, /^대사 구분,원본 ID,고객,월,기존 금액,새 금액,차이,상태,사유\n/u);
  assert.match(firstEvidence.csv_text, /bank-new-exact,[^\n]+,2000000,차이,/u);
  assert.match(firstEvidence.csv_text, /관련 거래 대사 결과 차이가 발생했습니다/u);
  assert.doesNotMatch(firstEvidence.json_text, /담당자확인입금자/u);
  assert.doesNotMatch(firstEvidence.csv_text, /새봄입금자/u);
});

test("VC-CL-MIG-001 기존 접두어와 동명이인 연결은 새 정확 분류 후보와 분리해 계속 확인 대상으로 둔다", () => {
  const { repository, input } = fixture();
  repository.create({
    model_type: "ClientDepositAllocation",
    client_deposit_allocation_id: "legacy-prefix-allocation",
    tenant_id: TENANT,
    client_group_id: "client-hanbit-east",
    bank_transaction_id: "bank-prefix",
    bank_transaction_classification_id: "legacy-prefix-classification",
    fee_commitment_id: "fee-null",
  });
  const report = buildSyntheticClientLegacyReconciliation(input);
  const byId = new Map(report.revenue.transactions.map((row) => [
    row.bank_transaction_id,
    row,
  ]));

  for (const transactionId of ["bank-prefix", "bank-ambiguous"]) {
    const row = byId.get(transactionId);
    assert.equal(row.legacy.status, "review_required");
    assert.equal(row.current.status, "review_required");
    assert.equal(row.legacy.net_deposit_revenue, 0);
    assert.equal(row.current.net_deposit_revenue, 0);
    assert.equal(row.review_required, true);
    assert.match(row.reason, /확인 대상/u);
  }
  assert.equal(
    report.revenue.current.details.some((row) => (
      row.bank_transaction_id === "bank-prefix"
      || row.bank_transaction_id === "bank-ambiguous"
    )),
    false,
  );
  assert.equal(report.receivables.details.allocations.length, 0);
  assert.equal(
    repository.get({
      tenant_id: TENANT,
      model_type: "ClientDepositAllocation",
      id: "legacy-prefix-allocation",
    }).bank_transaction_id,
    "bank-prefix",
  );
});

test("VC-CL-MIG-001 연결 환불은 기존·새 입금 매출에서 같은 원입금에 음수로 반영한다", () => {
  const report = buildSyntheticClientLegacyReconciliation(fixture().input);
  const refund = report.revenue.transactions.find((row) => (
    row.bank_transaction_id === "bank-refund"
  ));

  assert.equal(refund.legacy.status, "recognized");
  assert.equal(refund.current.status, "recognized");
  assert.equal(refund.legacy.net_deposit_revenue, -1_000_000);
  assert.equal(refund.current.net_deposit_revenue, -1_000_000);
  assert.equal(refund.delta_amount, 0);
  assert.equal(report.revenue.legacy.totals.linked_refund_amount, 1_000_000);
  assert.equal(report.revenue.current.totals.linked_refund_amount, 1_000_000);
  assert.match(refund.reason, /수동 잠금/u);
});

test("VC-CL-MIG-001 수임료 금액 미입력과 수동 확인 금액 차이를 별도 사유로 식별한다", () => {
  const report = buildSyntheticClientLegacyReconciliation(fixture().input);
  const byOpportunity = new Map(report.fee_amounts.map((row) => [
    row.opportunity_id,
    row,
  ]));
  const difference = byOpportunity.get("opportunity-fee-difference");
  const missing = byOpportunity.get("opportunity-fee-null");

  assert.equal(difference.status, "amount_difference");
  assert.equal(difference.delta_amount, 2_000_000);
  assert.equal(difference.manual_confirmation_required, true);
  assert.match(difference.reason, /금액이 달라 재확인/u);
  assert.equal(missing.status, "manual_confirmation_required");
  assert.equal(missing.current_agreed_amount, null);
  assert.equal(missing.delta_amount, null);
  assert.equal(missing.manual_confirmation_required, true);
  assert.match(missing.reason, /담당자가 확인하지 않아/u);
  assert.equal(report.receivables.unknown_amount_count, 1);
});

test("VC-CL-MIG-001 기존 수임료 확인 여부와 새 약정 존재 여부의 모든 조합이 사실에 맞는 상태와 사유를 반환한다", () => {
  const { repository, input } = fixture();
  const cases = [
    {
      suffix: "unconfirmed-missing",
      manualConfirmed: false,
      currentPresent: false,
      expectedStatus: "manual_confirmation_required",
      expectedReason: /아직 확인하지 않았고 새 수임료 약정도 없어/u,
    },
    {
      suffix: "unconfirmed-current",
      manualConfirmed: false,
      currentPresent: true,
      expectedStatus: "manual_confirmation_required",
      expectedReason: /담당자가 확인하지 않아/u,
    },
    {
      suffix: "confirmed-missing",
      manualConfirmed: true,
      currentPresent: false,
      expectedStatus: "new_commitment_missing",
      expectedReason: /담당자가 확인한 기존 수임료 금액/u,
    },
    {
      suffix: "confirmed-current",
      manualConfirmed: true,
      currentPresent: true,
      expectedStatus: "matched",
      expectedReason: /금액이 같습니다/u,
    },
  ];
  const report = buildSyntheticClientLegacyReconciliation({
    ...input,
    repository: readRepository([
      ...repository.list({ tenant_id: TENANT }),
      ...cases
        .filter(({ currentPresent }) => currentPresent)
        .map(({ suffix }) => feeCommitment(
          `fee-cartesian-${suffix}`,
          `opportunity-cartesian-${suffix}`,
          "client-saebom",
          5_000,
        )),
    ]),
    legacy_fee_amounts: [
      ...input.legacy_fee_amounts,
      ...cases.map(({ suffix, manualConfirmed }) => ({
        legacy_fee_id: `legacy-fee-cartesian-${suffix}`,
        tenant_id: TENANT,
        client_group_id: "client-saebom",
        opportunity_id: `opportunity-cartesian-${suffix}`,
        agreed_amount: 5_000,
        manual_confirmed: manualConfirmed,
      })),
    ],
  });

  for (const {
    suffix,
    manualConfirmed,
    currentPresent,
    expectedStatus,
    expectedReason,
  } of cases) {
    const row = report.fee_amounts.find((candidate) => (
      candidate.opportunity_id === `opportunity-cartesian-${suffix}`
    ));
    assert.equal(row.status, expectedStatus);
    assert.equal(row.legacy_manual_confirmed, manualConfirmed);
    assert.equal(Boolean(row.current_fee_commitment_id), currentPresent);
    assert.match(row.reason, expectedReason);
  }

  const unconfirmedMissing = report.fee_amounts.find((row) => (
    row.opportunity_id === "opportunity-cartesian-unconfirmed-missing"
  ));
  assert.doesNotMatch(unconfirmedMissing.reason, /담당자가 확인한/u);
});

test("VC-CL-MIG-001 같은 opportunity라도 허용 고객이 다르면 금액 상태와 무관하게 client mismatch로 분리한다", () => {
  const { repository, input } = fixture();
  const cases = [
    {
      suffix: "equal",
      legacyAmount: 5_000,
      currentAmount: 5_000,
    },
    {
      suffix: "different",
      legacyAmount: 5_000,
      currentAmount: 6_000,
    },
    {
      suffix: "null",
      legacyAmount: null,
      currentAmount: null,
    },
  ];
  const report = buildSyntheticClientLegacyReconciliation({
    ...input,
    repository: readRepository([
      ...repository.list({ tenant_id: TENANT }),
      ...cases.map(({ suffix, currentAmount }) => feeCommitment(
        `fee-cross-client-${suffix}`,
        `opportunity-cross-client-${suffix}`,
        "client-hanbit-east",
        currentAmount,
      )),
    ]),
    legacy_fee_amounts: [
      ...input.legacy_fee_amounts,
      ...cases.map(({ suffix, legacyAmount }) => ({
        legacy_fee_id: `legacy-fee-cross-client-${suffix}`,
        tenant_id: TENANT,
        client_group_id: "client-saebom",
        opportunity_id: `opportunity-cross-client-${suffix}`,
        agreed_amount: legacyAmount,
        manual_confirmed: true,
      })),
    ],
  });

  for (const { suffix } of cases) {
    const row = report.fee_amounts.find((candidate) => (
      candidate.opportunity_id === `opportunity-cross-client-${suffix}`
    ));
    assert.equal(row.status, "client_mismatch");
    assert.equal(row.client_group_id, null);
    assert.equal(row.manual_confirmation_required, true);
    assert.equal(row.delta_amount, null);
    assert.match(row.reason, /기존 고객과 새 고객이 달라/u);
  }
});

test("VC-CL-MIG-001 CSV 증거는 수식 선행 문자열을 중립화하고 숫자 음수 금액은 보존한다", () => {
  const report = buildSyntheticClientLegacyReconciliation(fixture().input);
  const dangerousValues = [
    "=1+1",
    "+2+2",
    "-3+3",
    "@SUM(A1:A2)",
    "\t=4+4",
    "\r=5+5",
  ];
  const csv = renderSyntheticClientLegacyReconciliationEvidence({
    ...report,
    fee_amounts: dangerousValues.map((value, index) => ({
      ...report.fee_amounts[0],
      opportunity_id: value,
      legacy_fee_id: `legacy-formula-${index}`,
    })),
  }).csv_text;

  for (const value of dangerousValues) {
    assert.equal(csv.includes(`'${value}`), true);
  }
  assert.match(csv, /,-1000000,-1000000,0,/u);
  assert.doesNotMatch(csv, /,'-1000000,/u);
});

test("VC-CL-MIG-001 같은 거래 지문은 원본을 보존하면서 먼저 처리한 한 건만 집계한다", () => {
  const report = buildSyntheticClientLegacyReconciliation(fixture().input);
  const original = report.revenue.transactions.find((row) => (
    row.bank_transaction_id === "bank-exact"
  ));
  const duplicate = report.revenue.transactions.find((row) => (
    row.bank_transaction_id === "bank-exact-duplicate"
  ));

  assert.equal(original.legacy.status, "recognized");
  assert.equal(original.current.status, "recognized");
  assert.equal(duplicate.legacy.status, "duplicate_ignored");
  assert.equal(duplicate.current.status, "duplicate_ignored");
  assert.equal(duplicate.delta_amount, 0);
  assert.equal(report.summary.duplicate_fingerprint_count, 1);
  assert.match(duplicate.reason, /중복 원본은 집계에서 제외/u);
  assert.equal(
    original.transaction_fingerprint_sha256,
    duplicate.transaction_fingerprint_sha256,
  );
});

test("VC-CL-MIG-001 입력·저장 순서가 달라도 거래·고객월·수임료 행과 증거 digest가 안정적이다", () => {
  const normal = buildSyntheticClientLegacyReconciliation(fixture().input);
  const reversed = buildSyntheticClientLegacyReconciliation(
    fixture({ reverse: true }).input,
  );
  const normalEvidence =
    renderSyntheticClientLegacyReconciliationEvidence(normal);
  const reversedEvidence =
    renderSyntheticClientLegacyReconciliationEvidence(reversed);

  assert.deepEqual(reversed, normal);
  assert.deepEqual(reversedEvidence, normalEvidence);
  assert.deepEqual(
    normal.revenue.transactions.map((row) => row.bank_transaction_id),
    [
      "bank-exact",
      "bank-exact-duplicate",
      "bank-alias",
      "bank-prefix",
      "bank-ambiguous",
      "bank-manual",
      "bank-new-exact",
      "bank-refund",
    ],
  );
});

test("VC-CL-MIG-001 교차 tenant 동일 ID와 권한 밖 고객의 거래·분류·수임료·배분은 결과와 digest에서 먼저 제거된다", () => {
  const { repository, input } = fixture();
  const baseline = buildSyntheticClientLegacyReconciliation(input);
  const hiddenClientId = "client-unauthorized-p6-secret";
  const hiddenAmount = 876_543_219;
  const hiddenTransaction = transaction("bank-unauthorized-p6-secret", {
    amount: hiddenAmount,
    counterparty: "주식회사 새봄테크",
  });
  const hiddenClassification = {
    ...manualClassification("classification-manual", "bank-manual"),
    bank_transaction_classification_id:
      "classification-unauthorized-p6-secret",
    bank_transaction_id: hiddenTransaction.bank_transaction_id,
    transaction_date: hiddenTransaction.date,
    transaction_month: hiddenTransaction.date.slice(0, 7),
    amount: hiddenAmount,
    client_group_id: hiddenClientId,
  };
  const hiddenClassificationOnAuthorizedSource = {
    ...hiddenClassification,
    bank_transaction_classification_id:
      "classification-unauthorized-on-authorized-source-p6-secret",
    bank_transaction_id: "bank-exact",
    transaction_date: "2026-07-01",
    transaction_month: "2026-07",
    amount: 10_000_000,
  };
  const hiddenFee = {
    ...feeCommitment(
      "fee-unauthorized-p6-secret",
      "opportunity-unauthorized-p6-secret",
      hiddenClientId,
      hiddenAmount,
    ),
  };
  const hiddenFeeOnAuthorizedOpportunity = {
    ...hiddenFee,
    fee_commitment_id:
      "fee-unauthorized-on-authorized-opportunity-p6-secret",
    opportunity_id: "opportunity-fee-difference",
  };
  const hiddenAllocation = {
    model_type: "ClientDepositAllocation",
    client_deposit_allocation_id: "allocation-unauthorized-p6-secret",
    tenant_id: TENANT,
    client_group_id: hiddenClientId,
    bank_transaction_id: hiddenTransaction.bank_transaction_id,
    bank_transaction_classification_id:
      hiddenClassification.bank_transaction_classification_id,
    fee_commitment_id: hiddenFee.fee_commitment_id,
    currency: "KRW",
    allocated_amount: hiddenAmount,
    reversed_amount: 0,
    allocation_source: "manual",
    manual_lock: true,
    status: "active",
    state_version: 1,
    allocated_at: "2026-07-10T01:00:00.000Z",
    created_by: ACTOR,
    updated_by: ACTOR,
    reason: "권한 밖 합성 배분",
  };
  const hiddenAllocationOnAuthorizedSource = {
    ...hiddenAllocation,
    client_deposit_allocation_id:
      "allocation-unauthorized-on-authorized-source-p6-secret",
    bank_transaction_id: "bank-exact",
    bank_transaction_classification_id:
      hiddenClassificationOnAuthorizedSource
        .bank_transaction_classification_id,
    fee_commitment_id:
      hiddenFeeOnAuthorizedOpportunity.fee_commitment_id,
  };
  const hiddenRule = {
    model_type: "BankClassificationRule",
    bank_classification_rule_id: "rule-unauthorized-p6-secret",
    tenant_id: TENANT,
    client_group_id: hiddenClientId,
    match_field: "counterparty",
    normalized_match_value: "새봄테크",
    category: "client_receipt",
    priority: 100,
    status: "active",
  };
  const crossTenantRecords = repository
    .list({ tenant_id: TENANT })
    .map((row) => ({
      ...row,
      tenant_id: OTHER_TENANT,
      amount: Object.hasOwn(row, "amount") ? hiddenAmount : row.amount,
      agreed_amount: Object.hasOwn(row, "agreed_amount")
        ? hiddenAmount
        : row.agreed_amount,
    }));
  const adversarialRepository = readRepository([
    ...repository.list({ tenant_id: TENANT }),
    hiddenTransaction,
    hiddenClassification,
    hiddenClassificationOnAuthorizedSource,
    hiddenFee,
    hiddenFeeOnAuthorizedOpportunity,
    hiddenAllocation,
    hiddenAllocationOnAuthorizedSource,
    hiddenRule,
    ...crossTenantRecords,
  ]);
  const report = buildSyntheticClientLegacyReconciliation({
    ...input,
    repository: adversarialRepository,
    legacy_classifications: [
      ...input.legacy_classifications,
      {
        legacy_classification_id: "legacy-unauthorized-p6-secret",
        tenant_id: TENANT,
        bank_transaction_id: hiddenTransaction.bank_transaction_id,
        client_group_id: hiddenClientId,
        match_kind: "client_exact",
        category: "client_receipt",
        status: "confirmed",
      },
      {
        legacy_classification_id:
          "legacy-unauthorized-on-authorized-source-p6-secret",
        tenant_id: TENANT,
        bank_transaction_id: "bank-exact",
        client_group_id: hiddenClientId,
        match_kind: "client_exact",
        category: "client_receipt",
        status: "confirmed",
      },
      {
        ...input.legacy_classifications[0],
        tenant_id: OTHER_TENANT,
        agreed_amount: hiddenAmount,
      },
    ],
    legacy_fee_amounts: [
      ...input.legacy_fee_amounts,
      {
        legacy_fee_id: "legacy-fee-unauthorized-p6-secret",
        tenant_id: TENANT,
        client_group_id: hiddenClientId,
        opportunity_id: "opportunity-unauthorized-p6-secret",
        agreed_amount: hiddenAmount,
        manual_confirmed: true,
      },
      {
        legacy_fee_id:
          "legacy-fee-unauthorized-on-authorized-opportunity-p6-secret",
        tenant_id: TENANT,
        client_group_id: hiddenClientId,
        opportunity_id: "opportunity-fee-difference",
        agreed_amount: hiddenAmount,
        manual_confirmed: true,
      },
      {
        ...input.legacy_fee_amounts[0],
        tenant_id: OTHER_TENANT,
        agreed_amount: hiddenAmount,
      },
    ],
  });
  const evidence = renderSyntheticClientLegacyReconciliationEvidence(report);
  const serialized = `${evidence.json_text}\n${evidence.csv_text}`;

  assert.deepEqual(report, baseline);
  assert.deepEqual(report.summary, baseline.summary);
  for (const secret of [
    hiddenClientId,
    "unauthorized-p6-secret",
    String(hiddenAmount),
    OTHER_TENANT,
  ]) {
    assert.doesNotMatch(serialized, new RegExp(secret, "u"));
  }
});

test("VC-CL-MIG-001 NFKC 정규화 후 중복되는 고객·거래·legacy ID는 비교 전에 fail closed 한다", () => {
  const duplicateClient = fixture().input;
  assert.throws(
    () => buildSyntheticClientLegacyReconciliation({
      ...duplicateClient,
      permitted_client_records: [
        ...duplicateClient.permitted_client_records,
        {
          ...duplicateClient.permitted_client_records[0],
          client_group_id: "ｃｌｉｅｎｔ－ｓａｅｂｏｍ",
        },
      ],
    }),
    /Duplicate permitted client identity/u,
  );

  const duplicateTransaction = fixture();
  const duplicateTransactionRecords = [
    ...duplicateTransaction.repository.list({ tenant_id: TENANT }),
    {
      ...syntheticTransactions()[0],
      bank_transaction_id: "ｂａｎｋ－ｅｘａｃｔ",
    },
  ];
  assert.throws(
    () => buildSyntheticClientLegacyReconciliation({
      ...duplicateTransaction.input,
      repository: readRepository(duplicateTransactionRecords),
    }),
    /Duplicate BankTransaction identity/u,
  );

  const duplicateLegacy = fixture().input;
  assert.throws(
    () => buildSyntheticClientLegacyReconciliation({
      ...duplicateLegacy,
      legacy_classifications: [
        ...duplicateLegacy.legacy_classifications,
        {
          ...duplicateLegacy.legacy_classifications[0],
          legacy_classification_id: "ｌｅｇａｃｙ－ｅｘａｃｔ",
          bank_transaction_id: "bank-new-exact",
        },
      ],
    }),
    /Duplicate legacy classification identity/u,
  );
  assert.throws(
    () => buildSyntheticClientLegacyReconciliation({
      ...duplicateLegacy,
      legacy_fee_amounts: [
        ...duplicateLegacy.legacy_fee_amounts,
        {
          ...duplicateLegacy.legacy_fee_amounts[0],
          legacy_fee_id: "ｌｅｇａｃｙ－ｆｅｅ－ｄｉｆｆｅｒｅｎｃｅ",
          opportunity_id: "opportunity-distinct-legacy-fee-id",
        },
      ],
    }),
    /Duplicate legacy fee identity/u,
  );
  assert.throws(
    () => buildSyntheticClientLegacyReconciliation({
      ...duplicateLegacy,
      legacy_classifications: [
        ...duplicateLegacy.legacy_classifications,
        {
          ...duplicateLegacy.legacy_classifications[0],
          legacy_classification_id: undefined,
          bank_transaction_id: "bank-new-exact",
        },
      ],
    }),
    /legacy classification identity is required/u,
  );
});

test("VC-CL-MIG-001 불완전·unknown rule은 fail closed하고 적용되지 않은 완전한 rule은 digest에서 제외한다", () => {
  const { repository, input } = fixture();
  const baseline = buildSyntheticClientLegacyReconciliation(input);
  const unknownRule = {
    model_type: "BankClassificationRule",
    bank_classification_rule_id: "rule-unknown-partial-p6",
    tenant_id: TENANT,
    category: "unknown_category",
    status: "active",
  };

  assert.throws(
    () => buildSyntheticClientLegacyReconciliation({
      ...input,
      repository: readRepository([
        ...repository.list({ tenant_id: TENANT }),
        unknownRule,
      ]),
    }),
    (error) => (
      error instanceof TypeError
      && error.safe_error_code === "FINANCE_RECONCILIATION_SOURCE_INVALID"
      && error.message === "Invalid BankClassificationRule source"
    ),
  );

  const unusedCompleteRule = {
    model_type: "BankClassificationRule",
    bank_classification_rule_id: "rule-unused-complete-p6",
    tenant_id: TENANT,
    client_group_id: null,
    match_field: "counterparty",
    normalized_match_value: "적용대상없는완전한규칙",
    category: "other_inflow",
    priority: 1,
    status: "active",
  };
  const withUnusedRule = buildSyntheticClientLegacyReconciliation({
    ...input,
    repository: readRepository([
      ...repository.list({ tenant_id: TENANT }),
      unusedCompleteRule,
    ]),
  });

  assert.deepEqual(withUnusedRule, baseline);
  assert.equal(withUnusedRule.reconciliation_id, baseline.reconciliation_id);
  assert.equal(withUnusedRule.result_sha256, baseline.result_sha256);
});

test("VC-CL-MIG-001 불완전 source는 fail closed하고 연결 없는 완전 source는 canonical digest에서 제외한다", () => {
  const { repository, input } = fixture();
  const baseline = buildSyntheticClientLegacyReconciliation(input);
  const partialMarker = "partial-source-p6-secret";
  const partialAmount = 765_432_109;
  const partialFee = {
    ...feeCommitment(
      `fee-${partialMarker}`,
      `opportunity-${partialMarker}`,
      "client-saebom",
      partialAmount,
    ),
    opportunity_id: null,
  };
  const partialLegacyFee = {
    legacy_fee_id: `legacy-fee-${partialMarker}`,
    tenant_id: TENANT,
    client_group_id: "client-saebom",
    opportunity_id: null,
    agreed_amount: partialAmount,
    manual_confirmed: true,
  };

  for (const build of [
    () => buildSyntheticClientLegacyReconciliation({
      ...input,
      repository: readRepository([
        ...repository.list({ tenant_id: TENANT }),
        partialFee,
      ]),
    }),
    () => buildSyntheticClientLegacyReconciliation({
      ...input,
      legacy_fee_amounts: [
        ...input.legacy_fee_amounts,
        partialLegacyFee,
      ],
    }),
  ]) {
    assert.throws(
      build,
      (error) => (
        error instanceof TypeError
        && error.safe_error_code === "FINANCE_RECONCILIATION_SOURCE_INVALID"
        && !error.message.includes(partialMarker)
      ),
    );
  }

  const partialRecords = [
    transaction(`bank-${partialMarker}`, {
      amount: partialAmount,
      counterparty: "연결정보없는합성원천",
    }),
    {
      ...manualClassification("classification-manual", "bank-manual"),
      bank_transaction_classification_id:
        `classification-${partialMarker}`,
      bank_transaction_id: `bank-missing-${partialMarker}`,
    },
    {
      model_type: "ClientDepositAllocation",
      client_deposit_allocation_id: `allocation-${partialMarker}`,
      tenant_id: TENANT,
      client_group_id: "client-saebom",
      bank_transaction_id: "bank-exact",
      bank_transaction_classification_id:
        "bank_classification_missing_partial",
      fee_commitment_id: `fee-missing-${partialMarker}`,
    },
  ];
  const report = buildSyntheticClientLegacyReconciliation({
    ...input,
    repository: readRepository([
      ...repository.list({ tenant_id: TENANT }),
      ...partialRecords,
    ]),
    legacy_classifications: [
      ...input.legacy_classifications,
      {
        legacy_classification_id: `legacy-${partialMarker}`,
        tenant_id: TENANT,
        bank_transaction_id: `bank-missing-${partialMarker}`,
        client_group_id: "client-saebom",
        match_kind: "client_exact",
        category: "client_receipt",
        status: "confirmed",
      },
    ],
  });
  const evidence = renderSyntheticClientLegacyReconciliationEvidence(report);
  const serialized = `${evidence.json_text}\n${evidence.csv_text}`;

  assert.deepEqual(report, baseline);
  assert.deepEqual(report.summary, baseline.summary);
  assert.doesNotMatch(serialized, new RegExp(partialMarker, "u"));
  assert.doesNotMatch(serialized, new RegExp(String(partialAmount), "u"));
});
