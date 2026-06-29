# LCX-VLTUI Vault App Connection And Current UI Implementation TUW Plan

Date: 2026-06-29
Status: `execution-active`
LazyCodex mode: TUW execution plan
Baseline release: `matter-desktop-v0.1.0-current-ui-20260629`
Baseline release commit: `c08c8a29c6d7d4f6b9f599f4a56371d770b9ae5f`
Observed local branch: `codex/home-utility-menu-style`
Observed local HEAD: `44ce32ca4`
Related Lazyweb report: https://www.lazyweb.com/report/lazyweb/6b134d69-ff11-43a8-b9fd-b9a48b93c9b0/
Current Lazyweb report attempt: `attempted_failed_synthesize_field_missing` job `01f18780-0318-4190-b04b-61fd03ff7ec7` (see `docs/lazycodex/lcx-vltui-03-document-workspace-receipt-2026-06-29.json`)
Production execution: `false`
Production ready: `false`
Public release: `false`
Go-live approved: `false`
Owner final approval: `false`

## 1. Goal

Plan the next implementation train that connects Law Firm OS to the Vault app and turns the latest current-UI audit into implementation-sized LazyCodex TUWs.

The plan has two lanes that must stay separate:

1. Vault app connection: prove Matter app -> Vault contract, bridge auth, projection freshness, upload/document preflight, and reference-only receipts before exposing write-capable UI.
2. Current UI implementation: replace planned/UI-only/profile/global-utility shells with API-backed, permission-aware, browser-verified behavior.

Implementation premise for this revision: all Matter, Client, and Vault product surfaces must be connectable end to end. A TUW may exit only as `route-mounted`, `provider-blocked`, `owner-blocked`, or `retired-by-decision`; generic `planned` placeholders are not an acceptable terminal state for Matter, Client, or Vault.

This document is not a release receipt. It does not authorize production writes, customer document import, OneDrive cutover, public release, App Store/Microsoft Store publication, provider enablement, or owner approval.

## 2. Claim Boundary

```json
{
  "planning_only": true,
  "vault_app_connection_runtime_ready": false,
  "vault_projection_sync_executed": false,
  "vault_document_write_enabled": false,
  "customer_document_import_executed": false,
  "onedrive_cutover_executed": false,
  "desktop_current_ui_prerelease": true,
  "production_ready": false,
  "public_release": false,
  "go_live_approved": false,
  "owner_final_approval": false
}
```

## 3. Baseline Findings To Implement

Latest prerelease screen QA and source audit show these implementation gaps:

| Area | Current baseline | Required implementation direction |
|---|---|---|
| Vault app connection | Matter app/Vault contract exists in the Vault app repo, but Law Firm OS current UI does not consume the full runtime readiness/projection/write-preflight ladder. | Add a fail-closed bridge consumption layer, projection status UI, and document action preflight proof before exposing write actions. |
| Session and actor context | Packaged desktop auth is verified, but `apps/web` API helpers still use synthetic tenant/actor context. | Carry the authenticated desktop/web session into API calls and audit context without leaking tokens. |
| Client | 6 planned sections remain: contact history, proposal/contracts, relationships, conflict, billing/collections, settings. | Implement in dependency order after API/audit contracts exist; keep planned states until each route is proven. |
| Matter | 17 planned sections remain: closeout, archive, tasks, notes, evidence, templates, seal, meetings, announcements, client requests, approvals, expenses, search, risk, integrations, settings, import. | Split into Matter operations, Vault/document, collaboration, approvals, risk/search, import/admin bundles. |
| People/HRX | 56 catalog features are setup/integration/audit required; payroll calculation/disbursement is explicitly not implemented. | Promote only features with HRX route, step-up, audit, and browser proof; leave payroll execution blocked until external policy/provider proof. |
| Global utilities | Search, profile, messages, notifications, settings, e-sign, and utility detail screens are mostly route/status shells. | Build global hubs or retire shells; no dead action affordances. |
| Secondary surfaces | Finance/Analytics/Ask/Portal/Ops/Readiness surfaces exist but are not mounted in the latest route contract. | Decide per surface: fold into four axes, mount as global utility, or retire. |

## 4. Source Anchors

Law Firm OS anchors:

- `docs/desktop/matter-desktop-current-ui-release-notes-2026-06-29.md`
- `docs/desktop/matter-web-canonical-ui-plan.md`
- `docs/lazycodex/evidence/matter-desktop/artifacts/desktop-screen-qa-result.json`
- `docs/lazycodex/lcx8-ui-action-operational-audit-tuw-plan.md`
- `docs/lazycodex/lcx8-remaining-ui-action-remediation-plan-2026-06-27.md`
- `apps/web/src/App.jsx`
- `apps/web/src/data/nav.js`
- `apps/web/src/data/apiClient.js`
- `apps/web/src/components/VaultSurface.jsx`
- `apps/web/src/components/MatterVaultPanel.jsx`
- `apps/web/src/components/ClientsSurface.jsx`
- `apps/web/src/components/MattersSurface.jsx`
- `apps/web/src/components/UserProfileSurface.jsx`
- `apps/web/src/components/GlobalUtilitySurface.jsx`
- `apps/web/src/components/Shell.jsx`
- `apps/web/src/components/PeopleHome.tsx`
- `apps/web/src/data/peopleFeatureCatalog.js`
- `apps/web/src/components/PayrollBoundaryPanel.tsx`
- `apps/api/src/routes/matters.js`
- `apps/api/src/matter-temp-desktop-runtime-lambda.mjs`

Vault app anchors:

- `/Users/jws/Projects/amic-vault/docs/integrations/matter-app-vault-contract.md`
- `/Users/jws/Projects/amic-vault/docs/release/onedrive-migration-approved-write-plan.md`
- `/Users/jws/Projects/amic-vault/docs/ui/enterprise-dms-ux-route-capability-inventory.md`
- `/Users/jws/Projects/amic-vault/tools/migration/matter-app-canonical-upsert-sync.mjs`
- `/Users/jws/Projects/amic-vault/tools/migration/matter-app-canonical-projection-rollback.mjs`
- `/Users/jws/Projects/amic-vault/tools/migration/matter-app-migration-db-linkage-closeout.mjs`

## 5. Execution Rules

1. Use synthetic/sandbox fixtures unless a later approved production-data policy explicitly opens real data.
2. Do not treat `vault_projection_only` as production-connected Matter app state.
3. Do not expose upload, version upload, metadata mutation, legal hold, or document action writes unless Matter app source status, projection freshness, permission, ethical wall, and audit gates pass.
4. Do not log or commit `LAWOS_VAULT_BRIDGE_TOKEN`, `MATTER_APP_API_TOKEN`, cookies, document bodies, OCR text, prompts, raw source paths, or customer document contents.
5. A visible UI control can move to `PASS` only after API route coverage, denied/review behavior, read-back or reload proof where applicable, audit proof, and browser QA are attached.
6. External providers such as Outlook, Teams, Slack, M365, OneDrive, payroll, e-sign, or AI remain `provider-blocked` until an external receipt exists.
7. Every closeout must rerun no-public-release/no-go-live claim checks.

## 6. TUW Pyramid

| Phase | Purpose | Status |
|---|---|---|
| LCX-VLTUI-00 | Baseline freeze and cross-repo contract register | ready |
| LCX-VLTUI-01 | Vault app bridge handshake and projection readiness | implemented |
| LCX-VLTUI-02 | Vault UI connected read/write-preflight surfaces | implemented |
| LCX-VLTUI-03 | Matter document workspace and Vault publication | implemented |
| LCX-VLTUI-04 | Session, tenant, actor, and audit principal bridge | implemented |
| LCX-VLTUI-05 | Client planned-section implementation | implemented |
| LCX-VLTUI-06 | Matter planned-section implementation | implemented |
| LCX-VLTUI-07 | People/HRX and payroll boundary implementation | ready |
| LCX-VLTUI-08 | Global utilities, profile, and search implementation | ready |
| LCX-VLTUI-09 | Secondary-surface disposition and route cleanup | decision-required |
| LCX-VLTUI-90 | Validation, evidence, release-boundary closeout | implemented |

## 7. Detailed TUWs

### LCX-VLTUI-00 Baseline Freeze And Contract Register

Purpose: freeze the current prerelease truth and create a single execution register before code changes.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-00.01 | ready | Record latest GitHub release, tag, commit, local branch, dirty tree, and existing current-UI evidence. | `docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json` | `gh release view`, `git status --short`, release asset checksum list. |
| LCX-VLTUI-00.02 | ready | Build a cross-repo source register for Law Firm OS and Vault app contracts. | This plan plus a JSON register under `docs/lazycodex/` | Source anchors exist and parse; no external secret values copied. |
| LCX-VLTUI-00.03 | ready | Convert the latest UI audit findings into a machine-readable gap ledger. | `docs/lazycodex/lcx-vault-app-current-ui-gap-ledger-2026-06-29.json` | Counts match: Client planned 6, Matter planned 17, People non-active 56, global shells listed. |
| LCX-VLTUI-00.04 | ready | Confirm claim boundary before implementation begins. | `docs/lazycodex/lcx-vault-app-current-ui-claim-boundary-2026-06-29.json` | `validate-matter-desktop-no-public-release-claim.mjs` passes. |

Done criteria:

- No source file, release evidence, or existing LazyCodex artifact is mutated except the new VLTUI plan/register files.
- Every later TUW can cite one baseline row.

### LCX-VLTUI-01 Vault App Bridge Handshake And Projection Readiness

Purpose: make the Vault app connection observable and fail-closed before any UI write affordance is promoted.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-01.01 | implemented | Add or harden a Law Firm OS bridge status client for `GET /api/matters/vault-bridge/status`. | `apps/web/src/data/apiClient.js`, `apps/api/src/routes/matters.js` | Status helper returns `configured`, `runtime_ready`, `source_mode`, `freshness`, and blocked reason without secrets. |
| LCX-VLTUI-01.02 | implemented | Add Vault app status ingestion mapping for `/v1/integrations/matter-app/status`. | `docs/lazycodex/lcx-vltui-01-vault-bridge-contract-2026-06-29.json` | Contract fixture proves unconfigured, projection-only, stale, denied, and ready states. |
| LCX-VLTUI-01.03 | implemented | Prove bearer-auth failure and missing-token failure remain blocked. | API tests and receipt | Missing/invalid `LAWOS_VAULT_BRIDGE_TOKEN` never produces write-capable state. |
| LCX-VLTUI-01.04 | implemented | Prove canonical client/matter upsert handshake with synthetic approved rows. | `apps/api` tests, bridge receipt | `/clients/upsert` and `/matters/upsert` return reference ids, action state, source revision, and idempotency result. |
| LCX-VLTUI-01.05 | implemented | Prove Vault projection sync or blocked state after Matter app response. | cross-repo receipt, no customer docs | Projection mismatch, stale revision, and replay duplicate create are blocked or idempotent. |
| LCX-VLTUI-01.06 | implemented | Write an `MV-LINK` acceptance ladder receipt for this train. | `docs/lazycodex/lcx-vltui-mv-link-acceptance-2026-06-29.md` | Baseline counts, status auth, lookup positive, permission negative, replay, config, and sanitized receipt checks are present. |

Done criteria:

- `matter_app_api` is not marked ready unless status, auth, runtime, freshness, and idempotency all pass.
- `vault_projection_only` can appear only as dev/test fallback copy.
- No Vault document upload or document mutation is enabled in this phase.

### LCX-VLTUI-02 Vault UI Connected Read And Write-Preflight Surfaces

Purpose: upgrade `VaultSurface` from read/detail/email filing into a connected Vault app surface with guarded write-preflight visibility.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-02.01 | implemented | Add a Vault connection/status panel that consumes LCX-VLTUI-01 status. | `apps/web/src/components/VaultSurface.jsx` | Browser proof covers ready synthetic API, unconfigured missing token, stale projection, projection-only, and claim-boundary blocked states with no go-live claim. |
| LCX-VLTUI-02.02 | implemented | Add Matter Code picker or deep-link bridge state for Vault document operations. | `VaultSurface.jsx`, `apiClient.js`, `apps/api/src/matter-runtime-context.js` | UUID-shaped normal input is rejected locally and by API; guarded lookup has no label/count leakage; positive synthetic lookup selects a safe Matter ref. |
| LCX-VLTUI-02.03 | implemented | Add upload-preflight UI only behind ready Matter app source and Vault permission gate. | `VaultSurface.jsx`, API helper, `POST /api/matters/vault-bridge/upload-preflight` | Preflight blocks unconfigured/stale/denied/projection-only states; allowed synthetic matter proceeds only to permission check with `vault_document_write_enabled=false`. |
| LCX-VLTUI-02.04 | implemented | Add version-upload and metadata-mutation preflight states without storage writes. | `VaultSurface.jsx` | Buttons remain disabled/guarded after selected Matter and preflight pass; no fake upload success. |
| LCX-VLTUI-02.05 | implemented | Add legal hold, retention, and document-action boundary states. | `VaultSurface.jsx` | Legal hold, retention, and document actions remain owner/records/guarded states with writes disabled. |
| LCX-VLTUI-02.06 | implemented | Browser-drive Vault status, picker, preflight, blocked, denied, and ready-synthetic states. | `scripts/run-lcx-vltui-browser-qa.mjs` | Screenshots and network ledger under `docs/lazycodex/evidence/matter-web/artifacts/`. |

Done criteria:

- Vault top-level UI no longer exposes write-looking controls without source readiness.
- All write-preflight actions are classified as `PASS`, `GUARDED`, or `BLOCKED` with evidence, not inferred from visibility.

### LCX-VLTUI-03 Matter Document Workspace And Vault Publication

Purpose: connect `MatterVaultPanel` document flows to the Vault app boundary without overclaiming external provider send or real document import.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-03.01 | implemented | Reconcile existing document template/draft/approval/publish helpers with Vault app preflight contract. | `apps/web/src/components/MatterVaultPanel.jsx`, `apiClient.js` | Browser proof shows template/builder metadata only and no body/raw source leakage. |
| LCX-VLTUI-03.02 | implemented | Gate `Vault에 게시` behind draft and Vault preflight state. | `MatterVaultPanel.jsx` | Publish stays disabled before preflight and returns owner-blocked envelope without Vault document write. |
| LCX-VLTUI-03.03 | implemented | Add document connect/import panel states for Matter documents using sanitized fixture manifests. | `MatterVaultPanel.jsx`, import boundary markers | Dry-run-ready appears after preflight; execute remains owner/provider-blocked. |
| LCX-VLTUI-03.04 | implemented | Keep email composer provider-blocked until Outlook/Graph receipt exists. | `MatterVaultPanel.jsx` | Send attempt returns provider-blocked; no external send success claim. |
| LCX-VLTUI-03.05 | implemented | Add audit/read-back proof for every document workspace mutation candidate. | Browser QA proof | Mutation candidates have browser proof, network ledger, and blocked/read-back markers. |

Done criteria:

- Matter document workspace can show real connected states, but external provider and storage writes remain bounded by receipts.
- `MatterVaultPanel` does not duplicate Vault app source-of-truth logic; it consumes the bridge/preflight result.

### LCX-VLTUI-04 Session, Tenant, Actor, And Audit Principal Bridge

Purpose: remove synthetic principal assumptions from current UI runtime where user-facing functionality depends on actor/tenant/audit truth.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-04.01 | implemented | Define the desktop -> web session handoff contract for tenant, actor, role, scopes, and review state. | `apps/desktop/src/renderer/offline.html`, `apps/web/src/data/apiClient.js` | Session fields are reference-only and browser proof confirms no password, reset token, bearer token, raw cookie, or customer data write claim. |
| LCX-VLTUI-04.02 | implemented | Replace default synthetic API headers with session-derived context where runtime session exists. | `apiClient.js`, `scripts/run-lcx-vltui-session-principal-proof.mjs` | Browser proof confirms Client/Matter/Vault headers use session actor refs while review/denied states still fail closed. |
| LCX-VLTUI-04.03 | implemented | Add profile API read state and remove profile-local placeholder action behavior. | `UserProfileSurface.jsx`, `/api/profile/me`, `fetchUserProfile` | Profile has populated/empty/error/denied/review states; help/contract/account actions are route-backed. |
| LCX-VLTUI-04.04 | implemented | Add audit actor propagation proof for Client/Matter/Vault write candidates. | `apiClient.js`, browser proof, API tests and receipts | Client CRM, Matter builder, and Vault preflight candidates use safe actor refs from session when session is present. |

Done criteria:

- Packaged desktop auth remains PASS.
- Web `AuthSurface` and product API helpers stop implying runtime auth when only local route navigation happened.

### LCX-VLTUI-05 Client Planned-Section Implementation

Purpose: turn the six Client planned sections into real or honestly blocked product surfaces.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-05.01 | implemented | Implement Client contact history as an API-backed activity timeline. | `ClientsSurface.jsx`, `apiClient.js`, API tests | Timeline read/write or guarded state with audit proof. |
| LCX-VLTUI-05.02 | implemented | Implement proposal/contract workspace with Vault/e-sign boundary. | `ClientsSurface.jsx`, Vault bridge helpers | Draft/approval metadata works; e-sign provider blocked without receipt. |
| LCX-VLTUI-05.03 | implemented | Implement Client relationship graph/list with safe merge and duplicate review states. | `ClientsSurface.jsx`, CRM routes | Merge execution remains dual-control; no automatic identity mutation. |
| LCX-VLTUI-05.04 | implemented | Implement conflict check panel with review queue and clearance actions. | `ClientsSurface.jsx`, conflict API | Clearance pass/block/review states are audited and fail closed. |
| LCX-VLTUI-05.05 | implemented | Implement billing/collections read and guarded action states. | `ClientsSurface.jsx`, finance helpers | No external payment or invoice send claim without provider receipt. |
| LCX-VLTUI-05.06 | implemented | Implement Client settings with permissioned policy registry. | `ClientsSurface.jsx`, settings routes | Settings writes require owner/admin scope and audit. |
| LCX-VLTUI-05.07 | implemented | Update Client planned-section ledger and browser QA. | LazyCodex evidence | Planned count drops from 6 to 0 or each residual row is explicitly `BLOCKED`. |

Done criteria:

- Client sidebar has no generic `준비 중` sections unless the section is `provider-blocked` or `owner-blocked` with a receipt.
- Existing Client API-backed list/leads/opportunities/intake/data/report/import behavior remains intact.

### LCX-VLTUI-06 Matter Planned-Section Implementation

Purpose: decompose the 17 Matter planned sections into implementable bundles without one giant Matter PR.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-06.01 | implemented | Implement closeout and archive with lifecycle, legal hold, and Vault retention gates. | `MattersSurface.jsx`, lifecycle routes | Closed/archived matters block document mutations unless policy allows. |
| LCX-VLTUI-06.02 | implemented | Implement tasks and notes as Matter activity subtypes. | `MattersSurface.jsx`, activity API | Create/update/read-back/audit proof. |
| LCX-VLTUI-06.03 | implemented | Implement evidence and templates as Vault-backed document workspace shortcuts. | `MattersSurface.jsx`, `MatterVaultPanel.jsx` | Evidence/template actions consume LCX-VLTUI-02/03 gates. |
| LCX-VLTUI-06.04 | implemented | Implement seal/signature, approvals, and client requests with provider/owner blocks. | Matter approvals routes | Provider/owner blocked states are visible and not fake success. |
| LCX-VLTUI-06.05 | implemented | Implement meetings and announcements with calendar/channel provider boundary. | calendar/channel routes | Internal-only logging works; external Teams/Slack/Outlook send remains blocked without receipt. |
| LCX-VLTUI-06.06 | implemented | Implement expenses and billing write candidates with audit and finance boundary. | finance helpers | Internal time/WIP/expense records are safe; payment/external invoice delivery blocked. |
| LCX-VLTUI-06.07 | implemented | Implement Matter search and risk panels using permission-scoped search/audit results. | search/risk helpers | No raw IDs, snippets, or denied counts leak. |
| LCX-VLTUI-06.08 | implemented | Implement Matter integrations/settings with provider status only. | settings/integrations routes | Provider credentials never appear; connect actions require external receipt. |
| LCX-VLTUI-06.09 | implemented | Implement Matter import lifecycle using sanitized fixture dry-run and guarded execute. | import helpers | Dry-run, validation, rollback/error report, and blocked execute states proven. |
| LCX-VLTUI-06.10 | implemented | Replace manual Matter opening/team IDs with selected Client/intake/HRX members. | `MatterOpeningWizard.jsx`, `MatterTeamRoster.jsx` | No normal user has to paste tenant/client/matter/member IDs; roster read-back exists. |
| LCX-VLTUI-06.11 | implemented | Update Matter planned-section ledger and browser QA. | LazyCodex evidence | Planned count drops from 17 to 0 or residual rows are explicitly `BLOCKED`. |

Done criteria:

- Matter UI no longer has generic planned placeholders for implemented rows.
- Destructive or external actions remain guarded until their receipts exist.

### LCX-VLTUI-07 People/HRX And Payroll Boundary Implementation

Purpose: move HRX catalog items from setup/integration/audit states only where route, permission, step-up, and audit evidence exists.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-07.01 | ready | Produce a People feature-state ledger from `peopleFeatureCatalog.js`. | `docs/lazycodex/lcx-vltui-people-feature-ledger-2026-06-29.json` | Counts match active 15, non-active 56, with state reasons. |
| LCX-VLTUI-07.02 | ready | Implement the highest-value `setup_required` People items as API-backed setup panels. | `PeopleHome.tsx`, feature components | Setup writes are scoped, permissioned, and audited. |
| LCX-VLTUI-07.03 | ready | Implement integration-required People items only as provider status and request flows. | People connected app routes | No provider is marked connected without external receipt. |
| LCX-VLTUI-07.04 | ready | Replace local-only workforce directory actions with real routes or remove controls. | `PeopleWorkforceDirectory.tsx` | Add/more/options/export controls are either PASS with browser proof or not visible. |
| LCX-VLTUI-07.05 | ready | Keep payroll calculation, tax, and disbursement execution blocked until policy/provider proof exists. | `PayrollBoundaryPanel.tsx` | Preview/approval/export remain bounded; execution labels do not imply live payroll. |
| LCX-VLTUI-07.06 | ready | Extend HRX step-up/audit tests and browser QA for promoted rows. | tests/evidence | HRX denied/review/step-up behavior remains fail closed. |

Done criteria:

- People catalog counts are updated by evidence, not by optimistic label changes.
- Payroll execution remains explicitly not implemented unless a later provider/policy TUW opens it.

### LCX-VLTUI-08 Global Utilities, Profile, And Search Implementation

Purpose: replace topbar/global utility shells with real hubs or remove dead affordances.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-08.01 | ready | Implement global search as real permission-scoped search instead of route-only search. | `Shell.jsx`, search helpers | Search returns scoped results, no denied count/label leakage. |
| LCX-VLTUI-08.02 | ready | Implement Messages hub with Matter/People/Client context filters. | `GlobalUtilitySurface.jsx`, message routes | Internal message log works; external provider send blocked. |
| LCX-VLTUI-08.03 | ready | Implement Notifications hub using current drawer contract. | `Shell.jsx`, `GlobalUtilitySurface.jsx` | Read/unread/filter state works and browser drawer parity holds. |
| LCX-VLTUI-08.04 | ready | Implement Requests hub for approvals and review queues. | global utility routes | Force approve/reject is permissioned and audited. |
| LCX-VLTUI-08.05 | ready | Implement Reports hub or formally keep reports domain-scoped. | report routes | Decision recorded; if global, Client/Matter/People shortcuts deep-link with scope. |
| LCX-VLTUI-08.06 | ready | Implement Settings hub with provider, permission, and workspace settings boundaries. | settings routes | No local-only session setting is mistaken for persisted setting. |
| LCX-VLTUI-08.07 | ready | Implement E-Sign as provider-blocked hub until receipt exists. | e-sign routes | Provider-blocked state and request flow visible; no fake send. |
| LCX-VLTUI-08.08 | ready | Make profile cards API-backed or remove dead-local buttons. | `UserProfileSurface.jsx` | Profile route has no placeholder-only action affordances. |

Done criteria:

- Global utilities are no longer just navigation/status cards.
- Domain shortcuts deep-link into global hubs where ownership moved.

### LCX-VLTUI-09 Secondary-Surface Disposition

Purpose: decide whether source-present but unmounted surfaces are future product screens, global utilities, four-axis internals, or retired code.

| TUW | Status | Work | Primary files | Proof |
|---|---|---|---|---|
| LCX-VLTUI-09.01 | decision-required | Classify Finance, Analytics, Ask, Portal, Ops, Readiness, Admin, Profiles, Content, Dashboards, Experiments, and Theme surfaces. | `apps/web/src/components/*Surface.*`, decision ledger | Each surface has disposition: `fold`, `global`, `mount`, `retire`, or `blocked`. |
| LCX-VLTUI-09.02 | ready-after-decision | Remove or hide retired surfaces from search, tests, and source imports. | app routes/tests | No dead route remains visible. |
| LCX-VLTUI-09.03 | ready-after-decision | Mount approved surfaces with permission, empty, denied, and review states. | `App.jsx`, route catalog | UI regression proves current four-axis contract or approved route expansion. |
| LCX-VLTUI-09.04 | ready-after-decision | Update canonical UI plan to match the decision. | `docs/desktop/matter-web-canonical-ui-plan.md` | Plan and tests agree; release boundary remains false. |

Done criteria:

- The codebase does not keep ambiguous product screens that look implemented but are not route-mounted.
- Current tests are updated only when the product route decision changes.

### LCX-VLTUI-90 Validation, Evidence, And Release-Boundary Closeout

Purpose: close this execution train with deterministic evidence, browser observation, and no overclaiming.

| TUW | Status | Work | Proof |
|---|---|---|---|
| LCX-VLTUI-90.01 | implemented | Run source tests for touched API/web surfaces. | `npm --workspace apps/web run test:ui`, focused API tests, and `npm run api:test` passed. |
| LCX-VLTUI-90.02 | implemented | Run web build and desktop screen QA when desktop/web handoff changes. | Web build and desktop screen QA passed. |
| LCX-VLTUI-90.03 | implemented | Run Vault bridge acceptance proof. | MV-LINK-style acceptance receipt with status, lookup, permission negative, replay, config, and sanitized outputs. |
| LCX-VLTUI-90.04 | implemented | Run browser QA for Client, Matter, Vault, People, global utilities, and profile. | `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-closeout-proof.json`. |
| LCX-VLTUI-90.05 | implemented | Run AI slop taxonomy lint for changed UI/copy files. | `sloplint --changed` exited 0 with existing weak CSS flags recorded in closeout. |
| LCX-VLTUI-90.06 | implemented | Run release-boundary validators. | No public release, no go-live, no owner approval claim. |
| LCX-VLTUI-90.07 | implemented | Publish final LazyCodex closeout receipt. | `docs/lazycodex/lcx-vault-app-current-ui-implementation-closeout-2026-06-29.md`. |

Done criteria:

- Every visible action touched by this train has final classification: `PASS`, `GUARDED`, `UI_ONLY`, `DESCRIPTOR_ONLY`, `BLOCKED`, or `FAIL`.
- All `PASS` write actions have API, permission, audit, and read-back/reload evidence.
- External/provider rows are not promoted without receipts.
- Production/go-live/public-release/owner-approval remain false unless a separate later human approval changes the boundary.

## 8. Connected-First TUW Detail

This section strengthens the execution plan from "identify the gap" to "implement the connection." Every Matter, Client, and Vault TUW below must produce a visible connected surface plus evidence. If the real provider or owner approval is missing, the TUW still implements the route-backed blocked/configuration state rather than leaving a placeholder.

### 8.1 Connected Surface Contract

| Surface | Must connect to | Normal visible result | Blocked visible result | Evidence required |
|---|---|---|---|---|
| Client | Master data, CRM/intake, record actions, reports, billing, Vault/e-sign references | Client list/detail/right panel and section routes show real records, actions, audit, and read-back state. | `owner-blocked`, `provider-blocked`, `review-required`, or `denied` with safe reason. | API route test, UI regression marker, browser screenshot, network ledger, audit receipt. |
| Matter | Matter canonical identity, activity/calendar/channel, Matter opening/team, finance/analytics, Vault document workspace | Matter list/detail/right panel and section routes show real matter state, actions, timeline/audit, and Vault references. | Lifecycle, legal hold, provider, permission, review, or projection blocked state. | API route test, reload/read-back proof, browser screenshot, audit receipt, no denied data leakage. |
| Vault | Matter app status/lookup/projection, Vault document list/detail/search/audit/preflight | Vault top-level and Matter document panel consume Matter app readiness and Vault permission before mutation. | Unconfigured, projection-only, stale, denied, ethical-wall, legal-hold, or provider-blocked state. | MV-LINK receipt, status/lookup/preflight test, browser screenshot, permission negative proof, sanitized audit. |

### 8.2 Cross-Surface Data Flow

```text
Desktop/Web session
  -> Law Firm OS API principal context
  -> Client canonical record / Matter canonical record
  -> Matter app bridge status + client/matter upsert or lookup
  -> Vault projection freshness and permission decision
  -> Vault document/search/audit/preflight UI
  -> Browser QA + read-back/audit receipt
```

Hard rules:

1. Client/Matter identity writes must resolve or create canonical Matter app ids before Vault projection sync.
2. Vault document mutations must never accept free-form Matter IDs or Vault internal UUIDs from normal users.
3. Matter document publish/import/send actions must consume the same Vault/Matter app readiness result as top-level Vault.
4. A UI affordance must be clickable in browser QA unless it is intentionally disabled; disabled controls need an observable reason and route-backed status source.

### 8.3 LCX-VLTUI-00 Detailed Plan

| TUW | Implementation details | Exit proof |
|---|---|---|
| LCX-VLTUI-00.01 | Snapshot the exact latest release, local branch, dirty tree, and Lazyweb/current-UI evidence. Include the current release tag and commit in the receipt. | Receipt JSON includes release URL, tag, commit, branch, dirty files, and current screen evidence path. |
| LCX-VLTUI-00.02 | Create a cross-repo register that maps each implementation file to the Law Firm OS or Vault app source of truth. Include `ClientsSurface`, `MattersSurface`, `VaultSurface`, `MatterVaultPanel`, `apiClient`, bridge routes, and Vault contract docs. | Register parses as JSON and contains no token, credential, raw document path, or customer document content. |
| LCX-VLTUI-00.03 | Generate a gap ledger with one row per Client/Matter/Vault section and one connection state per row: `route-mounted`, `needs-api`, `needs-ui`, `needs-vault-bridge`, `provider-blocked`, `owner-blocked`, or `retire-decision`. | Ledger count matches source: Client planned 6, Matter planned 17, Vault write-preflight families present. |
| LCX-VLTUI-00.04 | Freeze non-claim boundaries before implementation begins and add this file to the evidence index only as planning. | No-public-release/no-go-live validator passes; plan says `production_ready=false`. |

### 8.4 LCX-VLTUI-01 Detailed Plan - Vault App Bridge

| TUW | Implementation details | Exit proof |
|---|---|---|
| LCX-VLTUI-01.01 | Add `fetchVaultBridgeStatus` and typed status normalization to `apiClient.js`; expose configured/runtime/freshness/source mode without secret material. Wire existing `/api/matters/vault-bridge/status`. | Unit or UI regression verifies helper name and safe fields; denied/missing token does not produce ready state. |
| LCX-VLTUI-01.02 | Add a bridge contract fixture for Vault `/v1/integrations/matter-app/status`: unconfigured, projection-only, stale, denied, ready. Map it to the Law Firm OS status model. | Fixture parse test plus contract table in the receipt; `vault_projection_only` is labeled dev/test unless an ADR overrides. |
| LCX-VLTUI-01.03 | Add negative tests for absent bearer token, wrong token, missing base URL, stale source timestamp, and projection mismatch. | Each negative returns `blocked` or `unconfigured`; no write-capable state is exposed. |
| LCX-VLTUI-01.04 | Drive synthetic client and matter upsert through `/clients/upsert` and `/matters/upsert`, requiring idempotency key, canonical client id, matter code, source revision, and audit ref. | First run creates/reuses; replay creates zero duplicates; response contains only reference-safe ids and revision. |
| LCX-VLTUI-01.05 | Sync or simulate Vault projection after canonical Matter app response, checking `matterAppMatterId`, `clientId`, `matterCode`, `sourceRevision`, and `sourceUpdatedAt`. | Mismatch, stale, missing revision, and duplicate Matter Code block before document UI can mark ready. |
| LCX-VLTUI-01.06 | Produce an MV-LINK receipt ladder for this train: baseline counts, authenticated status, lookup positive, permission negative, replay/idempotency, runtime config, sanitized release receipt. | Receipt references `MV-LINK-017~024` style checks and records `documents=0/file_objects=0` unless a later document TUW explicitly opens writes. |

### 8.5 LCX-VLTUI-02 Detailed Plan - Vault UI Connection

| TUW | Implementation details | Exit proof |
|---|---|---|
| LCX-VLTUI-02.01 | Implemented: top-level Vault connection panel in `VaultSurface` consumes `fetchVaultBridgeStatus`, shows source mode, guarded reason, request id, and write boundary without passing a bridge token from UI. | `npm run lcx:vltui:vault-status:proof` writes JSON/Markdown proof plus screenshots for ready, unconfigured, stale, projection-only, and claim-boundary blocked states. |
| LCX-VLTUI-02.02 | Implemented: added Law-side `GET /api/matters/vault-bridge/matter-lookup`, `fetchVaultMatterLookup`, and a top-level Vault Matter picker that carries only safe selected refs. | API test covers missing bearer, UUID rejection, and positive synthetic lookup; `npm run lcx:vltui:matter-picker:proof` covers positive selection, guarded lookup, and UUID local block. |
| LCX-VLTUI-02.03 | Implemented: added Law-side `POST /api/matters/vault-bridge/upload-preflight`, `fetchVaultUploadPreflight`, and a top-level Vault upload-preflight panel gated by selected Matter, Matter app source readiness, repository durability, permission allow, ethical-wall clear, and lifecycle eligibility. | API test covers missing bearer, projection-only source block, and positive synthetic reference-only preflight; `npm run lcx:vltui:upload-preflight:proof` covers passed, source-blocked, and guarded states with `vault_document_write_enabled=false`. |
| LCX-VLTUI-02.04 | implemented: add version-upload and metadata-mutation preflight states using the same selected matter/preflight decision. | Version/metadata controls are disabled with status; no fake storage mutation. |
| LCX-VLTUI-02.05 | implemented: add legal hold, retention, and document-action boundary cards with source ownership labels: Matter app, Vault Records, or owner decision needed. | Legal hold/retention blocked states are visible and cannot be promoted without policy route proof. |
| LCX-VLTUI-02.06 | implemented: extend browser QA to drive Vault connection panel, lookup, preflight, version/metadata blocked states, and denied state. | Network ledger includes expected endpoints, zero unexpected writes, and screenshot paths in LazyCodex evidence. |

### 8.6 LCX-VLTUI-03 Detailed Plan - Matter Document Workspace

| TUW | Implementation details | Exit proof |
|---|---|---|
| LCX-VLTUI-03.01 | Reconcile `MatterVaultPanel` builder/template helpers with Vault readiness. Template, draft, approval, publish, and email states must consume selected matter/projection status. | Template and draft fixtures expose metadata only; no document body or raw source text appears in UI/evidence. |
| LCX-VLTUI-03.02 | Gate `Vault에 게시` behind approved draft, source freshness, Vault permission, lifecycle eligibility, and audit actor. Publish creates a safe envelope first. | Approved synthetic publish returns a reference envelope and audit event; storage write is not claimed without Vault receipt. |
| LCX-VLTUI-03.03 | Implement Matter document connect/import panel with job, source, mapping, dry-run, rollback/error-report and blocked execute states. | Dry-run mutates nothing; execute stays owner/provider-blocked unless safe fixture isolation and rollback proof exist. |
| LCX-VLTUI-03.04 | Keep email composer send provider-blocked until Outlook/Graph receipt exists, but make draft create/patch route-backed. | Draft save/read-back passes; send attempt returns expected provider-blocked state and audit/log reason. |
| LCX-VLTUI-03.05 | Add browser/action QA for every document workspace mutation candidate. | Each candidate has final status and either read-back/audit proof or explicit blocked proof. |

### 8.7 LCX-VLTUI-04 Detailed Plan - Session And Principal Bridge

| TUW | Implementation details | Exit proof |
|---|---|---|
| LCX-VLTUI-04.01 | Implemented: desktop handoff stores `lawos.session.envelope` with tenant refs, actor ref, roles/scopes, review state, expiry, and source only. Do not include passwords, reset tokens, bearer tokens, or raw cookies. | `docs/lazycodex/lcx-vltui-04-session-principal-receipt-2026-06-29.json` and browser proof confirm no secret material is printed or placed into permission headers. |
| LCX-VLTUI-04.02 | Implemented: `apiClient.js` derives Client/Matter/Vault permission context principals from the session envelope when present, with synthetic fallback retained for local test mode. | UI/browser proof covers allow, review, and denied states; runtime receipt distinguishes session-derived context from synthetic fallback. |
| LCX-VLTUI-04.03 | Implemented: `/api/profile/me`, `fetchUserProfile`, and `UserProfileSurface` render loading, populated, empty, denied, review, and error states. Help/contract/account buttons route to existing product surfaces. | `docs/lazycodex/lcx-vltui-04-profile-audit-receipt-2026-06-29.json` and browser QA confirm no dead-local profile action remains. |
| LCX-VLTUI-04.04 | Implemented: session actor refs propagate to Client CRM, Matter builder, and Vault upload-preflight write candidates with audit hints. | Browser proof shows safe actor ref, tenant ref, permission ref, audit hint, and idempotency key where applicable. |

### 8.8 LCX-VLTUI-05 Detailed Plan - Client Connection

| TUW | Implementation details | Exit proof |
|---|---|---|
| LCX-VLTUI-05.01 | Implement `client-activities` with GET/POST/PATCH activity routes, activity type policy, timeline append, and Client right-panel summary. | Create/update/read-back/audit proof; denied/review hides protected details. |
| LCX-VLTUI-05.02 | Implement `client-contracts` with proposal/contract draft metadata, approval state, Vault document references, and e-sign provider status. | Draft and approval metadata route-backed; e-sign send is provider-blocked until receipt. |
| LCX-VLTUI-05.03 | Implement `client-relationships` with canonical relation list, duplicate/merge proposal state, and no automatic merge. | Merge proposal read/create route-backed; execution requires owner approval and rollback metadata. |
| LCX-VLTUI-05.04 | Implement `client-conflict` with conflict search, review queue, clearance/block decision, and Matter handoff state. | Clearance write is audited; conflict hits are permission-scoped and leak no denied party labels. |
| LCX-VLTUI-05.05 | Implement `client-billing` with AR aging, invoice/payment status, collections queue, and provider-blocked payment/send actions. | Billing reads are route-backed; external payment/invoice delivery remains provider-blocked. |
| LCX-VLTUI-05.06 | Implement `client-settings` with policy registry, field/action allowlist, ownership rules, and audit feed. | Settings writes require admin/owner scope and appear in audit feed. |
| LCX-VLTUI-05.07 | Update Client ledger, tests, and browser QA so planned section count is zero or residual rows are explicitly blocked. | `ClientsSurface` no longer renders generic "메뉴를 준비 중입니다" for connected rows. |

### 8.9 LCX-VLTUI-06 Detailed Plan - Matter Connection

| TUW | Implementation details | Exit proof |
|---|---|---|
| LCX-VLTUI-06.01 | Implement closeout/archive lifecycle routes with legal hold, retention, Vault mutation block, and reopen/review state. | Closed/archived synthetic matter blocks upload/version/metadata actions and records audit. |
| LCX-VLTUI-06.02 | Implement tasks/notes as Matter activity subtypes with composer, status, assignment, due date, and timeline append. | Create/update/read-back/audit proof; denied/review states hide protected text. |
| LCX-VLTUI-06.03 | Implement evidence/templates as Vault-backed document workspace shortcuts, reusing LCX-VLTUI-02/03 status and preflight. | Evidence/template routes show real Vault readiness; blocked states match top-level Vault. |
| LCX-VLTUI-06.04 | Implement seal/signature, approvals, and client requests as route-backed approval/request flows with provider/owner blocked exits. | Approval request and status read work; seal/e-sign send is provider-blocked unless receipt exists. |
| LCX-VLTUI-06.05 | Implement meetings/announcements with calendar/channel routes, internal log, and external provider status. | Internal meeting/announcement draft read-back passes; Outlook/Teams/Slack send blocked without receipt. |
| LCX-VLTUI-06.06 | Implement expenses/billing write candidates with time/WIP/expense records, safe totals, and external payment/invoice boundary. | Internal write/read-back/audit proof; external delivery blocked. |
| LCX-VLTUI-06.07 | Implement Matter search/risk panels using permission-scoped Vault search, audit, risk flags, and safe snippets. | Search returns no denied labels/counts/snippets; risk actions are audited or blocked. |
| LCX-VLTUI-06.08 | Implement Matter integrations/settings with provider registry, connection status, disable request, and no credentials. | Connect/disable states are route-backed; credentials never appear in UI/evidence. |
| LCX-VLTUI-06.09 | Implement Matter import lifecycle: job, source, mapping, validation, dry-run, guarded execute, rollback, error report. | Dry-run proves no mutation; execute only with safe fixture isolation and rollback proof. |
| LCX-VLTUI-06.10 | Replace manual Matter opening/team ID entry with selected Client/opportunity/intake and HRX member pickers. | Normal user path never requires tenant/client/matter/member ID paste; team roster has read-back. |
| LCX-VLTUI-06.11 | Update Matter ledger, tests, and browser QA so planned section count is zero or residual rows are explicitly blocked. | `MattersSurface` no longer renders generic planned placeholder for connected rows. |

### 8.10 LCX-VLTUI-90 Connected Closeout Detail

| TUW | Implementation details | Exit proof |
|---|---|---|
| LCX-VLTUI-90.01 | Implemented: source tests ran for touched API/web surfaces plus full API workspace. | PASS: web UI 17/17, focused API 19/19, API workspace 202/202. |
| LCX-VLTUI-90.02 | Implemented: web build and desktop screen QA ran after desktop/web handoff changes. | PASS: web build with existing Vite chunk warning; desktop screen QA receipt attached. |
| LCX-VLTUI-90.03 | Implemented: Vault bridge acceptance proof remains bound to MV-LINK ladder. | PASS: status, lookup, permission negative, replay, config, and sanitized output present. |
| LCX-VLTUI-90.04 | Implemented: browser drove Client -> Matter, Matter -> Vault, Vault -> Matter, People/Profile/Global. | PASS: screenshots, network ledger, console ledger, and write-boundary proof attached. |
| LCX-VLTUI-90.05 | Implemented: AI slop taxonomy lint ran for changed UI/copy files. | PASS exit 0 with existing weak stylesheet flags listed in closeout. |
| LCX-VLTUI-90.06 | Implemented: release-boundary validators and true-claim grep ran. | PASS: no public release, production go-live, or owner approval claim. |
| LCX-VLTUI-90.07 | Implemented: final closeout receipt published. | `docs/lazycodex/lcx-vault-app-current-ui-implementation-closeout-2026-06-29.md`. |

## 9. Suggested First Execution Slice

Start with this order:

1. LCX-VLTUI-00.01 through LCX-VLTUI-00.04: freeze baseline and gap ledger.
2. LCX-VLTUI-01.01 through LCX-VLTUI-01.06: bridge status/auth/projection/MV-LINK acceptance. Completed locally by `docs/lazycodex/lcx-vltui-01-vault-bridge-contract-receipt-2026-06-29.json`; UI mount remains LCX-VLTUI-02.
3. LCX-VLTUI-02.01: Vault top-level connected status panel. Completed locally by `docs/lazycodex/lcx-vltui-02-vault-status-panel-receipt-2026-06-29.json`.
4. LCX-VLTUI-02.02: Vault Matter Code picker/deep-link bridge state. Completed locally by `docs/lazycodex/lcx-vltui-02-matter-picker-receipt-2026-06-29.json`.
5. LCX-VLTUI-02.03: Vault upload-preflight UI. Completed locally by `docs/lazycodex/lcx-vltui-02-upload-preflight-receipt-2026-06-29.json`.
6. LCX-VLTUI-03.01 through LCX-VLTUI-03.05: Matter document workspace and Vault publication boundaries. Completed locally by `docs/lazycodex/lcx-vltui-03-document-workspace-receipt-2026-06-29.json`.
7. LCX-VLTUI-04.01 through LCX-VLTUI-04.02: session/principal envelope and Client/Matter/Vault permission headers. Completed locally by `docs/lazycodex/lcx-vltui-04-session-principal-receipt-2026-06-29.json`.
8. LCX-VLTUI-04.03 through LCX-VLTUI-04.04: profile route states and audit actor propagation proof. Completed locally by `docs/lazycodex/lcx-vltui-04-profile-audit-receipt-2026-06-29.json`.
9. LCX-VLTUI-05.01 through LCX-VLTUI-05.07: Client planned-section implementation. Completed locally by `docs/lazycodex/lcx-vltui-05-client-sections-receipt-2026-06-29.json`.
10. LCX-VLTUI-06.01 through LCX-VLTUI-06.11: Matter planned-section implementation. Completed locally by `docs/lazycodex/lcx-vltui-06-matter-sections-receipt-2026-06-29.json`.
11. LCX-VLTUI-90.01 through LCX-VLTUI-90.07: closeout completed locally by `docs/lazycodex/lcx-vault-app-current-ui-implementation-closeout-2026-06-29.md`.

Do not start Client/Matter/People/global utility expansion before the bridge and session-principal gates are stable, unless the TUW is read-only or explicitly blocked-state UI.

## 10. Open Decisions

| Decision | Owner | Blocks |
|---|---|---|
| Production Matter app API base URL and authentication method for a real connected run. Direct API is the default implementation path; event projection remains adapter-capable; projection-only remains dev/test fallback. | System Admin | Any production-connected Vault app state |
| Whether Vault app or Law Firm OS owns matter-level legal hold display in current UI. | Product/Legal Ops | LCX-VLTUI-02.05, LCX-VLTUI-06.01 |
| Whether Finance/Analytics/Ask/Portal/Ops/Readiness become standalone surfaces or stay folded into four axes. | Product Owner | LCX-VLTUI-09 |
| Whether payroll execution is in scope for this train. | Owner/Finance/HR | LCX-VLTUI-07.05 |

## 11. Non-Goals

- No customer document import or OneDrive cutover.
- No direct Vault database insert treated as canonical Matter app write.
- No raw customer document, OCR, prompt, model response, token, cookie, credential, or production dump in repo evidence.
- No App Store, Microsoft Store, public release, production go-live, or owner final approval claim.
- No broad redesign of the product shell beyond what the implementation TUW requires.

## 12. Kickoff Artifacts

LCX-VLTUI-00 was opened under a goal-backed execution run on 2026-06-29. The first slice creates implementation rails for every later TUW:

- `docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json`
- `docs/lazycodex/lcx-vault-app-current-ui-source-register-2026-06-29.json`
- `docs/lazycodex/lcx-vault-app-current-ui-gap-ledger-2026-06-29.json`
- `docs/lazycodex/lcx-vault-app-current-ui-claim-boundary-2026-06-29.json`
