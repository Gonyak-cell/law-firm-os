import React from "react";
import { useEffect } from "react";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileText,
  Globe2,
  Mail,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  UserPlus,
  UserRound,
  X
} from "lucide-react";
import { navItems } from "../data/nav.js";
import { MatterSplash } from "./MatterSplash.jsx";
import { MatterLogo } from "./MatterLogo.jsx";
import { profileSidebarItems } from "./UserProfileSurface.jsx";

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
    status: "충돌 확인",
    summary: "동명이인 후보 2건이 있어 담당자 확인이 필요합니다.",
    time: "10:07 PM"
  },
  {
    id: "people-approval",
    initials: "HR",
    type: "People",
    title: "외부 협업자 권한 승인",
    client: "Matter Team",
    status: "승인 요청",
    summary: "Vault 열람 범위가 제한된 상태로 승인 요청되었습니다.",
    time: "9:58 PM"
  }
];

export function Topbar({ labels, locale, setLocale, theme, setTheme, query, setQuery, view, setView, onCreate, onInvite, onProfile, notificationsOpen, onToggleNotifications }) {
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
        <button className="icon-button" aria-label="도움말">
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
    </header>
  );
}

export function NotificationDrawer({ open, onClose }) {
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
            <p>Client, Matter, People, Vault 작업 신호</p>
          </div>
          <button type="button" className="icon-button" aria-label="알림 닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
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
          <button type="button" className="text-button">모두 읽음 처리</button>
          <button type="button" className="text-button">알림 설정</button>
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
      { label: "대시보드", view: "home", section: "home-dashboard", icon: Sparkles },
      { label: "검토함", view: "home", section: "home-review", icon: ShieldCheck, count: "3" }
    ],
    utilities: [
      { label: "작업공간 설정", icon: Settings },
      { label: "태그 관리", icon: Tags }
    ]
  },
  clients: {
    title: "Client",
    utilities: [
      { label: "Client 설정", icon: Settings },
      { label: "태그 관리", icon: Tags }
    ]
  },
  matters: {
    title: "Matter",
    utilities: [
      { label: "Matter 설정", icon: Settings },
      { label: "태그 관리", icon: Tags }
    ]
  },
  people: {
    title: "People",
    utilities: [
      { label: "People 설정", icon: Settings },
      { label: "권한 정책", icon: ShieldCheck }
    ]
  },
  vault: {
    title: "Vault",
    utilities: [
      { label: "Vault 설정", icon: Settings },
      { label: "문서 태그", icon: Tags }
    ]
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
  const subnav = {
    auth: [
      { label: "로그인", view: "auth" },
      { label: "비밀번호 재설정", view: "auth" }
    ],
    home: sidebarMeta.home.actions,
    clients: [
      { label: "Client 목록", view: "clients", section: "clients-list", icon: ClipboardList, count: "12" },
      { label: "잠재 Client", view: "clients", section: "client-leads", icon: Sparkles },
      { label: "기회", view: "clients", section: "client-opportunities", icon: ClipboardList },
      { label: "접수", view: "clients", section: "client-intake", icon: FileText, count: "4" },
      { label: "계정", view: "clients", section: "client-accounts", icon: ShieldCheck },
      { label: "연락처", view: "clients", section: "client-contacts", icon: UserPlus },
      { label: "데이터 관리", view: "clients", section: "client-data", icon: Settings },
      { label: "보고서", view: "clients", section: "client-reports", icon: FileText },
      { label: "가져오기", view: "clients", section: "client-import", icon: Plus }
    ],
    matters: [
      { label: "Matter 목록", view: "matters", section: "matters-list", icon: ClipboardList, count: "18" },
      { label: "현황", view: "matters", section: "matter-command", icon: Sparkles },
      { label: "문서", view: "matters", section: "matter-vault", icon: FileText },
      { label: "활동", view: "matters", section: "matter-timeline", icon: ClipboardList },
      { label: "일정", view: "matters", section: "matter-calendar", icon: ClipboardList },
      { label: "대화", view: "matters", section: "matter-channel", icon: FileText, count: "2" },
      { label: "개시", view: "matters", section: "matter-opening", icon: Plus },
      { label: "구성원", view: "matters", section: "matter-team", icon: UserPlus },
      { label: "청구", view: "matters", section: "matter-billing", icon: FileText },
      { label: "분석", view: "matters", section: "matter-analytics", icon: Sparkles },
      { label: "가져오기", view: "matters", section: "matter-import", icon: Plus }
    ],
    people: [
      { label: "디렉터리", view: "people", section: "people-directory", icon: ClipboardList },
      { label: "관계망", view: "people", section: "people-relationships", icon: UserPlus },
      { label: "충돌/벽", view: "people", section: "people-conflicts", icon: ShieldCheck },
      { label: "구성원", view: "people", section: "people-members", icon: UserPlus, count: "9" },
      { label: "인사 문서", view: "people", section: "people-documents", icon: FileText },
      { label: "휴가", view: "people", section: "people-leave", icon: ClipboardList },
      { label: "승인", view: "people", section: "people-approvals", icon: ShieldCheck, count: "5" },
      { label: "채용", view: "people", section: "people-recruiting", icon: Sparkles },
      { label: "입퇴사", view: "people", section: "people-lifecycle", icon: ClipboardList },
      { label: "인사 정책", view: "people", section: "people-policy", icon: FileText },
      { label: "활동 기록", view: "people", section: "people-audit", icon: ClipboardList },
      { label: "인사 현황", view: "people", section: "people-analytics", icon: Sparkles },
      { label: "AI 검토", view: "people", section: "people-ai", icon: Sparkles },
      { label: "급여정산", view: "people", section: "people-payroll", icon: FileText },
      { label: "권한 관리", view: "people", section: "people-admin", icon: ShieldCheck }
    ],
    vault: [
      { label: "문서함", view: "vault", section: "vault-documents", icon: FileText, count: "24" },
      { label: "상세", view: "vault", section: "vault-detail", icon: ClipboardList },
      { label: "메일 보관", view: "vault", section: "vault-email", icon: FileText }
    ],
    profile: profileSidebarItems
  }[view] ?? [];
  const meta = sidebarMeta[view] ?? { title: labels.workspace, utilities: [] };
  const hasPreferredActiveItem = subnav.some((item) => item.active);

  return (
    <aside className="sidebar" data-context-sidebar={view} aria-label={`${meta.title} 메뉴`}>
      <div className="workspace-card">
        <div>
          <span className="eyebrow">{labels.workspace}</span>
          <strong>{meta.title}</strong>
        </div>
        <ChevronDown size={15} />
      </div>
      {subnav.length > 0 && (
        <nav className="sidebar-nav">
          {subnav.map((item, index) => {
            const active = item.section
              ? activeSection === item.section || (!activeSection && index === 0 && !hasPreferredActiveItem)
              : item.active
                ? !activeSection
                : index === 0 && !hasPreferredActiveItem;
            const Icon = item.icon ?? ClipboardList;
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
          {meta.utilities.map(({ label, icon: Icon }) => (
            <button key={label} type="button" className="sidebar-utility">
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
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
  }));

  return (
    <div className="search-popover">
      <header>
        <Search size={16} />
        <strong>{labels.search}</strong>
        <button className="icon-button" onClick={() => setQuery("")}>
          <X size={15} />
        </button>
      </header>
      {results.map(({ icon: Icon, title, view }) => (
        <button
          key={title}
          className="search-result"
          onClick={() => {
            setView(view);
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
