const CLIENT_DEPOSIT_SOURCE_CATEGORIES = new Set([
  "client_receipt",
  "refund_reversal",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function positiveWholeKrw(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive whole KRW amount`);
  }
  return value;
}

function addWholeKrw(left, right, field) {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new TypeError(`${field} exceeds the supported KRW range`);
  }
  return total;
}

function instant(value, field) {
  const milliseconds = Date.parse(requiredString({ [field]: value }, field));
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(`${field} must be a valid instant`);
  }
  return milliseconds;
}

function compareTransactions(left, right) {
  return (
    instant(left.occurred_at, "BankTransaction.occurred_at")
      - instant(right.occurred_at, "BankTransaction.occurred_at")
    || left.bank_transaction_id.localeCompare(
      right.bank_transaction_id,
      "en",
    )
  );
}

function permittedClientIds(input) {
  if (input === null || input === undefined) return null;
  const values = input instanceof Set ? [...input] : input;
  if (!Array.isArray(values)) {
    throw new TypeError("permitted_client_ids must be an array or Set");
  }
  return new Set(values.map((clientGroupId) => requiredString({
    client_group_id: clientGroupId,
  }, "client_group_id")));
}

function reconcileClassification(classification, transaction) {
  if (!transaction) {
    throw new TypeError(
      `BankTransaction not found: ${classification.bank_transaction_id}`,
    );
  }
  const expectedDirection = classification.category === "client_receipt"
    ? "inflow"
    : "outflow";
  const transactionAmount = positiveWholeKrw(
    transaction.amount,
    "BankTransaction.amount",
  );
  if (
    transaction.status !== "posted"
    || transaction.direction !== expectedDirection
    || transaction.currency !== "KRW"
    || classification.transaction_direction !== expectedDirection
    || classification.currency !== "KRW"
    || positiveWholeKrw(
      classification.amount,
      "BankTransactionClassification.amount",
    ) !== transactionAmount
  ) {
    throw new TypeError(
      `Confirmed client deposit source does not reconcile: ${transaction.bank_transaction_id}`,
    );
  }
  instant(transaction.occurred_at, "BankTransaction.occurred_at");
  requiredString(transaction, "transaction_fingerprint");
  return Object.freeze({
    transaction_amount: transactionAmount,
    client_group_id: requiredString(classification, "client_group_id"),
  });
}

export function buildConfirmedClientDepositSources({
  repository,
  tenant_id,
  permitted_client_ids = null,
} = {}) {
  if (!repository || typeof repository.list !== "function") {
    throw new TypeError("Finance repository is required");
  }
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const permitted = permittedClientIds(permitted_client_ids);
  const transactions = repository.list({
    tenant_id: tenantId,
    model_type: "BankTransaction",
  });
  const transactionsById = new Map();
  for (const transaction of transactions) {
    const transactionId = requiredString(transaction, "bank_transaction_id");
    if (transactionsById.has(transactionId)) {
      throw new TypeError(`Duplicate BankTransaction: ${transactionId}`);
    }
    transactionsById.set(transactionId, transaction);
  }

  const classifications = repository
    .list({
      tenant_id: tenantId,
      model_type: "BankTransactionClassification",
    })
    .filter((classification) => (
      classification.status === "confirmed"
      && CLIENT_DEPOSIT_SOURCE_CATEGORIES.has(classification.category)
      && (
        permitted === null
        || permitted.has(classification.client_group_id)
      )
    ));
  const classificationsByTransaction = new Map();
  const reconciled = new Map();
  for (const classification of classifications) {
    const transactionId = requiredString(
      classification,
      "bank_transaction_id",
    );
    if (classificationsByTransaction.has(transactionId)) {
      throw new TypeError(
        `Duplicate confirmed client deposit classification: ${transactionId}`,
      );
    }
    const transaction = transactionsById.get(transactionId);
    classificationsByTransaction.set(transactionId, classification);
    reconciled.set(
      transactionId,
      reconcileClassification(classification, transaction),
    );
  }

  const canonicalTransactionIds = new Set();
  const seenFingerprints = new Set();
  for (const transaction of transactions
    .filter((record) => (
      classificationsByTransaction.has(record.bank_transaction_id)
    ))
    .sort(compareTransactions)) {
    const fingerprint = requiredString(
      transaction,
      "transaction_fingerprint",
    );
    if (seenFingerprints.has(fingerprint)) continue;
    seenFingerprints.add(fingerprint);
    canonicalTransactionIds.add(transaction.bank_transaction_id);
  }

  const refunds = [];
  const linkedRefundByOriginal = new Map();
  for (const classification of classifications) {
    if (
      classification.category !== "refund_reversal"
      || !canonicalTransactionIds.has(classification.bank_transaction_id)
    ) continue;
    const originalId = requiredString(
      classification,
      "refund_of_bank_transaction_id",
    );
    const originalClassification =
      classificationsByTransaction.get(originalId);
    const originalTransaction = transactionsById.get(originalId);
    const source = reconciled.get(classification.bank_transaction_id);
    if (
      !canonicalTransactionIds.has(originalId)
      || originalClassification?.category !== "client_receipt"
      || originalClassification.status !== "confirmed"
      || originalClassification.client_group_id !== source.client_group_id
      || originalTransaction?.direction !== "inflow"
      || originalTransaction.currency !== "KRW"
    ) {
      throw new TypeError(
        `Client refund origin does not reconcile: ${classification.bank_transaction_id}`,
      );
    }
    linkedRefundByOriginal.set(
      originalId,
      addWholeKrw(
        linkedRefundByOriginal.get(originalId) ?? 0,
        source.transaction_amount,
        "linked client refund total",
      ),
    );
    refunds.push(Object.freeze({
      classification,
      transaction: transactionsById.get(classification.bank_transaction_id),
      client_group_id: source.client_group_id,
      refund_of_bank_transaction_id: originalId,
      amount: source.transaction_amount,
    }));
  }

  const receipts = [];
  for (const classification of classifications) {
    if (
      classification.category !== "client_receipt"
      || !canonicalTransactionIds.has(classification.bank_transaction_id)
    ) continue;
    const transactionId = classification.bank_transaction_id;
    const source = reconciled.get(transactionId);
    const linkedRefundAmount = linkedRefundByOriginal.get(transactionId) ?? 0;
    if (linkedRefundAmount > source.transaction_amount) {
      throw new TypeError(
        `Linked refunds exceed the original client deposit: ${transactionId}`,
      );
    }
    receipts.push(Object.freeze({
      classification,
      transaction: transactionsById.get(transactionId),
      client_group_id: source.client_group_id,
      gross_amount: source.transaction_amount,
      linked_refund_amount: linkedRefundAmount,
      net_amount: source.transaction_amount - linkedRefundAmount,
    }));
  }

  return Object.freeze({
    receipts: Object.freeze(receipts),
    refunds: Object.freeze(refunds),
    canonical_transaction_count: canonicalTransactionIds.size,
    duplicate_transaction_count:
      classificationsByTransaction.size - canonicalTransactionIds.size,
    permission_prefilter_applied: permitted !== null,
  });
}
