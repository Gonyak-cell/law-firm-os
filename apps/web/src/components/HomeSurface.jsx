import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSignature,
  FolderOpen,
  Inbox,
  Newspaper,
  RefreshCw,
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
  { id: "notice", label: "공지", empty: "표시할 공지가 없습니다." },
  { id: "news", label: "뉴스", empty: "새 뉴스가 없습니다.", sources: "블로터 · 법률신문 · 딜사이트 · 인베스트조선" },
  { id: "newsletter", label: "뉴스레터", empty: "새 뉴스레터가 없습니다." }
]);
const HOME_ONBOARDING_STORAGE_KEY = "matter.home.onboarding";
const DESKTOP_HOME_FEATURE_IDS = Object.freeze({
  client: "client_dashboard",
  matter: "matter_vault_dashboard",
  people: "people_dashboard",
  vault: "vault_dashboard"
});
const genericSessionDisplayNames = new Set(["사용자", "세션 사용자"]);
const noop = () => {};

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

function capabilityCount(capability) {
  return itemsFromResult(capability.result).length;
}

function capabilityStatusMessage(capability) {
  const count = capabilityCount(capability);
  if (capability.status === "loading") return `${capability.label} 상태를 확인하는 중입니다.`;
  if (capability.status === "unavailable") return `${capability.label} 목록을 불러오지 못했습니다. 로컬 런타임 또는 권한 컨텍스트를 확인하세요.`;
  if (capability.status === "denied") return `${capability.label} 접근 권한이 없습니다. 권한 요청 또는 사용자 컨텍스트를 확인하세요.`;
  if (capability.status === "review") return `${capability.label} 검토가 필요합니다. 담당자 승인 대기열을 확인하세요.`;
  if (capability.status === "guarded") return `${capability.label} 추가 확인이 필요합니다.`;
  if (count === 0) return `${capability.label}에 표시할 항목이 없습니다.`;
  return `${count}개 항목을 확인했습니다.`;
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

function homeActionStatus(item) {
  if (item.risk_tier === "high") return "review";
  if (item.risk_tier === "medium") return "guarded";
  return "live";
}

function homeActionRoute(item) {
  if (item.matter_ref) return item.type === "task" ? "matter-tasks" : "matter-approvals";
  return item.type === "task" ? "home-dashboard" : "home-requests";
}

function actionButtonLabel(action) {
  if (action === "approve") return "승인";
  if (action === "reject") return "반려";
  if (action === "complete") return "완료";
  return "열기";
}

function buildHomeActionRows(items, type) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    id: item.id,
    title: item.title,
    meta: [item.requester, formatDateTime(item.due_at), item.matter_ref].filter(Boolean).join(" · "),
    status: homeActionStatus(item),
    route: homeActionRoute({ ...item, type }),
    type,
    allowedActions: Array.isArray(item.allowed_actions) ? item.allowed_actions : ["open"]
  }));
}

function agendaForDate(events, date) {
  const selectedKey = dateKey(date);
  return (Array.isArray(events) ? events : []).filter((event) => {
    const startsAt = parseDate(event.starts_at);
    return startsAt && dateKey(startsAt) === selectedKey;
  });
}

function feedEmptyMessage(tab, tabSpec, result) {
  if (result.kind === "loading") return "피드를 불러오는 중입니다.";
  if (tab === "news" && result.safeErrorCodes?.includes("HOME_NEWS_ALL_SOURCES_FAILED")) {
    return "뉴스 피드를 불러오지 못했습니다 · 다시 시도";
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
      isToday: dateKey(date) === todayKey
    };
  });
}

function buildApprovalRows(capabilities) {
  return capabilities
    .filter((capability) => capability.status === "review" || capability.status === "guarded")
    .slice(0, 3)
    .map((capability) => ({
      id: capability.id,
      title: `${capability.label} 승인 확인`,
      meta: capabilityStatusMessage(capability),
      status: capability.status,
      route: capability.route
    }));
}

function buildTodoRows(capabilities) {
  return capabilities
    .filter((capability) => capability.status !== "live" || capabilityCount(capability) > 0)
    .slice(0, 4)
    .map((capability) => ({
      id: capability.id,
      title: `${capability.label} 상태 확인`,
      meta: capabilityStatusMessage(capability),
      status: capability.status,
      route: capability.route
    }));
}

function DashboardCard({ className = "", title, meta, Icon, children, widgetId }) {
  const WidgetIcon = Icon;
  return (
    <section className={`home-dashboard-card ${className}`} data-widget-id={widgetId}>
      <header className="home-dashboard-card-header">
        <div>
          <span>{title}</span>
          {meta && <small>{meta}</small>}
        </div>
        {WidgetIcon && (
          <span className="home-dashboard-card-icon" aria-hidden="true">
            <WidgetIcon size={18} />
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function DashboardRow({ title, meta, status, route, onOpen, allowedActions = [], onAction, pending = false }) {
  const inlineActions = allowedActions.filter((action) => action !== "open");
  return (
    <div className={`home-dashboard-row ${status}`} data-home-action-row={route}>
      <button type="button" className="home-dashboard-row-main" onClick={() => onOpen(route)}>
        <span>
          <strong>{title}</strong>
          <small>{meta}</small>
        </span>
      </button>
      <em>{statusBadgeLabel(status)}</em>
      {inlineActions.length > 0 ? (
        <span className="home-dashboard-row-actions">
          {inlineActions.map((action) => (
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

export function HomeSurface({ labels, setView, liveCtx = "allow", activeSection = "home-dashboard", onHomeActionCountsChange = noop }) {
  const skin = useSkin();
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
  const approvalRows = buildHomeActionRows(actionInbox.approval.items, "approval");
  const todoRows = buildHomeActionRows(actionInbox.task.items, "task");
  const calendarCells = useMemo(() => buildMonthCells(selectedCalendarDate), [selectedCalendarDate]);
  const selectedCalendarKey = dateKey(selectedCalendarDate);
  const selectedAgenda = agendaForDate(agendaResult.events, selectedCalendarDate);
  const currentFeedTab = feedTabs.find((tab) => tab.id === feedTab) ?? feedTabs[0];
  const feedEntries = Array.isArray(feedResult.entries) ? feedResult.entries : [];
  const primaryFeedEntry = feedEntries[0] ?? null;
  const guardedDomainStatuses = [matterCapability.status, peopleCapability.status, vaultCapability.status];
  const showForestOnboarding =
    skin === "forest" &&
    guardedDomainStatuses.every((status) => status === "denied" || status === "guarded" || status === "unavailable") &&
    !homeOnboardingDismissed;
  const forestHeroTitle = sessionGreeting(sessionProfile.profileUser, sessionProfile.desktopStatus);
  const forestHeroSubtitle = heroDateFormatter.format(new Date());
  function dismissHomeOnboarding() {
    writeHomeOnboardingDismissed();
    setHomeOnboardingDismissed(true);
  }

  async function handleHomeAction(row, action) {
    setPendingActionId(`${row.id}:${action}`);
    const result = await decideHomeActionInboxItem({
      id: row.id,
      action,
      ctx: liveCtx,
      idempotencyKey: `${row.id}:${action}:${Date.now()}`
    });
    setPendingActionId("");
    if (result.kind !== "data") {
      setUndoNotice({ id: row.id, title: row.title, message: "요청을 처리하지 못했습니다." });
      return;
    }
    const previousActionInbox = actionInbox;
    const nextCounts = {
      ...actionInbox.counts,
      approval: row.type === "approval" ? Math.max(0, Number(actionInbox.counts.approval ?? 0) - 1) : actionInbox.counts.approval,
      task_today: row.type === "task" ? Math.max(0, Number(actionInbox.counts.task_today ?? 0) - 1) : actionInbox.counts.task_today
    };
    setActionInbox((current) => ({
      ...current,
      [row.type]: {
        ...current[row.type],
        items: current[row.type].items.filter((item) => item.id !== row.id)
      },
      counts: nextCounts
    }));
    onHomeActionCountsChange(nextCounts);
    setUndoNotice({
      id: row.id,
      title: row.title,
      previousActionInbox,
      action,
      message: `${actionButtonLabel(action)} 처리했습니다.`,
      undoExpiresAt: result.undoExpiresAt
    });
  }

  function handleUndoNotice() {
    if (undoNotice?.previousActionInbox) {
      setActionInbox(undoNotice.previousActionInbox);
      onHomeActionCountsChange(undoNotice.previousActionInbox.counts);
    }
    setUndoNotice(null);
  }

  return (
    <section className="surface stack lcx-web-command-center home-dashboard-surface" data-lcx-web-command-center="true" data-home-dashboard-shell="true" data-active-home-section={activeSection || "home-dashboard"}>
      <section className="home-dashboard-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(9, 43, 39, 0.92), rgba(9, 43, 39, 0.62)), url(${forestCover})` }}>
        <div>
          <span>Home</span>
          <h1>{forestHeroTitle}</h1>
          <p>{forestHeroSubtitle}</p>
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
      {undoNotice && (
        <div className="home-action-undo" role="status" data-home-action-undo="true">
          <span>{undoNotice.message}</span>
          {undoNotice.undoExpiresAt && <button type="button" className="text-button" onClick={handleUndoNotice}>실행 취소</button>}
        </div>
      )}
      <div className="home-dashboard-grid" data-home-ops-queue="true" data-home-dashboard-grid="true" data-lcx-web-capability-count={capabilities.length}>
        <DashboardCard className="home-dashboard-approval" title="승인 대기" meta={`${actionInbox.counts.approval}건`} Icon={Inbox} widgetId="approval">
          <span className="sr-only" data-home-widget-approval-count={actionInbox.counts.approval}>{actionInbox.counts.approval}</span>
          <div className="home-widget-list">
            {approvalRows.map((row) => (
              <DashboardRow
                key={row.id}
                {...row}
                onOpen={(route) => setView(route === "home-requests" ? "home" : "matters", route)}
                onAction={(action) => handleHomeAction(row, action)}
                pending={pendingActionId.startsWith(`${row.id}:`)}
              />
            ))}
            {approvalRows.length === 0 && <EmptyWidgetState>처리할 승인이 없습니다.</EmptyWidgetState>}
          </div>
        </DashboardCard>
        <DashboardCard className="home-dashboard-todo" title="오늘 To Do" meta={`${actionInbox.counts.task_today}건`} Icon={Clock3} widgetId="todo">
          <span className="sr-only" data-home-widget-task-count={actionInbox.counts.task_today}>{actionInbox.counts.task_today}</span>
          <div className="home-widget-list">
            {todoRows.map((row) => (
              <DashboardRow
                key={row.id}
                {...row}
                onOpen={(route) => setView(route === "home-dashboard" ? "home" : "matters", route)}
                onAction={(action) => handleHomeAction(row, action)}
                pending={pendingActionId.startsWith(`${row.id}:`)}
              />
            ))}
            {todoRows.length === 0 && <EmptyWidgetState>오늘 마감 업무가 없습니다.</EmptyWidgetState>}
          </div>
        </DashboardCard>
        <DashboardCard className="home-dashboard-feed" title="피드" meta={currentFeedTab.label} Icon={Newspaper} widgetId="feed">
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
              <article className="home-feed-feature">
                <span>{primaryFeedEntry.source}</span>
                <strong>{primaryFeedEntry.title}</strong>
                <p>{primaryFeedEntry.body_preview}</p>
                {primaryFeedEntry.url && <a href={primaryFeedEntry.url} target="_blank" rel="noreferrer" aria-label={`${primaryFeedEntry.title} 원문 열기`}>원문 열기</a>}
              </article>
              <div className="home-feed-list">
                {feedEntries.slice(1, 4).map((entry) => (
                  <article key={entry.id}>
                    <span>{entry.source}</span>
                    <strong>{entry.title}</strong>
                    <small>{formatDateTime(entry.published_at)}</small>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="home-feed-empty">
              <FileSignature size={16} />
              <strong>{feedEmptyMessage(feedTab, currentFeedTab, feedResult)}</strong>
              {currentFeedTab.sources && <span>{currentFeedTab.sources}</span>}
            </div>
          )}
          </div>
        </DashboardCard>
        <aside className="home-dashboard-rail" data-home-dashboard-rail="true">
          <DashboardCard className="home-dashboard-calendar" title="캘린더" meta={monthFormatter.format(selectedCalendarDate)} Icon={CalendarDays} widgetId="calendar">
            <div className="home-calendar-weekdays">
              {calendarWeekdays.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="home-calendar-grid">
              {calendarCells.map((cell) => (
                <button
                  key={cell.key}
                  type="button"
                  className={[
                    cell.inMonth ? "in-month" : "out-month",
                    cell.isToday ? "today" : "",
                    cell.key === selectedCalendarKey ? "selected" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedCalendarDate(cell.date)}
                  aria-label={`${selectedDateFormatter.format(cell.date)}${cell.key === selectedCalendarKey ? " 선택됨" : ""}`}
                  aria-pressed={cell.key === selectedCalendarKey ? "true" : "false"}
                >
                  {cell.day}
                </button>
              ))}
            </div>
            <div className="home-calendar-agenda">
              <strong>{selectedDateFormatter.format(selectedCalendarDate)}</strong>
              {selectedAgenda.length === 0 ? (
                <span>{agendaResult.kind === "loading" ? "일정을 불러오는 중입니다." : "이 날 일정이 없습니다."}</span>
              ) : (
                <div className="home-calendar-agenda-list" data-home-agenda-count={selectedAgenda.length}>
                  {selectedAgenda.slice(0, 3).map((event) => (
                    <button key={event.id} type="button" onClick={() => setView("matters", event.matter_ref ? "matter-calendar" : "matter-home")}>
                      <span>{event.kind === "deadline" ? "기한" : event.kind}</span>
                      <strong>{event.title}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DashboardCard>
          <DashboardCard className="home-dashboard-system" title="시스템 상태" meta={failedCount > 0 || reviewCount > 0 ? "확인 필요" : "정상"} Icon={Briefcase} widgetId="system">
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
    </section>
  );
}
