import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { copy } from "./i18n.js";
import { navItems } from "./data/nav.js";
import { globalUtilityViewIds, isGlobalUtilityView, modeExceptionUtilityViewIds, resolveGlobalShortcut } from "./data/globalUtilities.js";
import { GlobalRail, LoadingSurface, Sidebar, UtilityDrawer, buildContextualNavigation, buildNotificationItems } from "./components/Shell.jsx";
import { AuthSurface } from "./components/AuthSurface.jsx";
import { GlobalUtilitySurface } from "./components/GlobalUtilitySurface.jsx";
import { HomeSurface } from "./components/HomeSurface.jsx";
import { ClientsSurface } from "./components/ClientsSurface.jsx";
import { MattersSurface } from "./components/MattersSurface.jsx";
import { VaultSurface } from "./components/VaultSurface.jsx";
import { PortalSurface } from "./components/PortalSurface.jsx";
import { UserProfileSurface } from "./components/UserProfileSurface.jsx";
import { PeopleHome } from "./people/PeopleHome.tsx";
import { resolvePeopleRoute } from "./people/peopleFeatureCatalog.js";
import { readPeopleWebFeatureFlags } from "./people/peopleFeatureFlags.ts";
import { isDesktopRendererLocation, loginLawosApiSession, readLawosApiSession, readLawosSessionEnvelope } from "./data/apiClient.js";
import { canAccessHomeCompany } from "./data/homeAccess.js";
import { canAccessHomeFinanceSection } from "./data/financeAccess.js";
import { fetchHomeMessageItems } from "./data/homeMessages.js";
import { emitHomeMetric } from "./data/homeTelemetry.js";
import { canAdjustLeaveLedger, canApproveLeave, canApproveOvertime, canExecuteLeaveAccrual, canExportLeaveReport, canManageLeavePolicy, canManageLeavePromotion, canSettleLeaveTermination } from "./data/hrxAccess.js";

const productAxisIds = new Set(navItems.map((item) => item.id));
const emptyHomeActionCounts = Object.freeze({ approval: 0, task_late: 0, task_today: 0 });
const homeFallbackSection = "home-dashboard";
const homeFinanceSectionIds = new Set([
  "home-finance-overview",
  "home-finance-monthly",
  "home-finance-clients",
  "home-finance-cashflow",
  "home-finance-time",
  "home-finance-expenses",
  "home-finance-billing",
  "home-finance-ar"
]);
const homeSectionIds = new Set([
  homeFallbackSection,
  ...homeFinanceSectionIds,
  "home-requests",
  "home-requests-leave",
  "home-requests-expenses",
  "home-todo",
  "home-feed",
  "home-calendar",
  "home-meeting-rooms",
  "home-messages",
  "home-esign",
  "home-company"
]);
const vaultFallbackSection = "vault-search-home";
const vaultSectionIds = new Set([
  vaultFallbackSection,
  "vault-search-all",
  "vault-search-documents",
  "vault-search-recent",
  "vault-search-saved"
]);
const vaultLegacySections = Object.freeze({
  "vault-documents": "vault-search-documents",
  "vault-detail": "vault-search-documents",
  "vault-email": "vault-search-home"
});
const defaultModeReturnTarget = Object.freeze({ view: "home", section: "home-dashboard" });
const desktopLocalDefaultPassword = "local-loopback-desktop-session";

function normalizeHomeRoute(route) {
  if (route.view !== "home") return route;
  const section = route.section || homeFallbackSection;
  return { ...route, section: homeSectionIds.has(section) ? section : homeFallbackSection };
}

function normalizeVaultRoute(route) {
  if (route.view !== "vault") return route;
  const section = vaultLegacySections[route.section] ?? route.section ?? vaultFallbackSection;
  return { ...route, section: vaultSectionIds.has(section) ? section : vaultFallbackSection };
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
  if (!isDesktopRendererLocation(location)) return false;
  try {
    return typeof windowLike?.matterSession?.status === "function";
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

export function App() {
  const initialParams = new URLSearchParams(window.location.search);
  const routableViews = ["auth", "home", "loading", ...navItems.map((item) => item.id), ...modeExceptionUtilityViewIds];
  const redirectableViews = [...routableViews, ...globalUtilityViewIds];
  const initialLocale = initialParams.get("locale") === "en" ? "en" : "ko";
  const rawInitialView = redirectableViews.includes(initialParams.get("view")) ? initialParams.get("view") : "home";
  const rawInitialSection = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
  const peopleFeatureFlags = readPeopleWebFeatureFlags();
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
  const [view, setView] = useState(initialView);
  const [liveCtx, setLiveCtx] = useState(initialLiveCtx);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [activeRedirectedFrom, setActiveRedirectedFrom] = useState(resolvedInitialRoute.redirectedFrom ?? null);
  const [canViewCompanyStatus, setCanViewCompanyStatus] = useState(initialCompanyAccess);
  const [homeCompanyAccessDenied, setHomeCompanyAccessDenied] = useState(resolvedInitialRoute.homeCompanyAccessDenied === true);
  const [handoffSplashVisible, setHandoffSplashVisible] = useState(initialHandoffSplash);
  const [authStep, setAuthStep] = useState(initialAuthStep);
  const [query, setQuery] = useState(initialQuery);
  const [contextSidebarOpen, setContextSidebarOpen] = useState(false);
  const [utilityDrawerType, setUtilityDrawerType] = useState(resolvedInitialRoute.openNotifications ? "notifications" : "");
  const [notificationItemsRead, setNotificationItemsRead] = useState(resolvedInitialRoute.openNotifications === true);
  const [homeMessageItems, setHomeMessageItems] = useState([]);
  const [unreadMessageIds, setUnreadMessageIds] = useState(() => new Set());
  const [homeActionCounts, setHomeActionCounts] = useState(emptyHomeActionCounts);
  const [globalRefreshSignal, setGlobalRefreshSignal] = useState(0);
  const [routeRevision, setRouteRevision] = useState(0);
  const readMessageIdsRef = useRef(new Set());
  const [desktopSessionChecked, setDesktopSessionChecked] = useState(() => !isDesktopRenderer());
  const [desktopSessionIdentity, setDesktopSessionIdentity] = useState(null);
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
  const leavePolicyAccess = canManageLeavePolicy(homeCompanyAccessRecords());
  const leaveApprovalAccess = canApproveLeave(homeCompanyAccessRecords());
  const overtimeApprovalAccess = canApproveOvertime(homeCompanyAccessRecords());
  const leaveAccrualAccess = canExecuteLeaveAccrual(homeCompanyAccessRecords());
  const leaveLedgerAccess = canAdjustLeaveLedger(homeCompanyAccessRecords());
  const leaveReportExportAccess = canExportLeaveReport(homeCompanyAccessRecords());
  const leaveTerminationAccess = canSettleLeaveTermination(homeCompanyAccessRecords());
  const leavePromotionAccess = canManageLeavePromotion(homeCompanyAccessRecords());
  const contextualNavigation = useMemo(() => buildContextualNavigation({
    labels,
    financeAccessRecords: homeCompanyAccessRecords(),
    homeApprovalCount,
    homeMessageCount,
    canViewCompanyStatus,
    canManageLeavePolicy: leavePolicyAccess,
    canApproveLeave: leaveApprovalAccess,
    canExecuteLeaveAccrual: leaveAccrualAccess,
    canAdjustLeaveLedger: leaveLedgerAccess,
    canExportLeaveReport: leaveReportExportAccess,
    canSettleLeaveTermination: leaveTerminationAccess,
    canManageLeavePromotion: leavePromotionAccess
  }), [labels, homeApprovalCount, homeMessageCount, canViewCompanyStatus, leavePolicyAccess, leaveApprovalAccess, leaveAccrualAccess, leaveLedgerAccess, leaveReportExportAccess, leaveTerminationAccess, leavePromotionAccess]);
  const notificationItems = useMemo(() => buildNotificationItems({ homeActionCounts, labels }), [homeActionCounts, labels]);
  const notificationSignature = notificationItems.map((item) => item.id).join("|");
  const notificationUnreadCount = notificationItemsRead ? 0 : notificationItems.length;
  const initialRouteWasRedirected = rawInitialView !== initialView || rawInitialSection !== initialSection;
  const initialCurrentVersionWasUnsupported = initialView === "vault" && initialParams.get("current_version") === "all";
  const locationParams = new URLSearchParams(window.location.search);
  const requestedMatterId = locationParams.get("matter_id") ?? "";
  const requestedClientId = locationParams.get("record_id") ?? "";
  const requestedClientTab = locationParams.get("tab") ?? "";
  const requestedInquiryId = locationParams.get("inquiry_id") ?? "";
  const requestedOpportunityId = locationParams.get("opportunity_id") ?? "";
  const requestedOpportunityQuery = locationParams.get("opportunity_query") ?? "";
  const requestedConsultationId = locationParams.get("consultation_id") ?? "";
  const requestedConsultationQuery = locationParams.get("consultation_query") ?? "";
  const requestedDocumentId = locationParams.get("document_id") ?? "";
  const requestedDateFrom = locationParams.get("date_from") ?? "";
  const requestedDateTo = locationParams.get("date_to") ?? "";

  function resolveRoute(nextView, section = "", companyAllowed = canViewCompanyStatus, financeAccessRecords = homeCompanyAccessRecords()) {
    const peopleSection = resolvePeopleRoute(nextView, section, {
      overviewEnabled: peopleFeatureFlags.people_overview
    });
    const resolved = normalizeVaultRoute(normalizeHomeRoute(resolveGlobalShortcut(nextView, peopleSection)));
    if (!routableViews.includes(resolved.view)) return { view: "home", section: homeFallbackSection };
    if (resolved.view === "home" && resolved.section === "home-company" && !companyAllowed) {
      return { ...resolved, section: "home-dashboard", homeCompanyAccessDenied: true };
    }
    if (resolved.view === "home" && homeFinanceSectionIds.has(resolved.section) && !canAccessHomeFinanceSection(financeAccessRecords, resolved.section)) {
      const financeFallback = [...homeFinanceSectionIds].find((financeSection) => canAccessHomeFinanceSection(financeAccessRecords, financeSection));
      return { ...resolved, section: financeFallback ?? homeFallbackSection, homeFinanceAccessDenied: true };
    }
    if (nextView === "people" && section && peopleSection !== section) {
      return { ...resolved, redirectedFrom: { view: nextView, section } };
    }
    return resolved;
  }

  function routeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const rawView = redirectableViews.includes(params.get("view")) ? params.get("view") : "home";
    const nextLiveCtx = ["allow", "denied", "review"].includes(params.get("ctx")) ? params.get("ctx") : "allow";
    const rawSection = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
    const companyAllowed = readHomeCompanyAccess();
    return {
      ...resolveRoute(rawView, rawSection, companyAllowed),
      liveCtx: nextLiveCtx,
      companyAllowed,
      query: params.get("query") ?? "",
      inquiryId: params.get("inquiry_id") ?? "",
      opportunityId: params.get("opportunity_id") ?? "",
      opportunityQuery: params.get("opportunity_query") ?? "",
      consultationId: params.get("consultation_id") ?? "",
      consultationQuery: params.get("consultation_query") ?? "",
      documentId: params.get("document_id") ?? "",
      currentVersionOnly: true,
      dateFrom: params.get("date_from") ?? "",
      dateTo: params.get("date_to") ?? ""
    };
  }

  function routeUrl(nextView, section = "", routeContext = {}) {
    const params = new URLSearchParams(window.location.search);
    params.set("view", nextView);
    params.set("ctx", liveCtx);
    if (routeContext.filter) params.set("filter", routeContext.filter);
    else params.delete("filter");
    if (Object.prototype.hasOwnProperty.call(routeContext, "query")) {
      if (routeContext.query) params.set("query", routeContext.query);
      else params.delete("query");
    } else {
      params.delete("query");
    }
    if (Object.prototype.hasOwnProperty.call(routeContext, "recordId")) {
      if (routeContext.recordId) params.set("record_id", routeContext.recordId);
      else params.delete("record_id");
    } else {
      params.delete("record_id");
    }
    if (Object.prototype.hasOwnProperty.call(routeContext, "inquiryId")) {
      if (routeContext.inquiryId) params.set("inquiry_id", routeContext.inquiryId);
      else params.delete("inquiry_id");
    } else {
      params.delete("inquiry_id");
    }
    if (Object.prototype.hasOwnProperty.call(routeContext, "opportunityId")) {
      if (routeContext.opportunityId) params.set("opportunity_id", routeContext.opportunityId);
      else params.delete("opportunity_id");
    } else {
      params.delete("opportunity_id");
    }
    if (Object.prototype.hasOwnProperty.call(routeContext, "opportunityQuery")) {
      if (routeContext.opportunityQuery) params.set("opportunity_query", routeContext.opportunityQuery);
      else params.delete("opportunity_query");
    } else {
      params.delete("opportunity_query");
    }
    if (Object.prototype.hasOwnProperty.call(routeContext, "consultationId")) {
      if (routeContext.consultationId) params.set("consultation_id", routeContext.consultationId);
      else params.delete("consultation_id");
    } else {
      params.delete("consultation_id");
    }
    if (Object.prototype.hasOwnProperty.call(routeContext, "consultationQuery")) {
      if (routeContext.consultationQuery) params.set("consultation_query", routeContext.consultationQuery);
      else params.delete("consultation_query");
    } else {
      params.delete("consultation_query");
    }
    for (const key of ["month", "tab", "period"]) {
      if (Object.prototype.hasOwnProperty.call(routeContext, key)) {
        if (routeContext[key]) params.set(key, routeContext[key]);
        else params.delete(key);
      } else {
        params.delete(key);
      }
    }
    if (Object.prototype.hasOwnProperty.call(routeContext, "matterId")) {
      if (routeContext.matterId) params.set("matter_id", routeContext.matterId);
      else params.delete("matter_id");
    } else if (!homeFinanceSectionIds.has(section)) {
      params.delete("matter_id");
    }
    if (Object.prototype.hasOwnProperty.call(routeContext, "documentId")) {
      if (routeContext.documentId) params.set("document_id", routeContext.documentId);
      else params.delete("document_id");
    } else {
      params.delete("document_id");
    }
    if (Object.prototype.hasOwnProperty.call(routeContext, "currentVersionOnly")) {
      params.set("current_version", "current");
    } else {
      params.delete("current_version");
    }
    if (routeContext.dateFrom) params.set("date_from", routeContext.dateFrom);
    else params.delete("date_from");
    if (routeContext.dateTo) params.set("date_to", routeContext.dateTo);
    else params.delete("date_to");
    const peopleEmployeeId = typeof routeContext.employee_id === "string" ? routeContext.employee_id : "";
    if (nextView === "people" && /^[A-Za-z0-9._:-]{1,160}$/.test(peopleEmployeeId)) {
      params.set("employee_id", peopleEmployeeId);
    } else {
      params.delete("employee_id");
    }
    const requestedPeriod = typeof routeContext.period === "string" ? routeContext.period : "";
    const peoplePeriod = nextView === "people" && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedPeriod);
    const clientPeriod = nextView === "clients" && /^(?:month|quarter|year)$/.test(requestedPeriod);
    if (peoplePeriod || clientPeriod) {
      params.set("period", requestedPeriod);
    } else {
      params.delete("period");
    }
    if (nextView !== "people" || !["people-overview", "people-members"].includes(section)) {
      params.delete("employee");
    }
    if (nextView === "people" && !["people-overview", "people-members"].includes(section)) {
      params.delete("tab");
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
    setContextSidebarOpen(false);
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
    if (Object.prototype.hasOwnProperty.call(routeContext, "query")) {
      setQuery(String(routeContext.query ?? ""));
    } else if (resolved.view === "vault") {
      setQuery("");
    }
    setView(resolved.view);
    setActiveSection(resolved.section);
    setRouteRevision((value) => value + 1);
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
    setContextSidebarOpen(false);
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
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.skin = "forest";
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
  }, [locale]);

  useEffect(() => {
    if (!isDesktopRenderer()) return undefined;
    let cancelled = false;
    async function verifyDesktopSession() {
      try {
        const status = await window.matterSession.status();
        if (status?.state === "signed_in") {
          if (!cancelled) {
            setDesktopSessionIdentity(status);
            setDesktopSessionChecked(true);
          }
          return;
        }
        const runtime = typeof window.matterSession.runtime === "function" ? await window.matterSession.runtime() : null;
        const localLoginEmail = typeof runtime?.localLoginEmail === "string" ? runtime.localLoginEmail.trim() : "";
        if (isLocalDesktopRuntime(runtime) && localLoginEmail) {
          const result = await loginLawosApiSession({
            email: localLoginEmail,
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
      setDesktopSessionIdentity(null);
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
    if (!contextSidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setContextSidebarOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [contextSidebarOpen]);

  useEffect(() => {
    if (!initialRouteWasRedirected && !initialCurrentVersionWasUnsupported) return;
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
    window.history.replaceState({ view, section: activeSection }, "", routeUrl(view, activeSection, {
      ...resolvedInitialRoute,
      query: initialQuery,
      opportunityId: initialParams.get("opportunity_id") ?? "",
      opportunityQuery: initialParams.get("opportunity_query") ?? "",
      consultationId: initialParams.get("consultation_id") ?? "",
      consultationQuery: initialParams.get("consultation_query") ?? "",
      documentId: initialParams.get("document_id") ?? "",
      currentVersionOnly: true,
      dateFrom: initialParams.get("date_from") ?? "",
      dateTo: initialParams.get("date_to") ?? ""
    }));
  }, []);

  useEffect(() => {
    const onLocationChange = () => {
      const nextRoute = routeFromLocation();
      const nextParams = new URLSearchParams(window.location.search);
      const requestedView = nextParams.get("view") ?? "home";
      const requestedSection = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
      setContextSidebarOpen(false);
      setView(nextRoute.view);
      setLiveCtx(nextRoute.liveCtx);
      setCanViewCompanyStatus(nextRoute.companyAllowed);
      setActiveSection(nextRoute.section);
      setQuery(nextRoute.view === "vault" ? nextRoute.query : "");
      setRouteRevision((value) => value + 1);
      setActiveRedirectedFrom(nextRoute.redirectedFrom ?? null);
      setHomeCompanyAccessDenied(nextRoute.homeCompanyAccessDenied === true);
      if (isReturnableWorkView(nextRoute.view)) {
        setModeReturnTarget(routeTargetFor(nextRoute.view, nextRoute.section));
      }
      setUtilityDrawerType(nextRoute.openNotifications ? "notifications" : "");
      if (nextRoute.openNotifications) setNotificationItemsRead(true);
      if (
        requestedView === "clients" &&
        (nextRoute.view !== requestedView || nextRoute.section !== requestedSection)
      ) {
        window.history.replaceState(
          { view: nextRoute.view, section: nextRoute.section },
          "",
          routeUrl(nextRoute.view, nextRoute.section, nextRoute)
        );
      }
      if (nextRoute.view === "vault" && nextParams.get("current_version") === "all") {
        nextParams.set("current_version", "current");
        window.history.replaceState(
          { view: nextRoute.view, section: nextRoute.section },
          "",
          `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`
        );
      }
    };
    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("hashchange", onLocationChange);
    return () => {
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("hashchange", onLocationChange);
    };
  }, []);

  if (!desktopSessionChecked || view === "loading") {
    return <LoadingSurface labels={labels} locale={locale} setLocale={setLocale} />;
  }

  if (view === "auth" && authStep === "login") {
    return (
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
    );
  }

  return (
    <div className="matter-app">
      <div
        className={[
          "app-frame",
          "contextual-shell",
          profileStandalone ? "profile-standalone-shell" : "",
          contextSidebarOpen ? "context-sidebar-open" : ""
        ].filter(Boolean).join(" ")}
        data-sidebar-state={profileStandalone ? "none" : contextSidebarOpen ? "open" : "contextual"}
      >
        <GlobalRail
          labels={labels}
          query={query}
          setQuery={setQuery}
          axis={axis}
          setView={navigateToView}
          onCreate={() => navigateToView("matters", "matter-opening")}
          utilityDrawerType={utilityDrawerType}
          onOpenUtilityDrawer={toggleUtilityDrawer}
          onRefresh={refreshCurrentSurface}
          notificationUnreadCount={notificationUnreadCount}
          homeApprovalCount={homeApprovalCount}
          homeMessageCount={homeMessageCount}
          liveCtx={liveCtx}
          showContextToggle={!profileStandalone}
          contextSidebarOpen={contextSidebarOpen}
          onToggleContextSidebar={() => setContextSidebarOpen((open) => !open)}
          onSearchOpen={() => setContextSidebarOpen(false)}
        />
        {!profileStandalone && (
          <button
            type="button"
            className="context-sidebar-scrim"
            aria-label="업무 메뉴 닫기"
            onClick={() => setContextSidebarOpen(false)}
          />
        )}
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
            {view === "clients" && (
              <ClientsSurface
                labels={labels}
                liveCtx={liveCtx}
                activeSection={activeSection}
                refreshSignal={globalRefreshSignal}
                onNavigate={navigateToView}
                redirectedFrom={activeRedirectedFrom}
                requestedClientId={requestedClientId}
                requestedClientTab={requestedClientTab}
                requestedInquiryId={requestedInquiryId}
                requestedOpportunityId={requestedOpportunityId}
                requestedOpportunityQuery={requestedOpportunityQuery}
                requestedConsultationId={requestedConsultationId}
                requestedConsultationQuery={requestedConsultationQuery}
                requestedClientRevision={routeRevision}
              />
            )}
            {view === "matters" && <MattersSurface labels={labels} liveCtx={liveCtx} activeSection={activeSection} requestedMatterId={requestedMatterId} requestedMatterRevision={routeRevision} refreshSignal={globalRefreshSignal} onNavigateSection={(section) => navigateToView("matters", section)} />}
            {view === "people" && <PeopleHome labels={labels} activeSection={activeSection} liveCtx={liveCtx} refreshSignal={globalRefreshSignal} featureFlags={peopleFeatureFlags} onNavigate={navigateToView} canManageLeavePolicy={leavePolicyAccess} canApproveLeave={leaveApprovalAccess} canApproveOvertime={overtimeApprovalAccess} canExecuteLeaveAccrual={leaveAccrualAccess} canAdjustLeaveLedger={leaveLedgerAccess} canExportLeaveReport={leaveReportExportAccess} canSettleLeaveTermination={leaveTerminationAccess} canManageLeavePromotion={leavePromotionAccess} />}
            {view === "vault" && (
              <VaultSurface
                labels={labels}
                liveCtx={liveCtx}
                activeSection={activeSection}
                initialQuery={query}
                initialDocumentId={requestedDocumentId}
                initialDateFrom={requestedDateFrom}
                initialDateTo={requestedDateTo}
                refreshSignal={globalRefreshSignal}
                onNavigateSection={(section, routeContext) => navigateToView("vault", section, routeContext)}
              />
            )}
            {view === "portal" && <PortalSurface labels={labels} liveCtx={liveCtx} refreshSignal={globalRefreshSignal} />}
            {view === "profile" && <UserProfileSurface liveCtx={liveCtx} desktopSession={desktopSessionIdentity} onNavigate={navigateToView} onReturnToWork={returnToWork} />}
            {isGlobalUtilityView(view) && modeExceptionUtilityViewIds.includes(view) && (
              <GlobalUtilitySurface
                view={view}
                activeSection={activeSection}
                setView={navigateToView}
              />
            )}
          </main>
      </div>
        {handoffSplashVisible && (
          <LoadingSurface
            labels={labels}
            locale={locale}
            setLocale={setLocale}
            className="post-login-splash"
            message="matter 작업공간을 여는 중"
          />
        )}
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
  );
}
