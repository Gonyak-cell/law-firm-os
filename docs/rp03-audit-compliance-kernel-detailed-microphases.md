# RP03 Audit And Compliance Kernel Detailed Micro Phases v1

Purpose: expand RP03 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP03 Audit And Compliance Kernel
- Scope: append-only audit, tamper-evident hash chain, WORM retention, legal hold, trace correlation, privacy-safe evidence, admin access review, compliance export
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H03
- Claude Code gate: C03
- Immediate next implementation target: RP03.P00.M00
- Primary files: docs/rp03-audit-compliance-architecture.md, contracts/audit-compliance-contract.json, packages/audit/src/events.js, packages/audit/src/append-only-ledger.js, packages/audit/src/hash-chain.js, packages/audit/src/retention.js, packages/audit/src/query-policy.js
- Entities: AuditEvent, AuditActor, AuditedObject, AuditEvidenceRef, AuditHashChain, RetentionPolicy, LegalHold, AdminAccessLog, ComplianceExport
- Workflows: event append, correction event append, hash chain verification, retention evaluation, legal hold apply and release, privacy-safe audit query, admin access review, compliance export with custody receipt
- Golden cases: view event appended, tamper event rejected, hash chain gap detected, WORM retention blocks purge, legal hold blocks deletion, AI access event replayed, admin break-glass audited
- Risks: mutable audit event, missing actor, retention gap, admin access unreviewed, cross-tenant audit leak, PII overlogging, trace correlation loss, hash chain replay gap

## RP03.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/audit-contract.json, packages/audit/README.md, docs/rp03-audit-compliance-architecture.md

Target tests: scripts/validate-product-contract.mjs

- RP03.P00.M00 | Inventory spec and acceptance source | Extract append-only audit, tamper-evident hash chain, WORM retention, legal hold, trace correlation, privacy-safe evidence, admin access review, compliance export requirements and identify mutable audit event, missing actor, and retention gap as explicit acceptance risks.
- RP03.P00.M01 | Draft contract shell | Create the future Audit And Compliance Kernel contract shape for AuditEvent, AuditActor, AuditedObject, AuditEvidenceRef, AuditHashChain, RetentionPolicy, LegalHold, AdminAccessLog, ComplianceExport.
- RP03.P00.M02 | Define ownership boundary | Record which module owns AuditEvent, AuditActor, and AuditedObject, and which modules may only reference them.
- RP03.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for event append, correction event append, and hash chain verification.
- RP03.P00.M04 | Define Matter-first trace rules | State how Audit And Compliance Kernel records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP03.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Audit And Compliance Kernel behavior can run.
- RP03.P00.M06 | Define synthetic-only fixture policy | State that Audit And Compliance Kernel examples use fake tenants, users, matters, documents, and financial values only.
- RP03.P00.M07 | Define validation command matrix | List the product commands required to verify Audit And Compliance Kernel planning and later implementation.
- RP03.P00.M08 | Prepare H03 preflight | Define the fields Hermes records before Audit And Compliance Kernel implementation starts.
- RP03.P00.M09 | Prepare C03 design brief | Prepare Claude Code questions around mutable audit event, missing actor, retention gap, and missing tests.
- RP03.P00.M10 | Close RP03.P00 handoff | Hand off a contract-first Audit And Compliance Kernel implementation scope to AI.

## RP03.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/audit/src/model.js, packages/audit/src/states.js, packages/audit/src/registry.js

Target tests: packages/audit/test/model.test.js

- RP03.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/audit.
- RP03.P01.M01 | Implement AuditEvent model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for AuditEvent.
- RP03.P01.M02 | Implement AuditActor model | Define required fields, references, ownership metadata, and state constraints for AuditActor.
- RP03.P01.M03 | Implement AuditedObject model | Define required fields, relationship references, allowed states, and security attributes for AuditedObject.
- RP03.P01.M04 | Implement AuditEvidenceRef model | Define required fields, lifecycle states, ownership boundaries, and audit references for AuditEvidenceRef.
- RP03.P01.M05 | Implement AuditHashChain model | Define required fields, state transitions, permission attributes, and reporting references for AuditHashChain.
- RP03.P01.M06 | Implement relationship map | Map relationships among AuditEvent, AuditActor, AuditedObject, AuditEvidenceRef, AuditHashChain, RetentionPolicy, LegalHold, AdminAccessLog, ComplianceExport and their Core/Matter/DMS dependencies.
- RP03.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Audit And Compliance Kernel.
- RP03.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP03.P01.M09 | Export model registry | Export Audit And Compliance Kernel model definitions through a stable package interface.
- RP03.P01.M10 | Close domain model phase | Confirm the Audit And Compliance Kernel model surface is implementation-ready and does not require new scope decisions.

## RP03.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/audit/src/service.js, packages/audit/src/policies.js, packages/audit/src/validators.js

Target tests: packages/audit/test/service.test.js

- RP03.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for event append, correction event append, and hash chain verification.
- RP03.P02.M01 | Implement event append | Implement validation, permission precheck, audit hint, and state transition logic for event append.
- RP03.P02.M02 | Implement correction event append | Implement validation, permission precheck, audit hint, and state transition logic for correction event append.
- RP03.P02.M03 | Implement hash chain verification | Implement validation, permission precheck, audit hint, and state transition logic for hash chain verification.
- RP03.P02.M04 | Implement retention evaluation | Implement validation, permission precheck, audit hint, and state transition logic for retention evaluation.
- RP03.P02.M05 | Implement legal hold apply and release | Implement validation, permission precheck, audit hint, and state transition logic for legal hold apply and release.
- RP03.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for mutable audit event, missing actor, and retention gap.
- RP03.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Audit And Compliance Kernel operations.
- RP03.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H03.
- RP03.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Audit And Compliance Kernel outcomes to attorney or admin review instead of direct mutation.
- RP03.P02.M10 | Close service logic phase | Confirm Audit And Compliance Kernel services are deterministic, auditable, and fail closed where required.

## RP03.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/audit/src/index.js, packages/audit/src/api-contract.js, packages/audit/src/errors.js

Target tests: packages/audit/test/interface.test.js

- RP03.P03.M00 | Define public exports | Expose Audit And Compliance Kernel models, services, fixtures, validators, and error codes from package index.
- RP03.P03.M01 | Define event append API | Lock request, response, permission, audit, and error shape for event append.
- RP03.P03.M02 | Define correction event append API | Lock request, response, permission, audit, and error shape for correction event append.
- RP03.P03.M03 | Define hash chain verification API | Lock request, response, permission, audit, and error shape for hash chain verification.
- RP03.P03.M04 | Define retention evaluation API | Lock request, response, permission, audit, and error shape for retention evaluation.
- RP03.P03.M05 | Define legal hold apply and release API | Lock request, response, permission, audit, and error shape for legal hold apply and release.
- RP03.P03.M06 | Define serialization contract | Ensure Audit And Compliance Kernel API responses serialize without leaking hidden policy internals or unauthorized data.
- RP03.P03.M07 | Define stable error codes | Add error codes for mutable audit event, missing actor, retention gap, admin access unreviewed, and review_required.
- RP03.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H03 evidence without making Hermes product authority.
- RP03.P03.M09 | Define Claude review summary | Expose enough interface summary for C03 cross-validation.
- RP03.P03.M10 | Close API interface phase | Freeze Audit And Compliance Kernel public interface until a later RP explicitly extends it.

## RP03.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp03-ui-surface.md

Target tests: npm run build

- RP03.P04.M00 | Inventory UI surfaces | Identify audit timeline, chain verification panel, admin access panel, and retention and legal hold badge in the Jira-like Law Firm OS UI.
- RP03.P04.M01 | Plan audit timeline | Map data, loading state, empty state, denied state, and audit hints for audit timeline.
- RP03.P04.M02 | Plan chain verification panel | Map data, loading state, empty state, denied state, and audit hints for chain verification panel.
- RP03.P04.M03 | Plan admin access panel | Map data, loading state, empty state, denied state, and audit hints for admin access panel.
- RP03.P04.M04 | Plan retention and legal hold badge | Map data, loading state, empty state, denied state, and audit hints for retention and legal hold badge.
- RP03.P04.M05 | Plan review-required UI | Show high-risk Audit And Compliance Kernel outcomes as review queue items, not silent successes.
- RP03.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Audit And Compliance Kernel rows, counts, snippets, and citations are hidden before display.
- RP03.P04.M07 | Plan responsive density | Keep Audit And Compliance Kernel context readable on desktop and mobile without marketing-page layout.
- RP03.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Audit And Compliance Kernel service decisions.
- RP03.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Audit And Compliance Kernel.
- RP03.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP03.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/audit/src/fixtures.js, packages/audit/fixtures/golden-cases.json

Target tests: packages/audit/test/golden-cases.test.js

- RP03.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Audit And Compliance Kernel.
- RP03.P05.M01 | Define view event appended golden case | Create a synthetic golden case proving view event appended.
- RP03.P05.M02 | Define tamper event rejected golden case | Create a synthetic golden case proving tamper event rejected.
- RP03.P05.M03 | Define hash chain gap detected golden case | Create a synthetic golden case proving hash chain gap detected.
- RP03.P05.M04 | Define WORM retention blocks purge golden case | Create a synthetic golden case proving WORM retention blocks purge.
- RP03.P05.M05 | Define mutable audit event failure fixture | Create a synthetic failing case that proves mutable audit event is blocked or reviewed.
- RP03.P05.M06 | Define missing actor failure fixture | Create a synthetic failing case that proves missing actor is blocked or reviewed.
- RP03.P05.M07 | Define retention gap failure fixture | Create a synthetic failing case that proves retention gap is blocked or reviewed.
- RP03.P05.M08 | Define replayable fixture manifest | Serialize Audit And Compliance Kernel fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP03.P05.M09 | Define AI retrieval/report fixture | If Audit And Compliance Kernel appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP03.P05.M10 | Close fixtures phase | Confirm Audit And Compliance Kernel fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP03.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/audit/src/security-contract.js, packages/audit/src/audit-hints.js, packages/audit/README.md

Target tests: packages/audit/test/security-audit.test.js

- RP03.P06.M00 | Define permission contract | Specify required permission checks for event append, correction event append, hash chain verification, and retention evaluation.
- RP03.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Audit And Compliance Kernel view and search surfaces.
- RP03.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Audit And Compliance Kernel mutations.
- RP03.P06.M03 | Bind export/download permission | Return stronger audit hints for Audit And Compliance Kernel export, download, or external-share actions.
- RP03.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Audit And Compliance Kernel.
- RP03.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Audit And Compliance Kernel where applicable.
- RP03.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Audit And Compliance Kernel obey security trimming.
- RP03.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Audit And Compliance Kernel.
- RP03.P06.M08 | Prepare H03 audit evidence | Record which Audit And Compliance Kernel decisions require downstream audit event persistence.
- RP03.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Audit And Compliance Kernel.
- RP03.P06.M10 | Close permission audit integration | Confirm Audit And Compliance Kernel cannot ship without permission and audit evidence coverage.

## RP03.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/audit/test/failure-cases.test.js, docs/rp03-recovery-notes.md

Target tests: packages/audit/test/failure-cases.test.js

- RP03.P07.M00 | Define mutable audit event failure | Fail closed or require review when mutable audit event appears in Audit And Compliance Kernel.
- RP03.P07.M01 | Define missing actor failure | Fail closed or require review when missing actor appears in Audit And Compliance Kernel.
- RP03.P07.M02 | Define retention gap failure | Fail closed or require review when retention gap appears in Audit And Compliance Kernel.
- RP03.P07.M03 | Define admin access unreviewed failure | Fail closed or require review when admin access unreviewed appears in Audit And Compliance Kernel.
- RP03.P07.M04 | Define cross-tenant audit leak failure | Fail closed or require review when cross-tenant audit leak appears in Audit And Compliance Kernel.
- RP03.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Audit And Compliance Kernel.
- RP03.P07.M06 | Define cross-tenant failure | Deny or block any Audit And Compliance Kernel operation where actor and resource tenant IDs differ.
- RP03.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Audit And Compliance Kernel operations.
- RP03.P07.M08 | Define recovery handoff | Document how a failed Audit And Compliance Kernel micro phase is corrected before advancing.
- RP03.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Audit And Compliance Kernel.
- RP03.P07.M10 | Close failure phase | Confirm dangerous Audit And Compliance Kernel ambiguity fails closed or requires review.

## RP03.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp03-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP03.P08.M00 | Define H03 command matrix | Record exact product commands Hermes should run for Audit And Compliance Kernel.
- RP03.P08.M01 | Define H03 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP03.P08.M02 | Define H03 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Audit And Compliance Kernel.
- RP03.P08.M03 | Define H03 no-real-data evidence | Record that Audit And Compliance Kernel fixtures and examples contain only synthetic data.
- RP03.P08.M04 | Define H03 blocked-claim evidence | Record unsafe Audit And Compliance Kernel claims rejected by validators or tests.
- RP03.P08.M05 | Define H03 Claude dependency | Mark C03 review mandatory before Audit And Compliance Kernel closeout.
- RP03.P08.M06 | Define H03 human approval note | Record what the human must approve for Audit And Compliance Kernel.
- RP03.P08.M07 | Test H03 command availability | Ensure npm scripts required by H03 exist before handoff.
- RP03.P08.M08 | Prepare H03 evidence packet template | Create the evidence template Hermes will fill during Audit And Compliance Kernel implementation closeout.
- RP03.P08.M09 | Prepare H03 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H03.
- RP03.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Audit And Compliance Kernel behavior without owning product code.

## RP03.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp03-claude-cross-validation-brief.md, docs/rp03-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP03.P09.M00 | Prepare RP03 architecture review questions | Ask whether Audit And Compliance Kernel module boundaries, model shapes, and workflows match the specification.
- RP03.P09.M01 | Prepare RP03 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Audit And Compliance Kernel.
- RP03.P09.M02 | Prepare RP03 bypass review questions | Ask Claude to find mutable audit event, missing actor, retention gap, admin access unreviewed, and cross-tenant audit leak bypasses.
- RP03.P09.M03 | Prepare RP03 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Audit And Compliance Kernel.
- RP03.P09.M04 | Prepare RP03 downstream readiness questions | Ask whether Audit And Compliance Kernel is ready for dependent modules and later enterprise hardening.
- RP03.P09.M05 | Prepare RP03 risk register | List unresolved Audit And Compliance Kernel risks and route them to future RP corrections.
- RP03.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Audit And Compliance Kernel findings.
- RP03.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Audit And Compliance Kernel closeout.
- RP03.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP03.Pxx.Mxx correction or later RP dependency.
- RP03.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Audit And Compliance Kernel can be considered ready.
- RP03.P09.M10 | Close RP03 detailed plan | Confirm Audit And Compliance Kernel is detailed enough for AI implementation without more planning decisions.

