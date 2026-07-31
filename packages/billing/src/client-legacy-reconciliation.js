import { createHash } from "node:crypto";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  BANK_CLASSIFICATION_CATEGORIES,
  previewBankTransactionClassifications,
} from "./bank-classification-service.js";
import { buildClientDepositRevenue } from "./client-deposit-revenue-service.js";
import { buildClientReceivables } from "./client-receivables-service.js";

const SOURCE_MODELS = [
  "BankTransaction",
  "BankTransactionClassification",
  "BankClassificationRule",
  "FeeCommitment",
  "ClientDepositAllocation",
];
const REVENUE_CATEGORIES = new Set(["client_receipt", "refund_reversal"]);
const EXACT_MATCHES = new Set(["client_exact", "client_saved_alias"]);
const REVIEW_MATCHES = new Set([
  "client_unique_prefix",
  "client_partial_name",
  "client_name_ambiguous",
]);
const ACTIVE_CLIENT_STATUSES = new Set(["active", "current", "open"]);
const RULE_MATCH_FIELDS = new Set(["counterparty", "memo"]);

function required(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.normalize("NFKC").trim();
}

function optionalId(value) {
  return typeof value === "string" && value.trim() !== ""
    ? value.normalize("NFKC").trim()
    : null;
}

function invalidSource(modelType, message = `Invalid ${modelType} source`) {
  return Object.assign(new TypeError(message), {
    safe_error_code: "FINANCE_RECONCILIATION_SOURCE_INVALID",
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function recordId(record = {}) {
  return String(
    record.bank_transaction_id
      ?? record.bank_classification_rule_id
      ?? record.fee_commitment_id
      ?? record.client_deposit_allocation_id
      ?? record.client_group_id
      ?? record.legacy_fee_id
      ?? record.opportunity_id
      ?? record.resource_id
      ?? "",
  );
}

function stable(records = []) {
  return [...records].sort((left, right) => (
    String(left.model_type ?? "").localeCompare(
      String(right.model_type ?? ""),
      "en",
    )
    || recordId(left).localeCompare(recordId(right), "en")
    || hashDomainValue(left).localeCompare(hashDomainValue(right), "en")
  ));
}

function sourceState({
  tenantId,
  clients,
  legacyClassifications,
  legacyFees,
  financeRecords,
  from,
  to,
  asOf,
}) {
  return {
    tenant_id: tenantId,
    from,
    to,
    as_of: asOf,
    clients: stable(clients),
    legacy_classifications: stable(legacyClassifications),
    legacy_fee_amounts: stable(legacyFees),
    finance_records: stable(financeRecords),
  };
}

function readAuthoritativeFinanceRecords(repository, tenantId) {
  return stable(SOURCE_MODELS.flatMap((modelType) => {
    const records = repository.list({
      tenant_id: tenantId,
      model_type: modelType,
    });
    if (!Array.isArray(records)) {
      throw new TypeError("Finance repository list must return an array");
    }
    return records.filter((row) => (
      row?.tenant_id === tenantId
      && row.model_type === modelType
    ));
  }));
}

function clientsInScope(records, tenantId) {
  const byId = new Map();
  for (const row of stable(records ?? [])) {
    if (
      row?.model_type !== "ClientGroup"
      || row.tenant_id !== tenantId
      || !ACTIVE_CLIENT_STATUSES.has(
        String(row.status ?? "active").toLowerCase(),
      )
    ) continue;
    const clientGroupId = required(row, "client_group_id");
    if (byId.has(clientGroupId)) {
      throw new TypeError("Duplicate permitted client identity");
    }
    byId.set(clientGroupId, Object.freeze({
      ...row,
      client_group_id: clientGroupId,
    }));
  }
  return {
    clients: stable([...byId.values()]),
    byId,
    ids: new Set(byId.keys()),
  };
}

function canonicalClientId(value, clientById) {
  const id = optionalId(value);
  return id && clientById.has(id) ? id : null;
}

function canonicalFinanceRecord(row, clientById) {
  const sourceClientId = optionalId(row.client_group_id);
  if (sourceClientId && !clientById.has(sourceClientId)) return null;
  const clientGroupId = sourceClientId;
  const canonical = { ...row };
  if (clientGroupId) canonical.client_group_id = clientGroupId;
  const requiredIds = {
    BankTransaction: ["bank_transaction_id"],
    BankTransactionClassification: [
      "bank_transaction_classification_id",
      "bank_transaction_id",
    ],
    BankClassificationRule: ["bank_classification_rule_id"],
    FeeCommitment: [
      "fee_commitment_id",
      "opportunity_id",
    ],
    ClientDepositAllocation: [
      "client_deposit_allocation_id",
      "bank_transaction_id",
      "bank_transaction_classification_id",
      "fee_commitment_id",
    ],
  }[row.model_type] ?? [];
  for (const field of requiredIds) {
    const value = optionalId(row[field]);
    if (!value) throw invalidSource(row.model_type);
    canonical[field] = value;
  }
  for (const field of ["refund_of_bank_transaction_id", "rule_id"]) {
    const value = optionalId(row[field]);
    if (value) canonical[field] = value;
  }
  if (
    ["BankTransactionClassification", "BankClassificationRule"]
      .includes(row.model_type)
  ) {
    const category = optionalId(row.category);
    if (
      !category
      || !Object.hasOwn(BANK_CLASSIFICATION_CATEGORIES, category)
    ) throw invalidSource(row.model_type);
    canonical.category = category;
  }
  if (
    ["FeeCommitment", "ClientDepositAllocation"].includes(row.model_type)
    && !clientGroupId
  ) throw invalidSource(row.model_type);
  if (
    row.model_type === "BankTransactionClassification"
    && REVENUE_CATEGORIES.has(row.category)
    && !clientGroupId
  ) throw invalidSource(row.model_type);
  if (
    row.model_type === "BankTransactionClassification"
    && row.category === "refund_reversal"
    && !canonical.refund_of_bank_transaction_id
  ) throw invalidSource(row.model_type);
  if (row.model_type === "BankClassificationRule") {
    const matchField = optionalId(row.match_field);
    const normalizedMatchValue = optionalId(row.normalized_match_value);
    if (
      !RULE_MATCH_FIELDS.has(matchField)
      || !normalizedMatchValue
      || row.category === "refund_reversal"
      || !["active", "inactive"].includes(row.status)
      || (row.category === "client_receipt" && !clientGroupId)
    ) throw invalidSource(row.model_type);
    canonical.match_field = matchField;
    canonical.normalized_match_value = normalizedMatchValue;
  }
  return Object.freeze(canonical);
}

function sourceIdentity(record) {
  return {
    BankTransaction: record.bank_transaction_id,
    BankTransactionClassification:
      record.bank_transaction_classification_id,
    BankClassificationRule: record.bank_classification_rule_id,
    FeeCommitment: record.fee_commitment_id,
    ClientDepositAllocation: record.client_deposit_allocation_id,
  }[record.model_type];
}

function assertUniqueSourceIdentities(records) {
  const seenByModel = new Map();
  for (const row of records) {
    const seen = seenByModel.get(row.model_type) ?? new Set();
    const id = sourceIdentity(row);
    if (seen.has(id)) {
      throw new TypeError(`Duplicate ${row.model_type} identity`);
    }
    seen.add(id);
    seenByModel.set(row.model_type, seen);
  }
}

function financeRecordsInScope(records, clientById) {
  const canonical = [];
  for (const row of records) {
    const scoped = canonicalFinanceRecord(row, clientById);
    if (scoped) canonical.push(scoped);
  }
  assertUniqueSourceIdentities(canonical);
  return stable(canonical);
}

function legacyRecordsInScope({
  classifications,
  fees,
  tenantId,
  clientById,
}) {
  const scopedClassifications = [];
  const classificationIds = new Set();
  for (const row of stable(classifications ?? [])) {
    if (row?.tenant_id !== tenantId) continue;
    const clientGroupId = canonicalClientId(row.client_group_id, clientById);
    if (!clientGroupId) continue;
    const transactionId = optionalId(row.bank_transaction_id);
    const legacyClassificationId = optionalId(row.legacy_classification_id);
    if (!legacyClassificationId) {
      throw invalidSource(
        "legacy classification",
        "legacy classification identity is required",
      );
    }
    if (!transactionId) throw invalidSource("legacy classification");
    if (classificationIds.has(legacyClassificationId)) {
      throw new TypeError("Duplicate legacy classification identity");
    }
    classificationIds.add(legacyClassificationId);
    scopedClassifications.push(Object.freeze({
      ...row,
      bank_transaction_id: transactionId,
      client_group_id: clientGroupId,
      ...(optionalId(row.bank_transaction_classification_id)
        ? {
            bank_transaction_classification_id:
              optionalId(row.bank_transaction_classification_id),
          }
        : {}),
      legacy_classification_id: legacyClassificationId,
      ...(optionalId(row.refund_of_bank_transaction_id)
        ? {
            refund_of_bank_transaction_id:
              optionalId(row.refund_of_bank_transaction_id),
          }
        : {}),
    }));
  }
  const scopedFees = [];
  const legacyFeeIds = new Set();
  for (const row of stable(fees ?? [])) {
    if (row?.tenant_id !== tenantId) continue;
    const clientGroupId = canonicalClientId(row.client_group_id, clientById);
    if (!clientGroupId) continue;
    const legacyFeeId = optionalId(row.legacy_fee_id);
    const opportunityId = optionalId(row.opportunity_id);
    if (!legacyFeeId) throw invalidSource("legacy fee");
    if (!opportunityId) throw invalidSource("legacy fee");
    if (legacyFeeIds.has(legacyFeeId)) {
      throw new TypeError("Duplicate legacy fee identity");
    }
    legacyFeeIds.add(legacyFeeId);
    scopedFees.push(Object.freeze({
      ...row,
      client_group_id: clientGroupId,
      opportunity_id: opportunityId,
      legacy_fee_id: legacyFeeId,
    }));
  }
  return {
    classifications: stable(scopedClassifications),
    fees: stable(scopedFees),
  };
}

function deniedOnlyClientTransactionIds({
  financeRecords,
  legacyClassifications,
  tenantId,
  permittedClientIds,
}) {
  const permitted = new Set();
  const denied = new Set();
  const rows = [
    ...financeRecords.filter((row) => (
      row.model_type === "BankTransactionClassification"
    )),
    ...(legacyClassifications ?? []).filter((row) => (
      row?.tenant_id === tenantId
    )),
  ];
  for (const row of rows) {
    const transactionId = optionalId(row.bank_transaction_id);
    const clientGroupId = optionalId(row.client_group_id);
    if (!transactionId || !clientGroupId) continue;
    (permittedClientIds.has(clientGroupId) ? permitted : denied)
      .add(transactionId);
  }
  return new Set([...denied].filter((id) => !permitted.has(id)));
}

function readOnlyRepository(records) {
  const rows = stable(records);
  return Object.freeze({
    list(query = {}) {
      return Object.freeze(rows
        .filter((row) => !query.tenant_id || row.tenant_id === query.tenant_id)
        .filter((row) => !query.model_type || row.model_type === query.model_type));
    },
  });
}

function compareTransactions(left, right) {
  const leftAt = Date.parse(required(left, "occurred_at"));
  const rightAt = Date.parse(required(right, "occurred_at"));
  if (!Number.isFinite(leftAt) || !Number.isFinite(rightAt)) {
    throw new TypeError("BankTransaction.occurred_at is invalid");
  }
  return leftAt - rightAt
    || left.bank_transaction_id.localeCompare(right.bank_transaction_id, "en");
}

function transactionDirectory(records, tenantId) {
  const transactions = records
    .filter((row) => row.model_type === "BankTransaction" && row.tenant_id === tenantId)
    .sort(compareTransactions);
  const byId = new Map();
  for (const transaction of transactions) {
    const id = required(transaction, "bank_transaction_id");
    required(transaction, "transaction_fingerprint");
    if (byId.has(id)) {
      throw new TypeError("Duplicate BankTransaction identity");
    }
    byId.set(id, transaction);
  }
  return { transactions, byId };
}

function legacyKind(record) {
  if (!record) return "";
  if (
    record.classification_source === "manual_review"
    || String(record.rationale_code ?? "").startsWith("manual_")
  ) return "manual_review";
  return String(record.match_kind ?? record.rationale_code ?? "").trim();
}

function legacyStatus(record) {
  const kind = legacyKind(record);
  if (!record) return "not_present";
  if (
    String(record.status ?? "confirmed") !== "confirmed"
    || REVIEW_MATCHES.has(kind)
  ) return "review_required";
  if (EXACT_MATCHES.has(kind)) return "accepted";
  return kind === "manual_review" && record.manual_lock === true
    ? "accepted"
    : "review_required";
}

function indexLegacy(records, transactionsById) {
  const byTransaction = new Map();
  const classificationIds = new Set();
  for (const record of stable(records)) {
    const id = required(record, "bank_transaction_id");
    if (!transactionsById.has(id)) continue;
    const classificationId = required(record, "legacy_classification_id");
    if (classificationIds.has(classificationId)) {
      throw new TypeError("Duplicate legacy classification identity");
    }
    classificationIds.add(classificationId);
    if (byTransaction.has(id)) {
      throw new TypeError("Duplicate legacy transaction classification");
    }
    byTransaction.set(id, record);
  }
  return byTransaction;
}

function legacyClassification(record, transaction) {
  if (legacyStatus(record) !== "accepted") return null;
  const kind = legacyKind(record);
  const category = record.category ?? (
    transaction.direction === "outflow" ? "refund_reversal" : "client_receipt"
  );
  if (
    !REVENUE_CATEGORIES.has(category)
    || (category === "client_receipt" && transaction.direction !== "inflow")
    || (
      category === "refund_reversal"
      && (transaction.direction !== "outflow" || record.manual_lock !== true)
    )
  ) return null;
  return Object.freeze({
    model_type: "BankTransactionClassification",
    bank_transaction_classification_id:
      record.bank_transaction_classification_id
      ?? record.legacy_classification_id,
    tenant_id: transaction.tenant_id,
    bank_transaction_id: transaction.bank_transaction_id,
    account_ref: transaction.account_ref,
    transaction_date: transaction.date,
    transaction_month: transaction.date.slice(0, 7),
    transaction_direction: transaction.direction,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    primary_type: category === "client_receipt" ? "sales" : "non_operating",
    category,
    client_group_id: required(record, "client_group_id"),
    status: "confirmed",
    confidence: kind === "manual_review" ? "reviewed" : "high",
    classification_source: kind === "manual_review" ? "manual_review" : "legacy_exact",
    rationale_code: kind,
    manual_lock: record.manual_lock === true,
    refund_of_bank_transaction_id: category === "refund_reversal"
      ? required(record, "refund_of_bank_transaction_id")
      : null,
    raw_source_payload_included: false,
  });
}

function currentClassifications({
  transactions,
  clients,
  rules,
  persisted,
  legacyByTransaction,
}) {
  const manual = new Map();
  for (const row of persisted) {
    if (
      row.status === "confirmed"
      && row.classification_source === "manual_review"
      && row.manual_lock === true
    ) {
      const id = required(row, "bank_transaction_id");
      if (manual.has(id)) {
        throw new TypeError("Duplicate locked manual classification");
      }
      manual.set(id, row);
    }
  }
  const proposals = new Map();
  const accepted = [];
  const preview = previewBankTransactionClassifications({
    transactions,
    client_records: clients,
    rules,
  });
  for (const proposed of preview.classifications) {
    const id = proposed.bank_transaction_id;
    const locked = manual.get(id) ?? null;
    const classification = locked ?? proposed;
    const policyBlocked = REVIEW_MATCHES.has(
      legacyKind(legacyByTransaction.get(id)),
    ) && !locked;
    proposals.set(id, {
      classification,
      policy_blocked: policyBlocked,
      manual_lock_preserved: Boolean(locked),
    });
    if (
      !policyBlocked
      && classification.status === "confirmed"
      && REVENUE_CATEGORIES.has(classification.category)
      && classification.client_group_id
    ) accepted.push(classification);
  }
  return { accepted, proposals };
}

function transactionGraphInScope({
  directory,
  legacyByTransaction,
  current,
  permittedClientIds,
}) {
  const transactionIds = new Set(legacyByTransaction.keys());
  for (const [transactionId, proposal] of current.proposals) {
    if (permittedClientIds.has(proposal.classification?.client_group_id)) {
      transactionIds.add(transactionId);
    }
  }
  const transactions = directory.transactions.filter((row) => (
    transactionIds.has(row.bank_transaction_id)
  ));
  const accepted = current.accepted.filter((row) => (
    transactionIds.has(row.bank_transaction_id)
    && permittedClientIds.has(row.client_group_id)
  ));
  const proposals = new Map([...current.proposals].filter(([id]) => (
    transactionIds.has(id)
  )));
  return {
    transactions,
    current: { accepted, proposals },
  };
}

function completeCurrentFinanceRecords({
  financeRecords,
  transactions,
  current,
}) {
  const transactionIds = new Set(
    transactions.map((row) => row.bank_transaction_id),
  );
  const commitments = financeRecords.filter((row) => (
    row.model_type === "FeeCommitment"
    && row.status === "active"
  ));
  const commitmentsById = new Map(commitments.map((row) => [
    row.fee_commitment_id,
    row,
  ]));
  const classificationsById = new Map(current.accepted.map((row) => [
    row.bank_transaction_classification_id,
    row,
  ]));
  const selectedClassifications = [...current.proposals.values()].map((row) => (
    row.classification
  ));
  const selectedManualIds = new Set(selectedClassifications
    .filter((row) => (
      row.classification_source === "manual_review"
      && row.manual_lock === true
    ))
    .map((row) => row.bank_transaction_classification_id));
  const appliedRuleIds = new Set(
    selectedClassifications.map((row) => row.rule_id).filter(Boolean),
  );
  const allocations = financeRecords
    .filter((row) => row.model_type === "ClientDepositAllocation")
    .filter((row) => {
      const classification = classificationsById.get(
        row.bank_transaction_classification_id,
      );
      const commitment = commitmentsById.get(row.fee_commitment_id);
      return Boolean(
        classification
        && commitment
        && transactionIds.has(row.bank_transaction_id)
        && classification.bank_transaction_id === row.bank_transaction_id
        && classification.client_group_id === row.client_group_id
        && commitment.client_group_id === row.client_group_id,
      );
    });
  return stable([
    ...transactions,
    ...financeRecords.filter((row) => (
      (
        row.model_type === "BankClassificationRule"
        && appliedRuleIds.has(row.bank_classification_rule_id)
      )
      || (
        row.model_type === "BankTransactionClassification"
        && transactionIds.has(row.bank_transaction_id)
        && selectedManualIds.has(row.bank_transaction_classification_id)
      )
      || (
        row.model_type === "FeeCommitment"
        && row.status === "active"
      )
    )),
    ...allocations,
  ]);
}

function byTransaction(records) {
  const result = new Map();
  for (const row of records) {
    const id = required(row, "bank_transaction_id");
    if (result.has(id)) {
      throw new TypeError("Duplicate transaction classification");
    }
    result.set(id, row);
  }
  return result;
}

function duplicateIds(transactions, classifications) {
  const classified = new Set(classifications.map((row) => row.bank_transaction_id));
  const seen = new Set();
  const duplicates = new Set();
  for (const row of transactions.filter((item) => classified.has(item.bank_transaction_id))) {
    const fingerprint = row.transaction_fingerprint;
    if (seen.has(fingerprint)) duplicates.add(row.bank_transaction_id);
    else seen.add(fingerprint);
  }
  return duplicates;
}

function side({
  transaction,
  detail,
  classification,
  duplicates,
  reviewRequired,
  matchKind,
  candidate,
}) {
  if (detail) return {
    status: "recognized",
    match_kind: matchKind || null,
    client_group_id: detail.client_group_id,
    candidate_client_group_id: null,
    net_deposit_revenue: detail.net_deposit_revenue_delta,
    entry_type: detail.entry_type,
  };
  if (classification) return {
    status: duplicates.has(transaction.bank_transaction_id)
      ? "duplicate_ignored"
      : "outside_period",
    match_kind: matchKind || null,
    client_group_id: classification.client_group_id,
    candidate_client_group_id: null,
    net_deposit_revenue: 0,
    entry_type: null,
  };
  return {
    status: reviewRequired ? "review_required" : "not_present",
    match_kind: matchKind || null,
    client_group_id: null,
    candidate_client_group_id: reviewRequired ? candidate ?? null : null,
    net_deposit_revenue: 0,
    entry_type: null,
  };
}

function rowReason(legacy, current, legacyRecord, proposal) {
  const kind = legacyKind(legacyRecord);
  if (kind === "client_unique_prefix" || kind === "client_partial_name") {
    return proposal?.manual_lock_preserved && current.status === "recognized"
      ? "기존 접두어 연결은 자동 집계에서 제외했지만 담당자가 새 고객 연결을 수동 확정해 새 집계에 반영했습니다."
      : "기존 접두어 연결은 자동 매출에서 제외하고 고객 연결 확인 대상으로 분리했습니다.";
  }
  if (kind === "client_name_ambiguous") {
    return proposal?.manual_lock_preserved && current.status === "recognized"
      ? "기존 동명이인 연결은 자동 집계에서 제외했지만 담당자가 새 고객 연결을 수동 확정해 새 집계에 반영했습니다."
      : "같은 정리 이름에 여러 고객이 있어 자동 연결하지 않고 고객 연결 확인 대상으로 분리했습니다.";
  }
  if (
    legacy.status === "duplicate_ignored"
    || current.status === "duplicate_ignored"
  ) return "같은 거래 지문이 먼저 처리되어 중복 원본은 집계에서 제외했습니다.";
  if (proposal?.manual_lock_preserved) {
    return legacy.client_group_id === current.client_group_id
      && legacy.net_deposit_revenue === current.net_deposit_revenue
      ? "담당자가 확정한 고객 연결의 수동 잠금을 보존해 기존 집계와 새 집계에 같은 금액을 반영했습니다."
      : "담당자가 확정한 고객 연결의 수동 잠금을 보존했으며 기존 집계와의 차이는 확인 대상으로 남겼습니다.";
  }
  if (
    legacy.status === "recognized"
    && current.status === "recognized"
    && legacy.client_group_id === current.client_group_id
    && legacy.net_deposit_revenue === current.net_deposit_revenue
  ) return "기존 정확 연결과 새 정확 연결의 고객과 금액이 같습니다.";
  if (
    legacy.client_group_id
    && current.client_group_id
    && legacy.client_group_id !== current.client_group_id
  ) return "기존 고객 연결과 새 분류의 고객이 달라 담당자 확인이 필요합니다.";
  if (legacy.status === "recognized" && current.status !== "recognized") {
    return "기존 집계에 반영된 거래가 새 분류에서는 확정되지 않아 고객 연결 확인이 필요합니다.";
  }
  if (legacy.status !== "recognized" && current.status === "recognized") {
    return "새 정확 일치 또는 승인 별칭으로 확인된 거래가 새 집계에만 반영되었습니다.";
  }
  if (legacy.status === "outside_period" || current.status === "outside_period") {
    return "대사 기간 밖 거래라 해당 기간의 기존 집계와 새 집계에서 제외했습니다.";
  }
  if (legacy.status === "review_required" || current.status === "review_required") {
    return "고객 연결을 자동 확정할 근거가 없어 담당자 확인 대상으로 남겼습니다.";
  }
  return "기존 분류와 새 분류 모두 해당 거래를 고객 입금 매출로 확정하지 않았습니다.";
}

function transactionRows({
  transactions,
  legacyByTransaction,
  legacyAccepted,
  current,
  legacyRevenue,
  currentRevenue,
}) {
  const legacyClassifications = byTransaction(legacyAccepted);
  const currentClassificationsById = byTransaction(current.accepted);
  const legacyDetails = byTransaction(legacyRevenue.details);
  const currentDetails = byTransaction(currentRevenue.details);
  const legacyDuplicates = duplicateIds(transactions, legacyAccepted);
  const currentDuplicates = duplicateIds(transactions, current.accepted);
  return transactions.map((transaction) => {
    const id = transaction.bank_transaction_id;
    const legacyRecord = legacyByTransaction.get(id);
    const proposal = current.proposals.get(id);
    const proposed = proposal?.classification;
    const oldSide = side({
      transaction,
      detail: legacyDetails.get(id),
      classification: legacyClassifications.get(id),
      duplicates: legacyDuplicates,
      reviewRequired: legacyStatus(legacyRecord) === "review_required",
      matchKind: legacyKind(legacyRecord),
      candidate: legacyRecord?.client_group_id,
    });
    const newSide = side({
      transaction,
      detail: currentDetails.get(id),
      classification: currentClassificationsById.get(id),
      duplicates: currentDuplicates,
      reviewRequired: proposal?.policy_blocked === true
        || (
          transaction.direction === "inflow"
          && proposed?.status !== "confirmed"
        )
        || (
          proposed?.category === "refund_reversal"
          && proposed?.status !== "confirmed"
        ),
      matchKind: proposed?.rationale_code,
      candidate: proposed?.client_group_id,
    });
    const reviewRequired = oldSide.status === "review_required"
      || newSide.status === "review_required"
      || Boolean(
        oldSide.client_group_id
        && newSide.client_group_id
        && oldSide.client_group_id !== newSide.client_group_id,
      );
    return {
      bank_transaction_id: id,
      transaction_date: transaction.date,
      month: transaction.date.slice(0, 7),
      transaction_fingerprint_sha256: sha256(transaction.transaction_fingerprint),
      legacy: oldSide,
      current: newSide,
      delta_amount:
        newSide.net_deposit_revenue - oldSide.net_deposit_revenue,
      review_required: reviewRequired,
      reason: rowReason(oldSide, newSide, legacyRecord, proposal),
    };
  });
}

function customerMonthRows(legacyRevenue, currentRevenue, rows, names) {
  const aggregate = (details) => {
    const values = new Map();
    for (const row of details) {
      const key = `${row.month}|${row.client_group_id}`;
      values.set(key, (values.get(key) ?? 0) + row.net_deposit_revenue_delta);
    }
    return values;
  };
  const legacy = aggregate(legacyRevenue.details);
  const current = aggregate(currentRevenue.details);
  return [...new Set([...legacy.keys(), ...current.keys()])]
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((key) => {
      const [month, clientGroupId] = key.split("|");
      const legacyAmount = legacy.get(key) ?? 0;
      const currentAmount = current.get(key) ?? 0;
      const deltaAmount = currentAmount - legacyAmount;
      const relatedReasons = [...new Set(rows
        .filter((row) => row.month === month && (
          row.legacy.client_group_id === clientGroupId
          || row.current.client_group_id === clientGroupId
        ) && (
          row.delta_amount !== 0
          || row.legacy.client_group_id !== row.current.client_group_id
        ))
        .map((row) => row.reason))];
      return {
        month,
        client_group_id: clientGroupId,
        display_name: names.get(clientGroupId) ?? clientGroupId,
        legacy_net_deposit_revenue: legacyAmount,
        current_net_deposit_revenue: currentAmount,
        delta_amount: deltaAmount,
        status: deltaAmount === 0 ? "matched" : "difference",
        reason: deltaAmount === 0
          ? "기존 집계와 새 집계의 고객별 월 금액이 같습니다."
          : `관련 거래 대사 결과 차이가 발생했습니다. ${relatedReasons.join(" ")}`,
      };
    });
}

function feeRows({
  legacyFees,
  financeRecords,
  tenantId,
  permittedClientIds,
  receivables,
}) {
  const index = (records, key, label) => {
    const result = new Map();
    for (const row of stable(records)) {
      const id = required(row, key);
      if (result.has(id)) {
        throw new TypeError(`Duplicate ${label} identity`);
      }
      result.set(id, row);
    }
    return result;
  };
  for (const row of legacyFees) {
    if (!Object.hasOwn(row, "agreed_amount")) {
      throw new TypeError("legacy fee agreed_amount must be explicit");
    }
    if (
      row.agreed_amount !== null
      && (
        !Number.isSafeInteger(row.agreed_amount)
        || row.agreed_amount < 0
      )
    ) throw new TypeError("legacy fee agreed_amount is invalid");
  }
  const legacy = index(legacyFees, "opportunity_id", "legacy fee amount");
  const current = index(financeRecords.filter((row) => (
    row.model_type === "FeeCommitment"
    && row.tenant_id === tenantId
    && row.status === "active"
    && permittedClientIds.has(row.client_group_id)
  )), "opportunity_id", "active FeeCommitment opportunity");
  const receivable = new Map(receivables.details.fee_commitments.map((row) => [
    row.fee_commitment_id,
    row,
  ]));
  return [...new Set([...legacy.keys(), ...current.keys()])]
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((opportunityId) => {
      const oldFee = legacy.get(opportunityId) ?? null;
      const newFee = current.get(opportunityId) ?? null;
      const confirmed = oldFee?.manual_confirmed === true;
      const sameClient = Boolean(
        oldFee
        && newFee
        && oldFee.tenant_id === newFee.tenant_id
        && oldFee.client_group_id === newFee.client_group_id
        && oldFee.opportunity_id === newFee.opportunity_id,
      );
      const matches = Boolean(
        oldFee && newFee && confirmed && sameClient
        && oldFee.agreed_amount === newFee.agreed_amount,
      );
      const { status, reason } = feeOutcome({
        oldFee,
        newFee,
        confirmed,
        sameClient,
        matches,
      });
      const amountComparable = confirmed
        && sameClient
        && oldFee?.agreed_amount !== null
        && newFee?.agreed_amount !== null
        && Boolean(newFee);
      return {
        opportunity_id: opportunityId,
        legacy_fee_id: oldFee?.legacy_fee_id ?? null,
        current_fee_commitment_id: newFee?.fee_commitment_id ?? null,
        client_group_id: oldFee && newFee && !sameClient
          ? null
          : newFee?.client_group_id ?? oldFee?.client_group_id ?? null,
        legacy_candidate_amount: oldFee?.agreed_amount ?? null,
        legacy_manual_confirmed: confirmed,
        current_agreed_amount: newFee?.agreed_amount ?? null,
        current_receivable_amount:
          receivable.get(newFee?.fee_commitment_id)?.receivable_amount ?? null,
        delta_amount: amountComparable
          ? newFee.agreed_amount - oldFee.agreed_amount
          : null,
        status,
        manual_confirmation_required: [
          "manual_confirmation_required",
          "new_commitment_missing",
          "amount_difference",
          "client_mismatch",
        ].includes(status),
        reason,
      };
    });
}

function feeOutcome({ oldFee, newFee, confirmed, sameClient, matches }) {
  if (!oldFee) {
    return {
      status: "new_only",
      reason: "새 수임료 약정에는 대응하는 기존 수임료 기록이 없어 새 기록으로 분리했습니다.",
    };
  }
  if (!confirmed) {
    return {
      status: "manual_confirmation_required",
      reason: !newFee
        ? "기존 수임료 금액을 아직 확인하지 않았고 새 수임료 약정도 없어, 금액 확인과 약정 생성 여부를 함께 검토해야 합니다."
        : "기존 수임료 금액을 담당자가 확인하지 않아 자동 이전하지 않고 수동 확인 대상으로 남겼습니다.",
    };
  }
  if (!newFee) {
    return {
      status: "new_commitment_missing",
      reason: "담당자가 확인한 기존 수임료 금액에 대응하는 새 수임료 약정이 없어 생성 여부를 확인해야 합니다.",
    };
  }
  if (!sameClient) {
    return {
      status: "client_mismatch",
      reason: "동일한 수임 검토 건에 연결된 기존 고객과 새 고객이 달라, 자동 대사하지 않고 고객 연결을 다시 확인해야 합니다.",
    };
  }
  if (matches) {
    return {
      status: "matched",
      reason: oldFee.agreed_amount === null
        ? "담당자가 금액 미입력 상태를 확인했고 새 수임료 약정도 같은 상태입니다."
        : "담당자가 확인한 기존 수임료 금액과 새 수임료 약정 금액이 같습니다.",
    };
  }
  return {
    status: "amount_difference",
    reason: oldFee.agreed_amount === null
      ? "기존에는 금액 미입력으로 확인했지만 새 수임료 약정에는 금액이 있어 담당자 재확인이 필요합니다."
      : newFee.agreed_amount === null
        ? "담당자가 확인한 기존 수임료 금액이 새 수임료 약정에는 비어 있어 재확인이 필요합니다."
        : "담당자가 확인한 기존 수임료 금액과 새 수임료 약정 금액이 달라 재확인이 필요합니다.",
  };
}

function csvValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const safeText = typeof value === "string" && /^[=+\-@\t\r\n]/u.test(text)
    ? `'${text}`
    : text;
  return /[",\r\n]/u.test(safeText)
    ? `"${safeText.replaceAll("\"", "\"\"")}"`
    : safeText;
}

export function renderSyntheticClientLegacyReconciliationEvidence(report) {
  if (report?.schema_version !== "law-firm-os.client-legacy-reconciliation.v1") {
    throw new TypeError("Client legacy reconciliation report is required");
  }
  const rows = [
    ["대사 구분", "원본 ID", "고객", "월", "기존 금액", "새 금액", "차이", "상태", "사유"],
    ...report.revenue.transactions.map((row) => [
      "거래별 입금 매출",
      row.bank_transaction_id,
      row.current.client_group_id
        ?? row.legacy.client_group_id
        ?? row.current.candidate_client_group_id
        ?? row.legacy.candidate_client_group_id,
      row.month,
      row.legacy.net_deposit_revenue,
      row.current.net_deposit_revenue,
      row.delta_amount,
      row.review_required
        ? "확인 필요"
        : row.delta_amount !== 0
          ? "차이"
          : "대사 완료",
      row.reason,
    ]),
    ...report.revenue.customer_month_deltas.map((row) => [
      "고객·월 입금 매출",
      `${row.month}:${row.client_group_id}`,
      row.display_name,
      row.month,
      row.legacy_net_deposit_revenue,
      row.current_net_deposit_revenue,
      row.delta_amount,
      row.status === "matched" ? "대사 완료" : "차이",
      row.reason,
    ]),
    ...report.fee_amounts.map((row) => [
      "수임료 약정",
      row.opportunity_id,
      row.client_group_id,
      "",
      row.legacy_candidate_amount,
      row.current_agreed_amount,
      row.delta_amount,
      row.status,
      row.reason,
    ]),
  ];
  const csvText = `${rows.map((row) => row.map(csvValue).join(",")).join("\n")}\n`;
  const jsonText = `${JSON.stringify(report, null, 2)}\n`;
  return Object.freeze({
    json_text: jsonText,
    json_sha256: sha256(jsonText),
    csv_text: csvText,
    csv_sha256: sha256(csvText),
  });
}

export function buildSyntheticClientLegacyReconciliation({
  repository,
  tenant_id,
  permitted_client_records,
  legacy_classifications = [],
  legacy_fee_amounts = [],
  from,
  to,
  as_of,
  currency = "KRW",
  synthetic_only = false,
} = {}) {
  if (typeof repository?.list !== "function") {
    throw new TypeError("Finance repository is required");
  }
  if (synthetic_only !== true) {
    throw new TypeError("synthetic_only must be true for local legacy reconciliation");
  }
  if (currency !== "KRW") {
    throw new TypeError("Client legacy reconciliation currency must be KRW");
  }
  const tenantId = required({ tenant_id }, "tenant_id");
  const periodFrom = required({ from }, "from");
  const periodTo = required({ to }, "to");
  const asOf = required({ as_of }, "as_of");
  if (!Number.isFinite(Date.parse(asOf))) {
    throw new TypeError("as_of must be a valid instant");
  }
  const clientScope = clientsInScope(permitted_client_records, tenantId);
  const { clients, ids: permittedClientIds } = clientScope;
  const authoritativeFinanceRecords = readAuthoritativeFinanceRecords(
    repository,
    tenantId,
  );
  const authoritativeSourceSha256 = hashDomainValue(
    authoritativeFinanceRecords,
  );
  const financeRecords = financeRecordsInScope(
    authoritativeFinanceRecords,
    clientScope.byId,
  );
  const legacyScope = legacyRecordsInScope({
    classifications: legacy_classifications,
    fees: legacy_fee_amounts,
    tenantId,
    clientById: clientScope.byId,
  });
  const deniedOnlyTransactionIds = deniedOnlyClientTransactionIds({
    financeRecords: authoritativeFinanceRecords,
    legacyClassifications: legacy_classifications,
    tenantId,
    permittedClientIds,
  });
  const authoritativeDirectory = transactionDirectory(
    financeRecords,
    tenantId,
  );
  const permittedTransactions = authoritativeDirectory.transactions.filter(
    (row) => !deniedOnlyTransactionIds.has(row.bank_transaction_id),
  );
  const initialDirectory = {
    transactions: permittedTransactions,
    byId: new Map(permittedTransactions.map((row) => [
      row.bank_transaction_id,
      row,
    ])),
  };
  const legacyByTransaction = indexLegacy(
    legacyScope.classifications,
    initialDirectory.byId,
  );
  const legacyAccepted = [...legacyByTransaction]
    .map(([id, row]) => (
      legacyClassification(row, initialDirectory.byId.get(id))
    ))
    .filter(Boolean);
  const unscopedCurrent = currentClassifications({
    transactions: initialDirectory.transactions,
    clients,
    rules: financeRecords.filter((row) => row.model_type === "BankClassificationRule"),
    persisted: financeRecords.filter((row) => (
      row.model_type === "BankTransactionClassification"
    )),
    legacyByTransaction,
  });
  const graph = transactionGraphInScope({
    directory: initialDirectory,
    legacyByTransaction,
    current: unscopedCurrent,
    permittedClientIds,
  });
  const directory = {
    transactions: graph.transactions,
    byId: new Map(graph.transactions.map((row) => [
      row.bank_transaction_id,
      row,
    ])),
  };
  const current = graph.current;
  const completeFinanceRecords = completeCurrentFinanceRecords({
    financeRecords,
    transactions: directory.transactions,
    current,
  });
  const legacyRepository = readOnlyRepository([
    ...directory.transactions,
    ...legacyAccepted,
  ]);
  const duplicateCurrentIds = duplicateIds(
    directory.transactions,
    current.accepted,
  );
  const allocatableClassificationIds = new Set(
    current.accepted
      .filter((row) => (
        row.category === "client_receipt"
        && !duplicateCurrentIds.has(row.bank_transaction_id)
      ))
      .map((row) => row.bank_transaction_classification_id),
  );
  const currentSupportRecords = completeFinanceRecords.filter((row) => (
    row.model_type === "FeeCommitment"
    || (
      row.model_type === "ClientDepositAllocation"
      && allocatableClassificationIds.has(
        row.bank_transaction_classification_id,
      )
    )
  ));
  const currentRepository = readOnlyRepository([
    ...directory.transactions,
    ...current.accepted,
    ...currentSupportRecords,
  ]);
  const snapshot = sourceState({
    tenantId,
    clients,
    legacyClassifications: [...legacyByTransaction.values()],
    legacyFees: legacyScope.fees,
    financeRecords: completeFinanceRecords,
    from: periodFrom,
    to: periodTo,
    asOf,
  });
  const sourceSha256 = hashDomainValue(snapshot);
  const revenueInput = {
    tenant_id: tenantId,
    permitted_client_records: clients,
    from: periodFrom,
    to: periodTo,
    currency,
  };
  const legacyRevenue = buildClientDepositRevenue({
    repository: legacyRepository,
    ...revenueInput,
  });
  const currentRevenue = buildClientDepositRevenue({
    repository: currentRepository,
    ...revenueInput,
  });
  const receivables = buildClientReceivables({
    repository: currentRepository,
    tenant_id: tenantId,
    permitted_client_records: clients,
    currency,
    clock: () => new Date(asOf),
  });
  const transactions = transactionRows({
    transactions: directory.transactions,
    legacyByTransaction,
    legacyAccepted,
    current,
    legacyRevenue,
    currentRevenue,
  });
  const customerMonthDeltas = customerMonthRows(
    legacyRevenue,
    currentRevenue,
    transactions,
    new Map(clients.map((row) => [
      row.client_group_id,
      row.display_name ?? row.canonical_display_name ?? row.client_group_id,
    ])),
  );
  const fees = feeRows({
    legacyFees: legacyScope.fees,
    financeRecords: completeFinanceRecords,
    tenantId,
    permittedClientIds,
    receivables,
  });
  const authoritativeAfterSha256 = hashDomainValue(
    readAuthoritativeFinanceRecords(repository, tenantId),
  );
  if (authoritativeSourceSha256 !== authoritativeAfterSha256) {
    throw new Error("Finance source changed during legacy reconciliation");
  }
  const afterSha256 = sourceSha256;
  const seenFingerprints = new Set();
  let duplicateFingerprintCount = 0;
  for (const row of directory.transactions) {
    if (seenFingerprints.has(row.transaction_fingerprint)) {
      duplicateFingerprintCount += 1;
    } else {
      seenFingerprints.add(row.transaction_fingerprint);
    }
  }
  const deltaRows = [
    ...transactions.filter((row) => row.delta_amount !== 0 || row.review_required),
    ...customerMonthDeltas.filter((row) => row.delta_amount !== 0),
    ...fees.filter((row) => row.status !== "matched"),
  ];
  const reasonsComplete = deltaRows.every((row) => (
    typeof row.reason === "string" && /[가-힣]/u.test(row.reason)
  ));
  if (!reasonsComplete) {
    throw new Error("Every reconciliation delta requires a Korean reason");
  }
  const summary = {
    status: deltaRows.length > 0 ? "review_required" : "matched",
    transaction_count: directory.transactions.length,
    legacy_recognized_count: legacyRevenue.totals.recognized_transaction_count,
    current_recognized_count: currentRevenue.totals.recognized_transaction_count,
    transaction_review_count:
      transactions.filter((row) => row.review_required).length,
    duplicate_fingerprint_count: duplicateFingerprintCount,
    customer_month_delta_count:
      customerMonthDeltas.filter((row) => row.delta_amount !== 0).length,
    fee_difference_count: fees.filter((row) => row.status !== "matched").length,
    all_deltas_have_korean_reason: reasonsComplete,
  };
  const report = {
    schema_version: "law-firm-os.client-legacy-reconciliation.v1",
    reconciliation_id:
      `client_legacy_reconciliation_${sourceSha256.slice(0, 24)}`,
    scope: "local_synthetic",
    synthetic_only: true,
    tenant_id: tenantId,
    currency,
    period: { from: periodFrom, to: periodTo },
    as_of: asOf,
    source: {
      before_sha256: sourceSha256,
      after_sha256: afterSha256,
      unchanged: true,
      raw_bank_source_included: false,
      writes_product_state: false,
      production_ready_claim: false,
    },
    summary,
    revenue: {
      legacy: legacyRevenue,
      current: currentRevenue,
      transactions,
      customer_month_deltas: customerMonthDeltas,
    },
    receivables,
    fee_amounts: fees,
  };
  return Object.freeze({
    ...report,
    result_sha256: hashDomainValue(report),
  });
}
