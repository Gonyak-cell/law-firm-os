import { hashEventBody } from "../../audit/src/events.js";
import { appendFinanceAuditEvent } from "./finance-audit.js";
import { normalizeClientDepositAllocation } from "./client-deposit-allocation-model.js";
import { buildConfirmedClientDepositSources } from "./client-deposit-source.js";
import { normalizeFeeCommitment } from "./fee-commitment-model.js";

export const CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES = Object.freeze({
  idempotency_conflict: "FINANCE_IDEMPOTENCY_CONFLICT",
  invalid_source: "FINANCE_DEPOSIT_ALLOCATION_SOURCE_INVALID",
  invalid_state: "FINANCE_DEPOSIT_ALLOCATION_STATE_INVALID",
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

function addWholeKrw(left, right, field) {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw commandError(
      CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES.invalid_state,
      `${field} exceeds the supported KRW range`,
    );
  }
  return total;
}

function activeAmount(allocation) {
  return allocation.allocated_amount - allocation.reversed_amount;
}

function instant(value, field) {
  const milliseconds = Date.parse(requiredString({ [field]: value }, field));
  if (!Number.isFinite(milliseconds)) {
    throw commandError(
      CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES.invalid_source,
      `${field} must be a valid instant`,
    );
  }
  return milliseconds;
}

function allocationOrderTime(commitment) {
  if (commitment.due_date) {
    return Date.parse(`${commitment.due_date}T00:00:00.000Z`);
  }
  return instant(commitment.accepted_at, "FeeCommitment.accepted_at");
}

export function compareFeeCommitmentsForAutomaticAllocation(left, right) {
  return (
    allocationOrderTime(left) - allocationOrderTime(right)
    || instant(left.accepted_at, "FeeCommitment.accepted_at")
      - instant(right.accepted_at, "FeeCommitment.accepted_at")
    || left.fee_commitment_id.localeCompare(right.fee_commitment_id, "en")
  );
}

export function clientDepositAllocationId({
  tenantId,
  bankTransactionId,
  feeCommitmentId,
}) {
  return `client_deposit_allocation_${hashEventBody({
    tenant_id: tenantId,
    bank_transaction_id: bankTransactionId,
    fee_commitment_id: feeCommitmentId,
  }).slice(0, 24)}`;
}

function commandFingerprint({ tenantId, actorId }) {
  return hashEventBody({
    operation: "client_deposit_allocation_auto_v1",
    tenant_id: tenantId,
    actor_id: actorId,
  });
}

function allocationState(repository, tenantId) {
  const allocations = repository
    .list({ tenant_id: tenantId, model_type: "ClientDepositAllocation" })
    .map(normalizeClientDepositAllocation);
  const byTransaction = new Map();
  const byCommitment = new Map();
  const byPair = new Map();
  for (const allocation of allocations) {
    const amount = activeAmount(allocation);
    byTransaction.set(
      allocation.bank_transaction_id,
      addWholeKrw(
        byTransaction.get(allocation.bank_transaction_id) ?? 0,
        amount,
        "active allocation total by BankTransaction",
      ),
    );
    byCommitment.set(
      allocation.fee_commitment_id,
      addWholeKrw(
        byCommitment.get(allocation.fee_commitment_id) ?? 0,
        amount,
        "active allocation total by FeeCommitment",
      ),
    );
    const pairKey =
      `${allocation.bank_transaction_id}:${allocation.fee_commitment_id}`;
    if (byPair.has(pairKey)) {
      throw commandError(
        CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES.invalid_state,
        `Duplicate ClientDepositAllocation pair: ${pairKey}`,
      );
    }
    byPair.set(pairKey, allocation);
  }
  return { allocations, byTransaction, byCommitment, byPair };
}

function activeCommitments(repository, tenantId) {
  return repository
    .list({ tenant_id: tenantId, model_type: "FeeCommitment" })
    .map(normalizeFeeCommitment)
    .filter((commitment) => (
      commitment.status === "active"
      && commitment.agreed_amount !== null
      && commitment.agreed_amount > 0
    ));
}

function emptyResult() {
  return Object.freeze({
    outcome: "unchanged",
    created_count: 0,
    updated_count: 0,
    allocated_amount: 0,
    unallocated_amount: 0,
    advance_or_overpayment_amount: 0,
    transactions: Object.freeze([]),
    allocations: Object.freeze([]),
    audit_event: null,
    idempotent_replay: false,
  });
}

export function autoAllocateConfirmedClientDeposits({
  repository,
  tenant_id,
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
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const fingerprint = commandFingerprint({ tenantId, actorId });
  const replay = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    if (
      replay.operation !== "client_deposit_allocation_auto"
      || replay.request_fingerprint !== fingerprint
    ) {
      throw commandError(
        CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES.idempotency_conflict,
        "Idempotency key is already bound to another Finance request",
      );
    }
    return Object.freeze({ ...replay.response, idempotent_replay: true });
  }

  if (activeCommitments(repository, tenantId).length === 0) {
    return emptyResult();
  }
  let receipts;
  try {
    ({ receipts } = buildConfirmedClientDepositSources({
      repository,
      tenant_id: tenantId,
    }));
  } catch (error) {
    throw commandError(
      CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES.invalid_source,
      error.message,
    );
  }
  if (receipts.length === 0) return emptyResult();

  return repository.transaction((tx) => {
    const state = allocationState(tx, tenantId);
    const commitmentsByClient = new Map();
    for (const commitment of activeCommitments(tx, tenantId)) {
      const values = commitmentsByClient.get(commitment.client_group_id) ?? [];
      values.push(commitment);
      commitmentsByClient.set(commitment.client_group_id, values);
    }
    for (const values of commitmentsByClient.values()) {
      values.sort(compareFeeCommitmentsForAutomaticAllocation);
    }

    const affected = [];
    let createdCount = 0;
    let updatedCount = 0;
    const transactionResults = [];
    let allocatedAmount = 0;
    let unallocatedAmount = 0;
    const allocatedAt = clock().toISOString();
    for (const receipt of receipts) {
      const transactionId = receipt.transaction.bank_transaction_id;
      const transactionAmount = receipt.net_amount;
      if (!Number.isSafeInteger(transactionAmount) || transactionAmount < 0) {
        throw commandError(
          CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES.invalid_source,
          `Linked-refund-adjusted deposit amount is invalid: ${transactionId}`,
        );
      }
      let remaining = transactionAmount
        - (state.byTransaction.get(transactionId) ?? 0);
      if (!Number.isSafeInteger(remaining) || remaining < 0) {
        throw commandError(
          CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES.invalid_state,
          `Active allocations exceed BankTransaction.amount: ${transactionId}`,
        );
      }
      let transactionAllocated = 0;
      for (
        const commitment of commitmentsByClient.get(receipt.client_group_id) ?? []
      ) {
        if (remaining === 0) break;
        const pairKey = `${transactionId}:${commitment.fee_commitment_id}`;
        const outstanding = commitment.agreed_amount
          - (state.byCommitment.get(commitment.fee_commitment_id) ?? 0);
        if (!Number.isSafeInteger(outstanding) || outstanding < 0) {
          throw commandError(
            CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES.invalid_state,
            `Active allocations exceed FeeCommitment.agreed_amount: ${commitment.fee_commitment_id}`,
          );
        }
        if (outstanding === 0) continue;
        const amount = Math.min(remaining, outstanding);
        const existing = state.byPair.get(pairKey);
        if (
          existing
          && (
            existing.client_group_id !== receipt.client_group_id
            || existing.bank_transaction_classification_id
              !== receipt.classification.bank_transaction_classification_id
          )
        ) {
          throw commandError(
            CLIENT_DEPOSIT_ALLOCATION_ERROR_CODES.invalid_state,
            `ClientDepositAllocation pair does not match its confirmed receipt: ${pairKey}`,
          );
        }
        if (
          existing
          && (
            existing.manual_lock
            || existing.allocation_source === "manual"
            || existing.status !== "active"
          )
        ) continue;
        let allocation;
        if (existing) {
          allocation = normalizeClientDepositAllocation({
            ...existing,
            allocated_amount: addWholeKrw(
              existing.allocated_amount,
              amount,
              "ClientDepositAllocation.allocated_amount",
            ),
            state_version: existing.state_version + 1,
            updated_by: actorId,
            reason: "납부기한 순 자동 배분 다시 계산",
          });
          tx.update({
            tenant_id: tenantId,
            model_type: "ClientDepositAllocation",
            client_deposit_allocation_id:
              allocation.client_deposit_allocation_id,
          }, allocation);
          updatedCount += 1;
        } else {
          allocation = normalizeClientDepositAllocation({
            client_deposit_allocation_id: clientDepositAllocationId({
              tenantId,
              bankTransactionId: transactionId,
              feeCommitmentId: commitment.fee_commitment_id,
            }),
            tenant_id: tenantId,
            client_group_id: receipt.client_group_id,
            bank_transaction_id: transactionId,
            bank_transaction_classification_id:
              receipt.classification.bank_transaction_classification_id,
            fee_commitment_id: commitment.fee_commitment_id,
            currency: "KRW",
            allocated_amount: amount,
            reversed_amount: 0,
            refund_reversed_amount: 0,
            adjustment_reversed_amount: 0,
            allocation_source: "automatic",
            manual_lock: false,
            state_version: 1,
            allocated_at: allocatedAt,
            created_by: actorId,
            updated_by: actorId,
            reason: "납부기한 순 자동 배분",
          });
          tx.create(allocation);
          createdCount += 1;
        }
        affected.push(allocation);
        state.byPair.set(pairKey, allocation);
        state.byTransaction.set(
          transactionId,
          addWholeKrw(
            state.byTransaction.get(transactionId) ?? 0,
            amount,
            "active allocation total by BankTransaction",
          ),
        );
        state.byCommitment.set(
          commitment.fee_commitment_id,
          addWholeKrw(
            state.byCommitment.get(commitment.fee_commitment_id) ?? 0,
            amount,
            "active allocation total by FeeCommitment",
          ),
        );
        remaining -= amount;
        transactionAllocated = addWholeKrw(
          transactionAllocated,
          amount,
          "transaction allocated amount",
        );
      }
      allocatedAmount = addWholeKrw(
        allocatedAmount,
        transactionAllocated,
        "allocated amount",
      );
      unallocatedAmount = addWholeKrw(
        unallocatedAmount,
        remaining,
        "unallocated amount",
      );
      transactionResults.push(Object.freeze({
        bank_transaction_id: transactionId,
        client_group_id: receipt.client_group_id,
        allocated_amount: transactionAllocated,
        unallocated_amount: remaining,
      }));
    }
    if (affected.length === 0) {
      return Object.freeze({
        ...emptyResult(),
        unallocated_amount: unallocatedAmount,
        advance_or_overpayment_amount: unallocatedAmount,
        transactions: Object.freeze(transactionResults),
      });
    }
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "client.deposit.allocation.auto",
        object_type: "ClientDepositAllocation",
        object_id: "client-deposit-allocation-batch",
        idempotency_key: idempotencyKey,
        metadata: {
          created_count: createdCount,
          updated_count: updatedCount,
          allocated_amount: allocatedAmount,
          unallocated_amount: unallocatedAmount,
          allocation_order:
            "due_date_then_accepted_at_then_fee_commitment_id",
          linked_refund_adjusted: true,
          manual_allocations_overwritten: false,
          raw_source_payload_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "allocated",
      created_count: createdCount,
      updated_count: updatedCount,
      allocated_amount: allocatedAmount,
      unallocated_amount: unallocatedAmount,
      advance_or_overpayment_amount: unallocatedAmount,
      transactions: Object.freeze(transactionResults),
      allocations: Object.freeze(affected),
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "client_deposit_allocation_auto",
      request_fingerprint: fingerprint,
      response,
    });
    return response;
  });
}
