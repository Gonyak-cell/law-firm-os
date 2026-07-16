# RC-005-D/E UI and profile acceptance

- TUW: `RC-005-D`, `RC-005-E`
- status: `DONE`
- entry_sha: `ee03b8c127f1be4d7a8ce4bb5b104f0ba27f110f`
- exit_sha: `75f10995d9e04c35e8d21710fc64d6bd5e9b5e4c`
- execution_worktree: `/private/tmp/lawos-forest-v016-release`
- preserved_root_checkout: `/Users/jws/Documents/Codex/Law Firm OS`
- preserved_root_fingerprint: `7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3`
- changed_files: `ui-profile-files.txt`
- commands: `ui-profile-commands.txt`
- test_result: `ui-profile-tests.txt`

## Accepted behavior

- 휴가 자동 발생 규칙은 불변 버전으로 새 버전을 만들고 활성 규칙만 실행 대상으로 사용한다.
- 규칙 중지, 미리보기, 서명된 step-up 실행, 멱등 재실행, 수동 이중 통제 조정이 실제 화면에서 동작한다.
- 발생 내역 CSV/XLSX template, upload, export가 같은 versioned contract를 사용하며 사유·첨부 원문을 내보내지 않는다.
- 승인 대기와 팀 휴가 목록은 상위 분류와 무의미한 empty helper copy를 반복하지 않는다.
- `잔액 대조`, `불일치`, `기준 없음`, `이중 승인` 같은 내부 검증 문구를 제품 UI에서 제거했다.
- 프로필 사진 data URL은 허용 MIME뿐 아니라 PNG/JPEG/WebP 실제 magic bytes까지 검증한다.
- 패키지 세션 `user_amic_jwsuh`는 HRX 직원 `emp_amic_jwsuh`와 결합되고, 렌더링 이름은 `서지원`으로 유지된다.
- 공개 renderer scan은 보호 대상 roster 값과 사진을 출력하지 않는다.
- 동일 `75f10995`에서 재생성한 macOS와 Windows 내부 패키지는 Forest renderer SHA-256 `b73aac5c2686e1650d2a7685a8d4b790a45786fe4363029ffbfc5da9899c1a96`를 공유한다.

## Failure-first evidence

- 새 규칙 버전·중지, CSV/XLSX, empty-copy 제거, 비이미지 data URL 거부 assertion은 구현 전 실패했다.
- 최초 packaged profile smoke는 현재 Forest sidebar와 맞지 않는 `사건 목록` 텍스트 selector에서 실패했고, stable data selector로 교체한 뒤 PASS했다.
- 최초 packaged leave QA는 삭제된 empty-copy를 기다리는 낡은 assertion에서 실패했고, 부재 assertion으로 교체한 뒤 제품 흐름을 통과했다.
- 다음 packaged leave QA는 오래된 Windows bundle의 renderer hash 불일치를 차단했다. 같은 SHA에서 Windows를 재빌드한 뒤 Mac·Windows hash가 일치하고 최종 QA가 PASS했다.

## Manual QA

- Lazyweb report `2c6e81b4-0875-4423-bc23-c7465b6e5b68`은 현재 Forest 44px 표 밀도와 반복 metadata 제거 방향을 지지하는 보조 증거로만 사용했다.
- `lv-04-rule-version-deactivated-1512x900.png`에서 원본 `v1`, 새 버전 `v2`, 중지 상태, 단일 행 규칙 표를 확인했다.
- `profile-api-packaged.png`에서 서지원 사진·이름·대표변호사·Legal·AMIC Law·연락처와 `세션 사용자` fallback 부재를 확인했다.
- packaged leave QA는 720, 820, 1024, 1280, 1512 viewport에서 11개 화면을 캡처했고 문서 overflow, page error, console error가 0이었다.

## Evidence hashes

- Lazyweb current-state screenshot: `8be6d49c91abdee8ccd8e5dfae95ac09b681846c85e3093d457feae4163afdb8`
- LV-03 browser receipt: `b832dd153073c9874447bd59a7ea19ff2594abac47bbca5015dad54151c32e2a`
- LV-04 browser receipt: `92acfe656d96700af84b49f81c52bd1d59d8a516a605506b133476b73b35e4e9`
- LV-04 rule screenshot: `5040cf73ff05072959d377f01f7203840c86854130c3106e24506619992d3d56`
- LV-05 browser receipt: `1ef30555ffddac62f5df5b7fa9069385255eb418aa06a5b3299b8613266a07b1`
- LV-05 occurrence screenshot: `b5acad7ef59e52e1be97db2a578e564f0a7bb79ddaba892a48064cebf867aa02`
- packaged leave receipt: `4b4d8a51acf4b7bcb8948f6c0f62f655165941ef2e4ffde910439e1e0ac72967`
- packaged profile receipt: `6347252b5a78f5009cb0465d58d05dcc3db522e90ef1ed2c8914683de80182c5`
- packaged profile screenshot: `6c6c66bef8a1095517a2c6b362d4f1f2d45035df9aa4c191108e13e9595667ff`
- macOS build receipt: `dbfd27233ed47386dc817395e5773d233f9bef3e60433a9250cd1f85eab4aea3`
- Windows build receipt: `8906e516187c559bc7cb3c09cc8620b056a36f65d031a94f9d7cacb9159a0486`

## Known limits and claim boundary

- 이 증거는 로컬 internal package 기능과 Mac·Windows renderer 동등성을 증명한다.
- internal package runtime은 격리된 로컬 프로필 QA를 위해 private roster/photo를 포함한다. 공개 renderer에는 포함되지 않았지만 formal package 전체의 PII 0을 주장하지 않는다.
- macOS internal package는 Developer ID 서명·공증·staple·Gatekeeper 배포 준비 상태가 아니다.
- Windows package는 macOS에서 생성한 unsigned x64 후보다. Windows 네이티브 설치·로그인·휴가·급여·재시작·제거·Authenticode는 별도 QA가 필요하다.
- AWS production traffic, 공개 release, provider/bank/tax write, production go-live를 증명하지 않는다.

