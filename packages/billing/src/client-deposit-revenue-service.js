const ACTIVE_CLIENT_STATUSES = new Set(["active", "current", "open"]);
const REVENUE_CATEGORIES = new Set(["client_receipt", "refund_reversal"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function boundary(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = requiredString({ [field]: value }, field);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
    const milliseconds = Date.parse(`${normalized}T00:00:00.000Z`);
    if (
      !Number.isFinite(milliseconds)
      || new Date(milliseconds).toISOString().slice(0, 10) !== normalized
    ) {
      throw new TypeError(`${field} must be a valid calendar date`);
    }
    return Object.freeze({ kind: "date", value: normalized, month: normalized.slice(0, 7) });
  }
  if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/u.test(normalized)) {
    throw new TypeError(`${field} must include an explicit UTC offset`);
  }
  const milliseconds = Date.parse(normalized);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${field} must be YYYY-MM-DD or a valid instant`);
  return Object.freeze({ kind: "instant", value: milliseconds, month: normalized.slice(0, 7) });
}

function validatePeriod(from, to) {
  if (!from || !to) return;
  if (from.kind !== to.kind) throw new TypeError("from and to must use the same date format");
  if (from.value > to.value) throw new TypeError("from must not be after to");
}

function inPeriod(transaction, from, to) {
  const value = from?.kind === "instant" || to?.kind === "instant"
    ? Date.parse(transaction.occurred_at)
    : transaction.date;
  if (typeof value !== "string" && !Number.isFinite(value)) {
    throw new TypeError(`BankTransaction.occurred_at is invalid: ${transaction.bank_transaction_id}`);
  }
  return (!from || value >= from.value) && (!to || value <= to.value);
}

function positiveKrw(value, field) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new TypeError(`${field} must be a positive whole KRW amount`);
  }
  return amount;
}

function addKrw(left, right, field) {
  const amount = left + right;
  if (!Number.isSafeInteger(amount)) throw new TypeError(`${field} exceeds the supported KRW range`);
  return amount;
}

function instant(value, field) {
  if (value === null || value === undefined || value === "") return Number.NEGATIVE_INFINITY;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${field} must be a valid instant`);
  return milliseconds;
}

function activeClient(record = {}) {
  return ACTIVE_CLIENT_STATUSES.has(String(record.status ?? "active").trim().toLowerCase());
}

function permittedClients(records, tenantId) {
  if (!Array.isArray(records)) throw new TypeError("permitted_client_records is required");
  const clients = new Map();
  for (const record of records) {
    if (
      record?.model_type !== "ClientGroup"
      || record.tenant_id !== tenantId
      || !activeClient(record)
    ) continue;
    const clientId = requiredString(record, "client_group_id");
    if (clients.has(clientId)) throw new TypeError(`Duplicate permitted client: ${clientId}`);
    clients.set(clientId, Object.freeze({
      client_group_id: clientId,
      display_name: requiredString({
        display_name: record.display_name ?? record.canonical_display_name ?? clientId,
      }, "display_name"),
    }));
  }
  return clients;
}

function compareSourceOrder(left, right) {
  return (
    instant(left.occurred_at, "BankTransaction.occurred_at")
      - instant(right.occurred_at, "BankTransaction.occurred_at")
    || left.bank_transaction_id.localeCompare(right.bank_transaction_id, "en")
  );
}

function compareRanking(left, right) {
  if (left.net_deposit_revenue !== right.net_deposit_revenue) {
    return left.net_deposit_revenue < right.net_deposit_revenue ? 1 : -1;
  }
  return (
    instant(right.latest_deposit_at, "latest_deposit_at")
      - instant(left.latest_deposit_at, "latest_deposit_at")
    || left.display_name.localeCompare(right.display_name, "ko")
    || left.client_group_id.localeCompare(right.client_group_id, "en")
  );
}

function compareDetail(left, right) {
  return (
    instant(right.occurred_at, "BankTransaction.occurred_at")
      - instant(left.occurred_at, "BankTransaction.occurred_at")
    || left.bank_transaction_id.localeCompare(right.bank_transaction_id, "en")
  );
}

function reconcileClassification(classification, transaction) {
  if (!transaction) {
    throw new TypeError(`BankTransaction not found: ${classification.bank_transaction_id}`);
  }
  instant(transaction.occurred_at, "BankTransaction.occurred_at");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(transaction.date)) {
    throw new TypeError(`BankTransaction.date is invalid: ${transaction.bank_transaction_id}`);
  }
  const amount = positiveKrw(transaction.amount, "BankTransaction.amount");
  if (
    positiveKrw(classification.amount, "BankTransactionClassification.amount") !== amount
    || classification.transaction_direction !== transaction.direction
    || classification.transaction_date !== transaction.date
    || classification.currency !== transaction.currency
  ) {
    throw new TypeError(`Bank classification does not reconcile: ${transaction.bank_transaction_id}`);
  }
  if (transaction.currency !== "KRW") throw new TypeError("Client deposit revenue currency must be KRW");
  if (classification.category === "client_receipt" && transaction.direction !== "inflow") {
    throw new TypeError(`Client receipt must be an inflow: ${transaction.bank_transaction_id}`);
  }
  if (classification.category === "refund_reversal" && transaction.direction !== "outflow") {
    throw new TypeError(`Client refund must be an outflow: ${transaction.bank_transaction_id}`);
  }
  return amount;
}

function monthRange(from, to, details) {
  const first = from?.month;
  const last = to?.month;
  if (!first || !last) {
    return [...new Set(details.map((detail) => detail.month))].sort();
  }
  const [firstYear, firstMonth] = first.split("-").map(Number);
  const [lastYear, lastMonth] = last.split("-").map(Number);
  const cursor = new Date(Date.UTC(firstYear, firstMonth - 1, 1));
  const end = new Date(Date.UTC(lastYear, lastMonth - 1, 1));
  const months = [];
  while (cursor <= end) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    if (months.length > 240) throw new TypeError("Client deposit revenue period cannot exceed 240 months");
  }
  return months;
}

export function buildClientDepositRevenue({
  repository,
  tenant_id,
  permitted_client_records,
  from = null,
  to = null,
  currency = "KRW",
} = {}) {
  if (!repository || typeof repository.list !== "function") throw new TypeError("finance repository is required");
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  if (currency !== "KRW") throw new TypeError("Client deposit revenue currency must be KRW");
  const fromBoundary = boundary(from, "from");
  const toBoundary = boundary(to, "to");
  validatePeriod(fromBoundary, toBoundary);
  const clients = permittedClients(permitted_client_records, tenantId);
  const permittedClientIds = new Set(clients.keys());

  const transactions = repository.list({ tenant_id: tenantId, model_type: "BankTransaction" });
  const transactionsById = new Map(transactions.map((row) => [row.bank_transaction_id, row]));
  const classifications = repository
    .list({ tenant_id: tenantId, model_type: "BankTransactionClassification" })
    .filter((row) => (
      row.status === "confirmed"
      && REVENUE_CATEGORIES.has(row.category)
      && permittedClientIds.has(row.client_group_id)
    ));
  const classificationsByTransaction = new Map();
  for (const classification of classifications) {
    if (classificationsByTransaction.has(classification.bank_transaction_id)) {
      throw new TypeError(`Duplicate bank classification: ${classification.bank_transaction_id}`);
    }
    classificationsByTransaction.set(classification.bank_transaction_id, classification);
  }

  for (const classification of classifications) {
    const transaction = transactionsById.get(classification.bank_transaction_id);
    reconcileClassification(classification, transaction);
    if (classification.category !== "refund_reversal") continue;
    const originalId = requiredString(classification, "refund_of_bank_transaction_id");
    const original = classificationsByTransaction.get(originalId);
    const originalTransaction = transactionsById.get(originalId);
    if (
      original?.category !== "client_receipt"
      || original.status !== "confirmed"
      || original.client_group_id !== classification.client_group_id
      || originalTransaction?.direction !== "inflow"
    ) {
      throw new TypeError(`Client refund origin does not reconcile: ${classification.bank_transaction_id}`);
    }
  }

  const canonicalTransactionIds = new Set();
  const seenFingerprints = new Set();
  for (const transaction of transactions
    .filter((row) => classificationsByTransaction.has(row.bank_transaction_id))
    .sort(compareSourceOrder)) {
    const fingerprint = requiredString(transaction, "transaction_fingerprint");
    if (seenFingerprints.has(fingerprint)) continue;
    seenFingerprints.add(fingerprint);
    canonicalTransactionIds.add(transaction.bank_transaction_id);
  }
  const refundAmountsByOriginal = new Map();
  for (const classification of classifications.filter((row) => row.category === "refund_reversal")) {
    if (!canonicalTransactionIds.has(classification.bank_transaction_id)) continue;
    const originalId = classification.refund_of_bank_transaction_id;
    if (!canonicalTransactionIds.has(originalId)) {
      throw new TypeError(`Client refund origin is a duplicate transaction: ${classification.bank_transaction_id}`);
    }
    refundAmountsByOriginal.set(
      originalId,
      addKrw(
        refundAmountsByOriginal.get(originalId) ?? 0,
        Number(classification.amount),
        "linked refund total",
      ),
    );
  }
  for (const [originalId, refundAmount] of refundAmountsByOriginal) {
    if (refundAmount > Number(transactionsById.get(originalId).amount)) {
      throw new TypeError(`Linked refunds exceed the original client deposit: ${originalId}`);
    }
  }

  const summaries = new Map();
  const details = [];
  for (const classification of classifications) {
    const transaction = transactionsById.get(classification.bank_transaction_id);
    if (!canonicalTransactionIds.has(transaction.bank_transaction_id)) continue;
    if (!inPeriod(transaction, fromBoundary, toBoundary)) continue;
    const client = clients.get(classification.client_group_id);
    const summary = summaries.get(classification.client_group_id) ?? {
      client_group_id: classification.client_group_id,
      display_name: client.display_name,
      matched_inflow_amount: 0,
      linked_refund_amount: 0,
      net_deposit_revenue: 0,
      latest_deposit_at: null,
      transaction_count: 0,
    };
    const amount = Number(transaction.amount);
    const isReceipt = classification.category === "client_receipt";
    if (isReceipt) {
      summary.matched_inflow_amount = addKrw(
        summary.matched_inflow_amount,
        amount,
        "client matched inflow total",
      );
      if (
        !summary.latest_deposit_at
        || instant(transaction.occurred_at, "BankTransaction.occurred_at")
          > instant(summary.latest_deposit_at, "latest_deposit_at")
      ) {
        summary.latest_deposit_at = transaction.occurred_at;
      }
    } else {
      summary.linked_refund_amount = addKrw(
        summary.linked_refund_amount,
        amount,
        "client linked refund total",
      );
    }
    summary.net_deposit_revenue = addKrw(
      summary.net_deposit_revenue,
      isReceipt ? amount : -amount,
      "client net deposit revenue",
    );
    summary.transaction_count += 1;
    summaries.set(classification.client_group_id, summary);
    details.push(Object.freeze({
      bank_transaction_id: transaction.bank_transaction_id,
      client_group_id: classification.client_group_id,
      entry_type: isReceipt ? "client_deposit" : "linked_refund",
      transaction_date: transaction.date,
      occurred_at: transaction.occurred_at,
      month: transaction.date.slice(0, 7),
      amount,
      net_deposit_revenue_delta: isReceipt ? amount : -amount,
      refund_of_bank_transaction_id: classification.refund_of_bank_transaction_id ?? null,
    }));
  }

  const ranking = [...summaries.values()]
    .filter((row) => row.net_deposit_revenue !== 0)
    .sort(compareRanking)
    .map((row, index) => Object.freeze({ rank: index + 1, ...row }));
  const sortedDetails = Object.freeze([...details].sort(compareDetail));
  const totalMatched = [...summaries.values()].reduce(
    (total, row) => addKrw(total, row.matched_inflow_amount, "matched inflow total"),
    0,
  );
  const totalRefund = [...summaries.values()].reduce(
    (total, row) => addKrw(total, row.linked_refund_amount, "linked refund total"),
    0,
  );
  const totalNet = addKrw(totalMatched, -totalRefund, "net deposit revenue total");
  const detailTotal = details.reduce(
    (total, row) => addKrw(total, row.net_deposit_revenue_delta, "deposit revenue detail total"),
    0,
  );
  const rankingTotal = ranking.reduce(
    (total, row) => addKrw(total, row.net_deposit_revenue, "deposit revenue ranking total"),
    0,
  );
  const monthlyTotals = new Map(monthRange(fromBoundary, toBoundary, details).map((month) => [month, 0]));
  for (const detail of details) {
    monthlyTotals.set(
      detail.month,
      addKrw(
        monthlyTotals.get(detail.month) ?? 0,
        detail.net_deposit_revenue_delta,
        "monthly net deposit revenue",
      ),
    );
  }
  const monthly = Object.freeze([...monthlyTotals].map(([month, net_deposit_revenue]) => Object.freeze({
    month,
    net_deposit_revenue,
  })));
  const monthlyTotal = monthly.reduce(
    (total, row) => addKrw(total, row.net_deposit_revenue, "monthly net deposit revenue total"),
    0,
  );
  if (totalNet !== detailTotal || totalNet !== rankingTotal || totalNet !== monthlyTotal) {
    throw new TypeError("Client deposit revenue totals do not reconcile");
  }

  return Object.freeze({
    basis: "bank_deposit",
    basis_label: "은행 입금 기준",
    currency: "KRW",
    period: Object.freeze({ from, to }),
    totals: Object.freeze({
      matched_inflow_amount: totalMatched,
      linked_refund_amount: totalRefund,
      net_deposit_revenue: totalNet,
      recognized_transaction_count: details.length,
    }),
    ranking: Object.freeze(ranking),
    monthly,
    details: sortedDetails,
    reconciliation: Object.freeze({
      status: "passed",
      ranking_total: rankingTotal,
      detail_total: detailTotal,
      monthly_total: monthlyTotal,
    }),
    permission_prefilter_applied: true,
    unauthorized_count_included: false,
    raw_bank_source_included: false,
    counterparty_values_included: false,
    invoice_required: false,
    matter_required: false,
    production_ready_claim: false,
  });
}
