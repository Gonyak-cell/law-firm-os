# RP05 Matter Core Detailed Micro Phases v1

Purpose: expand RP05 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP05 Matter Core
- Scope: Matter lifecycle, team, task, calendar, checklist, closing
- Micro phases: 110
- AI owner: Codex/Cursor
- Hermes gate: H05
- Claude Code gate: C05
- Immediate next implementation target: RP05.P00.M00

## RP05.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/matter-contract.json, packages/matter/README.md, contracts/matter-core-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP05.P00.M00 | Inventory spec and acceptance source | Extract Matter lifecycle, team, task, calendar, checklist, closing requirements and identify matter without client, team permission drift, and deadline missed as explicit acceptance risks.
- RP05.P00.M01 | Draft contract shell | Create the future Matter Core contract shape for Matter, MatterMember, MatterTask, MatterCalendarEvent, MatterChecklist, MatterStatusHistory.
- RP05.P00.M02 | Define ownership boundary | Record which module owns Matter, MatterMember, and MatterTask, and which modules may only reference them.
- RP05.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for matter opening, team assignment, and task tracking.
- RP05.P00.M04 | Define Matter-first trace rules | State how Matter Core records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP05.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Matter Core behavior can run.
- RP05.P00.M06 | Define synthetic-only fixture policy | State that Matter Core examples use fake tenants, users, matters, documents, and financial values only.
- RP05.P00.M07 | Define validation command matrix | List the product commands required to verify Matter Core planning and later implementation.
- RP05.P00.M08 | Prepare H05 preflight | Define the fields Hermes records before Matter Core implementation starts.
- RP05.P00.M09 | Prepare C05 design brief | Prepare Claude Code questions around matter without client, team permission drift, deadline missed, and missing tests.
- RP05.P00.M10 | Close RP05.P00 handoff | Hand off a contract-first Matter Core implementation scope to AI.

## RP05.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/matter/src/model.js, packages/matter/src/states.js, packages/matter/src/registry.js

Target tests: packages/matter/test/model.test.js

- RP05.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/matter.
- RP05.P01.M01 | Implement Matter model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for Matter.
- RP05.P01.M02 | Implement MatterMember model | Define required fields, references, ownership metadata, and state constraints for MatterMember.
- RP05.P01.M03 | Implement MatterTask model | Define required fields, relationship references, allowed states, and security attributes for MatterTask.
- RP05.P01.M04 | Implement MatterCalendarEvent model | Define required fields, lifecycle states, ownership boundaries, and audit references for MatterCalendarEvent.
- RP05.P01.M05 | Implement MatterChecklist model | Define required fields, state transitions, permission attributes, and reporting references for MatterChecklist.
- RP05.P01.M06 | Implement relationship map | Map relationships among Matter, MatterMember, MatterTask, MatterCalendarEvent, MatterChecklist, MatterStatusHistory and their Core/Matter/DMS dependencies.
- RP05.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Matter Core.
- RP05.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP05.P01.M09 | Export model registry | Export Matter Core model definitions through a stable package interface.
- RP05.P01.M10 | Close domain model phase | Confirm the Matter Core model surface is implementation-ready and does not require new scope decisions.

## RP05.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/matter/src/service.js, packages/matter/src/policies.js, packages/matter/src/validators.js

Target tests: packages/matter/test/service.test.js

- RP05.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for matter opening, team assignment, and task tracking.
- RP05.P02.M01 | Implement matter opening | Implement validation, permission precheck, audit hint, and state transition logic for matter opening.
- RP05.P02.M02 | Implement team assignment | Implement validation, permission precheck, audit hint, and state transition logic for team assignment.
- RP05.P02.M03 | Implement task tracking | Implement validation, permission precheck, audit hint, and state transition logic for task tracking.
- RP05.P02.M04 | Implement calendar scheduling | Implement validation, permission precheck, audit hint, and state transition logic for calendar scheduling.
- RP05.P02.M05 | Implement matter closing | Implement validation, permission precheck, audit hint, and state transition logic for matter closing.
- RP05.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for matter without client, team permission drift, and deadline missed.
- RP05.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Matter Core operations.
- RP05.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H05.
- RP05.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Matter Core outcomes to attorney or admin review instead of direct mutation.
- RP05.P02.M10 | Close service logic phase | Confirm Matter Core services are deterministic, auditable, and fail closed where required.

## RP05.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/matter/src/index.js, packages/matter/src/api-contract.js, packages/matter/src/errors.js

Target tests: packages/matter/test/interface.test.js

- RP05.P03.M00 | Define public exports | Expose Matter Core models, services, fixtures, validators, and error codes from package index.
- RP05.P03.M01 | Define matter opening API | Lock request, response, permission, audit, and error shape for matter opening.
- RP05.P03.M02 | Define team assignment API | Lock request, response, permission, audit, and error shape for team assignment.
- RP05.P03.M03 | Define task tracking API | Lock request, response, permission, audit, and error shape for task tracking.
- RP05.P03.M04 | Define calendar scheduling API | Lock request, response, permission, audit, and error shape for calendar scheduling.
- RP05.P03.M05 | Define matter closing API | Lock request, response, permission, audit, and error shape for matter closing.
- RP05.P03.M06 | Define serialization contract | Ensure Matter Core API responses serialize without leaking hidden policy internals or unauthorized data.
- RP05.P03.M07 | Define stable error codes | Add error codes for matter without client, team permission drift, deadline missed, closed matter mutation, and review_required.
- RP05.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H05 evidence without making Hermes product authority.
- RP05.P03.M09 | Define Claude review summary | Expose enough interface summary for C05 cross-validation.
- RP05.P03.M10 | Close API interface phase | Freeze Matter Core public interface until a later RP explicitly extends it.

## RP05.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp05-ui-surface.md

Target tests: npm run build

- RP05.P04.M00 | Inventory UI surfaces | Identify matter board, matter detail, team panel, and task list in the Jira-like Law Firm OS UI.
- RP05.P04.M01 | Plan matter board | Map data, loading state, empty state, denied state, and audit hints for matter board.
- RP05.P04.M02 | Plan matter detail | Map data, loading state, empty state, denied state, and audit hints for matter detail.
- RP05.P04.M03 | Plan team panel | Map data, loading state, empty state, denied state, and audit hints for team panel.
- RP05.P04.M04 | Plan task list | Map data, loading state, empty state, denied state, and audit hints for task list.
- RP05.P04.M05 | Plan review-required UI | Show high-risk Matter Core outcomes as review queue items, not silent successes.
- RP05.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Matter Core rows, counts, snippets, and citations are hidden before display.
- RP05.P04.M07 | Plan responsive density | Keep Matter Core context readable on desktop and mobile without marketing-page layout.
- RP05.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Matter Core service decisions.
- RP05.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Matter Core.
- RP05.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP05.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/matter/src/fixtures.js, packages/matter/fixtures/golden-cases.json

Target tests: packages/matter/test/golden-cases.test.js

- RP05.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Matter Core.
- RP05.P05.M01 | Define matter opened golden case | Create a synthetic golden case proving matter opened.
- RP05.P05.M02 | Define team member added golden case | Create a synthetic golden case proving team member added.
- RP05.P05.M03 | Define closing checklist blocks close golden case | Create a synthetic golden case proving closing checklist blocks close.
- RP05.P05.M04 | Define closed matter locked golden case | Create a synthetic golden case proving closed matter locked.
- RP05.P05.M05 | Define matter without client failure fixture | Create a synthetic failing case that proves matter without client is blocked or reviewed.
- RP05.P05.M06 | Define team permission drift failure fixture | Create a synthetic failing case that proves team permission drift is blocked or reviewed.
- RP05.P05.M07 | Define deadline missed failure fixture | Create a synthetic failing case that proves deadline missed is blocked or reviewed.
- RP05.P05.M08 | Define replayable fixture manifest | Serialize Matter Core fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP05.P05.M09 | Define AI retrieval/report fixture | If Matter Core appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP05.P05.M10 | Close fixtures phase | Confirm Matter Core fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP05.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/matter/src/security-contract.js, packages/matter/src/audit-hints.js, packages/audit/README.md

Target tests: packages/matter/test/security-audit.test.js

- RP05.P06.M00 | Define permission contract | Specify required permission checks for matter opening, team assignment, task tracking, and calendar scheduling.
- RP05.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Matter Core view and search surfaces.
- RP05.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Matter Core mutations.
- RP05.P06.M03 | Bind export/download permission | Return stronger audit hints for Matter Core export, download, or external-share actions.
- RP05.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Matter Core.
- RP05.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Matter Core where applicable.
- RP05.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Matter Core obey security trimming.
- RP05.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Matter Core.
- RP05.P06.M08 | Prepare H05 audit evidence | Record which Matter Core decisions require downstream audit event persistence.
- RP05.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Matter Core.
- RP05.P06.M10 | Close permission audit integration | Confirm Matter Core cannot ship without permission and audit evidence coverage.

## RP05.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/matter/test/failure-cases.test.js, docs/rp05-recovery-notes.md

Target tests: packages/matter/test/failure-cases.test.js

- RP05.P07.M00 | Define matter without client failure | Fail closed or require review when matter without client appears in Matter Core.
- RP05.P07.M01 | Define team permission drift failure | Fail closed or require review when team permission drift appears in Matter Core.
- RP05.P07.M02 | Define deadline missed failure | Fail closed or require review when deadline missed appears in Matter Core.
- RP05.P07.M03 | Define closed matter mutation failure | Fail closed or require review when closed matter mutation appears in Matter Core.
- RP05.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Matter Core.
- RP05.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Matter Core.
- RP05.P07.M06 | Define cross-tenant failure | Deny or block any Matter Core operation where actor and resource tenant IDs differ.
- RP05.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Matter Core operations.
- RP05.P07.M08 | Define recovery handoff | Document how a failed Matter Core micro phase is corrected before advancing.
- RP05.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Matter Core.
- RP05.P07.M10 | Close failure phase | Confirm dangerous Matter Core ambiguity fails closed or requires review.

## RP05.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp05-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP05.P08.M00 | Define H05 command matrix | Record exact product commands Hermes should run for Matter Core.
- RP05.P08.M01 | Define H05 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP05.P08.M02 | Define H05 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Matter Core.
- RP05.P08.M03 | Define H05 no-real-data evidence | Record that Matter Core fixtures and examples contain only synthetic data.
- RP05.P08.M04 | Define H05 blocked-claim evidence | Record unsafe Matter Core claims rejected by validators or tests.
- RP05.P08.M05 | Define H05 Claude dependency | Mark C05 review mandatory before Matter Core closeout.
- RP05.P08.M06 | Define H05 human approval note | Record what the human must approve for Matter Core.
- RP05.P08.M07 | Test H05 command availability | Ensure npm scripts required by H05 exist before handoff.
- RP05.P08.M08 | Prepare H05 evidence packet template | Create the evidence template Hermes will fill during Matter Core implementation closeout.
- RP05.P08.M09 | Prepare H05 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H05.
- RP05.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Matter Core behavior without owning product code.

## RP05.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp05-claude-cross-validation-brief.md, docs/rp05-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP05.P09.M00 | Prepare RP05 architecture review questions | Ask whether Matter Core module boundaries, model shapes, and workflows match the specification.
- RP05.P09.M01 | Prepare RP05 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Matter Core.
- RP05.P09.M02 | Prepare RP05 bypass review questions | Ask Claude to find matter without client, team permission drift, deadline missed, closed matter mutation, and undefined bypasses.
- RP05.P09.M03 | Prepare RP05 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Matter Core.
- RP05.P09.M04 | Prepare RP05 downstream readiness questions | Ask whether Matter Core is ready for dependent modules and later enterprise hardening.
- RP05.P09.M05 | Prepare RP05 risk register | List unresolved Matter Core risks and route them to future RP corrections.
- RP05.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Matter Core findings.
- RP05.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Matter Core closeout.
- RP05.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP05.Pxx.Mxx correction or later RP dependency.
- RP05.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Matter Core can be considered ready.
- RP05.P09.M10 | Close RP05 detailed plan | Confirm Matter Core is detailed enough for AI implementation without more planning decisions.

