# Salesforce Parity TUW Pyramid Plan

작성일: 2026-06-23
상태: planning-only
범위: Client / Matter 중심 Salesforce 유사 기능 반영 계획

## 0. 판정 기준

이 문서는 Salesforce web Mar 2026 스크린샷 전수 감사에서 식별된 기능을 두 트랙으로 나눈다.

1. **Track A: Backend implemented, UI not fully reflected**
   - 현재 `apps/api` 또는 `packages/*`에 런타임 API/서비스가 존재한다.
   - UI에는 없거나 Client/Matter 작업면에 흩어져 있다.
   - 목표는 새 백엔드 범위를 넓히지 않고, 기존 API를 Client/Matter SaaS 작업면에 올리는 것이다.

2. **Track B: Salesforce-visible, backend not implemented**
   - Salesforce 스크린샷에는 보이나 현재 API/서비스가 없거나 mounted route가 없다.
   - 목표는 백엔드 계약, 저장소, 권한/감사, 테스트를 먼저 만든 뒤 UI에 반영하는 것이다.

공통 경계:

- 이 계획은 구현 완료, 출시 승인, production-ready를 주장하지 않는다.
- 현재 API의 반복 경계인 `runtime_write_ready: true`, `production_ready_claim: false`, synthetic/file-backed runtime 상태를 유지한다.
- 모든 UI는 permission `allow / denied / review_required / approval_required` 상태를 화면 단위로 드러낸다.
- Salesforce 복제물이 아니라 Matter-first 법률 SaaS의 Client/Matter 작업면으로 해석한다.

## 1. 피라미드 계층

| Level | 이름 | 정의 |
|---|---|---|
| SP0 | North Star | Client/Matter가 Salesforce식 객체 탐색, 레코드 작업, 활동, 문서, 청구, 분석을 한 작업면에서 처리한다. |
| SP1 | Track | A: 기존 백엔드 UI 반영 / B: 백엔드 미구현 Salesforce 기능 구현 |
| SP2 | Workstream | 메뉴 IA, 레코드 작업면, 활동/문서/청구/분석, 관리자/임포트 등 기능 축 |
| SP3 | Work Package | PR 1~2개로 닫을 수 있는 기능 묶음 |
| SP4 | TUW | 독립 구현·검증 가능한 최소 단위. 기본 PR 1개 이하, XH 크기는 재분해 |
| SP5 | Verification Case | TUW별 API test, UI test, build, e2e/manual QA |
| SP6 | Evidence | command output, screenshot, route map, changed-file list, PR/commit |

## 2. 공통 불변식

| ID | 불변식 |
|---|---|
| SF-INV-01 | Client/Matter 메뉴 클릭은 실제 화면 전환 또는 섹션 전환을 일으킨다. |
| SF-INV-02 | 본문은 단일 작업면이어야 하며 모든 메뉴가 아래로 쌓이는 스크롤형 랜딩 페이지가 되면 실패다. |
| SF-INV-03 | 사이드바 기본 상태는 펼쳐진 상태이며, 확장 시 rail과 sidebar가 중복 노출되지 않는다. |
| SF-INV-04 | 기존 API 응답의 safe shape와 누출 방지 필드는 훼손하지 않는다. |
| SF-INV-05 | Matter-first 추적 규칙을 유지한다. Lead/Opportunity는 pre-Matter 객체로만 Matter 생성을 직접 우회하지 않는다. |
| SF-INV-06 | UI 반영 TUW는 backend contract를 넓히지 않는다. Backend gap TUW는 UI보다 API/test를 먼저 닫는다. |
| SF-INV-07 | Hermes MCP는 check-only 신호로만 사용한다. repo write, deployment, final approval, production PASS, enterprise trust claim은 이 계획에서 열지 않는다. |

## 2.1 LazyCodex / Hermes MCP 재기준선

사용 도구:

- LazyCodex: CodeGraph MCP로 현재 `Shell`, `ClientsSurface`, `MattersSurface`, `apiClient`, API runtime context의 실제 연결 상태를 확인했다.
- Hermes MCP: `hermes.factory.saas_mode` check-only projection을 실행했다.
- Lazyweb: enterprise CRM 화면 패턴을 보조 확인했다.

도구 신호:

| 도구 | 관찰 | 계획 반영 |
|---|---|---|
| LazyCodex / CodeGraph | `ClientsSurface`는 `ClientGroup` 목록 단일 패널 중심이다. | Client track은 단순 메뉴 추가가 아니라 Client workspace registry부터 필요하다. |
| LazyCodex / CodeGraph | `MattersSurface`의 section set은 `matters-list`, `matter-vault`, `matter-opening`, `matter-team` 4개뿐이다. | `command-center`, `timeline`, `billing`, `analytics`, `documents` section 확장이 Track A 첫 dependency다. |
| LazyCodex / CodeGraph | `MattersSurface -> fetchMatterRecords` 연결은 있으나 detail/command-center/timeline은 별도 작업면에 충분히 올라오지 않았다. | selected Matter state, detail fetch, right panel contract를 A-W01 안으로 당긴다. |
| Hermes MCP | SaaS factory mode check passed, but `repo_write_allowed_now=false`, `deployment_allowed_now=false`, `final_approval_allowed_now=false`. | 이 문서는 planning-only이며 Hermes 신호를 승인/배포/출시 증거로 사용하지 않는다. |
| Lazyweb | CRM형 SaaS는 list/detail/right-panel 분리가 반복된다. | 첫 PR은 sidebar 메뉴 확장만이 아니라 record workspace 레이아웃 계약까지 포함한다. |

재기준선 결론:

1. `A-W01`은 기존보다 더 잘게 쪼갠다. 메뉴 스키마, surface registry, selected record state, right-panel layout, permission state QA가 각각 별도 TUW다.
2. `A-W02~A-W05`는 API가 이미 있으므로 backend contract 변경 없이 UI/API client 연결을 닫는다.
3. `B-W01~B-W08`은 Hermes-style guard에 맞춰 backend contract, route policy, repository, API tests를 먼저 닫고 UI를 후행시킨다.
4. 어떤 트랙도 production-ready, deployment-ready, enterprise trust ready를 주장하지 않는다.

## 3. Track A - Backend implemented, UI not fully reflected

### A-W01 - Client/Matter IA and route shell

목표: 이미 구현된 API 기능을 Client/Matter 하위 메뉴에 배치할 수 있도록 Shell, active section, surface layout을 정리한다.

| TUW | 범위 | 산출물 | 완료 기준 |
|---|---|---|---|
| SF-A-W01-T01 | Shell subnav schema | `Client`: 목록, 리드, 기회, 접수, 계정/연락처. `Matter`: 목록, Command Center, 개시, 팀, 문서, 활동, 청구, 분석 | 클릭 시 해당 section만 렌더. 하단 누적 스크롤 금지 |
| SF-A-W01-T02 | Client surface registry | `ClientsSurface`에 `clients-list`, `client-leads`, `client-opportunities`, `client-intake`, `client-accounts`, `client-contacts` section registry | Client 메뉴별 독립 작업면 |
| SF-A-W01-T03 | Matter surface registry | `MattersSurface` section set을 command-center/timeline/billing/analytics/documents까지 확장 | 기존 목록/문서/개시/팀 기능 유지 |
| SF-A-W01-T04 | Selected record state | Client/Matter list에서 selected row와 detail context 관리 | Matter list row selection drives command center, Vault, activity, billing, analytics, and right panel; Client selected context remains read workspace scope |
| SF-A-W01-T05 | 작업면 레이아웃 표준화 | 좌측 사이드바, 중앙 리스트/레코드, 우측 보조 패널 패턴 | desktop/mobile에서 text overlap 없음 |
| SF-A-W01-T06 | section routing QA | activeSection fallback, empty/denied/review 상태 표준화 | 모든 메뉴가 키보드/마우스로 이동 가능 |

### A-W02 - Client CRM surfaces from existing CRM/Intake APIs

현재 백엔드: `GET/POST /api/crm/leads`, `GET/POST /api/crm/opportunities`, `POST /api/crm/opportunities/:id/handoff`, `GET/POST /api/intake/requests`, conflict/clearance/audit.

| TUW | 범위 | 산출물 | 완료 기준 |
|---|---|---|---|
| SF-A-W02-T01 | 리드 목록 UI | Client > 리드 | Lead list가 API에서 로드되고 permission states 표시 |
| SF-A-W02-T02 | 기회 목록 UI | Client > 기회 | Opportunity stage/status, party, owner 표시 |
| SF-A-W02-T03 | Opportunity-to-Intake handoff UI | 기회 상세 action | Matter 직접 생성 금지 문구, Intake handoff 실행, route response 기반 Opportunity stage/Intake link 즉시 갱신 |
| SF-A-W02-T04 | 접수 요청 UI | Client > 접수 | Intake request list, conflict pending 상태 표시 |
| SF-A-W02-T05 | Conflict/Clearance 요약 UI | 접수 상세 보조 패널 | raw memo 미노출, clearance token validation 표시 |

### A-W03 - Matter record workspace from existing Matter APIs

현재 백엔드: `GET /api/matters`, `GET /api/matters/:id`, `GET /api/matters/:id/command-center`, `GET /api/matters/:id/timeline`, `POST /api/matters/openings`, `POST /api/matters/:id/team-members`, `POST /api/matters/:id/status-transitions`.

| TUW | 범위 | 산출물 | 완료 기준 |
|---|---|---|---|
| SF-A-W03-T01 | Matter list upgrade | list view, selected row, detail drawer | 선택된 Matter가 detail/command center/right panel and downstream section fetches/actions와 연결 |
| SF-A-W03-T02 | Matter record header | title, matter number, status, owner/team count, actions | Salesforce식 record header 표면 구현 |
| SF-A-W03-T03 | Command Center section | Matter > Command Center | detail, team, client report, vault summary 결합 |
| SF-A-W03-T04 | Matter opening 유지/정리 | Matter > 개시 | 생성 성공 후 list/detail에 즉시 반영 |
| SF-A-W03-T05 | Team roster 개선 | Matter > 팀 | employee-backed validation error, responsible-attorney owner assignment, and audit state 표시 |
| SF-A-W03-T06 | Timeline read UI | Matter > 활동 | `/timeline` visible entries, empty state, safe type/source labels, and read-only activity filters |

### A-W04 - Matter Documents and Vault integration

현재 백엔드: `GET /api/matters/:id/vault-summary`, `POST /api/matters/:id/documents`, `GET/POST /api/vault/documents`, `GET /api/vault/search`, `GET /api/vault/audit`.

| TUW | 범위 | 산출물 | 완료 기준 |
|---|---|---|---|
| SF-A-W04-T01 | Matter document panel | Matter > 문서 | vault summary, document count, linked workspace 표시 |
| SF-A-W04-T02 | Matter document upload facade UI | Matter 안에서 문서 업로드 | Matter owns no bytes, Vault delegated state 표시 |
| SF-A-W04-T03 | Vault document inventory embed | Matter 문서 탭 내 문서함 | raw path/storage pointer 미노출 |
| SF-A-W04-T04 | Vault search embed | Matter/Client 문서 검색 | ACL-filtered search 결과만 표시 |
| SF-A-W04-T05 | Vault audit preview | 문서 상세 보조 패널 | audit list는 safe metadata만 표시 |

### A-W05 - Finance and Analytics inside Matter

현재 백엔드: `GET/POST /api/finance/time-entries`, `POST /api/finance/wip`, `GET /api/finance/invoices`, `POST /api/finance/payments`, `GET /api/finance/ar-aging`, `GET /api/analytics/dashboards`, `POST /api/analytics/refresh`, `GET/POST /api/analytics/matter-profitability`, `POST /api/analytics/exports`.

| TUW | 범위 | 산출물 | 완료 기준 |
|---|---|---|---|
| SF-A-W05-T01 | Matter billing tab | Matter > 청구 | time entries, invoices, AR aging read UI |
| SF-A-W05-T02 | WIP generation action | billing action | approved source 없을 때 safe validation 표시 |
| SF-A-W05-T03 | Payment import action | billing action | bank reference 미노출 확인 |
| SF-A-W05-T04 | Matter analytics tab | Matter > 분석 | dashboards + matter profitability read model |
| SF-A-W05-T05 | Analytics refresh/export action | 분석 action | export credential material 미노출 |

### A-W06 - Runtime state, tests, and evidence

| TUW | 범위 | 산출물 | 완료 기준 |
|---|---|---|---|
| SF-A-W06-T01 | API client coverage | `apps/web/src/data/apiClient.js` coverage 확장 | 모든 Track A route helper 존재 |
| SF-A-W06-T02 | UI smoke tests | menu click, permission states, selected record | `npm --workspace apps/web run build` + UI tests |
| SF-A-W06-T03 | API regression tests | G4-G8 tests 유지 | 관련 `node --test apps/api/test/cmp-r4-g*.test.js` 통과 |
| SF-A-W06-T04 | Manual QA gate | local app에서 sidebar expanded, menu navigation, record workspace 확인 | screenshot/evidence 첨부 |

## 4. Track B - Salesforce-visible, backend not implemented

### B-W01 - Salesforce CRM object gaps

Contract artifact: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w01-account-contact-contract.json`.

Current status: `GET /api/crm/accounts`, `POST /api/crm/accounts`, `PATCH /api/crm/accounts/:id`, `GET /api/crm/contacts`, `POST /api/crm/contacts`, `PATCH /api/crm/contacts/:id`, `GET /api/crm/accounts/:id/contacts`, and `POST /api/crm/duplicate-reviews` are mounted and tested. `POST` routes persist CRM runtime Account/Contact facade records with idempotency and audit evidence. `PATCH` routes update allowlisted CRM runtime facade fields only, block canonical Master Data records, block unsafe registration/contact/Matter shortcut fields, and preserve safe output. Canonical Master Data write migration and merge execution remain contract-only.

| TUW | 범위 | 백엔드 산출물 | Verification / Evidence gate | UI 산출물 |
|---|---|---|---|---|
| SF-B-W01-T01 | Account object facade | `GET /api/crm/accounts`, `POST /api/crm/accounts`, and `PATCH /api/crm/accounts/:id` mounted; Master Data `Organization` + `ClientGroup` read facade plus CRM runtime Account write facade; route policies `crm:account:read/write/patch` | `VC-SF-B-W01-API-001`, `VC-SF-B-W01-API-002`, and `VC-SF-B-W01-API-007` passed | Client > 계정 reads tested route and exposes guarded 계정 생성 / 계정 검토 표시 |
| SF-B-W01-T02 | Contact object facade | `GET /api/crm/contacts`, `POST /api/crm/contacts`, and `PATCH /api/crm/contacts/:id` mounted; Master Data `Person` + `ContactPoint` read facade plus CRM runtime Contact write facade; route policies `crm:contact:read/write/patch` | `VC-SF-B-W01-API-003`, `VC-SF-B-W01-API-004`, and `VC-SF-B-W01-API-008` passed | Client > 연락처 reads tested route and exposes guarded 연락처 생성 / 연락처 검토 표시 |
| SF-B-W01-T03 | Account-Contact relationship | `GET /api/crm/accounts/:id/contacts`; Master Data `Relationship` facade; route policy `crm:account_contact:read` | `VC-SF-B-W01-API-005` passed; permission-trimmed endpoint relationships | account detail related contacts |
| SF-B-W01-T04 | Duplicate/merge review | `POST /api/crm/duplicate-reviews`; Master Data duplicate service; route policy `crm:duplicate_review:write` | `VC-SF-B-W01-API-006` passed; review evidence without automatic merge | write/merge controls hidden |

Owner decisions before route mount:

- Salesforce Account maps to Law Firm OS `Organization` plus `ClientGroup` facade.
- Salesforce Contact maps to Law Firm OS `Person` plus `ContactPoint` facade.
- Duplicate and merge thresholds remain owned by Master Data governance.

Current UI guard:

- `ClientsSurface` may show Account/Contact read tables from tested GET routes.
- `apiClient` may call `GET /api/crm/accounts`, `POST /api/crm/accounts`, `PATCH /api/crm/accounts/:id`, `GET /api/crm/contacts`, `POST /api/crm/contacts`, `PATCH /api/crm/contacts/:id`, and Account-Contact read routes.
- Client Account and Contact create/patch actions may be shown after the passing route tests; merge execution remains hidden until route tests land.

### B-W02 - Record actions and Salesforce Path

Current status: `POST /api/matters/:id/status-transitions` is mounted and tested for Matter status completion. Matter responsible-attorney assignment is mounted through `POST /api/matters/:id/team-members` and updates owner state plus audit evidence. Generic Matter owner change is mounted through `POST /api/matters/:id/owner-change`, with employee-backed validation, idempotency, and audit evidence. Matter allowlisted inline patch is mounted through `PATCH /api/matters/:id`, with field-level validation, idempotency, and `matter.inline.patch` audit evidence. CRM Account/Contact runtime facade patch is mounted through `PATCH /api/crm/accounts/:id` and `PATCH /api/crm/contacts/:id`, with canonical Master Data write blocked. Matter recently viewed is mounted through `GET /api/matters/recently-viewed` and `POST /api/matters/:id/recently-viewed`, with viewer-scoped persistence and audit evidence. Matter saved list views are mounted through `GET /api/matters/list-views` and `POST /api/matters/list-views`, with owner-scoped persistence and audit evidence. Matter checkbox bulk status completion is mounted through `POST /api/matters/bulk/status-transitions`, with all-or-blocked persistence and audit evidence. Broader field editors, broader bulk actions, and mass update remain backend-first.

| TUW | 범위 | 백엔드 산출물 | UI 산출물 |
|---|---|---|---|
| SF-B-W02-T01 | Record owner change / assignment | Matter responsible-attorney assignment mounted through `POST /api/matters/:id/team-members`; generic Matter owner change mounted through `POST /api/matters/:id/owner-change` | Matter team 책임자 지정 action, selected Matter right-panel 책임자 변경 action, and right-panel owner state |
| SF-B-W02-T02 | Inline edit / patch | Matter `PATCH /api/matters/:id` mounted for allowlisted `title`, `wip_status`, and `risk_level`; CRM Account/Contact runtime facade patch mounted for allowlisted status/display-name only | selected Matter right-panel 청구 상태 field edit action; Client Account/Contact 검토 표시 |
| SF-B-W02-T03 | Matter Path state machine | `POST /api/matters/:id/status-transitions` mounted; updates Matter status, `closed_at`, WIP status, audit, and timeline event | Command Center path reflects updated Matter state |
| SF-B-W02-T04 | Mark Status Complete | idempotent transition action; `matter.status.transitioned` audit evidence | Matter Command Center guarded 완료 button |
| SF-B-W02-T05 | Recently viewed | `GET /api/matters/recently-viewed`, `POST /api/matters/:id/recently-viewed` mounted and tested | Matter 목록의 최근 본 항목 list view |
| SF-B-W02-T06 | Saved list views | `GET /api/matters/list-views`, `POST /api/matters/list-views` mounted and tested; owner-scoped persistence without exposing owner user IDs | Matter list view selector and guarded save action |
| SF-B-W02-T07 | Bulk status action | `POST /api/matters/bulk/status-transitions` mounted and tested; all-or-blocked selected Matter status update | checkbox selection and guarded 선택 완료 action |
| SF-B-W02-T08 | Broader bulk/mass update | selected row action contract for owner, fields, export, and cross-object route policy | additional checkbox bulk actions only after tested backend contracts |

### B-W03 - Activity, calendar, collaboration

Contract artifact: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w03-activity-calendar-channel-contract.json`.

Current status: Matter timeline read is mounted through `GET /api/matters/:id/timeline` and reflected in `Matter > 활동` as a read-only activity timeline with safe labels and client-side filters. Matter package foundations for `MatterTask`, `MatterCalendarEvent`, deadline change, dual control, and timeline read-model exist, but mounted activity write, calendar/schedule CRUD, deadline board, and Matter Channel APIs remain contract-only. No fake composer, calendar editor, or send action is exposed.

| TUW | 범위 | 백엔드 산출물 | UI 산출물 |
|---|---|---|---|
| SF-B-W03-T01 | Activity model | `GET /api/matters/:id/activities` contract over `MatterTimelineEvent`, `MatterTask`, `MatterCalendarEvent`, channel metadata | Matter > 활동 read timeline reflected; quick actions hidden until write routes land |
| SF-B-W03-T02 | Activity timeline write | `POST/PATCH /api/matters/:id/activities` contract, idempotency, audit, timeline append, no provider shortcuts | upcoming/overdue grouping only after route tests |
| SF-B-W03-T03 | Calendar mounted API | `GET/POST/PATCH /api/matters/:id/calendar-events` contract using existing calendar/deadline service foundation and provider gate | Matter > 일정 only after route tests |
| SF-B-W03-T04 | Deadline board API | `GET /api/matters/:id/deadlines`, `POST /api/matters/:id/deadlines/:deadlineId/confirm-change` contract, dual-control audit | critical deadlines panel only after route tests |
| SF-B-W03-T05 | Matter Channel | `GET /api/matters/:id/channel`, `POST /api/matters/:id/channel/messages` metadata-only contract, provider send blocked by default | right panel channel/composer only after route tests and provider/owner gate |

### B-W04 - Document/email builder and approvals

Goal: Salesforce에서 보이는 document/email generation, template, approval send를 backend-first로 구현한다.

Contract artifact: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w04-document-email-builder-contract.json`.

Current status: Vault/DMS routes are mounted through `POST /api/matters/:id/documents`, `GET/POST /api/vault/documents`, `GET /api/vault/search`, and `GET /api/vault/audit`. Those routes support document facade upload, inventory, ACL-filtered search, and audit preview, but they are not Salesforce-style document/email builder parity. `SF-B-W04` is registered as `document_email_builder_contract_registered_send_provider_blocked`; template registry, builder drafts, approval requests, approved draft publish, email drafts, and external send remain contract-only. No Matter UI document builder, email composer, approval request, publish, or send action may appear before route/provider tests pass.

| TUW | 범위 | 백엔드 산출물 | UI 산출물 |
|---|---|---|---|
| SF-B-W04-T01 | Template registry | `GET /api/matters/:id/document-templates`, template taxonomy, merge-field allowlist, permission gate, `VC-SF-B-W04-API-001` | template picker only after route test |
| SF-B-W04-T02 | Builder draft API | `POST/PATCH /api/matters/:id/builder-drafts`, safe preview route, idempotency, raw HTML/script rejection, CRM/Matter/Billing merge refs, `VC-SF-B-W04-API-002` to `VC-SF-B-W04-API-004` | document/email builder only after route tests |
| SF-B-W04-T03 | Approval request workflow | `POST /api/matters/:id/builder-drafts/:draftId/approval-requests`, `GET /api/matters/:id/builder-approval-requests`, approval policy, dual-control owner decision, audit/timeline evidence, `VC-SF-B-W04-API-005` and `VC-SF-B-W04-API-006` | approval/request status only after route tests and owner policy |
| SF-B-W04-T04 | Builder-to-DMS publish and email provider boundary | `POST /api/matters/:id/builder-drafts/:draftId/publish-to-vault` through `uploadDocument`; `POST/PATCH /api/matters/:id/email-drafts`; external `POST /api/matters/:id/email-drafts/:draftId/send` stays blocked behind Microsoft Graph Mail / Outlook provider, approval receipt, and audit receipt, `VC-SF-B-W04-API-007` to `VC-SF-B-W04-API-010` | created document toast/email send controls only after publish/provider evidence; `VC-SF-B-W04-UI-001` forbids fake controls |

### B-W05 - Import and data mapping ingestion

Goal: Salesforce에서 보이는 import/data mapping wizard를 backend-first로 등록한다.

Contract artifact: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w05-import-data-mapping-contract.json`.

Current status: Law Firm OS에는 `POST /api/finance/payments` 기반 payment import, CRM Account/Contact runtime facade write, Matter bulk status action은 있지만, Salesforce식 generic CSV import wizard, object target selection, source field mapping, dry-run, execute, rollback, safe error report route는 없다. `SF-B-W05`는 `import_data_mapping_contract_registered_execution_blocked` 상태이며, UI는 import wizard/field mapping/run import/rollback/error report를 노출하지 않는다. Permission set/admin, connected apps, Data Cloud는 고위험 관리자/외부 provider lane으로 분리한다.

| TUW | 범위 | 백엔드 산출물 | UI 산출물 |
|---|---|---|---|
| SF-B-W05-T01 | Import job and target registry | `GET/POST /api/import-jobs`, `GET /api/import-targets`, source manifest, object allowlist, target field metadata, `VC-SF-B-W05-API-001` to `VC-SF-B-W05-API-003` | import job list/target selector only after route tests |
| SF-B-W05-T02 | Source staging, preview, and field mapping | `POST /api/import-jobs/:jobId/source-files`, `GET /api/import-jobs/:jobId/preview`, `POST /api/import-jobs/:jobId/field-mappings`, redacted sample rows, allowlisted target fields, duplicate policy, `VC-SF-B-W05-API-004` to `VC-SF-B-W05-API-006` | source upload/field mapping stepper only after route tests |
| SF-B-W05-T03 | Dry-run, execution, rollback, and error report | `POST /api/import-jobs/:jobId/dry-run`, `POST /api/import-jobs/:jobId/execute`, `POST /api/import-jobs/:jobId/rollback`, `GET /api/import-jobs/:jobId/error-report`, idempotency, rollback receipt, audit evidence, `VC-SF-B-W05-API-007` to `VC-SF-B-W05-API-010` | run import/error report/rollback controls only after dry-run and execution tests; `VC-SF-B-W05-UI-001` forbids fake controls |

### B-W06 - Permission sets and admin setup

Goal: Salesforce에서 보이는 permission sets, role/profile style assignment, object manager field policy, connected apps admin을 backend-first로 등록한다.

Contract artifact: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w06-permission-admin-contract.json`.

Current status: Law Firm OS에는 `x-lawos-permission-context` 기반 route gate, `evaluatePermission`, `evaluatePermissionControlRequest`, read-only permission simulator, admin simulator, policy store, permission context store, and object ACL store foundation이 있다. 그러나 Client/Matter용 permission-set CRUD, assignment grant/revoke, object manager field policy patch, connected app admin, admin audit route는 mounted route가 아니다. `SF-B-W06`은 `permission_admin_contract_registered_owner_gate_required` 상태이며, UI는 permission-set admin, object-manager editor, connected-app admin, grant/revoke/disable controls를 노출하지 않는다.

| TUW | 범위 | 백엔드 산출물 | UI 산출물 |
|---|---|---|---|
| SF-B-W06-T01 | Permission set registry | `GET/POST/PATCH /api/admin/permission-sets`, owner-approved permission taxonomy, idempotency, audit, `VC-SF-B-W06-API-001` to `VC-SF-B-W06-API-003` | permission-set list/editor only after route tests and owner policy |
| SF-B-W06-T02 | Permission assignment grant/revoke | `GET/POST/DELETE /api/admin/permission-assignments`, actor/group refs, dual-control policy, audit, `VC-SF-B-W06-API-004` to `VC-SF-B-W06-API-006` | assignment grant/revoke controls only after route tests |
| SF-B-W06-T03 | Object manager field policy | `GET /api/admin/object-manager/objects`, `PATCH /api/admin/object-manager/objects/:objectName/fields/:fieldName`, metadata policy, no physical schema mutation, `VC-SF-B-W06-API-007` and `VC-SF-B-W06-API-008` | object manager editor only after owner-approved metadata policy |
| SF-B-W06-T04 | Connected app admin/provider boundary | `GET /api/admin/connected-apps`, `POST /api/admin/connected-apps/:appId/disable`, credential omission, external provider revocation receipt, `VC-SF-B-W06-API-009` and `VC-SF-B-W06-API-010` | connected app controls only after provider gate; `VC-SF-B-W06-UI-001` forbids fake controls |

### B-W07 - Data Cloud and enrichment external provider boundary

Goal: Salesforce에서 보이는 Data Cloud, enrichment, identity resolution, unified profile, segment activation을 backend-first로 등록한다.

Contract artifact: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w07-data-cloud-enrichment-contract.json`.

Current status: Salesforce atlas에는 Data Cloud 탭이 보인다. Law Firm OS에는 `apps/api/src/server.js`의 `synthetic_crosswalk` enrichment metadata와 Client UI의 내부 Matter 연결 라벨인 `matter_core_enrichment`가 있지만, 이는 외부 Data Cloud/enrichment runtime이 아니다. `SF-B-W07`은 `data_cloud_enrichment_contract_registered_provider_gate_required` 상태이며, UI는 Data Cloud provider setup, enrichment job/run, identity resolution, unified profile, confidence score, segment activation, audience sync를 노출하지 않는다.

| TUW | 범위 | 백엔드 산출물 | UI 산출물 |
|---|---|---|---|
| SF-B-W07-T01 | Provider and consent governance | `GET/POST /api/data-cloud/providers`, `POST /api/data-cloud/consent-records`, owner decision, DPA/privacy review, data category allowlist, retention, `VC-SF-B-W07-API-001` to `VC-SF-B-W07-API-003` | no provider setup or consent controls before route/provider tests |
| SF-B-W07-T02 | Enrichment job and safe preview | `POST /api/data-cloud/enrichment-jobs`, `GET /api/data-cloud/enrichment-jobs/:jobId/preview`, `POST /api/data-cloud/enrichment-jobs/:jobId/execute`, stable refs, safe counts, provider receipt, idempotency, audit, `VC-SF-B-W07-API-004` to `VC-SF-B-W07-API-006` | no enrichment run/status UI before route/provider tests |
| SF-B-W07-T03 | Results, identity resolution, unified profile, segment activation | `GET /api/data-cloud/enrichment-results`, `POST /api/data-cloud/identity-resolution`, `GET /api/data-cloud/unified-profiles/:profileId`, `POST /api/data-cloud/segment-activations`, provenance, confidence band, review candidates, no automatic merge, `VC-SF-B-W07-API-007` to `VC-SF-B-W07-API-010` | read-only summary/identity/segment UI only after route/provider tests; `VC-SF-B-W07-UI-001` forbids fake controls |

### B-W08 - Reporting builder and Client profitability backend-first contract

Goal: Salesforce에서 보이는 Reports/Analytics, report builder, report run/share, and Client-level profitability를 backend-first로 등록한다.

Contract artifact: `docs/goal-closeout/sf-client-matter-parity/backend-contracts/sf-b-w08-reporting-builder-contract.json`.

Current status: Law Firm OS에는 `/api/analytics/dashboards`, `/api/analytics/refresh`, `/api/analytics/matter-profitability`, `/api/analytics/exports`, `/api/analytics/audit`와 `packages/analytics/src/metrics-service.js#createClientProfitability` foundation이 있다. 그러나 `/api/reports/*` report definition/query/share/audit route와 `/api/analytics/client-profitability` route는 mounted route가 아니다. `SF-B-W08`은 `reporting_builder_client_profitability_contract_registered_route_gate_required` 상태이며, UI는 report builder, saved report list, report field/filter builder, report run/share controls, report result table/chart, and Client profitability controls를 노출하지 않는다.

| TUW | 범위 | 백엔드 산출물 | UI 산출물 |
|---|---|---|---|
| SF-B-W08-T01 | Report definition model | `GET/POST/PATCH /api/reports`, `ReportDefinition`, `ReportFilter`, `ReportColumn`, `ReportChartConfig`, metadata-only safe output, `VC-SF-B-W08-API-001` to `VC-SF-B-W08-API-003` | report builder save/open only after route tests; no field/filter builder before backend exists |
| SF-B-W08-T02 | Report query execution | `POST /api/reports/:reportId/run`, allowlisted safe aggregate query planner, bounded table/chart rows, omitted-row counts, no arbitrary SQL, `VC-SF-B-W08-API-004` | table/chart report result only after safe query tests |
| SF-B-W08-T03 | Report sharing and audit | `POST /api/reports/:reportId/share`, `GET /api/reports/:reportId/audit`, user/group/role refs, permission check, audit, raw query payload omitted, `VC-SF-B-W08-API-005` and `VC-SF-B-W08-API-006` | share recipients/toast/audit view only after permission and audit tests |
| SF-B-W08-T04 | Client profitability route | `GET/POST /api/analytics/client-profitability`, mounted route over existing `createClientProfitability`, ClientGroup aggregation, no Client identity creation, no source mutation, `VC-SF-B-W08-API-007` and `VC-SF-B-W08-API-008` | Client > 분석 profitability panel only after route tests; `VC-SF-B-W08-UI-001` forbids fake controls |

## 5. 실행 순서

1. **A-W01 first**: IA와 route/section 구조를 먼저 닫는다. 이게 없으면 모든 UI가 다시 스크롤형 페이지로 무너진다.
2. **A-W02/A-W03 병렬 가능**: Client CRM과 Matter workspace는 서로 독립적으로 진행 가능하다.
3. **A-W04/A-W05 후행**: 문서/청구/분석은 selected Matter context가 안정된 뒤 붙인다.
4. **A-W06 terminal**: build, API regression, e2e/manual QA evidence를 닫는다.
5. **B는 backend-first**: B-W01/B-W02부터 계약과 API test를 만든 뒤 UI로 올라온다.
6. **B-W03~B-W08은 독립 PR lane**: activity/calendar/channel, builder/approval, import/data mapping, permission/admin setup, Data Cloud/enrichment, reporting은 섞지 않는다.

## 6. 권장 PR 묶음

| PR Lane | 포함 TUW | 목표 |
|---|---|---|
| PR-A1 | A-W01 | Client/Matter 메뉴와 작업면 골격 |
| PR-A2 | A-W02 | Client CRM/Intake UI 반영 |
| PR-A3 | A-W03 | Matter record workspace |
| PR-A4 | A-W04 | Matter Documents/Vault |
| PR-A5 | A-W05 | Matter Billing/Analytics |
| PR-A6 | A-W06 | QA/evidence/readiness closeout |
| PR-B1 | B-W01 | Accounts/Contacts backend + UI |
| PR-B2 | B-W02 | record actions/path/list views |
| PR-B3 | B-W03 | activity/calendar/channel |
| PR-B4 | B-W04 | document/email builder + approval |
| PR-B5 | B-W05 | import/data mapping |
| PR-B6 | B-W06 | permission/admin setup |
| PR-B7 | B-W07 | Data Cloud/enrichment |
| PR-B8 | B-W08 | report builder/client profitability |

## 7. Verification cases

| VC | 적용 |
|---|---|
| VC-SF-API-001 | 새/기존 API route returns allow, denied, review_required safely |
| VC-SF-UI-001 | Sidebar expanded by default, no duplicated rail/sidebar, menu click changes section |
| VC-SF-UI-002 | Record workspace has list/detail/right-panel separation |
| VC-SF-SEC-001 | raw storage path, document bytes, bank reference, raw conflict memo are not exposed |
| VC-SF-AUD-001 | write action emits audit event or explicit audit hint |
| VC-SF-IDEMP-001 | write action supports idempotent replay where route mutates state |
| VC-SF-BUILD-001 | `npm --workspace apps/web run build` exits 0 |
| VC-SF-API-REG-001 | relevant `node --test apps/api/test/cmp-r4-g*.test.js` exits 0 |
| VC-SF-MANUAL-001 | local app manual QA confirms Client/Matter Salesforce-like navigation works |

## 8. Current implementation status and next TUW slice

2026-06-23 local evidence 기준으로 `SF-A-W01` route/section spine, `SF-A-W02` CRM/Intake UI reflection, `SF-A-W03` Matter record workspace, `SF-A-W04` Matter Vault/document preview, `SF-A-W05` billing/analytics actions, and `SF-A-W06` validator/build/API/Playwright evidence are locally reflected for the currently confirmed backend routes.

다음 착수 단위는 backend-first Track B를 우선한다:

- `SF-B-W01`: Account read/create/patch and Contact read/create/patch are mounted/tested/reflected in UI; next backend-first units are canonical Master Data write migration and merge execution contracts before exposing those UI entrypoints.
- `SF-B-W02`: Matter Path transition and Mark Status Complete are mounted/tested/reflected in UI; Matter responsible-attorney owner assignment and generic owner-change are mounted/tested/reflected in UI; Matter allowlisted inline WIP patch is mounted/tested/reflected in the right panel; Matter recently viewed, saved list views, and checkbox bulk status completion are mounted/tested/reflected in UI; broader field editors, broader bulk-action, and mass-update contracts remain.
- `SF-B-W03`: activity/calendar/channel write contracts before exposing UI composers.

Track A 후속 deepening은 별도 refinement lane으로 둔다:

- `SF-A-W02`: intake review history and broader opportunity handoff workflows.
- `SF-A-W03`: billing approval/prebill workflow visibility and richer matter-scoped filtering.
- `SF-A-W04`: permission boundary badges tied to deeper auth-policy metadata.

## 9. MCP 반영 실행 게이트

| Gate | 기준 | 통과 조건 |
|---|---|---|
| LZC-G1 | CodeGraph source alignment | 변경 전후 `Shell`, `ClientsSurface`, `MattersSurface`, `apiClient`의 caller/callee 영향 확인 |
| LZC-G2 | API-backed UI | Track A UI는 local fixture fallback 없이 기존 API client를 사용 |
| HERMES-G1 | Check-only boundary | Hermes MCP 결과를 승인/배포/신뢰 claim으로 사용하지 않음 |
| HERMES-G2 | SaaS readiness wording | `runtime_write_ready`와 `production_ready`를 문서와 UI copy에서 혼동하지 않음 |
| UI-G1 | Salesforce-like workspace | list/detail/right-panel 분리, sidebar expanded default, menu click section 전환 |
| QA-G1 | Evidence | build/test/manual QA evidence를 TUW별로 남김 |
