# RP14 Partner Settlement Detailed Micro Phases v1

Purpose: expand RP14 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP14 Partner Settlement
- Scope: Origination, allocation, working credit, settlement run lock
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H14
- Claude Code gate: C14
- Immediate next implementation target: RP14.P00.M00

## RP14.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/settlement-contract.json, packages/settlement/README.md, contracts/partner-settlement-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP14.P00.M00 | Inventory spec and acceptance source | Extract Origination, allocation, working credit, settlement run lock requirements and identify wrong partner credit, unreviewed dispute, and run mutation after lock as explicit acceptance risks.
- RP14.P00.M01 | Draft contract shell | Create the future Partner Settlement contract shape for OriginationCredit, WorkingCredit, AllocationRule, SettlementRun, SettlementLine, Dispute.
- RP14.P00.M02 | Define ownership boundary | Record which module owns OriginationCredit, WorkingCredit, and AllocationRule, and which modules may only reference them.
- RP14.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for credit setup, allocation calculation, and settlement preview.
- RP14.P00.M04 | Define Matter-first trace rules | State how Partner Settlement records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP14.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Partner Settlement behavior can run.
- RP14.P00.M06 | Define synthetic-only fixture policy | State that Partner Settlement examples use fake tenants, users, matters, documents, and financial values only.
- RP14.P00.M07 | Define validation command matrix | List the product commands required to verify Partner Settlement planning and later implementation.
- RP14.P00.M08 | Prepare H14 preflight | Define the fields Hermes records before Partner Settlement implementation starts.
- RP14.P00.M09 | Prepare C14 design brief | Prepare Claude Code questions around wrong partner credit, unreviewed dispute, run mutation after lock, and missing tests.
- RP14.P00.M10 | Close RP14.P00 handoff | Hand off a contract-first Partner Settlement implementation scope to AI.

## RP14.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/settlement/src/model.js, packages/settlement/src/states.js, packages/settlement/src/registry.js

Target tests: packages/settlement/test/model.test.js

- RP14.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/settlement.
- RP14.P01.M01 | Implement OriginationCredit model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for OriginationCredit.
- RP14.P01.M02 | Implement WorkingCredit model | Define required fields, references, ownership metadata, and state constraints for WorkingCredit.
- RP14.P01.M03 | Implement AllocationRule model | Define required fields, relationship references, allowed states, and security attributes for AllocationRule.
- RP14.P01.M04 | Implement SettlementRun model | Define required fields, lifecycle states, ownership boundaries, and audit references for SettlementRun.
- RP14.P01.M05 | Implement SettlementLine model | Define required fields, state transitions, permission attributes, and reporting references for SettlementLine.
- RP14.P01.M06 | Implement relationship map | Map relationships among OriginationCredit, WorkingCredit, AllocationRule, SettlementRun, SettlementLine, Dispute and their Core/Matter/DMS dependencies.
- RP14.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Partner Settlement.
- RP14.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP14.P01.M09 | Export model registry | Export Partner Settlement model definitions through a stable package interface.
- RP14.P01.M10 | Close domain model phase | Confirm the Partner Settlement model surface is implementation-ready and does not require new scope decisions.

## RP14.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/settlement/src/service.js, packages/settlement/src/policies.js, packages/settlement/src/validators.js

Target tests: packages/settlement/test/service.test.js

- RP14.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for credit setup, allocation calculation, and settlement preview.
- RP14.P02.M01 | Implement credit setup | Implement validation, permission precheck, audit hint, and state transition logic for credit setup.
- RP14.P02.M02 | Implement allocation calculation | Implement validation, permission precheck, audit hint, and state transition logic for allocation calculation.
- RP14.P02.M03 | Implement settlement preview | Implement validation, permission precheck, audit hint, and state transition logic for settlement preview.
- RP14.P02.M04 | Implement dispute review | Implement validation, permission precheck, audit hint, and state transition logic for dispute review.
- RP14.P02.M05 | Implement run lock | Implement validation, permission precheck, audit hint, and state transition logic for run lock.
- RP14.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for wrong partner credit, unreviewed dispute, and run mutation after lock.
- RP14.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Partner Settlement operations.
- RP14.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H14.
- RP14.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Partner Settlement outcomes to attorney or admin review instead of direct mutation.
- RP14.P02.M10 | Close service logic phase | Confirm Partner Settlement services are deterministic, auditable, and fail closed where required.

## RP14.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/settlement/src/index.js, packages/settlement/src/api-contract.js, packages/settlement/src/errors.js

Target tests: packages/settlement/test/interface.test.js

- RP14.P03.M00 | Define public exports | Expose Partner Settlement models, services, fixtures, validators, and error codes from package index.
- RP14.P03.M01 | Define credit setup API | Lock request, response, permission, audit, and error shape for credit setup.
- RP14.P03.M02 | Define allocation calculation API | Lock request, response, permission, audit, and error shape for allocation calculation.
- RP14.P03.M03 | Define settlement preview API | Lock request, response, permission, audit, and error shape for settlement preview.
- RP14.P03.M04 | Define dispute review API | Lock request, response, permission, audit, and error shape for dispute review.
- RP14.P03.M05 | Define run lock API | Lock request, response, permission, audit, and error shape for run lock.
- RP14.P03.M06 | Define serialization contract | Ensure Partner Settlement API responses serialize without leaking hidden policy internals or unauthorized data.
- RP14.P03.M07 | Define stable error codes | Add error codes for wrong partner credit, unreviewed dispute, run mutation after lock, rounding drift, and review_required.
- RP14.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H14 evidence without making Hermes product authority.
- RP14.P03.M09 | Define Claude review summary | Expose enough interface summary for C14 cross-validation.
- RP14.P03.M10 | Close API interface phase | Freeze Partner Settlement public interface until a later RP explicitly extends it.

## RP14.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp14-ui-surface.md

Target tests: npm run build

- RP14.P04.M00 | Inventory UI surfaces | Identify settlement workbook, partner allocation view, dispute queue, and run lock banner in the Jira-like Law Firm OS UI.
- RP14.P04.M01 | Plan settlement workbook | Map data, loading state, empty state, denied state, and audit hints for settlement workbook.
- RP14.P04.M02 | Plan partner allocation view | Map data, loading state, empty state, denied state, and audit hints for partner allocation view.
- RP14.P04.M03 | Plan dispute queue | Map data, loading state, empty state, denied state, and audit hints for dispute queue.
- RP14.P04.M04 | Plan run lock banner | Map data, loading state, empty state, denied state, and audit hints for run lock banner.
- RP14.P04.M05 | Plan review-required UI | Show high-risk Partner Settlement outcomes as review queue items, not silent successes.
- RP14.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Partner Settlement rows, counts, snippets, and citations are hidden before display.
- RP14.P04.M07 | Plan responsive density | Keep Partner Settlement context readable on desktop and mobile without marketing-page layout.
- RP14.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Partner Settlement service decisions.
- RP14.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Partner Settlement.
- RP14.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP14.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/settlement/src/fixtures.js, packages/settlement/fixtures/golden-cases.json

Target tests: packages/settlement/test/golden-cases.test.js

- RP14.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Partner Settlement.
- RP14.P05.M01 | Define credit allocated golden case | Create a synthetic golden case proving credit allocated.
- RP14.P05.M02 | Define settlement preview reconciles golden case | Create a synthetic golden case proving settlement preview reconciles.
- RP14.P05.M03 | Define dispute blocks lock golden case | Create a synthetic golden case proving dispute blocks lock.
- RP14.P05.M04 | Define locked run immutable golden case | Create a synthetic golden case proving locked run immutable.
- RP14.P05.M05 | Define wrong partner credit failure fixture | Create a synthetic failing case that proves wrong partner credit is blocked or reviewed.
- RP14.P05.M06 | Define unreviewed dispute failure fixture | Create a synthetic failing case that proves unreviewed dispute is blocked or reviewed.
- RP14.P05.M07 | Define run mutation after lock failure fixture | Create a synthetic failing case that proves run mutation after lock is blocked or reviewed.
- RP14.P05.M08 | Define replayable fixture manifest | Serialize Partner Settlement fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP14.P05.M09 | Define AI retrieval/report fixture | If Partner Settlement appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP14.P05.M10 | Close fixtures phase | Confirm Partner Settlement fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP14.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/settlement/src/security-contract.js, packages/settlement/src/audit-hints.js, packages/audit/README.md

Target tests: packages/settlement/test/security-audit.test.js

- RP14.P06.M00 | Define permission contract | Specify required permission checks for credit setup, allocation calculation, settlement preview, and dispute review.
- RP14.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Partner Settlement view and search surfaces.
- RP14.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Partner Settlement mutations.
- RP14.P06.M03 | Bind export/download permission | Return stronger audit hints for Partner Settlement export, download, or external-share actions.
- RP14.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Partner Settlement.
- RP14.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Partner Settlement where applicable.
- RP14.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Partner Settlement obey security trimming.
- RP14.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Partner Settlement.
- RP14.P06.M08 | Prepare H14 audit evidence | Record which Partner Settlement decisions require downstream audit event persistence.
- RP14.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Partner Settlement.
- RP14.P06.M10 | Close permission audit integration | Confirm Partner Settlement cannot ship without permission and audit evidence coverage.

## RP14.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/settlement/test/failure-cases.test.js, docs/rp14-recovery-notes.md

Target tests: packages/settlement/test/failure-cases.test.js

- RP14.P07.M00 | Define wrong partner credit failure | Fail closed or require review when wrong partner credit appears in Partner Settlement.
- RP14.P07.M01 | Define unreviewed dispute failure | Fail closed or require review when unreviewed dispute appears in Partner Settlement.
- RP14.P07.M02 | Define run mutation after lock failure | Fail closed or require review when run mutation after lock appears in Partner Settlement.
- RP14.P07.M03 | Define rounding drift failure | Fail closed or require review when rounding drift appears in Partner Settlement.
- RP14.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Partner Settlement.
- RP14.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Partner Settlement.
- RP14.P07.M06 | Define cross-tenant failure | Deny or block any Partner Settlement operation where actor and resource tenant IDs differ.
- RP14.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Partner Settlement operations.
- RP14.P07.M08 | Define recovery handoff | Document how a failed Partner Settlement micro phase is corrected before advancing.
- RP14.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Partner Settlement.
- RP14.P07.M10 | Close failure phase | Confirm dangerous Partner Settlement ambiguity fails closed or requires review.

## RP14.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp14-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP14.P08.M00 | Define H14 command matrix | Record exact product commands Hermes should run for Partner Settlement.
- RP14.P08.M01 | Define H14 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP14.P08.M02 | Define H14 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Partner Settlement.
- RP14.P08.M03 | Define H14 no-real-data evidence | Record that Partner Settlement fixtures and examples contain only synthetic data.
- RP14.P08.M04 | Define H14 blocked-claim evidence | Record unsafe Partner Settlement claims rejected by validators or tests.
- RP14.P08.M05 | Define H14 Claude dependency | Mark C14 review mandatory before Partner Settlement closeout.
- RP14.P08.M06 | Define H14 human approval note | Record what the human must approve for Partner Settlement.
- RP14.P08.M07 | Test H14 command availability | Ensure npm scripts required by H14 exist before handoff.
- RP14.P08.M08 | Prepare H14 evidence packet template | Create the evidence template Hermes will fill during Partner Settlement implementation closeout.
- RP14.P08.M09 | Prepare H14 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H14.
- RP14.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Partner Settlement behavior without owning product code.

## RP14.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp14-claude-cross-validation-brief.md, docs/rp14-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP14.P09.M00 | Prepare RP14 architecture review questions | Ask whether Partner Settlement module boundaries, model shapes, and workflows match the specification.
- RP14.P09.M01 | Prepare RP14 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Partner Settlement.
- RP14.P09.M02 | Prepare RP14 bypass review questions | Ask Claude to find wrong partner credit, unreviewed dispute, run mutation after lock, rounding drift, and undefined bypasses.
- RP14.P09.M03 | Prepare RP14 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Partner Settlement.
- RP14.P09.M04 | Prepare RP14 downstream readiness questions | Ask whether Partner Settlement is ready for dependent modules and later enterprise hardening.
- RP14.P09.M05 | Prepare RP14 risk register | List unresolved Partner Settlement risks and route them to future RP corrections.
- RP14.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Partner Settlement findings.
- RP14.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Partner Settlement closeout.
- RP14.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP14.Pxx.Mxx correction or later RP dependency.
- RP14.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Partner Settlement can be considered ready.
- RP14.P09.M10 | Close RP14 detailed plan | Confirm Partner Settlement is detailed enough for AI implementation without more planning decisions.

