# RP19 Client Portal Detailed Micro Phases v1

Purpose: expand RP19 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP19 Client Portal
- Scope: Client users, secure link, client review, Q&A, watermark
- Micro phases: 110
- AI owner: Cursor/Codex
- Hermes gate: H19
- Claude Code gate: C19
- Immediate next implementation target: RP19.P00.M00

## RP19.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/client-portal-contract.json, packages/client-portal/README.md, contracts/client-portal-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP19.P00.M00 | Inventory spec and acceptance source | Extract Client users, secure link, client review, Q&A, watermark requirements and identify client cross-matter access, expired link usable, and download without watermark as explicit acceptance risks.
- RP19.P00.M01 | Draft contract shell | Create the future Client Portal contract shape for ClientUser, PortalWorkspace, SecureLink, ClientReview, QAMessage, Watermark.
- RP19.P00.M02 | Define ownership boundary | Record which module owns ClientUser, PortalWorkspace, and SecureLink, and which modules may only reference them.
- RP19.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for client invite, secure link share, and document review.
- RP19.P00.M04 | Define Matter-first trace rules | State how Client Portal records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP19.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Client Portal behavior can run.
- RP19.P00.M06 | Define synthetic-only fixture policy | State that Client Portal examples use fake tenants, users, matters, documents, and financial values only.
- RP19.P00.M07 | Define validation command matrix | List the product commands required to verify Client Portal planning and later implementation.
- RP19.P00.M08 | Prepare H19 preflight | Define the fields Hermes records before Client Portal implementation starts.
- RP19.P00.M09 | Prepare C19 design brief | Prepare Claude Code questions around client cross-matter access, expired link usable, download without watermark, and missing tests.
- RP19.P00.M10 | Close RP19.P00 handoff | Hand off a contract-first Client Portal implementation scope to AI.

## RP19.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/client-portal/src/model.js, packages/client-portal/src/states.js, packages/client-portal/src/registry.js

Target tests: packages/client-portal/test/model.test.js

- RP19.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/client-portal.
- RP19.P01.M01 | Implement ClientUser model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for ClientUser.
- RP19.P01.M02 | Implement PortalWorkspace model | Define required fields, references, ownership metadata, and state constraints for PortalWorkspace.
- RP19.P01.M03 | Implement SecureLink model | Define required fields, relationship references, allowed states, and security attributes for SecureLink.
- RP19.P01.M04 | Implement ClientReview model | Define required fields, lifecycle states, ownership boundaries, and audit references for ClientReview.
- RP19.P01.M05 | Implement QAMessage model | Define required fields, state transitions, permission attributes, and reporting references for QAMessage.
- RP19.P01.M06 | Implement relationship map | Map relationships among ClientUser, PortalWorkspace, SecureLink, ClientReview, QAMessage, Watermark and their Core/Matter/DMS dependencies.
- RP19.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Client Portal.
- RP19.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP19.P01.M09 | Export model registry | Export Client Portal model definitions through a stable package interface.
- RP19.P01.M10 | Close domain model phase | Confirm the Client Portal model surface is implementation-ready and does not require new scope decisions.

## RP19.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/client-portal/src/service.js, packages/client-portal/src/policies.js, packages/client-portal/src/validators.js

Target tests: packages/client-portal/test/service.test.js

- RP19.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for client invite, secure link share, and document review.
- RP19.P02.M01 | Implement client invite | Implement validation, permission precheck, audit hint, and state transition logic for client invite.
- RP19.P02.M02 | Implement secure link share | Implement validation, permission precheck, audit hint, and state transition logic for secure link share.
- RP19.P02.M03 | Implement document review | Implement validation, permission precheck, audit hint, and state transition logic for document review.
- RP19.P02.M04 | Implement client Q&A | Implement validation, permission precheck, audit hint, and state transition logic for client Q&A.
- RP19.P02.M05 | Implement watermarked download | Implement validation, permission precheck, audit hint, and state transition logic for watermarked download.
- RP19.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for client cross-matter access, expired link usable, and download without watermark.
- RP19.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Client Portal operations.
- RP19.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H19.
- RP19.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Client Portal outcomes to attorney or admin review instead of direct mutation.
- RP19.P02.M10 | Close service logic phase | Confirm Client Portal services are deterministic, auditable, and fail closed where required.

## RP19.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/client-portal/src/index.js, packages/client-portal/src/api-contract.js, packages/client-portal/src/errors.js

Target tests: packages/client-portal/test/interface.test.js

- RP19.P03.M00 | Define public exports | Expose Client Portal models, services, fixtures, validators, and error codes from package index.
- RP19.P03.M01 | Define client invite API | Lock request, response, permission, audit, and error shape for client invite.
- RP19.P03.M02 | Define secure link share API | Lock request, response, permission, audit, and error shape for secure link share.
- RP19.P03.M03 | Define document review API | Lock request, response, permission, audit, and error shape for document review.
- RP19.P03.M04 | Define client Q&A API | Lock request, response, permission, audit, and error shape for client Q&A.
- RP19.P03.M05 | Define watermarked download API | Lock request, response, permission, audit, and error shape for watermarked download.
- RP19.P03.M06 | Define serialization contract | Ensure Client Portal API responses serialize without leaking hidden policy internals or unauthorized data.
- RP19.P03.M07 | Define stable error codes | Add error codes for client cross-matter access, expired link usable, download without watermark, Q&A privilege leak, and review_required.
- RP19.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H19 evidence without making Hermes product authority.
- RP19.P03.M09 | Define Claude review summary | Expose enough interface summary for C19 cross-validation.
- RP19.P03.M10 | Close API interface phase | Freeze Client Portal public interface until a later RP explicitly extends it.

## RP19.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp19-ui-surface.md

Target tests: npm run build

- RP19.P04.M00 | Inventory UI surfaces | Identify client portal home, shared document viewer, Q&A thread, and review approval panel in the Jira-like Law Firm OS UI.
- RP19.P04.M01 | Plan client portal home | Map data, loading state, empty state, denied state, and audit hints for client portal home.
- RP19.P04.M02 | Plan shared document viewer | Map data, loading state, empty state, denied state, and audit hints for shared document viewer.
- RP19.P04.M03 | Plan Q&A thread | Map data, loading state, empty state, denied state, and audit hints for Q&A thread.
- RP19.P04.M04 | Plan review approval panel | Map data, loading state, empty state, denied state, and audit hints for review approval panel.
- RP19.P04.M05 | Plan review-required UI | Show high-risk Client Portal outcomes as review queue items, not silent successes.
- RP19.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Client Portal rows, counts, snippets, and citations are hidden before display.
- RP19.P04.M07 | Plan responsive density | Keep Client Portal context readable on desktop and mobile without marketing-page layout.
- RP19.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Client Portal service decisions.
- RP19.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Client Portal.
- RP19.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP19.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/client-portal/src/fixtures.js, packages/client-portal/fixtures/golden-cases.json

Target tests: packages/client-portal/test/golden-cases.test.js

- RP19.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Client Portal.
- RP19.P05.M01 | Define client user sees permitted matter golden case | Create a synthetic golden case proving client user sees permitted matter.
- RP19.P05.M02 | Define secure link expires golden case | Create a synthetic golden case proving secure link expires.
- RP19.P05.M03 | Define watermark applied golden case | Create a synthetic golden case proving watermark applied.
- RP19.P05.M04 | Define Q&A audited golden case | Create a synthetic golden case proving Q&A audited.
- RP19.P05.M05 | Define client cross-matter access failure fixture | Create a synthetic failing case that proves client cross-matter access is blocked or reviewed.
- RP19.P05.M06 | Define expired link usable failure fixture | Create a synthetic failing case that proves expired link usable is blocked or reviewed.
- RP19.P05.M07 | Define download without watermark failure fixture | Create a synthetic failing case that proves download without watermark is blocked or reviewed.
- RP19.P05.M08 | Define replayable fixture manifest | Serialize Client Portal fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP19.P05.M09 | Define AI retrieval/report fixture | If Client Portal appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP19.P05.M10 | Close fixtures phase | Confirm Client Portal fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP19.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/client-portal/src/security-contract.js, packages/client-portal/src/audit-hints.js, packages/audit/README.md

Target tests: packages/client-portal/test/security-audit.test.js

- RP19.P06.M00 | Define permission contract | Specify required permission checks for client invite, secure link share, document review, and client Q&A.
- RP19.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Client Portal view and search surfaces.
- RP19.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Client Portal mutations.
- RP19.P06.M03 | Bind export/download permission | Return stronger audit hints for Client Portal export, download, or external-share actions.
- RP19.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Client Portal.
- RP19.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Client Portal where applicable.
- RP19.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Client Portal obey security trimming.
- RP19.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Client Portal.
- RP19.P06.M08 | Prepare H19 audit evidence | Record which Client Portal decisions require downstream audit event persistence.
- RP19.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Client Portal.
- RP19.P06.M10 | Close permission audit integration | Confirm Client Portal cannot ship without permission and audit evidence coverage.

## RP19.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/client-portal/test/failure-cases.test.js, docs/rp19-recovery-notes.md

Target tests: packages/client-portal/test/failure-cases.test.js

- RP19.P07.M00 | Define client cross-matter access failure | Fail closed or require review when client cross-matter access appears in Client Portal.
- RP19.P07.M01 | Define expired link usable failure | Fail closed or require review when expired link usable appears in Client Portal.
- RP19.P07.M02 | Define download without watermark failure | Fail closed or require review when download without watermark appears in Client Portal.
- RP19.P07.M03 | Define Q&A privilege leak failure | Fail closed or require review when Q&A privilege leak appears in Client Portal.
- RP19.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Client Portal.
- RP19.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Client Portal.
- RP19.P07.M06 | Define cross-tenant failure | Deny or block any Client Portal operation where actor and resource tenant IDs differ.
- RP19.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Client Portal operations.
- RP19.P07.M08 | Define recovery handoff | Document how a failed Client Portal micro phase is corrected before advancing.
- RP19.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Client Portal.
- RP19.P07.M10 | Close failure phase | Confirm dangerous Client Portal ambiguity fails closed or requires review.

## RP19.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp19-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP19.P08.M00 | Define H19 command matrix | Record exact product commands Hermes should run for Client Portal.
- RP19.P08.M01 | Define H19 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP19.P08.M02 | Define H19 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Client Portal.
- RP19.P08.M03 | Define H19 no-real-data evidence | Record that Client Portal fixtures and examples contain only synthetic data.
- RP19.P08.M04 | Define H19 blocked-claim evidence | Record unsafe Client Portal claims rejected by validators or tests.
- RP19.P08.M05 | Define H19 Claude dependency | Mark C19 review mandatory before Client Portal closeout.
- RP19.P08.M06 | Define H19 human approval note | Record what the human must approve for Client Portal.
- RP19.P08.M07 | Test H19 command availability | Ensure npm scripts required by H19 exist before handoff.
- RP19.P08.M08 | Prepare H19 evidence packet template | Create the evidence template Hermes will fill during Client Portal implementation closeout.
- RP19.P08.M09 | Prepare H19 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H19.
- RP19.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Client Portal behavior without owning product code.

## RP19.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp19-claude-cross-validation-brief.md, docs/rp19-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP19.P09.M00 | Prepare RP19 architecture review questions | Ask whether Client Portal module boundaries, model shapes, and workflows match the specification.
- RP19.P09.M01 | Prepare RP19 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Client Portal.
- RP19.P09.M02 | Prepare RP19 bypass review questions | Ask Claude to find client cross-matter access, expired link usable, download without watermark, Q&A privilege leak, and undefined bypasses.
- RP19.P09.M03 | Prepare RP19 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Client Portal.
- RP19.P09.M04 | Prepare RP19 downstream readiness questions | Ask whether Client Portal is ready for dependent modules and later enterprise hardening.
- RP19.P09.M05 | Prepare RP19 risk register | List unresolved Client Portal risks and route them to future RP corrections.
- RP19.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Client Portal findings.
- RP19.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Client Portal closeout.
- RP19.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP19.Pxx.Mxx correction or later RP dependency.
- RP19.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Client Portal can be considered ready.
- RP19.P09.M10 | Close RP19 detailed plan | Confirm Client Portal is detailed enough for AI implementation without more planning decisions.

