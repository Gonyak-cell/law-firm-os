# RP08 Email And Office Native DMS Detailed Micro Phases v1

Purpose: expand RP08 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP08 Email And Office Native DMS
- Scope: Outlook, Gmail, Office add-in, email filing
- Micro phases: 110
- AI owner: Codex/Cursor
- Hermes gate: H08
- Claude Code gate: C08
- Immediate next implementation target: RP08.P00.M00

## RP08.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/office-dms-contract.json, packages/office-dms/README.md, contracts/email-office-dms-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP08.P00.M00 | Inventory spec and acceptance source | Extract Outlook, Gmail, Office add-in, email filing requirements and identify wrong matter filing, attachment leak, and duplicate filing as explicit acceptance risks.
- RP08.P00.M01 | Draft contract shell | Create the future Email And Office Native DMS contract shape for EmailMessage, EmailAttachment, OfficeDocument, FilingRule, MailboxConnection, AddInSession.
- RP08.P00.M02 | Define ownership boundary | Record which module owns EmailMessage, EmailAttachment, and OfficeDocument, and which modules may only reference them.
- RP08.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for email capture, attachment filing, and matter suggestion.
- RP08.P00.M04 | Define Matter-first trace rules | State how Email And Office Native DMS records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP08.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Email And Office Native DMS behavior can run.
- RP08.P00.M06 | Define synthetic-only fixture policy | State that Email And Office Native DMS examples use fake tenants, users, matters, documents, and financial values only.
- RP08.P00.M07 | Define validation command matrix | List the product commands required to verify Email And Office Native DMS planning and later implementation.
- RP08.P00.M08 | Prepare H08 preflight | Define the fields Hermes records before Email And Office Native DMS implementation starts.
- RP08.P00.M09 | Prepare C08 design brief | Prepare Claude Code questions around wrong matter filing, attachment leak, duplicate filing, and missing tests.
- RP08.P00.M10 | Close RP08.P00 handoff | Hand off a contract-first Email And Office Native DMS implementation scope to AI.

## RP08.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/office-dms/src/model.js, packages/office-dms/src/states.js, packages/office-dms/src/registry.js

Target tests: packages/office-dms/test/model.test.js

- RP08.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/office-dms.
- RP08.P01.M01 | Implement EmailMessage model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for EmailMessage.
- RP08.P01.M02 | Implement EmailAttachment model | Define required fields, references, ownership metadata, and state constraints for EmailAttachment.
- RP08.P01.M03 | Implement OfficeDocument model | Define required fields, relationship references, allowed states, and security attributes for OfficeDocument.
- RP08.P01.M04 | Implement FilingRule model | Define required fields, lifecycle states, ownership boundaries, and audit references for FilingRule.
- RP08.P01.M05 | Implement MailboxConnection model | Define required fields, state transitions, permission attributes, and reporting references for MailboxConnection.
- RP08.P01.M06 | Implement relationship map | Map relationships among EmailMessage, EmailAttachment, OfficeDocument, FilingRule, MailboxConnection, AddInSession and their Core/Matter/DMS dependencies.
- RP08.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Email And Office Native DMS.
- RP08.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP08.P01.M09 | Export model registry | Export Email And Office Native DMS model definitions through a stable package interface.
- RP08.P01.M10 | Close domain model phase | Confirm the Email And Office Native DMS model surface is implementation-ready and does not require new scope decisions.

## RP08.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/office-dms/src/service.js, packages/office-dms/src/policies.js, packages/office-dms/src/validators.js

Target tests: packages/office-dms/test/service.test.js

- RP08.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for email capture, attachment filing, and matter suggestion.
- RP08.P02.M01 | Implement email capture | Implement validation, permission precheck, audit hint, and state transition logic for email capture.
- RP08.P02.M02 | Implement attachment filing | Implement validation, permission precheck, audit hint, and state transition logic for attachment filing.
- RP08.P02.M03 | Implement matter suggestion | Implement validation, permission precheck, audit hint, and state transition logic for matter suggestion.
- RP08.P02.M04 | Implement Office save to DMS | Implement validation, permission precheck, audit hint, and state transition logic for Office save to DMS.
- RP08.P02.M05 | Implement thread sync | Implement validation, permission precheck, audit hint, and state transition logic for thread sync.
- RP08.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for wrong matter filing, attachment leak, and duplicate filing.
- RP08.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Email And Office Native DMS operations.
- RP08.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H08.
- RP08.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Email And Office Native DMS outcomes to attorney or admin review instead of direct mutation.
- RP08.P02.M10 | Close service logic phase | Confirm Email And Office Native DMS services are deterministic, auditable, and fail closed where required.

## RP08.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/office-dms/src/index.js, packages/office-dms/src/api-contract.js, packages/office-dms/src/errors.js

Target tests: packages/office-dms/test/interface.test.js

- RP08.P03.M00 | Define public exports | Expose Email And Office Native DMS models, services, fixtures, validators, and error codes from package index.
- RP08.P03.M01 | Define email capture API | Lock request, response, permission, audit, and error shape for email capture.
- RP08.P03.M02 | Define attachment filing API | Lock request, response, permission, audit, and error shape for attachment filing.
- RP08.P03.M03 | Define matter suggestion API | Lock request, response, permission, audit, and error shape for matter suggestion.
- RP08.P03.M04 | Define Office save to DMS API | Lock request, response, permission, audit, and error shape for Office save to DMS.
- RP08.P03.M05 | Define thread sync API | Lock request, response, permission, audit, and error shape for thread sync.
- RP08.P03.M06 | Define serialization contract | Ensure Email And Office Native DMS API responses serialize without leaking hidden policy internals or unauthorized data.
- RP08.P03.M07 | Define stable error codes | Add error codes for wrong matter filing, attachment leak, duplicate filing, mailbox token exposure, and review_required.
- RP08.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H08 evidence without making Hermes product authority.
- RP08.P03.M09 | Define Claude review summary | Expose enough interface summary for C08 cross-validation.
- RP08.P03.M10 | Close API interface phase | Freeze Email And Office Native DMS public interface until a later RP explicitly extends it.

## RP08.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp08-ui-surface.md

Target tests: npm run build

- RP08.P04.M00 | Inventory UI surfaces | Identify email filing panel, matter suggestion picker, Office add-in sidebar, and sync status in the Jira-like Law Firm OS UI.
- RP08.P04.M01 | Plan email filing panel | Map data, loading state, empty state, denied state, and audit hints for email filing panel.
- RP08.P04.M02 | Plan matter suggestion picker | Map data, loading state, empty state, denied state, and audit hints for matter suggestion picker.
- RP08.P04.M03 | Plan Office add-in sidebar | Map data, loading state, empty state, denied state, and audit hints for Office add-in sidebar.
- RP08.P04.M04 | Plan sync status | Map data, loading state, empty state, denied state, and audit hints for sync status.
- RP08.P04.M05 | Plan review-required UI | Show high-risk Email And Office Native DMS outcomes as review queue items, not silent successes.
- RP08.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Email And Office Native DMS rows, counts, snippets, and citations are hidden before display.
- RP08.P04.M07 | Plan responsive density | Keep Email And Office Native DMS context readable on desktop and mobile without marketing-page layout.
- RP08.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Email And Office Native DMS service decisions.
- RP08.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Email And Office Native DMS.
- RP08.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP08.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/office-dms/src/fixtures.js, packages/office-dms/fixtures/golden-cases.json

Target tests: packages/office-dms/test/golden-cases.test.js

- RP08.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Email And Office Native DMS.
- RP08.P05.M01 | Define email filed to matter golden case | Create a synthetic golden case proving email filed to matter.
- RP08.P05.M02 | Define attachment versioned golden case | Create a synthetic golden case proving attachment versioned.
- RP08.P05.M03 | Define wrong matter suggestion rejected golden case | Create a synthetic golden case proving wrong matter suggestion rejected.
- RP08.P05.M04 | Define mailbox disconnect handled golden case | Create a synthetic golden case proving mailbox disconnect handled.
- RP08.P05.M05 | Define wrong matter filing failure fixture | Create a synthetic failing case that proves wrong matter filing is blocked or reviewed.
- RP08.P05.M06 | Define attachment leak failure fixture | Create a synthetic failing case that proves attachment leak is blocked or reviewed.
- RP08.P05.M07 | Define duplicate filing failure fixture | Create a synthetic failing case that proves duplicate filing is blocked or reviewed.
- RP08.P05.M08 | Define replayable fixture manifest | Serialize Email And Office Native DMS fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP08.P05.M09 | Define AI retrieval/report fixture | If Email And Office Native DMS appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP08.P05.M10 | Close fixtures phase | Confirm Email And Office Native DMS fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP08.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/office-dms/src/security-contract.js, packages/office-dms/src/audit-hints.js, packages/audit/README.md

Target tests: packages/office-dms/test/security-audit.test.js

- RP08.P06.M00 | Define permission contract | Specify required permission checks for email capture, attachment filing, matter suggestion, and Office save to DMS.
- RP08.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Email And Office Native DMS view and search surfaces.
- RP08.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Email And Office Native DMS mutations.
- RP08.P06.M03 | Bind export/download permission | Return stronger audit hints for Email And Office Native DMS export, download, or external-share actions.
- RP08.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Email And Office Native DMS.
- RP08.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Email And Office Native DMS where applicable.
- RP08.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Email And Office Native DMS obey security trimming.
- RP08.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Email And Office Native DMS.
- RP08.P06.M08 | Prepare H08 audit evidence | Record which Email And Office Native DMS decisions require downstream audit event persistence.
- RP08.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Email And Office Native DMS.
- RP08.P06.M10 | Close permission audit integration | Confirm Email And Office Native DMS cannot ship without permission and audit evidence coverage.

## RP08.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/office-dms/test/failure-cases.test.js, docs/rp08-recovery-notes.md

Target tests: packages/office-dms/test/failure-cases.test.js

- RP08.P07.M00 | Define wrong matter filing failure | Fail closed or require review when wrong matter filing appears in Email And Office Native DMS.
- RP08.P07.M01 | Define attachment leak failure | Fail closed or require review when attachment leak appears in Email And Office Native DMS.
- RP08.P07.M02 | Define duplicate filing failure | Fail closed or require review when duplicate filing appears in Email And Office Native DMS.
- RP08.P07.M03 | Define mailbox token exposure failure | Fail closed or require review when mailbox token exposure appears in Email And Office Native DMS.
- RP08.P07.M04 | Define unsynced version failure | Fail closed or require review when unsynced version appears in Email And Office Native DMS.
- RP08.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Email And Office Native DMS.
- RP08.P07.M06 | Define cross-tenant failure | Deny or block any Email And Office Native DMS operation where actor and resource tenant IDs differ.
- RP08.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Email And Office Native DMS operations.
- RP08.P07.M08 | Define recovery handoff | Document how a failed Email And Office Native DMS micro phase is corrected before advancing.
- RP08.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Email And Office Native DMS.
- RP08.P07.M10 | Close failure phase | Confirm dangerous Email And Office Native DMS ambiguity fails closed or requires review.

## RP08.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp08-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP08.P08.M00 | Define H08 command matrix | Record exact product commands Hermes should run for Email And Office Native DMS.
- RP08.P08.M01 | Define H08 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP08.P08.M02 | Define H08 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Email And Office Native DMS.
- RP08.P08.M03 | Define H08 no-real-data evidence | Record that Email And Office Native DMS fixtures and examples contain only synthetic data.
- RP08.P08.M04 | Define H08 blocked-claim evidence | Record unsafe Email And Office Native DMS claims rejected by validators or tests.
- RP08.P08.M05 | Define H08 Claude dependency | Mark C08 review mandatory before Email And Office Native DMS closeout.
- RP08.P08.M06 | Define H08 human approval note | Record what the human must approve for Email And Office Native DMS.
- RP08.P08.M07 | Test H08 command availability | Ensure npm scripts required by H08 exist before handoff.
- RP08.P08.M08 | Prepare H08 evidence packet template | Create the evidence template Hermes will fill during Email And Office Native DMS implementation closeout.
- RP08.P08.M09 | Prepare H08 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H08.
- RP08.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Email And Office Native DMS behavior without owning product code.

## RP08.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp08-claude-cross-validation-brief.md, docs/rp08-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP08.P09.M00 | Prepare RP08 architecture review questions | Ask whether Email And Office Native DMS module boundaries, model shapes, and workflows match the specification.
- RP08.P09.M01 | Prepare RP08 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Email And Office Native DMS.
- RP08.P09.M02 | Prepare RP08 bypass review questions | Ask Claude to find wrong matter filing, attachment leak, duplicate filing, mailbox token exposure, and unsynced version bypasses.
- RP08.P09.M03 | Prepare RP08 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Email And Office Native DMS.
- RP08.P09.M04 | Prepare RP08 downstream readiness questions | Ask whether Email And Office Native DMS is ready for dependent modules and later enterprise hardening.
- RP08.P09.M05 | Prepare RP08 risk register | List unresolved Email And Office Native DMS risks and route them to future RP corrections.
- RP08.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Email And Office Native DMS findings.
- RP08.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Email And Office Native DMS closeout.
- RP08.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP08.Pxx.Mxx correction or later RP dependency.
- RP08.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Email And Office Native DMS can be considered ready.
- RP08.P09.M10 | Close RP08 detailed plan | Confirm Email And Office Native DMS is detailed enough for AI implementation without more planning decisions.

