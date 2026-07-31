const INQUIRY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

export const CLIENT_INQUIRY_STATUS_LABELS = Object.freeze({
  new: "새 문의",
  reviewing: "확인 중",
  consultation_scheduled: "상담 예정",
  engagement_review: "수임 검토 중",
  engaged: "수임 확정",
  not_engaged: "수임하지 않음"
});

const CLIENT_INQUIRY_SOURCE_LABELS = Object.freeze({
  outlook_addin: "Outlook",
  manual: "직접 등록",
  unknown: "등록 경로 확인 필요"
});

const EVIDENCE_ACCESS_STATES = new Set([
  "allowed",
  "denied",
  "unavailable"
]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value) {
  const normalized = text(value);
  return normalized || null;
}

function safeId(value) {
  const normalized = text(value);
  return INQUIRY_ID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeStatus(value) {
  const code = text(value);
  return Object.prototype.hasOwnProperty.call(CLIENT_INQUIRY_STATUS_LABELS, code) ? code : null;
}

export function normalizeClientInquirySource(value) {
  return ["outlook_addin", "manual"].includes(value) ? value : "unknown";
}

export function clientInquirySourceLabel(value) {
  return CLIENT_INQUIRY_SOURCE_LABELS[normalizeClientInquirySource(value)];
}

export function clientInquiryStatusLabel(value) {
  const code = normalizeStatus(value);
  return code ? CLIENT_INQUIRY_STATUS_LABELS[code] : "상태 확인 필요";
}

export function isSafeClientInquiryId(value) {
  return Boolean(safeId(value));
}

function normalizeInquirySummary(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const inquiryId = safeId(item.lead_id);
  const displayName = text(item.display_name);
  const status = normalizeStatus(item.visible_status);
  const statusLabel = text(item.visible_status_label);
  const source = normalizeClientInquirySource(item.source);
  if (
    !inquiryId
    || !displayName
    || !status
    || statusLabel !== CLIENT_INQUIRY_STATUS_LABELS[status]
    || !["outlook_addin", "manual"].includes(source)
    || (item.received_at !== null && item.received_at !== undefined && typeof item.received_at !== "string")
    || (item.next_action !== null && item.next_action !== undefined && typeof item.next_action !== "string")
    || typeof item.assigned !== "boolean"
  ) return null;
  return Object.freeze({
    inquiryId,
    displayName,
    source,
    sourceLabel: CLIENT_INQUIRY_SOURCE_LABELS[source],
    receivedAt: nullableText(item.received_at),
    visibleStatus: status,
    visibleStatusLabel: CLIENT_INQUIRY_STATUS_LABELS[status],
    assigned: item.assigned,
    nextAction: nullableText(item.next_action)
  });
}

function normalizeConsultation(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const validOptionalDate = (value) => value === null || value === undefined || (typeof value === "string" && Boolean(value.trim()));
  const validOptionalString = (value) => value === null || value === undefined || typeof value === "string";
  const scheduledStart = nullableText(item.scheduled_start ?? item.scheduled_at);
  const completedAt = nullableText(item.completed_at);
  const status = nullableText(item.status);
  if (typeof item.confidential !== "boolean") return null;
  const confidential = item.confidential;
  const confidentialDetailsIncluded = item.confidential_details_included;
  if (typeof confidentialDetailsIncluded !== "boolean") return null;
  if (confidential && (
    item.subject !== "보호된 상담"
    || item.outcome !== null
    || item.next_action !== null
    || confidentialDetailsIncluded !== false
  )) return null;
  if (!confidential && confidentialDetailsIncluded !== true) return null;
  if (
    !validOptionalDate(item.scheduled_start)
    || !validOptionalDate(item.scheduled_at)
    || !validOptionalDate(item.scheduled_end)
    || !validOptionalDate(item.completed_at)
    || !validOptionalString(item.subject)
    || !validOptionalString(item.outcome)
    || !validOptionalString(item.next_action)
    || !validOptionalString(item.timezone)
    || !validOptionalString(item.status)
  ) return null;
  return Object.freeze({
    scheduledStart,
    scheduledEnd: nullableText(item.scheduled_end),
    timezone: nullableText(item.timezone),
    completedAt,
    subject: confidential ? "보호된 상담" : nullableText(item.subject),
    outcome: confidential ? null : nullableText(item.outcome),
    nextAction: confidential ? null : nullableText(item.next_action),
    confidential,
    confidentialDetailsIncluded,
    status,
    isUpcoming: completedAt === null && !["archived", "cancelled"].includes(status)
  });
}

function normalizeEvidenceItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const evidenceId = safeId(item.inquiry_email_evidence_id);
  if (!evidenceId) return null;
  const captureStatus = nullableText(item.capture_status);
  const validOptionalDate = (value) => value === null || value === undefined || (typeof value === "string" && Boolean(value.trim()));
  const validOptionalString = (value) => value === null || value === undefined || typeof value === "string";
  if (
    !captureStatus
    || item.raw_content_included !== false
    || item.mailbox_address_included !== false
    || item.provider_message_identifiers_included !== false
    || item.storage_object_identifiers_included !== false
    || !validOptionalDate(item.received_at)
    || !validOptionalString(item.subject)
    || !validOptionalString(item.sender_display_name)
  ) return null;
  const displayPath = nullableText(item.display_content_path);
  const originalPath = nullableText(item.original_content_path);
  const expectedPrefix = `/api/outlook/inquiries/evidence/${encodeURIComponent(evidenceId)}/content`;
  if (
    (displayPath !== null && displayPath !== `${expectedPrefix}?kind=display`)
    || (originalPath !== null && originalPath !== `${expectedPrefix}?kind=original`)
  ) return null;
  return Object.freeze({
    evidenceId,
    receivedAt: nullableText(item.received_at),
    subject: nullableText(item.subject),
    senderDisplayName: nullableText(item.sender_display_name),
    captureStatus,
    hasDisplayContent: Boolean(displayPath),
    hasOriginalContent: Boolean(originalPath),
    displayContentPath: displayPath,
    originalContentPath: originalPath
  });
}

function normalizeEvidence(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return null;
  const access = text(evidence.access);
  const sourceStatus = text(evidence.source_status);
  if (!EVIDENCE_ACCESS_STATES.has(access) || !sourceStatus) return null;
  if (evidence.count_leak_prevented !== true || !Array.isArray(evidence.items)) return null;
  const items = evidence.items.map(normalizeEvidenceItem);
  if (items.some((item) => item === null)) return null;
  if (access !== "allowed" && items.length !== 0) return null;
  return Object.freeze({
    access,
    sourceStatus,
    items: Object.freeze(items),
    partial: sourceStatus === "partial",
    countLeakPrevented: evidence.count_leak_prevented === true
  });
}

export function normalizeClientInquirySummary(item) {
  return normalizeInquirySummary(item);
}

export function normalizeClientInquiryDetail(item) {
  const summary = normalizeInquirySummary(item);
  if (!summary || !item || typeof item !== "object") return null;
  const consultationsAccess = text(item.consultations_access);
  if (!consultationsAccess || !["allowed", "denied", "unavailable"].includes(consultationsAccess)) {
    return null;
  }
  const consultations = Array.isArray(item.consultations)
    ? item.consultations.map(normalizeConsultation)
    : null;
  const evidence = normalizeEvidence(item.evidence);
  if (
    !consultations
    || consultations.some((consultation) => consultation === null)
    || consultationsAccess !== "allowed" && consultations.length !== 0
    || !evidence
  ) return null;
  return Object.freeze({
    ...summary,
    consultations: Object.freeze(consultations),
    consultationsAccess,
    evidence
  });
}

function resultState(result) {
  if (result === null || result === undefined) return "loading";
  if (result.kind === "error") return "error";
  if (result.kind === "empty") return "empty";
  if (result.kind === "guarded") {
    if (result.uiState === "review_required") return "review_required";
    if (result.uiState === "blocked") return "blocked";
    return "denied";
  }
  if (result.kind !== "data") return "error";
  if (["denied", "permission_denied"].includes(result.uiState) || result.outcome === "denied") return "denied";
  if (["review", "review_required"].includes(result.uiState) || result.outcome === "review_required") return "review_required";
  if (["blocked", "quarantined"].includes(result.uiState) || result.outcome === "blocked") return "blocked";
  if (["partial"].includes(result.uiState) || result.outcome === "partial") return "partial";
  if (["empty", "no_data"].includes(result.uiState) || result.outcome === "empty") return "empty";
  return "data";
}

function itemsOf(result) {
  return result?.kind === "data" && Array.isArray(result.items) ? result.items : [];
}

export function inquiryEvidenceUiState(evidenceResult) {
  if (evidenceResult === null || evidenceResult === undefined) return "loading";
  if (evidenceResult.kind === "error") return "error";
  if (evidenceResult.kind === "guarded") {
    if (evidenceResult.uiState === "review_required") return "review_required";
    if (evidenceResult.uiState === "blocked") return "blocked";
    return "denied";
  }
  if (evidenceResult.kind !== "data") return "error";
  if (evidenceResult.uiState === "quarantined" || evidenceResult.item?.scanStatus === "quarantined") return "quarantined";
  if (["denied", "permission_denied"].includes(evidenceResult.uiState)) return "denied";
  if (["review", "review_required"].includes(evidenceResult.uiState)) return "review_required";
  if (evidenceResult.uiState === "blocked") return "blocked";
  if (["unavailable", "error"].includes(evidenceResult.uiState)) return evidenceResult.uiState;
  if (evidenceResult.outcome === "empty") return "empty";
  if (evidenceResult.uiState === "partial") return "partial";
  return evidenceResult.item ? "data" : "empty";
}

export function buildClientInquiryModel({
  inquiriesResult,
  detailResult = null,
  requestedInquiryId = ""
} = {}) {
  const requestedId = text(requestedInquiryId);
  const rawInquiries = itemsOf(inquiriesResult);
  const normalizedInquiries = rawInquiries.map(normalizeInquirySummary);
  const inquiries = normalizedInquiries.every(Boolean)
    ? normalizedInquiries
    : [];
  const selectedSummary = requestedId
    ? inquiries.find((item) => item.inquiryId === requestedId) ?? null
    : null;
  const listState = normalizedInquiries.every(Boolean)
    ? resultState(inquiriesResult)
    : "error";
  if (!selectedSummary) {
    return Object.freeze({
      listState,
      inquiries: Object.freeze(inquiries),
      selectedInquiry: null,
      requestedInquiryAvailable: requestedId ? false : null,
      detailState: requestedId ? "empty" : "idle",
      detail: null,
      countLeakPrevented: true
    });
  }

  const detailState = resultState(detailResult);
  const detail = detailResult?.kind === "data" && detailResult.item
    ? normalizeClientInquiryDetail(detailResult.item)
    : null;
  const selectedInquiry = detail && detail.inquiryId === selectedSummary.inquiryId
    ? Object.freeze({ ...selectedSummary, ...detail })
    : detailState === "loading"
      ? selectedSummary
      : detailState === "data"
        ? null
        : selectedSummary;
  return Object.freeze({
    listState,
    inquiries: Object.freeze(inquiries),
    selectedInquiry,
    requestedInquiryAvailable: true,
    detailState,
    detail,
    countLeakPrevented: true
  });
}

export { INQUIRY_ID_PATTERN };
