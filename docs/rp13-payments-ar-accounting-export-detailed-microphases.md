# RP13 Payments AR Accounting Export Detailed Micro Phases v1

Purpose: expand RP13 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP13 Payments AR Accounting Export
- Scope: Payment matching, AR aging, journal entry, VAT export
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H13
- Claude Code gate: C13
- Immediate next implementation target: RP13.P00.M00

## RP13.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/payments-contract.json, packages/payments/README.md, contracts/payments-ar-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP13.P00.M00 | Inventory spec and acceptance source | Extract Payment matching, AR aging, journal entry, VAT export requirements and identify misallocated payment, unbalanced journal, and VAT export error as explicit acceptance risks.
- RP13.P00.M01 | Draft contract shell | Create the future Payments AR Accounting Export contract shape for Payment, PaymentMatch, ARAgingBucket, JournalEntry, VATExport, Receipt.
- RP13.P00.M02 | Define ownership boundary | Record which module owns Payment, PaymentMatch, and ARAgingBucket, and which modules may only reference them.
- RP13.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for payment import, invoice matching, and AR aging.
- RP13.P00.M04 | Define Matter-first trace rules | State how Payments AR Accounting Export records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP13.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Payments AR Accounting Export behavior can run.
- RP13.P00.M06 | Define synthetic-only fixture policy | State that Payments AR Accounting Export examples use fake tenants, users, matters, documents, and financial values only.
- RP13.P00.M07 | Define validation command matrix | List the product commands required to verify Payments AR Accounting Export planning and later implementation.
- RP13.P00.M08 | Prepare H13 preflight | Define the fields Hermes records before Payments AR Accounting Export implementation starts.
- RP13.P00.M09 | Prepare C13 design brief | Prepare Claude Code questions around misallocated payment, unbalanced journal, VAT export error, and missing tests.
- RP13.P00.M10 | Close RP13.P00 handoff | Hand off a contract-first Payments AR Accounting Export implementation scope to AI.

## RP13.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/payments/src/model.js, packages/payments/src/states.js, packages/payments/src/registry.js

Target tests: packages/payments/test/model.test.js

- RP13.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/payments.
- RP13.P01.M01 | Implement Payment model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for Payment.
- RP13.P01.M02 | Implement PaymentMatch model | Define required fields, references, ownership metadata, and state constraints for PaymentMatch.
- RP13.P01.M03 | Implement ARAgingBucket model | Define required fields, relationship references, allowed states, and security attributes for ARAgingBucket.
- RP13.P01.M04 | Implement JournalEntry model | Define required fields, lifecycle states, ownership boundaries, and audit references for JournalEntry.
- RP13.P01.M05 | Implement VATExport model | Define required fields, state transitions, permission attributes, and reporting references for VATExport.
- RP13.P01.M06 | Implement relationship map | Map relationships among Payment, PaymentMatch, ARAgingBucket, JournalEntry, VATExport, Receipt and their Core/Matter/DMS dependencies.
- RP13.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Payments AR Accounting Export.
- RP13.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP13.P01.M09 | Export model registry | Export Payments AR Accounting Export model definitions through a stable package interface.
- RP13.P01.M10 | Close domain model phase | Confirm the Payments AR Accounting Export model surface is implementation-ready and does not require new scope decisions.

## RP13.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/payments/src/service.js, packages/payments/src/policies.js, packages/payments/src/validators.js

Target tests: packages/payments/test/service.test.js

- RP13.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for payment import, invoice matching, and AR aging.
- RP13.P02.M01 | Implement payment import | Implement validation, permission precheck, audit hint, and state transition logic for payment import.
- RP13.P02.M02 | Implement invoice matching | Implement validation, permission precheck, audit hint, and state transition logic for invoice matching.
- RP13.P02.M03 | Implement AR aging | Implement validation, permission precheck, audit hint, and state transition logic for AR aging.
- RP13.P02.M04 | Implement journal export | Implement validation, permission precheck, audit hint, and state transition logic for journal export.
- RP13.P02.M05 | Implement VAT export | Implement validation, permission precheck, audit hint, and state transition logic for VAT export.
- RP13.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for misallocated payment, unbalanced journal, and VAT export error.
- RP13.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Payments AR Accounting Export operations.
- RP13.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H13.
- RP13.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Payments AR Accounting Export outcomes to attorney or admin review instead of direct mutation.
- RP13.P02.M10 | Close service logic phase | Confirm Payments AR Accounting Export services are deterministic, auditable, and fail closed where required.

## RP13.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/payments/src/index.js, packages/payments/src/api-contract.js, packages/payments/src/errors.js

Target tests: packages/payments/test/interface.test.js

- RP13.P03.M00 | Define public exports | Expose Payments AR Accounting Export models, services, fixtures, validators, and error codes from package index.
- RP13.P03.M01 | Define payment import API | Lock request, response, permission, audit, and error shape for payment import.
- RP13.P03.M02 | Define invoice matching API | Lock request, response, permission, audit, and error shape for invoice matching.
- RP13.P03.M03 | Define AR aging API | Lock request, response, permission, audit, and error shape for AR aging.
- RP13.P03.M04 | Define journal export API | Lock request, response, permission, audit, and error shape for journal export.
- RP13.P03.M05 | Define VAT export API | Lock request, response, permission, audit, and error shape for VAT export.
- RP13.P03.M06 | Define serialization contract | Ensure Payments AR Accounting Export API responses serialize without leaking hidden policy internals or unauthorized data.
- RP13.P03.M07 | Define stable error codes | Add error codes for misallocated payment, unbalanced journal, VAT export error, duplicate receipt, and review_required.
- RP13.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H13 evidence without making Hermes product authority.
- RP13.P03.M09 | Define Claude review summary | Expose enough interface summary for C13 cross-validation.
- RP13.P03.M10 | Close API interface phase | Freeze Payments AR Accounting Export public interface until a later RP explicitly extends it.

## RP13.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp13-ui-surface.md

Target tests: npm run build

- RP13.P04.M00 | Inventory UI surfaces | Identify payment matching queue, AR aging dashboard, journal export panel, and receipt detail in the Jira-like Law Firm OS UI.
- RP13.P04.M01 | Plan payment matching queue | Map data, loading state, empty state, denied state, and audit hints for payment matching queue.
- RP13.P04.M02 | Plan AR aging dashboard | Map data, loading state, empty state, denied state, and audit hints for AR aging dashboard.
- RP13.P04.M03 | Plan journal export panel | Map data, loading state, empty state, denied state, and audit hints for journal export panel.
- RP13.P04.M04 | Plan receipt detail | Map data, loading state, empty state, denied state, and audit hints for receipt detail.
- RP13.P04.M05 | Plan review-required UI | Show high-risk Payments AR Accounting Export outcomes as review queue items, not silent successes.
- RP13.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Payments AR Accounting Export rows, counts, snippets, and citations are hidden before display.
- RP13.P04.M07 | Plan responsive density | Keep Payments AR Accounting Export context readable on desktop and mobile without marketing-page layout.
- RP13.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Payments AR Accounting Export service decisions.
- RP13.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Payments AR Accounting Export.
- RP13.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP13.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/payments/src/fixtures.js, packages/payments/fixtures/golden-cases.json

Target tests: packages/payments/test/golden-cases.test.js

- RP13.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Payments AR Accounting Export.
- RP13.P05.M01 | Define payment matched golden case | Create a synthetic golden case proving payment matched.
- RP13.P05.M02 | Define partial payment allocated golden case | Create a synthetic golden case proving partial payment allocated.
- RP13.P05.M03 | Define AR aging updated golden case | Create a synthetic golden case proving AR aging updated.
- RP13.P05.M04 | Define journal export balanced golden case | Create a synthetic golden case proving journal export balanced.
- RP13.P05.M05 | Define misallocated payment failure fixture | Create a synthetic failing case that proves misallocated payment is blocked or reviewed.
- RP13.P05.M06 | Define unbalanced journal failure fixture | Create a synthetic failing case that proves unbalanced journal is blocked or reviewed.
- RP13.P05.M07 | Define VAT export error failure fixture | Create a synthetic failing case that proves VAT export error is blocked or reviewed.
- RP13.P05.M08 | Define replayable fixture manifest | Serialize Payments AR Accounting Export fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP13.P05.M09 | Define AI retrieval/report fixture | If Payments AR Accounting Export appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP13.P05.M10 | Close fixtures phase | Confirm Payments AR Accounting Export fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP13.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/payments/src/security-contract.js, packages/payments/src/audit-hints.js, packages/audit/README.md

Target tests: packages/payments/test/security-audit.test.js

- RP13.P06.M00 | Define permission contract | Specify required permission checks for payment import, invoice matching, AR aging, and journal export.
- RP13.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Payments AR Accounting Export view and search surfaces.
- RP13.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Payments AR Accounting Export mutations.
- RP13.P06.M03 | Bind export/download permission | Return stronger audit hints for Payments AR Accounting Export export, download, or external-share actions.
- RP13.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Payments AR Accounting Export.
- RP13.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Payments AR Accounting Export where applicable.
- RP13.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Payments AR Accounting Export obey security trimming.
- RP13.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Payments AR Accounting Export.
- RP13.P06.M08 | Prepare H13 audit evidence | Record which Payments AR Accounting Export decisions require downstream audit event persistence.
- RP13.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Payments AR Accounting Export.
- RP13.P06.M10 | Close permission audit integration | Confirm Payments AR Accounting Export cannot ship without permission and audit evidence coverage.

## RP13.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/payments/test/failure-cases.test.js, docs/rp13-recovery-notes.md

Target tests: packages/payments/test/failure-cases.test.js

- RP13.P07.M00 | Define misallocated payment failure | Fail closed or require review when misallocated payment appears in Payments AR Accounting Export.
- RP13.P07.M01 | Define unbalanced journal failure | Fail closed or require review when unbalanced journal appears in Payments AR Accounting Export.
- RP13.P07.M02 | Define VAT export error failure | Fail closed or require review when VAT export error appears in Payments AR Accounting Export.
- RP13.P07.M03 | Define duplicate receipt failure | Fail closed or require review when duplicate receipt appears in Payments AR Accounting Export.
- RP13.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Payments AR Accounting Export.
- RP13.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Payments AR Accounting Export.
- RP13.P07.M06 | Define cross-tenant failure | Deny or block any Payments AR Accounting Export operation where actor and resource tenant IDs differ.
- RP13.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Payments AR Accounting Export operations.
- RP13.P07.M08 | Define recovery handoff | Document how a failed Payments AR Accounting Export micro phase is corrected before advancing.
- RP13.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Payments AR Accounting Export.
- RP13.P07.M10 | Close failure phase | Confirm dangerous Payments AR Accounting Export ambiguity fails closed or requires review.

## RP13.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp13-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP13.P08.M00 | Define H13 command matrix | Record exact product commands Hermes should run for Payments AR Accounting Export.
- RP13.P08.M01 | Define H13 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP13.P08.M02 | Define H13 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Payments AR Accounting Export.
- RP13.P08.M03 | Define H13 no-real-data evidence | Record that Payments AR Accounting Export fixtures and examples contain only synthetic data.
- RP13.P08.M04 | Define H13 blocked-claim evidence | Record unsafe Payments AR Accounting Export claims rejected by validators or tests.
- RP13.P08.M05 | Define H13 Claude dependency | Mark C13 review mandatory before Payments AR Accounting Export closeout.
- RP13.P08.M06 | Define H13 human approval note | Record what the human must approve for Payments AR Accounting Export.
- RP13.P08.M07 | Test H13 command availability | Ensure npm scripts required by H13 exist before handoff.
- RP13.P08.M08 | Prepare H13 evidence packet template | Create the evidence template Hermes will fill during Payments AR Accounting Export implementation closeout.
- RP13.P08.M09 | Prepare H13 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H13.
- RP13.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Payments AR Accounting Export behavior without owning product code.

## RP13.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp13-claude-cross-validation-brief.md, docs/rp13-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP13.P09.M00 | Prepare RP13 architecture review questions | Ask whether Payments AR Accounting Export module boundaries, model shapes, and workflows match the specification.
- RP13.P09.M01 | Prepare RP13 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Payments AR Accounting Export.
- RP13.P09.M02 | Prepare RP13 bypass review questions | Ask Claude to find misallocated payment, unbalanced journal, VAT export error, duplicate receipt, and undefined bypasses.
- RP13.P09.M03 | Prepare RP13 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Payments AR Accounting Export.
- RP13.P09.M04 | Prepare RP13 downstream readiness questions | Ask whether Payments AR Accounting Export is ready for dependent modules and later enterprise hardening.
- RP13.P09.M05 | Prepare RP13 risk register | List unresolved Payments AR Accounting Export risks and route them to future RP corrections.
- RP13.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Payments AR Accounting Export findings.
- RP13.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Payments AR Accounting Export closeout.
- RP13.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP13.Pxx.Mxx correction or later RP dependency.
- RP13.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Payments AR Accounting Export can be considered ready.
- RP13.P09.M10 | Close RP13 detailed plan | Confirm Payments AR Accounting Export is detailed enough for AI implementation without more planning decisions.

