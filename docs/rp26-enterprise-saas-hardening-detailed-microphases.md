# RP26 Enterprise SaaS Hardening Detailed Micro Phases v1

Purpose: expand RP26 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP26 Enterprise SaaS Hardening
- Scope: dedicated DB/storage/index/key, SSO, MFA, SCIM
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H26
- Claude Code gate: C26
- Immediate next implementation target: RP26.P00.M00

## RP26.P00: Contract And Acceptance Baseline

Theme: implementation scope, acceptance gates, and non-goals are fixed before code starts

Target files: contracts/enterprise-contract.json, packages/enterprise/README.md, contracts/enterprise-saas-hardening-contract.json

Target tests: scripts/validate-product-contract.mjs

- RP26.P00.M00 | Inventory spec and acceptance source | Extract dedicated DB/storage/index/key, SSO, MFA, SCIM requirements and identify tenant isolation breach, SSO misconfiguration, and MFA bypass as explicit acceptance risks.
- RP26.P00.M01 | Draft contract shell | Create the future Enterprise SaaS Hardening contract shape for TenantIsolationPolicy, DedicatedResource, SSOConfig, MFARequirement, SCIMUser, KeyPolicy.
- RP26.P00.M02 | Define ownership boundary | Record which module owns TenantIsolationPolicy, DedicatedResource, and SSOConfig, and which modules may only reference them.
- RP26.P00.M03 | Define lifecycle gates | Lock entry, review, approval, blocked, and closeout states for tenant provisioning, SSO login, and MFA enforcement.
- RP26.P00.M04 | Define Matter-first trace rules | State how Enterprise SaaS Hardening records remain tenant-scoped and Matter-traceable when the workflow touches client or document data.
- RP26.P00.M05 | Define permission and audit baseline | Record the minimum permission decision and audit evidence required before Enterprise SaaS Hardening behavior can run.
- RP26.P00.M06 | Define synthetic-only fixture policy | State that Enterprise SaaS Hardening examples use fake tenants, users, matters, documents, and financial values only.
- RP26.P00.M07 | Define validation command matrix | List the product commands required to verify Enterprise SaaS Hardening planning and later implementation.
- RP26.P00.M08 | Prepare H26 preflight | Define the fields Hermes records before Enterprise SaaS Hardening implementation starts.
- RP26.P00.M09 | Prepare C26 design brief | Prepare Claude Code questions around tenant isolation breach, SSO misconfiguration, MFA bypass, and missing tests.
- RP26.P00.M10 | Close RP26.P00 handoff | Hand off a contract-first Enterprise SaaS Hardening implementation scope to AI.

## RP26.P01: Domain Model

Theme: entities, identifiers, states, references, and ownership are declared

Target files: packages/enterprise/src/model.js, packages/enterprise/src/states.js, packages/enterprise/src/registry.js

Target tests: packages/enterprise/test/model.test.js

- RP26.P01.M00 | Create package structure | Create src, test, fixture, and README layout for packages/enterprise.
- RP26.P01.M01 | Implement TenantIsolationPolicy model | Define identifiers, tenant scope, Matter references, status fields, and audit metadata for TenantIsolationPolicy.
- RP26.P01.M02 | Implement DedicatedResource model | Define required fields, references, ownership metadata, and state constraints for DedicatedResource.
- RP26.P01.M03 | Implement SSOConfig model | Define required fields, relationship references, allowed states, and security attributes for SSOConfig.
- RP26.P01.M04 | Implement MFARequirement model | Define required fields, lifecycle states, ownership boundaries, and audit references for MFARequirement.
- RP26.P01.M05 | Implement SCIMUser model | Define required fields, state transitions, permission attributes, and reporting references for SCIMUser.
- RP26.P01.M06 | Implement relationship map | Map relationships among TenantIsolationPolicy, DedicatedResource, SSOConfig, MFARequirement, SCIMUser, KeyPolicy and their Core/Matter/DMS dependencies.
- RP26.P01.M07 | Implement state enum registry | Create stable status, type, effect, and outcome enums for Enterprise SaaS Hardening.
- RP26.P01.M08 | Implement validation registry | Expose required fields, references, ownership, and lifecycle invariants for Hermes evidence.
- RP26.P01.M09 | Export model registry | Export Enterprise SaaS Hardening model definitions through a stable package interface.
- RP26.P01.M10 | Close domain model phase | Confirm the Enterprise SaaS Hardening model surface is implementation-ready and does not require new scope decisions.

## RP26.P02: Service Logic

Theme: deterministic services, policy rules, workflows, and validations are implemented

Target files: packages/enterprise/src/service.js, packages/enterprise/src/policies.js, packages/enterprise/src/validators.js

Target tests: packages/enterprise/test/service.test.js

- RP26.P02.M00 | Define service entrypoints | Create deterministic service entrypoints for tenant provisioning, SSO login, and MFA enforcement.
- RP26.P02.M01 | Implement tenant provisioning | Implement validation, permission precheck, audit hint, and state transition logic for tenant provisioning.
- RP26.P02.M02 | Implement SSO login | Implement validation, permission precheck, audit hint, and state transition logic for SSO login.
- RP26.P02.M03 | Implement MFA enforcement | Implement validation, permission precheck, audit hint, and state transition logic for MFA enforcement.
- RP26.P02.M04 | Implement SCIM sync | Implement validation, permission precheck, audit hint, and state transition logic for SCIM sync.
- RP26.P02.M05 | Implement dedicated resource routing | Implement validation, permission precheck, audit hint, and state transition logic for dedicated resource routing.
- RP26.P02.M06 | Implement blocked-claim handling | Return explicit blocked claims for tenant isolation breach, SSO misconfiguration, and MFA bypass.
- RP26.P02.M07 | Implement idempotency and locking | Define idempotency, duplicate handling, and lock behavior for risky Enterprise SaaS Hardening operations.
- RP26.P02.M08 | Implement validation summary | Return pass/fail, checked rules, warning count, and blocked claims for Hermes H26.
- RP26.P02.M09 | Implement review-required routing | Route high-risk or ambiguous Enterprise SaaS Hardening outcomes to attorney or admin review instead of direct mutation.
- RP26.P02.M10 | Close service logic phase | Confirm Enterprise SaaS Hardening services are deterministic, auditable, and fail closed where required.

## RP26.P03: API And Interface

Theme: public package APIs, request/response contracts, and error semantics are fixed

Target files: packages/enterprise/src/index.js, packages/enterprise/src/api-contract.js, packages/enterprise/src/errors.js

Target tests: packages/enterprise/test/interface.test.js

- RP26.P03.M00 | Define public exports | Expose Enterprise SaaS Hardening models, services, fixtures, validators, and error codes from package index.
- RP26.P03.M01 | Define tenant provisioning API | Lock request, response, permission, audit, and error shape for tenant provisioning.
- RP26.P03.M02 | Define SSO login API | Lock request, response, permission, audit, and error shape for SSO login.
- RP26.P03.M03 | Define MFA enforcement API | Lock request, response, permission, audit, and error shape for MFA enforcement.
- RP26.P03.M04 | Define SCIM sync API | Lock request, response, permission, audit, and error shape for SCIM sync.
- RP26.P03.M05 | Define dedicated resource routing API | Lock request, response, permission, audit, and error shape for dedicated resource routing.
- RP26.P03.M06 | Define serialization contract | Ensure Enterprise SaaS Hardening API responses serialize without leaking hidden policy internals or unauthorized data.
- RP26.P03.M07 | Define stable error codes | Add error codes for tenant isolation breach, SSO misconfiguration, MFA bypass, SCIM stale user, and review_required.
- RP26.P03.M08 | Define Hermes consumption shape | Expose enough result metadata for H26 evidence without making Hermes product authority.
- RP26.P03.M09 | Define Claude review summary | Expose enough interface summary for C26 cross-validation.
- RP26.P03.M10 | Close API interface phase | Freeze Enterprise SaaS Hardening public interface until a later RP explicitly extends it.

## RP26.P04: UI And Operator Surface

Theme: Jira-like screens, queues, panels, states, and operator actions are mapped

Target files: apps/web/src/main.jsx, apps/web/src/styles.css, docs/rp26-ui-surface.md

Target tests: npm run build

- RP26.P04.M00 | Inventory UI surfaces | Identify enterprise security settings, SSO setup, SCIM sync status, and tenant isolation report in the Jira-like Law Firm OS UI.
- RP26.P04.M01 | Plan enterprise security settings | Map data, loading state, empty state, denied state, and audit hints for enterprise security settings.
- RP26.P04.M02 | Plan SSO setup | Map data, loading state, empty state, denied state, and audit hints for SSO setup.
- RP26.P04.M03 | Plan SCIM sync status | Map data, loading state, empty state, denied state, and audit hints for SCIM sync status.
- RP26.P04.M04 | Plan tenant isolation report | Map data, loading state, empty state, denied state, and audit hints for tenant isolation report.
- RP26.P04.M05 | Plan review-required UI | Show high-risk Enterprise SaaS Hardening outcomes as review queue items, not silent successes.
- RP26.P04.M06 | Plan permission-trimmed UI | Ensure unauthorized Enterprise SaaS Hardening rows, counts, snippets, and citations are hidden before display.
- RP26.P04.M07 | Plan responsive density | Keep Enterprise SaaS Hardening context readable on desktop and mobile without marketing-page layout.
- RP26.P04.M08 | Prepare Hermes UI evidence | Record that UI is presentation-only and cannot override Enterprise SaaS Hardening service decisions.
- RP26.P04.M09 | Prepare Claude UI review | Ask Claude to find UI leaks, unsafe affordances, and misleading authority claims for Enterprise SaaS Hardening.
- RP26.P04.M10 | Close UI operator phase | Confirm UI scope is ready for implementation without inventing extra product behavior.

## RP26.P05: Fixtures And Golden Cases

Theme: synthetic fixtures, golden paths, and replayable examples prove expected behavior

Target files: packages/enterprise/src/fixtures.js, packages/enterprise/fixtures/golden-cases.json

Target tests: packages/enterprise/test/golden-cases.test.js

- RP26.P05.M00 | Define base tenant fixture | Create a fake tenant, users, roles, matters, and documents for Enterprise SaaS Hardening.
- RP26.P05.M01 | Define SSO login succeeds golden case | Create a synthetic golden case proving SSO login succeeds.
- RP26.P05.M02 | Define MFA required golden case | Create a synthetic golden case proving MFA required.
- RP26.P05.M03 | Define SCIM deprovision disables user golden case | Create a synthetic golden case proving SCIM deprovision disables user.
- RP26.P05.M04 | Define dedicated storage enforced golden case | Create a synthetic golden case proving dedicated storage enforced.
- RP26.P05.M05 | Define tenant isolation breach failure fixture | Create a synthetic failing case that proves tenant isolation breach is blocked or reviewed.
- RP26.P05.M06 | Define SSO misconfiguration failure fixture | Create a synthetic failing case that proves SSO misconfiguration is blocked or reviewed.
- RP26.P05.M07 | Define MFA bypass failure fixture | Create a synthetic failing case that proves MFA bypass is blocked or reviewed.
- RP26.P05.M08 | Define replayable fixture manifest | Serialize Enterprise SaaS Hardening fixtures with expected decisions, audit hints, and Hermes evidence labels.
- RP26.P05.M09 | Define AI retrieval/report fixture | If Enterprise SaaS Hardening appears in search, analytics, or AI retrieval, prove unauthorized rows are trimmed.
- RP26.P05.M10 | Close fixtures phase | Confirm Enterprise SaaS Hardening fixtures are synthetic, deterministic, and reusable by tests and Hermes.

## RP26.P06: Permission Audit Integration

Theme: permissions, security trimming, audit hints, and evidence rules are attached

Target files: packages/enterprise/src/security-contract.js, packages/enterprise/src/audit-hints.js, packages/audit/README.md

Target tests: packages/enterprise/test/security-audit.test.js

- RP26.P06.M00 | Define permission contract | Specify required permission checks for tenant provisioning, SSO login, MFA enforcement, and SCIM sync.
- RP26.P06.M01 | Bind view/search permission | Return permission decisions and trimming metadata for Enterprise SaaS Hardening view and search surfaces.
- RP26.P06.M02 | Bind mutation permission | Return permission decisions, approval requirements, and blocked claims for Enterprise SaaS Hardening mutations.
- RP26.P06.M03 | Bind export/download permission | Return stronger audit hints for Enterprise SaaS Hardening export, download, or external-share actions.
- RP26.P06.M04 | Bind audit event hints | Return actor, action, object, decision, reason, and matched-rule hints for Enterprise SaaS Hardening.
- RP26.P06.M05 | Bind retention/governance hints | Record legal hold, retention, DLP, or governance implications for Enterprise SaaS Hardening where applicable.
- RP26.P06.M06 | Bind analytics and AI trimming | Ensure analytics rows and AI retrieval scopes for Enterprise SaaS Hardening obey security trimming.
- RP26.P06.M07 | Test permission-audit matrix | Cover allowed, denied, review_required, approval_required, and blocked outcomes for Enterprise SaaS Hardening.
- RP26.P06.M08 | Prepare H26 audit evidence | Record which Enterprise SaaS Hardening decisions require downstream audit event persistence.
- RP26.P06.M09 | Prepare Claude audit review | Ask Claude to find missing audit hints or permission bypasses for Enterprise SaaS Hardening.
- RP26.P06.M10 | Close permission audit integration | Confirm Enterprise SaaS Hardening cannot ship without permission and audit evidence coverage.

## RP26.P07: Failure Edge And Recovery

Theme: edge cases, blocked actions, retries, recovery, and fail-closed behavior are covered

Target files: packages/enterprise/test/failure-cases.test.js, docs/rp26-recovery-notes.md

Target tests: packages/enterprise/test/failure-cases.test.js

- RP26.P07.M00 | Define tenant isolation breach failure | Fail closed or require review when tenant isolation breach appears in Enterprise SaaS Hardening.
- RP26.P07.M01 | Define SSO misconfiguration failure | Fail closed or require review when SSO misconfiguration appears in Enterprise SaaS Hardening.
- RP26.P07.M02 | Define MFA bypass failure | Fail closed or require review when MFA bypass appears in Enterprise SaaS Hardening.
- RP26.P07.M03 | Define SCIM stale user failure | Fail closed or require review when SCIM stale user appears in Enterprise SaaS Hardening.
- RP26.P07.M04 | Define key routing error failure | Fail closed or require review when key routing error appears in Enterprise SaaS Hardening.
- RP26.P07.M05 | Define missing context failure | Fail closed when tenant, Matter, actor, resource, or action context is missing for Enterprise SaaS Hardening.
- RP26.P07.M06 | Define cross-tenant failure | Deny or block any Enterprise SaaS Hardening operation where actor and resource tenant IDs differ.
- RP26.P07.M07 | Define retry and rollback behavior | Define retry, idempotency, rollback, and compensation behavior for failed Enterprise SaaS Hardening operations.
- RP26.P07.M08 | Define recovery handoff | Document how a failed Enterprise SaaS Hardening micro phase is corrected before advancing.
- RP26.P07.M09 | Prepare Claude edge review | Ask Claude to find missing failure cases, bypasses, and brittle assumptions for Enterprise SaaS Hardening.
- RP26.P07.M10 | Close failure phase | Confirm dangerous Enterprise SaaS Hardening ambiguity fails closed or requires review.

## RP26.P08: Hermes Validation Binding

Theme: Hermes evidence, command matrix, gate verdict, and blocked claims are prepared

Target files: hermes/project.json, docs/hermes-connection.md, docs/rp26-hermes-evidence-template.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP26.P08.M00 | Define H26 command matrix | Record exact product commands Hermes should run for Enterprise SaaS Hardening.
- RP26.P08.M01 | Define H26 evidence fields | Define phase_id, command_result, changed_files, fixture_summary, blocked_claims, and next_gate fields.
- RP26.P08.M02 | Define H26 domain evidence | Record entity count, workflow count, fixture count, failure count, and permission-audit coverage for Enterprise SaaS Hardening.
- RP26.P08.M03 | Define H26 no-real-data evidence | Record that Enterprise SaaS Hardening fixtures and examples contain only synthetic data.
- RP26.P08.M04 | Define H26 blocked-claim evidence | Record unsafe Enterprise SaaS Hardening claims rejected by validators or tests.
- RP26.P08.M05 | Define H26 Claude dependency | Mark C26 review mandatory before Enterprise SaaS Hardening closeout.
- RP26.P08.M06 | Define H26 human approval note | Record what the human must approve for Enterprise SaaS Hardening.
- RP26.P08.M07 | Test H26 command availability | Ensure npm scripts required by H26 exist before handoff.
- RP26.P08.M08 | Prepare H26 evidence packet template | Create the evidence template Hermes will fill during Enterprise SaaS Hardening implementation closeout.
- RP26.P08.M09 | Prepare H26 closeout criteria | Define PASS, PASS_WITH_FINDINGS, and BLOCK semantics for H26.
- RP26.P08.M10 | Close Hermes binding phase | Confirm Hermes validates Enterprise SaaS Hardening behavior without owning product code.

## RP26.P09: Claude Cross Validation Closeout

Theme: Claude Code independently reviews architecture, security, tests, and go/no-go status

Target files: docs/rp26-claude-cross-validation-brief.md, docs/rp26-human-approval-summary.md

Target tests: npm run validate, npm run fullplan:validate, npm test

- RP26.P09.M00 | Prepare RP26 architecture review questions | Ask whether Enterprise SaaS Hardening module boundaries, model shapes, and workflows match the specification.
- RP26.P09.M01 | Prepare RP26 security review questions | Ask whether permissions, audit, tenant isolation, and Matter-first rules are sufficient for Enterprise SaaS Hardening.
- RP26.P09.M02 | Prepare RP26 bypass review questions | Ask Claude to find tenant isolation breach, SSO misconfiguration, MFA bypass, SCIM stale user, and key routing error bypasses.
- RP26.P09.M03 | Prepare RP26 missing test questions | Ask what golden cases, failure cases, UI states, and contract tests are missing for Enterprise SaaS Hardening.
- RP26.P09.M04 | Prepare RP26 downstream readiness questions | Ask whether Enterprise SaaS Hardening is ready for dependent modules and later enterprise hardening.
- RP26.P09.M05 | Prepare RP26 risk register | List unresolved Enterprise SaaS Hardening risks and route them to future RP corrections.
- RP26.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Enterprise SaaS Hardening findings.
- RP26.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for Enterprise SaaS Hardening closeout.
- RP26.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a concrete RP26.Pxx.Mxx correction or later RP dependency.
- RP26.P09.M09 | Prepare human approval summary | Summarize what the user must approve before Enterprise SaaS Hardening can be considered ready.
- RP26.P09.M10 | Close RP26 detailed plan | Confirm Enterprise SaaS Hardening is detailed enough for AI implementation without more planning decisions.

