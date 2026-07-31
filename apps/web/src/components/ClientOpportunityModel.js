const OPPORTUNITY_STAGES = new Set([
  "new",
  "qualified",
  "intake_requested",
  "intake_opened",
  "closed_lost",
  "closed_won"
]);

const ENGAGEMENT_DECISIONS = new Set([
  "pending",
  "accepted",
  "declined"
]);

const ENGAGEMENT_WORKFLOW_STATUSES = new Set([
  "in_progress",
  "repair_required",
  "completed"
]);

const RECORD_STATUSES = new Set([
  "draft",
  "active",
  "review_required",
  "blocked",
  "archived"
]);

const CLIENT_OPPORTUNITY_STATUS_TABS = Object.freeze([
  Object.freeze({ code: "all", label: "전체" }),
  Object.freeze({ code: "reviewing", label: "검토 중" }),
  Object.freeze({ code: "intake_requested", label: "상담 연결 대기" }),
  Object.freeze({ code: "intake_opened", label: "상담 연결됨" }),
  Object.freeze({ code: "accepted", label: "수임 확정" }),
  Object.freeze({ code: "declined", label: "수임하지 않음" })
]);

const STATUS_BY_CODE = new Map(
  CLIENT_OPPORTUNITY_STATUS_TABS.map((tab) => [tab.code, tab])
);
const STATUS_BY_LABEL = new Map(
  CLIENT_OPPORTUNITY_STATUS_TABS.map((tab) => [tab.label, tab])
);

const CLIENT_OPPORTUNITY_STATUS_LABELS = Object.freeze(
  Object.fromEntries(
    CLIENT_OPPORTUNITY_STATUS_TABS.map(({ code, label }) => [code, label])
  )
);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value) {
  const normalized = text(value);
  return normalized || null;
}

function resultItems(result) {
  return result?.kind === "data" && Array.isArray(result.items)
    ? result.items
    : [];
}

function resultState(result) {
  if (result === null || result === undefined || result.kind === "loading") {
    return "loading";
  }
  if (result.kind === "error") return "error";
  if (result.kind === "empty") return "empty";
  if (result.kind === "guarded") {
    if (["denied", "permission_denied"].includes(result.uiState)) return "denied";
    if (["review", "review_required"].includes(result.uiState)) return "review_required";
    return "error";
  }
  if (result.kind !== "data") return "error";
  if (
    ["denied", "permission_denied"].includes(result.uiState)
    || result.outcome === "denied"
  ) {
    return "denied";
  }
  if (
    ["review", "review_required"].includes(result.uiState)
    || result.outcome === "review_required"
  ) {
    return "review_required";
  }
  if (
    ["partial"].includes(result.uiState)
    || result.outcome === "partial"
  ) {
    return "partial";
  }
  if (
    ["empty", "no_data"].includes(result.uiState)
    || result.outcome === "empty"
  ) {
    return "empty";
  }
  if (["error"].includes(result.uiState) || result.outcome === "error") {
    return "error";
  }
  return "data";
}

function validOpportunity(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  if (!text(item.opportunity_id) || !text(item.display_name)) return false;
  if (!OPPORTUNITY_STAGES.has(text(item.stage))) return false;
  if (
    item.engagement_decision !== null
    && item.engagement_decision !== undefined
    && !ENGAGEMENT_DECISIONS.has(text(item.engagement_decision))
  ) {
    return false;
  }
  if (
    item.intake_request_id !== null
    && item.intake_request_id !== undefined
    && typeof item.intake_request_id !== "string"
  ) {
    return false;
  }
  if (
    item.requested_scope_summary !== null
    && item.requested_scope_summary !== undefined
    && typeof item.requested_scope_summary !== "string"
  ) {
    return false;
  }
  if (
    item.status !== null
    && item.status !== undefined
    && !RECORD_STATUSES.has(text(item.status))
  ) {
    return false;
  }
  if (
    item.engagement_workflow_status !== null
    && item.engagement_workflow_status !== undefined
    && !ENGAGEMENT_WORKFLOW_STATUSES.has(text(item.engagement_workflow_status))
  ) {
    return false;
  }
  if (
    item.engagement_decision_version !== null
    && item.engagement_decision_version !== undefined
    && (!Number.isSafeInteger(item.engagement_decision_version) || item.engagement_decision_version <= 0)
  ) {
    return false;
  }
  return true;
}

function normalizeOpportunity(item) {
  return Object.freeze({
    opportunityId: text(item.opportunity_id),
    displayName: text(item.display_name),
    requestedScopeSummary: nullableText(item.requested_scope_summary),
    stage: text(item.stage),
    recordStatus: nullableText(item.status),
    engagementDecision: nullableText(item.engagement_decision),
    engagementDecisionVersion: Number.isInteger(item.engagement_decision_version)
      ? item.engagement_decision_version
      : null,
    engagementWorkflowStatus: nullableText(item.engagement_workflow_status),
    intakeRequestLinked: Boolean(nullableText(item.intake_request_id))
  });
}

export function clientOpportunityStatusCode(opportunity) {
  if (!opportunity || typeof opportunity !== "object") return null;
  const stage = text(opportunity.stage);
  const decision = text(
    opportunity.engagementDecision ?? opportunity.engagement_decision
  );
  if (decision === "accepted" || stage === "closed_won") return "accepted";
  if (decision === "declined" || stage === "closed_lost") return "declined";
  if (
    stage === "intake_opened"
    || opportunity.intakeRequestLinked === true
    || nullableText(opportunity.intake_request_id)
  ) {
    return "intake_opened";
  }
  if (stage === "intake_requested") return "intake_requested";
  if (decision === "pending" || ["new", "qualified"].includes(stage)) {
    return "reviewing";
  }
  return null;
}

export function normalizeClientOpportunityStatusTab(value) {
  const requested = text(value);
  return STATUS_BY_CODE.has(requested)
    ? requested
    : STATUS_BY_LABEL.get(requested)?.code ?? "all";
}

export function clientOpportunityStatusLabel(value) {
  if (typeof value === "object") {
    const code = clientOpportunityStatusCode(value);
    return code ? CLIENT_OPPORTUNITY_STATUS_LABELS[code] : "상태 확인 필요";
  }
  const requested = text(value);
  return STATUS_BY_CODE.get(requested)?.label
    ?? STATUS_BY_LABEL.get(requested)?.label
    ?? "상태 확인 필요";
}

function searchValue(value) {
  return text(value).normalize("NFKC").toLocaleLowerCase("ko-KR");
}

function matchesSearch(opportunity, query) {
  if (!query) return true;
  return [opportunity.displayName, opportunity.requestedScopeSummary]
    .some((field) => searchValue(field).includes(query));
}

function matchesStatus(opportunity, statusTab) {
  return statusTab === "all" || clientOpportunityStatusCode(opportunity) === statusTab;
}

export function resolveClientOpportunitySelection(
  requestedOpportunityId,
  authorizedOpportunityIds = []
) {
  const requested = nullableText(requestedOpportunityId);
  if (!requested || !Array.isArray(authorizedOpportunityIds)) return null;
  const authorized = new Set(
    authorizedOpportunityIds
      .map(nullableText)
      .filter(Boolean)
  );
  return authorized.has(requested) ? requested : null;
}

export function buildClientOpportunityModel({
  opportunitiesResult,
  requestedOpportunityId = "",
  statusTab = "all",
  searchQuery = ""
} = {}) {
  const state = resultState(opportunitiesResult);
  const sourceItems = ["data", "partial"].includes(state)
    ? resultItems(opportunitiesResult)
    : [];
  const normalizedItems = sourceItems.every(validOpportunity)
    && new Set(sourceItems.map((item) => text(item.opportunity_id))).size === sourceItems.length
    ? sourceItems.map(normalizeOpportunity)
    : [];
  const valid = sourceItems.length === normalizedItems.length;
  const effectiveState = valid ? state : "error";
  const activeStatusTab = normalizeClientOpportunityStatusTab(statusTab);
  const normalizedSearchQuery = text(searchQuery);
  const normalizedSearch = searchValue(normalizedSearchQuery);
  const authorizedOpportunityIds = Object.freeze(
    normalizedItems.map((item) => item.opportunityId)
  );
  const opportunities = normalizedItems.filter((item) => (
    matchesStatus(item, activeStatusTab)
    && matchesSearch(item, normalizedSearch)
  ));
  const visibleOpportunityIds = opportunities.map((item) => item.opportunityId);
  const selectedOpportunityId = resolveClientOpportunitySelection(
    requestedOpportunityId,
    visibleOpportunityIds
  );
  const selectedOpportunity = selectedOpportunityId
    ? opportunities.find((item) => item.opportunityId === selectedOpportunityId) ?? null
    : null;

  return Object.freeze({
    state: effectiveState,
    statusTabs: CLIENT_OPPORTUNITY_STATUS_TABS,
    activeStatusTab,
    searchQuery: normalizedSearchQuery,
    opportunities: Object.freeze(opportunities),
    authorizedOpportunityIds,
    selectedOpportunityId,
    selectedOpportunity,
    requestedOpportunityAvailable: nullableText(requestedOpportunityId)
      ? Boolean(selectedOpportunityId)
      : null
  });
}

export {
  CLIENT_OPPORTUNITY_STATUS_LABELS,
  CLIENT_OPPORTUNITY_STATUS_TABS
};
