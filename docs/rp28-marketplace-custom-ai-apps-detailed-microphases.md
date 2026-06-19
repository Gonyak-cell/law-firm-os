# RP28 Marketplace And Custom AI Apps Detailed Micro Phases v1

Purpose: expand RP28 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP28 Marketplace And Custom AI Apps
- Scope: app registry, connector SDK, custom AI app review gate
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H28
- Claude Code gate: C28
- Immediate next implementation target: RP28.P00.M00

## RP28.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/marketplace-contract.json, packages/marketplace/README.md, contracts/marketplace-custom-ai-apps-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP28.P00.M00 | Inventory spec and acceptance source | Extract app registry, connector SDK, custom AI app review gate requirements and identify unsafe app permission, custom AI data leak, and unreviewed connector as explicit acceptance risks.
- RP28.P00.M01 | Draft contract shell | Create the future Marketplace And Custom AI Apps contract shape for MarketplaceApp, ConnectorSDK, CustomAIApp, ReviewGate, AppPermission, InstallReceipt.
- RP28.P00.M02 | Define ownership boundary | Record which module owns MarketplaceApp, ConnectorSDK, and CustomAIApp, and which modules may only reference them.
- RP28.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for app submission, permission review, and AI app policy check.
- RP28.P00.M04 | Define Matter-first trace rules | State how Marketplace And Custom AI Apps records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP28.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Marketplace And Custom AI Apps behavior can run.
- RP28.P00.M06 | Define synthetic-only fixture policy | State that Marketplace And Custom AI Apps examples use fake tenants, users, matters, documents, and financial values only.
- RP28.P00.M07 | Define validation command matrix | List the product commands required to verify Marketplace And Custom AI Apps planning and later implementation.
- RP28.P00.M08 | Prepare H28 preflight | Define the fields Hermes records before Marketplace And Custom AI Apps implementation starts.
- RP28.P00.M09 | Prepare C28 design brief | Prepare Claude Code questions around unsafe app permission, custom AI data leak, unreviewed connector, and missing tests.
- RP28.P00.M10 | Close RP28.P00 handoff | Hand off a contract-first Marketplace And Custom AI Apps implementation scope to AI.

## RP28.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/marketplace/src/model.js, packages/marketplace/src/states.js, packages/marketplace/src/registry.js

Target tests: packages/marketplace/test/model.test.js

- RP28.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/marketplace.
- RP28.P01.M01 | Implement MarketplaceApp model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for MarketplaceApp.
- RP28.P01.M02 | Implement ConnectorSDK model | Define required fields, references, ownership metadata, and state constraints for ConnectorSDK.
- RP28.P01.M03 | Implement CustomAIApp model | Define required fields, relationship references, allowed states, and security attributes for CustomAIApp.
- RP28.P01.M04 | Implement ReviewGate model | Define required fields, lifecycle states, ownership boundaries, and audit references for ReviewGate.
- RP28.P01.M05 | Implement AppPermission model | Define required fields, state transitions, permission attributes, and reporting references for AppPermission.
- RP28.P01.M06 | Implement relationship map | Map relationships among MarketplaceApp, ConnectorSDK, CustomAIApp, ReviewGate, AppPermission, InstallReceipt and their Core/Matter/DMS dependencies.
- RP28.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Marketplace And Custom AI Apps.
- RP28.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP28.P01.M09 | Export model registry | Export Marketplace And Custom AI Apps model definitions through a stable package interface.
- RP28.P01.M10 | Close domain model phase | Confirm the Marketplace And Custom AI Apps model surface is implementation-ready and does not require new scope decisions.

## RP28.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/marketplace/src/service.js, packages/marketplace/src/policies.js, packages/marketplace/src/validators.js

Target tests: packages/marketplace/test/service.test.js

- RP28.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for app submission, permission review, and AI app policy check.
- RP28.P02.M01 | Implement app submission | Implement validation, permission precheck, audit hint, and state transition logic for app submission.
- RP28.P02.M02 | Implement permission review | Implement validation, permission precheck, audit hint, and state transition logic for permission review.
- RP28.P02.M03 | Implement AI app policy check | Implement validation, permission precheck, audit hint, and state transition logic for AI app policy check.
- RP28.P02.M04 | Implement tenant install | Implement validation, permission precheck, audit hint, and state transition logic for tenant install.
- RP28.P02.M05 | Implement app update review | Implement validation, permission precheck, audit hint, and state transition logic for app update review.
- RP28.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for unsafe app permission, custom AI data leak, and unreviewed connector.
- RP28.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Marketplace And Custom AI Apps operations.
- RP28.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H28.
- RP28.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Marketplace And Custom AI Apps outcomes to attorney or admin review instead of direct mutation.
- RP28.P02.M10 | Close service logic phase | Confirm Marketplace And Custom AI Apps services are deterministic, auditable, and fail closed where required.

## RP28.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/marketplace/src/index.js, packages/marketplace/src/api-contract.js, packages/marketplace/src/errors.js

Target tests: packages/marketplace/test/interface.test.js

- RP28.P03.M00 | Define public exports | Expose Marketplace And Custom AI Apps models, services, fixtures, validators, and error codes from package index.
- RP28.P03.M01 | Define app submission API | Lock request, response, permission, audit, and error shape for app submission.
- RP28.P03.M02 | Define permission review API | Lock request, response, permission, audit, and error shape for permission review.
- RP28.P03.M03 | Define AI app policy check API | Lock request, response, permission, audit, and error shape for AI app policy check.
- RP28.P03.M04 | Define tenant install API | Lock request, response, permission, audit, and error shape for tenant install.
- RP28.P03.M05 | Define app update review API | Lock request, response, permission, audit, and error shape for app update review.
- RP28.P03.M06 | Define serialization contract | Ensure Marketplace And Custom AI Apps API responses serialize without leaking hidden policy internals or unauthorized data.
- RP28.P03.M07 | Define stable error codes | Add error codes for unsafe app permission, custom AI data leak, unreviewed connector, malicious update, and review_required.
- RP28.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H28 evidence without making Hermes product authority.
- RP28.P03.M09 | Define Claude review summary | Expose enough interface summary for C28 cross-validation.
- RP28.P03.M10 | Close API interface phase | Freeze Marketplace And Custom AI Apps public interface until a later RP explicitly extends it.

## RP28.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp28-ui-surface.md

Target tests: npm run build

- RP28.P04.M00 | Inventory UI surfaces | Identify marketplace catalog, app detail, permission review, and install receipt in the Jira-like Law Firm OS UI.
- RP28.P04.M01 | Plan marketplace catalog | Map data, loading state, empty state, denied state, and audit hints for marketplace catalog.
- RP28.P04.M02 | Plan app detail | Map data, loading state, empty state, denied state, and audit hints for app detail.
- RP28.P04.M03 | Plan permission review | Map data, loading state, empty state, denied state, and audit hints for permission review.
- RP28.P04.M04 | Plan install receipt | Map data, loading state, empty state, denied state, and audit hints for install receipt.
- RP28.P04.M05 | Plan review-required UI | Show high-risk Marketplace And Custom AI Apps outcomes as review queue items, not silent successes.
- RP28.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Marketplace And Custom AI Apps rows, counts, snippets, and citations are hidden before display.
- RP28.P04.M07 | Plan responsive density | Keep Marketplace And Custom AI Apps context readable on desktop and mobile without marketing-page layout.
- RP28.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Marketplace And Custom AI Apps service decisions.
- RP28.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Marketplace And Custom AI Apps.
- RP28.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP28.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/marketplace/src/fixtures.js, packages/marketplace/fixtures/golden-cases.json

Target tests: packages/marketplace/test/golden-cases.test.js

- RP28.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Marketplace And Custom AI Apps.
- RP28.P05.M01 | Define app listed golden case | Create a synthetic golden case proving app listed.
- RP28.P05.M02 | Define permission approved golden case | Create a synthetic golden case proving permission approved.
- RP28.P05.M03 | Define AI app blocked pending review golden case | Create a synthetic golden case proving AI app blocked pending review.
- RP28.P05.M04 | Define install receipt emitted golden case | Create a synthetic golden case proving install receipt emitted.
- RP28.P05.M05 | Define unsafe app permission failure fixture | Create a synthetic failing case that proves unsafe app permission is blocked or reviewed.
- RP28.P05.M06 | Define custom AI data leak failure fixture | Create a synthetic failing case that proves custom AI data leak is blocked or reviewed.
- RP28.P05.M07 | Define unreviewed connector failure fixture | Create a synthetic failing case that proves unreviewed connector is blocked or reviewed.
- RP28.P05.M08 | Define replayable fixture manifest | Serialize Marketplace And Custom AI Apps fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP28.P05.M09 | Define AI retrieval/report fixture | If Marketplace And Custom AI Apps appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP28.P05.M10 | Close fixtures phase | Confirm Marketplace And Custom AI Apps fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP28.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/marketplace/src/security-contract.js, packages/marketplace/src/audit-hints.js, packages/audit/README.md

Target tests: packages/marketplace/test/security-audit.test.js

- RP28.P06.M00 | Define permission contract | Specify required permission checks for app submission, permission review, AI app policy check, and tenant install.
- RP28.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Marketplace And Custom AI Apps view and search surfaces.
- RP28.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Marketplace And Custom AI Apps mutations.
- RP28.P06.M03 | Bind export/download permission | Return stronger audit hints for Marketplace And Custom AI Apps export, download, or external-share actions.
- RP28.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Marketplace And Custom AI Apps.
- RP28.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Marketplace And Custom AI Apps where applicable.
- RP28.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Marketplace And Custom AI Apps obey security trimming.
- RP28.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Marketplace And Custom AI Apps.
- RP28.P06.M08 | Prepare H28 audit evidence | Record which Marketplace And Custom AI Apps decisions require downstream audit event persistence.
- RP28.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Marketplace And Custom AI Apps.
- RP28.P06.M10 | Close permission audit integration | Confirm Marketplace And Custom AI Apps cannot ship without permission and audit evidence coverage.

## RP28.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/marketplace/test/failure-cases.test.js, docs/rp28-recovery-notes.md

Target tests: packages/marketplace/test/failure-cases.test.js

- RP28.P07.M00 | Define unsafe app permission failure | Fail closed or require review when unsafe app permission appears in Marketplace And Custom AI Apps.
- RP28.P07.M01 | Define custom AI data leak failure | Fail closed or require review when custom AI data leak appears in Marketplace And Custom AI Apps.
- RP28.P07.M02 | Define unreviewed connector failure | Fail closed or require review when unreviewed connector appears in Marketplace And Custom AI Apps.
- RP28.P07.M03 | Define malicious update failure | Fail closed or require review when malicious update appears in Marketplace And Custom AI Apps.
- RP28.P07.M04 | Define tenant install confusion failure | Fail closed or require review when tenant install confusion appears in Marketplace And Custom AI Apps.
- RP28.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Marketplace And Custom AI Apps.
- RP28.P07.M06 | Define cross-tenant failure | Deny or block any Marketplace And Custom AI Apps operation where actor and resource tenant IDs differ.
- RP28.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Marketplace And Custom AI Apps operations.
- RP28.P07.M08 | Define recovery handoff | Document how a failed Marketplace And Custom AI Apps micro phase is corrected before advancing.
- RP28.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Marketplace And Custom AI Apps.
- RP28.P07.M10 | Close failure phase | Confirm dangerous Marketplace And Custom AI Apps ambiguity fails closed or requires review.

## RP28.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp28-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP28.P08.M00 | Define H28 command matrix | Record exact product commands Hermes should run for Marketplace And Custom AI Apps.
- RP28.P08.M01 | Define H28 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP28.P08.M02 | Define H28 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Marketplace And Custom AI Apps.
- RP28.P08.M03 | Define H28 no-real-data evidence | Record that Marketplace And Custom AI Apps fixtures and examples contain only synthetic data.
- RP28.P08.M04 | Define H28 blocked-claim evidence | Record unsafe Marketplace And Custom AI Apps claims rejected by validators or tests.
- RP28.P08.M05 | Define H28 Claude dependency | Mark C28 review mandatory before Marketplace And Custom AI Apps closeout.
- RP28.P08.M06 | Define H28 human approval note | Record what the human must approve for Marketplace And Custom AI Apps.
- RP28.P08.M07 | Test H28 command availability | Ensure npm scripts required by H28 exist before handoff.
- RP28.P08.M08 | Prepare H28 evidence packet template | Create the evidence template Hermes will fill during Marketplace And Custom AI Apps implementation closeout.
- RP28.P08.M09 | Prepare H28 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H28.
- RP28.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Marketplace And Custom AI Apps behavior without owning product code.

## RP28.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp28-claude-cross-validation-brief.md, docs/rp28-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP28.P09.M00 | Prepare RP28 architecture review questions | Ask whether Marketplace And Custom AI Apps module boundaries, model shapes, and workflows match the specification.
- RP28.P09.M01 | Prepare RP28 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Marketplace And Custom AI Apps.
- RP28.P09.M02 | Prepare RP28 bypass review questions | Ask Claude to find unsafe app permission, custom AI data leak, unreviewed connector, malicious update, and tenant install confusion bypasses.
- RP28.P09.M03 | Prepare RP28 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Marketplace And Custom AI Apps.
- RP28.P09.M04 | Prepare RP28 downstream readiness questions | Ask whether Marketplace And Custom AI Apps is ready for dependent modules and later enterprise hardening.
- RP28.P09.M05 | Prepare RP28 risk register | List unresolved Marketplace And Custom AI Apps risks and route them to future RP corrections.
- RP28.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Marketplace And Custom AI Apps findings.
- RP28.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Marketplace And Custom AI Apps closeout.
- RP28.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP28.Pxx.Mxx correction or later RP dependency.
- RP28.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Marketplace And Custom AI Apps can be considered ready.
- RP28.P09.M10 | Close RP28 detailed plan | Confirm Marketplace And Custom AI Apps is detailed enough for AI implementation without more planning decisions.

