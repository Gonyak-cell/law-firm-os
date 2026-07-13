# Manual QA: Home approvals and meeting rooms

Overall verdict: **PASS**

Scope reviewed: current unstaged changes in `apps/web/src/App.jsx`, `apps/web/src/components/HomeSurface.jsx`, `apps/web/src/components/Shell.jsx`, `apps/web/src/i18n.js`, `apps/web/src/styles.css`, `apps/web/test/home-dashboard-r1.test.mjs`, and `apps/web/test/ui-regression.test.mjs`. Unrelated worktree changes were not assessed or edited.

## manualQa

### surfaceEvidence

| scenario id | criterion reference | surface | exact invocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| HOME-APPROVAL-CARD | Home shows a pending-approvals card with leave and expense-processing items. Implementation: `HomeSurface.jsx:1532-1551`; layout: `styles.css:1857-1863,1876-1878`. | Packaged desktop screenshot plus current-source Chromium browser | Packaged evidence: launch `/Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app/Contents/MacOS/matter`, open Home dashboard at `1280x820`. Independent: `GET /?view=home&ctx=allow#home-dashboard` at `1280x820`; wait for `[data-dashboard-section="pending-approvals"]`. | PASS | A1, A6, A7 |
| SIDEBAR-APPROVAL-GROUP | Home sidebar exposes pending approvals, with leave and expense-processing children. Implementation: `Shell.jsx:480-491`; labels: `i18n.js:40-43,102-103`. | Packaged desktop screenshot and Chromium sidebar interaction | On Home at `1280x820`, click `button[aria-label*="승인 대기 하위 메뉴"]`; assert children `home-requests-leave` and `home-requests-expenses`. | PASS | A2, A8 |
| APPROVAL-ROUTES | Leave and expense children navigate to distinct filtered approval surfaces. Route registration: `App.jsx:35-47`; filter context: `HomeSurface.jsx:519-525`; render dispatch: `HomeSurface.jsx:1747-1752`. | Chromium Home route | Click the pending-approvals card's first row; then click `[data-sidebar-section="home-requests-expenses"]`; assert hashes `#home-requests-leave` and `#home-requests-expenses` and the corresponding filter surface. | PASS | A8, A9 |
| TODO-APPROVAL-TAB-REMOVED | Existing To Do screen no longer contains the old approval tab. Implementation: `HomeSurface.jsx:1316-1334`; regression assertion: `home-dashboard-r1.test.mjs:1285-1290`, `ui-regression.test.mjs:509-524`. | Chromium Home To Do route | Click the sidebar button with exact accessible name `할 일`; assert `#home-todo` and zero `[data-home-tab-prefix="work"]` elements. | PASS | A9, A11 |
| MEETING-ROOMS-COMPACT | Meeting-room reservations has a Home route and remains usable at compact width with no horizontal overflow. Implementation: `Shell.jsx:491`, `HomeSurface.jsx:1345-1367`; responsive layout: `styles.css:3549-3569,3588-3598`. | Packaged desktop screenshot and Chromium compact route | `GET /?view=home&ctx=allow#home-meeting-rooms` at `720x800`; assert heading `회의실 예약` and `scrollWidth <= innerWidth`. | PASS | A3, A4, A10 |
| PACKAGE-CURRENTNESS | Packaged renderer used by supplied screenshots matches the current built renderer. | Packaged renderer assets | Compare SHA-256 of `apps/web/dist` with `apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/web`, then compare entry JS/CSS hashes. | PASS | A5, A6, A12 |

### adversarialCases

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-LEGACY-TODO-APPROVAL | TODO-APPROVAL-TAB-REMOVED | Legacy approval-tab residue | Navigating to To Do must not render the removed `work` tab or duplicate approval surface. | PASS | A9, A11 |
| ADV-CATEGORY-DEEPLINK | APPROVAL-ROUTES | Direct/deep-link category routing | Leave and expense routes must remain distinct and select the matching filter after navigation. | PASS | A8, A9 |
| ADV-EMPTY-DATA | HOME-APPROVAL-CARD; MEETING-ROOMS-COMPACT | Empty/zero-result state | The approval card still exposes both categories with zero counts; meeting-room route renders its empty state without disappearing. | PASS | A1, A3, A4, A7, A10 |
| ADV-COMPACT-OVERFLOW | MEETING-ROOMS-COMPACT | Narrow viewport / horizontal overflow | At `720x800`, the meeting-room surface must fit the viewport and remain visible. | PASS | A4, A10 |
| ADV-STALE-PACKAGE | PACKAGE-CURRENTNESS | Stale packaged renderer | The packaged renderer must match the current built renderer before package screenshots are trusted. | PASS | A5, A6, A12 |

### artifactRefs

| id | kind | description | path |
|---|---|---|---|
| A1 | screenshot | Supplied packaged Home dashboard at 1280x820; approval card visible with `휴가` and `비용처리`. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/01-home-dashboard-1280x820.png` |
| A2 | screenshot | Supplied packaged Home sidebar with approvals expanded. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/02-sidebar-approvals-open-1280x820.png` |
| A3 | screenshot | Supplied packaged meeting-room route at 1280x820. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/03-meeting-rooms-1280x820.png` |
| A4 | screenshot | Supplied packaged meeting-room route at 720x800. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/04-meeting-rooms-720x800.png` |
| A5 | audit | Supplied runtime audit covering packaged renderer hash identity and route/overflow hypotheses. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/runtime-debug-audit.md` |
| A6 | receipt | Supplied packaged QA receipt with PASS, exact executable, visible approval rows, sidebar entries, and overflow results. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/receipt.json` |
| A7 | screenshot | Independent current-source Chromium Home dashboard at 1280x820. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/05-independent-dashboard-1280x820.png` |
| A8 | screenshot | Independent current-source Chromium leave approval deep-link. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/06-independent-leave-route-1280x820.png` |
| A9 | screenshot | Independent current-source Chromium sidebar approvals expansion. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/07-independent-sidebar-approvals-1280x820.png` |
| A10 | screenshot | Independent current-source Chromium meeting-room route at 720x800. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/08-independent-meeting-rooms-720x800.png` |
| A11 | action-log | Independent browser invocations and observed route/tab/overflow results. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/independent-browser-action-log.md` |
| A12 | test-log | Focused execution of both scoped test files; 15/15 subtests passed. | `artifacts/manual-qa/home-approvals-meeting-rooms-2026-07-12/focused-scoped-test-run.md` |

Blocking findings: none.
