import React from "react";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileText,
  Globe2,
  LayoutDashboard,
  Mail,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  UserPlus,
  UserRound,
  X
} from "lucide-react";
import { navItems } from "../data/nav.js";
import {
  getGlobalUtilityByView,
  globalUtilityCatalog,
  globalUtilityItems,
  isLegacyGlobalRoute
} from "../data/globalUtilities.js";
import { MatterSplash } from "./MatterSplash.jsx";
import { MatterLogo } from "./MatterLogo.jsx";
import { profileSidebarItems } from "./UserProfileSurface.jsx";
import { peopleNavigationGroups } from "../people/peopleFeatureCatalog.js";

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

export function LoadingSurface({ labels, locale, theme, setLocale, setTheme, className = "", message = labels.loading }) {
  useEffect(() => {
    document.documentElement.dataset.locale = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
  }, [locale, theme]);

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

function ProductAxisNav({ view, setView }) {
  return (
    <nav className="top-axis-nav" aria-label="Home Client Matter People Vault" data-product-axis-nav="top-header">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={view === id ? "top-axis-item active" : "top-axis-item"}
          aria-current={view === id ? "page" : undefined}
          data-product-axis={id}
          onClick={() => setView(id)}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

const notificationItems = [
  {
    id: "matter-lease-review",
    initials: "MK",
    type: "Matter",
    title: "Parnas Tower 임대차 검토",
    client: "MiraeKorea Holdings",
    status: "Vault 문서 수신",
    summary: "상대방 수정본 3건이 들어와 리뷰 대기열에 쌓였습니다.",
    time: "10:11 PM"
  },
  {
    id: "client-conflict-check",
    initials: "JL",
    type: "Client",
    title: "James Lee",
    client: "신규 자문 후보",
    status: "이해상충 확인",
    summary: "동명이인 후보 2건이 있어 담당자 확인이 필요합니다.",
    time: "10:07 PM"
  },
  {
    id: "people-approval",
    initials: "HR",
    type: "구성원",
    title: "액세스 권한 승인",
    client: "회사 설정",
    status: "승인 요청",
    summary: "구성원 정보 열람 범위가 제한된 상태로 승인 요청되었습니다.",
    time: "9:58 PM"
  }
];

export function Topbar({ labels, locale, setLocale, theme, setTheme, query, setQuery, view, setView, onCreate, onInvite, onProfile, notificationsOpen, onToggleNotifications }) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-brand" data-logo-dock-target="top-left">
        <MatterLogo />
      </div>
      <ProductAxisNav view={view} setView={setView} />
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
        <button className="ghost-button success" onClick={onInvite}>
          <UserPlus size={15} />
          {labels.invite}
        </button>
        <button
          type="button"
          className={view === "profile" ? "profile-trigger active" : "profile-trigger"}
          aria-label="내 프로필"
          aria-current={view === "profile" ? "page" : undefined}
          data-profile-trigger="true"
          onClick={onProfile}
        >
          <span>서</span>
        </button>
        <button
          className={notificationsOpen ? "icon-button notification-trigger active" : "icon-button notification-trigger"}
          aria-label="알림"
          aria-expanded={notificationsOpen ? "true" : "false"}
          aria-controls="notification-drawer"
          data-notification-trigger="true"
          onClick={onToggleNotifications}
        >
          <Bell size={17} />
          <span className="notification-badge">3</span>
        </button>
        <button
          className={helpOpen ? "icon-button active" : "icon-button"}
          aria-label="도움말"
          aria-expanded={helpOpen ? "true" : "false"}
          aria-controls="topbar-help-panel"
          data-topbar-help-trigger="true"
          onClick={() => setHelpOpen((open) => !open)}
        >
          <CircleHelp size={17} />
        </button>
        <button className="icon-button" aria-label={labels.theme} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <Moon size={17} />
        </button>
        <button className="top-link locale-toggle" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>
          <Globe2 size={15} />
          {labels.language}
        </button>
      </div>
      {helpOpen && (
        <div className="topbar-help-panel" id="topbar-help-panel" role="status" data-topbar-help-panel="true">
          <strong>도움말</strong>
          <span>현재 화면의 운영 상태와 권한 경계를 확인합니다.</span>
        </div>
      )}
    </header>
  );
}

export function NotificationDrawer({ open, onClose }) {
  const [allRead, setAllRead] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="notification-layer" data-notification-drawer="open">
      <button type="button" className="notification-scrim" aria-label="알림 닫기" onClick={onClose} />
      <aside className="notification-drawer" id="notification-drawer" role="dialog" aria-modal="true" aria-labelledby="notification-drawer-title">
        <header className="notification-drawer-header">
          <div>
            <h2 id="notification-drawer-title">알림 <span>3</span></h2>
            <p>작업 알림과 검토 신호</p>
          </div>
          <button type="button" className="icon-button" aria-label="알림 닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {(allRead || settingsOpen) && (
          <div className="notification-local-state" data-notification-local-state="true">
            {allRead && <span data-notification-read-state="true">모든 알림을 읽음으로 표시했습니다.</span>}
            {settingsOpen && <span data-notification-settings-state="true">알림 설정은 이 기기에서만 표시됩니다.</span>}
          </div>
        )}
        <div className="notification-stack">
          {notificationItems.map((item) => (
            <article className="notification-card" key={item.id} data-notification-card="stacked">
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
              </div>
            </article>
          ))}
        </div>
        <footer className="notification-drawer-footer">
          <button type="button" className="text-button" data-notification-mark-read="true" onClick={() => setAllRead(true)}>모두 읽음 처리</button>
          <button type="button" className="text-button" data-notification-settings="true" onClick={() => setSettingsOpen((value) => !value)}>알림 설정</button>
        </footer>
      </aside>
    </div>
  );
}

const sidebarMeta = {
  home: {
    title: "Home",
    actions: [
      { label: "최근 작업", view: "home", section: "home-recent", icon: ClipboardList, count: "8" },
      { label: "대시보드", view: "reports", section: "reports-home-dashboard", icon: LayoutDashboard },
      { label: "Matter 대화", view: "messages", section: "messages-matter-channel", icon: Mail, count: "2" },
      { label: "Client 데이터 가져오기", view: "data-import", section: "data-import-client", icon: Tags },
      { label: "검토함", view: "requests", section: "requests-review-inbox", icon: ShieldCheck, count: "3" }
    ],
    utilities: []
  },
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
    utilities: []
  },
  vault: {
    title: "Vault",
    utilities: []
  },
  profile: {
    title: "내 프로필",
    utilities: [
      { label: "초대 관리", icon: UserPlus },
      { label: "커뮤니티", icon: UserRound }
    ]
  }
};

export function Sidebar({ labels, view, setView, activeSection = "" }) {
  const [openGroups, setOpenGroups] = useState({});
  const [utilityPanel, setUtilityPanel] = useState(null);
  const activeGlobalUtility = getGlobalUtilityByView(view);
  const globalSubnav = Object.fromEntries(
    globalUtilityCatalog.map((utility) => [
      utility.id,
      utility.sections.map((section) => ({
        label: section.label,
        view: utility.id,
        section: section.id,
        icon: section.icon ?? utility.icon,
        count: section.badge,
        active: section.id === utility.defaultSection
      }))
    ])
  );
  const subnav = {
    auth: [
      { label: "로그인", view: "auth" },
      { label: "비밀번호 재설정", view: "auth" }
    ],
    home: sidebarMeta.home.actions,
    clients: [
      {
        label: "Client 관리",
        icon: ClipboardList,
        children: [
          { label: "Client 홈", view: "clients", section: "clients-home", icon: LayoutDashboard, active: true },
          { label: "Client 목록", view: "clients", section: "clients-list", icon: ClipboardList, count: "12" },
          { label: "법인·개인 Client", view: "clients", section: "client-accounts", icon: ShieldCheck },
          { label: "담당자", view: "clients", section: "client-contacts", icon: UserPlus }
        ]
      },
      {
        label: "수임 전 업무",
        icon: FileText,
        children: [
          { label: "Opportunity", view: "clients", section: "client-opportunities", icon: ClipboardList },
          { label: "상담·문의", view: "clients", section: "client-intake", icon: FileText, count: "4" },
          { label: "접촉 이력", view: "clients", section: "client-activities", icon: ClipboardList },
          { label: "제안·계약", view: "clients", section: "client-contracts", icon: FileText },
          { label: "Client 관계", view: "clients", section: "client-relationships", icon: UserPlus },
          { label: "이해상충 확인", view: "clients", section: "client-conflict", icon: ShieldCheck }
        ]
      },
      {
        label: "운영",
        icon: Settings,
        children: [
          { label: "청구·수금", view: "clients", section: "client-billing", icon: FileText },
          { label: "Client 리포트", view: "clients", section: "client-reports", icon: FileText },
          { label: "Client 데이터", view: "clients", section: "client-data", icon: Settings },
          { label: "Client 데이터 가져오기", view: "clients", section: "client-import", icon: Plus },
          { label: "Client 설정", view: "clients", section: "client-settings", icon: Settings }
        ]
      }
    ],
    matters: [
      {
        label: "사건 운영",
        icon: LayoutDashboard,
        children: [
          { label: "홈", view: "matters", section: "matter-home", icon: LayoutDashboard, active: true },
          { label: "사건 목록", view: "matters", section: "matters-list", icon: ClipboardList, count: "18" },
          { label: "신규 사건", view: "matters", section: "matter-opening", icon: Plus },
          { label: "수임 진행", view: "matters", section: "matter-intake", icon: ShieldCheck },
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
          { label: "메모·검토 의견", view: "matters", section: "matter-notes", icon: FileText }
        ]
      },
      {
        label: "문서·자료",
        icon: FileText,
        children: [
          { label: "사건 문서", view: "matters", section: "matter-vault", icon: FileText },
          { label: "증거·자료", view: "matters", section: "matter-evidence", icon: FileText },
          { label: "양식·템플릿", view: "matters", section: "matter-templates", icon: FileText },
          { label: "인장·날인", view: "matters", section: "matter-seal", icon: ShieldCheck }
        ]
      },
      {
        label: "소통·참여",
        icon: Mail,
        children: [
          { label: "이메일·메시지", view: "matters", section: "matter-channel", icon: Mail, count: "2" },
          { label: "회의·통화 기록", view: "matters", section: "matter-meetings", icon: ClipboardList },
          { label: "공지·공유", view: "matters", section: "matter-announcements", icon: Bell },
          { label: "담당자·참여자", view: "matters", section: "matter-team", icon: UserPlus },
          { label: "의뢰인 요청", view: "matters", section: "matter-client-requests", icon: FileText }
        ]
      },
      {
        label: "결재·청구",
        icon: ShieldCheck,
        children: [
          { label: "결재·승인", view: "matters", section: "matter-approvals", icon: ShieldCheck },
          { label: "시간 기록", view: "matters", section: "matter-time", icon: ClipboardList },
          { label: "비용 처리", view: "matters", section: "matter-expenses", icon: FileText },
          { label: "청구 내역", view: "matters", section: "matter-billing", icon: FileText },
          { label: "미수금", view: "matters", section: "matter-ar", icon: FileText }
        ]
      },
      {
        label: "리포트·관리",
        icon: Settings,
        children: [
          { label: "사건 리포트", view: "matters", section: "matter-analytics", icon: ClipboardList },
          { label: "검색·통계", view: "matters", section: "matter-search", icon: Search },
          { label: "사건 위험", view: "matters", section: "matter-risk", icon: ShieldCheck },
          { label: "감사 이력", view: "matters", section: "matter-audit", icon: FileText },
          { label: "연동·알림", view: "matters", section: "matter-integrations", icon: Bell },
          { label: "사건 설정", view: "matters", section: "matter-settings", icon: Settings }
        ]
      }
    ],
    people: peopleSidebarGroups(),
    vault: [
      { label: "문서함", view: "vault", section: "vault-documents", icon: FileText, count: "24" },
      { label: "문서 상세", view: "vault", section: "vault-detail", icon: ClipboardList },
      { label: "메일 보관함", view: "vault", section: "vault-email", icon: FileText }
    ],
    profile: profileSidebarItems,
    ...globalSubnav
  }[view] ?? [];
  const meta = sidebarMeta[view] ?? (activeGlobalUtility ? { title: activeGlobalUtility.label, utilities: [] } : { title: "matter", utilities: [] });
  const flatSubnav = subnav.flatMap((item) => item.children ?? [item]);
  const hasPreferredActiveItem = flatSubnav.some((item) => item.active);
  const showGlobalUtilityNav = view === "home";

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

  function groupOpen(item, index) {
    const key = `${view}:${item.label}`;
    if (Object.prototype.hasOwnProperty.call(openGroups, key)) return openGroups[key];
    return isGroupActive(item) || index === 0;
  }

  function toggleGroup(item, index) {
    const key = `${view}:${item.label}`;
    setOpenGroups((current) => {
      const currentOpen = Object.prototype.hasOwnProperty.call(current, key) ? current[key] : isGroupActive(item) || index === 0;
      return { ...current, [key]: !currentOpen };
    });
  }

  return (
    <aside className="sidebar" data-context-sidebar={view} aria-label={`${meta.title} 메뉴`}>
      <button
        type="button"
        className="workspace-card"
        data-workspace-menu-trigger="true"
        aria-expanded={utilityPanel?.kind === "workspace" ? "true" : "false"}
        onClick={() => setUtilityPanel({ kind: "workspace", label: `${meta.title} 작업공간` })}
      >
        <div>
          {labels.workspace && <span className="eyebrow">{labels.workspace}</span>}
          <strong>{meta.title}</strong>
        </div>
        <ChevronDown size={15} />
      </button>
      {showGlobalUtilityNav && (
        <nav className="global-sidebar-nav" aria-label="Home 빠른 메뉴" data-global-sidebar-nav="home-only">
          {globalUtilityItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={active ? "sidebar-item global-sidebar-item active" : "sidebar-item global-sidebar-item"}
                aria-current={active ? "page" : undefined}
                data-global-utility-nav={item.id}
                onClick={() => setView(item.id, item.defaultSection)}
              >
                <span className="sidebar-icon"><Icon size={16} /></span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      {subnav.length > 0 && (
        <nav className="sidebar-nav">
          {subnav.map((item, index) => {
            const Icon = item.icon ?? ClipboardList;
            if (item.children) {
              const active = isGroupActive(item);
              const open = groupOpen(item, index);
              return (
                <div key={item.label} className={active ? "sidebar-group active" : "sidebar-group"}>
                  <button
                    type="button"
                    className={active ? "sidebar-item sidebar-group-toggle active" : "sidebar-item sidebar-group-toggle"}
                    aria-expanded={open}
                    onClick={() => toggleGroup(item, index)}
                  >
                    <span className="sidebar-icon"><Icon size={16} /></span>
                    <span>{item.label}</span>
                    <ChevronDown size={15} className={open ? "sidebar-chevron open" : "sidebar-chevron"} />
                  </button>
                  {open && (
                    <div className="sidebar-subnav">
                      {item.children.map((child, childIndex) => {
                        const ChildIcon = child.icon ?? ClipboardList;
                        const childActive = isItemActive(child, childIndex);
                        return (
                          <button
                            key={child.label}
                            type="button"
                            className={childActive ? "sidebar-item sidebar-child active" : "sidebar-item sidebar-child"}
                            aria-current={childActive ? "location" : undefined}
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
              {item.count && <span className="sidebar-count">{item.count}</span>}
            </button>
            );
          })}
        </nav>
      )}
      {meta.utilities.length > 0 && (
        <div className="sidebar-utilities">
          {meta.utilities.map(({ label, icon: Icon, view: utilityView, section }) => (
            <button
              key={label}
              type="button"
              className="sidebar-utility"
              data-sidebar-utility={label}
              aria-expanded={utilityPanel?.label === label ? "true" : "false"}
              onClick={() => {
                if (utilityView) {
                  setView(utilityView, section ?? "");
                  return;
                }
                setUtilityPanel({ kind: "utility", label, scope: meta.title });
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
      {utilityPanel && (
        <div className="sidebar-utility-panel" role="status" data-sidebar-utility-panel="true">
          <strong>{utilityPanel.label}</strong>
          <span>{utilityPanel.kind === "workspace" ? "작업공간 전환 메뉴를 이 화면에서 확인합니다." : `${utilityPanel.scope} 설정은 현재 세션에서만 열립니다.`}</span>
        </div>
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
      title: query.trim() ? `${label}에서 "${query.trim()}" 검색` : `${label} · ${localLabel}`,
      view: id,
      section: defaultSection
    }))
  );

  return (
    <div className="search-popover">
      <header>
        <Search size={16} />
        <strong>{labels.search}</strong>
        <button className="icon-button" onClick={() => setQuery("")}>
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
