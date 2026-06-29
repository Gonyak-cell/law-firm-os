# Client UI Customer and Opportunity TUW Plan

Status: implemented
Date: 2026-06-29
Branch: `codex/client-customer-opportunity-ui`
Scope: `apps/web` Client UI only

## Goal

Reflect the approved Client terminology model in the product UI:

- `Client` is user-facing `Client`.
- `Client` includes individuals and organizations.
- `의뢰인` is not used in Client UI because it is limited to litigation matters.
- `Opportunity` remains the pre-engagement object and is described as `수임 전 기회` where context is needed.
- Matter UI and Matter domain labels are out of scope.

## Lazyweb Evidence

Lazyweb searches for CRM/customer/opportunity screens showed a repeated product pattern:

- Customer/account and contact lists are distinct but connected.
- Opportunity or deal pipelines are a first-class pre-engagement workflow.
- Activity, consultation, communication, and report surfaces sit beside the customer record, not under Matter.
- Detail panels stay anchored to the selected customer/contact/opportunity record.

This plan maps that pattern to Korean legal-operations language: `Client`, `담당자`, `Opportunity`, `상담·문의`, `접촉 이력`, `제안·계약`, `Client 관계`, `이해상충 확인`, `청구·수금`, `Client 리포트`, and `Client 설정`.

## Non-Goals

- No Matter menu or Matter screen changes.
- No API contract rename from `client`/`ClientGroup`; internal identifiers remain stable.
- No production readiness, go-live, or release approval claim.
- No new backend persistence or billing/conflict-check runtime claim.

## Testable Units of Work

| TUW | Layer | Status | Primary Artifact | Exit Evidence |
| --- | --- | --- | --- | --- |
| CLIENT-UI-T01 | Terminology | completed | This plan; UI copy contract | Saved terminology contract and no Client-UI use of `의뢰인` |
| CLIENT-UI-T02 | Navigation | completed | `apps/web/src/data/nav.js`; `apps/web/src/i18n.js` | Top nav/search labels show `Client` |
| CLIENT-UI-T03 | Capability Copy | completed | `apps/web/src/data/capabilityMap.js` | Capability label and boundary use `Client` |
| CLIENT-UI-T04 | Page Header | completed | `apps/web/src/components/ClientsSurface.jsx` | Header title/subtitle use `Client`, `담당자`, `Opportunity`, `상담 이력` |
| CLIENT-UI-T05 | Existing Section Labels | completed | `ClientsSurface.jsx`; `Shell.jsx` | Existing Client sections use natural Korean labels |
| CLIENT-UI-T06 | Menu Registry | completed | `Shell.jsx`; `ClientsSurface.jsx` | 15 Client menu items route through hash sections |
| CLIENT-UI-T07 | Current Panel Mapping | completed | `ClientsSurface.jsx` | Existing panels map to new menu vocabulary without data loss |
| CLIENT-UI-T08 | Shell States | completed | `ClientsSurface.jsx` | Missing future menus render bounded 준비 중 states |
| CLIENT-UI-T09 | Opportunity Stages | completed | `ClientsSurface.jsx` | Opportunity rows/actions use pre-engagement stage language |
| CLIENT-UI-T10 | Right Detail Panel | completed | `ClientsSurface.jsx` | Right panel metrics use `Client`, `잠재 Client`, `담당자`, `Opportunity` |
| CLIENT-UI-T11 | State Copy | completed | `ClientsSurface.jsx` | Empty/error/denied/review states use `Client` vocabulary |
| CLIENT-UI-T12 | Record Action Copy | completed | `ClientsSurface.jsx`; `DataCloudEnrichmentPanel.jsx`; `ReportBuilderPanel.jsx`; `apiClient.js` | User-facing record/report/data labels remove `Client` translation residue |
| CLIENT-UI-T13 | Tests | completed | `apps/web/test/ui-regression.test.mjs`; `scripts/verify-matter-ui-flows.mjs` | Tests assert `Client` and current route markers |
| CLIENT-UI-T14 | AI Slop Review | completed | changed UI/copy files | `sloplint.py --changed` passes |
| CLIENT-UI-T15 | Browser QA | completed | local app + API runtime evidence | Client UI routes and shell states observed in browser |
| CLIENT-UI-T16 | Build and Regression | completed | web test/build commands | `test:ui` and web build pass |

## Detailed TUW Plan

### CLIENT-UI-T01 - Terminology Contract

Plan:
- Store this plan as the implementation source of truth.
- Define the exact user-facing noun policy for Client UI.

Do:
- Keep route IDs, API object names, and source identifiers such as `client`, `clients`, `ClientGroup`, and `Client Matter People Vault` where they are product or technical identifiers.
- For visible Client UI copy, use `Client`.
- Prohibit `의뢰인` in Client UI.

Check:
- `rg -n "의뢰인" apps/web/src/components/ClientsSurface.jsx apps/web/src/components/Shell.jsx apps/web/src/i18n.js apps/web/src/data/nav.js apps/web/src/data/capabilityMap.js` returns no Client UI matches.

Act:
- If a `Client` string remains, classify it as either allowed technical/product identifier or user-facing residue to fix.

### CLIENT-UI-T02 - Navigation and i18n Labels

Plan:
- Update top navigation, global search labels, and page title labels.

Do:
- Change `navItems` user label for `clients` from `Client` to `Client`.
- Change `copy.ko.clients`, `copy.ko.clientsTitle`, `copy.en.clients`, and `copy.en.clientsTitle` to `Client` because the current app serves Korean UI in both locale maps.

Check:
- Source assertions in UI tests find `Client`.
- Browser top axis shows `Client`.

Act:
- Do not rename the route id `clients`.

### CLIENT-UI-T03 - Capability Copy

Plan:
- Make the backend capability card and boundary readable to Korean operators.

Do:
- Change capability `label` for `client` to `Client`.
- Change boundary to `Client 정보와 연결된 Matter를 권한 범위 안에서 확인합니다.`

Check:
- Home/capability UI still lists the client route.
- Existing endpoint and readiness arrays remain unchanged.

Act:
- Do not alter endpoint inventory or release boundary booleans.

### CLIENT-UI-T04 - Client Surface Header

Plan:
- Replace generic Client headline with the approved customer/Opportunity framing.

Do:
- Title comes from `labels.clientsTitle` as `Client`.
- Subtitle becomes `Client, 담당자, Opportunity, 상담 이력을 한 화면에서 확인합니다.`

Check:
- `/?view=clients` renders the new header.

Act:
- Keep refresh action unchanged.

### CLIENT-UI-T05 - Existing Section Labels

Plan:
- Remove awkward Client residues from current sections.

Do:
- `Client 목록` -> `Client 목록`
- `잠재 Client` -> `잠재 Client`
- `기회` / `영업 기회` -> `Opportunity`
- `접수` -> `상담·문의`
- `계정` -> `법인·개인 Client`
- `연락처` -> `담당자`
- `보고서` -> `Client 리포트`
- `가져오기` -> `Client 데이터 가져오기`

Check:
- Sidebar and panel titles agree.

Act:
- If old labels are needed in tests as technical markers, move assertions to route IDs instead of visible copy.

### CLIENT-UI-T06 - Client Menu Registry

Plan:
- Add full Client menu vocabulary while preserving current route/hash behavior.

Do:
- Add or expose the 15 target menu sections:
  - `Client 홈`
  - `Client 목록`
  - `법인·개인 Client`
  - `담당자`
  - `Opportunity`
  - `상담·문의`
  - `접촉 이력`
  - `제안·계약`
  - `Client 관계`
  - `이해상충 확인`
  - `청구·수금`
  - `Client 데이터`
  - `Client 리포트`
  - `Client 데이터 가져오기`
  - `Client 설정`
- Use existing icons from `lucide-react`.
- Route each item through `view=clients` and a stable hash section.

Check:
- Sidebar renders all 15 labels.
- Unknown hash falls back to `clients-home` or `clients-list`.

Act:
- Keep menu density work-focused; no decorative cards or marketing labels.

### CLIENT-UI-T07 - Current Panel Mapping

Plan:
- Map current API-backed panels to new menu sections.

Do:
- `clients-home`: overview/summary shell.
- `clients-list`: current master-data customer list.
- `client-contacts`: current contacts table as `담당자`.
- `client-opportunities`: current opportunities table as `Opportunity`.
- `client-intake`: current intake table as `상담·문의`.
- `client-accounts`: current CRM account table as `법인·개인 Client`.
- `client-data`: current data enrichment as `Client 데이터`.
- `client-reports`: current report builder as `Client 리포트`.
- `client-import`: current import mapping as `Client 데이터 가져오기`.

Check:
- Each current panel still fetches its original data and preserves denied/review behavior.

Act:
- Do not remove existing data calls.

### CLIENT-UI-T08 - Future Menu Shell States

Plan:
- Add bounded shell states for planned menus not yet backed by a dedicated panel.

Do:
- Add static shell panels for:
  - `접촉 이력`
  - `제안·계약`
  - `Client 관계`
  - `이해상충 확인`
  - `청구·수금`
  - `Client 설정`
- Mark them as `준비 중` and clearly avoid runtime-ready claims.
- Include concise rows that explain which existing data or future connection will back the section.

Check:
- Shell states render without dead buttons.
- Copy does not claim unavailable functionality is live.

Act:
- Future panels can replace shell states without changing sidebar route IDs.

### CLIENT-UI-T09 - Opportunity Stages

Plan:
- Make pre-engagement language explicit and natural.

Do:
- Map known backend stage/status values to Korean stage names:
  - open -> `신규 문의`
  - qualified -> `상담 진행`
  - active -> `제안 준비`
  - intake_requested -> `수임 검토`
  - review_required -> `계약 검토`
  - closed -> `실권·종료`
- Keep `Opportunity` as the object label.
- Handoff action should read as `상담·문의로 전환`.

Check:
- Opportunity table and handoff result use the same labels.

Act:
- Do not create Matter from this UI in this TUW.

### CLIENT-UI-T10 - Right Detail Panel

Plan:
- Align the right panel with the selected customer record.

Do:
- Header eyebrow `레코드` -> `Client 정보`.
- Fallback title `Client` -> `Client`.
- `잠재 Client` -> `잠재 Client`.
- `기회` -> `Opportunity`.
- `접수` -> `상담·문의`.
- `계정` -> `Client`.
- `연락처` -> `담당자`.
- `데이터 보강 상태는 Client 데이터 관리...` -> `Client 데이터...`.
- `Client 보고서` -> `Client 리포트`.

Check:
- Right panel remains visible in all sections.

Act:
- Keep permission boundary notes.

### CLIENT-UI-T11 - Empty/Error/Denied/Review Copy

Plan:
- Make state messages specific and non-translationese.

Do:
- Ensure nouns passed to `renderLiveState()` are customer vocabulary.
- `검토가 필요한 Client가 있습니다.` -> `검토가 필요한 Client이 있습니다.`

Check:
- `ctx=denied` and `ctx=review` routes display readable Korean copy.

Act:
- Do not weaken fail-closed states.

### CLIENT-UI-T12 - Record Action Copy

Plan:
- Remove user-facing Client residues in record actions.

Do:
- `Client 표시 이름` -> `Client 표시 이름`.
- `Client 작업 검토` -> `Client 작업 검토`.
- `Client 계정 레코드` -> `Client 정보`.
- `Client 레코드` -> `Client 정보`.
- `Client 연락처` -> `Client 담당자`.
- Keep objectName arguments (`client`, `account`, `contact`) unchanged.

Check:
- Actions still call original APIs and record-action routes.

Act:
- Do not rename data fields or backend object names.

### CLIENT-UI-T13 - Test Updates

Plan:
- Update tests from English visible labels to Korean visible labels where appropriate.

Do:
- Adjust `apps/web/test/ui-regression.test.mjs`.
- Adjust smoke scripts if they assert `Client와 상담 접수`.
- Keep product-axis technical assertions only where they validate internal product-frame strings.

Check:
- `npm --workspace apps/web run test:ui` passes.

Act:
- Add assertions for all 15 Client sidebar labels if no equivalent coverage exists.

### CLIENT-UI-T14 - AI Slop Review

Plan:
- Validate that Korean UI copy does not drift into AI translationese or generic SaaS marketing.

Do:
- Run `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`.

Check:
- Sloplint passes or intentional flags are documented.

Act:
- Remove vague phrases and overbroad claims before finalizing.

### CLIENT-UI-T15 - Browser QA

Plan:
- Observe the UI through the product surface, not only static tests.

Do:
- Run the web app locally.
- Visit at least:
  - `/?view=clients#clients-home`
  - `/?view=clients#clients-list`
  - `/?view=clients#client-opportunities`
  - `/?view=clients#client-contacts`
  - `/?view=clients#client-conflict`
  - `/?view=clients&ctx=denied#clients-list`
  - `/?view=clients&ctx=review#clients-list`

Check:
- Top nav says `Client`.
- Sidebar has all 15 menu items.
- Right panel is visible and copy is customer-centric.
- No overlap or horizontal overflow at desktop viewport.

Act:
- Save or describe screenshots/evidence if a script captures them.

### CLIENT-UI-T16 - Build and Regression

Plan:
- Close the implementation with local proof.

Do:
- Run:
  - `npm --workspace apps/web run test:ui`
  - `npm --workspace apps/web run build`
  - focused smoke command if updated

Check:
- Commands exit 0.
- Existing warnings are noted but not hidden.

Act:
- Update this plan's status/evidence if needed before final handoff.

## Completion Accounting

A Client UI implementation can close only when all 16 TUWs are implemented or explicitly marked not applicable by owner decision. For this goal, no TUW is optional.

## Implementation Evidence

Implemented in branch `codex/client-customer-opportunity-ui`.

- `apps/web/src/data/nav.js`, `apps/web/src/i18n.js`, `apps/web/src/data/capabilityMap.js`: top-level Client axis now displays as `Client`.
- `apps/web/src/components/Shell.jsx`: Client sidebar now exposes grouped Korean menu items for `Client 홈`, `Client 목록`, `법인·개인 Client`, `담당자`, `Opportunity`, `상담·문의`, `접촉 이력`, `제안·계약`, `Client 관계`, `이해상충 확인`, `청구·수금`, `Client 리포트`, `Client 데이터`, `Client 데이터 가져오기`, and `Client 설정`.
- `apps/web/src/components/ClientsSurface.jsx`: default section is `clients-home`; current panels are mapped to the new menu vocabulary; future sections render bounded `준비 중` states; right panel and fail-closed copy use customer vocabulary.
- `apps/web/src/components/DataCloudEnrichmentPanel.jsx`, `apps/web/src/components/ReportBuilderPanel.jsx`, `apps/web/src/data/apiClient.js`: customer data/report labels use `Client` while internal `Client` object contracts remain stable.
- `apps/web/test/ui-regression.test.mjs`, `scripts/verify-matter-ui-flows.mjs`: regression and browser-flow checks now assert the customer terminology and guarded states.

Verification run:

- `npm --workspace apps/web run test:ui`: PASS, 17/17 tests.
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`: PASS.
- `MATTER_UI_URL=http://127.0.0.1:5173 node scripts/verify-matter-ui-flows.mjs`: PASS after starting `npm --workspace apps/api run start` on `127.0.0.1:4180`.
- `npm --workspace apps/web run build`: PASS with the existing Vite chunk-size warning for `index-vHllwwR1.js` over 500 kB.
- `npm run lcx-web:validate`: PASS; `production_go_live`, `public_release`, and `owner_approval` remain `false`.
- `git diff --check`: PASS.
