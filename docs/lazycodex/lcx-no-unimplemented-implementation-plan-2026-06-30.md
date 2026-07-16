# LCX No-Unimplemented Implementation Plan

Status: implementation reconciled
Date: 2026-06-30
Scope: all UI capabilities currently classified as openable in `docs/lazycodex/lcx-openable-implementation-tuw-plan-2026-06-30.md`
Baseline release: `matter-desktop-v0.1.0-lcx-vltui-20260630`
Current draft candidate: `matter-desktop-v0.1.0-lcx-full-20260630-1950`
Traceability source: `docs/lazycodex/lcx-openable-implementation-tuw-traceability-2026-06-30.md`

## Goal

Remove the "unimplemented UI" condition from every repo-openable surface.

This does not mean pretending external providers, production writes, go-live, signing, payroll, payments, tax invoice issue, e-sign send, or real client-data migration are complete. It means every visible UI action that can be implemented inside this repo must stop being static, inert, decorative, or label-only.

After this plan, a blocked external operation must be classified as `external_dependency_required`, not `unimplemented`, because the repo-owned request, preflight, audit, receipt, or handoff path exists and is proven.

The original product concept is part of that definition. A UI is still unimplemented if it treats CRM, ERP, and HRX as unrelated modules. The app must close as:

`Client CRM/intake + Matter ERP/legal operations + People HRX -> one Matter-first operating record`

Client owns the pre-Matter CRM lifecycle. Matter owns the ERP/legal-operations lifecycle. People owns the embedded HRX lifecycle. Matter-linked rows must resolve Client and People context before they can leave the unimplemented category.

The Korean SaaS operating guarantee is equally mandatory. A UI is still unimplemented if it does not provide the operating functions Korean SaaS users expect for that job: approval/request, import safety, status readback, permission, audit, provider preflight, bulk/error handling, and Korean business terminology.

These two gates are conjunctive:

`implemented = original_concept_fit PASS AND korea_saas_operating_fit PASS`

If the concept gate fails, keep `concept_spine_missing`.
If the Korean SaaS gate fails, keep `korea_saas_fit_missing`.
Do not classify either failure as implemented, request-ready, or merely provider-blocked.

## No-Unimplemented Definition

A UI surface is no longer unimplemented only when all applicable checks pass:

- The surface has a real repo-backed data model or read model.
- Every visible button, menu item, upload, form, or row action either performs a safe action or clearly opens a request/configuration/review flow.
- No primary action is a no-op, placeholder, dead disabled button, decorative route, or UI-only toggle unless the feature is explicitly retired.
- The action produces one or more observable artifacts: saved config, preflight result, dry-run result, request ref, approval request, sandbox receipt, audit event, rollback/error report, or readback state.
- The UI renders the resulting state after reload or deterministic proof rerun.
- A validator or test proves the happy path and the denied/blocked path.
- A browser/route proof exists for user-facing surfaces.
- Evidence is written under `docs/lazycodex/evidence/` with safe redaction.
- Residual external dependency is named as a blocked claim, not hidden as missing implementation.
- Original concept proof exists: pre-Matter Client flows show their path to Matter, Matter flows carry Client and People context, and People/HRX flows state whether they are firm-wide or Matter-responsibility flows.
- Korean SaaS operating proof exists: each required operating function has source ids or repo-local operating requirements, non-decorative implementation, denied/blocked path, and readback.

## Non-Claims

These remain outside the plan unless separate receipts exist:

- production go-live
- public release
- owner approval inferred by an agent
- provider production write connected
- real Vault object mutation complete
- external email/message sent
- e-sign envelope sent
- payment/money movement performed
- tax invoice issued externally
- payroll calculation or disbursement complete
- real client-data migration complete
- Windows Authenticode signing complete

## Execution Principle

Implement the internal completion path for each surface first, then reclassify the remaining external step.

The desired state transition is:

`unimplemented/static -> repo_implemented -> external_dependency_required`

For concept-fit rows:

`disconnected_domain_surface -> concept_spine_implemented -> external_dependency_required`

For Korean SaaS operating-fit rows:

`thin_visible_surface -> korea_saas_fit_implemented -> external_dependency_required`

or, for purely local setup:

`setup_required -> configured -> audited`

Do not keep `UI_ONLY`, `setup_required`, `provider_blocked`, or `owner_blocked` as final labels when a repo-owned action can create a stronger state.

## Wave Plan

| Wave | Target | What Must Be True At Exit | Primary Validator |
| --- | --- | --- | --- |
| NU-00 | Status taxonomy and inventory | every openable row has an implementation target and residual gate | `npm run lcx:full:gap-inventory:validate` |
| NU-01 | Shared kernels | request, run, provider receipt, readiness, audit, redaction kernels are reusable | `npm run lcx:full:state-model:validate` |
| NU-01A | Original concept spine | Client CRM, Matter ERP/operations, and People HRX close as one Matter-first flow | `npm run lcx:full:concept-fit:validate` |
| NU-02 | Matter/Vault | Matter Vault and Vault document buttons create preflight/request/dry-run/audit results | `npm run lcx:full:matter-vault:validate` |
| NU-03 | Imports | Matter/Client import routes stage, validate, dry-run, request execute, and show rollback/error | `npm run lcx:full:matter-import:validate`; `npm run lcx:full:client-import:validate` |
| NU-04 | Client data | enrichment prep creates consent, candidates, merge review, activation request, audit | `npm run lcx:full:client-data:validate` |
| NU-05 | Provider handoff surfaces | contracts, billing, tax, payment, comms generate request packages and provider-preflight states | `npm run lcx:full:contracts-esign:validate`; `npm run lcx:full:billing-provider:validate`; `npm run lcx:full:matter-comms:validate` |
| NU-06 | People setup | all 35 setup-required People rows become configured/config-request/audited | `npm run lcx:full:people-setup-a:validate` |
| NU-07 | People integration/audit | all 11 integration and 10 audit rows become requestable/reviewable with receipts | `npm run lcx:full:people-integrations:validate`; `npm run lcx:full:people-governance:validate` |
| NU-08 | Global decisions/audit | conditional global items and audit-required global sections create decision/audit packets | `npm run lcx:full:global-decisions:validate`; `npm run lcx:full:audit-receipts:validate` |
| NU-09 | Desktop/release proof | desktop QA and final packet prove no visible repo-openable UI remains unimplemented | `npm run lcx:full:final-release-packet:validate` |

## Detailed Execution

### NU-00 - Reclassify The Backlog

Plan:
- Convert the current openable traceability ledger into an implementation closure ledger.
- Add final-state fields for every row: `current_state`, `target_state`, `proof_required`, `residual_external_gate`, and `unimplemented_allowed`.

Do:
- Create a validator that fails when any `LCX-OPEN-*` row keeps `unimplemented_allowed=true`.
- Map external-only endings to `external_dependency_required`.
- Keep production/go-live/provider claims false.

Check:
- `npm run lcx:full:gap-inventory:validate`
- `npm run lcx:full:no-premature-claim:validate`

Exit:
- Every row has a closure target before feature work begins.

### NU-01 - Shared Implementation Kernels

Plan:
- Remove one-off UI-only states by giving all surfaces common executable primitives.

Do:
- `readiness`: active/configured/setup/integration/audit records.
- `request`: create/read/reject/expire request packets.
- `run`: preflight/dry-run/execute-request/rollback/error report.
- `providerReceipt`: sandbox/configured/expired/revoked/production-required states.
- `audit`: immutable audit event projection with redaction.

Check:
- `npm run lcx:full:state-model:validate`
- `npm run lcx:full:runs:validate`
- `npm run lcx:full:provider-receipts:validate`
- `npm run lcx:full:audit-receipts:validate`

Exit:
- A new UI action can be implemented by wiring to a kernel, not by inventing local state.

### NU-01A - Original Concept Spine No-Unimplemented Closure

Plan:
- Prevent a false "implemented" state where Client, Matter, and People each work locally but the product concept is still broken.

Do:
- Add concept-fit target fields to every openable row: `concept_lane`, `client_ref_required`, `matter_ref_required`, `people_responsibility_required`, `pre_matter_exception`, `joined_readback_required`.
- Define `Client` CRM closure: lead, opportunity, contact, account, intake, conflict, proposal, consent, and handoff show how a customer becomes or does not become a Matter.
- Define `Matter` ERP/operations closure: documents, team, time, expense, billing, payment, tax, AR, analytics, settlement, risk, and audit are Matter-scoped and carry responsible People context.
- Define `People` HRX closure: employee/user separation, workload, role, leave/capacity, approval, HR document, payroll boundary, conflict, ethical wall, and People audit feed Matter responsibility when applicable.
- Add joined route proof over Client opportunity, Matter opening/team/billing, People legal/workforce, and audit readback.

Check:
- `npm run lcx:full:concept-fit:validate`
- existing Client/Matter/People validators for the affected rows.

Exit:
- No surface is closed merely because its own panel works.
- Concept-fit failures are classified as `concept_spine_missing`, not hidden as external provider blockers.
- Korean SaaS operating-fit failures are classified as `korea_saas_fit_missing`, not hidden as design debt, setup work, or provider blockers.

### NU-02 - Matter/Vault No-Unimplemented Closure

Plan:
- Make every visible Matter/Vault action produce a repo-backed state.

Do:
- `?view=matters#matter-vault`: document preflight, draft create, review-ready, approval request, publish request, import dry-run, email draft, send request audit.
- `?view=vault#vault-documents`: version upload request, metadata change request, legal hold request, retention request, records policy request.
- Replace dead disabled controls with request/preflight/configure buttons where an internal action exists.

Check:
- `npm run lcx:vltui:matter-document-workspace:validate`
- `npm run lcx:full:matter-vault:validate`
- `npm run lcx:full:vault-doc-actions:validate`
- `npm run lcx:full:vault-records:validate`
- browser proof for Matter Vault and Vault Documents.

Exit:
- No Matter/Vault action is UI-only. Actual Vault mutation remains `external_dependency_required` or `owner/storage_policy_required`.

### NU-03 - Import No-Unimplemented Closure

Plan:
- Make imports operational through dry-run and execute-request, while production execute remains gated.

Do:
- Matter import: source staging, mapping allowlist, duplicate detection, dry-run, execute request, rollback/error report.
- Client import: source staging, account/contact/opportunity mapping, duplicate detection, dry-run, execute request, rollback/error report.
- Add reload/readback state so a user can see the run result after navigating away.

Check:
- `npm run lcx:full:matter-import:validate`
- `npm run lcx:full:client-import:validate`
- browser proof for `?view=matters#matter-import` and `?view=clients#client-import`.

Exit:
- Import routes are no longer placeholders. Production migration remains blocked by approved runtime target.

### NU-04 - Client Data No-Unimplemented Closure

Plan:
- Implement client enrichment as an internal review workflow before live provider execution.

Do:
- Consent basis capture.
- Provider preflight state.
- Identity candidate generation.
- Merge preview and manual review queue.
- Segment activation request with rollback plan.
- Audit record for every rejected automatic merge or missing provider state.

Check:
- `npm run lcx:full:client-data:validate`
- browser proof for `?view=clients#client-data`.

Exit:
- Client data UI is implemented as review/request workflow. Live enrichment and automatic merge remain provider-gated.

### NU-05 - Provider Handoff No-Unimplemented Closure

Plan:
- Make external provider surfaces generate complete internal handoff packages.

Do:
- Contracts/e-sign: draft package, signer validation, send request audit, provider preflight.
- Billing/payment/tax: invoice request, payment request, reconciliation preview, tax invoice request, provider preflight.
- Matter comms: message/email draft, recipient policy, attachment policy, send request audit.

Check:
- `npm run lcx:full:contracts-esign:validate`
- `npm run lcx:full:billing-provider:validate`
- `npm run lcx:full:matter-comms:validate`
- browser proof for affected Client and Matter routes.

Exit:
- Provider surfaces are implemented as handoff/request workflows. External send/issue/payment remains `provider_production_receipt_required`.

### NU-06 - People Setup No-Unimplemented Closure

Plan:
- Close all 35 `setup_required` People rows into configured or config-request states.

Do:
- Implement configuration/readback for role, work profile, schedules, external schedules, work types, current work status, attendance records, attendance upload dry-run, break records, missing-attendance rules, verification methods, leave types, accrual rules, leave usage, custom requests, schedule/attendance requests, report snapshots/items, pay work-profile basis, message automation/templates/notices, and company settings.
- Each setup action must save or stage data and render the saved/staged state.

Check:
- `npm run lcx:full:people-setup-a:validate`
- `npm run hrx:ui:validate`
- browser proof over representative People setup routes.

Exit:
- No People setup row remains static `setup_required` unless retired by owner decision.

### NU-07 - People Integration And Audit No-Unimplemented Closure

Plan:
- Close integration and audit rows as requestable/reviewable workflows.

Do:
- Integration rows: expense request, pay statement request, message send request, e-contract send/templates/status, employment contract request, company e-contract/payroll/billing/integrations provider settings.
- Audit rows: schedule lock, unscheduled attendance, attendance lock, force approval/reject, attention report, close management, pay rules/minimum wage review, annual leave notice generation request, company security, advanced options.
- Every row creates request/audit/readback evidence.

Check:
- `npm run lcx:full:people-integrations:validate`
- `npm run lcx:full:people-governance:validate`
- `npm run hrx:authz:validate`

Exit:
- Integration/audit rows are implemented as governed workflows. External execution/legal/payroll finality remains receipt-gated.

### NU-08 - Global Decision And Audit No-Unimplemented Closure

Plan:
- Turn conditional global IA into explicit decision workflows, not inactive menu ideas.

Do:
- Decision packets for `calendar`, `finance`, `data-import`, and `policies`.
- Audit flows for `requests-force-decision` and `settings-advanced`.
- Receipt lookup/export, blocked-action ledger, and run/receipt reconciliation dashboard.

Check:
- `npm run lcx:full:global-decisions:validate`
- `npm run lcx:full:audit-receipts:validate`
- browser proof for `?view=calendar#calendar-decision` and `?view=settings#settings-advanced`.

Exit:
- Conditional/global audit UI is implemented as decision/audit center. Permanent promotion remains owner-gated.

### NU-09 - Final No-Unimplemented Proof

Plan:
- Prove the product no longer has repo-openable UI left in unimplemented/static state.

Do:
- Add a final no-unimplemented validator that scans route proof, traceability rows, and UI action markers.
- Re-run browser proof after implementation.
- Refresh desktop screen QA.
- Validate exact release candidate tag.
- Record residual external gates separately.

Check:
- `npm run lcx:full:final-release-packet:validate`
- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.0-lcx-full-20260630-1950 npm run matter-desktop:formal-release:validate`
- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.0-lcx-full-20260630-1950 npm run lcx:full:release-preflight-proof`
- `npm run matter-desktop:screen-qa`
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`

Exit:
- Final packet says: repo-openable UI implemented.
- Residual gates say: production smoke env, provider production receipts, external execution, go-live, public release, and signing are separate dependencies.

## Final Reporting Format

When closing this plan, report these lines exactly:

- `repo_openable_ui_unimplemented_count: 0`
- `external_dependency_required_count: 3`
- `production_go_live_claim: false`
- `public_release_claim: false`
- `provider_production_write_claim: false`
- `real_client_data_migration_claim: false`
- `windows_authenticode_signing_claim: false`

If any repo-openable row cannot be implemented, it must name one of:

- `blocked_by_missing_code_owner_decision`
- `blocked_by_conflicting_domain_contract`
- `retired_by_owner_decision`
- `external_dependency_required`

It may not remain as plain `unimplemented`.

## Current Closeout Receipt

Validated on 2026-06-30:

- `npm run lcx:full:pr00:validate` through `npm run lcx:full:pr07:validate`: PASS
- `npm run lcx:full:operating-fit-actions:validate`: PASS
- `npm run lcx:full:operating-fit-final:validate`: PASS
- `npm run lcx:full:pr08:validate`: not treated as implementation failure; release preflight correctly preserves `LCX-FULL-19.01` as failed and `LCX-FULL-19.03` as blocked.

Openable UI row count: 105.

| Status | Count |
| --- | ---: |
| `closed_repo_implemented` | 46 |
| `closed_request_only` | 49 |
| `closed_dry_run_only` | 7 |
| `blocked_external_receipt_required` | 3 |

The three `blocked_external_receipt_required` rows are release/public/go-live related. Request-only provider flows are not counted as unimplemented because their repo-owned request, preflight, audit, receipt, or handoff path is present and validator-backed.
