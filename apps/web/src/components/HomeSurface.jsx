import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  X
} from "lucide-react";
import heroHomeArchitecture from "../assets/heroes/hero-home-architecture.jpg";
import { backendCapabilities } from "../data/capabilityMap.js";
import {
  fetchAiReviewQueue,
  fetchAnalyticsDashboards,
  fetchAnalyticsFinanceCashflow,
  fetchCrmAccounts,
  fetchCrmLeads,
  fetchCrmOpportunities,
  fetchDataRoomProjections,
  decideHomeActionInboxItem,
  fetchFinanceArAging,
  fetchFinanceInvoices,
  fetchFinanceTimeEntries,
  fetchHomeActionInbox,
  fetchHomeAgenda,
  fetchHomeFeed,
  fetchMasterDataRecords,
  fetchMatterRecords,
  fetchPortalDashboard,
  fetchPortalRfi,
  fetchUserProfile,
  isDesktopRendererLocation,
  readLawosApiSession,
  readLawosSessionEnvelope,
  fetchVaultDocuments
} from "../data/apiClient.js";
import { canAccessHomeFinanceSection } from "../data/financeAccess.js";
import { emitHomeMetric, homeMetricNowMs } from "../data/homeTelemetry.js";
import { fetchHrxPeopleOverview } from "../people/hrxApiClient.ts";
import { FinanceSurface } from "./FinanceSurface.jsx";
import { HomePayrollDonutChart, HomeRevenueLineChart } from "./HomeDashboardCharts.jsx";
import {
  buildClientDashboardModel,
  buildBankCashflowDashboardModel,
  buildLeaveDashboardModel,
  buildMatterDashboardModel,
  dashboardResultState,
  seoulMonthKey
} from "./HomeDashboardModel.js";
import { DashboardListCard, DashboardRecordList, DashboardRecordRow } from "./DashboardList.jsx";

const heroDateFormatter = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" });
const monthFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" });
const selectedDateFormatter = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" });
const homeDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const cashflowBasisFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});
const cashflowDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const homeMoneyFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const calendarWeekdays = Object.freeze(["일", "월", "화", "수", "목", "금", "토"]);
const emptyHomeCounts = Object.freeze({ approval: 0, task_late: 0, task_today: 0 });
const feedTabs = Object.freeze([
  { id: "notice", labelKey: "homeFeedNotice", label: "공지사항", emptyKey: "homeFeedNoticeEmpty", empty: "표시할 공지가 없습니다." },
  { id: "newsletter", labelKey: "homeFeedNewsletter", label: "뉴스레터", emptyKey: "homeFeedNewsletterEmpty", empty: "새 뉴스레터가 없습니다." }
]);
const clientDashboardTabs = Object.freeze([
  { id: "new", label: "신규 고객" },
  { id: "prospects", label: "잠재고객" }
]);
const matterDashboardTabs = Object.freeze([
  { id: "new", label: "신규 매터" },
  { id: "closed", label: "종결된 매터" }
]);
const messageTabs = Object.freeze([
  { id: "send", section: "messages-send", labelKey: "messageTabSend", label: "전송" },
  { id: "automation", section: "messages-automation", labelKey: "messageTabAutomation", label: "자동화" },
  { id: "templates", section: "messages-templates", labelKey: "messageTabTemplates", label: "템플릿" },
  { id: "notices", section: "messages-notices", labelKey: "messageTabNotices", label: "공지" },
  { id: "matter", section: "messages-matter-channel", labelKey: "messageTabMatter", label: "Matter 대화" }
]);
const requestTabs = Object.freeze([
  { id: "received", labelKey: "requestTabReceived", label: "받은 요청" },
  { id: "sent", labelKey: "requestTabSent", label: "보낸 요청" }
]);
const requestFilters = Object.freeze([
  { id: "all", section: "requests-inbox", labelKey: "requestFilterAll", label: "전체", subtypes: [] },
  { id: "leave", section: "requests-leave", labelKey: "requestFilterLeave", label: "휴가", subtypes: ["leave"] },
  { id: "expenses", section: "requests-expenses", labelKey: "requestFilterExpenses", label: "비용", subtypes: ["cost", "expense", "expenses"] },
  { id: "finance", section: "requests-finance", labelKey: "requestFilterFinance", label: "재무", subtypes: ["finance", "billing", "prebill", "invoice"] },
  { id: "certificates", section: "requests-certificates", labelKey: "requestFilterCertificates", label: "증명서", subtypes: ["certificate", "certificates"] },
  { id: "attendance", section: "requests-attendance", labelKey: "requestFilterAttendance", label: "근무기록", subtypes: ["attendance", "work_record"] },
  { id: "custom", section: "requests-custom", labelKey: "requestFilterCustom", label: "커스텀", subtypes: ["custom"] },
  { id: "force", section: "requests-force-decision", labelKey: "requestFilterForce", label: "강제", subtypes: ["force", "force_decision"] }
]);
const esignTabs = Object.freeze([
  { id: "send", section: "esign-send", labelKey: "messageTabSend", label: "전송" },
  { id: "templates", section: "esign-templates", labelKey: "messageTabTemplates", label: "템플릿" },
  { id: "status", section: "esign-status", labelKey: "esignTabStatus", label: "상태" },
  { id: "settings", section: "esign-settings", labelKey: "homeSettingsLabel", label: "설정" }
]);
const companyTabs = Object.freeze([
  { id: "reports-home-dashboard", label: "Home" },
  { id: "reports-people-live", label: "실시간" },
  { id: "reports-people-snapshots", label: "스냅샷" },
  { id: "reports-people-items", label: "항목" },
  { id: "reports-people-attention", label: "주의 항목" },
  { id: "reports-client", label: "Client" },
  { id: "reports-matter-analytics", label: "Matter" }
]);
const homeFinanceSectionIds = new Set([
  "home-finance-overview",
  "home-finance-monthly",
  "home-finance-clients",
  "home-finance-cashflow",
  "home-finance-time",
  "home-finance-expenses",
  "home-finance-billing",
  "home-finance-ar"
]);
const homeDashboardSectionIds = new Set(["home-dashboard", "home-feed", "home-calendar"]);
const homeSectionMeta = Object.freeze({
  "home-dashboard": { eyebrow: "Home", title: "" },
  "home-finance-overview": { eyebrowKey: "homeFinanceLabel", eyebrow: "매출/비용", titleKey: "homeFinanceOverviewLabel", title: "전체 현황" },
  "home-finance-monthly": { eyebrowKey: "homeFinanceLabel", eyebrow: "매출/비용", titleKey: "homeFinanceMonthlyLabel", title: "월별 매출/비용" },
  "home-finance-clients": { eyebrowKey: "homeFinanceLabel", eyebrow: "매출/비용", titleKey: "homeFinanceClientsLabel", title: "고객별 매출/비용" },
  "home-finance-cashflow": { eyebrowKey: "homeFinanceLabel", eyebrow: "매출/비용", titleKey: "homeFinanceCashflowLabel", title: "자금현황" },
  "home-finance-time": { eyebrowKey: "homeFinanceLabel", eyebrow: "매출/비용", titleKey: "homeFinanceTimeLabel", title: "시간 기록" },
  "home-finance-expenses": { eyebrowKey: "homeFinanceLabel", eyebrow: "매출/비용", titleKey: "homeFinanceExpensesLabel", title: "비용 처리" },
  "home-finance-billing": { eyebrowKey: "homeFinanceLabel", eyebrow: "매출/비용", titleKey: "homeFinanceBillingLabel", title: "청구/수납" },
  "home-finance-ar": { eyebrowKey: "homeFinanceLabel", eyebrow: "매출/비용", titleKey: "homeFinanceArLabel", title: "미수금" },
  "home-todo": { eyebrowKey: "homeTodoSidebarLabel", eyebrow: "할 일", titleKey: "homeTodoSidebarLabel", title: "할 일" },
  "home-feed": { eyebrowKey: "homeFeedSidebarLabel", eyebrow: "피드", titleKey: "homeWidgetFeedTitle", title: "피드", subtitleKey: "homeFeedTabLabel", subtitle: "홈 피드" },
  "home-calendar": { eyebrowKey: "homeCalendarSidebarLabel", eyebrow: "캘린더", titleKey: "homeWidgetCalendarTitle", title: "캘린더", subtitleKey: "homeCalendarOpen", subtitle: "캘린더 열기" },
  "home-meeting-rooms": { eyebrowKey: "homeMeetingRoomsLabel", eyebrow: "회의실 예약", titleKey: "homeMeetingRoomsLabel", title: "회의실 예약" },
  "home-messages": { eyebrowKey: "homeMessagesLabel", eyebrow: "메시지", titleKey: "homeMessagesLabel", title: "메시지", subtitleKey: "homeMessagesSubtitle", subtitle: "업무 메시지" },
  "home-requests": { eyebrowKey: "homeRequestsLabel", eyebrow: "승인 대기", titleKey: "homeRequestsLabel", title: "승인 대기" },
  "home-requests-leave": { eyebrowKey: "homeRequestsLabel", eyebrow: "승인 대기", titleKey: "requestFilterLeave", title: "휴가" },
  "home-requests-expenses": { eyebrowKey: "homeRequestsLabel", eyebrow: "승인 대기", titleKey: "requestFilterExpenses", title: "비용처리" },
  "home-esign": { eyebrowKey: "homeEsignLabel", eyebrow: "전자계약", titleKey: "homeEsignLabel", title: "전자계약", subtitleKey: "homeEsignSubtitle", subtitle: "서명 상태" },
  "home-company": { eyebrowKey: "homeCompanyLabel", eyebrow: "회사 현황", titleKey: "homeCompanyLabel", title: "회사 현황", subtitleKey: "homeCompanySubtitle", subtitle: "감사" }
});
const HOME_ONBOARDING_STORAGE_KEY = "matter.home.onboarding";
const DESKTOP_HOME_FEATURE_IDS = Object.freeze({
  client: "client_dashboard",
  matter: "matter_vault_dashboard",
  people: "people_dashboard",
  vault: "vault_dashboard"
});
const genericSessionDisplayNames = new Set(["사용자", "세션 사용자"]);
const noop = () => {};
const HOME_ACTION_UNDO_WINDOW_MS = 5000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function homeCopy(labels, key, fallback) {
  return labels?.[key] ?? fallback;
}

function localizedTabs(tabs, labels) {
  return tabs.map((tab) => ({
    ...tab,
    label: homeCopy(labels, tab.labelKey, tab.label),
    empty: homeCopy(labels, tab.emptyKey, tab.empty),
    sources: homeCopy(labels, tab.sourcesKey, tab.sources)
  }));
}

function localizedHomeSectionMeta(meta, labels) {
  return {
    ...meta,
    eyebrow: homeCopy(labels, meta.eyebrowKey, meta.eyebrow),
    title: homeCopy(labels, meta.titleKey, meta.title),
    subtitle: homeCopy(labels, meta.subtitleKey, meta.subtitle)
  };
}

function sessionText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sessionFirst(records, keys) {
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    for (const key of keys) {
      const value = sessionText(record[key]);
      if (value) return value;
    }
  }
  return "";
}

function sessionDisplayName(records) {
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    for (const key of ["display_name", "name", "user_name"]) {
      const value = sessionText(record[key]);
      if (value && !genericSessionDisplayNames.has(value)) return value;
    }
  }
  return "";
}

function sessionRoleIds(records) {
  return records.flatMap((record) => (Array.isArray(record?.role_ids) ? record.role_ids : []));
}

function sessionHasExplicitNonApproverRole(records) {
  const roleIds = sessionRoleIds(records).map((role) => String(role).toLowerCase());
  if (roleIds.length === 0) return false;
  return !roleIds.some((role) => /admin|approver|approval|partner|manager|hr|legal|lawos_staff/.test(role));
}

function sessionProfessionalLabel(records) {
  const title = sessionFirst(records, ["title", "source_title", "primary_role_label", "role_label", "position", "job_title"]);
  const roleText = `${title} ${sessionRoleIds(records).join(" ")}`;
  if (/변호사|attorney|lawyer/i.test(roleText)) return "변호사";
  if (/회계사|공인회계사|\bcpa\b|accountant/i.test(roleText)) return "회계사";
  if (/deal advisor|deal advisory|자문역|자문위원/i.test(roleText)) return title || "Deal Advisor";
  return title.split(/[\s/,]+/).filter(Boolean)[0] ?? "";
}

export function sessionGreeting(profileUser, desktopStatus) {
  const apiSession = readLawosApiSession() ?? {};
  const sessionEnvelope = readLawosSessionEnvelope() ?? {};
  const records = [
    profileUser,
    desktopStatus,
    apiSession.session,
    apiSession.account,
    apiSession.user,
    apiSession.principal,
    apiSession,
    sessionEnvelope
  ];
  const name = sessionDisplayName(records) || "사용자";
  const professionalLabel = sessionProfessionalLabel(records);
  if (name.endsWith("님")) return `Welcome, ${name}`;
  return `Welcome, ${[name, professionalLabel].filter(Boolean).join(" ")}님`;
}

function desktopSessionBridge(source = globalThis) {
  const bridge = source?.matterSession ?? source?.window?.matterSession;
  if (typeof bridge?.status !== "function" || typeof bridge?.smoke !== "function") return null;
  try {
    const location = source?.location ?? source?.window?.location;
    if (!isDesktopRendererLocation(location)) return null;
  } catch {
    return null;
  }
  return bridge;
}

function safeHomeReadProbeResult(source = "home") {
  return {
    kind: "data",
    uiState: "allowed",
    outcome: "empty",
    items: [],
    source,
    readProbeRecovered: true
  };
}

function desktopSmokeResult(response) {
  const httpStatus = Number(response?.http_status ?? response?.status);
  if (
    response?.allowed === true ||
    response?.decision === "allow" ||
    response?.ok === true ||
    (Number.isFinite(httpStatus) && httpStatus >= 200 && httpStatus < 400)
  ) {
    return {
      kind: "data",
      uiState: "allowed",
      outcome: "allowed",
      items: [],
      desktopBridge: true
    };
  }
  if (httpStatus === 403) {
    return {
      kind: "data",
      uiState: "denied",
      outcome: "denied",
      items: [],
      desktopBridge: true
    };
  }
  return { ...safeHomeReadProbeResult("desktop_smoke"), desktopBridge: true };
}

async function fetchDesktopHomeBridgeResults() {
  const bridge = desktopSessionBridge();
  if (!bridge) return null;
  let session;
  try {
    session = await bridge.status();
  } catch {
    return null;
  }
  if (session?.state !== "signed_in") return null;
  const ids = ["client", "matter", "people", "vault"];
  return Promise.all(
    ids.map(async (id) => {
      try {
        const response = await bridge.smoke({ featureId: DESKTOP_HOME_FEATURE_IDS[id] });
        return { id, result: desktopSmokeResult(response) };
      } catch {
        return { id, result: { ...safeHomeReadProbeResult("desktop_smoke"), desktopBridge: true } };
      }
    })
  );
}

async function homeReadProbe(promise, source) {
  try {
    const result = await promise;
    return result?.kind === "error" || !result ? safeHomeReadProbeResult(source) : result;
  } catch {
    return safeHomeReadProbeResult(source);
  }
}

async function dashboardReadProbe(promise, source) {
  try {
    const result = await promise;
    return result ?? { kind: "error", source };
  } catch {
    return { kind: "error", source };
  }
}

async function readHomeMatterSessionStatus() {
  const bridge = desktopSessionBridge();
  if (!bridge) return null;
  try {
    const status = await bridge.status();
    return status?.state === "signed_in" ? status : null;
  } catch {
    return null;
  }
}

function readHomeOnboardingDismissed() {
  try {
    return window.localStorage.getItem(HOME_ONBOARDING_STORAGE_KEY) === "dismissed";
  } catch {
    return false;
  }
}

function writeHomeOnboardingDismissed() {
  try {
    window.localStorage.setItem(HOME_ONBOARDING_STORAGE_KEY, "dismissed");
    return true;
  } catch {
    return false;
  }
}

export function normalizeStatus(result) {
  if (!result) return "loading";
  if (result.kind === "error") return "live";
  if (result.kind === "step_up_required") return "guarded";
  if (result.uiState === "denied") return "denied";
  if (result.uiState === "review_required" || result.outcome === "review_required") return "review";
  if (result.kind === "data") return "live";
  return "guarded";
}

export function statusBadgeLabel(status, labels = {}) {
  if (status === "live") return homeCopy(labels, "homeSystemOk", "정상");
  if (status === "loading") return homeCopy(labels, "statusLoading", "확인 중");
  if (status === "unavailable") return homeCopy(labels, "homeSystemNeedsReview", "확인 필요");
  if (status === "denied") return homeCopy(labels, "statusDenied", "권한 없음");
  if (status === "review") return homeCopy(labels, "statusReview", "검토");
  return homeCopy(labels, "homeSystemNeedsReview", "확인 필요");
}

function buildProbeMap(results) {
  const byId = new Map(results.map((result) => [result.id, result]));
  return backendCapabilities.map((capability) => ({
    ...capability,
    result: byId.get(capability.id)?.result ?? null,
    status: normalizeStatus(byId.get(capability.id)?.result)
  }));
}

function itemsFromResult(result) {
  if (!result || result.kind !== "data") return [];
  if (Array.isArray(result.items)) return result.items;
  if (Array.isArray(result.employees)) return result.employees;
  if (Array.isArray(result.approvals)) return result.approvals;
  return [result];
}

export function combinePillarResults(results) {
  const guardedResult =
    results.find((result) => result?.uiState === "denied") ??
    results.find((result) => result?.uiState === "review_required" || result?.outcome === "review_required") ??
    results.find((result) => result?.kind === "step_up_required");
  if (guardedResult) return guardedResult;

  const liveResults = results.filter((result) => result?.kind === "data");
  if (liveResults.length > 0) {
    return {
      kind: "data",
      uiState: "allowed",
      outcome: "allowed",
      items: liveResults.flatMap(itemsFromResult)
    };
  }
  return safeHomeReadProbeResult("pillar_read_probe");
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthWindow(date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function parseDate(value) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function formatDateTime(value) {
  const parsed = parseDate(value);
  return parsed ? homeDateTimeFormatter.format(parsed) : "기한 없음";
}

function dashboardMatterTitle(item, index = 0) {
  return item?.matter_code ?? item?.matter_number ?? item?.title ?? `Matter ${index + 1}`;
}

function dashboardClientTitle(item) {
  return item?.client_display_name ?? item?.client_group_label ?? item?.display_name ?? item?.party_display_name ?? "고객 미지정";
}

function dashboardRecordStatusLabel(value) {
  const labels = {
    active: "진행 중",
    opening: "수임 준비",
    closed: "종결",
    review: "검토 중",
    review_required: "검토 필요",
    pending: "대기",
    approved: "승인"
  };
  return labels[String(value ?? "").trim().toLowerCase()] ?? undefined;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDeltaFromToday(value) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return Math.round((startOfLocalDay(parsed).getTime() - startOfLocalDay(new Date()).getTime()) / MS_PER_DAY);
}

function taskDeadlineInfo(item) {
  const delta = dayDeltaFromToday(item?.due_at);
  if (delta === null) return { bucket: "upcoming", label: "기한 없음", order: 3 };
  if (delta < 0) return { bucket: "late", label: `D+${Math.abs(delta)}`, order: 0 };
  if (delta === 0) return { bucket: "today", label: "오늘", order: 1 };
  return { bucket: "upcoming", label: `D-${delta}`, order: 2 };
}

function dueSortValue(value) {
  return parseDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function homeActionStatus(item) {
  if (item.risk_tier === "high") return "review";
  if (item.risk_tier === "medium") return "guarded";
  return "live";
}

function homeActionRoute(item) {
  if (item.matter_ref) return item.type === "task" ? "matter-tasks" : "matter-approvals";
  return item.type === "task" ? "home-dashboard" : "home-requests";
}

function textKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function redirectedSection(redirectedFrom, view) {
  return redirectedFrom?.view === view ? String(redirectedFrom.section ?? "") : "";
}

function tabIdFromSection(tabs, section, fallback) {
  return tabs.find((tab) => tab.section === section)?.id ?? fallback;
}

function companyTabFromSection(section) {
  return companyTabs.some((tab) => tab.id === section) ? section : "reports-home-dashboard";
}

function requestFilterFromSection(section) {
  return requestFilters.find((filter) => filter.section === section)?.id ?? "all";
}

function requestSubtypeKey(item) {
  const subtype = textKey(item?.subtype);
  if (["cost", "expense", "expenses"].includes(subtype)) return "expenses";
  if (["certificate", "certificates"].includes(subtype)) return "certificates";
  if (["attendance", "work_record"].includes(subtype)) return "attendance";
  if (["force", "force_decision"].includes(subtype)) return "force";
  if (subtype === "leave" || subtype === "custom") return subtype;
  return subtype || "all";
}

function filterRequestItems(items, filterId) {
  if (filterId === "all") return items;
  if (filterId === "finance") return items.filter((item) => ["finance", "expenses"].includes(requestSubtypeKey(item)));
  return items.filter((item) => requestSubtypeKey(item) === filterId);
}

function activeHomeContext(activeSection, redirectedFrom) {
  const messageSection = redirectedSection(redirectedFrom, "messages");
  const requestSection = redirectedSection(redirectedFrom, "requests");
  const esignSection = redirectedSection(redirectedFrom, "esign");
  const companySection = redirectedSection(redirectedFrom, "reports");
  const routeFilter = redirectedFrom?.filter ?? new URLSearchParams(globalThis.location?.search ?? "").get("filter");
  return {
    messageTab: tabIdFromSection(messageTabs, messageSection, "send"),
    requestTab: requestSection.includes("sent") ? "sent" : "received",
    requestFilter: activeSection === "home-requests-leave"
      ? "leave"
      : activeSection === "home-requests-expenses"
        ? "expenses"
        : routeFilter === "finance"
          ? "finance"
          : requestFilterFromSection(requestSection),
    esignTab: tabIdFromSection(esignTabs, esignSection, "send"),
    companyTab: companyTabFromSection(companySection),
    section: homeSectionMeta[activeSection] ? activeSection : "home-dashboard"
  };
}

function actionButtonLabel(action, labels = {}) {
  if (action === "approve") return homeCopy(labels, "homeActionApprove", "승인");
  if (action === "reject") return homeCopy(labels, "homeActionReject", "반려");
  if (action === "complete") return homeCopy(labels, "homeActionComplete", "완료");
  return homeCopy(labels, "homeActionOpen", "열기");
}

function buildHomeActionRows(items, type, labels = {}) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const deadline = type === "task" ? taskDeadlineInfo(item) : null;
    const deadlineLabel = deadline?.bucket === "today" ? homeCopy(labels, "homeTodoToday", "오늘") : deadline?.label;
    const matterCandidate = item.matter_code ?? item.matter_title;
    const matterLabel = matterCandidate && !String(matterCandidate).includes("_") ? matterCandidate : item.matter_ref ? "매터 연결" : null;
    return {
      id: item.id,
      title: item.title,
      meta: [item.requester, formatDateTime(item.due_at), matterLabel].filter(Boolean).join(", "),
      status: deadline?.bucket ?? homeActionStatus(item),
      statusLabel: deadlineLabel ?? statusBadgeLabel(homeActionStatus(item), labels),
      route: homeActionRoute({ ...item, type }),
      type,
      focusId: item.resource_id ?? item.id,
      dueAt: item.due_at ?? null,
      deadlineBucket: deadline?.bucket ?? null,
      deadlineOrder: deadline?.order ?? 0,
      allowedActions: Array.isArray(item.allowed_actions) ? item.allowed_actions : ["open"]
    };
  });
}

function sortApprovalRows(rows) {
  return [...rows].sort((left, right) => dueSortValue(left.dueAt) - dueSortValue(right.dueAt) || String(left.id).localeCompare(String(right.id)));
}

function sortTodoRows(rows) {
  return [...rows].sort((left, right) => (
    left.deadlineOrder - right.deadlineOrder ||
    dueSortValue(left.dueAt) - dueSortValue(right.dueAt) ||
    String(left.id).localeCompare(String(right.id))
  ));
}

function countTotal(counts = emptyHomeCounts) {
  return Number(counts.approval ?? 0) + Number(counts.task_late ?? 0) + Number(counts.task_today ?? 0);
}

function decrementCountsForRow(counts = emptyHomeCounts, row = {}) {
  const nextCounts = { ...counts };
  if (row.type === "approval") {
    nextCounts.approval = Math.max(0, Number(nextCounts.approval ?? 0) - 1);
  }
  if (row.type === "task" && row.deadlineBucket === "late") {
    nextCounts.task_late = Math.max(0, Number(nextCounts.task_late ?? 0) - 1);
  }
  if (row.type === "task" && row.deadlineBucket === "today") {
    nextCounts.task_today = Math.max(0, Number(nextCounts.task_today ?? 0) - 1);
  }
  return nextCounts;
}

function agendaForDate(events, date) {
  const selectedKey = dateKey(date);
  return (Array.isArray(events) ? events : []).filter((event) => {
    const startsAt = parseDate(event.starts_at);
    return startsAt && dateKey(startsAt) === selectedKey;
  });
}

function agendaSummaryByDate(events) {
  const summaries = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    const startsAt = parseDate(event.starts_at);
    if (!startsAt) continue;
    const key = dateKey(startsAt);
    const current = summaries.get(key) ?? { total: 0, deadline: 0 };
    current.total += 1;
    if (event.kind === "deadline") current.deadline += 1;
    summaries.set(key, current);
  }
  return summaries;
}

function upcomingDeadline(events) {
  const now = Date.now();
  return (Array.isArray(events) ? events : [])
    .filter((event) => event.kind === "deadline")
    .sort((left, right) => dueSortValue(left.starts_at) - dueSortValue(right.starts_at))
    .find((event) => dueSortValue(event.starts_at) >= now) ?? null;
}

function feedEmptyMessage(tab, tabSpec, result, labels = {}) {
  if (result.kind === "loading") return homeCopy(labels, "homeFeedLoading", "피드를 불러오는 중입니다.");
  if (tab === "news" && result.safeErrorCodes?.includes("HOME_NEWS_ALL_SOURCES_FAILED")) {
    return homeCopy(labels, "homeFeedNewsFailed", "뉴스 피드를 불러오지 못했습니다.");
  }
  return tabSpec.empty;
}

function buildMonthCells(baseDate) {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const todayKey = dateKey(new Date());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      key: dateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === baseDate.getMonth(),
      isSunday: date.getDay() === 0,
      isToday: dateKey(date) === todayKey
    };
  });
}

function DashboardCard({ className = "", title, children, widgetId, section = widgetId, onViewAll, headerExtra = null, viewAllLabel = "전체 보기" }) {
  const hasHeader = Boolean(title || headerExtra || onViewAll);
  return (
    <section className={`home-dashboard-card ${className}`} data-widget-id={widgetId} data-dashboard-section={section}>
      {hasHeader && (
        <header className="home-dashboard-card-header">
          <div>
            <span>{title}</span>
          </div>
          <div className="home-dashboard-card-actions">
            {headerExtra}
            {onViewAll && (
              <button type="button" className="home-widget-view-all" data-home-widget-view-all={widgetId} aria-label={viewAllLabel} onClick={onViewAll}>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </header>
      )}
      <div className="home-dashboard-card-body">{children}</div>
    </section>
  );
}

function dashboardSafeLabel(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text || /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text) || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)) return fallback;
  if (/^(?:account|client|lead|opportunity|opp|party|matter|user|tenant)[_:-]/i.test(text)) return fallback;
  return text;
}

function dashboardKrw(value) {
  return `₩ ${homeMoneyFormatter.format(Number(value) || 0)}`;
}

function dashboardStateCopy(state, noun) {
  if (state === "loading") return `${noun}을 불러오는 중입니다.`;
  if (state === "denied") return `${noun} 접근 권한이 없습니다.`;
  if (state === "review_required") return `${noun} 확인을 위해 추가 인증이 필요합니다.`;
  if (state === "partial") return `${noun} 일부 원천을 확인하지 못했습니다.`;
  if (state === "error") return `${noun}을 불러오지 못했습니다.`;
  return `표시할 ${noun} 데이터가 없습니다.`;
}

function HomeDashboardState({ state, noun, children }) {
  if (state === "data") return children;
  if (state === "partial") {
    return (
      <>
        <div className="home-dashboard-inline-state partial" role="status">{dashboardStateCopy(state, noun)}</div>
        {children}
      </>
    );
  }
  return <div className={`home-dashboard-read-state ${state}`} role="status">{dashboardStateCopy(state, noun)}</div>;
}

function HomeKpiCard({ title, state, amount, basis, changePercent, section, onOpen }) {
  const valueState = ["data", "partial"].includes(state) && amount === null ? "empty" : state;
  return (
    <DashboardCard
      className="home-dashboard-kpi-card"
      title={title}
      section={section}
      onViewAll={onOpen}
      viewAllLabel={`${title} 상세 보기`}
    >
      <HomeDashboardState state={valueState} noun={title}>
        <div className="home-dashboard-kpi-value">
          <strong>{dashboardKrw(amount)}</strong>
          {Number.isFinite(changePercent) && (
            <span className={changePercent < 0 ? "negative" : "positive"}>
              {changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%
            </span>
          )}
        </div>
        <small>{basis}</small>
      </HomeDashboardState>
    </DashboardCard>
  );
}

function HomeCashflowBand({ result, onOpen }) {
  const summary = result?.item?.summary;
  const state = dashboardResultState(result);
  if (!summary || !["data", "partial"].includes(state)) return null;
  const basis = summary.basis_at ? cashflowBasisFormatter.format(new Date(summary.basis_at)) : "기준 시각 확인 중";
  const reconciliation = result?.item?.reconciliation?.status === "passed" ? "대사 완료" : "대사 확인";
  const metrics = [
    { id: "balance", label: "현재 잔액", value: summary.current_balance },
    { id: "inflow", label: "이번달 입금", value: summary.total_inflow },
    { id: "outflow", label: "이번달 출금", value: summary.total_outflow },
    { id: "net", label: "순이동", value: summary.net_movement },
  ];
  return (
    <button
      type="button"
      className="home-dashboard-cashflow-band"
      data-dashboard-section="cashflow"
      data-home-cashflow-band="true"
      aria-label="자금현황 상세 보기"
      onClick={onOpen}
    >
      <span className="home-cashflow-band-title">
        <strong>자금현황</strong>
        <small>{basis} 기준 {reconciliation}</small>
      </span>
      <span className="home-cashflow-band-metrics">
        {metrics.map((metric) => (
          <span key={metric.id} className={`home-cashflow-band-metric ${metric.id === "net" && Number(metric.value) < 0 ? "negative" : ""}`}>
            <small>{metric.label}</small>
            <strong>{dashboardKrw(metric.value)}</strong>
          </span>
        ))}
      </span>
      <ArrowRight className="home-cashflow-band-arrow" size={20} aria-hidden="true" />
    </button>
  );
}

function HomeSummaryMetric({ label, value, state = "data" }) {
  const readable = state === "data" || state === "empty";
  return (
    <div>
      <span>{label}</span>
      <strong>{readable ? `${value}건` : "—"}</strong>
    </div>
  );
}

function DashboardRow({
  id,
  title,
  meta,
  status,
  statusLabel,
  route,
  type,
  focusId,
  deadlineBucket,
  onOpen,
  allowedActions = [],
  onAction,
  pending = false,
  labels = {}
}) {
  const inlineActions = allowedActions.filter((action) => action !== "open");
  return (
    <div
      className={`home-dashboard-row ${status}`}
      data-home-action-id={id}
      data-home-action-type={type}
      data-home-action-row={route}
      data-home-deadline-bucket={deadlineBucket ?? undefined}
      data-compact-record="true"
    >
      <button
        type="button"
        className="home-dashboard-row-main"
        data-home-task-focus-route={type === "task" ? route : undefined}
        data-home-task-focus-id={type === "task" ? focusId : undefined}
        onClick={() => onOpen(route)}
      >
        <span>
          <strong>{title}</strong>
          <small>{meta}</small>
        </span>
      </button>
      <em>{statusLabel ?? statusBadgeLabel(status)}</em>
      {inlineActions.length > 0 ? (
        <span className="home-dashboard-row-actions">
          {inlineActions.map((action) => (
            action === "complete" ? (
              <button
                key={action}
                type="button"
                className="home-task-check-button"
                role="checkbox"
                aria-checked="false"
                disabled={pending}
                data-home-inline-action={action}
                data-home-task-checkbox={id}
                aria-label={`${title} ${actionButtonLabel(action, labels)}`}
                onClick={() => onAction?.(action)}
              >
                <CheckCircle2 size={16} />
                <span className="sr-only">{actionButtonLabel(action, labels)}</span>
              </button>
            ) : (
              <button
                key={action}
                type="button"
                className="text-button"
                disabled={pending}
                data-home-inline-action={action}
                aria-label={`${title} ${actionButtonLabel(action, labels)}`}
                onClick={() => onAction?.(action)}
              >
                {actionButtonLabel(action, labels)}
              </button>
            )
          ))}
        </span>
      ) : (
        <button type="button" className="home-dashboard-row-open" aria-label={`${title} ${homeCopy(labels, "homeActionOpen", "열기")}`} onClick={() => onOpen(route)}>
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

function HomeTabList({ label, tabs, activeTab, onSelect, dataPrefix = "home-tab", variant = "" }) {
  const className = variant ? `home-section-tabs ${variant}` : "home-section-tabs";
  return (
    <div className={className} role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeTab === tab.id ? "active" : ""}
          role="tab"
          aria-selected={activeTab === tab.id ? "true" : "false"}
          tabIndex={activeTab === tab.id ? 0 : -1}
          data-home-tab-id={tab.id}
          data-home-tab-active={activeTab === tab.id ? "true" : undefined}
          data-home-tab-prefix={dataPrefix}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function HomeSectionPanel({ section, title, children }) {
  return (
    <section className="home-section-panel" data-home-section-screen={section} aria-label={title}>
      {children}
    </section>
  );
}

function HomeStatusList({ title, count, children, showTitle = true }) {
  if (count <= 0) return null;
  return (
    <section className={showTitle ? "home-status-list" : "home-status-list no-title"} aria-label={title}>
      {showTitle && (
        <header>
        <strong>{title}</strong>
        </header>
      )}
      <div className="home-status-list-body">
        {children}
      </div>
    </section>
  );
}

export function HomeSurface({
  labels,
  setView,
  liveCtx = "allow",
  activeSection = "home-dashboard",
  redirectedFrom = null,
  messageItems = [],
  unreadMessageIds = new Set(),
  onMessageThreadOpen = noop,
  canViewCompanyStatus = false,
  homeCompanyAccessDenied = false,
  onHomeActionCountsChange = noop,
  refreshSignal = 0
}) {
  const initialHomeContext = useMemo(() => activeHomeContext(activeSection, redirectedFrom), [activeSection, redirectedFrom?.view, redirectedFrom?.section]);
  const apiSession = readLawosApiSession();
  const canViewDashboardCashflow = canAccessHomeFinanceSection(
    [apiSession, apiSession?.session, readLawosSessionEnvelope()],
    "home-finance-cashflow"
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const refreshSignalRef = useRef(refreshSignal);
  const [results, setResults] = useState([]);
  const [dashboardResults, setDashboardResults] = useState({
    matters: null,
    accounts: null,
    leads: null,
    opportunities: null,
    cashflow: null,
    cashflowHistory: null
  });
  const [actionInbox, setActionInbox] = useState({
    approval: { kind: "loading", items: [] },
    task: { kind: "loading", items: [] },
    counts: emptyHomeCounts
  });
  const [agendaResult, setAgendaResult] = useState({ kind: "loading", events: [] });
  const [feedResult, setFeedResult] = useState({ kind: "loading", entries: [] });
  const [pendingActionId, setPendingActionId] = useState("");
  const [undoNotice, setUndoNotice] = useState(null);
  const [homeOnboardingDismissed, setHomeOnboardingDismissed] = useState(readHomeOnboardingDismissed);
  const [sessionProfile, setSessionProfile] = useState({ profileUser: null, desktopStatus: null });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const [clientDashboardTab, setClientDashboardTab] = useState("new");
  const [matterDashboardTab, setMatterDashboardTab] = useState("new");
  const [feedTab, setFeedTab] = useState("notice");
  const [messageTab, setMessageTab] = useState(initialHomeContext.messageTab);
  const [requestTab, setRequestTab] = useState(initialHomeContext.requestTab);
  const [requestFilter, setRequestFilter] = useState(initialHomeContext.requestFilter);
  const [esignTab, setEsignTab] = useState(initialHomeContext.esignTab);
  const [companyTab, setCompanyTab] = useState(initialHomeContext.companyTab);
  const [selectedMessageThreadId, setSelectedMessageThreadId] = useState("");
  const [selectedFeedEntryId, setSelectedFeedEntryId] = useState("");
  const pendingActionTimersRef = useRef(new Map());
  const firstActionStartedAtRef = useRef(homeMetricNowMs());
  const firstActionLoggedRef = useRef(false);

  useEffect(() => {
    if (refreshSignalRef.current === refreshSignal) return;
    refreshSignalRef.current = refreshSignal;
    setRefreshToken((value) => value + 1);
  }, [refreshSignal]);

  useEffect(() => {
    setMessageTab(initialHomeContext.messageTab);
    setRequestTab(initialHomeContext.requestTab);
    setRequestFilter(initialHomeContext.requestFilter);
    setEsignTab(initialHomeContext.esignTab);
    setCompanyTab(initialHomeContext.companyTab);
  }, [initialHomeContext]);

  useEffect(() => {
    return () => {
      for (const timer of pendingActionTimersRef.current.values()) clearTimeout(timer);
      pendingActionTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setSelectedFeedEntryId("");
  }, [feedTab]);

  useEffect(() => {
    let cancelled = false;
    setResults([]);
    setDashboardResults({ matters: null, accounts: null, leads: null, opportunities: null, cashflow: null, cashflowHistory: null });
    const args = { ctx: liveCtx };
    async function loadResults() {
      const month = seoulMonthKey(new Date());
      const desktopResults = await fetchDesktopHomeBridgeResults();
      const [
        matters,
        accounts,
        leads,
        opportunities,
        cashflow,
        cashflowHistory,
        clientGroups,
        portal,
        portalRfi,
        matterTime,
        matterInvoices,
        matterAr,
        matterAnalytics,
        matterAiReview,
        peopleOverview,
        vaultDocuments,
        vaultDataRoom
      ] = await Promise.all([
        dashboardReadProbe(fetchMatterRecords(args), "dashboard_matter_records"),
        dashboardReadProbe(fetchCrmAccounts(args), "dashboard_crm_accounts"),
        dashboardReadProbe(fetchCrmLeads(args), "dashboard_crm_leads"),
        dashboardReadProbe(fetchCrmOpportunities(args), "dashboard_crm_opportunities"),
        canViewDashboardCashflow
          ? dashboardReadProbe(fetchAnalyticsFinanceCashflow({
            ...args,
            from: `${month}-01`,
            to: cashflowDateFormatter.format(new Date()),
            currency: "KRW"
          }), "dashboard_finance_cashflow")
          : Promise.resolve({ kind: "data", uiState: "denied", outcome: "denied", item: null }),
        canViewDashboardCashflow
          ? dashboardReadProbe(fetchAnalyticsFinanceCashflow({
            ...args,
            to: cashflowDateFormatter.format(new Date()),
            currency: "KRW"
          }), "dashboard_finance_cashflow_history")
          : Promise.resolve({ kind: "data", uiState: "denied", outcome: "denied", item: null }),
        homeReadProbe(fetchMasterDataRecords({ ...args, modelType: "ClientGroup", limit: 10 }), "client_groups"),
        homeReadProbe(fetchPortalDashboard(args), "client_portal"),
        homeReadProbe(fetchPortalRfi(args), "client_rfi"),
        homeReadProbe(fetchFinanceTimeEntries(args), "matter_time"),
        homeReadProbe(fetchFinanceInvoices(args), "matter_invoices"),
        homeReadProbe(fetchFinanceArAging(args), "matter_ar"),
        homeReadProbe(fetchAnalyticsDashboards(args), "matter_analytics"),
        homeReadProbe(fetchAiReviewQueue(args), "matter_ai_review"),
        homeReadProbe(fetchHrxPeopleOverview(args), "people_overview"),
        homeReadProbe(fetchVaultDocuments(args), "vault_documents"),
        homeReadProbe(fetchDataRoomProjections(args), "vault_data_room")
      ]);
      const dashboard = { matters, accounts, leads, opportunities, cashflow, cashflowHistory };
      if (desktopResults) return { results: desktopResults, dashboard };
      const nextResults = [
        { id: "client", result: combinePillarResults([clientGroups, accounts, leads, opportunities, portal, portalRfi]) },
        { id: "matter", result: combinePillarResults([matters, matterTime, matterInvoices, matterAr, matterAnalytics, matterAiReview]) },
        { id: "people", result: peopleOverview },
        { id: "vault", result: combinePillarResults([vaultDocuments, vaultDataRoom]) }
      ];
      return { results: nextResults, dashboard };
    }
    loadResults().then((next) => {
      if (cancelled) return;
      setResults(next.results);
      setDashboardResults(next.dashboard);
    });
    return () => {
      cancelled = true;
    };
  }, [canViewDashboardCashflow, liveCtx, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setActionInbox((current) => ({
      ...current,
      approval: { kind: "loading", items: [] },
      task: { kind: "loading", items: [] }
    }));
    Promise.all([
      fetchHomeActionInbox({ type: "approval", ctx: liveCtx }),
      fetchHomeActionInbox({ type: "task", ctx: liveCtx })
    ]).then(([approval, task]) => {
      if (cancelled) return;
      const counts = approval.counts ?? task.counts ?? emptyHomeCounts;
      setActionInbox({ approval, task, counts });
      onHomeActionCountsChange(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken, onHomeActionCountsChange]);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = monthWindow(selectedCalendarDate);
    setAgendaResult({ kind: "loading", events: [] });
    fetchHomeAgenda({ from, to, ctx: liveCtx }).then((result) => {
      if (!cancelled) setAgendaResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken, selectedCalendarDate]);

  useEffect(() => {
    let cancelled = false;
    setFeedResult({ kind: "loading", entries: [] });
    fetchHomeFeed({ tab: feedTab, ctx: liveCtx }).then((result) => {
      if (!cancelled) setFeedResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken, feedTab]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([readHomeMatterSessionStatus(), fetchUserProfile({ ctx: liveCtx })]).then((values) => {
      if (cancelled) return;
      const desktopStatus = values[0]?.status === "fulfilled" ? values[0].value : null;
      const profileUser = values[1]?.status === "fulfilled" ? values[1].value?.item : null;
      setSessionProfile({ profileUser, desktopStatus });
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx]);

  const capabilities = useMemo(() => buildProbeMap(results), [results]);
  const localizedMessageTabs = useMemo(() => localizedTabs(messageTabs, labels), [labels]);
  const localizedRequestTabs = useMemo(() => localizedTabs(requestTabs, labels), [labels]);
  const localizedRequestFilters = useMemo(() => localizedTabs(requestFilters, labels), [labels]);
  const localizedEsignTabs = useMemo(() => localizedTabs(esignTabs, labels), [labels]);
  const localizedFeedTabs = useMemo(() => localizedTabs(feedTabs, labels), [labels]);
  const localizedCalendarWeekdays = Array.isArray(labels.homeCalendarWeekdays) ? labels.homeCalendarWeekdays : calendarWeekdays;
  const capabilityById = useMemo(() => new Map(capabilities.map((capability) => [capability.id, capability])), [capabilities]);
  const matterCapability = capabilityById.get("matter") ?? capabilities[0];
  const peopleCapability = capabilityById.get("people") ?? capabilities[0];
  const vaultCapability = capabilityById.get("vault") ?? capabilities[0];
  const reviewCount = capabilities.filter((capability) => capability.status === "review" || capability.status === "guarded").length;
  const attentionCount = capabilities.filter((capability) => ["review", "guarded", "denied"].includes(capability.status)).length;
  const systemStatusItems = [
    { id: "matter", label: "Matter", status: matterCapability.status, statusLabel: statusBadgeLabel(matterCapability.status, labels) },
    { id: "vault", label: "Vault", status: vaultCapability.status, statusLabel: statusBadgeLabel(vaultCapability.status, labels) },
    { id: "people", label: homeCopy(labels, "homeSystemPeople", "구성원"), status: peopleCapability.status, statusLabel: statusBadgeLabel(peopleCapability.status, labels) },
    {
      id: "sync",
      label: homeCopy(labels, "homeSystemSync", "동기화"),
      status: attentionCount > 0 ? "review" : "live",
      statusLabel: attentionCount > 0 ? homeCopy(labels, "homeSystemNeedsReview", "확인 필요") : statusBadgeLabel("live", labels)
    }
  ];
  const todoRows = sortTodoRows(buildHomeActionRows(actionInbox.task.items, "task", labels));
  const approvalItems = Array.isArray(actionInbox.approval.items) ? actionInbox.approval.items : [];
  const requesterRecords = [
    sessionProfile.profileUser,
    sessionProfile.desktopStatus,
    readLawosApiSession()?.session,
    readLawosSessionEnvelope()
  ];
  const requestApproverDenied = sessionHasExplicitNonApproverRole(requesterRecords);
  const visibleRequestTabs = requestApproverDenied ? localizedRequestTabs.filter((tab) => tab.id === "sent") : localizedRequestTabs;
  const activeRequestTab = visibleRequestTabs.some((tab) => tab.id === requestTab) ? requestTab : visibleRequestTabs[0]?.id ?? "sent";
  const filteredApprovalItems = filterRequestItems(approvalItems, requestFilter);
  const filteredApprovalRows = sortApprovalRows(buildHomeActionRows(filteredApprovalItems, "approval", labels));
  const sentRequestRows = [];
  const financeDashboard = useMemo(
    () => buildBankCashflowDashboardModel(dashboardResults.cashflow, dashboardResults.cashflowHistory),
    [dashboardResults.cashflow, dashboardResults.cashflowHistory]
  );
  const clientDashboard = useMemo(() => buildClientDashboardModel({
    accounts: dashboardResults.accounts,
    leads: dashboardResults.leads,
    opportunities: dashboardResults.opportunities
  }), [dashboardResults.accounts, dashboardResults.leads, dashboardResults.opportunities]);
  const matterDashboard = useMemo(() => buildMatterDashboardModel(dashboardResults.matters), [dashboardResults.matters]);
  const leaveDashboard = useMemo(() => buildLeaveDashboardModel(actionInbox.approval), [actionInbox.approval]);
  const payrollSummary = financeDashboard.payroll_summary;
  const payrollState = financeDashboard.state;
  const selectedRequestFilter = localizedRequestFilters.find((filter) => filter.id === requestFilter) ?? localizedRequestFilters[0];
  const guardedApprovalRows = filteredApprovalRows.filter((row) => row.status === "review" || row.status === "guarded");
  const readyApprovalRows = filteredApprovalRows.filter((row) => row.status === "live");
  const blockedApprovalRows = filteredApprovalRows.filter((row) => row.status === "denied" || row.status === "unavailable");
  const calendarCells = useMemo(() => buildMonthCells(selectedCalendarDate), [selectedCalendarDate]);
  const selectedCalendarKey = dateKey(selectedCalendarDate);
  const agendaEvents = Array.isArray(agendaResult.events) ? agendaResult.events : [];
  const meetingRoomEvents = agendaEvents.filter((event) => /회의실|meeting\s*room/i.test([
    event.title,
    event.location,
    event.room,
    event.venue
  ].filter(Boolean).join(" ")));
  const agendaByDate = useMemo(() => agendaSummaryByDate(agendaEvents), [agendaEvents]);
  const selectedAgenda = agendaForDate(agendaEvents, selectedCalendarDate);
  const nextDeadline = upcomingDeadline(agendaEvents);
  const currentFeedTab = localizedFeedTabs.find((tab) => tab.id === feedTab) ?? localizedFeedTabs[0];
  const feedEntries = Array.isArray(feedResult.entries) ? feedResult.entries : [];
  const primaryFeedEntry = feedEntries[0] ?? null;
  const selectedFeedEntry = feedEntries.find((entry) => entry.id === selectedFeedEntryId) ?? null;
  const canRetryFeed = feedResult.kind === "error" || (feedTab === "news" && feedResult.safeErrorCodes?.includes("HOME_NEWS_ALL_SOURCES_FAILED"));
  const guardedDomainStatuses = [matterCapability.status, peopleCapability.status, vaultCapability.status];
  const showForestOnboarding =
    guardedDomainStatuses.every((status) => status === "denied" || status === "guarded" || status === "unavailable") &&
    !homeOnboardingDismissed;
  const forestHeroTitle = sessionGreeting(sessionProfile.profileUser, sessionProfile.desktopStatus);
  const forestHeroSubtitle = heroDateFormatter.format(new Date());
  const homeActionTotal = countTotal(actionInbox.counts);
  const activeHomeSection = homeSectionMeta[activeSection] ? activeSection : "home-dashboard";
  const currentHomeSectionMeta = localizedHomeSectionMeta(homeSectionMeta[activeHomeSection] ?? homeSectionMeta["home-dashboard"], labels);
  const isDashboardSection = homeDashboardSectionIds.has(activeHomeSection);
  const heroTitle = isDashboardSection ? forestHeroTitle : currentHomeSectionMeta.title;
  const heroSubtitle = isDashboardSection ? forestHeroSubtitle : "";
  const auditSummary = [
    { id: "approval-audit", label: "승인 감사", value: actionInbox.approval.auditHintRef ?? "대기" },
    { id: "task-audit", label: "업무 감사", value: actionInbox.task.auditHintRef ?? "대기" },
    { id: "feed-audit", label: "피드 감사", value: feedResult.auditHintRef ?? "대기" }
  ];

  function recordTimeToFirstAction(actionKind, detail = {}) {
    if (firstActionLoggedRef.current) return;
    firstActionLoggedRef.current = true;
    emitHomeMetric("home_time_to_first_action", {
      elapsed_ms: Math.max(0, Math.round(homeMetricNowMs() - firstActionStartedAtRef.current)),
      active_section: activeHomeSection,
      action_kind: actionKind,
      ...detail
    });
  }

  function openHomeRoute(route, targetView, detail = {}) {
    recordTimeToFirstAction("home_route_open", {
      route,
      target_view: targetView,
      ...detail
    });
    setView(targetView, route, {
      ...(detail.matterId ? { matterId: detail.matterId } : {}),
      ...(detail.filter ? { filter: detail.filter } : {})
    });
  }

  function selectFeedEntry(entryId) {
    recordTimeToFirstAction("feed_entry_open", { item_id: entryId, feed_tab: feedTab });
    setSelectedFeedEntryId(entryId);
  }

  function retryFeed() {
    recordTimeToFirstAction("feed_retry", { feed_tab: feedTab });
    setRefreshToken((value) => value + 1);
  }

  function dismissHomeOnboarding() {
    writeHomeOnboardingDismissed();
    setHomeOnboardingDismissed(true);
  }

  function restoreActionInbox(previousActionInbox) {
    if (!previousActionInbox) return;
    setActionInbox(previousActionInbox);
    onHomeActionCountsChange(previousActionInbox.counts);
  }

  function handleHomeAction(row, action) {
    recordTimeToFirstAction("home_action_decision", {
      action,
      item_id: row.id,
      action_type: row.type
    });
    const previousActionInbox = actionInbox;
    const actionStateId = `${row.id}:${action}`;
    const pendingKey = `${row.id}:${action}:${Date.now()}`;
    const nextCounts = decrementCountsForRow(actionInbox.counts, row);
    setPendingActionId(actionStateId);
    setActionInbox((current) => ({
      ...current,
      [row.type]: {
        ...current[row.type],
        items: current[row.type].items.filter((item) => item.id !== row.id)
      },
      counts: nextCounts
    }));
    onHomeActionCountsChange(nextCounts);
    const timer = setTimeout(async () => {
      pendingActionTimersRef.current.delete(pendingKey);
      const result = await decideHomeActionInboxItem({
        id: row.id,
        action,
        ctx: liveCtx,
        idempotencyKey: pendingKey
      });
      setPendingActionId((current) => (current === actionStateId ? "" : current));
      if (result.kind !== "data") {
        restoreActionInbox(previousActionInbox);
        setUndoNotice({ id: row.id, title: row.title, message: homeCopy(labels, "homeActionFailed", "요청을 처리하지 못했습니다.") });
        return;
      }
      setUndoNotice((current) => (
        current?.pendingKey === pendingKey
          ? { id: row.id, title: row.title, action, message: `${actionButtonLabel(action, labels)} ${homeCopy(labels, "homeActionProcessedSuffix", "처리했습니다.")}` }
          : current
      ));
    }, HOME_ACTION_UNDO_WINDOW_MS);
    pendingActionTimersRef.current.set(pendingKey, timer);
    setUndoNotice({
      id: row.id,
      title: row.title,
      previousActionInbox,
      pendingKey,
      action,
      message: `${actionButtonLabel(action, labels)} ${homeCopy(labels, "homeActionPendingSuffix", "대기 중입니다.")}`,
      undoExpiresAt: new Date(Date.now() + HOME_ACTION_UNDO_WINDOW_MS).toISOString()
    });
  }

  function handleUndoNotice() {
    if (undoNotice?.pendingKey) {
      const timer = pendingActionTimersRef.current.get(undoNotice.pendingKey);
      if (timer) clearTimeout(timer);
      pendingActionTimersRef.current.delete(undoNotice.pendingKey);
      setPendingActionId("");
    }
    if (undoNotice?.previousActionInbox) {
      restoreActionInbox(undoNotice.previousActionInbox);
    }
    setUndoNotice(null);
  }

  function renderRequestRow(row) {
    return (
      <DashboardRow
        key={row.id}
        {...row}
        onOpen={(route) => openHomeRoute(route, route === "home-requests" ? "home" : "matters", { item_id: row.id, action_type: row.type })}
        onAction={(action) => handleHomeAction(row, action)}
        pending={pendingActionId.startsWith(`${row.id}:`)}
        labels={labels}
      />
    );
  }

  function openMessageThread(item) {
    if (!item?.id) return;
    recordTimeToFirstAction("message_thread_open", { item_id: item.id, message_tab: item.tab ?? item.section ?? "" });
    setSelectedMessageThreadId(item.id);
    onMessageThreadOpen(item.id);
  }

  function renderMessagesScreen() {
    const currentTab = localizedMessageTabs.find((tab) => tab.id === messageTab) ?? localizedMessageTabs[0];
    const unreadIds = unreadMessageIds instanceof Set ? unreadMessageIds : new Set();
    const allMessages = Array.isArray(messageItems) ? messageItems : [];
    const tabMessages = allMessages.filter((item) => item.tab === currentTab.id || item.section === currentTab.section);
    const selectedMessage = tabMessages.find((item) => item.id === selectedMessageThreadId) ?? null;
    return (
      <HomeSectionPanel section="home-messages" title={homeCopy(labels, "homeMessagesLabel", "메시지")}>
        <HomeTabList label={homeCopy(labels, "homeMessagesLabel", "메시지")} tabs={localizedMessageTabs} activeTab={messageTab} onSelect={setMessageTab} dataPrefix="messages" />
        <div className="home-section-content" role="tabpanel" data-home-message-tab={messageTab}>
          <div className="home-message-layout">
            <HomeStatusList title={currentTab.label} count={tabMessages.length} showTitle={false}>
              <div className="home-message-thread-list">
                {tabMessages.map((item) => {
                  const unread = unreadIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={unread ? "home-message-thread unread" : "home-message-thread"}
                      data-home-message-thread={item.id}
                      data-home-message-unread={unread ? "true" : "false"}
                      aria-pressed={selectedMessageThreadId === item.id ? "true" : "false"}
                      onClick={() => openMessageThread(item)}
                    >
                      <span className="home-message-thread-main">
                        <strong>{item.title}</strong>
                        <small>{item.summary}</small>
                      </span>
                      <span className="home-message-thread-meta">
                        <em>{unread ? item.status : homeCopy(labels, "homeMessageRead", "읽음")}</em>
                        <time>{item.time}</time>
                      </span>
                    </button>
                  );
                })}
              </div>
            </HomeStatusList>
            {selectedMessage && (
              <aside className="home-message-thread-panel" data-home-message-thread-panel={selectedMessage.id}>
                <header>
                  <span>{selectedMessage.type}</span>
                  <strong>{selectedMessage.title}</strong>
                  <small>{selectedMessage.client}</small>
                </header>
                <p>{selectedMessage.summary}</p>
                {selectedMessage.matterId && (
                  <button type="button" className="text-button" onClick={() => openHomeRoute("matter-channel", "matters", { source: "message_thread_panel" })}>
                    {homeCopy(labels, "homeMessagesMatterOpen", "Matter 대화 열기")}
                  </button>
                )}
              </aside>
            )}
          </div>
        </div>
      </HomeSectionPanel>
    );
  }

  function renderRequestsContent() {
    const rows = activeRequestTab === "sent" ? sentRequestRows : filteredApprovalRows;
    const readyRows = activeRequestTab === "sent" ? [] : readyApprovalRows;
    const reviewRows = activeRequestTab === "sent" ? [] : guardedApprovalRows;
    const blockedRows = activeRequestTab === "sent" ? [] : blockedApprovalRows;
    return (
      <>
        <div className="home-section-toolbar">
          <HomeTabList label={homeCopy(labels, "homeApprovalDirectionLabel", "요청 방향")} tabs={visibleRequestTabs} activeTab={activeRequestTab} onSelect={setRequestTab} dataPrefix="requests-direction" variant="underline" />
          <div className="home-section-filters" role="tablist" aria-label={homeCopy(labels, "homeRequestsLabel", "승인 대기")} data-home-request-tab={activeRequestTab} data-home-request-filter={requestFilter}>
            {localizedRequestFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={requestFilter === filter.id ? "active" : ""}
                role="tab"
                aria-selected={requestFilter === filter.id ? "true" : "false"}
                tabIndex={requestFilter === filter.id ? 0 : -1}
                data-home-request-filter-id={filter.id}
                data-home-request-filter-active={requestFilter === filter.id ? "true" : undefined}
                onClick={() => setRequestFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        {activeRequestTab === "sent" ? (
          <HomeStatusList title={homeCopy(labels, "homeRequestsSentTitle", "보낸 요청")} count={sentRequestRows.length} showTitle={false}>
            {sentRequestRows.map(renderRequestRow)}
          </HomeStatusList>
        ) : (
          <div className="home-status-grid">
            <HomeStatusList title={homeCopy(labels, "homeRequestsReady", "처리 대기")} count={readyRows.length}>
              {readyRows.map(renderRequestRow)}
            </HomeStatusList>
            <HomeStatusList title={homeCopy(labels, "homeRequestsReview", "검토 필요")} count={reviewRows.length}>
              {reviewRows.map(renderRequestRow)}
            </HomeStatusList>
            <HomeStatusList title={homeCopy(labels, "homeRequestsBlocked", "제한됨")} count={blockedRows.length}>
              {blockedRows.map(renderRequestRow)}
            </HomeStatusList>
          </div>
        )}
      </>
    );
  }

  function renderTodoScreen() {
    return (
      <HomeSectionPanel section={activeHomeSection} title={homeCopy(labels, "homeTodoSidebarLabel", "할 일")}>
        <HomeStatusList title={homeCopy(labels, "homeWorkTodoTab", "오늘 할 일")} count={todoRows.length} showTitle={false}>
          <div className="home-widget-list" data-home-work-todo-list="true">
            {todoRows.map((row) => (
              <DashboardRow
                key={row.id}
                {...row}
                onOpen={(route) => openHomeRoute(route, route === "home-dashboard" || route === "home-todo" ? "home" : "matters", { item_id: row.id, action_type: row.type })}
                onAction={(action) => handleHomeAction(row, action)}
                pending={pendingActionId.startsWith(`${row.id}:`)}
                labels={labels}
              />
            ))}
          </div>
        </HomeStatusList>
      </HomeSectionPanel>
    );
  }

  function renderRequestsScreen() {
    return (
      <HomeSectionPanel section={activeHomeSection} title={currentHomeSectionMeta.title}>
        {renderRequestsContent()}
      </HomeSectionPanel>
    );
  }

  function renderMeetingRoomsScreen() {
    return (
      <HomeSectionPanel section="home-meeting-rooms" title={homeCopy(labels, "homeMeetingRoomsLabel", "회의실 예약")}>
        <DashboardListCard
          title={homeCopy(labels, "homeMeetingRoomsLabel", "회의실 예약")}
          section="meeting-room-reservations"
          onViewAll={() => openHomeRoute("matter-calendar", "matters", { source: "meeting_room_reservations" })}
          viewAllLabel={homeCopy(labels, "homeCalendarOpen", "캘린더 열기")}
        >
          <DashboardRecordList>
            {meetingRoomEvents.map((event, index) => (
              <DashboardRecordRow
                key={`meeting-room:${event.id ?? event.event_id ?? index}`}
                title={event.title ?? `회의실 예약 ${index + 1}`}
                meta={event.location ?? event.room ?? event.venue ?? "회의실"}
                detail={formatDateTime(event.starts_at)}
                status={event.status ? dashboardRecordStatusLabel(event.status) : null}
                onOpen={() => openHomeRoute("matter-calendar", "matters", { item_id: event.id ?? event.event_id, source: "meeting_room_reservation" })}
              />
            ))}
          </DashboardRecordList>
        </DashboardListCard>
      </HomeSectionPanel>
    );
  }

  function renderEsignScreen() {
    const currentTab = localizedEsignTabs.find((tab) => tab.id === esignTab) ?? localizedEsignTabs[0];
    return (
      <HomeSectionPanel section="home-esign" title={homeCopy(labels, "homeEsignLabel", "전자계약")}>
        <HomeTabList label={homeCopy(labels, "homeEsignLabel", "전자계약")} tabs={localizedEsignTabs} activeTab={esignTab} onSelect={setEsignTab} dataPrefix="esign" />
        <div className="home-section-content" role="tabpanel" data-home-esign-tab={esignTab}>
          <HomeStatusList title={currentTab.label} count={0} showTitle={false}>
            {null}
          </HomeStatusList>
        </div>
      </HomeSectionPanel>
    );
  }

  function renderCompanyScreen() {
    const currentTab = companyTabs.find((tab) => tab.id === companyTab) ?? companyTabs[0];
    if (!canViewCompanyStatus) {
      return (
        <HomeSectionPanel section="home-company" title={homeCopy(labels, "homeCompanyLabel", "회사 현황")}>
          <div className="home-company-access-notice" role="status" data-home-company-access-denied="true">
            <strong>{homeCopy(labels, "homeCompanyAdminRequiredTitle", "관리자 권한이 필요합니다.")}</strong>
            <span>{homeCopy(labels, "homeCompanyAdminRequiredBody", "회사 현황은 관리자 role이 확인된 세션에서만 열 수 있습니다.")}</span>
          </div>
        </HomeSectionPanel>
      );
    }
    return (
      <HomeSectionPanel section="home-company" title={homeCopy(labels, "homeCompanyLabel", "회사 현황")}>
        <HomeTabList label={homeCopy(labels, "homeCompanyReportLabel", "회사 현황 리포트")} tabs={companyTabs} activeTab={companyTab} onSelect={setCompanyTab} dataPrefix="company" />
        <div className="home-company-grid" role="tabpanel" data-home-company-tab={companyTab}>
          <section className="home-company-summary" data-home-permission-summary="true">
            <header>
              <strong>{homeCopy(labels, "homeCompanyPermissionTitle", "권한 상태")}</strong>
              <small>{attentionCount > 0 || reviewCount > 0 ? homeCopy(labels, "homeSystemNeedsReview", "확인 필요") : homeCopy(labels, "homeSystemOk", "정상")}</small>
            </header>
            <div className="home-system-pill-grid">
              {systemStatusItems.map(({ id, label, status, statusLabel }) => (
                <div key={id} className={`home-system-pill ${status}`}>
                  <span>{label}</span>
                  <em>{statusLabel}</em>
                </div>
              ))}
            </div>
          </section>
          <section className="home-company-summary" data-home-audit-summary="true">
            <header>
              <strong>{homeCopy(labels, "homeCompanyAuditTitle", "감사 요약")}</strong>
              <small>{homeCopy(labels, "homeCompanyRecentRead", "최근 읽기 기준")}</small>
            </header>
            <div className="home-audit-summary-list">
              {auditSummary.map((item) => (
                <div key={item.id}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="home-company-summary" data-home-company-report-summary="true">
            <header>
              <strong>{currentTab.label}</strong>
            </header>
            <div className="home-audit-summary-list">
              <div>
                <span>{homeCopy(labels, "homeCompanyApprovalPending", "승인 대기")}</span>
                <strong>{actionInbox.counts.approval}</strong>
              </div>
              <div>
                <span>{homeCopy(labels, "homeCompanyLateTask", "지연 업무")}</span>
                <strong>{actionInbox.counts.task_late}</strong>
              </div>
              <div>
                <span>{homeCopy(labels, "homeCompanyTodayTask", "오늘 업무")}</span>
                <strong>{actionInbox.counts.task_today}</strong>
              </div>
            </div>
          </section>
        </div>
      </HomeSectionPanel>
    );
  }

  function renderFinanceRouteContract() {
    if (homeFinanceSectionIds.has(activeHomeSection)) {
      return (
        <HomeSectionPanel section={activeHomeSection} title={currentHomeSectionMeta.title}>
          <div data-home-finance-route-contract={activeHomeSection}>
            <FinanceSurface liveCtx={liveCtx} activeSection={activeHomeSection} refreshSignal={refreshToken} />
          </div>
        </HomeSectionPanel>
      );
    }
    return null;
  }

  function renderFeedCard() {
    return (
      <DashboardCard className="home-dashboard-feed" widgetId="feed" section="feed">
        <div className="home-feed-tabs" role="tablist" aria-label={homeCopy(labels, "homeFeedTabLabel", "홈 피드")}>
          {localizedFeedTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              id={`home-feed-tab-${tab.id}`}
              className={feedTab === tab.id ? "active" : ""}
              onClick={() => setFeedTab(tab.id)}
              role="tab"
              aria-selected={feedTab === tab.id ? "true" : "false"}
              aria-controls={`home-feed-panel-${tab.id}`}
              tabIndex={feedTab === tab.id ? 0 : -1}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div id={`home-feed-panel-${feedTab}`} role="tabpanel" aria-labelledby={`home-feed-tab-${feedTab}`}>
          {primaryFeedEntry ? (
            <div className="home-feed-content" data-home-feed-entry-count={feedEntries.length}>
              <button type="button" className="home-feed-feature" data-home-feed-entry={primaryFeedEntry.id} onClick={() => selectFeedEntry(primaryFeedEntry.id)}>
                <span>{primaryFeedEntry.source}</span>
                <strong>{primaryFeedEntry.title}</strong>
                <p>{primaryFeedEntry.body_preview}</p>
              </button>
              <div className="home-feed-list">
                {feedEntries.slice(1, 4).map((entry) => (
                  <button type="button" key={entry.id} data-home-feed-entry={entry.id} data-compact-record="true" onClick={() => selectFeedEntry(entry.id)}>
                    <span>{entry.source}</span>
                    <strong>{entry.title}</strong>
                    <small>{formatDateTime(entry.published_at)}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="home-feed-empty">
              <strong>{feedEmptyMessage(feedTab, currentFeedTab, feedResult, labels)}</strong>
              {currentFeedTab.sources && <span>{currentFeedTab.sources}</span>}
              {canRetryFeed && (
                <button type="button" className="text-button home-feed-retry" data-home-feed-retry="true" onClick={retryFeed}>
                  {homeCopy(labels, "homeFeedRetry", "다시 시도")}
                </button>
              )}
            </div>
          )}
        </div>
        {selectedFeedEntry && (
          <div className="home-feed-read-panel" role="dialog" aria-modal="false" data-home-feed-read-panel={selectedFeedEntry.id}>
            <article>
              <header>
                <span>{selectedFeedEntry.source}</span>
                <button type="button" className="icon-button" aria-label={homeCopy(labels, "homeFeedPanelClose", "읽기 패널 닫기")} onClick={() => setSelectedFeedEntryId("")}>
                  <X size={15} />
                </button>
              </header>
              <strong>{selectedFeedEntry.title}</strong>
              <p>{selectedFeedEntry.body_preview}</p>
              {selectedFeedEntry.url && <a href={selectedFeedEntry.url} target="_blank" rel="noreferrer" aria-label={`${selectedFeedEntry.title} ${homeCopy(labels, "homeFeedOriginalOpen", "원문 열기")}`}>{homeCopy(labels, "homeFeedOriginalOpen", "원문 열기")}</a>}
            </article>
          </div>
        )}
      </DashboardCard>
    );
  }

  function renderCalendarCard(className = "") {
    return (
      <DashboardCard
        className={`home-dashboard-calendar ${className}`.trim()}
        title={homeCopy(labels, "homeWidgetCalendarTitle", "캘린더")}
        widgetId="calendar"
        section="calendar"
        onViewAll={() => openHomeRoute("home-calendar", "home", { source: "calendar_widget_view_all" })}
        viewAllLabel={homeCopy(labels, "homeWidgetViewAll", "전체 보기")}
      >
        <div className="home-calendar-weekdays">
          {localizedCalendarWeekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="home-calendar-grid">
          {calendarCells.map((cell) => {
            const summary = agendaByDate.get(cell.key);
            const hasGeneral = Number(summary?.total ?? 0) > Number(summary?.deadline ?? 0);
            const hasDeadline = Number(summary?.deadline ?? 0) > 0;
            return (
              <button
                key={cell.key}
                type="button"
                className={[
                  cell.inMonth ? "in-month" : "out-month",
                  cell.isSunday ? "sunday" : "",
                  cell.isToday ? "today" : "",
                  cell.key === selectedCalendarKey ? "selected" : ""
                ].filter(Boolean).join(" ")}
                data-home-calendar-day={cell.key}
                data-home-calendar-day-kind={hasDeadline ? "deadline" : hasGeneral ? "general" : "empty"}
                onClick={() => setSelectedCalendarDate(cell.date)}
                aria-label={`${selectedDateFormatter.format(cell.date)}${cell.key === selectedCalendarKey ? homeCopy(labels, "homeCalendarSelectedSuffix", " 선택됨") : ""}`}
                aria-pressed={cell.key === selectedCalendarKey ? "true" : "false"}
              >
                <span className="home-calendar-day">{cell.day}</span>
                {(hasGeneral || hasDeadline) && (
                  <span className="home-calendar-dots" aria-hidden="true">
                    {hasGeneral && <i className="home-calendar-dot general" />}
                    {hasDeadline && <i className="home-calendar-dot deadline" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="home-calendar-agenda">
          <div className="home-calendar-agenda-header">
            <strong>{selectedDateFormatter.format(selectedCalendarDate)}</strong>
            <button type="button" className="text-button home-calendar-open" data-home-calendar-open="true" onClick={() => openHomeRoute("matter-calendar", "matters", { source: "calendar_open" })}>
              {homeCopy(labels, "homeCalendarOpen", "캘린더 열기")}
            </button>
          </div>
          {nextDeadline && (
            <button type="button" className="home-calendar-deadline-callout" data-home-upcoming-deadline="true" onClick={() => openHomeRoute("matter-calendar", "matters", { source: "upcoming_deadline" })}>
              <span>{homeCopy(labels, "homeCalendarUpcomingDeadline", "임박 기한")}</span>
              <strong>{nextDeadline.title}</strong>
            </button>
          )}
          {selectedAgenda.length === 0 ? (
            <span>{agendaResult.kind === "loading" ? homeCopy(labels, "homeCalendarLoading", "일정을 불러오는 중입니다.") : homeCopy(labels, "homeCalendarEmptyDay", "이 날 일정이 없습니다.")}</span>
          ) : (
            <div className="home-calendar-agenda-list" data-home-agenda-count={selectedAgenda.length}>
              {selectedAgenda.slice(0, 3).map((event) => (
                <button key={event.id} type="button" className={event.kind === "deadline" ? "deadline" : ""} onClick={() => openHomeRoute(event.matter_ref ? "matter-calendar" : "matter-home", "matters", { item_id: event.id, source: "calendar_agenda" })}>
                  <span>{event.kind === "deadline" ? homeCopy(labels, "homeCalendarDeadlineKind", "기한") : event.kind}</span>
                  <strong>{event.title}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      </DashboardCard>
    );
  }

  function renderDashboardGrid() {
    const financeCurrentState = ["data", "partial"].includes(financeDashboard.state) && !financeDashboard.current ? "empty" : financeDashboard.state;
    const revenueChartState = financeDashboard.state === "data" && !financeDashboard.has_series_data ? "empty" : financeDashboard.state;
    const payrollCurrentState = payrollState === "data" && !payrollSummary ? "empty" : payrollState;
    const payrollChartState = payrollCurrentState === "data" && Number(payrollSummary?.gross_krw ?? 0) <= 0 ? "empty" : payrollCurrentState;
    const selectedClientItems = clientDashboardTab === "new" ? clientDashboard.new_clients : clientDashboard.prospects;
    const selectedClientSourceState = clientDashboardTab === "new" ? clientDashboard.new_client_state : clientDashboard.prospect_state;
    const selectedClientState = selectedClientSourceState === "data" && selectedClientItems.length === 0 ? "empty" : selectedClientSourceState;
    const selectedClientNoun = clientDashboardTab === "new" ? "신규 고객" : "잠재고객";
    const selectedClientViewAllRoute = clientDashboardTab === "new" ? "clients-list" : "client-opportunities";
    const selectedMatterItems = matterDashboardTab === "new" ? matterDashboard.new_matters : matterDashboard.closed_matters;
    const selectedMatterState = matterDashboard.state === "data" && selectedMatterItems.length === 0 ? "empty" : matterDashboard.state;
    const selectedMatterNoun = matterDashboardTab === "new" ? "신규 매터" : "종결된 매터";
    const selectedMatterStateNoun = `${selectedMatterNoun} 목록`;
    return (
      <div
        className="home-dashboard-overview-grid"
        data-home-ops-queue="true"
        data-home-dashboard-grid="true"
        data-lcx-web-capability-count={capabilities.length}
      >
        <HomeKpiCard
          title="이번달 매출"
          state={financeCurrentState}
          amount={financeDashboard.current?.billed_amount ?? null}
          basis="KRW / 등록 고객 입금"
          changePercent={financeDashboard.revenue_change_percent}
          section="monthly-revenue"
          onOpen={() => openHomeRoute("home-finance-monthly", "home", { source: "monthly_revenue_kpi" })}
        />
        <HomeKpiCard
          title="이번달 급여 지급액"
          state={payrollCurrentState}
          amount={payrollSummary?.gross_krw ?? null}
          basis="KRW / 은행 지급 기준"
          section="monthly-payroll"
          onOpen={() => openHomeRoute("home-finance-cashflow", "home", { source: "monthly_payroll_kpi" })}
        />
        <HomeKpiCard
          title="이번달 비용처리"
          state={financeCurrentState}
          amount={financeDashboard.current?.processed_cost ?? null}
          basis="KRW / 운영비 출금 분류"
          changePercent={financeDashboard.processed_cost_change_percent}
          section="monthly-processed-cost"
          onOpen={() => openHomeRoute("home-finance-cashflow", "home", { source: "processed_cost_kpi" })}
        />

        <DashboardCard
          className="home-dashboard-revenue-chart-card"
          title="월별 매출"
          section="monthly-revenue-chart"
          onViewAll={() => openHomeRoute("home-finance-monthly", "home", { source: "monthly_revenue_chart" })}
          viewAllLabel="월별 매출 상세 보기"
          headerExtra={<span className="home-dashboard-card-meta">최근 12개월 / 등록 고객 입금</span>}
        >
          <HomeDashboardState state={revenueChartState} noun="월별 매출">
            <HomeRevenueLineChart series={financeDashboard.series} />
          </HomeDashboardState>
        </DashboardCard>
        <DashboardCard
          className="home-dashboard-payroll-chart-card"
          title="급여 구분"
          section="payroll-categories"
          onViewAll={() => openHomeRoute("home-finance-cashflow", "home", { source: "payroll_category_chart" })}
          viewAllLabel="급여 상세 보기"
        >
          <HomeDashboardState state={payrollChartState} noun="급여 구분">
            <HomePayrollDonutChart summary={payrollSummary} />
          </HomeDashboardState>
        </DashboardCard>

        <HomeCashflowBand
          result={dashboardResults.cashflow}
          onOpen={() => openHomeRoute("home-finance-cashflow", "home", { source: "cashflow_band" })}
        />

        {renderCalendarCard("home-dashboard-domain-card home-dashboard-calendar-card")}

        <DashboardCard
          className="home-dashboard-domain-card home-dashboard-client-card"
          title="Client"
          section="client-summary"
          onViewAll={() => openHomeRoute(selectedClientViewAllRoute, "clients", { source: `home_client_${clientDashboardTab}` })}
          viewAllLabel={`${selectedClientNoun} 상세 보기`}
        >
          <HomeTabList
            label="Client 항목"
            tabs={clientDashboardTabs}
            activeTab={clientDashboardTab}
            onSelect={setClientDashboardTab}
            dataPrefix="home-client-dashboard"
            variant="underline home-dashboard-domain-tabs"
          />
          <div className="home-dashboard-domain-panel" role="tabpanel" aria-label={selectedClientNoun}>
            <HomeDashboardState state={selectedClientState} noun={selectedClientNoun}>
              <DashboardRecordList>
                {selectedClientItems.slice(0, 3).map((item, index) => {
                  const isAccount = clientDashboardTab === "new";
                  const route = isAccount ? "clients-list" : item.lead_id ? "client-leads" : "client-opportunities";
                  return (
                    <DashboardRecordRow
                      key={`home-client:${item.account_id ?? item.lead_id ?? item.opportunity_id ?? index}`}
                      title={dashboardSafeLabel(item.display_name ?? item.subject, `${selectedClientNoun} ${index + 1}`)}
                      meta={selectedClientNoun}
                      detail={item.updated_at || item.created_at ? formatDateTime(item.updated_at ?? item.created_at) : null}
                      onOpen={() => openHomeRoute(route, "clients", { item_id: item.account_id ?? item.lead_id ?? item.opportunity_id, source: `home_client_${clientDashboardTab}` })}
                    />
                  );
                })}
              </DashboardRecordList>
            </HomeDashboardState>
          </div>
        </DashboardCard>

        <DashboardCard
          className="home-dashboard-domain-card home-dashboard-people-card"
          title="People"
          section="people-summary"
          onViewAll={() => openHomeRoute("home-requests-leave", "home", { source: "home_people_leave" })}
          viewAllLabel="휴가 신청 상세 보기"
        >
          <div className="home-domain-metrics single">
            <HomeSummaryMetric label="휴가 신청" value={leaveDashboard.items.length} state={leaveDashboard.state} />
          </div>
          <HomeDashboardState state={leaveDashboard.state} noun="휴가 신청">
            <DashboardRecordList>
              {leaveDashboard.recent.map((item, index) => (
                <DashboardRecordRow
                  key={`home-leave:${item.id ?? index}`}
                  title={item.title ?? `휴가 신청 ${index + 1}`}
                  meta={dashboardSafeLabel(item.requester, "신청자")}
                  detail={formatDateTime(item.due_at ?? item.requested_at)}
                  onOpen={() => openHomeRoute("home-requests-leave", "home", { item_id: item.id, source: "home_leave_recent" })}
                />
              ))}
            </DashboardRecordList>
          </HomeDashboardState>
        </DashboardCard>

        <DashboardCard
          className="home-dashboard-domain-card home-dashboard-matter-card"
          title="Matter"
          section="matter-summary"
          onViewAll={() => openHomeRoute("matters-list", "matters", { source: `home_matter_${matterDashboardTab}` })}
          viewAllLabel={`${selectedMatterNoun} 상세 보기`}
        >
          <HomeTabList
            label="Matter 항목"
            tabs={matterDashboardTabs}
            activeTab={matterDashboardTab}
            onSelect={setMatterDashboardTab}
            dataPrefix="home-matter-dashboard"
            variant="underline home-dashboard-domain-tabs"
          />
          <div className="home-dashboard-domain-panel" role="tabpanel" aria-label={selectedMatterNoun}>
            <HomeDashboardState state={selectedMatterState} noun={selectedMatterStateNoun}>
              <DashboardRecordList>
                {selectedMatterItems.slice(0, 3).map((item, index) => (
                  <DashboardRecordRow
                    key={`home-matter:${item.matter_id ?? index}`}
                    title={dashboardMatterTitle(item, index)}
                    meta={selectedMatterNoun}
                    detail={dashboardClientTitle(item)}
                    status={dashboardRecordStatusLabel(item.status)}
                    onOpen={() => openHomeRoute("matters-list", "matters", { item_id: item.matter_id, matterId: item.matter_id, source: `home_matter_${matterDashboardTab}` })}
                  />
                ))}
              </DashboardRecordList>
            </HomeDashboardState>
          </div>
        </DashboardCard>
      </div>
    );
  }

  function renderActiveHomeSection() {
    if (homeFinanceSectionIds.has(activeHomeSection)) return renderFinanceRouteContract();
    if (activeHomeSection === "home-todo") return renderTodoScreen();
    if (activeHomeSection === "home-requests" || activeHomeSection === "home-requests-leave" || activeHomeSection === "home-requests-expenses") return renderRequestsScreen();
    if (activeHomeSection === "home-meeting-rooms") return renderMeetingRoomsScreen();
    if (activeHomeSection === "home-messages") return renderMessagesScreen();
    if (activeHomeSection === "home-esign") return renderEsignScreen();
    if (activeHomeSection === "home-company") return renderCompanyScreen();
    if (activeHomeSection === "home-feed") {
      return <HomeSectionPanel section="home-feed" title={currentHomeSectionMeta.title}><div className="home-dashboard-focused-route">{renderFeedCard()}</div></HomeSectionPanel>;
    }
    if (activeHomeSection === "home-calendar") {
      return <HomeSectionPanel section="home-calendar" title={currentHomeSectionMeta.title}><div className="home-dashboard-focused-route">{renderCalendarCard()}</div></HomeSectionPanel>;
    }
    return renderDashboardGrid();
  }

  return (
    <section className="surface stack lcx-web-command-center home-dashboard-surface" data-lcx-web-command-center="true" data-home-dashboard-shell="true" data-active-home-section={activeHomeSection}>
      <section className="home-dashboard-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(9, 43, 39, 0.58) 0%, rgba(9, 43, 39, 0.28) 45%, rgba(9, 43, 39, 0.16) 100%), url(${heroHomeArchitecture})`, backgroundPosition: "center 52%" }}>
        <div>
          <h1>{heroTitle}</h1>
          {heroSubtitle && <p>{heroSubtitle}</p>}
        </div>
      </section>
      {showForestOnboarding && activeHomeSection !== "home-dashboard" && (
        <section className="forest-onboarding-card" data-forest-onboarding-card="true">
          <div>
            <strong>{homeCopy(labels, "homeOnboardingTitle", "연결 기준을 설정하세요")}</strong>
            <p>{homeCopy(labels, "homeOnboardingBody", "업무 데이터 연결이 준비되면 지표가 채워집니다.")}</p>
          </div>
          <div className="forest-onboarding-actions">
            <button className="secondary-button" type="button" onClick={() => openHomeRoute("settings-company", "settings", { source: "forest_onboarding" })}>
              {homeCopy(labels, "homeOnboardingSettings", "설정 열기")}
            </button>
            <button className="icon-button" type="button" aria-label={homeCopy(labels, "homeOnboardingClose", "온보딩 닫기")} onClick={dismissHomeOnboarding}>
              <X size={15} />
            </button>
          </div>
        </section>
      )}
      {homeCompanyAccessDenied && (
        <div className="home-company-access-notice" role="status" data-home-company-access-denied="true">
          <strong>{homeCopy(labels, "homeCompanyDeniedTitle", "회사 현황 접근이 제한되었습니다.")}</strong>
          <span>{homeCopy(labels, "homeCompanyDeniedBody", "관리자 role이 확인되면 사이드바에서 다시 열 수 있습니다.")}</span>
        </div>
      )}
      {undoNotice && (
        <div className="home-action-undo" role="status" data-home-action-undo="true">
          <span>{undoNotice.message}</span>
          {undoNotice.undoExpiresAt && <button type="button" className="text-button" data-home-action-undo-button="true" onClick={handleUndoNotice}>{homeCopy(labels, "homeActionUndo", "실행 취소")}</button>}
        </div>
      )}
      {renderActiveHomeSection()}
    </section>
  );
}
