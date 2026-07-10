import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { copy } from "./i18n.js";
import { navItems } from "./data/nav.js";
import { globalUtilityViewIds, isGlobalUtilityView, modeExceptionUtilityViewIds, resolveGlobalShortcut } from "./data/globalUtilities.js";
import { GlobalSearch, LoadingSurface, Sidebar, Topbar, UtilityDrawer, buildContextualNavigation, buildNotificationItems } from "./components/Shell.jsx";
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
import { loginLawosApiSession, readLawosApiSession, readLawosSessionEnvelope } from "./data/apiClient.js";
import { canAccessHomeCompany } from "./data/homeAccess.js";
import { canAccessHomeFinanceSection } from "./data/financeAccess.js";
import { fetchHomeMessageItems } from "./data/homeMessages.js";
import { emitHomeMetric } from "./data/homeTelemetry.js";

const productAxisIds = new Set(navItems.map((item) => item.id));
const emptyHomeActionCounts = Object.freeze({ approval: 0, task_late: 0, task_today: 0 });
const homeFallbackSection = "home-dashboard";
const homeFinanceSectionIds = new Set([
  "home-finance-overview",
  "home-finance-monthly",
  "home-finance-clients",
  "home-finance-time",
  "home-finance-expenses",
  "home-finance-billing",
  "home-finance-ar"
]);
const homeSectionIds = new Set([homeFallbackSection, ...homeFinanceSectionIds, "home-requests", "home-todo", "home-feed", "home-calendar", "home-messages", "home-esign", "home-company"]);
const defaultModeReturnTarget = Object.freeze({ view: "home", section: "home-dashboard" });
const desktopLocalDefaultEmail = "jwsuh@amic.kr";
const desktopLocalDefaultPassword = "local-loopback-desktop-session";

function normalizeHomeRoute(route) {
  if (route.view !== "home") return route;
  const section = route.section || homeFallbackSection;
  return { ...route, section: homeSectionIds.has(section) ? section : homeFallbackSection };
}

function homeCompanyAccessRecords(source = globalThis) {
  const apiSession = readLawosApiSession(source);
  return [apiSession, apiSession?.session, readLawosSessionEnvelope(source)];
}

function readHomeCompanyAccess(source = globalThis) {
  return canAccessHomeCompany(homeCompanyAccessRecords(source));
}

function isDesktopRenderer(source = globalThis) {
  const windowLike = source?.window ?? source;
  const location = windowLike?.location ?? source?.location;
  if (location?.protocol !== "file:") return false;
  try {
    const params = new URLSearchParams(location.search ?? "");
    return params.get("desktop") === "1" && typeof windowLike?.matterSession?.status === "function";
  } catch {
    return false;
  }
}

function isLocalDesktopRuntime(runtime = {}) {
  try {
    const url = new URL(runtime?.baseUrl ?? "");
    return ["127.0.0.1", "localhost"].includes(url.hostname) && runtime.operatorRuntimeConfigured !== true;
  } catch {
    return false;
  }
}

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
  const routableViews = ["auth", "home", "loading", ...navItems.map((item) => item.id), ...modeExceptionUtilityViewIds];
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
  const initialCompanyAccess = readHomeCompanyAccess();
  const resolvedInitialRoute = resolveRoute(rawInitialView, rawInitialSection, initialCompanyAccess);
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
  const [canViewCompanyStatus, setCanViewCompanyStatus] = useState(initialCompanyAccess);
  const [homeCompanyAccessDenied, setHomeCompanyAccessDenied] = useState(resolvedInitialRoute.homeCompanyAccessDenied === true);
  const [handoffSplashVisible, setHandoffSplashVisible] = useState(initialHandoffSplash);
  const [authStep, setAuthStep] = useState(initialAuthStep);
  const [query, setQuery] = useState(initialQuery);
  const [utilityDrawerType, setUtilityDrawerType] = useState(resolvedInitialRoute.openNotifications ? "notifications" : "");
  const [notificationItemsRead, setNotificationItemsRead] = useState(resolvedInitialRoute.openNotifications === true);
  const [homeMessageItems, setHomeMessageItems] = useState([]);
  const [unreadMessageIds, setUnreadMessageIds] = useState(() => new Set());
  const [homeActionCounts, setHomeActionCounts] = useState(emptyHomeActionCounts);
  const [globalRefreshSignal, setGlobalRefreshSignal] = useState(0);
  const readMessageIdsRef = useRef(new Set());
  const [desktopSessionChecked, setDesktopSessionChecked] = useState(() => !isDesktopRenderer());
  const [modeReturnTarget, setModeReturnTarget] = useState(() =>
    modeExceptionUtilityViewIds.includes(initialView) || ["auth", "loading"].includes(initialView)
      ? defaultModeReturnTarget
      : { view: initialView, section: initialSection || (initialView === "home" ? "home-dashboard" : "") }
  );
  const [authError, setAuthError] = useState("");
  const labels = copy[locale];
  const axis = resolveAxis(view);
  const profileStandalone = view === "profile";
  const homeApprovalCount = Number(homeActionCounts.approval ?? 0) || 0;
  const homeMessageCount = unreadMessageIds.size;
  const contextualNavigation = useMemo(() => buildContextualNavigation({
    labels,
    financeAccessRecords: homeCompanyAccessRecords(),
    homeApprovalCount,
    homeMessageCount,
    canViewCompanyStatus
  }), [labels, homeApprovalCount, homeMessageCount, canViewCompanyStatus]);
  const notificationItems = useMemo(() => buildNotificationItems({ homeActionCounts, labels }), [homeActionCounts, labels]);
  const notificationSignature = notificationItems.map((item) => item.id).join("|");
  const notificationUnreadCount = notificationItemsRead ? 0 : notificationItems.length;
  const initialRouteWasRedirected = rawInitialView !== initialView || rawInitialSection !== initialSection;

  function resolveRoute(nextView, section = "", companyAllowed = canViewCompanyStatus, financeAccessRecords = homeCompanyAccessRecords()) {
    const resolved = normalizeHomeRoute(resolveGlobalShortcut(nextView, section));
    if (!routableViews.includes(resolved.view)) return { view: "home", section: homeFallbackSection };
    if (resolved.view === "home" && resolved.section === "home-company" && !companyAllowed) {
      return { ...resolved, section: "home-dashboard", homeCompanyAccessDenied: true };
    }
    if (resolved.view === "home" && homeFinanceSectionIds.has(resolved.section) && !canAccessHomeFinanceSection(financeAccessRecords, resolved.section)) {
      const financeFallback = [...homeFinanceSectionIds].find((financeSection) => canAccessHomeFinanceSection(financeAccessRecords, financeSection));
      return { ...resolved, section: financeFallback ?? homeFallbackSection, homeFinanceAccessDenied: true };
    }
    return resolved;
  }

  function routeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const rawView = redirectableViews.includes(params.get("view")) ? params.get("view") : "home";
    const nextLiveCtx = ["allow", "denied", "review"].includes(params.get("ctx")) ? params.get("ctx") : "allow";
    const rawSection = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
    const companyAllowed = readHomeCompanyAccess();
    return { ...resolveRoute(rawView, rawSection, companyAllowed), liveCtx: nextLiveCtx, companyAllowed };
  }

  function routeUrl(nextView, section = "", routeContext = {}) {
    const params = new URLSearchParams(window.location.search);
    params.set("view", nextView);
    params.set("ctx", liveCtx);
    if (routeContext.filter) params.set("filter", routeContext.filter);
    else params.delete("filter");
    if (Object.prototype.hasOwnProperty.call(routeContext, "matterId")) {
      if (routeContext.matterId) params.set("matter_id", routeContext.matterId);
      else params.delete("matter_id");
    } else if (!homeFinanceSectionIds.has(section)) {
      params.delete("matter_id");
    }
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

  function refreshCurrentSurface() {
    setGlobalRefreshSignal((value) => value + 1);
  }

  function navigateToView(nextView, section = "", routeContext = {}) {
    const companyAllowed = readHomeCompanyAccess();
    setCanViewCompanyStatus(companyAllowed);
    const resolved = resolveRoute(nextView, section, companyAllowed);
    if (!routableViews.includes(resolved.view)) return;
    const requestedSection = section || "";
    const resolvedSection = resolved.section || "";
    const currentSection = activeSection || "";
    const redirected =
      resolved.view !== nextView ||
      resolvedSection !== requestedSection ||
      Boolean(resolved.redirectedFrom) ||
      resolved.homeCompanyAccessDenied === true ||
      resolved.openNotifications === true;
    emitHomeMetric("home_deeplink_misclick", {
      requested_view: nextView,
      requested_section: requestedSection,
      resolved_view: resolved.view,
      resolved_section: resolvedSection,
      current_view: view,
      current_section: currentSection,
      outcome: redirected ? "redirected" : resolved.view === view && resolvedSection === currentSection ? "same_route" : "navigated",
      home_company_access_denied: resolved.homeCompanyAccessDenied === true,
      open_notifications: resolved.openNotifications === true
    });
    if (modeExceptionUtilityViewIds.includes(resolved.view)) {
      setModeReturnTarget(currentModeReturnTarget());
    } else if (isReturnableWorkView(resolved.view)) {
      setModeReturnTarget(routeTargetFor(resolved.view, resolved.section));
    }
    setView(resolved.view);
    setActiveSection(resolved.section);
    setActiveRedirectedFrom(resolved.redirectedFrom ?? null);
    setHomeCompanyAccessDenied(resolved.homeCompanyAccessDenied === true);
    if (resolved.openNotifications) {
      setUtilityDrawerType("notifications");
      setNotificationItemsRead(true);
    } else {
      setUtilityDrawerType("");
    }
    window.history.pushState(
      { view: resolved.view, section: resolved.section },
      "",
      routeUrl(resolved.view, resolved.section, { ...resolved, ...routeContext })
    );
  }

  function returnToWork() {
    navigateToView(modeReturnTarget.view, modeReturnTarget.section);
  }

  function toggleUtilityDrawer(type) {
    const willOpen = utilityDrawerType !== type;
    if (willOpen && type === "notifications") setNotificationItemsRead(true);
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
    if (!id) return;
    const readIds = new Set(readMessageIdsRef.current);
    readIds.add(id);
    readMessageIdsRef.current = readIds;
    setUnreadMessageIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function markAllMessagesRead() {
    readMessageIdsRef.current = new Set(homeMessageItems.map((item) => item.id));
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
    if (!isDesktopRenderer()) return undefined;
    let cancelled = false;
    async function verifyDesktopSession() {
      try {
        const status = await window.matterSession.status();
        if (status?.state === "signed_in") {
          if (!cancelled) setDesktopSessionChecked(true);
          return;
        }
        const runtime = typeof window.matterSession.runtime === "function" ? await window.matterSession.runtime() : null;
        if (isLocalDesktopRuntime(runtime)) {
          const result = await loginLawosApiSession({
            email: desktopLocalDefaultEmail,
            password: desktopLocalDefaultPassword
          });
          if (result?.ok) {
            if (cancelled) return;
            setCanViewCompanyStatus(readHomeCompanyAccess());
            setDesktopSessionChecked(true);
            return;
          }
        }
      } catch {
      }
      if (cancelled) return;
      setAuthStep("login");
      setView("auth");
      setActiveSection("");
      setDesktopSessionChecked(true);
    }
    verifyDesktopSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!desktopSessionChecked) return undefined;
    let cancelled = false;
    fetchHomeMessageItems({ ctx: liveCtx }).then((items) => {
      if (cancelled) return;
      const nextItems = Array.isArray(items) ? items : [];
      setHomeMessageItems(nextItems);
      setUnreadMessageIds(new Set(
        nextItems
          .filter((item) => item.unread !== false && !readMessageIdsRef.current.has(item.id))
          .map((item) => item.id)
      ));
    });
    return () => {
      cancelled = true;
    };
  }, [desktopSessionChecked, liveCtx]);

  useEffect(() => {
    setNotificationItemsRead(utilityDrawerType === "notifications");
  }, [notificationSignature]);

  useEffect(() => {
    if (!handoffSplashVisible) return undefined;
    const timer = window.setTimeout(() => setHandoffSplashVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [handoffSplashVisible]);

  useEffect(() => {
    if (!initialRouteWasRedirected) return;
    emitHomeMetric("home_deeplink_misclick", {
      requested_view: rawInitialView,
      requested_section: rawInitialSection,
      resolved_view: view,
      resolved_section: activeSection,
      current_view: view,
      current_section: activeSection,
      outcome: "redirected",
      source: "initial_route",
      home_company_access_denied: homeCompanyAccessDenied,
      open_notifications: resolvedInitialRoute.openNotifications === true
    });
    window.history.replaceState({ view, section: activeSection }, "", routeUrl(view, activeSection, resolvedInitialRoute));
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = routeFromLocation();
      setView(nextRoute.view);
      setLiveCtx(nextRoute.liveCtx);
      setCanViewCompanyStatus(nextRoute.companyAllowed);
      setActiveSection(nextRoute.section);
      setActiveRedirectedFrom(nextRoute.redirectedFrom ?? null);
      setHomeCompanyAccessDenied(nextRoute.homeCompanyAccessDenied === true);
      if (isReturnableWorkView(nextRoute.view)) {
        setModeReturnTarget(routeTargetFor(nextRoute.view, nextRoute.section));
      }
      setUtilityDrawerType(nextRoute.openNotifications ? "notifications" : "");
      if (nextRoute.openNotifications) setNotificationItemsRead(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (!desktopSessionChecked || view === "loading") {
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
          utilityDrawerType={utilityDrawerType}
          onOpenUtilityDrawer={toggleUtilityDrawer}
          onRefresh={refreshCurrentSurface}
          notificationUnreadCount={notificationUnreadCount}
          homeApprovalCount={homeApprovalCount}
          homeMessageCount={homeMessageCount}
        />
        <div
          className={profileStandalone ? "app-frame contextual-shell profile-standalone-shell" : "app-frame contextual-shell"}
          data-sidebar-state={profileStandalone ? "none" : "contextual"}
        >
          {!profileStandalone && (
            <Sidebar
              labels={labels}
              view={view}
              axis={axis}
              setView={navigateToView}
              activeSection={activeSection}
              homeApprovalCount={homeApprovalCount}
              homeMessageCount={homeMessageCount}
              canViewCompanyStatus={canViewCompanyStatus}
              modeReturnTarget={modeReturnTarget}
              onProfile={() => navigateToView("profile")}
              onReturnToWork={returnToWork}
              navigation={contextualNavigation}
            />
          )}
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
                messageItems={homeMessageItems}
                unreadMessageIds={unreadMessageIds}
                onMessageThreadOpen={markMessageRead}
                canViewCompanyStatus={canViewCompanyStatus}
                homeCompanyAccessDenied={homeCompanyAccessDenied}
                onHomeActionCountsChange={setHomeActionCounts}
                refreshSignal={globalRefreshSignal}
              />
            )}
            {view === "clients" && <ClientsSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} refreshSignal={globalRefreshSignal} onNavigate={navigateToView} />}
            {view === "matters" && <MattersSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} refreshSignal={globalRefreshSignal} onNavigateSection={(section) => navigateToView("matters", section)} />}
            {view === "people" && <PeopleHome labels={labels} activeSection={activeSection} liveCtx={liveCtx} />}
            {view === "vault" && <VaultSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} refreshSignal={globalRefreshSignal} />}
            {view === "portal" && <PortalSurface labels={labels} liveCtx={liveCtx} refreshSignal={globalRefreshSignal} />}
            {view === "profile" && <UserProfileSurface liveCtx={liveCtx} onNavigate={navigateToView} onReturnToWork={returnToWork} />}
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
          labels={labels}
          open={Boolean(utilityDrawerType)}
          type={utilityDrawerType}
          notificationUnreadCount={notificationUnreadCount}
          homeApprovalCount={homeApprovalCount}
          homeMessageCount={homeMessageCount}
          notificationItems={notificationItems}
          messageItems={homeMessageItems}
          unreadMessageIds={unreadMessageIds}
          onClose={closeUtilityDrawer}
          onNavigateHomeSection={navigateFromUtilityDrawer}
          onMarkNotificationRead={() => setNotificationItemsRead(true)}
          onMarkMessageRead={markMessageRead}
          onMarkAllMessagesRead={markAllMessagesRead}
        />
      </div>
    </SkinContext.Provider>
  );
}
