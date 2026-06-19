# RP02 Permission Kernel Detailed Micro Phases v1

Purpose: expand RP02 from the 3,300-phase master ledger into implementation-ready permission-kernel micro phases.

## Summary

- Program: RP02 Permission Kernel
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H02
- Claude Code gate: C02
- Immediate next implementation target after RP01 closeout: RP02.P00.M00

## RP02.P00: Contract And Acceptance Baseline

Theme: RBAC/ABAC/ACL/Deny/Security Trimming을 구현 전 계약으로 고정

Target files: contracts/permission-kernel-contract.json, packages/authz/README.md

Target tests: scripts/validate-product-contract.mjs

- RP02.P00.M00 | Inventory spec permission sections | Extract system roles, five permission layers, deny precedence, and security trimming requirements.
- RP02.P00.M01 | Draft permission kernel contract shell | Create future contract shape for principals, resources, actions, effects, constraints, and decisions.
- RP02.P00.M02 | Define principal taxonomy | Lock User, Group, Role, MatterMember, ClientUser, ExternalCounsel, Auditor, and SystemAdmin principal references.
- RP02.P00.M03 | Define resource taxonomy | Lock Tenant, Entity, Client, Matter, Folder, Document, DocumentVersion, Invoice, Payment, SettlementRun, AIJob resources.
- RP02.P00.M04 | Define action taxonomy | Lock view, search, create, update, delete, download, share, approve, bill, settle, export, ai_retrieve actions.
- RP02.P00.M05 | Define effect taxonomy | Lock allow, deny, review_required, approval_required, and blocked effects.
- RP02.P00.M06 | Define precedence contract | Record Legal Hold, Ethical Wall/Deny, Object Restriction, Matter Permission, Role Permission, Tenant Default order.
- RP02.P00.M07 | Define security trimming contract | Record that unauthorized result titles, snippets, AI citations, and report rows are hidden before display.
- RP02.P00.M08 | Prepare Hermes H02 preflight | Define what Hermes records before permission implementation starts.
- RP02.P00.M09 | Prepare Claude C02 design brief | Prepare review questions on bypass risk, precedence ambiguity, and insufficient test coverage.
- RP02.P00.M10 | Close RP02.P00 handoff | Hand off a contract-first permission implementation scope to AI.

## RP02.P01: Domain Model

Theme: 권한 판단에 필요한 모델과 enum을 코드로 선언

Target files: packages/authz/src/policy-model.js, packages/authz/src/resources.js, packages/authz/src/actions.js

Target tests: packages/authz/test/policy-model.test.js

- RP02.P01.M00 | Create authz package structure | Create src and test layout for permission kernel implementation.
- RP02.P01.M01 | Implement Principal model | Define principal kinds, IDs, tenant scope, group membership, and role assignments.
- RP02.P01.M02 | Implement Resource model | Define resource kinds, IDs, tenant_id, matter_id, owner module, and confidentiality attributes.
- RP02.P01.M03 | Implement Action model | Define action groups and high-risk actions for document, billing, settlement, sharing, and AI retrieval.
- RP02.P01.M04 | Implement PolicyRule model | Define rule_id, source, principal selector, resource selector, action selector, effect, priority, condition.
- RP02.P01.M05 | Implement DenyRule model | Define deny-specific source types: legal_hold, ethical_wall, regulatory_hold, object_restriction, tenant_policy.
- RP02.P01.M06 | Implement MatterPermission model | Define MatterMember role and matter permission level mapping.
- RP02.P01.M07 | Implement ObjectACL model | Define object-specific principal/effect/action grants and restrictions.
- RP02.P01.M08 | Implement Decision model | Define decision result shape: allowed, effect, reason, matched_rules, review_required, audit_hint.
- RP02.P01.M09 | Export policy model registry | Export all enums and models through a stable package interface.
- RP02.P01.M10 | Close domain model phase | Confirm permission kernel has enough model surface for deterministic evaluation.

## RP02.P02: Service Logic

Theme: 권한 평가 엔진과 precedence를 구현

Target files: packages/authz/src/evaluate.js, packages/authz/src/precedence.js, packages/authz/src/conditions.js

Target tests: packages/authz/test/evaluate-permission.test.js

- RP02.P02.M00 | Define evaluatePermission API | Create deterministic evaluation entrypoint for principal, resource, action, and context.
- RP02.P02.M01 | Implement tenant boundary check | Reject cross-tenant access unless explicit system operation is flagged and audited.
- RP02.P02.M02 | Implement legal hold precedence | Ensure legal/regulatory hold rules are evaluated before all allow rules.
- RP02.P02.M03 | Implement ethical wall deny precedence | Ensure ethical wall deny overrides partner/admin/matter-team allow.
- RP02.P02.M04 | Implement object restriction precedence | Apply object-specific restrictions before matter-level and role-level allow.
- RP02.P02.M05 | Implement matter-level permission | Evaluate MatterMember role and permission_level for matter-scoped resources.
- RP02.P02.M06 | Implement role-based permission | Evaluate role permission_set when no stronger restriction blocks access.
- RP02.P02.M07 | Implement tenant default policy | Apply default tenant policy as final fallback.
- RP02.P02.M08 | Implement review-required effects | Return review_required or approval_required without treating them as direct allow.
- RP02.P02.M09 | Implement explainable decisions | Return matched rule IDs, precedence reason, and blocked claims for Hermes evidence.
- RP02.P02.M10 | Close service logic phase | Confirm evaluator handles allow, deny, review, approval, and blocked outcomes deterministically.

## RP02.P03: API And Interface

Theme: 다른 패키지와 API가 사용할 권한 public interface를 고정

Target files: packages/authz/src/index.js, packages/authz/src/decision-contract.js

Target tests: packages/authz/test/authz-interface.test.js

- RP02.P03.M00 | Define public exports | Expose policy model, evaluatePermission, trimResults, and decision helpers from package index.
- RP02.P03.M01 | Define canView interface | Provide a convenience wrapper for view decisions on matter, document, invoice, and report resources.
- RP02.P03.M02 | Define canSearch interface | Provide a wrapper for search result visibility decisions.
- RP02.P03.M03 | Define canDownload interface | Provide a wrapper for document/file download decisions and audit hints.
- RP02.P03.M04 | Define canShare interface | Provide a wrapper for secure link and client portal sharing decisions.
- RP02.P03.M05 | Define canApprove interface | Provide a wrapper for billing, settlement, engagement, and output approval decisions.
- RP02.P03.M06 | Define canAIRetrieve interface | Provide a wrapper for AI retrieval scope decisions.
- RP02.P03.M07 | Define decision serialization | Lock serializable shape for API responses and Hermes evidence without leaking hidden policy internals.
- RP02.P03.M08 | Define stable error codes | Add error codes for cross_tenant, denied_by_wall, legal_hold, object_restricted, insufficient_role, review_required.
- RP02.P03.M09 | Define Claude review contract summary | Expose enough interface summary for C02 cross-validation.
- RP02.P03.M10 | Close API interface phase | Freeze RP02 interface until RP03 audit integration extends it.

## RP02.P04: UI And Operator Surface

Theme: Jira-like UI에서 권한 상태와 차단 사유를 작게 표시

Target files: apps/web/src/main.jsx, apps/web/src/styles.css

Target tests: npm run build

- RP02.P04.M00 | Inventory permission UI surfaces | Identify Matter detail, DMS, audit panel, approval box, and admin surfaces for permission status.
- RP02.P04.M01 | Plan permission badge states | Define compact allowed, denied, review_required, ethical_wall, legal_hold, and inherited badges.
- RP02.P04.M02 | Plan denied result empty state | Define how unauthorized search/report results disappear without revealing titles or snippets.
- RP02.P04.M03 | Plan Matter team permission display | Map MatterMember roles and permission levels to existing UI density.
- RP02.P04.M04 | Plan object restriction indicator | Define restricted document/invoice indicators without leaking restricted details.
- RP02.P04.M05 | Plan approval-required UI | Show approval_required as a queue item, not as an actionable allow.
- RP02.P04.M06 | Plan audit hint UI | Show that actions will be audited for sensitive actions.
- RP02.P04.M07 | Plan responsive permission UI | Keep permission context visible on mobile without crowding Matter rows.
- RP02.P04.M08 | Prepare Hermes UI permission evidence | Record UI is presentation-only and cannot override evaluator decisions.
- RP02.P04.M09 | Prepare Claude UI permission review | Ask Claude to check whether UI leaks blocked resource details.
- RP02.P04.M10 | Close UI operator phase | Defer deep admin permission editing UI to RP21 while preserving display requirements.

## RP02.P05: Fixtures And Golden Cases

Theme: 권한 golden case로 deny-over-allow와 search trimming을 증명

Target files: packages/authz/src/fixtures.js, packages/authz/fixtures/permission-golden-cases.json

Target tests: packages/authz/test/permission-golden-cases.test.js

- RP02.P05.M00 | Define base tenant fixture | Create synthetic tenant with default security policy and roles.
- RP02.P05.M01 | Define matter team fixture | Create synthetic responsible partner, attorney, staff, finance, security admin, auditor, and client user.
- RP02.P05.M02 | Define matter resource fixture | Create synthetic matters with normal, confidential, highly confidential, and ethical wall variants.
- RP02.P05.M03 | Define document resource fixture | Create synthetic documents with folder, version, confidentiality, and matter references.
- RP02.P05.M04 | Define invoice settlement fixtures | Create synthetic invoice and settlement resources for future finance permissions.
- RP02.P05.M05 | Define legal hold golden case | Create case where legal hold blocks destructive action despite role allow.
- RP02.P05.M06 | Define ethical wall golden case | Create case where partner/admin-style principal is denied by wall.
- RP02.P05.M07 | Define object ACL golden case | Create case where object restriction narrows matter team access.
- RP02.P05.M08 | Define security trimming golden case | Create mixed search results where unauthorized rows disappear before display.
- RP02.P05.M09 | Define AI retrieval golden case | Create case where AI can retrieve only permitted document/version refs.
- RP02.P05.M10 | Close fixtures phase | Confirm fixtures are synthetic, reusable, and explicit about expected decisions.

## RP02.P06: Permission Audit Integration

Theme: 권한 결정이 감사 이벤트 생성을 위한 충분한 힌트를 제공하게 함

Target files: packages/authz/src/audit-hints.js, packages/audit/README.md

Target tests: packages/authz/test/permission-audit-hints.test.js

- RP02.P06.M00 | Define audit hint contract | Define audit_hint fields for actor, action, resource, decision, reason, and matched rules.
- RP02.P06.M01 | Bind view audit hint | Return audit hints for document, matter, invoice, and report view decisions.
- RP02.P06.M02 | Bind download audit hint | Return stronger audit hints for file download and export actions.
- RP02.P06.M03 | Bind share audit hint | Return audit hints for secure link, portal share, and external counsel share attempts.
- RP02.P06.M04 | Bind permission-change audit hint | Return audit hints when a policy or ACL mutation is requested.
- RP02.P06.M05 | Bind billing audit hint | Return audit hints for invoice, payment, write-off, and month-close actions.
- RP02.P06.M06 | Bind settlement audit hint | Return audit hints for settlement preview, approval, dispute, and lock actions.
- RP02.P06.M07 | Bind AI retrieval audit hint | Return audit hints with model policy and retrieval scope metadata.
- RP02.P06.M08 | Prepare Hermes H02 audit evidence | Record which permission decisions require audit event generation downstream.
- RP02.P06.M09 | Prepare Claude audit integration review | Ask Claude to find decisions that lack audit hints.
- RP02.P06.M10 | Close permission audit integration | Hand off audit event persistence to RP03 with no hidden gaps.

## RP02.P07: Failure Edge And Recovery

Theme: 권한 우회, 모호한 allow, cross-tenant, missing context를 모두 실패 케이스로 고정

Target files: packages/authz/test/permission-failure-cases.test.js

Target tests: packages/authz/test/permission-failure-cases.test.js

- RP02.P07.M00 | Define missing principal failure | Fail closed when principal is missing, disabled, or lacks tenant context.
- RP02.P07.M01 | Define missing resource failure | Fail closed when resource kind, ID, tenant, or matter context is missing.
- RP02.P07.M02 | Define missing action failure | Fail closed when action is unknown or unsupported.
- RP02.P07.M03 | Define cross-tenant failure | Deny access when principal and resource tenant IDs differ.
- RP02.P07.M04 | Define ambiguous rule failure | Fail or require review when two same-priority rules conflict.
- RP02.P07.M05 | Define stale matter membership failure | Deny or review when MatterMember is inactive or removed.
- RP02.P07.M06 | Define admin bypass failure | Prove admin or partner role cannot bypass ethical wall or legal hold.
- RP02.P07.M07 | Define search leak failure | Fail if unauthorized resource title, snippet, or count is leaked.
- RP02.P07.M08 | Define AI retrieval leak failure | Fail if unauthorized document/version enters AI retrieval set.
- RP02.P07.M09 | Prepare Claude bypass review | Ask Claude to find missing bypass and failure cases.
- RP02.P07.M10 | Close failure phase | Confirm all dangerous ambiguity fails closed or requires review.

## RP02.P08: Hermes Validation Binding

Theme: Hermes H02가 권한 커널 결과를 증거로 기록할 수 있게 함

Target files: hermes/project.json, docs/hermes-connection.md, scripts/validate-product-contract.mjs

Target tests: npm run validate, npm test, npm run fullplan:validate

- RP02.P08.M00 | Define H02 command matrix | Record product commands Hermes should run for permission kernel validation.
- RP02.P08.M01 | Define H02 decision evidence fields | Define decision count, deny count, review count, blocked claims, and matched rule summary.
- RP02.P08.M02 | Define H02 precedence evidence | Record proof that legal hold and deny rules outrank allow rules.
- RP02.P08.M03 | Define H02 trimming evidence | Record proof that unauthorized search/AI/report rows are hidden.
- RP02.P08.M04 | Define H02 audit-hint evidence | Record proof that sensitive decisions carry audit hints.
- RP02.P08.M05 | Define H02 no-real-data evidence | Record synthetic-only permission fixtures.
- RP02.P08.M06 | Define H02 Claude dependency | Mark C02 review mandatory before DMS or AI retrieval code trusts the evaluator.
- RP02.P08.M07 | Define H02 human approval note | Record what human must approve: deny precedence and fail-closed policy.
- RP02.P08.M08 | Prepare H02 evidence packet template | Create a future template for Hermes to fill during RP02 closeout.
- RP02.P08.M09 | Prepare H02 closeout criteria | Define PASS/BLOCK semantics for permission kernel gate.
- RP02.P08.M10 | Close Hermes binding phase | Confirm Hermes validates permission behavior without owning product code.

## RP02.P09: Claude Cross Validation Closeout

Theme: Claude Code가 권한 모델과 우회 가능성을 독립 검토하게 하는 review packet 준비

Target files: docs/rp02-claude-cross-validation-brief.md

Target tests: npm run validate, npm test, npm run fullplan:validate

- RP02.P09.M00 | Prepare RP02 architecture review questions | Ask whether permission model boundaries are stable and extensible.
- RP02.P09.M01 | Prepare RP02 security review questions | Ask whether deny-over-allow, fail-closed, and cross-tenant rules are sufficient.
- RP02.P09.M02 | Prepare RP02 bypass review questions | Ask Claude to find admin, partner, search, report, and AI retrieval bypasses.
- RP02.P09.M03 | Prepare RP02 missing test questions | Ask what golden cases and failure cases are missing.
- RP02.P09.M04 | Prepare RP02 DMS readiness questions | Ask whether evaluator can safely support DMS Core in RP06.
- RP02.P09.M05 | Prepare RP02 AI readiness questions | Ask whether evaluator can safely support AI retrieval later in RP17/RP18.
- RP02.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for permission findings.
- RP02.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for RP02 closeout.
- RP02.P09.M08 | Define finding-to-microphase routing | Route findings to RP02 corrections, RP03 audit, RP06 DMS, or RP17 AI governance.
- RP02.P09.M09 | Prepare human approval summary | Summarize the deny precedence, fail-closed, and review-required rules for approval.
- RP02.P09.M10 | Close RP02 detailed plan | Confirm RP02 is detailed enough for AI implementation without more planning decisions.

