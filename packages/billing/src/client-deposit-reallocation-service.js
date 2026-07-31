import { hashEventBody } from "../../audit/src/events.js";
import { appendFinanceAuditEvent } from "./finance-audit.js";
import { normalizeClientDepositAllocation } from "./client-deposit-allocation-model.js";
import {
  clientDepositAllocationId,
  compareFeeCommitmentsForAutomaticAllocation,
} from "./client-deposit-allocation-service.js";
import { buildConfirmedClientDepositSources } from "./client-deposit-source.js";
import { normalizeFeeCommitment } from "./fee-commitment-model.js";

export const CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES = Object.freeze({
  idempotency_conflict: "FINANCE_IDEMPOTENCY_CONFLICT",
  invalid_source: "FINANCE_DEPOSIT_ALLOCATION_SOURCE_INVALID",
  invalid_state: "FINANCE_DEPOSIT_ALLOCATION_STATE_INVALID",
  invalid_target: "FINANCE_DEPOSIT_REALLOCATION_INVALID",
  version_conflict: "FINANCE_DEPOSIT_ALLOCATION_VERSION_CONFLICT",
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function commandError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function wholeKrw(value, field, { positive = false } = {}) {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || (positive ? value <= 0 : value < 0)
  ) {
    const qualifier = positive ? "positive" : "non-negative";
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
      `${field} must be a ${qualifier} whole KRW amount`,
      400,
    );
  }
  return value;
}

function addWholeKrw(left, right, field) {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_state,
      `${field} exceeds the supported KRW range`,
    );
  }
  return total;
}

function positiveInteger(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
      `${field} must be a positive integer`,
      400,
    );
  }
  return value;
}

function activeAmount(allocation) {
  return allocation.allocated_amount - allocation.reversed_amount;
}

function allocationFingerprint({
  tenantId,
  bankTransactionId,
  expectedAllocations,
  targets,
  reason,
}) {
  return hashEventBody({
    operation: "client_deposit_reallocate_v1",
    tenant_id: tenantId,
    bank_transaction_id: bankTransactionId,
    expected_allocations: expectedAllocations,
    targets,
    reason,
  });
}

function reversalFingerprint({ tenantId, actorId }) {
  return hashEventBody({
    operation: "client_deposit_reversal_sync_v1",
    tenant_id: tenantId,
    actor_id: actorId,
  });
}

function expectedAllocationVersions(input) {
  if (!Array.isArray(input) || input.length > 200) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
      "expected_allocations must contain at most 200 rows",
      400,
    );
  }
  const rows = input.map((row) => Object.freeze({
    client_deposit_allocation_id: requiredString(
      row,
      "client_deposit_allocation_id",
    ),
    state_version: positiveInteger(row.state_version, "state_version"),
  }));
  const ids = new Set(rows.map((row) => row.client_deposit_allocation_id));
  if (ids.size !== rows.length) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
      "expected_allocations contains duplicate allocation IDs",
      400,
    );
  }
  return Object.freeze(rows.sort((left, right) => (
    left.client_deposit_allocation_id.localeCompare(
      right.client_deposit_allocation_id,
      "en",
    )
  )));
}

function reallocationTargets(input) {
  if (!Array.isArray(input) || input.length > 200) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
      "targets must contain at most 200 rows",
      400,
    );
  }
  const rows = input.map((row) => Object.freeze({
    fee_commitment_id: requiredString(row, "fee_commitment_id"),
    active_amount: wholeKrw(row.active_amount, "active_amount"),
  }));
  const ids = new Set(rows.map((row) => row.fee_commitment_id));
  if (ids.size !== rows.length) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
      "targets contains duplicate FeeCommitment IDs",
      400,
    );
  }
  return Object.freeze(rows.sort((left, right) => (
    left.fee_commitment_id.localeCompare(right.fee_commitment_id, "en")
  )));
}

function sourceState(repository, tenantId) {
  try {
    return buildConfirmedClientDepositSources({
      repository,
      tenant_id: tenantId,
    });
  } catch (error) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_source,
      error.message,
    );
  }
}

function allocationRecords(repository, tenantId) {
  try {
    return repository
      .list({ tenant_id: tenantId, model_type: "ClientDepositAllocation" })
      .map(normalizeClientDepositAllocation);
  } catch (error) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_state,
      error.message,
    );
  }
}

function feeCommitmentsById(repository, tenantId) {
  try {
    return new Map(repository
      .list({ tenant_id: tenantId, model_type: "FeeCommitment" })
      .map(normalizeFeeCommitment)
      .map((commitment) => [
        commitment.fee_commitment_id,
        commitment,
      ]));
  } catch (error) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_state,
      error.message,
    );
  }
}

function activeCommitment(commitment) {
  return (
    commitment?.status === "active"
    && commitment.agreed_amount !== null
    && commitment.agreed_amount > 0
  );
}

function compareRefundReversalOrder(commitments) {
  return (left, right) => (
    Number(left.manual_lock) - Number(right.manual_lock)
    || compareFeeCommitmentsForAutomaticAllocation(
      commitments.get(right.fee_commitment_id),
      commitments.get(left.fee_commitment_id),
    )
    || right.client_deposit_allocation_id.localeCompare(
      left.client_deposit_allocation_id,
      "en",
    )
  );
}

function emptyReversalResult() {
  return Object.freeze({
    outcome: "unchanged",
    updated_count: 0,
    linked_refund_amount: 0,
    refund_reversed_amount: 0,
    unapplied_refund_amount: 0,
    inactive_commitment_released_amount: 0,
    allocations: Object.freeze([]),
    audit_event: null,
    idempotent_replay: false,
  });
}

export function synchronizeClientDepositAllocationReversals({
  repository,
  tenant_id,
  actor_id,
  idempotency_key,
} = {}) {
  if (
    typeof repository?.transaction !== "function"
    || typeof repository?.getIdempotency !== "function"
  ) {
    throw new TypeError("Finance repository is required");
  }
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const fingerprint = reversalFingerprint({ tenantId, actorId });
  const replay = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    if (
      replay.operation !== "client_deposit_allocation_reversal_sync"
      || replay.request_fingerprint !== fingerprint
    ) {
      throw commandError(
        CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.idempotency_conflict,
        "Idempotency key is already bound to another Finance request",
      );
    }
    return Object.freeze({ ...replay.response, idempotent_replay: true });
  }

  const allocations = allocationRecords(repository, tenantId);
  if (allocations.length === 0) return emptyReversalResult();
  const sources = sourceState(repository, tenantId);
  const receipts = new Map(sources.receipts.map((receipt) => [
    receipt.transaction.bank_transaction_id,
    receipt,
  ]));
  const commitments = feeCommitmentsById(repository, tenantId);

  return repository.transaction((tx) => {
    const byTransaction = new Map();
    for (const allocation of allocations) {
      if (!commitments.has(allocation.fee_commitment_id)) {
        throw commandError(
          CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_state,
          `FeeCommitment not found: ${allocation.fee_commitment_id}`,
        );
      }
      const values = byTransaction.get(allocation.bank_transaction_id) ?? [];
      values.push(allocation);
      byTransaction.set(allocation.bank_transaction_id, values);
    }

    const affected = [];
    let linkedRefundAmount = 0;
    let refundReversedAmount = 0;
    let unappliedRefundAmount = 0;
    let inactiveReleasedAmount = 0;
    for (const [bankTransactionId, transactionAllocations] of byTransaction) {
      const receipt = receipts.get(bankTransactionId);
      if (!receipt) {
        throw commandError(
          CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_source,
          `Confirmed canonical client receipt not found: ${bankTransactionId}`,
        );
      }
      linkedRefundAmount = addWholeKrw(
        linkedRefundAmount,
        receipt.linked_refund_amount,
        "linked refund amount",
      );
      const desiredAdjustment = new Map();
      const refundCandidates = [];
      for (const allocation of transactionAllocations) {
        const commitment = commitments.get(allocation.fee_commitment_id);
        if (!activeCommitment(commitment)) {
          desiredAdjustment.set(
            allocation.client_deposit_allocation_id,
            allocation.allocated_amount,
          );
          inactiveReleasedAmount = addWholeKrw(
            inactiveReleasedAmount,
            activeAmount(allocation),
            "inactive commitment released amount",
          );
          continue;
        }
        desiredAdjustment.set(
          allocation.client_deposit_allocation_id,
          allocation.adjustment_reversed_amount,
        );
        refundCandidates.push(allocation);
      }
      refundCandidates.sort(compareRefundReversalOrder(commitments));
      const desiredRefund = new Map();
      let remainingRefund = receipt.linked_refund_amount;
      for (const allocation of refundCandidates) {
        const availableBeforeRefund = allocation.allocated_amount
          - desiredAdjustment.get(allocation.client_deposit_allocation_id);
        const amount = Math.min(remainingRefund, availableBeforeRefund);
        desiredRefund.set(allocation.client_deposit_allocation_id, amount);
        remainingRefund -= amount;
      }
      unappliedRefundAmount = addWholeKrw(
        unappliedRefundAmount,
        remainingRefund,
        "unapplied refund amount",
      );

      for (const allocation of transactionAllocations) {
        const allocationId = allocation.client_deposit_allocation_id;
        const adjustmentAmount = desiredAdjustment.get(allocationId);
        const refundAmount = desiredRefund.get(allocationId) ?? 0;
        refundReversedAmount = addWholeKrw(
          refundReversedAmount,
          refundAmount,
          "refund reversed amount",
        );
        const reversedAmount = addWholeKrw(
          adjustmentAmount,
          refundAmount,
          "allocation reversed amount",
        );
        if (
          allocation.adjustment_reversed_amount === adjustmentAmount
          && allocation.refund_reversed_amount === refundAmount
        ) continue;
        const updated = normalizeClientDepositAllocation({
          ...allocation,
          status: undefined,
          reversed_amount: reversedAmount,
          refund_reversed_amount: refundAmount,
          adjustment_reversed_amount: adjustmentAmount,
          state_version: allocation.state_version + 1,
          updated_by: actorId,
          reason: activeCommitment(
            commitments.get(allocation.fee_commitment_id),
          )
            ? "연결 환불 반영"
            : "수임료 약정 종료 반영",
        });
        tx.update({
          tenant_id: tenantId,
          model_type: "ClientDepositAllocation",
          client_deposit_allocation_id: allocationId,
        }, updated);
        affected.push(updated);
      }
    }
    if (affected.length === 0) {
      return Object.freeze({
        ...emptyReversalResult(),
        linked_refund_amount: linkedRefundAmount,
        refund_reversed_amount: refundReversedAmount,
        unapplied_refund_amount: unappliedRefundAmount,
        inactive_commitment_released_amount: inactiveReleasedAmount,
      });
    }
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "client.deposit.allocation.reversal.sync",
        object_type: "ClientDepositAllocation",
        object_id: "client-deposit-allocation-reversal-batch",
        idempotency_key: idempotencyKey,
        metadata: {
          updated_count: affected.length,
          linked_refund_amount: linkedRefundAmount,
          refund_reversed_amount: refundReversedAmount,
          unapplied_refund_amount: unappliedRefundAmount,
          inactive_commitment_released_amount: inactiveReleasedAmount,
          manual_locks_removed: false,
          raw_source_payload_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "synchronized",
      updated_count: affected.length,
      linked_refund_amount: linkedRefundAmount,
      refund_reversed_amount: refundReversedAmount,
      unapplied_refund_amount: unappliedRefundAmount,
      inactive_commitment_released_amount: inactiveReleasedAmount,
      allocations: Object.freeze(affected),
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "client_deposit_allocation_reversal_sync",
      request_fingerprint: fingerprint,
      response,
    });
    return response;
  });
}

export function reallocateClientDeposit({
  repository,
  tenant_id,
  bank_transaction_id,
  expected_allocations = [],
  targets = [],
  reason,
  actor_id,
  idempotency_key,
  clock = () => new Date(),
} = {}) {
  if (
    typeof repository?.transaction !== "function"
    || typeof repository?.getIdempotency !== "function"
  ) {
    throw new TypeError("Finance repository is required");
  }
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const bankTransactionId = requiredString(
    { bank_transaction_id },
    "bank_transaction_id",
  );
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const normalizedReason = requiredString({ reason }, "reason");
  const expectedAllocations = expectedAllocationVersions(expected_allocations);
  const normalizedTargets = reallocationTargets(targets);
  const fingerprint = allocationFingerprint({
    tenantId,
    bankTransactionId,
    expectedAllocations,
    targets: normalizedTargets,
    reason: normalizedReason,
  });
  const replay = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    if (
      replay.operation !== "client_deposit_reallocate"
      || replay.request_fingerprint !== fingerprint
    ) {
      throw commandError(
        CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.idempotency_conflict,
        "Idempotency key is already bound to another Finance request",
      );
    }
    return Object.freeze({ ...replay.response, idempotent_replay: true });
  }

  const sources = sourceState(repository, tenantId);
  const receipt = sources.receipts.find((candidate) => (
    candidate.transaction.bank_transaction_id === bankTransactionId
  ));
  if (!receipt) {
    throw commandError(
      CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_source,
      `Confirmed canonical client receipt not found: ${bankTransactionId}`,
    );
  }
  const commitments = feeCommitmentsById(repository, tenantId);

  return repository.transaction((tx) => {
    const allAllocations = allocationRecords(tx, tenantId);
    const current = allAllocations
      .filter((allocation) => (
        allocation.bank_transaction_id === bankTransactionId
      ))
      .sort((left, right) => (
        left.client_deposit_allocation_id.localeCompare(
          right.client_deposit_allocation_id,
          "en",
        )
      ));
    const expectedById = new Map(expectedAllocations.map((row) => [
      row.client_deposit_allocation_id,
      row.state_version,
    ]));
    if (
      expectedById.size !== current.length
      || current.some((allocation) => (
        expectedById.get(allocation.client_deposit_allocation_id)
          !== allocation.state_version
      ))
    ) {
      throw commandError(
        CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.version_conflict,
        "Client deposit allocations changed after the screen was loaded",
      );
    }

    const currentByCommitment = new Map();
    for (const allocation of current) {
      if (currentByCommitment.has(allocation.fee_commitment_id)) {
        throw commandError(
          CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_state,
          `Duplicate allocation pair for BankTransaction: ${allocation.fee_commitment_id}`,
        );
      }
      currentByCommitment.set(allocation.fee_commitment_id, allocation);
    }
    const targetsByCommitment = new Map(normalizedTargets.map((target) => [
      target.fee_commitment_id,
      target.active_amount,
    ]));
    const activeByOtherTransaction = new Map();
    for (const allocation of allAllocations) {
      if (allocation.bank_transaction_id === bankTransactionId) continue;
      activeByOtherTransaction.set(
        allocation.fee_commitment_id,
        addWholeKrw(
          activeByOtherTransaction.get(allocation.fee_commitment_id) ?? 0,
          activeAmount(allocation),
          "active allocations by other BankTransaction",
        ),
      );
    }
    let targetTotal = 0;
    for (const target of normalizedTargets) {
      const currentAllocation = currentByCommitment.get(
        target.fee_commitment_id,
      );
      if (target.active_amount === 0 && !currentAllocation) {
        throw commandError(
          CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
          `A zero target requires an existing allocation: ${target.fee_commitment_id}`,
          400,
        );
      }
      if (target.active_amount > 0) {
        const commitment = commitments.get(target.fee_commitment_id);
        if (
          !activeCommitment(commitment)
          || commitment.client_group_id !== receipt.client_group_id
          || commitment.currency !== "KRW"
        ) {
          throw commandError(
            CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
            `Target FeeCommitment is not active for this client: ${target.fee_commitment_id}`,
          );
        }
        const available = commitment.agreed_amount
          - (activeByOtherTransaction.get(target.fee_commitment_id) ?? 0);
        if (target.active_amount > available) {
          throw commandError(
            CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
            `Target exceeds FeeCommitment.agreed_amount: ${target.fee_commitment_id}`,
          );
        }
      }
      targetTotal = addWholeKrw(
        targetTotal,
        target.active_amount,
        "manual allocation target total",
      );
    }
    if (targetTotal > receipt.net_amount) {
      throw commandError(
        CLIENT_DEPOSIT_REALLOCATION_ERROR_CODES.invalid_target,
        "Manual allocation targets exceed the linked-refund-adjusted deposit",
      );
    }

    const allocatedAt = clock().toISOString();
    const affected = [];
    const resultingAllocations = [];
    for (const allocation of current) {
      const targetAmount = targetsByCommitment.get(
        allocation.fee_commitment_id,
      ) ?? 0;
      const allocatedAmount = Math.max(
        allocation.allocated_amount,
        allocation.refund_reversed_amount + targetAmount,
      );
      const adjustmentAmount = allocatedAmount
        - allocation.refund_reversed_amount
        - targetAmount;
      if (
        allocation.allocated_amount === allocatedAmount
        && allocation.adjustment_reversed_amount === adjustmentAmount
        && allocation.allocation_source === "manual"
        && allocation.manual_lock
      ) {
        resultingAllocations.push(allocation);
        targetsByCommitment.delete(allocation.fee_commitment_id);
        continue;
      }
      const updated = normalizeClientDepositAllocation({
        ...allocation,
        status: undefined,
        allocated_amount: allocatedAmount,
        reversed_amount:
          allocation.refund_reversed_amount + adjustmentAmount,
        adjustment_reversed_amount: adjustmentAmount,
        allocation_source: "manual",
        manual_lock: true,
        state_version: allocation.state_version + 1,
        updated_by: actorId,
        reason: normalizedReason,
      });
      tx.update({
        tenant_id: tenantId,
        model_type: "ClientDepositAllocation",
        client_deposit_allocation_id:
          allocation.client_deposit_allocation_id,
      }, updated);
      affected.push(updated);
      resultingAllocations.push(updated);
      targetsByCommitment.delete(allocation.fee_commitment_id);
    }
    for (const [feeCommitmentId, targetAmount] of targetsByCommitment) {
      if (targetAmount === 0) continue;
      const created = normalizeClientDepositAllocation({
        client_deposit_allocation_id: clientDepositAllocationId({
          tenantId,
          bankTransactionId,
          feeCommitmentId,
        }),
        tenant_id: tenantId,
        client_group_id: receipt.client_group_id,
        bank_transaction_id: bankTransactionId,
        bank_transaction_classification_id:
          receipt.classification.bank_transaction_classification_id,
        fee_commitment_id: feeCommitmentId,
        currency: "KRW",
        allocated_amount: targetAmount,
        reversed_amount: 0,
        refund_reversed_amount: 0,
        adjustment_reversed_amount: 0,
        allocation_source: "manual",
        manual_lock: true,
        state_version: 1,
        allocated_at: allocatedAt,
        created_by: actorId,
        updated_by: actorId,
        reason: normalizedReason,
      });
      tx.create(created);
      affected.push(created);
      resultingAllocations.push(created);
    }
    const sorted = Object.freeze(resultingAllocations.sort((left, right) => (
      left.fee_commitment_id.localeCompare(right.fee_commitment_id, "en")
    )));
    if (affected.length === 0) {
      return Object.freeze({
        outcome: "unchanged",
        bank_transaction_id: bankTransactionId,
        active_allocated_amount: targetTotal,
        unallocated_amount: receipt.net_amount - targetTotal,
        allocations: sorted,
        audit_event: null,
        idempotent_replay: false,
      });
    }
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "client.deposit.allocation.reallocate",
        object_type: "BankTransaction",
        object_id: bankTransactionId,
        idempotency_key: idempotencyKey,
        metadata: {
          reason: normalizedReason,
          allocation_count: sorted.length,
          target_active_amount: targetTotal,
          unallocated_amount: receipt.net_amount - targetTotal,
          manual_lock_applied: true,
          linked_refund_adjusted: true,
          raw_source_payload_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "reallocated",
      bank_transaction_id: bankTransactionId,
      active_allocated_amount: targetTotal,
      unallocated_amount: receipt.net_amount - targetTotal,
      allocations: sorted,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "client_deposit_reallocate",
      request_fingerprint: fingerprint,
      response,
    });
    return response;
  });
}

export function listClientDepositAllocations({
  repository,
  tenant_id,
  client_group_id = null,
  bank_transaction_id = null,
  fee_commitment_id = null,
  status = null,
} = {}) {
  if (!repository || typeof repository.list !== "function") {
    throw new TypeError("Finance repository is required");
  }
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  if (status !== null && !["active", "reversed"].includes(status)) {
    throw new TypeError("status is invalid");
  }
  return Object.freeze(repository
    .list({ tenant_id: tenantId, model_type: "ClientDepositAllocation" })
    .map(normalizeClientDepositAllocation)
    .filter((allocation) => (
      (!client_group_id || allocation.client_group_id === client_group_id)
      && (
        !bank_transaction_id
        || allocation.bank_transaction_id === bank_transaction_id
      )
      && (
        !fee_commitment_id
        || allocation.fee_commitment_id === fee_commitment_id
      )
      && (!status || allocation.status === status)
    ))
    .map((allocation) => Object.freeze({
      ...allocation,
      active_amount: activeAmount(allocation),
    }))
    .sort((left, right) => (
      Date.parse(right.allocated_at) - Date.parse(left.allocated_at)
      || left.client_deposit_allocation_id.localeCompare(
        right.client_deposit_allocation_id,
        "en",
      )
    )));
}
