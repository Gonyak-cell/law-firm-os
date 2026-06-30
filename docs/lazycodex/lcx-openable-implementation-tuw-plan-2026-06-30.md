# LCX Openable Implementation TUW Plan

Status: implementation reconciled
Date: 2026-06-30
Scope: latest published desktop prerelease `matter-desktop-v0.1.0-lcx-vltui-20260630`, current draft candidate `matter-desktop-v0.1.0-lcx-full-20260630-1950`, and current HEAD
Planning mode: LazyCodex TUW, Plan -> Do -> Check -> Act
Traceability: `docs/lazycodex/lcx-openable-implementation-tuw-traceability-2026-06-30.md`
Related baseline: `docs/lazycodex/lcx-full-implementation-tuw-plan-2026-06-30.md`

## Goal

Implement every UI capability that can be opened inside the repository without new production secrets, external provider completion, store distribution, Windows signing, production go-live, public release, or real client-data migration authority.

The target is not to make blocked production operations look complete. The target is to replace static/visual-only guarded UI with real repo-backed request, preflight, dry-run, approval-request, sandbox-receipt, audit, rollback, and review flows wherever those flows can truthfully run now.

The target is also not to implement CRM, ERP, and HRX as three disconnected apps. Law Firm OS is a `Client - Matter - People` product:

- `Client` is the CRM and intake side: customer master, contact, lead, opportunity, inquiry, conflict check, proposal, consent, and handoff.
- `Matter` is the ERP/legal-operations side: engagement scope, matter opening, document, time, expense, billing, payment, tax, AR, profitability, settlement, risk, audit, and release/governance trace.
- `People` is the embedded HRX side: employee/user separation, role, employment profile, workload, availability, approval, leave, HR document, payroll boundary, conflict/ethical wall responsibility, and People audit.
- `Matter` is the join point. A repo-openable action that touches documents, billing, payment, tax, contracts, comms, time, expense, analytics, audit, or release proof must resolve Client and People context before it closes.

## Implementable Definition

A TUW is openable now when it can close with all of these:

- code or repo-native mapping in this checkout
- synthetic/local runtime data only, or safe read-only runtime proof
- route/browser proof or deterministic validator
- redacted evidence artifact under `docs/lazycodex/evidence/`
- no new secret, external provider completion, production mutation, public release, or go-live decision
- explicit residual gate for anything not implemented
- concept-fit context: `client_ref`, `matter_ref`, and `people_responsibility` for any Matter-linked row, or an explicit pre-Matter exception such as Lead/Opportunity

## Dual-Axis Completion Rule

Implementation requires both axes. This is an AND gate, not a checklist where one axis can compensate for the other.

Axis A - original app concept:
- Client surfaces must implement CRM/intake behavior and show the path to Matter handoff or an explicit pre-Matter disposition.
- Matter surfaces must implement ERP/legal-operations behavior around the Matter record.
- People surfaces must implement embedded HRX behavior, including Employee/User separation and Matter-responsibility state when applicable.

Axis B - Korean SaaS operating guarantee:
- The surface must provide the Korean SaaS-grade operating functions for the job: approval/request, import safety, status readback, permission, audit, provider preflight, bulk/error handling, and Korean business terminology.
- The required functions must be backed by source ids from the Korea SaaS research matrix or by an explicit repo-local operating requirement.

If Axis A fails, the row remains `concept_spine_missing`.
If Axis B fails, the row remains `korea_saas_fit_missing`.
If either axis fails, the row is not implemented, even when the UI opens and the local action works.

## Non-Negotiable Blocked Claims

These stay false until separate owner/provider/runtime evidence exists:

- production go-live
- public release
- actual launch/go-live completed
- owner approval inferred by an agent
- provider production write connected
- real Vault object write complete
- external email/message send complete
- e-sign envelope sent
- payment or money movement performed
- tax invoice issued externally
- payroll calculation or disbursement performed
- real client-data migration complete
- Windows Authenticode signing complete

## Execution Strategy

Implement broad capability in narrow, independently verifiable tranches. Each tranche must move a visible UI state from one of these weak states:

`static only`, `UI_ONLY`, `setup_required`, `provider_blocked`, `owner_blocked`, `write=false`

to one of these stronger but still honest states:

`configured`, `preflight_passed`, `dry_run_passed`, `approval_requested`, `request_ready`, `sandbox_configured`, `audited`, `rollback_ready`

No TUW may jump to a production-complete state.

No TUW may close as implemented if it only proves its isolated screen. It must prove the original product concept at the correct grain:

`Client CRM/intake -> Matter ERP/operations -> People HRX responsibility`

If a screen is pre-Matter, it must show the path to Matter opening. If a screen is Matter-scoped, it must carry Client and People context. If a screen is People-scoped, it must state whether it is firm-wide HRX or Matter-responsibility HRX.

## Execution Order

| Wave | TUWs | Primary Scope | Why First | Exit Evidence |
| --- | --- | --- | --- | --- |
| OPEN-00 | `LCX-OPEN-00.*` | freeze baseline and no-claim guard | prevents drift and overclaiming | gap inventory and validators pass |
| OPEN-01 | `LCX-OPEN-01.*` | shared readiness, request, run, audit, provider sandbox kernels | removes duplicated one-off guarded logic | unit tests and model receipts |
| OPEN-01A | `LCX-OPEN-01A.*` | original Client-Matter-People concept spine | prevents disconnected CRM/ERP/HRX implementation | concept-fit validator and end-to-end route proof |
| OPEN-02 | `LCX-OPEN-02.*` | Matter/Vault request-only and dry-run flows | highest user-visible legal-DMS value with no external provider needed | Matter/Vault route proof |
| OPEN-03 | `LCX-OPEN-03.*` | Matter and Client import dry-run/approval-request/rollback | practical migration value while production execute remains blocked | import validators and route proof |
| OPEN-04 | `LCX-OPEN-04.*` | Client data enrichment prep and merge review | useful before provider connection | client-data validator and proof |
| OPEN-05 | `LCX-OPEN-05.*` | Contracts, billing, and communications request packages | opens work packages without sending externally | provider handoff validators |
| OPEN-06 | `LCX-OPEN-06.*` | People setup-required rows | largest count of immediately implementable UI | People setup validators and route proof |
| OPEN-07 | `LCX-OPEN-07.*` | People integration and audit-required rows | makes blocked HR actions operationally requestable/reviewable | People governance/integration validators |
| OPEN-08 | `LCX-OPEN-08.*` | global decision center and audit reconciliation | captures owner decisions and reviewer evidence | global/audit validators |
| OPEN-09 | `LCX-OPEN-09.*` | desktop/runtime closeout packet | packages implemented truth without go-live claim | release packet validates with residual blockers |

## Wave Details

### OPEN-00 - Baseline And Claim Guard

Plan:
- Freeze the current openable backlog against the latest release and current HEAD.
- Preserve the existing LCX-FULL receipts as baseline evidence, not as production-complete claims.

Do:
- Add this plan and the traceability ledger.
- Reuse `lcx-full-00-current-gap-inventory.json` for route and People counts.
- Add a lightweight validator later only if the openable plan starts drifting from the route inventory.

Check:
- `npm run lcx:full:gap-inventory:validate`
- `npm run lcx:full:no-premature-claim:validate`
- `npm run lcx:full:final-release-packet:validate`

Act:
- If any implementation needs a blocked claim, split it out of OPEN scope and record it as residual.

### OPEN-01 - Shared Local Capability Kernels

Plan:
- Build the boring shared machinery before opening individual screens.

Do:
- Readiness records for configured/setup/integration/audit states.
- Request lifecycle for request-ready, approval-requested, rejected, expired.
- Run lifecycle for dry-run, preflight, execute-request, rollback/error report.
- Provider receipt registry for sandbox/configured/expired/revoked states.
- Audit ledger and redaction helpers for all guarded actions.

Check:
- `npm run lcx:full:state-model:validate`
- `npm run lcx:full:runs:validate`
- `npm run lcx:full:provider-receipts:validate`
- `npm run lcx:full:audit-receipts:validate`

Act:
- Later surfaces must consume these kernels instead of adding ad hoc local state.

### OPEN-01A - Original Concept Spine

Plan:
- Make the original product concept an implementation gate, not a narrative note.
- Treat CRM as `Client`, ERP/legal operations as `Matter`, and HRX as `People`.

Do:
- Add a concept-fit closure ledger with required fields: `client_ref`, `matter_ref`, `people_responsibility`, `engagement_scope`, `permission_context`, `audit_context`, and `pre_matter_exception`.
- Implement or plan the shared `triadContext` readback used by Client, Matter, People, Vault, Billing, Contracts, Comms, and Audit surfaces.
- Define the end-to-end flow proof: `Client opportunity/intake/conflict -> Matter opening -> Matter team assignment -> document/billing/audit readback`.
- Define the HRX responsibility proof: Matter team members, reviewers, approvers, workload, leave/capacity, conflict, and ethical wall state resolve to People/HRX identity instead of free-form labels.

Check:
- `npm run lcx:full:concept-fit:validate`
- route proof over `?view=clients#client-opportunities`, `?view=matters#matter-opening`, `?view=matters#matter-team`, `?view=clients#client-billing`, and `?view=people#people-directory`

Act:
- If a row cannot resolve its Client/Matter/People spine, it stays `pending` or `blocked_external_receipt_required`; it does not become implemented just because the local action works.

### OPEN-02 - Matter/Vault Request-Only Workflows

Plan:
- Turn visible Matter/Vault guarded rows into real preflight and request flows.

Do:
- Matter document workspace preflight.
- Document draft, review-ready, approval request.
- Vault publish request package, still no write complete.
- Vault document import dry-run.
- Vault version upload request.
- Metadata change request with field allowlist.
- Legal hold owner-decision request.
- Retention/records policy request.
- External email draft package, still no send.

Check:
- `npm run lcx:vltui:matter-document-workspace:validate`
- `npm run lcx:full:matter-vault:validate`
- `npm run lcx:full:vault-doc-actions:validate`
- browser proof for `?view=matters#matter-vault` and `?view=vault#vault-documents`

Act:
- Exit states may be `preflight_passed`, `approval_requested`, `request_ready`, or `rollback_ready`; never `published`.

### OPEN-03 - Import Dry-Run And Approval-Request Workflows

Plan:
- Make Matter and Client import useful without production migration authority.

Do:
- Source staging with raw rows hidden.
- Field mapping allowlists.
- Duplicate detection.
- Dry-run result projection.
- Approval-request package for execute.
- Synthetic/local execute path only where test-backed and clearly non-production.
- Rollback/error report.

Check:
- `npm run lcx:full:matter-import:validate`
- `npm run lcx:full:client-import:validate`
- browser proof for `?view=matters#matter-import` and `?view=clients#client-import`

Act:
- Production import complete remains false until a separate approved runtime target exists.

### OPEN-04 - Client Data Enrichment Preparation

Plan:
- Implement the review and preparation layer before live enrichment providers.

Do:
- Consent-basis capture.
- Provider receipt preflight state.
- Identity candidate generation.
- Merge preview and manual review queue.
- Segment activation request with rollback plan.
- Audit evidence for rejected automatic merge.

Check:
- `npm run lcx:full:client-data:validate`
- browser proof for `?view=clients#client-data`

Act:
- Automatic merge and provider enrichment live remain false.

### OPEN-05 - External Handoff Packages Without External Execution

Plan:
- Give contracts, billing, payments, tax invoices, and communications real request packages while leaving provider execution blocked.

Do:
- Contract/proposal draft package.
- Signer roles and required field validation.
- E-sign send request audit, no envelope sent.
- Invoice issue request model, no external invoice issue.
- Payment request model, no money movement.
- Tax invoice provider request, no external tax invoice issue.
- Matter message/email draft, recipient policy, attachment policy, send request audit, no external send.

Check:
- `npm run lcx:full:contracts-esign:validate`
- `npm run lcx:full:billing-provider:validate`
- `npm run lcx:full:matter-comms:validate`
- browser proof for `client-contracts`, `client-billing`, `matter-expenses`, and Matter comms routes

Act:
- Provider production write remains false.

### OPEN-06 - People Setup-Required Rows

Plan:
- Move all People `setup_required` rows from static catalog state to real configured/setup-request states.

Do:
- Role/job and work profile setup.
- Work schedule, external schedule, work type, current work status.
- Attendance records, upload validation, break records, missing-attendance notification rules, verification method setup.
- Leave types, auto/manual accrual rules, leave usage views.
- Custom request type, work schedule request, attendance request setup.
- Report snapshot/item configuration.
- Pay work-profile basis only, no payroll calculation claim.
- Message automation/templates/notices setup.
- Company general, notifications, organization, work schedule, attendance, breaks, leave, requests, messages, reports, support settings.

Check:
- `npm run lcx:full:people-setup-a:validate`
- `npm run hrx:ui:validate`
- browser proof for selected People setup routes

Act:
- Rows can move to `configured` only with route proof and validator evidence.

### OPEN-07 - People Integration And Audit-Required Rows

Plan:
- Make integration-required and audit-required People rows requestable/reviewable without claiming external execution.

Do:
- Expense request workflow package, no payment movement.
- Pay statement provider request, no payroll disbursement.
- Message send provider request, no external send.
- E-contract send/templates/status request package, no envelope sent.
- Employment contract request package, no external signature completion.
- Company e-contract, payroll, billing, integrations provider receipt state.
- Audit-required flows: schedule lock, unscheduled attendance, attendance lock, force approval/reject, attention report, close management, pay rules/minimum wage review, annual leave notice generation request, company security, advanced options.

Check:
- `npm run lcx:full:people-governance:validate`
- `npm run lcx:full:people-integrations:validate`
- `npm run hrx:authz:validate`
- browser proof for governance and integration routes

Act:
- Payroll, provider sends, discipline/final legal decisions, and advanced execution remain receipt-gated.

### OPEN-08 - Global Decisions And Audit Reconciliation

Plan:
- Turn conditional global IA and audit/export into concrete decision/review workflows.

Do:
- Decision packet workflow for `calendar`, `finance`, `data-import`, and `policies`.
- Audit flow for `requests-force-decision` and `settings-advanced`.
- Unified receipt lookup/export.
- Run/receipt reconciliation dashboard.
- Blocked-action ledger.

Check:
- `npm run lcx:full:global-decisions:validate`
- `npm run lcx:full:audit-receipts:validate`
- browser proof for `?view=calendar#calendar-decision` and `?view=settings#settings-advanced`

Act:
- Permanent top-level promotion and go-live approval remain false until owner decision exists.

### OPEN-09 - Desktop And Release Closeout

Plan:
- Package the newly opened repo-backed capabilities without overstating release authority.

Do:
- Refresh desktop screen QA after implementation.
- Re-run formal release validation with the exact candidate tag.
- Preserve production smoke blocker if `LAWOS_VAULT_BRIDGE_TOKEN` is missing.
- Update final release packet with implemented-openable scope and residual gates.

Check:
- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.0-lcx-full-20260630-1950 npm run matter-desktop:formal-release:validate`
- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.0-lcx-full-20260630-1950 npm run lcx:full:release-preflight-proof`
- `npm run lcx:full:final-release-packet:validate`
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`

Act:
- If the only remaining gate is production smoke env, report it as blocked rather than implementation incomplete.

## Execution Reconciliation

Validated on 2026-06-30:

- `npm run lcx:full:pr00:validate` through `npm run lcx:full:pr07:validate`: PASS
- `npm run lcx:full:operating-fit-actions:validate`: PASS
- `npm run lcx:full:operating-fit-final:validate`: PASS
- `npm run lcx:full:pr08:validate`: intentionally not promoted; release preflight preserved `LCX-FULL-19.01` as failed and `LCX-FULL-19.03` as blocked.

Evidence:

- `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-concept-fit-validation.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-korea-saas-fit-validation.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-operating-fit-final-validation.json`

Openable row status after reconciliation:

| Status | Count |
| --- | ---: |
| `closed_repo_implemented` | 46 |
| `closed_request_only` | 49 |
| `closed_dry_run_only` | 7 |
| `blocked_external_receipt_required` | 3 |

No `LCX-OPEN-*` row remains `pending`, `in_progress`, `concept_spine_missing`, or `korea_saas_fit_missing`. Public release, production go-live, provider production writes, external sends, money movement, tax invoice issue, payroll disbursement, real migration, and signing remain non-claims.
