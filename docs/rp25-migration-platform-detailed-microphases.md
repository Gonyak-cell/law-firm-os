# RP25 Migration Platform Detailed Micro Phases v1

Purpose: expand RP25 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP25 Migration Platform
- Scope: file server, SharePoint, Drive, iManage import
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H25
- Claude Code gate: C25
- Immediate next implementation target: RP25.P00.M00

## RP25.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/migration-contract.json, packages/migration/README.md, contracts/migration-platform-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP25.P00.M00 | Inventory spec and acceptance source | Extract file server, SharePoint, Drive, iManage import requirements and identify real data accidental exposure, wrong matter mapping, and duplicate import as explicit acceptance risks.
- RP25.P00.M01 | Draft contract shell | Create the future Migration Platform contract shape for MigrationPlan, SourceConnector, ImportBatch, MappingRule, MigrationFinding, ImportReceipt.
- RP25.P00.M02 | Define ownership boundary | Record which module owns MigrationPlan, SourceConnector, and ImportBatch, and which modules may only reference them.
- RP25.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for source scan, mapping proposal, and dry run.
- RP25.P00.M04 | Define Matter-first trace rules | State how Migration Platform records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP25.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Migration Platform behavior can run.
- RP25.P00.M06 | Define synthetic-only fixture policy | State that Migration Platform examples use fake tenants, users, matters, documents, and financial values only.
- RP25.P00.M07 | Define validation command matrix | List the product commands required to verify Migration Platform planning and later implementation.
- RP25.P00.M08 | Prepare H25 preflight | Define the fields Hermes records before Migration Platform implementation starts.
- RP25.P00.M09 | Prepare C25 design brief | Prepare Claude Code questions around real data accidental exposure, wrong matter mapping, duplicate import, and missing tests.
- RP25.P00.M10 | Close RP25.P00 handoff | Hand off a contract-first Migration Platform implementation scope to AI.

## RP25.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/migration/src/model.js, packages/migration/src/states.js, packages/migration/src/registry.js

Target tests: packages/migration/test/model.test.js

- RP25.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/migration.
- RP25.P01.M01 | Implement MigrationPlan model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for MigrationPlan.
- RP25.P01.M02 | Implement SourceConnector model | Define required fields, references, ownership metadata, and state constraints for SourceConnector.
- RP25.P01.M03 | Implement ImportBatch model | Define required fields, relationship references, allowed states, and security attributes for ImportBatch.
- RP25.P01.M04 | Implement MappingRule model | Define required fields, lifecycle states, ownership boundaries, and audit references for MappingRule.
- RP25.P01.M05 | Implement MigrationFinding model | Define required fields, state transitions, permission attributes, and reporting references for MigrationFinding.
- RP25.P01.M06 | Implement relationship map | Map relationships among MigrationPlan, SourceConnector, ImportBatch, MappingRule, MigrationFinding, ImportReceipt and their Core/Matter/DMS dependencies.
- RP25.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Migration Platform.
- RP25.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP25.P01.M09 | Export model registry | Export Migration Platform model definitions through a stable package interface.
- RP25.P01.M10 | Close domain model phase | Confirm the Migration Platform model surface is implementation-ready and does not require new scope decisions.

## RP25.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/migration/src/service.js, packages/migration/src/policies.js, packages/migration/src/validators.js

Target tests: packages/migration/test/service.test.js

- RP25.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for source scan, mapping proposal, and dry run.
- RP25.P02.M01 | Implement source scan | Implement validation, permission precheck, audit hint, and state transition logic for source scan.
- RP25.P02.M02 | Implement mapping proposal | Implement validation, permission precheck, audit hint, and state transition logic for mapping proposal.
- RP25.P02.M03 | Implement dry run | Implement validation, permission precheck, audit hint, and state transition logic for dry run.
- RP25.P02.M04 | Implement import execution | Implement validation, permission precheck, audit hint, and state transition logic for import execution.
- RP25.P02.M05 | Implement receipt reconciliation | Implement validation, permission precheck, audit hint, and state transition logic for receipt reconciliation.
- RP25.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for real data accidental exposure, wrong matter mapping, and duplicate import.
- RP25.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Migration Platform operations.
- RP25.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H25.
- RP25.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Migration Platform outcomes to attorney or admin review instead of direct mutation.
- RP25.P02.M10 | Close service logic phase | Confirm Migration Platform services are deterministic, auditable, and fail closed where required.

## RP25.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/migration/src/index.js, packages/migration/src/api-contract.js, packages/migration/src/errors.js

Target tests: packages/migration/test/interface.test.js

- RP25.P03.M00 | Define public exports | Expose Migration Platform models, services, fixtures, validators, and error codes from package index.
- RP25.P03.M01 | Define source scan API | Lock request, response, permission, audit, and error shape for source scan.
- RP25.P03.M02 | Define mapping proposal API | Lock request, response, permission, audit, and error shape for mapping proposal.
- RP25.P03.M03 | Define dry run API | Lock request, response, permission, audit, and error shape for dry run.
- RP25.P03.M04 | Define import execution API | Lock request, response, permission, audit, and error shape for import execution.
- RP25.P03.M05 | Define receipt reconciliation API | Lock request, response, permission, audit, and error shape for receipt reconciliation.
- RP25.P03.M06 | Define serialization contract | Ensure Migration Platform API responses serialize without leaking hidden policy internals or unauthorized data.
- RP25.P03.M07 | Define stable error codes | Add error codes for real data accidental exposure, wrong matter mapping, duplicate import, lost version history, and review_required.
- RP25.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H25 evidence without making Hermes product authority.
- RP25.P03.M09 | Define Claude review summary | Expose enough interface summary for C25 cross-validation.
- RP25.P03.M10 | Close API interface phase | Freeze Migration Platform public interface until a later RP explicitly extends it.

## RP25.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp25-ui-surface.md

Target tests: npm run build

- RP25.P04.M00 | Inventory UI surfaces | Identify migration dashboard, mapping review, dry-run report, and import receipt in the Jira-like Law Firm OS UI.
- RP25.P04.M01 | Plan migration dashboard | Map data, loading state, empty state, denied state, and audit hints for migration dashboard.
- RP25.P04.M02 | Plan mapping review | Map data, loading state, empty state, denied state, and audit hints for mapping review.
- RP25.P04.M03 | Plan dry-run report | Map data, loading state, empty state, denied state, and audit hints for dry-run report.
- RP25.P04.M04 | Plan import receipt | Map data, loading state, empty state, denied state, and audit hints for import receipt.
- RP25.P04.M05 | Plan review-required UI | Show high-risk Migration Platform outcomes as review queue items, not silent successes.
- RP25.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Migration Platform rows, counts, snippets, and citations are hidden before display.
- RP25.P04.M07 | Plan responsive density | Keep Migration Platform context readable on desktop and mobile without marketing-page layout.
- RP25.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Migration Platform service decisions.
- RP25.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Migration Platform.
- RP25.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP25.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/migration/src/fixtures.js, packages/migration/fixtures/golden-cases.json

Target tests: packages/migration/test/golden-cases.test.js

- RP25.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Migration Platform.
- RP25.P05.M01 | Define file server dry-run golden case | Create a synthetic golden case proving file server dry-run.
- RP25.P05.M02 | Define SharePoint import mapped golden case | Create a synthetic golden case proving SharePoint import mapped.
- RP25.P05.M03 | Define Drive duplicate flagged golden case | Create a synthetic golden case proving Drive duplicate flagged.
- RP25.P05.M04 | Define iManage receipt reconciled golden case | Create a synthetic golden case proving iManage receipt reconciled.
- RP25.P05.M05 | Define real data accidental exposure failure fixture | Create a synthetic failing case that proves real data accidental exposure is blocked or reviewed.
- RP25.P05.M06 | Define wrong matter mapping failure fixture | Create a synthetic failing case that proves wrong matter mapping is blocked or reviewed.
- RP25.P05.M07 | Define duplicate import failure fixture | Create a synthetic failing case that proves duplicate import is blocked or reviewed.
- RP25.P05.M08 | Define replayable fixture manifest | Serialize Migration Platform fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP25.P05.M09 | Define AI retrieval/report fixture | If Migration Platform appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP25.P05.M10 | Close fixtures phase | Confirm Migration Platform fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP25.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/migration/src/security-contract.js, packages/migration/src/audit-hints.js, packages/audit/README.md

Target tests: packages/migration/test/security-audit.test.js

- RP25.P06.M00 | Define permission contract | Specify required permission checks for source scan, mapping proposal, dry run, and import execution.
- RP25.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Migration Platform view and search surfaces.
- RP25.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Migration Platform mutations.
- RP25.P06.M03 | Bind export/download permission | Return stronger audit hints for Migration Platform export, download, or external-share actions.
- RP25.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Migration Platform.
- RP25.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Migration Platform where applicable.
- RP25.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Migration Platform obey security trimming.
- RP25.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Migration Platform.
- RP25.P06.M08 | Prepare H25 audit evidence | Record which Migration Platform decisions require downstream audit event persistence.
- RP25.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Migration Platform.
- RP25.P06.M10 | Close permission audit integration | Confirm Migration Platform cannot ship without permission and audit evidence coverage.

## RP25.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/migration/test/failure-cases.test.js, docs/rp25-recovery-notes.md

Target tests: packages/migration/test/failure-cases.test.js

- RP25.P07.M00 | Define real data accidental exposure failure | Fail closed or require review when real data accidental exposure appears in Migration Platform.
- RP25.P07.M01 | Define wrong matter mapping failure | Fail closed or require review when wrong matter mapping appears in Migration Platform.
- RP25.P07.M02 | Define duplicate import failure | Fail closed or require review when duplicate import appears in Migration Platform.
- RP25.P07.M03 | Define lost version history failure | Fail closed or require review when lost version history appears in Migration Platform.
- RP25.P07.M04 | Define permission mismatch failure | Fail closed or require review when permission mismatch appears in Migration Platform.
- RP25.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Migration Platform.
- RP25.P07.M06 | Define cross-tenant failure | Deny or block any Migration Platform operation where actor and resource tenant IDs differ.
- RP25.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Migration Platform operations.
- RP25.P07.M08 | Define recovery handoff | Document how a failed Migration Platform micro phase is corrected before advancing.
- RP25.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Migration Platform.
- RP25.P07.M10 | Close failure phase | Confirm dangerous Migration Platform ambiguity fails closed or requires review.

## RP25.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp25-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP25.P08.M00 | Define H25 command matrix | Record exact product commands Hermes should run for Migration Platform.
- RP25.P08.M01 | Define H25 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP25.P08.M02 | Define H25 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Migration Platform.
- RP25.P08.M03 | Define H25 no-real-data evidence | Record that Migration Platform fixtures and examples contain only synthetic data.
- RP25.P08.M04 | Define H25 blocked-claim evidence | Record unsafe Migration Platform claims rejected by validators or tests.
- RP25.P08.M05 | Define H25 Claude dependency | Mark C25 review mandatory before Migration Platform closeout.
- RP25.P08.M06 | Define H25 human approval note | Record what the human must approve for Migration Platform.
- RP25.P08.M07 | Test H25 command availability | Ensure npm scripts required by H25 exist before handoff.
- RP25.P08.M08 | Prepare H25 evidence packet template | Create the evidence template Hermes will fill during Migration Platform implementation closeout.
- RP25.P08.M09 | Prepare H25 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H25.
- RP25.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Migration Platform behavior without owning product code.

## RP25.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp25-claude-cross-validation-brief.md, docs/rp25-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP25.P09.M00 | Prepare RP25 architecture review questions | Ask whether Migration Platform module boundaries, model shapes, and workflows match the specification.
- RP25.P09.M01 | Prepare RP25 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Migration Platform.
- RP25.P09.M02 | Prepare RP25 bypass review questions | Ask Claude to find real data accidental exposure, wrong matter mapping, duplicate import, lost version history, and permission mismatch bypasses.
- RP25.P09.M03 | Prepare RP25 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Migration Platform.
- RP25.P09.M04 | Prepare RP25 downstream readiness questions | Ask whether Migration Platform is ready for dependent modules and later enterprise hardening.
- RP25.P09.M05 | Prepare RP25 risk register | List unresolved Migration Platform risks and route them to future RP corrections.
- RP25.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Migration Platform findings.
- RP25.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Migration Platform closeout.
- RP25.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP25.Pxx.Mxx correction or later RP dependency.
- RP25.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Migration Platform can be considered ready.
- RP25.P09.M10 | Close RP25 detailed plan | Confirm Migration Platform is detailed enough for AI implementation without more planning decisions.

