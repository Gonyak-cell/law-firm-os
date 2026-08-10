/**
 * OUTM-06 is the forward Outlook task-pane contract.
 *
 * Browser assertions live in test tooling. This production module contains
 * only the frozen vocabulary and the path-scoped Office manifest exemption.
 */

const PROFILE_KEYS = Object.freeze(["matter-full", "inquiry-only"]);
const VIEWPORT_WIDTHS = Object.freeze([320, 360, 390]);
const LEGACY_SURFACE_SELECTORS = Object.freeze([
  ".eyebrow",
  ".mode-badge",
  ".pane-subtitle",
  ".subtitle",
  ".helper",
  ".helper-text",
  ".field-note",
  ".safe-copy",
  ".status-stack",
  ".status-grid",
  ".status-line",
  ".operation-summary",
  ".rail-label",
  ".rail-tooltip",
]);
const LEGACY_VISIBLE_STRINGS = Object.freeze([
  "메일 처리",
  "확인 후 저장",
  "연결 설정",
  "현재 메일",
  "이 메일 처리",
  "최근 기록",
  "연결 정보 정리 다시 시도",
]);

const MATTER_RAIL_ACTIONS = Object.freeze([
  Object.freeze({
    id: "mail.save-with-attachments",
    accessibleName: "저장 옵션",
    visibleLabel: true,
    tooltip: false,
    badge: false,
  }),
  Object.freeze({
    id: "matter.search",
    accessibleName: "저장 위치 선택",
    visibleLabel: true,
    tooltip: false,
    badge: false,
  }),
  Object.freeze({
    id: "task.create",
    accessibleName: "관련 작업 만들기",
    visibleLabel: true,
    tooltip: false,
    badge: false,
  }),
  Object.freeze({
    id: "time-entry.draft",
    accessibleName: "시간 기록 초안",
    visibleLabel: true,
    tooltip: false,
    badge: false,
  }),
  Object.freeze({
    id: "all-functions",
    accessibleName: "추가 작업",
    visibleLabel: true,
    tooltip: false,
    badge: false,
  }),
]);
const INQUIRY_ENTRY = Object.freeze({
  profile: "inquiry-only",
  triggerIcon: "UserPlus",
  triggerCount: 1,
  actions: Object.freeze(["inquiry.create", "inquiry.link-existing"]),
  visibleLabel: false,
  tooltip: false,
  badge: false,
  fullSurfaceImport: false,
  matterActionEscalation: false,
  queryEscalation: false,
});
const FORBIDDEN_VISIBLE_COPY = Object.freeze({
  strings: Object.freeze([
    "메일 처리",
    "확인 후 저장",
    "연결 상태",
    "연결 설정",
    "현재 메일",
    "이 메일 처리",
    "최근 기록",
    "연결 정보 정리 다시 시도",
  ]),
  selectors: Object.freeze([
    ".eyebrow",
    ".mode-badge",
    ".pane-header",
    ".status-stack",
    ".status-line",
    ".pane-section",
    ".action-list",
    ".action-item",
    ".operation-summary",
  ]),
  visibleStatusLines: 1,
  fullRecoveryCopyHidden: true,
  statusDashboard: false,
  rawErrorCopyVisible: false,
});

export const OUTLOOK_UI_CONTRACT = Object.freeze({
  id: "OUTM-06",
  version: "outm-06.v3",
  status: "implemented_local_proof",
  profiles: PROFILE_KEYS,
  viewportWidths: VIEWPORT_WIDTHS,
  shellSelector: '[data-ui-shell="outm-06"]',
  matterRailProfile: "matter-full",
  matterRailActions: MATTER_RAIL_ACTIONS,
  matterNavigation: "filing_text_actions",
  hostDomAccess: false,
  inquiryEntry: INQUIRY_ENTRY,
  forbiddenVisibleCopy: FORBIDDEN_VISIBLE_COPY,
  criticalValueSelector: "[data-ui-critical-value]",
  legacySurfaceSelectors: LEGACY_SURFACE_SELECTORS,
  legacyVisibleStrings: LEGACY_VISIBLE_STRINGS,
  requirements: Object.freeze({
    railLabels: "matter_text_actions_only",
    railTooltips: false,
    visibleTextLines: 1,
    titleAttributes: false,
    criticalScrollerOnlySemanticMarker: true,
    fullAccessibleNames: true,
    placeholderIsCueOnly: true,
    criticalValues: "full_copyable_horizontal_scroll",
    ordinaryOverflow: "ellipsis",
    fullHiddenLiveError: true,
    iconTargetMinimumPx: 32,
    railTargetPx: 44,
    keyboardFocusRing: true,
    reducedMotion: true,
    shellScrollWidthExact: true,
    officeManifestMetadataExempt: true,
  }),
});

/**
 * Office XML is outside the task-pane DOM contract. The exemption is
 * selected by caller path/scope; XML is never parsed as UI.
 */
export function isOfficeManifestScope({ pathName = "", scope = "" } = {}) {
  const normalizedPath = String(pathName).replaceAll("\\", "/").toLowerCase();
  const normalizedScope = String(scope).toLowerCase();
  return normalizedScope === "office-manifest"
    || normalizedPath.endsWith("/manifest.xml")
    || normalizedPath.endsWith("/manifest.production.xml")
    || normalizedPath.endsWith("/manifest.inquiry.xml")
    || normalizedPath.endsWith("/manifest.inquiry.production.xml");
}
