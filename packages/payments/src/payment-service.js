import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";
import { listActivePaymentAllocations } from "./payment-allocation-service.js";

const EXCLUDED_PAYMENT_MATCH_STATUSES = new Set([
  "cancelled",
  "canceled",
  "void",
  "rejected",
  "deleted",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function importPayment({ repository, payment, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(payment, "tenant_id");
  requiredString(payment, "bank_reference");
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("payment amount must be positive");
  const replay = repository.getIdempotency({ tenant_id: payment.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...payment,
      model_type: "Payment",
      amount,
      status: payment.status ?? "imported",
      allocation_status: payment.allocation_status ?? "unallocated",
      allocated_amount: payment.allocated_amount ?? 0,
      unallocated_amount: payment.unallocated_amount ?? amount,
      applied_amount: payment.applied_amount ?? 0,
      unapplied_amount: payment.unapplied_amount ?? amount,
      imported_at: payment.imported_at ?? new Date().toISOString(),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "payment.import",
        object_type: "Payment",
        object_id: record.payment_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", payment: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "payment_import", response });
    return response;
  });
}

export function confirmBankReceipt({
  repository,
  bank_transaction_id,
  payment = {},
  actor_id,
  idempotency_key,
  allow_rebind = false,
} = {}) {
  const tenantId = requiredString(payment, "tenant_id");
  const bankTransactionId = requiredString({ bank_transaction_id }, "bank_transaction_id");
  const transaction = repository.get({
    tenant_id: tenantId,
    model_type: "BankTransaction",
    bank_transaction_id: bankTransactionId,
  });
  if (!transaction || transaction.direction !== "inflow") throw new Error("confirmed bank receipt requires an inflow BankTransaction");
  const existing = repository.list({ tenant_id: tenantId, model_type: "Payment" })
    .find((row) => row.bank_transaction_id === bankTransactionId);
  if (existing) {
    const replay = repository.getIdempotency({ tenant_id: tenantId, idempotency_key });
    if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
    if (allow_rebind) {
      return repository.transaction((tx) => {
        const replayInside = tx.getIdempotency({
          tenant_id: tenantId,
          idempotency_key,
        });
        if (replayInside) return Object.freeze({ ...replayInside.response, idempotent_replay: true });
        const currentTransaction = tx.get({
          tenant_id: tenantId,
          model_type: "BankTransaction",
          bank_transaction_id: bankTransactionId,
        });
        const current = tx.get({
          tenant_id: tenantId,
          model_type: "Payment",
          payment_id: existing.payment_id,
        });
        if (
          !currentTransaction
          || currentTransaction.direction !== "inflow"
          || !current
          || current.bank_transaction_id !== bankTransactionId
        ) {
          throw new Error("BankTransaction Payment binding changed during relink");
        }
        const amount = Number(currentTransaction.amount);
        const currency = currentTransaction.currency ?? "KRW";
        if (
          Number(current.amount) !== amount
          || current.currency !== currency
        ) {
          throw new Error("Existing bank Payment does not reconcile with its BankTransaction");
        }
        const nextClientGroupId = payment.client_group_id
          ?? current.client_group_id
          ?? null;
        const nextMatterId = Object.hasOwn(payment, "matter_id")
          ? payment.matter_id
          : current.matter_id ?? null;
        const bindingChanged = nextClientGroupId !== (current.client_group_id ?? null)
          || nextMatterId !== (current.matter_id ?? null);
        const clientBindingChanged = nextClientGroupId
          !== (current.client_group_id ?? null);
        if (clientBindingChanged) {
          const clientDepositAllocations = tx.list({
            tenant_id: tenantId,
            model_type: "ClientDepositAllocation",
            bank_transaction_id: bankTransactionId,
          });
          if (clientDepositAllocations.length > 0) {
            throw Object.assign(
              new Error("Bank receipt cannot change client while deposit allocations exist"),
              {
                safe_error_code: "FINANCE_DEPOSIT_ALLOCATION_STATE_INVALID",
                status: 409,
              },
            );
          }
        }
        if (bindingChanged) {
          const activePaymentAllocations = listActivePaymentAllocations({
            repository: tx,
            tenant_id: tenantId,
            payment_id: current.payment_id,
          });
          const representedPaymentMatches = new Set(
            tx
              .list({
                tenant_id: tenantId,
                model_type: "PaymentAllocation",
                payment_id: current.payment_id,
              })
              .map((row) => row.source_payment_match_id)
              .filter((paymentMatchId) => typeof paymentMatchId === "string" && paymentMatchId.trim() !== ""),
          );
          const activePaymentMatches = tx
            .list({
              tenant_id: tenantId,
              model_type: "PaymentMatch",
              payment_id: current.payment_id,
            })
            .filter((row) => !EXCLUDED_PAYMENT_MATCH_STATUSES.has(
              String(row.status ?? "").toLowerCase(),
            ))
            .filter((row) => !representedPaymentMatches.has(row.payment_match_id));
          if (activePaymentAllocations.length > 0 || activePaymentMatches.length > 0) {
            throw Object.assign(
              new Error("Bank receipt cannot be rebound while active payment allocations exist"),
              {
                safe_error_code: "FINANCE_DEPOSIT_ALLOCATION_STATE_INVALID",
                status: 409,
              },
            );
          }
        }
        const updated = tx.update({
          tenant_id: tenantId,
          model_type: "Payment",
          payment_id: current.payment_id,
        }, {
          client_group_id: nextClientGroupId,
          matter_id: nextMatterId,
        });
        const auditEvent = appendFinanceAuditEvent({
          repository: tx,
          event: {
            tenant_id: tenantId,
            actor_id,
            action: "payment.rebind",
            object_type: "Payment",
            object_id: updated.payment_id,
            idempotency_key,
            metadata: {
              bank_transaction_id: bankTransactionId,
              previous_client_group_id: current.client_group_id ?? null,
              client_group_id: updated.client_group_id ?? null,
              previous_matter_id: current.matter_id ?? null,
              matter_id: updated.matter_id ?? null,
              raw_source_payload_included: false,
            },
          },
        });
        const response = Object.freeze({
          outcome: "relinked",
          payment: updated,
          audit_event: auditEvent,
          idempotent_replay: false,
        });
        tx.recordIdempotency({
          tenant_id: tenantId,
          idempotency_key,
          operation: "payment_rebind",
          response,
        });
        return response;
      });
    }
    throw new Error("BankTransaction already has a Payment");
  }
  const classification = repository.list({
    tenant_id: tenantId,
    model_type: "BankTransactionClassification",
    bank_transaction_id: bankTransactionId,
  }).find((row) => row.category === "client_receipt" && row.status === "confirmed");
  const receivedAt = payment.received_at ?? transaction.occurred_at ?? transaction.date;
  const date = String(receivedAt).slice(0, 10);
  const amount = Number(transaction.amount);
  const currency = transaction.currency ?? "KRW";
  const duplicateCandidates = repository.list({ tenant_id: tenantId, model_type: "Payment" })
    .filter((row) => !row.bank_transaction_id)
    .filter((row) => Number(row.amount) === amount && row.currency === currency)
    .filter((row) => String(row.received_at ?? row.payment_date ?? row.imported_at ?? "").slice(0, 10) === date)
    .map((row) => row.payment_id);
  return importPayment({
    repository,
    payment: {
      ...payment,
      tenant_id: tenantId,
      bank_transaction_id: bankTransactionId,
      bank_reference: payment.bank_reference ?? `bank-transaction:${bankTransactionId}`,
      client_group_id: payment.client_group_id ?? classification?.client_group_id ?? null,
      amount,
      currency,
      received_at: receivedAt,
      status: duplicateCandidates.length > 0 ? "duplicate_review" : payment.status,
      duplicate_review_required: duplicateCandidates.length > 0,
      duplicate_candidate_payment_ids: duplicateCandidates,
      revenue_effect: "none_until_allocated",
    },
    actor_id,
    idempotency_key,
  });
}
