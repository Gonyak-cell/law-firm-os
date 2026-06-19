# RP23 External Integrations II Detailed Micro Phases v1

Purpose: expand RP23 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP23 External Integrations II
- Scope: Bank, card, WEHAGO, Douzone, tax export, DART
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H23
- Claude Code gate: C23
- Immediate next implementation target: RP23.P00.M00

## RP23.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/finance-integrations-contract.json, packages/finance-integrations/README.md, contracts/external-integrations-ii-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP23.P00.M00 | Inventory spec and acceptance source | Extract Bank, card, WEHAGO, Douzone, tax export, DART requirements and identify financial data mismatch, duplicate transaction, and tax export wrong period as explicit acceptance risks.
- RP23.P00.M01 | Draft contract shell | Create the future External Integrations II contract shape for BankFeed, CardFeed, WEHAGOExport, DouzoneExport, DARTRecord, TaxExportBatch.
- RP23.P00.M02 | Define ownership boundary | Record which module owns BankFeed, CardFeed, and WEHAGOExport, and which modules may only reference them.
- RP23.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for bank import, card import, and tax export.
- RP23.P00.M04 | Define Matter-first trace rules | State how External Integrations II records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP23.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before External Integrations II behavior can run.
- RP23.P00.M06 | Define synthetic-only fixture policy | State that External Integrations II examples use fake tenants, users, matters, documents, and financial values only.
- RP23.P00.M07 | Define validation command matrix | List the product commands required to verify External Integrations II planning and later implementation.
- RP23.P00.M08 | Prepare H23 preflight | Define the fields Hermes records before External Integrations II implementation starts.
- RP23.P00.M09 | Prepare C23 design brief | Prepare Claude Code questions around financial data mismatch, duplicate transaction, tax export wrong period, and missing tests.
- RP23.P00.M10 | Close RP23.P00 handoff | Hand off a contract-first External Integrations II implementation scope to AI.

## RP23.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/finance-integrations/src/model.js, packages/finance-integrations/src/states.js, packages/finance-integrations/src/registry.js

Target tests: packages/finance-integrations/test/model.test.js

- RP23.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/finance-integrations.
- RP23.P01.M01 | Implement BankFeed model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for BankFeed.
- RP23.P01.M02 | Implement CardFeed model | Define required fields, references, ownership metadata, and state constraints for CardFeed.
- RP23.P01.M03 | Implement WEHAGOExport model | Define required fields, relationship references, allowed states, and security attributes for WEHAGOExport.
- RP23.P01.M04 | Implement DouzoneExport model | Define required fields, lifecycle states, ownership boundaries, and audit references for DouzoneExport.
- RP23.P01.M05 | Implement DARTRecord model | Define required fields, state transitions, permission attributes, and reporting references for DARTRecord.
- RP23.P01.M06 | Implement relationship map | Map relationships among BankFeed, CardFeed, WEHAGOExport, DouzoneExport, DARTRecord, TaxExportBatch and their Core/Matter/DMS dependencies.
- RP23.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for External Integrations II.
- RP23.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP23.P01.M09 | Export model registry | Export External Integrations II model definitions through a stable package interface.
- RP23.P01.M10 | Close domain model phase | Confirm the External Integrations II model surface is implementation-ready and does not require new scope decisions.

## RP23.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/finance-integrations/src/service.js, packages/finance-integrations/src/policies.js, packages/finance-integrations/src/validators.js

Target tests: packages/finance-integrations/test/service.test.js

- RP23.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for bank import, card import, and tax export.
- RP23.P02.M01 | Implement bank import | Implement validation, permission precheck, audit hint, and state transition logic for bank import.
- RP23.P02.M02 | Implement card import | Implement validation, permission precheck, audit hint, and state transition logic for card import.
- RP23.P02.M03 | Implement tax export | Implement validation, permission precheck, audit hint, and state transition logic for tax export.
- RP23.P02.M04 | Implement DART lookup | Implement validation, permission precheck, audit hint, and state transition logic for DART lookup.
- RP23.P02.M05 | Implement accounting sync | Implement validation, permission precheck, audit hint, and state transition logic for accounting sync.
- RP23.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for financial data mismatch, duplicate transaction, and tax export wrong period.
- RP23.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky External Integrations II operations.
- RP23.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H23.
- RP23.P02.M09 | Implement review-required routing | Route high-risk or ambiguous External Integrations II outcomes to attorney or admin review instead of direct mutation.
- RP23.P02.M10 | Close service logic phase | Confirm External Integrations II services are deterministic, auditable, and fail closed where required.

## RP23.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/finance-integrations/src/index.js, packages/finance-integrations/src/api-contract.js, packages/finance-integrations/src/errors.js

Target tests: packages/finance-integrations/test/interface.test.js

- RP23.P03.M00 | Define public exports | Expose External Integrations II models, services, fixtures, validators, and error codes from package index.
- RP23.P03.M01 | Define bank import API | Lock request, response, permission, audit, and error shape for bank import.
- RP23.P03.M02 | Define card import API | Lock request, response, permission, audit, and error shape for card import.
- RP23.P03.M03 | Define tax export API | Lock request, response, permission, audit, and error shape for tax export.
- RP23.P03.M04 | Define DART lookup API | Lock request, response, permission, audit, and error shape for DART lookup.
- RP23.P03.M05 | Define accounting sync API | Lock request, response, permission, audit, and error shape for accounting sync.
- RP23.P03.M06 | Define serialization contract | Ensure External Integrations II API responses serialize without leaking hidden policy internals or unauthorized data.
- RP23.P03.M07 | Define stable error codes | Add error codes for financial data mismatch, duplicate transaction, tax export wrong period, external API failure, and review_required.
- RP23.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H23 evidence without making Hermes product authority.
- RP23.P03.M09 | Define Claude review summary | Expose enough interface summary for C23 cross-validation.
- RP23.P03.M10 | Close API interface phase | Freeze External Integrations II public interface until a later RP explicitly extends it.

## RP23.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp23-ui-surface.md

Target tests: npm run build

- RP23.P04.M00 | Inventory UI surfaces | Identify bank feed review, card expense matching, tax export panel, and DART entity lookup in the Jira-like Law Firm OS UI.
- RP23.P04.M01 | Plan bank feed review | Map data, loading state, empty state, denied state, and audit hints for bank feed review.
- RP23.P04.M02 | Plan card expense matching | Map data, loading state, empty state, denied state, and audit hints for card expense matching.
- RP23.P04.M03 | Plan tax export panel | Map data, loading state, empty state, denied state, and audit hints for tax export panel.
- RP23.P04.M04 | Plan DART entity lookup | Map data, loading state, empty state, denied state, and audit hints for DART entity lookup.
- RP23.P04.M05 | Plan review-required UI | Show high-risk External Integrations II outcomes as review queue items, not silent successes.
- RP23.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized External Integrations II rows, counts, snippets, and citations are hidden before display.
- RP23.P04.M07 | Plan responsive density | Keep External Integrations II context readable on desktop and mobile without marketing-page layout.
- RP23.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override External Integrations II service decisions.
- RP23.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for External Integrations II.
- RP23.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP23.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/finance-integrations/src/fixtures.js, packages/finance-integrations/fixtures/golden-cases.json

Target tests: packages/finance-integrations/test/golden-cases.test.js

- RP23.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for External Integrations II.
- RP23.P05.M01 | Define bank transaction matched golden case | Create a synthetic golden case proving bank transaction matched.
- RP23.P05.M02 | Define card expense linked golden case | Create a synthetic golden case proving card expense linked.
- RP23.P05.M03 | Define tax export generated golden case | Create a synthetic golden case proving tax export generated.
- RP23.P05.M04 | Define DART record associated golden case | Create a synthetic golden case proving DART record associated.
- RP23.P05.M05 | Define financial data mismatch failure fixture | Create a synthetic failing case that proves financial data mismatch is blocked or reviewed.
- RP23.P05.M06 | Define duplicate transaction failure fixture | Create a synthetic failing case that proves duplicate transaction is blocked or reviewed.
- RP23.P05.M07 | Define tax export wrong period failure fixture | Create a synthetic failing case that proves tax export wrong period is blocked or reviewed.
- RP23.P05.M08 | Define replayable fixture manifest | Serialize External Integrations II fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP23.P05.M09 | Define AI retrieval/report fixture | If External Integrations II appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP23.P05.M10 | Close fixtures phase | Confirm External Integrations II fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP23.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/finance-integrations/src/security-contract.js, packages/finance-integrations/src/audit-hints.js, packages/audit/README.md

Target tests: packages/finance-integrations/test/security-audit.test.js

- RP23.P06.M00 | Define permission contract | Specify required permission checks for bank import, card import, tax export, and DART lookup.
- RP23.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for External Integrations II view and search surfaces.
- RP23.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for External Integrations II mutations.
- RP23.P06.M03 | Bind export/download permission | Return stronger audit hints for External Integrations II export, download, or external-share actions.
- RP23.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for External Integrations II.
- RP23.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for External Integrations II where applicable.
- RP23.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for External Integrations II obey security trimming.
- RP23.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for External Integrations II.
- RP23.P06.M08 | Prepare H23 audit evidence | Record which External Integrations II decisions require downstream audit event persistence.
- RP23.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for External Integrations II.
- RP23.P06.M10 | Close permission audit integration | Confirm External Integrations II cannot ship without permission and audit evidence coverage.

## RP23.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/finance-integrations/test/failure-cases.test.js, docs/rp23-recovery-notes.md

Target tests: packages/finance-integrations/test/failure-cases.test.js

- RP23.P07.M00 | Define financial data mismatch failure | Fail closed or require review when financial data mismatch appears in External Integrations II.
- RP23.P07.M01 | Define duplicate transaction failure | Fail closed or require review when duplicate transaction appears in External Integrations II.
- RP23.P07.M02 | Define tax export wrong period failure | Fail closed or require review when tax export wrong period appears in External Integrations II.
- RP23.P07.M03 | Define external API failure failure | Fail closed or require review when external API failure appears in External Integrations II.
- RP23.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in External Integrations II.
- RP23.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for External Integrations II.
- RP23.P07.M06 | Define cross-tenant failure | Deny or block any External Integrations II operation where actor and resource tenant IDs differ.
- RP23.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed External Integrations II operations.
- RP23.P07.M08 | Define recovery handoff | Document how a failed External Integrations II micro phase is corrected before advancing.
- RP23.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for External Integrations II.
- RP23.P07.M10 | Close failure phase | Confirm dangerous External Integrations II ambiguity fails closed or requires review.

## RP23.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp23-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP23.P08.M00 | Define H23 command matrix | Record exact product commands Hermes should run for External Integrations II.
- RP23.P08.M01 | Define H23 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP23.P08.M02 | Define H23 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for External Integrations II.
- RP23.P08.M03 | Define H23 no-real-data evidence | Record that External Integrations II fixtures and examples contain only synthetic data.
- RP23.P08.M04 | Define H23 blocked-claim evidence | Record unsafe External Integrations II claims rejected by validators or tests.
- RP23.P08.M05 | Define H23 Claude dependency | Mark C23 review mandatory before External Integrations II closeout.
- RP23.P08.M06 | Define H23 human approval note | Record what the human must approve for External Integrations II.
- RP23.P08.M07 | Test H23 command availability | Ensure npm scripts required by H23 exist before handoff.
- RP23.P08.M08 | Prepare H23 evidence packet template | Create the evidence template Hermes will fill during External Integrations II implementation closeout.
- RP23.P08.M09 | Prepare H23 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H23.
- RP23.P08.M10 | Close Hermes binding phase | Confirm Hermes validates External Integrations II behavior without owning product code.

## RP23.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp23-claude-cross-validation-brief.md, docs/rp23-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP23.P09.M00 | Prepare RP23 architecture review questions | Ask whether External Integrations II module boundaries, model shapes, and workflows match the specification.
- RP23.P09.M01 | Prepare RP23 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for External Integrations II.
- RP23.P09.M02 | Prepare RP23 bypass review questions | Ask Claude to find financial data mismatch, duplicate transaction, tax export wrong period, external API failure, and undefined bypasses.
- RP23.P09.M03 | Prepare RP23 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for External Integrations II.
- RP23.P09.M04 | Prepare RP23 downstream readiness questions | Ask whether External Integrations II is ready for dependent modules and later enterprise hardening.
- RP23.P09.M05 | Prepare RP23 risk register | List unresolved External Integrations II risks and route them to future RP corrections.
- RP23.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for External Integrations II findings.
- RP23.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for External Integrations II closeout.
- RP23.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP23.Pxx.Mxx correction or later RP dependency.
- RP23.P09.M09 | Prepare human approval summary | Summarize what the user must approve before External Integrations II can be considered ready.
- RP23.P09.M10 | Close RP23 detailed plan | Confirm External Integrations II is detailed enough for AI implementation without more planning decisions.

