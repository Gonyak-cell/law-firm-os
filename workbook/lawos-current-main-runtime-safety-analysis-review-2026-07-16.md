# Law Firm OS 최신 main 기준 런타임 안전성 분석 검토

- 검토일: 2026-07-16 KST
- 검토 대상: 사용자 첨부 분석
- 기준 저장소: `/Users/jws/Documents/Codex/Law Firm OS`
- 검증 worktree: `/private/tmp/lawos-runtime-safety-validation-20260716`
- 기준 브랜치: `codex/runtime-safety-validation-20260716`
- 기준 SHA: `b46a686f719875c6980ecba9bc213a605f58fa45`
- 기준 tree: `22bdf816aed22bead94dcc441312bf038353c54f`
- 범위: 현재 `origin/main`의 소스, 병합된 QA 증거, 현재 로컬 저장소 메타데이터
제외: release/tag/AWS write, 기존 사용자 루트 작업트리 수정, 과거 worktree를 최신 정본으로 취급하는 판단

## 결론

최신 `main` 기준 최종 판정은 **`부분 타당`**이다.

첨부의 핵심 구조 진단, 즉 Law Firm OS의 13개 주요 도메인 저장소가 아직 JSON 파일에 의존하고 있으므로 JSON을 장기 운영 원장에서 fixture·이관·export·백업 포맷으로 축소해야 한다는 방향은 현재도 타당하다. 두 독립 저장소 인스턴스의 stale write로 Matter와 HRX 레코드가 실제 유실되는 현상도 최신 `main`에서 재현됐다. `Origin: null` CORS, 앱 자체 single-instance lock 부재, 여러 저장소의 직접 쓰기, 메모리 기반 보안·Home 상태, DMS 보상 부재, 제한된 generation backup도 남아 있다.

그러나 첨부가 조사한 `matter.app 0.1.16` 내부 QA 번들의 상태를 현재 0.1.17 전체 상태로 일반화한 부분은 최신 기준으로 부정확하다. 현재 0.1.17은 packaged renderer를 정확한 파일 경로로 제한하고, IPC sender를 검증하며, formal 패키지에서 로컬 API runtime·private roster·사진·합성 계정 seed를 제거한다. 병합 전 exact-source formal macOS 패키지는 Developer ID 서명·공증·staple·Gatekeeper를 통과했다. 따라서 “모든 `file://` 허용”, “IPC sender 미검증”, “현재 formal 번들에 실데이터·합성 토큰 동봉”, “현재 macOS formal 패키지 서명 부재”는 최신 `main`의 사실이 아니다.

이 분석은 저장소 구조 개선의 출발점으로는 합리적이지만, 현재 release/go-live 판정문이나 확정 일정으로 그대로 사용하면 안 된다. 현재 판정은 `SOURCE_MERGED`, `RELEASE_NOT_APPROVED`, `WINDOWS_AUTHENTICODE_BLOCKED`, `EXACT_MAIN_RELEASE_PACKAGE_NOT_BUILT`를 분리해야 한다.

## 현재 기준 고정

- `origin/main`: `b46a686f719875c6980ecba9bc213a605f58fa45`
- 요청 기준 SHA `b46a686f...`의 현재 `origin/main` ancestor 여부: `yes`이며 현재 SHA와 동일
- merge commit: `Merge Forest v0.1.17 source into main (#169)`
- merge second parent와 현재 `main` tree: 동일한 `22bdf816...`
- QA-009 product source `39ed9571...` 이후 현재 `main`까지 제품 runtime 경로의 변경은 없고, 차이는 QA 증거·검증 스크립트·문서다.
- 현재 앱 버전과 lockfile Electron: `0.1.17`, `42.4.1`
- 현재 로컬 Matter 앱 프로세스: 검증 시점 `0`; 첨부의 PID·실행 프로세스 수는 현재 사실이 아니다.

## 주장별 최신 main 판정

| 첨부 주장 | 최신 판정 | 현재 근거와 조정 |
|---|---|---|
| JSON이 HRX뿐 아니라 Law Firm OS 전체의 실질 운영 저장소다 | `타당` | `STORE_PATH_MANIFEST`는 HRX·Master Data·Matter·DMS·CRM·Intake·Finance·Analytics·AI·Portal·UI/Enterprise readiness 등 13개 JSON 도메인 저장소를 operational profile의 필수 절대경로로 요구한다. auth credential/reset과 NDJSON audit도 파일 기반이다. |
| 현재 데이터가 이미 손상됐다는 증거는 없다 | `현재도 타당` | 로컬 runtime store JSON 13개를 다시 파싱해 `13/13 valid`, DMS `.bin` object `0`을 확인했다. 이는 의미적 정합성이나 과거 무손실을 증명하지는 않는다. |
| 현재 배포 번들에 실데이터·합성 토큰·최고권한 계정이 동봉된다 | `과도한 일반화` | `formalRelease=false`인 internal QA 패키지는 local API runtime과 private roster/photo/registration seed를 포함한다. 반면 formal 경로는 runtime 디렉터리를 삭제하고 local API를 기본 비활성화한다. 현재 formal 패키지 전체에 대한 주장이 아니다. |
| local-dev, synthetic login, real-data seed와 기본 step-up 비밀의 결합이 위험하다 | `부분 타당` | internal local API는 `local-dev`·synthetic login을 사용한다. operational profile은 synthetic login을 끄고 credential store를 요구한다. 다만 `createHrxStepUpAuthority()`의 기본 HMAC/TOTP 비밀 fallback은 operational 경로에서도 별도 fail-closed 검사가 없어 현재도 남아 있다. |
| 모든 `file://` URL과 새 창을 허용하고 IPC sender를 검증하지 않는다 | `최신 기준 부정확` | 0.1.17은 packaged renderer의 정확한 pathname만 허용하고 임의 `file://`를 차단한다. session IPC도 `senderFrame.url`을 검증한다. 관련 테스트 `7/7 PASS`. |
| Electron renderer 신뢰 경계가 완전히 해결됐다 | `아님` | renderer는 여전히 `file://`를 사용하며 custom protocol로 전환되지 않았다. `apps/web/index.html`과 main process에 restrictive CSP가 없다. 승인된 동일 renderer URL의 새 창은 허용된다. |
| 루프백 API가 `Origin: null`과 인증 헤더를 허용한다 | `타당` | `DEFAULT_CORS_ALLOWED_ORIGINS`에 `null`이 있고 실제 API 테스트에서 preflight와 health 응답이 `access-control-allow-origin: null`을 반환했다. 해당 CORS 계약 테스트를 포함한 API 테스트 `19/19 PASS`. |
| 앱에 single-instance lock이 없다 | `타당` | 현재 desktop main에는 `app.requestSingleInstanceLock()`이 없다. 외부 canonical launcher의 중복 프로세스 제어는 앱 자체 lock을 대체하지 않는다. |
| 두 프로세스/인스턴스에서 stale writer가 데이터를 잃게 할 수 있다 | `타당·재현` | 같은 파일을 연 Matter repository 두 인스턴스에서 A/B를 순차 저장하자 최종 파일에는 B만 남았다. HRX 두 인스턴스에서도 seed+A+B 중 A가 사라졌다. HRX의 in-process revision은 같은 store 객체의 async transaction만 보호하며 disk generation CAS가 아니다. |
| 여러 저장소가 비원자적으로 직접 JSON 파일에 쓴다 | `타당` | Finance·Analytics·AI governance·Client Portal·DMS metadata·UI readiness·Enterprise readiness와 auth store가 `writeFileSync(filePath, ...)`를 사용한다. HRX는 temp+rename이지만 file/directory fsync와 disk generation 비교가 없다. Matter·CRM·Intake·Master Data만 현재 공통 durable writer를 사용한다. |
| 로컬 기밀성 위험이 있다 | `타당, 수치 갱신 필요` | FileVault는 현재도 `Off`. runtime store는 13개 `0644` JSON이지만 `~/Library`의 `0700` 조상으로 다른 로컬 계정 접근이 차단된다. `/Users/jws/lawos-backups/data`는 현재 JSON 1,390개·약 266MB, 파일 전부 `0644`, 디렉터리 `0755`; 사용자 홈의 `0750` group traverse와 결합된 local multi-account 노출 우려가 남는다. |
| 배포 무결성이 전혀 없다 | `0.1.16 한정, 최신 기준 부정확` | QA-009의 0.1.17 formal macOS는 Developer ID, strict codesign, notarization, staple, Gatekeeper를 통과했다. 다만 Windows installer/executable은 `NotSigned`이고, owner 승인 전 exact-main release build/tag/deploy는 수행되지 않았다. |
| 로그인 잠금·계정상태·break-glass가 메모리이고 logout이 서버 revoke를 하지 않는다 | `대체로 타당` | 세 상태는 여전히 `Map`이다. 토큰에 JTI가 있지만 revocation store 확인은 없다. desktop logout은 로컬 캐시를 지운다. password reset·admin security audit는 파일 기록으로 개선됐지만 login 성공/실패 자체는 security audit에 append되지 않는다. |
| Home 결정·감사·사용 이벤트가 메모리다 | `타당` | default Home runtime의 `decisions`, `auditEvents`, `usageEvents`는 Map/배열이며 재시작 영속 저장소가 없다. |
| DMS object와 metadata 사이 보상·reconciliation이 없다 | `타당` | object bytes 저장이 repository transaction보다 먼저 발생하며 transaction 실패 시 object delete 보상이 없다. file adapter도 bytes 후 metadata를 별도 직접 쓴다. S3·SharePoint adapter는 fail-closed placeholder다. |
| 13개 store 중 generation backup은 4개뿐이고 off-device queue가 없다 | `타당` | 공통 durable writer 사용처는 Matter·CRM·Intake·Master Data 4개다. 현재 local backup upload queue 디렉터리와 LawOS/Matter backup launch agent는 확인되지 않았다. 외부 백업 자체가 없다는 단정은 하지 않는다. |
| Electron 42.4.1은 최신 지원 patch가 아니다 | `핵심 타당, 버전 수치 갱신 필요` | 2026-07-16 공식 stable 목록 기준 42계열 최신은 `42.7.0`, 최신 stable major는 `43.1.1`이다. 첨부의 `42.6.1`·`43.1.0`은 하루 사이 뒤처졌다. Electron은 각 지원 major의 최신 minor만 지원한다. |

Electron의 공식 보안 체크리스트는 CSP, 탐색/새 창 제한, 최신 Electron, IPC sender 검증, `file://` 대신 custom protocol을 권고한다. 현재 main은 탐색 제한과 sender 검증은 반영했지만 CSP·custom protocol·최신 patch는 아직 충족하지 않는다.

- [Electron stable releases](https://releases.electronjs.org/release?channel=stable)
- [Electron version support policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines)
- [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)

## 재현 결과

### 신뢰 경계와 formal 패키지 경계

```text
node --test apps/desktop/test/origin-policy.test.mjs \
  apps/desktop/test/session-ipc.test.mjs \
  apps/desktop/test/runtime-package.test.mjs

7 pass / 0 fail
```

확인된 동작:

- 임의 `file:///tmp/index.html` 차단
- unapproved navigation/window 차단
- untrusted session IPC sender 차단
- formal package staging에서 runtime/private data 제거

### CORS 실동작

```text
node --test apps/api/test/master-data-api.test.js

19 pass / 0 fail
```

이 PASS는 `Origin: null` 허용이 안전하다는 뜻이 아니라, 현재 코드가 그 허용 계약대로 동작함을 재현한 것이다.

### 내구성 기준과 residual stale writer

```text
node --test packages/persistence/test/durable-file.test.js \
  packages/hrx/test/repository-sql.test.js

7 pass / 0 fail
```

기존 테스트는 Matter durable fsync/backup과 단일 HRX store 객체 안의 async transaction 충돌 차단을 확인한다. 별도 isolated driver로 같은 파일을 연 두 독립 인스턴스를 검증한 결과는 다음과 같다.

```json
{
  "matter": { "expected": ["matter_a", "matter_b"], "actual": ["matter_b"], "lost": true },
  "hrx": { "expected": ["emp_seed", "emp_a", "emp_b"], "actual": ["emp_seed", "emp_b"], "lost": true }
}
```

따라서 atomic rename이나 in-memory revision만으로 multi-process lost update가 해결됐다고 볼 수 없다.

### 저장소 preflight와 Desktop 보안 validator

```text
node scripts/validate-store-path-preflight.mjs
outcome: passed, scenarios: 5, production_ready_claim: false

node scripts/validate-matter-desktop-security.mjs
verdict: PASS, checked_files: 50
```

`validate-matter-desktop-security`의 PASS 범위는 BrowserWindow flags, preload allowlist, navigation allowlist다. CSP, custom protocol, single-instance lock, CORS, disk CAS는 이 validator의 검사 범위가 아니므로 전체 보안 PASS로 확대하지 않는다.

store-path preflight는 병렬 실행 시 다른 테스트가 생성한 `/tmp/lawos-*-runtime-*` 디렉터리를 누수로 오인해 1회 실패했고, 다른 테스트 종료 후 단독 재실행에서 PASS했다. 제품 실패가 아니라 검증기 간 전역 `/tmp` 관찰 간섭이다.

## 목표 구조와 일정 판단

현재 API 계약과 repository 경계를 유지한 채 PostgreSQL·versioned object storage·append-only audit/outbox로 권위 원장을 이동하고 JSON을 보조 포맷으로 낮추는 방향은 합리적이다. 현재 코드가 이미 repository adapter 경계를 갖고 있어 모듈형 모놀리스를 유지하는 선택도 타당하다. 현시점에 도메인별 마이크로서비스 분리를 먼저 할 근거는 없다.

다만 다음은 첨부 분석만으로 확정할 수 없다.

- PostgreSQL이 모든 운영 데이터의 유일한 최종 구조라는 결정: tenant 규모, offline 요구, 법적 보존, AWS 운영 모델과 장애 격리 요구를 별도 ADR로 확정해야 한다.
- desktop encrypted SQLite cache/outbox: 충돌 정책·키 관리·분실 장치·재전송 idempotency 요구가 아직 설계·검증되지 않았다.
- 2명 기준 4~6주 일정: IdP/MFA, 13개 도메인 이관, DMS object lifecycle, DR rehearsal, Windows signing까지 포함하면 근거 없는 낙관치다. 작업분해·의존성·승인 lead time 없는 상태에서는 확정 일정으로 사용하지 않는다.
- RTO 30분/RPO 0·5분: 현재 성능 측정 결과가 아니라 목표 SLO다.

## 최신 main의 합리적인 우선순위

첨부의 0~4단계 순서는 대체로 합리적이지만 현재 상태를 반영해 조정해야 한다.

1. internal QA 패키지와 formal 패키지의 데이터·runtime 경계를 계속 강제한다.
2. 남은 Desktop/API 신뢰 경계인 CSP, custom protocol, `Origin: null`, app single-instance lock, operational step-up secret fail-closed를 닫는다.
3. 공통 durable writer 확대와 disk generation CAS/writer lock으로 과도기 JSON 손실을 막는다.
4. auth/Home/DMS의 메모리·비보상 상태를 운영 원장으로 이동한다.
5. repository adapter 뒤에서 중앙 원장 전환과 shadow comparison/cutover rehearsal을 수행한다.
6. 별도 owner 승인과 Authenticode 증거 후 exact-main 패키지·release·deploy를 진행한다.

## 병합·릴리스 판정

- 이 검토 커밋의 성격: documentation-only, current-main evidence review
- 제품 runtime 변경: 없음
- `main` 병합 가능 여부: 검증 보고서 자체는 관련 검사 PASS와 clean diff를 전제로 병합 가능
- 소스 병합 상태: Forest v0.1.17은 이미 PR #169로 `main` 병합 완료
- release/tag/AWS deployment: 실행하지 않음, 승인되지 않음
- Windows distribution: `BLOCKED_AUTHENTICODE`
- exact-main formal package: 별도 release 승인 전 `BLOCKED`
- production/go-live: 별도 승인·staging·migration·provider·운영 증거 전 `BLOCKED`

## 최종 판정문

첨부 분석은 **JSON 기반 운영 원장의 구조적 위험을 Law Firm OS 전체 문제로 본 핵심 진단과 중앙 원장 전환 방향은 타당**하다. 그러나 **0.1.16 internal QA 번들의 보안·서명 상태를 현재 0.1.17 formal/main 상태로 일반화했고, 0.1.17에서 이미 해소된 origin/IPC/formal-package 경계를 반영하지 않았으며, 일정·목표 SLO를 검증된 사실처럼 제시한 점은 부정확**하다.

따라서 최신 기준 채택 문구는 다음이어야 한다.

> `부분 타당`: JSON 운영 원장·동시 쓰기·비원자 저장·인증/Home/DMS 영속성 위험은 최신 main에서도 확인된다. 다만 0.1.17의 renderer 경로 제한, IPC sender 검증, formal runtime/PII 제외, macOS 서명·공증을 반영해야 하며, 현재 source merge와 release/deployment는 별도 상태다.
