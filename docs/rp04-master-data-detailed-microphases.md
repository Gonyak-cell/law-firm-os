# RP04 Master Data Detailed Micro Phases v1

Purpose: expand RP04 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP04 Master Data
- Scope: Entity, Person, Organization, Relationship, Client Group
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H04
- Claude Code gate: C04
- Immediate next implementation target: RP04.P00.M00

## RP04.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/master-data-contract.json, packages/master-data/README.md, contracts/master-data-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP04.P00.M00 | Inventory spec and acceptance source | Extract Entity, Person, Organization, Relationship, Client Group requirements and identify duplicate identity, relationship direction error, and client group leakage as explicit acceptance risks.
- RP04.P00.M01 | Draft contract shell | Create the future Master Data contract shape for Entity, Person, Organization, ClientGroup, Relationship, ContactPoint, BillingProfile.
- RP04.P00.M02 | Define ownership boundary | Record which module owns Entity, Person, and Organization, and which modules may only reference them.
- RP04.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for entity creation, client grouping, and relationship mapping.
- RP04.P00.M04 | Define Matter-first trace rules | State how Master Data records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP04.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Master Data behavior can run.
- RP04.P00.M06 | Define synthetic-only fixture policy | State that Master Data examples use fake tenants, users, matters, documents, and financial values only.
- RP04.P00.M07 | Define validation command matrix | List the product commands required to verify Master Data planning and later implementation.
- RP04.P00.M08 | Prepare H04 preflight | Define the fields Hermes records before Master Data implementation starts.
- RP04.P00.M09 | Prepare C04 design brief | Prepare Claude Code questions around duplicate identity, relationship direction error, client group leakage, and missing tests.
- RP04.P00.M10 | Close RP04.P00 handoff | Hand off a contract-first Master Data implementation scope to AI.

## RP04.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/master-data/src/model.js, packages/master-data/src/states.js, packages/master-data/src/registry.js

Target tests: packages/master-data/test/model.test.js

- RP04.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/master-data.
- RP04.P01.M01 | Implement Entity model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for Entity.
- RP04.P01.M02 | Implement Person model | Define required fields, references, ownership metadata, and state constraints for Person.
- RP04.P01.M03 | Implement Organization model | Define required fields, relationship references, allowed states, and security attributes for Organization.
- RP04.P01.M04 | Implement ClientGroup model | Define required fields, lifecycle states, ownership boundaries, and audit references for ClientGroup.
- RP04.P01.M05 | Implement Relationship model | Define required fields, state transitions, permission attributes, and reporting references for Relationship.
- RP04.P01.M06 | Implement relationship map | Map relationships among Entity, Person, Organization, ClientGroup, Relationship, ContactPoint, BillingProfile and their Core/Matter/DMS dependencies.
- RP04.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Master Data.
- RP04.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP04.P01.M09 | Export model registry | Export Master Data model definitions through a stable package interface.
- RP04.P01.M10 | Close domain model phase | Confirm the Master Data model surface is implementation-ready and does not require new scope decisions.

## RP04.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/master-data/src/service.js, packages/master-data/src/policies.js, packages/master-data/src/validators.js

Target tests: packages/master-data/test/service.test.js

- RP04.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for entity creation, client grouping, and relationship mapping.
- RP04.P02.M01 | Implement entity creation | Implement validation, permission precheck, audit hint, and state transition logic for entity creation.
- RP04.P02.M02 | Implement client grouping | Implement validation, permission precheck, audit hint, and state transition logic for client grouping.
- RP04.P02.M03 | Implement relationship mapping | Implement validation, permission precheck, audit hint, and state transition logic for relationship mapping.
- RP04.P02.M04 | Implement contact normalization | Implement validation, permission precheck, audit hint, and state transition logic for contact normalization.
- RP04.P02.M05 | Implement duplicate review | Implement validation, permission precheck, audit hint, and state transition logic for duplicate review.
- RP04.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for duplicate identity, relationship direction error, and client group leakage.
- RP04.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Master Data operations.
- RP04.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H04.
- RP04.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Master Data outcomes to attorney or admin review instead of direct mutation.
- RP04.P02.M10 | Close service logic phase | Confirm Master Data services are deterministic, auditable, and fail closed where required.

## RP04.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/master-data/src/index.js, packages/master-data/src/api-contract.js, packages/master-data/src/errors.js

Target tests: packages/master-data/test/interface.test.js

- RP04.P03.M00 | Define public exports | Expose Master Data models, services, fixtures, validators, and error codes from package index.
- RP04.P03.M01 | Define entity creation API | Lock request, response, permission, audit, and error shape for entity creation.
- RP04.P03.M02 | Define client grouping API | Lock request, response, permission, audit, and error shape for client grouping.
- RP04.P03.M03 | Define relationship mapping API | Lock request, response, permission, audit, and error shape for relationship mapping.
- RP04.P03.M04 | Define contact normalization API | Lock request, response, permission, audit, and error shape for contact normalization.
- RP04.P03.M05 | Define duplicate review API | Lock request, response, permission, audit, and error shape for duplicate review.
- RP04.P03.M06 | Define serialization contract | Ensure Master Data API responses serialize without leaking hidden policy internals or unauthorized data.
- RP04.P03.M07 | Define stable error codes | Add error codes for duplicate identity, relationship direction error, client group leakage, billing identity mismatch, and review_required.
- RP04.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H04 evidence without making Hermes product authority.
- RP04.P03.M09 | Define Claude review summary | Expose enough interface summary for C04 cross-validation.
- RP04.P03.M10 | Close API interface phase | Freeze Master Data public interface until a later RP explicitly extends it.

## RP04.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp04-ui-surface.md

Target tests: npm run build

- RP04.P04.M00 | Inventory UI surfaces | Identify entity profile, client group view, relationship graph, and duplicate review queue in the Jira-like Law Firm OS UI.
- RP04.P04.M01 | Plan entity profile | Map data, loading state, empty state, denied state, and audit hints for entity profile.
- RP04.P04.M02 | Plan client group view | Map data, loading state, empty state, denied state, and audit hints for client group view.
- RP04.P04.M03 | Plan relationship graph | Map data, loading state, empty state, denied state, and audit hints for relationship graph.
- RP04.P04.M04 | Plan duplicate review queue | Map data, loading state, empty state, denied state, and audit hints for duplicate review queue.
- RP04.P04.M05 | Plan review-required UI | Show high-risk Master Data outcomes as review queue items, not silent successes.
- RP04.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Master Data rows, counts, snippets, and citations are hidden before display.
- RP04.P04.M07 | Plan responsive density | Keep Master Data context readable on desktop and mobile without marketing-page layout.
- RP04.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Master Data service decisions.
- RP04.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Master Data.
- RP04.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP04.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/master-data/src/fixtures.js, packages/master-data/fixtures/golden-cases.json

Target tests: packages/master-data/test/golden-cases.test.js

- RP04.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Master Data.
- RP04.P05.M01 | Define organization client created golden case | Create a synthetic golden case proving organization client created.
- RP04.P05.M02 | Define person relationship linked golden case | Create a synthetic golden case proving person relationship linked.
- RP04.P05.M03 | Define duplicate candidate flagged golden case | Create a synthetic golden case proving duplicate candidate flagged.
- RP04.P05.M04 | Define client group consolidated golden case | Create a synthetic golden case proving client group consolidated.
- RP04.P05.M05 | Define duplicate identity failure fixture | Create a synthetic failing case that proves duplicate identity is blocked or reviewed.
- RP04.P05.M06 | Define relationship direction error failure fixture | Create a synthetic failing case that proves relationship direction error is blocked or reviewed.
- RP04.P05.M07 | Define client group leakage failure fixture | Create a synthetic failing case that proves client group leakage is blocked or reviewed.
- RP04.P05.M08 | Define replayable fixture manifest | Serialize Master Data fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP04.P05.M09 | Define AI retrieval/report fixture | If Master Data appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP04.P05.M10 | Close fixtures phase | Confirm Master Data fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP04.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/master-data/src/security-contract.js, packages/master-data/src/audit-hints.js, packages/audit/README.md

Target tests: packages/master-data/test/security-audit.test.js

- RP04.P06.M00 | Define permission contract | Specify required permission checks for entity creation, client grouping, relationship mapping, and contact normalization.
- RP04.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Master Data view and search surfaces.
- RP04.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Master Data mutations.
- RP04.P06.M03 | Bind export/download permission | Return stronger audit hints for Master Data export, download, or external-share actions.
- RP04.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Master Data.
- RP04.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Master Data where applicable.
- RP04.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Master Data obey security trimming.
- RP04.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Master Data.
- RP04.P06.M08 | Prepare H04 audit evidence | Record which Master Data decisions require downstream audit event persistence.
- RP04.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Master Data.
- RP04.P06.M10 | Close permission audit integration | Confirm Master Data cannot ship without permission and audit evidence coverage.

## RP04.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/master-data/test/failure-cases.test.js, docs/rp04-recovery-notes.md

Target tests: packages/master-data/test/failure-cases.test.js

- RP04.P07.M00 | Define duplicate identity failure | Fail closed or require review when duplicate identity appears in Master Data.
- RP04.P07.M01 | Define relationship direction error failure | Fail closed or require review when relationship direction error appears in Master Data.
- RP04.P07.M02 | Define client group leakage failure | Fail closed or require review when client group leakage appears in Master Data.
- RP04.P07.M03 | Define billing identity mismatch failure | Fail closed or require review when billing identity mismatch appears in Master Data.
- RP04.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Master Data.
- RP04.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Master Data.
- RP04.P07.M06 | Define cross-tenant failure | Deny or block any Master Data operation where actor and resource tenant IDs differ.
- RP04.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Master Data operations.
- RP04.P07.M08 | Define recovery handoff | Document how a failed Master Data micro phase is corrected before advancing.
- RP04.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Master Data.
- RP04.P07.M10 | Close failure phase | Confirm dangerous Master Data ambiguity fails closed or requires review.

## RP04.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp04-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP04.P08.M00 | Define H04 command matrix | Record exact product commands Hermes should run for Master Data.
- RP04.P08.M01 | Define H04 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP04.P08.M02 | Define H04 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Master Data.
- RP04.P08.M03 | Define H04 no-real-data evidence | Record that Master Data fixtures and examples contain only synthetic data.
- RP04.P08.M04 | Define H04 blocked-claim evidence | Record unsafe Master Data claims rejected by validators or tests.
- RP04.P08.M05 | Define H04 Claude dependency | Mark C04 review mandatory before Master Data closeout.
- RP04.P08.M06 | Define H04 human approval note | Record what the human must approve for Master Data.
- RP04.P08.M07 | Test H04 command availability | Ensure npm scripts required by H04 exist before handoff.
- RP04.P08.M08 | Prepare H04 evidence packet template | Create the evidence template Hermes will fill during Master Data implementation closeout.
- RP04.P08.M09 | Prepare H04 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H04.
- RP04.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Master Data behavior without owning product code.

## RP04.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp04-claude-cross-validation-brief.md, docs/rp04-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP04.P09.M00 | Prepare RP04 architecture review questions | Ask whether Master Data module boundaries, model shapes, and workflows match the specification.
- RP04.P09.M01 | Prepare RP04 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Master Data.
- RP04.P09.M02 | Prepare RP04 bypass review questions | Ask Claude to find duplicate identity, relationship direction error, client group leakage, billing identity mismatch, and undefined bypasses.
- RP04.P09.M03 | Prepare RP04 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Master Data.
- RP04.P09.M04 | Prepare RP04 downstream readiness questions | Ask whether Master Data is ready for dependent modules and later enterprise hardening.
- RP04.P09.M05 | Prepare RP04 risk register | List unresolved Master Data risks and route them to future RP corrections.
- RP04.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Master Data findings.
- RP04.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Master Data closeout.
- RP04.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP04.Pxx.Mxx correction or later RP dependency.
- RP04.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Master Data can be considered ready.
- RP04.P09.M10 | Close RP04 detailed plan | Confirm Master Data is detailed enough for AI implementation without more planning decisions.

