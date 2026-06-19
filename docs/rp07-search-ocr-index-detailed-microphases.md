# RP07 Search OCR And Index Detailed Micro Phases v1

Purpose: expand RP07 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP07 Search OCR And Index
- Scope: keyword, metadata, OCR, clause, semantic index
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H07
- Claude Code gate: C07
- Immediate next implementation target: RP07.P00.M00

## RP07.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/search-contract.json, packages/search/README.md, contracts/search-index-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP07.P00.M00 | Inventory spec and acceptance source | Extract keyword, metadata, OCR, clause, semantic index requirements and identify untrimmed result, OCR hallucination, and stale index as explicit acceptance risks.
- RP07.P00.M01 | Draft contract shell | Create the future Search OCR And Index contract shape for SearchDocument, OCRText, MetadataIndex, ClauseIndex, SemanticVector, SearchResult.
- RP07.P00.M02 | Define ownership boundary | Record which module owns SearchDocument, OCRText, and MetadataIndex, and which modules may only reference them.
- RP07.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for index enqueue, OCR extraction, and metadata indexing.
- RP07.P00.M04 | Define Matter-first trace rules | State how Search OCR And Index records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP07.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Search OCR And Index behavior can run.
- RP07.P00.M06 | Define synthetic-only fixture policy | State that Search OCR And Index examples use fake tenants, users, matters, documents, and financial values only.
- RP07.P00.M07 | Define validation command matrix | List the product commands required to verify Search OCR And Index planning and later implementation.
- RP07.P00.M08 | Prepare H07 preflight | Define the fields Hermes records before Search OCR And Index implementation starts.
- RP07.P00.M09 | Prepare C07 design brief | Prepare Claude Code questions around untrimmed result, OCR hallucination, stale index, and missing tests.
- RP07.P00.M10 | Close RP07.P00 handoff | Hand off a contract-first Search OCR And Index implementation scope to AI.

## RP07.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/search/src/model.js, packages/search/src/states.js, packages/search/src/registry.js

Target tests: packages/search/test/model.test.js

- RP07.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/search.
- RP07.P01.M01 | Implement SearchDocument model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for SearchDocument.
- RP07.P01.M02 | Implement OCRText model | Define required fields, references, ownership metadata, and state constraints for OCRText.
- RP07.P01.M03 | Implement MetadataIndex model | Define required fields, relationship references, allowed states, and security attributes for MetadataIndex.
- RP07.P01.M04 | Implement ClauseIndex model | Define required fields, lifecycle states, ownership boundaries, and audit references for ClauseIndex.
- RP07.P01.M05 | Implement SemanticVector model | Define required fields, state transitions, permission attributes, and reporting references for SemanticVector.
- RP07.P01.M06 | Implement relationship map | Map relationships among SearchDocument, OCRText, MetadataIndex, ClauseIndex, SemanticVector, SearchResult and their Core/Matter/DMS dependencies.
- RP07.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Search OCR And Index.
- RP07.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP07.P01.M09 | Export model registry | Export Search OCR And Index model definitions through a stable package interface.
- RP07.P01.M10 | Close domain model phase | Confirm the Search OCR And Index model surface is implementation-ready and does not require new scope decisions.

## RP07.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/search/src/service.js, packages/search/src/policies.js, packages/search/src/validators.js

Target tests: packages/search/test/service.test.js

- RP07.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for index enqueue, OCR extraction, and metadata indexing.
- RP07.P02.M01 | Implement index enqueue | Implement validation, permission precheck, audit hint, and state transition logic for index enqueue.
- RP07.P02.M02 | Implement OCR extraction | Implement validation, permission precheck, audit hint, and state transition logic for OCR extraction.
- RP07.P02.M03 | Implement metadata indexing | Implement validation, permission precheck, audit hint, and state transition logic for metadata indexing.
- RP07.P02.M04 | Implement query execution | Implement validation, permission precheck, audit hint, and state transition logic for query execution.
- RP07.P02.M05 | Implement security trimming | Implement validation, permission precheck, audit hint, and state transition logic for security trimming.
- RP07.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for untrimmed result, OCR hallucination, and stale index.
- RP07.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Search OCR And Index operations.
- RP07.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H07.
- RP07.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Search OCR And Index outcomes to attorney or admin review instead of direct mutation.
- RP07.P02.M10 | Close service logic phase | Confirm Search OCR And Index services are deterministic, auditable, and fail closed where required.

## RP07.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/search/src/index.js, packages/search/src/api-contract.js, packages/search/src/errors.js

Target tests: packages/search/test/interface.test.js

- RP07.P03.M00 | Define public exports | Expose Search OCR And Index models, services, fixtures, validators, and error codes from package index.
- RP07.P03.M01 | Define index enqueue API | Lock request, response, permission, audit, and error shape for index enqueue.
- RP07.P03.M02 | Define OCR extraction API | Lock request, response, permission, audit, and error shape for OCR extraction.
- RP07.P03.M03 | Define metadata indexing API | Lock request, response, permission, audit, and error shape for metadata indexing.
- RP07.P03.M04 | Define query execution API | Lock request, response, permission, audit, and error shape for query execution.
- RP07.P03.M05 | Define security trimming API | Lock request, response, permission, audit, and error shape for security trimming.
- RP07.P03.M06 | Define serialization contract | Ensure Search OCR And Index API responses serialize without leaking hidden policy internals or unauthorized data.
- RP07.P03.M07 | Define stable error codes | Add error codes for untrimmed result, OCR hallucination, stale index, cross-matter leakage, and review_required.
- RP07.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H07 evidence without making Hermes product authority.
- RP07.P03.M09 | Define Claude review summary | Expose enough interface summary for C07 cross-validation.
- RP07.P03.M10 | Close API interface phase | Freeze Search OCR And Index public interface until a later RP explicitly extends it.

## RP07.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp07-ui-surface.md

Target tests: npm run build

- RP07.P04.M00 | Inventory UI surfaces | Identify global search, matter search, DMS search, and OCR status in the Jira-like Law Firm OS UI.
- RP07.P04.M01 | Plan global search | Map data, loading state, empty state, denied state, and audit hints for global search.
- RP07.P04.M02 | Plan matter search | Map data, loading state, empty state, denied state, and audit hints for matter search.
- RP07.P04.M03 | Plan DMS search | Map data, loading state, empty state, denied state, and audit hints for DMS search.
- RP07.P04.M04 | Plan OCR status | Map data, loading state, empty state, denied state, and audit hints for OCR status.
- RP07.P04.M05 | Plan review-required UI | Show high-risk Search OCR And Index outcomes as review queue items, not silent successes.
- RP07.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Search OCR And Index rows, counts, snippets, and citations are hidden before display.
- RP07.P04.M07 | Plan responsive density | Keep Search OCR And Index context readable on desktop and mobile without marketing-page layout.
- RP07.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Search OCR And Index service decisions.
- RP07.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Search OCR And Index.
- RP07.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP07.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/search/src/fixtures.js, packages/search/fixtures/golden-cases.json

Target tests: packages/search/test/golden-cases.test.js

- RP07.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Search OCR And Index.
- RP07.P05.M01 | Define keyword hit returned golden case | Create a synthetic golden case proving keyword hit returned.
- RP07.P05.M02 | Define OCR text indexed golden case | Create a synthetic golden case proving OCR text indexed.
- RP07.P05.M03 | Define unauthorized hit removed golden case | Create a synthetic golden case proving unauthorized hit removed.
- RP07.P05.M04 | Define semantic result cited golden case | Create a synthetic golden case proving semantic result cited.
- RP07.P05.M05 | Define untrimmed result failure fixture | Create a synthetic failing case that proves untrimmed result is blocked or reviewed.
- RP07.P05.M06 | Define OCR hallucination failure fixture | Create a synthetic failing case that proves OCR hallucination is blocked or reviewed.
- RP07.P05.M07 | Define stale index failure fixture | Create a synthetic failing case that proves stale index is blocked or reviewed.
- RP07.P05.M08 | Define replayable fixture manifest | Serialize Search OCR And Index fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP07.P05.M09 | Define AI retrieval/report fixture | If Search OCR And Index appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP07.P05.M10 | Close fixtures phase | Confirm Search OCR And Index fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP07.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/search/src/security-contract.js, packages/search/src/audit-hints.js, packages/audit/README.md

Target tests: packages/search/test/security-audit.test.js

- RP07.P06.M00 | Define permission contract | Specify required permission checks for index enqueue, OCR extraction, metadata indexing, and query execution.
- RP07.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Search OCR And Index view and search surfaces.
- RP07.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Search OCR And Index mutations.
- RP07.P06.M03 | Bind export/download permission | Return stronger audit hints for Search OCR And Index export, download, or external-share actions.
- RP07.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Search OCR And Index.
- RP07.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Search OCR And Index where applicable.
- RP07.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Search OCR And Index obey security trimming.
- RP07.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Search OCR And Index.
- RP07.P06.M08 | Prepare H07 audit evidence | Record which Search OCR And Index decisions require downstream audit event persistence.
- RP07.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Search OCR And Index.
- RP07.P06.M10 | Close permission audit integration | Confirm Search OCR And Index cannot ship without permission and audit evidence coverage.

## RP07.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/search/test/failure-cases.test.js, docs/rp07-recovery-notes.md

Target tests: packages/search/test/failure-cases.test.js

- RP07.P07.M00 | Define untrimmed result failure | Fail closed or require review when untrimmed result appears in Search OCR And Index.
- RP07.P07.M01 | Define OCR hallucination failure | Fail closed or require review when OCR hallucination appears in Search OCR And Index.
- RP07.P07.M02 | Define stale index failure | Fail closed or require review when stale index appears in Search OCR And Index.
- RP07.P07.M03 | Define cross-matter leakage failure | Fail closed or require review when cross-matter leakage appears in Search OCR And Index.
- RP07.P07.M04 | Define citation mismatch failure | Fail closed or require review when citation mismatch appears in Search OCR And Index.
- RP07.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Search OCR And Index.
- RP07.P07.M06 | Define cross-tenant failure | Deny or block any Search OCR And Index operation where actor and resource tenant IDs differ.
- RP07.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Search OCR And Index operations.
- RP07.P07.M08 | Define recovery handoff | Document how a failed Search OCR And Index micro phase is corrected before advancing.
- RP07.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Search OCR And Index.
- RP07.P07.M10 | Close failure phase | Confirm dangerous Search OCR And Index ambiguity fails closed or requires review.

## RP07.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp07-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP07.P08.M00 | Define H07 command matrix | Record exact product commands Hermes should run for Search OCR And Index.
- RP07.P08.M01 | Define H07 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP07.P08.M02 | Define H07 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Search OCR And Index.
- RP07.P08.M03 | Define H07 no-real-data evidence | Record that Search OCR And Index fixtures and examples contain only synthetic data.
- RP07.P08.M04 | Define H07 blocked-claim evidence | Record unsafe Search OCR And Index claims rejected by validators or tests.
- RP07.P08.M05 | Define H07 Claude dependency | Mark C07 review mandatory before Search OCR And Index closeout.
- RP07.P08.M06 | Define H07 human approval note | Record what the human must approve for Search OCR And Index.
- RP07.P08.M07 | Test H07 command availability | Ensure npm scripts required by H07 exist before handoff.
- RP07.P08.M08 | Prepare H07 evidence packet template | Create the evidence template Hermes will fill during Search OCR And Index implementation closeout.
- RP07.P08.M09 | Prepare H07 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H07.
- RP07.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Search OCR And Index behavior without owning product code.

## RP07.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp07-claude-cross-validation-brief.md, docs/rp07-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP07.P09.M00 | Prepare RP07 architecture review questions | Ask whether Search OCR And Index module boundaries, model shapes, and workflows match the specification.
- RP07.P09.M01 | Prepare RP07 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Search OCR And Index.
- RP07.P09.M02 | Prepare RP07 bypass review questions | Ask Claude to find untrimmed result, OCR hallucination, stale index, cross-matter leakage, and citation mismatch bypasses.
- RP07.P09.M03 | Prepare RP07 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Search OCR And Index.
- RP07.P09.M04 | Prepare RP07 downstream readiness questions | Ask whether Search OCR And Index is ready for dependent modules and later enterprise hardening.
- RP07.P09.M05 | Prepare RP07 risk register | List unresolved Search OCR And Index risks and route them to future RP corrections.
- RP07.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Search OCR And Index findings.
- RP07.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Search OCR And Index closeout.
- RP07.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP07.Pxx.Mxx correction or later RP dependency.
- RP07.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Search OCR And Index can be considered ready.
- RP07.P09.M10 | Close RP07 detailed plan | Confirm Search OCR And Index is detailed enough for AI implementation without more planning decisions.

