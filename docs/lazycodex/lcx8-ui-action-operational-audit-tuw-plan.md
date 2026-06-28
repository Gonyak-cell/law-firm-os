# LCX8 UI Action Operational Audit TUW Plan

Date: 2026-06-25
Status: active
Parent plan: `docs/lazycodex/lcx8-ui-action-operational-audit-plan.md`
Evidence file: `docs/lazycodex/evidence/matter-web/LCX-WEB-08-ui-action-operational-audit.md`

## Goal

Break LCX8 into executable TUWs that can be assigned, validated, and closed
without blurring local QA, runtime-ready candidate evidence, and production
go-live authority.

## Completion Contract

LCX8 is complete only when:

- Every audited visible action has a ledger row.
- Every ledger row has a final status: `PASS`, `GUARDED`, `UI_ONLY`,
  `DESCRIPTOR_ONLY`, `BLOCKED`, or `FAIL`.
- Unknown action count is `0`.
- Critical action unknown count is `0`.
- PASS write actions have API and read-back or reload proof.
- GUARDED actions have expected denial, review, or step-up proof.
- FAIL and BLOCKED actions are routed into a remediation lane.
- LCX8 evidence states production go-live, public release, and owner approval
  remain false unless separate external evidence changes that.

## TUW Status Legend

| Status | Meaning |
| --- | --- |
| `todo` | Not started. |
| `active` | Currently being worked. |
| `evidence-pending` | Work is done but evidence file or artifact is not final. |
| `blocked` | Cannot proceed without external state, secret, receipt, owner decision, or runtime. |
| `done` | Evidence recorded and acceptance met. |

## LCX8-P0 - Baseline Freeze

Objective:
Freeze the repo and runtime baseline before action inventory begins.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P0-T00 | done | Record goal creation and LCX8 start boundary. | W8 evidence file. | Evidence states LCX8 is active and does not claim go-live. |
| P0-T01 | done | Capture branch, SHA, and dirty worktree summary. | `lcx8-action-run.json` baseline block. | Branch, SHA, and `git status --short` are recorded. |
| P0-T02 | done | Capture local runtime versions. | `lcx8-action-run.json` baseline block. | Node and npm versions are recorded. |
| P0-T03 | done | Confirm existing LCX-WEB W0-W7 closeout remains historical evidence. | W8 evidence notes. | W0-W7 status is referenced without reopening old claims. |
| P0-T04 | done | Run web static UI regression tests. | Command receipt. | `npm --workspace apps/web run test:ui` result recorded. |
| P0-T05 | done | Run HRX UI API-backed static validator. | Command receipt. | `npm run hrx:ui:validate` result recorded with baseline failure. |
| P0-T06 | done | Run API test baseline or record why deferred. | Command receipt or deferral note. | `npm run api:test` pass/fail/deferred is explicit. |
| P0-T07 | done | Record baseline blockers before browser QA. | W8 evidence file. | Any pre-existing failure is named before action clicks begin. |

## LCX8-P1 - Visible Action Inventory

Objective:
Inventory visible actions on the audited surfaces.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P1-T00 | done | Define audited route manifest. | `lcx8-action-inventory.json`. | Manifest includes auth, home, clients, matters, people, vault, profile, guarded states. |
| P1-T01 | done | Inventory auth/login actions. | Ledger rows. | Email, password, submit, splash/handoff controls are represented. |
| P1-T02 | done | Inventory topbar actions. | Ledger rows. | Create, invite, search, notifications, profile, locale/theme actions are represented. |
| P1-T03 | done | Inventory sidebar and product-axis navigation. | Ledger rows. | Home, Client, Matter, People, Vault, section links are represented. |
| P1-T04 | done | Inventory home command-center actions. | Ledger rows. | Work-area open buttons and command-center queue controls are represented. |
| P1-T05 | done | Inventory Client actions. | Ledger rows. | Client sidebar, list, leads, opportunities, intake, accounts, contacts, data, reports, import, and guarded controls are represented before P3/P4 proof. |
| P1-T06 | done-for-S1 | Inventory Matter actions. | Ledger rows. | Visible Matter list, command, Vault, timeline, calendar, channel, and opening controls are represented before P3/P4 proof. |
| P1-T07 | done-for-S1 | Inventory Vault actions. | Ledger rows. | Vault documents refresh and visible panel action affordances are represented before P3/P4 proof. |
| P1-T08 | done | Inventory People and HRX actions. | Ledger rows. | People `#people-directory`, deeper legal People relationships/conflicts, workforce, HRX documents/leave/approvals/recruiting, policy/audit/analytics/AI/payroll/admin, disabled controls, and visible no-op affordances are represented before P3/P4 proof. |
| P1-T09 | done | Inventory profile actions. | Ledger rows. | Profile sidebar/cards, no-handler actions, and profile hash links without section-specific unavailable states are represented. |
| P1-T10 | done | Inventory desktop bridge actions. | Ledger rows. | Login, file bridge, file picker, deep links, notifications, and update/session actions are represented or scoped out. |
| P1-T11 | done | Include disabled and unavailable actions. | Ledger rows. | Disabled controls are not silently skipped. |
| P1-T12 | done | Count inventory coverage. | W8 evidence summary. | Initial action count and unknown count are recorded. |

## LCX8-P2 - Source And Handler Trace

Objective:
Trace every inventory row to the local source path, handler, API route, or
runtime boundary.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P2-T00 | done | Trace `App.jsx` navigation handlers. | Ledger trace fields and `lcx8-source-trace-p2-t00-app-navigation.json`. | Top-level route and hash actions are mapped. |
| P2-T01 | done | Trace `Shell.jsx` topbar, sidebar, notification, search, and profile actions. | Ledger trace fields and `lcx8-source-trace-p2-t01-shell-actions.json`. | Handlers and local-only actions are explicit; Matter/Vault sidebar backfill rows are added. |
| P2-T02 | done | Trace `HomeSurface` command-center actions. | Ledger trace fields and `lcx8-source-trace-p2-t02-home-surface.json`. | Work-area opens map to product-axis routes, and refresh stays API-proof blocked. |
| P2-T03 | done | Trace Client components and API clients. | Ledger trace fields and `lcx8-source-trace-p2-t03-client-actions.json`. | Client actions map to API/domain paths or UI-only state. |
| P2-T04 | done | Trace Matter components and API clients. | Ledger trace fields and `lcx8-source-trace-p2-t04-matter-actions.json`. | Matter actions map to CMP/API routes, guarded paths, or blocked runtime. |
| P2-T05 | done | Trace Vault components and API clients. | Ledger trace fields and `lcx8-source-trace-p2-t05-vault-actions.json`. | Vault actions map to API routes, document detail, security, unavailable state, or guarded paths. |
| P2-T06 | done | Trace People/HRX components and `hrxApiClient.ts`. | `lcx8-source-trace-p2-t06-people-hrx-actions.json`. | HRX actions map to exact endpoints and required headers. |
| P2-T07 | done | Trace desktop preload, IPC, file bridge, deep link, and session handlers. | `lcx8-source-trace-p2-t07-desktop-bridge-actions.json`. | Native bridge depth is explicit. |
| P2-T08 | done | Mark no-op or missing handlers. | `lcx8-source-trace-p2-t08-missing-handler-classification.json`. | Missing handlers are `FAIL` or `BLOCKED`, never guessed. |
| P2-T09 | done | Mark descriptor-only families. | `lcx8-source-trace-p2-t09-descriptor-only-families.json`. | Descriptor-only package/domain evidence is not promoted to runtime. |
| P2-T10 | done | Assign trace depth to every row. | `lcx8-source-trace-p2-t10-trace-depth-assignment.json`. | Each row has `ui_state_only`, `route_navigation`, `api_read`, `api_write`, `native_bridge`, or `external_receipt_required`. |

## LCX8-P3 - Browser Runtime Action QA

Objective:
Drive audited actions in a real browser and record observable behavior.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P3-T00 | done | Start or attach to API server. | `lcx8-api-server-p3-t00.json`. | API base and PID/session note are recorded. |
| P3-T01 | done | Start or attach to web server. | `lcx8-web-server-p3-t01.json`. | Web base URL is recorded. |
| P3-T02 | done | Run existing UI flow verifier. | `runtime-flow-verification.json`. | Result is recorded with pass/fail. |
| P3-T03 | done | Run existing live data verifier. | `live-data-verification.json`. | Result is recorded with pass/fail and API 5xx count. |
| P3-T04 | done | Click first-slice home actions. | `lcx8-browser-action-qa-p3-t04-home.json`, screenshots. | Route/state/network outcome is recorded. |
| P3-T05 | done | Click first-slice matter actions. | `lcx8-browser-action-qa-p3-t05-matter.json`, screenshots. | Safe matter actions have observed outcomes. |
| P3-T06 | done | Click first-slice vault actions. | `lcx8-browser-action-qa-p3-t06-vault.json`, screenshots. | Safe vault actions have observed outcomes. |
| P3-T07 | done | Click first-slice people directory actions. | `lcx8-browser-action-qa-p3-t07-people-directory.json`, screenshots. | Safe people directory actions have observed outcomes. |
| P3-T08 | done | Record console errors per action. | `lcx8-console-error-ledger-p3-t08.json`. | Unexpected errors are attached to the responsible row. |
| P3-T09 | done | Record network responses per action. | `lcx8-api-response-ledger.json`. | 4xx and 5xx are classified as expected or unexpected. |
| P3-T10 | done | Run guarded state browser checks. | `lcx8-guarded-state-browser-check-p3-t10.json`. | Denied/review states are visible and classified. |
| P3-T11 | done | Run mobile overflow/focus smoke for audited actions. | `lcx8-mobile-overflow-focus-smoke-p3-t11.json`. | No tested action is hidden by overflow or focus trap. |

## LCX8-P4 - API, Permission, And Audit Proof

Objective:
Prove API-backed actions honor tenant, actor, scope, review, step-up, audit, and
domain boundaries.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P4-T00 | done | Map API route coverage from browser responses. | `lcx8-api-route-coverage-p4-t00.json`. | Every API-backed row has endpoint, method, status. |
| P4-T01 | done | Verify read actions fail closed. | `lcx8-read-fail-closed-p4-t01.json`. | Denied/review states do not leak protected data. |
| P4-T02 | done | Verify write action preconditions. | `lcx8-write-preconditions-p4-t02.json`. | Required tenant, actor, scope, and idempotency fields are known. |
| P4-T03 | done | Verify HRX headers and step-up behavior. | `lcx8-hrx-header-step-up-p4-t03.json`. | HRX rows include header/step-up proof or blocker. |
| P4-T04 | done | Verify Matter/Vault permission trimming. | `lcx8-matter-vault-permission-trimming-p4-t04.json`. | Silent matter, legal hold, ethical wall, ACL, and review behavior are explicit; no write PASS is inferred. |
| P4-T05 | done | Verify audit write requirements. | `lcx8-audit-write-requirements-p4-t05.json`. | Required audit rows have event proof or remain non-PASS; HRX audit helper test passed. |
| P4-T06 | done | Verify error taxonomy. | `lcx8-error-taxonomy-p4-t06.json`. | Expected blocked claims and failure reasons are stable. |
| P4-T07 | done | Run focused API tests for touched domains. | `lcx8-focused-api-tests-p4-t07.json`. | Relevant focused API tests passed 93/93; no PASS promotion inferred. |
| P4-T08 | done | Assign final API-backed provisional statuses. | `lcx8-api-provisional-statuses-p4-t08.json`. | API-backed rows are no longer unknown; only read-only Vault refresh is promoted to PASS. |

## LCX8-P5 - Persistence And Reload Proof

Objective:
Verify durable actions survive reload or read-back when persistence is expected.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P5-T00 | done | Identify rows requiring persistence proof. | `lcx8-persistence-row-identification-p5-t00.json`. | Durable candidate count is recorded: 83 candidates, 72 safe-fixture candidates, 11 precondition-gap rows. |
| P5-T01 | done | Define safe synthetic tenant/actor fixture. | `lcx8-safe-fixture-definition-p5-t01.json`. | No real client data is required; all 83 write rows have fixture applicability and two Matter rows are selected for P5-T02. |
| P5-T02 | done | Execute safe write or fixture-backed write action. | `lcx8-safe-write-execution-p5-t02.json`. | Write result is recorded with correlation/audit hints for two selected Matter rows; no PASS promotion yet. |
| P5-T03 | done | Reload UI and verify persisted state. | `lcx8-reload-ui-proof-p5-t03.json`. | State survives reload for the two selected Matter rows; no PASS promotion yet. |
| P5-T04 | done | Query API/domain read model for read-back. | `lcx8-api-read-model-proof-p5-t04.json`. | Stored state is visible through expected read path for the two selected Matter rows; no PASS promotion yet. |
| P5-T05 | done | Verify audit event or expected absence. | `lcx8-audit-event-proof-p5-t05.json`. | Audit boundary is proven for the two selected Matter rows; both are promoted to `PASS`. |
| P5-T06 | done | Classify ephemeral rows. | `lcx8-ephemeral-local-only-classification-p5-t06.json`. | Local-only state remains `UI_ONLY`; 128 rows confirmed. |
| P5-T07 | done | Classify external persistence rows. | `lcx8-external-persistence-classification-p5-t07.json`. | Missing production/external persistence is `BLOCKED`, not FAIL; 38 rows classified and 0 statuses changed. |

## LCX8-P6 - Desktop And Native Bridge QA

Objective:
Verify desktop-only actions independently from web routes.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P6-T00 | done | Run desktop smoke tests. | `lcx8-desktop-smoke-p6-t00.json`. | `npm --workspace apps/desktop run test:smoke` passed 59/59 with 0 failures; no status promotion. |
| P6-T01 | done | Run desktop file bridge tests. | `lcx8-desktop-file-bridge-p6-t01.json`. | File bridge passed 17/17; contract validators passed; 7 file bridge rows recorded without status promotion. |
| P6-T02 | done | Run desktop screen QA. | `lcx8-desktop-screen-qa-p6-t02.json`; `docs/lazycodex/evidence/matter-desktop/artifacts/desktop-screen-qa-result.json`; `docs/lazycodex/evidence/matter-desktop/artifacts/desktop-screen-qa.png`. | Login and product surface screenshots are recorded; no status promotion before P6 mapping. |
| P6-T03 | done | Map desktop login actions. | `lcx8-desktop-login-actions-p6-t03.json`. | Desktop login is separate from web login; 6 packaged desktop shell/login/runtime rows promoted to `PASS`. |
| P6-T04 | done | Map file actions and cleanup behavior. | `lcx8-desktop-file-actions-p6-t04.json`. | File actions include deny/allow and cleanup evidence; active-shell file bridge allow actions remain `BLOCKED`. |
| P6-T05 | done | Map deep link and notification actions. | `lcx8-desktop-deep-link-notification-p6-t05.json`. | Deep link deny/open and notification route intent are classified; OS/external delivery rows remain `BLOCKED`. |
| P6-T06 | done | Map update/session actions. | `lcx8-desktop-update-session-p6-t06.json`. | Update rollback and session cleanup are classified; logout/session cleanup promoted to `PASS`; signed update/rollback remain `BLOCKED`. |
| P6-T07 | done | Classify desktop external runtime blockers. | `lcx8-desktop-external-runtime-blockers-p6-t07.json`. | Temporary AWS/runtime constraints are not overclaimed; 26 native rows classified. |

## LCX8-P7 - Visual, Accessibility, And Copy Review

Objective:
Ensure action states are understandable, reachable, and not overclaimed.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P7-T00 | done | Review screenshots for overlap and hidden controls. | `lcx8-visual-overlap-hidden-controls-p7-t00.json`. | Critical action controls are visible and not occluded on desktop/primary mobile panels; 3 Lane E mobile offscreen/hidden-control findings recorded. |
| P7-T01 | done | Review button disabled/guarded affordances. | `lcx8-disabled-guarded-affordance-p7-t01.json`. | Disabled and guarded states communicate why action is unavailable, with 2 findings recorded for Client/People gaps. |
| P7-T02 | done | Review focus and dialog/drawer behavior. | `lcx8-focus-dialog-drawer-p7-t02.json`. | Keyboard and focus behavior is acceptable for tested dialogs/drawers, with 2 Lane E findings recorded. |
| P7-T03 | done | Review Korean user-facing copy. | `lcx8-korean-copy-review-p7-t03.json`. | Raw IDs, internal labels, and translation drift are flagged; 4 copy/launch-boundary findings recorded with 0 status changes. |
| P7-T04 | done | Review launch/readiness claims. | `lcx8-launch-claim-copy-review-p7-t04.json`. | UI does not imply production go-live without evidence; direct launch claim hits were `0`. |
| P7-T05 | done | Run AI slop taxonomy lint when UI/copy changed. | `lcx8-ai-slop-lint-p7-t05.json`. | Sloplint passed with no auto-detectable AI slop signals. |
| P7-T06 | done | Attach copy/UX findings to remediation lanes. | `lcx8-copy-ux-a11y-backlog-p7-t06.json`; `lcx8-remediation-backlog.md`. | 11 P7 findings are routed to Lane E or Lane B/E without status changes. |

## LCX8-P8 - Classification And Remediation Backlog

Objective:
Close the ledger by classifying every action and routing gaps.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P8-T00 | done | Compute status counts. | `lcx8-final-status-count-p8-t00.json`. | PASS/GUARDED/UI_ONLY/DESCRIPTOR_ONLY/BLOCKED/FAIL counts recorded. |
| P8-T01 | done | Compute critical action unknown count. | `lcx8-critical-unknown-zero-p8-t01.json`. | Critical unknown count is zero before closeout. |
| P8-T02 | done | Assign Lane A for UI-not-wired issues. | `lcx8-final-lane-assignment-p8-t02-t06.json`; remediation backlog. | Each Lane A issue has source file and expected handler/API path. |
| P8-T03 | done | Assign Lane B for schema/runtime/security/audit gaps. | `lcx8-final-lane-assignment-p8-t02-t06.json`; remediation backlog. | Each Lane B issue has domain owner and validator target. |
| P8-T04 | done | Assign Lane C for descriptor-only work. | `lcx8-final-lane-assignment-p8-t02-t06.json`; remediation backlog. | Each Lane C issue names missing runtime layer. |
| P8-T05 | done | Assign Lane D for external receipt or owner gates. | `lcx8-final-lane-assignment-p8-t02-t06.json`; remediation backlog. | External blockers are separated from repo bugs. |
| P8-T06 | done | Assign Lane E for copy/UX/a11y issues. | `lcx8-final-lane-assignment-p8-t02-t06.json`; remediation backlog. | Non-runtime product issues are scoped cleanly. |
| P8-T07 | done | Rank blockers by operational risk. | `lcx8-blocker-risk-ranking-p8-t07.json`; remediation backlog. | High-risk actions are listed first. |
| P8-T08 | done | Produce remediation-ready issue text. | `lcx8-remediation-ready-issues-p8-t08.json`; backlog markdown. | Each issue is actionable without redoing discovery. |

## LCX8-P9 - Closeout Gate

Objective:
Publish final LCX8 evidence while keeping launch boundaries explicit.

| TUW | Status | Work Unit | Output | Acceptance |
| --- | --- | --- | --- | --- |
| P9-T00 | active | Run final web UI tests. | Command receipt. | `npm --workspace apps/web run test:ui` result recorded. |
| P9-T01 | todo | Run final web build. | Command receipt. | `npm --workspace apps/web run build` result recorded. |
| P9-T02 | todo | Run final HRX UI validator. | Command receipt. | `npm run hrx:ui:validate` result recorded. |
| P9-T03 | todo | Run final API tests. | Command receipt. | `npm run api:test` result recorded or scoped failure named. |
| P9-T04 | todo | Run final browser flow/live verifiers. | Artifact receipts. | `ui:flows:verify` and `ui:live:verify` results recorded. |
| P9-T05 | todo | Run final web e2e suite. | Command receipt. | Matter Vault and HRX e2e results recorded. |
| P9-T06 | todo | Run final desktop smoke/file bridge. | Command receipt. | Desktop results recorded. |
| P9-T07 | todo | Run runtime and launch boundary validators. | Command receipt. | Runtime readiness and launch gates recorded without overclaiming. |
| P9-T08 | todo | Publish final W8 evidence file. | `LCX-WEB-08-ui-action-operational-audit.md`. | Evidence includes status counts, blockers, commands, artifacts, non-claims. |
| P9-T09 | todo | Update matter-web evidence index. | Index update. | W8 active/closed status is visible without mutating W0-W7 history. |

## First Execution Slice

Start with these rows before expanding:

| Slice | Included Surfaces | Target |
| --- | --- | --- |
| S1 | home, matters, vault, people directory | First 25 action rows, browser QA, schema proof. |
| S2 | topbar, sidebar, notifications, search, profile | Navigation and UI-only classification. |
| S3 | Client and Matter deeper sections | API trace and guarded states. |
| S4 | People/HRX deeper sections | API headers, step-up, sensitive-data boundaries. |
| S5 | Desktop native bridge | Native action classification. |

P4-T03 HRX header and step-up verification is complete with
`HRX_HEADER_STEP_UP_CONFIRMED_WITH_PEOPLE_CTX_GAP`; P4-T04 Matter/Vault
permission trimming is active next.

## Active Start State

Current active TUW:

- P4-T04: Verify Matter/Vault permission trimming.

Completed startup TUWs:

- P0-T00 through P0-T07.
- P1-T00.
- P1-T01 through P1-T03.
- S1 inventory for P1-T04, P1-T06, P1-T07, and People `#people-directory`
  slice of P1-T08.
- P1-T05 Client action inventory.
- P1-T08 People/HRX remainder action inventory.
- P1-T09 Profile action inventory.
- P1-T10 Desktop bridge action inventory.
- P1-T11 Disabled/unavailable action sweep.
- P1-T12 Coverage count.
- P2-T00 App navigation trace.
- P2-T01 Shell action trace.
- P2-T02 HomeSurface command-center trace.
- P2-T03 Client component/API trace.
- P2-T04 Matter component/API trace.
- P2-T05 Vault component/API trace.
- P2-T06 People/HRX component/API trace.
- P2-T07 Desktop preload/IPC/file bridge/deep link/session handler trace.
- P2-T08 Missing/no-op handler classification.
- P2-T09 Descriptor-only family classification.
- P2-T10 Trace-depth assignment.
- P3-T00 API server start/attach.
- P3-T01 Web server start/attach.
- P3-T02 UI flow verifier result recorded.
- P3-T03 Live data verifier result recorded.
- P3-T04 Home click QA.
- P3-T05 Matter click QA.
- P3-T06 Vault click QA.
- P3-T07 People directory click QA.
- P3-T08 Console error ledger.
- P3-T09 Network response ledger.
- P3-T10 Guarded state browser check.
- P3-T11 Mobile overflow/focus smoke.
- P4-T00 API route coverage mapping.
- P4-T01 Read fail-closed verification.
- P4-T02 Write action precondition verification.
- P4-T03 HRX header and step-up verification.

Next TUWs:

- P4-T05: Verify audit write requirements.
