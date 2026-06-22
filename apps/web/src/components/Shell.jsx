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
      <p>{locale === "ko" ? "최근 작업공간과 권한을 확인하고 있습니다." : "Checking your workspace and permissions."}</p>
      <div className="loading-actions">
        <button className="secondary-button" onClick={() => setLocale(locale === "ko" ? "en" : "ko")}>{labels.language}</button>
        <button className="secondary-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{labels.theme}</button>
      </div>
    </main>
  );
}

function ProductAxisNav({ view, setView }) {
  return (
    <nav className="top-axis-nav" aria-label="Client Matter People Vault product axes" data-product-axis-nav="top-header">
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
        aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
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
        <button className="icon-button" aria-label="Notifications">
          <Bell size={17} />
        </button>
        <button className="icon-button" aria-label="Help">
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

export function Sidebar({ labels, view, setView, expanded = false }) {
  const subnav = {
    auth: [
      { label: "Login", view: "auth" },
      { label: "Password reset", view: "auth" }
    ],
    home: [],
    clients: [
      { label: "Client groups", view: "clients" },
      { label: "Parties", view: "clients" },
      { label: "Relationships", view: "clients" },
      { label: "Review", view: "clients" },
      { label: "Audit", view: "clients" }
    ],
    matters: [
      { label: "Matter home", view: "matters" },
      { label: "Opening", view: "matters" },
      { label: "Team", view: "matters" },
      { label: "Finance", view: "matters" },
      { label: "AI review", view: "matters" }
    ],
    people: [
      { label: "Overview", view: "people" },
      { label: "Employees", view: "people" },
      { label: "Documents", view: "people" },
      { label: "Leave", view: "people" },
      { label: "Lifecycle", view: "people" }
    ],
    vault: [
      { label: "Documents", view: "vault" },
      { label: "Folders", view: "vault" },
      { label: "Versions", view: "vault" },
      { label: "Legal hold", view: "vault" },
      { label: "Audit", view: "vault" }
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
          {subnav.map((item, index) => (
            <button key={item.label} className={index === 0 ? "sidebar-item active" : "sidebar-item"} onClick={() => setView(item.view)}>
              <span className="sidebar-dot" />
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </aside>
  );
}

export function GlobalSearch({ labels, query, setQuery, setView }) {
  const results = navItems.map(({ id, icon }) => ({
    icon,
    title: query.trim() ? `${labels[id]} axis for "${query.trim()}"` : `${labels[id]} axis`,
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
