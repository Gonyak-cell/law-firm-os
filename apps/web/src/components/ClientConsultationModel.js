const CONSULTATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const CONSULTATION_STATUS_TABS = Object.freeze([
  Object.freeze({ code: "today", label: "오늘 상담" }),
  Object.freeze({ code: "all", label: "전체" }),
  Object.freeze({ code: "upcoming", label: "예정" }),
  Object.freeze({ code: "completed", label: "완료" })
]);
const STATUS_BY_CODE = new Map(CONSULTATION_STATUS_TABS.map((tab) => [tab.code, tab]));
const STATUS_BY_LABEL = new Map(CONSULTATION_STATUS_TABS.map((tab) => [tab.label, tab]));
const CONSULTATION_STATUS_LABELS = Object.freeze({
  scheduled: "상담 예정",
  completed: "상담 완료"
});
const SAFE_CONSULTATION_STATES = new Set(["data", "partial", "empty"]);

function text(value, maxLength = 2_000) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : "";
}

function nullableText(value, maxLength = 2_000) {
  const normalized = text(value, maxLength);
  return normalized || null;
}

function safeId(value) {
  const normalized = text(value, 200);
  return CONSULTATION_ID_PATTERN.test(normalized) ? normalized : null;
}

function safeDate(value) {
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) return null;
  return value.trim();
}

function field(item, camel, snake = camel) {
  return item?.[camel] ?? item?.[snake];
}

function resultState(result) {
  if (result === null || result === undefined || result.kind === "loading") return "loading";
  if (["denied", "review_required", "conflict", "error"].includes(result.kind)) return result.kind;
  if (result.kind === "guarded") {
    if (["denied", "permission_denied"].includes(result.uiState)) return "denied";
    if (["review", "review_required"].includes(result.uiState)) return "review_required";
    if (result.uiState === "conflict") return "conflict";
    return "error";
  }
  if (result.kind !== "data") return "error";
  if (["denied", "permission_denied"].includes(result.uiState) || result.outcome === "denied") return "denied";
  if (["review", "review_required"].includes(result.uiState) || ["review_required", "approval_required"].includes(result.outcome)) return "review_required";
  if (result.uiState === "conflict" || result.outcome === "conflict") return "conflict";
  if (result.uiState === "partial" || result.outcome === "partial") return "partial";
  if (["empty", "no_data"].includes(result.uiState) || result.outcome === "empty") return "empty";
  if (result.uiState === "error" || result.outcome === "error") return "error";
  return "data";
}

function sourceItems(result) {
  if (result?.kind !== "data") return [];
  if (Array.isArray(result.consultations)) return result.consultations;
  if (!Array.isArray(result.items)) return [];
  return result.items;
}

function validTimezone(timezone) {
  if (typeof timezone !== "string" || !timezone.trim()) return "Asia/Seoul";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format();
    return timezone.trim();
  } catch {
    return "Asia/Seoul";
  }
}

function localDate(value, _recordTimezone = "Asia/Seoul") {
  const date = safeDate(value);
  if (!date) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      // Client's operating day is always Korea Standard Time.  A provider or
      // attendee timezone is display metadata only and must not move a
      // consultation into a different "오늘" bucket.
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(date));
  } catch {
    return date.slice(0, 10);
  }
}

function todayInSeoul() {
  return localDate(new Date().toISOString(), "Asia/Seoul");
}

function outlookState(item) {
  const calendar = field(item, "outlookCalendar", "outlook_calendar");
  if (!calendar || typeof calendar !== "object" || Array.isArray(calendar)) return "not_created";
  return ["not_created", "linked", "update_required"].includes(calendar.state)
    ? calendar.state
    : "not_created";
}

function validConsultation(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  if (["matter_id", "matter_ref", "matter_number", "matter_create_command", "matter_open_command", "owner_user_id", "party_id"].some((fieldName) => Object.hasOwn(item, fieldName))) return false;
  const consultationId = safeId(field(item, "consultationId", "crm_activity_id") ?? field(item, "activityId", "resource_id"));
  const activityKind = field(item, "activityKind", "activity_kind");
  const scheduledStart = safeDate(field(item, "scheduledStart", "scheduled_start"));
  const version = field(item, "version");
  const confidential = field(item, "confidential");
  if (!consultationId || activityKind !== "consultation" || !scheduledStart || !Number.isSafeInteger(version) || version < 1 || typeof confidential !== "boolean") return false;
  const detailsIncluded = field(item, "confidentialDetailsIncluded", "confidential_details_included");
  const subject = text(field(item, "subject"), 160);
  if (typeof detailsIncluded !== "boolean" || !subject) return false;
  if (confidential) {
    if (subject !== "보호된 상담" || detailsIncluded !== false) return false;
    if (field(item, "outcome") !== null && field(item, "outcome") !== undefined) return false;
    if (field(item, "nextAction", "next_action") !== null && field(item, "nextAction", "next_action") !== undefined) return false;
  } else if (detailsIncluded !== true) {
    return false;
  }
  const scheduledEnd = field(item, "scheduledEnd", "scheduled_end");
  const completedAt = field(item, "completedAt", "completed_at");
  if (scheduledEnd !== null && scheduledEnd !== undefined && safeDate(scheduledEnd) === null) return false;
  if (completedAt !== null && completedAt !== undefined && safeDate(completedAt) === null) return false;
  const leadId = field(item, "leadId", "lead_id");
  if (leadId !== null && leadId !== undefined && safeId(leadId) === null) return false;
  return true;
}

function normalizeConsultation(item) {
  if (!validConsultation(item)) return null;
  const consultationId = safeId(field(item, "consultationId", "crm_activity_id") ?? field(item, "activityId", "resource_id"));
  const leadId = field(item, "leadId", "lead_id");
  const confidential = field(item, "confidential") === true;
  const scheduledStart = safeDate(field(item, "scheduledStart", "scheduled_start"));
  const scheduledEnd = field(item, "scheduledEnd", "scheduled_end");
  const completedAt = field(item, "completedAt", "completed_at");
  const displayName = text(field(item, "partyDisplayName", "party_display_name") ?? field(item, "displayName", "display_name"), 240) || "고객명 확인 필요";
  const status = completedAt
    ? "completed"
    : "scheduled";
  return Object.freeze({
    consultationId,
    inquiryId: leadId === null || leadId === undefined ? null : safeId(leadId),
    displayName,
    subject: confidential ? "보호된 상담" : text(field(item, "subject"), 160),
    confidential,
    scheduledStart,
    scheduledEnd: scheduledEnd === null || scheduledEnd === undefined ? null : safeDate(scheduledEnd),
    timezone: validTimezone(field(item, "timezone")),
    localDate: localDate(scheduledStart),
    completedAt: completedAt === null || completedAt === undefined ? null : safeDate(completedAt),
    outcome: confidential ? null : nullableText(field(item, "outcome"), 2_000),
    nextAction: confidential ? null : nullableText(field(item, "nextAction", "next_action"), 500),
    status,
    statusLabel: status === "completed" ? "상담 완료" : "상담 예정",
    outlookState: outlookState(item),
    version: field(item, "version")
  });
}

export function normalizeClientConsultation(item) {
  return normalizeConsultation(item);
}

export function normalizeClientConsultationStatusTab(value) {
  const normalized = text(value, 80);
  return STATUS_BY_CODE.has(normalized)
    ? normalized
    : STATUS_BY_LABEL.get(normalized)?.code ?? "today";
}

export function clientConsultationStatusLabel(value) {
  const normalized = text(value, 80);
  return CONSULTATION_STATUS_LABELS[normalized]
    ?? STATUS_BY_CODE.get(normalized)?.label
    ?? STATUS_BY_LABEL.get(normalized)?.label
    ?? "상태 확인 필요";
}

function searchValue(value) {
  return text(value, 2_000).normalize("NFKC").toLocaleLowerCase("ko-KR");
}

function matchesTab(item, tab, today) {
  if (tab === "all") return true;
  if (tab === "today") return item.localDate === today;
  if (tab === "completed") return item.completedAt !== null;
  if (tab === "upcoming") return item.completedAt === null && item.localDate >= today;
  return false;
}

function matchesSearch(item, query) {
  if (!query) return true;
  return [item.displayName, item.subject, item.outcome, item.nextAction]
    .filter(Boolean)
    .some((value) => searchValue(value).includes(query));
}

export function resolveClientConsultationSelection(requestedConsultationId, authorizedConsultationIds = []) {
  const requested = safeId(requestedConsultationId);
  if (!requested || !Array.isArray(authorizedConsultationIds)) return null;
  const authorized = new Set(authorizedConsultationIds.map(safeId).filter(Boolean));
  return authorized.has(requested) ? requested : null;
}

export function buildClientConsultationModel({
  consultationsResult,
  requestedConsultationId = "",
  statusTab = "today",
  searchQuery = "",
  today = todayInSeoul()
} = {}) {
  const state = resultState(consultationsResult);
  const rawItems = SAFE_CONSULTATION_STATES.has(state) ? sourceItems(consultationsResult) : [];
  const normalizedItems = rawItems.map(normalizeConsultation);
  const valid = rawItems.length === normalizedItems.length && normalizedItems.every(Boolean);
  const effectiveState = valid ? state : "error";
  const normalizedToday = /^\d{4}-\d{2}-\d{2}$/u.test(text(today, 10)) ? text(today, 10) : todayInSeoul();
  const activeStatusTab = normalizeClientConsultationStatusTab(statusTab);
  const normalizedSearchQuery = text(searchQuery, 240);
  const normalizedSearch = searchValue(normalizedSearchQuery);
  const uniqueIds = new Set(normalizedItems.map((item) => item?.consultationId).filter(Boolean));
  const authorizedConsultations = valid && uniqueIds.size === normalizedItems.length ? normalizedItems : [];
  const authorizedConsultationIds = Object.freeze(authorizedConsultations.map((item) => item.consultationId));
  const todayConsultations = authorizedConsultations.filter((item) => item.localDate === normalizedToday);
  const consultations = authorizedConsultations.filter((item) => matchesTab(item, activeStatusTab, normalizedToday) && matchesSearch(item, normalizedSearch));
  // Selection is resolved against the visible collection so changing the tab
  // or search query cannot leave an actionable row hidden in the background.
  const visibleConsultationIds = consultations.map((item) => item.consultationId);
  const selectedConsultationId = resolveClientConsultationSelection(requestedConsultationId, visibleConsultationIds);
  const selectedConsultation = selectedConsultationId
    ? consultations.find((item) => item.consultationId === selectedConsultationId) ?? null
    : null;
  return Object.freeze({
    state: effectiveState,
    today: normalizedToday,
    statusTabs: CONSULTATION_STATUS_TABS,
    activeStatusTab,
    searchQuery: normalizedSearchQuery,
    todayConsultations: Object.freeze(todayConsultations),
    consultations: Object.freeze(consultations),
    authorizedConsultationIds,
    selectedConsultationId,
    selectedConsultation,
    requestedConsultationAvailable: text(requestedConsultationId, 200)
      ? Boolean(selectedConsultationId)
      : null
  });
}

export {
  CONSULTATION_STATUS_TABS,
  CONSULTATION_STATUS_TABS as CLIENT_CONSULTATION_STATUS_TABS
};
