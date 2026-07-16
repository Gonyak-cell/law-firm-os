# QA-004 브라우저 역할·viewport 판정

## 판정

- 상태: **PASS**
- 제품 후보 SHA: `e19a17dd48edf131cada90cf0b2c9b6891002d8d`
- 제품 tree: `d954dafbf67ba9dca47fd44effbc6109a4e056af`
- 후보 tag: `forest-v0.1.17-integration-candidate-e19a17dd`
- QA 제품 entry/exit SHA: `e19a17dd48edf131cada90cf0b2c9b6891002d8d` (제품 소스 변경 없음)
- 정본 범위: `employee`, `manager`, `hr`, `payroll_preparer`, `payroll_approver`, `no_scope` 6역할 × `1512`, `1280`, `1024`, `820`, `720` 5 viewport

## 급여 브라우저 acceptance

| 기준 | 결과 |
|---|---:|
| signed session 역할 계약 | 6/6 PASS |
| role × viewport 조합 | 30/30 PASS |
| 권한 허용/거부 표면 | 30/30 PASS |
| 44px 행 밀도 | 위반 0 |
| root overflow | 0 |
| main overflow | 0 |
| broken image | 0 |
| empty button | 0 |
| unlabeled control | 0 |
| unexpected HTTP error | 0 |
| unexpected console error | 0 |
| page error | 0 |
| 상세 dialog 초기 focus·Escape·focus 복귀 | PASS |
| 직원 self 급여명세 | PASS |
| 급여 담당자 명세 관리 | PASS |
| 지급·신고 상세 | PASS |

정본 receipt는 `payroll-browser-receipt.json`이다. 권한이 없는 역할의 급여 API `403`은 기대된 fail-closed 결과로 별도 분류되어 unexpected error에 포함되지 않는다.

브라우저 UI는 후보 SHA `e19a17dd`의 `apps/web`에서 실행한 Vite `4174`를 사용했다. API는 직전 부모 `35cd17f8`의 별도 QA worktree에서 실행했지만, 두 SHA의 `apps/api` tree `4aab7ca2`와 `packages/hrx` tree `ffc045bd`는 각각 동일하다. 두 SHA의 유일한 관련 차이는 후보 UI의 `PayrollStatementWorkspace.tsx`와 그 테스트이며 실제 브라우저 UI는 후보 SHA 서버가 제공했다. 상세 값은 `runtime-provenance.json`에 고정했다.

## 패키지 보조 acceptance

동일 후보에서 생성한 macOS 내부 번들로 급여 run 마감, 10개 명세 생성·전달, 지급 대사, 4종 신고 접수, 직원 self 명세, 담당자 명세 관리, 재시작 후 원장 복원을 확인했다. 5개 패키지 화면 모두 overflow 0, broken image 0, 44px 행 계약을 통과했다.

이 결과는 내부 패키지 기능 증거다. Developer ID 배포 서명, notarization, staple, Gatekeeper 배포 판정은 QA-005에서 별도로 수행하며 여기서 주장하지 않는다. Windows 번들은 파일 구조·PE header·archive·renderer 일치만 확인했고 native 실행 및 Authenticode는 QA-006 범위다.

## 휴가 상위 호환 보조 증거

QA-004의 필수 급여 matrix 외에 LV02~LV07을 같은 후보 소스에서 재검증했다.

- LV02: 휴가 그룹·유형·정책 draft/publish, HR/직원 권한 분리, 반응형 PASS
- LV03: self-service, 반차 240분, 취소/재예약, 팀 승인·위임·일정 privacy PASS
- LV04: 자동·수동 발생, step-up, idempotent rerun, 규칙 version/deactivate PASS
- LV05: 사용 내역, CSV/XLSX, 퇴사 정산 dual control, payroll outbox fail-closed PASS
- LV06: 사용 촉진 대상·법정 기한·1/2차 전달 증거·법률 검토·직원 차단 PASS
- LV07: 일정·출퇴근·급여·알림 연동, 실패 원장 보존, retry, 취소 역분개, privacy PASS

LV06과 LV07의 첫 실행 실패는 제품 실패가 아니라 현재 Forest 문구·DOM 및 `delete` provider operation으로 바뀐 뒤에도 과거 선택자를 보던 QA 계약 실패였다. `scripts/run-leave-lv06-browser-qa.mjs`, `scripts/run-leave-lv07-browser-qa.mjs`만 현재 계약에 맞춰 보정한 뒤 PASS했다.

## 알려진 비차단 노이즈와 한계

- LV04~LV07에서 leave와 무관한 Home analytics synthetic monthly endpoint `403`이 각 1건 관찰됐다. leave console/page error는 모두 0이다.
- LV03 receipt는 기존 무관 console noise 2건을 집계했으나 leave console error는 0이다.
- 사용자 소유 루트의 RC-001 77-path content manifest는 변경 0이고, 기존 v0.1.16 앱 PID `55090`은 같은 실행 경로로 유지됐다. `root-preservation.json`에 값이나 파일 본문 없이 결과만 기록했다.
- 외부 provider write, 실제 직원 데이터 migration, 실제 은행·세무 제출, production traffic, public release, go-live를 수행하거나 주장하지 않았다.
- `renderer-parity.json`의 canonical digest는 build manifest 알고리즘이다. `payroll-package-receipt.json`의 raw renderer digest는 다른 직렬화 알고리즘이므로 값이 다르지만, 두 알고리즘 모두 macOS/Windows 간 일치를 각각 증명한다.

## 제외한 폐기 QA

`scripts/run-sf-client-matter-browser-qa.mjs`는 과거 고정 right-panel 구조와 현재 메뉴에서 제외된 hidden route를 검사하는 별도 Salesforce parity 러너다. QA-004 범위가 아니며 현재 Forest 후보에 맞춘다는 명목으로 테스트를 약화하지 않았다. 이 턴에서 시도한 변경은 완전히 복원되어 파일 diff가 0이다.
