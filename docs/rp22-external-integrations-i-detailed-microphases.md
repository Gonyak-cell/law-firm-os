# RP22 External Integrations I Detailed Micro Phases v1

Purpose: expand RP22 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP22 External Integrations I
- Scope: Microsoft 365, Google Workspace, Slack/Teams, e-sign
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H22
- Claude Code gate: C22
- Immediate next implementation target: RP22.P00.M00

## RP22.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/integrations-core-contract.json, packages/integrations-core/README.md, contracts/external-integrations-i-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP22.P00.M00 | Inventory spec and acceptance source | Extract Microsoft 365, Google Workspace, Slack/Teams, e-sign requirements and identify token exposure, overbroad sync, and webhook spoof as explicit acceptance risks.
- RP22.P00.M01 | Draft contract shell | Create the future External Integrations I contract shape for IntegrationConnection, OAuthCredentialRef, SyncJob, ExternalMessage, ESignRequest, WebhookEvent.
- RP22.P00.M02 | Define ownership boundary | Record which module owns IntegrationConnection, OAuthCredentialRef, and SyncJob, and which modules may only reference them.
- RP22.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for OAuth connection, workspace sync, and message capture.
- RP22.P00.M04 | Define Matter-first trace rules | State how External Integrations I records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP22.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before External Integrations I behavior can run.
- RP22.P00.M06 | Define synthetic-only fixture policy | State that External Integrations I examples use fake tenants, users, matters, documents, and financial values only.
- RP22.P00.M07 | Define validation command matrix | List the product commands required to verify External Integrations I planning and later implementation.
- RP22.P00.M08 | Prepare H22 preflight | Define the fields Hermes records before External Integrations I implementation starts.
- RP22.P00.M09 | Prepare C22 design brief | Prepare Claude Code questions around token exposure, overbroad sync, webhook spoof, and missing tests.
- RP22.P00.M10 | Close RP22.P00 handoff | Hand off a contract-first External Integrations I implementation scope to AI.

## RP22.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/integrations-core/src/model.js, packages/integrations-core/src/states.js, packages/integrations-core/src/registry.js

Target tests: packages/integrations-core/test/model.test.js

- RP22.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/integrations-core.
- RP22.P01.M01 | Implement IntegrationConnection model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for IntegrationConnection.
- RP22.P01.M02 | Implement OAuthCredentialRef model | Define required fields, references, ownership metadata, and state constraints for OAuthCredentialRef.
- RP22.P01.M03 | Implement SyncJob model | Define required fields, relationship references, allowed states, and security attributes for SyncJob.
- RP22.P01.M04 | Implement ExternalMessage model | Define required fields, lifecycle states, ownership boundaries, and audit references for ExternalMessage.
- RP22.P01.M05 | Implement ESignRequest model | Define required fields, state transitions, permission attributes, and reporting references for ESignRequest.
- RP22.P01.M06 | Implement relationship map | Map relationships among IntegrationConnection, OAuthCredentialRef, SyncJob, ExternalMessage, ESignRequest, WebhookEvent and their Core/Matter/DMS dependencies.
- RP22.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for External Integrations I.
- RP22.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP22.P01.M09 | Export model registry | Export External Integrations I model definitions through a stable package interface.
- RP22.P01.M10 | Close domain model phase | Confirm the External Integrations I model surface is implementation-ready and does not require new scope decisions.

## RP22.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/integrations-core/src/service.js, packages/integrations-core/src/policies.js, packages/integrations-core/src/validators.js

Target tests: packages/integrations-core/test/service.test.js

- RP22.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for OAuth connection, workspace sync, and message capture.
- RP22.P02.M01 | Implement OAuth connection | Implement validation, permission precheck, audit hint, and state transition logic for OAuth connection.
- RP22.P02.M02 | Implement workspace sync | Implement validation, permission precheck, audit hint, and state transition logic for workspace sync.
- RP22.P02.M03 | Implement message capture | Implement validation, permission precheck, audit hint, and state transition logic for message capture.
- RP22.P02.M04 | Implement e-sign request | Implement validation, permission precheck, audit hint, and state transition logic for e-sign request.
- RP22.P02.M05 | Implement webhook intake | Implement validation, permission precheck, audit hint, and state transition logic for webhook intake.
- RP22.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for token exposure, overbroad sync, and webhook spoof.
- RP22.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky External Integrations I operations.
- RP22.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H22.
- RP22.P02.M09 | Implement review-required routing | Route high-risk or ambiguous External Integrations I outcomes to attorney or admin review instead of direct mutation.
- RP22.P02.M10 | Close service logic phase | Confirm External Integrations I services are deterministic, auditable, and fail closed where required.

## RP22.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/integrations-core/src/index.js, packages/integrations-core/src/api-contract.js, packages/integrations-core/src/errors.js

Target tests: packages/integrations-core/test/interface.test.js

- RP22.P03.M00 | Define public exports | Expose External Integrations I models, services, fixtures, validators, and error codes from package index.
- RP22.P03.M01 | Define OAuth connection API | Lock request, response, permission, audit, and error shape for OAuth connection.
- RP22.P03.M02 | Define workspace sync API | Lock request, response, permission, audit, and error shape for workspace sync.
- RP22.P03.M03 | Define message capture API | Lock request, response, permission, audit, and error shape for message capture.
- RP22.P03.M04 | Define e-sign request API | Lock request, response, permission, audit, and error shape for e-sign request.
- RP22.P03.M05 | Define webhook intake API | Lock request, response, permission, audit, and error shape for webhook intake.
- RP22.P03.M06 | Define serialization contract | Ensure External Integrations I API responses serialize without leaking hidden policy internals or unauthorized data.
- RP22.P03.M07 | Define stable error codes | Add error codes for token exposure, overbroad sync, webhook spoof, duplicate external object, and review_required.
- RP22.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H22 evidence without making Hermes product authority.
- RP22.P03.M09 | Define Claude review summary | Expose enough interface summary for C22 cross-validation.
- RP22.P03.M10 | Close API interface phase | Freeze External Integrations I public interface until a later RP explicitly extends it.

## RP22.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp22-ui-surface.md

Target tests: npm run build

- RP22.P04.M00 | Inventory UI surfaces | Identify integration settings, sync status, connection health, and e-sign panel in the Jira-like Law Firm OS UI.
- RP22.P04.M01 | Plan integration settings | Map data, loading state, empty state, denied state, and audit hints for integration settings.
- RP22.P04.M02 | Plan sync status | Map data, loading state, empty state, denied state, and audit hints for sync status.
- RP22.P04.M03 | Plan connection health | Map data, loading state, empty state, denied state, and audit hints for connection health.
- RP22.P04.M04 | Plan e-sign panel | Map data, loading state, empty state, denied state, and audit hints for e-sign panel.
- RP22.P04.M05 | Plan review-required UI | Show high-risk External Integrations I outcomes as review queue items, not silent successes.
- RP22.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized External Integrations I rows, counts, snippets, and citations are hidden before display.
- RP22.P04.M07 | Plan responsive density | Keep External Integrations I context readable on desktop and mobile without marketing-page layout.
- RP22.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override External Integrations I service decisions.
- RP22.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for External Integrations I.
- RP22.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP22.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/integrations-core/src/fixtures.js, packages/integrations-core/fixtures/golden-cases.json

Target tests: packages/integrations-core/test/golden-cases.test.js

- RP22.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for External Integrations I.
- RP22.P05.M01 | Define Microsoft connection active golden case | Create a synthetic golden case proving Microsoft connection active.
- RP22.P05.M02 | Define Google sync completed golden case | Create a synthetic golden case proving Google sync completed.
- RP22.P05.M03 | Define Slack message filed golden case | Create a synthetic golden case proving Slack message filed.
- RP22.P05.M04 | Define e-sign envelope audited golden case | Create a synthetic golden case proving e-sign envelope audited.
- RP22.P05.M05 | Define token exposure failure fixture | Create a synthetic failing case that proves token exposure is blocked or reviewed.
- RP22.P05.M06 | Define overbroad sync failure fixture | Create a synthetic failing case that proves overbroad sync is blocked or reviewed.
- RP22.P05.M07 | Define webhook spoof failure fixture | Create a synthetic failing case that proves webhook spoof is blocked or reviewed.
- RP22.P05.M08 | Define replayable fixture manifest | Serialize External Integrations I fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP22.P05.M09 | Define AI retrieval/report fixture | If External Integrations I appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP22.P05.M10 | Close fixtures phase | Confirm External Integrations I fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP22.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/integrations-core/src/security-contract.js, packages/integrations-core/src/audit-hints.js, packages/audit/README.md

Target tests: packages/integrations-core/test/security-audit.test.js

- RP22.P06.M00 | Define permission contract | Specify required permission checks for OAuth connection, workspace sync, message capture, and e-sign request.
- RP22.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for External Integrations I view and search surfaces.
- RP22.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for External Integrations I mutations.
- RP22.P06.M03 | Bind export/download permission | Return stronger audit hints for External Integrations I export, download, or external-share actions.
- RP22.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for External Integrations I.
- RP22.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for External Integrations I where applicable.
- RP22.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for External Integrations I obey security trimming.
- RP22.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for External Integrations I.
- RP22.P06.M08 | Prepare H22 audit evidence | Record which External Integrations I decisions require downstream audit event persistence.
- RP22.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for External Integrations I.
- RP22.P06.M10 | Close permission audit integration | Confirm External Integrations I cannot ship without permission and audit evidence coverage.

## RP22.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/integrations-core/test/failure-cases.test.js, docs/rp22-recovery-notes.md

Target tests: packages/integrations-core/test/failure-cases.test.js

- RP22.P07.M00 | Define token exposure failure | Fail closed or require review when token exposure appears in External Integrations I.
- RP22.P07.M01 | Define overbroad sync failure | Fail closed or require review when overbroad sync appears in External Integrations I.
- RP22.P07.M02 | Define webhook spoof failure | Fail closed or require review when webhook spoof appears in External Integrations I.
- RP22.P07.M03 | Define duplicate external object failure | Fail closed or require review when duplicate external object appears in External Integrations I.
- RP22.P07.M04 | Define unsafely filed message failure | Fail closed or require review when unsafely filed message appears in External Integrations I.
- RP22.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for External Integrations I.
- RP22.P07.M06 | Define cross-tenant failure | Deny or block any External Integrations I operation where actor and resource tenant IDs differ.
- RP22.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed External Integrations I operations.
- RP22.P07.M08 | Define recovery handoff | Document how a failed External Integrations I micro phase is corrected before advancing.
- RP22.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for External Integrations I.
- RP22.P07.M10 | Close failure phase | Confirm dangerous External Integrations I ambiguity fails closed or requires review.

## RP22.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp22-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP22.P08.M00 | Define H22 command matrix | Record exact product commands Hermes should run for External Integrations I.
- RP22.P08.M01 | Define H22 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP22.P08.M02 | Define H22 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for External Integrations I.
- RP22.P08.M03 | Define H22 no-real-data evidence | Record that External Integrations I fixtures and examples contain only synthetic data.
- RP22.P08.M04 | Define H22 blocked-claim evidence | Record unsafe External Integrations I claims rejected by validators or tests.
- RP22.P08.M05 | Define H22 Claude dependency | Mark C22 review mandatory before External Integrations I closeout.
- RP22.P08.M06 | Define H22 human approval note | Record what the human must approve for External Integrations I.
- RP22.P08.M07 | Test H22 command availability | Ensure npm scripts required by H22 exist before handoff.
- RP22.P08.M08 | Prepare H22 evidence packet template | Create the evidence template Hermes will fill during External Integrations I implementation closeout.
- RP22.P08.M09 | Prepare H22 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H22.
- RP22.P08.M10 | Close Hermes binding phase | Confirm Hermes validates External Integrations I behavior without owning product code.

## RP22.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp22-claude-cross-validation-brief.md, docs/rp22-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP22.P09.M00 | Prepare RP22 architecture review questions | Ask whether External Integrations I module boundaries, model shapes, and workflows match the specification.
- RP22.P09.M01 | Prepare RP22 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for External Integrations I.
- RP22.P09.M02 | Prepare RP22 bypass review questions | Ask Claude to find token exposure, overbroad sync, webhook spoof, duplicate external object, and unsafely filed message bypasses.
- RP22.P09.M03 | Prepare RP22 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for External Integrations I.
- RP22.P09.M04 | Prepare RP22 downstream readiness questions | Ask whether External Integrations I is ready for dependent modules and later enterprise hardening.
- RP22.P09.M05 | Prepare RP22 risk register | List unresolved External Integrations I risks and route them to future RP corrections.
- RP22.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for External Integrations I findings.
- RP22.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for External Integrations I closeout.
- RP22.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP22.Pxx.Mxx correction or later RP dependency.
- RP22.P09.M09 | Prepare human approval summary | Summarize what the user must approve before External Integrations I can be considered ready.
- RP22.P09.M10 | Close RP22 detailed plan | Confirm External Integrations I is detailed enough for AI implementation without more planning decisions.

