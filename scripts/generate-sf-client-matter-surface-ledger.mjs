#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const OUTPUT_PATH = "docs/goal-closeout/sf-client-matter-parity/surface-connection-ledger.json";

function read(path) {
  const absolutePath = join(ROOT, path);
  if (!existsSync(absolutePath)) return "";
  return readFileSync(absolutePath, "utf8");
}

function marker(file, pattern, label) {
  const source = read(file);
  return {
    file,
    label,
    pattern: pattern.source,
    present: pattern.test(source)
  };
}

function fileMarker(file, label = "file exists") {
  return {
    file,
    label,
    pattern: "exists",
    present: existsSync(join(ROOT, file))
  };
}

function evaluateRow(row) {
  const groups = {
    ui_menu: row.ui_menu ?? [],
    ui_surface: row.ui_surface ?? [],
    api_client: row.api_client ?? [],
    api_route: row.api_route ?? [],
    package_service: row.package_service ?? [],
    evidence: row.evidence ?? []
  };
  const groupStatus = Object.fromEntries(
    Object.entries(groups).map(([group, markers]) => [
      group,
      {
        required_count: markers.length,
        passed_count: markers.filter((item) => item.present).length,
        passed: markers.length === 0 ? true : markers.every((item) => item.present),
        markers
      }
    ])
  );
  const implemented = row.parity_status.startsWith("implemented");
  const connected = Object.values(groupStatus).every((group) => group.passed);
  return {
    ...row,
    connection_status: implemented && connected ? "ui_api_package_connected" : row.parity_status,
    group_status: groupStatus
  };
}

const rows = [
  {
    id: "SF-SURFACE-A01",
    salesforce_capability: "Client navigation, object tabs, and list/detail/right-panel workspace",
    parity_status: "implemented",
    tuw_lanes: ["SF-A-W01-T01", "SF-A-W01-T03"],
    ui_menu: [
      marker("apps/web/src/components/Shell.jsx", /clients-list/, "Client list section"),
      marker("apps/web/src/components/Shell.jsx", /client-leads/, "Client leads section"),
      marker("apps/web/src/components/Shell.jsx", /client-opportunities/, "Client opportunities section"),
      marker("apps/web/src/components/Shell.jsx", /client-intake/, "Client intake section"),
      marker("apps/web/src/components/Shell.jsx", /client-accounts/, "Client accounts section"),
      marker("apps/web/src/components/Shell.jsx", /client-contacts/, "Client contacts section")
    ],
    ui_surface: [
      marker("apps/web/src/components/ClientsSurface.jsx", /data-salesforce-client-workspace="list-detail-right-panel"/, "Client record workspace marker"),
      marker("apps/web/src/components/ClientsSurface.jsx", /record-side-panel/, "Client right panel")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchMasterDataRecords/, "Master Data client fetch helper")
    ],
    api_route: [
      marker("apps/api/src/master-data-context.js", /handleClientGroupResolution/, "ClientGroup resolution handler")
    ],
    package_service: [
      fileMarker("packages/master-data/src/client-group-service.js", "ClientGroup package service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-sections.png", "Client sections screenshot")
    ],
    boundary: "Client workspace is API-backed and fail-closed; no static local data fallback."
  },
  {
    id: "SF-SURFACE-A02",
    salesforce_capability: "Lead, Opportunity, and Intake funnel",
    parity_status: "implemented",
    tuw_lanes: ["SF-A-W02-T01", "SF-A-W02-T02", "SF-A-W02-T03", "SF-A-W02-T04"],
    ui_menu: [
      marker("apps/web/src/components/Shell.jsx", /client-leads/, "Lead section"),
      marker("apps/web/src/components/Shell.jsx", /client-opportunities/, "Opportunity section"),
      marker("apps/web/src/components/Shell.jsx", /client-intake/, "Intake section")
    ],
    ui_surface: [
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-handoff-action="true"/, "Opportunity handoff action"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-intake-clearance-action="true"/, "Intake clearance action")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchCrmLeads/, "Lead fetch helper"),
      marker("apps/web/src/data/apiClient.js", /fetchCrmOpportunities/, "Opportunity fetch helper"),
      marker("apps/web/src/data/apiClient.js", /handoffCrmOpportunityToIntake/, "Opportunity handoff helper"),
      marker("apps/web/src/data/apiClient.js", /createIntakeConflictCheck/, "Conflict check helper"),
      marker("apps/web/src/data/apiClient.js", /issueIntakeClearanceToken/, "Clearance token helper")
    ],
    api_route: [
      marker("apps/api/src/crm-intake-runtime-context.js", /GET \/api\/crm\/leads/, "Lead list route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /GET \/api\/crm\/opportunities/, "Opportunity list route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /POST \/api\/crm\/opportunities\/:id\/handoff/, "Opportunity handoff route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /POST \/api\/intake\/conflict-checks/, "Conflict check route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /POST \/api\/intake\/clearance-tokens/, "Clearance token route")
    ],
    package_service: [
      fileMarker("packages/crm/src/lead-service.js", "Lead package service"),
      fileMarker("packages/crm/src/opportunity-service.js", "Opportunity package service"),
      fileMarker("packages/crm/src/intake-handoff-service.js", "Intake handoff package service"),
      fileMarker("packages/intake/src/intake-request-service.js", "Intake package service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-opportunity-handoff-refresh.png", "Opportunity handoff QA screenshot")
    ],
    boundary: "Opportunity handoff refreshes safe Intake/Opportunity state; direct Matter creation remains backend-blocked."
  },
  {
    id: "SF-SURFACE-B01-ACCOUNT",
    salesforce_capability: "Salesforce Account object read/create/patch",
    parity_status: "implemented",
    tuw_lanes: ["SF-B-W01-T01", "SF-B-W01-T05"],
    ui_menu: [marker("apps/web/src/components/Shell.jsx", /client-accounts/, "Accounts section")],
    ui_surface: [
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-accounts-read="true"/, "Accounts read marker"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-account-create-action="true"/, "Account create action"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-account-patch-action="true"/, "Account patch action")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchCrmAccounts/, "Accounts fetch helper"),
      marker("apps/web/src/data/apiClient.js", /createCrmAccount/, "Account create helper"),
      marker("apps/web/src/data/apiClient.js", /patchCrmAccount/, "Account patch helper")
    ],
    api_route: [
      marker("apps/api/src/crm-intake-runtime-context.js", /GET \/api\/crm\/accounts/, "Account list route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /POST \/api\/crm\/accounts/, "Account create route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /PATCH \/api\/crm\/accounts\/:id/, "Account patch route")
    ],
    package_service: [
      fileMarker("packages/master-data/src/organization-service.js", "Organization package service"),
      fileMarker("packages/master-data/src/client-group-service.js", "ClientGroup package service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-contact-read.png", "Account read QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-create-action.png", "Account create QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-patch-action.png", "Account patch QA screenshot")
    ],
    boundary: "Runtime facade writes do not mutate canonical Master Data yet; canonical write migration stays backend-first."
  },
  {
    id: "SF-SURFACE-B01-CONTACT",
    salesforce_capability: "Salesforce Contact object read/create/patch and Account-Contact relationship read",
    parity_status: "implemented",
    tuw_lanes: ["SF-B-W01-T02", "SF-B-W01-T03", "SF-B-W01-T05"],
    ui_menu: [marker("apps/web/src/components/Shell.jsx", /client-contacts/, "Contacts section")],
    ui_surface: [
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-contacts-read="true"/, "Contacts read marker"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-contact-create-action="true"/, "Contact create action"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-contact-patch-action="true"/, "Contact patch action"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-account-contacts-read="true"/, "Account contacts read marker")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchCrmContacts/, "Contacts fetch helper"),
      marker("apps/web/src/data/apiClient.js", /createCrmContact/, "Contact create helper"),
      marker("apps/web/src/data/apiClient.js", /patchCrmContact/, "Contact patch helper"),
      marker("apps/web/src/data/apiClient.js", /fetchCrmAccountContacts/, "Account contacts fetch helper")
    ],
    api_route: [
      marker("apps/api/src/crm-intake-runtime-context.js", /GET \/api\/crm\/contacts/, "Contact list route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /POST \/api\/crm\/contacts/, "Contact create route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /PATCH \/api\/crm\/contacts\/:id/, "Contact patch route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /GET \/api\/crm\/accounts\/:id\/contacts/, "Account contacts route")
    ],
    package_service: [
      fileMarker("packages/master-data/src/person-service.js", "Person package service"),
      fileMarker("packages/master-data/src/contact-point-service.js", "ContactPoint package service"),
      fileMarker("packages/master-data/src/relationship-service.js", "Relationship package service"),
      fileMarker("packages/master-data/src/duplicate-service.js", "Duplicate package service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-create-action.png", "Contact create QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-patch-action.png", "Contact patch QA screenshot")
    ],
    boundary: "Merge/delete execution stays backend-first; raw contact values remain hidden."
  },
  {
    id: "SF-SURFACE-A03",
    salesforce_capability: "Matter navigation, list views, selected record workspace, and right panel",
    parity_status: "implemented",
    tuw_lanes: ["SF-A-W01-T01", "SF-A-W03-T01", "SF-B-W02-T06"],
    ui_menu: [
      marker("apps/web/src/components/Shell.jsx", /matters-list/, "Matter list section"),
      marker("apps/web/src/components/Shell.jsx", /matter-command/, "Matter command section"),
      marker("apps/web/src/components/Shell.jsx", /matter-vault/, "Matter Vault section"),
      marker("apps/web/src/components/Shell.jsx", /matter-timeline/, "Matter timeline section"),
      marker("apps/web/src/components/Shell.jsx", /matter-billing/, "Matter billing section"),
      marker("apps/web/src/components/Shell.jsx", /matter-analytics/, "Matter analytics section")
    ],
    ui_surface: [
      marker("apps/web/src/components/MattersSurface.jsx", /data-salesforce-matter-workspace="list-detail-right-panel"/, "Matter record workspace marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-selected-record-list="true"/, "Matter selected list marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-save-list-view-action="true"/, "Matter saved list action"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-recently-viewed="true"/, "Matter recently viewed marker")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchMatterRecords/, "Matter records helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterListViews/, "Matter list views helper"),
      marker("apps/web/src/data/apiClient.js", /saveMatterListView/, "Matter save list view helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterRecentlyViewed/, "Matter recently viewed helper"),
      marker("apps/web/src/data/apiClient.js", /markMatterRecentlyViewed/, "Matter recently viewed mark helper")
    ],
    api_route: [
      marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters/, "Matter list route"),
      marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters\/list-views/, "Matter list views route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/list-views/, "Matter save list view route"),
      marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters\/recently-viewed/, "Matter recently viewed list route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/recently-viewed/, "Matter recently viewed mark route")
    ],
    package_service: [fileMarker("packages/matter/src/repository.js", "Matter repository package")],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-selected-record-workspace.png", "Selected record workspace QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-saved-list-views.png", "Saved list views QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-recently-viewed.png", "Recently viewed QA screenshot")
    ],
    boundary: "Selected Matter context drives downstream sections; broader mass update remains backend-first."
  },
  {
    id: "SF-SURFACE-B02-ACTIONS",
    salesforce_capability: "Matter path status, owner assignment/change, inline edit, and bulk status",
    parity_status: "implemented",
    tuw_lanes: ["SF-B-W02-T01", "SF-B-W02-T02", "SF-B-W02-T03", "SF-B-W02-T04", "SF-B-W02-T07"],
    ui_menu: [marker("apps/web/src/components/Shell.jsx", /matter-command/, "Matter command section")],
    ui_surface: [
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-status-transition-action="true"/, "Status transition action"),
      marker("apps/web/src/components/MatterTeamRoster.jsx", /data-matter-owner-assignment-action="true"/, "Owner assignment action"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-record-owner-change-action="true"/, "Owner change action"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-record-inline-edit-action="true"/, "Inline edit action"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-bulk-status-action="true"/, "Bulk status action")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /completeMatterStatus/, "Complete status helper"),
      marker("apps/web/src/data/apiClient.js", /changeMatterOwner/, "Owner change helper"),
      marker("apps/web/src/data/apiClient.js", /updateMatterInlineFields/, "Inline field helper"),
      marker("apps/web/src/data/apiClient.js", /bulkCompleteMatterStatus/, "Bulk status helper"),
      marker("apps/web/src/data/apiClient.js", /normalizeMatterTeamMemberPayload/, "Team member normalize helper")
    ],
    api_route: [
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/status-transitions/, "Status transition route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/team-members/, "Team member route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/owner-change/, "Owner change route"),
      marker("apps/api/src/matter-runtime-context.js", /PATCH \/api\/matters\/:matter_id/, "Inline patch route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/bulk\/status-transitions/, "Bulk status route")
    ],
    package_service: [
      fileMarker("packages/matter/src/status-history.js", "Matter status history package"),
      fileMarker("packages/matter/src/staffing-service.js", "Matter staffing package"),
      fileMarker("packages/matter/src/service.js", "Matter service package")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-status-transition-action.png", "Status transition QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-owner-assignment-action.png", "Owner assignment QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-record-owner-change-action.png", "Owner change QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-inline-edit-action.png", "Inline edit QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-bulk-status-action.png", "Bulk status QA screenshot")
    ],
    boundary: "Only tested status, owner, inline WIP, and selected bulk completion controls are exposed."
  },
  {
    id: "SF-SURFACE-B03-TIMELINE",
    salesforce_capability: "Matter activity timeline read",
    parity_status: "implemented_read_only_with_backend_contract_for_writes",
    tuw_lanes: ["SF-A-W03-T06", "SF-B-W03-T01"],
    ui_menu: [marker("apps/web/src/components/Shell.jsx", /matter-timeline/, "Matter activity section")],
    ui_surface: [
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-activity-timeline="true"/, "Activity timeline marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-activity-read-boundary="true"/, "Read boundary marker")
    ],
    api_client: [marker("apps/web/src/data/apiClient.js", /fetchMatterTimeline/, "Timeline fetch helper")],
    api_route: [marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters\/:matter_id\/timeline/, "Timeline route")],
    package_service: [fileMarker("packages/matter/src/timeline-read-model.js", "Timeline read model service")],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-activity-timeline-read.png", "Timeline read QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w03-activity-calendar-channel-contract.json", "Activity/calendar/channel contract")
    ],
    boundary: "Activity write, calendar, deadline, and channel composers are hidden until route/provider gates pass."
  },
  {
    id: "SF-SURFACE-A04-DMS",
    salesforce_capability: "Matter DMS files, Vault inventory, search, audit, and document facade",
    parity_status: "implemented",
    tuw_lanes: ["SF-A-W04-T03", "SF-A-W04-T04", "SF-A-W04-T05"],
    ui_menu: [marker("apps/web/src/components/Shell.jsx", /matter-vault/, "Matter Vault section")],
    ui_surface: [
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-matter-vault-record-workspace="true"/, "Matter Vault workspace"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-matter-document-facade-action="true"/, "Document facade action"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /matter-vault-documents/, "Vault document inventory"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /matter-vault-search/, "Vault search"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /matter-vault-audit/, "Vault audit")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchMatterVaultDocuments/, "Vault documents helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterVaultSearch/, "Vault search helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterVaultAudit/, "Vault audit helper"),
      marker("apps/web/src/data/apiClient.js", /createMatterDocumentFacade/, "Matter document facade helper")
    ],
    api_route: [
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/documents/, "Matter document facade route"),
      marker("apps/api/src/vault-dms-runtime-context.js", /GET \/api\/vault\/documents/, "Vault documents route"),
      marker("apps/api/src/vault-dms-runtime-context.js", /GET \/api\/vault\/search/, "Vault search route"),
      marker("apps/api/src/vault-dms-runtime-context.js", /GET \/api\/vault\/audit/, "Vault audit route")
    ],
    package_service: [
      fileMarker("packages/dms/src/document-service.js", "DMS document service"),
      fileMarker("packages/dms/src/search/indexer.js", "DMS search indexer")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-workspace.png", "Matter Vault workspace QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-document-facade-action.png", "Document facade QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-inventory-search-audit.png", "Vault inventory/search/audit QA screenshot")
    ],
    boundary: "Document bytes, raw storage paths, and raw text stay hidden."
  },
  {
    id: "SF-SURFACE-A05-BILLING",
    salesforce_capability: "Matter billing, ERP invoices, WIP, payments, and finance audit",
    parity_status: "implemented",
    tuw_lanes: ["SF-A-W05-T01", "SF-A-W05-T02", "SF-A-W05-T03"],
    ui_menu: [marker("apps/web/src/components/Shell.jsx", /matter-billing/, "Matter billing section")],
    ui_surface: [
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-billing-actions="true"/, "Billing actions marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-time-entry-action="true"/, "Time entry action marker")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchFinanceTimeEntries/, "Time entries fetch helper"),
      marker("apps/web/src/data/apiClient.js", /fetchFinanceInvoices/, "Invoices fetch helper"),
      marker("apps/web/src/data/apiClient.js", /fetchFinanceArAging/, "AR aging fetch helper"),
      marker("apps/web/src/data/apiClient.js", /createFinanceTimeEntry/, "Time entry create helper"),
      marker("apps/web/src/data/apiClient.js", /generateFinanceWip/, "WIP helper"),
      marker("apps/web/src/data/apiClient.js", /importFinancePayment/, "Payment import helper"),
      marker("apps/web/src/data/apiClient.js", /fetchFinanceAudit/, "Finance audit helper")
    ],
    api_route: [
      marker("apps/api/src/finance-runtime-context.js", /GET \/api\/finance\/time-entries/, "Time entries route"),
      marker("apps/api/src/finance-runtime-context.js", /POST \/api\/finance\/time-entries/, "Time entry create route"),
      marker("apps/api/src/finance-runtime-context.js", /GET \/api\/finance\/invoices/, "Invoices route"),
      marker("apps/api/src/finance-runtime-context.js", /GET \/api\/finance\/ar-aging/, "AR aging route"),
      marker("apps/api/src/finance-runtime-context.js", /POST \/api\/finance\/wip/, "WIP route"),
      marker("apps/api/src/finance-runtime-context.js", /POST \/api\/finance\/payments/, "Payment import route"),
      marker("apps/api/src/finance-runtime-context.js", /GET \/api\/finance\/audit/, "Finance audit route")
    ],
    package_service: [fileMarker("packages/billing/src/finance-repository.js", "Billing finance repository")],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-billing-actions.png", "Matter billing QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-time-entry-action.png", "Matter time entry QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-audit-trail.png", "Matter/finance audit QA screenshot")
    ],
    boundary: "Generic import/data mapping remains separate SF-B-W05 backend-first work."
  },
  {
    id: "SF-SURFACE-A05-ANALYTICS",
    salesforce_capability: "Matter analytics dashboards, matter profitability, refresh, and export",
    parity_status: "implemented",
    tuw_lanes: ["SF-A-W05-T04", "SF-A-W05-T05"],
    ui_menu: [marker("apps/web/src/components/Shell.jsx", /matter-analytics/, "Matter analytics section")],
    ui_surface: [
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-analytics-actions="true"/, "Analytics action marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-analytics-export-action="true"/, "Analytics export action"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-analytics-export-safe-state="true"/, "Analytics export safe state")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchAnalyticsDashboards/, "Analytics dashboard helper"),
      marker("apps/web/src/data/apiClient.js", /fetchAnalyticsMatterProfitability/, "Matter profitability helper"),
      marker("apps/web/src/data/apiClient.js", /refreshAnalyticsDashboards/, "Analytics refresh helper"),
      marker("apps/web/src/data/apiClient.js", /refreshMatterProfitability/, "Matter profitability refresh helper"),
      marker("apps/web/src/data/apiClient.js", /createAnalyticsExport/, "Analytics export helper")
    ],
    api_route: [
      marker("apps/api/src/analytics-runtime-context.js", /\/api\/analytics\/dashboards/, "Analytics dashboards route"),
      marker("apps/api/src/analytics-runtime-context.js", /\/api\/analytics\/refresh/, "Analytics refresh route"),
      marker("apps/api/src/analytics-runtime-context.js", /\/api\/analytics\/matter-profitability/, "Matter profitability route"),
      marker("apps/api/src/analytics-runtime-context.js", /\/api\/analytics\/exports/, "Analytics export route"),
      marker("apps/api/src/analytics-runtime-context.js", /\/api\/analytics\/audit/, "Analytics audit route")
    ],
    package_service: [
      fileMarker("packages/analytics/src/dashboard-service.js", "Analytics dashboard service"),
      marker("packages/analytics/src/metrics-service.js", /createMatterProfitability/, "Matter profitability service"),
      fileMarker("packages/analytics/src/export-control-service.js", "Analytics export service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-analytics-actions.png", "Matter analytics QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-analytics-export-action.png", "Analytics export QA screenshot")
    ],
    boundary: "Report builder and Client profitability route exposure remain SF-B-W08 backend-first work."
  }
];

const evaluatedRows = rows.map(evaluateRow);
const failedRows = evaluatedRows.filter((row) => row.parity_status.startsWith("implemented") && row.connection_status !== "ui_api_package_connected");

if (failedRows.length > 0) {
  const messages = failedRows.map((row) => {
    const failedGroups = Object.entries(row.group_status)
      .filter(([, status]) => !status.passed)
      .map(([group]) => group)
      .join(",");
    return `${row.id}:${failedGroups}`;
  });
  throw new Error(`Surface connection ledger has disconnected implemented rows: ${messages.join("; ")}`);
}

const ledger = {
  schema_version: "law-firm-os.sf-client-matter-parity.surface-connection-ledger.v0.1",
  program: "SF-CLIENT-MATTER-PARITY",
  ledger_date: "2026-06-24",
  scope: {
    client_matter_only: true,
    implemented_rows_require_ui_api_package_evidence: true,
    backend_missing_rows_are_registered_in_backend_contracts: true,
    production_ready_claim: false,
    go_live_claim: false,
    enterprise_trust_claim: false
  },
  summary: {
    row_count: evaluatedRows.length,
    connected_implemented_row_count: evaluatedRows.filter((row) => row.connection_status === "ui_api_package_connected").length,
    disconnected_implemented_row_count: failedRows.length,
    ui_marker_count: evaluatedRows.reduce((total, row) => total + row.group_status.ui_surface.required_count, 0),
    api_client_marker_count: evaluatedRows.reduce((total, row) => total + row.group_status.api_client.required_count, 0),
    api_route_marker_count: evaluatedRows.reduce((total, row) => total + row.group_status.api_route.required_count, 0),
    package_service_marker_count: evaluatedRows.reduce((total, row) => total + row.group_status.package_service.required_count, 0),
    evidence_marker_count: evaluatedRows.reduce((total, row) => total + row.group_status.evidence.required_count, 0)
  },
  rows: evaluatedRows
};

mkdirSync(dirname(join(ROOT, OUTPUT_PATH)), { recursive: true });
writeFileSync(join(ROOT, OUTPUT_PATH), `${JSON.stringify(ledger, null, 2)}\n`);

console.log(JSON.stringify({
  ledger: OUTPUT_PATH,
  row_count: ledger.summary.row_count,
  connected_implemented_row_count: ledger.summary.connected_implemented_row_count,
  disconnected_implemented_row_count: ledger.summary.disconnected_implemented_row_count,
  ui_marker_count: ledger.summary.ui_marker_count,
  api_client_marker_count: ledger.summary.api_client_marker_count,
  api_route_marker_count: ledger.summary.api_route_marker_count,
  package_service_marker_count: ledger.summary.package_service_marker_count
}, null, 2));
