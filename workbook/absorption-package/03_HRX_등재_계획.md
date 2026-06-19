# 03. HRX 등재 계획 — 901 unit을 차용증에서 실행 가능 상태로

설계 원칙: **메인 체인(54,355 unit / 227 요구 / 3,300 마이크로페이즈 / 30 프로그램) 불변 + HRX 전용 미러 체인 신설.** 모든 변경 가산적.

## 0. 설계를 결정지은 검증 사실

1. **901은 기존 가중 공식으로 도달 불가능** — 분해 공식 전수 시뮬레이션(complexity 1.00~4.80 × high-risk × extra-heavy 전 조합) 결과 901이 되는 파라미터 부재. 최근접 = complexity 2.2 + high_risk → **895**.
2. **확정 보정안**: base 895 (페이즈별 P00=23, P01=58, P02=136, P03=58, P04=95, P05=95, P06=136, P07=136, P08=95, P09=63) + **P01~P06의 M05("Permission And Audit Binding") 6개 마이크로에 각 +1** = 정확히 901. 보정 명목 "HR 민감정보 가드 보강"(Plan A 문서 11 §2와 의미 일치). 보정은 숨기지 않고 ledger의 `hrx_calibration` 블록에 박제.
3. **메인 ledger 진입 불가 동결 상수 4종**: `validate-weighted-implementation-ledger.mjs`의 `source_micro_phase_count===3300`(:39), entries 길이 일치(:45), `subphase_count ≤ 55000`(:216 — 55,256은 초과), `program_distribution.length===30`(:225) → **HRX는 별도 파일이어야 함.**
4. **plan 편입 지점 확인**: `generate-closeout-pack-plan.mjs`의 flatten이 유일한 unit 우주 정의이고 프로그램 경계 수축 규칙 덕분에 HRX unit을 꼬리에 append하면 **기존 미래 팩 경계가 한 개도 안 바뀜.**
5. **닫힌 팩 안전**: `validate-closeout-pack.mjs:166-168`이 plan에 없는 닫힌 팩을 `plan_binding_snapshot`으로 fallback — plan 재생성이 닫힌 팩을 깨지 않음.
6. **대시보드 이중 계상 주의**: `progress-control-room-data.mjs:104-108`이 `remaining = planned + 901` 무조건 합산 — HRX가 plan에 들어가는 순간 이중 계상 → 가산 플래그 분기 필요.

## 1. Phase H0 — 흡수 트랙 planning (신규 `docs/hrx-integration/`, LDIP full 변형)

| 파일 | 내용 |
|---|---|
| `hrx-full-integration-plan.md` | 목적·비목표·H0~H4 로드맵·C-HRX-01~04 리뷰 계획·구현 전 승인 체크리스트(D1~D7→문서 06 매핑) |
| `hrx-source-index.md` | 소스: 문서 11 전체 + 문서 05 Employee 행 + 문서 06 HR 민감 ACL 절. 파일별 SHA256. Coverage Rule: 문서 11 §1~9 + 명명객체(16객체·16모듈·rule 9영역·AI 8기능·권한 10행·Data Room 9행·Gate 6조) 전수 분류 |
| `hrx-requirement-candidates.md` | ID `HRX-<FAMILY>-###`, family 12종: CORE/DOC/TIME/RULE/RECR/LIFE/POL/RISK/PERM/AI(RP17·18 cross-anchor)/DATA(RP20·25 cross-anchor)/GATE. 스키마 = LDIP + `required_data_model` + `user_decision_ref` |
| `hrx-no-omission-coverage-matrix.md` | 16객체×anchor 매트릭스, Missing Count: 0 선언 |
| `hrx-rp-anchor-map.md` | Primary = **RP30(신설)**; cross-anchor: HR AI→RP17/18, Analytics→RP15, Data Room→**RP20**(RP25는 Migration Platform으로 무관 — 검증 반영 제거), HR Capacity→RP11~15, 기밀분류 enum→RP02 확장 팩; LDIP-COMP 교차 매핑(ldip-rp-anchor-map §HRX Interaction 6접점과 1:1) |
| `hrx-gap-adjudication.md` | 명시 reject/defer: 급여 계산 런타임(**범위 미확정** — 문서 11:68 "계산 범위 추가 확정 필요" + 문서 01:82 LLM 위임 금지·:105 open question 근거; 외부 원천 스펙(pasted-text.txt:144)의 후순위 표기는 리포 밖 참조라 보조 근거로만 — defer_with_revisit_gate), AI 합격/불합격 판단(reject — 문서 11 자체 금지), Employee/Candidate portal(defer→RP19). **adapt 핵심 수**: 문서 05의 `User.linked_employee_id`를 **`Employee.user_id` 역방향 참조**로 전환 — 닫힌 RP01 domain 패키지 무변경 흡수. unit-impact: "등재는 신규 증가가 아니라 기약속분(901)의 소스 실체화" 명문화 |
| `hrx-overlay-closeout-pack-map.json` | `implementation_admission_gate`(전부 false로 탄생: ledger 확장 허용·D1~D3 결정 기록·C-HRX 통과), `overlay_policy`(리넘버링 금지·별도 제품 금지·`frozen_hrx_unit_count: 901`) |
| `claude-review-packets/c-hrx-01~04` + results + adjudications | 01 소스 완전성 / 02 16객체 전수 / 03 RP30 경계 drift(별도 제품화 금지) / 04 갭 과소평가 + **901 보정 테이블 정직성** |

## 2. Phase H1 — RP30 프로그램 소스 (신규)

| 파일 | 내용 |
|---|---|
| `scripts/hrx-program-catalog.mjs` | 기존 카탈로그에서 standardPhases만 import (**programs 배열 불변** — 30개 유지). `hrxProgram = { id: "RP30", title: "People HR Evidence (HRX Embedded)", hermesGate: "H30", claudeGate: "C30", packageName: "hrx-people", hrx_embedded: true, entities/workflows/goldenCases/risks }` |
| `scripts/generate-hrx-detailed-plan.mjs` | 110-entry 골격 미러 → `docs/rp30-people-hr-evidence-detailed-microphases.{json,md}` (schema 동일, RP30.P00~P09). **이 JSON이 HRX weighted 생성기의 소스 ledger 겸용** |
| `scripts/validate-hrx-detailed-plan.mjs` | per-program 검사 복제(110 고정, phase당 11, H30/C30) — 기존 validator 무수정 |

### HR 객체 → RP30 매핑 (Plan A 문서 11·05 → 도메인 콘텐츠)

| Plan A 소스 | RP30 좌표 | 비고 |
|---|---|---|
| Employee + Employment Profile | P01.M01 (+M07 상태 enum 9단계) | |
| Employment Contract + HR Document + Compensation Record | P01.M02 | restricted_access — 민감 |
| Leave/Attendance/Overtime | P01.M03 | rule engine 입력 |
| Candidate + Job Opening + Interview | P01.M04 | privacy_consent 필수 |
| On/Offboarding + HR Policy + HR Risk Event | P01.M05 | +1 보강 대상 |
| People Graph 관계 | P01.M06 | `Employee.user_id` 역방향 (D1=MAT-DEC-02) |
| Rule Engine 9영역 (급여=defer) | P02.M01~M05 워크플로 5종 + M07 멱등성 | |
| HR 권한 10행 + 민감 가드 | P06 전체 + M05 보강 6건 | MAT-DEC-08 의존 |
| HR AI 8기능 | P02.M09 review-required + **RP17/18 cross-anchor** | AI 레이어 분리 |
| HR Data Room | RP20 cross-anchor | RP25 앵커는 검증에서 제거됨 |
| Verification Gate 6조 | HRX-GATE-001~006 (P0) → P00.M03 + P09 | RP30 acceptance 뼈대 |

## 3. Phase H2 — HRX 요구사항 원장

| 파일 | 내용 |
|---|---|
| `scripts/hrx-requirement-catalog.mjs` | 요구 행 **모듈 내 인라인** (외부 첨부 SPEC_PATH 절대경로 취약점 답습 금지). 메인 227건과 동일 앵커 스키마 |
| `scripts/generate-hrx-requirement-ledger.mjs` | → `docs/hrx-requirement-ledger.{json,md}`. `law_firm_os_requirement_count_unchanged: 227` 명시 |
| `scripts/validate-hrx-requirement-ledger.mjs` | 동결 카운트·실존 앵커·P0 reject 0 + **교차 가드: 메인 ledger 227 재확인(가산 강화)** |

주의: `validate-goal1-foundation.mjs:153`이 `requirement_count===227`을 요구 — 기존 ledger에 합산 금지, 별도 파일 필수.

## 4. Phase H3 — HRX weighted ledger

| 파일 | 내용 |
|---|---|
| `scripts/generate-hrx-weighted-ledger.mjs` | 메인 생성기 함수군 미러 + `programComplexity 2.2` + high-risk + `hrSensitiveGuardSupplements`(P01~P06 M05 각 +1). 출력 `docs/hrx-weighted-implementation-ledger.{json,md}`: `hrx_implementation_subphase_count: 901`, `law_firm_os_units_unchanged: 54355`, `expanded_total_units: 55256`, **`hrx_calibration` 블록**(base 895 + supplements 6 + 사유 + 동결 출처), `hrx_internal_completion_formula`(`hrx_subphase_901_all_production_ready` — 메인 formula 불변·병렬 추가), entries 110개(`RP30.Pxx.Mxx.Sxx`, 전건 `hrx_embedded: true`) |
| `scripts/validate-hrx-weighted-ledger.mjs` | sum===901 정확 일치, split band 준수, 보정 검산(895+6===901), **교차 가드: 메인 54355·227 재확인** |
| `scripts/test/hrx-weighted-ledger.test.mjs` | npm test 자동 포함 — 901 합계·중복 ID·band 회귀 |

## 5. Phase H4 — 팩 플랜 편입 (기존 파일 가산 수정 4건)

| 파일 | 수정 (전부 가산) |
|---|---|
| `scripts/generate-closeout-pack-plan.mjs` | ① HRX ledger 존재 시 flatten·`hrx_embedded` 태깅 후 **메인 뒤 append** (부재 시 현행과 바이트 동일 — try/catch) ② risk 분류에 플래그 게이트 분기: HRX unit + HR 민감 키워드(compensation/salary/candidate/…) → B→A 승급 (기존 unit 경로 불변) ③ `expanded_product_scope`에 신규 키 4종(`hrx_units_in_plan_source: true` 등) ④ correction_event 스크립트 생성(`hrx_embedded_units_added_to_plan_source`, 901). 기존 54355/901/55256/boundary 키 값 불변 |
| `scripts/validate-closeout-pack-plan.mjs` | flatten 동일 확장 + **신규 assert**: HRX 카운트===901, sha 일치, `RP30.` prefix·disjoint, 901/54355 명시 검사(가산 강화). 기존 :137(55256)·:138(boundary) 그대로. **검증 반영 추가**: plan 생성기가 HRX 팩에 `hrx_source_ledger_sha` 필드를 스탬프하고, 미래 HRX 팩 manifest에서 이를 assert하는 검사 가산(HRX 원장 출처 증거를 plan 레벨에서 팩 레벨로 확장 — 증거 희석 방지) |
| `scripts/progress-control-room-data.mjs` | `:106` 분기: `hrx_units_in_plan_source`면 901 합산 제거 (이중 계상 방지). 대시보드 표기 "HRX embedded (in plan): n/901". **주의(검증 반영)**: `tools/progress-control-room/index.html` 수정은 UI 트랙 관리 영역 — `docs/ui-workstream-conventions.md`의 quiet-window·explicit-path 규약에 따른 조율을 커밋 본문에 명기 |
| `docs/closeout-pack-plan/risk-classification-rules.md` | 가산 3건: 서두 "HRX source extension 완료" 단락(기존 문장 보존) + Risk A 절 HRX 민감 카테고리 조항 + Overrides 예시 |

추가: `latest-total-closeout-execution-plan.md`에 "HRX Gate steps 1–6 satisfied" 가산 단락, `package.json`에 `hrx:*`·`rp30:*` 스크립트 6종, `hermes/project.json` validation_commands 3종 가산.

## 6. Phase H5 — RP30 실행기 (예약만)

`contracts/hrx-people-hr-core-contract.json` (descriptor_only, 음성 불변식: `implements_payroll_runtime: false`, `splits_hrx_product: false`, `conflates_user_and_employee: false`) + `packages/hrx-people/` + `scripts/validate-rp30-hrx-core-contract.mjs`. 첫 HRX 팩 도달 시점의 일반 CP 사이클로.

## 7. plan_totals 하드코딩 정합 (무변경 증명)

| 상수 | 위치 | 조치 |
|---|---|---|
| 54355/901/55256/boundary | `validate-closeout-pack.mjs:118-125`, 전 팩 manifest | **무변경** — HRX 팩도 동일 기재 |
| 55256/boundary | `validate-closeout-pack-plan.mjs:137-138` | 무변경 + assert 가산 |
| 54355/227 | `validate-goal1-foundation.mjs:150,153` | 무변경 (메인 불변이므로 자동 통과) |
| 3300/entries/≤55000/30 | `validate-weighted-implementation-ledger.mjs` | 무변경 (별도 파일 설계의 존재 이유) |
| 178 hardened 경계 | `validate-closeout-pack.mjs:26` | 무변경 — HRX 팩 자동으로 hardened 적용 |

## 8. 작업 순서

**착수 시점 (검증 반영)**: 본 워크스트림의 planning(W1)은 **마스터 트랙 Phase 4(5축 adjudication) 완료 후** 착수한다 — 문서 11이 마스터 트랙(MAT-REQ-HR)과 HRX 원장(HRX-*)에 이중·상충 판정되는 것을 방지. 마스터 트랙의 MAT-REQ-HR 추출 결과를 HRX 요구 원장의 시드로 사용한다(MAT-DEC-06 연계).

1. **W1** (마스터 Phase 4 후): H0 planning 산출물 → C-HRX-01~04 → 커밋 1
2. **W2** (병행): H1·H2 초안 (D 의존 행 플래그)
3. **W3** (인간 관문): MAT-DEC-02(User/Employee)·MAT-DEC-06(등재 승인+보정 테이블+급여 범위) 결정 기록 → admission gate boolean 갱신
4. **W4**: 요구 ledger 동결 → weighted ledger 생성(901 검산) → 신규 validator·테스트 green
5. **W5**: plan 편입 수정 → 재생성 → 전 게이트 sweep → 커밋 2
6. **W6** (후속): H5 — 큐 도달 시 일반 팩 사이클

## 9. 게이트·커밋

게이트: 기존 전부 green 유지(`npm test`·`npm run validate`·전 팩 sweep 323+ 포함) + 신규(`hrx:*`, `rp30:validate`, C-HRX-01~04 PASS).
커밋 1: `Add hrx integration planning gate artifacts` / 커밋 2: `Add RP30 HRX people-hr-evidence source ledgers and extend closeout pack plan (additive, 55256 unchanged)` — 본문에 결정 기록 ref + "all closed packs revalidated".

**게이트 약화 0 증명**: 메인 ledger 3파일·spec ledger·닫힌 manifest·deepEqual 쌍·LDIP 동결물 바이트 불변. 수정 기존 파일 4개는 전부 "HRX 파일 부재 시 현행 동일 동작" 플래그 분기 + 신규 assert 추가만.
