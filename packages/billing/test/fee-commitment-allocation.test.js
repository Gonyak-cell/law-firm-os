import assert from "node:assert/strict";
import test from "node:test";
import {
  FINANCE_DOMAIN_DESCRIPTOR,
  createFinanceDomainSnapshot,
} from "../src/central-ledger.js";
import {
  FEE_COMMITMENT_STATUSES,
  normalizeFeeCommitment,
} from "../src/fee-commitment-model.js";
import {
  FINANCE_PRIMARY_ID_FIELDS,
  createFinanceRepository,
} from "../src/finance-repository.js";

const TENANT = "tenant-fee-commitment";
const ACTOR = "user-fee-commitment";

function commitment(overrides = {}) {
  return normalizeFeeCommitment({
    fee_commitment_id: "fee-commitment-hanbit",
    tenant_id: TENANT,
    client_group_id: "client-hanbit",
    opportunity_id: "opportunity-hanbit",
    matter_id: null,
    currency: "KRW",
    agreed_amount: 12_000_000,
    due_date: "2026-08-15",
    accepted_at: "2026-07-30T10:00:00+09:00",
    status: "active",
    source_fee_arrangement_id: null,
    state_version: 1,
    created_by: ACTOR,
    updated_by: ACTOR,
    reason: "수임 확정",
    ...overrides,
  });
}

test("FeeCommitment 모델은 확정 금액·0원·금액 미입력을 서로 구분한다", () => {
  assert.deepEqual(FEE_COMMITMENT_STATUSES, ["active", "superseded", "cancelled"]);
  assert.equal(commitment().agreed_amount, 12_000_000);
  assert.equal(commitment({ fee_commitment_id: "fee-zero", agreed_amount: 0 }).agreed_amount, 0);
  assert.equal(
    commitment({
      fee_commitment_id: "fee-unknown",
      agreed_amount: null,
      due_date: null,
    }).agreed_amount,
    null,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-undefined", agreed_amount: undefined }),
    /explicitly set/,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-negative", agreed_amount: -1 }),
    /non-negative whole KRW/,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-fraction", agreed_amount: 1.5 }),
    /non-negative whole KRW/,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-string", agreed_amount: "12000000" }),
    /non-negative whole KRW/,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-usd", currency: "USD" }),
    /must be KRW/,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-date", due_date: "2026-02-30" }),
    /valid calendar date/,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-time", accepted_at: "2026-07-30T10:00:00" }),
    /explicit UTC offset/,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-status", status: "paid" }),
    /status is invalid/,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-version", state_version: 0 }),
    /positive integer/,
  );
  assert.throws(
    () => commitment({ fee_commitment_id: "fee-version-string", state_version: "1" }),
    /positive integer/,
  );
});

test("FeeCommitment ID·금액·고객·수임 검토·청구 설정 관계를 Finance 원장에 등록한다", () => {
  const feeArrangement = {
    model_type: "FeeArrangement",
    fee_arrangement_id: "fee-arrangement-hanbit",
    tenant_id: TENANT,
    currency: "KRW",
    status: "active",
  };
  const record = commitment({
    source_fee_arrangement_id: feeArrangement.fee_arrangement_id,
  });
  const repository = createFinanceRepository({
    seedRecords: [feeArrangement, record],
  });
  try {
    assert.equal(FINANCE_PRIMARY_ID_FIELDS.FeeCommitment, "fee_commitment_id");
    assert.equal(repository.get({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
      id: record.fee_commitment_id,
    }).agreed_amount, 12_000_000);

    const references = FINANCE_DOMAIN_DESCRIPTOR.references(record);
    assert.deepEqual(
      references.map((reference) => ({
        name: reference.reference_name,
        domain: reference.target_domain_id ?? "finance",
        type: reference.target_record_type,
        id: reference.target_record_id,
        required: reference.required,
      })),
      [
        {
          name: "client_group",
          domain: "master-data",
          type: "ClientGroup",
          id: "client-hanbit",
          required: true,
        },
        {
          name: "opportunity",
          domain: "crm",
          type: "Opportunity",
          id: "opportunity-hanbit",
          required: true,
        },
        {
          name: "source_fee_arrangement",
          domain: "finance",
          type: "FeeArrangement",
          id: "fee-arrangement-hanbit",
          required: true,
        },
      ],
    );

    const result = createFinanceDomainSnapshot({
      repositories: [{ source_id: "fee-commitment-file", repository }],
      tenant_id: TENANT,
    });
    const snapshotRecord = result.snapshot.records.find(
      (row) => row.record_type === "FeeCommitment",
    );
    assert.equal(snapshotRecord.record_id, record.fee_commitment_id);
    assert.equal(snapshotRecord.append_only, false);
    assert.equal(snapshotRecord.payload.agreed_amount, 12_000_000);
    assert.deepEqual(
      snapshotRecord.references.map((reference) => reference.reference_name),
      ["source_fee_arrangement"],
    );
    assert.equal(result.inventory.mutable_record_types.includes("FeeCommitment"), true);
    assert.equal(result.inventory.reconciliation.fee_commitment_count, 1);
    assert.equal(result.inventory.reconciliation.money_total_krw, 12_000_000);
  } finally {
    repository.close();
  }

  const missingSource = createFinanceRepository({
    seedRecords: [record],
  });
  try {
    assert.throws(
      () => createFinanceDomainSnapshot({
        repositories: [{ source_id: "fee-commitment-broken", repository: missingSource }],
        tenant_id: TENANT,
      }),
      /required domain reference is missing: FeeCommitment.source_fee_arrangement/,
    );
  } finally {
    missingSource.close();
  }
});
