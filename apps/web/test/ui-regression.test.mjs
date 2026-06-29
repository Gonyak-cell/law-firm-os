import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

test("post-login product UI routes only Client, Matter, People, and Vault", async () => {
  const navSource = await readWebFile("src/data/nav.js");
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const globalUtilitySource = await readWebFile("src/data/globalUtilities.js");
  const peopleCatalogSource = await readWebFile("src/people/peopleFeatureCatalog.js");
  const peopleNavigationSource = `${shellSource}\n${peopleCatalogSource}`;
  const canonicalViews = ["clients", "matters", "people", "vault"];
  const removedViews = [
    "content",
    "portal",
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
  assert.match(shellSource, /aria-label="Home Client Matter People Vault"/);
  assert.match(appSource, /view === "home"/);
  assert.match(appSource, /view === "auth"/);
  for (const view of removedViews) {
    assert.doesNotMatch(navSource, new RegExp(`id: "${view}"`));
    assert.doesNotMatch(appSource, new RegExp(`view === "${view}"`));
  }
  assert.match(shellSource, /data-product-axis-nav="top-header"/);
  assert.match(shellSource, /navItems\.map/);
  assert.match(appSource, /function navigateToView/);
  assert.match(appSource, /window\.history\.pushState/);
  assert.doesNotMatch(appSource, /scrollIntoView/);
  assert.match(shellSource, /activeSection/);
  assert.match(shellSource, /const showGlobalUtilityNav = view === "home"/);
  assert.match(shellSource, /\{showGlobalUtilityNav && \(/);
  assert.match(shellSource, /data-global-sidebar-nav="home-only"/);
  assert.match(shellSource, /aria-label="Home 빠른 메뉴"/);
  assert.doesNotMatch(shellSource, />공통<|aria-label="공통 메뉴"/);
  assert.match(shellSource, /"sidebar-item global-sidebar-item/);
  assert.match(shellSource, /<span className="sidebar-icon"><Icon size=\{16\} \/><\/span>/);
  assert.match(appSource, /globalUtilityViewIds/);
  assert.match(appSource, /resolveGlobalShortcut/);
  assert.match(globalUtilitySource, /data-import-client/);
  assert.match(globalUtilitySource, /data-import-matter/);
  assert.match(globalUtilitySource, /messages-matter-channel/);
  for (const label of ["메시지", "알림", "요청함", "보고서", "설정", "전자계약"]) {
    assert.match(globalUtilitySource, new RegExp(`label: "${label}"`));
  }
  assert.doesNotMatch(globalUtilitySource, /label: "Messages"|label: "Notifications"|label: "Requests"|label: "Reports"|label: "Settings"|label: "E-Sign"/);
  assert.match(shellSource, /client-import/);
  for (const label of ["Client 홈", "Client 목록", "담당자", "Opportunity", "상담·문의", "접촉 이력", "제안·계약", "Client 관계", "이해상충 확인", "청구·수금", "Client 리포트", "Client 설정"]) {
    assert.match(shellSource, new RegExp(label));
  }
  for (const label of ["사건 운영", "홈", "사건 목록", "신규 사건", "수임 진행", "종결 처리", "보관 사건", "업무 진행", "업무 보드", "할 일", "외부 일정", "메모·검토 의견", "문서·자료", "사건 문서", "증거·자료", "양식·템플릿", "인장·날인", "소통·참여", "이메일·메시지", "회의·통화 기록", "공지·공유", "담당자·참여자", "의뢰인 요청", "결재·청구", "결재·승인", "시간 기록", "비용 처리", "청구 내역", "미수금", "리포트·관리", "사건 리포트", "검색·통계", "사건 위험", "감사 이력", "연동·알림", "사건 설정"]) {
    assert.match(shellSource, new RegExp(label));
  }
  assert.match(shellSource, /peopleNavigationGroups/);
  assert.match(shellSource, /peopleSidebarGroups/);
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
  assert.match(peopleNavigationSource, /people-admin/);
  assert.match(peopleNavigationSource, /people-work-schedule-external/);
  assert.doesNotMatch(appSource, /MatterModal|initialVariant|initialDataMode|setModal|mockData/);
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
  assert.doesNotMatch(i18nSource, /Project Atlas/);
});

test("desktop post-login route docks logo before five-axis contextual shell", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");
  const stylesSource = await readWebFile("src/styles.css");
  const desktopSource = await readFile(resolve(webRoot, "../desktop/src/renderer/offline.html"), "utf8");

  assert.match(desktopSource, /web\/index\.html\?desktop=1&view=home&data=live&ctx=allow&splash=1/);
  assert.match(desktopSource, /LAWOS_SESSION_ENVELOPE_STORAGE_KEY = "lawos\.session\.envelope"/);
  assert.match(desktopSource, /LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION = "law-firm-os\.desktop-web-session-envelope\.v0\.1"/);
  assert.match(desktopSource, /function desktopSessionEnvelope/);
  assert.match(desktopSource, /actor_ref: actorRef/);
  assert.match(desktopSource, /tenant_refs: \{[\s\S]*client: "tenant_rp04_synthetic"[\s\S]*matter: "tenant_rp05_synthetic"[\s\S]*vault: "tenant_amic_matter_vault"/);
  assert.match(desktopSource, /desktop_session_ref/);
  assert.match(desktopSource, /desktop_actor_ref/);
  assert.match(desktopSource, /desktop_tenant_ref/);
  assert.doesNotMatch(desktopSource, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(desktopSource, /access_token|refresh_token|id_token|raw_cookie|Bearer/);
  assert.match(desktopSource, /data-launch-logo-flow/);
  assert.match(desktopSource, /\.auth-stage[\s\S]*place-items:\s*center/);
  assert.match(desktopSource, /\.brand-lockup[\s\S]*brandGap[\s\S]*brandSettle/);
  assert.match(desktopSource, /\.matter-word-wrap[\s\S]*wordReveal/);
  assert.match(desktopSource, /setMatterWordTarget/);
  assert.match(desktopSource, /@keyframes wordReveal[\s\S]*width:\s*var\(--word-target\)/);
  assert.match(desktopSource, /<span class="matter-word">[\s\S]*<span>m<\/span><span>a<\/span><span>t<\/span><span>t<\/span><span>e<\/span><span>r<\/span>/);
  assert.match(desktopSource, /\.\.\/\.\.\/build\/icon-source-mark\.png/);
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
  assert.match(appSource, /data-sidebar-state="contextual"/);
  assert.match(appSource, /notificationsOpen/);
  assert.match(appSource, /<NotificationDrawer open=\{notificationsOpen\}/);
  assert.match(shellSource, /data-product-axis-nav="top-header"/);
  assert.match(shellSource, /data-product-axis=\{id\}/);
  assert.match(shellSource, /aria-current=\{view === id \? "page" : undefined\}/);
  assert.match(shellSource, /data-matter-logo-flow/);
  assert.match(shellSource, /data-context-sidebar=\{view\}/);
  assert.match(shellSource, /topbar-brand/);
  assert.match(shellSource, /sidebar-utilities/);
  assert.match(navSource, /id: "home"/);
  for (const axis of ["home", "clients", "matters", "people", "vault"]) {
    assert.match(navSource, new RegExp(`id: "${axis}"`));
  }
  assert.match(shellSource, /<MatterLogo \/>/);
  assert.doesNotMatch(shellSource, /export function Rail|<nav className="rail-nav"|nav-toggle|sidebarExpanded/);
  assert.doesNotMatch(appSource, /<Rail \/>|sidebarExpanded|initialSidebarExpanded/);
  assert.match(homeSource, /title="오늘의 운영 대기열"/);
  assert.match(homeSource, /data-home-ops-queue="true"/);
  assert.match(homeSource, /실패한 동기화/);
  assert.doesNotMatch(homeSource, /endpoint-strip|endpoint coverage|\$\{endpoint\}/);
  assert.doesNotMatch(homeSource, /MetricCard|metric-grid|Product axes|Record views|Protected actions|Release status|visible records|record views|safeguards|capability-card|capability-counts|boundary-ledger/);
  assert.doesNotMatch(stylesSource, /metric-grid|clients-metric-grid|people-metric-grid|command-center-grid|pill-blue|pill-green|recipient-chip|report-chip/);
  assert.match(homeSource, /work-area-list/);
  assert.match(stylesSource, /\.app-frame[\s\S]*grid-template-columns:\s*var\(--am-sidebar-width\) minmax\(0, 1fr\)/);
  assert.match(stylesSource, /--am-topbar-height:\s*78px/);
  assert.match(stylesSource, /\.topbar-brand/);
  assert.match(stylesSource, /\.top-axis-item[\s\S]*min-width:\s*96px/);
  assert.match(stylesSource, /@media \(max-width:\s*1180px\)[\s\S]*\.top-axis-item[\s\S]*min-width:\s*84px/);
  assert.match(stylesSource, /\.topbar \.global-search[\s\S]*height:\s*38px/);
  assert.match(stylesSource, /\.sidebar-utility/);
  assert.doesNotMatch(stylesSource, /\.app-frame\.sidebar-expanded|\.rail-logo|\.nav-toggle\.active/);
});

test("topbar notifications open a right drawer with global dim and stacked alerts", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const stylesSource = await readWebFile("src/styles.css");

  assert.match(appSource, /setNotificationsOpen\(\(open\) => !open\)/);
  assert.match(appSource, /setNotificationsOpen\(false\)/);
  assert.match(shellSource, /export function NotificationDrawer/);
  assert.match(shellSource, /notificationItems/);
  assert.match(shellSource, /data-notification-trigger="true"/);
  assert.match(shellSource, /aria-expanded=\{notificationsOpen \? "true" : "false"\}/);
  assert.match(shellSource, /data-notification-drawer="open"/);
  assert.match(shellSource, /role="dialog"/);
  assert.match(shellSource, /aria-modal="true"/);
  assert.match(shellSource, /className="notification-scrim"/);
  assert.match(shellSource, /data-notification-card="stacked"/);
  assert.match(shellSource, /알림 <span>3<\/span>/);
  assert.match(shellSource, /모두 읽음 처리/);
  assert.match(shellSource, /알림 설정/);
  assert.doesNotMatch(shellSource, />Notifications|Mark All as Read|>Settings<|status: "Conflict check"|status: "Approval"/);
  assert.match(stylesSource, /\.notification-layer[\s\S]*z-index:\s*140/);
  assert.match(stylesSource, /\.notification-scrim[\s\S]*background:\s*rgba\(15, 23, 42, 0\.46\)/);
  assert.match(stylesSource, /\.notification-drawer[\s\S]*right:\s*0[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(stylesSource, /\.notification-stack[\s\S]*overflow:\s*auto/);
  assert.match(stylesSource, /\.notification-card[\s\S]*grid-template-columns:\s*42px minmax\(0, 1fr\)/);
  assert.match(stylesSource, /@keyframes notification-drawer-in/);
});

test("avatar profile opens a matter-consistent personal profile surface without becoming a product axis", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const profileSource = await readWebFile("src/components/UserProfileSurface.jsx");
  const stylesSource = await readWebFile("src/styles.css");

  assert.match(appSource, /"profile"/);
  assert.match(appSource, /<UserProfileSurface liveCtx=\{liveCtx\} onNavigate=\{navigateToView\} \/>/);
  assert.match(appSource, /onProfile=\{\(\) => navigateToView\("profile"\)\}/);
  assert.match(shellSource, /data-profile-trigger="true"/);
  assert.match(shellSource, /profileSidebarItems/);
  assert.match(shellSource, /data-context-sidebar=\{view\}/);
  assert.doesNotMatch(shellSource, /\{labels\.upgrade\}/);
  assert.match(profileSource, /data-user-profile-surface="matter-consistent"/);
  assert.match(profileSource, /fetchUserProfile/);
  assert.match(profileSource, /data-profile-api-backed="true"/);
  assert.match(profileSource, /data-profile-api-state=\{currentState\}/);
  assert.match(profileSource, /data-profile-route-state="true"/);
  assert.match(profileSource, /data-profile-help-route="settings-support"/);
  assert.match(profileSource, /data-profile-contract-route="matters:matter-opening"/);
  assert.match(profileSource, /data-profile-action-route=\{`\$\{view\}:\$\{section\}`\}/);
  assert.match(profileSource, /계약 정보/);
  assert.match(profileSource, /비용·정산 내역/);
  assert.match(profileSource, /개인정보 관리/);
  assert.match(profileSource, /부재 일정/);
  assert.match(profileSource, /내 프로필/);
  assert.match(profileSource, /프로필 데이터 없음/);
  assert.match(profileSource, /프로필 접근 제한/);
  assert.match(profileSource, /프로필 검토 필요/);
  assert.match(profileSource, /세션 프로필/);
  assert.match(profileSource, /권한이 확인되기 전까지 더미 계약 값을 표시하지 않습니다/);
  assert.doesNotMatch(profileSource, /data-profile-local-state|setLocalAction|data-profile-help-feedback|data-profile-contract-create/);
  assert.doesNotMatch(profileSource, /서지원|jws@matter\.local|법무 운영 매니저|외부 협업자|월 정액 자문|2024년 4월 15일|월 \$30\.00|계정 정리 중|진행 중|>80%<\/strong>|Contracts \/ Agreements|Expenses and claims overview|Personal Information|Time off|My Onboarding|Your Profile|Help & Feedback|계약 \/ 약정|비용 및 청구 현황|오프보딩|유연 지급|출금 방법|MessageCircle/);
  assert.doesNotMatch(profileSource, /deel-/);
  assert.match(stylesSource, /\.matter-profile-surface[\s\S]*background:\s*var\(--am-canvas\)/);
  assert.match(stylesSource, /\.matter-profile-grid[\s\S]*grid-template-columns:\s*minmax\(520px, 1fr\) minmax\(320px, 0\.58fr\)/);
  assert.doesNotMatch(stylesSource, /deel-|#f7f6f2|\.matter-profile-progress-card\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(navSource, /id: "profile"/);
});

test("login surfaces accept only email and password", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const authSource = await readWebFile("src/components/AuthSurface.jsx");
  const stylesSource = await readWebFile("src/styles.css");
  const assetFiles = await readdir(resolve(webRoot, "src/assets"));
  const desktopSource = await readFile(resolve(webRoot, "../desktop/src/renderer/offline.html"), "utf8");

  assert.match(appSource, /onLogin=\{\(\) => \{/);
  assert.match(appSource, /auth-only-app/);
  assert.match(appSource, /view === "auth" && authStep === "login"/);
  assert.match(authSource, /parnas-tower-login\.jpg/);
  assert.match(authSource, /data-login-screen="parnas-split"/);
  assert.match(authSource, /matter-login-photo-panel/);
  assert.match(authSource, /Samseong-dong Parnas Tower/);
  assert.match(authSource, /<MatterLogo \/>/);
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
  assert.match(desktopSource, /api\.login\(\{ email, password \}\)/);
  assert.doesNotMatch(desktopSource, /data-account-select|data-reset-token|data-reset-request|data-reset-confirm|새 비밀번호|재설정 토큰/);
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
  const openingSource = await readWebFile("src/components/MatterOpeningWizard.jsx");
  const rosterSource = await readWebFile("src/components/MatterTeamRoster.jsx");
  const vaultSource = await readWebFile("src/components/VaultSurface.jsx");
  const documentDetailSource = await readWebFile("src/components/DocumentDetail.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");
  const peopleSource = await readWebFile("src/people/PeopleHome.tsx");
  const peopleApiSource = await readWebFile("src/people/hrxApiClient.ts");
  const stylesSource = await readWebFile("src/styles.css");

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
    "matter-evidence",
    "matter-templates",
    "matter-seal",
    "matter-external-schedule",
    "matter-notes",
    "matter-channel",
    "matter-opening",
    "matter-team",
    "matter-client-requests",
    "matter-approvals",
    "matter-time",
    "matter-expenses",
    "matter-billing",
    "matter-ar",
    "matter-analytics",
    "matter-search",
    "matter-risk",
    "matter-audit",
    "matter-integrations",
    "matter-settings"
  ]) {
    assert.match(shellSource, new RegExp(section));
  }
  for (const section of [
    "data-import-client-data",
    "data-import-client",
    "calendar-matter",
    "messages-matter-channel",
    "finance-matter-billing",
    "reports-matter-analytics",
    "data-import-matter"
  ]) {
    assert.match(globalUtilitySource, new RegExp(section));
  }
  assert.match(clientsSource, /data-cmp-g2-live-clients="true"/);
  assert.match(clientsSource, /data-salesforce-client-workspace="list-detail-right-panel"/);
  assert.match(clientsSource, /fetchMasterDataRecords/);
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
  assert.match(clientsSource, /issueIntakeClearanceToken/);
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
  assert.match(clientsSource, /data-crm-contact-create-result="true"/);
  assert.match(clientsSource, /data-crm-contact-patch-action="true"/);
  assert.match(clientsSource, /data-crm-contact-patch-result="true"/);
  assert.match(clientsSource, /data-sf-b-w01r-account-canonical-sync="true"/);
  assert.match(clientsSource, /data-sf-b-w01r-contact-canonical-sync="true"/);
  assert.match(clientsSource, /data-sf-b-w01r-merge-review="true"/);
  assert.match(clientsSource, /data-sf-b-w01r-merge-execute-guarded="true"/);
  assert.match(clientsSource, /data-sf-b-w01r-right-panel-merge-review="true"/);
  assert.match(clientsSource, /data-sf-b-w02-record-actions-panel="true"/);
  assert.match(clientsSource, /data-sf-b-w02-field-registry="true"/);
  assert.match(clientsSource, /data-sf-b-w02-action-audit-feed="true"/);
  assert.match(clientsSource, /data-sf-b-w02-owner-blocked-action="true"/);
  assert.match(clientsSource, /DataCloudEnrichmentPanel ctx=\{liveCtx\}/);
  assert.match(clientsSource, /data-sf-b-w07-right-panel-enrichment-summary="route-backed"/);
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
  assert.match(clientsSource, /data-client-overview-panel="true"/);
  assert.match(clientsSource, /data-client-activities-connected="true"/);
  assert.match(clientsSource, /data-client-contracts-connected="true"/);
  assert.match(clientsSource, /data-client-relationships-connected="true"/);
  assert.match(clientsSource, /data-client-conflict-connected="true"/);
  assert.match(clientsSource, /data-client-billing-connected="true"/);
  assert.match(clientsSource, /data-client-settings-connected="true"/);
  assert.match(clientsSource, /data-client-contract-esign-provider-blocked="true"/);
  assert.match(clientsSource, /data-client-billing-provider-blocked="true"/);
  assert.doesNotMatch(clientsSource, /data-client-planned-section|메뉴를 준비 중입니다/);
  assert.match(clientsSource, /Client, 담당자, Opportunity, 상담 이력/);
  assert.match(clientsSource, /renderLiveState\(result, "Client"\)/);
  assert.match(clientsSource, /권한이 있는 \{noun\}만 표시합니다/);
  assert.match(clientsSource, /검토가 끝나면 \{noun\} 정보를 확인할 수 있습니다/);
  assert.doesNotMatch(clientsSource, /의뢰인/);
  assert.match(clientsSource, /data-intake-clearance-action="true"/);
  assert.match(clientsSource, /live-data-unavailable/);
  assert.match(clientsSource, /live-data-denied/);
  assert.match(clientsSource, /live-data-review/);
  assert.doesNotMatch(clientsSource, /mergeCrmContact|deleteCrmContact|postCrmContactMerge/);
  assert.doesNotMatch(clientsSource, /mockData|ClientsMockSurface/);
  assert.match(mattersSource, /data-cmp-g4-live-matters="true"/);
  assert.match(mattersSource, /data-salesforce-matter-workspace="list-detail-right-panel"/);
  assert.match(mattersSource, /data-matter-selected-record-list="true"/);
  assert.match(mattersSource, /data-matter-select-row="true"/);
  assert.match(mattersSource, /data-matter-saved-list-views="true"/);
  assert.match(mattersSource, /data-matter-list-view-option="true"/);
  assert.match(mattersSource, /data-matter-save-list-view-action="true"/);
  assert.match(mattersSource, /data-matter-bulk-actions="true"/);
  assert.match(mattersSource, /data-matter-bulk-select-row="true"/);
  assert.match(mattersSource, /data-matter-bulk-status-action="true"/);
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
  assert.match(mattersSource, /saveMatterListView/);
  assert.match(mattersSource, /bulkCompleteMatterStatus/);
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
  assert.match(mattersSource, /ImportDataMappingPanel/);
  assert.match(mattersSource, /matter-import/);
  assert.match(mattersSource, /data-matter-billing-actions="true"/);
  assert.match(mattersSource, /data-matter-time-entry-action="true"/);
  assert.match(mattersSource, /data-matter-analytics-actions="true"/);
  assert.match(mattersSource, /data-matter-analytics-export-action="true"/);
  assert.match(mattersSource, /data-matter-analytics-export-safe-state="true"/);
  assert.match(mattersSource, /data-matter-status-transition-action="true"/);
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
  assert.match(mattersSource, /data-sf-b-w03-channel-provider-state="true"/);
  assert.match(mattersSource, /data-sf-b-w03-provider-blocked-result="true"/);
  assert.match(mattersSource, /data-sf-b-w03-right-panel-deadline-highlight="true"/);
  assert.match(mattersSource, /data-sf-b-w03-right-panel-channel-tab="true"/);
  assert.match(mattersSource, /timelineCategory/);
  assert.match(mattersSource, /timelineSourceLabel/);
  assert.match(mattersSource, /ownerLabel/);
  assert.match(mattersSource, /onMatterUpdated=\{applyMatterUpdate\}/);
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
  assert.match(mattersSource, /data-lcx-vltui-06-import-lifecycle=\"dry-run-guarded-execute\"/);
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
  assert.match(vaultSource, /업로드 사전검사/);
  assert.match(vaultSource, /문서 전송 없음/);
  assert.match(vaultSource, /Vault 쓰기는 계속 차단됩니다/);
  assert.match(vaultSource, /data-lcx-vltui-02-action-boundaries="true"/);
  assert.match(vaultSource, /data-vault-version-upload-state/);
  assert.match(vaultSource, /data-vault-metadata-mutation-state/);
  assert.match(vaultSource, /data-vault-legal-hold-state/);
  assert.match(vaultSource, /data-vault-retention-state/);
  assert.match(vaultSource, /data-vault-document-action-state/);
  assert.match(vaultSource, /data-vault-boundary-write-enabled="false"/);
  assert.match(vaultSource, /문서 작업 경계/);
  assert.match(vaultSource, /새 버전 등록/);
  assert.match(vaultSource, /메타데이터 변경/);
  assert.match(vaultSource, /법적 보존/);
  assert.match(vaultSource, /보존 정책/);
  assert.match(vaultSource, /Owner 결정 필요/);
  assert.match(vaultSource, /Vault Records/);
  assert.match(vaultSource, /UUID 직접 입력은 허용하지 않습니다/);
  assert.match(vaultSource, /Matter 연결 상태/);
  assert.match(vaultSource, /토큰 값은 화면에 표시하지 않습니다/);
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
  assert.match(apiClientSource, /\/api\/intake\/clearance-tokens/);
  assert.match(apiClientSource, /\/api\/intake\/audit/);
  assert.match(apiClientSource, /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/command-center/);
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
  assert.match(apiClientSource, /\/api\/finance\/audit/);
  assert.match(apiClientSource, /\/api\/finance\/wip/);
  assert.match(apiClientSource, /\/api\/finance\/payments/);
  assert.match(apiClientSource, /\/api\/analytics\/refresh/);
  assert.match(apiClientSource, /\/api\/analytics\/matter-profitability/);
  assert.match(apiClientSource, /createAnalyticsExport/);
  assert.match(apiClientSource, /\/api\/analytics\/exports/);
  assert.doesNotMatch(apiClientSource, /mergeCrmContact|deleteCrmContact|postCrmContactMerge/);
  assert.match(peopleSource, /data-hrx-api-backed="true"/);
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
  assert.match(workforceDirectorySource, /<HeaderCell icon=\{FileText\}>구성원<\/HeaderCell>[\s\S]*<HeaderCell icon=\{CircleUserRound\}>직위<\/HeaderCell>[\s\S]*<HeaderCell icon=\{CircleUserRound\}>소속<\/HeaderCell>[\s\S]*<HeaderCell icon=\{Building2\}>부서<\/HeaderCell>[\s\S]*<HeaderCell icon=\{Mail\}>이메일<\/HeaderCell>/);
  assert.match(workforceDirectorySource, /<HeaderCell icon=\{CircleUserRound\}>소속<\/HeaderCell>/);
  assert.doesNotMatch(workforceDirectorySource, />소스</);
  assert.doesNotMatch(workforceDirectorySource, />작성자</);
  assert.doesNotMatch(workforceDirectorySource, /PETRA_AFFILIATION_NAMES/);
  assert.match(workforceDirectorySource, /affiliationLabel\(employee\)/);
  assert.match(workforceDirectorySource, /stringField\(employee, "affiliation"\)/);
  assert.match(workforceDirectorySource, /stringField\(employee, "organization_group"\)/);
  assert.match(workforceDirectorySource, /<col className="hr-roster-col-affiliation" \/>/);
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
  assert.match(workforceDirectorySource, /if \(department === "Legal"\) return "AMIC Law"/);
  assert.match(workforceDirectorySource, /if \(department === "Finance"\) return "PETRA BRIDGE PARTNERS"/);
  assert.match(workforceDirectorySource, /const key = row\.organizationGroup \|\| row\.department \|\| "미등록";/);
  assert.match(workforceDirectorySource, /<strong>\{organization\}<\/strong>/);
  assert.match(workforceDirectorySource, /className="hr-roster-source"[\s\S]*\{row\.department\}/);
  assert.match(stylesSource, /\.hr-roster-owner,\s*[\r\n]+\.hr-roster-source\s*\{[\s\S]*font-weight: 400;/);
  assert.match(stylesSource, /\.hr-roster-table\s*\{[\s\S]*min-width: 1040px;[\s\S]*table-layout: fixed;/);
  assert.match(stylesSource, /\.hr-roster-col-affiliation\s*\{[\s\S]*width: 20%;/);
  assert.match(stylesSource, /\.hr-roster-col-email\s*\{[\s\S]*width: 22%;/);
  assert.match(workforceDirectorySource, /\/\[가-힣\]\/\.test\(text\)/);
  assert.match(workforceDirectorySource, /onSelectEmployee\?\.\(null\)/);
  assert.match(workforceDirectorySource, /aria-pressed=\{isSelected \? "true" : "false"\}/);
  assert.match(peopleSource, /PermissionAdminPanel/);
  assert.match(peopleSource, /people-admin/);
  assert.match(peopleApiSource, /\/api\/hrx\/employees/);
  assert.doesNotMatch(peopleApiSource, /mock/i);
});

test("secondary runtime capabilities are represented by four-axis coverage, not separate product routes", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const capabilityMap = await readWebFile("src/data/capabilityMap.js");

  for (const surface of [
    "FinanceSurface",
    "AnalyticsSurface",
    "AskSurface",
    "PortalSurface",
    "ReadinessSurface",
    "OpsSurface",
    "IntakeSurface",
    "ProfilesSurface"
  ]) {
    assert.doesNotMatch(appSource, new RegExp(surface));
  }
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

  const leave = await readWebFile("src/people/leave/LeaveRequestPage.tsx");
  assert.doesNotMatch(leave, /available_balance\s*\?\?|,\s*request\.amount\s*,/);

  const portal = await readWebFile("src/components/PortalSurface.jsx");
  assert.doesNotMatch(portal, /item\.matter_count,\s*item\.open_rfi_count/);

  const employees = await readWebFile("src/people/employees/EmployeeList.tsx");
  assert.doesNotMatch(employees, /<small>{employee\.work_email/);

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
    /Start the Law Firm OS API|Start the API|API unavailable|No local|mock fallback|No .*mock|static fallback|local .*fallback|endpoint coverage|Read endpoints|Action endpoints|apps\/web product UI|route contract|raw payload|RAG evidence|source objects|master-data records|Fetching ClientGroup|ClientGroup records|<strong>ClientGroup|Number seed|M365 placeholder|staged locally|static response is rendered|No static|API-backed People runtime|meta="API-backed"|API-backed runtime state|API-backed onboarding|eyebrow="LCX-WEB"|eyebrow="CMP-G[0-9]+|title="CMP-G[0-9]+|permission-gated|Runtime guarded|Runtime Boundary|R4 write-ready|meta="\/api|from \/api|Loading .*HRX|HRX Audit|HRX Policy|tenant-scoped|Scoped by tenant|for this tenant|label="Tenant"|Evidence Binding|>permission_ref<|>ui_state<|>model_type<|source_ref rendered|Source Ref|Resume Ref|raw storage|raw path|MatterVaultLink|denied counts|Launch Visual Labeling|Explore demo|Report slowness|go-live|release gates|Production-ready|Script tag detected|New Web Experiment|Generate Chart with AI|Language models can make mistakes|AI assistant is temporarily unavailable|Workspace analytics summary|Getting Started KPIs|Product KPIs/i;

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
  assert.match(peopleApiSource, /user_amic_jwsuh/);
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
  assert.match(lifecycleSource, /입퇴사 관리 업무를 불러오지 못했습니다/);
  assert.doesNotMatch(lifecycleSource, /<strong>{task\.title}<\/strong>|plan\.employee_id|plan\.document_refs\?\.join|<strong>{caseItem\.offboarding_id}<\/strong>|caseItem\.employee_id/);
  assert.match(peopleApiSource, /\/api\/hrx\/lifecycle\/onboarding/);
  assert.match(peopleApiSource, /\/api\/hrx\/lifecycle\/offboarding/);
  assert.doesNotMatch(lifecycleSource, /mockData|profileRows|matters/);
});
