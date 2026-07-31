const FEE_COMMITMENT_STATUS_LABELS = Object.freeze({
  active: "진행 중",
  superseded: "대체됨",
  cancelled: "취소됨",
});

const FEE_COMMITMENT_AMOUNT_LABELS = Object.freeze({
  known: "금액 확인",
  unknown: "금액 미입력",
});

const ALLOCATION_SOURCE_LABELS = Object.freeze({
  automatic: "자동 배분",
  manual: "수동 배분",
});

const CLIENT_RECEIVABLE_STATUS_TABS = Object.freeze([
  Object.freeze({ code: "all", label: "전체" }),
  Object.freeze({ code: "outstanding", label: "미수금 있음" }),
  Object.freeze({ code: "amount_unknown", label: "금액 미입력" }),
  Object.freeze({ code: "overpaid", label: "초과 입금" }),
  Object.freeze({ code: "settled", label: "정산 완료" }),
]);

const CLIENT_RECEIVABLE_STATE_LABELS = Object.freeze({
  loading: "불러오는 중입니다",
  data: "확인됨",
  partial: "일부만 불러왔습니다",
  empty: "등록된 수임료가 없습니다",
  denied: "권한이 없습니다",
  review_required: "확인 필요",
  error: "수임료·미수금을 불러오지 못했습니다",
  stale_conflict: "다른 사용자가 먼저 수정했습니다",
  replayed: "이미 처리된 요청입니다",
  passed: "저장되었습니다",
});

const CLIENT_RECEIVABLE_SOURCE_LABELS = Object.freeze({
  receivables: "미수금 요약",
  feeCommitments: "수임료 약정",
  allocations: "입금 배분",
  deposits: "은행 입금",
  clients: "허용 고객",
});

const CLIENT_RECEIVABLE_PARTIAL_REASON = "입금 배분 일부만 확인되어 미수금 합계를 계산하지 않았습니다.";

const FINANCE_VERSION_CONFLICT_CODES = new Set([
  "FINANCE_FEE_COMMITMENT_VERSION_CONFLICT",
  "FINANCE_DEPOSIT_ALLOCATION_VERSION_CONFLICT",
  "FINANCE_STATE_VERSION_CONFLICT",
  "VERSION_CONFLICT",
  "STATE_VERSION_CONFLICT",
]);

const SAFE_MUTABLE_FEE_FIELDS = new Set([
  "agreed_amount",
  "due_date",
  "matter_id",
  "source_fee_arrangement_id",
  "status",
]);

function hasOwn(value, key) {
  return value !== null
    && typeof value === "object"
    && Object.prototype.hasOwnProperty.call(value, key);
}

function valueOf(input, camel, snake) {
  if (hasOwn(input, camel)) return input[camel];
  if (snake && hasOwn(input, snake)) return input[snake];
  return undefined;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value) {
  const normalized = text(value);
  return normalized || null;
}

function requiredText(input, camel, snake = camel) {
  const normalized = text(valueOf(input, camel, snake));
  if (!normalized) throw new TypeError(`${snake} is required`);
  return normalized;
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${field} must be a positive integer`);
  }
  return value;
}

function wholeKrw(value, field, { nullable = false, positive = false } = {}) {
  if (nullable && value === null) return null;
  if (
    !Number.isSafeInteger(value)
    || (positive ? value <= 0 : value < 0)
  ) {
    const qualifier = positive ? "positive" : "non-negative";
    throw new TypeError(`${field} must be ${nullable ? "null or a " : "a "}${qualifier} whole KRW amount`);
  }
  return value;
}

function addWholeKrw(left, right, field) {
  const total = left + right;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new TypeError(`${field} exceeds the supported KRW range`);
  }
  return total;
}

function addCount(left, right, field) {
  const total = left + right;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new TypeError(`${field} exceeds the supported count range`);
  }
  return total;
}

function assertUniqueRows(rows, camelField, snakeField = camelField) {
  const ids = rows.map((row) => nullableText(valueOf(row, camelField, snakeField)));
  if (ids.some((id) => id === null)) {
    throw new TypeError(`${snakeField} is required`);
  }
  if (new Set(ids).size !== ids.length) throw new TypeError(`duplicate ${snakeField}`);
}

function dateOnly(value, field) {
  const normalized = nullableText(value);
  if (normalized === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
    throw new TypeError(`${field} must be YYYY-MM-DD`);
  }
  const milliseconds = Date.parse(`${normalized}T00:00:00.000Z`);
  if (
    !Number.isFinite(milliseconds)
    || new Date(milliseconds).toISOString().slice(0, 10) !== normalized
  ) {
    throw new TypeError(`${field} must be a valid calendar date`);
  }
  return normalized;
}

function instantOrNull(value, field) {
  const normalized = nullableText(value);
  if (normalized === null) return null;
  if (
    !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/u.test(normalized)
    || !Number.isFinite(Date.parse(normalized))
  ) {
    throw new TypeError(`${field} must be a valid instant with an explicit UTC offset`);
  }
  return normalized;
}

function resultState(result) {
  if (result === null || result === undefined || result.kind === "loading") {
    return "loading";
  }
  if (result.kind === "guarded") {
    if (["denied", "permission_denied"].includes(result.uiState)) return "denied";
    if (["review", "review_required"].includes(result.uiState)) return "review_required";
    return "error";
  }
  if (result.kind === "error") return "error";
  if (result.kind === "partial") return "partial";
  const uiState = valueOf(result, "uiState", "ui_state");
  const outcome = text(valueOf(result, "outcome", "outcome"));
  if (["denied", "permission_denied"].includes(uiState) || outcome === "denied") return "denied";
  if (["review", "review_required"].includes(uiState) || outcome === "review_required") return "review_required";
  if (["partial"].includes(uiState) || outcome === "partial") return "partial";
  if (["empty", "no_data"].includes(uiState) || ["empty", "no_data"].includes(outcome)) return "empty";
  if (result.kind === "data") return "data";
  return "error";
}

function payloadOf(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  if (result.kind === "data" || result.kind === "partial") {
    if (result.item && typeof result.item === "object" && !Array.isArray(result.item)) return result.item;
    if (result.data && typeof result.data === "object" && !Array.isArray(result.data)) return result.data;
    return result;
  }
  if (result.kind === undefined) return result;
  return null;
}

function sourceItems(result, keys) {
  const payload = payloadOf(result);
  if (!payload) return null;
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return Array.isArray(payload.items) ? payload.items : null;
}

function sourceStateBoundary(result) {
  if (!result || typeof result !== "object") return null;
  const payload = payloadOf(result);
  const sourceState = resultState(result);
  if (["data", "partial"].includes(sourceState)) {
    for (const [camel, snake] of [
      ["permissionPrefilterApplied", "permission_prefilter_applied"],
      ["countLeakPrevented", "count_leak_prevented"],
    ]) {
      const value = valueOf(result, camel, snake)
        ?? valueOf(payload, camel, snake);
      if (value === undefined) return "error";
    }
  }
  for (const [camel, snake] of [
    ["permissionPrefilterApplied", "permission_prefilter_applied"],
    ["countLeakPrevented", "count_leak_prevented"],
  ]) {
    const value = valueOf(result, camel, snake)
      ?? valueOf(payload, camel, snake);
    if (value !== undefined && value !== true) return camel === "permissionPrefilterApplied" ? "denied" : "error";
  }
  for (const [camel, snake] of [
    ["rawBankSourceIncluded", "raw_bank_source_included"],
    ["rawSourcePayloadIncluded", "raw_source_payload_included"],
    ["credentialMaterialIncluded", "credential_material_included"],
  ]) {
    if (
      valueOf(result, camel, snake) === true
      || valueOf(payload, camel, snake) === true
    ) return "error";
  }
  return null;
}

function sourceStateFor(result, fallback = "loading") {
  if (result === null || result === undefined) return fallback;
  return sourceStateBoundary(result) ?? resultState(result);
}

function sourceCoverageEntry(
  result,
  keys,
  {
    fallbackItems = null,
    fallbackState = "loading",
  } = {},
) {
  const state = sourceStateFor(result, fallbackState);
  const items = sourceItems(result, keys) ?? (Array.isArray(fallbackItems) ? fallbackItems : null);
  const complete = state === "data";
  const coverage = complete ? "complete" : state === "partial" ? "partial" : "unavailable";
  return Object.freeze({
    state,
    coverage,
    complete,
    itemCount: Array.isArray(items) ? items.length : null,
    label: complete
      ? "전체 확인"
      : state === "partial"
        ? "일부만 확인"
        : state === "loading"
          ? "불러오는 중입니다"
          : "확인하지 못함",
    sourceLabel: CLIENT_RECEIVABLE_SOURCE_LABELS[keys[0] === "fee_commitments"
      ? "feeCommitments"
      : keys[0] === "allocations"
        ? "allocations"
        : keys[0] === "deposits"
          ? "deposits"
          : keys[0] === "clients"
            ? "clients"
            : "receivables"],
  });
}

function buildSourceCoverage({
  receivablesResult,
  feeCommitmentsResult,
  allocationsResult,
  clientsResult,
} = {}) {
  const payload = payloadOf(receivablesResult);
  const details = payload?.details && typeof payload.details === "object" ? payload.details : {};
  const receivablesState = sourceStateFor(receivablesResult);
  const coverage = {
    receivables: sourceCoverageEntry(receivablesResult, ["client_summaries", "clientSummaries", "items"]),
    feeCommitments: sourceCoverageEntry(feeCommitmentsResult, ["fee_commitments", "commitments", "items"], {
      fallbackItems: details.fee_commitments,
      fallbackState: Array.isArray(details.fee_commitments) ? receivablesState : "loading",
    }),
    allocations: sourceCoverageEntry(allocationsResult, ["allocations", "items"], {
      fallbackItems: details.allocations,
      fallbackState: Array.isArray(details.allocations) ? receivablesState : "loading",
    }),
    deposits: sourceCoverageEntry(receivablesResult, ["deposits"], {
      fallbackItems: details.deposits,
      fallbackState: Array.isArray(details.deposits) ? receivablesState : "loading",
    }),
    clients: sourceCoverageEntry(clientsResult, ["clients", "items"]),
  };
  return Object.freeze(coverage);
}

function sanitizeSourceCoverage(sourceCoverage, { keepCompleteCounts = false, parsedSources = null } = {}) {
  if (!sourceCoverage || typeof sourceCoverage !== "object") return null;
  const parsed = parsedSources === null ? null : new Set(parsedSources);
  return Object.freeze(Object.fromEntries(
    Object.entries(sourceCoverage).map(([key, source]) => [
      key,
      Object.freeze({
        ...source,
        itemCount: keepCompleteCounts
          && source.complete === true
          && (parsed === null || parsed.has(key))
          ? source.itemCount
          : null,
      }),
    ]),
  ));
}

function emptyReceivablesModel({
  state,
  statusTab,
  searchQuery,
  requestedFeeCommitmentId,
  mutationResult,
  sourceCoverage = null,
  partialSources = [],
  partialReason = null,
} = {}) {
  return Object.freeze({
    state,
    stateLabel: CLIENT_RECEIVABLE_STATE_LABELS[state],
    statusTabs: CLIENT_RECEIVABLE_STATUS_TABS,
    activeStatusTab: normalizeStatusTab(statusTab),
    searchQuery: text(searchQuery),
    commitments: Object.freeze([]),
    visibleCommitments: Object.freeze([]),
    allocations: Object.freeze([]),
    deposits: Object.freeze([]),
    clientSummaries: Object.freeze([]),
    ranking: Object.freeze([]),
    totalReceivables: null,
    unknownAmountCount: null,
    totalOverpayment: null,
    unallocatedAmount: null,
    authorizedFeeCommitmentIds: Object.freeze([]),
    selectedFeeCommitmentId: null,
    selectedFeeCommitment: null,
    requestedFeeCommitmentAvailable: nullableText(requestedFeeCommitmentId) ? false : null,
    mutation: mutationResult ? normalizeFeeCommitmentMutationResult(mutationResult) : null,
    invoiceRequired: false,
    matterRequired: false,
    sourceCoverage: sanitizeSourceCoverage(sourceCoverage),
    partialSources: Object.freeze(partialSources),
    partialReason,
  });
}

function normalizeSourceStates(results) {
  const states = results.filter(Boolean).map((result) => sourceStateBoundary(result) ?? resultState(result));
  if (states.length === 0) return "loading";
  if (states.includes("denied")) return "denied";
  if (states.includes("error")) return "error";
  if (states.includes("review_required")) return "review_required";
  if (states.includes("loading")) return "loading";
  if (states.includes("partial")) return "partial";
  if (states.every((state) => state === "empty")) return "empty";
  return "data";
}

function normalizeClientNameMap(clientsResult) {
  const items = sourceItems(clientsResult, ["clients", "items"]);
  if (!items) return new Map();
  assertUniqueRows(items, "clientGroupId", "client_group_id");
  const map = new Map();
  for (const item of items) {
    const id = nullableText(valueOf(item, "clientGroupId", "client_group_id"));
    const displayName = nullableText(valueOf(item, "displayName", "display_name"));
    if (id && displayName) map.set(id, displayName);
  }
  return map;
}

function normalizeFeeCommitmentRow(input, clientNames = new Map()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("FeeCommitment row is invalid");
  const feeCommitmentId = requiredText(input, "feeCommitmentId", "fee_commitment_id");
  const clientGroupId = requiredText(input, "clientGroupId", "client_group_id");
  const currency = valueOf(input, "currency", "currency");
  if (currency !== undefined && currency !== "KRW") throw new TypeError("FeeCommitment.currency must be KRW");
  const amount = valueOf(input, "agreedAmount", "agreed_amount");
  if (amount === undefined) throw new TypeError("agreed_amount must be explicitly set to a whole KRW amount or null");
  const agreedAmount = wholeKrw(amount, "agreed_amount", { nullable: true });
  const status = text(valueOf(input, "status", "status")) || "active";
  if (!Object.hasOwn(FEE_COMMITMENT_STATUS_LABELS, status)) throw new TypeError("FeeCommitment.status is invalid");
  const stateVersionValue = valueOf(input, "stateVersion", "state_version");
  const stateVersion = stateVersionValue === undefined
    ? null
    : positiveInteger(stateVersionValue, "state_version");
  const dueDate = dateOnly(valueOf(input, "dueDate", "due_date"), "due_date");
  const acceptedAt = instantOrNull(valueOf(input, "acceptedAt", "accepted_at"), "accepted_at");
  const displayName = nullableText(
    valueOf(input, "displayName", "display_name")
      ?? clientNames.get(clientGroupId),
  );
  const active = status === "active";
  return Object.freeze({
    feeCommitmentId,
    clientGroupId,
    displayName,
    opportunityId: nullableText(valueOf(input, "opportunityId", "opportunity_id")),
    agreedAmount,
    amountStatus: agreedAmount === null ? "unknown" : "known",
    amountStatusLabel: agreedAmount === null ? FEE_COMMITMENT_AMOUNT_LABELS.unknown : FEE_COMMITMENT_AMOUNT_LABELS.known,
    dueDate,
    acceptedAt,
    status,
    statusLabel: FEE_COMMITMENT_STATUS_LABELS[status],
    stateVersion,
    active,
  });
}

function normalizeAllocationRow(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("ClientDepositAllocation row is invalid");
  const allocationId = requiredText(input, "clientDepositAllocationId", "client_deposit_allocation_id");
  const clientGroupId = requiredText(input, "clientGroupId", "client_group_id");
  const bankTransactionId = requiredText(input, "bankTransactionId", "bank_transaction_id");
  const feeCommitmentId = requiredText(input, "feeCommitmentId", "fee_commitment_id");
  const currency = valueOf(input, "currency", "currency");
  if (currency !== undefined && currency !== "KRW") throw new TypeError("ClientDepositAllocation.currency must be KRW");
  const allocatedAmount = wholeKrw(valueOf(input, "allocatedAmount", "allocated_amount"), "allocated_amount", { positive: true });
  const suppliedActiveAmount = valueOf(input, "activeAmount", "active_amount");
  const reversedAmount = valueOf(input, "reversedAmount", "reversed_amount")
    ?? (suppliedActiveAmount === undefined ? 0 : allocatedAmount - wholeKrw(suppliedActiveAmount, "active_amount"));
  const normalizedReversedAmount = wholeKrw(reversedAmount, "reversed_amount");
  if (normalizedReversedAmount > allocatedAmount) throw new TypeError("reversed_amount cannot exceed allocated_amount");
  const activeAmount = allocatedAmount - normalizedReversedAmount;
  if (suppliedActiveAmount !== undefined && wholeKrw(suppliedActiveAmount, "active_amount") !== activeAmount) throw new TypeError("active_amount does not reconcile");
  const allocationSource = text(valueOf(input, "allocationSource", "allocation_source"));
  if (!Object.hasOwn(ALLOCATION_SOURCE_LABELS, allocationSource)) throw new TypeError("allocation_source is invalid");
  const manualLockValue = valueOf(input, "manualLock", "manual_lock");
  const manualLock = manualLockValue === undefined ? allocationSource === "manual" : manualLockValue;
  if (typeof manualLock !== "boolean" || manualLock !== (allocationSource === "manual")) throw new TypeError("manual_lock does not match allocation_source");
  const stateVersionValue = valueOf(input, "stateVersion", "state_version");
  const stateVersion = stateVersionValue === undefined
    ? null
    : positiveInteger(stateVersionValue, "state_version");
  return Object.freeze({
    clientDepositAllocationId: allocationId,
    clientGroupId,
    bankTransactionId,
    feeCommitmentId,
    allocatedAmount,
    reversedAmount: normalizedReversedAmount,
    activeAmount,
    allocationSource,
    allocationSourceLabel: ALLOCATION_SOURCE_LABELS[allocationSource],
    manualLock,
    stateVersion,
    status: activeAmount === 0 ? "reversed" : "active",
    statusLabel: activeAmount === 0 ? "되돌림" : "사용 중",
  });
}

function normalizeDepositRow(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Client deposit row is invalid");
  const bankTransactionId = requiredText(input, "bankTransactionId", "bank_transaction_id");
  const clientGroupId = requiredText(input, "clientGroupId", "client_group_id");
  const grossAmount = wholeKrw(valueOf(input, "grossAmount", "gross_amount"), "gross_amount", { positive: true });
  const linkedRefundAmount = wholeKrw(valueOf(input, "linkedRefundAmount", "linked_refund_amount") ?? 0, "linked_refund_amount");
  const netAmount = wholeKrw(valueOf(input, "netAmount", "net_amount"), "net_amount");
  if (linkedRefundAmount > grossAmount || netAmount !== grossAmount - linkedRefundAmount) throw new TypeError("net_amount does not reconcile with linked refund");
  const activeAllocatedAmount = wholeKrw(valueOf(input, "activeAllocatedAmount", "active_allocated_amount") ?? 0, "active_allocated_amount");
  const suppliedOverpayment = valueOf(input, "overpaymentAmount", "overpayment_amount");
  const overpaymentAmount = suppliedOverpayment === undefined ? netAmount - activeAllocatedAmount : wholeKrw(suppliedOverpayment, "overpayment_amount");
  if (activeAllocatedAmount > netAmount || overpaymentAmount !== netAmount - activeAllocatedAmount) throw new TypeError("overpayment_amount does not reconcile");
  return Object.freeze({
    bankTransactionId,
    clientGroupId,
    grossAmount,
    linkedRefundAmount,
    netAmount,
    activeAllocatedAmount,
    overpaymentAmount,
    occurredAt: instantOrNull(valueOf(input, "occurredAt", "occurred_at"), "occurred_at"),
  });
}

function normalizeClientSummary(
  input,
  clientNames = new Map(),
  clientDueDates = new Map(),
) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Client receivable summary is invalid");
  const clientGroupId = requiredText(input, "clientGroupId", "client_group_id");
  const agreedAmount = wholeKrw(valueOf(input, "agreedAmount", "agreed_amount"), "agreed_amount", { nullable: true });
  const activeAllocatedAmount = wholeKrw(valueOf(input, "activeAllocatedAmount", "active_allocated_amount") ?? 0, "active_allocated_amount");
  const receivableAmount = wholeKrw(valueOf(input, "receivableAmount", "receivable_amount"), "receivable_amount", { nullable: true });
  const unknownAmountCount = valueOf(input, "unknownAmountCount", "unknown_amount_count") ?? (agreedAmount === null ? 1 : 0);
  if (!Number.isSafeInteger(unknownAmountCount) || unknownAmountCount < 0) throw new TypeError("unknown_amount_count is invalid");
  const overpaymentAmount = wholeKrw(valueOf(input, "overpaymentAmount", "overpayment_amount") ?? 0, "overpayment_amount");
  return Object.freeze({
    clientGroupId,
    displayName: nullableText(valueOf(input, "displayName", "display_name") ?? clientNames.get(clientGroupId)),
    agreedAmount,
    activeAllocatedAmount,
    receivableAmount,
    unknownAmountCount,
    overpaymentAmount,
    earliestDueDate: dateOnly(
      valueOf(input, "earliestDueDate", "earliest_due_date")
        ?? clientDueDates.get(clientGroupId)
        ?? null,
      "earliest_due_date",
    ),
  });
}

function deriveCommitmentDetails(commitments, allocations) {
  const byCommitment = new Map();
  for (const allocation of allocations) {
    byCommitment.set(
      allocation.feeCommitmentId,
      addWholeKrw(
        byCommitment.get(allocation.feeCommitmentId) ?? 0,
        allocation.activeAmount,
        "active allocation total",
      ),
    );
  }
  return commitments.map((commitment) => {
    const activeAllocatedAmount = byCommitment.get(commitment.feeCommitmentId) ?? 0;
    if (commitment.agreedAmount === null && activeAllocatedAmount > 0) throw new TypeError("금액 미입력 약정에는 입금을 배분할 수 없습니다");
    if (commitment.agreedAmount !== null && activeAllocatedAmount > commitment.agreedAmount) throw new TypeError("수임료 약정 금액보다 많이 배분할 수 없습니다");
    const receivableAmount = commitment.agreedAmount === null
      ? null
      : Math.max(0, commitment.agreedAmount - activeAllocatedAmount);
    return Object.freeze({
      ...commitment,
      activeAllocatedAmount,
      receivableAmount,
    });
  });
}

function deriveClientSummaries(
  commitments,
  deposits,
  clientNames,
  sourceSummaries = [],
  { depositsComplete = true } = {},
) {
  const ids = new Set([
    ...commitments.map((item) => item.clientGroupId),
    ...deposits.map((item) => item.clientGroupId),
    ...sourceSummaries.map((item) => text(valueOf(item, "clientGroupId", "client_group_id"))).filter(Boolean),
  ]);
  const sourceNames = new Map(
    sourceSummaries
      .map((item) => [
        text(valueOf(item, "clientGroupId", "client_group_id")),
        nullableText(valueOf(item, "displayName", "display_name")),
      ])
      .filter(([id, displayName]) => id && displayName),
  );
  return [...ids].map((clientGroupId) => {
    const clientCommitments = commitments.filter((item) => item.clientGroupId === clientGroupId && item.active);
    const known = clientCommitments.filter((item) => item.agreedAmount !== null);
    const depositsForClient = deposits.filter((item) => item.clientGroupId === clientGroupId);
    const agreedAmount = known.length === 0
      ? null
      : known.reduce((sum, item) => addWholeKrw(sum, item.agreedAmount, "client agreed amount"), 0);
    const activeAllocatedAmount = known.reduce(
      (sum, item) => addWholeKrw(sum, item.activeAllocatedAmount, "client active allocation"),
      0,
    );
    const receivableAmount = agreedAmount === null
      ? null
      : known.reduce((sum, item) => addWholeKrw(sum, item.receivableAmount, "client receivable amount"), 0);
    const overpaymentAmount = depositsComplete
      ? depositsForClient.reduce(
        (sum, item) => addWholeKrw(sum, item.overpaymentAmount, "client overpayment amount"),
        0,
      )
      : null;
    const dueDates = known.filter((item) => item.receivableAmount > 0).map((item) => item.dueDate).filter(Boolean).sort();
    return Object.freeze({
      clientGroupId,
      displayName: clientNames.get(clientGroupId) ?? sourceNames.get(clientGroupId) ?? null,
      agreedAmount,
      activeAllocatedAmount,
      receivableAmount,
      unknownAmountCount: clientCommitments.length - known.length,
      overpaymentAmount,
      earliestDueDate: dueDates[0] ?? null,
    });
  });
}

function validateCrossReferences(commitments, allocations, deposits, { depositsComplete = true } = {}) {
  const commitmentsById = new Map(commitments.map((item) => [item.feeCommitmentId, item]));
  const depositsById = new Map(deposits.map((item) => [item.bankTransactionId, item]));
  const allocatedByDeposit = new Map();
  for (const allocation of allocations) {
    const commitment = commitmentsById.get(allocation.feeCommitmentId);
    const deposit = depositsById.get(allocation.bankTransactionId);
    if (!commitment || depositsComplete && !deposit) throw new TypeError("배분의 원천 약정 또는 입금을 찾을 수 없습니다");
    if (commitment.clientGroupId !== allocation.clientGroupId || deposit && deposit.clientGroupId !== allocation.clientGroupId) throw new TypeError("배분의 고객 연결이 일치하지 않습니다");
    if (!commitment.active && allocation.activeAmount > 0) throw new TypeError("종료된 수임료 약정에는 활성 배분을 둘 수 없습니다");
    allocatedByDeposit.set(
      allocation.bankTransactionId,
      (allocatedByDeposit.get(allocation.bankTransactionId) ?? 0) + allocation.activeAmount,
    );
  }
  if (depositsComplete) {
    for (const [bankTransactionId, activeAmount] of allocatedByDeposit) {
      if (activeAmount > depositsById.get(bankTransactionId).netAmount) throw new TypeError("환불 차감 후 입금액보다 많이 배분할 수 없습니다");
    }
  }
}

function summariesMatchComputed(sourceSummaries, computedSummaries) {
  const computedById = new Map(computedSummaries.map((row) => [row.clientGroupId, row]));
  if (sourceSummaries.length !== computedSummaries.length) return false;
  return sourceSummaries.every((row) => {
    const computed = computedById.get(row.clientGroupId);
    return Boolean(computed)
      && row.agreedAmount === computed.agreedAmount
      && row.activeAllocatedAmount === computed.activeAllocatedAmount
      && row.receivableAmount === computed.receivableAmount
      && row.unknownAmountCount === computed.unknownAmountCount
      && row.overpaymentAmount === computed.overpaymentAmount;
  });
}

function normalizeRankingRows(rows, clientNames) {
  if (!Array.isArray(rows)) return null;
  assertUniqueRows(rows, "clientGroupId", "client_group_id");
  return rows.map((row) => {
    const rank = valueOf(row, "rank", "rank");
    if (!Number.isSafeInteger(rank) || rank < 1) throw new TypeError("ranking rank is invalid");
    const summary = normalizeClientSummary({
      ...row,
      rank,
    }, clientNames);
    return Object.freeze({
      rank,
      clientGroupId: summary.clientGroupId,
      displayName: summary.displayName,
      agreedAmount: summary.agreedAmount,
      activeAllocatedAmount: summary.activeAllocatedAmount,
      receivableAmount: summary.receivableAmount,
      earliestDueDate: summary.earliestDueDate,
    });
  });
}

function expectedRankingRows(clientSummaries) {
  return [...clientSummaries]
    .filter((row) => row.receivableAmount > 0)
    .sort((left, right) => (
      right.receivableAmount - left.receivableAmount
      || String(left.earliestDueDate ?? "").localeCompare(String(right.earliestDueDate ?? ""))
      || String(left.displayName ?? "").localeCompare(String(right.displayName ?? ""), "ko")
      || left.clientGroupId.localeCompare(right.clientGroupId, "en")
    ))
    .map((row, index) => Object.freeze({
      rank: index + 1,
      clientGroupId: row.clientGroupId,
      displayName: row.displayName,
      agreedAmount: row.agreedAmount,
      activeAllocatedAmount: row.activeAllocatedAmount,
      receivableAmount: row.receivableAmount,
      earliestDueDate: row.earliestDueDate,
    }));
}

function rankingsMatch(provided, expected) {
  if (!Array.isArray(provided) || provided.length !== expected.length) return false;
  return provided.every((row, index) => {
    const expectedRow = expected[index];
    return row.rank === expectedRow.rank
      && row.clientGroupId === expectedRow.clientGroupId
      && row.displayName === expectedRow.displayName
      && row.agreedAmount === expectedRow.agreedAmount
      && row.activeAllocatedAmount === expectedRow.activeAllocatedAmount
      && row.receivableAmount === expectedRow.receivableAmount
      && row.earliestDueDate === expectedRow.earliestDueDate;
  });
}

function commitmentMatchesStatus(commitment, statusTab, summaryByClient) {
  if (statusTab === "all") return true;
  if (statusTab === "amount_unknown") return commitment.active && commitment.agreedAmount === null;
  if (statusTab === "outstanding") return commitment.active && commitment.receivableAmount > 0;
  if (statusTab === "settled") return commitment.active && commitment.agreedAmount !== null && commitment.receivableAmount === 0;
  if (statusTab === "overpaid") return (summaryByClient.get(commitment.clientGroupId)?.overpaymentAmount ?? 0) > 0;
  return false;
}

function normalizeStatusTab(value) {
  const requested = text(value);
  return CLIENT_RECEIVABLE_STATUS_TABS.some((tab) => tab.code === requested)
    ? requested
    : CLIENT_RECEIVABLE_STATUS_TABS.find((tab) => tab.label === requested)?.code ?? "all";
}

function searchValue(value) {
  return text(value).normalize("NFKC").toLocaleLowerCase("ko-KR");
}

function commitmentMatchesSearch(commitment, query) {
  if (!query) return true;
  return searchValue(commitment.displayName).includes(query);
}

export function resolveClientReceivableSelection(requestedFeeCommitmentId, authorizedFeeCommitmentIds = []) {
  const requested = nullableText(requestedFeeCommitmentId);
  if (!requested || !Array.isArray(authorizedFeeCommitmentIds)) return null;
  const authorized = new Set(authorizedFeeCommitmentIds.map(nullableText).filter(Boolean));
  return authorized.has(requested) ? requested : null;
}

export function normalizeFeeCommitmentMutationResult(result) {
  if (result === null || result === undefined || result.kind === "loading") return Object.freeze({ state: "loading", label: CLIENT_RECEIVABLE_STATE_LABELS.loading, safeErrorCodes: Object.freeze([]) });
  const sourceState = resultState(result);
  const safeErrorCodes = [
    ...(Array.isArray(result.safeErrorCodes) ? result.safeErrorCodes : []),
    ...(Array.isArray(result.safe_error_codes) ? result.safe_error_codes : []),
    ...(Array.isArray(result.body?.safe_error_codes) ? result.body.safe_error_codes : []),
  ].filter((code) => typeof code === "string");
  const status = result.status ?? result.httpStatus ?? result.body?.status;
  const stale = status === 409 || safeErrorCodes.some((code) => FINANCE_VERSION_CONFLICT_CODES.has(String(code).toUpperCase()));
  if (sourceState === "denied") return Object.freeze({ state: "denied", label: CLIENT_RECEIVABLE_STATE_LABELS.denied, safeErrorCodes: Object.freeze(safeErrorCodes) });
  if (sourceState === "partial") return Object.freeze({ state: "partial", label: CLIENT_RECEIVABLE_STATE_LABELS.partial, safeErrorCodes: Object.freeze(safeErrorCodes) });
  if (stale) return Object.freeze({ state: "stale_conflict", label: CLIENT_RECEIVABLE_STATE_LABELS.stale_conflict, safeErrorCodes: Object.freeze(safeErrorCodes) });
  if (sourceState === "error") return Object.freeze({ state: "error", label: CLIENT_RECEIVABLE_STATE_LABELS.error, safeErrorCodes: Object.freeze(safeErrorCodes) });
  const outcome = text(valueOf(result, "outcome", "outcome"));
  if (result.idempotentReplay === true || result.idempotent_replay === true || outcome === "idempotent_replay") {
    return Object.freeze({ state: "replayed", label: CLIENT_RECEIVABLE_STATE_LABELS.replayed, safeErrorCodes: Object.freeze(safeErrorCodes) });
  }
  return Object.freeze({ state: "passed", label: CLIENT_RECEIVABLE_STATE_LABELS.passed, safeErrorCodes: Object.freeze(safeErrorCodes) });
}

export function buildFeeCommitmentCommand(input = {}) {
  const operation = text(valueOf(input, "operation", "operation")) || "create";
  const idempotencyKey = requiredText(input, "idempotencyKey", "idempotency_key");
  const tenantId = requiredText(input, "tenantId", "tenant_id");
  const reason = requiredText(input, "reason", "reason");
  if (operation === "create") {
    const amount = valueOf(input, "agreedAmount", "agreed_amount");
    if (amount === undefined) throw new TypeError("agreed_amount must be explicitly set to a whole KRW amount or null");
    const feeCommitment = {
      model_type: "FeeCommitment",
      fee_commitment_id: requiredText(input, "feeCommitmentId", "fee_commitment_id"),
      tenant_id: tenantId,
      client_group_id: requiredText(input, "clientGroupId", "client_group_id"),
      opportunity_id: requiredText(input, "opportunityId", "opportunity_id"),
      currency: "KRW",
      agreed_amount: wholeKrw(amount, "agreed_amount", { nullable: true }),
      due_date: dateOnly(valueOf(input, "dueDate", "due_date"), "due_date"),
      accepted_at: instantOrNull(requiredText(input, "acceptedAt", "accepted_at"), "accepted_at"),
      reason,
    };
    const matterId = nullableText(valueOf(input, "matterId", "matter_id"));
    const sourceFeeArrangementId = nullableText(valueOf(input, "sourceFeeArrangementId", "source_fee_arrangement_id"));
    if (matterId) feeCommitment.matter_id = matterId;
    if (sourceFeeArrangementId) feeCommitment.source_fee_arrangement_id = sourceFeeArrangementId;
    return Object.freeze({ operation: "create", idempotency_key: idempotencyKey, fee_commitment: Object.freeze(feeCommitment) });
  }

  const feeCommitmentId = requiredText(input, "feeCommitmentId", "fee_commitment_id");
  const expectedStateVersion = positiveInteger(valueOf(input, "expectedStateVersion", "expected_state_version"), "expected_state_version");
  if (operation === "cancel") {
    return Object.freeze({
      operation: "cancel",
      tenant_id: tenantId,
      fee_commitment_id: feeCommitmentId,
      expected_state_version: expectedStateVersion,
      changes: Object.freeze({ status: "cancelled" }),
      reason,
      idempotency_key: idempotencyKey,
    });
  }
  if (operation !== "edit" && operation !== "update") throw new TypeError("operation must be create, edit, or cancel");
  const rawChanges = valueOf(input, "changes", "changes");
  if (!rawChanges || typeof rawChanges !== "object" || Array.isArray(rawChanges)) throw new TypeError("changes must be an object");
  const changes = {};
  for (const [rawField, rawValue] of Object.entries(rawChanges)) {
    const field = rawField === "agreedAmount" ? "agreed_amount" : rawField === "dueDate" ? "due_date" : rawField === "matterId" ? "matter_id" : rawField === "sourceFeeArrangementId" ? "source_fee_arrangement_id" : rawField;
    if (!SAFE_MUTABLE_FEE_FIELDS.has(field)) throw new TypeError(`unsupported FeeCommitment field: ${field}`);
    if (field === "agreed_amount") changes[field] = wholeKrw(rawValue, field, { nullable: true });
    else if (field === "due_date") changes[field] = dateOnly(rawValue, field);
    else if (field === "matter_id" || field === "source_fee_arrangement_id") changes[field] = nullableText(rawValue);
    else if (field === "status") {
      if (rawValue !== "cancelled") throw new TypeError("FeeCommitment status can only be changed to cancelled");
      changes[field] = rawValue;
    }
  }
  if (Object.keys(changes).length === 0) throw new TypeError("at least one change is required");
  if (changes.status === "cancelled" && Object.keys(changes).length !== 1) throw new TypeError("FeeCommitment cancellation cannot be combined with other changes");
  return Object.freeze({
    operation: "edit",
    tenant_id: tenantId,
    fee_commitment_id: feeCommitmentId,
    expected_state_version: expectedStateVersion,
    changes: Object.freeze(changes),
    reason,
    idempotency_key: idempotencyKey,
  });
}

export function buildClientDepositReallocationCommand(input = {}) {
  const tenantId = requiredText(input, "tenantId", "tenant_id");
  const bankTransactionId = requiredText(input, "bankTransactionId", "bank_transaction_id");
  const reason = requiredText(input, "reason", "reason");
  const idempotencyKey = requiredText(input, "idempotencyKey", "idempotency_key");
  const expectedRows = valueOf(input, "expectedAllocations", "expected_allocations");
  const targets = valueOf(input, "targets", "targets");
  if (!Array.isArray(expectedRows) || expectedRows.length > 200) throw new TypeError("expected_allocations must contain at most 200 rows");
  if (!Array.isArray(targets) || targets.length > 200) throw new TypeError("targets must contain at most 200 rows");
  const expectedAllocations = expectedRows.map((row) => Object.freeze({
    client_deposit_allocation_id: requiredText(row, "clientDepositAllocationId", "client_deposit_allocation_id"),
    state_version: positiveInteger(valueOf(row, "stateVersion", "state_version"), "state_version"),
  }));
  if (new Set(expectedAllocations.map((row) => row.client_deposit_allocation_id)).size !== expectedAllocations.length) throw new TypeError("expected_allocations contains duplicate allocation IDs");
  const normalizedTargets = targets.map((row) => Object.freeze({
    fee_commitment_id: requiredText(row, "feeCommitmentId", "fee_commitment_id"),
    active_amount: wholeKrw(valueOf(row, "activeAmount", "active_amount"), "active_amount"),
  }));
  if (new Set(normalizedTargets.map((row) => row.fee_commitment_id)).size !== normalizedTargets.length) throw new TypeError("targets contains duplicate FeeCommitment IDs");
  return Object.freeze({
    tenant_id: tenantId,
    bank_transaction_id: bankTransactionId,
    expected_allocations: Object.freeze(expectedAllocations),
    targets: Object.freeze(normalizedTargets),
    reason,
    idempotency_key: idempotencyKey,
  });
}

export function buildClientReceivablesModel({
  receivablesResult = null,
  feeCommitmentsResult = null,
  allocationsResult = null,
  clientsResult = null,
  mutationResult = null,
  requestedFeeCommitmentId = "",
  statusTab = "all",
  searchQuery = "",
} = {}) {
  const sourceResults = [receivablesResult, feeCommitmentsResult, allocationsResult, clientsResult].filter(Boolean);
  let state = normalizeSourceStates(sourceResults);
  const sourceCoverage = buildSourceCoverage({
    receivablesResult,
    feeCommitmentsResult,
    allocationsResult,
    clientsResult,
  });
  const partialSourceSet = new Set(
    Object.entries(sourceCoverage)
      .filter(([, source]) => source.coverage === "partial")
      .map(([source]) => source),
  );
  const arSourceNames = ["feeCommitments", "allocations"];
  const arPartialSources = arSourceNames.filter((source) => sourceCoverage[source].coverage === "partial");
  const arSourcesComplete = arSourceNames.every((source) => sourceCoverage[source].complete);
  const depositSourceComplete = sourceCoverage.deposits.complete;
  if (!depositSourceComplete) partialSourceSet.add("deposits");
  const partialSources = Object.freeze([...partialSourceSet]);
  const hasSplitSource = feeCommitmentsResult !== null || allocationsResult !== null;
  if (
    hasSplitSource
    && !arSourcesComplete
    && ["data", "partial"].includes(state)
    && arPartialSources.length === 0
  ) state = "loading";
  if (state === "partial" && arPartialSources.length > 0) {
    return emptyReceivablesModel({
      state,
      statusTab,
      searchQuery,
      requestedFeeCommitmentId,
      mutationResult,
      sourceCoverage,
      partialSources,
      partialReason: partialSources.includes("allocations")
        ? CLIENT_RECEIVABLE_PARTIAL_REASON
      : "일부 원천만 확인되어 미수금 합계를 계산하지 않았습니다.",
    });
  }
  if (
    !hasSplitSource
    && receivablesResult !== null
    && ["data", "partial"].includes(state)
    && !arSourcesComplete
  ) state = "error";
  const depositGapIsReadable = ["loading", "partial", "empty"].includes(sourceCoverage.deposits.state);
  if (arSourcesComplete && !depositSourceComplete && depositGapIsReadable && ["data", "partial", "loading"].includes(state)) state = "partial";
  if (!["data", "partial"].includes(state)) {
    return emptyReceivablesModel({
      state,
      statusTab,
      searchQuery,
      requestedFeeCommitmentId,
      mutationResult,
      sourceCoverage,
    });
  }

  const receivablePayload = payloadOf(receivablesResult) ?? {};
  const details = receivablePayload.details && typeof receivablePayload.details === "object" ? receivablePayload.details : {};
  const commitmentRows = sourceItems(feeCommitmentsResult, ["fee_commitments", "commitments", "items"])
    ?? (Array.isArray(details.fee_commitments) ? details.fee_commitments : []);
  const allocationRows = sourceItems(allocationsResult, ["allocations", "items"])
    ?? (Array.isArray(details.allocations) ? details.allocations : []);
  const depositRows = depositSourceComplete
    ? sourceItems(receivablesResult, ["deposits"])
      ?? (Array.isArray(details.deposits) ? details.deposits : [])
    : [];
  const canParseReceivablesRows = sourceCoverage.receivables.complete && depositSourceComplete;
  const sourceSummaries = canParseReceivablesRows && Array.isArray(receivablePayload.client_summaries)
    ? receivablePayload.client_summaries
    : canParseReceivablesRows && Array.isArray(receivablePayload.clientSummaries)
      ? receivablePayload.clientSummaries
      : [];
  let commitments;
  let allocations;
  let deposits;
  let clientNames = new Map();
  try {
    clientNames = sourceCoverage.clients.complete
      ? normalizeClientNameMap(clientsResult)
      : new Map();
    const rankingSource = canParseReceivablesRows && Array.isArray(receivablePayload.ranking)
      ? receivablePayload.ranking
      : [];
    assertUniqueRows(rankingSource, "clientGroupId", "client_group_id");
    for (const row of rankingSource) {
      const clientGroupId = requiredText(row, "clientGroupId", "client_group_id");
      const displayName = nullableText(valueOf(row, "displayName", "display_name"));
      if (displayName) clientNames.set(clientGroupId, displayName);
    }
    assertUniqueRows(commitmentRows, "feeCommitmentId", "fee_commitment_id");
    assertUniqueRows(allocationRows, "clientDepositAllocationId", "client_deposit_allocation_id");
    assertUniqueRows(depositRows, "bankTransactionId", "bank_transaction_id");
    assertUniqueRows(sourceSummaries, "clientGroupId", "client_group_id");
    commitments = commitmentRows.map((row) => normalizeFeeCommitmentRow(row, clientNames));
    allocations = allocationRows.map(normalizeAllocationRow);
    deposits = depositRows.map(normalizeDepositRow);
  } catch {
    return emptyReceivablesModel({
      state: "error",
      statusTab,
      searchQuery,
      requestedFeeCommitmentId,
      mutationResult,
      sourceCoverage,
    });
  }
  try {
    commitments = deriveCommitmentDetails(commitments, allocations);
    validateCrossReferences(commitments, allocations, deposits, { depositsComplete: depositSourceComplete });
    const rankingSource = canParseReceivablesRows && Array.isArray(receivablePayload.ranking)
      ? receivablePayload.ranking
      : [];
    const clientDueDates = new Map();
    if (rankingSource.length > 0) {
      assertUniqueRows(rankingSource, "clientGroupId", "client_group_id");
      for (const row of rankingSource) {
        const clientGroupId = requiredText(row, "clientGroupId", "client_group_id");
        const displayName = nullableText(valueOf(row, "displayName", "display_name"));
        if (displayName) clientNames.set(clientGroupId, displayName);
        const dueDate = dateOnly(
          valueOf(row, "earliestDueDate", "earliest_due_date") ?? null,
          "earliest_due_date",
        );
        if (dueDate) clientDueDates.set(clientGroupId, dueDate);
      }
    }
    const computedSummaries = deriveClientSummaries(
      commitments,
      deposits,
      clientNames,
      sourceSummaries,
      { depositsComplete: depositSourceComplete },
    );
    const clientSummaries = depositSourceComplete && canParseReceivablesRows && sourceSummaries.length > 0
      ? sourceSummaries.map((row) => normalizeClientSummary(row, clientNames, clientDueDates))
      : computedSummaries;
    if (depositSourceComplete && canParseReceivablesRows && sourceSummaries.length > 0 && !summariesMatchComputed(clientSummaries, computedSummaries)) throw new TypeError("고객별 미수금 합계가 상세 내역과 일치하지 않습니다");
    const summaryByClient = new Map(clientSummaries.map((row) => [row.clientGroupId, row]));
    const totalReceivables = clientSummaries.reduce(
      (sum, row) => addWholeKrw(sum, row.receivableAmount ?? 0, "total receivables"),
      0,
    );
    const unknownAmountCount = clientSummaries.reduce(
      (sum, row) => addCount(sum, row.unknownAmountCount, "unknown amount count"),
      0,
    );
    const totalOverpayment = depositSourceComplete
      ? deposits.reduce(
        (sum, row) => addWholeKrw(sum, row.overpaymentAmount, "total overpayment"),
        0,
      )
      : null;
    const suppliedTotal = valueOf(receivablePayload, "totalReceivables", "total_receivables");
    if (suppliedTotal !== undefined && wholeKrw(suppliedTotal, "total_receivables") !== totalReceivables) throw new TypeError("total_receivables does not reconcile");
    const suppliedOverpayment = valueOf(receivablePayload, "totalOverpayment", "total_overpayment");
    if (depositSourceComplete && suppliedOverpayment !== undefined && wholeKrw(suppliedOverpayment, "total_overpayment") !== totalOverpayment) throw new TypeError("total_overpayment does not reconcile");
    const unallocatedValue = valueOf(receivablePayload, "unallocatedAmount", "unallocated_amount");
    const unallocatedAmount = !depositSourceComplete
      ? null
      : unallocatedValue === undefined
        ? totalOverpayment
        : wholeKrw(unallocatedValue, "unallocated_amount");
    if (depositSourceComplete && unallocatedAmount !== totalOverpayment) throw new TypeError("unallocated_amount does not reconcile");
    const suppliedUnknownAmountCount = valueOf(
      receivablePayload,
      "unknownAmountCount",
      "unknown_amount_count",
    );
    if (suppliedUnknownAmountCount !== undefined && (
      !Number.isSafeInteger(suppliedUnknownAmountCount)
      || suppliedUnknownAmountCount !== unknownAmountCount
    )) throw new TypeError("unknown_amount_count does not reconcile");
    const computedRanking = expectedRankingRows(clientSummaries);
    const suppliedRanking = depositSourceComplete && canParseReceivablesRows
      ? normalizeRankingRows(receivablePayload.ranking, clientNames)
      : null;
    if (suppliedRanking && !rankingsMatch(suppliedRanking, computedRanking)) throw new TypeError("receivables ranking does not reconcile");
    const ranking = suppliedRanking ?? computedRanking;
    const activeStatusTab = normalizeStatusTab(statusTab);
    const normalizedSearchQuery = text(searchQuery);
    const normalizedSearch = searchValue(normalizedSearchQuery);
    const visibleCommitments = commitments.filter((commitment) => commitmentMatchesStatus(commitment, activeStatusTab, summaryByClient) && commitmentMatchesSearch(commitment, normalizedSearch));
    const authorizedFeeCommitmentIds = Object.freeze(visibleCommitments.map((item) => item.feeCommitmentId));
    const selectedFeeCommitmentId = resolveClientReceivableSelection(requestedFeeCommitmentId, authorizedFeeCommitmentIds);
    const selectedFeeCommitment = selectedFeeCommitmentId ? commitments.find((item) => item.feeCommitmentId === selectedFeeCommitmentId) ?? null : null;
    if (valueOf(receivablePayload, "invoiceRequired", "invoice_required") === true || valueOf(receivablePayload, "matterRequired", "matter_required") === true) throw new TypeError("Client receivables do not require an invoice or Matter");
    const parsedSourceNames = ["feeCommitments", "allocations"];
    if (canParseReceivablesRows) parsedSourceNames.push("receivables");
    if (depositSourceComplete) parsedSourceNames.push("deposits");
    if (sourceCoverage.clients.complete) parsedSourceNames.push("clients");
    return Object.freeze({
      state,
      stateLabel: CLIENT_RECEIVABLE_STATE_LABELS[state],
      statusTabs: CLIENT_RECEIVABLE_STATUS_TABS,
      activeStatusTab,
      searchQuery: normalizedSearchQuery,
      commitments: Object.freeze(commitments),
      visibleCommitments: Object.freeze(visibleCommitments),
      allocations: Object.freeze(allocations),
      deposits: Object.freeze(deposits),
      clientSummaries: Object.freeze(clientSummaries),
      ranking: Object.freeze(ranking),
      totalReceivables,
      unknownAmountCount,
      totalOverpayment,
      unallocatedAmount,
      authorizedFeeCommitmentIds,
      selectedFeeCommitmentId,
      selectedFeeCommitment,
      requestedFeeCommitmentAvailable: nullableText(requestedFeeCommitmentId) ? Boolean(selectedFeeCommitmentId) : null,
      mutation: mutationResult ? normalizeFeeCommitmentMutationResult(mutationResult) : null,
      invoiceRequired: false,
      matterRequired: false,
      sourceCoverage: sanitizeSourceCoverage(sourceCoverage, { keepCompleteCounts: true, parsedSources: parsedSourceNames }),
      partialSources: state === "partial" ? partialSources : Object.freeze([]),
      partialReason: state !== "partial"
        ? null
        : partialSources.includes("deposits") && arSourcesComplete
          ? "은행 입금 일부만 확인되어 초과 입금과 미배분 금액을 계산하지 않았습니다."
          : partialSources.includes("allocations")
            ? CLIENT_RECEIVABLE_PARTIAL_REASON
            : "일부 원천만 확인되어 미수금 합계를 계산하지 않았습니다.",
    });
  } catch {
    return emptyReceivablesModel({
      state: "error",
      statusTab,
      searchQuery,
      requestedFeeCommitmentId,
      mutationResult,
      sourceCoverage,
    });
  }
}

export {
  ALLOCATION_SOURCE_LABELS,
  CLIENT_RECEIVABLE_STATE_LABELS,
  CLIENT_RECEIVABLE_STATUS_TABS,
  FEE_COMMITMENT_AMOUNT_LABELS,
  FEE_COMMITMENT_STATUS_LABELS,
};
