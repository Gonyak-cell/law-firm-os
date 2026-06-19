# RP16 Governance DLP Retention Detailed Micro Phases v1

Purpose: expand RP16 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP16 Governance DLP Retention
- Scope: DLP, legal hold, retention, break-glass, incident response
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H16
- Claude Code gate: C16
- Immediate next implementation target: RP16.P00.M00

## RP16.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/governance-contract.json, packages/governance/README.md, contracts/governance-dlp-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP16.P00.M00 | Inventory spec and acceptance source | Extract DLP, legal hold, retention, break-glass, incident response requirements and identify DLP bypass, hold deletion, and break-glass abuse as explicit acceptance risks.
- RP16.P00.M01 | Draft contract shell | Create the future Governance DLP Retention contract shape for DLPPolicy, LegalHold, RetentionRule, BreakGlassSession, Incident, GovernanceReview.
- RP16.P00.M02 | Define ownership boundary | Record which module owns DLPPolicy, LegalHold, and RetentionRule, and which modules may only reference them.
- RP16.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for DLP evaluation, legal hold activation, and retention scheduling.
- RP16.P00.M04 | Define Matter-first trace rules | State how Governance DLP Retention records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP16.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Governance DLP Retention behavior can run.
- RP16.P00.M06 | Define synthetic-only fixture policy | State that Governance DLP Retention examples use fake tenants, users, matters, documents, and financial values only.
- RP16.P00.M07 | Define validation command matrix | List the product commands required to verify Governance DLP Retention planning and later implementation.
- RP16.P00.M08 | Prepare H16 preflight | Define the fields Hermes records before Governance DLP Retention implementation starts.
- RP16.P00.M09 | Prepare C16 design brief | Prepare Claude Code questions around DLP bypass, hold deletion, break-glass abuse, and missing tests.
- RP16.P00.M10 | Close RP16.P00 handoff | Hand off a contract-first Governance DLP Retention implementation scope to AI.

## RP16.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/governance/src/model.js, packages/governance/src/states.js, packages/governance/src/registry.js

Target tests: packages/governance/test/model.test.js

- RP16.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/governance.
- RP16.P01.M01 | Implement DLPPolicy model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for DLPPolicy.
- RP16.P01.M02 | Implement LegalHold model | Define required fields, references, ownership metadata, and state constraints for LegalHold.
- RP16.P01.M03 | Implement RetentionRule model | Define required fields, relationship references, allowed states, and security attributes for RetentionRule.
- RP16.P01.M04 | Implement BreakGlassSession model | Define required fields, lifecycle states, ownership boundaries, and audit references for BreakGlassSession.
- RP16.P01.M05 | Implement Incident model | Define required fields, state transitions, permission attributes, and reporting references for Incident.
- RP16.P01.M06 | Implement relationship map | Map relationships among DLPPolicy, LegalHold, RetentionRule, BreakGlassSession, Incident, GovernanceReview and their Core/Matter/DMS dependencies.
- RP16.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Governance DLP Retention.
- RP16.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP16.P01.M09 | Export model registry | Export Governance DLP Retention model definitions through a stable package interface.
- RP16.P01.M10 | Close domain model phase | Confirm the Governance DLP Retention model surface is implementation-ready and does not require new scope decisions.

## RP16.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/governance/src/service.js, packages/governance/src/policies.js, packages/governance/src/validators.js

Target tests: packages/governance/test/service.test.js

- RP16.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for DLP evaluation, legal hold activation, and retention scheduling.
- RP16.P02.M01 | Implement DLP evaluation | Implement validation, permission precheck, audit hint, and state transition logic for DLP evaluation.
- RP16.P02.M02 | Implement legal hold activation | Implement validation, permission precheck, audit hint, and state transition logic for legal hold activation.
- RP16.P02.M03 | Implement retention scheduling | Implement validation, permission precheck, audit hint, and state transition logic for retention scheduling.
- RP16.P02.M04 | Implement break-glass approval | Implement validation, permission precheck, audit hint, and state transition logic for break-glass approval.
- RP16.P02.M05 | Implement incident response | Implement validation, permission precheck, audit hint, and state transition logic for incident response.
- RP16.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for DLP bypass, hold deletion, and break-glass abuse.
- RP16.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Governance DLP Retention operations.
- RP16.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H16.
- RP16.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Governance DLP Retention outcomes to attorney or admin review instead of direct mutation.
- RP16.P02.M10 | Close service logic phase | Confirm Governance DLP Retention services are deterministic, auditable, and fail closed where required.

## RP16.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/governance/src/index.js, packages/governance/src/api-contract.js, packages/governance/src/errors.js

Target tests: packages/governance/test/interface.test.js

- RP16.P03.M00 | Define public exports | Expose Governance DLP Retention models, services, fixtures, validators, and error codes from package index.
- RP16.P03.M01 | Define DLP evaluation API | Lock request, response, permission, audit, and error shape for DLP evaluation.
- RP16.P03.M02 | Define legal hold activation API | Lock request, response, permission, audit, and error shape for legal hold activation.
- RP16.P03.M03 | Define retention scheduling API | Lock request, response, permission, audit, and error shape for retention scheduling.
- RP16.P03.M04 | Define break-glass approval API | Lock request, response, permission, audit, and error shape for break-glass approval.
- RP16.P03.M05 | Define incident response API | Lock request, response, permission, audit, and error shape for incident response.
- RP16.P03.M06 | Define serialization contract | Ensure Governance DLP Retention API responses serialize without leaking hidden policy internals or unauthorized data.
- RP16.P03.M07 | Define stable error codes | Add error codes for DLP bypass, hold deletion, break-glass abuse, retention over-delete, and review_required.
- RP16.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H16 evidence without making Hermes product authority.
- RP16.P03.M09 | Define Claude review summary | Expose enough interface summary for C16 cross-validation.
- RP16.P03.M10 | Close API interface phase | Freeze Governance DLP Retention public interface until a later RP explicitly extends it.

## RP16.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp16-ui-surface.md

Target tests: npm run build

- RP16.P04.M00 | Inventory UI surfaces | Identify DLP policy console, legal hold panel, retention calendar, and break-glass review in the Jira-like Law Firm OS UI.
- RP16.P04.M01 | Plan DLP policy console | Map data, loading state, empty state, denied state, and audit hints for DLP policy console.
- RP16.P04.M02 | Plan legal hold panel | Map data, loading state, empty state, denied state, and audit hints for legal hold panel.
- RP16.P04.M03 | Plan retention calendar | Map data, loading state, empty state, denied state, and audit hints for retention calendar.
- RP16.P04.M04 | Plan break-glass review | Map data, loading state, empty state, denied state, and audit hints for break-glass review.
- RP16.P04.M05 | Plan review-required UI | Show high-risk Governance DLP Retention outcomes as review queue items, not silent successes.
- RP16.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Governance DLP Retention rows, counts, snippets, and citations are hidden before display.
- RP16.P04.M07 | Plan responsive density | Keep Governance DLP Retention context readable on desktop and mobile without marketing-page layout.
- RP16.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Governance DLP Retention service decisions.
- RP16.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Governance DLP Retention.
- RP16.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP16.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/governance/src/fixtures.js, packages/governance/fixtures/golden-cases.json

Target tests: packages/governance/test/golden-cases.test.js

- RP16.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Governance DLP Retention.
- RP16.P05.M01 | Define DLP blocks export golden case | Create a synthetic golden case proving DLP blocks export.
- RP16.P05.M02 | Define legal hold prevents delete golden case | Create a synthetic golden case proving legal hold prevents delete.
- RP16.P05.M03 | Define retention action queued golden case | Create a synthetic golden case proving retention action queued.
- RP16.P05.M04 | Define break-glass audited golden case | Create a synthetic golden case proving break-glass audited.
- RP16.P05.M05 | Define DLP bypass failure fixture | Create a synthetic failing case that proves DLP bypass is blocked or reviewed.
- RP16.P05.M06 | Define hold deletion failure fixture | Create a synthetic failing case that proves hold deletion is blocked or reviewed.
- RP16.P05.M07 | Define break-glass abuse failure fixture | Create a synthetic failing case that proves break-glass abuse is blocked or reviewed.
- RP16.P05.M08 | Define replayable fixture manifest | Serialize Governance DLP Retention fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP16.P05.M09 | Define AI retrieval/report fixture | If Governance DLP Retention appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP16.P05.M10 | Close fixtures phase | Confirm Governance DLP Retention fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP16.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/governance/src/security-contract.js, packages/governance/src/audit-hints.js, packages/audit/README.md

Target tests: packages/governance/test/security-audit.test.js

- RP16.P06.M00 | Define permission contract | Specify required permission checks for DLP evaluation, legal hold activation, retention scheduling, and break-glass approval.
- RP16.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Governance DLP Retention view and search surfaces.
- RP16.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Governance DLP Retention mutations.
- RP16.P06.M03 | Bind export/download permission | Return stronger audit hints for Governance DLP Retention export, download, or external-share actions.
- RP16.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Governance DLP Retention.
- RP16.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Governance DLP Retention where applicable.
- RP16.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Governance DLP Retention obey security trimming.
- RP16.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Governance DLP Retention.
- RP16.P06.M08 | Prepare H16 audit evidence | Record which Governance DLP Retention decisions require downstream audit event persistence.
- RP16.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Governance DLP Retention.
- RP16.P06.M10 | Close permission audit integration | Confirm Governance DLP Retention cannot ship without permission and audit evidence coverage.

## RP16.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/governance/test/failure-cases.test.js, docs/rp16-recovery-notes.md

Target tests: packages/governance/test/failure-cases.test.js

- RP16.P07.M00 | Define DLP bypass failure | Fail closed or require review when DLP bypass appears in Governance DLP Retention.
- RP16.P07.M01 | Define hold deletion failure | Fail closed or require review when hold deletion appears in Governance DLP Retention.
- RP16.P07.M02 | Define break-glass abuse failure | Fail closed or require review when break-glass abuse appears in Governance DLP Retention.
- RP16.P07.M03 | Define retention over-delete failure | Fail closed or require review when retention over-delete appears in Governance DLP Retention.
- RP16.P07.M04 | Define incident evidence gap failure | Fail closed or require review when incident evidence gap appears in Governance DLP Retention.
- RP16.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Governance DLP Retention.
- RP16.P07.M06 | Define cross-tenant failure | Deny or block any Governance DLP Retention operation where actor and resource tenant IDs differ.
- RP16.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Governance DLP Retention operations.
- RP16.P07.M08 | Define recovery handoff | Document how a failed Governance DLP Retention micro phase is corrected before advancing.
- RP16.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Governance DLP Retention.
- RP16.P07.M10 | Close failure phase | Confirm dangerous Governance DLP Retention ambiguity fails closed or requires review.

## RP16.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp16-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP16.P08.M00 | Define H16 command matrix | Record exact product commands Hermes should run for Governance DLP Retention.
- RP16.P08.M01 | Define H16 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP16.P08.M02 | Define H16 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Governance DLP Retention.
- RP16.P08.M03 | Define H16 no-real-data evidence | Record that Governance DLP Retention fixtures and examples contain only synthetic data.
- RP16.P08.M04 | Define H16 blocked-claim evidence | Record unsafe Governance DLP Retention claims rejected by validators or tests.
- RP16.P08.M05 | Define H16 Claude dependency | Mark C16 review mandatory before Governance DLP Retention closeout.
- RP16.P08.M06 | Define H16 human approval note | Record what the human must approve for Governance DLP Retention.
- RP16.P08.M07 | Test H16 command availability | Ensure npm scripts required by H16 exist before handoff.
- RP16.P08.M08 | Prepare H16 evidence packet template | Create the evidence template Hermes will fill during Governance DLP Retention implementation closeout.
- RP16.P08.M09 | Prepare H16 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H16.
- RP16.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Governance DLP Retention behavior without owning product code.

## RP16.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp16-claude-cross-validation-brief.md, docs/rp16-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP16.P09.M00 | Prepare RP16 architecture review questions | Ask whether Governance DLP Retention module boundaries, model shapes, and workflows match the specification.
- RP16.P09.M01 | Prepare RP16 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Governance DLP Retention.
- RP16.P09.M02 | Prepare RP16 bypass review questions | Ask Claude to find DLP bypass, hold deletion, break-glass abuse, retention over-delete, and incident evidence gap bypasses.
- RP16.P09.M03 | Prepare RP16 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Governance DLP Retention.
- RP16.P09.M04 | Prepare RP16 downstream readiness questions | Ask whether Governance DLP Retention is ready for dependent modules and later enterprise hardening.
- RP16.P09.M05 | Prepare RP16 risk register | List unresolved Governance DLP Retention risks and route them to future RP corrections.
- RP16.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Governance DLP Retention findings.
- RP16.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Governance DLP Retention closeout.
- RP16.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP16.Pxx.Mxx correction or later RP dependency.
- RP16.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Governance DLP Retention can be considered ready.
- RP16.P09.M10 | Close RP16 detailed plan | Confirm Governance DLP Retention is detailed enough for AI implementation without more planning decisions.

