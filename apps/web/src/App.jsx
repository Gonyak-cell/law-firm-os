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
  const initialSection = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
  const initialHandoffSplash = initialParams.get("splash") === "1";
  const initialSidebarExpanded = initialParams.get("sidebar") !== "collapsed";
  const [locale, setLocale] = useState(initialLocale);
  const [theme, setTheme] = useState(initialTheme);
  const [view, setView] = useState(initialView);
  const [liveCtx, setLiveCtx] = useState(initialLiveCtx);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [handoffSplashVisible, setHandoffSplashVisible] = useState(initialHandoffSplash);
  const [sidebarExpanded, setSidebarExpanded] = useState(initialSidebarExpanded);
  const [authStep, setAuthStep] = useState(initialAuthStep);
  const [query, setQuery] = useState(initialQuery);
  const labels = copy[locale];

  function routeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const nextView = routableViews.includes(params.get("view")) ? params.get("view") : "home";
    const nextLiveCtx = ["allow", "denied", "review"].includes(params.get("ctx")) ? params.get("ctx") : "allow";
    const nextSection = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
    return { view: nextView, liveCtx: nextLiveCtx, section: nextSection };
  }

  function routeUrl(nextView, section = "") {
    const params = new URLSearchParams(window.location.search);
    params.set("view", nextView);
    params.set("ctx", liveCtx);
    const hash = section ? `#${encodeURIComponent(section)}` : "";
    return `${window.location.pathname}?${params.toString()}${hash}`;
  }

  function navigateToView(nextView, section = "") {
    if (!routableViews.includes(nextView)) return;
    setView(nextView);
    setActiveSection(section);
    window.history.pushState({ view: nextView, section }, "", routeUrl(nextView, section));
  }

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

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = routeFromLocation();
      setView(nextRoute.view);
      setLiveCtx(nextRoute.liveCtx);
      setActiveSection(nextRoute.section);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
        view={view}
        setView={navigateToView}
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={() => setSidebarExpanded((current) => !current)}
        onCreate={() => navigateToView("matters", "matter-opening")}
        onInvite={() => navigateToView("people", "people-members")}
      />
      <div className={sidebarExpanded ? "app-frame sidebar-expanded" : "app-frame sidebar-collapsed"} data-sidebar-state={sidebarExpanded ? "expanded" : "collapsed"}>
        <Rail />
        <Sidebar labels={labels} view={view} setView={navigateToView} activeSection={activeSection} expanded={sidebarExpanded} />
        <main className="page-canvas">
          {view === "auth" && (
            <AuthSurface
              labels={labels}
              locale={locale}
              authStep={authStep}
              setAuthStep={setAuthStep}
              onLogin={() => {
                setHandoffSplashVisible(true);
                navigateToView("home");
              }}
            />
          )}
          {view === "home" && (
            <HomeSurface
              labels={labels}
              setView={navigateToView}
              liveCtx={liveCtx}
            />
          )}
          {view === "clients" && <ClientsSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} />}
          {view === "matters" && <MattersSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} />}
          {view === "people" && <PeopleHome labels={labels} activeSection={activeSection} />}
          {view === "vault" && <VaultSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} />}
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
          message="matter 작업공간을 여는 중"
        />
      )}
      {query && <GlobalSearch labels={labels} query={query} setQuery={setQuery} setView={navigateToView} />}
    </div>
  );
}
