# RP09 CRM And Business Development Detailed Micro Phases v1

Purpose: expand RP09 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP09 CRM And Business Development
- Scope: Lead, Opportunity, Activity, Proposal, Campaign, Referral
- Micro phases: 110
- AI owner: Cursor/Codex
- Hermes gate: H09
- Claude Code gate: C09
- Immediate next implementation target: RP09.P00.M00

## RP09.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/crm-contract.json, packages/crm/README.md, contracts/crm-business-development-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP09.P00.M00 | Inventory spec and acceptance source | Extract Lead, Opportunity, Activity, Proposal, Campaign, Referral requirements and identify conflict check skipped, pre-matter data overreach, and proposal without review as explicit acceptance risks.
- RP09.P00.M01 | Draft contract shell | Create the future CRM And Business Development contract shape for Lead, Opportunity, Activity, Proposal, Campaign, Referral, PipelineStage.
- RP09.P00.M02 | Define ownership boundary | Record which module owns Lead, Opportunity, and Activity, and which modules may only reference them.
- RP09.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for lead capture, opportunity qualification, and activity logging.
- RP09.P00.M04 | Define Matter-first trace rules | State how CRM And Business Development records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP09.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before CRM And Business Development behavior can run.
- RP09.P00.M06 | Define synthetic-only fixture policy | State that CRM And Business Development examples use fake tenants, users, matters, documents, and financial values only.
- RP09.P00.M07 | Define validation command matrix | List the product commands required to verify CRM And Business Development planning and later implementation.
- RP09.P00.M08 | Prepare H09 preflight | Define the fields Hermes records before CRM And Business Development implementation starts.
- RP09.P00.M09 | Prepare C09 design brief | Prepare Claude Code questions around conflict check skipped, pre-matter data overreach, proposal without review, and missing tests.
- RP09.P00.M10 | Close RP09.P00 handoff | Hand off a contract-first CRM And Business Development implementation scope to AI.

## RP09.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/crm/src/model.js, packages/crm/src/states.js, packages/crm/src/registry.js

Target tests: packages/crm/test/model.test.js

- RP09.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/crm.
- RP09.P01.M01 | Implement Lead model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for Lead.
- RP09.P01.M02 | Implement Opportunity model | Define required fields, references, ownership metadata, and state constraints for Opportunity.
- RP09.P01.M03 | Implement Activity model | Define required fields, relationship references, allowed states, and security attributes for Activity.
- RP09.P01.M04 | Implement Proposal model | Define required fields, lifecycle states, ownership boundaries, and audit references for Proposal.
- RP09.P01.M05 | Implement Campaign model | Define required fields, state transitions, permission attributes, and reporting references for Campaign.
- RP09.P01.M06 | Implement relationship map | Map relationships among Lead, Opportunity, Activity, Proposal, Campaign, Referral, PipelineStage and their Core/Matter/DMS dependencies.
- RP09.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for CRM And Business Development.
- RP09.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP09.P01.M09 | Export model registry | Export CRM And Business Development model definitions through a stable package interface.
- RP09.P01.M10 | Close domain model phase | Confirm the CRM And Business Development model surface is implementation-ready and does not require new scope decisions.

## RP09.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/crm/src/service.js, packages/crm/src/policies.js, packages/crm/src/validators.js

Target tests: packages/crm/test/service.test.js

- RP09.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for lead capture, opportunity qualification, and activity logging.
- RP09.P02.M01 | Implement lead capture | Implement validation, permission precheck, audit hint, and state transition logic for lead capture.
- RP09.P02.M02 | Implement opportunity qualification | Implement validation, permission precheck, audit hint, and state transition logic for opportunity qualification.
- RP09.P02.M03 | Implement activity logging | Implement validation, permission precheck, audit hint, and state transition logic for activity logging.
- RP09.P02.M04 | Implement proposal generation | Implement validation, permission precheck, audit hint, and state transition logic for proposal generation.
- RP09.P02.M05 | Implement matter conversion | Implement validation, permission precheck, audit hint, and state transition logic for matter conversion.
- RP09.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for conflict check skipped, pre-matter data overreach, and proposal without review.
- RP09.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky CRM And Business Development operations.
- RP09.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H09.
- RP09.P02.M09 | Implement review-required routing | Route high-risk or ambiguous CRM And Business Development outcomes to attorney or admin review instead of direct mutation.
- RP09.P02.M10 | Close service logic phase | Confirm CRM And Business Development services are deterministic, auditable, and fail closed where required.

## RP09.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/crm/src/index.js, packages/crm/src/api-contract.js, packages/crm/src/errors.js

Target tests: packages/crm/test/interface.test.js

- RP09.P03.M00 | Define public exports | Expose CRM And Business Development models, services, fixtures, validators, and error codes from package index.
- RP09.P03.M01 | Define lead capture API | Lock request, response, permission, audit, and error shape for lead capture.
- RP09.P03.M02 | Define opportunity qualification API | Lock request, response, permission, audit, and error shape for opportunity qualification.
- RP09.P03.M03 | Define activity logging API | Lock request, response, permission, audit, and error shape for activity logging.
- RP09.P03.M04 | Define proposal generation API | Lock request, response, permission, audit, and error shape for proposal generation.
- RP09.P03.M05 | Define matter conversion API | Lock request, response, permission, audit, and error shape for matter conversion.
- RP09.P03.M06 | Define serialization contract | Ensure CRM And Business Development API responses serialize without leaking hidden policy internals or unauthorized data.
- RP09.P03.M07 | Define stable error codes | Add error codes for conflict check skipped, pre-matter data overreach, proposal without review, client duplicate, and review_required.
- RP09.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H09 evidence without making Hermes product authority.
- RP09.P03.M09 | Define Claude review summary | Expose enough interface summary for C09 cross-validation.
- RP09.P03.M10 | Close API interface phase | Freeze CRM And Business Development public interface until a later RP explicitly extends it.

## RP09.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp09-ui-surface.md

Target tests: npm run build

- RP09.P04.M00 | Inventory UI surfaces | Identify pipeline board, lead profile, activity timeline, and proposal panel in the Jira-like Law Firm OS UI.
- RP09.P04.M01 | Plan pipeline board | Map data, loading state, empty state, denied state, and audit hints for pipeline board.
- RP09.P04.M02 | Plan lead profile | Map data, loading state, empty state, denied state, and audit hints for lead profile.
- RP09.P04.M03 | Plan activity timeline | Map data, loading state, empty state, denied state, and audit hints for activity timeline.
- RP09.P04.M04 | Plan proposal panel | Map data, loading state, empty state, denied state, and audit hints for proposal panel.
- RP09.P04.M05 | Plan review-required UI | Show high-risk CRM And Business Development outcomes as review queue items, not silent successes.
- RP09.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized CRM And Business Development rows, counts, snippets, and citations are hidden before display.
- RP09.P04.M07 | Plan responsive density | Keep CRM And Business Development context readable on desktop and mobile without marketing-page layout.
- RP09.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override CRM And Business Development service decisions.
- RP09.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for CRM And Business Development.
- RP09.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP09.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/crm/src/fixtures.js, packages/crm/fixtures/golden-cases.json

Target tests: packages/crm/test/golden-cases.test.js

- RP09.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for CRM And Business Development.
- RP09.P05.M01 | Define lead created golden case | Create a synthetic golden case proving lead created.
- RP09.P05.M02 | Define opportunity advanced golden case | Create a synthetic golden case proving opportunity advanced.
- RP09.P05.M03 | Define proposal approved golden case | Create a synthetic golden case proving proposal approved.
- RP09.P05.M04 | Define opportunity converted to matter golden case | Create a synthetic golden case proving opportunity converted to matter.
- RP09.P05.M05 | Define conflict check skipped failure fixture | Create a synthetic failing case that proves conflict check skipped is blocked or reviewed.
- RP09.P05.M06 | Define pre-matter data overreach failure fixture | Create a synthetic failing case that proves pre-matter data overreach is blocked or reviewed.
- RP09.P05.M07 | Define proposal without review failure fixture | Create a synthetic failing case that proves proposal without review is blocked or reviewed.
- RP09.P05.M08 | Define replayable fixture manifest | Serialize CRM And Business Development fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP09.P05.M09 | Define AI retrieval/report fixture | If CRM And Business Development appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP09.P05.M10 | Close fixtures phase | Confirm CRM And Business Development fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP09.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/crm/src/security-contract.js, packages/crm/src/audit-hints.js, packages/audit/README.md

Target tests: packages/crm/test/security-audit.test.js

- RP09.P06.M00 | Define permission contract | Specify required permission checks for lead capture, opportunity qualification, activity logging, and proposal generation.
- RP09.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for CRM And Business Development view and search surfaces.
- RP09.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for CRM And Business Development mutations.
- RP09.P06.M03 | Bind export/download permission | Return stronger audit hints for CRM And Business Development export, download, or external-share actions.
- RP09.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for CRM And Business Development.
- RP09.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for CRM And Business Development where applicable.
- RP09.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for CRM And Business Development obey security trimming.
- RP09.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for CRM And Business Development.
- RP09.P06.M08 | Prepare H09 audit evidence | Record which CRM And Business Development decisions require downstream audit event persistence.
- RP09.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for CRM And Business Development.
- RP09.P06.M10 | Close permission audit integration | Confirm CRM And Business Development cannot ship without permission and audit evidence coverage.

## RP09.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/crm/test/failure-cases.test.js, docs/rp09-recovery-notes.md

Target tests: packages/crm/test/failure-cases.test.js

- RP09.P07.M00 | Define conflict check skipped failure | Fail closed or require review when conflict check skipped appears in CRM And Business Development.
- RP09.P07.M01 | Define pre-matter data overreach failure | Fail closed or require review when pre-matter data overreach appears in CRM And Business Development.
- RP09.P07.M02 | Define proposal without review failure | Fail closed or require review when proposal without review appears in CRM And Business Development.
- RP09.P07.M03 | Define client duplicate failure | Fail closed or require review when client duplicate appears in CRM And Business Development.
- RP09.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in CRM And Business Development.
- RP09.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for CRM And Business Development.
- RP09.P07.M06 | Define cross-tenant failure | Deny or block any CRM And Business Development operation where actor and resource tenant IDs differ.
- RP09.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed CRM And Business Development operations.
- RP09.P07.M08 | Define recovery handoff | Document how a failed CRM And Business Development micro phase is corrected before advancing.
- RP09.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for CRM And Business Development.
- RP09.P07.M10 | Close failure phase | Confirm dangerous CRM And Business Development ambiguity fails closed or requires review.

## RP09.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp09-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP09.P08.M00 | Define H09 command matrix | Record exact product commands Hermes should run for CRM And Business Development.
- RP09.P08.M01 | Define H09 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP09.P08.M02 | Define H09 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for CRM And Business Development.
- RP09.P08.M03 | Define H09 no-real-data evidence | Record that CRM And Business Development fixtures and examples contain only synthetic data.
- RP09.P08.M04 | Define H09 blocked-claim evidence | Record unsafe CRM And Business Development claims rejected by validators or tests.
- RP09.P08.M05 | Define H09 Claude dependency | Mark C09 review mandatory before CRM And Business Development closeout.
- RP09.P08.M06 | Define H09 human approval note | Record what the human must approve for CRM And Business Development.
- RP09.P08.M07 | Test H09 command availability | Ensure npm scripts required by H09 exist before handoff.
- RP09.P08.M08 | Prepare H09 evidence packet template | Create the evidence template Hermes will fill during CRM And Business Development implementation closeout.
- RP09.P08.M09 | Prepare H09 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H09.
- RP09.P08.M10 | Close Hermes binding phase | Confirm Hermes validates CRM And Business Development behavior without owning product code.

## RP09.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp09-claude-cross-validation-brief.md, docs/rp09-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP09.P09.M00 | Prepare RP09 architecture review questions | Ask whether CRM And Business Development module boundaries, model shapes, and workflows match the specification.
- RP09.P09.M01 | Prepare RP09 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for CRM And Business Development.
- RP09.P09.M02 | Prepare RP09 bypass review questions | Ask Claude to find conflict check skipped, pre-matter data overreach, proposal without review, client duplicate, and undefined bypasses.
- RP09.P09.M03 | Prepare RP09 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for CRM And Business Development.
- RP09.P09.M04 | Prepare RP09 downstream readiness questions | Ask whether CRM And Business Development is ready for dependent modules and later enterprise hardening.
- RP09.P09.M05 | Prepare RP09 risk register | List unresolved CRM And Business Development risks and route them to future RP corrections.
- RP09.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for CRM And Business Development findings.
- RP09.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for CRM And Business Development closeout.
- RP09.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP09.Pxx.Mxx correction or later RP dependency.
- RP09.P09.M09 | Prepare human approval summary | Summarize what the user must approve before CRM And Business Development can be considered ready.
- RP09.P09.M10 | Close RP09 detailed plan | Confirm CRM And Business Development is detailed enough for AI implementation without more planning decisions.

