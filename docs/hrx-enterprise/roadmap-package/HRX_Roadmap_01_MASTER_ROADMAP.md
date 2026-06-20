# HRX Enterprise SaaS Roadmap — 개발팀 전달용 마스터 문서

문서 상태: execution roadmap / no go-live claim  
기준일: 2026-06-20  
기준 코드: `codex/lawos-current-work-snapshot`  

## 1. 현재 상태 요약

현재 HRX는 이전 descriptor-only 상태에서 진전되어 runtime API evidence 단계까지 올라왔습니다. `apps/api/src/hrx-runtime-context.js`와 `apps/api/src/server.js`가 `/api/hrx/*` route를 실제로 연결하고, `apps/web/src/people/*` UI가 API-backed surface를 제공합니다. 그러나 공식 readiness boundary는 여전히 `runtime_api_evidence_only__durable_persistence_open`입니다.

## 2. Target State

1차 target은 Workday/SuccessFactors급 full SaaS claim이 아니라 다음 상태입니다.

> `runtime_write_ready__durable_persistence_guarded`

이 상태가 되려면 durable DB persistence, route-level HR-sensitive permission enforcement, durable audit, step-up, real tenant/actor context, e2e validation을 모두 통과해야 합니다.

## 3. 설계 원칙

- 현재 구현은 CMP-G3 기준 runtime API evidence이며 production-ready가 아니다.
- durable persistence, route-level HR-sensitive authz, durable audit, real tenant/actor context, step-up enforcement 없이는 R4/go-live/enterprise-ready claim 금지.
- Employee와 User는 반드시 분리한다. Employee는 IAM session authority가 아니다.
- HR document body는 HRX DB/API에 저장하지 않고 source_ref 및 metadata만 관리한다.
- Payroll은 계산/지급 runtime이 아니라 export preview + human review boundary부터 구현한다.
- AI는 source-grounded explanation only이며 채용/평가/보상/징계/해고 final judgment를 하지 않는다.
- 모든 민감 HR read/write는 permission decision + audit event + step-up(필요 시)을 통과해야 한다.

## 4. 피라미드 계층 구조

| Layer | Name | Goal | Primary gate |
|---|---|---|---|
| L0 | Boundary & Source-of-Truth | 현재 runtime evidence와 production readiness 사이의 경계를 명문화하고 완료 claim을 통제한다. | R4/go-live 오인 차단 |
| L1 | Durable Runtime Foundation | in-memory HRX runtime을 DB-backed repository, migration, seed, backup 가능한 foundation으로 전환한다. | durable persistence |
| L2 | Trust Boundary | tenant/actor/session/authz/step-up/audit를 모든 HRX route에 강제한다. | security gate |
| L3 | Core HRIS Domain | Employee, EmploymentProfile, UserLink, Org, Role, Document, Compensation boundary를 core HRIS로 정리한다. | HR master data |
| L4 | People Operations Workflows | Leave, attendance, overtime, recruiting, onboarding, offboarding, HR risk를 runtime workflow로 확장한다. | workflow runtime |
| L5 | Portal & API Experience | Employee/Candidate/HR Admin portal을 session-based API-backed UI로 harden한다. | operator surface |
| L6 | AI/RAG & Analytics | permission-aware HR RAG, no-final-judgment guard, people analytics/read model을 source-grounded로 강화한다. | AI/analytics |
| L7 | Enterprise Hardening | SSO/MFA/SCIM, observability, compliance, retention/purge/legal hold, DR, performance를 operational control로 구현한다. | enterprise controls |
| L8 | Release, UAT & Go/No-Go | UAT, cutover, release readiness, owner decision, go/no-go gate를 실제 실행 기준으로 정리한다. | release control |

## 5. PR Sequencing

| PR | Branch | Layer | Scope | Exit criteria |
|---|---|---|---|---|
| PR-00 | codex/hrx-roadmap-governance | L0 | Boundary, source-of-truth, no-premature-claim validators | Roadmap docs + release gate baseline |
| PR-01 | codex/hrx-db-repository-foundation | L1 | DB adapter, SQL repository, migration runner | Employee/Employment/UserLink durable |
| PR-02 | codex/hrx-doc-leave-audit-persistence | L1/L2 | Document, Leave, Audit tables and stores | Restart durable HR docs/leave/audit |
| PR-03 | codex/hrx-route-authz-enforcement | L2 | Route policy map and HRX authz middleware | All /api/hrx routes deny-by-default |
| PR-04 | codex/hrx-step-up-sensitive-routes | L2 | MFA/step-up enforcement | Comp/eval/payroll/audit protected |
| PR-05 | codex/hrx-context-hardening | L2/L5 | Tenant/actor context and UI client cleanup | No hardcoded tenant/scopes |
| PR-06 | codex/hrx-document-source-boundary | L3 | Document source adapter and source verification | Metadata-only with source status |
| PR-07 | codex/hrx-core-domain-expansion | L3 | Org/assignment/compensation/retention/legal hold/people graph | Core HRIS domain complete enough for workflows |
| PR-08 | codex/hrx-workflow-leave-payroll | L4 | Leave, attendance, overtime, payroll export workflow | Workflow durable + audited |
| PR-09 | codex/hrx-recruiting-lifecycle | L4 | ATS, candidate consent, offer, conversion, lifecycle | Candidate privacy preserved |
| PR-10 | codex/hrx-portal-ui-hardening | L5 | People/Candidate/Admin UI production states | API-backed UI e2e |
| PR-11 | codex/hrx-lifecycle-ui | L5 | Onboarding/offboarding/lifecycle UI | HR ops board e2e |
| PR-12 | codex/hrx-ai-analytics-hardening | L6 | AI source ingestion, citations, review queue, analytics snapshots | No-final-judgment + source-grounded |
| PR-13 | codex/hrx-enterprise-controls | L7 | SSO/SCIM/MFA, tenant isolation, observability, compliance | Enterprise control evidence operational |
| PR-14 | codex/hrx-dr-uat-readiness | L7 | Backup/restore, UAT execution, security/perf smoke | Readiness validators pass |
| PR-15 | codex/hrx-release-go-no-go | L8 | Cutover, go/no-go, release evidence pack | Owner decision-ready, no self-approval |

## 6. Critical Acceptance Gates

| Gate | Must pass | Blocks |
|---|---|---|
| G-P0-1 Durable Persistence | DB-backed repository, migration runner, restart durability | runtime-write-ready |
| G-P0-2 Route Authz | Every HRX route evaluates HRX policy | sensitive data exposure |
| G-P0-3 Step-up | Compensation/evaluation/payroll/audit require fresh MFA | enterprise trust |
| G-P0-4 Durable Audit | Append-only DB audit with hash chain | compliance readiness |
| G-P0-5 Real Context | Tenant/actor/session derived from trusted server-side context | tenant isolation |
| G-P0-6 No Premature Claim | R4/go-live forbidden unless all gates + owner approval pass | launch |

## 7. 30/60/90 Plan

### 30일
- DB-backed repository와 migration runner 구현
- HRDocument/Leave/Audit durable store 구현
- HRX route authz + step-up enforcement
- UI hardcoded tenant/scopes 제거
- `hrx:persistence:validate`, `hrx:authz:validate`, `hrx:step-up:validate` 신설

### 60일
- HR document source adapter, payroll export review workflow
- Recruiting/ATS lifecycle, candidate consent, offer, conversion gate
- Onboarding/offboarding/legal hold
- AI source ingestion/citation validator/review queue persistence
- People UI e2e suite 확대

### 90일
- Compliance report, retention/purge, backup/restore smoke
- SSO/SCIM/MFA integration boundary
- UAT execution evidence
- release/go-no-go gate
- `hrx:enterprise:validate` pass

## 8. Source Evidence Register

| ID | Source | Path | Use |
|---|---|---|---|
| E-CODE-01 | GitHub | apps/api/src/hrx-runtime-context.js | HRX route set, in-memory runtime context, readiness string runtime_api_evidence_only__durable_persistence_open |
| E-CODE-02 | GitHub | packages/hrx/src/repository.js | Employee/EmploymentProfile in-memory CRUD repository |
| E-CODE-03 | GitHub | packages/hrx/src/schema.js | Employee/User separation via reserved identity fields and EmployeeUserLink schema |
| E-CODE-04 | GitHub | packages/hrx/src/migrations/001_hrx_core.sql | Initial durable schema for hrx_employees, hrx_employment_profiles, hrx_employee_user_links |
| E-CODE-05 | GitHub | apps/api/src/server.js | API server wires /api/hrx/* to handleHrxApiRequest |
| E-CODE-06 | GitHub | packages/audit/src/hrx-event-store.js | In-memory HRX audit store |
| E-CODE-07 | GitHub | packages/authz/src/hrx-policy-engine.js | HRX policy engine exists but route enforcement must be integrated |
| E-CODE-08 | GitHub | apps/api/src/middleware/hrx-step-up.js | Step-up/MFA logic exists but must be enforced on sensitive routes |
| E-CODE-09 | GitHub | apps/web/src/people/PeopleHome.tsx | API-backed People UI shell |
| E-CODE-10 | GitHub | apps/web/src/people/hrxApiClient.ts | People UI client with hardcoded tenant/actor/scopes requiring hardening |
| E-DOC-01 | GitHub Docs | docs/reorganization/client-matter-os/cmp-v1/05-cmp-g3-people-hrx-runtime-report.md | Implemented runtime API evidence; durable production persistence remains open |
| E-DOC-02 | GitHub Docs | docs/reorganization/client-matter-os/cmp-v1/14-cmp-g12-enterprise-readiness-runtime-report.md | Enterprise readiness routes are evidence only; no production deployment/durable persistence/go-live claim |
| E-DRIVE-01 | Google Drive | hrx-full-integration-plan.md | Planning-only embedded People/HR Evidence, not separate HRX product |
| E-DRIVE-02 | Google Drive | rp30-people-hr-evidence-detailed-microphases.md | HRX embedded planning source |

## 9. Full Backlog

전체 TUW는 `03_TUW_BACKLOG.csv`를 기준으로 합니다. 본문에는 P0 중심으로 우선 실행합니다.

| ID | Layer | Epic | Task | Severity | Target files | Acceptance criteria | PR sequence |
|---|---|---|---|---|---|---|---|
| HRX-L0-001 | L0 | Boundary | 현재 HRX runtime evidence와 production readiness 경계 문서화 | P0 | docs/hrx-enterprise/00-boundary-decision.md | R4/go-live/enterprise claim 금지 문구와 source evidence register 포함 | PR-00 |
| HRX-L0-002 | L0 | Boundary | Drive planning-only 문서와 GitHub runtime evidence 간 source-of-truth hierarchy 정리 | P0 | docs/hrx-enterprise/plan-intake.md | Drive=planning, GitHub=snapshot runtime evidence, conflict policy 명시 | PR-00 |
| HRX-L0-003 | L0 | Boundary | CMP-G3/G12 readiness string 유지 및 승격 조건 정의 | P0 | docs/hrx-enterprise/03-release-gates.md | runtime_api_evidence_only__durable_persistence_open 승격 조건 정의 | PR-00 |
| HRX-L0-004 | L0 | Boundary | R4/go-live 금지 validator rule 작성 | P0 | scripts/validate-hrx-no-premature-claim.mjs | forbidden readiness string 검출 시 실패 | PR-00 |
| HRX-L1-001 | L1 | Durable Persistence | DB adapter port 정의 | P0 | packages/hrx/src/store/port.js | query/transaction/migrate/close interface 정의 | PR-01/02 |
| HRX-L1-002 | L1 | Durable Persistence | SQL-backed Employee repository 구현 | P0 | packages/hrx/src/repository-sql.js | Employee CRUD가 DB transaction 안에서 동작 | PR-01/02 |
| HRX-L1-003 | L1 | Durable Persistence | SQL-backed EmploymentProfile repository 구현 | P0 | packages/hrx/src/repository-sql.js | EmploymentProfile CRUD/FK validation DB-backed | PR-01/02 |
| HRX-L1-004 | L1 | Durable Persistence | EmployeeUserLink repository/API 기반 준비 | P0 | packages/hrx/src/identity-link.js | login_mapping 외 purpose 차단 | PR-01/02 |
| HRX-L1-005 | L1 | Durable Persistence | migration runner 구현 | P0 | packages/hrx/src/migrations/index.js; scripts/migrate-hrx.mjs | 001_hrx_core.sql idempotent apply | PR-01/02 |
| HRX-L1-006 | L1 | Durable Persistence | documents/leave/audit migration 작성 | P0 | packages/hrx/src/migrations/002_hrx_documents_leave_audit.sql | HRDocument/Leave/Audit tables 생성 | PR-01/02 |
| HRX-L1-007 | L1 | Durable Persistence | runtime context store injection | P0 | apps/api/src/hrx-runtime-context.js | createHrxRuntimeContext({store}) 지원 | PR-01/02 |
| HRX-L1-008 | L1 | Durable Persistence | seed runner 구현 | P0 | scripts/seed-hrx-fixtures.mjs | synthetic fixture를 DB에 seed | PR-01/02 |
| HRX-L1-009 | L1 | Durable Persistence | in-memory repository를 test fixture로 격하 | P0 | packages/hrx/src/repository.js | production runtime default에서 제외 | PR-01/02 |
| HRX-L1-010 | L1 | Durable Persistence | restart durability test | P0 | apps/api/test/hrx/durability.test.js | write -> restart -> read pass | PR-01/02 |
| HRX-L2-001 | L2 | Trust Boundary | HRX route policy map 작성 | P0 | apps/api/src/routes/hrx/route-policy-map.js | 모든 /api/hrx/* route에 action/sensitivity/required_scope 존재 | PR-03/04/05 |
| HRX-L2-002 | L2 | Trust Boundary | HRX authz middleware 구현 | P0 | apps/api/src/middleware/hrx-authz.js | evaluateHrxPolicy를 route마다 호출 | PR-03/04/05 |
| HRX-L2-003 | L2 | Trust Boundary | server HRX path authz wiring | P0 | apps/api/src/server.js | HRX도 fail-closed permission path를 통과 | PR-03/04/05 |
| HRX-L2-004 | L2 | Trust Boundary | query tenant/actor fallback 제거 | P0 | apps/api/src/middleware/tenant-context.js; actor-context.js | tenant/actor는 trusted header/session only | PR-03/04/05 |
| HRX-L2-005 | L2 | Trust Boundary | UI hardcoded tenant/scopes 제거 | P0 | apps/web/src/people/hrxApiClient.ts | client는 permission allow rule을 만들지 않음 | PR-03/04/05 |
| HRX-L2-006 | L2 | Trust Boundary | step-up token parser | P0 | apps/api/src/middleware/hrx-step-up-context.js | fresh MFA token parse/validate | PR-03/04/05 |
| HRX-L2-007 | L2 | Trust Boundary | step-up enforcement | P0 | apps/api/src/middleware/hrx-step-up.js; hrx-runtime-context.js | comp/eval/payroll/audit route without step-up -> 403 | PR-03/04/05 |
| HRX-L2-008 | L2 | Trust Boundary | durable audit event store | P0 | packages/audit/src/hrx-event-store-sql.js | audit append/list DB-backed | PR-03/04/05 |
| HRX-L2-009 | L2 | Trust Boundary | audit hash chain | P0 | packages/audit/src/hrx-hash-chain.js | previous_hash/event_hash 생성 | PR-03/04/05 |
| HRX-L2-010 | L2 | Trust Boundary | route audit wrapper | P0 | apps/api/src/middleware/hrx-audit-write.js | 모든 HRX sensitive route audit write | PR-03/04/05 |
| HRX-L2-011 | L2 | Trust Boundary | field masking policy binding | P0 | packages/hrx/src/field-masker.js | authz decision에 따른 field-level masking | PR-03/04/05 |
| HRX-L3-001 | L3 | Core HRIS | Employee/UserLink API 구현 | P0 | apps/api/src/routes/hrx/employees.js; packages/hrx/src/identity-link.js | EmployeeUserLink create/list/revoke audited | PR-06/07 |
| HRX-L3-005 | L3 | Core HRIS | HRDocument source boundary | P0 | contracts/hrx-document-source-boundary.json; packages/hrx/src/documents/source-adapter.js | source_ref verified, body never stored | PR-06/07 |
| HRX-L3-008 | L3 | Core HRIS | Compensation metadata store | P0 | packages/hrx/src/compensation.js | encrypted/masked refs only | PR-06/07 |
| HRX-L3-009 | L3 | Core HRIS | Payroll profile boundary | P0 | packages/hrx/src/payroll-boundary.js | calculation/disbursement fields blocked | PR-06/07 |
| HRX-L3-010 | L3 | Core HRIS | Retention policy model | P0 | packages/hrx/src/retention.js | object_type retention/legal hold override | PR-06/07 |
| HRX-L3-011 | L3 | Core HRIS | Legal hold model | P0 | packages/hrx/src/legal-hold.js | hold blocks purge/delete | PR-06/07 |
| HRX-L4-002 | L4 | People Ops Workflows | Leave request DB-backed workflow | P0 | packages/hrx/src/leave/request-service.js | submit/approve/reject/cancel durable | PR-08/09 |
| HRX-L4-005 | L4 | People Ops Workflows | Generic HR approval workflow | P0 | packages/hrx/src/approval.js | route/steps/delegation/escalation | PR-08/09 |
| HRX-L4-007 | L4 | People Ops Workflows | Candidate consent/privacy | P0 | packages/hrx/src/recruiting/consent.js | consent before processing | PR-08/09 |
| HRX-L4-010 | L4 | People Ops Workflows | Candidate to Employee conversion | P0 | packages/hrx/src/recruiting/convert-to-employee.js | explicit approval; no CRM Party contamination | PR-08/09 |
| HRX-L4-012 | L4 | People Ops Workflows | Offboarding case | P0 | packages/hrx/src/offboarding.js | last day/access revoke/legal hold | PR-08/09 |
| HRX-L4-014 | L4 | People Ops Workflows | Payroll export review | P0 | packages/hrx/src/payroll-export-service.js | preview -> approve -> export artifact | PR-08/09 |
| HRX-L4-016 | L4 | People Ops Workflows | Retention purge job | P0 | packages/hrx/src/retention-job.js | legal hold blocks purge | PR-08/09 |
| HRX-L4-019 | L4 | People Ops Workflows | Workflow audit coverage | P0 | apps/api/test/hrx/workflow-audit.test.js | every transition writes audit | PR-08/09 |
| HRX-L5-001 | L5 | Portal/API | People UI session context | P0 | apps/web/src/people/hrxApiClient.ts | no hardcoded tenant/scopes | PR-10/11 |
| HRX-L5-009 | L5 | Portal/API | HRX Policy Console | P0 | apps/web/src/admin/hrx/HRXPolicyConsole.tsx | policy versioning + authz | PR-10/11 |
| HRX-L5-010 | L5 | Portal/API | HRX Audit Viewer | P0 | apps/web/src/admin/hrx/HRXAuditViewer.tsx | step-up + audit scope required | PR-10/11 |
| HRX-L5-012 | L5 | Portal/API | Step-up challenge UI | P0 | apps/web/src/people/security/HrxStepUpChallenge.tsx | sensitive panel challenge | PR-10/11 |
| HRX-L5-013 | L5 | Portal/API | Portal e2e suite | P0 | apps/web/e2e/hrx/*.spec.ts | critical flows pass | PR-10/11 |
| HRX-L6-002 | L6 | AI & Analytics | Citation validator | P0 | packages/hrx/src/ai/citation-validator.js | answers without allowed citations fail | PR-12 |
| HRX-L6-004 | L6 | AI & Analytics | Decision guard expansion | P0 | packages/hrx/src/ai/decision-guard.js | hire/fire/pay/eval/discipline final decision blocked | PR-12 |
| HRX-L6-005 | L6 | AI & Analytics | AI review queue SQL | P0 | packages/hrx/src/ai/review-queue-sql.js | review items durable | PR-12 |
| HRX-L6-006 | L6 | AI & Analytics | Prompt/retrieval/output durable audit | P0 | packages/hrx/src/ai/audit.js | AI interactions audit hashed | PR-12 |
| HRX-L6-007 | L6 | AI & Analytics | Permission-aware retrieval integration | P0 | packages/hrx/src/ai/rag.js | evaluateHrxPolicy for each source | PR-12 |
| HRX-L7-001 | L7 | Enterprise Hardening | SSO subject map integration | P0 | packages/authz/src/sso-subject-map.js | User subject -> tenant/actor only | PR-13/14 |
| HRX-L7-003 | L7 | Enterprise Hardening | MFA/step-up evidence store | P0 | packages/authz/src/hrx-step-up-session.js | fresh MFA token tracked | PR-13/14 |
| HRX-L7-004 | L7 | Enterprise Hardening | Tenant isolation e2e | P0 | apps/api/test/hrx/tenant-isolation.test.js | cross-tenant all HRX routes denied | PR-13/14 |
| HRX-L7-007 | L7 | Enterprise Hardening | Compliance report | P0 | packages/hrx/src/compliance-report.js | access/change/retention report | PR-13/14 |
| HRX-L7-008 | L7 | Enterprise Hardening | Retention/purge execution | P0 | packages/hrx/src/retention-job.js | due purge executes unless legal hold | PR-13/14 |
| HRX-L7-009 | L7 | Enterprise Hardening | Backup/restore smoke | P0 | scripts/hrx-backup-restore-smoke.mjs | restore hash/count match | PR-13/14 |
| HRX-L7-012 | L7 | Enterprise Hardening | Security regression | P0 | apps/api/test/hrx/security-regression.test.js | authz/audit/step-up negative | PR-13/14 |
| HRX-L7-013 | L7 | Enterprise Hardening | Secret exposure test | P0 | apps/api/test/hrx/secret-exposure.test.js | no secret in responses/logs | PR-13/14 |
| HRX-L7-016 | L7 | Enterprise Hardening | Enterprise hardening validator | P0 | scripts/validate-hrx-enterprise-readiness.mjs | all P0 gates required | PR-13/14 |
| HRX-L8-001 | L8 | Release & Go/No-Go | Release readiness contract | P0 | contracts/hrx-release-readiness.json | all gates listed | PR-15 |
| HRX-L8-002 | L8 | Release & Go/No-Go | Cutover runbook | P0 | docs/hrx-enterprise/cutover-runbook.md | rollback/owner/decision points | PR-15 |
