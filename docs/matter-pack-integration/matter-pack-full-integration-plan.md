# Matter-Pack Full Integration Plan (A-1)

## §0 Status 선언 (불가침)

Status: **planning-only** — 본 트랙의 어떤 산출물도 구현·ledger 확장·contract 변경·validator 변경·production_ready 선언을 승인하지 않는다.
- plan_totals 54,355 / 901 / 55,256 및 boundary 문자열 불변
- 닫힌 팩(`docs/closeout-packs/`) historical-only, 리넘버링 금지
- 기존 계약의 no_write_attestation false 값 불변, deepEqual로 묶인 contract↔registry 쌍 불변
- LDIP(`docs/ldip-integration/`)·V2(`docs/spec-v2-integration/`) 동결 산출물 수정 금지(참조만)
- `units_currently_added: 0` — 등재는 사용자 승인 ledger 확장으로만
- HRX 별도 제품화 금지(`splits_hrx_product: false` 유지)
- 본 트랙 문서의 커서 수치는 작성 시점 스냅샷 — 실행 시 라이브 큐(`docs/closeout-pack-plan/next-pack-queue.json`) 우선

## §1 목적

Plan A(matter 개발문서 패키지, `workbook/matter_dev_docs/` 25개 문서)의 전 항목을 Plan B(RP/CP 체계)의 요구사항 소스로 **100% 명시 분류**한다. "100% 반영"은 전 항목의 명시 분류(covered/adapt/new/defer/reject)이지 즉시 구현이 아니다.

근거: `workbook/plan-vs-plan-verdict.md` (8차원 비교, Plan B 7승 1패 — Plan B를 마스터 실행 체계로 유지하고 Plan A 우월 요소를 흡수), `workbook/matter_dev_docs_gap_analysis.md` (영역별 갭·5축 충돌), `workbook/absorption-package/` (본 트랙의 설계 패키지 v1.1, 통합 적대적 검증 approve_with_fixes 반영).

## §2 통합 원칙

matter-first / permission-first / audit-first / human-review-for-AI / vendor-neutral-core / **terminology-first** (요구 추출 전 `matter-terminology-map.md`의 변환 규칙 적용 필수).

## §3 명시적 비목표

contracts/ · packages/ · scripts/ · 모든 ledger JSON · 닫힌 팩 · LDIP/V2 산출물의 변경. 본 트랙은 docs/matter-pack-integration/** 와 §5의 allowed 경로만 생성·수정한다.

## §4 변형 선언

**하이브리드 = V2(delta 추출) + LDIP(full 게이트).** already-covered 판정은 갭 분석이 사실상 완료(→delta), 그러나 5축 정면 충돌·선결 인간 결정·25개 문서 규모 때문에 전용 Claude 리뷰 트랙(C-MPACK-01~05)을 사전 실행(→full).

## §5 병렬 경계

- `allowed_edit_scope`: `docs/matter-pack-integration/**`, `docs/unified-product-risk-register.*`, `docs/product-strategy-declaration.md`, `docs/closeout-pack-plan/risk-classification-rules.md`(append-only), `docs/closeout-pack-plan/latest-total-closeout-execution-plan.md`(append-only)
- `forbidden_edit_scope`: `contracts/**`, `packages/**`, `scripts/**`, `docs/closeout-packs/**`, `docs/closeout-pack-plan/*.json`, `docs/weighted-implementation-ledger.*`, `docs/spec-requirement-ledger.*`, `docs/ldip-integration/**`, `docs/spec-v2-integration/**`
- **한정 문구 (검증 반영)**: forbidden_edit_scope는 **본 트랙의 직접 편집에 한한다.** 타 승인 트랙의 정당한 산출물 — HRX 등재 트랙의 plan/queue 재생성, 런타임 게이트 레이어 트랙의 `implementation-layer-ledger.json` 신설 등 — 은 본 트랙의 경계 위반이 아니며, C-MPACK-03/05 리뷰는 이 한정을 적용해 판정한다.
- 라이브 CP 큐(RP10 진행 중)와 경로 무교차 — 본 트랙 경로는 validator 비독해 안전 지대.

## §6 Phase 로드맵

| Phase | 작업 | 산출물 | 상태 |
|---|---|---|---|
| 0 | 용어집 + 본 계획 | A-0, A-1 | **완료 (2026-06-11)** |
| 1 | 소스 동결 + 인덱스 | A-2 `matter-pack-source-index.md` | 진행 중 — SHA256 동결 완료, 섹션 분류 진행 |
| 2 | 요구 추출 (패스 6종) | A-3 `matter-pack-requirement-candidates.md` | 대기 |
| 3 | 커버리지 + 앵커맵 | A-4, A-5 | 대기 |
| 4 | 5축 adjudication + overlay JSON | A-6, A-7 | 대기 |
| 5 | C-MPACK-01~04 리뷰 | A-8 | 대기 |
| 6 | 리스크 레지스터 + 전략 선언문 | B-1/2, C-1 | 대기 (Phase 4 후 5와 병렬 가능) |
| 7 | C-MPACK-05 + 거버넌스 가산 개정 + 커밋 | — | 대기 |

랜딩 순서(워크스트림 간): 본 트랙 Phase 0~4 → 런타임 게이트 레이어(MAT-DEC-07 동반) → M365 부속 모듈(`m365/` 하위, MAT-REQ-M365-*) → HRX planning(본 트랙 Phase 4 후). 공유 파일 3종(risk rules, execution plan, progress-control-room-data.mjs)은 이 순서대로 단일 편집.

## §7 Claude 리뷰 계획

C-MPACK-01(소스 인덱스 완전성) / 02(요구 추출 완전성 — 명명객체 8군 전수, **M365군 제외**: C-MPACK-M365-01이 단독 책임) / 03(RP 앵커·제품 경계 drift — §5 한정 문구 적용) / 04(adjudication 과소평가 — 5축 은폐·등가성 과대주장) / 05(overlay 검산 + 산출물 B·C 정합) + 부속 C-MPACK-M365-01/02. 전부 read-only, claude-opus-4-8, effort max, 무효 시도 영구 보존.

## §8 구현 전 승인 체크리스트 + 결정 기록

| 결정 | 상태 | 기록 |
|---|---|---|
| MAT-DEC-01 제품 성격 | **결정됨 (2026-06-11, jwsuh@amic.kr)** | **"1호 테넌트 정합화"** — SaaS 멀티테넌트 코어 유지, 자사 로펌을 1호 테넌트로 취급. Plan A의 internal 전제는 "1호 테넌트 요구사항"으로 재해석해 흡수. 기구현 테넌시·RP26/28/29 보존 |
| MAT-DEC-02 User/Employee 분리 | **결정됨 (2026-06-11, jwsuh@amic.kr)** | **분리 채택** — Employee 객체 신설, `Employee.user_id` 역방향 참조(닫힌 RP01 domain 패키지 무변경). HRX 등재·RP11 TimeEntry의 선결 조건 충족 |
| MAT-DEC-03 문서 원본 스토리지 | **보류 (2026-06-11 확인)** | 설계의 storage_dependency_partition 유지 — 결정 무관 항목 즉시 진행, 의존 5항목 봉인. 데드라인: RP06/08 런타임 계약 신설 전 |
| MAT-DEC-05 소스 동결 | **결정됨 (2026-06-11, jwsuh@amic.kr)** | **커밋 동결** — workbook/matter_dev_docs/ 25파일을 본 트랙 커밋 1에 포함(SHA256 표와 동일 커밋) |
| MAT-DEC-06 HRX 등재 승인 | **결정됨 (2026-06-11, jwsuh@amic.kr)** | **일괄 승인** — RP30 네임스페이스, 901 보정 테이블(complexity 2.2 + high-risk = 895, P01~P06 M05 각 +1 = 901, ledger `hrx_calibration` 블록에 박제), 급여 계산 런타임 defer(CompensationRecord 메타+rule 인터페이스만), HRX 팩 큐 꼬리 배치, HR AI 런타임은 RP17/18 anchor |
| MAT-DEC-07 런타임 게이트 레이어 | **결정됨 (2026-06-11, jwsuh@amic.kr)** | **신설 일괄 승인** — 경계 팩 번호 = 머지 직전 라이브 커서 + 2, 명명 `runtime_ready`/RTG-001~005, opt-in 적용, legacy 라벨 `undeclared_legacy`, 단독 거버넌스 커밋 경로. M365 계약의 런타임 플래그 명명도 본 결정에 종속 |
| MAT-DEC-04 제품명 / 08 기밀분류 enum / 09 레지스터 owner | pending | 04는 비차단, 08은 미래 구현 팩 게이트, 09는 기본값(jwsuh@amic.kr) 사용 시 승인 불요 (`workbook/absorption-package/06_오픈_결정_레지스터.md`) |

구현 착수(implementation admission)는 위 표와 별개로: C-MPACK-01~05 PASS + 사용자 착수 승인 후에만.

## §9 거버넌스 비흡수 결정 기록

**Plan A의 실행 거버넌스(TUW 204 / L0~L13 / R0~R14 / P0~P14 필러 ID / VC·CG ID 체계 / Ledger 5종 / Planner–Executor–Verifier–Governor 4역할)는 체계로 흡수하지 않는다. 요구사항만 추출한다.**

근거: `workbook/plan-vs-plan-verdict.md` — 착수 가능 TUW 인스턴스 0개(204건 전건 보일러플레이트, ID 자기모순), 게이트 집행 기제 부재, 전환 시 닫힌 팩 320+·리뷰 영수증 144·validator 28 고아화. TUW 204건은 실행 단위가 아니라 요구 시드로 취급한다. 거버넌스 문서(02·03·15~20·24)는 소스 인덱스에서 `MAT-REQ-GOV` family로 분리해 **등가성 입증**(gap-adjudication §3 매핑표) 또는 reject_with_reason으로만 처리하며, 비등가 잔여(예: CG-002~006 런타임 게이트 의미론 → 런타임 게이트 레이어 트랙, Decision/Learning Ledger 부재)는 MAT-REQ 후보로 환류한다. 동일 결정을 overlay JSON `governance_absorption_policy`에 기계가독으로 복제한다.
