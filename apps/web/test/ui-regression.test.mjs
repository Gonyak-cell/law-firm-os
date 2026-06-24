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
  assert.match(shellSource, /client-import/);
  assert.match(shellSource, /matter-import/);
  assert.match(shellSource, /people-members/);
  assert.match(shellSource, /people-documents/);
  assert.match(shellSource, /people-leave/);
  assert.match(shellSource, /people-approvals/);
  assert.match(shellSource, /people-recruiting/);
  assert.match(shellSource, /people-lifecycle/);
  assert.match(shellSource, /people-policy/);
  assert.match(shellSource, /people-audit/);
  assert.match(shellSource, /people-admin/);
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

test("desktop post-login route keeps logo image flow before four-axis command center", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const shellSource = await readWebFile("src/components/Shell.jsx");
  const homeSource = await readWebFile("src/components/HomeSurface.jsx");
  const stylesSource = await readWebFile("src/styles.css");
  const desktopSource = await readFile(resolve(webRoot, "../desktop/src/renderer/offline.html"), "utf8");

  assert.match(desktopSource, /web\/index\.html\?desktop=1&view=home&data=live&ctx=allow&splash=1/);
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
  assert.match(stylesSource, /--matter-splash-word-width/);
  assert.match(stylesSource, /@keyframes matter-mark-in[\s\S]*translateX\(calc\(\(var\(--matter-splash-word-width\) \+ var\(--matter-splash-gap\)\) \/ 2\)\)/);
  assert.match(stylesSource, /@keyframes matter-word-reveal[\s\S]*clip-path:\s*inset\(0 0 0 0\)/);
  assert.match(appSource, /initialSidebarExpanded/);
  assert.match(appSource, /initialParams\.get\("sidebar"\) !== "collapsed"/);
  assert.match(appSource, /sidebarExpanded/);
  assert.match(appSource, /data-sidebar-state/);
  assert.match(shellSource, /aria-expanded=\{sidebarExpanded\}/);
  assert.match(shellSource, /data-product-axis-nav="top-header"/);
  assert.match(shellSource, /data-product-axis=\{id\}/);
  assert.match(shellSource, /aria-current=\{view === id \? "page" : undefined\}/);
  assert.match(shellSource, /data-matter-logo-flow/);
  assert.match(shellSource, /data-sidebar-expanded/);
  assert.match(shellSource, /<MatterLogo \/>/);
  assert.doesNotMatch(shellSource, /<nav className="rail-nav"/);
  assert.match(homeSource, /title="Client Matter People Vault"/);
  assert.doesNotMatch(homeSource, /endpoint-strip|endpoint coverage|\$\{endpoint\}/);
  assert.doesNotMatch(homeSource, /MetricCard|metric-grid|Product axes|Record views|Protected actions|Release status|visible records|record views|safeguards|capability-card|capability-counts|boundary-ledger/);
  assert.doesNotMatch(stylesSource, /metric-grid|clients-metric-grid|people-metric-grid|command-center-grid|pill-blue|pill-green|recipient-chip|report-chip/);
  assert.match(homeSource, /work-area-list/);
  assert.match(stylesSource, /\.app-frame\.sidebar-expanded/);
  assert.match(stylesSource, /\.app-frame\.sidebar-expanded \.rail/);
  assert.match(stylesSource, /\.sidebar-brand/);
});

test("login surfaces accept only email and password", async () => {
  const appSource = await readWebFile("src/App.jsx");
  const authSource = await readWebFile("src/components/AuthSurface.jsx");
  const desktopSource = await readFile(resolve(webRoot, "../desktop/src/renderer/offline.html"), "utf8");

  assert.match(appSource, /onLogin=\{\(\) => \{/);
  assert.match(authSource, /data-login-form="email-password"/);
  assert.match(authSource, /data-login-email/);
  assert.match(authSource, /data-login-password/);
  assert.doesNotMatch(authSource, /Continue with SSO|SSO로 계속/);

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
  const clientsSource = await readWebFile("src/components/ClientsSurface.jsx");
  const mattersSource = await readWebFile("src/components/MattersSurface.jsx");
  const matterVaultSource = await readWebFile("src/components/MatterVaultPanel.jsx");
  const importPanelSource = await readWebFile("src/components/ImportDataMappingPanel.jsx");
  const dataCloudSource = await readWebFile("src/components/DataCloudEnrichmentPanel.jsx");
  const permissionAdminSource = await readWebFile("src/people/admin/PermissionAdminPanel.jsx");
  const openingSource = await readWebFile("src/components/MatterOpeningWizard.jsx");
  const rosterSource = await readWebFile("src/components/MatterTeamRoster.jsx");
  const vaultSource = await readWebFile("src/components/VaultSurface.jsx");
  const documentDetailSource = await readWebFile("src/components/DocumentDetail.jsx");
  const apiClientSource = await readWebFile("src/data/apiClient.js");
  const peopleSource = await readWebFile("src/people/PeopleHome.tsx");
  const peopleApiSource = await readWebFile("src/people/hrxApiClient.ts");

  for (const section of [
    "client-leads",
    "client-opportunities",
    "client-intake",
    "client-accounts",
    "client-contacts",
    "client-data",
    "matter-command",
    "matter-vault",
    "matter-timeline",
    "matter-calendar",
    "matter-channel",
    "matter-opening",
    "matter-team",
    "matter-billing",
    "matter-analytics"
  ]) {
    assert.match(shellSource, new RegExp(section));
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
  assert.match(apiClientSource, /fetchDataCloudProviders/);
  assert.match(apiClientSource, /createDataCloudProvider/);
  assert.match(apiClientSource, /createDataCloudConsentRecord/);
  assert.match(apiClientSource, /createEnrichmentJob/);
  assert.match(apiClientSource, /executeEnrichmentJob/);
  assert.match(apiClientSource, /fetchEnrichmentResults/);
  assert.match(apiClientSource, /runIdentityResolution/);
  assert.match(apiClientSource, /fetchUnifiedCustomerProfile/);
  assert.match(apiClientSource, /activateDataCloudSegment/);
  assert.match(clientsSource, /data-sf-b-w02-owner-blocked-result="true"/);
  assert.match(clientsSource, /owner_blocked/);
  assert.match(clientsSource, /data-sf-b-w02-account-record-action="true"/);
  assert.match(clientsSource, /data-sf-b-w02-account-record-action-result="true"/);
  assert.match(clientsSource, /data-sf-b-w02-contact-record-action="true"/);
  assert.match(clientsSource, /data-sf-b-w02-contact-record-action-result="true"/);
  assert.match(clientsSource, /createCrmAccount/);
  assert.match(clientsSource, /createCrmContact/);
  assert.match(clientsSource, /createCrmMergeProposal/);
  assert.match(clientsSource, /executeCrmMergeProposal/);
  assert.match(clientsSource, /patchCrmAccount/);
  assert.match(clientsSource, /patchCrmContact/);
  assert.match(clientsSource, /fetchRecordActionFields/);
  assert.match(clientsSource, /fetchRecordActionAudit/);
  assert.match(clientsSource, /updateRecordActionField/);
  assert.match(clientsSource, /bulkUpdateRecordActions/);
  assert.match(clientsSource, /ImportDataMappingPanel/);
  assert.match(clientsSource, /client-import/);
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
  assert.match(mattersSource, /"matter-command",\s*"matter-vault",\s*"matter-timeline",\s*"matter-calendar",\s*"matter-channel"/);
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
  assert.match(openingSource, /필수 정보를 입력해주세요/);
  assert.match(rosterSource, /addMatterTeamMember/);
  assert.match(rosterSource, /data-matter-owner-assignment-action="true"/);
  assert.match(rosterSource, /data-matter-owner-assignment-result="true"/);
  assert.match(rosterSource, /책임자 지정/);
  assert.doesNotMatch(openingSource, /tenant_rp|matter_ui_|M-UI|party_rp|user_rp/);
  assert.doesNotMatch(rosterSource, /tenant_rp|member_ui|emp-002|user_rp/);
  assert.match(vaultSource, /data-cmp-g5-vault-surface="true"/);
  assert.match(vaultSource, /fetchVaultDocuments/);
  assert.match(vaultSource, /registered_account/);
  assert.match(vaultSource, /등록 계정/);
  assert.match(documentDetailSource, /registered_account/);
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
  assert.match(lifecycleSource, /입퇴사 업무를 불러오지 못했습니다/);
  assert.doesNotMatch(lifecycleSource, /<strong>{task\.title}<\/strong>|plan\.employee_id|plan\.document_refs\?\.join|<strong>{caseItem\.offboarding_id}<\/strong>|caseItem\.employee_id/);
  assert.match(peopleApiSource, /\/api\/hrx\/lifecycle\/onboarding/);
  assert.match(peopleApiSource, /\/api\/hrx\/lifecycle\/offboarding/);
  assert.doesNotMatch(lifecycleSource, /mockData|profileRows|matters/);
});
