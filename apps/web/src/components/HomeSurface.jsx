import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileSignature,
  FolderOpen,
  Inbox,
  Mail,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import forestCover from "../assets/forest-cover.jpg";
import { backendCapabilities } from "../data/capabilityMap.js";
import {
  fetchAiReviewQueue,
  fetchAnalyticsDashboards,
  fetchCrmOpportunities,
  fetchDataRoomProjections,
  decideHomeActionInboxItem,
  fetchFinanceArAging,
  fetchFinanceInvoices,
  fetchFinanceTimeEntries,
  fetchHomeActionInbox,
  fetchHomeAgenda,
  fetchHomeFeed,
  fetchIntakeRequests,
  fetchMasterDataRecords,
  fetchMatterRecords,
  fetchPortalDashboard,
  fetchPortalRfi,
  fetchUserProfile,
  readLawosApiSession,
  readLawosSessionEnvelope,
  fetchVaultDocuments
} from "../data/apiClient.js";
import { fetchHrxPeopleOverview } from "../people/hrxApiClient.ts";
import { useSkin } from "../context/SkinContext.jsx";

const heroDateFormatter = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" });
const monthFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" });
const selectedDateFormatter = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" });
const homeDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const calendarWeekdays = Object.freeze(["일", "월", "화", "수", "목", "금", "토"]);
const emptyHomeCounts = Object.freeze({ approval: 0, task_late: 0, task_today: 0 });
const feedTabs = Object.freeze([
  { id: "notice", label: "사내 공지", empty: "표시할 공지가 없습니다." },
  { id: "news", label: "뉴스", empty: "새 뉴스가 없습니다.", sources: "블로터 · 법률신문 · 딜사이트 · 인베스트조선" },
  { id: "newsletter", label: "뉴스레터", empty: "새 뉴스레터가 없습니다." }
]);
const messageTabs = Object.freeze([
  { id: "send", section: "messages-send", label: "전송" },
  { id: "automation", section: "messages-automation", label: "자동화" },
  { id: "templates", section: "messages-templates", label: "템플릿" },
  { id: "notices", section: "messages-notices", label: "공지" },
  { id: "matter", section: "messages-matter-channel", label: "Matter 대화" }
]);
const requestTabs = Object.freeze([
  { id: "received", label: "받은 요청" },
  { id: "sent", label: "보낸 요청" }
]);
const requestFilters = Object.freeze([
  { id: "all", section: "requests-inbox", label: "전체", subtypes: [] },
  { id: "leave", section: "requests-leave", label: "휴가", subtypes: ["leave"] },
  { id: "expenses", section: "requests-expenses", label: "비용", subtypes: ["cost", "expense", "expenses"] },
  { id: "certificates", section: "requests-certificates", label: "증명서", subtypes: ["certificate", "certificates"] },
  { id: "attendance", section: "requests-attendance", label: "근무기록", subtypes: ["attendance", "work_record"] },
  { id: "custom", section: "requests-custom", label: "커스텀", subtypes: ["custom"] },
  { id: "force", section: "requests-force-decision", label: "강제", subtypes: ["force", "force_decision"] }
]);
const esignTabs = Object.freeze([
  { id: "send", section: "esign-send", label: "전송" },
  { id: "templates", section: "esign-templates", label: "템플릿" },
  { id: "status", section: "esign-status", label: "상태" },
  { id: "settings", section: "esign-settings", label: "설정" }
]);
const companyTabs = Object.freeze([
  { id: "reports-home-dashboard", label: "Home" },
  { id: "reports-people-live", label: "People 실시간" },
  { id: "reports-people-snapshots", label: "People 스냅샷" },
  { id: "reports-people-items", label: "People 항목" },
  { id: "reports-people-attention", label: "주의 항목" },
  { id: "reports-client", label: "Client" },
  { id: "reports-matter-analytics", label: "Matter" }
]);
const homeSectionMeta = Object.freeze({
  "home-dashboard": { eyebrow: "Home", title: "", Icon: Briefcase },
  "home-messages": { eyebrow: "메시지", title: "메시지", subtitle: "업무 메시지", Icon: Mail },
  "home-requests": { eyebrow: "승인 요청", title: "승인 요청", subtitle: "요청 상태", Icon: ShieldCheck },
  "home-esign": { eyebrow: "전자 계약", title: "전자 계약", subtitle: "서명 상태", Icon: FileCheck2 },
  "home-company": { eyebrow: "회사 현황", title: "회사 현황", subtitle: "권한·감사", Icon: ClipboardList }
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
  return title.split(/[\s/·,]+/).filter(Boolean)[0] ?? "";
}

function sessionGreeting(profileUser, desktopStatus) {
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
  return `Welcome, ${[name, professionalLabel].filter(Boolean).join(" ")}님`;
}

function desktopSessionBridge(source = globalThis) {
  const bridge = source?.matterSession ?? source?.window?.matterSession;
  if (typeof bridge?.status !== "function" || typeof bridge?.smoke !== "function") return null;
  try {
    const location = source?.location ?? source?.window?.location;
    if (location?.protocol !== "file:") return null;
    const params = new URLSearchParams(location.search ?? "");
    if (params.get("desktop") !== "1") return null;
  } catch {
    return null;
  }
  return bridge;
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
  return { kind: "error", desktopBridge: true };
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
        return { id, result: { kind: "error", desktopBridge: true } };
      }
    })
  );
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

function normalizeStatus(result) {
  if (!result) return "loading";
  if (result.kind === "error") return "unavailable";
  if (result.kind === "step_up_required") return "guarded";
  if (result.uiState === "denied") return "denied";
  if (result.uiState === "review_required" || result.outcome === "review_required") return "review";
  if (result.kind === "data") return "live";
  return "guarded";
}

function statusBadgeLabel(status) {
  if (status === "live") return "정상";
  if (status === "loading") return "확인 중";
  if (status === "unavailable") return "실패";
  if (status === "denied") return "권한 없음";
  if (status === "review") return "검토";
  return "확인 필요";
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

function combinePillarResults(results) {
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
  return results.find((result) => result?.kind === "error") ?? { kind: "error" };
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
  return items.filter((item) => requestSubtypeKey(item) === filterId);
}

function activeHomeContext(activeSection, redirectedFrom) {
  const messageSection = redirectedSection(redirectedFrom, "messages");
  const requestSection = redirectedSection(redirectedFrom, "requests");
  const esignSection = redirectedSection(redirectedFrom, "esign");
  const companySection = redirectedSection(redirectedFrom, "reports");
  return {
    messageTab: tabIdFromSection(messageTabs, messageSection, "send"),
    requestTab: requestSection.includes("sent") ? "sent" : "received",
    requestFilter: requestFilterFromSection(requestSection),
    esignTab: tabIdFromSection(esignTabs, esignSection, "send"),
    companyTab: companyTabFromSection(companySection),
    section: homeSectionMeta[activeSection] ? activeSection : "home-dashboard"
  };
}

function actionButtonLabel(action) {
  if (action === "approve") return "승인";
  if (action === "reject") return "반려";
  if (action === "complete") return "완료";
  return "열기";
}

function buildHomeActionRows(items, type) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const deadline = type === "task" ? taskDeadlineInfo(item) : null;
    return {
      id: item.id,
      title: item.title,
      meta: [item.requester, formatDateTime(item.due_at), item.matter_ref].filter(Boolean).join(" · "),
      status: deadline?.bucket ?? homeActionStatus(item),
      statusLabel: deadline?.label ?? statusBadgeLabel(homeActionStatus(item)),
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

function feedEmptyMessage(tab, tabSpec, result) {
  if (result.kind === "loading") return "피드를 불러오는 중입니다.";
  if (tab === "news" && result.safeErrorCodes?.includes("HOME_NEWS_ALL_SOURCES_FAILED")) {
    return "뉴스 피드를 불러오지 못했습니다.";
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

function DashboardCard({ className = "", title, meta, Icon, children, widgetId, onViewAll, headerExtra = null }) {
  const WidgetIcon = Icon;
  return (
    <section className={`home-dashboard-card ${className}`} data-widget-id={widgetId}>
      <header className="home-dashboard-card-header">
        <div>
          <span>{title}</span>
          {meta && <small>{meta}</small>}
        </div>
        <div className="home-dashboard-card-actions">
          {WidgetIcon && (
            <span className="home-dashboard-card-icon" aria-hidden="true">
              <WidgetIcon size={18} />
            </span>
          )}
          {headerExtra}
          {onViewAll && (
            <button type="button" className="home-widget-view-all" data-home-widget-view-all={widgetId} onClick={onViewAll}>
              전체 보기 <ArrowRight size={14} />
            </button>
          )}
        </div>
      </header>
      {children}
    </section>
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
  pending = false
}) {
  const inlineActions = allowedActions.filter((action) => action !== "open");
  return (
    <div
      className={`home-dashboard-row ${status}`}
      data-home-action-id={id}
      data-home-action-type={type}
      data-home-action-row={route}
      data-home-deadline-bucket={deadlineBucket ?? undefined}
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
                aria-label={`${title} ${actionButtonLabel(action)}`}
                onClick={() => onAction?.(action)}
              >
                <CheckCircle2 size={16} />
                <span className="sr-only">{actionButtonLabel(action)}</span>
              </button>
            ) : (
              <button
                key={action}
                type="button"
                className="text-button"
                disabled={pending}
                data-home-inline-action={action}
                aria-label={`${title} ${actionButtonLabel(action)}`}
                onClick={() => onAction?.(action)}
              >
                {actionButtonLabel(action)}
              </button>
            )
          ))}
        </span>
      ) : (
        <button type="button" className="home-dashboard-row-open" aria-label={`${title} 열기`} onClick={() => onOpen(route)}>
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

function EmptyWidgetState({ children }) {
  return (
    <div className="home-widget-empty">
      <CheckCircle2 size={16} />
      <span>{children}</span>
    </div>
  );
}

function HomeTabList({ label, tabs, activeTab, onSelect, dataPrefix = "home-tab" }) {
  return (
    <div className="home-section-tabs" role="tablist" aria-label={label}>
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

function HomeSectionPanel({ section, title, meta, Icon, children }) {
  const PanelIcon = Icon;
  return (
    <section className="home-section-panel" data-home-section-screen={section}>
      <header className="home-section-panel-header">
        <div>
          <span>{title}</span>
          {meta && <small>{meta}</small>}
        </div>
        {PanelIcon && (
          <span className="home-dashboard-card-icon" aria-hidden="true">
            <PanelIcon size={18} />
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function HomeStatusList({ title, count, children, empty }) {
  return (
    <section className="home-status-list">
      <header>
        <strong>{title}</strong>
        <span>{count}건</span>
      </header>
      <div className="home-status-list-body">
        {count > 0 ? children : <EmptyWidgetState>{empty}</EmptyWidgetState>}
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
  onHomeActionCountsChange = noop
}) {
  const skin = useSkin();
  const initialHomeContext = useMemo(() => activeHomeContext(activeSection, redirectedFrom), [activeSection, redirectedFrom?.view, redirectedFrom?.section]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [results, setResults] = useState([]);
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
  const [feedTab, setFeedTab] = useState("notice");
  const [messageTab, setMessageTab] = useState(initialHomeContext.messageTab);
  const [requestTab, setRequestTab] = useState(initialHomeContext.requestTab);
  const [requestFilter, setRequestFilter] = useState(initialHomeContext.requestFilter);
  const [esignTab, setEsignTab] = useState(initialHomeContext.esignTab);
  const [companyTab, setCompanyTab] = useState(initialHomeContext.companyTab);
  const [selectedMessageThreadId, setSelectedMessageThreadId] = useState("");
  const [approvalWidgetTab, setApprovalWidgetTab] = useState("received");
  const [selectedFeedEntryId, setSelectedFeedEntryId] = useState("");
  const pendingActionTimersRef = useRef(new Map());

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
    const args = { ctx: liveCtx };
    async function loadResults() {
      const desktopResults = await fetchDesktopHomeBridgeResults();
      if (desktopResults) return desktopResults;
      return Promise.all([
      Promise.all([
        fetchMasterDataRecords({ ...args, modelType: "ClientGroup", limit: 10 }),
        fetchCrmOpportunities(args),
        fetchIntakeRequests(args),
        fetchPortalDashboard(args),
        fetchPortalRfi(args)
      ]).then((results) => ({ id: "client", result: combinePillarResults(results) })),
      Promise.all([
        fetchMatterRecords(args),
        fetchFinanceTimeEntries(args),
        fetchFinanceInvoices(args),
        fetchFinanceArAging(args),
        fetchAnalyticsDashboards(args),
        fetchAiReviewQueue(args)
      ]).then((results) => ({ id: "matter", result: combinePillarResults(results) })),
      fetchHrxPeopleOverview(args).then((result) => ({ id: "people", result })),
      Promise.all([fetchVaultDocuments(args), fetchDataRoomProjections(args)]).then((results) => ({
        id: "vault",
        result: combinePillarResults(results)
      }))
      ]);
    }
    loadResults().then((nextResults) => {
      if (!cancelled) setResults(nextResults);
    });
    return () => {
      cancelled = true;
    };
  }, [liveCtx, refreshToken]);

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
  const capabilityById = useMemo(() => new Map(capabilities.map((capability) => [capability.id, capability])), [capabilities]);
  const matterCapability = capabilityById.get("matter") ?? capabilities[0];
  const peopleCapability = capabilityById.get("people") ?? capabilities[0];
  const vaultCapability = capabilityById.get("vault") ?? capabilities[0];
  const failedCount = capabilities.filter((capability) => capability.status === "unavailable").length;
  const reviewCount = capabilities.filter((capability) => capability.status === "review" || capability.status === "guarded").length;
  const systemStatusItems = [
    { id: "matter", label: "Matter", status: matterCapability.status, statusLabel: statusBadgeLabel(matterCapability.status), Icon: Briefcase },
    { id: "vault", label: "Vault", status: vaultCapability.status, statusLabel: statusBadgeLabel(vaultCapability.status), Icon: FolderOpen },
    { id: "people", label: "구성원", status: peopleCapability.status, statusLabel: statusBadgeLabel(peopleCapability.status), Icon: Users },
    {
      id: "sync",
      label: "동기화",
      status: failedCount > 0 ? "unavailable" : "live",
      statusLabel: failedCount > 0 ? `${failedCount}건 실패` : statusBadgeLabel("live"),
      Icon: RefreshCw
    }
  ];
  const approvalRows = sortApprovalRows(buildHomeActionRows(actionInbox.approval.items, "approval"));
  const todoRows = sortTodoRows(buildHomeActionRows(actionInbox.task.items, "task"));
  const approvalItems = Array.isArray(actionInbox.approval.items) ? actionInbox.approval.items : [];
  const requesterRecords = [
    sessionProfile.profileUser,
    sessionProfile.desktopStatus,
    readLawosApiSession()?.session,
    readLawosSessionEnvelope()
  ];
  const requestApproverDenied = sessionHasExplicitNonApproverRole(requesterRecords);
  const visibleRequestTabs = requestApproverDenied ? requestTabs.filter((tab) => tab.id === "sent") : requestTabs;
  const activeRequestTab = visibleRequestTabs.some((tab) => tab.id === requestTab) ? requestTab : visibleRequestTabs[0]?.id ?? "sent";
  const visibleApprovalWidgetTabs = requestApproverDenied ? requestTabs.filter((tab) => tab.id === "sent") : requestTabs;
  const activeApprovalWidgetTab = visibleApprovalWidgetTabs.some((tab) => tab.id === approvalWidgetTab)
    ? approvalWidgetTab
    : visibleApprovalWidgetTabs[0]?.id ?? "sent";
  const filteredApprovalItems = filterRequestItems(approvalItems, requestFilter);
  const filteredApprovalRows = sortApprovalRows(buildHomeActionRows(filteredApprovalItems, "approval"));
  const sentRequestRows = [];
  const approvalPreviewRows = activeApprovalWidgetTab === "sent" ? sentRequestRows.slice(0, 4) : approvalRows.slice(0, 4);
  const todoPreviewRows = todoRows.slice(0, 5);
  const selectedRequestFilter = requestFilters.find((filter) => filter.id === requestFilter) ?? requestFilters[0];
  const guardedApprovalRows = filteredApprovalRows.filter((row) => row.status === "review" || row.status === "guarded");
  const readyApprovalRows = filteredApprovalRows.filter((row) => row.status === "live");
  const blockedApprovalRows = filteredApprovalRows.filter((row) => row.status === "denied" || row.status === "unavailable");
  const calendarCells = useMemo(() => buildMonthCells(selectedCalendarDate), [selectedCalendarDate]);
  const selectedCalendarKey = dateKey(selectedCalendarDate);
  const agendaEvents = Array.isArray(agendaResult.events) ? agendaResult.events : [];
  const agendaByDate = useMemo(() => agendaSummaryByDate(agendaEvents), [agendaEvents]);
  const selectedAgenda = agendaForDate(agendaEvents, selectedCalendarDate);
  const nextDeadline = upcomingDeadline(agendaEvents);
  const currentFeedTab = feedTabs.find((tab) => tab.id === feedTab) ?? feedTabs[0];
  const feedEntries = Array.isArray(feedResult.entries) ? feedResult.entries : [];
  const primaryFeedEntry = feedEntries[0] ?? null;
  const selectedFeedEntry = feedEntries.find((entry) => entry.id === selectedFeedEntryId) ?? null;
  const canRetryFeed = feedResult.kind === "error" || (feedTab === "news" && feedResult.safeErrorCodes?.includes("HOME_NEWS_ALL_SOURCES_FAILED"));
  const guardedDomainStatuses = [matterCapability.status, peopleCapability.status, vaultCapability.status];
  const showForestOnboarding =
    skin === "forest" &&
    guardedDomainStatuses.every((status) => status === "denied" || status === "guarded" || status === "unavailable") &&
    !homeOnboardingDismissed;
  const forestHeroTitle = sessionGreeting(sessionProfile.profileUser, sessionProfile.desktopStatus);
  const forestHeroSubtitle = heroDateFormatter.format(new Date());
  const homeActionTotal = countTotal(actionInbox.counts);
  const activeHomeSection = homeSectionMeta[activeSection] ? activeSection : "home-dashboard";
  const currentHomeSectionMeta = homeSectionMeta[activeHomeSection] ?? homeSectionMeta["home-dashboard"];
  const heroTitle = activeHomeSection === "home-dashboard" ? forestHeroTitle : currentHomeSectionMeta.title;
  const heroSubtitle = activeHomeSection === "home-dashboard"
    ? `${forestHeroSubtitle} · 오늘 처리할 항목 ${homeActionTotal}건`
    : currentHomeSectionMeta.subtitle;
  const auditSummary = [
    { id: "approval-audit", label: "승인 감사", value: actionInbox.approval.auditHintRef ?? "대기" },
    { id: "task-audit", label: "업무 감사", value: actionInbox.task.auditHintRef ?? "대기" },
    { id: "feed-audit", label: "피드 감사", value: feedResult.auditHintRef ?? "대기" }
  ];
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
        setUndoNotice({ id: row.id, title: row.title, message: "요청을 처리하지 못했습니다." });
        return;
      }
      setUndoNotice((current) => (
        current?.pendingKey === pendingKey
          ? { id: row.id, title: row.title, action, message: `${actionButtonLabel(action)} 처리했습니다.` }
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
      message: `${actionButtonLabel(action)} 대기 중입니다.`,
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
        onOpen={(route) => setView(route === "home-requests" ? "home" : "matters", route)}
        onAction={(action) => handleHomeAction(row, action)}
        pending={pendingActionId.startsWith(`${row.id}:`)}
      />
    );
  }

  function openMessageThread(item) {
    if (!item?.id) return;
    setSelectedMessageThreadId(item.id);
    onMessageThreadOpen(item.id);
  }

  function renderMessagesScreen() {
    const currentTab = messageTabs.find((tab) => tab.id === messageTab) ?? messageTabs[0];
    const unreadIds = unreadMessageIds instanceof Set ? unreadMessageIds : new Set();
    const allMessages = Array.isArray(messageItems) ? messageItems : [];
    const tabMessages = allMessages.filter((item) => item.tab === currentTab.id || item.section === currentTab.section);
    const selectedMessage = tabMessages.find((item) => item.id === selectedMessageThreadId) ?? null;
    return (
      <HomeSectionPanel section="home-messages" title="메시지" meta={`${currentTab.label} · ${tabMessages.length}건`} Icon={Mail}>
        <HomeTabList label="메시지 탭" tabs={messageTabs} activeTab={messageTab} onSelect={setMessageTab} dataPrefix="messages" />
        <div className="home-section-content" role="tabpanel" data-home-message-tab={messageTab}>
          <div className="home-message-layout">
            <HomeStatusList title={currentTab.label} count={tabMessages.length} empty="표시할 메시지가 없습니다.">
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
                        <em>{unread ? item.status : "읽음"}</em>
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
                  <button type="button" className="text-button" onClick={() => setView("matters", "matter-channel")}>
                    Matter 대화 열기
                  </button>
                )}
              </aside>
            )}
          </div>
        </div>
      </HomeSectionPanel>
    );
  }

  function renderRequestsScreen() {
    const rows = activeRequestTab === "sent" ? sentRequestRows : filteredApprovalRows;
    const readyRows = activeRequestTab === "sent" ? [] : readyApprovalRows;
    const reviewRows = activeRequestTab === "sent" ? [] : guardedApprovalRows;
    const blockedRows = activeRequestTab === "sent" ? [] : blockedApprovalRows;
    return (
      <HomeSectionPanel section="home-requests" title="승인 요청" meta={`${selectedRequestFilter.label} · ${rows.length}건`} Icon={ShieldCheck}>
        <div className="home-section-toolbar">
          <HomeTabList label="승인 요청 방향" tabs={visibleRequestTabs} activeTab={activeRequestTab} onSelect={setRequestTab} dataPrefix="requests-direction" />
          <div className="home-section-filters" role="tablist" aria-label="승인 요청 유형" data-home-request-tab={activeRequestTab} data-home-request-filter={requestFilter}>
            {requestFilters.map((filter) => (
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
          <HomeStatusList title="보낸 요청" count={sentRequestRows.length} empty="진행 중인 보낸 요청이 없습니다.">
            {sentRequestRows.map(renderRequestRow)}
          </HomeStatusList>
        ) : (
          <div className="home-status-grid">
            <HomeStatusList title="처리 대기" count={readyRows.length} empty="처리할 승인이 없습니다.">
              {readyRows.map(renderRequestRow)}
            </HomeStatusList>
            <HomeStatusList title="검토 필요" count={reviewRows.length} empty="검토가 필요한 요청이 없습니다.">
              {reviewRows.map(renderRequestRow)}
            </HomeStatusList>
            <HomeStatusList title="제한됨" count={blockedRows.length} empty="제한된 요청이 없습니다.">
              {blockedRows.map(renderRequestRow)}
            </HomeStatusList>
          </div>
        )}
      </HomeSectionPanel>
    );
  }

  function renderEsignScreen() {
    const currentTab = esignTabs.find((tab) => tab.id === esignTab) ?? esignTabs[0];
    return (
      <HomeSectionPanel section="home-esign" title="전자 계약" meta={currentTab.label} Icon={FileCheck2}>
        <HomeTabList label="전자 계약 탭" tabs={esignTabs} activeTab={esignTab} onSelect={setEsignTab} dataPrefix="esign" />
        <div className="home-section-content" role="tabpanel" data-home-esign-tab={esignTab}>
          <HomeStatusList title={currentTab.label} count={0} empty="표시할 전자 계약 항목이 없습니다.">
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
        <HomeSectionPanel section="home-company" title="회사 현황" meta="권한 필요" Icon={ClipboardList}>
          <div className="home-company-access-notice" role="status" data-home-company-access-denied="true">
            <strong>관리자 권한이 필요합니다.</strong>
            <span>회사 현황은 관리자 role이 확인된 세션에서만 열 수 있습니다.</span>
          </div>
        </HomeSectionPanel>
      );
    }
    return (
      <HomeSectionPanel section="home-company" title="회사 현황" meta={currentTab.label} Icon={ClipboardList}>
        <HomeTabList label="회사 현황 리포트" tabs={companyTabs} activeTab={companyTab} onSelect={setCompanyTab} dataPrefix="company" />
        <div className="home-company-grid" role="tabpanel" data-home-company-tab={companyTab}>
          <section className="home-company-summary" data-home-permission-summary="true">
            <header>
              <strong>권한 상태</strong>
              <small>{failedCount > 0 || reviewCount > 0 ? "확인 필요" : "정상"}</small>
            </header>
            <div className="home-system-pill-grid">
              {systemStatusItems.map(({ id, label, status, statusLabel, Icon }) => (
                <div key={id} className={`home-system-pill ${status}`}>
                  <Icon size={15} />
                  <span>{label}</span>
                  <em>{statusLabel}</em>
                </div>
              ))}
            </div>
          </section>
          <section className="home-company-summary" data-home-audit-summary="true">
            <header>
              <strong>감사 요약</strong>
              <small>최근 읽기 기준</small>
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
              <small>회사 현황</small>
            </header>
            <div className="home-audit-summary-list">
              <div>
                <span>승인 대기</span>
                <strong>{actionInbox.counts.approval}건</strong>
              </div>
              <div>
                <span>지연 업무</span>
                <strong>{actionInbox.counts.task_late}건</strong>
              </div>
              <div>
                <span>오늘 업무</span>
                <strong>{actionInbox.counts.task_today}건</strong>
              </div>
            </div>
          </section>
        </div>
      </HomeSectionPanel>
    );
  }

  function shiftCalendarMonth(delta) {
    setSelectedCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, Math.min(current.getDate(), 28)));
  }

  function renderTodoEmpty() {
    if (showForestOnboarding) {
      return (
        <div className="home-widget-empty actionable">
          <button type="button" className="text-button" data-home-todo-onboarding-cta="true" onClick={() => setView("matters", "matter-tasks")}>
            첫 할 일 만들기 <ArrowRight size={14} />
          </button>
        </div>
      );
    }
    return <EmptyWidgetState>오늘 마감 업무가 없습니다</EmptyWidgetState>;
  }

  function renderDashboardGrid() {
    return (
      <div className="home-dashboard-grid" data-home-ops-queue="true" data-home-dashboard-grid="true" data-lcx-web-capability-count={capabilities.length}>
        <DashboardCard
          className="home-dashboard-approval"
          title="승인 대기"
          meta={`${actionInbox.counts.approval}건`}
          Icon={Inbox}
          widgetId="approval"
          onViewAll={() => setView("home", "home-requests")}
        >
          <span className="sr-only" data-home-widget-approval-count={actionInbox.counts.approval}>{actionInbox.counts.approval}</span>
          <HomeTabList label="승인 요청 방향" tabs={visibleApprovalWidgetTabs} activeTab={activeApprovalWidgetTab} onSelect={setApprovalWidgetTab} dataPrefix="approval-widget" />
          <div className="home-widget-list">
            {approvalPreviewRows.map((row) => (
              <DashboardRow
                key={row.id}
                {...row}
                onOpen={(route) => setView(route === "home-requests" ? "home" : "matters", route)}
                onAction={(action) => handleHomeAction(row, action)}
                pending={pendingActionId.startsWith(`${row.id}:`)}
              />
            ))}
            {approvalPreviewRows.length === 0 && <EmptyWidgetState>처리할 승인이 없습니다 — 모두 완료했습니다</EmptyWidgetState>}
          </div>
        </DashboardCard>
        <DashboardCard
          className="home-dashboard-todo"
          title="오늘 To Do"
          meta={`지연 ${actionInbox.counts.task_late} · 오늘 ${actionInbox.counts.task_today}`}
          Icon={Clock3}
          widgetId="todo"
          onViewAll={() => setView("home", "home-dashboard")}
        >
          <span className="sr-only" data-home-widget-task-count={actionInbox.counts.task_today}>{actionInbox.counts.task_today}</span>
          <div className="home-widget-list">
            {todoPreviewRows.map((row) => (
              <DashboardRow
                key={row.id}
                {...row}
                onOpen={(route) => setView(route === "home-dashboard" ? "home" : "matters", route)}
                onAction={(action) => handleHomeAction(row, action)}
                pending={pendingActionId.startsWith(`${row.id}:`)}
              />
            ))}
            {todoPreviewRows.length === 0 && renderTodoEmpty()}
          </div>
        </DashboardCard>
        <DashboardCard
          className="home-dashboard-feed"
          title="피드"
          meta={currentFeedTab.label}
          Icon={Newspaper}
          widgetId="feed"
          onViewAll={() => setView("home", "home-dashboard")}
        >
          <div className="home-feed-tabs" role="tablist" aria-label="홈 피드">
            {feedTabs.map((tab) => (
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
          <div
            id={`home-feed-panel-${feedTab}`}
            role="tabpanel"
            aria-labelledby={`home-feed-tab-${feedTab}`}
          >
          {primaryFeedEntry ? (
            <div className="home-feed-content" data-home-feed-entry-count={feedEntries.length}>
              <button type="button" className="home-feed-feature" data-home-feed-entry={primaryFeedEntry.id} onClick={() => setSelectedFeedEntryId(primaryFeedEntry.id)}>
                <span>{primaryFeedEntry.source}</span>
                <strong>{primaryFeedEntry.title}</strong>
                <p>{primaryFeedEntry.body_preview}</p>
              </button>
              <div className="home-feed-list">
                {feedEntries.slice(1, 4).map((entry) => (
                  <button type="button" key={entry.id} data-home-feed-entry={entry.id} onClick={() => setSelectedFeedEntryId(entry.id)}>
                    <span>{entry.source}</span>
                    <strong>{entry.title}</strong>
                    <small>{formatDateTime(entry.published_at)}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="home-feed-empty">
              <FileSignature size={16} />
              <strong>{feedEmptyMessage(feedTab, currentFeedTab, feedResult)}</strong>
              {currentFeedTab.sources && <span>{currentFeedTab.sources}</span>}
              {canRetryFeed && (
                <button type="button" className="text-button home-feed-retry" data-home-feed-retry="true" onClick={() => setRefreshToken((value) => value + 1)}>
                  다시 시도
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
                  <button type="button" className="icon-button" aria-label="읽기 패널 닫기" onClick={() => setSelectedFeedEntryId("")}>
                    <X size={15} />
                  </button>
                </header>
                <strong>{selectedFeedEntry.title}</strong>
                <p>{selectedFeedEntry.body_preview}</p>
                {selectedFeedEntry.url && <a href={selectedFeedEntry.url} target="_blank" rel="noreferrer" aria-label={`${selectedFeedEntry.title} 원문 열기`}>원문 열기</a>}
              </article>
            </div>
          )}
        </DashboardCard>
        <aside className="home-dashboard-rail" data-home-dashboard-rail="true">
          <DashboardCard
            className="home-dashboard-calendar"
            title="캘린더"
            meta={monthFormatter.format(selectedCalendarDate)}
            Icon={CalendarDays}
            widgetId="calendar"
            onViewAll={() => setView("home", "home-dashboard")}
            headerExtra={(
              <span className="home-calendar-nav" aria-label="월 이동">
                <button type="button" aria-label="이전 달" data-home-calendar-prev="true" onClick={() => shiftCalendarMonth(-1)}>
                  <ChevronLeft size={14} />
                </button>
                <button type="button" aria-label="다음 달" data-home-calendar-next="true" onClick={() => shiftCalendarMonth(1)}>
                  <ChevronRight size={14} />
                </button>
              </span>
            )}
          >
            <div className="home-calendar-weekdays">
              {calendarWeekdays.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
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
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-home-calendar-day={cell.key}
                    data-home-calendar-day-kind={hasDeadline ? "deadline" : hasGeneral ? "general" : "empty"}
                    onClick={() => setSelectedCalendarDate(cell.date)}
                    aria-label={`${selectedDateFormatter.format(cell.date)}${cell.key === selectedCalendarKey ? " 선택됨" : ""}`}
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
                <button type="button" className="text-button home-calendar-open" data-home-calendar-open="true" onClick={() => setView("matters", "matter-calendar")}>
                  캘린더 열기
                </button>
              </div>
              {nextDeadline && (
                <button type="button" className="home-calendar-deadline-callout" data-home-upcoming-deadline="true" onClick={() => setView("matters", "matter-calendar")}>
                  <span>임박 기한 1건</span>
                  <strong>{nextDeadline.title}</strong>
                </button>
              )}
              {selectedAgenda.length === 0 ? (
                <span>{agendaResult.kind === "loading" ? "일정을 불러오는 중입니다." : "이 날 일정이 없습니다."}</span>
              ) : (
                <div className="home-calendar-agenda-list" data-home-agenda-count={selectedAgenda.length}>
                  {selectedAgenda.slice(0, 3).map((event) => (
                    <button key={event.id} type="button" className={event.kind === "deadline" ? "deadline" : ""} onClick={() => setView("matters", event.matter_ref ? "matter-calendar" : "matter-home")}>
                      <span>{event.kind === "deadline" ? "기한" : event.kind}</span>
                      <strong>{event.title}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DashboardCard>
          <DashboardCard
            className="home-dashboard-system"
            title="시스템 상태"
            meta={failedCount > 0 || reviewCount > 0 ? "확인 필요" : "정상"}
            Icon={Briefcase}
            widgetId="system"
            onViewAll={() => setView("home", "home-company")}
          >
            <div className="home-system-pill-grid">
              {systemStatusItems.map(({ id, label, status, statusLabel, Icon }) => (
                <div key={id} className={`home-system-pill ${status}`}>
                  <Icon size={15} />
                  <span>{label}</span>
                  <em>{statusLabel}</em>
                </div>
              ))}
            </div>
          </DashboardCard>
        </aside>
      </div>
    );
  }

  function renderActiveHomeSection() {
    if (activeHomeSection === "home-messages") return renderMessagesScreen();
    if (activeHomeSection === "home-requests") return renderRequestsScreen();
    if (activeHomeSection === "home-esign") return renderEsignScreen();
    if (activeHomeSection === "home-company") return renderCompanyScreen();
    return renderDashboardGrid();
  }

  return (
    <section className="surface stack lcx-web-command-center home-dashboard-surface" data-lcx-web-command-center="true" data-home-dashboard-shell="true" data-active-home-section={activeHomeSection}>
      <section className="home-dashboard-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(9, 43, 39, 0.92), rgba(9, 43, 39, 0.62)), url(${forestCover})` }}>
        <div>
          <span>{currentHomeSectionMeta.eyebrow}</span>
          <h1>{heroTitle}</h1>
          <p data-home-hero-action-count={activeHomeSection === "home-dashboard" ? homeActionTotal : undefined}>{heroSubtitle}</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>
          <RefreshCw size={15} />
          새로고침
        </button>
      </section>
      {showForestOnboarding && (
        <section className="forest-onboarding-card" data-forest-onboarding-card="true">
          <div>
            <strong>연결 기준을 설정하세요</strong>
            <p>런타임 연결과 권한 컨텍스트를 구성하면 지표가 채워집니다.</p>
          </div>
          <div className="forest-onboarding-actions">
            <button className="secondary-button" type="button" onClick={() => setView("settings", "settings-theme")}>
              설정 열기
            </button>
            <button className="icon-button" type="button" aria-label="온보딩 닫기" onClick={dismissHomeOnboarding}>
              <X size={15} />
            </button>
          </div>
        </section>
      )}
      {homeCompanyAccessDenied && (
        <div className="home-company-access-notice" role="status" data-home-company-access-denied="true">
          <strong>회사 현황 접근이 제한되었습니다.</strong>
          <span>관리자 role이 확인되면 사이드바에서 다시 열 수 있습니다.</span>
        </div>
      )}
      {undoNotice && (
        <div className="home-action-undo" role="status" data-home-action-undo="true">
          <span>{undoNotice.message}</span>
          {undoNotice.undoExpiresAt && <button type="button" className="text-button" data-home-action-undo-button="true" onClick={handleUndoNotice}>실행 취소</button>}
        </div>
      )}
      {renderActiveHomeSection()}
    </section>
  );
}
