# Sidebar IA + Home Dashboard Stage 0 Inventory

Status: Stage 0 inventory baseline
Date: 2026-07-07
Scope: Web + Desktop current-state inventory before implementation
Source of truth: `workbook/sidebar-home-dashboard-execution-plan-2026-07-07.md` v1.0

## 0. Read Order And Owner Decisions

| Item | Stage 0 result |
|---|---|
| Execution plan | Read in full before inventory work. |
| Workstream convention | `docs/ui-workstream-conventions.md` read before file edits. |
| Visual spec | `docs/ui-reference/prototypes/home-dashboard-ia-mockup-2026-07-07.html` treated as specification only, not code. |
| Research reference | `workbook/sidebar-dashboard-ux-research-2026-07-07.md` retained as evidence input. |
| O-01 | Confirmed by owner: external news sources are `블로터`, `법률신문`, `딜사이트`, `인베스트조선`. Implementation must follow §6 news connector spec: RSS first, no body storage, link-out only, source failure isolation, server cache 15-30 minutes. |
| O-02 | Default retained: newsletter/feed source is Vault tag collection until owner changes it. |
| O-03 | Default retained: `home-company` requires admin role until owner changes it. |
| O-04 | Default retained: inline approve scope is leave/certificate/attendance only until owner changes it. |
| Lazyweb routing | `lazyweb_generate_report` was not callable in this session. Stage 0 is inventory-only and uses the provided research + mockup specs. |

No §6 contract was changed in this artifact. Differences below record where the current repo does not yet implement the contract.

## 1. Commit Window Baseline

| Check | Observed value |
|---|---|
| Current `HEAD` | `e2e684115 Fix Client matter-code empty state` |
| Worktree state before Stage 0 artifact | Dirty before this task. Many unrelated tracked and untracked files already existed, including `package.json`, `package-lock.json`, `apps/api/**`, `apps/web/**`, `apps/desktop/**`, `packages/**`, `scripts/validate-*.mjs`, and launch/evidence docs. |
| Convention impact | `docs/ui-workstream-conventions.md` quiet-window rule blocks the Stage 0 commit while the shared-root package/session churn remains unresolved. This artifact is the only Stage 0 file intentionally added by this work. |

## 2. Current Web Route Inventory

### 2.1 Routable View Model

`apps/web/src/App.jsx` currently builds routable views as:

- Core views: `auth`, `home`, `loading`, `profile`
- Product axes from `apps/web/src/data/nav.js`: `home`, `clients`, `matters`, `people`, `vault`, `portal`
- Global utility views from `apps/web/src/data/globalUtilities.js`: `messages`, `notifications`, `requests`, `reports`, `settings`, `esign`, `calendar`, `finance`, `data-import`, `policies`

Current route resolution accepts global utility views as first-class `view` values. That conflicts with final IA intent where Home sidebar content should not be replaced by utility axes except explicit mode exceptions.

### 2.2 Product Axis Sections

| Axis | Current sections |
|---|---|
| `home` | Current direct Home sidebar section is `home-recent`; other visible Home sidebar entries jump to global utility views. |
| `clients` | `clients-home`, `clients-list`, `client-accounts`, `client-contacts`, `client-opportunities`, `client-intake`, `client-activities`, `client-contracts`, `client-relationships`, `client-conflict`, `client-billing`, `client-reports`, `client-data`, `client-import`, `client-settings` |
| `matters` | `matter-home`, `matters-list`, `matter-opening`, `matter-intake`, `matter-closeout`, `matter-archive`, `matter-board`, `matter-tasks`, `matter-calendar`, `matter-external-schedule`, `matter-notes`, `matter-vault`, `matter-evidence`, `matter-templates`, `matter-seal`, `matter-channel`, `matter-meetings`, `matter-announcements`, `matter-team`, `matter-client-requests`, `matter-approvals`, `matter-time`, `matter-expenses`, `matter-billing`, `matter-ar`, `matter-analytics`, `matter-search`, `matter-risk`, `matter-audit`, `matter-integrations`, `matter-settings` |
| `people` | 73 sections in `apps/web/src/people/peopleFeatureCatalog.js`; grouped inventory is below. |
| `vault` | `vault-documents`, `vault-detail`, `vault-email` |
| `portal` | `portal-home`, `portal-rfi`, `portal-links`, `portal-audit` |

### 2.3 People Catalog Sections

| Group | Current sections |
|---|---|
| 관리 | `people-members`, `people-org-chart`, `people-role`, `people-work-profile`, `people-recruiting`, `people-lifecycle` |
| 근무일정 | `people-work-schedule`, `people-work-schedule-external`, `people-work-type`, `people-current-work-status`, `people-work-schedule-lock` |
| 출퇴근기록 | `people-attendance-records`, `people-unscheduled-attendance`, `people-attendance-upload`, `people-break-records`, `people-attendance-missing-alerts`, `people-attendance-lock`, `people-attendance-verification` |
| 휴가 | `people-leave`, `people-leave-types`, `people-leave-accrual-auto`, `people-leave-accrual-manual`, `people-leave-usage` |
| 요청/전자결재 | `people-approvals`, `people-policy`, `people-custom-requests`, `people-work-schedule-requests`, `people-attendance-requests`, `people-leave-requests`, `people-certificates`, `people-expense-requests`, `people-force-approval` |
| 리포트 | `people-analytics`, `people-risk`, `people-ai`, `people-report-snapshots`, `people-report-items`, `people-report-attention` |
| 마감 및 급여 | `people-close`, `people-payroll`, `people-pay-statement`, `people-pay-rules`, `people-pay-work-profile` |
| 메시지 | `people-message-send`, `people-message-automation`, `people-message-templates`, `people-notices` |
| 전자계약 | `people-econtract-send`, `people-econtract-templates`, `people-econtract-status`, `people-employment-contracts`, `people-annual-leave-notices` |
| 회사 설정 | `people-company-general`, `people-company-notifications`, `people-admin`, `people-company-organization`, `people-company-members`, `people-company-work-schedule`, `people-company-attendance`, `people-company-breaks`, `people-company-leave`, `people-company-requests`, `people-documents`, `people-audit`, `people-company-messages`, `people-company-econtract`, `people-company-reports`, `people-company-payroll`, `people-company-security`, `people-company-advanced`, `people-company-support`, `people-company-billing`, `people-company-integrations` |

### 2.4 Current Home Sidebar Vs Final IA

`apps/web/src/components/Shell.jsx` currently defines the Home sidebar as:

| Visible label | Current route | Stage 0 finding |
|---|---|---|
| 최근작업 | `home#home-recent` | Must be removed by §4.1. |
| 대시보드 | `reports#reports-home-dashboard` | Must become `home#home-dashboard`; current direction is opposite of §4.2 redirect rule. |
| 메시지 | `messages#messages-matter-channel` | Must become `home#home-messages` without replacing sidebar axis. |
| 승인 요청 | `requests#requests-review-inbox` | Must become `home#home-requests` without replacing sidebar axis. |
| 전자 계약 | `esign#esign-send` | Must become `home#home-esign` without replacing sidebar axis. |
| 알림 | `notifications#notifications-center` | Must be removed from sidebar per NAV-04; topbar drawer remains. |
| 데이터 가져오기 | `data-import#data-import-client` | Remains a mode exception but needs return anchor behavior. |
| 설정 | `settings#settings-company` | Remains a mode exception but needs return anchor behavior. |

Current `Shell.jsx` also renders global utility subnav entries into the contextual sidebar and tags the sidebar as `data-context-sidebar={view}`. When Home actions navigate to `reports`, `messages`, `requests`, or `esign`, the sidebar context changes. This is the main current NAV-02/NAV-03 failure to correct in later stages.

### 2.5 Global Utility Sections And Legacy Routes

| Utility view | Sections |
|---|---|
| `messages` | `messages-send`, `messages-automation`, `messages-templates`, `messages-notices`, `messages-matter-channel` |
| `notifications` | `notifications-center`, `notifications-attendance-missing`, `notifications-company` |
| `requests` | `requests-inbox`, `requests-review-inbox`, `requests-force-decision`, `requests-expenses`, `requests-certificates`, `requests-leave`, `requests-attendance`, `requests-custom` |
| `reports` | `reports-home-dashboard`, `reports-people-live`, `reports-people-snapshots`, `reports-people-items`, `reports-people-attention`, `reports-client`, `reports-matter-analytics` |
| `settings` | `settings-company`, `settings-theme`, `settings-permissions`, `settings-security`, `settings-integrations`, `settings-billing`, `settings-support`, `settings-advanced`, `settings-tags` |
| `esign` | `esign-send`, `esign-templates`, `esign-status`, `esign-settings` |
| `calendar` | `calendar-matter`, `calendar-people-external`, `calendar-absence` |
| `finance` | `finance-matter-billing`, `finance-expenses`, `finance-transactions`, `finance-payments`, `finance-withdrawal` |
| `data-import` | `data-import-client-data`, `data-import-client`, `data-import-matter`, `data-import-people-attendance` |
| `policies` | `policies-company`, `policies-employment-contracts`, `policies-annual-leave` |

Important legacy route map entries that must be reconciled with §4.2:

| Legacy route | Current target |
|---|---|
| `home#home-dashboard` | `reports#reports-home-dashboard` |
| `home#home-review` | `requests#requests-review-inbox` |
| `people#people-message-send` | `messages#messages-send` |
| `people#people-message-automation` | `messages#messages-automation` |
| `people#people-message-templates` | `messages#messages-templates` |
| `people#people-notices` | `messages#messages-notices` |
| `people#people-attendance-missing-alerts` | `notifications#notifications-attendance-missing` |
| `people#people-company-notifications` | `notifications#notifications-company` |
| `people#people-approvals` | `requests#requests-inbox` |
| `people#people-force-approval` | `requests#requests-force-decision` |
| `people#people-expense-requests` | `requests#requests-expenses` |
| `people#people-certificates` | `requests#requests-certificates` |
| `people#people-leave-requests` | `requests#requests-leave` |
| `people#people-attendance-requests` | `requests#requests-attendance` |
| `people#people-work-schedule-requests` | `requests#requests-attendance` |
| `people#people-custom-requests` | `requests#requests-custom` |
| `people#people-analytics` | `reports#reports-people-live` |
| `people#people-report-snapshots` | `reports#reports-people-snapshots` |
| `people#people-report-items` | `reports#reports-people-items` |
| `people#people-report-attention` | `reports#reports-people-attention` |
| `people#people-company-general` | `settings#settings-company` |
| `people#people-admin` | `settings#settings-permissions` |
| `people#people-company-security` | `settings#settings-security` |
| `people#people-company-integrations` | `settings#settings-integrations` |
| `people#people-company-billing` | `settings#settings-billing` |
| `people#people-company-support` | `settings#settings-support` |
| `people#people-company-advanced` | `settings#settings-advanced` |
| `people#people-econtract-send` | `esign#esign-send` |
| `people#people-econtract-templates` | `esign#esign-templates` |
| `people#people-econtract-status` | `esign#esign-status` |
| `people#people-company-econtract` | `esign#esign-settings` |
| `people#people-work-schedule-external` | `calendar#calendar-people-external` |
| `profile#matters` | `finance#finance-matter-billing` |
| `profile#expenses` | `finance#finance-expenses` |
| `profile#transactions` | `finance#finance-transactions` |
| `profile#payments` | `finance#finance-payments` |
| `profile#withdrawal` | `finance#finance-withdrawal` |
| `people#people-attendance-upload` | `data-import#data-import-people-attendance` |
| `people#people-documents` | `policies#policies-company` |
| `people#people-employment-contracts` | `policies#policies-employment-contracts` |
| `people#people-annual-leave-notices` | `policies#policies-annual-leave` |

## 3. Desktop Deep Link And Smoke Baseline

| Surface | Current baseline |
|---|---|
| Desktop handoff target | `apps/desktop/src/renderer/offline.html` and `apps/desktop/src/renderer/offline.matter.html` hand off to `./web/index.html?desktop=1&view=home&data=live&ctx=allow&splash=0`. |
| Desktop renderer tests | `apps/desktop/test/renderer-runtime-ui.test.mjs` asserts `window.matterSession` and the Home handoff URL. |
| Web desktop bridge | `apps/web/src/data/apiClient.js` and `apps/web/src/people/hrxApiClient.ts` use `window.matterSession?.desktopApiBaseUrl` and `window.matterSession?.api`. |
| Home bridge feature IDs | `apps/web/src/components/HomeSurface.jsx` uses `client_dashboard`, `matter_vault_dashboard`, `people_dashboard`, `vault_dashboard`. |
| Stage 0 smoke run | Direct runtime smoke for the four Home feature IDs returned `401 deny` for all IDs because `client.accounts()` reported `users` count `0`. This is an auth/account baseline, not a green desktop smoke. |

Stage 0 smoke command result:

| Feature ID | HTTP status | Decision | OK |
|---|---:|---|---|
| `client_dashboard` | 401 | `deny` | false |
| `matter_vault_dashboard` | 401 | `deny` | false |
| `people_dashboard` | 401 | `deny` | false |
| `vault_dashboard` | 401 | `deny` | false |

## 4. UI Regression And Script Dependencies

| File | Current dependency that must be updated or protected |
|---|---|
| `apps/web/test/ui-regression.test.mjs` | Asserts global utility route behavior, `globalUtilityViewIds`, old Home handoff behavior, notification drawer, desktop bridge, and old IA sections. Must be updated with explicit commit rationale when IA changes. |
| `apps/web/test/api-client-desktop-url.test.mjs` | Protects desktop API base handoff and no hard-coded literal URL behavior. |
| `apps/desktop/test/renderer-runtime-ui.test.mjs` | Protects desktop web target `view=home&data=live&ctx=allow&splash=0` and `matterSession`. |
| `apps/desktop/test/aws-runtime-client.test.mjs` | Covers desktop runtime client smoke behavior; currently includes `matter_vault_admin`. |
| `apps/desktop/test/session-ipc.test.mjs` | Protects account login/smoke IPC without returning token material to renderer. |
| `scripts/smoke-matter-desktop-screen-qa.mjs` | Expects current Home title `오늘의 운영 대기열`, product nav, contextual sidebar, and selected desktop runtime smokes. Needs update after final Home dashboard text/IA changes. |
| `scripts/validate-lcx-global-ia.mjs` | Validates current global utility IA and `reports-home-dashboard`; likely obsolete or needs new NAV validator behavior. |
| `scripts/run-lcx-full-global-decisions-browser-proof.mjs` | References global utilities and mode-exception candidates such as `calendar`, `data-import`, `finance`, `policies`, `settings`. |
| `scripts/run-lcx-vltui-closeout-proof.mjs` | References `messages#messages-matter-channel`; needs compatibility redirect coverage if retained. |

## 5. §6 Data Contract Mapping

### 5.1 Current API Candidates

| §6 contract | Exact route exists? | Current candidate sources | Gap |
|---|---|---|---|
| `GET /home/action-inbox?type=approval&role=...` | No | `GET /api/hrx/approvals`, HRX leave/attendance/certificate request surfaces, Matter builder approval requests, Portal approvals, Finance time/expense/prebill approval routes, `GET /api/ai/review-queue` | No unified Home action inbox, no shared item schema, no single role-filtered count source for topbar/sidebar/widget, and no stable `allowed_actions`/`risk_tier` contract. |
| `GET /home/action-inbox?type=task&role=...` | No | Matter task domain in `packages/matter/src/model.js` and task activities through Matter activity services; Matter deadlines/calendar surfaces can contribute due dates. | No direct task aggregate route, no assignee=`me` filter, no normalized `todo`/`doing`/`blocked`/`done` status contract, and no cross-domain task count. |
| `POST /home/action-inbox/{id}/decision` | No | HRX approval decision routes, HRX leave approve/reject routes, Finance approve/reject routes, Matter builder approval workflows, task transition service. | No unified idempotent Home decision endpoint, no common audit envelope, no 5-second undo contract, and no consistent per-type allowed action validation. |
| `GET /home/agenda?from&to` | No | Matter calendar events, Matter deadlines, HRX leave/absence records, People external schedule UI, Portal/client activities where scheduled. | No unified agenda/month dot map, no cross-source date normalization, and no external calendar connector abstraction. |
| `GET /home/feed?tab=notice\|news\|newsletter` | No | `people-notices` legacy UI routes to `messages-notices`; reports/Vault APIs may provide internal documents. | No Home feed route, no notice API identified, no newsletter Vault tag collection query, and no external news connector for O-01 sources. |
| `home-company` summary | No Home route | Analytics dashboards, reports API, HRX overview, matter/client analytics can feed it. | No admin-only Home company route/section, no §6 company summary payload, and no O-03 permission gate implementation in Home. |
| System status widget | Partial | Existing `HomeSurface.jsx` capability probes through API client and desktop bridge; `apps/web/src/data/capabilityMap.js` groups Client/Matter/People/Vault capabilities. | Existing surface is capability status, not final W-05 system status contract with refresh metadata and shared Home layout. |

### 5.2 API Surfaces Observed For Reuse

| Domain | Existing API surfaces relevant to Stage 1+ |
|---|---|
| Profile/session | `GET /api/profile/me`, auth/session APIs, desktop `matterSession` bridge. |
| Client/CRM | CRM accounts, contacts, opportunities, activities, intake requests, conflict/clearance, client reports/data surfaces. |
| Matter | Matters list/detail, command center, vault summary, timeline, activities, calendar events, deadlines, channel, document templates, builder approval requests, audit, recently viewed, list views. |
| Finance | Time entries, expenses, disbursements, prebills approve/reject, invoices, AR aging, audit. |
| HRX/People | Employees, overview, approvals, leave, attendance, corrections, overtime, risks, lifecycle, policies, analytics, AI reviews, audit. |
| Vault/Data room | Vault documents/search/audit, data room rooms/projections, portal dashboard/RFI/approvals/audit. |
| AI/Analytics/Reports | AI review queue, analytics dashboards, matter/client profitability, realization/utilization, reports CRUD/run/share/audit. |

### 5.3 R1 WP-1 Contract Mapping Update

Date: 2026-07-08
Source of truth: `workbook/sidebar-home-dashboard-remediation-r1-2026-07-08.md` WP-1

| §6 contract | R1 WP-1 mapping | Remaining gap |
|---|---|---|
| `GET /home/action-inbox?type=approval&role=...` | `apps/api/src/home-dashboard-runtime-context.js` now aggregates HRX approvals/leave-overtime queues, Matter builder approval requests, and AI review queues through `createHomeDashboardSourceCollectors`. Items are normalized to the existing Home action item schema, keep raw payloads out, and are filtered by actor id or role when assignment metadata is present. | Domain-native decision dispatch remains intentionally unchanged; the Home decision endpoint still records the Home audit/idempotency envelope without changing source contracts. |
| `GET /home/action-inbox?type=task&role=...` | Matter `MatterTask` rows are read from the Matter runtime repository, restricted to open states with `assigned_to=me` and a non-empty `due_at`, then normalized to `type=task`. | Only Matter task rows are wired in WP-1; no new task source was added outside the §6 Matter task source. |
| `GET /home/agenda?from&to` | Matter `MatterCalendarEvent`, HRX/external schedule events, and HRX leave absence rows are collected at request time and returned through the existing agenda event schema. | External schedule uses the runtime-provided `externalScheduleEvents` port when present; no new connector/storage contract was introduced. |
| `GET /home/feed?tab=notice\|news\|newsletter` | Notice tab reads People notice runtime rows when present; newsletter reads Vault/DMS `DmsDocument` rows tagged with `newsletter` (`HOME_DASHBOARD_NEWSLETTER_VAULT_TAG`). The O-01 RSS news connector remains unchanged. | People notice persistence still depends on the runtime exposing notices; WP-1 does not create a new notice store. |
| Source failure isolation | Runtime source collectors report `source_statuses` and return `outcome=partial` when one non-news source fails while other source data is returned. | No new public error code was added; `safe_error_codes` remains contract-compatible. |

## 6. Stage 0 Gap List

| Gap ID | Finding | Blocks |
|---|---|---|
| S0-GAP-01 | Exact §6 `/home/*` endpoints do not exist. | W-01 to W-04 API-backed implementation. |
| S0-GAP-02 | Current `home#home-dashboard` legacy route redirects to `reports#reports-home-dashboard`; §4.2 requires the reverse. | Backward-compatible Home dashboard routing. |
| S0-GAP-03 | Current Home sidebar swaps to global utility sidebars for dashboard/messages/requests/esign. | NAV-02 and NAV-03. |
| S0-GAP-04 | Notifications are a Home sidebar utility entry. | NAV-04, which keeps notifications in topbar drawer only. |
| S0-GAP-05 | There is no unified count source for topbar badge, sidebar badge, and Home widgets. | NAV-05 and W-01/W-02 consistency. |
| S0-GAP-06 | Matter task data exists in domain/service layers but no Home task aggregate route exists. | `GET /home/action-inbox?type=task`. |
| S0-GAP-07 | Agenda sources exist in multiple domains but no unified date-window agenda route exists. | W-03. |
| S0-GAP-08 | External news connector code for O-01 sources is not present. | W-04 news tab. |
| S0-GAP-09 | Newsletter source defaults to Vault tag collection, but no Home feed integration is present. | W-04 newsletter tab. |
| S0-GAP-10 | `settings` and `data-import` are mode exceptions but current return-anchor behavior is not implemented as specified. | NAV-06. |
| S0-GAP-11 | Existing UI regression and proof scripts encode the old global utility IA. | Stage gates after routing changes. |
| S0-GAP-12 | Desktop Home bridge currently has no account list and four Home smoke IDs return `401 deny`. | Stage 7 desktop smoke unless auth/account path is restored or test account is provided. |

## 7. Stage 0 Validation Log

| Command | Exit code | Result |
|---|---:|---|
| `node --input-type=module <desktop Home smoke script>` | 0 | Completed; all four feature IDs returned `401 deny`, account list count was `0`. |
| `test -f workbook/sidebar-home-dashboard-stage-0-inventory-2026-07-07.md` | 0 | Artifact exists. |
| `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | 0 | Completed with 127 findings in pre-existing changed files and the mockup/reference docs; this Stage 0 artifact was not listed. |
| `npm test` | 0 | Passed: 4157 tests, 4157 pass, 0 fail. |
| `npm run build` | 0 | Passed: Vite build completed; existing large chunk warning only. |
| Stage 0 commit | Not run | Blocked by quiet-window rule: `package.json`, `package-lock.json`, `packages/**`, and `scripts/validate-*.mjs` were already dirty before staging; `git diff --cached --name-only` remained empty. |
