# RP12 Billing And Invoicing Detailed Micro Phases v1

Purpose: expand RP12 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP12 Billing And Invoicing
- Scope: Proforma, Invoice, TaxInvoice, write-down, write-off
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H12
- Claude Code gate: C12
- Immediate next implementation target: RP12.P00.M00

## RP12.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/billing-contract.json, packages/billing/README.md, contracts/billing-invoicing-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP12.P00.M00 | Inventory spec and acceptance source | Extract Proforma, Invoice, TaxInvoice, write-down, write-off requirements and identify unapproved write-off, tax mismatch, and wrong client billing entity as explicit acceptance risks.
- RP12.P00.M01 | Draft contract shell | Create the future Billing And Invoicing contract shape for Proforma, Invoice, TaxInvoice, BillingLine, WriteDown, WriteOff, BillingApproval.
- RP12.P00.M02 | Define ownership boundary | Record which module owns Proforma, Invoice, and TaxInvoice, and which modules may only reference them.
- RP12.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for proforma generation, partner review, and write-down approval.
- RP12.P00.M04 | Define Matter-first trace rules | State how Billing And Invoicing records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP12.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Billing And Invoicing behavior can run.
- RP12.P00.M06 | Define synthetic-only fixture policy | State that Billing And Invoicing examples use fake tenants, users, matters, documents, and financial values only.
- RP12.P00.M07 | Define validation command matrix | List the product commands required to verify Billing And Invoicing planning and later implementation.
- RP12.P00.M08 | Prepare H12 preflight | Define the fields Hermes records before Billing And Invoicing implementation starts.
- RP12.P00.M09 | Prepare C12 design brief | Prepare Claude Code questions around unapproved write-off, tax mismatch, wrong client billing entity, and missing tests.
- RP12.P00.M10 | Close RP12.P00 handoff | Hand off a contract-first Billing And Invoicing implementation scope to AI.

## RP12.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/billing/src/model.js, packages/billing/src/states.js, packages/billing/src/registry.js

Target tests: packages/billing/test/model.test.js

- RP12.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/billing.
- RP12.P01.M01 | Implement Proforma model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for Proforma.
- RP12.P01.M02 | Implement Invoice model | Define required fields, references, ownership metadata, and state constraints for Invoice.
- RP12.P01.M03 | Implement TaxInvoice model | Define required fields, relationship references, allowed states, and security attributes for TaxInvoice.
- RP12.P01.M04 | Implement BillingLine model | Define required fields, lifecycle states, ownership boundaries, and audit references for BillingLine.
- RP12.P01.M05 | Implement WriteDown model | Define required fields, state transitions, permission attributes, and reporting references for WriteDown.
- RP12.P01.M06 | Implement relationship map | Map relationships among Proforma, Invoice, TaxInvoice, BillingLine, WriteDown, WriteOff, BillingApproval and their Core/Matter/DMS dependencies.
- RP12.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Billing And Invoicing.
- RP12.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP12.P01.M09 | Export model registry | Export Billing And Invoicing model definitions through a stable package interface.
- RP12.P01.M10 | Close domain model phase | Confirm the Billing And Invoicing model surface is implementation-ready and does not require new scope decisions.

## RP12.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/billing/src/service.js, packages/billing/src/policies.js, packages/billing/src/validators.js

Target tests: packages/billing/test/service.test.js

- RP12.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for proforma generation, partner review, and write-down approval.
- RP12.P02.M01 | Implement proforma generation | Implement validation, permission precheck, audit hint, and state transition logic for proforma generation.
- RP12.P02.M02 | Implement partner review | Implement validation, permission precheck, audit hint, and state transition logic for partner review.
- RP12.P02.M03 | Implement write-down approval | Implement validation, permission precheck, audit hint, and state transition logic for write-down approval.
- RP12.P02.M04 | Implement invoice issuance | Implement validation, permission precheck, audit hint, and state transition logic for invoice issuance.
- RP12.P02.M05 | Implement tax invoice export | Implement validation, permission precheck, audit hint, and state transition logic for tax invoice export.
- RP12.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for unapproved write-off, tax mismatch, and wrong client billing entity.
- RP12.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Billing And Invoicing operations.
- RP12.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H12.
- RP12.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Billing And Invoicing outcomes to attorney or admin review instead of direct mutation.
- RP12.P02.M10 | Close service logic phase | Confirm Billing And Invoicing services are deterministic, auditable, and fail closed where required.

## RP12.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/billing/src/index.js, packages/billing/src/api-contract.js, packages/billing/src/errors.js

Target tests: packages/billing/test/interface.test.js

- RP12.P03.M00 | Define public exports | Expose Billing And Invoicing models, services, fixtures, validators, and error codes from package index.
- RP12.P03.M01 | Define proforma generation API | Lock request, response, permission, audit, and error shape for proforma generation.
- RP12.P03.M02 | Define partner review API | Lock request, response, permission, audit, and error shape for partner review.
- RP12.P03.M03 | Define write-down approval API | Lock request, response, permission, audit, and error shape for write-down approval.
- RP12.P03.M04 | Define invoice issuance API | Lock request, response, permission, audit, and error shape for invoice issuance.
- RP12.P03.M05 | Define tax invoice export API | Lock request, response, permission, audit, and error shape for tax invoice export.
- RP12.P03.M06 | Define serialization contract | Ensure Billing And Invoicing API responses serialize without leaking hidden policy internals or unauthorized data.
- RP12.P03.M07 | Define stable error codes | Add error codes for unapproved write-off, tax mismatch, wrong client billing entity, invoice mutation after issue, and review_required.
- RP12.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H12 evidence without making Hermes product authority.
- RP12.P03.M09 | Define Claude review summary | Expose enough interface summary for C12 cross-validation.
- RP12.P03.M10 | Close API interface phase | Freeze Billing And Invoicing public interface until a later RP explicitly extends it.

## RP12.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp12-ui-surface.md

Target tests: npm run build

- RP12.P04.M00 | Inventory UI surfaces | Identify billing queue, proforma editor, invoice detail, and approval panel in the Jira-like Law Firm OS UI.
- RP12.P04.M01 | Plan billing queue | Map data, loading state, empty state, denied state, and audit hints for billing queue.
- RP12.P04.M02 | Plan proforma editor | Map data, loading state, empty state, denied state, and audit hints for proforma editor.
- RP12.P04.M03 | Plan invoice detail | Map data, loading state, empty state, denied state, and audit hints for invoice detail.
- RP12.P04.M04 | Plan approval panel | Map data, loading state, empty state, denied state, and audit hints for approval panel.
- RP12.P04.M05 | Plan review-required UI | Show high-risk Billing And Invoicing outcomes as review queue items, not silent successes.
- RP12.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Billing And Invoicing rows, counts, snippets, and citations are hidden before display.
- RP12.P04.M07 | Plan responsive density | Keep Billing And Invoicing context readable on desktop and mobile without marketing-page layout.
- RP12.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Billing And Invoicing service decisions.
- RP12.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Billing And Invoicing.
- RP12.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP12.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/billing/src/fixtures.js, packages/billing/fixtures/golden-cases.json

Target tests: packages/billing/test/golden-cases.test.js

- RP12.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Billing And Invoicing.
- RP12.P05.M01 | Define proforma generated golden case | Create a synthetic golden case proving proforma generated.
- RP12.P05.M02 | Define write-down approved golden case | Create a synthetic golden case proving write-down approved.
- RP12.P05.M03 | Define invoice issued golden case | Create a synthetic golden case proving invoice issued.
- RP12.P05.M04 | Define tax invoice exported golden case | Create a synthetic golden case proving tax invoice exported.
- RP12.P05.M05 | Define unapproved write-off failure fixture | Create a synthetic failing case that proves unapproved write-off is blocked or reviewed.
- RP12.P05.M06 | Define tax mismatch failure fixture | Create a synthetic failing case that proves tax mismatch is blocked or reviewed.
- RP12.P05.M07 | Define wrong client billing entity failure fixture | Create a synthetic failing case that proves wrong client billing entity is blocked or reviewed.
- RP12.P05.M08 | Define replayable fixture manifest | Serialize Billing And Invoicing fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP12.P05.M09 | Define AI retrieval/report fixture | If Billing And Invoicing appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP12.P05.M10 | Close fixtures phase | Confirm Billing And Invoicing fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP12.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/billing/src/security-contract.js, packages/billing/src/audit-hints.js, packages/audit/README.md

Target tests: packages/billing/test/security-audit.test.js

- RP12.P06.M00 | Define permission contract | Specify required permission checks for proforma generation, partner review, write-down approval, and invoice issuance.
- RP12.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Billing And Invoicing view and search surfaces.
- RP12.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Billing And Invoicing mutations.
- RP12.P06.M03 | Bind export/download permission | Return stronger audit hints for Billing And Invoicing export, download, or external-share actions.
- RP12.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Billing And Invoicing.
- RP12.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Billing And Invoicing where applicable.
- RP12.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Billing And Invoicing obey security trimming.
- RP12.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Billing And Invoicing.
- RP12.P06.M08 | Prepare H12 audit evidence | Record which Billing And Invoicing decisions require downstream audit event persistence.
- RP12.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Billing And Invoicing.
- RP12.P06.M10 | Close permission audit integration | Confirm Billing And Invoicing cannot ship without permission and audit evidence coverage.

## RP12.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/billing/test/failure-cases.test.js, docs/rp12-recovery-notes.md

Target tests: packages/billing/test/failure-cases.test.js

- RP12.P07.M00 | Define unapproved write-off failure | Fail closed or require review when unapproved write-off appears in Billing And Invoicing.
- RP12.P07.M01 | Define tax mismatch failure | Fail closed or require review when tax mismatch appears in Billing And Invoicing.
- RP12.P07.M02 | Define wrong client billing entity failure | Fail closed or require review when wrong client billing entity appears in Billing And Invoicing.
- RP12.P07.M03 | Define invoice mutation after issue failure | Fail closed or require review when invoice mutation after issue appears in Billing And Invoicing.
- RP12.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Billing And Invoicing.
- RP12.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Billing And Invoicing.
- RP12.P07.M06 | Define cross-tenant failure | Deny or block any Billing And Invoicing operation where actor and resource tenant IDs differ.
- RP12.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Billing And Invoicing operations.
- RP12.P07.M08 | Define recovery handoff | Document how a failed Billing And Invoicing micro phase is corrected before advancing.
- RP12.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Billing And Invoicing.
- RP12.P07.M10 | Close failure phase | Confirm dangerous Billing And Invoicing ambiguity fails closed or requires review.

## RP12.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp12-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP12.P08.M00 | Define H12 command matrix | Record exact product commands Hermes should run for Billing And Invoicing.
- RP12.P08.M01 | Define H12 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP12.P08.M02 | Define H12 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Billing And Invoicing.
- RP12.P08.M03 | Define H12 no-real-data evidence | Record that Billing And Invoicing fixtures and examples contain only synthetic data.
- RP12.P08.M04 | Define H12 blocked-claim evidence | Record unsafe Billing And Invoicing claims rejected by validators or tests.
- RP12.P08.M05 | Define H12 Claude dependency | Mark C12 review mandatory before Billing And Invoicing closeout.
- RP12.P08.M06 | Define H12 human approval note | Record what the human must approve for Billing And Invoicing.
- RP12.P08.M07 | Test H12 command availability | Ensure npm scripts required by H12 exist before handoff.
- RP12.P08.M08 | Prepare H12 evidence packet template | Create the evidence template Hermes will fill during Billing And Invoicing implementation closeout.
- RP12.P08.M09 | Prepare H12 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H12.
- RP12.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Billing And Invoicing behavior without owning product code.

## RP12.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp12-claude-cross-validation-brief.md, docs/rp12-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP12.P09.M00 | Prepare RP12 architecture review questions | Ask whether Billing And Invoicing module boundaries, model shapes, and workflows match the specification.
- RP12.P09.M01 | Prepare RP12 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Billing And Invoicing.
- RP12.P09.M02 | Prepare RP12 bypass review questions | Ask Claude to find unapproved write-off, tax mismatch, wrong client billing entity, invoice mutation after issue, and undefined bypasses.
- RP12.P09.M03 | Prepare RP12 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Billing And Invoicing.
- RP12.P09.M04 | Prepare RP12 downstream readiness questions | Ask whether Billing And Invoicing is ready for dependent modules and later enterprise hardening.
- RP12.P09.M05 | Prepare RP12 risk register | List unresolved Billing And Invoicing risks and route them to future RP corrections.
- RP12.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Billing And Invoicing findings.
- RP12.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Billing And Invoicing closeout.
- RP12.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP12.Pxx.Mxx correction or later RP dependency.
- RP12.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Billing And Invoicing can be considered ready.
- RP12.P09.M10 | Close RP12 detailed plan | Confirm Billing And Invoicing is detailed enough for AI implementation without more planning decisions.

