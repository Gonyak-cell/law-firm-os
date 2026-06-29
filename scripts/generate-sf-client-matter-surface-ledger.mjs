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
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-account-patch-action="true"/, "Account patch action"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w01r-account-canonical-sync="true"/, "Account canonical sync marker")
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
      fileMarker("packages/master-data/src/crm-canonical-write-service.js", "CRM canonical write package service"),
      fileMarker("packages/master-data/src/organization-service.js", "Organization package service"),
      fileMarker("packages/master-data/src/client-group-service.js", "ClientGroup package service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-contact-read.png", "Account read QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-create-action.png", "Account create QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-patch-action.png", "Account patch QA screenshot")
    ],
    boundary: "Runtime facade writes now create canonical Master Data Account projection; registration number and Matter shortcut fields remain hidden."
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
      marker("apps/web/src/components/ClientsSurface.jsx", /data-crm-account-contacts-read="true"/, "Account contacts read marker"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w01r-contact-canonical-sync="true"/, "Contact canonical sync marker"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w01r-merge-review="true"/, "Merge review marker"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w01r-merge-execute-guarded="true"/, "Guarded merge execute marker"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w01r-right-panel-merge-review="true"/, "Right panel merge review marker")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchCrmContacts/, "Contacts fetch helper"),
      marker("apps/web/src/data/apiClient.js", /createCrmContact/, "Contact create helper"),
      marker("apps/web/src/data/apiClient.js", /patchCrmContact/, "Contact patch helper"),
      marker("apps/web/src/data/apiClient.js", /fetchCrmAccountContacts/, "Account contacts fetch helper"),
      marker("apps/web/src/data/apiClient.js", /fetchCrmMergeProposals/, "Merge proposals fetch helper"),
      marker("apps/web/src/data/apiClient.js", /createCrmMergeProposal/, "Merge proposal create helper"),
      marker("apps/web/src/data/apiClient.js", /executeCrmMergeProposal/, "Merge proposal execute helper")
    ],
    api_route: [
      marker("apps/api/src/crm-intake-runtime-context.js", /GET \/api\/crm\/contacts/, "Contact list route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /POST \/api\/crm\/contacts/, "Contact create route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /PATCH \/api\/crm\/contacts\/:id/, "Contact patch route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /GET \/api\/crm\/accounts\/:id\/contacts/, "Account contacts route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /GET \/api\/crm\/duplicate-merge-proposals/, "Merge proposals list route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /POST \/api\/crm\/duplicate-merge-proposals/, "Merge proposal create route"),
      marker("apps/api/src/crm-intake-runtime-context.js", /POST \/api\/crm\/duplicate-merge-proposals\/:id\/execute/, "Merge proposal execute route")
    ],
    package_service: [
      fileMarker("packages/master-data/src/crm-canonical-write-service.js", "CRM canonical write package service"),
      fileMarker("packages/master-data/src/person-service.js", "Person package service"),
      fileMarker("packages/master-data/src/contact-point-service.js", "ContactPoint package service"),
      fileMarker("packages/master-data/src/relationship-service.js", "Relationship package service"),
      fileMarker("packages/master-data/src/duplicate-service.js", "Duplicate package service"),
      fileMarker("packages/master-data/src/merge-split-service.js", "Merge split package service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-create-action.png", "Contact create QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-patch-action.png", "Contact patch QA screenshot")
    ],
    boundary: "Contact create writes canonical Person/ContactPoint/Relationship state; merge proposal and approved execute are route-backed, owner-gated, and hide raw contact values."
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
    salesforce_capability: "Client/Matter record actions, field registry, owner gates, inline edit, and bulk status",
    parity_status: "implemented",
    tuw_lanes: ["SF-B-W02-T01", "SF-B-W02-T02", "SF-B-W02-T03", "SF-B-W02-T04", "SF-B-W02-T07"],
    ui_menu: [
      marker("apps/web/src/components/Shell.jsx", /client-accounts/, "Client accounts section"),
      marker("apps/web/src/components/Shell.jsx", /client-contacts/, "Client contacts section"),
      marker("apps/web/src/components/Shell.jsx", /matter-command/, "Matter command section")
    ],
    ui_surface: [
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w02-record-actions-panel="true"/, "Client record actions panel"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w02-field-registry="true"/, "Client field registry marker"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w02-owner-blocked-result="true"/, "Client owner gate blocked result"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w02-account-record-action-result="true"/, "Account record action result"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w02-contact-record-action-result="true"/, "Contact record action result"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-status-transition-action="true"/, "Status transition action"),
      marker("apps/web/src/components/MatterTeamRoster.jsx", /data-matter-owner-assignment-action="true"/, "Owner assignment action"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-record-owner-change-action="true"/, "Owner change action"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-record-inline-edit-action="true"/, "Inline edit action"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-bulk-status-action="true"/, "Bulk status action"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w02-matter-record-actions="true"/, "Matter record actions panel"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w02-matter-record-action-result="true"/, "Matter record action result"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w02-matter-owner-blocked-result="true"/, "Matter owner gate blocked result"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w02-matter-action-audit-feed="true"/, "Matter record action audit feed")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchRecordActionFields/, "Record action field registry helper"),
      marker("apps/web/src/data/apiClient.js", /fetchRecordBulkActions/, "Record action bulk registry helper"),
      marker("apps/web/src/data/apiClient.js", /fetchRecordActionAudit/, "Record action audit helper"),
      marker("apps/web/src/data/apiClient.js", /updateRecordActionField/, "Record action field update helper"),
      marker("apps/web/src/data/apiClient.js", /bulkUpdateRecordActions/, "Record action bulk update helper"),
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
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/bulk\/status-transitions/, "Bulk status route"),
      marker("apps/api/src/record-actions-runtime-context.js", /GET \/api\/record-actions\/:object_name\/fields/, "Record action field registry route"),
      marker("apps/api/src/record-actions-runtime-context.js", /POST \/api\/record-actions\/:object_name\/:record_id\/field-update/, "Record action field update route"),
      marker("apps/api/src/record-actions-runtime-context.js", /POST \/api\/record-actions\/:object_name\/bulk-updates/, "Record action bulk update route"),
      marker("apps/api/src/record-actions-runtime-context.js", /GET \/api\/record-actions\/:object_name\/:record_id\/audit/, "Record action audit route")
    ],
    package_service: [
      fileMarker("packages/record-actions/src/service.js", "Record actions package service"),
      fileMarker("packages/matter/src/status-history.js", "Matter status history package"),
      fileMarker("packages/matter/src/staffing-service.js", "Matter staffing package"),
      fileMarker("packages/matter/src/service.js", "Matter service package")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-status-transition-action.png", "Status transition QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-owner-assignment-action.png", "Owner assignment QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-record-owner-change-action.png", "Owner change QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-inline-edit-action.png", "Inline edit QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-bulk-status-action.png", "Bulk status QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-record-actions.png", "Browser QA Client record actions screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-record-actions.png", "Browser QA Matter record actions screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w02-record-actions-contract.json", "W02R record actions contract")
    ],
    boundary: "Tested Client/Matter field registry, field update, action audit, and owner-gated bulk controls are exposed; unsupported owner/export effects stay route-backed blocked."
  },
  {
    id: "SF-SURFACE-B03-TIMELINE",
    salesforce_capability: "Matter activity, calendar, deadline board, and Matter Channel",
    parity_status: "implemented_route_mounted_provider_blocked",
    tuw_lanes: ["SF-A-W03-T06", "SF-B-W03-T01", "SF-B-W03-T02", "SF-B-W03-T03", "SF-B-W03-T04", "SF-B-W03-T05"],
    ui_menu: [
      marker("apps/web/src/components/Shell.jsx", /matter-timeline/, "Matter activity section"),
      marker("apps/web/src/components/Shell.jsx", /matter-calendar/, "Matter calendar section"),
      marker("apps/web/src/components/Shell.jsx", /matter-channel/, "Matter channel section")
    ],
    ui_surface: [
      marker("apps/web/src/components/MattersSurface.jsx", /data-matter-activity-timeline="true"/, "Activity timeline marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w03-activity-composer="true"/, "Activity composer marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w03-calendar-workspace="true"/, "Calendar workspace marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w03-deadline-board="true"/, "Deadline board marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w03-channel-composer="true"/, "Channel composer marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w03-provider-blocked-result="true"/, "Provider-blocked state marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w03-right-panel-deadline-highlight="true"/, "Right panel deadline marker"),
      marker("apps/web/src/components/MattersSurface.jsx", /data-sf-b-w03-right-panel-channel-tab="true"/, "Right panel channel marker")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchMatterTimeline/, "Timeline fetch helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterActivities/, "Activities fetch helper"),
      marker("apps/web/src/data/apiClient.js", /createMatterActivity/, "Activity create helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterCalendarEvents/, "Calendar fetch helper"),
      marker("apps/web/src/data/apiClient.js", /createMatterCalendarEvent/, "Calendar create helper"),
      marker("apps/web/src/data/apiClient.js", /confirmMatterDeadlineChange/, "Deadline confirm helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterChannel/, "Channel fetch helper"),
      marker("apps/web/src/data/apiClient.js", /createMatterChannelMessage/, "Channel message helper"),
      marker("apps/web/src/data/apiClient.js", /syncMatterChannelProvider/, "Channel provider blocked helper")
    ],
    api_route: [
      marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters\/:matter_id\/timeline/, "Timeline route"),
      marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters\/:matter_id\/activities/, "Activities read route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/activities/, "Activities create route"),
      marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters\/:matter_id\/calendar-events/, "Calendar read route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/calendar-events/, "Calendar create route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/deadlines\/:deadline_id\/confirm-change/, "Deadline confirm route"),
      marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters\/:matter_id\/channel/, "Channel read route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/channel\/messages/, "Channel message route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/channel\/provider-sync/, "Channel provider blocked route")
    ],
    package_service: [
      fileMarker("packages/matter/src/timeline-read-model.js", "Timeline read model service"),
      fileMarker("packages/matter/src/activity-calendar-channel-service.js", "Activity calendar channel service"),
      fileMarker("packages/matter/src/task-service.js", "Matter task transition service"),
      fileMarker("packages/matter/src/calendar-service.js", "Matter calendar deadline service"),
      fileMarker("packages/matter/src/deadline-dual-control.js", "Critical deadline dual-control service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-activity-timeline-read.png", "Timeline read QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-timeline.png", "Browser QA activity screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-calendar.png", "Browser QA calendar screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-channel.png", "Browser QA channel screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w03-activity-calendar-channel-contract.json", "Activity/calendar/channel contract")
    ],
    boundary: "Activity, calendar, deadline, and channel controls are route-backed; external channel/calendar provider effects remain provider-blocked until owner approval and provider receipt."
  },
  {
    id: "SF-SURFACE-A04-DMS",
    salesforce_capability: "Matter DMS files, Vault inventory, search, audit, document facade, document builder, and email composer",
    parity_status: "implemented_route_mounted_owner_provider_blocked",
    tuw_lanes: ["SF-A-W04-T03", "SF-A-W04-T04", "SF-A-W04-T05", "SF-B-W04-T01", "SF-B-W04-T02", "SF-B-W04-T03", "SF-B-W04-T04"],
    ui_menu: [marker("apps/web/src/components/Shell.jsx", /matter-vault/, "Matter Vault section")],
    ui_surface: [
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-matter-vault-record-workspace="true"/, "Matter Vault workspace"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-matter-document-facade-action="true"/, "Document facade action"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /matter-vault-documents/, "Vault document inventory"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /matter-vault-search/, "Vault search"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /matter-vault-audit/, "Vault audit"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-sf-b-w04-document-builder="true"/, "Document builder marker"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-sf-b-w04-builder-preview="true"/, "Builder preview marker"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-sf-b-w04-builder-approval-result="true"/, "Builder approval marker"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-sf-b-w04-builder-publish-blocked-result="true"/, "Builder owner-blocked publish marker"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-sf-b-w04-email-composer="true"/, "Email composer marker"),
      marker("apps/web/src/components/MatterVaultPanel.jsx", /data-sf-b-w04-email-send-provider-blocked="true"/, "Email provider-blocked marker")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchMatterVaultDocuments/, "Vault documents helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterVaultSearch/, "Vault search helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterVaultAudit/, "Vault audit helper"),
      marker("apps/web/src/data/apiClient.js", /createMatterDocumentFacade/, "Matter document facade helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterDocumentTemplates/, "Document templates helper"),
      marker("apps/web/src/data/apiClient.js", /createMatterBuilderDraft/, "Builder draft helper"),
      marker("apps/web/src/data/apiClient.js", /fetchMatterBuilderDraftPreview/, "Builder preview helper"),
      marker("apps/web/src/data/apiClient.js", /requestMatterBuilderApproval/, "Builder approval helper"),
      marker("apps/web/src/data/apiClient.js", /publishMatterBuilderDraftToVault/, "Builder publish blocked helper"),
      marker("apps/web/src/data/apiClient.js", /createMatterEmailDraft/, "Email draft helper"),
      marker("apps/web/src/data/apiClient.js", /requestMatterEmailDraftSendBoundary/, "Email send blocked helper")
    ],
    api_route: [
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/documents/, "Matter document facade route"),
      marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters\/:matter_id\/document-templates/, "Document template route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/builder-drafts/, "Builder draft route"),
      marker("apps/api/src/matter-runtime-context.js", /GET \/api\/matters\/:matter_id\/builder-drafts\/:draft_id\/preview/, "Builder preview route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/builder-drafts\/:draft_id\/approval-requests/, "Builder approval route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/builder-drafts\/:draft_id\/publish-to-vault/, "Builder publish blocked route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/email-drafts/, "Email draft route"),
      marker("apps/api/src/matter-runtime-context.js", /POST \/api\/matters\/:matter_id\/email-drafts\/:draft_id\/send/, "Email send blocked route"),
      marker("apps/api/src/vault-dms-runtime-context.js", /GET \/api\/vault\/documents/, "Vault documents route"),
      marker("apps/api/src/vault-dms-runtime-context.js", /GET \/api\/vault\/search/, "Vault search route"),
      marker("apps/api/src/vault-dms-runtime-context.js", /GET \/api\/vault\/audit/, "Vault audit route")
    ],
    package_service: [
      fileMarker("packages/dms/src/document-service.js", "DMS document service"),
      fileMarker("packages/dms/src/search/indexer.js", "DMS search indexer"),
      fileMarker("packages/matter/src/document-email-builder-service.js", "Document/email builder service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-workspace.png", "Matter Vault workspace QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-document-facade-action.png", "Document facade QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-inventory-search-audit.png", "Vault inventory/search/audit QA screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-builder-email.png", "Browser QA builder/email screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w04-document-email-builder-contract.json", "W04R document/email builder contract")
    ],
    boundary: "Document bytes, raw storage paths, raw body text, raw contact values, and external provider payloads stay hidden; publish/send controls expose owner/provider blocked states."
  },
  {
    id: "SF-SURFACE-B05-IMPORT-DATA-MAPPING",
    salesforce_capability: "Client/Matter import wizard, data mapping, dry-run, owner-blocked execute, rollback, and safe error report",
    parity_status: "implemented_route_mounted_owner_blocked",
    tuw_lanes: ["SF-B-W05-T01", "SF-B-W05-T02", "SF-B-W05-T03"],
    ui_menu: [
      marker("apps/web/src/components/Shell.jsx", /client-import/, "Client import section"),
      marker("apps/web/src/components/Shell.jsx", /matter-import/, "Matter import section")
    ],
    ui_surface: [
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-sf-b-w05-import-wizard="true"/, "Import wizard marker"),
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-client-matter-import-wizard="route-backed"/, "Route-backed wizard marker"),
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-sf-b-w05-target-selector="true"/, "Target selector marker"),
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-sf-b-w05-source-stage-action="true"/, "Source stage action marker"),
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-sf-b-w05-field-mapping-stepper="true"/, "Field mapping stepper marker"),
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-sf-b-w05-preview-safe-sample="true"/, "Safe preview marker"),
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-sf-b-w05-dry-run-action="true"/, "Dry-run action marker"),
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-sf-b-w05-execute-owner-blocked-action="true"/, "Owner-blocked execute action marker"),
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-sf-b-w05-rollback-error-action="true"/, "Rollback/error action marker"),
      marker("apps/web/src/components/ImportDataMappingPanel.jsx", /data-sf-b-w05-error-report="true"/, "Safe error report marker"),
      marker("apps/web/src/components/ClientsSurface.jsx", /ImportDataMappingPanel ctx=\{liveCtx\} surface="client"/, "Client import panel mount"),
      marker("apps/web/src/components/MattersSurface.jsx", /ImportDataMappingPanel ctx=\{liveCtx\} surface="matter"/, "Matter import panel mount")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchClientMatterImportTargets/, "Import targets helper"),
      marker("apps/web/src/data/apiClient.js", /fetchClientMatterImportJobs/, "Import jobs helper"),
      marker("apps/web/src/data/apiClient.js", /createClientMatterImportJob/, "Create import job helper"),
      marker("apps/web/src/data/apiClient.js", /stageImportSourceFile/, "Stage source helper"),
      marker("apps/web/src/data/apiClient.js", /fetchClientMatterImportPreview/, "Preview helper"),
      marker("apps/web/src/data/apiClient.js", /saveImportFieldMapping/, "Field mapping helper"),
      marker("apps/web/src/data/apiClient.js", /dryRunClientMatterImport/, "Dry-run helper"),
      marker("apps/web/src/data/apiClient.js", /executeClientMatterImport/, "Owner-blocked execute helper"),
      marker("apps/web/src/data/apiClient.js", /rollbackClientMatterImport/, "Rollback helper"),
      marker("apps/web/src/data/apiClient.js", /fetchClientMatterImportErrorReport/, "Error report helper")
    ],
    api_route: [
      marker("apps/api/src/server.js", /handleImportDataMappingApiRequest/, "Import data mapping server dispatch"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /GET \/api\/import-jobs/, "Import jobs list route"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /POST \/api\/import-jobs/, "Import job create route"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /GET \/api\/import-targets/, "Import target list route"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /POST \/api\/import-jobs\/:jobId\/source-files/, "Source file stage route"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /GET \/api\/import-jobs\/:jobId\/preview/, "Preview route"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /POST \/api\/import-jobs\/:jobId\/field-mappings/, "Field mapping route"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /POST \/api\/import-jobs\/:jobId\/dry-run/, "Dry-run route"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /POST \/api\/import-jobs\/:jobId\/execute/, "Owner-blocked execute route"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /POST \/api\/import-jobs\/:jobId\/rollback/, "Receipt-blocked rollback route"),
      marker("apps/api/src/import-data-mapping-runtime-context.js", /GET \/api\/import-jobs\/:jobId\/error-report/, "Safe error report route"),
      marker("apps/api/src/routes/import-data-mapping.js", /matchImportDataMappingRoute/, "Import route policy matcher")
    ],
    package_service: [
      fileMarker("packages/import-data/src/service.js", "Import data mapping package service"),
      marker("packages/import-data/src/service.js", /createClientMatterImportJobService/, "Import job service factory"),
      marker("packages/import-data/src/service.js", /dryRun/, "Dry-run service"),
      marker("packages/import-data/src/service.js", /execute/, "Owner-blocked execute service"),
      marker("packages/import-data/src/service.js", /rollback/, "Receipt-bound rollback service"),
      marker("packages/import-data/src/service.js", /errorReport/, "Safe error report service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-import.png", "Browser QA Client import screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-import.png", "Browser QA Matter import screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w05-import-data-mapping-contract.json", "W05R import data mapping contract"),
      fileMarker("apps/api/test/sf-b-w05-import-data-mapping.test.js", "W05R API regression")
    ],
    boundary: "Import wizard controls are route-backed and local-test-visible; execute remains owner-blocked, rollback remains receipt-bound, and raw rows/file bytes/provider enablement/fake success stay hidden."
  },
  {
    id: "SF-SURFACE-B06-PERMISSION-ADMIN",
    salesforce_capability: "Salesforce permission sets, assignments, Object Manager, connected apps, and admin audit",
    parity_status: "implemented_route_mounted_owner_provider_blocked",
    tuw_lanes: ["SF-B-W06-T01", "SF-B-W06-T02", "SF-B-W06-T03", "SF-B-W06-T04", "SF-B-W06-T05"],
    ui_menu: [
      marker("apps/web/src/people/peopleFeatureCatalog.js", /people-admin/, "People permission admin section")
    ],
    ui_surface: [
      marker("apps/web/src/people/PeopleHome.tsx", /PermissionAdminPanel/, "People admin panel mount"),
      marker("apps/web/src/people/admin/PermissionAdminPanel.jsx", /data-sf-b-w06-admin-setup="true"/, "W06 admin setup marker"),
      marker("apps/web/src/people/admin/PermissionAdminPanel.jsx", /data-permission-set-admin="route-backed"/, "Permission set panel marker"),
      marker("apps/web/src/people/admin/PermissionAdminPanel.jsx", /data-permission-assignment-admin="route-backed"/, "Permission assignment marker"),
      marker("apps/web/src/people/admin/PermissionAdminPanel.jsx", /data-object-manager-admin="route-backed"/, "Object Manager marker"),
      marker("apps/web/src/people/admin/PermissionAdminPanel.jsx", /data-connected-apps-admin="provider-blocked"/, "Connected apps provider blocked marker"),
      marker("apps/web/src/people/admin/PermissionAdminPanel.jsx", /data-sf-b-w06-admin-audit="true"/, "Admin audit marker")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchPermissionSets/, "Permission sets helper"),
      marker("apps/web/src/data/apiClient.js", /createPermissionSet/, "Create permission set helper"),
      marker("apps/web/src/data/apiClient.js", /patchPermissionSet/, "Patch permission set helper"),
      marker("apps/web/src/data/apiClient.js", /fetchPermissionAssignments/, "Permission assignments helper"),
      marker("apps/web/src/data/apiClient.js", /assignPermissionSet/, "Assign permission set helper"),
      marker("apps/web/src/data/apiClient.js", /revokePermissionSetAssignment/, "Revoke assignment helper"),
      marker("apps/web/src/data/apiClient.js", /fetchObjectManagerObjects/, "Object Manager objects helper"),
      marker("apps/web/src/data/apiClient.js", /fetchObjectManagerFields/, "Object Manager fields helper"),
      marker("apps/web/src/data/apiClient.js", /patchObjectFieldPolicy/, "Field policy helper"),
      marker("apps/web/src/data/apiClient.js", /fetchConnectedApps/, "Connected apps helper"),
      marker("apps/web/src/data/apiClient.js", /createConnectedApp/, "Create connected app helper"),
      marker("apps/web/src/data/apiClient.js", /disableConnectedApp/, "Disable connected app helper"),
      marker("apps/web/src/data/apiClient.js", /fetchAdminPermissionAudit/, "Admin audit helper")
    ],
    api_route: [
      marker("apps/api/src/server.js", /handleAdminPermissionApiRequest/, "Admin permission server dispatch"),
      marker("apps/api/src/admin-permission-runtime-context.js", /GET \/api\/admin\/permission-sets/, "Permission sets read route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /POST \/api\/admin\/permission-sets/, "Permission set create route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /PATCH \/api\/admin\/permission-sets\/:permissionSetId/, "Permission set patch route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /GET \/api\/admin\/permission-assignments/, "Permission assignments read route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /POST \/api\/admin\/permission-assignments/, "Permission assignment write route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /DELETE \/api\/admin\/permission-assignments\/:assignmentId/, "Permission assignment revoke route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /GET \/api\/admin\/object-manager\/objects/, "Object Manager read route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /GET \/api\/admin\/object-manager\/objects\/:objectName\/fields/, "Object fields read route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /PATCH \/api\/admin\/object-manager\/objects\/:objectName\/fields\/:fieldName/, "Field policy patch route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /GET \/api\/admin\/connected-apps/, "Connected apps read route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /POST \/api\/admin\/connected-apps/, "Connected app create route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /POST \/api\/admin\/connected-apps\/:appId\/disable/, "Connected app disable route"),
      marker("apps/api/src/admin-permission-runtime-context.js", /GET \/api\/admin\/audit/, "Admin audit route"),
      marker("apps/api/src/routes/admin-permission.js", /matchAdminPermissionRoute/, "Admin permission route policy matcher")
    ],
    package_service: [
      fileMarker("packages/admin/src/permission-admin-service.js", "Permission admin package service"),
      marker("packages/admin/src/permission-admin-service.js", /createPermissionAdminSetupService/, "Permission admin service factory"),
      marker("packages/admin/src/permission-admin-service.js", /createPermissionSet/, "Permission set create service"),
      marker("packages/admin/src/permission-admin-service.js", /assignPermissionSet/, "Permission assignment service"),
      marker("packages/admin/src/permission-admin-service.js", /patchObjectFieldPolicy/, "Object field policy service"),
      marker("packages/admin/src/permission-admin-service.js", /disableConnectedApp/, "Connected app provider-blocked service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-people-admin.png", "Browser QA People admin screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json", "W06R permission admin contract"),
      fileMarker("apps/api/test/sf-b-w06-permission-admin.test.js", "W06R API regression")
    ],
    boundary: "People 권한 관리 controls are route-backed and local-test-visible; permission grants, revocations, physical schema mutation, provider revocation, production approval, and trust claims remain owner/provider-blocked."
  },
  {
    id: "SF-SURFACE-B07-DATA-CLOUD-ENRICHMENT",
    salesforce_capability: "Salesforce Data Cloud provider setup, consent, enrichment preview, identity resolution, unified profile, and segment activation",
    parity_status: "implemented_route_mounted_owner_provider_blocked",
    tuw_lanes: ["SF-B-W07-T01", "SF-B-W07-T02", "SF-B-W07-T03"],
    ui_menu: [
      marker("apps/web/src/components/Shell.jsx", /client-data/, "Client data section")
    ],
    ui_surface: [
      marker("apps/web/src/components/ClientsSurface.jsx", /DataCloudEnrichmentPanel ctx=\{liveCtx\}/, "Client data cloud panel mount"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w07-right-panel-enrichment-summary="route-backed"/, "Client right panel data marker"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-data-cloud-enrichment="route-backed"/, "W07 data enrichment workspace"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-enrichment-provider-admin="provider-blocked"/, "Provider admin provider-blocked marker"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-sf-b-w07-provider-register-action="true"/, "Provider register action"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-sf-b-w07-consent-record-action="true"/, "Consent owner-blocked action"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-sf-b-w07-enrichment-job-action="true"/, "Enrichment job action"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-sf-b-w07-enrichment-preview="true"/, "Safe enrichment preview"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-sf-b-w07-enrichment-execute-provider-blocked-action="true"/, "Provider-blocked execute action"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-identity-resolution="route-backed"/, "Identity resolution route-backed marker"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-unified-profile="route-backed"/, "Unified profile marker"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-segment-activation="provider-blocked"/, "Segment activation provider-blocked marker"),
      marker("apps/web/src/components/DataCloudEnrichmentPanel.jsx", /data-sf-b-w07-audit="true"/, "Data Cloud audit marker")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchDataCloudProviders/, "Data Cloud providers helper"),
      marker("apps/web/src/data/apiClient.js", /createDataCloudProvider/, "Provider register helper"),
      marker("apps/web/src/data/apiClient.js", /createDataCloudConsentRecord/, "Consent record helper"),
      marker("apps/web/src/data/apiClient.js", /createEnrichmentJob/, "Create enrichment job helper"),
      marker("apps/web/src/data/apiClient.js", /fetchEnrichmentPreview/, "Fetch enrichment preview helper"),
      marker("apps/web/src/data/apiClient.js", /executeEnrichmentJob/, "Execute enrichment job helper"),
      marker("apps/web/src/data/apiClient.js", /fetchEnrichmentResults/, "Enrichment results helper"),
      marker("apps/web/src/data/apiClient.js", /runIdentityResolution/, "Identity resolution helper"),
      marker("apps/web/src/data/apiClient.js", /fetchUnifiedCustomerProfile/, "Unified profile helper"),
      marker("apps/web/src/data/apiClient.js", /activateDataCloudSegment/, "Segment activation helper"),
      marker("apps/web/src/data/apiClient.js", /fetchDataCloudAudit/, "Data Cloud audit helper")
    ],
    api_route: [
      marker("apps/api/src/server.js", /handleDataCloudApiRequest/, "Data Cloud server dispatch"),
      marker("apps/api/src/data-cloud-runtime-context.js", /GET \/api\/data-cloud\/providers/, "Provider list route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /POST \/api\/data-cloud\/providers/, "Provider register route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /POST \/api\/data-cloud\/consent-records/, "Consent record route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /POST \/api\/data-cloud\/enrichment-jobs/, "Enrichment job create route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /GET \/api\/data-cloud\/enrichment-jobs\/:jobId\/preview/, "Enrichment preview route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /POST \/api\/data-cloud\/enrichment-jobs\/:jobId\/execute/, "Provider-blocked execute route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /GET \/api\/data-cloud\/enrichment-results/, "Enrichment results route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /POST \/api\/data-cloud\/identity-resolution/, "Identity resolution route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /GET \/api\/data-cloud\/unified-profiles\/:profileId/, "Unified profile route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /POST \/api\/data-cloud\/segment-activations/, "Segment activation route"),
      marker("apps/api/src/data-cloud-runtime-context.js", /GET \/api\/data-cloud\/audit/, "Data Cloud audit route"),
      marker("apps/api/src/routes/data-cloud.js", /matchDataCloudRoute/, "Data Cloud route policy matcher")
    ],
    package_service: [
      fileMarker("packages/data-cloud/src/service.js", "Data Cloud enrichment package service"),
      marker("packages/data-cloud/src/service.js", /createDataCloudEnrichmentService/, "Data Cloud service factory"),
      marker("packages/data-cloud/src/service.js", /registerProvider/, "Provider register service"),
      marker("packages/data-cloud/src/service.js", /recordConsent/, "Consent service"),
      marker("packages/data-cloud/src/service.js", /createEnrichmentJob/, "Enrichment job service"),
      marker("packages/data-cloud/src/service.js", /executeEnrichmentJob/, "Provider-blocked execute service"),
      marker("packages/data-cloud/src/service.js", /runIdentityResolution/, "Identity resolution service"),
      marker("packages/data-cloud/src/service.js", /getUnifiedProfile/, "Unified profile service"),
      marker("packages/data-cloud/src/service.js", /createSegmentActivation/, "Segment activation service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-data-cloud.png", "Browser QA Client data cloud screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json", "W07R Data Cloud contract"),
      fileMarker("apps/api/test/sf-b-w07-data-cloud-enrichment.test.js", "W07R API regression")
    ],
    boundary: "Data Cloud controls are route-backed and local-test-visible; external enrichment execution and segment activation remain provider-blocked, consent/identity effects remain owner-blocked, and raw identifiers/provider payloads/tokens/fake success stay hidden."
  },
  {
    id: "SF-SURFACE-B08-REPORT-BUILDER-CLIENT-PROFITABILITY",
    salesforce_capability: "Salesforce reports tab, report builder save/run/share, bounded table/chart results, and Client profitability analytics",
    parity_status: "implemented_route_mounted_owner_blocked",
    tuw_lanes: ["SF-B-W08-T01", "SF-B-W08-T02", "SF-B-W08-T03", "SF-B-W08-T04"],
    ui_menu: [
      marker("apps/web/src/components/Shell.jsx", /client-reports/, "Client reports section")
    ],
    ui_surface: [
      marker("apps/web/src/components/ClientsSurface.jsx", /ReportBuilderPanel ctx=\{liveCtx\}/, "Client report builder mount"),
      marker("apps/web/src/components/ClientsSurface.jsx", /data-sf-b-w08-right-panel-report-summary="route-backed"/, "Client right panel report marker"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-report-builder="route-backed"/, "W08 report builder workspace"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-report-query-builder="route-backed"/, "W08 query builder marker"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-sf-b-w08-report-list="true"/, "Saved report list"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-sf-b-w08-report-create-action="true"/, "Report create action"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-sf-b-w08-report-patch-action="true"/, "Report patch action"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-client-profitability="route-backed"/, "Client profitability marker"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-sf-b-w08-client-profitability-refresh-action="true"/, "Client profitability refresh"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-sf-b-w08-report-run-action="true"/, "Report run action"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-sf-b-w08-report-result-table="true"/, "Bounded report result"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-report-share-action="owner-blocked"/, "Owner-blocked report share"),
      marker("apps/web/src/components/ReportBuilderPanel.jsx", /data-sf-b-w08-report-audit="true"/, "Report audit marker")
    ],
    api_client: [
      marker("apps/web/src/data/apiClient.js", /fetchReportDefinitions/, "Report definitions helper"),
      marker("apps/web/src/data/apiClient.js", /createReportDefinition/, "Report create helper"),
      marker("apps/web/src/data/apiClient.js", /patchReportDefinition/, "Report patch helper"),
      marker("apps/web/src/data/apiClient.js", /runReportQuery/, "Report query run helper"),
      marker("apps/web/src/data/apiClient.js", /shareReportDefinition/, "Report share helper"),
      marker("apps/web/src/data/apiClient.js", /fetchReportAudit/, "Report audit helper"),
      marker("apps/web/src/data/apiClient.js", /fetchAnalyticsClientProfitability/, "Client profitability read helper"),
      marker("apps/web/src/data/apiClient.js", /refreshClientProfitability/, "Client profitability refresh helper")
    ],
    api_route: [
      marker("apps/api/src/server.js", /handleReportsApiRequest/, "Report server dispatch"),
      marker("apps/api/src/reports-runtime-context.js", /GET \/api\/reports/, "Report list route"),
      marker("apps/api/src/reports-runtime-context.js", /POST \/api\/reports/, "Report create route"),
      marker("apps/api/src/reports-runtime-context.js", /PATCH \/api\/reports\/:reportId/, "Report patch route"),
      marker("apps/api/src/reports-runtime-context.js", /POST \/api\/reports\/:reportId\/run/, "Report run route"),
      marker("apps/api/src/reports-runtime-context.js", /POST \/api\/reports\/:reportId\/share/, "Report owner-blocked share route"),
      marker("apps/api/src/reports-runtime-context.js", /GET \/api\/reports\/:reportId\/audit/, "Report audit route"),
      marker("apps/api/src/routes/reports.js", /matchReportRoute/, "Report route policy matcher"),
      marker("apps/api/src/analytics-runtime-context.js", /\/api\/analytics\/client-profitability/, "Client profitability analytics route")
    ],
    package_service: [
      fileMarker("packages/reports/src/service.js", "Report builder package service"),
      marker("packages/reports/src/service.js", /createReportBuilderService/, "Report service factory"),
      marker("packages/reports/src/service.js", /createReport/, "Report create service"),
      marker("packages/reports/src/service.js", /patchReport/, "Report patch service"),
      marker("packages/reports/src/service.js", /runReport/, "Safe aggregate report run service"),
      marker("packages/reports/src/service.js", /shareReport/, "Owner-blocked share service"),
      marker("packages/analytics/src/metrics-service.js", /createClientProfitability/, "Client profitability service")
    ],
    evidence: [
      fileMarker("docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-reports.png", "Browser QA Client reports screenshot"),
      fileMarker("docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json", "W08R report builder contract"),
      fileMarker("apps/api/test/sf-b-w08-report-builder-client-profitability.test.js", "W08R API regression")
    ],
    boundary: "Report builder and Client profitability controls are route-backed and local-test-visible; report sharing remains owner-blocked, arbitrary SQL/raw query payload/source billing rows stay hidden, and production approval/trust claims remain false."
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
    boundary: "Matter analytics remains focused on dashboard, matter profitability, refresh, and export review; broader report-builder controls now live in SF-B-W08 Client reports with owner-blocked sharing."
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
