# RP29 Commercial Readiness Detailed Micro Phases v1

Purpose: expand RP29 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP29 Commercial Readiness
- Scope: CI/CD, observability, SOC2/ISMS-P reports, release
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H29
- Claude Code gate: C29
- Immediate next implementation target: RP29.P00.M00

## RP29.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/commercial-contract.json, packages/commercial/README.md, contracts/commercial-readiness-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP29.P00.M00 | Inventory spec and acceptance source | Extract CI/CD, observability, SOC2/ISMS-P reports, release requirements and identify unverified release, missing observability, and compliance evidence gap as explicit acceptance risks.
- RP29.P00.M01 | Draft contract shell | Create the future Commercial Readiness contract shape for ReleaseCandidate, DeploymentRun, ObservabilitySignal, ComplianceReport, IncidentRunbook, CustomerPlan.
- RP29.P00.M02 | Define ownership boundary | Record which module owns ReleaseCandidate, DeploymentRun, and ObservabilitySignal, and which modules may only reference them.
- RP29.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for release candidate creation, CI/CD validation, and observability review.
- RP29.P00.M04 | Define Matter-first trace rules | State how Commercial Readiness records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP29.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Commercial Readiness behavior can run.
- RP29.P00.M06 | Define synthetic-only fixture policy | State that Commercial Readiness examples use fake tenants, users, matters, documents, and financial values only.
- RP29.P00.M07 | Define validation command matrix | List the product commands required to verify Commercial Readiness planning and later implementation.
- RP29.P00.M08 | Prepare H29 preflight | Define the fields Hermes records before Commercial Readiness implementation starts.
- RP29.P00.M09 | Prepare C29 design brief | Prepare Claude Code questions around unverified release, missing observability, compliance evidence gap, and missing tests.
- RP29.P00.M10 | Close RP29.P00 handoff | Hand off a contract-first Commercial Readiness implementation scope to AI.

## RP29.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/commercial/src/model.js, packages/commercial/src/states.js, packages/commercial/src/registry.js

Target tests: packages/commercial/test/model.test.js

- RP29.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/commercial.
- RP29.P01.M01 | Implement ReleaseCandidate model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for ReleaseCandidate.
- RP29.P01.M02 | Implement DeploymentRun model | Define required fields, references, ownership metadata, and state constraints for DeploymentRun.
- RP29.P01.M03 | Implement ObservabilitySignal model | Define required fields, relationship references, allowed states, and security attributes for ObservabilitySignal.
- RP29.P01.M04 | Implement ComplianceReport model | Define required fields, lifecycle states, ownership boundaries, and audit references for ComplianceReport.
- RP29.P01.M05 | Implement IncidentRunbook model | Define required fields, state transitions, permission attributes, and reporting references for IncidentRunbook.
- RP29.P01.M06 | Implement relationship map | Map relationships among ReleaseCandidate, DeploymentRun, ObservabilitySignal, ComplianceReport, IncidentRunbook, CustomerPlan and their Core/Matter/DMS dependencies.
- RP29.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Commercial Readiness.
- RP29.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP29.P01.M09 | Export model registry | Export Commercial Readiness model definitions through a stable package interface.
- RP29.P01.M10 | Close domain model phase | Confirm the Commercial Readiness model surface is implementation-ready and does not require new scope decisions.

## RP29.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/commercial/src/service.js, packages/commercial/src/policies.js, packages/commercial/src/validators.js

Target tests: packages/commercial/test/service.test.js

- RP29.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for release candidate creation, CI/CD validation, and observability review.
- RP29.P02.M01 | Implement release candidate creation | Implement validation, permission precheck, audit hint, and state transition logic for release candidate creation.
- RP29.P02.M02 | Implement CI/CD validation | Implement validation, permission precheck, audit hint, and state transition logic for CI/CD validation.
- RP29.P02.M03 | Implement observability review | Implement validation, permission precheck, audit hint, and state transition logic for observability review.
- RP29.P02.M04 | Implement compliance report generation | Implement validation, permission precheck, audit hint, and state transition logic for compliance report generation.
- RP29.P02.M05 | Implement production release approval | Implement validation, permission precheck, audit hint, and state transition logic for production release approval.
- RP29.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for unverified release, missing observability, and compliance evidence gap.
- RP29.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Commercial Readiness operations.
- RP29.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H29.
- RP29.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Commercial Readiness outcomes to attorney or admin review instead of direct mutation.
- RP29.P02.M10 | Close service logic phase | Confirm Commercial Readiness services are deterministic, auditable, and fail closed where required.

## RP29.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/commercial/src/index.js, packages/commercial/src/api-contract.js, packages/commercial/src/errors.js

Target tests: packages/commercial/test/interface.test.js

- RP29.P03.M00 | Define public exports | Expose Commercial Readiness models, services, fixtures, validators, and error codes from package index.
- RP29.P03.M01 | Define release candidate creation API | Lock request, response, permission, audit, and error shape for release candidate creation.
- RP29.P03.M02 | Define CI/CD validation API | Lock request, response, permission, audit, and error shape for CI/CD validation.
- RP29.P03.M03 | Define observability review API | Lock request, response, permission, audit, and error shape for observability review.
- RP29.P03.M04 | Define compliance report generation API | Lock request, response, permission, audit, and error shape for compliance report generation.
- RP29.P03.M05 | Define production release approval API | Lock request, response, permission, audit, and error shape for production release approval.
- RP29.P03.M06 | Define serialization contract | Ensure Commercial Readiness API responses serialize without leaking hidden policy internals or unauthorized data.
- RP29.P03.M07 | Define stable error codes | Add error codes for unverified release, missing observability, compliance evidence gap, unsafe deploy, and review_required.
- RP29.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H29 evidence without making Hermes product authority.
- RP29.P03.M09 | Define Claude review summary | Expose enough interface summary for C29 cross-validation.
- RP29.P03.M10 | Close API interface phase | Freeze Commercial Readiness public interface until a later RP explicitly extends it.

## RP29.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp29-ui-surface.md

Target tests: npm run build

- RP29.P04.M00 | Inventory UI surfaces | Identify release dashboard, deployment status, observability console, and compliance report viewer in the Jira-like Law Firm OS UI.
- RP29.P04.M01 | Plan release dashboard | Map data, loading state, empty state, denied state, and audit hints for release dashboard.
- RP29.P04.M02 | Plan deployment status | Map data, loading state, empty state, denied state, and audit hints for deployment status.
- RP29.P04.M03 | Plan observability console | Map data, loading state, empty state, denied state, and audit hints for observability console.
- RP29.P04.M04 | Plan compliance report viewer | Map data, loading state, empty state, denied state, and audit hints for compliance report viewer.
- RP29.P04.M05 | Plan review-required UI | Show high-risk Commercial Readiness outcomes as review queue items, not silent successes.
- RP29.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Commercial Readiness rows, counts, snippets, and citations are hidden before display.
- RP29.P04.M07 | Plan responsive density | Keep Commercial Readiness context readable on desktop and mobile without marketing-page layout.
- RP29.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Commercial Readiness service decisions.
- RP29.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Commercial Readiness.
- RP29.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP29.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/commercial/src/fixtures.js, packages/commercial/fixtures/golden-cases.json

Target tests: packages/commercial/test/golden-cases.test.js

- RP29.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Commercial Readiness.
- RP29.P05.M01 | Define release candidate validated golden case | Create a synthetic golden case proving release candidate validated.
- RP29.P05.M02 | Define deployment evidence captured golden case | Create a synthetic golden case proving deployment evidence captured.
- RP29.P05.M03 | Define SOC2 report generated golden case | Create a synthetic golden case proving SOC2 report generated.
- RP29.P05.M04 | Define release approval blocks unsafe deploy golden case | Create a synthetic golden case proving release approval blocks unsafe deploy.
- RP29.P05.M05 | Define unverified release failure fixture | Create a synthetic failing case that proves unverified release is blocked or reviewed.
- RP29.P05.M06 | Define missing observability failure fixture | Create a synthetic failing case that proves missing observability is blocked or reviewed.
- RP29.P05.M07 | Define compliance evidence gap failure fixture | Create a synthetic failing case that proves compliance evidence gap is blocked or reviewed.
- RP29.P05.M08 | Define replayable fixture manifest | Serialize Commercial Readiness fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP29.P05.M09 | Define AI retrieval/report fixture | If Commercial Readiness appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP29.P05.M10 | Close fixtures phase | Confirm Commercial Readiness fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP29.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/commercial/src/security-contract.js, packages/commercial/src/audit-hints.js, packages/audit/README.md

Target tests: packages/commercial/test/security-audit.test.js

- RP29.P06.M00 | Define permission contract | Specify required permission checks for release candidate creation, CI/CD validation, observability review, and compliance report generation.
- RP29.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Commercial Readiness view and search surfaces.
- RP29.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Commercial Readiness mutations.
- RP29.P06.M03 | Bind export/download permission | Return stronger audit hints for Commercial Readiness export, download, or external-share actions.
- RP29.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Commercial Readiness.
- RP29.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Commercial Readiness where applicable.
- RP29.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Commercial Readiness obey security trimming.
- RP29.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Commercial Readiness.
- RP29.P06.M08 | Prepare H29 audit evidence | Record which Commercial Readiness decisions require downstream audit event persistence.
- RP29.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Commercial Readiness.
- RP29.P06.M10 | Close permission audit integration | Confirm Commercial Readiness cannot ship without permission and audit evidence coverage.

## RP29.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/commercial/test/failure-cases.test.js, docs/rp29-recovery-notes.md

Target tests: packages/commercial/test/failure-cases.test.js

- RP29.P07.M00 | Define unverified release failure | Fail closed or require review when unverified release appears in Commercial Readiness.
- RP29.P07.M01 | Define missing observability failure | Fail closed or require review when missing observability appears in Commercial Readiness.
- RP29.P07.M02 | Define compliance evidence gap failure | Fail closed or require review when compliance evidence gap appears in Commercial Readiness.
- RP29.P07.M03 | Define unsafe deploy failure | Fail closed or require review when unsafe deploy appears in Commercial Readiness.
- RP29.P07.M04 | Define customer plan mismatch failure | Fail closed or require review when customer plan mismatch appears in Commercial Readiness.
- RP29.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Commercial Readiness.
- RP29.P07.M06 | Define cross-tenant failure | Deny or block any Commercial Readiness operation where actor and resource tenant IDs differ.
- RP29.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Commercial Readiness operations.
- RP29.P07.M08 | Define recovery handoff | Document how a failed Commercial Readiness micro phase is corrected before advancing.
- RP29.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Commercial Readiness.
- RP29.P07.M10 | Close failure phase | Confirm dangerous Commercial Readiness ambiguity fails closed or requires review.

## RP29.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp29-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP29.P08.M00 | Define H29 command matrix | Record exact product commands Hermes should run for Commercial Readiness.
- RP29.P08.M01 | Define H29 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP29.P08.M02 | Define H29 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Commercial Readiness.
- RP29.P08.M03 | Define H29 no-real-data evidence | Record that Commercial Readiness fixtures and examples contain only synthetic data.
- RP29.P08.M04 | Define H29 blocked-claim evidence | Record unsafe Commercial Readiness claims rejected by validators or tests.
- RP29.P08.M05 | Define H29 Claude dependency | Mark C29 review mandatory before Commercial Readiness closeout.
- RP29.P08.M06 | Define H29 human approval note | Record what the human must approve for Commercial Readiness.
- RP29.P08.M07 | Test H29 command availability | Ensure npm scripts required by H29 exist before handoff.
- RP29.P08.M08 | Prepare H29 evidence packet template | Create the evidence template Hermes will fill during Commercial Readiness implementation closeout.
- RP29.P08.M09 | Prepare H29 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H29.
- RP29.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Commercial Readiness behavior without owning product code.

## RP29.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp29-claude-cross-validation-brief.md, docs/rp29-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP29.P09.M00 | Prepare RP29 architecture review questions | Ask whether Commercial Readiness module boundaries, model shapes, and workflows match the specification.
- RP29.P09.M01 | Prepare RP29 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Commercial Readiness.
- RP29.P09.M02 | Prepare RP29 bypass review questions | Ask Claude to find unverified release, missing observability, compliance evidence gap, unsafe deploy, and customer plan mismatch bypasses.
- RP29.P09.M03 | Prepare RP29 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Commercial Readiness.
- RP29.P09.M04 | Prepare RP29 downstream readiness questions | Ask whether Commercial Readiness is ready for dependent modules and later enterprise hardening.
- RP29.P09.M05 | Prepare RP29 risk register | List unresolved Commercial Readiness risks and route them to future RP corrections.
- RP29.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Commercial Readiness findings.
- RP29.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Commercial Readiness closeout.
- RP29.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP29.Pxx.Mxx correction or later RP dependency.
- RP29.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Commercial Readiness can be considered ready.
- RP29.P09.M10 | Close RP29 detailed plan | Confirm Commercial Readiness is detailed enough for AI implementation without more planning decisions.

