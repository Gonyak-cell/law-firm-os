# LCX-GIA Global Navigation Extraction TUW Plan

Date: 2026-06-29
Status: `done-local`
Branch observed: `codex/hrx-member-roster-source-of-truth`
HEAD observed: `eaf352324e27`
LazyCodex mode: planning artifact only
Lazyweb note: `lazyweb_generate_report` was attempted for global IA planning. The tool routed this request to deeper design research rather than returning a report, so this plan is repo-grounded and follows the existing LazyCodex/TUW artifact pattern.
Local implementation: `true`
Production execution: `false`
Production ready: `false`
Go-live approved: `false`

## 1. Goal

Move cross-domain UI and functions out of People, Matter, Client, Home, and profile-local surfaces into a global utility layer where the capability belongs to the whole app.

The target navigation has two layers:

1. Product axes: `Home`, `Client`, `Matter`, `People`, `Vault`
2. Global utilities: `Messages`, `Notifications`, `Requests`, `Reports`, `Settings`, `E-Sign`

Conditional utilities are held behind decision gates:

1. `Calendar`
2. `Billing/Finance`
3. `Data/Import`
4. `Vault/Policies`

## 2. Claim Boundary

```json
{
  "global_navigation_runtime_ready": false,
  "production_ready": false,
  "production_deployed": false,
  "go_live_approved": false,
  "external_provider_live": false,
  "data_migration_executed": false
}
```

This document is not a deployment receipt. It is the execution plan for later implementation branches.

## 3. Source Anchors

Primary repo surfaces to inspect before implementation:

- `apps/web/src/data/nav.js`
- `apps/web/src/components/Shell.jsx`
- `apps/web/src/components/UserProfileSurface.jsx`
- `apps/web/src/people/peopleFeatureCatalog.js`
- `apps/web/src/people/PeopleHome.tsx`
- `apps/web/src/matter/`
- `apps/web/src/client/`
- `workbook/launch-tuw/00_마스터_출시피라미드_스키마_레지스트리.md`

## 4. Ownership Rules

Move means the capability's primary route, menu placement, permissions, and search entry become global.

Shortcut means the domain keeps a shallow entry that deep-links into the global surface with a filter, for example `Reports?scope=people` or `Messages?matterId=...`.

Keep means the feature remains domain-owned because its source object is domain-specific.

| Domain | Keep | Convert To Shortcut |
|---|---|---|
| People | 구성원, 조직, 직위, 근무정보, 휴가 원장, 급여정산 원장, 출퇴근 원장 | 메시지, 알림, 요청, 리포트, 설정, 전자계약, HR 문서 |
| Matter | 사건 원장, 업무, 증거, 타임라인, 작업 상태 | 대화, 일정, 청구, 분석 |
| Client | 고객 원장, 관계, 연락처, 수임 상태 | 보고서, 가져오기, 데이터 관리 |
| Home | 개요, 개인 작업 진입 | 검토함, 대시보드, 알림 |
| Vault | 문서 원장, 버전, 권한, 보존 | 회사방침, 근로계약서, HR 문서 바로가기 |

## 5. Target Mapping

### 5.1 바로 전역화

| Target | Source Items | Disposition |
|---|---|---|
| Messages | 메시지 전송, 메시지 자동화, 메시지 템플릿, 공지사항, Matter의 대화 | Move primary routes. Keep People/Matter shortcuts with scope filters. |
| Notifications | 출퇴근 누락 알림, 회사 설정의 알림, 현재 상단 알림 드로어 | Move to global notification center. Reuse top drawer contract. |
| Requests | 요청 관리, 승인 대기함, 강제 승인/거절, 비용 처리 요청, 증명서 발급 요청, Home의 검토함 | Move to global request inbox. Domain pages keep filtered shortcuts. |
| Reports | People 리포트 전체, Client 보고서, Matter 분석, Home 대시보드 | Move to global report hub with domain tabs and saved views. |
| Settings | 회사 설정 대부분, 권한, 보안, 연동, 결제, 지원, 고급 옵션, 태그 관리 | Move to global settings. People keeps only HR-local settings links. |
| E-Sign | 전자계약 전송, 전자계약 템플릿, 서명 진행 상태 | Move to global e-sign. Matter/People keep contextual send links. |

### 5.2 조건부 전역화

| Target | Source Items | Decision Rule |
|---|---|---|
| Calendar | Matter 일정, People 외부일정, 부재 일정 | Global only if a unified calendar is built. Until then, leave domain links shallow. |
| Billing/Finance | Matter 청구, 비용 관리, 정산 내역, 지급 설정, 입금 계좌 | Global only if a finance axis is introduced. Until then, avoid mixing HR payroll and matter billing. |
| Data/Import | Client 가져오기, Client 데이터 관리, Matter 자료 가져오기, People 출퇴근 엑셀 업로드 | Global if import jobs share queue, validation, audit, and rollback. HR-only upload may remain in People as shortcut. |
| Vault/Policies | 회사방침, 근로계약서, 연차휴가 사용 촉진 문서 | Document source of truth stays in Vault. People keeps HR document shortcuts. |

## 6. Status Legend

- `todo`: not started
- `ready`: can start after dependencies are complete
- `active`: in progress
- `decision-required`: requires product decision before implementation
- `blocked`: cannot proceed without missing data, authority, or external proof
- `done-local`: code/docs done with local proof only
- `done-staging`: staging proof exists
- `done-production`: production proof exists

## 7. TUW Pyramid

| Phase | Purpose | Status |
|---|---|---|
| LCX-GIA-00 | Baseline and route inventory | ready |
| LCX-GIA-01 | Global shell and IA registry | ready |
| LCX-GIA-02 | Messages extraction | ready |
| LCX-GIA-03 | Notifications extraction | ready |
| LCX-GIA-04 | Requests extraction | ready |
| LCX-GIA-05 | Reports extraction | ready |
| LCX-GIA-06 | Settings extraction | ready |
| LCX-GIA-07 | E-Sign extraction | ready |
| LCX-GIA-08 | Conditional global decisions | decision-required |
| LCX-GIA-09 | Domain cleanup and redirects | todo |
| LCX-GIA-10 | Validation, QA, and closeout | todo |

## 8. Detailed TUWs

### LCX-GIA-00 Baseline And Route Inventory

Purpose: freeze the current menu and route state before moving entries.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-00.01 | ready | Inventory all current top-level, People, Matter, Client, Home, Vault, profile, and settings menu items. | Route inventory JSON plus screenshot set. |
| LCX-GIA-00.02 | ready | Classify every item as `move`, `shortcut`, `keep`, or `delete-after-compat`. | IA classification ledger. |
| LCX-GIA-00.03 | ready | Define route compatibility policy for old URLs and hash routes. | Redirect/backlink matrix. |
| LCX-GIA-00.04 | ready | Confirm claim boundary and no production/go-live implication. | Updated plan frontmatter and ledger. |

Done criteria:

- No source menu item is left unclassified.
- Each moved item has a target route and a domain fallback behavior.
- Existing unrelated dirty files are not touched.

### LCX-GIA-01 Global Shell And IA Registry

Purpose: create the global utility layer without breaking existing product-axis navigation.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-01.01 | ready | Add a global utility catalog for `Messages`, `Notifications`, `Requests`, `Reports`, `Settings`, and `E-Sign`. | Catalog unit tests or static validator. |
| LCX-GIA-01.02 | ready | Wire global entries into the shell using the existing visual language. | Browser screenshot across desktop and mobile widths. |
| LCX-GIA-01.03 | ready | Add route shells for global utilities with empty-state and permission behavior. | Route smoke test. |
| LCX-GIA-01.04 | ready | Define shortcut parameters such as `scope=people`, `matterId`, `clientId`, and `status`. | Deep-link regression test. |

Done criteria:

- Product axes still remain visible.
- Global utilities do not appear as nested People-only items.
- No new decorative or marketing-style UI patterns are introduced.

### LCX-GIA-02 Messages Extraction

Purpose: make messaging global while preserving context-aware domain entry points.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-02.01 | ready | Create `Messages` hub route and list model. | Route smoke and empty-state screenshot. |
| LCX-GIA-02.02 | ready | Move 메시지 전송, 메시지 자동화, 메시지 템플릿, 공지사항 into `Messages`. | Menu diff and route smoke. |
| LCX-GIA-02.03 | ready | Move Matter의 대화 into `Messages` with matter filters and back links. | Matter conversation deep-link test. |
| LCX-GIA-02.04 | ready | Keep People/Matter shortcuts that open the global Messages surface with context. | Shortcut QA. |
| LCX-GIA-02.05 | ready | Add old-route compatibility redirects or clear bridge pages. | Redirect test. |

Done criteria:

- A user can send or review messages without entering People or Matter first.
- Matter 대화 preserves the matter context.
- Domain pages do not duplicate the full message UI.

### LCX-GIA-03 Notifications Extraction

Purpose: unify notification surfaces around the existing top drawer behavior.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-03.01 | ready | Promote current top notification drawer to the global notification center contract. | Drawer parity screenshot and motion check. |
| LCX-GIA-03.02 | ready | Move 출퇴근 누락 알림 into global `Notifications` with People scope. | People alert filter test. |
| LCX-GIA-03.03 | ready | Move 회사 설정의 알림 to global notification settings. | Settings route smoke. |
| LCX-GIA-03.04 | ready | Add notification preference, read/unread, and filtered empty states. | State regression test. |

Done criteria:

- Notifications are accessible from the global shell.
- People attendance alerts remain traceable to the relevant People record.
- The drawer interaction matches the existing notification drawer contract.

### LCX-GIA-04 Requests Extraction

Purpose: consolidate all approval and request queues into one global request inbox.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-04.01 | ready | Create `Requests` hub with request type filters. | Route smoke and empty-state screenshot. |
| LCX-GIA-04.02 | ready | Move 요청 관리, 승인 대기함, and Home의 검토함 into `Requests`. | Inbox route and Home shortcut proof. |
| LCX-GIA-04.03 | ready | Move 비용 처리 요청 and 증명서 발급 요청 with domain metadata. | Request type regression test. |
| LCX-GIA-04.04 | ready | Gate 강제 승인/거절 behind explicit permission and audit copy. | Permission and audit test. |
| LCX-GIA-04.05 | ready | Add deep links from People and Home into filtered request queues. | Deep-link QA. |

Done criteria:

- Approval work is no longer split between People and Home.
- Forced decisions are permissioned and auditable.
- Request list filters make the original domain visible.

### LCX-GIA-05 Reports Extraction

Purpose: move reporting and analytics into one global report hub.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-05.01 | ready | Create `Reports` hub with tabs or filters for People, Client, Matter, and Home. | Browser screenshot and route smoke. |
| LCX-GIA-05.02 | ready | Move People 리포트 전체 into `Reports?scope=people`. | People report shortcut test. |
| LCX-GIA-05.03 | ready | Move Client 보고서 into `Reports?scope=client`. | Client report route test. |
| LCX-GIA-05.04 | ready | Move Matter 분석 into `Reports?scope=matter`. | Matter analytics route test. |
| LCX-GIA-05.05 | ready | Convert Home 대시보드 into global dashboard/report entry while keeping Home summary. | Home dashboard regression. |

Done criteria:

- Report discovery is global.
- Domain pages can still open their filtered reports.
- Home does not become a hidden report menu.

### LCX-GIA-06 Settings Extraction

Purpose: make company-wide configuration global and leave domain settings only where the source object is local.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-06.01 | ready | Create global `Settings` route group. | Route smoke and screenshot. |
| LCX-GIA-06.02 | ready | Move 회사 설정 대부분, 권한, 보안, 연동, 결제, 지원, 고급 옵션, 태그 관리. | Settings inventory diff. |
| LCX-GIA-06.03 | ready | Convert People settings entries to shortcuts into global settings with People scope. | Shortcut QA. |
| LCX-GIA-06.04 | ready | Verify permission visibility for admin-only settings. | Permission regression test. |
| LCX-GIA-06.05 | ready | Remove duplicated settings labels from People/Matter menus after compatibility proof. | Menu diff proof. |

Done criteria:

- Company-wide settings do not live under People.
- Admin/security/billing areas have explicit access behavior.
- Domain settings shortcuts cannot drift into separate copies.

### LCX-GIA-07 E-Sign Extraction

Purpose: treat e-sign as a global workflow that can be launched from People, Matter, or Vault context.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-07.01 | ready | Create global `E-Sign` hub. | Route smoke and empty-state screenshot. |
| LCX-GIA-07.02 | ready | Move 전자계약 전송, 전자계약 템플릿, 서명 진행 상태. | Menu diff and route test. |
| LCX-GIA-07.03 | ready | Add contextual launch links from People and Matter. | Deep-link QA. |
| LCX-GIA-07.04 | ready | Define source document relation to Vault without moving the document owner. | Vault relation ledger. |

Done criteria:

- E-sign workflow is not hidden inside People.
- Templates and signing status are shared across domains.
- Source documents remain traceable to Vault or the originating record.

### LCX-GIA-08 Conditional Global Decisions

Purpose: decide whether each conditional area becomes a real global utility or remains a domain shortcut.

| TUW | Status | Work | Decision Output |
|---|---|---|---|
| LCX-GIA-08.01 | decision-required | Decide whether to build global `Calendar`. | `global_calendar=true/false` plus route policy. |
| LCX-GIA-08.02 | decision-required | Decide whether to build global `Billing/Finance`. | Finance axis decision and source boundaries. |
| LCX-GIA-08.03 | decision-required | Decide whether to build global `Data/Import`. | Shared import queue versus HR-only upload policy. |
| LCX-GIA-08.04 | decision-required | Decide how `Vault/Policies` should appear. | Vault owner plus People shortcut policy. |

Decision criteria:

- Global only if the user can reasonably start the task without choosing a product domain first.
- Keep domain-local if the task cannot be understood without a domain source object.
- Shortcut if discoverability matters but ownership stays elsewhere.

### LCX-GIA-09 Domain Cleanup And Redirects

Purpose: remove duplicate IA after global surfaces are proven.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-09.01 | todo | Prune People menu entries that moved to global utilities. | People menu screenshot before/after. |
| LCX-GIA-09.02 | todo | Replace Matter conversation, analysis, calendar, and billing entries with filtered shortcuts where applicable. | Matter menu regression. |
| LCX-GIA-09.03 | todo | Replace Home review/dashboard entries with global shortcuts. | Home regression. |
| LCX-GIA-09.04 | todo | Replace Client report/import entries according to conditional decisions. | Client regression. |
| LCX-GIA-09.05 | todo | Add route redirects and legacy bookmarks. | Redirect test. |

Done criteria:

- No user-facing duplicate full workflow remains in a domain menu.
- Legacy URLs do not dead-end.
- Domain shortcuts are visibly scoped.

### LCX-GIA-10 Validation, QA, And Closeout

Purpose: prove the reorganization without overstating launch status.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-GIA-10.01 | todo | Run static checks and tests for touched packages. | Test receipts. |
| LCX-GIA-10.02 | todo | Run route and deep-link smoke tests for every moved item. | Route smoke receipt. |
| LCX-GIA-10.03 | todo | Capture desktop and mobile screenshots for global utilities and domain shortcuts. | Screenshot set. |
| LCX-GIA-10.04 | todo | Run AI slop taxonomy review on changed UI/copy. | Sloplint or manual review note. |
| LCX-GIA-10.05 | todo | Create execution ledger and PR checklist. | Closeout ledger. |

Suggested validation bundle:

- `git diff --check`
- Relevant app unit tests
- Relevant UI regression tests
- `npm --workspace apps/web run build`
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`
- Browser QA on global utilities and domain shortcuts

## 9. Implementation Order

1. LCX-GIA-00 and LCX-GIA-01 first, because every later move depends on route ownership and shell placement.
2. LCX-GIA-03 next, because the notification drawer already exists and should become the interaction reference for global utility panels.
3. LCX-GIA-02 and LCX-GIA-04 next, because messaging and request inboxes are the clearest cross-domain workflows.
4. LCX-GIA-05, LCX-GIA-06, and LCX-GIA-07 after the shell and route contract are stable.
5. LCX-GIA-08 decision gates before any Calendar, Finance, Import, or Policies implementation.
6. LCX-GIA-09 cleanup only after all new global routes and old-route compatibility are proven.
7. LCX-GIA-10 closeout after local proof, with production and go-live claims still false unless later evidence exists.

## 10. Open Decisions

1. Should the global utility layer appear as top navigation, sidebar secondary group, command palette entries, or a mixed model?
2. Should `Calendar` be built now, or should Matter/People keep only local schedule links for this release?
3. Should `Billing/Finance` become a true global axis, or should Matter billing and People payroll remain separated until a finance model is designed?
4. Should `Data/Import` share a unified import job queue and audit model?
5. Should policy documents appear under `Vault` only, with People shortcut cards, or also under Settings?

## 11. Developer Handoff

Each implementation PR should update this plan's companion ledger instead of rewriting the whole plan. A PR can close one or more TUWs only when it includes:

- changed route/menu inventory,
- tests or route smoke proof,
- screenshot or manual QA note for changed navigation,
- old-route compatibility proof if a user-facing route moved,
- explicit statement that production/go-live remains unclaimed.

## 12. Local Implementation Receipt

Receipt: `docs/lazycodex/global-ia/lcx-global-ia-local-implementation-receipt-2026-06-29.json`

Local status:

- LCX-GIA-00 through LCX-GIA-10 are implemented locally.
- Immediate globals are routable: `Messages`, `Notifications`, `Requests`, `Reports`, `Settings`, `E-Sign`.
- Conditional globals have decision-gate surfaces: `Calendar`, `Billing/Finance`, `Data/Import`, `Vault/Policies`.
- Legacy domain routes resolve through the global utility catalog.
- People sidebar no longer exposes moved global People groups.
- Production, deployment, provider-live, data migration, and go-live claims remain false.

Validation receipts:

- `npm run lcx:global-ia:validate`: PASS
- `npm --workspace apps/web run test:ui`: PASS, 17 tests
- `npm --workspace apps/web run build`: PASS
- Manual browser QA through `http://127.0.0.1:5173/`: PASS
