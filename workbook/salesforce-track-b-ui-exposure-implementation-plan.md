# SF-CLIENT-MATTER-PARITY Track B UI Exposure Implementation Plan

Date: 2026-06-24
Status: implementation plan, no production/go-live/trust claim

## 0. 기준선

LazyCodex/OMO CodeGraph 기준:

- `ClientsSurface` already exposes Client list, leads, opportunities, intake, accounts, contacts, and a right-side Client record panel.
- `MattersSurface` already exposes Matter list, command, Vault, activity timeline read, opening, team, billing, analytics, and a right-side Matter record panel.
- `apiClient.js` already carries permission-context conventions and helper patterns for live API-backed surfaces.
- Current crosswalk says Track A is locally reflected for confirmed backend routes, while Track B still contains contract-only or partial lanes.

Lazyweb/UI evidence already bound in `workbook/sf-client-matter-parity-crosswalk.md`:

- Enterprise CRM patterns use list/detail/right-panel record workspaces.
- Report builder patterns combine reports/dashboards navigation, filters, result tables/charts, saved metadata, and sharing controls.
- Composer, import/mapping, admin/RBAC, enrichment, and report builder UI must become real screens only after route/query/provider tests pass.

Hard boundary:

- Every item below must end with visible UI entrypoints.
- UI exposure is allowed only after backend route policy, repository/service, API tests, safe response shape, audit evidence, and browser QA pass.
- No placeholder tables, fake provider controls, fake send/import/merge actions, or production/go-live/enterprise trust claim.

## 1. Program Shape

| Level | Name | Meaning |
| --- | --- | --- |
| WP | Work Package | One implementation lane that can ship as a PR stack |
| TUW | Testable Unit of Work | Minimal backend/UI slice with one observable behavior |
| VC | Verification Case | API, UI, e2e, browser, forbidden-control, and evidence checks |
| Evidence | Receipt | JSON, screenshot, validator output, and Hermes check-only result |

Implementation order:

1. `B-W01R`: Account/Contact canonical write and merge.
2. `B-W02R`: broader record actions and mass update.
3. `B-W03R`: activity write, calendar, deadline, Matter Channel.
4. `B-W04R`: document/email builder, approval, publish, provider send boundary.
5. `B-W05R`: import/data mapping.
6. `B-W06R`: admin setup and permission management.
7. `B-W07R`: Data Cloud/enrichment.
8. `B-W08R`: report builder and Client profitability.
9. `B-CLOSE`: full UI exposure, validator, browser QA, Hermes check-only receipt.

## 2. B-W01R - Account/Contact Canonical Write and Merge UI

Goal: finish the remaining Account/Contact gap beyond runtime facade create/patch.

| TUW | Backend | UI exposure | VC |
| --- | --- | --- | --- |
| `SF-B-W01R-T01` | Add canonical Master Data write migration service for Account-backed `Organization` and Contact-backed `Person`/`ContactPoint`; keep CRM runtime facade compatibility. | Client > 계정 and Client > 연락처 add a "Master Data 동기화" status panel, not a raw ID table. | API idempotency, audit, permission denied, no direct Matter shortcut. |
| `SF-B-W01R-T02` | Implement duplicate merge proposal route: `GET/POST /api/crm/duplicate-merge-proposals`. | Client right panel shows merge candidates and review status. | No automatic merge, no raw contact values. |
| `SF-B-W01R-T03` | Implement owner-approved merge execution route: `POST /api/crm/duplicate-merge-proposals/:id/execute`. | Client > 계정/연락처 exposes guarded "병합 실행" only for approved proposal state. | Dual-control approval, rollback metadata, audit trail. |
| `SF-B-W01R-T04` | Extend surface ledger and validator rows from contract-only to implemented. | Browser QA covers account/contact merge review and execution disabled/enabled states. | `npm run sf:client-matter-parity:validate`, UI test, browser screenshot. |

## 3. B-W02R - Broader Record Actions and Mass Update UI

Goal: extend from the current Matter status/owner/inline patch/list-view/bulk-status subset to full Salesforce-style record actions.

| TUW | Backend | UI exposure | VC |
| --- | --- | --- | --- |
| `SF-B-W02R-T01` | Add field-action registry route: `GET /api/record-actions/:objectName/fields` with allowlist metadata. | Client and Matter right panels show editable field groups by policy. | Forbidden fields omitted, no schema mutation. |
| `SF-B-W02R-T02` | Add generic safe patch routes for approved Client, Account, Contact, and Matter fields. | Inline edit controls appear in right panel and detail header. | Field validation, idempotency, audit. |
| `SF-B-W02R-T03` | Add bulk action route registry and bulk owner/status/field update routes. | Matter list and Client lists expose checkbox action menu: owner, status, field update, export request. | All-or-blocked execution, safe counts, no hidden row leakage. |
| `SF-B-W02R-T04` | Add record action audit feed route. | Right panel shows "최근 작업" action history. | Actor refs safe, no raw tenant/user leakage. |

## 4. B-W03R - Activity, Calendar, Deadline, Matter Channel UI

Goal: turn current read-only timeline into full activity/collaboration workspace.

| TUW | Backend | UI exposure | VC |
| --- | --- | --- | --- |
| `SF-B-W03R-T01` | Mount `GET/POST/PATCH /api/matters/:id/activities`. | Matter > 활동 adds composer, task/note/email-log type selector, and status grouping. | Audit/timeline append, safe labels, no external send. |
| `SF-B-W03R-T02` | Mount `GET/POST/PATCH /api/matters/:id/calendar-events`. | New Matter > 일정 section with agenda/list/detail/right-panel. | Date validation, permission, provider boundary. |
| `SF-B-W03R-T03` | Mount deadline routes and dual-control confirmation. | Matter > 일정 adds critical deadline board and confirmation flow. | Dual-control approval, immutable audit. |
| `SF-B-W03R-T04` | Mount `GET /api/matters/:id/channel` and internal message draft route. | Matter right panel adds Matter Channel tab and composer. | Internal-only message log before provider gate. |
| `SF-B-W03R-T05` | Add optional Teams/Slack provider adapter boundary, disabled until configured. | Channel provider controls appear only as configured provider status, not send buttons until gate passes. | Provider receipt, no credential exposure. |

## 5. B-W04R - Document/Email Builder, Approval, Publish UI

Goal: expose Salesforce-style builder only after actual template/draft/approval/publish/send routes exist.

| TUW | Backend | UI exposure | VC |
| --- | --- | --- | --- |
| `SF-B-W04R-T01` | Mount template registry: `GET /api/matters/:id/document-templates`. | Matter > 문서 adds "템플릿" tab and template picker. | Merge-field allowlist, safe metadata only. |
| `SF-B-W04R-T02` | Mount builder draft create/patch/preview routes. | Matter > 문서 adds builder workspace with preview panel. | Reject script/raw HTML, omit document bytes/raw values. |
| `SF-B-W04R-T03` | Mount approval request/read routes. | Builder shows approval status, request button, approver status list. | Owner-approved policy, dual-control, audit/timeline. |
| `SF-B-W04R-T04` | Mount publish-to-Vault route through DMS. | Builder exposes "Vault에 게시" after approved draft. | DMS envelope only, raw storage hidden. |
| `SF-B-W04R-T05` | Mount email draft create/patch/send boundary. | Matter > 문서 or 활동 exposes email draft composer; send button stays disabled until provider/approval receipt. | No external send before Microsoft Graph/Outlook provider gate. |

## 6. B-W05R - Import/Data Mapping UI

Goal: add a Salesforce-style import wizard with real backend execution and rollback.

| TUW | Backend | UI exposure | VC |
| --- | --- | --- | --- |
| `SF-B-W05R-T01` | Mount import job and target registry routes. | New Client/Matter "가져오기" section lists jobs and target objects. | Permission, idempotency, safe job metadata. |
| `SF-B-W05R-T02` | Mount source-file staging and preview routes. | Import wizard step 1: upload/stage, preview counts and sampled safe rows. | File bytes/raw rows omitted from response. |
| `SF-B-W05R-T03` | Mount field mapping save route. | Wizard step 2: mapping table with source fields, target fields, validation badges. | Required field validation, no unsafe target. |
| `SF-B-W05R-T04` | Mount dry-run and execute routes. | Wizard step 3: dry-run result, then guarded execute button. | Dry-run mutates nothing; execute audited/idempotent. |
| `SF-B-W05R-T05` | Mount rollback and error-report routes. | Wizard step 4: results, rollback action, safe error report. | Rollback audit, raw values omitted. |

## 7. B-W06R - Permission/Admin Setup UI

Goal: expose Salesforce-like admin setup as controlled Client/Matter operations UI, not as fake global admin.

| TUW | Backend | UI exposure | VC |
| --- | --- | --- | --- |
| `SF-B-W06R-T01` | Mount permission set registry CRUD. | New "운영 설정" section shows permission set list/editor. | Owner-approved taxonomy, audit. |
| `SF-B-W06R-T02` | Mount permission assignment grant/revoke. | Assignment panel with users/groups/roles and dual-control state. | Grant/revoke audit, no raw personal identifiers. |
| `SF-B-W06R-T03` | Mount object manager metadata policy routes. | Object Manager panel for field visibility/editability policy. | No physical schema mutation. |
| `SF-B-W06R-T04` | Mount connected-app read/disable boundary. | Connected Apps panel with provider status and disable workflow. | Credentials omitted, provider revocation receipt. |
| `SF-B-W06R-T05` | Add admin audit feed and forbidden-control validator. | Setup panel shows audit only after backend routes pass. | `VC-SF-B-W06-UI-001` flips from forbidden fake controls to tested visible controls. |

## 8. B-W07R - Data Cloud/Enrichment UI

Goal: expose enrichment as provider-gated Client intelligence, not synthetic labels.

| TUW | Backend | UI exposure | VC |
| --- | --- | --- | --- |
| `SF-B-W07R-T01` | Mount provider registry and consent routes. | Client > 데이터 section shows provider status, lawful basis, consent records. | DPA/privacy owner decision recorded. |
| `SF-B-W07R-T02` | Mount enrichment job create/preview/execute routes. | Data section exposes enrichment job wizard and safe preview. | Provider receipt, safe counts, no raw payload. |
| `SF-B-W07R-T03` | Mount results and identity resolution routes. | Client right panel shows enrichment results, confidence bands, review candidates. | No automatic merge. |
| `SF-B-W07R-T04` | Mount unified profile route. | Client detail adds unified profile tab. | Provenance visible, direct identifiers redacted. |
| `SF-B-W07R-T05` | Mount segment activation route. | Data section exposes segment activation workflow only after provider gate. | Audience sync receipt, no credential exposure. |

## 9. B-W08R - Report Builder and Client Profitability UI

Goal: add real report definition/query/share routes and visible report-builder workspace.

| TUW | Backend | UI exposure | VC |
| --- | --- | --- | --- |
| `SF-B-W08R-T01` | Mount `GET/POST/PATCH /api/reports` with `ReportDefinition`, filters, columns, chart config. | New Client/Matter "리포트" section lists saved reports and opens builder. | Metadata-only safe output. |
| `SF-B-W08R-T02` | Mount `POST /api/reports/:id/run` safe aggregate planner. | Builder shows filters, run button, bounded table/chart results. | No arbitrary SQL, row limits, omitted-counts. |
| `SF-B-W08R-T03` | Mount report share and audit routes. | Builder exposes share dialog and report audit panel. | Permission, no raw query payload. |
| `SF-B-W08R-T04` | Mount `GET/POST /api/analytics/client-profitability`. | Client > 분석/리포트 adds profitability panel and refresh action. | Uses existing `createClientProfitability` foundation, no Client identity mutation. |
| `SF-B-W08R-T05` | Wire report cards into Matter analytics and Client workspace. | Matter > 분석 links to saved Matter reports; Client right panel shows profitability summary. | Browser QA covers list, builder, run, share, profitability refresh. |

## 10. UI Exposure Map

| UI area | New visible entrypoints after implementation |
| --- | --- |
| Client sidebar | 목록, 리드, 기회, 접수, 계정, 연락처, 가져오기, 데이터, 리포트, 운영 설정 |
| Client right panel | merge review, canonical sync, editable fields, enrichment profile, profitability summary, recent actions |
| Matter sidebar | 목록, Command Center, 문서, 활동, 일정, Channel, 개시, 팀, 청구, 분석, 리포트, 가져오기 |
| Matter right panel | owner/field actions, action audit, Channel tab, deadline highlights, report links |
| Matter > 문서 | Vault, templates, builder, approval, publish, email drafts |
| Matter > 활동/일정 | timeline, activity composer, tasks, calendar events, deadlines, Channel |
| Operations setup | permission sets, assignments, object policy, connected apps, admin audit |

## 11. Required Validators

Add or extend:

- `scripts/validate-sf-client-matter-parity-crosswalk.mjs`
- `scripts/generate-sf-client-matter-objective-audit.mjs`
- `scripts/generate-sf-client-matter-surface-ledger.mjs`
- `scripts/run-sf-client-matter-browser-qa.mjs`
- New API regression tests per lane:
  - `apps/api/test/sf-b-w01-master-data-merge.test.js`
  - `apps/api/test/sf-b-w02-record-actions.test.js`
  - `apps/api/test/sf-b-w03-activity-calendar-channel.test.js`
  - `apps/api/test/sf-b-w04-builder-email.test.js`
  - `apps/api/test/sf-b-w05-import-mapping.test.js`
  - `apps/api/test/sf-b-w06-admin-setup.test.js`
  - `apps/api/test/sf-b-w07-data-cloud.test.js`
  - `apps/api/test/sf-b-w08-report-builder.test.js`
- New UI regression coverage in `apps/web/test/ui-regression.test.mjs`.
- Browser QA must cover every newly visible entrypoint and record screenshot paths in `docs/goal-closeout/sf-client-matter-parity/artifacts/`.

## 12. Closeout Criteria

The implementation is closeout-ready only when:

1. Every contract-only Track B item has a mounted route or an explicit owner/provider blocked state.
2. Every mounted route has repository/service code, permission policy, audit evidence, idempotency, safe response tests, and denied/review tests.
3. Every implemented backend route has a visible UI entrypoint under Client or Matter.
4. Every visible UI entrypoint is browser-driven in `sf:client-matter-parity:browser-qa`.
5. Forbidden fake-control searches are replaced by tested-visible-control checks for completed lanes.
6. `npm run sf:client-matter-parity:validate`, web UI regression, web build, API regressions, Playwright/browser QA, CodeGraph review, and Hermes check-only receipts are bound into evidence.
7. Production approval, go-live, deployment, provider enablement, and enterprise trust claims remain false unless a separate human approval and external receipt exists.

## 13. Detailed TUW Breakdown

Each TUW below is intentionally testable in isolation. A TUW is not complete until backend routes, package/service code, apiClient helpers, UI entrypoints, source tests, browser QA, validator/evidence updates, and claim-boundary checks all pass.

### 13.1 `SF-B-W01R` Account/Contact Canonical Write and Merge

| TUW | Backend route and service | UI exposure | Tests and evidence |
| --- | --- | --- | --- |
| `SF-B-W01R-T01-contract` | Update `sf-b-w01-account-contact-contract.json` from partial facade status to canonical-write implementation contract. | No new UI yet; crosswalk marks canonical write as "backend in progress". | Contract JSON parse test; validator checks no premature UI control. |
| `SF-B-W01R-T02-master-data-write` | Add repository/service for Account to `Organization`/`ClientGroup` canonical write and Contact to `Person`/`ContactPoint` canonical write, preserving CRM runtime facade responses. | Client > 계정/연락처 show "Master Data 동기화" state only after route tests pass. | API create/update idempotency, denied/review, audit, safe response shape. |
| `SF-B-W01R-T03-merge-proposal` | Mount `GET/POST /api/crm/duplicate-merge-proposals` with candidate scoring, owner decision state, and no automatic merge. | Client right panel adds merge-candidate summary and review badge. | Duplicate candidates omit raw contact values; safe counts only. |
| `SF-B-W01R-T04-merge-execute` | Mount `POST /api/crm/duplicate-merge-proposals/:proposalId/execute` behind dual-control approval and rollback metadata. | Client > 계정/연락처 exposes guarded "병합 실행" only when proposal is approved. | Dual-control, idempotency, audit, rollback metadata, forbidden direct merge before approval. |
| `SF-B-W01R-T05-api-client` | Add `fetchCrmMergeProposals`, `createCrmMergeProposal`, `executeCrmMergeProposal`, and canonical sync helpers to `apiClient.js`. | Helpers feed Client account/contact panels and right panel. | `apps/web/test/ui-regression.test.mjs` verifies helper names and data markers. |
| `SF-B-W01R-T06-ui-panel` | Extend `ClientsSurface` sections and `ClientRecordPanel` with canonical sync and merge review surfaces. | Visible in Client > 계정, Client > 연락처, Client right panel. | Browser QA screenshots: `client-account-canonical-sync`, `client-contact-merge-review`, `client-merge-execute-guarded`. |
| `SF-B-W01R-T07-closeout` | Update surface ledger/objective audit/current validation receipt. | UI status moves from contract-only to implemented for canonical sync and approved merge. | `npm run sf:client-matter-parity:validate`, API test, UI test, browser QA, Hermes check-only. |

### 13.2 `SF-B-W02R` Broader Record Actions and Mass Update

| TUW | Backend route and service | UI exposure | Tests and evidence |
| --- | --- | --- | --- |
| `SF-B-W02R-T01-field-registry` | Mount `GET /api/record-actions/:objectName/fields` returning allowlisted editable fields and policy metadata. | Client/Matter right panels render editable field groups from registry. | Field allowlist tests; forbidden raw/schema fields omitted. |
| `SF-B-W02R-T02-cross-object-patch` | Mount safe patch routes for Client, Account, Contact, Matter, and supported Matter subrecords. | Right panel inline editors appear for approved fields. | Patch validation, denied/review states, audit, idempotency. |
| `SF-B-W02R-T03-bulk-registry` | Mount `GET /api/record-actions/:objectName/bulk-actions` with available actions per object/list. | List action toolbar shows owner/status/field/export actions when selected rows exist. | Count-leak-safe available actions; no unsupported object actions. |
| `SF-B-W02R-T04-bulk-owner-status-field` | Mount bulk owner, bulk status, and bulk field update routes with all-or-blocked execution. | Client and Matter list checkbox menus expose bulk owner/status/field update. | All-or-blocked persistence, safe result counts, audit/timeline append. |
| `SF-B-W02R-T05-action-audit` | Mount record action audit feed route for Client/Matter/Account/Contact. | Right panel "최근 작업" feed shows action history. | Actor refs safe, tenant/user IDs hidden, sort and pagination bounded. |
| `SF-B-W02R-T06-api-client` | Add record action registry, patch, bulk, and audit helpers to `apiClient.js`. | Shared by `ClientsSurface` and `MattersSurface`. | UI regression verifies helper wiring and markers. |
| `SF-B-W02R-T07-browser-qa` | Extend browser QA to drive field edit, bulk action menu, audit feed, denied/review states. | New screenshots under `artifacts/record-actions-*`. | Browser route count and check count updated in receipt. |

### 13.3 `SF-B-W03R` Activity, Calendar, Deadline, Matter Channel

| TUW | Backend route and service | UI exposure | Tests and evidence |
| --- | --- | --- | --- |
| `SF-B-W03R-T01-activity-write` | Mount `GET/POST/PATCH /api/matters/:id/activities` over task/note/email-log models; append audit and timeline events. | Matter > 활동 adds activity composer, type segmented control, status grouping. | No external send; safe type/source labels; audit/timeline append. |
| `SF-B-W03R-T02-calendar-events` | Mount `GET/POST/PATCH /api/matters/:id/calendar-events` with date/time validation and provider boundary. | New Matter > 일정 section with agenda, list/detail/right-panel, and create/edit controls. | Date validation, permission, idempotency, provider disabled state. |
| `SF-B-W03R-T03-deadline-board` | Mount `GET /api/matters/:id/deadlines` and `POST /api/matters/:id/deadlines/:deadlineId/confirm-change`. | Matter > 일정 adds critical deadline board and confirmation workflow. | Dual-control, immutable audit, no silent deadline changes. |
| `SF-B-W03R-T04-channel-read-write` | Mount `GET /api/matters/:id/channel` and internal `POST /api/matters/:id/channel/messages`. | Matter right panel adds Channel tab and internal composer. | Internal-only message log, no external provider send. |
| `SF-B-W03R-T05-provider-boundary` | Add Teams/Slack provider adapter descriptor route, disabled until owner/provider receipt. | Channel provider status appears; external send controls stay blocked until gate. | Credential omission, provider receipt required, forbidden send before gate. |
| `SF-B-W03R-T06-ui-routing` | Add Matter sidebar sections: `matter-calendar`, `matter-channel`; preserve existing timeline route. | Matter sidebar shows 활동, 일정, Channel as separate work surfaces. | Menu click/browser QA proves no stacked scroll page. |
| `SF-B-W03R-T07-closeout` | Update contract, crosswalk, surface ledger, objective audit. | Timeline read becomes implemented; activity/calendar/channel write implemented or provider-blocked. | API tests, UI regression, browser screenshots, Hermes check-only. |

### 13.4 `SF-B-W04R` Document/Email Builder, Approval, Publish

| TUW | Backend route and service | UI exposure | Tests and evidence |
| --- | --- | --- | --- |
| `SF-B-W04R-T01-template-registry` | Mount `GET /api/matters/:id/document-templates` with template taxonomy and merge-field allowlist. | Matter > 문서 adds Templates tab and template picker. | Safe metadata only; no template body leak. |
| `SF-B-W04R-T02-builder-draft` | Mount `POST/PATCH /api/matters/:id/builder-drafts` and preview route. | Matter > 문서 adds builder workspace and preview panel. | Reject raw HTML/script; omit raw body/contact values. |
| `SF-B-W04R-T03-approval` | Mount approval request/read routes with owner-approved policy and dual-control. | Builder shows approval state, request button, approver list. | Audit/timeline, dual-control, private notes omitted. |
| `SF-B-W04R-T04-publish-vault` | Mount publish-to-Vault route through existing DMS/Vault upload service. | Builder exposes "Vault에 게시" after approval. | DMS safe envelope, no storage path or document bytes. |
| `SF-B-W04R-T05-email-draft` | Mount email draft create/patch route; external send remains provider-gated. | Matter > 문서 and Matter > 활동 expose email draft composer. | Draft stored internally, no provider send. |
| `SF-B-W04R-T06-email-send-gate` | Mount send boundary route returning blocked state until Microsoft Graph/Outlook provider receipt and approval receipt exist. | Send button appears only with blocked/provider status until gate; no fake send success. | Provider disabled tests, no credentials, no outbound side effect. |
| `SF-B-W04R-T07-browser-qa` | Drive template picker, builder preview, approval request, publish guarded state, email draft provider boundary. | Screenshots: `matter-builder-*`, `matter-email-draft-*`. | Validator flips B-W04 from forbidden fake controls to tested visible controls. |

### 13.5 `SF-B-W05R` Import/Data Mapping

| TUW | Backend route and service | UI exposure | Tests and evidence |
| --- | --- | --- | --- |
| `SF-B-W05R-T01-job-target-registry` | Mount `GET/POST /api/import-jobs` and `GET /api/import-targets`. | Client/Matter adds "가져오기" section with job list and target selector. | Permission, idempotency, safe metadata. |
| `SF-B-W05R-T02-source-staging` | Mount `POST /api/import-jobs/:jobId/source-files` and preview route. | Wizard step 1 stages source and shows safe preview counts/sample. | File bytes/raw rows omitted; size/type validation. |
| `SF-B-W05R-T03-field-mapping` | Mount mapping save route and validation descriptor. | Wizard step 2 mapping table with source/target fields and validation badges. | Required fields, unsafe target rejection. |
| `SF-B-W05R-T04-dry-run` | Mount dry-run route with bounded results and no mutation. | Wizard step 3 shows dry-run summary, warnings, and ready state. | No state mutation, bounded row counts. |
| `SF-B-W05R-T05-execute` | Mount execute route with idempotency and audit. | Guarded execute button appears only after dry-run pass. | Persisted records, audit, no raw row echo. |
| `SF-B-W05R-T06-rollback-error` | Mount rollback and error report routes. | Wizard result screen exposes rollback and safe error report. | Rollback audit; raw values omitted. |
| `SF-B-W05R-T07-ui-and-qa` | Add import sections to Client and Matter sidebar plus apiClient helpers. | Client/Matter "가져오기" visible. | UI regression, browser wizard QA, validator evidence. |

### 13.6 `SF-B-W06R` Permission/Admin Setup

| TUW | Backend route and service | UI exposure | Tests and evidence |
| --- | --- | --- | --- |
| `SF-B-W06R-T01-permission-set-crud` | Mount `GET/POST/PATCH /api/admin/permission-sets` with owner-approved taxonomy. | New "운영 설정" section lists and edits permission sets. | Owner policy, idempotency, audit. |
| `SF-B-W06R-T02-assignment-grant-revoke` | Mount `GET/POST/DELETE /api/admin/permission-assignments`. | Assignment panel shows grant/revoke controls with dual-control state. | No raw personal identifiers; grant/revoke audit. |
| `SF-B-W06R-T03-object-manager` | Mount `GET /api/admin/object-manager/objects` and field policy patch route. | Object Manager panel edits visibility/editability metadata. | No physical schema mutation; policy audit. |
| `SF-B-W06R-T04-connected-apps` | Mount `GET /api/admin/connected-apps` and disable route. | Connected Apps panel shows provider status and disable workflow. | Credential omission, provider revocation receipt. |
| `SF-B-W06R-T05-admin-audit` | Mount admin audit feed route. | Setup section shows admin audit table. | Safe actor refs, bounded output. |
| `SF-B-W06R-T06-ui-placement` | Decide placement: Client sidebar "운영 설정" and Matter sidebar "운영 설정" or shared top-level Setup panel under product-axis nav. | Visible entrypoint uses tabs, not lower-body cards. | Browser QA proves setup nav and no stacked page. |
| `SF-B-W06R-T07-closeout` | Update forbidden-control validator to require tested visible controls after route tests. | Permission/admin UI visible only after API tests pass. | Validator, UI regression, Hermes check-only. |

### 13.7 `SF-B-W07R` Data Cloud/Enrichment

| TUW | Backend route and service | UI exposure | Tests and evidence |
| --- | --- | --- | --- |
| `SF-B-W07R-T01-provider-consent` | Mount `GET/POST /api/data-cloud/providers` and consent/lawful-basis routes. | Client > 데이터 shows provider status, consent state, lawful basis. | DPA/privacy owner decision, credential omission. |
| `SF-B-W07R-T02-job-preview-execute` | Mount enrichment job create, preview, execute routes. | Data section wizard exposes provider selection, preview counts, execute guard. | Provider receipt, safe counts, idempotency. |
| `SF-B-W07R-T03-results-resolution` | Mount results and identity-resolution routes. | Client right panel shows enrichment results, confidence bands, review candidates. | No automatic merge, provenance visible. |
| `SF-B-W07R-T04-unified-profile` | Mount `GET /api/data-cloud/unified-profiles/:profileId`. | Client detail adds Unified Profile tab. | Direct identifiers redacted, source provenance. |
| `SF-B-W07R-T05-segment-activation` | Mount `POST /api/data-cloud/segment-activations` with provider gate. | Data section exposes segment activation workflow only after gate. | Audience sync receipt, no credentials/raw payload. |
| `SF-B-W07R-T06-ui-and-qa` | Add Client sidebar "데이터" plus right-panel enrichment summary. | No Data Cloud controls remain hidden once route/provider gates pass. | Browser QA covers provider disabled/enabled states, preview, results. |

### 13.8 `SF-B-W08R` Report Builder and Client Profitability

| TUW | Backend route and service | UI exposure | Tests and evidence |
| --- | --- | --- | --- |
| `SF-B-W08R-T01-report-definition` | Mount `GET/POST/PATCH /api/reports` with report definition, filters, columns, chart config. | Client/Matter "리포트" section lists saved reports and opens builder. | Metadata-only safe output, permission tests. |
| `SF-B-W08R-T02-report-run` | Mount `POST /api/reports/:reportId/run` safe aggregate planner. | Builder run button renders bounded table/chart results. | No arbitrary SQL, row limits, omitted-counts. |
| `SF-B-W08R-T03-report-share-audit` | Mount report share and audit routes. | Builder share dialog and report audit panel visible. | Permission, no raw query payload. |
| `SF-B-W08R-T04-client-profitability` | Mount `GET/POST /api/analytics/client-profitability` over existing `createClientProfitability`. | Client > 리포트/분석 shows profitability panel and refresh action. | No Client identity mutation, safe aggregate only. |
| `SF-B-W08R-T05-matter-report-links` | Link saved Matter reports into Matter analytics. | Matter > 분석 shows report cards and builder links. | Browser QA covers Matter report open/run. |
| `SF-B-W08R-T06-ui-and-qa` | Add apiClient helpers and UI regression markers for report builder. | Client/Matter "리포트" entrypoints visible. | UI test, browser screenshots, validator evidence. |

## 14. Expanded UI Exposure Map by TUW

| UI surface | Added entrypoints | Source TUW |
| --- | --- | --- |
| Client sidebar | 계정 canonical sync/merge, 연락처 canonical sync/merge | `SF-B-W01R-T06` |
| Client sidebar | 가져오기 | `SF-B-W05R-T07` |
| Client sidebar | 데이터 | `SF-B-W07R-T06` |
| Client sidebar | 리포트 | `SF-B-W08R-T06` |
| Client sidebar | 운영 설정 | `SF-B-W06R-T06` |
| Client right panel | merge candidates, canonical sync status, recent actions | `SF-B-W01R-T03`, `SF-B-W01R-T06`, `SF-B-W02R-T05` |
| Client right panel | editable field groups | `SF-B-W02R-T01`, `SF-B-W02R-T02` |
| Client right panel | enrichment results, unified profile, profitability summary | `SF-B-W07R-T03`, `SF-B-W07R-T04`, `SF-B-W08R-T04` |
| Matter sidebar | 일정 | `SF-B-W03R-T02`, `SF-B-W03R-T03`, `SF-B-W03R-T06` |
| Matter sidebar | Channel | `SF-B-W03R-T04`, `SF-B-W03R-T05`, `SF-B-W03R-T06` |
| Matter sidebar | 가져오기 | `SF-B-W05R-T07` |
| Matter sidebar | 리포트 | `SF-B-W08R-T05`, `SF-B-W08R-T06` |
| Matter sidebar | 운영 설정 | `SF-B-W06R-T06` |
| Matter right panel | field editor, bulk/action audit, deadline highlights, Channel tab | `SF-B-W02R-T02`, `SF-B-W02R-T05`, `SF-B-W03R-T03`, `SF-B-W03R-T04` |
| Matter > 문서 | template picker, builder, approval, Vault publish, email draft/send boundary | `SF-B-W04R-T01` through `SF-B-W04R-T06` |
| Matter > 활동 | activity composer, tasks/notes/email-log grouping | `SF-B-W03R-T01` |
| Matter > 일정 | agenda, calendar events, critical deadline board | `SF-B-W03R-T02`, `SF-B-W03R-T03` |
| Client/Matter lists | checkbox bulk owner/status/field actions | `SF-B-W02R-T03`, `SF-B-W02R-T04` |
| Report builder | saved reports, filters, run table/chart, share, audit | `SF-B-W08R-T01` through `SF-B-W08R-T03` |
| Import wizard | target, upload/stage, mapping, dry-run, execute, rollback/error report | `SF-B-W05R-T01` through `SF-B-W05R-T06` |
| Operations setup | permission sets, assignments, object manager, connected apps, admin audit | `SF-B-W06R-T01` through `SF-B-W06R-T05` |

## 15. Per-Lane Definition of Done

For every `B-WxxR` lane:

1. Contract JSON updated from contract-only to route-mounted or provider-blocked status.
2. `apps/api` routes mounted and covered by lane-specific `node --test`.
3. `packages/*` service/repository layer added with idempotency, audit, permission, and safe response invariants.
4. `apps/web/src/data/apiClient.js` helpers added.
5. `ClientsSurface` or `MattersSurface` exposes the entrypoint in list/detail/right-panel layout.
6. `apps/web/test/ui-regression.test.mjs` asserts data markers, helper names, and forbidden raw/fake controls.
7. `scripts/run-sf-client-matter-browser-qa.mjs` drives the visible UI route and records screenshots.
8. `scripts/validate-sf-client-matter-parity-crosswalk.mjs` and `surface-connection-ledger.json` classify the lane correctly.
9. Hermes MCP remains check-only; production/go-live/trust claims remain false.

## 16. Sequential Start Goal

Recommended Codex Goal:

```text
Goal: SF-CLIENT-MATTER-PARITY Track B UI Exposure 프로그램을 W01R부터 W08R까지 순차 구현한다. Salesforce web Mar 2026 스크린샷과 현재 repo의 crosswalk/contract 원장을 기준으로, 아직 contract-only 또는 partial 상태인 Account/Contact canonical write/merge, broader record actions, activity/calendar/channel, document/email builder, import/data mapping, admin setup, Data Cloud/enrichment, report builder/client profitability 기능을 모두 backend-first로 구현하고, 각 기능을 실제 Client/Matter UI entrypoint로 노출한다.

이 작업은 `workbook/salesforce-track-b-ui-exposure-implementation-plan.md`의 `SF-B-W01R` -> `SF-B-W08R` 순서를 따른다. 각 WxxR lane은 contract JSON 갱신, package repository/service, apps/api route, permission/audit/idempotency/safe response invariant, lane-specific API test, apiClient helper, ClientsSurface/MattersSurface UI entrypoint, UI regression marker, browser QA screenshot, surface ledger/objective audit/current validation receipt 갱신, Hermes MCP check-only evidence 귀속까지 닫아야 한다. UI는 최종적으로 전부 노출하되, provider/owner approval이 필요한 기능은 fake success UI가 아니라 실제 route-backed blocked/configuration/approval state로 노출한다.

완료 기준은 1) W01R~W08R의 모든 TUW가 route-mounted, provider-blocked, 또는 owner-blocked 상태로 명확히 분류되고, 2) route-mounted 기능은 실제 Client/Matter sidebar, right panel, builder, wizard, setup, report 화면에서 보이며, 3) unsupported/fake controls는 남지 않고 forbidden-control validator가 tested-visible-control validator로 전환되며, 4) `npm run sf:client-matter-parity:validate`, lane-specific API tests, web UI regression, web build, browser QA, OMO CodeGraph review, Hermes check-only gate가 evidence로 귀속되고, 5) production approval, deployment, go-live, provider enablement, enterprise trust claim은 별도 인간 승인과 외부 receipt 없이는 주장하지 않는 상태다.
```

## 17. Sequential Execution Queue

| Order | Lane | Start condition | Exit condition |
| --- | --- | --- | --- |
| 1 | `SF-B-W01R` | Current Account/Contact facade routes and Client UI are green. | Canonical write and approved merge are route-backed, tested, and visible in Client Account/Contact/right-panel UI. |
| 2 | `SF-B-W02R` | W01R is classified in surface ledger. | Broader field edits, record action registry, bulk actions, and action audit are route-backed and visible in Client/Matter lists and right panels. |
| 3 | `SF-B-W03R` | W02R record action audit exists. | Activity write, Calendar, Deadline board, and Matter Channel are visible; external provider sends remain blocked until receipt. |
| 4 | `SF-B-W04R` | W03R timeline/activity model is mounted. | Template picker, builder draft, approval, Vault publish, and email draft/send-boundary UI are visible and tested. |
| 5 | `SF-B-W05R` | W04R builder/Vault publish boundary is stable. | Import wizard covers target, source stage, mapping, dry-run, execute, rollback, and error report in Client/Matter UI. |
| 6 | `SF-B-W06R` | Import route safety and audit patterns are reusable. | Permission sets, assignments, object policy, connected apps, and admin audit are visible in operations setup UI. |
| 7 | `SF-B-W07R` | Admin/provider gate UI pattern is established. | Data provider, consent, enrichment jobs, identity resolution, unified profile, and segment activation UI are visible with provider gates. |
| 8 | `SF-B-W08R` | Data/analytics safe aggregate boundaries are established. | Report builder, report run/share/audit, Client profitability, and Matter report links are visible and browser-driven. |
| 9 | `SF-B-CLOSE` | W01R~W08R all satisfy lane DOD. | Full crosswalk, validators, browser QA receipt, screenshots, CodeGraph review, Hermes check-only evidence, and no production/go-live/trust claims. |
