# LCX Korea SaaS Operating-Fit Implementation Plan

Status: implementation reconciled
Date: 2026-06-30
Baseline release: `matter-desktop-v0.1.0-lcx-vltui-20260630`
Current draft candidate: `matter-desktop-v0.1.0-lcx-full-20260630-1950`
Research matrix: `docs/lazycodex/lcx-korea-saas-operating-fit-research-matrix-2026-06-30.md`
Lazyweb report: https://www.lazyweb.com/report/lazyweb/d70ec9a6-6d01-4dec-8fc2-2b8a233f162d/?source=create
Inherits from:
- `docs/lazycodex/lcx-openable-implementation-tuw-plan-2026-06-30.md`
- `docs/lazycodex/lcx-openable-implementation-tuw-traceability-2026-06-30.md`
- `docs/lazycodex/lcx-no-unimplemented-implementation-plan-2026-06-30.md`

## Goal

Make every currently implementable UI stop being "unimplemented" by meeting Korean SaaS operating-fit conditions.

The new implementation threshold is stricter than `openable` and stricter than `not a no-op`. A UI is complete only when it includes the operating features Korean SaaS users expect for the relevant job: approval/request, import safety, status readback, permission, audit, provider preflight, and Korean business terminology.

Because this is a law-firm Matter app, the implementation threshold also requires the `Client - Matter - People` relationship to remain visible and actionable. Matter is the operating spine: Client defines who the work is for and what engagement/opportunity it came from; Matter defines the scope, documents, communications, billing, and audit record; People defines who owns, reviews, approves, performs, or is blocked from the work.

## Dual-Axis Completion Rule

No UI is implemented unless both axes pass.

Axis A - original app concept:
- `Client` must function as CRM/intake.
- `Matter` must function as ERP/legal operations.
- `People` must function as embedded HRX.
- Matter-linked actions must resolve Client and People context.

Axis B - Korean SaaS operating guarantee:
- The UI must provide the operating features Korean SaaS users expect for that job category.
- Required features include approval/request, import safety, status readback, permission, audit, provider preflight, bulk/error handling, and Korean business terminology where applicable.
- Each required feature must be backed by `saas_baseline_source_ids` or an explicit repo-local operating requirement.

Closure logic:
- Axis A fail -> `concept_spine_missing`.
- Axis B fail -> `korea_saas_fit_missing`.
- Axis A pass + Axis B pass -> the row may become `repo_implemented_operating_fit`, subject to validators, route proof, evidence, and residual external gates.
- Any other combination is not implementation.

## Concept-Fit Verdict

Current implementation is concept-present but not concept-complete.

What exists:
- `Client` already carries CRM/intake concepts: leads, opportunities, contacts, accounts, activities, proposals, duplicate review, conflict checks, clearance tokens, and billing visibility.
- `Matter` already carries matter operations and ERP-adjacent concepts: matter records, team members, documents, Vault summary, timeline, channel, activities, deadlines, time entries, invoices, payments, AR, analytics, audit, and integrations.
- `People` already carries HRX concepts: employee roster, Employee/User separation, HR documents, leave, approvals, recruiting, lifecycle, policy, analytics, AI review, payroll boundary, legal people, conflict/ethical-wall views, and audit.
- There are real bridge pieces: Matter team assignment, legal People `Client·Matter` relationships, Matter workload projection by employee, HR-risk-to-Matter link, and import mapping fields like `matter_owner_ref` and `client_ref`.

What is still not good enough:
- CRM handoff is not yet one end-to-end route from `Client -> opportunity/intake/conflict -> engagement -> Matter opening -> team assignment -> billing`.
- ERP is still spread across Matter/Finance/Billing surfaces rather than enforced as `Matter-scoped billing, payment, tax, AR, and profitability`.
- HRX is implemented as a strong People module, but Matter actions do not universally consume HRX employee/user identity, capacity, assignment, approval, and ethical-wall state.
- Current proof is mostly surface/route/kernel proof. The original product concept needs flow proof: Client/Matter/People references must be required by the action model, not just displayed in nearby panels.

Therefore a UI row can no longer close only because its domain surface works. It must close against the original concept:

`Client CRM + Matter ERP/operations + People HRX -> one Matter-first operating record`

## New Target State

`unimplemented/static -> repo_implemented_operating_fit -> external_dependency_required`

If the original concept is missing:

`unimplemented/static -> concept_spine_missing`

If the Korean SaaS operating guarantee is missing:

`unimplemented/static -> korea_saas_fit_missing`

For local setup-only surfaces:

`setup_required -> configured_or_config_request -> audited`

No external claim is upgraded by this plan. Provider sends, tax invoice issue, money movement, payroll close, production Vault write, signing, public release, and go-live remain false until separate receipts exist.

## Implementation Definition

A UI can be marked implemented only when:

- original concept fit passes
- Korean SaaS operating-fit guarantee passes
- each visible action maps to a repo-owned command, request, dry-run, config save, review queue, or readback state
- each action writes an observable artifact: saved config, request ref, dry-run result, row error report, approval packet, provider preflight, audit event, or reconciliation receipt
- each external effect is represented as a preflight/request state, not silently disabled
- every row has a residual external gate or an explicit local completion proof
- route/browser proof and validator proof exist
- customer-facing Korean labels are operational nouns, not translation placeholders
- Matter-centered actions resolve their Client and People context before they can be marked complete

## Wave Plan

| Wave | Target | Korean SaaS condition | Primary proof |
| --- | --- | --- | --- |
| KSOF-00 | Baseline and taxonomy | every UI row has a Korean SaaS operating-fit target | gap inventory plus research matrix review |
| KSOF-01 | Shared kernels | approval, run, provider, audit, permission, and readback patterns are reusable | state/run/provider/audit validators |
| KSOF-01A | Original concept spine | Client CRM, Matter ERP/operations, and People HRX close as one Matter-first flow | concept-fit validator and end-to-end route proof |
| KSOF-02 | Document and Vault | document workspaces support version, permission, retention, activity, approval | Matter/Vault and Vault document validators |
| KSOF-03 | Imports | import UIs support staging, mapping, duplicate check, dry-run, row error, rollback | Matter/Client import validators |
| KSOF-04 | Client CRM | customer/company/contact/opportunity, owner, lifecycle, activity, segment activation | client-data validator and route proof |
| KSOF-05 | Contracts and e-sign | template, signer role, required fields, status, reminder, audit certificate placeholder | contracts/e-sign validator |
| KSOF-06 | Billing, payment, tax | invoice/tax/payment request, provider status, reconciliation, AR state | billing provider validator |
| KSOF-07 | People operations | HR setup, attendance, leave, requests, reports, pay, e-contract, notices | people setup/governance/integration validators |
| KSOF-08 | Global decisions and audit | global changes require decision packet, impact, approver line, audit reconciliation | global/audit validators |
| KSOF-09 | Desktop/release proof | packaged UI claims match route proof and residual blockers | screen QA and final release packet validation |

## Detailed Execution

### KSOF-00 - Freeze Research-Backed Scope

Do:
- Add `operating_fit_required=true` for every `LCX-OPEN-*` / `NU-*` row.
- Add fields: `saas_baseline_source_ids`, `operating_features_required`, `repo_completion_state`, `residual_external_gate`.
- Add triad fields for Matter-linked rows: `client_ref`, `matter_ref`, `people_responsibility`, `engagement_scope`, `permission_context`, `audit_context`.
- Preserve current counts: 10 route entries, 71 People catalog entries, 4 conditional global items, 2 audit-required global sections.

Exit:
- No row can close from `openable` alone.
- No row can close from `button works` alone.
- No Matter-linked row can close without Client and People context.
- Claim guard still blocks production/go-live/provider claims.

### KSOF-01 - Shared Operating Kernels

Build once, wire everywhere:
- `request`: approver line, requester, target, payload summary, expiry, approval/deny/cancel, audit ref.
- `run`: staging, preflight, dry-run, execute-request, rollback note, row error report.
- `providerReceipt`: missing/sandbox/configured/expired/revoked/production-required states.
- `audit`: redacted event projection, activity history, export-safe receipt.
- `permission`: role, scope, row-level deny reason, reviewer override request.
- `readback`: reload-stable view model for status, history, and latest artifact.
- `triadContext`: Client/customer identity, Matter scope, responsible partner/attorney/staff, reviewer/approver, and permission boundary.

Exit:
- New feature surfaces can reuse kernels without one-off UI state.
- Denied/blocked paths are first-class, not disabled text.
- Matter work items can be filtered by client, matter, owner, reviewer, approver, and blocked responsibility state.

### KSOF-01A - Original Concept Spine

Implement the app's real concept before closing feature rows.

Concept contract:
- CRM belongs to `Client`: lead, opportunity, contact, account, intake, conflict, proposal, consent, and customer history live here until engagement.
- ERP and legal operations belong to `Matter`: opening, scope, documents, team, time, expense, billing, payment, tax, AR, profitability, settlement, risk, audit, and release/governance trace are Matter-scoped unless explicitly pre-Matter.
- HRX belongs to `People`: employee, login link, role, employment profile, workload, availability, leave, approval, HR document, payroll boundary, and sensitive People audit live here.
- Matter is the join point: an operating action that touches documents, billing, payments, tax, contracts, comms, time, expense, analytics, or audit must resolve `client_ref`, `matter_ref`, and `people_responsibility`.

Implement:
- `crmToMatterHandoff`: opportunity/intake/conflict/clearance package that can open a Matter only with client identity, engagement scope, and proposed responsible People.
- `matterErpContext`: billing/payment/tax/time/expense records must carry Matter id, client payer, responsible People owner/reviewer, source document/request, and audit ref.
- `peopleMatterContext`: Matter team, workload, approval, leave/capacity, conflict, ethical-wall, and HR-risk links consume HRX employee/user identity rather than free-form names.
- `conceptFitReadback`: every primary surface shows the same joined spine: Client, Matter, People, permission, latest document, latest billing/payment/tax state, latest communication, latest audit.

Exit:
- A Client opportunity can be followed to Matter opening evidence.
- A Matter can be followed back to CRM origin and forward to billing/document/audit state.
- A Matter team member can be resolved to People/HRX identity, role, availability or blocked state.
- A billing/tax/payment action cannot proceed from a detached Client or detached Matter.
- A People conflict/ethical-wall finding can block or review a Matter action without exposing sensitive client detail.

### KSOF-02 - Matter/Vault And Vault Documents

Korean SaaS baseline:
- NAVER WORKS Drive provides version history, restore, file/folder activity, link/access settings, trash retention, and version retention.
- Approval products provide 결재선 and form-level approval configuration.

Implement:
- Matter document builder: draft package, template/source, required metadata, preview, approval request.
- Version upload request: file metadata, expected version, approver, activity receipt.
- Metadata/retention/legal hold request: allowlisted fields, policy scope, effective date, denial path.
- Vault document table: version panel, activity panel, link/access policy state, receipt export.
- Every document action carries Client, Matter, responsible People role, and permission/audit context.

Exit:
- `matter-vault` and `vault-documents` are no longer static document UIs.
- External Vault mutation remains `external_dependency_required`.

### KSOF-03 - Matter And Client Import

Korean SaaS baseline:
- Ecount Excel upload supports bulk upload, failed row reason, update/add behavior, and operational migration from spreadsheets.

Implement:
- Upload/stage parser for CSV/XLSX fixtures.
- Mapping allowlist per target: Matter, company/customer, contact, opportunity.
- Duplicate/conflict detection with side-by-side review.
- Dry-run summary with row-level errors and downloadable redacted report.
- Execute approval request with rollback/error report placeholder.
- Matter import rows cannot activate unless client/customer identity, engagement scope, and responsible People assignment are either mapped or marked as owner-review-required.

Exit:
- Import routes create useful migration work product without production writes.
- Raw rows are hidden/redacted in evidence.

### KSOF-04 - Client CRM And Data

Korean SaaS baseline:
- Relate models Organization, People, Deal, Process, List, pipeline stages, owners, and saved Data Views.
- Channel Talk supports customer profiles, segments, and targeted messaging.

Implement:
- Customer/company/contact/opportunity hierarchy.
- Opportunity stage, owner/assignee, next action, activity timeline.
- Merge candidate review with keep/drop decision request.
- Consent basis and data-enrichment preflight.
- Segment preview and activation request with rollback plan.
- Conversion path from opportunity/engagement to Matter must preserve responsible People, conflict/duplicate review state, and initial matter scope.

Exit:
- `client-data` behaves like a CRM operating surface, not a static customer detail page.
- Enrichment and live activation remain provider-gated.

### KSOF-05 - Contracts And E-Sign

Korean SaaS baseline:
- Modusign supports document upload, signer/requester roles, signing method, templates, bulk send, document status, reminders, and audit certificates.

Implement:
- Contract draft package with selected template/source document.
- Signer role table and required field validation.
- Send preflight with provider receipt state.
- Reminder/cancel request states.
- Status read model and audit certificate placeholder linked to Vault.
- Contract packages must link to Client, Matter, responsible People, and Vault destination before send request is available.

Exit:
- Contract UI can prepare, validate, request, and track an e-sign package.
- No envelope is sent without provider connection and approval.

### KSOF-06 - Billing, Payment, And Tax

Korean SaaS baseline:
- Ecount links ERP, accounting, tax invoices, Hometax comparison, and e-approval.
- Popbill exposes tax invoice status, duplicate document-number checks, search, change logs, and document box URLs.
- Toss Payments separates payment request, authentication, approval, order/amount validation, paymentKey storage, sandbox, webhooks, and cancellation.

Implement:
- Estimate/invoice issue request and approval packet.
- Tax invoice request with `mgtKey` candidate, duplicate check model, status/log readback, and correction/cancel request states.
- Payment request with `orderId`, amount snapshot, approval-preflight validation, cancellation/refund request, and payment status readback.
- Reconciliation preview: billing request, payment state, tax state, AR aging, receipt links.
- Billing/tax/payment records must resolve Client payer, Matter scope, responsible billing owner, and source document/request chain.

Exit:
- `client-billing` is operating-fit as a request/reconciliation surface.
- Tax issue and money movement remain provider-gated.

### KSOF-07 - People Operating Pack

Korean SaaS baseline:
- Shiftee provides work schedules, attendance, leave, workflow, messages, e-contract, attendance aggregation, and payroll settlement.
- NAVER WORKS approval provides form/approval-line controls that also apply to HR requests.

Implement by sub-lane:
- Setup: role, work profile, schedule, work type, org, notification, report, support settings as config records.
- Attendance: current status, records, upload dry-run, break policy, missing alerts, verification method, exception queue.
- Leave: leave types, accrual simulation, manual accrual request, usage ledger, annual leave notice request.
- Requests/governance: custom request, schedule/attendance requests, locks, force decision, close, attention report, security/advanced review.
- Payroll/pay: pay basis, pay statement provider request, pay rules review, payroll preflight.
- Messages/e-contract: template, audience, substitution preview, send/e-contract preflight, status readback.
- Matter team roles: responsible partner, matter owner, working attorney, reviewer, approver, staff/paralegal, and blocked/external roles as permission-aware assignment records.

Exit:
- 35 setup-required rows move to `configured_or_config_request`.
- 11 integration-required rows move to `provider_request_ready`.
- 10 audit-required rows move to `review_request_audited`.
- Payroll, external send, and legal finality remain false.

### KSOF-08 - Global Decisions And Audit

Korean SaaS baseline:
- Groupware/ERP products use approval lines, forms, ERP-linked approvals, activity logs, and security policy controls.

Implement:
- Decision packet for calendar, finance, data-import, and policies.
- Impact matrix, required approver, effective date, rollback note, current/requested value.
- Advanced settings review request with risky-option denial path.
- Audit reconciliation across request, run, provider, approval, document, payment, tax, and People receipts.

Exit:
- Global conditional items are reviewer-ready, not hidden backlog.
- Raw export and compliance certification remain blocked unless approved.

### KSOF-09 - Desktop And Release Evidence

Implement:
- Refresh route screenshots after KSOF waves.
- Re-run screen QA and route/browser proof.
- Validate final packet against `repo_implemented_operating_fit` rows.
- Preserve `LAWOS_VAULT_BRIDGE_TOKEN` and production smoke blockers honestly.

Exit:
- Release packet can say operating-fit UI implementation is repo-complete.
- It cannot say public release, go-live, provider writes, signing, or production smoke are complete.

## Validator Additions

Add or extend validators so they fail when:
- a UI row has `operating_fit_required=true` but no `saas_baseline_source_ids`
- a Matter-linked row lacks `client_ref`, `matter_ref`, or `people_responsibility`
- a Matter action can create document, billing, comms, contract, or audit output without triad context
- a Client CRM row closes without a path to Matter handoff or explicit pre-Matter disposition
- an ERP-like billing, payment, tax, AR, analytics, settlement, time, or expense row closes outside Matter scope
- a People/HRX row is treated as optional appendix when it controls Matter responsibility, capacity, approval, conflict, or ethical-wall state
- a Client opportunity/intake/conflict row can reach `Matter opening` without client identity, engagement scope, and proposed People owner
- a billing/payment/tax row lacks Matter id, client payer, responsible People owner/reviewer, source request, or audit ref
- a Matter team member is created from free-form identity without HRX employee/user linkage or owner-review-required state
- a visible action lacks a command/request/dry-run/config/readback target
- an import row lacks mapping, duplicate check, row error report, or dry-run proof
- provider effects are marked complete without provider receipt and approval
- People rows remain static `setup_required`, `integration_required`, or `audit_required` after their KSOF wave
- a release packet upgrades provider/go-live claims from UI evidence alone

Implemented scripts:
- `npm run lcx:full:korea-saas-fit:validate`
- `npm run lcx:full:concept-fit:validate`
- `npm run lcx:full:operating-fit-actions:validate`
- `npm run lcx:full:operating-fit-final:validate`

## Execution Order

1. KSOF-00 and KSOF-01 first. Without shared kernels, every UI will reimplement approvals, runs, provider states, and audit badly.
2. KSOF-01A before any domain closure. Without the original concept spine, Client, Matter, and People can look complete while the app is still concept-broken.
3. KSOF-02 and KSOF-03 next. Document/Vault and imports are highest-value and mostly repo-owned, but they must consume `triadContext`.
4. KSOF-04 through KSOF-06 next. Client CRM, contracts, billing, payment, and tax need provider boundaries but must prove the Client-to-Matter and Matter-scoped ERP path.
5. KSOF-07 as a focused People tranche. It has the largest row count and must prove HRX as People responsibility, not an optional HR appendix.
6. KSOF-08 and KSOF-09 close the decision/audit/release proof surface, with the final packet checking concept-fit before any UI-complete claim.

## Non-Claims

This plan does not authorize:
- production Vault writes
- real Matter/Client migration
- e-sign envelope sending
- external email, Kakao, SMS, or CRM activation
- payment approval, cancellation, or money movement
- tax invoice issue or Hometax submission
- payroll calculation, close, or disbursement
- public release, go-live, Windows signing, or store distribution

## Implementation Receipt

Validated on 2026-06-30:

- `npm run lcx:full:korea-saas-fit:validate`: PASS, 22 official source rows and 21 UI matrix rows checked.
- `npm run lcx:full:concept-fit:validate`: PASS, 105 openable rows and 5 concept-spine rows checked.
- `npm run lcx:full:operating-fit-final:validate`: PASS, with 46 `closed_repo_implemented`, 49 `closed_request_only`, 7 `closed_dry_run_only`, and 3 `blocked_external_receipt_required` rows.

Evidence:

- `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-korea-saas-fit-validation.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-concept-fit-validation.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-operating-fit-final-validation.json`

Release preflight boundary remains separate: `LCX-FULL-19.01` is failed, `LCX-FULL-19.03` is blocked, and this plan still makes no public release, production go-live, provider production write, external send, money movement, tax invoice issue, or payroll disbursement claim.
