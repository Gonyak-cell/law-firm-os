# matter 컨셉-구현 격차 감사 및 개선 계획 (2026-07-02)

작성 방식: 11개 영역 병렬 전수 판독(사양명세서 v2.0 docx 763줄 전문, workbook 스펙 26문서, launch-tuw 전체, contracts 53개 전수, apps/api·web·desktop 실측, packages 40개 전수 분류, 원장·큐 상태, 06-19 이후 445커밋, 검증 체계) → 3개 관점(제품 커버리지 / 런타임 준비도 / 계획-실행 정합) 독립 격차 분석 → critical·major 갭 18건 전건 적대적 검증(CONFIRMED 2, ADJUSTED 16 — 정정문 반영). 총 32에이전트, 962회 도구 호출.

## §0 권한 한계

이 문서는 감사 보고+계획이며 어떤 완료 권한도 없다. 소스오브트루스 위계(라이브 git+manifests > plan JSON > queue > ledger > 증거 > 문서)를 준수하며, 충돌 시 라이브 리포 상태가 우선한다. 리포 변경·커밋은 구현 측(Codex) 소관이다.

**출처 표기:** [직접] = 이 세션에서 직접 재실행/판독, [검증] = 조사 에이전트 보고를 별도 검증 에이전트가 코드 기준으로 재확인, [보고] = 에이전트 보고·미재검증.

**중요 전제:** 본 감사의 기준 트리는 로컬 브랜치 `codex/lcx-vltui-owner-approval-intake`(merge-base 2026-06-30 이전 분기)다. origin/main에는 이후 PR #150(owner 승인 응답 수령), #152(go-live receipt), #166(company-wide rollout gate)이 머지되어 있어 owner 승인 관련 로컬 파일은 stale이다. [검증]

---

## §1 제품 기본 컨셉 (전수 확인 결과)

정본 3원: ① `Law_Firm_OS_Enterprise_SaaS_사양명세서_v2.0.docx`(2026-06-08, "개발 착수용 상세 기획 초안") ② `workbook/matter_master_specification_combined.md`(matter_dev_docs 25문서 결합본, 2026-06-11) ③ `workbook/absorption-package/06_오픈_결정_레지스터.md`(MAT-DEC-01~09 마스터).

**한 줄 정의:** 로펌·기업 법무조직용 **Matter 중심 Legal Knowledge Work Platform** — System of Record(공식 기록) + System of Intelligence(지식·추론) + System of Action(업무 실행)의 3계 통합 엔터프라이즈 SaaS. "AI 챗봇"이 아니라 "Matter 중심 공식 기록 시스템 + 근거 기반 지식 그래프 + 업무흐름 내 AI 실행 시스템". [직접: spec 전문 판독]

**제품 계층 8개 / 모듈 31개 (spec 2.1 전수):**

| 계층 | 모듈 |
|---|---|
| 1. Core Matter Platform | Client, Matter, Task, Calendar, Billing |
| 2. Document & Email | DMS, Email Filing, Version, Search |
| 3. Knowledge | Matter Graph, Wiki, Clause Library |
| 4. Legal AI | Model Router, GraphRAG, Review Queue (+6.1의 8구성요소) |
| 5. Workflow | SPA, LDD, RFI, Opinion, Closing (템플릿 10종) |
| 6. Collaboration | Client Portal, External Sharing |
| 7. Security & Governance | SSO, DLP, Ethical Wall, Audit |
| 8. SaaS Operations | Tenant, Billing, Observability, SLA |

**제품 원칙 6 (차별화):** Matter-native / Citation-first AI / Human-in-the-loop / Hybrid AI routing / Workflow-native AI / Knowledge Capture. 강제 조항: citation 없는 고위험 판단 confirmed 전환 불가, 최종 법률판단은 변호사 승인 필수.

**구조 스펙:** 핵심 엔티티 13종, 역할 7종, Public API 8종, 플랜 4단(Starter~Private/Sovereign). 요구 체계는 Pillar P0~P14 × Release R0~R14, TUW 백로그 204건. 출시 정의는 **Wave 1 = AMIC 1호 테넌트 내부 go-live**(MAT-DEC-01: SaaS 코어 유지+자사=1호 테넌트), launch 분해는 PRE+L0~L9 / 72 WP / 344 TUW.

**컨셉 문서 자체의 미비:** 성공지표 5영역이 지표명만 있고 수치 목표 0건; 모듈 명명 절간 불일치(Model Router vs Strong LLM Gateway 등) — 정본 모듈 카탈로그 단일화 필요. [직접]

---

## §2 현재 구현도 실측 (2026-07-02)

### 2.1 06-12 스냅샷 대비 진전 (실질적, 전부 계획 밖 LCX/MDT 트랙 경유)

| 축 | 2026-06-12 | 2026-07-02 실측 |
|---|---|---|
| API | GET 4라우트, 쓰기 0 | **205라우트(GET 96/쓰기 109), 17 도메인** [검증] |
| 영속성 | 0 (인메모리) | 파일 기반 JSON 스토어(기본 ephemeral tmpdir, env 시 durable). DB 드라이버 여전히 0 [검증] |
| 인증 | 0 | 실검증 2경로(vault-bridge 토큰, 데스크톱 Lambda pbkdf2)+Secrets Manager. 일반 205라우트는 여전히 자기주장 헤더 [검증] |
| 웹 UI | 데모 셸 1/50 연결 | 18뷰/181섹션, 5대 도메인 뷰 전부 실 API 연결(섹션 기준 ~39% live), fetch 137개, mock fallback 없음 [보고] |
| 데스크톱 | 없음 | Electron "matter" v0.1.x 시리즈, macOS 서명·공증, GitHub 릴리스(공개 pre-release v0.1.0~0.1.2) [검증] |
| 인프라 | 없음 | AWS 실가동: CloudFront+Lambda+S3+API GW+SES+Secrets Manager (account 770880870480) [보고] |
| 실데이터 | 없음 | 07-01 클라이언트 99·매터코드 148 upsert(readback 149), HRX 실계정 9명 [검증] |
| CP 트랙 | 진행 중 | **종결: 987팩 100% production_ready, 큐 잔여 0** (55,132/55,256 유닛) [보고] |

### 2.2 그러나 — 구조적 실측

- **runtime_ready 팩/유닛 여전히 0/0.** 987팩 전부 descriptor 레이어. [보고]
- **packages 613,807 LOC 중 실행 런타임 ~8%**(~50k). 단 apps/ 트리에 별도 실행 ~40k LOC 존재(CP 회계 밖에서 성장 중). [검증]
- 8계층 대비 판정: 계층 1·2·6·7·8 **partial**(골격~스텁), 계층 3(Knowledge)·4(Legal AI 핵심)·5(Workflow) **missing**. 미구현 대표: Settlement(라우트 0), Search/OCR(실행 0), M365/Outlook(Graph 코드 0), Knowledge Graph(Neo4j·벡터DB 의존성 0), Workflow 엔진·Issue Ledger(0), DLP/Retention/Legal Hold(0), SSO/MFA/SCIM(stub 37줄), Marketplace/Data Room/Migration/한국법률심화/외부연동(0). 예외적 최대 실행 클러스터는 HRX(10k LOC, 테스트 62파일, 유일하게 authz 미들웨어 실와이어링). [검증·보고]
- 검증 체계: npm scripts 363개 중 validate 계열 255개(70%), validate-*.mjs 238개 중 98.7%가 파일 판독 전용. 성능 테스트는 dry-run 하드코딩. `npm run validate`는 [직접] exit 0 PASS이나 계약 JSON 1개만 검사하는 최소 게이트. npm test 3건 실패 방치+글롭이 14파일(e2e/security/audit 42건) 누락. [검증·보고]

---

## §3 미비점 — 검증 통과 갭 (정정 반영, 심각도순)

### P0 — 소급 긴급 (실데이터·경계)

**G-1. 신뢰 경계 부재 상태의 실데이터 노출 [CONFIRMED]**
`x-lawos-permission-context` 헤더로 클라이언트가 principal+rules+ACL 자기주장(permission-gate.js:36-49), 웹 클라이언트가 allow-all 규칙 자체 생성(apiClient.js:220-221), HRX actor 헤더·무서명 step-up 동일, 웹 로그인 자격증명 검증 0회, CORS `*`. 완화 요인: API는 127.0.0.1 바인딩+Lambda 래퍼 경유, 전사 컷오버 미실행 — "인터넷 임의 접근" 프레임은 과장이나 pre-boundary 상태로 실데이터를 받는 구조 자체는 사실.

**G-2. 실명 데이터의 저장소·프로덕션 이중 상주 [ADJUSTED — 성격 재정의]**
"Lambda 임시스토리지 소실 위험"은 과장(투입 247건은 `packages/matter/src/amic-matter-code-candidates.js` 시드로 콜드스타트마다 재적재). **진짜 리스크는 반대 방향: 실명 클라이언트·딜코드가 public GitHub 리포와 배포 zip에 커밋되어 상주**하고, 미보장 대상은 시드 이후 런타임 쓰기 데이터다. DB 0·백업 복원 리허설 0은 사실.

**G-3. 정책 미비준 상태의 실데이터 투입 (순서 위반) [ADJUSTED]**
production-data-policy 계약이 `draft_pending_human_ratification`(미비준 시 실데이터 접촉 전면 불허)인데 07-01 투입 완료. 오너 승인 기록(06-21, 06-28 "전부 진행")은 존재하나 계약이 요구하는 per-data-slice 비준 메커니즘을 경유하지 않음 — "무단"이 아니라 "비준 절차 우회"가 정확한 성격.

### P1 — 구조 (경계·영속·원장)

**G-4. 원장-실행 이원화, 진행률 단일 진실 부재 [ADJUSTED]**
launch-tuw 344 TUW 전부 planned 동결(mtime 06-13, 단 authority=planning-only는 설계된 한계), 실작업은 계획 밖 LCX(npm lcx:* 97개)/VLTUI/MDT 트랙. cutover-log·external-leadtime-register 등 원장 5개+가 06-21 이후 실황(AWS 배포, 실데이터, 데스크톱 릴리스) 미반영 — 양방향 오판 위험. **COVERAGE-ALL-GO-LIVE deferral 시한 2026-07-15(13일 전), 5개 사유 전부 구현 기준 미충족.**

**G-5. MAT-DEC-03/08 결정 기록 유실 [ADJUSTED — 새 발견]**
06-19 커밋 c73546180이 오너 결정(MAT-DEC-03 SharePoint/OneDrive 스토리지, MAT-DEC-08 privileged enum)을 기록하고 M365 계약 봉인을 풀었으나, 같은 날 WIP 커밋 9cb8ac068이 계약을 되돌리고 결정 문서를 삭제 — 현재 성격은 "결정 미결"이 아니라 "**결정 후 리포 롤백으로 기록 소실**". 06-21 LCX7-RI-09/11에 M365 admin consent·스토리지 결정 approved 영수증 존재(레지스터 미갱신).

**G-6. 게이트 적층 중 ops_ready 층 실체 없음 [ADJUSTED]**
계획 §3이 명령한 `contracts/ops-readiness-contract.json`+validator 미생성(go-live-gate만 존재). L6 증거 패킷은 존재하나 스스로 tabletop_exercise_performed:false·g6_satisfied:false 기록.

### P2 — 수락·품질

**G-7. L5 보안 수락 전무 [ADJUSTED]** 외부 펜테스트 증거 전 항목 Absent, security-acceptance 러너 부재, EXT-PENTEST blocked. 단 "보안 검증 전부 grep"은 과장 — hrx 테스트는 실서버 기동 검증.
**G-8. L6 운영 실측 0 [CONFIRMED]** 런북 문서만, DR 리허설 0, KPI는 synthetic-only 스켈레톤(대시보드 미발행), 알림 실발화 0.
**G-9. audit_everything 부분 미이행 [ADJUSTED]** 쓰기 경로 감사는 실재(HRX는 hash-chain), 그러나 감사 미들웨어 5종 HTTP 미와이어링 + **민감 읽기(vault 문서 목록·검색 등) 무감사**.
**G-10. 차별화 계층 기반 부재 [ADJUSTED]** Knowledge Graph·검색·모델 게이트웨이 실행 0. 단 Citation Validator는 HRX 스코프에 실행체 존재(법률 AI 경로는 하드코딩 장부). Wave 2 AI-GATE-01~07 전부 blocked.
**G-11. 품질 위생 [보고·표본]** npm test 3건 실패 방치, 테스트 글롭 14파일 누락(CI 동일), 죽은 코드 2,954줄, README-코드 괴리(4라우트로 기술), 계약 바이트동일 중복 1쌍, 브랜드 표기 'matter by AMIC' 0회(MAT-DEC-04 불일치), Claude 리뷰 waiver-게이트 상충 미정리.

---

## §4 개선 계획 (TUW 수준 — 구현·커밋은 Codex)

원칙: ① 비약화 — 닫힌 CP 팩·기존 게이트 불수정, 위에만 적층 ② 실데이터가 이미 실재하므로 보호 조치는 "출시 준비"가 아니라 **소급 긴급** ③ 모든 산출물은 기존 goal-closeout/LCX 영수증 규격.

### Phase 0 — 실데이터 보호 (즉시, 오너 결정 1건 포함)

| # | 작업 | 완료 기준 |
|---|---|---|
| 0-1 | **오너 결정: 실데이터 처분** — (a) production-data-policy 즉시 비준+투입분 per_goal_per_data_slice_per_tenant 소급 등재 또는 (b) 실데이터 회수·봉인 | 결정 레지스터 기록 + 비준/회수 영수증 |
| 0-2 | **public 리포 내 실명 데이터 노출 검토** — amic-matter-code-candidates.js 등 실명 딜코드·클라이언트명·HRX 로스터의 public GitHub 상주 여부 재확인 → 비공개 전환/데이터 분리/히스토리 처리 방안 상신 | 노출 인벤토리 + 처분 결정 |
| 0-3 | 최소 하드닝 선행 커밋: CORS 화이트리스트, step-up 토큰 서명(HMAC), 실데이터 read 라우트 operator 토큰 뒤 차단 | 부정 테스트 통과 영수증 |
| 0-4 | 실테넌트 ID 신설 — tenant_rp05_synthetic에서 실데이터 분리(synthetic 표식 체계와 혼재 해소) | 재대사(readback) PASS |

### Phase 1 — 신뢰 경계·영속성 (LT-L2-W01~03 상당, 최장 구간의 시작)

| # | 작업 | 완료 기준 |
|---|---|---|
| 1-1 | 서버측 identity: 세션/서명 토큰 발급·검증(장기 Entra OIDC — auth-session-plan 원설계), 자기주장 헤더 제거·서버 파생 컨텍스트로 대체 | RTG-002/G3 증거, bypass mapping |
| 1-2 | 권한 규칙 서버 저장 이전(클라이언트 rules 공급 금지) + Ethical Wall 런타임 기초 | 권한 우회·테넌트 격리 부정 테스트 |
| 1-3 | 내구 영속층: persistence 포트 뒤 관리형 DB(RDS/DynamoDB, 최소 S3-backed) 교체 투입 + 파일 스토어 마이그레이션 | durable restart 테스트 PASS(현 실패 중), 백업·복원 리허설 RPO/RTO 실측 receipt |
| 1-4 | production bridge에 `repository_durable=true` precondition 추가(기계 차단) | validator 신설 |

### Phase 2 — 원장 정합 회복 (Risk C, Phase 1과 병행)

| # | 작업 | 완료 기준 |
|---|---|---|
| 2-1 | LCX/MDT 트레인 ↔ LT-* WP 크로스워크 테이블 + launch-tuw ledger status 동기화 스크립트(원장별 authority 선언 유지) | 단일 진행률 기계 판정 가능 |
| 2-2 | **07-15 deferral 재판정 패킷**(5개 사유 항목별 충족/미충족/재연기 근거, 재판정 owner 실명 지정, 연기 이력 관리) | launch-decision-register 규격 등재 |
| 2-3 | MAT-DEC-03/08 결정 기록 복원(06-19 롤백분) — 계약 봉인 플래그 재반영 + g1-owner-decisions 문서 재등재 + external-leadtime-register 갱신(06-21 M365 영수증 반영) | 계약 storage_decision_resolved=true |
| 2-4 | stale 문서 재생성: cutover-execution-log, external-leadtime-register, README(4라우트→실황), Claude 리뷰 waiver-게이트 관계 재정의 문서 | 시점 모순 0 |
| 2-5 | ops-readiness-contract.json + validator 신설(계획 §3 이행), go-live G6과 참조 정리 | 게이트 적층 4층 완성 |

### Phase 3 — Wave 1 컷라인 실체화 (제품 도달)

| # | 작업 | 완료 기준 |
|---|---|---|
| 3-1 | DMS 파일 실체: 문서 바이트 내구 저장(placeholder 어댑터 → MAT-DEC-03 확정 스토리지)+버전 | 업로드→저장→재기동→조회 E2E |
| 3-2 | M365/Outlook filing 착수(admin consent 06-21 확보 기록 활용, Graph 런타임 증거 게이트 해소) — 지연 시 컷라인에서 공식 제외 결정을 레지스터에 기록 | runtime attestation 항목 전환 |
| 3-3 | Core Workflow·Issue Ledger 최소 실행체(현재 0 — launch 부록 에스컬레이션 처분 포함) | Wave 1 시나리오 관통 |
| 3-4 | 감사 미들웨어 전 컨텍스트 와이어링 + 민감 읽기 감사 + "감사 없는 쓰기/민감읽기 실패" 회귀 테스트를 글롭에 포함 | audit_everything 불변식 재검증 |
| 3-5 | 웹 로그인 실체화(1-1 연동), staging E2E '로그인→matter 생성→filing→work queue→audit' | L4 게이트 증거 |

### Phase 4 — 수락 게이트 (외부 리드타임 즉시 착수)

펜테스트 벤더 계약(크리티컬 패스 최상단 — 지금 발주), L6 최소 세트(탁상연습 1·모의장애 1·알림 실발화 1·백업복원 1 → receipt), 성능 dry-run → 실부하 전환, 보안 negative 검증 grep→실행형 전환.

### Phase 5 — 차별화 수직 슬라이스 (Wave 2 진입 조건)

검색 스택 조기 결정(OpenSearch 등 계약 권장군 중 1) → "문서 업로드→텍스트 추출→인덱스→권한 필터 retrieval→AI 출력+citation 검증→리뷰 큐 확정" 실 모델 게이트웨이 1개 관통 슬라이스 → AI-GATE 해소의 기계 증거.

### 상시 위생 트랙 (Risk C)

npm test 실패 3건 수정, 테스트 글롭 확장(+CI), 죽은 코드 17파일 제거, 계약 중복본 canonical 지정, 브랜드 표기 결정 재확인(matter 단일 vs matter by AMIC), 성공지표 수치 목표 설정, 정본 모듈 카탈로그 단일화.

### 의존 관계

```
0-1·0-2 (오너 결정) ──► 0-3·0-4 ──► Phase 1 (경계·영속)
Phase 2 (원장, 병행) ──► 2-2는 07-15 이전 필수
Phase 1 완료 ──► Phase 3 (컷라인) ──► Phase 4 수락 ──► 컷오버 재판정
Phase 4의 펜테스트 발주·M365 확인은 리드타임상 지금 착수
Phase 5는 Phase 3와 부분 병행 가능 (검색 스택 결정은 조기)
```
