# Codex Implementation Assessment

작성일: 2026-07-05 Asia/Seoul.

이 문서는 `00-devplan-v3.md`를 Codex 실행 단위로 재분해하고, 현재 checkout에서 실제 구현 가능한 범위와 외부 권한이 필요한 범위를 구분한 실행성 점검표다. 기준은 `169484912 docs(audit): add enterprise audit workbook` 이후 현재 워크트리다. 2026-07-05 후속 구현 패스에서 C0~C8의 repo-local 코드와 문서 변경을 실제로 반영했으며, 외부 권한이 필요한 receipt와 production claim은 별도 범위로 유지한다.

## 1. 결론

Codex가 repo-local 변경으로 구현할 수 있는 범위는 충분히 컸고, 이번 구현 패스에서 C0~C8을 현재 리포 안의 API, web, desktop, scripts, docs, workbook 변경으로 닫았다. 원래는 10~13개 세션 또는 커밋 단위로 나누는 계획이었으나, 이 checkout에서는 하나의 연속 작업으로 구현과 focused verification을 진행했다.

반영된 repo-local 단위는 C0, C1, C2a, C2b, C3, C4, C5, C6a, C6b, C6c, C7, C8이다. 외부 배포, provider credential, AWS Lambda live smoke, OIDC/SCIM/SOC2/Popbill/M365 실제 receipt는 Codex 단독으로 완료할 수 없다.

최종 판정도 분리한다. repo-local 구현과 테스트가 green이어도 `production_ready_claim:false`는 유지한다. 축 A `내부 파일럿 가능` 상향은 V Track의 직접 재실행 증거가 닫힌 뒤에만 재심하며, 축 B enterprise SaaS 판정은 SSO/SCIM/SOC2/managed DB/provider receipts 없이는 올리지 않는다.

## 2. 구현 가능성 매트릭스

| 단위 | 작업 | Codex 구현성 | 주요 경로 | 제약 | 최소 검증 |
|---|---|---|---|---|---|
| C0 | runtime profile, store path manifest | 가능 | `apps/api/src/runtime-profile.js`, `apps/api/src/store-path-manifest.js` | 기존 desktop 파일명 유지 | 단위 테스트 또는 import smoke |
| C1 | Matter opening UI payload 복구, safe error | 가능 | `apps/web/src/data/apiClient.js`, `MatterOpeningWizard.jsx`, `matter-runtime-context.js` | clearance ledger gate 바이트 동일 유지 | clearance proof, matter integration, UI sample |
| C2a | auth drift test contract 복구 | 가능 | `apps/api/test/helpers/session.js`, auth-drift tests | no-token 401 단정 약화 금지 | `npm run api:test` fail 감소, 신규 fail 0 |
| C2b | proof artifact regen guard | 가능 | `scripts/lib/upl-proof-runner.mjs`, proof tests, `package.json` | committed `artifacts/manual-qa/*` 직접 정리 금지 | `npm test` 2회 후 artifacts dirty 없음 |
| C3 | vault bridge 전용 헤더 | 가능 | `matter-runtime-context.js`, `server.js`, `apiClient.js`, bridge tests/scripts/docs | 외부 `amic-vault` 교체와 Lambda 재배포는 별도 | bridge tests 7/7, CORS header 확인 |
| C4 | session secret hardening, STORE_PATH preflight | 가능 | `session-auth.js`, `server.js`, desktop local API, docs/scripts | 운영 프로필 fail-closed, local-dev 랜덤 허용 | startup/preflight tests, restart proof |
| C5 | Portal G10 예외와 hardening | 가능 | portal routes/tests/UI docs | 외부 portal provider receipt는 별도 | G10 route tests, UI sample |
| C6a | HRX auth/security drift | 가능 | `apps/api/test/hrx*`, auth helpers | 테스트 완화 금지, 직접 authorize 호출 필요 | HRX slice 101/101 |
| C6b | tenant-b QA seed | 가능 | seed JSON, role registry, `session-auth.js`, tests | HRX roster 9-count 불변 | tenant isolation tests |
| C6c | Vault deny 표준화 | 가능 | `vault-dms-runtime-context.js`, tests | deny 제거 금지 | 403 + audit hint proof |
| C7 | UI hygiene, dead surfaces, strict typecheck | 가능 | web components, i18n, validators, package scripts | Lazyweb/AI-slop 대상은 실제 화면 QA 필요 | web build, UI regression, typecheck, sloplint when UI touched |
| C8 | env catalog, backup drill formalization | 가능 | docs, validators, drill scripts, workbook | 실제 backup schedule 운영은 owner 확인 필요 | env matrix validator, drill receipt |

## 3. 외부 권한 또는 별도 확인이 필요한 범위

| 범위 | 현재 판정 | 필요한 것 |
|---|---|---|
| `package.json` 변경 | 계획 A~H에서 채택된 것으로 보이나 실제 구현 전 확인 권장 | 구현 세션에서 변경 범위 재확인 |
| 외부 `amic-vault` bridge header 교체 | 이 리포 밖 | 별도 worktree/owner 승인 |
| AWS Lambda `matter-lawos-api-prod` 재배포 | Codex 단독 불가 | 배포 권한, 배포 receipt, post-deploy smoke |
| Popbill, M365, OIDC, SCIM, SOC2 evidence | Codex 단독 불가 | credentials, provider console, owner/operator receipt |
| production-ready 또는 public release claim | 금지 | 별도 owner gate, external receipts, W7 재판정 |
| 기존 dirty `artifacts/manual-qa/*` 13건 정리 | 이번 범위 아님 | C2b 구현 뒤 regen guard로 자연 해소 여부 검증 |

## 4. 세션/커밋 분해

| 순서 | 단위 | 목표 | 선행 | 커밋 성격 |
|---:|---|---|---|---|
| S0 | docs baseline | v3 실행 정본과 assessment를 workbook에 고정 | 없음 | docs |
| S1 | C0 | shared runtime/store modules 추가 | S0 | feat(api) |
| S2 | C3 | vault bridge 전용 헤더 이관 | S1 | fix(api/web/test) |
| S3 | C1 | Matter opening vertical flow 복구 | S1 | fix(web/api) |
| S4 | C2a | auth drift 58건 계약 복구 | S2 병행 가능 | fix(test) |
| S5 | C2b | proof artifact 오염 차단 | S4 병행 가능 | fix(test/scripts) |
| S6 | C4 | session secret + STORE_PATH preflight | S1 | fix(api/desktop) |
| S7 | C5 | Portal G10 external surface 정리 | S2 이후 권장 | fix(api/web/test) |
| S8 | C6a | HRX security tests 복구 | S4 이후 권장 | fix(test) |
| S9 | C6b/C6c | tenant-b seed와 vault deny 표준화 | S8 이후 권장 | fix(api/test) |
| S10 | C7 | UI hygiene, dead surfaces, strict typecheck | S5 이후 권장 | fix(web/docs) |
| S11 | C8/V prep | env catalog, backup drill, 재검증 ledger 갱신 | S6 이후 | docs/scripts |

크리티컬 패스는 `S1 C0 -> S2 C3 -> S4/S5 C2 -> S6 C4 -> V Track`이다. C1은 P0이지만 서버 원인이 아니라 web payload 원인이므로, C3와 병행하되 clearance ledger 불변 검증을 반드시 붙인다.

## 5. 실행 게이트

각 구현 세션은 다음 공통 게이트를 가진다.

| 게이트 | 기준 |
|---|---|
| 상태 확인 | 시작과 종료에 `git status --short` 확인. 기존 dirty manual QA 파일은 직접 수정하지 않음 |
| staging | 명시 pathspec만 stage. unrelated dirty 파일 미접촉 |
| 코드 위생 | `git diff --check` 통과 |
| 보안 불변식 | no-token 업무 route 401, cross-tenant deny, step-up/masking, fake `x-lawos-*` 무력화 유지 |
| 테스트 | 해당 C 단위의 focused tests 우선, C2/C8에서 root/API 전체 재검증 |
| artifact 위생 | C2b 이후 `npm test` 2회 연속 후 `git status --porcelain -- artifacts/` 공백 |
| 판정 위생 | 파이프가 exit code를 가리지 않도록 원명령 exit code 확인 |
| 보고 | 직접 실행한 명령, exit code, 남은 dirty 상태를 V ledger에 기록 |

## 6. 첫 구현 패킷 제안

이 섹션은 초기 계획으로 보존한다. 실제 구현은 S1(C0)부터 시작했고, C0을 C3와 C4의 공통 전제로 둔 뒤 C3, C1, C2, C6, C4/C8, C7 순서로 진행했다. C3는 API test 64 fail 중 bridge 6건과 직접 연결됐고, C1은 내부 파일럿을 막는 Matter opening 400과 직접 연결됐다.

권장 순서:

1. S1 C0 shared modules
2. S2 C3 vault bridge header
3. S3 C1 Matter opening
4. S4/S5 C2 auth drift + proof hygiene
5. S6 C4 operational preflight

이 5개는 이번 구현 패스에서 닫혔다. 축 A의 `데모 가능 -> 내부 파일럿 후보` 재심 입력은 준비됐지만, 실제 `내부 파일럿 가능` 승격은 V Track proof가 필요하다.

## 7. 2026-07-05 구현 상태

이번 요청에서 문서 업데이트 후 goal을 설정했고, 이 문서를 정본으로 C0~C8 repo-local 구현을 수행했다. 기존 dirty manual QA 파일은 소유권 밖으로 두었고, C2b proof test는 temp artifact override를 사용하도록 바꾸어 committed `artifacts/manual-qa/*`를 재생성하지 않게 했다.

| 단위 | 현재 상태 | 직접 반영된 핵심 |
|---|---|---|
| C0 | 구현 완료 | `runtime-profile.js`, `store-path-manifest.js`, operational/local-dev 프로필과 store path manifest |
| C1 | 구현 완료 | clearance token list API, Matter opening payload 정규화, safe error mapping, wizard token select |
| C2a | 구현 완료 | session-auth test helper, API auth drift tests의 signed session contract |
| C2b | 구현 완료 | UPL-E10 proof temp artifact override, changed UI source sloplint filtering |
| C3 | 구현 완료 | `x-lawos-vault-bridge-token` 전용 bridge header, CORS/header validators/docs/scripts |
| C4 | 구현 완료 | operational secret fail-closed, local-dev random secret, STORE_PATH startup preflight |
| C5 | 구현 완료 | portal external public routes exact allowlist, G10 route tests |
| C6a | 구현 완료 | HRX/session/step-up/security drift focused tests 복구 |
| C6b | 구현 완료 | tenant-b QA seed, non-AMIC home tenant isolation, seed validators |
| C6c | 구현 완료 | Vault foreign tenant deny가 permission gate와 audit hint까지 도달 |
| C7 | 구현 완료 | orphan surfaces 삭제, i18n dead key 정리, preview labels, strict web typecheck |
| C8 | 구현 완료 | store env catalog, preflight validator, backup/restore drill object-store coverage |

## 8. 구현 후 재검증 게이트

최종 V Track 갱신 전 실행할 게이트는 다음이다.

| Gate | Command | Expected status |
|---|---|---|
| diff hygiene | `git diff --check` | pass |
| API suite | `npm run api:test` | pass |
| root suite | `npm test` | pass, manual QA artifact 상태 추가 오염 없음 |
| web build | `npm --prefix apps/web run build` | pass |
| UI regression | `node --test apps/web/test/ui-regression.test.mjs` | pass |
| store path preflight | `npm run store-path-preflight:validate` | pass |
| web typecheck | `npm run typecheck:web` | pass with strict exit 0 and no diagnostics |
| AI slop changed-copy check | `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | pass or documented intentional flags |

2026-07-05 구현 패스의 최종 결과:

| Gate | Result |
|---|---|
| `git diff --check` | pass |
| `npm run api:test` | pass, 265/265 |
| `npm test` | pass, 4155/4155 |
| manual QA artifact status before/after `npm test` | 동일. 기존 dirty 파일은 남아 있으나 추가 오염 없음 |
| `npm --prefix apps/web run build` | pass, Vite large chunk warning only |
| `node --test apps/web/test/ui-regression.test.mjs` | pass, 16/16 |
| `npm run store-path-preflight:validate` | pass, 5 scenarios |
| `npm run typecheck:web` | pass, strict exit 0 with no diagnostics |
| `sloplint --changed` | exit 0. strong findings 제거 후 weak em-dash findings만 audit docs에 남음 |

## 9. 남은 외부 receipt 범위

이 구현 패스가 닫혀도 다음은 별도 owner/operator gate로 남는다. 이는 repo-local 미구현이 아니라 외부 계정, 배포, provider console, 운영 승인 증거의 문제다.

| 범위 | 이유 |
|---|---|
| AWS Lambda live deploy/smoke | 배포 권한과 외부 endpoint receipt 필요 |
| OIDC/SCIM/SOC2/Popbill/M365 | provider credential, console proof, owner receipt 필요 |
| managed DB/backup schedule 운영 | 인프라 선택과 운영 승인 필요 |
| production-ready claim | human owner gate와 외부 receipts 없이는 금지 |
