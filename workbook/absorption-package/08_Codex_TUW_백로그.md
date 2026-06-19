# 08. Codex 작업 지시 — TUW 백로그 (matter 패키지 흡수)

작성: 2026-06-11, Claude (계획 전담) / 실행: Codex (구현 전담 — 리포 변경·커밋은 전부 Codex)
단위 ID: `ABS-<트랙>-NN` (Plan A의 `MAT-…-TUW-…` 패턴은 의도적으로 비사용 — 어휘 오염 방지)
실행 순서: **ABS-TRK → ABS-GATE → ABS-M365 → ABS-HRX** (검증 확정 랜딩 순서). 트랙 내부는 번호 순서가 의존 순서다.

---

## §0 공통 프로토콜 (모든 유닛에 적용)

**시작 의식 (매 유닛)**
1. `git log --oneline -3` + `jq -r '.live_latest_pack_id, .live_next_unit_id' docs/closeout-pack-plan/next-pack-queue.json` — 라이브 커서 확인. 본 백로그의 커서 수치(CP00-326/RP10.P04)는 스냅샷이며 항상 라이브가 우선.
2. `git status --porcelain` — 자기 작업분 외 변경이 있으면 중단·보고.
3. 해당 유닛의 "결정 게이트"가 pending이면 **착수 금지**.

**전역 금지 (위반 = 즉시 중단)**
- 수정 금지: `contracts/`의 기존 파일 전부, `packages/**`, `docs/closeout-packs/**`, `docs/weighted-implementation-ledger.*`, `docs/spec-requirement-ledger.*`, `docs/full-spec-microphase-ledger.json`, `docs/ldip-integration/**`, `docs/spec-v2-integration/**`, rpXX 마이크로페이즈 JSON/MD
- `scripts/` 기존 파일은 명시된 유닛(ABS-GATE-05, ABS-HRX-06)에서 명시된 가산 분기만
- plan_totals 54,355/901/55,256·boundary 문자열·status enum·`hardenedReviewStartPackNumber=178` 값 변경 금지
- 기존 validator의 검사 삭제·완화 금지 (추가만)
- `Close CP00-xxx` 커밋 형식은 본 백로그 작업에 사용 금지

**완료 의식 (매 유닛)**
- 유닛의 "완료 판정" 커맨드를 전부 실행하고 결과(exit code 포함)를 `docs/matter-pack-integration/work-log.md`에 append (형식: `| ABS-XXX-NN | YYYY-MM-DD | 판정 커맨드 요약 | pass/fail | 비고 |`).
- 커밋은 유닛에 명시된 시점에만, **quiet window**(직전 커밋이 `Close CP00-xxx`인 직후)에 수행.

**중단·에스컬레이션 공통**
- 기존 게이트(`npm test`, `npm run validate`, `npm run closeout-pack:validate` 등)가 작업 전 green이었는데 red가 되면: 즉시 원복 → work-log에 기록 → 소유자 보고.
- 소스 문서와 계획서가 충돌하면: 임의 판단 금지, work-log에 충돌 기록 후 다음 유닛 진행(차단 시 보고).

**Claude 리뷰 실행 표준 (ABS-TRK-10·13, ABS-M365-02·04, ABS-HRX-02에서 사용)**
- LDIP 선례(`docs/ldip-integration/claude-review-packets/` 형식) 그대로: packet 작성 → claude CLI **read-only**(tools: Read/Grep/Glob, model claude-opus-4-8, effort max) 호출 → 원시 출력 보존 → result JSON → adjudication 작성.
- 무효 출력(산문+fenced JSON, 0바이트, tool-call 형태)은 `*-invalid-attempt-0N.json`으로 영구 보존 후 재시도.
- 통과 기준: `overall_verdict ∈ {PASS, PASS_WITH_FINDINGS}` ∧ p0/p1 finding 전건 해소(adjudication에 fixed/deferred+evidence).

---

## §1 ABS-TRK — 마스터 흡수 트랙 (`docs/matter-pack-integration/`)

기존 산출물(Claude 작성, 수정 시 work-log 기록): `matter-terminology-map.md`, `matter-pack-full-integration-plan.md`, `matter-pack-source-index.md`(§1 SHA 동결 완료).

### ABS-TRK-01 — 소스 인덱스 섹션 분류표 완성 (Phase 1 마감)
- **목표**: 25개 문서의 전 섹션(heading 단위)을 7값 분류로 1회씩 분류한 표를 `matter-pack-source-index.md`에 §2.1로 추가.
- **선행**: 없음 (즉시 착수 가능)
- **파일**: 수정 `docs/matter-pack-integration/matter-pack-source-index.md`(가산만) / 읽기 `workbook/matter_dev_docs/*.md`, `workbook/matter_dev_docs_gap_analysis.md`
- **단계**: ① 각 문서의 `^#{1,3} ` heading을 추출해 행 생성 (`doc | 섹션 앵커 | family | type | classification | 비고`) ② 갭 분석 §3·§4를 참조해 분류 ③ 분류값이 `adapt_required_pending_user_decision`인 행은 MAT-DEC ref 병기 ④ 용어집의 변환 규칙 위반 표현이 없는지 자체 점검.
- **완료 판정**: `grep -c '^| ' source-index §2.1` ≥ 전 문서 heading 합계(실측치 기록); 분류값 7종 외 값 0건(`grep -vE 'implemented_by|covered_but|adapt_required|new_required|defer_with|reject_with' 분류열` 0); 08번 문서 행은 전부 "M365 부속 모듈 위임" 표기.
- **커밋**: 없음 (ABS-TRK-15에서 일괄)

### ABS-TRK-02 — 요구 추출: CORE·PERM family
- **목표**: `matter-pack-requirement-candidates.md` 신설, 문서 05·06에서 MAT-REQ-CORE-*·MAT-REQ-PERM-* 추출.
- **선행**: ABS-TRK-01
- **파일**: 생성 `docs/matter-pack-integration/matter-pack-requirement-candidates.md`
- **단계**: ① 문서 머리에 planning-only 선언 + 후보 스키마 17필드 정의(LDIP 14필드 + conflict_axis/terminology_ref/human_decision_ref) ② 섹션 패스(001~) ③ 명명객체 패스(101~): **도메인 객체 17행**(갭 분석 §3.1 표 전체 — Employee는 MAT-DEC-02 결정 반영해 new_required), **Role 12종·감사 이벤트 12분류·권한평가 10단계·Ethical Wall 4면 차단·emergency override**(문서 06) ④ 불변식 패스(301~): Matter 상태 enum 3중 불일치 등 ⑤ 기커버 항목은 covered_but_requires_trace로 등재(재발명 금지).
- **완료 판정**: 전 행 17필드 비어있지 않음(스크립트 검사 또는 수기 검산 기록); 도메인 객체 17행·Role 12·감사 12 전건 ID 존재; "Activity"·"Lead"·"Contact" 단독 표기 0건(용어집 변환 적용, `grep -nw 'Activity' candidates.md`로 확인).
- **커밋**: 없음

### ABS-TRK-03 — 요구 추출: WORK·ISSUE·PORTAL·VAULT family
- **목표**: 문서 12(Practice Packs)·10(Portal)·09(Obsidian)·01 P4(Workflow)에서 추출.
- **선행**: ABS-TRK-02 (같은 파일 직렬 편집)
- **단계**: 명명객체 전수 — Practice Pack 산출물(M&A 12모듈·Litigation 10모듈·Corporate 10모듈, Issue Ledger 16필드), Portal 4종+projection 원칙, Obsidian 폴더 구조·frontmatter 스키마·sync 6단계·import 허용/불허 매트릭스, Work/Review Queue. Obsidian 항목은 `docs/spec-v2-integration/v2-rp-anchor-map.md`의 RP27/CP00-814 기매핑을 1차 anchor로 역참조.
- **완료 판정**: 위 명명객체군 전건 등재(카운트를 work-log에 기록); Issue Ledger 16필드가 1개 후보(불변식)로 명시.
- **커밋**: 없음

### ABS-TRK-04 — 요구 추출: AIGW·DRAFT·BILL·ADMIN·INTEG·HARD family
- **목표**: 문서 07(AI)·13(Drafting)·14(Billing)·04(아키텍처)·22 일부에서 추출.
- **선행**: ABS-TRK-03
- **단계**: AIGW는 control-plane AIControlRule 재사용 금지를 모든 행의 비고에 명기; 문서 14의 Activity Signal·Matter Budget·Billing Leakage·HR Capacity는 "RP11~15 계획 공백" 표기로 new_required; HARD는 MAT-DEC-01(1호 테넌트) 결정 반영해 기존 RP26 trace 위주.
- **완료 판정**: AIGW family 전 행에 `dev_ai_control 비사용` 비고; BILL 신규 4개 개념 등재 확인.
- **커밋**: 없음

### ABS-TRK-05 — 요구 추출: HR·UI·API family + 갭·거버넌스 등가성 패스
- **목표**: 문서 11(HR — HRX 트랙 시드로 추출)·21(UI 14화면)·22(API 16+이벤트 15) + 갭 분석 §5 충돌 11건 전건(901~ 대역 포함) + 거버넌스 등가성 패스(GOV family).
- **선행**: ABS-TRK-04
- **단계**: HR 16객체는 MAT-REQ-HR-101~로 추출하되 비고에 "HRX 원장(ABS-HRX-04)의 시드 — 이중 판정 금지, HRX 트랙이 본 추출을 참조" 명기; M365는 **추출 금지**(부속 모듈 단독 책임); GOV는 등가성 입증 행(TUW↔unit, R↔RP, VC·CG↔validator+리뷰, 4역할↔현행 분업)과 비등가 잔여(Decision/Learning Ledger 부재 등)를 MAT-REQ-GOV로 환류.
- **완료 판정**: HR 16·UI 14·API 16+15 카운트 일치; M365 family 행 0건; 갭 분석 §5의 11개 충돌 전건이 후보 또는 adjudication 위임 행으로 존재.
- **커밋**: 없음

### ABS-TRK-06 — A-4 no-omission 커버리지 매트릭스
- **선행**: ABS-TRK-05 / **파일**: 생성 `matter-pack-no-omission-coverage-matrix.md`
- **단계**: 요구별 매트릭스 + 명명객체 8군 전수 체크리스트 + family 17×분류 7값 카운트 검산 + "silent-omission count: 0" 선언 + forbidden scope 직접 삽입 0 확인.
- **완료 판정**: 카운트 검산이 candidates.md와 일치(불일치 0); 8군 각각 "Must not miss" 열 완비.

### ABS-TRK-07 — A-5 RP 앵커맵
- **선행**: ABS-TRK-06 / **파일**: 생성 `matter-pack-rp-anchor-map.md`
- **단계**: 3분류 앵커표(기커버 trace/신규 overlay/충돌 adapt+MAT-DEC ref); First-Use Entry Points(라이브 커서 기준 재산정 — RP10 잔여, RP11 진입 게이트=MAT-DEC-02 **결정됨** 반영, RP06/08 런타임=MAT-DEC-03 보류, RP17=AIGW 분리, RP19/20=Portal 일반화); 무앵커 항목(Workflow·Issue·Obsidian·HR) "승인 ledger 확장 후보" 절 격리.
- **완료 판정**: P0/P1 요구 전건이 primary RP + first CP(또는 확장 후보 절) 보유; 닫힌 팩 직접 삽입 0.

### ABS-TRK-08 — A-6 5축 갭 adjudication
- **선행**: ABS-TRK-07 / **파일**: 생성 `matter-pack-gap-adjudication.md`
- **단계**: 5축 충돌 판정(축1·축2는 MAT-DEC-01/04 결정·pending 상태 반영, 축3은 게이트 레이어 트랙 위임, 축4는 MAT-DEC-03 보류 반영, 축5는 AIGW 분리 확정); 거버넌스 등가성 매핑표(§3); "P0 충돌 = 인간 결정 강제" 규칙 적용; unit-impact `units_currently_added: 0`; Implementation Admission **blocked** 선언.
- **완료 판정**: 5축 전건 판정 존재; P0 행 중 silent reject 0건; MAT-DEC 참조 무결(`grep -o 'MAT-DEC-0[1-9]'` 전건이 결정 레지스터에 존재).

### ABS-TRK-09 — A-7 overlay JSON
- **선행**: ABS-TRK-08 / **파일**: 생성 `matter-pack-overlay-closeout-pack-map.json`
- **단계**: 패키지 문서 02 A-7 스키마 그대로. `user_decisions_required`에 결정 현황 반영: MAT-DEC-01 `"decided_2026-06-11_first_tenant"`, 02 `"decided_2026-06-11_employee_user_id"`, 03 `"deferred"`, 05 `"decided_2026-06-11_commit_freeze"`. `governance_absorption_policy`, forbidden_edit_scope **한정 문구** 포함.
- **완료 판정**: `jq . map.json` exit 0; `coverage_summary`가 ABS-TRK-06 검산과 일치; `matter_pack_implementation_allowed === false`.

### ABS-TRK-10 — C-MPACK-01~04 리뷰 + adjudication
- **선행**: ABS-TRK-09 / **파일**: 생성 `claude-review-packets/c-mpack-0{1..4}.md`, `claude-review-results/`, `adjudications/`
- **단계**: §0 리뷰 표준 적용. 관점은 패키지 문서 02 §A-8(02번 리뷰 스코프에서 M365군 제외 명기). finding 해소 시 산출물 소급 수정은 adjudication에 기록.
- **완료 판정**: 4건 전부 PASS/PASS_WITH_FINDINGS + p0/p1=0; result JSON 4건 + adjudication 4건 실존.

### ABS-TRK-11 — B 통합 리스크 레지스터
- **선행**: ABS-TRK-08 (Phase 5와 병렬 가능) / **파일**: 생성 `docs/unified-product-risk-register.{json,md}`
- **단계**: 패키지 문서 02 §2 스키마. UPR-001~012(RISK 전건)+UPQ-001~015(OQ 전건) 시드; UPR-002는 `mitigated_by_design`(MAT-DEC-02 결정)으로 상태 반영; owner 전건 `jwsuh@amic.kr`; reference_index 모드(1차 기록 이동 0).
- **완료 판정**: `jq '.entries | length'` ≥ 12, `.open_questions | length` ≥ 15; 1차 기록 이동 0건(contracts diff 없음 — `git status`로 확인); 커서 숫자 0건(`grep -c 'CP00-' register.md` = 0).

### ABS-TRK-12 — C 전략 선언문
- **선행**: ABS-TRK-08 / **파일**: 생성 `docs/product-strategy-declaration.md`
- **단계**: 패키지 문서 02 §3 구조. §6(b) 분기 의존 기준은 MAT-DEC-01 결정(1호 테넌트)을 반영하되 §7에 결정 기록 명기; §0 권위 한정 선언 필수.
- **완료 판정**: 커서 숫자 0건; "Source of Truth 서열에 진입하지 않는다" 문구 존재; product-contract 수정 0(`git status`).

### ABS-TRK-13 — C-MPACK-05 최종 정합 리뷰
- **선행**: ABS-TRK-10·11·12 / **단계**: overlay 검산 + B·C 정합 리뷰 (§0 표준).
- **완료 판정**: PASS + p0/p1=0.

### ABS-TRK-14 — 공유 파일 가산 개정 (전 트랙 완료 후 최종)
- **선행**: ABS-GATE-07, ABS-M365-05, ABS-HRX-07 (전 트랙 랜딩 후 — 공유 파일 단일 편집 원칙)
- **파일**: 수정(append-only) `docs/closeout-pack-plan/risk-classification-rules.md`(+8줄 내외), `docs/closeout-pack-plan/latest-total-closeout-execution-plan.md`(신규 절 1개)
- **완료 판정**: `git diff`가 추가 행만 포함(삭제·변경 0행); 기존 A/B/C 정의·§7 서열 본문 바이트 불변; `npm run closeout-pack-plan:validate` green.
- **커밋**: `docs(governance): additive matter-pack overlay clauses in risk rules and execution plan` (시퀀스 10)

### ABS-TRK-15 — 커밋 1·2 (트랙 산출물 + 소스 동결)
- **선행**: ABS-TRK-13 / **결정 게이트**: MAT-DEC-05 결정됨(커밋 동결)
- **단계**: ① 커밋 직전 SHA 재검증(`shasum -a 256 workbook/matter_dev_docs/[0-9]*.md` ↔ source-index §1 전건 대조 — 불일치 시 중단) ② 커밋 1: `Add matter-pack planning gate artifacts (planning-only)` — `docs/matter-pack-integration/` 전체 + **workbook/matter_dev_docs/ 25파일** + work-log. 본문: "planning-only; no validator/script reads these paths (verified by grep); governance absorption: requirements-only; units added: 0; closed packs untouched; source frozen per MAT-DEC-05" ③ 커밋 2: `docs(planning): unified product risk register and strategy declaration (planning-only)`.
- **완료 판정**: 커밋 후 `npm test` + `npm run validate` + `npm run closeout-pack:validate` + `npm run closeout-pack-plan:validate` 전부 green(무변화 통과).

---

## §2 ABS-GATE — 런타임 게이트 레이어

**결정 게이트(트랙 전체)**: MAT-DEC-07 — ✅ **결정됨 (2026-06-11, jwsuh@amic.kr)**: 게이트 레이어 신설 승인 + 문서 05 §6 권고안 일괄 채택(경계 팩 번호 = 머지 직전 라이브 커서 + 2, 명명 `runtime_ready`/RTG, opt-in, `undeclared_legacy` 라벨, 단독 거버넌스 커밋 경로). **착수 가능.**

### ABS-GATE-01 — 정책 문서
- **파일**: 생성 `docs/closeout-pack-plan/runtime-gate-layer.md` (패키지 문서 05 §1 A6 스펙 — M365 계약 관계 절 포함)
- **완료 판정**: CG↔RTG 번역표 5행 + 비약화 논증 4명제 + 커서 숫자 0건.

### ABS-GATE-02 — 계약 + 계약 검증기
- **파일**: 생성 `contracts/runtime-readiness-contract.json`, `scripts/validate-runtime-readiness-contract.mjs` / **단계**: 패키지 문서 05 A1·A2 스펙. 경계 팩 번호는 **머지 시점 라이브 커서 + 2**로 산정해 계약에 박고 work-log에 산정 근거 기록.
- **완료 판정**: 신규 검증기 exit 0; 기존 `npm run contracts:validate` green(기존 계약 무접촉).

### ABS-GATE-03 — 파생 implementation-layer ledger
- **파일**: 생성 `scripts/generate-implementation-layer-ledger.mjs`, `scripts/validate-implementation-layer-ledger.mjs`, `docs/closeout-pack-plan/implementation-layer-ledger.{json,md}`
- **완료 판정**: 생성기 재실행 ↔ 커밋본 deepEqual; ledger의 `packs[]` 길이 = `ls docs/closeout-packs | wc -l`; 경계 이전 팩에 `layer_source:"declared"` 0건; **닫힌 팩 manifest 변경 0**(`git status`에 docs/closeout-packs 0건).

### ABS-GATE-04 — 런타임 검증기 (공허 통과)
- **파일**: 생성 `scripts/validate-runtime-readiness.mjs` / **완료 판정**: exit 0 (런타임 팩 0개 상태의 vacuous pass를 work-log에 명기).

### ABS-GATE-05 — 기존 검증기 경계 분기 가산 ⚠ 민감
- **파일**: 수정 `scripts/validate-closeout-pack.mjs` (패키지 문서 05 B1 — 경계 상수 1줄 + validateManifest 분기 1블록, **추가 행만**)
- **단계**: ① 수정 전 `npm run closeout-pack:validate` 전수 sweep 출력 저장 ② 가산 수정 ③ 수정 후 sweep 출력 저장 ④ **diff = 0 확인** (이것이 비약화의 기계 증명 — work-log에 diff 결과 기록).
- **완료 판정**: 전/후 sweep diff 0행; `git diff scripts/validate-closeout-pack.mjs`에 삭제 행 0; `npm test` green.
- **중단**: diff가 0이 아니면 즉시 원복·보고.

### ABS-GATE-06 — 대시보드·npm 스크립트 가산
- **파일**: 수정 `scripts/progress-control-room-data.mjs`(implementation_layers 블록 가산), `package.json`(스크립트 4종) / **완료 판정**: `npm run implementation-layer:validate` 등 신규 4종 green; 기존 `progress:serve` 동작 확인.

### ABS-GATE-07 — 커밋 3·4·5
- **단계**: 패키지 문서 07 §4 시퀀스 3~5의 커밋 메시지 그대로, 각 커밋 단독으로 전 게이트 green 유지(단조 진행). 커밋 3 본문에 MAT-DEC-07 승인 기록 ref.

---

## §3 ABS-M365 — M365 기술 결정 이식 (마스터 트랙 부속)

### ABS-M365-01 — Stage 1 문서 5종
- **선행**: ABS-TRK-09 (마스터 트랙 planning 완료 후)
- **파일**: 생성 `docs/matter-pack-integration/m365/m365-{source-extract,requirement-map,rp-anchor-map,gap-adjudication}.md`, `m365-overlay-map.json` (패키지 문서 04 §1 스펙 — ID는 `MAT-REQ-M365-001~017`)
- **완료 판정**: source-extract의 SHA256 = `05a03499ad30fd47abb508482a04611cbecad8d8d62d9caffb9496feebb7e218`(불일치 시 중단·재동결); 명명객체 체크리스트 **74항목** 검산 = overlay `coverage_summary` 일치; `jq . m365-overlay-map.json` exit 0, `m365_runtime_implementation_allowed === false`.

### ABS-M365-02 — C-MPACK-M365-01 리뷰
- **단계**: §0 표준. packet에 C-MPACK-02·03과의 스코프 경계 명기. / **완료 판정**: PASS + p0/p1=0.

### ABS-M365-03 — Stage 2 계약 + 검증기
- **결정 게이트**: 없음 (스토리지 의존 항목은 봉인 상태로 작성 — MAT-DEC-03 보류 반영)
- **파일**: 생성 `contracts/email-dms-m365-runtime-contract.json`, `scripts/validate-email-dms-m365-runtime-contract.mjs`; 수정 `package.json`(1키)
- **완료 판정**: 신규 검증기 exit 0 — 특히 검사 4(기존 email-dms-core 계약의 descriptor_only===true + no_write_attestation 18키 false **파수꾼 검사**) 통과; `runtime_admission_gate.implementation_allowed === false`; storage_dependent 5항목 전건 `blocked_until_storage_decision: true`; 기존 `rp08:email-dms-core:validate` green.

### ABS-M365-04 — C-MPACK-M365-02 리뷰 / **완료 판정**: PASS + p0/p1=0.

### ABS-M365-05 — 커밋 6·7
- 커밋 6: `docs(planning): matter-pack m365 overlay artifacts for rp08 runtime decisions (planning-only)` / 커밋 7: `Add email-dms m365 runtime decision contract artifacts (decision-record-only, additive)` — 본문에 "email-dms-core-contract.json unmodified (verified)" + 실행 검증 커맨드 목록.

---

## §4 ABS-HRX — HRX 901 등재

**착수 게이트**: ABS-TRK-08 완료(문서 11 이중 판정 방지). MAT-DEC-06 — ✅ **결정됨 (2026-06-11, jwsuh@amic.kr)**: (a) RP30 네임스페이스 + 901 보정 테이블(complexity 2.2 + high-risk = 895, P01~P06 M05 각 +1 = 901) 승인 (b) 급여 계산 런타임 defer — CompensationRecord 메타+rule 인터페이스만 (c) HRX 팩 큐 꼬리 배치 (d) HR AI 런타임은 RP17/18 anchor(RP30은 데이터·evidence만). MAT-DEC-02도 결정됨(분리 채택). **ABS-HRX-05의 결정 차단 해소 — 잔여 게이트는 C-HRX 리뷰 통과뿐.**

### ABS-HRX-01 — H0 planning 산출물 8종
- **파일**: 생성 `docs/hrx-integration/` 전체 (패키지 문서 03 §1 표 그대로 — adjudication의 급여 행은 정정된 인용 사용: 문서 11:68 + 문서 01:82·:105, "범위 미확정")
- **완료 판정**: 8종 실존; `hrx-overlay-closeout-pack-map.json`의 admission gate boolean — 결정 반영 4종 true(`user_employee_separation_decision_recorded`〔MAT-DEC-02〕, `payroll_scope_decision_recorded`·`hrx_sequencing_decision_recorded`〔MAT-DEC-06〕, `source_freeze_decision_recorded`〔MAT-DEC-05〕), 리뷰 의존 2종 false로 탄생(`hrx_ledger_extension_allowed`, `claude_reviews_c_hrx_01_04_passed` — C-HRX 통과 후 갱신); `frozen_hrx_unit_count: 901`; 16객체 커버리지 Missing 0.

### ABS-HRX-02 — C-HRX-01~04 리뷰
- **완료 판정**: 4건 PASS + p0/p1=0 (04번 리뷰가 901 보정 테이블 정직성을 명시 검토했는지 확인).

### ABS-HRX-03 — H1 RP30 프로그램 소스
- **파일**: 생성 `scripts/hrx-program-catalog.mjs`, `scripts/generate-hrx-detailed-plan.mjs`, `scripts/validate-hrx-detailed-plan.mjs`, 생성물 `docs/rp30-people-hr-evidence-detailed-microphases.{json,md}`
- **완료 판정**: rp30 JSON entries === 110, phase RP30.P00~P09; `scripts/rp-detailed-plan-catalog.mjs` **무수정**(`git diff` 0); 기존 `npm run fullplan:validate` green; 신규 `rp30:validate` green.

### ABS-HRX-04 — H2 요구 원장
- **파일**: 생성 `scripts/hrx-requirement-catalog.mjs`(요구 인라인 — 외부 SPEC_PATH 금지), `scripts/generate-hrx-requirement-ledger.mjs`, `scripts/validate-hrx-requirement-ledger.mjs`, `docs/hrx-requirement-ledger.{json,md}`
- **단계**: 마스터 트랙 MAT-REQ-HR 추출(ABS-TRK-05)을 시드로 사용. HRX-GATE-001~006 전건 P0.
- **완료 판정**: 신규 validator green — 교차 가드(`docs/spec-requirement-ledger.json.requirement_count === 227`) 포함; 메인 ledger `git diff` 0.

### ABS-HRX-05 — H3 weighted ledger (901 검산) ⚠ 핵심
- **결정 게이트**: MAT-DEC-06 ✅ 결정됨 — 잔여 선행은 ABS-HRX-02(C-HRX 리뷰 통과)뿐
- **파일**: 생성 `scripts/generate-hrx-weighted-ledger.mjs`, `scripts/validate-hrx-weighted-ledger.mjs`, `scripts/test/hrx-weighted-ledger.test.mjs`, `docs/hrx-weighted-implementation-ledger.{json,md}`
- **완료 판정**: `jq '.hrx_implementation_subphase_count' === 901` **정확 일치**; `hrx_calibration` 검산 base 895 + supplements 6 === 901; `npm test`에 hrx 테스트 포함 green; 메인 3개 ledger `git diff` 0; `validate-goal1-foundation` green(54355/227 자동 확인).
- **중단**: 901 불일치 시 어떤 보정 임의 변경도 금지 — 보고.

### ABS-HRX-06 — H4 plan 편입 ⚠ 민감
- **파일**: 수정 `scripts/generate-closeout-pack-plan.mjs`, `scripts/validate-closeout-pack-plan.mjs`, `scripts/progress-control-room-data.mjs`(전부 플래그 게이트 가산 분기 — 패키지 문서 03 §5), `docs/closeout-pack-plan/risk-classification-rules.md`(가산 3건), `latest-total-closeout-execution-plan.md`(가산 단락), `package.json`·`hermes/project.json`(스크립트 등록); 재생성 `closeout-pack-plan.json`·`next-pack-queue.json`
- **단계**: ① HRX ledger 부재 상태에서 생성기 실행 → 기존과 바이트 동일 출력 확인(플래그 분기 무해 증명) ② HRX ledger 존재 상태로 재생성 ③ 검증: 큐 선두 = 라이브 커서 불변, HRX 팩은 꼬리(RP29 뒤)에만, correction_event 스크립트 생성 확인 ④ HRX 팩에 `hrx_source_ledger_sha` 스탬프 확인.
- **완료 판정**: `npm run closeout-pack-plan:validate` green(신규 assert 포함); **전 팩 sweep green**(`npm run closeout-pack:validate` — 닫힌 327+팩 무영향 증명); 대시보드 901 이중 계상 0(분기 확인); 기존 미래 팩 경계 무변(재생성 전후 RP00~29 구간 pack id/range diff 0 — work-log에 기록).
- **중단**: 기존 팩 경계가 1건이라도 바뀌면 원복·보고.

### ABS-HRX-07 — 커밋 8·9
- 커밋 8(ABS-HRX-01·02 산출물): `Add hrx integration planning gate artifacts` / 커밋 9(03~06): `Add RP30 HRX people-hr-evidence source ledgers and extend closeout pack plan (additive, 55256 unchanged)` — 본문에 MAT-DEC-02·06 결정 기록 ref + "all closed packs revalidated".

---

## §5 잔여 인간 결정 (Codex가 만나면 중단하고 소유자에게 올릴 것)

결정 완료 (2026-06-11): MAT-DEC-01(1호 테넌트)·02(User/Employee 분리)·05(커밋 동결)·**06(HRX 등재 일괄)**·**07(게이트 레이어 일괄)** — 백로그의 모든 결정 차단이 해소됨. **유일한 잔여 관문은 Claude 리뷰 통과(C-MPACK/C-HRX/C-MPACK-M365)다.**

| 시점 | 결정 | 내용 |
|---|---|---|
| 전략 선언문 §8 확정 전 | MAT-DEC-04 | 제품명 (비차단 — pending이어도 전 유닛 진행 가능) |
| M365 런타임 팩/RP16 전 | MAT-DEC-03(보류 확정)·08 | 스토리지 / 기밀분류 enum — 본 백로그 범위 밖(미래 구현 팩의 게이트) |
| 레지스터 커밋 전 | MAT-DEC-09 | owner·갱신 주기 — 기본값(jwsuh@amic.kr) 사용 시 별도 승인 불요 |
