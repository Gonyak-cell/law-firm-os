# SF Client/Matter Parity Evidence

Program: `SF-CLIENT-MATTER-PARITY`
Date: 2026-06-24
Status: local evidence captured, active goal not yet closed

## Scope Verified In This Slice

- Salesforce atlas is present at `Law Firm OS UI/Salesforce web Mar 2026/` with at least 894 PNG files plus `showcase.html`.
- Salesforce screenshot inventory is captured at `docs/goal-closeout/sf-client-matter-parity/salesforce-screenshot-inventory.json`; it separates 883 source screenshots from 11 derived preview/logo PNG assets and binds showcase feature markers to parity lanes.
- Objective completion audit is captured at `docs/goal-closeout/sf-client-matter-parity/objective-completion-audit.json`; it maps 8 active-goal requirements to current evidence and keeps goal completion, production, go-live, and enterprise trust claims false.
- Current validation receipt is captured at `docs/goal-closeout/sf-client-matter-parity/current-validation-receipt.json`; it records the latest local UI regression, web build, API regression, `web:e2e matter-vault`, browser QA receipt, SF parity scripts, and Hermes check-only pass results as local evidence only.
- Browser QA receipt is captured at `docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json`; Chromium drove Client accounts, Matter list, Matter command, Matter Vault, and Matter activity routes against the local API/Vite stack, generating 5 screenshots and keeping production, go-live, and enterprise trust claims false.
- Surface connection ledger is captured at `docs/goal-closeout/sf-client-matter-parity/surface-connection-ledger.json`; it verifies 10 implemented Client/Matter rows are connected across UI menu, UI surface, apiClient, apps/api route, package service, and evidence groups.
- Client menu exposes list, lead, opportunity, intake, account read, and contact read sections.
- Client opportunity section exposes the real `/api/crm/opportunities/:id/handoff` route as a guarded UI action and immediately refreshes the Opportunity stage/Intake link from the safe route response.
- Client intake section exposes the real `/api/intake/conflict-checks`, `/api/intake/clearance-tokens`, and `/api/intake/audit` routes as guarded review actions.
- Matter menu exposes list, command, document, activity, opening, team, billing, and analytics sections.
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
- Matter activity section exposes the real `GET /api/matters/:id/timeline` route as a read-only Salesforce-style activity timeline with safe type/source labels and client-side filters; activity write, calendar CRUD, and channel composer actions remain hidden until backend contracts land.
- Track B `SF-B-W03` Activity/Calendar/Channel contract is registered: current `GET /api/matters/:id/timeline` remains the only mounted UI route, while activity write, calendar, deadline, and Matter Channel APIs are backend-first with route policy, repository/service, VC, owner, provider, and evidence gates.
- Track B `SF-B-W04` Document/Email Builder contract is registered: current Vault/DMS routes remain real, while template registry, builder drafts, approval requests, approved publish, email drafts, and external send are backend-first with route policy, repository/service, VC, owner, provider, and evidence gates; no fake builder/composer/send UI is exposed.
- Track B `SF-B-W05` Import/Data Mapping contract is registered: current payment import and CRM/Matter bulk actions remain scoped real actions, while generic import jobs, source staging, target registry, preview, field mapping, dry-run, execute, rollback, and safe error reports are backend-first with route policy, repository/service, VC, owner, and evidence gates; no fake import wizard/mapping UI is exposed.
- Track B `SF-B-W06` Permission/Admin Setup contract is registered: current `x-lawos-permission-context`, route gate, authz evaluator, read-only simulator, admin simulator, policy store, permission context store, and object ACL store remain foundation only, while permission-set CRUD, assignment grant/revoke, object-manager field policy, connected app admin, admin audit, owner decisions, and provider effects are backend-first with route policy, repository/service, VC, owner, provider, and evidence gates; no fake permission/admin UI is exposed.
- Track B `SF-B-W07` Data Cloud/Enrichment contract is registered: current Data Cloud evidence is limited to the Salesforce atlas tab, Law Firm OS `synthetic_crosswalk` metadata, internal `matter_core_enrichment` Matter-link labels, and provider-runtime blocking descriptors, while provider registry, consent governance, enrichment jobs, safe preview, execution, results, identity resolution, unified profile, segment activation, owner decisions, and provider effects are backend-first with route policy, repository/service, VC, owner, provider, and evidence gates; no fake Data Cloud/enrichment UI is exposed.
- Track B `SF-B-W08` Report Builder/Client Profitability contract is registered: current analytics evidence is limited to mounted dashboard, refresh, matter-profitability, export, and audit routes plus the package-level `createClientProfitability` foundation; `/api/reports/*` and `/api/analytics/client-profitability` are not mounted routes, so report definition CRUD, safe report query execution, report sharing/audit, and Client profitability UI remain backend-first with route policy, repository/service, VC, owner, and evidence gates; no fake report builder or Client profitability UI is exposed.
- API CLI startup keeps the server handle alive for local runtime QA; `http://127.0.0.1:4180/api/health` stays reachable when launched as a background local app process.
- Client and Matter surfaces use list/detail/right-panel workspaces rather than a single stacked scroll page.
- Track A read surfaces are connected through `apps/web/src/data/apiClient.js`.
- Track B Account read/create/patch, Contact read/create/patch, Account-Contact relationship read, and duplicate review routes are real API-backed surfaces; canonical Master Data write migration and merge execution gaps remain explicit backend-contract work, not fake actions.
- Track B `SF-B-W01` Account create is mounted, tested, and reflected in Client UI: `POST /api/crm/accounts` persists a CRM runtime Account facade with idempotency and `crm.account.created` audit evidence; direct Matter shortcuts remain blocked.
- Track B `SF-B-W01` Contact create is mounted, tested, and reflected in Client UI: `POST /api/crm/contacts` persists a CRM runtime Contact facade with idempotency and `crm.contact.created` audit evidence; raw contact values and direct Matter shortcuts remain blocked.
- Track B `SF-B-W01` Account/Contact patch is mounted, tested, and reflected in Client UI: `PATCH /api/crm/accounts/:id` and `PATCH /api/crm/contacts/:id` update only CRM runtime facade records, block canonical Master Data writes, and preserve safe output.
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
- Browser QA Matter list screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-list.png`
- Browser QA Matter command screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-command.png`
- Browser QA Matter Vault screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-vault.png`
- Browser QA Matter activity screenshot: `docs/goal-closeout/sf-client-matter-parity/artifacts/browser-qa-matter-timeline.png`
- Current validation receipt JSON: `docs/goal-closeout/sf-client-matter-parity/current-validation-receipt.json`
- Objective completion audit JSON: `docs/goal-closeout/sf-client-matter-parity/objective-completion-audit.json`
- Surface connection ledger JSON: `docs/goal-closeout/sf-client-matter-parity/surface-connection-ledger.json`
- SF-B-W01 Account/Contact backend-first contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w01-account-contact-contract.json`
- SF-B-W03 Activity/Calendar/Channel backend-first contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w03-activity-calendar-channel-contract.json`
- SF-B-W04 Document/Email Builder backend-first contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w04-document-email-builder-contract.json`
- SF-B-W05 Import/Data Mapping backend-first contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w05-import-data-mapping-contract.json`
- SF-B-W06 Permission/Admin Setup backend-first contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json`
- SF-B-W07 Data Cloud/Enrichment backend-first contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json`
- SF-B-W08 Reporting Builder/Client Profitability backend-first contract: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json`
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
node --test packages/dms/test/model.test.js packages/dms/test/runtime-services.test.js packages/dms/test/client-matter-g4-dms-foundation.test.js packages/dms/test/client-matter-g4-dms-security-email-search.test.js packages/dms/test/vault-service.test.js
node --input-type=module <SF-B-W01 contract JSON parse and invariant QA>
node --input-type=module <SF-B-W03 contract JSON parse and invariant QA>
node --input-type=module <SF-B-W04 contract JSON parse and invariant QA>
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
CodeGraph callers: handleMatterDocumentFacade, uploadDocument, createDmsEmailThread
rg forbidden B-W04 UI controls: data-matter-document-builder, data-matter-email-composer, requestBuilderApproval, publishBuilderDraft, sendMatterEmail, createBuilderDraft
CodeGraph explore: import data mapping ingestion csv upload manifest preview validation rollback importFinancePayment
rg forbidden B-W05 UI controls: data-client-matter-import-wizard, data-import-field-mapping-stepper, createClientMatterImportJob, stageImportSourceFile, saveImportFieldMapping, dryRunClientMatterImport, executeClientMatterImport, rollbackClientMatterImport
CodeGraph explore: permission admin simulator routeGate evaluatePermission permission-simulator PERMISSION_CONTEXT_HEADER policy-store permission-context-store object-acl-store
rg forbidden B-W06 UI controls: data-permission-set-admin, data-object-manager-admin, data-connected-apps-admin, createPermissionSet, assignPermissionSet, revokePermissionSetAssignment, patchObjectFieldPolicy, createConnectedApp, disableConnectedApp
CodeGraph explore: Data Cloud enrichment provider crm enrichment client matter external provider profile provenance consent apiClient ClientsSurface MattersSurface analytics dashboard customer profile
rg forbidden B-W07 UI controls: data-data-cloud-enrichment, data-enrichment-provider-admin, data-identity-resolution, data-unified-profile, data-segment-activation, createDataCloudProvider, createEnrichmentJob, executeEnrichmentJob, fetchEnrichmentResults, runIdentityResolution, fetchUnifiedCustomerProfile, activateDataCloudSegment
Lazyweb search: enterprise SaaS report builder analytics dashboard
CodeGraph explore: analytics-runtime-context handleAnalyticsApiRequest handleAnalyticsRefresh handleMatterProfitabilityCreate handleAnalyticsExportCreate createAnalyticsExport packages/analytics report builder report definition client profitability apiClient MattersSurface ClientsSurface
rg forbidden B-W08 UI controls: data-report-builder, data-report-query-builder, data-report-share-action, data-client-profitability, createReportDefinition, runReportQuery, shareReportDefinition, fetchClientProfitability, refreshClientProfitability
Hermes MCP check-only: hermes.validate.core, hermes.desktop.authority_boundary
LSP diagnostics: crm-intake-runtime-context.js, ClientsSurface.jsx, server.js, apiClient.js
```

## Results

| Gate | Result |
| --- | --- |
| SF parity validator | Passed |
| Current validation receipt | Passed, 11 current local commands recorded with completion/prod/go-live/trust claims false |
| Browser QA receipt generation | Passed, 5 local Client/Matter routes, 20/20 checks, and 5 screenshots generated with production/go-live/trust claims false |
| Salesforce screenshot inventory generation | Passed, generated 883 source screenshots, 11 derived PNG assets, 894 total PNGs, 15 contact sheet ranges, and 10 feature taxonomy rows |
| Objective completion audit generation | Passed, 8 active-goal requirements evidence-mapped and completion/prod/go-live/trust claims false |
| Surface connection ledger generation | Passed, 10 implemented rows connected across UI menu, UI surface, apiClient, apps/api route, package service, and evidence groups |
| Validator syntax | Passed |
| CRM runtime/API client syntax | Passed |
| Git diff whitespace check | Passed |
| Web UI regression | Passed, 15/15 |
| Web build | Passed |
| API regression | Passed, 31/31 |
| Playwright Client/Matter click QA | Passed |
| Playwright browser QA receipt | Passed, `docs/goal-closeout/sf-client-matter-parity/browser-qa-receipt.json` records 5 routes and 20/20 checks |
| Playwright Matter time-entry action QA | Passed |
| Playwright Matter billing/analytics action QA | Passed |
| Playwright Matter audit trail QA | Passed |
| Playwright Matter Vault workspace QA | Passed |
| Playwright Matter document facade action QA | Passed |
| Playwright Matter analytics export action QA | Passed |
| Playwright Matter Vault inventory/search/audit QA | Passed |
| SF-B-W01 contract JSON parse and invariant QA | Passed |
| SF-B-W03 contract JSON parse and invariant QA | Passed, activity/calendar/deadline/channel routes stay contract-only and UI write exposure remains blocked before route tests |
| SF-B-W04 contract JSON parse and invariant QA | Passed, document/email builder, approval, publish, and external send routes stay contract-only/provider-gated and UI exposure remains blocked before route/provider tests |
| SF-B-W04 Lazyweb UI reference check | Passed with caveat, Salesforce-specific document/email builder coverage was weak and adjacent CRM composer/approval coverage was moderate, so no UI parity claim was inferred from Lazyweb alone |
| SF-B-W04 forbidden UI control search | Passed, no Matter UI/apiClient source matches for document builder, email composer, approval, publish, send, or builder draft controls before route/provider tests |
| SF-B-W04 Vault/DMS API regression | Passed, targeted Vault and Matter-Vault API tests 5/5 |
| SF-B-W04 DMS model/service regression | Passed, targeted DMS model/runtime/foundation/security/search/vault tests 140/140 |
| SF-B-W05 contract JSON parse and invariant QA | Passed, import jobs, source staging, target registry, preview, field mapping, dry-run, execute, rollback, and safe error report routes stay contract-only and UI exposure remains blocked before route tests |
| SF-B-W05 Lazyweb UI reference check | Passed with caveat, Salesforce-specific import mapping coverage was weak and adjacent SaaS import wizard coverage was moderate, so no UI parity claim was inferred from Lazyweb alone |
| SF-B-W05 forbidden UI control search | Passed, no Client/Matter UI/apiClient source matches for generic import wizard, field mapping stepper, dry-run, execute, rollback, or import error report controls before route tests |
| SF-B-W06 contract JSON parse and invariant QA | Passed, permission-set CRUD, assignment grant/revoke, object-manager field policy, connected-app admin, and admin audit routes stay contract-only/provider-gated and UI exposure remains blocked before route/provider tests |
| SF-B-W06 Lazyweb UI reference check | Passed with caveat, admin/RBAC references had strong adjacent coverage, but Salesforce-specific permission-set parity remains governed by the local screenshot atlas and backend-first contract |
| SF-B-W06 forbidden UI control search | Passed, no Client/Matter/Admin UI/apiClient source matches for permission-set admin, object-manager editor, connected-app admin, grant, revoke, or disable controls before route/provider tests |
| SF-B-W06 Authz foundation regression | Passed, `packages/authz/test/authz.test.js` 122/122 |
| SF-B-W07 contract JSON parse and invariant QA | Passed, Data Cloud provider registry, consent records, enrichment jobs, preview, execution, results, identity resolution, unified profile, and segment activation routes stay contract-only/provider-gated and UI exposure remains blocked before route/provider tests |
| SF-B-W07 Lazyweb UI reference check | Passed with caveat, CRM enrichment references had strong adjacent coverage, but Salesforce Data Cloud parity remains governed by the local screenshot atlas and backend-first contract |
| SF-B-W07 forbidden UI control search | Passed, no Client/Matter/Admin UI/apiClient source matches for Data Cloud provider setup, enrichment run, identity resolution, unified profile, segment activation, or audience sync controls before route/provider tests |
| SF-B-W07 Enterprise G7 provider-boundary regression | Passed, `packages/enterprise/test/client-matter-g7-qa-security-baseline.test.js` 5/5 |
| SF-B-W08 contract JSON parse and invariant QA | Passed, report definition CRUD, safe report query runtime, report sharing/audit, and `/api/analytics/client-profitability` routes stay contract-only and UI exposure remains blocked before route tests |
| SF-B-W08 Lazyweb UI reference check | Passed with caveat, reporting/dashboard-builder references had strong adjacent coverage, but Salesforce report builder parity remains governed by the local screenshot atlas and backend-first contract |
| SF-B-W08 OMO CodeGraph/source check | Passed, current API dispatch includes dashboard, refresh, matter-profitability, export, and audit handlers; `packages/analytics` contains `createClientProfitability`, but no `/api/reports/*` or `/api/analytics/client-profitability` mounted route/apiClient/UI handler exists |
| SF-B-W08 forbidden UI control search | Passed, no Client/Matter/Admin UI/apiClient source matches for report builder, report query builder, report share action, or Client profitability controls before route tests |
| SF-B-W08 Analytics foundation regression | Passed, `packages/analytics/test/runtime-services.test.js` validates ClientProfitability/MatterProfitability safe read-model foundations without opening report routes |
| Master Data runtime service regression | Passed, 9/9 |
| SF-B-W01 Account/Contact API regression | Passed, included in G6 CRM/Intake 8/8 |
| Playwright Client Account/Contact read QA | Passed, account/relationship/contact rows visible; raw registration/email hidden |
| Playwright Client Account create QA | Passed, route-backed 계정 생성 action persists a CRM runtime Account facade and hides internal tenant/user ids |
| Playwright Client Contact create QA | Passed, route-backed 연락처 생성 action persists a CRM runtime Contact facade and hides raw contact values/internal tenant/user ids |
| Playwright Client Account patch QA | Passed, route-backed 계정 검토 표시 patches a CRM runtime Account facade and hides internal tenant/user ids |
| Playwright Client Contact patch QA | Passed, route-backed 연락처 검토 표시 patches a CRM runtime Contact facade and hides raw contact values/internal tenant/user ids |
| Playwright Client Opportunity handoff refresh QA | Passed, route-backed 전환 action immediately updates the Opportunity stage and Intake link from the safe response without exposing direct Matter refs |
| OMO CodeGraph caller check | Passed, `handleCrmAccountPatch` and `handleCrmContactPatch` are reached only from CRM intake dispatcher; `patchCrmAccount` and `patchCrmContact` are imported and called from `ClientsSurface` inline actions; `upsertResultItem` is scoped to Client opportunity handoff state refresh; B-W03 timeline read is mounted through `handleMatterTimeline`, while deadline/calendar write primitives are package/test-only until route contracts land |
| OMO CodeGraph B-W04 caller check | Passed, `handleMatterDocumentFacade` is reached from Matter API dispatch, `uploadDocument` is reached from the Matter document facade, and `createDmsEmailThread` remains DMS foundation/synthetic-service scoped rather than a mounted email send workflow |
| OMO CodeGraph/source B-W05 import-data mapping check | Passed, CodeGraph found `handleFinancePaymentImport` dispatched only by `handleFinanceApiRequest`, and source search confirms the current import-like UI action is limited to `importFinancePayment -> /api/finance/payments`; generic import job, field mapping, dry-run, execute, rollback, and error-report handlers were not found as mounted Client/Matter workflows |
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
| SF-A-W01/A-W03 Matter selected record workspace | Passed, selected Matter row drives Command Center, right panel, and downstream section context |
| Playwright Matter selected record workspace QA | Passed, second Matter row selection updates the right panel and route-backed command request without raw internal ids |
| SF-B-W02 Matter saved list views API regression | Passed, included in G4 Matter 11/11 |
| Playwright Matter saved list views QA | Passed, route-backed saved view selector and save action filter Matter rows and hide owner user ids |
| SF-B-W02 Matter bulk status API regression | Passed, included in G4 Matter 11/11 |
| Playwright Matter bulk status action QA | Passed, checkbox-selected Matters are completed through `POST /api/matters/bulk/status-transitions` and internal tenant/user ids stay hidden |
| API local runtime lifecycle QA | Passed, background `node apps/api/src/server.js` stayed listening on `127.0.0.1:4180` and health returned OK |
| Hermes MCP | Passed `hermes.validate.core` and `hermes.desktop.authority_boundary` check-only; no write/deploy/approval authority |
| LSP diagnostics | Attempted, blocked by `Transport closed`; covered by node syntax, API/UI tests, web build, and Playwright QA |

## Remaining Goal Gaps

- Opportunity-to-Intake handoff is represented in the UI for the first opportunity row and the immediate status/Intake-link refresh is reflected; broader bulk handoff workflows remain later Track A work.
- Matter path status transition, Mark Status Complete, responsible-attorney owner assignment, generic record owner-change, allowlisted Matter inline WIP patch, recently viewed, saved list views, and checkbox bulk status completion are mounted and reflected in UI; broader field editors, broader checkbox bulk actions, and mass update remain backend-first Track B work.
- Account read/create/patch and Contact read/create/patch routes are mounted and reflected in UI; canonical Master Data write migration and merge execution remain backend-first Track B.
- Time-entry approval/prebill workflows, richer audit-history filtering, and richer matter-scoped profitability filtering remain later Track A work.
- Matter activity timeline read is reflected in UI; Activity/Calendar/Deadline/Matter Channel route policy and VC gates are registered in `SF-B-W03`; Document/Email Builder route policy, approval/publish/send provider gates, and VC gates are registered in `SF-B-W04`; Import/Data Mapping route policy, dry-run/execute/rollback gates, and VC gates are registered in `SF-B-W05`; Permission/Admin Setup route policy, owner/provider gates, and VC gates are registered in `SF-B-W06`; Data Cloud/Enrichment route policy, owner/provider gates, and VC gates are registered in `SF-B-W07`; Report Builder/Client Profitability route policy, safe query, share/audit, and Client profitability route gates are registered in `SF-B-W08`; actual write/provider/report routes beyond the tested analytics foundation remain backend-first Track B.
- This evidence is local/runtime evidence only and does not imply production approval or go-live.
