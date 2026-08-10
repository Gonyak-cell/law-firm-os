import { OUTLOOK_SURFACE_PROFILES } from "./outlook-surface-profile.js";

function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return Object.freeze(value);
}

const PROFILE_KEYS = new Set(
  Object.values(OUTLOOK_SURFACE_PROFILES).map(({ key }) => key),
);
const EMPTY_RESULT = Object.freeze([]);
const STALE_ITEM_RESPONSE = "현재 메일이 바뀌었습니다. 새 메일 정보를 불러온 뒤 다시 시도해 주세요.";
const OFFLINE_RECONNECT_RESPONSE = deepFreeze({
  offline: "오프라인에서는 이 작업을 처리할 수 없습니다. 연결이 복구되면 다시 시도해 주세요.",
  reconnect: "Outlook 연결을 다시 확인한 뒤 시도해 주세요.",
});

function receipt(type, success, duplicate, partial, failure) {
  return { type, success, duplicate, partial, failure };
}

export const OUTLOOK_FEATURE_CATALOG = deepFreeze([
  {
    id: "matter.search",
    label: "Matter 찾기",
    profile: "matter-full",
    availability: { read: true, compose: true, event: [] },
    requiredItemFields: ["itemContextKey"],
    matterPrerequisite: false,
    connectionPrerequisite: false,
    opener: "rail icon",
    endpoint: "/api/outlook/matters",
    domainService: "matter-search",
    operationReceipt: receipt(
      "matter_search_result",
      "accessible_candidates",
      "same_candidate_once",
      "verified_candidate_subset",
      "empty_result_with_error",
    ),
    duplicateSemantics: "Return each Matter candidate once with one stable Matter identifier.",
    partialResultSemantics: "Return only verified candidates and mark the result partial.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "matter-search-input",
    mutation: false,
    implementationState: "active",
  },
  {
    id: "mail.save-with-attachments",
    label: "메일과 첨부 저장",
    profile: "matter-full",
    availability: { read: true, compose: false, event: [] },
    requiredItemFields: [
      "itemContextKey",
      "immutableMessageId",
      "internetMessageId",
      "conversationId",
    ],
    matterPrerequisite: true,
    connectionPrerequisite: true,
    opener: "rail icon",
    endpoint: "/api/outlook/email/file",
    domainService: "email-dms-filing",
    operationReceipt: receipt(
      "email_filing_receipt",
      "completed",
      "duplicate",
      "partial",
      "failed",
    ),
    duplicateSemantics: "Reuse the existing original and report every already-filed item without another copy.",
    partialResultSemantics: "Report the original and each attachment outcome separately; never label partial work complete.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "filing-item-checklist",
    mutation: true,
    implementationState: "active",
  },
  {
    id: "filing.correct-placement",
    label: "저장 위치 바꾸기",
    profile: "matter-full",
    availability: { read: true, compose: false, event: [] },
    requiredItemFields: [
      "itemContextKey",
      "immutableMessageId",
      "internetMessageId",
      "conversationId",
    ],
    matterPrerequisite: true,
    connectionPrerequisite: false,
    opener: "all-functions row",
    endpoint: "/api/outlook/email/corrections",
    domainService: "email-dms-correction",
    operationReceipt: receipt(
      "email_filing_correction_receipt",
      "corrected",
      "already_corrected",
      "projection_pending",
      "correction_failed",
    ),
    duplicateSemantics: "Replay the existing correction receipt without deleting or moving the original.",
    partialResultSemantics: "Keep the correction pending until every required projection is reconciled.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "filing-correction-matter-picker",
    mutation: true,
    implementationState: "active",
  },
  {
    id: "conversation.auto-save",
    label: "대화 자동 저장",
    profile: "matter-full",
    availability: { read: true, compose: false, event: [] },
    requiredItemFields: ["itemContextKey", "conversationId", "filedThreadId"],
    matterPrerequisite: true,
    connectionPrerequisite: true,
    opener: "all-functions row",
    endpoint: "/api/outlook/conversation-policies",
    domainService: "email-dms-conversation-rule",
    operationReceipt: receipt(
      "conversation_rule_receipt",
      "rule_active",
      "rule_unchanged",
      "backfill_pending",
      "rule_failed",
    ),
    duplicateSemantics: "Keep one active rule per mailbox, conversation, and Matter.",
    partialResultSemantics: "Expose pending backfill or subscription renewal until reconciliation finishes.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "conversation-auto-save-toggle",
    mutation: true,
    implementationState: "active",
  },
  {
    id: "mail.save-sent",
    label: "보낸 메일 저장",
    profile: "matter-full",
    availability: { read: true, compose: false, event: [] },
    requiredItemFields: [
      "itemContextKey",
      "immutableMessageId",
      "internetMessageId",
      "conversationId",
    ],
    itemConstraints: {
      isInSentItems: true,
      isDraft: false,
      senderMatchesMailbox: true,
    },
    matterPrerequisite: true,
    connectionPrerequisite: true,
    opener: "all-functions row",
    endpoint: "/api/outlook/sent/file",
    domainService: "email-dms-sent-filing",
    operationReceipt: receipt(
      "sent_message_filing_receipt",
      "completed",
      "duplicate",
      "partial",
      "failed",
    ),
    duplicateSemantics: "File one immutable Sent Items message per Matter and replay its receipt on retry.",
    partialResultSemantics: "Keep attachment failures separate from the filed sent-message original.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "sent-message-filing-options",
    mutation: true,
    implementationState: "active",
  },
  {
    id: "task.create",
    label: "업무 만들기",
    profile: "matter-full",
    availability: { read: true, compose: false, event: [] },
    requiredItemFields: ["itemContextKey", "subject"],
    matterPrerequisite: true,
    connectionPrerequisite: false,
    opener: "all-functions row",
    endpoint: "/api/outlook/tasks",
    domainService: "matter-task",
    operationReceipt: receipt(
      "matter_task_receipt",
      "task_created",
      "existing_task",
      "task_created_with_warnings",
      "task_failed",
    ),
    duplicateSemantics: "Return the existing task for the same source message and user intent.",
    partialResultSemantics: "Create no hidden follow-up; report any omitted optional draft field as a warning.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "task-draft-title",
    mutation: true,
    implementationState: "active",
  },
  {
    id: "time-entry.draft",
    label: "시간기록 초안",
    profile: "matter-full",
    availability: { read: true, compose: true, event: [] },
    requiredItemFields: ["itemContextKey"],
    matterPrerequisite: true,
    connectionPrerequisite: false,
    opener: "all-functions row",
    endpoint: "/api/outlook/time-entry-drafts",
    domainService: "time-expense",
    operationReceipt: receipt(
      "time_entry_draft_receipt",
      "draft_created",
      "existing_draft",
      "draft_created_with_warnings",
      "draft_failed",
    ),
    duplicateSemantics: "Keep one unsubmitted draft for the same message, user, and Matter.",
    partialResultSemantics: "Preserve a draft with explicit missing optional values; never submit or bill it.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "time-entry-duration",
    mutation: true,
    implementationState: "active",
  },
  {
    id: "activity.recent",
    label: "최근 활동 보기",
    profile: "matter-full",
    availability: { read: true, compose: true, event: [] },
    requiredItemFields: [],
    matterPrerequisite: true,
    connectionPrerequisite: false,
    opener: "all-functions row",
    endpoint: "/api/outlook/matters/:matter_id/timeline",
    domainService: "matter-activity",
    operationReceipt: receipt(
      "matter_activity_result",
      "recent_activity",
      "deduplicated_activity",
      "verified_activity_subset",
      "empty_result_with_error",
    ),
    duplicateSemantics: "Project each source event once by its canonical source reference.",
    partialResultSemantics: "Show only verified activity and identify that the timeline is incomplete.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "recent-activity-list",
    mutation: false,
    implementationState: "active",
  },
  {
    id: "precedent.search",
    label: "유사 사건·선례 찾기",
    profile: "matter-full",
    availability: { read: true, compose: true, event: [] },
    requiredItemFields: [],
    matterPrerequisite: true,
    connectionPrerequisite: false,
    opener: "all-functions row",
    endpoint: "/api/outlook/precedents",
    domainService: "precedent-search",
    operationReceipt: receipt(
      "precedent_search_result",
      "reviewed_results",
      "deduplicated_results",
      "verified_result_subset",
      "empty_result_with_error",
    ),
    duplicateSemantics: "Collapse identical reviewed source versions to one result.",
    partialResultSemantics: "Return only reviewed results whose source version can be opened.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "precedent-search-input",
    mutation: false,
    implementationState: "active",
    integrationDependency: "OUTM-08-12-shared-shell",
    runtimeReadinessKey: "precedent_search",
    readinessEndpoint: "/api/outlook/precedents/readiness",
  },
  {
    id: "document.create-and-sign-status",
    label: "문서 만들기·서명 상태",
    profile: "matter-full",
    availability: { read: true, compose: true, event: [] },
    requiredItemFields: [],
    matterPrerequisite: true,
    connectionPrerequisite: false,
    opener: "all-functions row",
    endpoint: "/api/outlook/documents",
    domainService: "document-generation-docusign",
    operationReceipt: receipt(
      "generated_document_receipt",
      "draft_created_or_status_read",
      "existing_run_or_event",
      "artifact_or_status_pending",
      "generation_or_status_failed",
    ),
    duplicateSemantics: "Reuse the generated run or DocuSign event identified by its idempotency key.",
    partialResultSemantics: "Keep generation, delivery, signing, completed file, and certificate states distinct.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "generated-document-template",
    mutation: true,
    implementationState: "active",
  },
  {
    id: "inquiry.create",
    label: "새 문의 등록",
    profile: "inquiry-only",
    availability: { read: true, compose: false, event: [] },
    requiredItemFields: ["itemContextKey", "internetMessageId", "conversationId", "subject"],
    matterPrerequisite: false,
    connectionPrerequisite: true,
    opener: "inquiry icon",
    endpoint: "/api/outlook/inquiries",
    domainService: "client-inquiry",
    operationReceipt: receipt(
      "inquiry_receipt",
      "inquiry_created",
      "existing_inquiry",
      "inquiry_created_with_warnings",
      "inquiry_failed",
    ),
    duplicateSemantics: "Return the existing inquiry for the same immutable source evidence.",
    partialResultSemantics: "Keep the inquiry and evidence outcomes explicit until both are reconciled.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "new-inquiry-button",
    mutation: true,
    implementationState: "active",
  },
  {
    id: "inquiry.link-existing",
    label: "기존 문의 연결",
    profile: "inquiry-only",
    availability: { read: true, compose: false, event: [] },
    requiredItemFields: ["itemContextKey", "internetMessageId", "conversationId", "subject"],
    matterPrerequisite: false,
    connectionPrerequisite: true,
    opener: "inquiry icon",
    endpoint: "/api/outlook/inquiries",
    domainService: "client-inquiry",
    operationReceipt: receipt(
      "inquiry_link_receipt",
      "inquiry_linked",
      "existing_link",
      "link_created_with_warnings",
      "link_failed",
    ),
    duplicateSemantics: "Return the existing link for the same inquiry and immutable source evidence.",
    partialResultSemantics: "Keep the link and evidence outcomes explicit until both are reconciled.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: OFFLINE_RECONNECT_RESPONSE,
    focusTarget: "existing-inquiry-select",
    mutation: true,
    implementationState: "active",
  },
  {
    id: "smart-alert.on-message-send",
    label: "보내기 전 알림",
    profile: "matter-full",
    availability: { read: false, compose: true, event: ["OnMessageSend"] },
    requiredItemFields: ["recipients", "subject", "bodyPreview"],
    matterPrerequisite: false,
    connectionPrerequisite: true,
    opener: "event",
    endpoint: "/api/outlook/smart-alerts/evaluate",
    domainService: "outlook-smart-alert",
    operationReceipt: receipt(
      "smart_alert_result",
      "send_allowed",
      "same_evaluation",
      "prompt_user",
      "send_decision_failed_open",
    ),
    duplicateSemantics: "Reuse the same evaluation for an unchanged compose item context.",
    partialResultSemantics: "Prompt only for a verified alert; never file or enable auto-save from this event.",
    staleItemResponse: STALE_ITEM_RESPONSE,
    offlineReconnectResponse: {
      offline: "오프라인 평가 실패만 기록하고 메일 저장이나 대화 자동 저장은 시작하지 않습니다.",
      reconnect: "연결 재확인이 필요하면 평가 실패만 기록하고 메일 저장이나 대화 자동 저장은 시작하지 않습니다.",
    },
    focusTarget: "outlook-send-event",
    mutation: false,
    implementationState: "active",
  },
]);

function hasRequiredItemFields(item, fields) {
  return fields.every((field) => {
    const value = item[field];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return value !== undefined && value !== null;
  });
}

function matchesItemConstraints(item, constraints) {
  if (!constraints) return true;
  return Object.entries(constraints).every(([field, expected]) => item[field] === expected);
}

function matchesSurface(feature, { form, surface, event }) {
  if (surface === "event") {
    return form === "compose" && feature.availability.event.includes(event);
  }
  return feature.opener !== "event" && feature.availability[form] === true;
}

export function isOutlookFeatureRuntimeAvailable(feature, runtimeReadiness = {}) {
  if (feature?.implementationState !== "active") return false;
  if (!feature.runtimeReadinessKey) return true;
  const receipt = runtimeReadiness?.[feature.runtimeReadinessKey];
  return receipt?.authoritative === true && receipt?.runtime_ready === true;
}

export function evaluateOutlookFeatureCatalog(context = {}) {
  const {
    profile,
    host,
    form,
    surface,
    event,
    item,
    itemFresh,
    matterId,
    connection,
    online,
    runtimeReadiness,
  } = context;
  if (
    !PROFILE_KEYS.has(profile)
    || host !== "Mailbox"
    || !["read", "compose"].includes(form)
    || !["taskpane", "event"].includes(surface)
    || (surface === "event" && event !== "OnMessageSend")
    || (surface === "taskpane" && event != null)
  ) return EMPTY_RESULT;

  const currentItem = Boolean(
    item && typeof item === "object" && !Array.isArray(item) && itemFresh === true,
  );
  const connected = connection === "connected";
  return Object.freeze(OUTLOOK_FEATURE_CATALOG
    .filter((feature) => feature.profile === profile && matchesSurface(feature, context))
    .map((feature) => {
      const implementationReady = isOutlookFeatureRuntimeAvailable(feature, runtimeReadiness);
      const itemReady = currentItem
        && hasRequiredItemFields(item, feature.requiredItemFields)
        && matchesItemConstraints(item, feature.itemConstraints);
      const visible = feature.opener !== "event" && itemReady && implementationReady;
      const matterReady = !feature.matterPrerequisite
        || (typeof matterId === "string" && matterId.trim() === matterId && matterId.length > 0);
      const connectionReady = !feature.connectionPrerequisite || connected;
      const actionable = itemReady && matterReady && connectionReady
        && online === true && implementationReady;
      let response = null;
      if (feature.implementationState !== "active") response = "공통 Outlook 화면 통합 후 제공됩니다.";
      else if (!implementationReady) response = "선례 검색 준비 상태를 확인해 주세요.";
      else if (!currentItem) response = feature.staleItemResponse;
      else if (!itemReady) response = "현재 메일 정보를 다시 불러와 주세요.";
      else if (online !== true) response = feature.offlineReconnectResponse.offline;
      else if (!connectionReady) response = feature.offlineReconnectResponse.reconnect;
      else if (!matterReady) response = "Matter를 먼저 선택해 주세요.";
      return Object.freeze({ feature, visible, actionable, response });
    }));
}

export function getOutlookFeatureById(id) {
  return typeof id === "string"
    ? OUTLOOK_FEATURE_CATALOG.find((feature) => feature.id === id) ?? null
    : null;
}
