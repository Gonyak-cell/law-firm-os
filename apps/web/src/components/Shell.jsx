import React from "react";
import { useEffect } from "react";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Globe2,
  Menu,
  Moon,
  Plus,
  Search,
  UserPlus,
  X
} from "lucide-react";
import { navItems } from "../data/nav.js";
import { MatterSplash } from "./MatterSplash.jsx";
import { MatterLogo } from "./MatterLogo.jsx";

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
    <nav className="top-axis-nav" aria-label="Client Matter People Vault" data-product-axis-nav="top-header">
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

export function Topbar({ labels, locale, setLocale, theme, setTheme, query, setQuery, view, setView, sidebarExpanded, onToggleSidebar, onCreate, onInvite }) {
  return (
    <header className="topbar">
      <button
        className={sidebarExpanded ? "icon-button nav-toggle active" : "icon-button nav-toggle"}
        aria-label={sidebarExpanded ? "사이드바 접기" : "사이드바 펼치기"}
        aria-expanded={sidebarExpanded}
        onClick={onToggleSidebar}
      >
        <Menu size={18} />
      </button>
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
        <button className="icon-button" aria-label="알림">
          <Bell size={17} />
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
        <button className="top-link">{labels.upgrade}</button>
      </div>
    </header>
  );
}

export function Rail() {
  return (
    <aside className="rail">
      <div className="rail-logo">
        <MatterLogo compact />
      </div>
    </aside>
  );
}

export function Sidebar({ labels, view, setView, activeSection = "", expanded = false }) {
  const subnav = {
    auth: [
      { label: "로그인", view: "auth" },
      { label: "비밀번호 재설정", view: "auth" }
    ],
    home: [],
    clients: [
      { label: "Client 목록", view: "clients", section: "clients-list" },
      { label: "잠재 Client", view: "clients", section: "client-leads" },
      { label: "기회", view: "clients", section: "client-opportunities" },
      { label: "접수", view: "clients", section: "client-intake" },
      { label: "계정", view: "clients", section: "client-accounts" },
      { label: "연락처", view: "clients", section: "client-contacts" },
      { label: "데이터 관리", view: "clients", section: "client-data" },
      { label: "보고서", view: "clients", section: "client-reports" },
      { label: "가져오기", view: "clients", section: "client-import" }
    ],
    matters: [
      { label: "Matter 목록", view: "matters", section: "matters-list" },
      { label: "현황", view: "matters", section: "matter-command" },
      { label: "문서", view: "matters", section: "matter-vault" },
      { label: "활동", view: "matters", section: "matter-timeline" },
      { label: "일정", view: "matters", section: "matter-calendar" },
      { label: "대화", view: "matters", section: "matter-channel" },
      { label: "개시", view: "matters", section: "matter-opening" },
      { label: "구성원", view: "matters", section: "matter-team" },
      { label: "청구", view: "matters", section: "matter-billing" },
      { label: "분석", view: "matters", section: "matter-analytics" },
      { label: "가져오기", view: "matters", section: "matter-import" }
    ],
    people: [
      { label: "구성원", view: "people", section: "people-members" },
      { label: "인사 문서", view: "people", section: "people-documents" },
      { label: "휴가", view: "people", section: "people-leave" },
      { label: "승인", view: "people", section: "people-approvals" },
      { label: "채용", view: "people", section: "people-recruiting" },
      { label: "입퇴사", view: "people", section: "people-lifecycle" },
      { label: "인사 정책", view: "people", section: "people-policy" },
      { label: "활동 기록", view: "people", section: "people-audit" },
      { label: "인사 현황", view: "people", section: "people-analytics" },
      { label: "자동 검토", view: "people", section: "people-ai" },
      { label: "급여정산", view: "people", section: "people-payroll" },
      { label: "권한 관리", view: "people", section: "people-admin" }
    ],
    vault: [
      { label: "문서함", view: "vault", section: "vault-documents" },
      { label: "상세", view: "vault", section: "vault-detail" },
      { label: "메일 보관", view: "vault", section: "vault-email" }
    ]
  }[view] ?? [];

  return (
    <aside className="sidebar" data-sidebar-expanded={expanded ? "true" : "false"} aria-hidden={!expanded}>
      <div className="sidebar-brand">
        <MatterLogo />
      </div>
      <div className="workspace-card">
        <div>
          <span className="eyebrow">{labels.workspace}</span>
          <strong>{labels.project}</strong>
        </div>
        <ChevronDown size={15} />
      </div>
      {subnav.length > 0 && (
        <nav className="sidebar-nav">
          {subnav.map((item, index) => {
            const active = item.section ? activeSection === item.section || (!activeSection && index === 0) : index === 0;
            return (
            <button
              key={item.label}
              type="button"
              className={active ? "sidebar-item active" : "sidebar-item"}
              aria-current={active ? "location" : undefined}
              onClick={() => setView(item.view, item.section ?? "")}
            >
              <span className="sidebar-dot" />
              {item.label}
            </button>
            );
          })}
        </nav>
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
