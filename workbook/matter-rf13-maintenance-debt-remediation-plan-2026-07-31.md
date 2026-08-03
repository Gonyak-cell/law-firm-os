# Matter RF13 배포 가능성·유지보수 부채 개선 계획

- 작성일: 2026-07-31
- 작업 브랜치: `codex/matter-small-firm-os-implementation-20260730`
- 기준 HEAD: `34d16954f54a188f93b087e3bc4ad1bce99c049f`
- 계획 상태: `PAUSED_BY_SCOPE_DECISION` (2026-08-03, 10인 내부 파일럿 안정화 이후 재개 여부 결정)
- 대상 조직: 약 10명 규모 로펌
- 신규 추적 키: `RF13-DIST` / `RFD-TUW-*`

기존 Goal의 `RF13 COMPLETE`는 dirty-tree fingerprint에 묶인 **내부 unsigned QA 완료**라는 역사적 판정으로 유지한다. 이 문서는 그 판정을 되돌리거나 덮어쓰지 않고, 외부 전달 가능한 thin-client 설치물을 위한 별도 `RF13-DIST`를 정의한다. 기존 RF13 영수증은 아래 어느 배포 게이트도 대신할 수 없다.

## 1. 정량 Goal

다음 조건을 모두 만족하면 이 계획을 완료한다.

1. 외부 전달 가능한 macOS·Windows `formal` 설치물에 HRX 명단, 연락처, 사진, 로컬 API runtime, synthetic login material이 0건이다.
2. formal 설치물은 clean exact Git SHA와 결속되고 macOS 서명·공증·Gatekeeper, Windows 서명 또는 명시적으로 승인된 보류 게이트를 통과한다.
3. 설치 앱은 loopback이 아니라 승인된 운영/스테이징 API에 로그인하고, tenant별 10명 명단·프로필·사진을 인증 후 읽는다.
4. 앱 완전 종료·재실행 후 세션과 Matter 상태가 복구되고, 실패 시 이전 설치물로 되돌리는 절차가 재현된다.
5. Payment, Matter API, Finance의 대형 모듈을 행동 변경 없이 작은 경계로 분리하며 기존 domain/API/web/root 회귀가 모두 통과한다.
6. 결제 취소 브라우저 검증이 복제된 테스트 orchestrator가 아니라 실제 production container 경계를 실행한다.
7. 웹 번들 최적화는 측정된 packaged cold-start 개선이 있을 때만 채택한다.
8. 프로필 사진 변경은 설치물 재배포 없이 서버 측 관리 경로로 수행할 수 있고, 사진이 없어도 initials fallback으로 업무가 가능하다.

## 2. 범위와 운영 원칙

### 포함

- RF13의 internal QA와 formal 배포 artifact 분리
- package 개인정보 byte scan, exact-SHA provenance, signing/notarization, 실제 로그인·재시작·rollback
- Payment migration 분리, 실제 결제 reversal orchestration 검증
- Matter read model, Finance boundary, H1/H2 test fixture의 점진적 분리
- 측정 기반 web code splitting
- 10인 로펌용 서버 측 프로필 사진 관리 경로

### 제외

- 사용자 승인 없는 commit, push, PR, merge, production deploy
- 리팩터링과 동시에 비즈니스 규칙·권한 규칙을 변경하는 작업
- RF13 완료 전 대형 파일 전체 재작성
- 단순히 경고를 없애기 위한 chunk limit 상향이나 임의 `manualChunks`
- private HRX 자료를 public renderer 또는 설치물에 포함하는 방식

### 고정 원칙

- `internal`은 로컬 QA 전용이고 외부 전달 금지다.
- `formal`은 thin client이며 로컬 API runtime을 포함하지 않는다.
- 명단은 tenant-scoped PostgreSQL, 사진은 인증 API가 권위다. 따라서 명단·사진을 설치물에 넣지 않아도 로그인 뒤 API에서 내려받아 앱을 정상 운영할 수 있다.
- internal QA가 데이터가 필요하면 real roster가 아니라 synthetic fixture를 쓴다.
- formal artifact는 clean exact SHA에서만 만든다.
- 서명·공증·배포·rollback은 서로 다른 게이트로 기록한다.
- 1차 외부 배포 기준 플랫폼은 macOS다. Windows는 native build·privacy·설치/삭제 QA까지 필수지만 Authenticode가 없으면 외부 배포 상태는 `BLOCKED_BY_AUTHORITY`로 남긴다.
- 현재 `matter-desktop:formal-release`는 비밀번호 reset/confirm을 수행하는 `matter-desktop:aws-runtime:smoke`를 포함한다. 보호된 QA 계정, 복구 절차, 실행 승인이 결속되기 전에는 aggregate 명령을 실행하지 않고 비변경 preflight/build/검증을 분리 실행한다.
- package QA의 격리 loopback API와 배포된 staging/production API는 서로 다른 증거다. 전자는 thin-client·동일 소스 실행을, 후자는 실제 운영 topology를 증명한다.
- 리팩터링 전에 public import/export, HTTP status/body, audit, idempotency, 정렬을 characterization test로 고정한다.
- rollback은 immutable app/API artifact를 되돌릴 뿐이며 DB migration이나 업무 데이터를 역방향으로 쓰지 않는다. schema 비호환은 rollback 실행 전 차단하고 forward repair로 처리한다.

크기 표기는 `S ≤ 0.5일`, `M = 1~2일`, `L = 2~4일`의 1인 집중 작업 기준이며, 리뷰·CI·서명/배포 승인 대기시간은 제외한다.

## 3. 우선순위

점수는 `(영향도 + 미해결 위험) × (6 - 노력)`이다. RF13은 점수와 무관한 release hard gate라 항상 먼저 실행한다.

| 순서 | 항목 | 영향 | 미해결 위험 | 노력 | 점수 | 결정 |
|---|---|---:|---:|---:|---:|---|
| P0 | RF13 privacy·clean SHA·formal package·실제 로그인 | 5 | 5 | 3 | 30 | 선행 hard gate |
| P1 | Payment migration/backfill 분리 | 4 | 4 | 2 | 32 | RF13 직후 첫 리팩터링 |
| P2 | 실제 payment reversal orchestration 검증 | 4 | 4 | 3 | 24 | 결제 UI 확대 전 |
| P3 | Matter read model 분리 | 4 | 4 | 3 | 24 | mutation/router보다 먼저 |
| P4 | Finance boundary 분리 | 4 | 4 | 4 | 16 | PreBill→은행→billing/read 순 |
| P5 | H1/H2/RF12 test support 분리 | 2 | 2 | 2 | 16 | owning refactor와 함께 |
| P6 | 서버 측 프로필 사진 관리 | 3 | 3 | 4 | 12 | formal 운영 후 관리성 개선 |
| P7 | 웹 chunk 최적화 | 1 | 1 | 3 | 4 | 측정 후 마지막 |

## 4. 실행 토폴로지

`R0 기준 봉인 → R1 RF13 artifact 경계 → R2 formal 실행 증거 → D1 Payment → D2 Matter → D3 Finance → D4 Test/성능 → O1 프로필 미디어 → G7 최종 회귀`

- R0~R2가 끝날 때까지 D1~D4 production 구조 리팩터링을 시작하지 않는다.
- D1~D3는 각 tranche마다 별도 diff와 독립 회귀 영수증을 가진다.
- O1은 formal 앱 운영의 필수조건이 아니다. 현재 서버 측 사진 제공과 initials fallback으로 운영한 뒤 관리자 편의를 개선한다.

## 5. Testable Units of Work

모든 TUW는 한 가지 실패 이유만 가지며, 자동 검증과 관찰 가능한 완료조건이 모두 충족돼야 `COMPLETE`다.

### R0 — 기준·권한·release contract

| ID | 구현 단위와 파일 소유권 | 선행·크기 | 자동 검증 | 관찰 가능한 완료조건 |
|---|---|---|---|---|
| RFD-TUW-001 | 현재 branch/HEAD/status, Goal SHA, source fingerprint, 기존 RF13 artifact hash를 새 baseline manifest로 기록한다. 소유: `.omo/evidence/rf13-debt-remediation-*` | 없음 · S | `git status --porcelain=v2 --untracked-files=all`; `readMatterPerformanceSourceState()` 두 번 일치 | 파일을 바꾸지 않은 두 번의 capture가 byte-equivalent이고 기존 internal artifact를 명시적으로 `QA_ONLY`로 분류 |
| RFD-TUW-002 | `dev/internal/candidate/formal`의 허용 데이터·API·배포 대상을 machine-readable policy로 고정한다. 소유: `scripts/lib/matter-desktop-provenance.mjs`, 관련 test | 001 · S | `node --test apps/desktop/test/runtime-package.test.mjs apps/desktop/test/shell-smoke.test.mjs` | internal은 외부 전달 불가, candidate/formal은 private runtime 0이라는 판정이 코드와 영수증에 동일 |
| RFD-TUW-003 | commit/merge, Apple signing/notary, Windows signing, staging/prod API, rollback owner를 권한 체크포인트로 분리한다. 소유: 새 runbook/decision checklist | 001 · S | checklist validator 또는 JSON schema test | credential 값 없이 `available/blocked/not-required`만 표시되고, 권한 없이는 외부 변경 명령이 실행되지 않음 |

### R1 — RF13 개인정보 없는 artifact 경계

| ID | 구현 단위와 파일 소유권 | 선행·크기 | 자동 검증 | 관찰 가능한 완료조건 |
|---|---|---|---|---|
| RFD-TUW-004 | internal local-API QA용 10인 synthetic roster·계정·사진 fixture를 만든다. 소유: `apps/desktop/test/fixtures/` 또는 전용 synthetic fixture module | 002 · M | 새 fixture contract test; real `@amic.*`, real employee/user ID, 원본 photo hash 탐지 0 | local login·Matter restart에 필요한 인원 수는 유지하되 실명·실제 연락처·원본 사진이 없음 |
| RFD-TUW-005 | runtime data mode를 `none/synthetic/private-local`로 명시하고 기본 internal QA는 synthetic, candidate/formal은 none으로 만든다. 소유: `scripts/lib/matter-desktop-runtime.mjs`, mac/win build scripts | 002,004 · M | `node --test apps/desktop/test/runtime-package.test.mjs`; 각 channel×mode matrix | private-local은 explicit opt-in과 `non_distributable=true`가 없으면 실패하고 formal은 mode override에도 runtime 0 |
| RFD-TUW-006 | 설치물 PII scanner를 구현한다. 경로명뿐 아니라 roster 보호값, known photo hash, registration seed, runtime entry를 검색한다. 소유: `scripts/validate-matter-desktop-private-data-boundary.mjs`와 tests | 004 · M | synthetic bad bundle은 red, formal fixture는 green인 positive/negative tests | roster/contact/photo/runtime/credential finding 0일 때만 exit 0; 탐지값 자체는 로그에 출력하지 않음 |
| RFD-TUW-007 | macOS·Windows build 후 scanner를 mandatory gate로 연결한다. 소유: `scripts/build-matter-desktop-{mac,win}.mjs`, release scripts | 005,006 · S | internal-private fixture build는 release stage 거부; formal fixture build 통과 | ZIP/DMG/Windows directory/installer 각각 동일한 privacy verdict와 artifact SHA 기록 |
| RFD-TUW-008 | public renderer PII validator와 artifact scanner의 corpus를 통합하고 untracked/generated renderer도 검사한다. 소유: `scripts/validate-public-renderer-no-hrx-roster-pii.mjs`, scanner lib | 006 · S | `npm run public-renderer:pii:validate`; untracked bad file negative case | web renderer와 desktop artifact 어디에도 보호 roster 값·photo hash가 없고 누락 디렉터리 0 |
| RFD-TUW-009 | clean exact-SHA formal build gate를 현재 변경에 맞게 characterise하고 유지한다. 소유: `scripts/validate-pv003-clean-sha-build-gate.mjs` 및 test | 007 · S | dirty/다른 SHA/비허용 branch는 red, clean exact release branch는 green | formal build가 dirty current branch에서 계속 차단되고, 승인된 clean SHA에서만 시작 |

### R2 — formal package·실제 운영 증거

| ID | 구현 단위와 파일 소유권 | 선행·크기 | 자동 검증 | 관찰 가능한 완료조건 |
|---|---|---|---|---|
| RFD-TUW-010 | RF13 변경을 검토 가능한 commit으로 봉인하고 release-authorized clean worktree와 충돌 없는 release ID/version을 준비한다. 소유: Git history/worktree; 사용자 승인 필요 | 009 · S | `git fetch`; `git diff --check`; `git status --porcelain` empty; HEAD/tree/expected SHA match; 기존 tag/artifact name collision test | commit, push, PR, merge 상태를 분리 기록하고 formal build 입력 SHA가 하나로 고정되며 기존 `0.1.17` tag/asset를 덮어쓰지 않음 |
| RFD-TUW-011 | aggregate formal release를 비변경 preflight/package와 승인 필요 remote smoke로 분리한 뒤 clean exact SHA에서 macOS·Windows package를 만든다. 소유: root `package.json`, build/release scripts | 003,010 · L | release-script contract test가 package 단계의 password reset/confirm 호출 0을 확인; `npm run matter-desktop:formal-build-gate:validate`; 분리된 platform package 명령 | 빌드만 실행할 때 외부 계정·API 변경 0; 두 플랫폼 manifest가 동일 source SHA·renderer digest·`source_dirty=false`; private/runtime finding 0 |
| RFD-TUW-012 | macOS Developer ID signing·notarization·stapling·Gatekeeper를 검증한다. 소유: mac build receipt; credential 사용 승인 필요 | 011 · M | `codesign --verify --deep --strict`; `spctl --assess`; `xcrun stapler validate`; `hdiutil verify` | app와 DMG가 모두 통과하고 signing identity는 값 노출 없이 fingerprint/Team ID로 기록 |
| RFD-TUW-013 | Windows native runner에서 installer 설치·삭제 QA와 Authenticode 상태 결정을 닫는다. 소유: Windows QA와 Authenticode validators/approval intake | 011 · M | native Windows package QA; `matter-desktop:windows-authenticode:*:validate`; installer signature verification | `native_qa=PASS`이면 TUW는 완료 가능하다. 배포 상태는 별도로 `PASS` 또는 `BLOCKED_BY_AUTHORITY`이며 unsigned를 외부배포 완료로 간주하지 않음 |
| RFD-TUW-014 | formal package가 bundled local API 없이 **격리된 비패키지 exact-source loopback API**를 사용하는 thin-client 계약을 검증하고 Matter 시나리오를 추가한다. 소유: `scripts/run-formal-{macos,windows}-package-qa.mjs` | macOS: 011,012; Windows: 011,013의 `native_qa=PASS` · L | `MATTER_DESKTOP_EXPECTED_SOURCE_SHA=<sha> node scripts/run-formal-macos-package-qa.mjs`; native Windows 대응 QA | runtime mode `production-auth-http`, bundled API 0, operator token 0, synthetic 10명·프로필/initials·Matter queue/task/time/billing·console error 0. Windows 서명 보류는 native QA를 막지 않으며, 이 영수증은 staging/production 배포 증거로 인용되지 않음 |
| RFD-TUW-015 | 같은 source SHA의 private staging API를 기존 exact-head 승인 경로로 배포·식별하고 formal app의 실제 HTTP 흐름을 검증한다. production smoke는 별도 승인 시에만 수행한다. 소유: `apps/api/src/server.js`, 새 health-provenance test, 기존 `scripts/run-private-staging-exact-head-execution.mjs`, 새 `scripts/run-formal-deployed-api-package-qa.{sh,ps1}` OS launcher·내부 runner와 receipt validator | 003,010,014 · L | `/api/health`에 validated `LAWOS_DEPLOYMENT_COMMIT` 기반 `source_revision`을 추가하고 malformed/누락 env test; 아래 exact-head `preflight→deploy→cut007` 명령; 새 package runner/validator로 source SHA·API endpoint·artifact SHA 결속 | loopback 0, operator token 0, 정확히 10명, photo 또는 initials 10/10, 다른 tenant 데이터 0, Matter Today/task/time/WIP·billing durable write 중복 0, console error 0. staging synthetic tenant만 변경하며 production 접촉/쓰기는 0 |
| RFD-TUW-016 | formal 앱의 완전 종료·재시작 session restore와 Matter 상태 복구를 **015의 배포 API**에서 검증한다. 소유: session/update/restart QA | 015 · M | `npm --workspace apps/desktop run test:session`; `test:update`; deployed-API formal restart QA | 첫 로그인 1회 후 두 번째 실행에서 session 검증 성공, 생성한 Matter/task/time 상태가 동일, 다른 userData/tenant 혼선 0 |
| RFD-TUW-017 | 현재 `draft_blocked` rollback 문서를 app/API별 실행 가능한 staging round-trip으로 교체한다. 소유: 새 `scripts/prepare-matter-rollback-packet.mjs`, `scripts/run-matter-{api,desktop}-rollback.mjs`, `scripts/validate-matter-rollback-receipt.mjs`, `docs/launch/runbooks/rollback-runbook.md` | 011,015,016 · L | unit negative cases: hash/signature/approval/source mismatch, same-target, schema incompatibility 모두 red; 아래 명령으로 staging API `A→B→A`와 isolated macOS app `B→A`; health/login/Matter durable readback; `data_rollback_write_count=0` | 이전 immutable app/API SHA가 실제 실행되고 health의 `source_revision`과 package manifest가 target SHA와 일치. 기존 Matter 데이터는 유지되고 rollback receipt PASS 뒤에만 runbook status를 executable로 변경; production rollback은 주장하지 않음 |
| RFD-TUW-018 | macOS 1~2명 canary·monitoring을 수행하고 RF13-DIST 최종 manifest를 봉인한다. 소유: canary monitor와 별도 RF13-DIST evidence/artifact manifest | 012~017 · M | canary health/login/Matter/People smoke; rollback trigger injection 1회; manifest schema/paths/hash verification; stale internal RF13 receipt rejection test | `privacy=PASS`, `clean_sha=PASS`, `macos_release=PASS`, `windows_release=PASS/BLOCKED_BY_AUTHORITY`, `exact_source_api=PASS`, `login=PASS`, `restart=PASS`, `rollback=PASS`; internal artifact와 혼동 0 |

#### R2 실행 명령 계약

`RFD-TUW-015`는 아래 **기존** exact-head staging executor를 쓴다. 모든 입력 파일은 worktree 밖의 `0600` 파일이고 실제 값은 로그에 출력하지 않는다. `cut007`은 승인된 synthetic staging tenant와 mailbox만 변경한다.
`$ARTIFACT_MANIFEST`, `$PACKET`, `$CI_RECEIPT`, `$SECURITY_RECEIPT`는 기존 `private-staging:artifact:build → exact-head:packet → local-gates/local-receipts → review-receipts` 순서의 exact-SHA 산출물만 허용한다.

```bash
aws sso login --profile amic-vault-staging-admin
aws sts get-caller-identity --profile matter-staging-admin --no-cli-pager

npm run private-staging:exact-head:execute -- \
  --phase preflight --profile matter-staging-admin \
  --packet "$PACKET" --artifact-manifest "$ARTIFACT_MANIFEST" \
  --registry "$REGISTRY" --registry-sha256 "$REGISTRY_SHA256" \
  --approval-receipt "$APPROVAL_RECEIPT" --approval-signature "$APPROVAL_SIGNATURE" \
  --ci-receipt "$CI_RECEIPT" --security-receipt "$SECURITY_RECEIPT" \
  --execution-inputs "$EXECUTION_INPUTS" \
  --synthetic-identity-manifest "$SYNTHETIC_IDENTITY" \
  --output-dir "$EVIDENCE_PREFLIGHT"

# preflight와 같은 signed input을 사용하되 phase별 새 evidence directory를 쓴다.
npm run private-staging:exact-head:execute -- \
  --phase deploy --profile matter-staging-admin \
  --packet "$PACKET" --artifact-manifest "$ARTIFACT_MANIFEST" \
  --registry "$REGISTRY" --registry-sha256 "$REGISTRY_SHA256" \
  --approval-receipt "$APPROVAL_RECEIPT" --approval-signature "$APPROVAL_SIGNATURE" \
  --ci-receipt "$CI_RECEIPT" --security-receipt "$SECURITY_RECEIPT" \
  --execution-inputs "$EXECUTION_INPUTS" \
  --synthetic-identity-manifest "$SYNTHETIC_IDENTITY" \
  --output-dir "$EVIDENCE_DEPLOY"

npm run private-staging:exact-head:execute -- \
  --phase cut007 --profile matter-staging-admin \
  --packet "$PACKET" --artifact-manifest "$ARTIFACT_MANIFEST" \
  --registry "$REGISTRY" --registry-sha256 "$REGISTRY_SHA256" \
  --approval-receipt "$APPROVAL_RECEIPT" --approval-signature "$APPROVAL_SIGNATURE" \
  --ci-receipt "$CI_RECEIPT" --security-receipt "$SECURITY_RECEIPT" \
  --execution-inputs "$EXECUTION_INPUTS" \
  --synthetic-identity-manifest "$SYNTHETIC_IDENTITY" \
  --output-dir "$EVIDENCE_CUT007" \
  --mailbox-broker-module "$MAILBOX_BROKER"
```

배포된 API를 formal package에서 검증하는 아래 OS launcher와 validator는 **RFD-TUW-015에서 신규 생성**한다. launcher는 `NODE_OPTIONS`/`NODE_PATH`를 fail-closed하고 고정된 내부 Node entrypoint만 실행하며, 직접 `.mjs` 실행은 `LAUNCHER_REQUIRED`로 차단한다. runner는 비밀번호 reset/confirm을 수행하지 않고 staging용 `0600` credential file만 읽는다.

```bash
MATTER_DESKTOP_EXPECTED_SOURCE_SHA=<40-hex> \
MATTER_DESKTOP_RUNTIME_BASE_URL=<private-staging-api-endpoint> \
npm run matter-desktop:formal-deployed-api-qa:macos -- \
  --platform macos --credential-file <outside-worktree-0600-file> \
  --receipt <outside-worktree-receipt.json>
# Windows native host uses matter-desktop:formal-deployed-api-qa:windows with --platform windows.
node scripts/validate-formal-deployed-api-package-qa.mjs \
  --receipt <outside-worktree-receipt.json>
```

`RFD-TUW-017`의 아래 명령과 네 스크립트는 **신규 생성**한다. 기본 target은 staging이며 production은 별도 승인 claim과 `matter-prod-deploy-admin` 없이는 fail-closed한다.
rollback packet의 target manifest에는 immutable Lambda S3 VersionId, source SHA/tree, API environment hash, macOS DMG/ZIP hash·서명 상태, schema compatibility version이 모두 있어야 한다. `plan`은 CloudFormation change set만 검토하고, `execute`는 API/Admin function artifact·환경만 이전 값으로 바꾸며 DB·bucket·network resource 변경은 0이어야 한다.

```bash
node scripts/prepare-matter-rollback-packet.mjs \
  --environment staging --current-manifest <B.json> --target-manifest <A.json> \
  --output <outside-worktree-0600-packet.json>
node scripts/run-matter-api-rollback.mjs --mode plan \
  --profile matter-staging-admin --packet <packet.json> \
  --approval-receipt <approval.json> --approval-signature <approval.sig>
node scripts/run-matter-api-rollback.mjs --mode execute \
  --profile matter-staging-admin --packet <packet.json> \
  --approval-receipt <approval.json> --approval-signature <approval.sig>
node scripts/run-matter-desktop-rollback.mjs --platform macos \
  --packet <packet.json> --isolated-user-data <empty-directory>
node scripts/validate-matter-rollback-receipt.mjs \
  --receipt <outside-worktree-receipt.json>
```

### D1 — Payment migration·reversal 유지보수 부채

| ID | 구현 단위와 파일 소유권 | 선행·크기 | 자동 검증 | 관찰 가능한 완료조건 |
|---|---|---|---|---|
| RFD-TUW-019 | migration plan/backfill의 현재 입력·출력·dry-run·replay를 characterization test로 고정한다. 소유: `packages/payments/test/payment-allocation-service.test.js` | 018 · S | payments focused migration tests | 기존 결과·정렬·idempotency receipt가 byte-equivalent; 실패 fixture에서 write 0 |
| RFD-TUW-020 | `buildPaymentAllocationMigrationPlan`과 `backfillPaymentMatchesAsAllocations`만 concept-named migration module로 이동한다. 소유: `packages/payments/src/payment-allocation-migration.js` | 019 · S | focused tests + `npm --workspace packages/payments test` | public export·호출자 결과 동일, allocation/reversal transaction 코드는 이동하지 않음 |
| RFD-TUW-021 | migration CLI/import 경로를 새 module로 전환하고 dry-run/replay를 검증한다. 소유: `scripts/run-direct-receipt-production-migration.mjs`, payment exports | 020 · S | synthetic dry-run → execute → same-key replay; full payments | plan hash 동일, replay 신규 write 0, unmatched bank inflow를 revenue로 자동 분류 0 |
| RFD-TUW-022 | production payment reversal+refresh sequence를 shared controller/hook 경계로 추출한다. 소유: `MattersSurface.jsx`와 새 최소 controller | 018 · M | controller unit: ordinary failure, persisted/reload failure, success, stable retry | production UI의 사용자 메시지·refresh 대상·stable IDs가 추출 전과 동일 |
| RFD-TUW-023 | 브라우저 테스트가 copied handler 대신 실제 MattersSurface/controller를 실행하도록 변경한다. 소유: `matter-payment-reversal-browser.test.mjs` | 022 · M | real rendered reversal test 1/1; web UI suite | test orchestrator를 일부러 깨뜨리는 negative mutation에서 red; production handler 변경도 test가 감지 |
| RFD-TUW-024 | H2 transport fixture와 evidence publication을 행동 시나리오에서 분리한다. 소유: `apps/web/test/support/` | 023 · S | 동일 3개 상태 화면과 API request assertions | 테스트 본문은 사용자의 사유입력→실패→persisted failure→성공 흐름만 포함하고 구현 복제 없음 |

### D2 — Matter API read model 분리

| ID | 구현 단위와 파일 소유권 | 선행·크기 | 자동 검증 | 관찰 가능한 완료조건 |
|---|---|---|---|---|
| RFD-TUW-025 | Today/task/calendar/detail/closeout read output을 golden characterization으로 고정한다. 소유: Matter API/domain tests | 018 · M | relevant package/API focused tests; cross-tenant/denied/error cases | 허용 응답 body/hash와 denied count-leak behavior가 baseline과 일치 |
| RFD-TUW-026 | Today·task queue·calendar read-only 계산을 operations read-model module로 이동한다. 소유: `apps/api/src/matter-small-firm-read-models.js` 또는 package read module | 025 · M | domain/API focused + performance fixture | route status/body/order/IDs 동일, mutation/idempotency/authorization 코드는 이동하지 않음 |
| RFD-TUW-027 | detail·follow-up saved view·closeout/weekly report read 계산을 분리한다. 소유: 별도 detail/report read module | 026 · M | detail/followup/closeout/API/CSV focused tests | timeline scope, canonical client, blocker, CSV 합계가 baseline과 동일 |
| RFD-TUW-028 | API 파일을 catalog→auth→parse→read/mutation dispatch의 얇은 composition root로 정리한다. 소유: `matter-small-firm-api.js`, catalog | 026,027 · M | full Matter API `22/22`, full API suite, `git diff --check` | route 목록·status mapping·safe error code 변화 0; pure LOC 감소가 manifest에 기록 |

### D3 — Finance runtime boundary 분리

| ID | 구현 단위와 파일 소유권 | 선행·크기 | 자동 검증 | 관찰 가능한 완료조건 |
|---|---|---|---|---|
| RFD-TUW-029 | bank/PreBill/payment/trust/read handler별 authorization·error·audit matrix를 characterise한다. 소유: `cmp-r4-g7-finance.test.js` 및 focused tests | 028 · M | focused permission/atomic/idempotency cases | 각 route의 action, required fields, status, no-write 실패가 명시적 matrix와 일치 |
| RFD-TUW-030 | PreBill input parser와 safe domain-error classifier만 분리한다. 소유: finance prebill boundary module | 029 · S | parser direct tests + Finance API focused | approve/reject/adjustment 결과·error mapping 동일, transaction/route auth 이동 없음 |
| RFD-TUW-031 | bank import/classification handlers를 별도 boundary로 분리한다. 소유: finance bank boundary module | 030 · M | bank import/classification tests; production smoke는 read-only | raw provenance·review history·idempotency 동일, unmatched inflow auto-revenue 0 |
| RFD-TUW-032 | WIP·PreBill·Invoice·Payment handler composition을 별도 billing boundary로 분리한다. 소유: finance billing boundary module | 031 · M | Billing/Payments/Finance API full suites | WIP→Invoice→Payment lineage·reversal·AR 결과 동일, repository transaction 경계 유지 |
| RFD-TUW-033 | trust/AR/export/audit reads를 별도 read boundary로 분리한다. 소유: finance read/export module | 032 · M | AR/export/audit focused + CSV parity | amount/bucket/CSV hash/audit count가 baseline과 일치하고 permission trim 유지 |
| RFD-TUW-034 | `finance-runtime-context.js`를 얇은 runtime composition/router로 봉인한다. | 030~033 · S | Finance focused `22/22`, domain packages, full API | public exports와 server imports 호환; route·response drift 0; source size 감소 기록 |

### D4 — Test 구조·성능·번들

| ID | 구현 단위와 파일 소유권 | 선행·크기 | 자동 검증 | 관찰 가능한 완료조건 |
|---|---|---|---|---|
| RFD-TUW-035 | H1 startup/no-auto-seed fixture를 support module로 분리하고 운영권위/explicit-fixture suites를 나눈다. 소유: `matter-current-seed-worktree*` tests | 028 · S | H1 `10/10`; PostgreSQL authority `7/7` | default startup byte-equivalent와 explicit fixture opt-in이 서로 다른 파일에서 독립 실패 가능 |
| RFD-TUW-036 | RF12 live HTTP의 server/browser/evidence helper를 support module로 분리한다. 소유: `matter-small-firm-live-http-e2e*` | 024,034 · M | RF12 1/1; people10, duplicate0, AR0, closed, unexpected0 | 사용자 action 시나리오는 한 파일에 남고 support 변경이 제품 assertion을 복제하지 않음 |
| RFD-TUW-037 | 변경 파일별 pure LOC·공개 export·route 수를 evidence로 기록하되 임의 hard LOC gate는 두지 않는다. 소유: architecture evidence script | 024,028,034~036 · S | manifest generation deterministic test | size 감소와 책임 수 감소를 측정하며 파일 분할 자체가 성공조건이 되지 않음 |
| RFD-TUW-038 | 현재 formal packaged cold-start를 5회 측정한다. 소유: cold-start probe | 018 · S | 동일 장비/isolated userData 5회, median/p95 및 Home-ready timestamp | error 0; 기존 bundle size/renderer file count와 함께 baseline 고정 |
| RFD-TUW-039 | App의 major surface 중 한 곳만 `React.lazy`/native dynamic import 실험한다. 소유: `App.jsx`와 해당 route | 037,038 · M | web build/typecheck/UI; custom `matter-app://`/offline navigation tests | deep link, restart, offline renderer에서 chunk 404/blank 화면 0 |
| RFD-TUW-040 | chunk 변경 채택/철회 gate를 실행한다. | 039 · S | cold-start 5회 재측정 + web full + packaged navigation | median 또는 p95가 사전 정의한 10% 이상 개선되고 오류 0이면 채택; 아니면 revert하고 advisory 유지 |

### O1 — 10인 로펌 프로필 사진 운영성

| ID | 구현 단위와 파일 소유권 | 선행·크기 | 자동 검증 | 관찰 가능한 완료조건 |
|---|---|---|---|---|
| RFD-TUW-041 | 현행 서버 파일 사진 교체 runbook을 만든다. 소유: People/Profile 운영 runbook | 018 · S | SHA-256 filename validator; API profile smoke | 설치물 재배포 없이 API artifact만 교체 가능, 원본/rollback hash와 10명 mapping 기록 |
| RFD-TUW-042 | 프로필 미디어 운영 결정을 machine-readable하게 닫는다. 소유: 새 `.omo/evidence/profile-media-operability-decision.json`, `scripts/validate-profile-media-operability-decision.mjs`; 필요 시 새 `workbook/matter-profile-media-admin-goal-*.md` | 041 · S | `node scripts/validate-profile-media-operability-decision.mjs --decision <json>`; schema는 `defer_server_file`/`create_admin_goal` 중 정확히 하나와 측정값·owner·review date를 요구하고 누락/양쪽 선택은 red | `defer_server_file`은 월 1회 이하, 변경당 operator p95 30분 이하, 앱 재설치 0, 10/10 read, 15분 이내 hash rollback 모두 PASS일 때만 허용. 하나라도 초과하면 `create_admin_goal`이어야 하며 object storage, `photo_object_key/content_hash`, admin upload/read/delete, audit, initials fallback, rollback 각각의 TUW·test·owner가 있는 별도 Goal을 validator가 확인 |

## 6. Phase Gate

| Gate | 통과 조건 |
|---|---|
| G0 Baseline | RFD-TUW-001~003 COMPLETE; source/authority/rollback owner 명확 |
| G1 Privacy | RFD-TUW-004~009 COMPLETE; 모든 distributable artifact privacy finding 0 |
| G2 RF13 Formal | RFD-TUW-010~018 COMPLETE; `PASS_MACOS_PRIMARY` 허용. macOS signing·exact-source deployed API·login·restart·rollback은 PASS, Windows는 `native_qa=PASS`와 `release=PASS/BLOCKED_BY_AUTHORITY` 중 하나를 기록 |
| G3 Payment | RFD-TUW-019~024 COMPLETE; Payments/API/web green, copied orchestration 제거 |
| G4 Matter | RFD-TUW-025~028 COMPLETE; output/auth parity와 API full green |
| G5 Finance | RFD-TUW-029~034 COMPLETE; domain/API reconciliation green |
| G6 Maintainability | RFD-TUW-035~040 COMPLETE; behavioral evidence 보존, chunk는 측정 기반 결정 |
| G7 Operability | RFD-TUW-041~042 COMPLETE; 현재 사진 운영 runbook과 self-service 구현/defer 결정 기록 |

## 7. 필수 회귀 사다리

각 tranche는 좁은 테스트부터 넓은 테스트 순으로 실행한다.

1. 수정 파일 syntax/typecheck와 focused test
2. owning package test
3. 관련 API/web test
4. `git diff --check`와 source pre/post fingerprint
5. tranche gate에서 Node 22 전체 API/domain/web
6. RF13·최종 gate에서 root regression, PostgreSQL, formal package QA, manual rendered QA

기본 명령:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace packages/payments test
PATH=/opt/homebrew/opt/node@22/bin:$PATH node --test apps/api/test/matter-small-firm-api.test.js
PATH=/opt/homebrew/opt/node@22/bin:$PATH node --test apps/api/test/cmp-r4-g7-finance.test.js
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/web run test:ui
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/web run build
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/web run typecheck
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/desktop run test:smoke
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/desktop run test:session
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/desktop run test:update
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test
```

## 8. Release 체크리스트와 rollback trigger

### Pre-deploy

- [ ] clean exact main/release SHA와 review approval
- [ ] privacy scanner 0 findings
- [ ] API/domain/web/root/PostgreSQL green
- [ ] 비변경 package pipeline과 승인 필요 remote smoke가 분리됐고 aggregate formal 명령을 직접 실행하지 않음
- [ ] macOS signing/notarization/Gatekeeper PASS
- [ ] Windows native QA PASS; signing PASS 또는 명시적 `BLOCKED_BY_AUTHORITY` platform hold
- [ ] staging API/Lambda revision이 package source SHA와 일치하고 10명 roster/profile/Matter smoke PASS
- [ ] app/API `A→B→A` staging rollback round-trip과 receipt validator PASS
- [ ] 이전 app/API artifact SHA와 rollback 명령 보존

### Canary

- [ ] 1~2명 isolated profile 설치
- [ ] 로그인, Home, Matter, People, 시간·청구, 완전 재시작
- [ ] 15분 동안 5xx/timeout, 로그인 실패, 핵심 5개 동작의 반복 latency 관찰

### Rollback trigger

- 로그인 또는 session restore 실패 1건
- 잘못된 tenant/명단 노출 1건
- Matter/Payment write 중복 또는 AR 불일치 1건
- 핵심 read가 2회 연속 5xx/timeout이거나 write 결과가 성공/실패 어느 쪽인지 확정되지 않는 경우 1건
- 동일 핵심 동작 5회 median이 baseline 2배를 넘고 5분 뒤 재측정에서도 지속
- Gatekeeper/서명 검증 실패 또는 artifact SHA 불일치

## 9. 완료 정의

- 모든 `RFD-TUW-001~042`가 정확히 한 번 존재하고 `COMPLETE` evidence를 가진다.
- G0~G7이 모두 PASS다. `G2=PASS_MACOS_PRIMARY`는 macOS 외부 배포 완료로 인정하되 Windows 외부 배포 완료를 뜻하지 않는다.
- `RFD-TUW-013 COMPLETE`는 Windows native QA가 PASS이고 배포 상태를 결정했다는 뜻이다. Authenticode 보류 시 `windows_release=BLOCKED_BY_AUTHORITY`를 유지해도 macOS 중심 RF13-DIST는 완료할 수 있다.
- 현재 internal QA artifact를 formal/distributable로 인용하는 문서가 0건이다.
- formal 설치물의 private-data scanner finding이 macOS/Windows 모두 0이다.
- 실제 로그인·10명 roster/profile·Matter 핵심 흐름·재시작·rollback 영수증이 동일 exact SHA에 결속된다.
- 대형 모듈 분리 전후 response/audit/idempotency/reconciliation 결과가 동일하다.
- 서명·공증·배포가 실행되지 않은 경우 해당 gate를 PASS로 쓰지 않고 명시적 `BLOCKED_BY_AUTHORITY`로 남긴다.

## 10. 재개용 보류 상태 (2026-08-03)

이 Goal은 10인 내부 파일럿 범위 조정에 따라 보류한다. 아래 상태는 새 테스트·리뷰·QA 없이 마지막으로 완료된 canonical freeze인 `.omo/evidence/rf13-debt-remediation-20260731/progress-manifest.json`과 `.omo/evidence/rfd-final-gate-review-20260801.md`를 그대로 옮긴 것이다. 그 freeze 이후 수정된 작업은 검증 완료로 승격하지 않고 `PAUSED_UNVERIFIED`로 취급한다. G0~G7은 모두 FAIL이며 `COMPLETE`인 TUW는 0개다.

### 10.1 RFD-TUW-001~042 상태

| TUW | 마지막 canonical 상태 | 보류 메모 |
|---|---|---|
| RFD-TUW-001 | `IN_PROGRESS` | QA-only baseline 승인; formal source/artifact 완료 아님 |
| RFD-TUW-002 | `IN_PROGRESS` | local 구현·review 승인; formal artifact chain 대기 |
| RFD-TUW-003 | `IN_PROGRESS` | local 구현·review 승인; formal artifact chain 대기 |
| RFD-TUW-004 | `IN_PROGRESS` | local 구현·review 승인; distributable privacy 증거 대기 |
| RFD-TUW-005 | `IN_PROGRESS` | local 구현·review 승인; formal runtime 증거 대기 |
| RFD-TUW-006 | `IN_PROGRESS` | local 구현·review 승인; formal scanner 결과 대기 |
| RFD-TUW-007 | `IN_PROGRESS` | local 구현·review 승인; formal artifact privacy 결과 대기 |
| RFD-TUW-008 | `IN_PROGRESS` | local 구현·review 승인; public renderer/formal artifact 결속 대기 |
| RFD-TUW-009 | `IN_PROGRESS` | local 구현·review 승인; clean exact-SHA artifact 대기 |
| RFD-TUW-010 | `BLOCKED_BY_AUTHORITY` | exact-SHA formal release authority 대기 |
| RFD-TUW-011 | `BLOCKED_BY_ARTIFACT` | macOS formal artifact 부재 |
| RFD-TUW-012 | `BLOCKED_BY_ARTIFACT` | 서명·공증 가능한 macOS artifact 부재 |
| RFD-TUW-013 | `BLOCKED_BY_ARTIFACT` | Windows native/formal artifact 부재 |
| RFD-TUW-014 | `BLOCKED_BY_ARTIFACT` | exact-source deployed API/package artifact 부재 |
| RFD-TUW-015 | `BLOCKED_BY_AUTHORITY` | private staging 인증·운영 authority 대기 |
| RFD-TUW-016 | `BLOCKED_BY_ARTIFACT` | deployed API restart artifact 부재 |
| RFD-TUW-017 | `BLOCKED_BY_AUTHORITY` | rollback 승인 서명·운영 authority 대기 |
| RFD-TUW-018 | `BLOCKED_BY_ARTIFACT` | formal artifact index 0; release/canary 실행 안 함 |
| RFD-TUW-019 | `IN_PROGRESS` | local payment characterization 승인; 상위 operational gate 대기 |
| RFD-TUW-020 | `IN_PROGRESS` | local migration module 승인; 상위 operational gate 대기 |
| RFD-TUW-021 | `IN_PROGRESS` | local CLI/replay 승인; 상위 operational gate 대기 |
| RFD-TUW-022 | `IN_PROGRESS` | local reversal controller 승인; 상위 operational gate 대기 |
| RFD-TUW-023 | `IN_PROGRESS` | local real browser path 승인; 상위 operational gate 대기 |
| RFD-TUW-024 | `IN_PROGRESS` | local transport/evidence split 승인; 상위 operational gate 대기 |
| RFD-TUW-025 | `IN_PROGRESS` | local Matter golden characterization 승인; 상위 gate 대기 |
| RFD-TUW-026 | `IN_PROGRESS` | local operations read model 승인; 상위 gate 대기 |
| RFD-TUW-027 | `IN_PROGRESS` | local detail/report read model 승인; 상위 gate 대기 |
| RFD-TUW-028 | `IN_PROGRESS` | local Matter composition root 승인; 상위 gate 대기 |
| RFD-TUW-029 | `IN_PROGRESS` | local Finance matrix 승인; 상위 gate 대기 |
| RFD-TUW-030 | `IN_PROGRESS` | local PreBill boundary 승인; 상위 gate 대기 |
| RFD-TUW-031 | `IN_PROGRESS` | local bank boundary 승인; 상위 gate 대기 |
| RFD-TUW-032 | `IN_PROGRESS` | local billing boundary 승인; 상위 gate 대기 |
| RFD-TUW-033 | `IN_PROGRESS` | local read/export boundary 승인; 상위 gate 대기 |
| RFD-TUW-034 | `IN_PROGRESS` | local Finance router 승인; 상위 gate 대기 |
| RFD-TUW-035 | `IN_PROGRESS` | local H1 fixture split 승인; 상위 gate 대기 |
| RFD-TUW-036 | `IN_PROGRESS` | local RF12 support split 승인; 상위 gate 대기 |
| RFD-TUW-037 | `IN_PROGRESS` | `MEASUREMENT_ONLY`; before/behavior 증거 미완 |
| RFD-TUW-038 | `BLOCKED_BY_ARTIFACT` | authoritative formal package 5회 baseline 부재 |
| RFD-TUW-039 | `NOT_STARTED` | 유효한 RFD-038 baseline 전에는 시작 불가 |
| RFD-TUW-040 | `NOT_STARTED` | 유효한 RFD-039 candidate 전에는 시작 불가 |
| RFD-TUW-041 | `BLOCKED_BY_EVIDENCE` | 실제 10/10 프로필·사진 운영 측정 부재 |
| RFD-TUW-042 | `BLOCKED_BY_EVIDENCE` | 운영 결정 record 미완; 외부 mutation 실행 안 함 |

마지막 canonical 집계: `IN_PROGRESS=28`, `NOT_STARTED=2`, `BLOCKED_BY_AUTHORITY=3`, `BLOCKED_BY_ARTIFACT=7`, `BLOCKED_BY_EVIDENCE=2`, `COMPLETE=0`.

### 10.2 열려 있는 세 축의 마지막 중단 지점

1. **산출물 크래시 복구 — `PAUSED_UNVERIFIED`**: dual lock/recovering hardlink의 same-inode 재진입 문제를 처리한 뒤, crash recovery 중 transaction root를 재귀 삭제하면 `.transaction-owner.json`이 lock/dir보다 먼저 사라져 다음 복구가 owner를 인증하지 못하는 문제가 마지막으로 열렸다. owner marker를 마지막에 지우는 resumable cleanup 수정 도중 중단했으며, 마지막 수정 뒤 새 회귀 실행은 하지 않았다. 재개 시 `scripts/lib/json-postgres-production-artifact.mjs`의 owner-last cleanup과 crash-during-recovery fixture부터 확인한다.
2. **cold-start 회귀 — `PAUSED_FAILING`**: 마지막 기존 실행은 19개 중 12 PASS, 7 FAIL이었다. 6건은 `/var`와 `/private/var`의 lexical/canonical alias 불일치였고, historical canonical positive는 실제 launch 5회를 수행했지만 `error_count=14`로 `FAILED_CLOSED`가 되었다. 재개 시 path authority 정규화와 historical error 집계 원인을 먼저 분리한다.
3. **측정 후 서명 handshake — `PAUSED_DESIGN_ONLY`**: fresh RFD-038/039/040 측정이 downstream hash를 바꾸므로 사전 서명된 completion packet을 사용할 수 없다는 지점에서 중단했다. 합의된 방향은 owner-only `0700` file-exchange challenge, 기본 15분 TTL, receipt/signature hash·size 결속, one-use validator session, immutable publication index다. signer key/callback/capability를 앱이나 JSON에 직렬화하지 않는다. 전용 handshake 구현·검증은 아직 시작하지 않았다.

### 10.3 외부 권한 또는 파일럿 범위 결정이 필요한 항목

- clean exact-main/release SHA 확정, 원격 push/PR/CI/merge 및 정식 release 승인
- macOS Developer ID 서명·공증·staple·Gatekeeper와 formal artifact 발행
- 승인된 Windows native host·Authenticode 인증서로 build/install/uninstall 검증
- private staging 인증 세션으로 exact-source API 로그인·10인 roster/profile/Matter·restart 실행
- 실제 10명 명단·사진 manifest와 서버 측 교체/rollback 운영 측정
- app/API `A→B→A` rollback, production promote/smoke/rollback 실행 권한
- promote·rollback·Goal completion용 owner Ed25519 서명 및 post-measurement handshake 참여

보류 중에는 위 항목을 실행하거나 상태를 PASS/COMPLETE로 승격하지 않는다. 재개 순서는 **산출물 owner-last 크래시 복구 → cold-start 7개 실패 분리 → 측정 후 서명 handshake → external-authority gates**다.
