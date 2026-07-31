/**
 * Client "입금 매출 내역" boundary model.
 *
 * Finance is the write authority.  This module only consumes the fields that
 * the current web adapter exposes, builds the exact finance-runtime-context
 * request envelopes, and refuses to call a write successful until the
 * response is bound to the selected transaction/version and idempotency
 * outcome.  Capabilities that do not have a web adapter yet are represented
 * as unavailable instead of being presented as working UI.
 */

const SOURCE_TYPES = new Set(["xlsx", "pdf"]);
const DIRECTIONS = new Set(["inflow", "outflow"]);
const CATEGORIES = new Set([
  "client_receipt", "refund_reversal", "salary_payment", "tax",
  "social_insurance", "card_settlement", "professional_services",
  "rent_office", "finance_lease", "case_disbursement", "bank_postage_fee",
  "general_operating", "related_party_transfer", "vehicle_financing",
  "security_deposit", "interest_income", "other_inflow", "zero_amount_source",
]);
const PREVIEW_STATUSES = new Set(["new", "duplicate", "error"]);
const PREVIEW_ID_PATTERN = /^bank_import_preview_[a-f0-9]{24}$/u;
const CLASSIFICATION_SOURCES = new Set(["automatic", "saved_rule", "manual_review"]);
const CONFIDENCE_VALUES = new Set(["high", "medium", "low", "needs_review", "reviewed"]);
const STATUS_VALUES = new Set(["confirmed", "review_required", "unreviewed"]);
const SUCCESS_OUTCOMES = new Set(["classified", "created", "imported"]);
const CLASSIFICATION_SUCCESS_OUTCOMES = new Set(["classified"]);
const ACTION_TYPES = Object.freeze(["auto", "manualLink", "manualUnlink", "rememberAlias", "refundLink"]);
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{7,127}$/u;
const MATCH_FIELDS = new Set(["counterparty", "memo"]);

export const CLIENT_DEPOSIT_STATUS_COPY = Object.freeze({
  loading: Object.freeze({ label: "불러오는 중입니다", description: "은행 입금 내역을 확인하고 있습니다." }),
  data: Object.freeze({ label: "입금 내역", description: "은행 입금 기준으로 매출을 집계합니다." }),
  empty: Object.freeze({ label: "표시할 입금 내역이 없습니다", description: "선택한 기간이나 계좌에 입금 내역이 없습니다." }),
  denied: Object.freeze({ label: "입금 내역을 볼 권한이 없습니다", description: "금액과 거래 건수를 표시하지 않습니다." }),
  review_required: Object.freeze({ label: "확인이 필요한 입금이 있습니다", description: "담당자가 연결 또는 가져오기를 확인한 뒤 반영합니다." }),
  partial: Object.freeze({ label: "일부 입금만 불러왔습니다", description: "불러오지 못한 원천은 0원으로 처리하지 않고 따로 표시합니다." }),
  unavailable: Object.freeze({ label: "아직 연결되지 않은 기능입니다", description: "현재 화면에서 사용할 수 있는 연결 경로가 없습니다." }),
  blocked: Object.freeze({ label: "확인 전에는 표시할 수 없습니다", description: "권한과 원본 경계를 확인할 수 없어 금액을 숨겼습니다." }),
  error: Object.freeze({ label: "입금 내역을 불러오지 못했습니다", description: "연결 상태를 확인한 뒤 다시 시도하세요." }),
  conflict: Object.freeze({ label: "변경 내용이 겹쳤습니다", description: "최신 내역을 다시 불러온 뒤 확인을 이어가세요." }),
});

export const CLIENT_DEPOSIT_LINK_COPY = Object.freeze({
  auto_exact: "자동 연결 · 고객명 일치",
  auto_alias: "자동 연결 · 저장된 입금자명",
  manual: "수동 연결 완료",
  refund: "환불 연결",
  needs_review: "연결 확인 필요",
  not_linked: "고객 미연결",
  other: "매출 아님",
});

export const CLIENT_DEPOSIT_ROW_STATUS_COPY = Object.freeze({
  confirmed: "반영됨",
  review_required: "확인 필요",
  unreviewed: "검토 전",
});

export const CLIENT_DEPOSIT_IMPORT_PHASE_COPY = Object.freeze({
  idle: "파일을 선택하세요",
  preview: "미리보기 확인 필요",
  confirmed: "가져오기 완료",
  replayed: "이미 가져온 파일입니다",
  duplicate: "새 거래가 없어 건너뜀",
  review_required: "승인 후 가져올 수 있습니다",
  unavailable: "가져오기 연결 준비 중",
  blocked: "확인 전에는 가져올 수 없습니다",
  conflict: "파일이나 요청 키가 바뀌었습니다",
  error: "파일을 가져오지 못했습니다",
});

/** Web adapter capabilities used by the Client deposit operations surface. */
export const CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS = Object.freeze({
  bankImportPreviewAdapter: Object.freeze({
    id: "client-bank-import-preview-adapter",
    capability: "bank-import-preview",
    endpoint: "POST /api/finance/bank-imports/preview",
    status: "available",
    requirement: "apiClient의 파일 검증·미리보기 adapter를 사용합니다",
  }),
  bankImportConfirmAdapter: Object.freeze({
    id: "client-bank-import-confirm-adapter",
    capability: "bank-import-confirm",
    endpoint: "POST /api/finance/bank-imports",
    status: "available",
    requirement: "preview token과 검증된 원본 파일을 전달하는 확정 adapter를 사용합니다",
  }),
  classificationWriteBinding: Object.freeze({
    id: "client-bank-classification-write-binding",
    capability: "bank-classification-write-binding",
    endpoints: Object.freeze([
      "POST /api/finance/bank-classifications/auto",
      "POST /api/finance/bank-classifications/review",
    ]),
    status: "available",
    requirement: "선택 거래 ID·expected/new version·멱등 영수증 결속 adapter를 사용합니다",
  }),
  sourceDetailAdapter: Object.freeze({
    id: "client-bank-source-detail-adapter",
    capability: "bank-source-detail",
    endpoint: "GET /api/finance/client-deposits/:bank_transaction_id",
    status: "available",
    requirement: "권한 확인된 거래 상세 endpoint와 안전 필드 adapter를 사용합니다",
  }),
});

const CATEGORY_COPY = Object.freeze({
  client_receipt: "고객 매출", refund_reversal: "취소·환급", salary_payment: "급여 지급",
  other_inflow: "기타 입금", zero_amount_source: "0원 원천기록",
});

function own(value, key) {
  return value !== null && typeof value === "object"
    && Object.prototype.hasOwnProperty.call(value, key);
}

function text(value) { return typeof value === "string" ? value.trim() : ""; }
function nullableText(value) { const normalized = text(value); return normalized || null; }
function int(value, minimum = null) {
  return Number.isSafeInteger(value) && (minimum === null || value >= minimum) ? value : null;
}
function amount(value) { return int(value, 0); }
function hash(value) { return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value.trim()); }
function instant(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function read(value, camel, snake) {
  if (own(value, camel)) return value[camel];
  if (own(value, snake)) return value[snake];
  return undefined;
}

function validKey(value) { return typeof value === "string" && IDEMPOTENCY_PATTERN.test(value.trim()); }
function freeze(value) { return Object.freeze(value); }

function matchMethod(item) {
  const method = text(item?.match_method);
  const rationale = text(item?.rationale_code);
  if (method && rationale && method !== rationale) return null;
  return method || rationale;
}

function stateOf(result) {
  if (result === null || result === undefined) return "loading";
  const uiState = text(read(result, "uiState", "ui_state"));
  const outcome = text(result.outcome);
  if (["unavailable", "adapter_missing"].includes(uiState) || result.kind === "unavailable") return "unavailable";
  if (["blocked", "permission_blocked"].includes(uiState) || result.kind === "blocked") return "blocked";
  if (result.kind === "conflict" || uiState === "conflict" || outcome === "conflict") return "conflict";
  if (result.kind === "error" || uiState === "error" || outcome === "error") return "error";
  if (result.kind === "empty" || uiState === "empty" || ["empty", "no_data"].includes(outcome)) return "empty";
  if (["denied", "permission_denied"].includes(uiState) || ["denied", "permission_denied"].includes(outcome)) return "denied";
  if (["review", "review_required"].includes(uiState) || outcome === "review_required") return "review_required";
  if (uiState === "partial" || outcome === "partial") return "partial";
  return result.kind === "data" ? "data" : "error";
}

/**
 * Current fetchFinanceCollection exposes countLeakPrevented and strips raw
 * source payload.  Do not require permission_prefilter_applied/raw proof
 * fields that the adapter cannot provide.  If a caller explicitly supplies a
 * contradictory proof or row, fail the complete result rather than filtering
 * it silently.
 */
function adapterBoundary(result) {
  if (read(result, "countLeakPrevented", "count_leak_prevented") !== true) return "blocked";
  const raw = read(result, "rawSourcePayloadIncluded", "raw_source_payload_included");
  if (raw === true) return "error";
  const permission = read(result, "permissionPrefilterApplied", "permission_prefilter_applied");
  if (permission === false) return "error";
  return "ok";
}

function emptyPublic(state, integrationRequirement = null) {
  return freeze({ state, items: freeze([]), counts: null, integrationRequirement });
}

function validPreviewItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  if (item.raw_source_payload_included === true || item.source_metadata_included === true
      || item.transaction_fingerprint_included === true || item.credential_material_included === true) return false;
  const status = text(item.status);
  return PREVIEW_STATUSES.has(status)
    && Boolean(text(item.bank_transaction_id ?? item.transaction_id))
    && (status === "error" || (DIRECTIONS.has(text(item.direction))
      && amount(item.amount) !== null && text(item.currency) === "KRW"));
}

function normalizedPreviewItem(item) {
  const status = text(item.status);
  return freeze({
    transactionId: text(item.bank_transaction_id ?? item.transaction_id),
    rowNumber: int(item.row_number, 1),
    status,
    statusLabel: status === "new" ? "새 거래" : status === "duplicate" ? "중복 건너뜀" : "오류",
    direction: DIRECTIONS.has(text(item.direction)) ? text(item.direction) : null,
    amount: amount(item.amount),
    currency: text(item.currency) || null,
    date: nullableText(item.date ?? item.transaction_date),
    occurredAt: instant(item.occurred_at) ? item.occurred_at : null,
    balanceAfter: amount(item.balance_after),
    sourceType: SOURCE_TYPES.has(text(item.source_type)) ? text(item.source_type) : null,
    errorCode: nullableText(item.safe_error_code ?? item.error_code),
  });
}

function previewContract(result) {
  const state = stateOf(result);
  if (state === "loading") return { state, public: emptyPublic(state), contract: null };
  // Only the validated preview adapter envelope may cross into the model.
  if (state === "data" && result?.adapter_capability !== "finance-bank-import-preview-v1") {
    return {
      state: "unavailable",
      public: emptyPublic("unavailable", CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS.bankImportPreviewAdapter),
      contract: null,
    };
  }
  if (!["data", "partial"].includes(state)) return { state, public: emptyPublic(state), contract: null };
  const boundary = adapterBoundary(result);
  if (boundary !== "ok") {
    const boundaryState = boundary === "blocked" ? "blocked" : "error";
    return { state: boundaryState, public: emptyPublic(boundaryState), contract: null };
  }
  const preview = result.preview;
  const counts = preview?.counts;
  const items = preview?.items;
  if (!preview || typeof preview !== "object" || Array.isArray(preview) || !counts || !Array.isArray(items)) {
    return { state: "error", public: emptyPublic("error"), contract: null };
  }
  const normalizedCounts = {
    total: int(counts.total, 0), new: int(counts.new, 0), duplicate: int(counts.duplicate, 0), error: int(counts.error, 0),
  };
  const ids = new Set();
  const countMatches = Object.values(normalizedCounts).every((value) => value !== null)
    && normalizedCounts.new + normalizedCounts.duplicate + normalizedCounts.error === normalizedCounts.total
    && items.length === normalizedCounts.total;
  const validItems = items.every(validPreviewItem);
  for (const item of items) {
    const id = text(item.bank_transaction_id ?? item.transaction_id);
    if (ids.has(id)) return { state: "error", public: emptyPublic("error"), contract: null };
    ids.add(id);
  }
  const token = text(preview.preview_confirmation_token);
  const previewId = text(preview.preview_id);
  const valid = PREVIEW_ID_PATTERN.test(previewId) && countMatches && validItems && ids.size === items.length
    && items.filter((item) => item.status === "new").length === normalizedCounts.new
    && items.filter((item) => item.status === "duplicate").length === normalizedCounts.duplicate
    && items.filter((item) => item.status === "error").length === normalizedCounts.error
    && hash(preview.source_file_sha256) && hash(preview.preview_manifest_sha256)
    && SOURCE_TYPES.has(text(preview.source_type)) && Boolean(text(preview.account_ref))
    && preview.confirmation_token_included === true && token !== ""
    && instant(preview.confirmation_expires_at) && preview.product_records_mutated === false
    && preview.raw_source_payload_included === false;
  if (!valid) return { state: "error", public: emptyPublic("error"), contract: null };
  const normalizedItems = freeze(items.map(normalizedPreviewItem));
  const publicModel = freeze({
    state, previewId, sourceType: text(preview.source_type), accountRef: preview.account_ref,
    sourceFileSha256: preview.source_file_sha256, sourceManifestSha256: preview.preview_manifest_sha256,
    confirmationTokenIncluded: true, confirmationExpiresAt: preview.confirmation_expires_at,
    counts: freeze(normalizedCounts), items: normalizedItems,
    duplicateFile: normalizedCounts.total > 0 && normalizedCounts.new === 0 && normalizedCounts.error === 0,
    productRecordsMutated: false, rawSourcePayloadIncluded: false,
    canConfirm: state === "data" && normalizedCounts.new > 0,
  });
  return { state, public: publicModel, contract: freeze({ ...publicModel, confirmationToken: token }) };
}

function classificationKind(item) {
  const category = text(item.category);
  const status = text(item.status);
  const source = text(item.classification_source);
  const rationale = matchMethod(item);
  const confidence = text(item.confidence);
  const clientId = text(item.client_group_id);
  const manual = item.manual_lock === true;
  if (status !== "confirmed") return "needs_review";
  if (category === "client_receipt" && clientId && source === "automatic" && rationale === "client_exact" && confidence === "high" && !manual) return "auto_exact";
  if (category === "client_receipt" && clientId && source === "saved_rule" && rationale === "client_saved_alias" && confidence === "high" && !manual) return "auto_alias";
  if (category === "client_receipt" && clientId && source === "manual_review"
      && ["manual_client_linked", "manual_client_relinked"].includes(rationale)
      && confidence === "reviewed" && manual) return "manual";
  if (category === "refund_reversal" && clientId && text(item.refund_of_bank_transaction_id)
      && source === "manual_review" && rationale === "manual_refund_linked" && confidence === "reviewed" && manual) return "refund";
  if (category === "client_receipt" || category === "refund_reversal") return "invalid";
  return "other";
}

function validClassification(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  if (item.raw_source_payload_included === true || item.source_metadata_included === true || item.credential_material_included === true) return false;
  const category = text(item.category);
  const direction = text(item.transaction_direction ?? item.direction);
  const rationale = matchMethod(item);
  const status = text(item.status);
  const confidence = text(item.confidence);
  const transactionId = text(item.bank_transaction_id ?? item.transaction_id);
  const classificationId = text(item.bank_transaction_classification_id ?? item.classification_id);
  const tenantId = text(item.tenant_id);
  if (!tenantId || !transactionId || !classificationId
      || !CATEGORIES.has(category) || !DIRECTIONS.has(direction) || amount(item.amount) === null
      || text(item.currency) !== "KRW" || !STATUS_VALUES.has(status)
      || !CLASSIFICATION_SOURCES.has(text(item.classification_source))
      || !CONFIDENCE_VALUES.has(confidence) || !Number.isSafeInteger(item.state_version) || item.state_version < 1) return false;
  if (rationale === null) return false;
  if (item.manual_lock !== undefined && typeof item.manual_lock !== "boolean") return false;
  if (category === "client_receipt" && direction !== "inflow") return false;
  if (category === "refund_reversal" && direction !== "outflow") return false;
  if (["client_partial_name", "client_name_ambiguous", "no_registered_client_match"].includes(rationale)
      && confidence === "high") return false;
  return classificationKind(item) !== "invalid";
}

function normalizedRow(item) {
  const kind = classificationKind(item);
  const safeLink = ["auto_exact", "auto_alias", "manual", "refund"].includes(kind);
  return freeze({
    tenantId: text(item.tenant_id),
    transactionId: text(item.bank_transaction_id ?? item.transaction_id),
    classificationId: text(item.bank_transaction_classification_id ?? item.classification_id),
    occurredAt: instant(item.occurred_at) ? item.occurred_at : null,
    date: nullableText(item.transaction_date ?? item.date),
    direction: text(item.transaction_direction ?? item.direction), amount: amount(item.amount), currency: text(item.currency) || "KRW",
    category: text(item.category), categoryLabel: nullableText(item.category_label) ?? CATEGORY_COPY[text(item.category)] ?? "분류 확인 필요",
    status: text(item.status), statusLabel: CLIENT_DEPOSIT_ROW_STATUS_COPY[text(item.status)] ?? "상태 확인 필요",
    confidence: text(item.confidence), linkKind: kind,
    linkLabel: CLIENT_DEPOSIT_LINK_COPY[kind] ?? CLIENT_DEPOSIT_LINK_COPY.needs_review,
    clientGroupId: safeLink ? nullableText(item.client_group_id) : null,
    clientDisplayName: safeLink ? nullableText(item.client_group_label ?? item.display_name) : null,
    refundOfTransactionId: kind === "refund" ? nullableText(item.refund_of_bank_transaction_id) : null,
    manualLock: item.manual_lock === true,
    stateVersion: item.state_version,
    expectedVersion: item.state_version,
    requiresExpectedVersion: true,
    invoiceRequired: false,
    matterRequired: false,
  });
}

function classificationContract(result) {
  const state = stateOf(result);
  if (state === "loading") return { state, rows: freeze([]), ids: freeze([]), integrationRequirement: null };
  if (state !== "data" && state !== "partial") return { state, rows: freeze([]), ids: freeze([]), integrationRequirement: null };
  const boundary = adapterBoundary(result);
  if (boundary !== "ok") {
    const blockedState = boundary === "blocked" ? "blocked" : "error";
    return { state: blockedState, rows: freeze([]), ids: freeze([]), integrationRequirement: null };
  }
  if (!Array.isArray(result.items)) return { state: "error", rows: freeze([]), ids: freeze([]), integrationRequirement: null };
  const rows = [];
  const ids = new Set();
  for (const item of result.items) {
    // A trimmed adapter must never return an unauthorized row.  Do not drop
    // it and continue: that would make the displayed count untrustworthy.
    if (item?.authorized === false || item?.permission_allowed === false || item?.permissionAllowed === false) {
      return { state: "error", rows: freeze([]), ids: freeze([]), integrationRequirement: null };
    }
    const id = text(item?.bank_transaction_id ?? item?.transaction_id);
    if (!validClassification(item) || !id || ids.has(id)) return { state: "error", rows: freeze([]), ids: freeze([]), integrationRequirement: null };
    ids.add(id); rows.push(normalizedRow(item));
  }
  return { state, rows: freeze(rows), ids: freeze([...ids]), integrationRequirement: null };
}

function routeContext(request = {}) {
  const context = request.routeContext ?? request;
  return {
    tenant_id: text(context.tenant_id ?? context.tenantId),
    permission_ref: text(context.permission_ref ?? context.permissionRef),
    audit_hint_ref: text(context.audit_hint_ref ?? context.auditHintRef),
  };
}

function validRouteContext(context) {
  return Boolean(context.tenant_id && context.permission_ref && context.audit_hint_ref);
}

function sourceFileForCommand(request = {}) {
  const file = request.file ?? request.sourceFile;
  if (!file || typeof file !== "object" || Array.isArray(file)) return null;
  const filename = text(file.filename ?? file.fileName);
  const mimeType = text(file.mime_type ?? file.mimeType).toLowerCase();
  const content = text(file.content_base64 ?? file.contentBase64);
  const byteSize = int(file.byte_size ?? file.byteSize, 0);
  if (!filename || !mimeType || !content || byteSize === null || content.length % 4 !== 0
      || !/^[A-Za-z0-9+/]*={0,2}$/u.test(content)) return null;
  return freeze({ filename, mime_type: mimeType, byte_size: byteSize, content_base64: content });
}

/** Build the exact POST /api/finance/bank-imports body. */
export function buildClientDepositBankImportCommand({ preview, request } = {}) {
  if (!preview || typeof preview !== "object" || !PREVIEW_ID_PATTERN.test(text(preview.previewId)) || !text(preview.confirmationToken)
      || !hash(preview.sourceFileSha256) || !hash(preview.sourceManifestSha256)
      || !SOURCE_TYPES.has(text(preview.sourceType)) || !text(preview.accountRef)
      || !validKey(request?.idempotencyKey)) return null;
  const context = routeContext(request);
  const file = sourceFileForCommand(request);
  if (!validRouteContext(context) || !file || text(request.accountRef ?? preview.accountRef) !== preview.accountRef
      || text(request.sourceFileSha256) !== preview.sourceFileSha256
      || text(request.previewManifestSha256) !== preview.sourceManifestSha256
      || (preview.sourceType === "xlsx"
        && (!file.filename.toLowerCase().endsWith(".xlsx")
          || !["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"].includes(file.mime_type)))
      || (preview.sourceType === "pdf"
        && (!file.filename.toLowerCase().endsWith(".pdf") || file.mime_type !== "application/pdf"))) return null;
  return freeze({
    tenant_id: context.tenant_id,
    permission_ref: context.permission_ref,
    audit_hint_ref: context.audit_hint_ref,
    account_ref: preview.accountRef,
    file,
    production_import_approved: true,
    preview_confirmation_token: preview.confirmationToken,
    idempotency_key: text(request.idempotencyKey),
  });
}

function refundOriginCandidate(selected, originalId, visibleRows, authorizedClientGroupIds) {
  const origin = Array.isArray(visibleRows)
    ? visibleRows.find((row) => row?.transactionId === originalId) ?? null
    : null;
  if (!origin || origin.transactionId === selected?.transactionId
      || origin.tenantId !== selected?.tenantId
      || origin.direction !== "inflow"
      || origin.status !== "confirmed"
      || origin.category !== "client_receipt"
      || origin.linkKind === "refund"
      || origin.amount <= 0
      || origin.currency !== selected?.currency
      || !origin.clientGroupId
      || !authorizedClientGroupIds.includes(origin.clientGroupId)) return null;
  if (selected.clientGroupId && selected.clientGroupId !== origin.clientGroupId) return null;
  return origin;
}

function actionDecision(type, selected, request, authorizedTransactionIds, authorizedClientGroupIds, visibleRows) {
  if (!selected || !authorizedTransactionIds.includes(selected.transactionId)) return null;
  if (!selected.tenantId || !selected.classificationId
      || !Number.isSafeInteger(selected.stateVersion) || selected.stateVersion < 1) return null;
  const transactionId = text(request?.transactionId);
  if (transactionId !== selected.transactionId || request?.expectedVersion !== selected.stateVersion || !validKey(request?.idempotencyKey)) return null;
  const reason = text(request.reason);
  if (type !== "auto" && !reason) return null;
  if (type === "auto") {
    return freeze({
      bank_transaction_id: selected.transactionId,
      expected_state_version: selected.stateVersion,
    });
  }
  if (type === "manualLink" || type === "rememberAlias") {
    const clientGroupId = text(request.clientGroupId);
    if (selected.direction !== "inflow" || !clientGroupId || !authorizedClientGroupIds.includes(clientGroupId)) return null;
    const decision = {
      bank_transaction_id: selected.transactionId,
      category: "client_receipt",
      client_group_id: clientGroupId,
      expected_state_version: selected.stateVersion,
    };
    if (type === "rememberAlias") {
      const matchField = text(request.matchField) || "counterparty";
      if (!MATCH_FIELDS.has(matchField)) return null;
      decision.remember_match = true;
      decision.match_field = matchField;
    }
    return freeze(decision);
  }
  if (type === "manualUnlink") {
    if (selected.direction !== "inflow") return null;
    return freeze({
      bank_transaction_id: selected.transactionId,
      category: "other_inflow",
      expected_state_version: selected.stateVersion,
    });
  }
  if (type === "refundLink") {
    if (selected.direction !== "outflow") return null;
    const originalId = text(request.refundOfTransactionId);
    const origin = refundOriginCandidate(selected, originalId, visibleRows, authorizedClientGroupIds);
    if (!origin || !authorizedTransactionIds.includes(origin.transactionId)) return null;
    return freeze({
      bank_transaction_id: selected.transactionId,
      category: "refund_reversal",
      refund_of_bank_transaction_id: originalId,
      expected_state_version: selected.stateVersion,
    });
  }
  return null;
}

/** Build the exact POST /api/finance/bank-classifications/auto body. */
export function buildClientDepositClassificationAutoCommand({ request } = {}) {
  const context = routeContext(request);
  const transactionId = text(request?.transactionId);
  const expectedVersion = request?.expectedVersion;
  if (!validRouteContext(context) || !validKey(request?.idempotencyKey)
      || !transactionId || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return null;
  return freeze({
    tenant_id: context.tenant_id,
    permission_ref: context.permission_ref,
    audit_hint_ref: context.audit_hint_ref,
    idempotency_key: text(request.idempotencyKey),
    bank_transaction_id: transactionId,
    expected_state_version: expectedVersion,
  });
}

/** Build the exact POST /api/finance/bank-classifications/review body. */
export function buildClientDepositClassificationReviewCommand({
  type,
  request,
  selected,
  authorizedTransactionIds = [],
  authorizedClientGroupIds = [],
  visibleRows = [],
} = {}) {
  if (!["manualLink", "manualUnlink", "rememberAlias", "refundLink"].includes(type)) return null;
  const context = routeContext(request);
  if (!validRouteContext(context) || !selected?.tenantId || context.tenant_id !== selected.tenantId
      || !validKey(request?.idempotencyKey)) return null;
  const decision = actionDecision(
    type,
    selected,
    request,
    authorizedTransactionIds,
    authorizedClientGroupIds,
    visibleRows,
  );
  if (!decision) return null;
  return freeze({
    tenant_id: context.tenant_id,
    permission_ref: context.permission_ref,
    audit_hint_ref: context.audit_hint_ref,
    idempotency_key: text(request.idempotencyKey),
    decisions: freeze([decision]),
  });
}

function commandBinding(type, request, selected, decision, refundOrigin = null) {
  const context = routeContext(request);
  const binding = {
    tenant_id: context.tenant_id,
    selected_transaction_id: selected.transactionId,
    selected_classification_id: selected.classificationId,
    expected_state_version: selected.stateVersion,
    action: type,
  };
  if (type === "auto") {
    if (selected.status === "confirmed") {
      binding.expected_category = selected.category;
      binding.expected_status = selected.status;
    }
    if (selected.clientGroupId) binding.expected_client_group_id = selected.clientGroupId;
    if (selected.refundOfTransactionId) {
      binding.expected_refund_of_bank_transaction_id = selected.refundOfTransactionId;
    }
  } else if (["manualLink", "rememberAlias"].includes(type)) {
    binding.expected_category = "client_receipt";
    binding.expected_status = "confirmed";
    binding.expected_client_group_id = text(decision.client_group_id);
    binding.expected_refund_of_bank_transaction_id = null;
  } else if (type === "manualUnlink") {
    binding.expected_category = "other_inflow";
    binding.expected_status = "confirmed";
    binding.expected_client_group_id = null;
    binding.expected_refund_of_bank_transaction_id = null;
  } else if (type === "refundLink") {
    binding.expected_category = "refund_reversal";
    binding.expected_status = "confirmed";
    binding.expected_client_group_id = refundOrigin?.clientGroupId ?? null;
    binding.expected_refund_of_bank_transaction_id = decision.refund_of_bank_transaction_id;
  }
  return freeze(binding);
}

function publicActionCommand(type, request, selected, authorizedTransactionIds, authorizedClientGroupIds, visibleRows) {
  if (!request || !selected) return null;
  const context = routeContext(request);
  if (!validRouteContext(context) || context.tenant_id !== selected.tenantId) return null;
  if (type === "auto") {
    if (!authorizedTransactionIds.includes(selected.transactionId)
        || text(request.transactionId) !== selected.transactionId
        || request.expectedVersion !== selected.stateVersion) return null;
    const command = buildClientDepositClassificationAutoCommand({ request });
    return command ? freeze({
      routePayload: command,
      binding: commandBinding(type, request, selected, { bank_transaction_id: selected.transactionId }),
    }) : null;
  }
  const command = buildClientDepositClassificationReviewCommand({
    type,
    request,
    selected,
    authorizedTransactionIds,
    authorizedClientGroupIds,
    visibleRows,
  });
  const decision = command?.decisions?.[0];
  const refundOrigin = type === "refundLink" && decision
    ? visibleRows.find((row) => row.transactionId === decision.refund_of_bank_transaction_id) ?? null
    : null;
  return command ? freeze({
    routePayload: command,
    binding: commandBinding(type, request, selected, decision, refundOrigin),
  }) : null;
}

function affectedResult(result, preparedBinding) {
  const item = result?.item;
  const itemReceipt = item?.command_receipt ?? item?.commandReceipt;
  const receiptsValue = result?.command_receipts ?? result?.commandReceipts;
  const receipts = Array.isArray(receiptsValue) ? receiptsValue : [];
  const receipt = itemReceipt;
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt) || receipts.length !== 1
      || JSON.stringify(itemReceipt) !== JSON.stringify(receipts[0])) return null;
  const topRawSourceIncluded = result.raw_source_payload_included ?? result.rawSourcePayloadIncluded;
  const topProductionReadyClaim = result.production_ready_claim ?? result.productionReadyClaim;
  if (topRawSourceIncluded !== false || topProductionReadyClaim !== false) return null;
  const rawSourceIncluded = receipt.raw_source_payload_included ?? receipt.rawSourcePayloadIncluded;
  const productionReadyClaim = receipt.production_ready_claim ?? receipt.productionReadyClaim;
  if (rawSourceIncluded !== false || productionReadyClaim !== false) return null;
  const transactionId = text(receipt.bank_transaction_id ?? receipt.bankTransactionId ?? receipt.transaction_id);
  const expected = int(preparedBinding?.expected_state_version, 0);
  const next = int(receipt.state_version ?? receipt.stateVersion, 1);
  const key = text(receipt.idempotency_key ?? receipt.idempotencyKey ?? result.idempotency_key ?? result.idempotencyKey);
  const topLevelKey = text(result.idempotency_key ?? result.idempotencyKey);
  const fingerprint = text(receipt.request_fingerprint ?? receipt.requestFingerprint ?? result.request_fingerprint ?? result.requestFingerprint);
  const topLevelFingerprint = text(result.request_fingerprint ?? result.requestFingerprint);
  const classificationId = text(receipt.bank_transaction_classification_id ?? receipt.bankTransactionClassificationId);
  const receiptCategory = text(receipt.category);
  const receiptStatus = text(receipt.status);
  const receiptClientGroupId = nullableText(receipt.client_group_id ?? receipt.clientGroupId);
  const receiptRefundOriginId = nullableText(
    receipt.refund_of_bank_transaction_id ?? receipt.refundOfBankTransactionId,
  );
  const hasClientGroupField = own(receipt, "client_group_id") || own(receipt, "clientGroupId");
  const hasRefundOriginField = own(receipt, "refund_of_bank_transaction_id")
    || own(receipt, "refundOfBankTransactionId");
  const resultTenant = text(
    result.tenant_id ?? result.tenantId ?? receipt.tenant_id ?? receipt.tenantId,
  );
  const expectedCategory = own(preparedBinding, "expected_category")
    ? text(preparedBinding.expected_category)
    : receiptCategory;
  const expectedStatus = own(preparedBinding, "expected_status")
    ? text(preparedBinding.expected_status)
    : receiptStatus;
  const expectedClientGroupId = own(preparedBinding, "expected_client_group_id")
    ? nullableText(preparedBinding.expected_client_group_id)
    : receiptClientGroupId;
  const expectedRefundOriginId = own(preparedBinding, "expected_refund_of_bank_transaction_id")
    ? nullableText(preparedBinding.expected_refund_of_bank_transaction_id)
    : receiptRefundOriginId;
  if (!transactionId || !classificationId || !receiptCategory || !receiptStatus
      || !hasClientGroupField || !hasRefundOriginField
      || expected === null || next === null || !key || !hash(fingerprint)
      || !preparedBinding?.tenant_id
      || (resultTenant && resultTenant !== preparedBinding.tenant_id)
      || transactionId !== preparedBinding.selected_transaction_id
      || classificationId !== preparedBinding.selected_classification_id
      || receiptCategory !== expectedCategory
      || receiptStatus !== expectedStatus
      || receiptClientGroupId !== expectedClientGroupId
      || receiptRefundOriginId !== expectedRefundOriginId
      || (topLevelKey && topLevelKey !== key)
      || (topLevelFingerprint && topLevelFingerprint !== fingerprint)) return null;
  return freeze({
    transactionId,
    expectedVersion: expected,
    newVersion: next,
    idempotencyKey: key,
    classificationId,
    category: receiptCategory,
    status: receiptStatus,
    clientGroupId: receiptClientGroupId,
    refundOfTransactionId: receiptRefundOriginId,
    tenantId: preparedBinding.tenant_id,
    requestFingerprint: fingerprint,
  });
}

function normalizeAction(type, request, result, selected, authorizedTransactionIds, authorizedClientGroupIds, visibleRows) {
  const prepared = publicActionCommand(
    type,
    request,
    selected,
    authorizedTransactionIds,
    authorizedClientGroupIds,
    visibleRows,
  );
  const command = prepared?.routePayload ?? null;
  const preparedBinding = prepared?.binding ?? null;
  if (request && !prepared) return freeze({ state: "error", command: null, binding: null, response: null, integrationRequirement: null });
  if (!request && result) return freeze({ state: "error", command: null, binding: null, response: null, integrationRequirement: null });
  if (!result) return freeze({ state: "ready", command, binding: preparedBinding, response: null, integrationRequirement: null });
  const state = stateOf(result);
  if (state !== "data") return freeze({ state, command, binding: preparedBinding, response: null, integrationRequirement: null });
  const outcome = text(result.outcome);
  const replay = result.idempotentReplay ?? result.idempotent_replay;
  if (![...CLASSIFICATION_SUCCESS_OUTCOMES, "idempotent_replay"].includes(outcome)
      || replay !== (outcome === "idempotent_replay")) {
    return freeze({ state: "conflict", command, binding: preparedBinding, response: null, integrationRequirement: null });
  }
  const binding = affectedResult(result, preparedBinding);
  if (!binding || !selected || binding.transactionId !== selected.transactionId
      || binding.expectedVersion !== selected.stateVersion || binding.newVersion < binding.expectedVersion
      || binding.idempotencyKey !== text(request?.idempotencyKey)) {
    return freeze({ state: "blocked", command, binding: prepared?.binding ?? null, response: null, integrationRequirement: CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS.classificationWriteBinding });
  }
  return freeze({
    state: "data", command, binding: prepared?.binding ?? null,
    response: freeze({
      status: int(result.status, 100), outcome, idempotentReplay: replay === true,
      selectedTransactionId: binding.transactionId, expectedVersion: binding.expectedVersion,
      newVersion: binding.newVersion, idempotencyKey: binding.idempotencyKey,
      classificationId: binding.classificationId,
      category: binding.category,
      status: binding.status,
      clientGroupId: binding.clientGroupId,
      refundOfTransactionId: binding.refundOfTransactionId,
      tenantId: binding.tenantId,
      requestFingerprint: binding.requestFingerprint,
    }),
    integrationRequirement: null,
  });
}

function importCommand(contract, request) {
  if (!contract || !request) return null;
  return buildClientDepositBankImportCommand({ preview: contract, request });
}

function importPhase(preview, importResult, request) {
  if (!preview.contract) return preview.public.state === "loading" ? "idle" : preview.public.state;
  if (importResult === null || importResult === undefined) return preview.public.duplicateFile ? "duplicate" : "preview";
  const command = importCommand(preview.contract, request);
  if (!command) return "conflict";
  const state = stateOf(importResult);
  const outcome = text(importResult.outcome);
  if (["conflict", "denied", "review_required", "error", "blocked", "unavailable"].includes(state)) return state;
  if (state !== "data" || ![...SUCCESS_OUTCOMES, "idempotent_replay"].includes(outcome)) return "error";
  const replay = importResult.idempotentReplay ?? importResult.idempotent_replay;
  const expectedReplay = outcome === "idempotent_replay";
  const confirmedId = text(importResult.confirmedPreviewId ?? importResult.confirmed_preview_id);
  const transactionCount = importResult.transactionCount ?? importResult.transaction_count;
  const sourceHash = importResult.sourceFileSha256 ?? importResult.source_file_sha256;
  const manifestHash = importResult.previewManifestSha256 ?? importResult.preview_manifest_sha256;
  if (confirmedId !== preview.contract.previewId || transactionCount !== preview.contract.counts.new
      || replay !== expectedReplay || (sourceHash !== undefined && sourceHash !== preview.contract.sourceFileSha256)
      || (manifestHash !== undefined && manifestHash !== preview.contract.sourceManifestSha256)) return "conflict";
  return expectedReplay ? "replayed" : "confirmed";
}

function sourceDetail(selectedId) {
  if (!selectedId) return freeze({ state: "empty", available: false, integrationRequirement: null });
  return freeze({
    state: "unavailable", available: false,
    integrationRequirement: CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS.sourceDetailAdapter,
  });
}

function enforceActionIdempotency(actions) {
  const byKey = new Map();
  const conflicts = new Set();
  for (const [type, action] of Object.entries(actions)) {
    const key = text(action.command?.idempotency_key);
    if (!key) continue;
    const fingerprint = JSON.stringify(action.command);
    const prior = byKey.get(key);
    if (prior && prior.fingerprint !== fingerprint) {
      conflicts.add(type);
      conflicts.add(prior.type);
    } else if (!prior) {
      byKey.set(key, { type, fingerprint });
    }
  }
  if (conflicts.size === 0) return freeze(actions);
  return freeze(Object.fromEntries(Object.entries(actions).map(([type, action]) => (
    conflicts.has(type)
      ? [type, freeze({
          ...action,
          state: "conflict",
          response: null,
          integrationRequirement: null,
        })]
      : [type, action]
  ))));
}

export function resolveClientDepositSelection(requestedId, authorizedIds = []) {
  const id = nullableText(requestedId);
  return id && Array.isArray(authorizedIds) && authorizedIds.includes(id) ? id : null;
}

export function buildClientDepositOperationsModel({
  previewResult = null, importResult = null, importRequest = null,
  classificationsResult = null, transactionsResult = null, sourceDetailResult = null,
  requestedTransactionId = "", actionCommands = {}, actionResults = {},
  authorizedTransactionIds = [], authorizedClientGroupIds = [],
} = {}) {
  const preview = previewContract(previewResult);
  const rowsContract = classificationContract(classificationsResult ?? transactionsResult);
  const selectedId = resolveClientDepositSelection(requestedTransactionId, rowsContract.ids);
  const selectedRow = selectedId ? rowsContract.rows.find((row) => row.transactionId === selectedId) ?? null : null;
  const importState = importPhase(preview, importResult, importRequest);
  const importResponseState = stateOf(importResult);
  const requestedTransactionAllowlist = Array.isArray(authorizedTransactionIds)
    ? authorizedTransactionIds
    : [];
  const actionAllowTransactions = requestedTransactionAllowlist.length === 0
    ? rowsContract.ids
    : rowsContract.ids.filter((id) => requestedTransactionAllowlist.includes(id));
  const actionAllowClients = Array.isArray(authorizedClientGroupIds) ? authorizedClientGroupIds : [];
  const actions = enforceActionIdempotency(Object.fromEntries(ACTION_TYPES.map((type) => [
    type, normalizeAction(
      type,
      actionCommands[type],
      actionResults[type],
      selectedRow,
      actionAllowTransactions,
      actionAllowClients,
      rowsContract.rows,
    ),
  ])));
  const hasRows = classificationsResult !== null || transactionsResult !== null;
  const rootState = [preview.state, rowsContract.state, ...Object.values(actions).map((item) => item.state)]
    .find((state) => ["conflict", "error", "denied", "review_required", "partial", "blocked", "unavailable"].includes(state))
    ?? (hasRows ? rowsContract.state : preview.state);
  return freeze({
    state: rootState, statusCopy: CLIENT_DEPOSIT_STATUS_COPY, preview: preview.public,
    import: freeze({
      phase: importState, label: CLIENT_DEPOSIT_IMPORT_PHASE_COPY[importState] ?? CLIENT_DEPOSIT_IMPORT_PHASE_COPY.error,
      state: importResponseState, command: importCommand(preview.contract, importRequest),
      confirmedPreviewId: nullableText(importResult?.confirmedPreviewId ?? importResult?.confirmed_preview_id),
      transactionCount: int(importResult?.transactionCount ?? importResult?.transaction_count, 0),
      idempotentReplay: importState === "replayed", noInvoiceRequired: true, noMatterRequired: true,
      integrationRequirement: preview.contract ? null : CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS.bankImportConfirmAdapter,
    }),
    rows: rowsContract.rows, authorizedTransactionIds: rowsContract.ids,
    selectedTransactionId: selectedId, selectedRow,
    requestedTransactionAvailable: nullableText(requestedTransactionId) ? Boolean(selectedId) : null,
    selectionIsExplicit: Boolean(selectedId), sourceDetail: sourceDetail(selectedId), actions,
    canConfirmImport: importState === "preview" && Boolean(preview.public.canConfirm),
    requiresVersionOnChange: rowsContract.rows.some((row) => row.requiresExpectedVersion),
    noInvoiceRequirement: true, recognitionBasis: "collected",
    integrationRequirements: CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS,
    sourceDetailResultIgnored: sourceDetailResult !== null && sourceDetailResult !== undefined,
  });
}

export function clientDepositResultState(result) { return stateOf(result); }
export function clientDepositLinkLabel(kind) { return CLIENT_DEPOSIT_LINK_COPY[text(kind)] ?? CLIENT_DEPOSIT_LINK_COPY.needs_review; }
export function clientDepositImportPhaseLabel(phase) { return CLIENT_DEPOSIT_IMPORT_PHASE_COPY[text(phase)] ?? CLIENT_DEPOSIT_IMPORT_PHASE_COPY.error; }
export function clientDepositRowStatusLabel(status) { return CLIENT_DEPOSIT_ROW_STATUS_COPY[text(status)] ?? "상태 확인 필요"; }
