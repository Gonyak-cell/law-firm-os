# RP10 Intake Conflict Engagement Detailed Micro Phases v1

Purpose: expand RP10 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP10 Intake Conflict Engagement
- Scope: ConflictCheck, ConflictHit, Waiver, Engagement, Fee Terms
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H10
- Claude Code gate: C10
- Immediate next implementation target: RP10.P00.M00

## RP10.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/intake-contract.json, packages/intake/README.md, contracts/intake-conflict-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP10.P00.M00 | Inventory spec and acceptance source | Extract ConflictCheck, ConflictHit, Waiver, Engagement, Fee Terms requirements and identify missed conflict, waiver bypass, and fee term mismatch as explicit acceptance risks.
- RP10.P00.M01 | Draft contract shell | Create the future Intake Conflict Engagement contract shape for IntakeRequest, ConflictCheck, ConflictHit, Waiver, EngagementLetter, FeeTerm.
- RP10.P00.M02 | Define ownership boundary | Record which module owns IntakeRequest, ConflictCheck, and ConflictHit, and which modules may only reference them.
- RP10.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for intake submission, conflict search, and conflict review.
- RP10.P00.M04 | Define Matter-first trace rules | State how Intake Conflict Engagement records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP10.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Intake Conflict Engagement behavior can run.
- RP10.P00.M06 | Define synthetic-only fixture policy | State that Intake Conflict Engagement examples use fake tenants, users, matters, documents, and financial values only.
- RP10.P00.M07 | Define validation command matrix | List the product commands required to verify Intake Conflict Engagement planning and later implementation.
- RP10.P00.M08 | Prepare H10 preflight | Define the fields Hermes records before Intake Conflict Engagement implementation starts.
- RP10.P00.M09 | Prepare C10 design brief | Prepare Claude Code questions around missed conflict, waiver bypass, fee term mismatch, and missing tests.
- RP10.P00.M10 | Close RP10.P00 handoff | Hand off a contract-first Intake Conflict Engagement implementation scope to AI.

## RP10.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/intake/src/model.js, packages/intake/src/states.js, packages/intake/src/registry.js

Target tests: packages/intake/test/model.test.js

- RP10.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/intake.
- RP10.P01.M01 | Implement IntakeRequest model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for IntakeRequest.
- RP10.P01.M02 | Implement ConflictCheck model | Define required fields, references, ownership metadata, and state constraints for ConflictCheck.
- RP10.P01.M03 | Implement ConflictHit model | Define required fields, relationship references, allowed states, and security attributes for ConflictHit.
- RP10.P01.M04 | Implement Waiver model | Define required fields, lifecycle states, ownership boundaries, and audit references for Waiver.
- RP10.P01.M05 | Implement EngagementLetter model | Define required fields, state transitions, permission attributes, and reporting references for EngagementLetter.
- RP10.P01.M06 | Implement relationship map | Map relationships among IntakeRequest, ConflictCheck, ConflictHit, Waiver, EngagementLetter, FeeTerm and their Core/Matter/DMS dependencies.
- RP10.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Intake Conflict Engagement.
- RP10.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP10.P01.M09 | Export model registry | Export Intake Conflict Engagement model definitions through a stable package interface.
- RP10.P01.M10 | Close domain model phase | Confirm the Intake Conflict Engagement model surface is implementation-ready and does not require new scope decisions.

## RP10.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/intake/src/service.js, packages/intake/src/policies.js, packages/intake/src/validators.js

Target tests: packages/intake/test/service.test.js

- RP10.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for intake submission, conflict search, and conflict review.
- RP10.P02.M01 | Implement intake submission | Implement validation, permission precheck, audit hint, and state transition logic for intake submission.
- RP10.P02.M02 | Implement conflict search | Implement validation, permission precheck, audit hint, and state transition logic for conflict search.
- RP10.P02.M03 | Implement conflict review | Implement validation, permission precheck, audit hint, and state transition logic for conflict review.
- RP10.P02.M04 | Implement waiver approval | Implement validation, permission precheck, audit hint, and state transition logic for waiver approval.
- RP10.P02.M05 | Implement engagement issuance | Implement validation, permission precheck, audit hint, and state transition logic for engagement issuance.
- RP10.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for missed conflict, waiver bypass, and fee term mismatch.
- RP10.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Intake Conflict Engagement operations.
- RP10.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H10.
- RP10.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Intake Conflict Engagement outcomes to attorney or admin review instead of direct mutation.
- RP10.P02.M10 | Close service logic phase | Confirm Intake Conflict Engagement services are deterministic, auditable, and fail closed where required.

## RP10.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/intake/src/index.js, packages/intake/src/api-contract.js, packages/intake/src/errors.js

Target tests: packages/intake/test/interface.test.js

- RP10.P03.M00 | Define public exports | Expose Intake Conflict Engagement models, services, fixtures, validators, and error codes from package index.
- RP10.P03.M01 | Define intake submission API | Lock request, response, permission, audit, and error shape for intake submission.
- RP10.P03.M02 | Define conflict search API | Lock request, response, permission, audit, and error shape for conflict search.
- RP10.P03.M03 | Define conflict review API | Lock request, response, permission, audit, and error shape for conflict review.
- RP10.P03.M04 | Define waiver approval API | Lock request, response, permission, audit, and error shape for waiver approval.
- RP10.P03.M05 | Define engagement issuance API | Lock request, response, permission, audit, and error shape for engagement issuance.
- RP10.P03.M06 | Define serialization contract | Ensure Intake Conflict Engagement API responses serialize without leaking hidden policy internals or unauthorized data.
- RP10.P03.M07 | Define stable error codes | Add error codes for missed conflict, waiver bypass, fee term mismatch, engagement before approval, and review_required.
- RP10.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H10 evidence without making Hermes product authority.
- RP10.P03.M09 | Define Claude review summary | Expose enough interface summary for C10 cross-validation.
- RP10.P03.M10 | Close API interface phase | Freeze Intake Conflict Engagement public interface until a later RP explicitly extends it.

## RP10.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp10-ui-surface.md

Target tests: npm run build

- RP10.P04.M00 | Inventory UI surfaces | Identify intake queue, conflict hit review, waiver approval panel, and engagement wizard in the Jira-like Law Firm OS UI.
- RP10.P04.M01 | Plan intake queue | Map data, loading state, empty state, denied state, and audit hints for intake queue.
- RP10.P04.M02 | Plan conflict hit review | Map data, loading state, empty state, denied state, and audit hints for conflict hit review.
- RP10.P04.M03 | Plan waiver approval panel | Map data, loading state, empty state, denied state, and audit hints for waiver approval panel.
- RP10.P04.M04 | Plan engagement wizard | Map data, loading state, empty state, denied state, and audit hints for engagement wizard.
- RP10.P04.M05 | Plan review-required UI | Show high-risk Intake Conflict Engagement outcomes as review queue items, not silent successes.
- RP10.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Intake Conflict Engagement rows, counts, snippets, and citations are hidden before display.
- RP10.P04.M07 | Plan responsive density | Keep Intake Conflict Engagement context readable on desktop and mobile without marketing-page layout.
- RP10.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Intake Conflict Engagement service decisions.
- RP10.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Intake Conflict Engagement.
- RP10.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP10.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/intake/src/fixtures.js, packages/intake/fixtures/golden-cases.json

Target tests: packages/intake/test/golden-cases.test.js

- RP10.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Intake Conflict Engagement.
- RP10.P05.M01 | Define conflict clear golden case | Create a synthetic golden case proving conflict clear.
- RP10.P05.M02 | Define conflict hit blocks engagement golden case | Create a synthetic golden case proving conflict hit blocks engagement.
- RP10.P05.M03 | Define waiver approved golden case | Create a synthetic golden case proving waiver approved.
- RP10.P05.M04 | Define engagement signed golden case | Create a synthetic golden case proving engagement signed.
- RP10.P05.M05 | Define missed conflict failure fixture | Create a synthetic failing case that proves missed conflict is blocked or reviewed.
- RP10.P05.M06 | Define waiver bypass failure fixture | Create a synthetic failing case that proves waiver bypass is blocked or reviewed.
- RP10.P05.M07 | Define fee term mismatch failure fixture | Create a synthetic failing case that proves fee term mismatch is blocked or reviewed.
- RP10.P05.M08 | Define replayable fixture manifest | Serialize Intake Conflict Engagement fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP10.P05.M09 | Define AI retrieval/report fixture | If Intake Conflict Engagement appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP10.P05.M10 | Close fixtures phase | Confirm Intake Conflict Engagement fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP10.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/intake/src/security-contract.js, packages/intake/src/audit-hints.js, packages/audit/README.md

Target tests: packages/intake/test/security-audit.test.js

- RP10.P06.M00 | Define permission contract | Specify required permission checks for intake submission, conflict search, conflict review, and waiver approval.
- RP10.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Intake Conflict Engagement view and search surfaces.
- RP10.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Intake Conflict Engagement mutations.
- RP10.P06.M03 | Bind export/download permission | Return stronger audit hints for Intake Conflict Engagement export, download, or external-share actions.
- RP10.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Intake Conflict Engagement.
- RP10.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Intake Conflict Engagement where applicable.
- RP10.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Intake Conflict Engagement obey security trimming.
- RP10.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Intake Conflict Engagement.
- RP10.P06.M08 | Prepare H10 audit evidence | Record which Intake Conflict Engagement decisions require downstream audit event persistence.
- RP10.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Intake Conflict Engagement.
- RP10.P06.M10 | Close permission audit integration | Confirm Intake Conflict Engagement cannot ship without permission and audit evidence coverage.

## RP10.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/intake/test/failure-cases.test.js, docs/rp10-recovery-notes.md

Target tests: packages/intake/test/failure-cases.test.js

- RP10.P07.M00 | Define missed conflict failure | Fail closed or require review when missed conflict appears in Intake Conflict Engagement.
- RP10.P07.M01 | Define waiver bypass failure | Fail closed or require review when waiver bypass appears in Intake Conflict Engagement.
- RP10.P07.M02 | Define fee term mismatch failure | Fail closed or require review when fee term mismatch appears in Intake Conflict Engagement.
- RP10.P07.M03 | Define engagement before approval failure | Fail closed or require review when engagement before approval appears in Intake Conflict Engagement.
- RP10.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Intake Conflict Engagement.
- RP10.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Intake Conflict Engagement.
- RP10.P07.M06 | Define cross-tenant failure | Deny or block any Intake Conflict Engagement operation where actor and resource tenant IDs differ.
- RP10.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Intake Conflict Engagement operations.
- RP10.P07.M08 | Define recovery handoff | Document how a failed Intake Conflict Engagement micro phase is corrected before advancing.
- RP10.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Intake Conflict Engagement.
- RP10.P07.M10 | Close failure phase | Confirm dangerous Intake Conflict Engagement ambiguity fails closed or requires review.

## RP10.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp10-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP10.P08.M00 | Define H10 command matrix | Record exact product commands Hermes should run for Intake Conflict Engagement.
- RP10.P08.M01 | Define H10 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP10.P08.M02 | Define H10 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Intake Conflict Engagement.
- RP10.P08.M03 | Define H10 no-real-data evidence | Record that Intake Conflict Engagement fixtures and examples contain only synthetic data.
- RP10.P08.M04 | Define H10 blocked-claim evidence | Record unsafe Intake Conflict Engagement claims rejected by validators or tests.
- RP10.P08.M05 | Define H10 Claude dependency | Mark C10 review mandatory before Intake Conflict Engagement closeout.
- RP10.P08.M06 | Define H10 human approval note | Record what the human must approve for Intake Conflict Engagement.
- RP10.P08.M07 | Test H10 command availability | Ensure npm scripts required by H10 exist before handoff.
- RP10.P08.M08 | Prepare H10 evidence packet template | Create the evidence template Hermes will fill during Intake Conflict Engagement implementation closeout.
- RP10.P08.M09 | Prepare H10 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H10.
- RP10.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Intake Conflict Engagement behavior without owning product code.

## RP10.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp10-claude-cross-validation-brief.md, docs/rp10-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP10.P09.M00 | Prepare RP10 architecture review questions | Ask whether Intake Conflict Engagement module boundaries, model shapes, and workflows match the specification.
- RP10.P09.M01 | Prepare RP10 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Intake Conflict Engagement.
- RP10.P09.M02 | Prepare RP10 bypass review questions | Ask Claude to find missed conflict, waiver bypass, fee term mismatch, engagement before approval, and undefined bypasses.
- RP10.P09.M03 | Prepare RP10 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Intake Conflict Engagement.
- RP10.P09.M04 | Prepare RP10 downstream readiness questions | Ask whether Intake Conflict Engagement is ready for dependent modules and later enterprise hardening.
- RP10.P09.M05 | Prepare RP10 risk register | List unresolved Intake Conflict Engagement risks and route them to future RP corrections.
- RP10.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Intake Conflict Engagement findings.
- RP10.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Intake Conflict Engagement closeout.
- RP10.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP10.Pxx.Mxx correction or later RP dependency.
- RP10.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Intake Conflict Engagement can be considered ready.
- RP10.P09.M10 | Close RP10 detailed plan | Confirm Intake Conflict Engagement is detailed enough for AI implementation without more planning decisions.

