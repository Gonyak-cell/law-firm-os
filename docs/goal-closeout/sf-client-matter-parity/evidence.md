# SF Client/Matter Parity Evidence

Program: `SF-CLIENT-MATTER-PARITY`
Date: 2026-06-24
Status: local evidence captured, active goal not yet closed

## Scope Verified In This Slice

- Salesforce atlas is present at `Law Firm OS UI/Salesforce web Mar 2026/` with at least 894 PNG files plus `showcase.html`.
- Salesforce screenshot inventory is captured at `docs/goal-closeout/sf-client-matter-parity/salesforce-screenshot-inventory.json`; it separates 883 source screenshots from 11 derived preview/logo PNG assets and binds showcase feature markers to parity lanes.
- Objective completion audit is captured at `docs/goal-closeout/sf-client-matter-parity/objective-completion-audit.json`; it maps 8 active-goal requirements to current evidence and keeps goal completion, production, go-live, and enterprise trust claims false.
- Current validation receipt is captured at `docs/goal-closeout/sf-client-matter-parity/current-validation-receipt.json`; it records the latest local UI regression, web build, API regression, `web:e2e matter-vault`, browser QA receipt, SF parity scripts, and Hermes check-only pass results as local evidence only.
- Browser QA receipt is captured at `docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json`; Chromium drove Client accounts, Client contacts/merge review, Client record actions, Client import/data mapping, Client data cloud/enrichment, Client report builder/client profitability, Matter list, Matter record actions, Matter command, Matter Vault, Matter document/email builder, Matter import/data mapping, Matter activity, Matter calendar/deadline approval, Matter Channel provider-blocked routes, and People permission admin owner/provider-blocked routes against the local API/Vite stack, generating 16 screenshots and keeping production, go-live, and enterprise trust claims false.
- Surface connection ledger is captured at `docs/goal-closeout/sf-client-matter-parity/surface-connection-ledger.json`; it verifies 14 implemented Client/Matter/People rows are connected across UI menu, UI surface, apiClient, apps/api route, package service, and evidence groups.
- Client menu exposes list, lead, opportunity, intake, account read, contact read, data, report, and import sections.
- Client opportunity section exposes the real `/api/crm/opportunities/:id/handoff` route as a guarded UI action and immediately refreshes the Opportunity stage/Intake link from the safe route response.
- Client intake section exposes the real `/api/intake/conflict-checks`, `/api/intake/clearance-tokens`, and `/api/intake/audit` routes as guarded review actions.
- Matter menu exposes list, command, document, activity, calendar, Channel, opening, team, billing, and analytics sections.
- Matter list rows are selectable and the selected Matter ID drives Command Center, Vault, activity, billing, analytics, guarded actions, recently viewed marking, and the right-side record panel.
- Matter document section uses the same list/detail/right-panel workspace and renders the backend-backed Matter Vault panel with the selected Matter record panel.
- Matter document section exposes the real `POST /api/matters/:id/documents` facade as a guarded record-workspace action; document bytes and raw storage paths stay hidden.
- Matter document section exposes the real `/api/vault/documents`, `/api/vault/search`, and `/api/vault/audit` routes as selected-Matter Vault document inventory, ACL-filtered search, and safe audit previews; raw path, raw text, storage pointer, and document bytes stay hidden.
- Matter billing section exposes the real `/api/finance/time-entries`, `/api/finance/wip`, and `/api/finance/payments` routes as guarded time/WIP/payment actions.
- Matter analytics section exposes the real `/api/analytics/refresh` and `/api/analytics/matter-profitability` routes as guarded dashboard/profitability actions.
- Matter analytics section exposes the real `/api/analytics/exports` route as a guarded export-review action without credential material or Matter detail exposure.
- Matter command and billing sections expose the real `/api/matters/audit` and `/api/finance/audit` routes plus write-response audit events as guarded audit-history surfaces.
- Matter command section exposes the real `POST /api/matters/:id/status-transitions` route as a guarded Mark Status Complete action; the route updates Matter status, closed timestamp, WIP status, audit evidence, and timeline evidence without production or go-live claims.
- Matter team section exposes the real `POST /api/matters/:id/team-members` route as a guarded responsible-attorney owner assignment action; the route updates Matter owner fields and `matter.owner.assignment` audit evidence without exposing internal tenant/user identifiers in the UI.
- Matter right panel exposes the real `POST /api/matters/:id/owner-change` route as a guarded record owner-change action; the route validates the owner against the employee directory, persists owner state, and records `matter.owner.change` audit evidence.
- Matter right panel exposes the real `PATCH /api/matters/:id` route as a guarded inline field edit for allowlisted Matter fields; the current UI action patches 청구 상태 through `wip_status`, persists state, and records `matter.inline.patch` audit evidence.
- Matter list section exposes the real `GET /api/matters/recently-viewed` and `POST /api/matters/:id/recently-viewed` routes as a viewer-scoped 최근 본 항목 surface; the route persists state and audit evidence without returning viewer user IDs.
- Matter list section exposes the real `GET /api/matters/list-views` and `POST /api/matters/list-views` routes as an owner-scoped saved list view selector and guarded save action; the route persists state and audit evidence without returning owner user IDs.
- Matter list section exposes the real `POST /api/matters/bulk/status-transitions` route as a checkbox bulk status action; the route updates selected Matter records all-or-blocked, persists audit/timeline evidence, and does not claim broader mass update support.
- Matter activity section exposes real `GET /api/matters/:id/timeline`, `GET/POST/PATCH /api/matters/:id/activities`, safe timeline filters, task create, and status patch controls.
- Track B `SF-B-W03` Activity/Calendar/Channel is route-mounted: activity, calendar, deadline confirmation, internal Channel message, and provider-sync blocked routes are implemented with package service, API regression, apiClient helpers, UI entrypoints, browser QA, and provider/owner gates for external effects.
- Track B `SF-B-W04` Document/Email Builder is route-mounted with owner/provider blocked effects: template registry, builder draft create/patch/preview, approval request/list, owner-blocked publish-to-Vault, email draft create/patch, and provider-blocked send boundary routes are implemented with package service, API regression, apiClient helpers, Matter document UI entrypoints, browser QA, and no fake publish/send success.
- Track B `SF-B-W05` Import/Data Mapping is route-mounted with owner/receipt blocked effects: import job list/create, target registry, source staging, preview, field mapping, dry-run, owner-blocked execute, receipt-blocked rollback, and safe error report routes are implemented with package service, API regression, apiClient helpers, Client/Matter UI entrypoints, browser QA, and no fake import success or raw row/file exposure.
- Track B `SF-B-W06` Permission/Admin Setup is route-mounted with owner/provider blocked effects: permission set read/create/patch, assignment read/owner-blocked assign/revoke, Object Manager read/owner-blocked field policy, connected app read/provider-blocked create/disable, and safe admin audit routes are implemented with package service, API regression, apiClient helpers, People UI entrypoint, browser QA, and no fake grant/revoke/schema/provider success.
- Track B `SF-B-W07` Data Cloud/Enrichment is route-mounted with owner/provider blocked effects: provider list/register, consent records, enrichment job create/preview, provider-blocked execute, safe results, identity owner-blocked candidates, unified profile read, segment activation provider-blocked state, and safe audit routes are implemented with package service, API regression, apiClient helpers, Client 데이터 UI entrypoint, browser QA, and no fake provider enablement, enrichment execution, audience sync, automatic merge, enriched value patch, production approval, or trust claim.
- Track B `SF-B-W08` Report Builder/Client Profitability is route-mounted with owner-blocked sharing: report definition list/create/patch, safe aggregate report run, owner-blocked share, report audit, and ClientProfitability read/refresh routes are implemented with package service, API regression, apiClient helpers, Client `리포트` UI entrypoint, browser QA, and no fake share success, arbitrary SQL execution, raw query/source payload, row-level billing payload, or production/trust claim.
- API CLI startup keeps the server handle alive for local runtime QA; `http://127.0.0.1:4180/api/health` stays reachable when launched as a background local app process.
- Client and Matter surfaces use list/detail/right-panel workspaces rather than a single stacked scroll page.
- Track A read surfaces are connected through `apps/web/src/data/apiClient.js`.
- Track B Account read/create/patch, Contact read/create/patch, Account-Contact relationship read, duplicate merge proposals, and guarded owner-approved merge execution routes are real API-backed surfaces; no fake merge success, direct Matter shortcut, or raw contact-value exposure is present.
- Track B `SF-B-W01R` Account create is mounted, tested, and reflected in Client UI: `POST /api/crm/accounts` persists a CRM runtime Account facade plus canonical Master Data `Party`/`Entity`/`Organization`/`ClientGroup` records with idempotency and `crm.account.created` audit evidence; direct Matter shortcuts remain blocked.
- Track B `SF-B-W01R` Contact create is mounted, tested, and reflected in Client UI: `POST /api/crm/contacts` persists a CRM runtime Contact facade plus canonical Master Data `Party`/`Entity`/`Person`/`ContactPoint` and optional relationship records with idempotency and `crm.contact.created` audit evidence; raw contact values and direct Matter shortcuts remain blocked.
- Track B `SF-B-W01R` duplicate merge proposal review is mounted, tested, and reflected in Client UI: `GET/POST /api/crm/duplicate-merge-proposals` exposes safe candidate counts/status only, and `POST /api/crm/duplicate-merge-proposals/:id/execute` stays approval-gated with dual-control and rollback metadata.
- Track B `SF-B-W01` Account/Contact patch is mounted, tested, and reflected in Client UI: `PATCH /api/crm/accounts/:id` and `PATCH /api/crm/contacts/:id` update only CRM runtime facade records, block canonical Master Data writes, and preserve safe output.
- Track B `SF-B-W02R` broader record actions are mounted, tested, and reflected in Client/Matter UI: `GET /api/record-actions/:object_name/fields`, `GET /api/record-actions/:object_name/bulk-actions`, `POST /api/record-actions/:object_name/:record_id/field-update`, `POST /api/record-actions/:object_name/bulk-updates`, and `GET /api/record-actions/:object_name/:record_id/audit` expose safe field registries, allowlisted field updates, audit feeds, all-or-blocked status updates, and owner/provider blocked states for Client, Account, Contact, and Matter without fake owner/export success.
- Hermes MCP was used in check-only/read-only mode only. No production, deployment, final approval, or enterprise trust claim is made.

## Durable Artifacts

- Client Playwright screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/client-sections.png`
- Matter Playwright screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-sections.png`
- Matter time-entry action screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-time-entry-action.png`
- Matter billing action screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-billing-actions.png`
- Matter analytics action screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-analytics-actions.png`
- Matter audit trail screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-audit-trail.png`
- Matter Vault record workspace screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-workspace.png`
- Matter document facade action screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-document-facade-action.png`
- Matter analytics export action screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-analytics-export-action.png`
- Matter Vault inventory/search/audit screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-vault-inventory-search-audit.png`
- Client Account/Contact read screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-contact-read.png`
- Client Account create screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-create-action.png`
- Client Contact create screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-create-action.png`
- Client Account patch screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/client-account-patch-action.png`
- Client Contact patch screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/client-contact-patch-action.png`
- Client Opportunity handoff refresh screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/client-opportunity-handoff-refresh.png`
- Matter status transition action screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-status-transition-action.png`
- Matter owner assignment action screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-owner-assignment-action.png`
- Matter record owner change screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-record-owner-change-action.png`
- Matter inline edit action screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-inline-edit-action.png`
- Matter recently viewed screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-recently-viewed.png`
- Matter activity timeline read screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-activity-timeline-read.png`
- Matter selected record workspace screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-selected-record-workspace.png`
- Matter saved list views screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-saved-list-views.png`
- Matter bulk status action screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/matter-bulk-status-action.png`
- Salesforce screenshot inventory JSON: `docs/goal-closeout/sf-client-matter-parity/salesforce-screenshot-inventory.json`
- Browser QA receipt JSON: `docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json`
- Browser QA Client workspace screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-workspace.png`
- Browser QA Client merge review screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-merge-review.png`
- Browser QA Client record actions screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-record-actions.png`
- Browser QA Client import/data mapping screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-import.png`
- Browser QA Client data cloud/enrichment screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-data-cloud.png`
- Browser QA Client reports screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-reports.png`
- Browser QA Matter list screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-list.png`
- Browser QA Matter record actions screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-record-actions.png`
- Browser QA Matter command screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-command.png`
- Browser QA Matter Vault screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-vault.png`
- Browser QA Matter document/email builder screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-builder-email.png`
- Browser QA Matter import/data mapping screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-import.png`
- Browser QA Matter activity screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-timeline.png`
- Browser QA Matter calendar screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-calendar.png`
- Browser QA Matter Channel screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-channel.png`
- Browser QA People permission admin screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-people-admin.png`
- Current validation receipt JSON: `docs/goal-closeout/sf-client-matter-parity/current-validation-receipt.json`
- Objective completion audit JSON: `docs/goal-closeout/sf-client-matter-parity/objective-completion-audit.json`
- Surface connection ledger JSON: `docs/goal-closeout/sf-client-matter-parity/surface-connection-ledger.json`
- SF-B-W01 Account/Contact route-mounted contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w01-account-contact-contract.json`
- SF-B-W02 Record Actions route-mounted contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w02-record-actions-contract.json`
- SF-B-W03 Activity/Calendar/Channel route-mounted provider-blocked contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w03-activity-calendar-channel-contract.json`
- SF-B-W04 Document/Email Builder route-mounted owner/provider contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w04-document-email-builder-contract.json`
- SF-B-W05 Import/Data Mapping route-mounted owner-blocked contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w05-import-data-mapping-contract.json`
- SF-B-W06 Permission/Admin Setup route-mounted owner/provider contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json`
- SF-B-W07 Data Cloud/Enrichment route-mounted owner/provider contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json`
- SF-B-W08 Reporting Builder/Client Profitability route-mounted owner-blocked contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json`
- Crosswalk ledger: `workbook/sf-client-matter-parity-crosswalk.md`
- TUW pyramid plan: `workbook/salesforce-parity-tuw-plan.md`
- Validator: `scripts/validate-sf-client-matter-parity-crosswalk.mjs`
- Objective audit generator: `scripts/generate-sf-client-matter-objective-audit.mjs`
- Surface ledger generator: `scripts/generate-sf-client-matter-surface-ledger.mjs`

## Commands

```bash
npm run sf:client-matter-parity:validate
npm run sf:client-matter-parity:inventory
npm run sf:client-matter-parity:objective-audit
npm run sf:client-matter-parity:surface-ledger
npm run sf:client-matter-parity:browser-qa
npm run web:e2e -- matter-vault
node --check apps/api/src/server.js
node --check apps/api/src/crm-intake-runtime-context.js
node --check apps/api/test/cmp-r4-g6-crm-intake.test.js
node --check apps/web/src/data/apiClient.js
node --check scripts/validate-sf-client-matter-parity-crosswalk.mjs
npm --workspace apps/web run test:ui
npm --workspace apps/web run build
node --test apps/api/test/cmp-r4-g4-matter.test.js apps/api/test/cmp-r4-g5-vault.test.js apps/api/test/cmp-r4-g6-crm-intake.test.js apps/api/test/cmp-r4-g7-finance.test.js apps/api/test/cmp-r4-g8-analytics.test.js apps/api/test/matter-vault-integration.test.js
node --test packages/authz/test/authz.test.js
node --test packages/enterprise/test/client-matter-g7-qa-security-baseline.test.js
git diff --check -- apps/api/src/crm-intake-runtime-context.js apps/api/src/routes/crm.js apps/api/src/server.js apps/api/test/cmp-r4-g6-crm-intake.test.js apps/web/src/data/apiClient.js apps/web/src/components/ClientsSurface.jsx apps/web/test/ui-regression.test.mjs scripts/validate-sf-client-matter-parity-crosswalk.mjs workbook/sf-client-matter-parity-crosswalk.md workbook/salesforce-parity-tuw-plan.md docs/goal-closeout/sf-client-matter-parity/evidence.md docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w01-account-contact-contract.json docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json
node --input-type=module <Playwright Matter Vault workspace QA>
node --input-type=module <Playwright Matter document facade action QA>
node --input-type=module <Playwright Matter analytics export action QA>
node --input-type=module <Playwright Matter Vault inventory/search/audit QA; setup uses real POST /api/vault/documents to create audit evidence>
node --test packages/master-data/test/runtime-services.test.js
node --test apps/api/test/cmp-r4-g6-crm-intake.test.js
node --test apps/api/test/sf-b-w02-record-actions.test.js
node --test apps/api/test/cmp-r4-g4-matter.test.js apps/api/test/cmp-r4-g5-vault.test.js apps/api/test/cmp-r4-g6-crm-intake.test.js apps/api/test/cmp-r4-g7-finance.test.js apps/api/test/cmp-r4-g8-analytics.test.js
node --test packages/dms/test/model.test.js packages/dms/test/runtime-services.test.js packages/dms/test/client-matter-g4-dms-foundation.test.js packages/dms/test/client-matter-g4-dms-security-email-search.test.js packages/dms/test/vault-service.test.js
node --input-type=module <SF-B-W01R contract JSON parse and invariant QA>
node --input-type=module <SF-B-W03 contract JSON parse and invariant QA>
node --test apps/api/test/sf-b-w04-document-email-builder.test.js
node --test apps/api/test/sf-b-w05-import-data-mapping.test.js
node --test apps/api/test/sf-b-w07-data-cloud-enrichment.test.js
node --test apps/api/test/sf-b-w08-report-builder-client-profitability.test.js
node --input-type=module <SF-B-W05 contract JSON parse and invariant QA>
node --input-type=module <SF-B-W06 contract JSON parse and invariant QA>
node --input-type=module <SF-B-W07 contract JSON parse and invariant QA>
node --input-type=module <Playwright Client Account/Contact read QA>
node --input-type=module <Playwright Client Account create QA>
node --input-type=module <Playwright Client Contact create QA>
node --input-type=module <Playwright Client Account patch QA>
node --input-type=module <Playwright Client Contact patch QA>
node --input-type=module <Playwright Client Opportunity handoff refresh QA>
node --input-type=module <Playwright Matter status transition action QA>
node --input-type=module <Playwright Matter owner assignment QA>
node --input-type=module <Playwright Matter record owner change QA>
node --input-type=module <Playwright Matter inline edit QA>
node --input-type=module <Playwright Matter recently viewed QA>
node --input-type=module <Playwright Matter activity timeline read QA>
node --input-type=module <Playwright Matter selected record workspace QA>
node --input-type=module <Playwright Matter saved list views QA>
node --input-type=module <Playwright Matter bulk status action QA>
CodeGraph callers: handleCrmAccountPatch, handleCrmContactPatch, patchCrmAccount, patchCrmContact, handleOpportunityHandoff, handoffCrmOpportunityToIntake, upsertResultItem, buildMatterTimelineReadModel, changeMatterDeadline, confirmCriticalDeadlineChange
CodeGraph node/trail: matterDocumentEmailBuilderService -> createMatterDocumentEmailBuilderService -> W04 template/draft/approval/publish/email handlers
tested-visible B-W04 UI controls: data-sf-b-w04-document-builder, data-sf-b-w04-template-picker, data-sf-b-w04-builder-preview, data-sf-b-w04-builder-publish-blocked-result, data-sf-b-w04-email-composer, data-sf-b-w04-email-send-provider-blocked
CodeGraph node/callers: createClientMatterImportJobService, handleImportDataMappingApiRequest, matchImportDataMappingRoute, ImportDataMappingPanel, apiClient import helpers
tested-visible B-W05 UI controls: data-client-matter-import-wizard, data-sf-b-w05-field-mapping-stepper, data-sf-b-w05-dry-run-action, data-sf-b-w05-execute-owner-blocked-result, data-sf-b-w05-rollback-result, data-sf-b-w05-error-report
CodeGraph explore: handleAdminPermissionApiRequest createPermissionAdminSetupService PermissionAdminPanel createPermissionSet assignPermissionSet patchObjectFieldPolicy disableConnectedApp
tested-visible B-W06 UI controls: data-permission-set-admin, data-object-manager-admin, data-connected-apps-admin, data-sf-b-w06-permission-set-create-result, data-sf-b-w06-assignment-owner-blocked-result, data-sf-b-w06-field-policy-owner-blocked-result, data-sf-b-w06-connected-app-provider-blocked-result
CodeGraph explore: handleDataCloudApiRequest createDataCloudEnrichmentService DataCloudEnrichmentPanel fetchDataCloudProviders createDataCloudProvider createEnrichmentJob executeEnrichmentJob runIdentityResolution fetchUnifiedCustomerProfile activateDataCloudSegment
tested-visible B-W07 UI controls: data-data-cloud-enrichment, data-enrichment-provider-admin, data-identity-resolution, data-unified-profile, data-segment-activation, createDataCloudProvider, createEnrichmentJob, executeEnrichmentJob, fetchEnrichmentResults, runIdentityResolution, fetchUnifiedCustomerProfile, activateDataCloudSegment
Lazyweb search: enterprise SaaS report builder analytics dashboard
CodeGraph explore: handleReportsApiRequest createReportBuilderService ReportBuilderPanel report apiClient helpers handleClientProfitabilityCreate server dispatch
tested-visible B-W08 UI controls: data-report-builder, data-report-query-builder, data-report-share-action, data-client-profitability, createReportDefinition, runReportQuery, shareReportDefinition, fetchAnalyticsClientProfitability, refreshClientProfitability
Hermes MCP check-only: hermes.validate.core, hermes.desktop.authority_boundary
LSP diagnostics: crm-intake-runtime-context.js, ClientsSurface.jsx, server.js, apiClient.js
```

## Results

| Gate | Result |
| --- | --- |
| SF parity validator | Passed |
| Current validation receipt | Passed, current local commands recorded with completion/prod/go-live/trust claims false |
| Browser QA receipt generation | Passed, 13 local Client/Matter/People routes, 147/147 checks, and 16 screenshots generated with production/go-live/trust claims false |
| Salesforce screenshot inventory generation | Passed, generated 883 source screenshots, 11 derived PNG assets, 894 total PNGs, 15 contact sheet ranges, and 10 feature taxonomy rows |
| Objective completion audit generation | Passed, 8 active-goal requirements evidence-mapped and completion/prod/go-live/trust claims false |
| Surface connection ledger generation | Passed, 14 implemented rows connected across UI menu, UI surface, apiClient, apps/api route, package service, and evidence groups |
| Validator syntax | Passed |
| CRM runtime/API client syntax | Passed |
| Git diff whitespace check | Passed |
| Web UI regression | Passed, 15/15 |
| Web build | Passed |
| API regression | Passed, 60/60 across G4-G8 plus W02R record actions, W03R activity/calendar/channel, W04R document/email builder, W05R import/data mapping, W06R permission/admin setup, W07R data cloud/enrichment, and W08R report builder/client profitability |
| Playwright Client/Matter click QA | Passed |
| Playwright Client data cloud QA | Passed, `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-data-cloud.png` captures provider setup, consent, enrichment job, identity, unified profile, segment activation, and audit controls with owner/provider-blocked states |
| Playwright Client reports QA | Passed, `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-client-reports.png` captures route-backed report definition, query builder, client profitability, run result, owner-blocked share, and audit controls |
| Playwright browser QA receipt | Passed, `docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json` records 13 routes and 147/147 checks |
| Playwright People permission admin QA | Passed, `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-people-admin.png` captures route-backed permission set, assignment, Object Manager, connected app, and audit controls with owner/provider-blocked state labels |
| Playwright Matter time-entry action QA | Passed |
| Playwright Matter billing/analytics action QA | Passed |
| Playwright Matter audit trail QA | Passed |
| Playwright Matter Vault workspace QA | Passed |
| Playwright Matter document facade action QA | Passed |
| Playwright Matter analytics export action QA | Passed |
| Playwright Matter Vault inventory/search/audit QA | Passed |
| SF-B-W01R contract JSON parse and invariant QA | Passed, canonical Master Data writes and duplicate merge proposal routes are implemented while owner-approved execution remains guarded |
| SF-B-W03 contract JSON parse and invariant QA | Passed, activity/calendar/deadline/channel routes are mounted, UI controls are route-backed, and external provider effects remain provider-blocked before owner/provider receipts |
| SF-B-W04R document/email builder API regression | Passed, `apps/api/test/sf-b-w04-document-email-builder.test.js` 4/4 covers route descriptors, template registry, builder draft idempotency, patch/preview safe responses, approval request/list, owner-blocked publish, email draft patch, provider-blocked send, and denied envelopes |
| SF-B-W04 Lazyweb UI reference check | Passed with caveat, Salesforce-specific document/email builder coverage was weak and adjacent CRM composer/approval coverage was moderate, so no UI parity claim was inferred from Lazyweb alone |
| SF-B-W04 tested visible-control QA | Passed, Matter document UI exposes route-backed template picker, builder draft/preview, approval request, owner-blocked publish, email draft composer, and provider-blocked send state; fake publish/send success controls remain absent |
| SF-B-W04 browser QA screenshot | Passed, `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-builder-email.png` captures the route-backed W04 document/email builder surface |
| SF-B-W05R import/data mapping API regression | Passed, `apps/api/test/sf-b-w05-import-data-mapping.test.js` 4/4 covers target registry, safe import job create/list idempotency, source staging, preview, field mapping, dry-run, owner-blocked execute, receipt-blocked rollback, safe error report, blocked target validation, and denied envelopes |
| SF-B-W05 contract JSON parse and invariant QA | Passed, import jobs, source staging, target registry, preview, field mapping, dry-run, owner-blocked execute, receipt-blocked rollback, and safe error report routes are route-mounted, while owner approval, raw rows/file bytes, provider enablement, production, and trust claims remain blocked |
| SF-B-W05 Lazyweb UI reference check | Passed with caveat, Salesforce-specific import mapping coverage was weak and adjacent SaaS import wizard coverage was moderate, so no UI parity claim was inferred from Lazyweb alone |
| SF-B-W05 tested visible-control search | Passed, Client/Matter UI/apiClient exposes route-backed import wizard, field mapping, dry-run, owner-blocked execute, receipt-blocked rollback, and safe error report controls; fake success, raw row/file, and provider-enabled controls remain absent |
| SF-B-W06 contract JSON parse and invariant QA | Passed, permission set, assignment, Object Manager, connected app, and admin audit routes are route-mounted while actual grant, revoke, schema mutation, provider revocation, production, and trust claims remain owner/provider-blocked |
| SF-B-W06 Lazyweb UI reference check | Passed with caveat, admin/RBAC references had strong adjacent coverage, but Salesforce-specific permission-set parity remains governed by the local screenshot atlas and route-backed contract evidence |
| SF-B-W06 tested visible-control search | Passed, People 권한 관리 UI/apiClient exposes route-backed permission-set, assignment, Object Manager, connected-app, and audit controls; Client/Matter/Admin surfaces remain free of those controls, and fake grant/revoke/schema/provider success remains absent |
| OMO CodeGraph/source B-W06 permission admin check | Passed, CodeGraph confirms `handleAdminPermissionApiRequest` routes through `createPermissionAdminSetupService`, `server.js` dispatch reaches the admin permission runtime, and `PermissionAdminPanel` calls the W06 apiClient helpers while owner/provider effects remain blocked |
| SF-B-W06 Authz foundation regression | Passed, `packages/authz/test/authz.test.js` 122/122 |
| SF-B-W07 contract JSON parse and invariant QA | Passed, Data Cloud provider registry, consent records, enrichment jobs, preview, execution, results, identity resolution, unified profile, segment activation, and audit routes are route-mounted with owner/provider blocked effects and no production/provider/trust claims |
| SF-B-W07 Lazyweb UI reference check | Passed with caveat, CRM enrichment references had strong adjacent coverage, but Salesforce Data Cloud parity remains governed by the local screenshot atlas and route-backed contract evidence |
| SF-B-W07 data cloud/enrichment API regression | Passed, `apps/api/test/sf-b-w07-data-cloud-enrichment.test.js` 4/4 |
| SF-B-W07 tested visible-control search | Passed, Client 데이터 UI/apiClient exposes route-backed provider setup, consent, enrichment job, preview, provider-blocked execute, result list, identity resolution, unified profile, segment activation, and audit controls; Matter/Vault/Import/Admin surfaces remain free of those controls, and fake provider/merge/sync success remains absent |
| SF-B-W07 Enterprise G7 provider-boundary regression | Passed, `packages/enterprise/test/client-matter-g7-qa-security-baseline.test.js` 5/5 |
| SF-B-W08 contract JSON parse and invariant QA | Passed, report definition CRUD, safe aggregate report query runtime, owner-blocked report sharing, report audit, and `/api/analytics/client-profitability` routes are route-mounted with no production/provider/trust claim |
| SF-B-W08 Lazyweb UI reference check | Passed with caveat, reporting/dashboard-builder references had strong adjacent coverage, but Salesforce report builder parity remains governed by the local screenshot atlas and route-backed contract evidence |
| SF-B-W08 report builder/client profitability API regression | Passed, `apps/api/test/sf-b-w08-report-builder-client-profitability.test.js` 4/4 covers route descriptors, report definition list/create/patch, safe aggregate run, owner-blocked share, audit, ClientProfitability read/refresh, and denied envelopes |
| SF-B-W08 OMO CodeGraph/source check | Passed, CodeGraph confirms report route dispatch reaches `handleReportsApiRequest` and `createReportBuilderService`, ClientProfitability is mounted through analytics runtime, and `ReportBuilderPanel` calls the route-backed apiClient helpers while share grants remain owner-blocked |
| SF-B-W08 tested visible-control search | Passed, Client `리포트` UI/apiClient exposes route-backed report builder, report query builder, report run, ClientProfitability refresh/read, owner-blocked report share, and audit controls; fake share success, arbitrary SQL, raw query/source payload, source mutation, and row-level billing payload remain absent |
| Master Data runtime service regression | Passed, 9/9 |
| SF-B-W01R Account/Contact API regression | Passed, included in G6 CRM/Intake 9/9 |
| SF-B-W02R record actions API regression | Passed, `apps/api/test/sf-b-w02-record-actions.test.js` 4/4 |
| SF-B-W02R contract JSON parse and invariant QA | Passed, field registry, field update, audit, owner-blocked, provider-blocked, and visible UI markers are registered without production/go-live/trust claims |
| Playwright Client Account/Contact read QA | Passed, account/relationship/contact rows visible; raw registration/email hidden |
| Playwright Client Account create QA | Passed, route-backed 계정 생성 action persists a CRM runtime Account facade and hides internal tenant/user ids |
| Playwright Client Contact create QA | Passed, route-backed 연락처 생성 action persists a CRM runtime Contact facade and hides raw contact values/internal tenant/user ids |
| Playwright Client Account patch QA | Passed, route-backed 계정 검토 표시 patches a CRM runtime Account facade and hides internal tenant/user ids |
| Playwright Client Contact patch QA | Passed, route-backed 연락처 검토 표시 patches a CRM runtime Contact facade and hides raw contact values/internal tenant/user ids |
| Playwright Client Opportunity handoff refresh QA | Passed, route-backed 전환 action immediately updates the Opportunity stage and Intake link from the safe response without exposing direct Matter refs |
| OMO CodeGraph caller check | Passed, `handleCrmAccountPatch` and `handleCrmContactPatch` are reached only from CRM intake dispatcher; `patchCrmAccount` and `patchCrmContact` are imported and called from `ClientsSurface` inline actions; `upsertResultItem` is scoped to Client opportunity handoff state refresh; B-W03 activity/calendar/deadline/channel runtime is mounted through Matter API dispatch and backed by `createMatterActivityCalendarChannelService` |
| OMO CodeGraph B-W04 caller check | Passed, `createMatterDocumentEmailBuilderService` is reached from Matter runtime, W04 draft/approval/publish/email handlers route through the package service, publish returns owner-blocked state, and external email send returns provider-blocked state rather than a mounted fake-send workflow |
| OMO CodeGraph/source B-W05 import-data mapping check | Passed, CodeGraph/source review confirms `handleImportDataMappingApiRequest` is mounted from `server.js`, route policies resolve through `matchImportDataMappingRoute`, package behavior is centralized in `createClientMatterImportJobService`, and `ImportDataMappingPanel` uses the route-backed apiClient helpers while execute remains owner-blocked and rollback remains receipt-bound |
| SF-B-W02 Matter status transition API regression | Passed, included in G4 Matter 11/11 |
| Playwright Matter status transition action QA | Passed, route-backed 완료 action updates UI and hides internal Client/Vault ids |
| SF-B-W02 Matter owner assignment API regression | Passed, included in G4 Matter 11/11 |
| Playwright Matter owner assignment QA | Passed, route-backed 책임자 지정 updates Matter owner state and hides internal tenant/user ids |
| SF-B-W02 Matter record owner change API regression | Passed, included in G4 Matter 11/11 |
| Playwright Matter record owner change QA | Passed, right-panel owner-change action updates selected Matter owner state and hides internal tenant/user ids |
| SF-B-W02 Matter inline edit API regression | Passed, included in G4 Matter 11/11 |
| Playwright Matter inline edit QA | Passed, right-panel inline edit action patches selected Matter 청구 상태 through `PATCH /api/matters/:id` and hides internal tenant/user ids |
| SF-B-W02 Matter recently viewed API regression | Passed, included in G4 Matter 11/11 |
| Playwright Matter recently viewed QA | Passed, route-backed 최근 본 항목 list updates from `POST` and `GET` routes and hides viewer user ids |
| SF-A-W03 Matter activity timeline read UI | Passed, route-backed `GET /api/matters/:id/timeline` renders safe filters and type/source labels without exposing raw refs |
| Playwright Matter activity timeline read QA | Passed, route-backed 활동 timeline displays after a real timeline event and hides raw internal ids |
| SF-B-W03 Matter activity/calendar/channel API regression | Passed, `apps/api/test/sf-b-w03-activity-calendar-channel.test.js` 4/4 covers route descriptors, create/patch/replay, deadline approval/confirmation, internal channel messages, provider-blocked sync, and denied envelopes |
| Playwright Matter activity/calendar/channel QA | Passed, route-backed activity create/patch, calendar create, deadline approval/confirmation, Channel internal message, and provider-blocked state are visible in the Matter workspace |
| SF-A-W01/A-W03 Matter selected record workspace | Passed, selected Matter row drives Command Center, right panel, and downstream section context |
| Playwright Matter selected record workspace QA | Passed, second Matter row selection updates the right panel and route-backed command request without raw internal ids |
| SF-B-W02 Matter saved list views API regression | Passed, included in G4 Matter 11/11 |
| Playwright Matter saved list views QA | Passed, route-backed saved view selector and save action filter Matter rows and hide owner user ids |
| SF-B-W02 Matter bulk status API regression | Passed, included in G4 Matter 11/11 |
| Playwright Matter bulk status action QA | Passed, checkbox-selected Matters are completed through `POST /api/matters/bulk/status-transitions` and internal tenant/user ids stay hidden |
| Playwright Client record actions QA | Passed, route-backed Client field update, account/contact field update, audit, and owner-blocked state are visible and safe |
| Playwright Matter record actions QA | Passed, route-backed Matter field update, audit feed, and owner-blocked state are visible and safe |
| API local runtime lifecycle QA | Passed, background `node apps/api/src/server.js` stayed listening on `127.0.0.1:4180` and health returned OK |
| Hermes MCP | Passed `hermes.validate.core` and `hermes.desktop.authority_boundary` check-only; no write/deploy/approval authority |
| LSP diagnostics | Attempted, blocked by `Transport closed`; covered by node syntax, API/UI tests, web build, and Playwright QA |

## Remaining Goal Gaps

- Opportunity-to-Intake handoff is represented in the UI for the first opportunity row and the immediate status/Intake-link refresh is reflected; broader bulk handoff workflows remain later Track A work.
- Matter path status transition, Mark Status Complete, responsible-attorney owner assignment, generic record owner-change, allowlisted Matter inline WIP patch, recently viewed, saved list views, checkbox bulk status completion, Client/Matter/Account/Contact W02R field registry/update/audit, and owner/provider-blocked bulk states are mounted and reflected in UI; arbitrary schema mutation, unsafe raw-value edits, and fake owner/export success remain blocked.
- Account read/create/patch, Contact read/create/patch, canonical Master Data write, duplicate merge proposal review, guarded owner-approved merge execution, and W02R record action field/audit/blocked bulk routes are mounted and reflected in UI.
- Time-entry approval/prebill workflows, richer audit-history filtering, and richer matter-scoped profitability filtering remain later Track A work.
- Matter activity/calendar/deadline/Channel controls are route-mounted and reflected in UI; external calendar/channel effects remain provider-blocked pending owner/provider receipts. Document/Email Builder controls are route-mounted and reflected in UI for template selection, builder draft, preview, approval request, owner-blocked publish, email draft, and provider-blocked send. Import/Data Mapping controls are route-mounted and reflected in Client/Matter UI for target selection, source staging, field mapping, safe preview, dry-run, owner-blocked execute, receipt-blocked rollback, and safe error report. Permission/Admin Setup controls are route-mounted and reflected in People 권한 관리 UI for permission sets, assignments, Object Manager, connected apps, and admin audit; actual grant, revoke, schema mutation, provider revocation, production approval, and trust claims remain owner/provider-blocked. Data Cloud/Enrichment controls are route-mounted and reflected in Client 데이터 UI for provider registry, consent, enrichment preview, provider-blocked execute, results, identity owner-blocked candidates, unified profile, segment activation, and audit; provider enablement, external enrichment, audience sync, automatic merge, enriched value patching, production approval, and trust claims remain owner/provider-blocked. Report Builder/Client Profitability controls are route-mounted and reflected in Client 리포트 UI for report definition list/create/patch, safe aggregate run, ClientProfitability refresh/read, owner-blocked share, and audit; report share grants, arbitrary SQL, raw query/source payloads, row-level billing payloads, production approval, and trust claims remain blocked.
- This evidence is local/runtime evidence only and does not imply production approval or go-live.
