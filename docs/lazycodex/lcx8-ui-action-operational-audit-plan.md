# LazyCodex LCX8 UI Action Operational Audit Plan

Date: 2026-06-25
Status: planned
Scope: `apps/web`, `apps/api`, `apps/desktop`
Product name: `matter`

## Goal

Prove which visible UI buttons, links, menus, and feature controls are actually
operational, and classify every visible action into a clear release boundary:

1. `PASS` - action works through UI, API/domain path, permission boundary,
   audit/persistence where required, and reload or read-back proof.
2. `GUARDED` - action is correctly blocked by permission, review, step-up,
   tenant, legal hold, ethical wall, or unavailable runtime state.
3. `UI_ONLY` - action only navigates, opens a panel, or changes local UI state.
4. `DESCRIPTOR_ONLY` - repo has descriptor/planning evidence but no write
   runtime proof.
5. `BLOCKED` - action cannot be tested because a required runtime, secret,
   external receipt, owner approval, or data store is absent.
6. `FAIL` - action is visible but broken, no-op, miswired, unsafe, unaudited,
   or falsely implies operational readiness.

The audit must not turn local QA into a production go-live claim. It creates
evidence and a remediation backlog only.

## Lazyweb Reference Input

Lazyweb query used for this planning pass:

- Query: `enterprise SaaS dashboard action toolbar audit log`
- Platform: `desktop`
- Useful patterns observed: SaaS management dashboards, audit-ready access
  screens, activity/audit trail pages, admin/control-panel navigation.

Planning implication:

- Do not judge a button by visual presence only.
- Treat action lifecycle state, audit log visibility, permission outcomes,
  retry/error behavior, and read-back proof as first-class evidence.
- Prefer compact operation ledgers and activity surfaces over promotional UI
  claims.

## Existing Repo Inputs

- `docs/lazycodex/lcx-execution-plan.md`
- `docs/lazycodex/evidence/matter-web/index.md`
- `docs/lazycodex/evidence/matter-web/LCX-WEB-07-verification-closeout.md`
- `docs/lazycodex/evidence/matter-web/artifacts/runtime-flow-verification.json`
- `docs/lazycodex/evidence/matter-web/artifacts/live-data-verification.json`
- `scripts/verify-matter-ui-flows.mjs`
- `scripts/verify-matter-live-data.mjs`
- `scripts/run-web-e2e.mjs`
- `scripts/validate-hrx-ui-api-backed.mjs`
- `apps/web/test/ui-regression.test.mjs`
- `apps/web/e2e/matter-vault.spec.ts`
- `apps/web/e2e/hrx/*.spec.ts`
- `apps/api/test/e2e/*.test.js`
- `apps/desktop/test/*.test.mjs`

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- real client data migration: false
- external integration receipt completion: false
- full payroll, payment, e-signature, or banking execution: false unless
  separately proven by runtime and external receipts

## Action Ledger Schema

Each visible action gets one ledger row.

```json
{
  "id": "LCX8-ACTION-0001",
  "surface": "home",
  "route": "/?locale=ko&view=home&data=live&ctx=allow",
  "section": "topbar",
  "label": "New Matter",
  "selector": "[data-action='create-matter']",
  "action_type": "button",
  "expected_user_outcome": "navigates to matter opening surface",
  "source_file": "apps/web/src/App.jsx",
  "handler": "Topbar.onCreate -> navigateToView('matters', 'matter-opening')",
  "api_route": null,
  "domain_runtime": null,
  "permission_boundary": "none for navigation",
  "audit_boundary": "not required for local navigation",
  "persistence_boundary": "not required for local navigation",
  "evidence": [],
  "status": "UI_ONLY",
  "notes": "Navigation only; not proof that matter creation writes are complete."
}
```

Required fields:

| Field | Requirement |
| --- | --- |
| `surface` | Product axis or screen: home, clients, matters, people, vault, auth, profile, desktop. |
| `route` | Exact URL or desktop entrypoint used during QA. |
| `label` | User-visible label in Korean or English. |
| `selector` | Stable selector or generated DOM path. |
| `handler` | React handler, route callback, form submit, IPC bridge, or none. |
| `api_route` | Exact API route called, or null. |
| `permission_boundary` | Required role/scope/tenant/step-up/denied path. |
| `audit_boundary` | Whether an audit event must be written or explicitly not required. |
| `persistence_boundary` | Write/read-back/reload requirement, or not required. |
| `status` | One of PASS, GUARDED, UI_ONLY, DESCRIPTOR_ONLY, BLOCKED, FAIL. |

## Planned Artifacts

Primary plan:

- `docs/lazycodex/lcx8-ui-action-operational-audit-plan.md`
- `docs/lazycodex/lcx8-ui-action-operational-audit-tuw-plan.md`

Execution evidence to create during the audit:

- `docs/lazycodex/evidence/matter-web/LCX-WEB-08-ui-action-operational-audit.md`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-inventory.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-ledger.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-ledger.csv`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-run.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx8-api-response-ledger.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx8-remediation-backlog.md`

Optional scripts, only if the audit cannot be done cleanly with existing tools:

- `scripts/generate-lcx8-ui-action-inventory.mjs`
- `scripts/verify-lcx8-ui-action-operability.mjs`
- `scripts/validate-lcx8-ui-action-ledger.mjs`

Ponytail rule:

- Reuse existing Playwright, Node test, API client, and validator patterns first.
- Add scripts only when existing `ui:flows:verify`, `ui:live:verify`,
  `web:e2e`, and app tests cannot produce the ledger.

## Phase Plan

### LCX8-P0 - Baseline Freeze

Objective:
Capture the exact repo/runtime baseline before the action audit.

Work:

1. Record branch, SHA, `git status --short`, Node/npm versions.
2. Confirm existing LCX-WEB evidence status.
3. Run baseline non-browser validators.
4. Start no remediation during this phase.

Commands:

```bash
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
npm --workspace apps/web run test:ui
npm run hrx:ui:validate
npm run api:test
```

Acceptance:

- Baseline evidence is recorded.
- Any pre-existing failures are named before action QA begins.

### LCX8-P1 - Visible Action Inventory

Objective:
Inventory every visible clickable/control element on canonical product routes.

Routes:

| Surface | Routes |
| --- | --- |
| Auth | `/?locale=ko&view=auth&authStep=login` |
| Home | `/?locale=ko&view=home&desktop=1&data=live&ctx=allow` |
| Clients | `/?locale=ko&view=clients&data=live&ctx=allow`, `#client-intake`, `#client-data`, `#client-reports` |
| Matters | `/?locale=ko&view=matters&data=live&ctx=allow`, `#matter-opening`, `#matter-import` |
| People | `/?locale=ko&view=people&data=live&ctx=allow`, all sidebar sections |
| Vault | `/?locale=ko&view=vault&data=live&ctx=allow` |
| Profile | `/?locale=ko&view=profile&data=live&ctx=allow` |
| Guarded states | representative `ctx=denied` and `ctx=review` routes |

Inventory selector scope:

- `button`
- `a[href]`
- `[role='button']`
- `input[type='submit']`
- `select`
- menu items
- toggles
- file upload triggers
- desktop bridge triggers

Acceptance:

- Every visible action has a ledger row.
- Disabled actions are included and classified.
- No row is left without selector, label, route, and initial classification.

### LCX8-P2 - Source and Handler Trace

Objective:
Trace each UI action to a real local handler and API/runtime path.

Work:

1. Map topbar/sidebar/global actions from `App.jsx`, `Shell.jsx`, and `nav.js`.
2. Map Client/Matter/Vault actions to CMP and vault API clients/routes.
3. Map People/HRX actions to `hrxApiClient.ts` and HRX API routes.
4. Map desktop actions to preload, IPC, file bridge, deep link, and session
   handlers.
5. Mark no-op, placeholder, descriptor-only, and local-only paths explicitly.

Acceptance:

- Every action has a trace depth:
  - `ui_state_only`
  - `route_navigation`
  - `api_read`
  - `api_write`
  - `native_bridge`
  - `external_receipt_required`
- Any action without a handler is `FAIL` or `BLOCKED`, not guessed.

### LCX8-P3 - Browser Runtime Action QA

Objective:
Drive actions in a real browser and record observable behavior.

Work:

1. Start API and web servers.
2. Use Playwright to visit every canonical route.
3. Click or operate each action when safe.
4. Capture route changes, modals, drawers, panels, focus states, network calls,
   console errors, screenshots, and DOM state after action.
5. Run denied/review state checks for permission-sensitive actions.

Commands:

```bash
npm run api:start
npm run dev
MATTER_UI_URL=http://127.0.0.1:5173 npm run ui:flows:verify
MATTER_UI_URL=http://127.0.0.1:5173 npm run ui:live:verify
npm run web:e2e matter-vault
npm run web:e2e hrx
```

Acceptance:

- Each safe action has browser evidence.
- Each unsafe/destructive action has a documented dry-run, mock, fixture, or
  blocked-path reason.
- Any console error or unexpected 4xx/5xx is attached to the action row.

### LCX8-P4 - API, Permission, and Audit Proof

Objective:
Prove that operational actions are backed by API/domain behavior and trust
boundaries.

Work:

1. For read actions, verify API returns scoped data and fails closed.
2. For write actions, verify tenant, actor, idempotency, permission, and audit
   behavior.
3. For HRX actions, verify `x-lawos-tenant-id`, `x-lawos-actor-id`,
   `x-lawos-hrx-scopes`, and step-up handling.
4. For Matter/Vault actions, verify CMP/R4 route behavior, security trimming,
   legal-hold/ethical-wall boundaries, and audit routes.
5. Mark descriptor-only domains separately.

Commands:

```bash
npm run hrx:ui:validate
npm --workspace apps/api run test
npm run client-matter:cmp-v1:validate
npm run matter-vault:r4:readiness
```

Acceptance:

- Any `PASS` write action has API and trust-boundary proof.
- Guarded actions show expected denied/review/step-up behavior.
- Descriptor-only paths are not promoted to runtime-ready.

### LCX8-P5 - Persistence and Reload Proof

Objective:
Verify that claimed write actions survive reload/read-back when the product
expects durable behavior.

Work:

1. Use synthetic tenant/actor data only.
2. Execute a write action or fixture-safe API call.
3. Reload the UI.
4. Query the API or domain read model.
5. Verify audit/write evidence or mark the action as not durable.

Acceptance:

- Durable action rows have read-back evidence.
- Ephemeral/local UI state rows stay `UI_ONLY`.
- External persistence requirements remain `BLOCKED` until receipts exist.

### LCX8-P6 - Desktop and Native Bridge QA

Objective:
Verify desktop-only buttons and bridges separately from web UI.

Work:

1. Run desktop smoke tests.
2. Verify session handoff, file bridge, file picker gesture, deep link deny/open,
   notification route intent, and temp preview cleanup.
3. Run screen QA for visible desktop login/product surfaces.

Commands:

```bash
npm --workspace apps/desktop run test:smoke
npm --workspace apps/desktop run test:file-bridge
npm run matter-desktop:screen-qa
```

Acceptance:

- Desktop actions are not inferred from web tests.
- Native bridge actions include allow/deny evidence.
- File actions prove cleanup and no unintended data exposure.

### LCX8-P7 - Visual, Accessibility, and Copy Review

Objective:
Ensure tested actions remain visible, understandable, and not misleading.

Work:

1. Inspect screenshots for overlap, hidden controls, dead-looking buttons, and
   ambiguous disabled states.
2. Verify focus behavior for dialogs, drawers, menus, and forms.
3. Check Korean UI copy for raw IDs, internal labels, English leakage, and
   overclaimed readiness.
4. Apply the AI slop taxonomy as a negative checklist for user-facing copy.

Commands:

```bash
npm --workspace apps/web run test:ui
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

Acceptance:

- Any UI/copy change gets sloplint and visual QA.
- If no UI/copy files changed, record that sloplint was not required or ran
  with no changed UI surface.

### LCX8-P8 - Classification and Remediation Backlog

Objective:
Convert findings into clear work lanes without mixing local QA, runtime, and
launch authority.

Classification lanes:

| Lane | Meaning |
| --- | --- |
| Lane A | UI-visible but not wired; fix local handler/API connection. |
| Lane B | API exists but needs schema/runtime/security/audit completion. |
| Lane C | Descriptor-only; needs runtime implementation before UI can claim it. |
| Lane D | External receipt/owner approval/deploy evidence required. |
| Lane E | Copy/UX/a11y issue; no backend change required. |

Acceptance:

- No `FAIL` or `BLOCKED` row is left without a lane.
- High-risk actions are separated from cosmetic issues.
- Production/go-live claims remain false.

### LCX8-P9 - Closeout Gate

Objective:
Publish the final LCX8 evidence packet.

Final verification commands:

```bash
npm --workspace apps/web run test:ui
npm --workspace apps/web run build
npm run hrx:ui:validate
npm run api:test
MATTER_UI_URL=http://127.0.0.1:5173 npm run ui:flows:verify
MATTER_UI_URL=http://127.0.0.1:5173 npm run ui:live:verify
npm run web:e2e matter-vault
npm run web:e2e hrx
npm --workspace apps/desktop run test:smoke
npm --workspace apps/desktop run test:file-bridge
npm run runtime-readiness:validate
npm run launch:external-receipts:validate
npm run launch:final-go-live-decision:validate
```

Closeout evidence must include:

- exact command results
- failed/pre-existing command results
- action status counts
- critical action list
- blocked actions list
- remediation lanes
- screenshots and JSON artifacts
- explicit non-claims

## Status Count Targets

The audit can close with blockers, but not with unknowns.

| Metric | Target |
| --- | --- |
| Inventory coverage | 100% of visible actions on audited routes |
| Unclassified actions | 0 |
| Critical action unknowns | 0 |
| Unexpected 5xx responses | 0 for PASS/GUARDED actions |
| Console errors | 0 unexpected errors |
| Production go-live claim | false |
| Public release claim | false |

## Critical Action Families

These families must receive explicit classification:

1. Authentication and desktop login.
2. Topbar create/invite/search/profile/notification actions.
3. Product-axis navigation: Client, Matter, People, Vault.
4. Client intake/import/data-cloud/report actions.
5. Matter opening/import/team/workflow/closeout actions.
6. Vault document table/detail/security/action controls.
7. People directory/profile/documents/leave/approval/recruiting/lifecycle
   actions.
8. HRX policy/audit/step-up/analytics/AI/payroll boundary actions.
9. Desktop file bridge, deep links, notification intent, update/session actions.

## Decision Rules

- If an action changes only `window.history`, local component state, tabs, or a
  drawer, classify as `UI_ONLY`.
- If an action calls an API but has no persistence/read-back requirement,
  classify based on its API contract.
- If an action writes data, `PASS` requires read-back or reload proof.
- If an action requires permission denial, `PASS` requires both allowed and
  denied or review evidence when feasible.
- If an action involves sensitive HR/legal/client data, `PASS` requires
  trimming, scope, tenant, and audit evidence.
- If a feature is represented only in descriptors, docs, or package tests,
  classify as `DESCRIPTOR_ONLY`.
- If external credentials, owner approval, production deploy, or receipt intake
  is missing, classify as `BLOCKED`, not `FAIL`.

## Final Report Shape

The final LCX8 evidence file should end with:

```text
LCX8 verdict:
- local UI action audit complete: true/false
- runtime-ready candidate actions: N
- guarded actions: N
- UI-only actions: N
- descriptor-only actions: N
- blocked actions: N
- failed actions: N
- production go-live: false
- owner approval: false
- public release: false
```

## Recommended First Execution Slice

Start with the smallest slice that proves the method:

1. Inventory `home`, `matters`, `vault`, and `people#people-directory`.
2. Generate the first 25 action ledger rows.
3. Run browser QA against those rows.
4. Confirm whether the ledger schema is sufficient.
5. Only then expand to all People/HRX, Client, Profile, Auth, and Desktop
   actions.

This keeps LCX8 from becoming a vague UI review and turns it into a repeatable
operational audit.
