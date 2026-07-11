import React from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
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
  isLegacyGlobalRoute,
  modeExceptionUtilityViewIds
} from "../data/globalUtilities.js";
import { fetchUserProfile, readDesktopMatterSessionStatus, readLawosApiSession, readLawosSessionEnvelope } from "../data/apiClient.js";
import { useSkin } from "../context/SkinContext.jsx";
import { MatterSplash } from "./MatterSplash.jsx";
import { MatterLogo } from "./MatterLogo.jsx";
import { peopleNavigationGroups } from "../people/peopleFeatureCatalog.js";
import { memberPhotoFor } from "../people/memberPhotos.js";
import { localHrxRosterDisplayNameForSession, localHrxRosterTitleForSession } from "../people/hrxLocalRoster.ts";
import { canAccessHomeFinanceSection } from "../data/financeAccess.js";

const peopleIconMap = {
  bell: Bell,
  clipboard: ClipboardList,
  file: FileText,
  mail: Mail,
  settings: Settings,
  shield: ShieldCheck,
  users: UserPlus
};

const peopleGlobalGroupLabels = new Set(["요청/전자결재", "리포트", "메시지", "전자계약", "회사 설정"]);
const genericSessionDisplayNames = new Set(["사용자", "세션 사용자"]);

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
  const name = shellSessionDisplayName(records) || localHrxRosterDisplayNameForSession(records);
  const userRef = shellSessionFirst(records, ["user_id", "actor_ref", "email"]);
  const role = shellSessionFirst(records, ["title", "source_title", "primary_role_label", "role_label", "position", "job_title"]) || localHrxRosterTitleForSession(records);
  return {
    name: name || userRef,
    role,
    userRef
  };
}

function peopleSidebarGroups() {
  return peopleNavigationGroups.map((group) => {
    if (peopleGlobalGroupLabels.has(group.label)) return null;
    const GroupIcon = peopleIconMap[group.icon] ?? ClipboardList;
    const children = group.children.filter((child) => !isLegacyGlobalRoute("people", child.section));
    if (children.length === 0) return null;
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
          count: child.badge,
          active: child.active
        };
      })
    };
  }).filter(Boolean);
}

export function LoadingSurface({ labels, locale, theme, skin, setLocale, setTheme, className = "", message = labels.loading }) {
  useEffect(() => {
    document.documentElement.dataset.locale = locale;
    document.documentElement.dataset.theme = theme;
    if (skin) document.documentElement.dataset.skin = skin;
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
  }, [locale, theme, skin]);

  return (
    <main className={["loading-stage", className].filter(Boolean).join(" ")} data-matter-logo-flow={className.includes("post-login-splash") ? "post-login" : "startup"}>
      <MatterSplash />
      <strong>{message}</strong>
      <p>최근 작업공간을 준비하고 있습니다.</p>
      <div className="loading-actions">
        <button className="secondary-button" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>{labels.language}</button>
        <button className="secondary-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{labels.theme}</button>
      </div>
    </main>
  );
}

function ProductAxisNav({ axis = "home", setView, labels = {} }) {
  return (
    <nav className="top-axis-nav" aria-label="Home Client Matter People Vault Portal" data-product-axis-nav="top-header">
      {navItems.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={axis === id ? "top-axis-item active" : "top-axis-item"}
          aria-current={axis === id ? "page" : undefined}
          data-product-axis={id}
          onClick={() => setView(id)}
        >
          <span>{shellLabel(labels, `${id}AxisLabel`, label)}</span>
        </button>
      ))}
    </nav>
  );
}

export function buildNotificationItems({ homeActionCounts = {}, labels = {} } = {}) {
  const lateCount = Number(homeActionCounts.task_late ?? 0) || 0;
  const todayCount = Number(homeActionCounts.task_today ?? 0) || 0;
  return [
    lateCount > 0 && {
      id: `home-task-late:${lateCount}`,
      initials: shellLabel(labels, "homeNotificationInitialLate", "지"),
      type: shellLabel(labels, "homeNotificationType", "To Do"),
      title: shellLabel(labels, "homeNotificationLateTitle", "지연 업무"),
      client: shellLabel(labels, "homeNotificationActionInboxClient", "Home 액션 인박스"),
      status: shellLabel(labels, "homeNotificationLateStatus", "확인 필요"),
      summary: shellLabel(labels, "homeNotificationLateSummary", "오늘 처리 목록에서 지연 업무를 먼저 확인합니다."),
      time: shellLabel(labels, "realtimeLabel", "실시간")
    },
    todayCount > 0 && {
      id: `home-task-today:${todayCount}`,
      initials: shellLabel(labels, "homeNotificationInitialToday", "오"),
      type: shellLabel(labels, "homeNotificationType", "To Do"),
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
      subtitle: shellLabel(labels, "utilityNotificationsSubtitle", "작업 알림과 검토 신호"),
      section: "home-dashboard",
      empty: shellLabel(labels, "utilityNotificationsEmpty", "새 알림이 없습니다.")
    },
    messages: {
      title: shellLabel(labels, "utilityMessagesTitle", "메시지"),
      subtitle: shellLabel(labels, "utilityMessagesSubtitle", "Matter 대화와 공지 메시지"),
      section: "home-messages",
      empty: shellLabel(labels, "utilityMessagesEmpty", "읽지 않은 메시지가 없습니다.")
    },
    approvals: {
      title: shellLabel(labels, "utilityApprovalsTitle", "승인 대기"),
      subtitle: shellLabel(labels, "utilityApprovalsSubtitle", "내 결재 차례인 요청"),
      section: "home-requests",
      empty: shellLabel(labels, "utilityApprovalsEmpty", "처리할 승인이 없습니다.")
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

export function Topbar({
  labels,
  query,
  setQuery,
  axis = "home",
  setView,
  onCreate,
  onRefresh = () => {},
  utilityDrawerType = "",
  onOpenUtilityDrawer,
  notificationUnreadCount: topbarNotificationCount = 0,
  homeApprovalCount = 0,
  homeMessageCount = 0
}) {
  const skin = useSkin();
  const isForest = skin === "forest";
  const notificationsOpen = utilityDrawerType === "notifications";
  const messagesOpen = utilityDrawerType === "messages";
  const approvalsOpen = utilityDrawerType === "approvals";
  const notificationCount = Number(topbarNotificationCount) || 0;
  const messageCount = Number(homeMessageCount) || 0;
  const approvalCount = Number(homeApprovalCount) || 0;

  return (
    <header className="topbar">
      <div className="topbar-brand" data-logo-dock-target="top-left">
        {!isForest && <MatterLogo />}
      </div>
      <ProductAxisNav axis={axis} setView={setView} labels={labels} />
      <label className="global-search">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
        <kbd>/</kbd>
      </label>
      <button className="primary-button" onClick={onCreate}>
        <Plus size={15} />
        {labels.create}
      </button>
      <div className="top-actions">
        <button
          className={notificationsOpen ? "icon-button notification-trigger active" : "icon-button notification-trigger"}
          aria-label={`${shellLabel(labels, "topbarNotificationsAria", "알림")} ${notificationCount}${shellLabel(labels, "countSuffix", "건")}`}
          aria-expanded={notificationsOpen ? "true" : "false"}
          aria-controls="notifications-utility-drawer"
          data-notification-trigger="true"
          data-notification-info-count={notificationCount}
          onClick={() => onOpenUtilityDrawer("notifications")}
        >
          <Bell size={17} />
          {notificationCount > 0 && <span className="notification-dot" data-notification-dot="true" />}
        </button>
        <button
          className={messagesOpen ? "icon-button home-action-trigger active" : "icon-button home-action-trigger"}
          aria-label={`${shellLabel(labels, "topbarMessagesAria", "메시지")} ${messageCount}${shellLabel(labels, "countSuffix", "건")}`}
          aria-expanded={messagesOpen ? "true" : "false"}
          aria-controls="messages-utility-drawer"
          data-home-message-trigger="true"
          data-home-topbar-message-count={messageCount}
          onClick={() => onOpenUtilityDrawer("messages")}
        >
          <MessageCircle size={17} />
          {messageCount > 0 && <span className="notification-badge home-action-badge">{messageCount}</span>}
        </button>
        <button
          className={approvalsOpen ? "icon-button home-action-trigger active" : "icon-button home-action-trigger"}
          aria-label={`${shellLabel(labels, "topbarApprovalsAria", "승인 대기")} ${approvalCount}${shellLabel(labels, "countSuffix", "건")}`}
          aria-expanded={approvalsOpen ? "true" : "false"}
          aria-controls="approvals-utility-drawer"
          data-home-approval-trigger="true"
          data-home-topbar-approval-count={approvalCount}
          onClick={() => onOpenUtilityDrawer("approvals")}
        >
          <ShieldCheck size={17} />
          {approvalCount > 0 && <span className="notification-badge home-action-badge">{approvalCount}</span>}
        </button>
        <button
          type="button"
          className="icon-button topbar-refresh-trigger"
          aria-label={shellLabel(labels, "refreshAria", "새로고침")}
          data-topbar-refresh-trigger="true"
          onClick={onRefresh}
        >
          <RefreshCw size={17} />
        </button>
      </div>
    </header>
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
            <p>{config.subtitle}</p>
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
          {visibleItems.length === 0 && <p className="utility-empty-state">{config.empty}</p>}
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
      {
        label: shellLabel(labels, "homeFinanceLabel", "매출/비용"),
        icon: FileText,
        groupId: "home-finance",
        children: [
          { label: shellLabel(labels, "homeFinanceOverviewLabel", "전체 현황"), view: "home", section: "home-finance-overview", icon: LayoutDashboard },
          { label: shellLabel(labels, "homeFinanceMonthlyLabel", "월별 매출/비용"), view: "home", section: "home-finance-monthly", icon: CalendarDays },
          { label: shellLabel(labels, "homeFinanceClientsLabel", "고객별 매출/비용"), view: "home", section: "home-finance-clients", icon: ClipboardList },
          { label: shellLabel(labels, "homeFinanceTimeLabel", "시간 기록"), view: "home", section: "home-finance-time", icon: ClipboardList },
          { label: shellLabel(labels, "homeFinanceExpensesLabel", "비용 처리"), view: "home", section: "home-finance-expenses", icon: FileText },
          { label: shellLabel(labels, "homeFinanceBillingLabel", "청구/수납"), view: "home", section: "home-finance-billing", icon: FileText },
          { label: shellLabel(labels, "homeFinanceArLabel", "미수금"), view: "home", section: "home-finance-ar", icon: ShieldCheck }
        ].filter((item) => canAccessHomeFinanceSection(financeAccessRecords, item.section))
      },
      { label: shellLabel(labels, "homeApprovalPendingLabel", "승인 대기"), view: "home", section: "home-requests", icon: ShieldCheck },
      { label: shellLabel(labels, "homeTodoSidebarLabel", "To Do"), view: "home", section: "home-todo", icon: ClipboardList },
      { label: shellLabel(labels, "homeFeedSidebarLabel", "피드"), view: "home", section: "home-feed", icon: Bell },
      { label: shellLabel(labels, "homeCalendarSidebarLabel", "캘린더"), view: "home", section: "home-calendar", icon: CalendarDays },
      { label: shellLabel(labels, "homeMessagesLabel", "메시지"), view: "home", section: "home-messages", icon: Mail },
      { label: shellLabel(labels, "homeEsignLabel", "전자 계약"), view: "home", section: "home-esign", icon: FileText },
      { label: shellLabel(labels, "homeCompanyLabel", "회사 현황"), view: "home", section: "home-company", icon: ClipboardList }
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
    title: "구성원",
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

export function buildContextualNavigation({
  labels = {},
  financeAccessRecords = [],
  homeApprovalCount = 0,
  homeMessageCount = 0,
  canViewCompanyStatus = false
} = {}) {
  const localizedHomeMeta = homeSidebarMeta(labels, financeAccessRecords);
  const homeItems = localizedHomeMeta.actions
    .filter((item) => item.groupId !== "home-finance" || item.children.length > 0)
    .filter((item) => canViewCompanyStatus || item.section !== "home-company")
    .map((item) => {
      if (item.section === "home-messages") {
        return {
          ...item,
          count: Number(homeMessageCount) > 0 ? Number(homeMessageCount) : null,
          homeCount: Number(homeMessageCount) || 0,
          homeCountKind: "message"
        };
      }
      if (item.section === "home-requests") {
        return {
          ...item,
          count: Number(homeApprovalCount) > 0 ? Number(homeApprovalCount) : null,
          homeCount: Number(homeApprovalCount) || 0,
          homeCountKind: "approval"
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
      title: "matter",
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
            { label: "고객 목록", view: "clients", section: "clients-list", icon: ClipboardList }
          ]
        },
        {
          label: "수임 전 업무",
          icon: FileText,
          children: [
            { label: "Opportunity", view: "clients", section: "client-opportunities", icon: ClipboardList },
            { label: "상담 기록", view: "clients", section: "client-intake", icon: FileText },
            { label: "접촉 이력", view: "clients", section: "client-activities", icon: ClipboardList },
            { label: "수임 제안", view: "clients", section: "client-contracts", icon: FileText }
          ]
        },
        {
          label: "운영",
          icon: Settings,
          children: [
            { label: "청구", view: "clients", section: "client-billing", icon: FileText },
            { label: "리포트", view: "clients", section: "client-reports", icon: FileText },
            { label: "데이터", view: "clients", section: "client-data", icon: Settings },
            { label: "데이터 가져오기", view: "clients", section: "client-import", icon: Plus },
            { label: "설정", view: "clients", section: "client-settings", icon: Settings }
          ]
        }
      ]
    },
    matters: {
      ...sidebarMeta.matters,
      items: [
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
          label: "업무 진행",
          icon: FileText,
          children: [
            { label: "업무 보드", view: "matters", section: "matter-board", icon: ClipboardList },
            { label: "할 일", view: "matters", section: "matter-tasks", icon: ClipboardList },
            { label: "일정", view: "matters", section: "matter-calendar", icon: ClipboardList },
            { label: "외부 일정", view: "matters", section: "matter-external-schedule", icon: ClipboardList },
            { label: "검토 의견", view: "matters", section: "matter-notes", icon: FileText }
          ]
        },
        {
          label: "소통",
          icon: Mail,
          children: [
            { label: "메시지", view: "matters", section: "matter-channel", icon: Mail },
            { label: "회의 기록", view: "matters", section: "matter-meetings", icon: ClipboardList },
            { label: "공지", view: "matters", section: "matter-announcements", icon: Bell },
            { label: "팀", view: "matters", section: "matter-team", icon: UserPlus },
            { label: "의뢰인 요청", view: "matters", section: "matter-client-requests", icon: FileText }
          ]
        },
        {
          label: "리포트",
          icon: Settings,
          children: [
            { label: "사건 리포트", view: "matters", section: "matter-analytics", icon: ClipboardList },
            { label: "검색", view: "matters", section: "matter-search", icon: Search },
            { label: "사건 위험", view: "matters", section: "matter-risk", icon: ShieldCheck },
            { label: "감사 이력", view: "matters", section: "matter-audit", icon: FileText },
            { label: "연동", view: "matters", section: "matter-integrations", icon: Bell },
            { label: "사건 설정", view: "matters", section: "matter-settings", icon: Settings }
          ]
        }
      ]
    },
    people: { ...sidebarMeta.people, items: peopleSidebarGroups() },
    vault: {
      ...sidebarMeta.vault,
      items: [
        { label: "문서함", view: "vault", section: "vault-documents", icon: FileText },
        { label: "문서 상세", view: "vault", section: "vault-detail", icon: ClipboardList },
        { label: "메일 보관함", view: "vault", section: "vault-email", icon: FileText }
      ]
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
  const skin = useSkin();
  const [openGroups, setOpenGroups] = useState({});
  const activeRouteByScope = useRef({});
  const [utilityPanel, setUtilityPanel] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  useEffect(() => {
    setUtilityPanel(null);
  }, [view]);
  const isForest = skin === "forest";
  const sessionIdentity = sidebarSessionProfile(profileUser);
  const forestUserName = sessionIdentity.name;
  const forestUserRole = sessionIdentity.role;
  const forestUserPhoto = forestUserName ? memberPhotoFor(forestUserName) : undefined;
  const forestUserInitial = (forestUserName || shellLabel(labels, "sessionUserFallback", "사용자")).trim().slice(0, 1);
  useEffect(() => {
    if (!isForest) return undefined;
    let cancelled = false;
    Promise.allSettled([readDesktopMatterSessionStatus(), fetchUserProfile({ ctx: "allow" })]).then((results) => {
      if (cancelled) return;
      const desktopStatus = results[0]?.status === "fulfilled" ? results[0].value : null;
      const profileResult = results[1]?.status === "fulfilled" ? results[1].value : null;
      if (desktopStatus) {
        setProfileUser(desktopStatus);
      } else if (profileResult?.kind === "data" && profileResult.item) {
        setProfileUser(profileResult.item);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isForest]);
  const modeExceptionActive = modeExceptionUtilityViewIds.includes(view);
  const navigation = navigationProp ?? buildContextualNavigation({
    labels,
    financeAccessRecords: [profileUser, readLawosApiSession(), readLawosSessionEnvelope()],
    homeApprovalCount,
    homeMessageCount,
    canViewCompanyStatus
  });
  const meta = navigation[view] ?? { title: "matter", utilities: [], items: [] };
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
      className="sidebar"
      data-context-sidebar={axis}
      data-mode-exception-sidebar={modeExceptionActive ? "true" : undefined}
      data-mode-exception-depth={modeExceptionActive ? "deep" : undefined}
      aria-label={`${meta.title} 메뉴`}
    >
      {isForest && (
        <div className="sidebar-brand" data-sidebar-brand="amic-law">
          <img className="forest-sidebar-logo" src={amicLawLogo} alt="AMIC Law" />
        </div>
      )}
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
          <strong>{meta.title}</strong>
        </div>
        <ChevronDown size={15} />
      </button>
      {subnav.length > 0 && (
        <nav className="sidebar-nav">
          {subnav.map((item, index) => {
            const Icon = item.icon ?? ClipboardList;
            if (item.children) {
              const open = groupOpen(item);
              const defaultItem = item.children[0];
              const stableGroupId = item.groupId ?? defaultItem?.section ?? `group-${index}`;
              const panelId = `sidebar-group-${axis}-${view}-${stableGroupId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
              return (
                <div key={stableGroupId} className={open ? "sidebar-group active" : "sidebar-group"} data-sidebar-group={stableGroupId}>
                  <button
                    type="button"
                    className={open ? "sidebar-item sidebar-group-toggle active" : "sidebar-item sidebar-group-toggle"}
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={`${item.label} 하위 메뉴 ${open ? "접기" : "펼치기"}`}
                    data-sidebar-default-section={defaultItem?.section}
                    onClick={() => toggleGroup(item)}
                  >
                    <span className="sidebar-icon"><Icon size={16} /></span>
                    <span>{item.label}</span>
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
                            <span>{child.label}</span>
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
              <span>{item.label}</span>
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
      {isForest && (
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
            <strong>{forestUserName || shellLabel(labels, "sessionUserFallback", "사용자")}</strong>
            {forestUserRole && <small>{forestUserRole}</small>}
          </span>
        </button>
      )}
    </aside>
  );
}

export function GlobalSearch({ labels, query, setQuery, setView }) {
  const results = navItems.map(({ id, icon }) => ({
    icon,
    title: query.trim() ? `${labels[id]}에서 "${query.trim()}" 검색` : labels[id],
    view: id
  })).concat(
    globalUtilityItems.map(({ id, label, localLabel, icon, defaultSection }) => ({
      icon,
      title: query.trim() ? `${label}에서 "${query.trim()}" 검색` : `${label}, ${localLabel}`,
      view: id,
      section: defaultSection
    }))
  );

  return (
    <div className="search-popover">
      <header>
        <Search size={16} />
        <strong>{labels.search}</strong>
        <button className="icon-button" aria-label="검색 지우기" onClick={() => setQuery("")}>
          <X size={15} />
        </button>
      </header>
      {results.map(({ icon: Icon, title, view, section }) => (
        <button
          key={title}
          className="search-result"
          onClick={() => {
            setView(view, section ?? "");
            setQuery("");
          }}
        >
          <Icon size={15} />
          {title}
        </button>
      ))}
    </div>
  );
}
