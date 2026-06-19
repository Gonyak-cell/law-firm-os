# RP11 Time Expense Disbursement Detailed Micro Phases v1

Purpose: expand RP11 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP11 Time Expense Disbursement
- Scope: TimeEntry, rate card, expense, disbursement, evidence documents
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H11
- Claude Code gate: C11
- Immediate next implementation target: RP11.P00.M00

## RP11.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/time-expense-contract.json, packages/time-expense/README.md, contracts/time-expense-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP11.P00.M00 | Inventory spec and acceptance source | Extract TimeEntry, rate card, expense, disbursement, evidence documents requirements and identify wrong rate, missing evidence, and post-close entry as explicit acceptance risks.
- RP11.P00.M01 | Draft contract shell | Create the future Time Expense Disbursement contract shape for TimeEntry, RateCard, Expense, Disbursement, EvidenceDocument, ApprovalState.
- RP11.P00.M02 | Define ownership boundary | Record which module owns TimeEntry, RateCard, and Expense, and which modules may only reference them.
- RP11.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for time capture, timer conversion, and expense submission.
- RP11.P00.M04 | Define Matter-first trace rules | State how Time Expense Disbursement records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP11.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Time Expense Disbursement behavior can run.
- RP11.P00.M06 | Define synthetic-only fixture policy | State that Time Expense Disbursement examples use fake tenants, users, matters, documents, and financial values only.
- RP11.P00.M07 | Define validation command matrix | List the product commands required to verify Time Expense Disbursement planning and later implementation.
- RP11.P00.M08 | Prepare H11 preflight | Define the fields Hermes records before Time Expense Disbursement implementation starts.
- RP11.P00.M09 | Prepare C11 design brief | Prepare Claude Code questions around wrong rate, missing evidence, post-close entry, and missing tests.
- RP11.P00.M10 | Close RP11.P00 handoff | Hand off a contract-first Time Expense Disbursement implementation scope to AI.

## RP11.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/time-expense/src/model.js, packages/time-expense/src/states.js, packages/time-expense/src/registry.js

Target tests: packages/time-expense/test/model.test.js

- RP11.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/time-expense.
- RP11.P01.M01 | Implement TimeEntry model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for TimeEntry.
- RP11.P01.M02 | Implement RateCard model | Define required fields, references, ownership metadata, and state constraints for RateCard.
- RP11.P01.M03 | Implement Expense model | Define required fields, relationship references, allowed states, and security attributes for Expense.
- RP11.P01.M04 | Implement Disbursement model | Define required fields, lifecycle states, ownership boundaries, and audit references for Disbursement.
- RP11.P01.M05 | Implement EvidenceDocument model | Define required fields, state transitions, permission attributes, and reporting references for EvidenceDocument.
- RP11.P01.M06 | Implement relationship map | Map relationships among TimeEntry, RateCard, Expense, Disbursement, EvidenceDocument, ApprovalState and their Core/Matter/DMS dependencies.
- RP11.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Time Expense Disbursement.
- RP11.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP11.P01.M09 | Export model registry | Export Time Expense Disbursement model definitions through a stable package interface.
- RP11.P01.M10 | Close domain model phase | Confirm the Time Expense Disbursement model surface is implementation-ready and does not require new scope decisions.

## RP11.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/time-expense/src/service.js, packages/time-expense/src/policies.js, packages/time-expense/src/validators.js

Target tests: packages/time-expense/test/service.test.js

- RP11.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for time capture, timer conversion, and expense submission.
- RP11.P02.M01 | Implement time capture | Implement validation, permission precheck, audit hint, and state transition logic for time capture.
- RP11.P02.M02 | Implement timer conversion | Implement validation, permission precheck, audit hint, and state transition logic for timer conversion.
- RP11.P02.M03 | Implement expense submission | Implement validation, permission precheck, audit hint, and state transition logic for expense submission.
- RP11.P02.M04 | Implement evidence attachment | Implement validation, permission precheck, audit hint, and state transition logic for evidence attachment.
- RP11.P02.M05 | Implement approval routing | Implement validation, permission precheck, audit hint, and state transition logic for approval routing.
- RP11.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for wrong rate, missing evidence, and post-close entry.
- RP11.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Time Expense Disbursement operations.
- RP11.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H11.
- RP11.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Time Expense Disbursement outcomes to attorney or admin review instead of direct mutation.
- RP11.P02.M10 | Close service logic phase | Confirm Time Expense Disbursement services are deterministic, auditable, and fail closed where required.

## RP11.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/time-expense/src/index.js, packages/time-expense/src/api-contract.js, packages/time-expense/src/errors.js

Target tests: packages/time-expense/test/interface.test.js

- RP11.P03.M00 | Define public exports | Expose Time Expense Disbursement models, services, fixtures, validators, and error codes from package index.
- RP11.P03.M01 | Define time capture API | Lock request, response, permission, audit, and error shape for time capture.
- RP11.P03.M02 | Define timer conversion API | Lock request, response, permission, audit, and error shape for timer conversion.
- RP11.P03.M03 | Define expense submission API | Lock request, response, permission, audit, and error shape for expense submission.
- RP11.P03.M04 | Define evidence attachment API | Lock request, response, permission, audit, and error shape for evidence attachment.
- RP11.P03.M05 | Define approval routing API | Lock request, response, permission, audit, and error shape for approval routing.
- RP11.P03.M06 | Define serialization contract | Ensure Time Expense Disbursement API responses serialize without leaking hidden policy internals or unauthorized data.
- RP11.P03.M07 | Define stable error codes | Add error codes for wrong rate, missing evidence, post-close entry, unapproved expense billed, and review_required.
- RP11.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H11 evidence without making Hermes product authority.
- RP11.P03.M09 | Define Claude review summary | Expose enough interface summary for C11 cross-validation.
- RP11.P03.M10 | Close API interface phase | Freeze Time Expense Disbursement public interface until a later RP explicitly extends it.

## RP11.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp11-ui-surface.md

Target tests: npm run build

- RP11.P04.M00 | Inventory UI surfaces | Identify timesheet, timer, expense form, and approval inbox in the Jira-like Law Firm OS UI.
- RP11.P04.M01 | Plan timesheet | Map data, loading state, empty state, denied state, and audit hints for timesheet.
- RP11.P04.M02 | Plan timer | Map data, loading state, empty state, denied state, and audit hints for timer.
- RP11.P04.M03 | Plan expense form | Map data, loading state, empty state, denied state, and audit hints for expense form.
- RP11.P04.M04 | Plan approval inbox | Map data, loading state, empty state, denied state, and audit hints for approval inbox.
- RP11.P04.M05 | Plan review-required UI | Show high-risk Time Expense Disbursement outcomes as review queue items, not silent successes.
- RP11.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Time Expense Disbursement rows, counts, snippets, and citations are hidden before display.
- RP11.P04.M07 | Plan responsive density | Keep Time Expense Disbursement context readable on desktop and mobile without marketing-page layout.
- RP11.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Time Expense Disbursement service decisions.
- RP11.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Time Expense Disbursement.
- RP11.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP11.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/time-expense/src/fixtures.js, packages/time-expense/fixtures/golden-cases.json

Target tests: packages/time-expense/test/golden-cases.test.js

- RP11.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Time Expense Disbursement.
- RP11.P05.M01 | Define time entry billable golden case | Create a synthetic golden case proving time entry billable.
- RP11.P05.M02 | Define expense with evidence approved golden case | Create a synthetic golden case proving expense with evidence approved.
- RP11.P05.M03 | Define rate card applied golden case | Create a synthetic golden case proving rate card applied.
- RP11.P05.M04 | Define rejected expense excluded golden case | Create a synthetic golden case proving rejected expense excluded.
- RP11.P05.M05 | Define wrong rate failure fixture | Create a synthetic failing case that proves wrong rate is blocked or reviewed.
- RP11.P05.M06 | Define missing evidence failure fixture | Create a synthetic failing case that proves missing evidence is blocked or reviewed.
- RP11.P05.M07 | Define post-close entry failure fixture | Create a synthetic failing case that proves post-close entry is blocked or reviewed.
- RP11.P05.M08 | Define replayable fixture manifest | Serialize Time Expense Disbursement fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP11.P05.M09 | Define AI retrieval/report fixture | If Time Expense Disbursement appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP11.P05.M10 | Close fixtures phase | Confirm Time Expense Disbursement fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP11.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/time-expense/src/security-contract.js, packages/time-expense/src/audit-hints.js, packages/audit/README.md

Target tests: packages/time-expense/test/security-audit.test.js

- RP11.P06.M00 | Define permission contract | Specify required permission checks for time capture, timer conversion, expense submission, and evidence attachment.
- RP11.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Time Expense Disbursement view and search surfaces.
- RP11.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Time Expense Disbursement mutations.
- RP11.P06.M03 | Bind export/download permission | Return stronger audit hints for Time Expense Disbursement export, download, or external-share actions.
- RP11.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Time Expense Disbursement.
- RP11.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Time Expense Disbursement where applicable.
- RP11.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Time Expense Disbursement obey security trimming.
- RP11.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Time Expense Disbursement.
- RP11.P06.M08 | Prepare H11 audit evidence | Record which Time Expense Disbursement decisions require downstream audit event persistence.
- RP11.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Time Expense Disbursement.
- RP11.P06.M10 | Close permission audit integration | Confirm Time Expense Disbursement cannot ship without permission and audit evidence coverage.

## RP11.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/time-expense/test/failure-cases.test.js, docs/rp11-recovery-notes.md

Target tests: packages/time-expense/test/failure-cases.test.js

- RP11.P07.M00 | Define wrong rate failure | Fail closed or require review when wrong rate appears in Time Expense Disbursement.
- RP11.P07.M01 | Define missing evidence failure | Fail closed or require review when missing evidence appears in Time Expense Disbursement.
- RP11.P07.M02 | Define post-close entry failure | Fail closed or require review when post-close entry appears in Time Expense Disbursement.
- RP11.P07.M03 | Define unapproved expense billed failure | Fail closed or require review when unapproved expense billed appears in Time Expense Disbursement.
- RP11.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Time Expense Disbursement.
- RP11.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Time Expense Disbursement.
- RP11.P07.M06 | Define cross-tenant failure | Deny or block any Time Expense Disbursement operation where actor and resource tenant IDs differ.
- RP11.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Time Expense Disbursement operations.
- RP11.P07.M08 | Define recovery handoff | Document how a failed Time Expense Disbursement micro phase is corrected before advancing.
- RP11.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Time Expense Disbursement.
- RP11.P07.M10 | Close failure phase | Confirm dangerous Time Expense Disbursement ambiguity fails closed or requires review.

## RP11.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp11-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP11.P08.M00 | Define H11 command matrix | Record exact product commands Hermes should run for Time Expense Disbursement.
- RP11.P08.M01 | Define H11 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP11.P08.M02 | Define H11 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Time Expense Disbursement.
- RP11.P08.M03 | Define H11 no-real-data evidence | Record that Time Expense Disbursement fixtures and examples contain only synthetic data.
- RP11.P08.M04 | Define H11 blocked-claim evidence | Record unsafe Time Expense Disbursement claims rejected by validators or tests.
- RP11.P08.M05 | Define H11 Claude dependency | Mark C11 review mandatory before Time Expense Disbursement closeout.
- RP11.P08.M06 | Define H11 human approval note | Record what the human must approve for Time Expense Disbursement.
- RP11.P08.M07 | Test H11 command availability | Ensure npm scripts required by H11 exist before handoff.
- RP11.P08.M08 | Prepare H11 evidence packet template | Create the evidence template Hermes will fill during Time Expense Disbursement implementation closeout.
- RP11.P08.M09 | Prepare H11 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H11.
- RP11.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Time Expense Disbursement behavior without owning product code.

## RP11.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp11-claude-cross-validation-brief.md, docs/rp11-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP11.P09.M00 | Prepare RP11 architecture review questions | Ask whether Time Expense Disbursement module boundaries, model shapes, and workflows match the specification.
- RP11.P09.M01 | Prepare RP11 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Time Expense Disbursement.
- RP11.P09.M02 | Prepare RP11 bypass review questions | Ask Claude to find wrong rate, missing evidence, post-close entry, unapproved expense billed, and undefined bypasses.
- RP11.P09.M03 | Prepare RP11 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Time Expense Disbursement.
- RP11.P09.M04 | Prepare RP11 downstream readiness questions | Ask whether Time Expense Disbursement is ready for dependent modules and later enterprise hardening.
- RP11.P09.M05 | Prepare RP11 risk register | List unresolved Time Expense Disbursement risks and route them to future RP corrections.
- RP11.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Time Expense Disbursement findings.
- RP11.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Time Expense Disbursement closeout.
- RP11.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP11.Pxx.Mxx correction or later RP dependency.
- RP11.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Time Expense Disbursement can be considered ready.
- RP11.P09.M10 | Close RP11 detailed plan | Confirm Time Expense Disbursement is detailed enough for AI implementation without more planning decisions.

