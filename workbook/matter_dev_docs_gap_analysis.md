# matter 개발문서 패키지 ↔ Law Firm OS 코드베이스 갭 분석

작성일: 2026-06-11
분석 대상: `workbook/matter_dev_docs/` 00~24번 문서 25개 (통합본·ZIP은 동일 내용 중복으로 제외)
대조 대상: 리포 전체 — `packages/` 12개, `contracts/` JSON, `apps/api`·`apps/web`, `docs/` RP00~RP29 마이크로페이즈 + CP 클로즈아웃 팩 체계
방법: 영역별 5개 분석 트랙(제품정의·아키텍처 / 도메인·보안 / AI·통합 / 업무도메인 / 실행체계)이 문서 정독 + 코드 직접 탐색으로 교차 검증. "코드 없음" 주장은 전부 grep/find 탐색 근거 확보.

---

## 1. 요약 (한 페이지 결론)

**철학은 같고, 좌표계와 범위가 다르다.** 문서 패키지와 코드베이스는 헌법적 원칙 — Matter-first, Audit-first, fail-closed 권한(deny-over-allow), AI 산출물 인간 승인 필수, "Core Object → 권한 → 감사 선행 구축" — 에서 실질적으로 동일하다. 그러나 다음 **5개 구조 축에서 명시적 결정 없이는 통합 불가능한 충돌**이 있다.

| # | 축 | 문서 패키지 | 코드베이스 |
|---|---|---|---|
| 1 | **제품 성격** | 자체 로펌 **내부용** Legal & People Work OS (Tenant 개념 없음) | **멀티테넌트 enterprise SaaS** (`tenant_isolated` 원칙, cross-tenant deny 구현, RP26/28/29 상용화 프로그램) |
| 2 | **제품명** | matter (전체 통일) | Law Firm OS (계약·패키지) + "matter by AMIC" (UI 브랜드만) |
| 3 | **실행 거버넌스** | TUW 204개 / L0~L13 피라미드 / R0~R14 릴리스 / P0~P14 필러 / Planner–Executor–Verifier–Governor | RP00~RP29 / 54,355 weighted unit / CP 팩 큐(live CP00-318, 계획 571팩) / contract JSON + validator + Claude 리뷰 게이트 |
| 4 | **문서 저장 아키텍처** | 원본 = SharePoint/OneDrive, DB는 `file_ref`+메타데이터만 (Microsoft-native) | 스토리지 중립 `storage_pointer_ref` + S3 계열 object storage 권장 (스펙 카탈로그 NARR-013) |
| 5 | **기능 범위** | 문서에만: M365/Outlook Add-in, Obsidian Vault, HR, Portal 일반화, Practice Packs / 코드에만: CRM, intake-conflict, partner settlement, 한국법 심화, migration, marketplace | 양쪽 범위가 서로를 포함하지 않음 |

**구현 현황 한 줄 요약**: 문서가 요구하는 15개 필러 중 코드로 실재하는 것은 하부 인프라 4개(코어 도메인, 권한, 감사, DMS 모델 — 일부는 문서 요구보다 정교함)뿐이고, **M365/Outlook·Obsidian·HR·Portal·Practice Pack·Drafting은 구현 0%** 다(Obsidian은 RP 계획에도 없고, HR은 RP 프로그램 미배정 상태).

**가장 시급한 단일 결정**: User/Employee 분리. 문서(15번 §R1, 16번)는 "스키마는 R1~R2에 선반영, 소급 곤란"을 요구하는데 코어 도메인은 이미 Employee 없이 닫혔고, RP11 TimeEntry가 `employee_id`를 키로 쓰므로 billing 착수 전에 결정해야 한다.

---

## 2. 거버넌스 좌표계 비교

### 2.1 매핑표

| 문서 체계 | 리포 체계 | 대응 관계 |
|---|---|---|
| L0~L13 피라미드 (L11 TUW, L12 Verification Case, L13 Ledger) | RP(program) → P(phase) → M(micro) → S(sub-unit) 4단 + CP 팩 | 기능적 등가, 어휘·깊이 비호환 |
| TUW 204개 시드 (`MAT-OUT-EML-FILE-TUW-001`) | weighted unit 54,355개 (`RP09.P08.M08.S02`) → CP 팩(1~150 unit) | 1 TUW ≈ 수십~수백 unit 추정, 환산 규칙 없음. `MAT-…-TUW-…` 패턴은 리포 전체 grep 0건 |
| Risk Low/Medium/High/Critical (TUW당, 모델 라우팅 목적) | Risk A/B/C (팩당, 사이징·검토강도 목적, `docs/closeout-pack-plan/risk-classification-rules.md`) | 정의 기준·용도가 달라 단순 치환 불가 |
| R0~R14 릴리스 15단계 | RP00~RP29 프로그램 30개 + `docs/roadmap.md` Phase 0~7 | 아래 2.2 |
| Verification Case 카탈로그 (VC-/RG-/CG- ID) | contract JSON 15개 + `scripts/validate-*.mjs` 27개 + `scripts/test/` | 기능 동치, ID 체계 리포에 부재 |
| Planner–Executor–Verifier–Governor 4역할 + 도메인 agent 4종 | Planner≈팩 생성 스크립트, Executor≈Codex, Verifier≈Claude read-only 리뷰(`artifacts/closeout-pack-claude-review/`), Governor≈validator+사람(암묵적) | "self-approval 금지"는 구조적으로 충족. 도메인 agent(Outlook Filing/Legal QC/HR Assistant/Vault Sync)는 대응물 없음 |
| Ledger 5종 (Decision/Execution/Learning/Audit/Model Routing) | 진도 ledger(`docs/weighted-implementation-ledger.json` 등) + 제품 감사 ledger(`packages/audit`) | Decision/Learning/Model Routing ledger는 명칭 grep 0건 |
| 완료 기준: Verification Contract + Completion Gate 8조건 | production_ready 게이트: manifest + 전 unit status + `npm test` 증빙 + Claude review receipt(`closeout_eligible=true`) | 아래 5.4의 게이트 충돌 참조 |

### 2.2 릴리스 좌표 대응 (R ↔ RP)

| 문서 R | 리포 RP | 비고 |
|---|---|---|
| R0 Development OS | RP00 (부분) | RP00은 AI control plane 중심 |
| R1 Matter Core | RP01 + RP04 + RP05 | **R1의 User/Employee 분리는 미반영** |
| R2 Security & Permission | RP02 + RP03 | 구현 완료 영역 |
| R3 Microsoft DMS | RP06 + RP07 + RP08(부분) | M365 바인딩 없음 |
| R4 Outlook Filing | RP08(부분) | Add-in 전용 RP 없음 |
| R5 Core Workflow | **대응 RP 없음** | Work/Review Queue 계획 공백 |
| R6 Issue & Practice Core | **대응 RP 없음** (RP18/RP24 인접) | |
| R7 Portal Platform | RP19 + RP20 | Client만. Employee/Candidate portal은 계획에도 없음 |
| R8 Obsidian Vault | **대응 RP 없음** | 계획 문서·spec ledger에도 0건 |
| R9 AI & Automation | RP17 + RP18 | |
| R10 Drafting & Clause | **대응 RP 없음** (RP18/RP24 분산) | |
| R11 Billing & ERP | RP11~RP15 | 리포 계획이 문서보다 넓음 |
| R12 Admin & Governance | RP16 + RP21 | |
| R13 Enterprise Hardening | RP26 | 단 RP26은 SaaS 상용화 강화로 목적 다름 |
| R14 People & HR | **대응 RP 없음** | HRX 901 unit은 "embedded scope, weighted ledger 미반영" 상태 |
| — | RP09(CRM)·RP10(intake-conflict)·RP13(payments/AR)·RP14(settlement)·RP15(analytics)·RP20(VDR)·RP22~25·RP27~29 | **문서 R 체계에 자리 없음** (현재 라이브 큐가 RP09 CRM 진행 중) |

---

## 3. 도메인 모델 비교

### 3.1 객체 매핑 (문서 05 ↔ 코드)

| 문서 객체 | 코드 대응 | 위치 | 판정 |
|---|---|---|---|
| Tenant | Tenant | `packages/domain/src/entities.js:17` | 부분 (필드 상이) |
| User | User | `packages/domain/src/entities.js:30` | 부분 — `auth_provider`·`linked_employee_id` 없음 |
| **Employee** | **없음** | grep 0건 | **부재** — `ENTITY_KINDS.internal_user`가 최근접 |
| Matter | Matter ×2 | `packages/domain/src/entities.js:185`, `packages/matter/src/model.js:57` | 부분 — 상태 enum 충돌(5.6) |
| Party | Entity/Person/Organization + graph 노드 | `packages/master-data/src/model.js:49-110` | 부분 — `conflict_status`·당사자 역할 없음 |
| Contact | Person + ContactPoint | `packages/master-data/src/model.js:112` | **동명이의** — 코드는 연락수단 값 객체 |
| Document / file_ref | DmsDocument → Version → **FileObject.storage_pointer_ref** (+sha256) | `packages/dms/src/model.js:84-129` | 개념 일치, M365 바인딩 없음. privilege 필드 부재 |
| Email / Attachment | DmsEmailThread 스텁(`reserved_for_rp08`) | `packages/dms/src/model.js:171` | **거의 부재** — graph_message_id 등 Outlook 3대 ID grep 0건 |
| Task | MatterTask | `packages/matter/src/model.js:90` | 양호 (상태 enum 차이) |
| Deadline/Event | MatterCalendarEvent | `packages/matter/src/model.js:103` | 부분 — `legal_consequence`·`reminder_rule` 없음 |
| **Issue (Issue Ledger)** | graph 노드 라벨 + wiki 섹션명만 | `packages/matter/src/registry.js:2686` | **부재** — 독립 객체·16필드·상태기계 없음 |
| Authority | graph 노드 라벨만 (Citation Ledger는 CP00-198 예약) | `packages/matter/src/registry.js:2688` | 부재 |
| Work Product / Time Entry / Billing Record | 없음 (BillingProfile만 구현: `packages/master-data/src/model.js:122`) | — | 부재 |
| Knowledge Artifact / Vault Note | 없음 (MatterWiki는 별개 개념 — 3.2 참조) | — | 부재 |
| AI Output | graph 노드 "AIResult" + `ai_generated` 필드 | `packages/matter/src/registry.js:2690` | 부분 — 독립 엔티티·상태기계 없음 |
| Audit Event | AuditEvent (sha256 해시체인) | `packages/audit/src/events.js`, `append-only-ledger.js` | **문서 초과 달성** |
| HR Document / Leave / Attendance / Candidate / HR Risk | 없음 | grep 0건 | **부재** (16개 HR 객체 전부) |

### 3.2 코드에만 있는 모델 (역갭)

- **멀티테넌시 강제**: 전 엔티티 `tenant_id` 필수, cross-tenant 즉시 deny (`packages/authz/src/evaluate.js:2-4`)
- **Master Data 계층**: ClientGroup, BillingEntity/Profile, Relationship(방향성), identity_key — 문서의 Party/Contact보다 정규화 높음
- **MatterWiki**: 섹션 9종, source_policy, client_visible 리뷰 게이트, snapshot_hash (`packages/matter/src/model.js:126-198`) — 문서엔 Vault Note만 있고 wiki 개념 없음
- **MatterGraph**: 노드 18종·엣지 14종, permission-trimmed traversal, cross-matter similarity 기본 차단
- **감사 고도화**: 해시체인+GENESIS, idempotency, correction event, WORM, purge 5중 게이트 — 문서 06은 "변경불가 저장소 권장" 한 줄
- **4값 권한 결정**: allow/deny 외 `review_required`/`approval_required` — 문서는 2값 모델
- **CRM 객체군**(RP09, 현재 진행 중), 거버넌스 안전 플래그(`synthetic_only`, no-write attestation 등)

### 3.3 권한·감사 비교 (문서 06 ↔ 코드)

- **일치**: fail-closed 평가(`evaluate.js` ↔ permission-kernel-contract `decision_order`), ethical wall 존재, 감사 필수 원칙
- **갭**: HR 민감정보 ACL 영역·마스킹, privilege(비닉특권) 분류(코드 confidentiality는 `public/internal/confidential/restricted` 4값에 privilege 없음), 사전정의 Role 12종, Issue/Email Filing/Vault/Portal/HR 감사 이벤트, external sharing 실체(SecureLink는 감사 계약에 선언만)
- **구조 차이**: 문서는 ethical wall을 독립 평가 단계 + 4면 차단(검색/링크/AI context/vault export)으로 요구, 코드는 deny rule 속성(`ethical_wall_matter_id`)으로 환원. emergency override는 코드의 `break_glass` 액션이 부분 대응
- **감사 분류 충돌**: 문서 12분류(업무 단위) vs 코드 action_taxonomy 27종(dot-notation) — 필수 필드도 4~5개 vs 공통 24개로 다른 스키마

---

## 4. 영역별 갭 매트릭스 (문서 P0~P14 기준)

판정 등급: **구현** / **부분구현** / **계약·계획만** / **스텁** / **0%**

| 필러 | 판정 | 근거 (코드 경로) |
|---|---|---|
| P0 Development OS | **등가 체계 존재(어휘 상이)** | CP/RP/validator/Claude 리뷰 (`docs/closeout-pack-plan/`, `scripts/validate-*.mjs`, `artifacts/closeout-pack-claude-review/`) — TUW/VC/CG ID는 0건 |
| P1 Matter Core | **부분구현** | `packages/matter`(+graph/wiki), `packages/master-data`, `packages/domain` — Issue·Authority·Party conflict_status·Employee 부재 |
| P2 Identity/Permission/Security | **구현(문서 초과 영역 있음)** | `packages/authz`(fail-closed+4값), `packages/audit`(해시체인) — HR 민감분류·privilege·Role 12종 부재 |
| P3 Microsoft DMS & Email | **부분구현(합성)+디스크립터** | `packages/dms`(합성 fixture, `writes_object_storage:false`), `packages/email-dms`(CP00-272~298 디스크립터 전용, `descriptor_only:true`) — SharePoint/OneDrive/Graph 바인딩 grep 0건 |
| P4 Workflow | **부분구현** | MatterTask/Checklist/CalendarEvent (`packages/matter/src/model.js`) — Work Queue/Review Queue 없음, 전용 RP 없음 |
| P5 Issue & Legal Execution (Practice Packs) | **0%** | graph 노드 라벨만. RFI/DD/CP·Closing Checklist/Fact·Evidence Ledger/Argument Map 전부 grep 0건. RP24(한국법)·RP18(AI)이 인접 계획 |
| P6 Portal | **0% (계획 일부)** | `packages/client-portal` 미존재. RP19(Client)·RP20(VDR) 계획만. Employee/Candidate/External Expert portal은 계획에도 없음 |
| P7 Knowledge & Obsidian Vault | **0% (계획에도 없음)** | obsidian/wikilink/frontmatter grep 0건, `docs/` 및 spec-requirement-ledger에도 0건 — 30개 RP 체계 밖 완전 신규 요구 |
| P8 AI & Automation | **메타데이터만** | `packages/control-plane`의 AIControlRule은 **개발 거버넌스용**(5.5 참조), `packages/ai-governance`는 README 스텁. Gateway/RAG/Guardrail/Review Queue/라우팅 grep 0건. RP17/18 계획 |
| P9 Drafting & Clause | **0% (선언 1단어)** | product-contract에 "Clause" 소유 선언만, dms 계약 내 clause 0건. RP18 ClauseCandidate·RP24 KoreanClause로 분산 계획 |
| P10 Billing & ERP | **스텁+계획** | `packages/billing` README 187바이트. RP11~15 계획은 충실(문서보다 넓음: payments/AR/settlement). 단 **Activity Signal·Matter Budget·Billing Leakage·HR Capacity는 계획에도 0건** |
| P11 Admin & Governance | **목업 수준** | `apps/web` AdminSurface(분석형 UI). RP16/RP21 계획 |
| P12 Integration & Sync | **0%** | RP22/23 계획만 |
| P13 Enterprise Hardening | **계약만** | `contracts/critical-rp-saas-hardening-contract.json` — 단 목적이 문서(내부 보안)와 다름(SaaS 상용화) |
| P14 People & HR | **0% (가장 큰 공백)** | employee/payroll/attendance/recruitment grep 0건. RP 프로그램 미배정, HRX 901 unit은 weighted ledger 소스에도 미반영 (`docs/closeout-pack-plan/risk-classification-rules.md` 명시) |

**UI(문서 21)**: 14개 화면 중 대응물은 AdminSurface 1개 수준. 현 `apps/web`은 Amplitude 패리티 분석형 UI로 문서의 사건 중심 화면군(Matter Home 11영역, Work Queue, Issue Ledger…)과 **방향 자체가 다름**. 공유 가능 자산은 Shell/primitives 수준.

**API(문서 22)**: 문서는 write 중심 16개 API + 이벤트 15종. 현 `apps/api/src/server.js`는 **GET 전용 4라우트**(synthetic-only, fail-closed gate). 방향 충돌은 아니나 write API의 선결 조건인 audit writer 런타임이 API 레이어에 없음.

---

## 5. 충돌·리스크 (병행 시 부딪히는 지점)

1. **내부용 vs 멀티테넌트 SaaS (최대 충돌)** — 문서 00 §1 "자체 로펌 내부용" 확정 전제 vs 코드의 `tenant_isolated` 원칙·Tenant 객체·cross-tenant deny·RP26/28/29 상용화 프로그램·메모리의 "enterprise SaaS-grade" 표준 목표. 문서를 그대로 채택하면 표준 목표와 정면 충돌.
2. **제품명** — 문서 "matter" 통일 vs 리포 "Law Firm OS"(계약·패키지) + "matter by AMIC"(UI 브랜드). 현재 리포는 이중 명명 상태.
3. **실행 체계 이중화** — 문서 24 "모든 PR은 TUW ID" vs 리포 커밋 규약 `Close CP00-xxx`. TUW 백로그를 그대로 실행하면 CP 거버넌스와 이중 트래킹.
4. **게이트 정의 긴장** — 문서 19 CG-002~006은 런타임 테스트 통과를 요구하나 현 CP 게이트는 descriptor-only 산출물도 production_ready로 닫음(예: cp00-318 manifest `descriptor_only:true`). 문서 기준을 소급 적용하면 기 닫힌 팩 다수가 미충족이 되고, 반대 방향 완화는 "never weaken production_ready gates" 지침과 충돌 — **게이트 약화 없이 "descriptor 게이트와 런타임 게이트는 별개 레이어"로 명시 분리하는 결정 필요**.
5. **"AI control"의 의미 충돌** — control-plane의 AIControlRule(allowed: draft_code 등, forbidden: bypass_claude_review 등)은 **제품을 만드는 AI(Codex/Claude)** 통제용. 문서 07의 AI Gateway(요약·후보생성 허용, 급여산정 금지)는 **제품 런타임 AI** 통제용. 같은 이름의 다른 레이어 — 기존 모델 재사용 시 의미 오염.
6. **상태·ID·분류 enum 비호환** — Matter 상태 3중 불일치(문서 11단계 vs registry 7단계 vs entities 5단계 — 코드 내부도 불일치), ID 체계(`M-2026-0001` vs snake_case+구조형 stable ID), 기밀분류(Highly Confidential/Privilege/HR Restricted vs public/internal/confidential/restricted), Task 상태(candidate/in_review/archived 부재).
7. **스토리지 결정 분기** — 문서 08/09 "원본=SharePoint/OneDrive" vs 코드 스토리지 중립 포인터+S3 권장. RP06/RP08 런타임 착수 전 결정 필요. 또한 email-dms 계약은 `dispatches_filing_runtime:false`를 production_ready **증거로 고정**한 no-write 선언 체계라, filing 런타임은 기존 계약 확장이 아니라 별도 런타임 계약 신설이 필요.
8. **User/Employee 분리 시점 경과** — 문서 15·16은 R1~R2 선반영(소급 곤란)을 요구하나 코어 도메인은 Employee 없이 이미 닫힘. RP11 TimeEntry가 `employee_id` 키라 billing 전에 결정 불가피.
9. **Portal 일반화 원칙 vs RP19 단독 설계** — 문서 10 "Client Portal만 별도 구현하지 말 것" vs RP19의 client-portal 단독 패키지 계획.
10. **UI 거버넌스 정반대** — 문서는 UI 화면을 릴리스 게이트 1급 산출물로, 리포는 UI를 CP 거버넌스 **밖** non-CP 트랙으로 격리(`docs/ui-workstream-conventions.md`).
11. **동명이의 다수** — Activity(문서 14 time-capture 신호 vs CRM 영업활동), Lead(Matter 상태값 vs CRM 객체), Contact(역할 객체 vs 연락수단 값), Loop(개발방법론 5종 vs `docs/loop-system-integration/`의 AI 오케스트레이션), P-기호(문서 필러 P0~P14 vs contract priority P0~P2 vs 구현계획 P0.x vs unit ID phase 세그먼트 — 4중 의미).
12. **문서 범위 누락 리스크** — CRM(현재 라이브 큐가 진행 중인 바로 그 워크스트림), intake-conflict, partner settlement, 한국법 심화(HWPX), migration, marketplace가 문서 패키지에 전무 — 문서를 단독 마스터로 삼으면 진행 중 작업의 좌표가 사라짐.

---

## 6. 권고 (적용은 결정 후)

1. **마스터 실행 체계는 RP/CP 유지, 문서 패키지는 요구사항 소스로 흡수** — TUW 백로그 204개를 실행 단위가 아니라 *요구사항 시드*로 취급해 `docs/spec-requirement-ledger.json` → weighted ledger 경로로 등재. 이중 트래킹(충돌 3)과 기진행 진도 재실행(문서 24의 Sprint 0 착수 지시는 이미 닫힌 RP00~06 구간과 중복)을 회피.
2. **제품 성격은 "멀티테넌트 SaaS 코어 + 내부 배포 에디션"으로 정합화** — 문서의 internal 전제를 "1호 테넌트(자사 로펌) 요구사항"으로 재해석하면 표준 목표와 충돌 없이 흡수 가능. 반대로 internal 단일 조직 전제를 채택하면 기구현 테넌시·SaaS 하드닝 계약과 충돌.
3. **즉시 결정 3건**: ① User/Employee 분리(스키마 선반영 — RP11 전 데드라인), ② 문서 원본 소재(SharePoint vs object storage — RP06/08 런타임 전), ③ privilege·HR-sensitive 기밀분류 확장(권한 커널 enum — 소급 비용 큰 항목).
4. **계획 공백 등재**: HRX 901 unit ledger 반영, Obsidian Vault(계획 0), Outlook Add-in 런타임 전용 단위, Workflow(R5)·Issue/Practice(R6)·Drafting(R10) 전용 프로그램, billing의 Activity Signal·Matter Budget·Leakage.
5. **명명 정리**: "matter = 제품 브랜드(UI), Law Firm OS = 플랫폼 코드명"으로 공식화하거나 통일. 동명이의(Activity/Lead/Contact/Loop/P-기호)는 용어집으로 고정.
6. **AI 레이어 분리 명시**: 개발 거버넌스 AI 통제(control-plane)와 제품 런타임 AI Gateway(문서 07)를 별도 계약·별도 패키지로 — 기존 AIControlRule 재사용 금지.
7. **email-dms no-write 계약 보존**: filing 런타임은 신규 런타임 계약으로 신설하고 기존 디스크립터 계약의 production_ready 증거는 불변 유지 (게이트 약화 금지 지침 준수).

---

### 부록: 분석 범위·근거
- 문서 25개 전부 정독(18번 TUW 백로그는 구조 수준), 코드 대조는 `packages/*/src` 전 파일·contract JSON 표본·docs 계획 문서·apps 라우트/서피스 직접 확인.
- 모든 "부재" 판정은 키워드 grep(예: employee, office.js, obsidian, clause, graph_message_id, TUW 패턴) 0건 확인 기반.
- 세부 트랙별 원본 분석(5개 트랙 보고 전문)은 세션 기록에 있음. 필요 시 트랙별 심화 문서로 분리 가능.
