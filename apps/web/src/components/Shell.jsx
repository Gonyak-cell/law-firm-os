import React from "react";
import { useEffect } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  Globe2,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { PRODUCT_BRAND } from "../brand/brand";
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

export function Topbar({ labels, locale, setLocale, theme, setTheme, query, setQuery, onCreate, onInvite }) {
  return (
    <header className="topbar">
      <button className="icon-button" aria-label="Open navigation">
        <Menu size={18} />
      </button>
      <button className="primary-button" onClick={onCreate}>
        <Plus size={15} />
        {labels.create}
      </button>
      <button className="top-link">
        {labels.recent}
        <ChevronDown size={14} />
      </button>
      <button className="top-link">
        {labels.favorites}
        <ChevronDown size={14} />
      </button>
      <button className="top-link">
        {labels.spaces}
        <ChevronDown size={14} />
      </button>
      <label className="global-search">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
        <kbd>/</kbd>
      </label>
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

export function Rail({ labels, view, setView }) {
  return (
    <aside className="rail">
      <div className="rail-logo">
        <MatterLogo compact />
      </div>
      <nav className="rail-nav" aria-label="Primary">
        {navItems.map(({ id, icon: Icon }) => (
          <button key={id} className={view === id ? "rail-item active" : "rail-item"} title={labels[id]} onClick={() => setView(id)}>
            <Icon size={18} />
          </button>
        ))}
      </nav>
      <button className="rail-item bottom" title="Settings" onClick={() => setView("admin")}>
        <Settings size={18} />
      </button>
    </aside>
  );
}

export function Sidebar({ labels, view, setView }) {
  const subnav = {
    auth: ["Marketing", "Signup", "Login", "Password", "Organization", "Email sent"],
    home: ["Overview", "Templates", "Guides", "Resources", "Realtime"],
    content: ["All content", "Spaces", "Resources", "Feature flags", "Catalog"],
    clients: ["Client groups", "Parties", "Relationships", "Review queue", "Audit"],
    matters: ["Matter home", "Opening", "Team", "Deadlines", "Audit"],
    vault: ["Matter vault", "Document detail", "Email filing", "Search", "Audit"],
    portal: ["Client dashboard", "External ACL", "RFI queue", "Data room", "Secure links"],
    readiness: ["Navigation IA", "API-backed surfaces", "Permission states", "Review states", "Evidence"],
    ops: ["SSO/MFA", "Observability", "DR", "Release candidate", "Go/no-go"],
    intake: ["Opportunity pipeline", "Intake queue", "Conflict checks", "Clearance tokens", "Audit"],
    finance: ["Time entries", "WIP", "PreBill", "Invoices", "AR aging"],
    profiles: ["Matter Profiles", "Group Profiles", "Cohorts", "Session replays", "Raw events"],
    people: ["Overview", "Employees", "Profile", "Documents", "Leave"],
    analytics: ["Segmentation", "Funnels", "Data table", "Retention", "Journeys"],
    dashboards: ["Dashboards", "Notebooks", "Reports", "Templates", "Pinned"],
    ask: ["Prompt gallery", "Answers", "Guidance", "Feedback", "History"],
    experiments: ["Overview", "Experiments", "Flags", "Variants", "Rollout"],
    admin: ["Organization", "Team members", "Billing", "Notifications", "Profile"],
    dark: ["Theme modal", "Dark dashboard", "Dark content", "Dark Ask", "Preference"]
  }[view];

  return (
    <aside className="sidebar">
      <div className="workspace-card">
        <div>
          <span className="eyebrow">{labels.workspace}</span>
          <strong>{labels.project}</strong>
        </div>
        <ChevronDown size={15} />
      </div>
      <nav className="sidebar-nav">
        {subnav.map((label, index) => (
          <button key={label} className={index === 0 ? "sidebar-item active" : "sidebar-item"} onClick={() => setView(view)}>
            <span className="sidebar-dot" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export function GlobalSearch({ labels, query, setQuery, setView }) {
  const results = [
    { icon: Search, title: `Search "${query}"`, view: "content" },
    { icon: BarChart3, title: "MAT-248 Event Segmentation", view: "analytics" },
    { icon: Users, title: "Project Atlas LDD", view: "profiles" },
    { icon: Sparkles, title: `Ask ${PRODUCT_BRAND} for related insights`, view: "ask" }
  ];

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
