import React from "react";
import { useEffect, useState } from "react";
import { copy } from "./i18n.js";
import { navItems } from "./data/nav.js";
import { GlobalSearch, LoadingSurface, Rail, Sidebar, Topbar } from "./components/Shell.jsx";
import { AuthSurface } from "./components/AuthSurface.jsx";
import { HomeSurface } from "./components/HomeSurface.jsx";
import { ClientsSurface } from "./components/ClientsSurface.jsx";
import { MattersSurface } from "./components/MattersSurface.jsx";
import { VaultSurface } from "./components/VaultSurface.jsx";
import { PeopleHome } from "./people/PeopleHome.tsx";

export function App() {
  const initialParams = new URLSearchParams(window.location.search);
  const routableViews = ["auth", "home", "loading", ...navItems.map((item) => item.id)];
  const initialLocale = initialParams.get("locale") === "en" ? "en" : "ko";
  const initialTheme = initialParams.get("theme") === "dark" ? "dark" : "light";
  const initialView = routableViews.includes(initialParams.get("view")) ? initialParams.get("view") : "home";
  const initialAuthStep = ["signup", "signupModal", "login", "verify", "password", "org", "reset", "sent", "onboarding"].includes(initialParams.get("authStep"))
    ? initialParams.get("authStep")
    : "signup";
  const initialQuery = initialParams.get("query") ?? "";
  const initialLiveCtx = ["allow", "denied", "review"].includes(initialParams.get("ctx"))
    ? initialParams.get("ctx")
    : "allow";
  const initialHandoffSplash = initialParams.get("splash") === "1";
  const initialSidebarExpanded = initialParams.get("sidebar") === "expanded";
  const [locale, setLocale] = useState(initialLocale);
  const [theme, setTheme] = useState(initialTheme);
  const [view, setView] = useState(initialView);
  const [handoffSplashVisible, setHandoffSplashVisible] = useState(initialHandoffSplash);
  const [sidebarExpanded, setSidebarExpanded] = useState(initialSidebarExpanded);
  const [authStep, setAuthStep] = useState(initialAuthStep);
  const [query, setQuery] = useState(initialQuery);
  const labels = copy[locale];

  useEffect(() => {
    document.documentElement.dataset.locale = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
  }, [locale, theme]);

  useEffect(() => {
    if (!handoffSplashVisible) return undefined;
    const timer = window.setTimeout(() => setHandoffSplashVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [handoffSplashVisible]);

  if (view === "loading") {
    return <LoadingSurface labels={labels} locale={locale} theme={theme} setLocale={setLocale} setTheme={setTheme} />;
  }

  return (
    <div className="matter-app">
      <Topbar
        labels={labels}
        locale={locale}
        setLocale={setLocale}
        theme={theme}
        setTheme={setTheme}
        query={query}
        setQuery={setQuery}
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={() => setSidebarExpanded((current) => !current)}
        onCreate={() => setView("matters")}
        onInvite={() => setView("people")}
      />
      <div className={sidebarExpanded ? "app-frame sidebar-expanded" : "app-frame sidebar-collapsed"} data-sidebar-state={sidebarExpanded ? "expanded" : "collapsed"}>
        <Rail labels={labels} view={view} setView={setView} />
        <Sidebar labels={labels} view={view} setView={setView} expanded={sidebarExpanded} />
        <main className="page-canvas">
          {view === "auth" && (
            <AuthSurface labels={labels} locale={locale} authStep={authStep} setAuthStep={setAuthStep} />
          )}
          {view === "home" && (
            <HomeSurface
              labels={labels}
              setView={setView}
              liveCtx={initialLiveCtx}
            />
          )}
          {view === "clients" && <ClientsSurface labels={labels} liveCtx={initialLiveCtx} />}
          {view === "matters" && <MattersSurface labels={labels} liveCtx={initialLiveCtx} />}
          {view === "people" && <PeopleHome labels={labels} />}
          {view === "vault" && <VaultSurface labels={labels} liveCtx={initialLiveCtx} />}
        </main>
      </div>
      {handoffSplashVisible && (
        <LoadingSurface
          labels={labels}
          locale={locale}
          theme={theme}
          setLocale={setLocale}
          setTheme={setTheme}
          className="post-login-splash"
          message={locale === "ko" ? "matter 작업공간을 여는 중" : "Opening your matter workspace"}
        />
      )}
      {query && <GlobalSearch labels={labels} query={query} setQuery={setQuery} setView={setView} />}
    </div>
  );
}
