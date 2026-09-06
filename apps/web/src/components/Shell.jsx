import React from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Tags,
  UserPlus,
  X
} from "lucide-react";
import { navItems } from "../data/nav.js";
import amicLawLogo from "../assets/amic-law.svg";
import {
  globalUtilityCatalog,
  globalUtilityItems,
  modeExceptionUtilityViewIds
} from "../data/globalUtilities.js";
import { fetchMatterRecentlyViewed, fetchMatterRecords, fetchUserProfile, readDesktopMatterSessionStatus, readLawosApiSession, readLawosSessionEnvelope } from "../data/apiClient.js";
import { MatterSplash } from "./MatterSplash.jsx";
import { getPeopleNavigationGroups } from "../people/peopleFeatureCatalog.js";
import { memberPhotoFor } from "../people/memberPhotos.js";
import { safePeopleLabel } from "../people/peoplePresentation.ts";
import { canAccessHomeFinanceSection } from "../data/financeAccess.js";
import { EMPTY_VAULT_CAPABILITY_PROJECTION, vaultCapabilityAllowed } from "../data/vaultCapabilities.js";
import {
  canAdjustLeaveLedger as canAdjustLeaveLedgerForRecords,
  canApproveLeave as canApproveLeaveForRecords,
  canExecuteLeaveAccrual as canExecuteLeaveAccrualForRecords,
  canExportLeaveReport as canExportLeaveReportForRecords,
  canManageLeavePromotion as canManageLeavePromotionForRecords,
  canSettleLeaveTermination as canSettleLeaveTerminationForRecords,
  canManageLeavePolicy as canManageLeavePolicyForRecords
} from "../data/hrxAccess.js";

const peopleIconMap = {
  bell: Bell,
  clipboard: ClipboardList,
  file: FileText,
  mail: Mail,
  settings: Settings,
  shield: ShieldCheck,
  users: UserPlus
};

const genericSessionDisplayNames = new Set(["사용자", "세션 사용자"]);
const searchClockFormatter = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
const searchDateFormatter = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" });

function shellLabel(labels, key, fallback) {
  return labels?.[key] ?? fallback;
}

function shellSessionText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function shellSessionFirst(records, keys) {
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    for (const key of keys) {
      const value = shellSessionText(record[key]);
      if (value) return value;
    }
  }
  return "";
}

function shellSessionIdentifiers(records) {
  const identifiers = [];
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    for (const key of ["user_id", "actor_ref", "email"]) {
      const value = shellSessionText(record[key]);
      if (value && !identifiers.includes(value)) identifiers.push(value);
    }
  }
  return identifiers;
}

function shellSessionDisplayName(records) {
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    for (const key of ["display_name", "name", "user_name"]) {
      const value = shellSessionText(record[key]);
      if (value && !genericSessionDisplayNames.has(value)) return value;
    }
  }
  return "";
}

function sidebarSessionProfile(profileUser) {
  const apiSession = readLawosApiSession() ?? {};
  const sessionEnvelope = readLawosSessionEnvelope() ?? {};
  const records = [
    profileUser,
    apiSession.session,
    apiSession.account,
    apiSession.user,
    apiSession.principal,
    apiSession,
    sessionEnvelope
  ];
  const name = shellSessionDisplayName(records);
  const identifiers = shellSessionIdentifiers(records);
  const userRef = identifiers[0] ?? "";
  const role = shellSessionFirst(records, ["title", "source_title", "primary_role_label", "role_label", "position", "job_title"]);
  return {
    name: safePeopleLabel(name, { identifiers }),
    role: safePeopleLabel(role, { identifiers }),
    userRef,
    canManageLeavePolicy: canManageLeavePolicyForRecords(records),
    canApproveLeave: canApproveLeaveForRecords(records),
    canExecuteLeaveAccrual: canExecuteLeaveAccrualForRecords(records),
    canAdjustLeaveLedger: canAdjustLeaveLedgerForRecords(records),
    canExportLeaveReport: canExportLeaveReportForRecords(records),
    canSettleLeaveTermination: canSettleLeaveTerminationForRecords(records),
    canManageLeavePromotion: canManageLeavePromotionForRecords(records)
  };
}

function searchMatterTitle(item, index = 0) {
  return item?.matter_code ?? item?.matter_number ?? item?.title ?? `Matter ${index + 1}`;
}

function searchHistoryItems(result, dateFields) {
  if (result?.kind !== "data" || !Array.isArray(result.items)) return [];
  return result.items
    .filter((item) => item?.matter_id)
    .sort((left, right) => {
      const value = (item) => {
        const raw = dateFields.map((field) => item?.[field]).find(Boolean);
        const parsed = raw ? new Date(raw) : null;
        return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
      };
      return value(right) - value(left);
    })
    .slice(0, 5);
}

function searchHistoryResultStatus(result) {
  if (result?.kind !== "data") return "error";
  if (result.uiState && !["ready", "empty"].includes(result.uiState)) return "error";
  if (result.outcome && result.outcome !== "passed") return "error";
  return "ready";
}

function searchHistoryTime(value, relative = false) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (relative) {
    const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
    if (minutes < 60) return `${Math.max(1, minutes)}분 전`;
    if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전`;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (dayDiff === 0) return `오늘 ${searchClockFormatter.format(date)}`;
  if (dayDiff === 1) return `어제 ${searchClockFormatter.format(date)}`;
  return searchDateFormatter.format(date);
}

function peopleSidebarGroups({ canManageLeavePolicy = false, canApproveLeave = false, canExecuteLeaveAccrual = false, canAdjustLeaveLedger = false, canSettleLeaveTermination = false, canManageLeavePromotion = false } = {}) {
  return getPeopleNavigationGroups({ canManageLeavePolicy, canApproveLeave, canExecuteLeaveAccrual, canAdjustLeaveLedger, canSettleLeaveTermination, canManageLeavePromotion }).map((group) => {
    const GroupIcon = peopleIconMap[group.icon] ?? ClipboardList;
    const children = group.children;
    if (children.length === 1 && children[0].section === "people-attendance-records") {
      const child = children[0];
      return {
        label: group.label,
        view: "people",
        section: child.section,
        icon: GroupIcon,
        count: typeof child.badge === "number" ? child.badge : null,
        active: child.active
      };
    }
    return {
      label: group.label,
      icon: GroupIcon,
      children: children.map((child) => {
        const ChildIcon = peopleIconMap[child.icon] ?? ClipboardList;
        return {
          label: child.label,
          view: "people",
          section: child.section,
          icon: ChildIcon,
          count: typeof child.badge === "number" ? child.badge : null,
          active: child.active
        };
      })
    };
  });
}

export function LoadingSurface({ labels, locale, setLocale, className = "", message = labels.loading }) {
  useEffect(() => {
    document.documentElement.dataset.locale = locale;
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.skin = "forest";
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
  }, [locale]);

  return (
    <main className={["loading-stage", className].filter(Boolean).join(" ")} data-matter-logo-flow={className.includes("post-login-splash") ? "post-login" : "startup"}>
      <MatterSplash />
      <strong>{message}</strong>
      <p>최근 작업공간을 준비하고 있습니다.</p>
      <div className="loading-actions">
        <button className="secondary-button" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>{labels.language}</button>
      </div>
    </main>
  );
}

const GlobalRailAction = React.forwardRef(function GlobalRailAction({ label, active = false, badge = 0, dot = false, className = "", children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={["global-rail-action", active ? "active" : "", className].filter(Boolean).join(" ")}
      {...props}
    >
      <span className="global-rail-icon" aria-hidden="true">{children}</span>
      {dot && <span className="global-rail-dot" data-notification-dot="true" />}
      {badge > 0 && <span className="global-rail-badge">{badge}</span>}
      <span className="global-rail-tooltip" role="tooltip">{label}</span>
    </button>
  );
});

export function buildNotificationItems({ homeActionCounts = {}, labels = {} } = {}) {
  const lateCount = Number(homeActionCounts.task_late ?? 0) || 0;
  const todayCount = Number(homeActionCounts.task_today ?? 0) || 0;
  return [
    lateCount > 0 && {
      id: `home-task-late:${lateCount}`,
      initials: shellLabel(labels, "homeNotificationInitialLate", "지"),
      type: shellLabel(labels, "homeNotificationType", "할 일"),
      title: shellLabel(labels, "homeNotificationLateTitle", "지연 업무"),
      client: shellLabel(labels, "homeNotificationActionInboxClient", "Home 액션 인박스"),
      status: shellLabel(labels, "homeNotificationLateStatus", "확인 필요"),
      summary: shellLabel(labels, "homeNotificationLateSummary", "오늘 처리 목록에서 지연 업무를 먼저 확인합니다."),
      time: shellLabel(labels, "realtimeLabel", "실시간")
    },
    todayCount > 0 && {
      id: `home-task-today:${todayCount}`,
      initials: shellLabel(labels, "homeNotificationInitialToday", "오"),
      type: shellLabel(labels, "homeNotificationType", "할 일"),
      title: shellLabel(labels, "homeNotificationTodayTitle", "오늘 업무"),
      client: shellLabel(labels, "homeNotificationActionInboxClient", "Home 액션 인박스"),
      status: shellLabel(labels, "homeNotificationTodayStatus", "오늘"),
      summary: shellLabel(labels, "homeNotificationTodaySummary", "오늘 마감 업무를 액션 인박스에서 확인합니다."),
      time: shellLabel(labels, "realtimeLabel", "실시간")
    }
  ].filter(Boolean);
}

function utilityDrawerConfigFor(labels = {}) {
  return {
    notifications: {
      title: shellLabel(labels, "utilityNotificationsTitle", "알림"),
      section: "home-dashboard"
    },
    messages: {
      title: shellLabel(labels, "utilityMessagesTitle", "메시지"),
      section: "home-messages"
    },
    approvals: {
      title: shellLabel(labels, "utilityApprovalsTitle", "승인 대기"),
      section: "home-requests"
    }
  };
}

function utilityCountFor(type, { notificationUnreadCount: notifications, homeApprovalCount, homeMessageCount }) {
  if (type === "notifications") return Number(notifications) || 0;
  if (type === "messages") return Number(homeMessageCount) || 0;
  if (type === "approvals") return Number(homeApprovalCount) || 0;
  return 0;
}

function utilityApprovalItems(count, labels = {}) {
  if (!count) return [];
  return [
    {
      id: "home-approval-summary",
      initials: shellLabel(labels, "utilityApprovalInitial", "승"),
      type: shellLabel(labels, "utilityApprovalType", "승인"),
      title: shellLabel(labels, "utilityApprovalTitle", "승인 대기"),
      client: shellLabel(labels, "utilityApprovalClient", "Home 승인 대기"),
      status: shellLabel(labels, "utilityApprovalStatus", "처리 대기"),
      summary: shellLabel(labels, "utilityApprovalSummary", "전체 보기에서 세부 요청을 열어 처리합니다."),
      time: shellLabel(labels, "realtimeLabel", "실시간")
    }
  ];
}

export function GlobalRail({
  labels,
  query,
  setQuery,
  axis = "home",
  setView,
  onCreate,
  onRefresh = () => {},
  utilityDrawerType = "",
  onOpenUtilityDrawer,
  notificationUnreadCount: railNotificationCount = 0,
  homeApprovalCount = 0,
  homeMessageCount = 0,
  liveCtx = "allow",
  showContextToggle = true,
  contextSidebarOpen = false,
  onToggleContextSidebar = () => {},
  onSearchOpen = () => {}
}) {
  const notificationsOpen = utilityDrawerType === "notifications";
  const messagesOpen = utilityDrawerType === "messages";
  const approvalsOpen = utilityDrawerType === "approvals";
  const notificationCount = Number(railNotificationCount) || 0;
  const messageCount = Number(homeMessageCount) || 0;
  const approvalCount = Number(homeApprovalCount) || 0;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(query ?? "");
  const [searchHistory, setSearchHistory] = useState({ status: "idle", viewedStatus: "idle", modifiedStatus: "idle", viewed: [], modified: [] });
  const searchRootRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const contextToggleRef = useRef(null);
  const searchHistoryRequestRef = useRef({ ctx: "", promise: null, loaded: false });
  const railMountedRef = useRef(true);
  const previousContextSidebarOpenRef = useRef(contextSidebarOpen);

  useEffect(() => {
    railMountedRef.current = true;
    return () => { railMountedRef.current = false; };
  }, []);

  useEffect(() => {
    setSearchDraft(query ?? "");
  }, [query]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const currentRequest = searchHistoryRequestRef.current;
    if (currentRequest.ctx === liveCtx && (currentRequest.promise || currentRequest.loaded)) return undefined;
    setSearchHistory((current) => ({ ...current, status: "loading", viewedStatus: "loading", modifiedStatus: "loading" }));
    const request = Promise.all([
      fetchMatterRecentlyViewed({ ctx: liveCtx, limit: 5 }),
      fetchMatterRecords({ ctx: liveCtx, limit: 5, maxPages: 1 })
    ]).then(([viewed, matters]) => {
      if (!railMountedRef.current || searchHistoryRequestRef.current.promise !== request) return;
      const viewedStatus = searchHistoryResultStatus(viewed);
      const modifiedStatus = searchHistoryResultStatus(matters);
      setSearchHistory({
        status: viewedStatus === "error" && modifiedStatus === "error" ? "error" : "ready",
        viewedStatus,
        modifiedStatus,
        viewed: searchHistoryItems(viewed, ["viewed_at", "updated_at", "created_at"]),
        modified: searchHistoryItems(matters, ["updated_at", "created_at"])
      });
    }).catch(() => {
      if (!railMountedRef.current || searchHistoryRequestRef.current.promise !== request) return;
      setSearchHistory({ status: "error", viewedStatus: "error", modifiedStatus: "error", viewed: [], modified: [] });
    }).finally(() => {
      if (searchHistoryRequestRef.current.promise === request) {
        searchHistoryRequestRef.current = { ctx: liveCtx, promise: null, loaded: true };
      }
    });
    searchHistoryRequestRef.current = { ctx: liveCtx, promise: request, loaded: false };
    return undefined;
  }, [searchOpen, liveCtx]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (previousContextSidebarOpenRef.current && !contextSidebarOpen) contextToggleRef.current?.focus();
    previousContextSidebarOpenRef.current = contextSidebarOpen;
  }, [contextSidebarOpen]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (searchOpen && !searchRootRef.current?.contains(event.target)) setSearchOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        searchTriggerRef.current?.focus();
        return;
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        onSearchOpen();
        setSearchOpen(true);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen, onSearchOpen]);

  return (
    <aside className="global-rail" aria-label={shellLabel(labels, "globalNavigationAria", "글로벌 탐색")} data-global-rail="true">
      <div className="global-rail-brand" role="img" aria-label="AMIC Law">
        <span className="global-rail-brand-mark">
          <img src={amicLawLogo} alt="" />
        </span>
      </div>
      <nav className="global-rail-nav" aria-label="Home Client Matter People Vault Portal" data-product-axis-nav="global-rail">
        {navItems.map(({ id, label, icon: Icon }) => {
          const itemLabel = shellLabel(labels, `${id}AxisLabel`, label);
          return (
            <GlobalRailAction
              key={id}
              label={itemLabel}
              active={axis === id}
              aria-label={itemLabel}
              aria-current={axis === id ? "page" : undefined}
              data-product-axis={id}
              onClick={() => {
                setSearchOpen(false);
                setView(id);
              }}
            >
              <Icon size={19} />
            </GlobalRailAction>
          );
        })}
      </nav>
      {showContextToggle && (
        <div className="global-rail-context">
          <GlobalRailAction
            ref={contextToggleRef}
            label={shellLabel(labels, "contextMenuAria", "업무 메뉴")}
            active={contextSidebarOpen}
            className="global-rail-context-toggle"
            aria-label={shellLabel(labels, "contextMenuAria", "업무 메뉴")}
            aria-controls="context-sidebar"
            aria-expanded={contextSidebarOpen ? "true" : "false"}
            data-context-sidebar-trigger="true"
            onClick={onToggleContextSidebar}
          >
            <PanelLeftOpen size={19} />
          </GlobalRailAction>
        </div>
      )}
      <div className="global-rail-utilities">
        <div className="global-rail-search-wrap" ref={searchRootRef}>
          <GlobalRailAction
            ref={searchTriggerRef}
            label={shellLabel(labels, "globalSearchAria", "전체 검색")}
            active={searchOpen}
            aria-label={shellLabel(labels, "globalSearchAria", "전체 검색")}
            aria-expanded={searchOpen ? "true" : "false"}
            aria-controls="global-search-popover"
            data-global-search-trigger="true"
            onClick={() => {
              onSearchOpen();
              setSearchOpen((open) => !open);
            }}
          >
            <Search size={19} />
          </GlobalRailAction>
          {searchOpen && (
            <div className="global-rail-search-panel">
              <label className="global-search">
                <Search size={16} />
                <input
                  ref={searchInputRef}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSearchOpen(false);
                      searchTriggerRef.current?.focus();
                    }
                    if (event.key === "Enter" && searchDraft.trim()) {
                      event.preventDefault();
                      const normalizedQuery = searchDraft.trim();
                      setQuery(normalizedQuery);
                      setView("vault", "vault-search-all", { query: normalizedQuery });
                      setSearchOpen(false);
                    }
                  }}
                  placeholder={labels.search}
                  aria-label={labels.search}
                  role="combobox"
                  aria-haspopup="dialog"
                  aria-expanded="true"
                  aria-controls="global-search-popover"
                />
                <kbd>/</kbd>
              </label>
              <GlobalSearch
                labels={labels}
                query={searchDraft}
                setQuery={setSearchDraft}
                setView={setView}
                history={searchHistory}
                onClose={() => {
                  setSearchOpen(false);
                  searchTriggerRef.current?.focus();
                }}
              />
            </div>
          )}
        </div>
        <GlobalRailAction
          label={labels.create}
          aria-label={labels.create}
          data-global-create-trigger="true"
          onClick={() => {
            setSearchOpen(false);
            onCreate();
          }}
        >
          <Plus size={19} />
        </GlobalRailAction>
        <GlobalRailAction
          label={shellLabel(labels, "railNotificationsAria", "알림")}
          active={notificationsOpen}
          dot={notificationCount > 0}
          aria-label={`${shellLabel(labels, "railNotificationsAria", "알림")} ${notificationCount}${shellLabel(labels, "countSuffix", "건")}`}
          aria-expanded={notificationsOpen ? "true" : "false"}
          aria-controls="notifications-utility-drawer"
          data-notification-trigger="true"
          data-notification-info-count={notificationCount}
          onClick={() => onOpenUtilityDrawer("notifications")}
        >
          <Bell size={19} />
        </GlobalRailAction>
        <GlobalRailAction
          label={shellLabel(labels, "railMessagesAria", "메시지")}
          active={messagesOpen}
          badge={messageCount}
          aria-label={`${shellLabel(labels, "railMessagesAria", "메시지")} ${messageCount}${shellLabel(labels, "countSuffix", "건")}`}
          aria-expanded={messagesOpen ? "true" : "false"}
          aria-controls="messages-utility-drawer"
          data-home-message-trigger="true"
          data-home-rail-message-count={messageCount}
          onClick={() => onOpenUtilityDrawer("messages")}
        >
          <MessageCircle size={19} />
        </GlobalRailAction>
        <GlobalRailAction
          label={shellLabel(labels, "railApprovalsAria", "승인 대기")}
          active={approvalsOpen}
          badge={approvalCount}
          aria-label={`${shellLabel(labels, "railApprovalsAria", "승인 대기")} ${approvalCount}${shellLabel(labels, "countSuffix", "건")}`}
          aria-expanded={approvalsOpen ? "true" : "false"}
          aria-controls="approvals-utility-drawer"
          data-home-approval-trigger="true"
          data-home-rail-approval-count={approvalCount}
          onClick={() => onOpenUtilityDrawer("approvals")}
        >
          <ShieldCheck size={19} />
        </GlobalRailAction>
        <GlobalRailAction
          label={shellLabel(labels, "refreshAria", "새로고침")}
          aria-label={shellLabel(labels, "refreshAria", "새로고침")}
          data-global-refresh-trigger="true"
          onClick={onRefresh}
        >
          <RefreshCw size={19} />
        </GlobalRailAction>
      </div>
    </aside>
  );
}

export function UtilityDrawer({
  labels = {},
  open,
  type = "notifications",
  notificationUnreadCount: drawerNotificationCount = 0,
  homeApprovalCount = 0,
  homeMessageCount = 0,
  notificationItems = [],
  messageItems = [],
  unreadMessageIds = new Set(),
  onClose = () => {},
  onNavigateHomeSection = () => {},
  onMarkNotificationRead = () => {},
  onMarkMessageRead = () => {},
  onMarkAllMessagesRead = () => {}
}) {
  const [allRead, setAllRead] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const utilityDrawerConfig = utilityDrawerConfigFor(labels);
  const config = utilityDrawerConfig[type] ?? utilityDrawerConfig.notifications;
  const count = utilityCountFor(type, {
    notificationUnreadCount: drawerNotificationCount,
    homeApprovalCount,
    homeMessageCount
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setAllRead(false);
    setSettingsOpen(false);
  }, [open, type]);

  if (!open) return null;

  const drawerItems = type === "notifications"
    ? (Array.isArray(notificationItems) ? notificationItems : [])
    : type === "messages"
      ? (Array.isArray(messageItems) ? messageItems : [])
      : utilityApprovalItems(count, labels);
  const visibleItems = type === "messages"
    ? drawerItems.filter((item) => unreadMessageIds.has(item.id))
    : drawerItems;

  function markNotificationsRead() {
    setAllRead(true);
    onMarkNotificationRead();
  }

  function markMessage(id) {
    onMarkMessageRead(id);
  }

  function markAllMessages() {
    setAllRead(true);
    onMarkAllMessagesRead();
  }

  function goToHomeSection() {
    onNavigateHomeSection(config.section);
  }

  return (
    <div
      className="notification-layer utility-layer"
      data-notification-drawer={type === "notifications" ? "open" : undefined}
      data-utility-drawer="open"
      data-utility-drawer-kind={type}
    >
      <button type="button" className="notification-scrim" aria-label={`${config.title} ${shellLabel(labels, "closeLabel", "닫기")}`} onClick={onClose} />
      <aside className="notification-drawer utility-drawer" id={`${type}-utility-drawer`} role="dialog" aria-modal="true" aria-labelledby={`${type}-utility-drawer-title`}>
        <header className="notification-drawer-header">
          <div>
            <h2 id={`${type}-utility-drawer-title`}>{config.title} <span>{count}</span></h2>
          </div>
          <button type="button" className="icon-button" aria-label={`${config.title} ${shellLabel(labels, "closeLabel", "닫기")}`} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {(allRead || settingsOpen) && (
          <div className="notification-local-state" data-notification-local-state="true">
            {allRead && <span data-notification-read-state="true">{type === "messages" ? shellLabel(labels, "utilityMessagesReadAll", "모든 메시지를 읽음으로 표시했습니다.") : shellLabel(labels, "utilityNotificationsReadAll", "모든 알림을 읽음으로 표시했습니다.")}</span>}
            {settingsOpen && <span data-notification-settings-state="true">{shellLabel(labels, "utilitySettingsLocal", "알림 설정은 이 기기에서만 표시됩니다.")}</span>}
          </div>
        )}
        <div className="notification-stack">
          {visibleItems.map((item) => (
            <article className="notification-card" key={item.id} data-notification-card="stacked" data-notification-card-id={item.id} data-utility-drawer-card={type} data-home-message-drawer-item={type === "messages" ? item.id : undefined}>
              <div className="notification-avatar" aria-hidden="true">{item.initials}</div>
              <div className="notification-card-body">
                <div className="notification-card-title">
                  <span className="notification-pill">{item.type}</span>
                  <strong>{item.title}</strong>
                </div>
                <p>{item.client}</p>
                <div className="notification-meta">
                  <Mail size={15} />
                  <span>{item.status}</span>
                  <time>{item.time}</time>
                </div>
                <small>{item.summary}</small>
                {type === "messages" && (
                  <button type="button" className="text-button utility-card-action" data-home-message-read={item.id} onClick={() => markMessage(item.id)}>
                    {shellLabel(labels, "utilityCardRead", "읽음 처리")}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        <footer className={type === "approvals" ? "notification-drawer-footer utility-drawer-footer single" : "notification-drawer-footer utility-drawer-footer"}>
          {type === "notifications" && (
            <>
              <button type="button" className="text-button" data-notification-mark-read="true" onClick={markNotificationsRead}>{shellLabel(labels, "utilityMarkAllRead", "모두 읽음 처리")}</button>
              <button type="button" className="text-button" data-notification-settings="true" onClick={() => setSettingsOpen((value) => !value)}>{shellLabel(labels, "utilityNotificationSettings", "알림 설정")}</button>
            </>
          )}
          {type === "messages" && (
            <>
              <button type="button" className="text-button" data-home-message-mark-read="true" onClick={markAllMessages}>{shellLabel(labels, "utilityMarkAllRead", "모두 읽음 처리")}</button>
              <button type="button" className="text-button" data-utility-view-all="home-messages" onClick={goToHomeSection}>{shellLabel(labels, "utilityViewAll", "전체 보기")}</button>
            </>
          )}
          {type === "approvals" && (
            <button type="button" className="text-button utility-drawer-footer-primary" data-utility-view-all="home-requests" onClick={goToHomeSection}>{shellLabel(labels, "utilityViewAll", "전체 보기")}</button>
          )}
        </footer>
      </aside>
    </div>
  );
}

function homeSidebarMeta(labels = {}, financeAccessRecords = []) {
  return {
    title: shellLabel(labels, "homeSidebarTitle", "Home"),
    actions: [
      { label: shellLabel(labels, "homeDashboardLabel", "대시보드"), view: "home", section: "home-dashboard", icon: LayoutDashboard, active: true },
      { label: shellLabel(labels, "homeTodoSidebarLabel", "할 일"), view: "home", section: "home-todo", icon: ClipboardList },
      { label: shellLabel(labels, "homeRequestsLabel", "승인 대기"), view: "home", section: "home-requests", icon: ShieldCheck },
      { label: shellLabel(labels, "homeMeetingRoomsLabel", "회의실 예약"), view: "home", section: "home-meeting-rooms", icon: CalendarClock },
      { label: shellLabel(labels, "homeFeedSidebarLabel", "피드"), view: "home", section: "home-feed", icon: Bell },
      { label: shellLabel(labels, "homeCalendarSidebarLabel", "캘린더"), view: "home", section: "home-calendar", icon: CalendarDays },
      { label: shellLabel(labels, "homeEsignLabel", "전자계약"), view: "home", section: "home-esign", icon: FileText },
      {
        label: shellLabel(labels, "homeFinanceLabel", "매출/비용"),
        icon: FileText,
        groupId: "home-finance",
        children: [
          { label: shellLabel(labels, "homeFinanceOverviewLabel", "전체 현황"), view: "home", section: "home-finance-overview", icon: LayoutDashboard },
          { label: shellLabel(labels, "homeFinanceMonthlyLabel", "월별 매출/비용"), view: "home", section: "home-finance-monthly", icon: CalendarDays },
          { label: shellLabel(labels, "homeFinanceClientsLabel", "고객별 매출/비용"), view: "home", section: "home-finance-clients", icon: ClipboardList },
          { label: shellLabel(labels, "homeFinanceCashflowLabel", "자금현황"), view: "home", section: "home-finance-cashflow", icon: LayoutDashboard },
          { label: shellLabel(labels, "homeFinanceTimeLabel", "시간 기록"), view: "home", section: "home-finance-time", icon: ClipboardList },
          { label: shellLabel(labels, "homeFinanceExpensesLabel", "비용 처리"), view: "home", section: "home-finance-expenses", icon: FileText },
          { label: shellLabel(labels, "homeFinanceBillingLabel", "청구/수납"), view: "home", section: "home-finance-billing", icon: FileText },
          { label: shellLabel(labels, "homeFinanceArLabel", "미수금"), view: "home", section: "home-finance-ar", icon: ShieldCheck }
        ].filter((item) => canAccessHomeFinanceSection(financeAccessRecords, item.section))
      }
    ],
    utilities: [
      { label: shellLabel(labels, "homeDataImportLabel", "데이터 가져오기"), icon: Tags, view: "data-import", section: "data-import-client" },
      { label: shellLabel(labels, "homeSettingsLabel", "설정"), icon: Settings, view: "settings", section: "settings-company" }
    ]
  };
}

const sidebarMeta = {
  clients: {
    title: "Client",
    utilities: []
  },
  matters: {
    title: "Matter",
    utilities: []
  },
  people: {
    title: "People",
    utilities: [
      { label: "급여정산", icon: FileText, view: "people", section: "people-payroll" }
    ]
  },
  vault: {
    title: "Vault",
    utilities: []
  },
  portal: {
    title: "공유 포털",
    utilities: []
  }
};

function vaultNavigationItems(labels, capabilities) {
  const groups = [
    {
      groupId: "vault-documents",
      label: shellLabel(labels, "vaultDocumentGroupLabel", "문서 관리"),
      icon: FileText,
      children: [
        { label: shellLabel(labels, "vaultDashboardLabel", "대시보드"), view: "vault", section: "vault-home", icon: LayoutDashboard, active: true },
        { label: shellLabel(labels, "vaultFilesLabel", "문서 목록"), view: "vault", section: "vault-files", icon: FileText, capability: "read" },
        { label: shellLabel(labels, "vaultRecentDocumentsLabel", "최근 문서"), view: "vault", section: "vault-recent", icon: CalendarClock, capability: "read" },
        { label: shellLabel(labels, "vaultFavoritesLabel", "즐겨찾기"), view: "vault", section: "vault-favorites", icon: Tags, capability: "read" },
        { label: shellLabel(labels, "vaultUploadLabel", "업로드"), view: "vault", section: "vault-upload", icon: Plus, capability: "upload" }
      ]
    },
    {
      groupId: "vault-search",
      label: shellLabel(labels, "vaultSearchGroupLabel", "검색"),
      icon: Search,
      children: [
        { label: shellLabel(labels, "searchAllLabel", "전체 검색"), view: "vault", section: "vault-search-all", icon: Search, capability: "read" },
        { label: shellLabel(labels, "searchRecentLabel", "최근 검색"), view: "vault", section: "vault-search-recent", icon: CalendarClock, capability: "read" },
        { label: shellLabel(labels, "searchSavedLabel", "저장한 검색"), view: "vault", section: "vault-search-saved", icon: Tags, capability: "read" }
      ]
    },
    {
      groupId: "vault-work",
      label: shellLabel(labels, "vaultWorkGroupLabel", "문서 업무"),
      icon: ClipboardList,
      children: [
        { label: shellLabel(labels, "vaultWorkStatusLabel", "처리 현황"), view: "vault", section: "vault-work", icon: LayoutDashboard, capability: "work" },
        { label: shellLabel(labels, "vaultCheckoutLabel", "체크아웃/편집"), view: "vault", section: "vault-checkout", icon: FileText, capability: "work" },
        { label: shellLabel(labels, "vaultReviewLabel", "검토/승인"), view: "vault", section: "vault-review", icon: ShieldCheck, capability: "work" }
      ]
    },
    {
      groupId: "vault-integrations",
      label: shellLabel(labels, "vaultIntegrationGroupLabel", "연동"),
      icon: Share2,
      children: [
        { label: shellLabel(labels, "vaultOutlookLabel", "Outlook"), view: "vault", section: "vault-outlook", icon: Mail, capability: "attach" },
        { label: shellLabel(labels, "vaultEmailLabel", "이메일 보관"), view: "vault", section: "vault-email", icon: Mail, capability: "upload" }
      ]
    },
    {
      groupId: "vault-governance",
      label: shellLabel(labels, "vaultGovernanceGroupLabel", "거버넌스"),
      icon: ShieldCheck,
      children: [
        { label: shellLabel(labels, "vaultAuditLabel", "감사"), view: "vault", section: "vault-audit", icon: ShieldCheck, capability: "audit" },
        { label: shellLabel(labels, "vaultEthicalWallLabel", "Ethical Wall"), view: "vault", section: "vault-ethical-wall", icon: ShieldCheck, capability: "governance" },
        { label: shellLabel(labels, "vaultRecordsLabel", "Legal Hold/Records"), view: "vault", section: "vault-records", icon: FileText, capability: "governance" },
        { label: shellLabel(labels, "vaultDlpLabel", "DLP"), view: "vault", section: "vault-dlp", icon: ShieldCheck, capability: "governance" }
      ]
    }
  ];

  return groups
    .map((group) => ({
      ...group,
      children: group.children.filter((item) => !item.capability || vaultCapabilityAllowed(capabilities, item.capability))
    }))
    .filter((group) => group.children.length > 0);
}

export function buildContextualNavigation({
  labels = {},
  financeAccessRecords = [],
  homeApprovalCount = 0,
  homeMessageCount = 0,
  canViewCompanyStatus = false,
  canManageLeavePolicy = false,
  canApproveLeave = false,
  canExecuteLeaveAccrual = false,
  canAdjustLeaveLedger = false,
  canExportLeaveReport = false,
  canSettleLeaveTermination = false,
  canManageLeavePromotion = false,
  vaultCapabilities = EMPTY_VAULT_CAPABILITY_PROJECTION
} = {}) {
  const localizedHomeMeta = homeSidebarMeta(labels, financeAccessRecords);
  const homeItems = localizedHomeMeta.actions
    .filter((item) => item.groupId !== "home-finance" || item.children.length > 0)
    .filter((item) => canViewCompanyStatus || item.section !== "home-company")
    .map((item) => {
      if (item.section === "home-requests") {
        return {
          ...item,
          count: Number(homeApprovalCount) > 0 ? Number(homeApprovalCount) : null,
          homeCount: Number(homeApprovalCount) || 0,
          homeCountKind: "approval"
        };
      }
      if (item.section === "home-messages") {
        return {
          ...item,
          count: Number(homeMessageCount) > 0 ? Number(homeMessageCount) : null,
          homeCount: Number(homeMessageCount) || 0,
          homeCountKind: "message"
        };
      }
      return item;
    });
  const modeExceptionNavigation = Object.fromEntries(
    globalUtilityCatalog
      .filter((utility) => modeExceptionUtilityViewIds.includes(utility.id))
      .map((utility) => [
        utility.id,
        {
          title: utility.label,
          utilities: [],
          items: [{
            label: utility.label,
            icon: utility.icon,
            groupId: `${utility.id}-sections`,
            children: utility.sections.map((section) => ({
              label: section.label,
              view: utility.id,
              section: section.id,
              icon: section.icon ?? utility.icon,
              count: section.badge,
              active: section.id === utility.defaultSection
            }))
          }]
        }
      ])
  );

  return {
    auth: {
      title: "AMIC OS",
      utilities: [],
      items: [
        { label: "로그인", view: "auth" },
        { label: "비밀번호 재설정", view: "auth" }
      ]
    },
    home: { ...localizedHomeMeta, items: homeItems },
    clients: {
      ...sidebarMeta.clients,
      items: [
        {
          label: "고객 관리",
          icon: ClipboardList,
          children: [
            { label: "대시보드", view: "clients", section: "clients-home", icon: LayoutDashboard, active: true },
            { label: "고객 목록", view: "clients", section: "clients-list", icon: ClipboardList },
            { label: "신규 고객", view: "clients", section: "client-new", icon: UserPlus },
            { label: "새 문의", view: "clients", section: "client-leads", icon: ClipboardList },
            { label: "입금 매출 내역", view: "clients", section: "client-sales-history", icon: FileText }
          ]
        },
        {
          label: "수임 전 업무",
          icon: FileText,
          children: [
            { label: "수임 현황", view: "clients", section: "client-opportunities", icon: ClipboardList },
            { label: "상담·수임 관리", view: "clients", section: "client-consultation-proposals", icon: FileText },
            { label: "접촉 이력", view: "clients", section: "client-activities", icon: ClipboardList },
          ]
        },
        {
          label: "운영",
          icon: Settings,
          children: [
            { label: "수임료·미수금", view: "clients", section: "client-billing", icon: FileText },
            { label: "리포트", view: "clients", section: "client-reports", icon: FileText }
          ]
        }
      ]
    },
    matters: {
      ...sidebarMeta.matters,
      items: [
        {
          label: "업무 관리",
          icon: FileText,
          children: [
            { label: "업무 보드", view: "matters", section: "matter-board", icon: LayoutDashboard },
            { label: "워크트리", view: "matters", section: "matter-worktree", icon: Share2 },
            { label: "할 일", view: "matters", section: "matter-tasks", icon: ClipboardList },
            { label: "일정", view: "matters", section: "matter-calendar", icon: CalendarDays }
          ]
        },
        {
          label: "사건 운영",
          icon: LayoutDashboard,
          children: [
            { label: "대시보드", view: "matters", section: "matter-home", icon: LayoutDashboard, active: true },
            { label: "사건 목록", view: "matters", section: "matters-list", icon: ClipboardList },
            { label: "신규 사건", view: "matters", section: "matter-opening", icon: Plus },
            { label: "종결 처리", view: "matters", section: "matter-closeout", icon: ShieldCheck },
            { label: "보관 사건", view: "matters", section: "matter-archive", icon: FileText }
          ]
        },
        {
          label: "소통",
          icon: Mail,
          children: [
            { label: "회의 기록", view: "matters", section: "matter-meetings", icon: ClipboardList },
            { label: "의뢰인 요청", view: "matters", section: "matter-client-requests", icon: FileText }
          ]
        },
        {
          label: "리포트",
          icon: Settings,
          children: [
            { label: "사건 리포트", view: "matters", section: "matter-analytics", icon: ClipboardList },
            { label: "연동", view: "matters", section: "matter-integrations", icon: Bell }
          ]
        }
      ]
    },
    people: { ...sidebarMeta.people, items: peopleSidebarGroups({ canManageLeavePolicy, canApproveLeave, canExecuteLeaveAccrual, canAdjustLeaveLedger, canExportLeaveReport, canSettleLeaveTermination, canManageLeavePromotion }) },
    vault: {
      ...sidebarMeta.vault,
      items: vaultNavigationItems(labels, vaultCapabilities)
    },
    portal: {
      ...sidebarMeta.portal,
      items: [
        { label: "공유 홈", view: "portal", section: "portal-home", icon: LayoutDashboard, active: true },
        { label: "요청 응답", view: "portal", section: "portal-rfi", icon: FileText },
        { label: "공유 링크", view: "portal", section: "portal-links", icon: Share2 },
        { label: "감사 상태", view: "portal", section: "portal-audit", icon: ShieldCheck }
      ]
    },
    ...modeExceptionNavigation
  };
}

export function Sidebar({
  labels,
  view,
  axis = view,
  setView,
  activeSection = "",
  homeApprovalCount = 0,
  homeMessageCount = 0,
  canViewCompanyStatus = false,
  modeReturnTarget = { view: "home", section: "home-dashboard" },
  onProfile = () => {},
  onReturnToWork = () => {},
  navigation: navigationProp
}) {
  const [openGroups, setOpenGroups] = useState({});
  const activeRouteByScope = useRef({});
  const [utilityPanel, setUtilityPanel] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  useEffect(() => {
    setUtilityPanel(null);
  }, [view]);
  const sessionIdentity = sidebarSessionProfile(profileUser);
  const forestUserName = sessionIdentity.name;
  const forestUserLabel = forestUserName || shellLabel(labels, "sessionUserFallback", "사용자");
  const forestUserRole = sessionIdentity.role;
  const forestUserPhoto = memberPhotoFor(profileUser);
  const forestUserInitial = forestUserLabel.trim().slice(0, 1);
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([readDesktopMatterSessionStatus(), fetchUserProfile({ ctx: "allow" })]).then((results) => {
      if (cancelled) return;
      const desktopStatus = results[0]?.status === "fulfilled" ? results[0].value : null;
      const profileResult = results[1]?.status === "fulfilled" ? results[1].value : null;
      const profileItem = profileResult?.kind === "data" && profileResult.item ? profileResult.item : null;
      if (desktopStatus || profileItem) {
        setProfileUser({ ...(desktopStatus ?? {}), ...(profileItem ?? {}) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const modeExceptionActive = modeExceptionUtilityViewIds.includes(view);
  const navigation = navigationProp ?? buildContextualNavigation({
    labels,
    financeAccessRecords: [profileUser, readLawosApiSession(), readLawosSessionEnvelope()],
    homeApprovalCount,
    homeMessageCount,
    canViewCompanyStatus,
    canManageLeavePolicy: sessionIdentity.canManageLeavePolicy,
    canApproveLeave: sessionIdentity.canApproveLeave,
    canExecuteLeaveAccrual: sessionIdentity.canExecuteLeaveAccrual,
    canAdjustLeaveLedger: sessionIdentity.canAdjustLeaveLedger,
    canExportLeaveReport: sessionIdentity.canExportLeaveReport,
    canSettleLeaveTermination: sessionIdentity.canSettleLeaveTermination,
    canManageLeavePromotion: sessionIdentity.canManageLeavePromotion
  });
  const meta = navigation[view] ?? { title: "AMIC OS", utilities: [], items: [] };
  const subnav = meta.items;
  const flatSubnav = subnav.flatMap((item) => item.children ?? [item]);
  const hasPreferredActiveItem = flatSubnav.some((item) => item.active);

  function isItemActive(item, index = 0) {
    if (item.section) {
      return activeSection === item.section || (!activeSection && item.active === true);
    }
    if (item.active) return !activeSection;
    return index === 0 && !hasPreferredActiveItem && !activeSection;
  }

  function isGroupActive(item) {
    return item.children?.some((child) => isItemActive(child)) ?? false;
  }

  function sidebarGroupScopeKey() {
    return `${axis}:${view}`;
  }

  function sidebarGroupItemKey(item) {
    const stableId = item.groupId ?? item.children?.[0]?.section ?? item.label;
    return `${sidebarGroupScopeKey()}:${stableId}`;
  }

  function defaultOpenGroupKey() {
    const activeGroup = subnav.find((item) => item.children && isGroupActive(item));
    return activeGroup ? sidebarGroupItemKey(activeGroup) : "";
  }

  function groupOpen(item) {
    if (!item.children) return false;
    const scopeKey = sidebarGroupScopeKey();
    const openKey = Object.prototype.hasOwnProperty.call(openGroups, scopeKey)
      ? openGroups[scopeKey]
      : defaultOpenGroupKey();
    return openKey === sidebarGroupItemKey(item);
  }

  function toggleGroup(item) {
    if (!item.children) return;
    const scopeKey = sidebarGroupScopeKey();
    const itemKey = sidebarGroupItemKey(item);
    setOpenGroups((current) => {
      const currentOpenKey = Object.prototype.hasOwnProperty.call(current, scopeKey)
        ? current[scopeKey]
        : defaultOpenGroupKey();
      return { ...current, [scopeKey]: currentOpenKey === itemKey ? "" : itemKey };
    });
  }

  const scopeKey = sidebarGroupScopeKey();
  const activeGroup = subnav.find((item) => item.children && isGroupActive(item));
  const activeGroupKey = activeGroup ? sidebarGroupItemKey(activeGroup) : "";
  const activeRouteKey = `${scopeKey}:${activeSection}`;

  useEffect(() => {
    const previousRouteKey = activeRouteByScope.current[scopeKey];
    activeRouteByScope.current[scopeKey] = activeRouteKey;
    if (previousRouteKey === undefined || previousRouteKey === activeRouteKey || !activeGroupKey) return;
    setOpenGroups((current) => current[scopeKey] === "" || current[scopeKey] === activeGroupKey
      ? current
      : { ...current, [scopeKey]: activeGroupKey });
  }, [scopeKey, activeRouteKey, activeGroupKey]);

  return (
    <aside
      id="context-sidebar"
      className="sidebar"
      data-context-sidebar={axis}
      data-mode-exception-sidebar={modeExceptionActive ? "true" : undefined}
      data-mode-exception-depth={modeExceptionActive ? "deep" : undefined}
      aria-label={`${meta.title} 메뉴`}
    >
      <div className="sidebar-brand" data-sidebar-brand="amic-law">
        <img className="forest-sidebar-logo" src={amicLawLogo} alt="AMIC Law" />
      </div>
      {modeExceptionActive && (
        <button
          type="button"
          className="sidebar-return-anchor"
          data-mode-return-anchor="true"
          data-mode-return-view={modeReturnTarget.view}
          data-mode-return-section={modeReturnTarget.section || ""}
          aria-label={shellLabel(labels, "returnToWork", "업무로 돌아가기")}
          onClick={onReturnToWork}
        >
          <ArrowLeft size={15} />
          <span>{shellLabel(labels, "returnToWork", "업무로 돌아가기")}</span>
        </button>
      )}
      <button
        type="button"
        className="workspace-card"
        data-workspace-menu-trigger="true"
        aria-label={`${meta.title} 워크스페이스 메뉴`}
        aria-expanded={utilityPanel?.kind === "workspace" ? "true" : "false"}
        onClick={() => setUtilityPanel((current) => current?.kind === "workspace" ? null : { kind: "workspace", label: shellLabel(labels, "workspaceSwitchLabel", "워크스페이스") })}
      >
        <div>
          {labels.workspace && <span className="eyebrow">{labels.workspace}</span>}
          <strong className="workspace-card-label">{meta.title}</strong>
        </div>
        <ChevronDown size={15} />
      </button>
      {subnav.length > 0 && (
        <nav className="sidebar-nav">
          {subnav.map((item, index) => {
            const Icon = item.icon ?? ClipboardList;
            if (item.children) {
              const open = groupOpen(item);
              const active = isGroupActive(item);
              const defaultItem = item.children[0];
              const stableGroupId = item.groupId ?? defaultItem?.section ?? `group-${index}`;
              const panelId = `sidebar-group-${axis}-${view}-${stableGroupId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
              return (
                <div key={stableGroupId} className={active ? "sidebar-group active" : "sidebar-group"} data-sidebar-group={stableGroupId}>
                  <button
                    type="button"
                    className={active ? "sidebar-item sidebar-group-toggle active" : "sidebar-item sidebar-group-toggle"}
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={`${item.label} 하위 메뉴 ${open ? "접기" : "펼치기"}`}
                    data-sidebar-default-section={defaultItem?.section}
                    onClick={() => toggleGroup(item)}
                  >
                    <span className="sidebar-icon"><Icon size={16} /></span>
                    <span className="sidebar-label">{item.label}</span>
                    {item.homeCountKind === "approval" && <span className="sr-only" data-home-sidebar-approval-count={item.homeCount}>{item.homeCount}</span>}
                    {item.count && <span className="sidebar-count">{item.count}</span>}
                    <ChevronDown size={15} className={open ? "sidebar-chevron open" : "sidebar-chevron"} />
                  </button>
                  {open && (
                    <div id={panelId} className="sidebar-subnav" role="group" aria-label={`${item.label} 하위 메뉴`}>
                      {item.children.map((child, childIndex) => {
                        const ChildIcon = child.icon ?? ClipboardList;
                        const childActive = isItemActive(child, childIndex);
                        return (
                          <button
                            key={child.section ?? child.label}
                            type="button"
                            className={childActive ? "sidebar-item sidebar-child active" : "sidebar-item sidebar-child"}
                            aria-current={childActive ? "location" : undefined}
                            data-sidebar-section={child.section}
                            onClick={() => setView(child.view, child.section ?? "")}
                          >
                            <span className="sidebar-icon"><ChildIcon size={15} /></span>
                            <span className="sidebar-label">{child.label}</span>
                            {child.count && <span className="sidebar-count">{child.count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const active = isItemActive(item, index);
            return (
            <button
              key={item.label}
              type="button"
              className={active ? "sidebar-item active" : "sidebar-item"}
              aria-current={active ? "location" : undefined}
              onClick={() => setView(item.view, item.section ?? "")}
            >
              <span className="sidebar-icon"><Icon size={16} /></span>
              <span className="sidebar-label">{item.label}</span>
              {item.section === "home-company" && <span className="sr-only" data-home-sidebar-company-link="true">{shellLabel(labels, "homeCompanyLabel", "회사 현황")}</span>}
              {item.homeCountKind === "approval" && <span className="sr-only" data-home-sidebar-approval-count={item.homeCount}>{item.homeCount}</span>}
              {item.homeCountKind === "message" && <span className="sr-only" data-home-sidebar-message-count={item.homeCount}>{item.homeCount}</span>}
              {item.count && <span className="sidebar-count">{item.count}</span>}
            </button>
            );
          })}
        </nav>
      )}
      {utilityPanel && (
        <div className="sidebar-utility-panel" role="region" aria-label={utilityPanel.label} data-sidebar-utility-panel="true">
          <strong>{utilityPanel.label}</strong>
          {utilityPanel.kind === "workspace" && meta.utilities.length > 0 ? (
            <div className="sidebar-workspace-actions">
              {meta.utilities.map(({ label, icon: Icon, view: utilityView, section }) => (
                <button
                  key={label}
                  type="button"
                  className="sidebar-workspace-action"
                  data-sidebar-utility={label}
                  onClick={() => setView(utilityView, section ?? "")}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <span>{utilityPanel.kind === "workspace" ? shellLabel(labels, "workspacePanelText", "워크스페이스 전환 메뉴를 이 화면에서 확인합니다.") : `${utilityPanel.scope} ${shellLabel(labels, "homeSettingsLabel", "설정")}은 현재 세션에서만 열립니다.`}</span>
          )}
        </div>
      )}
      <button
        type="button"
        className="forest-sidebar-user"
        aria-label={shellLabel(labels, "profileAria", "내 프로필")}
        data-profile-trigger="true"
        onClick={onProfile}
      >
        <span className="forest-sidebar-avatar">
          {forestUserPhoto ? <img src={forestUserPhoto} alt="" /> : forestUserInitial}
        </span>
        <span className="forest-sidebar-user-copy">
          <strong>{forestUserLabel}</strong>
          {forestUserRole && <small>{forestUserRole}</small>}
        </span>
      </button>
    </aside>
  );
}

export function GlobalSearch({ labels, query, setQuery, setView, history = { status: "idle", viewed: [], modified: [] }, onClose = () => {} }) {
  const results = navItems.filter(({ id }) => id !== "vault").map(({ id, label, icon }) => ({
    icon,
    title: `${label} ${shellLabel(labels, "searchOpenSuffix", "열기")}`,
    view: id
  })).concat(
    globalUtilityItems.map(({ id, label, localLabel, icon, defaultSection }) => ({
      icon,
      title: `${label} ${shellLabel(labels, "searchOpenSuffix", "열기")}`,
      view: id,
      section: defaultSection
    }))
  );

  const trimmedQuery = query.trim();
  const openMatter = (item) => {
    setView("matters", "matters-list", { matterId: item.matter_id });
    setQuery("");
    onClose();
  };

  return (
    <div className="search-popover" id="global-search-popover" role="dialog" aria-label={trimmedQuery ? labels.search : shellLabel(labels, "searchRecentRecords", "최근 기록")}>
      {trimmedQuery ? (
        <>
          <header>
            <Search size={16} />
            <strong>{labels.search}</strong>
            <button className="icon-button" aria-label={shellLabel(labels, "searchClear", "검색 지우기")} onClick={() => setQuery("")}>
              <X size={15} />
            </button>
          </header>
          <button
            type="button"
            className="search-result search-result-primary"
            onClick={() => {
              setView("vault", "vault-search-all", { query: trimmedQuery });
              onClose();
            }}
          >
            <Search size={15} />
            {`${shellLabel(labels, "searchInWorkspace", "Vault에서 문서 검색")} “${trimmedQuery}”`}
          </button>
          {results.map(({ icon: Icon, title, view, section }) => (
            <button
              key={title}
              className="search-result"
              onClick={() => {
                setView(view, section ?? "");
                setQuery("");
                onClose();
              }}
            >
              <Icon size={15} />
              {title}
            </button>
          ))}
        </>
      ) : (
        <>
          {[
            { id: "viewed", title: shellLabel(labels, "searchRecentlyViewed", "최근 열람"), status: history.viewedStatus ?? history.status, rows: history.viewed, relative: true, fields: ["viewed_at", "updated_at", "created_at"] },
            { id: "modified", title: shellLabel(labels, "searchRecentlyModified", "최근 수정"), status: history.modifiedStatus ?? history.status, rows: history.modified, relative: false, fields: ["updated_at", "created_at"] }
          ].map((section) => (
            <section className="search-history-section" key={section.id} data-search-history-section={section.id}>
              <h2>{section.title}</h2>
              {section.rows.map((item, index) => {
                const timestamp = section.fields.map((field) => item?.[field]).find(Boolean);
                return (
                  <button type="button" className="search-history-row" data-compact-record="true" key={`${section.id}:${item.matter_id}`} onClick={() => openMatter(item)}>
                    <FileText size={15} />
                    <strong>{searchMatterTitle(item, index)}</strong>
                    <time dateTime={timestamp}>{searchHistoryTime(timestamp, section.relative)}</time>
                  </button>
                );
              })}
              {section.status === "loading" && section.rows.length === 0 && <span className="search-history-state">{shellLabel(labels, "searchHistoryLoading", "최근 기록을 불러오는 중입니다.")}</span>}
              {section.status === "error" && section.rows.length === 0 && <span className="search-history-state">{shellLabel(labels, "searchHistoryError", "최근 기록을 불러오지 못했습니다.")}</span>}
              {section.status === "ready" && section.rows.length === 0 && <span className="search-history-state">{shellLabel(labels, "searchHistoryEmpty", "표시할 기록이 없습니다.")}</span>}
            </section>
          ))}
          <button type="button" className="search-history-footer" onClick={() => { setView("matters", "matters-list"); onClose(); }}>
            {shellLabel(labels, "searchViewMatters", "Matter 목록 보기")} <ArrowRight size={14} />
          </button>
        </>
      )}
    </div>
  );
}
