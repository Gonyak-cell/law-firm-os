# Remediation v3 실행 지시서

실행 주체: Codex. 이 문서는 2026-07 enterprise audit의 P-1 + P-2 30일분을 실행 가능한 stage로 변환한 지시서다. 기존 v2 기능 실장과 겹치는 항목은 v2 stage를 우선 참조하고 중복 구현 금지.

## 0. 공통 게이트

1. 기준 브랜치와 dirty 파일을 `git status --porcelain`으로 확인한다.
2. 코드 수정 전 관련 파일을 grep anchor로 재확인한다.
3. `package.json` 변경은 별도 승인 없이는 금지한다.
4. 각 stage는 명시 pathspec만 stage/commit 한다.
5. 각 stage 완료 게이트는 `npm test`, `npm run api:test`, `npm --workspace apps/web run build`, `npm --workspace apps/web run test:ui`, 관련 domain test green이다.
6. production_ready_claim을 true로 바꾸지 않는다.

## Stage 1: Matter opening 수직 플로우 복구

목표: client→clearance→matter opening→vault document→server restart readback을 직접 API와 UI에서 완주한다.

수용 기준:

| 항목 | 기준 |
|---|---|
| API | `/api/intake/clearance-tokens` 또는 정본 clearance 발급 경로가 session tenant와 정렬 |
| Matter | `/api/matters/openings` 201, idempotent replay 200 |
| Vault | matter-linked document create/download 성공 |
| 영속 | fixed STORE_PATH 재기동 후 matter와 document readback |
| 테스트 | 신규 integration test + existing G4/G5 관련 tests green |

pathspec 후보: `apps/api/src/matter-runtime-context.js`, `apps/api/src/crm-intake-runtime-context.js`, `apps/api/test/*matter*`, `apps/web/src/components/MattersSurface.jsx`, 관련 docs/tests.

## Stage 2: Root/API test contract drift 복구

목표: session-auth 이후 401 fail로 깨진 API tests를 의도된 보안 모델에 맞춘다.

수용 기준:

| 항목 | 기준 |
|---|---|
| root | `npm test` exit 0 |
| api | `npm run api:test` exit 0 |
| external receipts | Popbill/Wave-1 fail은 승인 대기 상태를 테스트 기대값과 일치 |
| 보안 | no-token 업무 route 401 유지 |

pathspec 후보: `apps/api/test/**`, `scripts/test/**`, `scripts/validate-*`, `scripts/run-*proof*.mjs`, `artifacts/manual-qa`는 오너 승인 없이는 수정 금지.

## Stage 3: Session secret hardening

목표: hardcoded default session secret이 운영 기동에 사용되지 않도록 한다.

수용 기준:

| 항목 | 기준 |
|---|---|
| startup | 운영 모드에서 `LAWOS_API_SESSION_SECRET` 없으면 fail |
| test | test/dev profile은 명시 secret 주입 |
| docs | env matrix에 session secret 기록 |
| regression | login/session tests green |

pathspec 후보: `apps/api/src/session-auth.js`, `apps/api/src/server.js`, `apps/api/test/session-auth-api.test.js`, env docs.

## Stage 4: STORE_PATH preflight

목표: 운영 프로필에서 tmpdir 기본 저장소를 차단한다.

수용 기준:

| 항목 | 기준 |
|---|---|
| env | 14종 STORE_PATH matrix 문서화 |
| startup | 운영 모드 missing path fail |
| durable | Vault/Matter/HRX restart tests green |
| desktop | desktop userData mapping 영향 검토 |

pathspec 후보: `apps/api/src/server.js`, `apps/desktop/src/main/local-api.js`, `scripts/validate-*store*`, docs.

## Stage 5: Portal G10 복구

목표: Portal invite/RFI/secure link/data room route를 API tests와 UI 표본에서 통과시킨다.

수용 기준:

| 항목 | 기준 |
|---|---|
| API | G10 portal tests green |
| UI | PortalSurface에서 요청·공유링크 표본 표시 및 action 결과 확인 |
| 보안 | token raw value 저장 금지, bytes raw path 미노출 |

pathspec 후보: `apps/api/src/portal-runtime-context.js`, `packages/client-portal/**`, `apps/web/src/components/PortalSurface.jsx`, tests.

## Stage 6: HRX security/tenant/step-up 정렬

목표: HRX security regression, tenant isolation, step-up tests를 signed session 모델과 정렬한다.

수용 기준:

| 항목 | 기준 |
|---|---|
| tenant | cross-tenant deny tests green |
| step-up | unsigned/mismatched token reject tests green |
| audit | HRX audit route requires fresh step-up |
| UI | People views remain API-backed |

pathspec 후보: `apps/api/src/hrx-runtime-context.js`, `apps/api/src/hrx-step-up-token.js`, `apps/api/src/middleware/**`, `apps/api/test/hrx/**`.

## Stage 7: UI dead surface 처분

목표: 고아 서피스 12종을 route에 연결할지 삭제할지 결정하고 UI 혼선을 제거한다.

수용 기준:

| 항목 | 기준 |
|---|---|
| inventory | Admin/Analytics/Ask/Content/Dashboards/Experiments/Finance/Intake/Ops/Profiles/Readiness/Theme 처분표 |
| route | 연결할 것은 nav/router에 정식 등록 |
| delete | 삭제할 것은 imports/tests 정리 |
| UI | product UI routes scan green |

pathspec 후보: `apps/web/src/components/**`, `apps/web/src/App.jsx`, `apps/web/src/data/nav.js`, `apps/web/test/**`.

## Stage 8: Env catalog + backup drill formalization

목표: 내부 파일럿 실행자가 같은 환경을 재현할 수 있게 env와 백업·복구 절차를 문서화·검증한다.

수용 기준:

| 항목 | 기준 |
|---|---|
| env catalog | session, store paths, model gateway, provider gates |
| backup | backup/restore command and receipt |
| validation | env/doc validator |
| docs | 운영자가 따라할 수 있는 runbook |

pathspec 후보: `docs/**`, `scripts/drill-*`, `scripts/validate-*`, `workbook/**`.
