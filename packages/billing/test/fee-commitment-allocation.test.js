import assert from "node:assert/strict";
import test from "node:test";
import {
  FINANCE_DOMAIN_DESCRIPTOR,
  createFinanceDomainSnapshot,
  reconcileFinanceRecords,
} from "../src/central-ledger.js";
import {
  FEE_COMMITMENT_STATUSES,
  normalizeFeeCommitment,
} from "../src/fee-commitment-model.js";
import {
  CLIENT_DEPOSIT_ALLOCATION_SOURCES,
  CLIENT_DEPOSIT_ALLOCATION_STATUSES,
  normalizeClientDepositAllocation,
} from "../src/client-deposit-allocation-model.js";
import {
  autoAllocateConfirmedClientDeposits,
} from "../src/client-deposit-allocation-service.js";
import {
  CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES,
  reallocateClientDeposit,
  synchronizeClientDepositAllocationReversals,
} from "../src/client-deposit-reallocation-service.js";
import { buildClientReceivables } from "../src/client-receivables-service.js";
import {
  FEE_COMMITMENT_COMMAND_ERROR_CODES,
  FEE_COMMITMENT_WARNING_CODES,
  compareFeeCommitmentToFeeArrangement,
  createFeeCommitment,
  listFeeCommitments,
  updateFeeCommitment,
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

function allocation(overrides = {}) {
  return normalizeClientDepositAllocation({
    client_deposit_allocation_id: "allocation-hanbit",
    tenant_id: TENANT,
    client_group_id: "client-hanbit",
    bank_transaction_id: "bank-transaction-hanbit",
    bank_transaction_classification_id: "classification-hanbit",
    fee_commitment_id: "fee-commitment-hanbit",
    currency: "KRW",
    allocated_amount: 7_000_000,
    reversed_amount: 0,
    allocation_source: "automatic",
    manual_lock: false,
    state_version: 1,
    allocated_at: "2026-07-30T11:00:00+09:00",
    created_by: ACTOR,
    updated_by: ACTOR,
    reason: "납부기한 순 자동 배분",
    ...overrides,
  });
}

function allocationSourceRecords(allocationOverrides = {}) {
  return [
    {
      model_type: "BankImportBatch",
      bank_import_batch_id: "bank-batch-hanbit",
      tenant_id: TENANT,
      source_manifest_hash: "a".repeat(64),
      status: "reconciled",
    },
    {
      model_type: "BankTransaction",
      bank_transaction_id: "bank-transaction-hanbit",
      bank_import_batch_id: "bank-batch-hanbit",
      tenant_id: TENANT,
      direction: "inflow",
      amount: 12_000_000,
      currency: "KRW",
      status: "posted",
    },
    {
      model_type: "BankTransactionClassification",
      bank_transaction_classification_id: "classification-hanbit",
      bank_transaction_id: "bank-transaction-hanbit",
      tenant_id: TENANT,
      client_group_id: "client-hanbit",
      transaction_direction: "inflow",
      amount: 12_000_000,
      currency: "KRW",
      category: "client_receipt",
      status: "confirmed",
    },
    commitment(),
    allocation(allocationOverrides),
  ];
}

function confirmedClientDeposit({
  bankTransactionId = "bank-auto-hanbit",
  classificationId = "classification-auto-hanbit",
  amount = 12_000_000,
  occurredAt = "2026-07-30T09:00:00+09:00",
  clientGroupId = "client-hanbit",
  transactionFingerprint = `${bankTransactionId}-fingerprint`,
} = {}) {
  return [
    {
      model_type: "BankImportBatch",
      bank_import_batch_id: `batch-${bankTransactionId}`,
      tenant_id: TENANT,
      source_manifest_hash: "b".repeat(64),
      status: "reconciled",
    },
    {
      model_type: "BankTransaction",
      bank_transaction_id: bankTransactionId,
      bank_import_batch_id: `batch-${bankTransactionId}`,
      tenant_id: TENANT,
      transaction_fingerprint: transactionFingerprint,
      date: occurredAt.slice(0, 10),
      direction: "inflow",
      amount,
      currency: "KRW",
      status: "posted",
      occurred_at: occurredAt,
    },
    {
      model_type: "BankTransactionClassification",
      bank_transaction_classification_id: classificationId,
      bank_transaction_id: bankTransactionId,
      tenant_id: TENANT,
      client_group_id: clientGroupId,
      transaction_date: occurredAt.slice(0, 10),
      transaction_direction: "inflow",
      amount,
      currency: "KRW",
      category: "client_receipt",
      status: "confirmed",
    },
  ];
}

function linkedClientRefund({
  bankTransactionId = "bank-refund-hanbit",
  classificationId = "classification-refund-hanbit",
  originalBankTransactionId = "bank-auto-hanbit",
  amount = 1_000_000,
  occurredAt = "2026-07-31T09:00:00+09:00",
  clientGroupId = "client-hanbit",
} = {}) {
  return [
    {
      model_type: "BankImportBatch",
      bank_import_batch_id: `batch-${bankTransactionId}`,
      tenant_id: TENANT,
      source_manifest_hash: `${bankTransactionId}-manifest`,
      status: "reconciled",
    },
    {
      model_type: "BankTransaction",
      bank_transaction_id: bankTransactionId,
      bank_import_batch_id: `batch-${bankTransactionId}`,
      tenant_id: TENANT,
      transaction_fingerprint: `${bankTransactionId}-fingerprint`,
      date: occurredAt.slice(0, 10),
      occurred_at: occurredAt,
      direction: "outflow",
      amount,
      currency: "KRW",
      status: "posted",
    },
    {
      model_type: "BankTransactionClassification",
      bank_transaction_classification_id: classificationId,
      bank_transaction_id: bankTransactionId,
      tenant_id: TENANT,
      client_group_id: clientGroupId,
      refund_of_bank_transaction_id: originalBankTransactionId,
      transaction_date: occurredAt.slice(0, 10),
      transaction_direction: "outflow",
      amount,
      currency: "KRW",
      category: "refund_reversal",
      status: "confirmed",
    },
  ];
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

test("ClientDepositAllocation 모델은 자동·수동·되돌림 상태와 원 단위 금액을 엄격히 구분한다", () => {
  assert.deepEqual(CLIENT_DEPOSIT_ALLOCATION_SOURCES, ["automatic", "manual"]);
  assert.deepEqual(CLIENT_DEPOSIT_ALLOCATION_STATUSES, ["active", "reversed"]);
  assert.equal(allocation().status, "active");
  assert.equal(allocation().allocated_amount, 7_000_000);
  assert.equal(allocation({
    client_deposit_allocation_id: "allocation-manual",
    allocation_source: "manual",
    manual_lock: true,
  }).manual_lock, true);
  assert.equal(allocation({
    client_deposit_allocation_id: "allocation-reversed",
    reversed_amount: 7_000_000,
  }).refund_reversed_amount, 7_000_000);
  const mixedReversal = allocation({
    client_deposit_allocation_id: "allocation-mixed-reversal",
    allocation_source: "manual",
    manual_lock: true,
    reversed_amount: 3_000_000,
    refund_reversed_amount: 1_000_000,
    adjustment_reversed_amount: 2_000_000,
  });
  assert.equal(mixedReversal.status, "active");
  assert.equal(mixedReversal.refund_reversed_amount, 1_000_000);
  assert.equal(mixedReversal.adjustment_reversed_amount, 2_000_000);
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-zero",
      allocated_amount: 0,
    }),
    /positive whole KRW/,
  );
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-fraction",
      allocated_amount: 1.5,
    }),
    /positive whole KRW/,
  );
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-over-reversed",
      reversed_amount: 7_000_001,
    }),
    /cannot exceed/,
  );
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-bad-reversal-breakdown",
      reversed_amount: 3_000_000,
      refund_reversed_amount: 1_000_000,
      adjustment_reversed_amount: 1_000_000,
    }),
    /must equal reversed_amount/,
  );
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-usd",
      currency: "USD",
    }),
    /must be KRW/,
  );
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-manual-unlocked",
      allocation_source: "manual",
      manual_lock: false,
    }),
    /manual_lock must be true only/,
  );
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-auto-locked",
      manual_lock: true,
    }),
    /manual_lock must be true only/,
  );
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-wrong-status",
      status: "reversed",
    }),
    /status does not match/,
  );
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-no-offset",
      allocated_at: "2026-07-30T11:00:00",
    }),
    /explicit UTC offset/,
  );
  assert.throws(
    () => allocation({
      client_deposit_allocation_id: "allocation-bad-version",
      state_version: 0,
    }),
    /positive integer/,
  );
});

test("ClientDepositAllocation 원장은 같은 테넌트·고객의 확정 입금과 수임료 약정만 금액 한도 안에서 연결한다", () => {
  const repository = createFinanceRepository({
    seedRecords: allocationSourceRecords(),
  });
  try {
    assert.equal(
      FINANCE_PRIMARY_ID_FIELDS.ClientDepositAllocation,
      "client_deposit_allocation_id",
    );
    const record = repository.get({
      tenant_id: TENANT,
      model_type: "ClientDepositAllocation",
      client_deposit_allocation_id: "allocation-hanbit",
    });
    assert.equal(record.allocated_amount, 7_000_000);
    assert.deepEqual(
      FINANCE_DOMAIN_DESCRIPTOR.references(record).map((reference) => ({
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
          name: "bank_transaction",
          domain: "finance",
          type: "BankTransaction",
          id: "bank-transaction-hanbit",
          required: true,
        },
        {
          name: "bank_transaction_classification",
          domain: "finance",
          type: "BankTransactionClassification",
          id: "classification-hanbit",
          required: true,
        },
        {
          name: "fee_commitment",
          domain: "finance",
          type: "FeeCommitment",
          id: "fee-commitment-hanbit",
          required: true,
        },
      ],
    );
    const result = createFinanceDomainSnapshot({
      repositories: [{ source_id: "allocation-file", repository }],
      tenant_id: TENANT,
    });
    const snapshotRecord = result.snapshot.records.find(
      (row) => row.record_type === "ClientDepositAllocation",
    );
    assert.equal(snapshotRecord.append_only, false);
    assert.deepEqual(
      snapshotRecord.references.map((reference) => reference.reference_name),
      [
        "bank_transaction_classification",
        "bank_transaction",
        "fee_commitment",
      ],
    );
    assert.equal(
      result.inventory.mutable_record_types.includes("ClientDepositAllocation"),
      true,
    );
    assert.equal(result.inventory.reconciliation.client_deposit_allocation_count, 1);
    assert.equal(result.inventory.reconciliation.client_deposit_allocated_total, 7_000_000);
    assert.equal(result.inventory.reconciliation.client_deposit_active_total, 7_000_000);
  } finally {
    repository.close();
  }

  for (const allocationOverrides of [
    { tenant_id: "tenant-other" },
    { client_group_id: "client-other" },
  ]) {
    assert.throws(
      () => reconcileFinanceRecords(allocationSourceRecords(allocationOverrides)),
      (error) => (
        error.safe_error_code === "FINANCE_DEPOSIT_ALLOCATION_INVARIANT_FAILED"
        && /references are incomplete|tenant, client, or source/u.test(error.message)
      ),
    );
  }

  const excessive = createFinanceRepository({
    seedRecords: [
      ...allocationSourceRecords(),
      allocation({
        client_deposit_allocation_id: "allocation-hanbit-second",
        allocated_amount: 6_000_000,
      }),
    ],
  });
  try {
    assert.throws(
      () => createFinanceDomainSnapshot({
        repositories: [{ source_id: "allocation-excessive", repository: excessive }],
        tenant_id: TENANT,
      }),
      (error) => (
        error.safe_error_code === "FINANCE_DEPOSIT_ALLOCATION_INVARIANT_FAILED"
        && /exceed/.test(error.message)
      ),
    );
  } finally {
    excessive.close();
  }
});

test("VC-CL-AR-004 자동 배분은 납부기한·수임확정일·약정 ID 순서를 지킨다", () => {
  const early = commitment({
    fee_commitment_id: "fee-hanbit-early",
    opportunity_id: "opportunity-hanbit-early",
    agreed_amount: 11_000_000,
    due_date: "2026-07-10",
    accepted_at: "2026-06-01T09:00:00+09:00",
  });
  const acceptedFallback = commitment({
    fee_commitment_id: "fee-hanbit-no-due",
    opportunity_id: "opportunity-hanbit-no-due",
    agreed_amount: 4_000_000,
    due_date: null,
    accepted_at: "2026-07-15T09:00:00+09:00",
  });
  const later = commitment({
    fee_commitment_id: "fee-hanbit-later",
    opportunity_id: "opportunity-hanbit-later",
    agreed_amount: 8_000_000,
    due_date: "2026-07-20",
    accepted_at: "2026-06-02T09:00:00+09:00",
  });
  const repository = createFinanceRepository({
    seedRecords: [
      ...confirmedClientDeposit(),
      later,
      acceptedFallback,
      early,
    ],
  });
  try {
    const bankBefore = repository.get({
      tenant_id: TENANT,
      model_type: "BankTransaction",
      bank_transaction_id: "bank-auto-hanbit",
    });
    const result = autoAllocateConfirmedClientDeposits({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "auto-allocation-order",
      clock: () => new Date("2026-07-30T02:00:00.000Z"),
    });
    assert.equal(result.outcome, "allocated");
    assert.equal(result.created_count, 2);
    assert.equal(result.updated_count, 0);
    assert.equal(result.allocated_amount, 12_000_000);
    assert.equal(result.unallocated_amount, 0);
    assert.deepEqual(
      result.allocations.map((record) => [
        record.fee_commitment_id,
        record.allocated_amount,
      ]),
      [
        ["fee-hanbit-early", 11_000_000],
        ["fee-hanbit-no-due", 1_000_000],
      ],
    );
    assert.equal(
      repository.list({
        tenant_id: TENANT,
        model_type: "ClientDepositAllocation",
      }).some((record) => record.fee_commitment_id === "fee-hanbit-later"),
      false,
    );
    const replay = autoAllocateConfirmedClientDeposits({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "auto-allocation-order",
    });
    assert.equal(replay.idempotent_replay, true);
    assert.equal(replay.created_count, 2);
    assert.deepEqual(repository.get({
      tenant_id: TENANT,
      model_type: "BankTransaction",
      bank_transaction_id: "bank-auto-hanbit",
    }), bankBefore);
    assert.equal(
      repository.listAudit({ tenant_id: TENANT })
        .filter((event) => event.action === "client.deposit.allocation.auto").length,
      1,
    );
  } finally {
    repository.close();
  }
});

test("VC-CL-AR-003 자동 배분은 약정액까지만 연결하고 남은 입금을 선입금·초과 입금으로 유지한다", () => {
  const fixed = commitment({
    fee_commitment_id: "fee-hanbit-fixed",
    opportunity_id: "opportunity-hanbit-fixed",
    agreed_amount: 10_000_000,
    due_date: "2026-07-15",
  });
  const unknown = commitment({
    fee_commitment_id: "fee-hanbit-unknown",
    opportunity_id: "opportunity-hanbit-unknown",
    agreed_amount: null,
    due_date: null,
  });
  const repository = createFinanceRepository({
    seedRecords: [
      ...confirmedClientDeposit(),
      fixed,
      unknown,
    ],
  });
  try {
    const first = autoAllocateConfirmedClientDeposits({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "auto-allocation-overpayment",
      clock: () => new Date("2026-07-30T02:00:00.000Z"),
    });
    assert.equal(first.created_count, 1);
    assert.equal(first.allocated_amount, 10_000_000);
    assert.equal(first.unallocated_amount, 2_000_000);
    assert.equal(first.advance_or_overpayment_amount, 2_000_000);
    assert.equal(first.allocations[0].fee_commitment_id, "fee-hanbit-fixed");

    repository.update({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
      fee_commitment_id: "fee-hanbit-fixed",
    }, normalizeFeeCommitment({
      ...fixed,
      agreed_amount: 11_000_000,
      state_version: 2,
      updated_by: ACTOR,
      reason: "약정 금액 정정",
    }));
    const extended = autoAllocateConfirmedClientDeposits({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "auto-allocation-overpayment-extended",
      clock: () => new Date("2026-07-30T03:00:00.000Z"),
    });
    assert.equal(extended.created_count, 0);
    assert.equal(extended.updated_count, 1);
    assert.equal(extended.allocated_amount, 1_000_000);
    assert.equal(extended.unallocated_amount, 1_000_000);
    assert.equal(extended.allocations[0].allocated_amount, 11_000_000);
    assert.equal(extended.allocations[0].state_version, 2);

    const unchanged = autoAllocateConfirmedClientDeposits({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "auto-allocation-overpayment-unchanged",
    });
    assert.equal(unchanged.outcome, "unchanged");
    assert.equal(unchanged.created_count, 0);
    assert.equal(unchanged.updated_count, 0);
    assert.equal(unchanged.unallocated_amount, 1_000_000);
    assert.equal(repository.snapshot().idempotency.length, 2);
    assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 2);
  } finally {
    repository.close();
  }
});

test("VC-CL-AR-005 수동 재배분은 version을 확인하고 자동 재계산이 덮어쓰지 못하게 잠근다", () => {
  const first = commitment({
    fee_commitment_id: "fee-hanbit-manual-first",
    opportunity_id: "opportunity-hanbit-manual-first",
    agreed_amount: 10_000_000,
    due_date: "2026-07-10",
  });
  const second = commitment({
    fee_commitment_id: "fee-hanbit-manual-second",
    opportunity_id: "opportunity-hanbit-manual-second",
    agreed_amount: 11_000_000,
    due_date: "2026-07-20",
  });
  const repository = createFinanceRepository({
    seedRecords: [
      ...confirmedClientDeposit(),
      first,
      second,
    ],
  });
  try {
    autoAllocateConfirmedClientDeposits({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "manual-reallocation-auto-seed",
    });
    const before = repository.list({
      tenant_id: TENANT,
      model_type: "ClientDepositAllocation",
    });
    const expected = before.map((record) => ({
      client_deposit_allocation_id:
        record.client_deposit_allocation_id,
      state_version: record.state_version,
    }));
    const reallocated = reallocateClientDeposit({
      repository,
      tenant_id: TENANT,
      bank_transaction_id: "bank-auto-hanbit",
      expected_allocations: expected,
      targets: [
        {
          fee_commitment_id: "fee-hanbit-manual-first",
          active_amount: 1_000_000,
        },
        {
          fee_commitment_id: "fee-hanbit-manual-second",
          active_amount: 11_000_000,
        },
      ],
      reason: "담당자가 입금 연결을 확인해 조정함",
      actor_id: ACTOR,
      idempotency_key: "manual-reallocation",
      clock: () => new Date("2026-07-30T04:00:00.000Z"),
    });
    assert.equal(reallocated.active_allocated_amount, 12_000_000);
    assert.equal(reallocated.unallocated_amount, 0);
    assert.deepEqual(
      reallocated.allocations.map((record) => [
        record.fee_commitment_id,
        record.allocated_amount - record.reversed_amount,
        record.adjustment_reversed_amount,
        record.manual_lock,
        record.state_version,
      ]),
      [
        ["fee-hanbit-manual-first", 1_000_000, 9_000_000, true, 2],
        ["fee-hanbit-manual-second", 11_000_000, 0, true, 2],
      ],
    );

    const noChange = reallocateClientDeposit({
      repository,
      tenant_id: TENANT,
      bank_transaction_id: "bank-auto-hanbit",
      expected_allocations: reallocated.allocations.map((record) => ({
        client_deposit_allocation_id:
          record.client_deposit_allocation_id,
        state_version: record.state_version,
      })),
      targets: [
        {
          fee_commitment_id: "fee-hanbit-manual-first",
          active_amount: 1_000_000,
        },
        {
          fee_commitment_id: "fee-hanbit-manual-second",
          active_amount: 11_000_000,
        },
      ],
      reason: "같은 연결값 재확인",
      actor_id: ACTOR,
      idempotency_key: "manual-reallocation-no-change",
    });
    assert.equal(noChange.outcome, "unchanged");
    assert.equal(noChange.audit_event, null);
    assert.deepEqual(
      noChange.allocations.map((record) => record.state_version),
      [2, 2],
    );

    const automaticRetry = autoAllocateConfirmedClientDeposits({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "manual-reallocation-auto-retry",
    });
    assert.equal(automaticRetry.outcome, "unchanged");
    assert.equal(automaticRetry.created_count, 0);
    assert.equal(automaticRetry.updated_count, 0);
    assert.deepEqual(
      repository.list({
        tenant_id: TENANT,
        model_type: "ClientDepositAllocation",
      }).map((record) => [
        record.fee_commitment_id,
        record.allocated_amount - record.reversed_amount,
        record.manual_lock,
      ]).sort(),
      [
        ["fee-hanbit-manual-first", 1_000_000, true],
        ["fee-hanbit-manual-second", 11_000_000, true],
      ],
    );
    assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 2);
    assert.throws(
      () => reallocateClientDeposit({
        repository,
        tenant_id: TENANT,
        bank_transaction_id: "bank-auto-hanbit",
        expected_allocations: expected,
        targets: [],
        reason: "오래된 화면에서 다시 조정",
        actor_id: ACTOR,
        idempotency_key: "manual-reallocation-stale",
      }),
      (error) => (
        error.safe_error_code
          === CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.version_conflict
        && error.status === 409
      ),
    );
    const current = repository.list({
      tenant_id: TENANT,
      model_type: "ClientDepositAllocation",
    });
    assert.throws(
      () => reallocateClientDeposit({
        repository,
        tenant_id: TENANT,
        bank_transaction_id: "bank-auto-hanbit",
        expected_allocations: current.map((record) => ({
          client_deposit_allocation_id:
            record.client_deposit_allocation_id,
          state_version: record.state_version,
        })),
        targets: [
          {
            fee_commitment_id: "fee-hanbit-manual-first",
            active_amount: 2_000_000,
          },
          {
            fee_commitment_id: "fee-hanbit-manual-second",
            active_amount: 11_000_000,
          },
        ],
        reason: "입금액보다 크게 조정",
        actor_id: ACTOR,
        idempotency_key: "manual-reallocation-excess",
      }),
      (error) => (
        error.safe_error_code
          === CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target
        && error.status === 409
      ),
    );
  } finally {
    repository.close();
  }
});

test("VC-CL-REV-008 연결 환불은 기존 입금 연결을 되돌려 미수금을 다시 연다", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      ...confirmedClientDeposit({ amount: 3_000_000 }),
      commitment({ agreed_amount: 3_000_000 }),
    ],
  });
  try {
    autoAllocateConfirmedClientDeposits({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "refund-reversal-auto-seed",
    });
    for (const record of linkedClientRefund()) repository.create(record);
    const synchronized = synchronizeClientDepositAllocationReversals({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "refund-reversal-sync",
    });
    assert.equal(synchronized.outcome, "synchronized");
    assert.equal(synchronized.linked_refund_amount, 1_000_000);
    assert.equal(synchronized.refund_reversed_amount, 1_000_000);
    assert.equal(synchronized.unapplied_refund_amount, 0);
    const [updated] = repository.list({
      tenant_id: TENANT,
      model_type: "ClientDepositAllocation",
    });
    assert.equal(updated.allocated_amount, 3_000_000);
    assert.equal(updated.refund_reversed_amount, 1_000_000);
    assert.equal(updated.adjustment_reversed_amount, 0);
    assert.equal(updated.reversed_amount, 1_000_000);
    assert.equal(updated.state_version, 2);

    const receivables = buildClientReceivables({
      repository,
      tenant_id: TENANT,
      permitted_client_records: [{
        model_type: "ClientGroup",
        tenant_id: TENANT,
        client_group_id: "client-hanbit",
        display_name: "한빛",
        status: "active",
      }],
      clock: () => new Date("2026-07-31T03:00:00.000Z"),
    });
    assert.equal(receivables.total_receivables, 1_000_000);
    assert.equal(receivables.total_overpayment, 0);
    assert.equal(receivables.ranking[0].receivable_amount, 1_000_000);
    assert.equal(
      receivables.details.deposits[0].linked_refund_amount,
      1_000_000,
    );
    const unchanged = synchronizeClientDepositAllocationReversals({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "refund-reversal-sync-unchanged",
    });
    assert.equal(unchanged.outcome, "unchanged");
    assert.equal(unchanged.updated_count, 0);

    repository.update({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
      fee_commitment_id: "fee-commitment-hanbit",
    }, normalizeFeeCommitment({
      ...commitment({ agreed_amount: 3_000_000 }),
      status: "cancelled",
      state_version: 2,
      reason: "수임료 약정 취소",
    }));
    const cancelled = synchronizeClientDepositAllocationReversals({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      idempotency_key: "refund-reversal-sync-cancelled",
    });
    assert.equal(cancelled.inactive_commitment_released_amount, 2_000_000);
    const [released] = repository.list({
      tenant_id: TENANT,
      model_type: "ClientDepositAllocation",
    });
    assert.equal(released.refund_reversed_amount, 0);
    assert.equal(released.adjustment_reversed_amount, 3_000_000);
    assert.equal(released.status, "reversed");
    const afterCancellation = buildClientReceivables({
      repository,
      tenant_id: TENANT,
      permitted_client_records: [{
        model_type: "ClientGroup",
        tenant_id: TENANT,
        client_group_id: "client-hanbit",
        display_name: "한빛",
        status: "active",
      }],
    });
    assert.equal(afterCancellation.total_receivables, 0);
    assert.equal(afterCancellation.total_overpayment, 2_000_000);
  } finally {
    repository.close();
  }
});

test("VC-CL-AR-001/002/003 미수금 조회는 금액 미입력을 제외하고 순위·상세·초과 입금을 맞춘다", () => {
  const clientA = "client-hanbit";
  const clientB = "client-unknown";
  const clientC = "client-overpayment";
  const repository = createFinanceRepository({
    seedRecords: [
      ...confirmedClientDeposit({
        bankTransactionId: "bank-receivables-a",
        classificationId: "classification-receivables-a",
        amount: 11_000_000,
        clientGroupId: clientA,
      }),
      ...confirmedClientDeposit({
        bankTransactionId: "bank-receivables-c",
        classificationId: "classification-receivables-c",
        amount: 12_000_000,
        occurredAt: "2026-07-31T09:00:00+09:00",
        clientGroupId: clientC,
      }),
      commitment({
        fee_commitment_id: "fee-receivables-a",
        client_group_id: clientA,
        opportunity_id: "opportunity-receivables-a",
        agreed_amount: 20_000_000,
        due_date: "2026-07-10",
      }),
      commitment({
        fee_commitment_id: "fee-receivables-b",
        client_group_id: clientB,
        opportunity_id: "opportunity-receivables-b",
        agreed_amount: null,
        due_date: null,
      }),
      commitment({
        fee_commitment_id: "fee-receivables-c",
        client_group_id: clientC,
        opportunity_id: "opportunity-receivables-c",
        agreed_amount: 10_000_000,
        due_date: "2026-07-15",
      }),
      allocation({
        client_deposit_allocation_id: "allocation-receivables-a",
        client_group_id: clientA,
        bank_transaction_id: "bank-receivables-a",
        bank_transaction_classification_id:
          "classification-receivables-a",
        fee_commitment_id: "fee-receivables-a",
        allocated_amount: 11_000_000,
      }),
      allocation({
        client_deposit_allocation_id: "allocation-receivables-c",
        client_group_id: clientC,
        bank_transaction_id: "bank-receivables-c",
        bank_transaction_classification_id:
          "classification-receivables-c",
        fee_commitment_id: "fee-receivables-c",
        allocated_amount: 10_000_000,
      }),
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank-secret-broken",
        tenant_id: TENANT,
        transaction_fingerprint: "secret-broken",
        occurred_at: "not-an-instant",
        direction: "inflow",
        amount: "secret",
        currency: "USD",
      },
      {
        model_type: "BankTransactionClassification",
        bank_transaction_classification_id:
          "classification-secret-broken",
        bank_transaction_id: "bank-secret-broken",
        tenant_id: TENANT,
        client_group_id: "client-secret",
        transaction_direction: "inflow",
        amount: "secret",
        currency: "USD",
        category: "client_receipt",
        status: "confirmed",
      },
    ],
  });
  try {
    const result = buildClientReceivables({
      repository,
      tenant_id: TENANT,
      permitted_client_records: [
        {
          model_type: "ClientGroup",
          tenant_id: TENANT,
          client_group_id: clientA,
          display_name: "한빛건설",
          status: "active",
        },
        {
          model_type: "ClientGroup",
          tenant_id: TENANT,
          client_group_id: clientB,
          display_name: "한빛개발",
          status: "active",
        },
        {
          model_type: "ClientGroup",
          tenant_id: TENANT,
          client_group_id: clientC,
          display_name: "새봄테크",
          status: "active",
        },
      ],
      clock: () => new Date("2026-07-30T03:00:00.000Z"),
    });
    assert.equal(result.total_receivables, 9_000_000);
    assert.equal(result.unknown_amount_count, 1);
    assert.equal(result.total_overpayment, 2_000_000);
    assert.deepEqual(result.ranking, [{
      rank: 1,
      client_group_id: clientA,
      display_name: "한빛건설",
      agreed_amount: 20_000_000,
      active_allocated_amount: 11_000_000,
      receivable_amount: 9_000_000,
      earliest_due_date: "2026-07-10",
    }]);
    assert.deepEqual(result.client_summaries, [
      {
        client_group_id: clientA,
        agreed_amount: 20_000_000,
        active_allocated_amount: 11_000_000,
        receivable_amount: 9_000_000,
        unknown_amount_count: 0,
        overpayment_amount: 0,
      },
      {
        client_group_id: clientB,
        agreed_amount: null,
        active_allocated_amount: 0,
        receivable_amount: null,
        unknown_amount_count: 1,
        overpayment_amount: 0,
      },
      {
        client_group_id: clientC,
        agreed_amount: 10_000_000,
        active_allocated_amount: 10_000_000,
        receivable_amount: 0,
        unknown_amount_count: 0,
        overpayment_amount: 2_000_000,
      },
    ]);
    assert.deepEqual(result.reconciliation, {
      status: "passed",
      ranking_total: 9_000_000,
      commitment_detail_total: 9_000_000,
      client_summary_total: 9_000_000,
      overpayment_detail_total: 2_000_000,
    });
    assert.equal(result.permission_prefilter_applied, true);
    assert.equal(result.unauthorized_count_included, false);
  } finally {
    repository.close();
  }
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

test("수임료 약정 수정·취소는 version과 사유를 요구하고 청구 설정 금액 차이를 경고한다", () => {
  const repository = createFinanceRepository({
    seedRecords: [{
      model_type: "FeeArrangement",
      fee_arrangement_id: "fee-arrangement-hanbit-fixed",
      tenant_id: TENANT,
      client_group_id: "client-hanbit",
      currency: "KRW",
      type: "fixed",
      arrangement_type: "fixed",
      fixed_fee_amount: 15_000_000,
      status: "active",
    }],
  });
  const refs = referenceRepositories();
  try {
    const created = createFeeCommitment({
      repository,
      master_data_repository: refs.masterDataRepository,
      crm_repository: refs.crmRepository,
      fee_commitment: commitment({
        source_fee_arrangement_id: "fee-arrangement-hanbit-fixed",
      }),
      actor_id: ACTOR,
      idempotency_key: "fee-commitment-version-create",
    });
    const mismatch = compareFeeCommitmentToFeeArrangement({
      repository,
      fee_commitment: created.fee_commitment,
    });
    assert.deepEqual(mismatch, {
      status: "mismatch",
      fee_arrangement_id: "fee-arrangement-hanbit-fixed",
      fee_commitment_amount: 12_000_000,
      fee_arrangement_amount: 15_000_000,
      warning_code: FEE_COMMITMENT_WARNING_CODES.fee_arrangement_amount_mismatch,
      warning_message: "청구 설정과 금액이 다릅니다",
    });

    assert.throws(
      () => updateFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        tenant_id: TENANT,
        fee_commitment_id: created.fee_commitment.fee_commitment_id,
        expected_state_version: 1,
        changes: { agreed_amount: 13_000_000 },
        reason: " ",
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-missing-reason",
      }),
      /reason is required/,
    );
    assert.throws(
      () => updateFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        tenant_id: TENANT,
        fee_commitment_id: created.fee_commitment.fee_commitment_id,
        expected_state_version: 1,
        changes: { opportunity_id: "opportunity-replacement" },
        reason: "불변 관계 변경 시도",
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-immutable-field",
      }),
      /fields are immutable: opportunity_id/,
    );
    assert.throws(
      () => updateFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        tenant_id: TENANT,
        fee_commitment_id: created.fee_commitment.fee_commitment_id,
        expected_state_version: 1,
        changes: { agreed_amount: 12_000_000 },
        reason: "같은 금액 재입력",
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-no-op",
      }),
      /changes have no effect/,
    );

    const updated = updateFeeCommitment({
      repository,
      master_data_repository: refs.masterDataRepository,
      crm_repository: refs.crmRepository,
      tenant_id: TENANT,
      fee_commitment_id: created.fee_commitment.fee_commitment_id,
      expected_state_version: 1,
      changes: { agreed_amount: 15_000_000 },
      reason: "정식 청구 설정 금액 확인",
      actor_id: ACTOR,
      idempotency_key: "fee-commitment-version-update",
    });
    assert.equal(updated.outcome, "updated");
    assert.equal(updated.fee_commitment.state_version, 2);
    assert.equal(updated.fee_arrangement_comparison.status, "match");
    assert.deepEqual(updated.audit_event.metadata.changed_fields, ["agreed_amount"]);
    assert.deepEqual(updated.audit_event.metadata.before, {
      state_version: 1,
      status: "active",
      agreed_amount: 12_000_000,
      due_date: "2026-08-15",
      matter_id: null,
      source_fee_arrangement_id: "fee-arrangement-hanbit-fixed",
    });
    assert.deepEqual(updated.audit_event.metadata.after, {
      state_version: 2,
      status: "active",
      agreed_amount: 15_000_000,
      due_date: "2026-08-15",
      matter_id: null,
      source_fee_arrangement_id: "fee-arrangement-hanbit-fixed",
    });
    assert.equal(updated.audit_event.reason, "정식 청구 설정 금액 확인");

    const replay = updateFeeCommitment({
      repository,
      master_data_repository: refs.masterDataRepository,
      crm_repository: refs.crmRepository,
      tenant_id: TENANT,
      fee_commitment_id: created.fee_commitment.fee_commitment_id,
      expected_state_version: 1,
      changes: { agreed_amount: 15_000_000 },
      reason: "정식 청구 설정 금액 확인",
      actor_id: ACTOR,
      idempotency_key: "fee-commitment-version-update",
    });
    assert.equal(replay.idempotent_replay, true);
    assert.equal(replay.fee_commitment.state_version, 2);

    assert.throws(
      () => updateFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        tenant_id: TENANT,
        fee_commitment_id: created.fee_commitment.fee_commitment_id,
        expected_state_version: 1,
        changes: { agreed_amount: 14_000_000 },
        reason: "같은 요청키로 다른 수정",
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-version-update",
      }),
      (error) => (
        error.safe_error_code === FEE_COMMITMENT_COMMAND_ERROR_CODES.idempotency_conflict
        && error.status === 409
      ),
    );
    assert.throws(
      () => updateFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        tenant_id: TENANT,
        fee_commitment_id: created.fee_commitment.fee_commitment_id,
        expected_state_version: 1,
        changes: { due_date: "2026-09-01" },
        reason: "오래된 화면에서 납부기한 수정",
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-stale-update",
      }),
      (error) => (
        error.safe_error_code === FEE_COMMITMENT_COMMAND_ERROR_CODES.version_conflict
        && error.status === 409
      ),
    );
    assert.equal(repository.get({
      tenant_id: TENANT,
      model_type: "FeeCommitment",
      fee_commitment_id: created.fee_commitment.fee_commitment_id,
    }).due_date, "2026-08-15");

    const cancelled = updateFeeCommitment({
      repository,
      master_data_repository: refs.masterDataRepository,
      crm_repository: refs.crmRepository,
      tenant_id: TENANT,
      fee_commitment_id: created.fee_commitment.fee_commitment_id,
      expected_state_version: 2,
      changes: { status: "cancelled" },
      reason: "수임료 약정 취소 확인",
      actor_id: ACTOR,
      idempotency_key: "fee-commitment-version-cancel",
    });
    assert.equal(cancelled.outcome, "cancelled");
    assert.equal(cancelled.fee_commitment.state_version, 3);
    assert.equal(cancelled.fee_commitment.status, "cancelled");
    assert.equal(cancelled.audit_event.action, "fee_commitment.cancel");

    assert.throws(
      () => updateFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        tenant_id: TENANT,
        fee_commitment_id: created.fee_commitment.fee_commitment_id,
        expected_state_version: 3,
        changes: {
          status: "cancelled",
          agreed_amount: 0,
        },
        reason: "취소와 금액 변경을 함께 시도",
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-mixed-cancel",
      }),
      /cancellation cannot be combined/,
    );
    assert.throws(
      () => updateFeeCommitment({
        repository,
        master_data_repository: refs.masterDataRepository,
        crm_repository: refs.crmRepository,
        tenant_id: TENANT,
        fee_commitment_id: created.fee_commitment.fee_commitment_id,
        expected_state_version: 3,
        changes: { agreed_amount: 14_000_000 },
        reason: "취소 후 수정 시도",
        actor_id: ACTOR,
        idempotency_key: "fee-commitment-update-after-cancel",
      }),
      (error) => (
        error.safe_error_code === FEE_COMMITMENT_COMMAND_ERROR_CODES.invalid_state
        && error.status === 409
      ),
    );
    assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 3);
  } finally {
    repository.close();
    refs.masterDataRepository.close();
    refs.crmRepository.close();
  }
});
