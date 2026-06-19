# RP00 Product Constitution And AI Control Plane Detailed Micro Phases v1

Purpose: expand RP00 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP00 Product Constitution And AI Control Plane
- Scope: product contract, AI-led development rules, Hermes attachment, Claude cross-validation, human approval gates
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H00
- Claude Code gate: C00
- Immediate next implementation target: RP00.P00.M00

## RP00.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/control-plane-contract.json, packages/control-plane/README.md, contracts/law-firm-os.product-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP00.P00.M00 | Inventory spec and acceptance source | Extract product contract, AI-led development rules, Hermes attachment, Claude cross-validation, human approval gates requirements and identify scope drift, AI write without review, and validation theater as explicit acceptance risks.
- RP00.P00.M01 | Draft contract shell | Create the future Product Constitution And AI Control Plane contract shape for ProductContract, AIControlRule, HermesGate, ClaudeReviewGate, HumanApproval, BlockedClaim.
- RP00.P00.M02 | Define ownership boundary | Record which module owns ProductContract, AIControlRule, and HermesGate, and which modules may only reference them.
- RP00.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for plan authoring, AI implementation handoff, and Hermes validation.
- RP00.P00.M04 | Define Matter-first trace rules | State how Product Constitution And AI Control Plane records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP00.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Product Constitution And AI Control Plane behavior can run.
- RP00.P00.M06 | Define synthetic-only fixture policy | State that Product Constitution And AI Control Plane examples use fake tenants, users, matters, documents, and financial values only.
- RP00.P00.M07 | Define validation command matrix | List the product commands required to verify Product Constitution And AI Control Plane planning and later implementation.
- RP00.P00.M08 | Prepare H00 preflight | Define the fields Hermes records before Product Constitution And AI Control Plane implementation starts.
- RP00.P00.M09 | Prepare C00 design brief | Prepare Claude Code questions around scope drift, AI write without review, validation theater, and missing tests.
- RP00.P00.M10 | Close RP00.P00 handoff | Hand off a contract-first Product Constitution And AI Control Plane implementation scope to AI.

## RP00.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/control-plane/src/model.js, packages/control-plane/src/states.js, packages/control-plane/src/registry.js

Target tests: packages/control-plane/test/model.test.js

- RP00.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/control-plane.
- RP00.P01.M01 | Implement ProductContract model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for ProductContract.
- RP00.P01.M02 | Implement AIControlRule model | Define required fields, references, ownership metadata, and state constraints for AIControlRule.
- RP00.P01.M03 | Implement HermesGate model | Define required fields, relationship references, allowed states, and security attributes for HermesGate.
- RP00.P01.M04 | Implement ClaudeReviewGate model | Define required fields, lifecycle states, ownership boundaries, and audit references for ClaudeReviewGate.
- RP00.P01.M05 | Implement HumanApproval model | Define required fields, state transitions, permission attributes, and reporting references for HumanApproval.
- RP00.P01.M06 | Implement relationship map | Map relationships among ProductContract, AIControlRule, HermesGate, ClaudeReviewGate, HumanApproval, BlockedClaim and their Core/Matter/DMS dependencies.
- RP00.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Product Constitution And AI Control Plane.
- RP00.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP00.P01.M09 | Export model registry | Export Product Constitution And AI Control Plane model definitions through a stable package interface.
- RP00.P01.M10 | Close domain model phase | Confirm the Product Constitution And AI Control Plane model surface is implementation-ready and does not require new scope decisions.

## RP00.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/control-plane/src/service.js, packages/control-plane/src/policies.js, packages/control-plane/src/validators.js

Target tests: packages/control-plane/test/service.test.js

- RP00.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for plan authoring, AI implementation handoff, and Hermes validation.
- RP00.P02.M01 | Implement plan authoring | Implement validation, permission precheck, audit hint, and state transition logic for plan authoring.
- RP00.P02.M02 | Implement AI implementation handoff | Implement validation, permission precheck, audit hint, and state transition logic for AI implementation handoff.
- RP00.P02.M03 | Implement Hermes validation | Implement validation, permission precheck, audit hint, and state transition logic for Hermes validation.
- RP00.P02.M04 | Implement Claude review | Implement validation, permission precheck, audit hint, and state transition logic for Claude review.
- RP00.P02.M05 | Implement human approval | Implement validation, permission precheck, audit hint, and state transition logic for human approval.
- RP00.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for scope drift, AI write without review, and validation theater.
- RP00.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Product Constitution And AI Control Plane operations.
- RP00.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H00.
- RP00.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Product Constitution And AI Control Plane outcomes to attorney or admin review instead of direct mutation.
- RP00.P02.M10 | Close service logic phase | Confirm Product Constitution And AI Control Plane services are deterministic, auditable, and fail closed where required.

## RP00.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/control-plane/src/index.js, packages/control-plane/src/api-contract.js, packages/control-plane/src/errors.js

Target tests: packages/control-plane/test/interface.test.js

- RP00.P03.M00 | Define public exports | Expose Product Constitution And AI Control Plane models, services, fixtures, validators, and error codes from package index.
- RP00.P03.M01 | Define plan authoring API | Lock request, response, permission, audit, and error shape for plan authoring.
- RP00.P03.M02 | Define AI implementation handoff API | Lock request, response, permission, audit, and error shape for AI implementation handoff.
- RP00.P03.M03 | Define Hermes validation API | Lock request, response, permission, audit, and error shape for Hermes validation.
- RP00.P03.M04 | Define Claude review API | Lock request, response, permission, audit, and error shape for Claude review.
- RP00.P03.M05 | Define human approval API | Lock request, response, permission, audit, and error shape for human approval.
- RP00.P03.M06 | Define serialization contract | Ensure Product Constitution And AI Control Plane API responses serialize without leaking hidden policy internals or unauthorized data.
- RP00.P03.M07 | Define stable error codes | Add error codes for scope drift, AI write without review, validation theater, missing approval, and review_required.
- RP00.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H00 evidence without making Hermes product authority.
- RP00.P03.M09 | Define Claude review summary | Expose enough interface summary for C00 cross-validation.
- RP00.P03.M10 | Close API interface phase | Freeze Product Constitution And AI Control Plane public interface until a later RP explicitly extends it.

## RP00.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp00-ui-surface.md

Target tests: npm run build

- RP00.P04.M00 | Inventory UI surfaces | Identify operator dashboard, gate status strip, review queue, and approval summary in the Jira-like Law Firm OS UI.
- RP00.P04.M01 | Plan operator dashboard | Map data, loading state, empty state, denied state, and audit hints for operator dashboard.
- RP00.P04.M02 | Plan gate status strip | Map data, loading state, empty state, denied state, and audit hints for gate status strip.
- RP00.P04.M03 | Plan review queue | Map data, loading state, empty state, denied state, and audit hints for review queue.
- RP00.P04.M04 | Plan approval summary | Map data, loading state, empty state, denied state, and audit hints for approval summary.
- RP00.P04.M05 | Plan review-required UI | Show high-risk Product Constitution And AI Control Plane outcomes as review queue items, not silent successes.
- RP00.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Product Constitution And AI Control Plane rows, counts, snippets, and citations are hidden before display.
- RP00.P04.M07 | Plan responsive density | Keep Product Constitution And AI Control Plane context readable on desktop and mobile without marketing-page layout.
- RP00.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Product Constitution And AI Control Plane service decisions.
- RP00.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Product Constitution And AI Control Plane.
- RP00.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP00.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/control-plane/src/fixtures.js, packages/control-plane/fixtures/golden-cases.json

Target tests: packages/control-plane/test/golden-cases.test.js

- RP00.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Product Constitution And AI Control Plane.
- RP00.P05.M01 | Define contract passes golden case | Create a synthetic golden case proving contract passes.
- RP00.P05.M02 | Define mutation blocked golden case | Create a synthetic golden case proving mutation blocked.
- RP00.P05.M03 | Define Hermes detached golden case | Create a synthetic golden case proving Hermes detached.
- RP00.P05.M04 | Define Claude review missing golden case | Create a synthetic golden case proving Claude review missing.
- RP00.P05.M05 | Define scope drift failure fixture | Create a synthetic failing case that proves scope drift is blocked or reviewed.
- RP00.P05.M06 | Define AI write without review failure fixture | Create a synthetic failing case that proves AI write without review is blocked or reviewed.
- RP00.P05.M07 | Define validation theater failure fixture | Create a synthetic failing case that proves validation theater is blocked or reviewed.
- RP00.P05.M08 | Define replayable fixture manifest | Serialize Product Constitution And AI Control Plane fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP00.P05.M09 | Define AI retrieval/report fixture | If Product Constitution And AI Control Plane appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP00.P05.M10 | Close fixtures phase | Confirm Product Constitution And AI Control Plane fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP00.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/control-plane/src/security-contract.js, packages/control-plane/src/audit-hints.js, packages/audit/README.md

Target tests: packages/control-plane/test/security-audit.test.js

- RP00.P06.M00 | Define permission contract | Specify required permission checks for plan authoring, AI implementation handoff, Hermes validation, and Claude review.
- RP00.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Product Constitution And AI Control Plane view and search surfaces.
- RP00.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Product Constitution And AI Control Plane mutations.
- RP00.P06.M03 | Bind export/download permission | Return stronger audit hints for Product Constitution And AI Control Plane export, download, or external-share actions.
- RP00.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Product Constitution And AI Control Plane.
- RP00.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Product Constitution And AI Control Plane where applicable.
- RP00.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Product Constitution And AI Control Plane obey security trimming.
- RP00.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Product Constitution And AI Control Plane.
- RP00.P06.M08 | Prepare H00 audit evidence | Record which Product Constitution And AI Control Plane decisions require downstream audit event persistence.
- RP00.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Product Constitution And AI Control Plane.
- RP00.P06.M10 | Close permission audit integration | Confirm Product Constitution And AI Control Plane cannot ship without permission and audit evidence coverage.

## RP00.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/control-plane/test/failure-cases.test.js, docs/rp00-recovery-notes.md

Target tests: packages/control-plane/test/failure-cases.test.js

- RP00.P07.M00 | Define scope drift failure | Fail closed or require review when scope drift appears in Product Constitution And AI Control Plane.
- RP00.P07.M01 | Define AI write without review failure | Fail closed or require review when AI write without review appears in Product Constitution And AI Control Plane.
- RP00.P07.M02 | Define validation theater failure | Fail closed or require review when validation theater appears in Product Constitution And AI Control Plane.
- RP00.P07.M03 | Define missing approval failure | Fail closed or require review when missing approval appears in Product Constitution And AI Control Plane.
- RP00.P07.M04 | Define harness/product boundary confusion failure | Fail closed or require review when harness/product boundary confusion appears in Product Constitution And AI Control Plane.
- RP00.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Product Constitution And AI Control Plane.
- RP00.P07.M06 | Define cross-tenant failure | Deny or block any Product Constitution And AI Control Plane operation where actor and resource tenant IDs differ.
- RP00.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Product Constitution And AI Control Plane operations.
- RP00.P07.M08 | Define recovery handoff | Document how a failed Product Constitution And AI Control Plane micro phase is corrected before advancing.
- RP00.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Product Constitution And AI Control Plane.
- RP00.P07.M10 | Close failure phase | Confirm dangerous Product Constitution And AI Control Plane ambiguity fails closed or requires review.

## RP00.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp00-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP00.P08.M00 | Define H00 command matrix | Record exact product commands Hermes should run for Product Constitution And AI Control Plane.
- RP00.P08.M01 | Define H00 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP00.P08.M02 | Define H00 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Product Constitution And AI Control Plane.
- RP00.P08.M03 | Define H00 no-real-data evidence | Record that Product Constitution And AI Control Plane fixtures and examples contain only synthetic data.
- RP00.P08.M04 | Define H00 blocked-claim evidence | Record unsafe Product Constitution And AI Control Plane claims rejected by validators or tests.
- RP00.P08.M05 | Define H00 Claude dependency | Mark C00 review mandatory before Product Constitution And AI Control Plane closeout.
- RP00.P08.M06 | Define H00 human approval note | Record what the human must approve for Product Constitution And AI Control Plane.
- RP00.P08.M07 | Test H00 command availability | Ensure npm scripts required by H00 exist before handoff.
- RP00.P08.M08 | Prepare H00 evidence packet template | Create the evidence template Hermes will fill during Product Constitution And AI Control Plane implementation closeout.
- RP00.P08.M09 | Prepare H00 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H00.
- RP00.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Product Constitution And AI Control Plane behavior without owning product code.

## RP00.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp00-claude-cross-validation-brief.md, docs/rp00-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP00.P09.M00 | Prepare RP00 architecture review questions | Ask whether Product Constitution And AI Control Plane module boundaries, model shapes, and workflows match the specification.
- RP00.P09.M01 | Prepare RP00 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Product Constitution And AI Control Plane.
- RP00.P09.M02 | Prepare RP00 bypass review questions | Ask Claude to find scope drift, AI write without review, validation theater, missing approval, and harness/product boundary confusion bypasses.
- RP00.P09.M03 | Prepare RP00 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Product Constitution And AI Control Plane.
- RP00.P09.M04 | Prepare RP00 downstream readiness questions | Ask whether Product Constitution And AI Control Plane is ready for dependent modules and later enterprise hardening.
- RP00.P09.M05 | Prepare RP00 risk register | List unresolved Product Constitution And AI Control Plane risks and route them to future RP corrections.
- RP00.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Product Constitution And AI Control Plane findings.
- RP00.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Product Constitution And AI Control Plane closeout.
- RP00.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP00.Pxx.Mxx correction or later RP dependency.
- RP00.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Product Constitution And AI Control Plane can be considered ready.
- RP00.P09.M10 | Close RP00 detailed plan | Confirm Product Constitution And AI Control Plane is detailed enough for AI implementation without more planning decisions.

