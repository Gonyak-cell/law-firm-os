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

---

## LT-PRE-W08 — canonical tenant injection G0/S0 착수 게이트

`workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md` §7의 첫 작업 묶음을 launch-TUW 형식으로 인스턴스화한다. CTI 원문 항목(`S0-Txx`)은 본 WP의 `LT-PRE-W08-Txx`로 crosswalk한다. 기존 `contracts/production-data-policy-contract.json`이 미재가 상태이므로, I4 전에는 로컬 문서·정적 인벤토리만 허용하고 production credential, product state write, 실데이터 접촉 가능성이 있는 probe는 BLOCKED로 증거화한다.

#### LT-PRE-W08-T01 — CTI 결정 레지스터를 정식화한다
- 유형/실행/리스크/가중치: decision / agent_implementation / B / L
- 목표: canonical tenant injection v2.1 실행 지시서의 D-01~D-10과 I1~I4를 launch 결정 표면으로 전사하고, 이 전사가 어떤 승인이나 쓰기 권한도 생성하지 않는다는 경계를 명시한다.
- 산출물: ① docs/launch/cti-decision-register-2026-07-06.md ② docs/goal-closeout/cti-g0-s0/packet.json
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §1; contracts/production-data-policy-contract.json
- 선행: 없음 — entry point: CTI 착수는 소유자 확정 결정의 전사를 먼저 요구하며, 이 단계는 로컬 문서 작업만 수행한다.
- 완료 기준:
  1. D-01~D-10 전건이 decision register 표에 존재한다.
  2. I1~I4 전건이 owner input 표에 존재한다.
  3. register에 production write, migration, cutover, password distribution, owner approval completion non-claim이 명시되어 있다.
- 검증 계약: method: 1) decision register에서 D-01~D-10 및 I1~I4 행 수를 grep으로 확인 2) non-claim 문구 존재 확인 3) packet.json artifact 경로와 SHA256 앵커를 대조 / evidence: grep 출력과 SHA256 앵커를 docs/goal-closeout/cti-g0-s0/command-evidence.json에 보존 / VC: VC-LNCH-DEC-001, VC-LNCH-DOC-001
- 게이트: PRE-EXIT

#### LT-PRE-W08-T02 — production-data-policy CTI 범위 재가 패킷을 생성한다
- 유형/실행/리스크/가중치: decision / hybrid / A / L
- 목표: 기존 production-data-policy 계약의 draft 상태와 미재가 효과를 보존하면서, CTI 범위 한정 발효 요청·비약화 논증·서명란·approval unit 필드를 담은 I4 재가 패킷을 소유자에게 제출 가능한 상태로 만든다.
- 산출물: ① docs/launch/cti-production-data-policy-ratification-packet-2026-07-06.md ② docs/goal-closeout/cti-g0-s0/adjudication.md
- 참조: contracts/production-data-policy-contract.json; docs/launch/production-data-policy-non-weakening-argument.md; workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §1-I
- 선행: LT-PRE-W08-T01
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. 재가 패킷에 contract SHA256, source plan SHA256, goal_id, tenant/environment, data_categories, data_source, purpose, time_window, approver_role, approval_signature_ref, audit_event_schema_ref 필드가 존재한다.
  2. 재가 패킷에 owner signature block이 존재하고 decision/signature/signed_at이 pending으로 남아 있다.
  3. 패킷은 agent_may_approve=false 경계를 약화하지 않으며, I4 전 금지 행위를 명시한다.
- 검증 계약: method: 1) 패킷 표 필드 grep 2) signature block pending 값 확인 3) contract status=draft_pending_human_ratification과 unratified effect 필드 대조 / evidence: 패킷 필드 대조와 계약 상태 대조를 docs/goal-closeout/cti-g0-s0/command-evidence.json에 보존 / VC: VC-LNCH-DEC-001, VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: CTI 범위 한정 production-data-policy 재가는 이후 실데이터 접촉과 프로덕션 크리덴셜 사용의 상위 허가 경계가 된다. 이 TUW는 패킷만 만들고 인간 승인 자체는 완료로 주장하지 않는다.

#### LT-PRE-W08-T03 — S0 로컬 전용 프로브 인벤토리를 작성한다
- 유형/실행/리스크/가중치: runtime_read / agent_implementation / C / M
- 목표: I4 전에도 허용되는 정적 리포 검사만 수행해 S0-T02 persistence census, S0-T05 desktop seed drift 입력, S0-T07 real_client_data_used 사이트 인벤토리의 초기 목록과 후속 전환 방식을 작성한다.
- 산출물: ① docs/launch/cti-s0-probe-boundary-register-2026-07-06.md ② docs/goal-closeout/cti-g0-s0/command-evidence.json
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 Stage 0; scripts/run-lcx-vltui-production-smoke.mjs; scripts/smoke-matter-desktop-aws-runtime.mjs; scripts/drill-matter-vault-backup-restore.mjs
- 선행: LT-PRE-W08-T01
- 완료 기준:
  1. boundary register에 S0-T01~S0-T08 전건이 local allowed 또는 blocked state로 분류되어 있다.
  2. real_client_data_used 관련 값 생산·hard assert 후보 사이트가 파일 경로 단위로 7개 이상 기록되어 있다.
  3. 프로덕션 credential이나 실데이터 readback을 실행하지 않았다는 blocked_commands_not_run 항목이 command evidence에 존재한다.
- 검증 계약: method: 1) boundary register의 S0-T 행 수 grep 2) real_client_data_used 후보 경로 수 grep 3) command-evidence blocked_commands_not_run 배열 확인 / evidence: 정적 grep 출력과 blocked_commands_not_run 목록을 docs/goal-closeout/cti-g0-s0/command-evidence.json에 보존 / VC: VC-FUNC-001, VC-PERM-001, VC-REG-001
- 게이트: PRE-EXIT

#### LT-PRE-W08-T04 — I4 전 risk-A 프로브 차단 상태를 증거화한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: S0-T01/S0-T03/S0-T04/S0-T06이 I4 전에는 생산 크리덴셜, product state write, 실데이터 접촉 가능성 때문에 실행 불가임을 closeout evidence와 boundary register에 명시하고, 특히 S0-T04가 나중에 S0-T03보다 선행해야 한다는 순서 제약을 보존한다.
- 산출물: ① docs/launch/cti-s0-probe-boundary-register-2026-07-06.md ② docs/goal-closeout/cti-g0-s0/construction-inspection.json ③ docs/goal-closeout/cti-g0-s0/command-evidence.json
- 참조: contracts/production-data-policy-contract.json; workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §2; workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 Stage 0
- 선행: LT-PRE-W08-T02
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. S0-T01, S0-T03, S0-T04, S0-T06이 BLOCKED_PENDING_I4 또는 동등한 차단 상태로 기록되어 있다.
  2. S0-T04 production store readback snapshot이 나중에 S0-T03 cold-start marker probe보다 선행해야 한다는 순서 제약이 기록되어 있다.
  3. construction-inspection.json final_verdict가 BLOCKED_PENDING_I4_FOR_RISK_A_EXECUTION 또는 동등한 blocked verdict를 담는다.
- 검증 계약: method: 1) blocked S0 item 4건 grep 2) T04 before T03 순서 문구 grep 3) construction inspection final_verdict 확인 / evidence: 차단 상태 대조를 docs/goal-closeout/cti-g0-s0/command-evidence.json에 보존 / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: I4 전 실행 차단을 명시해 production credentials, product state writes, real-data readback을 fail-closed로 둔다. 이 TUW는 실행이 아니라 차단 증거 조립이다.

#### LT-PRE-W08-T05 — CTI G0/S0 goal-closeout 증거와 TUW crosswalk를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / C / L
- 목표: CTI-S0 항목과 LT-PRE-W08 원장 항목의 crosswalk, goal-closeout packet, command evidence, adjudication, construction inspection을 한 폴더에 조립하고, I4 부재 시 후속 risk-A 실행으로 넘어가지 않는 blocked closeout 경계를 확정한다.
- 산출물: ① docs/goal-closeout/cti-g0-s0/ ② docs/launch/cti-tuw-crosswalk-2026-07-06.json ③ docs/launch/cti-tuw-crosswalk-2026-07-06.md
- 참조: docs/goal-closeout/README.md; docs/goal-closeout-protocol.md; workbook/launch-tuw/launch-tuw-ledger.json; workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §7
- 선행: LT-PRE-W08-T01, LT-PRE-W08-T02, LT-PRE-W08-T03, LT-PRE-W08-T04
- 완료 기준:
  1. docs/goal-closeout/cti-g0-s0/에 packet, command-evidence, adjudication, construction-inspection 파일이 존재한다.
  2. launch-TUW ledger와 10_PRE.md가 LT-PRE-W08-T01~T05 전건을 포함하고 validate-launch-tuw-ledger.mjs가 PASS한다.
  3. I4 부재 시 후속 S1~S6, CUTOVER, password distribution, production write/migration을 out-of-scope로 유지하는 closeout 문구가 존재한다.
- 검증 계약: method: 1) goal-closeout 파일 ls 2) node workbook/launch-tuw/validate-launch-tuw-ledger.mjs 3) out-of-scope 문구 grep / evidence: 검증 출력과 파일 존재 판정을 docs/goal-closeout/cti-g0-s0/command-evidence.json에 보존 / VC: VC-LNCH-DOC-001
- 게이트: PRE-EXIT
- terminal: true

---

## LT-PRE-W09 — canonical tenant injection S1 FOUNDATION stop-condition closeout

`workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md` Stage 1의 S1 FOUNDATION을 launch-TUW 형식으로 인스턴스화한다. 이 WP는 S1 생산 쓰기 실행이 아니라, S0-G 완료와 I4 기록을 입력으로 삼아 S1 착수 가능 여부를 판정하고 stop condition이 발동되면 `BLOCKED_S1_STOP_CONDITION` closeout으로 닫는다.

#### LT-PRE-W09-T01 — S1 FOUNDATION 입력 게이트를 고정한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: S0-G 완료, I4 approval_signature_ref, S0-T01 EFS=0/STORE_PATH=0, S0-T03 marker_lost_after_cold_start, S0-T04 readback snapshot hash를 S1 closeout packet에 고정하고 이 입력만으로는 production write 권한이 생기지 않는다는 경계를 명시한다.
- 산출물: ① docs/goal-closeout/cti-s1-foundation/packet.json ② docs/goal-closeout/cti-s1-foundation/command-evidence.json
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 Stage 1; docs/goal-closeout/cti-g0-s0/packet.json; docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json; docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json; docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json
- 선행: WP:LT-PRE-W08 — entry point: S1 FOUNDATION은 completed G0/S0 closeout을 입력으로만 받을 수 있으며, 먼저 S0 evidence를 고정해야 한다.
- 완료 기준:
  1. packet.json에 approval_signature_ref I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06가 존재한다.
  2. packet.json의 s0_inputs에 EFS=0, STORE_PATH env key count=0, marker_lost_after_cold_start, S0-T04 snapshot hash가 모두 존재한다.
  3. packet.json non_claims에 s1_foundation_complete와 production_ready가 모두 존재한다.
- 검증 계약: method: 1) packet.json 필드 대조 2) S0 receipt JSON 파싱 3) SHA256 anchor 재계산 / evidence: docs/goal-closeout/cti-s1-foundation/command-evidence.json 및 scripts/validate-cti-s1-foundation-closeout.mjs 출력 / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: I4 G0/S0 evidence is consumed as an input only; this TUW does not authorize S1 production write, infrastructure mutation, secret value access, or migration.

#### LT-PRE-W09-T02 — S1 durable runtime target inventory를 판정한다
- 유형/실행/리스크/가중치: runtime_read / agent_implementation / A / M
- 목표: Matter production Lambda, VPC, subnet, security group, EFS, access point, session-signing secret existence를 값 노출 없이 read-only로 확인하고 S1-T01a/T01b/T03의 durable target 적용 가능 여부를 판정한다.
- 산출물: ① docs/launch/cti-s1-foundation-aws-inventory-2026-07-06.json ② docs/launch/cti-s1-foundation-blocker-register-2026-07-06.md
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 Stage 1; docs/runbooks/aws-sso-role-chain.md; docs/launch/cti-s1-branch-assessment-2026-07-06.json
- 선행: LT-PRE-W09-T01
- 완료 기준:
  1. AWS inventory에 Lambda FileSystemConfigs null, VpcConfig null, STORE_PATH env key count 0이 기록되어 있다.
  2. AWS inventory에 EFS file_system_count 0과 access_point_count 0이 기록되어 있다.
  3. secret inventory는 session-signing secret 존재만 기록하고 secret_value_fetched=false를 유지한다.
- 검증 계약: method: 1) AWS inventory JSON 파싱 2) secret_value_fetched=false 대조 3) S1 blocker register의 S1-B01/S1-B02/S1-B04 행 존재 확인 / evidence: read-only AWS command summaries and docs/launch/cti-s1-foundation-aws-inventory-2026-07-06.json / VC: VC-FUNC-001, VC-PERM-001, VC-REG-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Uses production credentials for masked read-only inventory only. It must not fetch secret values, create EFS, update Lambda, or write product state.

#### LT-PRE-W09-T03 — S1 app foundation gaps를 판정한다
- 유형/실행/리스크/가중치: runtime_read / agent_implementation / A / M
- 목표: STORE_PATH_MANIFEST, session auth audit storage, session secret resolution, backup/restore drill schema를 repo-local로 검사해 S1-T02/T03/T05가 현재 코드와 runbook으로 완료 불가한 지점을 blocker register에 고정한다.
- 산출물: ① docs/launch/cti-s1-foundation-blocker-register-2026-07-06.md ② docs/goal-closeout/cti-s1-foundation/construction-inspection.json
- 참조: apps/api/src/store-path-manifest.js; apps/api/src/session-auth.js; apps/api/src/runtime-profile.js; scripts/drill-matter-vault-backup-restore.mjs; docs/runbooks/store-env-catalog.md
- 선행: LT-PRE-W09-T01
- 완료 기준:
  1. blocker register에 LAWOS_AUDIT_STORE_PATH 부재와 securityAuditEvents in-memory 상태가 S1-B03으로 기록되어 있다.
  2. blocker register에 session-signing secret 존재와 runtime 미연결 상태가 S1-B04로 기록되어 있다.
  3. blocker register에 synthetic-only restore drill schema가 S1-B05로 기록되어 있다.
- 검증 계약: method: 1) rg로 audit/session/restore gap 확인 2) blocker register S1-B03~S1-B05 grep 3) construction-inspection.json blocker 결과 대조 / evidence: docs/goal-closeout/cti-s1-foundation/command-evidence.json and scripts/validate-cti-s1-foundation-closeout.mjs / VC: VC-FUNC-001, VC-PERM-001, VC-REG-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Repo-local inspection only. It must not change audit storage, session secret handling, backup/restore behavior, or any runtime data.

#### LT-PRE-W09-T04 — S1 stop-condition을 adjudication한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: durable store target, durable audit path, rollback/restore path 중 하나라도 부재하면 S1 write를 시작하지 않는 stop condition을 적용하고 commands_not_run 목록으로 EFS, Lambda env, restore rehearsal, production store migration 차단을 기록한다.
- 산출물: ① docs/goal-closeout/cti-s1-foundation/adjudication.md ② docs/goal-closeout/cti-s1-foundation/construction-inspection.json ③ docs/goal-closeout/cti-s1-foundation/command-evidence.json
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 Stage 1; docs/launch/cti-s1-foundation-aws-inventory-2026-07-06.json; docs/launch/cti-s1-foundation-blocker-register-2026-07-06.md
- 선행: LT-PRE-W09-T02, LT-PRE-W09-T03
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. construction-inspection.json final_verdict가 BLOCKED_S1_STOP_CONDITION이다.
  2. command-evidence.json commands_not_run에 aws efs create-file-system, aws lambda update-function-configuration, production store migration or restore rehearsal이 존재한다.
  3. adjudication.md가 S1 FOUNDATION is blocked by the goal stop condition, not complete 문구를 포함한다.
- 검증 계약: method: 1) construction-inspection.json final_verdict 확인 2) command-evidence.json commands_not_run 대조 3) adjudication.md blocked/not complete 문구 grep / evidence: docs/goal-closeout/cti-s1-foundation/ / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: This TUW blocks production mutation and records no-write boundaries. Owner approval is required only for a future unblock packet, not completed here.

#### LT-PRE-W09-T05 — CTI S1 blocked closeout과 crosswalk를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: cti-s1-foundation goal-closeout 5종, AWS inventory, blocker register, S1 launch-TUW crosswalk, S1 validator를 조립하고 S2, S3 migration, CUTOVER, password issuance, production_ready, go-live가 모두 non-claim 상태임을 검증한다.
- 산출물: ① docs/goal-closeout/cti-s1-foundation/ ② docs/launch/cti-s1-tuw-crosswalk-2026-07-06.json ③ docs/launch/cti-s1-tuw-crosswalk-2026-07-06.md ④ scripts/validate-cti-s1-foundation-closeout.mjs
- 참조: docs/goal-closeout/README.md; docs/goal-closeout-protocol.md; workbook/launch-tuw/launch-tuw-ledger.json; workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 Stage 1
- 선행: LT-PRE-W09-T01, LT-PRE-W09-T02, LT-PRE-W09-T03, LT-PRE-W09-T04
- 완료 기준:
  1. docs/goal-closeout/cti-s1-foundation/에 packet, command-evidence, adjudication, construction-inspection, claude-review-result 파일이 존재한다.
  2. cti-s1-tuw-crosswalk JSON에 S1-G blocked_s1_stop_condition mapping이 존재한다.
  3. node scripts/validate-cti-s1-foundation-closeout.mjs와 node workbook/launch-tuw/validate-launch-tuw-ledger.mjs가 PASS한다.
- 검증 계약: method: 1) goal-closeout 파일 ls 2) S1 crosswalk JSON 파싱 3) S1 closeout validator 실행 4) launch-TUW ledger validator 실행 / evidence: docs/goal-closeout/cti-s1-foundation/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Assembles blocked closeout evidence only. It preserves non-claims for S2/S3/CUTOVER/passwords/production_ready/go-live and does not create execution authority.
- terminal: true

---

## LT-PRE-W10 — canonical tenant injection S1 FOUNDATION unblock packet

`workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md` Stage 1의 S1 FOUNDATION blocker를 해소하기 위한 approval-ready packet을 작성한다. 이 WP는 선택지 확정과 승인 문안 작성까지만 수행하며, EFS 생성·Lambda 설정 변경·secret value 조회·production store migration·restore 실행은 하지 않는다.

#### LT-PRE-W10-T01 — S1 durable store target과 STORE_PATH mapping을 확정한다
- 유형/실행/리스크/가중치: decision / agent_implementation / A / L
- 목표: S1-T01a/T01b blocker 해소를 위해 EFS durable store target, VPC, subnet, SG, access point, mount path, 13개 STORE_PATH mapping을 approval-ready packet에 고정하되 EFS 생성이나 Lambda 설정 변경은 실행하지 않는다.
- 산출물: ① docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md ② docs/goal-closeout/cti-s1-foundation-unblock-packet/packet.json
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 Stage 1; docs/launch/cti-s1-foundation-aws-inventory-2026-07-06.json; apps/api/src/store-path-manifest.js
- 선행: WP:LT-PRE-W09
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. unblock packet에 EFS file system name, VPC, 2개 subnet, Lambda SG, EFS SG, access point, root, mount path가 모두 존재한다.
  2. unblock packet에 13개 STORE_PATH env가 모두 /mnt/lawos/stores 경로로 매핑되어 있다.
  3. packet authority_boundary가 EFS creation과 Lambda configuration mutation을 false로 유지한다.
- 검증 계약: method: 1) unblock packet 필드 grep 2) STORE_PATH env 13개 카운트 3) packet.json authority_boundary 대조 / evidence: scripts/validate-cti-s1-unblock-packet-closeout.mjs 출력 / VC: VC-LNCH-DEC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Selects S1 durable target choices for owner approval only. It does not run tenant provisioning, infrastructure mutation, or production migration.

#### LT-PRE-W10-T02 — S1 durable audit와 session secret injection path를 확정한다
- 유형/실행/리스크/가중치: decision / agent_implementation / A / L
- 목표: S1-T02/T03 blocker 해소를 위해 LAWOS_AUDIT_STORE_PATH append-only NDJSON 설계와 LAWOS_API_SESSION_SECRET_SECRET_ID 기반 runtime Secrets Manager fetch 방식을 approval-ready packet에 고정하되 secret value를 조회하지 않는다.
- 산출물: ① docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md ② docs/goal-closeout/cti-s1-foundation-unblock-packet/adjudication.md
- 참조: apps/api/src/session-auth.js; apps/api/src/runtime-profile.js; docs/launch/cti-s1-foundation-blocker-register-2026-07-06.md
- 선행: LT-PRE-W10-T01
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. unblock packet에 LAWOS_AUDIT_STORE_PATH=/mnt/lawos/audit/security-audit-events.ndjson와 manifest/preflight/backup 포함 계획이 존재한다.
  2. unblock packet에 LAWOS_API_SESSION_SECRET_SECRET_ID=/amic-vault/prod/api/session-signing 및 runtime Secrets Manager fetch 방식이 존재한다.
  3. packet과 command evidence가 secret value fetch를 false 또는 not run으로 기록한다.
- 검증 계약: method: 1) audit env/path grep 2) session secret injection fields grep 3) secret_value_fetched=false 대조 / evidence: scripts/validate-cti-s1-unblock-packet-closeout.mjs 출력 / VC: VC-LNCH-DEC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Selects security and audit design only. It does not fetch secret values, mutate Lambda env, or write audit/product state.

#### LT-PRE-W10-T03 — S1 backup/restore v0.2 boundary를 확정한다
- 유형/실행/리스크/가중치: ops_runbook / agent_implementation / A / L
- 목표: S1-T05 blocker 해소를 위해 real-data-safe backup/restore v0.2 schema, hash-only receipt, isolated restore rehearsal target, rollback boundary를 approval-ready packet에 고정하되 backup 또는 restore를 실행하지 않는다.
- 산출물: ① docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md ② docs/goal-closeout/cti-s1-foundation-unblock-packet/construction-inspection.json
- 참조: scripts/drill-matter-vault-backup-restore.mjs; docs/launch/cti-s1-foundation-blocker-register-2026-07-06.md; workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 Stage 1
- 선행: LT-PRE-W10-T01, LT-PRE-W10-T02
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. unblock packet에 backup/restore/drill schema v0.2 식별자가 모두 존재한다.
  2. unblock packet에 real_client_data_used=true와 hash/count-only receipt boundary가 존재한다.
  3. unblock packet에 isolated restore rehearsal target과 production_restore_executed=false boundary가 존재한다.
- 검증 계약: method: 1) v0.2 schema 식별자 grep 2) real_client_data_used=true grep 3) restore target 및 no-restore boundary 대조 / evidence: scripts/validate-cti-s1-unblock-packet-closeout.mjs 출력 / VC: VC-LNCH-OPS-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Defines backup and restore boundaries only. It does not run backup, restore, production migration, or rollback.

#### LT-PRE-W10-T04 — I5 approval boundary와 S1 execute 차단을 adjudication한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: required approval_ref I5를 packet과 closeout에 명시하고 owner signature 전에는 S1 execute가 차단된다는 판정을 남긴다.
- 산출물: ① docs/goal-closeout/cti-s1-foundation-unblock-packet/adjudication.md ② docs/goal-closeout/cti-s1-foundation-unblock-packet/construction-inspection.json
- 참조: docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md; docs/goal-closeout/cti-s1-foundation-unblock-packet/packet.json
- 선행: LT-PRE-W10-T01, LT-PRE-W10-T02, LT-PRE-W10-T03
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. packet에 approval text와 required approval_ref I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06가 존재한다.
  2. construction-inspection.json이 BLOCKED_UNTIL_I5_OWNER_APPROVAL을 기록한다.
  3. adjudication.md가 S1 execute remains blocked until owner approval 문구를 포함한다.
- 검증 계약: method: 1) required approval_ref grep 2) construction-inspection boundary 대조 3) adjudication blocked 문구 grep / evidence: docs/goal-closeout/cti-s1-foundation-unblock-packet/ / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Records that S1 execute remains blocked until owner approval. It does not treat the packet as execution authority.

#### LT-PRE-W10-T05 — S1 unblock packet closeout과 validator를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: unblock packet, crosswalk, goal-closeout 5종, validator를 조립하고 launch-TUW ledger validation과 S1 unblock validator가 PASS하는 상태로 만든다.
- 산출물: ① docs/goal-closeout/cti-s1-foundation-unblock-packet/ ② docs/launch/cti-s1-foundation-unblock-crosswalk-2026-07-06.json ③ docs/launch/cti-s1-foundation-unblock-crosswalk-2026-07-06.md ④ scripts/validate-cti-s1-unblock-packet-closeout.mjs
- 참조: docs/goal-closeout/README.md; docs/goal-closeout-protocol.md; workbook/launch-tuw/launch-tuw-ledger.json; workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 Stage 1
- 선행: LT-PRE-W10-T01, LT-PRE-W10-T02, LT-PRE-W10-T03, LT-PRE-W10-T04
- 완료 기준:
  1. docs/goal-closeout/cti-s1-foundation-unblock-packet/에 packet, command-evidence, adjudication, construction-inspection, claude-review-result 파일이 존재한다.
  2. cti-s1-foundation-unblock-crosswalk JSON에 LT-PRE-W10과 blocked_until_i5_owner_approval mapping이 존재한다.
  3. node scripts/validate-cti-s1-unblock-packet-closeout.mjs와 node workbook/launch-tuw/validate-launch-tuw-ledger.mjs가 PASS한다.
- 검증 계약: method: 1) goal-closeout 파일 ls 2) crosswalk JSON 파싱 3) S1 unblock validator 실행 4) launch-TUW ledger validator 실행 / evidence: docs/goal-closeout/cti-s1-foundation-unblock-packet/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Assembles packet-ready evidence only. It preserves non-claims for production writes and S1 execute until owner approval.
- terminal: true

---

## LT-PRE-W11 — canonical tenant injection S1 FOUNDATION execute

`workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md` Stage 1의 I5/I6 승인 후 S1 FOUNDATION execute 범위만 적용·검증한다. S2 인증 구현은 범위 밖이므로 인증된 production marker/audit probe가 불가능하면 S1-G 해당 항목을 별도 blocker로 adjudication하고 후속 S2/S3/CUTOVER로 넘어가지 않는다.

#### LT-PRE-W11-T01 — I5/I6 승인 상태와 S1 execute AWS 선행조건을 재확인한다
- 유형/실행/리스크/가중치: runtime_read / agent_implementation / A / L
- 목표: I5/I6 approval_ref가 기록된 상태에서 production Lambda, EFS, Secrets Manager VPCE, Lambda role policy 상태를 재조회해 승인 범위와 현재 AWS 상태를 대조한다.
- 산출물: ① docs/goal-closeout/cti-s1-foundation-execute/command-evidence.json ② docs/launch/cti-s1-foundation-execute-crosswalk-2026-07-06.json
- 참조: docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md; docs/runbooks/aws-sso-role-chain.md
- 선행: WP:LT-PRE-W10
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. I5 approval_signature_ref가 closeout packet에 approved로 기록되어 있다.
  2. I6 approval_signature_ref가 closeout packet에 approved로 기록되어 있다.
  3. AWS evidence가 EFS/AP/mount target, Secrets Manager VPCE, Lambda VPC/EFS mount, STORE_PATH env key, Lambda role policies를 secret-value 없이 기록한다.
- 검증 계약: method: 1) I5/I6 승인 필드 jq 2) Lambda config jq 3) EFS/AP/VPCE/IAM/SG 조회 결과 대조 / evidence: docs/goal-closeout/cti-s1-foundation-execute/command-evidence.json / VC: VC-FUNC-001, VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Read-only AWS verification after approved S1/I6 infra mutation; no secret value, production store migration, restore execution, password issuance, OIDC, DB conversion, production_ready, or go-live claim.

#### LT-PRE-W11-T02 — S1 infrastructure/IAM/Lambda runtime scope를 적용한다
- 유형/실행/리스크/가중치: infra / agent_implementation / A / L
- 목표: I5/I6 승인 범위 안에서 EFS durable store target, access point, mount targets, SG rules, Secrets Manager VPCE, Lambda VPC/EFS mount, operational STORE_PATH env, LAWOS_AUDIT_STORE_PATH, LAWOS_API_SESSION_SECRET_SECRET_ID를 적용한다.
- 산출물: ① EFS/AP/SG/VPCE AWS evidence ② Lambda configuration evidence ③ docs/goal-closeout/cti-s1-foundation-execute/command-evidence.json
- 참조: docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md; docs/runbooks/aws-sso-role-chain.md
- 선행: LT-PRE-W11-T01
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. EFS `matter-lawos-prod-cti-s1-efs`와 access point `matter-lawos-prod-runtime-ap`가 available이다.
  2. Lambda `matter-lawos-api-prod`가 `/mnt/lawos` EFS mount, approved VPC/subnets/SG, operational STORE_PATH env key를 가진다.
  3. Lambda role이 AWSLambdaVPCAccessExecutionRole, session-secret read inline policy, EFS client inline policy를 가진다.
- 검증 계약: method: 1) AWS EFS/AP/SG/VPCE/IAM/Lambda 조회 2) env values 미출력 확인 3) secret value fetch 미실행 확인 / evidence: docs/goal-closeout/cti-s1-foundation-execute/command-evidence.json / VC: VC-LNCH-INF-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Applies owner-approved infra/IAM/Lambda runtime configuration only. It does not perform production store migration, restore execution, S2/S3/S4/S5/S6, CUTOVER, password issuance, OIDC, DB conversion, production_ready, or go-live.

#### LT-PRE-W11-T03 — S1 repo-local tests와 production boundary probes를 검증한다
- 유형/실행/리스크/가중치: runtime_write / agent_implementation / A / L
- 목표: LAWOS_AUDIT_STORE_PATH manifest/preflight, runtime secret-id bootstrap, operational fixed-secret verification, reseed guard, backup/restore v0.2 tests와 production runtime boundary probes를 검증한다.
- 산출물: ① apps/api/src/store-path-manifest.js ② apps/api/src/session-auth.js ③ apps/api/src/lambda.js ④ scripts/drill-matter-vault-backup-restore.mjs ⑤ docs/goal-closeout/cti-s1-foundation-execute/construction-inspection.json
- 참조: docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md; apps/api/test/session-auth-api.test.js; apps/api/test/admin-security-durable-audit.test.js; apps/api/test/lambda-session-secret.test.js; scripts/test/matter-vault-backup-restore.test.mjs; packages/matter/test/runtime-services.test.js
- 선행: LT-PRE-W11-T02
- 완료 기준:
  1. store-path-preflight validator가 LAWOS_AUDIT_STORE_PATH와 LAWOS_API_SESSION_SECRET_SECRET_ID를 포함해 PASS한다.
  2. session/auth tests가 operational fixed secret cold-start verification을 PASS한다.
  3. backup/restore tests가 v0.2 real_client_data_used isolated rehearsal boundary를 PASS한다.
  4. Matter repository tests가 reseed guard carve-out을 PASS한다.
  5. production `/api/health`가 operational 200이고 synthetic login disabled 403, unauthenticated audit 401 경계를 기록한다.
- 검증 계약: method: 1) node --check 2) node --test targeted suites 3) store-path-preflight validator 4) safe production health/auth-boundary probes / evidence: docs/goal-closeout/cti-s1-foundation-execute/command-evidence.json / VC: VC-FUNC-001, VC-PERM-001, VC-AUD-001, VC-DATA-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Validates runtime-write code paths locally and production auth boundary safely; no secret value fetch, production store migration, restore execution, password issuance, OIDC, DB conversion, production_ready, or go-live claim.

#### LT-PRE-W11-T04 — S1-G 인증 probe blocker와 closeout 5종을 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: S2 인증이 범위 밖인 상태에서 인증된 production marker/audit probe가 불가능함을 adjudication하고, S1 applied evidence와 S1-G blocker를 분리해 closeout 5종과 CTI/launch-TUW crosswalk를 조립한다.
- 산출물: ① docs/goal-closeout/cti-s1-foundation-execute/ ② docs/launch/cti-s1-foundation-execute-blocker-register-2026-07-06.md ③ docs/launch/cti-s1-foundation-execute-crosswalk-2026-07-06.json ④ docs/launch/cti-s1-foundation-execute-crosswalk-2026-07-06.md
- 참조: docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md; docs/goal-closeout/cti-s1-foundation-execute/command-evidence.json
- 선행: LT-PRE-W11-T03
- 완료 기준:
  1. docs/goal-closeout/cti-s1-foundation-execute/에 packet, command-evidence, adjudication, construction-inspection, claude-review-result 파일이 존재한다.
  2. crosswalk JSON에 LT-PRE-W11과 S1-G blocked_authenticated_probe_requires_s2_or_approved_probe_principal mapping이 존재한다.
  3. closeout packet이 S1 infra/code/tests applied와 no production migration/restore/secret-value-fetch non-claims를 모두 기록한다.
- 검증 계약: method: 1) closeout 파일 존재 2) crosswalk JSON 파싱 3) packet status/local/prod boundary 대조 / evidence: scripts/validate-cti-s1-foundation-execute-closeout.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Assembles S1 execute evidence only; preserves S2/S3/CUTOVER/password/OIDC/DB/production_ready/go-live boundaries and blocks migration/restore progression.

#### LT-PRE-W11-T05 — S1 execute validator와 launch-TUW 검증을 PASS시킨다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: cti-s1-foundation-execute validator와 launch-TUW ledger validator를 실행해 I6-applied/S1-G-auth-probe-blocked 상태를 검증 가능한 종결 표면으로 만든다.
- 산출물: ① scripts/validate-cti-s1-foundation-execute-closeout.mjs ② docs/goal-closeout/cti-s1-foundation-execute/command-evidence.json
- 참조: docs/goal-closeout/cti-s1-foundation-execute/; docs/launch/cti-s1-foundation-execute-crosswalk-2026-07-06.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W11-T04
- 완료 기준:
  1. node scripts/validate-cti-s1-foundation-execute-closeout.mjs가 PASS한다.
  2. node workbook/launch-tuw/validate-launch-tuw-ledger.mjs가 PASS한다.
  3. validator output이 production_infrastructure_mutation_executed=true, production_store_migration_executed=false, restore_executed=false, secret_value_fetched=false를 기록한다.
- 검증 계약: method: 1) S1 execute closeout validator 2) launch-TUW ledger validator 3) command evidence에 결과 보존 / evidence: docs/goal-closeout/cti-s1-foundation-execute/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Validates the S1 execute closeout and prevents S2/S3/CUTOVER progression until a separate S2 or approved probe-principal goal exists.
- terminal: true

---

## LT-PRE-W12 — canonical tenant injection S2 AUTHENTICATION unblock packet

`workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md` Stage 2의 S2 AUTHENTICATION execute 전 선택지를 확정 가능한 승인 패킷으로 만든다. 이 WP는 패킷 전용이며 S2 구현, production mutation, credential store write, password issuance/distribution, S1-G production probe, S3/CUTOVER/OIDC/DB 전환을 실행하지 않는다.

#### LT-PRE-W12-T01 — S1-G blocker 입력과 S2 auth provider 선택지를 확정한다
- 유형/실행/리스크/가중치: decision / agent_implementation / A / L
- 목표: S1 execute closeout의 S1-G authenticated probe blocker를 입력으로 삼아 S2 auth provider, credential store path, hash algorithm boundary를 승인 가능한 선택지로 고정한다.
- 산출물: docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md
- 참조: docs/goal-closeout/cti-s1-foundation-execute/packet.json; workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 S2
- 선행: LT-PRE-W11-T05
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. packet에 `lawos-internal-password-provider-v1` provider choice가 존재한다.
  2. packet에 `LAWOS_AUTH_CREDENTIAL_STORE_PATH=/mnt/lawos/auth/credential-store.json`이 존재한다.
  3. packet에 Node `crypto.scrypt` first / argon2id later upgrade boundary가 존재한다.
- 검증 계약: method: packet grep + validator JSON parse / evidence: scripts/validate-cti-s2-authentication-unblock-packet-closeout.mjs output / VC: VC-LNCH-DEC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Credential architecture decision only. No credential store write, password generation, secret value, production mutation, or login execution.

#### LT-PRE-W12-T02 — login/verifyToken cut path와 session principal model을 확정한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / L
- 목표: operational synthetic login dependency를 제거하는 `/api/auth/login`, `/api/desktop/login`, `verifyToken` 경로와 session principal source 모델을 문서화한다.
- 산출물: docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md
- 참조: apps/api/src/session-auth.js; apps/desktop/src/main/aws-runtime.js; apps/desktop/src/main/auth.js
- 선행: LT-PRE-W12-T01
- 완료 기준:
  1. packet에 operational login provider cut path가 존재한다.
  2. packet에 verifyToken이 signed session payload + account registry + credential status/revision + role registry를 사용한다는 모델이 존재한다.
  3. packet에 synthetic token dependency in operational = false boundary가 존재한다.
- 검증 계약: method: packet grep + validator JSON parse / evidence: scripts/validate-cti-s2-authentication-unblock-packet-closeout.mjs output / VC: VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Security cut-path acceptance only. No auth code deployment or production credential verification is executed.

#### LT-PRE-W12-T03 — password reset/lockout/distribution boundary를 확정한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / L
- 목표: S2 execute가 구현할 reset/lockout/revocation 표면과 CUTOVER-bound password issuance/distribution 경계를 분리한다.
- 산출물: docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 S2-T03/S2-T04
- 선행: LT-PRE-W12-T02
- 완료 기준:
  1. packet에 plaintext password receipt 금지와 hash-only storage boundary가 존재한다.
  2. packet에 production password generation/issuance/distribution은 I3 또는 later explicit approval까지 out of scope로 기재된다.
  3. packet에 reset token/secret/hash material renderer leak 금지 기준이 존재한다.
- 검증 계약: method: packet grep + validator JSON parse / evidence: scripts/validate-cti-s2-authentication-unblock-packet-closeout.mjs output / VC: VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Prevents credential issuance drift. No production password is generated, displayed, stored in plaintext, or distributed.

#### LT-PRE-W12-T04 — desktop v0.1.10 dependency와 S1-G probe method를 확정한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: desktop v0.1.10 password flow boundary와 S1-G authenticated production probe method를 확정하되, probe execution은 별도 approval로 분리한다.
- 산출물: docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md
- 참조: apps/desktop/src/main/aws-runtime.js; apps/desktop/src/main/auth.js; docs/goal-closeout/cti-s1-foundation-execute/adjudication.md
- 선행: LT-PRE-W12-T03
- 외부 의존: EXT-OWNER-APPROVAL
- 완료 기준:
  1. packet에 desktop `v0.1.10` password/must_change/reset flow dependency가 존재한다.
  2. packet에 no debug endpoint / no secret fetch / real session only S1-G probe method가 존재한다.
  3. packet에 future approval ref `I8-CTI-S2-S1G-AUTHENTICATED-PROBE-OWNER-APPROVAL-2026-07-06`가 존재한다.
- 검증 계약: method: packet grep + validator JSON parse / evidence: scripts/validate-cti-s2-authentication-unblock-packet-closeout.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Defines client/probe boundaries only. No desktop build/release/distribution or production probe is executed.

#### LT-PRE-W12-T05 — rollback/abort criteria와 closeout 5종/crosswalk를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: S2 execute abort/rollback criteria, closeout 5종, CTI/launch-TUW crosswalk를 조립해 I7 approval 전 stop surface를 만든다.
- 산출물: docs/goal-closeout/cti-s2-authentication-unblock-packet/; docs/launch/cti-s2-authentication-unblock-crosswalk-2026-07-06.json; docs/launch/cti-s2-authentication-unblock-crosswalk-2026-07-06.md
- 참조: docs/goal-closeout-protocol.md; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W12-T04
- 완료 기준:
  1. closeout 5종(packet, command-evidence, adjudication, construction-inspection, claude-review-result)이 존재한다.
  2. crosswalk JSON에 LT-PRE-W12와 S2-T01/T02/T04/T06/S1-G probe mapping이 존재한다.
  3. closeout packet status가 `blocked_until_i7_owner_approval`이다.
- 검증 계약: method: closeout file ls + validator JSON parse / evidence: scripts/validate-cti-s2-authentication-unblock-packet-closeout.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Blocks S2 execute and all downstream production auth actions until I7. Preserves no S3/CUTOVER/OIDC/DB/prod-ready/go-live boundary.

#### LT-PRE-W12-T06 — S2 unblock validator와 launch-TUW 검증을 PASS시킨다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: 전용 S2 unblock validator와 launch-TUW ledger validator를 PASS시켜 packet-only blocked closeout을 검증 가능한 종결 표면으로 만든다.
- 산출물: scripts/validate-cti-s2-authentication-unblock-packet-closeout.mjs; docs/goal-closeout/cti-s2-authentication-unblock-packet/command-evidence.json
- 참조: docs/goal-closeout/cti-s2-authentication-unblock-packet/; docs/launch/cti-s2-authentication-unblock-crosswalk-2026-07-06.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W12-T05
- 완료 기준:
  1. `node scripts/validate-cti-s2-authentication-unblock-packet-closeout.mjs`가 PASS한다.
  2. `node workbook/launch-tuw/validate-launch-tuw-ledger.mjs`가 PASS한다.
  3. command evidence에 s2_implementation_executed=false, production_mutation_executed=false, password_issuance_executed=false, s1_g_probe_executed=false가 기록된다.
- 검증 계약: method: 1) S2 unblock validator 2) launch-TUW ledger validator 3) command evidence 결과 보존 / evidence: docs/goal-closeout/cti-s2-authentication-unblock-packet/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Validates packet-only closeout and prevents S2 execute/S3/CUTOVER progression until I7.
- terminal: true

## LT-PRE-W13 — canonical tenant injection S2 AUTHENTICATION execute

#### LT-PRE-W13-T01 — S2 credential-store provider와 operational login cut path를 구현한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / M
- 목표: I7/I9 승인과 S2 unblock packet에 맞춰 lawos-internal-password-provider-v1, LAWOS_AUTH_CREDENTIAL_STORE_PATH, Node crypto.scrypt credential verification, operational synthetic login denial을 구현한다.
- 산출물: apps/api/src/auth-credential-store.js; apps/api/src/session-auth.js; apps/api/test/session-auth-api.test.js
- 참조: docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md; docs/launch/cti-i9-owner-approval-receipt-2026-07-06.md
- 선행: LT-PRE-W12-T06
- 완료 기준:
  1. operational /api/auth/login이 credential-store fixture password로 signed session을 발급한다.
  2. operational /api/auth/login이 local_dev synthetic token을 AUTH_SYNTHETIC_LOGIN_DISABLED로 거부한다.
  3. credential store schema/provider/hash algorithm이 S2 packet 선택지와 일치한다.
- 검증 계약: method: node --test apps/api/test/session-auth-api.test.js and S2 execute validator source checks / evidence: docs/goal-closeout/cti-s2-authentication-execute/command-evidence.json / VC: VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Implements operational credential verification without production password issuance, production credential store write, debug endpoint, direct token mint, or secret value output.

#### LT-PRE-W13-T02 — verifyToken을 signed session + credential revision 검증으로 harden한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / M
- 목표: verifyToken operational branch가 signed session payload, account registry, credential status/revision, role registry로 principal을 재구성하고 revoked credential revision을 fail-closed 처리하게 한다.
- 산출물: apps/api/src/session-auth.js; apps/api/test/session-auth-api.test.js
- 참조: docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md
- 선행: LT-PRE-W13-T01
- 완료 기준:
  1. fixed session secret cold-start verify가 operational credential-store session에서 PASS한다.
  2. credential_rev mismatch가 AUTH_CREDENTIAL_REVOKED로 거부된다.
  3. protected route가 forged permission headers보다 signed session principal을 우선한다.
- 검증 계약: method: node --test apps/api/test/session-auth-api.test.js and source grep for credential_rev validation / evidence: docs/goal-closeout/cti-s2-authentication-execute/command-evidence.json / VC: VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Strengthens signed-session verification. No tenant migration, S4 permission injection, or OIDC implementation is performed.

#### LT-PRE-W13-T03 — desktop v0.1.10 password flow와 renderer-safe token boundary를 검증한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / M
- 목표: desktop source/package metadata를 v0.1.10으로 올리고 /api/desktop/login, password reset request/confirm, route-only deep link, renderer-safe payload sanitization을 S2 password-flow evidence로 검증한다.
- 산출물: package.json; apps/desktop/package.json; apps/api/src/matter-temp-desktop-runtime-lambda.mjs; apps/desktop/src/main/auth.js; apps/desktop/test/session-ipc.test.mjs
- 참조: docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md
- 선행: LT-PRE-W13-T02
- 완료 기준:
  1. package.json과 apps/desktop/package.json version이 0.1.10이다.
  2. desktop password flow tests가 PASS한다.
  3. renderer-safe payload가 reset/session token, password, hash, digest material을 반환하지 않는다.
- 검증 계약: method: desktop node --test commands plus package version JSON parse / evidence: docs/goal-closeout/cti-s2-authentication-execute/command-evidence.json / VC: VC-PERM-001, VC-AUD-001, VC-LNCH-DOC-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Client password-flow hardening only. Does not build, sign, notarize, release, distribute, or issue production passwords.

#### LT-PRE-W13-T04 — operational store-path preflight에 auth credential store를 추가한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: LAWOS_AUTH_CREDENTIAL_STORE_PATH를 operational preflight/catalog/server plumbing에 포함해 durable credential-store target 없이는 operational runtime이 뜨지 않게 한다.
- 산출물: apps/api/src/store-path-manifest.js; apps/api/src/server.js; docs/runbooks/store-env-catalog.md; scripts/validate-store-path-preflight.mjs
- 참조: docs/launch/cti-s2-authentication-unblock-packet-2026-07-06.md
- 선행: LT-PRE-W13-T03
- 완료 기준:
  1. STORE_PATH_MANIFEST에 LAWOS_AUTH_CREDENTIAL_STORE_PATH가 존재한다.
  2. startApiServer가 authCredentialStorePath를 createApiSessionAuth에 전달한다.
  3. `node scripts/validate-store-path-preflight.mjs`가 PASS한다.
- 검증 계약: method: store-path preflight validator and source checks / evidence: docs/goal-closeout/cti-s2-authentication-execute/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Preflight hardening only. Does not create EFS, mutate Lambda config, or write a production credential store.

#### LT-PRE-W13-T05 — S2 execute closeout 5종과 CTI crosswalk를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: S2-G code/test PASS, I8 probe condition state, production non-claims, closeout 5종, CTI/launch-TUW W13 crosswalk를 조립한다.
- 산출물: docs/goal-closeout/cti-s2-authentication-execute/; docs/launch/cti-s2-authentication-execute-crosswalk-2026-07-06.json; docs/launch/cti-s2-authentication-execute-crosswalk-2026-07-06.md
- 참조: docs/goal-closeout/cti-s2-authentication-unblock-packet/packet.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W13-T04
- 완료 기준:
  1. closeout 5종이 docs/goal-closeout/cti-s2-authentication-execute/에 존재한다.
  2. crosswalk JSON에 LT-PRE-W13과 S2-T01/T02/T04/T06/I8 probe mapping이 존재한다.
  3. I8 probe가 실행되지 않았으면 BLOCKED reason과 non-claim boundary가 기록된다.
- 검증 계약: method: closeout file ls + validator JSON parse / evidence: scripts/validate-cti-s2-authentication-execute-closeout.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Evidence assembly only. Does not run production probe, production migration/write, password distribution, S3/S4, CUTOVER, OIDC, DB conversion, or go-live claim.

#### LT-PRE-W13-T06 — S2 execute validator와 launch-TUW 검증을 PASS시킨다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: 전용 S2 execute validator, launch-TUW ledger validator, targeted auth/desktop/preflight tests를 PASS시켜 S2 execute closeout을 종결 가능하게 만든다.
- 산출물: scripts/validate-cti-s2-authentication-execute-closeout.mjs; docs/goal-closeout/cti-s2-authentication-execute/command-evidence.json
- 참조: docs/goal-closeout/cti-s2-authentication-execute/; docs/launch/cti-s2-authentication-execute-crosswalk-2026-07-06.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W13-T05
- 완료 기준:
  1. `node scripts/validate-cti-s2-authentication-execute-closeout.mjs`가 PASS한다.
  2. `node workbook/launch-tuw/validate-launch-tuw-ledger.mjs`가 PASS한다.
  3. command evidence에 production migration/write, password issuance/distribution, S3/S4, CUTOVER, OIDC, DB conversion, production_ready/go-live가 모두 false로 기록된다.
- 검증 계약: method: 1) S2 execute validator 2) launch-TUW ledger validator 3) targeted test command evidence / evidence: docs/goal-closeout/cti-s2-authentication-execute/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Validates S2 execute closeout and blocks S3/CUTOVER progression when I8 production probe conditions are unmet.
- terminal: true

## LT-PRE-W14 — canonical tenant injection BUILD S3/S4 code-only preparation

I10 승인 범위 안에서 CUTOVER 전제조건인 BUILD-G PASS evidence를 code-only로 만든다. 이 WP는 S3 tenant migration, S4 production account/permission injection, bridge token rotation, password issuance/distribution, CUTOVER, S5/S6, OIDC, DB conversion, production_ready/go-live claim을 실행하지 않는다.

#### LT-PRE-W14-T01 — S3 current matter seed를 canonical tenant 주입형으로 준비한다
- 유형/실행/리스크/가중치: schema / agent_implementation / A / L
- 목표: S3-T01 범위에서 AMIC current matter code 후보 데이터의 synthetic tenant 고정값을 제거하고 runtime seed가 승인 tenant를 주입하도록 code-only 경로를 준비한다.
- 산출물: packages/matter/src/amic-matter-code-candidates.js; scripts/generate-amic-matter-code-candidates.mjs; apps/api/src/matter-runtime-context.js
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 S3-T01; docs/launch/cti-i10-owner-approval-receipt-2026-07-06.md
- 선행: LT-PRE-W13-T06
- 완료 기준:
  1. AMIC_CURRENT_MATTER_CODE_CANDIDATES records do not contain tenant_id.
  2. AMIC_CURRENT_MATTER_CODES_SCHEMA_VERSION equals lawos.amic_matter_codes.v1.
  3. createMatterRuntimeSeed accepts currentMatterTenantId and defaults to the canonical Matter tenant without S3 migration execution.
- 검증 계약: method: source parse + BUILD-G validator tenant-free candidate checks / evidence: scripts/validate-cti-build-s3-s4-code-prep.mjs output / VC: VC-DATA-001, VC-REG-001, VC-PERM-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Prepares S3 tenant injection code only. No production tenant migration or production write is executed.

#### LT-PRE-W14-T02 — S3 session tenant refs와 blanket grant reduction 표면을 준비한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / L
- 목표: S3-T05/T06 범위에서 session envelope가 account registry tenant_ids/tenant_refs를 노출하고 synthetic constants가 runtime internal fallback으로만 남도록 준비한다.
- 산출물: apps/api/src/session-auth.js; apps/api/src/matter-vault-account-registry.js
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 S3-T05/S3-T06; docs/launch/cti-i10-owner-approval-receipt-2026-07-06.md
- 선행: LT-PRE-W14-T01
- 완료 기준:
  1. public session exposes tenant_ids and tenant_refs.
  2. registered account public refs expose tenant_ids without granting unrestricted all-tenant admin access.
  3. synthetic_only is derived from account tenant membership rather than hard-coded true.
- 검증 계약: method: session auth tests + BUILD-G validator source checks / evidence: docs/goal-closeout/cti-build-s3-s4-code-prep/command-evidence.json / VC: VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Reduces tenant grant ambiguity in the session envelope. No S4 account permission injection or CUTOVER is executed.

#### LT-PRE-W14-T03 — S3 bridge token rotation/control code-only guard를 구현한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / M
- 목표: S3-T08 범위에서 Vault bridge가 token presence만으로 열리지 않도록 enabled flag, tenant allow-list, service actor, dry-run default, rollback/abort guard를 구현한다.
- 산출물: apps/api/src/matter-runtime-context.js; apps/api/test/matter-vault-bridge-api.test.js; scripts/run-current-matter-codes-production-bridge-upsert.mjs
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 S3-T08; docs/launch/cti-i10-owner-approval-receipt-2026-07-06.md
- 선행: LT-PRE-W14-T02
- 완료 기준:
  1. Vault bridge blocks unless LAWOS_VAULT_BRIDGE_ENABLED=true and tenant is allow-listed.
  2. Vault bridge writes use configured service actor rather than caller-supplied migrationOperatorRef.
  3. production bridge upsert script defaults to dry-run and records remote_production_bridge_write_executed=false unless explicit execute env is set.
- 검증 계약: method: node --test apps/api/test/matter-vault-bridge-api.test.js + dry-run script + BUILD-G validator / evidence: docs/goal-closeout/cti-build-s3-s4-code-prep/command-evidence.json / VC: VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Closes the bridge backdoor path in code-only prep. Does not rotate the real token or execute bridge production writes.

#### LT-PRE-W14-T04 — S4 QA/backdoor disable seed guard를 준비한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / L
- 목표: S4-T04a 범위에서 QA accounts remain status=active for validators while production_status=disabled and qa_tenant_scope=synthetic_only guard prevents CUTOVER activation drift.
- 산출물: docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json; scripts/validate-matter-vault-user-registration-seed.mjs
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 S4-T04a; docs/launch/cti-i10-owner-approval-receipt-2026-07-06.md
- 선행: LT-PRE-W14-T03
- 완료 기준:
  1. matter.desktop.qa@amic.kr and qa.tenant-b@amic.kr keep status=active for existing seed assertions.
  2. Both QA accounts declare production_status=disabled and qa_tenant_scope=synthetic_only.
  3. Seed validator rejects QA guard weakening without enabling production account injection.
- 검증 계약: method: node scripts/validate-matter-vault-user-registration-seed.mjs + BUILD-G validator / evidence: docs/goal-closeout/cti-build-s3-s4-code-prep/command-evidence.json / VC: VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Prepares account injection safety guard only. Does not create, activate, or distribute production account credentials.

#### LT-PRE-W14-T05 — S3/S4 dry-run validators와 PII-safe evidence crosswalk를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: S3/S4/CUTOVER 실행 없이 dry-run validators, rollback/abort checks, residue guard, PII-safe evidence wiring, CTI/launch-TUW W14 crosswalk를 조립한다.
- 산출물: scripts/validate-cti-build-s3-s4-code-prep.mjs; docs/launch/cti-build-s3-s4-code-prep-crosswalk-2026-07-06.json; docs/launch/cti-build-s3-s4-code-prep-crosswalk-2026-07-06.md; docs/goal-closeout/cti-build-s3-s4-code-prep/
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §7 Codex first work bundle; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W14-T04
- 완료 기준:
  1. crosswalk JSON maps S3-T01/S3-T05/S3-T06/S3-T07/S3-T08/S4-T02/S4-T04a to LT-PRE-W14 TUWs.
  2. closeout records production migration/write, password issuance/distribution, CUTOVER, S5/S6, OIDC, DB conversion, production_ready/go-live as false.
  3. PII-safe evidence manifest records hash/count/schema/path evidence only and excludes secret/token/plaintext PII values.
- 검증 계약: method: closeout file ls + crosswalk JSON parse + PII-safe source scans / evidence: scripts/validate-cti-build-s3-s4-code-prep.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Evidence assembly only. No S3/S4/CUTOVER production action is executed.

#### LT-PRE-W14-T06 — BUILD-G validator와 launch-TUW 검증을 PASS시킨다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: 전용 BUILD S3/S4 code-prep validator와 launch-TUW ledger validator를 PASS시켜 CUTOVER 전제조건인 BUILD-G PASS evidence를 code-only로 생성한다.
- 산출물: scripts/validate-cti-build-s3-s4-code-prep.mjs; docs/goal-closeout/cti-build-s3-s4-code-prep/command-evidence.json
- 참조: docs/goal-closeout/cti-build-s3-s4-code-prep/; docs/launch/cti-build-s3-s4-code-prep-crosswalk-2026-07-06.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W14-T05
- 완료 기준:
  1. `node scripts/validate-cti-build-s3-s4-code-prep.mjs`가 BUILD_G PASS를 출력한다.
  2. `node workbook/launch-tuw/validate-launch-tuw-ledger.mjs`가 PASS한다.
  3. command evidence에 s3_execution=false, s4_execution=false, cutover_execution=false, production_ready_claim=false, go_live_claim=false가 기록된다.
- 검증 계약: method: 1) BUILD-G validator 2) launch-TUW ledger validator 3) targeted test command evidence / evidence: docs/goal-closeout/cti-build-s3-s4-code-prep/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Validates code-only BUILD-G. It does not execute tenant migration, production account injection, bridge token rotation, password distribution, CUTOVER, or go-live claim.
- terminal: true

## LT-PRE-W15 — canonical tenant injection CUTOVER preflight go/no-go packet

I11 조건부 승인 범위에서 CUTOVER execute 전제조건만 대조한다. 이 WP는 CUTOVER 실행, tenant migration, account/permission injection, operational profile switch, bridge token rotation, password issuance/distribution, S5/S6, OIDC, DB conversion, production_ready/go-live claim을 실행하지 않는다.

#### LT-PRE-W15-T01 — I11 prerequisite approvals and upstream closeouts를 대조한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: I1 through I11 approval/ref 상태와 BUILD-G PASS, S2/S1-G blocker state를 current repo evidence로 대조한다.
- 산출물: docs/launch/cti-cutover-preflight-go-no-go-packet-2026-07-06.md
- 참조: docs/launch/cti-i11-owner-approval-receipt-2026-07-06.json; docs/goal-closeout/cti-build-s3-s4-code-prep/packet.json; docs/goal-closeout/cti-s2-authentication-execute/packet.json
- 선행: LT-PRE-W14-T06
- 완료 기준:
  1. packet lists I1/I2/I3/I4/I5/I6/I7/I8/I9/I10/I11 status and evidence refs.
  2. packet records BUILD-G PASS evidence from cti-build-s3-s4-code-prep.
  3. packet records I8/S1-G production probe state without bypassing debug endpoint, direct token mint, or secret value lookup.
- 검증 계약: method: CUTOVER preflight validator approval/status checks / evidence: scripts/validate-cti-cutover-preflight-go-no-go.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Approval and closeout inventory only. No CUTOVER or production mutation is executed.

#### LT-PRE-W15-T02 — snapshot/restore/freeze prerequisites를 go/no-go로 판정한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: verified production snapshot, restore rehearsal PASS, freeze window notice/status evidence를 대조하고 누락 시 no-go blocker로 기록한다.
- 산출물: docs/launch/cti-cutover-preflight-go-no-go-packet-2026-07-06.md
- 참조: docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json; docs/goal-closeout/cti-s1-foundation-execute/packet.json; docs/launch/cutover-execution-log.md; docs/launch/legacy-freeze-record.md
- 선행: LT-PRE-W15-T01
- 완료 기준:
  1. packet records whether current verified production snapshot hash/count receipt exists.
  2. packet records restore rehearsal receipt status and whether it is cutover-current.
  3. packet records freeze notice/status evidence or no-go blocker.
- 검증 계약: method: CUTOVER preflight validator source file checks / evidence: docs/goal-closeout/cti-cutover-preflight-go-no-go/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Read-only evidence adjudication. Does not create a freeze, production snapshot mutation, restore execution, or migration.

#### LT-PRE-W15-T03 — CUTOVER runbook/checklist, rollback/abort, no-go 조건을 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: CUTOVER runbook/checklist, rollback/abort criteria, operator checklist, no-go conditions를 packet에 조립한다.
- 산출물: docs/launch/cti-cutover-preflight-go-no-go-packet-2026-07-06.md; docs/launch/cutover-runbook.md; docs/launch/cutover-rollback-criteria.md
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md; docs/launch/cutover-runbook.md; docs/launch/cutover-rollback-criteria.md
- 선행: LT-PRE-W15-T02
- 완료 기준:
  1. packet includes operator checklist with pre-freeze, freeze, execute, validation, rollback checkpoints.
  2. packet includes rollback and abort criteria status.
  3. packet declares no-go conditions and blocks CUTOVER when any stop-condition evidence is missing.
- 검증 계약: method: packet grep + validator JSON parse / evidence: scripts/validate-cti-cutover-preflight-go-no-go.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Operator checklist assembly only. Does not execute operational profile switch, tenant migration, account injection, password distribution, or bridge token rotation.

#### LT-PRE-W15-T04 — CUTOVER preflight closeout 5종과 CTI crosswalk를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: go/no-go packet 판정을 closeout 5종과 CTI/launch-TUW W15 crosswalk로 보존한다.
- 산출물: docs/goal-closeout/cti-cutover-preflight-go-no-go/; docs/launch/cti-cutover-preflight-go-no-go-crosswalk-2026-07-06.json; docs/launch/cti-cutover-preflight-go-no-go-crosswalk-2026-07-06.md
- 참조: docs/launch/cti-cutover-preflight-go-no-go-packet-2026-07-06.md; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W15-T03
- 완료 기준:
  1. closeout 5종(packet, command-evidence, adjudication, construction-inspection, claude-review-result)이 존재한다.
  2. crosswalk JSON maps I11 preflight requirements to LT-PRE-W15 TUWs.
  3. closeout packet records CUTOVER execution and all production mutation boundaries as false.
- 검증 계약: method: closeout file ls + crosswalk JSON parse + non-claim checks / evidence: scripts/validate-cti-cutover-preflight-go-no-go.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Evidence assembly only. No CUTOVER execution or production state mutation is performed.

#### LT-PRE-W15-T05 — CUTOVER preflight validator와 launch-TUW 검증을 PASS시킨다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: 전용 CUTOVER preflight validator와 launch-TUW ledger validator를 PASS시켜 GO 또는 NO-GO packet 상태를 검증 가능한 terminal closeout으로 만든다.
- 산출물: scripts/validate-cti-cutover-preflight-go-no-go.mjs; docs/goal-closeout/cti-cutover-preflight-go-no-go/command-evidence.json
- 참조: docs/goal-closeout/cti-cutover-preflight-go-no-go/; docs/launch/cti-cutover-preflight-go-no-go-crosswalk-2026-07-06.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W15-T04
- 완료 기준:
  1. `node scripts/validate-cti-cutover-preflight-go-no-go.mjs` outputs decision=NO_GO_BLOCKED and verdict=PASS.
  2. launch-TUW ledger validator reports PRE count including LT-PRE-W15 and violations=0.
  3. command evidence records cutover_execution=false, tenant_migration=false, account_injection=false, password_distribution=false, production_ready/go-live=false.
- 검증 계약: method: 1) CUTOVER preflight validator 2) launch-TUW ledger validator 3) command evidence boundary checks / evidence: docs/goal-closeout/cti-cutover-preflight-go-no-go/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Validates NO-GO/GO preflight state and prevents CUTOVER progression when prerequisites are missing.
- terminal: true

## LT-PRE-W16 — canonical tenant injection CUTOVER current snapshot and restore rehearsal evidence

I11 조건부 승인 범위에서 CUTOVER execute 전 current production snapshot hash/count receipt와 해당 snapshot-bound restore rehearsal receipt만 생성·검증한다. 이 WP는 production write, restore execution against production, tenant migration, account/permission injection, operational profile switch, bridge token rotation, password issuance/distribution, freeze, CUTOVER, S5/S6, OIDC, DB conversion, production_ready/go-live claim을 실행하지 않는다.

#### LT-PRE-W16-T01 — snapshot/restore 전제 approval과 upstream evidence를 대조한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: I1 through I11 approval/ref, BUILD-G PASS, I1 owner mapping confirmation receipt를 current snapshot/restore evidence goal의 입력으로 대조한다.
- 산출물: docs/launch/cti-cutover-current-snapshot-attempt-receipt-2026-07-06.json
- 참조: docs/launch/cti-i1-owner-approval-receipt-2026-07-06.json; docs/launch/cti-i11-owner-approval-receipt-2026-07-06.json; docs/goal-closeout/cti-build-s3-s4-code-prep/packet.json
- 선행: LT-PRE-W15-T05
- 완료 기준:
  1. receipt records I1/I2/I3/I4/I5/I6/I7/I8/I9/I10/I11 input refs.
  2. receipt records BUILD-G PASS and I1 owner mapping confirmation.
  3. receipt preserves production write/CUTOVER boundaries as false.
- 검증 계약: method: snapshot/restore rehearsal validator approval checks / evidence: scripts/validate-cti-cutover-snapshot-restore-rehearsal.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Approval inventory only. No production mutation, snapshot write, restore, or CUTOVER is executed.

#### LT-PRE-W16-T02 — current production snapshot hash/count 생성 가능성을 검증한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: AWS credential, Lambda config, EFS metadata, API health, and unauthenticated product readback boundaries를 확인하고 current production snapshot hash/count receipt 생성 가능 여부를 판정한다.
- 산출물: docs/launch/cti-cutover-current-snapshot-attempt-receipt-2026-07-06.json
- 참조: docs/goal-closeout/cti-s1-foundation-execute/packet.json; docs/launch/cti-cutover-snapshot-restore-rehearsal-blocker-register-2026-07-06.md
- 선행: LT-PRE-W16-T01
- 완료 기준:
  1. receipt records source/time/hash/count/scope if snapshot succeeds, or blocker code if no approved read surface exists.
  2. receipt records AWS/EFS/Lambda metadata without secret values.
  3. receipt records product API readback auth boundary without debug endpoint, direct token mint, or secret value lookup.
- 검증 계약: method: attempt receipt JSON parse and boundary checks / evidence: docs/goal-closeout/cti-cutover-snapshot-restore-rehearsal/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Read-only metadata and API boundary evidence only. No product state write or EFS mutation is performed.

#### LT-PRE-W16-T03 — snapshot-bound isolated restore rehearsal을 판정한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: current snapshot hash/count receipt가 존재하면 isolated restore rehearsal을 실행하고, 없으면 dependency blocker로 closeout한다.
- 산출물: docs/goal-closeout/cti-cutover-snapshot-restore-rehearsal/packet.json
- 참조: scripts/drill-matter-vault-backup-restore.mjs; docs/launch/cti-cutover-current-snapshot-attempt-receipt-2026-07-06.json
- 선행: LT-PRE-W16-T02
- 완료 기준:
  1. restore rehearsal receipt links to current snapshot hash when available.
  2. if snapshot is blocked, restore rehearsal is not run and records dependency blocker.
  3. production_restore_executed=false and restore_execution_against_production=false are preserved.
- 검증 계약: method: restore decision fields in closeout packet and command evidence / evidence: scripts/validate-cti-cutover-snapshot-restore-rehearsal.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Restore rehearsal is isolated only when snapshot exists; never restores against production.

#### LT-PRE-W16-T04 — snapshot/restore closeout 5종과 CTI crosswalk를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: snapshot/restore rehearsal outcome을 closeout 5종과 CTI/launch-TUW W16 crosswalk로 보존한다.
- 산출물: docs/goal-closeout/cti-cutover-snapshot-restore-rehearsal/; docs/launch/cti-cutover-snapshot-restore-rehearsal-crosswalk-2026-07-06.json; docs/launch/cti-cutover-snapshot-restore-rehearsal-crosswalk-2026-07-06.md
- 참조: docs/launch/cti-cutover-current-snapshot-attempt-receipt-2026-07-06.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W16-T03
- 완료 기준:
  1. closeout 5종 exists: packet, command-evidence, adjudication, construction-inspection, claude-review-result.
  2. crosswalk JSON maps snapshot/restore requirements to LT-PRE-W16 TUWs.
  3. all production mutation and launch claims remain false.
- 검증 계약: method: closeout file checks and crosswalk JSON parse / evidence: scripts/validate-cti-cutover-snapshot-restore-rehearsal.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Evidence assembly only. No production mutation or CUTOVER is performed.

#### LT-PRE-W16-T05 — snapshot/restore validator와 launch-TUW 검증을 PASS시킨다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: 전용 validator와 launch-TUW ledger validator를 PASS시켜 snapshot/restore outcome을 terminal closeout으로 만든다.
- 산출물: scripts/validate-cti-cutover-snapshot-restore-rehearsal.mjs; docs/goal-closeout/cti-cutover-snapshot-restore-rehearsal/command-evidence.json
- 참조: docs/goal-closeout/cti-cutover-snapshot-restore-rehearsal/; docs/launch/cti-cutover-snapshot-restore-rehearsal-crosswalk-2026-07-06.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W16-T04
- 완료 기준:
  1. `node scripts/validate-cti-cutover-snapshot-restore-rehearsal.mjs` outputs verdict=PASS and closeout_decision=BLOCKED_NO_APPROVED_EFS_FILE_READ_SURFACE.
  2. launch-TUW ledger validator reports LT-PRE-W16 and violations=0.
  3. command evidence records snapshot_created=false, restore_rehearsal_executed=false, cutover_execution=false, production_ready/go-live=false.
- 검증 계약: method: 1) snapshot/restore validator 2) launch-TUW ledger validator 3) boundary checks / evidence: docs/goal-closeout/cti-cutover-snapshot-restore-rehearsal/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Validates blocked snapshot/restore state and prevents CUTOVER progression.
- terminal: true

## LT-PRE-W17 — canonical tenant injection CUTOVER read-only EFS snapshot surface

I14 승인 범위에서 CUTOVER current snapshot blocker를 해소하기 위해 Matter production Lambda의 direct-invoke 전용 read-only EFS snapshot surface를 구현·배포·실행한다. 이 WP는 public/debug/backdoor endpoint, production write, production restore, tenant migration, account/permission injection, operational profile switch, bridge token rotation, password issuance/distribution, freeze, CUTOVER, S5/S6, OIDC, DB conversion, production_ready/go-live claim을 실행하지 않는다.

#### LT-PRE-W17-T01 — I14 approval과 read-only boundary를 고정한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: I14 approval_ref와 target Lambda/EFS/AP/mount path, direct-invoke-only method, PII-safe output boundary를 repo-safe receipt로 고정한다.
- 산출물: docs/launch/cti-i14-owner-approval-receipt-2026-07-06.json; docs/launch/cti-i14-owner-approval-receipt-2026-07-06.md
- 참조: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md §5 CUTOVER; docs/goal-closeout/cti-cutover-snapshot-restore-rehearsal/packet.json
- 선행: LT-PRE-W16-T05
- 완료 기준:
  1. I14 receipt records goal_id=cti-cutover-readonly-efs-snapshot-surface.
  2. receipt requires Lambda direct invoke only and public_http_endpoint_allowed=false.
  3. receipt preserves production_write, production_restore, CUTOVER, and launch claims as false.
- 검증 계약: method: I14 receipt JSON parse and boundary checks / evidence: scripts/validate-cti-cutover-readonly-efs-snapshot-surface.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Approval evidence only. No Lambda deployment or production read is executed by this TUW.

#### LT-PRE-W17-T02 — direct-invoke read-only Lambda surface를 구현·테스트한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / M
- 목표: HTTP-shaped event를 거부하고 I14 action/ref가 일치하는 Lambda direct invoke에서만 /mnt/lawos store files를 hash/count하는 read-only code path를 구현한다.
- 산출물: apps/api/src/lambda.js; apps/api/test/lambda-session-secret.test.js
- 참조: docs/launch/cti-i14-owner-approval-receipt-2026-07-06.json; apps/api/src/store-path-manifest.js
- 선행: LT-PRE-W17-T01
- 완료 기준:
  1. HTTP-shaped snapshot events return direct-invoke-only rejection.
  2. local test verifies snapshot output excludes plaintext fixture contents.
  3. local test verifies restore rehearsal stays isolated and production write/restore flags remain false.
- 검증 계약: method: node --check apps/api/src/lambda.js + node --test apps/api/test/lambda-session-secret.test.js / evidence: docs/goal-closeout/cti-cutover-readonly-efs-snapshot-surface/command-evidence.json / VC: VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Implements a non-public read-only maintenance surface. Does not add a public/debug/backdoor endpoint or mutate production data.

#### LT-PRE-W17-T03 — Lambda code를 보수적으로 배포한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / M
- 목표: current Lambda deployment zip을 private evidence로 백업하고 RevisionId 조건으로 apps/api/src/lambda.js만 교체한 zip을 matter-lawos-api-prod에 배포한다.
- 산출물: docs/launch/cti-cutover-current-production-snapshot-receipt-2026-07-06.json
- 참조: docs/runbooks/aws-sso-role-chain.md; docs/goal-closeout/cti-s1-foundation-execute/packet.json
- 선행: LT-PRE-W17-T02
- 완료 기준:
  1. pre-I14 zip sha256 and post-deploy CodeSha256 are recorded.
  2. update-function-code completes with LastUpdateStatus=Successful.
  3. no Lambda environment/config mutation is recorded by this TUW.
- 검증 계약: method: AWS Lambda update receipt parse / evidence: docs/launch/cti-cutover-current-production-snapshot-receipt-2026-07-06.json / VC: VC-LNCH-DOC-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Code deployment only within I14 scope. Does not change production store content, restore production, or execute CUTOVER.

#### LT-PRE-W17-T04 — current snapshot과 isolated restore rehearsal을 direct invoke로 생성한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / M
- 목표: I14 direct invoke로 /mnt/lawos runtime store files를 enumerate/hash/count하고 Lambda ephemeral /tmp 안에서 snapshot-bound isolated restore rehearsal을 수행한다.
- 산출물: docs/launch/cti-cutover-current-production-snapshot-receipt-2026-07-06.json; docs/launch/cti-cutover-current-production-snapshot-receipt-2026-07-06.md
- 참조: docs/launch/cti-i14-owner-approval-receipt-2026-07-06.json
- 선행: LT-PRE-W17-T03
- 완료 기준:
  1. snapshot receipt records snapshot_hash, source/time/hash/count/scope, readable store file count, read_error_count=0, blocked_path_count=0.
  2. restore rehearsal records PASS, source/restored file counts equal, checksum_mismatch_count=0.
  3. receipt records plaintext_file_content_returned=false, secret_value_returned=false, production_write_executed=false, production_restore_executed=false.
- 검증 계약: method: snapshot receipt JSON parse and boundary checks / evidence: scripts/validate-cti-cutover-readonly-efs-snapshot-surface.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Read-only evidence generation and isolated restore rehearsal only. No production restore or production write is executed.

#### LT-PRE-W17-T05 — CUTOVER preflight를 재판정한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: current snapshot and restore rehearsal PASS evidence를 preflight go/no-go packet에 반영하고, CUTOVER execute가 여전히 별도 조건 전까지 blocked인지 검증한다.
- 산출물: docs/launch/cti-cutover-preflight-go-no-go-packet-2026-07-06.md; docs/goal-closeout/cti-cutover-preflight-go-no-go/
- 참조: docs/launch/cti-cutover-current-production-snapshot-receipt-2026-07-06.json; scripts/validate-cti-cutover-preflight-go-no-go.mjs
- 선행: LT-PRE-W17-T04
- 완료 기준:
  1. preflight packet records current snapshot and restore rehearsal as PASS.
  2. preflight blocker list removes missing snapshot/restore blockers.
  3. preflight decision remains NO_GO_BLOCKED until rollback approval, freeze notice/status, and S1-G authenticated probe are satisfied.
- 검증 계약: method: node scripts/validate-cti-cutover-preflight-go-no-go.mjs / evidence: docs/goal-closeout/cti-cutover-preflight-go-no-go/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Reassesses preflight only. Does not start freeze, CUTOVER, tenant migration, account injection, or password distribution.

#### LT-PRE-W17-T06 — read-only snapshot surface closeout와 validator를 PASS시킨다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: I14 goal closeout 5종, CTI/launch-TUW W17 crosswalk, 전용 validator, launch-TUW ledger validator를 PASS시킨다.
- 산출물: docs/goal-closeout/cti-cutover-readonly-efs-snapshot-surface/; docs/launch/cti-cutover-readonly-efs-snapshot-surface-crosswalk-2026-07-06.json; docs/launch/cti-cutover-readonly-efs-snapshot-surface-crosswalk-2026-07-06.md; scripts/validate-cti-cutover-readonly-efs-snapshot-surface.mjs
- 참조: docs/launch/cti-cutover-current-production-snapshot-receipt-2026-07-06.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W17-T05
- 완료 기준:
  1. closeout 5종 exists and closeout_verdict=PASS_READONLY_EFS_SNAPSHOT_SURFACE.
  2. validator outputs verdict=PASS and snapshot/restore PASS.
  3. launch-TUW ledger validator reports LT-PRE-W17 and violations=0.
- 검증 계약: method: 1) read-only snapshot surface validator 2) launch-TUW ledger validator 3) boundary checks / evidence: docs/goal-closeout/cti-cutover-readonly-efs-snapshot-surface/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Validates I14 read-only snapshot surface completion and preserves all CUTOVER/non-approved production mutation boundaries as false.
- terminal: true

## LT-PRE-W18 — canonical tenant injection CUTOVER execute attempt and stop-condition closeout

I11/I18 승인과 preflight GO_READY 상태에서 CUTOVER execute를 착수하되, production mutation 직전 current snapshot/hash stop condition을 재검증한다. live snapshot이 I15-bound snapshot과 불일치하면 operational profile switch, tenant migration, account/permission injection, bridge token rotation, password issuance/distribution, first-login, CUT-G를 실행하지 않고 BLOCKED로 닫는다.

#### LT-PRE-W18-T01 — CUTOVER execute preflight와 live snapshot을 재검증한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: cti-cutover-execute 착수 직전에 preflight GO_READY, I11/I18 refs, AWS caller, live read-only snapshot hash/count를 재검증한다.
- 산출물: docs/launch/cti-cutover-execute-precheck-live-snapshot-receipt-2026-07-06.json
- 참조: docs/goal-closeout/cti-cutover-preflight-go-no-go/packet.json; docs/launch/cti-i18-owner-approval-receipt-2026-07-06.json
- 선행: WP:LT-PRE-W17
- 완료 기준:
  1. preflight packet is GO_READY_NOT_EXECUTED with blockers=0.
  2. live snapshot receipt records snapshot_hash, readable_store_file_count, read_error_count, blocked_path_count, and restore rehearsal status.
  3. receipt records production_write_executed=false and cutover_executed=false before any mutation step.
- 검증 계약: method: preflight validator + AWS caller identity + I14 read-only Lambda direct invoke receipt / evidence: docs/goal-closeout/cti-cutover-execute/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Read-only pre-mutation check for CUTOVER execute. Does not switch profile, migrate tenants, inject accounts, rotate bridge token, or issue passwords.

#### LT-PRE-W18-T02 — snapshot mismatch stop condition을 판정하고 mutation 전에 중단한다
- 유형/실행/리스크/가중치: security_acceptance / agent_implementation / A / L
- 목표: I15-bound snapshot hash와 live snapshot hash가 불일치하면 rollback/abort criteria에 따라 production mutation 전에 CUTOVER execute를 BLOCKED로 중단한다.
- 산출물: docs/goal-closeout/cti-cutover-execute/packet.json; docs/goal-closeout/cti-cutover-execute/adjudication.md
- 참조: docs/launch/cutover-rollback-criteria.md; docs/launch/cti-cutover-execute-precheck-live-snapshot-receipt-2026-07-06.json
- 선행: LT-PRE-W18-T01
- 완료 기준:
  1. closeout packet records stop_condition.triggered=true and code=CURRENT_SNAPSHOT_HASH_MISMATCH_AFTER_I18.
  2. operational_profile_switch, tenant_migration, account_permission_injection, bridge_token_rotation, password_distribution, first_login, and CUT-G execution are all false.
  3. rollback_required=false is recorded because no production mutation began.
- 검증 계약: method: cti-cutover-execute validator stop-condition and boundary checks / evidence: scripts/validate-cti-cutover-execute.mjs output / VC: VC-PERM-001, VC-AUD-001, VC-REG-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Enforces abort before irreversible production mutation when snapshot binding drifts.

#### LT-PRE-W18-T03 — CUTOVER execute BLOCKED closeout 5종과 CTI crosswalk를 조립한다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: cti-cutover-execute의 BLOCKED outcome을 closeout 5종과 CTI/launch-TUW W18 crosswalk로 보존한다.
- 산출물: docs/goal-closeout/cti-cutover-execute/; docs/launch/cti-cutover-execute-crosswalk-2026-07-06.json; docs/launch/cti-cutover-execute-crosswalk-2026-07-06.md
- 참조: docs/goal-closeout/cti-cutover-execute/packet.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W18-T02
- 완료 기준:
  1. closeout 5종 exists: packet, command-evidence, adjudication, construction-inspection, claude-review-result.
  2. crosswalk JSON maps execute preflight, snapshot stop condition, closeout, and validator work to LT-PRE-W18 TUWs.
  3. all production mutation and launch claims remain false.
- 검증 계약: method: closeout file checks, crosswalk JSON parse, and non-claim boundary checks / evidence: scripts/validate-cti-cutover-execute.mjs output / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Evidence assembly for blocked execute attempt only. No CUTOVER production action is executed.

#### LT-PRE-W18-T04 — CUTOVER execute validator와 launch-TUW 검증을 PASS시킨다
- 유형/실행/리스크/가중치: gate_assembly / agent_implementation / A / L
- 목표: 전용 cti-cutover-execute validator와 launch-TUW ledger validator를 PASS시켜 blocked pre-mutation outcome을 terminal closeout으로 만든다.
- 산출물: scripts/validate-cti-cutover-execute.mjs; docs/goal-closeout/cti-cutover-execute/command-evidence.json
- 참조: docs/goal-closeout/cti-cutover-execute/; docs/launch/cti-cutover-execute-crosswalk-2026-07-06.json; workbook/launch-tuw/launch-tuw-ledger.json
- 선행: LT-PRE-W18-T03
- 완료 기준:
  1. `node scripts/validate-cti-cutover-execute.mjs` outputs verdict=PASS and decision=BLOCKED_BEFORE_PRODUCTION_MUTATION.
  2. `node workbook/launch-tuw/validate-launch-tuw-ledger.mjs` reports LT-PRE-W18 and violations=0.
  3. command evidence records production mutation, password distribution, production_ready, and go-live as false.
- 검증 계약: method: 1) CUTOVER execute validator 2) launch-TUW ledger validator 3) command evidence boundary checks / evidence: docs/goal-closeout/cti-cutover-execute/command-evidence.json / VC: VC-LNCH-DOC-001, VC-PERM-001, VC-AUD-001
- 게이트: PRE-EXIT
- 권한·감사 영향: Validates blocked execute state and prevents S5/S6 progression.
- terminal: true
