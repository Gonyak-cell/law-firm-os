# Reverification Decision Ledger

이 파일은 V Track의 재검증 ledger다. 수리 claim만으로 판정을 올리지 않고, 각 Stage의 matching surface를 직접 재실행한 증거가 있을 때만 W7 판정을 갱신한다.

## 1. Stage-by-stage decision gates

| Stage | Required proof | A-axis effect | B-axis effect |
|---|---|---|---|
| R1 Matter opening | client -> clearance -> matter -> vault document -> restart readback | `데모 가능`에서 `내부 파일럿 후보`로 이동 가능 | 없음 |
| R2 Tests | `npm test`, `npm run api:test`, web build/UI gate current | quality confidence 회복 | 없음 |
| R3 Session secret | prod profile missing secret fails; dev/test explicit | internal pilot blocker 제거 | authentication control 개선 |
| R4 STORE_PATH | prod profile missing paths fails; fixed paths restart proof | data-loss blocker 제거 | availability/DR control 개선 |
| R5 Portal | G10 portal tests + UI sample | portal pilot scope 가능 | external collaboration still provider/owner gated |
| R6 HRX security | tenant/step-up/security regression green | People lane confidence | enterprise access-control evidence 개선 |
| R7 Dead surface | 12 surfaces routed or deleted | UI confusion 제거 | productization evidence 개선 |
| R8 Env/backup | env catalog + backup/restore drill receipt | pilot operator reproducibility | SOC2/ISO readiness seed |

## 1A. Executable v3 commit gates

`remediation-v3-executable/00-devplan-v3.md`가 R Track 실행 정본이고, `03-codex-implementation-assessment.md`가 Codex 구현 단위와 제약을 정의한다. 아래 C 단위 proof가 닫혀야 Stage-by-stage gates를 재판정할 수 있다.

| C unit | Required proof before V update | Notes |
|---|---|---|
| C0 | shared modules added, import smoke green, existing behavior unchanged | C3/C4 선행 |
| C1 | Matter opening UI/API vertical proof green | R1 재판정 입력 |
| C2 | `npm test` and `npm run api:test` green, artifacts clean after repeated run | R2 재판정 입력 |
| C3 | vault bridge dedicated-header tests green, session-token-only blocked | R2/R5 입력. External deploy proof separate |
| C4 | operational secret/path missing fails, fixed path restart proof | R3/R4 재판정 입력 |
| C5 | G10 portal API/UI sample green | R5 재판정 입력 |
| C6 | HRX slice and tenant isolation negative tests green | R6 재판정 입력 |
| C7 | dead surfaces deleted/routed, UI regression green, preview labels visible | R7 재판정 입력 |
| C8 | env catalog validator and backup/restore drill receipt green | R8 재판정 입력 |

## 1B. 2026-07-05 repo-local implementation status

`remediation-v3-executable/03-codex-implementation-assessment.md`를 goal 정본으로 설정한 뒤 C0~C8 repo-local 범위를 구현했다. 이 표는 production claim이 아니라 V Track 재판정 입력이다. 외부 receipt, owner gate, provider console 증거가 필요한 항목은 여전히 별도다.

| C unit | Implementation state | Focused proof already run | V Track note |
|---|---|---|---|
| C0 | 완료 | runtime/profile/store manifest import smoke | C3/C4 공통 전제 충족 |
| C1 | 완료 | `cmp-r4-g6-crm-intake`, `cmp-r4-g4-matter`, web build, UI regression | Matter opening 400 blocker 재심 입력 |
| C2 | 완료 | `npm run api:test`, `npm test`, UPL-E10 temp artifact test | API/root drift 재심 입력. 기존 dirty manual QA 파일은 소유권 밖 |
| C3 | 완료 | `matter-vault-bridge-api`, bridge contract validator, session-auth regression | dedicated header 전환 완료. External deploy proof separate |
| C4 | 완료 | session-auth tests, `store-path-preflight:validate` | operational profile fail-closed와 fixed path restart proof 입력 |
| C5 | 완료 | G10 portal route tests via API suite/focused portal tests | external portal provider receipt separate |
| C6 | 완료 | HRX security/tenant/master-data/matter-vault focused tests, tenant-b seed validator | HRX/security 재심 입력 |
| C7 | 완료 | web build, UI regression, strict typecheck, notifications glob test | orphan surface 제거와 preview labeling 입력 |
| C8 | 완료 | backup/restore drill test, store env catalog/preflight validator | backup object-store coverage와 catalog 입력 |

### Final gate commands

V Track status를 이 ledger에 확정 반영하기 전 같은 checkout에서 아래 명령을 한 번 더 실행한다. 2026-07-05 구현 패스에서는 아래 결과를 확인했다.

| Gate | Command | 2026-07-05 result | Ledger treatment |
|---|---|---|---|
| diff hygiene | `git diff --check` | pass | V update 가능 |
| API suite | `npm run api:test` | pass, 265/265 | R2 입력 |
| root suite | `npm test` | pass, 4155/4155 | R2 입력. 실행 전후 manual QA artifact status 동일 |
| web build | `npm --prefix apps/web run build` | pass, Vite large chunk warning only | R7 입력 |
| UI regression | `node --test apps/web/test/ui-regression.test.mjs` | pass, 16/16 | R7 입력 |
| store path preflight | `npm run store-path-preflight:validate` | pass, 5 scenarios | R4/R8 입력 |
| web typecheck | `npm run typecheck:web` | pass, strict exit 0 with no diagnostics | R7 입력 |
| AI slop changed-copy check | `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | exit 0, 36 weak em-dash findings in generated audit docs after strong findings removed | UI/copy 변경 강한 신호 없음. 약신호는 audit quote/digest 문체 보존 |

### Closed typecheck diagnostics

| File | Closed diagnostic |
|---|---|
| `apps/web/src/candidate/CandidatePortal.tsx` | `Panel` required `id` prop added |
| `apps/web/src/people/employees/EmployeeList.tsx` | HRX employee result narrowed before `.length` access |
| `apps/web/src/people/employees/PeopleWorkforceDirectory.tsx` | org chart response narrowed with record/list guards before state update |

### Known limits after repo-local implementation

| Limit | Effect |
|---|---|
| Existing dirty `artifacts/manual-qa/*` files predate this pass | 이번 구현이 소유하지 않는 dirty 상태. C2b는 추가 오염 방지로 검증 |
| `validate-sf-client-matter-parity-crosswalk.mjs` has unrelated historical expectations outside C7 deletion check | 별도 parity remediation 없이는 V 승격 근거로 쓰지 않음 |
| AWS Lambda, OIDC, SCIM, SOC2, Popbill, M365 receipts absent | 축 B enterprise SaaS remains 운영 부적합 |
| `production_ready_claim` owner gate absent | production-ready claim remains false |

## 2. S 15개 질문 재답변 조건

| # | Question | Current answer from W7 | Update condition |
|---:|---|---|---|
| 1 | 실제 실행되는가 | 부분 확인됨 | R2 all test/build gates current |
| 2 | 사용자가 로그인 가능한가 | 확인됨, synthetic token | R3 + OIDC/SSO before enterprise claim |
| 3 | 핵심 로펌 플로우가 완주되는가 | Matter 생성에서 중단 | R1 vertical proof |
| 4 | 문서가 저장되고 재기동 후 남는가 | 확인됨 | R4 fixed path proof |
| 5 | 권한이 서버에서 강제되는가 | 부분 확인됨 | R2 + R6 security negative tests |
| 6 | 감사로그가 충분한가 | 부분 확인됨 | sensitive read endpoint sample |
| 7 | 외부 연동이 되는가 | 미확인/운영 부적합 | provider receipts |
| 8 | DB가 운영 수준인가 | 운영 부적합 | managed DB plan/proof |
| 9 | 테스트가 신뢰 가능한가 | 작동 불명 | R2 green |
| 10 | desktop이 안전한가 | 부분 확인됨 | packaged desktop restart/signing receipt |
| 11 | UI 액션이 막히지 않는가 | 부분 확인됨 | R7 + CA-4 click table |
| 12 | HRX가 운영 가능한가 | 부분 확인됨 | R6 |
| 13 | SaaS enterprise 준비인가 | 운영 부적합 | SSO/SCIM/seat/SOC2/managed DB |
| 14 | 프로덕션 판정 가능한가 | 미확인, 부여 금지 | human owner + external receipts + production gates |
| 15 | 다음 실행 지시가 있는가 | 확인됨 | coverage-plan-v2 + executable v3 + Codex implementation assessment |

## 3. 30/60/90 v4 expansion queue

| Horizon | Existing P item | v4 detail required |
|---|---|---|
| 30일 | P1-01 Matter opening | exact API/UI scripts, fixture IDs, restart receipt path |
| 30일 | P1-02 Root/API tests | failing test inventory, owner/provider-gated expected states |
| 30일 | P1-03 Session secret | env profile matrix and startup test |
| 30일 | P1-04 STORE_PATH | 14 path matrix and desktop userData mapping |
| 30일 | P2-01 Portal G10 | invite/RFI/secure link/data room scenario receipts |
| 30일 | P2-02 HRX security | tenant, step-up, audit route negative cases |
| 30일 | P2-03 UI dead surface | route/delete decision table |
| 60일 | OIDC/Popbill/Outlook/observability/managed DB | owner/provider receipt plan |
| 90일 | SCIM/seat billing/SOC2/external security/multi-tenant staging | enterprise readiness evidence model |

## 4. 판정 상한

| Axis | Current W7 verdict | Highest possible before R1~R4 | Highest possible before SSO/SCIM/SOC2 |
|---|---|---|---|
| A current deployment | 데모 가능 | 데모 가능 | 내부 파일럿 가능 after direct proof |
| B enterprise SaaS | 구현되어 있으나 운영 부적합 | 운영 부적합 | 운영 부적합 |

## 5. V Track close condition

V Track closes only when the revised report records:

1. exact commit SHA and dirty-worktree status,
2. direct command outputs for Stage proofs,
3. browser/API/manual receipt paths where applicable,
4. updated T-1/T-2/T-6,
5. updated S 15-question answer table,
6. explicit statement that `production_ready_claim` remains false unless a separate owner/production gate says otherwise.
