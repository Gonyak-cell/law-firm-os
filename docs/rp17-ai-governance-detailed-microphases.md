# RP17 AI Governance Detailed Micro Phases v1

Purpose: expand RP17 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP17 AI Governance
- Scope: Model policy, retrieval scope, audit, citation
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H17
- Claude Code gate: C17
- Immediate next implementation target: RP17.P00.M00

## RP17.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/ai-governance-contract.json, packages/ai-governance/README.md, contracts/ai-governance-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP17.P00.M00 | Inventory spec and acceptance source | Extract Model policy, retrieval scope, audit, citation requirements and identify unauthorized retrieval, uncited answer, and model policy bypass as explicit acceptance risks.
- RP17.P00.M01 | Draft contract shell | Create the future AI Governance contract shape for ModelPolicy, RetrievalScope, AIJob, Citation, PromptPolicy, AIApproval.
- RP17.P00.M02 | Define ownership boundary | Record which module owns ModelPolicy, RetrievalScope, and AIJob, and which modules may only reference them.
- RP17.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for model policy selection, retrieval scope trimming, and citation validation.
- RP17.P00.M04 | Define Matter-first trace rules | State how AI Governance records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP17.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before AI Governance behavior can run.
- RP17.P00.M06 | Define synthetic-only fixture policy | State that AI Governance examples use fake tenants, users, matters, documents, and financial values only.
- RP17.P00.M07 | Define validation command matrix | List the product commands required to verify AI Governance planning and later implementation.
- RP17.P00.M08 | Prepare H17 preflight | Define the fields Hermes records before AI Governance implementation starts.
- RP17.P00.M09 | Prepare C17 design brief | Prepare Claude Code questions around unauthorized retrieval, uncited answer, model policy bypass, and missing tests.
- RP17.P00.M10 | Close RP17.P00 handoff | Hand off a contract-first AI Governance implementation scope to AI.

## RP17.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/ai-governance/src/model.js, packages/ai-governance/src/states.js, packages/ai-governance/src/registry.js

Target tests: packages/ai-governance/test/model.test.js

- RP17.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/ai-governance.
- RP17.P01.M01 | Implement ModelPolicy model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for ModelPolicy.
- RP17.P01.M02 | Implement RetrievalScope model | Define required fields, references, ownership metadata, and state constraints for RetrievalScope.
- RP17.P01.M03 | Implement AIJob model | Define required fields, relationship references, allowed states, and security attributes for AIJob.
- RP17.P01.M04 | Implement Citation model | Define required fields, lifecycle states, ownership boundaries, and audit references for Citation.
- RP17.P01.M05 | Implement PromptPolicy model | Define required fields, state transitions, permission attributes, and reporting references for PromptPolicy.
- RP17.P01.M06 | Implement relationship map | Map relationships among ModelPolicy, RetrievalScope, AIJob, Citation, PromptPolicy, AIApproval and their Core/Matter/DMS dependencies.
- RP17.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for AI Governance.
- RP17.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP17.P01.M09 | Export model registry | Export AI Governance model definitions through a stable package interface.
- RP17.P01.M10 | Close domain model phase | Confirm the AI Governance model surface is implementation-ready and does not require new scope decisions.

## RP17.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/ai-governance/src/service.js, packages/ai-governance/src/policies.js, packages/ai-governance/src/validators.js

Target tests: packages/ai-governance/test/service.test.js

- RP17.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for model policy selection, retrieval scope trimming, and citation validation.
- RP17.P02.M01 | Implement model policy selection | Implement validation, permission precheck, audit hint, and state transition logic for model policy selection.
- RP17.P02.M02 | Implement retrieval scope trimming | Implement validation, permission precheck, audit hint, and state transition logic for retrieval scope trimming.
- RP17.P02.M03 | Implement citation validation | Implement validation, permission precheck, audit hint, and state transition logic for citation validation.
- RP17.P02.M04 | Implement AI job audit | Implement validation, permission precheck, audit hint, and state transition logic for AI job audit.
- RP17.P02.M05 | Implement human review | Implement validation, permission precheck, audit hint, and state transition logic for human review.
- RP17.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for unauthorized retrieval, uncited answer, and model policy bypass.
- RP17.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky AI Governance operations.
- RP17.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H17.
- RP17.P02.M09 | Implement review-required routing | Route high-risk or ambiguous AI Governance outcomes to attorney or admin review instead of direct mutation.
- RP17.P02.M10 | Close service logic phase | Confirm AI Governance services are deterministic, auditable, and fail closed where required.

## RP17.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/ai-governance/src/index.js, packages/ai-governance/src/api-contract.js, packages/ai-governance/src/errors.js

Target tests: packages/ai-governance/test/interface.test.js

- RP17.P03.M00 | Define public exports | Expose AI Governance models, services, fixtures, validators, and error codes from package index.
- RP17.P03.M01 | Define model policy selection API | Lock request, response, permission, audit, and error shape for model policy selection.
- RP17.P03.M02 | Define retrieval scope trimming API | Lock request, response, permission, audit, and error shape for retrieval scope trimming.
- RP17.P03.M03 | Define citation validation API | Lock request, response, permission, audit, and error shape for citation validation.
- RP17.P03.M04 | Define AI job audit API | Lock request, response, permission, audit, and error shape for AI job audit.
- RP17.P03.M05 | Define human review API | Lock request, response, permission, audit, and error shape for human review.
- RP17.P03.M06 | Define serialization contract | Ensure AI Governance API responses serialize without leaking hidden policy internals or unauthorized data.
- RP17.P03.M07 | Define stable error codes | Add error codes for unauthorized retrieval, uncited answer, model policy bypass, AI output treated as legal advice, and review_required.
- RP17.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H17 evidence without making Hermes product authority.
- RP17.P03.M09 | Define Claude review summary | Expose enough interface summary for C17 cross-validation.
- RP17.P03.M10 | Close API interface phase | Freeze AI Governance public interface until a later RP explicitly extends it.

## RP17.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp17-ui-surface.md

Target tests: npm run build

- RP17.P04.M00 | Inventory UI surfaces | Identify AI policy panel, retrieval scope viewer, citation drawer, and AI review queue in the Jira-like Law Firm OS UI.
- RP17.P04.M01 | Plan AI policy panel | Map data, loading state, empty state, denied state, and audit hints for AI policy panel.
- RP17.P04.M02 | Plan retrieval scope viewer | Map data, loading state, empty state, denied state, and audit hints for retrieval scope viewer.
- RP17.P04.M03 | Plan citation drawer | Map data, loading state, empty state, denied state, and audit hints for citation drawer.
- RP17.P04.M04 | Plan AI review queue | Map data, loading state, empty state, denied state, and audit hints for AI review queue.
- RP17.P04.M05 | Plan review-required UI | Show high-risk AI Governance outcomes as review queue items, not silent successes.
- RP17.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized AI Governance rows, counts, snippets, and citations are hidden before display.
- RP17.P04.M07 | Plan responsive density | Keep AI Governance context readable on desktop and mobile without marketing-page layout.
- RP17.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override AI Governance service decisions.
- RP17.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for AI Governance.
- RP17.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP17.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/ai-governance/src/fixtures.js, packages/ai-governance/fixtures/golden-cases.json

Target tests: packages/ai-governance/test/golden-cases.test.js

- RP17.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for AI Governance.
- RP17.P05.M01 | Define AI retrieval trimmed golden case | Create a synthetic golden case proving AI retrieval trimmed.
- RP17.P05.M02 | Define citation tied to document version golden case | Create a synthetic golden case proving citation tied to document version.
- RP17.P05.M03 | Define review-required output blocked golden case | Create a synthetic golden case proving review-required output blocked.
- RP17.P05.M04 | Define AI audit event emitted golden case | Create a synthetic golden case proving AI audit event emitted.
- RP17.P05.M05 | Define unauthorized retrieval failure fixture | Create a synthetic failing case that proves unauthorized retrieval is blocked or reviewed.
- RP17.P05.M06 | Define uncited answer failure fixture | Create a synthetic failing case that proves uncited answer is blocked or reviewed.
- RP17.P05.M07 | Define model policy bypass failure fixture | Create a synthetic failing case that proves model policy bypass is blocked or reviewed.
- RP17.P05.M08 | Define replayable fixture manifest | Serialize AI Governance fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP17.P05.M09 | Define AI retrieval/report fixture | If AI Governance appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP17.P05.M10 | Close fixtures phase | Confirm AI Governance fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP17.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/ai-governance/src/security-contract.js, packages/ai-governance/src/audit-hints.js, packages/audit/README.md

Target tests: packages/ai-governance/test/security-audit.test.js

- RP17.P06.M00 | Define permission contract | Specify required permission checks for model policy selection, retrieval scope trimming, citation validation, and AI job audit.
- RP17.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for AI Governance view and search surfaces.
- RP17.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for AI Governance mutations.
- RP17.P06.M03 | Bind export/download permission | Return stronger audit hints for AI Governance export, download, or external-share actions.
- RP17.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for AI Governance.
- RP17.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for AI Governance where applicable.
- RP17.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for AI Governance obey security trimming.
- RP17.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for AI Governance.
- RP17.P06.M08 | Prepare H17 audit evidence | Record which AI Governance decisions require downstream audit event persistence.
- RP17.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for AI Governance.
- RP17.P06.M10 | Close permission audit integration | Confirm AI Governance cannot ship without permission and audit evidence coverage.

## RP17.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/ai-governance/test/failure-cases.test.js, docs/rp17-recovery-notes.md

Target tests: packages/ai-governance/test/failure-cases.test.js

- RP17.P07.M00 | Define unauthorized retrieval failure | Fail closed or require review when unauthorized retrieval appears in AI Governance.
- RP17.P07.M01 | Define uncited answer failure | Fail closed or require review when uncited answer appears in AI Governance.
- RP17.P07.M02 | Define model policy bypass failure | Fail closed or require review when model policy bypass appears in AI Governance.
- RP17.P07.M03 | Define AI output treated as legal advice failure | Fail closed or require review when AI output treated as legal advice appears in AI Governance.
- RP17.P07.M04 | Define prompt leakage failure | Fail closed or require review when prompt leakage appears in AI Governance.
- RP17.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for AI Governance.
- RP17.P07.M06 | Define cross-tenant failure | Deny or block any AI Governance operation where actor and resource tenant IDs differ.
- RP17.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed AI Governance operations.
- RP17.P07.M08 | Define recovery handoff | Document how a failed AI Governance micro phase is corrected before advancing.
- RP17.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for AI Governance.
- RP17.P07.M10 | Close failure phase | Confirm dangerous AI Governance ambiguity fails closed or requires review.

## RP17.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp17-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP17.P08.M00 | Define H17 command matrix | Record exact product commands Hermes should run for AI Governance.
- RP17.P08.M01 | Define H17 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP17.P08.M02 | Define H17 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for AI Governance.
- RP17.P08.M03 | Define H17 no-real-data evidence | Record that AI Governance fixtures and examples contain only synthetic data.
- RP17.P08.M04 | Define H17 blocked-claim evidence | Record unsafe AI Governance claims rejected by validators or tests.
- RP17.P08.M05 | Define H17 Claude dependency | Mark C17 review mandatory before AI Governance closeout.
- RP17.P08.M06 | Define H17 human approval note | Record what the human must approve for AI Governance.
- RP17.P08.M07 | Test H17 command availability | Ensure npm scripts required by H17 exist before handoff.
- RP17.P08.M08 | Prepare H17 evidence packet template | Create the evidence template Hermes will fill during AI Governance implementation closeout.
- RP17.P08.M09 | Prepare H17 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H17.
- RP17.P08.M10 | Close Hermes binding phase | Confirm Hermes validates AI Governance behavior without owning product code.

## RP17.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp17-claude-cross-validation-brief.md, docs/rp17-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP17.P09.M00 | Prepare RP17 architecture review questions | Ask whether AI Governance module boundaries, model shapes, and workflows match the specification.
- RP17.P09.M01 | Prepare RP17 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for AI Governance.
- RP17.P09.M02 | Prepare RP17 bypass review questions | Ask Claude to find unauthorized retrieval, uncited answer, model policy bypass, AI output treated as legal advice, and prompt leakage bypasses.
- RP17.P09.M03 | Prepare RP17 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for AI Governance.
- RP17.P09.M04 | Prepare RP17 downstream readiness questions | Ask whether AI Governance is ready for dependent modules and later enterprise hardening.
- RP17.P09.M05 | Prepare RP17 risk register | List unresolved AI Governance risks and route them to future RP corrections.
- RP17.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for AI Governance findings.
- RP17.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for AI Governance closeout.
- RP17.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP17.Pxx.Mxx correction or later RP dependency.
- RP17.P09.M09 | Prepare human approval summary | Summarize what the user must approve before AI Governance can be considered ready.
- RP17.P09.M10 | Close RP17 detailed plan | Confirm AI Governance is detailed enough for AI implementation without more planning decisions.

