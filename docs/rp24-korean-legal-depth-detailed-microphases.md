# RP24 Korean Legal Depth Detailed Micro Phases v1

Purpose: expand RP24 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP24 Korean Legal Depth
- Scope: HWPX, Korean clauses, litigation, corporate documents
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H24
- Claude Code gate: C24
- Immediate next implementation target: RP24.P00.M00

## RP24.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/korean-legal-contract.json, packages/korean-legal/README.md, contracts/korean-legal-depth-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP24.P00.M00 | Inventory spec and acceptance source | Extract HWPX, Korean clauses, litigation, corporate documents requirements and identify HWPX parse loss, wrong legal deadline, and Korean clause hallucination as explicit acceptance risks.
- RP24.P00.M01 | Draft contract shell | Create the future Korean Legal Depth contract shape for HWPXDocument, KoreanClause, LitigationCase, CorporateFiling, CourtDeadline, KoreanTemplate.
- RP24.P00.M02 | Define ownership boundary | Record which module owns HWPXDocument, KoreanClause, and LitigationCase, and which modules may only reference them.
- RP24.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for HWPX import, Korean clause search, and litigation deadline tracking.
- RP24.P00.M04 | Define Matter-first trace rules | State how Korean Legal Depth records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP24.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Korean Legal Depth behavior can run.
- RP24.P00.M06 | Define synthetic-only fixture policy | State that Korean Legal Depth examples use fake tenants, users, matters, documents, and financial values only.
- RP24.P00.M07 | Define validation command matrix | List the product commands required to verify Korean Legal Depth planning and later implementation.
- RP24.P00.M08 | Prepare H24 preflight | Define the fields Hermes records before Korean Legal Depth implementation starts.
- RP24.P00.M09 | Prepare C24 design brief | Prepare Claude Code questions around HWPX parse loss, wrong legal deadline, Korean clause hallucination, and missing tests.
- RP24.P00.M10 | Close RP24.P00 handoff | Hand off a contract-first Korean Legal Depth implementation scope to AI.

## RP24.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/korean-legal/src/model.js, packages/korean-legal/src/states.js, packages/korean-legal/src/registry.js

Target tests: packages/korean-legal/test/model.test.js

- RP24.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/korean-legal.
- RP24.P01.M01 | Implement HWPXDocument model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for HWPXDocument.
- RP24.P01.M02 | Implement KoreanClause model | Define required fields, references, ownership metadata, and state constraints for KoreanClause.
- RP24.P01.M03 | Implement LitigationCase model | Define required fields, relationship references, allowed states, and security attributes for LitigationCase.
- RP24.P01.M04 | Implement CorporateFiling model | Define required fields, lifecycle states, ownership boundaries, and audit references for CorporateFiling.
- RP24.P01.M05 | Implement CourtDeadline model | Define required fields, state transitions, permission attributes, and reporting references for CourtDeadline.
- RP24.P01.M06 | Implement relationship map | Map relationships among HWPXDocument, KoreanClause, LitigationCase, CorporateFiling, CourtDeadline, KoreanTemplate and their Core/Matter/DMS dependencies.
- RP24.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Korean Legal Depth.
- RP24.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP24.P01.M09 | Export model registry | Export Korean Legal Depth model definitions through a stable package interface.
- RP24.P01.M10 | Close domain model phase | Confirm the Korean Legal Depth model surface is implementation-ready and does not require new scope decisions.

## RP24.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/korean-legal/src/service.js, packages/korean-legal/src/policies.js, packages/korean-legal/src/validators.js

Target tests: packages/korean-legal/test/service.test.js

- RP24.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for HWPX import, Korean clause search, and litigation deadline tracking.
- RP24.P02.M01 | Implement HWPX import | Implement validation, permission precheck, audit hint, and state transition logic for HWPX import.
- RP24.P02.M02 | Implement Korean clause search | Implement validation, permission precheck, audit hint, and state transition logic for Korean clause search.
- RP24.P02.M03 | Implement litigation deadline tracking | Implement validation, permission precheck, audit hint, and state transition logic for litigation deadline tracking.
- RP24.P02.M04 | Implement corporate document assembly | Implement validation, permission precheck, audit hint, and state transition logic for corporate document assembly.
- RP24.P02.M05 | Implement court filing prep | Implement validation, permission precheck, audit hint, and state transition logic for court filing prep.
- RP24.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for HWPX parse loss, wrong legal deadline, and Korean clause hallucination.
- RP24.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Korean Legal Depth operations.
- RP24.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H24.
- RP24.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Korean Legal Depth outcomes to attorney or admin review instead of direct mutation.
- RP24.P02.M10 | Close service logic phase | Confirm Korean Legal Depth services are deterministic, auditable, and fail closed where required.

## RP24.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/korean-legal/src/index.js, packages/korean-legal/src/api-contract.js, packages/korean-legal/src/errors.js

Target tests: packages/korean-legal/test/interface.test.js

- RP24.P03.M00 | Define public exports | Expose Korean Legal Depth models, services, fixtures, validators, and error codes from package index.
- RP24.P03.M01 | Define HWPX import API | Lock request, response, permission, audit, and error shape for HWPX import.
- RP24.P03.M02 | Define Korean clause search API | Lock request, response, permission, audit, and error shape for Korean clause search.
- RP24.P03.M03 | Define litigation deadline tracking API | Lock request, response, permission, audit, and error shape for litigation deadline tracking.
- RP24.P03.M04 | Define corporate document assembly API | Lock request, response, permission, audit, and error shape for corporate document assembly.
- RP24.P03.M05 | Define court filing prep API | Lock request, response, permission, audit, and error shape for court filing prep.
- RP24.P03.M06 | Define serialization contract | Ensure Korean Legal Depth API responses serialize without leaking hidden policy internals or unauthorized data.
- RP24.P03.M07 | Define stable error codes | Add error codes for HWPX parse loss, wrong legal deadline, Korean clause hallucination, filing template drift, and review_required.
- RP24.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H24 evidence without making Hermes product authority.
- RP24.P03.M09 | Define Claude review summary | Expose enough interface summary for C24 cross-validation.
- RP24.P03.M10 | Close API interface phase | Freeze Korean Legal Depth public interface until a later RP explicitly extends it.

## RP24.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp24-ui-surface.md

Target tests: npm run build

- RP24.P04.M00 | Inventory UI surfaces | Identify HWPX preview, Korean clause library, litigation timeline, and corporate document wizard in the Jira-like Law Firm OS UI.
- RP24.P04.M01 | Plan HWPX preview | Map data, loading state, empty state, denied state, and audit hints for HWPX preview.
- RP24.P04.M02 | Plan Korean clause library | Map data, loading state, empty state, denied state, and audit hints for Korean clause library.
- RP24.P04.M03 | Plan litigation timeline | Map data, loading state, empty state, denied state, and audit hints for litigation timeline.
- RP24.P04.M04 | Plan corporate document wizard | Map data, loading state, empty state, denied state, and audit hints for corporate document wizard.
- RP24.P04.M05 | Plan review-required UI | Show high-risk Korean Legal Depth outcomes as review queue items, not silent successes.
- RP24.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Korean Legal Depth rows, counts, snippets, and citations are hidden before display.
- RP24.P04.M07 | Plan responsive density | Keep Korean Legal Depth context readable on desktop and mobile without marketing-page layout.
- RP24.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Korean Legal Depth service decisions.
- RP24.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Korean Legal Depth.
- RP24.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP24.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/korean-legal/src/fixtures.js, packages/korean-legal/fixtures/golden-cases.json

Target tests: packages/korean-legal/test/golden-cases.test.js

- RP24.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Korean Legal Depth.
- RP24.P05.M01 | Define HWPX parsed golden case | Create a synthetic golden case proving HWPX parsed.
- RP24.P05.M02 | Define clause matched golden case | Create a synthetic golden case proving clause matched.
- RP24.P05.M03 | Define court deadline calculated golden case | Create a synthetic golden case proving court deadline calculated.
- RP24.P05.M04 | Define corporate template assembled golden case | Create a synthetic golden case proving corporate template assembled.
- RP24.P05.M05 | Define HWPX parse loss failure fixture | Create a synthetic failing case that proves HWPX parse loss is blocked or reviewed.
- RP24.P05.M06 | Define wrong legal deadline failure fixture | Create a synthetic failing case that proves wrong legal deadline is blocked or reviewed.
- RP24.P05.M07 | Define Korean clause hallucination failure fixture | Create a synthetic failing case that proves Korean clause hallucination is blocked or reviewed.
- RP24.P05.M08 | Define replayable fixture manifest | Serialize Korean Legal Depth fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP24.P05.M09 | Define AI retrieval/report fixture | If Korean Legal Depth appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP24.P05.M10 | Close fixtures phase | Confirm Korean Legal Depth fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP24.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/korean-legal/src/security-contract.js, packages/korean-legal/src/audit-hints.js, packages/audit/README.md

Target tests: packages/korean-legal/test/security-audit.test.js

- RP24.P06.M00 | Define permission contract | Specify required permission checks for HWPX import, Korean clause search, litigation deadline tracking, and corporate document assembly.
- RP24.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Korean Legal Depth view and search surfaces.
- RP24.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Korean Legal Depth mutations.
- RP24.P06.M03 | Bind export/download permission | Return stronger audit hints for Korean Legal Depth export, download, or external-share actions.
- RP24.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Korean Legal Depth.
- RP24.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Korean Legal Depth where applicable.
- RP24.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Korean Legal Depth obey security trimming.
- RP24.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Korean Legal Depth.
- RP24.P06.M08 | Prepare H24 audit evidence | Record which Korean Legal Depth decisions require downstream audit event persistence.
- RP24.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Korean Legal Depth.
- RP24.P06.M10 | Close permission audit integration | Confirm Korean Legal Depth cannot ship without permission and audit evidence coverage.

## RP24.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/korean-legal/test/failure-cases.test.js, docs/rp24-recovery-notes.md

Target tests: packages/korean-legal/test/failure-cases.test.js

- RP24.P07.M00 | Define HWPX parse loss failure | Fail closed or require review when HWPX parse loss appears in Korean Legal Depth.
- RP24.P07.M01 | Define wrong legal deadline failure | Fail closed or require review when wrong legal deadline appears in Korean Legal Depth.
- RP24.P07.M02 | Define Korean clause hallucination failure | Fail closed or require review when Korean clause hallucination appears in Korean Legal Depth.
- RP24.P07.M03 | Define filing template drift failure | Fail closed or require review when filing template drift appears in Korean Legal Depth.
- RP24.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Korean Legal Depth.
- RP24.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Korean Legal Depth.
- RP24.P07.M06 | Define cross-tenant failure | Deny or block any Korean Legal Depth operation where actor and resource tenant IDs differ.
- RP24.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Korean Legal Depth operations.
- RP24.P07.M08 | Define recovery handoff | Document how a failed Korean Legal Depth micro phase is corrected before advancing.
- RP24.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Korean Legal Depth.
- RP24.P07.M10 | Close failure phase | Confirm dangerous Korean Legal Depth ambiguity fails closed or requires review.

## RP24.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp24-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP24.P08.M00 | Define H24 command matrix | Record exact product commands Hermes should run for Korean Legal Depth.
- RP24.P08.M01 | Define H24 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP24.P08.M02 | Define H24 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Korean Legal Depth.
- RP24.P08.M03 | Define H24 no-real-data evidence | Record that Korean Legal Depth fixtures and examples contain only synthetic data.
- RP24.P08.M04 | Define H24 blocked-claim evidence | Record unsafe Korean Legal Depth claims rejected by validators or tests.
- RP24.P08.M05 | Define H24 Claude dependency | Mark C24 review mandatory before Korean Legal Depth closeout.
- RP24.P08.M06 | Define H24 human approval note | Record what the human must approve for Korean Legal Depth.
- RP24.P08.M07 | Test H24 command availability | Ensure npm scripts required by H24 exist before handoff.
- RP24.P08.M08 | Prepare H24 evidence packet template | Create the evidence template Hermes will fill during Korean Legal Depth implementation closeout.
- RP24.P08.M09 | Prepare H24 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H24.
- RP24.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Korean Legal Depth behavior without owning product code.

## RP24.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp24-claude-cross-validation-brief.md, docs/rp24-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP24.P09.M00 | Prepare RP24 architecture review questions | Ask whether Korean Legal Depth module boundaries, model shapes, and workflows match the specification.
- RP24.P09.M01 | Prepare RP24 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Korean Legal Depth.
- RP24.P09.M02 | Prepare RP24 bypass review questions | Ask Claude to find HWPX parse loss, wrong legal deadline, Korean clause hallucination, filing template drift, and undefined bypasses.
- RP24.P09.M03 | Prepare RP24 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Korean Legal Depth.
- RP24.P09.M04 | Prepare RP24 downstream readiness questions | Ask whether Korean Legal Depth is ready for dependent modules and later enterprise hardening.
- RP24.P09.M05 | Prepare RP24 risk register | List unresolved Korean Legal Depth risks and route them to future RP corrections.
- RP24.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Korean Legal Depth findings.
- RP24.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Korean Legal Depth closeout.
- RP24.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP24.Pxx.Mxx correction or later RP dependency.
- RP24.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Korean Legal Depth can be considered ready.
- RP24.P09.M10 | Close RP24 detailed plan | Confirm Korean Legal Depth is detailed enough for AI implementation without more planning decisions.

