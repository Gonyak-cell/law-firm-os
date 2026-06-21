import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function readWebFile(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

test("sample UI regression harness preserves current routable surfaces", async () => {
  const navSource = await readWebFile("src/data/nav.js");
  const appSource = await readWebFile("src/App.jsx");
  const expectedViews = [
    "auth",
    "home",
    "content",
    "clients",
    "matters",
    "vault",
    "portal",
    "readiness",
    "ops",
    "intake",
    "finance",
    "profiles",
    "people",
    "analytics",
    "dashboards",
    "ask",
    "experiments",
    "admin",
    "dark"
  ];

  for (const view of expectedViews) {
    assert.match(navSource, new RegExp(`id: "${view}"`));
    assert.match(appSource, new RegExp(`view === "${view}"`));
  }
});

test("mater startup branding uses shared splash and brand constants", async () => {
  const brandSource = await readWebFile("src/brand/brand.js");
  const splashSource = await readWebFile("src/components/MaterSplash.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const authSource = await readWebFile("src/components/AuthSurface.jsx");
  const i18nSource = await readWebFile("src/i18n.js");

  assert.match(brandSource, /PRODUCT_BRAND\s*=\s*"mater"/);
  assert.match(brandSource, /UI_BRAND\s*=\s*"mater by AMIC"/);
  assert.match(splashSource, /PRODUCT_BRAND\.split\(""\)/);
  assert.match(splashSource, /aria-label=\{UI_BRAND\}/);
  assert.match(shellSource, /<MaterSplash \/>/);
  assert.match(authSource, /<MaterSplash compact className="auth-splash" \/>/);
  assert.match(i18nSource, /PRODUCT_BRAND/);
  assert.doesNotMatch(i18nSource, /Ask matter|Search or ask matter|Loading your matter workspace/);
  assert.doesNotMatch(i18nSource, /matter에게 질문|matter 작업공간|matter는/);
});

test("desktop workspace keeps Matter, Vault, denied, and desktop mode routable", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const mattersSource = await readWebFile("src/components/MattersSurface.jsx");
  const vaultSource = await readWebFile("src/components/VaultSurface.jsx");
  const deniedSource = await readWebFile("src/components/DesktopDeniedState.jsx");
  const runtimeContextSource = await readWebFile("src/desktop/runtimeContext.js");

  assert.match(navSource, /id: "matters"/);
  assert.match(navSource, /id: "vault"/);
  assert.match(appSource, /view === "matters"/);
  assert.match(appSource, /view === "vault"/);
  assert.match(mattersSource, /DesktopDeniedState/);
  assert.match(vaultSource, /DesktopDeniedState/);
  assert.match(deniedSource, /No row counts, snippets, citations, or document metadata are shown/);
  assert.match(runtimeContextSource, /desktopMode/);
  assert.match(runtimeContextSource, /routeSource/);
});

test("Finance runtime surface is routed and live Finance backed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const financeSource = await readWebFile("src/components/FinanceSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(navSource, /id: "finance"/);
  assert.match(appSource, /FinanceSurface/);
  assert.match(appSource, /view === "finance"/);
  assert.match(shellSource, /finance: \["Time entries"/);
  assert.match(financeSource, /data-cmp-g7-finance-surface="true"/);
  assert.match(financeSource, /fetchFinanceTimeEntries/);
  assert.match(financeSource, /fetchFinanceInvoices/);
  assert.match(financeSource, /fetchFinanceArAging/);
  assert.match(apiClientSource, /\/api\/finance\/time-entries/);
  assert.match(apiClientSource, /\/api\/finance\/invoices/);
  assert.match(apiClientSource, /\/api\/finance\/ar-aging/);
  assert.match(apiClientSource, /production_ready_claim/);
  assert.doesNotMatch(financeSource, /mockData|from "\.\.\/data\/mockData/);
});

test("Analytics runtime panel is API-backed and source-safe", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const analyticsSource = await readWebFile("src/components/AnalyticsSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(appSource, /liveCtx=\{initialLiveCtx\}/);
  assert.match(analyticsSource, /data-cmp-g8-analytics-runtime/);
  assert.match(analyticsSource, /fetchAnalyticsDashboards/);
  assert.match(analyticsSource, /raw matter detail remain omitted/);
  assert.match(apiClientSource, /\/api\/analytics\/dashboards/);
  assert.match(apiClientSource, /production_ready_claim/);
  assert.doesNotMatch(analyticsSource, /mockData|from "\.\.\/data\/mockData/);
});

test("Ask AI runtime panel is API-backed and human-review safe", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const askSource = await readWebFile("src/components/AskSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(appSource, /<AskSurface labels=\{labels\} variant=\{initialVariant\} liveCtx=\{initialLiveCtx\}/);
  assert.match(askSource, /data-cmp-g9-ai-runtime/);
  assert.match(askSource, /fetchAiReviewQueue/);
  assert.match(askSource, /Permission-before-AI is enforced/);
  assert.match(apiClientSource, /\/api\/ai\/review-queue/);
  assert.match(apiClientSource, /production_ready_claim/);
  assert.doesNotMatch(apiClientSource, /fetchAiReviewQueue[\s\S]*mockData/);
});

test("Portal/Data Room runtime surface is routed and API-backed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const portalSource = await readWebFile("src/components/PortalSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(navSource, /id: "portal"/);
  assert.match(appSource, /PortalSurface/);
  assert.match(appSource, /view === "portal"/);
  assert.match(shellSource, /portal: \["Client dashboard"/);
  assert.match(portalSource, /data-cmp-g10-portal-runtime/);
  assert.match(portalSource, /fetchPortalDashboard/);
  assert.match(portalSource, /fetchDataRoomProjections/);
  assert.match(portalSource, /Token and document bytes omitted/);
  assert.match(apiClientSource, /\/api\/portal\/dashboard/);
  assert.match(apiClientSource, /\/api\/data-room\/projections/);
  assert.doesNotMatch(portalSource, /mockData|from "\.\.\/data\/mockData/);
});

test("G11 UI readiness surface is routed and API-backed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const readinessSource = await readWebFile("src/components/ReadinessSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(navSource, /id: "readiness"/);
  assert.match(appSource, /ReadinessSurface/);
  assert.match(appSource, /view === "readiness"/);
  assert.match(shellSource, /readiness: \["Navigation IA"/);
  assert.match(readinessSource, /data-cmp-g11-ui-readiness/);
  assert.match(readinessSource, /fetchUiReadinessChecks/);
  assert.match(readinessSource, /PermissionDeniedState/);
  assert.match(apiClientSource, /\/api\/ui\/readiness/);
  assert.match(apiClientSource, /production_ready_claim/);
  assert.doesNotMatch(readinessSource, /mockData|from "\.\.\/data\/mockData/);
});

test("G12 enterprise ops surface is routed and launch-claim safe", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const opsSource = await readWebFile("src/components/OpsSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(navSource, /id: "ops"/);
  assert.match(appSource, /OpsSurface/);
  assert.match(appSource, /view === "ops"/);
  assert.match(shellSource, /ops: \["SSO\/MFA"/);
  assert.match(opsSource, /data-cmp-g12-enterprise-readiness/);
  assert.match(opsSource, /fetchEnterpriseReadinessItems/);
  assert.match(opsSource, /No go-live approval recorded/);
  assert.match(apiClientSource, /\/api\/enterprise\/readiness/);
  assert.match(apiClientSource, /go_live_approved/);
  assert.doesNotMatch(opsSource, /mockData|from "\.\.\/data\/mockData/);
});

test("Intake runtime surface is routed and live CRM/Intake backed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const intakeSource = await readWebFile("src/components/IntakeSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(navSource, /id: "intake"/);
  assert.match(appSource, /IntakeSurface/);
  assert.match(appSource, /view === "intake"/);
  assert.match(shellSource, /intake: \["Opportunity pipeline"/);
  assert.match(intakeSource, /data-cmp-g6-intake-surface="true"/);
  assert.match(intakeSource, /fetchCrmOpportunities/);
  assert.match(intakeSource, /fetchIntakeRequests/);
  assert.match(intakeSource, /direct Matter conversion/);
  assert.match(apiClientSource, /\/api\/crm\/opportunities/);
  assert.match(apiClientSource, /\/api\/intake\/requests/);
  assert.match(apiClientSource, /production_ready_claim/);
  assert.doesNotMatch(intakeSource, /mockData|from "\.\.\/data\/mockData/);
});

test("Vault runtime surface is routed and live Vault/DMS backed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const vaultSource = await readWebFile("src/components/VaultSurface.jsx");
  const tableSource = await readWebFile("src/components/VaultDocumentTable.jsx");
  const vaultDetailSource = await readWebFile("src/components/VaultDocumentDetail.jsx");
  const badgesSource = await readWebFile("src/components/VaultSecurityBadges.jsx");
  const breadcrumbSource = await readWebFile("src/components/VaultBreadcrumb.jsx");
  const detailSource = await readWebFile("src/components/DocumentDetail.jsx");
  const emailSource = await readWebFile("src/components/EmailFilingView.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(navSource, /id: "vault"/);
  assert.match(appSource, /VaultSurface/);
  assert.match(appSource, /view === "vault"/);
  assert.match(shellSource, /vault: \["Matter vault"/);
  assert.match(vaultSource, /data-cmp-g5-vault-surface="true"/);
  assert.match(vaultSource, /fetchVaultDocuments/);
  assert.match(vaultSource, /VaultDocumentTable/);
  assert.match(vaultSource, /VaultDocumentDetail/);
  assert.match(vaultSource, /VaultSecurityBadges/);
  assert.match(vaultSource, /VaultBreadcrumb/);
  assert.match(tableSource, /DataTable/);
  assert.match(vaultDetailSource, /Version History/);
  assert.match(badgesSource, /data-mv-vault-security-badges="true"/);
  assert.match(breadcrumbSource, /aria-label="Matter Vault breadcrumb"/);
  assert.match(detailSource, /data-cmp-g5-document-detail="true"/);
  assert.match(detailSource, /storage_pointer_ref_included/);
  assert.match(detailSource, /document_bytes_included/);
  assert.match(emailSource, /data-cmp-g5-email-filing="true"/);
  assert.match(emailSource, /credential material absent/);
  assert.match(apiClientSource, /\/api\/vault\/documents/);
  assert.doesNotMatch(vaultSource, /mockData|from "\.\.\/data\/mockData/);
});

test("Matters runtime surface is routed and live Matter Core backed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const mattersSource = await readWebFile("src/components/MattersSurface.jsx");
  const matterVaultSource = await readWebFile("src/components/MatterVaultPanel.jsx");
  const openingSource = await readWebFile("src/components/MatterOpeningWizard.jsx");
  const rosterSource = await readWebFile("src/components/MatterTeamRoster.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(navSource, /id: "matters"/);
  assert.match(appSource, /MattersSurface/);
  assert.match(appSource, /view === "matters"/);
  assert.match(shellSource, /matters: \["Matter home"/);
  assert.match(mattersSource, /data-cmp-g4-live-matters="true"/);
  assert.match(mattersSource, /fetchMatterRecords/);
  assert.match(mattersSource, /MatterVaultPanel/);
  assert.match(matterVaultSource, /data-mv-matter-vault-panel="true"/);
  assert.match(matterVaultSource, /fetchMatterVaultSummary/);
  assert.match(matterVaultSource, /fetchMatterTimeline/);
  assert.match(matterVaultSource, /raw storage paths, and denied counts stay hidden/);
  assert.match(openingSource, /data-cmp-g4-opening-wizard="true"/);
  assert.match(openingSource, /createMatterOpening/);
  assert.match(rosterSource, /data-cmp-g4-team-roster="true"/);
  assert.match(rosterSource, /addMatterTeamMember/);
  assert.match(apiClientSource, /\/api\/matters/);
  assert.match(apiClientSource, /\/vault-summary/);
  assert.match(apiClientSource, /\/timeline/);
  assert.match(apiClientSource, /production_ready_claim/);
  assert.doesNotMatch(mattersSource, /mockData|from "\.\.\/data\/mockData/);
});

test("Clients runtime surface is routed and live Master Data backed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const clientsSource = await readWebFile("src/components/ClientsSurface.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");

  assert.match(navSource, /id: "clients"/);
  assert.match(appSource, /ClientsSurface/);
  assert.match(appSource, /view === "clients"/);
  assert.match(shellSource, /clients: \["Client groups"/);
  assert.match(clientsSource, /data-cmp-g2-live-clients="true"/);
  assert.match(clientsSource, /fetchMasterDataRecords/);
  assert.match(clientsSource, /modelType: "ClientGroup"/);
  assert.match(clientsSource, /live-data-loading/);
  assert.match(clientsSource, /live-data-empty/);
  assert.match(clientsSource, /live-data-denied/);
  assert.match(clientsSource, /live-data-review/);
  assert.match(clientsSource, /Live mode has no mock fallback/);
  assert.match(apiClientSource, /params\.set\("model_type", modelType\)/);
});

test("sample UI regression harness keeps live mode explicit and fail-closed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");
  const profilesSource = await readWebFile("src/components/ProfilesSurface.jsx");

  assert.match(appSource, /initialDataMode = initialParams\.get\("data"\) === "live" \? "live" : "mock"/);
  assert.match(apiClientSource, /GATED_RESPONSE_KEYS\.every/);
  assert.match(apiClientSource, /return \{ kind: "error" \}/);
  assert.match(profilesSource, /Live mode has no mock fallback/);
});

test("People runtime surface is routed and remains API-backed", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const navSource = await readWebFile("src/data/nav.js");
  const peopleSource = await readWebFile("src/people/PeopleHome.tsx");
  const peopleApiSource = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(navSource, /id: "people"/);
  assert.match(appSource, /view === "people"/);
  assert.match(peopleSource, /data-hrx-api-backed="true"/);
  assert.match(peopleApiSource, /\/api\/hrx\/employees/);
  assert.doesNotMatch(peopleApiSource, /mock/i);
});

test("HRX audit UI preserves server-owned step-up and no local fallback", async () => {
  const auditSource = await readWebFile("src/admin/hrx/HRXAuditViewer.tsx");
  const challengeSource = await readWebFile("src/people/security/HrxStepUpChallenge.tsx");
  const peopleApiSource = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(auditSource, /HrxStepUpChallenge/);
  assert.match(auditSource, /step_up_required/);
  assert.match(peopleApiSource, /body\?\.step_up_required === true/);
  assert.match(challengeSource, /Trusted session only/);
  assert.doesNotMatch(challengeSource, /x-lawos-hrx-step-up|tenant-a|actor_id|mfa: true/);
  assert.doesNotMatch(peopleApiSource, /x-lawos-tenant-id|x-lawos-actor-id|x-lawos-hrx-scopes|HRX_PERMISSION_CONTEXT/);
});

test("HRX lifecycle board stays API-backed from People runtime", async () => {
  const peopleSource = await readWebFile("src/people/PeopleHome.tsx");
  const lifecycleSource = await readWebFile("src/people/lifecycle/LifecycleBoard.tsx");
  const peopleApiSource = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(peopleSource, /LifecycleBoard/);
  assert.match(lifecycleSource, /fetchHrxLifecycleBoard/);
  assert.match(lifecycleSource, /updateHrxOnboardingTask/);
  assert.match(lifecycleSource, /closeHrxOffboardingCase/);
  assert.match(lifecycleSource, /No local lifecycle fallback is rendered/);
  assert.match(peopleApiSource, /\/api\/hrx\/lifecycle\/onboarding/);
  assert.match(peopleApiSource, /\/api\/hrx\/lifecycle\/offboarding/);
  assert.doesNotMatch(lifecycleSource, /mockData|profileRows|matters/);
});
