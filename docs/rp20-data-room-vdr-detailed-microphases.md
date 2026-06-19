# RP20 Data Room And VDR Detailed Micro Phases v1

Purpose: expand RP20 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP20 Data Room And VDR
- Scope: M&A room, RFI, CP, closing binder, access analytics
- Micro phases: 110
- AI owner: Codex/Cursor
- Hermes gate: H20
- Claude Code gate: C20
- Immediate next implementation target: RP20.P00.M00

## RP20.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/vdr-contract.json, packages/vdr/README.md, contracts/data-room-vdr-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP20.P00.M00 | Inventory spec and acceptance source | Extract M&A room, RFI, CP, closing binder, access analytics requirements and identify buyer sees wrong folder, RFI leak, and CP status drift as explicit acceptance risks.
- RP20.P00.M01 | Draft contract shell | Create the future Data Room And VDR contract shape for DataRoom, RoomFolder, RFI, ConditionPrecedent, ClosingBinder, AccessAnalytics.
- RP20.P00.M02 | Define ownership boundary | Record which module owns DataRoom, RoomFolder, and RFI, and which modules may only reference them.
- RP20.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for room setup, buyer access, and RFI workflow.
- RP20.P00.M04 | Define Matter-first trace rules | State how Data Room And VDR records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP20.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Data Room And VDR behavior can run.
- RP20.P00.M06 | Define synthetic-only fixture policy | State that Data Room And VDR examples use fake tenants, users, matters, documents, and financial values only.
- RP20.P00.M07 | Define validation command matrix | List the product commands required to verify Data Room And VDR planning and later implementation.
- RP20.P00.M08 | Prepare H20 preflight | Define the fields Hermes records before Data Room And VDR implementation starts.
- RP20.P00.M09 | Prepare C20 design brief | Prepare Claude Code questions around buyer sees wrong folder, RFI leak, CP status drift, and missing tests.
- RP20.P00.M10 | Close RP20.P00 handoff | Hand off a contract-first Data Room And VDR implementation scope to AI.

## RP20.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/vdr/src/model.js, packages/vdr/src/states.js, packages/vdr/src/registry.js

Target tests: packages/vdr/test/model.test.js

- RP20.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/vdr.
- RP20.P01.M01 | Implement DataRoom model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for DataRoom.
- RP20.P01.M02 | Implement RoomFolder model | Define required fields, references, ownership metadata, and state constraints for RoomFolder.
- RP20.P01.M03 | Implement RFI model | Define required fields, relationship references, allowed states, and security attributes for RFI.
- RP20.P01.M04 | Implement ConditionPrecedent model | Define required fields, lifecycle states, ownership boundaries, and audit references for ConditionPrecedent.
- RP20.P01.M05 | Implement ClosingBinder model | Define required fields, state transitions, permission attributes, and reporting references for ClosingBinder.
- RP20.P01.M06 | Implement relationship map | Map relationships among DataRoom, RoomFolder, RFI, ConditionPrecedent, ClosingBinder, AccessAnalytics and their Core/Matter/DMS dependencies.
- RP20.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Data Room And VDR.
- RP20.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP20.P01.M09 | Export model registry | Export Data Room And VDR model definitions through a stable package interface.
- RP20.P01.M10 | Close domain model phase | Confirm the Data Room And VDR model surface is implementation-ready and does not require new scope decisions.

## RP20.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/vdr/src/service.js, packages/vdr/src/policies.js, packages/vdr/src/validators.js

Target tests: packages/vdr/test/service.test.js

- RP20.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for room setup, buyer access, and RFI workflow.
- RP20.P02.M01 | Implement room setup | Implement validation, permission precheck, audit hint, and state transition logic for room setup.
- RP20.P02.M02 | Implement buyer access | Implement validation, permission precheck, audit hint, and state transition logic for buyer access.
- RP20.P02.M03 | Implement RFI workflow | Implement validation, permission precheck, audit hint, and state transition logic for RFI workflow.
- RP20.P02.M04 | Implement CP tracking | Implement validation, permission precheck, audit hint, and state transition logic for CP tracking.
- RP20.P02.M05 | Implement closing binder generation | Implement validation, permission precheck, audit hint, and state transition logic for closing binder generation.
- RP20.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for buyer sees wrong folder, RFI leak, and CP status drift.
- RP20.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Data Room And VDR operations.
- RP20.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H20.
- RP20.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Data Room And VDR outcomes to attorney or admin review instead of direct mutation.
- RP20.P02.M10 | Close service logic phase | Confirm Data Room And VDR services are deterministic, auditable, and fail closed where required.

## RP20.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/vdr/src/index.js, packages/vdr/src/api-contract.js, packages/vdr/src/errors.js

Target tests: packages/vdr/test/interface.test.js

- RP20.P03.M00 | Define public exports | Expose Data Room And VDR models, services, fixtures, validators, and error codes from package index.
- RP20.P03.M01 | Define room setup API | Lock request, response, permission, audit, and error shape for room setup.
- RP20.P03.M02 | Define buyer access API | Lock request, response, permission, audit, and error shape for buyer access.
- RP20.P03.M03 | Define RFI workflow API | Lock request, response, permission, audit, and error shape for RFI workflow.
- RP20.P03.M04 | Define CP tracking API | Lock request, response, permission, audit, and error shape for CP tracking.
- RP20.P03.M05 | Define closing binder generation API | Lock request, response, permission, audit, and error shape for closing binder generation.
- RP20.P03.M06 | Define serialization contract | Ensure Data Room And VDR API responses serialize without leaking hidden policy internals or unauthorized data.
- RP20.P03.M07 | Define stable error codes | Add error codes for buyer sees wrong folder, RFI leak, CP status drift, access analytics untrimmed, and review_required.
- RP20.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H20 evidence without making Hermes product authority.
- RP20.P03.M09 | Define Claude review summary | Expose enough interface summary for C20 cross-validation.
- RP20.P03.M10 | Close API interface phase | Freeze Data Room And VDR public interface until a later RP explicitly extends it.

## RP20.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp20-ui-surface.md

Target tests: npm run build

- RP20.P04.M00 | Inventory UI surfaces | Identify VDR room, RFI board, CP checklist, and access analytics in the Jira-like Law Firm OS UI.
- RP20.P04.M01 | Plan VDR room | Map data, loading state, empty state, denied state, and audit hints for VDR room.
- RP20.P04.M02 | Plan RFI board | Map data, loading state, empty state, denied state, and audit hints for RFI board.
- RP20.P04.M03 | Plan CP checklist | Map data, loading state, empty state, denied state, and audit hints for CP checklist.
- RP20.P04.M04 | Plan access analytics | Map data, loading state, empty state, denied state, and audit hints for access analytics.
- RP20.P04.M05 | Plan review-required UI | Show high-risk Data Room And VDR outcomes as review queue items, not silent successes.
- RP20.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Data Room And VDR rows, counts, snippets, and citations are hidden before display.
- RP20.P04.M07 | Plan responsive density | Keep Data Room And VDR context readable on desktop and mobile without marketing-page layout.
- RP20.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Data Room And VDR service decisions.
- RP20.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Data Room And VDR.
- RP20.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP20.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/vdr/src/fixtures.js, packages/vdr/fixtures/golden-cases.json

Target tests: packages/vdr/test/golden-cases.test.js

- RP20.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Data Room And VDR.
- RP20.P05.M01 | Define room permission trimmed golden case | Create a synthetic golden case proving room permission trimmed.
- RP20.P05.M02 | Define RFI answered golden case | Create a synthetic golden case proving RFI answered.
- RP20.P05.M03 | Define CP completed golden case | Create a synthetic golden case proving CP completed.
- RP20.P05.M04 | Define binder generated golden case | Create a synthetic golden case proving binder generated.
- RP20.P05.M05 | Define buyer sees wrong folder failure fixture | Create a synthetic failing case that proves buyer sees wrong folder is blocked or reviewed.
- RP20.P05.M06 | Define RFI leak failure fixture | Create a synthetic failing case that proves RFI leak is blocked or reviewed.
- RP20.P05.M07 | Define CP status drift failure fixture | Create a synthetic failing case that proves CP status drift is blocked or reviewed.
- RP20.P05.M08 | Define replayable fixture manifest | Serialize Data Room And VDR fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP20.P05.M09 | Define AI retrieval/report fixture | If Data Room And VDR appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP20.P05.M10 | Close fixtures phase | Confirm Data Room And VDR fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP20.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/vdr/src/security-contract.js, packages/vdr/src/audit-hints.js, packages/audit/README.md

Target tests: packages/vdr/test/security-audit.test.js

- RP20.P06.M00 | Define permission contract | Specify required permission checks for room setup, buyer access, RFI workflow, and CP tracking.
- RP20.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Data Room And VDR view and search surfaces.
- RP20.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Data Room And VDR mutations.
- RP20.P06.M03 | Bind export/download permission | Return stronger audit hints for Data Room And VDR export, download, or external-share actions.
- RP20.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Data Room And VDR.
- RP20.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Data Room And VDR where applicable.
- RP20.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Data Room And VDR obey security trimming.
- RP20.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Data Room And VDR.
- RP20.P06.M08 | Prepare H20 audit evidence | Record which Data Room And VDR decisions require downstream audit event persistence.
- RP20.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Data Room And VDR.
- RP20.P06.M10 | Close permission audit integration | Confirm Data Room And VDR cannot ship without permission and audit evidence coverage.

## RP20.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/vdr/test/failure-cases.test.js, docs/rp20-recovery-notes.md

Target tests: packages/vdr/test/failure-cases.test.js

- RP20.P07.M00 | Define buyer sees wrong folder failure | Fail closed or require review when buyer sees wrong folder appears in Data Room And VDR.
- RP20.P07.M01 | Define RFI leak failure | Fail closed or require review when RFI leak appears in Data Room And VDR.
- RP20.P07.M02 | Define CP status drift failure | Fail closed or require review when CP status drift appears in Data Room And VDR.
- RP20.P07.M03 | Define access analytics untrimmed failure | Fail closed or require review when access analytics untrimmed appears in Data Room And VDR.
- RP20.P07.M04 | Define binder missing version failure | Fail closed or require review when binder missing version appears in Data Room And VDR.
- RP20.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Data Room And VDR.
- RP20.P07.M06 | Define cross-tenant failure | Deny or block any Data Room And VDR operation where actor and resource tenant IDs differ.
- RP20.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Data Room And VDR operations.
- RP20.P07.M08 | Define recovery handoff | Document how a failed Data Room And VDR micro phase is corrected before advancing.
- RP20.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Data Room And VDR.
- RP20.P07.M10 | Close failure phase | Confirm dangerous Data Room And VDR ambiguity fails closed or requires review.

## RP20.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp20-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP20.P08.M00 | Define H20 command matrix | Record exact product commands Hermes should run for Data Room And VDR.
- RP20.P08.M01 | Define H20 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP20.P08.M02 | Define H20 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Data Room And VDR.
- RP20.P08.M03 | Define H20 no-real-data evidence | Record that Data Room And VDR fixtures and examples contain only synthetic data.
- RP20.P08.M04 | Define H20 blocked-claim evidence | Record unsafe Data Room And VDR claims rejected by validators or tests.
- RP20.P08.M05 | Define H20 Claude dependency | Mark C20 review mandatory before Data Room And VDR closeout.
- RP20.P08.M06 | Define H20 human approval note | Record what the human must approve for Data Room And VDR.
- RP20.P08.M07 | Test H20 command availability | Ensure npm scripts required by H20 exist before handoff.
- RP20.P08.M08 | Prepare H20 evidence packet template | Create the evidence template Hermes will fill during Data Room And VDR implementation closeout.
- RP20.P08.M09 | Prepare H20 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H20.
- RP20.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Data Room And VDR behavior without owning product code.

## RP20.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp20-claude-cross-validation-brief.md, docs/rp20-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP20.P09.M00 | Prepare RP20 architecture review questions | Ask whether Data Room And VDR module boundaries, model shapes, and workflows match the specification.
- RP20.P09.M01 | Prepare RP20 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Data Room And VDR.
- RP20.P09.M02 | Prepare RP20 bypass review questions | Ask Claude to find buyer sees wrong folder, RFI leak, CP status drift, access analytics untrimmed, and binder missing version bypasses.
- RP20.P09.M03 | Prepare RP20 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Data Room And VDR.
- RP20.P09.M04 | Prepare RP20 downstream readiness questions | Ask whether Data Room And VDR is ready for dependent modules and later enterprise hardening.
- RP20.P09.M05 | Prepare RP20 risk register | List unresolved Data Room And VDR risks and route them to future RP corrections.
- RP20.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Data Room And VDR findings.
- RP20.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Data Room And VDR closeout.
- RP20.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP20.Pxx.Mxx correction or later RP dependency.
- RP20.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Data Room And VDR can be considered ready.
- RP20.P09.M10 | Close RP20 detailed plan | Confirm Data Room And VDR is detailed enough for AI implementation without more planning decisions.

