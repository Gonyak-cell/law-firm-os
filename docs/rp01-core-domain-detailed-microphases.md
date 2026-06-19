# RP01 Core Domain Foundation Detailed Micro Phases v1

Purpose: expand RP01 from the 3,300-phase master ledger into implementation-ready micro phases.

## Summary

- Program: RP01 Core Domain Foundation
- Micro phases: 110
- AI owner: Codex
- Hermes gate: H01
- Claude Code gate: C01
- Immediate next implementation target: RP01.P00.M00

## RP01.P00: Contract And Acceptance Baseline

Theme: 사양명세서의 core domain을 계약과 acceptance gate로 고정

Target files: contracts/core-domain-contract.json, packages/domain/README.md

Target tests: scripts/validate-product-contract.mjs

- RP01.P00.M00 | Inventory spec sections 5 and 6 | Extract Tenant, User, Role, Entity, Client, Matter, Document reference, and AuditEvent requirements into a core-domain inventory.
- RP01.P00.M01 | Draft core domain contract shell | Create the future contract shape for core entities, ownership, identifiers, and required invariants.
- RP01.P00.M02 | Define ID naming rules | Lock tenant_id, user_id, role_id, entity_id, client_id, matter_id, document_id, version_id, event_id naming rules.
- RP01.P00.M03 | Define ownership rules | Specify Core owns Tenant/User/Role/Permission/AuditEvent, Master Data owns Entity/Client, Matter Core owns Matter, DMS owns Document.
- RP01.P00.M04 | Define pre-Matter exceptions | Record that Lead and Opportunity may exist before Matter while Document, Time, Billing, Settlement, and AI must be Matter-traceable.
- RP01.P00.M05 | Define acceptance gates | Write H01 acceptance gates for Matter-first, DMS ownership, Permission core ownership, and Audit core ownership.
- RP01.P00.M06 | Define synthetic-only fixture policy | State that RP01 fixtures use fake tenants, users, clients, matters, and documents only.
- RP01.P00.M07 | Plan contract validation checks | List validation checks that will fail if core required entities or invariants disappear.
- RP01.P00.M08 | Prepare Hermes H01 preflight rows | Define what Hermes records before running RP01 implementation checks.
- RP01.P00.M09 | Prepare Claude C01 review brief | Prepare review questions for Claude Code around missing entities, ownership drift, and inadequate tests.
- RP01.P00.M10 | Close RP01.P00 handoff | Produce a handoff that tells AI to implement entity definitions next, not UI or API.

## RP01.P01: Domain Model

Theme: 핵심 entity shape와 소유 모듈을 코드로 선언

Target files: packages/domain/src/entities.js, packages/domain/src/ownership.js, packages/domain/src/index.js

Target tests: packages/domain/test/domain-entities.test.js

- RP01.P01.M00 | Create domain package structure | Create src and test layout for package-level domain definitions.
- RP01.P01.M01 | Implement Tenant shape | Define Tenant required fields: tenant_id, name, plan, region, security_policy, data_residency.
- RP01.P01.M02 | Implement User Group Role shapes | Define User, Group, Role required fields and role permission_set reference.
- RP01.P01.M03 | Implement Permission Policy shapes | Define Permission and Policy shape references without implementing authz evaluation yet.
- RP01.P01.M04 | Implement Entity Person Organization shapes | Define master-data entity base shapes for company/person/organization identity.
- RP01.P01.M05 | Implement Client BillingEntity ContactPoint shapes | Define ClientProfile, BillingEntity, ContactPoint, and Relationship references.
- RP01.P01.M06 | Implement Matter shapes | Define Matter, MatterMember, MatterTask, MatterCalendarEvent, Checklist, and MatterStatusHistory shapes.
- RP01.P01.M07 | Implement DMS reference shapes | Define Document and DocumentVersion references owned by DMS but visible to core domain checks.
- RP01.P01.M08 | Implement AuditEvent shape | Define AuditEvent core fields for actor, action, object, timestamp, and IP metadata.
- RP01.P01.M09 | Export domain registry | Export a registry of entity names, owning modules, required fields, and relationship references.
- RP01.P01.M10 | Close domain model phase | Confirm all RP01 core entities are represented and ready for invariant validation.

## RP01.P02: Service Logic

Theme: 도메인 불변조건과 검증 함수를 구현

Target files: packages/domain/src/invariants.js, packages/domain/src/validators.js

Target tests: packages/domain/test/domain-invariants.test.js

- RP01.P02.M00 | Define invariant registry | Create a registry for Matter-first, DMS ownership, core ownership, and required field invariants.
- RP01.P02.M01 | Implement required field validator | Validate required fields by entity type using the domain registry.
- RP01.P02.M02 | Implement Matter required invariant | Enforce tenant_id, client_id, owner_user_id, status, and confidentiality on Matter.
- RP01.P02.M03 | Implement DMS Matter trace invariant | Require Document and DocumentVersion references to remain traceable to matter_id.
- RP01.P02.M04 | Implement pre-Matter exception invariant | Allow Opportunity and Lead to exist before Matter conversion without weakening post-Matter rules.
- RP01.P02.M05 | Implement ownership invariant | Fail if Document is treated as CRM/Billing/Matter-owned instead of DMS-owned.
- RP01.P02.M06 | Implement Core ownership invariant | Fail if Permission, Policy, or AuditEvent are moved outside Core ownership.
- RP01.P02.M07 | Implement module dependency check | Check allowed reference direction between Core, Master Data, Matter, DMS, Billing, CRM, Settlement, and AI.
- RP01.P02.M08 | Implement validation summary | Return pass/fail, errors, warnings, and checked invariant IDs for Hermes evidence.
- RP01.P02.M09 | Add blocked-claim output | Expose blocked claims when a requested structure violates Matter-first or ownership rules.
- RP01.P02.M10 | Close service logic phase | Confirm validators can be consumed by tests and future Hermes product checks.

## RP01.P03: API And Interface

Theme: 다른 패키지와 Hermes가 사용할 public interface 고정

Target files: packages/domain/src/index.js, packages/domain/src/domain-contract.js

Target tests: packages/domain/test/domain-interface.test.js

- RP01.P03.M00 | Define package public exports | Expose entities, ownership registry, invariants, validators, and fixture helpers through a stable index.
- RP01.P03.M01 | Define validateDomainContract API | Create a single function contract for validating entity registries and fixtures.
- RP01.P03.M02 | Define getEntityDefinition API | Expose entity definitions by name for future API/DB generators.
- RP01.P03.M03 | Define getOwnerModule API | Expose owning module by entity name for cross-module checks.
- RP01.P03.M04 | Define listMatterTraceableEntities API | Expose entities that must be traceable to Matter.
- RP01.P03.M05 | Define listPreMatterEntities API | Expose Lead and Opportunity as explicit pre-Matter exceptions.
- RP01.P03.M06 | Define validation result shape | Lock result fields: valid, errors, warnings, checked, blocked_claims.
- RP01.P03.M07 | Define error code taxonomy | Add stable error codes for missing field, ownership drift, matter trace failure, and pre-Matter misuse.
- RP01.P03.M08 | Define Hermes consumption shape | Ensure validation result can be serialized into Hermes evidence without hidden state.
- RP01.P03.M09 | Define Claude review packet input | Expose enough contract summary for Claude Code cross-validation prompts.
- RP01.P03.M10 | Close interface phase | Freeze RP01 package interface until RP02 explicitly extends it.

## RP01.P04: UI And Operator Surface

Theme: UI에는 도메인 상태를 표시하되 아직 도메인 로직을 UI에 섞지 않음

Target files: apps/web/src/main.jsx, apps/web/src/styles.css

Target tests: npm run build

- RP01.P04.M00 | Inventory existing Jira-like UI | Identify current Matter UI spots that should later consume domain fixtures.
- RP01.P04.M01 | Plan domain fixture injection | Define how UI will read synthetic Matters without direct coupling to validators.
- RP01.P04.M02 | Define Matter row required fields display | Map matter_id, client name, owner, status, confidentiality, and due data to existing table layout.
- RP01.P04.M03 | Define audit panel domain fields | Map AuditEvent shape to the existing right-side recent audit event panel.
- RP01.P04.M04 | Define permission signal display | Map deny-rule and attorney-review state into a compact Jira-like warning/approval panel.
- RP01.P04.M05 | Define no-real-data UI marker | Ensure UI seed data is visibly synthetic in developer fixtures, not client-like hidden test data.
- RP01.P04.M06 | Plan responsive domain density | Keep Matter and Audit fields readable on mobile without losing required context.
- RP01.P04.M07 | Plan UI build validation | Keep `npm run build` as RP01 UI smoke even if no UI code changes are required.
- RP01.P04.M08 | Prepare Hermes UI evidence | Record that RP01 UI is display-only and not a domain authority.
- RP01.P04.M09 | Prepare Claude UI review prompt | Ask Claude to check whether UI suggests unsafe final authority or hides key security context.
- RP01.P04.M10 | Close UI operator phase | Defer deeper UI implementation to RP05/RP06 while preserving RP01 display assumptions.

## RP01.P05: Fixtures And Golden Cases

Theme: 합성 fixture와 golden case를 만들어 테스트와 Hermes 검증의 입력으로 사용

Target files: packages/domain/src/fixtures.js, packages/domain/fixtures/core-domain-fixtures.json

Target tests: packages/domain/test/domain-fixtures.test.js

- RP01.P05.M00 | Define synthetic tenant fixture | Create fake tenant with security policy and data residency.
- RP01.P05.M01 | Define synthetic users and roles | Create fake owner, partner, attorney, finance, security admin, and auditor users.
- RP01.P05.M02 | Define synthetic entity and client | Create fake organization/person/entity relationship and client profile.
- RP01.P05.M03 | Define synthetic matter | Create fake active Matter with owner, client, team, status, type, confidentiality.
- RP01.P05.M04 | Define synthetic document references | Create fake Document and DocumentVersion references tied to matter_id.
- RP01.P05.M05 | Define synthetic audit events | Create fake view/download/permission-change audit events.
- RP01.P05.M06 | Define valid golden case | Create a complete valid case that passes all RP01 invariants.
- RP01.P05.M07 | Define invalid no-matter document case | Create a failing case where Document lacks matter_id.
- RP01.P05.M08 | Define invalid ownership drift case | Create a failing case where Document is assigned to Billing or CRM ownership.
- RP01.P05.M09 | Define invalid matter required fields case | Create failing cases for missing tenant/client/owner/status/confidentiality.
- RP01.P05.M10 | Close fixtures phase | Confirm fixtures are synthetic, serializable, and reusable by Hermes H01.

## RP01.P06: Permission Audit Integration

Theme: RP02/RP03 구현 전, Permission/Audit가 core domain에 어떻게 연결되는지 계약화

Target files: packages/domain/src/security-contract.js, packages/domain/src/audit-contract.js

Target tests: packages/domain/test/security-audit-contract.test.js

- RP01.P06.M00 | Define Permission reference contract | Specify Permission fields and relationship to principal/object/action/effect.
- RP01.P06.M01 | Define Policy reference contract | Specify Policy fields and policy_type/config ownership.
- RP01.P06.M02 | Define AuditEvent action taxonomy seed | Seed actions for login, view, download, upload, permission_change, billing_change, AI_access.
- RP01.P06.M03 | Define audited object reference shape | Specify object_type and object_id rules for audit events.
- RP01.P06.M04 | Define security trimming contract seed | Record that search/AI/report visibility must be trimmed before display.
- RP01.P06.M05 | Define deny-rule precedence seed | Record deny-over-allow as RP02 implementation input.
- RP01.P06.M06 | Define ethical wall placeholder | Represent ethical wall as future deny-rule source without implementing logic in RP01.
- RP01.P06.M07 | Test audit event object references | Ensure synthetic audit events point to known core/DMS object references.
- RP01.P06.M08 | Prepare Hermes H01 security notes | Record what RP01 checks now and what must wait for RP02/RP03.
- RP01.P06.M09 | Prepare Claude security review brief | Ask Claude to identify security assumptions that are only placeholders.
- RP01.P06.M10 | Close permission audit integration | Hand off explicit TODOs to RP02 and RP03 without creating hidden logic gaps.

## RP01.P07: Failure Edge And Recovery

Theme: 실패 케이스, blocked claim, 복구 기준을 RP01에서 먼저 명확히 함

Target files: packages/domain/test/domain-failure-cases.test.js

Target tests: packages/domain/test/domain-failure-cases.test.js

- RP01.P07.M00 | Define missing identifier failures | Test missing tenant_id, user_id, client_id, matter_id, document_id, event_id where required.
- RP01.P07.M01 | Define invalid reference failures | Test references to unknown tenant, client, matter, document, or user.
- RP01.P07.M02 | Define ownership mismatch failures | Test mismatched owner module claims and ensure validators return blocked_claims for unsafe module drift.
- RP01.P07.M03 | Define status enum failures | Test invalid Matter status and user status values.
- RP01.P07.M04 | Define confidentiality failures | Test missing or invalid confidentiality level.
- RP01.P07.M05 | Define pre-Matter misuse failures | Test Document/Time/Billing-style records incorrectly treated as pre-Matter.
- RP01.P07.M06 | Define audit object mismatch failures | Test AuditEvent object_type/object_id mismatch.
- RP01.P07.M07 | Define blocked claim assertions | Ensure validators return blocked_claims instead of silently accepting unsafe shapes.
- RP01.P07.M08 | Define recovery handoff | Document how a failing micro phase should be corrected before advancing.
- RP01.P07.M09 | Prepare Claude edge-case review | Ask Claude to find missing failure cases and weak assumptions.
- RP01.P07.M10 | Close failure phase | Confirm failure cases fail for the intended reason and not due to test brittleness.

## RP01.P08: Hermes Validation Binding

Theme: RP01 결과를 Hermes H01이 읽을 수 있는 증거 구조로 연결

Target files: hermes/project.json, docs/hermes-connection.md, scripts/validate-product-contract.mjs

Target tests: npm run validate, npm test, npm run fullplan:validate

- RP01.P08.M00 | Define H01 command matrix | Record exact product commands Hermes should run for RP01.
- RP01.P08.M01 | Define H01 evidence fields | Define phase_id, command_result, changed_files, invariant_summary, blocked_claims, next_gate.
- RP01.P08.M02 | Define H01 domain summary | Serialize entity count, invariant count, fixture count, and failed case count.
- RP01.P08.M03 | Define H01 no-real-data evidence | Record that fixtures are synthetic and contain no client data.
- RP01.P08.M04 | Define H01 blocked claim evidence | Record unsafe domain shapes rejected by validators.
- RP01.P08.M05 | Define H01 Claude dependency | Mark C01 cross-validation required before RP02 opens.
- RP01.P08.M06 | Define H01 human approval note | Record what the human must approve: domain ownership and phase transition.
- RP01.P08.M07 | Test H01 command availability | Ensure npm scripts required by H01 exist before handoff.
- RP01.P08.M08 | Prepare H01 evidence packet template | Create a future template for Hermes to fill during implementation closeout.
- RP01.P08.M09 | Prepare H01 closeout criteria | Define PASS/BLOCK semantics for the RP01 gate.
- RP01.P08.M10 | Close Hermes binding phase | Confirm Hermes is attached as verifier, not product code owner.

## RP01.P09: Claude Cross Validation Closeout

Theme: Claude Code가 RP01 결과를 독립적으로 검토할 수 있는 review packet 준비

Target files: docs/rp01-claude-cross-validation-brief.md

Target tests: npm run validate, npm test, npm run fullplan:validate

- RP01.P09.M00 | Prepare RP01 architecture review questions | Ask whether entity ownership and module boundaries match the spec.
- RP01.P09.M01 | Prepare RP01 security review questions | Ask whether Matter-first, DMS ownership, and Permission/Audit placeholders are sufficiently constrained.
- RP01.P09.M02 | Prepare RP01 missing test questions | Ask what core domain failure cases are missing.
- RP01.P09.M03 | Prepare RP01 data model drift questions | Ask whether names/fields drift from the Law Firm OS specification.
- RP01.P09.M04 | Prepare RP01 SaaS readiness questions | Ask whether tenant isolation assumptions are ready for RP26 later.
- RP01.P09.M05 | Prepare RP01 blocked risk register | List unresolved risks that must move to RP02/RP03/RP04.
- RP01.P09.M06 | Define Claude finding severity | Use P0/P1/P2/P3 severity for Claude findings.
- RP01.P09.M07 | Define go/no-go verdict format | Require PASS, PASS_WITH_FINDINGS, or BLOCK for RP01 closeout.
- RP01.P09.M08 | Define finding-to-microphase routing | Route each Claude finding to a future RPxx.Pyy.Mzz or create a correction micro phase.
- RP01.P09.M09 | Prepare human approval summary | Summarize what the user must approve before RP02 begins.
- RP01.P09.M10 | Close RP01 detailed plan | Confirm RP01 is detailed enough for AI implementation without further planning decisions.

