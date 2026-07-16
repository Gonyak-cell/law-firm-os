# Forest v0.1.17 Main 통합·릴리스 Goal 실행계획

작성일: 2026-07-15  
실행 정본 후보: `/private/tmp/lawos-forest-v016-release`  
종료 세션: `019f5b4c-e652-78a1-8a19-9215b88d9e21`  
기준 브랜치: `codex/forest-v0.1.16-release-20260713`  
기준 HEAD: `7717d5cee158fc97056510e8aebc9e0854d34196`  
목표 버전: `0.1.17`  
상태: `IN_PROGRESS`
선행 계획: `workbook/hrx-leave-payroll-tuw-implementation-plan-2026-07-14.md`

## 1. 목적

종료된 Forest 세션의 미커밋 최종 작업물을 손실 없이 고정하고, 다른 체크아웃의 고유 기능과 최신 `origin/main`을 기능·데이터·UI·패키지 수준에서 대조한 다음, 현재 Forest UI와 완성된 휴가·급여 런타임을 보존하는 상위 호환 후보를 `main`에 통합한다.

통합된 정확한 `main` SHA에서 버전과 출처가 식별되는 macOS·Windows 패키지를 새로 생성하고, 내부 검증·staging·formal release·production·go-live를 서로 다른 증거 단계로 유지한다. 실제 직원·계좌·정책·법률·세무 자료, 외부 provider write, 공개 릴리스 또는 production 전환은 필요한 owner 승인과 공급자 영수증이 확인되기 전에는 실행하지 않는다.

## 2. 완료 정의

이 Goal은 아래 조건이 모두 충족되어야 완료할 수 있다.

1. 종료 세션의 tracked/untracked 작업이 repo-safe checkpoint 커밋으로 고정되고 원본 파일 manifest와 tree hash가 일치한다.
2. 현재 루트 체크아웃의 고유 변경 25개와 공통·상이 파일 49개가 기능 단위로 `SUPERSEDED`, `PORT_TEST_ONLY`, `PORT_REQUIRED`, `REJECTED` 중 하나로 판정된다.
3. migration `011~016` 번호 충돌이 제거되고 빈 DB, 기존 `010`, 종료 세션 `025` 기준 upgrade·재실행·실패복구 검사가 통과한다.
4. Forest 후보가 기존 정상 릴리스, 종료 세션, 현재 세션, 최신 `origin/main`의 사용자 가치를 모두 대조한 기능 매트릭스에서 핵심 기능 손실 0건을 기록한다.
5. 구 로그인, Parnas/Petrabridge 이미지, 구 Matter 컬러 마크, 폐기된 UI reference, stale `offline.html` 진입과 중복 앱 창 회귀가 소스·패키지·실행 화면에서 모두 0건이다.
6. 후보 버전은 `0.1.17` 이상이며 동일 버전의 서로 다른 패키지가 생성되지 않는다.
7. candidate와 formal 패키지에 version, full commit SHA, renderer SHA-256, channel, build time이 포함된 build manifest가 존재한다.
8. `origin/main`과의 dry-run 및 실제 integration 브랜치 병합이 완료되고, 일괄 `ours`/`theirs` 충돌 해결 없이 파일별 근거가 기록된다.
9. 휴가·급여·API·Web·Desktop·migration·authz·PII 전체 자동 검증이 0 fail이다.
10. 6개 역할과 `1512/1280/1024/820/720px`에서 실제 브라우저 QA가 overflow, broken image, empty button, unlabeled control, dead action, unexpected console/page error 0을 기록한다.
11. macOS 실제 패키지는 로그인부터 휴가·급여 핵심 흐름, 재시작 복원, Developer ID 서명·공증·staple·Gatekeeper 검사를 통과한다.
12. Windows 실제 환경에서 설치·실행·로그인·휴가·급여·재시작·제거/재설치·Authenticode 검사를 통과한다.
13. 검증된 integration SHA가 PR을 통해 `main`에 병합되고, 후보 브랜치 패키지가 아니라 병합된 정확한 `main` SHA에서 최종 패키지가 재생성된다.
14. internal package, staging, formal package, production approval, go-live가 별도 상태와 영수증으로 기록된다.
15. 실제 직원 migration, 실제 정책 적용, provider production write, 공개 릴리스 또는 go-live가 필요한 시점에는 owner 승인과 검증 가능한 receipt가 없으면 해당 TUW를 `BLOCKED`로 남기고 Goal 전체를 거짓 완료하지 않는다.

## 3. 현재 검증된 사실

### 3.1 종료 세션 작업물

- Goal 상태: `complete`
- 계획 상태: `REPO_IMPLEMENTATION_COMPLETE_EXTERNAL_BLOCKED`
- 현재 HEAD: `7717d5ce`
- tracked 수정 파일: 115개
- untracked 파일 경로: 92개
- `git status --short` 항목: 195개
- tracked diff: `8,588 insertions / 1,797 deletions`
- 앱 버전: `0.1.16`
- renderer SHA-256: `ffd5dacef10d95ba000cf1b9c6937de6028a881eded91f79c642153757c27df4`
- 중요한 사실: 핵심 구현은 HEAD가 아니라 dirty working tree에 있으므로 현재 HEAD를 병합하면 구현 대부분이 누락된다.

### 3.2 종료 세션 검증 증거

- 종료 세션 휴가 회귀 보고: `340/340 PASS`였으나 단일 명령 manifest가 보존되지 않음
- FZ-006 재현 가능 고유 휴가·migration·runtime 범위: `220/220 PASS`
- 급여 domain: `54/54 PASS`
- 급여 API·역할 매트릭스: `7/7 PASS`
- 급여 Web UI: `3/3 PASS`
- Desktop bridge·renderer: `26/26 PASS`
- 전역 UI 회귀: `31/31 PASS`
- 브라우저: 6개 역할 × 5개 viewport PASS
- macOS 내부 패키지 E2E·재시작 PASS
- Windows renderer hash parity·PE·ZIP PASS
- Windows native install/runtime smoke: 미수행
- Developer ID·공증·Gatekeeper formal 검증: 미수행
- Authenticode: 미수행
- 실제 직원·계좌 migration과 외부 provider production write: 미수행

### 3.3 현재 루트 체크아웃과의 관계

- RC-001 현재 루트 dirty 항목: 77개 (`tracked 56`, `untracked 21`)
- 종료 세션과 전체 공통 dirty 경로: 52개
- 통합 Goal metadata: 1개(제품 비교에서 제외)
- 제품 공통 dirty 경로: 51개
- 제품 공통 경로 중 동일 내용: 2개
- 제품 공통 경로 중 다른 내용: 49개
- 현재 루트에만 존재하는 dirty 경로: 25개
- 종료 Forest content checkpoint에만 존재하는 경로: 170개
- 현재 루트의 migration `011~016`은 종료 세션 migration `011~016`과 번호·목적이 충돌한다.

## 4. 진실 상태와 금지되는 과장

다음 상태를 서로 대체하여 표현하지 않는다.

```text
SOURCE_IMPLEMENTED
TARGETED_TEST_PASS
FULL_REGRESSION_PASS
BROWSER_VERIFIED
PACKAGE_VERIFIED
SIGNED_NOTARIZED
WINDOWS_NATIVE_VERIFIED
STAGING_DEPLOYED
PRODUCTION_APPROVED
PRODUCTION_DEPLOYED
GO_LIVE
```

- 내부 합성 adapter PASS는 provider sandbox receipt가 아니다.
- provider sandbox receipt는 production write 성공이 아니다.
- macOS 내부 bundle PASS는 서명·공증 formal release가 아니다.
- Windows PE/ZIP PASS는 Windows native 실행 PASS가 아니다.
- `main` 병합은 AWS production deploy나 go-live가 아니다.
- Git HEAD만 최신이라고 해서 dirty working tree 기능이 포함된 것은 아니다.

## 5. 전역 실행 원칙

1. 종료 세션 worktree를 checkpoint하기 전 fetch, rebase, merge, reset, checkout, clean, prune을 실행하지 않는다.
2. 사용자 변경과 생성 파일을 삭제하거나 되돌리지 않는다.
3. 한 worktree에는 한 쓰기 세션만 연결한다.
4. current root 브랜치를 Forest 후보에 통째로 merge 또는 cherry-pick하지 않는다.
5. `dist`, cache, runtime store, secret, browser profile, 실제 PII는 커밋하지 않는다.
6. migration은 forward-only이며 기존 데이터 덮어쓰기를 금지한다.
7. UI 충돌은 현재 Forest 화면을 정본으로 삼고 동작만 선별 이식한다.
8. API·인증 충돌은 더 엄격한 scope, tenant, actor, resource, audit 검증을 보존한다.
9. 급여 금액은 정수 KRW, 비율은 정수 basis point, 시간은 정수 분을 유지한다.
10. release build는 clean worktree와 승인된 exact SHA에서만 생성한다.
11. 모든 패키지 검증은 실제 실행 프로세스의 절대경로와 bundle manifest를 확인한다.
12. 외부 write, branch default 변경, force push, 실제 migration, 공개 릴리스는 명시적 승인 없이 실행하지 않는다.

## 6. 의존성 그래프

```text
FZ checkpoint
  -> RC current-session reconciliation
    -> MG migration normalization
      -> CP capability parity
        -> PV provenance/version guard
          -> MI origin/main integration
            -> QA source/browser/package verification
              -> MR main merge and exact-SHA rebuild
                -> DP internal/staging/formal/production gates
                  -> CL closeout and recurrence prevention
```

`FZ`, `RC`, `MG`, `CP`가 완료되기 전에는 `MI`를 시작할 수 없다.  
`MI` 이후 전체 QA가 완료되기 전에는 `MR`을 시작할 수 없다.  
`MR` 이후 exact-main-SHA 재빌드가 완료되기 전에는 어떤 release asset도 게시할 수 없다.

## 7. Testable Units of Work

각 TUW는 `READY`, `IN_PROGRESS`, `DONE`, `BLOCKED`만 사용한다. 완료 시 변경 파일, 명령, 결과, 증거 경로, commit SHA를 본 문서의 실행 원장에 기록한다.

### 7.1 FZ: 종료 세션 checkpoint

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| FZ-001 | DONE | 쓰기 세션 종료와 worktree 정지 증명 | 종료 세션 final 메시지·Goal complete·실행 프로세스·mtime 확인 | 동일 파일 hash를 2회 측정 | 두 측정 사이 변경 0, 쓰기 프로세스 0 |
| FZ-002 | DONE | tracked/untracked 전체 manifest | status v2, name-status, mode, size, SHA-256, ignore 분류 | manifest row count 대조 | tracked 115·untracked 92 기준 설명 가능한 차이만 존재 |
| FZ-003 | DONE | 비밀정보·PII·runtime artifact 제외 | secret scan, ignore audit, 로컬 store/token/browser profile 검사 | secret/PII validator | 커밋 후보 secret 0, 승인 없는 실제 PII 0 |
| FZ-004 | DONE | 원본 보존 patch와 archive branch | binary patch, untracked archive manifest, `archive/forest-session-final-20260715` | patch SHA·복원 dry-run | 별도 임시 worktree에 동일 tree 복원 가능 |
| FZ-005 | DONE | repo-safe checkpoint 커밋 | source, migrations, tests, scripts, plans, safe receipts 커밋 | pre/post tree hash | `FOREST_CHECKPOINT_SHA` 기록, worktree clean |
| FZ-006 | DONE | checkpoint 재현 검증 | 종료 세션 전체 테스트와 renderer build 재실행 | 종료 세션 PASS count와 대조 | 0 fail, renderer SHA 차이는 원인 설명 또는 동일 hash |

### 7.2 RC: 현재 루트 세션 변경 대조

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| RC-001 | DONE | current root 안전 보존 | 현재 루트 binary patch·file manifest·SHA 생성 | patch apply dry-run | 사용자 변경 손실 0 |
| RC-002 | DONE | 51개 제품 공통 파일 비교 | SHA·라인 delta·AST/API contract·test assertion·UI selector·의미 검토 | 재현 CLI, root fingerprint 전후 대조 | 51/51 판정, 동일 2·상이 49·미분류 0 |
| RC-003 | DONE | 25개 root-only 파일 기능 대조 | payroll item/profile/time input, manual adjustment, profile smoke/runbook 점검 | 종료 세션 관련 테스트와 교차 실행 | 25/25 판정, 관련 테스트 38/38 PASS, 루트 무변경 |
| RC-004 | DONE | 상위 호환 기능 매트릭스 | Forest-only 170개 보존, root 기여 76개 4종 판정, `PORT_REQUIRED` 31개를 6개 이식군으로 고정, 10개 기능 축 anchor 대조 | 재현 CLI, checkpoint hash, root fingerprint, 누락 acceptance count | Forest 170/170·root 76/76·port 31/31·기능 축 10/10, 미판정·고아·예상 밖 변경 0 |
| RC-005 | DONE | 필요한 기능만 Forest 후보에 이식 | 아래 RC-005-A~G를 순서대로 수행하고 UI 통째 복사 금지, 테스트 우선 이식, 필요한 코드 최소 구현 | 이식 전 failing·이식 후 passing | A~G 전부 DONE, 기존 Forest 회귀 0 |

#### RC-005 세부 Testable Units

| ID | 상태 | 기능 계약 | 구현 작업 | 선행 실패 증거 | 완료 조건 |
|---|---|---|---|---|---|
| RC-005-A | DONE | HRX runtime·authz 합집합 | payroll item/profile/attendance 승인 route policy와 scope를 현재 6-role matrix에 추가하고, 신규 서비스를 `hrx-payroll-runtime`과 `payroll-runtime` route에 연결한다. 기존 leave/payroll route와 tenant/session/step-up 검증은 유지한다. | payroll 정책 404/미해결 2건과 신규 runtime 테스트 0/3을 기록 | 정책·6-role 최소 scope·canonical runtime·signed purpose/tenant/actor 검증 및 관련 회귀 102/102 PASS |
| RC-005-B | DONE | 휴가 규칙 버전·원장 단일 소유 | logical lineage/version/as-of, 월·연·근속 120개월 table, immutable update, deactivate, 029 logical-version unique index를 Forest entitlement 원장에 연결했다. | `updateRule` 부재로 신규 계약 실패를 기록 | preview 전 write 0, idempotency 중복 0, 규칙 version/deactivate/as-of/receipt와 fresh·upgrade·recovery migration PASS |
| RC-005-C | DONE | CSV/XLSX 휴가 발생 파일 | 동일 versioned contract를 CSV/XLSX template·typed parser·occurrence upload batch에 연결하고 ZIP/크기/행/헤더/수식 경계를 fail-closed로 구현했다. | XLSX parser export 부재와 신규 XLSX 계약 실패를 기록 | malformed/archive/formula/5,000행 초과 차단, preview partial write 0, CSV/XLSX 동일 batch contract 및 관련 회귀 PASS |
| RC-005-D | DONE | Forest 휴가 compact action UI | 규칙 버전·중지, CSV/XLSX 발생, 승인 대기·팀 목록·사용 내역을 현재 Forest 44px 단일 행·단일 action 기준으로 정리하고 Web·브라우저·패키지에서 검증했다. | 새 version/deactivate·CSV/XLSX·empty-copy 부재 assertion의 구현 전 실패와 stale QA 계약 실패를 기록 | 상위 분류 반복, 이중 승인 문구, 무의미한 empty copy, 검증용 대사 문구 0; 관련 dead action 0; packaged leave 10/10 PASS |
| RC-005-E | DONE | 서지원 프로필·사진·패키지 경계 | `jwsuh@amic.kr -> 서지원` 결합, 이미지 magic-byte 검사, public renderer roster PII 차단, 동일 SHA Mac·Windows renderer를 검증했다. | fake PNG·SVG·generic fallback·PII fixture negative test와 stale package hash 차단을 기록 | `세션 사용자` fallback 0, 이름·부서·직위·연락처 정합, invalid image 0, public renderer PII 0, packaged profile PASS |
| RC-005-F | DONE | 급여 catalog·assignment·approved time 상위 호환 | item CRUD, masked profile assignment, attendance approval receipt를 canonical payroll input snapshot에 연결했고 별도 payroll time snapshot 계보는 도입하지 않았다. | 신규 runtime 테스트 0/3 실패를 기록 | tenant isolation, optimistic version, append-only assignment, raw amount 노출 0, 승인 receipt 기반 근태, 기존 run/payment/filing/year-end 회귀 0 |
| RC-005-G | DONE | 전체 증거·회귀·원본 보존 | 31개 PORT_REQUIRED source를 6개 그룹의 실제 Forest anchor/test로 crosswalk하고 전체 HRX/API/Web/Desktop/PII/AI-slop 검사를 실행했다. | A~F 전 entry SHA와 failing test receipt 수집 | port 31/31, 미구현 0, HRX 185/185, API/authz/profile 322/322, Web 0 fail, Desktop 0 fail, root fingerprint 동일, exit `cc5f7f87` |

RC-005의 공통 중단 조건:

- root 파일이나 UI를 통째로 복사해야만 통과하는 경우에는 구현을 중단하고 Forest anchor 기준으로 재설계한다.
- `011~016` root migration 파일 또는 병렬 payroll profile/time snapshot table을 다시 도입하지 않는다.
- 승인 전 write, 원장 직접 수정, raw 급여 금액·계좌·휴가 사유 노출, tenant/actor/resource 검증 누락은 fail-closed로 처리한다.
- UI 변경이 필요한 RC-005-D/E는 Lazyweb 보고서를 증거로 사용하되 현재 Forest 렌더링·44px 밀도·단일 행 규칙을 최종 기준으로 한다.

RC-003에서 우선 검토할 root-only 항목:

- `apps/api/src/routes/hrx/payroll.js`
- payroll items/profile/time-input API와 tests
- `packages/hrx/src/payroll-item-catalog.js`
- `packages/hrx/src/payroll-profile-service.js`
- `packages/hrx/src/payroll-time-input-snapshot.js`
- `packages/hrx/src/leave/manual-adjustment-file.js`
- `packages/hrx/src/leave/allocation.js`
- profile contact runbook과 packaged smoke
- LV009 UI 회귀 테스트와 화면 증거

### 7.3 MG: migration 번호·계약 정규화

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| MG-001 | DONE | migration 충돌 crosswalk | root `011~016`의 145개 SQL 계약 단위를 Forest `001~025`와 대조하고 `026~028` forward-only 목적지로 분류 | 재현 가능한 schema parser·crosswalk·collision/root fingerprint 검증 | 145/145 매핑, 이식 71·상위호환 71·동일 1·충돌 거부 2, 미분류·중복·Forest 충돌 0 |
| MG-002 | DONE | 중복 구현 제거 | 폐기·충돌 거부 73개 계약의 부재 또는 단일 Forest anchor 소유를 강제하고 root 파일명·해시·폐기 runtime 심볼 재유입 차단 | deprecation plan validator, profile CAS 회귀, root fingerprint | 73/73 강제, 부재 61·Forest 021 소유 12, 중복 table/column/index/trigger·root 복사·runtime hit 0 |
| MG-003 | DONE | 누락 기능은 `026+`로 이동 | 승인된 71개 계약만 `026~028` additive migration과 Forest canonical runtime adapter로 구현 | exact contract·filename/order/loader·forbidden schema·runtime wiring validator | 001~028 연속, `026=49`·`027=18`·`028=4`, 누락·예상 밖·정의 불일치·금지 계약·번호 충돌 0, 타깃 49/49·HRX 전체 563/563·web build PASS |
| MG-004 | DONE | fresh DB 검증 | native `node:sqlite` 빈 DB에서 `001~028`을 순차 실행하고 exact schema·제약·seedless·integrity·determinism 증명 | fresh DB validator·migration tests·전체 HRX·web build | 28/28 실행, table/index/trigger `73/53/12`, required/forbidden column `7/7`, constraint probe 7/7, 빈 table 73/73, integrity `ok`, FK error 0, HRX 564/564, web build PASS |
| MG-005 | DONE | upgrade 검증 | 실제 파일 SQLite를 `010`, `020`, `025`에 고정하고 synthetic golden row를 저장한 뒤 close/reopen, `028`까지 upgrade, 다시 read-only reopen하여 기존 row·column·schema·default/backfill을 검증 | durable checkpoint validator·schema/data golden·전체 HRX·web build | 3/3 checkpoint, 기존 32 table·32 row의 변경·손실·예상 밖 생성 0, backfill 30/30, final schema fresh DB 일치 3/3, durable reopen 3/3, integrity·FK error 0, HRX 565/565, web build PASS |
| MG-006 | DONE | 재실행·중간 실패·복구 | canonical immutable migration receipt 재실행, 중간 실패 snapshot rollback, checksum backup restore, 실제 SQLite 025 file backup·026~028 재적용·transaction rollback 검증 | deterministic recovery validator·migration safety suite·전체 HRX·web build | 최초 28/28·재실행 0/28, canonical·SQLite partial commit 0, backup restore exact, rollback 전후·reopen schema/data hash 동일, integrity ok·FK error 0, HRX 566/566, web build PASS |

명시적 충돌:

| 번호 | 현재 루트 | 종료 Forest |
|---|---|---|
| 011 | payroll items | leave type economics |
| 012 | payroll profiles | leave job outbox |
| 013 | payroll time inputs | leave accrual batches |
| 014 | leave usage units | leave occurrence metadata |
| 015 | leave accrual rule versions | leave occurrence upload batches |
| 016 | leave entitlement lifecycle | leave promotion exclusions |

현재 루트의 `011~016` 파일을 그대로 cherry-pick하지 않는다.

### 7.4 CP: 최신·상위 호환 기능 검증

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| CP-001 | DONE | 비교 대상 고정 | 공개 stable 부재를 확인하고 최신 검증 v0.1.16 formal-candidate prerelease, Forest checkpoint, current root, origin/main, candidate의 full SHA·tree·ref·시점을 기록 | remote ref 일치·commit ancestry 10쌍 | 5/5 SHA, 선형 계보, 누락 0 |
| CP-002 | DONE | 제품 기능 매트릭스 | 5개 고정 SHA에서 Home, Client, Matter, People, Search, Portal, auth/profile, leave, payroll, persistence/authz/package의 route·menu·API·source·proof를 비교 | exact Git object matrix·Web 75/75·authz 159·API 23/23 | 10/10 축, 170/170 보존, route·section·policy 미해결 누락 0 |
| CP-003 | DONE | 휴가 상위 호환 검증 | 유형, 발생, lifecycle, usage, promotion, integrations, privacy | leave 173/173·TUW 49/49·기능 축 7/7·패키지 시나리오 10/10 | 0 fail, package QA 이후 제품 runtime 변경 0 |
| CP-004 | DONE | 급여 상위 호환 검증 | inputs, calc, deductions, run, docs, bank, tax, migration | payroll 76/76·TUW 61/61·기능 축 8/8·패키지 시나리오 9/9 | 0 fail, GATE-002 승인 경계 유지 |
| CP-005 | DONE | 서지원 계정·프로필 연결 검증 | `jwsuh@amic.kr -> 서지원` identity/profile/contact/career | 관련 회귀 43/43·identity 19/19·source 5/5·package 11/11 | session user fallback 0, public renderer PII 0 |
| CP-006 | DONE | UI·카피 회귀 검증 | 44px, 단일행, 중복 메뉴, 불필요 설명, legacy assets | 소스 20/20·패키지 19/19·legacy 4/4·Web 142/142·Desktop 21/21·sloplint | strong 0, 의도되지 않은 2줄 0, product runtime 변경 0 |
| CP-007 | DONE | 패키지 runtime 경계 검증 | local API, IPC session, canonical tenant, bundled runtime imports | exact `matter.app` smoke·Mac/Windows byte parity·reachable import graph | renderer/runtime 동일, 외부 source·unresolved import·synthetic tenant fallback 0 |

### 7.5 PV: 버전·빌드 provenance

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| PV-001 | DONE | `0.1.17` 고유 버전 | package/Info.plist/update metadata 정렬 | version validator | 동일 version·상이 hash 0 |
| PV-002 | DONE | build manifest | version, full SHA, renderer hash, channel, time 포함 | manifest schema/hash | package 내부와 receipt 일치 |
| PV-003 | DONE | clean-SHA build gate | dirty tree·SHA 불일치·허용 외 branch formal build 차단 | positive/negative tests | formal bypass 0 |
| PV-004 | DONE | 채널·bundle ID 분리 | dev/internal/candidate/formal 분리 | package metadata tests | OS 앱 식별 충돌 0 |
| PV-005 | DONE | SHA 기반 artifact 경로 | `dist/releases/<version>/<sha>/...` | path validator | generic path를 release truth로 사용 0 |
| PV-006 | DONE | legacy asset/reference validator | stale login, Parnas, Petrabridge, old mark, retired UI refs 검사 | source 191 files·retired 21; Mac/Windows 35+35; unit 4/4 | 금지 참조·legacy hash·offline entry 0 |
| PV-007 | DONE | canonical launch command | 중복 종료, exact path launch, PID/path/manifest 확인 | unit 4/4·PV-001~007 25/25·actual launch/relaunch·other-bundle negative·package visual QA | 다른 bundle 차단·exact PID 1·manifest/index/renderer 일치 |

### 7.6 MI: `origin/main` 통합

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| MI-001 | READY | remote truth 갱신 | fetch prune/tags, origin/main·tags·deployed SHA 기록 | remote refs | stale local main 사용 0 |
| MI-002 | DONE | merge dry-run 보고서 | merge-base, merge-tree, conflict/path inventory | report validator | 충돌 파일·정책 전부 기록 |
| MI-003 | DONE | 통합 방식 결정 | normal merge 또는 owner 승인 main-next cutover | decision receipt | 무근거 force push 0 |
| MI-004 | DONE | 전용 integration worktree | `integration/forest-v0.1.17` 생성 | worktree/branch check | 다른 쓰기 세션 0 |
| MI-005 | DONE | 파일별 충돌 해결 | UI=Forest, auth=엄격, migration=수동, ops=안전 우선 | conflict ledger | unresolved 0, blanket ours/theirs 0 |
| MI-006 | DONE | main-only 필수 변경 보존 | security, infra, backup, AWS, release validators 대조 | 155-path main-only matrix·268 targeted tests·source validators | 필수 변경 누락 0 |
| MI-007 | DONE | candidate commit 고정 | integration tree commit·tag candidate | clean/hash check | `INTEGRATION_SHA=4c81d861693472af48a680e5757b352bb9945b9b` 기록 |

MI-003 중단 조건:

- 충돌 규모가 개별 검토 불가능한 경우
- default branch 전환 또는 force update가 필요한 경우
- main-only 운영 변경의 보존 여부가 불명확한 경우

이 경우 owner 결정을 요청하고 `BLOCKED`로 둔다.

### 7.7 QA: 통합 후보 전수 검증

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| QA-001 | DONE | domain·API 전체 PASS | HRX leave/payroll/authz/API 전부 실행 | 228 files·1,161 tests·8 validators | 0 fail·0 skip |
| QA-002 | DONE | Web·Desktop 전체 PASS | typecheck, build, UI, desktop tests | unique 246 cases·245 pass·1 browser-gated skip; entrypoint 57/57; build PASS | 0 fail, 기존 skip 문서화 |
| QA-003 | DONE | migration·privacy·security PASS | fresh/upgrade/reopen, tenant, PII, secret, public renderer | 18 files·59 tests·10 validators | 치명적 finding 0 |
| QA-004 | DONE | 브라우저 역할·viewport PASS | employee, manager, HR, preparer, approver, no-scope × 5 viewport | browser receipt | unexpected error·overflow·dead action 0 |
| QA-005 | DONE | macOS 실제 패키지 PASS | login, profile, leave, payroll, restart, sign/notarize/staple/Gatekeeper | package receipt | formal macOS PASS |
| QA-006 | BLOCKED | Windows native PASS / Authenticode BLOCKED | install, launch, login, leave/payroll, restart, uninstall, Authenticode | Windows receipt | native PASS, installer·executable `Valid` 서명 필요 |
| QA-007 | DONE | renderer parity | Web/candidate/macOS/Windows renderer hashes 비교 | SHA-256 | 승인된 변형 외 불일치 0 |
| QA-008 | DONE | 회귀 screenshot manifest | 핵심 화면·각 역할·양끝 viewport 캡처 | manifest/hash | stale window 0 |
| QA-009 | DONE | 최종 QA 보고서 | commands, counts, hashes, limitations, blockers 정리 | evidence link check | 18/18, 끊긴 증거 링크 0 |

기준 명령은 실제 package scripts를 우선 사용하고 아래 묶음을 포함한다.

```bash
node --test --test-concurrency=1 packages/hrx/test/leave-*.test.js
node --test --test-concurrency=1 packages/hrx/test/payroll-*.test.js
node --test --test-concurrency=1 apps/api/test/hrx/leave-*.test.js
node --test --test-concurrency=1 apps/api/test/hrx/payroll-*.test.js
node --test --test-concurrency=1 apps/web/test/leave-*.test.mjs
node --test --test-concurrency=1 apps/web/test/payroll-*.test.mjs
npm --workspace apps/web run typecheck
npm --workspace apps/web run test:ui
npm --workspace apps/web run build
npm --workspace apps/desktop run test:smoke
npm --workspace apps/desktop run test:file-bridge
npm run public-renderer:pii:validate
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

### 7.8 MR: `main` 병합·exact-SHA 패키징

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| MR-001 | READY | 검토 가능한 PR | diff manifest, conflict ledger, QA links, blockers 포함 | PR/CI status | required checks green, review 승인 |
| MR-002 | READY | `main` 병합 | 승인된 방식으로 merge | remote main ancestry | `MAIN_MERGE_SHA` 기록 |
| MR-003 | READY | clean main release worktree | merge SHA detached 또는 release branch worktree 생성 | clean/HEAD check | HEAD 정확히 일치 |
| MR-004 | READY | main SHA에서 재빌드 | candidate artifacts 재사용 금지 | build manifest | package SHA=`MAIN_MERGE_SHA` |
| MR-005 | READY | release tag | `matter-desktop-v0.1.17-<shortsha>` | tag ancestry | tag가 main SHA 직접 가리킴 |
| MR-006 | READY | 최종 artifact hash·SBOM | mac/win hashes, manifest, SBOM, signatures | receipt validator | artifact 누락 0 |

### 7.9 DP: 배포·승인 경계

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| DP-001 | READY | 내부 Mac·Windows 배포 | 승인된 내부 채널에 artifact 게시 | install smoke | 내부 설치 PASS |
| DP-002 | READY | AWS staging | approved profile로 API·migration staging 배포 | health/smoke/metrics | staging PASS |
| DP-003 | BLOCKED | 실제 정책·자료 migration | owner manifest와 private-source approval 필요 | count/hash/reconciliation | 승인·영수증 전 write 0 |
| DP-004 | BLOCKED | provider sandbox·production | email/calendar/bank/tax credentials와 receipt 필요 | provider receipt | receipt 전 success 0 |
| DP-005 | BLOCKED | production AWS 전환 | deploy approval, rollback rehearsal, staging PASS 필요 | alias/version/health | 승인 전 prod 변경 0 |
| DP-006 | BLOCKED | 공개 formal release·go-live | 법무·노무·세무·owner·서명·Windows 증거 필요 | release receipt | 모든 승인 전 public 0 |
| DP-007 | READY | 배포 후 관찰 | error rate, latency, auth, critical flows 15분 이상 | monitoring receipt | rollback trigger 미발생 |

### 7.10 CL: 종료·재발 방지

| ID | 상태 | 결과 | 작업 | 자동 검증 | 완료 조건 |
|---|---|---|---|---|---|
| CL-001 | READY | canonical candidate registry | branch, SHA, version, artifact paths를 repo-safe JSON에 기록 | schema validator | 새 세션이 정본 식별 가능 |
| CL-002 | READY | canonical launch runbook | exact path, PID, version, manifest, listener 확인 | runbook smoke | generic launch 지시 0 |
| CL-003 | READY | release truth 문서 | implementation/package/deploy/go-live 상태 분리 | links/status check | 과장 claim 0 |
| CL-004 | READY | old bundle inventory | `/Applications`, repo dist, temp worktrees 패키지 목록 | path/hash report | 어떤 bundle이 최신인지 모호함 0 |
| CL-005 | BLOCKED | old worktree·bundle 정리 | owner 확인 후 archive/prune/delete | post-clean inventory | 승인 없는 삭제 0 |
| CL-006 | READY | 최종 closeout | main SHA, tags, hashes, tests, receipts, blockers, rollback 기록 | closeout validator | 필수 증거 누락 0 |

## 8. 브라우저·패키지 수동 QA 체크리스트

### 8.1 역할

- 일반 직원
- 매니저
- HR
- 급여 작성자
- 급여 승인자
- 관련 scope 없음

### 8.2 화면

- Forest 로그인 애니메이션과 로그인 창
- Home hero, 카드, 최근 작업, 캘린더
- Client 목록·상세
- Matter 목록·상세
- People 구성원·서지원 프로필·사진·경력·연락처
- 출근/퇴근 단순 기록
- 휴가 유형·자동발생·발생 관리·사용내역·승인·촉진·퇴사정산
- 급여 기간·입력·계산·문제·승인·마감·명세서·은행·신고·연말정산
- Search
- Portal
- 알림·메시지·승인 대기 패널

### 8.3 화면 기준

- 문서 root overflow 0
- 허용되지 않은 offscreen control 0
- broken image 0
- empty button 0
- unlabeled control 0
- dead action 0
- unexpected HTTP error 0
- console error 0
- page error 0
- 구 자산 0
- `세션 사용자` fallback 0
- 설명용 불필요한 2줄 텍스트 0
- 반복 제목·메타 0
- 표 기본 행 44px
- 키보드 focus·Escape·opener return PASS

## 9. 배포 전 체크리스트

### Pre-Deploy

- [ ] integration SHA와 main merge SHA 기록
- [ ] CI 전체 green
- [ ] critical bug 0
- [ ] migration fresh/upgrade/recovery PASS
- [ ] feature flag·runtime profile 확인
- [ ] rollback artifact와 이전 Lambda version 보존
- [ ] macOS 서명·공증·Gatekeeper PASS
- [ ] Windows native PASS·Authenticode BLOCKED (`NotSigned`; approved certificate/provider 필요)
- [ ] owner·법무·노무·세무 승인 상태 기록
- [ ] 실제 migration·provider 권한 receipt 확인

### Deploy

- [ ] 내부 패키지 설치 smoke
- [ ] staging API·migration
- [ ] 6-role staging smoke
- [ ] health·error·latency 확인
- [ ] production approval receipt 확인
- [ ] canary 또는 Lambda alias 전환
- [ ] formal assets 게시
- [ ] 핵심 흐름 재검증

### Post-Deploy

- [ ] 최소 15분 모니터링
- [ ] auth·profile·leave·payroll 오류 확인
- [ ] artifact hash·deployment SHA 대조
- [ ] release notes·closeout 갱신
- [ ] 이해관계자 통지
- [ ] rollback 필요 여부 판정

## 10. 롤백 트리거

다음 중 하나라도 발생하면 신규 배포를 중단하거나 이전 안정 버전으로 롤백한다.

- 흰 화면, renderer crash, local API 기동 실패
- Forest 이전 로그인·자산·레이아웃 재등장
- 실행 프로세스 경로와 manifest SHA 불일치
- `jwsuh@amic.kr`이 서지원이 아닌 fallback 사용자로 표시
- Home·Client·Matter·People·Search·Portal 핵심 화면 누락
- 휴가 잔액·발생·사용·급여 입력 대사 불일치
- 급여 gross/deduction/net 또는 지급 대사 불일치
- 권한 밖 PII·급여·휴가 사유 노출
- migration partial commit, data loss, rerun duplication
- provider receipt 전 success 표시
- macOS/Windows 설치·서명 검증 실패
- API 오류율 또는 지연이 승인된 baseline을 초과
- package hash, renderer hash, deployed SHA 중 하나라도 불일치

롤백 자산:

- 마지막 검증된 `0.1.15` formal artifact
- Forest checkpoint와 integration candidate tag
- 이전 Lambda published version·alias
- migration 전 backup/snapshot
- 직전 renderer hash와 manifest
- repo-safe 복구 runbook

## 11. 사용자 결정 또는 외부 권한이 필요한 중단 조건

다음은 자동으로 추정하지 않는다.

1. `main` default branch 전환 또는 force update
2. 사용자 worktree·branch·bundle 삭제
3. 실제 직원·계좌·세금·휴가 원장 migration
4. 실제 취업규칙·급여정책·세율·보험·퇴직 규칙 확정
5. provider·bank·tax production credential 사용
6. 공개 release asset 게시
7. AWS production alias 또는 traffic 전환
8. go-live 선언
9. destructive migration 또는 rollback 불가능 변경
10. CI required check 우회

동일 blocker가 세 차례 연속 재확인되고 사용자 결정 없이는 진전할 수 없을 때만 Goal을 `blocked`로 표시한다. repo-safe 작업이 남아 있으면 계속 진행한다.

## 12. 증거 디렉터리 계약

각 TUW는 다음 위치에 증거를 남긴다.

```text
workbook/forest-v0.1.17-integration-evidence/<TUW-ID>/
  acceptance.md
  commands.txt
  files.txt
  tests.txt
  receipt.json
  screenshots/
```

`acceptance.md` 필수 필드:

```text
TUW
status
entry_sha
exit_sha
changed_files
commands
test_result
manual_qa
evidence_hashes
known_limits
external_blockers
```

실제 PII, credential, token, 계좌, 세금 원문은 증거 디렉터리에 저장하지 않는다. 저장소에는 count, hash, status, adjudication만 둔다.

## 13. 실행 원장

| 시각 | TUW | 상태 | Entry SHA | Exit SHA | 증거 | 비고 |
|---|---|---|---|---|---|---|
| 2026-07-15 | PLAN | DONE | `7717d5ce` | documentation-only | 본 문서 | Goal 생성 전 기준선 |
| 2026-07-15 | FZ-001 | DONE | `7717d5ce` | `fbf70623` | `workbook/forest-v0.1.17-integration-evidence/FZ-001/` | 단일 writer, 두 fingerprint 동일, stale Vite 종료 |
| 2026-07-15 | FZ-002 | DONE | `7717d5ce` | `fbf70623` | `workbook/forest-v0.1.17-integration-evidence/FZ-002/` | tracked 115, untracked 94 설명·hash manifest 고정 |
| 2026-07-15 | FZ-003 | DONE | `7717d5ce` | `fbf70623` | `workbook/forest-v0.1.17-integration-evidence/FZ-003/` | secret·승인 없는 PII·금지 binary 0 |
| 2026-07-15 | FZ-004 | DONE | `7717d5ce` | `fbf70623` | `workbook/forest-v0.1.17-integration-evidence/FZ-004/` | patch·untracked archive·분리 worktree 복원 PASS |
| 2026-07-15 | FZ-005 | DONE | `7717d5ce` | `fbf70623` | `workbook/forest-v0.1.17-integration-evidence/FZ-005/` | content tree `ba90b1da`, archive branch 고정 |
| 2026-07-15 | FZ-006 | DONE | `411d07e9` | `873ca9cc` | `workbook/forest-v0.1.17-integration-evidence/FZ-006/` | 고유 220/220, renderer byte-identical, PII PASS |
| 2026-07-15 | RC-001 | DONE | `88156fb5` | `67b72f44` | `workbook/forest-v0.1.17-integration-evidence/RC-001/` | root 77개, patch·archive·detached restore·원본 무변경 PASS |
| 2026-07-15 | RC-002 | DONE | `f68bb059` | `f943b8be` | `workbook/forest-v0.1.17-integration-evidence/RC-002/` | 전체 common 52, metadata 1 제외, 제품 51/51 의미 검토, 미분류·parse error 0 |
| 2026-07-15 | RC-003 | DONE | `65b742c5` | `7133e0df` | `workbook/forest-v0.1.17-integration-evidence/RC-003/` | root-only 25/25 판정: PORT_REQUIRED 10, PORT_TEST_ONLY 9, SUPERSEDED 5, REJECTED 1; 교차 테스트 38/38; 루트 지문 동일 |
| 2026-07-15 | RC-004 | DONE | `3a7335b6` | `0a92cb7e` | `workbook/forest-v0.1.17-integration-evidence/RC-004/` | 제품 비교 246개, Forest-only 170/170 보존, root 기여 76/76 판정, port 31/31 그룹 배치, 기능 축 10/10, 예상 밖 변경·미분류·고아 0 |
| 2026-07-15 | MG-001 | DONE | `3842a67f` | `6b1c615b` | `workbook/forest-v0.1.17-integration-evidence/MG-001/` | root SQL 계약 145/145: 이식 71·상위호환 71·동일 1·충돌 거부 2; `026=49`, `027=18`, `028=4`; 중복·충돌·미분류 0, 원본 지문 동일 |
| 2026-07-15 | MG-002 | DONE | `000617f5` | `b41d3f77` | `workbook/forest-v0.1.17-integration-evidence/MG-002/` | 폐기·거부 73/73: 부재 61, Forest 021 단일 소유 12; schema 중복·root 파일명/해시 복사·폐기 runtime hit 0; anchor 7/7, 회귀 21/21 PASS |
| 2026-07-15 | MG-003 | DONE | `b6fd5b71` | `32222efe` | `workbook/forest-v0.1.17-integration-evidence/MG-003/` | 001~028 연속·loader 28/28; 승인 계약 71/71 (`026=49`, `027=18`, `028=4`); 금지 계약·runtime 누락·원본 변경 0; 타깃 49/49·HRX 563/563·web build PASS |
| 2026-07-15 | MG-004 | DONE | `8d01be6f` | `229429fd` | `workbook/forest-v0.1.17-integration-evidence/MG-004/` | 실제 빈 SQLite 001~028 28/28; schema `73/53/12`; required/forbidden 7/7; 제약 7/7; seed 0·integrity ok·FK error 0; HRX 564/564·web build PASS |
| 2026-07-15 | MG-005 | DONE | `f59b3289` | `9722f647` | `workbook/forest-v0.1.17-integration-evidence/MG-005/` | 실제 파일 SQLite 010·020·025 -> 028; synthetic golden 32 table·32 row 변경·손실·예상 밖 생성 0; backfill 30/30; final schema fresh DB 일치 3/3; durable reopen 3/3; integrity·FK error 0; HRX 565/565·web build PASS |
| 2026-07-15 | MG-006 | DONE | `a79cb5f2` | `75a3851e` | `workbook/forest-v0.1.17-integration-evidence/MG-006/` | canonical 최초 28/28·재실행 0/28; injected failure partial receipt 0; snapshot backup restore exact; SQLite 025 file restore·026~028 재적용 exact; failed transaction schema/row 잔존 0; integrity ok·FK error 0; HRX 566/566·web build PASS |
| 2026-07-15 | RC-005-A/B/C/F | DONE | `931ae4c4` | `ee03b8c1` | `workbook/forest-v0.1.17-integration-evidence/RC-005/backend-acceptance.md` | runtime·authz·leave rule/XLSX·payroll catalog 102/102, migration 8/8, web typecheck PASS |
| 2026-07-15 | RC-005-D/E | DONE | `ee03b8c1` | `75f10995` | `workbook/forest-v0.1.17-integration-evidence/RC-005/ui-profile-acceptance.md` | Web·LV03/04/05·Mac package·profile·public renderer PII PASS; Mac/Windows renderer 동일; formal/native 경계 분리 |
| 2026-07-15 | RC-005-G | DONE | `051344d9` | `cc5f7f87` | `workbook/forest-v0.1.17-integration-evidence/RC-005/regression-acceptance.md` | port 31/31·대체 5·미구현 0; HRX 185/185, API/authz/profile 322/322, Web 142+1 skip, Desktop 97/97, migration 19/19, PII/security PASS; 루트 지문 동일 |
| 2026-07-15 | CP-001 | DONE | `c342cc56` | `c342cc56` | `workbook/forest-v0.1.17-integration-evidence/CP-001/` | 원격 main·root·v0.1.16 기준선·Forest checkpoint·candidate 5/5 고정; published stable 0, formal-candidate prerelease 경계 보존; ancestry 10/10, candidate main 대비 +240/-0 |
| 2026-07-15 | CP-002 | DONE | `b6853d52` | `b6853d52` | `workbook/forest-v0.1.17-integration-evidence/CP-002/` | 5개 SHA·10개 제품 축; 후보 nav 6, People section 73, HRX policy 정의 153/실효 159, Forest 170/170; prior route·section·policy 미해결 누락 0; Web 75/75·API 23/23 |
| 2026-07-15 | CP-003 | DONE | `17700c54` | `17700c54` | `workbook/forest-v0.1.17-integration-evidence/CP-003/` | 휴가 TUW 49/49·기능 축 7/7·테스트 파일 40/40; domain 120/120·API 42/42·Web 11/11; authz 159·public renderer PII PASS; exact package 10/10·role check 7/7·11 screenshots·5 viewport·재시작 hash 동일·renderer parity PASS; Mac formal/Windows native 경계 유지 |
| 2026-07-15 | CP-004 | DONE | `f3b38cbb` | `f3b38cbb` | `workbook/forest-v0.1.17-integration-evidence/CP-004/` | 급여 TUW 61/61·기능 축 8/8·테스트 파일 23/23; domain 65/65·API 8/8·Web 3/3; authz 159·public renderer PII PASS; internal package 9/9·5 screenshots·재시작 snapshot 동일·renderer parity PASS; browser receipt는 source SHA 부재로 보조 증거만 인정; GATE-002 BLOCKED 유지 |
| 2026-07-15 | CP-005 | DONE | `55e6cfe1` | `55e6cfe1` | `workbook/forest-v0.1.17-integration-evidence/CP-005/` | `jwsuh@amic.kr -> user_amic_jwsuh -> emp_amic_jwsuh -> 서지원`; identity 19/19·source 5/5·photo 3/3·관련 회귀 43/43·package 11/11·Matter fixture 5/5; 연락처·경력·학력·자격·사진 확인, `세션 사용자` 0, public renderer PII PASS; July 7 미보존 screenshot validator는 CP-006/QA-009 부채로 기록 |
| 2026-07-15 | CP-006 | DONE | `a656495f` | `a656495f` | `workbook/forest-v0.1.17-integration-evidence/CP-006/` | 소스 20/20·package 19/19·legacy 4/4·Lazyweb 보조증거 3/3·Web 142/142(+1 skip)·Desktop 21/21; 44px·단일행·중복/설명문 제거·현재 Forest/auth/asset 경계 PASS; obsolete profile screenshot 복원 없이 current package proof로 validator 정상화; 루트 지문 동일 |
| 2026-07-16 | CP-007 | DONE | `d1e84bff` | `0e72dd13` | `workbook/forest-v0.1.17-integration-evidence/CP-007/` | 동일 clean SHA 순차 Mac/Windows build; renderer `ae037ad4`·runtime `e915c26e` 동일; runtime 1071 files·reachable 378 modules·external/unresolved 0; actual Mac loopback API·trusted IPC·서지원 canonical tenant PASS; Windows native/formal 비주장 유지; 루트 지문 동일 |
| 2026-07-16 | PV-001 | DONE | `0854caef` | `6a57157a` | `workbook/forest-v0.1.17-integration-evidence/PV-001/` | 0.1.17 owner·Info.plist·package·update metadata 정렬; source/Mac/Windows package JSON 동일; Mac/Windows renderer `f0a043de` 동일; 실제 Mac Forest 로그인 PASS; 내부 패키지 경계 유지 |
| 2026-07-16 | PV-002 | DONE | `1e3c2614` | `a38a63f8` | `workbook/forest-v0.1.17-integration-evidence/PV-002/` | build manifest schema·tamper rejection; 동일 clean SHA 순차 Mac/Windows build; full SHA/tree·version·channel·time·renderer 기록; 내부/외부·receipt parity·installer linkage PASS; renderer `f0a043de` 동일; formal/native 경계 유지 |
| 2026-07-16 | PV-003 | DONE | `039ddf41` | `72d12902` | `workbook/forest-v0.1.17-integration-evidence/PV-003/` | formal entrypoint 4/4 공통 fail-closed gate; dirty 4/4·비허용 branch 4/4·SHA mismatch 차단, artifact mutation 0; detached exact-SHA Windows 실제 build PASS; Mac distribution gate 분리; bypass 0 |
| 2026-07-16 | PV-003-QA | DONE | `298bbb2b` | `298bbb2b` | `workbook/forest-v0.1.17-integration-evidence/PV-003/same-sha-renderer-parity.json` | 동일 clean detached SHA 순차 Mac/Windows internal 재빌드; Web·Mac·Windows renderer `f0a043de`·28 files 동일, byte diff 0; PV-001/PV-002·public renderer PII PASS; formal/native 비주장 유지 |
| 2026-07-16 | PV-004 | DONE | `34d689f0` | `f5344fde` | `workbook/forest-v0.1.17-integration-evidence/PV-004/` | 단일 registry로 dev/internal/candidate/formal app ID·artifact prefix 분리, 충돌 0; exact clean detached SHA Mac/Windows 8 manifest·renderer `f0a043de`·28 files 동일; invalid channel artifact mutation 0; formal Mac distribution·Windows native/AuthentiCode 비주장 유지 |
| 2026-07-16 | PV-005 | DONE | `ea9fd4f8` | `c0c46fae` | `workbook/forest-v0.1.17-integration-evidence/PV-005/` | `releases/0.1.17/<full-sha>/internal` 9 artifacts·hash 고정; exact clean SHA 순차 Mac/Windows renderer `f0a043de`·28 files 동일; generic mac/win 격리 중 validate→assemble→validate PASS, release truth 참조 0; formal/native/AuthentiCode 비주장 유지 |
| 2026-07-16 | PV-006 | DONE | `a2d50e95` | `8e9165c0` | `workbook/forest-v0.1.17-integration-evidence/PV-006/` | source 191·retired path 21, Mac/Windows bundle 35+35; 금지 참조·legacy hash·offline entry 0; exact clean SHA renderer `f0a043de`·28 files 동일; Web 143+1 skip·Desktop 102/102; formal/native/AuthentiCode 비주장 유지 |
| 2026-07-16 | PV-007 | DONE | `678aff03` | `ab7868eb` | `workbook/forest-v0.1.17-integration-evidence/PV-007/` | exact SHA Mac/Windows renderer `f0a043de`·28 files 동일; 다른 bundle exit 1·PID 보존, duplicate PID만 교체; manifest/index/path PASS, Forest package visual QA PASS; 최종 canonical PID `55090`; formal/native/AuthentiCode 비주장 유지 |
| 2026-07-16 | MI-002 | DONE | `e0f52f5f` | `e0f52f5f` | `workbook/forest-v0.1.17-integration-evidence/MI-002/` | fetched `origin/main=fdd1e34a`; merge-base 동일; merge-tree exit 0·candidate tree `667e141f` 동일; 2,405 path·265 commit 전수 inventory, conflict·unresolved·blanket resolution 0; diff-check 공백 경고는 QA 부채로 분리; ref 이동 0 |
| 2026-07-16 | MI-003 | DONE | `903835f7` | `903835f7` | `workbook/forest-v0.1.17-integration-evidence/MI-003/` | 기존 PR #168은 non-main base·stale head라 미사용; 새 `codex/integration/forest-v0.1.17` -> `main` merge-commit PR 선택; strict main·HRX check 준수; squash/rebase/force/cutover 0, ref·PR·main mutation 0 |
| 2026-07-16 | MI-004 | DONE | `4d59c9b7` | `4d59c9b7` | `workbook/forest-v0.1.17-integration-evidence/MI-004/` | 전용 `/private/tmp/lawos-forest-v017-integration`·`codex/integration/forest-v0.1.17` 생성; exact SHA·clean·upstream 없음; active writer 1, parallel writer 0; 후보·사용자 루트·PID 55090 무변경 |
| 2026-07-16 | MI-005 | DONE | `77c500e2` | `77c500e2` | `workbook/forest-v0.1.17-integration-evidence/MI-005/` | refreshed `origin/main=fdd1e34a`; merge-base 동일·merge-tree exit 0·current tree `1a4aa9f9` 동일; conflict·resolution·unresolved·blanket ours/theirs 0, 제품·외부 mutation 0 |
| 2026-07-16 | MI-006 | DONE | `cc2db0b2` | `cc2db0b2` | `workbook/forest-v0.1.17-integration-evidence/MI-006/` | refreshed `origin/main=fdd1e34a`; critical path 155개 중 Git object 동일 121·변경 검토 34·삭제/누락 0; authz/API/Desktop/backup/release 268/268, source/PII/security/typecheck/DR drill PASS; public header smoke는 signed-session 경계로 안전하게 대체, live AWS는 MI-001 READY 유지; 사용자 루트·PID 55090 무변경 |
| 2026-07-16 | MI-007 | DONE | `4c81d861` | `4c81d861` | `workbook/forest-v0.1.17-integration-evidence/MI-007/` | `INTEGRATION_SHA=4c81d861693472af48a680e5757b352bb9945b9b`, tree `628b370a`; 로컬 annotated QA anchor `forest-v0.1.17-integration-candidate-4c81d861`; 제품 트리 `ab7868eb`와 digest 동일·제품 diff 0·Git fsck PASS; 원격 tag·upstream·PR·main mutation 0, 사용자 루트·PID 55090 무변경 |
| 2026-07-16 | QA-001 | DONE | `443e833c` | `443e833c` | `workbook/forest-v0.1.17-integration-evidence/QA-001/` | MI-007 tag `4c81d861` 결속; HRX domain 111 files·571/571, authz/runtime-auth 15 files·159/159, 공식 API 88 files·389/389, 중첩 API 14 files·42/42; 총 228 files·1,161 PASS·fail/skip 0; validator 8/8, route policy 159·leave 49/49·payroll 61/61·port 미구현 0; 제품 diff 0·사용자 루트·PID 55090 무변경 |
| 2026-07-16 | QA-002 | DONE | `11fe96ab` | `11fe96ab` | `workbook/forest-v0.1.17-integration-evidence/QA-002/` | MI-007 tag `4c81d861` 결속; Web UI 직렬 143 PASS·1 QA-004 browser-gated skip·오류 노이즈 0, typecheck·1719-module build PASS; Desktop smoke 102/102, file bridge 17/17+validator 2, session 37/37, update 3/3; production renderer 28 files; 기존 1.13MB chunk warning 비차단; 제품 diff 0·사용자 루트·PID 55090 무변경 |
| 2026-07-16 | QA-003 | DONE | `d1fa5bbe` | `d1fa5bbe` | `workbook/forest-v0.1.17-integration-evidence/QA-003/` | migration 7 files·19/19, privacy/security 11 files·40/40, 적용 validator 10/10; fresh 001~029·upgrade 010/020/025·reopen/rollback/restore PASS, QA 증거 포함 repository-visible 19,128 files secret finding 0·critical 0; 운영자 production secret `.env`는 미생성·BLOCKED_PREREQUISITE, 제품 diff 0·사용자 루트 content 77/77·PID 55090 보존 |
| 2026-07-16 | QA-004 | DONE | `35cd17f8` | `e19a17dd` | `workbook/forest-v0.1.17-integration-evidence/QA-004/` | signed session 6역할×5 viewport 30/30·unexpected error/overflow/dead action 0; internal package 9/9·LV02~LV07 PASS; 동일 clean SHA Web/Mac/Windows renderer `efc12338`·28 files·byte diff 0; receipt 8개·screenshot 39개·증거 61개 hash PASS; formal Mac·Windows native는 QA-005/006 경계 유지, 사용자 루트 content 77/77·PID 55090 보존 |
| 2026-07-16 | QA-005 | DONE | `39ed9571` | `39ed9571` | `workbook/forest-v0.1.17-integration-evidence/QA-005/` | exact clean SHA formal macOS app·ZIP·DMG 재생성; Developer ID/codesign strict/notary/staple/Gatekeeper/DMG image PASS; signed formal app login·서지원 profile·leave·payroll·restart PASS, page/console error 0, screenshot 5/5; renderer `efc12338`·28 files; ZIP `2e2af3ef`·DMG `66d00e14`; formal bundle local API 미포함·isolated exact-source synthetic loopback 사용; public release·production/AWS write 비주장, PID 55090·27104~27106 보존 |
| 2026-07-16 | QA-006 | BLOCKED | `39ed9571` | `39ed9571` | `workbook/forest-v0.1.17-integration-evidence/QA-006/` | Windows native CI run `29466863451`: NSIS install·Forest login·서지원·leave·payroll·restart restore·uninstall PASS, page/console error 0, screenshot 4/4; CI installer `53e2b694`·exe `9772e31f`; installer와 executable 모두 `NotSigned`, 승인된 Authenticode provider/cert 부재로 main-merge/release gate BLOCKED |
| 2026-07-16 | QA-007 | DONE | `39ed9571` | `39ed9571` | `workbook/forest-v0.1.17-integration-evidence/QA-007/` | QA-004 candidate·formal Mac local·formal Windows local·Windows native CI renderer 모두 `efc12338`·28 files; candidate/final `apps/web` tree `9d16072e` 동일; recursive mismatch·승인 변형·unexpected mismatch 0 |
| 2026-07-16 | QA-008 | DONE | `39ed9571` | `39ed9571` | `workbook/forest-v0.1.17-integration-evidence/QA-008/` | QA-004 39·final Mac 5·final Windows 4 = screenshot 48개 hash manifest; final 9개 수동검수, broken image·overflow·legacy regression·stale window 0 |
| 2026-07-16 | QA-009 | DONE | `39ed9571` | `39ed9571` | `workbook/forest-v0.1.17-integration-evidence/QA-009/` | QA-001~008 counts·commands·artifact hashes·limits·blocker 통합; evidence link 18/18·missing 0; 최종 report `BLOCKED_AUTHENTICODE`, PR·main merge·public release·production/AWS write·go-live 0; 사용자 루트 content 77/77·PID 55090·27104~27106 보존 |

## 14. Goal Objective 원문

`workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md`를 단일 실행 정본으로 삼아, 종료 Forest 세션의 115개 tracked 수정과 92개 untracked 파일을 비밀정보·PII·generated artifact 없이 재현 가능한 checkpoint로 고정하고, 현재 루트 체크아웃의 25개 고유 변경과 49개 상이 공통 파일을 기능 단위로 전수 판정하며, 충돌하는 migration 011~016을 중복·데이터 손실 없이 Forest 011~025 및 필요한 026+ 계보로 정규화한다. 기존 정상 릴리스·Forest checkpoint·현재 루트·최신 origin/main을 Home, Client, Matter, People, Search, Portal, 인증, 서지원 프로필, 휴가, 급여, 저장·권한·패키지 기준으로 비교해 핵심 기능 손실 0인 상위 호환 Forest 후보만 0.1.17로 만들고 version/full SHA/renderer hash/channel/time manifest, clean-SHA build gate, 채널별 bundle ID, legacy asset 검사, canonical launcher를 구현한다. origin/main merge dry-run과 파일별 conflict ledger를 거쳐 전용 integration 브랜치에서 UI는 현재 Forest, 인증은 더 엄격한 권한, migration은 forward-only, 운영은 더 안전한 계약을 보존하여 통합하고, 휴가·급여·API·Web·Desktop·migration·authz·PII 전체 0 fail, 6개 역할×5 viewport 브라우저 error/overflow/dead-action 0, macOS signed/notarized/Gatekeeper 실제 패키지와 Windows native/AuthentiCode 실제 패키지 PASS를 증명한다. 검증된 integration SHA만 PR로 main에 병합하고 후보 패키지를 재사용하지 말고 exact main merge SHA에서 Mac·Windows artifacts, hashes, SBOM, tag와 release receipts를 재생성한다. 내부 배포와 AWS staging까지 repo-safe·승인 범위에서 수행하되 실제 직원·계좌·정책 migration, 외부 provider/bank/tax production write, AWS production traffic, 공개 release와 go-live는 owner·법무·노무·세무 승인 및 검증 가능한 receipt가 없으면 BLOCKED로 유지한다. 모든 TUW는 지정 evidence 디렉터리에 entry/exit SHA, files, commands, tests, manual QA, hashes, limits, blockers를 기록하고, stale/old app이 다시 정본으로 오인되지 않도록 canonical registry·launch runbook·old bundle inventory·rollback closeout까지 완료한다.`
