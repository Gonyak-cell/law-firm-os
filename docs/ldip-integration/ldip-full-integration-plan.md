# LDIP Full Integration Plan v0.2

작성일: 2026-06-07

상태: planning-only. 이 문서는 구현, 계약 변경, 레저 변경, 마이그레이션, validator 추가를 승인하지 않는다.

원문: `/Users/jws/.codex/attachments/a9f85364-9785-449b-b925-df1d2c93eee1/pasted-text.txt`

원문 식별자:

- 제목: `Legal Data Intelligence Platform 통합 적용계획 및 사양명세서 v0.1`
- 라인 수: 1342
- SHA256: `82b396474b43afd278042e8eb1b8a18a2b0fd2c2ee640e23022622ef2d70be9c`

## 1. 목적

Databricks와 Snowflake의 주요 제품 사상을 참조해 작성된 LDIP 사양을 Law Firm OS에 무리 없이 통합하기 위한 세부 계획이다.

이 계획의 목표는 단순히 "데이터 플랫폼 기능을 추가한다"가 아니라, 첨부 사양의 모든 항목을 Law Firm OS의 matter-first, permission-first, audit-first, AI-governance-first 구조 안에 추적 가능하게 흡수하는 것이다.

여기서 `100% 반영`은 모든 요구사항을 즉시 구현한다는 뜻이 아니다. 모든 원문 섹션, 기능, 데이터 모델, 정책, UI, API, 테스트, 위험 항목을 다음 중 하나로 명시 분류한다는 뜻이다.

- 구현
- 기존 기능에 매핑
- 수정 후 수용
- 후순위 보류
- 명시적 제외

각 분류에는 RP anchor, 검증 방법, Hermes/local evidence, Claude review 상태, 보류 또는 제외 사유가 붙어야 한다.

## 2. 통합 원칙

LDIP는 Law Firm OS 바깥의 별도 제품이 아니다. Law Firm OS 내부의 legal data intelligence capability로 흡수한다.

핵심 원칙:

- Matter-first: LDIP의 catalog, document intelligence, search, agent run, clean room 객체는 가능한 한 matter 또는 pre-matter 객체에 귀속된다.
- Permission-first: 모든 검색, 분석, agent, tool call은 RBAC, ABAC, label, matter policy, tool policy의 교집합 권한으로 제한한다.
- Audit-first: document access, search, tool call, agent output, clean room query, external share decision은 감사 이벤트로 남긴다.
- Version-grounded AI: AI 산출물은 document_id, version_id, page, clause, evidence link에 근거해야 한다.
- Human review: 법률 판단, 외부 공유, 최종 보고서, 권한 상승은 사람 검토를 통과해야 한다.
- Vendor-neutral: Databricks와 Snowflake는 참조 모델이다. Lakehouse, catalog, clean room, warehouse, AI function 개념을 차용하되 특정 vendor lock-in을 기본값으로 삼지 않는다.
- Current-development-safe: 현재 Law Firm OS 본개발과 병렬 진행 가능한 범위는 문서화, 요구사항 추출, gap 분석까지다. 계약, control-plane, ledger, package script, source code 변경은 CP00 복구와 소유권 확인 뒤에만 진행한다.

## 3. 명시적 비목표

이 문서는 다음을 하지 않는다.

- CP00/control-plane 관련 현재 pending diff 수정
- `contracts/`, `packages/`, `scripts/`, root validator script 변경
- `weighted-implementation-ledger` 또는 RP microphase ledger 변경
- DB migration 작성
- 새 npm script 추가
- Databricks 또는 Snowflake 도입 확정
- LDIP 기능의 production_ready 선언

## 4. 병렬 개발 운영 경계

현재 Law Firm OS 본개발이 진행 중인 상태에서도 LDIP 통합 준비는 병렬로 가능하다. 단, 병렬로 가능한 작업과 금지되는 작업을 분리한다.

병렬 가능:

- 첨부 사양 원문 freeze
- 섹션 인덱스 작성
- 요구사항 family 설계
- RP anchor 초안 작성
- gap 분석 문서화
- Claude review packet 초안 작성
- 통합 순서와 closeout 조건 정의

병렬 금지:

- CP00/control-plane 파일 수정
- 공통 contract 또는 product constitution 변경
- RP ledger 또는 weighted ledger 변경
- validator script 추가/수정
- package.json script 변경
- source code, schema, migration 변경
- closeout 완료 또는 production_ready 주장

구현 전 필수 조건:

- CP00 복구 완료
- 현재 pending session의 소유 파일과 LDIP 작업 파일 분리 확인
- `git status --short` 기준 LDIP 작업 범위가 명확해야 함
- control-plane 관련 validator가 녹색이어야 함
- LDIP 요구사항 ledger와 mapping plan에 대한 read-only Claude review 1회 완료

## 5. Phase 0: CP00 복구

CP00 복구는 LDIP 구현의 선행 조건이다. LDIP는 data, AI, permission, audit, clean room을 넓게 건드리므로 control-plane 신뢰성이 흔들린 상태에서 구현으로 들어가면 원인 분리가 어렵다.

범위:

- 현재 CP00/control-plane pending diff의 소유권 확인
- 실패 중인 control-plane validator 또는 test가 있다면 CP00 세션에서 복구
- CP00 관련 계약, fixture, policy, service, validators, test, validation script의 일관성 회복
- CP00 closeout pack 또는 handoff 문서 최신화

완료 기준:

- CP00 관련 local validator 통과
- CP00 관련 test 통과
- CP00 closeout evidence 갱신
- CP00 Claude review 또는 기존 Claude review adjudication 완료
- LDIP 작업이 CP00 파일을 수정하지 않았다는 diff 확인

LDIP 문서화는 Phase 0과 병렬 가능하지만, LDIP 구현은 Phase 0 완료 전 금지한다.

## 6. Phase 1: 원문 동결 및 섹션 인덱스

목표는 첨부 사양의 내용이 구현 중에 흐려지지 않도록 원문을 고정하고, 이후 모든 요구사항에 출처를 붙이는 것이다.

작업:

- 원문 파일 경로, SHA256, 라인 수 기록
- 23개 상위 섹션 index 작성
- 각 섹션의 하위 요구사항을 requirement candidate로 분해
- Databricks/Snowflake 명칭은 `reference design`으로 태깅
- Law Firm OS 내부 명칭은 `LDIP` 또는 `Legal Data Intelligence`로 통일

산출물:

- `docs/ldip-integration/ldip-source-index.md`
- `docs/ldip-integration/ldip-requirement-candidates.md`

검증:

- 원문 SHA256 일치
- 23개 섹션 누락 없음
- 각 requirement candidate에 source section id 포함

Claude review:

- C-LDIP-01: 원문 인덱스와 후보 요구사항 누락 검토

## 7. Phase 2: 100% 요구사항 추출

원문의 모든 기능과 제약을 requirement family로 분류한다.

요구사항 family:

- `LDIP-GOAL`: 제품 목표, 비목표, anti-pattern
- `LDIP-ARCH`: 7-layer architecture, vendor-neutral architecture
- `LDIP-SRC`: source layer, legal system connectors, external source boundaries
- `LDIP-CAT`: Legal Catalog, metadata, lineage, ownership, quality
- `LDIP-DOC`: document intelligence, version, chunk, clause, defined term, cross reference
- `LDIP-ING`: ingestion pipeline, classification, OCR, extraction, failure handling
- `LDIP-SEC`: RBAC, ABAC, labels, matter policy, agent/tool permission intersection
- `LDIP-SRCH`: search, legal analyst, semantic query, structured filters
- `LDIP-AGT`: agent runtime and 12 named legal agents
- `LDIP-TOOL`: tool registry T0-T7, tool call logging, approval workflow
- `LDIP-CLEAN`: clean room, data offering, query templates, policy enforcement
- `LDIP-UI`: matter dashboard, document viewer, review workspace, DD app, agent control center
- `LDIP-NFR`: security, performance, availability, scalability
- `LDIP-DQ`: data quality and AI quality metrics
- `LDIP-COMP`: attorney secrecy, personal information, e-document retention, jurisdictional compliance
- `LDIP-API`: APIs, events, integration contracts
- `LDIP-OUT`: output format, evidence report, structured deliverables
- `LDIP-TEST`: unit, integration, security, AI quality, regression tests
- `LDIP-RISK`: risk register and mitigations
- `LDIP-PRIO`: build priority and release order

필수 coverage matrix:

| 원문 섹션 | 반드시 추출할 항목 | Requirement family |
| --- | --- | --- |
| 1. 설계 결론 | LDIP를 단순 AI 문서작성기가 아닌 governed legal data platform으로 정의 | `LDIP-GOAL`, `LDIP-ARCH` |
| 2. 명칭/목표/하지 말아야 할 것 | product naming, core goals, anti-patterns | `LDIP-GOAL` |
| 3. 벤더 벤치마킹/7계층 | Databricks/Snowflake 참조점, source/ingestion/catalog/storage/AI/app/governance layer | `LDIP-ARCH` |
| 4. Phase 0-7 | 원문 단계계획과 Law Firm OS 단계계획 매핑 | `LDIP-PRIO` |
| 5. 시스템 범위/제외 | included/excluded scope, no unsafe auto-lawyering | `LDIP-GOAL`, `LDIP-COMP` |
| 6. 데이터 모델 | Client, Matter, Document, Version, Chunk, Clause, Issue, AgentRun 등 전체 entity/table field | `LDIP-CAT`, `LDIP-DOC` |
| 7. 보안/권한 | RBAC, ABAC, label, agent permission equation, read-only default | `LDIP-SEC` |
| 8. 수집/문서지능 | 12-step ingestion, document type table, version rules, failure handling | `LDIP-ING`, `LDIP-DOC` |
| 9. 검색/Legal Analyst | keyword, semantic, filter, clause, authority, email, negative search, structured query | `LDIP-SRCH` |
| 10. Agent | agent principles and 12 named agents | `LDIP-AGT` |
| 11. Tool registry | T0-T7 tools, tool call logs, approval workflow | `LDIP-TOOL` |
| 12. Clean Room | room types, shared objects, policies, query templates, data offering | `LDIP-CLEAN` |
| 13. UI | Matter Dashboard, Document Viewer, Contract Review, DD App, Agent Control Center | `LDIP-UI` |
| 14. NFR | SEC/PERF/AVAIL/DQ/AIQ | `LDIP-NFR`, `LDIP-DQ` |
| 15. Compliance | attorney secret, personal data, e-document retention | `LDIP-COMP` |
| 16. Architecture/vendor mapping | vendor-neutral target plus Databricks/Snowflake mapping | `LDIP-ARCH` |
| 17. API/events | external APIs, internal events, event naming | `LDIP-API` |
| 18. Output format | report and evidence output contracts | `LDIP-OUT` |
| 19. Metrics | data quality, search quality, AI quality, cost/audit metrics | `LDIP-DQ` |
| 20. Tests | test strategy and acceptance tests | `LDIP-TEST` |
| 21. Build priority | MVP and later release ordering | `LDIP-PRIO` |
| 22. Risks | privacy, hallucination, cost, latency, permission leakage, vendor lock-in | `LDIP-RISK` |
| 23. Final recommendation | final adoption recommendation and integration posture | `LDIP-GOAL`, `LDIP-PRIO` |

완료 기준:

- 모든 source section이 하나 이상의 requirement family에 연결
- 모든 named table/entity가 ledger item으로 존재
- 12개 agent가 각각 독립 requirement로 존재
- T0-T7 tool이 각각 독립 requirement로 존재
- clean room room type, policy, template, data offering이 각각 독립 requirement로 존재
- NFR, compliance, API/events, tests, risk, priority가 누락 없이 존재

Claude review:

- C-LDIP-02: requirement extraction completeness review

## 8. Phase 3: Law Firm OS RP anchor mapping

요구사항을 기존 Law Firm OS release program에 붙인다. 새 RP를 만들기 전에 기존 RP로 수용 가능한지 먼저 판단한다.

기본 mapping:

| LDIP family | Primary RP anchor | Secondary RP anchor |
| --- | --- | --- |
| `LDIP-GOAL` | RP00 Product Constitution / AI Control Plane | RP29 Commercial Readiness |
| `LDIP-ARCH` | RP00, RP26 Enterprise SaaS Hardening | RP27 Platform Extensibility |
| `LDIP-SRC` | RP01 Core Domain, RP04 Master Data, RP05 Matter Core | RP08 Email/Office, RP22/RP23 External Integrations |
| `LDIP-CAT` | RP01, RP04, RP05, RP06 DMS Core | RP07 Search/OCR, RP16 Governance/DLP/Retention |
| `LDIP-DOC` | RP06 DMS Core | RP07 Search/OCR, RP08 Email/Office |
| `LDIP-ING` | RP06 DMS Core, RP07 Search/OCR | RP08 Email/Office, RP25 Migration Platform |
| `LDIP-SEC` | RP02 Permission Kernel | RP03 Audit, RP16 Governance/DLP/Retention |
| `LDIP-SRCH` | RP07 Search/OCR | RP15 Firm Analytics, RP17 AI Governance |
| `LDIP-AGT` | RP17 AI Governance | RP18 AI Legal Workflows, RP28 Marketplace/Custom AI Apps |
| `LDIP-TOOL` | RP17 AI Governance, RP18 AI Legal Workflows | RP27 Platform Extensibility, RP28 Marketplace/Custom AI Apps |
| `LDIP-CLEAN` | RP20 Data Room/VDR | RP16 Governance/DLP/Retention, RP26 Enterprise SaaS Hardening |
| `LDIP-UI` | RP21 Admin Console, RP06 DMS Core | RP07 Search/OCR, RP18 AI Legal Workflows, RP20 Data Room/VDR |
| `LDIP-NFR` | RP26 Enterprise SaaS Hardening | RP29 Commercial Readiness |
| `LDIP-DQ` | RP15 Firm Analytics | RP17 AI Governance, RP26 Enterprise SaaS Hardening |
| `LDIP-COMP` | RP16 Governance/DLP/Retention | RP24 Korean Legal Depth |
| `LDIP-API` | RP22/RP23 External Integrations | RP27 Platform Extensibility |
| `LDIP-OUT` | RP18 AI Legal Workflows | RP06 DMS Core, RP20 Data Room/VDR |
| `LDIP-TEST` | RP00 Control Plane | 각 기능 RP |
| `LDIP-RISK` | RP26 Enterprise SaaS Hardening | RP29 Commercial Readiness |
| `LDIP-PRIO` | RP00 Control Plane | 전체 roadmap |

완료 기준:

- requirement마다 primary RP anchor 1개 이상 존재
- cross-cutting requirement에는 secondary RP anchor 존재
- 기존 RP에 없는 requirement는 `new capability candidate`로 분리
- RP 범위 충돌은 구현 전 adjudication 필요

Claude review:

- C-LDIP-03: RP mapping and boundary drift review

## 9. Phase 4: Gap 분석 및 수용 판정

각 요구사항을 현재 Law Firm OS 기준으로 판정한다.

판정값:

- `covered`: 현재 아키텍처/계약/문서/구현에 이미 반영
- `weakly_covered`: 방향은 있으나 필드, policy, test, evidence가 부족
- `new_required`: 신규 구현 필요
- `adapt_required`: 원문을 Law Firm OS 원칙에 맞게 수정 후 수용
- `defer`: 후순위로 보류하되 누락하지 않음
- `reject`: 명시적 제외, 사유 필수

현재 예상 gap:

- Legal Catalog의 lineage, ownership, data quality contract가 아직 충분히 구체화되어 있지 않음
- document chunk, clause, defined term, cross-reference의 field-level contract 필요
- Legal Analyst structured query와 negative search의 permission trim test 필요
- 12개 named agent별 input/output/evidence/human-review contract 필요
- T0-T7 tool registry와 tool call approval workflow의 formal contract 필요
- Clean Room의 shared object, query template, data offering policy가 RP20/VDR과 별도로 정교화 필요
- AIQ, DQ, cost/audit metrics가 measurable acceptance test로 내려와야 함
- API/events 목록이 event schema와 idempotency rule로 확장되어야 함

완료 기준:

- 모든 requirement에 판정값 존재
- `weakly_covered`, `new_required`, `adapt_required`는 implementation slice로 연결
- `defer`, `reject`는 사유와 재검토 조건 존재

Claude review:

- C-LDIP-04: gap 판정의 과소평가/누락 검토

## 10. Phase 5: Overlay contract 설계

Phase 5부터는 구현 전 단계지만, 아직 코드 변경이 아니라 contract 설계다. 이 단계는 CP00 복구 완료 후 시작한다.

계획된 산출물:

- `contracts/ldip-integration-contract.json`
- `contracts/legal-data-catalog-contract.json`
- `contracts/legal-agent-tool-contract.json`
- `contracts/legal-clean-room-contract.json`
- `docs/ldip-integration/ldip-requirement-ledger.md`
- `docs/ldip-integration/ldip-requirement-ledger.json`
- `scripts/validate-ldip-requirements.mjs`

필수 contract invariant:

- catalog object는 matter/pre-matter/client/document/user/role 중 하나 이상의 lawful owner를 가져야 한다.
- document intelligence output은 version-grounded evidence 없이 final로 승격될 수 없다.
- agent permission은 `user permission ∩ agent permission ∩ tool permission ∩ matter policy ∩ label policy`로 평가한다.
- tool call은 allowlisted tool registry entry와 audit event 없이는 실행 완료 처리될 수 없다.
- clean room query는 shared object policy와 output policy를 통과해야 한다.
- 외부 공유 가능한 output은 human approval과 external share safety check가 필요하다.
- AI output은 evidence link와 confidence/limitation metadata를 가져야 한다.

완료 기준:

- contract schema validation 통과
- requirement ledger 100% source coverage
- existing product contract와 충돌 없음
- CP00/RP00 validator와 충돌 없음

Claude review:

- C-LDIP-05: contract/invariant review

## 11. Phase 6: 구현 slice 계획

구현은 작고 검증 가능한 slice로 진행한다. 각 slice는 plan -> implementation -> local/Hermes validation -> Claude review -> adjudication -> closeout evidence -> final gates 순서를 따른다.

| Slice | 목표 | 주요 RP | 선행 조건 |
| --- | --- | --- | --- |
| LDIP-CAT-001 | Legal Catalog base entity and metadata contract | RP01/RP04/RP05/RP06 | Phase 5 |
| LDIP-DOC-001 | document version/chunk/clause/defined term evidence model | RP06/RP07 | LDIP-CAT-001 |
| LDIP-ING-001 | ingestion pipeline contract and failure taxonomy | RP06/RP07/RP25 | LDIP-DOC-001 |
| LDIP-SEC-001 | LDIP permission intersection evaluator tests | RP02/RP03/RP16 | LDIP-CAT-001 |
| LDIP-SRCH-001 | governed search and Legal Analyst query contract | RP07/RP15/RP17 | LDIP-SEC-001 |
| LDIP-AGT-001 | agent runtime input/output/evidence envelope | RP17/RP18 | LDIP-SEC-001 |
| LDIP-TOOL-001 | T0-T7 tool registry and tool call audit contract | RP17/RP18/RP27 | LDIP-AGT-001 |
| LDIP-CLEAN-001 | clean room room/object/policy/template contract | RP20/RP16/RP26 | LDIP-SEC-001 |
| LDIP-DQ-001 | DQ/AIQ/cost/audit metrics and tests | RP15/RP17/RP26 | relevant feature slices |
| LDIP-API-001 | API/events schema and idempotency rules | RP22/RP23/RP27 | relevant feature slices |
| LDIP-UI-001 | UI shell mapping for catalog/search/agent/clean room | RP21/RP06/RP18/RP20 | backend contracts |

각 slice 완료 조건:

- requirement ids linked
- source section ids linked
- RP anchor linked
- unit/integration/security/AI quality tests where applicable
- Hermes/local validation evidence
- one read-only Claude review
- adjudication note for every Claude finding
- closeout evidence updated

## 12. Phase 7: 최종 통합 게이트

LDIP 통합 완료는 다음을 모두 만족해야 한다.

Source coverage:

- 23개 원문 섹션 모두 `implemented`, `covered`, `deferred`, `rejected` 중 하나로 판정
- deferred/rejected는 사유와 재검토 조건 존재
- 원문의 named agents 12개와 T0-T7 tool이 모두 추적 가능
- 원문 data model/table field가 모두 추적 가능
- NFR, compliance, API/events, UI, tests, risks, priority가 모두 추적 가능

Law Firm OS coverage:

- Matter-first invariant 유지
- permission kernel과 충돌 없음
- audit kernel과 충돌 없음
- DMS version/evidence model과 충돌 없음
- AI governance human review/evidence rule 유지
- clean room과 VDR/data room 경계 명확
- vendor-neutral architecture 유지

Validation:

- `npm run validate`
- `npm test`
- `npm run spec:requirements:validate`
- `npm run weighted:validate`
- `npm run fullplan:validate`
- LDIP-specific validator
- affected RP validator
- affected closeout pack validator

Review:

- final read-only Claude review complete
- no unresolved P0/P1 findings
- P2 findings fixed or explicitly deferred with rationale
- partial, timed-out, or self-approved review does not count

Closeout:

- implementation ledger updated
- closeout evidence updated
- Claude review packet and result archived
- adjudication archived
- final diff review confirms no unrelated CP00/control-plane churn

## 13. Claude review 계획

Claude review는 승인권자가 아니라 독립 read-only reviewer로 사용한다. 최종 책임은 Law Firm OS closeout gate에 있다.

Review packets:

- C-LDIP-01: source index completeness
- C-LDIP-02: requirement extraction completeness
- C-LDIP-03: RP mapping and product-boundary drift
- C-LDIP-04: gap analysis and risk underestimation
- C-LDIP-05: contract/invariant review
- C-LDIP-06+: per-slice implementation review
- C-LDIP-FINAL: full integration closeout review

각 packet 필수 포함:

- 원문 경로와 SHA256
- source section coverage table
- requirement ledger diff
- RP mapping diff
- affected files list
- local validator output
- test output
- open risk list
- adjudication template

수용 기준:

- review command/result가 보존되어야 함
- Claude findings는 severity로 분류
- P0/P1은 완료 전 반드시 해결
- P2는 해결하거나 명시 defer
- P3/nit은 closeout blocker가 아님

## 14. 구현 전 승인 체크리스트

다음 조건이 모두 만족되기 전에는 구현으로 넘어가지 않는다.

- [ ] CP00 복구 완료
- [ ] LDIP source index 작성
- [ ] LDIP requirement ledger 작성
- [ ] 23개 원문 섹션 100% coverage 확인
- [ ] data model/table field coverage 확인
- [ ] 12개 agent coverage 확인
- [ ] T0-T7 tool coverage 확인
- [ ] clean room requirement coverage 확인
- [ ] NFR/compliance/API/events/test/risk/priority coverage 확인
- [ ] RP anchor mapping 완료
- [ ] gap 판정 완료
- [ ] Claude C-LDIP-01~04 완료 및 adjudication
- [ ] 사용자의 구현 착수 승인

## 15. 다음 허용 작업

이 문서 이후 바로 허용되는 작업은 구현이 아니라 계획 산출물 확장이다.

다음 단계 후보:

1. `ldip-source-index.md` 작성
2. `ldip-requirement-candidates.md` 작성
3. `ldip-requirement-ledger` 초안 작성
4. C-LDIP-01 Claude review packet 작성

계약, 레저, validator, source code 변경은 위 체크리스트와 사용자 승인 뒤에만 진행한다.

## 16. 변경 이력

- v0.1: 첨부 사양 원문
- v0.2: Law Firm OS 병렬 개발 전제, CP00 복구 선행 조건, 100% coverage 기준, RP mapping, Claude review 계획, 구현 slice 계획을 명시한 통합 계획 문서화
