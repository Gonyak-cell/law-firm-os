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
  FEE_COMMITMENT_COMMAND_ERROR_CODES,
  createFeeCommitment,
  listFeeCommitments,
} from "../src/fee-commitment-service.js";
import {
  FINANCE_PRIMARY_ID_FIELDS,
  createFinanceRepository,
} from "../src/finance-repository.js";
import { createCrmRuntimeRepository } from "../../crm/src/runtime-repository.js";
import { createMasterDataRepository } from "../../master-data/src/repository.js";

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

function referenceRepositories({
  opportunities = [
    {
      opportunity_id: "opportunity-hanbit",
      party_id: "party-hanbit",
      display_name: "한빛 수임 검토",
      stage: "closed_won",
    },
  ],
} = {}) {
  const masterDataRepository = createMasterDataRepository({
    seedRecords: [{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-hanbit",
      display_name: "한빛",
      member_party_ids: ["party-hanbit"],
      primary_party_id: "party-hanbit",
      status: "active",
      owner_user_id: ACTOR,
    }],
  });
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: opportunities.map((opportunity) => ({
      model_type: "Opportunity",
      tenant_id: TENANT,
      status: "active",
      owner_user_id: ACTOR,
      ...opportunity,
    })),
  });
  return { masterDataRepository, crmRepository };
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

test("VC-CL-AR-001 수임료 약정 생성은 고객·수임 검토 건을 확인하고 같은 요청만 재실행한다", () => {
  const repository = createFinanceRepository();
  const refs = referenceRepositories();
  try {
    const input = commitment();
    const created = createFeeCommitment({
      repository,
      master_data_repository: refs.masterDataRepository,
      crm_repository: refs.crmRepository,
      fee_commitment: input,
      actor_id: ACTOR,
      idempotency_key: "fee-commitment-create-hanbit",
    });
    assert.equal(created.outcome, "created");
    assert.equal(created.fee_commitment.agreed_amount, 12_000_000);
    assert.equal(created.fee_commitment.state_version, 1);
    assert.equal(created.fee_commitment.created_by, ACTOR);
    assert.equal(created.audit_event.action, "fee_commitment.create");
    assert.equal(created.audit_event.metadata.agreed_amount_state, "entered");
    assert.equal(created.audit_event.metadata.raw_payload_included, false);

    const replay = createFeeCommitment({
      repository,
      master_data_repository: refs.masterDataRepository,
      crm_repository: refs.crmRepository,
      fee_commitment: input,
      actor_id: ACTOR,
      idempotency_key: "fee-commitment-create-hanbit",
    });
    assert.equal(replay.idempotent_replay, true);
    assert.equal(repository.list({ tenant_id: TENANT, model_type: "FeeCommitment" }).length, 1);
    assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 1);

    assert.throws(
      () => createFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        fee_commitment: { ...input, agreed_amount: 11_000_000 },
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-create-hanbit",
      }),
      (error) => (
        error.safe_error_code === FEE_COMMITMENT_COMMAND_ERROR_CODES.idempotency_conflict
        && error.status === 409
      ),
    );
  } finally {
    repository.close();
    refs.masterDataRepository.close();
    refs.crmRepository.close();
  }
});

test("VC-CL-AR-002 금액 미입력과 0원 약정은 조회에서 그대로 구분된다", () => {
  const repository = createFinanceRepository();
  const refs = referenceRepositories({
    opportunities: [
      {
        opportunity_id: "opportunity-hanbit",
        party_id: "party-hanbit",
        display_name: "한빛 금액 미입력",
        stage: "closed_won",
      },
      {
        opportunity_id: "opportunity-hanbit-zero",
        party_id: "party-hanbit",
        display_name: "한빛 0원 약정",
        stage: "closed_won",
      },
    ],
  });
  try {
    const unknown = createFeeCommitment({
      repository,
      master_data_repository: refs.masterDataRepository,
      crm_repository: refs.crmRepository,
      fee_commitment: commitment({
        fee_commitment_id: "fee-commitment-unknown",
        agreed_amount: null,
        due_date: null,
      }),
      actor_id: ACTOR,
      idempotency_key: "fee-commitment-create-unknown",
    });
    const zero = createFeeCommitment({
      repository,
      master_data_repository: refs.masterDataRepository,
      crm_repository: refs.crmRepository,
      fee_commitment: commitment({
        fee_commitment_id: "fee-commitment-zero",
        opportunity_id: "opportunity-hanbit-zero",
        agreed_amount: 0,
        accepted_at: "2026-07-31T10:00:00+09:00",
      }),
      actor_id: ACTOR,
      idempotency_key: "fee-commitment-create-zero",
    });
    assert.equal(unknown.audit_event.metadata.agreed_amount_state, "not_entered");
    assert.equal(zero.audit_event.metadata.agreed_amount_state, "zero");
    assert.deepEqual(
      listFeeCommitments({ repository, tenant_id: TENANT })
        .map((record) => [record.fee_commitment_id, record.agreed_amount]),
      [
        ["fee-commitment-zero", 0],
        ["fee-commitment-unknown", null],
      ],
    );
  } finally {
    repository.close();
    refs.masterDataRepository.close();
    refs.crmRepository.close();
  }
});

test("VC-CL-AR-003 다른 고객의 수임 검토 건과 중복 활성 약정은 저장하지 않는다", () => {
  const repository = createFinanceRepository();
  const refs = referenceRepositories({
    opportunities: [
      {
        opportunity_id: "opportunity-hanbit",
        party_id: "party-hanbit",
        display_name: "한빛 수임 검토",
        stage: "closed_won",
      },
      {
        opportunity_id: "opportunity-other-client",
        party_id: "party-other",
        display_name: "다른 고객 수임 검토",
        stage: "closed_won",
      },
    ],
  });
  try {
    assert.throws(
      () => createFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: null,
        fee_commitment: commitment({
          fee_commitment_id: "fee-commitment-missing-crm-runtime",
        }),
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-missing-crm-runtime",
      }),
      (error) => (
        error.safe_error_code === FEE_COMMITMENT_COMMAND_ERROR_CODES.reference_unavailable
        && error.status === 503
      ),
    );
    assert.throws(
      () => createFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        fee_commitment: commitment({
          fee_commitment_id: "fee-commitment-wrong-client",
          opportunity_id: "opportunity-other-client",
        }),
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-wrong-client",
      }),
      (error) => (
        error.safe_error_code === FEE_COMMITMENT_COMMAND_ERROR_CODES.reference_invalid
        && error.status === 409
      ),
    );
    assert.equal(repository.list({ tenant_id: TENANT, model_type: "FeeCommitment" }).length, 0);

    createFeeCommitment({
      repository,
      master_data_repository: refs.masterDataRepository,
      crm_repository: refs.crmRepository,
      fee_commitment: commitment(),
      actor_id: ACTOR,
      idempotency_key: "fee-commitment-first-active",
    });
    assert.throws(
      () => createFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        fee_commitment: commitment({ fee_commitment_id: "fee-commitment-duplicate-active" }),
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-second-active",
      }),
      (error) => (
        error.safe_error_code === FEE_COMMITMENT_COMMAND_ERROR_CODES.active_exists
        && error.status === 409
      ),
    );
    assert.equal(repository.list({ tenant_id: TENANT, model_type: "FeeCommitment" }).length, 1);
  } finally {
    repository.close();
    refs.masterDataRepository.close();
    refs.crmRepository.close();
  }
});
