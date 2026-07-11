import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function readWebFile(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

async function listWebSourceFiles(relativeDir) {
  const absoluteDir = resolve(webRoot, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) return listWebSourceFiles(relativePath);
      return /\.(js|jsx|ts|tsx)$/.test(entry.name) ? [relativePath] : [];
    })
  );
  return files.flat();
}

test("product typography uses bundled Pretendard and SUITE without mono or macOS fallbacks", async () => {
  const stylesSource = await readWebFile("src/styles.css");
  const indexSource = await readWebFile("index.html");
  const logoSource = await readWebFile("src/assets/matter-logo.svg");
  const dashboardListSource = await readWebFile("src/components/DashboardList.jsx");

  assert.match(stylesSource, /--font-heading: "SUITE Matter", "Pretendard Matter", sans-serif;/);
  assert.match(stylesSource, /--font-body: "Pretendard Matter", "SUITE Matter", sans-serif;/);
  assert.doesNotMatch(stylesSource, /IBM Plex Mono|--font-mono|SFMono|Consolas|Liberation Mono|monospace|-apple-system|BlinkMacSystemFont|Segoe UI/);
  assert.doesNotMatch(stylesSource, /font-family:[^;]*(?:Comfortaa|Avenir Next|SF Pro Rounded|Inter)/);
  assert.doesNotMatch(stylesSource, /html\[data-locale="en"\][\s\S]{0,180}Comfortaa/);
  const fontWeights = new Set([...stylesSource.matchAll(/font-weight:\s*([^;]+);/g)].map((match) => match[1].trim()));
  assert.deepEqual(fontWeights, new Set(["400", "600"]));
  assert.match(stylesSource, /Pretendard-SemiBold\.otf[\s\S]{0,80}font-weight: 600/);
  assert.match(stylesSource, /SUITE-SemiBold\.otf[\s\S]{0,80}font-weight: 600/);
  const productRules = stylesSource.replaceAll(/@font-face\s*\{[^}]+\}/gs, "");
  assert.equal([...productRules.matchAll(/font-weight:\s*600;/g)].length, 1);
  assert.match(productRules, /table tbody,[\s\S]{0,300}\.subscribe-table-row \*[\s\S]{0,40}font-weight: 400;/);
  assert.match(productRules, /\.data-table thead th,[\s\S]{0,500}\.subscribe-table-head \*[\s\S]{0,40}font-weight: 600;/);
  assert.match(stylesSource, /\.dashboard-record-row,[\s\S]{0,80}\.dashboard-record-row \*[\s\S]{0,40}font-weight: 400;/);
  assert.match(stylesSource, /\.dashboard-record-row \{[\s\S]{0,260}grid-template-columns:[\s\S]{0,180}18px;/);
  assert.match(stylesSource, /\.dashboard-record-copy \{[\s\S]{0,80}display: contents;/);
  assert.match(dashboardListSource, /function uniqueDashboardMeta\(title, meta\)/);
  assert.match(dashboardListSource, /uniqueParts\.join\(" \/ "\) \|\| null/);
  assert.match(stylesSource, /font-synthesis:\s*none/);
  assert.match(stylesSource, /\.property strong \{[\s\S]{0,140}font-weight: 400;/);
  assert.match(stylesSource, /\.matter-selectable-record-button strong \{[\s\S]{0,100}font-weight: 400;/);
  assert.match(stylesSource, /html\[data-skin="forest"\] \.forest-hero-stat strong,[\s\S]{0,520}font-family: var\(--font-body\);[\s\S]{0,80}font-weight: 400;/);
  assert.doesNotMatch(indexSource, /fonts\.googleapis|fonts\.gstatic|Comfortaa/);
  assert.match(logoSource, /font-family="SUITE Matter, Pretendard Matter, sans-serif"/);
  assert.doesNotMatch(logoSource, /Avenir Next|Comfortaa|Inter|Arial|font-weight="300"/);
});

test("post-login product UI routes only Client, Matter, People, Vault, and Portal", async () => {
  const navSource = await readWebFile("src/data/nav.js");
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const globalUtilitySource = await readWebFile("src/data/globalUtilities.js");
  const globalUtilitySurfaceSource = await readWebFile("src/components/GlobalUtilitySurface.jsx");
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");
  const clientsSource = await readWebFile("src/components/ClientsSurface.jsx");
  const mattersSource = await readWebFile("src/components/MattersSurface.jsx");
  const userProfileSource = await readWebFile("src/components/UserProfileSurface.jsx");
  const employeeProfileSource = await readWebFile("src/people/employees/EmployeeProfile.tsx");
  const peopleCatalogSource = await readWebFile("src/people/peopleFeatureCatalog.js");
  const i18nSource = await readWebFile("src/i18n.js");
  const peopleNavigationSource = `${shellSource}\n${peopleCatalogSource}`;
  const productAxisStart = shellSource.indexOf("function ProductAxisNav");
  const productAxisEnd = shellSource.indexOf("export function buildNotificationItems", productAxisStart);
  const productAxisSource = shellSource.slice(productAxisStart, productAxisEnd);
  const homeSidebarStart = shellSource.indexOf("function homeSidebarMeta");
  const clientsSidebarStart = shellSource.indexOf("const sidebarMeta", homeSidebarStart);
  const homeSidebarSource = shellSource.slice(homeSidebarStart, clientsSidebarStart);
  const componentFiles = await listWebSourceFiles("src/components");
  const canonicalViews = ["clients", "matters", "people", "vault", "portal"];
  const removedViews = [
    "content",
    "readiness",
    "ops",
    "intake",
    "finance",
    "profiles",
    "analytics",
    "dashboards",
    "ask",
    "experiments",
    "admin",
    "dark"
  ];

  for (const view of canonicalViews) {
    assert.match(navSource, new RegExp(`id: "${view}"`));
    assert.match(appSource, new RegExp(`view === "${view}"`));
  }
  assert.match(navSource, /id: "people", label: "People"/);
  assert.match(shellSource, /aria-label="Home Client Matter People Vault Portal"/);
  assert.match(appSource, /view === "home"/);
  assert.match(appSource, /view === "auth"/);
  for (const view of removedViews) {
    assert.doesNotMatch(navSource, new RegExp(`id: "${view}"`));
    assert.doesNotMatch(appSource, new RegExp(`view === "${view}"`));
  }
  for (const removedSurface of [
    "src/components/AdminSurface.jsx",
    "src/components/ContentSurface.jsx",
    "src/components/DashboardsSurface.jsx",
    "src/components/ExperimentsSurface.jsx",
    "src/components/ThemeSurface.jsx"
  ]) {
    assert.equal(componentFiles.includes(removedSurface), false);
  }
  assert.match(shellSource, /data-product-axis-nav="top-header"/);
  assert.match(shellSource, /navItems\.map/);
  assert.doesNotMatch(productAxisSource, /<Icon\s+size=/);
  assert.match(appSource, /function navigateToView/);
  assert.match(appSource, /export function resolveAxis/);
  assert.match(appSource, /const routableViews = \["auth", "home", "loading", \.\.\.navItems\.map\(\(item\) => item\.id\), \.\.\.modeExceptionUtilityViewIds\]/);
  assert.match(appSource, /const redirectableViews = \[\.\.\.routableViews, \.\.\.globalUtilityViewIds\]/);
  assert.match(appSource, /window\.history\.pushState/);
  assert.match(appSource, /window\.history\.replaceState/);
  assert.doesNotMatch(appSource, /scrollIntoView/);
  assert.match(shellSource, /activeSection/);
  assert.match(shellSource, /ProductAxisNav axis=\{axis\} setView=\{setView\} labels=\{labels\}/);
  assert.match(shellSource, /data-context-sidebar=\{axis\}/);
  assert.doesNotMatch(shellSource, /data-global-sidebar-nav="home-only"/);
  assert.doesNotMatch(shellSource, /aria-label="Home 빠른 메뉴"/);
  assert.doesNotMatch(shellSource, />공통<|aria-label="공통 메뉴"/);
  assert.doesNotMatch(shellSource, /"sidebar-item global-sidebar-item/);
  assert.match(shellSource, /<span className="sidebar-icon"><Icon size=\{16\} \/><\/span>/);
  assert.match(shellSource, /function homeSidebarMeta\(labels = \{\}, financeAccessRecords = \[\]\)/);
  for (const key of ["homeDashboardLabel", "homeApprovalPendingLabel", "homeTodoSidebarLabel", "homeFeedSidebarLabel", "homeCalendarSidebarLabel", "homeMessagesLabel", "homeEsignLabel", "homeCompanyLabel", "homeDataImportLabel", "homeSettingsLabel"]) {
    assert.match(homeSidebarSource, new RegExp(`shellLabel\\(labels, "${key}"`));
    assert.match(i18nSource, new RegExp(`${key}:`));
  }
  assert.match(homeSidebarSource, /homeApprovalPendingLabel", "승인 대기"/);
  assert.doesNotMatch(homeSidebarSource, /homeRequestsLabel", "승인 요청"[\s\S]{0,80}section: "home-requests"/);
  assert.doesNotMatch(homeSidebarSource, /최근작업|notifications-center|label: "알림"/);
  assert.match(homeSidebarSource, /view: "home", section: "home-dashboard"/);
  assert.match(homeSidebarSource, /view: "home", section: "home-todo"/);
  assert.match(homeSidebarSource, /view: "home", section: "home-feed"/);
  assert.match(homeSidebarSource, /view: "home", section: "home-calendar"/);
  assert.match(homeSidebarSource, /view: "home", section: "home-messages"/);
  assert.match(homeSidebarSource, /view: "home", section: "home-requests"/);
  assert.match(homeSidebarSource, /view: "home", section: "home-esign"/);
  assert.match(homeSidebarSource, /view: "home", section: "home-company"/);
  assert.match(homeSidebarSource, /view: "data-import", section: "data-import-client"/);
  assert.match(appSource, /globalUtilityViewIds/);
  assert.match(globalUtilitySource, /modeExceptionUtilityViewIds = \["settings", "data-import", "profile"\]/);
  assert.match(appSource, /resolveGlobalShortcut/);
  assert.match(globalUtilitySource, /"reports:reports-home-dashboard", route\("home", "home-dashboard"\)/);
  assert.match(globalUtilitySource, /view === "messages"\) return route\("home", "home-messages"/);
  assert.match(globalUtilitySource, /view === "requests"\) return route\("home", "home-requests"/);
  assert.match(globalUtilitySource, /view === "esign"\) return route\("home", "home-esign"/);
  assert.match(globalUtilitySource, /view === "reports"\) return route\("home", "home-company"/);
  assert.match(globalUtilitySource, /view === "notifications"\) return route\("home", "home-dashboard"/);
  assert.match(shellSource, /export function buildContextualNavigation/);
  assert.match(shellSource, /modeExceptionNavigation/);
  assert.match(shellSource, /globalUtilityCatalog[\s\S]{0,120}\.filter\(\(utility\) => modeExceptionUtilityViewIds\.includes\(utility\.id\)\)/);
  assert.doesNotMatch(shellSource, /\.\.\.globalSubnav/);
  assert.match(globalUtilitySource, /data-import-client/);
  assert.doesNotMatch(globalUtilitySource, /data-import-matter|사건 자료 가져오기/);
  assert.match(globalUtilitySource, /messages-matter-channel/);
  assert.match(globalUtilitySurfaceSource, /data-global-preview-marker="true"/);
  assert.match(globalUtilitySurfaceSource, />미리보기</);
  for (const label of ["메시지", "알림", "요청함", "보고서", "설정", "전자계약"]) {
    assert.match(globalUtilitySource, new RegExp(`label: "${label}"`));
  }
  assert.doesNotMatch(globalUtilitySource, /label: "Messages"|label: "Notifications"|label: "Requests"|label: "Reports"|label: "Settings"|label: "E-Sign"/);
  assert.match(shellSource, /client-import/);
  for (const label of ["관리", "대시보드", "목록", "계정 정보", "담당자", "Opportunity", "상담", "접촉 이력", "제안", "관계", "이해상충 확인", "청구", "리포트", "데이터", "데이터 가져오기", "설정"]) {
    assert.match(shellSource, new RegExp(label));
  }
  assert.doesNotMatch(shellSource, /Client 관리|Client 목록|Client 계정|Client 관계|Client 리포트|Client 데이터|Client 설정/);
  for (const label of ["사건 운영", "대시보드", "사건 목록", "사건 문서", "신규 사건", "수임 진행", "종결 처리", "보관 사건", "업무 진행", "업무 보드", "할 일", "외부 일정", "검토 의견", "소통", "메시지", "회의 기록", "공지", "팀", "의뢰인 요청", "리포트", "사건 리포트", "검색", "사건 위험", "감사 이력", "연동", "사건 설정"]) {
    assert.match(shellSource, new RegExp(label));
  }
  assert.doesNotMatch(`${shellSource}\n${globalUtilitySource}\n${homeSource}\n${clientsSource}\n${mattersSource}\n${userProfileSource}\n${employeeProfileSource}\n${i18nSource}`, /·/);
  assert.match(shellSource, /peopleNavigationGroups/);
  assert.match(shellSource, /peopleSidebarGroups/);
  assert.match(shellSource, /fetchUserProfile/);
  assert.match(shellSource, /readLawosSessionEnvelope/);
  assert.match(shellSource, /sidebarSessionProfile/);
  assert.match(shellSource, /readDesktopMatterSessionStatus/);
  assert.match(shellSource, /genericSessionDisplayNames/);
  assert.match(shellSource, /shellSessionDisplayName/);
  assert.doesNotMatch(shellSource, /forestUserInitial = forestUserName\.trim\(\)\.slice\(0, 1\) \|\| "서"/);
  assert.match(peopleNavigationSource, /people-members/);
  assert.match(peopleNavigationSource, /people-org-chart/);
  assert.match(peopleNavigationSource, /people-documents/);
  assert.match(peopleNavigationSource, /people-certificates/);
  assert.match(peopleNavigationSource, /people-leave/);
  assert.match(peopleNavigationSource, /people-approvals/);
  assert.match(peopleNavigationSource, /people-recruiting/);
  assert.match(peopleNavigationSource, /people-lifecycle/);
  assert.match(peopleNavigationSource, /people-policy/);
  assert.match(peopleNavigationSource, /people-audit/);
  assert.match(peopleNavigationSource, /people-risk/);
  assert.match(peopleNavigationSource, /people-admin/);
  assert.match(peopleNavigationSource, /people-work-schedule-external/);
  assert.doesNotMatch(appSource, /MatterModal|initialVariant|initialDataMode|setModal|mockData/);
});

test("Stage 1 IA redirects old global utility URLs into stable product axes", async () => {
  const { legacyGlobalRoutes, modeExceptionUtilityViewIds, resolveGlobalShortcut } = await import(pathToFileURL(resolve(webRoot, "src/data/globalUtilities.js")).href);

  assert.deepEqual(modeExceptionUtilityViewIds, ["settings", "data-import", "profile"]);
  assert.deepEqual(resolveGlobalShortcut("home", ""), { view: "home", section: "home-dashboard" });
  assert.deepEqual(resolveGlobalShortcut("home", "home-recent"), { view: "home", section: "home-dashboard" });
  assert.deepEqual(resolveGlobalShortcut("reports", "reports-home-dashboard"), { view: "home", section: "home-dashboard" });
  assert.equal(resolveGlobalShortcut("messages", "messages-matter-channel").view, "home");
  assert.equal(resolveGlobalShortcut("messages", "messages-matter-channel").section, "home-messages");
  assert.equal(resolveGlobalShortcut("requests", "requests-review-inbox").section, "home-requests");
  assert.equal(resolveGlobalShortcut("esign", "esign-send").section, "home-esign");
  assert.equal(resolveGlobalShortcut("reports", "reports-matter-analytics").section, "home-company");
  const notificationRoute = resolveGlobalShortcut("notifications", "notifications-center");
  assert.equal(notificationRoute.view, "home");
  assert.equal(notificationRoute.section, "home-dashboard");
  assert.equal(notificationRoute.openNotifications, true);
  assert.equal(resolveGlobalShortcut("settings", "settings-company").view, "settings");
  assert.equal(resolveGlobalShortcut("data-import", "data-import-client").view, "data-import");
  assert.equal(resolveGlobalShortcut("home", "home-review").section, "home-requests");
  assert.ok(legacyGlobalRoutes.length > 30);

  for (const legacyRoute of legacyGlobalRoutes) {
    const routeName = `${legacyRoute.view}:${legacyRoute.section}`;
    const resolved = resolveGlobalShortcut(legacyRoute.view, legacyRoute.section);
    const expected = resolveGlobalShortcut(legacyRoute.targetView, legacyRoute.targetSection);
    assert.equal(resolved.view, expected.view, `${routeName} view`);
    assert.equal(resolved.section, expected.section, `${routeName} section`);
  }
});

test("WP-FIN-1 registers the Home finance group and context-preserving legacy routes", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");
  const globalUtilitySource = await readWebFile("src/data/globalUtilities.js");

  const sections = [
    "home-finance-overview",
    "home-finance-monthly",
    "home-finance-clients",
    "home-finance-time",
    "home-finance-expenses",
    "home-finance-billing",
    "home-finance-ar"
  ];
  for (const section of sections) {
    assert.match(appSource, new RegExp(`"${section}"`));
    assert.match(shellSource, new RegExp(`section: "${section}"`));
    assert.match(homeSource, new RegExp(`"${section}"`));
  }
  assert.match(shellSource, /groupId: "home-finance"/);
  assert.match(shellSource, /data-sidebar-group=\{stableGroupId\}/);
  assert.match(globalUtilitySource, /status: "integrated-home"/);
  assert.match(globalUtilitySource, /"matters:matter-approvals", route\("home", "home-requests"[^\n]*filter: "finance"/);
  assert.match(globalUtilitySource, /"matters:matter-time", route\("home", "home-finance-time"/);
  assert.match(globalUtilitySource, /"matters:matter-expenses", route\("home", "home-finance-expenses"/);
  assert.match(globalUtilitySource, /"matters:matter-billing", route\("home", "home-finance-billing"/);
  assert.match(globalUtilitySource, /"matters:matter-ar", route\("home", "home-finance-ar"/);
  assert.match(appSource, /routeUrl\(resolved\.view, resolved\.section, \{ \.\.\.resolved, \.\.\.routeContext \}\)/);
  assert.match(appSource, /params\.set\("matter_id", routeContext\.matterId\)/);
  assert.match(appSource, /params\.set\("filter", routeContext\.filter\)/);
  assert.match(appSource, /homeFinanceSectionIds\.has\(resolved\.section\) && !canAccessHomeFinanceSection\(financeAccessRecords, resolved\.section\)/);
  assert.match(appSource, /financeFallback \?\? homeFallbackSection/);
  assert.match(homeSource, /data-home-finance-route-contract=\{activeHomeSection\}/);
  for (const legacyMatterSection of ["matter-approvals", "matter-time", "matter-expenses", "matter-billing", "matter-ar"]) {
    assert.doesNotMatch(shellSource, new RegExp(`section: "${legacyMatterSection}"`));
  }
});

test("WP-FIN-3 mounts server-reconciled finance views with guarded states and responsive filters", async () => {
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");
  const financeSource = await readWebFile("src/components/FinanceSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");
  const stylesSource = await readWebFile("src/styles.css");

  assert.match(homeSource, /<FinanceSurface liveCtx=\{liveCtx\} activeSection=\{activeHomeSection\}/);
  for (const name of ["fetchAnalyticsFinanceOverview", "fetchAnalyticsFinanceMonthly", "fetchAnalyticsFinanceClients"]) {
    assert.match(financeSource, new RegExp(name));
    assert.match(apiClientSource, new RegExp(`export function ${name}`));
  }
  assert.doesNotMatch(financeSource, /fetchFinanceInvoices|fetchFinanceTimeEntries|fetchFinanceArAging/);
  for (const state of ["loading", "error", "denied", "review", "empty"]) {
    assert.match(financeSource, new RegExp(state));
  }
  assert.match(financeSource, /data-home-finance-summary="true"/);
  assert.match(financeSource, /data-home-finance-monthly-table="true"/);
  assert.match(financeSource, /data-home-finance-client-table="true"/);
  assert.match(financeSource, /writeFinanceFilters/);
  assert.match(apiClientSource, /tenant_id: FINANCE_TENANT_ID/);
  assert.match(stylesSource, /\.home-finance-table-wrap[\s\S]*overflow-x:\s*auto/);
  assert.match(stylesSource, /@media \(max-width:\s*720px\)[\s\S]*\.home-finance-filterbar[\s\S]*grid-template-columns:\s*1fr/);
});

test("table and selectable-list headers use the light gray header tokens", async () => {
  const stylesSource = await readWebFile("src/styles.css");

  assert.match(stylesSource, /--am-table-header-bg:\s*#EEF2F6/);
  assert.match(stylesSource, /--am-table-header-text:\s*#202428/);
  for (const selector of [
    ".data-table th",
    ".compact-table th",
    ".share-history-state th",
    ".subscribe-table-head",
    ".client-selectable-header",
    ".matter-selectable-header",
    ".hr-roster-table th",
    ".hr-org-history th",
    ".home-finance-table-wrap thead th"
  ]) {
    assert.match(stylesSource, new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?\\{[\\s\\S]*?background:\\s*var\\(--am-table-header-bg\\)`));
  }
});

test("WP-FIN-4 reuses the Matter charge panel for Home finance operations", async () => {
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");
  const financeSource = await readWebFile("src/components/FinanceSurface.jsx");
  const operationsSource = await readWebFile("src/components/HomeFinanceOperations.jsx");
  const mattersSource = await readWebFile("src/components/MattersSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(homeSource, /if \(homeFinanceSectionIds\.has\(activeHomeSection\)\)/);
  assert.match(financeSource, /<HomeFinanceOperations liveCtx=\{liveCtx\} activeSection=\{activeSection\}/);
  assert.match(operationsSource, /import \{ ChargePanel \} from "\.\/MattersSurface\.jsx"/);
  assert.match(operationsSource, /<ChargePanel/);
  assert.doesNotMatch(operationsSource, /function ChargePanel|function ChargeActionPanel/);
  assert.match(mattersSource, /export function ChargePanel/);
  assert.match(mattersSource, /data-finance-operation-mode=\{operationMode\}/);
  assert.match(mattersSource, /expenseDate: todayWorkDate\(\)/);
  assert.match(mattersSource, /disbursedAt: todayWorkDate\(\)/);
  assert.match(apiClientSource, /expense_date: expenseDate/);
  assert.match(apiClientSource, /disbursed_at: disbursedAt/);
});

test("matter startup branding uses shared splash and brand constants", async () => {
  const brandSource = await readWebFile("src/brand/brand.js");
  const splashSource = await readWebFile("src/components/MatterSplash.jsx");
  const logoSource = await readWebFile("src/components/MatterLogo.jsx");
  const markSource = await readWebFile("src/assets/matter-mark.svg");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const authSource = await readWebFile("src/components/AuthSurface.jsx");
  const i18nSource = await readWebFile("src/i18n.js");

  assert.match(brandSource, /PRODUCT_BRAND\s*=\s*"matter"/);
  assert.match(brandSource, /UI_BRAND\s*=\s*"matter"/);
  assert.match(splashSource, /matter-mark\.svg/);
  assert.match(splashSource, /matter-splash-mark/);
  assert.match(splashSource, /aria-label=\{UI_BRAND\}/);
  assert.match(markSource, /docs\/ui-reference\/brand\/matter-by-amic-logo\.png/);
  assert.match(markSource, /data:image\/png;base64/);
  assert.doesNotMatch(markSource, /<circle\b/);
  assert.doesNotMatch(logoSource, /amic-law|matter-byline|BRAND_BYLINE|BRAND_ORGANIZATION/);
  assert.match(shellSource, /<MatterSplash \/>/);
  assert.match(authSource, /<MatterSplash compact className="auth-splash" \/>/);
  assert.match(i18nSource, /PRODUCT_BRAND/);
  assert.match(i18nSource, /Client Matter People Vault/);
  assert.match(i18nSource, /signupPreviewNotice/);
  for (const removedKey of ["content", "dashboards", "experiments", "adminTitle", "billingTitle", "themeTitle"]) {
    assert.doesNotMatch(i18nSource, new RegExp(`${removedKey}:`));
  }
  assert.doesNotMatch(i18nSource, /Project Atlas/);
});

test("desktop post-login route skips repeated logo splash before five-axis contextual shell", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");
  const clientsSource = await readWebFile("src/components/ClientsSurface.jsx");
  const forestHeroSource = await readWebFile("src/components/ForestHero.jsx");
  const stylesSource = await readWebFile("src/styles.css");
  const desktopSource = await readFile(resolve(webRoot, "../desktop/src/renderer/offline.html"), "utf8");

  assert.match(desktopSource, /web\/index\.html\?desktop=1&view=home&data=live&ctx=allow&splash=0/);
  assert.match(desktopSource, /LAWOS_SESSION_ENVELOPE_STORAGE_KEY = "lawos\.session\.envelope"/);
  assert.match(desktopSource, /LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION = "law-firm-os\.desktop-web-session-envelope\.v0\.1"/);
  assert.match(desktopSource, /function desktopSessionEnvelope/);
  assert.match(desktopSource, /actor_ref: actorRef/);
  assert.match(desktopSource, /tenant_refs: \{[\s\S]*default: tenantRef[\s\S]*client: tenantRef[\s\S]*matter: tenantRef[\s\S]*vault: tenantRef/);
  assert.match(desktopSource, /desktop_session_ref/);
  assert.match(desktopSource, /desktop_actor_ref/);
  assert.match(desktopSource, /desktop_tenant_ref/);
  assert.doesNotMatch(desktopSource, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(desktopSource, /access_token|refresh_token|id_token|raw_cookie|Bearer/);
  assert.match(desktopSource, /data-launch-logo-flow/);
  assert.match(desktopSource, /data-logo-intro="pending"/);
  assert.match(desktopSource, /claimLogoIntro/);
  assert.match(desktopSource, /\.auth-stage[\s\S]*display:\s*flex[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center/);
  assert.match(desktopSource, /body\[data-logo-intro="play"\] \.brand-intro[\s\S]*amicLawIntroLayer 3200ms linear/);
  assert.match(desktopSource, /body\[data-logo-intro="play"\] \.brand-intro-logo[\s\S]*amicLawLockupIntro 3200ms linear/);
  assert.match(desktopSource, /body\[data-logo-intro="play"\] \.brand-intro-a[\s\S]*amicLawAIntro 3200ms linear/);
  assert.match(desktopSource, /body\[data-logo-intro="play"\] \.brand-intro-mic[\s\S]*amicLawMicIntro 3200ms linear/);
  assert.match(desktopSource, /body\[data-login-skin="forest"\]\[data-logo-intro="play"\] \.matter-login-photo-panel[\s\S]*forestPhotoIn 520ms var\(--ease-brand-dock\) 2780ms/);
  assert.match(desktopSource, /body:not\(\[data-login-skin="forest"\]\)\[data-logo-intro="play"\] \.brand-lockup[\s\S]*brandLoginIntro 1900ms/);
  assert.match(desktopSource, /body:not\(\[data-login-skin="forest"\]\)\[data-logo-intro="play"\] \.matter-word-wrap[\s\S]*matterWordLoginReveal 1900ms/);
  assert.match(desktopSource, /productUiTarget\(session, \{ splash: false \}\)/);
  assert.match(desktopSource, /setMatterWordTarget/);
  assert.match(desktopSource, /@keyframes matterWordLoginReveal[\s\S]*width:\s*var\(--word-target\)/);
  assert.match(desktopSource, /<span class="matter-word">[\s\S]*<span>m<\/span><span>a<\/span><span>t<\/span><span>t<\/span><span>e<\/span><span>r<\/span>/);
  assert.match(desktopSource, /\.\.\/\.\.\/build\/icon\.png/);
  assert.doesNotMatch(desktopSource, /icon-source-mark\.png/);
  assert.doesNotMatch(desktopSource, /logo-handoff-active/);
  assert.doesNotMatch(desktopSource, /logoDockToHeader/);
  assert.doesNotMatch(desktopSource, /launch-splash/);
  assert.doesNotMatch(desktopSource, /matter-bar/);
  assert.doesNotMatch(desktopSource, /matter-dot/);
  assert.match(appSource, /initialHandoffSplash/);
  assert.match(appSource, /post-login-splash/);
  assert.match(stylesSource, /\.loading-stage\.post-login-splash strong/);
  assert.match(stylesSource, /\.loading-stage\.post-login-splash \.matter-splash[\s\S]*min-height:\s*auto/);
  assert.match(stylesSource, /@keyframes post-login-logo-dock/);
  assert.match(shellSource, /data-logo-dock-target="top-left"/);
  assert.match(stylesSource, /--matter-splash-word-width/);
  assert.match(stylesSource, /@keyframes matter-mark-in[\s\S]*translateX\(calc\(\(var\(--matter-splash-word-width\) \+ var\(--matter-splash-gap\)\) \/ 2\)\)/);
  assert.match(stylesSource, /@keyframes matter-word-reveal[\s\S]*clip-path:\s*inset\(0 0 0 0\)/);
  assert.match(appSource, /data-sidebar-state=\{profileStandalone \? "none" : "contextual"\}/);
  assert.match(appSource, /profile-standalone-shell/);
  assert.match(appSource, /utilityDrawerType/);
  assert.match(appSource, /<UtilityDrawer/);
  assert.match(shellSource, /data-product-axis-nav="top-header"/);
  assert.match(shellSource, /data-product-axis=\{id\}/);
  assert.match(shellSource, /aria-current=\{axis === id \? "page" : undefined\}/);
  assert.match(shellSource, /data-matter-logo-flow/);
  assert.match(shellSource, /data-context-sidebar=\{axis\}/);
  assert.match(shellSource, /topbar-brand/);
  assert.match(shellSource, /sidebar-workspace-actions/);
  assert.match(shellSource, /data-sidebar-utility={label}/);
  assert.match(navSource, /id: "home"/);
  for (const axis of ["home", "clients", "matters", "people", "vault"]) {
    assert.match(navSource, new RegExp(`id: "${axis}"`));
  }
  assert.match(shellSource, /<MatterLogo \/>/);
  assert.doesNotMatch(shellSource, /export function Rail|<nav className="rail-nav"|nav-toggle|sidebarExpanded/);
  assert.doesNotMatch(appSource, /<Rail \/>|sidebarExpanded|initialSidebarExpanded/);
  assert.match(homeSource, /data-home-dashboard-shell="true"/);
  assert.match(homeSource, /data-home-dashboard-grid="true"/);
  assert.match(homeSource, /data-active-home-section=\{activeHomeSection\}/);
  assert.doesNotMatch(homeSource, /widgetId="approval"/);
  assert.match(homeSource, /widgetId="todo"/);
  assert.match(homeSource, /widgetId="calendar"/);
  assert.match(homeSource, /widgetId="feed"/);
  assert.doesNotMatch(homeSource, /widgetId="system"|home-dashboard-system/);
  assert.match(homeSource, /homeWidgetTodoTitle/);
  assert.match(homeSource, /homeWidgetCalendarTitle/);
  assert.match(homeSource, /homeWidgetFeedTitle/);
  assert.doesNotMatch(homeSource, /homeWidgetSystemTitle/);
  assert.doesNotMatch(homeSource, /home-dashboard-card-icon|<FileSignature|meta=\{`\$\{actionInbox\.counts\.approval\}/);
  assert.doesNotMatch(homeSource, /dataPrefix="approval-widget"/);
  assert.match(homeSource, /aria-label=\{viewAllLabel\}/);
  assert.match(homeSource, /dataPrefix="requests-direction" variant="underline"/);
  assert.match(stylesSource, /\.home-section-tabs\.underline[\s\S]*background:\s*transparent/);
  assert.match(stylesSource, /\.home-section-tabs\.underline button\.active::after[\s\S]*background:\s*var\(--am-success\)/);
  assert.match(stylesSource, /\.home-feed-tabs\s*\{[\s\S]*background:\s*transparent/);
  assert.match(stylesSource, /\.home-feed-tabs button::after[\s\S]*height:\s*3px/);
  assert.match(stylesSource, /\.home-feed-tabs button\.active::after[\s\S]*background:\s*var\(--am-success\)/);
  assert.match(homeSource, /블로터, 법률신문, 딜사이트, 인베스트조선/);
  assert.match(stylesSource, /grid-template-areas:\s*"recent recent rail"\s*"todo intake rail"\s*"monthly feed feed"/);
  for (const section of ["recent-work", "today-todo", "monthly-sales", "new-engagements", "feed", "calendar"]) {
    assert.match(homeSource, new RegExp(`section="${section}"`));
  }
  assert.match(stylesSource, /\.home-dashboard-rail\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/);
  assert.match(stylesSource, /\.home-dashboard-rail > \.home-dashboard-card:first-child\s*\{[\s\S]*flex:\s*1/);
  assert.match(stylesSource, /@media \(max-width:\s*1180px\)[\s\S]*\.home-dashboard-rail\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/);
  assert.match(homeSource, /data-home-ops-queue="true"/);
  assert.match(homeSource, /fetchUserProfile/);
  assert.match(homeSource, /fetchHomeActionInbox/);
  assert.match(homeSource, /fetchHomeAgenda/);
  assert.match(homeSource, /fetchHomeFeed/);
  assert.match(homeSource, /readHomeMatterSessionStatus/);
  assert.match(homeSource, /genericSessionDisplayNames/);
  assert.match(homeSource, /sessionProfessionalLabel/);
  assert.match(homeSource, /sessionGreeting\(sessionProfile\.profileUser, sessionProfile\.desktopStatus\)/);
  assert.doesNotMatch(homeSource, /sessionText\(session\?\.user_id\)\s*\|\|/);
  assert.doesNotMatch(homeSource, /sessionText\(session\?\.actor_ref\)\s*\|\|/);
  assert.doesNotMatch(homeSource, /endpoint-strip|endpoint coverage|\$\{endpoint\}/);
  assert.doesNotMatch(homeSource, /MetricCard|metric-grid|Product axes|Record views|Protected actions|Release status|visible records|record views|safeguards|capability-card|capability-counts|boundary-ledger/);
  assert.doesNotMatch(homeSource, /home-recent|WorkAreaRow|QueueRow|오늘의 운영 대기열|Matter 작업 큐|실패한 동기화/);
  assert.doesNotMatch(stylesSource, /metric-grid|clients-metric-grid|people-metric-grid|command-center-grid|pill-blue|pill-green|recipient-chip|report-chip/);
  assert.match(stylesSource, /\.app-frame[\s\S]*grid-template-columns:\s*var\(--am-sidebar-width\) minmax\(0, 1fr\)/);
  assert.match(stylesSource, /--am-topbar-height:\s*52px/);
  assert.match(stylesSource, /\.topbar-brand/);
  assert.match(stylesSource, /\.top-axis-item[\s\S]*min-width:\s*96px/);
  assert.match(stylesSource, /@media \(max-width:\s*1180px\)[\s\S]*\.top-axis-item[\s\S]*min-width:\s*84px/);
  assert.match(stylesSource, /\.topbar \.global-search[\s\S]*height:\s*38px/);
  assert.match(stylesSource, /html\[data-skin="forest"\] \.forest-hero \{[\s\S]*min-height:\s*108px/);
  assert.match(stylesSource, /html\[data-skin="forest"\] \.forest-hero:not\(\.forest-hero-with-stats\):not\(\.forest-hero-with-actions\) \{[\s\S]*min-height:\s*88px/);
  assert.match(forestHeroSource, /actions = null/);
  assert.match(forestHeroSource, /forest-hero-with-actions/);
  assert.match(shellSource, /data-topbar-refresh-trigger="true"/);
  assert.match(shellSource, /<RefreshCw size=\{17\} \/>/);
  assert.match(clientsSource, /<ForestHero title=\{labels\.clientsTitle\} imageOpacity=\{0\.18\} \/>/);
  assert.match(clientsSource, /skin !== "forest" && <PageHeader title=\{labels\.clientsTitle\} \/>/);
  assert.doesNotMatch(clientsSource, /refreshButton|forest-hero-refresh-button|actions=\{refreshButton\}/);
  assert.match(stylesSource, /\.forest-hero-actions/);
  assert.match(stylesSource, /\.sidebar-workspace-action/);
  assert.match(shellSource, /className="sidebar-workspace-action"/);
  assert.match(shellSource, /data-sidebar-utility=\{label\}/);
  assert.match(shellSource, /<Icon size=\{15\} \/>/);
  assert.match(shellSource, /utilityPanel\.kind === "workspace" && meta\.utilities\.length > 0/);
  assert.doesNotMatch(stylesSource, /\.app-frame\.sidebar-expanded|\.rail-logo|\.nav-toggle\.active/);
});

test("Home dashboard Stage 4 keeps action counts on the single Home inbox source", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(apiClientSource, /export async function fetchHomeActionInbox/);
  assert.match(apiClientSource, /`\/api\/home\/action-inbox\?\$\{params\.toString\(\)\}`/);
  assert.match(apiClientSource, /export async function decideHomeActionInboxItem/);
  assert.match(apiClientSource, /`\/api\/home\/action-inbox\/\$\{encodeURIComponent\(id\)\}\/decision`/);
  assert.match(apiClientSource, /export async function fetchHomeAgenda/);
  assert.match(apiClientSource, /export async function fetchHomeFeed/);
  assert.match(apiClientSource, /tenantIdForDomain\("vault", VAULT_TENANT_ID\)/);

  assert.match(appSource, /const \[homeActionCounts, setHomeActionCounts\] = useState\(emptyHomeActionCounts\)/);
  assert.match(appSource, /const homeApprovalCount = Number\(homeActionCounts\.approval \?\? 0\) \|\| 0/);
  assert.match(appSource, /homeApprovalCount=\{homeApprovalCount\}/);
  assert.match(appSource, /onHomeActionCountsChange=\{setHomeActionCounts\}/);

  assert.match(shellSource, /data-home-topbar-approval-count=\{approvalCount\}/);
  assert.match(shellSource, /data-home-sidebar-approval-count=\{item\.homeCount\}/);
  assert.match(shellSource, /count: Number\(homeApprovalCount\) > 0 \? Number\(homeApprovalCount\) : null/);
  assert.match(shellSource, /onClick=\{\(\) => onOpenUtilityDrawer\("approvals"\)\}/);
  assert.doesNotMatch(shellSource, /onClick=\{\(\) => setView\("home", "home-requests"\)\}/);

  assert.match(homeSource, /Promise\.all\(\[\s*fetchHomeActionInbox\(\{ type: "approval", ctx: liveCtx \}\),\s*fetchHomeActionInbox\(\{ type: "task", ctx: liveCtx \}\)/);
  assert.match(homeSource, /const counts = approval\.counts \?\? task\.counts \?\? emptyHomeCounts/);
  assert.match(homeSource, /onHomeActionCountsChange\(counts\)/);
  assert.doesNotMatch(homeSource, /data-home-widget-approval-count=\{actionInbox\.counts\.approval\}/);
  assert.doesNotMatch(homeSource, /meta=\{`\$\{actionInbox\.counts\.approval\}\$\{homeCopy\(labels, "countSuffix", "건"\)\}`\}/);
  assert.match(homeSource, /data-home-inline-action=\{action\}/);
  assert.match(homeSource, /const previousActionInbox = actionInbox/);
  assert.match(homeSource, /const pendingKey = `\$\{row\.id\}:\$\{action\}:\$\{Date\.now\(\)\}`/);
  assert.match(homeSource, /setTimeout\(async \(\) => \{/);
  assert.match(homeSource, /HOME_ACTION_UNDO_WINDOW_MS/);
  assert.match(homeSource, /onHomeActionCountsChange\(nextCounts\)/);
  assert.match(homeSource, /restoreActionInbox\(undoNotice\.previousActionInbox\)/);
});

test("topbar utilities open right drawers with global dim and stacked alerts", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const homeMessagesSource = await readWebFile("src/data/homeMessages.js");
  const stylesSource = await readWebFile("src/styles.css");

  assert.match(appSource, /const \[utilityDrawerType, setUtilityDrawerType\] = useState/);
  assert.match(appSource, /const \[notificationItemsRead, setNotificationItemsRead\] = useState/);
  assert.match(appSource, /buildNotificationItems\(\{ homeActionCounts, labels \}\)/);
  assert.match(appSource, /function toggleUtilityDrawer\(type\)/);
  assert.match(appSource, /setUtilityDrawerType\(willOpen \? type : ""\)/);
  assert.match(appSource, /if \(willOpen && type === "notifications"\) setNotificationItemsRead\(true\)/);
  assert.match(appSource, /function navigateFromUtilityDrawer\(section\)/);
  assert.match(appSource, /fetchHomeMessageItems\(\{ ctx: liveCtx \}\)/);
  assert.match(appSource, /messageItems=\{homeMessageItems\}/);
  assert.match(appSource, /notificationItems=\{notificationItems\}/);
  assert.match(shellSource, /export function UtilityDrawer/);
  assert.match(shellSource, /utilityDrawerConfigFor/);
  assert.match(shellSource, /export function buildNotificationItems/);
  assert.match(shellSource, /messageItems = \[\]/);
  assert.match(shellSource, /notificationItems = \[\]/);
  assert.match(shellSource, /Array\.isArray\(messageItems\) \? messageItems : \[\]/);
  assert.match(homeMessagesSource, /fetchMatterRecords/);
  assert.match(homeMessagesSource, /fetchMatterChannel/);
  assert.match(homeMessagesSource, /fetchHomeFeed/);
  assert.doesNotMatch(shellSource, /utilityMessageItems\s*=\s*Object\.freeze\(\[\]\)/);
  assert.match(shellSource, /data-notification-trigger="true"/);
  assert.match(shellSource, /data-home-message-trigger="true"/);
  assert.match(shellSource, /data-home-approval-trigger="true"/);
  assert.match(shellSource, /aria-expanded=\{notificationsOpen \? "true" : "false"\}/);
  assert.match(shellSource, /aria-expanded=\{messagesOpen \? "true" : "false"\}/);
  assert.match(shellSource, /aria-expanded=\{approvalsOpen \? "true" : "false"\}/);
  assert.match(shellSource, /data-notification-info-count=\{notificationCount\}/);
  assert.match(shellSource, /data-notification-dot="true"/);
  assert.match(shellSource, /data-utility-drawer="open"/);
  assert.match(shellSource, /data-utility-drawer-kind=\{type\}/);
  assert.match(shellSource, /role="dialog"/);
  assert.match(shellSource, /aria-modal="true"/);
  assert.match(shellSource, /className="notification-scrim"/);
  assert.match(shellSource, /data-notification-card="stacked"/);
  assert.match(shellSource, /\{config\.title\} <span>\{count\}<\/span>/);
  assert.match(shellSource, /utilityMarkAllRead/);
  assert.match(shellSource, /utilityNotificationSettings/);
  assert.match(shellSource, /data-home-message-read=\{item\.id\}/);
  assert.match(shellSource, /data-utility-view-all="home-messages"/);
  assert.match(shellSource, /data-utility-view-all="home-requests"/);
  assert.match(shellSource, /onNavigateHomeSection\(config\.section\)/);
  assert.doesNotMatch(shellSource, />Notifications|Mark All as Read|>Settings<|status: "Conflict check"|status: "Approval"/);
  assert.match(stylesSource, /\.notification-layer[\s\S]*z-index:\s*140/);
  assert.match(stylesSource, /\.notification-scrim[\s\S]*background:\s*rgba\(15, 23, 42, 0\.46\)/);
  assert.match(stylesSource, /\.notification-scrim[\s\S]*animation:\s*record-overlay-scrim-in 180ms/);
  assert.match(stylesSource, /\.notification-drawer[\s\S]*right:\s*0[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(stylesSource, /\.notification-drawer[\s\S]*animation:\s*notification-drawer-in 240ms/);
  assert.match(stylesSource, /\.utility-drawer[\s\S]*width:\s*min\(440px, 100vw\)/);
  assert.match(stylesSource, /\.notification-stack[\s\S]*overflow:\s*auto/);
  assert.match(stylesSource, /\.notification-card[\s\S]*grid-template-columns:\s*42px minmax\(0, 1fr\)/);
  assert.match(stylesSource, /\.utility-empty-state/);
  assert.match(stylesSource, /\.utility-drawer-footer\.single/);
  assert.match(stylesSource, /@keyframes notification-drawer-in/);
  assert.match(stylesSource, /html\[data-skin="forest"\] \.notification-drawer,\s*[\r\n]+html\[data-skin="forest"\] \.people-detail-panel\s*\{[\s\S]*animation:\s*notification-drawer-in 240ms/);
});

test("Stage 5 utility drawers keep the sidebar context unchanged until explicit Home view-all", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");

  assert.match(appSource, /utilityDrawerType=\{utilityDrawerType\}/);
  assert.match(appSource, /onOpenUtilityDrawer=\{toggleUtilityDrawer\}/);
  assert.match(appSource, /homeMessageCount=\{homeMessageCount\}/);
  assert.match(appSource, /unreadMessageIds=\{unreadMessageIds\}/);
  assert.match(appSource, /onNavigateHomeSection=\{navigateFromUtilityDrawer\}/);
  assert.match(appSource, /function markMessageRead\(id\)/);
  assert.match(appSource, /next\.delete\(id\)/);
  assert.match(appSource, /function markAllMessagesRead\(\)/);
  assert.match(appSource, /setUnreadMessageIds\(new Set\(\)\)/);
  assert.match(appSource, /navigateToView\("home", section\)/);

  assert.match(shellSource, /onClick=\{\(\) => onOpenUtilityDrawer\("notifications"\)\}/);
  assert.match(shellSource, /onClick=\{\(\) => onOpenUtilityDrawer\("messages"\)\}/);
  assert.match(shellSource, /onClick=\{\(\) => onOpenUtilityDrawer\("approvals"\)\}/);
  assert.match(shellSource, /data-context-sidebar=\{axis\}/);
  assert.match(shellSource, /data-home-topbar-message-count=\{messageCount\}/);
  assert.match(shellSource, /data-home-sidebar-message-count=\{item\.homeCount\}/);
  assert.match(shellSource, /data-home-topbar-approval-count=\{approvalCount\}/);
  assert.doesNotMatch(shellSource, /data-home-message-trigger[\s\S]{0,220}setView\("home", "home-messages"\)/);
  assert.doesNotMatch(shellSource, /data-home-approval-trigger[\s\S]{0,220}setView\("home", "home-requests"\)/);
  assert.match(shellSource, /data-utility-view-all="home-messages"[\s\S]*onClick=\{goToHomeSection\}/);
  assert.match(shellSource, /data-utility-view-all="home-requests"[\s\S]*onClick=\{goToHomeSection\}/);
});

test("Stage 6 mode exception routes keep topbar and provide a return-to-work anchor", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const globalUtilitySource = await readWebFile("src/data/globalUtilities.js");
  const globalUtilitySurfaceSource = await readWebFile("src/components/GlobalUtilitySurface.jsx");
  const stylesSource = await readWebFile("src/styles.css");

  assert.match(appSource, /const defaultModeReturnTarget = Object\.freeze\(\{ view: "home", section: "home-dashboard" \}\)/);
  assert.match(appSource, /const homeFallbackSection = "home-dashboard"/);
  for (const section of ["home-todo", "home-feed", "home-calendar"]) {
    assert.match(appSource, new RegExp(`"${section}"`));
  }
  assert.match(appSource, /function normalizeHomeRoute\(route\)/);
  assert.match(appSource, /if \(!routableViews\.includes\(resolved\.view\)\) return \{ view: "home", section: homeFallbackSection \}/);
  assert.match(appSource, /const \[modeReturnTarget, setModeReturnTarget\] = useState/);
  assert.match(appSource, /modeExceptionUtilityViewIds\.includes\(initialView\) \|\| \["auth", "loading"\]\.includes\(initialView\)/);
  assert.match(appSource, /function isReturnableWorkView\(nextView\)/);
  assert.match(appSource, /function currentModeReturnTarget\(\)/);
  assert.match(appSource, /setModeReturnTarget\(currentModeReturnTarget\(\)\)/);
  assert.match(appSource, /function returnToWork\(\)/);
  assert.match(appSource, /navigateToView\(modeReturnTarget\.view, modeReturnTarget\.section\)/);
  assert.match(appSource, /modeReturnTarget=\{modeReturnTarget\}/);
  assert.match(appSource, /onReturnToWork=\{returnToWork\}/);
  assert.match(appSource, /<Topbar[\s\S]*axis=\{axis\}[\s\S]*\/>/);
  assert.match(appSource, /isGlobalUtilityView\(view\) && modeExceptionUtilityViewIds\.includes\(view\)/);

  assert.match(globalUtilitySource, /modeExceptionUtilityViewIds = \["settings", "data-import", "profile"\]/);
  assert.match(shellSource, /data-mode-exception-sidebar=\{modeExceptionActive \? "true" : undefined\}/);
  assert.match(shellSource, /data-mode-exception-depth=\{modeExceptionActive \? "deep" : undefined\}/);
  assert.match(shellSource, /const modeExceptionActive = modeExceptionUtilityViewIds\.includes\(view\)/);
  assert.match(shellSource, /data-mode-return-anchor="true"/);
  assert.match(shellSource, /data-mode-return-view=\{modeReturnTarget\.view\}/);
  assert.match(shellSource, /data-mode-return-section=\{modeReturnTarget\.section \|\| ""\}/);
  assert.match(shellSource, /aria-label=\{shellLabel\(labels, "returnToWork", "업무로 돌아가기"\)\}/);
  assert.match(shellSource, /\{shellLabel\(labels, "returnToWork", "업무로 돌아가기"\)\}<\/span>/);
  assert.match(shellSource, /onClick=\{onReturnToWork\}/);
  assert.match(shellSource, /modeExceptionNavigation/);
  assert.match(shellSource, /globalUtilityCatalog[\s\S]{0,120}\.filter\(\(utility\) => modeExceptionUtilityViewIds\.includes\(utility\.id\)\)/);

  assert.match(globalUtilitySurfaceSource, /data-global-utility-surface=\{utility\.id\}/);
  assert.match(globalUtilitySurfaceSource, /utility\.sections\.map/);
  assert.match(globalUtilitySurfaceSource, /setView\(utility\.id, sectionId\)/);
  assert.doesNotMatch(globalUtilitySurfaceSource, /global-utility-tabs|function UtilityTab/);
  assert.match(shellSource, /groupId: `\$\{utility\.id\}-sections`/);

  assert.match(stylesSource, /\.sidebar-return-anchor/);
  assert.match(stylesSource, /html\[data-skin="forest"\] \.sidebar-return-anchor/);
  assert.doesNotMatch(shellSource, /data-mode-return-anchor="true"[\s\S]{0,240}setView\("home", "home-dashboard"\)/);
});

test("Stage 7 Home IA accessibility keeps tabs, dates, and navigation state named", async () => {
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");

  assert.match(shellSource, /aria-current=\{axis === id \? "page" : undefined\}/);
  assert.match(shellSource, /aria-current=\{active \? "location" : undefined\}/);
  assert.match(shellSource, /aria-current=\{childActive \? "location" : undefined\}/);
  assert.match(shellSource, /data-sidebar-default-section=\{defaultItem\?\.section\}/);
  assert.match(shellSource, /function sidebarGroupScopeKey\(\)/);
  assert.match(shellSource, /Object\.prototype\.hasOwnProperty\.call\(openGroups, scopeKey\)/);
  assert.match(shellSource, /item\.groupId \?\? item\.children\?\.\[0\]\?\.section \?\? item\.label/);
  assert.match(shellSource, /activeRouteByScope = useRef\(\{\}\)/);
  assert.match(shellSource, /previousRouteKey === undefined \|\| previousRouteKey === activeRouteKey/);
  assert.match(shellSource, /current\[scopeKey\] === "" \|\| current\[scopeKey\] === activeGroupKey/);
  assert.match(shellSource, /\[scopeKey\]: currentOpenKey === itemKey \? "" : itemKey/);
  assert.match(shellSource, /aria-label=\{`\$\{item\.label\} 하위 메뉴 \$\{open \? "접기" : "펼치기"\}`\}/);
  assert.match(shellSource, /aria-controls=\{panelId\}/);
  assert.match(shellSource, /id=\{panelId\} className="sidebar-subnav" role="group"/);
  assert.match(shellSource, /className=\{open \? "sidebar-item sidebar-group-toggle active" : "sidebar-item sidebar-group-toggle"\}/);
  assert.match(shellSource, /className=\{childActive \? "sidebar-item sidebar-child active" : "sidebar-item sidebar-child"\}/);
  assert.doesNotMatch(shellSource, /export function ContextSubnav|className="context-subnav"/);
  assert.match(shellSource, /aria-label=\{`\$\{meta\.title\} 워크스페이스 메뉴`\}/);
  assert.match(shellSource, /aria-label="검색 지우기"/);
  assert.match(shellSource, /aria-expanded=\{notificationsOpen \? "true" : "false"\}/);
  assert.match(shellSource, /aria-controls="notifications-utility-drawer"/);
  assert.match(shellSource, /aria-controls="messages-utility-drawer"/);
  assert.match(shellSource, /aria-controls="approvals-utility-drawer"/);

  assert.match(homeSource, /role="tablist" aria-label=\{homeCopy\(labels, "homeFeedTabLabel", "홈 피드"\)\}/);
  assert.match(homeSource, /id=\{`home-feed-tab-\$\{tab\.id\}`\}/);
  assert.match(homeSource, /aria-controls=\{`home-feed-panel-\$\{tab\.id\}`\}/);
  assert.match(homeSource, /tabIndex=\{feedTab === tab\.id \? 0 : -1\}/);
  assert.match(homeSource, /role="tabpanel"/);
  assert.match(homeSource, /aria-labelledby=\{`home-feed-tab-\$\{feedTab\}`\}/);
  assert.match(homeSource, /aria-label=\{`\$\{selectedFeedEntry\.title\} \$\{homeCopy\(labels, "homeFeedOriginalOpen", "원문 열기"\)\}`\}/);
  assert.match(homeSource, /aria-label=\{`\$\{title\} \$\{actionButtonLabel\(action, labels\)\}`\}/);
  assert.match(homeSource, /aria-label=\{`\$\{selectedDateFormatter\.format\(cell\.date\)\}\$\{cell\.key === selectedCalendarKey \? homeCopy\(labels, "homeCalendarSelectedSuffix", " 선택됨"\) : ""\}`\}/);
  assert.match(homeSource, /aria-pressed=\{cell\.key === selectedCalendarKey \? "true" : "false"\}/);
});

test("avatar profile opens a standalone personal profile surface without becoming a product axis", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const globalUtilitySource = await readWebFile("src/data/globalUtilities.js");
  const navSource = await readWebFile("src/data/nav.js");
  const profileSource = await readWebFile("src/components/UserProfileSurface.jsx");
  const stylesSource = await readWebFile("src/styles.css");
  const topbarSource = shellSource.slice(
    shellSource.indexOf("export function Topbar"),
    shellSource.indexOf("export function UtilityDrawer")
  );

  assert.match(globalUtilitySource, /modeExceptionUtilityViewIds = \["settings", "data-import", "profile"\]/);
  assert.match(appSource, /const profileStandalone = view === "profile"/);
  assert.match(appSource, /data-sidebar-state=\{profileStandalone \? "none" : "contextual"\}/);
  assert.match(appSource, /!\profileStandalone && \(/);
  assert.match(appSource, /<UserProfileSurface liveCtx=\{liveCtx\} onNavigate=\{navigateToView\} onReturnToWork=\{returnToWork\} \/>/);
  assert.match(appSource, /<Sidebar[\s\S]*onProfile=\{\(\) => navigateToView\("profile"\)\}[\s\S]*\/>/);
  assert.match(shellSource, /data-profile-trigger="true"/);
  assert.match(shellSource, /className="forest-sidebar-user"[\s\S]*data-profile-trigger="true"/);
  assert.doesNotMatch(topbarSource, /data-profile-trigger="true"|profile-trigger|>서</);
  assert.doesNotMatch(shellSource, /profileSidebarItems/);
  assert.match(shellSource, /data-mode-return-anchor="true"/);
  assert.match(shellSource, /data-context-sidebar=\{axis\}/);
  assert.doesNotMatch(shellSource, /\{labels\.upgrade\}/);
  assert.match(profileSource, /data-user-profile-surface="my-profile"/);
  assert.match(profileSource, /fetchUserProfile/);
  assert.match(profileSource, /data-profile-api-backed="true"/);
  assert.match(profileSource, /data-profile-api-state=\{currentState\}/);
  assert.match(profileSource, /data-profile-return-to-work="true"/);
  assert.match(profileSource, /onReturnToWork/);
  assert.match(profileSource, /업무로 돌아가기/);
  assert.match(profileSource, /프로필을 불러오는 중입니다/);
  assert.match(profileSource, /현재 권한으로는 프로필 정보를 볼 수 없습니다/);
  assert.match(profileSource, /담당자 검토 후 프로필 정보를 표시할 수 있습니다/);
  assert.match(profileSource, /내 프로필/);
  assert.match(profileSource, /경력/);
  assert.match(profileSource, /학력/);
  assert.match(profileSource, /자격/);
  assert.match(profileSource, /Edit/);
  assert.doesNotMatch(profileSource, /profileSidebarItems|data-profile-local-state|setLocalAction|data-profile-help-feedback|data-profile-contract-create/);
  assert.doesNotMatch(profileSource, /서지원|jws@matter\.local|법무 운영 매니저|외부 협업자|월 정액 자문|2024년 4월 15일|월 \$30\.00|계정 정리 중|진행 중|>80%<\/strong>|Contracts \/ Agreements|Expenses and claims overview|Personal Information|Time off|My Onboarding|Your Profile|Help & Feedback|계약 \/ 약정|비용 및 청구 현황|오프보딩|유연 지급|출금 방법|MessageCircle/);
  assert.doesNotMatch(profileSource, /deel-/);
  assert.match(stylesSource, /\.matter-profile-surface[\s\S]*background:\s*var\(--am-canvas\)/);
  assert.match(stylesSource, /\.app-frame\.profile-standalone-shell[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(stylesSource, /\.matter-profile-return-button/);
  assert.match(stylesSource, /\.matter-profile-layout[\s\S]*grid-template-columns:\s*300px minmax\(0, 1fr\)/);
  assert.doesNotMatch(stylesSource, /deel-|#f7f6f2|\.matter-profile-progress-card\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(navSource, /id: "profile"/);
});

test("login surfaces keep credentials bounded and desktop supports password setup", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const authSource = await readWebFile("src/components/AuthSurface.jsx");
  const stylesSource = await readWebFile("src/styles.css");
  const assetFiles = await readdir(resolve(webRoot, "src/assets"));
  const desktopSource = await readFile(resolve(webRoot, "../desktop/src/renderer/offline.html"), "utf8");

  assert.match(appSource, /async function handleLogin\(credentials\)/);
  assert.match(appSource, /loginLawosApiSession\(credentials\)/);
  assert.match(appSource, /onLogin=\{handleLogin\}/);
  assert.match(appSource, /auth-only-app/);
  assert.match(appSource, /view === "auth" && authStep === "login"/);
  assert.match(authSource, /parnas-tower-login\.jpg/);
  assert.match(authSource, /data-login-screen="parnas-split"/);
  assert.match(authSource, /matter-login-photo-panel/);
  assert.match(authSource, /Samseong-dong Parnas Tower/);
  assert.match(authSource, /<MatterLogo \/>/);
  assert.match(authSource, /labels\.signupPreviewNotice/);
  assert.doesNotMatch(authSource, /Sign up now/);
  assert.match(authSource, /data-login-form="email-password"/);
  assert.match(authSource, /data-login-email/);
  assert.match(authSource, /data-login-password/);
  assert.match(stylesSource, /\.matter-login-stage/);
  assert.match(stylesSource, /\.matter-login-photo-panel img[\s\S]*object-fit:\s*cover/);
  assert.match(stylesSource, /@keyframes post-login-logo-dock/);
  assert.ok(assetFiles.includes("parnas-tower-login.jpg"));
  assert.doesNotMatch(authSource, /Continue with SSO|SSO로 계속/);
  assert.doesNotMatch(authSource, /Remote Talent|remote talent|Mobbin|curated by|Remote account/);
  assert.doesNotMatch(stylesSource, /Remote Talent|remote talent|Mobbin|curated by/);

  assert.match(desktopSource, /data-login-email/);
  assert.match(desktopSource, /data-login-password/);
  assert.match(desktopSource, /data-auth-mode-panel="reset_confirm"/);
  assert.match(desktopSource, /data-reset-token/);
  assert.match(desktopSource, /data-reset-new-password/);
  assert.match(desktopSource, /data-reset-confirm-password/);
  assert.match(desktopSource, /api\.login\(\{ email, password \}\)/);
  assert.doesNotMatch(desktopSource, /data-account-select|latestResetEmail|email_message|reset_url|operatorToken/);
});

test("command center groups all backend coverage into four product axes", async () => {
  const capabilityMap = await readWebFile("src/data/capabilityMap.js");
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");

  for (const id of ["client", "matter", "people", "vault"]) {
    assert.match(capabilityMap, new RegExp(`id: "${id}"`));
    assert.match(homeSource, new RegExp(`id: "${id}"`));
  }
  for (const removedId of [
    "api-health",
    "clients-master-data",
    "matter-core",
    "vault-dms",
    "crm-intake",
    "finance",
    "analytics",
    "ai-governance",
    "portal-data-room",
    "people-hrx",
    "ui-readiness",
    "enterprise-ops"
  ]) {
    assert.doesNotMatch(capabilityMap, new RegExp(`id: "${removedId}"`));
  }
  for (const endpoint of [
    "GET /api/matters/:matter_id/command-center",
    "POST /api/vault/documents/upload",
    "POST /api/crm/opportunities/:id/handoff",
    "POST /api/finance/wip",
    "POST /api/ai/outputs",
    "POST /api/portal/secure-links",
    "POST /api/hrx/ai/assistant",
    "POST /api/data-room/projections"
  ]) {
    assert.match(capabilityMap, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(homeSource, /combinePillarResults/);
  assert.match(homeSource, /data-lcx-web-capability-count=\{capabilities.length\}/);
  assert.match(capabilityMap, /productionGoLive: false/);
  assert.match(capabilityMap, /publicRelease: false/);
  assert.match(capabilityMap, /ownerApproval: false/);
});

test("Client Matter People Vault surfaces stay API-backed and fail closed", async () => {
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const globalUtilitySource = await readWebFile("src/data/globalUtilities.js");
  const clientsSource = await readWebFile("src/components/ClientsSurface.jsx");
  const mattersSource = await readWebFile("src/components/MattersSurface.jsx");
  const matterVaultSource = await readWebFile("src/components/MatterVaultPanel.jsx");
  const importPanelSource = await readWebFile("src/components/ImportDataMappingPanel.jsx");
  const dataCloudSource = await readWebFile("src/components/DataCloudEnrichmentPanel.jsx");
  const reportBuilderSource = await readWebFile("src/components/ReportBuilderPanel.jsx");
  const permissionAdminSource = await readWebFile("src/people/admin/PermissionAdminPanel.jsx");
  const workforceDirectorySource = await readWebFile("src/people/employees/PeopleWorkforceDirectory.tsx");
  const employeeListSource = await readWebFile("src/people/employees/EmployeeList.tsx");
  const openingSource = await readWebFile("src/components/MatterOpeningWizard.jsx");
  const rosterSource = await readWebFile("src/components/MatterTeamRoster.jsx");
  const vaultSource = await readWebFile("src/components/VaultSurface.jsx");
  const documentDetailSource = await readWebFile("src/components/DocumentDetail.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");
  const peopleSource = await readWebFile("src/people/PeopleHome.tsx");
  const peopleApiSource = await readWebFile("src/people/hrxApiClient.ts");
  const peopleLocalRosterSource = await readWebFile("src/people/hrxLocalRoster.ts");
  const employeeProfileSource = await readWebFile("src/people/employees/EmployeeProfile.tsx");
  const stylesSource = await readWebFile("src/styles.css");

  assert.match(workforceDirectorySource, /kind: "error",\s*message: "구성원 정보를 확인할 수 없습니다\."/);
  assert.match(workforceDirectorySource, /kind: "error",\s*message: "입퇴사 정보를 확인할 수 없습니다\."/);
  assert.match(workforceDirectorySource, /kind: "error", message: "조직 정보를 확인할 수 없습니다\."/);
  assert.match(workforceDirectorySource, /orgStatus\.kind === "loading" \? "live-data-loading" : "live-data-error"/);

  for (const section of [
    "clients-home",
    "client-opportunities",
    "client-intake",
    "client-accounts",
    "client-contacts",
    "client-activities",
    "client-contracts",
    "client-relationships",
    "client-conflict",
    "client-billing",
    "client-data",
    "client-settings",
    "matter-home",
    "matter-intake",
    "matter-closeout",
    "matter-archive",
    "matter-board",
    "matter-tasks",
    "matter-vault",
    "matter-external-schedule",
    "matter-notes",
    "matter-channel",
    "matter-opening",
    "matter-team",
    "matter-client-requests",
    "matter-analytics",
    "matter-search",
    "matter-risk",
    "matter-audit",
    "matter-integrations",
    "matter-settings"
  ]) {
    assert.match(shellSource, new RegExp(section));
  }
  for (const hiddenMatterMenuSection of ["matter-evidence", "matter-templates", "matter-seal", "matter-approvals", "matter-time", "matter-expenses", "matter-billing", "matter-ar"]) {
    assert.doesNotMatch(shellSource, new RegExp(`section: "${hiddenMatterMenuSection}"`));
  }
  for (const section of [
    "data-import-client-data",
    "data-import-client",
    "calendar-matter",
    "messages-matter-channel",
    "finance-matter-billing",
    "reports-matter-analytics"
  ]) {
    assert.match(globalUtilitySource, new RegExp(section));
  }
  assert.doesNotMatch(globalUtilitySource, /data-import-matter|사건 자료 가져오기/);
  assert.match(clientsSource, /data-cmp-g2-live-clients="true"/);
  assert.match(clientsSource, /data-salesforce-client-workspace="list-detail-overlay"/);
  assert.match(clientsSource, /data-record-overlay="client"/);
  assert.match(clientsSource, /record-overlay-scrim/);
  assert.match(clientsSource, /record-overlay-panel/);
  assert.match(clientsSource, /record-overlay-close/);
  assert.match(clientsSource, /function ClientDashboardPanel/);
  assert.match(clientsSource, /data-client-dashboard="true"/);
  assert.doesNotMatch(clientsSource, /data-client-dashboard-kpis="true"/);
  assert.doesNotMatch(clientsSource, /data-client-priority-queue="true"/);
  assert.doesNotMatch(clientsSource, /data-client-dashboard-table="true"/);
  for (const title of ["신규 고객", "잠재 고객\/접촉", "매출 순위", "고객 미팅", "미수금"]) {
    assert.match(clientsSource, new RegExp(title));
  }
  for (const source of ["fetchCrmAccounts", "fetchCrmLeads", "fetchCrmOpportunities", "fetchCrmContacts", "fetchCrmActivities", "fetchAnalyticsFinanceClients"]) {
    assert.match(clientsSource, new RegExp(source));
  }
  assert.match(clientsSource, /title="대시보드"[\s\S]*<ClientDashboardPanel/);
  assert.doesNotMatch(clientsSource, /ClientsOverviewPanel|data-client-overview-panel|title="요약"[\s\S]*clients-home/);
  assert.match(shellSource, /label: "대시보드", view: "clients", section: "clients-home"/);
  assert.match(stylesSource, /\.record-overlay-layer\s*\{[\s\S]*display: flex;[\s\S]*justify-content: flex-end;[\s\S]*padding: 0;/);
  assert.match(stylesSource, /\.record-overlay-panel\s*\{[\s\S]*width: min\(560px, 100vw\);[\s\S]*height: 100%;[\s\S]*animation: record-overlay-panel-in 240ms/);
  assert.match(stylesSource, /@keyframes record-overlay-panel-in\s*\{[\s\S]*transform: translateX\(100%\);[\s\S]*transform: translateX\(0\);/);
  assert.match(clientsSource, /fetchMasterDataRecords/);
  assert.match(apiClientSource, /cursor = null/);
  assert.match(apiClientSource, /params\.set\("cursor"/);
  assert.match(apiClientSource, /function desktopReadBridge/);
  assert.match(apiClientSource, /window\.matterSession\?\.api/);
  assert.match(apiClientSource, /response = await bridge/);
  assert.match(apiClientSource, /SAFE_ACTOR_REF_PATTERN/);
  assert.match(apiClientSource, /safeActorRef\(params\.get\("desktop_actor_ref"\)\)/);
  assert.match(clientsSource, /fetchMatterClients/);
  assert.match(apiClientSource, /\/api\/matters\/clients/);
  assert.match(clientsSource, /item\.synthetic_only !== true/);
  assert.match(clientsSource, /Property label="법인 형태"/);
  assert.match(clientsSource, /clientLegalForm/);
  assert.match(clientsSource, /fetchCrmLeads/);
  assert.match(clientsSource, /fetchCrmOpportunities/);
  assert.match(clientsSource, /fetchIntakeRequests/);
  assert.match(clientsSource, /fetchIntakeAudit/);
  assert.match(clientsSource, /fetchCrmAccounts/);
  assert.match(clientsSource, /fetchCrmContacts/);
  assert.match(clientsSource, /fetchCrmAccountContacts/);
  assert.match(clientsSource, /fetchCrmMergeProposals/);
  assert.match(clientsSource, /fetchCrmActivities/);
  assert.match(clientsSource, /fetchCrmProposals/);
  assert.match(clientsSource, /fetchCrmClientSettings/);
  assert.match(clientsSource, /fetchFinanceInvoices/);
  assert.match(clientsSource, /fetchFinanceArAging/);
  assert.match(clientsSource, /handoffCrmOpportunityToIntake/);
  assert.match(clientsSource, /createIntakeConflictCheck/);
  assert.match(clientsSource, /recordIntakeConflictDecision/);
  assert.match(clientsSource, /approveIntakeConflictWaiver/);
  assert.match(clientsSource, /approveIntakeEngagement/);
  assert.match(clientsSource, /issueIntakeClearanceToken/);
  assert.match(clientsSource, /openMatterFromIntakeClearance/);
  assert.match(apiClientSource, /openMatterFromIntakeClearance/);
  assert.match(apiClientSource, /ui_cmp_g6_intake_matter_open/);
  assert.match(clientsSource, /data-crm-handoff-action="true"/);
  assert.match(clientsSource, /data-crm-handoff-refresh-result="true"/);
  assert.match(clientsSource, /upsertResultItem/);
  assert.match(clientsSource, /data-crm-accounts-read="true"/);
  assert.match(clientsSource, /data-crm-contacts-read="true"/);
  assert.match(clientsSource, /data-crm-account-contacts-read="true"/);
  assert.match(clientsSource, /data-crm-account-create-action="true"/);
  assert.match(clientsSource, /data-crm-account-create-result="true"/);
  assert.match(clientsSource, /data-crm-account-patch-action="true"/);
  assert.match(clientsSource, /data-crm-account-patch-result="true"/);
  assert.match(clientsSource, /data-crm-contact-create-action="true"/);
  assert.match(clientsSource, /data-upl-c07-contact-raw-value-flow="true"/);
  assert.match(clientsSource, /data-crm-contact-create-result="true"/);
  assert.match(clientsSource, /data-crm-contact-patch-action="true"/);
  assert.match(clientsSource, /data-crm-contact-patch-result="true"/);
  assert.match(clientsSource, /contact_point_value_included === true/);
  assert.match(clientsSource, /data-sf-b-w01r-account-canonical-sync="true"/);
  assert.match(clientsSource, /data-sf-b-w01r-contact-canonical-sync="true"/);
  assert.match(clientsSource, /data-sf-b-w01r-merge-review="true"/);
  assert.match(clientsSource, /data-sf-b-w01r-merge-execute-guarded="true"/);
  assert.match(clientsSource, /data-sf-b-w02-record-actions-panel="true"/);
  assert.match(clientsSource, /data-sf-b-w02-field-registry="true"/);
  assert.match(clientsSource, /data-sf-b-w02-action-audit-feed="true"/);
  assert.match(clientsSource, /data-sf-b-w02-owner-blocked-action="true"/);
  assert.match(clientsSource, /DataCloudEnrichmentPanel ctx=\{liveCtx\}/);
  assert.match(dataCloudSource, /data-data-cloud-enrichment="route-backed"/);
  assert.match(dataCloudSource, /data-enrichment-provider-admin="provider-blocked"/);
  assert.match(dataCloudSource, /data-sf-b-w07-provider-register-action="true"/);
  assert.match(dataCloudSource, /data-sf-b-w07-consent-record-action="true"/);
  assert.match(dataCloudSource, /data-sf-b-w07-enrichment-job-action="true"/);
  assert.match(dataCloudSource, /data-sf-b-w07-enrichment-preview="true"/);
  assert.match(dataCloudSource, /data-sf-b-w07-enrichment-execute-provider-blocked-action="true"/);
  assert.match(dataCloudSource, /data-identity-resolution="route-backed"/);
  assert.match(dataCloudSource, /data-unified-profile="route-backed"/);
  assert.match(dataCloudSource, /data-segment-activation="provider-blocked"/);
  assert.match(dataCloudSource, /data-sf-b-w07-audit="true"/);
  assert.match(dataCloudSource, /meta="Client"/);
  assert.match(apiClientSource, /fetchDataCloudProviders/);
  assert.match(apiClientSource, /createDataCloudProvider/);
  assert.match(apiClientSource, /createDataCloudConsentRecord/);
  assert.match(apiClientSource, /createEnrichmentJob/);
  assert.match(apiClientSource, /executeEnrichmentJob/);
  assert.match(apiClientSource, /fetchEnrichmentResults/);
  assert.match(apiClientSource, /runIdentityResolution/);
  assert.match(apiClientSource, /fetchUnifiedCustomerProfile/);
  assert.match(apiClientSource, /activateDataCloudSegment/);
  assert.match(apiClientSource, /subject_label: "Client 보강 대상"/);
  assert.match(apiClientSource, /segment_label: "Client 검토 세그먼트"/);
  assert.match(apiClientSource, /name: "Client 손익 보고서"/);
  assert.match(apiClientSource, /name: "Client 손익 검토 보고서"/);
  assert.match(reportBuilderSource, /title="Client 손익"/);
  assert.match(reportBuilderSource, /columns=\{\["Client", "Matter", "손익", "원본"\]\}/);
  assert.match(clientsSource, /data-sf-b-w02-owner-blocked-result="true"/);
  assert.match(clientsSource, /owner_blocked/);
  assert.match(clientsSource, /data-sf-b-w02-account-record-action="true"/);
  assert.match(clientsSource, /data-sf-b-w02-account-record-action-result="true"/);
  assert.match(clientsSource, /data-sf-b-w02-contact-record-action="true"/);
  assert.match(clientsSource, /data-sf-b-w02-contact-record-action-result="true"/);
  assert.match(clientsSource, /createCrmAccount/);
  assert.match(clientsSource, /createCrmActivity/);
  assert.match(clientsSource, /createCrmContact/);
  assert.match(clientsSource, /createCrmProposal/);
  assert.match(clientsSource, /createCrmMergeProposal/);
  assert.match(clientsSource, /executeCrmMergeProposal/);
  assert.match(clientsSource, /patchCrmActivity/);
  assert.match(clientsSource, /patchCrmAccount/);
  assert.match(clientsSource, /patchCrmClientSetting/);
  assert.match(clientsSource, /patchCrmContact/);
  assert.match(clientsSource, /patchCrmProposal/);
  assert.match(clientsSource, /fetchRecordActionFields/);
  assert.match(clientsSource, /fetchRecordActionAudit/);
  assert.match(clientsSource, /updateRecordActionField/);
  assert.match(clientsSource, /bulkUpdateRecordActions/);
  assert.match(clientsSource, /clientGuardedState/);
  assert.match(clientsSource, /function guardedResultForContext/);
  assert.match(clientsSource, /setClientsResult\(guardedResult\)/);
  assert.match(clientsSource, /setLeadsResult\(guardedResult\)/);
  assert.match(clientsSource, /!clientGuardedState && selectedClientId/);
  assert.match(clientsSource, /ImportDataMappingPanel/);
  assert.match(clientsSource, /client-import/);
  assert.match(clientsSource, /data-client-dashboard="true"/);
  assert.match(clientsSource, /data-client-activities-connected="true"/);
  assert.match(clientsSource, /data-client-contracts-connected="true"/);
  assert.match(clientsSource, /data-client-relationships-connected="true"/);
  assert.match(clientsSource, /data-client-conflict-connected="true"/);
  assert.match(clientsSource, /data-intake-conflict-review-flow="true"/);
  assert.match(clientsSource, /data-intake-conflict-hit-list="true"/);
  assert.match(clientsSource, /data-intake-engagement-approval-flow="true"/);
  assert.match(clientsSource, /data-intake-matter-opening-flow="true"/);
  assert.match(clientsSource, /Matter 개설/);
  assert.match(clientsSource, /data-client-billing-connected="true"/);
  assert.match(clientsSource, /data-client-settings-connected="true"/);
  assert.match(clientsSource, /data-client-contract-esign-provider-blocked="true"/);
  assert.match(clientsSource, /data-client-billing-provider-blocked="true"/);
  assert.doesNotMatch(clientsSource, /data-client-planned-section|메뉴를 준비 중입니다/);
  assert.doesNotMatch(clientsSource, /Client, 담당자, Opportunity, 상담 이력/);
  assert.match(clientsSource, /renderLiveState\(result, "Client"\)/);
  assert.match(clientsSource, /fetchMatterRecords/);
  assert.match(clientsSource, /modelType: "MatterClient"/);
  assert.match(clientsSource, /function mergeClientMatterResults/);
  assert.match(clientsSource, /fallbackClientSourceUsed/);
  assert.match(clientsSource, /matter_code_links/);
  assert.match(clientsSource, /linkedMatterSummary/);
  assert.match(clientsSource, /baseResult\?\.uiState === "empty" \? "passed"/);
  assert.match(clientsSource, /담당자에게 접근을 요청하세요/);
  assert.match(clientsSource, /담당자 확인 후 \{noun\} 정보를 볼 수 있습니다/);
  assert.doesNotMatch(clientsSource, /의뢰인/);
  assert.match(clientsSource, /data-intake-clearance-action="true"/);
  assert.match(clientsSource, /live-data-unavailable/);
  assert.match(clientsSource, /live-data-denied/);
  assert.match(clientsSource, /live-data-review/);
  assert.doesNotMatch(clientsSource, /mergeCrmContact|deleteCrmContact|postCrmContactMerge/);
  assert.doesNotMatch(clientsSource, /mockData|ClientsMockSurface/);
  assert.match(mattersSource, /data-cmp-g4-live-matters="true"/);
  assert.doesNotMatch(mattersSource, /MATTER_WORK_TABS|matter-section-tabs|Matter 업무 탭/);
  assert.doesNotMatch(stylesSource, /\.matter-section-tabs/);
  assert.match(mattersSource, /data-salesforce-matter-workspace="list-detail-overlay"/);
  assert.match(mattersSource, /data-record-overlay="matter"/);
  assert.match(mattersSource, /record-overlay-scrim/);
  assert.match(mattersSource, /record-overlay-panel/);
  assert.match(mattersSource, /record-overlay-close/);
  assert.match(mattersSource, /data-matter-selected-record-list="true"/);
  assert.match(mattersSource, /data-matter-select-row="true"/);
  assert.doesNotMatch(mattersSource, /data-matter-saved-list-views|data-matter-list-view-option|data-matter-save-list-view-action/);
  assert.match(mattersSource, /data-matter-bulk-select-row="true"/);
  assert.match(mattersSource, /data-matter-record-inline-edit-action="true"/);
  assert.match(mattersSource, /data-matter-record-inline-edit-result="true"/);
  assert.match(mattersSource, /data-matter-record-owner-change-action="true"/);
  assert.match(mattersSource, /data-matter-record-owner-change-result="true"/);
  assert.match(mattersSource, /data-sf-b-w02-matter-record-actions="true"/);
  assert.match(mattersSource, /data-sf-b-w02-matter-record-action-result="true"/);
  assert.match(mattersSource, /data-sf-b-w02-matter-owner-blocked-action="true"/);
  assert.match(mattersSource, /data-sf-b-w02-matter-owner-blocked-result="true"/);
  assert.match(mattersSource, /data-sf-b-w02-matter-action-audit-feed="true"/);
  assert.match(mattersSource, /owner_blocked/);
  assert.match(mattersSource, /aria-selected=\{selected\}/);
  assert.match(mattersSource, /onSelectMatter=\{setSelectedMatterId\}/);
  assert.match(mattersSource, /applyMatterListView/);
  assert.match(mattersSource, /visibleMatters\.find\(\(item\) => item\.matter_id === selectedMatterId\)/);
  assert.match(mattersSource, /matterId=\{activeMatterId\}/);
  assert.match(mattersSource, /fetchMatterRecords/);
  assert.match(mattersSource, /fetchMatterCommandCenter/);
  assert.match(mattersSource, /fetchMatterListViews/);
  assert.doesNotMatch(mattersSource, /saveMatterListView|bulkCompleteMatterStatus/);
  assert.match(mattersSource, /updateMatterInlineFields/);
  assert.match(mattersSource, /changeMatterOwner/);
  assert.match(mattersSource, /fetchRecordActionFields/);
  assert.match(mattersSource, /fetchRecordActionAudit/);
  assert.match(mattersSource, /updateRecordActionField/);
  assert.match(mattersSource, /bulkUpdateRecordActions/);
  assert.match(mattersSource, /fetchMatterRecentlyViewed/);
  assert.match(mattersSource, /fetchMatterTimeline/);
  assert.match(mattersSource, /fetchMatterActivities/);
  assert.match(mattersSource, /createMatterActivity/);
  assert.match(mattersSource, /patchMatterActivity/);
  assert.match(mattersSource, /fetchMatterCalendarEvents/);
  assert.match(mattersSource, /createMatterCalendarEvent/);
  assert.match(mattersSource, /patchMatterCalendarEvent/);
  assert.match(mattersSource, /fetchMatterDeadlines/);
  assert.match(mattersSource, /confirmMatterDeadlineChange/);
  assert.match(mattersSource, /fetchMatterChannel/);
  assert.match(mattersSource, /createMatterChannelMessage/);
  assert.match(mattersSource, /syncMatterChannelProvider/);
  assert.match(mattersSource, /fetchMatterAudit/);
  assert.match(mattersSource, /markMatterRecentlyViewed/);
  assert.match(mattersSource, /completeMatterStatus/);
  assert.match(mattersSource, /registerMatterParty/);
  assert.match(mattersSource, /fetchFinanceTimeEntries/);
  assert.match(mattersSource, /fetchFinanceInvoices/);
  assert.match(mattersSource, /fetchFinanceArAging/);
  assert.match(mattersSource, /fetchFinanceAudit/);
  assert.match(mattersSource, /fetchAnalyticsDashboards/);
  assert.match(mattersSource, /fetchAnalyticsMatterProfitability/);
  assert.match(mattersSource, /createFinanceTimeEntry/);
  assert.match(mattersSource, /generateFinanceWip/);
  assert.match(mattersSource, /importFinancePayment/);
  assert.match(mattersSource, /refreshAnalyticsDashboards/);
  assert.match(mattersSource, /refreshMatterProfitability/);
  assert.match(mattersSource, /createAnalyticsExport/);
  assert.doesNotMatch(mattersSource, /ImportDataMappingPanel|matter-import|자료 가져오기|사건 자료 매핑/);
  assert.match(mattersSource, /data-matter-charge-actions="true"/);
  assert.match(mattersSource, /data-matter-charge-step="prebill-review"/);
  assert.match(mattersSource, /data-matter-charge-step="invoice-issue"/);
  assert.match(mattersSource, /data-matter-charge-step="payment-allocation"/);
  assert.match(mattersSource, /data-matter-payment-import-action="true"/);
  assert.doesNotMatch(mattersSource, /\bBilling\b/);
  assert.match(mattersSource, /data-matter-time-entry-action="true"/);
  assert.match(mattersSource, /data-matter-time-entry-form="true"/);
  assert.match(mattersSource, /data-matter-time-entry-timer-action="true"/);
  assert.match(mattersSource, /handleTimeEntryFormChange/);
  assert.match(mattersSource, /handleToggleTimeTimer/);
  assert.match(mattersSource, /data-matter-analytics-actions="true"/);
  assert.match(mattersSource, /data-matter-analytics-export-action="true"/);
  assert.match(mattersSource, /data-matter-analytics-export-safe-state="true"/);
  assert.match(mattersSource, /data-matter-status-transition-action="true"/);
  assert.match(mattersSource, /data-matter-adverse-party-action="true"/);
  assert.match(mattersSource, /data-matter-adverse-party-form="true"/);
  assert.match(mattersSource, /data-matter-adverse-party-list="true"/);
  assert.match(mattersSource, /data-matter-recently-viewed="true"/);
  assert.match(mattersSource, /data-matter-activity-timeline="true"/);
  assert.match(mattersSource, /data-matter-activity-filters="true"/);
  assert.match(mattersSource, /data-matter-activity-read-boundary="true"/);
  assert.match(mattersSource, /data-sf-b-w03-activity-workspace="true"/);
  assert.match(mattersSource, /data-sf-b-w03-activity-composer="true"/);
  assert.match(mattersSource, /data-sf-b-w03-activity-create-result="true"/);
  assert.match(mattersSource, /data-sf-b-w03-activity-patch-result="true"/);
  assert.match(mattersSource, /data-sf-b-w03-calendar-workspace="true"/);
  assert.match(mattersSource, /data-sf-b-w03-calendar-create-action="true"/);
  assert.match(mattersSource, /data-sf-b-w03-calendar-create-result="true"/);
  assert.match(mattersSource, /data-sf-b-w03-deadline-board="true"/);
  assert.match(mattersSource, /data-sf-b-w03-deadline-approval-action="true"/);
  assert.match(mattersSource, /data-sf-b-w03-deadline-approval-result="true"/);
  assert.match(mattersSource, /data-sf-b-w03-deadline-confirm-action="true"/);
  assert.match(mattersSource, /data-sf-b-w03-deadline-confirm-result="true"/);
  assert.match(mattersSource, /data-sf-b-w03-channel-workspace="true"/);
  assert.match(mattersSource, /data-sf-b-w03-channel-composer="true"/);
  assert.match(mattersSource, /data-sf-b-w03-channel-message-result="true"/);
  assert.match(mattersSource, /data-sf-b-w03-provider-blocked-result="true"/);
  assert.match(mattersSource, /data-sf-b-w03-right-panel-deadline-highlight="true"/);
  assert.match(mattersSource, /data-sf-b-w03-right-panel-channel-tab="true"/);
  assert.match(mattersSource, /timelineCategory/);
  assert.match(mattersSource, /timelineSourceLabel/);
  assert.match(mattersSource, /ownerLabel/);
  assert.match(mattersSource, /onMatterUpdated=\{applyMatterUpdate\}/);
  assert.match(mattersSource, /function MatterDashboardPanel/);
  assert.match(mattersSource, /data-matter-dashboard="true"/);
  assert.doesNotMatch(mattersSource, /data-matter-dashboard-kpis="true"/);
  assert.doesNotMatch(mattersSource, /data-matter-priority-queue="true"/);
  assert.doesNotMatch(mattersSource, /data-matter-dashboard-table="true"/);
  for (const section of ["recent-work", "today-todo", "my-matters", "new-engagements", "closed-matters"]) {
    assert.match(mattersSource, new RegExp(`section="${section}"`));
  }
  assert.match(mattersSource, /title="대시보드"[\s\S]*<MatterDashboardPanel/);
  assert.doesNotMatch(mattersSource, /currentSection === "matter-home"[\s\S]{0,600}<CommandPanel/);
  assert.match(shellSource, /label: "대시보드", view: "matters", section: "matter-home"/);
  assert.match(mattersSource, /matter-command-audit-trail/);
  assert.match(mattersSource, /matter-finance-audit-trail/);
  assert.match(mattersSource, /"matter-home",\s*"matters-list",\s*"matter-command",\s*"matter-intake"/);
  assert.match(mattersSource, /MATTER_EXTERNAL_SCHEDULE_ROWS/);
  assert.match(mattersSource, /법원 일정/);
  assert.match(mattersSource, /우체국 발송/);
  assert.match(mattersSource, /세무서 업무/);
  assert.match(mattersSource, /MATTER_CONNECTED_SECTIONS/);
  assert.match(mattersSource, /data-lcx-vltui-06-connected-section=\{config\.marker\}/);
  assert.match(mattersSource, /data-lcx-vltui-06-lifecycle-boundary=\"true\"/);
  assert.match(mattersSource, /data-lcx-vltui-06-vault-mutation-blocked=\"true\"/);
  assert.match(mattersSource, /data-lcx-vltui-06-activity-type=\{activityType\}/);
  assert.match(mattersSource, /data-lcx-vltui-06-vault-backed-shortcuts=\{config\.marker\}/);
  assert.match(mattersSource, /data-lcx-vltui-06-approval-boundary=\{marker\}/);
  assert.match(mattersSource, /data-lcx-vltui-06-client-requests-connected=\"true\"/);
  assert.match(mattersSource, /data-lcx-vltui-06-meetings-connected=\"true\"/);
  assert.match(mattersSource, /data-lcx-vltui-06-expenses-connected=\"true\"/);
  assert.match(mattersSource, /data-lcx-vltui-06-search-risk=\{marker\}/);
  assert.match(mattersSource, /data-lcx-vltui-06-integrations-settings=\{marker\}/);
  assert.doesNotMatch(mattersSource, /data-lcx-vltui-06-import-lifecycle|data-lcx-vltui-06-import-execute-blocked/);
  assert.doesNotMatch(mattersSource, /MATTER_PLANNED_SECTIONS|PlannedMatterSection|data-matter-planned-section|메뉴를 준비 중입니다|meta=\"준비 중\"/);
  assert.match(matterVaultSource, /fetchMatterVaultSummary/);
  assert.match(matterVaultSource, /fetchMatterTimeline/);
  assert.match(matterVaultSource, /fetchMatterVaultDocuments/);
  assert.match(matterVaultSource, /fetchMatterVaultSearch/);
  assert.match(matterVaultSource, /fetchMatterVaultAudit/);
  assert.match(matterVaultSource, /createMatterDocumentFacade/);
  assert.match(matterVaultSource, /className="record-list-panel matter-runtime-panel"/);
  assert.match(matterVaultSource, /data-matter-vault-record-workspace="true"/);
  assert.match(matterVaultSource, /data-matter-document-facade-action="true"/);
  assert.match(matterVaultSource, /data-matter-document-facade-result="true"/);
  assert.match(matterVaultSource, /matter-vault-documents/);
  assert.match(matterVaultSource, /matter-vault-search/);
  assert.match(matterVaultSource, /matter-vault-audit/);
  assert.match(matterVaultSource, /fetchVaultBridgeStatus/);
  assert.match(matterVaultSource, /fetchVaultUploadPreflight/);
  assert.match(matterVaultSource, /data-lcx-vltui-03-document-workspace-boundary="true"/);
  assert.match(matterVaultSource, /data-lcx-vltui-03-vault-source-state/);
  assert.match(matterVaultSource, /data-lcx-vltui-03-preflight-state/);
  assert.match(matterVaultSource, /data-lcx-vltui-03-preflight-action="true"/);
  assert.match(matterVaultSource, /data-lcx-vltui-03-publish-write-enabled="false"/);
  assert.match(matterVaultSource, /data-lcx-vltui-03-import-boundary="true"/);
  assert.match(matterVaultSource, /data-lcx-vltui-03-import-execute-state/);
  assert.match(matterVaultSource, /data-lcx-vltui-03-email-send-boundary="true"/);
  assert.match(matterVaultSource, /data-lcx-vltui-03-email-send-state/);
  assert.match(matterVaultSource, /data-sf-b-w04-document-builder="true"/);
  assert.match(matterVaultSource, /data-matter-document-builder="route-backed"/);
  assert.match(matterVaultSource, /data-sf-b-w04-template-picker="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-builder-draft-action="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-builder-draft-result="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-builder-preview="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-builder-approval-action="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-builder-approval-result="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-builder-publish-action="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-builder-publish-blocked-result="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-email-composer="true"/);
  assert.match(matterVaultSource, /data-matter-email-composer="provider-blocked"/);
  assert.match(matterVaultSource, /data-sf-b-w04-email-draft-action="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-email-draft-result="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-email-send-boundary-action="true"/);
  assert.match(matterVaultSource, /data-sf-b-w04-email-send-provider-blocked="true"/);
  assert.match(matterVaultSource, /fetchMatterDocumentTemplates/);
  assert.match(matterVaultSource, /createMatterBuilderDraft/);
  assert.match(matterVaultSource, /requestMatterBuilderApproval/);
  assert.match(matterVaultSource, /publishMatterBuilderDraftToVault/);
  assert.match(matterVaultSource, /createMatterEmailDraft/);
  assert.match(matterVaultSource, /requestMatterEmailDraftSendBoundary/);
  assert.match(importPanelSource, /data-sf-b-w05-import-wizard="true"/);
  assert.match(importPanelSource, /data-client-matter-import-wizard="route-backed"/);
  assert.match(importPanelSource, /data-lcx-vltui-06-import-connected=\{surface === "matter" \? "true" : undefined\}/);
  assert.match(importPanelSource, /data-sf-b-w05-target-selector="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-job-list="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-source-stage-action="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-source-stage-result="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-field-mapping-stepper="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-field-mapping-result="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-preview-safe-sample="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-dry-run-action="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-dry-run-result="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-execute-owner-blocked-action="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-execute-owner-blocked-result="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-rollback-error-action="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-rollback-result="true"/);
  assert.match(importPanelSource, /data-sf-b-w05-error-report="true"/);
  assert.match(importPanelSource, /fetchClientMatterImportTargets/);
  assert.match(importPanelSource, /fetchClientMatterImportJobs/);
  assert.match(importPanelSource, /createClientMatterImportJob/);
  assert.match(importPanelSource, /stageImportSourceFile/);
  assert.match(importPanelSource, /saveImportFieldMapping/);
  assert.match(importPanelSource, /dryRunClientMatterImport/);
  assert.match(importPanelSource, /executeClientMatterImport/);
  assert.match(importPanelSource, /rollbackClientMatterImport/);
  assert.match(importPanelSource, /fetchClientMatterImportErrorReport/);
  assert.match(permissionAdminSource, /data-sf-b-w06-admin-setup="true"/);
  assert.match(permissionAdminSource, /data-permission-set-admin="route-backed"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-permission-set-list="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-permission-set-create-action="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-permission-set-create-result="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-permission-set-patch-action="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-permission-set-patch-result="true"/);
  assert.match(permissionAdminSource, /data-permission-assignment-admin="route-backed"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-assignment-list="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-assignment-owner-blocked-action="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-assignment-owner-blocked-result="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-revoke-owner-blocked-action="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-revoke-owner-blocked-result="true"/);
  assert.match(permissionAdminSource, /data-object-manager-admin="route-backed"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-object-manager="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-field-policy-owner-blocked-action="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-field-policy-owner-blocked-result="true"/);
  assert.match(permissionAdminSource, /data-connected-apps-admin="provider-blocked"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-connected-app-list="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-connected-app-provider-blocked-action="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-connected-app-provider-blocked-result="true"/);
  assert.match(permissionAdminSource, /data-sf-b-w06-admin-audit="true"/);
  assert.match(permissionAdminSource, /fetchPermissionSets/);
  assert.match(permissionAdminSource, /createPermissionSet/);
  assert.match(permissionAdminSource, /patchPermissionSet/);
  assert.match(permissionAdminSource, /fetchPermissionAssignments/);
  assert.match(permissionAdminSource, /assignPermissionSet/);
  assert.match(permissionAdminSource, /revokePermissionSetAssignment/);
  assert.match(permissionAdminSource, /fetchObjectManagerObjects/);
  assert.match(permissionAdminSource, /fetchObjectManagerFields/);
  assert.match(permissionAdminSource, /patchObjectFieldPolicy/);
  assert.match(permissionAdminSource, /fetchConnectedApps/);
  assert.match(permissionAdminSource, /createConnectedApp/);
  assert.match(permissionAdminSource, /disableConnectedApp/);
  assert.match(permissionAdminSource, /fetchAdminPermissionAudit/);
  assert.match(openingSource, /createMatterOpening/);
  assert.match(openingSource, /필수 정보를 입력하세요/);
  assert.match(rosterSource, /addMatterTeamMember/);
  assert.match(rosterSource, /data-matter-owner-assignment-action="true"/);
  assert.match(rosterSource, /data-matter-owner-assignment-result="true"/);
  assert.match(rosterSource, /책임자 지정/);
  assert.match(rosterSource, /MATTER_ONBOARDING_GATE_REQUIRED|온보딩 완료 후 배정 가능/);
  assert.doesNotMatch(openingSource, /tenant_rp|matter_ui_|M-UI|party_rp|user_rp/);
  assert.doesNotMatch(rosterSource, /tenant_rp|member_ui|emp-002|user_rp/);
  assert.match(vaultSource, /data-cmp-g5-vault-surface="true"/);
  assert.match(vaultSource, /fetchVaultDocuments/);
  assert.match(vaultSource, /fetchVaultBridgeStatus/);
  assert.match(vaultSource, /fetchVaultMatterLookup/);
  assert.match(vaultSource, /fetchVaultUploadPreflight/);
  assert.match(vaultSource, /data-lcx-vltui-02-vault-bridge-panel="true"/);
  assert.match(vaultSource, /data-vault-bridge-kind/);
  assert.match(vaultSource, /data-vault-bridge-ready/);
  assert.match(vaultSource, /data-lcx-vltui-02-matter-picker="true"/);
  assert.match(vaultSource, /data-vault-matter-lookup-kind/);
  assert.match(vaultSource, /data-vault-matter-selected-ref/);
  assert.match(vaultSource, /data-lcx-vltui-02-upload-preflight="true"/);
  assert.match(vaultSource, /data-vault-upload-preflight-state/);
  assert.match(vaultSource, /data-vault-upload-write-enabled/);
  assert.match(vaultSource, /업로드 준비 확인/);
  assert.match(vaultSource, /문서 등록/);
  assert.match(vaultSource, /문서 등록 준비가 완료되었습니다/);
  assert.match(vaultSource, /data-lcx-vltui-02-action-boundaries="true"/);
  assert.match(vaultSource, /data-vault-version-upload-state/);
  assert.match(vaultSource, /data-vault-metadata-mutation-state/);
  assert.match(vaultSource, /data-vault-legal-hold-state/);
  assert.match(vaultSource, /data-vault-retention-state/);
  assert.match(vaultSource, /data-vault-document-action-state/);
  assert.match(vaultSource, /data-vault-boundary-write-enabled="false"/);
  assert.match(vaultSource, /문서 작업 준비/);
  assert.match(vaultSource, /새 문서 등록/);
  assert.match(vaultSource, /메타데이터 변경/);
  assert.match(vaultSource, /법적 보존/);
  assert.match(vaultSource, /보존 정책/);
  assert.match(vaultSource, /Owner 결정 필요/);
  assert.match(vaultSource, /Vault Records/);
  assert.match(vaultSource, /UUID 직접 입력은 허용하지 않습니다/);
  assert.match(vaultSource, /Matter 연결 상태/);
  assert.match(vaultSource, /연결 정보를 다시 확인하세요/);
  assert.match(vaultSource, /productionReadyClaim/);
  assert.doesNotMatch(vaultSource, /bridgeToken/);
  assert.match(vaultSource, /registered_account/);
  assert.match(vaultSource, /등록 계정/);
  assert.match(documentDetailSource, /registered_account/);
  assert.match(apiClientSource, /fetchVaultBridgeStatus/);
  assert.match(apiClientSource, /fetchVaultMatterLookup/);
  assert.match(apiClientSource, /fetchVaultUploadPreflight/);
  assert.match(apiClientSource, /LAWOS_SESSION_ENVELOPE_STORAGE_KEY = "lawos\.session\.envelope"/);
  assert.match(apiClientSource, /LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION = "law-firm-os\.desktop-web-session-envelope\.v0\.1"/);
  assert.match(apiClientSource, /export function readLawosSessionEnvelope/);
  assert.match(apiClientSource, /FORBIDDEN_SESSION_TEXT/);
  assert.match(apiClientSource, /function desktopApiBaseUrl/);
  assert.match(apiClientSource, /window\.matterSession\?\.desktopApiBaseUrl/);
  assert.match(apiClientSource, /params\.get\("desktop_api_base_url"\)/);
  assert.match(apiClientSource, /function apiFetch/);
  assert.match(apiClientSource, /apiFetch\(`\/master-data\/records/);
  assert.match(peopleApiSource, /function desktopApiBaseUrl/);
  assert.match(peopleApiSource, /window\.matterSession\?\.desktopApiBaseUrl/);
  assert.match(peopleApiSource, /params\.get\("desktop_api_base_url"\)/);
  assert.match(peopleApiSource, /function desktopReadBridge/);
  assert.match(peopleApiSource, /window\.matterSession\?\.api/);
  assert.match(peopleApiSource, /response = await bridge|return bridge\(/);
  assert.match(peopleApiSource, /apiFetch\(path/);
  assert.match(apiClientSource, /session_principal_source: "desktop_web_session_envelope"/);
  assert.match(apiClientSource, /permissionContextFor\(ctx, PERMISSION_CONTEXTS, "client"\)/);
  assert.match(apiClientSource, /permissionContextFor\(ctx, MATTER_PERMISSION_CONTEXTS, "matter"\)/);
  assert.match(apiClientSource, /permissionContextFor\(ctx, VAULT_PERMISSION_CONTEXTS, "vault"\)/);
  assert.match(apiClientSource, /\/api\/matters\/vault-bridge\/status/);
  assert.match(apiClientSource, /\/api\/matters\/vault-bridge\/matter-lookup/);
  assert.match(apiClientSource, /\/api\/matters\/vault-bridge\/upload-preflight/);
  assert.match(apiClientSource, /permission_check_only/);
  assert.match(apiClientSource, /bridgeToken/);
  assert.match(apiClientSource, /kind: "guarded"/);
  assert.match(apiClientSource, /tenant_amic_matter_vault/);
  assert.match(apiClientSource, /user_amic_jwsuh/);
  assert.match(apiClientSource, /\/api\/crm\/leads/);
  assert.match(apiClientSource, /\/api\/crm\/accounts/);
  assert.match(apiClientSource, /createCrmAccount/);
  assert.match(apiClientSource, /path:\s*"\/api\/crm\/accounts"/);
  assert.match(apiClientSource, /patchCrmAccount/);
  assert.match(apiClientSource, /method:\s*"PATCH"/);
  assert.match(apiClientSource, /\/api\/crm\/contacts/);
  assert.match(apiClientSource, /createCrmContact/);
  assert.match(apiClientSource, /crm_contact_value_reader/);
  assert.match(apiClientSource, /ui_upl_c07_contact_value_read/);
  assert.match(apiClientSource, /ui_upl_c07_contact_value_write/);
  assert.match(apiClientSource, /path:\s*"\/api\/crm\/contacts"/);
  assert.match(apiClientSource, /patchCrmContact/);
  assert.match(apiClientSource, /\/api\/crm\/accounts\/\$\{encodeURIComponent\(accountId\)\}\/contacts/);
  assert.match(apiClientSource, /\/api\/record-actions\/\$\{runtime\.objectName\}\$\{suffix\}/);
  assert.match(apiClientSource, /fetchRecordActionFields/);
  assert.match(apiClientSource, /fetchRecordBulkActions/);
  assert.match(apiClientSource, /fetchRecordActionAudit/);
  assert.match(apiClientSource, /updateRecordActionField/);
  assert.match(apiClientSource, /bulkUpdateRecordActions/);
  assert.match(apiClientSource, /owner_change/);
  assert.match(apiClientSource, /\/api\/crm\/opportunities\/\$\{encodeURIComponent\(opportunityId\)\}\/handoff/);
  assert.match(apiClientSource, /\/api\/intake\/conflict-checks/);
  assert.match(apiClientSource, /\/api\/intake\/conflict-decisions/);
  assert.match(apiClientSource, /\/api\/intake\/waivers/);
  assert.match(apiClientSource, /\/api\/intake\/engagements/);
  assert.match(apiClientSource, /conflictHits/);
  assert.match(apiClientSource, /hitCount/);
  assert.match(apiClientSource, /conflictReview/);
  assert.match(apiClientSource, /engagementReady/);
  assert.match(apiClientSource, /engagementReview/);
  assert.match(apiClientSource, /clearanceLinkReady/);
  assert.match(apiClientSource, /\/api\/intake\/clearance-tokens/);
  assert.doesNotMatch(apiClientSource, /engagement:\$\{clearanceId\}/);
  assert.match(apiClientSource, /\/api\/intake\/audit/);
  assert.match(apiClientSource, /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/command-center/);
  assert.match(apiClientSource, /registerMatterParty/);
  assert.match(apiClientSource, /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/parties/);
  assert.match(apiClientSource, /normalizeMatterOpeningPayload/);
  assert.match(apiClientSource, /createMatterDocumentFacade/);
  assert.match(apiClientSource, /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/documents/);
  assert.match(apiClientSource, /fetchMatterDocumentTemplates/);
  assert.match(apiClientSource, /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/document-templates/);
  assert.match(apiClientSource, /createMatterBuilderDraft/);
  assert.match(apiClientSource, /patchMatterBuilderDraft/);
  assert.match(apiClientSource, /fetchMatterBuilderDraftPreview/);
  assert.match(apiClientSource, /requestMatterBuilderApproval/);
  assert.match(apiClientSource, /fetchMatterBuilderApprovalRequests/);
  assert.match(apiClientSource, /publishMatterBuilderDraftToVault/);
  assert.match(apiClientSource, /createMatterEmailDraft/);
  assert.match(apiClientSource, /patchMatterEmailDraft/);
  assert.match(apiClientSource, /requestMatterEmailDraftSendBoundary/);
  assert.match(apiClientSource, /approvalRequest/);
  assert.match(apiClientSource, /publishState/);
  assert.match(apiClientSource, /fetchClientMatterImportTargets/);
  assert.match(apiClientSource, /fetchClientMatterImportJobs/);
  assert.match(apiClientSource, /createClientMatterImportJob/);
  assert.match(apiClientSource, /stageImportSourceFile/);
  assert.match(apiClientSource, /fetchClientMatterImportPreview/);
  assert.match(apiClientSource, /saveImportFieldMapping/);
  assert.match(apiClientSource, /dryRunClientMatterImport/);
  assert.match(apiClientSource, /executeClientMatterImport/);
  assert.match(apiClientSource, /rollbackClientMatterImport/);
  assert.match(apiClientSource, /fetchClientMatterImportErrorReport/);
  assert.match(apiClientSource, /\/api\/import-jobs/);
  assert.match(apiClientSource, /\/api\/import-targets/);
  assert.match(apiClientSource, /\/api\/admin\/permission-sets/);
  assert.match(apiClientSource, /\/api\/admin\/permission-assignments/);
  assert.match(apiClientSource, /\/api\/admin\/object-manager\/objects/);
  assert.match(apiClientSource, /\/api\/admin\/connected-apps/);
  assert.match(apiClientSource, /\/api\/admin\/audit/);
  assert.match(apiClientSource, /fetchPermissionSets/);
  assert.match(apiClientSource, /createPermissionSet/);
  assert.match(apiClientSource, /patchPermissionSet/);
  assert.match(apiClientSource, /fetchPermissionAssignments/);
  assert.match(apiClientSource, /assignPermissionSet/);
  assert.match(apiClientSource, /revokePermissionSetAssignment/);
  assert.match(apiClientSource, /fetchObjectManagerObjects/);
  assert.match(apiClientSource, /fetchObjectManagerFields/);
  assert.match(apiClientSource, /patchObjectFieldPolicy/);
  assert.match(apiClientSource, /fetchConnectedApps/);
  assert.match(apiClientSource, /createConnectedApp/);
  assert.match(apiClientSource, /disableConnectedApp/);
  assert.match(apiClientSource, /fetchAdminPermissionAudit/);
  assert.match(apiClientSource, /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}/);
  assert.match(apiClientSource, /updateMatterInlineFields/);
  assert.match(apiClientSource, /fieldPatch/);
  assert.match(apiClientSource, /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/status-transitions/);
  assert.match(apiClientSource, /\/api\/matters\/recently-viewed/);
  assert.match(apiClientSource, /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/recently-viewed/);
  assert.match(apiClientSource, /normalizeMatterTeamMemberPayload/);
  assert.match(apiClientSource, /ownerAssignment/);
  assert.match(apiClientSource, /completeMatterStatus/);
  assert.match(apiClientSource, /\/api\/matters\/audit/);
  assert.match(apiClientSource, /fetchMatterVaultDocuments/);
  assert.match(apiClientSource, /fetchMatterVaultSearch/);
  assert.match(apiClientSource, /fetchMatterVaultAudit/);
  assert.match(apiClientSource, /\/api\/vault\/documents/);
  assert.match(apiClientSource, /\/api\/vault\/search/);
  assert.match(apiClientSource, /\/api\/vault\/audit/);
  assert.match(apiClientSource, /path:\s*"\/api\/finance\/time-entries"/);
  assert.match(apiClientSource, /const timeEntryId = uiRuntimeId\("time_ui"\)/);
  assert.match(apiClientSource, /idempotency_key: timeEntryId/);
  assert.match(apiClientSource, /billable/);
  assert.doesNotMatch(apiClientSource, /idempotency_key:\s*`ui-time:\$\{matterId\}`/);
  assert.match(apiClientSource, /\/api\/finance\/audit/);
  assert.match(apiClientSource, /\/api\/finance\/wip/);
  assert.match(apiClientSource, /\/api\/finance\/payments/);
  assert.match(apiClientSource, /\/api\/analytics\/refresh/);
  assert.match(apiClientSource, /\/api\/analytics\/matter-profitability/);
  assert.match(apiClientSource, /createAnalyticsExport/);
  assert.match(apiClientSource, /\/api\/analytics\/exports/);
  assert.doesNotMatch(apiClientSource, /mergeCrmContact|deleteCrmContact|postCrmContactMerge/);
  assert.match(peopleSource, /data-hrx-api-backed="true"/);
  assert.doesNotMatch(peopleSource, /data-people-dashboard="true"/);
  assert.doesNotMatch(peopleSource, /currentSection === "people-dashboard"/);
  for (const title of ["신규 고객", "잠재 고객\/접촉", "매출 순위", "고객 미팅", "미수금"]) {
    assert.doesNotMatch(peopleSource, new RegExp(title));
  }
  for (const source of ["fetchCrmAccounts", "fetchCrmLeads", "fetchCrmOpportunities", "fetchCrmContacts", "fetchCrmActivities", "fetchAnalyticsFinanceClients"]) {
    assert.doesNotMatch(peopleSource, new RegExp(source));
  }
  assert.match(peopleSource, /: "people-members"/);
  assert.match(peopleSource, /data-people-work-layer="white"/);
  assert.doesNotMatch(peopleSource, /PageHeader|peopleTitle|구성원 관리/);
  assert.match(peopleSource, /data-people-detail-open=\{selectedEmployeeId \? "true" : "false"\}/);
  assert.match(peopleSource, /data-people-detail-overlay="open"/);
  assert.match(peopleSource, /data-people-detail-panel="open"/);
  assert.match(peopleSource, /role="dialog"/);
  assert.match(peopleSource, /aria-modal="true"/);
  assert.match(peopleSource, /people-detail-backdrop/);
  assert.match(peopleSource, /setSelectedEmployeeId\(null\)/);
  assert.doesNotMatch(peopleSource, /people-directory-grid detail-open/);
  assert.match(peopleSource, /selectedEmployeeId=\{selectedEmployeeId\}/);
  assert.match(stylesSource, /\.people-detail-overlay\s*\{[\s\S]*position: fixed;[\s\S]*z-index: 140;/);
  assert.match(stylesSource, /\.people-detail-backdrop\s*\{[\s\S]*background: rgba\(15, 23, 42, 0\.46\);[\s\S]*backdrop-filter: blur\(1px\);/);
  assert.match(stylesSource, /\.people-detail-panel\s*\{[\s\S]*right: 0;[\s\S]*width: min\(440px, 100vw\);[\s\S]*box-shadow: -18px 0 44px rgba\(15, 23, 42, 0\.18\);[\s\S]*animation: notification-drawer-in 180ms ease-out both;/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.people-detail-panel/);
  assert.match(stylesSource, /@media \(max-width:\s*1180px\)[\s\S]*\.people-detail-panel[\s\S]*width: min\(390px, calc\(100vw - 22px\)\);/);
  assert.match(workforceDirectorySource, /현재 재직/);
  assert.match(workforceDirectorySource, /입사예정/);
  assert.match(workforceDirectorySource, /퇴사예정/);
  assert.doesNotMatch(workforceDirectorySource, /data-hr-workforce-more|data-hr-workforce-add(?:-menu)?/);
  assert.doesNotMatch(workforceDirectorySource, /className="primary-button"[\s\S]{0,240}구성원 추가/);
  assert.match(workforceDirectorySource, /data-hr-workforce-table-options="true"/);
  assert.match(stylesSource, /\.hr-roster-table-wrap \{[\s\S]{0,140}overflow-x: hidden;/);
  assert.match(stylesSource, /\.hr-roster-table \{[\s\S]{0,140}min-width: 0;[\s\S]{0,80}max-width: 100%;/);
  assert.doesNotMatch(stylesSource, /\.hr-roster-table \{[\s\S]{0,120}min-width: 1040px;/);
  assert.match(workforceDirectorySource, /<HeaderCell icon=\{FileText\}>구성원<\/HeaderCell>[\s\S]*<HeaderCell icon=\{CircleUserRound\}>직위<\/HeaderCell>[\s\S]*<HeaderCell icon=\{Building2\}>부서<\/HeaderCell>[\s\S]*<HeaderCell icon=\{GitBranch\}>상사<\/HeaderCell>[\s\S]*<HeaderCell icon=\{Mail\}>이메일<\/HeaderCell>/);
  assert.doesNotMatch(workforceDirectorySource, />소속<\/HeaderCell>|hr-roster-col-affiliation|hr-roster-organization-row|rowsByOrganization/);
  assert.doesNotMatch(workforceDirectorySource, />소스</);
  assert.doesNotMatch(workforceDirectorySource, />작성자</);
  assert.doesNotMatch(workforceDirectorySource, /PETRA_AFFILIATION_NAMES/);
  assert.match(workforceDirectorySource, /affiliationLabel\(employee\)/);
  assert.match(workforceDirectorySource, /stringField\(employee, "affiliation"\)/);
  assert.match(workforceDirectorySource, /stringField\(employee, "organization_group"\)/);
  assert.match(workforceDirectorySource, /<HeaderCell icon=\{Mail\}>이메일<\/HeaderCell>/);
  assert.doesNotMatch(workforceDirectorySource, />마지막 변경</);
  assert.doesNotMatch(workforceDirectorySource, />최근 확인</);
  assert.match(workforceDirectorySource, /<button type="button" className="hr-roster-person"[\s\S]*<strong>\{row\.name\}<\/strong>[\s\S]*<\/button>[\s\S]*<td>\{row\.jobTitle\}<\/td>/);
  assert.doesNotMatch(workforceDirectorySource, /className="hr-roster-person"[\s\S]*?<small>\{row\.jobTitle\}<\/small>[\s\S]*?<\/button>/);
  assert.match(workforceDirectorySource, /stringField\(employee, "work_email"\)/);
  assert.match(workforceDirectorySource, /function organizationGroupLabel\(department: string\)/);
  assert.match(workforceDirectorySource, /text === "법무" \|\| normalized\.includes\("legal"\)[\s\S]*return "Legal"/);
  assert.match(workforceDirectorySource, /text === "재무" \|\| normalized\.includes\("finance"\)[\s\S]*return "Finance"/);
  assert.match(workforceDirectorySource, /text === "경영지원실" \|\| normalized\.includes\("staff"\)[\s\S]*return "Staff"/);
  assert.doesNotMatch(workforceDirectorySource, /departmentDisplayLabel|\u2696\uFE0F|\uD83D\uDCB0|\uD83D\uDC65/);
  assert.match(workforceDirectorySource, /if \(source === "Legal"\) return <Scale size=\{15\} \/>/);
  assert.match(workforceDirectorySource, /if \(source === "Finance"\) return <CircleDollarSign size=\{15\} \/>/);
  assert.match(workforceDirectorySource, /if \(source === "Staff"\) return <UsersRound size=\{15\} \/>/);
  assert.doesNotMatch(workforceDirectorySource, /<strong>\{organization\}<\/strong>/);
  assert.match(workforceDirectorySource, /className="hr-roster-source"[\s\S]*\{row\.department\}/);
  assert.match(stylesSource, /\.hr-roster-source\s*\{[\s\S]*font-weight: 400;[\s\S]*white-space: nowrap;/);
  assert.match(stylesSource, /\.hr-roster-table\s*\{[\s\S]*min-width: 0;[\s\S]*max-width: 100%;[\s\S]*table-layout: fixed;/);
  assert.match(peopleSource, /createPortal\([\s\S]*people-detail-overlay[\s\S]*document\.body/);
  assert.match(stylesSource, /\.hr-roster-col-member\s*\{[\s\S]*width: 24%;/);
  assert.match(stylesSource, /\.hr-roster-col-manager\s*\{[\s\S]*width: 16%;/);
  assert.match(stylesSource, /\.hr-roster-col-email\s*\{[\s\S]*width: 27%;/);
  assert.match(workforceDirectorySource, /<HeaderCell icon=\{GitBranch\}>상사<\/HeaderCell>/);
  assert.match(workforceDirectorySource, /managerName: stringField\(employee, "manager_display_name"\) \|\| "없음"/);
  assert.match(workforceDirectorySource, /\/\[가-힣\]\/\.test\(text\)/);
  assert.match(workforceDirectorySource, /onSelectEmployee\?\.\(null\)/);
  assert.match(workforceDirectorySource, /aria-pressed=\{isSelected \? "true" : "false"\}/);
  assert.match(peopleSource, /PermissionAdminPanel/);
  assert.match(peopleSource, /people-admin/);
  assert.match(peopleApiSource, /\/api\/hrx\/employees/);
  assert.match(peopleApiSource, /professional_profile/);
  assert.doesNotMatch(peopleApiSource, /localHrxRosterEmployees|localHrxRosterOrgChart/);
  assert.match(peopleApiSource, /result\.kind !== "data" \|\| !Array\.isArray\(result\.body\.employees\)[\s\S]*kind: "error"/);
  assert.match(peopleLocalRosterSource, /hrx-member-roster-source-of-truth\.json/);
  assert.match(employeeProfileSource, /<Property label="상사"/);
  const memberFailureCopy = new RegExp(["구성원 목록을", "불러오지 못했습니다"].join(".*"));
  const runtimeContextCopy = new RegExp(["로컬 런타임", "권한 컨텍스트"].join(".*"));
  assert.doesNotMatch(`${workforceDirectorySource}\n${employeeListSource}`, memberFailureCopy);
  assert.doesNotMatch(`${workforceDirectorySource}\n${employeeListSource}`, runtimeContextCopy);
  assert.match(employeeProfileSource, /data-people-professional-profile-kind=\{profileKind\}/);
  assert.match(employeeProfileSource, /주요 경력/);
  assert.match(employeeProfileSource, /자격/);
  assert.match(employeeProfileSource, /출처/);
  assert.doesNotMatch(peopleApiSource, /mock/i);
});

test("secondary runtime capabilities are represented by four-axis coverage, with C13 Portal mounted as a product route", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const capabilityMap = await readWebFile("src/data/capabilityMap.js");

  for (const surface of [
    "FinanceSurface",
    "AnalyticsSurface",
    "AskSurface",
    "ReadinessSurface",
    "OpsSurface",
    "IntakeSurface",
    "ProfilesSurface"
  ]) {
    assert.doesNotMatch(appSource, new RegExp(surface));
  }
  assert.match(appSource, /PortalSurface/);
  for (const endpoint of [
    "/api/finance/time-entries",
    "/api/analytics/dashboards",
    "/api/ai/review-queue",
    "/api/crm/opportunities",
    "/api/intake/requests",
    "/api/portal/dashboard",
    "/api/data-room/projections"
  ]) {
    assert.match(capabilityMap, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("canonical product source contains no local dummy dataset markers", async () => {
  const files = [
    "src/App.jsx",
    "src/data/nav.js",
    "src/data/apiClient.js",
    "src/data/capabilityMap.js",
    "src/components/Shell.jsx",
    "src/components/HomeSurface.jsx",
    "src/components/ClientsSurface.jsx",
    "src/components/MattersSurface.jsx",
    "src/components/MatterOpeningWizard.jsx",
    "src/components/MatterTeamRoster.jsx",
    "src/components/VaultSurface.jsx",
    "src/people/PeopleHome.tsx"
  ];
  const forbidden = /mockData|tenant_[a-z0-9_]*synthetic|synthetic tenant|Project Atlas|Alex Smith|Riverstone|matter_ui_|member_ui|M-UI|user_rp|party_rp|emp-002|cand-001|Sam Lee|Jane Smith|content-mobbin|Kim Seoyun|Seoyun Kim|seoyun@amic\.law|associate@amic\.law|policy-console-draft|1072200723643/;
  for (const file of files) {
    const source = await readWebFile(file);
    assert.doesNotMatch(source, forbidden, `${file} must not carry local dummy dataset markers`);
  }
});

test("product source does not carry KPI cards, pill chips, or known sample UI data", async () => {
  const files = [
    ...(await listWebSourceFiles("src/components")),
    ...(await listWebSourceFiles("src/people")),
    ...(await listWebSourceFiles("src/admin")),
    ...(await listWebSourceFiles("src/candidate"))
  ].filter((file) => file !== "src/people/hrxApiClient.ts");
  const forbiddenSource =
    /MetricCard|metric-grid|clients-metric-grid|people-metric-grid|command-center-grid|capability-card|capability-counts|boundary-ledger|pill-blue|pill-green|recipient-chip|report-chip|Product axes|Record views|Protected actions|Release status|visible records|record views|safeguards|Policy acknowledgement|Provision core access|Complete I-9|DMS:policy-ack|onb-001|off-001|emp_amic|cand-001|Sam Lee|Jane Smith|content-mobbin|Kim Seoyun|Seoyun Kim|seoyun@amic\.law|associate@amic\.law|Page Views|America\/Detroit|1072200723643|Supabase|Next\.js|policy-console-draft|2026\.2|2026-08-01|Start Workspace|Sign up with Google|Data Storage Location|Work Areas|Client Portal|Matter Graph|\bDMS\b|\bBilling\b/;
  for (const file of files) {
    const source = await readWebFile(file);
    assert.doesNotMatch(source, forbiddenSource, `${file} must not carry KPI, pill, or known sample UI markers`);
  }
});

test("product tables do not render raw ids or dummy KPI values", async () => {
  const finance = await readWebFile("src/components/FinanceSurface.jsx");
  assert.doesNotMatch(finance, /\[item\.(time_entry_id|invoice_id|ar_aging_snapshot_id|matter_id|role_id)/);

  const analytics = await readWebFile("src/components/AnalyticsSurface.jsx");
  assert.doesNotMatch(analytics, /item\.dashboard_id|item\.metric_value/);

  const ask = await readWebFile("src/components/AskSurface.jsx");
  assert.doesNotMatch(ask, /item\.review_task_id|item\.ai_output_id|item\.reviewer_role\]/);

  const hrAi = await readWebFile("src/people/ai/HRAIAssistant.tsx");
  assert.doesNotMatch(hrAi, /\[item\.review_id|<strong>{result\.outcome}<\/strong>|readable\(/);

  const recruiting = await readWebFile("src/people/recruiting/RecruitingPipeline.tsx");
  assert.doesNotMatch(recruiting, /job\.position_count\]/);
  assert.match(recruiting, /recruiting-row-detail/);
  assert.match(recruiting, /합격 전환/);
  assert.match(recruiting, /보상 참조/);

  const leave = await readWebFile("src/people/leave/LeaveRequestPage.tsx");
  assert.doesNotMatch(leave, /available_balance\s*\?\?|,\s*request\.amount\s*,/);

  const portal = await readWebFile("src/components/PortalSurface.jsx");
  assert.doesNotMatch(portal, /item\.matter_count,\s*item\.open_rfi_count/);

  const employees = await readWebFile("src/people/employees/EmployeeList.tsx");
  assert.doesNotMatch(employees, /<small>{employee\.work_email/);

  const employeeProfile = await readWebFile("src/people/employees/EmployeeProfile.tsx");
  assert.match(employeeProfile, /data-hrx-compensation-records/);
  assert.match(employeeProfile, /마스킹 참조/);
  assert.doesNotMatch(employeeProfile, /compensation_amount|amount_minor|encrypted_amount_ref/);

  const auth = await readWebFile("src/components/AuthSurface.jsx");
  assert.doesNotMatch(auth, /Start Workspace|Sign up with Google|Data Storage Location|Work Areas|Client Portal|Matter Graph|\bDMS\b|\bBilling\b/);
});

test("product UI copy does not expose developer-facing implementation wording", async () => {
  const files = [
    "src/App.jsx",
    "src/i18n.js",
    ...(await listWebSourceFiles("src/components")),
    ...(await listWebSourceFiles("src/people")),
    ...(await listWebSourceFiles("src/admin")),
    ...(await listWebSourceFiles("src/candidate"))
  ].filter((file) => file !== "src/people/hrxApiClient.ts");
  const forbiddenVisibleCopy =
    /Start the Law Firm OS API|Start the API|API unavailable|No local|mock fallback|No .*mock|static fallback|local .*fallback|endpoint coverage|Read endpoints|Action endpoints|apps\/web product UI|route contract|raw payload|RAG evidence|source objects|master-data records|Fetching ClientGroup|ClientGroup records|<strong>ClientGroup|Number seed|M365 placeholder|staged locally|static response is rendered|No static|API-backed People runtime|meta="API-backed"|API-backed runtime state|API-backed onboarding|eyebrow="LCX-WEB"|eyebrow="CMP-G[0-9]+|title="CMP-G[0-9]+|permission-gated|Runtime guarded|Runtime Boundary|R4 write-ready|meta="\/api|from \/api|Loading .*HRX|HRX Audit|HRX Policy|tenant-scoped|Scoped by tenant|for this tenant|label="Tenant"|Evidence Binding|>permission_ref<|>ui_state<|>model_type<|source_ref rendered|Source Ref|Resume Ref|raw storage|raw path|MatterVaultLink|denied counts|Launch Visual Labeling|Explore demo|Report slowness|go-live|release gates|Production-ready|Script tag detected|New Web Experiment|Generate Chart with AI|Language models can make mistakes|AI assistant is temporarily unavailable|Workspace analytics summary|Getting Started KPIs|Product KPIs|권한 기준에 맞춰 표시됩니다|병합 검토 상태는|데이터 보강 상태는|보고서와 손익은|권한 기준 적용|권한이 있는 .*만 표시|제공자 receipt|제공자 차단|공급자 차단|조건부 전역화 항목|런타임 연결과 권한 컨텍스트|Matter app 원천|bridge status read|fail-closed|write=false|reference-only|문서 바이트.*저장 경로|본문과 병합 값은 숨깁|수신자와 본문 원문은 숨깁|본문 비공개|원본 행 미노출/i;

  for (const file of files) {
    const source = await readWebFile(file);
    assert.doesNotMatch(source, forbiddenVisibleCopy, `${file} must keep implementation wording out of product UI copy`);
  }
});

test("HRX audit UI preserves server-owned step-up and no local fallback", async () => {
  const auditSource = await readWebFile("src/admin/hrx/HRXAuditViewer.tsx");
  const challengeSource = await readWebFile("src/people/security/HrxStepUpChallenge.tsx");
  const peopleApiSource = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(auditSource, /HrxStepUpChallenge/);
  assert.match(auditSource, /step_up_required/);
  assert.match(peopleApiSource, /body\?\.step_up_required === true/);
  assert.match(challengeSource, /권한 확인/);
  assert.doesNotMatch(challengeSource, /Trusted session only|Additional verification required|protected activity/);
  assert.doesNotMatch(challengeSource, /x-lawos-hrx-step-up|tenant-a|actor_id|mfa: true/);
  assert.match(peopleApiSource, /tenant_amic_matter_vault/);
  assert.match(peopleApiSource, /lawos\.session\.envelope/);
  assert.match(peopleApiSource, /sessionHrxRuntimeHeaders/);
  assert.match(peopleApiSource, /user_amic_yjlee/);
  assert.match(peopleApiSource, /lawos_staff/);
  assert.doesNotMatch(peopleApiSource, /security_admin,hr_admin,people_ops/);
  assert.doesNotMatch(peopleApiSource, /const HRX_USER_REF = "user_amic_jwsuh"/);
  assert.match(peopleApiSource, /x-lawos-tenant-id/);
  assert.match(peopleApiSource, /x-lawos-hrx-scopes/);
  assert.match(peopleApiSource, /x-lawos-hrx-step-up/);
  assert.doesNotMatch(peopleApiSource, /HRX_PERMISSION_CONTEXT/);
});

test("HRX lifecycle board stays API-backed from People runtime", async () => {
  const peopleSource = await readWebFile("src/people/PeopleHome.tsx");
  const lifecycleSource = await readWebFile("src/people/lifecycle/LifecycleBoard.tsx");
  const peopleApiSource = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(peopleSource, /LifecycleBoard/);
  assert.match(lifecycleSource, /fetchHrxLifecycleBoard/);
  assert.match(lifecycleSource, /updateHrxOnboardingTask/);
  assert.match(lifecycleSource, /closeHrxOffboardingCase/);
  assert.match(lifecycleSource, /taskTitleLabel/);
  assert.match(lifecycleSource, /documentSummary/);
  assert.match(lifecycleSource, /offboardingChecklistSummary/);
  assert.match(lifecycleSource, /회수 확인 필요/);
  assert.match(lifecycleSource, /Matter 재배정 필요/);
  assert.match(lifecycleSource, /인수인계 필요/);
  assert.match(lifecycleSource, /HRX_OFFBOARDING_CLOSE_BLOCKED/);
  assert.match(lifecycleSource, /입퇴사 관리 업무를 불러오지 못했습니다/);
  assert.doesNotMatch(lifecycleSource, /<strong>{task\.title}<\/strong>|plan\.employee_id|plan\.document_refs\?\.join|<strong>{caseItem\.offboarding_id}<\/strong>|caseItem\.employee_id/);
  assert.match(peopleApiSource, /\/api\/hrx\/lifecycle\/onboarding/);
  assert.match(peopleApiSource, /\/api\/hrx\/lifecycle\/offboarding/);
  assert.doesNotMatch(lifecycleSource, /mockData|profileRows|matters/);
});

test("HRX risk dashboard runs legal-five scan through HRX APIs", async () => {
  const riskSource = await readWebFile("src/people/security/HrxRiskDashboard.tsx");
  const peopleHomeSource = await readWebFile("src/people/PeopleHome.tsx");
  const peopleCatalogSource = await readWebFile("src/people/peopleFeatureCatalog.js");
  const peopleApiSource = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(peopleHomeSource, /people-risk/);
  assert.match(peopleHomeSource, /HrxRiskDashboard/);
  assert.match(peopleCatalogSource, /section: "people-risk"/);
  assert.match(peopleCatalogSource, /label: "HR 리스크"/);
  assert.match(peopleApiSource, /fetchHrxRiskEvents/);
  assert.match(peopleApiSource, /scanHrxRiskEvents/);
  assert.match(peopleApiSource, /transitionHrxRiskEvent/);
  assert.match(peopleApiSource, /\/api\/hrx\/risks/);
  assert.match(peopleApiSource, /\/api\/hrx\/risks\/scan/);
  for (const label of ["근로계약 미체결", "연차촉진 대상", "법정교육 미이수", "초과근로 위험", "퇴사자 권한 미회수"]) {
    assert.match(riskSource, new RegExp(label));
  }
  assert.match(riskSource, /data-hrx-risk-dashboard="true"/);
  assert.match(riskSource, /data-hrx-risk-scan="true"/);
  assert.match(riskSource, /data-hrx-risk-event-list="true"/);
  assert.match(riskSource, /acknowledged/);
  assert.doesNotMatch(riskSource, /mockData|staticRisk|sampleRisk|faker|hardcodedEvents/);
});
