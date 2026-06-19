# RP27 Platform Extensibility Detailed Micro Phases v1

Purpose: expand RP27 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP27 Platform Extensibility
- Scope: public API, webhooks, workflow builder
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H27
- Claude Code gate: C27
- Immediate next implementation target: RP27.P00.M00

## RP27.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/platform-contract.json, packages/platform/README.md, contracts/platform-extensibility-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP27.P00.M00 | Inventory spec and acceptance source | Extract public API, webhooks, workflow builder requirements and identify API over-permission, webhook replay, and workflow unsafe mutation as explicit acceptance risks.
- RP27.P00.M01 | Draft contract shell | Create the future Platform Extensibility contract shape for PublicAPIKey, WebhookSubscription, WorkflowDefinition, WorkflowRun, ExtensionPermission, APIRateLimit.
- RP27.P00.M02 | Define ownership boundary | Record which module owns PublicAPIKey, WebhookSubscription, and WorkflowDefinition, and which modules may only reference them.
- RP27.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for API key issuance, webhook delivery, and workflow build.
- RP27.P00.M04 | Define Matter-first trace rules | State how Platform Extensibility records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP27.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Platform Extensibility behavior can run.
- RP27.P00.M06 | Define synthetic-only fixture policy | State that Platform Extensibility examples use fake tenants, users, matters, documents, and financial values only.
- RP27.P00.M07 | Define validation command matrix | List the product commands required to verify Platform Extensibility planning and later implementation.
- RP27.P00.M08 | Prepare H27 preflight | Define the fields Hermes records before Platform Extensibility implementation starts.
- RP27.P00.M09 | Prepare C27 design brief | Prepare Claude Code questions around API over-permission, webhook replay, workflow unsafe mutation, and missing tests.
- RP27.P00.M10 | Close RP27.P00 handoff | Hand off a contract-first Platform Extensibility implementation scope to AI.

## RP27.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/platform/src/model.js, packages/platform/src/states.js, packages/platform/src/registry.js

Target tests: packages/platform/test/model.test.js

- RP27.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/platform.
- RP27.P01.M01 | Implement PublicAPIKey model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for PublicAPIKey.
- RP27.P01.M02 | Implement WebhookSubscription model | Define required fields, references, ownership metadata, and state constraints for WebhookSubscription.
- RP27.P01.M03 | Implement WorkflowDefinition model | Define required fields, relationship references, allowed states, and security attributes for WorkflowDefinition.
- RP27.P01.M04 | Implement WorkflowRun model | Define required fields, lifecycle states, ownership boundaries, and audit references for WorkflowRun.
- RP27.P01.M05 | Implement ExtensionPermission model | Define required fields, state transitions, permission attributes, and reporting references for ExtensionPermission.
- RP27.P01.M06 | Implement relationship map | Map relationships among PublicAPIKey, WebhookSubscription, WorkflowDefinition, WorkflowRun, ExtensionPermission, APIRateLimit and their Core/Matter/DMS dependencies.
- RP27.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Platform Extensibility.
- RP27.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP27.P01.M09 | Export model registry | Export Platform Extensibility model definitions through a stable package interface.
- RP27.P01.M10 | Close domain model phase | Confirm the Platform Extensibility model surface is implementation-ready and does not require new scope decisions.

## RP27.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/platform/src/service.js, packages/platform/src/policies.js, packages/platform/src/validators.js

Target tests: packages/platform/test/service.test.js

- RP27.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for API key issuance, webhook delivery, and workflow build.
- RP27.P02.M01 | Implement API key issuance | Implement validation, permission precheck, audit hint, and state transition logic for API key issuance.
- RP27.P02.M02 | Implement webhook delivery | Implement validation, permission precheck, audit hint, and state transition logic for webhook delivery.
- RP27.P02.M03 | Implement workflow build | Implement validation, permission precheck, audit hint, and state transition logic for workflow build.
- RP27.P02.M04 | Implement workflow run | Implement validation, permission precheck, audit hint, and state transition logic for workflow run.
- RP27.P02.M05 | Implement extension permission review | Implement validation, permission precheck, audit hint, and state transition logic for extension permission review.
- RP27.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for API over-permission, webhook replay, and workflow unsafe mutation.
- RP27.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Platform Extensibility operations.
- RP27.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H27.
- RP27.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Platform Extensibility outcomes to attorney or admin review instead of direct mutation.
- RP27.P02.M10 | Close service logic phase | Confirm Platform Extensibility services are deterministic, auditable, and fail closed where required.

## RP27.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/platform/src/index.js, packages/platform/src/api-contract.js, packages/platform/src/errors.js

Target tests: packages/platform/test/interface.test.js

- RP27.P03.M00 | Define public exports | Expose Platform Extensibility models, services, fixtures, validators, and error codes from package index.
- RP27.P03.M01 | Define API key issuance API | Lock request, response, permission, audit, and error shape for API key issuance.
- RP27.P03.M02 | Define webhook delivery API | Lock request, response, permission, audit, and error shape for webhook delivery.
- RP27.P03.M03 | Define workflow build API | Lock request, response, permission, audit, and error shape for workflow build.
- RP27.P03.M04 | Define workflow run API | Lock request, response, permission, audit, and error shape for workflow run.
- RP27.P03.M05 | Define extension permission review API | Lock request, response, permission, audit, and error shape for extension permission review.
- RP27.P03.M06 | Define serialization contract | Ensure Platform Extensibility API responses serialize without leaking hidden policy internals or unauthorized data.
- RP27.P03.M07 | Define stable error codes | Add error codes for API over-permission, webhook replay, workflow unsafe mutation, rate limit bypass, and review_required.
- RP27.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H27 evidence without making Hermes product authority.
- RP27.P03.M09 | Define Claude review summary | Expose enough interface summary for C27 cross-validation.
- RP27.P03.M10 | Close API interface phase | Freeze Platform Extensibility public interface until a later RP explicitly extends it.

## RP27.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp27-ui-surface.md

Target tests: npm run build

- RP27.P04.M00 | Inventory UI surfaces | Identify developer console, webhook logs, workflow builder, and API usage panel in the Jira-like Law Firm OS UI.
- RP27.P04.M01 | Plan developer console | Map data, loading state, empty state, denied state, and audit hints for developer console.
- RP27.P04.M02 | Plan webhook logs | Map data, loading state, empty state, denied state, and audit hints for webhook logs.
- RP27.P04.M03 | Plan workflow builder | Map data, loading state, empty state, denied state, and audit hints for workflow builder.
- RP27.P04.M04 | Plan API usage panel | Map data, loading state, empty state, denied state, and audit hints for API usage panel.
- RP27.P04.M05 | Plan review-required UI | Show high-risk Platform Extensibility outcomes as review queue items, not silent successes.
- RP27.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Platform Extensibility rows, counts, snippets, and citations are hidden before display.
- RP27.P04.M07 | Plan responsive density | Keep Platform Extensibility context readable on desktop and mobile without marketing-page layout.
- RP27.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Platform Extensibility service decisions.
- RP27.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Platform Extensibility.
- RP27.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP27.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/platform/src/fixtures.js, packages/platform/fixtures/golden-cases.json

Target tests: packages/platform/test/golden-cases.test.js

- RP27.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Platform Extensibility.
- RP27.P05.M01 | Define API request authorized golden case | Create a synthetic golden case proving API request authorized.
- RP27.P05.M02 | Define webhook delivered golden case | Create a synthetic golden case proving webhook delivered.
- RP27.P05.M03 | Define workflow run audited golden case | Create a synthetic golden case proving workflow run audited.
- RP27.P05.M04 | Define rate limit enforced golden case | Create a synthetic golden case proving rate limit enforced.
- RP27.P05.M05 | Define API over-permission failure fixture | Create a synthetic failing case that proves API over-permission is blocked or reviewed.
- RP27.P05.M06 | Define webhook replay failure fixture | Create a synthetic failing case that proves webhook replay is blocked or reviewed.
- RP27.P05.M07 | Define workflow unsafe mutation failure fixture | Create a synthetic failing case that proves workflow unsafe mutation is blocked or reviewed.
- RP27.P05.M08 | Define replayable fixture manifest | Serialize Platform Extensibility fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP27.P05.M09 | Define AI retrieval/report fixture | If Platform Extensibility appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP27.P05.M10 | Close fixtures phase | Confirm Platform Extensibility fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP27.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/platform/src/security-contract.js, packages/platform/src/audit-hints.js, packages/audit/README.md

Target tests: packages/platform/test/security-audit.test.js

- RP27.P06.M00 | Define permission contract | Specify required permission checks for API key issuance, webhook delivery, workflow build, and workflow run.
- RP27.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Platform Extensibility view and search surfaces.
- RP27.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Platform Extensibility mutations.
- RP27.P06.M03 | Bind export/download permission | Return stronger audit hints for Platform Extensibility export, download, or external-share actions.
- RP27.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Platform Extensibility.
- RP27.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Platform Extensibility where applicable.
- RP27.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Platform Extensibility obey security trimming.
- RP27.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Platform Extensibility.
- RP27.P06.M08 | Prepare H27 audit evidence | Record which Platform Extensibility decisions require downstream audit event persistence.
- RP27.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Platform Extensibility.
- RP27.P06.M10 | Close permission audit integration | Confirm Platform Extensibility cannot ship without permission and audit evidence coverage.

## RP27.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/platform/test/failure-cases.test.js, docs/rp27-recovery-notes.md

Target tests: packages/platform/test/failure-cases.test.js

- RP27.P07.M00 | Define API over-permission failure | Fail closed or require review when API over-permission appears in Platform Extensibility.
- RP27.P07.M01 | Define webhook replay failure | Fail closed or require review when webhook replay appears in Platform Extensibility.
- RP27.P07.M02 | Define workflow unsafe mutation failure | Fail closed or require review when workflow unsafe mutation appears in Platform Extensibility.
- RP27.P07.M03 | Define rate limit bypass failure | Fail closed or require review when rate limit bypass appears in Platform Extensibility.
- RP27.P07.M04 | Define extension leak failure | Fail closed or require review when extension leak appears in Platform Extensibility.
- RP27.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Platform Extensibility.
- RP27.P07.M06 | Define cross-tenant failure | Deny or block any Platform Extensibility operation where actor and resource tenant IDs differ.
- RP27.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Platform Extensibility operations.
- RP27.P07.M08 | Define recovery handoff | Document how a failed Platform Extensibility micro phase is corrected before advancing.
- RP27.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Platform Extensibility.
- RP27.P07.M10 | Close failure phase | Confirm dangerous Platform Extensibility ambiguity fails closed or requires review.

## RP27.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp27-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP27.P08.M00 | Define H27 command matrix | Record exact product commands Hermes should run for Platform Extensibility.
- RP27.P08.M01 | Define H27 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP27.P08.M02 | Define H27 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Platform Extensibility.
- RP27.P08.M03 | Define H27 no-real-data evidence | Record that Platform Extensibility fixtures and examples contain only synthetic data.
- RP27.P08.M04 | Define H27 blocked-claim evidence | Record unsafe Platform Extensibility claims rejected by validators or tests.
- RP27.P08.M05 | Define H27 Claude dependency | Mark C27 review mandatory before Platform Extensibility closeout.
- RP27.P08.M06 | Define H27 human approval note | Record what the human must approve for Platform Extensibility.
- RP27.P08.M07 | Test H27 command availability | Ensure npm scripts required by H27 exist before handoff.
- RP27.P08.M08 | Prepare H27 evidence packet template | Create the evidence template Hermes will fill during Platform Extensibility implementation closeout.
- RP27.P08.M09 | Prepare H27 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H27.
- RP27.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Platform Extensibility behavior without owning product code.

## RP27.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp27-claude-cross-validation-brief.md, docs/rp27-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP27.P09.M00 | Prepare RP27 architecture review questions | Ask whether Platform Extensibility module boundaries, model shapes, and workflows match the specification.
- RP27.P09.M01 | Prepare RP27 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Platform Extensibility.
- RP27.P09.M02 | Prepare RP27 bypass review questions | Ask Claude to find API over-permission, webhook replay, workflow unsafe mutation, rate limit bypass, and extension leak bypasses.
- RP27.P09.M03 | Prepare RP27 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Platform Extensibility.
- RP27.P09.M04 | Prepare RP27 downstream readiness questions | Ask whether Platform Extensibility is ready for dependent modules and later enterprise hardening.
- RP27.P09.M05 | Prepare RP27 risk register | List unresolved Platform Extensibility risks and route them to future RP corrections.
- RP27.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Platform Extensibility findings.
- RP27.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Platform Extensibility closeout.
- RP27.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP27.Pxx.Mxx correction or later RP dependency.
- RP27.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Platform Extensibility can be considered ready.
- RP27.P09.M10 | Close RP27 detailed plan | Confirm Platform Extensibility is detailed enough for AI implementation without more planning decisions.

