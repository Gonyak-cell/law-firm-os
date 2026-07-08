import React from "react";
import { useEffect, useState } from "react";
import { copy } from "./i18n.js";
import { navItems } from "./data/nav.js";
import { globalUtilityViewIds, isGlobalUtilityView, modeExceptionUtilityViewIds, resolveGlobalShortcut } from "./data/globalUtilities.js";
import { GlobalSearch, LoadingSurface, Sidebar, Topbar, UtilityDrawer, notificationItems, utilityMessageItems } from "./components/Shell.jsx";
import { AuthSurface } from "./components/AuthSurface.jsx";
import { GlobalUtilitySurface } from "./components/GlobalUtilitySurface.jsx";
import { HomeSurface } from "./components/HomeSurface.jsx";
import { ClientsSurface } from "./components/ClientsSurface.jsx";
import { MattersSurface } from "./components/MattersSurface.jsx";
import { VaultSurface } from "./components/VaultSurface.jsx";
import { PortalSurface } from "./components/PortalSurface.jsx";
import { UserProfileSurface } from "./components/UserProfileSurface.jsx";
import { PeopleHome } from "./people/PeopleHome.tsx";
import { SkinContext } from "./context/SkinContext.jsx";
import { loginLawosApiSession } from "./data/apiClient.js";

const productAxisIds = new Set(navItems.map((item) => item.id));
const emptyHomeActionCounts = Object.freeze({ approval: 0, task_late: 0, task_today: 0 });
const initialUnreadMessageIds = Object.freeze(utilityMessageItems.filter((item) => item.unread).map((item) => item.id));
const defaultModeReturnTarget = Object.freeze({ view: "home", section: "home-dashboard" });

export function resolveAxis(view) {
  return productAxisIds.has(view) ? view : "home";
}

function readStoredSkin() {
  try {
    return window.localStorage.getItem("matter.skin");
  } catch {
    return null;
  }
}

function storeSkin(skin) {
  try {
    window.localStorage.setItem("matter.skin", skin);
    return true;
  } catch {
    return false;
  }
}

export function App() {
  const initialParams = new URLSearchParams(window.location.search);
  const routableViews = ["auth", "home", "loading", "profile", ...navItems.map((item) => item.id), ...modeExceptionUtilityViewIds];
  const redirectableViews = [...routableViews, ...globalUtilityViewIds];
  const initialLocale = initialParams.get("locale") === "en" ? "en" : "ko";
  const initialTheme = initialParams.get("theme") === "dark" ? "dark" : "light";
  const initialSkinParam = initialParams.get("skin");
  const storedSkin = readStoredSkin();
  const initialSkin = ["forest", "matter"].includes(initialSkinParam)
    ? initialSkinParam
    : ["forest", "matter"].includes(storedSkin)
      ? storedSkin
      : "forest";
  const rawInitialView = redirectableViews.includes(initialParams.get("view")) ? initialParams.get("view") : "home";
  const rawInitialSection = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
  const resolvedInitialRoute = resolveRoute(rawInitialView, rawInitialSection);
  const initialView = resolvedInitialRoute.view;
  const initialAuthStep = ["signup", "signupModal", "login", "verify", "password", "org", "reset", "sent", "onboarding"].includes(initialParams.get("authStep"))
    ? initialParams.get("authStep")
    : "signup";
  const initialQuery = initialParams.get("query") ?? "";
  const initialLiveCtx = ["allow", "denied", "review"].includes(initialParams.get("ctx"))
    ? initialParams.get("ctx")
    : "allow";
  const initialSection = resolvedInitialRoute.section;
  const initialHandoffSplash = initialParams.get("splash") === "1";
  const [locale, setLocale] = useState(initialLocale);
  const [theme, setTheme] = useState(initialTheme);
  const [skin, setSkin] = useState(initialSkin);
  const [view, setView] = useState(initialView);
  const [liveCtx, setLiveCtx] = useState(initialLiveCtx);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [activeRedirectedFrom, setActiveRedirectedFrom] = useState(resolvedInitialRoute.redirectedFrom ?? null);
  const [handoffSplashVisible, setHandoffSplashVisible] = useState(initialHandoffSplash);
  const [authStep, setAuthStep] = useState(initialAuthStep);
  const [query, setQuery] = useState(initialQuery);
  const [utilityDrawerType, setUtilityDrawerType] = useState(resolvedInitialRoute.openNotifications ? "notifications" : "");
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(notificationItems.length);
  const [unreadMessageIds, setUnreadMessageIds] = useState(() => new Set(initialUnreadMessageIds));
  const [homeActionCounts, setHomeActionCounts] = useState(emptyHomeActionCounts);
  const [modeReturnTarget, setModeReturnTarget] = useState(() =>
    modeExceptionUtilityViewIds.includes(initialView) || ["auth", "loading"].includes(initialView)
      ? defaultModeReturnTarget
      : { view: initialView, section: initialSection || (initialView === "home" ? "home-dashboard" : "") }
  );
  const [authError, setAuthError] = useState("");
  const labels = copy[locale];
  const axis = resolveAxis(view);
  const homeApprovalCount = Number(homeActionCounts.approval ?? 0) || 0;
  const homeMessageCount = unreadMessageIds.size;
  const initialRouteWasRedirected = rawInitialView !== initialView || rawInitialSection !== initialSection;

  function resolveRoute(nextView, section = "") {
    const resolved = resolveGlobalShortcut(nextView, section);
    if (!routableViews.includes(resolved.view)) return { view: "home", section: "" };
    return resolved;
  }

  function routeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const rawView = redirectableViews.includes(params.get("view")) ? params.get("view") : "home";
    const nextLiveCtx = ["allow", "denied", "review"].includes(params.get("ctx")) ? params.get("ctx") : "allow";
    const rawSection = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
    return { ...resolveRoute(rawView, rawSection), liveCtx: nextLiveCtx };
  }

  function routeUrl(nextView, section = "") {
    const params = new URLSearchParams(window.location.search);
    params.set("view", nextView);
    params.set("ctx", liveCtx);
    const hash = section ? `#${encodeURIComponent(section)}` : "";
    return `${window.location.pathname}?${params.toString()}${hash}`;
  }

  function isReturnableWorkView(nextView) {
    return !modeExceptionUtilityViewIds.includes(nextView) && !["auth", "loading"].includes(nextView);
  }

  function routeTargetFor(nextView, section = "") {
    return { view: nextView, section: section || (nextView === "home" ? "home-dashboard" : "") };
  }

  function currentModeReturnTarget() {
    return isReturnableWorkView(view) ? routeTargetFor(view, activeSection) : modeReturnTarget;
  }

  function navigateToView(nextView, section = "") {
    const resolved = resolveRoute(nextView, section);
    if (!routableViews.includes(resolved.view)) return;
    if (modeExceptionUtilityViewIds.includes(resolved.view)) {
      setModeReturnTarget(currentModeReturnTarget());
    } else if (isReturnableWorkView(resolved.view)) {
      setModeReturnTarget(routeTargetFor(resolved.view, resolved.section));
    }
    setView(resolved.view);
    setActiveSection(resolved.section);
    setActiveRedirectedFrom(resolved.redirectedFrom ?? null);
    if (resolved.openNotifications) {
      setUtilityDrawerType("notifications");
      setNotificationUnreadCount(0);
    } else {
      setUtilityDrawerType("");
    }
    window.history.pushState({ view: resolved.view, section: resolved.section }, "", routeUrl(resolved.view, resolved.section));
  }

  function returnToWork() {
    navigateToView(modeReturnTarget.view, modeReturnTarget.section);
  }

  function toggleUtilityDrawer(type) {
    const willOpen = utilityDrawerType !== type;
    if (willOpen && type === "notifications") setNotificationUnreadCount(0);
    setUtilityDrawerType(willOpen ? type : "");
  }

  function closeUtilityDrawer() {
    setUtilityDrawerType("");
  }

  function navigateFromUtilityDrawer(section) {
    navigateToView("home", section);
    closeUtilityDrawer();
  }

  function markMessageRead(id) {
    setUnreadMessageIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function markAllMessagesRead() {
    setUnreadMessageIds(new Set());
  }

  async function handleLogin(credentials) {
    setAuthError("");
    const result = await loginLawosApiSession(credentials);
    if (!result.ok) {
      setAuthError("로그인 정보를 확인하세요.");
      return;
    }
    setHandoffSplashVisible(true);
    navigateToView("home");
  }

  useEffect(() => {
    document.documentElement.dataset.locale = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.skin = skin;
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
    storeSkin(skin);
  }, [locale, theme, skin]);

  useEffect(() => {
    if (!handoffSplashVisible) return undefined;
    const timer = window.setTimeout(() => setHandoffSplashVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [handoffSplashVisible]);

  useEffect(() => {
    if (!initialRouteWasRedirected) return;
    window.history.replaceState({ view, section: activeSection }, "", routeUrl(view, activeSection));
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = routeFromLocation();
      setView(nextRoute.view);
      setLiveCtx(nextRoute.liveCtx);
      setActiveSection(nextRoute.section);
      setActiveRedirectedFrom(nextRoute.redirectedFrom ?? null);
      if (isReturnableWorkView(nextRoute.view)) {
        setModeReturnTarget(routeTargetFor(nextRoute.view, nextRoute.section));
      }
      setUtilityDrawerType(nextRoute.openNotifications ? "notifications" : "");
      if (nextRoute.openNotifications) setNotificationUnreadCount(0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (view === "loading") {
    return (
      <SkinContext.Provider value={skin}>
        <LoadingSurface labels={labels} locale={locale} theme={theme} skin={skin} setLocale={setLocale} setTheme={setTheme} />
      </SkinContext.Provider>
    );
  }

  if (view === "auth" && authStep === "login") {
    return (
      <SkinContext.Provider value={skin}>
        <div className="matter-app auth-only-app">
          <AuthSurface
            labels={labels}
            locale={locale}
            authStep={authStep}
            setAuthStep={setAuthStep}
            authError={authError}
            onLogin={handleLogin}
          />
        </div>
      </SkinContext.Provider>
    );
  }

  return (
    <SkinContext.Provider value={skin}>
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
          axis={axis}
          setView={navigateToView}
          onCreate={() => navigateToView("matters", "matter-opening")}
          onProfile={() => navigateToView("profile")}
          utilityDrawerType={utilityDrawerType}
          onOpenUtilityDrawer={toggleUtilityDrawer}
          notificationUnreadCount={notificationUnreadCount}
          homeApprovalCount={homeApprovalCount}
          homeMessageCount={homeMessageCount}
        />
        <div className="app-frame contextual-shell" data-sidebar-state="contextual">
          <Sidebar
            labels={labels}
            view={view}
            axis={axis}
            setView={navigateToView}
            activeSection={activeSection}
            homeApprovalCount={homeApprovalCount}
            modeReturnTarget={modeReturnTarget}
            onReturnToWork={returnToWork}
          />
          <main className="page-canvas">
            {view === "auth" && (
              <AuthSurface
                labels={labels}
                locale={locale}
                authStep={authStep}
                setAuthStep={setAuthStep}
                authError={authError}
                onLogin={handleLogin}
              />
            )}
            {view === "home" && (
              <HomeSurface
                labels={labels}
                setView={navigateToView}
                liveCtx={liveCtx}
                activeSection={activeSection}
                redirectedFrom={activeRedirectedFrom}
                onHomeActionCountsChange={setHomeActionCounts}
              />
            )}
            {view === "clients" && <ClientsSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} />}
            {view === "matters" && <MattersSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} onNavigateSection={(section) => navigateToView("matters", section)} />}
            {view === "people" && <PeopleHome labels={labels} activeSection={activeSection} liveCtx={liveCtx} />}
            {view === "vault" && <VaultSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} />}
            {view === "portal" && <PortalSurface labels={labels} liveCtx={liveCtx} />}
            {view === "profile" && <UserProfileSurface liveCtx={liveCtx} onNavigate={navigateToView} />}
            {isGlobalUtilityView(view) && modeExceptionUtilityViewIds.includes(view) && (
              <GlobalUtilitySurface
                view={view}
                activeSection={activeSection}
                setView={navigateToView}
                theme={theme}
                setTheme={setTheme}
                skin={skin}
                setSkin={setSkin}
              />
            )}
          </main>
        </div>
        {handoffSplashVisible && (
          <LoadingSurface
            labels={labels}
            locale={locale}
            theme={theme}
            skin={skin}
            setLocale={setLocale}
            setTheme={setTheme}
            className="post-login-splash"
            message="matter 작업공간을 여는 중"
          />
        )}
        {query && <GlobalSearch labels={labels} query={query} setQuery={setQuery} setView={navigateToView} />}
        <UtilityDrawer
          open={Boolean(utilityDrawerType)}
          type={utilityDrawerType}
          notificationUnreadCount={notificationUnreadCount}
          homeApprovalCount={homeApprovalCount}
          homeMessageCount={homeMessageCount}
          unreadMessageIds={unreadMessageIds}
          onClose={closeUtilityDrawer}
          onNavigateHomeSection={navigateFromUtilityDrawer}
          onMarkNotificationRead={() => setNotificationUnreadCount(0)}
          onMarkMessageRead={markMessageRead}
          onMarkAllMessagesRead={markAllMessagesRead}
        />
      </div>
    </SkinContext.Provider>
  );
}
