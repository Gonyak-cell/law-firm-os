# RP18 AI Legal Workflows Detailed Micro Phases v1

Purpose: expand RP18 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP18 AI Legal Workflows
- Scope: Precedent, clause, markup, DD extraction, drafting, reports
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H18
- Claude Code gate: C18
- Immediate next implementation target: RP18.P00.M00

## RP18.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/ai-workflows-contract.json, packages/ai-workflows/README.md, contracts/ai-legal-workflows-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP18.P00.M00 | Inventory spec and acceptance source | Extract Precedent, clause, markup, DD extraction, drafting, reports requirements and identify hallucinated clause, unapproved markup, and missing citation as explicit acceptance risks.
- RP18.P00.M01 | Draft contract shell | Create the future AI Legal Workflows contract shape for PrecedentSearch, ClauseCandidate, MarkupSuggestion, DDExtraction, DraftingJob, AIReport.
- RP18.P00.M02 | Define ownership boundary | Record which module owns PrecedentSearch, ClauseCandidate, and MarkupSuggestion, and which modules may only reference them.
- RP18.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for precedent search, clause suggestion, and document markup.
- RP18.P00.M04 | Define Matter-first trace rules | State how AI Legal Workflows records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP18.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before AI Legal Workflows behavior can run.
- RP18.P00.M06 | Define synthetic-only fixture policy | State that AI Legal Workflows examples use fake tenants, users, matters, documents, and financial values only.
- RP18.P00.M07 | Define validation command matrix | List the product commands required to verify AI Legal Workflows planning and later implementation.
- RP18.P00.M08 | Prepare H18 preflight | Define the fields Hermes records before AI Legal Workflows implementation starts.
- RP18.P00.M09 | Prepare C18 design brief | Prepare Claude Code questions around hallucinated clause, unapproved markup, missing citation, and missing tests.
- RP18.P00.M10 | Close RP18.P00 handoff | Hand off a contract-first AI Legal Workflows implementation scope to AI.

## RP18.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/ai-workflows/src/model.js, packages/ai-workflows/src/states.js, packages/ai-workflows/src/registry.js

Target tests: packages/ai-workflows/test/model.test.js

- RP18.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/ai-workflows.
- RP18.P01.M01 | Implement PrecedentSearch model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for PrecedentSearch.
- RP18.P01.M02 | Implement ClauseCandidate model | Define required fields, references, ownership metadata, and state constraints for ClauseCandidate.
- RP18.P01.M03 | Implement MarkupSuggestion model | Define required fields, relationship references, allowed states, and security attributes for MarkupSuggestion.
- RP18.P01.M04 | Implement DDExtraction model | Define required fields, lifecycle states, ownership boundaries, and audit references for DDExtraction.
- RP18.P01.M05 | Implement DraftingJob model | Define required fields, state transitions, permission attributes, and reporting references for DraftingJob.
- RP18.P01.M06 | Implement relationship map | Map relationships among PrecedentSearch, ClauseCandidate, MarkupSuggestion, DDExtraction, DraftingJob, AIReport and their Core/Matter/DMS dependencies.
- RP18.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for AI Legal Workflows.
- RP18.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP18.P01.M09 | Export model registry | Export AI Legal Workflows model definitions through a stable package interface.
- RP18.P01.M10 | Close domain model phase | Confirm the AI Legal Workflows model surface is implementation-ready and does not require new scope decisions.

## RP18.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/ai-workflows/src/service.js, packages/ai-workflows/src/policies.js, packages/ai-workflows/src/validators.js

Target tests: packages/ai-workflows/test/service.test.js

- RP18.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for precedent search, clause suggestion, and document markup.
- RP18.P02.M01 | Implement precedent search | Implement validation, permission precheck, audit hint, and state transition logic for precedent search.
- RP18.P02.M02 | Implement clause suggestion | Implement validation, permission precheck, audit hint, and state transition logic for clause suggestion.
- RP18.P02.M03 | Implement document markup | Implement validation, permission precheck, audit hint, and state transition logic for document markup.
- RP18.P02.M04 | Implement due diligence extraction | Implement validation, permission precheck, audit hint, and state transition logic for due diligence extraction.
- RP18.P02.M05 | Implement report drafting | Implement validation, permission precheck, audit hint, and state transition logic for report drafting.
- RP18.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for hallucinated clause, unapproved markup, and missing citation.
- RP18.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky AI Legal Workflows operations.
- RP18.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H18.
- RP18.P02.M09 | Implement review-required routing | Route high-risk or ambiguous AI Legal Workflows outcomes to attorney or admin review instead of direct mutation.
- RP18.P02.M10 | Close service logic phase | Confirm AI Legal Workflows services are deterministic, auditable, and fail closed where required.

## RP18.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/ai-workflows/src/index.js, packages/ai-workflows/src/api-contract.js, packages/ai-workflows/src/errors.js

Target tests: packages/ai-workflows/test/interface.test.js

- RP18.P03.M00 | Define public exports | Expose AI Legal Workflows models, services, fixtures, validators, and error codes from package index.
- RP18.P03.M01 | Define precedent search API | Lock request, response, permission, audit, and error shape for precedent search.
- RP18.P03.M02 | Define clause suggestion API | Lock request, response, permission, audit, and error shape for clause suggestion.
- RP18.P03.M03 | Define document markup API | Lock request, response, permission, audit, and error shape for document markup.
- RP18.P03.M04 | Define due diligence extraction API | Lock request, response, permission, audit, and error shape for due diligence extraction.
- RP18.P03.M05 | Define report drafting API | Lock request, response, permission, audit, and error shape for report drafting.
- RP18.P03.M06 | Define serialization contract | Ensure AI Legal Workflows API responses serialize without leaking hidden policy internals or unauthorized data.
- RP18.P03.M07 | Define stable error codes | Add error codes for hallucinated clause, unapproved markup, missing citation, privileged data leak, and review_required.
- RP18.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H18 evidence without making Hermes product authority.
- RP18.P03.M09 | Define Claude review summary | Expose enough interface summary for C18 cross-validation.
- RP18.P03.M10 | Close API interface phase | Freeze AI Legal Workflows public interface until a later RP explicitly extends it.

## RP18.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp18-ui-surface.md

Target tests: npm run build

- RP18.P04.M00 | Inventory UI surfaces | Identify AI assistant panel, clause comparison, markup review, and DD extraction table in the Jira-like Law Firm OS UI.
- RP18.P04.M01 | Plan AI assistant panel | Map data, loading state, empty state, denied state, and audit hints for AI assistant panel.
- RP18.P04.M02 | Plan clause comparison | Map data, loading state, empty state, denied state, and audit hints for clause comparison.
- RP18.P04.M03 | Plan markup review | Map data, loading state, empty state, denied state, and audit hints for markup review.
- RP18.P04.M04 | Plan DD extraction table | Map data, loading state, empty state, denied state, and audit hints for DD extraction table.
- RP18.P04.M05 | Plan review-required UI | Show high-risk AI Legal Workflows outcomes as review queue items, not silent successes.
- RP18.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized AI Legal Workflows rows, counts, snippets, and citations are hidden before display.
- RP18.P04.M07 | Plan responsive density | Keep AI Legal Workflows context readable on desktop and mobile without marketing-page layout.
- RP18.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override AI Legal Workflows service decisions.
- RP18.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for AI Legal Workflows.
- RP18.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP18.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/ai-workflows/src/fixtures.js, packages/ai-workflows/fixtures/golden-cases.json

Target tests: packages/ai-workflows/test/golden-cases.test.js

- RP18.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for AI Legal Workflows.
- RP18.P05.M01 | Define precedent cited golden case | Create a synthetic golden case proving precedent cited.
- RP18.P05.M02 | Define clause suggestion reviewed golden case | Create a synthetic golden case proving clause suggestion reviewed.
- RP18.P05.M03 | Define markup requires approval golden case | Create a synthetic golden case proving markup requires approval.
- RP18.P05.M04 | Define DD extraction traceable golden case | Create a synthetic golden case proving DD extraction traceable.
- RP18.P05.M05 | Define hallucinated clause failure fixture | Create a synthetic failing case that proves hallucinated clause is blocked or reviewed.
- RP18.P05.M06 | Define unapproved markup failure fixture | Create a synthetic failing case that proves unapproved markup is blocked or reviewed.
- RP18.P05.M07 | Define missing citation failure fixture | Create a synthetic failing case that proves missing citation is blocked or reviewed.
- RP18.P05.M08 | Define replayable fixture manifest | Serialize AI Legal Workflows fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP18.P05.M09 | Define AI retrieval/report fixture | If AI Legal Workflows appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP18.P05.M10 | Close fixtures phase | Confirm AI Legal Workflows fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP18.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/ai-workflows/src/security-contract.js, packages/ai-workflows/src/audit-hints.js, packages/audit/README.md

Target tests: packages/ai-workflows/test/security-audit.test.js

- RP18.P06.M00 | Define permission contract | Specify required permission checks for precedent search, clause suggestion, document markup, and due diligence extraction.
- RP18.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for AI Legal Workflows view and search surfaces.
- RP18.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for AI Legal Workflows mutations.
- RP18.P06.M03 | Bind export/download permission | Return stronger audit hints for AI Legal Workflows export, download, or external-share actions.
- RP18.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for AI Legal Workflows.
- RP18.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for AI Legal Workflows where applicable.
- RP18.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for AI Legal Workflows obey security trimming.
- RP18.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for AI Legal Workflows.
- RP18.P06.M08 | Prepare H18 audit evidence | Record which AI Legal Workflows decisions require downstream audit event persistence.
- RP18.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for AI Legal Workflows.
- RP18.P06.M10 | Close permission audit integration | Confirm AI Legal Workflows cannot ship without permission and audit evidence coverage.

## RP18.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/ai-workflows/test/failure-cases.test.js, docs/rp18-recovery-notes.md

Target tests: packages/ai-workflows/test/failure-cases.test.js

- RP18.P07.M00 | Define hallucinated clause failure | Fail closed or require review when hallucinated clause appears in AI Legal Workflows.
- RP18.P07.M01 | Define unapproved markup failure | Fail closed or require review when unapproved markup appears in AI Legal Workflows.
- RP18.P07.M02 | Define missing citation failure | Fail closed or require review when missing citation appears in AI Legal Workflows.
- RP18.P07.M03 | Define privileged data leak failure | Fail closed or require review when privileged data leak appears in AI Legal Workflows.
- RP18.P07.M04 | Define review bypass failure | Fail closed or require review when review bypass appears in AI Legal Workflows.
- RP18.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for AI Legal Workflows.
- RP18.P07.M06 | Define cross-tenant failure | Deny or block any AI Legal Workflows operation where actor and resource tenant IDs differ.
- RP18.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed AI Legal Workflows operations.
- RP18.P07.M08 | Define recovery handoff | Document how a failed AI Legal Workflows micro phase is corrected before advancing.
- RP18.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for AI Legal Workflows.
- RP18.P07.M10 | Close failure phase | Confirm dangerous AI Legal Workflows ambiguity fails closed or requires review.

## RP18.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp18-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP18.P08.M00 | Define H18 command matrix | Record exact product commands Hermes should run for AI Legal Workflows.
- RP18.P08.M01 | Define H18 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP18.P08.M02 | Define H18 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for AI Legal Workflows.
- RP18.P08.M03 | Define H18 no-real-data evidence | Record that AI Legal Workflows fixtures and examples contain only synthetic data.
- RP18.P08.M04 | Define H18 blocked-claim evidence | Record unsafe AI Legal Workflows claims rejected by validators or tests.
- RP18.P08.M05 | Define H18 Claude dependency | Mark C18 review mandatory before AI Legal Workflows closeout.
- RP18.P08.M06 | Define H18 human approval note | Record what the human must approve for AI Legal Workflows.
- RP18.P08.M07 | Test H18 command availability | Ensure npm scripts required by H18 exist before handoff.
- RP18.P08.M08 | Prepare H18 evidence packet template | Create the evidence template Hermes will fill during AI Legal Workflows implementation closeout.
- RP18.P08.M09 | Prepare H18 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H18.
- RP18.P08.M10 | Close Hermes binding phase | Confirm Hermes validates AI Legal Workflows behavior without owning product code.

## RP18.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp18-claude-cross-validation-brief.md, docs/rp18-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP18.P09.M00 | Prepare RP18 architecture review questions | Ask whether AI Legal Workflows module boundaries, model shapes, and workflows match the specification.
- RP18.P09.M01 | Prepare RP18 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for AI Legal Workflows.
- RP18.P09.M02 | Prepare RP18 bypass review questions | Ask Claude to find hallucinated clause, unapproved markup, missing citation, privileged data leak, and review bypass bypasses.
- RP18.P09.M03 | Prepare RP18 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for AI Legal Workflows.
- RP18.P09.M04 | Prepare RP18 downstream readiness questions | Ask whether AI Legal Workflows is ready for dependent modules and later enterprise hardening.
- RP18.P09.M05 | Prepare RP18 risk register | List unresolved AI Legal Workflows risks and route them to future RP corrections.
- RP18.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for AI Legal Workflows findings.
- RP18.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for AI Legal Workflows closeout.
- RP18.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP18.Pxx.Mxx correction or later RP dependency.
- RP18.P09.M09 | Prepare human approval summary | Summarize what the user must approve before AI Legal Workflows can be considered ready.
- RP18.P09.M10 | Close RP18 detailed plan | Confirm AI Legal Workflows is detailed enough for AI implementation without more planning decisions.

