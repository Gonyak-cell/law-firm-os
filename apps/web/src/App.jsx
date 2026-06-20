import React from "react";
import { useEffect, useMemo, useState } from "react";
import { copy } from "./i18n.js";
import { navItems } from "./data/nav.js";
import { events, matters } from "./data/mockData.js";
import { GlobalSearch, LoadingSurface, Rail, Sidebar, Topbar } from "./components/Shell.jsx";
import { AuthSurface } from "./components/AuthSurface.jsx";
import { HomeSurface } from "./components/HomeSurface.jsx";
import { ContentSurface } from "./components/ContentSurface.jsx";
import { ClientsSurface } from "./components/ClientsSurface.jsx";
import { MattersSurface } from "./components/MattersSurface.jsx";
import { VaultSurface } from "./components/VaultSurface.jsx";
import { PortalSurface } from "./components/PortalSurface.jsx";
import { ReadinessSurface } from "./components/ReadinessSurface.jsx";
import { OpsSurface } from "./components/OpsSurface.jsx";
import { IntakeSurface } from "./components/IntakeSurface.jsx";
import { FinanceSurface } from "./components/FinanceSurface.jsx";
import { ProfilesSurface } from "./components/ProfilesSurface.jsx";
import { PeopleHome } from "./people/PeopleHome.tsx";
import { AnalyticsSurface } from "./components/AnalyticsSurface.jsx";
import { DashboardsSurface } from "./components/DashboardsSurface.jsx";
import { AskSurface } from "./components/AskSurface.jsx";
import { ExperimentsSurface } from "./components/ExperimentsSurface.jsx";
import { AdminSurface } from "./components/AdminSurface.jsx";
import { ThemeSurface } from "./components/ThemeSurface.jsx";
import { MatterModal } from "./components/MatterModal.jsx";

export function App() {
  const initialParams = new URLSearchParams(window.location.search);
  const routableViews = [...navItems.map((item) => item.id), "loading"];
  const initialLocale = initialParams.get("locale") === "en" ? "en" : "ko";
  const initialTheme = initialParams.get("theme") === "dark" ? "dark" : "light";
  const initialView = routableViews.includes(initialParams.get("view")) ? initialParams.get("view") : "home";
  const initialAuthStep = ["signup", "signupModal", "login", "verify", "password", "org", "reset", "sent", "onboarding"].includes(initialParams.get("authStep"))
    ? initialParams.get("authStep")
    : "signup";
  const initialModal = [
    "save",
    "share",
    "shareInvite",
    "shareHistory",
    "saveChartCard",
    "saveChartSuggest",
    "saveChartReportDropdown",
    "saveChartReportSelected",
    "dashboardSubscribe",
    "dashboardSubscribeSuccess",
    "visualLabelingLaunch",
    "themePreferences",
    "newNavigationTour",
    "chartType",
    "metric",
    "invite",
    "create",
    "confirm",
    "feedback",
    "remove",
    "archive",
    "openingTab",
    "generateChart",
    "annotation",
    "profilePicture",
    "saveCohort",
    "sessionReplay",
    "newExperiment",
    "newExperimentBlank",
    "newExperimentFilled",
    "newExperimentAdvanced",
    "createDashboard",
    "theme",
    "metricUntitled",
    "metricNamed",
    "metricPicker",
    "metricPreview"
  ].includes(initialParams.get("modal"))
    ? initialParams.get("modal")
    : null;
  const initialVariant = [
    "profile",
    "userList",
    "overviewCards",
    "retention",
    "shareToast",
    "template",
    "builder",
    "dataTable",
    "dataTablePicker",
    "feedbackStars",
    "feedbackComment",
    "feedbackFilled",
    "feedbackThanks",
    "expSiteSetup",
    "expVariantsDrawer",
    "expGoalsDraft",
    "expGoalsConfigured",
    "expDelivery",
    "expVisualEditor",
    "expActionModal",
    "expAdding",
    "expDetailSettings",
    "expDetailActivity",
    "expStartModal",
    "darkTemplates",
    "tour"
  ].includes(initialParams.get("variant"))
    ? initialParams.get("variant")
    : "default";
  const initialQuery = initialParams.get("query") ?? "";
  const initialDataMode = initialParams.get("data") === "live" ? "live" : "mock";
  const initialLiveCtx = ["allow", "denied", "review"].includes(initialParams.get("ctx"))
    ? initialParams.get("ctx")
    : "allow";
  const [locale, setLocale] = useState(initialLocale);
  const [theme, setTheme] = useState(initialTheme);
  const [view, setView] = useState(initialView);
  const [modal, setModal] = useState(initialModal);
  const [authStep, setAuthStep] = useState(initialAuthStep);
  const [query, setQuery] = useState(initialQuery);
  const [activeMatterId, setActiveMatterId] = useState(matters[0].id);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const labels = copy[locale];

  useEffect(() => {
    document.documentElement.dataset.locale = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
  }, [locale, theme]);

  const activeMatter = matters.find((matter) => matter.id === activeMatterId) ?? matters[0];
  const activeEvent = events[activeEventIndex];
  const filteredMatters = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return matters;
    return matters.filter((matter) =>
      [matter.id, matter.name, matter.client, matter.owner, matter.phase, matter.status]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [query]);

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
        onCreate={() => setModal("create")}
        onInvite={() => setModal("invite")}
      />
      <div className="app-frame">
        <Rail labels={labels} view={view} setView={setView} />
        <Sidebar labels={labels} view={view} setView={setView} />
        <main className="page-canvas">
          {view === "auth" && (
            <AuthSurface labels={labels} locale={locale} authStep={authStep} setAuthStep={setAuthStep} />
          )}
          {view === "home" && (
            <HomeSurface
              labels={labels}
              variant={initialVariant}
              setView={setView}
              onSave={() => setModal("save")}
              showFunnel={locale === "ko" && !query.trim()}
            />
          )}
          {view === "content" && <ContentSurface labels={labels} />}
          {view === "clients" && (
            <ClientsSurface labels={labels} dataMode={initialDataMode} liveCtx={initialLiveCtx} />
          )}
          {view === "matters" && <MattersSurface labels={labels} liveCtx={initialLiveCtx} />}
          {view === "vault" && <VaultSurface labels={labels} liveCtx={initialLiveCtx} />}
          {view === "portal" && <PortalSurface labels={labels} liveCtx={initialLiveCtx} />}
          {view === "readiness" && <ReadinessSurface labels={labels} liveCtx={initialLiveCtx} />}
          {view === "ops" && <OpsSurface labels={labels} liveCtx={initialLiveCtx} />}
          {view === "intake" && <IntakeSurface labels={labels} liveCtx={initialLiveCtx} />}
          {view === "finance" && <FinanceSurface labels={labels} liveCtx={initialLiveCtx} />}
          {view === "profiles" && (
            <ProfilesSurface
              labels={labels}
              activeMatter={activeMatter}
              activeEvent={activeEvent}
              activeEventIndex={activeEventIndex}
              filteredMatters={filteredMatters}
              setActiveMatterId={setActiveMatterId}
              setActiveEventIndex={setActiveEventIndex}
              variant={initialVariant}
              dataMode={initialDataMode}
              liveCtx={initialLiveCtx}
            />
          )}
          {view === "people" && <PeopleHome labels={labels} />}
          {view === "analytics" && <AnalyticsSurface labels={labels} variant={initialVariant} liveCtx={initialLiveCtx} onSave={() => setModal("save")} />}
          {view === "dashboards" && <DashboardsSurface labels={labels} setView={setView} variant={initialVariant} onCreateDashboard={() => setModal("createDashboard")} />}
          {view === "ask" && <AskSurface labels={labels} variant={initialVariant} liveCtx={initialLiveCtx} />}
          {view === "experiments" && <ExperimentsSurface labels={labels} variant={initialVariant} onConfirm={() => setModal("confirm")} onNewExperiment={() => setModal("newExperiment")} />}
          {view === "admin" && <AdminSurface labels={labels} variant={initialVariant} onInvite={() => setModal("invite")} onProfilePicture={() => setModal("profilePicture")} />}
          {view === "dark" && <ThemeSurface labels={labels} theme={theme} setTheme={setTheme} variant={initialVariant} />}
        </main>
      </div>
      {query && <GlobalSearch labels={labels} query={query} setQuery={setQuery} setView={setView} />}
      {modal && <MatterModal type={modal} labels={labels} onClose={() => setModal(null)} setTheme={setTheme} />}
    </div>
  );
}
