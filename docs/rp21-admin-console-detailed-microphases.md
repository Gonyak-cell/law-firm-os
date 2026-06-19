# RP21 Admin Console Detailed Micro Phases v1

Purpose: expand RP21 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP21 Admin Console
- Scope: Taxonomy, templates, workflow, policy, usage, billing plan
- Micro phases: 110
- AI owner: Cursor/Codex
- Hermes gate: H21
- Claude Code gate: C21
- Immediate next implementation target: RP21.P00.M00

## RP21.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/admin-contract.json, packages/admin/README.md, contracts/admin-console-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP21.P00.M00 | Inventory spec and acceptance source | Extract Taxonomy, templates, workflow, policy, usage, billing plan requirements and identify unsafe policy change, template drift, and admin mutation unaudited as explicit acceptance risks.
- RP21.P00.M01 | Draft contract shell | Create the future Admin Console contract shape for Taxonomy, Template, WorkflowDefinition, PolicySetting, UsageLimit, BillingPlan.
- RP21.P00.M02 | Define ownership boundary | Record which module owns Taxonomy, Template, and WorkflowDefinition, and which modules may only reference them.
- RP21.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for taxonomy editing, template management, and workflow configuration.
- RP21.P00.M04 | Define Matter-first trace rules | State how Admin Console records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP21.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Admin Console behavior can run.
- RP21.P00.M06 | Define synthetic-only fixture policy | State that Admin Console examples use fake tenants, users, matters, documents, and financial values only.
- RP21.P00.M07 | Define validation command matrix | List the product commands required to verify Admin Console planning and later implementation.
- RP21.P00.M08 | Prepare H21 preflight | Define the fields Hermes records before Admin Console implementation starts.
- RP21.P00.M09 | Prepare C21 design brief | Prepare Claude Code questions around unsafe policy change, template drift, admin mutation unaudited, and missing tests.
- RP21.P00.M10 | Close RP21.P00 handoff | Hand off a contract-first Admin Console implementation scope to AI.

## RP21.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/admin/src/model.js, packages/admin/src/states.js, packages/admin/src/registry.js

Target tests: packages/admin/test/model.test.js

- RP21.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/admin.
- RP21.P01.M01 | Implement Taxonomy model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for Taxonomy.
- RP21.P01.M02 | Implement Template model | Define required fields, references, ownership metadata, and state constraints for Template.
- RP21.P01.M03 | Implement WorkflowDefinition model | Define required fields, relationship references, allowed states, and security attributes for WorkflowDefinition.
- RP21.P01.M04 | Implement PolicySetting model | Define required fields, lifecycle states, ownership boundaries, and audit references for PolicySetting.
- RP21.P01.M05 | Implement UsageLimit model | Define required fields, state transitions, permission attributes, and reporting references for UsageLimit.
- RP21.P01.M06 | Implement relationship map | Map relationships among Taxonomy, Template, WorkflowDefinition, PolicySetting, UsageLimit, BillingPlan and their Core/Matter/DMS dependencies.
- RP21.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Admin Console.
- RP21.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP21.P01.M09 | Export model registry | Export Admin Console model definitions through a stable package interface.
- RP21.P01.M10 | Close domain model phase | Confirm the Admin Console model surface is implementation-ready and does not require new scope decisions.

## RP21.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/admin/src/service.js, packages/admin/src/policies.js, packages/admin/src/validators.js

Target tests: packages/admin/test/service.test.js

- RP21.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for taxonomy editing, template management, and workflow configuration.
- RP21.P02.M01 | Implement taxonomy editing | Implement validation, permission precheck, audit hint, and state transition logic for taxonomy editing.
- RP21.P02.M02 | Implement template management | Implement validation, permission precheck, audit hint, and state transition logic for template management.
- RP21.P02.M03 | Implement workflow configuration | Implement validation, permission precheck, audit hint, and state transition logic for workflow configuration.
- RP21.P02.M04 | Implement policy update | Implement validation, permission precheck, audit hint, and state transition logic for policy update.
- RP21.P02.M05 | Implement usage review | Implement validation, permission precheck, audit hint, and state transition logic for usage review.
- RP21.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for unsafe policy change, template drift, and admin mutation unaudited.
- RP21.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Admin Console operations.
- RP21.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H21.
- RP21.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Admin Console outcomes to attorney or admin review instead of direct mutation.
- RP21.P02.M10 | Close service logic phase | Confirm Admin Console services are deterministic, auditable, and fail closed where required.

## RP21.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/admin/src/index.js, packages/admin/src/api-contract.js, packages/admin/src/errors.js

Target tests: packages/admin/test/interface.test.js

- RP21.P03.M00 | Define public exports | Expose Admin Console models, services, fixtures, validators, and error codes from package index.
- RP21.P03.M01 | Define taxonomy editing API | Lock request, response, permission, audit, and error shape for taxonomy editing.
- RP21.P03.M02 | Define template management API | Lock request, response, permission, audit, and error shape for template management.
- RP21.P03.M03 | Define workflow configuration API | Lock request, response, permission, audit, and error shape for workflow configuration.
- RP21.P03.M04 | Define policy update API | Lock request, response, permission, audit, and error shape for policy update.
- RP21.P03.M05 | Define usage review API | Lock request, response, permission, audit, and error shape for usage review.
- RP21.P03.M06 | Define serialization contract | Ensure Admin Console API responses serialize without leaking hidden policy internals or unauthorized data.
- RP21.P03.M07 | Define stable error codes | Add error codes for unsafe policy change, template drift, admin mutation unaudited, workflow misconfiguration, and review_required.
- RP21.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H21 evidence without making Hermes product authority.
- RP21.P03.M09 | Define Claude review summary | Expose enough interface summary for C21 cross-validation.
- RP21.P03.M10 | Close API interface phase | Freeze Admin Console public interface until a later RP explicitly extends it.

## RP21.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp21-ui-surface.md

Target tests: npm run build

- RP21.P04.M00 | Inventory UI surfaces | Identify admin settings, taxonomy editor, template library, and workflow builder in the Jira-like Law Firm OS UI.
- RP21.P04.M01 | Plan admin settings | Map data, loading state, empty state, denied state, and audit hints for admin settings.
- RP21.P04.M02 | Plan taxonomy editor | Map data, loading state, empty state, denied state, and audit hints for taxonomy editor.
- RP21.P04.M03 | Plan template library | Map data, loading state, empty state, denied state, and audit hints for template library.
- RP21.P04.M04 | Plan workflow builder | Map data, loading state, empty state, denied state, and audit hints for workflow builder.
- RP21.P04.M05 | Plan review-required UI | Show high-risk Admin Console outcomes as review queue items, not silent successes.
- RP21.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Admin Console rows, counts, snippets, and citations are hidden before display.
- RP21.P04.M07 | Plan responsive density | Keep Admin Console context readable on desktop and mobile without marketing-page layout.
- RP21.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Admin Console service decisions.
- RP21.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Admin Console.
- RP21.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP21.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/admin/src/fixtures.js, packages/admin/fixtures/golden-cases.json

Target tests: packages/admin/test/golden-cases.test.js

- RP21.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Admin Console.
- RP21.P05.M01 | Define taxonomy updated golden case | Create a synthetic golden case proving taxonomy updated.
- RP21.P05.M02 | Define template versioned golden case | Create a synthetic golden case proving template versioned.
- RP21.P05.M03 | Define policy change audited golden case | Create a synthetic golden case proving policy change audited.
- RP21.P05.M04 | Define usage limit enforced golden case | Create a synthetic golden case proving usage limit enforced.
- RP21.P05.M05 | Define unsafe policy change failure fixture | Create a synthetic failing case that proves unsafe policy change is blocked or reviewed.
- RP21.P05.M06 | Define template drift failure fixture | Create a synthetic failing case that proves template drift is blocked or reviewed.
- RP21.P05.M07 | Define admin mutation unaudited failure fixture | Create a synthetic failing case that proves admin mutation unaudited is blocked or reviewed.
- RP21.P05.M08 | Define replayable fixture manifest | Serialize Admin Console fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP21.P05.M09 | Define AI retrieval/report fixture | If Admin Console appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP21.P05.M10 | Close fixtures phase | Confirm Admin Console fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP21.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/admin/src/security-contract.js, packages/admin/src/audit-hints.js, packages/audit/README.md

Target tests: packages/admin/test/security-audit.test.js

- RP21.P06.M00 | Define permission contract | Specify required permission checks for taxonomy editing, template management, workflow configuration, and policy update.
- RP21.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Admin Console view and search surfaces.
- RP21.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Admin Console mutations.
- RP21.P06.M03 | Bind export/download permission | Return stronger audit hints for Admin Console export, download, or external-share actions.
- RP21.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Admin Console.
- RP21.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Admin Console where applicable.
- RP21.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Admin Console obey security trimming.
- RP21.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Admin Console.
- RP21.P06.M08 | Prepare H21 audit evidence | Record which Admin Console decisions require downstream audit event persistence.
- RP21.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Admin Console.
- RP21.P06.M10 | Close permission audit integration | Confirm Admin Console cannot ship without permission and audit evidence coverage.

## RP21.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/admin/test/failure-cases.test.js, docs/rp21-recovery-notes.md

Target tests: packages/admin/test/failure-cases.test.js

- RP21.P07.M00 | Define unsafe policy change failure | Fail closed or require review when unsafe policy change appears in Admin Console.
- RP21.P07.M01 | Define template drift failure | Fail closed or require review when template drift appears in Admin Console.
- RP21.P07.M02 | Define admin mutation unaudited failure | Fail closed or require review when admin mutation unaudited appears in Admin Console.
- RP21.P07.M03 | Define workflow misconfiguration failure | Fail closed or require review when workflow misconfiguration appears in Admin Console.
- RP21.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Admin Console.
- RP21.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Admin Console.
- RP21.P07.M06 | Define cross-tenant failure | Deny or block any Admin Console operation where actor and resource tenant IDs differ.
- RP21.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Admin Console operations.
- RP21.P07.M08 | Define recovery handoff | Document how a failed Admin Console micro phase is corrected before advancing.
- RP21.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Admin Console.
- RP21.P07.M10 | Close failure phase | Confirm dangerous Admin Console ambiguity fails closed or requires review.

## RP21.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp21-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP21.P08.M00 | Define H21 command matrix | Record exact product commands Hermes should run for Admin Console.
- RP21.P08.M01 | Define H21 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP21.P08.M02 | Define H21 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Admin Console.
- RP21.P08.M03 | Define H21 no-real-data evidence | Record that Admin Console fixtures and examples contain only synthetic data.
- RP21.P08.M04 | Define H21 blocked-claim evidence | Record unsafe Admin Console claims rejected by validators or tests.
- RP21.P08.M05 | Define H21 Claude dependency | Mark C21 review mandatory before Admin Console closeout.
- RP21.P08.M06 | Define H21 human approval note | Record what the human must approve for Admin Console.
- RP21.P08.M07 | Test H21 command availability | Ensure npm scripts required by H21 exist before handoff.
- RP21.P08.M08 | Prepare H21 evidence packet template | Create the evidence template Hermes will fill during Admin Console implementation closeout.
- RP21.P08.M09 | Prepare H21 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H21.
- RP21.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Admin Console behavior without owning product code.

## RP21.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp21-claude-cross-validation-brief.md, docs/rp21-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP21.P09.M00 | Prepare RP21 architecture review questions | Ask whether Admin Console module boundaries, model shapes, and workflows match the specification.
- RP21.P09.M01 | Prepare RP21 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Admin Console.
- RP21.P09.M02 | Prepare RP21 bypass review questions | Ask Claude to find unsafe policy change, template drift, admin mutation unaudited, workflow misconfiguration, and undefined bypasses.
- RP21.P09.M03 | Prepare RP21 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Admin Console.
- RP21.P09.M04 | Prepare RP21 downstream readiness questions | Ask whether Admin Console is ready for dependent modules and later enterprise hardening.
- RP21.P09.M05 | Prepare RP21 risk register | List unresolved Admin Console risks and route them to future RP corrections.
- RP21.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Admin Console findings.
- RP21.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Admin Console closeout.
- RP21.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP21.Pxx.Mxx correction or later RP dependency.
- RP21.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Admin Console can be considered ready.
- RP21.P09.M10 | Close RP21 detailed plan | Confirm Admin Console is detailed enough for AI implementation without more planning decisions.

