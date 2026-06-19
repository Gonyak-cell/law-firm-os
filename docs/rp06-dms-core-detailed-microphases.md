# RP06 DMS Core Detailed Micro Phases v1

Purpose: expand RP06 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP06 DMS Core
- Scope: Workspace, Folder, Document, Version, FileObject, Rendition
- Micro phases: 110
- AI owner: Codex/Cursor
- Hermes gate: H06
- Claude Code gate: C06
- Immediate next implementation target: RP06.P00.M00

## RP06.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/dms-contract.json, packages/dms/README.md, contracts/dms-core-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP06.P00.M00 | Inventory spec and acceptance source | Extract Workspace, Folder, Document, Version, FileObject, Rendition requirements and identify document without matter, version overwrite, and file leak as explicit acceptance risks.
- RP06.P00.M01 | Draft contract shell | Create the future DMS Core contract shape for Workspace, Folder, Document, DocumentVersion, FileObject, Rendition, DocumentLock.
- RP06.P00.M02 | Define ownership boundary | Record which module owns Workspace, Folder, and Document, and which modules may only reference them.
- RP06.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for workspace creation, folder navigation, and document upload.
- RP06.P00.M04 | Define Matter-first trace rules | State how DMS Core records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP06.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before DMS Core behavior can run.
- RP06.P00.M06 | Define synthetic-only fixture policy | State that DMS Core examples use fake tenants, users, matters, documents, and financial values only.
- RP06.P00.M07 | Define validation command matrix | List the product commands required to verify DMS Core planning and later implementation.
- RP06.P00.M08 | Prepare H06 preflight | Define the fields Hermes records before DMS Core implementation starts.
- RP06.P00.M09 | Prepare C06 design brief | Prepare Claude Code questions around document without matter, version overwrite, file leak, and missing tests.
- RP06.P00.M10 | Close RP06.P00 handoff | Hand off a contract-first DMS Core implementation scope to AI.

## RP06.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/dms/src/model.js, packages/dms/src/states.js, packages/dms/src/registry.js

Target tests: packages/dms/test/model.test.js

- RP06.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/dms.
- RP06.P01.M01 | Implement Workspace model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for Workspace.
- RP06.P01.M02 | Implement Folder model | Define required fields, references, ownership metadata, and state constraints for Folder.
- RP06.P01.M03 | Implement Document model | Define required fields, relationship references, allowed states, and security attributes for Document.
- RP06.P01.M04 | Implement DocumentVersion model | Define required fields, lifecycle states, ownership boundaries, and audit references for DocumentVersion.
- RP06.P01.M05 | Implement FileObject model | Define required fields, state transitions, permission attributes, and reporting references for FileObject.
- RP06.P01.M06 | Implement relationship map | Map relationships among Workspace, Folder, Document, DocumentVersion, FileObject, Rendition, DocumentLock and their Core/Matter/DMS dependencies.
- RP06.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for DMS Core.
- RP06.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP06.P01.M09 | Export model registry | Export DMS Core model definitions through a stable package interface.
- RP06.P01.M10 | Close domain model phase | Confirm the DMS Core model surface is implementation-ready and does not require new scope decisions.

## RP06.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/dms/src/service.js, packages/dms/src/policies.js, packages/dms/src/validators.js

Target tests: packages/dms/test/service.test.js

- RP06.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for workspace creation, folder navigation, and document upload.
- RP06.P02.M01 | Implement workspace creation | Implement validation, permission precheck, audit hint, and state transition logic for workspace creation.
- RP06.P02.M02 | Implement folder navigation | Implement validation, permission precheck, audit hint, and state transition logic for folder navigation.
- RP06.P02.M03 | Implement document upload | Implement validation, permission precheck, audit hint, and state transition logic for document upload.
- RP06.P02.M04 | Implement versioning | Implement validation, permission precheck, audit hint, and state transition logic for versioning.
- RP06.P02.M05 | Implement rendition generation | Implement validation, permission precheck, audit hint, and state transition logic for rendition generation.
- RP06.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for document without matter, version overwrite, and file leak.
- RP06.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky DMS Core operations.
- RP06.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H06.
- RP06.P02.M09 | Implement review-required routing | Route high-risk or ambiguous DMS Core outcomes to attorney or admin review instead of direct mutation.
- RP06.P02.M10 | Close service logic phase | Confirm DMS Core services are deterministic, auditable, and fail closed where required.

## RP06.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/dms/src/index.js, packages/dms/src/api-contract.js, packages/dms/src/errors.js

Target tests: packages/dms/test/interface.test.js

- RP06.P03.M00 | Define public exports | Expose DMS Core models, services, fixtures, validators, and error codes from package index.
- RP06.P03.M01 | Define workspace creation API | Lock request, response, permission, audit, and error shape for workspace creation.
- RP06.P03.M02 | Define folder navigation API | Lock request, response, permission, audit, and error shape for folder navigation.
- RP06.P03.M03 | Define document upload API | Lock request, response, permission, audit, and error shape for document upload.
- RP06.P03.M04 | Define versioning API | Lock request, response, permission, audit, and error shape for versioning.
- RP06.P03.M05 | Define rendition generation API | Lock request, response, permission, audit, and error shape for rendition generation.
- RP06.P03.M06 | Define serialization contract | Ensure DMS Core API responses serialize without leaking hidden policy internals or unauthorized data.
- RP06.P03.M07 | Define stable error codes | Add error codes for document without matter, version overwrite, file leak, permission trim bypass, and review_required.
- RP06.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H06 evidence without making Hermes product authority.
- RP06.P03.M09 | Define Claude review summary | Expose enough interface summary for C06 cross-validation.
- RP06.P03.M10 | Close API interface phase | Freeze DMS Core public interface until a later RP explicitly extends it.

## RP06.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp06-ui-surface.md

Target tests: npm run build

- RP06.P04.M00 | Inventory UI surfaces | Identify DMS tree, document list, version drawer, and preview panel in the Jira-like Law Firm OS UI.
- RP06.P04.M01 | Plan DMS tree | Map data, loading state, empty state, denied state, and audit hints for DMS tree.
- RP06.P04.M02 | Plan document list | Map data, loading state, empty state, denied state, and audit hints for document list.
- RP06.P04.M03 | Plan version drawer | Map data, loading state, empty state, denied state, and audit hints for version drawer.
- RP06.P04.M04 | Plan preview panel | Map data, loading state, empty state, denied state, and audit hints for preview panel.
- RP06.P04.M05 | Plan review-required UI | Show high-risk DMS Core outcomes as review queue items, not silent successes.
- RP06.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized DMS Core rows, counts, snippets, and citations are hidden before display.
- RP06.P04.M07 | Plan responsive density | Keep DMS Core context readable on desktop and mobile without marketing-page layout.
- RP06.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override DMS Core service decisions.
- RP06.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for DMS Core.
- RP06.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP06.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/dms/src/fixtures.js, packages/dms/fixtures/golden-cases.json

Target tests: packages/dms/test/golden-cases.test.js

- RP06.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for DMS Core.
- RP06.P05.M01 | Define document uploaded to matter golden case | Create a synthetic golden case proving document uploaded to matter.
- RP06.P05.M02 | Define new version created golden case | Create a synthetic golden case proving new version created.
- RP06.P05.M03 | Define locked document blocks edit golden case | Create a synthetic golden case proving locked document blocks edit.
- RP06.P05.M04 | Define preview rendition linked golden case | Create a synthetic golden case proving preview rendition linked.
- RP06.P05.M05 | Define document without matter failure fixture | Create a synthetic failing case that proves document without matter is blocked or reviewed.
- RP06.P05.M06 | Define version overwrite failure fixture | Create a synthetic failing case that proves version overwrite is blocked or reviewed.
- RP06.P05.M07 | Define file leak failure fixture | Create a synthetic failing case that proves file leak is blocked or reviewed.
- RP06.P05.M08 | Define replayable fixture manifest | Serialize DMS Core fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP06.P05.M09 | Define AI retrieval/report fixture | If DMS Core appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP06.P05.M10 | Close fixtures phase | Confirm DMS Core fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP06.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/dms/src/security-contract.js, packages/dms/src/audit-hints.js, packages/audit/README.md

Target tests: packages/dms/test/security-audit.test.js

- RP06.P06.M00 | Define permission contract | Specify required permission checks for workspace creation, folder navigation, document upload, and versioning.
- RP06.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for DMS Core view and search surfaces.
- RP06.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for DMS Core mutations.
- RP06.P06.M03 | Bind export/download permission | Return stronger audit hints for DMS Core export, download, or external-share actions.
- RP06.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for DMS Core.
- RP06.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for DMS Core where applicable.
- RP06.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for DMS Core obey security trimming.
- RP06.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for DMS Core.
- RP06.P06.M08 | Prepare H06 audit evidence | Record which DMS Core decisions require downstream audit event persistence.
- RP06.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for DMS Core.
- RP06.P06.M10 | Close permission audit integration | Confirm DMS Core cannot ship without permission and audit evidence coverage.

## RP06.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/dms/test/failure-cases.test.js, docs/rp06-recovery-notes.md

Target tests: packages/dms/test/failure-cases.test.js

- RP06.P07.M00 | Define document without matter failure | Fail closed or require review when document without matter appears in DMS Core.
- RP06.P07.M01 | Define version overwrite failure | Fail closed or require review when version overwrite appears in DMS Core.
- RP06.P07.M02 | Define file leak failure | Fail closed or require review when file leak appears in DMS Core.
- RP06.P07.M03 | Define permission trim bypass failure | Fail closed or require review when permission trim bypass appears in DMS Core.
- RP06.P07.M04 | Define lost lock failure | Fail closed or require review when lost lock appears in DMS Core.
- RP06.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for DMS Core.
- RP06.P07.M06 | Define cross-tenant failure | Deny or block any DMS Core operation where actor and resource tenant IDs differ.
- RP06.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed DMS Core operations.
- RP06.P07.M08 | Define recovery handoff | Document how a failed DMS Core micro phase is corrected before advancing.
- RP06.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for DMS Core.
- RP06.P07.M10 | Close failure phase | Confirm dangerous DMS Core ambiguity fails closed or requires review.

## RP06.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp06-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP06.P08.M00 | Define H06 command matrix | Record exact product commands Hermes should run for DMS Core.
- RP06.P08.M01 | Define H06 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP06.P08.M02 | Define H06 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for DMS Core.
- RP06.P08.M03 | Define H06 no-real-data evidence | Record that DMS Core fixtures and examples contain only synthetic data.
- RP06.P08.M04 | Define H06 blocked-claim evidence | Record unsafe DMS Core claims rejected by validators or tests.
- RP06.P08.M05 | Define H06 Claude dependency | Mark C06 review mandatory before DMS Core closeout.
- RP06.P08.M06 | Define H06 human approval note | Record what the human must approve for DMS Core.
- RP06.P08.M07 | Test H06 command availability | Ensure npm scripts required by H06 exist before handoff.
- RP06.P08.M08 | Prepare H06 evidence packet template | Create the evidence template Hermes will fill during DMS Core implementation closeout.
- RP06.P08.M09 | Prepare H06 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H06.
- RP06.P08.M10 | Close Hermes binding phase | Confirm Hermes validates DMS Core behavior without owning product code.

## RP06.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp06-claude-cross-validation-brief.md, docs/rp06-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP06.P09.M00 | Prepare RP06 architecture review questions | Ask whether DMS Core module boundaries, model shapes, and workflows match the specification.
- RP06.P09.M01 | Prepare RP06 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for DMS Core.
- RP06.P09.M02 | Prepare RP06 bypass review questions | Ask Claude to find document without matter, version overwrite, file leak, permission trim bypass, and lost lock bypasses.
- RP06.P09.M03 | Prepare RP06 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for DMS Core.
- RP06.P09.M04 | Prepare RP06 downstream readiness questions | Ask whether DMS Core is ready for dependent modules and later enterprise hardening.
- RP06.P09.M05 | Prepare RP06 risk register | List unresolved DMS Core risks and route them to future RP corrections.
- RP06.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for DMS Core findings.
- RP06.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for DMS Core closeout.
- RP06.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP06.Pxx.Mxx correction or later RP dependency.
- RP06.P09.M09 | Prepare human approval summary | Summarize what the user must approve before DMS Core can be considered ready.
- RP06.P09.M10 | Close RP06 detailed plan | Confirm DMS Core is detailed enough for AI implementation without more planning decisions.

