# RP15 Firm Analytics Detailed Micro Phases v1

Purpose: expand RP15 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP15 Firm Analytics
- Scope: Managing partner, partner, Matter P&L, forecast, WIP
- Micro phases: 110
- AI owner: Cursor/Codex
- Hermes gate: H15
- Claude Code gate: C15
- Immediate next implementation target: RP15.P00.M00

## RP15.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/analytics-contract.json, packages/analytics/README.md, contracts/firm-analytics-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP15.P00.M00 | Inventory spec and acceptance source | Extract Managing partner, partner, Matter P&L, forecast, WIP requirements and identify untrimmed analytics, metric definition drift, and stale forecast as explicit acceptance risks.
- RP15.P00.M01 | Draft contract shell | Create the future Firm Analytics contract shape for MetricDefinition, MatterPnL, PartnerScorecard, Forecast, WIPSnapshot, AnalyticsExport.
- RP15.P00.M02 | Define ownership boundary | Record which module owns MetricDefinition, MatterPnL, and PartnerScorecard, and which modules may only reference them.
- RP15.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for metric calculation, WIP analysis, and matter P&L.
- RP15.P00.M04 | Define Matter-first trace rules | State how Firm Analytics records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP15.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Firm Analytics behavior can run.
- RP15.P00.M06 | Define synthetic-only fixture policy | State that Firm Analytics examples use fake tenants, users, matters, documents, and financial values only.
- RP15.P00.M07 | Define validation command matrix | List the product commands required to verify Firm Analytics planning and later implementation.
- RP15.P00.M08 | Prepare H15 preflight | Define the fields Hermes records before Firm Analytics implementation starts.
- RP15.P00.M09 | Prepare C15 design brief | Prepare Claude Code questions around untrimmed analytics, metric definition drift, stale forecast, and missing tests.
- RP15.P00.M10 | Close RP15.P00 handoff | Hand off a contract-first Firm Analytics implementation scope to AI.

## RP15.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/analytics/src/model.js, packages/analytics/src/states.js, packages/analytics/src/registry.js

Target tests: packages/analytics/test/model.test.js

- RP15.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/analytics.
- RP15.P01.M01 | Implement MetricDefinition model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for MetricDefinition.
- RP15.P01.M02 | Implement MatterPnL model | Define required fields, references, ownership metadata, and state constraints for MatterPnL.
- RP15.P01.M03 | Implement PartnerScorecard model | Define required fields, relationship references, allowed states, and security attributes for PartnerScorecard.
- RP15.P01.M04 | Implement Forecast model | Define required fields, lifecycle states, ownership boundaries, and audit references for Forecast.
- RP15.P01.M05 | Implement WIPSnapshot model | Define required fields, state transitions, permission attributes, and reporting references for WIPSnapshot.
- RP15.P01.M06 | Implement relationship map | Map relationships among MetricDefinition, MatterPnL, PartnerScorecard, Forecast, WIPSnapshot, AnalyticsExport and their Core/Matter/DMS dependencies.
- RP15.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Firm Analytics.
- RP15.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP15.P01.M09 | Export model registry | Export Firm Analytics model definitions through a stable package interface.
- RP15.P01.M10 | Close domain model phase | Confirm the Firm Analytics model surface is implementation-ready and does not require new scope decisions.

## RP15.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/analytics/src/service.js, packages/analytics/src/policies.js, packages/analytics/src/validators.js

Target tests: packages/analytics/test/service.test.js

- RP15.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for metric calculation, WIP analysis, and matter P&L.
- RP15.P02.M01 | Implement metric calculation | Implement validation, permission precheck, audit hint, and state transition logic for metric calculation.
- RP15.P02.M02 | Implement WIP analysis | Implement validation, permission precheck, audit hint, and state transition logic for WIP analysis.
- RP15.P02.M03 | Implement matter P&L | Implement validation, permission precheck, audit hint, and state transition logic for matter P&L.
- RP15.P02.M04 | Implement forecast refresh | Implement validation, permission precheck, audit hint, and state transition logic for forecast refresh.
- RP15.P02.M05 | Implement partner dashboard | Implement validation, permission precheck, audit hint, and state transition logic for partner dashboard.
- RP15.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for untrimmed analytics, metric definition drift, and stale forecast.
- RP15.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Firm Analytics operations.
- RP15.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H15.
- RP15.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Firm Analytics outcomes to attorney or admin review instead of direct mutation.
- RP15.P02.M10 | Close service logic phase | Confirm Firm Analytics services are deterministic, auditable, and fail closed where required.

## RP15.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/analytics/src/index.js, packages/analytics/src/api-contract.js, packages/analytics/src/errors.js

Target tests: packages/analytics/test/interface.test.js

- RP15.P03.M00 | Define public exports | Expose Firm Analytics models, services, fixtures, validators, and error codes from package index.
- RP15.P03.M01 | Define metric calculation API | Lock request, response, permission, audit, and error shape for metric calculation.
- RP15.P03.M02 | Define WIP analysis API | Lock request, response, permission, audit, and error shape for WIP analysis.
- RP15.P03.M03 | Define matter P&L API | Lock request, response, permission, audit, and error shape for matter P&L.
- RP15.P03.M04 | Define forecast refresh API | Lock request, response, permission, audit, and error shape for forecast refresh.
- RP15.P03.M05 | Define partner dashboard API | Lock request, response, permission, audit, and error shape for partner dashboard.
- RP15.P03.M06 | Define serialization contract | Ensure Firm Analytics API responses serialize without leaking hidden policy internals or unauthorized data.
- RP15.P03.M07 | Define stable error codes | Add error codes for untrimmed analytics, metric definition drift, stale forecast, financial reconciliation gap, and review_required.
- RP15.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H15 evidence without making Hermes product authority.
- RP15.P03.M09 | Define Claude review summary | Expose enough interface summary for C15 cross-validation.
- RP15.P03.M10 | Close API interface phase | Freeze Firm Analytics public interface until a later RP explicitly extends it.

## RP15.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp15-ui-surface.md

Target tests: npm run build

- RP15.P04.M00 | Inventory UI surfaces | Identify managing partner dashboard, partner scorecard, matter P&L view, and forecast panel in the Jira-like Law Firm OS UI.
- RP15.P04.M01 | Plan managing partner dashboard | Map data, loading state, empty state, denied state, and audit hints for managing partner dashboard.
- RP15.P04.M02 | Plan partner scorecard | Map data, loading state, empty state, denied state, and audit hints for partner scorecard.
- RP15.P04.M03 | Plan matter P&L view | Map data, loading state, empty state, denied state, and audit hints for matter P&L view.
- RP15.P04.M04 | Plan forecast panel | Map data, loading state, empty state, denied state, and audit hints for forecast panel.
- RP15.P04.M05 | Plan review-required UI | Show high-risk Firm Analytics outcomes as review queue items, not silent successes.
- RP15.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Firm Analytics rows, counts, snippets, and citations are hidden before display.
- RP15.P04.M07 | Plan responsive density | Keep Firm Analytics context readable on desktop and mobile without marketing-page layout.
- RP15.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Firm Analytics service decisions.
- RP15.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Firm Analytics.
- RP15.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP15.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/analytics/src/fixtures.js, packages/analytics/fixtures/golden-cases.json

Target tests: packages/analytics/test/golden-cases.test.js

- RP15.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Firm Analytics.
- RP15.P05.M01 | Define WIP metric calculated golden case | Create a synthetic golden case proving WIP metric calculated.
- RP15.P05.M02 | Define matter P&L reconciles golden case | Create a synthetic golden case proving matter P&L reconciles.
- RP15.P05.M03 | Define forecast generated golden case | Create a synthetic golden case proving forecast generated.
- RP15.P05.M04 | Define permission-trimmed dashboard golden case | Create a synthetic golden case proving permission-trimmed dashboard.
- RP15.P05.M05 | Define untrimmed analytics failure fixture | Create a synthetic failing case that proves untrimmed analytics is blocked or reviewed.
- RP15.P05.M06 | Define metric definition drift failure fixture | Create a synthetic failing case that proves metric definition drift is blocked or reviewed.
- RP15.P05.M07 | Define stale forecast failure fixture | Create a synthetic failing case that proves stale forecast is blocked or reviewed.
- RP15.P05.M08 | Define replayable fixture manifest | Serialize Firm Analytics fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP15.P05.M09 | Define AI retrieval/report fixture | If Firm Analytics appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP15.P05.M10 | Close fixtures phase | Confirm Firm Analytics fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP15.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/analytics/src/security-contract.js, packages/analytics/src/audit-hints.js, packages/audit/README.md

Target tests: packages/analytics/test/security-audit.test.js

- RP15.P06.M00 | Define permission contract | Specify required permission checks for metric calculation, WIP analysis, matter P&L, and forecast refresh.
- RP15.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Firm Analytics view and search surfaces.
- RP15.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Firm Analytics mutations.
- RP15.P06.M03 | Bind export/download permission | Return stronger audit hints for Firm Analytics export, download, or external-share actions.
- RP15.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Firm Analytics.
- RP15.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Firm Analytics where applicable.
- RP15.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Firm Analytics obey security trimming.
- RP15.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Firm Analytics.
- RP15.P06.M08 | Prepare H15 audit evidence | Record which Firm Analytics decisions require downstream audit event persistence.
- RP15.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Firm Analytics.
- RP15.P06.M10 | Close permission audit integration | Confirm Firm Analytics cannot ship without permission and audit evidence coverage.

## RP15.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/analytics/test/failure-cases.test.js, docs/rp15-recovery-notes.md

Target tests: packages/analytics/test/failure-cases.test.js

- RP15.P07.M00 | Define untrimmed analytics failure | Fail closed or require review when untrimmed analytics appears in Firm Analytics.
- RP15.P07.M01 | Define metric definition drift failure | Fail closed or require review when metric definition drift appears in Firm Analytics.
- RP15.P07.M02 | Define stale forecast failure | Fail closed or require review when stale forecast appears in Firm Analytics.
- RP15.P07.M03 | Define financial reconciliation gap failure | Fail closed or require review when financial reconciliation gap appears in Firm Analytics.
- RP15.P07.M04 | Define undefined failure | Fail closed or require review when undefined appears in Firm Analytics.
- RP15.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Firm Analytics.
- RP15.P07.M06 | Define cross-tenant failure | Deny or block any Firm Analytics operation where actor and resource tenant IDs differ.
- RP15.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Firm Analytics operations.
- RP15.P07.M08 | Define recovery handoff | Document how a failed Firm Analytics micro phase is corrected before advancing.
- RP15.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Firm Analytics.
- RP15.P07.M10 | Close failure phase | Confirm dangerous Firm Analytics ambiguity fails closed or requires review.

## RP15.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp15-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP15.P08.M00 | Define H15 command matrix | Record exact product commands Hermes should run for Firm Analytics.
- RP15.P08.M01 | Define H15 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP15.P08.M02 | Define H15 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Firm Analytics.
- RP15.P08.M03 | Define H15 no-real-data evidence | Record that Firm Analytics fixtures and examples contain only synthetic data.
- RP15.P08.M04 | Define H15 blocked-claim evidence | Record unsafe Firm Analytics claims rejected by validators or tests.
- RP15.P08.M05 | Define H15 Claude dependency | Mark C15 review mandatory before Firm Analytics closeout.
- RP15.P08.M06 | Define H15 human approval note | Record what the human must approve for Firm Analytics.
- RP15.P08.M07 | Test H15 command availability | Ensure npm scripts required by H15 exist before handoff.
- RP15.P08.M08 | Prepare H15 evidence packet template | Create the evidence template Hermes will fill during Firm Analytics implementation closeout.
- RP15.P08.M09 | Prepare H15 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H15.
- RP15.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Firm Analytics behavior without owning product code.

## RP15.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp15-claude-cross-validation-brief.md, docs/rp15-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP15.P09.M00 | Prepare RP15 architecture review questions | Ask whether Firm Analytics module boundaries, model shapes, and workflows match the specification.
- RP15.P09.M01 | Prepare RP15 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Firm Analytics.
- RP15.P09.M02 | Prepare RP15 bypass review questions | Ask Claude to find untrimmed analytics, metric definition drift, stale forecast, financial reconciliation gap, and undefined bypasses.
- RP15.P09.M03 | Prepare RP15 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Firm Analytics.
- RP15.P09.M04 | Prepare RP15 downstream readiness questions | Ask whether Firm Analytics is ready for dependent modules and later enterprise hardening.
- RP15.P09.M05 | Prepare RP15 risk register | List unresolved Firm Analytics risks and route them to future RP corrections.
- RP15.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Firm Analytics findings.
- RP15.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Firm Analytics closeout.
- RP15.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP15.Pxx.Mxx correction or later RP dependency.
- RP15.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Firm Analytics can be considered ready.
- RP15.P09.M10 | Close RP15 detailed plan | Confirm Firm Analytics is detailed enough for AI implementation without more planning decisions.

