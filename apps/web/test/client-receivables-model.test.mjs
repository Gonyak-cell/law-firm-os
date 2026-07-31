import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClientDepositReallocationCommand,
  buildClientReceivablesModel,
  buildFeeCommitmentCommand,
  CLIENT_RECEIVABLE_STATUS_TABS,
  normalizeFeeCommitmentMutationResult,
  resolveClientReceivableSelection,
} from "../src/components/ClientReceivablesModel.js";
import { buildClientReceivables } from "../../../packages/billing/src/client-receivables-service.js";

const TENANT = "tenant-ar-test";

function commitment(overrides = {}) {
  return {
    model_type: "FeeCommitment",
    fee_commitment_id: "fee-fixed",
    tenant_id: TENANT,
    client_group_id: "client-hanbit",
    display_name: "한빛건설",
    opportunity_id: "opp-hanbit",
    currency: "KRW",
    agreed_amount: 10_000_000,
    due_date: "2026-07-10",
    accepted_at: "2026-06-01T00:00:00.000Z",
    status: "active",
    state_version: 2,
    ...overrides,
  };
}

function allocation(overrides = {}) {
  return {
    model_type: "ClientDepositAllocation",
    client_deposit_allocation_id: "allocation-auto",
    tenant_id: TENANT,
    client_group_id: "client-hanbit",
    bank_transaction_id: "bank-hanbit",
    fee_commitment_id: "fee-fixed",
    currency: "KRW",
    allocated_amount: 6_000_000,
    reversed_amount: 0,
    allocation_source: "automatic",
    manual_lock: false,
    state_version: 3,
    ...overrides,
  };
}

function data(items, extra = {}) {
  return {
    kind: "data",
    outcome: "passed",
    uiState: null,
    permission_prefilter_applied: true,
    count_leak_prevented: true,
    raw_bank_source_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    items,
    ...extra,
  };
}

function receivablesFixture(overrides = {}) {
  return {
    kind: "data",
    outcome: "complete",
    uiState: null,
    permission_prefilter_applied: true,
    count_leak_prevented: true,
    raw_bank_source_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    invoice_required: false,
    matter_required: false,
    total_receivables: 4_000_000,
    unknown_amount_count: 1,
    total_overpayment: 2_000_000,
    unallocated_amount: 2_000_000,
    client_summaries: [
      {
        client_group_id: "client-hanbit",
        display_name: "한빛건설",
        agreed_amount: 10_000_000,
        active_allocated_amount: 6_000_000,
        receivable_amount: 4_000_000,
        unknown_amount_count: 0,
        overpayment_amount: 0,
        earliest_due_date: "2026-07-10",
      },
      {
        client_group_id: "client-unknown",
        display_name: "금액 미입력 고객",
        agreed_amount: null,
        active_allocated_amount: 0,
        receivable_amount: null,
        unknown_amount_count: 1,
        overpayment_amount: 0,
        earliest_due_date: null,
      },
      {
        client_group_id: "client-advance",
        display_name: "선입금 고객",
        agreed_amount: 5_000_000,
        active_allocated_amount: 5_000_000,
        receivable_amount: 0,
        unknown_amount_count: 0,
        overpayment_amount: 2_000_000,
        earliest_due_date: null,
      },
    ],
    ranking: [
      {
        rank: 1,
        client_group_id: "client-hanbit",
        display_name: "한빛건설",
        agreed_amount: 10_000_000,
        active_allocated_amount: 6_000_000,
        receivable_amount: 4_000_000,
        earliest_due_date: "2026-07-10",
      },
    ],
    details: {
      fee_commitments: [
        commitment(),
        commitment({
          fee_commitment_id: "fee-unknown",
          client_group_id: "client-unknown",
          display_name: "금액 미입력 고객",
          opportunity_id: "opp-unknown",
          agreed_amount: null,
          due_date: null,
          accepted_at: "2026-06-02T00:00:00.000Z",
          state_version: 1,
        }),
        commitment({
          fee_commitment_id: "fee-advance",
          client_group_id: "client-advance",
          display_name: "선입금 고객",
          opportunity_id: "opp-advance",
          agreed_amount: 5_000_000,
          state_version: 4,
        }),
      ],
      deposits: [
        {
          bank_transaction_id: "bank-hanbit",
          client_group_id: "client-hanbit",
          gross_amount: 7_000_000,
          linked_refund_amount: 1_000_000,
          net_amount: 6_000_000,
          active_allocated_amount: 6_000_000,
          overpayment_amount: 0,
          occurred_at: "2026-07-15T01:00:00.000Z",
        },
        {
          bank_transaction_id: "bank-advance",
          client_group_id: "client-advance",
          gross_amount: 7_000_000,
          linked_refund_amount: 0,
          net_amount: 7_000_000,
          active_allocated_amount: 5_000_000,
          overpayment_amount: 2_000_000,
          occurred_at: "2026-07-16T01:00:00.000Z",
        },
      ],
      allocations: [
        allocation(),
        allocation({
          client_deposit_allocation_id: "allocation-manual",
          client_group_id: "client-advance",
          bank_transaction_id: "bank-advance",
          fee_commitment_id: "fee-advance",
          allocated_amount: 5_000_000,
          allocation_source: "manual",
          manual_lock: true,
          state_version: 5,
        }),
      ],
    },
    ...overrides,
  };
}

function model(overrides = {}) {
  return buildClientReceivablesModel({
    receivablesResult: receivablesFixture(),
    ...overrides,
  });
}

function buildActualServiceResult() {
  const records = [
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-hanbit",
      display_name: "한빛건설",
      status: "active",
    },
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: "bank-service-hanbit",
      transaction_fingerprint: "service-fingerprint",
      occurred_at: "2026-07-15T01:00:00.000Z",
      direction: "inflow",
      amount: 6_000_000,
      currency: "KRW",
      status: "posted",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id: "classification-service-hanbit",
      bank_transaction_id: "bank-service-hanbit",
      client_group_id: "client-hanbit",
      transaction_direction: "inflow",
      amount: 6_000_000,
      currency: "KRW",
      category: "client_receipt",
      status: "confirmed",
    },
    {
      model_type: "FeeCommitment",
      tenant_id: TENANT,
      fee_commitment_id: "fee-service-hanbit",
      client_group_id: "client-hanbit",
      opportunity_id: "opp-service-hanbit",
      currency: "KRW",
      agreed_amount: 10_000_000,
      due_date: "2026-07-10",
      accepted_at: "2026-06-01T00:00:00.000Z",
      status: "active",
      state_version: 2,
      created_by: "user-service",
      updated_by: "user-service",
      reason: "service fixture",
    },
    {
      model_type: "ClientDepositAllocation",
      tenant_id: TENANT,
      client_deposit_allocation_id: "allocation-service-hanbit",
      client_group_id: "client-hanbit",
      bank_transaction_id: "bank-service-hanbit",
      bank_transaction_classification_id: "classification-service-hanbit",
      fee_commitment_id: "fee-service-hanbit",
      currency: "KRW",
      allocated_amount: 6_000_000,
      reversed_amount: 0,
      refund_reversed_amount: 0,
      adjustment_reversed_amount: 0,
      allocation_source: "automatic",
      manual_lock: false,
      state_version: 3,
      allocated_at: "2026-07-15T02:00:00.000Z",
      created_by: "user-service",
      updated_by: "user-service",
      reason: "service fixture",
    },
  ];
  const repository = {
    list(query = {}) {
      return records.filter((record) => (
        (!query.tenant_id || record.tenant_id === query.tenant_id)
        && (!query.model_type || record.model_type === query.model_type)
      ));
    },
  };
  const serviceResult = buildClientReceivables({
    repository,
    tenant_id: TENANT,
    permitted_client_records: [records[0]],
    clock: () => new Date("2026-07-31T00:00:00.000Z"),
  });
  return {
    kind: "data",
    outcome: "complete",
    uiState: null,
    ...serviceResult,
    count_leak_prevented: true,
  };
}

test("고정 금액 수임료와 자동 배분은 남은 미수금을 계산한다", () => {
  const result = model();
  const fixed = result.commitments.find((item) => item.feeCommitmentId === "fee-fixed");
  assert.equal(result.state, "data");
  assert.equal(fixed.activeAllocatedAmount, 6_000_000);
  assert.equal(fixed.receivableAmount, 4_000_000);
  assert.equal(result.allocations[0].allocationSourceLabel, "자동 배분");
  assert.equal(result.totalReceivables, 4_000_000);
  assert.equal(result.invoiceRequired, false);
  assert.equal(result.matterRequired, false);
});

test("금액 미입력과 0원 약정은 서로 다르게 표시하고 양의 금액도 KRW 정수로 유지한다", () => {
  const result = buildClientReceivablesModel({
    feeCommitmentsResult: data([
      commitment({ fee_commitment_id: "fee-unknown", client_group_id: "client-unknown", display_name: "미입력", agreed_amount: null }),
      commitment({ fee_commitment_id: "fee-zero", client_group_id: "client-zero", display_name: "0원 확인", agreed_amount: 0 }),
    ]),
    allocationsResult: data([]),
  });
  assert.equal(result.state, "partial");
  assert.equal(result.commitments[0].amountStatusLabel, "금액 미입력");
  assert.equal(result.commitments[1].amountStatusLabel, "금액 확인");
  assert.equal(result.commitments[1].receivableAmount, 0);
  assert.deepEqual(result.commitments.map((item) => item.agreedAmount), [null, 0]);
  assert.equal(result.totalOverpayment, null);
  assert.equal(result.unallocatedAmount, null);
  assert.equal(result.sourceCoverage.deposits.complete, false);
});

test("수동 배분은 잠금 표시를 유지하고 초과 입금은 미배분 금액으로 남긴다", () => {
  const result = model({ statusTab: "초과 입금" });
  const manual = result.allocations.find((item) => item.allocationSource === "manual");
  assert.equal(manual.manualLock, true);
  assert.equal(manual.allocationSourceLabel, "수동 배분");
  assert.equal(result.unallocatedAmount, 2_000_000);
  assert.deepEqual(result.visibleCommitments.map((item) => item.feeCommitmentId), ["fee-advance"]);
});

test("환불 연결액을 차감한 순입금과 배분액을 대사한다", () => {
  const result = model();
  const deposit = result.deposits.find((item) => item.bankTransactionId === "bank-hanbit");
  assert.equal(deposit.grossAmount, 7_000_000);
  assert.equal(deposit.linkedRefundAmount, 1_000_000);
  assert.equal(deposit.netAmount, 6_000_000);
  assert.equal(deposit.activeAllocatedAmount, 6_000_000);
  assert.equal(deposit.overpaymentAmount, 0);
});

test("선택은 명시적인 허용 약정에만 적용하고 첫 항목을 자동 선택하지 않는다", () => {
  const none = model();
  assert.equal(none.selectedFeeCommitmentId, null);
  assert.equal(none.selectedFeeCommitment, null);
  assert.equal(none.requestedFeeCommitmentAvailable, null);

  const selected = model({ requestedFeeCommitmentId: "fee-unknown" });
  assert.equal(selected.selectedFeeCommitmentId, "fee-unknown");
  assert.equal(selected.requestedFeeCommitmentAvailable, true);

  const hidden = model({ requestedFeeCommitmentId: "fee-not-authorized" });
  assert.equal(hidden.selectedFeeCommitmentId, null);
  assert.equal(hidden.requestedFeeCommitmentAvailable, false);
  assert.equal(JSON.stringify(hidden).includes("fee-not-authorized"), false);
  const filtered = model({ statusTab: "정산 완료", requestedFeeCommitmentId: "fee-fixed" });
  assert.equal(filtered.visibleCommitments.some((item) => item.feeCommitmentId === "fee-fixed"), false);
  assert.equal(filtered.selectedFeeCommitmentId, null);
  assert.equal(filtered.requestedFeeCommitmentAvailable, false);
  assert.deepEqual(filtered.authorizedFeeCommitmentIds, ["fee-advance"]);
  assert.equal(resolveClientReceivableSelection("fee-fixed", ["fee-fixed"]), "fee-fixed");
  assert.equal(resolveClientReceivableSelection("fee-hidden", ["fee-fixed"]), null);
  assert.deepEqual(CLIENT_RECEIVABLE_STATUS_TABS.map(({ label }) => label), ["전체", "미수금 있음", "금액 미입력", "초과 입금", "정산 완료"]);
});

test("재무 활동이 없는 허용 고객은 0원/빈 상태로 보존하고 전체 화면을 오류로 만들지 않는다", () => {
  const fixture = receivablesFixture();
  fixture.client_summaries.push({
    client_group_id: "client-no-activity",
    display_name: "아직 수임료 없는 고객",
    agreed_amount: null,
    active_allocated_amount: 0,
    receivable_amount: null,
    unknown_amount_count: 0,
    overpayment_amount: 0,
    earliest_due_date: null,
  });
  const result = model({ receivablesResult: fixture });
  assert.equal(result.state, "data");
  assert.deepEqual(
    result.clientSummaries.find((row) => row.clientGroupId === "client-no-activity"),
    {
      clientGroupId: "client-no-activity",
      displayName: "아직 수임료 없는 고객",
      agreedAmount: null,
      activeAllocatedAmount: 0,
      receivableAmount: null,
      unknownAmountCount: 0,
      overpaymentAmount: 0,
      earliestDueDate: null,
    },
  );
});

test("실제 receivables service summary shape는 ranking/허용 고객 목록으로 표시 필드를 안전하게 보완한다", () => {
  const fixture = structuredClone(receivablesFixture());
  for (const summary of fixture.client_summaries) {
    delete summary.display_name;
    delete summary.earliest_due_date;
  }
  const clients = data([
    { client_group_id: "client-hanbit", display_name: "한빛건설" },
    { client_group_id: "client-unknown", display_name: "금액 미입력 고객" },
    { client_group_id: "client-advance", display_name: "선입금 고객" },
  ]);
  const result = buildClientReceivablesModel({
    receivablesResult: fixture,
    clientsResult: clients,
  });
  assert.equal(result.state, "data");
  const hanbit = result.clientSummaries.find((row) => row.clientGroupId === "client-hanbit");
  assert.equal(hanbit.displayName, "한빛건설");
  assert.equal(hanbit.earliestDueDate, "2026-07-10");
  assert.deepEqual(result.ranking.map(({ displayName, earliestDueDate }) => [displayName, earliestDueDate]), [["한빛건설", "2026-07-10"]]);
});

test("실제 buildClientReceivables service 출력은 API 경계 뒤에서 정상 정규화된다", () => {
  const result = buildClientReceivablesModel({
    receivablesResult: buildActualServiceResult(),
  });
  assert.equal(result.state, "data");
  assert.equal(result.totalReceivables, 4_000_000);
  assert.equal(result.clientSummaries[0].displayName, "한빛건설");
  assert.equal(result.clientSummaries[0].earliestDueDate, "2026-07-10");
  assert.equal(result.ranking[0].displayName, "한빛건설");
});

test("실제 state_version이 없는 읽기 행은 null로 남고 version을 조작하지 않는다", () => {
  const fixture = structuredClone(receivablesFixture());
  delete fixture.details.fee_commitments[0].state_version;
  delete fixture.details.allocations[0].state_version;
  const result = model({ receivablesResult: fixture, requestedFeeCommitmentId: "fee-fixed" });
  const fee = result.selectedFeeCommitment;
  assert.equal(fee.stateVersion, null);
  assert.equal(result.allocations[0].stateVersion, null);
});

test("수임료 생성·수정·취소 명령은 금액·사유·기대 버전을 고정한다", () => {
  const created = buildFeeCommitmentCommand({
    operation: "create",
    idempotencyKey: "fee-create-1",
    tenantId: TENANT,
    feeCommitmentId: "fee-new",
    clientGroupId: "client-new",
    opportunityId: "opp-new",
    agreedAmount: 0,
    dueDate: null,
    acceptedAt: "2026-07-31T00:00:00.000Z",
    reason: "수임료 확인",
  });
  assert.equal(created.fee_commitment.currency, "KRW");
  assert.equal(created.fee_commitment.agreed_amount, 0);
  assert.equal("invoice_id" in created.fee_commitment, false);

  const edited = buildFeeCommitmentCommand({
    operation: "edit",
    idempotencyKey: "fee-edit-1",
    tenantId: TENANT,
    feeCommitmentId: "fee-new",
    expectedStateVersion: 2,
    changes: { agreedAmount: null, dueDate: "2026-08-10" },
    reason: "금액 미입력으로 정정",
  });
  assert.deepEqual(edited.changes, { agreed_amount: null, due_date: "2026-08-10" });

  const cancelled = buildFeeCommitmentCommand({
    operation: "cancel",
    idempotencyKey: "fee-cancel-1",
    tenantId: TENANT,
    feeCommitmentId: "fee-new",
    expectedStateVersion: 3,
    reason: "수임 취소",
  });
  assert.deepEqual(cancelled.changes, { status: "cancelled" });
  assert.throws(() => buildFeeCommitmentCommand({ ...cancelled, reason: "" }), /reason is required/);
  assert.throws(() => buildFeeCommitmentCommand({ ...cancelled, expected_state_version: 0 }), /positive integer/);
});

test("수동 재배분 명령은 allocation version과 사유를 요구하고 0원 target도 허용한다", () => {
  const command = buildClientDepositReallocationCommand({
    tenantId: TENANT,
    bankTransactionId: "bank-hanbit",
    expectedAllocations: [{ clientDepositAllocationId: "allocation-auto", stateVersion: 3 }],
    targets: [{ feeCommitmentId: "fee-fixed", activeAmount: 0 }],
    reason: "수임료 재배분",
    idempotencyKey: "reallocate-1",
  });
  assert.equal(command.targets[0].active_amount, 0);
  assert.equal(command.expected_allocations[0].state_version, 3);
  assert.throws(() => buildClientDepositReallocationCommand({ ...command, reason: "" }), /reason is required/);
});

test("재실행·version 충돌·권한·부분·빈 데이터·오류 상태를 구분한다", () => {
  assert.equal(normalizeFeeCommitmentMutationResult({ kind: "data", outcome: "idempotent_replay" }).state, "replayed");
  assert.equal(normalizeFeeCommitmentMutationResult({ kind: "error", status: 409, body: { safe_error_codes: ["FINANCE_FEE_COMMITMENT_VERSION_CONFLICT"] } }).state, "stale_conflict");
  assert.equal(normalizeFeeCommitmentMutationResult({ kind: "guarded", uiState: "denied" }).state, "denied");
  assert.equal(normalizeFeeCommitmentMutationResult({ kind: "data", outcome: "partial" }).state, "partial");
  assert.equal(buildClientReceivablesModel({ receivablesResult: { kind: "empty", uiState: "empty" } }).state, "empty");
  assert.equal(buildClientReceivablesModel({ receivablesResult: { kind: "error", uiState: "error" } }).state, "error");
  const denied = buildClientReceivablesModel({ receivablesResult: { kind: "data", uiState: "denied", items: [commitment()] }, requestedFeeCommitmentId: "fee-fixed" });
  assert.equal(denied.state, "denied");
  assert.equal(denied.totalReceivables, null);
  assert.equal(denied.selectedFeeCommitment, null);
});

test("권한 경계가 없거나 hostile 원천 필드가 들어오면 fail closed하고 출력에는 원문이 없다", () => {
  assert.equal(buildClientReceivablesModel({ receivablesResult: {} }).state, "error");
  const missingBoundary = structuredClone(receivablesFixture());
  delete missingBoundary.permission_prefilter_applied;
  assert.equal(buildClientReceivablesModel({ receivablesResult: missingBoundary }).state, "error");
  const deniedRows = buildClientReceivablesModel({
    receivablesResult: {
      kind: "data",
      outcome: "denied",
      uiState: "denied",
      permission_prefilter_applied: false,
      count_leak_prevented: true,
      items: [commitment(), commitment({ fee_commitment_id: "fee-hidden-2" })],
    },
  });
  assert.equal(deniedRows.state, "denied");
  assert.equal(deniedRows.sourceCoverage.receivables.itemCount, null);
  assert.equal(deniedRows.totalReceivables, null);
  const countLeakFalse = buildClientReceivablesModel({
    receivablesResult: data([commitment(), commitment({ fee_commitment_id: "fee-hidden-3" })], { count_leak_prevented: false }),
  });
  assert.equal(countLeakFalse.state, "error");
  assert.equal(countLeakFalse.sourceCoverage.receivables.itemCount, null);
  assert.deepEqual(countLeakFalse.commitments, []);
  assert.equal(countLeakFalse.totalReceivables, null);
  assert.doesNotThrow(() => {
    assert.equal(buildClientReceivablesModel({
      receivablesResult: {
        kind: "data",
        outcome: "denied",
        uiState: "denied",
        permission_prefilter_applied: false,
        count_leak_prevented: true,
        items: [{}],
      },
      clientsResult: {
        kind: "data",
        permission_prefilter_applied: false,
        count_leak_prevented: true,
        items: [{ client_group_id: "same", display_name: "숨김" }, { client_group_id: " same ", display_name: "중복" }],
      },
    }).state, "denied");
  });

  const hostile = receivablesFixture();
  hostile.details.fee_commitments[0].bank_reference = "BANK-SECRET-123";
  hostile.details.fee_commitments[0].credential_material = "CREDENTIAL-SECRET-123";
  hostile.details.deposits[0].source_payload = "RAW-BANK-PAYLOAD-123";
  hostile.details.deposits[0].invoice_id = "invoice-secret-123";
  const result = model({ receivablesResult: hostile });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("BANK-SECRET-123"), false);
  assert.equal(serialized.includes("CREDENTIAL-SECRET-123"), false);
  assert.equal(serialized.includes("RAW-BANK-PAYLOAD-123"), false);
  assert.equal(serialized.includes("invoice-secret-123"), false);
  const unsafe = buildClientReceivablesModel({ receivablesResult: receivablesFixture({ invoice_required: true }) });
  assert.equal(unsafe.state, "error");
});

test("중복·교차 참조·overflow·상단 합계 불일치는 숫자를 표시하지 않고 오류로 닫는다", () => {
  const duplicate = receivablesFixture();
  duplicate.details.fee_commitments.push(duplicate.details.fee_commitments[0]);
  assert.equal(model({ receivablesResult: duplicate }).state, "error");

  const orphan = receivablesFixture();
  orphan.details.allocations.push({
    ...orphan.details.allocations[0],
    client_deposit_allocation_id: "allocation-orphan",
    fee_commitment_id: "fee-not-found",
  });
  assert.equal(model({ receivablesResult: orphan }).state, "error");

  const overflow = buildClientReceivablesModel({
    feeCommitmentsResult: data([
      commitment({ fee_commitment_id: "fee-overflow-a", client_group_id: "client-overflow-a", display_name: "초과 A", agreed_amount: Number.MAX_SAFE_INTEGER }),
      commitment({ fee_commitment_id: "fee-overflow-b", client_group_id: "client-overflow-b", display_name: "초과 B", agreed_amount: Number.MAX_SAFE_INTEGER }),
    ]),
    allocationsResult: data([]),
  });
  assert.equal(overflow.state, "error");

  for (const [field, value] of [
    ["unknown_amount_count", 42],
    ["unallocated_amount", 777],
  ]) {
    const mismatch = receivablesFixture({ [field]: value });
    assert.equal(model({ receivablesResult: mismatch }).state, "error");
  }
  const rankingMismatch = receivablesFixture();
  rankingMismatch.ranking[0].receivable_amount = 999;
  assert.equal(model({ receivablesResult: rankingMismatch }).state, "error");
  const rankRepair = receivablesFixture();
  delete rankRepair.ranking[0].rank;
  assert.equal(model({ receivablesResult: rankRepair }).state, "error");
  const trimDuplicate = receivablesFixture();
  trimDuplicate.details.fee_commitments.push({
    ...trimDuplicate.details.fee_commitments[0],
    fee_commitment_id: ` ${trimDuplicate.details.fee_commitments[0].fee_commitment_id} `,
  });
  assert.equal(model({ receivablesResult: trimDuplicate }).state, "error");
});

test("배분 source가 아직 없거나 실패한 split 응답은 미수금을 확정하지 않는다", () => {
  const feeOnly = buildClientReceivablesModel({
    feeCommitmentsResult: data([commitment({ agreed_amount: 100 })]),
  });
  assert.equal(feeOnly.state, "loading");
  const allocationLoading = buildClientReceivablesModel({
    feeCommitmentsResult: data([commitment({ agreed_amount: 100 })]),
    allocationsResult: { kind: "loading" },
  });
  assert.equal(allocationLoading.state, "loading");
  const allocationError = buildClientReceivablesModel({
    feeCommitmentsResult: data([commitment({ agreed_amount: 100 })]),
    allocationsResult: { kind: "error", uiState: "error" },
  });
  assert.equal(allocationError.state, "error");
});

test("배분 source partial은 빈 목록이나 일부 목록을 0원 배분으로 확정하지 않고 complete empty만 0원으로 계산한다", () => {
  const feeRows = [
    commitment({
      fee_commitment_id: "fee-partial-a",
      client_group_id: "client-partial-a",
      display_name: "부분 조회 A",
      agreed_amount: 100,
    }),
    commitment({
      fee_commitment_id: "fee-partial-b",
      client_group_id: "client-partial-b",
      display_name: "부분 조회 B",
      agreed_amount: 200,
    }),
  ];
  const partialEmpty = buildClientReceivablesModel({
    feeCommitmentsResult: data(feeRows),
    allocationsResult: data([], { kind: "partial", outcome: null, uiState: "partial" }),
  });
  assert.equal(partialEmpty.state, "partial");
  assert.equal(partialEmpty.totalReceivables, null);
  assert.deepEqual(partialEmpty.clientSummaries, []);
  assert.deepEqual(partialEmpty.ranking, []);
  assert.equal(partialEmpty.partialSources.includes("allocations"), true);
  assert.equal(partialEmpty.partialSources.includes("deposits"), true);
  assert.equal(partialEmpty.sourceCoverage.allocations.complete, false);
  assert.equal(partialEmpty.sourceCoverage.allocations.itemCount, null);
  assert.match(partialEmpty.partialReason, /일부만 확인/);

  const partialSubset = buildClientReceivablesModel({
    feeCommitmentsResult: data(feeRows),
    allocationsResult: data([
      allocation({
        client_deposit_allocation_id: "allocation-partial-a",
        client_group_id: "client-partial-a",
        fee_commitment_id: "fee-partial-a",
        allocated_amount: 100,
      }),
    ], { outcome: "partial", uiState: "partial" }),
  });
  assert.equal(partialSubset.state, "partial");
  assert.equal(partialSubset.totalReceivables, null);
  assert.deepEqual(partialSubset.clientSummaries, []);
  assert.deepEqual(partialSubset.ranking, []);
  assert.equal(partialSubset.sourceCoverage.allocations.itemCount, null);
  assert.match(partialSubset.sourceCoverage.allocations.label, /일부만 확인/);

  const completeEmpty = buildClientReceivablesModel({
    receivablesResult: data([], { details: { deposits: [] } }),
    feeCommitmentsResult: data(feeRows),
    allocationsResult: data([]),
  });
  assert.equal(completeEmpty.state, "data");
  assert.equal(completeEmpty.totalReceivables, 300);
  assert.deepEqual(completeEmpty.allocations, []);
  assert.equal(completeEmpty.sourceCoverage.allocations.complete, true);
  assert.equal(completeEmpty.sourceCoverage.allocations.itemCount, 0);
  assert.equal(completeEmpty.sourceCoverage.deposits.complete, true);
  assert.equal(completeEmpty.sourceCoverage.deposits.itemCount, 0);
});

test("수임료·배분은 완전하지만 입금 source가 없으면 미수금만 계산하고 초과 입금은 미확인으로 둔다", () => {
  const fee = commitment({
    fee_commitment_id: "fee-ar-only",
    client_group_id: "client-ar-only",
    display_name: "미수금만 확인",
    agreed_amount: 100,
  });
  const allocationRow = allocation({
    client_deposit_allocation_id: "allocation-ar-only",
    client_group_id: "client-ar-only",
    bank_transaction_id: "bank-ar-only",
    fee_commitment_id: "fee-ar-only",
    allocated_amount: 40,
  });
  const result = buildClientReceivablesModel({
    feeCommitmentsResult: data([fee]),
    allocationsResult: data([allocationRow]),
  });
  assert.equal(result.state, "partial");
  assert.equal(result.totalReceivables, 60);
  assert.equal(result.totalOverpayment, null);
  assert.equal(result.unallocatedAmount, null);
  assert.deepEqual(result.deposits, []);
  assert.equal(result.clientSummaries[0].receivableAmount, 60);
  assert.equal(result.clientSummaries[0].overpaymentAmount, null);
  assert.equal(result.sourceCoverage.feeCommitments.complete, true);
  assert.equal(result.sourceCoverage.allocations.complete, true);
  assert.equal(result.sourceCoverage.deposits.complete, false);
  assert.equal(result.sourceCoverage.deposits.itemCount, null);
  assert.equal(result.partialSources.includes("deposits"), true);
  assert.match(result.partialReason, /입금/);

  const loadingDepositSource = buildClientReceivablesModel({
    receivablesResult: { kind: "loading" },
    feeCommitmentsResult: data([fee]),
    allocationsResult: data([]),
  });
  assert.equal(loadingDepositSource.state, "partial");
  assert.equal(loadingDepositSource.totalReceivables, 100);
  assert.equal(loadingDepositSource.totalOverpayment, null);
  assert.equal(loadingDepositSource.sourceCoverage.deposits.state, "loading");

});

test("camel/snake 필드는 같은 trim canonical 규칙으로 정규화한다", () => {
  const result = buildClientReceivablesModel({
    feeCommitmentsResult: data([{
      modelType: "FeeCommitment",
      feeCommitmentId: " fee-camel ",
      clientGroupId: " client-camel ",
      displayName: "카멜 고객",
      opportunityId: "opp-camel",
      currency: "KRW",
      agreedAmount: 100,
      dueDate: "2026-08-01",
      acceptedAt: "2026-07-31T00:00:00Z",
      status: "active",
      stateVersion: 1,
    }]),
    allocationsResult: data([]),
  });
  assert.equal(result.state, "partial");
  assert.equal(result.commitments[0].feeCommitmentId, "fee-camel");
  assert.equal(result.commitments[0].clientGroupId, "client-camel");
  assert.equal(result.totalReceivables, 100);
  assert.equal(result.totalOverpayment, null);
  assert.equal(result.unallocatedAmount, null);
});

test("음수·소수·잘못된 달력일과 UTC offset 없는 instant는 허용하지 않는다", () => {
  const negative = buildClientReceivablesModel({
    feeCommitmentsResult: data([commitment({ agreed_amount: -1 })]),
    allocationsResult: data([]),
  });
  assert.equal(negative.state, "error");
  const fractional = buildClientReceivablesModel({
    feeCommitmentsResult: data([commitment({ agreed_amount: 1.5 })]),
    allocationsResult: data([]),
  });
  assert.equal(fractional.state, "error");
  assert.throws(() => buildFeeCommitmentCommand({
    operation: "create",
    idempotencyKey: "invalid-date",
    tenantId: TENANT,
    feeCommitmentId: "fee-invalid-date",
    clientGroupId: "client-invalid-date",
    opportunityId: "opp-invalid-date",
    agreedAmount: 0,
    dueDate: "2026-02-31",
    acceptedAt: "2026-07-31T00:00:00.000Z",
    reason: "날짜 검증",
  }), /valid calendar date/);
  assert.throws(() => buildFeeCommitmentCommand({
    operation: "create",
    idempotencyKey: "invalid-instant",
    tenantId: TENANT,
    feeCommitmentId: "fee-invalid-instant",
    clientGroupId: "client-invalid-instant",
    opportunityId: "opp-invalid-instant",
    agreedAmount: 0,
    dueDate: null,
    acceptedAt: "2026-07-31T00:00:00",
    reason: "시간 검증",
  }), /explicit UTC offset/);
});
