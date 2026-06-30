# LCX Full Implementation TUW Plan

Status: proposed
Date: 2026-06-30
Scope: latest `matter-desktop-v0.1.0-lcx-vltui-20260630` UI and current HEAD
Planning mode: LazyCodex TUW, Plan -> Do -> Check -> Act
Detailed execution backlog: `docs/lazycodex/lcx-full-implementation-tuw-traceability-2026-06-30.md`

## Goal

Open the currently guarded UI surfaces in the safest implementation order without collapsing approval, provider, preflight, audit, production, or public-release boundaries.

The target implementation flow is:

`not_configured -> configured -> preflight_passed -> approval_requested -> approved -> executed -> audited`

## Current Boundary

- Latest UI still shows implementation gates: Matter Vault write=false, Vault document actions disabled, People `setup_required` / `integration_required` / `audit_required`, global `decision-required`, and provider/owner blocked Client and Matter actions.
- Latest release manifest still denies public release, production go-live, owner approval, App Store, Microsoft Store, and Windows Authenticode claims.
- Static UI, synthetic fixture, local-only proof, and descriptor evidence may close a UI TUW, but cannot close runtime, production, or go-live readiness.

## LazyCodex Closure Rule

Every TUW closes only when these agree:

- code or repo-native mapping
- route/browser proof
- validator or test command
- evidence artifact
- allowed claim and blocked claim
- explicit residual gate

Each TUW must write evidence under `docs/lazycodex/evidence/matter-web/artifacts/` or the matching desktop release evidence folder, and must not upgrade existing `GUARDED`, `BLOCKED`, `UI_ONLY`, `provider_blocked`, or `owner_blocked` rows to `PASS` without the matching receipt.

## Execution Order

| TUW | Layer | Primary Scope | Depends On | Exit Evidence | Allowed Claim | Blocked Claim |
| --- | --- | --- | --- | --- | --- | --- |
| LCX-FULL-00 | Control | freeze current gap ledger and no-premature-claim rules | none | inventory JSON, no-claim validator, route snapshot | implementation plan accepted | implementation complete |
| LCX-FULL-01 | Core state | shared readiness, approval, connector receipt, run, audit models | 00 | schema tests and validator | local state model ready | production write ready |
| LCX-FULL-02 | UI shell | shared guarded action/status components and copy contract | 01 | UI regression, route screenshots | consistent guarded UX | writes enabled |
| LCX-FULL-03 | Approval | owner approval request/intake runtime | 01, 02 | approval API tests, audit event proof | approval request flow ready | owner approval granted |
| LCX-FULL-04 | Provider | connector receipt registry and fail-closed adapters | 01, 02 | provider negative tests, receipt validator | provider receipt model ready | provider connected |
| LCX-FULL-05 | Runs | dry-run/preflight/execute orchestration kernel | 01, 03, 04 | run lifecycle tests, idempotency proof | guarded run lifecycle ready | external mutation ready |
| LCX-FULL-06 | Matter Vault | document workspace preflight, publish request, import dry-run, email draft | 05 | Matter Vault browser proof | request/dry-run paths ready | Vault write or email send complete |
| LCX-FULL-07 | Vault Docs | version, metadata, legal hold, retention, document action gates | 05, 06 | Vault action-boundary proof | action gates executable to request state | document mutation complete |
| LCX-FULL-08 | Matter Import | Matter import staged execute after dry-run and owner approval | 05 | import execute tests and rollback proof | approved synthetic execute ready | production import complete |
| LCX-FULL-09 | Client Import | Client import staged execute after dry-run and owner approval | 05 | client import proof and raw-row-hidden proof | approved synthetic execute ready | production client import complete |
| LCX-FULL-10 | Client Data | enrichment consent, provider receipt, identity candidates, segment activation | 04, 05 | provider-blocked/approved branch tests | governed enrichment workflow ready | provider enrichment live |
| LCX-FULL-11 | Contracts | proposal/contract draft and e-sign provider handoff | 04, 05 | e-sign provider receipt proof | e-sign request package ready | signed contract sent |
| LCX-FULL-12 | Billing | invoice/payment/tax-invoice provider boundaries | 04, 05 | billing provider negative tests | billing handoff ready | payment or tax invoice issued |
| LCX-FULL-13 | Matter Comms | email/message channel provider workflow | 04, 05 | channel provider proof | draft/send request ready | external email/message sent |
| LCX-FULL-14 | People Setup A | roles, work profile, schedules, time, leave configured state | 01, 02 | People catalog count moves by tested rows | core People setup ready | HRIS runtime complete |
| LCX-FULL-15 | People Governance | approvals, admin permission, field policy, audit states | 03, 05, 14 | authz/audit negative tests | People governance guarded | payroll/discipline decisions final |
| LCX-FULL-16 | People Integrations | e-contract, payroll, messages, company integrations provider gates | 04, 14, 15 | integration receipt proof | integration request flow ready | provider integrations live |
| LCX-FULL-17 | Global Decisions | calendar, finance, data-import, policies top-level decision center | 03, 14 | global decision/audit proof | owner decision packet ready | top-level routes permanently promoted |
| LCX-FULL-18 | Audit/Export | unified audit ledger, receipt export, reconciliation dashboard | 03-17 | audit completeness validator | audit trail reviewable | compliance certification |
| LCX-FULL-19 | Desktop Runtime | desktop env preflight, production smoke preflight, release manifest guard | 06-18 | desktop/runtime smoke proof | supervised pilot candidate | production go-live |
| LCX-FULL-20 | Release Decision | owner go/no-go packet and residual-risk closeout | 19 | owner decision intake package | human review ready | public release without owner receipt |

## Detailed TUWs

### LCX-FULL-00 - Current Gap Freeze And Claim Guard

Plan:
- Freeze the latest UI gap truth before implementation begins.
- Add or update a validator that fails if docs claim production go-live, public release, provider write, or owner approval before evidence exists.

Do:
- Generate `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-00-current-gap-inventory.json`.
- Include route observations for `?view=matters#matter-vault`, `?view=vault#vault-documents`, People setup routes, Client provider routes, and global decision routes.

Check:
- `npm --workspace apps/web run test:ui`
- `npm run lcx:vltui:closeout:validate`
- `npm run lcx:vltui:action-boundaries:validate`
- new `npm run lcx:full:no-premature-claim:validate`

Act:
- If any current blocker is missing from the inventory, stop and fix the inventory before implementing later TUWs.

### LCX-FULL-01 - Shared Readiness And Receipt Model

Plan:
- Create the common objects every later surface consumes.

Do:
- Add repo-native models or API projections for `feature_readiness`, `approval_requests`, `connector_receipts`, `execution_runs`, `audit_events`, `field_policy_rules`, and `document_policy_rules`.
- Preserve separate states for not configured, configured, preflight passed, approval requested, approved, provider blocked, executed, audited, denied, and expired.

Check:
- Unit tests for state transitions.
- Negative tests for skipping approval or provider receipt.
- new `npm run lcx:full:state-model:validate`

Act:
- No UI surface may enable writes from this TUW alone.

### LCX-FULL-02 - Shared Guarded UI Components

Plan:
- Replace one-off blocked strips with a shared guarded action/status pattern while preserving current visual density.

Do:
- Build shared components for readiness badges, action preflight rows, approval request rows, provider receipt rows, audit receipt rows, and disabled action buttons.
- Keep Korean SaaS copy concrete: `설정 필요`, `연동 필요`, `승인 대기`, `사전검사 필요`, `감사 필요`, `제공자 receipt 필요`.

Check:
- `npm --workspace apps/web run test:ui`
- Playwright screenshots for current blocked routes.
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`

Act:
- Component adoption must not change any current `write-enabled=false` or provider/owner state.

### LCX-FULL-03 - Owner Approval Request Runtime

Plan:
- Implement approval request lifecycle before any real execute path.

Do:
- API: create, read, approve, reject, expire approval requests.
- UI: request approval, show required fields, show audit note, show pending decision.
- Audit: every transition records actor, tenant, object, reason, and immutable decision ref.

Check:
- API tests for approve/reject/expire.
- UI route proof for Client owner bulk change, Matter owner bulk change, import execute request, legal hold request.
- new `npm run lcx:full:approval:validate`

Act:
- Agent-generated approval is invalid; only human/owner receipt can move to `approved`.

### LCX-FULL-04 - Provider Receipt Registry

Plan:
- Give provider-blocked surfaces a real receipt model before connecting providers.

Do:
- Registry stores provider id, environment, scopes, consent basis, receipt ref, expiry, revocation state, last preflight, and allowed operations.
- Adapters fail closed when receipt is missing, expired, scope-mismatched, or non-production for a production target.

Check:
- Negative tests for missing/expired/wrong-scope receipts.
- Browser proof for Client billing, e-sign, data enrichment, Matter channel, email send.
- new `npm run lcx:full:provider-receipts:validate`

Act:
- This TUW may turn `provider-blocked` into `provider-configured` only for sandbox/synthetic receipts clearly labelled as such.

### LCX-FULL-05 - Run Lifecycle Kernel

Plan:
- Centralize dry-run, preflight, execute, rollback, and audit run behavior.

Do:
- Add idempotency keys, run refs, input snapshot hashes, safe result projections, rollback/error report refs, and retry policy.
- Enforce transition order: configured before preflight, preflight before approval, approval/provider receipt before execute.

Check:
- Transition tests.
- Duplicate execution tests.
- Raw-row/raw-provider-token hidden tests.
- new `npm run lcx:full:runs:validate`

Act:
- Later import/Vault/data/billing TUWs must use this kernel rather than bespoke execute logic.

### LCX-FULL-06 - Matter Vault Workspace

Plan:
- Move Matter Vault from static blocked rows to executable preflight/request states.

Do:
- Connect document workspace preflight to the run kernel.
- Allow publish request creation after draft and preflight, but keep actual Vault write behind owner/provider/storage policy.
- Allow import dry-run, not execute, until LCX-FULL-08/07 gates apply.
- Allow email draft packaging, not send, until provider receipt exists.

Check:
- `npm run lcx:vltui:matter-document-workspace:proof`
- `npm run lcx:vltui:matter-document-workspace:validate`
- Playwright route `?view=matters#matter-vault`

Act:
- Exit state may be `approval_requested`; it must not be `published`.

### LCX-FULL-07 - Vault Document Action Gates

Plan:
- Open Vault document actions as guarded requests, not direct mutations.

Do:
- Version upload: preflight package and approval request.
- Metadata mutation: allowed-field policy, approval request, audit.
- Legal hold: owner decision required.
- Retention: records policy required.
- Document action: policy-checked request only.

Check:
- `npm run lcx:vltui:upload-preflight:proof`
- `npm run lcx:vltui:action-boundaries:validate`
- new `npm run lcx:full:vault-doc-actions:validate`

Act:
- If storage/provider policy is absent, action remains request-only and `write-enabled=false`.

### LCX-FULL-08 - Matter Import Execute

Plan:
- Implement Matter import execute after existing dry-run and owner approval.

Do:
- Use safe source staging, field mapping allowlist, dry-run, approval request, execute run, rollback/error report.
- Do not expose raw source rows.

Check:
- Browser proof for `?view=matters#matter-import`.
- Tests for denied fields, duplicate run, rollback report.
- new `npm run lcx:full:matter-import:validate`

Act:
- Production import remains blocked unless production runtime target and owner receipt are present.

### LCX-FULL-09 - Client Import Execute

Plan:
- Mirror Matter import safeguards for Client account/contact/opportunity import.

Do:
- Stage source, map fields, validate, request owner approval, execute synthetic/local approved run, produce rollback/error report.

Check:
- Browser proof for `?view=clients#client-import`.
- Tests for raw-row-hidden and field allowlist.
- new `npm run lcx:full:client-import:validate`

Act:
- Do not reuse Matter-specific field policy for Client objects without an explicit Client policy.

### LCX-FULL-10 - Client Data Enrichment

Plan:
- Open enrichment only through consent and provider receipt gates.

Do:
- Model consent coverage, provider receipt, enrichment job, identity candidates, and segment activation rollback.
- Keep automatic merge disabled.

Check:
- Browser proof for `?view=clients#client-data`.
- Tests for missing consent, missing provider, raw provider field redaction, identity candidate review.
- new `npm run lcx:full:client-data:validate`

Act:
- Segment activation cannot execute without provider receipt and rollback plan.

### LCX-FULL-11 - Client Contracts And E-Sign

Plan:
- Connect contract draft and e-sign handoff without sending signatures prematurely.

Do:
- Draft package, signer roles, Vault document reference, provider receipt preflight, send request, audit.

Check:
- Browser proof for `?view=clients#client-contracts`.
- Tests for missing provider receipt and missing signer fields.
- new `npm run lcx:full:contracts-esign:validate`

Act:
- Exit state may be `ready_to_send_request`; not `sent`.

### LCX-FULL-12 - Billing, Payments, And Tax Invoice Providers

Plan:
- Keep financial external writes provider-gated.

Do:
- Invoice/payment/tax-invoice request models, provider receipt preflight, owner approval for external issue/send, reconciliation refs.

Check:
- Browser proof for `?view=clients#client-billing` and `?view=matters#matter-expenses`.
- Tests for missing tax/payment provider and wrong environment.
- new `npm run lcx:full:billing-provider:validate`

Act:
- No money movement, tax invoice issue, or payment send without real provider receipt and owner receipt.

### LCX-FULL-13 - Matter Communication Provider Workflow

Plan:
- Turn provider-blocked Matter email/message channels into draft/request flows.

Do:
- Draft, recipient policy, attachment/Vault reference policy, provider receipt preflight, send approval request, audit.

Check:
- Browser proof for Matter communication and Matter Vault email draft.
- Tests for recipient policy, missing provider, raw attachment path hidden.
- new `npm run lcx:full:matter-comms:validate`

Act:
- Exit state may be `send_requested`; not externally sent.

### LCX-FULL-14 - People Setup Tranche A

Plan:
- Reduce highest-value `setup_required` People rows by implementing configuration flows.

Do:
- Implement configured state for role, work profile, work schedule, external schedule, work type, current work status, leave rules, and basic time records.
- Recompute People catalog counts from live readiness, not hard-coded state only.

Check:
- `npm run hrx:ui:validate`
- `npm run lcx:hrx-sft:catalog:validate`
- Browser proof for People setup routes.
- new `npm run lcx:full:people-setup-a:validate`

Act:
- Payroll calculation and disbursement stay blocked.

### LCX-FULL-15 - People Governance And Admin

Plan:
- Implement People approval/admin gates before integrations and payroll-adjacent work.

Do:
- Approval request types, permission assignment/revoke, field policy, connected app request, audit viewer.

Check:
- `npm run hrx:authz:validate`
- `npm run hrx:context:validate`
- Browser proof for `?view=people#people-admin`.
- new `npm run lcx:full:people-governance:validate`

Act:
- No HR final decisions by AI or automatic workflow.

### LCX-FULL-16 - People Integrations

Plan:
- Implement integration request paths for People e-contract, payroll, messages, and company integrations.

Do:
- Provider receipt mapping, sandbox preflight, owner approval request, audit.

Check:
- `npm run hrx:workflows:validate`
- provider receipt negative tests.
- new `npm run lcx:full:people-integrations:validate`

Act:
- Payroll provider write and contract send remain blocked without external receipts.

### LCX-FULL-17 - Global Decision Center

Plan:
- Make conditional global utilities explicit owner decisions.

Do:
- Decision packets for calendar, finance, data-import, and policies.
- Audit-required flow for force approval/reject and advanced settings.
- Top-level route promotion only after owner decision.

Check:
- `npm run lcx:global-ia:validate`
- Browser proof for `?view=calendar#calendar-decision` and `?view=settings#settings-advanced`.
- new `npm run lcx:full:global-decisions:validate`

Act:
- Conditional items remain conditional until owner decision receipt exists.

### LCX-FULL-18 - Unified Audit, Receipts, And Reconciliation

Plan:
- Prove every guarded action emits reviewable audit evidence.

Do:
- Add audit export, receipt lookup, run reconciliation, blocked action ledger, and stale receipt warnings.

Check:
- `npm run runtime-spine:rs3:audit:validate`
- new `npm run lcx:full:audit-receipts:validate`
- route proof for audit/export surfaces.

Act:
- Audit trail reviewable is not compliance certification.

### LCX-FULL-19 - Desktop Runtime And Production Smoke Preflight

Plan:
- Re-run desktop/runtime readiness only after web gates are current.

Do:
- Validate desktop env, runtime token presence without printing secrets, local production smoke preflight, release manifest no-claim guard.

Check:
- `npm run matter-desktop:formal-release:validate`
- `node scripts/validate-matter-desktop-no-public-release-claim.mjs`
- `npm run lcx:vltui:production-smoke` only when required env exists.

Act:
- Missing env leaves this TUW blocked, not failed open.

### LCX-FULL-20 - Owner Release Decision Packet

Plan:
- Prepare the human decision package after all implementation evidence is current.

Do:
- Assemble changed TUWs, evidence links, residual risks, external receipts, release artifacts, and explicit go/no-go choices.

Check:
- `npm run launch:external-receipts:validate`
- `npm run launch:final-go-live-decision:validate`
- owner decision packet review.

Act:
- Agent cannot approve go-live, public release, external pilot, or provider production writes.

## Recommended PR Slices

| PR | TUWs | Why This Order Is Safe |
| --- | --- | --- |
| PR-00 | LCX-FULL-00 | Freezes truth and blocks premature claims before code changes. |
| PR-01 | LCX-FULL-01 to 02 | Adds shared state and UI language without enabling writes. |
| PR-02 | LCX-FULL-03 to 05 | Implements approval, provider, and run kernels before surfaces use them. |
| PR-03 | LCX-FULL-06 to 07 | Opens Matter/Vault document workflows as request/preflight paths first. |
| PR-04 | LCX-FULL-08 to 10 | Implements import and enrichment executes under shared gates. |
| PR-05 | LCX-FULL-11 to 13 | Adds external provider workflows while preserving provider receipts. |
| PR-06 | LCX-FULL-14 to 16 | Reduces People setup/integration backlog after governance exists. |
| PR-07 | LCX-FULL-17 to 18 | Promotes global decision handling and audit/reconciliation. |
| PR-08 | LCX-FULL-19 to 20 | Runs desktop/runtime/release decision only after implementation evidence is current. |

## Always-Run Verification Bundle

Run this after each PR slice, plus any TUW-specific validators above:

```sh
npm --workspace apps/web run test:ui
npm --workspace apps/web run build
npm run lcx:vltui:closeout:validate
npm run lcx:vltui:action-boundaries:validate
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

## Non-Negotiable No-Go Conditions

- No direct external write before provider receipt and owner approval are both present where required.
- No import execute without dry-run, approval, idempotency, and rollback/error report.
- No document bytes, raw storage paths, raw provider URLs, raw tokens, raw source rows, or denied-party labels in UI evidence.
- No People payroll, discipline, evaluation, termination, or AI final-decision claim before separate owner-approved runtime gates.
- No release, go-live, public distribution, or production readiness claim from repo-only evidence.
