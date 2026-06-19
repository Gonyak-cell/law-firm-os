# PRE — CP 실행 중 선행 조치 (출시 계획 §4)

분해 기준: `workbook/matter-post-cp-launch-plan.md` §4-1~§4-7. 스키마·VC 바인딩·§0 공통 프로토콜은 `workbook/launch-tuw/00_마스터_출시피라미드_스키마_레지스트리.md` §E·§F·§G를 상속한다(본문 복제 금지). PRE는 잔여 CP 실행 중 수행되므로, CP 산출 경로(`contracts/`·`scripts/` 기존 파일, 결정 레지스터 등)의 실제 수정·커밋은 전부 **Codex 구현 회부 항목**으로 기술하고 본 트랙은 결정·명세·증적만 산출한다. 신규 산출물 경로는 `docs/launch/`(미존재 — 구현 시 생성) 하위로 통일한다.

---

## LT-PRE-W01 — critical-rp-saas-hardening-plan 비준 (§4-1)

라이브 큐가 하드닝 대상 RP16 팩을 닫는 중인데 플랜 status가 Proposed인 역순 상태의 즉시 해소.

#### LT-PRE-W01-T01 — critical-rp-saas-hardening-plan을 Adopted로 비준하고 문서·레지스터에 반영한다
- 유형/실행/리스크/가중치: decision / hybrid / B / M
- 목표: 소유자 비준 결정(Proposed → Adopted)이 결정 레지스터에 기록되고 플랜 문서 status가 갱신되어, 하드닝 대상 RP가 비준 없는 플랜 아래에서 닫히는 역순이 해소된 상태.
- 산출물: ① 비준 결정 기록 행(결정자 역할·결정값·근거·일자) — `workbook/absorption-package/06_오픈_결정_레지스터.md` 추가(Codex 구현 회부) ② `docs/critical-rp-saas-hardening-plan.md` 3행 `Status: Proposed` → `Status: Adopted (일자, 결정 기록 링크)` 갱신(Codex 구현 회부)
- 참조: workbook/matter-post-cp-launch-plan.md §4-1; docs/critical-rp-saas-hardening-plan.md:3; contracts/critical-rp-saas-hardening-contract.json
- 선행: 없음 — entry point: PRE는 첫 phase이며 비준은 다른 TUW 산출물을 입력으로 요구하지 않는 즉시 권고(§4-1)
- 완료 기준:
  1. `grep -c "^Status: Adopted" docs/critical-rp-saas-hardening-plan.md` 출력 1, `grep -c "^Status: Proposed"` 출력 0
  2. 06_오픈_결정_레지스터.md의 비준 행에 결정자 역할·결정값·근거·일자 4필드가 전부 기재(빈 필드 0)
  3. 결정값이 Adopted가 아닌 경우(조건부 채택/반려) BLOCK 기록과 에스컬레이션 항목이 존재한다
- 검증 계약: method: 1) 위 grep 2회 실행해 카운트·exit code 기록 2) 레지스터 행 4필드 수동 대조 후 대조 결과 기재 / evidence: grep 출력 전문과 레지스터 발췌를 docs/goal-closeout/lt-pre-w01/command-evidence.json에 TUW ID로 귀속 / VC: VC-LNCH-DEC-001, VC-LNCH-DOC-001
- 게이트: PRE-EXIT
- terminal: true

---

## LT-PRE-W02 — runtime/mixed 팩 인터리브 결정 (§4-2)

CP 완료 후에는 내릴 수 없는 결정 — go-live 시점을 수개월 단위로 좌우.

#### LT-PRE-W02-T01 — RP25·RP26·RP29 구간 runtime/mixed 인터리브 여부를 결정하고 큐 반영을 회부한다
- 유형/실행/리스크/가중치: decision / hybrid / A / M
- 목표: 잔여 큐 소화 중 런타임 레이어 팩 인터리브 여부 — 최소 RP25(마이그레이션)·RP26(하드닝)·RP29(상업 준비) 구간의 runtime/mixed 선언 + RTG-001~005 통과 의무화 권고 — 가 {의무화 채택, 부분 채택, 기각} 중 하나로 결정되어 닫힌 상태.
- 산출물: ① 옵션 브리프(잔여 큐 내 RP25/26/29 팩 기계 집계, 인터리브 vs CP 후 일괄 트랙 영향 비교) ② 결정 기록 행 — 06_오픈_결정_레지스터.md 추가(Codex 구현 회부) ③ 채택/부분 채택 시 plan 재생성 정책 변경 회부 명세(대상: scripts/generate-closeout-pack-plan.mjs·docs/closeout-pack-plan/closeout-pack-plan.json — 변경·커밋은 Codex 소관)
- 참조: workbook/matter-post-cp-launch-plan.md §4-2; docs/closeout-pack-plan/closeout-pack-plan.json; docs/closeout-pack-plan/next-pack-queue.json; docs/closeout-pack-plan/runtime-gate-layer.md; contracts/runtime-readiness-contract.json
- 선행: 없음 — entry point: 결정 시한이 잔여 CP 소화 속도에 종속 — 즉시 착수(§4-2), 입력은 라이브 플랜·큐 JSON뿐
- 완료 기준:
  1. 브리프에 잔여 큐 기준 RP25/RP26/RP29 팩 수가 집계 커맨드(node 원라이너 — range.first_unit_id 접두 필터)와 함께 기재되고 재실행 시 동수
  2. 결정 기록 행의 결정값이 {의무화 채택, 부분 채택(구간 명시), 기각} 중 하나로 명시되고 기각 시 사유 기재
  3. 채택/부분 채택 시 회부 명세에 RTG-001~005 의무화 적용 시점(팩 ID 경계)이 기재된다
- 검증 계약: method: 1) `node -e` 원라이너로 closeout-pack-plan.json에서 RP25/26/29 잔여 팩 수 집계 2) 레지스터 결정 행 수동 대조 3) 회부 명세 파일 존재 판정(ls exit 0) / evidence: 집계 출력·레지스터 발췌를 docs/goal-closeout/lt-pre-w02/command-evidence.json에 귀속 / VC: VC-LNCH-DEC-001, VC-LNCH-DOC-001
- 게이트: PRE-EXIT
- 권한·감사 영향: 이 결정은 마이그레이션·하드닝·상업 준비 RP 팩에 RTG-002(권한)·RTG-003(감사) 런타임 게이트를 의무화할지 정한다. 기존 게이트 의무를 축소하는 선택지는 금지 — 비약화 논증 필요: 예
- terminal: true

---

## LT-PRE-W03 — MAT-DEC-03(문서 원본 소재/M365) 해소 (§4-3)

데드라인 앵커: RP06/08 런타임 계약 신설 전·RP22/23 착수 전(잔여 큐 내부). Outlook filing이 Wave 1 핵심인 이상 출시 크리티컬 패스.

#### LT-PRE-W03-T01 — MAT-DEC-03 문서 원본 스토리지를 결정한다
- 유형/실행/리스크/가중치: decision / hybrid / A / M
- 목표: SharePoint/OneDrive vs object storage 결정이 기록되어 M365 admission 게이트의 storage_dependent 봉인 항목 5건 해제가 가능해진 상태.
- 산출물: ① 결정 브리프(contracts/email-dms-m365-runtime-contract.json의 storage_dependent 봉인 항목 5건 전수 나열 + 옵션별 권한·감사·보존 영향 비교) ② MAT-DEC-03 결정 기록 — 06_오픈_결정_레지스터.md의 ⏸ 행을 ✅로 갱신(Codex 구현 회부)
- 참조: workbook/matter-post-cp-launch-plan.md §4-3; workbook/absorption-package/06_오픈_결정_레지스터.md:13,25; contracts/email-dms-m365-runtime-contract.json; docs/matter-pack-integration/m365/m365-overlay-map.json; docs/matter-pack-integration/m365/m365-requirement-map.md
- 선행: 없음 — entry point: 데드라인 앵커(RP22/23)가 잔여 큐 내부라 PRE 최우선 착수 대상 — 입력은 기존 계약·레지스터뿐
- 완료 기준:
  1. 브리프의 봉인 항목 수 = `grep -c "blocked_until_storage_decision" contracts/email-dms-m365-runtime-contract.json` 출력(5)
  2. 레지스터 MAT-DEC-03 행이 결정 상태로 갱신되고 결정값(스토리지 방식)·결정자·일자가 기재된다
  3. RP22/23 팩의 잔여 큐 위치 확인 결과(착수 전 여부)가 브리프에 기재 — 이미 착수된 경우 BLOCK 기록 존재
- 검증 계약: method: 1) 위 grep 실행해 카운트 대조 2) next-pack-queue.json·closeout-pack-plan.json에서 RP22/23 팩 위치 조회(node 원라이너) 3) 레지스터 행 수동 대조 / evidence: 커맨드 출력을 docs/goal-closeout/lt-pre-w03/command-evidence.json에 귀속 / VC: VC-LNCH-DEC-001, VC-LNCH-DOC-001
- 게이트: PRE-EXIT
- 권한·감사 영향: 문서 원본 소재 결정은 문서 권한 경계(SharePoint 공유상태↔matter ACL)와 감사 이벤트 경로의 아키텍처를 고정한다. M365 admission 게이트 우회 금지 — 비약화 논증 필요: 예

#### LT-PRE-W03-T02 — MAT-DEC-03 결정을 전파하고 scope revision 필요 여부를 판정한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / B / L
- 목표: 결정이 봉인 해제 회부 명세로 전파되고, 해소로 유닛이 추가되는 경우 user-approved scope revision 회부가 기록된 상태(완료 판정 정의 §2-3(a)와 정합).
- 산출물: ① 봉인 해제 회부 명세 docs/launch/mat-dec-03-unseal-referral.md (신규 — 계약 변경은 Codex+M365 admission 절차 소관임을 명기) ② scope revision 필요 여부 판정 기록(필요 시 회부 문서 링크 포함)
- 참조: workbook/matter-post-cp-launch-plan.md §4-3, §2-3; contracts/email-dms-m365-runtime-contract.json; docs/closeout-pack-plan/latest-total-closeout-execution-plan.md:264
- 선행: LT-PRE-W03-T01
- 완료 기준:
  1. 회부 명세의 해제 대상 항목 수 = T01 브리프의 봉인 항목 수(5) — 처리 경로(M365 admission)가 항목별 기재
  2. scope revision 판정이 {불필요(사유), 필요(회부 기록 링크)} 중 하나로 기재된다
  3. 명세 내 인용 경로(결정 기록·계약) 전부 ls exit 0 — 깨진 링크 0건
- 검증 계약: method: 1) 명세 항목 수 grep 카운트 대조 2) 인용 경로 전수 ls 실행 3) 판정 절 존재 grep / evidence: 출력을 docs/goal-closeout/lt-pre-w03/command-evidence.json에 귀속 / VC: VC-LNCH-DOC-001
- 게이트: PRE-EXIT
- terminal: true

---

## LT-PRE-W04 — 갭 5영역 커버리지 대조 (§4-4)

CP 완료 후 발견하면 '전량 완료' 판정과 충돌하거나 무원장 작업이 된다. 등재는 overlay admission으로만(§3 예외 조항).

#### LT-PRE-W04-T01 — 갭 5영역(R5·R6·R8·R10·R14)을 잔여 큐 산출물과 대조한 커버리지 매트릭스를 생성한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / B / M
- 목표: R5 Core Workflow·R6 Issue/Practice Core·R8 Obsidian·R10 Drafting·R14 HR 화면군이 잔여 큐 산출물로 실제 커버되는지 영역별 판정이 존재하는 상태 — Work Queue·Issue Ledger는 Wave 1 핵심 기능.
- 산출물: docs/launch/gap-five-area-coverage-matrix.md (신규 — 영역 × 판정 × 근거 유닛/팩 ID)
- 참조: workbook/matter-post-cp-launch-plan.md §4-4; workbook/matter_dev_docs/15_릴리스_로드맵_DBS.md:15-24; docs/closeout-pack-plan/closeout-pack-plan.json; docs/weighted-implementation-ledger.json; docs/matter-pack-integration/matter-pack-no-omission-coverage-matrix.md
- 선행: 없음 — entry point: 대조 입력은 라이브 플랜·원장·기존 커버리지 매트릭스뿐 — 다른 PRE TUW와 독립
- 완료 기준:
  1. 매트릭스에 5영역 행이 정확히 5개 존재하고 각 행 판정이 {covered, partial, uncovered} 중 하나
  2. covered/partial 행마다 근거 유닛 ID 또는 팩 ID ≥1 기재 — 인용 ID 표본 ≥10건이 라이브 원장/플랜 조회에서 전건 실존
  3. uncovered/partial 판정 전건이 T02 처분 입력 목록 절에 등재된다
- 검증 계약: method: 1) `grep -c "^| R" docs/launch/gap-five-area-coverage-matrix.md`로 행 수 판정 2) 인용 ID 표본 10건을 node 원라이너로 ledger/plan에서 조회 3) 처분 입력 목록 절 존재 grep / evidence: 출력을 docs/goal-closeout/lt-pre-w04/command-evidence.json에 귀속 / VC: VC-LNCH-DOC-001, VC-DATA-001
- 게이트: PRE-EXIT

#### LT-PRE-W04-T02 — 미커버분 처분(overlay admission 회부 또는 명시적 출시 제외)을 판정한다
- 유형/실행/리스크/가중치: decision / hybrid / B / M
- 목표: uncovered/partial 전건이 overlay admission 회부 또는 명시적 deferred 판정 중 하나로 처분되어 무원장 작업·등재 경로 이중화가 차단된 상태.
- 산출물: ① 처분 결정 대장 docs/launch/gap-disposition-register.md (신규 — 전건 처분·결정자·일자) ② 회부 대상의 요구 후보 명세(matter-pack overlay admission 절차 입력 형식)
- 참조: workbook/matter-post-cp-launch-plan.md §4-4, §3; docs/matter-pack-integration/matter-pack-full-integration-plan.md; docs/matter-pack-integration/matter-pack-requirement-candidates.md
- 선행: LT-PRE-W04-T01
- 완료 기준:
  1. 처분 대장 행 수 = T01의 uncovered/partial 행 수(누락 0)
  2. 각 처분이 {overlay_admission_referral, deferred_explicit} 중 하나이고 결정자·일자가 기재된다
  3. Work Queue·Issue Ledger 해당 영역(R5·R6)이 deferred로 판정된 경우 Wave 1 컷라인 영향 BLOCK 기록이 존재한다
- 검증 계약: method: 1) 두 문서의 행 수 grep 카운트 동치 대조 2) 처분 enum 위반 grep(허용 외 값 0건) 3) R5·R6 행 판정 수동 확인 / evidence: 출력·대장 발췌를 docs/goal-closeout/lt-pre-w04/command-evidence.json에 귀속 / VC: VC-LNCH-DEC-001, VC-LNCH-DOC-001
- 게이트: PRE-EXIT
- terminal: true

---

## LT-PRE-W05 — privilege·HR 기밀분류 enum 확장 결정 (§4-5)

소급 비용이 큰 스키마 결정 — 관련 RP 런타임 전 필수. (User/Employee 분리는 MAT-DEC-02로 기결 — 본 WP 범위 아님.)

#### LT-PRE-W05-T01 — 기밀분류 enum 확장(privilege·HR-sensitive)을 결정한다
- 유형/실행/리스크/가중치: decision / hybrid / A / M
- 목표: 현행 4값(public/internal/confidential/restricted)에 privilege 부재인 상태에서, 확장 값 체계와 적용 시점이 관련 RP 런타임 착수 전에 결정된 상태.
- 산출물: ① 결정 브리프(현행 enum 사용처 전수 grep 목록 + 후보 값 체계 비교 — privilege 단일 추가 vs privilege+hr_sensitive 등) ② 결정 기록(확정 값 목록·적용 시점 — 06_오픈_결정_레지스터.md MAT-DEC-08 행 갱신, Codex 구현 회부)
- 참조: workbook/matter-post-cp-launch-plan.md §4-5; packages/domain/src/entities.js:1; workbook/matter_dev_docs/06_권한_보안_감사_거버넌스.md; workbook/matter_dev_docs/11_People_HR_Operations_Spec.md; workbook/absorption-package/06_오픈_결정_레지스터.md:17
- 선행: 없음 — entry point: 입력은 현행 코드 enum과 사양 문서뿐 — 다른 PRE TUW와 독립이며 런타임 RP 착수 전 시한
- 완료 기준:
  1. 브리프의 사용처 파일 목록 수 = `grep -rln "CONFIDENTIALITY_LEVELS" packages/ apps/` 출력 파일 수
  2. 결정 기록에 확정 값 전체가 닫힌 목록으로 나열되고 privilege 계열 값 ≥1 포함(미포함 결정 시 명시 사유)
  3. 적용 시점이 '관련 RP 런타임 착수 전'의 특정 경계(팩 ID 또는 phase)로 기재된다
- 검증 계약: method: 1) 위 grep 실행해 파일 수 대조 2) 결정 기록의 값 목록·적용 경계 수동 대조 3) 레지스터 MAT-DEC-08 행 갱신 확인 / evidence: grep 출력·결정 기록 발췌를 docs/goal-closeout/lt-pre-w05/command-evidence.json에 귀속 / VC: VC-LNCH-DEC-001, VC-HR-001
- 게이트: PRE-EXIT
- 권한·감사 영향: 기밀분류는 권한 평가·감사 이벤트 분류의 입력 — 확장은 값 가산만 허용하고 기존 4값의 의미 변경·완화는 금지. 비약화 논증 필요: 예

#### LT-PRE-W05-T02 — 확장 enum 스키마 명세와 Codex 구현 회부 패키지를 작성한다
- 유형/실행/리스크/가중치: schema / agent_implementation / B / M
- 목표: 결정된 값 체계가 영향 파일 전수·기존 합성 데이터 영향 판정·테스트 요구를 갖춘 구현 가능한 스키마 명세로 고정되어 Codex 구현 회부가 가능한 상태.
- 산출물: docs/launch/confidentiality-enum-extension-spec.md (신규 — 확정 값 정의, 영향 파일 전수 목록, 값별 권한·감사·HR 매핑 표, 회부 항목: packages/domain/src/entities.js 등 기존 파일 수정은 Codex 소관 명기)
- 참조: workbook/matter-post-cp-launch-plan.md §4-5; packages/domain/src/entities.js:1; workbook/matter_dev_docs/06_권한_보안_감사_거버넌스.md
- 선행: LT-PRE-W05-T01
- 완료 기준:
  1. 명세의 영향 파일 목록이 `grep -rln "CONFIDENTIALITY_LEVELS" packages/ apps/` 전수 결과와 일치(차이 0)
  2. 값별 권한·감사·HR 매핑 표에 빈 셀 0
  3. 기존 합성 데이터 영향 판정이 {무영향, 영향(전환 규칙 기재)} 중 하나로 기재된다
- 검증 계약: method: 1) grep 전수 결과와 명세 목록 diff(차이 0 판정) 2) 매핑 표 빈 셀 grep 3) 영향 판정 절 존재 확인 / evidence: diff·grep 출력을 docs/goal-closeout/lt-pre-w05/command-evidence.json에 귀속 / VC: VC-DATA-001, VC-REG-001, VC-HR-001
- 게이트: PRE-EXIT
- terminal: true

---

## LT-PRE-W06 — 외부 리드타임 착수 (§4-6)

전부 코드와 무관한 조직·외부 소요 — 가장 일찍 출발. 외부 3건은 각 1 TUW.

#### LT-PRE-W06-T01 — AMIC M365 테넌트 관리자 권한 확보를 확인하고 증적을 기록한다
- 유형/실행/리스크/가중치: gate_assembly / hybrid / B / L
- 목표: 리포에 확보 기록이 없는 테넌트 관리자 권한의 확보 상태가 확인되어, 확보/미확보 판정·보유자 역할·확인 일자가 증적으로 존재하는 상태(L3 M365 트랙 최조기 착수의 전제).
- 산출물: docs/launch/external-leadtime/m365-admin-access-confirmation.md (신규 — 확인 결과·보유자 역할·확인 방법·일자)
- 참조: workbook/matter-post-cp-launch-plan.md §4-6, §5 L3-7; workbook/launch-tuw/00_마스터_출시피라미드_스키마_레지스트리.md §H(EXT-M365-ADMIN)
- 선행: 없음 — entry point: 외부 조직 확인 사항으로 코드·타 TUW 입력 불요 — 리드타임상 즉시 출발
- 외부 의존: EXT-M365-ADMIN
- 완료 기준:
  1. 확인 기록에 {확보, 미확보} 판정 + 보유자 실명 역할 + 확인 일자가 기재된다
  2. 미확보인 경우 확보 절차·owner·예상 리드타임이 기재되고 BLOCK 항목으로 등재된다
  3. 기록이 L3-7(Entra 앱 등록·Graph 작업)의 선행 조건임을 명시하는 참조 절이 존재한다
- 검증 계약: method: 1) 기록 파일 존재 ls exit 0 2) 판정·역할·일자 3요소 수동 대조 3) 미확보 시 BLOCK 등재 확인 / evidence: 기록 전문을 docs/goal-closeout/lt-pre-w06/command-evidence.json에 귀속 / VC: VC-LNCH-DOC-001
- 게이트: PRE-EXIT

#### LT-PRE-W06-T02 — 외부 AI PIPA·비밀유지 법적 검토를 발주한다
- 유형/실행/리스크/가중치: decision / hybrid / B / M
- 목표: 외부 AI provider 사용에 대한 PIPA 처리위탁·국외이전·변호사 비밀유지 법적 검토가 범위 명세와 함께 담당 법률 검토자에게 착수 의뢰된 상태(Wave 2 전제 — 결과 반영은 L1-3 소관).
- 산출물: ① 검토 범위 명세서 docs/launch/external-leadtime/ai-legal-review-scope.md (신규 — 처리위탁/국외이전/비밀유지 3주제) ② 착수 결정·의뢰 기록(담당 역할·의뢰일·회신 기한)
- 참조: workbook/matter-post-cp-launch-plan.md §4-6, §5 L1-3; workbook/launch-tuw/00_마스터_출시피라미드_스키마_레지스트리.md §H(EXT-LEGAL-AI)
- 선행: 없음 — entry point: 법적 검토 리드타임은 코드와 무관 — 즉시 발주가 §4-6의 요지
- 외부 의존: EXT-LEGAL-AI
- 완료 기준:
  1. 범위 명세에 처리위탁·국외이전·비밀유지 3주제 절이 전부 존재한다
  2. 착수 기록에 담당 역할·의뢰일·회신 기한 3필드가 기재된다
  3. '검토 결과 수신 전이라도 착수 증적으로 본 TUW 완료, 결과 비준은 L1-3' 경계 문구가 명세에 존재한다
- 검증 계약: method: 1) 명세 3주제 절 grep(각 1건 이상) 2) 착수 기록 3필드 수동 대조 3) 경계 문구 grep / evidence: 명세·기록을 docs/goal-closeout/lt-pre-w06/command-evidence.json에 귀속 / VC: VC-LNCH-DEC-001, VC-LNCH-DOC-001
- 게이트: PRE-EXIT

#### LT-PRE-W06-T03 — 외부 침투테스트 업체 섭외에 착수한다
- 유형/실행/리스크/가중치: decision / hybrid / B / M
- 목표: L5-4의 차단 의존인 외부 침투테스트에 대해 범위 초안·업체 후보·일정 제약이 기록되고 섭외 접촉이 개시된 상태.
- 산출물: ① 침투테스트 범위 초안 docs/launch/external-leadtime/pentest-scope-draft.md (신규 — 권한 우회·tenant isolation·인증 세션·prompt injection 4영역) ② 섭외 착수 기록(후보 목록·접촉 증적·목표 계약 시점)
- 참조: workbook/matter-post-cp-launch-plan.md §4-6, §5 L5-4; workbook/launch-tuw/00_마스터_출시피라미드_스키마_레지스트리.md §H(EXT-PENTEST)
- 선행: 없음 — entry point: 섭외 리드타임은 코드와 무관 — 즉시 착수가 §4-6의 요지
- 외부 의존: EXT-PENTEST
- 완료 기준:
  1. 범위 초안에 4영역(권한 우회/tenant isolation/인증 세션/prompt injection) 절이 전부 존재한다
  2. 섭외 기록에 후보 업체 ≥1·접촉 증적·목표 계약 시점(L5 진입 전)이 기재된다
  3. 일정 제약 미충족 위험 시의 에스컬레이션 경로가 기재된다
- 검증 계약: method: 1) 범위 초안 4영역 절 grep 2) 섭외 기록 3요소 수동 대조 3) 에스컬레이션 절 존재 확인 / evidence: 초안·기록을 docs/goal-closeout/lt-pre-w06/command-evidence.json에 귀속 / VC: VC-LNCH-DEC-001, VC-LNCH-DOC-001
- 게이트: PRE-EXIT

#### LT-PRE-W06-T04 — 외부 리드타임 3건 추적 대장을 만들고 WP 증거를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / C / L
- 목표: 3건의 owner·착수일·예상 리드타임·후속 차단 지점(L3-7 / L1-3 / L5-4)이 단일 대장으로 추적되고 WP 완료 증거가 조립된 상태.
- 산출물: docs/launch/external-leadtime/external-leadtime-register.md (신규)
- 참조: workbook/matter-post-cp-launch-plan.md §4-6, §6(외부 리드타임 병렬 선행); docs/goal-closeout-protocol.md
- 선행: LT-PRE-W06-T01, LT-PRE-W06-T02, LT-PRE-W06-T03
- 완료 기준:
  1. 대장 행 수 3 — 각 행에 owner·착수일·차단 지점 매핑이 기재되고 빈 셀 0
  2. 각 행이 T01~T03 증적 문서로 링크되며 3링크 전부 ls exit 0
  3. docs/goal-closeout/lt-pre-w06/command-evidence.json에 본 WP 4개 TUW의 귀속 항목이 전부 존재한다
- 검증 계약: method: 1) 대장 행 수 grep 카운트 2) 링크 경로 전수 ls 3) command-evidence.json의 TUW ID 4건 grep / evidence: 출력 전문을 동일 command-evidence.json에 귀속 / VC: VC-LNCH-DOC-001
- 게이트: PRE-EXIT
- terminal: true

---

## LT-PRE-W07 — 제품명 matter 전파 (§4-7, §1 체크리스트 5항목)

Risk C — CP 흐름과 병행. §1 체크리스트: ① 전략 선언문 §7·§8 갱신 ② 결정 레지스터 갱신 ③ 사용자 노출 표면 일관화 ④ L2-6 용어집 작업에 표기 규칙 포함 ⑤ 신규 산출물 표기 규칙.

#### LT-PRE-W07-T01 — 제품명 결정을 전략 문서·결정 레지스터·표기 규칙으로 전파한다
- 유형/실행/리스크/가중치: training_docs / agent_implementation / C / M
- 목표: §1 체크리스트 1·2·4·5항이 이행된 상태 — product-strategy-declaration §7 MAT-DEC-04 decided·§8 권고→확정 승격, 결정 레지스터 갱신, L2-6 용어집 인입 항목 명세, 신규 산출물 표기 규칙 문서화.
- 산출물: ① docs/product-strategy-declaration.md §7·§8 갱신(Codex 구현 회부) ② 06_오픈_결정_레지스터.md MAT-DEC-04 pending → 결정 갱신(Codex 구현 회부) ③ docs/launch/matter-naming-rules.md (신규 — 4층위 표기표·신규 산출물 규칙·L2-6 용어집 인입 항목 명세)
- 참조: workbook/matter-post-cp-launch-plan.md §1, §4-7; docs/product-strategy-declaration.md:25-31; workbook/absorption-package/06_오픈_결정_레지스터.md:17
- 선행: 없음 — entry point: 제품명 결정은 2026-06-12 소유자 지시로 기결(§1) — 전파만 남음
- 완료 기준:
  1. docs/product-strategy-declaration.md에서 `grep -c "Recommended convention"` 출력 0(확정 컨벤션 문구로 대체)이고 §7에 MAT-DEC-04 decided 표기 1건 이상
  2. 06_오픈_결정_레지스터.md에서 MAT-DEC-04의 pending 표기 0건·결정 표기 1건
  3. matter-naming-rules.md에 4층위 표기표(제품 브랜드/UI 브랜드/플랫폼 코드명/기계 식별자)와 '기계 식별자 리네이밍 금지' 조항이 존재한다
  4. L2-6 인입 항목(용어집에 제품명 표기 규칙 포함)이 명세 절로 존재한다
- 검증 계약: method: 1) grep 3종(Recommended/decided/pending) 카운트 기록 2) 표기표·금지 조항·인입 절 grep 존재 판정 / evidence: grep 출력을 docs/goal-closeout/lt-pre-w07/command-evidence.json에 귀속 / VC: VC-LNCH-DOC-001
- 게이트: PRE-EXIT

#### LT-PRE-W07-T02 — 사용자 노출 표면 브랜드 문구를 일관화하고 체크리스트 5항목 완료를 대조한다
- 유형/실행/리스크/가중치: ui / agent_implementation / C / L
- 목표: §1 체크리스트 3항 이행 — apps/web 사용자 노출 문구가 'matter by AMIC'로 통일(현재 MatterLogo aria-label 'matter by AMIC Law' 불일치)되고, 체크리스트 5항목 전체의 완료 대조표가 존재하는 상태.
- 산출물: ① apps/web/src/components/MatterLogo.jsx aria-label 수정(Codex 구현 회부 — UI 비CP 트랙 규칙 적용) ② 사용자 노출 문구 grep 감사 결과 ③ §1 체크리스트 5항목 완료 대조표(docs/launch/matter-naming-rules.md 부록 절)
- 참조: workbook/matter-post-cp-launch-plan.md §1 체크리스트 3; apps/web/src/components/MatterLogo.jsx:6; docs/ui-workstream-conventions.md
- 선행: LT-PRE-W07-T01
- 완료 기준:
  1. `grep -rn "matter by AMIC Law" apps/web/src` 출력 0건
  2. MatterLogo.jsx의 aria-label 값이 정확히 "matter by AMIC"(grep 1건)
  3. 대조표에 체크리스트 5항목 행이 전부 존재하고 각 행 판정이 {완료, 회부(링크)} — 빈 판정 0
- 검증 계약: method: 1) 위 grep 2종 실행해 카운트·exit code 기록 2) 대조표 행 수·판정 grep 3) `npm test` exit 0(회귀) / evidence: grep·테스트 출력을 docs/goal-closeout/lt-pre-w07/command-evidence.json에 귀속 / VC: VC-FUNC-001, VC-PERM-001, VC-REG-001
- 게이트: PRE-EXIT
- terminal: true
