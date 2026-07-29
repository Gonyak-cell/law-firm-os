import { appendFinanceAuditEvent } from "./finance-audit.js";

const DIRECTIONS = new Set(["inflow", "outflow"]);
const CLASSIFICATION_SCOPES = new Set(["operating", "petra_bridge", "vehicle_financing", "unreviewed"]);
const AUTO_ATTRIBUTION_FIELDS = Object.freeze([
  "matter_id",
  "client_group_id",
  "billing_client_party_id",
  "invoice_id",
  "payment_id",
  "revenue_account_id",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function sha256(value, field) {
  const normalized = requiredString({ [field]: value }, field);
  if (!/^[a-f0-9]{64}$/u.test(normalized)) throw new TypeError(`${field} must be a SHA-256 digest`);
  return normalized;
}

function nonNegativeInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return parsed;
}

function validInstant(value, field) {
  const normalized = requiredString({ [field]: value }, field);
  if (!Number.isFinite(Date.parse(normalized))) throw new TypeError(`${field} must be a valid instant`);
  return normalized;
}

function normalizeTransaction(transaction, batch) {
  for (const field of AUTO_ATTRIBUTION_FIELDS) {
    if (transaction?.[field] !== undefined && transaction[field] !== null) {
      throw new TypeError(`BankTransaction.${field} requires a separate reviewed classification workflow`);
    }
  }
  const bankTransactionId = requiredString(transaction, "bank_transaction_id");
  const direction = requiredString(transaction, "direction");
  const classificationScope = requiredString(transaction, "classification_scope");
  if (!DIRECTIONS.has(direction)) throw new TypeError("BankTransaction.direction is invalid");
  if (!CLASSIFICATION_SCOPES.has(classificationScope)) throw new TypeError("BankTransaction.classification_scope is invalid");
  if (transaction.currency !== "KRW") throw new TypeError("BankTransaction.currency must be KRW");
  const date = requiredString(transaction, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new TypeError("BankTransaction.date must be YYYY-MM-DD");
  return Object.freeze({
    ...transaction,
    model_type: "BankTransaction",
    bank_transaction_id: bankTransactionId,
    tenant_id: batch.tenant_id,
    bank_import_batch_id: batch.bank_import_batch_id,
    account_ref: requiredString(transaction, "account_ref"),
    transaction_fingerprint: sha256(transaction.transaction_fingerprint, "transaction_fingerprint"),
    occurred_at: validInstant(transaction.occurred_at, "occurred_at"),
    direction,
    amount: nonNegativeInteger(transaction.amount, "amount"),
    balance_after: nonNegativeInteger(transaction.balance_after, "balance_after"),
    currency: "KRW",
    classification_scope: classificationScope,
    classification_state: classificationScope === "unreviewed" ? "unreviewed" : "source_classified",
    zero_amount_source_record: transaction.zero_amount_source_record === true,
    raw_source_payload_included: false,
    automatic_client_attribution_applied: false,
    automatic_revenue_recognition_applied: false,
    status: "posted",
  });
}
function normalizeBatch(batch, transactions) {
  const tenantId = requiredString(batch, "tenant_id");
  const batchId = requiredString(batch, "bank_import_batch_id");
  const expectedCount = nonNegativeInteger(batch.transaction_count ?? transactions.length, "transaction_count");
  if (expectedCount !== transactions.length) throw new TypeError("BankImportBatch.transaction_count does not match transactions");
  return Object.freeze({
    ...batch,
    model_type: "BankImportBatch",
    tenant_id: tenantId,
    bank_import_batch_id: batchId,
    source_manifest_hash: sha256(batch.source_manifest_hash, "source_manifest_hash"),
    account_ref: requiredString(batch, "account_ref"),
    transaction_count: expectedCount,
    overlap_count: nonNegativeInteger(batch.overlap_count ?? 0, "overlap_count"),
    source_count: nonNegativeInteger(batch.source_count ?? 0, "source_count"),
    status: "reconciled",
    raw_source_payload_included: false,
    source_account_number_included: false,
    production_import_approved: batch.production_import_approved === true,
  });
}

export function importBankTransactionBatch({
  repository,
  bank_import_batch,
  transactions,
  actor_id,
  idempotency_key,
} = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  if (!Array.isArray(transactions) || transactions.length === 0 || transactions.length > 5_000) {
    throw new TypeError("transactions must contain 1 to 5000 rows");
  }
  const batch = normalizeBatch(bank_import_batch ?? {}, transactions);
  const normalizedTransactions = transactions.map((transaction) => normalizeTransaction(transaction, batch));
  const fingerprints = new Set(normalizedTransactions.map((transaction) => transaction.transaction_fingerprint));
  if (fingerprints.size !== normalizedTransactions.length) throw new TypeError("BankTransaction fingerprints must be unique within a batch");
  const replay = repository.getIdempotency({ tenant_id: batch.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const batchRecord = tx.create(batch);
    for (const transaction of normalizedTransactions) tx.create(transaction);
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: batchRecord.tenant_id,
        actor_id,
        action: "bank.transaction.batch.import",
        object_type: "BankImportBatch",
        object_id: batchRecord.bank_import_batch_id,
        idempotency_key,
        metadata: {
          transaction_count: normalizedTransactions.length,
          overlap_count: batchRecord.overlap_count,
          source_count: batchRecord.source_count,
          raw_source_payload_included: false,
          counterparty_values_included: false,
          account_number_included: false,
          automatic_revenue_recognition_applied: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "created",
      bank_import_batch: batchRecord,
      transaction_count: normalizedTransactions.length,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: batchRecord.tenant_id,
      idempotency_key,
      operation: "bank_transaction_batch_import",
      response,
    });
    return response;
  });
}
